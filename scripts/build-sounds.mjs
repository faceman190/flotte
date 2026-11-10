// Packt die Sounds aus sounds/ als data-URIs nach public/sounds.js (Artifact-tauglich, kein Nachladen nötig).
// Aufruf: node scripts/build-sounds.mjs
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const FILES = { music: 'Atmosphere-space.mp3', laser: 'bergbaulaser.mp3', booster: 'spaceship-booster.mp3', gun: 'lasergun.mp3' };
const out = {};
for (const [key, f] of Object.entries(FILES)) {
  const p = path.join(ROOT, 'sounds', f);
  if (!fs.existsSync(p)) { console.warn('fehlt:', p); continue; }
  const b = fs.readFileSync(p);
  out[key] = 'data:audio/mpeg;base64,' + b.toString('base64');
  console.log(key.padEnd(6), f, (b.length / 1024).toFixed(0) + ' KB');
}
fs.writeFileSync(path.join(ROOT, 'public', 'sounds.js'), '// Erzeugt von scripts/build-sounds.mjs\nwindow.SOUNDDATA=' + JSON.stringify(out) + ';\n');
