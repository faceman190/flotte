import * as THREE from 'three';
import { scene, camera, view, ux, overlay } from '../core/engine';
import { mouse } from '../core/input';
import { rng, hashStr, clamp } from '../core/util';
import { sfx, snd, shotSfx } from '../core/audio';
import { ngMuzzle, ngVmFlash } from './ngfx';
import { shotTrail, shotPending, shotFlush, impact, vmShell, makeBolt, orientBolt, droneFire, boltHit, droneDeath, updateFootFx, clearFootFx, SHELL_PORT, type ImpStoff } from './footfx';
import { P, G, saveGame } from './state';
import { world } from './world';
import { terrainAt, liquidAt } from './surface';
import { buildDrone, buildViewModel, viewModelId, poseViewModel, type DroneVis, type ViewModel } from './mineArt';
import { weapon, shotSound } from './dungeon';
import { throwGrenade, updateGrenades } from './granate';
import { fireLauncher, updateLauncher, type GwEnv } from './granatwerfer';
import { gunReady, gunFired, gunUpdate, GUN, aimK, gunSpread, gunFalloff, camShake, hurtSound, noteKill, whiz, ZIEL, zielStrahl, zielWeite, spreadDir } from './footgun';
import { drawFootRing } from '../ui/footHud';
import { flinch, noteShot } from './avatar';
import { droneBark } from './barks';
import { gearStat, addItem, canAdd } from './inventory';
import { GEAR_IDS, gearDef } from '../data/gear';
import { SECTOR } from '../data/galaxy';
import { burst, flash } from './fx';
import { radio } from '../ui/radio';
import { SALV, salvageFull } from './salvage';
import { onCoop, coopSend, coopNet, pack, CoopGroup } from './coop';
import { TESTF } from './testflags';

// =====================================================================================
// Kampf zu Fuß auf Planeten (Alpha 0.85): Ferrox-Wachdrohnen an den Wracks und auf Streife.
// Waffe wie in der Mine (Werte aus dungeon.ts → weapon()), in der Ich-Sicht als Waffenmodell im Bild.
// Lebenspunkte zu Fuß; wer zusammenbricht, wacht am Schiff wieder auf. Drohnen kommen mit dem nächsten Besuch zurück.
// =====================================================================================

interface Foe { id: number; nx?: number; ny?: number; nz?: number; x: number; y: number; z: number; hx: number; hz: number; hr: number; hp: number; max: number; alert: boolean; cool: number; ph: number; hit: number; atk: number; vis: DroneVis | null; g: THREE.Object3D; dead: boolean }
interface Bolt { m: THREE.Object3D; x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; dmg: number }
export const FIGHT = { hp: 100, max: 100, cool: 0, kick: 0, flash: 0, shots: 0, hurt: 0, down: 0, foes: [] as Foe[], bolts: [] as Bolt[], lastShot: -99, msg: [] as { t: string; c: string; life: number }[] };
let vm: ViewModel | null = null, tracer: THREE.Line | null = null, tracerT = 0, mflash: THREE.PointLight | null = null, sector = '';
const danger = () => (SECTOR[P.sector] && SECTOR[P.sector].danger) || 1;
const say = (t: string, c = '#dfe8f0') => { FIGHT.msg.unshift({ t, c, life: 5 }); if (FIGHT.msg.length > 4) FIGHT.msg.pop(); };
export const feldSay = say;

// Weitere Gegner auf dem Planetenboden (seit 26.11.2026: Plünderer der neuen KI, src/game/ki/pluenderer.ts). Sie hängen sich hier ein,
// damit dieser Kampf nichts von ihnen wissen muss: wand = Hindernisse (Abstand des ersten Treffers), ziel = Treffer an einem Gegner,
// blast = Granate, solid = fester Punkt (Granate prallt ab), laerm = eigener Schuss (Gegner hören ihn), kampf = jemand ist alarmiert,
// ruhe = nach dem Zusammenbrechen alle beruhigen, weg = Planet verlassen, update / hud = je Bild.
type Strahl = (ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMax: number) => number;
export const FELD_EXTRA = {
  wand: ((_ox, _oy, _oz, _dx, _dy, _dz, tMax) => tMax) as Strahl,
  ziel: (_ox: number, _oy: number, _oz: number, _dx: number, _dy: number, _dz: number, _tMax: number): { t: number; treffer: (dmg: number) => void } | null => null,
  blast: (_x: number, _y: number, _z: number, _r: number, _dmg: number) => {},
  solid: (_x: number, _y: number, _z: number) => false,
  nah: (_x: number, _y: number, _z: number) => false,      // steht dort ein weiterer Gegner (Geschoss des Granatwerfers zündet)?
  stoff: (x: number, _y: number, z: number): ImpStoff => (liquidAt(x, z) ? 'wasser' : 'default'),      // Material einer Einschlagstelle (pluenderer.ts: Container Metall)
  laerm: (_x: number, _y: number, _z: number, _r: number) => {},
  kampf: () => false,
  ruhe: () => {},
  weg: () => {},
  update: (_dt: number, _me: { x: number; y: number; z: number; active: boolean; down: boolean; geduckt?: boolean; vx?: number; vz?: number; lehnt?: boolean }) => {},
  hud: () => {},
};

