// Bodenbild für den Planetentyp „mond“: das Geröllbild rocks_ground_02 (Poly Haven, CC0), entfärbt und leicht kühl getönt.
// Relief und Rauheit werden unverändert übernommen. Ablage: asset-src/tex-src/polyhaven/mond_kies (siehe ground.json).
// Aufruf: node scripts/make-mond-boden.mjs   (danach npm run assets)
import fs from 'fs';
import sharp from 'sharp';
const S = 'asset-src/tex-src/polyhaven/rocks_ground_02', O = 'asset-src/tex-src/polyhaven/mond_kies';
fs.mkdirSync(O, { recursive: true });
await sharp(S + '/col.jpg').modulate({ saturation: 0.14, brightness: 1.08 }).linear([1.06, 1.06, 1.1], [-10, -10, -8]).jpeg({ quality: 92 }).toFile(O + '/col.jpg');
fs.copyFileSync(S + '/nor.jpg', O + '/nor.jpg'); fs.copyFileSync(S + '/rough.jpg', O + '/rough.jpg');
const j = JSON.parse(fs.readFileSync('asset-src/tex-src/polyhaven/ground.json', 'utf8')); j.mond = 'mond_kies';
fs.writeFileSync('asset-src/tex-src/polyhaven/ground.json', JSON.stringify(j, null, 2) + '\n');
console.log('ok', fs.readdirSync(O).join(' '));
