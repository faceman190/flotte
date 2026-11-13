// =====================================================================================
// Spieldaten-Paket: wandelt die Quellpakete aus asset-src/legacy/*.js (erzeugt von build-ships, build-stations,
// build-textures, build-sounds) und neue Modelle aus asset-src/glb/<Art>/*.glb (Art: ship, station, char, deco)
// in einzelne, komprimierte Dateien unter public/assets/ um und schreibt die Paketliste public/assets/manifest.json.
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
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress, meshopt, reorder, quantize } from '@gltf-transform/functions';
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
  if (files[key]) { fs.rmSync(path.join(OUT, files[key].url.slice('assets/'.length)), { force: true }); before -= files[key].orig || 0; after -= files[key].size; }   // ersetzt eine frühere Fassung
  const rel = `${key}.${hash(buf)}.${ext}`, full = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buf);
  files[key] = { url: 'assets/' + rel.replace(/\\/g, '/'), size: buf.length, pack, orig };
  before += orig; after += buf.length;
}
async function image(key, uri, pack, q = 85) {
  const d = dataUri(uri); if (!d) return;
  const webp = await sharp(d.buf).webp({ quality: q, effort: 5 }).toBuffer();
  const ext = d.mime.includes('png') ? 'png' : 'jpg';
  if (webp.length < d.buf.length) put(key, 'webp', webp, pack, d.buf.length);
  else put(key, ext, d.buf, pack, d.buf.length);
}
async function model(key, data, pack) {
  const src = Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');
  const doc = await io.readBinary(new Uint8Array(src));
  // Modelle mit zweitem Satz Texturkoordinaten (vorberechnetes Licht, das Bild dazu liegt in asset-src/tex) behalten ihn:
  // Sonst entfernt prune() ihn, weil kein Material der Datei darauf verweist.
  const uv2 = doc.getRoot().listMeshes().some(m => m.listPrimitives().some(p => p.getAttribute('TEXCOORD_1')));
  // Baukasten-Modelle (Materialnamen kit_*, siehe src/models/kit.ts) tragen keine Bilder, aber Texturkoordinaten ins gemeinsame Texturblatt und
  // Eckfarben. Beides muss erhalten bleiben; die Texturkoordinaten kacheln (Werte über 1) und werden deshalb nicht auf Ganzzahlen gepackt.
  // Dasselbe gilt für ext_*: Modelle, deren Bilder in asset-src/tex liegen und im Spiel zugewiesen werden (Minenfelsen, Waffe im Bild).
  const kit = doc.getRoot().listMaterials().some(m => /^(kit|ext)_/.test(m.getName()));
  if (kit) {
    await doc.transform(dedup({ keepUniqueNames: true }), prune({ keepAttributes: true }),
      reorder({ encoder: MeshoptEncoder, target: 'size' }), quantize({ pattern: /^(POSITION|NORMAL|COLOR)(_\d+)?$/ }));
    doc.createExtension(EXTMeshoptCompression).setRequired(true).setEncoderOptions({ method: EXTMeshoptCompression.EncoderMethod.QUANTIZE });
  } else await doc.transform(
    dedup(), prune({ keepAttributes: uv2 }),
    textureCompress({ encoder: sharp, targetFormat: 'webp', quality: 85, resize: [1024, 1024] }),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  put(key, 'glb', Buffer.from(await io.writeBinary(doc)), pack, src.length);
}

// ---- Texturen, Nebel, Planeten ----
const { TEXDATA = {} } = bundle('textures.js'), { NEBDATA = {} } = bundle('nebulae.js'), { PLANETDATA = { map: {}, ground: {} } } = bundle('planets.js');
for (const [k, v] of Object.entries(TEXDATA)) await image('tex/' + k, v, 'core');
for (const [k, v] of Object.entries(NEBDATA)) await image('neb/' + k, v, k === 'heimat' ? 'core' : 'world', k === 'heimat' ? 86 : 82);   // heimat: Heimstatt und Hauptmenü
for (const [k, v] of Object.entries(PLANETDATA.map || {})) await image('planet/map/' + k, v, 'world');
for (const [k, v] of Object.entries(PLANETDATA.ground || {})) await image('planet/ground/' + k, v, 'world');
// Planetenböden von Poly Haven (asset-src/tex-src/polyhaven/ground.json: Planetentyp → Ordner mit col.jpg, nor.jpg, rough.jpg).
// Ersetzen die früheren Bodenbilder gleichen Namens; Relief (OpenGL-Ausrichtung) und Rauheit kommen als eigene Bilder dazu.
const PH = path.join(ROOT, 'asset-src', 'tex-src', 'polyhaven');
if (fs.existsSync(path.join(PH, 'ground.json'))) {
  const map = JSON.parse(fs.readFileSync(path.join(PH, 'ground.json'), 'utf8'));
  for (const [typ, id] of Object.entries(map)) {
    if (typ.startsWith('_')) continue;
    for (const [part, key, q, grey] of [['col', 'ground', 86, false], ['nor', 'groundn', 92, false], ['rough', 'groundr', 82, true]]) {
      const f = path.join(PH, id, part + '.jpg');
      if (!fs.existsSync(f)) { console.warn('Bodenbild fehlt:', f); continue; }
      const src = fs.readFileSync(f);
      let img = sharp(src).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true });
      if (grey) img = img.greyscale();
      put(`planet/${key}/${typ}`, 'webp', await img.webp({ quality: q, effort: 5 }).toBuffer(), 'world', src.length);
    }
  }
}
// ---- Modelle ----
const { SHIPDATA = { models: {}, paints: {} } } = bundle('ships.js'), { STATIONDATA = {} } = bundle('stations.js'), { CHARDATA = {} } = bundle('chars.js');
for (const [k, v] of Object.entries(SHIPDATA.models)) await model('ship/' + k, v, 'core');
for (const [k, v] of Object.entries(SHIPDATA.paints)) await image('paint/' + k, v, 'core', 88);
for (const [k, v] of Object.entries(STATIONDATA)) await model('station/' + k, v, 'core');
for (const [k, v] of Object.entries(CHARDATA)) await model('char/' + k, v, 'core');
// ---- Neue Modelle direkt als GLB (asset-src/glb/<Art>/<Name>.glb); ersetzen gleichnamige aus den Quellpaketen ----
const GLB = path.join(ROOT, 'asset-src', 'glb');
for (const kind of ['ship', 'station', 'char', 'deco', 'city']) {   // city: Städte (groß, nur auf ihrem Planeten nötig) → Hintergrund-Paket
  const dir = path.join(GLB, kind);
  if (!fs.existsSync(dir)) continue;
  for (const n of fs.readdirSync(dir).filter(x => x.toLowerCase().endsWith('.glb'))) {
    await model(`${kind}/${path.basename(n, path.extname(n))}`, fs.readFileSync(path.join(dir, n)), kind === 'deco' || kind === 'city' ? 'world' : 'core');
  }
}
// ---- Begehbare Schiffsinnenräume: Innenmodell (asset-src/glb/interior/<Name>.glb) und Laufkarte (asset-src/walk/<Name>.json) ----
// Beides im Hintergrund-Paket: wird erst beim Betreten des Schiffs gebraucht.
const INT = path.join(ROOT, 'asset-src', 'glb', 'interior'), WALK = path.join(ROOT, 'asset-src', 'walk');
if (fs.existsSync(INT)) for (const n of fs.readdirSync(INT).filter(x => x.toLowerCase().endsWith('.glb'))) await model('shipint/' + path.basename(n, path.extname(n)), fs.readFileSync(path.join(INT, n)), 'world');
if (fs.existsSync(WALK)) for (const n of fs.readdirSync(WALK).filter(x => x.endsWith('.json'))) { const b = fs.readFileSync(path.join(WALK, n)); put('walk/' + path.basename(n, '.json'), 'json', b, 'world', b.length); }
// ---- Klänge ----
const { SOUNDDATA = {} } = bundle('sounds.js');
for (const [k, v] of Object.entries(SOUNDDATA)) { const d = dataUri(v); if (d) put('sound/' + k, d.mime.includes('ogg') ? 'ogg' : 'mp3', d.buf, 'core', d.buf.length); }

