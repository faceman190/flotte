import * as THREE from 'three';
import { SHIPS, type ShipId } from '../data/ships';
import { hasModel, modelInstance, rampenVon } from '../models/gltfShips';
import { type Lage, gekippt, zuLokal, zuWelt } from './lage';

// =====================================================================================
// Feste Körper zu Fuß auf Planeten (seit 2026-11-26). Nutzer: „Man kann durch viele Objekte laufen, Schiffe anderer Spieler,
// Mineneingang … dann aber eine große Box um das eigene Schiff. Unter meinen Wisent kann ich nicht.“
// Statt Kreisen prüfen jetzt Strahlen in drei Höhen (Knie, Hüfte, Kopf) gegen die echten Dreiecke der Modelle: Unter einem hohen Rumpf
// läuft man durch, Fahrwerk, Triebwerke und Wände halten auf. Nur Vorderseiten zählen: Wer (warum auch immer) in einem Modell steht,
// kommt hinaus.
//  - Schiffe (eigenes und gelandete fremde): Raster je Modell in Schiffskoordinaten, einmal gebaut (Ruhelage: Fahrwerk aus, Rampe zu);
//    die offene Heckrampe des Wisent hält als Kasten auf (an Bord geht es mit [E] am Fuß der Rampe).
//  - Feste Bauten (Mineneingänge, Außenstellen, Bohrtürme): Raster in Weltkoordinaten, gebaut beim ersten Nahekommen.
//  - Kreise (fremde Fahrzeuge).
// =====================================================================================
const CELL = 2, HOEHEN = [0.35, 1.0, 1.75], LEIB = 0.35;
const ck = (ix: number, iz: number) => (ix + 2048) * 4096 + (iz + 2048);

