import * as THREE from 'three';
import { clamp } from '../core/util';
import { buildSoldier, soldierWeapon, soldierMeta, soldierGearKey, type SoldierVis } from './mineArt';

// =====================================================================================
// Eigene Spielerfigur in der Außensicht – gemeinsam für Mine, Station, Hangar, Schiffe und den Planetenboden.
// Figur und Clips: Soldat.glb aus asset-src/neu/soldier/soldat_anim.py (Mixamo-Gewehrclips, Ganzkörper übertragen).
//  - Laufen: Überblendung nach Laufrichtung relativ zum Körper (vor, vor-links, links, …, zurück). Alle Laufclips laufen
//    im selben Schrittzyklus (Phase), die Phase rückt nach Tempo ÷ Schrittlänge vor: die Füße rutschen nicht.
//  - Stehen: Gewehr gesenkt (idle); nach einem Schuss einige Sekunden im Anschlag (aim).
//  - Gangarten walk / run / sprint (je 8 Richtungen) nach Tempo, geduckt crouch_* (Taste C, STANCE.crouch), Sprung: jump.
//  - Schießen: Oberkörper-Ebene aus dem Clip fire. Tod: death_* (geduckt death_c).
//  - Drehen im Stand: der Körper folgt dem Blick erst ab einem Winkel, dann mit kleinen Seitschritten; bis dahin dreht der Oberkörper.
//  - Neigung: Oberkörper neigt sich mit dem Blick nach oben/unten.
// =====================================================================================

export const VIEW = { tp: false, dist: 2.3 };                 // tp: Außensicht (Taste V, überall zu Fuß)
try { VIEW.tp = localStorage.getItem('lf_tp') === '1'; } catch (e) { /* ohne Speicher: Ich-Sicht */ }
// Haltung zu Fuß: geduckt (Taste C) – langsamer, niedrigere Augenhöhe, eigene Clips
export const STANCE = { crouch: false };
export const crouchK = () => (STANCE.crouch ? 0.45 : 1);
export const eyeH = () => (STANCE.crouch ? 1.12 : 1.7);
export function toggleCrouch() { STANCE.crouch = !STANCE.crouch; }
export function toggleView() { VIEW.tp = !VIEW.tp; try { localStorage.setItem('lf_tp', VIEW.tp ? '1' : '0'); } catch (e) { /* egal */ } }

const UPPER = /^(spine_02|spine_03|neck_01|head|clavicle_|upperarm_|lowerarm_|hand_|thumb_|index_|middle_|ring_|pinky_)/;
const MAX_CAD = 2.3;                                           // höchstens so viele Schrittzyklen je Sekunde (darüber würde es hektisch)
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const wrap2 = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
type A = THREE.AnimationAction;
interface Loco { a: A; ang: number; stride: number; ph: number; dur: number; speed: number }
interface Gait { L: Loco[]; speed: number }                     // Gangart: walk_* oder run_* (Clipnamen), mittleres Tempo
export interface Avatar {
  s: SoldierVis; ready: boolean; gaits: Gait[]; cgait: Gait | null; idle?: A; aim?: A; cidle?: A; caim?: A; jump?: A; upAim?: A; upFire?: A; death: A[]; cdeath?: A; dying: A | null; cw: number; airW: number;
  body: number; phase: number; aimW: number; fireW: number; fireT: number; aimT: number; turning: number; first: boolean;
}
export interface Drive { x: number; y: number; z: number; yaw: number; pitch: number; vx: number; vz: number; wid?: string; fire?: boolean; combat?: boolean; dead?: boolean; crouch?: boolean; air?: boolean }

export function makeAvatar(gear: { helm?: string; anzug?: string; rucksack?: string }): Avatar | null {
  const s = buildSoldier(gear); if (!s) return null;
  return { s, ready: false, gaits: [], cgait: null, death: [], dying: null, cw: 0, airW: 0, body: 0, phase: 0, aimW: 0, fireW: 0, fireT: 0, aimT: 0, turning: 0, first: true };
}
// Figur im Halter halten; bei geänderter Ausrüstung (Helm, Anzug, Rucksack) neu bauen
export function syncAvatar(holder: THREE.Object3D, a: Avatar | null, gear: { helm?: string; anzug?: string; rucksack?: string }) {
  if (a && a.s.gearKey === soldierGearKey(gear)) { if (a.s.g.parent !== holder) holder.add(a.s.g); return a; }
  const n = makeAvatar(gear); if (!n) return a;
  if (a) { a.s.g.removeFromParent(); n.body = a.body; n.first = false; }
  holder.add(n.s.g);
  return n;
}

