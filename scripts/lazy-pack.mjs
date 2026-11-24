// Packen einer Figur für das Paket „lazy“: Geometrie (und Animationen, falls vorhanden) mit Meshopt, Texturen WebP.
// Der Bewegungssatz der Spielerfigur ist seit dem 23.11.2026 keine GLB-Datei mehr: scripts/build-clips.mjs schreibt
// asset-src/lazy/Bewegungen.lca (eigenes kompaktes Format), die Bauskripte kopieren sie nur in die Paketliste.
// Gemeinsam genutzt von build-assets.mjs und build-manny.mjs.
//  - resample(): entfernt Schlüsselbilder, die sich linear aus ihren Nachbarn ergeben (verlustarm, Toleranz 1e-4)
//  - meshopt(): komprimiert auch die Animationsdaten (EXT_meshopt_compression)
// Einstellungen je Datei (LAZY_OPTS, Schlüssel = Dateiname ohne Endung):
//  - clipsOnly: Netz und Haut entfernen, es bleiben Skelett und Bewegungen (Bewegungssatz für Figuren mit demselben Skelett)
//  - tex:       größte Kantenlänge der Texturen (Standard 1024)
//  - level:     Meshopt-Stufe (Standard 'medium')
//  - keepTex:   Texturen unverändert lassen (schon in der Zielgröße: Körper und Ausrüstungsteile aus scripts/build-figuren.mjs)
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, resample, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

export const LAZY_OPTS = {
};
// Einstellungen zu einem Dateinamen: Skelett, Körper und Ausrüstungsteile der Spielerfiguren behalten ihre Texturen
export const lazyOpts = name => (/^(Skelett|Koerper\d|Teil_)/.test(name) ? { keepTex: true } : LAZY_OPTS[name]);

let io = null;
export async function packLazy(src, o = {}) {
  if (!io) {
    await MeshoptEncoder.ready; await MeshoptDecoder.ready;
    io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  }
  const doc = await io.readBinary(new Uint8Array(src));
  if (o.clipsOnly) {
    for (const n of doc.getRoot().listNodes()) if (n.getMesh()) { n.setMesh(null); n.setSkin(null); }
    for (const s of doc.getRoot().listSkins()) s.dispose();
    for (const m of doc.getRoot().listMeshes()) m.dispose();
  }
  const tex = o.tex || 1024;
  await doc.transform(
    dedup(), resample({ tolerance: 1e-4 }), prune(),
    ...(o.keepTex ? [] : [textureCompress({ encoder: sharp, targetFormat: 'webp', quality: o.tex ? 90 : 85, resize: [tex, tex] })]),
    meshopt({ encoder: MeshoptEncoder, level: o.level || 'medium' }),
  );
  return Buffer.from(await io.writeBinary(doc));
}
