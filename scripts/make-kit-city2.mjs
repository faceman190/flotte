// Zweiter Leuchtschrift-Atlas (Neonhafen, Cyberpunk-Gassen): asset-src/tex/kit_city2@2048.png + asset-src/neu/baukasten/kit_city2.json.
// Neonschriften eigener Marken, Piktogramme, senkrechte Fassadenschilder und zwei große Werbewände. Alles eigene Erfindungen aus der Spielwelt.
// Im Baukasten: K.neon(name, …) (selbstleuchtend, Material kit_neon2) oder K.holo(name, …) (durchscheinendes Hologramm, Material kit_holo).
// Aufruf: node scripts/make-kit-city2.mjs   (danach npm run assets)
import fs from 'fs';
import sharp from 'sharp';
const N = 2048, F = {};
const cell = (name, x, y, w, h) => { F[name] = { x, y, w, h }; return { x, y, w, h }; };
const FONT = "font-family='Bahnschrift, Segoe UI Semibold, Segoe UI, Arial' font-weight='700'";
const COND = "font-family='Bahnschrift Condensed, Bahnschrift, Arial Narrow, Arial' font-weight='700'";
const SCRIPT = "font-family='Segoe Script, Brush Script MT, Georgia, serif' font-weight='700' font-style='italic'";
let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${N}' height='${N}'><rect width='${N}' height='${N}' fill='#000'/>
<defs>
 <filter id='glow' x='-20%' y='-40%' width='140%' height='180%'><feGaussianBlur stdDeviation='10' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
 <filter id='soft' x='-10%' y='-20%' width='120%' height='140%'><feGaussianBlur stdDeviation='5' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
 <linearGradient id='ga' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2a0a3a'/><stop offset='0.55' stop-color='#6a1a8a'/><stop offset='1' stop-color='#ff4ad8'/></linearGradient>
 <linearGradient id='gb' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#061a20'/><stop offset='0.6' stop-color='#0a5a6a'/><stop offset='1' stop-color='#5affe0'/></linearGradient>
