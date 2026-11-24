import * as THREE from 'three';
import { scene, camera, view, ux } from '../core/engine';
import { keys, steer, look } from '../core/input';
import { clamp, d3 } from '../core/util';
import { snd, sfx, loopVol } from '../core/audio';
import { P, G, stats, saveGame } from './state';
import { SHIP } from './player';
import { Figur, neuesSkelett } from './figur';
import { figTracht } from './avatar';
import { mannyAnim, mannyBase } from './mannyAvatar';
import { evaContainer } from './begegnungen';
import { radio } from '../ui/radio';
import { burst } from './fx';

// =====================================================================================
// Außenbordeinsatz in der Schwerelosigkeit (seit 2026-11-24, Konzept docs/konzept-welt-und-leben.md Punkt 7)
//  - Im All bei fast stehendem Schiff [F]: die Figur schwebt im Anzug neben der offenen Heckrampe.
//  - Düsen am Anzug: W/S vor und zurück (in Blickrichtung), A/D seitlich, Leertaste hoch, Strg runter, Umschalt bremst; Maus dreht den Blick.
//    Kleine Trägheit, höchstens 6 m/s. Sauerstoff 4 Minuten, Düsentreibstoff für etwa 90 Sekunden Schub.
//  - [E] an treibenden Containern (Begegnung „Treibgut“): von Hand geborgen, anderthalbmal so viel Ware wie mit dem Traktorstrahl.
//  - [F] an der Schleuse (nahe am Schiff): wieder einsteigen. Sauerstoff leer: Notrückholung, die Hülle zahlt den Preis.
//  - Die Figur: eine Kopie der Spielfigur mit der eigenen Tracht in einer ruhigen Schwebehaltung (Stehpose, langsam abgespielt).
// =====================================================================================

export const EVA = { active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: 0, o2: 240, fuel: 90, warnT: 0, prompt: '' };
const O2 = 240, FUEL = 90, VMAX = 6, ACC = 3.2;
let sk: THREE.Object3D | null = null, fig: Figur | null = null, mixer: THREE.AnimationMixer | null = null, holder: THREE.Group | null = null, loading = false, clipOn = false;
const _f = new THREE.Vector3(), _r = new THREE.Vector3(), _u = new THREE.Vector3(0, 1, 0), _c = new THREE.Vector3(), _l = new THREE.Vector3();

/** darf hier ausgestiegen werden? null = ja, sonst der Grund */
export function evaGrund(): string | null {
  if (G.dead) return 'nicht jetzt';
  if (Math.hypot(P.vx, P.vy, P.vz) > 4) return 'Erst anhalten, dann aussteigen (unter 4 m/s).';
  return null;
}
function figurLaden() {
  if (sk || loading) return;
  loading = true; mannyBase();
  neuesSkelett().then(s => { loading = false; if (!s) return; sk = s; fig = new Figur(s); fig.setzen(figTracht()); mixer = new THREE.AnimationMixer(s); }).catch(() => { loading = false; });
}
export function startEva() {
  const g = evaGrund(); if (g) { radio('SYSTEM', g); return false; }
  figurLaden();
  P.vx = P.vy = P.vz = 0;
  // an der Heckrampe: hinter dem Schiff, etwas tiefer
  const r = stats().radius, q = SHIP.g.quaternion;
  _f.set(0, 0, -1).applyQuaternion(q);
  EVA.x = P.x - _f.x * (r + 5); EVA.y = P.y - r * 0.15; EVA.z = P.z - _f.z * (r + 5);
  EVA.vx = EVA.vy = EVA.vz = 0; EVA.yaw = P.yaw; EVA.pitch = 0; EVA.o2 = O2; EVA.fuel = FUEL; EVA.warnT = 0; EVA.active = true; clipOn = false;
  G.mode = 'eva';
  document.getElementById('hud')?.classList.add('hidden');
  sfx('door_open', 0.5, 0.8, () => snd(160, 0.6, 'sawtooth', 0.04, -60));
  radio('SYSTEM', 'Schleuse offen. Düsen: WASD, Leertaste hoch, Strg runter, Umschalt bremst. [E] Container bergen, [F] an der Schleuse einsteigen.');
  return true;
}
export function endEva(not = false) {
  EVA.active = false; G.mode = 'play'; holder?.removeFromParent(); loopVol('rover_engine', 0);
  document.getElementById('hud')?.classList.remove('hidden');
  if (not) { P.hull = Math.max(1, P.hull - stats().maxHull * 0.15); radio('SYSTEM', 'Sauerstoff leer. Notrückholung über die Leine, die Schleuse hat dabei etwas abbekommen.', '#ff6b5b'); }
  else sfx('door_close', 0.5, 1, () => snd(200, 0.2, 'triangle', 0.03, 60));
  saveGame();
}
const nahAmSchiff = () => d3(EVA.x, EVA.y, EVA.z, P.x, P.y, P.z) < stats().radius + 7;

