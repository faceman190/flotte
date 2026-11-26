import * as THREE from 'three';
import { camera, view, ux, glowMat, scene } from '../core/engine';
import { rng, hashStr, clamp, fmtN } from '../core/util';
import { snd, sfx } from '../core/audio';
import { P, G, saveGame } from './state';
import { world } from './world';
import { PLANETS, PTYPE, planetBaseId } from '../data/planets';
import { ITEMS, type ItemId } from '../data/items';
import { addRep, type RepId } from './reputation';
import { decoLaden, bojeGruppe } from '../models/bojen';
import { radio } from '../ui/radio';
import { puff } from './fx';
import { bauKoerper } from './koerper';

// =====================================================================================
// Bodenaufgaben (seit 2026-11-24): Arbeit draußen auf den Planeten, für die man ein Bodenfahrzeug braucht. Aushänge am Schwarzen Brett
// (Aufträge-Terminal der Stationen im selben Sektor und der Planetenbasis, ui/dock.ts). Je Planet mit Basis drei Arten:
//  - lieferung  Vorräte zur Außenstelle: die Kisten liegen im Fahrzeug; hinfahren (1,2–2,8 km), im Fahrzeug [E] abladen. Eilbonus.
//  - suche      Vermisster Rover: im Suchgebiet (Kreis 450 m) liegt ein verunglückter Rover. Zu sehen ab 110 m, oder sofort mit dem
//               Sensormast des Wiesel ([R], game/wiesel.ts). Hinfahren, [E]: Fahrtenschreiber bergen.
//  - erz        Erz für die Basis: eine Erzart des Planeten mit dem Dachs bohren, im Schiff (oder Dachs) haben, am Schwarzen Brett der Basis abgeben.
// Stand in P.boden (je Aufgabe), Zähler in P.bodenGen (neue Orte nach jeder Erledigung), Pause in P.bodenZuletzt.
// Modelle: Außenstelle aus Blender (asset-src/neu/rover/as_bau.py → deco/Aussenstelle, Fernmodell), der Rover ist ein Dachs (models/rover.ts).
// Anzeige: Aufgabenfeld und Flottenband über game/aufgaben.ts, Marken auf dem Planeten hier (drawBodenHUD).
// Bewusst keine „drei Punkte abfahren“-Aufgaben (Wunsch des Nutzers bei den Missionen).
// =====================================================================================

export type BodenTyp = 'lieferung' | 'suche' | 'erz';
export interface BodenAkt {
  typ: BodenTyp; planet: string; x: number; z: number; gen: number; t0: number;
  lohn: number; ruf: number; fac: RepId;
  wx?: number; wz?: number; found?: boolean;      // suche: Lage des Rovers, gefunden
  ore?: ItemId; n?: number;                        // erz: Art und Menge
  fest?: boolean;                                  // Lage auf dem Planeten geprüft (trocken, flach)
}
const PAUSE = 8 * 60 * 1000, SUCH_R = 450, SICHT = 110;
const TITEL: Record<BodenTyp, string> = { lieferung: 'Vorräte zur Außenstelle', suche: 'Vermisster Rover', erz: 'Erz für die Basis' };
const st = () => (P.boden = P.boden || {});
const idOf = (planet: string, typ: BodenTyp) => `boden:${planet}:${typ}`;
const pause = (id: string) => Date.now() - (P.bodenZuletzt?.[id] || 0) < PAUSE;
const dist = (m: number) => (m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m) + ' m');
const asName = (planet: string, gen: number) => 'AS-' + String(10 + (hashStr(planet + gen) % 80)).padStart(2, '0');
const stName = (planet: string) => `${PLANETS[planet]?.base || 'Basis'} (${PLANETS[planet]?.name || planet})`;

