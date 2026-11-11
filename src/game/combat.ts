import * as THREE from 'three';
import { scene, camera, basicAdd, glowMat } from '../core/engine';
import { rand, ri, pick, d3, clamp, rng, hashStr } from '../core/util';
import { snd, sfx, boom } from '../core/audio';
import { DRONE_T, BOMBER_T, buildMother } from '../models/ferrox';
import { MK } from '../models/ships';
import { world, dropPick, breakAst, SECTOR_RADIUS } from './world';
import { burst, puff } from './fx';
import { P, G, stats } from './state';
import { hurtPlayer, playerTargetable } from './player';
import { damageTraffic, damageAlly } from './npc';
import { radio } from '../ui/radio';
import { SHARED, hostEvent } from './shared';
import { addRep, killFaction, bountyFactor } from './reputation';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

// ---------------- Geschosse ----------------
const TRACER_GEO = new THREE.BoxGeometry(0.3, 0.3, 7);
const BUL_M: Record<string, THREE.Material> = { p: basicAdd(0xffd27a), w: basicAdd(0xfff0b0), e: basicAdd(0xc070ff) };
// Triebwerksspur der Ferrox: Kegel nach hinten (−Z), 28 m lang
const TRAIL_GEO = (() => { const c = new THREE.ConeGeometry(1.3, 28, 8, 1, true); c.rotateX(-Math.PI / 2); c.translate(0, 0, -14); return c; })();
const TORP_GEO = new THREE.SphereGeometry(1.6, 10, 8), TORP_M = new THREE.MeshBasicMaterial({ color: 0xc070ff });
export const ROCKET_GEO = new THREE.CylinderGeometry(0.2, 0.2, 1.8, 6);

export function fireBullet(list: any[], x: number, y: number, z: number, dx: number, dy: number, dz: number, speed: number, life: number, dmg: number, kind: string, extra?: any) {
  const m = new THREE.Mesh(TRACER_GEO, BUL_M[kind]);
  m.position.set(x, y, z);
  m.lookAt(x + dx, y + dy, z + dz);
  scene.add(m);
  const b = { x, y, z, px: x, py: y, pz: z, vx: dx * speed, vy: dy * speed, vz: dz * speed, life, dmg, kind, mesh: m };
  if (extra) Object.assign(b, extra);
  // Gastgeber: Feindschüsse und Schüsse der Patrouillen für die Mitspieler mitschreiben
  if (list === world.ebullets && SHARED.online && !SHARED.client && !(extra && extra.remote)) SHARED.shots.push([Math.round(x), Math.round(y), Math.round(z), Math.round(b.vx), Math.round(b.vy), Math.round(b.vz), life, (b as any).dmgP || 0, 0]);
  if (list === world.bullets && kind === 'w' && SHARED.online && !SHARED.client && !(extra && extra.remote)) SHARED.ashots.push([Math.round(x), Math.round(y), Math.round(z), Math.round(b.vx), Math.round(b.vy), Math.round(b.vz), life]);
  list.push(b);
  return b;
}
export function segHit(b: any, cx: number, cy: number, cz: number, r: number) {
  const dx = b.x - b.px, dy = b.y - b.py, dz = b.z - b.pz, l2 = dx * dx + dy * dy + dz * dz || 1;
  const t = clamp(((cx - b.px) * dx + (cy - b.py) * dy + (cz - b.pz) * dz) / l2, 0, 1);
  return d3(b.px + dx * t, b.py + dy * t, b.pz + dz * t, cx, cy, cz) < r;
}
// Trifft ein Geschoss ein Großobjekt mit Kollisionskugeln (Station, Zivilschiff)?
export function sphSeg(b: any, o: { x: number; y: number; z: number; sph: number[][]; R: number }) {
  if (d3(b.x, b.y, b.z, o.x, o.y, o.z) > o.R + 40) return false;
  for (const s of o.sph) if (segHit(b, o.x + s[0], o.y + s[1], o.z + s[2], s[3])) return true;
  return false;
}

