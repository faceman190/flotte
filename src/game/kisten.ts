import * as THREE from 'three';
import { scene, GLOW, camera } from '../core/engine';
import { rand, d3 } from '../core/util';
import { sndOut as snd } from '../core/audio';
import { P, G, stats, cargoUsed } from './state';
import { world } from './world';
import { SHIP } from './player';
import { radio } from '../ui/radio';
import { ITEMS, type ItemId } from '../data/items';
import { decoLaden, bojeTeile } from '../models/bojen';
import { raum } from './laderaum';
import { burst } from './fx';
import { onCoop, coopSend, coopNet } from './coop';

// =====================================================================================
// Kisten in der Welt (seit 2026-11-25, Konzept docs/konzept-schiffe-fracht.md, Schritt 4)
//  - Abgeworfene Fracht, Beute des Bienenstocks und Treibgut sind echte Normkisten (dieselben Modelle wie im Laderaum, laderaum.ts):
//    Kiste 10 E, Palette 25 E, Halbcontainer 100 E. Der helle Lack trägt die Farbe der Ware, ein Blinklicht macht sie sichtbar.
//  - Der Traktorstrahl des Schiffs zieht eine Kiste nach der anderen heran, wenn das Schiff langsam ist: zur offenen Heckrampe
//    (Kormoran, Wisent: die Rampe öffnet dafür) bzw. an die Frachtklappe unter dem Heck (kleine Schiffe). Was nicht passt, bleibt draußen:
//    Halbcontainer nur in den Wisent, Paletten nur in Schiffe mit Laderaum, Kisten in jedes Schiff.
//  - Beim Außenbordeinsatz greift man eine Kiste ([E]) und schiebt sie zur Rampe oder Schleuse (eva.ts).
//  - Die kleinen Beutebrocken aus Bergbau und Kämpfen bleiben, wie sie sind (world.pickups, player.ts updatePickups).
//  - Mehrspieler (seit 2026-11-25, über den Koop-Kanal 'co', coop.ts): Neue Kisten ('kneu'), eingeladene ('kweg') und bewegte Kisten
//    (Traktorstrahl, von Hand geschoben: 'kzug', 5× pro Sekunde) gehen an alle im Sektor. Eine Kiste, die ein anderer gerade bewegt, ist
//    für den eigenen Strahl und zum Greifen gesperrt (fern). Wer neu in den Sektor kommt, bekommt die Kisten von den anderen (kistenAnNeue).
// =====================================================================================

export type KistenArt = 'kiste' | 'palette' | 'container';
const MODELL: Record<KistenArt, { name: string; e: number; r: number; n: string }> = {
  kiste: { name: 'FrachtKiste', e: 10, r: 0.8, n: 'Kiste' },
  palette: { name: 'FrachtPalette', e: 25, r: 1.0, n: 'Palette' },
  container: { name: 'FrachtContainer', e: 100, r: 2.2, n: 'Halbcontainer' },
};
export interface WeltKiste {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  art: KistenArt; ware: ItemId; n: number; life: number; sektor: string;
  g: THREE.Group; lampe: THREE.Sprite; echt: boolean;      // echt: Modell geladen (sonst Platzhalter)
  sperre: number;       // Sekunden ohne Traktorstrahl (gerade abgeworfen)
  hand: boolean;        // wird beim Außenbordeinsatz geschoben
  gemeldet: boolean;    // „passt nicht“ schon gemeldet
  treibgut: boolean;    // Treibgut mit weithin sichtbarem Licht
  id: string;           // Kennung über alle Mitspieler (Pilotenkennung.Zähler.Zufall)
  fern: number;         // Sekunden, die ein anderer Pilot sie noch bewegt (dann gesperrt)
}
export const KISTEN: WeltKiste[] = [];
export const KISTE_INFO = MODELL;

