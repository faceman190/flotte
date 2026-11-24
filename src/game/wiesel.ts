import * as THREE from 'three';
import { scene, camera, view, ux } from '../core/engine';
import { clamp, fmtN } from '../core/util';
import { sfx, snd } from '../core/audio';
import { ITEMS } from '../data/items';
import { world } from './world';
import { SALV } from './salvage';
import { stollenEingaenge } from './dungeon';
import { radio } from '../ui/radio';
import { bodenScan } from './bodenaufgaben';

// =====================================================================================
// Sensormast des Erkundungsbuggys „Wiesel“ (seit 2026-11-24): [R] im Buggy tastet 1,6 km um ihn herum ab (Ring läuft über das Gelände,
// die Radarleiste dreht schneller) und zeigt 90 Sekunden lang, was dort liegt: Lagerstätten (Haupterz, Gehalt, Menge), ungeöffnete Kisten,
// Tresorkisten, Wracks und Stolleneingänge – mit Entfernung, auch hinter Hügeln. Danach lädt der Mast 12 Sekunden.
// Der Dachs sieht Lagerstätten nur in 260 m (surface.ts drawRoverHUD); Kisten zeigt sonst nur die Nähe (salvage.ts, 60 m).
// =====================================================================================

type FundArt = 'erz' | 'kiste' | 'tresor' | 'wrack' | 'stollen';
interface Fund { k: FundArt; x: number; y: number; z: number; t: string; col: string; ok: () => boolean }
export const WSCAN = { cool: 0, coolMax: 12, t: -1, range: 1600, life: 0, funde: [] as Fund[], zeile: '' };

// Ring über das Gelände: flach, leuchtend, wird groß und blasst aus
let ring: THREE.Mesh | null = null;
const ringMat = new THREE.MeshBasicMaterial({ color: 0x4fd6c4, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
function ringAt(x: number, y: number, z: number) {
  if (!ring) { ring = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 160, 1), ringMat); ring.rotation.x = -Math.PI / 2; ring.renderOrder = 5; ring.frustumCulled = false; }
  if (!ring.parent) scene.add(ring);
  ring.position.set(x, y, z); ring.scale.setScalar(1); ringMat.opacity = 0.9; ring.visible = true;
}

export function wieselScan(x: number, y: number, z: number): boolean {
  const S = WSCAN;
  if (S.cool > 0 || !world.surface) { if (S.cool > 0) snd(160, 0.08, 'square', 0.025, -20); return false; }
  S.cool = S.coolMax; S.t = 0; S.life = 90;
  const R = S.range, near = (fx: number, fz: number) => Math.hypot(fx - x, fz - z) < R;
  const f: Fund[] = [];
  for (const a of world.asteroids) {
    if (!near(a.x, a.z)) continue;
    const m = a.comp[0];
    f.push({ k: 'erz', x: a.x, y: a.y + a.r * 0.8, z: a.z, t: `◆ ${ITEMS[m.k].n.toUpperCase()} ${Math.round(m.p * 100)} %${a.comp[1] ? ' + ' + ITEMS[a.comp[1].k].short : ''} · ${a.yld} E`, col: ITEMS[m.k].c, ok: () => world.asteroids.includes(a) && a.yld > 0 });
    a.scanT = Math.max(a.scanT, 90);
  }
  for (const c of SALV.crates) {
    if (c.open || !near(c.x, c.z)) continue;
    f.push({ k: c.big ? 'tresor' : 'kiste', x: c.x, y: c.y + 1.4, z: c.z, t: c.big ? '▣ TRESORKISTE' : '▪ KISTE', col: c.big ? '#ffb347' : '#9fd8ff', ok: () => !c.open });
  }
  for (const w of SALV.wrecks) if (near(w.x, w.z)) f.push({ k: 'wrack', x: w.x, y: 0, z: w.z, t: `◇ ${w.name.toUpperCase()}`, col: '#e0b030', ok: () => true });
  for (const e of stollenEingaenge()) if (near(e.x, e.z)) f.push({ k: 'stollen', x: e.x, y: e.y + e.size + 3, z: e.z, t: `▲ ${e.name.toUpperCase()}`, col: '#c8a0ff', ok: () => true });
  for (const v of bodenScan(x, z, R)) f.push({ k: 'wrack', x: v.x, y: v.y, z: v.z, t: v.t, col: v.col, ok: () => true });
  for (const w of f) if (w.k === 'wrack' && !w.t.startsWith('✚')) w.y = (world.ground?.(w.x, w.z) ?? 0) + 10;
  S.funde = f;
  const n = (k: FundArt) => f.filter(q => q.k === k).length, teile: string[] = [];
  const add = (c: number, one: string, many: string) => { if (c) teile.push(`${c} ${c === 1 ? one : many}`); };
  add(n('erz'), 'Lagerstätte', 'Lagerstätten'); add(n('kiste') + n('tresor'), n('tresor') ? 'Kiste (Tresor)' : 'Kiste', n('tresor') ? `Kisten (${n('tresor')} Tresor${n('tresor') > 1 ? 'e' : ''})` : 'Kisten');
  add(n('wrack'), 'Wrack', 'Wracks'); add(n('stollen'), 'Stollen', 'Stollen');
  const kurz = [[n('erz'), 'Erz'], [n('kiste') + n('tresor'), 'Kisten'], [n('wrack'), 'Wracks'], [n('stollen'), 'Stollen']].filter(x => x[0]).map(x => `${x[0]} ${x[1]}`);
  S.zeile = kurz.join(' · ') || 'nichts gefunden';
  radio('SYSTEM', f.length ? `Sensormast: ${teile.join(', ')} im Umkreis von ${(R / 1000).toFixed(1).replace('.', ',')} km.` : `Sensormast: nichts im Umkreis von ${(R / 1000).toFixed(1).replace('.', ',')} km.`);
  ringAt(x, y + 0.6, z);
  sfx('scan_pulse', 0.6, 0.8, () => snd(420, 1.1, 'sine', 0.05, 700));
  return true;
}

