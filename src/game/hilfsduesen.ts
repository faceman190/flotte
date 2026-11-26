import * as THREE from 'three';
import { glowMat, basicAdd } from '../core/engine';

// =====================================================================================
// Hub- und Steuerdüsen (seit 2026-11-26, mit dem Kranich). Nutzer: „Bisher haben alle nur Düsen nach hinten für den Schub, zum vertikalen
// Start braucht man auch ein paar kleine unten und zum Manövrieren.“
//  - Hubdüsen (unten, Strahl nach unten): arbeiten beim Steigen (Leertaste), schwach beim Sinken, und in Bodennähe auf Planeten
//    (Starten, Landen, Schweben), stärker je tiefer.
//  - Steuerdüsen (Blöcke mit je drei Düsen an Nase, Heck und Gondeln): Jede Düse feuert, wenn ihr Rückstoß zur gewünschten Bewegung passt:
//    Drehmoment p × F in Richtung der Drehung (Nicken, Gieren, Rollen) oder Kraft F in Richtung des Seitwärts-, Hoch-/Runterschiebens
//    und Bremsens. F = −d (d: Austrittsrichtung). So blitzen beim Gieren nach links genau die Düsen auf, die das Schiff so drehen.
// Lage und Richtung in Schiffskoordinaten (Mitte des Modells im Ursprung, Nase −Z, Meter), aus dem Blender-Export (kra-gelenke.json „duesen“).
// =====================================================================================
type Duese = [number, number, number, number, number, number, number?];      // x, y, z, dx, dy, dz, Radius
const D: Record<string, { hub: Duese[]; rcs: Duese[] }> = {
  kranich: {
    hub: [[-1.3, -1.84, -7.66, 0, -1, 0, 0.5], [1.3, -1.84, -7.66, 0, -1, 0, 0.5], [-6.15, -1.75, 9.54, 0, -1, 0, 0.68], [6.15, -1.75, 9.54, 0, -1, 0, 0.68]],
    rcs: [
      [-0.93, 0.04, -15.19, -0.56, 0.67, -0.49], [-0.76, 0.16, -15.04, 0.5, 0.74, 0.45], [-0.88, -0.02, -15.39, 0, 0, -1],
      [-1.45, -1.37, -12.99, -0.64, -0.74, -0.21], [-1.23, -1.47, -12.92, 0.7, -0.68, 0.23], [-1.4, -1.31, -13.22, 0, 0, -1],
      [-3.2, 1.83, 13.84, -0.87, 0.5, 0.04], [-3.01, 2, 13.84, 0.49, 0.87, -0.02], [-3.13, 1.79, 14.08, 0, 0, 1],
      [-3.14, -1.8, 13.84, -0.8, -0.6, 0.04], [-2.94, -1.94, 13.83, 0.6, -0.8, -0.03], [-3.08, -1.75, 14.08, 0, 0, 1],
      [0.93, 0.04, -15.19, 0.56, 0.67, -0.49], [0.76, 0.16, -15.04, -0.5, 0.74, 0.45], [0.88, -0.02, -15.39, 0, 0, -1],
      [1.45, -1.37, -12.99, 0.64, -0.74, -0.21], [1.23, -1.47, -12.92, -0.7, -0.68, 0.23], [1.4, -1.31, -13.22, 0, 0, -1],
      [3.2, 1.83, 13.84, 0.87, 0.5, 0.04], [3.01, 2, 13.84, -0.49, 0.87, -0.02], [3.13, 1.79, 14.08, 0, 0, 1],
      [3.14, -1.8, 13.84, 0.8, -0.6, 0.04], [2.94, -1.94, 13.83, -0.6, -0.8, -0.03], [3.08, -1.75, 14.08, 0, 0, 1],
      [-7.5, -0.54, 14.14, -1, 0, 0], [-7.42, -0.29, 14.14, 0, 1, 0], [-7.42, -0.54, 14.38, 0, 0, 1],
      [7.5, -0.54, 14.14, 1, 0, 0], [7.42, -0.29, 14.14, 0, 1, 0], [7.42, -0.54, 14.38, 0, 0, 1],
    ],
  },
};
export const hatHilfsduesen = (cls: string) => !!D[cls];

