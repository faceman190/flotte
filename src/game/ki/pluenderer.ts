import * as THREE from 'three';
import { scene, camera, ux, view } from '../../core/engine';
import { gunShot } from '../../core/audio';
import { MANIFEST } from '../../core/assets';
import { hashStr } from '../../core/util';
import { P, G, saveGame } from '../state';
import { terrainAt, liquidAt } from '../surface';
import { SALV } from '../salvage';
import { makeAvatar, driveAvatar, freeAvatar, avatarMuzzle, type Avatar } from '../avatar';
import type { Tracht } from '../figur';
import { tracer as fxTracer, impact } from '../footfx';
import { flash } from '../fx';
import { whiz, noteKill } from '../footgun';
import { FELD_EXTRA, feldHurt, feldSay, feldKoop } from '../fieldfight';
import { granatenListe } from '../granate';
import { onCoop, coopSend, coopNet, pack } from '../coop';
import { bauKoerper, koerper, koerperWeg } from '../koerper';
import { SECTOR } from '../../data/galaxy';
import { GEAR_IDS, gearDef } from '../../data/gear';
import { addItem, canAdd } from '../inventory';
import { type V3, type Quader, strahlQuader, imQuader, winkel } from './typen';
import { type Deckung, erzeugeDeckung, besteDeckung, schuetzt, schussPunkt, DECK } from './deckung';
import { type Sinne, neueSinne, sinneUpdate, hoeren, type Kandidat } from './wahrnehmung';
import { type Aktion, type Lage, waehle, Freigabe } from './gehirn';
import { Navi, ladeRecast, recastBereit } from './navi';
import { type LagerPlan, planLager, bauModelle, navQuelle } from './lager';

// =====================================================================================
// Plünderer (seit 26.11.2026): menschliche Gegner mit Gewehr auf dem Planetenboden. Erster Gegner der neuen KI (docs/ki-gegner.md).
//
// Ablauf je Gegner:  Wahrnehmung (wahrnehmung.ts, alle 0,15 s)  →  Entscheiden (gehirn.ts, alle 0,4 s)  →  Ausführen (hier, je Bild)
// Bewegung über das Navmesh des Lagers (navi.ts), Deckung aus den Quadern des Lagers (deckung.ts), Körper und Bewegungen wie die
// Mitspieler (Manny-Skelett, Lyra-Gewehr; avatar.ts → fremdFigur.ts).
//
// Mehrspieler wie bei den Drohnen (coop.ts): Der Gastgeber des Planeten rechnet alle Plünderer und schickt 10× je Sekunde ihren Stand
// samt Schüssen; die anderen zeigen ihn an und melden ihre Treffer. Wer ein Lager aufstellt, meldet es allen (Startwert und Ort).
// =====================================================================================

export const KI = { debug: false };

// ---------- Werte ----------
const WAFFE = { schaden: 6, kopf: 1.6, mag: 30, nachladen: 2.4, salve: [3, 6] as [number, number], takt: 0.13, pause: [0.45, 1.1] as [number, number], ideal: [10, 32] as [number, number] };
const TEMPO = { gehen: 1.5, laufen: 4.4, vorsichtig: 2.6 };
const LEBEN = 85;

interface Pl {
  id: number;
  x: number; y: number; z: number; vx: number; vz: number;
  blick: number; pitch: number;           // Blick: atan2(dx, dz)
  hp: number; max: number; tot: boolean; totT: number;
  av: Avatar | null;
  sinne: Sinne;
  aktion: Aktion; aktT: number; denkT: number; sinnT: number; werte: Record<string, number> | null;
  weg: V3[]; wegI: number; ref: number; wegZiel: V3 | null; wegT: number;
  deck: Deckung | null; phase: 'hin' | 'hock' | 'raus' | 'aus'; phaseT: number;
  mag: number; ladeT: number; schussT: number; salve: number; schuesse: number; treffer: number; warm: number;
  geduckt: boolean; zielen: boolean; unterFeuer: number;
  rolle: 'feuer' | 'vor';
  streife: number; warteT: number;
  ruf: { t: string; bis: number } | null;
  wache: { x: number; z: number; blick: number } | null;
  nx?: number; ny?: number; nz?: number; nb?: number;    // Netzstand (Mitspieler)
}

interface Lager { key: string; sector: string; seed: number; plan: LagerPlan; quader: Quader[]; deck: Deckung[]; navi: Navi | null; g: THREE.Group; pl: Pl[]; trupp: Freigabe; alarmT: number; idBase: number }
let L: Lager | null = null;

const danger = () => (SECTOR[P.sector] && SECTOR[P.sector].danger) || 1;
const R = (a: number, b: number) => a + Math.random() * (b - a);
const wracks = () => SALV.wrecks.map(w => ({ x: w.x, z: w.z, r: w.r }));

// ---------- Sichtlinie: Gelände und Hindernisse des Lagers ----------
function sicht(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const dx = bx - ax, dy = by - ay, dz = bz - az, d = Math.hypot(dx, dy, dz);
  if (d < 0.01) return true;
  if (L) for (const q of L.quader) { const t = strahlQuader(q, ax, ay, az, dx / d, dy / d, dz / d, d); if (t >= 0) return false; }
  const n = Math.max(2, Math.ceil(d / 2));
  for (let i = 1; i < n; i++) { const t = i / n; if (terrainAt(ax + dx * t, az + dz * t) > ay + dy * t) return false; }
  return true;
}
/** erster Treffer eines Strahls an Hindernis oder Gelände (Abstand) */
function strahl(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMax: number) {
  let tw = tMax;
  if (L) for (const q of L.quader) { const t = strahlQuader(q, ox, oy, oz, dx, dy, dz, tw); if (t >= 0 && t < tw) tw = t; }
  for (let t = 0.5; t < tw; t += 0.5) if (terrainAt(ox + dx * t, oz + dz * t) > oy + dy * t) { tw = t; break; }
  return tw;
}

// ---------- Lager aufstellen ----------
const tracht = (i: number): Tracht => ({ figur: 1 + (i % 3), teile: { overall: 'overall_02', stiefel: 'stiefel_02', handschuh: 'handschuh_01', ...(i % 2 ? { helm: 'helm_02' } : {}), ...(i % 3 === 1 ? { weste: 'weste_01' } : {}) } });

