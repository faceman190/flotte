// Zeichnet eine Laufkarte als Draufsicht (PNG): Bodenhöhe als Farbe, Punkte als Kreise. Nase oben (−Z).
// Aufruf: node scripts/walkmap-image.mjs <karte.json> <bild.png> [Pixel je Zelle=3]
import fs from 'fs';
import sharp from 'sharp';
const [inp, out, pxArg] = process.argv.slice(2), PX = +(pxArg || 3);
const w = JSON.parse(fs.readFileSync(inp, 'utf8'));
const cells = new Int32Array(Buffer.from(w.cells, 'base64').buffer.slice(0)), ys = new Int16Array(Buffer.from(w.ys, 'base64').buffer.slice(0));
const W = w.nx * PX, H = w.nz * PX, img = Buffer.alloc(W * H * 3, 18);
let ymin = Infinity, ymax = -Infinity; for (const y of ys) { ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
const col = t => [Math.round(40 + 200 * t), Math.round(120 + 100 * (1 - Math.abs(t - 0.5) * 2)), Math.round(240 - 200 * t)];
const put = (px, py, c) => { if (px < 0 || py < 0 || px >= W || py >= H) return; const o = (py * W + px) * 3; img[o] = c[0]; img[o + 1] = c[1]; img[o + 2] = c[2]; };
for (let i = 0; i < cells.length; i++) {
  const ix = Math.floor(cells[i] / w.nz), iz = cells[i] % w.nz, c = col((ys[i] - ymin) / Math.max(1, ymax - ymin));
  for (let a = 0; a < PX; a++) for (let b = 0; b < PX; b++) put(ix * PX + a, iz * PX + b, c);
}
const mark = (x, z, c, r = 6) => { const px = Math.round((x - w.x0) / w.cell * PX), py = Math.round((z - w.z0) / w.cell * PX); for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) if (a * a + b * b <= r * r && a * a + b * b >= (r - 2) * (r - 2)) put(px + a, py + b, c); };
const C = { seat: [255, 80, 80], hatch: [80, 255, 80], bed: [255, 200, 60], log: [255, 255, 255], locker: [200, 120, 255], scanner: [80, 220, 255] };
for (const s of w.spots) mark(s.x, s.z, C[s.kind] || [255, 255, 255]);
for (const l of w.lamps) mark(l[0], l[2], [255, 255, 160], 3);
await sharp(img, { raw: { width: W, height: H, channels: 3 } }).png().toFile(out);
console.log(`${out}: ${W}×${H}, Böden ${(ymin / 100).toFixed(1)} bis ${(ymax / 100).toFixed(1)} m`);
