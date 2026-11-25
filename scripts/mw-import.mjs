// Übernimmt die aus Unreal exportierten Böden des Fab-Pakets „MW Landscape Auto Material“ (scripts/ue/mw_export.py) in die Asset-Quellen.
//   node scripts/mw-import.mjs "<Projekt>\WebExport\mw"      danach  npm run assets
// Schreibt asset-src/tex-src/mw/<boden>/col.jpg, nor.jpg (Relief von DirectX- auf OpenGL-Ausrichtung gedreht), disp.jpg (Höhe aus dem
// Alphakanal des Farbbilds, falls vorhanden) und trägt die Böden als l_mw_* in asset-src/tex-src/polyhaven/ground.json ein.
// Das neue Gelände (?gelaende=neu, surface.ts MWSET) nimmt sie, sobald sie im Spiel liegen; fehlen sie, bleibt alles wie bisher.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC = process.argv[2];
if (!SRC || !fs.existsSync(path.join(SRC, 'textures'))) { console.error('Ordner mit textures/ angeben (Ausgabe von scripts/ue/mw_export.py)'); process.exit(1); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..');
const OUT = path.join(ROOT, 'asset-src', 'tex-src', 'mw'), GJ = path.join(ROOT, 'asset-src', 'tex-src', 'polyhaven', 'ground.json');
const MAP = { Grass: 'gras', Dirt: 'erde', Rock: 'fels', Stones: 'steine', SandA: 'sand', SandC: 'sand2', Snow: 'schnee', CoverRocks: 'deckfels' };
const SIZE = 2048;
const find = (name) => { for (const ext of ['.png', '.tga', '.jpg']) { const f = path.join(SRC, 'textures', name + ext); if (fs.existsSync(f)) return f; } return null; };
const ground = JSON.parse(fs.readFileSync(GJ, 'utf8'));
for (const [src, id] of Object.entries(MAP)) {
  const pre = src === 'CoverRocks' ? 'TEX_MWAM_CoverRocks' : 'TEX_MWAM_' + src, col = find(pre + '_col'), nrm = find(pre + '_nrm');
  if (!col || !nrm) { console.warn('fehlt:', pre); continue; }
  const dir = path.join(OUT, id); fs.mkdirSync(dir, { recursive: true });
  const meta = await sharp(col).metadata();
  await sharp(col).resize(SIZE, SIZE, { fit: 'fill' }).removeAlpha().jpeg({ quality: 92 }).toFile(path.join(dir, 'col.jpg'));
  if (meta.hasAlpha) {
    const a = sharp(col).resize(SIZE, SIZE, { fit: 'fill' }).extractChannel('alpha');
    const st = await a.clone().stats();
    if (st.channels[0].max - st.channels[0].min > 8) await a.jpeg({ quality: 90 }).toFile(path.join(dir, 'disp.jpg'));     // echte Höhe, kein leerer Kanal
  }
  // Unreal-Reliefbilder sind DirectX-ausgerichtet: Grün umdrehen; Blau aus Rot und Grün neu, falls der Kanal anders belegt ist
  const { data, info } = await sharp(nrm).resize(SIZE, SIZE, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += info.channels) {
    const x = data[i] / 127.5 - 1, y = 1 - data[i + 1] / 127.5;
    data[i + 1] = Math.round((y + 1) * 127.5); data[i + 2] = Math.round((Math.sqrt(Math.max(0, 1 - x * x - y * y)) + 1) * 127.5);
  }
  await sharp(data, { raw: info }).jpeg({ quality: 94 }).toFile(path.join(dir, 'nor.jpg'));
  ground['l_mw_' + id] = '../mw/' + id;
  console.log('übernommen:', pre, '→ l_mw_' + id);
}
// Großes Variationsrelief und -maske des Pakets (für später: gegen gleichförmige Flächen aus der Luft)
for (const n of ['TEX_MWAM_Variation_nrm', 'TEX_MWAM_Variation_msk']) { const f = find(n); if (f) { fs.mkdirSync(path.join(OUT, 'variation'), { recursive: true }); await sharp(f).resize(2048, 2048, { fit: 'inside' }).png().toFile(path.join(OUT, 'variation', n + '.png')); } }
ground._info3 = 'l_mw_*: Böden aus dem Fab-Paket MW Landscape Auto Material (scripts/mw-import.mjs), genutzt vom neuen Gelände (?gelaende=neu).';
fs.writeFileSync(GJ, JSON.stringify(ground, null, 2) + '\n');
console.log('fertig, jetzt: npm run assets');
