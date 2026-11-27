import * as THREE from 'three';
import { snd, sfx, sfxAny, gunSounds, gunPart, type GunKind } from '../core/audio';
import { mouse } from '../core/input';
import { clamp } from '../core/util';
import { warmFlips } from './footfx';
import { LYRA_ITEM, lyraGunReady } from './lyraGuns';
import { P } from './state';

// Magazin der Handwaffe zu Fuß (seit Alpha 1.54, mit der neuen Ringanzeige): Planeten und Minen teilen sich denselben Stand.
// Der Vorrat ist unbegrenzt, nur das Magazin zählt. Leer lädt die Waffe von selbst nach, R lädt früher nach. Der Schneidbrenner (ohne Waffe)
// läuft mit Energie und braucht kein Magazin.
const MAG: Record<string, number> = { waffe_pistole: 12, waffe_smg: 40, waffe_karabiner: 30, waffe_flinte: 6, waffe_impuls: 24, waffe_splitter: 20, waffe_sp12: 12, waffe_kg30: 30, waffe_tf8: 8 };
const RELOAD: Record<string, number> = { waffe_smg: 1.6, waffe_flinte: 2.2, waffe_karabiner: 1.8, waffe_splitter: 1.9, waffe_sp12: 2.0, waffe_kg30: 2.2, waffe_tf8: 2.8 };   // die drei letzten: Länge von Lyras Nachlade-Clips
// Patronenwaffen laden hörbar nach (Aufnahmen des Lyra-Pakets, audio.ts): Magazin heraus, Magazin hinein, Verschluss – zu den Zeitpunkten,
// an denen die Figur in der Außensicht danach greift (Anteil der Nachladezeit). Energiewaffen behalten die alten Töne.
const KIND: Record<string, GunKind> = { waffe_pistole: 'pistol', waffe_karabiner: 'rifle', waffe_flinte: 'shotgun', waffe_smg: 'rifle', waffe_sp12: 'pistol', waffe_kg30: 'rifle', waffe_tf8: 'shotgun' };
// Streuung nach Hitze (lyra.json, weapons.*.spread; nur die drei Waffen des Pakets): Jeder Schuss erzeugt Hitze (per), die Hitze ergibt den
// Öffnungswinkel in Grad (curve). Nach der Pause delay kühlt die Waffe mit cool je Sekunde ab. Faktoren für Zielen, Stillstehen, Ducken und
// Springen (mult). first: Der erste Schuss aus dem Stand sitzt fast genau. fall: Anteil des Schadens über die Entfernung in m.
// exp: Verteilung im Streukegel (lyra.json, spread.exponent): Abstand von der Mitte = Zufall ^ exp
interface HeatDef { curve: [number, number][]; per: [number, number][]; cool: number; delay: number; first: boolean; mult: [number, number, number, number]; fall: [number, number][]; exp?: number }
const HEAT: Record<string, HeatDef> = {
  waffe_kg30: { curve: [[0, 2.5], [0.0854, 3], [7, 8], [12, 15]], per: [[0, 1], [4, 1], [5, 1.25]], cool: 4, delay: 0.15, first: true, mult: [0.65, 0.8, 0.6, 1.6], fall: [[0, 1], [28, 1], [28.01, 0.5]], exp: 0.8 },
  waffe_sp12: { curve: [[0, 2.5], [8, 12]], per: [[0, 12]], cool: 10, delay: 0.2, first: true, mult: [0.65, 0.9, 0.65, 1.25], fall: [[0, 1], [20, 1], [20.01, 0.5]] },
  waffe_tf8: { curve: [[0, 6], [6, 9.5], [18, 20]], per: [[1, 6]], cool: 6, delay: 0.5, first: false, mult: [0.8, 0.9, 0.8, 1.75], fall: [[0, 1], [6, 1], [6.4, 0.7], [20, 0.7], [20.01, 0.5]] },
};
const HS = { h: 0, since: 9 };
const BODY = { still: true, crouch: false, air: false };
const curve = (c: [number, number][], x: number) => {
  if (x <= c[0][0]) return c[0][1];
  for (let i = 1; i < c.length; i++) if (x <= c[i][0]) { const [x0, y0] = c[i - 1], [x1, y1] = c[i]; return y0 + (y1 - y0) * (x - x0) / Math.max(1e-6, x1 - x0); }
  return c[c.length - 1][1];
};
/** Streuung des nächsten Schusses (Abweichung nach jeder Seite, rad); base: der feste Wert der Waffe, für alle ohne Hitze-Modell */
export function gunSpread(base: number): number {
  const H = HEAT[GUN.id], k = aimK();
  if (!H) return base * (1 - 0.35 * k);
  let m = 1 + (H.mult[0] - 1) * k;
  if (BODY.air) m *= H.mult[3]; else { if (BODY.still) m *= H.mult[1]; if (BODY.crouch) m *= H.mult[2]; }
  if (H.first && HS.h <= 0 && BODY.still && !BODY.air) m *= 0.15;
  return curve(H.curve, HS.h) * 0.5 * Math.PI / 180 * m;
}
/**
 * Richtung einer Kugel: d (Länge 1) um höchstens sp (rad) abgelenkt, gleichmäßig um die Achse verteilt. Der Abstand von der Mitte ist
 * Zufall ^ exp · sp wie in Lyra (VRandConeNormalDistribution) – jede Kugel bleibt im Kreis, den das Fadenkreuz zeigt. Vorher wurden Nick-
 * und Gierwinkel einzeln gewürfelt: ein Quadrat, dessen Ecken um 41 % außerhalb der Anzeige lagen.
 */
