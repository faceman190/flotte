import * as THREE from 'three';
import { camera, ux, view } from '../core/engine';
import { mouse, keys } from '../core/input';
import { clamp, d3, fmtD, fmtN, $ } from '../core/util';
import { P, G, stats, cargoUsed, settings } from '../game/state';
import { world } from '../game/world';
import { fwd, nearDock } from '../game/player';
import { SECTOR, FACTION, findRoute } from '../data/galaxy';
import { ITEMS, ITEM_IDS } from '../data/items';
import { UPG, MAXLV, upgFor } from '../data/upgrades';
import { MINE, droneInfo } from '../game/mining';
import { landInfo } from '../game/surface';
import { NET, remoteMarkers } from '../game/net';
import { trackedMission, missionLines, missionMarkers } from '../game/missions';
import { storyObjective, storyMarkers } from '../game/story';

const TAU = Math.PI * 2;
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
function proj(x: number, y: number, z: number) {
  _v.set(x, y, z);
  _v2.copy(_v).applyMatrix4(camera.matrixWorldInverse);
  const behind = _v2.z > 0;
  _v.project(camera);
  return { x: (_v.x + 1) / 2 * view.W, y: (1 - _v.y) / 2 * view.H, behind, cx: _v2.x, cy: _v2.y, d: -_v2.z };
}
const onScreen = (p: any, m = 0) => !p.behind && p.x > m && p.x < view.W - m && p.y > m && p.y < view.H - m;
let labelSlots: number[][] = [];
function radarSize() { return Math.round(clamp(view.W * 0.11, 92, 150) * settings.hud); }
function edgeArrow(p: any, col: string, label: string) {
  const W = view.W, H = view.H;
  let a = Math.atan2(-p.cy, p.cx);
  if (p.behind && Math.abs(p.cx) < 1 && Math.abs(p.cy) < 1) a = Math.PI / 2;
  const m = 40, mb = (s: number) => (s < 0 ? Math.min(H * 0.45, radarSize() * 0.84 + 90) : m);
  const c = Math.cos(a), s = Math.sin(a), k = Math.min((W / 2 - m) / Math.abs(c || 1e-6), (H / 2 - mb(s)) / Math.abs(s || 1e-6));
  const x = W / 2 + c * k, y = H / 2 - s * k;
  ux.save(); ux.translate(x, y); ux.rotate(-a); ux.fillStyle = col;
  ux.beginPath(); ux.moveTo(11, 0); ux.lineTo(-6, -7); ux.lineTo(-6, 7); ux.closePath(); ux.fill(); ux.restore();
  if (label) {
    const lx = clamp(x - c * 22, 90, W - 90);
    let ly = clamp(y + s * 22 + 4, 20, H - 10);
    for (let t = 0; t < 8 && labelSlots.some(q => Math.abs(q[0] - lx) < 150 && Math.abs(q[1] - ly) < 14); t++) ly += ly > H / 2 ? -15 : 15;
    labelSlots.push([lx, ly]);
    ux.fillStyle = col; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center'; ux.fillText(label, lx, ly);
  }
}
function brackets(p: any, r: number, col: string, lw = 1.5) {
  ux.strokeStyle = col; ux.lineWidth = lw;
  const L = r * 0.4;
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    ux.beginPath(); ux.moveTo(p.x + sx * r, p.y + sy * (r - L)); ux.lineTo(p.x + sx * r, p.y + sy * r); ux.lineTo(p.x + sx * (r - L), p.y + sy * r); ux.stroke();
  }
}
function hpCol(f: number) { return f < 0.3 ? '#ff6b5b' : f < 0.6 ? '#ffb347' : '#8fd18f'; }
function sBar(x: number, y: number, w: number, f: number, col: string) { ux.fillStyle = '#0e1e28'; ux.fillRect(x, y, w, 5); ux.fillStyle = col; ux.fillRect(x, y, w * clamp(f, 0, 1), 5); }

export function nextHop(): string | null {
  if (!P.route || P.route === P.sector) return null;
  const r = findRoute(P.sector, P.route);
  return r && r.length > 1 ? r[1] : null;
}