// ---------- Aussehen ----------
const lackCache = new Map<string, THREE.Material>();
function lack(mat: THREE.Material, ware: ItemId) {
  const key = mat.uuid + ware; let m = lackCache.get(key);
  if (!m) {
    const c = new THREE.Color(ITEMS[ware].c), g = (c.r + c.g + c.b) / 3;
    c.lerp(new THREE.Color(g, g, g), 0.35).multiplyScalar(0.85);
    m = (mat as THREE.MeshStandardMaterial).clone(); (m as THREE.MeshStandardMaterial).color?.copy(c); lackCache.set(key, m);
  }
  return m;
}
const PLATZ_MAT = new THREE.MeshStandardMaterial({ color: 0x6a7058, roughness: 0.7, metalness: 0.4 });
const DIM: Record<KistenArt, [number, number, number]> = { kiste: [1.2, 0.8, 0.8], palette: [1.2, 1.2, 1.2], container: [3, 2.4, 2.4] };
function koerper(k: WeltKiste) {
  for (const c of [...k.g.children]) if (c !== k.lampe) k.g.remove(c);
  const teile = bojeTeile(MODELL[k.art].name), inner = new THREE.Group();
  if (teile) {
    for (const t of teile) { const m = new THREE.Mesh(t.geo, (t.mat.name || '').includes('lack') ? lack(t.mat, k.ware) : t.mat); m.castShadow = true; inner.add(m); }
    k.echt = true;
  } else {
    const [l, b, h] = DIM[k.art]; const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, b), PLATZ_MAT); m.position.y = h / 2; inner.add(m);
    void decoLaden(MODELL[k.art].name);
  }
  inner.position.y = -DIM[k.art][2] / 2;      // Drehpunkt in der Mitte (Modelle stehen auf dem Boden)
  k.g.add(inner);
}

/** Stückelung einer Menge in Normkisten (größte zuerst, höchstens bis zur Art max) */
export function packen(n: number, max: KistenArt = 'container'): [KistenArt, number][] {
  const out: [KistenArt, number][] = [];
  const arten: KistenArt[] = max === 'container' ? ['container', 'palette', 'kiste'] : max === 'palette' ? ['palette', 'kiste'] : ['kiste'];
  for (const a of arten) { const e = MODELL[a].e; while (n >= e || (a === 'kiste' && n > 0)) { const m = Math.min(n, e); out.push([a, m]); n -= m; } }
  return out;
}
/** größte Kiste, die durch Rampe bzw. Frachtklappe des aktiven Schiffs passt */
export function groesste(): KistenArt { const R = raum(); return !R ? 'kiste' : R.reihen.some(r => r.doppel) ? 'container' : 'palette'; }
const passt = (a: KistenArt) => a === 'kiste' || (a === 'palette' ? groesste() !== 'kiste' : groesste() === 'container');