const _sr = new THREE.Vector3(), _su = new THREE.Vector3();
export function spreadDir(d: THREE.Vector3, sp: number, out: THREE.Vector3): THREE.Vector3 {
  if (sp <= 0) return out.copy(d);
  const r = Math.tan(sp * Math.pow(Math.random(), HEAT[GUN.id]?.exp ?? 1)), ph = Math.random() * Math.PI * 2;
  if (Math.abs(d.y) > 0.99) _sr.set(1, 0, 0); else _sr.set(-d.z, 0, d.x).normalize();
  _su.crossVectors(_sr, d);
  return out.copy(d).addScaledVector(_sr, r * Math.cos(ph)).addScaledVector(_su, r * Math.sin(ph)).normalize();
}
/** Anteil des Schadens in der Entfernung d (m) */
export const gunFalloff = (d: number) => { const H = HEAT[GUN.id]; return H ? curve(H.fall, d) : 1; };
const PARTS: ['out' | 'in' | 'end', number][] = [['out', 0.12], ['in', 0.55], ['end', 0.86]];
export const gunHooks = { sync: () => {} };      // Waffe gewechselt oder zum ersten Mal zu Fuß: weitere Modelle vorab laden (granate.ts)
export const GUN = { id: '?', mag: 0, max: 0, reload: 0, reloadT: 1.5, kind: undefined as GunKind | undefined, part: 0 };

export function gunSync() {
  const id = P.gear?.waffe || '';
  if (id === GUN.id) return;
  GUN.id = id; GUN.max = MAG[id] ?? 0; GUN.mag = GUN.max; GUN.reload = 0; GUN.reloadT = RELOAD[id] ?? 1.5;
  if (GUN.id !== '?' && GUN.kind !== KIND[id]) sfxAny('w_x_swap', 3, 0.4);      // andere Waffe in der Hand
  GUN.kind = KIND[id]; gunSounds(GUN.kind); warmFlips(); HS.h = 0;
  if (LYRA_ITEM[id]) lyraGunReady(LYRA_ITEM[id]);      // Modell schon laden
  gunHooks.sync();
}
// darf jetzt geschossen werden? (leeres Magazin startet das Nachladen)
export function gunReady(): boolean {
  gunSync();
  if (GUN.reload > 0) return false;
  if (GUN.max && GUN.mag <= 0) { gunReload(); return false; }
  return true;
}
export function gunFired() {
  const H = HEAT[GUN.id]; if (H) { HS.h = Math.min(H.curve[H.curve.length - 1][0], HS.h + curve(H.per, HS.h)); HS.since = 0; }
  if (GUN.max) { GUN.mag = Math.max(0, GUN.mag - 1); if (GUN.mag === 0) gunReload(); } }
