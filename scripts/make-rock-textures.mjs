// Felstexturen für die Minen: die 8K-Bilder aus CliffRocks01 (asset-src/neu/mine/rocks_src, aus Textures.zip) auf 2048 verkleinern.
// Die Normalenkarte stammt aus Unreal (DirectX: Grün zeigt nach unten) und wird ins OpenGL-Format gedreht, wie alle anderen Karten im Spiel.
// Ausgabe: asset-src/tex/fels_col@2048.png, fels_nrm@2048.png, fels_orm@2048.png (R Verdeckung, G Rauheit, B Metall). Danach npm run assets.
import sharp from 'sharp';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..'), SRC = path.join(ROOT, 'asset-src', 'neu', 'mine', 'rocks_src'), OUT = path.join(ROOT, 'asset-src', 'tex');
sharp.cache(false); sharp.concurrency(2);
const N = 2048, open = f => sharp(path.join(SRC, f), { limitInputPixels: false }).resize(N, N, { kernel: 'lanczos3' });
await open('R_TX_Rock-MAT_BaseColor.png').png().toFile(path.join(OUT, 'fels_col@2048.png'));
await open('R_TX_Rock-MAT_OcclusionRoughnessMetallic.png').png().toFile(path.join(OUT, 'fels_orm@2048.png'));
const { data, info } = await open('R_TX_Rock-MAT_Normal.png').removeAlpha().raw().toBuffer({ resolveWithObject: true });
for (let i = 1; i < data.length; i += info.channels) data[i] = 255 - data[i];
await sharp(data, { raw: info }).png().toFile(path.join(OUT, 'fels_nrm@2048.png'));
console.log('fertig');
