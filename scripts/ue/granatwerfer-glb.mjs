// =====================================================================================
// Granatwerfer aus Epics ShooterGame (seit 27.11.2026, docs/kampfklaenge-granatwerfer.md) für das Spiel vorbereiten:
//   node scripts/ue/granatwerfer-glb.mjs <WebExport\shooter\meshes\Weapon_Launcher.glb>  →  asset-src/glb/lazy/Granatwerfer.glb
// Danach packt build-assets.mjs (bzw. die Paketliste von Hand) die Datei als lazy/Granatwerfer.
//  - Haut und Knochen entfernt: Das Modell hat nur einen Knochen (LauncherRoot) und keine eigenen Bewegungen
//  - Achsen wie die Lyra-Waffen (lyraGuns.ts): x = Lauf, y = links, z = oben; Nullpunkt am Griff (wie in ShooterGame)
//    Im Export ist der Lauf +z, oben +y, links +x  →  neu = (z, x, y)
//  - Specular-Bilder entfernt (three.js braucht sie nicht), Texturen WebP höchstens 1024 px
// Mündung (ShooterGame MuzzleFlashSocket, Knoten LauncherRoot: 0 / −15,06 / 72,92 cm) im neuen Rahmen: (0,729, 0, 0,151)
// =====================================================================================
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, getBounds } from '@gltf-transform/functions';

const src = process.argv[2];
if (!src) { console.error('Aufruf: node scripts/ue/granatwerfer-glb.mjs <Weapon_Launcher.glb>'); process.exit(1); }
const out = path.resolve('asset-src/glb/lazy/Granatwerfer.glb');
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const doc = await io.read(src), root = doc.getRoot(), scene = root.getDefaultScene() || root.listScenes()[0];

// Ecken der Ruhehaltung sind schon in Modellkoordinaten (ein Knochen, Bindung = Ruhe): Haut weg, Lage drehen
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  for (const a of ['JOINTS_0', 'WEIGHTS_0']) { const x = p.getAttribute(a); if (x) p.setAttribute(a, null); }
  for (const [a, w] of [['POSITION', 3], ['NORMAL', 3], ['TANGENT', 4]]) {
    const acc = p.getAttribute(a); if (!acc) continue;
    const arr = acc.getArray().slice();
    for (let i = 0; i < acc.getCount(); i++) { const o = i * w, x = arr[o], y = arr[o + 1], z = arr[o + 2]; arr[o] = z; arr[o + 1] = x; arr[o + 2] = y; }
    acc.setArray(arr);
  }
}
const meshNode = root.listNodes().find(n => n.getMesh());
const keep = doc.createNode('Granatwerfer').setMesh(meshNode.getMesh());
for (const n of scene.listChildren()) scene.removeChild(n);
scene.addChild(keep);
for (const s of root.listSkins()) s.dispose();
for (const n of root.listNodes()) if (n !== keep) n.dispose();
// Specular weg
for (const e of root.listExtensionsUsed()) if (e.extensionName === 'KHR_materials_specular') e.dispose();
for (const m of root.listMaterials()) m.setName(m.getName().replace('_Inst', ''));
await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 92, resize: [1024, 1024] }));
// three.js erwartet Achsen in y-oben; die Waffe hängt aber im Waffenrahmen (z oben), der Knoten bleibt ungedreht
const b = getBounds(scene);
fs.mkdirSync(path.dirname(out), { recursive: true });
await io.write(out, doc);
console.log('geschrieben', out, (fs.statSync(out).size / 1048576).toFixed(2), 'MB', 'Ausdehnung', b.min.map(v => v.toFixed(3)), b.max.map(v => v.toFixed(3)));