// ---------------- Ferrox ----------------
const BOUNTY = { drone: 15, bomber: 45, mother: 600 };
const KILL_REP = { drone: 2, bomber: 5, mother: 40 };
// Kopfgeld (Grenzwacht-Rang erhöht es) und Ruf für einen eigenen Abschuss
function bountyFor(type: string) {
  addRep(killFaction(world.def?.id || ''), KILL_REP[type as keyof typeof KILL_REP] || 0);
  SHARED.onKill(type);
  return Math.round((BOUNTY[type as keyof typeof BOUNTY] || 0) * bountyFactor());
}
function enemyStats(type: string, d: number) {
  if (type === 'drone') return { hp: 40 + 15 * d, spd: Math.min(165, 115 + 8 * d), dmgP: 4 + 1.3 * d, dmgS: 10 + 3 * d };
  if (type === 'bomber') return { hp: 180 + 55 * d, spd: 70 + 4 * d, dmgP: 6 + d, dmgS: 110 + 20 * d };
  return { hp: 3500 + 900 * d, spd: 0, dmgP: 10 + 2 * d, dmgS: 25 };
}
export function spawnEnemy(type: 'drone' | 'bomber' | 'mother', x: number, y: number, z: number, home?: { x: number; y: number; z: number }) {
  const d = world.def?.danger ?? 2, es = enemyStats(type, d);
  const m = type === 'drone' ? DRONE_T.clone() : type === 'bomber' ? BOMBER_T.clone() : buildMother();
  // Jäger und Bomber größer als maßstabsgetreu, damit man sie im Kampf sieht; dazu Triebwerksspur und Glühpunkt
  let glow: THREE.Sprite | null = null;
  const big = type === 'drone' ? 1.6 : type === 'bomber' ? 1.4 : 1;
  if (type !== 'mother') {
    m.scale.multiplyScalar(big);
    const gk = 1 / m.scale.x;   // Kinder in Metern angeben
    glow = new THREE.Sprite(glowMat(0xb060ff, 0.75)); glow.position.set(0, 0, -5 * gk * big); glow.scale.setScalar(9 * gk); m.add(glow);
    const tm = basicAdd(0xa050ff); tm.opacity = 0.45; tm.side = THREE.DoubleSide;
    const trail = new THREE.Mesh(TRAIL_GEO, tm); trail.scale.setScalar(gk * big * (type === 'bomber' ? 1.5 : 1)); trail.position.set(0, 0, -4 * gk * big); m.add(trail);
  }
  m.position.set(x, y, z);
  scene.add(m);
  burst(x, y, z, '#b070ff', type === 'mother' ? 160 : 24, type === 'mother' ? 120 : 40, 1);
  const e = {
    type, x, y, z, vx: 0, vy: 0, vz: 0, hp: es.hp, maxhp: es.hp, es, cool: rand(1, 2.5), strafe: Math.random() < 0.5 ? 1 : -1, bob: rand(0, 6),
    target: null as any, rt: 0, launch: 8, mesh: m, home: home || { x, y, z }, wp: null as any, hive: -1, glow, big,
  };
  world.enemies.push(e);
  return e;
}
function spawnGroup(nd: number, nb: number, at?: { x: number; y: number; z: number }) {
  let c = at;
  if (!c) {
    // bevorzugt an einem Tor Richtung Osten (dort kommen sie her), sonst am Rand
    const east = world.gates.filter(g => g.faction !== 'core');
    if (east.length && Math.random() < 0.7) { const g = pick(east); c = { x: g.x + g.nx * 250, y: g.y, z: g.z + g.nz * 250 }; }
    else { const a = rand(0, Math.PI * 2), r = rand(2500, 4500); c = { x: Math.cos(a) * r, y: rand(-250, 250), z: Math.sin(a) * r }; }
    // nicht direkt neben dem Spieler auftauchen
    if (d3(c.x, c.y, c.z, P.x, P.y, P.z) < 900) { c.x = -c.x; c.z = -c.z; }
  }
  const home = { x: c.x * 0.5, y: c.y, z: c.z * 0.5 };
  for (let i = 0; i < nd; i++) spawnEnemy('drone', c.x + rand(-120, 120), c.y + rand(-60, 60), c.z + rand(-120, 120), home);
  for (let i = 0; i < nb; i++) spawnEnemy('bomber', c.x + rand(-80, 80), c.y + rand(-40, 40), c.z + rand(-80, 80), home);
  return c;
}
function hivePos(i: number) {
  const R = rng(hashStr(world.def!.id + 'hive' + i)), a = R.range(0, Math.PI * 2), r = R.range(1800, 3200);
  return { x: Math.cos(a) * r, y: R.range(-150, 250), z: Math.sin(a) * r };
}
function spawnHive(i: number) {
  const p = hivePos(i), e = spawnEnemy('mother', p.x, p.y, p.z);
  e.hive = i;
}

