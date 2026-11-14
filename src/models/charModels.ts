import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// KI-generierte Figuren mit Skelett (GLB-Dateien aus public/assets/char): 'worker' mit Laufanimation, 'merchant' mit Stand-Animation.
// Beide Skelette stammen aus demselben Rigging-Dienst und haben gleiche Knochennamen, daher passen die Clips auf beide.

interface Tpl { scene: THREE.Group; clips: THREE.AnimationClip[]; scale: number; footY: number }
const TPL: Record<string, Tpl> = {};
const HEIGHT: Record<string, number> = { worker: 1.8, merchant: 1.7, achterberg: 1.72, mechaniker: 1.78, lagerarbeiter: 1.86, hollweg: 1.86, roth: 1.72, tamm: 1.7, kessler: 1.8, brandt: 1.76, krull: 1.66 };
// Zwei Skelett-Familien, jeweils mit einem Vorbild, dessen Bewegungen die anderen mitnutzen (solange es keine eigenen gibt):
// 1. Händler (24 Knochen): Mechaniker und Lagerarbeiter aus Blender tragen sein Skelett in derselben Grundhaltung.
// 2. Tamm (53 Knochen mit Fingern, seit Alpha 1.07): Die Figuren von Tripo haben in Blender einheitliche Knochenachsen und Mixamos T-Haltung
//    bekommen (tripo_to_mixamo, siehe docs/assets.md). Stehen und Gehen kommen unverändert aus dem Mixamo-Paket, das für Tamm geladen wurde;
//    Sprechen ist von den Händler-Dateien übertragen. Anlaufen und Abbremsen gibt es für diese Familie noch nicht (animStep blendet dann direkt).
const RIG_OF: Record<string, string> = { mechaniker: 'merchant', lagerarbeiter: 'merchant', achterberg: 'tamm', hollweg: 'tamm', roth: 'tamm', kessler: 'tamm', brandt: 'tamm', krull: 'tamm' };
const clipKey = (name: string, kind: string) => (EXTRA[name + '_' + kind] || !RIG_OF[name] ? name : RIG_OF[name]) + '_' + kind;
// Zusätzliche Bewegungen aus FBX-Dateien (scripts/fbx-anim.mjs → asset-src/data/anim_<figur>_<art>.json), z. B. merchant_idle.
// Sie sind auf das Skelett genau dieser Figur umgerechnet und ersetzen deren eingebaute Bewegung.
const EXTRA: Record<string, THREE.AnimationClip> = {};
// Zusatzangaben je Clip: mittleres Tempo (m/s), Tempo je Bild bei Clips auf der Stelle, zweiter Einstiegspunkt
interface ClipMeta { fps: number; pace: number; inplace?: boolean; speed?: number[]; alt?: number }
const META: Record<string, ClipMeta> = {};
async function loadExtraClips() {
  const files = ((window as any).DATAFILES || {}) as Record<string, string>;
  await Promise.all(Object.entries(files).filter(([k]) => k.startsWith('anim_')).map(async ([k, url]) => {
    try {
      const j = await (await fetch(url)).json(), clip = THREE.AnimationClip.parse(j);
      clip.uuid = THREE.MathUtils.generateUUID();   // die Datei trägt keine Kennung; ohne eigene hält der Mischer alle Clips für denselben
      EXTRA[k.slice(5)] = clip; if (j.meta) META[k.slice(5)] = j.meta;
    }
    catch (e) { console.warn('Bewegung nicht geladen:', k, e); }
  }));
}

export async function loadCharModels() {
  const data = window.CHARDATA;
  if (!data) return false;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  await Promise.all([loadExtraClips(), ...Object.entries(data).map(async ([name, url]) => {
    try {
      const g = await loader.loadAsync(url);
      g.scene.traverse((o: any) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;   // Skinning verschiebt die Hülle, Bounding-Box stimmt sonst nicht
        const m = o.material as THREE.MeshStandardMaterial;
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        m.envMapIntensity = 0.3;
        m.metalness = Math.min(m.metalness, 0.2);
      });
      // Lage des Skelett-Objekts aus der Quelldatei nicht mitnehmen: Von Alpha 1.02 bis 1.05 standen die Tripo-Figuren um ihren Platz in der
      // Blender-Reihe (bis 6,65 m) neben ihrem Standort. Der Export stellt sie jetzt in den Ursprung; das hier fängt es zusätzlich ab.
      for (const c of g.scene.children) { c.position.x = 0; c.position.z = 0; }
      g.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g.scene), h = box.max.y - box.min.y || 1;
      const scale = (HEIGHT[name] || 1.75) / h;
      TPL[name] = { scene: g.scene, clips: g.animations, scale, footY: -box.min.y * scale };
    } catch (e) { console.warn('Figur nicht geladen:', name, e); }
  })]);
  return Object.keys(TPL).length > 0;
}
export const hasChar = (name: string) => !!TPL[name];