// ---------- Angebote ----------
function angebot(planet: string, typ: BodenTyp): BodenAkt {
  const gen = P.bodenGen?.[idOf(planet, typ)] || 0, R = rng(hashStr(`${planet}:${typ}:${gen}`)), dg = PLANETS[planet].danger || 1;
  const a = R.range(0, Math.PI * 2), d = typ === 'suche' ? R.range(1500, 2700) : R.range(1200, 2800);
  const o: BodenAkt = { typ, planet, x: Math.cos(a) * d, z: Math.sin(a) * d, gen, t0: 0, lohn: 0, ruf: 0, fac: 'gilde' };
  if (typ === 'lieferung') { o.lohn = Math.round(650 + R.range(0, 350) + dg * 120); o.ruf = 8; o.fac = 'gilde'; }
  if (typ === 'suche') { o.lohn = Math.round(900 + R.range(0, 450) + dg * 150); o.ruf = 12; o.fac = 'rat'; const b = R.range(0, Math.PI * 2), e = R.range(0, SUCH_R * 0.85); o.wx = o.x + Math.cos(b) * e; o.wz = o.z + Math.sin(b) * e; }
  if (typ === 'erz') {
    const tab = Object.entries(PTYPE[PLANETS[planet].type].ore || {}).sort((p, q) => (q[1] as number) - (p[1] as number)).slice(0, 2) as [ItemId, number][];
    o.ore = (tab[Math.floor(R.next() * tab.length)] || ['erz'])[0]; o.n = 15 + Math.floor(R.range(0, 3)) * 5;
    o.lohn = Math.round(o.n * (45 + dg * 6) + R.range(0, 200)); o.ruf = 10; o.fac = 'gilde';
  }
  return o;
}
/** Aushänge für das Schwarze Brett: Planeten dieses Sektors (eine Basis zeigt ihren Planeten) */
export function bodenAushang(sector: string) {
  const out: { id: string; titel: string; planet: string; text: string; lohn: number; ruf: number; fac: RepId; aktiv: boolean; pause: boolean; abgabe: boolean; stand: string }[] = [];
  const pl = PLANETS[sector]; if (!pl?.base) return out;
  for (const typ of ['lieferung', 'suche', 'erz'] as BodenTyp[]) {
    const id = idOf(sector, typ), a = st()[id], o = a || angebot(sector, typ);
    out.push({ id, titel: TITEL[typ], planet: pl.name, text: text(o), lohn: o.lohn, ruf: o.ruf, fac: o.fac, aktiv: !!a, pause: !a && pause(id), abgabe: !!a && typ === 'erz' && erzHabe(a) >= (a.n || 0), stand: a ? standText(a) : '' });
  }
  return out;
}
function text(o: BodenAkt) {
  const p = PLANETS[o.planet].name;
  if (o.typ === 'lieferung') return `Die Außenstelle ${asName(o.planet, o.gen)} auf ${p} braucht Vorräte: Wasser, Filter, Ersatzteile. Die Kisten kommen ins Fahrzeug, du fährst sie hin (${dist(Math.hypot(o.x, o.z))} von der Basis).`;
  if (o.typ === 'suche') return `Ein Rover der Basis meldet sich nicht mehr. Letzter Funkkontakt in einem Gebiet ${dist(Math.hypot(o.x, o.z))} von der Basis. Finde ihn und birg den Fahrtenschreiber. Der Sensormast des Wiesel findet ihn sofort.`;
  return `Die Basis braucht ${o.n} ${ITEMS[o.ore!].n} von ${p}. Mit dem Dachs an den Lagerstätten bohren, im Schiff (oder im Dachs) mitbringen und hier abgeben.`;
}
const erzHabe = (a: BodenAkt) => (P.cargo[a.ore!] || 0) + (P.rover?.[a.ore!] || 0);
function standText(a: BodenAkt) {
  if (a.typ === 'erz') return `${Math.min(erzHabe(a), a.n!)}/${a.n} ${ITEMS[a.ore!].n}`;
  if (a.typ === 'suche') return a.found ? 'Rover gefunden' : 'im Suchgebiet suchen';
  return 'Vorräte im Fahrzeug';
}