function frei(x: number, z: number) {
  if (liquidAt(x, z)) return false;
  const h = terrainAt(x, z), s = 0.8;
  return Math.abs(terrainAt(x + s, z) - h) < 0.7 && Math.abs(terrainAt(x, z + s) - h) < 0.7 && !wracks().some(w => Math.hypot(w.x - x, w.z - z) < w.r + 0.6);
}

export function lagerAufstellen(x: number, z: number, seed: number, n = 0, melden = true) {
  lagerWeg();
  const plan = planLager(x, z, seed, terrainAt, frei, wracks());
  const g = bauModelle(plan); scene.add(g);
  const key = 'ki-lager-' + seed; bauKoerper(key, g);
  const deck = erzeugeDeckung(plan.quader, terrainAt, frei);
  const anz = n || Math.min(6, 3 + Math.floor(danger()));
  L = { key, sector: P.sector, seed, plan, quader: plan.quader, deck, navi: null, g, pl: [], trupp: new Freigabe(2), alarmT: -99, idBase: (seed % 1000) * 16 };
  for (let i = 0; i < anz; i++) {
    const w = plan.wachen[i] || null;
    const s = w || plan.streife[i % Math.max(1, plan.streife.length)] || { x: x + 4 * Math.cos(i), z: z + 4 * Math.sin(i) };
    const p: Pl = {
      id: L.idBase + i, x: s.x, y: terrainAt(s.x, s.z), z: s.z, vx: 0, vz: 0, blick: w ? w.blick : Math.random() * 6.28, pitch: 0,
      hp: Math.round(LEBEN * (1 + 0.2 * (danger() - 1))), max: 0, tot: false, totT: 0, av: null, sinne: neueSinne(),
      aktion: 'streife', aktT: 0, denkT: Math.random() * 0.4, sinnT: Math.random() * 0.15, werte: null,
      weg: [], wegI: 0, ref: 0, wegZiel: null, wegT: 0, deck: null, phase: 'aus', phaseT: 0,
      mag: WAFFE.mag, ladeT: 0, schussT: 0, salve: 0, schuesse: 0, treffer: 0, warm: 0, geduckt: false, zielen: false, unterFeuer: 0,
      rolle: i % 2 ? 'vor' : 'feuer', streife: i, warteT: R(0, 3), ruf: null, wache: w,
    };
    p.max = p.hp;
    const a = makeAvatar({ helm: 'wache', anzug: 'panzer' });
    if (a) { a.tracht = tracht(i + seed); scene.add(a.s.g); p.av = a; }
    L.pl.push(p);
  }
  // Wegfindung im Hintergrund laden und bauen; bis dahin laufen die Plünderer geradeaus
  const lager = L;
  ladeRecast(MANIFEST?.files['lazy/Recast']?.url).then(() => {
    if (L !== lager || !recastBereit()) return;
    const t0 = performance.now();
    const src = navQuelle(plan, plan.r + 22, 1.25, terrainAt, liquidAt, wracks());
    lager.navi = Navi.bauen(src.pos, src.idx);
    if (lager.navi) for (const p of lager.pl) { const q = lager.navi.naechster(p.x, p.y, p.z, 3); if (q) p.ref = q.ref; }
    if (KI.debug) console.info(`Navmesh Plündererlager: ${(performance.now() - t0).toFixed(0)} ms, ${src.idx.length / 3} Dreiecke`);
  });
  if (melden) coopSend('kl', { s: P.sector, x: +x.toFixed(2), z: +z.toFixed(2), seed, n: anz });
  return L;
}

export function lagerWeg() {
  if (!L) return;
  for (const p of L.pl) if (p.av) freeAvatar(p.av);
  L.g.removeFromParent(); koerperWeg(L.key); koerperWeg('ki-pl-'); L.navi?.dispose();
  L = null;
}
export const lagerAktiv = () => !!L;
export const lagerInfo = () => L ? { x: L.plan.x, z: L.plan.z, lebend: L.pl.filter(p => !p.tot).length, gesamt: L.pl.length, navmesh: !!L.navi, deckung: L.deck.length } : null;

// ---------- Bewegung ----------
function zielSetzen(p: Pl, x: number, z: number) {
  if (!p.wegZiel && Math.hypot(x - p.x, z - p.z) < 0.3) return;      // schon da
  if (p.wegZiel && Math.hypot(p.wegZiel.x - x, p.wegZiel.z - z) < 0.6 && G.time - p.wegT < 2) return;
  p.wegZiel = { x, y: terrainAt(x, z), z }; p.wegT = G.time;
  const n = L?.navi;
  if (n) { const w = n.weg({ x: p.x, y: p.y, z: p.z }, p.wegZiel); p.weg = w.length ? w : [p.wegZiel]; }
  else p.weg = [p.wegZiel];
  p.wegI = 0;
}
const amZiel = (p: Pl, r = 0.45) => !p.wegZiel || Math.hypot(p.wegZiel.x - p.x, p.wegZiel.z - p.z) < r;
function stopp(p: Pl) { p.wegZiel = null; p.weg = []; }

function bewegen(p: Pl, dt: number, tempo: number) {
  let wx = 0, wz = 0;
  if (p.wegZiel && p.weg.length) {
    while (p.wegI < p.weg.length - 1 && Math.hypot(p.weg[p.wegI].x - p.x, p.weg[p.wegI].z - p.z) < 0.35) p.wegI++;
    const c = p.weg[p.wegI], dx = c.x - p.x, dz = c.z - p.z, d = Math.hypot(dx, dz);
    const last = p.wegI === p.weg.length - 1;
    const v = last ? Math.min(tempo, d * 2.5) : tempo;
    if (d > 0.05) { wx = dx / d * v; wz = dz / d * v; }
    if (last && d < 0.3) stopp(p);
  }
  // Abstand zu den anderen
  if (L) for (const o of L.pl) {
    if (o === p || o.tot) continue;
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz);
    if (d < 1.1 && d > 0.01) { const k = (1.1 - d) * 3; wx += dx / d * k; wz += dz / d * k; }
  }
  // weich anfahren und bremsen
  const k = Math.min(1, dt * 7);
  p.vx += (wx - p.vx) * k; p.vz += (wz - p.vz) * k;
  if (Math.hypot(p.vx, p.vz) < 0.02) { p.vx = p.vz = 0; return; }
  let nx = p.x + p.vx * dt, nz = p.z + p.vz * dt;
  const n = L?.navi;
  if (n && p.ref) { const r = n.schieben(p.ref, { x: p.x, y: p.y, z: p.z }, { x: nx, y: p.y, z: nz }); nx = r.x; nz = r.z; p.ref = r.ref; }
  else if (n) { const q = n.naechster(nx, p.y, nz, 3); if (q) { p.ref = q.ref; nx = q.x; nz = q.z; } }
  else if (L && L.quader.some(q => imQuader(q, nx, nz, 0.4))) { nx = p.x; nz = p.z; }      // ohne Navmesh: an Hindernissen stehen bleiben
  if (liquidAt(nx, nz)) { p.vx = p.vz = 0; return; }
  p.vx = (nx - p.x) / dt; p.vz = (nz - p.z) / dt;
  p.x = nx; p.z = nz; p.y = terrainAt(nx, nz);
}

