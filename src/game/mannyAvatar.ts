import * as THREE from 'three';
import { MANIFEST, whenIdle } from '../core/assets';
import { BODY_LAYER, bodyPass } from '../core/engine';
// @ts-ignore – reines JavaScript (aus der Manny-Demo übernommen), ohne Typen
import { MannyAnimator } from './manny/MannyAnimator.js';
import { buildHandWeapon } from './mineArt';
import { makeLyraGun, driveLyraGun, LYRA_SPEC, LYRA_HALT, type LyraGun, type LyraKind } from './lyraGuns';
import { Figur, halterTiefe, type Tracht } from './figur';

// =====================================================================================
// Eigene Spielerfigur in der Außensicht: Figur „Spieler“ auf dem UE5-Skelett mit den Bewegungen des Manny-Satzes.
// Seit 2026-11-23 der Standard (vorher Testfigur Manny hinter ?manny=1). Zurück zur alten Soldatenfigur: ?manny=0 (bleibt
// gespeichert), wieder ein mit ?manny=1.
// Zwei Dateien im Paket „lazy“ (nicht vor dem Menü geladen, sondern danach im Hintergrund; spätestens beim ersten Schritt zu Fuß):
//  - lazy/Skelett: das Skelett (UE5 Manny). Körper und Ausrüstung hängt game/figur.ts daran: je Figur eine Körperdatei, je Teil eine Datei
//                  (seit 2026-11-24, Paket „Spielcharakter“; vorher eine feste Figur lazy/Spieler)
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
//  - Waffe (seit 2026-11-23): Wo geschossen werden kann (Planet, Mine), trägt die Figur die angelegte Waffe. Haltung, Anschlag, Zielen
//    nach oben und unten, Rückstoß, Nachladen und Treffer kommen aus den Clips des Lyra-Pakets (manny/WeaponLayer.js: nur der
//    Oberkörper, die Beine laufen weiter wie ohne Waffe). In Stationen und Schiffen bleibt die Figur unbewaffnet.
//    Die Soldatenfigur bleibt unsichtbar im Halter.
//  - Ich-Sicht mit ganzem Körper (seit 2026-11-24, nach Unreals First-Person-Vorlage): dieselbe Figur, dieselben Bewegungen wie in der
//    Außensicht, die Kamera sitzt im Kopf (mannyFirstPerson unten). Die alte Ich-Sicht (Waffe allein vor der Kamera) bleibt nur, solange
//    die Figur noch lädt oder abgeschaltet ist.
//  - Tod: Die Figur fällt mit einem der Sturz-Clips um und bleibt liegen (seit 2026-11-23, vorher wechselte das Bild zum Soldaten).
// =====================================================================================
// brake / accel: Brems- und Anlaufrate der Spielphysik mit der Figur (1/s, 0 = Wert der Laufstelle) · url, body: nur für Tests
// (Bewegungssatz, Figur), sonst aus der Paketliste · alt: alter Anschluss (Tempo statt Absicht) zum Vergleich im Prüfskript
// turnRamp / turnMin: nach einem Richtungswechsel im Lauf steigt die Anlaufrate in turnRamp Sekunden von turnMin (Anteil) auf voll
// test: nur für Prüfskripte – Waffe überall tragen (id wie in mineArt WDEFS), auch im Innenraum
export const MANNY = { on: true, url: '' as string, body: '' as string, alt: false, brake: 8, accel: 0, turnRamp: 0.25, turnMin: 0.15,
  test: null as null | { id: string; lyra?: LyraKind; aim: boolean; shots: number; hits: number; reload: number; toss?: number; weg?: boolean; koerper?: boolean; versteckt?: boolean } };
try {
  const q = new URLSearchParams(location.search).get('manny');
  if (q === '1' || q === '0') localStorage.setItem('lf_manny', q);
  MANNY.on = (q ?? localStorage.getItem('lf_manny')) !== '0';
  localStorage.removeItem('lf_manny_mm');      // Schalter für Motion Matching (23.11.2026 wieder ausgebaut)
} catch (e) { /* ohne Speicher: ein */ }
whenIdle(() => { if (MANNY.on) ensure(); });   // schon ab dem Hauptmenü laden: beim ersten Schritt zu Fuß ist die Figur dann da

