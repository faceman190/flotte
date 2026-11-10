import * as THREE from 'three';
import { scene } from '../core/engine';
import { rand, pick, d3, clamp } from '../core/util';
import { snd, gunSound } from '../core/audio';
import { buildCivilian, SHIPDEF, SHIPNAMES, type CivType } from '../models/ships';
import { buildAllyModel } from '../models/playerShips';
import { world, type Station, type Gate } from './world';
import { burst } from './fx';
import { fireBullet } from './combat';
import { radio } from '../ui/radio';
import { P } from './state';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

// =============== Ziviler Verkehr ===============
// Schiffe pendeln zwischen Toren und Stationen. Bringt Leben in die Sektoren und gibt den Ferrox Ziele.
function trafficCap() {
  const d = world.def;
  if (!d || d.faction === 'ferrox' || !world.stations.length || !world.gates.length) return 0;
  return d.faction === 'core' ? 4 : 2;
}
function holdPoint(s: Station) {
  const a = rand(0, Math.PI * 2), r = s.R + rand(220, 380);
  return { x: s.x + Math.cos(a) * r, y: s.y + rand(-60, 60), z: s.z + Math.sin(a) * r };
}
function gateGoal(g: Gate) { return { x: g.x, y: g.y, z: g.z, gate: g }; }

function spawnTraffic(initial: boolean) {
  const type = pick(Object.keys(SHIPDEF) as CivType[]), def = SHIPDEF[type];
  const used = new Set(world.traffic.map(t => t.name)), name = pick(SHIPNAMES.filter(n => !used.has(n))) || 'Frachter';
  const st = pick(world.stations), gate = pick(world.gates);
  const inbound = Math.random() < 0.5;
  let x: number, y: number, z: number, goal: any;
  if (inbound) { x = gate.x + gate.nx * 160; y = gate.y; z = gate.z + gate.nz * 160; goal = holdPoint(st); goal.station = st; }
  else { const h = holdPoint(st); x = h.x; y = h.y; z = h.z; goal = gateGoal(gate); }
  if (initial) { const t = rand(0.1, 0.8); x += (goal.x - x) * t; y += (goal.y - y) * t; z += (goal.z - z) * t; }
  const b = buildCivilian(type);
  for (const gl of b.glows) gl.userData.base = gl.scale.x / 10;
  b.g.position.set(x, y, z);
  scene.add(b.g);
  _v.set(goal.x - x, goal.y - y, goal.z - z).normalize().multiplyScalar(def.spd);
  world.traffic.push({
    type, def, name, x, y, z, vx: _v.x, vy: _v.y, vz: _v.z, hp: def.hp, maxhp: def.hp, sph: def.sph, R: def.R,
    mesh: b.g, parts: b, goal, wait: 0, hitT: 0, alertT: 0, alive: true, spd: def.spd * rand(0.9, 1.15),
  });
  if (!initial) burst(x, y, z, '#ffffff', 40, 60, 0.8);
}

export function initTraffic() {
  world.traffic.length = 0;
  const n = trafficCap();
  for (let i = 0; i < n; i++) spawnTraffic(true);
  world.trafficT = rand(20, 35);
}

function removeTraffic(i: number) {
  const t = world.traffic[i];
  scene.remove(t.mesh);
  t.mesh.traverse((c: any) => { if (c.isMesh) c.geometry.dispose(); });
  t.alive = false;
  world.traffic.splice(i, 1);
}

export function damageTraffic(t: any, d: number) {
  if (!t.alive) return;
  t.hp -= d;
  t.hitT = 0.3;
  if (t.alertT <= 0) { t.alertT = 15; radio('VERKEHR', `${t.def.n} „${t.name}“ wird angegriffen! Wir brauchen Hilfe!`); }
  if (t.hp <= 0) {
    t.hp = 0;
    const { x, y, z } = t;
    for (let i = 0; i < 6; i++) setTimeout(() => { burst(x + rand(-50, 50), y + rand(-15, 15), z + rand(-50, 50), i % 2 ? '#ffd27a' : '#ff7040', 140, 90, 1.8); snd(60 + i * 15, 0.8, 'sawtooth', 0.05, -30); }, i * 180);
    radio('LEITSTELLE', `Wir haben die „${t.name}“ verloren.`);
    removeTraffic(world.traffic.indexOf(t));
  }
}

