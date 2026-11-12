// Erzeugt den Leuchtschild-Atlas des Baukastens (asset-src/tex/kit_signs@2048.png) und die Liste der Felder (asset-src/neu/baukasten/kit_signs.json).
// Obere Hälfte: Wegweiser, Hallennummern, Piktogramme, Abflugtafel in Weiß auf Schwarz. Das Spiel färbt sie in der Akzentfarbe der Station (kit_sign).
// Untere Hälfte: vier farbige Werbetafeln (kit_poster). Alles eigene Entwürfe mit Namen aus der Spielwelt.
// Aufruf: node scripts/make-kit-signs.mjs   (danach npm run assets)
import fs from 'fs';
import sharp from 'sharp';
const N = 2048, F = {};
const cell = (name, x, y, w, h) => { F[name] = { x, y, w, h }; return { x, y, w, h }; };
const FONT = "font-family='Bahnschrift, Segoe UI Semibold, Segoe UI, Arial' font-weight='600'";
const W = '#ffffff', G = '#9a9a9a';
// Rahmen mit abgeschrägten Ecken und kleinen Technik-Marken
const frame = (x, y, w, h, c = 26, sw = 5) => `<path d='M${x + c} ${y} H${x + w} V${y + h - c} L${x + w - c} ${y + h} H${x} V${y + c} Z' fill='none' stroke='${W}' stroke-width='${sw}'/>` +
  `<path d='M${x + w - 120} ${y + 14} h26 m10 0 h26 m10 0 h26' stroke='${W}' stroke-width='5'/><path d='M${x + 16} ${y + h - 16} h90' stroke='${G}' stroke-width='4'/>`;