// =============== Zeichnen pro Bild ===============
export function drawHUD() {
  const W = view.W, H = view.H;
  ux.clearRect(0, 0, W, H);
  labelSlots = [];
  if (!world.def || (G.mode !== 'play' && G.mode !== 'jump')) return;
  ux.textAlign = 'center';
  const hop = nextHop();
  // Stationen
  for (const s of world.stations) {
    const p = proj(s.x, s.y + s.R * 0.9, s.z), d = d3(s.x, s.y, s.z, P.x, P.y, P.z);
    if (onScreen(p, 20)) { ux.fillStyle = '#5fd0ff'; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.fillText(`${s.name.toUpperCase()} · ${fmtD(d)}`, p.x, p.y); }
    else edgeArrow(p, '#5fd0ff', `${s.name} · ${fmtD(d)}`);
    const dd = d3(s.dock.x, s.dock.y, s.dock.z, P.x, P.y, P.z);
    if (dd < 900 && !G.dead) {
      const q = proj(s.dock.x, s.dock.y, s.dock.z);
      if (onScreen(q)) {
        const r = clamp(3600 / Math.max(dd, 1), 8, 60);
        ux.strokeStyle = dd < 90 ? '#8fd18f' : 'rgba(95,208,255,.8)'; ux.lineWidth = 1.5; ux.strokeRect(q.x - r, q.y - r * 0.5, r * 2, r);
        ux.fillStyle = ux.strokeStyle; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillText('ANDOCKEN', q.x, q.y - r * 0.5 - 6);
      }
    }
  }
  // Anflugzone zum Planeten
  if (world.orbit) {
    const o = world.orbit, p = proj(o.x, o.y + 100, o.z), d = d3(o.x, o.y, o.z, P.x, P.y, P.z);
    const label = `ANFLUG → ${o.name.toUpperCase()} · ${fmtD(d)}`;
    if (onScreen(p, 20)) { ux.fillStyle = '#7cc4ff'; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.fillText(label, p.x, p.y); }
    else if (d < 2500) edgeArrow(p, '#7cc4ff', label);
  }
  // Sprungtore
  for (const g of world.gates) {
    const p = proj(g.x, g.y + 100, g.z), d = d3(g.x, g.y, g.z, P.x, P.y, P.z), col = FACTION[g.faction].c, isHop = g.to === hop;
    const label = `${isHop ? '▶ ' : ''}TOR → ${g.name.toUpperCase()} · ${fmtD(d)}`;
    if (onScreen(p, 20)) {
      ux.fillStyle = col; ux.font = (isHop ? '700 ' : '') + '12px "Share Tech Mono",Consolas,monospace'; ux.fillText(label, p.x, p.y);
      if (isHop) { const c = proj(g.x, g.y, g.z); if (onScreen(c)) brackets(c, clamp(9000 / Math.max(d, 1), 12, 90), col, 2); }
    } else if (isHop) edgeArrow(p, col, label);
  }
  // Verkehr
  for (const s of world.traffic) {
    const d = d3(s.x, s.y, s.z, P.x, P.y, P.z), p = proj(s.x, s.y + 35, s.z), f = s.hp / s.maxhp, col = s.hitT > 0 ? '#ff6b5b' : '#d0c8f0';
    if (onScreen(p, 20) && d < 2600) {
      ux.fillStyle = col; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillText(s.name, p.x, p.y);
      if (f < 0.999) { ux.fillStyle = '#221f1a'; ux.fillRect(p.x - 30, p.y + 5, 60, 4); ux.fillStyle = hpCol(f); ux.fillRect(p.x - 30, p.y + 5, 60 * f, 4); }
    } else if (s.alertT > 8) edgeArrow(p, '#ff6b5b', `${s.name} ⚠ · ${fmtD(d)}`);
  }
  // Ferrox
  for (const e of world.enemies) {
    const p = proj(e.x, e.y, e.z), d = d3(e.x, e.y, e.z, P.x, P.y, P.z);
    if (onScreen(p)) {
      const base = e.type === 'mother' ? 9000 : e.type === 'bomber' ? 2600 : 1700, r = clamp(base / Math.max(d, 1), 9, e.type === 'mother' ? 160 : 50);
      const locked = e === G.lockT;
      brackets(p, r, locked ? '#ffd27a' : '#c070ff', locked ? 2 : 1.5);
      if (e.hp < e.maxhp || e.type !== 'drone') { ux.fillStyle = '#0e1e28'; ux.fillRect(p.x - r, p.y - r - 9, r * 2, 4); ux.fillStyle = '#c070ff'; ux.fillRect(p.x - r, p.y - r - 9, r * 2 * e.hp / e.maxhp, 4); }
      if (e.type !== 'drone') { ux.fillStyle = '#d0a0ff'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillText(e.type === 'mother' ? 'FERROX-BIENENSTOCK' : 'BOMBER', p.x, p.y + r + 12); }
      if (locked) {
        ux.save(); ux.translate(p.x, p.y); ux.rotate(G.time * 2); ux.strokeStyle = '#ffd27a'; ux.lineWidth = 1; ux.strokeRect(-r - 6, -r - 6, (r + 6) * 2, (r + 6) * 2); ux.restore();
        ux.fillStyle = '#ffd27a'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillText(P.rockets > 0 ? 'ERFASST · [F] RAKETE' : 'ERFASST', p.x, p.y - r - 14);
      }
    } else if (d < 1300 || e.type === 'mother') edgeArrow(p, '#c070ff', e.type === 'mother' ? `BIENENSTOCK · ${fmtD(d)}` : '');
  }
  for (const b of world.ebullets) if (b.torp && b.life > 0) {
    const p = proj(b.x, b.y, b.z);
    if (onScreen(p)) { ux.strokeStyle = '#ff5b9b'; ux.lineWidth = 1.5; ux.beginPath(); ux.arc(p.x, p.y, 10, 0, TAU); ux.stroke(); ux.fillStyle = '#ff5b9b'; ux.font = '9px "Share Tech Mono",Consolas,monospace'; ux.fillText('TORPEDO', p.x, p.y - 14); }
  }
  // andere Piloten (Mehrspieler): Name und Entfernung, Pfeil am Rand bis 4 km
  for (const r of remoteMarkers()) {
    const p = proj(r.x, r.y + 12, r.z), d = d3(r.x, r.y, r.z, P.x, P.y, P.z), label = `${r.name} · ${fmtD(d)}`;
    if (onScreen(p, 20)) {
      ux.fillStyle = '#7fe0a0'; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.fillText(label, p.x, p.y);
      const c = proj(r.x, r.y, r.z); if (onScreen(c)) brackets(c, clamp(2600 / Math.max(d, 1), 8, 40), 'rgba(127,224,160,.8)', 1.2);
    } else if (d < 4000) edgeArrow(p, '#7fe0a0', label);
  }
  for (const w of world.allies) if (w.alive) {
    const p = proj(w.x, w.y + 6, w.z);
    if (onScreen(p) && d3(w.x, w.y, w.z, P.x, P.y, P.z) < 1500) { ux.fillStyle = w.col; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillText(w.name, p.x, p.y); }
  }
  // Missionsziele (Messpunkte, Wrackfeld, Kapseln)
  for (const mk of [...storyMarkers(), ...missionMarkers()]) {
    const p = proj(mk.x, mk.y, mk.z), d = d3(mk.x, mk.y, mk.z, P.x, P.y, P.z), label = `◆ ${mk.label} · ${fmtD(d)}`;
    if (onScreen(p, 20)) {
      const r = clamp((mk.big ? 9000 : 1600) / Math.max(d, 1), 8, mk.big ? 70 : 26);
      ux.strokeStyle = mk.col; ux.lineWidth = 1.6; ux.beginPath(); ux.moveTo(p.x, p.y - r); ux.lineTo(p.x + r, p.y); ux.lineTo(p.x, p.y + r); ux.lineTo(p.x - r, p.y); ux.closePath(); ux.stroke();
      if (mk.big || d < 900) { ux.fillStyle = mk.col; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.fillText(label, p.x, p.y - r - 6); }
    } else if (mk.big || d < 700) edgeArrow(p, mk.col, label);
  }
  // Gescannte Asteroiden: Haupterz und Restertrag
  const scanned = world.asteroids.filter(a => a.scanT > 0).map(a => ({ a, d: d3(a.x, a.y, a.z, P.x, P.y, P.z) })).filter(o => o.d < 1800).sort((x, y) => x.d - y.d).slice(0, 28);
  for (const { a, d } of scanned) {
    const p = proj(a.x, a.y, a.z);
    if (!onScreen(p, 10) || a === MINE.target) continue;
    const m = a.comp[0], col = ITEMS[m.k].c, fade = Math.min(1, a.scanT / 8);
    ux.globalAlpha = fade * (d < 900 ? 1 : 0.7);
    ux.strokeStyle = col; ux.lineWidth = 1.2;
    ux.beginPath(); ux.moveTo(p.x, p.y - 5); ux.lineTo(p.x + 5, p.y); ux.lineTo(p.x, p.y + 5); ux.lineTo(p.x - 5, p.y); ux.closePath(); ux.stroke();
    ux.fillStyle = col; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'left';
    ux.fillText(`${ITEMS[m.k].short} ${Math.round(m.p * 100)}%${a.comp[1] ? ' +' + a.comp.slice(1).map(o => ITEMS[o.k].short).join('/') : ''} · ${a.yld}E`, p.x + 8, p.y + 3);
  }
  ux.globalAlpha = 1; ux.textAlign = 'center';
  // Fadenkreuz
  if (!G.dead && G.mode === 'play') {
    const f = fwd(), a = proj(P.x + f.x * 500, P.y + f.y * 500, P.z + f.z * 500);
    if (!a.behind) {
      if (P.tool === 'laser' || P.tool === 'charge') drawLaserReticle(a.x, a.y);
      else {
        ux.strokeStyle = G.hitMark > 0 ? '#ff6b5b' : 'rgba(255,210,122,.9)'; ux.lineWidth = 1.5;
        ux.beginPath(); ux.arc(a.x, a.y, 14, 0, TAU); ux.stroke();
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ux.beginPath(); ux.moveTo(a.x + dx * 18, a.y + dy * 18); ux.lineTo(a.x + dx * 26, a.y + dy * 26); ux.stroke(); }
      }
      if (G.hitMark > 0) { ux.lineWidth = 2; for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { ux.beginPath(); ux.moveTo(a.x + dx * 6, a.y + dy * 6); ux.lineTo(a.x + dx * 12, a.y + dy * 12); ux.stroke(); } }
    }
    ux.strokeStyle = 'rgba(255,255,255,.12)'; ux.lineWidth = 1;
    ux.beginPath(); ux.arc(W / 2, H / 2, W / 2 * 0.05, 0, TAU); ux.stroke();
    ux.beginPath(); ux.moveTo(W / 2, H / 2); ux.lineTo(mouse.x, mouse.y); ux.stroke();
    ux.fillStyle = 'rgba(255,255,255,.85)'; ux.save(); ux.translate(mouse.x, mouse.y); ux.rotate(Math.PI / 4); ux.fillRect(-3.5, -3.5, 7, 7); ux.restore();
  }
  drawCompass();
  drawRadar();
  drawShipPanel();
  if (G.dead > 0) {
    ux.fillStyle = 'rgba(0,0,0,.35)'; ux.fillRect(0, 0, W, H);
    ux.textAlign = 'center'; ux.fillStyle = '#ff6b5b'; ux.font = '700 30px "Share Tech Mono",Consolas,monospace'; ux.fillText('JÄGER ZERSTÖRT', W / 2, H / 2 - 10);
    ux.fillStyle = '#e4eef5'; ux.font = '15px "Share Tech Mono",Consolas,monospace'; ux.fillText(`Neuer Jäger im Heimathafen in ${Math.ceil(G.dead)} …`, W / 2, H / 2 + 22);
  }
}

