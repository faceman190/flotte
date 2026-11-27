// Zwei Bilder nebeneinander mit Beschriftung (Vergleich vorher/nachher für die Doku):
//   node scripts/bildpaar.mjs <links.jpg> <rechts.jpg> <ziel.jpg> [Text links] [Text rechts]
import sharp from 'sharp';
const [a, b, out, ta = 'vorher', tb = 'nachher'] = process.argv.slice(2);
const H = 600, A = await sharp(a).resize({ height: H }).toBuffer({ resolveWithObject: true }), B = await sharp(b).resize({ height: H }).toBuffer({ resolveWithObject: true });
const W = A.info.width + B.info.width + 8;
const label = (t, x) => Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><rect x="${x + 12}" y="12" width="${t.length * 13 + 24}" height="34" rx="4" fill="#000a"/><text x="${x + 24}" y="36" font-family="Consolas,monospace" font-size="20" fill="#eee">${t}</text></svg>`);
await sharp({ create: { width: W, height: H, channels: 3, background: '#111' } })
  .composite([{ input: A.data, left: 0, top: 0 }, { input: B.data, left: A.info.width + 8, top: 0 }, { input: label(ta, 0), left: 0, top: 0 }, { input: label(tb, A.info.width + 8), left: 0, top: 0 }])
  .jpeg({ quality: 88 }).toFile(out);
console.log(out, W + '×' + H);
