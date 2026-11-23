import * as THREE from 'three';
import { MANIFEST, whenIdle } from '../core/assets';
// @ts-ignore – reines JavaScript (aus der Manny-Demo übernommen), ohne Typen
import { MannyAnimator } from './manny/MannyAnimator.js';

// =====================================================================================
// Eigene Spielerfigur in der Außensicht: Figur „Spieler“ auf dem UE5-Skelett mit den Bewegungen des Manny-Satzes.
// Seit 2026-11-23 der Standard (vorher Testfigur Manny hinter ?manny=1). Zurück zur alten Soldatenfigur: ?manny=0 (bleibt
// gespeichert), wieder ein mit ?manny=1.
// Zwei Dateien im Paket „lazy“ (nicht vor dem Menü geladen, sondern danach im Hintergrund; spätestens beim ersten Schritt zu Fuß):
//  - lazy/Spieler: die Figur (asset-src/glb/lazy/Spieler.glb, eigenes Modell auf Mannys Skelett, ohne Bewegungen)
//  - lazy/Manny:   der Bewegungssatz (asset-src/glb/lazy/Manny.glb: Skelett + 321 Clips aus Epics Game Animation Sample;
//                  das Netz der Testfigur wird beim Packen entfernt, scripts/lazy-pack.mjs)
// Die Clips finden ihre Knochen über den Namen; jede Figur mit diesem Skelett kann den Satz nutzen.
// LIZENZ: Die Bewegungen sind Epic-Inhalt unter der Unreal-Engine-EULA, siehe docs/manny.md.
// Die Bewegungslogik steckt in src/game/manny/ (MannyAnimator: Starts, Stops, Drehen auf der Stelle, 8 Richtungen,
// Ducken, Sprung; Auswahl nach Pose, Inertialization, Fuß-IK). Hier wird sie nur an die Spielerfigur angeschlossen:
//  - Die Spielphysik bewegt die Figur weiter (Position, Sprung); Mannys Root Motion wird nicht zur Bewegung genutzt.
//    Damit die Füße trotzdem nicht rutschen (seit 2026-11-23, wie in Unreal bei geführter Kapsel):
//    · Manny bekommt die ABSICHT (Tasten, Sprinten), nicht das gemessene Tempo: richtiger Start, Stopp sofort beim Loslassen.
//    · Das Spiel läuft mit Manny im Tempo der Bewegungen (mannyPace: vorwärts schneller als seitwärts und rückwärts).
//    · Start und Stopp werden nach zurückgelegter bzw. verbleibender Strecke abgespielt, Schleifen im echten Tempo.
//  - Der Körper schaut in Blickrichtung (Strafe-Modus des Animators), wie beim Soldaten.
//  - Waffen, Anschlag, Schießen, Nachladen und Tod hat der Bewegungssatz nicht; die Soldatenfigur bleibt dafür unsichtbar im Halter
//    (beim Tod wird sie wieder gezeigt).
// =====================================================================================
// brake / accel: Brems- und Anlaufrate der Spielphysik mit der Figur (1/s, 0 = Wert der Laufstelle) · url, body: nur für Tests
// (Bewegungssatz, Figur), sonst aus der Paketliste · alt: alter Anschluss (Tempo statt Absicht) zum Vergleich im Prüfskript
export const MANNY = { on: true, url: '' as string, body: '' as string, alt: false, brake: 8, accel: 0 };
try {
  const q = new URLSearchParams(location.search).get('manny');
  if (q === '1' || q === '0') localStorage.setItem('lf_manny', q);
  MANNY.on = (q ?? localStorage.getItem('lf_manny')) !== '0';
  localStorage.removeItem('lf_manny_mm');      // Schalter für Motion Matching (23.11.2026 wieder ausgebaut)
} catch (e) { /* ohne Speicher: ein */ }
whenIdle(() => { if (MANNY.on) ensure(); });   // schon ab dem Hauptmenü laden: beim ersten Schritt zu Fuß ist die Figur dann da

