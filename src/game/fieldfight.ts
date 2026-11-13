import * as THREE from 'three';
import { scene, camera, view, ux, overlay } from '../core/engine';
import { mouse } from '../core/input';
import { rng, hashStr, clamp } from '../core/util';
import { sfx, snd } from '../core/audio';
import { P, saveGame } from './state';
import { world } from './world';
import { terrainAt } from './surface';
import { buildDrone, buildViewModel, viewModelId, type DroneVis, type ViewModel } from './mineArt';
import { weapon } from './dungeon';
import { gearStat, addItem, canAdd } from './inventory';
import { GEAR_IDS, gearDef } from '../data/gear';
import { SECTOR } from '../data/galaxy';
import { burst } from './fx';
import { radio } from '../ui/radio';
import { SALV } from './salvage';

// =====================================================================================
// Kampf zu Fuß auf Planeten (Alpha 0.85): Ferrox-Wachdrohnen an den Wracks und auf Streife.
// Waffe wie in der Mine (Werte aus dungeon.ts → weapon()), in der Ich-Sicht als Waffenmodell im Bild.
// Lebenspunkte zu Fuß; wer zusammenbricht, wacht am Schiff wieder auf. Drohnen kommen mit dem nächsten Besuch zurück.
// =====================================================================================

interface Foe { x: number; y: number; z: number; hx: number; hz: number; hr: number; hp: number; max: number; alert: boolean; cool: number; ph: number; hit: number; atk: number; vis: DroneVis | null; g: THREE.Object3D; dead: boolean }
interface Bolt { m: THREE.Mesh; x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; dmg: number }
export const FIGHT = { hp: 100, max: 100, cool: 0, kick: 0, flash: 0, hurt: 0, down: 0, foes: [] as Foe[], bolts: [] as Bolt[], lastShot: -99, msg: [] as { t: string; c: string; life: number }[] };
let vm: ViewModel | null = null, tracer: THREE.Line | null = null, tracerT = 0, mflash: THREE.PointLight | null = null, sector = '';
const danger = () => (SECTOR[P.sector] && SECTOR[P.sector].danger) || 1;
const say = (t: string, c = '#dfe8f0') => { FIGHT.msg.unshift({ t, c, life: 5 }); if (FIGHT.msg.length > 4) FIGHT.msg.pop(); };

function droneObj(): { vis: DroneVis | null; g: THREE.Object3D } {
  const vis = buildDrone(false);
  if (vis) return { vis, g: vis.g };
  const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshStandardMaterial({ color: 0x5a4a6a, emissive: 0x401060, roughness: 0.4, metalness: 0.7 }));
  return { vis: null, g };
}

// Drohnen je Planet: zwei an jedem Wrack, drei auf Streife; Gefahr des Sektors erhöht Leben und Anzahl
export function buildFieldFoes(sec: string) {
  clearFieldFoes(); sector = sec;
  if (!world.surface) return;
  const R = rng(hashStr(sec + ':drohnen')), dg = danger();
  const add = (hx: number, hz: number, hr: number) => {
    const { vis, g } = droneObj(), max = Math.round(40 * (1 + 0.3 * (dg - 1)));
    const a = R.range(0, 6.28), x = hx + Math.cos(a) * hr, z = hz + Math.sin(a) * hr, y = terrainAt(x, z) + 3;
    g.position.set(x, y, z); scene.add(g); world.extras.push(g);
    FIGHT.foes.push({ x, y, z, hx, hz, hr, hp: max, max, alert: false, cool: R.range(0.5, 2), ph: a, hit: 0, atk: 0, vis, g, dead: false });
  };
  for (const w of SALV.wrecks) for (let k = 0; k < (dg >= 3 ? 3 : 2); k++) add(w.x, w.z, w.r + 6 + k * 3);
  for (let k = 0; k < 3; k++) { const a = R.range(0, 6.28), d = R.range(600, 2400); add(Math.cos(a) * d, Math.sin(a) * d, 40); }
  FIGHT.max = 100 + gearStat('schutz') * 2; FIGHT.hp = FIGHT.max; FIGHT.down = 0;
}
export function clearFieldFoes() {
  for (const b of FIGHT.bolts) { scene.remove(b.m); b.m.geometry.dispose(); }
  FIGHT.bolts = []; FIGHT.foes = []; FIGHT.msg = [];
}