export function updateWieselScan(dt: number) {
  const S = WSCAN;
  S.cool = Math.max(0, S.cool - dt);
  if (S.life > 0) { S.life -= dt; if (S.life <= 0) S.funde = []; else S.funde = S.funde.filter(q => q.ok()); }
  if (S.t >= 0) {
    S.t += dt;
    const k = Math.min(1, S.t / 1.8);
    if (ring) { ring.scale.setScalar(Math.max(1, S.range * (1 - Math.pow(1 - k, 2)))); ringMat.opacity = 0.9 * (1 - k); }
    if (k >= 1) { S.t = -1; if (ring) ring.visible = false; }
  }
}
export function wieselScanWeg() { WSCAN.funde = []; WSCAN.life = 0; WSCAN.t = -1; if (ring) { ring.visible = false; ring.removeFromParent(); } }

// Marken der Funde im Bild, nächste zuerst (höchstens 30); was außerhalb des Bilds liegt, zählt nur die Zeile im Panel
const _p = new THREE.Vector3();
export function drawWieselScan(px: number, pz: number) {
  const S = WSCAN;
  if (!S.funde.length) return;
  const W = view.W, H = view.H, fade = Math.min(1, S.life / 6);
  const list = S.funde.map(f => ({ f, d: Math.hypot(f.x - px, f.z - pz) })).filter(o => o.d > 14).sort((a, b) => a.d - b.d).slice(0, 30);
  ux.save(); ux.textAlign = 'center'; ux.font = '700 11px "Share Tech Mono",Consolas,monospace';
  const used: number[][] = [];      // belegte Schriftfelder: Was sich überdecken würde, bekommt nur die Marke (die nächsten Funde zuerst)
  for (const { f, d } of list) {
    _p.set(f.x, f.y, f.z).project(camera);
    if (_p.z > 1 || Math.abs(_p.x) > 1 || Math.abs(_p.y) > 1) continue;
    const x = (_p.x + 1) / 2 * W, y = (1 - _p.y) / 2 * H;
    ux.globalAlpha = fade * clamp(1.25 - d / S.range * 0.6, 0.45, 1);
    ux.fillStyle = f.col;
    ux.beginPath(); ux.moveTo(x, y + 2); ux.lineTo(x - 4, y - 5); ux.lineTo(x + 4, y - 5); ux.closePath(); ux.fill();
    const txt = `${f.t} · ${d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : fmtN(Math.round(d)) + ' m'}`, tw = ux.measureText(txt).width;
    const r = [x - tw / 2 - 3, y - 21, x + tw / 2 + 3, y - 6];
    if (used.some(u => r[0] < u[2] && r[2] > u[0] && r[1] < u[3] && r[3] > u[1])) continue;
    used.push(r); ux.fillText(txt, x, y - 9);
  }
  ux.restore();
}
