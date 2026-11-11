// Bewegung aus einer FBX-Datei (z. B. von Mixamo) auf das Skelett unserer Figuren übertragen und als Animationsclip ablegen
// (asset-src/data/anim_<name>.json, im Spiel über window.DATAFILES und THREE.AnimationClip.parse).
//   node scripts/fbx-anim.mjs <datei.fbx>                       nur ansehen: Knochen, Clips, Zuordnung
//   node scripts/fbx-anim.mjs <datei.fbx> <name> [figur] [fps] [align]  schreiben; figur (Vorgabe merchant) liefert das Zielskelett
// align: nur angeben, wenn die FBX auf einem FREMDEN Körper beruht (z. B. der Mixamo-Standardfigur in T-Haltung). Wurde
// unsere eigene Figur bei Mixamo hochgeladen, steht die Hülle in beiden Skeletten gleich da: dann darf Schritt 1 nicht laufen,
// sonst würden Füße und Arme um den Unterschied der Gelenklagen verdreht.
// Verfahren: Die Skelette haben verschiedene Knochennamen, Längen und Grundhaltungen. Je Knochen wird deshalb
//  1. die Grundhaltung angeglichen (kleinste Drehung, die die Richtung des Zielknochens auf die des Quellknochens legt),
//  2. die Drehung der Quelle gegenüber ihrer Grundhaltung im Weltraum darauf angewendet,
//  3. das Ergebnis in die Knochenkette der Figur zurückgerechnet.
// Die Hüfte wandert mit (auf die Größe der Figur umgerechnet); Finger hat unsere Figur nicht, sie entfallen.
import fs from 'fs';
globalThis.self = globalThis; globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, style: {} }), createElement: () => ({ getContext: () => null, style: {} }) };
const THREE = await import('three');
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
const { io } = await import('./glb-lib.mjs');

const [, , inp, name, figure = 'merchant', fpsArg = '20', alignArg = ''] = process.argv;
const ALIGN = alignArg === 'align';
const FPS = +fpsArg;
// Zielknochen → Quellknochen (ohne Vorsilbe "mixamorig") und der Kindknochen, der die Richtung angibt
const MAP = {
  Hips: ['Hips', 'Spine02'], Spine02: ['Spine', 'Spine01'], Spine01: ['Spine1', 'Spine'], Spine: ['Spine2', 'neck'], neck: ['Neck', 'Head'], Head: ['Head', 'head_end'],
  LeftShoulder: ['LeftShoulder', 'LeftArm'], LeftArm: ['LeftArm', 'LeftForeArm'], LeftForeArm: ['LeftForeArm', 'LeftHand'], LeftHand: ['LeftHand', null],
  RightShoulder: ['RightShoulder', 'RightArm'], RightArm: ['RightArm', 'RightForeArm'], RightForeArm: ['RightForeArm', 'RightHand'], RightHand: ['RightHand', null],
  LeftUpLeg: ['LeftUpLeg', 'LeftLeg'], LeftLeg: ['LeftLeg', 'LeftFoot'], LeftFoot: ['LeftFoot', 'LeftToeBase'], LeftToeBase: ['LeftToeBase', null],
  RightUpLeg: ['RightUpLeg', 'RightLeg'], RightLeg: ['RightLeg', 'RightFoot'], RightFoot: ['RightFoot', 'RightToeBase'], RightToeBase: ['RightToeBase', null],
};
const SRC_CHILD = { head_end: 'HeadTop_End' };   // Zielkind → Quellkind, wo die Namen nicht über MAP laufen
const clean = n => n.replace(/^.*[:|]/, '').replace(/^mixamorig/, '');

// ---------- Quelle ----------
const buf = fs.readFileSync(inp);
const warn = console.warn; console.warn = () => {};
const fbx = new FBXLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '');
console.warn = warn;
const S = {}; let skinned = null;
fbx.traverse(o => { if (o.isBone) S[clean(o.name)] = o; if (o.isSkinnedMesh && !skinned) skinned = o; });
console.log(`Quelle: ${Object.keys(S).length} Knochen, ${skinned ? 'mit' : 'ohne'} Hülle`);
for (const c of fbx.animations) console.log(`  Clip "${c.name}": ${c.duration.toFixed(2)} s, ${c.tracks.length} Spuren`);

