import * as THREE from 'three';
import { scene, ambient, sun, rim } from '../core/engine';
import { setSkyDusk, setSkyStars, setSkyClouds } from '../core/sky';
import { rng, hashStr, clamp } from '../core/util';
import { loopVol } from '../core/audio';
import { radio } from '../ui/radio';
import { G } from './state';
import { world } from './world';
import { IN } from './interior';

// =====================================================================================
// Tag, Nacht und Wetter auf Planeten (seit 2026-11-24, Konzept docs/konzept-welt-und-leben.md, Punkt 6)
//  - Uhr je Planet aus der echten Zeit (alle Spieler sehen dasselbe): 24 Minuten je Tag – 14 hell, 2 Dämmerung, 6 Nacht, 2 Morgen.
//    Sonne, Grundlicht, Gegenlicht und Umgebungslicht werden gedimmt und gefärbt, der Himmel dunkelt ab (Dämmerungswert der Lufthülle),
//    Sterne kommen heraus, der Dunst wird dunkler. Die Sonnenrichtung bleibt fest (Schatten und Bodenschattierung sind darauf abgestimmt).
//  - Stürme aus derselben Uhr: je halbe Stunde mit einer Wahrscheinlichkeit je Planetentyp, 4–8 Minuten mit einer Minute Aufziehen und
//    Abflauen. Teilchen um die Kamera, dichter Dunst in Sturmfarbe, mehr Wolken, Wind, Funkwarnung. Bodenfahrzeuge halten schlechter (surface.ts).
//  - In Innenräumen und in der Stadt (eigene Lichtstimmung, city.ts) ruht alles; die Werte werden jedes Bild neu aus dem Grundstand berechnet.
// =====================================================================================

const DAY = 24 * 60;            // Sekunden je Tag
interface Art { n: string; teil: 'schnee' | 'sand' | 'asche' | 'regen'; p: number; fog: number; col: number; sicht: string; snd: string }
const ARTEN: Record<string, Art | null> = {
  eis: { n: 'Schneesturm', teil: 'schnee', p: 0.55, fog: 0.0045, col: 0xc8d4e0, sicht: '250 m', snd: 'amb_planet_ice' },
  wueste: { n: 'Sandsturm', teil: 'sand', p: 0.5, fog: 0.005, col: 0xb08a5a, sicht: '200 m', snd: 'amb_planet_wind' },
  kristall: { n: 'Kristallsturm', teil: 'sand', p: 0.35, fog: 0.0038, col: 0x6a5890, sicht: '300 m', snd: 'amb_planet_wind' },
  vulkan: { n: 'Aschenregen', teil: 'asche', p: 0.45, fog: 0.0035, col: 0x4a3c34, sicht: '300 m', snd: 'amb_planet_lava' },
  asche: { n: 'Aschesturm', teil: 'asche', p: 0.5, fog: 0.004, col: 0x5a4c58, sicht: '250 m', snd: 'amb_planet_wind' },
  fels: { n: 'Regen', teil: 'regen', p: 0.45, fog: 0.0022, col: 0x6a7480, sicht: '450 m', snd: 'amb_planet_wind' },
  mond: null,
};
export const WETTER = {
  planet: '', typ: '', tag: 1, warm: 0, sturm: 0, art: null as Art | null,
  force: { zeit: null as null | number, sturm: null as null | number },   // Testlabor: Tageszeit (phase 0..1, siehe unten) und Sturm 0..1; null = Uhr
};
let base: { fogC: number; fogD: number; amb: number; ambC: number; sun: number; sunC: number; rim: number; rimC: number; env: number; clouds: number; stars: number; air: number } | null = null;
let applied = false, warned = -1, nightTold = -1;
const _c = new THREE.Color(), _d = new THREE.Color();

