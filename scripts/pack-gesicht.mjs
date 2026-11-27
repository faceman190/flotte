import fs from 'fs'; import path from 'path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const [src, out] = process.argv.slice(2);
for (const f of fs.readdirSync(src).filter(f => f.endsWith('.glb'))) {
  const doc = await io.read(path.join(src, f));
  const info = doc.getRoot().listMeshes().map(m => m.getName() + ':' + m.listPrimitives().map(p => p.listTargets().length).join('/'));
  await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 88, resize: [2048, 2048] }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await io.write(path.join(out, f), doc);
  console.log(f, (fs.statSync(path.join(src, f)).size / 1e6).toFixed(1), '->', (fs.statSync(path.join(out, f)).size / 1e6).toFixed(1), 'MB', info.join(' '));
}
