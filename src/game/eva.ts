import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { scene, camera, view, ux } from '../core/engine';
import { keys, steer, look } from '../core/input';
import { clamp, d3 } from '../core/util';
import { snd, sfx, loopVol } from '../core/audio';
import { P, G, stats, saveGame } from './state';
import { SHIP } from './player';
import { Figur, neuesSkelett } from './figur';
import { figTracht } from './avatar';
import { evaContainer } from './begegnungen';
import { radio } from '../ui/radio';
import { gearDef } from '../data/gear';

// =====================================================================================
// Außenbordeinsatz in der Schwerelosigkeit (seit 2026-11-24, Konzept docs/konzept-welt-und-leben.md Punkt 7; überarbeitet 2026-11-25)
//  - Im All bei fast stehendem Schiff [F]. Hinaus nur mit druckdichtem Helm und Anzug (gear.ts, vakuum).
//  - Mit dem Manövrierrucksack MR-1 (gear.ts, duesen): freies Fliegen mit Kaltgasdüsen. W/S vor und zurück (Blickrichtung), A/D seitlich,
//    Leertaste hoch, Strg runter, Umschalt bremst. Höchstens 6 m/s, Gas für etwa 90 Sekunden Schub, Leine bis 600 m.
//  - Ohne Rucksack: nur die Leine und der Traktorstrahl des Schiffs. Dieselben Tasten, aber langsam (2 m/s) und nur bis 60 m ums Schiff;
//    weiter draußen zieht der Strahl zurück. Kein Gasverbrauch.
//  - [E] an treibenden Containern (Begegnung „Treibgut“): von Hand geborgen, anderthalbmal so viel Ware wie mit dem Traktorstrahl.
//  - [F] an der Schleuse: wieder einsteigen. Sauerstoff 4 Minuten; leer: Notrückholung, die Hülle zahlt den Preis.
//  - Figur: eine Kopie der Spielfigur mit der eigenen Tracht in einer Schwebehaltung (Arme und Beine leicht angewinkelt, wie Astronauten
//    entspannt im All hängen), aus der Ruhelage per Zwei-Knochen-IK gestellt (wie der Fahrer im Wiesel, fahrer.ts). Sie neigt sich in
//    Schubrichtung, greift beim Bergen nach vorn. Düsen: feiner Kaltgasnebel, die Triebwerke des Schiffs sind aus.
// =====================================================================================

export const EVA = { active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, o2: 240, fuel: 90, warnT: 0, prompt: '', duesen: false, ax: 0, ay: 0, az: 0 };
const O2 = 240, FUEL = 90;
const MODE = { duesen: { acc: 3.2, vmax: 6, reich: 600 }, strahl: { acc: 1.4, vmax: 2.2, reich: 60 } };
let sk: THREE.Object3D | null = null, fig: Figur | null = null, holder: THREE.Group | null = null, loading = false;
const rest = new Map<THREE.Object3D, THREE.Quaternion>();
let pack: THREE.Group | null = null, leine: THREE.Line | null = null, strahl: THREE.Mesh | null = null, nebel: Nebel | null = null;
let grabT = 0, poseT = 0, dressT = 0;
const lean = { x: 0, z: 0 };
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0), _c = new THREE.Vector3(), _l = new THREE.Vector3(), _a = new THREE.Vector3(), _s = new THREE.Vector3();

const istVakuum = (id?: string) => !!(id && gearDef(id)?.vakuum);
/** darf hier ausgestiegen werden? null = ja, sonst der Grund */
export function evaGrund(): string | null {
  if (G.dead) return 'nicht jetzt';
  if (Math.hypot(P.vx, P.vy, P.vz) > 4) return 'Erst anhalten, dann aussteigen (unter 4 m/s).';
  const helm = istVakuum(P.gear?.helm), anzug = istVakuum(P.gear?.anzug);
  if (!helm || !anzug) return `Die Schleuse bleibt zu: ${!helm && !anzug ? 'Helm und Anzug sind' : !helm ? 'der Helm ist' : 'der Anzug ist'} nicht druckdicht. Beim Ausrüster: EVA-Helm, Druckanzug oder Raumanzug.`;
  return null;
}