const clipOf = (kind: 'walk' | 'idle', name: string) => {
  if (EXTRA[clipKey(name, kind)]) return EXTRA[clipKey(name, kind)];   // eigene Bewegung dieser Figur (oder die ihres Skelett-Vorbilds)
  const own = kind === 'walk' ? TPL.worker : TPL.merchant;
  return own?.clips[0] || null;
};
// Geliehene Bewegungen an die Beinlänge anpassen: Die Hüftspur eines Clips steht in der Höhe des Vorbilds (Händlerin, 97 cm).
// Bei einer größeren Figur mit gleichem Skelett würde die Hüfte zu tief sitzen und die Knie knickten ein.
const hipRest = (name: string) => { let y = 0; TPL[name]?.scene.traverse(o => { if (o.name === 'Hips') y = o.position.y; }); return y; };
const hipScale = (name: string) => { const src = RIG_OF[name]; const a = hipRest(name), b = src ? hipRest(src) : 0; return a && b ? a / b : 1; };
const FITTED: Record<string, THREE.AnimationClip> = {};
function fit(clip: THREE.AnimationClip | null, name: string) {
  const k = hipScale(name);
  if (!clip || Math.abs(k - 1) < 0.004) return clip;
  const key = name + '|' + clip.uuid;
  if (!FITTED[key]) {
    const c = clip.clone(); c.uuid = THREE.MathUtils.generateUUID();
    for (const tr of c.tracks) if (tr.name === 'Hips.position') tr.values = tr.values.map(v => v * k);
    FITTED[key] = c;
  }
  return FITTED[key];
}
// Eine Figur: Gruppe (Füße auf y=0, Blick nach +Z), Mixer und je eine Aktion fürs Laufen und Stehen
export function charInstance(name: string, tint: number | [number, number, number] = 1) {
  const t = TPL[name];
  const obj = SkeletonUtils.clone(t.scene) as THREE.Group;
  obj.scale.setScalar(t.scale);
  obj.position.y = t.footY;
  // Einfärben: Zahl = heller/dunkler, Dreier = Farbton (für Story-Figuren)
  if (tint !== 1) obj.traverse((o: any) => { if (o.isMesh) { o.material = o.material.clone(); if (Array.isArray(tint)) o.material.color.multiply(new THREE.Color(tint[0], tint[1], tint[2])); else o.material.color.multiplyScalar(tint); } });
  const g = new THREE.Group(); g.add(obj);
  const mixer = new THREE.AnimationMixer(obj);
  const w = fit(clipOf('walk', name), name), i = fit(clipOf('idle', name), name);
  const walk = w ? mixer.clipAction(w) : null, idle = i ? mixer.clipAction(i) : null;
  // Ablaufsteuerung (animStep): eigene Clips dieser Figur für Anlaufen, Abbremsen und Sprechen, falls vorhanden
  const act = (k: string) => (EXTRA[clipKey(name, k)] ? mixer.clipAction(fit(EXTRA[clipKey(name, k)], name)!) : null);
  // zweite Spur des Stehens: läuft beim Gehen leise mit und verkürzt so die Schritte (siehe animStep)
  let under: THREE.AnimationAction | null = null;
  if (i && w) { const c = i.clone(); c.uuid = THREE.MathUtils.generateUUID(); under = mixer.clipAction(c); under.setEffectiveWeight(0); under.play(); }
  let neck: THREE.Object3D | null = null, head: THREE.Object3D | null = null;
  obj.traverse(o => { if (o.name === 'neck') neck = o; else if (o.name === 'Head') head = o; });
  const anim: CharAnim = {
    under, underW: 0, root: g, neck, head, look: null, lookYaw: 0, lookPitch: 0, lookMem: [0, 1].map(() => ({ base: new THREE.Quaternion(), out: new THREE.Quaternion() })), lookOn: false,
    mixer, idle, walk, start: act('start'), stop: act('stop'), talk: [act('talk1'), act('talk2')].filter(Boolean) as THREE.AnimationAction[],
    mode: 'idle', cur: null, talkT: 0, talkI: 0,
    pace: (META[clipKey(name, 'walk')]?.pace || 1.4) * hipScale(name), mStart: META[clipKey(name, 'start')] || null, mStop: META[clipKey(name, 'stop')] || null,
  };
  return { g, mixer, walk, idle, anim, mats: [] as THREE.Material[] };
}

