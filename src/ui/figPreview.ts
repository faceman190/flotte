import * as THREE from 'three';
import { renderer, gl, prePass, DEFAULT_ENV } from '../core/engine';
import { Figur, neuesSkelett, type Tracht } from '../game/figur';
import { mannyAnim } from '../game/mannyAvatar';

// =====================================================================================
// Figurenvorschau: der Pilot mit gewählter Figur und angelegter Ausrüstung, drehbar mit der Maus.
// Für „Neuer Pilot“, die Garderobe und die Ausrüstung im Flottenband.
// Seit 2026-11-24 zeigt sie die neue Spielerfigur (game/figur.ts): eigenes Skelett, Körper und Teile daran; Netze und Bilder teilt sie
// sich mit der Figur im Spiel. Haltung: die Stehbewegung aus dem Bewegungssatz, sobald er geladen ist (bis dahin die A-Haltung).
// Gezeichnet wie die Schiffsansicht der Werft (shipPreview.ts): mit dem Renderer des Spiels VOR dem eigentlichen Bild (prePass),
// Ausschnitt in die 2D-Fläche kopieren, danach übermalt das Spielbild alles wieder. Kein zweiter WebGL-Kontext.
// Die Fläche wird über ihre id gesucht: Seiten, die ihr HTML neu aufbauen (Flottenband), ersetzen sie dabei.
// Dazu: Nahansicht des Gesichts (figView), Drehknöpfe (figRotate) und kleine Standbilder für die Auswahlkacheln (figPortrait).
// =====================================================================================
const sc = new THREE.Scene();
{ // Hintergrund: dunkles Blau, oben etwas heller, wie ein Ausrüstungsraum im Halbdunkel
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const x = c.getContext('2d')!, g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#16263a'); g.addColorStop(0.55, '#0c1622'); g.addColorStop(1, '#05090e');
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; sc.background = t;
}
sc.environment = DEFAULT_ENV as any;
const cam = new THREE.PerspectiveCamera(26, 0.7, 0.1, 50);
const key = new THREE.DirectionalLight(0xfff1dc, 3.6); key.position.set(-2, 4, 3); sc.add(key);
const fill = new THREE.DirectionalLight(0x9fc2dc, 1.5); fill.position.set(3, 1.5, 2.5); sc.add(fill);
const rim = new THREE.DirectionalLight(0x7fd4ff, 2.4); rim.position.set(1.5, 3, -4); sc.add(rim);
const rim2 = new THREE.DirectionalLight(0xffd9a8, 1.2); rim2.position.set(-2.5, 2, -3); sc.add(rim2);
sc.add(new THREE.AmbientLight(0x5a6470, 0.9));
{ // Boden: runde Plattform mit feinem Leuchtring
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!, g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, 'rgba(40,58,72,1)'); g.addColorStop(0.7, 'rgba(18,28,36,1)'); g.addColorStop(1, 'rgba(18,28,36,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1.1, 64), new THREE.MeshStandardMaterial({ map: t, transparent: true, roughness: 0.85, metalness: 0.2, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; sc.add(floor);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.72, 0.735, 96), new THREE.MeshBasicMaterial({ color: 0x5fd0ff, transparent: true, opacity: 0.55, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; sc.add(ring);
}
const holder = new THREE.Group(); sc.add(holder);
const pHolder = new THREE.Group(); sc.add(pHolder);

// Eine Puppe: eigenes Skelett mit Körper und Teilen; steht in der Stehbewegung des Bewegungssatzes
interface Puppe { root: THREE.Object3D; fig: Figur; mixer: THREE.AnimationMixer | null; head: THREE.Object3D | null }
function puppe(parent: THREE.Object3D, done: (p: Puppe) => void) {
  neuesSkelett().then(root => { if (!root) return; parent.add(root); done({ root, fig: new Figur(root), mixer: null, head: root.getObjectByName('head') || null }); });
}
const NO_ROOT = new Set(['root']);
function pose(p: Puppe, dt: number) {
  if (!p.mixer) {
    const clips = mannyAnim()?.clips, name = clips?.names?.find((n: string) => /Stand_Idle_Loop$/.test(n));
    const c = name && clips.clip(name, { skip: NO_ROOT });
    if (c) { p.mixer = new THREE.AnimationMixer(p.root); p.mixer.clipAction(c).play(); }
  }
  p.mixer?.update(dt);
}