function setup(a: Avatar) {
  const meta = soldierMeta(); if (!meta) return;
  const m = a.s.mixer, find = (n: string) => a.s.clips.find(c => c.name === n);
  const act = (n: string, w = 0) => { const c = find(n); if (!c) return undefined; const x = m.clipAction(c); x.play(); x.setEffectiveWeight(w); return x; };
  const by: Record<string, Loco[]> = {};
  for (const [n, cm] of Object.entries(meta)) {
    if (!cm.loop || !cm.speed || !cm.dir) continue;
    const x = act(n); if (!x) continue;
    x.timeScale = 0;                                          // Zeit setzt driveAvatar selbst (gemeinsame Phase)
    (by[n.split('_')[0]] ||= []).push({ a: x, ang: Math.atan2(cm.dir[1], cm.dir[0]), stride: cm.stride || 1, ph: cm.phase || 0, dur: x.getClip().duration, speed: cm.speed });
  }
  for (const [k, L] of Object.entries(by)) {
    L.sort((p, q) => p.ang - q.ang);
    const g = { L, speed: L.reduce((t, l) => t + l.speed, 0) / L.length };
    if (k === 'crouch') a.cgait = g; else a.gaits.push(g);
  }
  a.gaits.sort((p, q) => p.speed - q.speed);
  a.idle = act('idle', 1); a.aim = act('aim'); a.cidle = act('cidle'); a.caim = act('caim'); a.jump = act('jump');
  const sub = (n: string) => {
    const c = find(n); if (!c) return undefined;
    const x = m.clipAction(new THREE.AnimationClip(n + '_oben', c.duration, c.tracks.filter(t => UPPER.test(t.name))));
    x.play(); x.setEffectiveWeight(0); return x;
  };
  a.upAim = sub('aim'); a.upFire = sub('fire');
  for (const n of ['death_f', 'death_b', 'death_r', 'death_h', 'death_c']) {
    const c = find(n); if (!c) continue; const x = m.clipAction(c); x.setLoop(THREE.LoopOnce, 1); x.clampWhenFinished = true;
    if (n === 'death_c') a.cdeath = x; else a.death.push(x);
  }
  a.ready = true;
}