// Sichtlinie über dem Gelände (Hügel verdecken)
function los(ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(d / 2));
  for (let i = 1; i < n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ay + (by - ay) * t; if (terrainAt(x, z) > y) return false; }
  return true;
}

function hurt(d: number) {
  if (FIGHT.down > 0) return;
  FIGHT.hp -= d * 100 / (100 + gearStat('schutz') * 3); FIGHT.hurt = 1;
  sfx('hull_hit' + Math.floor(Math.random() * 3), 0.5, 1.2, () => snd(120, 0.15, 'sawtooth', 0.06, -40));
  if (FIGHT.hp <= 0) { FIGHT.hp = 0; FIGHT.down = 3; say('Du bist zusammengebrochen …', '#ff6b5b'); }
}

const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _v = new THREE.Vector3(), _w = new THREE.Vector3();
function shoot(px: number, py: number, pz: number, yaw: number, pitch: number, muzzle: THREE.Vector3 | null) {
  const w = weapon();
  FIGHT.cool = w.iv; FIGHT.kick = 1; FIGHT.flash = 0.06; FIGHT.lastShot = performance.now();
  sfx('gun', 0.32, w.snd, () => snd(900, 0.06, 'square', 0.04, -500));
  let end: THREE.Vector3 | null = null;
  for (let s = 0; s < w.n; s++) {
    _e.set(pitch + (Math.random() - 0.5) * 2 * w.spread, yaw + (Math.random() - 0.5) * 2 * w.spread, 0);
    const d = new THREE.Vector3(0, 0, -1).applyEuler(_e);
    let tw = 120;
    for (let t = 0.5; t < 120; t += 0.5) { if (terrainAt(px + d.x * t, pz + d.z * t) > py + d.y * t) { tw = t; break; } }
    let best: Foe | null = null, bt = tw;
    for (const f of FIGHT.foes) {
      if (f.dead) continue;
      const ox = f.x - px, oy = f.y - py, oz = f.z - pz, t = ox * d.x + oy * d.y + oz * d.z;
      if (t < 0 || t > bt) continue;
      const qx = ox - d.x * t, qy = oy - d.y * t, qz = oz - d.z * t;
      if (qx * qx + qy * qy + qz * qz < 0.62 * 0.62) { bt = t; best = f; }
    }
    end = new THREE.Vector3(px + d.x * bt, py + d.y * bt, pz + d.z * bt);
    if (best) {
      best.hp -= w.dmg; best.hit = 0.12; best.alert = true; burst(end.x, end.y, end.z, '#ffb060', 6, 2.2, 0.25);
      if (best.hp <= 0) kill(best);
    } else if (bt < tw + 0.01 && tw < 120) burst(end.x, end.y, end.z, '#8a7a66', 3, 1.5, 0.2);
  }
  if (tracer && end) {
    const a = muzzle || _v.set(px, py - 0.15, pz);
    (tracer.geometry as THREE.BufferGeometry).setFromPoints([a.clone(), end]); tracer.visible = true; tracerT = 0.05;
    (tracer.material as THREE.LineBasicMaterial).color.set(w.col);
  }
}
function kill(f: Foe) {
  f.dead = true; f.g.visible = false;
  burst(f.x, f.y, f.z, '#b070ff', 40, 6, 0.9); burst(f.x, f.y, f.z, '#ffb060', 20, 4, 0.5);
  sfx('ferrox_death', 0.6, 1, () => snd(160, 0.4, 'sawtooth', 0.05, -120));
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
export function updateFieldFight(dt: number, me: { x: number; y: number; z: number; yaw: number; pitch: number; eye: number; active: boolean; tp: boolean; muzzle: THREE.Vector3 | null }) {
  if (!world.surface || sector !== P.sector) return;
  if (!tracer) { tracer = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.9 })); tracer.frustumCulled = false; tracer.visible = false; scene.add(tracer); }
  if (!mflash) { mflash = new THREE.PointLight(0xffb060, 0, 9, 1.6); scene.add(mflash); }
  FIGHT.cool -= dt; FIGHT.kick = Math.max(0, FIGHT.kick - dt * 7); FIGHT.flash -= dt; FIGHT.hurt = Math.max(0, FIGHT.hurt - dt * 1.6);
  for (const m of FIGHT.msg) m.life -= dt; FIGHT.msg = FIGHT.msg.filter(m => m.life > 0);
  if (tracer.visible && (tracerT -= dt) <= 0) tracer.visible = false;
  const px = me.x, pz = me.z, py = me.y + me.eye;
  // Schießen
  if (me.active && FIGHT.down <= 0 && mouse.down && FIGHT.cool <= 0) { shoot(px, py, pz, me.yaw, me.pitch, me.muzzle); if (!weapon().auto) mouse.down = false; }
  mflash.position.set(px, py, pz); mflash.intensity = FIGHT.flash > 0 ? 30 : 0;
  // Erholung außerhalb des Kampfes
  const fighting = FIGHT.foes.some(f => !f.dead && f.alert);
  if (!fighting && FIGHT.down <= 0) FIGHT.hp = Math.min(FIGHT.max, FIGHT.hp + dt * 4);
  // Drohnen
  const dg = danger();
  for (const f of FIGHT.foes) {
    if (f.dead) continue;
    const dx = px - f.x, dz = pz - f.z, d = Math.hypot(dx, dz);
    if (me.active && FIGHT.down <= 0 && d < 34 && los(f.x, f.y, f.z, px, py, pz)) f.alert = true;
    if (f.alert && (d > 70 || !me.active || FIGHT.down > 0)) f.alert = false;
    f.ph += dt * (f.alert ? 0.9 : 0.25);
    let tx: number, tz: number;
    if (f.alert) { const want = 15, s = d > want ? 1 : -0.6; tx = f.x + dx / Math.max(d, 0.1) * s * 6 + Math.cos(f.ph * 2) * 3; tz = f.z + dz / Math.max(d, 0.1) * s * 6 + Math.sin(f.ph * 2) * 3; }
    else { tx = f.hx + Math.cos(f.ph) * f.hr; tz = f.hz + Math.sin(f.ph) * f.hr; }
    const sp = f.alert ? 5 : 2.2, mx = tx - f.x, mz = tz - f.z, ml = Math.hypot(mx, mz);
    if (ml > 0.1) { f.x += mx / ml * Math.min(ml, sp * dt); f.z += mz / ml * Math.min(ml, sp * dt); }
    const gy = terrainAt(f.x, f.z) + 2.6 + Math.sin(f.ph * 3) * 0.3;
    f.y += (gy - f.y) * Math.min(1, dt * 3);
    f.g.position.set(f.x, f.y, f.z);
    f.g.rotation.y = f.alert ? Math.atan2(dx, dz) : f.ph + Math.PI / 2;
    // Schuss: leuchtende Kugel auf die Brust
    f.cool -= dt; f.atk = Math.max(0, f.atk - dt * 2); f.hit -= dt;
    if (f.alert && f.cool <= 0 && d < 40 && los(f.x, f.y, f.z, px, py - 0.4, pz)) {
      f.cool = 1.5 + Math.random() * 0.8; f.atk = 1;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xc070ff }));
      const ty = py - 0.45 - f.y, tl = Math.hypot(dx, ty, dz), v0 = 15;
      m.position.set(f.x, f.y, f.z); scene.add(m);
      FIGHT.bolts.push({ m, x: f.x, y: f.y, z: f.z, vx: dx / tl * v0, vy: ty / tl * v0, vz: dz / tl * v0, life: 4, dmg: 7 * (1 + 0.25 * (dg - 1)) });
      snd(520, 0.12, 'square', 0.03, -300);
    }
    if (f.vis) {
      if (f.vis.attack) f.vis.attack.setEffectiveWeight(f.atk); if (f.vis.idle) f.vis.idle.setEffectiveWeight(1 - f.atk * 0.8);
      f.vis.mixer?.update(dt);
      const ec = f.alert ? 0xff3020 : 0x30a0ff;
      f.vis.mat.forEach((m, k) => { m.emissive.setHex(ec); m.color.copy(f.vis!.base[k]).multiplyScalar(f.hit > 0 ? 2.4 : 1); });
    }
  }
  // Geschosse
  for (let i = FIGHT.bolts.length - 1; i >= 0; i--) {
    const b = FIGHT.bolts[i];
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; b.life -= dt; b.m.position.set(b.x, b.y, b.z);
    const hitMe = me.active && Math.hypot(b.x - px, b.z - pz) < 0.45 && b.y > me.y && b.y < me.y + 1.9;
    if (hitMe) hurt(b.dmg);
    if (hitMe || b.life <= 0 || terrainAt(b.x, b.z) > b.y) { scene.remove(b.m); b.m.geometry.dispose(); FIGHT.bolts.splice(i, 1); }
  }
}
// Zusammengebrochen: Zeit läuft, dann am Schiff aufwachen (rückt der Aufrufer)
export function fieldDown(dt: number): boolean {
  if (FIGHT.down <= 0) return false;
  FIGHT.down -= dt;
  if (FIGHT.down <= 0) { FIGHT.hp = FIGHT.max * 0.6; FIGHT.down = 0; for (const f of FIGHT.foes) f.alert = false; return true; }
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
  vm.gun.position.set(vm.pos[0] + Math.cos(walked * 2.1) * 0.006, vm.pos[1] + bob * 0.55, vm.pos[2] + FIGHT.kick * 0.04);
  vm.gun.rotation.set(FIGHT.kick * 0.07, 0.045, 0);
  vm.gun.visible = FIGHT.down <= 0;
  const f = FIGHT.flash > 0; vm.flash.visible = f; vm.flashLight.intensity = f ? 2.6 : 0;
  if (f) { (vm.flash.material as THREE.SpriteMaterial).rotation = Math.random() * 6.28; vm.flash.scale.setScalar(0.11 + Math.random() * 0.08); }
  return vm;
}
export function hideFieldViewModel() { if (vm && overlay.scene === vm.scene) { overlay.scene = null; overlay.camera = null; } }

