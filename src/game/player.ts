import * as THREE from 'three';
import { scene, view } from '../core/engine';
import { keys, mouse, actions, look } from '../core/input';
import { rand, clamp, d3 } from '../core/util';
import { snd, gunSound, sfx, boom } from '../core/audio';
import { buildShipModel, type ShipModel } from '../models/playerShips';
import type { ShipId } from '../data/ships';
import type { Paint } from '../models/gltfShips';
import { ITEMS, ITEM_IDS } from '../data/items';
import { P, G, stats, cargoUsed, settings } from './state';
import { world, SECTOR_RADIUS } from './world';
import { burst, puff } from './fx';
import { fireBullet, launchRocket } from './combat';
import { radio } from '../ui/radio';
import { updateMining, throwCharge } from './mining';

// Das Modell des aktiven Schiffs (wird beim Umsteigen ausgetauscht)
export let SHIP: ShipModel = buildShipModel('falke');
let shipKey = 'falke:Orange:proc';
SHIP.g.visible = false;
scene.add(SHIP.g);
export function setShipModel(cls: ShipId, paint: Paint = 'Orange', force = false) {
  const key = `${cls}:${paint}`;
  if (key === shipKey && !force) return;
  scene.remove(SHIP.g);
  SHIP.g.traverse((c: any) => { if (c.isMesh) c.geometry.dispose(); });
  SHIP = buildShipModel(cls, paint);
  shipKey = key;
  SHIP.g.visible = false;
  scene.add(SHIP.g);
}

const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _v = new THREE.Vector3();
export function fwd() { _e.set(P.pitch, P.yaw, 0); return new THREE.Vector3(0, 0, -1).applyEuler(_e); }
function right() { return new THREE.Vector3(Math.cos(P.yaw), 0, -Math.sin(P.yaw)); }
export const playerTargetable = () => G.mode === 'play' && !G.dead;
export const hooks = { respawn: () => {} };

export function placePlayer(x: number, y: number, z: number, yaw: number, speed = 0) {
  P.x = x; P.y = y; P.z = z; P.yaw = yaw; P.pitch = 0;
  const f = fwd();
  P.vx = f.x * speed; P.vy = f.y * speed; P.vz = f.z * speed;
  G.camInit = false;
  SHIP.g.visible = true;
}

export function hurtPlayer(d: number) {
  if (!playerTargetable()) return;
  G.sinceHit = 0;
  G.shake = Math.min(1.6, G.shake + d * 0.05);
  (SHIP.shield.material as THREE.MeshBasicMaterial).opacity = P.shield > 0 ? 0.45 : 0;
  if (P.shield > 0) { const a = Math.min(P.shield, d); P.shield -= a; d -= a; }
  P.hull -= d;
  // Treffer: Schild knistert, blanke Hülle scheppert
  sfx(P.shield > 0 ? 'shield_hit' : 'hull_hit' + Math.floor(Math.random() * 3), P.shield > 0 ? 0.45 : 0.6, 0.9 + Math.random() * 0.2, () => snd(140, 0.12, 'sawtooth', 0.05, -60));
  if (P.hull <= 0) die();
}
function die() {
  G.dead = 4;
  P.hull = 0;
  SHIP.g.visible = false;
  burst(P.x, P.y, P.z, '#ffb347', 140, 90, 1.5);
  burst(P.x, P.y, P.z, '#ffffff', 60, 50, 0.8);
  G.shake = 2.5;
  boom(1, 0.75, () => snd(90, 0.8, 'sawtooth', 0.09, -60));
  const lost = cargoUsed();
  for (const k of ITEM_IDS) P.cargo[k] = 0;
  radio('SYSTEM', `Jäger zerstört! Rettungskapsel ausgestoßen.${lost ? ' Fracht verloren.' : ''} Ein neuer Jäger wartet im Heimathafen.`);
}

// Kollision mit einem Großobjekt (Kugelliste relativ zur Objektmitte)
function collideBig(o: { x: number; y: number; z: number; sph: number[][]; R: number }, rad: number) {
  if (d3(P.x, P.y, P.z, o.x, o.y, o.z) > o.R + 30 + rad) return;
  for (const s of o.sph) {
    const cx = o.x + s[0], cy = o.y + s[1], cz = o.z + s[2], dd = d3(P.x, P.y, P.z, cx, cy, cz), m = s[3] + rad;
    if (dd < m && dd > 0) {
      const nx = (P.x - cx) / dd, ny = (P.y - cy) / dd, nz = (P.z - cz) / dd;
      P.x = cx + nx * m; P.y = cy + ny * m; P.z = cz + nz * m;
      const vn = P.vx * nx + P.vy * ny + P.vz * nz;
      if (vn < 0) { P.vx -= 1.5 * vn * nx; P.vy -= 1.5 * vn * ny; P.vz -= 1.5 * vn * nz; if (-vn > 140) hurtPlayer(-vn * 0.04); }
    }
  }
}