// ---------- Kompassband (oben Mitte): Kurs und Richtung zu Stationen, Toren, Anflugzone ----------
const _cd = new THREE.Vector3();
function drawCompass() {
  const W = view.W, cw = Math.round(clamp(W * 0.34, 260, 520) * settings.hud), x0 = W / 2 - cw / 2, y0 = 12, h = 26, span = 120;
  camera.getWorldDirection(_cd);
  const head = Math.atan2(_cd.x, -_cd.z) * 180 / Math.PI;
  const rel = (deg: number) => { let r = deg - head; r = ((r + 540) % 360) - 180; return r; };
  const xOf = (r: number) => W / 2 + r / (span / 2) * (cw / 2);
  ux.save();
  const gr = ux.createLinearGradient(x0, 0, x0 + cw, 0);
  gr.addColorStop(0, 'rgba(10,12,16,0)'); gr.addColorStop(0.15, 'rgba(10,12,16,.72)'); gr.addColorStop(0.85, 'rgba(10,12,16,.72)'); gr.addColorStop(1, 'rgba(10,12,16,0)');
  ux.fillStyle = gr; ux.fillRect(x0, y0, cw, h);
  const lg = ux.createLinearGradient(x0, 0, x0 + cw, 0);
  lg.addColorStop(0, 'rgba(95,208,255,0)'); lg.addColorStop(0.5, 'rgba(95,208,255,.55)'); lg.addColorStop(1, 'rgba(95,208,255,0)');
  ux.fillStyle = lg; ux.fillRect(x0, y0 + h, cw, 1);
  ux.beginPath(); ux.rect(x0, y0 - 4, cw, h + 30); ux.clip();
  // Skala
  ux.textAlign = 'center'; ux.font = '10px "Share Tech Mono",Consolas,monospace';
  const start = Math.ceil((head - span / 2) / 5) * 5;
  for (let dg = start; dg <= head + span / 2; dg += 5) {
    const x = xOf(dg - head), n = ((dg % 360) + 360) % 360, edge = 1 - Math.abs(dg - head) / (span / 2);
    ux.globalAlpha = clamp(edge * 1.6, 0, 1);
    ux.fillStyle = 'rgba(236,230,218,.55)';
    const big = n % 30 === 0;
    ux.fillRect(x, y0 + h - (big ? 8 : 4), 1, big ? 8 : 4);
    if (big) { ux.fillStyle = 'rgba(236,230,218,.7)'; ux.fillText(String(n).padStart(3, '0'), x, y0 + 11); }
  }
  ux.globalAlpha = 1;
  // Ziele
  const hop = nextHop();
  const mark = (x: number, z: number, col: string, shape: 'dia' | 'tri' | 'ring', strong: boolean) => {
    const r = rel(Math.atan2(x - P.x, -(z - P.z)) * 180 / Math.PI);
    const clamped = Math.abs(r) > span / 2;
    const px = xOf(clamp(r, -span / 2 + 2, span / 2 - 2)), py = y0 + h - 3;
    ux.globalAlpha = clamped ? 0.45 : 1; ux.fillStyle = col; ux.strokeStyle = col; ux.lineWidth = 1.6;
    ux.beginPath();
    if (shape === 'dia') { ux.moveTo(px, py - 9); ux.lineTo(px + 5, py - 4); ux.lineTo(px, py + 1); ux.lineTo(px - 5, py - 4); ux.closePath(); ux.fill(); }
    else if (shape === 'tri') { ux.moveTo(px, py - 10); ux.lineTo(px + 6, py); ux.lineTo(px - 6, py); ux.closePath(); strong ? ux.fill() : ux.stroke(); }
    else { ux.arc(px, py - 4, 5, 0, TAU); ux.stroke(); }
    if (strong && !clamped) { ux.shadowColor = col; ux.shadowBlur = 8; ux.fill(); ux.shadowBlur = 0; }
  };
  for (const s of world.stations) mark(s.x, s.z, '#5fd0ff', 'dia', s.id === P.home.station);
  for (const g of world.gates) mark(g.x, g.z, FACTION[g.faction].c, 'tri', g.to === hop);
  if (world.orbit) mark(world.orbit.x, world.orbit.z, '#7cc4ff', 'ring', true);
  ux.globalAlpha = 1;
  ux.restore();
  // Kursanzeige
  ux.save();
  ux.fillStyle = '#5fd0ff'; ux.beginPath(); ux.moveTo(W / 2, y0 + h + 1); ux.lineTo(W / 2 - 5, y0 + h + 7); ux.lineTo(W / 2 + 5, y0 + h + 7); ux.closePath(); ux.fill();
  ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
  const hd = String(Math.round(((head % 360) + 360) % 360) % 360).padStart(3, '0');
  ux.fillStyle = 'rgba(10,12,16,.85)'; ux.fillRect(W / 2 - 20, y0 + h + 8, 40, 15);
  ux.fillStyle = '#5fd0ff'; ux.fillText(hd, W / 2, y0 + h + 19);
  ux.restore();
}

