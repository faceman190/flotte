// Packt die KI-generierten Stationsmodelle (assets/stations/*.glb, Tripo) nach public/stations.js.
// Texturen werden auf 1024 px JPEG verkleinert; die Geometrie bleibt unverändert.
// Aufruf: node scripts/build-stations.mjs
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CH = process.argv[2] === 'chars';   // node scripts/build-stations.mjs chars → Figuren (assets/chars → public/chars.js)
const SRC = path.join(ROOT, 'assets', CH ? 'chars' : 'stations');
const SIZE = 1024, QUALITY = 82;
const pad4 = n => (n + 3) & ~3;

function readGLB(buf) {
  let o = 12, json = null, bin = null;
  while (o < buf.length) {
    const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4), data = buf.subarray(o + 8, o + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    else if (type === 0x004e4942) bin = data;
    o += 8 + len;
  }
  return { json, bin };
}
function toGLB(json, bin) {
  const js = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.concat([js, Buffer.alloc(pad4(js.length) - js.length, 0x20)]);
  const binChunk = Buffer.concat([bin, Buffer.alloc(pad4(bin.length) - bin.length, 0)]);
  const h = Buffer.alloc(12); h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
  const jh = Buffer.alloc(8); jh.writeUInt32LE(jsonChunk.length, 0); jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8); bh.writeUInt32LE(binChunk.length, 0); bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([h, jh, jsonChunk, bh, binChunk]);
}

const out = {};
let total = 0;
for (const f of fs.readdirSync(SRC).filter(f => f.endsWith('.glb'))) {
  const name = path.basename(f, '.glb');
  const { json: j, bin: src } = readGLB(fs.readFileSync(path.join(SRC, f)));
  const imgViews = new Set((j.images || []).map(i => i.bufferView));
  const parts = [];
  let off = 0;
  for (let i = 0; i < j.bufferViews.length; i++) {
    const bv = j.bufferViews[i];
    let bytes = src.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    if (imgViews.has(i)) bytes = await sharp(bytes).resize(SIZE, SIZE, { fit: 'inside', kernel: 'lanczos3' }).jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer();
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
  out[name] = glb.toString('base64');
  total += glb.length;
  console.log(name.padEnd(10), (glb.length / 1024).toFixed(0).padStart(6) + ' KB', (j.images || []).length + ' Bilder');
}
fs.writeFileSync(path.join(ROOT, 'asset-src', 'legacy', CH ? 'chars.js' : 'stations.js'), '// Erzeugt von scripts/build-stations.mjs – KI-generierte Modelle (Tripo/Meshy über Higgsfield)\nwindow.' + (CH ? 'CHARDATA' : 'STATIONDATA') + '=' + JSON.stringify(out) + ';\n');
console.log('gesamt', (total / 1024 / 1024).toFixed(2), 'MB');
