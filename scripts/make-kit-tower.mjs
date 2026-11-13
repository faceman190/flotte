// Turmfassade für dichte Städte (Neonhafen): kachelndes Bild mit Paneelen, Geschossbändern und Fenstern (asset-src/tex/kit_tower_col@2048.png)
// und eine Leuchtkarte für die beleuchteten Fenster (kit_tower_emi@2048.png). Eine Kachel = 8 Fensterachsen × 8 Geschosse = 24 m × 25,6 m.
// Fenster: warm, kalt, flackernd farbig (Werbung hinter Glas) oder dunkel; dazwischen Paneelfugen, Klimakästen, Rost- und Schmutzläufer.
// Im Baukasten: K.facade(...) mit Material kit_tower (Texturkoordinaten in Metern / Kachelgröße, wiederholt).
// Aufruf: node scripts/make-kit-tower.mjs   (danach npm run assets)
import fs from 'fs';
import sharp from 'sharp';
const N = 2048, COLS = 8, ROWS = 8, CW = N / COLS, RH = N / ROWS;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const R = rng(77);
let col = `<svg xmlns='http://www.w3.org/2000/svg' width='${N}' height='${N}'>
<defs>
 <linearGradient id='p' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#6a6e75'/><stop offset='1' stop-color='#585c63'/></linearGradient>
 <linearGradient id='gl' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#1a222c'/><stop offset='0.5' stop-color='#0c1016'/><stop offset='1' stop-color='#141a22'/></linearGradient>
</defs>
<rect width='${N}' height='${N}' fill='url(#p)'/>`;
let emi = `<svg xmlns='http://www.w3.org/2000/svg' width='${N}' height='${N}'><rect width='${N}' height='${N}' fill='#000'/>`;
const LIT = [['#ffd9a0', 0.9], ['#ffe8c8', 0.8], ['#ffefd8', 0.8], ['#ffd9a0', 0.85], ['#dfeaff', 0.7], ['#bfe0ff', 0.65], ['#ffb060', 0.7], ['#ff7ad8', 0.6], ['#7dffd8', 0.55]];
for (let r = 0; r < ROWS; r++) {
  const y = r * RH;
  // Geschossband (Brüstung) mit Fuge und Schatten
  col += `<rect x='0' y='${y + RH - 46}' width='${N}' height='46' fill='#45494f'/><rect x='0' y='${y + RH - 46}' width='${N}' height='4' fill='#7a7f87'/><rect x='0' y='${y + RH - 6}' width='${N}' height='6' fill='#16181b'/>`;
  for (let c = 0; c < COLS; c++) {
    const x = c * CW;
    // Paneelfugen zwischen den Achsen, Stützen
    col += `<rect x='${x}' y='${y}' width='14' height='${RH}' fill='#3a3d42'/><rect x='${x + 14}' y='${y}' width='3' height='${RH}' fill='#80858d'/>`;
    const wx = x + 30, wy = y + 26, ww = CW - 52, wh = RH - 92;
    // Fensterrahmen und Glas
    col += `<rect x='${wx - 6}' y='${wy - 6}' width='${ww + 12}' height='${wh + 12}' fill='#15171a'/><rect x='${wx}' y='${wy}' width='${ww}' height='${wh}' fill='url(#gl)'/>`;
    col += `<rect x='${wx + ww / 2 - 3}' y='${wy}' width='6' height='${wh}' fill='#15171a'/>`;     // Mittelpfosten
    const k = R();
    if (k < 0.34) {
      // beleuchtet: Farbe, Stärke, Jalousie oder Vorhang, Silhouette von Möbeln
      const [c0, a] = LIT[Math.floor(R() * LIT.length)], blind = R() < 0.35, lvl = 0.55 + R() * 0.45;
      col += `<rect x='${wx}' y='${wy}' width='${ww}' height='${wh}' fill='${c0}' fill-opacity='${0.32 * lvl}'/>`;
      emi += `<rect x='${wx}' y='${wy}' width='${ww}' height='${wh}' fill='${c0}' fill-opacity='${a * lvl}'/>`;
      if (blind) for (let b = 0; b < wh; b += 14) { col += `<rect x='${wx}' y='${wy + b}' width='${ww}' height='5' fill='#1a1c20' fill-opacity='0.55'/>`; emi += `<rect x='${wx}' y='${wy + b}' width='${ww}' height='5' fill='#000' fill-opacity='0.6'/>`; }
      else if (R() < 0.5) { const sx = wx + R() * ww * 0.6, sw = 20 + R() * 50, sh = 30 + R() * 50; col += `<rect x='${sx}' y='${wy + wh - sh}' width='${sw}' height='${sh}' fill='#101114' fill-opacity='0.8'/>`; emi += `<rect x='${sx}' y='${wy + wh - sh}' width='${sw}' height='${sh}' fill='#000' fill-opacity='0.85'/>`; }
    } else if (k < 0.44) {
      // Klimakasten vor dem Fenster
      col += `<rect x='${wx + 10}' y='${wy + wh - 70}' width='${ww * 0.55}' height='62' fill='#5a5f66'/><rect x='${wx + 16}' y='${wy + wh - 64}' width='${ww * 0.55 - 12}' height='50' fill='#3b3f45'/>`;
      for (let l = 0; l < 6; l++) col += `<rect x='${wx + 16}' y='${wy + wh - 62 + l * 8}' width='${ww * 0.55 - 12}' height='3' fill='#2a2d31'/>`;
    }
    // Schmutzläufer unter dem Fenster
    if (R() < 0.4) col += `<rect x='${wx + R() * ww * 0.7}' y='${wy + wh + 6}' width='${6 + R() * 10}' height='${RH - wh - 40}' fill='#1a1612' fill-opacity='${0.25 + R() * 0.3}'/>`;
  }
}
col += '</svg>'; emi += '</svg>';
fs.mkdirSync('asset-src/tex', { recursive: true });
await sharp(Buffer.from(col)).png().toFile('asset-src/tex/kit_tower_col@2048.png');
await sharp(Buffer.from(emi)).png().toFile('asset-src/tex/kit_tower_emi@2048.png');
console.log('ok');
// ---------- Abnutzung: Helligkeitsrauschen, Ablaufspuren, Ruß (rechnerisch, kachelnd) ----------
{
  const img = await sharp('asset-src/tex/kit_tower_col@2048.png').raw().toBuffer({ resolveWithObject: true });
  const px = img.data, ch = img.info.channels, R2 = rng(91);
  const latt = (n) => { const g = new Float32Array(n * n); for (let i = 0; i < g.length; i++) g[i] = R2(); return (u, v) => { const x = u * n, y = v * n, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, m = (a) => ((a % n) + n) % n; const s = (t) => t * t * (3 - 2 * t); const a = g[m(y0) * n + m(x0)], b = g[m(y0) * n + m(x0 + 1)], c = g[m(y0 + 1) * n + m(x0)], d = g[m(y0 + 1) * n + m(x0 + 1)]; return a + (b - a) * s(fx) + (c - a) * s(fy) + (a - b - c + d) * s(fx) * s(fy); }; };
  const n1 = latt(16), n2 = latt(64), n3 = latt(256), streak = latt(96);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = (y * N + x) * ch;
    let k = 0.86 + 0.18 * n1(u, v) + 0.08 * n2(u, v) + 0.05 * n3(u, v);
    const st = streak(u, v * 0.08); if (st > 0.62) k *= 1 - (st - 0.62) * 0.9 * (0.6 + 0.4 * n2(u, v));      // senkrechte Läufer
    for (let c = 0; c < 3; c++) px[i + c] = Math.max(0, Math.min(255, px[i + c] * k));
  }
  await sharp(px, { raw: { width: N, height: N, channels: ch } }).png().toFile('asset-src/tex/kit_tower_col@2048.png');
  console.log('abgenutzt');
}