// ---------- Laser-Fadenkreuz: Reichweite, Hitze, Ziel-Zusammensetzung ----------
function drawLaserReticle(x: number, y: number) {
  const st = stats(), t = MINE.target, hc = G.overheat ? '#ff6b5b' : G.heat > 70 ? '#ffb347' : '#ff9a40', ch = P.tool === 'charge';
  ux.strokeStyle = ch ? (t ? 'rgba(255,107,91,.95)' : 'rgba(255,107,91,.5)') : t ? 'rgba(255,154,64,.95)' : 'rgba(255,154,64,.5)'; ux.lineWidth = 1.5;
  ux.setLineDash([4, 4]); ux.beginPath(); ux.arc(x, y, 16, 0, TAU); ux.stroke(); ux.setLineDash([]);
  ux.beginPath(); ux.arc(x, y, 2, 0, TAU); ux.fillStyle = ux.strokeStyle; ux.fill();
  if (!ch) { ux.strokeStyle = 'rgba(255,255,255,.12)'; ux.lineWidth = 3; ux.beginPath(); ux.arc(x, y, 24, Math.PI * 0.75, Math.PI * 2.25); ux.stroke(); }
  if (G.heat > 0 && !ch) { ux.strokeStyle = hc; ux.beginPath(); ux.arc(x, y, 24, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * G.heat / 100); ux.stroke(); }
  ux.lineWidth = 1; ux.textAlign = 'left'; ux.font = '11px "Share Tech Mono",Consolas,monospace';
  if (G.overheat && !ch) { ux.fillStyle = '#ff6b5b'; ux.fillText('ÜBERHITZT', x + 32, y - 6); }
  if (t) {
    let ly = y + (G.overheat && !ch ? 8 : -6);
    ux.fillStyle = '#e4eef5'; ux.font = '700 11px "Share Tech Mono",Consolas,monospace'; ux.fillText(`ASTEROID · ${Math.round(MINE.dist)} m`, x + 32, ly); ly += 14;
    ux.font = '11px "Share Tech Mono",Consolas,monospace';
    for (const o of t.comp) { ux.fillStyle = ITEMS[o.k].c; ux.fillText(`${ITEMS[o.k].n} ${Math.round(o.p * 100)} %`, x + 32, ly); ly += 13; }
    ux.fillStyle = '#8aa0b0'; ux.fillText(`Ertrag ${t.yld}/${t.max} E`, x + 32, ly);
    sBar(x + 32, ly + 4, 90, t.yld / t.max, ch ? '#ff6b5b' : '#ff9a40');
    if (ch) { ux.fillStyle = '#ff6b5b'; ux.fillText(P.charges ? `[Klick] Ladung werfen · ${P.charges} übrig` : 'Keine Ladungen mehr', x + 32, ly + 22); }
  } else { ux.fillStyle = ch ? 'rgba(255,107,91,.7)' : 'rgba(255,154,64,.6)'; ux.fillText(ch ? `Sprengladung · Reichweite 500 m · ${P.charges} übrig` : `Reichweite ${st.laserRange} m`, x + 32, y + 4); }
  ux.textAlign = 'center';
}

