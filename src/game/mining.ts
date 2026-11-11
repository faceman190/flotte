import * as THREE from 'three';
import { scene, glowMat } from '../core/engine';
import { rand, d3 } from '../core/util';
import { snd, laserSound, sfx, boom } from '../core/audio';
import { ITEMS, type ItemId } from '../data/items';
import { P, G, stats, cargoUsed } from './state';
import { world, pickOre, removeAst, makeAst, dropPick, astHooks, type Asteroid } from './world';
import { SHARED } from './shared';
import { burst, puff } from './fx';
import { SHIP, hurtPlayer } from './player';
import { hitEnemy } from './combat';
import { buildDrone } from '../models/playerShips';
import { radio } from '../ui/radio';

const _o = new THREE.Vector3(), _d = new THREE.Vector3(), _h = new THREE.Vector3(), _y = new THREE.Vector3(0, 1, 0), _e = new THREE.Euler(0, 0, 0, 'YXZ');
const shipPos = () => new THREE.Vector3(P.x, P.y, P.z);

// =============== Gemeinsam: Erz entnehmen, Asteroid schrumpft und zerfällt ===============
let fullWarn = 0;
function extractOne(a: Asteroid, to: THREE.Vector3, from: THREE.Vector3) {
  if (cargoUsed() >= stats().cargo) {
    if (fullWarn <= 0) { radio('SYSTEM', 'Frachtraum voll! An einer Station verkaufen, einlagern oder raffinieren.'); fullWarn = 6; }
    return false;
  }
  const k = pickOre(a);
  P.cargo[k]++;
  P.mined++;
  a.yld--;
  if (SHARED.client) astHooks.yld(a);
  snd(1000 + Math.random() * 200, 0.05, 'sine', 0.02, 300);
  const dir = new THREE.Vector3().subVectors(to, from), len = dir.length();
  dir.normalize().multiplyScalar(len / 0.45);
  for (let i = 0; i < 6; i++) puff(from.x, from.y, from.z, dir.x + rand(-8, 8), dir.y + rand(-8, 8), dir.z + rand(-8, 8), ITEMS[k].c, 0.45);
  const f = Math.max(0, a.yld / a.max), sc = 0.45 + 0.55 * Math.cbrt(f);
  a.mesh.scale.setScalar(sc);
  a.r = a.r0 * sc;
  if (a.yld <= 0) crumble(a);
  return true;
}
export function crumble(a: Asteroid, remote = false) {
  const i = world.asteroids.indexOf(a);
  if (i < 0) return;
  if (SHARED.client && !remote) astHooks.gone(a, 'mined');
  burst(a.x, a.y, a.z, ITEMS[a.comp[0].k].c, 40, a.r0 * 1.4, 1.1);
  burst(a.x, a.y, a.z, '#8a8f9a', 24, a.r0, 1.4);
  sfx('rock' + Math.floor(Math.random() * 3), 0.6, 0.85 + Math.random() * 0.3, () => snd(120, 0.4, 'triangle', 0.05, -60));
  removeAst(i);
  if (MINE.target === a) MINE.target = null;
}