// Startbelegung eines Sektors
export function initFerrox() {
  const d = world.def!;
  world.spawnT = d.danger <= 1 ? rand(90, 160) : rand(25, 50);
  world.hiveT = [];
  if (d.danger >= 4) {
    const groups = d.danger - 2;
    for (let i = 0; i < groups; i++) {
      const f = world.fields.length ? pick(world.fields) : null;
      const at = f ? { x: f.x + rand(-300, 300), y: f.y, z: f.z + rand(-300, 300) } : undefined;
      spawnGroup(ri(3, 5), d.danger >= 5 ? ri(1, 2) : ri(0, 1), at);
    }
  }
  for (let i = 0; i < (d.hives || 0); i++) { spawnHive(i); world.hiveT[i] = 0; }
}

// Laufend neue Ferrox, je nach Gefahrenstufe
export function updateSpawning(dt: number) {
  if (SHARED.client) return;   // Nachschub schickt nur der Gastgeber
  const d = world.def!.danger;
  if (d <= 0) return;
  for (let i = 0; i < world.hiveT.length; i++) {
    if (world.hiveT[i] > 0) { world.hiveT[i] -= dt; if (world.hiveT[i] <= 0) spawnHive(i); }
  }
  world.spawnT -= dt;
  if (world.spawnT > 0) return;
  const cap = [0, 2, 6, 10, 14, 18][d], n = world.enemies.filter(e => e.type !== 'mother').length;
  world.spawnT = [0, rand(150, 240), rand(70, 110), rand(55, 85), rand(40, 60), rand(30, 45)][d];
  if (n >= cap) return;
  const nd = [0, ri(1, 2), ri(2, 4), ri(3, 5), ri(4, 6), ri(5, 7)][d], nb = d >= 3 ? ri(0, d >= 4 ? 2 : 1) : 0;
  const c = spawnGroup(nd, nb);
  if (world.def!.faction !== 'ferrox') {
    const st = world.stations[0], who = st ? st.name.toUpperCase() : 'SYSTEM';
    const near = world.gates.reduce((b: any, g) => (!b || d3(g.x, g.y, g.z, c.x, c.y, c.z) < d3(b.x, b.y, b.z, c.x, c.y, c.z) ? g : b), null);
    const txt = `Ferrox-Kontakt${near ? ` beim Tor nach ${near.name}` : ''}: ${nd} Jäger${nb ? ` und ${nb} Bomber` : ''}. Alle Piloten wachsam!`;
    radio(who, txt); hostEvent(['r', who, txt, '', 'alarm']);
    snd(440, 0.25, 'square', 0.04); setTimeout(() => snd(440, 0.25, 'square', 0.04), 350);
  }
}

// Zielwahl: nur was in Reichweite ist; sonst patrouillieren
function pickTarget(e: any) {
  const cand: { t: any; w: number }[] = [], R = 1700;
  if (playerTargetable() && d3(P.x, P.y, P.z, e.x, e.y, e.z) < R) cand.push({ t: { player: true }, w: e.type === 'bomber' ? 0.5 : 3 });
  for (const a of world.allies) if (a.alive && d3(a.x, a.y, a.z, e.x, e.y, e.z) < R) cand.push({ t: { ally: a }, w: e.type === 'bomber' ? 0.3 : 2 });
  for (const p of SHARED.pilots) if (d3(p.x, p.y, p.z, e.x, e.y, e.z) < R) cand.push({ t: { pilot: p.id }, w: e.type === 'bomber' ? 0.5 : 3 });
  for (const s of world.traffic) if (s.alive && d3(s.x, s.y, s.z, e.x, e.y, e.z) < R + 300) cand.push({ t: { ship: s }, w: e.type === 'bomber' ? 5 : 1.5 });
  if (!cand.length) return null;
  let sum = cand.reduce((a, c) => a + c.w, 0), r = Math.random() * sum;
  for (const c of cand) { r -= c.w; if (r <= 0) return c.t; }
  return cand[0].t;
}
const pilotOf = (id: number) => SHARED.pilots.find(p => p.id === id);
const tpos = (t: any) => (t.player ? P : t.pilot ? pilotOf(t.pilot)! : t.ally ? t.ally : t.ship);
function tValid(t: any) {
  if (!t) return false;
  if (t.player) return playerTargetable();
  if (t.pilot) return !!pilotOf(t.pilot);
  if (t.ally) return t.ally.alive;
  return t.ship.alive;
}