class TriGitter {
  tri: Float32Array; grid = new Map<number, number[]>(); r = 0; cx = 0; cz = 0;
  constructor(meshes: THREE.Mesh[], frame: THREE.Matrix4) {
    const list: number[] = [], v = new THREE.Vector3(), m = new THREE.Matrix4();
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const me of meshes) {
      const g = me.geometry as THREE.BufferGeometry, pos = g.attributes.position; if (!pos) continue;
      const idx = g.index, n = idx ? idx.count : pos.count;
      m.multiplyMatrices(frame, me.matrixWorld);
      for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m); list.push(v.x, v.y, v.z); if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.z < z0) z0 = v.z; if (v.z > z1) z1 = v.z; }
    }
    this.tri = new Float32Array(list);
    const T = this.tri;
    for (let t = 0; t < T.length / 9; t++) {
      const o = t * 9, a0 = Math.min(T[o], T[o + 3], T[o + 6]), a1 = Math.max(T[o], T[o + 3], T[o + 6]), b0 = Math.min(T[o + 2], T[o + 5], T[o + 8]), b1 = Math.max(T[o + 2], T[o + 5], T[o + 8]);
      for (let ix = Math.floor(a0 / CELL); ix <= Math.floor(a1 / CELL); ix++) for (let iz = Math.floor(b0 / CELL); iz <= Math.floor(b1 / CELL); iz++) {
        const k = ck(ix, iz); let b = this.grid.get(k); if (!b) this.grid.set(k, b = []); b.push(t);
      }
    }
    if (isFinite(x0)) { this.cx = (x0 + x1) / 2; this.cz = (z0 + z1) / 2; this.r = Math.hypot(x1 - x0, z1 - z0) / 2; }
  }
  // Strahl gegen ein Dreieck (Möller–Trumbore), nur Vorderseite; Rückgabe t oder -1
  private hit(t: number, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, beide: boolean) {
    const T = this.tri, o = t * 9, ax = T[o], ay = T[o + 1], az = T[o + 2];
    const e1x = T[o + 3] - ax, e1y = T[o + 4] - ay, e1z = T[o + 5] - az, e2x = T[o + 6] - ax, e2y = T[o + 7] - ay, e2z = T[o + 8] - az;
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
    if (beide ? Math.abs(det) < 1e-9 : det < 1e-9) return -1;      // Rückseite (nur bei Schiffen) oder streifend
    const inv = 1 / det, tx = ox - ax, ty = oy - ay, tz = oz - az, u = (tx * px + ty * py + tz * pz) * inv;
    if (u < 0 || u > 1) return -1;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, w = (dx * qx + dy * qy + dz * qz) * inv;
    if (w < 0 || u + w > 1) return -1;
    const d = (e2x * qx + e2y * qy + e2z * qz) * inv;
    return d >= 0 ? d : -1;
  }
  /** Wand auf dem Weg von (ox, oz) nach (nx, nz) in Körperhöhe? fy: Fußhöhe (alles in den Koordinaten des Rasters) */
  wand(ox: number, oz: number, nx: number, nz: number, fy: number, beide = false) {      // beide: auch Rückseiten (Bauten mit einseitigen Flächen)
    const dx = nx - ox, dz = nz - oz, L = Math.hypot(dx, dz); if (L < 1e-5) return false;
    const ux = dx / L, uz = dz / L, far = L + LEIB, seen = new Set<number>();
    for (let s = 0; s <= far + 1e-6; s += CELL * 0.5) {
      const b = this.grid.get(ck(Math.floor((ox + ux * s) / CELL), Math.floor((oz + uz * s) / CELL))); if (!b) continue;
      for (const t of b) {
        if (seen.has(t)) continue; seen.add(t);
        for (const h of HOEHEN) { const d = this.hit(t, ox, fy + h, oz, ux, 0, uz, beide); if (d >= 0 && d < far) return true; }
      }
    }
    return false;
  }
  /** Wand auf der Strecke a → b (beliebig im Raum, Koordinaten des Rasters), plus Körperradius */
  strecke(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz); if (L < 1e-5) return false;
    const ux = dx / L, uy = dy / L, uz = dz / L, far = L + LEIB, seen = new Set<number>();
    for (let s = 0; s <= far + 1e-6; s += CELL * 0.5) {
      const b = this.grid.get(ck(Math.floor((ax + ux * s) / CELL), Math.floor((az + uz * s) / CELL))); if (!b) continue;
      for (const t of b) { if (seen.has(t)) continue; seen.add(t); const d = this.hit(t, ax, ay, az, ux, uy, uz, false); if (d >= 0 && d < far) return true; }
    }
    return false;
  }
}

function netze(root: THREE.Object3D) {
  const out: THREE.Mesh[] = [];
  const walk = (o: THREE.Object3D) => {
    if ((o as any).isLOD) { const l = (o as THREE.LOD).levels[0]; if (l) walk(l.object); return; }      // nur die nahe Fassung
    if ((o as any).isMesh && o.visible && !(o as any).isSkinnedMesh) out.push(o as THREE.Mesh);
    for (const c of o.children) walk(c);
  };
  walk(root);
  return out;
}