let anim: any = null, loading = false, failed = false;
function ensure() {
  if (anim || loading || failed) return;
  const url = MANNY.url || MANIFEST?.files['lazy/Manny']?.url, body = MANNY.body || MANIFEST?.files['lazy/Spieler']?.url;
  if (!url || !body) { failed = true; console.warn('Spielerfigur: lazy/Manny oder lazy/Spieler fehlt in der Paketliste – es bleibt beim Soldaten'); return; }
  loading = true;
  new MannyAnimator().load(url, undefined, body).then((a: any) => {
    a.model.traverse((o: any) => {
      o.userData.sh = false; o.userData.shared = true;
      if (!o.isMesh || !o.material) return;
      // wie die Soldatenfigur: wenig Spiegelung der Umgebung, scharfe Texturen im flachen Blickwinkel
      o.material.envMapIntensity = 0.3;
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) if (o.material[k]) o.material[k].anisotropy = 8;
    });
    anim = a; loading = false;
    console.info(`Spielerfigur geladen: ${Object.keys(a.actions).length} Bewegungen, Analyse ${a.analyseMs} ms`);
  }).catch((e: unknown) => { failed = true; loading = false; console.warn('Spielerfigur nicht geladen – es bleibt beim Soldaten:', e); });
}

export interface MannyDrive {
  x: number; y: number; z: number; yaw: number; vx: number; vz: number; crouch?: boolean; air?: boolean;
  mx?: number; mz?: number;                          // Absicht: gewünschte Laufrichtung (Tasten) in Raumkoordinaten, 0/0 = stehen
  sprint?: boolean;                                  // Absicht: Sprinten gedrückt
  ground?: ((x: number, z: number) => number | null) | null;   // Bodenhöhe im Raum der Figur (Rampen, Stufen, Gelände)
}
const st = { lastY: 0, lx: 0, lz: 0, air: false, first: true, blocked: 0 };
const _mv = new THREE.Vector2(), _vel = new THREE.Vector2();
// Bremsweg der Spielphysik nach dem Loslassen: Das Tempo fällt in allen drei Laufstellen mit rund 12–13 pro Sekunde
// (interior.ts 12, onfoot.ts und dungeon.ts 13), der Rest des Wegs ist also Tempo × 0,08 s.
const STOP_TAU = 0.08;
/** Bremsrate der Spielphysik nach dem Loslassen (1/s): mit Manny weicher, damit die Stopp-Bewegung Platz für ihren letzten Schritt hat */
/** Anlaufrate der Spielphysik (1/s): mit Manny auf Wunsch weicher (MANNY.accel), sonst der Wert der Laufstelle */
export const mannyAccel = (base: number) => (MANNY.on && !MANNY.alt && anim && MANNY.accel > 0 ? MANNY.accel : base);
export const mannyBrake = (base: number) => (MANNY.on && !MANNY.alt && anim && MANNY.brake > 0 ? MANNY.brake : base);
// Ohne Absicht (fremder Aufrufer): Gangart nach Tempo
const gaitOf = (spd: number) => (spd < 3 ? 'walk' : spd < 5.9 ? 'run' : 'sprint');

/**
 * Lauftempo mit Manny (m/s, ohne Ausrüstungsfaktor): das Tempo der Bewegungen selbst, je nach Richtung. f = vor (+1) / zurück (−1),
 * s = rechts (+1) / links (−1). Wie in Unreals Beispiel ist seitwärts und rückwärts langsamer als vorwärts; Sprinten gibt es nur
 * nach vorn (bis 60° seitlich). Gibt null zurück, solange Manny aus oder noch nicht geladen ist – dann gilt das alte Tempo.
 */
export function mannyPace(f: number, s: number, sprint: boolean, crouch: boolean): number | null {
  if (!MANNY.on || MANNY.alt) return null;
  ensure();
  if (!anim) return null;
  const theta = Math.atan2(s, f) * 180 / Math.PI;
  const gait = crouch ? 'crouch' : sprint && Math.abs(theta) <= 60 ? 'sprint' : 'run';
  const v = anim.speedAt(gait, theta);
  return v > 0.5 ? v : null;
}
/** nur für Prüfskripte */
export const mannyAnim = () => anim;

/**
 * Manny statt des Soldaten zeigen. holder: die Gruppe der Spielerfigur (Position und Drehung body + π setzt avatar.ts),
 * soldier: das Modell des Soldaten darin (wird ausgeblendet). Gibt false zurück, solange Manny nicht bereit ist.
 */
