// Längsschnitt durch ein Schiff als Bild (zur Kontrolle der Decks): senkrechte und waagerechte Strahlen in der Ebene x = konstant.
// Innenmodell hell, Außenhülle blau. Koordinaten wie im Spiel (Nase nach −Z = links).
// Aufruf: node --max-old-space-size=12000 scripts/slice-image.mjs <innen.glb> <außen.glb> <bild.png> <x> [walk.json]
import fs from 'fs';
import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';
import { getBounds } from '@gltf-transform/functions';
import sharp from 'sharp';
import { io } from './glb-lib.mjs';
const [inInner, inOuter, out, xs, walkFile] = process.argv.slice(2), X = +xs;
const outer = await io.read(inOuter), ob = getBounds(outer.getRoot().listScenes()[0]);
const c = [0, 1, 2].map(i => (ob.min[i] + ob.max[i]) / 2);
function bvhOf(doc) {
  const P = [], I = []; let vo = 0;
  for (const n of doc.getRoot().listNodes()) { const m = n.getMesh(); if (!m) continue; for (const p of m.listPrimitives()) {
    const a = p.getAttribute('POSITION').getArray(), cnt = a.length / 3, ind = p.getIndices()?.getArray();
    for (let k = 0; k < cnt; k++) P.push(-(a[k * 3] - c[0]), a[k * 3 + 1] - c[1], -(a[k * 3 + 2] - c[2]));
    if (ind) for (const i of ind) I.push(vo + i); else for (let k = 0; k < cnt; k++) I.push(vo + k);
    vo += cnt; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3)); g.setIndex(new THREE.BufferAttribute(new Uint32Array(I), 1));
  return new MeshBVH(g);
}
const B = [bvhOf(await io.read(inInner)), bvhOf(outer)], COL = [[225, 225, 215], [70, 130, 255]];
const Z0 = -48, Z1 = 48, Y0 = -13, Y1 = 13, S = 20, W = (Z1 - Z0) * S, H = (Y1 - Y0) * S, im = Buffer.alloc(W * H * 3, 14);
const px = (z, y, col) => { const u = Math.round((z - Z0) * S), v = Math.round((Y1 - y) * S); if (u < 0 || v < 0 || u >= W || v >= H) return; im.set(col, (v * W + u) * 3); };
const ray = new THREE.Ray();
B.forEach((b, bi) => {
  for (let z = Z0; z < Z1; z += 1 / S) { ray.origin.set(X, 40, z); ray.direction.set(0, -1, 0); for (const h of b.raycast(ray, THREE.DoubleSide)) px(z, h.point.y, COL[bi]); }
  for (let y = Y0; y < Y1; y += 1 / S) { ray.origin.set(X, y, -60); ray.direction.set(0, 0, 1); for (const h of b.raycast(ray, THREE.DoubleSide)) px(h.point.z, y, COL[bi]); }
});
// Laufkarte einzeichnen (grün), Einstieg rot
if (walkFile) {
  const Wk = JSON.parse(fs.readFileSync(walkFile, 'utf8')), cells = new Int32Array(Buffer.from(Wk.cells, 'base64').buffer.slice(0)), ys = new Int16Array(Buffer.from(Wk.ys, 'base64').buffer.slice(0));
  const ix = Math.floor((X - Wk.x0) / Wk.cell);
  cells.forEach((ci, i) => { if (Math.floor(ci / Wk.nz) !== ix) return; const z = Wk.z0 + (ci % Wk.nz + 0.5) * Wk.cell; for (let d = -1; d <= 1; d++) { px(z + d / S, ys[i] / 100 + 0.1, [60, 255, 90]); px(z + d / S, ys[i] / 100 + 0.2, [60, 255, 90]); } });
  for (let d = 0; d < 18; d++) px(Wk.spawn.z, Wk.spawn.y + d / S, [255, 60, 60]);
}
await sharp(im, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
console.log(out, W + '×' + H);
