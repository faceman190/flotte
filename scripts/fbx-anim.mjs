// Bewegung aus einer FBX-Datei (z. B. von Mixamo) auf das Skelett unserer Figuren übertragen und als Animationsclip ablegen
// (asset-src/data/anim_<name>.json, im Spiel über window.DATAFILES und THREE.AnimationClip.parse).
//   node scripts/fbx-anim.mjs <datei.fbx>                       nur ansehen: Knochen, Clips, Zuordnung
//   node scripts/fbx-anim.mjs <datei.fbx> <name> [Schalter]     schreiben
// Schalter: --figure=merchant|worker (Zielskelett, Vorgabe merchant) · --fps=20 · --in=s --out=s (Ausschnitt in Sekunden)
//   --inplace  Vorwärtsbewegung der Hüfte entfernen (die Figur bewegt das Spiel); das Tempo je Bild steht dann als meta.speed dabei
//   --alt=s    zweiter Einstiegspunkt (Sekunden nach dem Zuschnitt), z. B. beim Abbremsen für den anderen Fuß
//   --align    siehe unten
//   --limbs    Arme und Beine nach der Knochenrichtung der Quelle ausrichten (siehe unten); bei allen Mixamo-Dateien angeben
// Alle Clips einer Figur neu erzeugen: scripts/anims.sh
// align: nur angeben, wenn die FBX auf einem FREMDEN Körper beruht (z. B. der Mixamo-Standardfigur in T-Haltung). Wurde
// unsere eigene Figur bei Mixamo hochgeladen, steht die Hülle in beiden Skeletten gleich da: dann darf Schritt 1 nicht laufen,
// sonst würden Füße und Arme um den Unterschied der Gelenklagen verdreht.
// Verfahren: Die Skelette haben verschiedene Knochennamen, Längen und Grundhaltungen. Je Knochen wird deshalb
//  1. die Grundhaltung angeglichen (kleinste Drehung, die die Richtung des Zielknochens auf die des Quellknochens legt),
//  2. die Drehung der Quelle gegenüber ihrer Grundhaltung im Weltraum darauf angewendet,
//  3. das Ergebnis in die Knochenkette der Figur zurückgerechnet.
// Die Hüfte wandert mit (auf die Größe der Figur umgerechnet); Finger hat unsere Figur nicht, sie entfallen.
// limbs: Mixamo legt sein Skelett nach Markierungen in den Körper; Knie und Ellbogen sitzen dabei selten genau in der Achse des
// Beins oder Arms (bei der Händlerin steht der Unterschenkelknochen in Ruhe 11° schräg, obwohl das Bein gerade ist). Die Bewegung
// selbst ist aber für die Knochen gerechnet: Deren Richtungen ergeben die natürliche Haltung (Knie beim Gehen 3–72°). Überträgt man
// nur die Drehung gegenüber der Ruhe, bleibt die Schräge als dauernde Beugung im Körper (geduckter Gang, 10–17° zu viel im Knie).
// Mit --limbs folgt deshalb die ACHSE des Beins (Hüftgelenk → Knöchel) und des Arms (Schulter → Handgelenk) unserer Figur der
// Knochenrichtung der Quelle. Rumpf, Kopf, Hände und Füße werden weiter als Drehung gegenüber der Ruhe übertragen.
// Danach wird die Hüfte je Bild so gehoben oder gesenkt, dass der tragende Fuß so hoch steht wie in der Quelle.
import fs from 'fs';
globalThis.self = globalThis; globalThis.window = globalThis;
globalThis.document = { createElementNS: () => ({ addEventListener() {}, removeEventListener() {}, style: {} }), createElement: () => ({ getContext: () => null, style: {} }) };
const THREE = await import('three');
const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
const { io } = await import('./glb-lib.mjs');