let anim: any = null, loading = false, failed = false;
// Körper und Ausrüstung am Skelett des Animators. tracht: was die eigene Figur gerade tragen soll (setzt avatar.ts)
let fig: Figur | null = null;
// relaxed: lockerer Bewegungsstil (Stationen, Städte; main.ts setzt es), sonst der neutrale
export const mannyHooks = { tracht: null as null | (() => Tracht), relaxed: null as null | (() => boolean) };
function dress() { if (fig) fig.setzen(mannyHooks.tracht ? mannyHooks.tracht() : { figur: 1, teile: {} }); return !!fig && fig.bereit; }
function ensure() {
  if (anim || loading || failed) return;
  const url = MANNY.url || MANIFEST?.files['lazy/Bewegungen']?.url, body = MANNY.body || MANIFEST?.files['lazy/Skelett']?.url;
  if (!url || !body) { failed = true; console.warn('Spielerfigur: lazy/Bewegungen oder lazy/Skelett fehlt in der Paketliste – es bleibt beim Soldaten'); return; }
  loading = true;
  new MannyAnimator().load(url, undefined, body).then((a: any) => {
    a.model.traverse((o: any) => { o.userData.sh = false; o.userData.shared = true; });
    fig = new Figur(a.model); fig.onChange = () => { st.layer = -1; };      // neue Netze: Zeichenebene neu setzen
    anim = a; loading = false; dress();
    console.info(`Spielerfigur geladen: ${a.clips.names.length} Bewegungen, Analyse ${a.analyseMs} ms`);
  }).catch((e: unknown) => { failed = true; loading = false; console.warn('Spielerfigur nicht geladen – es bleibt beim Soldaten:', e); });
}

