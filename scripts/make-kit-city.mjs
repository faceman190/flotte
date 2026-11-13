// Erzeugt den Leuchtschrift-Atlas der Städte (asset-src/tex/kit_city@2048.png) und die Liste der Felder (asset-src/neu/baukasten/kit_city.json).
// Neonschriften und Leuchtkästen in eigenen Farben (anders als kit_signs, die das Spiel in der Akzentfarbe der Station färbt), dazu senkrechte
// Fassadenschilder und zwei Plakate. Alle Namen und Marken sind eigene Erfindungen aus der Spielwelt.
// Aufruf: node scripts/make-kit-city.mjs   (danach npm run assets). Im Baukasten: K.neon(name, ...) mit Material kit_neon.
import fs from 'fs';
import sharp from 'sharp';
const N = 2048, F = {};
const cell = (name, x, y, w, h) => { F[name] = { x, y, w, h }; return { x, y, w, h }; };
const FONT = "font-family='Bahnschrift, Segoe UI Semibold, Segoe UI, Arial' font-weight='700'";
const COND = "font-family='Bahnschrift Condensed, Bahnschrift, Arial Narrow, Arial' font-weight='700'";
const SERIF = "font-family='Georgia, Times New Roman, serif' font-weight='700' font-style='italic'";
let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${N}' height='${N}' viewBox='0 0 ${N} ${N}'><rect width='${N}' height='${N}' fill='#000'/>
<defs>
 <filter id='glow' x='-20%' y='-40%' width='140%' height='180%'><feGaussianBlur stdDeviation='9' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
 <filter id='soft' x='-10%' y='-20%' width='120%' height='140%'><feGaussianBlur stdDeviation='4' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
 <linearGradient id='steel' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2a2d31'/><stop offset='1' stop-color='#121417'/></linearGradient>