// ---------- 3D-Radar (unten Mitte): Flugrichtung oben, Stiele zeigen Höhe ----------
function drawRadar() {
  const W = view.W, H = view.H, R = radarSize(), T = 0.42, mx = W / 2, my = H - R * T - 50, range = stats().radar;
  ux.save(); ux.lineWidth = 1;
  ux.fillStyle = 'rgba(6,16,26,.78)'; ux.strokeStyle = 'rgba(95,208,255,.6)'; ux.lineWidth = 1.3;
  ux.beginPath(); ux.ellipse(mx, my, R, R * T, 0, 0, TAU); ux.fill(); ux.stroke();
  ux.lineWidth = 1; ux.strokeStyle = 'rgba(95,208,255,.16)';
  for (const f of [0.25, 0.5, 0.75]) { ux.beginPath(); ux.ellipse(mx, my, R * f, R * T * f, 0, 0, TAU); ux.stroke(); }
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ux.beginPath(); ux.moveTo(mx + Math.cos(a) * R * 0.25, my + Math.sin(a) * R * T * 0.25); ux.lineTo(mx + Math.cos(a) * R, my + Math.sin(a) * R * T); ux.stroke(); }
  const fh = Math.min(1.3, Math.atan(Math.tan(camera.fov * Math.PI / 360) * camera.aspect));
  ux.fillStyle = 'rgba(255,210,122,.07)'; ux.beginPath(); ux.moveTo(mx, my); ux.ellipse(mx, my, R, R * T, 0, -Math.PI / 2 - fh, -Math.PI / 2 + fh); ux.closePath(); ux.fill();
  const sw = (G.time * 1.7) % TAU;
  for (let i = 0; i < 10; i++) { const a0 = sw - (i + 1) * 0.07, a1 = sw - i * 0.07; ux.fillStyle = `rgba(95,208,255,${0.11 * (1 - i / 10)})`; ux.beginPath(); ux.moveTo(mx, my); ux.ellipse(mx, my, R, R * T, 0, a0, a1); ux.closePath(); ux.fill(); }
  ux.strokeStyle = 'rgba(255,200,120,.55)'; ux.beginPath(); ux.moveTo(mx, my); ux.lineTo(mx + Math.cos(sw) * R, my + Math.sin(sw) * R * T); ux.stroke();
  const cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), blips: any[] = [];
  const add = (x: number, y: number, z: number, col: string, size: number, shape: string, keep = false) => {
    const dx = x - P.x, dz = z - P.z;
    let px = (dx * cy - dz * sy) / range, py = (dx * sy + dz * cy) / range;
    const l = Math.hypot(px, py);
    if (l > 0.97) { if (!keep) return; px *= 0.97 / l; py *= 0.97 / l; }
    const h = shape === 'rock' ? 0 : clamp((y - P.y) / range, -1, 1) * R * 1.1;
    blips.push({ sx: mx + px * R, sy: my + py * R * T, h, col, size, shape });
  };
  const hop = nextHop();
  for (const a of world.asteroids) add(a.x, a.y, a.z, a.scanT > 0 ? ITEMS[a.comp[0].k].c : a.kind === 'crystal' ? '#8a5ab0' : a.kind === 'ice' ? '#5a6a78' : '#4a5c6a', a.scanT > 0 ? 2 : 1.4, 'rock');
  for (const p of world.pickups) add(p.x, p.y, p.z, ITEMS[p.k].c, 1.6, 'dot');
  for (const s of world.stations) add(s.x, s.y, s.z, '#5fd0ff', 5, 'sq', true);
  for (const g of world.gates) add(g.x, g.y, g.z, FACTION[g.faction].c, g.to === hop ? 5 : 4, 'ring', g.to === hop);
  if (world.orbit) add(world.orbit.x, world.orbit.y, world.orbit.z, '#7cc4ff', 4.5, 'ring', true);
  for (const s of world.traffic) add(s.x, s.y, s.z, s.hitT > 0 ? '#ff6b5b' : '#8fd18f', 3.2, 'sq');
  for (const r of remoteMarkers()) add(r.x, r.y, r.z, '#7fe0a0', 4.2, 'ring', true);
  for (const w of world.allies) if (w.alive) add(w.x, w.y, w.z, w.col, 2.6, 'tri');
  for (const e of world.enemies) add(e.x, e.y, e.z, e === G.lockT ? '#ffd27a' : '#c070ff', e.type === 'mother' ? 6.5 : e.type === 'bomber' ? 3.8 : 2.8, 'dia', e.type === 'mother');
  for (const b of world.ebullets) if (b.torp && b.life > 0) add(b.x, b.y, b.z, '#ff5b9b', 2.2, 'dot');
  blips.sort((a, b) => a.sy - b.sy);
  for (const b of blips) {
    let d = (sw - Math.atan2((b.sy - my) / T, b.sx - mx)) % TAU; if (d < 0) d += TAU;
    const glow = Math.max(0, 1 - d / 2.2), sm = b.shape === 'dot' || b.shape === 'rock';
    ux.globalAlpha = sm ? 0.55 + 0.45 * glow : 0.7 + 0.3 * glow;
    const tx = b.sx, ty = b.sy - b.h;
    if (b.shape !== 'rock' && Math.abs(b.h) > 2) {
      ux.strokeStyle = b.col; ux.globalAlpha *= 0.6;
      ux.beginPath(); ux.moveTo(b.sx, b.sy); ux.lineTo(tx, ty); ux.stroke();
      ux.fillStyle = b.col; ux.fillRect(b.sx - 1.5, b.sy - 0.5, 3, 1); ux.globalAlpha /= 0.6;
    }
    ux.fillStyle = b.col; ux.strokeStyle = b.col;
    const z = b.size;
    ux.beginPath();
    if (b.shape === 'sq') ux.rect(tx - z, ty - z, z * 2, z * 2);
    else if (b.shape === 'dia') { ux.moveTo(tx, ty - z * 1.3); ux.lineTo(tx + z, ty); ux.lineTo(tx, ty + z * 1.3); ux.lineTo(tx - z, ty); ux.closePath(); }
    else if (b.shape === 'tri') { ux.moveTo(tx, ty - z * 1.4); ux.lineTo(tx + z, ty + z); ux.lineTo(tx - z, ty + z); ux.closePath(); }
    else if (b.shape === 'ring') { ux.lineWidth = 2; ux.ellipse(tx, ty, z, z * 0.7, 0, 0, TAU); ux.stroke(); ux.lineWidth = 1; continue; }
    else ux.arc(tx, ty, z, 0, TAU);
    ux.fill();
    if (b.col === '#ffd27a') ux.strokeRect(tx - z - 3, ty - z - 3, z * 2 + 6, z * 2 + 6);
  }
  ux.globalAlpha = 1;
  ux.fillStyle = '#fff'; ux.beginPath(); ux.moveTo(mx, my - 7); ux.lineTo(mx - 5, my + 4); ux.lineTo(mx, my + 2); ux.lineTo(mx + 5, my + 4); ux.closePath(); ux.fill();
  ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center'; ux.fillStyle = 'rgba(95,208,255,.85)';
  ux.fillText(`RADAR · ${(range / 1000).toFixed(1).replace('.', ',')} km`, mx, my - R * T - 8);
  const nE = world.enemies.length;
  ux.textAlign = 'right'; ux.fillStyle = nE ? '#c070ff' : '#4a5c6a'; ux.fillText(nE ? `FERROX ${nE}` : 'KEINE FERROX', mx - R - 8, my + 4);
  ux.textAlign = 'left'; ux.fillStyle = '#8fd18f'; ux.fillText(`VERKEHR ${world.traffic.length}`, mx + R + 8, my + 4);
  ux.restore();
}

// ---------- Schiffsanzeige (unten rechts) ----------
// Draufsicht-Silhouetten je Schiffsklasse (Bug oben). body = Hauptformen, eng = Triebwerke, s = Maßstab
export const SIL: Record<string, { s: number; body: number[][][]; lite?: number[][][]; eng: number[][]; guns: number[][] }> = {
  falke: {
    s: 2.8,
    body: [[[0, -19], [2.2, -13], [4.2, -4], [5, 10], [4, 15], [-4, 15], [-5, 10], [-4.2, -4], [-2.2, -13]],
      [[-4, -3], [-19, 8], [-20, 12], [-16, 13], [-5, 11]], [[4, -3], [19, 8], [20, 12], [16, 13], [5, 11]]],
    eng: [[-2.4, 15], [2.4, 15]], guns: [[-1.4, -17], [1.4, -17]],
  },
  habicht: {
    s: 2.3,
    body: [[[0, -20], [3, -12], [5, -2], [6, 12], [4, 17], [-4, 17], [-6, 12], [-5, -2], [-3, -12]],
      [[-5, -4], [-22, 6], [-22, 12], [-6, 12]], [[5, -4], [22, 6], [22, 12], [6, 12]]],
    eng: [[-2.6, 17], [2.6, 17]], guns: [[-3, -14], [3, -14], [-20, 4], [20, 4]],
  },
  elster: {
    s: 3.4,
    body: [[[-3, -7], [3, -7], [3, 7], [-3, 7]], [[-2.6, -7], [2.6, -7], [1.4, -12], [-1.4, -12]],
      [[-3.2, -3.5], [-6.6, -3.5], [-6.6, 6.5], [-3.2, 6.5]], [[3.2, -3.5], [6.6, -3.5], [6.6, 6.5], [3.2, 6.5]]],
    eng: [[-2.3, 9], [2.3, 9]], guns: [[-4.9, -6], [4.9, -6]],
  },
  maulwurf: {
    s: 1.65,
    body: [[[-6, -15], [6, -15], [6, 19], [-6, 19]], [[-5.3, -13], [-8.3, -13], [-8, -30], [-5, -30]], [[5.3, -13], [8.3, -13], [8, -30], [5, -30]], [[-8, 16], [8, 16], [8, 24], [-8, 24]]],
    lite: [[[-7, 1], [7, 1], [7, 17], [-7, 17]]],
    eng: [[-4, 25], [4, 25]], guns: [[-4, -14], [4, -14]],
  },
  kaerrner: {
    s: 1.55,
    body: [[[-4.5, -28], [4.5, -28], [4.5, -18], [-4.5, -18]], [[-2.5, -33], [2.5, -33], [4.4, -28], [-4.4, -28]], [[-1.7, -18], [1.7, -18], [1.7, 18], [-1.7, 18]], [[-6, 18], [6, 18], [6, 26], [-6, 26]]],
    lite: [[[-7, -17], [7, -17], [7, 17], [-7, 17]]],
    eng: [[-3.4, 28], [3.4, 28]], guns: [[-1.2, -24], [1.2, -24]],
  },
  pfeil: {
    s: 1.0,
    body: [[[0, -46], [6, -38], [9, -20], [10, 0], [12, 15], [11, 32], [9, 45], [-9, 45], [-11, 32], [-12, 15], [-10, 0], [-9, -20], [-6, -38]],
      [[-11, 8], [-21, 20], [-21, 30], [-11, 30]], [[11, 8], [21, 20], [21, 30], [11, 30]]],
    lite: [[[-5, -30], [5, -30], [6, -16], [-6, -16]]],
    eng: [[-8, 46], [-3, 46], [3, 46], [8, 46]], guns: [[-4, -30], [4, -30]],
  },
};