function droneObj(): { vis: DroneVis | null; g: THREE.Object3D } {
  const vis = buildDrone(false);
  if (vis) return { vis, g: vis.g };
  const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0x5a4a6a, emissive: 0x401060, roughness: 0.4, metalness: 0.7 }));
  return { vis: null, g };
}

// Drohnen je Planet: zwei an jedem Wrack, drei auf Streife; Gefahr des Sektors erhöht Leben und Anzahl
export function buildFieldFoes(sec: string) {
  clearFieldFoes(); sector = sec; grp.reset(); coSynced = 0;
  if (!world.surface) return;
  const R = rng(hashStr(sec + ':drohnen')), dg = danger();
  const add = (hx: number, hz: number, hr: number) => {
    const { vis, g } = droneObj(), max = Math.round(40 * (1 + 0.3 * (dg - 1)));
    const a = R.range(0, 6.28), x = hx + Math.cos(a) * hr, z = hz + Math.sin(a) * hr, y = terrainAt(x, z) + 3;
    g.position.set(x, y, z); scene.add(g); world.extras.push(g);
    FIGHT.foes.push({ id: FIGHT.foes.length, x, y, z, hx, hz, hr, hp: max, max, alert: false, cool: R.range(0.5, 2), ph: a, hit: 0, atk: 0, vis, g, dead: false });
  };
  for (const w of SALV.wrecks) for (let k = 0; k < (dg >= 3 ? 3 : 2); k++) add(w.x, w.z, w.r + 6 + k * 3);
  for (let k = 0; k < 3; k++) { const a = R.range(0, 6.28), d = R.range(600, 2400); add(Math.cos(a) * d, Math.sin(a) * d, 40); }
  FIGHT.max = 100 + gearStat('schutz') * 2; FIGHT.hp = FIGHT.max; FIGHT.down = 0;
}
// Wachen an einem Ort (Geschichte): sofort wachsam; guardsLeft() zählt die noch lebenden
let guards: Foe[] = [];
export function addGuardDrones(x: number, z: number, n: number) {
  guards = [];
  const dg = danger();
  for (let k = 0; k < n; k++) {
    const { vis, g } = droneObj(), max = Math.round(55 * (1 + 0.3 * (dg - 1))), a = k / n * Math.PI * 2;
    const fx = x + Math.cos(a) * 14, fz = z + Math.sin(a) * 14, fy = terrainAt(fx, fz) + 3;
    g.position.set(fx, fy, fz); scene.add(g); world.extras.push(g);
    const f: Foe = { id: -1, x: fx, y: fy, z: fz, hx: x, hz: z, hr: 14, hp: max, max, alert: true, cool: 1 + k * 0.4, ph: a, hit: 0, atk: 0, vis, g, dead: false };
    FIGHT.foes.push(f); guards.push(f);
  }
}
export const guardsLeft = () => guards.filter(f => !f.dead).length;
export function clearFieldFoes() {
  guards = [];
  for (const b of FIGHT.bolts) scene.remove(b.m);                   // Bolzen teilen Geometrie und Material (footfx.ts)
  FIGHT.bolts = []; FIGHT.foes = []; FIGHT.msg = []; clearFootFx();
  FELD_EXTRA.weg();
}

