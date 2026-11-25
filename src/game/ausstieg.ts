import * as THREE from 'three';
import { scene } from '../core/engine';
import { world } from './world';
import { SHIP } from './player';
import { kanzelInfo } from '../models/gltfShips';

// =====================================================================================
// Ausstiege der Schiffe (seit 2026-11-25, Konzept docs/konzept-schiffe-fracht.md, Schritt 2)
//  - kanzel: Jäger (Venom, Würger) und Elster. Die Kanzel klappt auf (gltfShips.ts setKanzel), am Planeten hängt eine Bordleiter vom
//    Kanzelrand zum Boden; man steigt an ihrem Fuß aus und dort wieder ein. Im All stößt man sich aus der offenen Kanzel ab.
//  - rampe: Kormoran und Wisent (bewegliche Heckrampe). Im All wird zuerst der Laderaum leer gepumpt (eva.ts), dann öffnet die Rampe.
//  - heck: alle übrigen (Pfeil): hinter dem Schiff wie bisher.
// Alle Punkte in Schiffskoordinaten (Nase −Z, oben +Y), umgerechnet über die Lage des Schiffs (am Boden: ROVER.ship, im All: SHIP.g).
// =====================================================================================

export type AusArt = 'kanzel' | 'rampe' | 'heck';
export function ausArt(): AusArt {
  if (kanzelInfo(SHIP.g)) return 'kanzel';
  let name = ''; SHIP.g.traverse(o => { if (!name && o.userData.model) name = o.userData.model; });
  return name === 'Kormoran' || name === 'Wisent' ? 'rampe' : 'heck';
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(1, 1, 1);
/** Schiffskoordinaten → Welt: am Boden aus der Landelage (x, y, z, Gierwinkel), sonst aus dem Schiffsmodell */
export function schiffZuWelt(p: THREE.Vector3, lage?: { x: number; y: number; z: number; yaw: number }) {
  if (lage) { _m.compose(new THREE.Vector3(lage.x, lage.y, lage.z), _q.setFromEuler(_e.set(0, lage.yaw, 0)), _s); return p.applyMatrix4(_m); }
  SHIP.g.updateMatrixWorld(true); return p.applyMatrix4(SHIP.g.matrixWorld);
}
/** Kanzel: Rand der Kanzel an der linken Seite (wo die Leiter hängt) und Punkt über der Kanzel (Außenbord) in Schiffskoordinaten */
export function kanzelPunkte(root: THREE.Object3D = SHIP.g) {
  const k = kanzelInfo(root); if (!k) return null;
  const b = k.box, cz = (b.min.z + b.max.z) / 2;
  return { rand: new THREE.Vector3(b.min.x - 0.25, b.min.y + 0.05, cz + 0.3), oben: new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y + 1.0, cz), seite: -1 };
}
/** Fuß der Bordleiter in der Welt (Boden), mit Blick vom Schiff weg */
export function leiterFuss(lage: { x: number; y: number; z: number; yaw: number }, root: THREE.Object3D = SHIP.g) {
  const k = kanzelPunkte(root); if (!k) return null;
  const top = schiffZuWelt(k.rand.clone(), lage), out = schiffZuWelt(k.rand.clone().add(new THREE.Vector3(-1, 0, 0)), lage).sub(top).setY(0).normalize();
  const x = top.x + out.x * 0.75, z = top.z + out.z * 0.75;
  return { x, z, top, yaw: Math.atan2(-out.x, -out.z) };      // Blick vom Schiff weg (yaw wie die Figur: vorwärts −sin, −cos)
}

// ---------- Bordleiter (am Planeten): zwei Holme mit Sprossen vom Kanzelrand schräg zum Boden ----------
const eigene = { g: null as THREE.Group | null };
export const LEITER = { an: false };      // eigene Leiter steht (Mehrspieler: net.ts schickt es mit)
const LM = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.85, roughness: 0.35 });
const LG = new THREE.MeshStandardMaterial({ color: 0xd9a020, metalness: 0.2, roughness: 0.5 });
export function leiterZeigen(on: boolean, lage?: { x: number; y: number; z: number; yaw: number }) { LEITER.an = on && !!lage; leiterSetzen(eigene, on, lage); }
/** Leiter an einem beliebigen Schiff (ref hält die Leiter; Mitspieler: je Schiff eine eigene, net.ts) */
export function leiterSetzen(ref: { g: THREE.Group | null }, on: boolean, lage?: { x: number; y: number; z: number; yaw: number }, root: THREE.Object3D = SHIP.g) {
  let leiter = ref.g;
  if (!on || !lage) { leiter?.removeFromParent(); return; }
  const f = leiterFuss(lage, root); if (!f) return;
  const gy = world.ground ? world.ground(f.x, f.z) : lage.y - 3;
  const top = f.top, foot = new THREE.Vector3(f.x, gy, f.z), len = top.distanceTo(foot);
  if (!leiter || Math.abs((leiter.userData.len || 0) - len) > 0.05) {
    leiter?.removeFromParent(); leiter = ref.g = new THREE.Group(); leiter.userData.len = len;
    const rail = new THREE.CylinderGeometry(0.022, 0.022, len, 8), rung = new THREE.CylinderGeometry(0.014, 0.014, 0.42, 8);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(rail, LM); r.position.set(s * 0.21, len / 2, 0); leiter.add(r); }
    for (let y = 0.3; y < len - 0.1; y += 0.3) { const g = new THREE.Mesh(rung, LM); g.rotation.z = Math.PI / 2; g.position.set(0, y, 0); leiter.add(g); }
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.12), LG); hook.position.set(0, len, -0.04); leiter.add(hook);
    for (const s of [-1, 1]) { const fu = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.16), LG); fu.position.set(s * 0.21, 0.02, 0); leiter.add(fu); }
  }
  if (!leiter.parent) scene.add(leiter);
  // aufstellen: unten am Fuß, oben am Kanzelrand; Holme entlang der Leiter, Sprossen längs des Schiffs
  leiter.position.copy(foot);
  const Y = top.clone().sub(foot).normalize(), fw = new THREE.Vector3(-Math.sin(lage.yaw), 0, -Math.cos(lage.yaw));
  const X = fw.sub(Y.clone().multiplyScalar(fw.dot(Y))).normalize(), Z = X.clone().cross(Y);
  leiter.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}

// ---------- kurze Blende (Aussteigen, Einsteigen) ----------
let blendeEl: HTMLDivElement | null = null;
export function blende(ms = 420) {
  if (!blendeEl) { blendeEl = document.createElement('div'); blendeEl.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:40;transition:opacity 180ms ease'; document.body.appendChild(blendeEl); }
  const el = blendeEl; el.style.opacity = '1'; setTimeout(() => { el.style.opacity = '0'; }, ms);
}
