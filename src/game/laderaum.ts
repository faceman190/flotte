import * as THREE from 'three';
import { P } from './state';
import { SHIP } from './player';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import { decoLaden, bojeTeile } from '../models/bojen';
import { doorProgress } from '../models/gltfShips';
import { buildFahrzeug, fzLaden, fzBereit, type FzId } from '../models/rover';
import { anBord, FZ_MASS } from './fahrzeuge';

// =====================================================================================
// Laderaum (seit 2026-11-25, Konzept docs/konzept-schiffe-fracht.md, Schritt 3)
//  - Fracht steht als Normkisten im Laderaum von Kormoran und Wisent: Kiste 10 E, Palette 25 E, Halbcontainer 100 E (nur Wisent).
//    Je Ware eigene Stücke in ihrer Farbe (Instanzfarbe auf dem hellen Lack). Gestellt in Reihen an den Wänden, von vorn nach hinten.
//  - Das Fahrzeug an Bord steht auf seinem Stellplatz (Blick zur Rampe). Am Planeten fährt man es über die Rampe hinaus und hinein.
//  - Boden und Rampe sind befahrbar (schiffBoden), seitlich begrenzt auf die freie Gasse zwischen den Kistenreihen (gasse).
// Alle Maße in Schiffskoordinaten (Nase −Z, oben +Y), gemessen aus Laufkarte und Modell (Rampe offen, Fahrwerk unten).
// =====================================================================================

interface Raum {
  boden: number; hw: number; z0: number; tuer: number;          // Laderaumboden (y), halbe Breite, vorderes Ende, Türebene (z)
  rampe: { y0: number; z1: number; y1: number; hw: number };    // Rampe von der Tür (Boden) bis zur Spitze (z1, y1), halbe Breite
  gasse: number;                                                 // halbe Breite der freien Fahrgasse zwischen den Kistenreihen
  decke: number;                                                 // lichte Höhe (für die Kamera)
  stell: { x: number; z: number }[];                             // Stellplätze, Fahrzeug blickt zur Rampe (+Z)
  reihen: { x: number; z0: number; z1: number; doppel?: boolean }[];      // Kistenreihen: Mitte (x), von z0 bis z1; doppel: Platz für Container
  aus?: string[];                                                // feste Frachtattrappen im Modell, die den echten Kisten weichen (ausgeblendet)
}
const RAEUME: Record<string, Raum> = {
  Kormoran: { boden: -1.4, hw: 3.3, z0: 10.3, tuer: 21.4, rampe: { y0: -1.42, z1: 27.6, y1: -4.1, hw: 2.1 }, gasse: 2.0, decke: 3.3, stell: [{ x: 0, z: 15.6 }],
    reihen: [{ x: 2.65, z0: 10.8, z1: 21.0 }, { x: -2.65, z0: 10.8, z1: 21.0 }], aus: ['Container001', 'Kiste010', 'Netzschnur096'] },
  Wisent: { boden: -3.8, hw: 6.3, z0: -4.0, tuer: 41.2, rampe: { y0: -3.7, z1: 50.0, y1: -10.2, hw: 3.7 }, gasse: 3.7, decke: 5.6, stell: [{ x: 0, z: 35.0 }, { x: 0, z: 26.0 }],
    reihen: [{ x: 4.95, z0: -3.4, z1: 40.5, doppel: true }, { x: -4.95, z0: -3.4, z1: 40.5, doppel: true }] },
};
const STUECK = { kiste: { e: 10, l: 1.2, b: 0.8, h: 0.8, name: 'FrachtKiste' }, palette: { e: 25, l: 1.2, b: 1.2, h: 1.2, name: 'FrachtPalette' }, container: { e: 100, l: 3.0, b: 2.4, h: 2.4, name: 'FrachtContainer' } };
type Art = keyof typeof STUECK;

let modell = '';
export function raum(): Raum | null { let n = ''; SHIP.g.traverse(o => { if (!n && o.userData.model) n = o.userData.model; }); modell = n; return RAEUME[n] || null; }
export const hatLaderaum = () => !!raum();