</defs>`;
// Neonschrift: leuchtender Rand (Röhre) mit weißem Kern und Schein drumherum, auf dunklem Blech mit Schrauben
function plate(c) { return `<rect x='${c.x + 6}' y='${c.y + 6}' width='${c.w - 12}' height='${c.h - 12}' rx='10' fill='url(#steel)'/>` + [[14, 14], [c.w - 22, 14], [14, c.h - 22], [c.w - 22, c.h - 22]].map(([dx, dy]) => `<circle cx='${c.x + dx + 4}' cy='${c.y + dy + 4}' r='4' fill='#3a3e44'/>`).join(''); }
function neon(c, text, col, size, font = FONT, sp = 10, dy = 0) {
  const x = c.x + c.w / 2, y = c.y + c.h / 2 + size * 0.35 + dy;
  return `<g filter='url(#glow)'><text x='${x}' y='${y}' ${font} font-size='${size}' text-anchor='middle' letter-spacing='${sp}' fill='none' stroke='${col}' stroke-width='${Math.max(5, size * 0.07)}' stroke-linejoin='round'>${text}</text></g>` +
    `<text x='${x}' y='${y}' ${font} font-size='${size}' text-anchor='middle' letter-spacing='${sp}' fill='none' stroke='#fff8ec' stroke-width='${Math.max(2, size * 0.022)}' stroke-linejoin='round'>${text}</text>`;
}
// Leuchtkasten: farbige Fläche, dunkle Schrift (wie hinterleuchtetes Acryl)
function lightbox(c, text, bg, fg, size, font = FONT, sp = 6, sub) {
  let s = `<rect x='${c.x + 8}' y='${c.y + 8}' width='${c.w - 16}' height='${c.h - 16}' rx='8' fill='${bg}' filter='url(#soft)'/>` + `<rect x='${c.x + 20}' y='${c.y + 20}' width='${c.w - 40}' height='${c.h - 40}' rx='4' fill='none' stroke='${fg}' stroke-opacity='0.35' stroke-width='3'/>`;
  s += `<text x='${c.x + c.w / 2}' y='${c.y + c.h / 2 + size * 0.35 - (sub ? 18 : 0)}' ${font} font-size='${size}' text-anchor='middle' letter-spacing='${sp}' fill='${fg}'>${text}</text>`;
  if (sub) s += `<text x='${c.x + c.w / 2}' y='${c.y + c.h - 34}' ${FONT} font-size='30' text-anchor='middle' letter-spacing='8' fill='${fg}' fill-opacity='0.8'>${sub}</text>`;
  return s;
}
// ---------- Reihe 0: Stadtname über dem Hangartor ----------
{ const c = cell('c_talstadt', 0, 0, 2048, 256); svg += plate(c) + neon(c, 'TALSTADT', '#ffb347', 190, FONT, 46); }
// ---------- Reihen 1–3: Namen (1024 × 256) ----------
{ const c = cell('c_markt', 0, 256, 1024, 256); svg += plate(c) + neon(c, 'MARKT', '#5fe0ff', 170, FONT, 30); }
{ const c = cell('c_flug', 1024, 256, 1024, 256); svg += lightbox(c, 'FLUGLEITUNG', '#e8eef2', '#16202a', 112, COND, 10, 'TALSTADT · TURM 1'); }
{ const c = cell('c_bar', 0, 512, 1024, 256); svg += plate(c) + neon(c, 'Zur Schleuse', '#ff4a6a', 136, SERIF, 6); }
{ const c = cell('c_hotel', 1024, 512, 1024, 256); svg += plate(c) + neon(c, 'HERBERGE', '#7dff9a', 150, FONT, 24); }
{ const c = cell('c_hammer', 0, 768, 1024, 256); svg += lightbox(c, 'HAMMERWERK', '#f2a20c', '#15100a', 116, COND, 10, 'ERZ · STAHL · TREIBSTOFF'); }
{ const c = cell('c_hangar', 1024, 768, 1024, 256); svg += lightbox(c, 'HANGAR 1', '#121417', '#ffd27a', 150, COND, 18, 'ANFLUG FREI · TOR OFFEN'); }
// ---------- Reihe 4: kleine Schilder (512 × 256) ----------
{ const c = cell('c_imbiss', 0, 1024, 512, 256); svg += plate(c) + neon(c, 'IMBISS', '#ffd84a', 112, FONT, 14); }
{ const c = cell('c_med', 512, 1024, 512, 256); svg += lightbox(c, '✚ SANITÄT', '#f4f6f8', '#c81e1e', 84, FONT, 4); }
{ const c = cell('c_teile', 1024, 1024, 512, 256); svg += lightbox(c, 'ERSATZTEILE', '#1f5fae', '#f0f6ff', 58, COND, 3); }
{ const c = cell('c_prom', 1536, 1024, 512, 256); svg += plate(c) + neon(c, 'PROMENADE', '#5fe0ff', 66, FONT, 5); }
// ---------- Reihe 5: Blocknummern und Tore (256 × 256) ----------
['A', 'B', 'C', 'D', 'E', 'F'].forEach((k, i) => { const c = cell('c_block_' + k.toLowerCase(), i * 256, 1280, 256, 256);
  svg += `<rect x='${c.x + 12}' y='${c.y + 12}' width='232' height='232' rx='14' fill='#e9ecef'/><text x='${c.x + 128}' y='${c.y + 70}' ${COND} font-size='40' text-anchor='middle' letter-spacing='8' fill='#1a1d21'>BLOCK</text><text x='${c.x + 128}' y='${c.y + 222}' ${FONT} font-size='160' text-anchor='middle' fill='#1a1d21'>${k}</text>`; });
{ const c = cell('c_tor_o', 1536, 1280, 256, 256); svg += lightbox(c, 'TOR O', '#f2b90c', '#111', 70, COND, 4); }
{ const c = cell('c_tor_w', 1792, 1280, 256, 256); svg += lightbox(c, 'TOR W', '#f2b90c', '#111', 70, COND, 4); }
// ---------- unten links: senkrechte Fassadenschilder (256 × 512) ----------
function vertical(name, i, word, col) { const c = cell(name, i * 256, 1536, 256, 512); svg += `<rect x='${c.x + 20}' y='${c.y + 8}' width='216' height='496' rx='12' fill='url(#steel)'/>`;
  [...word].forEach((ch, k) => { const cc = { x: c.x, y: c.y + 20 + k * (470 / word.length), w: 256, h: 470 / word.length }; svg += neon(cc, ch, col, Math.min(120, 440 / word.length), FONT, 0); }); }
vertical('v_bar', 0, 'BAR', '#ff4a6a'); vertical('v_hotel', 1, 'HOTEL', '#7dff9a'); vertical('v_markt', 2, 'MARKT', '#5fe0ff'); vertical('v_kino', 3, 'KINO', '#ffb347');
// ---------- unten rechts: zwei Plakate (512 × 512) ----------
{ const c = cell('p_wehr', 1024, 1536, 512, 512), x = c.x, y = c.y;
  svg += `<rect x='${x + 8}' y='${y + 8}' width='496' height='496' fill='#16233a'/><path d='M${x + 8} ${y + 330} L${x + 504} ${y + 250} V${y + 504} H${x + 8} Z' fill='#0b1220'/>`;
  svg += `<path d='M${x + 256} ${y + 60} L${x + 360} ${y + 100} V${y + 190} Q${x + 360} ${y + 270} ${x + 256} ${y + 310} Q${x + 152} ${y + 270} ${x + 152} ${y + 190} V${y + 100} Z' fill='none' stroke='#e8d8b0' stroke-width='12'/><path d='M${x + 256} ${y + 110} V${y + 260} M${x + 196} ${y + 170} H${x + 316}' stroke='#e8d8b0' stroke-width='14'/>`;
  svg += `<text x='${x + 256}' y='${y + 390}' ${COND} font-size='60' text-anchor='middle' letter-spacing='5' fill='#e8d8b0'>BÜRGERWEHR</text><text x='${x + 256}' y='${y + 450}' ${FONT} font-size='30' text-anchor='middle' letter-spacing='5' fill='#9fb4d0'>TALSTADT BRAUCHT DICH</text>`; }
{ const c = cell('p_gruend', 1536, 1536, 512, 512), x = c.x, y = c.y;
  svg += `<rect x='${x + 8}' y='${y + 8}' width='496' height='496' fill='#d8c8a4'/><rect x='${x + 28}' y='${y + 28}' width='456' height='456' fill='none' stroke='#3a2c1a' stroke-width='6'/>`;
  svg += `<path d='M${x + 120} ${y + 330} L${x + 200} ${y + 140} H${x + 312} L${x + 392} ${y + 330} Z M${x + 160} ${y + 330} L${x + 140} ${y + 400} M${x + 352} ${y + 330} L${x + 372} ${y + 400}' fill='none' stroke='#3a2c1a' stroke-width='10'/><circle cx='${x + 256}' cy='${y + 120}' r='26' fill='#3a2c1a'/>`;
  svg += `<text x='${x + 256}' y='${y + 445}' ${SERIF} font-size='44' text-anchor='middle' fill='#3a2c1a'>Gründertag</text><text x='${x + 256}' y='${y + 80}' ${COND} font-size='32' text-anchor='middle' letter-spacing='10' fill='#3a2c1a'>TALSTADT · JAHR 1</text>`; }
svg += '</svg>';
fs.mkdirSync('asset-src/tex', { recursive: true });
await sharp(Buffer.from(svg)).resize(N, N).removeAlpha().png().toFile('asset-src/tex/kit_city@2048.png');
fs.writeFileSync('asset-src/neu/baukasten/kit_city.json', JSON.stringify({ px: N, cells: F }, null, 1));
console.log(Object.keys(F).length, 'Felder');