let id = '', trachtOf: (() => Tracht) | null = null, last = 0, yaw = 0.45, spin = true;
let main: Puppe | null = null, mainAsked = false, port: Puppe | null = null, portAsked = false;
let drag: { x: number; yaw: number } | null = null, bound: HTMLCanvasElement | null = null;
let focus = 0, focusT = 0, rotDir = 0, headY = 1.62, headX = 0;
const jobs: { t: Tracht; part: 'kopf' | 'brust'; cb: (url: string) => void; n: number }[] = [];

// Lidschlag alle paar Sekunden (nur Figuren mit eigenem Gesicht haben die Morphs dafür)
let blinkC = 0, blinkAt = 2;
function blinzeln(f: { blinzeln(v: number): void }, dt: number) {
  blinkC += dt; const p = blinkC - blinkAt;
  if (p >= 0.16) { blinkC = 0; blinkAt = 2 + Math.random() * 4; }
  f.blinzeln(p > 0 && p < 0.16 ? Math.sin(p / 0.16 * Math.PI) : 0);
}
export function showFig(canvasId: string, tracht: () => Tracht) {
  id = canvasId; trachtOf = tracht; last = 0; spin = true; focus = focusT = 0; rotDir = 0;
  prePass.fn = draw;
}
export function hideFig() {
  if (prePass.fn === draw) prePass.fn = null;
  id = ''; trachtOf = null; rotDir = 0;
  main?.fig.leeren(); port?.fig.leeren();      // Dateien freigeben (bleiben noch kurz im Speicher, falls die Vorschau gleich wieder aufgeht)
}
/** Kamera: 0 ganze Figur, 1 Gesicht (weich überblendet) */
export function figView(f: number) { focusT = f; }
export const figViewNow = () => focusT;
/** Drehknöpfe: −1, 0, 1 solange gedrückt */
export function figRotate(dir: number) { rotDir = dir; if (dir) spin = false; }
/** Standbild für eine Auswahlkachel (Kopf oder Brust), wird in einem der nächsten Bilder der Vorschau gezeichnet */
export function figPortrait(t: Tracht, part: 'kopf' | 'brust', cb: (url: string) => void) { jobs.push({ t, part, cb, n: 0 }); }

// Drehen mit der Maus (gedrückt halten und ziehen); danach dreht sie sich nicht mehr von selbst
function bind(cv: HTMLCanvasElement) {
  if (bound === cv) return; bound = cv;
  cv.style.cursor = 'grab';
  cv.onpointerdown = e => { drag = { x: e.clientX, yaw }; spin = false; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; };
  cv.onpointermove = e => { if (drag) yaw = drag.yaw + (e.clientX - drag.x) * 0.012; };
  cv.onpointerup = cv.onpointercancel = () => { drag = null; cv.style.cursor = 'grab'; };
}
// Kamera so stellen, dass um die Höhe y die halbe Höhe `half` den Ausschnitt mit Seitenverhältnis a füllt; liefert den Ausschnitt im Spielbild
function aim(a: number, y: number, half: number, lift = 0.08, x = 0) {
  const W = gl.width, H = gl.height;
  let cw = W, ch = W / a;
  if (ch > H) { ch = H; cw = H * a; }
  cam.aspect = W / H; cam.updateProjectionMatrix();
  const hf = Math.atan(Math.tan(cam.fov * Math.PI / 360) * (ch / H)), d = half / Math.tan(hf);
  cam.position.set(x, y + lift, d); cam.lookAt(x, y, 0);
  return { sx: (W - cw) / 2, sy: (H - ch) / 2, cw, ch };
}
function shoot() {
  const rt = renderer.getRenderTarget();
  renderer.setRenderTarget(null);
  renderer.render(sc, cam);
  renderer.setRenderTarget(rt);
}
const _v = new THREE.Vector3();
function headOf(p: Puppe) { if (!p.head) return null; p.root.parent!.updateMatrixWorld(true); p.head.getWorldPosition(_v); headX = _v.x; return _v.y; }

