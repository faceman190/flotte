import * as THREE from 'three';
import { camera, view, ux, gl } from '../core/engine';
import { mouse, releaseAll } from '../core/input';
import { clamp, d3, rand } from '../core/util';
import { snd, gunSound, sfx } from '../core/audio';
import { SHIPS, computeStats, type ShipId, type Up } from '../data/ships';
import { gearDef } from '../data/gear';
import { setTurm, hatTurm } from '../models/gltfShips';
import { P, G, stats, settings, emptyUp } from './state';
import { world } from './world';
import { ZIELE } from './orte';
import { fireBullet } from './combat';
import { flash } from './fx';
import { SHARED } from './shared';
import { playerBolt, BOLTS } from './bolts';
import { coopSend, onCoop, coopNet } from './coop';
import { SHIP } from './player';
import { radio } from '../ui/radio';

// =====================================================================================
// Rückenturm (seit 2026-11-26, Harpyie). Nutzer: „Fliegt man alleine, soll der Turm mit auf das Ziel des Piloten schießen“, dazu der
// Schützenplatz für einen zweiten Spieler oder für den Piloten selbst (gelandet oder wenn das Schiff im Flug Kurs hält).
//  - Aufgeschaltet (turmAuto, aus player.ts): Der Turm folgt dem Ziel, das der Pilot erfasst hat, und feuert mit der Feuertaste mit, solange das
//    Ziel in seinem Schussfeld liegt. Er hält das Ziel auch, wenn es aus dem Fadenkreuz wandert. 60 % der Feuerrate.
//  - Schützenplatz (schuetzeAn … schuetzeAus): Blick der Turmkamera, die Maus richtet, linke Taste feuert (volle Feuerrate, eigene Hitze),
//    rechte Taste vergrößert. Am eigenen Schiff aus dem gemeinsamen Munitionsvorrat. Als Gast auf dem Schiff eines Mitspielers schießt man
//    eigene Geschosse (wie überall im Mehrspieler) und meldet die Stellung des Turms, damit ihn alle gleich sehen.
//  - Schussfeld: rundum, Höhe −5° … +70°. Nach vorn nicht unter die Waagerechte (Kanzel), zwischen den Heckflossen nicht unter 10°.
//    Unter dem Rumpf gibt es kein Schussfeld.
//  - Der Turm dreht träge (rund 90° je Sekunde). Das Waffenmodul des Schiffs gilt auch für den Turm.
// Modellgelenke: gltfShips.ts setTurm. Maße in Schiffskoordinaten (Nase −z, +y oben) aus asset-src/neu/harpyie/har-gelenke.json (turm.b/w/m).
// =====================================================================================
interface TurmDef { b: number[]; w: number[]; m: number[]; auge: number[] }
export const TURM: Partial<Record<string, TurmDef>> = {
  // b: Drehachse, w: Rohrwiege (Höhenrichtachse), m: Mündung backbord, auge: Kamera über der Wiege (nach oben, nach hinten)
  harpyie: { b: [0, 1.759, -3.909], w: [0, 2.179, -4.859], m: [-0.55, 2.179, -8.159], auge: [0.7, 0.17] },
};
const GIER_V = 1.6, HOEHE_V = 1.2, P_MAX = 1.22, P_MIN = -0.087, RW = 1400;
const AUTO_RATE = 0.6;      // Aufgeschaltet: Anteil der Feuerrate
export const TS = { yaw: 0, pitch: 0, cool: 0, hitze: 0, heiss: false, seite: 0, ziel: null as any, frei: false, fremd: 0, sendT: 0, sy: 9, sp: 9 };
export const GUN = { aktiv: false, gast: 0, cls: '' as string, g: null as THREE.Object3D | null, wy: 0, wp: 0, dx: 0, dy: 0, zoom: 0, ziel: null as any, sperre: false, yaw0: 0, pitch0: 0, tipT: 0 };
const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
const _q = new THREE.Quaternion(), _qi = new THREE.Quaternion(), _qt = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** tiefste Rohrstellung in dieser Richtung (Kanzel vorn, Heckflossen) */
export function turmTief(yaw: number) {
  const v = Math.abs(wrap(yaw)), h = Math.abs(wrap(yaw - Math.PI));
  return v < 0.38 ? 0 : h > 0.07 && h < 0.23 ? 0.175 : P_MIN;
}
const lebt = (z: any) => !!z && ((world.enemies as any[]).includes(z) || ((ZIELE as any[]).includes(z) && z.alive));
function rahmenEigen() { _e.set(P.pitch, P.yaw, G.roll); _q.setFromEuler(_e); _p.set(P.x, P.y, P.z); _qi.copy(_q).invert(); }
function rahmenObj(g: THREE.Object3D) { g.updateWorldMatrix(true, false); g.matrixWorld.decompose(_p, _q, _s); _qi.copy(_q).invert(); }
// Punkt am Turm (Versatz gegen die Wiege, dreht mit Höhe und Seite) in die Welt; nurSeite: der Punkt dreht nur mit dem Turm (Kamera)
function turmPunkt(def: TurmDef, x: number, y: number, z: number, out: THREE.Vector3, nurSeite = false) {
  out.set(x, y, z); if (!nurSeite) out.applyAxisAngle(X, TS.pitch);
  out.x += def.w[0] - def.b[0]; out.y += def.w[1] - def.b[1]; out.z += def.w[2] - def.b[2];
  out.applyAxisAngle(Y, TS.yaw); out.x += def.b[0]; out.y += def.b[1]; out.z += def.b[2];
  return out.applyQuaternion(_q).add(_p);
}
const rohrRichtung = (out: THREE.Vector3) => out.set(0, 0, -1).applyAxisAngle(X, TS.pitch).applyAxisAngle(Y, TS.yaw).applyQuaternion(_q);
function richte(dt: number, wy: number, wp: number) {
  TS.yaw = wrap(TS.yaw + clamp(wrap(wy - TS.yaw), -GIER_V * dt, GIER_V * dt));
  const tief = turmTief(TS.yaw), soll = clamp(wp, tief, P_MAX);
  TS.pitch += clamp(soll - TS.pitch, -HOEHE_V * dt, HOEHE_V * dt);
  if (TS.pitch < tief) TS.pitch = Math.min(tief, TS.pitch + HOEHE_V * 2 * dt);      // beim Schwenk über Kanzel und Flossen heben sich die Rohre
}
// ein Schuss aus dem Rohr, das an der Reihe ist (Rahmen _q/_p steht); vx…: Fahrt des Schiffs
function schuss(def: TurmDef, dmg: number, cls: string, vx: number, vy: number, vz: number) {
  const bolt = playerBolt(dmg, SHIPS[cls as ShipId] as any, GUN.gast ? undefined : gearDef(P.shipGear?.waffe || '')?.bolt), bs = BOLTS[bolt], sp = bs.speed || 1;
  TS.seite ^= 1; const s = TS.seite ? 1 : -1;
  turmPunkt(def, (def.m[0] - def.w[0]) * s, def.m[1] - def.w[1], def.m[2] - def.w[2], _a); rohrRichtung(_d);
  const b = fireBullet(world.bullets, _a.x, _a.y, _a.z, _d.x + rand(-0.004, 0.004), _d.y + rand(-0.004, 0.004), _d.z + rand(-0.004, 0.004), RW * sp, 0.75 / sp, dmg, 'p', { bolt });
  b.vx += vx * 0.5; b.vy += vy * 0.5; b.vz += vz * 0.5;
  if (SHARED.online && SHARED.pshots.length < 60) SHARED.pshots.push([Math.round(_a.x * 10) / 10, Math.round(_a.y * 10) / 10, Math.round(_a.z * 10) / 10, Math.round(b.vx), Math.round(b.vy), Math.round(b.vz), b.life, bolt]);
  if (bs.muzzle) flash(_a.x + _d.x * 1.2, _a.y + _d.y * 1.2, _a.z + _d.z * 1.2, '#' + bs.halo.toString(16).padStart(6, '0'), bs.muzzle * 1.2, 0.05);
  if (!gunSound(0.85, bs.pitch * 0.9)) snd(120, 0.05, 'square', 0.02, -50);
}
// Richtung zu einem Ziel mit Vorhalt, im Rahmen des Schiffs als Seite und Höhe; false: außer Reichweite
function zielWinkel(def: TurmDef, z: any, vx: number, vy: number, vz: number, out: { y: number; p: number }) {
  _b.set(def.b[0], def.b[1], def.b[2]).applyQuaternion(_q).add(_p);
  const d = d3(z.x, z.y, z.z, _b.x, _b.y, _b.z); if (d > RW) return false;
  const t = d / RW;
  _a.set(z.x + ((z.vx || 0) - vx * 0.5) * t - _b.x, z.y + ((z.vy || 0) - vy * 0.5) * t - _b.y, z.z + ((z.vz || 0) - vz * 0.5) * t - _b.z).normalize().applyQuaternion(_qi);
  out.y = Math.atan2(-_a.x, -_a.z); out.p = Math.asin(clamp(_a.y, -1, 1));
  return true;
}
const _w = { y: 0, p: 0 };

