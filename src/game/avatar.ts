import * as THREE from 'three';
import { clamp } from '../core/util';
import { buildSoldier, soldierWeapon, soldierMeta, soldierGearKey, viewModelId, normLook, type SoldierVis, type FigGear } from './mineArt';
import { driveManny, releaseManny, mannyPace, mannyBrake, mannyAccel, mannyTurn, mannyMuzzle, mannyReady, mannyFirstPerson, mannyHooks } from './mannyAvatar';
import { TEIL_PLATZ, normFigur, type Tracht } from './figur';
import { gearDef, WEAR_SLOTS } from '../data/gear';
// Ich-Sicht mit ganzem Körper (mannyAvatar.ts): bodyView() = die Figur ist dafür bereit; fpBody(Kamera, Zielen 0..1) nach dem Setzen der Kamera
export const bodyView = mannyReady, fpBody = mannyFirstPerson;
// Richtungswechsel im Lauf: Zeit seit dem letzten Wechsel der gewünschten Laufrichtung um mehr als 50° (setIntent zählt mit).
// Mit der neuen Spielerfigur setzt die Beschleunigung danach weich ein (mannyTurn): Ein Mensch muss erst einen Fuß aufsetzen,
// bevor sein Körper die Richtung ändert – so passt der Setzschritt der Figur zur Bewegung des Spiels.
const TURN = { t: 9, x: 0, z: 0 };
export const footAccel = (base: number) => mannyAccel(base) * mannyTurn(TURN.t);   // Anlaufrate beim Drücken der Lauftasten (1/s)
export const footBrake = mannyBrake;   // Bremsrate nach dem Loslassen der Lauftasten (1/s)
import { P } from './state';
import { aimK } from './footgun';
import { LYRA_ITEM, LYRA_OF_VM } from './lyraGuns';
import { FremdFigur } from './fremdFigur';
// Eigene Figur: angelegte Ausrüstung plus das gewählte Aussehen (seit 2026-11-20)
export const figGear = (): FigGear => ({ ...(P.gear || {}), look: normLook(P.look) });
// Neue Spielerfigur (figur.ts): gewählte Figur und die Teile, die zur angelegten Ausrüstung gehören
export function trachtOf(figur: unknown, gear?: Record<string, string | undefined> | null): Tracht {
  const t: Tracht = { figur: normFigur(figur), teile: {} };
  for (const s of WEAR_SLOTS) { const teil = gearDef(gear?.[s] || '')?.teil; if (teil && TEIL_PLATZ[teil]) t.teile[TEIL_PLATZ[teil]] = teil; }
  return t;
}
export const figTracht = () => trachtOf(P.figur, P.gear);
mannyHooks.tracht = figTracht;