// ---------- Koop (src/game/coop.ts): Mitspieler zu Fuß auf demselben Planeten ----------
// Gastgeber steuert die Drohnen des Planeten (Kennung ≥ 0); die Wachen der Geschichte (Kennung −1) bleiben bei jedem selbst.
interface FMate { id: number; x: number; y: number; z: number; foot: boolean }
let mates: FMate[] = [], coT = 0, coEv: (string | number)[][] = [], coSynced = 0;
const grp = new CoopGroup();
export function setFieldMates(l: FMate[]) {
  const before = new Set(mates.map(m => m.id));
  mates = world.surface && sector === P.sector ? l.filter(m => m.foot) : [];
  for (const id of before) if (!mates.some(m => m.id === id)) grp.since.delete(id);
  if (mates.some(m => !before.has(m.id))) { salvageFull(); coopSend('ffull', { s: P.sector, since: grp.mine }); }
}
const mateIds = () => mates.map(m => m.id);
const isClient = () => mates.length > 0 && !grp.amHost(mateIds());
/** für weitere Gegner (FELD_EXTRA): Mitspieler zu Fuß auf diesem Planeten und ob ein anderer Gastgeber ist */
export const feldKoop = () => ({ mates, client: isClient() });
onCoop('ffull', m => { if (m.s === P.sector && isFinite(+m.since)) grp.since.set(+m.from, +m.since); });
const sameField = (m: any) => !!world.surface && m.s === P.sector && sector === P.sector;
const byId = (id: number) => FIGHT.foes.find(f => f.id === id && id >= 0);
onCoop('fh', m => {
  if (!sameField(m) || isClient()) return;
  const f = byId(+m.i); if (!f || f.dead) return;
  f.hp -= clamp(+m.d || 0, 0, 200); f.hit = 0.12; f.alert = true;
  if (f.hp <= 0) kill(f, +m.from);
});
onCoop('fst', m => {
  if (!sameField(m) || !mates.some(q => q.id === m.from) || grp.host(mateIds()) !== m.from) return;
  const first = coSynced !== m.from; coSynced = m.from;
  const seen = new Set<number>();
  for (const a of Array.isArray(m.f) ? m.f : []) {
    const f = byId(+a[0]); if (!f || f.dead) continue;
    seen.add(f.id); f.nx = +a[1]; f.ny = +a[2]; f.nz = +a[3]; if (first) { f.x = f.nx; f.y = f.ny; f.z = f.nz; }
    f.hp = +a[4]; const al = !!a[5]; if (al && !f.alert && !first) droneBark('alarm', Math.hypot(f.x - camera.position.x, f.z - camera.position.z)); f.alert = al;
  }
  for (const ev of Array.isArray(m.ev) ? m.ev : []) {
    if (ev[0] === 'b') spawnBolt(+ev[1], +ev[2], +ev[3], +ev[4], +ev[5], +ev[6], +ev[7]);
    else if (ev[0] === 'k') { const f = byId(+ev[1]); if (f && !f.dead) kill(f, +ev[2]); }
  }
  // beim Gastgeber schon zerstört (z. B. vor dem Dazukommen): still entfernen
  for (const f of FIGHT.foes) if (f.id >= 0 && !f.dead && !seen.has(f.id)) { f.dead = true; f.g.visible = false; }
});
// Energiebolzen der Drohne (seit 2026-11-19: Kern, Leuchten, Schweif, Mündungsblitz und eigener Ton statt einer violetten Kugel und Piepton)
const BOLT_COL = '#c070ff';
function spawnBolt(x: number, y: number, z: number, vx: number, vy: number, vz: number, dmg: number) {
  const m = makeBolt(BOLT_COL, 0.075);
  m.position.set(x, y, z); orientBolt(m, vx, vy, vz); scene.add(m);
  FIGHT.bolts.push({ m, x, y, z, vx, vy, vz, life: 4, dmg });
  const l = Math.hypot(vx, vy, vz) || 1; droneFire(x, y, z, BOLT_COL, vx / l, vy / l, vz / l);
}

// Sichtlinie über dem Gelände (Hügel verdecken)
function los(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(d / 2));
  for (let i = 1; i < n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t; if (terrainAt(x, z) > y) return false; }
  return true;
}