interface Strahl { sp: THREE.Sprite; kegel: THREE.Mesh; kern: THREE.Mesh; k: number; tau: THREE.Vector3; F: THREE.Vector3; r: number; hub: boolean; ph: number }
const _z = new THREE.Vector3(0, 0, 1);
const kegelGeo = (() => { const c = new THREE.ConeGeometry(1, 1, 12, 1, true); c.rotateX(Math.PI / 2); c.translate(0, 0, 0.5); return c; })();      // breit an der Düse (z = 0), Spitze bei z = 1 in Strahlrichtung
function bauen(cls: string) {
  const g = new THREE.Group(); g.name = 'Hilfsduesen'; g.userData.cls = cls; const list: Strahl[] = [];
  for (const [hub, arr] of [[true, D[cls].hub], [false, D[cls].rcs]] as const) for (const e of arr) {
    const p = new THREE.Vector3(e[0], e[1], e[2]), d = new THREE.Vector3(e[3], e[4], e[5]).normalize(), r = e[6] ?? 0.07;
    const sp = new THREE.Sprite(glowMat(hub ? 0xbfe2ff : 0xeef6ff, 0)); sp.position.copy(p).addScaledVector(d, hub ? 0.15 : 0.05); g.add(sp);
    const q = new THREE.Quaternion().setFromUnitVectors(_z, d);
    const mo = basicAdd(hub ? 0x8fc8ff : 0xdfeeff); mo.opacity = 0; mo.side = THREE.DoubleSide;
    const mc = basicAdd(0xf4faff); mc.opacity = 0; mc.side = THREE.DoubleSide;
    const kegel = new THREE.Mesh(kegelGeo, mo), kern = new THREE.Mesh(kegelGeo, mc);
    for (const m of [kegel, kern]) { m.position.copy(p); m.quaternion.copy(q); m.visible = false; m.frustumCulled = false; g.add(m); }
    const F = d.clone().negate(), tau = p.clone().cross(F);      // Rückstoß und Drehmoment (Schwerpunkt ≈ Modellmitte)
    if (tau.lengthSq() > 1e-6) tau.divideScalar(Math.max(1, p.length()));
    list.push({ sp, kegel, kern, k: 0, tau, F, r, hub, ph: Math.random() * 6.3 });
  }
  g.userData.list = list; return g;
}
let grp: THREE.Group | null = null, rollAlt = 0;
const _w = new THREE.Vector3(), _a = new THREE.Vector3();
/** jedes Bild im Flug: g = Schiffsgruppe, Drehraten (rad/s, Gieren um +Y, Nicken um +X), Rolllage (für die Rollrate), Eingaben,
 *  Höhe über Grund (Infinity im All), glut = ein Glühpunkt der Haupttriebwerke: Die Düsen sind nur sichtbar, solange er es ist (am Boden,
 *  außenbords und beim Andocken blendet das Spiel ihn aus, ohne hier vorbeizukommen) */
export function hilfsduesen(g: THREE.Object3D, cls: string, dt: number, gier: number, nick: number, roll: number,
  ein: { sx: number; sv: number; brems: number }, hoehe: number, glut: THREE.Object3D | undefined) {
  if (!D[cls]) { if (grp) { grp.parent?.remove(grp); grp = null; } return; }
  if (!grp || grp.parent !== g || grp.userData.cls !== cls) {
    grp?.parent?.remove(grp); grp = bauen(cls); g.add(grp); rollAlt = roll;
    const ref = { o: glut }; grp.userData.ref = ref; Object.defineProperty(grp, 'visible', { get: () => !ref.o || ref.o.visible, set: () => {}, configurable: true });
  }
  grp.userData.ref.o = glut; const an = !glut || glut.visible;
  const rr = dt > 0 ? (roll - rollAlt) / dt : 0; rollAlt = roll;
  _w.set(nick, gier, rr * 0.6);      // gewünschte Drehung im Schiffsrahmen
  _a.set(ein.sx, ein.sv, ein.brems);      // Schieben: rechts, hoch, Bremsen (= Schub nach hinten, +Z)
  const boden = Number.isFinite(hoehe) ? Math.max(0, Math.min(1, 1 - hoehe / 45)) : 0;
  const hubWunsch = Math.max(ein.sv > 0 ? 1 : ein.sv < 0 ? 0.2 : 0, boden * 0.9);
  const t = performance.now() * 0.001;
  for (const s of grp.userData.list as Strahl[]) {
    let w = 0;
    if (s.hub) w = hubWunsch;
    else { w = Math.max(0, s.tau.dot(_w)) * 0.9 + Math.max(0, s.F.dot(_a)) * 0.8; if (w < 0.08) w = 0; w = Math.min(1, w); }
    if (!an) w = 0;
    s.k += (w - s.k) * Math.min(1, dt * (w > s.k ? 30 : s.hub ? 4 : 12));
    const k = s.k, on = k > 0.02;
    s.kegel.visible = s.kern.visible = on;
    const fl = 1 + (Math.random() - 0.5) * (s.hub ? 0.12 : 0.35);
    // weich und durchscheinend (Nutzer: realistisch, nicht verspielt): blasser Schleier, kurzer heller Kern, Glühen an der Düse
    (s.sp.material as THREE.SpriteMaterial).opacity = Math.min(1, k * (s.hub ? 0.6 : 0.8));
    if (s.hub) {
      s.sp.scale.setScalar(s.r * (2.0 + 1.8 * k) * fl);
      const L = (0.9 + 2.0 * k) * fl; s.kegel.scale.set(s.r * 1.05, s.r * 1.05, L); s.kern.scale.set(s.r * 0.5, s.r * 0.5, L * 0.45);
      (s.kegel.material as THREE.MeshBasicMaterial).opacity = 0.1 * k; (s.kern.material as THREE.MeshBasicMaterial).opacity = 0.2 * k;
    } else {
      const L = (0.25 + 0.9 * k) * fl * (0.85 + 0.15 * Math.sin(t * 47 + s.ph));
      s.sp.scale.setScalar((0.3 + 0.7 * k) * fl); s.kegel.scale.set(0.1, 0.1, L); s.kern.scale.set(0.05, 0.05, L * 0.5);
      (s.kegel.material as THREE.MeshBasicMaterial).opacity = 0.16 * k; (s.kern.material as THREE.MeshBasicMaterial).opacity = 0.3 * k;
    }
  }
}