/** jedes Bild im Flug (player.ts): aufgeschaltet auf das Ziel des Piloten; feuer = Feuertaste gehalten */
export function turmAuto(dt: number, feuer: boolean) {
  const def = TURM[P.cls]; if (!def) return;
  TS.cool -= dt; TS.hitze = Math.max(0, TS.hitze - 22 * dt);
  if (TS.fremd > 0) { TS.fremd -= dt; return; }      // ein Mitspieler sitzt am Schützenplatz und richtet
  rahmenEigen();
  let z = G.lockT as any;
  if (z) TS.ziel = z; else { z = TS.ziel; if (z && !lebt(z)) z = TS.ziel = null; }
  let wy = 0, wp = 0, frei = false;
  if (z && zielWinkel(def, z, P.vx, P.vy, P.vz, _w)) { wy = _w.y; wp = _w.p; frei = wp >= turmTief(wy) - 0.01 && wp <= P_MAX; }
  if (z && !frei && z !== G.lockT) { TS.ziel = null; wy = wp = 0; }      // aus dem Schussfeld gewandert und nicht mehr im Fadenkreuz: loslassen
  if (!frei) wp = Math.max(wp, 0);
  richte(dt, wy, wp); TS.frei = frei;
  if (feuer && frei && TS.cool <= 0 && P.ammo > 0 && Math.abs(wrap(wy - TS.yaw)) < 0.05 && Math.abs(wp - TS.pitch) < 0.05) {
    const st = stats(); schuss(def, st.dmg, P.cls, P.vx, P.vy, P.vz); P.ammo--; TS.cool = st.rate / AUTO_RATE;
  }
}
/** jedes Bild (main.ts): Stellung ans Modell geben, Stellung melden, fremde Stellungen abklingen lassen */
export function turmBild(dt: number) {
  if (!hatTurm(SHIPS[P.cls]?.model || '')) return;
  if (!GUN.gast) setTurm(SHIP.g, TS.yaw, TS.pitch);
  // Mehrspieler: Stellung des eigenen Turms höchstens achtmal je Sekunde, nur wenn sie sich geändert hat
  TS.sendT -= dt;
  if (coopNet.id && TS.sendT <= 0 && !GUN.gast && TS.fremd <= 0 && (Math.abs(TS.yaw - TS.sy) > 0.01 || Math.abs(TS.pitch - TS.sp) > 0.01)) {
    TS.sendT = 0.125; TS.sy = TS.yaw; TS.sp = TS.pitch; coopSend('tu', { s: coopNet.id, y: +TS.yaw.toFixed(3), p: +TS.pitch.toFixed(3) });
  }
}

