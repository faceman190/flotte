// =====================================================================================
// Spieldaten-Paket: wandelt die Quellpakete aus asset-src/legacy/*.js (erzeugt von build-ships, build-stations,
// build-textures, build-sounds) in einzelne, komprimierte Dateien unter public/assets/ um und schreibt die
// Paketliste public/assets/manifest.json.
//  - Modelle (GLB): Geometrie mit Meshopt komprimiert, Texturen als WebP (höchstens 1024 px)
//  - Bilder: WebP, wenn das kleiner ist als das Original
//  - Klänge: unverändert als Datei
// Jede Datei trägt eine Prüfsumme im Namen (z. B. ship/Striker.3f2a9c01de.glb). So darf der Browser sie für immer
// behalten; nach einer Änderung bekommt sie einen neuen Namen und wird neu geladen.
// Aufruf: npm run assets
// =====================================================================================
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'asset-src', 'legacy'), OUT = path.join(ROOT, 'public', 'assets');

// Quellpakete lesen (window.X = {...})
function bundle(file) {
  const p = path.join(SRC, file);
  if (!fs.existsSync(p)) return {};
  const window = {};
  vm.runInNewContext(fs.readFileSync(p, 'utf8'), { window });
  return window;
}
const dataUri = s => { const m = /^data:([^;]+);base64,(.*)$/s.exec(s); return m ? { mime: m[1], buf: Buffer.from(m[2], 'base64') } : null; };
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);

await MeshoptEncoder.ready; await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

fs.rmSync(OUT, { recursive: true, force: true });
const files = {};
let before = 0, after = 0;
function put(key, ext, buf, pack, orig) {
  const rel = `${key}.${hash(buf)}.${ext}`, full = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buf);
  files[key] = { url: 'assets/' + rel.replace(/\\/g, '/'), size: buf.length, pack };
  before += orig; after += buf.length;
}
async function image(key, uri, pack, q = 85) {
  const d = dataUri(uri); if (!d) return;
  const webp = await sharp(d.buf).webp({ quality: q, effort: 5 }).toBuffer();
  const ext = d.mime.includes('png') ? 'png' : 'jpg';
  if (webp.length < d.buf.length) put(key, 'webp', webp, pack, d.buf.length);
  else put(key, ext, d.buf, pack, d.buf.length);
}
async function model(key, b64, pack) {
  const src = Buffer.from(b64, 'base64');
  const doc = await io.readBinary(new Uint8Array(src));
  await doc.transform(
    dedup(), prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  put(key, 'glb', Buffer.from(await io.writeBinary(doc)), pack, src.length);
}

// ---- Texturen, Nebel, Planeten ----
const { TEXDATA = {} } = bundle('textures.js'), { NEBDATA = {} } = bundle('nebulae.js'), { PLANETDATA = { map: {}, ground: {} } } = bundle('planets.js');
for (const [k, v] of Object.entries(TEXDATA)) await image('tex/' + k, v, 'core');
for (const [k, v] of Object.entries(NEBDATA)) await image('neb/' + k, v, k === 'blue' ? 'core' : 'world', 82);   // blau: Heimstatt und Hauptmenü
for (const [k, v] of Object.entries(PLANETDATA.map || {})) await image('planet/map/' + k, v, 'world');
for (const [k, v] of Object.entries(PLANETDATA.ground || {})) await image('planet/ground/' + k, v, 'world');
// ---- Modelle ----
const { SHIPDATA = { models: {}, paints: {} } } = bundle('ships.js'), { STATIONDATA = {} } = bundle('stations.js'), { CHARDATA = {} } = bundle('chars.js');
for (const [k, v] of Object.entries(SHIPDATA.models)) await model('ship/' + k, v, 'core');
for (const [k, v] of Object.entries(SHIPDATA.paints)) await image('paint/' + k, v, 'core', 88);
for (const [k, v] of Object.entries(STATIONDATA)) await model('station/' + k, v, 'core');
for (const [k, v] of Object.entries(CHARDATA)) await model('char/' + k, v, 'core');
// ---- Klänge ----
const { SOUNDDATA = {} } = bundle('sounds.js');
for (const [k, v] of Object.entries(SOUNDDATA)) { const d = dataUri(v); if (d) put('sound/' + k, d.mime.includes('ogg') ? 'ogg' : 'mp3', d.buf, 'core', d.buf.length); }

// ---- Paketliste ----
const packs = {};
for (const f of Object.values(files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
const v = hash(Buffer.from(JSON.stringify(files)));
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ v, packs, files }, null, 0));
const mb = n => (n / 1048576).toFixed(1) + ' MB';
console.log(`${Object.keys(files).length} Dateien · vorher ${mb(before)} · jetzt ${mb(after)} · Pakete: ${Object.entries(packs).map(([k, p]) => `${k} ${p.files} (${mb(p.size)})`).join(', ')} · Version ${v}`);