// Schaden an einem Ferrox. Als Mitspieler (nicht Gastgeber) entscheidet der Gastgeber: hier nur Treffer anzeigen und melden.
export function hitEnemy(e: any, j: number, dmg: number, byPlayer: boolean) {
  if (SHARED.client && e.nid) { e.hp = Math.max(1, e.hp - dmg); SHARED.foeHit(e, dmg, byPlayer); return; }
  e.hp -= dmg;
  if (e.hp <= 0) killEnemy(e, j, byPlayer);
}
// Kopfgeld und Beute für einen Abschuss, den der Gastgeber gemeldet hat
export function rewardKill(type: string, x: number, y: number, z: number) {
  const bounty = bountyFor(type);
  P.kills++; P.credits += bounty; P.earned += bounty;
  if (type === 'mother') { for (let k = 0; k < 10; k++) dropPick(x, y, z, 'schrott', 2, 80); for (let k = 0; k < 6; k++) dropPick(x, y, z, 'ferrit', 1, 80); radio('SYSTEM', 'Bienenstock zerstört! Kopfgeld: +' + bounty + ' Credits.'); }
  else if (type === 'bomber') { dropPick(x, y, z, 'schrott', 1); dropPick(x, y, z, 'schrott', 1); }
  else if (Math.random() < 0.7) dropPick(x, y, z, 'schrott', 1);
}
// drops = false: Beute gehört einem anderen Piloten (oder niemandem)
export function killEnemy(e: any, i: number, byPlayer = false, drops = true) {
  scene.remove(e.mesh);
  world.enemies.splice(i, 1);
  if (G.lockT === e) G.lockT = null;
  const bounty = byPlayer ? bountyFor(e.type) : 0;
  if (byPlayer) { P.kills++; P.credits += bounty; P.earned += bounty; }
  if (e.type === 'mother') {
    for (let k = 0; k < 6; k++) setTimeout(() => {
      burst(e.x + rand(-60, 60), e.y + rand(-60, 60), e.z + rand(-60, 60), k % 2 ? '#d0a0ff' : '#ffd27a', 160, 140, 2);
      boom(0.9, 0.7 + k * 0.04, () => snd(50 + k * 10, 0.9, 'sawtooth', 0.08, -25));
      G.shake = Math.min(3, G.shake + 1);
    }, k * 200);
    if (drops) for (let k = 0; k < 10; k++) dropPick(e.x, e.y, e.z, 'schrott', 2, 80);
    if (drops) for (let k = 0; k < 6; k++) dropPick(e.x, e.y, e.z, 'ferrit', 1, 80);
    if (e.hive >= 0) world.hiveT[e.hive] = 420;
    radio('SYSTEM', byPlayer ? `Bienenstock zerstört! Kopfgeld: +${bounty} Credits.` : 'Bienenstock zerstört!');
    return;
  }
  burst(e.x, e.y, e.z, '#c070ff', e.type === 'bomber' ? 110 : 60, e.type === 'bomber' ? 90 : 70, 1.2);
  burst(e.x, e.y, e.z, '#ffd27a', 40, 50, 0.9);
  boom(0.7, 1.1, () => snd(110, 0.5, 'sawtooth', 0.07, -70));
  if (d3(e.x, e.y, e.z, P.x, P.y, P.z) < 600) G.shake = Math.min(2, G.shake + 0.5);
  if (!drops) return;
  if (e.type === 'bomber') { dropPick(e.x, e.y, e.z, 'schrott', 1); dropPick(e.x, e.y, e.z, 'schrott', 1); }
  else if (Math.random() < 0.7) dropPick(e.x, e.y, e.z, 'schrott', 1);
}