export function updateTraffic(dt: number) {
  const cap = trafficCap();
  world.trafficT -= dt;
  if (world.trafficT <= 0) { world.trafficT = rand(25, 45); if (world.traffic.length < cap) spawnTraffic(false); }
  for (let i = world.traffic.length - 1; i >= 0; i--) {
    const t = world.traffic[i];
    t.hitT = Math.max(0, t.hitT - dt);
    t.alertT -= dt;
    const g = t.goal, dx = g.x - t.x, dy = g.y - t.y, dz = g.z - t.z, d = Math.hypot(dx, dy, dz) || 1;
    if (t.wait > 0) {
      t.wait -= dt;
      t.vx *= Math.pow(0.5, dt); t.vy *= Math.pow(0.5, dt); t.vz *= Math.pow(0.5, dt);
      if (t.wait <= 0) t.goal = gateGoal(pick(world.gates));
    } else {
      let spd = t.spd;
      if (g.station) spd = Math.min(spd, d * 0.4 + 8);
      _v.set(dx / d * spd, dy / d * spd, dz / d * spd);
      for (const s of world.stations) {
        const sd = d3(t.x, t.y, t.z, s.x, s.y, s.z);
        if (sd < s.R + 120) { _v.x += (t.x - s.x) / sd * 60; _v.y += (t.y - s.y) / sd * 60; _v.z += (t.z - s.z) / sd * 60; }
      }
      const k = Math.min(1, dt * 0.6);
      t.vx += (_v.x - t.vx) * k; t.vy += (_v.y - t.vy) * k; t.vz += (_v.z - t.vz) * k;
      if (g.station && d < 40) t.wait = rand(20, 45);
      if (g.gate && d < 75) {
        burst(t.x, t.y, t.z, '#ffffff', 50, 70, 0.8);
        snd(200, 0.5, 'sine', 0.02, 400);
        removeTraffic(i);
        continue;
      }
    }
    t.x += t.vx * dt; t.y += t.vy * dt; t.z += t.vz * dt;
    t.mesh.position.set(t.x, t.y, t.z);
    const sp = Math.hypot(t.vx, t.vy, t.vz);
    if (sp > 3) {
      // weich drehen: Bug zeigt in Flugrichtung
      _v2.set(t.x - t.vx, t.y - t.vy, t.z - t.vz);
      const q0 = t.mesh.quaternion.clone();
      t.mesh.lookAt(_v2);
      const q1 = t.mesh.quaternion.clone();
      t.mesh.quaternion.copy(q0).slerp(q1, Math.min(1, dt * 1.5));
    }
    for (const gl of t.parts.glows) gl.scale.setScalar(clamp(sp / 8, 3, 12) * (1 + Math.random() * 0.1) * (gl.userData.base || 1));
  }
}

