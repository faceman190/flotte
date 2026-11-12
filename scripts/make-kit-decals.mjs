// Erzeugt den Aufkleber-Atlas des Baukastens (asset-src/tex/kit_decals@2048.png, 2048 × 2048 mit Transparenz) und die Liste der Felder
// (asset-src/neu/baukasten/kit_decals.json). Oben Schrift, Ziffern, Zeichen und Schilder (als SVG gezeichnet, dann abgenutzt),
// unten Schmutz: Ablaufspuren, Rost, Ölflecken, Schleifspuren, Reifenspuren, Ruß (rechnerisch).
// Aufruf: node scripts/make-kit-decals.mjs   (danach npm run assets)
import fs from 'fs';
import sharp from 'sharp';
const N = 2048, F = {};
const cell = (name, x, y, w, h) => { F[name] = { x, y, w, h }; return { x, y, w, h }; };
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const sm = t => t * t * (3 - 2 * t), clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
function lattice(px, py, R) { const g = new Float32Array(px * py); for (let i = 0; i < g.length; i++) g[i] = R(); const m = (a, n) => ((a % n) + n) % n; return (u, v) => { const x = u * px, y = v * py, x0 = Math.floor(x), y0 = Math.floor(y), fx = sm(x - x0), fy = sm(y - y0); const a = g[m(y0, py) * px + m(x0, px)], b = g[m(y0, py) * px + m(x0 + 1, px)], c = g[m(y0 + 1, py) * px + m(x0, px)], d = g[m(y0 + 1, py) * px + m(x0 + 1, px)]; return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }; }
function fbm(R, px, py, oct) { const ls = []; for (let o = 0; o < oct; o++) ls.push(lattice(px << o, py << o, R)); return (u, v) => { let s = 0, a = 0.5, n = 0; for (const l of ls) { s += l(u, v) * a; n += a; a *= 0.5; } return s / n; }; }

