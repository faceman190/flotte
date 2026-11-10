import * as THREE from 'three';
import { glowMat } from '../core/engine';
import { texMat, boxUV, buildEmissive } from '../core/textures';
import { mesh, alongZ, extrude } from './helpers';

// Ferrox: schwarzes, kantiges Metall mit leuchtend violetten Adern
export const FX = {
  chrome: texMat(0xffffff, 'ferrox', { metalness: 0.85, roughness: 0.25, emissive: 0x000000 }),
  dark: texMat(0x8a8a90, 'ferrox', { metalness: 0.9, roughness: 0.3, emissive: 0x000000 }),
  vio: new THREE.MeshBasicMaterial({ color: 0xb070ff }),
};
buildEmissive('ferrox', [FX.chrome, FX.dark]);

function buildDrone() {
  const g = new THREE.Group(), b = new THREE.Group();
  b.rotation.y = Math.PI; g.add(b);
  const body = alongZ(mesh(new THREE.ConeGeometry(1.7, 10, 4), FX.chrome, 0, 0, -0.5)); body.rotation.y = Math.PI / 4; b.add(body);
  for (const s of [-1, 1]) {
    const w = extrude([[s * 0.8, 1], [s * 7.5, -2.5], [s * 8.2, 1.2], [s * 1.2, 3.2]], 0.22, FX.chrome, 0.06); w.rotation.x = Math.PI / 2; b.add(w);
    const sp = mesh(new THREE.ConeGeometry(0.3, 3, 4), FX.dark, s * 7.9, 0, -1.5); sp.rotation.x = -Math.PI / 2; b.add(sp);
  }
  b.add(mesh(new THREE.BoxGeometry(2.6, 0.35, 0.4), FX.vio, 0, 0.55, -2.6));
  const eye = new THREE.Sprite(glowMat(0xb070ff, 0.9)); eye.position.set(0, 0.6, -2.8); eye.scale.setScalar(3.4); b.add(eye);
  const en = new THREE.Sprite(glowMat(0x9050ff, 0.9)); en.position.set(0, 0, 4.8); en.scale.setScalar(4); b.add(en);
  return g;
}
function buildBomber() {
  const g = new THREE.Group(), b = new THREE.Group();
  b.rotation.y = Math.PI; g.add(b);
  b.add(mesh(new THREE.BoxGeometry(7, 4, 16), FX.chrome, 0, 0, 1));
  const nose = alongZ(mesh(new THREE.ConeGeometry(3.6, 9, 4), FX.chrome, 0, 0, -11.5)); nose.rotation.y = Math.PI / 4; b.add(nose);
  for (const s of [-1, 1]) {
    b.add(alongZ(mesh(new THREE.CylinderGeometry(1.8, 1.8, 12, 6), FX.dark, s * 6, -0.5, 3)));
    const w = extrude([[s * 3, -4], [s * 13, 4], [s * 13, 7], [s * 3, 7]], 0.4, FX.chrome, 0.1); w.rotation.x = Math.PI / 2; b.add(w);
    const en = new THREE.Sprite(glowMat(0x9050ff, 0.9)); en.position.set(s * 6, -0.5, 9.6); en.scale.setScalar(6); b.add(en);
  }
  b.add(mesh(new THREE.BoxGeometry(5, 0.5, 0.5), FX.vio, 0, 1.2, -6.8));
  const eye = new THREE.Sprite(glowMat(0xb070ff, 0.9)); eye.position.set(0, 1.2, -7); eye.scale.setScalar(5); b.add(eye);
  return g;
}
// Ferrox-Bienenstock (Mutterschiff): setzt laufend Jäger aus
export function buildMother() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(55, 0), FX.chrome));
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(11, 80, 5), FX.dark);
    c.position.set(d[0] * 70, d[1] * 70, d[2] * 70);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]));
    g.add(c);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(95, 5, 4, 10), FX.dark); ring.rotation.x = Math.PI / 2; g.add(ring);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, sp = new THREE.Sprite(glowMat(0xb070ff, 1)); sp.position.set(Math.cos(a) * 95, 0, Math.sin(a) * 95); sp.scale.setScalar(16); ring.add(sp); }
  const core = new THREE.Sprite(glowMat(0x8040ff, 0.45)); core.scale.setScalar(260); g.add(core);
  boxUV(g, 1 / 60);
  g.userData.ring = ring;
  return g;
}
export const DRONE_T = buildDrone();
export const BOMBER_T = buildBomber();
boxUV(DRONE_T, 1 / 7);
boxUV(BOMBER_T, 1 / 11);