// ---------- Schiffe: Raster je Modell in Schiffskoordinaten ----------
const schiffe = new Map<string, TriGitter | null>();
export function schiffGitter(cls: string): TriGitter | null {
  const c = SHIPS[cls as ShipId]; if (!c || !hasModel(c.model)) return null;
  let g = schiffe.get(c.model);
  if (g === undefined) {
    const inst = modelInstance(c.model, c.len).obj;      // frische Kopie: Ruhelage (Fahrwerk aus, Rampe und Kanzel zu)
    inst.updateMatrixWorld(true);
    g = new TriGitter(netze(inst), new THREE.Matrix4());
    schiffe.set(c.model, g);
  }
  return g;
}
export type { Lage };
const _a = new THREE.Vector3(), _b = new THREE.Vector3();
/** Weltpunkt → Schiffskoordinaten (Umkehrung von x + lx·cos + lz·sin, z − lx·sin + lz·cos; für den Kasten der Rampe genügt der Kurs) */
function lokal(s: Lage, wx: number, wz: number) { const c = Math.cos(s.yaw), n = Math.sin(s.yaw), dx = wx - s.x, dz = wz - s.z; return { x: dx * c - dz * n, z: dx * n + dz * c }; }
/** Weg von o nach n am gelandeten Schiff versperrt? rampeOffen: Heckrampe (Wisent) als Kasten */
export function schiffSperrt(cls: string, s: Lage, ox: number, oz: number, nx: number, nz: number, fy: number, rampeOffen = false) {
  const g = schiffGitter(cls); if (!g) return null;      // null: kein Modell, der Aufrufer nimmt den alten Kreis
  const a = lokal(s, ox, oz), b = lokal(s, nx, nz);
  if (Math.hypot(b.x - g.cx, b.z - g.cz) > g.r + 3) return false;
  if (!gekippt(s)) { if (g.wand(a.x, a.z, b.x, b.z, fy - s.y)) return true; }
  else for (const h of HOEHEN) {      // gekippt (seit 2026-11-26): Strahlen waagerecht in der Welt, im Schiff leicht schräg
    const p = zuLokal(ox, fy + h, oz, s, _a), q = zuLokal(nx, fy + h, nz, s, _b);
    if (g.strecke(p.x, p.y, p.z, q.x, q.y, q.z)) return true;
  }
  if (rampeOffen) for (const e of rampenVon(SHIPS[cls as ShipId]?.model || '')) {      // Heck- und Bugrampe (Möwe): Richtung e.s
    const drin = (p: { x: number; z: number }) => Math.abs(p.x) < e.hw + LEIB && e.s * p.z > e.s * e.door && e.s * p.z < e.s * e.foot + LEIB; if (drin(b) && !drin(a)) return true;
  }
  return false;
}

