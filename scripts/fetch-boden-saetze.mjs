// Lädt die Bodenbilder für die Materialsätze der Planetentypen von Poly Haven (polyhaven.com, CC0) nach asset-src/tex-src/polyhaven/<id>/
// und trägt sie in ground.json ein. 1k-JPG reicht: build-assets.mjs rechnet ohnehin auf 1024 Pixel.
// Aufruf: node scripts/fetch-boden-saetze.mjs            (nur nach Freigabe des Downloads; 41 Dateien, 24,8 MB)
import fs from 'node:fs';
import path from 'node:path';

const PH = 'asset-src/tex-src/polyhaven';
// Schlüssel in ground.json → Poly-Haven-Name (Sätze stehen in src/game/surface.ts, TYPESET)
const LAYERS = {
  l_lehm: 'dry_ground_01', l_kies: 'sandy_gravel_02',                      // Wüste
  l_eisfeld: 'snow_field_aerial', l_harsch: 'snow_01',                     // Eis
  l_kruste: 'mud_cracked_dry_03', l_schlacke: 'rock_ground',               // Vulkan
  l_asche: 'ground_grey', l_brand: 'burned_ground_01',                     // Asche
  l_sprung: 'mud_cracked_dry_riverbed_002', l_bruch: 'rocks_ground_06',    // Kristall
  l_einschlag: 'moon_meteor_01', l_regolith: 'moon_02',                    // Mond
};
// Hauptböden, denen nur die Höhenkarte fehlt
const DISP = ['sand_01', 'snow_02', 'dark_rock', 'moon_01', 'dark_rock_02'];
const MAPS = { col: ['Diffuse', 'diff', 'Color'], nor: ['nor_gl'], disp: ['Displacement', 'disp'] };

async function files(id) {
  const r = await fetch('https://api.polyhaven.com/files/' + id, { headers: { 'User-Agent': 'texture-fetch' } });
  if (!r.ok) throw new Error(id + ': ' + r.status);
  return r.json();
}
async function get(id, part) {
  const out = path.join(PH, id, part + '.jpg');
  if (fs.existsSync(out)) return 0;
  const f = await files(id), key = MAPS[part].find(k => f[k]?.['1k']?.jpg);
  if (!key) throw new Error(`${id}: ${part} fehlt`);
  const e = f[key]['1k'].jpg, r = await fetch(e.url);
  if (!r.ok) throw new Error(e.url + ': ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length !== e.size) throw new Error(`${id}/${part}: ${buf.length} statt ${e.size} Bytes`);
  fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, buf);
  console.log(out, (buf.length / 1e6).toFixed(2) + ' MB');
  return buf.length;
}
let total = 0, n = 0;
for (const id of Object.values(LAYERS)) for (const p of ['col', 'nor', 'disp']) { const s = await get(id, p); if (s) { total += s; n++; } }
for (const id of DISP) { const s = await get(id, 'disp'); if (s) { total += s; n++; } }
const gj = path.join(PH, 'ground.json'), j = JSON.parse(fs.readFileSync(gj, 'utf8'));
Object.assign(j, LAYERS);
fs.writeFileSync(gj, JSON.stringify(j, null, 2) + '\n');
console.log(n, 'Dateien geladen,', (total / 1e6).toFixed(1), 'MB; ground.json ergänzt');
