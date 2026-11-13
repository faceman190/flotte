// Texturblatt des Baukastens (kit_trim) mit Details aus Materialscans: Kratzer, Flecken, Körnung, Rauheit und Feinrelief (Poly Haven, CC0).
// Das Blatt selbst kommt aus Blender (asset-src/neu/baukasten/trim_build.py) und liegt als Rohfassung in asset-src/tex-src/kit_trim.
// Dieses Skript legt je Streifen einen Scan darüber und schreibt asset-src/tex/kit_trim_{col,nrm,orm}@2048.png (danach npm run assets).
// Nach einem neuen Blatt aus Blender: die drei Bilder aus asset-src/tex nach asset-src/tex-src/kit_trim kopieren, dann dieses Skript.
// Aufruf: node scripts/make-trim-scan.mjs
import fs from 'fs';
import sharp from 'sharp';
import { loadScans } from './kit-scan.mjs';
const SRC = 'asset-src/tex-src/kit_trim', OUT = 'asset-src/tex', N = 2048;
const atlas = JSON.parse(fs.readFileSync('asset-src/neu/baukasten/kit_atlas.json', 'utf8')), PXM = N / atlas.size_m;
// Scan je Streifen (Zeilen des Blatts, in Metern von oben); Kacheln (unterste Zeile) bekommen einen schwachen Scan
const SCANS = [null,
  { id: 'metal_plate_02', px: 512, k: 0.85, hue: 0.2, kr: 0.4, kn: 0.7 },     // 1 lackierte Wandpaneele
  { id: 'metal_plate_02', px: 1024, k: 0.95, hue: 0.25, kr: 0.45, kn: 0.8 },  // 2 Dach, Träger (gleiches Blech, gröber; Riffelblech wirkte auf Dächern falsch)
  { id: 'blue_metal_plate', px: 256, k: 0.7, hue: 0.0, kr: 0.4, kn: 0.6 },    // 3 glatte Flächen, Rohre
  { id: 'metal_plate_02', px: 1024, k: 0.55, hue: 0.15, kr: 0.3, kn: 0.5 },   // 4 Kacheln (Lüfter, Türen, Schaltkästen)
];
const USE = { wall_a: 1, wall_b: 1, roof: 2, beam: 2, girder: 2, pipe: 3, edge: 3, plain: 3 };
const row = new Uint8Array(N);
for (const [name, [m0, m1]] of Object.entries(atlas.strips)) if (USE[name]) for (let y = Math.round(m0 * PXM); y < Math.round(m1 * PXM); y++) row[y] = USE[name];
const tile0 = Math.min(...Object.values(atlas.tiles).map(t => t[1])) * PXM;
for (let y = Math.round(tile0); y < N; y++) row[y] = 4;

const raw = async (f) => (await sharp(`${SRC}/kit_trim_${f}@2048.png`).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
const col = await raw('col'), nrm = await raw('nrm'), orm = await raw('orm');
if (col.info.width !== N) throw new Error('Rohfassung hat nicht ' + N + ' px');
const SC = await loadScans(SCANS);
const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)), enc = v => (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
const b = f => Math.max(0, Math.min(255, Math.round(f * 255)));
const C = col.data, Nn = nrm.data, O = orm.data;
for (let y = 0; y < N; y++) {
  const sc = SC[row[y]]; if (!sc) continue;
  for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 3, sj = (y % sc.px) * sc.px + (x % sc.px);
    // Farbe: Helligkeits- und Farbabweichung des Scans (im linearen Raum)
    for (let c = 0; c < 3; c++) C[i + c] = b(enc(Math.min(1, lin(C[i + c] / 255) * sc.det[sj * 3 + c])));
    // Rauheit (Grün): ein Teil kommt aus dem Scan; Verdeckung (Rot) und Metall (Blau) bleiben
    const ro = O[i + 1] / 255; O[i + 1] = b(ro + (sc.rough[sj] - ro) * sc.kr);
    // Feinrelief: Neigung des Scans zur Neigung des Blatts addieren
    const nz = Math.max(0.05, Nn[i + 2] / 127.5 - 1);
    const nx = (Nn[i] / 127.5 - 1) / nz + sc.nor[sj * 2] * sc.kn, ny = (Nn[i + 1] / 127.5 - 1) / nz + sc.nor[sj * 2 + 1] * sc.kn, l = Math.hypot(nx, ny, 1);
    Nn[i] = b(nx / l * 0.5 + 0.5); Nn[i + 1] = b(ny / l * 0.5 + 0.5); Nn[i + 2] = b(1 / l * 0.5 + 0.5);
  }
}
const w = (buf, f) => sharp(buf, { raw: { width: N, height: N, channels: 3 } }).png({ compressionLevel: 9 }).toFile(`${OUT}/kit_trim_${f}@2048.png`);
await Promise.all([w(C, 'col'), w(Nn, 'nrm'), w(O, 'orm')]);
console.log('kit_trim mit Scan-Details geschrieben');
