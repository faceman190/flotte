import * as THREE from 'three';
import { GUN } from './footgun';
import { ausArt, leiterFuss, blende } from './ausstieg';
import { drawPrompt, drawSpeechBubble } from '../ui/footHud';
import { CITY, cityTargets, cityDoorNear, cityDoorPos, cityBark, cityBubble } from './city';
import { scene, camera, view, ux, gl, compileFor, renderer } from '../core/engine';
import { keys, mouse } from '../core/input';
import { clamp } from '../core/util';
import { sfx, snd } from '../core/audio';
import { P, G, settings, stats } from './state';
import { world } from './world';
import { ROVER, SURF, terrainAt, liquidAt, resetRoverCamera, buildRover , landeHoehe } from './surface';
import { updateFlora, treeNear } from './flora';
import { gearFactor } from './inventory';
import { radio } from '../ui/radio';
import { nearEntrance } from './dungeon';
import { VIEW, STANCE, ACT, footPace, footBrake, footAccel, setIntent, eyeH, syncAvatar, driveAvatar, avatarMuzzle, tpCamPos, resetTpCam, figGear, type Avatar } from './avatar';
import { viewModelId } from './mineArt';
import { AIM, aimUpdate, aimFov, aimShake, aimK } from './footgun';
import { bodyView, fpBody } from './avatar';
import { drawFootCross } from '../ui/footHud';
import { fieldGrenade } from './fieldfight';
import { noteToss, noteFoot } from './avatar';
import { basePad, padGround, baseBlocked, nearDoor, surfaceAt, wallBetween } from './basewalk';
import { nearCrate, salvageBlock, drawSalvageHUD } from './salvage';
import { FIGHT, updateFieldFight, fieldDown, fieldViewModel, hideFieldViewModel, drawFieldHUD } from './fieldfight';
import { storyMarkers } from './story';
import { landShip } from './surface';
import { fahrerZeigen } from './fahrer';
import type { Station } from './world';

// =====================================================================================
// Zu Fuß auf dem Planetenboden (Unterzustand des Rover-Modus: G.mode bleibt 'rover', FOOT.active = true).
// Aussteigen mit F (Rover steht), über die Rampe aus dem Schiff, oder nach einer Mine wieder am Eingang.
// [E]: Rover einsteigen, an Bord gehen, Mine betreten (main.ts). V: Ich-Sicht / Außensicht (src/game/avatar.ts).
// =====================================================================================

export const FOOT = {
  active: false, x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, jy: 0, jv: 0, bob: 0, walked: 0,
  locked: false, act: '' as '' | 'rover' | 'ship' | 'mine' | 'base' | 'crate' | 'story', prompt: '', warn: 0,
};
export const footHooks = {
  enterCity: () => {}, unlock: () => {} };
// Ziele zu Fuß, die die Geschichte setzt (z. B. Kristall bergen): [E] in Reichweite r
export const footTargets: { x: number; z: number; r: number; label: string; act: () => void }[] = [];
export const nearFootTarget = () => footTargets.find(t => Math.hypot(t.x - FOOT.x, t.z - FOOT.z) < t.r)
  || (CITY.st && cityDoorNear(FOOT.x, FOOT.z) ? { x: FOOT.x, z: FOOT.z, r: 4, label: `Promenade von ${CITY.st.name} betreten`, act: () => footHooks.enterCity() } : null)
  || cityTargets.find(t => Math.hypot(t.x - FOOT.x, t.z - FOOT.z) < t.r)
  || null;
