import * as THREE from 'three';
import { crewAngriff } from './crewStimmen';
import { scene, GLOW } from '../core/engine';
import { rand, pick, d3, clamp } from '../core/util';
import { sndOut as snd, gunSoundOut as gunSound, sfxOut as sfx, boomOut as boom, outVol } from '../core/audio';   // im Inneren einer Station stumm (siehe audio.ts)
import { buildCivilian, SHIPDEF, SHIPNAMES, type CivType } from '../models/ships';
import { buildAllyModel } from '../models/playerShips';
import { world, type Station, type Gate } from './world';
import { burst } from './fx';
import { fireBullet } from './combat';
import { radio } from '../ui/radio';
import { P, G } from './state';
import { SHARED, hostEvent } from './shared';

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();

// =============== Ziviler Verkehr ===============
// Schiffe pendeln zwischen Toren und Stationen. Bringt Leben in die Sektoren und gibt den Ferrox Ziele.
function trafficCap() {
  const d = world.def;
  if (!d || d.faction === 'ferrox' || !world.stations.length || !world.gates.length) return 0;
  return d.size ? 7 : d.faction === 'core' ? 4 : 2;   // großer Sektor: mehr Frachter, sonst wirkt er leer
}
function holdPoint(s: Station) {
  const a = rand(0, Math.PI * 2), r = s.R + rand(220, 380);
  return { x: s.x + Math.cos(a) * r, y: s.y + rand(-60, 60), z: s.z + Math.sin(a) * r };
}
function gateGoal(g: Gate) { return { x: g.x, y: g.y, z: g.z, gate: g }; }
// ---------- Andocken (seit 2026-11-20): Frachter fliegen durchs Hangartor hinein und legen später wieder ab ----------
// st.launch liegt in der Ebene des Hangartors, f zeigt hinaus. Anflug: Punkt 700 m vor dem Tor, dann langsam aufs Tor zu und hinein;
// 60 m hinter dem Tor verschwindet das Schiff (der Rumpf steckt dann fast ganz im Hangar). Nach ein bis zweieinhalb Minuten legt es wieder ab.
// Ist der Pilot gerade in einer Station (G.inside), dockt niemand an: Der Innenraum liegt an derselben Stelle, das Schiff flöge hindurch.
const dockF = (s: Station) => ({ fx: -Math.sin(s.launch.yaw), fz: -Math.cos(s.launch.yaw) });
function dockGoal(s: Station, stage: 1 | 2 | 3) {
  const { fx, fz } = dockF(s), L = s.launch, k = stage === 1 ? 700 : stage === 2 ? 0 : -60;
  return { x: L.x + fx * k, y: L.y, z: L.z + fz * k, station: s, dockStage: stage };
}
const docked: { t: number; st: Station; type: CivType; name: string }[] = [];
export const trafficDocked = () => docked;
function undock(q: { st: Station; type: CivType; name: string }) {
  const def = SHIPDEF[q.type], b = buildCivilian(q.type), { fx, fz } = dockF(q.st), L = q.st.launch;
  for (const gl of b.glows) gl.userData.base = gl.scale.x / 10;
  const x = L.x - fx * 40, y = L.y, z = L.z - fz * 40;
  b.g.position.set(x, y, z); b.g.lookAt(x - fx, y, z - fz); scene.add(b.g);
  const a = dockGoal(q.st, 1);
  world.traffic.push({ type: q.type, def, name: q.name, x, y, z, vx: fx * 12, vy: 0, vz: fz * 12, hp: def.hp, maxhp: def.hp, sph: def.sph, R: def.R,
    mesh: b.g, parts: b, goal: { x: a.x, y: a.y, z: a.z, undock: true }, wait: 0, hitT: 0, alertT: 0, alive: true, spd: def.spd * rand(0.9, 1.15), outT: G.time });
}