function dreheZu(p: Pl, ziel: number, dt: number, rate = 5) {
  const d = winkel(ziel - p.blick); p.blick = winkel(p.blick + Math.sign(d) * Math.min(Math.abs(d), rate * dt));
}

// ---------- Ziele: ich und (beim Gastgeber) die Mitspieler zu Fuß ----------
interface Ziel extends Kandidat { geduckt: boolean; lehnt?: boolean }
let ME: { x: number; y: number; z: number; ok: boolean; geduckt: boolean; vx: number; vz: number; lehnt?: boolean } = { x: 0, y: 0, z: 0, ok: false, geduckt: false, vx: 0, vz: 0 };
function ziele(): Ziel[] {
  const out: Ziel[] = [];
  if (ME.ok) out.push({ id: coopNet.id || 0, x: ME.x, y: ME.y + 1.55, z: ME.z, geduckt: ME.geduckt, lehnt: ME.lehnt, bewegt: Math.hypot(ME.vx, ME.vz) > 1 });
  const k = feldKoop();
  if (!k.client) for (const m of k.mates) out.push({ id: m.id, x: m.x, y: m.y + 1.55, z: m.z, geduckt: false, bewegt: true });
  return out;
}
const zielVon = (id: number) => ziele().find(z => z.id === id) || null;

// ---------- Schießen ----------
let ev: (string | number)[][] = [];
const _m = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
function muendung(p: Pl): THREE.Vector3 {
  const m = p.av && avatarMuzzle(p.av);
  if (m) return _m.copy(m);
  return _m.set(p.x + Math.sin(p.blick) * 0.6, p.y + (p.geduckt && p.phase !== 'raus' ? 1.05 : 1.45), p.z + Math.cos(p.blick) * 0.6);
}
function schussBild(p: Pl, ex: number, ey: number, ez: number, traf: boolean) {
  const a = muendung(p); _b.set(ex, ey, ez);
  fxTracer(a, _b, '#ffcf8a', 0.05);
  flash(a.x, a.y, a.z, '#ffd9a0', 0.32, 0.05);
  const dist = Math.hypot(a.x - camera.position.x, a.z - camera.position.z);
  gunShot('rifle', 0.5 * Math.max(0.05, 1 - dist / 140), 0.93 + Math.random() * 0.08);
  if (!traf) impact(_b, _d.copy(_b).sub(a).normalize(), 'boden');
  // knapp am Spieler vorbei: Pfeifen
  if (ME.ok) {
    const dx = ex - a.x, dy = ey - a.y, dz = ez - a.z, l = Math.hypot(dx, dy, dz) || 1;
    const t = Math.max(0, Math.min(l, ((ME.x - a.x) * dx + (ME.y + 1.3 - a.y) * dy + (ME.z - a.z) * dz) / l));
    const c = Math.hypot(a.x + dx / l * t - ME.x, a.y + dy / l * t - ME.y - 1.3, a.z + dz / l * t - ME.z);
    if (!traf || c > 0.6) whiz({}, c);
  }
  p.schuesse++;
}

/** Trefferwahrscheinlichkeit eines Schusses: nah, ruhig, eingeschossen = gut; Ziel in Bewegung, geduckt, selbst unter Feuer = schlecht */
function trefferChance(p: Pl, z: Ziel, d: number) {
  let c = 0.62 * Math.max(0.12, 1 - d / 70);
  if (z.bewegt) c *= 0.7;
  if (z.geduckt) c *= 0.8;
  if (z.lehnt) c *= 0.6;                    // um die Kante gelehnt: nur Kopf und Schulter schauen heraus
  if (Math.hypot(p.vx, p.vz) > 0.5) c *= 0.55;
  c *= 1 - 0.45 * p.unterFeuer;
  c *= 0.45 + 0.55 * p.warm;                // die ersten Schüsse auf ein neues Ziel gehen eher daneben
  return c;
}

function feuern(p: Pl, z: Ziel) {
  const a = muendung(p), d = Math.hypot(z.x - a.x, z.z - a.z);
  const ty = z.y - (z.geduckt ? 0.75 : 0.5);
  if (!sicht(a.x, a.y, a.z, z.x, ty, z.z)) return false;
  const traf = Math.random() < trefferChance(p, z, d);
  let ex: number, ey: number, ez: number;
  if (traf) { ex = z.x + R(-0.15, 0.15); ey = ty + R(-0.2, 0.25); ez = z.z + R(-0.15, 0.15); }
  else {
    // daneben: seitlich oder darüber, dann weiter bis zum ersten Hindernis
    const sx = -(z.z - a.z) / (d || 1), sz = (z.x - a.x) / (d || 1), off = R(0.7, 2.2) * (Math.random() < 0.5 ? -1 : 1);
    const tx = z.x + sx * off, ty2 = ty + R(-0.4, 1.4), tz = z.z + sz * off;
    const dx = tx - a.x, dy = ty2 - a.y, dz = tz - a.z, l = Math.hypot(dx, dy, dz) || 1;
    const t = strahl(a.x, a.y, a.z, dx / l, dy / l, dz / l, l * 2.5);
    ex = a.x + dx / l * t; ey = a.y + dy / l * t; ez = a.z + dz / l * t;
  }
  const dmg = WAFFE.schaden * (1 + 0.25 * (danger() - 1));
  schussBild(p, ex, ey, ez, traf);
  if (traf && z.id === (coopNet.id || 0)) feldHurt(dmg);
  if (feldKoop().mates.length) ev.push(['s', p.id, z.id, traf ? 1 : 0, Math.round(dmg * 10) / 10, ...pack(ex, ey, ez)]);
  p.warm = Math.min(1, p.warm + 0.12);
  // Lärm: die anderen hören es
  if (L) for (const o of L.pl) if (o !== p && !o.tot) hoeren(o.sinne, o, { x: z.x, y: z.y, z: z.z, r: 60 }, G.time);
  return true;
}

