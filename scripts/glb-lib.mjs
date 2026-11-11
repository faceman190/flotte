// Gemeinsame Hilfen für die Modell-Werkzeuge (optimize-glb, split-visible)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';

await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
export { MeshoptSimplifier };
export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

// Spieltaugliche Werte je Materialname (Farbe aus der FBX, Glanz/Metall hier festgelegt)
export const LOOK = {
  main_mat: { color: [0.62, 0.63, 0.65], metal: 0.3, rough: 0.55 },     // gedämpftes Weiß (sonst überstrahlt die Sonne)
  secondary_mat: { color: [0.3, 0.31, 0.33], metal: 0.6, rough: 0.52 },
  Orange: { color: [1.0, 0.42, 0.04], metal: 0.2, rough: 0.45 },
  rubber: { color: [0.05, 0.05, 0.055], metal: 0.0, rough: 0.9 },
  Glass: { color: [0.02, 0.03, 0.04], metal: 0.6, rough: 0.06 },
  wood_mat: { color: [0.45, 0.28, 0.15], metal: 0.0, rough: 0.7 },
};
// Name eines Teils: steht oft am übergeordneten Knoten, das Mesh hängt an einem namenlosen Kind; „.Nummer“ entfernen
export const partName = node => (node.getName() || node.getParentNode()?.getName() || '').replace(/\.\d+$/, '');

// Materialien aus einer FBX-Karte (scripts/fbx-materials.mjs) übertragen
export function applyFbxMaterials(doc, mapFile) {
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8')), made = {};
  const matFor = name => {
    if (made[name]) return made[name];
    const src = map.materials[name] || { color: [0.5, 0.5, 0.5] }, look = LOOK[name] || { color: src.color, metal: 0.3, rough: 0.6 };
    // beidseitig wie im Original: viele Rumpfplatten zeigen mit der Rückseite nach außen
    return (made[name] = doc.createMaterial(name).setBaseColorFactor([...look.color, 1]).setMetallicFactor(look.metal).setRoughnessFactor(look.rough).setDoubleSided(true));
  };
  let hit = 0, miss = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const m = map.parts[partName(node)];
    if (m) hit++; else miss++;
    for (const p of mesh.listPrimitives()) p.setMaterial(matFor(m || 'Default_Material'));
  }
  return { hit, miss };
}
export function dropSpecGloss(doc) { for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_pbrSpecularGlossiness') ext.dispose(); }
export function triCount(doc) {
  let t = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(), a = p.getAttribute('POSITION'); t += i ? i.getCount() / 3 : a ? a.getCount() / 3 : 0; }
  return Math.round(t);
}