/** buildSurface (surface.ts) nach dem Himmel: Grundstand merken */
export function wetterStart(planet: string, typ: string, sky: { fog: number; fogDensity: number; clouds?: number; stars?: number; air?: number }) {
  WETTER.planet = planet; WETTER.typ = typ; WETTER.art = ARTEN[typ] ?? null; warned = -1; nightTold = -1;
  base = { fogC: sky.fog, fogD: sky.fogDensity, amb: ambient.intensity, ambC: ambient.color.getHex(), sun: sun.intensity, sunC: sun.color.getHex(), rim: rim.intensity, rimC: rim.color.getHex(),
    env: scene.environmentIntensity ?? 1, clouds: sky.clouds ?? 0, stars: sky.stars ?? 0, air: sky.air ?? 1 };
}
// Tageszeit: phase 0..1 ab Tagesbeginn; hell 0–0,583, Dämmerung bis 0,667, Nacht bis 0,917, Morgen bis 1
export function phase(planet: string, now = Date.now() / 1000) { return (((now + (hashStr(planet + ':tag') % DAY)) % DAY) + DAY) % DAY / DAY; }
function licht(ph: number) {
  if (ph < 0.583) return { k: 1, warm: 0 };
  if (ph < 0.667) { const t = (ph - 0.583) / 0.084; return { k: 1 - t, warm: Math.sin(t * Math.PI) }; }
  if (ph < 0.917) return { k: 0, warm: 0 };
  const t = (ph - 0.917) / 0.083; return { k: t, warm: Math.sin(t * Math.PI) };
}
// Sturmstärke 0..1 aus der Uhr (halbe Stunde je Abschnitt)
function sturmAus(planet: string, art: Art | null, now = Date.now() / 1000) {
  if (!art) return 0;
  const slot = Math.floor(now / 1800), R = rng(hashStr(`${planet}:sturm:${slot}`));
  if (R.next() > art.p) return 0;
  const start = slot * 1800 + R.range(0, 1800 - 480), len = R.range(240, 480), t = now - start;
  if (t < 0 || t > len) return 0;
  return clamp(Math.min(t, len - t) / 60, 0, 1);
}
export const naechsterSturm = (planet: string, typ: string) => { const a = ARTEN[typ]; if (!a) return null; const now = Date.now() / 1000; for (let s = 0; s < 6 * 3600; s += 30) if (sturmAus(planet, a, now + s) > 0) return s; return null; };