// Anzeige: Leben, Treffer-Rand, Meldungen, Drohnen-Markierungen
const _p = new THREE.Vector3();
export function drawFieldHUD() {
  if (!world.surface) return;
  const W = view.W, H = view.H;
  ux.save();
  if (FIGHT.hurt > 0) { ux.fillStyle = `rgba(160,20,10,${0.35 * FIGHT.hurt})`; ux.fillRect(0, 0, W, H); }
  const fighting = FIGHT.foes.some(f => !f.dead && f.alert);
  if (fighting || FIGHT.hp < FIGHT.max - 0.5) {
    const w = 220, x = W / 2 - w / 2, y = H - 54;
    ux.fillStyle = 'rgba(6,16,26,.8)'; ux.fillRect(x - 2, y - 2, w + 4, 14);
    ux.fillStyle = FIGHT.hp / FIGHT.max < 0.3 ? '#ff6b5b' : '#3ad06a'; ux.fillRect(x, y, w * clamp(FIGHT.hp / FIGHT.max, 0, 1), 10);
    ux.fillStyle = '#dfe8f0'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center'; ux.fillText(`LEBEN ${Math.ceil(FIGHT.hp)} / ${FIGHT.max}`, W / 2, y - 6);
  }
  ux.font = '700 11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
  for (const f of FIGHT.foes) {
    if (f.dead || !f.alert) continue;
    _p.set(f.x, f.y + 0.9, f.z).project(camera);
    if (_p.z > 1 || Math.abs(_p.x) > 1 || Math.abs(_p.y) > 1) continue;
    const x = (_p.x + 1) / 2 * W, y = (1 - _p.y) / 2 * H;
    ux.fillStyle = 'rgba(6,16,26,.7)'; ux.fillRect(x - 21, y - 3, 42, 6); ux.fillStyle = '#ff6b5b'; ux.fillRect(x - 20, y - 2, 40 * f.hp / f.max, 4);
  }
  ux.textAlign = 'left'; ux.font = '600 14px "Share Tech Mono",Consolas,monospace';
  FIGHT.msg.forEach((m, i) => { ux.globalAlpha = Math.min(1, m.life); ux.fillStyle = m.c; ux.fillText(m.t, 24, H * 0.62 + i * 20); });
  ux.restore();
}