// ---------- Treffer am Plünderer ----------
function kapsel(p: Pl) { return { top: p.y + (p.geduckt && p.phase !== 'raus' ? 1.25 : 1.8), r: 0.36 }; }
/** Strahl gegen alle Plünderer: nächster Treffer vor tMax */
function strahlPl(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMax: number) {
  if (!L) return null;
  let best: { p: Pl; t: number; kopf: boolean } | null = null;
  const hl = Math.hypot(dx, dz);
  for (const p of L.pl) {
    if (p.tot) continue;
    const k = kapsel(p);
    // nächster Punkt des Strahls zur senkrechten Achse (waagerecht gerechnet)
    const t = hl > 1e-6 ? ((p.x - ox) * dx + (p.z - oz) * dz) / (hl * hl) : 0;
    if (t < 0 || t > (best ? best.t : tMax)) continue;
    const qx = ox + dx * t - p.x, qz = oz + dz * t - p.z, y = oy + dy * t;
    if (qx * qx + qz * qz > k.r * k.r || y < p.y + 0.1 || y > k.top + 0.05) continue;
    best = { p, t, kopf: y > k.top - 0.28 };
  }
  return best;
}

function schaden(p: Pl, dmg: number, von: number) {
  if (p.tot) return;
  p.hp -= dmg; p.treffer++; p.unterFeuer = Math.min(1, p.unterFeuer + 0.45);
  p.sinne.wach = 1;
  const z = zielVon(von); if (z) { p.sinne.zuletzt = { x: z.x, y: z.y, z: z.z, t: G.time }; p.sinne.ziel = z.id; }
  if (p.hp <= 0) toeten(p, von);
  else if (Math.random() < 0.35) rufen(p, ['Treffer!', 'Ich bin getroffen!', 'Argh!'][Math.floor(Math.random() * 3)]);
  if (L) L.alarmT = G.time;
}

function toeten(p: Pl, von: number) {
  if (p.tot) return;
  p.tot = true; p.totT = 0; p.hp = 0; stopp(p); p.vx = p.vz = 0;
  if (p.deck) { p.deck.belegt = -1; p.deck = null; }
  L?.trupp.weg(p.id);
  if (L) for (const o of L.pl) if (!o.tot && Math.hypot(o.x - p.x, o.z - p.z) < 30) { o.unterFeuer = Math.min(1, o.unterFeuer + 0.3); if (Math.random() < 0.5) rufen(o, ['Mann am Boden!', 'Sie haben ihn erwischt!', 'Verdammt!'][Math.floor(Math.random() * 3)]); }
  const k = feldKoop();
  if (k.mates.length && !k.client) ev.push(['k', p.id, von]);
  if (von !== (coopNet.id || 0)) return;
  noteKill();
  const cr = Math.round((70 + Math.random() * 60) * (1 + 0.4 * (danger() - 1)));
  P.credits += cr; P.earned += cr; P.kills = (P.kills || 0) + 1;
  feldSay(`Plünderer ausgeschaltet · +${cr} Credits`, '#ffb347');
  if (Math.random() < 0.2) {
    const pool = GEAR_IDS.filter(id => { const d = gearDef(id)!; return d.rar <= 1 && /^waffe_|^helm_|^weste_/.test(id); });
    const id = pool[Math.floor(Math.random() * pool.length)];
    if (id && canAdd(id) && addItem(id, 1)) feldSay(`Beim Plünderer gefunden: ${gearDef(id)!.n}`, '#5fd0ff');
  }
  if (L && L.pl.every(o => o.tot)) feldSay('Das Lager ist geräumt.', '#3ad06a');
  saveGame();
}

function rufen(p: Pl, t: string) { if (!p.ruf || p.ruf.bis < G.time) p.ruf = { t, bis: G.time + 1.8 }; }

// Treffer des Spielers (fieldfight.ts → FELD_EXTRA): Gastgeber rechnet selbst, Mitspieler melden
function getroffen(p: Pl, dmg: number, kopf: boolean) {
  const d = dmg * (kopf ? WAFFE.kopf : 1);
  G.hitMark = 0.12;
  if (feldKoop().client) { p.treffer++; coopSend('kh', { s: P.sector, i: p.id, d: Math.round(d * 10) / 10 }); return; }
  schaden(p, d, coopNet.id || 0);
}

// ---------- Denken und Handeln ----------
/** gesehenes Ziel (im Kampf oder entdeckt), sonst null */
function gesehen(p: Pl): Ziel | null { return p.sinne.ziel >= 0 && p.sinne.sieht && (p.sinne.kampf || p.sinne.wach >= 1) ? zielVon(p.sinne.ziel) : null; }
/** aus der Deckung: wäre das Ziel (zuletzt gesehen vor kurzem) aus der Schussposition zu sehen? */
function vonDeckungSichtbar(p: Pl, zl: { x: number; y: number; z: number; t: number } | null) {
  if (!p.deck || !zl || G.time - zl.t > 6 || Math.hypot(p.deck.x - p.x, p.deck.z - p.z) > 0.8) return false;
  const sp = schussPunkt(p.deck); return sicht(sp.x, sp.y, sp.z, zl.x, zl.y - 0.3, zl.z);
}
function lage(p: Pl, z: Ziel | null): Lage {
  const zl = p.sinne.zuletzt;
  const zd = z ? Math.hypot(z.x - p.x, z.z - p.z) : zl ? Math.hypot(zl.x - p.x, zl.z - p.z) : Infinity;
  const ref = z || zl;
  const inD = !!(p.deck && ref && Math.hypot(p.deck.x - p.x, p.deck.z - p.z) < 0.8 && schuetzt(p.deck, ref.x, ref.y, ref.z, sicht));
  const sieht = !!z || (inD && vonDeckungSichtbar(p, zl));
  return {
    hp: p.hp / p.max, mag: p.mag / WAFFE.mag, wach: p.sinne.kampf ? 1 : p.sinne.wach, sieht, zielDist: zd,
    zuletztAlter: zl ? G.time - zl.t : Infinity, inDeckung: inD, deckungFrei: !!(L && L.deck.length && ref),
    unterFeuer: p.unterFeuer, feuerFrei: sieht && !!L && L.trupp.frei(p.id, G.time, true), granate: granateNah(p),
    rolle: p.rolle, truppAnteil: L ? L.pl.filter(o => !o.tot).length / L.pl.length : 1, ideal: WAFFE.ideal,
    flankeFrei: !!ref, aktion: p.aktion, zeit: p.aktT,
  };
}
function granateNah(p: Pl) { return granatenListe().some(g => Math.hypot(g.x - p.x, g.z - p.z) < 7 && g.t < 2); }

