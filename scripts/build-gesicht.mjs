// Gesichts-Editor: die fertig gepackten Köpfe und Haare (asset-src/glb/gesicht/*.glb, gepackt mit scripts/pack-gesicht.mjs)
// als lazy/Gesicht_<name> in die Paketliste legen. Spiel (src/game/figur.ts) und Testseite (public/gesicht.html) laden sie von dort.
// Aufruf: node scripts/build-gesicht.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'asset-src', 'glb', 'gesicht');
const OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const m = JSON.parse(fs.readFileSync(MAN, 'utf8'));

const da = new Set();
for (const n of fs.readdirSync(SRC).filter(x => x.endsWith('.glb')).sort()) {
  const key = 'lazy/Gesicht_' + n.slice(0, -4), buf = fs.readFileSync(path.join(SRC, n)), rel = `${key}.${hash(buf)}.glb`;
  da.add(key);
  if (m.files[key]?.url === 'assets/' + rel) continue;
  if (m.files[key]) fs.rmSync(path.join(OUT, m.files[key].url.slice('assets/'.length)), { force: true });
  fs.writeFileSync(path.join(OUT, rel), buf);
  m.files[key] = { url: 'assets/' + rel, size: buf.length, pack: 'lazy' };
  console.log(key + ': ' + (buf.length / 1048576).toFixed(2) + ' MB');
}
// entfernte Dateien auch aus der Liste nehmen
for (const key of Object.keys(m.files)) if (key.startsWith('lazy/Gesicht_') && !da.has(key)) {
  fs.rmSync(path.join(OUT, m.files[key].url.slice('assets/'.length)), { force: true }); delete m.files[key]; console.log(key + ': entfernt');
}
const packs = {};
for (const f of Object.values(m.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
m.packs = packs; m.v = hash(Buffer.from(JSON.stringify(m.files)));
fs.writeFileSync(MAN, JSON.stringify(m, null, 0));
