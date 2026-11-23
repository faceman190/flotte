// =====================================================================================
// Inhalte aus dem Lyra-Paket (asset-src/neu/lyra = entpacktes OneDrive Blender/lyra_paket.zip) für das Spiel aufbereiten:
//  - Aufnahmen: ausgewählte OGG-Dateien nach asset-src/sound-lazy (Schlüssel w_…), Paket world (geladen erst zu Fuß mit Waffe)
//  - Effekte:   zwei Flipbooks nach asset-src/tex-world (fx_ly_squib: Staubwolke 14 × 14 Bilder; fx_ly_explosion: 8 × 8 Bilder,
//               Rauch in R/B, Feuer in G, Deckung in A), auf 1024 px verkleinert
//  - Anzeige:   Symbole nach asset-src/tex-world (hud_ly_…). Lyras Symbole sind Masken in den Farbkanälen ohne Transparenz; hier wird
//               daraus ein weißes Symbol mit Transparenz (Grünkanal = Fläche), wie die gezeichnete Anzeige es braucht.
// Danach trägt das Skript alles in die Paketliste ein (ohne den ganzen Lauf von build-assets.mjs; der nimmt beide Ordner ohnehin mit).
// Die Clips packt scripts/build-clips.mjs, die Waffenmodelle scripts/build-manny.mjs (asset-src/glb/lazy/Lyra*.glb).
// Aufruf: node scripts/build-lyra.mjs
// =====================================================================================
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'asset-src', 'neu', 'lyra'), SND = path.join(ROOT, 'asset-src', 'sound-lazy'), TEX = path.join(ROOT, 'asset-src', 'tex-world');
const OUT = path.join(ROOT, 'public', 'assets'), MAN = path.join(OUT, 'manifest.json');
if (!fs.existsSync(SRC)) { console.error('Quellordner fehlt: ' + SRC); process.exit(1); }
const hash = buf => crypto.createHash('sha1').update(buf).digest('hex').slice(0, 10);
const nn = i => String(i).padStart(2, '0');
const seq = (key, file, n, from = 1) => Array.from({ length: n }, (_, i) => [key + i, file.replace('##', nn(from + i))]);

// ---------- Aufnahmen: [Schlüssel, Datei unter audio/] ----------
const SOUNDS = [
  // Waffen: Knall (p), Nachhall (n), Magazin heraus / hinein, Verschluss
  ...seq('w_rifle_p', 'weapons_rifle/Weapons_Rifle_Punch-Close_##.ogg', 6), ...seq('w_rifle_n', 'weapons_rifle/Weapons_Rifle_Noise-Exterior-Close_##.ogg', 3),
  ['w_rifle_out', 'weapons_rifle/Weapons_Rifle_ClipOut_01.ogg'], ['w_rifle_in', 'weapons_rifle/Weapons_Rifle_ClipIn_01.ogg'], ['w_rifle_end', 'weapons_rifle/Weapons_Rifle_Bolt_01.ogg'],
  ...seq('w_pistol_p', 'weapons_pistol/Weapons_Pistol_Punch-Close_##.ogg', 4), ...seq('w_pistol_n', 'weapons_pistol/Weapons_Pistol_Noise-Interior-Close_##.ogg', 3),
  ['w_pistol_out', 'weapons_pistol/Weapons_Pistol_ClipOut_01.ogg'], ['w_pistol_in', 'weapons_pistol/Weapons_Pistol_ClipIn_01.ogg'], ['w_pistol_end', 'weapons_pistol/Weapons_Pistol_Slide_01.ogg'],
  ...seq('w_shotgun_p', 'weapons_shotgun/Weapons_Shotgun_Punch_##.ogg', 3), ...seq('w_shotgun_n', 'weapons_shotgun/Weapons_Shotgun_Noise-Exterior-Close_##.ogg', 3),
  ['w_shotgun_out', 'weapons_shotgun/Weapons_Shotgun_ClipOut_01.ogg'], ['w_shotgun_in', 'weapons_shotgun/Weapons_Shotgun_ClipIn_01.ogg'],
  // Allgemein zu Fuß (w_x_…): Zielen, Waffenwechsel, Einschlag der eigenen Kugeln, eigener Treffer, Abschuss, Vorbeiflug
  ...seq('w_x_zin', 'foley_misc/Lyra_ZoomIn_##.ogg', 3), ...seq('w_x_zout', 'foley_misc/Lyra_ZoomOut_##.ogg', 3), ...seq('w_x_swap', 'foley_misc/Lyra_WeaponSwap_##.ogg', 3),
  ...seq('w_x_imp', 'impacts/Lyra_ImpactPlaster_##.ogg', 5), ...seq('w_x_hurt', 'impacts/Lyra_Plyr_BulletImpact_##.ogg', 4),
  ...seq('w_x_kill', 'impacts/Lyra_EnemyDestroyed_##.ogg', 4), ...seq('w_x_whiz', 'whizbys/Lyra_BulletIn_Close_##.ogg', 6),
  // Granate: Aufprall, Zündung (Körper und Druck)
  ...seq('w_x_gb', 'grenade/grenade_bounce_##.ogg', 3), ...seq('w_x_ge', 'grenade/grenade_explode_body_##.ogg', 3), ...seq('w_x_gt', 'grenade/grenade_explode_thump_##.ogg', 3),
];
fs.mkdirSync(SND, { recursive: true });
let miss = 0;
for (const [key, file] of SOUNDS) {
  const p = path.join(SRC, 'audio', file);
  if (!fs.existsSync(p)) { console.warn('fehlt:', file); miss++; continue; }
  fs.copyFileSync(p, path.join(SND, key + '.ogg'));
}
console.log(`Aufnahmen: ${SOUNDS.length - miss} von ${SOUNDS.length} nach asset-src/sound-lazy`);

