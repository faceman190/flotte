// Aufnahmen aus asset-src/sound-lazy in die Paketliste nachtragen, ohne den ganzen Lauf von build-assets.mjs (der alles neu packt).
// Dieselbe Regel wie dort: Schlüssel sound/<name>, Paket world (geladen erst bei Bedarf). Aufruf: node scripts/add-lazy-sounds.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'asset-src', 'sound-lazy'), OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const m = JSON.parse(fs.readFileSync(MAN, 'utf8'));
let n = 0, size = 0;
for (const f of fs.readdirSync(SRC).filter(x => /\.(ogg|mp3)$/i.test(x))) {
  const b = fs.readFileSync(path.join(SRC, f)), ext = path.extname(f), key = 'sound/' + path.basename(f, ext), rel = key + '.' + hash(b) + ext.toLowerCase();
  if (m.files[key] && m.files[key].url === 'assets/' + rel) continue;
  if (m.files[key]) fs.rmSync(path.join(OUT, m.files[key].url.slice('assets/'.length)), { force: true });
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), b);
  m.files[key] = { url: 'assets/' + rel, size: b.length, pack: 'world', orig: b.length };
  n++; size += b.length;
}
const packs = {};
for (const f of Object.values(m.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
m.packs = packs; m.v = hash(Buffer.from(JSON.stringify(m.files)));
fs.writeFileSync(MAN, JSON.stringify(m, null, 0));
console.log(n + ' Aufnahmen eingetragen, ' + (size / 1024).toFixed(0) + ' KB');