// ---------- Figur in Schwebehaltung ----------
const V = () => new THREE.Vector3(), Q = () => new THREE.Quaternion();
const wp = (o: THREE.Object3D) => o.getWorldPosition(V());
function aim(bone: THREE.Object3D, childNow: THREE.Vector3, to: THREE.Vector3) {
  const o = wp(bone), cur = childNow.clone().sub(o).normalize(), want = to.clone().sub(o).normalize();
  if (cur.lengthSq() < 1e-8 || want.lengthSq() < 1e-8) return;
  const q = Q().setFromUnitVectors(cur, want), bw = bone.getWorldQuaternion(Q()), pw = bone.parent ? bone.parent.getWorldQuaternion(Q()) : Q();
  bone.quaternion.copy(pw.invert().multiply(q.multiply(bw)));
  bone.updateMatrixWorld(true);
}
function ik2(a: THREE.Object3D, b: THREE.Object3D, c: THREE.Object3D, target: THREE.Vector3, pole: THREE.Vector3) {
  const A = wp(a), B = wp(b), C = wp(c), la = A.distanceTo(B), lb = B.distanceTo(C);
  const dir = target.clone().sub(A), d = THREE.MathUtils.clamp(dir.length(), 0.02, la + lb - 0.002); dir.normalize();
  const x = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - x * x));
  const pl = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const E = A.clone().add(dir.clone().multiplyScalar(x)).add(pl.multiplyScalar(h));
  aim(a, wp(b), E);
  aim(b, wp(c), target);
}
let facing = 0, ready = false;
function figurLaden() {
  if (sk || loading) return;
  loading = true;
  neuesSkelett().then(s => {
    loading = false; if (!s) return;
    sk = s; fig = new Figur(s); fig.setzen(figTracht());
    for (const b of Object.values(fig.bones)) rest.set(b, b.quaternion.clone());
  }).catch(() => { loading = false; });
}
// Haltung im Rahmen des Halters (Figur schaut nach −z, oben +y, Becken im Ursprung). t: Zeit fürs leise Atmen und Treiben
function pose(t: number) {
  if (!sk || !fig || !holder || !fig.bereit) return false;
  const bn = fig.bones, need = ['pelvis', 'spine_01', 'neck_01', 'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r', 'ball_l'];
  if (need.some(n => !bn[n])) return false;
  for (const [b, q] of rest) b.quaternion.copy(q);
  holder.updateMatrixWorld(true);
  if (!ready) {      // einmal: Blickrichtung (Zehen nach −z)
    sk.rotation.set(0, 0, 0); sk.position.set(0, 0, 0); sk.updateMatrixWorld(true);
    const toe = holder.worldToLocal(wp(bn.ball_l)).sub(holder.worldToLocal(wp(bn.foot_l)));
    facing = Math.atan2(toe.x, toe.z) - Math.PI;
  }
  sk.rotation.set(0, facing, 0); sk.position.set(0, 0, 0); sk.updateMatrixWorld(true);
  const pel = holder.worldToLocal(wp(bn.pelvis)); sk.position.sub(pel); sk.updateMatrixWorld(true);      // Becken in den Ursprung
  ready = true;
  const L = (x: number, y: number, z: number) => holder!.localToWorld(new THREE.Vector3(x, y, z));
  const D = (x: number, y: number, z: number) => L(x, y, z).sub(L(0, 0, 0)).normalize();
  const br = Math.sin(t * 0.9) * 0.02, dr = Math.sin(t * 0.37);
  // Oberkörper leicht nach vorn gekrümmt
  const P0 = wp(bn.pelvis);
  aim(bn.spine_01, wp(bn.neck_01), P0.clone().add(D(0, 1, -0.2 - br).multiplyScalar(wp(bn.neck_01).distanceTo(P0))));
  // Beine: Hüfte und Knie angewinkelt, Füße etwas auseinander, das linke Bein etwas mehr gebeugt
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'l' : 'r';
    ik2(bn['thigh_' + k], bn['calf_' + k], bn['foot_' + k], L(s * 0.15, -0.78 + (s < 0 ? 0.05 : 0) + br, -0.1 - (s < 0 ? 0.07 : 0) + dr * 0.02), D(s * 0.12, 0.3, -1));
  }
  // Arme: Oberarme vom Körper weg, Ellbogen gebeugt, Hände vor dem Bauch; beim Bergen greift die rechte Hand nach vorn
  const g = grabT > 0 ? Math.sin(Math.PI * clamp(1 - grabT / 0.9, 0, 1)) : 0;
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'l' : 'r', reach = s > 0 ? g : 0;
    const tgt = L(s * (0.34 - reach * 0.18), 0.14 + br * 2 + reach * 0.26 + dr * 0.015 * s, -0.3 - reach * 0.38);
    ik2(bn['upperarm_' + k], bn['lowerarm_' + k], bn['hand_' + k], tgt, D(s * 1, -0.5, 0.45));
  }
  return true;
}