export function footAt(x: number, z: number, yaw: number) { place(x, z, yaw); }
// Beim Betreten einer Planetenoberfläche (seit 2026-11-18): Rover und Spielfigur gleich bauen und ihre Shader und Bilder vorab übersetzen bzw.
// hochladen. Vorher entstanden beide erst beim Landen bzw. beim ersten Schritt – mitten im Spiel, mit einem möglichen Standbild.
export function prewarmFoot() {
  try {
    if (!ROVER.model) ROVER.model = buildRover();
    if (VIEW.tp && !me) { me = syncAvatar(scene, me, figGear()); if (me) me.s.g.visible = false; }
    const roots = [ROVER.model.g, me?.s.g].filter(Boolean) as THREE.Object3D[];
    for (const r of roots) {
      r.traverse((o: any) => { for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []) as any[]) for (const v of Object.values(m)) if ((v as any)?.isTexture) renderer.initTexture(v as THREE.Texture); });
      compileFor(r, scene).catch?.(() => {});
    }
  } catch (e) { console.warn('Vorwärmen zu Fuß:', e); }
}
let me: Avatar | null = null, stepT = 0, grabT = 0;
// Bodenhöhe unter einem Fuß der eigenen Figur (Gelände, Stege der Basis); nur für Manny (avatar.ts, Drive.ground)
const footGround = (x: number, z: number) => surfaceAt(x, z, FOOT.y);

const shipR = () => stats().radius * 0.75 + 0.8;
export const footNearShip = () => FOOT.active && Math.hypot(FOOT.x - ROVER.ship.x, FOOT.z - ROVER.ship.z) < stats().radius + 7;
export const footNearRover = () => FOOT.active && ROVER.model !== null && Math.hypot(FOOT.x - ROVER.x, FOOT.z - ROVER.z) < 4.5;

function place(x: number, z: number, yaw: number) {
  FOOT.x = x; FOOT.z = z; FOOT.y = surfaceAt(x, z, terrainAt(x, z) + 2.5); FOOT.yaw = yaw; FOOT.pitch = 0; FOOT.vx = FOOT.vz = 0; FOOT.jy = FOOT.jv = 0;
  FOOT.active = true; resetTpCam();
  if (me) me.first = true;
}
// Aussteigen: links neben dem Rover
export function leaveRover() {
  if (Math.abs(ROVER.speed) > 3) { radio('SYSTEM', 'Erst anhalten, dann aussteigen.'); return false; }
  ROVER.speed = 0; ROVER.drilling = false; ROVER.vx = ROVER.vz = 0; fahrerZeigen(false);
  // auf der Seite, die vom Schiff wegzeigt
  let lx = Math.cos(ROVER.yaw), lz = -Math.sin(ROVER.yaw);
  if ((ROVER.x + lx - ROVER.ship.x) ** 2 + (ROVER.z + lz - ROVER.ship.z) ** 2 < (ROVER.x - ROVER.ship.x) ** 2 + (ROVER.z - ROVER.ship.z) ** 2) { lx = -lx; lz = -lz; }
  place(ROVER.x + lx * 3.2, ROVER.z + lz * 3.2, ROVER.yaw);
  sfx('door_open', 0.4, 1.2, () => snd(240, 0.2, 'triangle', 0.03, -60));
  return true;
}
// Über die Rampe aus dem Schiff: hinter dem gelandeten Schiff
export function leaveShipOnFoot() {
  const S = ROVER.ship, bx = Math.sin(S.yaw), bz = Math.cos(S.yaw), r = stats().radius;
  // Jäger und Elster: aus der Kanzel über die Bordleiter (ausstieg.ts), am Fuß der Leiter
  const f = ausArt() === 'kanzel' ? leiterFuss(S) : null;
  if (f) { place(f.x, f.z, f.yaw); blende(380); return; }
  place(S.x + bx * (r * 0.7 + 3), S.z + bz * (r * 0.7 + 3), S.yaw + Math.PI);
}
// Planetenbasis: auf dem Landefeld landen und gleich zu Fuß aussteigen
export function landAtBase(st: Station, quiet = false) {      // quiet: beim Laden eines Spielstands (main.ts, resumeAt)
  const p = basePad(st); if (!p) return false;
  const px = P.x, pz = P.z; P.x = p.x; P.z = p.z;
  if (!landShip(quiet, true)) { P.x = px; P.z = pz; return false; }
  const r = stats().radius;
  let ax = p.x - st.x, az = p.z - st.z; const L = Math.hypot(ax, az) || 1; ax /= L; az /= L;   // vom Gebäude weg
  ROVER.ship = { x: p.x, y: p.y + landeHoehe(), z: p.z, yaw: Math.atan2(-ax, -az) };
  const off = Math.max(p.hu, p.hv) + 6;
  ROVER.x = p.x + ax * off; ROVER.z = p.z + az * off; ROVER.y = terrainAt(ROVER.x, ROVER.z); ROVER.yaw = ROVER.ship.yaw;
  place(p.x - ax * (r * 0.8 + 2.5), p.z - az * (r * 0.8 + 2.5), Math.atan2(ax, az));   // zwischen Schiff und Tür, Blick zur Basis
  if (!quiet) radio('SYSTEM', `Auf dem Landefeld von ${st.name} gelandet. Zu Fuß zum Eingang.`);
  return true;
}
// aus der Basis hinaus: vor der Tür, Blick nach draußen
export function leaveBaseOnFoot() {
  const st = world.stations[0], p = st && basePad(st);
  if (p) place(p.door.x - Math.sin(p.door.yaw) * 2.0, p.door.z - Math.cos(p.door.yaw) * 2.0, p.door.yaw);
  else place(ROVER.ship.x + 8, ROVER.ship.z, 0);
}
export function enterRover() { fahrerZeigen(true); hideFieldViewModel(); FOOT.active = false; FOOT.act = ''; resetRoverCamera(); if (me) me.s.g.visible = false; sfx('door_close', 0.4, 1.2, () => snd(200, 0.2, 'triangle', 0.03, 60)); }
export function footOff() { hideFieldViewModel(); FOOT.active = false; FOOT.act = ''; if (me) me.s.g.visible = false; if (document.pointerLockElement === gl && settings.steer === 'zeiger') document.exitPointerLock(); }   // direkte Lenkung: eingefangen lassen
export function footJump() { if (!FOOT.active || FOOT.jy > 0 || FOOT.jv !== 0) return; FOOT.jv = 4.6; snd(95, 0.05, 'triangle', 0.02, 40); }

