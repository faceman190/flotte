import * as THREE from 'three';
import { camera, bodyPass, BODY_LAYER } from '../core/engine';
import { sunDir } from '../core/sky';
import { clamp, d3, fmtD } from '../core/util';
import { decoLaden, decoVorlage } from '../models/bojen';
import { SHIPS, type ShipId } from '../data/ships';
import { SECTOR } from '../data/galaxy';
import { P, G, stats, cargoUsed, settings, saveSettings, flightMax } from './state';
import { world } from './world';
import { SHIP } from './player';
import { navTarget, SF } from './schnellflug';
import { radio } from '../ui/radio';

// =====================================================================================
// Cockpit-Sicht im Flug (seit 2026-11-26). Nutzer: „Ich möchte auch im Schiff auf Firstperson-Cockpit-Sicht schalten. Dazu brauchen wir ein
// gutes Cockpit. Fang mit Milan an.“
//  - Taste K schaltet im Flug zwischen Verfolgersicht und Cockpit (bleibt gespeichert). Freie Umsicht wie gehabt (C halten, mittlere Maustaste,
//    V fest): im Cockpit dreht sie den Kopf.
//  - Das Cockpit ist ein eigenes Modell in voller Auflösung (asset-src/neu/milan/mil_cockpit.py → MilanCockpit.glb, wird nachgeladen). Es hängt
//    am Schiff und wird wie der eigene Körper zu Fuß in einem zweiten Durchgang mit eigener Tiefe gezeichnet (engine.ts, BODY_LAYER): scharf
//    aus 30 cm, ohne die Nahgrenze des Weltraumbilds. Im Schiffsmodell blendet das Spiel solange die groben Cockpitteile („ ~cp“) und die
//    Kanzel aus.
//  - Shader: Die Eckfarben der Datei tragen Verdeckung (R) und Kantenabrieb (G). Daraus entstehen dunkle Ecken, blanke Kanten, etwas Schmutz
//    und ein Grundlicht der Kabine (im tiefen All bliebe das Cockpit sonst schwarz).
//  - Schirme: Zeichenflächen auf den Materialien „ext_cp_Schirm …“ (Systeme, Lage/Radar, Ziel und Navigation, Eingabefeld, Uhr, Funk, Daten,
//    HUD-Scheibe), reihum einige Male pro Sekunde neu gezeichnet.
// Neue Schiffe: Eintrag in COCKPITS (Datei, Augpunkt aus mil-cockpit.json).
// =====================================================================================
const COCKPITS: Record<string, { datei: string; auge: [number, number, number]; laenge: number }> = {
  milan: { datei: 'MilanCockpit', auge: [0, 1.08, -2.077], laenge: 15.82 },
};
export const COCKPIT = { an: false, sicht: false };      // an: gewünscht (Einstellung), sicht: gerade im Bild
let grp: THREE.Group | null = null, grpCls = '', laedt = false, teileAus = false, teileVon: THREE.Object3D | null = null;
const auge = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
export const hatCockpit = (cls: string) => !!COCKPITS[cls];