// ---------- Kisten aus der Fracht ----------
let lageJetzt: ReturnType<typeof stellen> = [];
let gruppe: THREE.Group | null = null, sig = '';
const fzStatisch = new Map<FzId, THREE.Object3D>();      // abgestellte Fahrzeuge im Laderaum (Standbild)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();
const ROT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);      // Länge der Stücke (Datei: X) längs des Schiffs (Z)
function farbe(k: ItemId) { _c.set(ITEMS[k].c); const g = (_c.r + _c.g + _c.b) / 3; return _c.lerp(new THREE.Color(g, g, g), 0.35).multiplyScalar(0.85).clone(); }
// Stücke je Ware (große zuerst) auf die Reihen verteilen, abwechselnd links und rechts, jede Reihe von vorn nach hinten: Container belegen
// in einer Doppelreihe drei Zellen hintereinander, Paletten und Kisten je eine 1,25-m-Zelle (zwei Kisten übereinander).
// Gibt Lagen in Schiffskoordinaten zurück.
function stellen(R: Raum) {
  const out: { art: Art; x: number; y: number; z: number; ware: ItemId }[] = [];
  const reihen = R.reihen.map(r => { const zl: { z: number; frei: boolean }[] = []; for (let z = r.z0 + 0.6; z <= r.z1 - 0.6; z += 1.25) zl.push({ z, frei: true }); return { x: r.x, doppel: !!r.doppel, zl }; });
  let w = 0;      // nächste Reihe (abwechselnd)
  const nimm = (len: number, doppel: boolean) => {      // len freie Zellen hintereinander in der nächsten passenden Reihe
    for (let t = 0; t < reihen.length; t++) {
      const ri = (w + t) % reihen.length, r = reihen[ri]; if (doppel && !r.doppel) continue;
      const i = r.zl.findIndex((_, j) => j + len <= r.zl.length && r.zl.slice(j, j + len).every(c => c.frei));
      if (i < 0) continue;
      for (let j = 0; j < len; j++) r.zl[i + j].frei = false;
      w = (ri + 1) % reihen.length;
      return { x: r.x, z: (r.zl[i].z + r.zl[i + len - 1].z) / 2 };
    }
    return null;
  };
  const waren = ITEM_IDS.filter(k => P.cargo[k] > 0).sort((a, b) => P.cargo[b] - P.cargo[a]);
  for (const k of waren) {
    let n = P.cargo[k];
    while (n >= 100 && R.reihen.some(r => r.doppel)) { const c = nimm(3, true); if (!c) break; out.push({ art: 'container', x: c.x, y: R.boden, z: c.z, ware: k }); n -= 100; }
    while (n > 0) {
      const c = nimm(1, false); if (!c) break;
      if (n >= 25) { out.push({ art: 'palette', x: c.x, y: R.boden, z: c.z, ware: k }); n -= 25; }
      else { out.push({ art: 'kiste', x: c.x, y: R.boden, z: c.z, ware: k }); n -= 10; if (n > 0) { out.push({ art: 'kiste', x: c.x, y: R.boden + 0.8, z: c.z, ware: k }); n -= 10; } }
    }
  }
  return out;
}
function bauen(R: Raum) {
  gruppe?.removeFromParent();
  for (const c of gruppe?.children || []) (c as THREE.InstancedMesh).dispose?.();
  gruppe = new THREE.Group(); gruppe.name = 'Ladung';
  const lage = stellen(R); lageJetzt = lage;
  for (const art of Object.keys(STUECK) as Art[]) {
    const L = lage.filter(q => q.art === art); if (!L.length) continue;
    const teile = bojeTeile(STUECK[art].name); if (!teile) { void decoLaden(STUECK[art].name); continue; }
    for (const t of teile) {
      const im = new THREE.InstancedMesh(t.geo, t.mat, L.length);
      const lack = (t.mat.name || '').includes('lack');
      L.forEach((q, i) => { _p.set(q.x, q.y, q.z); _m.compose(_p, ROT, _s); im.setMatrixAt(i, _m); if (lack) im.setColorAt(i, farbe(q.ware)); });
      im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere(); im.castShadow = false; im.receiveShadow = false;
      gruppe.add(im);
    }
  }
  SHIP.g.add(gruppe);
}
/** jedes Bild (main.ts): Kisten neu stellen, wenn sich Fracht oder Schiff geändert haben; Fahrzeug auf dem Stellplatz zeigen */
let draussen: FzId | null = null;
/** das Fahrzeug, das gerade im Laderaum steht (an Bord und nicht draußen), sonst undefined */
export const fzImRaum = (): FzId[] => anBord().filter(k => k !== draussen);
/** Stellplatz eines Fahrzeugs an Bord: Das gefahrene (draußen oder zuletzt bewegte, P.fahrzeug) steht vorn an der Rampe (Platz 0), die
 *  übrigen dahinter, damit keins das andere zuparkt. */