// Platz für den Körper? (Gelände zu steil, Wasser/Lava, Kartenrand, Lagerstätten, Station, Schiff, Rover)
function blocked(x: number, z: number, ox: number, oz: number) {
  if (Math.abs(x) > SURF.limit || Math.abs(z) > SURF.limit) return 'rand';
  if (liquidAt(x, z)) return 'nass';
  const step = Math.hypot(x - ox, z - oz);
  if (step > 0 && (terrainAt(x, z) - terrainAt(ox, oz)) / step > 1.1) return 'steil';
  // runde Hindernisse: gesperrt ist nur, was näher heranführt (wer drinsteht, kommt immer heraus)
  const hit = (cx: number, cz: number, r: number) => { const d = Math.hypot(x - cx, z - cz); return d < r && d < Math.hypot(ox - cx, oz - cz); };
  for (const a of world.asteroids) if (hit(a.x, a.z, a.r * 0.85 + 0.45)) return 'fest';
  if (wallBetween(ox, oz, x, z, FOOT.y) || surfaceAt(x, z, FOOT.y) - FOOT.y > 1.7) return 'fest';
  if (hit(ROVER.ship.x, ROVER.ship.z, shipR())) return 'fest';
  if (ROVER.model && hit(ROVER.x, ROVER.z, 2.3)) return 'fest';
  if (treeNear(x, z, 0.6) && !treeNear(ox, oz, 0.6)) return 'fest';
  if (salvageBlock(x, z, 0.4) && !salvageBlock(ox, oz, 0.4)) return 'fest';
  return '';
}

