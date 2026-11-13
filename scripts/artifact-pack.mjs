// Fassung für das claude.ai-Artifact: claude.ai stellt keine .glb-Dateien bereit. Dieses Skript kopiert dist/ nach
// dist-artifact/, bündelt alle Modelle in assets/models*.json (Base64, in Teilen) und vermerkt das in der Paketliste („embed“).
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
  // Sehr große Modelle (über etwa 8,5 MB) in Stücke teilen: Schlüssel „name#0“, „name#1“ …; der Lader setzt sie wieder zusammen.
  const buf = fs.readFileSync(path.join(SRC, f.url)), CH = 8.5e6;
  if (buf.length <= CH) models[k] = buf.toString('base64');
  else for (let i = 0, n = 0; i < buf.length; i += CH, n++) models[k + '#' + n] = buf.subarray(i, i + CH).toString('base64');
  f.url = 'embed:' + k;
}
// in Teile bis etwa 12 MB aufteilen (claude.ai erlaubt höchstens 16 MB je Datei)
const parts = [{}], sizes = [0];
for (const [k, b64] of Object.entries(models)) {
  if (sizes[sizes.length - 1] && sizes[sizes.length - 1] + b64.length > 12e6) { parts.push({}); sizes.push(0); }
  parts[parts.length - 1][k] = b64; sizes[sizes.length - 1] += b64.length;
}
const urls = parts.map((part, i) => { const u = `assets/models${i ? '-' + i : ''}.json`; fs.writeFileSync(path.join(OUT, u), JSON.stringify(part)); return u; });
const json = { length: sizes.reduce((a, b) => a + b, 0) };
man.embed = { urls, size: json.length };
fs.writeFileSync(path.join(OUT, 'assets', 'manifest.json'), JSON.stringify(man));
console.log(`Artifact-Fassung: ${Object.keys(models).length} Modelle und Modellstücke gebündelt (${(json.length / 1048576).toFixed(1)} MB in ${urls.length} Teilen)`);
