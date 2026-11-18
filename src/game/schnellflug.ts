import * as THREE from 'three';
import { keys } from '../core/input';
import { clamp, d3 } from '../core/util';
import { snd, sfx, sfxHeld } from '../core/audio';
import { P, G, stats } from './state';
import { world, SECTOR_RADIUS, SECTOR_HEIGHT } from './world';
import { radio } from '../ui/radio';
import { storyMarkers } from './story';
import { missionMarkers } from './missions';

// Schnellflug und Kurzsprung (seit Alpha 1.50, für große Sektoren wie Heimstatt mit 60 km Radius; geht in jedem Sektor)
// H lädt den Antrieb (3,5 s), danach fliegt das Schiff bis 8 km/s. Ohne Navigationsziel lenkt der Spieler selbst (träge, kein Seitwärtsdriften).
// Mit Navigationsziel (N: Ort im Fadenkreuz, oder Klick auf der Sektorkarte) ist es ein Kurzsprung: Der Autopilot richtet das Schiff aus, fliegt hin
// und fällt gut 1 km vor dem Ziel in den Reiseflug zurück. Nahe an Stationen, Toren und Feldern wird er langsamer (so überfliegt man nichts);
// kommt man einem Hindernis zu nahe, endet der Schnellflug. Ein Treffer, S oder H beendet ihn ebenfalls. Die Kamera bleibt starr (Wunsch des Spielers).
export const SF_MAX = 8000;
const SPOOL = 3.5, DROP_CLEAR = 900, ARRIVE = 1000;

export type NavKind = 'st' | 'gate' | 'field' | 'orbit' | 'mark';
export interface NavRef { kind: NavKind; id: string }
export interface NavPoint extends NavRef { name: string; x: number; y: number; z: number; R: number }
export const SF = {
  phase: 'off' as 'off' | 'spool' | 'fly',
  t: 0,                 // Restzeit beim Laden
  v: 0,                 // Tempo im Schnellflug (m/s)
  auto: false,          // Kurzsprung mit Autopilot
  nav: null as NavRef | null,
  navDef: null as unknown,   // Sektor, in dem das Ziel gesetzt wurde
};
let charge: null | (() => void) = null;
const stopCharge = () => { charge?.(); charge = null; };

// ---------- Orte im Sektor (Navigationsziele) ----------
export function navPoints(): NavPoint[] {
  const out: NavPoint[] = [];
  if (!world.def || world.surface) return out;
  for (const s of world.stations) out.push({ kind: 'st', id: s.id, name: s.name, x: s.x, y: s.y, z: s.z, R: s.R });
  for (const g of world.gates) out.push({ kind: 'gate', id: g.to, name: 'Tor → ' + g.name, x: g.x, y: g.y, z: g.z, R: 250 });
  world.fields.forEach((f, i) => out.push({ kind: 'field', id: String(i), name: fieldName(i), x: f.x, y: f.y, z: f.z, R: f.r }));
  if (world.orbit) out.push({ kind: 'orbit', id: 'orbit', name: 'Anflug → ' + world.orbit.name, x: world.orbit.x, y: world.orbit.y, z: world.orbit.z, R: 300 });
  // Ziele aus Geschichte und Aufträgen (ohne die, die nur eine Station markieren)
  for (const m of [...storyMarkers(), ...missionMarkers()]) {
    if (world.stations.some(s => d3(m.x, m.y, m.z, s.x, s.y, s.z) < s.R + 1500)) continue;
    const name = m.label.charAt(0) + m.label.slice(1).toLowerCase();
    out.push({ kind: 'mark', id: m.label, name, x: m.x, y: m.y, z: m.z, R: 200 });
  }
  return out;
}
// Namen der Felder (Heimstatt hat eigene, sonst nach der Art)
const FIELD_NAMES: Record<string, string[]> = { heimstatt: ['Eisengürtel', 'Reifschleier'] };
const KIND_NAME: Record<string, string> = { metal: 'Metallfeld', ice: 'Eisfeld', mixed: 'Mischfeld', crystal: 'Kristallfeld' };
export function fieldName(i: number) {
  const f = world.fields[i]; if (!f) return 'Feld';
  return FIELD_NAMES[world.def?.id || '']?.[i] || KIND_NAME[f.def.kind] || 'Asteroidenfeld';
}
export function navTarget(): NavPoint | null {
  if (!SF.nav || SF.navDef !== world.def) return null;
  return navPoints().find(p => p.kind === SF.nav!.kind && p.id === SF.nav!.id) || null;
}
export function setNav(p: NavRef | null) {
  SF.nav = p ? { kind: p.kind, id: p.id } : null; SF.navDef = p ? world.def : null;
  snd(p ? 760 : 420, 0.07, 'sine', 0.035, p ? 260 : -120);
}
// N: der Ort, der dem Fadenkreuz am nächsten liegt (innerhalb 20°); derselbe noch einmal löscht das Ziel
export function pickNav(dir: THREE.Vector3) {
  let best: NavPoint | null = null, bc = Math.cos(20 * Math.PI / 180);
  const v = new THREE.Vector3();
  for (const p of navPoints()) {
    v.set(p.x - P.x, p.y - P.y, p.z - P.z);
    const l = v.length(); if (l < 1) continue;
    const c = v.dot(dir) / l;
    if (c > bc) { bc = c; best = p; }
  }
  const cur = navTarget();
  if (best && cur && best.kind === cur.kind && best.id === cur.id) { setNav(null); return null; }
  if (best) setNav(best);
  else radio('SYSTEM', 'Kein Ort im Fadenkreuz. Richte die Nase auf eine Markierung oder wähle auf der Sektorkarte (M) ein Ziel.');
  return best;
}