function neueAktion(p: Pl, a: Aktion) {
  if (a === p.aktion) return;
  const alt = p.aktion; p.aktion = a; p.aktT = 0;
  if (a !== 'schiessen' && a !== 'nachladen' && a !== 'sichern' && p.deck && (a === 'deckung' || a === 'flankieren' || a === 'rueckzug' || a === 'stuermen' || a === 'ausweichen' || a === 'streife')) { p.deck.belegt = -1; p.deck = null; }
  if (a === 'schiessen' || a === 'stuermen') { if (p.salve <= 0) p.salve = Math.round(R(...WAFFE.salve)); p.phase = p.deck ? 'hock' : 'aus'; p.phaseT = R(0.1, 0.4); }
  if (a === 'nachladen') p.ladeT = WAFFE.nachladen;
  if (a !== 'schiessen') L?.trupp.frei(p.id, G.time, false);
  // Rufe: machen das Denken sichtbar
  if (a === 'deckung' && alt !== 'deckung') rufen(p, Math.random() < 0.5 ? 'Deckung!' : 'In Deckung!');
  else if (a === 'flankieren') rufen(p, Math.random() < 0.5 ? 'Ich gehe links herum!' : 'Ich flankiere!');
  else if (a === 'nachladen') rufen(p, 'Lade nach!');
  else if (a === 'rueckzug') rufen(p, 'Zurück!');
  else if (a === 'ausweichen') rufen(p, 'Granate!');
  else if (a === 'untersuchen' && alt === 'streife') rufen(p, 'Was war das?');
  else if (a === 'stuermen') rufen(p, 'Drauf!');
}

function deckungSuchen(p: Pl, ref: V3, opt: { verstecken?: boolean; flanke?: boolean; weit?: boolean } = {}) {
  if (!L) return null;
  let flanke: { x: number; z: number } | null = null;
  if (opt.flanke) {
    // seitlich zur Linie Trupp → Ziel, auf der Seite, auf der dieser Plünderer schon steht
    const lebend = L.pl.filter(o => !o.tot), mx = lebend.reduce((s, o) => s + o.x, 0) / lebend.length, mz = lebend.reduce((s, o) => s + o.z, 0) / lebend.length;
    const fx = -(ref.z - mz), fz = ref.x - mx, side = Math.sign((p.x - mx) * fx + (p.z - mz) * fz) || 1;
    flanke = { x: fx * side, z: fz * side };
  }
  const kam = L.pl.filter(o => o !== p && !o.tot).map(o => o.deck ? { x: o.deck.x, z: o.deck.z } : { x: o.x, z: o.z });
  const best = besteDeckung(L.deck, { ich: { x: p.x, z: p.z, id: p.id }, ziel: { x: ref.x, y: ref.y, z: ref.z }, ideal: opt.weit ? [24, 45] : WAFFE.ideal, kameraden: kam, nurVerstecken: !!opt.verstecken, flanke, maxWeg: opt.flanke ? 34 : 26, meiden: opt.flanke ? { x: p.x, z: p.z, r: 6 } : null }, sicht);
  if (!best) return null;
  if (p.deck && p.deck !== best.d) p.deck.belegt = -1;
  best.d.belegt = p.id; best.d.lehne = best.lehne; p.deck = best.d;
  return best.d;
}