// =============== Bergbaulaser (ein oder zwei Strahlen) ===============
function makeBeam() {
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1, 8, 1, true), new THREE.MeshBasicMaterial({ color: 0xff8a30, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1, 6, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0d0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
  const g = new THREE.Group(); g.add(outer, core); g.visible = false; scene.add(g);
  return { g, outer };
}
const beams = [makeBeam(), makeBeam()];
const hitGlow = new THREE.Sprite(glowMat(0xffa040, 1));
hitGlow.visible = false;
scene.add(hitGlow);

export const MINE = { target: null as Asteroid | null, dist: 0, firing: false, acc: 0, hum: 0 };

function aimTarget(range: number) {
  _e.set(P.pitch, P.yaw, 0);
  _d.set(0, 0, -1).applyEuler(_e);
  _o.set(P.x, P.y, P.z).addScaledVector(_d, stats().radius);
  let best: Asteroid | null = null, bt = range;
  for (const a of world.asteroids) {
    const ox = a.x - _o.x, oy = a.y - _o.y, oz = a.z - _o.z, t = ox * _d.x + oy * _d.y + oz * _d.z;
    if (t < 0 || t - a.r > bt) continue;
    const d2 = ox * ox + oy * oy + oz * oz - t * t, r2 = a.r * a.r;
    if (d2 > r2) continue;
    const th = t - Math.sqrt(r2 - d2);
    if (th < bt) { bt = Math.max(0, th); best = a; }
  }
  return { a: best, t: bt };
}
function setBeam(b: { g: THREE.Group; outer: THREE.Mesh }, from: THREE.Vector3, to: THREE.Vector3) {
  b.g.position.copy(from).add(to).multiplyScalar(0.5);
  b.g.quaternion.setFromUnitVectors(_y, _h.copy(to).sub(from).normalize());
  b.g.scale.set(1, from.distanceTo(to), 1);
  const fl = 0.85 + Math.random() * 0.3;
  b.outer.scale.set(fl, 1, fl);
  b.g.visible = true;
}
function hideBeams() { for (const b of beams) b.g.visible = false; hitGlow.visible = false; }

export function updateMining(dt: number, wantFire: boolean) {
  const st = stats();
  fullWarn -= dt;
  const aim = P.tool === 'laser' || P.tool === 'charge' ? aimTarget(P.tool === 'charge' ? 500 : st.laserRange) : { a: null, t: 0 };
  MINE.target = aim.a;
  MINE.dist = aim.t;
  const fire = P.tool === 'laser' && st.laser && wantFire && !G.overheat && !G.dead;
  MINE.firing = fire;
  if (!fire) {
    G.heat = Math.max(0, G.heat - st.laserCool * dt * (G.overheat ? 0.8 : 1));
    if (G.overheat && G.heat <= 35) { G.overheat = false; snd(700, 0.15, 'sine', 0.03, 200); }
    hideBeams();
    laserSound(false);
    return;
  }
  G.heat += st.laserHeat * dt;
  if (G.heat >= 100) {
    G.heat = 100; G.overheat = true;
    snd(160, 0.5, 'sawtooth', 0.05, -80);
    radio('SYSTEM', 'Bergbaulaser überhitzt! Kühlt ab …');
  }
  _e.set(P.pitch, P.yaw, G.roll);
  const to = new THREE.Vector3().copy(_o).addScaledVector(_d, aim.a ? aim.t : st.laserRange);
  SHIP.laserPts.forEach((lp, i) => { if (beams[i]) setBeam(beams[i], new THREE.Vector3(lp[0], lp[1], lp[2]).applyEuler(_e).add(shipPos()), to); });
  hitGlow.visible = !!aim.a;
  hitGlow.position.copy(to);
  hitGlow.scale.setScalar((14 + Math.random() * 8) * (st.beams > 1 ? 1.5 : 1));
  // Lasergeräusch (eigene Aufnahme); Ersatz-Brummen, falls die Datei fehlt
  if (!laserSound(true, G.heat)) {
    MINE.hum -= dt;
    if (MINE.hum <= 0) { MINE.hum = 0.12; snd(aim.a ? 90 + Math.random() * 20 : 70, 0.14, 'sawtooth', 0.012, 10); }
  }
  const a = aim.a;
  if (!a) return;
  for (let i = 0; i < 2 * st.beams; i++) puff(to.x, to.y, to.z, rand(-40, 40), rand(-40, 40), rand(-40, 40), Math.random() < 0.5 ? '#ffd27a' : '#ff8a30', 0.35);
  MINE.acc += st.laserRate * st.beams * dt;
  while (MINE.acc >= 1 && a.yld > 0) {
    if (!extractOne(a, shipPos(), to)) { MINE.acc = 0; break; }
    MINE.acc -= 1;
  }
}

// =============== Sprengladungen ===============
// Bleiben am Asteroiden haften und sprengen ihn nach kurzer Zeit in Bruchstücke (mehr Gesamtertrag, manchmal ein seltener Kern).
const CHARGE_GEO = new THREE.SphereGeometry(1.1, 10, 8), CHARGE_M = new THREE.MeshStandardMaterial({ color: 0x404650, metalness: 0.8, roughness: 0.3 });
interface Charge { mesh: THREE.Mesh; light: THREE.Sprite; x: number; y: number; z: number; vx: number; vy: number; vz: number; target: Asteroid | null; off: THREE.Vector3 | null; fuse: number; beep: number }
const charges: Charge[] = [];

export function throwCharge() {
  const st = stats();
  if (!st.maxCharges) { radio('SYSTEM', 'Dieses Schiff hat keine Sprengladungen.'); return; }
  if (P.charges <= 0) { radio('SYSTEM', 'Keine Sprengladungen mehr. An einer Station nachkaufen.'); return; }
  const aim = aimTarget(500);
  if (!aim.a) { radio('SYSTEM', 'Kein Asteroid im Visier (Reichweite 500 m).'); return; }
  P.charges--;
  _e.set(P.pitch, P.yaw, 0);
  const f = new THREE.Vector3(0, 0, -1).applyEuler(_e);
  const m = new THREE.Mesh(CHARGE_GEO, CHARGE_M), light = new THREE.Sprite(glowMat(0xff4040, 1));
  light.scale.setScalar(5); m.add(light);
  const x = P.x + f.x * (st.radius + 4), y = P.y + f.y * (st.radius + 4), z = P.z + f.z * (st.radius + 4);
  m.position.set(x, y, z);
  scene.add(m);
  const dir = new THREE.Vector3(aim.a.x - x, aim.a.y - y, aim.a.z - z).normalize().multiplyScalar(260);
  charges.push({ mesh: m, light, x, y, z, vx: dir.x + P.vx, vy: dir.y + P.vy, vz: dir.z + P.vz, target: aim.a, off: null, fuse: 2.8, beep: 0 });
  snd(300, 0.15, 'square', 0.04, -100);
}

function explode(c: Charge) {
  scene.remove(c.mesh);
  burst(c.x, c.y, c.z, '#ffd27a', 120, 110, 1.1);
  burst(c.x, c.y, c.z, '#ff7040', 80, 80, 1.4);
  burst(c.x, c.y, c.z, '#8a8f9a', 60, 60, 2);
  boom(1, 0.72, () => snd(70, 1, 'sawtooth', 0.09, -40));
  const dp = d3(c.x, c.y, c.z, P.x, P.y, P.z);
  if (dp < 400) G.shake = Math.min(2.5, G.shake + (400 - dp) / 160);
  if (dp < 45 + stats().radius) hurtPlayer(30);
  for (let j = world.enemies.length - 1; j >= 0; j--) { const e = world.enemies[j]; if (d3(e.x, e.y, e.z, c.x, c.y, c.z) < 80) hitEnemy(e, j, 140, true); }
  const a = c.target;
  if (!a || !world.asteroids.includes(a)) return;
  blastAst(a, true);
}
// Gesprengter Asteroid: große zerfallen in drei Bruchstücke, kleine in Erzbrocken; local = Beute für diesen Piloten
export function blastAst(a: Asteroid, local: boolean) {
  const i = world.asteroids.indexOf(a);
  if (i < 0) return;
  removeAst(i);
  if (MINE.target === a) MINE.target = null;
  const zone = world.def?.faction || 'core';
  const big = a.r0 >= 26 && a.yld >= 4;
  if (SHARED.client && local) {
    // Mitspieler: Bruchstücke kommen vom Gastgeber, Erzbrocken und Kern bleiben hier
    astHooks.gone(a, 'blast');
    if (!big) for (let k = 0; k < Math.max(1, Math.round(a.yld * 0.9)); k++) dropPick(a.x, a.y, a.z, pickOre(a), 1, 45);
  } else if (big) {
    const nr = a.r0 >= 40 ? 30 : 16, each = Math.max(2, Math.round(a.yld * 0.42));
    for (let k = 0; k < 3; k++) {
      const ang = k / 3 * Math.PI * 2 + rand(-0.4, 0.4), ox = Math.cos(ang), oz = Math.sin(ang);
      const fr = makeAst(a.x + ox * a.r * 0.6, a.y + rand(-6, 6), a.z + oz * a.r * 0.6, nr, a.kind, a.field, a.comp, 1);
      fr.yld = Math.min(fr.max, each); fr.max = Math.max(fr.max, each);
      fr.vx = a.vx + ox * rand(14, 26); fr.vz = a.vz + oz * rand(14, 26); fr.vy = rand(-6, 6);
      fr.scanT = 75;
    }
  } else if (local) {
    const n = Math.max(1, Math.round(a.yld * 0.9));
    for (let k = 0; k < n; k++) dropPick(a.x, a.y, a.z, pickOre(a), 1, 45);
  }
  // Seltener Kern
  if (local && Math.random() < 0.3) {
    const rare: ItemId = zone === 'core' ? 'titan' : 'iridium', n = zone === 'core' ? 2 : 1;
    for (let k = 0; k < n; k++) dropPick(a.x, a.y, a.z, rare, 1, 30);
    radio('SYSTEM', `Seltener Kern freigelegt: ${ITEMS[rare].n}!`);
  }
}

function updateCharges(dt: number) {
  for (let i = charges.length - 1; i >= 0; i--) {
    const c = charges[i], a = c.target;
    if (!c.off) {
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (a && world.asteroids.includes(a) && d3(c.x, c.y, c.z, a.x, a.y, a.z) < a.r + 0.5) {
        c.off = new THREE.Vector3(c.x - a.x, c.y - a.y, c.z - a.z).setLength(a.r);
        snd(500, 0.08, 'square', 0.03);
      }
    } else if (a && world.asteroids.includes(a)) { c.x = a.x + c.off.x; c.y = a.y + c.off.y; c.z = a.z + c.off.z; }
    c.mesh.position.set(c.x, c.y, c.z);
    c.fuse -= dt;
    c.beep -= dt;
    const fast = c.fuse < 1;
    c.light.visible = Math.sin(G.time * (fast ? 30 : 12)) > 0;
    if (c.beep <= 0) { c.beep = fast ? 0.15 : 0.45; if (d3(c.x, c.y, c.z, P.x, P.y, P.z) < 900) snd(1300, 0.05, 'square', 0.02); }
    if (c.fuse <= 0) { charges.splice(i, 1); explode(c); }
  }
}
export const chargeCount = () => charges.length;

// =============== Bergbaudrohnen (Maulwurf) ===============
interface Drone { i: number; mesh: THREE.Group | null; line: THREE.Line; state: 'dock' | 'fly' | 'mine' | 'back'; target: Asteroid | null; x: number; y: number; z: number; acc: number }
const LINE_M = new THREE.LineBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending });
const drones: Drone[] = [];
export const droneInfo = () => drones.map(d => d.state);