// ---------- Abstand zum nächsten Hindernis ----------
function clearance(x: number, y: number, z: number) {
  let m = Infinity;
  for (const s of world.stations) m = Math.min(m, d3(x, y, z, s.x, s.y, s.z) - s.R);
  for (const g of world.gates) m = Math.min(m, d3(x, y, z, g.x, g.y, g.z) - 250);
  for (const f of world.fields) m = Math.min(m, d3(x, y, z, f.x, f.y, f.z) - f.r);
  if (world.orbit) m = Math.min(m, d3(x, y, z, world.orbit.x, world.orbit.y, world.orbit.z) - 300);
  return m;
}

// ---------- Starten / Beenden ----------
export function toggleSchnellflug() {
  if (SF.phase !== 'off') { endSchnellflug(SF.phase === 'spool' ? 'Schnellflug abgebrochen.' : ''); return; }
  if (G.mode !== 'play' || G.dead) return;
  if (world.surface) { radio('SYSTEM', 'Der Schnellflug arbeitet nur im All.'); return; }
  if (G.jd) { radio('SYSTEM', 'Der Sprungantrieb lädt gerade.'); return; }
  if (world.enemies.some(e => d3(e.x, e.y, e.z, P.x, P.y, P.z) < 2500)) { radio('SYSTEM', 'Feindkontakt: Der Schnellflug lädt nicht im Gefecht.'); return; }
  if (world.fields.some(f => d3(P.x, P.y, P.z, f.x, f.y, f.z) < f.r)) { radio('SYSTEM', 'Im Asteroidenfeld geht kein Schnellflug. Flieg erst aus dem Feld.'); return; }
  if (world.stations.some(s => d3(P.x, P.y, P.z, s.x, s.y, s.z) < s.R + 500)) { radio('SYSTEM', 'Zu nah an der Station für den Schnellflug. Flieg ein Stück hinaus.'); return; }
  const tgt = navTarget();
  if (tgt && d3(P.x, P.y, P.z, tgt.x, tgt.y, tgt.z) < tgt.R + ARRIVE + 1500) { radio('SYSTEM', `${tgt.name} ist schon nah. Flieg im Reiseflug hin.`); return; }
  SF.phase = 'spool'; SF.t = SPOOL; SF.auto = !!tgt; SF.v = 0; markSfUsed();
  charge = sfxHeld('jump_charge', 0.45);
  if (!charge) snd(160, SPOOL, 'sine', 0.035, 220);
}
export function endSchnellflug(msg = '') {
  if (SF.phase === 'off') return;
  const wasFly = SF.phase === 'fly', wasAuto = SF.auto;
  SF.phase = 'off'; SF.auto = false; stopCharge();
  if (wasFly) {
    // Kurzsprung am Ziel: fast im Stand ankommen (sonst rollt das Schiff noch ~900 m auf die Station zu).
    // Sonst in den Reiseflug zurückfallen: Tempo auf Reiseflug-Höhe, Richtung bleibt.
    const arrived = wasAuto && !msg, f = fwdOf(), v = Math.min(SF.v, arrived ? 90 : stats().max * 1.07);
    P.vx = f.x * v; P.vy = f.y * v; P.vz = f.z * v;
    G.cruise = !arrived;
    sfx('cruise_off', 0.45, 1, () => snd(1400, 0.4, 'sawtooth', 0.012, -1100));
  }
  SF.v = 0;
  if (msg) radio('SYSTEM', msg);
}
// Treffer beendet Laden und Flug (hurtPlayer)
export function schnellflugHit() { if (SF.phase !== 'off') endSchnellflug(SF.phase === 'fly' ? 'Treffer: Schnellflug beendet.' : 'Treffer: Schnellflug abgebrochen.'); }

