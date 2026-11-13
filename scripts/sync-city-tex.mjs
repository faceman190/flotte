// Stadt-Texturen fürs Spiel: verkleinert die Bilder aus asset-src/neu/stadt/tex (make-kit-hh.mjs, make-kit-str.mjs, je 2048 px)
// nach asset-src/tex-world. Von dort packt npm run assets sie ins Hintergrund-Paket (nicht ins Startpaket).
//   Fassadenfarbe (kit_hh?_col) bleibt 2048 px, alles Übrige 1024 px; leere Leuchtkarten (Gehweg, Metalldeck) entfallen.
// Aufruf: node scripts/sync-city-tex.mjs   (danach npm run assets)
import fs from 'fs';
import sharp from 'sharp';
const SRC = 'asset-src/neu/stadt/tex', OUT = 'asset-src/tex-world';
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(`${OUT}/${f}`);
for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('@2048.png'))) {
  const name = f.replace('@2048.png', '');
  if (name === 'kit_sta_emi' || name === 'kit_stc_emi') continue;
  if (/^kit_hh._col$/.test(name)) fs.copyFileSync(`${SRC}/${f}`, `${OUT}/${name}@2048.png`);
  else await sharp(`${SRC}/${f}`).resize(1024, 1024, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(`${OUT}/${name}.png`);
}
console.log(fs.readdirSync(OUT).map(f => f + ' ' + Math.round(fs.statSync(`${OUT}/${f}`).size / 1024) + ' KB').join('\n'));