// ---------- Ablauf: Stehen → Anlaufen → Gehen → Abbremsen → Stehen, dazwischen Sprechen ----------
export interface CharAnim {
  mixer: THREE.AnimationMixer; idle: THREE.AnimationAction | null; walk: THREE.AnimationAction | null;
  start: THREE.AnimationAction | null; stop: THREE.AnimationAction | null; talk: THREE.AnimationAction[];
  mode: 'idle' | 'start' | 'walk' | 'stop' | 'talk'; cur: THREE.AnimationAction | null;
  talkT: number; talkI: number;   // verbleibende Sprechzeit (s), nächster Sprech-Clip
  pace: number;                   // Tempo der Gehschleife in m/s bei normaler Abspielgeschwindigkeit
  under: THREE.AnimationAction | null; underW: number;   // Stehen als Unterlage beim Gehen und sein Gewicht
  root: THREE.Object3D; neck: THREE.Object3D | null; head: THREE.Object3D | null;
  look: THREE.Vector3 | null;     // Punkt (Welt), dem der Kopf nachblickt, solange er nah und vor der Figur liegt; null = geradeaus
  lookYaw: number; lookPitch: number;
  lookMem: { base: THREE.Quaternion; out: THREE.Quaternion }[]; lookOn: boolean;   // je Knochen: Haltung aus dem Clip und zuletzt geschriebene Haltung
  mStart: ClipMeta | null; mStop: ClipMeta | null;
}
function fade(a: CharAnim, to: THREE.AnimationAction | null, dur: number, at = 0, once = false) {
  if (!to || a.cur === to) return;
  to.reset(); to.time = at; to.timeScale = 1;
  to.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity); to.clampWhenFinished = once;
  to.play();
  if (a.cur) a.cur.crossFadeTo(to, dur, false);
  a.cur = to;
}
const profile = (m: ClipMeta | null, t: number, fallback: number) => {
  if (!m || !m.speed) return fallback;
  return m.speed[Math.min(m.speed.length - 1, Math.max(0, Math.round(t * m.fps)))];
};
// Erste Haltung setzen (zufälliger Zeitpunkt, damit nicht alle Figuren im Gleichschritt atmen oder gehen)
export function animInit(a: CharAnim, moving: boolean) {
  const to = moving ? a.walk || a.idle : a.idle || a.walk;
  if (!to) return;
  to.reset(); to.time = Math.random() * to.getClip().duration; to.play();
  a.cur = to; a.mode = moving && a.walk ? 'walk' : 'idle';
}
export function animTalk(a: CharAnim, seconds: number) { if (a.talk.length) a.talkT = Math.max(a.talkT, seconds); }
// Pro Bild: move = die Figur soll gehen, speed = ihr Gehtempo in m/s. Rückgabe: das Tempo, mit dem sie sich in diesem Bild
// tatsächlich bewegen soll (beim Anlaufen und Abbremsen folgt es dem Clip, damit die Füße nicht rutschen).
// follow = false: Die Figur wird von außen bewegt (andere Piloten); dann wird nur weich zwischen Stehen und Gehen überblendet.
export function animStep(a: CharAnim, dt: number, move: boolean, speed = 1.4, follow = true): number {
  let v = 0, under = 0;
  if (a.talkT > 0) a.talkT -= dt;
  const t = a.cur ? a.cur.time : 0, len = a.cur ? a.cur.getClip().duration : 0;
  switch (a.mode) {
    case 'idle':
      if (move && a.walk) {
        if (follow && a.start) { fade(a, a.start, 0.25, 0, true); a.mode = 'start'; }
        else { fade(a, a.walk, 0.3); a.mode = 'walk'; }
      } else if (a.talkT > 0.6 && a.talk.length) { fade(a, a.talk[a.talkI++ % a.talk.length], 0.4, 0, true); a.mode = 'talk'; }
      break;
    case 'talk':
      if (move && a.walk) { a.talkT = 0; fade(a, a.idle, 0.3); a.mode = 'idle'; }
      else if (a.talkT <= 0 || t >= len - 0.45) {
        // Gebärde zu Ende: die nächste, solange noch gesprochen wird; sonst zurück ins ruhige Stehen
        if (a.talkT > 1.2 && a.talk.length > 1) fade(a, a.talk[a.talkI++ % a.talk.length], 0.45, 0, true);
        else if (a.talkT > 1.2) { a.cur = null; fade(a, a.talk[0], 0.45, 0, true); }
        else { fade(a, a.idle, 0.5); a.mode = 'idle'; }
      }
      break;
    case 'start':
      v = profile(a.mStart, t, speed * 0.5);
      if (!move) { fade(a, a.idle, 0.4); a.mode = 'idle'; }
      else if (t >= len - 0.22) { fade(a, a.walk, 0.22); a.mode = 'walk'; }
      break;
    case 'walk':
      v = speed;
      if (a.walk) {
        // Langsamer als der Clip: nicht in Zeitlupe abspielen, sondern Schrittlänge und Schrittfolge gleichmäßig verringern.
        // Die Schritte werden kürzer, indem das Stehen mit kleinem Gewicht mitläuft.
        const r = speed / a.pace, k = r < 1 ? Math.sqrt(Math.max(0.3, r)) : 1;
        a.walk.timeScale = r < 1 ? k : Math.min(3, r);
        under = r < 1 && follow ? (1 - k) / k : 0;
      }
      if (!move) {
        if (follow && a.stop && a.walk) {
          // Einstieg passend zum Fuß, der gerade in der Luft ist (Gehschleife: erst links, ab etwa einem Fünftel rechts)
          const ph = a.walk.time / a.walk.getClip().duration, alt = a.mStop?.alt || 0;
          fade(a, a.stop, 0.25, ph > 0.2 && ph < 0.7 ? alt : 0, true); a.mode = 'stop';
        } else { fade(a, a.idle, 0.3); a.mode = 'idle'; }
      }
      break;
    case 'stop':
      v = profile(a.mStop, t, 0);
      if (move && t < len * 0.4) { fade(a, a.walk, 0.3); a.mode = 'walk'; }
      else if (t >= len - 0.4) { fade(a, a.idle, 0.4); a.mode = 'idle'; }
      break;
  }
  if (a.under) { a.underW += (under - a.underW) * Math.min(1, dt * 4); a.under.setEffectiveWeight(a.underW < 0.002 ? 0 : a.underW); }
  a.mixer.update(dt);
  lookStep(a, dt);
  return v;
}
// Kopf und Hals drehen sich zum Ziel (nach der Bewegung des Clips, in Grenzen und weich)
const _lv = new THREE.Vector3(), _lr = new THREE.Quaternion(), _lp = new THREE.Quaternion(), _lq = new THREE.Quaternion(), _le = new THREE.Euler(0, 0, 0, 'YXZ');
function lookStep(a: CharAnim, dt: number) {
  if (!a.head) return;
  let yaw = 0, pitch = 0;
  if (a.look) {
    a.root.worldToLocal(_lv.copy(a.look));                     // Figur blickt nach +Z, steht auf y = 0
    const d = Math.hypot(_lv.x, _lv.z), y = Math.atan2(_lv.x, _lv.z);
    if (d > 0.4 && d < 7 && Math.abs(y) < 1.9) { yaw = Math.max(-1.05, Math.min(1.05, y)); pitch = Math.max(-0.35, Math.min(0.35, Math.atan2(_lv.y - 1.6, d))); }
  }
  const k = Math.min(1, dt * 3.2);
  a.lookYaw += (yaw - a.lookYaw) * k; a.lookPitch += (pitch - a.lookPitch) * k;
  const off = Math.abs(a.lookYaw) < 0.004 && Math.abs(a.lookPitch) < 0.004;
  if (off && !a.lookOn) return;
  a.root.getWorldQuaternion(_lr);
  const bones = [[a.neck, 0.4], [a.head, 0.6]] as [THREE.Object3D | null, number][];
  for (let i = 0; i < 2; i++) {
    const b = bones[i][0], f = bones[i][1], m = a.lookMem[i];
    if (!b || !b.parent) continue;
    // Der Mischer schreibt einen Knochen nur neu, wenn sich der Clip-Wert ändert. Steht er noch auf dem zuletzt hier
    // geschriebenen Wert, gilt die gemerkte Clip-Haltung – sonst würde sich die Blickdrehung Bild für Bild aufaddieren.
    if (a.lookOn && b.quaternion.equals(m.out)) b.quaternion.copy(m.base); else m.base.copy(b.quaternion);
    if (off) { m.out.copy(b.quaternion); continue; }
    // Drehung im Raum der Figur (um die Hochachse, dann nicken), umgerechnet in den Raum des Elternknochens
    _lq.setFromEuler(_le.set(-a.lookPitch * f, a.lookYaw * f, 0));
    _lq.premultiply(_lr).multiply(_lp.copy(_lr).invert());     // in die Welt
    b.parent.getWorldQuaternion(_lp);
    _lq.multiply(_lp).premultiply(_lp.clone().invert());       // in den Elternraum
    b.quaternion.premultiply(_lq);
    m.out.copy(b.quaternion);
  }
  a.lookOn = !off;
}