export function bodenAnnehmen(id: string): string {
  const [, planet, typ] = id.split(':') as [string, string, BodenTyp];
  if (!PLANETS[planet] || st()[id] || pause(id)) return '';
  const o = angebot(planet, typ); o.t0 = Date.now(); st()[id] = o; P.track = 'auf:' + id;
  radio(o.fac === 'rat' ? 'FLOTTENRAT' : 'GILDE', `Neue Bodenaufgabe auf ${PLANETS[planet].name}: ${TITEL[typ]}.`, '#ffb347');
  snd(660, 0.12, 'sine', 0.04, 200); saveGame();
  return `Angenommen: ${TITEL[typ]}. ${typ === 'erz' ? 'Abgabe hier am Brett.' : 'Lande auf dem Planeten und fahr hin; die Marke steht im HUD.'}`;
}
export function bodenAbgeben(id: string): string {
  const a = st()[id]; if (!a || a.typ !== 'erz' || erzHabe(a) < a.n!) return '';
  let n = a.n!; const fromRover = Math.min(n, P.rover?.[a.ore!] || 0);
  if (fromRover) { P.rover![a.ore!]! -= fromRover; n -= fromRover; }
  P.cargo[a.ore!] -= n;
  fertig(id, a, `Erz für die Basis abgegeben: ${a.n} ${ITEMS[a.ore!].n}.`);
  return `${a.n} ${ITEMS[a.ore!].n} abgegeben. +${fmtN(a.lohn)} Credits.`;
}
function fertig(id: string, a: BodenAkt, was: string) {
  P.credits += a.lohn; addRep(a.fac, a.ruf);
  delete st()[id]; (P.bodenZuletzt ||= {})[id] = Date.now(); (P.bodenGen ||= {})[id] = (P.bodenGen[id] || 0) + 1;
  if (P.track === 'auf:' + id) P.track = undefined;
  radio(stName(a.planet).toUpperCase(), `${was} +${fmtN(a.lohn)} Credits, +${a.ruf} Ruf ${a.fac === 'rat' ? 'beim Flottenrat' : 'bei der Bergbaugilde'}.`, '#ffb347');
  sfx('ui_confirm', 0.5, 1, () => snd(880, 0.15, 'sine', 0.05, 300)); saveGame();
  weg(id);
}
export function bodenAbbrechen(id: string) { if (!st()[id]) return; delete st()[id]; (P.bodenZuletzt ||= {})[id] = Date.now() - PAUSE + 60 * 1000; if (P.track === 'auf:' + id) P.track = undefined; weg(id); saveGame(); }
export const bodenAktiv = () => Object.keys(P.boden || {});

// ---------- auf dem Planeten: Modelle, Lage prüfen ----------
const OBJ = new Map<string, { g: THREE.Object3D; lights: THREE.Sprite[]; beacon: THREE.Sprite | null; smoke: number }>();
/** Hindernisse für den Rover (surface.ts liest sie) */
export const BODEN_OBST: { x: number; z: number; r: number }[] = [];
function weg(id: string) { const o = OBJ.get(id); if (o) { o.g.removeFromParent(); OBJ.delete(id); } }
// trockene, flache Stelle nahe dem geplanten Punkt
function fest(a: BodenAkt, ground: (x: number, z: number) => number, wet: (x: number, z: number) => boolean) {
  const ok = (x: number, z: number) => !wet(x, z) && !wet(x + 10, z) && !wet(x, z + 10) && Math.abs(ground(x + 8, z) - ground(x - 8, z)) + Math.abs(ground(x, z + 8) - ground(x, z - 8)) < 2.6;
  const px = a.typ === 'suche' ? a.wx! : a.x, pz = a.typ === 'suche' ? a.wz! : a.z;
  let best: [number, number] | null = null;
  for (let r = 0; r <= (a.typ === 'suche' ? 200 : 400) && !best; r += 40) for (let k = 0; k < (r ? 12 : 1) && !best; k++) { const x = px + Math.cos(k / 12 * Math.PI * 2) * r, z = pz + Math.sin(k / 12 * Math.PI * 2) * r; if (Math.abs(x) < 3400 && Math.abs(z) < 3400 && ok(x, z)) best = [x, z]; }
  if (best) { if (a.typ === 'suche') { a.wx = best[0]; a.wz = best[1]; } else { a.x = best[0]; a.z = best[1]; } }
  a.fest = true;
}
let roverBau: ((k: 'dachs') => { g: THREE.Group; beacon: THREE.Sprite }) | null = null, wet: ((x: number, z: number) => boolean) | null = null;
/** surface.ts gibt Rover-Bau und Wasserprüfung herein (kein Kreisbezug) */
export function bodenHooks(b: typeof roverBau, w: typeof wet) { roverBau = b; wet = w; }