// =====================================================================================
// Eigene Spielerfigur in der Außensicht – gemeinsam für Mine, Station, Hangar, Schiffe und den Planetenboden.
// Figur und Clips: Soldat.glb aus asset-src/neu/soldier/soldat_anim.py (Mixamo-Gewehrclips, Ganzkörper übertragen).
//  - Laufen: Überblendung nach Laufrichtung relativ zum Körper (vor, vor-links, links, …, zurück). Alle Laufclips laufen
//    im selben Schrittzyklus (Phase), die Phase rückt nach Tempo ÷ Schrittlänge vor: die Füße rutschen nicht.
//  - Stehen: Gewehr gesenkt (idle); nach einem Schuss einige Sekunden im Anschlag (aim). Mit der SMG ist der Anschlag s_aim (Idle-Aim aus
//    Cascadeur, vom Spieler animiert, seit 2026-11-19): Die Waffe liegt dann so, wie der Clip sie hält.
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
// Lauftempo zu Fuß (m/s, ohne Ausrüstungsfaktor) für die Tasten f (vor/zurück) und s (rechts/links). Ohne Manny das Tempo der Laufstelle
// (normal bzw. sprint, geduckt × 0,45). Mit Manny (?manny=1) das Tempo seiner Bewegungen, damit die Füße nicht rutschen (mannyAvatar.ts).
export function footPace(f: number, s: number, run: boolean, normal: number, sprint: number) {
  return mannyPace(f, s, run && !STANCE.crouch, STANCE.crouch) ?? (run && !STANCE.crouch ? sprint : normal) * crouchK();
}
// Absicht der eigenen Figur in diesem Bild: gewünschte Laufrichtung (Raumkoordinaten) und Sprinten. Die Laufstelle setzt sie in jedem Bild
// vor driveAvatar; driveAvatar verbraucht sie (ohne neue Angabe gilt: stehen). Manny startet und stoppt damit sofort mit den Tasten.
const INTENT = { mx: 0, mz: 0, sprint: false };
export function setIntent(yaw: number, f: number, s: number, run: boolean, dt = 0) {
  const sy = Math.sin(yaw), cy = Math.cos(yaw);
  INTENT.mx = -sy * f + cy * s; INTENT.mz = -cy * f - sy * s; INTENT.sprint = run && !STANCE.crouch && (f !== 0 || s !== 0);
  const l = Math.hypot(INTENT.mx, INTENT.mz);
  if (l > 0.1) {
    const x = INTENT.mx / l, z = INTENT.mz / l;
    if ((TURN.x || TURN.z) && x * TURN.x + z * TURN.z < 0.64) TURN.t = 0;      // cos 50°
    TURN.x = x; TURN.z = z;
  } else { TURN.x = TURN.z = 0; TURN.t = 9; }                                   // aus dem Stand ist kein Wechsel
  TURN.t += dt;
}
export const eyeH = () => (STANCE.crouch ? 1.12 : 1.7);
export function toggleCrouch() { STANCE.crouch = !STANCE.crouch; }
export function toggleView() { VIEW.tp = !VIEW.tp; try { localStorage.setItem('lf_tp', VIEW.tp ? '1' : '0'); } catch (e) { /* egal */ } }
// Ereignisse der eigenen Figur (zählen hoch): Treffer → Zucken, Schüsse → Anschlag. Gehen auch ins Netz.
// air / dead: Sprung bzw. gefallen (für Mitspieler, netFlags); t: wann zuletzt gemeldet (die eigene Figur meldet sich in driveAvatar)
export const ACT = { hit: 0, shot: 0, toss: 0, air: false, dead: false, t: 0 };
export function noteFoot(air: boolean, dead: boolean) { ACT.air = air; ACT.dead = dead; ACT.t = performance.now(); }
export function noteToss() { ACT.toss++; }      // Granate geworfen (granate.ts)
export function flinch() { ACT.hit++; }
export function noteShot() { ACT.shot++; }
// Netzfeld g[4]: drei Zeichen [geduckt 0/1][Treffer mod 10][Schüsse mod 10]
// vierte Stelle seit 24.11.2026: 0 am Boden, 1 im Sprung, 2 gefallen (ältere Spiele lesen nur die ersten drei)
export const netFlags = () => (STANCE.crouch ? '1' : '0') + (ACT.hit % 10) + (ACT.shot % 10) + (performance.now() - ACT.t > 600 ? '0' : ACT.dead ? '2' : ACT.air ? '1' : '0');
export interface NetAct { crouch: boolean; hit: number; fire: number; fl: string; shots?: number; air?: boolean; dead?: boolean }      // shots: Schüsse gezählt (für den Rückstoß der neuen Figur)
export function readNetFlags(n: NetAct, s?: string | null) {
  if (!s || s.length < 3) return;
  n.crouch = s[0] === '1';
  n.air = s[3] === '1'; n.dead = s[3] === '2';
  if (n.fl && s[1] !== n.fl[1]) n.hit++;
  if (n.fl && s[2] !== n.fl[2]) { n.fire = 0.25; n.shots = (n.shots || 0) + ((+s[2] - +n.fl[2] + 10) % 10 || 1); }
  n.fl = s;
}
// Linke Hand am Vorderschaft: Anteil der Strecke Griff → Mündung, dann oben (−: darunter) und zur linken Seite, in Metern
const GRIP: Record<string, [number, number, number]> = {
  ar39: [0.42, -0.058, 0.05], k12: [0.58, -0.045, 0.03], ig3: [0.55, -0.045, 0.03], ef2: [0.6, -0.045, 0.03], sw: [0.5, -0.045, 0.035],
  p9: [0.05, -0.07, 0.06],                                     // Pistole: die linke Hand stützt die rechte von unten
  smg: [0.493, 0.022, -0.072],                                  // SMG: gemessen im Cascadeur-Clip s_aim (soldat_clip_neu.py, grip_left in soldat_tp.json)
};