// ---------- Schirme ----------
interface Schirm { c: HTMLCanvasElement; x: CanvasRenderingContext2D; t: THREE.CanvasTexture; w: number; h: number }
const SCH: Record<string, Schirm> = {};
function schirm(name: string, w: number, h: number): Schirm {
  if (SCH[name]) return SCH[name];
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (SCH[name] = { c, x: c.getContext('2d')!, t, w, h });
}
const GROESSE: Record<string, [number, number]> = { 'Schirm L': [384, 384], 'Schirm M': [384, 384], 'Schirm R': [384, 384], 'Schirm UFC': [420, 80], 'Schirm Uhr': [256, 92], 'Schirm Funk': [256, 62], 'Schirm Daten': [256, 66], 'Schirm HUD': [540, 400] };
const PET = '#5fe8dc', BERN = '#ffb347', ROT = '#ff5a48', GRUEN = '#6dff9a', DIM = 'rgba(95,232,220,.45)', FM = '"Share Tech Mono",Consolas,monospace';
function grund(s: Schirm, col = '#031012') { const x = s.x; x.fillStyle = col; x.fillRect(0, 0, s.w, s.h); x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.lineWidth = 2; }
function kopf(s: Schirm, t: string, col = PET) {
  const x = s.x; x.fillStyle = col; x.font = `700 20px ${FM}`; x.fillText(t, 14, 28); x.strokeStyle = col; x.globalAlpha = 0.5; x.beginPath(); x.moveTo(12, 38); x.lineTo(s.w - 12, 38); x.stroke(); x.globalAlpha = 1;
}
function balken(s: Schirm, y: number, name: string, f: number, wert: string, col: string) {
  const x = s.x; f = clamp(f, 0, 1);
  x.font = `16px ${FM}`; x.fillStyle = DIM; x.fillText(name, 14, y); x.textAlign = 'right'; x.fillStyle = col; x.fillText(wert, s.w - 14, y); x.textAlign = 'left';
  x.strokeStyle = 'rgba(95,232,220,.35)'; x.strokeRect(14, y + 7, s.w - 28, 14); x.fillStyle = col; x.fillRect(16, y + 9, (s.w - 32) * f, 10);
}
function zSysteme(s: Schirm) {
  const S = stats(), x = s.x; grund(s); kopf(s, 'SYSTEME');
  const hf = P.hull / S.maxHull, sf = S.maxShield ? P.shield / S.maxShield : 0;
  balken(s, 66, 'RUMPF', hf, `${Math.ceil(P.hull)}`, hf < 0.3 ? ROT : hf < 0.6 ? BERN : PET);
  balken(s, 116, 'SCHILD', sf, `${Math.ceil(P.shield)}`, sf < 0.25 ? BERN : PET);
  balken(s, 166, G.overheat ? 'LASER ÜBERHITZT' : 'LASER WÄRME', G.heat / 100, `${Math.round(G.heat)} %`, G.overheat ? ROT : G.heat > 70 ? BERN : PET);
  balken(s, 216, 'MUNITION', S.maxAmmo ? P.ammo / S.maxAmmo : 0, `${P.ammo}`, P.ammo < S.maxAmmo * 0.15 ? BERN : PET);
  balken(s, 266, 'FRACHT', S.cargo ? cargoUsed() / S.cargo : 0, `${cargoUsed()} / ${S.cargo}`, PET);
  x.font = `16px ${FM}`; x.fillStyle = DIM; x.fillText('RAKETEN', 14, 318); x.fillStyle = PET;
  for (let i = 0; i < Math.min(8, S.maxRockets || 0); i++) { x.globalAlpha = i < P.rockets ? 1 : 0.2; x.fillRect(110 + i * 22, 304, 14, 16); } x.globalAlpha = 1;
  x.fillStyle = DIM; x.fillText(`${(P.shipName || '').toUpperCase()} · ${(SHIPS[P.cls as ShipId]?.role || '').toUpperCase()}`, 14, 362);
}
const kontakte: { x: number; z: number; col: string; art: number }[] = [];
function zLage(s: Schirm) {
  const x = s.x, W = s.w, cx = W / 2, cy = W / 2 + 10, R = W * 0.42, RW = 3000;
  grund(s, '#021008');
  x.strokeStyle = 'rgba(109,255,154,.35)'; x.lineWidth = 1.5;
  for (const k of [1 / 3, 2 / 3, 1]) { x.beginPath(); x.arc(cx, cy, R * k, 0, Math.PI * 2); x.stroke(); }
  x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy); x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
  // Abtaststrahl
  const a = (performance.now() / 1000 * 1.6) % (Math.PI * 2);
  const g = x.createConicGradient(a - Math.PI / 2, cx, cy); g.addColorStop(0, 'rgba(109,255,154,.28)'); g.addColorStop(0.12, 'rgba(109,255,154,0)'); g.addColorStop(1, 'rgba(109,255,154,0)');
  x.save(); x.translate(cx, cy); x.scale(-1, 1); x.translate(-cx, -cy); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill(); x.restore();
  // Kontakte: Lage relativ zum Kurs (vorn = oben)
  const cyaw = Math.cos(P.yaw), syaw = Math.sin(P.yaw); kontakte.length = 0;
  const add = (wx: number, wz: number, col: string, art: number, rand = false) => {
    const dx = wx - P.x, dz = wz - P.z, rx = dx * cyaw - dz * syaw, fz = -(dx * syaw + dz * cyaw); let d = Math.hypot(rx, fz);
    if (d > RW) { if (!rand) return; const k = RW / d; kontakte.push({ x: rx * k, z: fz * k, col, art: art + 10 }); return; }
    kontakte.push({ x: rx, z: fz, col, art });
  };
  for (const a2 of world.asteroids) if (Math.abs(a2.x - P.x) < RW && Math.abs(a2.z - P.z) < RW) add(a2.x, a2.z, 'rgba(160,190,170,.55)', 0);
  for (const st of world.stations) add(st.x, st.z, PET, 1, true);
  for (const gt of world.gates) add(gt.x, gt.z, BERN, 2, true);
  for (const t of world.traffic as any[]) if (t.alive !== false) add(t.x, t.z, '#c9b8ff', 3);
  for (const w of world.allies as any[]) if (w.alive) add(w.x, w.z, GRUEN, 3);
  for (const e of world.enemies as any[]) add(e.x, e.z, ROT, e.type === 'mother' ? 5 : 4, e.type === 'mother');
  for (const k of kontakte) {
    const px = cx + k.x / RW * R, py = cy - k.z / RW * R, art = k.art % 10; x.fillStyle = k.col; x.strokeStyle = k.col; x.lineWidth = 2;
    if (art === 0) x.fillRect(px - 1.5, py - 1.5, 3, 3);
    else if (art === 1) x.strokeRect(px - 5, py - 5, 10, 10);
    else if (art === 2) { x.beginPath(); x.arc(px, py, 5, 0, Math.PI * 2); x.stroke(); }
    else if (art === 3) { x.beginPath(); x.moveTo(px, py - 5); x.lineTo(px + 4, py + 4); x.lineTo(px - 4, py + 4); x.closePath(); x.stroke(); }
    else { x.beginPath(); x.moveTo(px, py - (art === 5 ? 9 : 6)); x.lineTo(px + (art === 5 ? 9 : 6), py); x.lineTo(px, py + (art === 5 ? 9 : 6)); x.lineTo(px - (art === 5 ? 9 : 6), py); x.closePath(); x.fill(); }
  }
  x.fillStyle = GRUEN; x.beginPath(); x.moveTo(cx, cy - 9); x.lineTo(cx + 6, cy + 7); x.lineTo(cx, cy + 3); x.lineTo(cx - 6, cy + 7); x.closePath(); x.fill();
  x.font = `15px ${FM}`; x.fillStyle = 'rgba(109,255,154,.8)'; x.fillText('LAGE', 12, 22); x.textAlign = 'right'; x.fillText('3,0 KM', W - 12, 22);
  const feinde = world.enemies.length; x.fillStyle = feinde ? ROT : 'rgba(109,255,154,.8)'; x.fillText(feinde ? `FERROX ${feinde}` : 'KEIN FERROX', W - 12, s.h - 10); x.textAlign = 'left';
  x.fillStyle = 'rgba(109,255,154,.8)'; x.fillText(`KURS ${String(Math.round(((-P.yaw * 180 / Math.PI) % 360 + 360) % 360)).padStart(3, '0')}`, 12, s.h - 10);
}
function zZiel(s: Schirm) {
  const x = s.x; grund(s); kopf(s, 'ZIEL · NAV');
  const zeile = (y: number, k: string, v: string, col = PET) => { x.font = `16px ${FM}`; x.fillStyle = DIM; x.fillText(k, 14, y); x.textAlign = 'right'; x.fillStyle = col; x.font = `700 18px ${FM}`; x.fillText(v, s.w - 14, y); x.textAlign = 'left'; };
  const sec = SECTOR[P.sector]; zeile(70, 'SEKTOR', (sec?.name || P.sector || '').toUpperCase());
  const nt = navTarget();
  if (nt) { const d = d3(nt.x, nt.y, nt.z, P.x, P.y, P.z); zeile(104, 'ZIEL', nt.name.toUpperCase().slice(0, 22), BERN); zeile(134, 'ENTFERNUNG', fmtD(d), BERN); }
  else { zeile(104, 'ZIEL', 'KEINS · [N]', DIM); }
  if (P.route && P.route !== P.sector) zeile(168, 'ROUTE', (SECTOR[P.route]?.name || P.route).toUpperCase(), PET);
  x.strokeStyle = 'rgba(95,232,220,.35)'; x.beginPath(); x.moveTo(12, 190); x.lineTo(s.w - 12, 190); x.stroke();
  const lk: any = G.lockT;
  if (lk) {
    const d = d3(lk.x, lk.y, lk.z, P.x, P.y, P.z), n = lk.type === 'mother' ? 'BIENENSTOCK' : lk.type === 'bomber' ? 'FERROX-BOMBER' : lk.type === 'ziel' ? 'ÜBUNGSZIEL' : 'FERROX-JÄGER';
    zeile(222, 'ERFASST', n, ROT); zeile(252, 'ABSTAND', fmtD(d), ROT);
    if (lk.maxhp) { x.strokeStyle = ROT; x.strokeRect(14, 268, s.w - 28, 14); x.fillStyle = ROT; x.fillRect(16, 270, (s.w - 32) * clamp(lk.hp / lk.maxhp, 0, 1), 10); }
  } else zeile(222, 'ERFASST', '—', DIM);
  zeile(318, 'FAHRT', `${Math.round(Math.hypot(P.vx, P.vy, P.vz))} / ${flightMax()} M/S`);
  zeile(350, 'ANTRIEB', SF.phase === 'fly' ? 'SCHNELLFLUG' : G.jd ? 'SPRUNG LÄDT' : G.cruise ? 'REISE' : 'NORMAL', G.cruise || SF.phase === 'fly' ? GRUEN : PET);
}
function zKlein(s: Schirm, t: string, col = BERN, size = 30) { const x = s.x; grund(s, '#120a02'); x.fillStyle = col; x.font = `700 ${size}px ${FM}`; x.textAlign = 'center'; x.fillText(t, s.w / 2, s.h / 2 + size * 0.36); x.textAlign = 'left'; }
function zHud(s: Schirm) {
  const x = s.x, W = s.w, H = s.h, cx = W / 2, cy = H / 2;
  x.clearRect(0, 0, W, H); x.strokeStyle = GRUEN; x.fillStyle = GRUEN; x.lineWidth = 2.5; x.font = `700 22px ${FM}`; x.textBaseline = 'alphabetic';
  // Nickleiter (rollt mit dem Schiff)
  x.save(); x.translate(cx, cy); x.rotate(-G.roll);
  const ppd = 9;      // Bildpunkte je Grad
  for (let deg = -40; deg <= 40; deg += 10) {
    const y = (P.pitch * 180 / Math.PI - deg) * ppd; if (Math.abs(y) > H * 0.42) continue;
    const w = deg === 0 ? 150 : 70; x.globalAlpha = deg === 0 ? 0.9 : 0.6; x.beginPath(); x.moveTo(-w, y); x.lineTo(-34, y); x.moveTo(34, y); x.lineTo(w, y); x.stroke();
    if (deg) { x.font = `16px ${FM}`; x.fillText(String(Math.abs(deg)), w + 8, y + 5); }
  }
  x.restore(); x.globalAlpha = 1;
  // Fahrt links, Höhe oder Schub rechts, Kurs oben
  const v = Math.round(Math.hypot(P.vx, P.vy, P.vz));
  x.font = `700 26px ${FM}`; x.strokeRect(14, cy - 20, 92, 38); x.textAlign = 'center'; x.fillText(String(v), 60, cy + 9);
  const hoch = world.ground ? Math.round(P.y - world.ground(P.x, P.z)) : Math.round(G.thrust * 100);
  x.strokeRect(W - 106, cy - 20, 92, 38); x.fillText(String(hoch), W - 60, cy + 9);
  x.font = `14px ${FM}`; x.fillText('M/S', 60, cy + 36); x.fillText(world.ground ? 'HÖHE' : 'SCHUB %', W - 60, cy + 36);
  const kurs = ((-P.yaw * 180 / Math.PI) % 360 + 360) % 360;
  x.font = `700 20px ${FM}`; x.fillText(String(Math.round(kurs)).padStart(3, '0'), cx, 30);
  x.beginPath();
  for (let d = -30; d <= 30; d += 5) { const k = Math.round((kurs + d) / 5) * 5, px = cx + (k - kurs) * 6; if (Math.abs(px - cx) < 26 || Math.abs(px - cx) > 170) continue; x.moveTo(px, 38); x.lineTo(px, k % 10 === 0 ? 50 : 45); }
  x.stroke();
  if (G.cruise) { x.font = `16px ${FM}`; x.fillText('REISE', cx, H - 16); }
  x.textAlign = 'left';
}
let reihe = 0, hudT = 0;
function schirmeZeichnen(dt: number) {
  hudT -= dt;
  if (hudT <= 0 && SCH['Schirm HUD']) { hudT = 0.045; zHud(SCH['Schirm HUD']); SCH['Schirm HUD'].t.needsUpdate = true; }
  const namen = ['Schirm M', 'Schirm L', 'Schirm M', 'Schirm R', 'Schirm M', 'Schirm UFC', 'Schirm M', 'Schirm Uhr', 'Schirm M', 'Schirm Funk', 'Schirm M', 'Schirm Daten'];
  const n = namen[reihe++ % namen.length], s = SCH[n]; if (!s) return;      // je Bild ein Schirm (Radar jedes zweite)
  if (n === 'Schirm L') zSysteme(s); else if (n === 'Schirm M') zLage(s); else if (n === 'Schirm R') zZiel(s);
  else if (n === 'Schirm UFC') zKlein(s, `${Math.round(Math.hypot(P.vx, P.vy, P.vz))} M/S   ${G.cruise ? 'REISE' : 'NORMAL'}   ${P.tool === 'guns' ? 'KANONE' : P.tool === 'laser' ? 'LASER' : String(P.tool || '').toUpperCase()}`, BERN, 30);
  else if (n === 'Schirm Uhr') zKlein(s, new Date().toLocaleTimeString('de-DE'), BERN, 38);
  else if (n === 'Schirm Funk') zKlein(s, 'KANAL 07 · BASTION', BERN, 20);
  else zKlein(s, `FRACHT ${cargoUsed()} / ${stats().cargo}`, BERN, 22);
  s.t.needsUpdate = true;
}