// ---------- Ziel: Skelett der Figur als Objektbaum ----------
const doc = await io.read(`assets/chars/${figure}.glb`);
const T = {}, order = [];
const build = (n, parent) => {
  const o = new THREE.Object3D(); o.name = n.getName();
  o.position.fromArray(n.getTranslation()); o.quaternion.fromArray(n.getRotation()); o.scale.fromArray(n.getScale());
  parent.add(o); T[o.name] = o; order.push(o);
  for (const c of n.listChildren()) build(c, o);
};
const troot = new THREE.Group();
for (const s of doc.getRoot().listScenes()) for (const n of s.listChildren()) build(n, troot);
troot.updateMatrixWorld(true);
const joints = doc.getRoot().listSkins()[0].listJoints().map(j => j.getName());
const unmapped = joints.filter(n => !MAP[n] || !S[MAP[n][0]]);
console.log(`Ziel "${figure}": ${joints.length} Knochen, ohne Gegenstück (bleiben in Ruhe): ${unmapped.join(', ') || '–'}`);

// ---------- Grundhaltungen ----------
const wq = o => o.getWorldQuaternion(new THREE.Quaternion()), wp = o => o.getWorldPosition(new THREE.Vector3());
// Quelle: Grundhaltung aus der Bindung der Hülle (verlässlicher als die Lage beim Laden), sonst die geladene Lage
fbx.updateMatrixWorld(true);
const sRestQ = {}, sRestP = {};
if (skinned) { skinned.skeleton.pose(); fbx.updateMatrixWorld(true); }   // Knochen in die Bindung der Hülle stellen (T-Haltung)
for (const [n, b] of Object.entries(S)) { if (!sRestQ[n]) { sRestQ[n] = wq(b); sRestP[n] = wp(b); } }
const tRestQ = {}, tRestP = {};
for (const o of order) { tRestQ[o.name] = wq(o); tRestP[o.name] = wp(o); }
// Angleichen der Grundhaltung je Knochen
const A = {};
const align = n => {
  const [sn, child] = MAP[n];
  if (!child) return null;
  const sc = S[SRC_CHILD[child] || (MAP[child] ? MAP[child][0] : '')];
  if (!sc || !T[child]) return null;
  const ds = sRestP[clean(sc.name)].clone().sub(sRestP[sn]).normalize(), dt = tRestP[child].clone().sub(tRestP[n]).normalize();
  return { q: new THREE.Quaternion().setFromUnitVectors(dt, ds), deg: dt.angleTo(ds) * 180 / Math.PI };
};
let report = [];
for (const o of order) {
  const n = o.name; if (!MAP[n] || !S[MAP[n][0]]) continue;
  const a = ALIGN ? align(n) : null;
  if (!ALIGN) { A[n] = new THREE.Quaternion(); const b = align(n); if (b) report.push(`${n} ${b.deg.toFixed(0)}°`); continue; }
  // Endknochen ohne Richtungsgeber (Hand, Zehen) übernehmen die Angleichung ihres Elternknochens
  A[n] = a ? a.q : (A[o.parent.name] || new THREE.Quaternion());
  if (a) report.push(`${n} ${a.deg.toFixed(0)}°`);
}
console.log(ALIGN ? 'Grundhaltung angeglichen:' : 'Unterschied der Knochenrichtungen (nicht angeglichen, gleiche Hülle angenommen):', report.join(', '));
// Maßstab zwischen den Skeletten: Abstand Hüfte–Zehen in der Grundhaltung (die Quelle liegt oft in anderen Einheiten und
// ihre Grundhaltung nicht auf dem Boden; in der Bewegung selbst steht die Figur bei beiden auf y = 0)
const sHip = sRestP.Hips.y - sRestP.LeftToeBase.y, tHip = tRestP.Hips.y - tRestP.LeftToeBase.y, ratio = tHip / sHip;
console.log(`Hüfte über den Zehen: Quelle ${sHip.toFixed(4)} → Ziel ${tHip.toFixed(3)} (Faktor ${ratio.toFixed(2)})`);
const toe = n => (tRestP[n + 'ToeBase'].z - tRestP[n + 'Foot'].z).toFixed(3), stoe = n => (sRestP[n + 'ToeBase'].z - sRestP[n + 'Foot'].z).toFixed(3);
console.log(`Blickrichtung (Zehen vor dem Fuß, +Z): Quelle ${(+stoe('Left') * ratio).toFixed(3)}, Ziel ${toe('Left')} · links ist +X: Quelle ${(sRestP.LeftArm.x * ratio).toFixed(3)}, Ziel ${tRestP.LeftArm.x.toFixed(3)}`);
if (!name) process.exit(0);

