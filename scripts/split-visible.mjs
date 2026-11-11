// Trennt ein Modell in die von außen sichtbaren Teile (Flugmodell) und den Rest (Innenräume, verdeckte Technik).
// Von außen werden dichte Strahlenraster aus allen sechs Achsrichtungen und zufällige Strahlen geschossen; ein Teil gilt
// als sichtbar, wenn es mindestens „min“ Mal als Erstes getroffen wird. Glas blockiert (im Flugmodell ist es undurchsichtig).
// Aufruf: node --max-old-space-size=12000 scripts/split-visible.mjs <ein.glb> <außen.glb> <teile.json> [--mat=karte.json] [--cell=0.12] [--min=2]
//   teile.json: { visible: [Teilnamen], hidden: [Teilnamen] } (für das Innenmodell)
import fs from 'fs';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { prune } from '@gltf-transform/functions';
import { io, applyFbxMaterials, dropSpecGloss, partName, triCount } from './glb-lib.mjs';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [inp, outVis, outList] = args.filter(a => !a.startsWith('--'));
const CELL = +(opt.cell || 0.12), MIN = +(opt.min || 2);
// fester Zufalls-Startwert: jeder Lauf ergibt dieselben Strahlen und damit dieselbe Datei
let seed = 20261111; Math.random = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const t0 = Date.now();
const doc = await io.read(inp);
dropSpecGloss(doc);
if (opt.mat) { const r = applyFbxMaterials(doc, opt.mat); console.log(`Materialien: ${r.hit} zugeordnet, ${r.miss} ohne`); }

// alle Dreiecke in Weltkoordinaten sammeln, je Dreieck das Teil merken
const parts = [], nodes = [];
let nv = 0, nt = 0;
for (const node of doc.getRoot().listNodes()) { const m = node.getMesh(); if (!m) continue; for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'), i = p.getIndices(); nv += a.getCount(); nt += i ? i.getCount() / 3 : a.getCount() / 3; } }
const pos = new Float32Array(nv * 3), idx = new Uint32Array(nt * 3), triPart = new Int32Array(nt);
let vo = 0, to = 0;
const mtx = new THREE.Matrix4(), v = new THREE.Vector3();
for (const node of doc.getRoot().listNodes()) {
  const m = node.getMesh(); if (!m) continue;
  const pi = nodes.length; nodes.push(node); parts.push(partName(node));
  mtx.fromArray(node.getWorldMatrix());
  for (const p of m.listPrimitives()) {
    const a = p.getAttribute('POSITION'), arr = a.getArray(), n = a.getCount(), ind = p.getIndices();
    for (let k = 0; k < n; k++) { v.set(arr[k * 3], arr[k * 3 + 1], arr[k * 3 + 2]).applyMatrix4(mtx); pos[(vo + k) * 3] = v.x; pos[(vo + k) * 3 + 1] = v.y; pos[(vo + k) * 3 + 2] = v.z; }
    const ia = ind ? ind.getArray() : null, tc = ind ? ind.getCount() / 3 : n / 3;
    for (let k = 0; k < tc; k++) { for (let j = 0; j < 3; j++) idx[(to + k) * 3 + j] = vo + (ia ? ia[k * 3 + j] : k * 3 + j); triPart[to + k] = pi; }
    vo += n; to += tc;
  }
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1));
const bvh = new MeshBVH(geo);
geo.computeBoundingBox();
const box = geo.boundingBox, size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
console.log(`${parts.length} Teile, ${nt.toLocaleString('de-DE')} Dreiecke, Größe ${size.toArray().map(x => x.toFixed(1)).join(' × ')} · BVH ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// Strahlen schießen
const hits = new Uint32Array(parts.length), ray = new THREE.Ray();
let rays = 0;
const shoot = (o, d) => { ray.origin.copy(o); ray.direction.copy(d); const h = bvh.raycastFirst(ray, THREE.DoubleSide); rays++; if (h) hits[triPart[h.faceIndex]]++; };
const M = 1.0, o = new THREE.Vector3(), d = new THREE.Vector3();
for (const ax of [0, 1, 2]) for (const s of [-1, 1]) {
  const u = (ax + 1) % 3, w = (ax + 2) % 3;
  const nu = Math.ceil((size.getComponent(u) + 2 * M) / CELL), nw = Math.ceil((size.getComponent(w) + 2 * M) / CELL);
  d.set(0, 0, 0).setComponent(ax, -s);
  for (let i = 0; i < nu; i++) for (let j = 0; j < nw; j++) {
    o.copy(c).setComponent(ax, c.getComponent(ax) + s * (size.getComponent(ax) / 2 + 5));
    o.setComponent(u, box.min.getComponent(u) - M + (i + 0.5) * CELL); o.setComponent(w, box.min.getComponent(w) - M + (j + 0.5) * CELL);
    shoot(o, d);
  }
}
// Zufallsstrahlen von einer Kugel um das Modell auf zufällige Punkte im Modell (erreicht Schrägen und Nischen)
const R = size.length() * 0.75, nRand = +(opt.rand || 600000);
for (let k = 0; k < nRand; k++) {
  o.randomDirection().multiplyScalar(R).add(c);
  const tgt = new THREE.Vector3(box.min.x + Math.random() * size.x, box.min.y + Math.random() * size.y, box.min.z + Math.random() * size.z);
  d.subVectors(tgt, o).normalize();
  shoot(o, d);
}
const visible = [], hidden = [];
let visTri = 0, hidTri = 0;
const triOf = new Uint32Array(parts.length); for (let k = 0; k < nt; k++) triOf[triPart[k]]++;
nodes.forEach((n, i) => { if (hits[i] >= MIN) { visible.push(parts[i]); visTri += triOf[i]; } else { hidden.push(parts[i]); hidTri += triOf[i]; n.setMesh(null); } });
console.log(`${rays.toLocaleString('de-DE')} Strahlen · sichtbar ${visible.length} Teile (${visTri.toLocaleString('de-DE')} Dreiecke) · verdeckt ${hidden.length} Teile (${hidTri.toLocaleString('de-DE')} Dreiecke) · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await doc.transform(prune());
await io.write(outVis, doc);
fs.writeFileSync(outList, JSON.stringify({ visible, hidden }));
console.log(`Außenmodell: ${triCount(doc).toLocaleString('de-DE')} Dreiecke → ${outVis}`);