function fireTorp(e: any, ship: any) {
  const m = new THREE.Mesh(TORP_GEO, TORP_M), g = new THREE.Sprite(glowMat(0xb050ff, 0.9));
  g.scale.setScalar(10); m.add(g);
  m.position.set(e.x, e.y, e.z);
  scene.add(m);
  _v2.set(ship.x - e.x, ship.y - e.y, ship.z - e.z).normalize().multiplyScalar(90);
  world.ebullets.push({ x: e.x, y: e.y, z: e.z, px: e.x, py: e.y, pz: e.z, vx: _v2.x, vy: _v2.y, vz: _v2.z, life: 14, dmgS: e.es.dmgS, dmgP: e.es.dmgP * 2, torp: true, ship, mesh: m });
  if (SHARED.online && !SHARED.client) SHARED.shots.push([Math.round(e.x), Math.round(e.y), Math.round(e.z), Math.round(_v2.x), Math.round(_v2.y), Math.round(_v2.z), 14, e.es.dmgP * 2, 1, ship.nid || 0]);
}
// Mitspieler: Torpedo des Gastgebers nachbilden (verfolgt denselben Frachter; Schaden am Frachter rechnet der Gastgeber)
export function remoteTorp(x: number, y: number, z: number, vx: number, vy: number, vz: number, dmgP: number, ship: any) {
  const m = new THREE.Mesh(TORP_GEO, TORP_M), g = new THREE.Sprite(glowMat(0xb050ff, 0.9));
  g.scale.setScalar(10); m.add(g);
  m.position.set(x, y, z);
  scene.add(m);
  world.ebullets.push({ x, y, z, px: x, py: y, pz: z, vx, vy, vz, life: 14, dmgS: 0, dmgP, torp: true, ship, mesh: m, remote: true });
}