export function gunReload() {
  gunSync();
  if (!GUN.max || GUN.reload > 0 || GUN.mag >= GUN.max) return;
  GUN.reload = GUN.reloadT; GUN.part = 0;
  if (!GUN.kind) sfx('gear', 0.25, 1.6, () => snd(260, 0.08, 'triangle', 0.03, -60));
}
export function gunUpdate(dt: number) {
  gunSync();      // läuft zu Fuß in jedem Bild: Die Aufnahmen der Waffe sind so vor dem ersten Schuss geladen
  { const H = HEAT[GUN.id]; HS.since += dt; if (!H) HS.h = 0; else if (HS.since > H.delay) HS.h = Math.max(0, HS.h - H.cool * dt); }
  if (GUN.reload <= 0) return;
  GUN.reload -= dt;
  if (GUN.kind) { const p = 1 - GUN.reload / GUN.reloadT; while (GUN.part < PARTS.length && p >= PARTS[GUN.part][1]) gunPart(GUN.kind, PARTS[GUN.part++][0]); }
  if (GUN.reload <= 0) { GUN.reload = 0; GUN.mag = GUN.max; if (!GUN.kind) snd(520, 0.05, 'triangle', 0.025, 80); }
}
export const gunMode = (w: { n: number; auto: boolean }) => (w.n > 1 ? 'Schrot' : w.auto ? 'Dauerfeuer' : 'Einzelfeuer');

// =====================================================================================
// Zielen, Kamera und Rückmeldungen zu Fuß (seit 2026-11-23, Planet und Mine gemeinsam). Werte und Aufnahmen aus dem Lyra-Paket (docs/lyra.md).
//  · Zielen: rechte Maustaste halten. Die Kamera rückt in 0,22 s näher an die Schulter (avatar.ts tpCamPos), das Sichtfeld wird im
//    Verhältnis von Lyras Zielkamera enger (dort 80° → 70° waagerecht), die Figur nimmt die Waffe in den Anschlag, die Streuung sinkt
//    auf 65 % (lyra.json, spread.mult.Aiming).
//  · Kamerawackeln: kurzer Stoß bei eigenem Treffer und beim Schuss der Flinte.
//  · Abschüsse in Folge (innerhalb von 4 s) zählen hoch; die Anzeige (ui/footHud.ts) zeigt Doppel-, Dreifach- und Vierfachabschuss.
// =====================================================================================
export const AIM = { k: 0, on: false, shake: 0, at: 0 };
// =====================================================================================
// Zielstrahl (seit 2026-11-27): Geschossen wird dorthin, wo das Fadenkreuz steht – entlang des Strahls der Kamera durch die Bildmitte.
// Vorher lief der Schuss vom Kopf der Figur in Blickrichtung: In der Außensicht steht die Kamera rund 0,5 m rechts über der Schulter,
// die Kugeln schlugen deshalb um diesen Versatz links neben dem Fadenkreuz ein (auf 3 m sind das 9°).
//  · o: Anfang des Strahls. In der Außensicht der Punkt auf dem Kamerastrahl auf Höhe der Figur – was zwischen Kamera und Figur liegt,
//    kann nicht getroffen werden. d: Blickrichtung (Bildmitte).
//  · eye: Kopf der Figur. In der Außensicht prüft der Schuss zusätzlich den Weg von dort zum Zielpunkt: Steht dort eine Wand oder ein
//    Gegner, trifft die Kugel das (die Kamera sieht über die Schulter an Kanten vorbei, die Waffe nicht).
//  · at: Zielpunkt für die Haltung (der Lauf zeigt dorthin, mannyAvatar.ts fitGun). Die Entfernung folgt weich, sonst zuckt die Waffe,
//    wenn das Fadenkreuz über eine Kante wandert; ein Schuss setzt sie sofort.
// =====================================================================================
export const ZIEL = { o: new THREE.Vector3(), d: new THREE.Vector3(0, 0, -1), eye: new THREE.Vector3(), at: new THREE.Vector3(), dist: 30, tp: false, ok: false };
const _zc = new THREE.Vector3();
/**
 * vor dem Schießen in jedem Bild: cam = Kamera des letzten Bildes (ihr Ort: die Schulter samt Wandabstand und Zielen), ex/ey/ez = Kopf der
 * Figur (Welt), yaw/pitch = Blick dieses Bildes. Die Richtung ist der Blick selbst: So dreht die Kamera im Bild des Schusses (kickView
 * ist dort 0), Einschlag und Fadenkreuz liegen übereinander, auch wenn die Maus im selben Bild noch bewegt wurde.
 */
