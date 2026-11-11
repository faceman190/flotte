// OBJ-Datei in eine GLB-Datei mit benannten Teilen wandeln (nur Geometrie; Materialien setzt danach simplify-hard --mat/--look).
// Vielecke werden in Dreiecke zerlegt. Der Teilname ist das erste Wort der g-Zeile (Maya-Export).
// Aufruf: node scripts/obj-to-glb.mjs <ein.obj> <aus.glb>
import fs from 'fs';
import { Document } from '@gltf-transform/core';
import { io } from './glb-lib.mjs';
const [, , inp, out] = process.argv;
const V = [], parts = new Map(); let cur = null;
for (const line of fs.readFileSync(inp, 'utf8').split('\n')) {
  if (line.startsWith('v ')) { const a = line.split(/\s+/); V.push(+a[1], +a[2], +a[3]); }
  else if (line.startsWith('g ') || line.startsWith('o ')) { const n = line.trim().split(/\s+/)[1]; cur = n === 'default' ? null : (parts.get(n) || parts.set(n, []).get(n)); }
  else if (line.startsWith('f ') && cur) {
    const ix = line.trim().split(/\s+/).slice(1).map(t => { const i = parseInt(t, 10); return i < 0 ? V.length / 3 + i : i - 1; });
    for (let k = 1; k + 1 < ix.length; k++) cur.push(ix[0], ix[k], ix[k + 1]);
  }
}
const doc = new Document(), buf = doc.createBuffer(), scene = doc.createScene('Scene'), mat = doc.createMaterial('Default_Material');
let tris = 0;
for (const [name, idx] of parts) {
  if (!idx.length) continue;
  const remap = new Map(), pos = [], ind = new Uint32Array(idx.length);
  idx.forEach((v, i) => { let n = remap.get(v); if (n === undefined) { n = pos.length / 3; remap.set(v, n); pos.push(V[v * 3], V[v * 3 + 1], V[v * 3 + 2]); } ind[i] = n; });
  const prim = doc.createPrimitive().setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf)).setIndices(doc.createAccessor().setType('SCALAR').setArray(ind).setBuffer(buf)).setMaterial(mat);
  scene.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(prim)));
  tris += idx.length / 3;
}
await io.write(out, doc);
console.log(`${parts.size} Teile · ${tris.toLocaleString('de-DE')} Dreiecke → ${out}`);
