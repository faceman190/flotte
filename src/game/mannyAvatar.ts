import * as THREE from 'three';
import { MANIFEST } from '../core/assets';
// @ts-ignore – reines JavaScript (aus der Manny-Demo übernommen), ohne Typen
import { MannyAnimator } from './manny/MannyAnimator.js';

// =====================================================================================
// Testfigur „Manny“ für die eigene Spielerfigur in der Außensicht (seit 2026-11-23, Branch manny-animator).
// Einschalten: Spiel mit ?manny=1 öffnen (bleibt gespeichert), ausschalten mit ?manny=0.
// Figur und 321 Bewegungen: UE5-Mannequin aus Epics Game Animation Sample, auf Manny übertragen und als GLB exportiert
// (asset-src/glb/lazy/Manny.glb, Paket „lazy“: wird nur bei eingeschaltetem Schalter geladen, nicht vor dem Menü).
// LIZENZ: Epic-Inhalt unter der Unreal-Engine-EULA – nur als Test gedacht, siehe docs/manny.md.
// Die Bewegungslogik steckt in src/game/manny/ (MannyAnimator: Starts, Stops, Drehen auf der Stelle, 8 Richtungen,
// Ducken, Sprung; Auswahl nach Pose, Inertialization, Fuß-IK). Hier wird sie nur an die Spielerfigur angeschlossen:
//  - Die Spielphysik bewegt die Figur weiter (Position, Sprung); Mannys Root Motion wird nicht zur Bewegung genutzt.
//  - Der Körper schaut in Blickrichtung (Strafe-Modus des Animators), wie beim Soldaten.
//  - Waffen, Anschlag, Schießen, Nachladen und Tod hat Manny nicht; die Soldatenfigur bleibt dafür unsichtbar im Halter.
// =====================================================================================
export const MANNY = { on: false, url: '' as string };   // url: nur für Tests, sonst aus der Paketliste
try {
  const q = new URLSearchParams(location.search).get('manny');
  if (q === '1' || q === '0') localStorage.setItem('lf_manny', q);
  MANNY.on = (q ?? localStorage.getItem('lf_manny')) === '1';
} catch (e) { /* ohne Speicher: aus */ }

let anim: any = null, loading = false, failed = false;
function ensure() {
  if (anim || loading || failed) return;
  const url = MANNY.url || MANIFEST?.files['lazy/Manny']?.url;
  if (!url) { failed = true; console.warn('Manny: Datei lazy/Manny fehlt in der Paketliste – es bleibt beim Soldaten'); return; }
  loading = true;
  new MannyAnimator().load(url).then((a: any) => {
    a.model.traverse((o: any) => { o.userData.sh = false; o.userData.shared = true; });
    anim = a; loading = false;
    console.info(`Manny geladen: ${Object.keys(a.actions).length} Bewegungen, Analyse ${a.analyseMs} ms`);
  }).catch((e: unknown) => { failed = true; loading = false; console.warn('Manny nicht geladen – es bleibt beim Soldaten:', e); });
}

export interface MannyDrive { yaw: number; y: number; vx: number; vz: number; crouch?: boolean; air?: boolean }
const st = { lastY: 0, air: false, first: true };
const _mv = new THREE.Vector2();
// Gangart nach Tempo der Spielphysik (Gehen ≈ 2 m/s, Laufen 4,2 m/s, Sprinten 6,4 m/s in onfoot.ts)
const gaitOf = (spd: number) => (spd < 3 ? 'walk' : spd < 5.4 ? 'run' : 'sprint');

/**
 * Manny statt des Soldaten zeigen. holder: die Gruppe der Spielerfigur (Position und Drehung body + π setzt avatar.ts),
 * soldier: das Modell des Soldaten darin (wird ausgeblendet). Gibt false zurück, solange Manny nicht bereit ist.
 */
export function driveManny(holder: THREE.Object3D, soldier: THREE.Object3D, dt: number, d: MannyDrive): boolean {
  if (!MANNY.on) return false;
  ensure();
  if (!anim) return false;
  if (anim.model.parent !== holder) holder.add(anim.model);
  soldier.visible = false; anim.model.visible = true;
  const spd = Math.hypot(d.vx, d.vz), air = !!d.air;
  const vy = st.first || dt <= 0 ? 0 : (d.y - st.lastY) / dt;
  st.lastY = d.y; st.first = false;
  const jump = air && !st.air && vy > 0.5; st.air = air;
  // Spielwelt: vorwärts = (−sin yaw, −cos yaw). Manny schaut bei rotation.y = F nach (sin F, cos F) → F = yaw + π
  if (spd > 0.3) _mv.set(d.vx / spd, d.vz / spd); else _mv.set(0, 0);
  const out = anim.update(Math.min(dt, 0.1), {
    moveDir: _mv, gait: gaitOf(spd), crouch: !!d.crouch, strafe: true, facing: d.yaw + Math.PI,
    jump, grounded: !air, verticalSpeed: vy,
  });
  // Animator-Blickrichtung (Welt) relativ zum Halter, der schon um body + π gedreht ist
  holder.updateMatrixWorld(true);
  const hy = new THREE.Euler().setFromQuaternion(holder.getWorldQuaternion(new THREE.Quaternion()), 'YXZ').y;
  anim.model.position.set(0, 0, 0);
  anim.model.rotation.set(0, out.facing - hy, 0);
  anim.model.updateMatrixWorld(true);
  anim.finalize(dt);
  return true;
}
/** Manny aus dem Halter nehmen (Schalter aus oder Figur neu gebaut) */
export function releaseManny(soldier?: THREE.Object3D) {
  if (anim?.model.parent) anim.model.removeFromParent();
  if (soldier) soldier.visible = true;
}