// ---------- Landen aufs Gelände (seit 2026-11-26): Landefüße aus dem Modell, Neigung nach den Bodenhöhen darunter ----------
// Nutzer: „Kann man einstellen, dass das Schiff auf dem Fahrwerk landet, auf dem Terrain angepasst, und nicht immer exakt waagerecht steht?“
// Füße: die tiefsten Punkte des Fahrwerks (Material „gear“ bzw. „… |fw“) in Ruhelage, zu Gruppen zusammengefasst; ohne Fahrwerk die tiefsten
// Punkte des Rumpfs. Neigung: Ebene durch die Bodenhöhen unter den Füßen (kleinste Quadrate), höchstens MAX_KIPP; dann so hoch, dass kein
// Fuß im Boden steckt. luft: größter Spalt unter einem Fuß (Kuppe, zu steil).
export const MAX_KIPP = 10 * Math.PI / 180;
type Fuss = { x: number; y: number; z: number };
const fuesse = new Map<string, Fuss[] | null>();
export function fussPunkte(cls: string): Fuss[] | null {
  const c = SHIPS[cls as ShipId]; if (!c || !hasModel(c.model)) return null;
  let F = fuesse.get(c.model);
  if (F !== undefined) return F;
  const inst = modelInstance(c.model, c.len).obj; inst.updateMatrixWorld(true);
  const alle = netze(inst), fw = alle.filter(m => { const n = String((m.material as THREE.Material)?.name || ''); return n === 'gear' || /\|fw/.test(n); });
  const v = new THREE.Vector3(), pts: number[] = [];
  let minY = Infinity;
  for (const m of fw.length ? fw : alle) {
    const pos = (m.geometry as THREE.BufferGeometry).attributes.position; if (!pos) continue;
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld); pts.push(v.x, v.y, v.z); if (v.y < minY) minY = v.y; }
  }
  const tief: Fuss[] = [];
  for (let i = 0; i < pts.length; i += 3) if (pts[i + 1] < minY + 0.3) tief.push({ x: pts[i], y: pts[i + 1], z: pts[i + 2] });
  // Gruppen: Punkte näher als 2 m gehören zu einem Fuß (Fußteller sind bis 2 m breit); Fuß = Mitte der Gruppe, Höhe = tiefster Punkt
  const gr: { sx: number; sz: number; n: number; y: number }[] = [];
  for (const p of tief) {
    const g = gr.find(q => Math.hypot(q.sx / q.n - p.x, q.sz / q.n - p.z) < 2.0);
    if (g) { g.sx += p.x; g.sz += p.z; g.n++; g.y = Math.min(g.y, p.y); } else gr.push({ sx: p.x, sz: p.z, n: 1, y: p.y });
  }
  // nahe Gruppen zusammenlegen (die laufende Mitte teilte einen Fußteller sonst in zwei)
  for (let merged = true; merged;) {
    merged = false;
    for (let a = 0; a < gr.length && !merged; a++) for (let b = a + 1; b < gr.length; b++) {
      const A = gr[a], B = gr[b];
      if (Math.hypot(A.sx / A.n - B.sx / B.n, A.sz / A.n - B.sz / B.n) < 2.6) { A.sx += B.sx; A.sz += B.sz; A.n += B.n; A.y = Math.min(A.y, B.y); gr.splice(b, 1); merged = true; break; }
    }
  }
  F = gr.map(g => ({ x: g.sx / g.n, y: g.y, z: g.sz / g.n }));
  for (const f of [...F]) if (Math.abs(f.x) > 0.5 && !F.some(q => Math.hypot(q.x + f.x, q.z - f.z) < 1.5)) F.push({ x: -f.x, y: f.y, z: f.z });      // Schiffe sind symmetrisch: fehlendes Gegenstück ergänzen (Wisent: ein Hauptbein lag in einer anderen Netzgruppe)
  if (!fw.length && F.length > 10) {      // flacher Rumpf ohne Fahrwerk: die vier äußersten Punkte
    const by = (f: (p: Fuss) => number) => F!.reduce((a, b) => (f(b) > f(a) ? b : a));
    F = [...new Set([by(p => p.x), by(p => -p.x), by(p => p.z), by(p => -p.z)])];
  }
  if (!F.length) F = null;
  fuesse.set(c.model, F);
  return F;
}
/** Lage des gelandeten Schiffs bei (x, z) mit Kurs yaw auf dem Gelände hAt; null: kein Modell (dann rechnet der Aufrufer wie früher) */
export function kippLage(cls: string, x: number, z: number, yaw: number, hAt: (x: number, z: number) => number): (Lage & { luft: number; ebene: boolean }) | null {
  const F = fussPunkte(cls); if (!F) return null;
  const c = Math.cos(yaw), n = Math.sin(yaw), h = F.map(f => hAt(x + f.x * c + f.z * n, z - f.x * n + f.z * c));
  // y(f) ≈ Y + f.y + f.x·sin(roll) − f.z·sin(pitch) = h  →  kleinste Quadrate in (Y, sr, sp)
  let sr = 0, sp = 0;
  if (F.length >= 3) {
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], B = [0, 0, 0];
    F.forEach((f, i) => { const r = [1, f.x, -f.z], b = h[i] - f.y; for (let a = 0; a < 3; a++) { B[a] += r[a] * b; for (let k = 0; k < 3; k++) A[a][k] += r[a] * r[k]; } });
    const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(A);
    if (Math.abs(D) > 1e-6) {
      const col = (j: number) => A.map((row, i) => row.map((v, k) => (k === j ? B[i] : v)));
      sr = det(col(1)) / D; sp = det(col(2)) / D;
    }
  }
  // Feinsuche um die Ausgleichsebene: die Neigung, bei der der größte Spalt unter einem Fuß am kleinsten ist (wie ein Tisch auf seinen Beinen)
  const lim = Math.sin(MAX_KIPP), w = F.map(() => new THREE.Vector3()), s: Lage = { x, y: 0, z, yaw };
  const pruefe = (pitch: number, roll: number) => {
    s.pitch = pitch; s.roll = roll; let Y = -Infinity;
    const hg = F.map((f, i) => { zuWelt(f.x, f.y, f.z, s, w[i]); const g = hAt(w[i].x, w[i].z); Y = Math.max(Y, g - w[i].y); return g; });
    let luft = 0; w.forEach((p, i) => { luft = Math.max(luft, Y + p.y - hg[i]); });
    return { Y, luft };
  };
  let pitch = Math.asin(Math.max(-lim, Math.min(lim, sp))), roll = Math.asin(Math.max(-lim, Math.min(lim, sr))), best = pruefe(pitch, roll);
  if (F.length >= 3) for (const st of [1.5, 0.5, 0.15].map(d => d * Math.PI / 180)) {
    const p0 = pitch, r0 = roll;
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
      const pp = Math.max(-MAX_KIPP, Math.min(MAX_KIPP, p0 + a * st)), rr = Math.max(-MAX_KIPP, Math.min(MAX_KIPP, r0 + b * st)), t = pruefe(pp, rr);
      if (t.luft < best.luft - 1e-4) { best = t; pitch = pp; roll = rr; }
    }
  }
  const SINK = 0.12;      // Federweg: die tragenden Füße drücken sich ein Stück ein, die übrigen kommen dem Boden näher
  const Y = best.Y - SINK, luft = Math.max(0, best.luft - SINK);
  return { x, y: Y, z, yaw, pitch, roll, luft, ebene: F.length >= 3 };
}

