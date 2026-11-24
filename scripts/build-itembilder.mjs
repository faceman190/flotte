// =====================================================================================
// Bilder für Laden und Rucksack aus den echten Spielmodellen rendern (Blender, Cycles) und in die Paketliste eintragen:
//   tex/aus_<teil>     die Ausrüstungsteile der Spielerfigur (asset-src/glb/lazy/Teil_<teil>.glb)
//   tex/aus_<waffe>    die Waffen des Spiels (public/assets station/Mine_W_<id> mit den Bildern asset-src/tex/waffe_<id>_…)
//   tex/aus_kg30 …     die drei Waffen und die Granate aus dem Lyra-Paket (asset-src/glb/lazy/Lyra….glb)
// Studio und Blickwinkel wie beim Bildbogen der übrigen Gegenstände (asset-src/neu/items), damit alles zusammenpasst.
// Die Einzelbilder liegen in asset-src/tex-world/aus_<name>.png; welcher Gegenstand welches Bild zeigt, steht in src/data/gear.ts (img).
//
// Aufruf: node scripts/build-itembilder.mjs [Name …]     ohne Namen alle; mit Namen nur diese (z. B. aus_helm_01 aus_ar39)
//         Blender: C:/EXTRA/Blender/blender.exe oder Umgebungsvariable BLENDER
// =====================================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAZY = path.join(ROOT, 'asset-src', 'glb', 'lazy'), TEX = path.join(ROOT, 'asset-src', 'tex-world'), WTEX = path.join(ROOT, 'asset-src', 'tex');
const OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
const BLENDER = process.env.BLENDER || 'C:/EXTRA/Blender/blender.exe';
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const m = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const tmp = fs.mkdtempSync(path.join(process.env.TEMP || '/tmp', 'itembild-'));

// Waffen des Spiels (src/game/mineArt.ts WDEFS): Knoten für Glas und Lampe, das Absehen fällt weg. plain: ohne eigene Bilder (linear)
const WAFFEN = [
  { id: 'ar39', ton: 0.72 }, { id: 'p9' }, { id: 'ef2' }, { id: 'ig3' }, { id: 'sw' },
  { id: 'smg', plain: [0.075, 0.08, 0.09] },
];
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const jobs = [];
for (const n of fs.readdirSync(LAZY).filter(x => /^Teil_.*\.glb$/.test(x))) jobs.push({ name: 'aus_' + n.slice(5, -4), file: path.join(LAZY, n), art: 'teil' });
for (const [name, file, art] of [['aus_kg30', 'LyraGewehr', 'lyra'], ['aus_sp12', 'LyraPistole', 'lyra'], ['aus_tf8', 'LyraFlinte', 'lyra'], ['aus_granate', 'LyraGranate', 'granate']]) jobs.push({ name, file: path.join(LAZY, file + '.glb'), art });
for (const w of WAFFEN) {
  const f = m.files['station/Mine_W_' + w.id]; if (!f) { console.warn('Modell fehlt: Mine_W_' + w.id); continue; }
  // die gepackte Datei entpacken (Blender liest keine Meshopt-Verdichtung)
  const doc = await io.read(path.join(ROOT, 'public', f.url)), file = path.join(tmp, w.id + '.glb');
  for (const ext of doc.getRoot().listExtensionsUsed()) if (/meshopt/i.test(ext.extensionName)) ext.dispose();
  fs.writeFileSync(file, Buffer.from(await io.writeBinary(doc)));
  const tex = path.join(WTEX, 'waffe_' + w.id);
  jobs.push({ name: 'aus_' + w.id, file, art: 'waffe', tex: !w.plain && fs.existsSync(tex + '_col@2048.png') ? tex : undefined, plain: w.plain, ton: w.ton,
    glas: [w.id + '_glas'], licht: [w.id + '_licht'], weg: [w.id + '_absehen'] });
}
const only = process.argv.slice(2), todo = only.length ? jobs.filter(j => only.includes(j.name)) : jobs;
for (const j of todo) j.out = path.join(tmp, j.name + '.png');
fs.writeFileSync(path.join(tmp, 'jobs.json'), JSON.stringify(todo));
console.log(todo.length + ' Bilder rendern …');
execFileSync(BLENDER, ['-b', '-P', path.join(ROOT, 'asset-src', 'neu', 'spielcharakter_skripte', 'bilder.py'), '--', path.join(tmp, 'jobs.json')], { stdio: ['ignore', 'ignore', 'inherit'] });

function put(key, ext, buf, pack, orig) {
  const rel = `${key}.${hash(buf)}.${ext}`;
  if (m.files[key] && m.files[key].url === 'assets/' + rel) return;
  if (m.files[key]) fs.rmSync(path.join(OUT, m.files[key].url.slice('assets/'.length)), { force: true });
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), buf);
  m.files[key] = { url: 'assets/' + rel, size: buf.length, pack, orig };
}
for (const j of todo) {
  if (!fs.existsSync(j.out)) { console.warn('kein Bild: ' + j.name); continue; }
  const png = await sharp(j.out).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(TEX, j.name + '.png'), png);
  put('tex/' + j.name, 'webp', await sharp(png).webp({ quality: 90, effort: 5 }).toBuffer(), 'world', png.length);
  console.log('Bild ' + j.name);
}
fs.rmSync(tmp, { recursive: true, force: true });
const packs = {};
for (const f of Object.values(m.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
m.packs = packs; m.v = hash(Buffer.from(JSON.stringify(m.files)));
fs.writeFileSync(MAN, JSON.stringify(m, null, 0));