export const feldHurt = (d: number) => hurt(d);
function hurt(d: number) {
  if (FIGHT.down > 0 || TESTF.gott) return;
  FIGHT.hp -= d * 100 / (100 + gearStat('schutz') * 3); FIGHT.hurt = 1; flinch();
  hurtSound(d);
  if (FIGHT.hp <= 0) { FIGHT.hp = 0; FIGHT.down = 3; say('Du bist zusammengebrochen …', '#ff6b5b'); }
}

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _d = new THREE.Vector3(), _d2 = new THREE.Vector3();
// Was trifft ein Strahl von o in Richtung d bis zur Entfernung max? Gelände (step: Schrittweite, die Stelle danach durch Halbieren genau),
// Deckungen und Gegner der Plünderer (FELD_EXTRA), Drohnen (Kugel 0,62 m).
interface Hit { t: number; foe: Foe | null; ex: { t: number; treffer: (d: number) => void } | null; wall: boolean }
function strahl(ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, max: number, step = 0.5): Hit {
  let tw = max, wall = false;
  for (let t = step; t < max; t += step) {
    if (terrainAt(ox + dx * t, oz + dz * t) > oy + dy * t) {
      let lo = t - step, hi = t;
      for (let i = 0; i < 5; i++) { const m = (lo + hi) / 2; if (terrainAt(ox + dx * m, oz + dz * m) > oy + dy * m) hi = m; else lo = m; }
      tw = hi; wall = true; break;
    }
  }
  const t2 = FELD_EXTRA.wand(ox, oy, oz, dx, dy, dz, tw);              // Hindernisse weiterer Gegner (Deckungen der Plünderer)
  if (t2 < tw) { tw = t2; wall = true; }
  let best: Foe | null = null, bt = tw;
  for (const f of FIGHT.foes) {
    if (f.dead) continue;
    const px = f.x - ox, py = f.y - oy, pz = f.z - oz, t = px * dx + py * dy + pz * dz;
    if (t < 0 || t > bt) continue;
    const qx = px - dx * t, qy = py - dy * t, qz = pz - dz * t;
    if (qx * qx + qy * qy + qz * qz < 0.62 * 0.62) { bt = t; best = f; }
  }
  const ex = FELD_EXTRA.ziel(ox, oy, oz, dx, dy, dz, bt);
  if (ex) return { t: ex.t, foe: null, ex, wall: false };
  return { t: bt, foe: best, ex: null, wall: wall && !best };
}
/** in jedem Bild vor dem Schießen: Zielstrahl durch das Fadenkreuz und Zielpunkt für die Haltung der Figur (footgun.ts ZIEL) */
function zielen(dt: number, me: { x: number; y: number; z: number; yaw: number; pitch: number; eye: number; tp: boolean }) {
  zielStrahl(camera, me.x, me.y + me.eye, me.z, me.yaw, me.pitch, me.tp);
  const o = ZIEL.o, d = ZIEL.d;
  zielWeite(strahl(o.x, o.y, o.z, d.x, d.y, d.z, 60, 1).t, dt);
}
function shoot() {
  const w = weapon(), o = ZIEL.o, E = ZIEL.eye;
  FIGHT.cool = w.iv; FIGHT.kick = 1; FIGHT.flash = 0.06; FIGHT.lastShot = performance.now(); FIGHT.shots++; noteShot();
  shotSound(w); if (w.n > 1) camShake(0.32);
  const sp = gunSpread(w.spread);
  const c0 = strahl(o.x, o.y, o.z, ZIEL.d.x, ZIEL.d.y, ZIEL.d.z, 120); zielWeite(c0.t, 0, true);      // die Waffe zeigt im Bild des Schusses genau auf den Zielpunkt
  flashDue = true;
  if (w.gw) {      // Granatwerfer (granatwerfer.ts): Geschoss knapp vor dem Kopf der Figur, gerichtet auf den Punkt unter dem Fadenkreuz (mindestens 12 m weit)
    const a = new THREE.Vector3(E.x, E.y - 0.12, E.z);
    const d = spreadDir(_d2.copy(o).addScaledVector(ZIEL.d, Math.max(12, c0.t)).sub(a).normalize(), sp, _d).clone();
    camShake(0.35);
    fireLauncher(a.addScaledVector(d, 0.5), d, feldEnv(), w.dmg);
    FELD_EXTRA.laerm(E.x, E.y, E.z, 80);
    return;
  }
  for (let s = 0; s < w.n; s++) {
    // 1) entlang des Kamerastrahls durch das Fadenkreuz (mit Streuung): Das ist der Zielpunkt dieser Kugel
    const d = spreadDir(ZIEL.d, sp, _d);
    let h = strahl(o.x, o.y, o.z, d.x, d.y, d.z, 120), ax = o.x, ay = o.y, az = o.z;
    // 2) Außensicht: Ist der Weg vom Kopf der Figur dorthin frei? Sonst trifft die Kugel, was dazwischen steht
    if (ZIEL.tp) {
      const e = _d2.set(o.x + d.x * h.t - E.x, o.y + d.y * h.t - E.y, o.z + d.z * h.t - E.z), L = e.length();
      if (L > 1.2) {
        e.divideScalar(L);
        const h2 = strahl(E.x, E.y, E.z, e.x, e.y, e.z, L);
        if (h2.t < L - 0.8) { h = h2; ax = E.x; ay = E.y; az = E.z; d.copy(e); }
      }
    }
    const bt = h.t, best = h.foe, end = new THREE.Vector3(ax + d.x * bt, ay + d.y * bt, az + d.z * bt);
    if (h.ex) { h.ex.treffer(w.dmg * gunFalloff(bt)); impact(end, d, 'boden', '#a03020', 'fleisch'); }
    else if (best && best.id >= 0 && isClient()) { best.hit = 0.12; coopSend('fh', { s: P.sector, i: best.id, d: w.dmg }); impact(end, d, 'metall'); }
    else if (best) {
      if (!best.alert) droneBark('alarm', Math.hypot(best.x - E.x, best.z - E.z)); best.hp -= w.dmg * gunFalloff(bt); best.hit = 0.12; best.alert = true; impact(end, d, 'metall'); G.hitMark = 0.12;
      if (best.hp <= 0) kill(best, coopNet.id);
    } else if (h.wall) { const st = FELD_EXTRA.stoff(end.x, end.y, end.z); impact(end, d, st === 'metall' ? 'metall' : 'boden', w.col, st, hitNormal(end, d)); }
    shotTrail(end, w.col, w.n > 1 ? 0.04 : 0.065);                    // Leuchtspur je Kugel: beginnt an der Mündung des Bildes (fieldShotFx)
    SHOT.end.copy(end); SHOT.n++;
  }
  FELD_EXTRA.laerm(E.x, E.y, E.z, 70);
}
/** nur für Prüfskripte: Endpunkt der letzten Kugel und Mündung, von der ihre Leuchtspur ausging */
export const SHOT = { end: new THREE.Vector3(), a: new THREE.Vector3(), n: 0 };
/**
 * Leuchtspuren und Mündungsfeuer des Schusses dieses Bildes, sobald Figur und Kamera stehen (onfoot.ts footCamera).
 * mz: Mündung der eigenen Figur (Außensicht und Ich-Sicht mit Körper), sonst die des Waffenmodells im Bild.
 */
