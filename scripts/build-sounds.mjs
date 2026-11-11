// Effekte aus sounds/ als data-URIs nach public/sounds.js (klein, sofort verfügbar).
// Musik wird als eigene Dateien nach public/music/ kopiert und erst beim Abspielen gestreamt (lange Stücke, mehrere MB).
// Aufruf: node scripts/build-sounds.mjs
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const FILES = { laser: 'bergbaulaser.mp3', booster: 'spaceship-booster.mp3', gun: 'lasergun.mp3' };
// Musik: Quelle in sounds/ → Ziel in public/music/
const MUSIC = { 'Menu.mp3': 'menu.mp3', 'ambient01.ogg': 'ambient01.ogg', 'ambient02.mp3': 'ambient02.mp3' };

const out = {};
for (const [key, f] of Object.entries(FILES)) {
  const p = path.join(ROOT, 'sounds', f);
  if (!fs.existsSync(p)) { console.warn('fehlt:', p); continue; }
  const b = fs.readFileSync(p);
  out[key] = 'data:audio/mpeg;base64,' + b.toString('base64');
  console.log(key.padEnd(8), f, (b.length / 1024).toFixed(0) + ' KB');
}
fs.writeFileSync(path.join(ROOT, 'asset-src', 'legacy', 'sounds.js'), '// Erzeugt von scripts/build-sounds.mjs\nwindow.SOUNDDATA=' + JSON.stringify(out) + ';\n');

const MD = path.join(ROOT, 'public', 'music');
fs.mkdirSync(MD, { recursive: true });
for (const [src, dst] of Object.entries(MUSIC)) {
  const p = path.join(ROOT, 'sounds', src);
  if (!fs.existsSync(p)) { console.warn('fehlt:', p); continue; }
  fs.copyFileSync(p, path.join(MD, dst));
  console.log('Musik   ', dst, (fs.statSync(p).size / 1024 / 1024).toFixed(1) + ' MB');
}