/** Kiste in die Welt setzen (Weltkoordinaten, Anfangsgeschwindigkeit) */
let kn = 0;
export function kisteSetzen(x: number, y: number, z: number, ware: ItemId, n: number, o: { art?: KistenArt; v?: [number, number, number]; life?: number; sperre?: number; treibgut?: boolean; id?: string; netz?: boolean } = {}) {
  const art = o.art || (n > 25 ? 'container' : n > 10 ? 'palette' : 'kiste');
  const g = new THREE.Group();
  const lampe = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: o.treibgut ? 0xffb040 : ITEMS[ware].c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }));
  lampe.position.y = DIM[art][2] / 2 + 0.25; lampe.scale.setScalar(o.treibgut ? 40 : 4); g.add(lampe);
  const k: WeltKiste = { x, y, z, vx: o.v?.[0] || 0, vy: o.v?.[1] || 0, vz: o.v?.[2] || 0, art, ware, n, life: o.life ?? 900, sektor: P.sector, g, lampe, echt: false, sperre: o.sperre || 0, hand: false, gemeldet: false, treibgut: !!o.treibgut, id: o.id || `${coopNet.id}.${++kn}.${Math.floor(Math.random() * 1e4)}`, fern: 0 };
  koerper(k);
  g.position.set(x, y, z); g.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6)); g.userData.spin = [rand(-0.25, 0.25), rand(-0.25, 0.25)];
  scene.add(g); KISTEN.push(k);
  if (o.netz !== false) kisteMelden(k);
  return k;
}
const r2 = (v: number) => Math.round(v * 100) / 100;
function kisteMelden(k: WeltKiste) {
  coopSend('kneu', { id: k.id, a: k.art, w: k.ware, n: k.n, p: [r2(k.x), r2(k.y), r2(k.z)], v: [r2(k.vx), r2(k.vy), r2(k.vz)], l: Math.round(k.life), tg: k.treibgut ? 1 : 0, s: k.sektor });
}
/** ein Mitspieler ist neu im Sektor (net.ts): ihm die Kisten zeigen, die hier treiben */
export function kistenAnNeue() { for (const k of KISTEN) if (k.sektor === P.sector && !world.surface) kisteMelden(k); }
onCoop('kneu', m => {
  if (m.s !== P.sector || world.surface || G.mode === 'menu' || typeof m.id !== 'string' || KISTEN.some(k => k.id === m.id)) return;
  if (!ITEMS[m.w as ItemId] || !MODELL[m.a as KistenArt] || !(m.n > 0) || !Array.isArray(m.p) || m.p.length !== 3) return;
  const v = Array.isArray(m.v) && m.v.length === 3 ? m.v.map(Number) as [number, number, number] : undefined;
  kisteSetzen(+m.p[0], +m.p[1], +m.p[2], m.w as ItemId, Math.min(100, Math.floor(m.n)), { art: m.a as KistenArt, v, life: Math.min(1200, +m.l || 900), treibgut: !!m.tg, id: m.id, netz: false });
});
onCoop('kweg', m => { const i = KISTEN.findIndex(k => k.id === m.id); if (i >= 0) { const k = KISTEN[i]; burst(k.x, k.y, k.z, '#9fe0ff', 8, 5, 0.4); weg(i); } });
onCoop('kzug', m => {
  const k = KISTEN.find(q => q.id === m.id); if (!k || k.hand || !Array.isArray(m.p) || m.p.length !== 3) return;
  k.x = +m.p[0]; k.y = +m.p[1]; k.z = +m.p[2];
  if (Array.isArray(m.v) && m.v.length === 3) { k.vx = +m.v[0]; k.vy = +m.v[1]; k.vz = +m.v[2]; }
  k.fern = 0.7;
});
function weg(i: number) { const k = KISTEN[i]; k.g.removeFromParent(); KISTEN.splice(i, 1); }
export function kistenLeeren() { while (KISTEN.length) weg(KISTEN.length - 1); }

// ---------- Laden ----------
const _v = new THREE.Vector3();
// Schiffe mit eigener Frachtklappe (Schiffskoordinaten, Nase −Z): Milan – Heckklappe des Frachtfachs im Rückengrat (mil-gelenke.json)
const KLAPPE: Record<string, [number, number, number]> = { milan: [0, 1.11, 8.28] };
export const hatKlappe = () => !!KLAPPE[P.cls];
/** Ladepunkt in der Welt: Spitze der Heckrampe (Kormoran, Wisent), eigene Frachtklappe (Milan), sonst die Frachtklappe unter dem Heck */
export function ladePunkt(out = _v) {
  const R = raum(), r = stats().radius, k = KLAPPE[P.cls];
  if (R) out.set(0, R.rampe.y1 + 0.5, R.rampe.z1 + 1); else if (k) out.set(k[0], k[1], k[2]); else out.set(0, -r * 0.25, r * 0.45);
  SHIP.g.updateMatrixWorld(); return SHIP.g.localToWorld(out);
}
/** Kiste in den Frachtraum: passt sie (Art und Platz)? Gibt den Grund zurück, wenn nicht */
export function ladenGrund(k: WeltKiste): string | null {
  if (!passt(k.art)) return k.art === 'container' ? `${MODELL.container.n}: passt nur in den Wisent` : `${MODELL[k.art].n}: passt nur in Schiffe mit Laderaum (Dohle, Kormoran, Wisent)`;
  if (cargoUsed() + k.n > stats().cargo) return 'Frachtraum voll';
  return null;
}
export function einladen(k: WeltKiste): boolean {
  const i = KISTEN.indexOf(k); if (i < 0 || ladenGrund(k)) return false;
  P.cargo[k.ware] += k.n; weg(i); coopSend('kweg', { id: k.id });
  snd(520, 0.18, 'triangle', 0.05, 260); setTimeout(() => snd(780, 0.12, 'triangle', 0.04, 200), 120);
  radio('SYSTEM', `${MODELL[k.art].n} geladen: ${k.n} ${ITEMS[k.ware].n}.`);
  return true;
}