let flashDue = false;
export function fieldShotFx(mz: THREE.Vector3 | null) {
  if (!shotPending() && !flashDue) return;
  flashDue = false;
  camera.updateMatrixWorld();
  const w = weapon(), a = mz || (vm ? camera.localToWorld(_w.copy(vm.muzzle).applyEuler(vm.gun.rotation).add(vm.gun.position)) : camera.localToWorld(_w.set(0.12, -0.15, -0.5)));
  if (mz && !ngMuzzle(mz, ZIEL.d, 1, !!w.sfx)) flash(mz.x, mz.y, mz.z, '#ffd9a0', w.sfx ? 0.18 : 0.38, 0.05);   // Figur: Mündungsfeuer (SMG gedämpft)
  SHOT.a.copy(a); shotFlush(a);
}
// Flächennormale am Einschlag für das Einschussloch: am Gelände aus dessen Steigung, sonst (Deckung, Container) eine senkrechte Wand
// gegen die Schussrichtung. Hebt p auf die Geländeoberfläche, falls es darunter liegt.
function hitNormal(p: THREE.Vector3, d: THREE.Vector3): THREE.Vector3 {
  const g = terrainAt(p.x, p.z);
  if (p.y - g < 0.35) { if (p.y < g) p.y = g;      // grobe Schritte von 0,5 m: Treffpunkt kann im Boden liegen
    const e = 0.3; return new THREE.Vector3(terrainAt(p.x - e, p.z) - terrainAt(p.x + e, p.z), 2 * e, terrainAt(p.x, p.z - e) - terrainAt(p.x, p.z + e)).normalize(); }
  const n = new THREE.Vector3(-d.x, 0, -d.z); return n.lengthSq() > 1e-6 ? n.normalize() : n.set(0, 1, 0);
}
// Granate werfen (Taste G, onfoot.ts): trifft alle Drohnen im Umkreis, zur Mitte hin voll
export function fieldGrenade(me: { x: number; y: number; z: number; yaw: number; pitch: number; eye: number }) {
  if (FIGHT.down > 0) return false;
  return throwGrenade(me.x, me.y + me.eye, me.z, me.yaw, me.pitch, feldEnv());
}
// Umgebung für Granate und Granatwerfer (granate.ts, granatwerfer.ts): Gelände, Deckungen der Plünderer, Drohnen und weitere Gegner
function feldEnv(): GwEnv {
  return { ground: terrainAt, solid: (x, y, z) => FELD_EXTRA.solid(x, y, z),
    hit: (x, y, z) => FIGHT.foes.some(f => !f.dead && Math.hypot(f.x - x, f.y - y, f.z - z) < 0.65) || FELD_EXTRA.nah(x, y, z),
    blast: (x, y, z, r, dmg) => {
      FELD_EXTRA.blast(x, y, z, r, dmg); FELD_EXTRA.laerm(x, y, z, 80);
      for (const f of FIGHT.foes) {
        if (f.dead) continue;
        const d = Math.hypot(f.x - x, f.y - y, f.z - z); if (d > r) continue;
        const dm = dmg * (1 - 0.7 * d / r);
        if (f.id >= 0 && isClient()) { f.hit = 0.12; coopSend('fh', { s: P.sector, i: f.id, d: dm }); }
        else { f.hp -= dm; f.hit = 0.12; f.alert = true; G.hitMark = 0.12; if (f.hp <= 0) kill(f, coopNet.id); }
      }
    } };
}
function kill(f: Foe, by = coopNet.id) {
  f.dead = true; f.g.visible = false;
  droneBark('tot', camera.position.distanceTo(f.g.position));
  droneDeath(f.x, f.y, f.z, terrainAt);                              // Blitz, Funken, Rauch, Trümmer (footfx.ts)
  sfx('ferrox_death', 0.35, 1.1, () => snd(160, 0.4, 'sawtooth', 0.05, -120));
  if (f.id >= 0 && mates.length && !isClient()) coEv.push(['k', f.id, by]);
  if (by !== coopNet.id) return;                                   // ein Mitspieler hat sie erwischt
  noteKill();
  const cr = Math.round((40 + Math.random() * 50) * (1 + 0.4 * (danger() - 1)));
  P.credits += cr; P.earned += cr; P.kills = (P.kills || 0) + 1;
  say(`Drohne zerstört · +${cr} Credits`, '#ffb347');
  if (Math.random() < 0.15) {
    const pool = GEAR_IDS.filter(id => { const d = gearDef(id)!; return d.rar <= 1 && !['sw_lanze', 'sy_orakel', 'waffe_splitter', 'helm_kristall'].includes(id); });
    const id = pool[Math.floor(Math.random() * pool.length)];
    if (id && canAdd(id) && addItem(id, 1)) say(`Fund im Wrack der Drohne: ${gearDef(id)!.n}`, '#5fd0ff');
  }
  if (FIGHT.foes.every(o => o.dead || Math.hypot(o.hx - f.hx, o.hz - f.hz) > 1)) radio('SYSTEM', 'Die Wachdrohnen an dieser Stelle sind ausgeschaltet.');
  saveGame();
}