export function driveManny(holder: THREE.Object3D, soldier: THREE.Object3D, dt: number, d: MannyDrive): boolean {
  if (!MANNY.on) return false;
  ensure();
  if (!anim) return false;
  const dtc = Math.min(dt, 0.1), spd = Math.hypot(d.vx, d.vz), air = !!d.air, face = d.yaw + Math.PI;
  // Neu im Halter oder vom Spiel versetzt (Tür, Aufzug, Einstieg): sofort richtig hinstellen, ohne Drehbewegung und ohne Überblenden
  const fresh = anim.model.parent !== holder || st.first;
  if (fresh || Math.hypot(d.x - st.lx, d.z - st.lz) > Math.max(1.5, spd * dtc * 4)) { anim.teleport(face); st.lastY = d.y; st.air = air; st.blocked = 0; }
  if (anim.model.parent !== holder) holder.add(anim.model);
  soldier.visible = false; anim.model.visible = true;
  const vy = fresh || dt <= 0 ? 0 : (d.y - st.lastY) / dt;
  st.lastY = d.y; st.lx = d.x; st.lz = d.z; st.first = false;
  const jump = air && !st.air && vy > 0.5; st.air = air;
  // Spielwelt: vorwärts = (−sin yaw, −cos yaw). Manny schaut bei rotation.y = F nach (sin F, cos F) → F = yaw + π
  let gait: string;
  const led = !MANNY.alt;
  if (led && d.mx !== undefined && d.mz !== undefined) {
    // Absicht: Richtung der Tasten. Läuft die Figur gegen eine Wand (Absicht ja, Tempo nein), steht Manny, statt auf der Stelle zu laufen.
    const l = Math.hypot(d.mx, d.mz), want = l > 0.1;
    st.blocked = want && spd < 0.6 ? st.blocked + dtc : 0;
    if (want && st.blocked < 0.3) _mv.set(d.mx / l, d.mz / l); else _mv.set(0, 0);
    gait = d.sprint ? 'sprint' : 'run';
  } else {
    if (spd > 0.3) _mv.set(d.vx / spd, d.vz / spd); else _mv.set(0, 0);
    gait = gaitOf(spd);
  }
  const out = anim.update(dtc, {
    moveDir: _mv, gait, crouch: !!d.crouch, strafe: true, facing: face,
    jump, grounded: !air, verticalSpeed: vy,
    vel: led ? _vel.set(d.vx, d.vz) : undefined, stopDist: spd * Math.max(0, (MANNY.brake > 0 ? 1 / MANNY.brake : STOP_TAU + dtc) - dtc),   // Rest des Wegs bei Bremsrate r: Tempo × (1/r − Bilddauer)
  });
  // Animator-Blickrichtung relativ zum Halter, der schon um body + π gedreht ist. yaw, vx, vz und facing gelten im Raum des Halters
  // (Innenräume: Koordinaten des Decks, das selbst gedreht in der Welt liegt), deshalb die lokale Drehung des Halters, nicht die
  // Weltdrehung: Mit der Weltdrehung stand Manny in Stationen und Schiffen um die Drehung des Raums versetzt (lief z. B. 90° seitlich).
  anim.model.position.set(0, 0, 0);
  anim.model.rotation.set(0, out.facing - holder.rotation.y, 0);
  // Weltlage dieses Bildes für die Füße: nur die Kette nach oben und der Halter selbst (nicht die ganze Szene)
  const room = holder.parent;
  if (room) room.updateWorldMatrix(true, false);
  holder.updateMatrixWorld(true);
  // Füße: im Raum der Figur festhalten (ein fliegendes Schiff nimmt sie mit) und dem Boden unter ihnen folgen
  anim.finalize(dtc, { space: room ? room.matrixWorld : null, ground: d.ground || null, baseY: d.y });
  return true;
}
/** Manny aus dem Halter nehmen (Schalter aus oder Figur neu gebaut) */
export function releaseManny(soldier?: THREE.Object3D) {
  st.first = true;
  if (anim?.model.parent) anim.model.removeFromParent();
  if (soldier) soldier.visible = true;
}
