// Erzeugt public/textures.js (Oberflächen) und public/nebulae.js (Himmels-Panoramen) aus assets/.
// Nebel werden auf 3840×1920 gebracht und als JPEG eingebettet; im Spiel werden sie erst bei Bedarf dekodiert.
// Aufruf: node scripts/build-textures.mjs
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const TEX = path.join(ROOT, 'assets', 'tex'), NEB = path.join(ROOT, 'assets', 'nebula');
const b64 = b => 'data:image/jpeg;base64,' + b.toString('base64');

const tex = {};
for (const f of fs.readdirSync(TEX).filter(f => f.endsWith('.jpg') && !f.startsWith('nebula_'))) tex[path.basename(f, '.jpg')] = b64(fs.readFileSync(path.join(TEX, f)));
fs.writeFileSync(path.join(ROOT, 'asset-src', 'legacy', 'textures.js'), 'window.TEXDATA=' + JSON.stringify(tex) + ';\n');
console.log('textures.js:', Object.keys(tex).join(', '));

const neb = {};
let total = 0;
for (const f of fs.readdirSync(NEB).filter(f => /\.(jpe?g|png|webp)$/i.test(f))) {
  const key = path.basename(f).replace(/\.[^.]+$/, '');
  const out = await sharp(path.join(NEB, f)).resize(3840, 1920, { fit: 'fill', kernel: 'lanczos3' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
  neb[key] = b64(out);
  total += out.length;
  console.log('nebel', key.padEnd(8), (out.length / 1024).toFixed(0) + ' KB');
}
fs.writeFileSync(path.join(ROOT, 'asset-src', 'legacy', 'nebulae.js'), '// Erzeugt von scripts/build-textures.mjs – KI-generierte Nebel-Panoramen\nwindow.NEBDATA=' + JSON.stringify(neb) + ';\n');
console.log('nebulae.js gesamt', (total / 1024 / 1024).toFixed(2), 'MB');

// Planeten: Oberflächenkarten (assets/planet, 2:1) und Bodentexturen (assets/ground, quadratisch) → public/planets.js
// Nahtlos machen: um die halbe Breite verschobene Kopie an den Rändern einblenden (band = Anteil der Breite, 0.5 = ganzes Bild)
async function seamless(file, W, H, band, both) {
  const { data } = await sharp(file).resize(W, H, { fit: 'fill', kernel: 'lanczos3' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);
  const sm = t => t * t * (3 - 2 * t);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ex = Math.min(x, W - 1 - x) / (W * band), ey = both ? Math.min(y, H - 1 - y) / (H * band) : 1;
    const w = sm(Math.min(1, Math.min(ex, ey)));
    const sx = (x + W / 2) % W, sy = both ? (y + H / 2) % H : y;
    for (let c = 0; c < 3; c++) out[(y * W + x) * 3 + c] = data[(y * W + x) * 3 + c] * w + data[(sy * W + sx) * 3 + c] * (1 - w);
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}
const PL = path.join(ROOT, 'assets', 'planet'), GR = path.join(ROOT, 'assets', 'ground');
if (fs.existsSync(PL)) {
  const pdata = { map: {}, ground: {} };
  let pt = 0;
  for (const f of fs.readdirSync(PL).filter(f => /\.(jpe?g|png|webp)$/i.test(f))) {
    const b = await seamless(path.join(PL, f), 2048, 1024, 0.04, false);
    pdata.map[path.basename(f).replace(/\.[^.]+$/, '')] = b64(b); pt += b.length;
  }
  for (const f of fs.existsSync(GR) ? fs.readdirSync(GR).filter(f => /\.(jpe?g|png|webp)$/i.test(f)) : []) {
    const b = await seamless(path.join(GR, f), 1024, 1024, 0.22, true);
    pdata.ground[path.basename(f).replace(/\.[^.]+$/, '')] = b64(b); pt += b.length;
  }
  fs.writeFileSync(path.join(ROOT, 'asset-src', 'legacy', 'planets.js'), '// Erzeugt von scripts/build-textures.mjs – KI-generierte Planetenkarten und Bodentexturen\nwindow.PLANETDATA=' + JSON.stringify(pdata) + ';\n');
  console.log('planets.js:', Object.keys(pdata.map).join(','), '|', Object.keys(pdata.ground).join(','), (pt / 1024 / 1024).toFixed(2), 'MB');
}