// ---------- Vektorteil ----------
const FONT = "font-family='Impact, Haettenschweiler, Arial Black, Arial' font-weight='700'";
let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${N}' height='${N}' viewBox='0 0 ${N} ${N}'>`;
for (let i = 0; i < 10; i++) { const c = cell('d' + i, i * 192, 0, 192, 256); svg += `<text x='${c.x + 96}' y='222' ${FONT} font-size='240' text-anchor='middle' fill='#fff'>${i}</text>`; }
const WORDS = ['LAGER', 'ZUGANG', 'HANGAR', 'TECHNIK', 'TREIBSTOFF', 'LANDEZONE', 'ACHTUNG', 'KEIN ZUTRITT'];
WORDS.forEach((w, i) => { const c = cell('w_' + w.toLowerCase().replace(' ', '_'), (i % 4) * 512, 256 + Math.floor(i / 4) * 128, 512, 128); svg += `<text x='${c.x + 256}' y='${c.y + 100}' ${FONT} font-size='${w.length > 9 ? 84 : 100}' text-anchor='middle' letter-spacing='4' fill='#fff'>${w}</text>`; });
const S = (name, i) => cell(name, i * 256, 512, 256, 256);
{ const c = S('warn', 0), x = c.x, y = c.y; svg += `<path d='M${x + 128} ${y + 22} L${x + 240} ${y + 226} L${x + 16} ${y + 226} Z' fill='#f2b90c' stroke='#111' stroke-width='14' stroke-linejoin='round'/><rect x='${x + 116}' y='${y + 92}' width='24' height='74' rx='6' fill='#111'/><circle cx='${x + 128}' cy='${y + 192}' r='14' fill='#111'/>`; }
{ const c = S('volt', 1), x = c.x, y = c.y; svg += `<path d='M${x + 128} ${y + 22} L${x + 240} ${y + 226} L${x + 16} ${y + 226} Z' fill='#f2b90c' stroke='#111' stroke-width='14' stroke-linejoin='round'/><path d='M${x + 140} ${y + 78} L${x + 100} ${y + 150} L${x + 128} ${y + 150} L${x + 112} ${y + 208} L${x + 160} ${y + 130} L${x + 132} ${y + 130} Z' fill='#111'/>`; }
{ const c = S('noentry', 2), x = c.x, y = c.y; svg += `<circle cx='${x + 128}' cy='${y + 128}' r='106' fill='#c8201a' stroke='#fff' stroke-width='10'/><rect x='${x + 62}' y='${y + 108}' width='132' height='40' rx='6' fill='#fff'/>`; }
{ const c = S('arrow', 3), x = c.x, y = c.y; svg += `<path d='M${x + 128} ${y + 20} L${x + 226} ${y + 128} L${x + 164} ${y + 128} L${x + 164} ${y + 236} L${x + 92} ${y + 236} L${x + 92} ${y + 128} L${x + 30} ${y + 128} Z' fill='#fff'/>`; }
{ const c = S('chevron', 4), x = c.x, y = c.y; for (let k = 0; k < 3; k++) svg += `<path d='M${x + 22 + k * 74} ${y + 40} L${x + 62 + k * 74} ${y + 40} L${x + 110 + k * 74} ${y + 128} L${x + 62 + k * 74} ${y + 216} L${x + 22 + k * 74} ${y + 216} L${x + 70 + k * 74} ${y + 128} Z' fill='#f2b90c'/>`; }
{ const c = S('emblem', 5), x = c.x + 128, y = c.y + 128; svg += `<circle cx='${x}' cy='${y}' r='104' fill='none' stroke='#fff' stroke-width='12'/><path d='M${x} ${y - 84} L${x + 20} ${y - 20} L${x + 84} ${y} L${x + 20} ${y + 20} L${x} ${y + 84} L${x - 20} ${y + 20} L${x - 84} ${y} L${x - 20} ${y - 20} Z' fill='#fff'/><ellipse cx='${x}' cy='${y}' rx='104' ry='30' fill='none' stroke='#fff' stroke-width='6' transform='rotate(-28 ${x} ${y})'/>`; }
{ const c = S('tag', 6), x = c.x, y = c.y; svg += `<rect x='${x + 14}' y='${y + 62}' width='228' height='132' rx='14' fill='none' stroke='#fff' stroke-width='12'/><text x='${x + 128}' y='${y + 164}' ${FONT} font-size='96' text-anchor='middle' fill='#fff'>LC-7</text>`; }
{ const c = S('cross', 7), x = c.x + 128, y = c.y + 128; svg += `<circle cx='${x}' cy='${y}' r='100' fill='none' stroke='#fff' stroke-width='10' stroke-dasharray='40 22'/><path d='M${x - 60} ${y} H${x + 60} M${x} ${y - 60} V${y + 60}' stroke='#fff' stroke-width='10'/>`; }
const P = (name, i) => cell(name, i * 512, 768, 512, 256);
const SMALL = "font-family='Consolas, Courier New, monospace' font-weight='700'";
{ const c = P('p_info', 0), x = c.x, y = c.y; svg += `<rect x='${x + 14}' y='${y + 14}' width='484' height='228' rx='8' fill='#dcdcd8'/><rect x='${x + 14}' y='${y + 14}' width='484' height='54' rx='8' fill='#16181c'/><text x='${x + 30}' y='${y + 54}' ${FONT} font-size='38' fill='#dcdcd8'>BASTION WERFT</text>`;
  ['TYP    K-12 / B', 'MASSE  480 KG', 'DRUCK  16 BAR', 'SERIE  0027-LC'].forEach((t, k) => { svg += `<text x='${x + 30}' y='${y + 106 + k * 36}' ${SMALL} font-size='28' fill='#16181c'>${t}</text>`; });
  const R = rng(5); let bx = x + 330; while (bx < x + 480) { const w = 3 + Math.floor(R() * 8); svg += `<rect x='${bx}' y='${y + 86}' width='${w}' height='136' fill='#16181c'/>`; bx += w + 3 + Math.floor(R() * 6); } }
{ const c = P('p_caution', 1), x = c.x, y = c.y; svg += `<rect x='${x + 14}' y='${y + 14}' width='484' height='228' rx='8' fill='#f2b90c'/><text x='${x + 256}' y='${y + 108}' ${FONT} font-size='86' text-anchor='middle' fill='#111'>VORSICHT</text><text x='${x + 256}' y='${y + 168}' ${FONT} font-size='46' text-anchor='middle' fill='#111'>DRUCKBEHÄLTER</text>`;
  for (let k = 0; k < 12; k++) svg += `<path d='M${x + 22 + k * 40} ${y + 232} l24 -40 h20 l-24 40 Z' fill='#111'/>`; }
{ const c = P('p_stop', 2), x = c.x, y = c.y; svg += `<rect x='${x + 14}' y='${y + 14}' width='484' height='228' rx='8' fill='#c8201a'/><rect x='${x + 26}' y='${y + 26}' width='460' height='204' rx='4' fill='none' stroke='#fff' stroke-width='6'/><text x='${x + 256}' y='${y + 136}' ${FONT} font-size='104' text-anchor='middle' fill='#fff'>NOT-AUS</text><text x='${x + 256}' y='${y + 196}' ${SMALL} font-size='30' text-anchor='middle' fill='#fff'>NUR IM NOTFALL ZIEHEN</text>`; }
{ const c = P('p_o2', 3), x = c.x, y = c.y; svg += `<rect x='${x + 14}' y='${y + 14}' width='484' height='228' rx='8' fill='#1d5fa8'/><text x='${x + 150}' y='${y + 176}' ${FONT} font-size='170' text-anchor='middle' fill='#fff'>O2</text><text x='${x + 370}' y='${y + 116}' ${FONT} font-size='40' text-anchor='middle' fill='#fff'>SAUERSTOFF</text><text x='${x + 370}' y='${y + 168}' ${SMALL} font-size='28' text-anchor='middle' fill='#fff'>200 BAR</text>`; }
svg += '</svg>';
const vec = await sharp(Buffer.from(svg)).resize(N, N).ensureAlpha().raw().toBuffer();
const out = Buffer.alloc(N * N * 4);
// Abnutzung der gemalten Zeichen: Lack fehlt stellenweise, Kratzer
{ const R = rng(21), wear = fbm(R, 24, 24, 5), fine = fbm(R, 160, 160, 2);
  for (let y = 0; y < 1024; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4; let a = vec[i + 3] / 255;
    const w = wear(x / N, y / N) * 0.75 + fine(x / N, y / N) * 0.25;
    a *= clamp((0.69 - w) * 9 + 0.5, y < 512 ? 0.0 : 0.55, 1);        // Schrift stärker abgenutzt als Schilder
    out[i] = vec[i]; out[i + 1] = vec[i + 1]; out[i + 2] = vec[i + 2]; out[i + 3] = Math.round(a * 255);
  } }