export interface MannyDrive {
  x: number; y: number; z: number; yaw: number; vx: number; vz: number; crouch?: boolean; air?: boolean;
  pitch?: number;                                    // Blick nach oben (+) / unten (−), rad: Kopf und Brust folgen (PoseLayers.js)
  dead?: boolean;                                    // gefallen: Sturz-Clip, bleibt liegen
  mx?: number; mz?: number;                          // Absicht: gewünschte Laufrichtung (Tasten) in Raumkoordinaten, 0/0 = stehen
  sprint?: boolean;                                  // Absicht: Sprinten gedrückt
  ground?: ((x: number, z: number) => number | null) | null;   // Bodenhöhe im Raum der Figur (Rampen, Stufen, Gelände)
  // Waffe in der Hand (null / fehlt = unbewaffnet): id = Modell (mineArt WDEFS), aim = im Anschlag, shots / hits = Zähler (eine Änderung
  // löst Rückstoß bzw. Zucken aus), reload = Fortschritt des Nachladens 0..1, sonst −1
  // lyra: statt des Modells id eine der drei Waffen aus dem Lyra-Paket (mit eigenen Knochen: Verschluss, Magazin)
  // weg: nicht in der Hand; mit koerper hängt sie dann in ihrer Halterung am Körper (Rücken, Oberschenkel; WeaponLayer.js HOLSTER),
  // versteckt: dort gerade nicht zu sehen (im Sitzen)
  weapon?: { id: string; lyra?: LyraKind; aim: boolean; shots: number; hits: number; reload: number; toss?: number; weg?: boolean; koerper?: boolean; versteckt?: boolean } | null;      // toss: Zähler der Granatwürfe
  fp?: boolean;                                      // Ich-Sicht: die Kamera sitzt im Kopf (danach mannyFirstPerson mit der Kamera aufrufen)
  aimAt?: THREE.Vector3 | null;                      // Zielpunkt in der Welt (wohin das Fadenkreuz zeigt): der Lauf wird darauf gerichtet (fitGun)
  vorFit?: () => void;                               // was die Haltung noch ändert, bevor der Lauf ausgerichtet wird (seitlich lehnen, lehnen.ts)
}
// Welche Haltung zu welcher Waffe gehört und wo die linke Hand greift (grip): Anteil der Strecke Griff → Mündung und Höhe unter der
// Laufachse in Metern. Pistolen: beide Hände am Griff, wie der Clip sie hält. Gemessen am 23.11.2026 im Testfenster an der Figur.
// Die Waffen des Spiels haben ihren Nullpunkt am Griff, aber verschieden hoch (Lauf 3 bis 11 cm darüber). Lyras Haltungen gehen von
// einer Waffe aus, deren Lauf rund 9 cm über der Handfläche liegt (BORE): Jede Waffe wird so weit verschoben, dass ihr Lauf dort liegt
// (Pistolen nur zu 70 %, ihr Griff ist kürzer) – dann sitzt der Griff in der Hand und das Visier vor dem Auge.
type Kind = 'rifle' | 'pistol' | 'shotgun';
export type MannyKind = Kind;
const HOLD: Record<string, { kind: Kind; grip?: [number, number] }> = {
  ar39: { kind: 'rifle', grip: [0.42, -0.058] }, k12: { kind: 'rifle', grip: [0.5, -0.05] }, ig3: { kind: 'rifle', grip: [0.42, -0.05] },
  smg: { kind: 'rifle', grip: [0.45, -0.05] }, ef2: { kind: 'shotgun', grip: [0.6, -0.045] }, p9: { kind: 'pistol' }, sw: { kind: 'pistol' },
};
const BORE: Record<Kind, number> = { rifle: 0.0893, pistol: 0.0837, shotgun: 0.0995 };      // Höhe der Mündung über dem Waffenknochen (lyra.json, sockets.Muzzle)
const GRIP_LEFT = 0.07;                                         // die linke Hand (Handgelenk) liegt so weit links neben der Laufachse
// Lyras Waffen (lyraGuns.ts): Modell im Rahmen des Waffenknochens, mit eigenen Clips für Verschluss und Magazin. Eine Kopie je Art für die Hand der Figur.
const handGuns: Partial<Record<LyraKind, LyraGun>> = {};
const lyraGun = (kind: LyraKind) => handGuns[kind] || (handGuns[kind] = makeLyraGun(kind) || undefined) || null;
// sight: Punkt auf der Visierlinie im Raum des Waffenmodells (beim Zielen in der Ich-Sicht rückt er vor das Auge)
export interface GunState { id: string; g: THREE.Object3D | null; muzzle: THREE.Vector3; shown: boolean; lyra: LyraGun | null; sight: THREE.Vector3; fwd: THREE.Vector3; fit: boolean }      // fit: für die Halterung am Körper vermessen (fitHolder)
export const newGun = (): GunState => ({ id: '', g: null, muzzle: new THREE.Vector3(), shown: false, lyra: null, sight: new THREE.Vector3(), fwd: new THREE.Vector3(0, 0, -1), fit: false });
const gun = newGun();
function setGun(id: string, lyra?: LyraKind) { mountGun(anim, gun, id, lyra, lyraGun); }
/** Haltung (Art der Clips) zu einem Waffenmodell */
export const weaponKind = (id: string, lyra?: LyraKind): Kind => (lyra ? LYRA_HALT[lyra] : (HOLD[id] || HOLD.k12).kind);
/**
 * Waffe id (bzw. Lyras Waffe lyra) in die Hand einer Figur legen: an = ihr Animator, gs = ihr Waffenstand, pick = woher Lyras Modelle
 * kommen (jede Figur braucht eigene Kopien). Auch für Mitspieler und Wachen (fremdFigur.ts).
 */