/** jedes Bild im Modus 'eva' (main.ts) */
export function updateEva(dt: number) {
  if (!EVA.active) return;
  // Blick: Maus (eingefangen) oder freie Kamera
  EVA.yaw -= steer.dx * 0.0024; EVA.pitch = clamp(EVA.pitch - steer.dy * 0.0022, -1.4, 1.4); steer.dx = steer.dy = 0;
  if (look.dx || look.dy) { EVA.yaw -= look.dx * 0.003; EVA.pitch = clamp(EVA.pitch - look.dy * 0.003, -1.4, 1.4); look.dx = look.dy = 0; }
  _f.set(-Math.sin(EVA.yaw) * Math.cos(EVA.pitch), Math.sin(EVA.pitch), -Math.cos(EVA.yaw) * Math.cos(EVA.pitch));
  _r.set(Math.cos(EVA.yaw), 0, -Math.sin(EVA.yaw));
  const f = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0), s = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0), u = (keys.Space ? 1 : 0) - (keys.ControlLeft || keys.ControlRight ? 1 : 0);
  const thrust = (f || s || u) && EVA.fuel > 0;
  if (thrust) {
    EVA.vx += (_f.x * f + _r.x * s) * ACC * dt; EVA.vy += (_f.y * f + u) * ACC * dt; EVA.vz += (_f.z * f + _r.z * s) * ACC * dt;
    EVA.fuel = Math.max(0, EVA.fuel - dt);
    if (Math.random() < 0.5) burst(EVA.x - _f.x * f * 0.6, EVA.y - 0.2, EVA.z - _f.z * f * 0.6, '#dfe8f0', 2, 4, 0.25);
  }
  if ((keys.ShiftLeft || keys.ShiftRight) && EVA.fuel > 0) { const k = Math.exp(-2.5 * dt); EVA.vx *= k; EVA.vy *= k; EVA.vz *= k; EVA.fuel = Math.max(0, EVA.fuel - dt * 0.5); }
  const sp = Math.hypot(EVA.vx, EVA.vy, EVA.vz); if (sp > VMAX) { EVA.vx *= VMAX / sp; EVA.vy *= VMAX / sp; EVA.vz *= VMAX / sp; }
  EVA.x += EVA.vx * dt; EVA.y += EVA.vy * dt; EVA.z += EVA.vz * dt;
  // nicht in den Rumpf schweben
  const r = stats().radius * 0.55, d = d3(EVA.x, EVA.y, EVA.z, P.x, P.y, P.z);
  if (d < r) { const k = r / Math.max(0.01, d); EVA.x = P.x + (EVA.x - P.x) * k; EVA.y = P.y + (EVA.y - P.y) * k; EVA.z = P.z + (EVA.z - P.z) * k; EVA.vx *= -0.3; EVA.vy *= -0.3; EVA.vz *= -0.3; }
  loopVol('rover_engine', thrust ? 0.12 : 0);
  // Sauerstoff, Entfernung
  EVA.o2 -= dt; EVA.warnT -= dt;
  if (EVA.o2 <= 0) { endEva(true); return; }
  if (EVA.o2 < 45 && EVA.warnT <= 0) { EVA.warnT = 15; radio('ANZUG', `Sauerstoff knapp: noch ${Math.ceil(EVA.o2)} Sekunden.`, '#ffb347'); snd(880, 0.12, 'square', 0.04); }
  if (d > 600 && EVA.warnT <= 0) { EVA.warnT = 12; radio('ANZUG', 'Leine am Ende: zurück zum Schiff.', '#ffb347'); }
  // Hinweis
  EVA.prompt = nahAmSchiff() ? '[F] Durch die Schleuse einsteigen' : evaContainer(EVA.x, EVA.y, EVA.z, false) ? '[E] Container von Hand bergen' : '';
  // Figur: schwebt, schaut in Blickrichtung, langsames Treiben
  if (sk && fig) {
    if (!holder) { holder = new THREE.Group(); holder.add(sk); }
    if (!holder.parent) scene.add(holder);
    if (!clipOn && mixer) {
      const an = mannyAnim(), name = an?.clips?.has('M_Relaxed_Stand_Idle_Loop') ? 'M_Relaxed_Stand_Idle_Loop' : 'M_Neutral_Stand_Idle_Loop';
      if (an?.clips?.has(name)) { const a = mixer.clipAction(an.clips.clip(name, { skip: new Set(['root']) })); a.timeScale = 0.35; a.play(); clipOn = true; }
    }
    mixer?.update(dt);
    holder.position.set(EVA.x, EVA.y - 1.0 + Math.sin(G.time * 0.7) * 0.06, EVA.z);
    holder.rotation.set(0.25 + Math.sin(G.time * 0.4) * 0.05, EVA.yaw + Math.PI, Math.sin(G.time * 0.5) * 0.06, 'YXZ');
  }
}
/** Kamera hinter der schwebenden Figur (main.ts updateCamera) */
export function evaCamera() {
  _f.set(-Math.sin(EVA.yaw) * Math.cos(EVA.pitch), Math.sin(EVA.pitch), -Math.cos(EVA.yaw) * Math.cos(EVA.pitch));
  _c.set(EVA.x, EVA.y + 0.4, EVA.z).addScaledVector(_f, -4.2).addScaledVector(_u, 0.9);
  camera.position.copy(_c); _l.set(EVA.x, EVA.y + 0.3, EVA.z).addScaledVector(_f, 3); camera.lookAt(_l);
}
/** Taste E im Außenbordeinsatz */
export function evaE() { if (evaContainer(EVA.x, EVA.y, EVA.z, true)) snd(700, 0.15, 'triangle', 0.05, 300); }
/** Taste F im Außenbordeinsatz */
export function evaF() { if (nahAmSchiff()) endEva(); else radio('ANZUG', 'Zu weit von der Schleuse. Näher ans Schiff.'); }
/** Anzeige: Sauerstoff, Treibstoff, Abstand, Hinweis */
export function drawEva() {
  if (!EVA.active) return;
  const W = view.W, H = view.H, d = d3(EVA.x, EVA.y, EVA.z, P.x, P.y, P.z), sp = Math.hypot(EVA.vx, EVA.vy, EVA.vz);
  ux.save(); ux.font = '11px "Share Tech Mono",Consolas,monospace';
  const x0 = W - 270, y0 = H - 130;
  ux.fillStyle = 'rgba(10,12,14,.86)'; ux.strokeStyle = '#1e3a4a'; ux.beginPath(); ux.rect(x0, y0, 256, 116); ux.fill(); ux.stroke();
  ux.fillStyle = '#e09030'; ux.font = '700 11px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'left'; ux.fillText('AUSSENBORD', x0 + 12, y0 + 18);
  ux.textAlign = 'right'; ux.fillStyle = '#e4eef5'; ux.fillText(`${sp.toFixed(1).replace('.', ',')} m/s`, x0 + 244, y0 + 18);
  const bar = (y: number, label: string, v: number, max: number, col: string) => {
    ux.textAlign = 'left'; ux.fillStyle = '#8aa0b0'; ux.font = '11px "Share Tech Mono",Consolas,monospace'; ux.fillText(label, x0 + 12, y);
    ux.textAlign = 'right'; ux.fillStyle = v / max < 0.2 ? '#ff6b5b' : '#e4eef5'; ux.fillText(`${Math.ceil(v)} s`, x0 + 244, y);
    ux.fillStyle = '#0e1e28'; ux.fillRect(x0 + 12, y + 5, 232, 5); ux.fillStyle = v / max < 0.2 ? '#ff6b5b' : col; ux.fillRect(x0 + 12, y + 5, 232 * clamp(v / max, 0, 1), 5);
  };
  bar(y0 + 42, 'SAUERSTOFF', EVA.o2, O2, '#7fe0c0'); bar(y0 + 70, 'DÜSEN', EVA.fuel, FUEL, '#4fd6c4');
  ux.textAlign = 'left'; ux.fillStyle = '#8aa0b0'; ux.fillText(`Schiff: ${Math.round(d)} m`, x0 + 12, y0 + 104);
  if (EVA.prompt) {
    ux.font = '600 14px "Share Tech Mono",Consolas,monospace'; ux.textAlign = 'center';
    const tw = ux.measureText(EVA.prompt).width + 30, y = H * 0.66;
    ux.fillStyle = 'rgba(6,16,26,.88)'; ux.strokeStyle = '#e09030'; ux.beginPath(); ux.rect(W / 2 - tw / 2, y - 20, tw, 32); ux.fill(); ux.stroke();
    ux.fillStyle = '#e09030'; ux.fillText(EVA.prompt, W / 2, y + 1);
  }
  ux.restore();
}