function bauen(id: string, a: BodenAkt) {
  const ground = world.ground!;
  if (!a.fest && wet) { fest(a, ground, wet); saveGame(); }
  if (a.typ === 'lieferung') {
    decoLaden('Aussenstelle'); decoLaden('AussenstelleFern');
    const near = bojeGruppe('Aussenstelle'), far = bojeGruppe('AussenstelleFern'); if (!near) return;
    const lod = new THREE.LOD(); lod.addLevel(near, 0); if (far) lod.addLevel(far, 320);
    near.traverse((o: any) => { if (o.isMesh) o.castShadow = true; });
    const g = new THREE.Group(); g.add(lod);
    const yaw = (hashStr(id + a.gen) % 628) / 100;
    g.position.set(a.x, ground(a.x, a.z) - 0.1, a.z); g.rotation.y = yaw;
    // Leuchtpunkte (as-anker.json, Blender (x, y, z) → (x, z, −y)): Warnlicht am Mast, Türlampe, Flutlicht
    const beacon = new THREE.Sprite(glowMat(0xff3020, 1)); beacon.position.set(-0.7, 9.3, 2.2); beacon.scale.setScalar(1.6); g.add(beacon);
    const lights: THREE.Sprite[] = [];
    for (const [x, y, z, s] of [[1.54, 2.67, -1.6, 0.8], [4.05, 4.78, -2.35, 1.4], [4.75, 4.78, -2.35, 1.4]]) { const l = new THREE.Sprite(glowMat(0xfff0d0, 0.8)); l.position.set(x, y, z); l.scale.setScalar(s); g.add(l); lights.push(l); }
    scene.add(g); world.extras.push(g); bauKoerper('as:' + id, g);      // Außenstelle fest zu Fuß (koerper.ts)
    OBJ.set(id, { g, lights, beacon, smoke: 0 });
  } else if (a.typ === 'suche' && roverBau) {
    const m = roverBau('dachs'), g = m.g;
    g.position.set(a.wx!, ground(a.wx!, a.wz!) - 0.7, a.wz!); g.rotation.order = 'YXZ'; g.rotation.set(0.22, (hashStr(id) % 628) / 100, 0.75);
    scene.add(g); world.extras.push(g);
    OBJ.set(id, { g, lights: [], beacon: m.beacon, smoke: 0 });
  }
}

/** jedes Bild auf einem Planeten (main.ts): Modelle bauen, Fund prüfen, Hindernisse */
export function updateBoden(dt: number, px: number, pz: number) {
  BODEN_OBST.length = 0;
  const pl = world.surface?.planet; if (!pl || !world.ground) return;
  for (const [id, a] of Object.entries(P.boden || {})) {
    if (a.planet !== pl) continue;
    let o = OBJ.get(id);
    if (o && !o.g.parent) { OBJ.delete(id); o = undefined; }      // Planet neu aufgebaut
    if (!o && a.typ !== 'erz') { bauen(id, a); o = OBJ.get(id); }
    if (a.typ === 'lieferung') BODEN_OBST.push({ x: a.x, z: a.z, r: 4.6 });
    if (a.typ === 'suche') {
      BODEN_OBST.push({ x: a.wx!, z: a.wz!, r: 2.6 });
      if (!a.found && Math.hypot(px - a.wx!, pz - a.wz!) < SICHT) { a.found = true; radio('FUNK', 'Da liegt er. Umgekippt, der Fahrer ist nicht mehr drin. Hol den Fahrtenschreiber.', '#9fd8ff'); saveGame(); }
      if (o && (o.smoke -= dt) <= 0) { o.smoke = 0.35; puff(a.wx! + (Math.random() - 0.5) * 2, (world.ground(a.wx!, a.wz!) || 0) + 1.5, a.wz! + (Math.random() - 0.5) * 2, 0, 1.5, 0, '#2a2622', 2.2); }
    }
    if (o?.beacon) (o.beacon.material as THREE.SpriteMaterial).opacity = Math.sin(G.time * (a.typ === 'suche' ? 7 : 3)) > 0 ? 1 : 0.15;
  }
}
/** Sensormast des Wiesel (wiesel.ts): vermisste Rover im Umkreis, gilt als gefunden */
export function bodenScan(x: number, z: number, R: number) {
  const pl = world.surface?.planet, out: { x: number; y: number; z: number; t: string; col: string }[] = [];
  for (const a of Object.values(P.boden || {})) {
    if (a.planet !== pl || a.typ !== 'suche' || Math.hypot(a.wx! - x, a.wz! - z) > R) continue;
    if (!a.found) { a.found = true; radio('FUNK', 'Sensormast hat ihn: Signal des vermissten Rovers. Marke gesetzt.', '#9fd8ff'); }
    out.push({ x: a.wx!, y: (world.ground?.(a.wx!, a.wz!) || 0) + 6, z: a.wz!, t: '✚ VERMISSTER ROVER', col: '#ff8a5a' });
  }
  return out;
}

