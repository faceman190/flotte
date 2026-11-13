import * as THREE from 'three';
import { world, type Station } from './world';
import { scene } from '../core/engine';
import { terrainAt } from './surface';

// =====================================================================================
// Planetenbasen zu Fuß (Alpha 0.84): Auf Planeten fliegt man nicht mehr in einen Hangar.
// Man landet auf dem Landefeld der Basis, steigt aus und geht durch die Tür hinein (Gang → Promenade).
// Größere Städte/Stationen mit Hangar kommen später.
//   basePad(st)   Landefeld (Mitte, Höhe, Ausdehnung) und Tür am Gebäude, einmal vermessen (Strahltests am Modell)
//   padGround()   Bodenhöhe zu Fuß: auf dem Landefeld dessen Oberfläche
//   baseBlocked() Gebäudewände zu Fuß (Kollisionskugeln des Modells in Körperhöhe, ohne das Landefeld)
// =====================================================================================

export interface Pad { st: Station; x: number; z: number; y: number; u: [number, number]; v: [number, number]; hu: number; hv: number; door: { x: number; z: number; yaw: number } }
let cache: Pad | null = null;
const ray = new THREE.Raycaster(), _o = new THREE.Vector3(), _d = new THREE.Vector3(0, -1, 0);

let meshes: THREE.Object3D[] = [], meshOf: THREE.Object3D | null = null;
function hitY(st: Station, x: number, z: number): number | null {
  if (meshOf !== st.mesh) { meshes = []; st.mesh.traverse((o: any) => { if (o.isMesh && o.visible) meshes.push(o); }); meshOf = st.mesh; }   // nur Flächen (Leuchtpunkte bräuchten eine Kamera)
  _o.set(x, st.y + 80, z); ray.set(_o, _d); ray.far = 200;
  const h = ray.intersectObjects(meshes, false)[0];
  return h ? h.point.y : null;
}

