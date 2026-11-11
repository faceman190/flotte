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

//   --mat=<datei.json>: Materialien aus einer FBX übertragen (scripts/fbx-materials.mjs), Zuordnung über Teilnamen
const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [inp, out, ratioArg, errArg] = args.filter(a => !a.startsWith('--'));
if (!inp || !out) { console.log('Aufruf: node scripts/optimize-glb.mjs <ein.glb> <aus.glb> [Anteil] [Fehler] [--mat=karte.json]'); process.exit(1); }
const ratio = +(ratioArg || 0.05), error = +(errArg || 0.01);
// Spieltaugliche Werte je Materialname (Farbe aus der FBX, Glanz/Metall hier festgelegt)
const LOOK = {
  main_mat: { color: [0.82, 0.83, 0.85], metal: 0.35, rough: 0.42 },
  secondary_mat: { color: [0.36, 0.37, 0.39], metal: 0.65, rough: 0.48 },
  Orange: { color: [1.0, 0.42, 0.04], metal: 0.2, rough: 0.45 },
  rubber: { color: [0.05, 0.05, 0.055], metal: 0.0, rough: 0.9 },
  Glass: { color: [0.02, 0.03, 0.04], metal: 0.6, rough: 0.06 },
  wood_mat: { color: [0.45, 0.28, 0.15], metal: 0.0, rough: 0.7 },
};
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

const t0 = Date.now();
const doc = await io.read(inp);
const count = () => { let t = 0; for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(), a = p.getAttribute('POSITION'); t += i ? i.getCount() / 3 : a ? a.getCount() / 3 : 0; } return Math.round(t); };
const before = count();
// Glanz-Materialien (alte Erweiterung) in normale PBR-Materialien umwandeln, damit gleiche zusammenfallen
for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_pbrSpecularGlossiness') ext.dispose();
// Materialien aus der FBX übertragen: Teilname in der GLB = FBX-Name plus „.Nummer“
if (opt.mat) {
  const map = JSON.parse(fs.readFileSync(opt.mat, 'utf8')), made = {};
  const matFor = name => {
    if (made[name]) return made[name];
    const src = map.materials[name] || { color: [0.5, 0.5, 0.5] }, look = LOOK[name] || { color: src.color, metal: 0.3, rough: 0.6 };
    return (made[name] = doc.createMaterial(name).setBaseColorFactor([...look.color, 1]).setMetallicFactor(look.metal).setRoughnessFactor(look.rough));
  };
  let hit = 0, miss = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    // der Name steht oft am übergeordneten Knoten, das Mesh hängt an einem namenlosen Kind
    const nm = node.getName() || node.getParentNode()?.getName() || '';
    const base = nm.replace(/\.\d+$/, ''), m = map.parts[base];
    if (m) hit++; else miss++;
    for (const p of mesh.listPrimitives()) p.setMaterial(matFor(m || 'Default_Material'));
  }
  console.log(`Materialien übertragen: ${hit} Teile zugeordnet, ${miss} ohne Zuordnung`);
}
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