// ---- Kleine Datendateien (asset-src/data/<name>.json), z. B. das Felsmodell der Asteroiden ----
const DATADIR = path.join(ROOT, 'asset-src', 'data');
if (fs.existsSync(DATADIR)) for (const n of fs.readdirSync(DATADIR).filter(x => x.endsWith('.json'))) { const b = fs.readFileSync(path.join(DATADIR, n)); put('data/' + path.basename(n, '.json'), 'json', b, 'core', b.length); }
// ---- Einzelne Texturen (asset-src/tex/<name>.png|jpg): höchstens 1024 px, WebP. Mit "@2048" im Namen (name@2048.png) bis zu dieser Größe ----
const TEXDIR = path.join(ROOT, 'asset-src', 'tex');
if (fs.existsSync(TEXDIR)) for (const n of fs.readdirSync(TEXDIR).filter(x => /\.(png|jpe?g)$/i.test(x))) { const src = fs.readFileSync(path.join(TEXDIR, n)); const base = path.basename(n, path.extname(n)), at = base.match(/^(.*)@(\d+)$/), max = at ? Math.min(4096, +at[2]) : 1024; const b = await sharp(src).resize(max, max, { fit: 'inside', withoutEnlargement: true }).webp({ quality: at ? 92 : 86, effort: 5 }).toBuffer(); put('tex/' + (at ? at[1] : base), 'webp', b, 'core', src.length); }
// ---- Texturen fürs Hintergrund-Paket (asset-src/tex-world, z. B. Stadtfassaden und Straßenbeläge aus scripts/sync-city-tex.mjs): gleiche Regeln, Paket world ----
const TEXW = path.join(ROOT, 'asset-src', 'tex-world');
if (fs.existsSync(TEXW)) for (const n of fs.readdirSync(TEXW).filter(x => /\.(png|jpe?g)$/i.test(x))) { const src = fs.readFileSync(path.join(TEXW, n)); const base = path.basename(n, path.extname(n)), at = base.match(/^(.*)@(\d+)$/), max = at ? Math.min(4096, +at[2]) : 1024; const data = /_(nrm|orm)$/.test(at ? at[1] : base); const w = await sharp(src).resize(max, max, { fit: 'inside', withoutEnlargement: true }).webp({ quality: data ? 90 : at ? 90 : 86, effort: 5 }).toBuffer(); put('tex/' + (at ? at[1] : base), 'webp', w, 'world', src.length); }
// ---- Einzelne Aufnahmen (asset-src/sound/<name>.ogg|mp3), z. B. Schritte, Klicks, Türen ----
const SND = path.join(ROOT, 'asset-src', 'sound');
if (fs.existsSync(SND)) for (const n of fs.readdirSync(SND).filter(x => /.(ogg|mp3)$/i.test(x))) { const b = fs.readFileSync(path.join(SND, n)); put('sound/' + path.basename(n, path.extname(n)), path.extname(n).slice(1).toLowerCase(), b, 'core', b.length); }