// ---------- Manövrierrucksack (Modell) ----------
function packBauen() {
  const g = new THREE.Group();
  const lack = new THREE.MeshStandardMaterial({ color: 0x4a4f56, metalness: 0.45, roughness: 0.5 });
  const dunkel = new THREE.MeshStandardMaterial({ color: 0x24272b, metalness: 0.6, roughness: 0.45 });
  const tank = new THREE.MeshStandardMaterial({ color: 0xb9bfc6, metalness: 0.9, roughness: 0.28 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xc0601c, metalness: 0.2, roughness: 0.5 });
  const led = new THREE.MeshBasicMaterial({ color: 0x5cff7a });
  const add = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, rx = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); g.add(o); return o; };
  add(new RoundedBoxGeometry(0.4, 0.52, 0.16, 3, 0.03), lack, 0, 0, 0.04);
  add(new RoundedBoxGeometry(0.44, 0.56, 0.03, 2, 0.012), dunkel, 0, 0, -0.045);
  add(new THREE.BoxGeometry(0.405, 0.045, 0.165), orange, 0, 0.13, 0.04);
  for (const s of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.052, 0.052, 0.42, 20), tank, s * 0.12, -0.01, 0.15);
    add(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 16), dunkel, s * 0.12, 0.215, 0.15);
    for (const v of [-1, 1]) {      // Düsenblöcke an den vier Ecken, je eine Düse zur Seite und eine nach hinten
      add(new RoundedBoxGeometry(0.075, 0.075, 0.075, 2, 0.012), dunkel, s * 0.235, v * 0.24, 0.05);
      add(new THREE.CylinderGeometry(0.011, 0.019, 0.035, 12), tank, s * 0.29, v * 0.24, 0.05, 0, Math.PI / 2);
      add(new THREE.CylinderGeometry(0.011, 0.019, 0.035, 12), tank, s * 0.235, v * 0.24, 0.105, Math.PI / 2, 0);
    }
  }
  add(new THREE.SphereGeometry(0.009, 8, 6), led, 0.15, 0.19, 0.122);
  g.traverse((o: any) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
  return g;
}
const DUESEN = [[-0.29, 0.24, 0.05], [0.29, 0.24, 0.05], [-0.29, -0.24, 0.05], [0.29, -0.24, 0.05]].map(p => new THREE.Vector3(p[0], p[1], p[2]));

// ---------- Kaltgasnebel: wenige kleine, schwache Wölkchen (Kaltgas leuchtet nicht) ----------
interface Puff { s: THREE.Sprite; v: THREE.Vector3; t: number; life: number }
class Nebel {
  g = new THREE.Group(); pool: Puff[] = []; tex: THREE.CanvasTexture; acc = 0;
  constructor() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d')!;
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.4, 'rgba(235,240,245,0.35)'); gr.addColorStop(1, 'rgba(235,240,245,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64); this.tex = new THREE.CanvasTexture(cv);
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, color: 0xe6ecf2, transparent: true, depthWrite: false, opacity: 0 }));
      s.visible = false; this.g.add(s); this.pool.push({ s, v: new THREE.Vector3(), t: 1, life: 1 });
    }
  }
  emit(at: THREE.Vector3, dir: THREE.Vector3, base: THREE.Vector3) {
    const p = this.pool.find(q => q.t >= q.life); if (!p) return;
    p.t = 0; p.life = 0.35 + Math.random() * 0.2; p.s.position.copy(at); p.s.visible = true;
    p.v.copy(dir).multiplyScalar(2.2 + Math.random()).add(base).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.5));
  }
  update(dt: number) {
    for (const p of this.pool) {
      if (p.t >= p.life) { p.s.visible = false; continue; }
      p.t += dt; const k = Math.min(1, p.t / p.life);
      p.s.position.addScaledVector(p.v, dt); p.s.scale.setScalar(0.04 + k * 0.32);
      (p.s.material as THREE.SpriteMaterial).opacity = 0.2 * (1 - k) * (1 - k);
    }
  }
}

