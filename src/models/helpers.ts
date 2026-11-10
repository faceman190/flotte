import * as THREE from 'three';

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}
// Zylinder/Kegel entlang der Z-Achse ausrichten
export function alongZ<T extends THREE.Object3D>(m: T) { m.rotation.x = -Math.PI / 2; return m; }
export function lathe(pts: number[][], mat: THREE.Material, seg = 32) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}
export function extrude(pts: number[][], depth: number, mat: THREE.Material, bevel = 0.08) {
  const sh = new THREE.Shape();
  sh.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
  sh.closePath();
  return new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 }), mat);
}