export function updateFoot(dt: number) {
  fahrerZeigen(false);      // zu Fuß: der Buggy steht leer (fahrer.ts)
  if (CITY.walk) cityBark(FOOT.x, FOOT.y, FOOT.z);   // Stimmen der Crew in der Stadt
  if (!FOOT.active) return;
  updateFlora(camera.position);
  // zusammengebrochen (Ferrox-Drohnen): kurz liegen bleiben, dann am Schiff aufwachen
  if (FIGHT.down > 0) {
    noteFoot(false, true);      // auch in der Ich-Sicht: Mitspieler sehen die Figur fallen
    if (fieldDown(dt)) { leaveShipOnFoot(); radio('SYSTEM', 'Du kommst am Schiff wieder zu dir.'); }
    if (me) driveAvatar(me, dt, { x: FOOT.x, y: FOOT.y, z: FOOT.z, yaw: FOOT.yaw, pitch: 0, vx: 0, vz: 0, dead: FIGHT.down > 0, crouch: STANCE.crouch });
    updateFieldFight(dt, { x: FOOT.x, y: FOOT.y, z: FOOT.z, yaw: FOOT.yaw, pitch: FOOT.pitch, eye: eyeH(), active: false, tp: VIEW.tp, muzzle: null });
    return;
  }
  FOOT.warn -= dt;
  FOOT.locked = document.pointerLockElement === gl;
  if (!FOOT.locked && (grabT -= dt) <= 0) { grabT = 0.4; const ua = (navigator as any).userActivation; if (!ua || ua.isActive) { try { const r: any = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* bleibt bei Zeigersteuerung */ } } }
  if (!FOOT.locked && settings.steer === 'zeiger') {      // direkte Lenkung: ohne Zeiger kein Drehen
    const mx = clamp((mouse.x - view.W / 2) / (view.W / 2), -1, 1), my = clamp((mouse.y - view.H / 2) / (view.H / 2), -1, 1), dz = 0.14, sh = (v: number) => Math.sign(v) * Math.max(0, Math.abs(v) - dz) / (1 - dz);
    FOOT.yaw -= sh(mx) * 2.4 * settings.sens * dt; FOOT.pitch += (-sh(my) * 1.0 * (settings.invertY ? -1 : 1) - FOOT.pitch) * Math.min(1, dt * 5);
  }
  if (keys.ArrowLeft) FOOT.yaw += 2 * dt;
  if (keys.ArrowRight) FOOT.yaw -= 2 * dt;
  // Laufen (wie in der Mine): weich anlaufen, an Hindernissen entlanggleiten
  const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const run = !!(keys.ShiftLeft || keys.ShiftRight), sp = f || s ? footPace(f, s, run, 4.2, 6.4) * gearFactor('tempo') / Math.hypot(f, s) : 0;
  setIntent(FOOT.yaw, f, s, run, dt);
  const sy = Math.sin(FOOT.yaw), cy = Math.cos(FOOT.yaw), k = Math.min(1, dt * (f || s ? (FOOT.jy > 0 ? 2 : footAccel(10)) : (FOOT.jy > 0 ? 1 : footBrake(13))));
  FOOT.vx += ((-sy * f + cy * s) * sp - FOOT.vx) * k; FOOT.vz += ((-cy * f - sy * s) * sp - FOOT.vz) * k;
  const ox = FOOT.x, oz = FOOT.z, dx = FOOT.vx * dt, dzz = FOOT.vz * dt;
  let why = '';
  if (dx || dzz) {
    if (!(why = blocked(ox + dx, oz + dzz, ox, oz))) { FOOT.x += dx; FOOT.z += dzz; }
    else if (!blocked(ox + dx, oz, ox, oz)) { FOOT.x += dx; FOOT.vz = 0; }
    else if (!blocked(ox, oz + dzz, ox, oz)) { FOOT.z += dzz; FOOT.vx = 0; }
    else FOOT.vx = FOOT.vz = 0;
  }
  if (why === 'nass' && FOOT.warn <= 0) { radio('SYSTEM', 'Hier geht es nicht weiter: Flüssigkeit voraus.'); FOOT.warn = 4; }
  // Boden folgen; Sprung mit Schwerkraft
  const g = surfaceAt(FOOT.x, FOOT.z, FOOT.y + FOOT.jy);
  if (FOOT.jv !== 0 || FOOT.jy > 0) {
    FOOT.jy += FOOT.jv * dt; FOOT.jv -= 15 * dt;
    if (FOOT.jy <= 0) { FOOT.jy = 0; FOOT.jv = 0; stepT = 0; }
  }
  FOOT.y += (g - FOOT.y) * Math.min(1, dt * (g > FOOT.y ? 45 : 18));      // bergauf fast sofort (sonst steckt man beim Aufstieg im Hang), bergab weich
  const moved = Math.hypot(FOOT.x - ox, FOOT.z - oz), v = dt > 0 ? moved / dt : 0;
  FOOT.walked += moved; stepT -= moved;
  if (stepT <= 0 && moved > 0 && FOOT.jy === 0) { stepT = v > 5 ? 2.1 : 1.6; sfx('step' + Math.floor(Math.random() * 5), v > 5 ? 0.45 : 0.3, 0.75 + Math.random() * 0.2); }
  FOOT.bob += (Math.sin(FOOT.walked * 4.2) * Math.min(1, v / 4) * 0.045 - FOOT.bob) * Math.min(1, dt * 14);
  // Was ist in Reichweite?
  const mine = nearEntrance(FOOT.x, FOOT.z);
  const door = nearDoor(FOOT.x, FOOT.z);
  const crate = nearCrate(FOOT.x, FOOT.z), tgt = nearFootTarget();
  FOOT.act = tgt ? 'story' : door ? 'base' : crate ? 'crate' : footNearShip() ? 'ship' : mine ? 'mine' : footNearRover() ? 'rover' : '';
  FOOT.prompt = FOOT.act === 'story' ? tgt!.label : FOOT.act === 'crate' ? (crate!.big ? 'Tresorkiste öffnen' : 'Kiste öffnen') : FOOT.act === 'base' ? `${door!.st.name} betreten` : FOOT.act === 'ship' ? (settings.walk ? `An Bord der ${P.shipName} gehen` : `In die ${P.shipName} einsteigen`) : FOOT.act === 'mine' ? `${mine!.name} betreten` : FOOT.act === 'rover' ? 'In den Rover steigen' : '';
  // eigene Figur
  aimUpdate(dt, FIGHT.down <= 0, { still: Math.hypot(FOOT.vx, FOOT.vz) < 0.4, crouch: STANCE.crouch, air: FOOT.jy > 0.05 });
  const body = VIEW.tp || bodyView();      // Figur zeigen: Außensicht, oder Ich-Sicht mit ganzem Körper
  if (body) me = syncAvatar(scene, me, figGear());
  if (me) {
    me.s.g.visible = body && (VIEW.tp || FIGHT.down <= 0);
    if (body) driveAvatar(me, dt, { fp: !VIEW.tp, x: FOOT.x, y: FOOT.y + FOOT.jy, z: FOOT.z, yaw: FOOT.yaw, pitch: FOOT.pitch, vx: FOOT.vx, vz: FOOT.vz, wid: viewModelId(P.gear?.waffe), crouch: STANCE.crouch, air: FOOT.jy > 0.05, ground: footGround, hit: ACT.hit, fire: FIGHT.flash > 0, combat: FIGHT.foes.some(f => !f.dead && f.alert), reload: GUN.reload > 0 ? 1 - GUN.reload / GUN.reloadT : -1, armed: true, ads: AIM.on });
  }
  // Kampf: Schießen (Klick), Drohnen, Geschosse; in der Außensicht kommt der Leuchtstrich aus der Mündung der Figur
  const mz = body ? avatarMuzzle(me) : null;
  updateFieldFight(dt, { x: FOOT.x, y: FOOT.y + FOOT.jy, z: FOOT.z, yaw: FOOT.yaw, pitch: FOOT.pitch, eye: eyeH(), active: true, tp: VIEW.tp, muzzle: mz });
}