const UPPER = /^(spine_02|spine_03|neck_01|head|clavicle_|upperarm_|lowerarm_|hand_|thumb_|index_|middle_|ring_|pinky_)/;
const MAX_CAD = 2.3;                                           // höchstens so viele Schrittzyklen je Sekunde (darüber würde es hektisch)
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const wrap2 = (a: number) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
type A = THREE.AnimationAction;
interface Loco { a: A; ang: number; stride: number; ph: number; dur: number; speed: number }
interface Gait { L: Loco[]; speed: number }                     // Gangart: walk_* oder run_* (Clipnamen), mittleres Tempo
export interface Avatar {
  s: SoldierVis; ready: boolean; gaits: Gait[]; cgait: Gait | null; idle?: A; aim?: A; saim?: A; upSAim?: A; sW: number; cidle?: A; caim?: A; jump?: A; upAim?: A; upFire?: A; upReload?: A; reloadW: number; relL?: THREE.Vector3; death: A[]; cdeath?: A; dying: A | null; cw: number; airW: number;
  body: number; phase: number; aimW: number; fireW: number; fireT: number; aimT: number; turning: number; first: boolean;
  hitN: number; hitT: number; hitS: number; armL: THREE.Object3D[] | null;
  player?: boolean;                                            // eigene Spielerfigur: darf die Testfigur Manny zeigen (mannyAvatar.ts, ?manny=1)
  // fremde Figur (Mitspieler, Wache): tracht = was sie trägt; dann zeigt fremd (fremdFigur.ts) die neue Figur statt des Soldaten
  tracht?: Tracht | null; fremd?: FremdFigur | null;
}
export interface Drive { aimAt?: THREE.Vector3 | null; vorFit?: () => void; x: number; y: number; z: number; yaw: number; pitch: number; vx: number; vz: number; wid?: string; fire?: boolean; combat?: boolean; dead?: boolean; crouch?: boolean; air?: boolean; hit?: number; reload?: number; ground?: ((x: number, z: number) => number | null) | null; armed?: boolean; ads?: boolean; fp?: boolean; shots?: number }   // ads: Zielen gehalten (rechte Maustaste) · reload: Fortschritt 0..1, sonst −1 · armed: hier kann geschossen werden (Planet, Mine) – die neue Spielerfigur trägt dann die Waffe wid

export function makeAvatar(gear: FigGear, player = false): Avatar | null {
  const s = buildSoldier(gear); if (!s) return null;
  const arm = ['upperarm_l', 'lowerarm_l', 'hand_l'].map(n => s.root.getObjectByName(n));
  return { s, ready: false, sW: 0, reloadW: 0, gaits: [], cgait: null, death: [], dying: null, cw: 0, airW: 0, body: 0, phase: 0, aimW: 0, fireW: 0, fireT: 0, aimT: 0, turning: 0, first: true,
    hitN: -1, hitT: 0, hitS: 1, armL: arm.every(Boolean) ? arm as THREE.Object3D[] : null, player };
}
// Figur im Halter halten; bei geänderter Ausrüstung (Helm, Anzug, Rucksack) neu bauen. player: die eigene Figur (sonst ein Mitspieler –
// bis 24.11.2026 bekamen auch Mitspieler player = true und zogen die eigene neue Figur zu sich herüber)
export function syncAvatar(holder: THREE.Object3D, a: Avatar | null, gear: FigGear, player = true) {
  if (a && a.s.gearKey === soldierGearKey(gear)) { if (a.s.g.parent !== holder) holder.add(a.s.g); return a; }
  const n = makeAvatar(gear, player); if (!n) return a;
  if (a) { if (player) releaseManny(); a.s.g.removeFromParent(); n.body = a.body; n.first = false; n.tracht = a.tracht; n.fremd = a.fremd; a.fremd = null; }
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
  a.idle = act('idle', 1); a.aim = act('aim'); a.cidle = act('cidle'); a.caim = act('caim'); a.jump = act('jump'); a.saim = act('s_aim');
  const sub = (n: string) => {
    const c = find(n); if (!c) return undefined;
    const x = m.clipAction(new THREE.AnimationClip(n + '_oben', c.duration, c.tracks.filter(t => UPPER.test(t.name))));
    x.play(); x.setEffectiveWeight(0); return x;
  };
  a.upAim = sub('aim'); a.upFire = sub('fire'); a.upSAim = sub('s_aim');
  a.upReload = sub('reload'); if (a.upReload) a.upReload.timeScale = 0;   // Nachladen (Mixamo „Reloading“, seit Alpha 1.55): Zeit setzt driveAvatar nach dem Magazin
  for (const n of ['death_f', 'death_b', 'death_r', 'death_h', 'death_c']) {
    const c = find(n); if (!c) continue; const x = m.clipAction(c); x.setLoop(THREE.LoopOnce, 1); x.clampWhenFinished = true;
    if (n === 'death_c') a.cdeath = x; else a.death.push(x);
  }
  a.ready = true;
}

