// Felsmodell (OBJ mit Texturkoordinaten) in eine GLB-Datei wandeln: Positionen und Texturkoordinaten, Dreiecke einzeln.
// Die Bilder (Farbe, Relief) laufen getrennt über asset-src/tex/ ins Spiel. Glatte Normalen berechnet das Spiel beim Laden.
// Aufruf: node scripts/rock-to-glb.mjs <fels.obj> asset-src/glb/deco/Rock.glb
import fs from 'fs';
import { Document } from '@gltf-transform/core';
import { io } from './glb-lib.mjs';
const [, , inp, out] = process.argv;
const V = [], T = [], pos = [], uv = [];
for (const line of fs.readFileSync(inp, 'utf8').split('\n')) {
  const a = line.trim().split(/\s+/);
  if (a[0] === 'v') V.push([+a[1], +a[2], +a[3]]);
  else if (a[0] === 'vt') T.push([+a[1], +a[2]]);
  else if (a[0] === 'f') {
    const c = a.slice(1).map(t => t.split('/').map(n => parseInt(n, 10) - 1));
    for (let k = 1; k + 1 < c.length; k++) for (const q of [c[0], c[k], c[k + 1]]) { pos.push(...V[q[0]]); const t = T[q[1]] || [0, 0]; uv.push(t[0], 1 - t[1]); }
  }
}
const doc = new Document(), buf = doc.createBuffer();
const prim = doc.createPrimitive()
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos)).setBuffer(buf))
  .setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv)).setBuffer(buf))
  .setMaterial(doc.createMaterial('rock'));
doc.createScene('Scene').addChild(doc.createNode('Rock').setMesh(doc.createMesh('Rock').addPrimitive(prim)));
fs.mkdirSync(out.replace(/[\\/][^\\/]*$/, ''), { recursive: true });
await io.write(out, doc);
console.log(`${pos.length / 9} Dreiecke → ${out}`);