// ---- Stimmen (asset-src/voice/<Ordner>/<Kennung>.mp3|ogg): im Hintergrund-Paket, im Spiel als Klang v_<Kennung> ----
const VOX = path.join(ROOT, 'asset-src', 'voice');
if (fs.existsSync(VOX)) for (const dir of fs.readdirSync(VOX)) { const d = path.join(VOX, dir); if (!fs.statSync(d).isDirectory()) continue; for (const n of fs.readdirSync(d).filter(x => /\.(ogg|mp3)$/i.test(x))) { const b = fs.readFileSync(path.join(d, n)); put('sound/v_' + path.basename(n, path.extname(n)), path.extname(n).slice(1).toLowerCase(), b, 'world', b.length); } }

// ---- Paketliste ----
const packs = {};
for (const f of Object.values(files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
for (const f of Object.values(files)) delete f.orig;   // nur für die Statistik
const v = hash(Buffer.from(JSON.stringify(files)));
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ v, packs, files }, null, 0));
const mb = n => (n / 1048576).toFixed(1) + ' MB';
console.log(`${Object.keys(files).length} Dateien · vorher ${mb(before)} · jetzt ${mb(after)} · Pakete: ${Object.entries(packs).map(([k, p]) => `${k} ${p.files} (${mb(p.size)})`).join(', ')} · Version ${v}`);