// ---------- weitere Körper: feste Bauten und fremde Schiffe/Fahrzeuge ----------
type Eintrag =
  | { art: 'bau'; root: THREE.Object3D; g?: TriGitter; bb?: THREE.Box3 }
  | { art: 'schiff'; cls: string; lage: Lage; rampe: boolean }
  | { art: 'kreis'; x: number; z: number; r: number };
const KOERPER = new Map<string, Eintrag>();
/** setzen oder (null) entfernen */
export function koerper(key: string, e: Eintrag | null) { if (e) KOERPER.set(key, e); else KOERPER.delete(key); }
/** fester Bau aus der Szene (Raster in Weltkoordinaten, erst beim ersten Nahekommen gebaut); verschwindet er aus der Szene, zählt er nicht mehr */
export function bauKoerper(key: string, root: THREE.Object3D) { KOERPER.set(key, { art: 'bau', root }); }
export function koerperWeg(prefix: string) { for (const k of [...KOERPER.keys()]) if (k.startsWith(prefix)) KOERPER.delete(k); }
const _inv = new THREE.Matrix4();
/** Weg von o nach n zu Fuß versperrt (Weltkoordinaten, fy = Fußhöhe)? */
export function koerperSperrt(ox: number, oz: number, nx: number, nz: number, fy: number) {
  for (const [k, e] of KOERPER) {
    if (e.art === 'kreis') { const d = Math.hypot(nx - e.x, nz - e.z); if (d < e.r && d < Math.hypot(ox - e.x, oz - e.z)) return true; continue; }
    if (e.art === 'schiff') { if (schiffSperrt(e.cls, e.lage, ox, oz, nx, nz, fy, e.rampe)) return true; continue; }
    if (!e.root.parent) { KOERPER.delete(k); continue; }      // abgebaut
    if (!e.g) {
      const bb = e.bb || (e.bb = new THREE.Box3().setFromObject(e.root)); if (bb.isEmpty()) { e.bb = undefined; continue; }      // leer: Modell lädt noch
      if (nx < bb.min.x - 4 || nx > bb.max.x + 4 || nz < bb.min.z - 4 || nz > bb.max.z + 4) continue;      // erst in der Nähe bauen
      e.root.updateMatrixWorld(true); e.g = new TriGitter(netze(e.root), _inv.identity());
    }
    if (Math.hypot(nx - e.g.cx, nz - e.g.cz) > e.g.r + 3) continue;
    if (e.g.wand(ox, oz, nx, nz, fy, true)) return true;
  }
  return false;
}