const pc = document.createElement('canvas'); pc.width = pc.height = 192;
function portraitJob(dt: number) {
  const j = jobs[0]; if (!j) return;
  if (!port) { if (!portAsked) { portAsked = true; puppe(pHolder, p => { port = p; p.root.visible = false; }); } return; }
  port.fig.setzen(j.t); pose(port, dt);
  if (!port.fig.fertig || !port.fig.bereit) return;          // lädt noch
  if (++j.n < 3) return;                                      // zwei Bilder Vorlauf: Haltung und Knochen stehen
  pHolder.rotation.y = j.part === 'kopf' ? 0.32 : 0.12;
  holder.visible = false; port.root.visible = true;
  const hy = headOf(port) ?? 1.62;
  const sp = port.root.getObjectByName('spine_01'), bx = sp ? sp.getWorldPosition(_v).x : 0;
  const r = j.part === 'kopf' ? aim(1, hy + 0.02, 0.2, 0.02, headX) : aim(1, hy - 0.62, 0.42, 0.05, bx);
  shoot();
  pc.getContext('2d')!.drawImage(gl, r.sx, r.sy, r.cw, r.ch, 0, 0, pc.width, pc.height);
  port.root.visible = false; holder.visible = true; jobs.shift();
  j.cb(pc.toDataURL('image/jpeg', 0.86));
}

// pro Bild (prePass); auch von Tests aufrufbar
export function draw() {
  if (!trachtOf) return;
  const now = performance.now();
  const cv = id ? document.getElementById(id) as HTMLCanvasElement | null : null;
  if (!cv) return;                                          // Seite gerade ohne Vorschau: warten, bis sie wieder da ist
  if (!cv.isConnected || cv.offsetParent === null) return;   // unsichtbar (Reiter gewechselt)
  bind(cv);
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 1 / 30;
  if (last && now - last < 33) return;
  last = now;
  portraitJob(dt);
  // Zeichenfläche in der angezeigten Größe (scharf, auch wenn sie mit dem Fenster wächst)
  const k = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.max(40, Math.round(cv.clientWidth * k)), h = Math.max(40, Math.round(cv.clientHeight * k));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  if (!main && !mainAsked) { mainAsked = true; puppe(holder, p => { main = p; }); }
  if (main) { main.fig.setzen(trachtOf()); pose(main, dt); blinzeln(main.fig, dt); }   // neue Figur oder Ausrüstung lädt im Hintergrund, die alte bleibt bis dahin stehen
  if (spin) yaw += dt * 0.35;
  yaw += rotDir * dt * 2.2;
  holder.rotation.y = yaw;
  const ctx = cv.getContext('2d');
  if (!main || !main.fig.bereit) {                             // noch nicht fertig geladen: Hinweis statt leerer Bühne
    if (ctx) {
      const W = cv.width, H = cv.height, gr = ctx.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#16263a'); gr.addColorStop(1, '#05090e'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(138,160,176,' + (0.55 + 0.35 * Math.sin(now / 300)) + ')';
      ctx.font = '600 ' + Math.round(15 * k) + 'px Rajdhani, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('FIGUR WIRD GELADEN …', W / 2, H / 2);
    }
    return;
  }
  headY = headOf(main) ?? headY;
  focus += (focusT - focus) * Math.min(1, dt * 6);
  // Ausschnitt: ganze Figur oder Gesicht, dazwischen weich
  const e = focus * focus * (3 - 2 * focus);
  const r = aim(cv.width / cv.height, 0.95 + (headY - 0.1 - 0.95) * e, 1.12 + (0.4 - 1.12) * e, 0.1 - 0.06 * e, headX * e);   // nah: Kopf auch seitlich in die Mitte
  shoot();
  if (ctx) ctx.drawImage(gl, r.sx, r.sy, r.cw, r.ch, 0, 0, cv.width, cv.height);
}