function drawShipPanel() {
  const W = view.W, H = view.H, st = stats(), w = 340, h = 246, k = clamp(Math.min(W / 1250, H / 780), 0.62, 1) * settings.hud;
  const ups = upgFor(P.cls);
  ux.save(); ux.translate(Math.round(W - 14 - w * k), Math.round(H - 14 - h * k)); ux.scale(k, k);
  const c = 12;
  ux.beginPath(); ux.moveTo(c, 0); ux.lineTo(w, 0); ux.lineTo(w, h - c); ux.lineTo(w - c, h); ux.lineTo(0, h); ux.lineTo(0, c); ux.closePath();
  ux.fillStyle = 'rgba(10,12,14,.86)'; ux.fill(); ux.strokeStyle = '#1e3a4a'; ux.lineWidth = 1; ux.stroke();
  ux.strokeStyle = '#5fd0ff'; ux.lineWidth = 2; ux.beginPath(); ux.moveTo(c, 1); ux.lineTo(110, 1); ux.stroke();
  let lvSum = 0; for (const kk of ups) lvSum += P.up[kk];
  ux.textAlign = 'left'; ux.font = '700 11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#5fd0ff'; ux.fillText(`${st.cls.role.toUpperCase()} · ${P.shipName.toUpperCase()}`, 14, 19);
  ux.textAlign = 'right'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#8aa0b0'; ux.fillText(`AUSBAU ${lvSum}/${ups.length * MAXLV}`, w - 12, 19);
  // Silhouette
  const hf = clamp(P.hull / st.maxHull, 0, 1), sf = clamp(P.shield / st.maxShield, 0, 1), cx = 74, cy = 92;
  const sil = SIL[P.cls] || SIL.falke, s = sil.s;
  ux.save(); ux.translate(cx, cy);
  if (sf > 0) {
    ux.strokeStyle = `rgba(124,196,255,${0.25 + 0.6 * sf})`; ux.lineWidth = 2; ux.setLineDash(sf < 0.35 ? [4, 4] : []);
    ux.beginPath(); ux.ellipse(0, 0, 58, 58, 0, -Math.PI / 2, -Math.PI / 2 + TAU * sf); ux.stroke(); ux.setLineDash([]);
  }
  ux.strokeStyle = 'rgba(124,196,255,.12)'; ux.lineWidth = 1; ux.beginPath(); ux.ellipse(0, 0, 58, 58, 0, 0, TAU); ux.stroke();
  const Pth = (pts: number[][]) => { ux.beginPath(); pts.forEach(([x, y], i) => (i ? ux.lineTo(x * s, y * s) : ux.moveTo(x * s, y * s))); ux.closePath(); };
  const hit = G.sinceHit < 0.25 && !G.dead, col = G.dead ? '#5a5246' : hit ? '#ffffff' : hpCol(hf);
  for (const poly of sil.lite || []) { Pth(poly); ux.fillStyle = col + '22'; ux.fill(); ux.strokeStyle = col + '99'; ux.lineWidth = 1; ux.stroke(); }
  for (const poly of sil.body) { Pth(poly); ux.fillStyle = col + '3a'; ux.fill(); ux.strokeStyle = col; ux.lineWidth = 1.3; ux.stroke(); }
  const thr = G.dead ? 0 : 0.35 + G.thrust * 0.65;
  for (const [ex, ey] of sil.eng) {
    const g = ux.createRadialGradient(ex * s, ey * s + 8, 1, ex * s, ey * s + 8, 6 + thr * 9);
    g.addColorStop(0, `rgba(255,200,120,${thr})`); g.addColorStop(1, 'rgba(255,140,60,0)');
    ux.fillStyle = g; ux.fillRect(ex * s - 16, ey * s - 2, 32, 26);
  }
  const trig = (mouse.down || keys.Space) && !G.dead;
  const gc = P.tool === 'guns' ? (P.ammo <= 0 ? '#ff6b5b' : trig ? '#fff2c0' : '#ffd27a') : '#6a6050';
  ux.fillStyle = gc; for (const [gx, gy] of sil.guns) ux.fillRect(gx * s - 1, gy * s - 4, 2, 8);
  if (P.cls === 'falke' && P.up.guns >= 2) for (const m of [-17.5, 17.5]) ux.fillRect(m * s - 1, 4 * s, 2, 10);
  if (P.tool === 'laser' && trig && !G.overheat) { ux.fillStyle = '#ff9a40'; const top = Math.min(...sil.body.flat().map(p => p[1])) * s; ux.fillRect(-1.5, top - 14, 3, 12); }
  if (P.cls === 'falke') {
    const per = Math.ceil(st.maxRockets / 2);
    let n = 0;
    for (let i = 0; i < per; i++) for (const m of [-1, 1]) {
      if (n >= st.maxRockets) break;
      const x = m * (7 + i * (10 / Math.max(1, per - 1))) * s, y = (6.5 + i * (4 / Math.max(1, per - 1))) * s, full = n < P.rockets;
      n++;
      ux.strokeStyle = full ? '#5fd0ff' : '#2a4a5e'; ux.fillStyle = '#5fd0ff'; ux.lineWidth = 1;
      ux.beginPath(); ux.rect(x - 1.5, y - 5, 3, 9); if (full) ux.fill(); ux.stroke();
    }
  }
  ux.restore();
  // Rechte Spalte
  const x0 = 150, bw = w - x0 - 12;
  let y = 40;
  const row = (l: string, r: string, rc?: string) => {
    ux.textAlign = 'left'; ux.fillStyle = '#8aa0b0'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillText(l, x0, y);
    ux.textAlign = 'right'; ux.fillStyle = rc || '#e4eef5'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillText(r, x0 + bw, y);
  };
  row('HÜLLE', `${Math.ceil(Math.max(0, P.hull))}/${st.maxHull}`, hpCol(hf)); sBar(x0, y + 4, bw, hf, hpCol(hf)); y += 22;
  row('SCHILD', `${Math.ceil(P.shield)}/${st.maxShield}`, '#7cc4ff'); sBar(x0, y + 4, bw, sf, '#7cc4ff'); y += 32;
  ux.strokeStyle = '#1e3a4a'; ux.beginPath(); ux.moveTo(x0, y - 22); ux.lineTo(x0 + bw, y - 22); ux.stroke();
  // Werkzeugleiste
  const tools: [string, string, boolean, string][] = [['1', 'KAN', P.tool === 'guns', '#5fd0ff']];
  if (st.laser) tools.push(['2', 'LAS', P.tool === 'laser', '#ff9a40']);
  if (st.maxCharges) tools.push(['3', 'SPR', P.tool === 'charge', '#ff6b5b']);
  if (st.drones) tools.push(['4', 'DRO', P.dronesOn, '#8fd18f']);
  ux.font = '9px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'left';
  let tx = x0;
  for (const [key, lab, on, tc] of tools) { const t = `[${key}] ${lab}`; ux.fillStyle = on ? tc : '#4a5c6a'; ux.fillText(t, tx, y - 11); tx += ux.measureText(t).width + 9; }
  if (P.tool === 'guns') {
    const low = P.ammo < st.maxAmmo * 0.2;
    ux.textAlign = 'left'; ux.font = '700 10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#5fd0ff'; ux.fillText(`KANONEN MK ${P.up.guns + 1}`, x0, y);
    ux.textAlign = 'right'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = low ? '#ff6b5b' : '#e4eef5'; ux.fillText(`${P.ammo}/${st.maxAmmo}`, x0 + bw, y);
    sBar(x0, y + 4, bw, P.ammo / st.maxAmmo, low ? '#ff6b5b' : '#ffd27a'); y += 17;
    ux.textAlign = 'left'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#8aa0b0'; ux.fillText(`${st.dmg} Schaden · ${Math.round(1 / st.rate)}/s`, x0, y); y += 20;
  } else if (P.tool === 'laser') {
    const hc = G.overheat ? '#ff6b5b' : G.heat > 70 ? '#ffb347' : '#ff9a40';
    ux.textAlign = 'left'; ux.font = '700 10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#ff9a40'; ux.fillText(`${st.beams > 1 ? 'DOPPELLASER' : 'BERGBAULASER'} MK ${P.up.laser + 1}`, x0, y);
    ux.textAlign = 'right'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = hc; ux.fillText(G.overheat ? 'ÜBERHITZT' : `${Math.round(G.heat)} %`, x0 + bw, y);
    sBar(x0, y + 4, bw, G.heat / 100, hc); y += 17;
    ux.textAlign = 'left'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#8aa0b0'; ux.fillText(`${(st.laserRate * st.beams).toFixed(1).replace('.', ',')} E/s · ${st.laserRange} m · Scan [R]`, x0, y); y += 20;
  } else {
    ux.textAlign = 'left'; ux.font = '700 10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#ff6b5b'; ux.fillText('SPRENGLADUNGEN', x0, y);
    ux.textAlign = 'right'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = P.charges ? '#e4eef5' : '#ff6b5b'; ux.fillText(`${P.charges}/${st.maxCharges}`, x0 + bw, y);
    sBar(x0, y + 4, bw, P.charges / Math.max(1, st.maxCharges), '#ff6b5b'); y += 17;
    ux.textAlign = 'left'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#8aa0b0'; ux.fillText('Klick: werfen · Zünder 2,8 s · 500 m', x0, y); y += 20;
  }
  if (st.maxRockets) {
    ux.textAlign = 'left'; ux.font = '700 10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#5fd0ff'; ux.fillText('RAKETEN', x0, y);
    ux.textAlign = 'right'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = P.rockets ? '#e4eef5' : '#ff6b5b'; ux.fillText(`${P.rockets}/${st.maxRockets}`, x0 + bw, y); y += 14;
    ux.textAlign = 'left'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = G.lockT ? '#ffd27a' : '#4a5c6a';
    ux.fillText(G.lockT ? (P.rockets ? '● ZIEL ERFASST · [F]' : '● ZIEL ERFASST') : '○ KEIN ZIEL', x0, y); y += 20;
  } else if (st.drones) {
    const ds = droneInfo(), out = ds.filter(d => d !== 'dock').length, mining = ds.filter(d => d === 'mine').length;
    ux.textAlign = 'left'; ux.font = '700 10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#8fd18f'; ux.fillText('BERGBAUDROHNEN', x0, y);
    ux.textAlign = 'right'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = P.dronesOn ? '#8fd18f' : '#4a5c6a'; ux.fillText(P.dronesOn ? 'AN' : 'AUS', x0 + bw, y); y += 14;
    ux.textAlign = 'left'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#8aa0b0';
    ux.fillText(P.dronesOn ? `${out}/${st.drones} unterwegs · ${mining} bauen ab` : '[4] einschalten', x0, y); y += 20;
  } else {
    ux.textAlign = 'left'; ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#4a5c6a'; ux.fillText('keine Raketenwerfer', x0, y); y += 34;
  }
  const u = cargoUsed(), full = u >= st.cargo;
  row('FRACHT', `${u}/${st.cargo}`, full ? '#ff6b5b' : '#e4eef5');
  ux.fillStyle = '#0e1e28'; ux.fillRect(x0, y + 4, bw, 5);
  let fx = x0;
  for (const it of ITEM_IDS) { const wv = bw * P.cargo[it] / st.cargo; if (wv > 0) { ux.fillStyle = ITEMS[it].c; ux.fillRect(fx, y + 4, Math.min(wv, x0 + bw - fx), 5); fx += wv; } }
  // Patrouillen
  ux.font = '10px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'left';
  world.allies.slice(0, 3).forEach((wg, i) => {
    const x = 12 + i * 44, yy = h - 52;
    ux.fillStyle = wg.alive ? wg.col : '#4a5c6a'; ux.fillText(wg.name.slice(0, 5), x, yy);
    if (wg.alive) sBar(x, yy + 4, 38, wg.hp / wg.maxhp, hpCol(wg.hp / wg.maxhp));
  });
  // Ausbaustufen
  const cw = (w - 24) / ups.length, gy = h - 30;
  ux.strokeStyle = '#1e3a4a'; ux.beginPath(); ux.moveTo(12, gy - 14); ux.lineTo(w - 12, gy - 14); ux.stroke();
  ups.forEach((kk, i) => {
    const x = 12 + i * cw, l = P.up[kk];
    ux.textAlign = 'center'; ux.font = '9px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = l ? '#e4eef5' : '#4a5c6a'; ux.fillText(UPG[kk].s, x + cw / 2, gy);
    for (let p = 0; p < MAXLV; p++) { ux.fillStyle = p < l ? '#5fd0ff' : '#14303e'; ux.fillRect(x + cw / 2 - 15 + p * 3.9, gy + 5, 3, 7); }
  });
  ux.restore();
}