/** Taste G zu Fuß: Granate in Blickrichtung werfen */
export function footGrenade() { if (FOOT.active && fieldGrenade({ x: FOOT.x, y: FOOT.y + FOOT.jy, z: FOOT.z, yaw: FOOT.yaw, pitch: FOOT.pitch, eye: eyeH() })) noteToss(); }
const _c = new THREE.Vector3();
export function footCamera(dt: number) {
  if (VIEW.tp && me) tpCamPos(_c, FOOT.x, FOOT.y + FOOT.jy, FOOT.z, FOOT.yaw, FOOT.pitch, (x, y, z) => y > padGround(x, z) + 0.3 && !baseBlocked(x, z, y - 1.2) && !(CITY.walk && wallBetween(FOOT.x, FOOT.z, x, z, y - 1.8)) && !(ROVER.model && Math.hypot(x - ROVER.x, z - ROVER.z) < 2.2) && !treeNear(x, z, 1.1), dt);
  else _c.set(FOOT.x, FOOT.y + FOOT.jy + eyeH() + FOOT.bob, FOOT.z);
  camera.position.copy(_c);
  camera.rotation.order = 'YXZ'; camera.rotation.set(FOOT.pitch + FIGHT.kick * 0.012, FOOT.yaw, 0); aimShake(camera.rotation);
  if (FIGHT.down > 0 && !VIEW.tp) camera.position.y -= (3 - FIGHT.down) * 0.4;
  const fpb = FOOT.active && !VIEW.tp && !!me && fpBody(camera, aimK());      // Ich-Sicht: der eigene Körper statt der Waffe allein
  fieldViewModel(FOOT.active && !VIEW.tp && !fpb, FOOT.bob, FOOT.walked);
  { const f = aimFov(72); if (Math.abs(camera.fov - f) > 0.05) { camera.fov = f; camera.updateProjectionMatrix(); } }
}

