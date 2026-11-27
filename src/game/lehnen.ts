import * as THREE from 'three';
import { keys } from '../core/input';

// =====================================================================================
// Seitlich lehnen (seit 26.11.2026, nach dem Fab-Paket „TFP Movement“): Q nach links, E gehalten nach rechts. Damit schaut man um eine Kante
// oder über die Seite einer Deckung, ohne den Körper ganz herauszustellen.
//  - Kamera: Augen bis 0,45 m zur Seite und etwas tiefer, Bild um bis 11° geneigt (Außensicht: die Kamera rückt mit, kaum Neigung)
//  - Figur: die drei Wirbel (spine_01–03) neigen sich zur Seite, in Ich- und Außensicht
//  - Schüsse kommen aus der geneigten Kamera bzw. Mündung; Gegner sehen den Kopf an der geneigten Stelle (pluenderer.ts, dungeon.ts)
//  - E ist auch „benutzen“: Steht etwas zum Benutzen in Reichweite, lehnt E nicht. Sonst lehnt man erst nach 0,15 s gehalten nach rechts
//  - nicht im Sprint, nicht im Sprung; Wände begrenzen, wie weit es geht (frei)
// Ort: zu Fuß auf Planeten (onfoot.ts) und in Minen (dungeon.ts).
// =====================================================================================

export const LEHN = { v: 0, eT: 0 };
const WEIT = 0.45, TIEF = 0.06, NEIG = 0.19, KOERPER = 0.32;

/** jedes Bild: ok = Lehnen gerade erlaubt; frei(seite, anteil) = ist die Kopfstelle so weit zur Seite frei?; eFrei = E ist nicht gerade „benutzen“ */
export function updateLehnen(dt: number, ok: boolean, frei: (seite: number, anteil: number) => boolean, eFrei = true) {
  let want = 0;
  if (ok) {
    if (keys.KeyQ) want -= 1;
    if (keys.KeyE && eFrei) { LEHN.eT += dt; if (LEHN.eT > 0.15) want += 1; } else LEHN.eT = 0;
  } else LEHN.eT = 0;
  if (want) {
    const s = Math.sign(want);
    let a = 0;
    for (const t of [1, 0.7, 0.4]) if (frei(s, t)) { a = t; break; }
    want = s * a;
  }
  LEHN.v += (want - LEHN.v) * Math.min(1, dt * (Math.abs(want) > Math.abs(LEHN.v) ? 8 : 11));
  if (Math.abs(LEHN.v) < 0.002) LEHN.v = 0;
}

/** Versatz des Kopfs in der Welt (rechts = (cos yaw, −sin yaw), so wie die Kamera mit rotation.y = yaw) */
export function lehnKopf(yaw: number, v = LEHN.v) {
  const w = v * WEIT;
  return { x: Math.cos(yaw) * w, z: -Math.sin(yaw) * w, y: -Math.abs(v) * TIEF };
}
/** Kopfstelle für die Prüfung frei(seite, anteil) */
export const lehnPunkt = (yaw: number, seite: number, anteil: number) => lehnKopf(yaw, seite * anteil * 1.15);

/** Kamera: Versatz und Neigung anwenden (nach aimShake); tp = Außensicht */
export function lehnKamera(cam: THREE.Camera, yaw: number, tp: boolean) {
  if (!LEHN.v) return;
  const k = lehnKopf(yaw, LEHN.v * (tp ? 0.8 : 1));
  cam.position.x += k.x; cam.position.y += k.y; cam.position.z += k.z;
  cam.rotation.z += -LEHN.v * NEIG * (tp ? 0.3 : 1);
}

// Figur: Wirbel um die Blickachse neigen. Nach dem Abspielen der Animation (driveAvatar) aufrufen. Gibt es in einem Bild keine Animation, die die
// Knochen neu setzt, nimmt die nächste Neigung die vorige erst zurück (sonst würde sie sich aufsummieren).
const WIRBEL = ['spine_01', 'spine_02', 'spine_03'];
const merk = new WeakMap<THREE.Object3D, THREE.Object3D[]>();
const gesetzt = new WeakMap<THREE.Object3D, { vor: THREE.Quaternion; nach: THREE.Quaternion }>();
const _ax = new THREE.Vector3(), _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _pi = new THREE.Quaternion();
export function lehnFigur(root: THREE.Object3D | null | undefined, yaw: number, v = LEHN.v) {
  if (!root) return;
  let bones = merk.get(root);
  if (!bones) { bones = []; root.traverse(o => { if (WIRBEL.includes(o.name)) bones!.push(o); }); merk.set(root, bones); }
  if (!bones.length) return;
  _ax.set(-Math.sin(yaw), 0, -Math.cos(yaw));        // Blickrichtung: positiver Winkel kippt den Oberkörper nach rechts
  const je = v * KOERPER / 3;
  for (const b of bones) {
    const g = gesetzt.get(b);
    if (g && b.quaternion.equals(g.nach)) b.quaternion.copy(g.vor);      // keine neue Animation seit dem letzten Bild: zurück zur Haltung ohne Neigung
    if (!v) { gesetzt.delete(b); continue; }
    const vor = (g?.vor || new THREE.Quaternion()).copy(b.quaternion);
    if (b.parent) { b.parent.updateWorldMatrix(true, false); b.parent.matrixWorld.decompose(_v, _p, _s); } else _p.identity();
    _pi.copy(_p).invert();
    _q.setFromAxisAngle(_ax, je);
    b.quaternion.premultiply(_p).premultiply(_q).premultiply(_pi);         // lokal' = P⁻¹ · R · P · lokal
    const nach = (g?.nach || new THREE.Quaternion()).copy(b.quaternion);
    gesetzt.set(b, { vor, nach });
  }
}
const _v = new THREE.Vector3(), _s = new THREE.Vector3();