// Farbe unter durchsichtigen Stellen auffüllen (sonst dunkle Ränder beim Verkleinern)
for (let it = 0; it < 6; it++) {
  const src = Buffer.from(out);
  for (let y = 1; y < 1023; y++) for (let x = 1; x < N - 1; x++) {
    const i = (y * N + x) * 4; if (src[i + 3] > 8) continue;
    let r = 0, g = 0, b = 0, n = 0;
    for (const d of [-4, 4, -N * 4, N * 4]) { const j = i + d; if (src[j + 3] > 8 || src[j] + src[j + 1] + src[j + 2] > 0) { r += src[j]; g += src[j + 1]; b += src[j + 2]; n++; } }
    if (n) { out[i] = r / n; out[i + 1] = g / n; out[i + 2] = b / n; }
  }
}
for (let y = 0; y < 512; y++) for (let x = 0; x < N; x++) { const i = (y * N + x) * 4; out[i] = out[i + 1] = out[i + 2] = 255; }   // Schrift: überall weiß, nur die Deckkraft zählt

// ---------- Schmutz ----------
function paint(c, col, fn) { for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) { const i = ((c.y + y) * N + c.x + x) * 4, a = clamp(fn(x / c.w, y / c.h, x, y)); const k = typeof col === 'function' ? col(x / c.w, y / c.h) : col; out[i] = k[0]; out[i + 1] = k[1]; out[i + 2] = k[2]; out[i + 3] = Math.round(a * 255); } }
const edge = (u, v, m = 0.06) => sm(clamp(Math.min(u, 1 - u, v, 1 - v) / m));
for (let k = 0; k < 6; k++) {   // Ablaufspuren (dunkel) und Rostläufer: oben dicht, nach unten ausdünnend
  const R = rng(40 + k), colN = fbm(R, 24, 1, 3), n2 = fbm(R, 6, 3, 4), fine = fbm(R, 60, 8, 2), rust = k >= 4;
  const c = cell((rust ? 'rust' : 'leak') + ((rust ? k - 4 : k) + 1), k * 256, 1024, 256, 512);
  paint(c, rust ? (u, v) => [120 + 50 * n2(u, v), 52 + 20 * n2(v, u), 18] : [22, 18, 14], (u, v) => {
    const s = sm(clamp((colN(u, 0.5) - 0.42) * 5)), len = 0.35 + 0.65 * colN(u + 0.3, 0.5);
    return s * clamp(1 - v / len) ** 1.4 * (0.55 + 0.6 * n2(u, v)) * (0.7 + 0.5 * fine(u, v)) * edge(u, 0.5, 0.08) * sm(clamp(v / 0.015)) * (rust ? 0.9 : 0.8);
  });
}
{ const R = rng(60), n = fbm(R, 4, 4, 5), f = fbm(R, 30, 30, 2); const c = cell('stain1', 1536, 1024, 512, 512);
  paint(c, [14, 12, 10], (u, v) => { const d = Math.hypot(u - 0.5, v - 0.5) * 2; return sm(clamp((0.78 - d + (n(u, v) - 0.5) * 0.9) * 3)) * (0.5 + 0.5 * f(u, v)) * 0.85; }); }
{ const R = rng(61), n = fbm(R, 5, 5, 5), f = fbm(R, 40, 40, 2); const c = cell('stain2', 0, 1536, 512, 512);
  paint(c, [60, 48, 36], (u, v) => { const d = Math.hypot(u - 0.5, v - 0.5) * 2; return sm(clamp((0.7 - d + (n(u, v) - 0.5) * 1.2) * 2.2)) * (0.35 + 0.5 * f(u, v)) * 0.7; }); }
{ const R = rng(62), n = fbm(R, 3, 60, 3), l = fbm(R, 2, 14, 3); const c = cell('scuff', 512, 1536, 512, 512);
  paint(c, [200, 200, 196], (u, v) => sm(clamp((n(u, v) - 0.56) * 8)) * sm(clamp((l(u, v) - 0.4) * 4)) * edge(u, v, 0.15) * 0.7); }
{ const R = rng(63), n = fbm(R, 8, 8, 4); const c = cell('tyre', 1024, 1536, 512, 512);
  paint(c, [16, 15, 14], (u, v, x, y) => { let a = 0; for (const cx of [0.3, 0.7]) { const d = Math.abs(u - cx); if (d < 0.11) a = Math.max(a, (((y + (u < cx ? x : -x) * 0.8) % 34) < 20 ? 1 : 0.25) * sm(clamp((0.11 - d) / 0.02))); } return a * (0.35 + 0.6 * n(u, v)) * edge(0.5, v, 0.12) * 0.8; }); }
{ const R = rng(64), n = fbm(R, 6, 6, 5), ray = fbm(R, 40, 1, 3); const c = cell('soot', 1536, 1536, 512, 512);
  paint(c, [10, 9, 9], (u, v) => { const dx = u - 0.5, dy = v - 0.5, d = Math.hypot(dx, dy) * 2, a = Math.atan2(dy, dx) / (Math.PI * 2) + 0.5; return sm(clamp((0.95 - d) * (0.9 + ray(a, 0.5) * 1.6))) * (0.5 + 0.6 * n(u, v)) * 0.9; }); }

fs.mkdirSync('asset-src/tex', { recursive: true });
await sharp(out, { raw: { width: N, height: N, channels: 4 } }).png().toFile('asset-src/tex/kit_decals@2048.png');
fs.writeFileSync('asset-src/neu/baukasten/kit_decals.json', JSON.stringify({ px: N, cells: F }, null, 1));
console.log(Object.keys(F).length, 'Felder');