let boundWarn = 0, fullWarn = 0, chargeHeld = false;
export function updatePlayer(dt: number) {
  const st = stats();
  if (G.dead) { updateMining(dt, false); G.dead -= dt; if (G.dead <= 0) { G.dead = 0; hooks.respawn(); } return; }
  // ---- Steuerung ----
  const hw = Math.max(1, view.W / 2), hh = Math.max(1, view.H / 2);
  let mx = view.W > 2 ? (mouse.x - hw) / hw : 0, my = view.H > 2 ? (mouse.y - hh) / hh : 0;
  const dz = 0.05, sh = (v: number) => Math.sign(v) * Math.max(0, Math.abs(v) - dz) / (1 - dz);
  mx = sh(clamp(mx, -1, 1)); my = sh(clamp(my, -1, 1));
  if (look.free) { mx = 0; my = 0; }   // freie Kamera: Maus dreht die Kamera, das Schiff hält Kurs (Pfeiltasten lenken weiter)
  if (keys.ArrowLeft) mx = -1; if (keys.ArrowRight) mx = 1; if (keys.ArrowUp) my = -1; if (keys.ArrowDown) my = 1;
  if (settings.invertY) my = -my;
  const sens = settings.sens;
  const yawRate = -(mx * 0.5 + mx * Math.abs(mx) * 0.5) * 2.1 * sens * st.turn, pitchRate = -(my * 0.5 + my * Math.abs(my) * 0.5) * 1.6 * sens * st.turn;
  P.yaw += yawRate * dt;
  P.pitch = clamp(P.pitch + pitchRate * dt, -1.15, 1.15);
  G.roll += ((yawRate * 0.42 + (keys.KeyA ? 0.35 : 0) - (keys.KeyD ? 0.35 : 0)) - G.roll) * Math.min(1, dt * 5);
  const f = fwd(), r = right();
  let th = 0;
  if (keys.KeyW) { P.vx += f.x * st.acc * dt; P.vy += f.y * st.acc * dt; P.vz += f.z * st.acc * dt; th = 1; }
  if (keys.KeyS) { P.vx -= f.x * st.acc * 0.6 * dt; P.vy -= f.y * st.acc * 0.6 * dt; P.vz -= f.z * st.acc * 0.6 * dt; }
  const sx = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  if (sx) { P.vx += r.x * sx * st.acc * 0.7 * dt; P.vz += r.z * sx * st.acc * 0.7 * dt; }
  const drag = Math.pow(th || sx ? 0.75 : keys.KeyS ? 0.25 : 0.5, dt);
  P.vx *= drag; P.vy *= drag; P.vz *= drag;
  const sp = Math.hypot(P.vx, P.vy, P.vz);
  if (sp > st.max) { const k = st.max / sp; P.vx *= k; P.vy *= k; P.vz *= k; }
  P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
  G.thrust += (th - G.thrust) * Math.min(1, dt * 6);
  // ---- Sektorgrenze bzw. Boden und Rand auf Planeten ----
  const hd = world.surface ? 0 : Math.hypot(P.x, P.z);
  if (world.surface && world.ground) {
    const g = world.ground(P.x, P.z) + st.radius * 0.6;
    if (P.y < g) { if (P.vy < -70) hurtPlayer(-P.vy * 0.08); P.y = g; P.vy = Math.max(0, P.vy); }
    const lim = world.surface.limit;
    if (Math.abs(P.x) > lim) P.vx -= Math.sign(P.x) * 900 * dt;
    if (Math.abs(P.z) > lim) P.vz -= Math.sign(P.z) * 900 * dt;
    if ((Math.abs(P.x) > lim || Math.abs(P.z) > lim) && boundWarn <= 0) { radio('SYSTEM', 'Ende des kartierten Gebiets. Steig auf, um in den Orbit zurückzukehren.'); boundWarn = 10; }
  }
  boundWarn -= dt;
  if (hd > SECTOR_RADIUS) {
    P.vx -= P.x / hd * 900 * dt; P.vz -= P.z / hd * 900 * dt;
    if (boundWarn <= 0) { radio('SYSTEM', 'Sektorgrenze erreicht. Andere Sektoren erreichst du über die Sprungtore.'); boundWarn = 10; }
  }
  if (!world.surface && Math.abs(P.y) > 1600) P.vy -= Math.sign(P.y) * 900 * dt;
  // ---- Kollisionen ----
  for (const s of world.stations) collideBig(s, st.radius);
  for (const s of world.traffic) collideBig(s, st.radius);
  for (const a of world.asteroids) {
    const dd = d3(a.x, a.y, a.z, P.x, P.y, P.z), m = a.r + st.radius;
    if (dd < m && dd > 0) {
      const nx = (P.x - a.x) / dd, ny = (P.y - a.y) / dd, nz = (P.z - a.z) / dd;
      P.x = a.x + nx * m; P.y = a.y + ny * m; P.z = a.z + nz * m;
      const vn = (P.vx - a.vx) * nx + (P.vy - a.vy) * ny + (P.vz - a.vz) * nz;
      if (vn < 0) {
        P.vx -= 1.6 * vn * nx; P.vy -= 1.6 * vn * ny; P.vz -= 1.6 * vn * nz;
        a.vx += vn * nx * 0.2; a.vy += vn * ny * 0.2; a.vz += vn * nz * 0.2;
        if (-vn > 120) hurtPlayer(-vn * 0.05);
      }
    }
  }
  // ---- Abgasspur ----
  if (th || Math.random() < 0.3) {
    _e.set(P.pitch, P.yaw, G.roll);
    for (const ep of SHIP.enginePts) {
      _v.set(ep[0], ep[1], ep[2]).applyEuler(_e);
      puff(P.x + _v.x, P.y + _v.y, P.z + _v.z, P.vx * 0.3 - f.x * rand(40, 90) + rand(-6, 6), P.vy * 0.3 - f.y * rand(40, 90) + rand(-6, 6), P.vz * 0.3 - f.z * rand(40, 90) + rand(-6, 6), th ? '#ffb070' : '#7a4a28', th ? 0.45 : 0.25);
    }
  }
  // ---- Zielerfassung ----
  let best = 0.965;
  G.lockT = null;
  for (const e of world.enemies) {
    _v.set(e.x - P.x, e.y - P.y, e.z - P.z);
    const d = _v.length();
    if (d > 1400) continue;
    _v.divideScalar(d);
    const c = _v.dot(f);
    if (c > best) { best = c; G.lockT = e; }
  }
  // ---- Kanonen ----
  G.cool -= dt;
  fullWarn -= dt;
  const trig = mouse.down || !!keys.Space;
  updateMining(dt, trig);
  if (P.tool === 'charge' && trig && !chargeHeld) throwCharge();
  chargeHeld = trig;
  if (P.tool === 'guns' && (mouse.down || keys.Space) && G.cool <= 0) {
    if (P.ammo <= 0) {
      if (fullWarn <= 0) { radio('SYSTEM', 'Munition leer! An einer Station nachladen.'); fullWarn = 5; }
    } else {
      G.cool = st.rate;
      const dir = f.clone(), lk = G.lockT;
      if (lk) {
        const d = d3(lk.x, lk.y, lk.z, P.x, P.y, P.z), t = d / 1400;
        _v.set(lk.x + lk.vx * t - P.x, lk.y + lk.vy * t - P.y, lk.z + lk.vz * t - P.z).normalize();
        if (_v.dot(f) > 0.985) dir.copy(_v);
      }
      _e.set(P.pitch, P.yaw, G.roll);
      G.gunSide ^= 1;
      const s = G.gunSide ? 1 : -1, pts: number[][] = SHIP.gunPts.map(q => [q[0] * s, q[1], q[2]]);
      if (P.up.guns >= 2) for (const q of SHIP.extraGunPts) pts.push([q[0] * s, q[1], q[2]]);
      for (const g of pts) {
        _v.set(g[0], g[1], g[2]).applyEuler(_e);
        const b = fireBullet(world.bullets, P.x + _v.x, P.y + _v.y, P.z + _v.z, dir.x + rand(-0.006, 0.006), dir.y + rand(-0.006, 0.006), dir.z + rand(-0.006, 0.006), 1400, 0.75, st.dmg, 'p');
        b.vx += P.vx * 0.5; b.vy += P.vy * 0.5; b.vz += P.vz * 0.5;
      }
      P.ammo--;
      if (!gunSound()) snd(150, 0.05, 'square', 0.02, -60);
    }
  }
  // ---- Rakete ----
  if (actions.rocket) {
    actions.rocket = false;
    if (!st.maxRockets) radio('SYSTEM', `Die ${st.cls.n} hat keine Raketenwerfer.`);
    else if (P.rockets <= 0) radio('SYSTEM', 'Keine Raketen mehr.');
    else if (!G.lockT) radio('SYSTEM', 'Kein Ziel erfasst. Ferrox ins Fadenkreuz nehmen.');
    else {
      P.rockets--;
      _e.set(P.pitch, P.yaw, G.roll);
      _v.set(world.rockets.length % 2 ? 3.6 : -3.6, -0.6, 0).applyEuler(_e);
      launchRocket(P.x + _v.x, P.y + _v.y, P.z + _v.z, P.vx + f.x * 150, P.vy + f.y * 150, P.vz + f.z * 150, G.lockT);
    }
  }
  G.sinceHit += dt;
  if (G.sinceHit > 3) P.shield = Math.min(st.maxShield, P.shield + st.maxShield / 5 * dt);
  guardState();
}

