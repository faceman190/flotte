// Macht ein schweres GLB-Modell spieltauglich: gleiche Materialien zusammenfassen, Teile verschmelzen,
// Polygone reduzieren (Meshopt-Vereinfachung), Texturen verkleinern. Ergebnis ist ein normales GLB, das danach
// wie jedes andere über asset-src/glb/<Art>/ und „npm run assets“ ins Spiel kommt.
// Aufruf: node --max-old-space-size=8192 scripts/optimize-glb.mjs <ein.glb> <aus.glb> [Anteil=0.05] [Fehler=0.01]
//   Anteil: Ziel-Anteil der Dreiecke (0.05 = 5 %), Fehler: erlaubte Abweichung relativ zur Modellgröße
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, flatten, join, weld, simplify, resample, textureCompress, getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [, , inp, out, ratioArg, errArg] = process.argv;
if (!inp || !out) { console.log('Aufruf: node scripts/optimize-glb.mjs <ein.glb> <aus.glb> [Anteil] [Fehler]'); process.exit(1); }
const ratio = +(ratioArg || 0.05), error = +(errArg || 0.01);
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const t0 = Date.now();
const doc = await io.read(inp);
const count = () => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(), a = p.getAttribute('POSITION'); t += i ? i.getCount() / 3 : a ? a.getCount() / 3 : 0; } return Math.round(t); };
const before = count();
// Glanz-Materialien (alte Erweiterung) in normale PBR-Materialien umwandeln, damit gleiche zusammenfallen
for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_pbrSpecularGlossiness') ext.dispose();
await doc.transform(
  dedup(),                 // gleiche Materialien/Daten nur einmal
  flatten(),               // Hierarchie auflösen, damit Teile verschmelzen können
  join({ keepNamed: false }),   // Teile mit gleichem Material zu wenigen großen Meshes
  weld(),                  // doppelte Eckpunkte vereinen (Voraussetzung fürs Vereinfachen)
  simplify({ simplifier: MeshoptSimplifier, ratio, error }),
  resample(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [2048, 2048] }),
  prune(),
);
const after = count(), b = getBounds(doc.getRoot().listScenes()[0]);
await io.write(out, doc);
const mb = n => (n / 1048576).toFixed(1) + ' MB';
console.log(`Dreiecke ${before.toLocaleString('de-DE')} → ${after.toLocaleString('de-DE')} · Meshes ${doc.getRoot().listMeshes().length} · Materialien ${doc.getRoot().listMaterials().length}`);
console.log(`Datei ${mb(fs.statSync(inp).size)} → ${mb(fs.statSync(out).size)} (vor Meshopt-Kompression) · Abmessungen ${b.max.map((x, i) => (x - b.min[i]).toFixed(1)).join(' × ')} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