export function platzVon(k: FzId) {
  const R = raum(); if (!R) return 0;
  const ab = anBord(), vorn = draussen ?? (ab.includes(P.fahrzeug as FzId) ? P.fahrzeug as FzId : ab[0]);
  if (k === vorn) return 0;
  return Math.min(1 + Math.max(0, ab.filter(x => x !== vorn).indexOf(k)), R.stell.length - 1);
}
export function laderaumUpdate(fahrzeugDraussen: FzId | null) {
  draussen = fahrzeugDraussen;
  const R = raum();
  if (!R) { if (gruppe) { gruppe.removeFromParent(); gruppe = null; sig = ''; } fzZeigen([], null); return; }
  const loaded = (Object.keys(STUECK) as Art[]).map(a => (bojeTeile(STUECK[a].name) ? 1 : 0)).join('');
  const s = modell + '|' + SHIP.g.uuid + '|' + loaded + '|' + ITEM_IDS.map(k => P.cargo[k]).join(',');
  if (s !== sig) { sig = s; bauen(R); if (R.aus) SHIP.g.traverse(o => { if (R.aus!.includes(o.name)) o.visible = false; }); }
  // Fahrzeuge an Bord, die gerade nicht draußen fahren: jedes auf seinem Stellplatz
  fzZeigen(fzImRaum(), R);
}
function fzZeigen(kinds: FzId[], R: Raum | null) {
  for (const [k, g] of fzStatisch) if (!R || !kinds.includes(k) || g.parent !== SHIP.g) { g.removeFromParent(); fzStatisch.delete(k); }
  if (!R) return;
  for (const kind of kinds) {
    const sp = R.stell[platzVon(kind)], g0 = fzStatisch.get(kind);
    if (g0) { g0.position.set(sp.x, R.boden, sp.z); continue; }      // Platz kann wechseln (anderes Fahrzeug gewählt)
    if (!fzBereit(kind)) { fzLaden(kind); continue; }
    const m = buildFahrzeug(kind); if (!m) continue;
    const s = R.stell[platzVon(kind)];
    m.g.position.set(s.x, R.boden, s.z); m.g.rotation.set(0, Math.PI, 0);      // Blick zur Rampe
    m.g.traverse(o => { if ((o as THREE.Sprite).isSprite) o.visible = false; });      // abgestellt: Scheinwerfer, Rücklichter und Rundumleuchte aus
    SHIP.g.add(m.g); fzStatisch.set(kind, m.g);
  }
}

/** Laderaumboden für die Laufkarte (Schiffskoordinaten): dort, wo die Attrappen standen, wird er begehbar */
export function flaeche() { const R = raum(); return R ? { x0: -R.hw + 0.35, x1: R.hw - 0.35, z0: R.z0 + 0.35, z1: R.tuer - 0.2, y: R.boden, head: R.decke } : null; }
/** Standflächen für die Laufkarte an Bord (Schiffskoordinaten [x0, x1, z0, z1]): Kisten und das abgestellte Fahrzeug */
export function bloecke(): [number, number, number, number][] {
  const R = raum(); if (!R) return [];
  const out: [number, number, number, number][] = lageJetzt.map(q => { const a = STUECK[q.art]; return [q.x - a.b / 2, q.x + a.b / 2, q.z - a.l / 2, q.z + a.l / 2]; });
  for (const k of fzStatisch.keys()) { const [l, b] = FZ_MASS[k], s = R.stell[platzVon(k)]; out.push([s.x - b / 2, s.x + b / 2, s.z - l / 2, s.z + l / 2]); }
  return out;
}

