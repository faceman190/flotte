import { $, esc } from '../core/util';
import { snd } from '../core/audio';
import { P, saveGame } from '../game/state';
import { SECTORS, SECTOR, FACTION, findRoute, type SectorDef } from '../data/galaxy';
import { ITEMS } from '../data/items';
import { sectorOres } from '../data/ores';
import { PLANETS, PTYPE } from '../data/planets';
import { world, SECTOR_RADIUS } from '../game/world';
import { navPoints, navTarget, setNav, SF, type NavPoint } from '../game/schnellflug';
import { fmtD, d3 } from '../core/util';
import { remoteMarkers } from '../game/net';

// Galaxiekarte: läuft als App im Flottenband (Element #map liegt im Band-Rahmen)
const cv = $('mapC') as HTMLCanvasElement, cx = cv.getContext('2d')!;
let hover: string | null = null, sel: string | null = null, shown = false;
let ox = 0, oy = 0, sc = 1, W = 800, H = 600;

const visited = (id: string) => P.visited.includes(id);
const known = (id: string) => visited(id) || SECTOR[id].links.some(visited);

// Zwei Ansichten (seit Alpha 1.50): Galaxie (Routen) und Sektor (Orte im aktuellen Sektor, Klick setzt das Navigationsziel für den Kurzsprung)
let view: 'gal' | 'sek' | null = null;   // null: noch nicht gewählt (großer Sektor → Sektor, sonst Galaxie)
const tabs = document.createElement('div');
tabs.id = 'mapTabs';
tabs.innerHTML = '<button data-v="sek">Sektor</button><button data-v="gal">Galaxie</button>';
$('map').appendChild(tabs);
tabs.addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!b) return;
  view = b.dataset.v as 'gal' | 'sek'; snd(600, 0.06, 'sine', 0.03, 120); syncTabs(); renderSide();
});
const sekOk = () => !!world.def && !world.surface && world.def.id === P.sector;
const curView = () => (sekOk() ? view || (world.def?.size ? 'sek' : 'gal') : 'gal');
function syncTabs() {
  const v = curView();
  for (const b of tabs.querySelectorAll('button')) { b.classList.toggle('pri', b.dataset.v === v); (b as HTMLButtonElement).disabled = b.dataset.v === 'sek' && !sekOk(); }
}