// Sicherheitsnetz: ungültige Zahlen (NaN) nie weiterrechnen, sondern auf den letzten gültigen Zustand zurück
let good = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }, warned = false;
function guardState() {
  const ok = [P.x, P.y, P.z, P.yaw, P.pitch, P.vx, P.vy, P.vz, G.roll].every(Number.isFinite);
  if (ok) { good = { x: P.x, y: P.y, z: P.z, yaw: P.yaw, pitch: P.pitch }; return; }
  if (!warned) { console.warn("Ungültiger Flugzustand zurückgesetzt", { ...P, cargo: undefined }); warned = true; }
  Object.assign(P, good); P.vx = P.vy = P.vz = 0; G.roll = 0;
}

// Beute einsammeln (Traktorstrahl)
export function updatePickups(dt: number) {
  const st = stats();
  for (let i = world.pickups.length - 1; i >= 0; i--) {
    const p = world.pickups[i];
    p.life -= dt;
    const dr = Math.pow(0.3, dt);
    p.vx *= dr; p.vy *= dr; p.vz *= dr;
    const d = d3(p.x, p.y, p.z, P.x, P.y, P.z), room = cargoUsed() + p.amt <= st.cargo, alive = playerTargetable();
    if (alive && d < st.magnet && room) {
      const f = 900 * (1 - d / st.magnet) + 250;
      p.vx += (P.x - p.x) / d * f * dt; p.vy += (P.y - p.y) / d * f * dt; p.vz += (P.z - p.z) / d * f * dt;
    }
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    p.mesh.position.set(p.x, p.y, p.z);
    p.mesh.rotation.y += dt * 3; p.mesh.rotation.x += dt * 1.3;
    p.mesh.visible = !(p.life < 8 && Math.sin(p.life * 12) > 0);
    let gone = p.life <= 0;
    if (alive && d < 6 + st.radius) {
      if (room) { P.cargo[p.k] += p.amt; sfx('pickup', 0.4, 1, () => snd(1000, 0.05, 'sine', 0.03, 300)); gone = true; }
      else if (fullWarn <= 0) { radio('SYSTEM', `Frachtraum voll! ${ITEMS[p.k].n} kann nicht geladen werden. An einer Station verkaufen.`); fullWarn = 5; }
    }
    if (gone) { world.pickups.splice(i, 1); p.mesh.parent?.remove(p.mesh); }
  }
}

export function nearDock() {
  if (G.dead) return null;
  for (const s of world.stations) if (d3(P.x, P.y, P.z, s.dock.x, s.dock.y, s.dock.z) < 84 + stats().radius) return s;
  return null;
}
export function gateHit() {
  if (G.dead) return null;
  for (const g of world.gates) if (d3(P.x, P.y, P.z, g.x, g.y, g.z) < 62) return g;
  return null;
}

// Modell an den Spielerzustand anpassen
export function syncShip() {
  SHIP.g.position.set(P.x, P.y, P.z);
  SHIP.g.rotation.set(P.pitch, P.yaw, G.roll);
  SHIP.extraGuns.visible = P.up.guns >= 2;
  const gs = (2.5 + G.thrust * 3.5) * (1 + P.up.engine * 0.08) * (1 + Math.random() * 0.15);
  SHIP.glows.forEach(g => g.scale.setScalar(gs * (g.userData.base || 1)));
  const sm = SHIP.shield.material as THREE.MeshBasicMaterial;
  sm.opacity = Math.max(0, sm.opacity - 0.016 * 1.5);
}