const _f = new THREE.Vector3(), _e = new THREE.Euler(0, 0, 0, 'YXZ');
function fwdOf() { return _f.set(0, 0, -1).applyEuler(_e.set(P.pitch, P.yaw, 0)); }
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// Autopilot: Nase zum Ziel drehen (mit der Wendigkeit des Schiffs). Gibt den verbleibenden Winkel zurück.
function steerTo(t: NavPoint, dt: number) {
  const dx = t.x - P.x, dy = t.y - P.y, dz = t.z - P.z, l = Math.hypot(dx, dy, dz) || 1;
  const wy = Math.atan2(-dx, -dz), wp = Math.asin(clamp(dy / l, -1, 1));
  const rate = 1.1 * Math.max(0.5, stats().turn) * dt;
  const ey = wrap(wy - P.yaw), ep = wp - P.pitch;
  P.yaw += clamp(ey, -rate, rate); P.pitch = clamp(P.pitch + clamp(ep, -rate, rate), -1.15, 1.15);
  return Math.hypot(wrap(wy - P.yaw), wp - P.pitch);
}

// ---------- pro Bild (player.ts). Rückgabe: true, wenn der Schnellflug die Bewegung übernimmt ----------
export function updateSchnellflug(dt: number): boolean {
  if (SF.phase === 'off') return false;
  if (G.mode !== 'play' || G.dead || world.surface) { endSchnellflug(); return false; }
  const tgt = SF.auto ? navTarget() : null;
  if (SF.auto && !tgt) { endSchnellflug('Navigationsziel verloren. Schnellflug beendet.'); return false; }
  if (SF.phase === 'spool') {
    if (tgt) steerTo(tgt, dt);
    if (keys.KeyS) { endSchnellflug('Schnellflug abgebrochen.'); return false; }
    const before = Math.ceil(SF.t);
    SF.t -= dt;
    if (!charge && SF.t > 0 && Math.ceil(SF.t) !== before) snd(260 + (4 - before) * 80, 0.1, 'sine', 0.03, 90);
    if (SF.t > 0) return false;
    // Ausrichtung abwarten (Kurzsprung): erst fliegen, wenn die Nase fast auf dem Ziel liegt
    if (tgt && steerTo(tgt, 0) > 0.06) { SF.t = 0; return false; }
    SF.phase = 'fly'; stopCharge();
    SF.v = Math.max(Math.hypot(P.vx, P.vy, P.vz), 300);
    G.cruise = false;
    sfx('jump_out', 0.35, 1.25, () => { snd(140, 0.9, 'sine', 0.05, 500); snd(70, 0.9, 'sawtooth', 0.02, 200); });
  }
  // ---- Flug ----
  if (keys.KeyS) { endSchnellflug(); return false; }
  const clear = clearance(P.x, P.y, P.z);
  let cap = clamp((clear - 600) * 0.55, 140, SF_MAX);   // vor Hindernissen bis auf 140 m/s herunter (danach rollt das Schiff höchstens ~600 m weiter)
  if (tgt) {
    steerTo(tgt, dt);
    const dT = d3(P.x, P.y, P.z, tgt.x, tgt.y, tgt.z), arrive = tgt.R + ARRIVE;
    cap = Math.min(cap, Math.max(220, (dT - arrive) * 0.85));
    if (dT - arrive < 60) { endSchnellflug(); return false; }
  } else if (clear < DROP_CLEAR) { endSchnellflug('Hindernis voraus: Schnellflug beendet.'); return false; }
  // Sektorrand
  const hd = Math.hypot(P.x, P.z);
  if (hd > SECTOR_RADIUS - 800 || Math.abs(P.y) > SECTOR_HEIGHT - 200) {
    const f = fwdOf(), out = (P.x * f.x + P.z * f.z) / (hd || 1) > 0 || P.y * f.y > 0;
    if (out) { endSchnellflug('Sektorgrenze: Schnellflug beendet.'); return false; }
  }
  // beschleunigen (gut 5 s bis 8 km/s), bremsen sofort auf die Grenze
  const acc = Math.max(400, SF.v * 1.05);
  SF.v = SF.v < cap ? Math.min(cap, SF.v + acc * dt) : Math.max(cap, SF.v - Math.max(800, SF.v * 2.5) * dt);
  const f = fwdOf();
  P.vx = f.x * SF.v; P.vy = f.y * SF.v; P.vz = f.z * SF.v;
  return true;
}
// Restzeit bis zum Ziel (grob, für die Anzeige)
export function sfEta(): number | null {
  const t = navTarget(); if (!t || SF.phase !== 'fly' || SF.v < 1) return null;
  return Math.max(0, (d3(P.x, P.y, P.z, t.x, t.y, t.z) - t.R - ARRIVE) / Math.max(SF.v, 500));
}

// Einmal je Sitzung beim Ankommen in einem großen Sektor: wie man die Strecken überbrückt (nur solange der Schnellflug noch nicht benutzt wurde)
let hinted = false, used = false;
export function bigSectorHint() {
  if (hinted || used || !world.def?.size || world.surface || G.mode !== 'play') return;   // nur im Flug (nicht im Hangar, nicht im Prolog zu Fuß)
  hinted = true;
  radio('SYSTEM', `${world.def.name} misst ${Math.round(world.def.size.r / 1000)} km. Ziel mit N wählen oder auf der Sektorkarte (M), H startet den Kurzsprung.`);
}
export const markSfUsed = () => { used = true; };