// ---------- Bild für Bild übertragen ----------
const clip = fbx.animations.slice().sort((a, b) => b.duration - a.duration)[0];
if (!clip) throw new Error('keine Animation in der Datei');
const mixer = new THREE.AnimationMixer(fbx); mixer.clipAction(clip).play();
const frames = Math.max(2, Math.round(clip.duration * FPS) + 1), times = [];
const rot = {}, hipPos = [], toeY = [];
const lift = tRestP.LeftToeBase.y - 0 * ratio;   // Zehenhöhe der Figur über dem Boden (bei der Quelle liegen die Zehen in der Bewegung auf Bodenhöhe)
for (const n of Object.keys(A)) rot[n] = [];
const cur = {}, inv = new THREE.Quaternion(), d = new THREE.Quaternion(), w = new THREE.Quaternion(), loc = new THREE.Quaternion(), prev = {};
for (let f = 0; f < frames; f++) {
  const t = Math.min(clip.duration, f / FPS); times.push(+t.toFixed(4));
  mixer.setTime(t); fbx.updateMatrixWorld(true);
  for (const o of order) {
    const n = o.name, pq = cur[o.parent.name] || tRestQ[o.parent.name] || new THREE.Quaternion();
    if (!A[n]) { cur[n] = pq.clone().multiply(o.quaternion); continue; }   // ohne Gegenstück: Ruhelage relativ zum Elternknochen
    const sn = MAP[n][0];
    d.copy(wq(S[sn])).multiply(inv.copy(sRestQ[sn]).invert());              // Drehung der Quelle gegenüber ihrer Grundhaltung
    w.copy(d).multiply(A[n]).multiply(tRestQ[n]);
    loc.copy(pq).invert().multiply(w).normalize();
    if (prev[n] && prev[n].dot(loc) < 0) loc.set(-loc.x, -loc.y, -loc.z, -loc.w);   // gleiche Halbkugel: sonst dreht die Überblendung den langen Weg
    prev[n] = loc.clone(); cur[n] = w.clone();
    rot[n].push(+loc.x.toFixed(5), +loc.y.toFixed(5), +loc.z.toFixed(5), +loc.w.toFixed(5));
  }
  // Hüfte: Bewegung gegenüber der Grundhaltung, auf die Größe der Figur umgerechnet, im Raum des Elternknotens
  const sp = wp(S.Hips), tp = new THREE.Vector3((sp.x - sRestP.Hips.x) * ratio + tRestP.Hips.x, sp.y * ratio + lift, (sp.z - sRestP.Hips.z) * ratio + tRestP.Hips.z);
  T.Hips.parent.worldToLocal(tp);
  hipPos.push(tp.x, tp.y, tp.z);
  // Zielskelett in diese Haltung stellen und messen, wie hoch die Zehen stehen
  T.Hips.position.copy(tp);
  for (const n of Object.keys(A)) { const v = rot[n]; T[n].quaternion.set(v[v.length - 4], v[v.length - 3], v[v.length - 2], v[v.length - 1]); }
  troot.updateMatrixWorld(true);
  toeY.push(Math.min(wp(T.LeftToeBase).y, wp(T.RightToeBase).y));
}
// Stand auf dem Boden: Die Zehen sollen im Mittel so hoch stehen wie in der Ruhelage der Figur
const off = toeY.reduce((a, b) => a + b, 0) / toeY.length - Math.min(tRestP.LeftToeBase.y, tRestP.RightToeBase.y), offL = off / T.Hips.parent.getWorldScale(new THREE.Vector3()).y;
for (let i = 0; i < hipPos.length; i += 3) { hipPos[i] = +hipPos[i].toFixed(3); hipPos[i + 1] = +(hipPos[i + 1] - offL).toFixed(3); hipPos[i + 2] = +hipPos[i + 2].toFixed(3); }
console.log(`Bodenkorrektur: ${(-off * 100).toFixed(1)} cm · Zehenhöhe schwankt um ${((Math.max(...toeY) - Math.min(...toeY)) * 100).toFixed(1)} cm`);
const tracks = Object.entries(rot).map(([n, values]) => ({ name: `${n}.quaternion`, type: 'quaternion', times, values }));
tracks.push({ name: 'Hips.position', type: 'vector', times, values: hipPos });
const file = `asset-src/data/anim_${name}.json`;
fs.mkdirSync('asset-src/data', { recursive: true });
fs.writeFileSync(file, JSON.stringify({ name, duration: +clip.duration.toFixed(4), tracks }));
const ys = hipPos.filter((_, i) => i % 3 === 1);
console.log(`${tracks.length} Spuren, ${frames} Bilder (${FPS}/s), ${clip.duration.toFixed(2)} s, Hüfthöhe ${Math.min(...ys).toFixed(1)}–${Math.max(...ys).toFixed(1)} → ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
