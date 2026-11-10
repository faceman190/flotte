import { $, esc } from '../core/util';
import { snd } from '../core/audio';
import { P, saveGame } from '../game/state';
import { SECTORS, SECTOR, FACTION, findRoute, type SectorDef } from '../data/galaxy';
import { ITEMS } from '../data/items';
import { sectorOres } from '../data/ores';
import { PLANETS, PTYPE } from '../data/planets';

// Galaxiekarte: läuft als App im Flottenband (Element #map liegt im Band-Rahmen)
const cv = $('mapC') as HTMLCanvasElement, cx = cv.getContext('2d')!;
let hover: string | null = null, sel: string | null = null, shown = false;
let ox = 0, oy = 0, sc = 1, W = 800, H = 600;

const visited = (id: string) => P.visited.includes(id);
const known = (id: string) => visited(id) || SECTOR[id].links.some(visited);

export function showMap() {
  shown = true;
  sel = P.route || P.sector;
  $('map').classList.remove('hidden');
  layout();
  renderSide();
}
export function hideMap() { shown = false; $('map').classList.add('hidden'); }
export const mapShown = () => shown;

function layout() {
  const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
  W = Math.max(200, r.width); H = Math.max(200, r.height);
  cv.width = W * d; cv.height = H * d;
  cx.setTransform(d, 0, 0, d, 0, 0);
  const side = W > 760 ? 330 : 0, bottom = W > 760 ? 0 : H * 0.44;
  const aw = W - side - 50, ah = H - 70 - bottom;
  sc = Math.min(aw / 1000, ah / 600);
  ox = 25 + (aw - 1000 * sc) / 2;
  oy = 30 + (ah - 600 * sc) / 2;
}
addEventListener('resize', () => { if (shown) layout(); });
const toScreen = (s: SectorDef) => [ox + s.map[0] * sc, oy + s.map[1] * sc];

function hitTest(mx: number, my: number) {
  let best: string | null = null, bd = 26;
  for (const s of SECTORS) {
    if (!known(s.id)) continue;
    const [x, y] = toScreen(s), d = Math.hypot(mx - x, my - y);
    if (d < bd) { bd = d; best = s.id; }
  }
  return best;
}
cv.addEventListener('mousemove', e => {
  const h = hitTest(e.offsetX, e.offsetY);
  if (h !== hover) { hover = h; if (h) { sel = h; renderSide(); } }
  cv.style.cursor = h ? 'pointer' : 'default';
});
cv.addEventListener('click', e => {
  const h = hitTest(e.offsetX, e.offsetY);
  if (!h) return;
  sel = h;
  if (h === P.sector || h === P.route) P.route = null;
  else P.route = h;
  snd(700, 0.08, 'sine', 0.04, 200);
  saveGame();
  renderSide();
});