// ---------- Taste E ----------
/** in der Nähe eines Ziels: Text für den Hinweis (null: nichts) */
function nahe(px: number, pz: number, imFz: boolean): { id: string; a: BodenAkt; prompt: string; ok: boolean } | null {
  const pl = world.surface?.planet; if (!pl) return null;
  for (const [id, a] of Object.entries(P.boden || {})) {
    if (a.planet !== pl) continue;
    if (a.typ === 'lieferung' && Math.hypot(px - a.x, pz - a.z) < 18) return { id, a, ok: imFz, prompt: imFz ? `[E] Vorräte an der Außenstelle ${asName(a.planet, a.gen)} abladen` : 'Die Vorräte sind im Fahrzeug: damit vorfahren' };
    if (a.typ === 'suche' && Math.hypot(px - a.wx!, pz - a.wz!) < 9) return { id, a, ok: true, prompt: '[E] Fahrtenschreiber bergen' };
  }
  return null;
}
let promptNow = '';
export function bodenE(px: number, pz: number, imFz: boolean): boolean {
  const n = nahe(px, pz, imFz); if (!n) return false;
  if (!n.ok) { radio('SYSTEM', n.prompt); return true; }
  if (n.a.typ === 'lieferung') {
    const bonus = Math.round(300 * clamp(1 - (Date.now() - n.a.t0) / (12 * 60 * 1000), 0, 1)); n.a.lohn += bonus;
    fertig(n.id, n.a, `Vorräte an der Außenstelle ${asName(n.a.planet, n.a.gen)} abgeladen${bonus ? ` (Eilbonus ${bonus})` : ''}.`);
    for (let i = 0; i < 8; i++) puff(px + (Math.random() - 0.5) * 3, (world.ground?.(px, pz) || 0) + 0.5, pz + (Math.random() - 0.5) * 3, 0, 1, 0, '#6a6058', 1);
  } else fertig(n.id, n.a, 'Fahrtenschreiber des vermissten Rovers geborgen.');
  return true;
}

// ---------- Anzeige ----------
const _p = new THREE.Vector3();
export function drawBodenHUD(px: number, pz: number, imFz: boolean) {
  const pl = world.surface?.planet; if (!pl || !P.boden) return;
  const W = view.W, H = view.H, gy = (x: number, z: number) => world.ground?.(x, z) || 0;
  ux.save(); ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
  const tr = String(P.track || '');
  for (const [id, a] of Object.entries(P.boden)) {
    if (a.planet !== pl) continue;
    let x = a.x, z = a.z, y = 0, t = '', col = '#9fd8ff';
    if (a.typ === 'lieferung') { y = gy(x, z) + 14; t = `◈ AUSSENSTELLE ${asName(a.planet, a.gen)} · VORRÄTE`; }
    else if (a.typ === 'suche') { if (a.found) { x = a.wx!; z = a.wz!; y = gy(x, z) + 6; t = '✚ VERMISSTER ROVER'; col = '#ff8a5a'; } else { y = gy(x, z) + 30; t = `◌ SUCHGEBIET · ${SUCH_R} m UM DIE MARKE`; } }
    else { const b = world.stations.find(s => s.id === planetBaseId(pl)); if (!b || erzHabe(a) < a.n!) continue; x = b.x; z = b.z; y = b.y + 40; t = `▣ ${(PLANETS[pl].base || 'BASIS').toUpperCase()} · ERZ ABGEBEN`; }
    const d = Math.hypot(x - px, z - pz), lab = `${t} · ${dist(d)}`;
    _p.set(x, y, z).project(camera);
    const on = _p.z < 1 && Math.abs(_p.x) < 1 && Math.abs(_p.y) < 1;
    if (on) { const sx = (_p.x + 1) / 2 * W, sy = (1 - _p.y) / 2 * H; ux.fillStyle = col; ux.beginPath(); ux.moveTo(sx, sy + 3); ux.lineTo(sx - 5, sy - 6); ux.lineTo(sx + 5, sy - 6); ux.closePath(); ux.fill(); ux.fillText(lab, sx, sy - 11); }
    else if (tr === 'auf:' + id || bodenAktiv().length === 1) {
      // außerhalb des Bilds: Pfeil am Rand in die Richtung
      let vx = _p.x, vy = _p.y; if (_p.z > 1) { vx = -vx; vy = -vy; }
      const m = Math.max(Math.abs(vx), Math.abs(vy)) || 1, ex = (vx / m * 0.9 + 1) / 2 * W, ey = (1 - vy / m * 0.82) / 2 * H, ang = Math.atan2(-vy, vx);
      ux.save(); ux.translate(ex, ey); ux.rotate(ang); ux.fillStyle = col; ux.beginPath(); ux.moveTo(12, 0); ux.lineTo(-6, -7); ux.lineTo(-6, 7); ux.closePath(); ux.fill(); ux.restore();
      ux.fillStyle = col; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillText(lab, clamp(ex, 120, W - 120), clamp(ey + 22, 20, H - 10)); ux.font = '700 12px "Share Tech Mono",Consolas,monospace';
    }
  }
  const n = nahe(px, pz, imFz); promptNow = n ? n.prompt : '';
  if (promptNow) {
    ux.font = '600 14px "Share Tech Mono",Consolas,monospace';
    const tw = ux.measureText(promptNow).width + 30, yy = H * 0.6;
    ux.fillStyle = 'rgba(6,16,26,.88)'; ux.strokeStyle = '#9fd8ff'; ux.lineWidth = 1; ux.beginPath(); ux.rect(W / 2 - tw / 2, yy - 20, tw, 32); ux.fill(); ux.stroke();
    ux.fillStyle = '#9fd8ff'; ux.fillText(promptNow, W / 2, yy + 1);
  }
  ux.restore();
}