const _pq = new THREE.Quaternion(), _sq = new THREE.Quaternion(), _r = new THREE.Quaternion(), _t = new THREE.Quaternion(), _ax = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0), _gq = new THREE.Quaternion();
export function driveAvatar(a: Avatar, dt: number, d: Drive) {
  const s = a.s;
  if (a.player) noteFoot(!!d.air, !!d.dead);
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
  // Mitspieler und Wachen: die neue Figur mit ihrer Ausrüstung (fremdFigur.ts); solange sie lädt, der Soldat
  if (!a.player && a.tracht) {
    const f = a.fremd || (a.fremd = new FremdFigur());
    const weapon = d.armed && d.wid ? { id: d.wid, lyra: LYRA_OF_VM[d.wid], aim: combat || !!d.ads, shots: d.shots ?? 0, hits: d.hit ?? 0, reload: d.reload ?? -1 } : null;
    if (f.drive(s.g, s.root, dt, { x: d.x, y: d.y, z: d.z, yaw: d.yaw, pitch: d.pitch, vx: d.vx, vz: d.vz, crouch: d.crouch, dead: d.dead, air: d.air, ground: d.ground, tracht: a.tracht, weapon })) return;
    s.root.visible = true;
  }
  // Testfigur Manny (?manny=1): eigene Bewegungslogik, der Soldat bleibt unsichtbar im Halter
  if (a.player) {
    const mx = INTENT.mx, mz = INTENT.mz, sprint = INTENT.sprint; INTENT.mx = INTENT.mz = 0; INTENT.sprint = false;
    const weapon = d.armed && d.wid ? { id: d.wid, lyra: LYRA_ITEM[P.gear?.waffe || ''], aim: d.fp ? !!d.ads : combat || !!d.ads, shots: ACT.shot, hits: ACT.hit, toss: ACT.toss, reload: d.reload ?? -1 } : null;
    if (driveManny(s.g, s.root, dt, { x: d.x, y: d.y, z: d.z, yaw: d.yaw, pitch: d.pitch, vx: d.vx, vz: d.vz, crouch: d.crouch, air: d.air, mx, mz, sprint, ground: d.ground, dead: !!d.dead, weapon, fp: d.fp, aimAt: d.aimAt, vorFit: d.vorFit })) return;
    if (d.fp) { s.root.visible = false; return; }      // Ich-Sicht ohne die neue Figur: keinen Soldaten um die Kamera zeigen
    if (!s.root.visible) releaseManny(s.root);   // Schalter aus oder Figur nicht geladen: wieder der Soldat
  }
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
    const st = (1 - move) * live * ground, cs = a.cidle ? a.cw : 0, sA = s.wid === 'smg' && a.saim ? 1 : 0;   // SMG: eigener Anschlag (Idle-Aim aus Cascadeur)
    a.idle?.setEffectiveWeight(st * (1 - a.aimW) * (1 - cs));
    a.aim?.setEffectiveWeight(st * a.aimW * (1 - cs) * (1 - sA));
    a.sW = st * a.aimW * (1 - cs) * sA; a.saim?.setEffectiveWeight(a.sW);
    a.cidle?.setEffectiveWeight(st * (1 - a.aimW) * cs);
    a.caim?.setEffectiveWeight(st * a.aimW * cs);
    a.upAim?.setEffectiveWeight(move * a.aimW * 2.5 * live * (1 - a.reloadW) * (1 - sA));
    a.upSAim?.setEffectiveWeight(move * a.aimW * 2.5 * live * (1 - a.reloadW) * sA);
    a.fireW += ((a.fireT > 0 ? 1 : 0) - a.fireW) * Math.min(1, dt * 14);
    a.upFire?.setEffectiveWeight(a.fireW * 3 * live * (1 - a.reloadW));
    // Nachladen: Oberkörper-Clip, über die Nachladezeit der Waffe gestreckt (footgun.ts); verdrängt Anschlag und Schuss
    const rl = d.reload !== undefined && d.reload >= 0 ? d.reload : -1;
    a.reloadW += ((rl >= 0 ? 1 : 0) - a.reloadW) * Math.min(1, dt * 10);
    if (a.upReload) { a.upReload.setEffectiveWeight(a.reloadW * 4 * live); if (rl >= 0) a.upReload.time = Math.min(0.999, rl) * a.upReload.getClip().duration; }
    // Tod
    if (d.dead && !a.dying && a.death.length) { a.dying = d.crouch && a.cdeath ? a.cdeath : a.death[Math.floor(Math.random() * a.death.length)]; a.dying.reset().setEffectiveWeight(1).play(); }
    if (!d.dead && a.dying) { a.dying.stop(); a.dying = null; }
  }
  s.mixer.update(dt);
  // Treffer: kurzes Zucken nach hinten und zur Seite (schnell hin, langsam zurück)
  if (d.hit !== undefined && d.hit !== a.hitN) { if (a.hitN >= 0 && a.hitT < 0.2) { a.hitT = 0.5; a.hitS = Math.random() < 0.5 ? -1 : 1; } a.hitN = d.hit; }
  a.hitT = Math.max(0, a.hitT - dt);
  const fl = flinchK(a);
  // Oberkörper: dreht zum Blick (Rest der Körperdrehung) und neigt sich mit dem Blick; verteilt auf zwei Wirbel
  s.g.updateMatrixWorld(true);
  if (s.g.parent) s.g.parent.getWorldQuaternion(_gq); else _gq.identity();
  if (!d.dead && s.spine && s.spine.parent) {
    const tw = wrap(d.yaw - a.body) + fl * 0.22 * a.hitS, right = _ax.set(Math.cos(d.yaw), 0, -Math.sin(d.yaw)).applyQuaternion(_gq), up = _up.set(0, 1, 0).applyQuaternion(_gq);
    for (const [b, k] of [[s.spine2, 0.45], [s.spine, 0.55]] as [THREE.Object3D | null, number][]) {
      if (!b || !b.parent) continue;
      b.parent.getWorldQuaternion(_pq); b.getWorldQuaternion(_sq);
      _r.setFromAxisAngle(up, tw * k); _t.setFromAxisAngle(right, (d.pitch * 0.8 + fl * 0.3) * k);
      b.quaternion.copy(_pq.invert().multiply(_t.multiply(_r).multiply(_sq)));
      b.updateMatrixWorld(true);
    }
  }
  if (!d.dead && a.ready) gripWeapon(a, d);
}