export function updateEnemies(dt: number) {
  if (SHARED.client) return;   // Mitspieler: Ferrox kommen vom Gastgeber (siehe net.ts)
  const list = world.enemies;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    if (e.type === 'mother') {
      e.mesh.rotation.y += dt * 0.1;
      e.mesh.userData.ring.rotation.z += dt * 0.4;
      e.launch -= dt;
      const dp = d3(P.x, P.y, P.z, e.x, e.y, e.z);
      if (e.launch <= 0 && list.filter(x => x.type === 'drone').length < 16) {
        e.launch = dp < 2500 ? 14 : 30;
        for (let k = 0; k < 2; k++) spawnEnemy('drone', e.x + rand(-90, 90), e.y + rand(-40, 40), e.z + rand(-90, 90), { x: e.x, y: e.y, z: e.z });
      }
      e.cool -= dt;
      let aim: any = playerTargetable() && dp < 750 ? P : null;
      for (const p of SHARED.pilots) if (d3(p.x, p.y, p.z, e.x, e.y, e.z) < (aim ? d3(aim.x, aim.y, aim.z, e.x, e.y, e.z) : 750)) aim = p;
      if (aim && e.cool <= 0) {
        e.cool = 0.6;
        _v.set(aim.x - e.x, aim.y - e.y, aim.z - e.z).normalize();
        fireBullet(world.ebullets, e.x + _v.x * 70, e.y + _v.y * 70, e.z + _v.z * 70, _v.x + rand(-0.03, 0.03), _v.y + rand(-0.03, 0.03), _v.z + rand(-0.03, 0.03), 600, 1.6, 0, 'e', { dmgP: e.es.dmgP, dmgS: e.es.dmgS });
      }
      continue;
    }
    e.rt -= dt;
    if (e.rt <= 0 || (e.target && !tValid(e.target))) { e.target = pickTarget(e); e.rt = e.target ? rand(6, 10) : rand(2, 3.5); }
    let tx: number, ty: number, tz: number, d: number, isShip = false, attacking = !!e.target;
    let ax = 0, ay = 0, az = 0;
    e.bob += dt;
    if (attacking) {
      const T = tpos(e.target), dx = T.x - e.x, dy = T.y - e.y, dz = T.z - e.z;
      d = Math.hypot(dx, dy, dz) || 1;
      const nx = dx / d, ny = dy / d, nz = dz / d;
      isShip = !!e.target.ship;
      const keep = isShip ? (e.type === 'bomber' ? 380 : e.target.ship.R + 120) : 190, close = isShip ? keep - 120 : 90;   // Spieler und Piloten: dicht umkreisen
      if (d > keep) { ax += nx; ay += ny; az += nz; } else if (d < close) { ax -= nx; ay -= ny; az -= nz; }
      ax += -nz * e.strafe * 0.5; az += nx * e.strafe * 0.5; ay += Math.sin(e.bob * 1.3) * 0.3;
      const tv = e.target.player ? P : e.target.pilot ? T : e.target.ally || e.target.ship, lead = d / 750;
      tx = T.x + (tv.vx || 0) * lead; ty = T.y + (tv.vy || 0) * lead; tz = T.z + (tv.vz || 0) * lead;
    } else {
      // Patrouille um den Heimatpunkt
      if (!e.wp || d3(e.x, e.y, e.z, e.wp.x, e.wp.y, e.wp.z) < 80) e.wp = { x: e.home.x + rand(-700, 700), y: e.home.y + rand(-150, 150), z: e.home.z + rand(-700, 700) };
      const dx = e.wp.x - e.x, dy = e.wp.y - e.y, dz = e.wp.z - e.z;
      d = Math.hypot(dx, dy, dz) || 1;
      ax += dx / d * 0.6; ay += dy / d * 0.6; az += dz / d * 0.6;
      tx = e.x + e.vx; ty = e.y + e.vy; tz = e.z + e.vz;
    }
    for (const s of world.stations) { const sd = d3(e.x, e.y, e.z, s.x, s.y, s.z); if (sd < s.R) { ax += (e.x - s.x) / sd * 2; ay += (e.y - s.y) / sd * 2; az += (e.z - s.z) / sd * 2; } }
    for (const s of world.traffic) { const sd = d3(e.x, e.y, e.z, s.x, s.y, s.z); if (sd < s.R * 0.8) { ax += (e.x - s.x) / sd * 2; ay += (e.y - s.y) / sd * 2; az += (e.z - s.z) / sd * 2; } }
    for (const o of list) if (o !== e && o.type !== 'mother') { const od = d3(e.x, e.y, e.z, o.x, o.y, o.z); if (od < 40 && od > 0) { ax += (e.x - o.x) / od; ay += (e.y - o.y) / od; az += (e.z - o.z) / od; } }
    if (Math.random() < 0.004) e.strafe *= -1;
    const acc = e.type === 'bomber' ? 120 : 210, dr = Math.pow(0.6, dt), spd = attacking ? e.es.spd : e.es.spd * 0.55;
    e.vx = (e.vx + ax * acc * dt) * dr; e.vy = (e.vy + ay * acc * dt) * dr; e.vz = (e.vz + az * acc * dt) * dr;
    const v = Math.hypot(e.vx, e.vy, e.vz);
    if (v > spd) { const k = spd / v; e.vx *= k; e.vy *= k; e.vz *= k; }
    e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt;
    const rr = Math.hypot(e.x, e.z);
    if (rr > SECTOR_RADIUS) { e.x *= SECTOR_RADIUS / rr; e.z *= SECTOR_RADIUS / rr; }
    if (world.ground) { const gy = world.ground(e.x, e.z) + 30; if (e.y < gy) { e.y = gy; e.vy = Math.max(0, e.vy); } }
    e.mesh.position.set(e.x, e.y, e.z);
    e.mesh.lookAt(tx, ty, tz);
    if (e.glow) e.glow.scale.setScalar(Math.max(10, d3(e.x, e.y, e.z, camera.position.x, camera.position.y, camera.position.z) * 0.02) / e.mesh.scale.x);
    e.cool -= dt;
    if (!attacking) continue;
    if (e.type === 'bomber') {
      if (isShip && d < 700 && e.cool <= 0) { e.cool = rand(5.5, 7.5); fireTorp(e, e.target.ship); snd(180, 0.4, 'triangle', 0.03, -80); }
    } else if (d < (isShip ? e.target.ship.R + 500 : 650) && e.cool <= 0) {
      e.cool = isShip ? rand(0.6, 1) : rand(0.8, 1.5);
      _v.set(tx - e.x + rand(-10, 10), ty - e.y + rand(-10, 10), tz - e.z + rand(-10, 10)).normalize();
      fireBullet(world.ebullets, e.x + _v.x * 8, e.y + _v.y * 8, e.z + _v.z * 8, _v.x, _v.y, _v.z, 750, 1.4, 0, 'e', { dmgP: e.es.dmgP, dmgS: e.es.dmgS });
      if (d3(e.x, e.y, e.z, P.x, P.y, P.z) < 800) snd(320, 0.06, 'square', 0.015, -150);
    }
  }
}