// Sprungblitz am Tor (seit Heimstatt Phase 2): Wenn ein Frachter springt oder ankommt, leuchtet das Tor kurz hell auf. Der Blitz hängt am
// Tormodell, so rückt ihn die Fernansicht mit heran (farview.ts) und man sieht Sprünge auch aus vielen Kilometern.
const flashes: { s: THREE.Sprite; t: number; g: Gate }[] = [];
export function gateFlash(g: Gate) {
  const m = new THREE.SpriteMaterial({ map: GLOW, color: 0xdfeaff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
  const sp = new THREE.Sprite(m); sp.scale.setScalar(110); sp.renderOrder = 3;
  g.mesh.add(sp); flashes.push({ s: sp, t: 0, g });
}
function updateFlashes(dt: number) {
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i]; f.t += dt;
    const k = f.t / 1.1;
    if (k >= 1 || !f.s.parent) { f.s.parent?.remove(f.s); f.s.material.dispose(); flashes.splice(i, 1); continue; }
    f.s.scale.setScalar(110 + 520 * Math.sqrt(k)); f.s.material.opacity = 0.7 * (1 - k) * (1 - k);
  }
}
const nearGate = (x: number, y: number, z: number) => world.gates.reduce<Gate | null>((b, g) => (!b || d3(g.x, g.y, g.z, x, y, z) < d3(b.x, b.y, b.z, x, y, z) ? g : b), null);

function spawnTraffic(initial: boolean) {
  const type = pick(Object.keys(SHIPDEF) as CivType[]), def = SHIPDEF[type];
  const used = new Set([...world.traffic.map(t => t.name), ...docked.map(d => d.name)]), name = pick(SHIPNAMES.filter(n => !used.has(n))) || 'Frachter';
  const st = pick(world.stations), gate = pick(world.gates);
  const inbound = Math.random() < 0.5;
  let x: number, y: number, z: number, goal: any;
  if (!initial && !inbound && docked.length && docked[0].t <= G.time) { undock(docked.shift()!); return; }   // wer im Hangar lag, legt jetzt ab
  if (inbound) { x = gate.x + gate.nx * 160; y = gate.y; z = gate.z + gate.nz * 160; goal = dockGoal(st, 1); }
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
  if (!initial) {
    burst(x, y, z, '#ffffff', 40, 60, 0.8);
    if (inbound) { gateFlash(gate); const t = world.traffic[world.traffic.length - 1]; t.arrive = 0.6; t.vx *= 6; t.vy *= 6; t.vz *= 6; }   // kommt gestreckt aus dem Tor geschossen
  }
}