function dockPos(i: number) {
  const d = SHIP.drones[i];
  return d ? d.getWorldPosition(new THREE.Vector3()) : shipPos();
}
function ensureDrones(n: number) {
  while (drones.length < n) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), LINE_M);
    line.visible = false; line.frustumCulled = false; scene.add(line);
    drones.push({ i: drones.length, mesh: null, line, state: 'dock', target: null, x: 0, y: 0, z: 0, acc: 0 });
  }
}
function pickDroneTarget(d: Drone) {
  let best: Asteroid | null = null, bs = Infinity;
  for (const a of world.asteroids) {
    if (a.yld <= 0 || a === MINE.target || drones.some(o => o !== d && o.target === a)) continue;
    const dist = d3(a.x, a.y, a.z, P.x, P.y, P.z);
    if (dist > 650) continue;
    const score = dist * (a.scanT > 0 ? 0.6 : 1);
    if (score < bs) { bs = score; best = a; }
  }
  return best;
}
export function resetDrones() {
  for (const d of drones) { if (d.mesh) scene.remove(d.mesh); d.mesh = null; d.state = 'dock'; d.target = null; d.line.visible = false; }
  SHIP.drones.forEach(m => (m.visible = true));
}
function updateDrones(dt: number) {
  const st = stats();
  if (!st.drones) { if (drones.some(d => d.mesh)) resetDrones(); return; }
  ensureDrones(st.drones);
  const active = P.dronesOn && G.mode === 'play' && !G.dead, full = cargoUsed() >= st.cargo;
  for (let n = 0; n < st.drones; n++) {
    const d = drones[n];
    if (d.state === 'dock') {
      SHIP.drones[n] && (SHIP.drones[n].visible = true);
      if (!active || full) continue;
      const t = pickDroneTarget(d);
      if (!t) continue;
      const p = dockPos(n);
      d.x = p.x; d.y = p.y; d.z = p.z; d.target = t; d.state = 'fly';
      d.mesh = buildDrone(); scene.add(d.mesh);
      if (SHIP.drones[n]) SHIP.drones[n].visible = false;
      continue;
    }
    const far = d3(d.x, d.y, d.z, P.x, P.y, P.z) > 950;
    if ((!active || full || far) && d.state !== 'back') { d.state = 'back'; d.target = null; }
    if (d.target && !world.asteroids.includes(d.target)) { d.target = active && !full ? pickDroneTarget(d) : null; d.state = d.target ? 'fly' : 'back'; }
    let gx: number, gy: number, gz: number;
    if (d.state === 'back') { const p = dockPos(n); gx = p.x; gy = p.y; gz = p.z; }
    else {
      const a = d.target!, dir = new THREE.Vector3(d.x - a.x, d.y - a.y, d.z - a.z).normalize();
      gx = a.x + dir.x * (a.r + 10); gy = a.y + dir.y * (a.r + 10); gz = a.z + dir.z * (a.r + 10);
    }
    const dx = gx - d.x, dy = gy - d.y, dz = gz - d.z, dist = Math.hypot(dx, dy, dz);
    const sp = Math.min(160, dist * 3 + 10) * dt;
    if (dist > 0.5) { d.x += dx / dist * Math.min(sp, dist); d.y += dy / dist * Math.min(sp, dist); d.z += dz / dist * Math.min(sp, dist); }
    d.mesh!.position.set(d.x, d.y, d.z);
    d.mesh!.rotation.y += dt * 2;
    if (d.state === 'back' && dist < 4) {
      scene.remove(d.mesh!); d.mesh = null; d.state = 'dock'; d.line.visible = false;
      continue;
    }
    if (d.state === 'fly' && dist < 6) d.state = 'mine';
    if (d.state === 'mine' && d.target) {
      const a = d.target, pos = d.line.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, d.x, d.y, d.z); pos.setXYZ(1, a.x, a.y, a.z); pos.needsUpdate = true;
      d.line.visible = Math.random() > 0.1;
      if (Math.random() < 0.5) puff(a.x + (d.x - a.x) * (a.r / (a.r + 10)), a.y + (d.y - a.y) * (a.r / (a.r + 10)), a.z + (d.z - a.z) * (a.r / (a.r + 10)), rand(-20, 20), rand(-20, 20), rand(-20, 20), '#ffd27a', 0.3);
      d.acc += st.droneRate * dt;
      while (d.acc >= 1 && a.yld > 0) {
        d.acc -= 1;
        if (!extractOne(a, shipPos(), new THREE.Vector3(d.x, d.y, d.z))) { d.state = 'back'; break; }
      }
    } else d.line.visible = false;
  }
}