// ---------------- Eigene Geschosse, Raketen, Feindfeuer ----------------
export function updateProjectiles(dt: number) {
  const { bullets, ebullets, rockets, enemies, asteroids } = world;
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.px = b.x; b.py = b.y; b.pz = b.z;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.life -= dt;
    b.mesh.position.set(b.x, b.y, b.z);
    let hit = false;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j], r = e.type === 'mother' ? 80 : e.type === 'bomber' ? 18 : 13;   // Trefferkugel passend zur neuen Größe
      if (segHit(b, e.x, e.y, e.z, r)) {
        burst(b.px, b.py, b.pz, '#d0a0ff', 6, 35, 0.35); hit = true;
        if (b.kind === 'p') G.hitMark = 0.12;
        if (!b.remote) hitEnemy(e, j, b.dmg, b.kind === 'p');
        break;
      }
    }
    if (!hit) for (const t of ebullets) if (t.torp && t.life > 0 && segHit(b, t.x, t.y, t.z, 4.5)) {
      t.life = 0; burst(t.x, t.y, t.z, '#c070ff', 30, 45, 0.6); boom(0.35, 1.6, () => snd(300, 0.15, 'triangle', 0.04, -150)); hit = true; break;
    }
    if (!hit && b.kind === 'p') for (let j = asteroids.length - 1; j >= 0; j--) {
      const a = asteroids[j];
      if (Math.abs(a.x - b.x) > a.r + 30 || Math.abs(a.z - b.z) > a.r + 30) continue;
      if (segHit(b, a.x, a.y, a.z, a.r)) { a.hp -= b.dmg; burst(b.px, b.py, b.pz, '#cfd6e3', 4, 30, 0.3); hit = true; if (a.hp <= 0) breakAst(j); break; }
    }
    if (!hit) for (const s of world.stations) if (sphSeg(b, s)) { hit = true; break; }
    if (!hit) for (const s of world.traffic) if (sphSeg(b, s)) { hit = true; break; }
    if (hit || b.life <= 0) { scene.remove(b.mesh); bullets.splice(i, 1); }
  }
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.life -= dt;
    if (r.target && enemies.includes(r.target)) {
      const t = r.target, k = Math.min(1, dt * 4);
      _v.set(t.x - r.x, t.y - r.y, t.z - r.z).normalize().multiplyScalar(720);
      r.vx += (_v.x - r.vx) * k; r.vy += (_v.y - r.vy) * k; r.vz += (_v.z - r.vz) * k;
    }
    r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
    r.mesh.position.set(r.x, r.y, r.z);
    r.mesh.lookAt(r.x + r.vx, r.y + r.vy, r.z + r.vz);
    r.mesh.rotateX(Math.PI / 2);
    puff(r.x, r.y, r.z, rand(-6, 6), rand(-6, 6), rand(-6, 6), '#9a9a9a', 0.9);
    puff(r.x, r.y, r.z, 0, 0, 0, '#ffb070', 0.15);
    let boom = r.life <= 0;
    for (let j = enemies.length - 1; j >= 0 && !boom; j--) {
      const e = enemies[j], rr = e.type === 'mother' ? 85 : e.type === 'bomber' ? 15 : 10;
      if (d3(r.x, r.y, r.z, e.x, e.y, e.z) < rr) { boom = true; hitEnemy(e, j, 150 + 20 * P.up.guns, true); }
    }
    if (boom) { burst(r.x, r.y, r.z, '#ffd27a', 60, 60, 0.9); sfx('explosion' + Math.floor(Math.random() * 3), 0.6, 1.25, () => snd(120, 0.4, 'sawtooth', 0.06, -60)); scene.remove(r.mesh); rockets.splice(i, 1); }
  }
  for (let i = ebullets.length - 1; i >= 0; i--) {
    const b = ebullets[i];
    if (b.torp && b.life > 0) {
      if (b.ship && b.ship.alive) {
        const k = Math.min(1, dt * 0.8);
        _v.set(b.ship.x - b.x, b.ship.y - b.y, b.ship.z - b.z).normalize().multiplyScalar(150);
        b.vx += (_v.x - b.vx) * k; b.vy += (_v.y - b.vy) * k; b.vz += (_v.z - b.vz) * k;
      }
      puff(b.x, b.y, b.z, rand(-4, 4), rand(-4, 4), rand(-4, 4), '#9040ff', 0.6);
    }
    b.px = b.x; b.py = b.y; b.pz = b.z;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    b.life -= dt;
    b.mesh.position.set(b.x, b.y, b.z);
    if (b.life > 0 && playerTargetable() && segHit(b, P.x, P.y, P.z, stats().radius + (b.torp ? 3 : 1))) {
      hurtPlayer(b.dmgP);
      burst(b.x, b.y, b.z, P.shield > 0 ? '#7cc4ff' : '#ffb347', 12, 35, 0.4);
      b.life = 0;
    }
    if (b.life > 0) for (const a of world.allies) if (a.alive && segHit(b, a.x, a.y, a.z, 7)) {
      damageAlly(a, b.dmgP); burst(b.x, b.y, b.z, '#ffb347', 10, 30, 0.4); b.life = 0; break;
    }
    if (b.life > 0) for (const s of world.traffic) if (s.alive && sphSeg(b, s)) {
      damageTraffic(s, b.dmgS || 0);
      burst(b.x, b.y, b.z, b.torp ? '#ff8040' : '#ffb070', b.torp ? 60 : 6, b.torp ? 60 : 20, b.torp ? 1 : 0.3);
      b.life = 0; break;
    }
    if (b.life > 0) for (const s of world.stations) if (sphSeg(b, s)) { burst(b.x, b.y, b.z, '#ffb070', 6, 20, 0.3); b.life = 0; break; }
    if (b.life <= 0) { scene.remove(b.mesh); ebullets.splice(i, 1); }
  }
}