const HOLO = '#5fd0ff';
export function drawMap() {
  if (!shown) return;
  const t = performance.now() / 1000;
  if (Math.abs(cv.getBoundingClientRect().width - W) > 1) layout();
  cx.clearRect(0, 0, W, H);
  // Raster
  cx.strokeStyle = 'rgba(95,208,255,.06)'; cx.lineWidth = 1;
  for (let x = 0; x <= 1000; x += 50) { cx.beginPath(); cx.moveTo(ox + x * sc, oy); cx.lineTo(ox + x * sc, oy + 600 * sc); cx.stroke(); }
  for (let y = 0; y <= 600; y += 50) { cx.beginPath(); cx.moveTo(ox, oy + y * sc); cx.lineTo(ox + 1000 * sc, oy + y * sc); cx.stroke(); }
  // Zonen-Schimmer
  for (const s of SECTORS) {
    if (!known(s.id)) continue;
    const [x, y] = toScreen(s), r = 110 * sc, g = cx.createRadialGradient(x, y, 0, x, y, r);
    const col = s.faction === 'core' ? '255,179,71' : s.faction === 'border' ? '242,211,107' : '192,112,255';
    g.addColorStop(0, `rgba(${col},.10)`); g.addColorStop(1, `rgba(${col},0)`);
    cx.fillStyle = g; cx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Verbindungen
  for (const s of SECTORS) for (const l of s.links) {
    if (s.id > l || !(visited(s.id) || visited(l)) || !known(s.id) || !known(l)) continue;
    const [x1, y1] = toScreen(s), [x2, y2] = toScreen(SECTOR[l]);
    cx.strokeStyle = 'rgba(150,200,230,.25)'; cx.lineWidth = 1.5; cx.setLineDash([]);
    cx.beginPath(); cx.moveTo(x1, y1); cx.lineTo(x2, y2); cx.stroke();
  }
  // Route
  const route = P.route ? findRoute(P.sector, P.route) : null;
  if (route && route.length > 1) {
    cx.strokeStyle = HOLO; cx.lineWidth = 3; cx.setLineDash([10, 6]); cx.lineDashOffset = -t * 20;
    cx.shadowColor = HOLO; cx.shadowBlur = 8;
    cx.beginPath();
    route.forEach((id, i) => { const [x, y] = toScreen(SECTOR[id]); if (i) cx.lineTo(x, y); else cx.moveTo(x, y); });
    cx.stroke(); cx.setLineDash([]); cx.shadowBlur = 0;
  }
  // Sektoren
  for (const s of SECTORS) {
    if (!known(s.id)) continue;
    const [x, y] = toScreen(s), v = visited(s.id), col = FACTION[s.faction].c, r = 9;
    cx.globalAlpha = v ? 1 : 0.45;
    cx.fillStyle = '#06101a'; cx.strokeStyle = col; cx.lineWidth = 2;
    cx.beginPath(); cx.arc(x, y, r, 0, Math.PI * 2); cx.fill(); cx.stroke();
    if (v) { cx.fillStyle = col; cx.beginPath(); cx.arc(x, y, 4, 0, Math.PI * 2); cx.fill(); }
    if (s.hives && v) { cx.fillStyle = '#c070ff'; cx.font = '700 11px "Share Tech Mono",Consolas,monospace'; cx.textAlign = 'center'; cx.fillText('⬢', x + 14, y - 10); }
    if (s.stations.length && v) { cx.fillStyle = HOLO; cx.fillRect(x - 13, y - 13, 5, 5); }
    cx.fillStyle = v ? '#e4eef5' : '#8aa0b0'; cx.font = (s.id === sel ? '700 ' : '') + '12px "Share Tech Mono",Consolas,monospace'; cx.textAlign = 'center';
    cx.fillText(v ? s.name : s.name + ' ?', x, y + 24);
    cx.globalAlpha = 1;
    if (s.id === P.home.sector) { cx.fillStyle = '#7fe0a0'; cx.font = '11px "Share Tech Mono",Consolas,monospace'; cx.fillText('⌂', x - 15, y + 4); }
    if (P.fleet.some(r => r.loc.sector === s.id)) { cx.fillStyle = '#7fe0a0'; cx.font = '700 11px "Share Tech Mono",Consolas,monospace'; cx.fillText('▲', x - 15, y - 10); }
    if (P.contracts.some(c => c.sector === s.id)) { cx.fillStyle = '#ffb347'; cx.font = '700 12px "Share Tech Mono",Consolas,monospace'; cx.fillText('◆', x + 15, y + 5); }
    if (s.id === sel || s.id === hover) { cx.strokeStyle = 'rgba(255,255,255,.6)'; cx.lineWidth = 1; cx.beginPath(); cx.arc(x, y, r + 6, 0, Math.PI * 2); cx.stroke(); }
    if (s.id === P.route) { cx.strokeStyle = HOLO; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, r + 9, 0, Math.PI * 2); cx.stroke(); }
  }
  // Eigene Position
  const [px, py] = toScreen(SECTOR[P.sector]), pr = 14 + Math.sin(t * 3) * 3;
  cx.strokeStyle = '#ffffff'; cx.lineWidth = 2; cx.beginPath(); cx.arc(px, py, pr, 0, Math.PI * 2); cx.stroke();
  cx.fillStyle = '#ffffff'; cx.font = '700 11px "Share Tech Mono",Consolas,monospace'; cx.textAlign = 'center'; cx.fillText('DU', px, py - pr - 6);
  // Legende
  cx.textAlign = 'left'; cx.font = '11px "Share Tech Mono",Consolas,monospace';
  const lg = [['#ffb347', 'Menschenraum'], ['#f2d36b', 'Grenzgebiet'], ['#c070ff', 'Ferrox-Gebiet']];
  lg.forEach(([c, n], i) => { cx.fillStyle = c; cx.beginPath(); cx.arc(22, H - 74 + i * 18, 5, 0, Math.PI * 2); cx.fill(); cx.fillStyle = '#8aa0b0'; cx.fillText(n, 34, H - 70 + i * 18); });
  cx.fillStyle = '#8aa0b0'; cx.fillText('■ Station   ⬢ Bienenstock   ⌂ Heimathafen   ◆ Auftragsziel   ▲ eigene Schiffe   ? unerforscht   · Klick: Route setzen', 18, H - 14);
}

