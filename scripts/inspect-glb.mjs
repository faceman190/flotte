// Prüft ein GLB-Modell: Aufbau, Dreiecke, Texturen, Materialien, Abmessungen. Aufruf: node scripts/inspect-glb.mjs <datei.glb>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
console.log('Erweiterungen:', root.listExtensionsUsed().map(e => e.extensionName).join(', ') || '—');
console.log('Szenen:', root.listScenes().length, '· Knoten:', root.listNodes().length, '· Meshes:', root.listMeshes().length, '· Materialien:', root.listMaterials().length, '· Texturen:', root.listTextures().length, '· Animationen:', root.listAnimations().length, '· Skins:', root.listSkins().length);
let tris = 0, verts = 0;
const meshInfo = [];
for (const m of root.listMeshes()) {
  let t = 0, v = 0;
  for (const p of m.listPrimitives()) {
    const pos = p.getAttribute('POSITION'), idx = p.getIndices();
    v += pos ? pos.getCount() : 0;
    t += idx ? idx.getCount() / 3 : (pos ? pos.getCount() / 3 : 0);
  }
  tris += t; verts += v; meshInfo.push([m.getName(), Math.round(t), m.listPrimitives().length]);
}
console.log('Dreiecke gesamt:', Math.round(tris).toLocaleString('de-DE'), '· Eckpunkte:', verts.toLocaleString('de-DE'));
meshInfo.sort((a, b) => b[1] - a[1]);
console.log('Größte Meshes:', meshInfo.slice(0, 8).map(m => `${m[0] || '(ohne Name)'} ${m[1].toLocaleString('de-DE')} (${m[2]} Teile)`).join(' | '));
let texBytes = 0;
for (const t of root.listTextures()) {
  const img = t.getImage(); texBytes += img ? img.byteLength : 0;
  let dim = '?'; try { const md = await sharp(Buffer.from(img)).metadata(); dim = `${md.width}×${md.height} ${md.format}`; } catch {}
  console.log(`  Textur ${t.getName() || t.getURI() || '(ohne Name)'}: ${dim}, ${(img.byteLength / 1048576).toFixed(1)} MB`);
}
console.log('Texturen zusammen:', (texBytes / 1048576).toFixed(1), 'MB');
for (const m of root.listMaterials()) {
  const slots = ['BaseColor', 'Normal', 'MetallicRoughness', 'Occlusion', 'Emissive'].filter(s => m['get' + s + 'Texture']?.());
  console.log(`  Material ${m.getName() || '(ohne Name)'}: Farbe ${m.getBaseColorFactor().map(x => x.toFixed(2)).join('/')} · Metall ${m.getMetallicFactor().toFixed(2)} · Rauheit ${m.getRoughnessFactor().toFixed(2)} · Karten: ${slots.join(', ') || '—'}`);
}
const b = getBounds(root.listScenes()[0]);
const size = b.max.map((x, i) => x - b.min[i]);
console.log('Begrenzung min', b.min.map(x => x.toFixed(2)).join(' / '), 'max', b.max.map(x => x.toFixed(2)).join(' / '));
console.log('Abmessungen X×Y×Z:', size.map(x => x.toFixed(2)).join(' × '));
console.log('Knotennamen (erste 20):', root.listNodes().slice(0, 20).map(n => n.getName()).join(', '));