/** Mündung der Waffe der eigenen Figur in der Außensicht (Weltkoordinaten) für Leuchtspur und Mündungsfeuer; null ohne sichtbare Waffe */
export function avatarMuzzle(a: Avatar | null): THREE.Vector3 | null {
  if (!a) return null;
  const out = new THREE.Vector3();
  if (a.player && !a.s.root.visible) return mannyMuzzle(out) ? out : null;      // die neue Figur führt (der Soldat steht unsichtbar still)
  if (a.fremd && !a.s.root.visible) return a.fremd.muzzle(out) ? out : null;
  return a.s.weapon ? a.s.weapon.localToWorld(out.copy(a.s.muzzle)) : null;
}
// Stärke des Treffer-Zuckens 0..1 (schnell hin, langsam zurück)
const flinchK = (a: Avatar) => { if (a.hitT <= 0) return 0; const u = 1 - a.hitT / 0.5; return u < 0.2 ? u / 0.2 : (1 - u) / 0.8; };
// Waffe im Anschlag auf die Blickrichtung drehen (am rechten Handgelenk) und die linke Hand an den Vorderschaft legen
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _v4 = new THREE.Vector3(), _v5 = new THREE.Vector3(), _v6 = new THREE.Vector3(), _v7 = new THREE.Vector3();
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _qh = new THREE.Quaternion();
function rotW(b: THREE.Object3D, q: THREE.Quaternion) {            // Knochen um q drehen (Drehung in Weltachsen)
  b.parent!.getWorldQuaternion(_pq); b.getWorldQuaternion(_sq);
  b.quaternion.copy(_pq.invert().multiply(_t.copy(q).multiply(_sq))); b.updateMatrixWorld(true);
}
// Waffe über das rechte Handgelenk so drehen, dass ihr Lauf (−z) in Richtung dir zeigt und ihre Oberseite (+y) möglichst nach oben (Gewicht wt)
const _m4 = new THREE.Matrix4(), _zero = new THREE.Vector3(), _wup = new THREE.Vector3(0, 1, 0), _q3 = new THREE.Quaternion();
function orientWeapon(hand: THREE.Object3D, w: THREE.Object3D, dir: THREE.Vector3, wt: number) {
  w.getWorldQuaternion(_q1);
  _m4.lookAt(_zero, dir, Math.abs(dir.y) > 0.97 ? _v7.set(0, 0, 1) : _wup);   // Matrix4.lookAt: −z zeigt zum Ziel
  _q3.setFromRotationMatrix(_m4);
  _q2.copy(_q3).multiply(_q1.invert());                                         // Drehung in Weltachsen: von jetzt nach Soll
  _q1.identity().slerp(_q2, wt);
  rotW(hand, _q1);
}
function gripWeapon(a: Avatar, d: Drive) {
  const s = a.s, w = s.weapon, hand = s.hand;
  if (!w || !hand || !hand.parent) return;
  const k = a.aimW * (1 - a.airW) * (1 - a.reloadW);   // beim Nachladen führt der Clip die Waffe
  // 0) Außerhalb des Anschlags (seit Alpha 1.55): Das Gewehr liegt auf der Linie von der rechten zur linken Hand, wie der Clip es hält.
  //    Die Lage der Waffe an der rechten Hand stammt aus dem Zielclip (soldat_anim.py, weapon_rels); in Ruhe, beim Gehen und Laufen halten die
  //    Mixamo-Hände das Gewehr anders, es stand deshalb um 70 bis 90 Grad verdreht. Die Pistole: schräg nach unten vor dem Körper.
  //    Dazu die Drehung um die Laufachse: Oberseite nach oben (vorher blieb die Rolle aus dem Handgelenk stehen).
  const lk = (1 - k) * (1 - a.airW * 0.5) * (1 - a.sW);   // SMG im Anschlag: der Clip hält die Waffe richtig, nicht nachdrehen
  if (lk > 0.01) {
    if (s.wid === 'p9') { const by = a.body, dn = 0.9; _v2.set(-Math.sin(by) * Math.cos(dn), -Math.sin(dn), -Math.cos(by) * Math.cos(dn)).applyQuaternion(_gq); }
    else if (a.armL) {
      // Beim Nachladen greift die linke Hand ans Magazin: dann gilt die Lage der linken Hand von kurz vorher (relativ zur rechten Hand gemerkt)
      a.armL[2].getWorldPosition(_v2);
      if (a.reloadW < 0.02 || !a.relL) a.relL = hand.worldToLocal((a.relL || new THREE.Vector3()).copy(_v2));
      else hand.localToWorld(_v2.copy(a.relL));
      _v2.sub(hand.getWorldPosition(_v1));
    }
    else _v2.set(0, 0, 0);
    if (_v2.lengthSq() > 1e-4) orientWeapon(hand, w, _v2.normalize(), lk);
  }
  // 1) Anschlag: Laufrichtung der Waffe (−z) auf den Blick, Oberseite nach oben
  if (k > 0.01) {
    const pp = d.pitch + flinchK(a) * 0.35, cp = Math.cos(pp);
    orientWeapon(hand, w, _v2.set(-Math.sin(d.yaw) * cp, Math.sin(pp), -Math.cos(d.yaw) * cp).applyQuaternion(_gq).normalize(), k);
  }
  // 2) Linke Hand: Zwei-Knochen-IK (Oberarm, Unterarm), Ellbogen bleibt auf seiner Seite, die Hand behält ihre Drehung
  if (!a.armL) return;
  const [ua, la, hd] = a.armL, g = GRIP[s.wid] || GRIP.k12;
  w.getWorldQuaternion(_q1);
  const hp = hand.getWorldPosition(_v1), mz = w.localToWorld(_v2.copy(s.muzzle));
  const fwd = _v3.set(0, 0, -1).applyQuaternion(_q1), L = _v4.copy(mz).sub(hp).dot(fwd);
  const T = _v5.copy(hp).addScaledVector(fwd, L * g[0]).addScaledVector(_v4.set(0, 1, 0).applyQuaternion(_q1), g[1]).addScaledVector(_v6.set(1, 0, 0).applyQuaternion(_q1), g[2]);
  const S = ua.getWorldPosition(_v1), E = la.getWorldPosition(_v2), H = hd.getWorldPosition(_v3); hd.getWorldQuaternion(_qh);
  T.lerp(H, Math.max(a.airW * 0.6, a.reloadW));   // im Sprung locker, beim Nachladen greift die linke Hand ans Magazin (Clip)
  const l1 = S.distanceTo(E), l2 = E.distanceTo(H), u = _v4.copy(T).sub(S); let dl = u.length(); if (dl < 1e-4) return;
  u.divideScalar(dl); dl = clamp(dl, Math.abs(l1 - l2) + 0.01, l1 + l2 - 0.003);
  const pe = _v6.copy(E).sub(S); pe.addScaledVector(u, -pe.dot(u)); if (pe.lengthSq() < 1e-8) pe.set(0, -1, 0); pe.normalize();
  const ca = clamp((l1 * l1 + dl * dl - l2 * l2) / (2 * l1 * dl), -1, 1), sa = Math.sqrt(1 - ca * ca);
  const E2 = _v7.copy(S).addScaledVector(u, l1 * ca).addScaledVector(pe, l1 * sa);
  _q2.setFromUnitVectors(E.sub(S).normalize(), E2.sub(S).normalize()); rotW(ua, _q2);
  la.getWorldPosition(_v2); hd.getWorldPosition(_v3);
  const T2 = _v5.copy(S).addScaledVector(u, dl);
  _q2.setFromUnitVectors(_v3.sub(_v2).normalize(), T2.sub(_v2).normalize()); rotW(la, _q2);
  hd.parent!.getWorldQuaternion(_pq); hd.quaternion.copy(_pq.invert().multiply(_qh)); hd.updateMatrixWorld(true);
}