function resourceSummary(s: SectorDef) {
  return sectorOres(s).map(o => `<span style="color:${ITEMS[o.k].c}">${ITEMS[o.k].n} ${Math.round(o.p * 100)} %</span>`).join('<br>') || '—';
}
function renderSide() {
  const id = sel || P.sector, s = SECTOR[id], v = visited(id), fac = FACTION[s.faction];
  const route = findRoute(P.sector, id), jumps = route ? route.length - 1 : 0;
  let h = `<h2 style="margin-bottom:4px">${esc(s.name.toUpperCase())}</h2><div class="hint" style="margin-bottom:10px">${id === P.sector ? 'Dein aktueller Sektor' : v ? 'Erkundet' : 'Unerforscht'}</div>
    <div class="row"><span class="hint">Zone</span><b style="color:${fac.c}">${fac.n}</b></div>
    <div class="row"><span class="hint">Gefahr</span><span>${Array.from({ length: 5 }, (_, i) => `<span style="color:${i < s.danger ? (s.danger >= 4 ? '#c070ff' : s.danger >= 2 ? '#ffb347' : '#7fe0a0') : '#1e3a4a'}">●</span>`).join('')}</span></div>`;
  if (id !== P.sector) h += `<div class="row"><span class="hint">Entfernung</span><span>${jumps} ${jumps === 1 ? 'Sprung' : 'Sprünge'}</span></div>`;
  if (v) {
    h += `<p style="font-size:13px">${esc(s.desc)}</p>
      <div class="row"><span class="hint">Rohstoffe</span><span style="text-align:right">${resourceSummary(s)}</span></div>
      <div class="row"><span class="hint">Stationen</span><span style="text-align:right">${s.stations.map(st => esc(st.name)).join(', ') || 'keine'}</span></div>`;
    const pl = PLANETS[s.id];
    if (pl) h += `<div class="row"><span class="hint">Planet</span><span style="text-align:right;color:#7cc4ff">${esc(pl.name)}<br><span class="hint">${PTYPE[pl.type].n}${pl.base ? ' · ' + esc(pl.base) : ''}</span></span></div>`;
    if (s.hives) h += `<div class="row"><span class="hint">Ferrox</span><span class="vio">${s.hives} Bienenstock${s.hives > 1 ? 'e' : ''}</span></div>`;
  } else h += `<p style="font-size:13px">Noch keine Daten. Fliege hin, um den Sektor zu erkunden.</p>`;
  const parked = P.fleet.filter(r => r.loc.sector === id);
  if (parked.length) h += `<h3>DEINE SCHIFFE HIER</h3>` + parked.map(r => `<div class="row"><span>${esc(r.name)}</span><span class="hint">${esc(s.stations.find(x => x.id === r.loc.station)?.name || '')}</span></div>`).join('');
  const jobs = P.contracts.filter(c => c.sector === id);
  if (jobs.length) h += `<h3>AUFTRÄGE HIER</h3>` + jobs.map(c => `<div class="row"><span style="color:${ITEMS[c.item].c}">${c.amount}× ${ITEMS[c.item].n}</span><span class="amb">${c.reward} Cr</span></div><div class="hint" style="margin:-2px 0 6px">an ${esc(c.stName)} · ${Math.min(P.cargo[c.item], c.amount)}/${c.amount} an Bord</div>`).join('');
  if (id !== P.sector) h += `<div class="btnRow" style="justify-content:stretch"><button class="${P.route === id ? '' : 'pri'}" style="flex:1" id="mapRouteBtn">${P.route === id ? 'Route löschen' : 'Route setzen'}</button></div>`;
  $('mapSide').innerHTML = h;
  const rb = document.getElementById('mapRouteBtn');
  if (rb) rb.onclick = () => { P.route = P.route === id ? null : id; saveGame(); renderSide(); };
}