// ---------- Ein- und Aussteigen ----------
export function startEva() {
  const g = evaGrund(); if (g) { radio('ANZUG', g, '#ff9b7a'); return false; }
  figurLaden();
  P.vx = P.vy = P.vz = 0;
  EVA.duesen = !!gearDef(P.gear?.rucksack || '')?.duesen;
  // an der Heckrampe: hinter dem Schiff, etwas tiefer; dort hängt die Leine
  const r = stats().radius, q = SHIP.g.quaternion;
  _f.set(0, 0, -1).applyQuaternion(q);
  EVA.ax = P.x - _f.x * (r * 0.8); EVA.ay = P.y - r * 0.12; EVA.az = P.z - _f.z * (r * 0.8);
  EVA.x = P.x - _f.x * (r + 4); EVA.y = P.y - r * 0.15; EVA.z = P.z - _f.z * (r + 4);
  EVA.vx = EVA.vy = EVA.vz = 0; EVA.yaw = P.yaw; EVA.pitch = 0; EVA.o2 = O2; EVA.fuel = FUEL; EVA.warnT = 0; EVA.active = true; grabT = 0; poseT = 0;
  G.mode = 'eva';
  for (const gl of SHIP.glows) gl.visible = false;      // Triebwerke aus, solange jemand draußen ist
  document.getElementById('hud')?.classList.add('hidden');
  sfx('door_open', 0.5, 0.8, () => snd(160, 0.6, 'sawtooth', 0.04, -60));
  radio('SYSTEM', EVA.duesen
    ? 'Schleuse offen. Manövrierrucksack bereit: WASD, Leertaste hoch, Strg runter, Umschalt bremst. [E] Container bergen, [F] an der Schleuse einsteigen.'
    : 'Schleuse offen. Ohne Manövrierrucksack führt dich der Traktorstrahl des Schiffs, bis 60 m: WASD, Leertaste, Strg. [E] Container bergen, [F] an der Schleuse einsteigen.');
  return true;
}
export function endEva(not = false) {
  EVA.active = false; G.mode = 'play'; holder?.removeFromParent(); leine?.removeFromParent(); strahl?.removeFromParent(); nebel?.g.removeFromParent(); loopVol('rover_engine', 0);
  for (const gl of SHIP.glows) gl.visible = true;
  document.getElementById('hud')?.classList.remove('hidden');
  if (not) { P.hull = Math.max(1, P.hull - stats().maxHull * 0.15); radio('SYSTEM', 'Sauerstoff leer. Notrückholung über die Leine, die Schleuse hat dabei etwas abbekommen.', '#ff6b5b'); }
  else sfx('door_close', 0.5, 1, () => snd(200, 0.2, 'triangle', 0.03, 60));
  saveGame();
}
const nahAmSchiff = () => d3(EVA.x, EVA.y, EVA.z, EVA.ax, EVA.ay, EVA.az) < 5 || d3(EVA.x, EVA.y, EVA.z, P.x, P.y, P.z) < stats().radius + 4;