// ---------------- Stationsabwehr (Flak) ----------------
let flakSnd = 0;
export function updateStationDefense(dt: number) {
  if (!world.def || world.def.faction === 'ferrox') return;
  flakSnd -= dt;
  for (const s of world.stations) {
    s.flak -= dt;
    if (s.flak > 0) continue;
    s.flak = s.kind === 'outpost' ? 0.55 : 0.35;
    const range = s.kind === 'outpost' ? 750 : 950, cand: any[] = [];
    for (const e of world.enemies) if (e.type !== 'mother' && d3(e.x, e.y, e.z, s.x, s.y, s.z) < range) cand.push(e);
    for (const t of world.ebullets) if (t.torp && d3(t.x, t.y, t.z, s.x, s.y, s.z) < range) cand.push(t);
    if (!cand.length) continue;
    const t = pick(cand), fx = t.x + rand(-40, 40), fy = t.y + rand(-40, 40), fz = t.z + rand(-40, 40);
    burst(fx, fy, fz, '#ffb050', 10, 30, 0.4);
    burst(fx, fy, fz, '#8a8a8a', 12, 22, 1.2);
    if (!SHARED.client) for (let j = world.enemies.length - 1; j >= 0; j--) { const e = world.enemies[j]; if (d3(e.x, e.y, e.z, fx, fy, fz) < 38) hitEnemy(e, j, 14, false); }
    for (const tb of world.ebullets) if (tb.torp && d3(tb.x, tb.y, tb.z, fx, fy, fz) < 38) tb.life = 0;
    if (flakSnd <= 0 && d3(s.x, s.y, s.z, P.x, P.y, P.z) < 1500) { snd(90, 0.12, 'triangle', 0.025, -40); flakSnd = 0.25; }
    if (s.model.turrets) for (const tr of s.model.turrets) tr.rotation.y = Math.atan2(-(t.x - s.x - tr.position.x), -(t.z - s.z - tr.position.z));
  }
}

// Rakete abfeuern (vom Spieler)
export function launchRocket(x: number, y: number, z: number, vx: number, vy: number, vz: number, target: any) {
  const m = new THREE.Mesh(ROCKET_GEO, MK), g = new THREE.Sprite(glowMat(0xffc080, 0.9));
  g.scale.setScalar(5); g.position.y = -1; m.add(g);
  m.position.set(x, y, z);
  scene.add(m);
  world.rockets.push({ x, y, z, vx, vy, vz, life: 4.5, target, mesh: m });
  snd(260, 0.5, 'sawtooth', 0.05, 500);
}
