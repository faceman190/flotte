// =====================================================================================
// Spielerfiguren und Ausrüstungsteile aus dem Paket „Spielcharakter“ (OneDrive Blender/Spielcharakter.zip, entpackt nach
// asset-src/neu/spielcharakter; liegt nicht im Repository) fürs Spiel zerlegen und packen. Beschreibung: docs/spielcharakter.md.
//
// Das Paket liefert ganze Figuren (Körper + eigene Ausrüstung in einer Datei) und die Teile noch einmal einzeln. Das Spiel lädt
// ein Skelett und hängt Körper und Teile daran (src/game/figur.ts) – deshalb hier:
//   lazy/Skelett        das gemeinsame Skelett (UE5 Manny, 161 Knochen) mit einem unsichtbaren Dreieck (ohne Haut lädt three.js keine Knochen)
//   lazy/Koerper1 …     je Figur nur der Körper (Körper, Kopf, Haare …), ohne die eigene Ausrüstung
//   lazy/Teil_<id>      je Ausrüstungsteil eine Datei
// Die Bilder der Teile für Laden und Rucksack rendert scripts/build-itembilder.mjs (danach aufrufen, wenn ein Teil neu ist).
// Zwischenstand (Texturen schon verkleinert) liegt in asset-src/glb/lazy und asset-src/tex-world: Daraus packen auch
// build-assets.mjs und build-manny.mjs, das Paket selbst braucht es dann nicht mehr.
//
// Aufruf: node scripts/build-figuren.mjs            zerlegen (falls das Paket da ist) und packen
// =====================================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, textureCompress } from '@gltf-transform/functions';
import { packLazy, lazyOpts } from './lazy-pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'asset-src', 'neu', 'spielcharakter'), LAZY = path.join(ROOT, 'asset-src', 'glb', 'lazy');
const OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// Körper je Figur: welche Netze der Paketdatei zum Körper gehören (alles andere ist eigene Ausrüstung und fällt weg)
// farbe: größte Kantenlänge der Farbtextur; Normalen und ORM immer 1024
const KOERPER = [
  { name: 'Koerper1', file: 'charaktere/chr_spieler_01.glb', netze: ['Koerper'], farbe: 2048 },
  { name: 'Koerper2', file: 'charaktere/chr_spieler_02.glb', netze: ['Koerper', 'Kopf', 'Haare', 'Bart', 'Augenbrauen'], farbe: 1024 },
  { name: 'Koerper3', file: 'charaktere/chr_spieler_03.glb', netze: ['Koerper', 'Kopf'], farbe: 2048 },
];
const FARBE = { overall: 2048, weste: 2048, handschuh: 2048, helm: 1024, stiefel: 1024 };

async function zerlegen(file, netze, farbe) {
  const doc = await io.read(path.join(SRC, file));
  let n = 0;
  for (const node of doc.getRoot().listNodes()) {
    if (!node.getMesh()) continue;
    if (netze && !netze.includes(node.getName())) node.dispose(); else n++;
  }
  if (!n) throw new Error(file + ': keines der Netze gefunden (' + netze + ')');
  const enc = (slots, max) => textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 90, resize: [max, max], slots });
  await doc.transform(prune(), dedup(), enc(/baseColor|emissive/i, farbe), enc(/normal|metallicRoughness|occlusion/i, 1024));
  return doc;
}
// Skelett: Figur 1, deren Netz durch ein einzelnes Dreieck am Wurzelknochen ersetzt ist
async function skelett() {
  const doc = await io.read(path.join(SRC, KOERPER[0].file)), root = doc.getRoot(), buf = root.listBuffers()[0];
  let keep = null;
  for (const node of root.listNodes()) { if (!node.getMesh()) continue; if (!keep && node.getName() === 'Koerper') keep = node; else node.dispose(); }
  const acc = (type, arr) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const prim = doc.createPrimitive()
    .setAttribute('POSITION', acc('VEC3', new Float32Array([0, 0, 0, 0.001, 0, 0, 0, 0.001, 0])))
    .setAttribute('JOINTS_0', acc('VEC4', new Uint8Array(12)))
    .setAttribute('WEIGHTS_0', acc('VEC4', new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0])))
    .setIndices(acc('SCALAR', new Uint16Array([0, 1, 2])));
  keep.setName('Skelett').setMesh(doc.createMesh('Skelett').addPrimitive(prim));
  await doc.transform(prune());
  return doc;
}