// Schiff der Geschichte (Kapitel 4: die Weitsicht): ein vergrößertes Zivilschiff, das zum Tor fliegt und springt. Die Ferrox greifen es an wie
// jeden Frachter. Es bleibt bei hp 1 stehen statt zu explodieren; `jumped` zeigt, dass es das Tor erreicht hat.
export function buildStoryShip(type: CivType, scale: number) { const b = buildCivilian(type); for (const gl of b.glows) gl.userData.base = gl.scale.x / 10; b.g.scale.setScalar(scale); return b; }
export function spawnStoryShip(name: string, kind: string, type: CivType, scale: number, hp: number, spd: number, x: number, y: number, z: number, gate: Gate) {
  const d0 = SHIPDEF[type], def = { n: kind, hp, sph: d0.sph.map(s => s.map(v => v * scale)), R: d0.R * scale, spd };
  const b = buildStoryShip(type, scale);
  b.g.position.set(x, y, z); scene.add(b.g);
  const goal = gateGoal(gate);
  _v.set(goal.x - x, goal.y - y, goal.z - z).normalize().multiplyScalar(spd * 0.2);
  const t = { type, def, name, x, y, z, vx: _v.x, vy: _v.y, vz: _v.z, hp, maxhp: hp, sph: def.sph, R: def.R, mesh: b.g, parts: b, goal, wait: 0, hitT: 0, alertT: 1e9, alive: true, spd, story: true, jumped: false };
  world.traffic.push(t);
  return t;
}
export function removeStoryShip(t: any) { const i = world.traffic.indexOf(t); if (i >= 0) removeTraffic(i); }
export function initTraffic() {
  world.traffic.length = 0; docked.length = 0;
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

// Funkspruch, den im Mehrspieler auch die Mitspieler im Sektor hören
function npcRadio(who: string, text: string, col?: string) { radio(who, text, col); hostEvent(['r', who, text, col || '']); }
function trafficBoom(x: number, y: number, z: number) {
  const ov = Math.max(0.1, outVol(x, y, z, 900));
  for (let i = 0; i < 6; i++) setTimeout(() => { burst(x + rand(-50, 50), y + rand(-15, 15), z + rand(-50, 50), i % 2 ? '#ffd27a' : '#ff7040', 140, 90, 1.8); snd(60 + i * 15, 0.8, 'sawtooth', 0.05 * ov, -30); }, i * 180);
}
export function damageTraffic(t: any, d: number) {
  if (!t.alive) return;
  t.hitT = 0.3;
  if (t.story) { t.hp = Math.max(1, t.hp - d); return; }      // Schiff der Geschichte: geht nicht verloren, das Kapitel entscheidet bei hp 1
  if (SHARED.client && t.nid) return;   // Schaden rechnet der Gastgeber
  t.hp -= d;
  if (t.alertT <= 0) { t.alertT = 15; npcRadio('VERKEHR', `${t.def.n} „${t.name}“ wird angegriffen! Wir brauchen Hilfe!`); }
  if (t.hp <= 0) {
    t.hp = 0;
    trafficBoom(t.x, t.y, t.z);
    if (t.nid) hostEvent(['x', 't', t.nid]);
    npcRadio('LEITSTELLE', `Wir haben die „${t.name}“ verloren.`);
    removeTraffic(world.traffic.indexOf(t));
  }
}

export function updateTraffic(dt: number) {
  if (SHARED.client) { mirrorTraffic(dt); return; }   // Mitspieler: Verkehr kommt vom Gastgeber
  const cap = trafficCap();
  world.trafficT -= dt;
  if (world.trafficT <= 0) { world.trafficT = rand(25, 45); if (world.traffic.length < cap) spawnTraffic(false); }
  updateFlashes(dt);
  for (let i = world.traffic.length - 1; i >= 0; i--) {
    const t = world.traffic[i];
    t.hitT = Math.max(0, t.hitT - dt);
    t.alertT -= dt;
    // Sprung: beim Abflug streckt sich der Frachter ins Tor, bei der Ankunft zieht er sich wieder zusammen (nur Optik)
    if (t.leaving !== undefined) {
      t.leaving -= dt; const k = 1 + 9 * (1 - Math.max(0, t.leaving) / 0.45);
      t.vx *= 1 + dt * 8; t.vy *= 1 + dt * 8; t.vz *= 1 + dt * 8;
      t.x += t.vx * dt; t.y += t.vy * dt; t.z += t.vz * dt; t.mesh.position.set(t.x, t.y, t.z); t.mesh.scale.set(1 / Math.sqrt(k), 1 / Math.sqrt(k), k);
      if (t.leaving <= 0) removeTraffic(i);
      continue;
    }
    if (t.arrive > 0) { t.arrive -= dt; const k = 1 + 7 * Math.max(0, t.arrive) / 0.6; t.mesh.scale.set(1 / Math.sqrt(k), 1 / Math.sqrt(k), k); if (t.arrive <= 0) t.mesh.scale.setScalar(1); }
    const g = t.goal, dx = g.x - t.x, dy = g.y - t.y, dz = g.z - t.z, d = Math.hypot(dx, dy, dz) || 1;
    if (t.wait > 0) {
      t.wait -= dt;
      t.vx *= Math.pow(0.5, dt); t.vy *= Math.pow(0.5, dt); t.vz *= Math.pow(0.5, dt);
      if (t.wait <= 0) t.goal = gateGoal(pick(world.gates));
    } else {
      let spd = t.spd, gap = Infinity;
      if (g.station) spd = Math.min(spd, d * 0.4 + 8);
      if (g.dockStage === 2 || g.dockStage === 3 || g.undock) spd = Math.min(spd, g.dockStage === 3 ? 14 : 26);   // durchs Tor nur langsam
      _v.set(dx / d * spd, dy / d * spd, dz / d * spd);
      const atDoor = g.dockStage === 2 || g.dockStage === 3 || g.undock;
      for (const s of world.stations) {
        const sd = d3(t.x, t.y, t.z, s.x, s.y, s.z);
        gap = Math.min(gap, sd - s.R);
        if (sd < s.R + 120 && !atDoor) { _v.x += (t.x - s.x) / sd * 60; _v.y += (t.y - s.y) / sd * 60; _v.z += (t.z - s.z) / sd * 60; }
      }
      // Großer Sektor (Heimstatt, 50 km bis zum Tor): Frachter fliegen die lange Strecke im Schnellflug (bis 2,5 km/s), weit weg von Stationen und Ziel
      const far = world.def?.size && !t.story && !atDoor ? Math.min(d - 2500, gap - 1500) : 0;
      if (far > 0) { const fs = Math.min(2500, far * 0.4); if (fs > spd) _v.multiplyScalar(fs / spd); }
      const k = Math.min(1, dt * (Math.hypot(t.vx, t.vy, t.vz) > 400 || far > 0 ? 2 : 0.6));
      t.vx += (_v.x - t.vx) * k; t.vy += (_v.y - t.vy) * k; t.vz += (_v.z - t.vz) * k;
      if (g.dockStage === 1 && d < 60) {
        if (G.inside) { t.wait = rand(20, 45); t.goal = { ...g, dockStage: 0 }; }             // Pilot in einer Station: draußen warten, dann weiter
        else { t.goal = dockGoal(g.station, 2); t.dockT = G.time; }
      } else if (g.dockStage === 2 && d < 30) t.goal = dockGoal(g.station, 3);
      else if (g.dockStage === 3 && d < 12) {
        docked.push({ t: G.time + rand(60, 150), st: g.station, type: t.type, name: t.name });
        if (t.nid) hostEvent(['k', t.nid]);                                   // Mitspieler: still entfernen (kein Sprungblitz)
        removeTraffic(i); continue;
      } else if (g.undock && d < 50) t.goal = gateGoal(pick(world.gates));
      else if (g.station && !g.dockStage && d < 40) t.wait = rand(20, 45);
      if (g.gate && d < 75) {
        t.jumped = true;
        if (t.nid) hostEvent(['g', t.nid]);
        burst(t.x, t.y, t.z, '#ffffff', 50, 70, 0.8);
        snd(200, 0.5, 'sine', 0.02, 400);
        gateFlash(g.gate);
        if (t.story) { removeTraffic(i); continue; }                 // Schiffe der Geschichte wie bisher sofort
        t.leaving = 0.45;
        continue;
      }
    }
    t.x += t.vx * dt; t.y += t.vy * dt; t.z += t.vz * dt;
    orientTraffic(t, dt);
  }
}
// Lage und Triebwerke eines Frachters aus Position und Tempo
function orientTraffic(t: any, dt: number) {
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

// =============== Patrouillen (befreundete Jäger) ===============
const CALLSIGNS = [['RABE', 0x8fd18f, '#8fd18f'], ['FUNKE', 0x7cc4ff, '#7cc4ff'], ['KOBALT', 0x7c9cff, '#9cb4ff'], ['WESPE', 0xf2d36b, '#f2d36b'], ['LUCHS', 0xd0a070, '#e0b080']] as const;
function allyCap() {
  const d = world.def;
  if (!d || d.faction === 'ferrox' || !world.stations.length) return 0;
  return d.faction === 'border' ? 2 : 1;   // wenige Patrouillen: die Ferrox sollen dem Spieler bleiben
}
function spawnAlly() {
  const used = new Set(world.allies.map(a => a.name)), cs = CALLSIGNS.find(c => !used.has(c[0])) || CALLSIGNS[0];
  const home = pick(world.stations), f = buildAllyModel(CALLSIGNS.indexOf(cs), cs[1]);
  const x = home.launch.x + rand(-40, 40), y = home.launch.y + rand(-20, 20), z = home.launch.z + rand(-40, 40);
  f.g.position.set(x, y, z);
  scene.add(f.g);
  world.allies.push({ name: cs[0], col: cs[2], x, y, z, vx: 0, vy: 0, vz: 0, hp: 140, maxhp: 140, cool: 0, mesh: f.g, f, alive: true, target: null, rt: 0, home, orbit: rand(0, 6.28), side: Math.random() < 0.5 ? 1 : -1 });
}
// Verbündeter der Geschichte: ein Patrouillenjäger mit eigenem Namen, der um `home` kreist (ein Objekt mit x, y, z und R, z. B. ein Schiff)
export function spawnStoryAlly(name: string, col: number, css: string, x: number, y: number, z: number, home: any, hp = 260) {
  const f = buildAllyModel(world.allies.length % 5, col);
  f.g.position.set(x, y, z); scene.add(f.g);
  const a = { name, col: css, x, y, z, vx: 0, vy: 0, vz: 0, hp, maxhp: hp, cool: 0, mesh: f.g, f, alive: true, target: null, rt: 0, home, orbit: rand(0, 6.28), side: Math.random() < 0.5 ? 1 : -1 };
  world.allies.push(a);
  return a;
}
export function initAllies() {
  world.allies.length = 0;
  for (let i = 0; i < allyCap(); i++) spawnAlly();
  world.allyT = 60;
}
export function damageAlly(a: any, d: number) {
  if (!a.alive) return;
  if (SHARED.client && a.nid) return;   // Schaden rechnet der Gastgeber
  a.hp -= d;
  if (a.hp <= 0) {
    a.alive = false;
    scene.remove(a.mesh);
    allyBoom(a);
    if (a.nid) hostEvent(['x', 'a', a.nid]);
    npcRadio(a.name, 'Ich bin getroffen! Steige aus!', a.col);
  }
}
function allyBoom(a: any) { burst(a.x, a.y, a.z, '#ffb347', 90, 70, 1.2); const ov = outVol(a.x, a.y, a.z); if (ov > 0.02) boom(0.5 * ov, 1, () => snd(100, 0.6, 'sawtooth', 0.05 * ov, -60)); }
export function updateAllies(dt: number) {
  if (SHARED.client) { mirrorAllies(dt); return; }   // Mitspieler: Patrouillen kommen vom Gastgeber
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
    let tx: number, ty: number, tz: number, spd = 220;
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
    orientAlly(w);
    w.cool -= dt;
    if (w.target && w.cool <= 0) {
      const e = w.target;
      _v.set(e.x - w.x, e.y - w.y, e.z - w.z);
      const dd = _v.length();
      _v.normalize();
      _v2.set(w.vx, w.vy, w.vz).normalize();
      if (dd < 700 && _v.dot(_v2) > 0.94) {
        w.cool = 0.5;   // Verbündete halten Gegner beschäftigt, statt sie abzuräumen: seltener, ungenauer, schwächer
        const lead = dd / 1300;
        _v.set(e.x + e.vx * lead - w.x + rand(-16, 16), e.y + e.vy * lead - w.y + rand(-16, 16), e.z + e.vz * lead - w.z + rand(-16, 16)).normalize();
        fireBullet(world.bullets, w.x + _v.x * 8, w.y + _v.y * 8, w.z + _v.z * 8, _v.x, _v.y, _v.z, 1300, 0.7, 4, 'w');
        const ov = outVol(w.x, w.y, w.z, 250);                       // nach Entfernung zum Hörer (vorher zum Schiff: zu Fuß daneben voll laut)
        if (ov > 0.04) gunSound(0.4 * ov);
      }
    }
  }
}
function orientAlly(w: any) {
  w.mesh.position.set(w.x, w.y, w.z);
  const sp = Math.hypot(w.vx, w.vy, w.vz);
  if (sp > 20) w.mesh.lookAt(w.x - w.vx, w.y - w.vy, w.z - w.vz);
  w.f.glows.forEach((g: THREE.Sprite) => g.scale.setScalar(2.5 + sp / 90));
}

// =====================================================================================
// Mehrspieler: Verkehr und Patrouillen gemeinsam
// Der Gastgeber des Sektors steuert Frachter und Patrouillenjäger und schickt ihren Stand mit dem Ferrox-Stand
// (10× pro Sekunde). Mitspieler zeigen sie nur an und führen sie weich nach; Schaden, Verluste und Funk
// kommen vom Gastgeber (Ereignisse: Funk 'r', Explosion 'x', Sprung durchs Tor 'g').
// =====================================================================================
const CIV = Object.keys(SHIPDEF) as CivType[];
let nextNpcId = 1;
const r1 = (v: number) => Math.round(v * 10) / 10;
// Gastgeber: Stand für die Mitspieler
export function npcSnapshot() {
  const t = world.traffic.map(o => { if (!o.nid) o.nid = nextNpcId++; return [o.nid, CIV.indexOf(o.type), o.name, r1(o.x), r1(o.y), r1(o.z), r1(o.vx), r1(o.vy), r1(o.vz), Math.ceil(o.hp), o.maxhp, o.hitT > 0 ? 1 : 0]; });
  const a = world.allies.filter(o => o.alive).map(o => { if (!o.nid) o.nid = nextNpcId++; return [o.nid, CALLSIGNS.findIndex(c => c[0] === o.name), r1(o.x), r1(o.y), r1(o.z), r1(o.vx), r1(o.vy), r1(o.vz), Math.ceil(o.hp)]; });
  return { t, a };
}
// Gastgeber geworden: Kennungen fortsetzen, eigene Steuerung übernimmt
export function npcBecameHost() {
  for (const o of [...world.traffic, ...world.allies]) { nextNpcId = Math.max(nextNpcId, (o.nid || 0) + 1); delete o._t; }
  for (const w of world.allies) { if (!w.home) w.home = pick(world.stations); w.rt = 0; }
  // übernommene Frachter: neues Ziel (Tor), sonst blieben sie am letzten Punkt stehen
  for (const t of world.traffic) if (!t.goal.gate && !t.goal.station && world.gates.length) t.goal = gateGoal(pick(world.gates));
}
let npcSynced = false;
export function npcResync() { npcSynced = false; }
// Mitspieler: Stand des Gastgebers übernehmen
export function applyNpc(n: any, ev: any[]) {
  if (!SHARED.client || !world.def) return;
  if (!npcSynced) {
    // eigene Startbelegung durch die des Gastgebers ersetzen
    for (let i = world.traffic.length - 1; i >= 0; i--) removeTraffic(i);
    for (const a of world.allies) scene.remove(a.mesh);
    world.allies.length = 0;
    npcSynced = true;
  }
  const now = performance.now();
  // Ereignisse zuerst (Explosion und Sprung brauchen noch die Lage)
  for (const e of ev || []) {
    if (e[0] === 'r') { radio(e[1], e[2], e[3] || undefined); if (e[4] === 'alarm') { crewAngriff(P.sector); snd(440, 0.25, 'square', 0.04); setTimeout(() => snd(440, 0.25, 'square', 0.04), 350); } }
    else if (e[0] === 'x' && e[1] === 't') { const t = world.traffic.find(o => o.nid === e[2]); if (t) { trafficBoom(t.x, t.y, t.z); removeTraffic(world.traffic.indexOf(t)); } }
    else if (e[0] === 'x' && e[1] === 'a') { const a = world.allies.find(o => o.nid === e[2]); if (a && a.alive) { a.alive = false; scene.remove(a.mesh); allyBoom(a); } }
    else if (e[0] === 'k') { const t = world.traffic.find(o => o.nid === e[1]); if (t) removeTraffic(world.traffic.indexOf(t)); }
    else if (e[0] === 'g') { const t = world.traffic.find(o => o.nid === e[1]); if (t) { burst(t.x, t.y, t.z, '#ffffff', 50, 70, 0.8); const ng = nearGate(t.x, t.y, t.z); if (ng) gateFlash(ng); snd(200, 0.5, 'sine', 0.02, 400); removeTraffic(world.traffic.indexOf(t)); } }
  }
  if (!n) return;
  const seenT = new Set<number>();
  for (const [id, ti, name, x, y, z, vx, vy, vz, hp, maxhp, hit] of n.t || []) {
    seenT.add(id);
    let t = world.traffic.find(o => o.nid === id);
    if (!t) {
      const type = CIV[ti] || CIV[0], def = SHIPDEF[type], b = buildCivilian(type);
      for (const gl of b.glows) gl.userData.base = gl.scale.x / 10;
      b.g.position.set(x, y, z); scene.add(b.g);
      b.g.lookAt(x - vx, y - vy, z - vz);
      t = { type, def, name: String(name), x, y, z, vx, vy, vz, hp, maxhp, sph: def.sph, R: def.R, mesh: b.g, parts: b, goal: { x, y, z }, wait: 0, hitT: 0, alertT: 0, alive: true, spd: def.spd, nid: id };
      world.traffic.push(t);
    }
    t.hp = hp; t.maxhp = maxhp; if (hit) t.hitT = 0.3;
    t._t = { x, y, z, vx, vy, vz, at: now };
  }
  for (let i = world.traffic.length - 1; i >= 0; i--) { const t = world.traffic[i]; if (!t.nid || !seenT.has(t.nid)) removeTraffic(i); }
  const seenA = new Set<number>();
  for (const [id, ci, x, y, z, vx, vy, vz, hp] of n.a || []) {
    seenA.add(id);
    let a = world.allies.find(o => o.nid === id);
    if (!a) {
      const k = Math.max(0, ci), cs = CALLSIGNS[k] || CALLSIGNS[0], f = buildAllyModel(k, cs[1]);
      f.g.position.set(x, y, z); scene.add(f.g);
      a = { name: cs[0], col: cs[2], x, y, z, vx, vy, vz, hp, maxhp: 140, cool: 0, mesh: f.g, f, alive: true, target: null, rt: 0, home: null, orbit: 0, side: 1, nid: id };
      world.allies.push(a);
    }
    a.hp = hp;
    a._t = { x, y, z, vx, vy, vz, at: now };
  }
  for (let i = world.allies.length - 1; i >= 0; i--) { const a = world.allies[i]; if (!a.nid || !seenA.has(a.nid)) { if (a.alive) scene.remove(a.mesh); world.allies.splice(i, 1); } }
}
// weich nachführen: letzter Stand plus Flugweg seitdem
function follow(o: any, dt: number, rate: number) {
  const t = o._t; if (!t) return;
  const ahead = (performance.now() - t.at) / 1000, k = Math.min(1, dt * rate);
  o.x += (t.x + t.vx * ahead - o.x) * k; o.y += (t.y + t.vy * ahead - o.y) * k; o.z += (t.z + t.vz * ahead - o.z) * k;
  o.vx = t.vx; o.vy = t.vy; o.vz = t.vz;
}
function mirrorTraffic(dt: number) {
  updateFlashes(dt);
  for (const t of world.traffic) { t.hitT = Math.max(0, t.hitT - dt); follow(t, dt, 4); orientTraffic(t, dt); }
}
function mirrorAllies(dt: number) {
  for (const w of world.allies) if (w.alive) { follow(w, dt, 10); orientAlly(w); }
}