// ---------- Schützenplatz ----------
/** Grund, warum der Platz gerade nicht geht (null = geht) */
export function schuetzeGrund(ctx: string): string | null {
  if (ctx === 'hangar') return 'Im Hangar bleibt der Turm gesichert.';
  return null;
}
/** an den Platz setzen. g: Modell des Schiffs (eigenes oder das des Mitspielers), gast: Kennung des Besitzers oder 0 */
export function schuetzeAn(cls: string, g: THREE.Object3D, gast = 0, blick?: { yaw: number; pitch: number }) {
  if (!TURM[cls] || GUN.aktiv) return false;
  Object.assign(GUN, { aktiv: true, gast, cls, g, wy: gast ? 0 : TS.yaw, wp: gast ? 0 : TS.pitch, dx: 0, dy: 0, zoom: 0, ziel: null, sperre: false, yaw0: blick?.yaw || 0, pitch0: blick?.pitch || 0, tipT: 8 });
  if (gast) { TS.yaw = 0; TS.pitch = 0; }
  TS.heiss = false; releaseAll();
  sfx('ui_open', 0.4, 1, () => snd(420, 0.2, 'sine', 0.03, 160));
  return true;
}
export function schuetzeAus() {
  if (!GUN.aktiv) return;
  GUN.aktiv = false; releaseAll();
  if (GUN.gast) { TS.yaw = 0; TS.pitch = 0; }
  GUN.gast = 0; GUN.g = null;
  if (Math.abs(camera.fov - 72) > 0.05) { camera.fov = 72; camera.updateProjectionMatrix(); }
  snd(360, 0.12, 'sine', 0.03, -120);
}
gl.addEventListener('mousemove', e => { if (GUN.aktiv && document.pointerLockElement === gl) { GUN.dx += e.movementX || 0; GUN.dy += e.movementY || 0; } });
/** jedes Bild am Schützenplatz (main.ts simulate, statt updateWalk). vx…: Fahrt des Schiffs */
export function updateSchuetze(dt: number, vx = 0, vy = 0, vz = 0) {
  const def = TURM[GUN.cls], g = GUN.g; if (!def || !g || !g.parent) { schuetzeAus(); return; }
  if (document.pointerLockElement !== gl) { GUN.tipT = Math.max(GUN.tipT, 0.5); }
  const k = (GUN.zoom > 0.5 ? 0.0009 : 0.0022) * settings.sens;
  GUN.wy = wrap(GUN.wy - GUN.dx * k); GUN.wp = clamp(GUN.wp - GUN.dy * k * (settings.invertY ? -1 : 1), P_MIN, P_MAX); GUN.dx = GUN.dy = 0;
  GUN.zoom += ((mouse.right ? 1 : 0) - GUN.zoom) * Math.min(1, dt * 8); GUN.tipT -= dt;
  rahmenObj(g);
  richte(dt, GUN.wy, GUN.wp);
  GUN.sperre = GUN.wp < turmTief(TS.yaw) - 0.02;
  TS.cool -= dt; TS.hitze = Math.max(0, TS.hitze - 22 * dt); if (TS.heiss && TS.hitze < 45) TS.heiss = false;
  const eigen = !GUN.gast, st = eigen ? stats() : computeStats(GUN.cls as ShipId, emptyUp() as Up);
  if (mouse.down && TS.cool <= 0 && !TS.heiss && document.pointerLockElement === gl) {
    if (eigen && P.ammo <= 0) { if (GUN.tipT < -2) { GUN.tipT = 0; radio('TURM', 'Munition leer.', '#ffb347'); } }
    else {
      schuss(def, st.dmg, GUN.cls, vx, vy, vz); if (eigen) P.ammo--;
      TS.cool = st.rate; TS.hitze += 55 * st.rate;      // Dauerfeuer überhitzt nach rund drei Sekunden, gleich bei welcher Feuerrate
      if (TS.hitze >= 100) { TS.heiss = true; radio('TURM', 'Rohre überhitzt. Kurz abkühlen lassen.', '#ff9b7a'); snd(240, 0.3, 'sawtooth', 0.03, -80); }
    }
  }
  // Ziel fürs Visier: der Gegner, der dem Fadenkreuz am nächsten steht (innerhalb von 7°)
  rohrRichtung(_d); turmPunkt(def, 0, 0, 0, _b);
  let best = 0.9925; GUN.ziel = null;
  for (const e of world.enemies as any[]) {
    _a.set(e.x - _b.x, e.y - _b.y, e.z - _b.z); const d = _a.length(); if (d > RW * 1.2) continue;
    const c = _a.divideScalar(d).dot(_d); if (c > best) { best = c; GUN.ziel = e; }
  }
  // Stellung melden (Gast: an den Besitzer und alle anderen im Raum)
  TS.sendT -= dt;
  if (coopNet.id && TS.sendT <= 0) { TS.sendT = 0.125; coopSend('tu', { s: GUN.gast || coopNet.id, y: +TS.yaw.toFixed(3), p: +TS.pitch.toFixed(3) }); }
  if (GUN.gast) setTurm(g, TS.yaw, TS.pitch);
}
/** Kamera der Turmoptik (main.ts updateCamera) */
export function turmKamera() {
  const def = TURM[GUN.cls], g = GUN.g; if (!def || !g) return;
  rahmenObj(g);
  turmPunkt(def, 0, def.auge[0], def.auge[1], _a, true); camera.position.copy(_a);
  _e.set(TS.pitch, TS.yaw, 0); _qt.setFromEuler(_e); camera.quaternion.copy(_q).multiply(_qt);
  const fov = 58 - 30 * GUN.zoom; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
}
/** Anzeige der Turmoptik (main.ts, statt der Anzeige zu Fuß) */
export function drawTurmHUD() {
  const W = view.W, H = view.H, cx = W / 2, cy = H / 2, c = '#7fe6dd', warn = '#ffc46b';
  ux.save(); ux.lineWidth = 1.6; ux.strokeStyle = TS.heiss ? '#ff7a5c' : c; ux.fillStyle = c; ux.font = '600 15px Rajdhani, "IBM Plex Sans", sans-serif'; ux.textAlign = 'center';
  // Fadenkreuz
  ux.beginPath(); ux.arc(cx, cy, 22, 0, 6.2832); ux.moveTo(cx, cy - 56); ux.lineTo(cx, cy - 30); ux.moveTo(cx, cy + 30); ux.lineTo(cx, cy + 56); ux.moveTo(cx - 56, cy); ux.lineTo(cx - 30, cy); ux.moveTo(cx + 30, cy); ux.lineTo(cx + 56, cy); ux.stroke();
  ux.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  // Richtung und Höhe
  const grad = Math.round(((-TS.yaw * 180 / Math.PI) % 360 + 360) % 360), hoehe = Math.round(TS.pitch * 180 / Math.PI);
  ux.fillText(`TURM ${String(grad).padStart(3, '0')}°  ·  HÖHE ${hoehe >= 0 ? '+' : '−'}${String(Math.abs(hoehe)).padStart(2, '0')}°`, cx, 46);
  ux.beginPath(); ux.moveTo(cx - 170, 60); ux.lineTo(cx + 170, 60);
  for (let a = -180; a < 180; a += 15) { const x = cx + wrap((a * Math.PI / 180) + TS.yaw) / Math.PI * 340; if (Math.abs(x - cx) < 170) { ux.moveTo(x, 60); ux.lineTo(x, a % 90 === 0 ? 72 : 66); } }
  ux.moveTo(cx, 52); ux.lineTo(cx, 60); ux.stroke();
  // Hitze, Munition
  ux.textAlign = 'left'; ux.strokeRect(46, H - 150, 12, 100); ux.fillStyle = TS.heiss ? '#ff7a5c' : TS.hitze > 70 ? warn : c; ux.fillRect(48, H - 52 - 96 * Math.min(1, TS.hitze / 100), 8, 96 * Math.min(1, TS.hitze / 100));
  ux.fillText(TS.heiss ? 'ÜBERHITZT' : `HITZE ${Math.round(TS.hitze)} %`, 68, H - 54);
  ux.fillStyle = c; ux.textAlign = 'right'; ux.fillText(GUN.gast ? 'MUNITION BORDVORRAT' : `MUNITION ${P.ammo}`, W - 46, H - 54);
  // Schussfeld: Kreis von oben (Bug oben), gesperrte Sektoren, Zeiger
  const sx = cx, sy = H - 96, r = 34;
  ux.textAlign = 'center'; ux.beginPath(); ux.arc(sx, sy, r, 0, 6.2832); ux.stroke();
  ux.fillStyle = 'rgba(255,196,107,.55)';
  for (const [a0, a1] of [[-0.38, 0.38], [Math.PI - 0.23, Math.PI - 0.07], [Math.PI + 0.07, Math.PI + 0.23]]) { ux.beginPath(); ux.moveTo(sx, sy); ux.arc(sx, sy, r, -Math.PI / 2 - a1, -Math.PI / 2 - a0); ux.closePath(); ux.fill(); }
  ux.strokeRect(sx - 4, sy - 11, 8, 22);
  ux.lineWidth = 2.6; ux.beginPath(); ux.moveTo(sx, sy); ux.lineTo(sx - Math.sin(TS.yaw) * r, sy - Math.cos(TS.yaw) * r); ux.stroke(); ux.lineWidth = 1.6;
  ux.fillStyle = c; ux.font = '600 12px Rajdhani, "IBM Plex Sans", sans-serif'; ux.fillText('SCHUSSFELD', sx, sy + r + 16);
  if (GUN.sperre) { ux.fillStyle = warn; ux.font = '600 16px Rajdhani, "IBM Plex Sans", sans-serif'; ux.fillText('SPERRE: EIGENES SCHIFF', cx, cy + 92); }
  // Ziel
  const z = GUN.ziel;
  if (z) {
    _a.set(z.x, z.y, z.z).project(camera);
    if (_a.z < 1) {
      const x = (_a.x * 0.5 + 0.5) * W, y = (-_a.y * 0.5 + 0.5) * H, d = Math.round(d3(z.x, z.y, z.z, camera.position.x, camera.position.y, camera.position.z));
      ux.strokeStyle = warn; ux.fillStyle = warn; ux.beginPath();
      for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ux.moveTo(x + dx * 20, y + dy * 12); ux.lineTo(x + dx * 20, y + dy * 20); ux.lineTo(x + dx * 12, y + dy * 20); }
      ux.stroke(); ux.font = '600 13px Rajdhani, "IBM Plex Sans", sans-serif'; ux.textAlign = 'left'; ux.fillText(`${d} m`, x + 26, y + 4);
    }
  }
  ux.textAlign = 'center'; ux.fillStyle = 'rgba(220,235,240,.85)'; ux.font = '500 14px Rajdhani, "IBM Plex Sans", sans-serif';
  ux.fillText(document.pointerLockElement === gl ? '[E] Platz verlassen  ·  Linke Maustaste: Feuer  ·  Rechte Maustaste: Zieloptik' : 'Ins Bild klicken, um den Turm zu richten  ·  [E] Platz verlassen', cx, H - 22);
  ux.restore();
}

// ---------- Mehrspieler: Stellung fremder Türme ----------
// m.s = Kennung des Schiffsbesitzers. Ist es das eigene Schiff, richtet gerade ein Gast: Aufschalten ruht, solange Meldungen kommen.
export const turmFremd = new Map<number, { y: number; p: number; t: number }>();
onCoop('tu', (m: any) => {
  const s = +m.s, y = +m.y, p = +m.p; if (!Number.isFinite(y) || !Number.isFinite(p)) return;
  if (s === coopNet.id) { if (m.from !== coopNet.id) { TS.fremd = 1; TS.yaw = wrap(y); TS.pitch = clamp(p, P_MIN, P_MAX); } return; }
  turmFremd.set(s, { y: wrap(y), p: clamp(p, P_MIN, P_MAX), t: performance.now() });
});