// ---------- Teilchen ----------
let pts: THREE.Points | null = null, ptsArt = '';
const N = 2600, BOX = [70, 34, 70];
// weicher runder Fleck statt eckiger Punkte (Regen: senkrechter Strich)
let flockTex: THREE.Texture | null = null, strichTex: THREE.Texture | null = null;
function fleck(strich: boolean) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const g = cv.getContext('2d')!;
  if (strich) { const gr = g.createLinearGradient(16, 0, 16, 32); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(14, 0, 4, 32); }
  else { const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function teilchen(art: Art) {
  if (pts && ptsArt === art.teil) return pts;
  pts?.removeFromParent(); pts?.geometry.dispose();
  const g = new THREE.BufferGeometry(), p = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { p[i * 3] = (Math.random() - 0.5) * BOX[0]; p[i * 3 + 1] = (Math.random() - 0.5) * BOX[1]; p[i * 3 + 2] = (Math.random() - 0.5) * BOX[2]; }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const look = { schnee: [0xf4f8ff, 0.11], sand: [0xc8a070, 0.07], asche: [0x6a6260, 0.09], regen: [0xb8c8d8, 0.22] }[art.teil] as [number, number];
  const strich = art.teil === 'regen', map = strich ? (strichTex ||= fleck(true)) : (flockTex ||= fleck(false));
  const m = new THREE.PointsMaterial({ color: look[0], size: look[1], map, alphaTest: 0.02, transparent: true, opacity: 0, depthWrite: false, fog: true, sizeAttenuation: true });
  pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 4; ptsArt = art.teil;
  return pts;
}
function moveTeilchen(dt: number, cam: THREE.Vector3, k: number, art: Art) {
  const P = teilchen(art); if (!P.parent) scene.add(P);
  (P.material as THREE.PointsMaterial).opacity = 0.85 * k;
  P.visible = k > 0.01;
  if (!P.visible) return;
  const a = P.geometry.attributes.position as THREE.BufferAttribute, arr = a.array as Float32Array;
  const v = { schnee: [6, -3.5, 2], sand: [22, -0.6, 7], asche: [3, -1.6, 1.5], regen: [2, -18, 0.8] }[art.teil]!, s = 0.4 + 0.6 * k;
  const hx = BOX[0] / 2, hy = BOX[1] / 2, hz = BOX[2] / 2;
  for (let i = 0; i < N; i++) {
    let x = arr[i * 3] + (v[0] * s + Math.sin(i * 1.7 + G.time) * 0.6) * dt, y = arr[i * 3 + 1] + v[1] * dt, z = arr[i * 3 + 2] + v[2] * s * dt;
    if (x > hx) x -= BOX[0]; else if (x < -hx) x += BOX[0];
    if (y < -hy) y += BOX[1]; else if (y > hy) y -= BOX[1];
    if (z > hz) z -= BOX[2]; else if (z < -hz) z += BOX[2];
    arr[i * 3] = x; arr[i * 3 + 1] = y; arr[i * 3 + 2] = z;
  }
  a.needsUpdate = true;
  P.position.copy(cam);
}

/** jedes Bild (main.ts) */
export function updateWetter(dt: number, cam: THREE.Vector3) {
  const surf = world.surface;
  if (!surf || !base || surf.planet !== WETTER.planet) { if (applied || pts?.parent) wetterEnde(); return; }
  if (IN.active || G.cityWalk) { if (pts) pts.visible = false; if (WETTER.art) loopVol(WETTER.art.snd, 0); return; }      // Innenraum, Stadt: eigenes Licht
  const ph = WETTER.force.zeit ?? phase(WETTER.planet), L = licht(ph), art = WETTER.art;
  const st = WETTER.force.sturm ?? sturmAus(WETTER.planet, art);
  WETTER.tag = L.k; WETTER.warm = L.warm; WETTER.sturm = art ? st : 0;
  const b = base, nacht = 1 - L.k, luft = b.air;
  // Licht: Tag 1, Nacht kaltes Mondlicht; Sturm nimmt zusätzlich Sonne weg
  const sk = (0.08 + 0.92 * L.k) * (1 - 0.45 * st), ak = (0.28 + 0.72 * L.k) * (1 - 0.2 * st);
  sun.intensity = b.sun * sk; ambient.intensity = b.amb * ak; rim.intensity = b.rim * (0.4 + 0.6 * L.k);
  _c.setHex(b.sunC).lerp(_d.setHex(0xff8a40), L.warm * 0.85).lerp(_d.setHex(0x8ea4d8), nacht * 0.8); sun.color.copy(_c);
  _c.setHex(b.ambC).lerp(_d.setHex(0x3a4a78), nacht * 0.7); ambient.color.copy(_c);
  scene.environmentIntensity = b.env * (0.3 + 0.7 * L.k);
  setSkyDusk(clamp(nacht * 0.95 + L.warm * 0.25, 0, 1) * (luft < 0.5 ? 0.3 : 1));
  setSkyStars(Math.max(b.stars, nacht * (luft < 0.5 ? 1 : 0.85)) * (1 - 0.9 * st));
  setSkyClouds(clamp(b.clouds + st * 0.6, 0, 1));
  // Dunst: nachts dunkler, im Sturm dicht und in Sturmfarbe
  const fog = scene.fog as THREE.FogExp2 | null;
  if (fog) {
    _c.setHex(b.fogC).lerp(_d.setHex(0x10141c), nacht * 0.85).lerp(_d.setHex(0xd07a3a), L.warm * 0.45);
    if (art && st > 0) _c.lerp(_d.setHex(art.col).multiplyScalar(0.25 + 0.75 * L.k), st * 0.85);
    fog.color.copy(_c); fog.density = b.fogD + (art ? art.fog * st : 0);
  }
  if (art) { moveTeilchen(dt, cam, st, art); loopVol(art.snd, st * 0.6); }      // Sturm: Windschicht über dem Grundgeräusch
  applied = true;
  // Funk: Sturmwarnung einmal je Sturm, Sonnenuntergang einmal je Nacht
  const slot = Math.floor(Date.now() / 1800000);
  if (art && st > 0.02 && warned !== slot && WETTER.force.sturm === null) { warned = slot; radio('WETTER', `${art.n} zieht auf. Sicht unter ${art.sicht}, Bodenfahrzeuge halten schlechter.`, '#9fd8ff'); }
  const nslot = Math.floor((Date.now() / 1000 + (hashStr(WETTER.planet + ':tag') % DAY)) / DAY);
  if (ph > 0.6 && ph < 0.62 && nightTold !== nslot && WETTER.force.zeit === null) { nightTold = nslot; radio('WETTER', 'Die Sonne geht unter. In sechs Minuten ist es dunkel, die Nacht dauert sechs Minuten.', '#9fd8ff'); }
}
/** Planet verlassen: Grundstand zurück, Teilchen weg */
export function wetterEnde() {
  if (base && applied) {
    sun.intensity = base.sun; sun.color.setHex(base.sunC); ambient.intensity = base.amb; ambient.color.setHex(base.ambC); rim.intensity = base.rim;
    scene.environmentIntensity = base.env; setSkyDusk(0);
  }
  if (WETTER.art) loopVol(WETTER.art.snd, 0);
  pts?.removeFromParent(); applied = false; base = null; WETTER.sturm = 0; WETTER.tag = 1; WETTER.planet = '';
}