export function showMap() {
  shown = true;
  sel = P.route || P.sector;
  $('map').classList.remove('hidden');
  layout();
  syncTabs();
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
  if (curView() === 'sek') {
    const h = sekHit(e.offsetX, e.offsetY), k = h ? h.kind + ':' + h.id : null;
    if (k !== sekHover) { sekHover = k; renderSide(); }
    cv.style.cursor = h ? 'pointer' : 'default';
    return;
  }
  const h = hitTest(e.offsetX, e.offsetY);
  if (h !== hover) { hover = h; if (h) { sel = h; renderSide(); } }
  cv.style.cursor = h ? 'pointer' : 'default';
});
cv.addEventListener('click', e => {
  if (curView() === 'sek') {
    const h = sekHit(e.offsetX, e.offsetY);
    if (!h) return;
    const cur = navTarget();
    setNav(cur && cur.kind === h.kind && cur.id === h.id ? null : h);
    renderSide();
    return;
  }
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
  syncTabs();
  if (curView() === 'sek') { drawSector(t); if (t - sekSideT > 1) tickSekSide(); return; }   // Entfernungen in der Liste jede Sekunde neu
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
  if (curView() === 'sek') { renderSekSide(); return; }
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

// ---------------- Sektorkarte (seit Alpha 1.50) ----------------
// Draufsicht auf den aktuellen Sektor, Norden oben (−z). Klick auf einen Ort setzt ihn als Navigationsziel (H startet dann den Kurzsprung).
const TAU2 = Math.PI * 2;
let sekHover: string | null = null, sx0 = 0, sy0 = 0, ssc = 1;
function sekLayout() {
  const side = W > 760 ? 330 : 0, bottom = W > 760 ? 0 : H * 0.44;
  const aw = W - side - 40, ah = H - 60 - bottom, r = Math.max(60, Math.min(aw, ah) / 2 - 18);
  sx0 = 20 + aw / 2; sy0 = 44 + ah / 2; ssc = r / SECTOR_RADIUS;
}
const sekPt = (x: number, z: number) => [sx0 + x * ssc, sy0 + z * ssc];
function sekHit(mx: number, my: number): NavPoint | null {
  sekLayout();
  let best: NavPoint | null = null, bd = 18;
  for (const p of navPoints()) {
    const [x, y] = sekPt(p.x, p.z), rr = p.kind === 'field' ? p.R * ssc : 0;
    const d = Math.max(0, Math.hypot(mx - x, my - y) - rr);
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}
const FIELD_COL: Record<string, string> = { metal: '176,150,120', ice: '150,200,235', mixed: '170,170,180', crystal: '180,140,230' };
function drawSector(t: number) {
  sekLayout();
  const R = SECTOR_RADIUS, rp = R * ssc, nt = navTarget(), key = (p: NavPoint) => p.kind + ':' + p.id;
  cx.clearRect(0, 0, W, H);
  // Rand und Entfernungsringe
  const step = R > 20000 ? 10000 : 2000;
  cx.lineWidth = 1;
  for (let r = step; r < R; r += step) {
    cx.strokeStyle = 'rgba(95,208,255,.08)'; cx.beginPath(); cx.arc(sx0, sy0, r * ssc, 0, TAU2); cx.stroke();
    cx.fillStyle = 'rgba(138,160,176,.5)'; cx.font = '10px "Share Tech Mono",Consolas,monospace'; cx.textAlign = 'left';
    cx.fillText(fmtD(r), sx0 + r * ssc * 0.707 + 3, sy0 - r * ssc * 0.707 - 3);
  }
  cx.strokeStyle = 'rgba(95,208,255,.3)'; cx.setLineDash([4, 6]); cx.beginPath(); cx.arc(sx0, sy0, rp, 0, TAU2); cx.stroke(); cx.setLineDash([]);
  cx.fillStyle = 'rgba(95,208,255,.6)'; cx.font = '700 11px "Share Tech Mono",Consolas,monospace'; cx.textAlign = 'center'; cx.fillText('N', sx0, sy0 - rp - 6);
  // Planet in seiner Richtung am Rand
  const pd = world.def?.planet;
  if (pd) {
    const l = Math.hypot(pd.dir[0], pd.dir[2]) || 1, px = sx0 + pd.dir[0] / l * (rp + 2), py = sy0 + pd.dir[2] / l * (rp + 2);
    const g = cx.createRadialGradient(px, py, 0, px, py, 26); g.addColorStop(0, 'rgba(124,196,255,.35)'); g.addColorStop(1, 'rgba(124,196,255,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(px, py, 26, 0, TAU2); cx.fill();
  }
  // Orte
  for (const p of navPoints()) {
    const [x, y] = sekPt(p.x, p.z), hot = sekHover === key(p), isT = !!nt && key(nt) === key(p);
    let col = HOLO;
    if (p.kind === 'field') {
      const f = world.fields[+p.id], c = FIELD_COL[f?.def.kind || 'metal'] || FIELD_COL.metal, rr = Math.max(5, p.R * ssc);
      cx.fillStyle = `rgba(${c},${hot ? 0.22 : 0.13})`; cx.strokeStyle = `rgba(${c},.55)`; cx.lineWidth = 1;
      cx.beginPath(); cx.arc(x, y, rr, 0, TAU2); cx.fill(); cx.stroke();
      col = `rgb(${c})`;
    } else if (p.kind === 'st') {
      cx.fillStyle = '#06101a'; cx.strokeStyle = HOLO; cx.lineWidth = 2; cx.fillRect(x - 5, y - 5, 10, 10); cx.strokeRect(x - 5, y - 5, 10, 10);
      if (p.id === P.home.station) { cx.fillStyle = '#7fe0a0'; cx.font = '11px "Share Tech Mono",Consolas,monospace'; cx.textAlign = 'center'; cx.fillText('⌂', x - 14, y + 4); }
    } else if (p.kind === 'gate') {
      const g = world.gates.find(q => q.to === p.id); col = g ? FACTION[g.faction].c : HOLO;
      cx.fillStyle = col; cx.beginPath(); cx.moveTo(x, y - 7); cx.lineTo(x + 6, y + 5); cx.lineTo(x - 6, y + 5); cx.closePath(); cx.fill();
    } else if (p.kind === 'ort') {
      col = '#a8c8d8'; cx.strokeStyle = col; cx.lineWidth = 2; cx.beginPath();
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6; cx[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * 7, y + Math.sin(a) * 7); }
      cx.closePath(); cx.stroke();
    } else if (p.kind === 'mark') {
      col = '#ffb347'; cx.fillStyle = col; cx.beginPath(); cx.moveTo(x, y - 7); cx.lineTo(x + 6, y); cx.lineTo(x, y + 7); cx.lineTo(x - 6, y); cx.closePath(); cx.fill();
    } else { col = '#7cc4ff'; cx.strokeStyle = col; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, 6, 0, TAU2); cx.stroke(); }
    if (hot || isT) {
      cx.strokeStyle = isT ? '#bfe6ff' : 'rgba(255,255,255,.6)'; cx.lineWidth = isT ? 2 : 1;
      cx.beginPath(); cx.arc(x, y, (p.kind === 'field' ? Math.max(5, p.R * ssc) : 8) + 6, 0, TAU2); cx.stroke();
    }
    cx.fillStyle = hot || isT ? '#e4eef5' : col; cx.font = (hot || isT ? '700 ' : '') + '12px "Share Tech Mono",Consolas,monospace'; cx.textAlign = 'center';
    // Felder: Name über dem Kreis, Anflugzone über dem Ring (Stationen darunter), damit nahe Orte sich nicht überdecken
    cx.fillText(p.name, x, p.kind === 'field' ? y - Math.max(5, p.R * ssc) - 7 : p.kind === 'orbit' ? y - 12 : y + 20);
  }
  // Mitspieler
  for (const r of remoteMarkers()) { const [x, y] = sekPt(r.x, r.z); cx.fillStyle = '#7fe0a0'; cx.beginPath(); cx.arc(x, y, 3.5, 0, TAU2); cx.fill(); }
  // Linie zum Ziel und eigene Position (Pfeil in Flugrichtung)
  const [mx, my] = sekPt(P.x, P.z);
  if (nt) {
    const [tx, ty] = sekPt(nt.x, nt.z);
    cx.strokeStyle = '#bfe6ff'; cx.lineWidth = 1.5; cx.setLineDash([8, 6]); cx.lineDashOffset = -t * 18;
    cx.beginPath(); cx.moveTo(mx, my); cx.lineTo(tx, ty); cx.stroke(); cx.setLineDash([]);
  }
  const a = Math.atan2(-Math.cos(P.yaw), -Math.sin(P.yaw));
  cx.save(); cx.translate(mx, my); cx.rotate(a);
  cx.fillStyle = '#ffffff'; cx.beginPath(); cx.moveTo(10, 0); cx.lineTo(-6, 6); cx.lineTo(-3, 0); cx.lineTo(-6, -6); cx.closePath(); cx.fill();
  cx.restore();
  cx.fillStyle = '#ffffff'; cx.font = '700 11px "Share Tech Mono",Consolas,monospace'; cx.textAlign = 'center'; cx.fillText('DU', mx, my - 14);
  // Legende
  cx.textAlign = 'left'; cx.fillStyle = '#8aa0b0'; cx.font = '11px "Share Tech Mono",Consolas,monospace';
  cx.fillText('■ Station   ⬡ Ort   ▲ Sprungtor   ○ Anflug Planet   ● Feld   ◆ Ziel   · Klick: Navigationsziel   H: Kurzsprung   N: Ziel im Fadenkreuz', 18, H - 14);
}
let sekSideT = 0;
// jede Sekunde nur die Entfernungen nachtragen (ein Neuaufbau der Liste würde Klicks verschlucken); neu aufbauen, wenn Orte dazukommen oder wegfallen
function tickSekSide() {
  sekSideT = performance.now() / 1000;
  const pts = navPoints(), rows = $('mapSide').querySelectorAll('.row[data-k]');
  if (rows.length !== pts.length) { renderSekSide(); return; }
  for (const el of rows) {
    const e = el as HTMLElement, p = pts.find(q => q.kind === e.dataset.k && q.id === e.dataset.i), h = e.querySelector('.hint');
    if (p && h) h.textContent = fmtD(d3(P.x, P.y, P.z, p.x, p.y, p.z));
  }
}
function renderSekSide() {
  sekSideT = performance.now() / 1000;
  const s = world.def!, nt = navTarget(), pts = navPoints();
  const row = (p: NavPoint) => {
    const d = d3(P.x, P.y, P.z, p.x, p.y, p.z), isT = !!nt && nt.kind === p.kind && nt.id === p.id, hot = sekHover === p.kind + ':' + p.id;
    return `<div class="row" data-k="${p.kind}" data-i="${esc(p.id)}" style="cursor:pointer;${hot ? 'background:rgba(95,208,255,.08);' : ''}${isT ? 'color:#bfe6ff' : ''}"><span>${isT ? '◇ ' : ''}${esc(p.name)}</span><span class="hint">${fmtD(d)}</span></div>`;
  };
  let h = `<h2 style="margin-bottom:4px">${esc(s.name.toUpperCase())}</h2><div class="hint" style="margin-bottom:10px">Sektorkarte · ${fmtD(SECTOR_RADIUS)} Radius</div>`;
  h += nt ? `<div class="row"><span class="hint">Ziel</span><b style="color:#bfe6ff">${esc(nt.name)}</b></div><p style="font-size:13px">Mit <b>H</b> startet der Kurzsprung: Der Autopilot fliegt hin und hält gut 1 km davor.</p>`
    : `<p style="font-size:13px">Klick auf einen Ort, um ihn als Ziel zu setzen. <b>H</b> startet dann den Kurzsprung. Ohne Ziel ist <b>H</b> der freie Schnellflug (bis 8 km/s, du lenkst selbst).</p>`;
  const grp: [string, NavPoint[]][] = [['ZIELE', pts.filter(p => p.kind === 'mark')], ['STATIONEN', pts.filter(p => p.kind === 'st')], ['ORTE', pts.filter(p => p.kind === 'ort')], ['FELDER', pts.filter(p => p.kind === 'field')], ['TORE UND ANFLUG', pts.filter(p => p.kind === 'gate' || p.kind === 'orbit')]];
  for (const [n, l] of grp) if (l.length) h += `<h3>${n}</h3>` + l.map(row).join('');
  if (nt) h += `<div class="btnRow" style="justify-content:stretch;margin-top:10px"><button style="flex:1" id="mapNavClr">Ziel löschen</button></div>`;
  if (SF.phase !== 'off') h += `<p class="hint">${SF.phase === 'spool' ? 'Schnellflug lädt …' : 'Schnellflug aktiv'}</p>`;
  $('mapSide').innerHTML = h;
  for (const el of $('mapSide').querySelectorAll('.row[data-k]')) (el as HTMLElement).onclick = () => {
    const k = (el as HTMLElement).dataset.k, i = (el as HTMLElement).dataset.i, p = pts.find(q => q.kind === k && q.id === i);
    if (!p) return;
    const cur = navTarget(); setNav(cur && cur.kind === p.kind && cur.id === p.id ? null : p); renderSide();
  };
  const cb = document.getElementById('mapNavClr'); if (cb) cb.onclick = () => { setNav(null); renderSide(); };
}