export function basePad(st: Station): Pad | null {
  if ((st.def as any).city) return null;                // Stadt: kein Landefeld, man fliegt in den Hangar
  if (cache && cache.st === st) return cache;
  if (!world.surface || !st.id.endsWith('_base')) return null;
  st.mesh.updateMatrixWorld(true);
  const cx = st.dock.x, cz = st.dock.z, g0 = terrainAt(cx, cz), top = hitY(st, cx, cz);
  if (top === null || top > g0 + 6) return null;                      // kein flaches Feld unter dem Andockpunkt
  const y = Math.max(top, g0);
  const u: [number, number] = [Math.cos(st.yaw), -Math.sin(st.yaw)], v: [number, number] = [Math.sin(st.yaw), Math.cos(st.yaw)];
  // Ausdehnung: vom Mittelpunkt in vier Richtungen, solange die Oberfläche auf Feldhöhe bleibt
  const reach = (dx: number, dz: number) => {
    let d = 0;
    for (let t = 0.5; t < 45; t += 0.5) { const hy = hitY(st, cx + dx * t, cz + dz * t); if (hy === null || Math.abs(hy - y) > 0.35) break; d = t; }
    return d;
  };
  const ru = Math.min(reach(u[0], u[1]), reach(-u[0], -u[1])), rv = Math.min(reach(v[0], v[1]), reach(-v[0], -v[1]));
  const pad: Pad = { st, x: cx, z: cz, y, u, v, hu: Math.max(4, ru), hv: Math.max(4, rv), door: { x: cx, z: cz, yaw: 0 } };
  // Tür: an der ersten echten Gebäudewand zwischen Feld und Basismitte. Waagrechte Strahlen in 2 m und 4,5 m Höhe;
  // nur wo beide fast gleich weit treffen, steht eine Wand (Fässer, Laternen und Schilder sind niedriger oder schmal).
  let dx = st.x - cx, dz = st.z - cz; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
  let best = -1, bx = 0, bz = 0;
  for (let k = -4; k <= 4 && best < 0; k++) {
    const sx = cx - dz * k * 3, sz = cz + dx * k * 3;                    // mehrere parallele Strahlen nebeneinander
    const g = terrainAt(sx, sz), a = hitH(st, sx, g + 2.0, sz, dx, dz), b = hitH(st, sx, g + 4.5, sz, dx, dz);
    if (a !== null && b !== null && Math.abs(a - b) < 1.2 && a > Math.min(pad.hu, pad.hv)) { best = a; bx = sx + dx * (a - 1.2); bz = sz + dz * (a - 1.2); }
  }
  if (best < 0) {
    let dt = L * 0.5;
    for (let t = 2; t < L; t += 0.5) { if (wallAt(pad, cx + dx * t, cz + dz * t, terrainAt(cx + dx * t, cz + dz * t))) { dt = t - 2.2; break; } }
    bx = cx + dx * dt; bz = cz + dz * dt;
  }
  pad.door = { x: bx, z: bz, yaw: Math.atan2(dx, dz) };                   // yaw: Blick von der Tür nach draußen (Spielkonvention: vorn = -sin, -cos)
  cache = pad;
  doorProp(pad);
  return pad;
}
export function resetBasePad() { cache = null; }
// waagrechter Strahl: Entfernung bis zur ersten Fläche des Modells
function hitH(st: Station, x: number, y: number, z: number, dx: number, dz: number): number | null {
  _o.set(x, y, z); ray.set(_o, new THREE.Vector3(dx, 0, dz)); ray.far = 140;
  const h = ray.intersectObjects(meshes, false)[0];
  return h ? h.distance : null;
}
// sichtbarer Eingang an der Wand: Rahmen, Torblatt, Leuchtschild (gehört zum Sektor, wird mit ihm aufgeräumt)
function doorProp(p: Pad) {
  const g = new THREE.Group(), y0 = surfaceAt(p.door.x, p.door.z, terrainAt(p.door.x, p.door.z) + 3);
  g.position.set(p.door.x, y0, p.door.z); g.rotation.y = p.door.yaw;
  const frame = new THREE.MeshStandardMaterial({ color: 0x4a4e56, roughness: 0.5, metalness: 0.7 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2a2e34, roughness: 0.35, metalness: 0.85 });
  const glow = new THREE.MeshStandardMaterial({ color: 0x103018, emissive: 0x3ad06a, emissiveIntensity: 2.2 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; g.add(o); return o; };
  box(0.35, 3.4, 0.6, -1.55, 1.7, 0, frame); box(0.35, 3.4, 0.6, 1.55, 1.7, 0, frame); box(3.45, 0.4, 0.6, 0, 3.5, 0, frame);
  box(2.75, 3.1, 0.12, 0, 1.55, 0.12, leaf);
  box(2.4, 0.08, 0.02, 0, 2.4, -0.2, glow).rotation.y = 0;
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d')!;
  x.fillStyle = '#0b1a10'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#7fe0a0'; x.font = '700 38px "Share Tech Mono",Consolas,monospace'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('EINGANG', 128, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  sign.position.set(0, 3.95, -0.32); sign.rotation.y = Math.PI; g.add(sign);
  const lamp = new THREE.PointLight(0x7fe0a0, 6, 9, 2); lamp.position.set(0, 3.6, -1.2); g.add(lamp);
  scene.add(g); world.extras.push(g);
}

export const onPad = (p: Pad, x: number, z: number, m = 0) => {
  const rx = x - p.x, rz = z - p.z;
  return Math.abs(rx * p.u[0] + rz * p.u[1]) < p.hu + m && Math.abs(rx * p.v[0] + rz * p.v[1]) < p.hv + m;
};
// Bodenhöhe zu Fuß: Gelände, auf dem Landefeld dessen Oberfläche
export function padGround(x: number, z: number) {
  const g = terrainAt(x, z), st = world.stations[0];
  if (!st || !world.surface) return g;
  const p = basePad(st);
  return p && onPad(p, x, z, 0.3) ? Math.max(g, p.y) : g;
}
function wallAt(p: Pad, x: number, z: number, fy: number) {
  const st = p.st, cy = fy + 0.9;
  for (const s of st.sph) {
    const sx = st.x + s[0], sy = st.y + s[1], sz = st.z + s[2], r = s[3];
    if (onPad(p, sx, sz, -1)) continue;                                 // das Landefeld selbst ist begehbar
    const dy = Math.abs(sy - cy); if (dy > r + 0.9) continue;
    const rr = Math.sqrt(Math.max(0, r * r - Math.max(0, dy - 0.9) ** 2)) + 0.35;
    if ((x - sx) ** 2 + (z - sz) ** 2 < rr * rr) return true;
  }
  return false;
}
// Gebäudewände zu Fuß (nur in der Nähe der Basis geprüft)
export function baseBlocked(x: number, z: number, fy: number) {
  const st = world.stations[0];
  if (!st || !world.surface || Math.hypot(x - st.x, z - st.z) > st.R + 10) return false;
  const p = basePad(st); if (!p) return false;
  return wallAt(p, x, z, fy);
}
// ---- Begehen der Basis mit Strahltests am Modell (Sockel, Stufen, Landefeld; Wände in Körperhöhe) ----
// Die Dreiecke des Modells liegen in einem Raster (2 m in X/Z): ein Strahl prüft nur die Dreiecke seiner Zellen.
const nearBase = (x: number, z: number) => { const st = world.stations[0]; return !!st && !!world.surface && st.id.endsWith('_base') && Math.hypot(x - st.x, z - st.z) < st.R + 12; };
function ensureMeshes(st: Station) { if (meshOf !== st.mesh) { meshes = []; ((st.mesh.userData.walkRoot as THREE.Object3D) || st.mesh).traverse((o: any) => { if (o.isMesh && o.visible) meshes.push(o); }); meshOf = st.mesh; } }
const CELL = 2;
let gridOf: THREE.Object3D | null = null, TRI = new Float32Array(0), GRID = new Map<number, number[]>();
const ck = (ix: number, iz: number) => (ix + 2048) * 4096 + (iz + 2048);
function ensureGrid(st: Station) {
  if (gridOf === st.mesh) return;
  ensureMeshes(st); st.mesh.updateMatrixWorld(true);
  const list: number[] = [], v = new THREE.Vector3();
  for (const m of meshes as THREE.Mesh[]) {
    const pos = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(m.matrixWorld); list.push(v.x, v.y, v.z); }
  }
  TRI = new Float32Array(list); GRID = new Map();
  for (let t = 0; t < TRI.length / 9; t++) {
    const o = t * 9, x0 = Math.min(TRI[o], TRI[o + 3], TRI[o + 6]), x1 = Math.max(TRI[o], TRI[o + 3], TRI[o + 6]), z0 = Math.min(TRI[o + 2], TRI[o + 5], TRI[o + 8]), z1 = Math.max(TRI[o + 2], TRI[o + 5], TRI[o + 8]);
    for (let ix = Math.floor(x0 / CELL); ix <= Math.floor(x1 / CELL); ix++) for (let iz = Math.floor(z0 / CELL); iz <= Math.floor(z1 / CELL); iz++) {
      const k = ck(ix, iz); let b = GRID.get(k); if (!b) GRID.set(k, b = []); b.push(t);
    }
  }
  gridOf = st.mesh;
}
// Strahl gegen ein Dreieck (Möller–Trumbore), beidseitig; Rückgabe t oder -1
function hitTri(t: number, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number) {
  const o = t * 9, ax = TRI[o], ay = TRI[o + 1], az = TRI[o + 2];
  const e1x = TRI[o + 3] - ax, e1y = TRI[o + 4] - ay, e1z = TRI[o + 5] - az, e2x = TRI[o + 6] - ax, e2y = TRI[o + 7] - ay, e2z = TRI[o + 8] - az;
  const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x, det = e1x * px + e1y * py + e1z * pz;
  if (Math.abs(det) < 1e-9) return -1;
  const inv = 1 / det, tx = ox - ax, ty = oy - ay, tz = oz - az, u = (tx * px + ty * py + tz * pz) * inv;
  if (u < 0 || u > 1) return -1;
  const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, w = (dx * qx + dy * qy + dz * qz) * inv;
  if (w < 0 || u + w > 1) return -1;
  const d = (e2x * qx + e2y * qy + e2z * qz) * inv;
  return d >= 0 ? d : -1;
}
// Boden unter den Füßen: höchste Fläche unterhalb von Fußhöhe + 1,7 m (darüber gilt als Decke/Dach)
export function surfaceAt(x: number, z: number, fy: number) {
  const g = terrainAt(x, z);
  if (!nearBase(x, z)) return g;
  ensureGrid(world.stations[0]);
  const b = GRID.get(ck(Math.floor(x / CELL), Math.floor(z / CELL))); if (!b) return g;
  const top = fy + 1.7; let best = -1e9;
  for (const t of b) { const d = hitTri(t, x, top, z, 0, -1, 0); if (d >= 0 && d < 40) best = Math.max(best, top - d); }
  return Math.max(g, best);
}
// Wand zwischen zwei Punkten (über Stufenhöhe: Niedrigeres bis 1,7 m wird erstiegen)?
export function wallBetween(ox: number, oz: number, nx: number, nz: number, fy: number) {
  if (!nearBase(nx, nz)) return false;
  ensureGrid(world.stations[0]);
  const dx = nx - ox, dz = nz - oz, L = Math.hypot(dx, dz); if (L < 1e-5) return false;
  const ux = dx / L, uz = dz / L, far = L + 0.35, seen = new Set<number>();
  for (let s2 = 0; s2 <= far + 1e-6; s2 += CELL * 0.5) {
    const b = GRID.get(ck(Math.floor((ox + ux * s2) / CELL), Math.floor((oz + uz * s2) / CELL))); if (!b) continue;
    for (const t of b) {
      if (seen.has(t)) continue; seen.add(t);
      for (const hgt of [1.8, 2.3]) { const d = hitTri(t, ox, fy + hgt, oz, ux, 0, uz); if (d >= 0 && d < far) return true; }
    }
  }
  return false;
}
export const nearDoor = (x: number, z: number) => {
  const st = world.stations[0]; if (!st || !world.surface) return null;
  const p = basePad(st); return p && Math.hypot(x - p.door.x, z - p.door.z) < 4.2 ? p : null;
};