const ibox = (x, y, s) => `<rect x='${x}' y='${y}' width='${s}' height='${s}' rx='${s * 0.12}' fill='none' stroke='${W}' stroke-width='${Math.max(3, s * 0.045)}'/>`;
// Piktogramme, gezeichnet in ein Quadrat der Größe s
const ICON = {
  ship: (x, y, s) => `<path d='M${x + s * 0.5} ${y + s * 0.14} L${x + s * 0.62} ${y + s * 0.5} L${x + s * 0.86} ${y + s * 0.74} L${x + s * 0.6} ${y + s * 0.7} L${x + s * 0.5} ${y + s * 0.86} L${x + s * 0.4} ${y + s * 0.7} L${x + s * 0.14} ${y + s * 0.74} L${x + s * 0.38} ${y + s * 0.5} Z' fill='${W}'/>`,
  crate: (x, y, s) => `<path d='M${x + s * 0.2} ${y + s * 0.34} L${x + s * 0.5} ${y + s * 0.2} L${x + s * 0.8} ${y + s * 0.34} V${y + s * 0.7} L${x + s * 0.5} ${y + s * 0.84} L${x + s * 0.2} ${y + s * 0.7} Z M${x + s * 0.2} ${y + s * 0.34} L${x + s * 0.5} ${y + s * 0.48} L${x + s * 0.8} ${y + s * 0.34} M${x + s * 0.5} ${y + s * 0.48} V${y + s * 0.84}' fill='none' stroke='${W}' stroke-width='${s * 0.06}' stroke-linejoin='round'/>`,
  tool: (x, y, s) => { let p = ''; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; p += `${i ? 'L' : 'M'}${x + s * 0.5 + Math.cos(a) * s * 0.3} ${y + s * 0.5 + Math.sin(a) * s * 0.3} `; } return `<path d='${p}Z' fill='none' stroke='${W}' stroke-width='${s * 0.08}'/><circle cx='${x + s * 0.5}' cy='${y + s * 0.5}' r='${s * 0.11}' fill='${W}'/>`; },
  info: (x, y, s) => `<circle cx='${x + s * 0.5}' cy='${y + s * 0.28}' r='${s * 0.07}' fill='${W}'/><rect x='${x + s * 0.44}' y='${y + s * 0.42}' width='${s * 0.12}' height='${s * 0.4}' rx='${s * 0.03}' fill='${W}'/>`,
  person: (x, y, s) => `<circle cx='${x + s * 0.5}' cy='${y + s * 0.24}' r='${s * 0.09}' fill='${W}'/><path d='M${x + s * 0.34} ${y + s * 0.4} H${x + s * 0.66} V${y + s * 0.62} H${x + s * 0.58} V${y + s * 0.86} H${x + s * 0.42} V${y + s * 0.62} H${x + s * 0.34} Z' fill='${W}'/>`,
  view: (x, y, s) => `<circle cx='${x + s * 0.5}' cy='${y + s * 0.5}' r='${s * 0.14}' fill='${W}'/><path d='M${x + s * 0.14} ${y + s * 0.5} Q${x + s * 0.5} ${y + s * 0.14} ${x + s * 0.86} ${y + s * 0.5} Q${x + s * 0.5} ${y + s * 0.86} ${x + s * 0.14} ${y + s * 0.5} Z' fill='none' stroke='${W}' stroke-width='${s * 0.06}'/>`,
  exit: (x, y, s) => `<path d='M${x + s * 0.56} ${y + s * 0.2} H${x + s * 0.8} V${y + s * 0.8} H${x + s * 0.56}' fill='none' stroke='${W}' stroke-width='${s * 0.07}'/><path d='M${x + s * 0.18} ${y + s * 0.5} H${x + s * 0.6} M${x + s * 0.44} ${y + s * 0.34} L${x + s * 0.62} ${y + s * 0.5} L${x + s * 0.44} ${y + s * 0.66}' fill='none' stroke='${W}' stroke-width='${s * 0.08}' stroke-linecap='round' stroke-linejoin='round'/>`,
};
const arrow = (x, y, s, dir) => { const r = { u: 0, r: 90, d: 180, l: 270 }[dir]; return `<path transform='rotate(${r} ${x + s / 2} ${y + s / 2})' d='M${x + s * 0.5} ${y + s * 0.18} L${x + s * 0.84} ${y + s * 0.56} H${x + s * 0.62} L${x + s * 0.5} ${y + s * 0.42} L${x + s * 0.38} ${y + s * 0.56} H${x + s * 0.16} Z M${x + s * 0.5} ${y + s * 0.5} L${x + s * 0.76} ${y + s * 0.8} H${x + s * 0.6} L${x + s * 0.5} ${y + s * 0.68} L${x + s * 0.4} ${y + s * 0.8} H${x + s * 0.24} Z' fill='${W}'/>`; };
const txt = (x, y, t, size, anchor = 'start', fill = W, sp = 3) => `<text x='${x}' y='${y}' ${FONT} font-size='${size}' text-anchor='${anchor}' letter-spacing='${sp}' fill='${fill}'>${t}</text>`;

let svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${N}' height='${N}' viewBox='0 0 ${N} ${N}'><rect width='${N}' height='${N}' fill='#000'/>`;
// ---------- Wegweiser (1024 × 256) ----------
function board(name, cx, cy, rows, foot) {
  const c = cell(name, cx, cy, 1024, 256), x = c.x, y = c.y;
  svg += frame(x + 14, y + 14, 996, 228);
  rows.forEach((r, i) => {
    const col = i % 2, row = Math.floor(i / 2), bx = x + 44 + col * 486, by = y + 40 + row * 84, n = rows.length > 2;
    const s = n ? 66 : 76, yy = n ? by : y + 52 + i * 0;
    const rx = n ? bx : x + 60, ry = n ? by : y + 44 + i * 86;
    svg += arrow(rx, ry, s, r[0]) + ibox(rx + s + 12, ry, s) + ICON[r[1]](rx + s + 12, ry, s) + txt(rx + s * 2 + 30, ry + s * 0.5 + (r[3] ? -4 : 14), r[2], r[3] ? 34 : 40) + (r[3] ? txt(rx + s * 2 + 30, ry + s * 0.5 + 30, r[3], 34) : '');
  });
  if (foot) svg += txt(x + 512, y + 232, foot, 22, 'middle', G, 8);
}
board('way_main', 0, 0, [['u', 'ship', 'HANGAR', 'ANDOCKDECK'], ['l', 'crate', 'MARKT', 'HANDEL'], ['r', 'tool', 'WERFT', 'TECHNIK'], ['u', 'view', 'AUSSICHT', 'DECK']], '· · · STATIONSLEITSYSTEM · · ·');
board('way_hangar', 1024, 0, [['u', 'ship', 'HANGAR · ANDOCKDECK'], ['d', 'person', 'PROMENADE · HANDEL']], null);
board('way_deck', 0, 256, [['u', 'view', 'AUSSICHTSDECK'], ['u', 'info', 'AUSKUNFT · MELDESTELLE']], null);
{ const c = cell('board', 1024, 256, 1024, 256), x = c.x, y = c.y;
  svg += `<rect x='${x + 14}' y='${y + 14}' width='996' height='44' fill='${W}'/>` + txt(x + 30, y + 48, 'ABFLÜGE', 34, 'start', '#000', 6) + txt(x + 994, y + 48, 'ZIEL · ZEIT · TOR · STATUS', 24, 'end', '#000', 4);
  [['HEIMSTATT', '07:40', 'T2', 'PÜNKTLICH'], ['LICHTWALL', '08:15', 'T1', 'EINSTIEG'], ['EISGARTEN', '09:05', 'T4', 'PÜNKTLICH'], ['NEUHAFEN', '09:50', 'T2', 'VERSPÄTET'], ['SONNENFELD', '11:20', 'T3', 'PÜNKTLICH']].forEach((r, i) => {
    const yy = y + 96 + i * 34; svg += txt(x + 30, yy, r[0], 28) + txt(x + 470, yy, r[1], 28) + txt(x + 640, yy, r[2], 28) + txt(x + 994, yy, r[3], 28, 'end', r[3] === 'VERSPÄTET' ? G : W) + `<path d='M${x + 30} ${yy + 8} H${x + 994}' stroke='#555' stroke-width='2'/>`; }); }
