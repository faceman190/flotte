import * as THREE from 'three';
import { renderer, gl, prePass, DEFAULT_ENV } from '../core/engine';
import { makeAvatar, driveAvatar, type Avatar } from '../game/avatar';
import { soldierGearKey, viewModelId, type FigGear } from '../game/mineArt';

// =====================================================================================
// Figurenvorschau (seit 2026-11-20): der Pilot mit Aussehen und Ausrüstung, drehbar mit der Maus.
// Für die Charaktererstellung (Neues Spiel), die Garderobe und die Ausrüstung im Flottenband.
// Gezeichnet wie die Schiffsansicht der Werft (shipPreview.ts): mit dem Renderer des Spiels VOR dem eigentlichen Bild (prePass),
// Ausschnitt in die kleine 2D-Fläche kopieren, danach übermalt das Spielbild alles wieder. Kein zweiter WebGL-Kontext.
// Die Fläche wird über ihre id gesucht: Seiten, die ihr HTML neu aufbauen (Flottenband), ersetzen sie dabei.
// =====================================================================================
const sc = new THREE.Scene();
sc.background = new THREE.Color(0x0d1215);
sc.environment = DEFAULT_ENV as any;
const cam = new THREE.PerspectiveCamera(26, 0.7, 0.1, 50);
const key = new THREE.DirectionalLight(0xfff1dc, 3.0); key.position.set(-2, 4, 3); sc.add(key);
const fill = new THREE.DirectionalLight(0x8fb4d0, 1.2); fill.position.set(3, 1.5, 2); sc.add(fill);
const rim = new THREE.DirectionalLight(0xffd9a8, 1.6); rim.position.set(0, 3, -4); sc.add(rim);
sc.add(new THREE.AmbientLight(0x5a6470, 0.8));
const floor = new THREE.Mesh(new THREE.CircleGeometry(0.75, 48), new THREE.MeshStandardMaterial({ color: 0x1b2228, roughness: 0.9, metalness: 0.2 }));
floor.rotation.x = -Math.PI / 2; sc.add(floor);
const holder = new THREE.Group(); sc.add(holder);

let id = '', gearOf: (() => FigGear) | null = null, av: Avatar | null = null, key0 = '', last = 0, yaw = Math.PI + 0.45, spin = true;   // Drehung der ganzen Figur (die Figur selbst schaut stur geradeaus, sonst machte sie Seitschritte)
let drag: { x: number; yaw: number } | null = null, bound: HTMLCanvasElement | null = null;

export function showFig(canvasId: string, gear: () => FigGear) {
  id = canvasId; gearOf = gear; last = 0; spin = true;
  prePass.fn = draw;
}
export function hideFig() { if (prePass.fn === draw) prePass.fn = null; id = ''; gearOf = null; }
// Drehen mit der Maus (gedrückt halten und ziehen); danach dreht sie sich nicht mehr von selbst
function bind(cv: HTMLCanvasElement) {
  if (bound === cv) return; bound = cv;
  cv.style.cursor = 'grab';
  cv.onpointerdown = e => { drag = { x: e.clientX, yaw }; spin = false; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; };
  cv.onpointermove = e => { if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.012; };
  cv.onpointerup = () => { drag = null; cv.style.cursor = 'grab'; };
}
// pro Bild (prePass); auch von Tests aufrufbar
export function draw() {
  const cv = id ? document.getElementById(id) as HTMLCanvasElement | null : null;
  if (!cv || !gearOf) return;                               // Seite gerade ohne Vorschau: warten, bis sie wieder da ist
  if (!cv.isConnected || cv.offsetParent === null) return;   // unsichtbar (Reiter gewechselt)
  bind(cv);
  const now = performance.now(), dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 30;
  if (last && now - last < 33) return;
  last = now;
  const g = gearOf(), k = soldierGearKey(g) + '|' + (g.waffe || '');
  if (!av || k !== key0) {
    if (av) holder.remove(av.s.g);
    av = makeAvatar(g); key0 = k;
    if (!av) return;
    holder.add(av.s.g);
  }
  if (spin) yaw += dt * 0.35;
  holder.rotation.y = yaw;
  driveAvatar(av, dt, { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, wid: viewModelId(g.waffe) });
  // Bildausschnitt: Seitenverhältnis der Fläche, ganze Figur
  const a = cv.width / cv.height, W = gl.width, H = gl.height;
  let cw = W, ch = W / a;
  if (ch > H) { ch = H; cw = H * a; }
  cam.aspect = W / H; cam.updateProjectionMatrix();
  const half = Math.atan(Math.tan(cam.fov * Math.PI / 360) * (ch / H)), d = 1.05 / Math.tan(half);
  cam.position.set(0, 1.0, d); cam.lookAt(0, 0.92, 0);
  const rt = renderer.getRenderTarget();
  renderer.setRenderTarget(null);
  renderer.render(sc, cam);
  renderer.setRenderTarget(rt);
  const ctx = cv.getContext('2d');
  if (ctx) ctx.drawImage(gl, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, cv.width, cv.height);
}
