import * as THREE from 'three';
import { renderer, gl, prePass, DEFAULT_ENV } from '../core/engine';
import { buildShipModel } from '../models/playerShips';
import type { ShipId } from '../data/ships';

// Schiffsansicht im Werft-Terminal: Das Schiff dreht sich langsam vor dunklem Grund.
// Gezeichnet wird mit dem Renderer des Spiels, und zwar VOR dem eigentlichen Bild (prePass): Schiff auf die Zeichenfläche,
// Ausschnitt in die kleine 2D-Fläche des Terminals kopieren, danach übermalt das Spielbild alles wieder. So flackert nichts,
// und es braucht keinen zweiten WebGL-Kontext (der jedes Modell ein zweites Mal in den Grafikspeicher laden würde).
const sc = new THREE.Scene();
sc.background = new THREE.Color(0x0d1215);
sc.environment = DEFAULT_ENV as any;
const cam = new THREE.PerspectiveCamera(24, 1, 0.5, 4000);
const key = new THREE.DirectionalLight(0xfff1dc, 3.2); key.position.set(-3, 5, 4); sc.add(key);
const fill = new THREE.DirectionalLight(0x6fa8c8, 1.1); fill.position.set(5, 1.5, -2); sc.add(fill);
const back = new THREE.DirectionalLight(0x4fd6c4, 1.4); back.position.set(0, 3, -6); sc.add(back);
sc.add(new THREE.AmbientLight(0x5a6470, 0.9));
const pivot = new THREE.Group(); sc.add(pivot);

const cache = new Map<string, { g: THREE.Object3D; r: number; c: THREE.Vector3 }>();
let cv: HTMLCanvasElement | null = null, cur: { g: THREE.Object3D; r: number; c: THREE.Vector3 } | null = null, last = 0, t0 = 0;

export function showShip(canvas: HTMLCanvasElement | null, cls: ShipId) {
  if (!canvas) { hideShip(); return; }
  cv = canvas;
  let m = cache.get(cls);
  if (!m) {
    const b = buildShipModel(cls);
    for (const s of [...b.glows, ...b.navs]) s.visible = false;
    b.shield.visible = false;
    // Maß nehmen nur an sichtbaren Flächen: Schildkugel und Leuchtpunkte sind weit größer als der Rumpf
    const box = new THREE.Box3(), one = new THREE.Box3();
    b.g.updateMatrixWorld(true);
    b.g.traverse((o: any) => {
      if (!o.isMesh || o === b.shield || !o.geometry) return;
      for (let p = o; p; p = p.parent) if (!p.visible) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.union(one.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
    });
    const sph = box.getBoundingSphere(new THREE.Sphere());
    m = { g: b.g, r: Math.max(1, sph.radius), c: sph.center.clone() };
    cache.set(cls, m);
  }
  if (cur !== m) { if (cur) pivot.remove(cur.g); cur = m; m.g.position.copy(m.c).multiplyScalar(-1); pivot.add(m.g); }
  if (!t0) t0 = performance.now();
  last = 0;
  prePass.fn = draw;
}
export function hideShip() {
  prePass.fn = null; cv = null;
  if (cur) { pivot.remove(cur.g); cur = null; }
}
function draw() {
  if (!cv || !cv.isConnected || !cur) { hideShip(); return; }
  const now = performance.now();
  if (now - last < 33) return;
  last = now;
  // Ausschnitt in der Bildmitte mit dem Seitenverhältnis der Terminal-Fläche
  const a = cv.width / cv.height, W = gl.width, H = gl.height;
  let cw = W, ch = W / a;
  if (ch > H) { ch = H; cw = H * a; }
  cam.aspect = W / H;
  const half = Math.atan(Math.tan(cam.fov * Math.PI / 360) * (ch / H)), halfW = Math.atan(Math.tan(half) * a);
  const d = cur.r * 0.92 / Math.sin(Math.min(half, halfW));
  cam.position.set(0, d * 0.2, d * 0.98); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  pivot.rotation.y = 0.6 + (now - t0) * 0.00022;
  const rt = renderer.getRenderTarget();
  renderer.setRenderTarget(null);
  renderer.render(sc, cam);
  renderer.setRenderTarget(rt);
  const ctx = cv.getContext('2d');
  if (ctx) ctx.drawImage(gl, (W - cw) / 2, (H - ch) / 2, cw, ch, 0, 0, cv.width, cv.height);
}