// Mitspieler als Figur: Zielwerte (aus dem Netz) weich nachführen, Tempo aus der Bewegung, gleiche Clips wie die eigene Figur
export interface RemoteFig extends NetAct { ohneWaffe?: boolean; av: Avatar | null; x: number; y: number; z: number; tx: number; ty: number; tz: number; yaw: number; vx: number; vz: number; gear: FigGear; wid: string; init: boolean; tracht: Tracht | null }
export const newRemoteFig = (): RemoteFig => ({ av: null, x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, yaw: 0, vx: 0, vz: 0, gear: {}, wid: 'k12', init: false, crouch: false, hit: 0, fire: 0, fl: '', tracht: null });
// Netzfeld g: [Helm, Anzug, Rucksack, Waffe, Haltung/Ereignisse, Aussehen „Kopf,Farbe“, Figur, Weste, Handschuhe, Stiefel]
// (Aussehen seit 2026-11-20, Figur und die drei Teile seit 2026-11-24; fehlen sie – älteres Spiel –, gilt Figur 1 mit Helm und Anzug)
export const lookToNet = () => { const l = normLook(P.look); return l.kopf + ',' + l.farbe; };
export function gearFromNet(g: string[] | null | undefined) {
  const lk = String(g?.[5] || '').split(','), look = normLook({ kopf: +lk[0], farbe: +lk[1] });
  const tracht = trachtOf(g?.[6] ? +g[6] : 1, { helm: g?.[0], anzug: g?.[1], weste: g?.[7], handschuh: g?.[8], stiefel: g?.[9] });
  return { gear: { helm: g?.[0] || undefined, anzug: g?.[1] || undefined, rucksack: g?.[2] || undefined, look } as FigGear, wid: g?.[3] || viewModelId(), tracht };
}
export function driveRemote(holder: THREE.Object3D, f: RemoteFig, dt: number) {
  f.av = syncAvatar(holder, f.av, f.gear, false);
  if (!f.av) return;
  f.av.tracht = f.tracht;
  if (!f.init) { f.x = f.tx; f.y = f.ty; f.z = f.tz; f.init = true; f.av.body = f.yaw; f.av.first = false; }
  const k = Math.min(1, dt * 10), ox = f.x, oz = f.z;
  f.x += (f.tx - f.x) * k; f.y += (f.ty - f.y) * k; f.z += (f.tz - f.z) * k;
  const ivx = (f.x - ox) / Math.max(dt, 1e-3), ivz = (f.z - oz) / Math.max(dt, 1e-3), kv = Math.min(1, dt * 6);
  f.vx += (ivx - f.vx) * kv; f.vz += (ivz - f.vz) * kv;
  f.fire -= dt;
  driveAvatar(f.av, dt, { x: f.x, y: f.y, z: f.z, yaw: f.yaw, pitch: 0, vx: Math.abs(f.vx) < 0.05 ? 0 : f.vx, vz: Math.abs(f.vz) < 0.05 ? 0 : f.vz, wid: f.wid, crouch: f.crouch, hit: f.hit, fire: f.fire > 0, shots: f.shots, armed: !f.ohneWaffe, air: f.air, dead: f.dead });      // Planet und Mine: bewaffnet (außenbord ohne Waffe)
}
/** fremde Figur abbauen (Mitspieler weg, Stadt verlassen): auch die neue Figur freigeben */
export function freeAvatar(a: Avatar) { a.fremd?.dispose(); a.fremd = null; a.s.g.removeFromParent(); }
export function dropRemote(f: RemoteFig) { if (f.av) freeAvatar(f.av); f.av = null; f.init = false; }