// Anzeige: Aufforderung, Richtung zu Schiff und Rover, Fadenkreuz
const _p = new THREE.Vector3();
function marker(x: number, y: number, z: number, text: string, col: string, row: number) {
  const W = view.W, H = view.H;
  _p.set(x, y, z).project(camera);
  if (_p.z < 1 && Math.abs(_p.x) < 1 && Math.abs(_p.y) < 1) {
    ux.fillStyle = col; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
    ux.fillText(text, (_p.x + 1) / 2 * W, (1 - _p.y) / 2 * H);
  } else {
    const ang = Math.atan2(x - FOOT.x, z - FOOT.z) - Math.atan2(-Math.sin(FOOT.yaw), -Math.cos(FOOT.yaw));
    const cx = W / 2 + (row ? 70 : -70);
    ux.save(); ux.translate(cx, 70); ux.rotate(-ang); ux.fillStyle = col;
    ux.beginPath(); ux.moveTo(0, -12); ux.lineTo(7, 5); ux.lineTo(-7, 5); ux.closePath(); ux.fill(); ux.restore();
    ux.fillStyle = col; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center'; ux.fillText(text, cx, 94);
  }
}
// Ziele der Geschichte am Boden (zu Fuß und im Rover)
export function drawGroundMarkers() {
  const W = view.W, H = view.H, px = FOOT.active ? FOOT.x : ROVER.x, pz = FOOT.active ? FOOT.z : ROVER.z;
  ux.save(); ux.textAlign = 'center';
  for (const mk of storyMarkers(true)) {
    _p.set(mk.x, mk.y, mk.z).project(camera);
    const d = Math.hypot(mk.x - px, mk.z - pz), label = `◆ ${mk.label} · ${d >= 1000 ? (d / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(d) + ' m'}`;
    if (_p.z < 1 && Math.abs(_p.x) < 1 && Math.abs(_p.y) < 1) { ux.fillStyle = mk.col; ux.font = '700 13px "Share Tech Mono",Consolas,monospace'; ux.fillText(label, (_p.x + 1) / 2 * W, (1 - _p.y) / 2 * H); }
    else { const yaw = FOOT.active ? FOOT.yaw : ROVER.yaw, ang = Math.atan2(mk.x - px, mk.z - pz) - Math.atan2(-Math.sin(yaw), -Math.cos(yaw)); ux.save(); ux.translate(W / 2, 120); ux.rotate(-ang); ux.fillStyle = mk.col; ux.beginPath(); ux.moveTo(0, -12); ux.lineTo(7, 5); ux.lineTo(-7, 5); ux.closePath(); ux.fill(); ux.restore(); ux.fillStyle = mk.col; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillText(label, W / 2, 144); }
  }
  ux.restore();
}
export function drawFootHUD() {
  if (!FOOT.active || G.mode !== 'rover') return;
  const W = view.W, H = view.H;
  ux.save();
  const dS = Math.hypot(FOOT.x - ROVER.ship.x, FOOT.z - ROVER.ship.z);
  marker(ROVER.ship.x, ROVER.ship.y + 10, ROVER.ship.z, `${P.shipName.toUpperCase()} · ${Math.round(dS)} m`, '#5fd0ff', 0);
  { const cd = cityDoorPos(); if (cd) { const dD = Math.hypot(FOOT.x - cd.x, FOOT.z - cd.z); if (dD > 4 && dD < 500) marker(cd.x, cd.y + 4, cd.z, `PROMENADE · ${Math.round(dD)} m`, '#7fe0a0', 2); } }
  if (ROVER.model && !CITY.walk) { const dR = Math.hypot(FOOT.x - ROVER.x, FOOT.z - ROVER.z); if (dR > 6) marker(ROVER.x, ROVER.y + 4, ROVER.z, `ROVER · ${Math.round(dR)} m`, '#e09030', 1); }
  drawSalvageHUD(FOOT.x, FOOT.z);
  { const b = cityBubble(); if (b) { _p.copy(b.p).project(camera); if (_p.z < 1 && Math.abs(_p.x) < 1.05 && Math.abs(_p.y) < 1.05) drawSpeechBubble((_p.x + 1) / 2 * W, (1 - _p.y) / 2 * H, b.text, b.a); } }
  drawFieldHUD();
  drawGroundMarkers();
  const bs = world.stations[0], bp = bs && basePad(bs);
  if (bp) { const dD = Math.hypot(FOOT.x - bp.door.x, FOOT.z - bp.door.z); if (dD > 4 && dD < 400) { _p.set(bp.door.x, padGround(bp.door.x, bp.door.z) + 3, bp.door.z).project(camera); if (_p.z < 1 && Math.abs(_p.x) < 1 && Math.abs(_p.y) < 1) { ux.fillStyle = '#7fe0a0'; ux.font = '700 12px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center'; ux.fillText(`EINGANG · ${Math.round(dD)} m`, (_p.x + 1) / 2 * W, (1 - _p.y) / 2 * H); } } }
  if (FOOT.locked) drawFootCross(72);      // Fadenkreuz, Treffermarke, Abschüsse in Folge (ui/footHud.ts)
  if (FOOT.prompt) drawPrompt(FOOT.prompt, '#e09030', H * 0.66);   // gleiche Aufforderung wie in Station und Mine (ui/footHud.ts)
  if (!FOOT.locked) { ux.textAlign = 'center'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillStyle = '#8aa0b0'; ux.fillText('Klick: Maus einfangen', W / 2, H - 12); }
  ux.restore();
}

// Maus: Blick bei gefangenem Zeiger; Esc → Pausenmenü (main.ts hängt pause() ein)
document.addEventListener('mousemove', e => {
  if (!FOOT.active || G.mode !== 'rover' || document.pointerLockElement !== gl) return;
  const k = 0.0023 * settings.sens;
  FOOT.yaw -= e.movementX * k; FOOT.pitch = clamp(FOOT.pitch - e.movementY * k * (settings.invertY ? -1 : 1), -1.35, 1.35);
});
let wasLocked = false;
document.addEventListener('pointerlockchange', () => {
  const now = document.pointerLockElement === gl;
  if (wasLocked && !now && FOOT.active && G.mode === 'rover') footHooks.unlock();
  wasLocked = now;
});
gl.addEventListener('click', () => { if (FOOT.active && G.mode === 'rover' && document.pointerLockElement !== gl) { try { const r: any = gl.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* nicht erlaubt */ } } });