export function mountGun(an: any, gs: GunState, id: string, lyra: LyraKind | undefined, pick: (k: LyraKind) => LyraGun | null) {
  const gun = gs;
  if (!an?.weapon) return;
  // Lyras Modell, sobald es geladen ist; bis dahin (und wenn es fehlt) das Modell des Spiels
  const lg = lyra ? pick(lyra) : null, key = lg ? 'lyra:' + lyra : id;
  if (gun.id === key) { if (!gun.fit && gun.g) gun.fit = fitHolder(an, gun.g); return; }      // noch nicht vermessen: Die Netze der Spielwaffen stehen erst im Bild nach dem Anlegen
  if (lg) {
    gun.g?.removeFromParent();
    gun.id = key; gun.g = lg.g; gun.lyra = lg; gun.muzzle.set(...LYRA_SPEC[lyra!].muzzle); lg.shots = -1;
    gun.sight.set(0, 0, -LYRA_SPEC[lyra!].ads[1]); gun.fwd.set(1, 0, 0);      // Rahmen der Waffe: x = Lauf, z = oben
    an.weapon.mount.add(lg.g); an.weapon.grip = null;      // die Haltungen sind für diese Waffen gemacht: beide Hände wie im Clip
    gun.fit = fitHolder(an, lg.g);
    return;
  }
  const w = buildHandWeapon(id); if (!w) return;               // Vorlage noch nicht geladen: im nächsten Bild wieder
  gun.g?.removeFromParent();
  gun.id = id; gun.g = w.g; gun.lyra = null; gun.muzzle.copy(w.muzzle); gun.fwd.set(0, 0, -1);
  // Visierlinie der Waffen des Spiels: knapp über ihrem höchsten Punkt (Zielfernrohr, Kimme), am Griff
  gun.sight.set(0, Math.max(w.muzzle.y + 0.036, new THREE.Box3().setFromObject(w.g).max.y + 0.012), 0);
  an.weapon.socket.add(w.g);
  const h = HOLD[id] || HOLD.k12, L = -w.muzzle.z, up = (BORE[h.kind] - w.muzzle.y) * (h.kind === 'pistol' ? 0.7 : 1);
  w.g.position.set(0, up, 0);
  an.weapon.grip = h.grip ? new THREE.Vector3(-GRIP_LEFT, w.muzzle.y + h.grip[1] + up, -L * h.grip[0]) : null;
  gun.fit = fitHolder(an, w.g);
}
// Halterung am Körper (WeaponLayer.js HOLSTER): Langwaffen liegen dort mit dem Kolbenende und der Oberkante an einem festen Punkt. Dafür
// die Ausdehnung des Modells im Rahmen des Waffenknochens (x = Lauf, z = oben; Ursprung am Griff).
const _hb = new THREE.Box3(), _hb2 = new THREE.Box3(), _hm = new THREE.Matrix4(), _hi = new THREE.Matrix4();
function fitHolder(an: any, g: THREE.Object3D): boolean {
  const frame = an.weapon.mount as THREE.Object3D;
  frame.updateWorldMatrix(true, false); frame.updateMatrixWorld(true);      // updateMatrixWorld: nur dort stellt three die Bindung der Netze mit Knochen nach
  _hi.copy(frame.matrixWorld).invert(); _hb.makeEmpty();
  g.traverse((o: any) => {
    if (!o.isMesh || !o.geometry) return;
    let bb: THREE.Box3 | null;
    // Netze mit Knochen (Lyras Waffen): Knochenlage dieses Bildes, sonst rechnet three mit der Lage vor dem Umhängen
    if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); bb = o.boundingBox; }
    else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bb = o.geometry.boundingBox; }
    if (bb) _hb.union(_hb2.copy(bb).applyMatrix4(_hm.multiplyMatrices(_hi, o.matrixWorld)));
  });
  if (_hb.isEmpty() || !isFinite(_hb.min.x) || !isFinite(_hb.max.z)) return false;
  an.weapon.setFit(_hb.min.x, _hb.max.z);
  return true;
}
// Lauf auf den Zielpunkt (seit 2026-11-27): Lyras Haltungen und Zielversätze richten die Waffe nur ungefähr nach dem Blick, um einige Grad
// daneben, und sie wissen nichts davon, dass die Kamera der Außensicht neben der Figur steht. Nach den Haltungen wird deshalb die Brust
// (FIT.bone, mit Armen und Waffe daran) so weit gedreht, dass der Lauf vom Ort der Mündung genau auf den Zielpunkt zeigt – dann liegt die
// Leuchtspur in der Verlängerung des Laufs. Der Hals dreht zurück, der Kopf bleibt beim Blick. Zwei Durchgänge: Die Drehung um die Brust
// verschiebt auch die Mündung. max: größte Korrektur (rad); mehr heißt, dass die Waffe gerade woanders ist (Drehen auf der Stelle).
// w: Anteil (WeaponLayer.fitW: nicht beim Tragen, Nachladen, Werfen). In der Ich-Sicht beim Zielen übernimmt mannyFirstPerson.
export const FIT = { on: true, bone: 'spine_04', max: 0.6, last: 0 };
let fitBone: THREE.Object3D | null = null, fitNeck: THREE.Object3D | null = null;
const _fq = new THREE.Quaternion(), _fp = new THREE.Quaternion(), _fs = new THREE.Quaternion(), _fi = new THREE.Quaternion(), _fb = new THREE.Vector3(), _fm = new THREE.Vector3();
function turnWorld(b: THREE.Object3D, q: THREE.Quaternion) {      // Knochen um q drehen (Drehung in Weltachsen)
  b.parent!.getWorldQuaternion(_fp); b.getWorldQuaternion(_fs);
  b.quaternion.copy(_fp.invert().multiply(_fi.copy(q).multiply(_fs))); b.updateMatrixWorld(true);
}
function fitGun(at: THREE.Vector3, w: number) {
  FIT.last = 0;
  if (!FIT.on || w < 0.002 || !gun.g) return;
  const model = anim.model as THREE.Object3D;
  const bone = fitBone || (fitBone = model.getObjectByName(FIT.bone) || null), neck = fitNeck || (fitNeck = model.getObjectByName('neck_01') || null);
  if (!bone || !bone.parent) return;
  for (let i = 0; i < 2; i++) {
    _fb.copy(gun.fwd).transformDirection(gun.g.matrixWorld);
    gun.g.localToWorld(_fm.copy(gun.muzzle)); if (st.fp) _fm.add(fpShift);      // Ich-Sicht: die Figur wird nach der Kamera noch verschoben (wie im letzten Bild)
    _fm.subVectors(at, _fm); if (_fm.lengthSq() < 0.25) return; _fm.normalize();
    const ang = _fb.angleTo(_fm); if (ang < 1e-4) return;
    _fq.setFromUnitVectors(_fb, _fm);
    const k = w * Math.min(1, FIT.max / ang);
    if (k < 0.999) _fq.copy(_fi.identity().slerp(_fq, k));
    if (i === 0) FIT.last = ang;
    turnWorld(bone, _fq);
    if (neck && !st.fp) turnWorld(neck, _fq.invert());
  }
}
/** Mündung der Waffe in der Hand der Figur (Weltkoordinaten); false, solange die Figur keine Waffe zeigt */
export function mannyMuzzle(out: THREE.Vector3): boolean {
  if (!gun.shown || !gun.g || !anim?.weapon?.mount.visible || !anim.weapon.inHand) return false;
  gun.g.updateWorldMatrix(true, false);
  gun.g.localToWorld(out.copy(gun.muzzle));
  if (st.fp && anim.model.position.lengthSq() < 1e-8) out.add(fpShift);      // Ich-Sicht: die Figur steht in diesem Bild noch unverschoben (die Kamera kommt erst)
  return true;
}
const st = { lastY: 0, lx: 0, lz: 0, air: false, first: true, blocked: 0, fp: false, layer: 0 };
/** ist die Figur geladen und eingeschaltet? (dann zeigt auch die Ich-Sicht den ganzen Körper) */
export const mannyReady = () => MANNY.on && !!anim && dress();
// Ich-Sicht: Wo der Halsansatz (neck_01) relativ zum Auge liegt, im Raum der Kamera: back dahinter, down darunter. Die Kamera neigt sich
// mit dem Blick um den Hals wie ein Kopf – beim Blick nach unten wandert sie über die Brust, man sieht Bauch, Beine und Füße.
// Unreals Vorlage zieht dafür die Wirbelsäule zurück und bindet den Kopf an die Kamera; hier wird die ganze Figur verschoben (die Füße
// weichen dabei um wenige Zentimeter vom Boden ab) und der Kopf ausgeblendet.
// adsFwd: beim Zielen rückt das Auge so weit an die Kimme heran (m), damit nicht der Schaft das Bild füllt
export const FP = { back: 0.075, down: 0.165, ads: 1, adsFwd: 0.02 };
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _b = new THREE.Vector3();
const _h = new THREE.Vector3(), _d = new THREE.Vector3(), _t = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Vector3();
let headBone: THREE.Object3D | null = null, neckBone: THREE.Object3D | null = null;
const fpShift = new THREE.Vector3();      // um so viel hat die Ich-Sicht die Figur im letzten Bild verschoben (Welt)
function setLayer(l: number) { if (st.layer === l || !anim) return; st.layer = l; anim.model.traverse((o: THREE.Object3D) => o.layers.set(l)); }
/**
 * Ich-Sicht mit ganzem Körper: nach driveManny (mit fp) und nachdem die Kamera dieses Bildes steht. Schiebt die Figur so, dass ihr Kopf an
 * der Kamera sitzt, blendet den Kopf aus und legt die Figur auf die Körper-Ebene (eigener Durchgang, engine.ts bodyPass).
 * aim 0..1: Beim Zielen rückt die Visierlinie der Waffe vor das Auge. Gibt false zurück, wenn die Figur gerade nicht so gezeigt wird.
 */