// Kamera der Außensicht: über der rechten Schulter, Blick wie in der Ich-Sicht. clear(x, y, z) meldet, ob dort Platz ist;
// die Kamera rückt bis vor das erste Hindernis vor (sofort), zurück geht sie weich.
let camD = -1;
export function tpCamPos(out: THREE.Vector3, x: number, y: number, z: number, yaw: number, pitch: number, clear: (x: number, y: number, z: number) => boolean, dt = 1 / 60) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  const fx = -sy * cp, fy = sp, fz = -cy * cp;
  const ak = aimK(), D = VIEW.dist * (1 - 0.36 * ak);      // Zielen (footgun.ts): näher heran und weiter über die Schulter
  let side = 0.45 + 0.13 * ak, px = x + cy * side, pz = z - sy * side;
  const py = y + (STANCE.crouch ? 1.25 : 1.7);
  if (!clear(px, py, pz)) { side = 0; px = x; pz = z; }
  let want = D;
  for (let t = 0.2; t <= D; t += 0.1) if (!clear(px - fx * t, py - fy * t, pz - fz * t)) { want = Math.max(0.3, t - 0.15); break; }
  camD = camD < 0 || want < camD ? want : camD + (want - camD) * Math.min(1, dt * 4);
  out.set(px - fx * camD, py - fy * camD + 0.08, pz - fz * camD);
}
export function resetTpCam() { camD = -1; }