const _pq = new THREE.Quaternion(), _sq = new THREE.Quaternion(), _r = new THREE.Quaternion(), _t = new THREE.Quaternion(), _ax = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _gq = new THREE.Quaternion();
export function driveAvatar(a: Avatar, dt: number, d: Drive) {
  const s = a.s;
  if (!a.ready) setup(a);
  if (d.wid) soldierWeapon(s, d.wid);
  s.g.position.set(d.x, d.y, d.z);
  if (a.first) { a.body = d.yaw; a.first = false; }
  const spd = Math.hypot(d.vx, d.vz);
  // Schießen hält die Figur einige Sekunden im Anschlag
  if (d.fire) { a.fireT = 0.35; a.aimT = 3.5; }
  a.fireT -= dt; a.aimT -= dt;
  const combat = !!d.combat || a.aimT > 0;
  // Körperdrehung: beim Laufen folgt der Körper dem Blick, im Stand erst ab einem Winkel (dann Seitschritte)
  const diff = wrap(d.yaw - a.body);
  if (d.dead) a.turning = 0;
  else if (spd > 0.4) { a.body += diff * Math.min(1, dt * 10); a.turning = 0; }
  else {
    if (!a.turning && Math.abs(diff) > (combat ? 0.4 : 0.85)) a.turning = Math.sign(diff);
    if (a.turning) { const st = Math.min(Math.abs(diff), 4.2 * dt); a.body += Math.sign(diff) * st; if (Math.abs(diff) < 0.04) a.turning = 0; }
  }
  a.body = wrap(a.body);
  s.g.rotation.y = a.body + Math.PI;
  if (a.ready) {
    // Laufen: Tempo relativ zum Körper (vor/rechts) → zwei benachbarte Richtungsclips
    const sy = Math.sin(a.body), cy = Math.cos(a.body);
    const fw = -sy * d.vx - cy * d.vz, rt = cy * d.vx - sy * d.vz;
    let move = clamp(spd / 0.5, 0, 1), ang = Math.atan2(rt, fw), cad = spd;
    if (a.turning && spd < 0.4) { move = Math.max(move, 0.55); ang = a.turning > 0 ? -Math.PI / 2 : Math.PI / 2; cad = 1.1; }
    // Stehend: Gangarten (Gehen, Rennen, Sprinten) nach Tempo; geduckt: crouch. Je Gangart die zwei Richtungsclips neben der Laufrichtung.
    a.cw += ((d.crouch && a.cgait ? 1 : 0) - a.cw) * Math.min(1, dt * 7);
    a.airW += ((d.air && a.jump ? 1 : 0) - a.airW) * Math.min(1, dt * (d.air ? 9 : 6));
    const G = a.gaits, gw = G.map(() => 0);
    if (G.length === 1) gw[0] = 1;
    else if (G.length > 1) {
      let j = 0; while (j < G.length - 2 && cad > G[j + 1].speed) j++;
      const u = clamp((cad - G[j].speed) / Math.max(0.1, G[j + 1].speed - G[j].speed), 0, 1); gw[j] = 1 - u; gw[j + 1] = u;
    }
    const sets: [Gait, number][] = G.map((g, i) => [g, gw[i] * (1 - a.cw)] as [Gait, number]);
    if (a.cgait) sets.push([a.cgait, a.cw]);
    const W = new Map<Loco, number>();
    let stride = 0;
    for (const [g, gwt] of sets) {
      const L = g.L, n = L.length; let i0 = 0, i1 = 0, t = 0;
      if (n > 1) for (let i = 0; i < n; i++) {
        const p = L[i], q = L[(i + 1) % n], span = wrap2(q.ang - p.ang) || Math.PI * 2, off = wrap2(ang - p.ang);
        if (off <= span) { i0 = i; i1 = (i + 1) % n; t = off / span; break; }
      }
      L.forEach((l, k) => W.set(l, ((k === i0 ? 1 - t : 0) + (k === i1 ? t : 0)) * gwt));
      if (n) stride += (L[i0].stride * (1 - t) + L[i1].stride * t) * gwt;
    }
    a.phase = (a.phase + dt * Math.min(cad / Math.max(0.3, stride || 1), MAX_CAD)) % 1;
    const live = d.dead ? 0 : 1, ground = 1 - a.airW;
    for (const [l, w] of W) { l.a.setEffectiveWeight(move * w * live * ground); l.a.time = ((a.phase + l.ph) % 1) * l.dur; }
    a.jump?.setEffectiveWeight(a.airW * live);
    // Stehen und Anschlag
    a.aimW += ((combat ? 1 : 0) - a.aimW) * Math.min(1, dt * 5);
    const st = (1 - move) * live * ground, cs = a.cidle ? a.cw : 0;
    a.idle?.setEffectiveWeight(st * (1 - a.aimW) * (1 - cs));
    a.aim?.setEffectiveWeight(st * a.aimW * (1 - cs));
    a.cidle?.setEffectiveWeight(st * (1 - a.aimW) * cs);
    a.caim?.setEffectiveWeight(st * a.aimW * cs);
    a.upAim?.setEffectiveWeight(move * a.aimW * 2.5 * live);
    a.fireW += ((a.fireT > 0 ? 1 : 0) - a.fireW) * Math.min(1, dt * 14);
    a.upFire?.setEffectiveWeight(a.fireW * 3 * live);
    // Tod
    if (d.dead && !a.dying && a.death.length) { a.dying = d.crouch && a.cdeath ? a.cdeath : a.death[Math.floor(Math.random() * a.death.length)]; a.dying.reset().setEffectiveWeight(1).play(); }
    if (!d.dead && a.dying) { a.dying.stop(); a.dying = null; }
  }
  s.mixer.update(dt);
  // Oberkörper: dreht zum Blick (Rest der Körperdrehung) und neigt sich mit dem Blick; verteilt auf zwei Wirbel
  if (!d.dead && s.spine && s.spine.parent) {
    s.g.updateMatrixWorld(true);
    if (s.g.parent) s.g.parent.getWorldQuaternion(_gq); else _gq.identity();
    const tw = wrap(d.yaw - a.body), right = _ax.set(Math.cos(d.yaw), 0, -Math.sin(d.yaw)).applyQuaternion(_gq), up = _up.set(0, 1, 0).applyQuaternion(_gq);
    for (const [b, k] of [[s.spine2, 0.45], [s.spine, 0.55]] as [THREE.Object3D | null, number][]) {
      if (!b || !b.parent) continue;
      b.parent.getWorldQuaternion(_pq); b.getWorldQuaternion(_sq);
      _r.setFromAxisAngle(up, tw * k); _t.setFromAxisAngle(right, d.pitch * 0.8 * k);
      b.quaternion.copy(_pq.invert().multiply(_t.multiply(_r).multiply(_sq)));
      b.updateMatrixWorld(true);
    }
  }
}

// Kamera der Außensicht: über der rechten Schulter, Blick wie in der Ich-Sicht. clear(x, y, z) meldet, ob dort Platz ist;
// die Kamera rückt bis vor das erste Hindernis vor (sofort), zurück geht sie weich.
let camD = -1;
export function tpCamPos(out: THREE.Vector3, x: number, y: number, z: number, yaw: number, pitch: number, clear: (x: number, y: number, z: number) => boolean, dt = 1 / 60) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const fx = -sy * cp, fy = sp, fz = -cy * cp;
  let side = 0.45, px = x + cy * side, pz = z - sy * side;
  const py = y + (STANCE.crouch ? 1.25 : 1.7);
  if (!clear(px, py, pz)) { side = 0; px = x; pz = z; }
  let want = VIEW.dist;
  for (let t = 0.2; t <= VIEW.dist; t += 0.1) if (!clear(px - fx * t, py - fy * t, pz - fz * t)) { want = Math.max(0.3, t - 0.15); break; }
  camD = camD < 0 || want < camD ? want : camD + (want - camD) * Math.min(1, dt * 4);
  out.set(px - fx * camD, py - fy * camD + 0.08, pz - fz * camD);
}
export function resetTpCam() { camD = -1; }
