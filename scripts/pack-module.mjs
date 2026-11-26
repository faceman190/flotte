// Schiffsmodule (asset-src/neu/module/Module_roh.glb aus mod_export.py) für das Paket „lazy“ vorbereiten: gleiche Punkte verschweißen,
// doppelte Daten entfernen, mit Meshopt komprimieren. Ergebnis asset-src/glb/lazy/Schiffsmodule.glb (danach „npm run assets“).
// Aufruf: node scripts/pack-module.mjs
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const src = 'asset-src/neu/module/Module_roh.glb', out = 'asset-src/glb/lazy/Schiffsmodule.glb';
const doc = await io.read(src);
await doc.transform(weld(), dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(out, doc);
const names = doc.getRoot().listNodes().filter(n => n.getMesh()).map(n => n.getName());
console.log(`${names.length} Module · ${(fs.statSync(src).size / 1e6).toFixed(1)} MB → ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`);
