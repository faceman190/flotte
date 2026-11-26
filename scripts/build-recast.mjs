// Nur die Wegfindung neu packen und in die Paketliste eintragen, ohne den ganzen Lauf von npm run assets:
//   node scripts/build-recast.mjs
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { packRecast } from './recast-pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
process.chdir(ROOT);
const buf = await packRecast();
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const alt = man.files['lazy/Recast'];
if (alt) fs.rmSync(path.join(OUT, alt.url.slice('assets/'.length)), { force: true });
const rel = `lazy/Recast.${hash(buf)}.js`;
fs.mkdirSync(path.join(OUT, 'lazy'), { recursive: true });
fs.writeFileSync(path.join(OUT, rel), buf);
man.files['lazy/Recast'] = { url: 'assets/' + rel, size: buf.length, pack: 'lazy' };
const packs = {};
for (const f of Object.values(man.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
man.packs = packs; man.v = hash(Buffer.from(JSON.stringify(man.files)));
fs.writeFileSync(MAN, JSON.stringify(man, null, 0));
console.log(`lazy/Recast: ${(buf.length / 1048576).toFixed(2)} MB · Version ${man.v}`);