function handeln(p: Pl, dt: number) {
  const z = gesehen(p);
  const zl = p.sinne.zuletzt, ref: V3 | null = z || zl;
  let tempo = 0;
  p.zielen = p.sinne.wach >= 0.35; p.geduckt = false;
  const blickZu = (q: V3, rate = 6) => dreheZu(p, Math.atan2(q.x - p.x, q.z - p.z), dt, rate);
  switch (p.aktion) {
    case 'streife': {
      p.zielen = false;
      if (p.wache) {
        if (Math.hypot(p.wache.x - p.x, p.wache.z - p.z) > 0.6) { zielSetzen(p, p.wache.x, p.wache.z); tempo = TEMPO.gehen; }
        else { stopp(p); p.warteT -= dt; if (p.warteT <= 0) { p.warteT = R(3, 7); p.nb = p.wache.blick + R(-0.8, 0.8); } dreheZu(p, p.nb ?? p.wache.blick, dt, 1.2); }
        break;
      }
      const pts = L?.plan.streife || [];
      if (!pts.length) break;
      const s = pts[p.streife % pts.length];
      if (Math.hypot(s.x - p.x, s.z - p.z) < 0.8) { stopp(p); p.warteT -= dt; dreheZu(p, p.blick + 0.4 * Math.sin(G.time * 0.7 + p.id), dt, 0.8); if (p.warteT <= 0) { p.streife++; p.warteT = R(2, 5); } }
      else { zielSetzen(p, s.x, s.z); tempo = TEMPO.gehen; }
      break;
    }
    case 'untersuchen': {
      if (!zl) break;
      if (Math.hypot(zl.x - p.x, zl.z - p.z) > 2.5) { zielSetzen(p, zl.x, zl.z); tempo = TEMPO.vorsichtig; if (p.aktT < 1.5 || G.time - zl.t < 3) blickZu(zl, 4); else dreheZu(p, Math.atan2(p.vx, p.vz), dt, 3); }
      else { stopp(p); dreheZu(p, p.blick + 1.2, dt, 1.0); }
      break;
    }
    case 'sichern': {
      stopp(p);
      if (p.deck) p.geduckt = p.deck.art === 'halb';
      if (zl) blickZu(zl, 3);
      break;
    }
    case 'deckung': case 'flankieren': case 'rueckzug': {
      if (!ref) break;
      if (!p.deck || p.aktT < dt * 1.5) deckungSuchen(p, ref, { flanke: p.aktion === 'flankieren', verstecken: p.aktion === 'rueckzug', weit: p.aktion === 'rueckzug' });
      if (!p.deck) break;
      zielSetzen(p, p.deck.x, p.deck.z);
      tempo = TEMPO.laufen;
      if (amZiel(p, 0.5)) { stopp(p); tempo = 0; p.geduckt = p.deck.art === 'halb'; blickZu(ref, 5); }
      else if (z && Math.hypot(z.x - p.x, z.z - p.z) < 20) blickZu(z, 4);      // im Laufen das Ziel im Auge
      else { const v = Math.hypot(p.vx, p.vz); if (v > 0.5) dreheZu(p, Math.atan2(p.vx, p.vz), dt, 6); }
      break;
    }
    case 'schiessen': case 'stuermen': {
      // nicht zu sehen (hinter der eigenen Deckung): auf die Stelle zielen, an der das Ziel zuletzt war, und herauskommen
      const az: V3 | null = z || (zl && G.time - zl.t < 6 ? zl : null);
      if (!az) break;
      blickZu(az, 7);
      const anDeckung = p.deck && Math.hypot(p.deck.x - p.x, p.deck.z - p.z) < 0.8;
      if (p.aktion === 'stuermen') { zielSetzen(p, az.x, az.z); tempo = Math.hypot(az.x - p.x, az.z - p.z) > 4 ? TEMPO.vorsichtig : 0; p.phase = 'aus'; }
      else if (!anDeckung) { stopp(p); p.geduckt = Math.hypot(az.x - p.x, az.z - p.z) > 18; p.phase = 'aus'; }
      // aus der Deckung: hocken → herauskommen (aufstehen/lehnen) → Salve → zurück
      if (anDeckung && p.deck) {
        p.phaseT -= dt;
        if (p.phase === 'hock') { p.geduckt = p.deck.art === 'halb'; if (p.phaseT <= 0) { p.phase = 'raus'; p.phaseT = R(1.2, 2.4); } }
        else if (p.phase === 'raus') {
          p.geduckt = false;
          if (p.deck.art === 'voll') { const sp = schussPunkt(p.deck); zielSetzen(p, sp.x, sp.z); tempo = TEMPO.vorsichtig; }
          if (p.phaseT <= 0 || p.unterFeuer > 0.8) { p.phase = 'hock'; p.phaseT = R(0.8, 1.8) + p.unterFeuer; if (p.deck.art === 'voll') zielSetzen(p, p.deck.x, p.deck.z); }
        } else { p.phase = 'hock'; p.phaseT = R(0.2, 0.6); }
      }
      // feuern: nur herausgekommen bzw. ohne Deckung, mit Blick aufs Ziel
      const kannSchiessen = p.phase === 'aus' || (p.phase === 'raus' && (p.deck?.art !== 'voll' || amZiel(p, 0.25)));
      const aufZiel = Math.abs(winkel(Math.atan2(az.x - p.x, az.z - p.z) - p.blick)) < 0.25;
      p.schussT -= dt;
      if (z && kannSchiessen && aufZiel && p.schussT <= 0 && p.mag > 0) {
        if (feuern(p, z)) { p.mag--; p.salve--; p.schussT = WAFFE.takt * R(0.9, 1.25); if (p.salve <= 0) { p.salve = Math.round(R(...WAFFE.salve)); p.schussT = R(...WAFFE.pause); } }
        else p.schussT = 0.3;
      }
      break;
    }
    case 'nachladen': {
      if (p.deck && Math.hypot(p.deck.x - p.x, p.deck.z - p.z) < 0.8) p.geduckt = p.deck.art === 'halb';
      else p.geduckt = true;
      stopp(p);
      p.ladeT -= dt;
      if (p.ladeT <= 0) { p.mag = WAFFE.mag; p.ladeT = 0; p.aktT = 99; }
      break;
    }
    case 'ausweichen': {
      const g = granatenListe().find(q => Math.hypot(q.x - p.x, q.z - p.z) < 8);
      if (g) { const dx = p.x - g.x, dz = p.z - g.z, d = Math.hypot(dx, dz) || 1; zielSetzen(p, p.x + dx / d * 6, p.z + dz / d * 6); tempo = TEMPO.laufen; }
      break;
    }
  }
  bewegen(p, dt, tempo);
  // Blick in Laufrichtung, wenn nichts anderes vorgegeben
  if (!p.zielen && tempo > 0 && Math.hypot(p.vx, p.vz) > 0.4) dreheZu(p, Math.atan2(p.vx, p.vz), dt, 5);
  // Neigung zum Ziel
  const pz = z || (p.zielen ? zl : null);
  const want = pz ? Math.atan2(pz.y - 0.6 - (p.y + 1.5), Math.hypot(pz.x - p.x, pz.z - p.z)) : 0;
  p.pitch += (want - p.pitch) * Math.min(1, dt * 5);
}

function denken(p: Pl, dt: number, sim: boolean) {
  p.aktT += dt; p.unterFeuer = Math.max(0, p.unterFeuer - dt * 0.35);
  if (!sim) return;
  // Wahrnehmung
  if ((p.sinnT -= dt) <= 0) {
    p.sinnT = 0.15;
    const eye = { x: p.x, y: p.y + (p.geduckt ? 1.05 : 1.6), z: p.z, yaw: p.blick, alarm: !!L && G.time - L.alarmT < 30 };
    const vor = p.sinne.wach;
    const g = sinneUpdate(p.sinne, eye, ziele(), sicht, 0.15, G.time);
    if (g && vor < 1 && L) {
      // entdeckt: Trupp alarmieren und Stelle teilen
      L.alarmT = G.time; rufen(p, ['Kontakt!', 'Da ist einer!', 'Feind gesichtet!'][Math.floor(Math.random() * 3)]);
      for (const o of L.pl) if (o !== p && !o.tot && Math.hypot(o.x - p.x, o.z - p.z) < 45) { o.sinne.wach = Math.max(o.sinne.wach, 0.8); if (!o.sinne.zuletzt || o.sinne.zuletzt.t < G.time - 1) o.sinne.zuletzt = { x: g.x, y: g.y, z: g.z, t: G.time }; o.sinne.ziel = g.id; }
    }
    if (g) p.warm = Math.min(1, p.warm + 0.02); else p.warm = Math.max(0, p.warm - 0.05);
  }
  if ((p.denkT -= dt) <= 0) {
    p.denkT = R(0.3, 0.5);
    const w = waehle(lage(p, gesehen(p)));
    p.werte = w.werte; neueAktion(p, w.aktion);
  }
}