// ---------- Felder 256 × 256 ----------
const C = (name, i) => cell(name, i * 256, 512, 256, 256);
for (let k = 1; k <= 3; k++) { const c = C('hall' + k, k - 1), x = c.x, y = c.y; svg += frame(x + 30, y + 14, 196, 228, 20, 5) + txt(x + 128, y + 70, 'HALLE', 34, 'middle', W, 6) + txt(x + 128, y + 206, String(k), 150, 'middle', W, 0); }
['ship', 'crate', 'tool', 'info'].forEach((ic, i) => { const c = C('ic_' + ic, 3 + i); svg += ibox(c.x + 28, c.y + 28, 200) + ICON[ic](c.x + 28, c.y + 28, 200); });
{ const c = C('arrow', 7); svg += arrow(c.x + 18, c.y + 18, 220, 'u'); }
// ---------- breite Felder 512 × 256 ----------
{ const c = cell('shop', 0, 768, 512, 256); svg += frame(c.x + 14, c.y + 60, 484, 136, 22, 5); }
{ const c = cell('closed', 512, 768, 512, 256); svg += frame(c.x + 14, c.y + 60, 484, 136, 22, 5) + txt(c.x + 256, c.y + 146, 'GESCHLOSSEN', 50, 'middle', G, 6); }
{ const c = cell('exit', 1024, 768, 512, 256); svg += `<rect x='${c.x + 14}' y='${c.y + 50}' width='484' height='156' rx='10' fill='${W}'/>` + ICON.exit(c.x + 30, c.y + 62, 130).replaceAll(W, '#000') + txt(c.x + 172, c.y + 152, 'AUSGANG', 62, 'start', '#000', 3); }
{ const c = cell('ticker', 1536, 768, 512, 256); let s = ''; for (let r = 0; r < 5; r++) { let x = c.x + 20; let k = r * 7 + 3; while (x < c.x + 490) { const w = 12 + ((k * 37) % 70); s += `<rect x='${x}' y='${c.y + 40 + r * 38}' width='${w}' height='14' fill='${(k % 3) ? W : G}'/>`; x += w + 10; k++; } } svg += s; }
// ---------- Werbetafeln 512 × 1024 (farbig) ----------
svg += `<defs>
<linearGradient id='g1' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ffb24a'/><stop offset='0.55' stop-color='#c8501a'/><stop offset='1' stop-color='#1a0c08'/></linearGradient>
<linearGradient id='g2' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#0a1420'/><stop offset='0.6' stop-color='#1c4a78'/><stop offset='1' stop-color='#8cc8f0'/></linearGradient>
<linearGradient id='g3' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#3a0a0a'/><stop offset='1' stop-color='#b01c14'/></linearGradient>
<radialGradient id='g4' cx='0.5' cy='0.45' r='0.7'><stop offset='0' stop-color='#b070ff'/><stop offset='0.5' stop-color='#3a1a6a'/><stop offset='1' stop-color='#08040f'/></radialGradient>
<radialGradient id='sun' cx='0.5' cy='0.5' r='0.5'><stop offset='0' stop-color='#fff6d8'/><stop offset='1' stop-color='#ffb24a' stop-opacity='0'/></radialGradient>
</defs>`;
const P = (name, i) => cell(name, i * 512, 1024, 512, 1024);
{ const c = P('ad_fracht', 0), x = c.x, y = c.y;
  svg += `<rect x='${x}' y='${y}' width='512' height='1024' fill='url(#g1)'/><circle cx='${x + 256}' cy='${y + 330}' r='240' fill='url(#sun)'/><circle cx='${x + 256}' cy='${y + 330}' r='86' fill='#fff2c8'/>`;
  svg += `<path d='M${x + 40} ${y + 520} L${x + 150} ${y + 470} H${x + 400} L${x + 472} ${y + 500} V${y + 560} L${x + 430} ${y + 590} H${x + 90} Z' fill='#140a08'/><path d='M${x + 120} ${y + 470} L${x + 150} ${y + 420} H${x + 230} L${x + 250} ${y + 470} Z' fill='#140a08'/>`;
  for (let k = 0; k < 4; k++) svg += `<rect x='${x + 170 + k * 62}' y='${y + 492}' width='48' height='60' fill='#c8501a'/>`;
  svg += `<path d='M${x + 0} ${y + 640} H${x + 512}' stroke='#140a08' stroke-width='6'/>` + txt(x + 256, y + 760, 'HALDEN', 120, 'middle', '#fff2c8', 8) + txt(x + 256, y + 860, 'FRACHT', 96, 'middle', '#ffb24a', 14) + txt(x + 256, y + 950, 'WIR BRINGEN ES DURCH.', 30, 'middle', '#fff2c8', 5); }
{ const c = P('ad_werft', 1), x = c.x, y = c.y;
  svg += `<rect x='${x}' y='${y}' width='512' height='1024' fill='url(#g2)'/>`;
  for (let k = 0; k < 40; k++) svg += `<circle cx='${x + (k * 131) % 512}' cy='${y + (k * 71) % 520}' r='${1 + (k % 3)}' fill='#cfe6ff'/>`;
  svg += `<path d='M${x + 256} ${y + 150} L${x + 300} ${y + 380} L${x + 440} ${y + 560} L${x + 320} ${y + 540} L${x + 290} ${y + 640} H${x + 222} L${x + 192} ${y + 540} L${x + 72} ${y + 560} L${x + 212} ${y + 380} Z' fill='#e8f2fa'/><path d='M${x + 256} ${y + 220} L${x + 276} ${y + 360} H${x + 236} Z' fill='#1c4a78'/><path d='M${x + 222} ${y + 640} L${x + 232} ${y + 720} H${x + 280} L${x + 290} ${y + 640} Z' fill='#8cdcff'/>`;
  svg += txt(x + 256, y + 820, 'BASTION', 104, 'middle', '#ffffff', 8) + txt(x + 256, y + 900, 'WERFT', 84, 'middle', '#8cc8f0', 22) + txt(x + 256, y + 968, 'SCHIFFE FÜR DIE LETZTE CREW', 26, 'middle', '#ffffff', 4); }
{ const c = P('ad_wacht', 2), x = c.x, y = c.y; let star = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 78 : 190; star += `${i ? 'L' : 'M'}${x + 256 + Math.cos(a) * r} ${y + 340 + Math.sin(a) * r} `; }
  svg += `<rect x='${x}' y='${y}' width='512' height='1024' fill='url(#g3)'/><path d='M${x} ${y + 600} L${x + 512} ${y + 470} V${y + 1024} H${x} Z' fill='#140606'/><circle cx='${x + 256}' cy='${y + 340}' r='226' fill='none' stroke='#f4e6d8' stroke-width='10'/><path d='${star}Z' fill='#f4e6d8'/>`;
  svg += txt(x + 256, y + 720, 'GRENZ', 130, 'middle', '#f4e6d8', 10) + txt(x + 256, y + 840, 'WACHT', 130, 'middle', '#f4e6d8', 10) + `<rect x='${x + 56}' y='${y + 880}' width='400' height='74' fill='#f4e6d8'/>` + txt(x + 256, y + 930, 'DER OSTEN BRAUCHT DICH', 25, 'middle', '#3a0a0a', 3); }
{ const c = P('ad_kristall', 3), x = c.x, y = c.y;
  svg += `<rect x='${x}' y='${y}' width='512' height='1024' fill='url(#g4)'/>`;
  for (const [cx, h, w, col] of [[256, 420, 120, '#e8d0ff'], [150, 280, 90, '#b070ff'], [366, 320, 96, '#c890ff'], [90, 170, 60, '#7a3ad0'], [430, 200, 64, '#8a4ae0']]) svg += `<path d='M${x + cx} ${y + 620 - h} L${x + cx + w / 2} ${y + 620 - h * 0.72} L${x + cx + w * 0.36} ${y + 620} H${x + cx - w * 0.36} L${x + cx - w / 2} ${y + 620 - h * 0.72} Z' fill='${col}'/><path d='M${x + cx} ${y + 620 - h} L${x + cx + w * 0.08} ${y + 620} H${x + cx - w * 0.36} L${x + cx - w / 2} ${y + 620 - h * 0.72} Z' fill='#ffffff' opacity='0.22'/>`;
  svg += `<rect x='${x + 40}' y='${y + 620}' width='432' height='8' fill='#e8d0ff'/>` + txt(x + 256, y + 760, 'FERRIT', 118, 'middle', '#ffffff', 10) + txt(x + 256, y + 850, 'ANKAUF', 84, 'middle', '#d0a8ff', 18) + txt(x + 256, y + 940, 'HÖCHSTPREISE FÜR KRISTALL', 28, 'middle', '#ffffff', 4); }
svg += '</svg>';
fs.mkdirSync('asset-src/tex', { recursive: true });
await sharp(Buffer.from(svg)).resize(N, N).removeAlpha().png().toFile('asset-src/tex/kit_signs@2048.png');
fs.writeFileSync('asset-src/neu/baukasten/kit_signs.json', JSON.stringify({ px: N, cells: F }, null, 1));
console.log(Object.keys(F).length, 'Felder');
