// Misst im Inneren eines Modells Böden und Raumhöhen (für den Maßstab des begehbaren Innenraums).
// Senkrechte Strahlen von oben; jede nach oben zeigende Fläche ist ein möglicher Boden, die nächste darüber liegende
// nach unten zeigende Fläche die Decke. Ausgabe: Häufigkeit der Raumhöhen und der Bodenhöhen.
// Aufruf: node --max-old-space-size=12000 scripts/measure-decks.mjs <ein.glb> [Raster=0.5]
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { io } from './glb-lib.mjs';

const [inp, cellArg] = process.argv.slice(2, 4), CELL = +(cellArg || 0.5);
const doc = await io.read(inp);
let nv = 0, nt = 0;
for (const node of doc.getRoot().listNodes()) { const m = node.getMesh(); if (!m) continue; for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'), i = p.getIndices(); nv += a.getCount(); nt += i ? i.getCount() / 3 : a.getCount() / 3; } }
const pos = new Float32Array(nv * 3), idx = new Uint32Array(nt * 3);
let vo = 0, to = 0; const mtx = new THREE.Matrix4(), v = new THREE.Vector3();
for (const node of doc.getRoot().listNodes()) {
  const m = node.getMesh(); if (!m) continue; mtx.fromArray(node.getWorldMatrix());
  for (const p of m.listPrimitives()) {
    const a = p.getAttribute('POSITION'), arr = a.getArray(), n = a.getCount(), ind = p.getIndices(), ia = ind ? ind.getArray() : null, tc = ind ? ind.getCount() / 3 : n / 3;
    for (let k = 0; k < n; k++) { v.set(arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2]).applyMatrix4(mtx); pos.set([v.x, v.y, v.z], (vo + k) * 3); }
    for (let k = 0; k < tc * 3; k++) idx[to * 3 + k] = vo + (ia ? ia[k] : k);
    vo += n; to += tc;
  }
}
const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
const bvh = new MeshBVH(geo); geo.computeBoundingBox();
const box = geo.boundingBox, size = box.getSize(new THREE.Vector3());
const heights = {}, floors = {}, ray = new THREE.Ray(new THREE.Vector3(), new THREE.Vector3(0, -1, 0)), tri = new THREE.Triangle(), nrm = new THREE.Vector3();
let cols = 0;
const RX = process.argv[4] ? process.argv[4].split(",").map(Number) : null;   // optional: Bereich x0,x1,z0,z1
for (let x = box.min.x; x < box.max.x; x += CELL) for (let z = box.min.z; z < box.max.z; z += CELL) {
  if (RX && (x < RX[0] || x > RX[1] || z < RX[2] || z > RX[3])) continue;
  ray.origin.set(x, box.max.y + 1, z);
  const hits = bvh.raycast(ray, THREE.DoubleSide).sort((a, b) => a.distance - b.distance);
  if (hits.length < 3) continue; cols++;
  const ys = hits.map(h => { const f = h.face.a, i3 = [h.face.a, h.face.b, h.face.c].map(k => new THREE.Vector3(pos[k * 3], pos[k * 3 + 1], pos[k * 3 + 2])); tri.set(...i3); tri.getNormal(nrm); return { y: h.point.y, up: nrm.y }; });
  // Boden = Fläche, über der bis zur nächsten Fläche mindestens 1,2 Einheiten Luft sind
  for (let k = 1; k < ys.length; k++) {
    const gap = ys[k - 1].y - ys[k].y;
    if (gap > 1.2 && gap < 8 && Math.abs(ys[k].up) > 0.9) { const g = Math.round(gap * 4) / 4; heights[g] = (heights[g] || 0) + 1; const fy = Math.round(ys[k].y * 2) / 2; floors[fy] = (floors[fy] || 0) + 1; }
  }
}
const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, c]) => `${k} (${c})`).join(' · ');
console.log(`Größe ${size.toArray().map(x => x.toFixed(1)).join(' × ')} · ${cols} Spalten mit Innenleben`);
console.log('häufigste Raumhöhen (Boden→Decke):', top(heights, 10));
console.log('häufigste Bodenhöhen (y):', top(floors, 10));