// Ablauf je Bild (nur zu Fuß auf einem Planeten). me: Spielerposition, Blick; tp: Außensicht (Mündung der Figur)
export function updateFieldFight(dt: number, me: { x: number; y: number; z: number; yaw: number; pitch: number; eye: number; active: boolean; tp: boolean; geduckt?: boolean; vx?: number; vz?: number; lehnt?: boolean }) {
  if (!world.surface || sector !== P.sector) return;
  if (!tracer) { tracer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.9 })); tracer.frustumCulled = false; tracer.visible = false; scene.add(tracer); }
  // Kein Punktlicht fürs Mündungsfeuer mehr (seit 2026-11-18): Es kam beim ersten Schritt zu Fuß dazu und blieb danach für immer in der Szene –
  // jedes zusätzliche Licht zwingt alle Materialien zu neuen Shadern (Standbild zu Fuß, später erneut im All und im Hangar).
  FIGHT.cool -= dt; FIGHT.kick = Math.max(0, FIGHT.kick - dt * 7); FIGHT.flash -= dt; FIGHT.hurt = Math.max(0, FIGHT.hurt - dt * 1.6);
  for (const m of FIGHT.msg) m.life -= dt; FIGHT.msg = FIGHT.msg.filter(m => m.life > 0);
  if (tracer.visible && (tracerT -= dt) <= 0) tracer.visible = false;
  updateFootFx(dt);
  const px = me.x, pz = me.z, py = me.y + me.eye;
  // Schießen
  gunUpdate(dt);
  if (me.active) zielen(dt, me);
  if (me.active && FIGHT.down <= 0 && mouse.down && FIGHT.cool <= 0 && gunReady()) { shoot(); gunFired(); if (!weapon().auto) mouse.down = false; }   // Magazin: footgun.ts
  if (mflash) { mflash.position.set(px, py, pz); mflash.intensity = FIGHT.flash > 0 ? 30 : 0; }
  // Erholung außerhalb des Kampfes
  const fighting = FIGHT.foes.some(f => !f.dead && f.alert) || FELD_EXTRA.kampf();
  if (!fighting && FIGHT.down <= 0) FIGHT.hp = Math.min(FIGHT.max, FIGHT.hp + dt * 4);
  // Drohnen
  const dg = danger(), client = isClient();
  // Ziele: ich (wenn handlungsfähig) und – beim Gastgeber – die Mitspieler zu Fuß
  const players: { x: number; y: number; z: number; ok: boolean }[] = [{ x: px, y: py, z: pz, ok: me.active && FIGHT.down <= 0 }];
  if (!client) for (const m of mates) players.push({ x: m.x, y: m.y + 1.6, z: m.z, ok: true });
  for (const f of FIGHT.foes) {
    if (f.dead) continue;
    const local = !client || f.id < 0;
    let tg = players[0], td = Infinity, sees = false;
    for (const pl of local ? players : [players[0]]) {
      if (!pl.ok) continue;
      const dd = Math.hypot(pl.x - f.x, pl.z - f.z), sv = dd < 34 && los(f.x, f.y, f.z, pl.x, pl.y, pl.z);
      if ((sv && !sees) || (sv === sees && dd < td)) { tg = pl; td = dd; sees = sv; }
    }
    const dx = tg.x - f.x, dz = tg.z - f.z, d = td === Infinity ? Math.hypot(dx, dz) : td;
    f.ph += dt * (f.alert ? 0.9 : 0.25);
    f.cool -= dt; f.atk = Math.max(0, f.atk - dt * 2); f.hit -= dt;
    if (!local) {
      // Mitspieler: dem Stand des Gastgebers folgen
      if (f.nx !== undefined) { const kk = Math.min(1, dt * 8); f.x += (f.nx - f.x) * kk; f.y += (f.ny! - f.y) * kk; f.z += (f.nz! - f.z) * kk; }
      f.g.position.set(f.x, f.y, f.z);
      f.g.rotation.y = f.alert ? Math.atan2(px - f.x, pz - f.z) : f.ph + Math.PI / 2;
    } else {
      if (sees) { if (!f.alert) droneBark('alarm', Math.hypot(px - f.x, pz - f.z)); f.alert = true; }
      if (f.alert && (td === Infinity || d > 70)) f.alert = false;
      let tx: number, tz: number;
      if (f.alert) { const want = 15, s = d > want ? 1 : -0.6; tx = f.x + dx / Math.max(d, 0.1) * s * 6 + Math.cos(f.ph * 2) * 3; tz = f.z + dz / Math.max(d, 0.1) * s * 6 + Math.sin(f.ph * 2) * 3; }
      else { tx = f.hx + Math.cos(f.ph) * f.hr; tz = f.hz + Math.sin(f.ph) * f.hr; }
      const sp = f.alert ? 5 : 2.2, mx = tx - f.x, mz = tz - f.z, ml = Math.hypot(mx, mz);
      if (ml > 0.1) { f.x += mx / ml * Math.min(ml, sp * dt); f.z += mz / ml * Math.min(ml, sp * dt); }
      const gy = terrainAt(f.x, f.z) + 2.6 + Math.sin(f.ph * 3) * 0.3;
      f.y += (gy - f.y) * Math.min(1, dt * 3);
      f.g.position.set(f.x, f.y, f.z);
      f.g.rotation.y = f.alert ? Math.atan2(dx, dz) : f.ph + Math.PI / 2;
      // Schuss: leuchtende Kugel auf die Brust des Zielpiloten
      if (f.alert && f.cool <= 0 && d < 40 && los(f.x, f.y, f.z, tg.x, tg.y - 0.4, tg.z)) {
        f.cool = 1.5 + Math.random() * 0.8; f.atk = 1;
        const ty = tg.y - 0.45 - f.y, tl = Math.hypot(dx, ty, dz), v0 = 15;
        const bv = [f.x, f.y, f.z, dx / tl * v0, ty / tl * v0, dz / tl * v0, 7 * (1 + 0.25 * (dg - 1))];
        spawnBolt(bv[0], bv[1], bv[2], bv[3], bv[4], bv[5], bv[6]);
        if (f.id >= 0 && mates.length) coEv.push(['b', ...pack(...bv)]);
      }
    }
    if (f.vis) {
      if (f.vis.attack) f.vis.attack.setEffectiveWeight(f.atk); if (f.vis.idle) f.vis.idle.setEffectiveWeight(1 - f.atk * 0.8);
      f.vis.mixer?.update(dt);
      const ec = f.alert ? 0xff3020 : 0x30a0ff;
      f.vis.mat.forEach((m, k) => { m.emissive.setHex(ec); m.color.copy(f.vis!.base[k]).multiplyScalar(f.hit > 0 ? 2.4 : 1); });
    }
  }
  // Gastgeber: Stand der Planetendrohnen an die Mitspieler (10× pro Sekunde, alle noch lebenden)
  if (mates.length && !client && (coT -= dt) <= 0) {
    coT = 0.1;
    coopSend('fst', { s: P.sector, f: FIGHT.foes.filter(f => f.id >= 0 && !f.dead).map(f => [f.id, ...pack(f.x, f.y, f.z), Math.round(f.hp), f.alert ? 1 : 0]), ev: coEv.splice(0) });
  } else if (!mates.length) coEv = [];
  FELD_EXTRA.update(dt, { x: me.x, y: me.y, z: me.z, active: me.active, down: FIGHT.down > 0, geduckt: me.geduckt, vx: me.vx, vz: me.vz, lehnt: me.lehnt });
  updateGrenades(dt, px, me.y + 1.1, pz, hurt);
  updateLauncher(dt, px, me.y + 1.1, pz, hurt);
  // Geschosse
  for (let i = FIGHT.bolts.length - 1; i >= 0; i--) {
    const b = FIGHT.bolts[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.life -= dt; b.m.position.set(b.x, b.y, b.z);
    const hitMe = me.active && Math.hypot(b.x - px, b.z - pz) < 0.45 && b.y > me.y && b.y < me.y + 1.9;
    if (hitMe) hurt(b.dmg); else if (me.active) whiz(b, Math.hypot(b.x - px, b.y - py + 0.3, b.z - pz));
    const ground = terrainAt(b.x, b.z) > b.y;
    if (hitMe || ground) boltHit(b.x, ground ? terrainAt(b.x, b.z) + 0.05 : b.y, b.z, BOLT_COL);
    if (hitMe || b.life <= 0 || ground) { scene.remove(b.m); FIGHT.bolts.splice(i, 1); }
  }
}
// Zusammengebrochen: Zeit läuft, dann am Schiff aufwachen (rückt der Aufrufer)
export function fieldDown(dt: number): boolean {
  if (FIGHT.down <= 0) return false;
  FIGHT.down -= dt;
  if (FIGHT.down <= 0) { FIGHT.hp = FIGHT.max * 0.6; FIGHT.down = 0; for (const f of FIGHT.foes) f.alert = false; FELD_EXTRA.ruhe(); return true; }
  return false;
}