// ---------- Traktorstrahl ----------
let strahl: THREE.Line | null = null, ziel: WeltKiste | null = null;
export const TRAKTOR = { ziel: null as WeltKiste | null, offen: false, rampe: false, hinweis: '' };      // rampe: Ladepunkt ist die Heckrampe (sonst Frachtklappe)
function strahlZeigen(a: THREE.Vector3 | null, b?: WeltKiste) {
  if (!strahl) {
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
    strahl = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    strahl.frustumCulled = false;
  }
  if (!a || !b) { strahl.removeFromParent(); return; }
  if (!strahl.parent) scene.add(strahl);
  const p = strahl.geometry.getAttribute('position') as THREE.BufferAttribute;
  p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, b.x, b.y, b.z); p.needsUpdate = true;
  (strahl.material as THREE.LineBasicMaterial).opacity = 0.35 + Math.sin(G.time * 18) * 0.15;
}

/** jedes Bild (main.ts): Kisten treiben, Traktorstrahl zieht im Flug langsam heran */
export function updateKisten(dt: number) {
  TRAKTOR.offen = false; TRAKTOR.hinweis = '';
  if (!KISTEN.length) { if (ziel) { ziel = null; strahlZeigen(null); } TRAKTOR.ziel = null; return; }      // nichts unterwegs (auch im Menü, vor dem Spielstand)
  TRAKTOR.rampe = !!raum();
  for (let i = KISTEN.length - 1; i >= 0; i--) {
    const k = KISTEN[i];
    if (k.sektor !== P.sector || world.surface) { weg(i); continue; }
    k.life -= dt; k.sperre -= dt; k.fern -= dt;
    if (k.life <= 0 && !k.hand) { weg(i); continue; }
    if (!k.echt && bojeTeile(MODELL[k.art].name)) koerper(k);
    const dr = Math.pow(k.hand ? 1 : 0.85, dt); k.vx *= dr; k.vy *= dr; k.vz *= dr;
    k.x += k.vx * dt; k.y += k.vy * dt; k.z += k.vz * dt;
    k.g.position.set(k.x, k.y, k.z);
    if (!k.hand) { const s = k.g.userData.spin; k.g.rotation.x += s[0] * dt; k.g.rotation.y += s[1] * dt; }
    (k.lampe.material as THREE.SpriteMaterial).opacity = (Math.sin(G.time * (k.treibgut ? 5 : 3) + i) > 0.3 ? 0.9 : 0.12);
    // Blinklicht: aus der Nähe klein (blendet nicht), aus der Ferne größer, damit man die Kiste findet (Treibgut weithin)
    const dc = camera.position.distanceTo(k.g.position); k.lampe.scale.setScalar(Math.min(k.treibgut ? 40 : 3, Math.max(0.35, dc * 0.012)));
  }
  // Traktorstrahl: nur im Flug, langsam, eine Kiste nach der anderen (die nächste, die passt)
  const fliegt = G.mode === 'play' && !G.dead && !world.surface && !G.dockedAt;
  const st = fliegt ? stats() : null, sp = Math.hypot(P.vx, P.vy, P.vz);
  if (ziel && (!KISTEN.includes(ziel) || ziel.hand)) ziel = null;
  if (fliegt) {
    const lp = ladePunkt();
    const nah = KISTEN.filter(k => !k.hand && k.sperre <= 0 && k.fern <= 0 && d3(k.x, k.y, k.z, P.x, P.y, P.z) < st!.magnet + 40)
      .sort((a, b) => d3(a.x, a.y, a.z, P.x, P.y, P.z) - d3(b.x, b.y, b.z, P.x, P.y, P.z));
    if (!ziel) ziel = nah.find(k => !ladenGrund(k)) || null;
    const erste = nah[0];
    if (erste && !ziel) { const g = ladenGrund(erste)!; TRAKTOR.hinweis = g; if (!erste.gemeldet) { erste.gemeldet = true; radio('SYSTEM', `Traktorstrahl: ${g}.`); } }
    if (ziel && sp > 25) { TRAKTOR.hinweis = 'Langsamer werden: Traktorstrahl ab 25 m/s'; ziel = null; }
    if (ziel) {
      const k = ziel, dx = lp.x - k.x, dy = lp.y - k.y, dz = lp.z - k.z, d = Math.hypot(dx, dy, dz) || 1;
      const zug = k.art === 'container' ? Math.min(7, 1.5 + d * 0.3) : Math.min(14, 2 + d * 0.5);      // schwere Stücke langsamer
      const kk = Math.min(1, dt * 2.5);
      k.vx += (dx / d * zug + P.vx - k.vx) * kk; k.vy += (dy / d * zug + P.vy - k.vy) * kk; k.vz += (dz / d * zug + P.vz - k.vz) * kk;
      TRAKTOR.offen = (!!raum() || hatKlappe()) && d < 120;      // Rampe bzw. Heckklappe öffnet, wenn die Kiste naht
      strahlZeigen(lp, k);
      if (d < MODELL[k.art].r + 2.2) { burst(k.x, k.y, k.z, '#9fe0ff', 10, 6, 0.4); einladen(k); ziel = null; }
    } else strahlZeigen(null);
  } else { ziel = null; strahlZeigen(null); }
  TRAKTOR.ziel = ziel;
  // bewegte Kisten an die Mitspieler (Traktorstrahl, von Hand geschoben)
  zugT -= dt;
  if (zugT <= 0 && coopNet.id) { zugT = 0.2; for (const k of KISTEN) if (k.hand || k === ziel) coopSend('kzug', { id: k.id, p: [r2(k.x), r2(k.y), r2(k.z)], v: [r2(k.vx), r2(k.vy), r2(k.vz)] }); }
}
let zugT = 0;

