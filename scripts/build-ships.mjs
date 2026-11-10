// Wandelt die glTF-Modelle aus models/ in kompakte GLB-Daten um und schreibt sie nach public/ships.js.
// Texturen: 2048 px PNG → 1024 px JPEG. Farbvarianten (Lackierungen) werden als eigene JPEGs mitgeliefert.
// Aufruf: node scripts/build-ships.mjs
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'models');
// Modell → mitzuliefernde Farbvarianten (Orange steckt bereits im Modell)
const MODELS = {
  Striker: ['Blue', 'Green', 'Purple', 'Red'],
  Zenith: ['Blue', 'Green', 'Purple', 'Red'],
  Imperial: ['Blue', 'Green', 'Purple', 'Red'],
  Insurgent: ['Blue', 'Green', 'Purple', 'Red'],
  Executioner: ['Blue', 'Green', 'Purple', 'Red'],
  Bob: ['Blue'], Challenger: ['Green'], Spitfire: ['Blue'], Dispatcher: ['Green'],
};
const SIZE = 1024, QUALITY = 82;
const jpeg = input => sharp(input).resize(SIZE, SIZE, { kernel: 'lanczos3' }).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
const pad4 = n => (n + 3) & ~3;

function toGLB(json, bin) {
  const js = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([js, Buffer.alloc(pad4(js.length) - js.length, 0x20)]);
  const binChunk = Buffer.concat([bin, Buffer.alloc(pad4(bin.length) - bin.length, 0)]);
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const h = Buffer.alloc(12); h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonChunk.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(binChunk.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([h, jh, jsonChunk, bh, binChunk]);
}

const out = { models: {}, paints: {} };
let total = 0;
for (const [name, paints] of Object.entries(MODELS)) {
  const file = path.join(SRC, name, 'glTF', name + '.gltf');
  if (!fs.existsSync(file)) { console.warn('fehlt:', file); continue; }
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const src = Buffer.from(j.buffers[0].uri.split(',')[1], 'base64');
  const imgViews = new Set((j.images || []).map(i => i.bufferView));
  const parts = [];
  let off = 0;
  for (let i = 0; i < j.bufferViews.length; i++) {
    const bv = j.bufferViews[i];
    let bytes = src.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    if (imgViews.has(i)) bytes = await jpeg(bytes);
    const aligned = pad4(off);
    if (aligned > off) parts.push(Buffer.alloc(aligned - off));
    off = aligned;
    bv.byteOffset = off; bv.byteLength = bytes.length;
    parts.push(bytes);
    off += bytes.length;
  }
  for (const im of j.images || []) im.mimeType = 'image/jpeg';
  const bin = Buffer.concat(parts);
  j.buffers = [{ byteLength: bin.length }];
  const glb = toGLB(j, bin);
  out.models[name] = glb.toString('base64');
  total += glb.length;
  for (const c of paints) {
    const p = path.join(SRC, name, 'Textures', `${name}_${c}.png`);
    if (!fs.existsSync(p)) continue;
    const jb = await jpeg(fs.readFileSync(p));
    out.paints[`${name}_${c}`] = 'data:image/jpeg;base64,' + jb.toString('base64');
    total += jb.length;
  }
  console.log(name.padEnd(12), (glb.length / 1024).toFixed(0).padStart(5) + ' KB', paints.length ? `+ ${paints.length} Lackierungen` : '');
}
fs.writeFileSync(path.join(ROOT, 'public', 'ships.js'), '// Erzeugt von scripts/build-ships.mjs – Modelle: Quaternius „Ultimate Spaceships“\nwindow.SHIPDATA=' + JSON.stringify(out) + ';\n');
console.log('gesamt', (total / 1024 / 1024).toFixed(2), 'MB binär');