const args = process.argv.slice(2), flag = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v = '1'] = a.slice(2).split('='); return [k, v]; }));
const [inp, name] = args.filter(a => !a.startsWith('--'));
const figure = flag.figure || 'merchant', ALIGN = !!flag.align, LIMBS = !!flag.limbs, FPS = +(flag.fps || 20), INPLACE = !!flag.inplace;
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
// Achse der Gliedmaße in der Ruhelage unserer Figur: Bein = Hüftgelenk → Knöchel, Arm = Schulter → Handgelenk
const LINE = {};
for (const sd of ['Left', 'Right']) { LINE[sd + 'UpLeg'] = LINE[sd + 'Leg'] = [sd + 'UpLeg', sd + 'Foot']; LINE[sd + 'Arm'] = LINE[sd + 'ForeArm'] = [sd + 'Arm', sd + 'Hand']; }
const limbAlign = n => {
  const L = LINE[n]; if (!L || !T[L[0]] || !T[L[1]]) return null;
  const [sn, child] = MAP[n], sc = S[MAP[child][0]];
  if (!sc) return null;
  const ds = sRestP[clean(sc.name)].clone().sub(sRestP[sn]).normalize(), dt = tRestP[L[1]].clone().sub(tRestP[L[0]]).normalize();
  return { q: new THREE.Quaternion().setFromUnitVectors(dt, ds), deg: dt.angleTo(ds) * 180 / Math.PI };
};
let report = [];
for (const o of order) {
  const n = o.name; if (!MAP[n] || !S[MAP[n][0]]) continue;
  const a = ALIGN ? align(n) : null;
  // Die Hand hat keinen Richtungsgeber. Sie übernimmt die Ausrichtung des Unterarms, sonst knickt das Handgelenk um genau diesen Winkel (rund 10°).
  if (!ALIGN) { const l = LIMBS ? limbAlign(n) : null; const hand = LIMBS && /Hand$/.test(n) ? A[o.parent.name] : null; A[n] = l ? l.q : hand ? hand.clone() : new THREE.Quaternion(); const b = l || align(n); if (b) report.push(`${n} ${b.deg.toFixed(0)}°${l ? ' (Achse)' : ''}`); continue; }
  // Endknochen ohne Richtungsgeber (Hand, Zehen) übernehmen die Angleichung ihres Elternknochens
  A[n] = a ? a.q : (A[o.parent.name] || new THREE.Quaternion());
  if (a) report.push(`${n} ${a.deg.toFixed(0)}°`);
}
console.log(ALIGN ? 'Grundhaltung angeglichen:' : LIMBS ? 'Unterschied der Knochenrichtungen (Arme und Beine nach Achse ausgerichtet, Rest wie die Quelle gedreht):' : 'Unterschied der Knochenrichtungen (nicht angeglichen, gleiche Hülle angenommen):', report.join(', '));
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
const T0 = +(flag.in || 0), T1 = Math.min(clip.duration, +(flag.out || clip.duration)), DUR = T1 - T0;
const frames = Math.max(2, Math.round(DUR * FPS) + 1), times = [];
const rot = {}, hipPos = [], toeY = [], fwd = [];
// Hüfte: Das Hüftgelenk der Figur sitzt an anderer Stelle im Körper als das der Quelle. Es wird deshalb als Punkt behandelt,
// der fest am Hüftknochen der Quelle hängt: So landet der Körper genau dort, wo ihn die Quelle hinstellt (Füße auf dem Boden).
if (!skinned) throw new Error('Die FBX enthält keine Hülle: bitte "mit Skin" herunterladen.');
skinned.geometry.computeBoundingBox();
const sBox = skinned.geometry.boundingBox, tBox = new THREE.Box3();
for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) { const a = p.getAttribute('POSITION'); tBox.expandByPoint(new THREE.Vector3(...a.getMin([]))).expandByPoint(new THREE.Vector3(...a.getMax([]))); }
const K = (tBox.max.y - tBox.min.y) / (sBox.max.y - sBox.min.y);   // Maßstab: Körpergröße Figur / Körpergröße Quelle
const foot = b => new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, (b.min.z + b.max.z) / 2);
const hipBindInv = skinned.skeleton.boneInverses[skinned.skeleton.bones.findIndex(b => clean(b.name) === 'Hips')];
const qS = tRestP.Hips.clone().sub(foot(tBox)).divideScalar(K).add(foot(sBox));   // Hüftgelenk der Figur im Körper der Quelle (Bindung)
const offZ = qS.z - sRestP.Hips.z;
console.log(`Körpergröße: Quelle ${(sBox.max.y - sBox.min.y).toFixed(4)} → Figur ${(tBox.max.y - tBox.min.y).toFixed(3)} (Faktor ${K.toFixed(2)})`);
let sAnkleMin = Infinity;
if (LIMBS) for (let f = 0; f < frames; f++) { mixer.setTime(Math.min(T0 + Math.min(DUR, f / FPS), clip.duration - 1e-4)); fbx.updateMatrixWorld(true); sAnkleMin = Math.min(sAnkleMin, wp(S.LeftFoot).y, wp(S.RightFoot).y); }
const tAnkleFlat = Math.min(tRestP.LeftFoot.y, tRestP.RightFoot.y);   // Knöchelhöhe unserer Figur, wenn sie flach steht (Ruhelage)
let liftMin = Infinity, liftMax = -Infinity;
for (const n of Object.keys(A)) rot[n] = [];
const cur = {}, inv = new THREE.Quaternion(), d = new THREE.Quaternion(), w = new THREE.Quaternion(), loc = new THREE.Quaternion(), prev = {};
for (let f = 0; f < frames; f++) {
  const t = Math.min(DUR, f / FPS); times.push(+t.toFixed(4));
  mixer.setTime(Math.min(T0 + t, clip.duration - 1e-4)); fbx.updateMatrixWorld(true);
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
  const sp = wp(S.Hips), pt = qS.clone().applyMatrix4(hipBindInv).applyMatrix4(S.Hips.matrixWorld);
  const tp = new THREE.Vector3(pt.x * K, pt.y * K + tBox.min.y, pt.z * K);
  fwd.push(sp.z * K);
  if (INPLACE) tp.z = tRestP.Hips.z + K * (pt.z - sp.z - offZ);   // auf der Stelle: Die Figur bewegt das Spiel
  T.Hips.parent.worldToLocal(tp);
  hipPos.push(tp.x, tp.y, tp.z);
  // Zielskelett in diese Haltung stellen und messen, wie hoch die Zehen stehen
  T.Hips.position.copy(tp);
  for (const n of Object.keys(A)) { const v = rot[n]; T[n].quaternion.set(v[v.length - 4], v[v.length - 3], v[v.length - 2], v[v.length - 1]); }
  troot.updateMatrixWorld(true);
  if (LIMBS) {
    // Hüfte nachführen: Der tiefere Fuß der Quelle gibt vor, wie hoch der Knöchel unserer Figur stehen soll
    const sL = wp(S.LeftFoot).y, sR = wp(S.RightFoot).y, want = v => tAnkleFlat + (v - sAnkleMin) * K;
    const eL = want(sL) - wp(T.LeftFoot).y, eR = want(sR) - wp(T.RightFoot).y;
    const wL = Math.exp(-(sL - sAnkleMin) * K / 0.03), wR = Math.exp(-(sR - sAnkleMin) * K / 0.03), dy = (wL * eL + wR * eR) / (wL + wR);
    const hw = wp(T.Hips); hw.y += dy; T.Hips.parent.worldToLocal(hw); T.Hips.position.copy(hw);
    hipPos[hipPos.length - 3] = hw.x; hipPos[hipPos.length - 2] = hw.y; hipPos[hipPos.length - 1] = hw.z;
    liftMin = Math.min(liftMin, dy); liftMax = Math.max(liftMax, dy);
    troot.updateMatrixWorld(true);
  }
  toeY.push(Math.min(wp(T.LeftToeBase).y, wp(T.RightToeBase).y));
}
const off = toeY.slice().sort((a, b) => a - b)[toeY.length >> 1] - Math.min(tRestP.LeftToeBase.y, tRestP.RightToeBase.y);
for (let i = 0; i < hipPos.length; i++) hipPos[i] = +hipPos[i].toFixed(3);
console.log(`Zehengelenk des tieferen Fußes: im Median ${(off * 100).toFixed(1)} cm gegenüber der Ruhelage (nur zur Kontrolle, nichts korrigiert)`);
if (LIMBS) console.log(`Hüfte nachgeführt: ${(liftMin * 100).toFixed(1)} bis ${(liftMax * 100).toFixed(1)} cm`);
const tracks = Object.entries(rot).map(([n, values]) => ({ name: `${n}.quaternion`, type: 'quaternion', times, values }));
tracks.push({ name: 'Hips.position', type: 'vector', times, values: hipPos });
const file = `asset-src/data/anim_${name}.json`;
fs.mkdirSync('asset-src/data', { recursive: true });
// Tempo je Bild (m/s, leicht geglättet) und mittleres Tempo: Damit läuft die Figur im Spiel so schnell, wie die Füße greifen
const raw = fwd.map((z, i) => { const a = Math.max(0, i - 1), b = Math.min(fwd.length - 1, i + 1); return (fwd[b] - fwd[a]) / Math.max(1e-6, times[b] - times[a]); });
const speed = raw.map((_, i) => { let s = 0, n = 0; for (let j = Math.max(0, i - 2); j <= Math.min(raw.length - 1, i + 2); j++) { s += raw[j]; n++; } return +Math.max(0, s / n).toFixed(3); });
const meta = { fps: FPS, pace: +((fwd[fwd.length - 1] - fwd[0]) / DUR).toFixed(3), inplace: INPLACE, ...(INPLACE ? { speed } : {}), ...(flag.alt ? { alt: +flag.alt } : {}) };
fs.writeFileSync(file, JSON.stringify({ name, duration: +DUR.toFixed(4), meta, tracks }));
console.log(`Tempo im Mittel ${meta.pace} m/s${INPLACE ? ', auf der Stelle' : ''}${flag.alt ? ', zweiter Einstieg bei ' + flag.alt + ' s' : ''}`);
const ys = hipPos.filter((_, i) => i % 3 === 1);
console.log(`${tracks.length} Spuren, ${frames} Bilder (${FPS}/s), ${DUR.toFixed(2)} s, Hüfthöhe ${Math.min(...ys).toFixed(1)}–${Math.max(...ys).toFixed(1)} → ${file} (${(fs.statSync(file).size / 1024).toFixed(0)} KB)`);