</defs>`;
// Neonröhre: farbiger Schein + heller Kern (auf Schwarz: im Spiel leuchtet nur die Schrift, das Hologramm-Material lässt Schwarz durch)
function neon(c, text, col, size, font = FONT, sp = 8, dy = 0, cx) {
  const x = cx ?? c.x + c.w / 2, y = c.y + c.h / 2 + size * 0.35 + dy;
  return `<g filter='url(#glow)'><text x='${x}' y='${y}' ${font} font-size='${size}' text-anchor='middle' letter-spacing='${sp}' fill='none' stroke='${col}' stroke-width='${Math.max(5, size * 0.075)}' stroke-linejoin='round'>${text}</text></g>` +
    `<text x='${x}' y='${y}' ${font} font-size='${size}' text-anchor='middle' letter-spacing='${sp}' fill='none' stroke='#fff6fb' stroke-width='${Math.max(2, size * 0.024)}' stroke-linejoin='round'>${text}</text>`;
}
const frameN = (c, col, inset = 18) => `<g filter='url(#glow)'><rect x='${c.x + inset}' y='${c.y + inset}' width='${c.w - 2 * inset}' height='${c.h - 2 * inset}' rx='18' fill='none' stroke='${col}' stroke-width='7'/></g><rect x='${c.x + inset}' y='${c.y + inset}' width='${c.w - 2 * inset}' height='${c.h - 2 * inset}' rx='18' fill='none' stroke='#fff' stroke-width='2'/>`;
const box = (c, bg, fg, text, size, font = COND, sp = 6, sub) => `<rect x='${c.x + 10}' y='${c.y + 10}' width='${c.w - 20}' height='${c.h - 20}' rx='8' fill='${bg}' filter='url(#soft)'/>` +
  `<text x='${c.x + c.w / 2}' y='${c.y + c.h / 2 + size * 0.35 - (sub ? 20 : 0)}' ${font} font-size='${size}' text-anchor='middle' letter-spacing='${sp}' fill='${fg}'>${text}</text>` +
  (sub ? `<text x='${c.x + c.w / 2}' y='${c.y + c.h - 36}' ${FONT} font-size='30' text-anchor='middle' letter-spacing='8' fill='${fg}' fill-opacity='0.75'>${sub}</text>` : '');
// ---------- Reihe 0 ----------
{ const c = cell('n_nachtmarkt', 0, 0, 1024, 256); svg += neon(c, 'NACHTMARKT', '#ff3ad0', 120, FONT, 14); }
{ const c = cell('n_neonhafen', 1024, 0, 1024, 256); svg += neon(c, 'NEONHAFEN', '#38e8ff', 126, FONT, 16) + "<g filter='url(#glow)'><path d='M1084 216 H1988' stroke='#ff3ad0' stroke-width='7'/></g>"; }
// ---------- Reihen 1–3 (1024 × 256) ----------
{ const c = cell('n_lumen', 0, 256, 1024, 256); svg += neon(c, 'LUMEN KORP', '#9ff4ff', 110, FONT, 12) + frameN(c, '#38e8ff'); }
{ const c = cell('n_volta', 1024, 256, 1024, 256), x = c.x, y = c.y; svg += neon(c, 'VOLTA', '#ffe23a', 170, FONT, 34, 0, x + 600) + `<g filter='url(#glow)'><path d='M${x + 190} ${y + 40} L${x + 120} ${y + 140} L${x + 175} ${y + 140} L${x + 140} ${y + 220} L${x + 250} ${y + 104} L${x + 192} ${y + 104} L${x + 230} ${y + 40} Z' fill='none' stroke='#ffe23a' stroke-width='9' stroke-linejoin='round'/></g>`; }
{ const c = cell('n_nudel', 0, 512, 1024, 256); svg += neon(c, 'NUDELBAR DRACHE', '#ff5a2a', 86, FONT, 5); }
{ const c = cell('n_kapsel', 1024, 512, 1024, 256); svg += neon(c, 'KAPSELHOTEL', '#4affc8', 98, FONT, 9) + frameN(c, '#4affc8', 26); }
{ const c = cell('n_bier', 0, 768, 1024, 256), x = c.x, y = c.y; svg += box(c, '#f2a20c', '#1a0f04', 'SCHLEUSENBRÄU', 104, COND, 8, 'FRISCH GEZAPFT · SEIT DEM ERSTEN SCHIFF'); }
{ const c = cell('n_spaeti', 1024, 768, 512, 256); svg += neon(c, 'SPÄTI 24/7', '#7dff6a', 84, FONT, 6); }
{ const c = cell('n_klinik', 1536, 768, 512, 256), x = c.x, y = c.y; svg += box(c, '#f2f4f6', '#c41e1e', '✚ KLINIK', 92, FONT, 4); }
// ---------- Reihe 4 (512 × 256) ----------
{ const c = cell('n_pfand', 0, 1024, 512, 256); svg += neon(c, 'PFANDHAUS', '#ffb347', 66, COND, 4); }
{ const c = cell('n_robo', 512, 1024, 512, 256); svg += box(c, '#162a3a', '#7fd8ff', 'ROBO·TEK', 86, COND, 8); }
{ const c = cell('n_karaoke', 1024, 1024, 512, 256); svg += neon(c, 'Karaoke', '#ff6ae8', 104, SCRIPT, 2); }
{ const c = cell('n_zone', 1536, 1024, 512, 256); svg += box(c, '#0c0d10', '#ffd27a', 'ZONE 3', 104, COND, 12); }
// ---------- Reihe 5: Piktogramme (256 × 256) ----------
const ic = (name, i, draw) => { const c = cell(name, i * 256, 1280, 256, 256); svg += `<g filter='url(#glow)'>${draw(c.x + 128, c.y + 128)}</g>`; };
ic('n_pfeil', 0, (x, y) => [0, 1, 2].map(k => `<path d='M${x - 70} ${y - 80 + k * 52} L${x} ${y - 30 + k * 52} L${x + 70} ${y - 80 + k * 52}' fill='none' stroke='#ff9a2a' stroke-width='16' stroke-linecap='round' stroke-linejoin='round'/>`).join(''));
ic('n_bierkrug', 1, (x, y) => `<rect x='${x - 60}' y='${y - 60}' width='92' height='130' rx='10' fill='none' stroke='#ffb347' stroke-width='12'/><path d='M${x + 32} ${y - 30} h26 a20 20 0 0 1 20 20 v40 a20 20 0 0 1 -20 20 h-26' fill='none' stroke='#ffb347' stroke-width='12'/><path d='M${x - 66} ${y - 72} q20 -26 46 -6 q24 -22 50 2' fill='none' stroke='#fff2c8' stroke-width='10'/>`);
ic('n_schale', 2, (x, y) => `<path d='M${x - 90} ${y - 10} h180 a90 80 0 0 1 -180 0 z' fill='none' stroke='#ff5a2a' stroke-width='12'/><path d='M${x - 30} ${y - 90} l20 70 M${x + 10} ${y - 100} l10 80' stroke='#ffd9a0' stroke-width='9'/>`);
ic('n_auge', 3, (x, y) => `<path d='M${x - 100} ${y} q100 -90 200 0 q-100 90 -200 0 z' fill='none' stroke='#ff3ad0' stroke-width='11'/><circle cx='${x}' cy='${y}' r='30' fill='none' stroke='#38e8ff' stroke-width='11'/>`);
ic('n_blitz', 4, (x, y) => `<path d='M${x + 20} ${y - 100} L${x - 50} ${y + 10} L${x} ${y + 10} L${x - 20} ${y + 100} L${x + 60} ${y - 20} L${x + 10} ${y - 20} Z' fill='none' stroke='#ffe23a' stroke-width='11' stroke-linejoin='round'/>`);
ic('n_ring', 5, (x, y) => `<circle cx='${x}' cy='${y}' r='96' fill='none' stroke='#9ff4ff' stroke-width='10'/><circle cx='${x}' cy='${y}' r='60' fill='none' stroke='#38e8ff' stroke-width='6' stroke-dasharray='22 12'/><path d='M${x - 40} ${y + 40} L${x} ${y - 50} L${x + 40} ${y + 40}' fill='none' stroke='#fff' stroke-width='9'/>`);
ic('n_herz', 6, (x, y) => `<path d='M${x} ${y + 80} C${x - 140} ${y - 10} ${x - 70} ${y - 120} ${x} ${y - 40} C${x + 70} ${y - 120} ${x + 140} ${y - 10} ${x} ${y + 80} Z' fill='none' stroke='#ff4a6a' stroke-width='11'/>`);
ic('n_kreuz', 7, (x, y) => `<path d='M${x - 30} ${y - 90} h60 v60 h60 v60 h-60 v60 h-60 v-60 h-60 v-60 h60 z' fill='none' stroke='#7dff6a' stroke-width='10'/>`);
// ---------- unten links: senkrechte Fassadenschilder (256 × 768) ----------
function vertical(name, i, word, col, plate = true) {
  const c = cell(name, i * 256, 1536, 256, 512);
  if (plate) svg += `<rect x='${c.x + 22}' y='${c.y + 6}' width='212' height='500' rx='10' fill='#14161a'/>`;
  const step = 470 / word.length;
  [...word].forEach((ch, k) => { const cc = { x: c.x, y: c.y + 18 + k * step, w: 256, h: step }; svg += neon(cc, ch, col, Math.min(130, step * 0.92), FONT, 0); });
}
vertical('v_nudeln', 0, 'NUDELN', '#ff5a2a'); vertical('v_kapsel', 1, 'KAPSEL', '#4affc8'); vertical('v_bar', 2, 'BAR', '#ff3ad0'); vertical('v_offen', 3, 'OFFEN', '#7dff6a');
// ---------- unten rechts: zwei Werbewände (512 × 512) ----------
{ const c = cell('a_lumen', 1024, 1536, 512, 512), x = c.x, y = c.y;
  svg += `<rect x='${x}' y='${y}' width='512' height='512' fill='url(#ga)'/><circle cx='${x + 256}' cy='${y + 190}' r='120' fill='none' stroke='#fff' stroke-width='10'/><circle cx='${x + 256}' cy='${y + 190}' r='80' fill='none' stroke='#ffd0f4' stroke-width='5' stroke-dasharray='20 10'/>`;
  svg += `<text x='${x + 256}' y='${y + 395}' ${FONT} font-size='72' text-anchor='middle' letter-spacing='12' fill='#fff'>LUMEN</text><text x='${x + 256}' y='${y + 455}' ${FONT} font-size='26' text-anchor='middle' letter-spacing='6' fill='#ffe0fa'>WIR ERHELLEN DIE NACHT</text>`; }
{ const c = cell('a_volta', 1536, 1536, 512, 512), x = c.x, y = c.y;
  svg += `<rect x='${x}' y='${y}' width='512' height='512' fill='url(#gb)'/>`;
  for (let k = 0; k < 4; k++) svg += `<rect x='${x + 120 + k * 72}' y='${y + 90}' width='52' height='190' rx='10' fill='none' stroke='#5affe0' stroke-width='8'/><rect x='${x + 128 + k * 72}' y='${y + 98 + (3 - k) * 30}' width='36' height='${174 - (3 - k) * 30}' rx='4' fill='#5affe0' fill-opacity='0.8'/>`;
  svg += `<text x='${x + 256}' y='${y + 385}' ${FONT} font-size='96' text-anchor='middle' letter-spacing='14' fill='#fff'>VOLTA</text><text x='${x + 256}' y='${y + 450}' ${FONT} font-size='26' text-anchor='middle' letter-spacing='6' fill='#c8fff4'>VOLLE LADUNG · ÜBERALL</text>`; }
svg += '</svg>';
await sharp(Buffer.from(svg)).resize(N, N).removeAlpha().png().toFile('asset-src/tex/kit_city2@2048.png');
fs.writeFileSync('asset-src/neu/baukasten/kit_city2.json', JSON.stringify({ px: N, cells: F }, null, 1));
console.log(Object.keys(F).length, 'Felder');
