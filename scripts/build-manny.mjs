// =====================================================================================
// Testfigur Manny (asset-src/glb/lazy/Manny.glb) einzeln packen und in die Paketliste eintragen, ohne alle Spieldaten neu
// zu erzeugen (npm run assets löscht public/assets und baut alles neu; dafür fehlen hier einige große Rohdateien).
// Gleiche Umwandlung wie build-assets.mjs für das Paket „lazy“: Geometrie und Animationen mit Meshopt, Texturen WebP.
// Paket „lazy“ wird weder vor dem Menü noch im Hintergrund geladen, nur wenn das Spiel die Datei anfordert (?manny=1).
// Aufruf: node scripts/build-manny.mjs [Name …]   (ohne Namen alle Dateien; „Spieler“ packt nur die Figur, „Manny“ nur den
// Bewegungssatz – der dauert rund 10 Minuten)
// =====================================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { packLazy, LAZY_OPTS } from './lazy-pack.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);

const m = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const dir = path.join(ROOT, 'asset-src', 'glb', 'lazy');
const only = process.argv.slice(2);
for (const n of fs.readdirSync(dir).filter(x => x.toLowerCase().endsWith('.glb'))) {
  const name = path.basename(n, path.extname(n));
  if (only.length && !only.includes(name)) continue;
  const key = 'lazy/' + name, src = fs.readFileSync(path.join(dir, n));
  const buf = await packLazy(src, LAZY_OPTS[name]);
  const rel = `${key}.${hash(buf)}.glb`;
  if (m.files[key]) fs.rmSync(path.join(OUT, m.files[key].url.slice('assets/'.length)), { force: true });
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), buf);
  m.files[key] = { url: 'assets/' + rel, size: buf.length, pack: 'lazy' };
  console.log(`${key}: ${(src.length / 1048576).toFixed(1)} MB → ${(buf.length / 1048576).toFixed(1)} MB`);
}
const packs = {};
for (const f of Object.values(m.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
m.packs = packs;
m.v = hash(Buffer.from(JSON.stringify(m.files)));
fs.writeFileSync(MAN, JSON.stringify(m, null, 0));