// ---------- je Bild ----------
const _hold = new THREE.Vector3();
function zeichnen(p: Pl, dt: number) {
  const a = p.av; if (!a) return;
  const d2 = (camera.position.x - p.x) ** 2 + (camera.position.z - p.z) ** 2;
  a.s.g.visible = d2 < 260 * 260;
  if (!a.s.g.visible) return;
  if (d2 > 50 * 50) a.s.lod?.(true); else if (d2 < 45 * 45) a.s.lod?.(false);
  const reload = p.aktion === 'nachladen' && p.ladeT > 0 ? 1 - p.ladeT / WAFFE.nachladen : -1;
  driveAvatar(a, dt, { x: p.x, y: p.y, z: p.z, yaw: p.blick + Math.PI, pitch: p.pitch, vx: p.vx, vz: p.vz, wid: 'lyg', armed: true, combat: p.zielen, ads: p.zielen && (p.aktion === 'schiessen' || p.aktion === 'stuermen'), crouch: p.geduckt && !p.tot, dead: p.tot, hit: p.treffer, shots: p.schuesse, reload, ground: terrainAt });
  void _hold;
}

function update(dt: number, me: { x: number; y: number; z: number; active: boolean; down: boolean; geduckt?: boolean; vx?: number; vz?: number; lehnt?: boolean }) {
  if (!L) return;
  if (L.sector !== P.sector) { lagerWeg(); return; }
  ME = { x: me.x, y: me.y, z: me.z, ok: me.active && !me.down, geduckt: !!me.geduckt, vx: me.vx || 0, vz: me.vz || 0, lehnt: !!me.lehnt };      // gelehnt: x, z sind schon die Kopfstelle (onfoot.ts)
  const k = feldKoop(), sim = !k.client;
  for (const p of L.pl) {
    if (p.tot) { p.totT += dt; zeichnen(p, dt); if (p.totT < dt * 1.5) koerper('ki-pl-' + p.id, null); if (p.totT > 25 && p.av) { freeAvatar(p.av); p.av = null; } continue; }
    if (sim) { denken(p, dt, true); handeln(p, dt); }
    else {
      denken(p, dt, false);
      if (p.nx !== undefined) {
        const kk = Math.min(1, dt * 10), ox = p.x, oz = p.z;
        p.x += (p.nx - p.x) * kk; p.z += (p.nz! - p.z) * kk; p.y = terrainAt(p.x, p.z);
        p.vx = (p.x - ox) / Math.max(dt, 1e-3); p.vz = (p.z - oz) / Math.max(dt, 1e-3);
        p.blick = winkel(p.blick + winkel(p.nb! - p.blick) * kk);
      }
    }
    zeichnen(p, dt);
    koerper('ki-pl-' + p.id, { art: 'kreis', x: p.x, z: p.z, r: 0.5 });      // der Spieler läuft nicht durch sie hindurch
  }
  // Gastgeber: Stand an die Mitspieler
  if (k.mates.length && sim && (netT -= dt) <= 0) {
    netT = 0.1; lagerT -= 0.1;
    const body: Record<string, unknown> = { s: P.sector, seed: L.seed, p: L.pl.map(p => [p.id, ...pack(p.x, p.z, p.blick, p.pitch), (p.geduckt ? 1 : 0) | (p.zielen ? 2 : 0) | (p.tot ? 4 : 0), Math.round(p.hp), p.schuesse, p.treffer, p.aktion === 'nachladen' ? Math.round((1 - p.ladeT / WAFFE.nachladen) * 100) : -1]), ev: ev.splice(0) };
    if (lagerT <= 0) { lagerT = 2; body.l = [+L.plan.x.toFixed(2), +L.plan.z.toFixed(2), L.pl.length]; }
    coopSend('kst', body);
  } else if (!k.mates.length) ev = [];
}
let netT = 0, lagerT = 0;

// ---------- Netz ----------
const gleich = (m: any) => m.s === P.sector;
onCoop('kl', m => { if (gleich(m) && (!L || L.seed !== +m.seed)) lagerAufstellen(+m.x, +m.z, +m.seed, +m.n, false); });
onCoop('kh', m => {
  if (!L || !gleich(m) || feldKoop().client) return;
  const p = L.pl.find(q => q.id === +m.i); if (p) schaden(p, Math.max(0, Math.min(200, +m.d || 0)), +m.from);
});
onCoop('kst', m => {
  if (!gleich(m)) return;
  if (Array.isArray(m.l) && (!L || L.seed !== +m.seed)) lagerAufstellen(+m.l[0], +m.l[1], +m.seed, +m.l[2], false);
  if (!L || L.seed !== +m.seed) return;
  for (const a of Array.isArray(m.p) ? m.p : []) {
    const p = L.pl.find(q => q.id === +a[0]); if (!p) continue;
    p.nx = +a[1]; p.nz = +a[2]; p.nb = +a[3]; p.pitch = +a[4];
    const f = +a[5]; p.geduckt = !!(f & 1); p.zielen = !!(f & 2);
    if (f & 4 && !p.tot) { p.tot = true; p.totT = 0; }
    p.hp = +a[6]; p.treffer = Math.max(p.treffer, +a[8]);
    if (+a[9] >= 0) { p.aktion = 'nachladen'; p.ladeT = WAFFE.nachladen * (1 - +a[9] / 100); } else if (p.aktion === 'nachladen') p.aktion = 'sichern';
  }
  for (const e of Array.isArray(m.ev) ? m.ev : []) {
    if (e[0] === 's') {
      const p = L.pl.find(q => q.id === +e[1]); if (!p) continue;
      const traf = !!+e[3];
      schussBild(p, +e[5], +e[6], +e[7], traf);
      if (traf && +e[2] === coopNet.id) feldHurt(+e[4]);
    } else if (e[0] === 'k') {
      const p = L.pl.find(q => q.id === +e[1]); if (p && !p.tot) toeten(p, +e[2]);
    }
  }
});