export function mannyFirstPerson(cam: THREE.Camera, aim = 0): boolean {
  if (!anim || !st.fp || !anim.model.parent || !anim.model.parent.visible) return false;
  const model = anim.model as THREE.Object3D, holder = model.parent!, head = headBone || (headBone = model.getObjectByName('head') || null);
  if (!head) return false;
  head.scale.setScalar(0.001);                                  // Kopf weg (Haut und Haare hängen an diesem Knochen); der Animator setzt ihn im nächsten Bild zurück
  holder.updateWorldMatrix(true, false); model.updateMatrixWorld(true); cam.updateMatrixWorld();
  cam.getWorldDirection(_d);
  // Anteil: die Zielhaltung der Figur selbst (WeaponLayer.aimW). Mit dem Zoom der Kamera (aim) allein stand die Waffe im Kampf in der
  // Zielhaltung vor dem Auge, ohne dass Kimme und Korn auf der Blickachse lagen.
  aim = Math.max(aim, anim.weapon?.ready ? anim.weapon.aimW * anim.weapon.w : 0);
  aim = aim * aim * (3 - 2 * aim);
  const ads = aim > 0.001 && gun.shown && !!gun.g;
  // Zielen: Der Lauf zeigt in den Haltungen nur ungefähr in Blickrichtung (wenige Grad daneben). Die ganze Figur so weit drehen, dass er genau
  // dorthin zeigt – sonst stehen Kimme und Korn nicht hintereinander.
  if (ads) {
    _b.copy(gun.fwd).transformDirection(gun.g!.matrixWorld);
    if (_b.dot(_d) > 0.8) {
      _q.setFromUnitVectors(_b, _d); _q2.identity().slerp(_q, aim);
      holder.getWorldQuaternion(_q); model.quaternion.premultiply(_q.clone().invert().multiply(_q2).multiply(_q));
      model.updateMatrixWorld(true);
    }
  } _t.set(_d.x, 0, _d.z); if (_t.lengthSq() < 1e-6) _t.set(0, 0, -1); _t.normalize();
  (neckBone || (neckBone = model.getObjectByName('neck_01') || head)).getWorldPosition(_h);
  // Halsansatz hinter und unter das Auge, im Raum der Kamera (sie blickt nach −z)
  _m.set(0, -FP.down, FP.back).applyQuaternion(cam.getWorldQuaternion(_q)).add(_s.setFromMatrixPosition(cam.matrixWorld)).sub(_h);
  // Zielen: Visier auf die Blickachse (nur der Anteil quer zur Blickrichtung)
  if (ads) {
    _m.addScaledVector(_d, -FP.adsFwd * aim);
    gun.g!.localToWorld(_s.copy(gun.sight)).add(_m);
    _s.subVectors(_h.setFromMatrixPosition(cam.matrixWorld), _s); _s.addScaledVector(_d, -_s.dot(_d));
    _m.addScaledVector(_s, aim * FP.ads);
  }
  fpShift.copy(_m);
  model.getWorldPosition(_h).add(_m); holder.worldToLocal(_h); model.position.copy(_h);
  model.updateMatrixWorld(true);
  if (gun.g && st.layer === BODY_LAYER && gun.g.layers.mask !== (1 << BODY_LAYER)) st.layer = 0;      // neue Waffe in der Hand: Ebene neu setzen
  setLayer(BODY_LAYER);
  bodyPass.on = true;
  return true;
}
const _mv = new THREE.Vector2(), _vel = new THREE.Vector2();
// Bremsweg der Spielphysik nach dem Loslassen: Das Tempo fällt in allen drei Laufstellen mit rund 12–13 pro Sekunde
// (interior.ts 12, onfoot.ts und dungeon.ts 13), der Rest des Wegs ist also Tempo × 0,08 s.
const STOP_TAU = 0.08;
/** Bremsrate der Spielphysik nach dem Loslassen (1/s): mit Manny weicher, damit die Stopp-Bewegung Platz für ihren letzten Schritt hat */
/** Anlaufrate der Spielphysik (1/s): mit Manny auf Wunsch weicher (MANNY.accel), sonst der Wert der Laufstelle */
export const mannyAccel = (base: number) => (MANNY.on && !MANNY.alt && anim && MANNY.accel > 0 ? MANNY.accel : base);
/** Anteil der Anlaufrate t Sekunden nach einem Richtungswechsel im Lauf (weicher Einsatz, damit der Setzschritt der Figur passt) */
export const mannyTurn = (t: number) => (MANNY.on && !MANNY.alt && anim && MANNY.turnRamp > 0 ? Math.min(1, MANNY.turnMin + (1 - MANNY.turnMin) * t / MANNY.turnRamp) : 1);
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
/** Animator der eigenen Figur als Vorlage für fremde Figuren (fremdFigur.ts: teilen sich Bewegungssatz und Analyse); null solange er lädt */
export function mannyBase(): any { if (!MANNY.on) return null; ensure(); return anim; }