// =============== DOM-Anzeigen (10× pro Sekunde) ===============
let panelT = 0, lastCr: number | null = null;
// Aufsteigende Zahl neben den Credits bei Gewinn oder Ausgabe
function creditFloat(diff: number) {
  const row = $('locCr').parentElement!;
  const el = document.createElement('div');
  el.className = 'crFloat';
  el.style.color = diff > 0 ? 'var(--grn)' : 'var(--bad)';
  el.textContent = (diff > 0 ? '+' : '−') + fmtN(Math.abs(diff));
  row.appendChild(el);
  setTimeout(() => el.remove(), 1700);
}
export function updatePanels(dt: number) {
  panelT -= dt;
  if (panelT > 0 || !world.def) return;
  panelT = 0.1;
  const d = world.def, fac = FACTION[d.faction];
  $('locName').textContent = d.name.toUpperCase();
  const z = $('locZone'); z.textContent = fac.n; z.style.color = fac.c;
  $('locDanger').innerHTML = Array.from({ length: 5 }, (_, i) => `<span style="color:${i < d.danger ? (d.danger >= 4 ? '#c070ff' : d.danger >= 2 ? '#ffb347' : '#8fd18f') : '#3a3328'}">●</span>`).join('');
  $('locCr').textContent = fmtN(P.credits) + ' Cr';
  if (lastCr !== null && P.credits !== lastCr) creditFloat(P.credits - lastCr);
  lastCr = P.credits;
  const hs = SECTOR[P.home.sector], hst = hs?.stations.find(s => s.id === P.home.station);
  $('locHome').textContent = hst ? hst.name : '—';
  $('locP').style.transform = `scale(${settings.hud})`;
  const jobs = P.contracts.length, ready = P.contracts.filter(c => P.cargo[c.item] >= c.amount).length;
  $('locJobs').innerHTML = jobs ? `${jobs}${ready ? ` <span class="good">(${ready} bereit)</span>` : ''}` : '—';
  $('locNet').innerHTML = NET.status === 'online' ? `<span class="good">online · ${NET.roster.length}</span>` : NET.status === 'verbinde' ? '<span class="acc">verbinde …</span>' : NET.status === 'fehler' ? '<span class="bad">getrennt</span>' : '<span style="color:var(--dim)">allein</span>';
  updateObjectives();
  $('objP').style.transform = `scale(${settings.hud})`;
  $('speed').textContent = `${Math.round(Math.hypot(P.vx, P.vy, P.vz))} / ${stats().max} m/s` + (world.ground ? ` · Höhe ${Math.round(P.y - world.ground(P.x, P.z))} m` : '');
  const pr = $('prompt'), st = G.mode === 'play' ? nearDock() : null, li = !st && G.mode === 'play' ? landInfo() : null;
  if (st) { pr.textContent = `[E] An „${st.name}“ andocken`; pr.classList.remove('hidden'); }
  else if (li) { pr.textContent = li.text; pr.classList.remove('hidden'); }
  else pr.classList.add('hidden');
}

