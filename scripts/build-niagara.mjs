// =====================================================================================
// Effekt-Texturen aus Epics "Niagara Examples Pack" (Fab, seit 27.11.2026) fürs Spiel aufbereiten.
// Quelle: asset-src/neu/niagara (nicht im Repository) = Export aus Unreal mit scripts/ue/niagara_export.py, die EXR-Flipbooks
// vorher mit scripts/niagara-exr.py nach asset-src/neu/niagara/png umgewandelt.
// Ziel: asset-src/tex-world/fx_ng_*.png (Hintergrund-Paket, erst zu Fuß gebraucht) und gleich in die Paketliste eingetragen.
//
// Aufbau der Flipbooks (Niagara-Material M_SmokeAndFire_Sprites, "EOO"):
//   R = Leuchten (Feuer), G = Verschattung (Rauch hell/dunkel), A = Deckung; B ist leer.
// Mündungsfeuer: Graustufen, A = Deckung. Brandflecken: Graustufen-Masken 2 × 2. Einschussloch: Farbe + Deckung.
// Aufruf: node scripts/build-niagara.mjs
// =====================================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'asset-src', 'neu', 'niagara'), TEX = path.join(ROOT, 'asset-src', 'tex-world');
const OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
if (!fs.existsSync(SRC)) { console.error('Quellordner fehlt: ' + SRC); process.exit(1); }
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);

// [Name im Spiel, Datei unter asset-src/neu/niagara, Kantenlänge (größere Seite)]
const LIST = [
  ['fx_ng_expl', 'png/T_Explosion_EOO.png', 2048],             // Explosion 8 × 8, einmal durch (Feuerball → Rauch)
  ['fx_ng_wide', 'png/T_ExplosionWide_EOO.png', 2048],         // Erd-Explosion am Boden 8 × 16, Bilder doppelt so breit wie hoch
  ['fx_ng_fire', 'png/T_FireRoil_EOO_Loop.png', 1024],         // Flammen 8 × 8, Schleife
  ['fx_ng_smoke', 'png/T_SmokePuff_EOO_Loop.png', 1024],       // dichter Rauch 8 × 8, Schleife
  ['fx_ng_dust', 'png/T_SmokePuffLight_EOO_Loop.png', 1024],   // leichter Rauch/Staub 8 × 8 (Einschläge, Raketenspur)
  ['fx_ng_mflame', 'textures/T_MuzzleFlash.png', 1024],        // Mündungsflamme von der Seite: oben 4 Flammen, unten 2 Wolken
  ['fx_ng_mfront', 'textures/T_MuzzleFlash_Sphere.png', 512],  // Mündungsfeuer von vorn 2 × 2
  ['fx_ng_msmoke', 'textures/T_ThinSmoke_FX.png', 1024],       // dünner Schmauch 8 × 8
  ['fx_ng_scorch', 'textures/ExplosionDecalMasks.png', 1024],  // Brandflecken 2 × 2
  ['fx_ng_hole', 'textures/BulletHole.png', 256],              // Einschussloch
];
fs.mkdirSync(TEX, { recursive: true });
const made = [];
for (const [name, file, max] of LIST) {
  const p = path.join(SRC, file);
  if (!fs.existsSync(p)) { console.warn('fehlt:', file); continue; }
  const at = max > 1024 ? '@' + max : '';
  // 16-Bit-PNG aus Unreal auf 8 Bit; Graustufen-Masken bleiben einkanalig erhalten (sharp schreibt dann Graustufen)
  await sharp(p).resize(max, max, { fit: 'inside', withoutEnlargement: true }).toColourspace(file.includes('DecalMasks') ? 'b-w' : 'srgb').png().toFile(path.join(TEX, name + at + '.png'));
  made.push([name, at]);
}
console.log('Texturen: ' + made.length + ' nach asset-src/tex-world');

// ---------- Paketliste (gleiche Regel wie build-assets.mjs für asset-src/tex-world) ----------
const m = JSON.parse(fs.readFileSync(MAN, 'utf8'));
let n = 0, size = 0;
for (const [name, at] of made) {
  const src = fs.readFileSync(path.join(TEX, name + at + '.png')), max = at ? +at.slice(1) : 1024, data = /_(nrm|orm)$/.test(name);
  const buf = await sharp(src).resize(max, max, { fit: 'inside', withoutEnlargement: true }).webp({ quality: data || at ? 90 : 86, effort: 5 }).toBuffer();
  const key = 'tex/' + name, rel = `tex/${name}.${hash(buf)}.webp`;
  if (m.files[key] && m.files[key].url === 'assets/' + rel) continue;
  if (m.files[key]) fs.rmSync(path.join(OUT, m.files[key].url.slice('assets/'.length)), { force: true });
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), buf);
  m.files[key] = { url: 'assets/' + rel, size: buf.length, pack: 'world' };
  n++; size += buf.length;
}
const packs = {};
for (const f of Object.values(m.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
m.packs = packs; m.v = hash(Buffer.from(JSON.stringify(m.files)));
fs.writeFileSync(MAN, JSON.stringify(m, null, 0));
console.log(`Paketliste: ${n} neue oder geänderte Dateien, ${(size / 1024).toFixed(0)} KB`);
