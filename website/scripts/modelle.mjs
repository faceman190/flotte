// Schiffsmodelle für den Schiffs-Explorer aus den Spieldaten übernehmen (läuft vor jedem Build und vor dem Dev-Server).
// Quelle: ../public/assets (dieselben Meshopt-GLB-Dateien wie im Spiel, Liste in assets/manifest.json).
// Die Website lädt sie von ihrer eigenen Adresse, weil spielen.letztecrew.de für /assets keinen CORS-Header schickt.
// Der Dateiname behält die Prüfsumme (Venom.30ac352e56.glb): Ändert sich ein Modell im Spiel, ändert sich auch die Adresse.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const web = path.resolve(here, '..');
const game = path.resolve(web, '..', 'public');
const manifest = JSON.parse(fs.readFileSync(path.join(game, 'assets', 'manifest.json'), 'utf8'));

const out = path.join(web, 'public', 'modelle');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

const map = { ship: {}, env: null };
let bytes = 0;
for (const [key, f] of Object.entries(manifest.files)) {
  const isShip = key.startsWith('ship/') && !key.endsWith('Fern');   // Fernmodelle (LOD) braucht der Explorer nicht
  const isEnv = key === 'neb/heimat';                               // Nebelhimmel der Heimstatt: Hintergrund und Reflexionen
  if (!isShip && !isEnv) continue;
  const name = path.basename(f.url);
  fs.copyFileSync(path.join(game, f.url), path.join(out, name));
  bytes += f.size;
  if (isShip) map.ship[key.slice(5)] = `/modelle/${name}`;
  else map.env = `/modelle/${name}`;
}
fs.writeFileSync(path.join(web, 'src', 'lib', 'modelle.json'), JSON.stringify(map, null, 2));
console.log(`Modelle: ${Object.keys(map.ship).length} Schiffe, ${(bytes / 1048576).toFixed(1)} MB nach public/modelle`);