// Leine (gelbes Sicherungsseil, lose durchhängend) und Traktorstrahl (schwacher Lichtkegel vom Schiff)
function leineZeichnen(t: number) {
  if (!leine) {
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(33 * 3), 3));
    leine = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc9a030, transparent: true, opacity: 0.85 }));
    leine.frustumCulled = false;
  }
  if (!leine.parent) scene.add(leine);
  const a = _a.set(EVA.ax, EVA.ay, EVA.az), b = holder && ready ? holder.localToWorld(_c.set(0, 0.25, 0.12)) : _c.set(EVA.x, EVA.y, EVA.z);
  const d = a.distanceTo(b), side = _s.set(b.z - a.z, 0, a.x - b.x).normalize(), pos = leine.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i <= 32; i++) {
    const k = i / 32, sag = Math.sin(Math.PI * k) * Math.min(3, d * 0.12), w = Math.sin(t * 0.3 + k * 2);
    pos.setXYZ(i, a.x + (b.x - a.x) * k + side.x * sag * w, a.y + (b.y - a.y) * k - sag * 0.5, a.z + (b.z - a.z) * k + side.z * sag * w);
  }
  pos.needsUpdate = true;
}
function strahlZeichnen(on: boolean, moving: boolean) {
  if (!on) { strahl?.removeFromParent(); return; }
  if (!strahl) {
    const geo = new THREE.CylinderGeometry(0.05, 0.6, 1, 16, 1, true); geo.translate(0, 0.5, 0); geo.rotateX(Math.PI / 2);
    strahl = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x6ac8ff, transparent: true, opacity: 0.03, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  }
  if (!strahl.parent) scene.add(strahl);
  const a = _a.set(P.x, P.y + stats().radius * 0.1, P.z), b = _c.set(EVA.x, EVA.y, EVA.z), m = strahl.material as THREE.MeshBasicMaterial;
  strahl.position.copy(a); strahl.lookAt(b); strahl.scale.set(1, 1, a.distanceTo(b));
  m.opacity += ((moving ? 0.11 : 0.04) - m.opacity) * 0.1;
}

