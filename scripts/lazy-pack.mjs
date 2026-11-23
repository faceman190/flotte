// Packen einer Figur mit vielen Animationen (Paket „lazy“, z. B. Manny): Geometrie und Animationen mit Meshopt, Texturen WebP.
// Gemeinsam genutzt von build-assets.mjs und build-manny.mjs.
//  - resample(): entfernt Schlüsselbilder, die sich linear aus ihren Nachbarn ergeben (verlustarm, Toleranz 1e-4)
//  - meshopt(): komprimiert auch die Animationsdaten (EXT_meshopt_compression)
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

let io = null;
export async function packLazy(src) {
  if (!io) {
    await MeshoptEncoder.ready; await MeshoptDecoder.ready;
    io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  }
  const doc = await io.readBinary(new Uint8Array(src));
  await doc.transform(
    dedup(), resample({ tolerance: 1e-4 }), prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  return Buffer.from(await io.writeBinary(doc));
}
