import * as THREE from 'three';
import { Figur, neuesSkelett } from './figur';
import { figTracht } from './avatar';

// =====================================================================================
// Fahrer im offenen Buggy „Wiesel“ (seit 2026-11-24): eine eigene Kopie der Spielfigur mit der eigenen Tracht (Figur, Helm, Weste …),
// fest im linken Sitz. Der Bewegungssatz hat keine Sitzhaltung; die Haltung entsteht hier einmal beim Einsetzen:
// Becken auf den Sitz, Oberkörper leicht zurück, Beine (Oberschenkel–Unterschenkel) zu den Pedalen, Arme zum Lenkradkranz –
// je zwei Knochen mit einem Richtungspunkt fürs Knie bzw. den Ellbogen (Zwei-Knochen-IK in Weltkoordinaten, unabhängig davon,
// wie die Knochenachsen im Skelett liegen). Der Dachs hat eine geschlossene Kabine: dort sitzt niemand sichtbar.
// Sichtbar nur, solange der Pilot fährt (onfoot.ts: leaveRover/enterRover → fahrerZeigen).
// =====================================================================================

// Seit 2026-11-25 eine Klasse: dieselbe Sitzfigur auch für Mitspieler im Wiesel (net.ts), mit deren Tracht.
type Tracht = ReturnType<typeof figTracht>;
type Sitz = { body: THREE.Object3D; seat: THREE.Vector3 | null; wheel: THREE.Vector3 | null; neu: boolean };
export class Fahrer {
  sk: THREE.Object3D | null = null; fig: Figur | null = null; loading = false; holder: THREE.Group | null = null; host: object | null = null;
  posed = false; shown = true; dressT = 0; dead = false;
  rest = new Map<THREE.Object3D, THREE.Quaternion>();      // Ruhelage der Knochen (vor dem ersten Einsetzen), damit jedes Einsetzen gleich ausfällt
  constructor(public tracht: () => Tracht) {}
  /** jedes Bild: Figur laden, an den Sitz hängen, einmal in Sitzhaltung bringen */
  update(m: Sitz, dt: number) {
    if (!m.neu || !m.seat || !m.wheel) { if (this.holder) this.weg(); return; }
    if (!this.sk) {
      if (!this.loading) {
        this.loading = true;
        neuesSkelett().then(s => {
          this.loading = false; if (!s || this.dead) return;
          this.sk = s; this.fig = new Figur(s); this.fig.setzen(this.tracht());
          for (const b of Object.values(this.fig.bones)) this.rest.set(b, b.quaternion.clone());
        }).catch(() => { this.loading = false; });
      }
      return;
    }
    if (this.host !== m) {
      this.holder?.removeFromParent(); this.holder = new THREE.Group(); this.holder.add(this.sk); m.body.add(this.holder); this.host = m; this.posed = false;
    }
    if ((this.dressT -= dt) <= 0) { this.dressT = 1; this.fig!.setzen(this.tracht()); }      // Ausrüstung gewechselt? (billig, wenn gleich)
    if (!this.posed && this.fig!.bereit) this.posed = pose(this, m.body, m.seat, m.wheel);
    this.shown = true; this.holder!.visible = this.posed;
  }
  zeigen(on: boolean) { this.shown = on; if (this.holder) this.holder.visible = this.posed && on; }
  weg() { this.holder?.removeFromParent(); this.holder = null; this.host = null; this.posed = false; }
  /** ganz weg (Mitspieler hat den Raum verlassen) */
  frei() { this.weg(); this.dead = true; }
}
const ICH = new Fahrer(() => figTracht());
export const FAHRER = { get bereit() { return ICH.posed; } };