// Waffe im Bild (Ich-Sicht) – wie in der Mine, aber im Tageslicht heller beleuchtet
export function fieldViewModel(show: boolean, bob: number, walked: number) {
  const id = viewModelId(P.gear?.waffe);
  if (show && (!vm || vm.id !== id)) { vm = buildViewModel(id); if (vm) { vm.key.intensity = 1.5; vm.fill.intensity = 0.65; } }
  const want = show && vm ? vm.scene : null;
  if (overlay.scene !== want && (want || (vm && overlay.scene === vm.scene))) { overlay.scene = want; overlay.camera = want ? vm!.cam : null; }
  if (!show || !vm) return null;
  vm.cam.aspect = view.W / view.H; vm.cam.updateProjectionMatrix();
  poseViewModel(vm, { walked, bob, kick: FIGHT.kick, reload: GUN.reload > 0 ? 1 - GUN.reload / GUN.reloadT : -1, ads: aimK(), shots: FIGHT.shots });   // mineArt.ts
  vm.gun.visible = FIGHT.down <= 0 && !GUN.weg;
  const sup = vm.id === 'smg', f = FIGHT.flash > 0 && (!sup || FIGHT.shots % 3 === 0); vm.flash.visible = f; vm.flashLight.intensity = f ? (sup ? 0.12 : 2.6) : 0;   // SMG mit Schalldämpfer: kleines Mündungsfeuer
  if (f) { ngVmFlash(vm.flash); (vm.flash.material as THREE.SpriteMaterial).rotation = Math.random() * 6.28; vm.flash.scale.setScalar(sup ? 0.03 + Math.random() * 0.02 : 0.11 + Math.random() * 0.08); }
  if (FIGHT.shots !== vmShots) { vmShots = FIGHT.shots; const port = SHELL_PORT[vm.id]; if (port) vmShell(vm.scene, vm.gun, port); }   // Hülse fliegt rechts heraus
  return vm;
}
let vmShots = 0;
export function hideFieldViewModel() { if (vm && overlay.scene === vm.scene) { overlay.scene = null; overlay.camera = null; } }
export const fieldVM = () => vm;   // für Tests (Lage der Waffe einstellen)