const made = [];
if (fs.existsSync(path.join(SRC, 'spiel.json'))) {
  const spiel = JSON.parse(fs.readFileSync(path.join(SRC, 'spiel.json'), 'utf8'));
  const write = async (name, doc) => { const b = Buffer.from(await io.writeBinary(doc)); fs.writeFileSync(path.join(LAZY, name + '.glb'), b); made.push(name); console.log(`${name}: ${(b.length / 1048576).toFixed(2)} MB`); };
  await write('Skelett', await skelett());
  for (const k of KOERPER) await write(k.name, await zerlegen(k.file, k.netze, k.farbe));
  for (const a of spiel.ausruestung) await write('Teil_' + a.id, await zerlegen(a.file, null, FARBE[a.slot] || 1024));
  // Liste der Teile fürs Spiel (Platz je Teil, verdeckte Körperbereiche): src/data/figurTeile.ts
  fs.writeFileSync(path.join(ROOT, 'src', 'data', 'figurTeile.ts'), '// Erzeugt von scripts/build-figuren.mjs aus spiel.json des Pakets „Spielcharakter“ – nicht von Hand ändern.\n'
    + '// teile: Platz je Ausrüstungsteil · verdeckt: je Platz die Knochen (Ausdruck), deren Körperflächen unter dem Teil ausgeblendet werden\n'
    + 'export const FIGUR_TEILE = ' + JSON.stringify({ teile: Object.fromEntries(spiel.ausruestung.map(a => [a.id, a.slot])), verdeckt: spiel.verdeckt }, null, 2) + ' as const;\n');
} else console.log('Paket fehlt (' + SRC + ') – es wird nur aus asset-src/glb/lazy neu gepackt.');

// ---------- packen und in die Paketliste eintragen ----------
const m = JSON.parse(fs.readFileSync(MAN, 'utf8'));
function put(key, ext, buf, pack, orig) {
  const rel = `${key}.${hash(buf)}.${ext}`;
  if (m.files[key] && m.files[key].url === 'assets/' + rel) return;
  if (m.files[key]) fs.rmSync(path.join(OUT, m.files[key].url.slice('assets/'.length)), { force: true });
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), buf);
  m.files[key] = { url: 'assets/' + rel, size: buf.length, pack, orig };
}
for (const n of fs.readdirSync(LAZY).filter(x => /^(Skelett|Koerper\d|Teil_.*)\.glb$/.test(x))) {
  const name = n.slice(0, -4), src = fs.readFileSync(path.join(LAZY, n)), buf = await packLazy(src, lazyOpts(name));
  put('lazy/' + name, 'glb', buf, 'lazy', src.length);
  console.log(`lazy/${name}: ${(src.length / 1048576).toFixed(2)} → ${(buf.length / 1048576).toFixed(2)} MB`);
}
// die alte Einzelfigur (lazy/Spieler) ist durch lazy/Koerper1 ersetzt
if (m.files['lazy/Spieler']) { fs.rmSync(path.join(OUT, m.files['lazy/Spieler'].url.slice('assets/'.length)), { force: true }); delete m.files['lazy/Spieler']; }
const packs = {};
for (const f of Object.values(m.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
m.packs = packs; m.v = hash(Buffer.from(JSON.stringify(m.files)));
fs.writeFileSync(MAN, JSON.stringify(m, null, 0));