// ---------- Aufgabenfeld und Flottenband (über aufgaben.ts) ----------
export function bodenObjective(id: string, px: number, pz: number): { title: string; lines: [string, boolean, boolean][] } | null {
  const a = st()[id]; if (!a) return null;
  const here = world.surface?.planet === a.planet, L: [string, boolean, boolean][] = [], pn = PLANETS[a.planet].name;
  if (!here && a.typ !== 'erz') L.push([`Auf <b>${pn}</b> landen`, false, false]);
  if (a.typ === 'lieferung') L.push([`Vorräte zur Außenstelle ${asName(a.planet, a.gen)} fahren${here ? ` · <b>${dist(Math.hypot(a.x - px, a.z - pz))}</b>` : ''}`, false, false], ['Im Fahrzeug [E] abladen · Eilbonus bis 300 Cr', false, true]);
  if (a.typ === 'suche') L.push([a.found ? `Zum Rover fahren${here ? ` · <b>${dist(Math.hypot(a.wx! - px, a.wz! - pz))}</b>` : ''}` : `Im Suchgebiet suchen${here ? ` · <b>${dist(Math.hypot(a.x - px, a.z - pz))}</b>` : ''}`, !!a.found, false], ['Sensormast des Wiesel [R] findet ihn sofort', false, true], ['[E] Fahrtenschreiber bergen', false, false]);
  if (a.typ === 'erz') { const h = Math.min(erzHabe(a), a.n!); L.push([`${ITEMS[a.ore!].n} mit dem Dachs bohren · <b>${h}/${a.n}</b>`, h >= a.n!, false], [`Am Schwarzen Brett der Basis ${PLANETS[a.planet].base} abgeben`, false, false]); }
  L.push([`Lohn <b>${fmtN(a.lohn)} Cr</b> · +${a.ruf} Ruf`, false, true]);
  return { title: `Bodenaufgabe · ${TITEL[a.typ]} (${pn})`, lines: L };
}
export function bodenListe() {
  return bodenAktiv().map(id => { const a = st()[id]; return { id, titel: `${TITEL[a.typ]} (${PLANETS[a.planet].name})`, n: a.typ === 'erz' ? Math.min(erzHabe(a), a.n!) : a.typ === 'suche' && a.found ? 1 : 0, max: a.typ === 'erz' ? a.n! : 1, lohn: a.lohn, ruf: a.ruf, ort: stName(a.planet), rest: null as number | null, wer: a.fac === 'rat' ? 'Flottenrat' : 'Bergbaugilde' }; });
}