// ---------- Materialien ----------
const U = { fill: { value: 5 }, ldir: { value: new THREE.Vector3(0, 1, 0) }, inv: { value: new THREE.Matrix4() }, abrieb: { value: 1 }, ao: { value: 0.8 },
  sonne: { value: new THREE.Vector3(0, 1, 0) }, tafel: { value: new THREE.Vector3() }, schein: { value: 1 } };
/** Stellwerte (auch für das Testlabor): Kabinenlicht im All und über Planeten, Stärke von Abrieb und Verdeckung */
export const CP_TUNE = { fillAll: 1.0, fillPlanet: 0.6, abrieb: 1, ao: 1, schein: 1, blick: null as null | [number, number] };      // Kabinenlicht: Stärke und Richtung (im Blick der Kamera)
const KEIN_ABRIEB = /Blendschutz|Sitzbezug|Gurt|Plakette|Licht|Kabel|Gummi|rubber|Schrift|Zifferblatt|Kuehl/i;
function shaderHaken(m: THREE.MeshStandardMaterial, abrieb: number) {
  m.onBeforeCompile = sh => {
    sh.uniforms.cpFill = U.fill; sh.uniforms.cpL = U.ldir; sh.uniforms.cpWear = { value: abrieb }; sh.uniforms.cpWearK = U.abrieb; sh.uniforms.cpAoK = U.ao; sh.uniforms.cpInv = U.inv; sh.uniforms.cpSun = U.sonne; sh.uniforms.cpTafel = U.tafel; sh.uniforms.cpSchein = U.schein;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 color;\nuniform mat4 cpInv;\nvarying vec3 vCp;\nvarying vec3 vCpPos;')
      // vCpPos: Schiffskoordinaten in Metern (die Datei trägt gepackte Ganzzahlen, das Rauschen wurde damit zu groben Flecken)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCp = color.rgb; vCpPos = (cpInv * modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 vCp; varying vec3 vCpPos; uniform float cpFill; uniform float cpWear; uniform float cpWearK; uniform float cpAoK; uniform vec3 cpL; uniform vec3 cpSun; uniform vec3 cpTafel; uniform float cpSchein;
float cpH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float cpN(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(cpH(i), cpH(i + vec3(1, 0, 0)), f.x), mix(cpH(i + vec3(0, 1, 0)), cpH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(cpH(i + vec3(0, 0, 1)), cpH(i + vec3(1, 0, 1)), f.x), mix(cpH(i + vec3(0, 1, 1)), cpH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
float cpAO, cpEdge, cpDirt, cpWk;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  { float n1 = cpN(vCpPos * 140.0), n2 = cpN(vCpPos * 22.0), n3 = cpN(vCpPos * 420.0);
    cpAO = mix(1.0, clamp(vCp.r * 1.6, 0.0, 1.0), cpAoK); cpEdge = vCp.g;
    cpWk = smoothstep(0.72, 1.0, cpEdge * 0.9 + (n3 - 0.5) * 0.5 + (n1 - 0.5) * 0.35) * cpWear * cpWearK;
    cpDirt = (1.0 - cpAO) * (0.55 + 0.45 * n2);
    vec3 blank = mix(vec3(0.34, 0.35, 0.37), diffuseColor.rgb * 2.2 + 0.05, 0.35);
    diffuseColor.rgb = mix(diffuseColor.rgb, blank, cpWk * 0.45);
    diffuseColor.rgb *= (1.0 - 0.4 * cpDirt) * (0.9 + 0.2 * n2) * (0.96 + 0.08 * n3); }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = clamp(roughnessFactor - cpWk * 0.22 + cpDirt * 0.2 + (cpN(vCpPos * 60.0) - 0.5) * 0.12, 0.06, 1.0);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = mix(metalnessFactor, 1.0, cpWk * 0.75);')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * cpFill * (0.2 + 0.8 * cpAO) * (0.25 + 0.95 * max(0.0, dot(normal, cpL)));      // Kabinenlicht von oben hinten
  { vec3 dv = cpTafel + vViewPosition; float d2 = dot(dv, dv);      // Schein der drei Anzeigen auf Sitz, Pulte und Wände dahinter
    totalEmissiveRadiance += diffuseColor.rgb * vec3(0.35, 1.0, 0.86) * cpSchein * (0.3 + 0.7 * cpAO) * max(0.0, dot(normal, dv * inversesqrt(d2 + 1e-4))) * smoothstep(-3.04, -2.9, vCpPos.z) / (0.25 + d2 * 3.0); }`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>\n  { float a = mix(1.0, cpAO, 0.85); reflectedLight.indirectDiffuse *= a; reflectedLight.indirectSpecular *= a; reflectedLight.directDiffuse *= mix(1.0, cpAO, 0.5); reflectedLight.directSpecular *= mix(1.0, cpAO, 0.5);
    // Sonne fällt nur durch die Kanzelöffnung (Ebene der Brüstung, Umriss als Superellipse; vorn deckt der Blendschutz ab): darunter liegt die Wanne im Schatten
    float ys = 0.9986 + 0.0686 * vCpPos.z, lit = 1.0;
    if (vCpPos.y < ys - 0.012) {
      float den = cpSun.y - 0.0686 * cpSun.z;
      if (den < 0.03) lit = 0.0;
      else { float t = (ys - vCpPos.y) / den; vec3 h = vCpPos + cpSun * t; float s = clamp(0.05 + t * 0.1, 0.05, 0.4);
        float d = pow(abs(h.x / 0.64), 2.5) + pow(abs((h.z + 2.75) / 1.82), 2.5);
        lit = (1.0 - smoothstep(1.0 - s, 1.0 + s * 0.4, d)) * smoothstep(-3.06 - s * 0.3, -2.96 + s * 0.3, h.z) * smoothstep(0.03, 0.14, den); }
      lit *= smoothstep(0.0, 0.5, cpAO);
    }
    reflectedLight.directDiffuse *= lit; reflectedLight.directSpecular *= lit; }`);
  };
  m.customProgramCacheKey = () => 'cockpit7';
}
const MATS = new Map<string, THREE.Material>();
function material(src: THREE.MeshStandardMaterial): THREE.Material {
  const name = (src.name || '').replace(/^ext_cp_/, '').replace(/\.\d+$/, '');
  const alt = MATS.get(name); if (alt) return alt;
  let m: THREE.Material;
  if (name === 'Schirm HUD') { const s = schirm(name, ...GROESSE[name]); m = new THREE.MeshBasicMaterial({ map: s.t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, opacity: 0.85 }); }
  else if (GROESSE[name]) { const s = schirm(name, ...GROESSE[name]); m = new THREE.MeshBasicMaterial({ map: s.t, toneMapped: false }); (m as THREE.MeshBasicMaterial).color.setScalar(0.9); }
  else if (/glas/i.test(name) && src.transparent !== false && (src.opacity < 1 || /Kuppelglas|Kanzelglas/.test(name))) {
    m = new THREE.MeshStandardMaterial({ color: 0x9fb8c4, transparent: true, opacity: 0.045, roughness: 0.04, metalness: 0, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.5 });
  } else {
    const c = src.clone(); c.envMapIntensity = 0.6; c.vertexColors = false;      // die Eckfarben sind hier Daten (Verdeckung, Abrieb), keine Farbe
    if (c.emissiveIntensity > 0 && (c.emissive.r + c.emissive.g + c.emissive.b) > 0.01) { c.emissiveIntensity = Math.min(c.emissiveIntensity * 1.6, 3); c.toneMapped = true; }
    if (/^Schrift hell|^Schrift ocker/.test(name)) { c.emissive.copy(c.color); c.emissiveIntensity = 0.55; }      // Beschriftung von hinten beleuchtet: auch im Schatten lesbar
    shaderHaken(c, KEIN_ABRIEB.test(name) || (c.emissive.r + c.emissive.g + c.emissive.b) > 0.01 ? 0 : 1);
    m = c;
  }
  m.name = 'cp_' + name; MATS.set(name, m); return m;
}
function bauen(cls: string) {
  const C = COCKPITS[cls], v = decoVorlage(C.datei); if (!v || !v.children[0]) return null;
  const g = new THREE.Group(), inner = v.children[0].clone(true); g.add(inner); g.name = 'Cockpit';
  inner.traverse((o: any) => { o.layers.set(BODY_LAYER); if (o.isMesh) { o.frustumCulled = false; o.material = material(o.material); o.renderOrder = /Glas|HUD/.test(o.material.name) ? 5 : 0; o.castShadow = false; o.receiveShadow = false; } });
  g.layers.set(BODY_LAYER);
  g.scale.setScalar(SHIPS[cls as ShipId].len / C.laenge);
  return g;
}
// grobe Cockpitteile und Kanzel des Schiffsmodells: in der Cockpit-Sicht aus
function schiffTeile(aus: boolean) {
  if (teileAus === aus && teileVon === SHIP.g) return;
  if (teileVon && teileVon !== SHIP.g) teileVon.traverse((o: any) => { if (o.userData.cpAus) { o.visible = true; o.userData.cpAus = false; } });
  SHIP.g.traverse((o: any) => {
    if (!o.isMesh) return; const n = String(o.material?.name || '');
    if (!/ ~cp|^Kuppelglas|^Kanzelglas|^Kanzelrahmen/.test(n)) return;      // grobe Cockpitteile, Kanzelglas und Kanzelrahmen (die Kanzel kommt mit dem Cockpit-Modell)
    if (aus && o.visible) { o.visible = false; o.userData.cpAus = true; } else if (!aus && o.userData.cpAus) { o.visible = true; o.userData.cpAus = false; }
  });
  teileAus = aus; teileVon = SHIP.g;
}

/** Taste K im Flug */
export function cockpitUmschalten() {
  if (!hatCockpit(P.cls)) { radio('SYSTEM', `Die ${SHIPS[P.cls as ShipId]?.n || 'Maschine'} hat noch keine Cockpit-Sicht. Bisher gibt es sie im Milan.`); return; }
  COCKPIT.an = !COCKPIT.an; (settings as any).cockpit = COCKPIT.an; saveSettings();
  if (COCKPIT.an && !decoVorlage(COCKPITS[P.cls].datei)) radio('SYSTEM', 'Cockpit wird geladen …');
}
export function cockpitLaden() { COCKPIT.an = !!(settings as any).cockpit; }
/** jedes Bild vor der Kamera (main.ts): Modell bereithalten, ein- und ausblenden, Schirme zeichnen. flug: Schiff wird gerade geflogen */
export function cockpitUpdate(dt: number, flug: boolean) {
  const C = COCKPITS[P.cls], will = COCKPIT.an && flug && !!C;
  if (will && (!grp || grpCls !== P.cls)) {
    if (grp) { grp.removeFromParent(); grp = null; }
    if (decoVorlage(C.datei)) { grp = bauen(P.cls); grpCls = P.cls; }
    else if (!laedt) { laedt = true; void decoLaden(C.datei).then(() => { laedt = false; }); }
  }
  const sicht = will && !!grp;
  if (grp) { if (sicht && grp.parent !== SHIP.g) SHIP.g.add(grp); grp.visible = sicht; }
  if (sicht !== COCKPIT.sicht || (sicht && teileVon !== SHIP.g)) schiffTeile(sicht);
  COCKPIT.sicht = sicht;
  if (!sicht) return;
  bodyPass.on = true;
  U.fill.value = world.surface ? CP_TUNE.fillPlanet : CP_TUNE.fillAll; U.abrieb.value = CP_TUNE.abrieb; U.ao.value = CP_TUNE.ao; U.schein.value = CP_TUNE.schein * (world.surface ? 0.6 : 1);      // im All mehr Kabinenlicht als am Tag über einem Planeten
  schirmeZeichnen(dt);
}
/** Kamera an den Augpunkt (main.ts updateCamera); yaw, pitch: Kopfdrehung aus der freien Umsicht. false: nicht in der Cockpit-Sicht */
export function cockpitKamera(yaw: number, pitch: number): boolean {
  if (!COCKPIT.sicht || !grp) return false;
  if (CP_TUNE.blick) { yaw = CP_TUNE.blick[0]; pitch = CP_TUNE.blick[1]; }      // fester Blick für Prüfbilder
  const C = COCKPITS[P.cls], k = SHIPS[P.cls as ShipId].len / C.laenge;
  SHIP.g.updateMatrixWorld(true);
  auge.set(C.auge[0] * k, C.auge[1] * k, C.auge[2] * k).applyMatrix4(SHIP.g.matrixWorld);
  camera.position.copy(auge);
  _e.set(clamp(pitch, -1.1, 1.2), clamp(Math.atan2(Math.sin(yaw), Math.cos(yaw)), -2.5, 2.5), 0);
  camera.quaternion.copy(SHIP.g.quaternion).multiply(_q.setFromEuler(_e));
  camera.updateMatrixWorld(); grp.updateMatrixWorld(true); U.inv.value.copy(grp.matrixWorld).invert();      // Shader rechnet in Metern des Cockpit-Modells
  U.sonne.value.copy(sunDir).applyQuaternion(_q.copy(SHIP.g.quaternion).invert()).normalize();
  U.tafel.value.set(0, 0.66, -2.98).applyMatrix4(grp.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
  U.ldir.value.set(0.12, 0.86, 0.5).normalize().applyQuaternion(SHIP.g.quaternion).transformDirection(camera.matrixWorldInverse);      // Kabinenlicht: fest im Schiff
  return true;
}