// =============== Scanner ===============
const pulse = new THREE.Mesh(
  new THREE.RingGeometry(0.985, 1, 128),
  new THREE.MeshBasicMaterial({ color: 0x7cc4ff, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }),
);
pulse.rotation.x = -Math.PI / 2;
pulse.visible = false;
scene.add(pulse);
export const SCAN = { cool: 0, t: -1, range: 0 };

export function scan() {
  if (SCAN.cool > 0 || G.dead) return;
  const st = stats();
  SCAN.cool = 4;
  SCAN.t = 0;
  SCAN.range = st.scan;
  pulse.position.set(P.x, P.y, P.z);
  pulse.visible = true;
  snd(500, 0.9, 'sine', 0.05, 900);
  let n = 0;
  for (const a of world.asteroids) if (Math.hypot(a.x - P.x, a.y - P.y, a.z - P.z) < st.scan) { a.scanT = 75; n++; }
  if (!n) radio('SYSTEM', 'Scan: keine Asteroiden in Reichweite.');
}
export function updateScan(dt: number) {
  SCAN.cool = Math.max(0, SCAN.cool - dt);
  for (const a of world.asteroids) if (a.scanT > 0) a.scanT -= dt;
  updateCharges(dt);
  updateDrones(dt);
  if (SCAN.t < 0) return;
  SCAN.t += dt;
  const k = Math.min(1, SCAN.t / 1.1);
  pulse.scale.setScalar(Math.max(1, SCAN.range * k));
  (pulse.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - k);
  if (k >= 1) { SCAN.t = -1; pulse.visible = false; }
}
export function hideMiningFx() {
  hideBeams();
  laserSound(false);
  pulse.visible = false; SCAN.t = -1;
  for (const c of charges) scene.remove(c.mesh);
  charges.length = 0;
  resetDrones();
}
