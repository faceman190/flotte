// Trägt nur die Böden des MW-Pakets (asset-src/tex-src/mw, Schlüssel l_mw_* in ground.json) in public/assets nach, ohne den ganzen
// Lauf von build-assets.mjs (der braucht alle Quellen, auch die nicht eingecheckten). Gleiche Kodierung wie dort.
//   node scripts/build-mw.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PH = path.join(ROOT, 'asset-src', 'tex-src', 'polyhaven'), OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const m = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const put = (key, ext, buf, pack) => {
  if (m.files[key]) fs.rmSync(path.join(OUT, m.files[key].url.slice('assets/'.length)), { force: true });
  const rel = `${key}.${hash(buf)}.${ext}`;
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), buf);
  m.files[key] = { url: 'assets/' + rel, size: buf.length, pack };
};
const map = JSON.parse(fs.readFileSync(path.join(PH, 'ground.json'), 'utf8'));
for (const [typ, id] of Object.entries(map)) {
  if (!typ.startsWith('l_mw_')) continue;
  for (const [part, key, q] of [['col', 'ground', 86], ['nor', 'groundn', 92]]) {
    const f = path.join(PH, id, part + '.jpg'); if (!fs.existsSync(f)) continue;
    let img = sharp(f).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true });
    const dispF = path.join(PH, id, 'disp.jpg');
    if (part === 'col' && fs.existsSync(dispF)) {
      const a = await sharp(dispF).resize(1024, 1024, { fit: 'fill' }).greyscale().linear(231 / 255, 24).raw().toBuffer();
      img = sharp(await img.removeAlpha().resize(1024, 1024, { fit: 'fill' }).raw().toBuffer(), { raw: { width: 1024, height: 1024, channels: 3 } }).joinChannel(a, { raw: { width: 1024, height: 1024, channels: 1 } });
    }
    put(`planet/${key}/${typ}`, 'webp', await img.webp({ quality: q, alphaQuality: 88, effort: 5 }).toBuffer(), 'world');
    console.log('planet/' + key + '/' + typ);
  }
}
const packs = {};
for (const f of Object.values(m.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
m.packs = packs; m.v = hash(Buffer.from(JSON.stringify(m.files)));
fs.writeFileSync(MAN, JSON.stringify(m, null, 0));
console.log('Manifest', m.v);
