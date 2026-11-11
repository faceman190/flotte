// Fassung für das claude.ai-Artifact: claude.ai stellt keine .glb-Dateien bereit. Dieses Skript kopiert dist/ nach
// dist-artifact/, bündelt alle Modelle in assets/models.json (Base64) und vermerkt das in der Paketliste („embed“).
// Der Lader (src/core/assets.ts) macht daraus beim Start wieder Modelldateien im Speicher.
// Aufruf nach „npm run build“: node scripts/artifact-pack.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'dist'), OUT = path.join(ROOT, 'dist-artifact');
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(SRC, OUT, { recursive: true, filter: p => !p.endsWith('.glb') });
const man = JSON.parse(fs.readFileSync(path.join(SRC, 'assets', 'manifest.json'), 'utf8')), models = {};
for (const [k, f] of Object.entries(man.files)) {
  if (!f.url.endsWith('.glb')) continue;
  models[k] = fs.readFileSync(path.join(SRC, f.url)).toString('base64');
  f.url = 'embed:' + k;
}
const json = JSON.stringify(models);
fs.writeFileSync(path.join(OUT, 'assets', 'models.json'), json);
man.embed = { url: 'assets/models.json', size: json.length };
fs.writeFileSync(path.join(OUT, 'assets', 'manifest.json'), JSON.stringify(man));
console.log(`Artifact-Fassung: ${Object.keys(models).length} Modelle gebündelt (${(json.length / 1048576).toFixed(1)} MB)`);