// Anzeige: Leben, Treffer-Rand, Meldungen, Drohnen-Markierungen
const _p = new THREE.Vector3();
export function drawFieldHUD() {
  if (!world.surface) return;
  const W = view.W, H = view.H;
  ux.save();
  if (FIGHT.hurt > 0) { ux.fillStyle = `rgba(160,20,10,${0.35 * FIGHT.hurt})`; ux.fillRect(0, 0, W, H); }
  // Leben, Waffe, Magazin, Schussmodus: Ringanzeige unten rechts (seit Alpha 1.54, ui/footHud.ts; vorher ein Balken unten in der Mitte)
  drawFootRing(FIGHT.hp, FIGHT.max, FIGHT.hurt);
  ux.font = '700 11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
  for (const f of FIGHT.foes) {
    if (f.dead || !f.alert) continue;
    _p.set(f.x, f.y + 0.9, f.z).project(camera);
    if (_p.z > 1 || Math.abs(_p.x) > 1 || Math.abs(_p.y) > 1) continue;
    const x = (_p.x + 1) / 2 * W, y = (1 - _p.y) / 2 * H;
    ux.fillStyle = 'rgba(6,16,26,.7)'; ux.fillRect(x - 21, y - 3, 42, 6); ux.fillStyle = '#ff6b5b'; ux.fillRect(x - 20, y - 2, 40 * f.hp / f.max, 4);
  }
  FELD_EXTRA.hud();
  ux.textAlign = 'left'; ux.font = '600 15px Rajdhani, "IBM Plex Sans", sans-serif';
  FIGHT.msg.forEach((m, i) => { ux.globalAlpha = Math.min(1, m.life); ux.fillStyle = m.c; ux.fillText(m.t, 24, H * 0.62 + i * 20); });
  ux.restore();
}