// ---------- befahrbarer Boden: Laderaum und Rampe ----------
export interface Lage { x: number; y: number; z: number; yaw: number }
/** Weltpunkt → Schiffskoordinaten (x, z) bei gelandetem Schiff */
function lokal(x: number, z: number, s: Lage) { const dx = x - s.x, dz = z - s.z, c = Math.cos(s.yaw), n = Math.sin(s.yaw); return { lx: dx * c - dz * n, lz: dx * n + dz * c }; }
export function weltVon(lx: number, lz: number, s: Lage) { const c = Math.cos(s.yaw), n = Math.sin(s.yaw); return { x: s.x + lx * c + lz * n, z: s.z - lx * n + lz * c }; }
/** Lage im Laderaum oder auf der Rampe: 'raum' | 'rampe' | null (draußen). Nur bei offener Rampe. */
export function imSchiff(x: number, z: number, s: Lage): { wo: 'raum' | 'rampe'; lx: number; lz: number; R: Raum } | null {
  const R = raum(); if (!R) return null;
  const { lx, lz } = lokal(x, z, s);
  if (lz >= R.z0 && lz <= R.tuer && Math.abs(lx) <= R.hw) return { wo: 'raum', lx, lz, R };
  if (doorProgress(SHIP.g, 'rampe') < 0.95) return null;      // Rampe nur offen befahrbar
  if (lz > R.tuer && lz <= R.rampe.z1 + 0.5 && Math.abs(lx) <= R.rampe.hw + 0.3) return { wo: 'rampe', lx, lz, R };
  return null;
}
/** Bodenhöhe (Welt) im Laderaum oder auf der Rampe, sonst null */
export function schiffBoden(x: number, z: number, s: Lage): number | null {
  const i = imSchiff(x, z, s); if (!i) return null;
  if (i.wo === 'raum') return s.y + i.R.boden;
  const t = Math.min(1, (i.lz - i.R.tuer) / (i.R.rampe.z1 - i.R.tuer));
  return s.y + i.R.rampe.y0 + (i.R.rampe.y1 - i.R.rampe.y0) * t;
}
/** Fahrzeug in der Gasse halten (Schiffskoordinaten begrenzen): Rand der Kistenreihen, Rampe, Stirnwand. halbB/halbL: halbe Fahrzeugmaße, selbst: das gefahrene (zählt nicht als abgestellt), gesperrt: passt nicht hinein (bleibt auf der Rampe) */
export function gasse(x: number, z: number, s: Lage, halbB: number, halbL: number, selbst?: FzId, gesperrt = false): { x: number; z: number } | null {
  const i = imSchiff(x, z, s); if (!i) return null;
  const hw = Math.max(0.2, (i.wo === 'raum' ? i.R.gasse : i.R.rampe.hw) - halbB);
  let z0 = gesperrt ? i.R.tuer : i.R.z0; for (const k of fzStatisch.keys()) if (k !== selbst) z0 = Math.max(z0, i.R.stell[platzVon(k)].z + FZ_MASS[k][0] / 2 + 0.3);      // nicht in ein abgestelltes Fahrzeug
  const lx = Math.max(-hw, Math.min(hw, i.lx)), lz = Math.max(z0 + halbL, i.lz);
  if (lx === i.lx && lz === i.lz) return null;
  return weltVon(lx, lz, s);
}
/** Aufsetzen mit Rampe: Höhe des Schiffs (Mitte), damit die Rampenspitze den Boden berührt; das Fahrwerk darf 0,5 m einsinken.
 *  ok = false, wenn die Rampe mehr als 1,2 m über dem Boden endet oder das Fahrwerk mehr als 3 m in der Luft hängt (Hang, Kuppe). */
export function aufsetzen(x: number, z: number, yaw: number, landeH: number, hAt: (x: number, z: number) => number): { y: number; ok: boolean; spalt: number } | null {
  const R = raum(); if (!R) return null;
  const s = { x, y: 0, z, yaw };
  const fw = [0, R.z0, -R.rampe.z1 * 0.8].map(lz => { const p = weltVon(0, lz, s); return hAt(p.x, p.z); });
  const sp = weltVon(0, R.rampe.z1, s), hSp = hAt(sp.x, sp.z);
  const y = Math.max(Math.max(...fw) + landeH - 0.5, hSp - R.rampe.y1);
  const spalt = y + R.rampe.y1 - hSp, luft = y - (Math.min(...fw) + landeH);
  return { y, ok: spalt < 1.2 && luft < 3, spalt };
}
/** Stellplatz in der Welt (für das Aussetzen beim Landen): Mitte, Boden, Blick zur Rampe */
export function stellplatz(s: Lage, i = 0) { const R = raum(); if (!R) return null; const p = weltVon(R.stell[i].x, R.stell[i].z, s); return { x: p.x, z: p.z, y: s.y + R.boden, yaw: s.yaw + Math.PI }; }
/** erster Stellplatz in Schiffskoordinaten (begehbarer Innenraum: dort steigt man ins Fahrzeug) */
export function stellLokal(k?: FzId) { const R = raum(); if (!R) return null; const s = R.stell[k ? platzVon(k) : 0]; return { x: s.x, y: R.boden, z: s.z }; }
/** Kamera im Laderaum begrenzen (Weltpunkt, wird verschoben), damit sie nicht durch Wände und Decke schaut */
export function kameraImRaum(p: THREE.Vector3, s: Lage, fahrzeug: { x: number; z: number }) {
  const R = raum(); if (!R || !imSchiff(fahrzeug.x, fahrzeug.z, s)) return;
  const { lx, lz } = lokal(p.x, p.z, s);
  if (lz > R.rampe.z1) return;      // hinter der Rampe: draußen
  const cx = Math.max(-R.hw + 0.4, Math.min(R.hw - 0.4, lx)), cz = Math.max(R.z0 + 0.4, lz);
  const w = weltVon(cx, cz, s); p.x = w.x; p.z = w.z;
  if (lz <= R.tuer) p.y = Math.min(p.y, s.y + R.boden + R.decke - 0.3);
}
