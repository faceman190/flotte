import * as THREE from 'three';
import { glowMat } from '../core/engine';
import { decoLaden, decoVorlage, prep } from './bojen';

// =====================================================================================
// Bergbaurover „Dachs“ R-4 (seit 2026-11-24): Modell aus Blender (asset-src/neu/rover: rv_bau.py, rv_export.py → deco/Rover, Hintergrund-Paket).
// Netze heißen <Teil>__<Gruppe>: Aufbau (starr), Rad_VL … Rad_HR, Bohrer. Hier bekommt jedes Rad einen eigenen Drehpunkt in der Nabe
// (aufgehängt: federt, die Vorderräder lenken; darin dreht sich das Rad), der Bohrer dreht um seine Achse (Fahrtrichtung, −z).
// Spielachsen: x rechts, y oben, −z vorn; Ursprung am Boden unter der Fahrzeugmitte.
// =====================================================================================

export interface RoverRad { mount: THREE.Object3D; spin: THREE.Object3D; rest: THREE.Vector3; front: boolean; side: number }
export interface RoverNeu {
  g: THREE.Group; body: THREE.Group; wheels: THREE.Object3D[]; drill: THREE.Object3D; beacon: THREE.Sprite; head: { intensity: number };
  rads: RoverRad[]; neu: true;
}
export const roverBereit = () => !!decoVorlage('Rover');
export const roverLaden = () => decoLaden('Rover');
export const RAD_R = 0.75;

export function buildRoverNeu(): RoverNeu | null {
  const t = decoVorlage('Rover'); if (!t || !t.children[0]) return null;
  const inner = t.children[0]; t.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(inner.matrixWorld).invert();
  const parts: Record<string, { geo: THREE.BufferGeometry; mat: THREE.Material }[]> = {};
  inner.traverse((o: any) => {
    if (!o.isMesh) return;
    const nm = String(o.name.includes('__') ? o.name : o.parent?.name || o.name), teil = nm.split('__')[0] || 'Aufbau';
    const geo = o.geometry.clone();
    // gepackte Eckpunkte (meshopt) als Float32, damit sich die Lage einrechnen lässt
    for (const [k, a] of Object.entries(geo.attributes)) { const src = a as THREE.BufferAttribute, arr = new Float32Array(src.count * src.itemSize); for (let i = 0; i < src.count; i++) for (let c = 0; c < src.itemSize; c++) arr[i * src.itemSize + c] = src.getComponent(i, c); geo.setAttribute(k, new THREE.BufferAttribute(arr, src.itemSize)); }
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    (parts[teil] ||= []).push({ geo, mat: prep(o.material) });
  });
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  for (const p of parts.Aufbau || []) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = true; body.add(m); }
  // Räder: Drehpunkt in der Mitte ihres Umrisses
  const rads: RoverRad[] = [];
  for (const nm of ['Rad_VL', 'Rad_VR', 'Rad_ML', 'Rad_MR', 'Rad_HL', 'Rad_HR']) {
    const ps = parts[nm]; if (!ps) continue;
    const box = new THREE.Box3(); for (const p of ps) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox!); }
    const c = box.getCenter(new THREE.Vector3()), mount = new THREE.Group(), spin = new THREE.Group();
    mount.position.copy(c); mount.add(spin); body.add(mount);
    for (const p of ps) { p.geo.translate(-c.x, -c.y, -c.z); const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = true; spin.add(m); }
    rads.push({ mount, spin, rest: c.clone(), front: nm.startsWith('Rad_V'), side: nm.endsWith('L') ? -1 : 1 });
  }
  // Bohrer: dreht um seine Längsachse
  const drill = new THREE.Group();
  if (parts.Bohrer) {
    const box = new THREE.Box3(); for (const p of parts.Bohrer) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox!); }
    const c = box.getCenter(new THREE.Vector3()); drill.position.copy(c);
    for (const p of parts.Bohrer) { p.geo.translate(-c.x, -c.y, -c.z); drill.add(new THREE.Mesh(p.geo, p.mat)); }
  }
  body.add(drill);
  // Leuchtpunkte: Lichtleiste, Frontscheinwerfer, Rundumleuchte, Rückleuchten (Lage aus rv-anker.json, Blender (x, y, z) → (x, z, −y))
  for (const [x, y, z, s] of [[-0.75, 3.2, -2.7, 0.9], [-0.25, 3.2, -2.7, 0.9], [0.25, 3.2, -2.7, 0.9], [0.75, 3.2, -2.7, 0.9], [-0.85, 1.42, -3.12, 1.4], [0.85, 1.42, -3.12, 1.4]]) {
    const l = new THREE.Sprite(glowMat(0xfff0d0, 0.85)); l.position.set(x, y, z); l.scale.setScalar(s); body.add(l);
  }
  for (const sx of [-1, 1]) { const l = new THREE.Sprite(glowMat(0xff2a18, 0.8)); l.position.set(sx * 1.05, 1.05, 3.25); l.scale.setScalar(0.7); body.add(l); }
  const beacon = new THREE.Sprite(glowMat(0xffa030, 1)); beacon.position.set(-0.6, 3.3, -1.0); beacon.scale.setScalar(1.3); body.add(beacon);
  return { g, body, wheels: rads.map(r => r.spin), drill, beacon, head: { intensity: 0 }, rads, neu: true };
}