const V = () => new THREE.Vector3(), Q = () => new THREE.Quaternion();
const wp = (o: THREE.Object3D) => o.getWorldPosition(V());
// Knochen so drehen, dass sein Kind (jetzt bei childNow) nach `to` zeigt
function aim(bone: THREE.Object3D, childNow: THREE.Vector3, to: THREE.Vector3) {
  const o = wp(bone), cur = childNow.clone().sub(o).normalize(), want = to.clone().sub(o).normalize();
  if (cur.lengthSq() < 1e-8 || want.lengthSq() < 1e-8) return;
  const q = Q().setFromUnitVectors(cur, want), bw = bone.getWorldQuaternion(Q()), pw = bone.parent ? bone.parent.getWorldQuaternion(Q()) : Q();
  bone.quaternion.copy(pw.invert().multiply(q.multiply(bw)));
  bone.updateMatrixWorld(true);
}
// zwei Knochen a → b → c: c an target, das Gelenk b zur Seite von pole
function ik2(a: THREE.Object3D, b: THREE.Object3D, c: THREE.Object3D, target: THREE.Vector3, pole: THREE.Vector3) {
  const A = wp(a), B = wp(b), C = wp(c), la = A.distanceTo(B), lb = B.distanceTo(C);
  const dir = target.clone().sub(A), d = THREE.MathUtils.clamp(dir.length(), 0.02, la + lb - 0.002); dir.normalize();
  const x = (la * la - lb * lb + d * d) / (2 * d), h = Math.sqrt(Math.max(0, la * la - x * x));
  const pl = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  const E = A.clone().add(dir.clone().multiplyScalar(x)).add(pl.multiplyScalar(h));
  aim(a, wp(b), E);
  aim(b, wp(c), target);
}

function pose(f: Fahrer, body: THREE.Object3D, seat: THREE.Vector3, wheel: THREE.Vector3) {
  const sk = f.sk, fig = f.fig;
  if (!sk || !fig) return false;
  const bn = fig.bones, need = ['pelvis', 'spine_01', 'neck_01', 'thigh_l', 'calf_l', 'foot_l', 'thigh_r', 'calf_r', 'foot_r', 'upperarm_l', 'lowerarm_l', 'hand_l', 'upperarm_r', 'lowerarm_r', 'hand_r', 'ball_l'];
  if (need.some(n => !bn[n])) { console.warn('Fahrer: Knochen fehlen', need.filter(n => !bn[n])); return false; }
  for (const [b, q] of f.rest) b.quaternion.copy(q);
  body.updateMatrixWorld(true);
  const L = (x: number, y: number, z: number) => body.localToWorld(new THREE.Vector3(x, y, z));      // Punkt im Buggy → Welt
  const D = (x: number, y: number, z: number) => L(x, y, z).sub(L(0, 0, 0)).normalize();            // Richtung im Buggy → Welt
  // 1. Blickrichtung: Zehen (ball) vor dem Fuß zeigen, wohin die Figur schaut; auf −z des Buggys drehen
  sk.rotation.set(0, 0, 0); sk.position.set(0, 0, 0); sk.updateMatrixWorld(true);
  const toe = body.worldToLocal(wp(bn.ball_l)).sub(body.worldToLocal(wp(bn.foot_l)));
  sk.rotation.y = Math.atan2(toe.x, toe.z) - Math.PI;      // (x, z) der Zehen → (0, −1)
  sk.updateMatrixWorld(true);
  // 2. Becken auf den Sitz (Sitzfläche + Gesäß)
  const pel = body.worldToLocal(wp(bn.pelvis)), want = seat.clone().add(new THREE.Vector3(0, 0.1, -0.02));
  sk.position.add(want.sub(pel)); sk.updateMatrixWorld(true);
  // 3. Oberkörper etwas zurückgelehnt (an die Lehne)
  const P0 = wp(bn.pelvis);
  aim(bn.spine_01, wp(bn.neck_01), P0.clone().add(D(0, 1, 0.2).multiplyScalar(wp(bn.neck_01).distanceTo(P0))));
  // 4. Beine zu den Pedalen, Knie nach oben vorn
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'l' : 'r';
    ik2(bn['thigh_' + k], bn['calf_' + k], bn['foot_' + k], L(seat.x + s * 0.13, 0.5, -0.92), D(s * 0.15, 1, -0.6));
  }
  // 5. Hände an den Lenkradkranz (links und rechts, leicht oben), Ellbogen nach unten außen
  for (const s of [-1, 1]) {
    const k = s < 0 ? 'l' : 'r';
    ik2(bn['upperarm_' + k], bn['lowerarm_' + k], bn['hand_' + k], L(wheel.x + s * 0.155, wheel.y + 0.04, wheel.z + 0.03), D(s * 0.8, -1, 0.4));
  }
  return true;
}

/** im Buggy jedes Bild (surface.ts updateRover) */
export function updateFahrer(m: Sitz, dt: number) { ICH.update(m, dt); }      // updateRover läuft nur, solange der Pilot fährt
/** Pilot steigt aus (false) oder ein (true) */
export function fahrerZeigen(on: boolean) { ICH.zeigen(on); }
/** Buggy weg (eingeladen, getauscht, Planet verlassen): Figur abhängen, sie bleibt für das nächste Mal geladen */
export function fahrerWeg() { ICH.weg(); }