// ---------- Texturen ----------
fs.mkdirSync(TEX, { recursive: true });
const T = path.join(SRC, 'textures');
const made = [];
for (const [name, file] of [['fx_ly_squib', 'effects/LDR_Squib_2_rop_comp1_0001_flipbook.webp'], ['fx_ly_explosion', 'effects/T_Explosion_Areal_E64.webp']]) {
  await sharp(path.join(T, file)).resize(1024, 1024).png().toFile(path.join(TEX, name + '.png')); made.push(name);
}
// Symbole: Grünkanal als Deckung, Farbe weiß; auf den Inhalt beschnitten
const ICONS = { hud_ly_rifle: 'RangedWeapons_Rifle', hud_ly_pistol: 'RangedWeapons_Pistol', hud_ly_shotgun: 'RangedWeapons_Shotgun',
  hud_ly_ammo_rifle: 'RangedWeapons_Rifle_Ammo', hud_ly_ammo_pistol: 'RangedWeapons_Pistol_Ammo', hud_ly_ammo_shotgun: 'RangedWeapons_Shotgun_Ammo',
  hud_ly_kill2: 'Accolade_DoubleElimination', hud_ly_kill3: 'Accolade_TripleElimination', hud_ly_kill4: 'Accolade_QuadrupleElimination', hud_ly_ads: 'MobileOnly_ADS', hud_ly_grenade: 'OtherWeapons_Grenade' };
for (const [name, file] of Object.entries(ICONS)) {
  const { data, info } = await sharp(path.join(T, 'hud', 'T_UI_Icon_' + file + '.png')).raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, n = info.width * info.height; i < n; i++) { out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = 255; out[i * 4 + 3] = data[i * info.channels + 1]; }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 4 }).png().toFile(path.join(TEX, name + '.png')); made.push(name);
}
fs.copyFileSync(path.join(T, 'hud', 'T_Crosshair_Dot.png'), path.join(TEX, 'hud_ly_dot.png')); made.push('hud_ly_dot');
console.log('Texturen: ' + made.length + ' nach asset-src/tex-world');

// ---------- Paketliste ----------
const m = JSON.parse(fs.readFileSync(MAN, 'utf8'));
let n = 0, size = 0;
function put(key, ext, buf, orig) {
  const rel = `${key}.${hash(buf)}.${ext}`;
  if (m.files[key] && m.files[key].url === 'assets/' + rel) return;
  if (m.files[key]) fs.rmSync(path.join(OUT, m.files[key].url.slice('assets/'.length)), { force: true });
  fs.mkdirSync(path.dirname(path.join(OUT, rel)), { recursive: true });
  fs.writeFileSync(path.join(OUT, rel), buf);
  m.files[key] = { url: 'assets/' + rel, size: buf.length, pack: 'world', orig };
  n++; size += buf.length;
}
for (const f of fs.readdirSync(SND).filter(x => /\.(ogg|mp3)$/i.test(x))) { const b = fs.readFileSync(path.join(SND, f)); put('sound/' + path.basename(f, path.extname(f)), path.extname(f).slice(1).toLowerCase(), b, b.length); }
for (const name of made) {      // gleiche Regel wie build-assets.mjs für asset-src/tex-world
  const src = fs.readFileSync(path.join(TEX, name + '.png'));
  put('tex/' + name, 'webp', await sharp(src).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 86, effort: 5 }).toBuffer(), src.length);
}
const packs = {};
for (const f of Object.values(m.files)) { const p = (packs[f.pack] = packs[f.pack] || { files: 0, size: 0 }); p.files++; p.size += f.size; }
m.packs = packs; m.v = hash(Buffer.from(JSON.stringify(m.files)));
fs.writeFileSync(MAN, JSON.stringify(m, null, 0));
console.log(`Paketliste: ${n} neue oder geänderte Dateien, ${(size / 1024).toFixed(0)} KB`);
