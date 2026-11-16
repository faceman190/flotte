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
// Größengrenze: Eine Fassung auf claude.ai fasst höchstens 256 MiB (und 511 Dateien). Mit allen Lichträumen wären es 310 MB.
// Diese Lichtraum-Sätze (Daten, Modell) bleiben deshalb hier heraus; fehlt ein Satz, baut das Spiel für seine Räume die Bausteine
// (loadLicht in src/game/deck.ts). Auf dem eigenen Server (Render) sind alle Sätze da.
// Seit Alpha 1.30: das Deck der Bastion in der neuen Art (Lichtraum 2, volle Geometrie, gebündelt 82 MB). Auf claude.ai zeigt die Bastion
// deshalb weiter Treffpunkt und Lager in der alten Art und sonst die Bausteine.
// Seit Alpha 1.34: das Hüttendeck der Eisenkrone aus dem Hütten-Baukasten. Mit seinen Daten (ohne Bausteinmodell) fällt auch das Deck selbst
// heraus; das Spiel nimmt dann das alte Hüttendeck aus dem Bastion-Baukasten (DECKS in src/game/deck.ts).
const SKIP_SETS = [['lichtraum2_bastion', 'Lichtraum2Bastion'], ['lichtraum2_hangar', 'Lichtraum2Hangar'], ['lichtraum2_huette_ek', 'Lichtraum2HuetteEk']];
const SKIP_DATA = ['deck_huette_ek'];
let skipped = 0;
for (const [dj, mo] of SKIP_SETS) {
  const d = man.files['data/' + dj];
  if (!d) continue;
  const raeume = JSON.parse(fs.readFileSync(path.join(SRC, d.url), 'utf8')).raeume;
  const teile = raeume.flatMap(R => Object.values(R.teile || {})), karten = raeume.map(R => R.lit).filter(Boolean);      // alte Art: Bildsatz je Teil; neue Art: eine Lichtkarte je Raum
  const drop = ['data/' + dj, 'base/' + mo, ...Object.keys(man.files).filter(k => teile.some(p => k.startsWith('tex/' + p + '_')) || karten.includes(k.slice(4)))];
  for (const k of drop) { const e = man.files[k]; if (!e) continue; fs.rmSync(path.join(OUT, e.url), { force: true }); delete man.files[k]; skipped++; }
}
for (const dj of SKIP_DATA) { const e = man.files['data/' + dj]; if (!e) continue; fs.rmSync(path.join(OUT, e.url), { force: true }); delete man.files['data/' + dj]; skipped++; }
if (skipped) console.log(`Artifact-Fassung: ${skipped} Dateien der Lichtraum-Sätze ${SKIP_SETS.map(q => q[0]).join(', ')} ausgelassen (Größengrenze)`);
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
// Bilder der Lichträume (tex/lm_…) ebenfalls bündeln, in eigenen Teilen (assets/lm-<n>.json): claude.ai fasst höchstens 511 Dateien je
// Fassung, und jeder Lichtraum bringt fünf Bilder mit. Eigene Teile, damit sich die Modell-Teile nicht verschieben.
const lparts = [{}], lsizes = [0];
for (const [k, f] of Object.entries(man.files)) {
  if (!k.startsWith('tex/lm_') || !f.url.endsWith('.webp')) continue;
  const p = path.join(OUT, f.url), b64 = fs.readFileSync(path.join(SRC, f.url)).toString('base64');
  if (lsizes[lsizes.length - 1] && lsizes[lsizes.length - 1] + b64.length > 12e6) { lparts.push({}); lsizes.push(0); }
  lparts[lparts.length - 1][k] = b64; lsizes[lsizes.length - 1] += b64.length;
  fs.rmSync(p); f.url = 'embed:' + k;
}
if (lsizes[0]) lparts.forEach((part, i) => { const u = `assets/lm-${i + 1}.json`; fs.writeFileSync(path.join(OUT, u), JSON.stringify(part)); urls.push(u); });
const json = { length: sizes.reduce((a, b) => a + b, 0) + lsizes.reduce((a, b) => a + b, 0) };
man.embed = { urls, size: json.length };
fs.writeFileSync(path.join(OUT, 'assets', 'manifest.json'), JSON.stringify(man));
console.log(`Artifact-Fassung: ${Object.keys(models).length} Modelle und Modellstücke gebündelt (${(json.length / 1048576).toFixed(1)} MB in ${urls.length} Teilen)`);
