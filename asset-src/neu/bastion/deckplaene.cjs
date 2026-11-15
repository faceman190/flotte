// Vier Entwürfe für das Deck der Bastion als Zellkarten (4 × 4 m je Zeichen), geprüft und als Draufsicht gezeichnet.
// Aufruf: node deckplaene.cjs   →  plan-A.png … plan-D.png, plan-alle.jpg in diesem Ordner
// Zeichen: G Gang · g Gang mit Schott · H Tor zum Hangar · P Tor zur Promenade · . Schiffskörper
//          Großbuchstabe = Raumzelle, Kleinbuchstabe = Raumzelle mit Tür zum angrenzenden Gang
// Das Format entspricht PLAN in bk_plan.py (dort stehen Türen und Schotte in DOORS und BULK; die Ausgabe unten nennt sie in dieser Form).
const path = require('path'), fs = require('fs');
const sharp = require(path.join('C:/Users/faceman/Desktop/CLAUDE/letzte-flotte/node_modules/sharp'));
const NAMES = { T: 'Treffpunkt', B: 'Besprechung', M: 'Maschinen', S: 'Spinde', L: 'Lager', Q: 'Quartier', W: 'Werkstatt', K: 'Krankenstation' };
const COL = { T: '#8a6424', B: '#255a7c', M: '#4d4f5a', S: '#3d6450', L: '#66503a', Q: '#674468', W: '#7a4630', K: '#2c7470' };
const PLANS = [
  { id: 'A', name: 'Rückgrat', sub: 'Ein Hauptgang mit zwei Versätzen, Räume links und rechts, ein Seitengang zu den Quartieren. Kurz und übersichtlich.', map: [
    '.WWW..BBBB..........',
    '.WWW..BBBB...TTTT...',
    '.WwW..BbBB...TTTT...',
    'HGGGGgGGG....TtTT.KK',
    '.QQ.S.M.GGGgGGGGG.kK',
    '.Qq.s.m.G..Ll...GGGP',
    '..GGGGGGG..LL.......'] },
  { id: 'B', name: 'Ringdeck', sub: 'Ein Rundgang um den Treffpunkt in der Mitte. Die Mittelachse führt durch den Treffpunkt, der Ring außen herum.', map: [
    '...BBBB...WWW..KK..',
    '...BbBB...WwW..Kk..',
    '.GGGGGGGgGGGGgGGGG.',
    '.G..S.G.TTT.G.L..G.',
    'HG..s.G.TTT.G.l..GP',
    '.GGGGGGGtTtGGGGGGG.',
    '.G....G.TTT.G....G.',
    '.GGGGGGgGGGGgGGGGG.',
    '...QqQ..MmM..QqQ...',
    '...QQQ..MMM..QQQ...'] },
  { id: 'C', name: 'Zwei Stränge', sub: 'Mannschaftsgang (oben) und Betriebsgang (unten) laufen versetzt nebeneinander, in der Mitte ein Quergang zum Treffpunkt.', map: [
    '...QQQ..TTTT...KKK....',
    '...QqQ..TTTT...KkK....',
    '.GGGGGG.TtTT.GGGGGGGG.',
    '.G....G..G...G.BBbB.G.',
    'HG.SS.GGGGgGGG.BBBB.GP',
    '.G.sS....G.....BBBB.G.',
    '.GGGGGG..G..GGGGGGGGG.',
    '..mMM.GGGgGGG..LlL.WwW',
    '..MMM..........LLL.WWW'] },
  { id: 'D', name: 'Verwinkelt', sub: 'Gewachsenes Deck: Der Weg knickt oft ab und führt mitten durch den Treffpunkt. Besprechung am Ende einer Sackgasse.', map: [
    '..WWW....BBBB........',
    '..WwW.MM.BBBB..KKK...',
    '.GGGG.Mm.BbBB..KkK.QQ',
    '.G..GgGGGGG..GGGGG.Qq',
    'HG.S..G......g.L.GGGG',
    '.G.s..G.TTT..G.l.G...',
    '.GGGG.GGtTtGGGGG.GGGP',
    '..Qq..G.TTT..G.......',
    '..QQ..GGGGgGGG.......'] },
];
const DIRS = [[-1, 0], [0, 1], [1, 0], [0, -1]];      // Nord, Ost, Süd, West
const isG = ch => 'GgHP'.includes(ch), isRoom = ch => /[A-Za-z]/.test(ch) && !isG(ch);
function analyse(P) {
  const M = P.map, R = M.length, C = M[0].length, at = (r, c) => (r >= 0 && r < R && c >= 0 && c < C ? M[r][c] : '.');
  const err = [];
  M.forEach((row, r) => { if (row.length !== C) err.push('Zeile ' + r + ' hat ' + row.length + ' statt ' + C + ' Zeichen'); });
  const key = (r, c) => r * 100 + c, comp = new Map(); let nc = 0; const rooms = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {      // Räume als zusammenhängende Flächen gleichen Buchstabens
    const ch = at(r, c); if (!isRoom(ch) || comp.has(key(r, c))) continue;
    const L = ch.toUpperCase(), cells = [], st = [[r, c]]; comp.set(key(r, c), nc);
    while (st.length) { const [a, b] = st.pop(); cells.push([a, b]); for (const [dr, dc] of DIRS) { const x = at(a + dr, b + dc); if (isRoom(x) && x.toUpperCase() === L && !comp.has(key(a + dr, b + dc))) { comp.set(key(a + dr, b + dc), nc); st.push([a + dr, b + dc]); } } }
    rooms.push({ id: nc++, L, cells, doors: [] });
  }
  const doors = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
    const ch = at(r, c); if (!isRoom(ch) || ch !== ch.toLowerCase()) continue;
    const adj = DIRS.map(([dr, dc], k) => [k, r + dr, c + dc]).filter(([k, a, b]) => isG(at(a, b)));
    if (!adj.length) err.push('Tür ohne Gang bei ' + r + ',' + c);
    for (const [k, a, b] of adj) { doors.push({ r, c, k, a, b }); rooms[comp.get(key(r, c))].doors.push([a, b]); }
  }
  rooms.forEach(q => { if (!q.doors.length) err.push('Raum ' + q.L + ' ohne Tür'); });
  const isDoor = (r, c, a, b) => doors.some(d => (d.r === r && d.c === c && d.a === a && d.b === b) || (d.r === a && d.c === b && d.a === r && d.b === c));
  const pass = (r, c, a, b) => { const x = at(r, c), y = at(a, b); if (x === '.' || y === '.') return false; if (isG(x) && isG(y)) return true; if (isRoom(x) && isRoom(y)) return comp.get(key(r, c)) === comp.get(key(a, b)); return isDoor(r, c, a, b); };
  let H = null, Pp = null; for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { if (at(r, c) === 'H') H = [r, c]; if (at(r, c) === 'P') Pp = [r, c]; }
  const dist = new Map([[key(...H), 0]]), prev = new Map(), qu = [H];
  while (qu.length) { const [r, c] = qu.shift(); for (const [dr, dc] of DIRS) { const a = r + dr, b = c + dc; if (!dist.has(key(a, b)) && pass(r, c, a, b)) { dist.set(key(a, b), dist.get(key(r, c)) + 1); prev.set(key(a, b), [r, c]); qu.push([a, b]); } } }
  let cells = 0, gang = 0;
  for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const ch = at(r, c); if (ch === '.') continue; cells++; if (isG(ch)) gang++; if (!dist.has(key(r, c))) err.push('nicht erreichbar: ' + r + ',' + c); }
  const way = []; for (let p = Pp; p; p = prev.get(key(...p))) way.unshift(p);
  let knicke = 0; for (let i = 2; i < way.length; i++) if (way[i][0] - way[i - 1][0] !== way[i - 1][0] - way[i - 2][0] || way[i][1] - way[i - 1][1] !== way[i - 1][1] - way[i - 2][1]) knicke++;
  const to = L => Math.min(...rooms.filter(q => q.L === L).map(q => Math.min(...q.cells.map(([r, c]) => dist.get(key(r, c)) ?? 999))));
  let gerade = 0;      // längstes gerades Gangstück ohne Schott
  for (const [dr, dc] of [[0, 1], [1, 0]]) for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { if (!isG(at(r, c)) || (isG(at(r - dr, c - dc)) && at(r, c) !== 'g')) continue; let n = 1; while (isG(at(r + dr * n, c + dc * n)) && at(r + dr * n, c + dc * n) !== 'g') n++; gerade = Math.max(gerade, n); }
  return { R, C, at, rooms, doors, comp, key, H, Pp, way, err, cells, gang, knicke, gerade, mHP: (way.length - 1) * 4, mT: to('T') * 4, mB: to('B') * 4 };
}
function draw(P, A) {
  const S = 46, L0 = 150, T0 = 118, RW = 190, BH = 150, W = L0 + A.C * S + RW, Hh = T0 + A.R * S + BH, x = c => L0 + c * S, y = r => T0 + r * S, o = [];
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${Hh}" font-family="Arial, Helvetica, sans-serif">`);
  o.push(`<defs><pattern id="hz" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="14" fill="#141b23"/><rect width="5" height="14" fill="#1b2530"/></pattern></defs>`);
  o.push(`<rect width="${W}" height="${Hh}" fill="#0a0e13"/>`);
  o.push(`<text x="28" y="48" fill="#f2f5f8" font-size="30" font-weight="bold">Plan ${P.id}  ·  ${esc(P.name)}</text><text x="28" y="80" fill="#9fb0bf" font-size="16">${esc(P.sub)}</text>`);
  o.push(`<rect x="${x(0) - 10}" y="${y(0) - 10}" width="${A.C * S + 20}" height="${A.R * S + 20}" rx="14" fill="#121920" stroke="#2a3642" stroke-width="2"/>`);      // Schiffskörper
  o.push(`<rect x="26" y="${y(0) - 10}" width="${L0 - 44}" height="${A.R * S + 20}" fill="url(#hz)" stroke="#2a3642" stroke-width="2"/>`);                                 // Hangar
  o.push(`<text transform="translate(${26 + (L0 - 44) / 2 + 8},${y(A.R / 2)}) rotate(-90)" text-anchor="middle" fill="#c8d2db" font-size="22" font-weight="bold" letter-spacing="4">HANGAR</text>`);
  o.push(`<text transform="translate(${26 + (L0 - 44) / 2 + 30},${y(A.R / 2)}) rotate(-90)" text-anchor="middle" fill="#7f909f" font-size="12">Rückwand, 184 m breit</text>`);
  const [pr, pc] = A.Pp, px = x(pc + 1) + 12, ph = 3.25 * S, py = y(pr) + S / 2 - ph / 2;                                                                               // Promenade
  o.push(`<path d="M${px + 120} ${py} H${px} V${py + ph} H${px + 120}" fill="url(#hz)" stroke="#2a3642" stroke-width="2"/><path d="M${px + 120} ${py} V${py + ph}" stroke="#2a3642" stroke-width="2" stroke-dasharray="7 6"/>`);
  o.push(`<text x="${px + 60}" y="${py + ph / 2 - 2}" text-anchor="middle" fill="#c8d2db" font-size="15" font-weight="bold" letter-spacing="1">PROMENADE</text><text x="${px + 60}" y="${py + ph / 2 + 17}" text-anchor="middle" fill="#7f909f" font-size="12">13 × 44 m  →</text>`);
  for (let r = 0; r < A.R; r++) for (let c = 0; c < A.C; c++) {      // Flächen
    const ch = A.at(r, c); if (ch === '.') continue;
    o.push(`<rect x="${x(c)}" y="${y(r)}" width="${S + 0.5}" height="${S + 0.5}" fill="${isG(ch) ? '#35434f' : COL[ch.toUpperCase()]}"/>`);
  }
  for (let r = 0; r < A.R; r++) for (let c = 0; c < A.C; c++) {      // Raster, Wände, Türen
    const ch = A.at(r, c); if (ch === '.') continue;
    DIRS.forEach(([dr, dc], k) => {
      const a = r + dr, b = c + dc, nb = A.at(a, b);
      const x1 = k === 1 ? x(c + 1) : x(c), y1 = k === 2 ? y(r + 1) : y(r), x2 = k === 3 ? x(c) : x(c + 1), y2 = k === 0 ? y(r) : y(r + 1);
      const same = nb !== '.' && ((isG(ch) && isG(nb)) || (isRoom(ch) && isRoom(nb) && A.comp.get(A.key(r, c)) === A.comp.get(A.key(a, b))));
      if (same) { if (k === 1 || k === 2) o.push(`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="#000" stroke-opacity="0.16" stroke-width="1"/>`); return; }
      const door = A.doors.some(d => (d.r === r && d.c === c && d.a === a && d.b === b) || (d.a === r && d.b === c && d.r === a && d.c === b));
      if (!door) { o.push(`<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${nb === '.' ? '#aebccb' : '#8395a6'}" stroke-width="${nb === '.' ? 4 : 3}" stroke-linecap="square"/>`); return; }
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ux = (x2 - x1) / S, uy = (y2 - y1) / S, g = 11;      // Tür: Wand mit Lücke, Türblatt in Petrol
      o.push(`<path d="M${x1} ${y1} L${mx - ux * g} ${my - uy * g} M${mx + ux * g} ${my + uy * g} L${x2} ${y2}" stroke="#8395a6" stroke-width="3" stroke-linecap="square"/>`);
      o.push(`<path d="M${mx - ux * g} ${my - uy * g} L${mx + ux * g} ${my + uy * g}" stroke="#3fe0c8" stroke-width="5"/>`);
    });
    if (ch === 'g') {      // Schott quer zum Gang
      const ew = (isG(A.at(r, c - 1)) && isG(A.at(r, c + 1))) || !(isG(A.at(r - 1, c)) || isG(A.at(r + 1, c))), cx = x(c) + S / 2, cy = y(r) + S / 2, q = S / 2, g = 9;
      o.push(ew ? `<path d="M${cx} ${cy - q} V${cy - g} M${cx} ${cy + g} V${cy + q}" stroke="#ffb347" stroke-width="6"/>` : `<path d="M${cx - q} ${cy} H${cx - g} M${cx + g} ${cy} H${cx + q}" stroke="#ffb347" stroke-width="6"/>`);
    }
    if (ch === 'H' || ch === 'P') {      // Tor
      const gx = ch === 'H' ? x(c) : x(c + 1);
      o.push(`<path d="M${gx} ${y(r) + 5} V${y(r + 1) - 5}" stroke="#ffb347" stroke-width="9"/><path d="M${gx} ${y(r) + 5} V${y(r + 1) - 5}" stroke="#0a0e13" stroke-width="2" stroke-dasharray="5 5"/>`);
    }
  }
  o.push(`<path d="M${A.way.map(([r, c]) => (x(c) + S / 2) + ' ' + (y(r) + S / 2)).join(' L')}" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2.5" stroke-dasharray="3 7" stroke-linecap="round" stroke-linejoin="round"/>`);
  for (const q of A.rooms) {      // Raumnamen
    const cx = q.cells.reduce((s, [r, c]) => s + x(c) + S / 2, 0) / q.cells.length, cy = q.cells.reduce((s, [r, c]) => s + y(r) + S / 2, 0) / q.cells.length;
    const rs = q.cells.map(v => v[0]), cs = q.cells.map(v => v[1]), w = (Math.max(...cs) - Math.min(...cs) + 1), h = (Math.max(...rs) - Math.min(...rs) + 1), nm = NAMES[q.L];
    const narrow = w * S < nm.length * 8.5 + 6, fs_ = narrow && h * S < nm.length * 8.5 ? 10.5 : 13.5;
    const tf = narrow && h > w ? ` transform="rotate(-90 ${cx} ${cy})"` : '';
    o.push(`<text x="${cx}" y="${cy + (q.cells.length > 2 ? -1 : 4)}" text-anchor="middle" fill="#f4f6f8" font-size="${fs_}" font-weight="bold"${tf}>${nm}</text>`);
    if (q.cells.length > 2 && !tf) o.push(`<text x="${cx}" y="${cy + 15}" text-anchor="middle" fill="#f4f6f8" fill-opacity="0.7" font-size="11">${w * 4} × ${h * 4} m</text>`);
  }
  const by = y(A.R) + 44, sec = m => Math.round(m / 6);      // Kennzahlen, Maßstab, Legende
  o.push(`<path d="M${x(0)} ${by - 8} H${x(5)} M${x(0)} ${by - 14} V${by - 2} M${x(5)} ${by - 14} V${by - 2}" stroke="#c8d2db" stroke-width="2"/><text x="${x(5) + 10}" y="${by - 3}" fill="#c8d2db" font-size="13">20 m  (eine Zelle = 4 m)</text>`);
  const kz = [`Deck ${A.C * 4} × ${A.R * 4} m`, `${A.cells} Zellen, davon ${A.gang} Gang`, `Hangar → Promenade ${A.mHP} m (etwa ${sec(A.mHP)} s zu Fuß), ${A.knicke} Knicke`, `Hangar → Treffpunkt ${A.mT} m`, `Hangar → Besprechung ${A.mB} m`, `längstes gerades Gangstück ${A.gerade * 4} m`];
  o.push(`<text x="28" y="${by + 30}" fill="#e3e9ef" font-size="15">${esc(kz.slice(0, 3).join('   ·   '))}</text><text x="28" y="${by + 54}" fill="#e3e9ef" font-size="15">${esc(kz.slice(3).join('   ·   '))}</text>`);
  let lx = 28; const ly = by + 84;
  const leg = (svg, txt, wd) => { o.push(`<g transform="translate(${lx},${ly})">${svg}<text x="34" y="5" fill="#9fb0bf" font-size="13">${txt}</text></g>`); lx += wd; };
  leg(`<rect x="0" y="-9" width="24" height="16" fill="#35434f"/>`, 'Gang', 90); leg(`<path d="M0 0 H24" stroke="#3fe0c8" stroke-width="5"/>`, 'Tür', 80); leg(`<path d="M12 -10 V-3 M12 3 V10" stroke="#ffb347" stroke-width="6"/>`, 'Schott', 100);
  leg(`<path d="M12 -10 V10" stroke="#ffb347" stroke-width="9"/><path d="M12 -10 V10" stroke="#0a0e13" stroke-width="2" stroke-dasharray="5 5"/>`, 'Tor', 80); leg(`<path d="M0 0 H24" stroke="#fff" stroke-opacity="0.6" stroke-width="2.5" stroke-dasharray="3 7" stroke-linecap="round"/>`, 'kürzester Weg Hangar → Promenade', 270);
  leg(`<rect x="0" y="-9" width="24" height="16" fill="#121920" stroke="#aebccb" stroke-width="2"/>`, 'Schiffskörper', 140);
  o.push('</svg>'); return { svg: o.join(''), W, H: Hh };
}
(async () => {
  const out = [];
  for (const P of PLANS) {
    const A = analyse(P), d = draw(P, A), f = path.join(__dirname, `plan-${P.id}.png`);
    await sharp(Buffer.from(d.svg)).png().toFile(f); out.push({ f, W: d.W, H: d.H });
    console.log(`Plan ${P.id} ${P.name}: ${A.C}x${A.R} Zellen, ${A.cells} belegt (${A.gang} Gang), H-P ${A.mHP} m, ${A.knicke} Knicke, T ${A.mT} m, B ${A.mB} m, gerade ${A.gerade * 4} m, Räume ${A.rooms.map(q => q.L).join('')}` + (A.err.length ? '\n  FEHLER: ' + A.err.join('; ') : ''));
    if (process.argv.includes('--tueren')) console.log('  DOORS ' + JSON.stringify(A.doors.map(q => [[q.a, q.b], [q.r, q.c]])));
  }
  const cw = Math.max(...out.map(q => q.W)), chh = Math.max(...out.map(q => q.H));      // alle vier auf ein Blatt
  await sharp({ create: { width: cw * 2, height: chh * 2, channels: 3, background: '#0a0e13' } }).composite(out.map((q, i) => ({ input: q.f, left: (i % 2) * cw, top: Math.floor(i / 2) * chh }))).jpeg({ quality: 92 }).toFile(path.join(__dirname, 'plan-alle.jpg'));
  console.log('plan-alle.jpg', cw * 2, chh * 2);
})();