/** Beute als Kisten: auseinandertreibend um einen Punkt (Bienenstock) */
export function beuteKisten(x: number, y: number, z: number, teile: [ItemId, number][]) {
  for (const [ware, n] of teile) for (const [art, m] of packen(n, 'palette')) {
    const d = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
    kisteSetzen(x + d.x * 20, y + d.y * 20, z + d.z * 20, ware, m, { art, v: [d.x * rand(3, 8), d.y * rand(3, 8), d.z * rand(3, 8)], life: 1200 });
  }
}

// ---------- Abwerfen ----------
/** Fracht im Flug abwerfen: in Normkisten verpackt hinter dem Heck, 8 s lang nicht vom eigenen Traktorstrahl erfasst */
export function abwerfen(ware: ItemId, n: number): string {
  n = Math.min(n, P.cargo[ware]); if (n <= 0) return 'Davon ist nichts an Bord.';
  if (world.surface || G.dockedAt) return 'Abwerfen geht nur im Flug.';
  P.cargo[ware] -= n;
  const lp = ladePunkt(new THREE.Vector3()), back = new THREE.Vector3(0, 0, 1).applyQuaternion(SHIP.g.getWorldQuaternion(new THREE.Quaternion()));
  packen(n, groesste()).forEach(([art, m], i) => {
    const off = back.clone().multiplyScalar(3 + i * 2.6).add(new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)));
    kisteSetzen(lp.x + off.x, lp.y + off.y, lp.z + off.z, ware, m, { art, v: [P.vx + back.x * 4, P.vy + back.y * 4, P.vz + back.z * 4], sperre: 8 });
  });
  snd(260, 0.3, 'sawtooth', 0.04, -120);
  return `${n} ${ITEMS[ware].n} abgeworfen.`;
}

// ---------- Anzeige ----------
/** Marken fürs HUD (hud.ts): Treibgut immer, sonst bis 900 m */
export function kistenMarker() {
  return KISTEN.filter(k => !k.hand).map(k => ({ x: k.x, y: k.y + 2, z: k.z, label: `${MODELL[k.art].n.toUpperCase()} · ${k.n} ${ITEMS[k.ware].n.toUpperCase()}`, col: k.treibgut ? '#ffb040' : ITEMS[k.ware].c, big: k.treibgut }));
}
