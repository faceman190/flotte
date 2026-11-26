import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { scene, camera } from '../core/engine';
import { MANIFEST } from '../core/assets';
import { sfxAny } from '../core/audio';
import { grenadeFx, onClearFootFx } from './footfx';
import { camShake, gunHooks } from './footgun';
import { invCount, takeItem } from './inventory';

// =====================================================================================
// Splittergranate (seit 2026-11-24, aus dem Lyra-Paket: Modell lazy/LyraGranate, Aufnahmen, Feuerball; docs/lyra.md).
// Verbrauchsgut vb_granate, zu Fuß mit G geworfen (Planet: fieldfight.ts, Mine: dungeon.ts). Sie fliegt im Bogen, prallt von Boden und
// Wänden ab und zündet nach FUSE Sekunden. Wirkung im Umkreis R, zur Mitte hin voll; sie trifft auch den Werfer.
// Die Umgebung gibt der Aufrufer mit: Bodenhöhe, feste Wände, Schaden an den Gegnern. In der Mine rechnet alles in deren Koordinaten;
// ox/oy/oz ist der Versatz zur Welt (nur für Bild und Ton).
// =====================================================================================
export const GRENADE = { id: 'vb_granate', fuse: 2.3, r: 5.5, dmg: 70, self: 45 };
export interface NadeEnv { ground: (x: number, z: number) => number; solid?: (x: number, y: number, z: number) => boolean; blast: (x: number, y: number, z: number, r: number, dmg: number) => void; ox?: number; oy?: number; oz?: number }
interface Nade { m: THREE.Object3D; p: THREE.Vector3; v: THREE.Vector3; t: number; env: NadeEnv; w: THREE.Vector3 }
const nades: Nade[] = [];
let cool = 0, tossN = 0;
let TPL: THREE.Object3D | null = null, loading = false;
function model(): THREE.Object3D {
  if (!TPL && !loading) {
    const url = MANIFEST?.files['lazy/LyraGranate']?.url;
    loading = true;
    if (url) new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).then(g => { g.scene.traverse((o: any) => { o.userData.sh = false; o.userData.shared = true; if (o.isMesh) o.frustumCulled = false; }); TPL = g.scene; }).catch(() => { /* es bleibt bei der Kugel */ });
  }
  if (TPL) return TPL.clone(true);
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshStandardMaterial({ color: 0x2a2e33, metalness: 0.6, roughness: 0.5 }));
  m.userData.sh = false; return m;
}
export const grenadeCount = () => invCount(GRENADE.id);
/** fliegende Granaten in Weltkoordinaten mit Restzeit bis zur Zündung (Gegner weichen aus, src/game/ki/pluenderer.ts) */
export const granatenListe = () => nades.map(n => ({ x: (n.env.ox || 0) + n.p.x, y: (n.env.oy || 0) + n.p.y, z: (n.env.oz || 0) + n.p.z, t: n.t }));
/** zählt mit jedem Wurf hoch (Wurfbewegung der Figur) */
export const grenadeTosses = () => tossN;
export function warmGrenade() { if (grenadeCount() > 0) model(); }
/** aus Augenhöhe in Blickrichtung werfen; false: keine Granate da oder gerade erst geworfen */
export function throwGrenade(x: number, y: number, z: number, yaw: number, pitch: number, env: NadeEnv): boolean {
  if (cool > 0 || !takeItem(GRENADE.id, 1)) return false;
  cool = 0.9; tossN++;
  const p2 = pitch + 0.2, cp = Math.cos(p2), d = new THREE.Vector3(-Math.sin(yaw) * cp, Math.sin(p2), -Math.cos(yaw) * cp);
  const m = model(); scene.add(m);
  nades.push({ m, p: new THREE.Vector3(x + Math.cos(yaw) * 0.22 + d.x * 0.45, y - 0.12 + d.y * 0.45, z - Math.sin(yaw) * 0.22 + d.z * 0.45), v: d.multiplyScalar(15), t: GRENADE.fuse, env, w: new THREE.Vector3(7 + Math.random() * 5, 3, 9) });
  return true;
}
const vol = (x: number, y: number, z: number, ref: number) => 1 / (1 + (Math.hypot(x - camera.position.x, y - camera.position.y, z - camera.position.z) / ref) ** 2);
/** je Bild; px, py, pz: Oberkörper des Spielers in den Koordinaten der Umgebung; hurtMe: eigener Schaden */
export function updateGrenades(dt: number, px: number, py: number, pz: number, hurtMe: (d: number) => void) {
  cool -= dt;
  for (let i = nades.length - 1; i >= 0; i--) {
    const n = nades[i], e = n.env, ox = e.ox || 0, oy = e.oy || 0, oz = e.oz || 0;
    for (let s = 0; s < 3; s++) {      // drei Teilschritte: bei 15 m/s sonst durch dünne Wände
      const h = dt / 3, q = n.p;
      n.v.y -= 13 * h;
      const nx = q.x + n.v.x * h, nz = q.z + n.v.z * h;
      if (e.solid && e.solid(nx, q.y, nz)) { n.v.x *= -0.4; n.v.z *= -0.4; bounce(n, 3); }
      else { q.x = nx; q.z = nz; }
      q.y += n.v.y * h;
      const g = e.ground(q.x, q.z) + 0.05;
      if (q.y < g) { q.y = g; if (n.v.y < -1.2) bounce(n, -n.v.y); n.v.y = n.v.y < -1.2 ? -n.v.y * 0.36 : 0; n.v.x *= 0.6; n.v.z *= 0.6; n.w.multiplyScalar(0.5); }
      else if (e.solid && e.solid(q.x, q.y, q.z) && n.v.y > 0) n.v.y *= -0.3;      // Decke
    }
    n.m.position.set(ox + n.p.x, oy + n.p.y, oz + n.p.z);
    n.m.rotation.x += n.w.x * dt; n.m.rotation.y += n.w.y * dt; n.m.rotation.z += n.w.z * dt;
    if ((n.t -= dt) > 0) continue;
    // Zündung
    const wx = ox + n.p.x, wy = oy + n.p.y + 0.2, wz = oz + n.p.z, d = Math.hypot(n.p.x - px, n.p.y - py, n.p.z - pz);
    grenadeFx(wx, wy, wz);
    const k = vol(wx, wy, wz, 22);
    sfxAny('w_x_ge', 3, 0.9 * Math.max(0.12, k)); sfxAny('w_x_gt', 3, 0.7 * Math.max(0.1, k));
    camShake(Math.min(1, 6 / Math.max(2, d)));
    e.blast(n.p.x, n.p.y, n.p.z, GRENADE.r, GRENADE.dmg);
    const rs = GRENADE.r * 0.8; if (d < rs) hurtMe(GRENADE.self * (1 - d / rs));
    scene.remove(n.m); nades.splice(i, 1);
  }
}
function bounce(n: Nade, speed: number) {
  const e = n.env;
  sfxAny('w_x_gb', 3, Math.min(0.5, 0.12 * speed) * vol((e.ox || 0) + n.p.x, (e.oy || 0) + n.p.y, (e.oz || 0) + n.p.z, 12));
}
onClearFootFx(() => { for (const n of nades) scene.remove(n.m); nades.length = 0; });
gunHooks.sync = warmGrenade;
