// Starke Vereinfachung für Modelle ohne Texturen (nur Materialfarben): Normalen und Texturkoordinaten werden vorher
// entfernt, damit keine Nähte das Vereinfachen blockieren; danach werden Normalen mit Knickwinkel neu berechnet
// (harte Kanten bleiben hart). Teile mit gleichem Material werden zu einem Mesh verschmolzen.
// Außerdem werden alle Knotentransformationen fest in die Geometrie eingerechnet (Spiel-Lader misst dann genau) und das
// Modell optional um die Hochachse gedreht (--rotY=Grad), damit die Nase nach +Z zeigt.
// Mit --mat=<FBX-Karte.json> (und optional --look=<Zusatz.json>) werden vorher die Materialien gesetzt und Teile entfernt;
// so lässt sich direkt das Kaufmodell verarbeiten.
// Aufruf: node --max-old-space-size=12000 scripts/simplify-hard.mjs <ein.glb> <aus.glb> [Anteil=0.1] [Fehler=0.002] [Knick=35] [--rotY=90] [--mat=…] [--look=…]
import * as THREE from 'three';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { dedup, flatten, join, weld, simplify, prune, transformMesh } from '@gltf-transform/functions';
import { io, MeshoptSimplifier, triCount, applyFbxMaterials, dropSpecGloss } from './glb-lib.mjs';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [inp, out, ratioArg, errArg, creaseArg] = args.filter(a => !a.startsWith('--'));
const ratio = +(ratioArg || 0.1), error = +(errArg || 0.002), crease = (+(creaseArg || 35) * Math.PI) / 180;
const t0 = Date.now();
const doc = await io.read(inp);
if (opt.mat) { const r = applyFbxMaterials(doc, opt.mat, opt.look); dropSpecGloss(doc); for (const m of doc.getRoot().listMaterials()) if (!m.listParents().some(p => p.propertyType === 'Primitive')) m.dispose(); console.log(`Materialien: ${r.hit} Teile zugeordnet, ${r.miss} ohne Angabe, ${r.dropped} entfernt`); }
const before = triCount(doc);
// Texturlose Primitive: nur Positionen behalten
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
  if (p.getMaterial()?.getBaseColorTexture()) continue;
  for (const sem of p.listSemantics()) if (sem !== 'POSITION') p.setAttribute(sem, null);
}
await doc.transform(dedup(), flatten(), join({ keepNamed: false }), weld({ tolerance: 0.0001 }), simplify({ simplifier: MeshoptSimplifier, ratio, error }), prune());
const mid = triCount(doc);
// Transformationen einrechnen (und drehen), alle Knoten danach ohne eigene Lage
const rot = new THREE.Matrix4().makeRotationY(((+opt.rotY || 0) * Math.PI) / 180);
for (const node of doc.getRoot().listNodes()) {
  const mesh = node.getMesh(); if (!mesh) continue;
  const M = rot.clone().multiply(new THREE.Matrix4().fromArray(node.getWorldMatrix()));
  transformMesh(mesh, M.toArray());
}
for (const node of doc.getRoot().listNodes()) node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
// Normalen mit Knickwinkel neu berechnen
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) {
  if (p.getAttribute('NORMAL')) continue;
  const a = p.getAttribute('POSITION'), ind = p.getIndices();
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(a.getArray().slice(), 3));
  if (ind) g.setIndex(new THREE.BufferAttribute(ind.getArray().slice(), 1));
  g = toCreasedNormals(g, crease);
  g = mergeVertices(g, 1e-5);
  const pos = g.getAttribute('position').array, nor = g.getAttribute('normal').array, idx = g.getIndex().array;
  a.setArray(new Float32Array(pos));
  p.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor)).setBuffer(doc.getRoot().listBuffers()[0]));
  p.setIndices(doc.createAccessor().setType('SCALAR').setArray(pos.length / 3 > 65535 ? new Uint32Array(idx) : new Uint16Array(idx)).setBuffer(doc.getRoot().listBuffers()[0]));
}
await doc.transform(prune());
await io.write(out, doc);
console.log(`Dreiecke ${before.toLocaleString('de-DE')} → ${mid.toLocaleString('de-DE')} · Meshes ${doc.getRoot().listMeshes().length} · ${((Date.now() - t0) / 1000).toFixed(0)} s → ${out}`);
