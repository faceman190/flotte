// Gemeinsame Hilfen für die Modell-Werkzeuge (optimize-glb, split-visible)
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import fs from 'fs';

await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
export { MeshoptSimplifier };
export const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });

// Spieltaugliche Werte je Materialname. Die FBX kennt nur sieben einfarbige Platzhalter (ohne Texturen); die Werte hier
// sind den Verkaufsbildern des Modells nachempfunden: dunkle Tragflächen und Rückgrat, silberner Rumpf, orange Leuchtakzente, getöntes Glas.
export const LOOK = {
  main_mat: { color: [0.17, 0.18, 0.2], metal: 0.75, rough: 0.45 },          // Rumpfschalen, Tragflächen, Rückgrat: dunkles Geschützmetall
  secondary_mat: { color: [0.34, 0.355, 0.38], metal: 0.65, rough: 0.5 },   // Technik, Verkleidungen, Innenwände: gebürstetes Silber (gedämpft, sonst überstrahlt die Sonne)
  Orange: { color: [1.0, 0.36, 0.03], metal: 0.1, rough: 0.5, emissive: [0.55, 0.16, 0.01] },
  rubber: { color: [0.03, 0.03, 0.035], metal: 0.0, rough: 0.85 },
  Glass: { color: [0.05, 0.08, 0.11], metal: 0.1, rough: 0.05, alpha: 0.32 },
  wood_mat: { color: [0.5, 0.3, 0.15], metal: 0.0, rough: 0.6 },
  Default_Material: { color: [0.3, 0.31, 0.33], metal: 0.5, rough: 0.5 },
  // Innenraum: Materialien nach Teilnamen (asset-src/glb/ship/<Modell>.look.json)
  fabric_dark: { color: [0.055, 0.06, 0.08], metal: 0.0, rough: 0.85 },       // Sofa
  fabric_light: { color: [0.78, 0.72, 0.62], metal: 0.0, rough: 0.9 },        // Kissen
  leather: { color: [0.1, 0.075, 0.06], metal: 0.0, rough: 0.5 },             // Sitze
  ceramic: { color: [0.08, 0.42, 0.46], metal: 0.0, rough: 0.25 },            // Vase
  paint_white: { color: [0.8, 0.81, 0.82], metal: 0.1, rough: 0.4 },
  paint_blue: { color: [0.07, 0.24, 0.55], metal: 0.3, rough: 0.45 },         // Sauerstofftanks
  paint_olive: { color: [0.2, 0.24, 0.11], metal: 0.3, rough: 0.55 },         // Munition
  brass: { color: [0.78, 0.56, 0.24], metal: 0.9, rough: 0.32 },              // Gitterwände
  copper: { color: [0.75, 0.38, 0.2], metal: 0.9, rough: 0.35 },              // Rohre
  floor_dark: { color: [0.085, 0.09, 0.1], metal: 0.6, rough: 0.42 },         // Böden, Gitterroste
  gunmetal: { color: [0.035, 0.035, 0.04], metal: 0.7, rough: 0.4 },          // Waffen
  light_warm: { color: [1, 0.95, 0.85], metal: 0.0, rough: 0.6, emissive: [1, 0.9, 0.7] },
  screen: { color: [0.05, 0.3, 0.4], metal: 0.0, rough: 0.3, emissive: [0.1, 0.65, 0.85] },
};
// Werte auf ein Material übertragen
export function applyLook(mat, look) {
  mat.setBaseColorFactor([...look.color, look.alpha ?? 1]).setMetallicFactor(look.metal).setRoughnessFactor(look.rough)
    .setEmissiveFactor(look.emissive || [0, 0, 0]).setAlphaMode(look.alpha !== undefined ? 'BLEND' : 'OPAQUE').setDoubleSided(true);
  return mat;
}
// Name eines Teils: steht oft am übergeordneten Knoten, das Mesh hängt an einem namenlosen Kind; „.Nummer“ entfernen
export const partName = node => (node.getName() || node.getParentNode()?.getName() || '').replace(/\.\d+$/, '');

// Materialien aus einer FBX-Karte (scripts/fbx-materials.mjs) übertragen; lookFile (optional): Teile entfernen und Materialien nach Teilnamen
export function applyFbxMaterials(doc, mapFile, lookFile) {
  const map = JSON.parse(fs.readFileSync(mapFile, 'utf8')), made = {};
  const extra = lookFile ? JSON.parse(fs.readFileSync(lookFile, 'utf8')) : { drop: [], parts: [] };
  const drop = new Set(extra.drop || []), rules = (extra.parts || []).map(([re, m]) => [new RegExp(re), m]);
  let dropped = 0;
  const matFor = name => {
    if (made[name]) return made[name];
    const src = map.materials[name] || { color: [0.5, 0.5, 0.5] }, look = LOOK[name] || { color: src.color, metal: 0.3, rough: 0.6 };
    // beidseitig wie im Original: viele Rumpfplatten zeigen mit der Rückseite nach außen
    return (made[name] = applyLook(doc.createMaterial(name), look));
  };
  let hit = 0, miss = 0;
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const name = partName(node);
    if (drop.has(name)) { node.setMesh(null); dropped++; continue; }
    const m = (rules.find(([re]) => re.test(name)) || [])[1] || map.parts[name];
    if (m) hit++; else miss++;
    for (const p of mesh.listPrimitives()) p.setMaterial(matFor(m || 'Default_Material'));
  }
  return { hit, miss, dropped };
}
export function dropSpecGloss(doc) { for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_pbrSpecularGlossiness') ext.dispose(); }
export function triCount(doc) {
  let t = 0;
  for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const i = p.getIndices(), a = p.getAttribute('POSITION'); t += i ? i.getCount() / 3 : a ? a.getCount() / 3 : 0; }
  return Math.round(t);
}