// ---------- Aufgaben (rechts oben): verfolgter Auftrag mit Teilschritten, sonst die geplante Route ----------
let objKey = '';
export function trackedContract() { return P.contracts.find(c => c.id === P.track) || P.contracts[0] || null; }
function routeLines(target: string) {
  const L: [string, boolean, boolean][] = [];   // Text, erledigt, Unterzeile
  if (target === P.sector) return L;
  const r = findRoute(P.sector, target), hop = r && r.length > 1 ? r[1] : null;
  if (!r || !hop) return L;
  const g = world.gates.find(q => q.to === hop);
  L.push([`Springe nach <b>${SECTOR[target].name}</b> · ${r.length - 1} ${r.length - 1 === 1 ? 'Sprung' : 'Sprünge'}`, false, false]);
  L.push([`Nächstes Tor: ${SECTOR[hop].name}${g ? ` · <b>${fmtD(d3(g.x, g.y, g.z, P.x, P.y, P.z))}</b>` : ''}`, false, true]);
  return L;
}
function updateObjectives() {
  // verfolgt wird eine Mission (P.track), sonst ein Lieferauftrag, sonst die erste Mission
  const tm = trackedMission(), c = tm ? null : trackedContract(), mm = tm || (!c ? (P.missions || [])[0] : null);
  let title = '', lines: [string, boolean, boolean][] = [];
  const so = storyObjective();   // der Prolog hat Vorrang
  if (so) { title = so.title; lines = so.lines; }
  else if (mm) {
    const ml = missionLines(mm);
    title = ml.title; lines = ml.lines;
    if (!ml.tgtHere) lines.push(...routeLines(mm.tgt));
    const more = P.contracts.length + (P.missions || []).length - 1;
    lines.push([`Lohn <b>${fmtN(mm.reward)} Cr</b> · +${mm.rep} Ruf${more > 0 ? ` · ${more} weitere im Flottenband` : ''}`, false, true]);
  } else if (c) {
    const it = ITEMS[c.item], have = Math.min(P.cargo[c.item], c.amount), here = c.sector === P.sector && !world.surface;
    title = `Lieferauftrag · ${c.stName}`;
    lines.push([`${c.amount}× ${it.n} laden · <b>${have}/${c.amount}</b>`, have >= c.amount, false]);
    if (!here) lines.push(...routeLines(c.sector));
    else {
      const st = world.stations.find(s => s.id === c.station);
      lines.push([`Fliege zu ${c.stName}${st ? ` · <b>${fmtD(d3(st.x, st.y, st.z, P.x, P.y, P.z))}</b>` : ''}`, false, false]);
    }
    lines.push([`Bei ${c.stName} abliefern`, false, false]);
    lines.push([`Belohnung <b>${fmtN(c.reward)} Cr</b>${P.contracts.length > 1 ? ` · ${P.contracts.length - 1} weitere im Flottenband` : ''}`, false, true]);
  } else if (P.route && P.route !== P.sector) {
    title = `Route · ${SECTOR[P.route].name}`;
    lines = routeLines(P.route);
  }
  const key = title + lines.map(l => l.join('|')).join('/');
  if (key === objKey) return;
  objKey = key;
  const box = $('objBox');
  if (!title) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  $('objT').textContent = title;
  $('objL').innerHTML = lines.map(([t, done, sub]) => `<div class="obj${done ? ' done' : ''}${sub ? ' sub' : ''}">${sub ? '' : '<i></i>'}<span>${t}</span></div>`).join('');
}

let bannerTimer = 0;
export function showBanner(title: string, sub: string, col = '#ffb347') {
  const b = $('banner');
  $('bannerT').textContent = title;
  $('bannerT').style.color = col;
  $('bannerS').textContent = sub;
  b.style.transition = 'none';
  b.style.opacity = '1';
  clearTimeout(bannerTimer);
  bannerTimer = window.setTimeout(() => { b.style.transition = 'opacity 1.5s'; b.style.opacity = '0'; }, 3500);
}