/**
 * Manny statt des Soldaten zeigen. holder: die Gruppe der Spielerfigur (Position und Drehung body + π setzt avatar.ts),
 * soldier: das Modell des Soldaten darin (wird ausgeblendet). Gibt false zurück, solange Manny nicht bereit ist.
 */
export function driveManny(holder: THREE.Object3D, soldier: THREE.Object3D, dt: number, d: MannyDrive): boolean {
  if (!MANNY.on) return false;
  ensure();
  if (!anim || !dress()) return false;      // solange Skelett oder Körper noch laden: Soldat
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
  st.fp = !!d.fp && !d.dead;
  if (!st.fp) setLayer(0);                                      // Außensicht: wieder im Hauptbild
  const wp = d.dead ? null : d.weapon || MANNY.test;
  if (wp) setGun(wp.id, wp.lyra);
  // shown: die Waffe ist in der Hand (Stand der Waffenschicht aus dem letzten Bild: beim Ziehen und Wegstecken wechselt sie mitten in der Bewegung)
  const hand = !!wp && !wp.weg;
  gun.shown = hand && !!gun.g && (gun.id === wp!.id || gun.id === 'lyra:' + wp!.lyra) && (anim.weapon?.ready && anim.weapon.holder ? anim.weapon.inHand : true);
  // Lyras Waffe bewegt sich selbst: Verschluss bei jedem Schuss, Magazin beim Nachladen (im Takt der Nachladebewegung der Figur)
  const LG = gun.shown ? gun.lyra : null;
  if (LG && wp) driveLyraGun(LG, wp.shots, wp.reload, dtc);
  if (anim.weapon?.ready) { const ht = halterTiefe(mannyHooks.tracht?.()); anim.weapon.setDepth(ht[0], ht[1]); }      // Halterung: über Weste und Rüstung
  anim.fpView = st.fp;      // Ich-Sicht: die Waffe sinkt weniger tief (WeaponLayer), sonst verschwindet sie aus dem Bild
  anim.lateAdd = true;      // Rückstoß und Zucken erst nach dem Ausrichten des Laufs (unten)
  const out = anim.update(dtc, {
    moveDir: _mv, gait, crouch: !!d.crouch, strafe: true, facing: face, style: mannyHooks.relaxed?.() && !hand ? 'relaxed' : 'neutral',
    jump, grounded: !air, verticalSpeed: vy, look: { pitch: d.pitch || 0 }, dead: !!d.dead,
    weapon: wp ? { kind: weaponKind(wp.id, wp.lyra), aim: wp.aim && hand, shots: wp.shots, hits: wp.hits, reload: hand ? wp.reload : -1, toss: wp.toss, hand, body: !!wp.koerper, hide: !!wp.versteckt } : null,
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
  // Waffe: Lauf auf den Zielpunkt, dann Rückstoß und Zucken darauf (WeaponLayer.additive); danach die Weltlage des Oberkörpers neu
  const WL = anim.weapon;
  if (d.vorFit) { d.vorFit(); if (WL) WL.B[0].updateMatrixWorld(true); }
  if (WL && WL.ready) {
    if (gun.shown && d.aimAt && !d.dead) fitGun(d.aimAt, WL.fitW * (st.fp ? 1 - WL.aimW : 1));
    WL.additive(); WL.B[0].updateMatrixWorld(true);
  }
  // Füße: im Raum der Figur festhalten (ein fliegendes Schiff nimmt sie mit) und dem Boden unter ihnen folgen
  anim.finalize(dtc, { space: room ? room.matrixWorld : null, ground: d.ground || null, baseY: d.y });
  return true;
}
/** Manny aus dem Halter nehmen (Schalter aus oder Figur neu gebaut) */
export function releaseManny(soldier?: THREE.Object3D) {
  st.first = true; gun.shown = false; st.fp = false; setLayer(0);
  if (anim?.model.parent) anim.model.removeFromParent();
  if (soldier) soldier.visible = true;
}
/** nur für Prüfskripte: Körper und Ausrüstung der eigenen Figur */
export const mannyFigur = () => fig;
