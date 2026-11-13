// Gescannte Materialien (Poly Haven, CC0; asset-src/tex-src/polyhaven/<id>/col.jpg, nor.jpg, rough.jpg) als Detailschicht für die
// berechneten Baukasten-Texturen (make-kit-hh.mjs, make-kit-str.mjs). Das Raster aus Paneelen, Fugen und Fenstern bleibt berechnet;
// Kratzer, Flecken, Körnung, Rauheit und Feinrelief kommen aus dem Scan.
//   loadScans([null, { id, px, k, kr, kn, hue }, …])  lädt jeden Scan auf px × px verkleinert (px muss die Bildgröße teilen, damit es kachelt)
//     k   Stärke der Farbmodulation (1 = volles Muster des Scans), hue: Anteil der Eigenfarbe des Scans (0 = nur hell/dunkel)
//     kr  Anteil der Rauheit aus dem Scan, kn Stärke des Feinreliefs
import sharp from 'sharp';
const DIR = 'asset-src/tex-src/polyhaven/';
export async function loadScans(list) {
  const out = [];
  for (const s of list) {
    if (!s) { out.push(null); continue; }
    const px = s.px, raw = (f, ch) => sharp(DIR + s.id + '/' + f).resize(px, px, { kernel: 'lanczos3' }).removeAlpha().toColourspace(ch === 1 ? 'b-w' : 'srgb').raw().toBuffer();
    const c = await raw('col.jpg', 3), r = await raw('rough.jpg', 1), n = await raw('nor.jpg', 3);
    const col = new Float32Array(px * px * 3), rough = new Float32Array(px * px), nor = new Float32Array(px * px * 2), mean = [0, 0, 0];
    for (let i = 0; i < px * px; i++) {
      for (let k = 0; k < 3; k++) { col[i * 3 + k] = c[i * 3 + k] / 255; mean[k] += col[i * 3 + k]; }
      rough[i] = r[i] / 255; nor[i * 2] = n[i * 3] / 127.5 - 1; nor[i * 2 + 1] = n[i * 3 + 1] / 127.5 - 1;
    }
    for (let k = 0; k < 3; k++) mean[k] = Math.max(0.02, mean[k] / (px * px));
    const lum = mean[0] * 0.3 + mean[1] * 0.59 + mean[2] * 0.11, hue = s.hue ?? 0.25;
    // Farbfaktor je Bildpunkt: Helligkeit relativ zum Mittel, dazu ein Teil der Farbabweichung (Rostflecken bleiben rötlich, die Grundfarbe fällt weg)
    const det = new Float32Array(px * px * 3);
    for (let i = 0; i < px * px; i++) {
      const l = (col[i * 3] * 0.3 + col[i * 3 + 1] * 0.59 + col[i * 3 + 2] * 0.11) / lum;
      for (let k = 0; k < 3; k++) { const full = col[i * 3 + k] / mean[k]; det[i * 3 + k] = 1 + ((l + (full - l) * hue) - 1) * (s.k ?? 1); }
    }
    out.push({ px, det, rough, nor, kr: s.kr ?? 0.7, kn: s.kn ?? 0.6 });
  }
  return out;
}