// =============== Patrouillen (befreundete Jäger) ===============
const CALLSIGNS = [['RABE', 0x8fd18f, '#8fd18f'], ['FUNKE', 0x7cc4ff, '#7cc4ff'], ['KOBALT', 0x7c9cff, '#9cb4ff'], ['WESPE', 0xf2d36b, '#f2d36b'], ['LUCHS', 0xd0a070, '#e0b080']] as const;
function allyCap() {
  const d = world.def;
  if (!d || d.faction === 'ferrox' || !world.stations.length) return 0;
  return d.faction === 'border' ? 3 : 2;
}
function spawnAlly() {
  const used = new Set(world.allies.map(a => a.name)), cs = CALLSIGNS.find(c => !used.has(c[0])) || CALLSIGNS[0];
  const home = pick(world.stations), f = buildAllyModel(CALLSIGNS.indexOf(cs), cs[1]);
  const x = home.launch.x + rand(-40, 40), y = home.launch.y + rand(-20, 20), z = home.launch.z + rand(-40, 40);
  f.g.position.set(x, y, z);
  scene.add(f.g);
  world.allies.push({ name: cs[0], col: cs[2], x, y, z, vx: 0, vy: 0, vz: 0, hp: 140, maxhp: 140, cool: 0, mesh: f.g, f, alive: true, target: null, rt: 0, home, orbit: rand(0, 6.28), side: Math.random() < 0.5 ? 1 : -1 });
}
export function initAllies() {
  world.allies.length = 0;
  for (let i = 0; i < allyCap(); i++) spawnAlly();
  world.allyT = 60;
}
export function damageAlly(a: any, d: number) {
  if (!a.alive) return;
  a.hp -= d;
  if (a.hp <= 0) {
    a.alive = false;
    scene.remove(a.mesh);
    burst(a.x, a.y, a.z, '#ffb347', 90, 70, 1.2);
    snd(100, 0.6, 'sawtooth', 0.05, -60);
    radio(a.name, 'Ich bin getroffen! Steige aus!', a.col);
  }
}
export function updateAllies(dt: number) {
  // Verluste nach einer Weile von der Station ersetzen
  world.allyT -= dt;
  if (world.allyT <= 0) {
    world.allyT = 75;
    world.allies = world.allies.filter(a => a.alive);
    if (world.allies.length < allyCap()) spawnAlly();
  }
  for (const w of world.allies) {
    if (!w.alive) continue;
    w.rt -= dt;
    if (w.rt <= 0 || (w.target && !world.enemies.includes(w.target))) {
      w.rt = rand(2, 4);
      let best = null, bd = 1800;
      for (const e of world.enemies) {
        if (e.type === 'mother') continue;
        const d = Math.min(d3(e.x, e.y, e.z, w.x, w.y, w.z), d3(e.x, e.y, e.z, w.home.x, w.home.y, w.home.z) * 0.8);
        if (d < bd) { bd = d; best = e; }
      }
      w.target = best;
    }
    let tx: number, ty: number, tz: number, spd = 300;
    if (w.target) {
      const e = w.target, d = d3(e.x, e.y, e.z, w.x, w.y, w.z), lead = d / 1300;
      tx = e.x + e.vx * lead; ty = e.y + e.vy * lead; tz = e.z + e.vz * lead;
      if (d < 120) tx += w.side * 150;
    } else {
      w.orbit += dt * 0.12;
      const r = w.home.R + 450;
      tx = w.home.x + Math.cos(w.orbit) * r; ty = w.home.y + Math.sin(w.orbit * 2) * 60; tz = w.home.z + Math.sin(w.orbit) * r;
      spd = clamp(d3(tx, ty, tz, w.x, w.y, w.z) * 1.5, 60, 220);
    }
    const dx = tx - w.x, dy = ty - w.y, dz = tz - w.z, d = Math.hypot(dx, dy, dz) || 1, k = Math.min(1, dt * 2.2);
    w.vx += (dx / d * spd - w.vx) * k; w.vy += (dy / d * spd - w.vy) * k; w.vz += (dz / d * spd - w.vz) * k;
    for (const s of world.stations) { const sd = d3(w.x, w.y, w.z, s.x, s.y, s.z); if (sd < s.R + 30) { w.vx += (w.x - s.x) / sd * 400 * dt; w.vy += (w.y - s.y) / sd * 400 * dt; w.vz += (w.z - s.z) / sd * 400 * dt; } }
    for (const s of world.traffic) { const sd = d3(w.x, w.y, w.z, s.x, s.y, s.z); if (sd < s.R * 0.75) { w.vx += (w.x - s.x) * dt * 3; w.vy += (w.y - s.y) * dt * 3; w.vz += (w.z - s.z) * dt * 3; } }
    w.x += w.vx * dt; w.y += w.vy * dt; w.z += w.vz * dt;
    w.mesh.position.set(w.x, w.y, w.z);
    const sp = Math.hypot(w.vx, w.vy, w.vz);
    if (sp > 20) w.mesh.lookAt(w.x - w.vx, w.y - w.vy, w.z - w.vz);
    w.f.glows.forEach((g: THREE.Sprite) => g.scale.setScalar(2.5 + sp / 90));
    w.cool -= dt;
    if (w.target && w.cool <= 0) {
      const e = w.target;
      _v.set(e.x - w.x, e.y - w.y, e.z - w.z);
      const dd = _v.length();
      _v.normalize();
      _v2.set(w.vx, w.vy, w.vz).normalize();
      if (dd < 700 && _v.dot(_v2) > 0.94) {
        w.cool = 0.2;
        const lead = dd / 1300;
        _v.set(e.x + e.vx * lead - w.x + rand(-6, 6), e.y + e.vy * lead - w.y + rand(-6, 6), e.z + e.vz * lead - w.z + rand(-6, 6)).normalize();
        fireBullet(world.bullets, w.x + _v.x * 8, w.y + _v.y * 8, w.z + _v.z * 8, _v.x, _v.y, _v.z, 1300, 0.7, 7, 'w');
        const pd = d3(w.x, w.y, w.z, P.x, P.y, P.z);
        if (pd < 600) gunSound(0.4 * (1 - pd / 600));
      }
    }
  }
}