/** jedes Bild im Modus 'eva' (main.ts) */
export function updateEva(dt: number) {
  if (!EVA.active) return;
  const M = EVA.duesen ? MODE.duesen : MODE.strahl;
  for (const gl of SHIP.glows) gl.visible = false;
  // Blick: Maus (eingefangen) oder freie Kamera
  EVA.yaw -= steer.dx * 0.0024; EVA.pitch = clamp(EVA.pitch - steer.dy * 0.0022, -1.4, 1.4); steer.dx = steer.dy = 0;
  if (look.dx || look.dy) { EVA.yaw -= look.dx * 0.003; EVA.pitch = clamp(EVA.pitch - look.dy * 0.003, -1.4, 1.4); look.dx = look.dy = 0; }
  _f.set(-Math.sin(EVA.yaw) * Math.cos(EVA.pitch), Math.sin(EVA.pitch), -Math.cos(EVA.yaw) * Math.cos(EVA.pitch));
  _r.set(Math.cos(EVA.yaw), 0, -Math.sin(EVA.yaw));
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), u = (keys.Space ? 1 : 0) - (keys.ControlLeft || keys.ControlRight ? 1 : 0);
  const thrust = !!(f || s || u) && (!EVA.duesen || EVA.fuel > 0);
  const acc = _l.set(_f.x * f + _r.x * s, _f.y * f + u, _f.z * f + _r.z * s);
  if (thrust) {
    EVA.vx += acc.x * M.acc * dt; EVA.vy += acc.y * M.acc * dt; EVA.vz += acc.z * M.acc * dt;
    if (EVA.duesen) EVA.fuel = Math.max(0, EVA.fuel - dt);
  }
  const brake = (keys.ShiftLeft || keys.ShiftRight) && (!EVA.duesen || EVA.fuel > 0);
  if (brake || !EVA.duesen) {      // bremsen; der Traktorstrahl dämpft von selbst
    const k = Math.exp(-(brake ? 2.5 : 0.6) * dt); EVA.vx *= k; EVA.vy *= k; EVA.vz *= k;
    if (brake && EVA.duesen) EVA.fuel = Math.max(0, EVA.fuel - dt * 0.5);
  }
  const sp = Math.hypot(EVA.vx, EVA.vy, EVA.vz); if (sp > M.vmax) { EVA.vx *= M.vmax / sp; EVA.vy *= M.vmax / sp; EVA.vz *= M.vmax / sp; }
  // Reichweite: Leine bzw. Traktorstrahl ziehen zurück
  const dS = d3(EVA.x, EVA.y, EVA.z, P.x, P.y, P.z);
  if (dS > M.reich) { const k = Math.min(1, (dS - M.reich) / 10) * 2.5 * dt / dS; EVA.vx -= (EVA.x - P.x) * k; EVA.vy -= (EVA.y - P.y) * k; EVA.vz -= (EVA.z - P.z) * k; }
  EVA.x += EVA.vx * dt; EVA.y += EVA.vy * dt; EVA.z += EVA.vz * dt;
  // nicht in den Rumpf schweben
  const r = stats().radius * 0.55, d = d3(EVA.x, EVA.y, EVA.z, P.x, P.y, P.z);
  if (d < r) { const k = r / Math.max(0.01, d); EVA.x = P.x + (EVA.x - P.x) * k; EVA.y = P.y + (EVA.y - P.y) * k; EVA.z = P.z + (EVA.z - P.z) * k; EVA.vx *= -0.3; EVA.vy *= -0.3; EVA.vz *= -0.3; }
  loopVol('rover_engine', thrust && EVA.duesen ? 0.05 : 0);
  // Sauerstoff, Entfernung, Gas
  EVA.o2 -= dt; EVA.warnT -= dt; grabT = Math.max(0, grabT - dt);
  if (EVA.o2 <= 0) { endEva(true); return; }
  if (EVA.o2 < 45 && EVA.warnT <= 0) { EVA.warnT = 15; radio('ANZUG', `Sauerstoff knapp: noch ${Math.ceil(EVA.o2)} Sekunden.`, '#ffb347'); snd(880, 0.12, 'square', 0.04); }
  if (dS > M.reich - 5 && EVA.warnT <= 0) { EVA.warnT = 12; radio('ANZUG', EVA.duesen ? 'Leine am Ende: zurück zum Schiff.' : 'Rand des Traktorstrahls. Weiter kommst du nur mit einem Manövrierrucksack.', '#ffb347'); }
  if (EVA.duesen && EVA.fuel <= 0) { EVA.duesen = false; radio('ANZUG', 'Düsengas leer. Ab jetzt führt dich der Traktorstrahl des Schiffs.', '#ffb347'); }
  EVA.prompt = nahAmSchiff() ? '[F] Durch die Schleuse einsteigen' : evaContainer(EVA.x, EVA.y, EVA.z, false) ? '[E] Container von Hand bergen' : '';
  // Figur: Schwebehaltung, neigt sich in Schubrichtung (der Rucksack schiebt am Rücken), dreht sich mit dem Blick
  if (sk && fig) {
    if (!holder) { holder = new THREE.Group(); holder.add(sk); }
    if (!holder.parent) scene.add(holder);
    if ((dressT -= dt) <= 0) { dressT = 1; fig.setzen(figTracht()); }
    const tf = thrust ? f : 0, ts = thrust ? s : 0, tu = thrust ? u : 0, kk = Math.min(1, dt * 2.5);
    lean.x += (-0.32 * tf - 0.12 * tu - lean.x) * kk; lean.z += (-0.22 * ts - lean.z) * kk;
    holder.position.set(EVA.x, EVA.y + Math.sin(G.time * 0.7) * 0.04, EVA.z);
    holder.rotation.set(0.12 + lean.x + Math.sin(G.time * 0.4) * 0.03, EVA.yaw, lean.z + Math.sin(G.time * 0.5) * 0.04, 'YXZ');
    if ((poseT -= dt) <= 0) { poseT = 1 / 30; pose(G.time); }
    holder.visible = ready;
    // Manövrierrucksack am oberen Rücken (in der Lage des Halters)
    if (gearDef(P.gear?.rucksack || '')?.duesen) {
      if (!pack) pack = packBauen();
      if (pack.parent !== holder) holder.add(pack);
      const sp2 = fig.bones.spine_03 || fig.bones.spine_02 || fig.bones.spine_01;
      if (sp2 && ready) { const p = holder.worldToLocal(wp(sp2)); pack.position.set(p.x, p.y - 0.02, p.z + 0.17); }
    } else pack?.removeFromParent();
    // Kaltgasnebel aus den Düsen, entgegen der Schubrichtung
    if (!nebel) nebel = new Nebel();
    if (!nebel.g.parent) scene.add(nebel.g);
    if (thrust && EVA.duesen && pack && pack.parent) {
      nebel.acc += dt * 28;
      const out = acc.clone().normalize().negate(), base = new THREE.Vector3(EVA.vx, EVA.vy, EVA.vz);
      while (nebel.acc >= 1) { nebel.acc -= 1; const n = DUESEN[Math.floor(Math.random() * 4)]; nebel.emit(pack.localToWorld(n.clone()), out, base); }
    }
    nebel.update(dt);
  }
  leineZeichnen(G.time);
  strahlZeichnen(!EVA.duesen, thrust);
}
/** Kamera hinter der schwebenden Figur (main.ts updateCamera) */
export function evaCamera() {
  _f.set(-Math.sin(EVA.yaw) * Math.cos(EVA.pitch), Math.sin(EVA.pitch), -Math.cos(EVA.yaw) * Math.cos(EVA.pitch));
  _c.set(EVA.x, EVA.y + 0.4, EVA.z).addScaledVector(_f, -3.6).addScaledVector(_u, 0.7);
  camera.position.copy(_c); _l.set(EVA.x, EVA.y + 0.3, EVA.z).addScaledVector(_f, 3); camera.lookAt(_l);
}
/** Taste E im Außenbordeinsatz */
export function evaE() { if (evaContainer(EVA.x, EVA.y, EVA.z, true)) { grabT = 0.9; snd(700, 0.15, 'triangle', 0.05, 300); } }
/** Taste F im Außenbordeinsatz */
export function evaF() { if (nahAmSchiff()) endEva(); else radio('ANZUG', 'Zu weit von der Schleuse. Näher ans Schiff.'); }
/** Anzeige: Sauerstoff, Düsengas oder Traktorstrahl, Abstand, Hinweis */
export function drawEva() {
  if (!EVA.active) return;
  const W = view.W, H = view.H, d = d3(EVA.x, EVA.y, EVA.z, P.x, P.y, P.z), sp = Math.hypot(EVA.vx, EVA.vy, EVA.vz);
  ux.save(); ux.font = '11px "Share Tech Mono",Consolas,monospace';
  const x0 = W - 270, y0 = H - 130;
  ux.fillStyle = 'rgba(10,12,14,.86)'; ux.strokeStyle = '#1e3a4a'; ux.beginPath(); ux.rect(x0, y0, 256, 116); ux.fill(); ux.stroke();
  ux.fillStyle = '#e09030'; ux.font = '700 11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'left'; ux.fillText('AUSSENBORD', x0 + 12, y0 + 18);
  ux.textAlign = 'right'; ux.fillStyle = '#e4eef5'; ux.fillText(`${sp.toFixed(1).replace('.', ',')} m/s`, x0 + 244, y0 + 18);
  const bar = (y: number, label: string, v: number, max: number, col: string, txt?: string) => {
    ux.textAlign = 'left'; ux.fillStyle = '#8aa0b0'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillText(label, x0 + 12, y);
    ux.textAlign = 'right'; ux.fillStyle = v / max < 0.2 ? '#ff6b5b' : '#e4eef5'; ux.fillText(txt ?? `${Math.ceil(v)} s`, x0 + 244, y);
    ux.fillStyle = '#0e1e28'; ux.fillRect(x0 + 12, y + 5, 232, 5); ux.fillStyle = v / max < 0.2 ? '#ff6b5b' : col; ux.fillRect(x0 + 12, y + 5, 232 * clamp(v / max, 0, 1), 5);
  };
  bar(y0 + 42, 'SAUERSTOFF', EVA.o2, O2, '#7fe0c0');
  if (EVA.duesen) bar(y0 + 70, 'DÜSENGAS', EVA.fuel, FUEL, '#4fd6c4');
  else bar(y0 + 70, 'TRAKTORSTRAHL', Math.max(0, MODE.strahl.reich - d), MODE.strahl.reich, '#6ac8ff', `${Math.max(0, Math.round(MODE.strahl.reich - d))} m Rest`);
  ux.textAlign = 'left'; ux.fillStyle = '#8aa0b0'; ux.fillText(`Schiff: ${Math.round(d)} m`, x0 + 12, y0 + 104);
  if (EVA.prompt) {
    ux.font = '600 14px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
    const tw = ux.measureText(EVA.prompt).width + 30, y = H * 0.66;
    ux.fillStyle = 'rgba(6,16,26,.88)'; ux.strokeStyle = '#e09030'; ux.beginPath(); ux.rect(W / 2 - tw / 2, y - 20, tw, 32); ux.fill(); ux.stroke();
    ux.fillStyle = '#e09030'; ux.fillText(EVA.prompt, W / 2, y + 1);
  }
  ux.restore();
}
