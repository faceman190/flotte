import * as THREE from 'three';

// =====================================================================================
// Lage eines gelandeten Schiffs (seit 2026-11-26 mit Neigung): Mitte, Kurs (yaw) und Neigung nach vorn/hinten (pitch, Nase hoch > 0)
// und zur Seite (roll). Drehfolge wie bei den Schiffsmodellen: Euler 'YXZ' (pitch, yaw, roll). Schiffskoordinaten: Nase −Z, oben +Y.
// Ohne pitch/roll gilt die alte, waagerechte Rechnung (x + lx·cos + lz·sin, z − lx·sin + lz·cos).
// =====================================================================================
export interface Lage { x: number; y: number; z: number; yaw: number; pitch?: number; roll?: number }
const _m = new THREE.Matrix4(), _i = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _p = new THREE.Vector3(), _w = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
export const gekippt = (s: Lage) => !!(s.pitch || s.roll);
export function lageMatrix(s: Lage, out = new THREE.Matrix4()) { return out.compose(_p.set(s.x, s.y, s.z), _q.setFromEuler(_e.set(s.pitch || 0, s.yaw, s.roll || 0, 'YXZ')), _one); }
export function lageQuat(s: Lage, out = new THREE.Quaternion()) { return out.setFromEuler(_e.set(s.pitch || 0, s.yaw, s.roll || 0, 'YXZ')); }
/** Schiffspunkt → Welt */
export function zuWelt(lx: number, ly: number, lz: number, s: Lage, out = new THREE.Vector3()) { lageMatrix(s, _m); return out.set(lx, ly, lz).applyMatrix4(_m); }
/** Weltpunkt → Schiff */
export function zuLokal(x: number, y: number, z: number, s: Lage, out = new THREE.Vector3()) { lageMatrix(s, _m); _i.copy(_m).invert(); return out.set(x, y, z).applyMatrix4(_i); }
/** Weltpunkt (x, z), senkrecht auf eine Ebene des Schiffs (Höhe ly in Schiffskoordinaten) gelotet → Schiffskoordinaten */
export function lokalAufEbene(x: number, z: number, s: Lage, ly: number, out = new THREE.Vector3()) {
  if (!gekippt(s)) { const c = Math.cos(s.yaw), n = Math.sin(s.yaw), dx = x - s.x, dz = z - s.z; return out.set(dx * c - dz * n, ly, dx * n + dz * c); }
  let y = s.y + ly;
  for (let k = 0; k < 4; k++) { zuLokal(x, y, z, s, out); zuWelt(out.x, ly, out.z, s, _w); y = _w.y; }
  zuLokal(x, y, z, s, out); out.y = ly;
  return out;
}