export function zielStrahl(cam: THREE.Camera, ex: number, ey: number, ez: number, yaw: number, pitch: number, tp: boolean) {
  const cp = Math.cos(pitch);
  // Die Kamera steht noch am Ort des letzten Bildes: um den Weg der Figur seitdem weiterrücken (im Lauf sind das 9 cm je Bild)
  _su.set(ex, ey, ez).sub(ZIEL.eye); if (!ZIEL.ok || _su.lengthSq() > 1) _su.set(0, 0, 0);
  ZIEL.eye.set(ex, ey, ez); ZIEL.tp = tp; ZIEL.d.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
  _zc.setFromMatrixPosition(cam.matrixWorld).add(_su);
  if (_zc.distanceTo(ZIEL.eye) > 8) { ZIEL.o.copy(ZIEL.eye); ZIEL.tp = false; return; }      // Kamera noch nicht an der Figur (erstes Bild zu Fuß): vom Kopf aus
  ZIEL.o.copy(_zc).addScaledVector(ZIEL.d, tp ? Math.max(0, _sr.subVectors(ZIEL.eye, _zc).dot(ZIEL.d)) : 0);
}
/** t: Entfernung des Zielpunkts auf dem Strahl ohne Streuung; now: sofort (Schuss) */
export function zielWeite(t: number, dt: number, now = false) {
  const w = clamp(t, 2.5, 80);
  ZIEL.dist = now || !ZIEL.ok ? w : ZIEL.dist + (w - ZIEL.dist) * Math.min(1, dt * 10);
  ZIEL.at.copy(ZIEL.o).addScaledVector(ZIEL.d, ZIEL.dist); ZIEL.ok = true;
}
/** Rückstoß der Kamera (rad) zum Wert kick (1 beim Schuss, fällt mit 7 je Sekunde): setzt erst nach dem Bild des Schusses ein, damit Einschlag und Fadenkreuz dort übereinander liegen */
export const kickView = (k: number) => 0.012 * (k > 0.86 ? (1 - k) / 0.14 : k / 0.86);
const ZOOM = Math.tan(35 * Math.PI / 180) / Math.tan(40 * Math.PI / 180);
/** je Bild, solange zu Fuß gekämpft werden kann; can: nicht gefallen */
export function aimUpdate(dt: number, can: boolean, body?: { still: boolean; crouch: boolean; air: boolean }) {
  if (body) Object.assign(BODY, body);
  const on = can && mouse.right && GUN.reload <= 0;
  if (on !== AIM.on) { AIM.on = on; sfxAny(on ? 'w_x_zin' : 'w_x_zout', 3, 0.3); }
  AIM.k = clamp(AIM.k + (on ? 1 : -1) * dt / 0.22, 0, 1);
  AIM.shake = Math.max(0, AIM.shake - dt * 3.2);
  AIM.at = performance.now();
}
/** Anteil des Zielens 0..1, weich; 0, wenn gerade nicht zu Fuß gekämpft wird (Station, Schiff) */
export const aimK = () => (performance.now() - AIM.at < 250 ? AIM.k * AIM.k * (3 - 2 * AIM.k) : 0);
export const aimFov = (base: number) => 2 * Math.atan(Math.tan(base * Math.PI / 360) * (1 + (ZOOM - 1) * aimK())) * 180 / Math.PI;
export function camShake(a: number) { AIM.shake = Math.min(1, Math.max(AIM.shake, a)); }
/** nach dem Setzen der Kameradrehung aufrufen */
export function aimShake(r: { x: number; y: number; z: number }) {
  const s = AIM.shake * AIM.shake; if (s < 1e-4) return;
  const t = performance.now() / 1000;
  r.x += Math.sin(t * 61) * s * 0.016; r.y += Math.sin(t * 47 + 1.3) * s * 0.014; r.z = Math.sin(t * 53 + 0.7) * s * 0.01;
}
/** eigener Treffer: Aufnahme und Kamerastoß (nur bei einem richtigen Treffer, nicht bei Schaden je Bild wie Gas) */
export function hurtSound(d: number) {
  const old = () => sfx('hull_hit' + Math.floor(Math.random() * 3), 0.5, 1.2, () => snd(120, 0.15, 'sawtooth', 0.06, -40));
  if (d < 1) { old(); return; }
  sfxAny('w_x_hurt', 4, 0.6, 1, old); camShake(0.5);
}
export const KILL = { n: 0, at: -1e9 };
/** eigener Abschuss */
export function noteKill() {
  const now = performance.now();
  KILL.n = now - KILL.at < 4000 ? KILL.n + 1 : 1; KILL.at = now;
  sfxAny('w_x_kill', 4, 0.32);
}
/** ein feindliches Geschoss fliegt dicht vorbei (d: Abstand zum Oberkörper in m): einmal je Geschoss */
export function whiz(b: object, d: number) {
  if (d > 2.4 || (b as any).wz) return;
  (b as any).wz = true; sfxAny('w_x_whiz', 6, 0.45);
}