// ---------- Anschluss an den Kampf zu Fuß (fieldfight.ts) ----------
FELD_EXTRA.update = update;
FELD_EXTRA.wand = (ox, oy, oz, dx, dy, dz, tMax) => { if (!L) return tMax; let tw = tMax; for (const q of L.quader) { const t = strahlQuader(q, ox, oy, oz, dx, dy, dz, tw); if (t >= 0 && t < tw) tw = t; } return tw; };
FELD_EXTRA.ziel = (ox, oy, oz, dx, dy, dz, tMax) => {
  const h = strahlPl(ox, oy, oz, dx, dy, dz, tMax);
  if (L && !feldKoop().client) niederhalten(ox, oy, oz, dx, dy, dz, h ? h.t : tMax, h?.p || null);
  return h ? { t: h.t, treffer: (dmg: number) => getroffen(h.p, dmg, h.kopf) } : null;
};
/** Schüsse, die knapp vorbeigehen oder in die Deckung schlagen, halten nieder (unterFeuer steigt, der Gegner bleibt eher in Deckung) */
function niederhalten(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, t: number, getroffen: Pl | null) {
  if (!L) return;
  for (const p of L.pl) {
    if (p.tot || p === getroffen) continue;
    const cx = p.x - ox, cy = p.y + 1.1 - oy, cz = p.z - oz, s = Math.max(0, Math.min(t, cx * dx + cy * dy + cz * dz));
    const d = Math.hypot(cx - dx * s, cy - dy * s, cz - dz * s);
    if (d < 2.5) { p.unterFeuer = Math.min(1, p.unterFeuer + 0.3 * (1 - d / 2.5)); if (p.sinne.ziel < 0 || !p.sinne.zuletzt || G.time - p.sinne.zuletzt.t > 3) hoeren(p.sinne, p, { x: ox, y: oy, z: oz, r: 999 }, G.time); }
  }
}
FELD_EXTRA.blast = (x, y, z, r, dmg) => {
  if (!L) return;
  for (const p of L.pl) {
    if (p.tot) continue;
    const d = Math.hypot(p.x - x, p.y + 0.9 - y, p.z - z); if (d > r) continue;
    getroffen(p, dmg * (1 - 0.7 * d / r), false);
  }
};
FELD_EXTRA.solid = (x, y, z) => !!L && L.quader.some(q => y >= q.y0 && y <= q.y0 + q.h && imQuader(q, x, z));
FELD_EXTRA.laerm = (x, y, z, r) => { if (L && !feldKoop().client) for (const p of L.pl) if (!p.tot) hoeren(p.sinne, p, { x, y, z, r }, G.time); };
FELD_EXTRA.kampf = () => !!L && L.pl.some(p => !p.tot && p.sinne.kampf);
FELD_EXTRA.ruhe = () => { if (L) for (const p of L.pl) { p.sinne.wach = 0; p.sinne.kampf = false; p.sinne.zuletzt = null; p.sinne.ziel = -1; } };
FELD_EXTRA.weg = lagerWeg;
FELD_EXTRA.hud = drawHUD;

// ---------- Anzeige: Rufe, Lebensbalken, Debug ----------
const _p = new THREE.Vector3();
function proj(x: number, y: number, z: number) {
  _p.set(x, y, z).project(camera);
  if (_p.z > 1 || Math.abs(_p.x) > 1.1 || Math.abs(_p.y) > 1.1) return null;
  return { x: (_p.x + 1) / 2 * view.W, y: (1 - _p.y) / 2 * view.H };
}
function drawHUD() {
  if (!L) return;
  ux.save();
  ux.textAlign = 'center';
  for (const p of L.pl) {
    if (p.tot) continue;
    const d = Math.hypot(camera.position.x - p.x, camera.position.z - p.z);
    const s = proj(p.x, p.y + (p.geduckt ? 1.5 : 2.05), p.z); if (!s) continue;
    // Lebensbalken, sobald im Kampf oder getroffen
    if (p.hp < p.max || p.sinne.kampf) { ux.fillStyle = 'rgba(6,16,26,.7)'; ux.fillRect(s.x - 21, s.y - 3, 42, 6); ux.fillStyle = '#ff6b5b'; ux.fillRect(s.x - 20, s.y - 2, 40 * p.hp / p.max, 4); }
    if (p.ruf && p.ruf.bis > G.time && d < 35) { ux.font = '600 14px Rajdhani, "IBM Plex Sans", sans-serif'; ux.fillStyle = 'rgba(255,220,180,' + Math.min(1, (p.ruf.bis - G.time) * 2) + ')'; ux.fillText(p.ruf.t, s.x, s.y - 10); }
    if (KI.debug) {
      ux.font = '700 11px "Share Tech Mono",Consolas,monospace';
      ux.fillStyle = '#9fe7ff'; ux.fillText(`${p.aktion} ${p.phase !== 'aus' ? p.phase : ''} · ${p.rolle}`, s.x, s.y - 26);
      ux.fillStyle = '#ffd36b'; ux.fillText(`wach ${p.sinne.wach.toFixed(2)} · feuer ${p.unterFeuer.toFixed(2)} · mag ${p.mag}`, s.x, s.y - 39);
      if (p.werte) { const top = Object.entries(p.werte).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${v.toFixed(2)}`).join('  '); ux.fillStyle = '#c7d2dc'; ux.fillText(top, s.x, s.y - 52); }
      // Weg
      if (p.weg.length) { ux.strokeStyle = 'rgba(120,220,255,.8)'; ux.lineWidth = 1.5; ux.beginPath(); let first = true; for (const q of [{ x: p.x, y: p.y, z: p.z }, ...p.weg.slice(p.wegI)]) { const w = proj(q.x, q.y + 0.1, q.z); if (!w) { first = true; continue; } if (first) ux.moveTo(w.x, w.y); else ux.lineTo(w.x, w.y); first = false; } ux.stroke(); }
    }
  }
  if (KI.debug) {
    for (const c of L.deck) {
      const s = proj(c.x, c.y + 0.15, c.z); if (!s) continue;
      ux.fillStyle = c.belegt >= 0 ? '#ff5a4a' : c.art === 'voll' ? (c.seite ? '#5fd0ff' : '#476a80') : '#5fe08a';
      ux.fillRect(s.x - 3, s.y - 3, 6, 6);
    }
    ux.textAlign = 'left'; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#9fe7ff';
    const i = lagerInfo()!; ux.fillText(`KI · Plünderer ${i.lebend}/${i.gesamt} · Navmesh ${i.navmesh ? 'ja' : 'nein'} · Deckungen ${i.deckung} · Feuerfreigaben ${L.trupp.anzahl}/2`, 24, view.H * 0.2);
  }
  ux.restore();
}

/** Testlabor: Lager etwa 35 m vor dem Piloten */
export function lagerVorMir(x: number, z: number, yaw: number) {
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  let bx = x + fx * 38, bz = z + fz * 38;
  for (let k = 0; k < 10 && !frei(bx, bz); k++) { bx += fx * 4; bz += fz * 4; }
  return lagerAufstellen(bx, bz, (hashStr(P.sector + ':' + Math.round(bx) + ':' + Math.round(bz)) % 100000) + 1);
}
