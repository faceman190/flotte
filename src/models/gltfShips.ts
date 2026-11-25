import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Schiffsmodelle als komprimierte GLB-Dateien aus public/assets/ship (asset-src/glb/ship → build-assets.mjs).
// Lackierungen (paint/<Modell>_<Farbe>) kamen aus dem alten Gratis-Paket, das 2026-11-18 entfernt wurde; die Mechanik bleibt für spätere Modelle.
// Alle Modelle werden beim Start einmal geladen, auf Länge 1 normiert und mit der Nase nach −Z gedreht.
export const PAINTS = ['Orange', 'Blue', 'Green', 'Purple', 'Red'] as const;
export type Paint = typeof PAINTS[number];
export const PAINT_N: Record<Paint, string> = { Orange: 'Bernstein', Blue: 'Kobaltblau', Green: 'Grün', Purple: 'Violett', Red: 'Rot' };
export const PAINT_C: Record<Paint, string> = { Orange: '#e09a3a', Blue: '#4a86d8', Green: '#5fae5a', Purple: '#9a5fd0', Red: '#d0504a' };

interface Template { group: THREE.Group; w: number; h: number; l: number; frame: { innerPos: THREE.Vector3; s: number } }
const TPL: Record<string, Template> = {};
const PAINT_TEX: Record<string, THREE.Texture> = {};
let loaded = false;

export async function loadShipModels() {
  const data = window.SHIPDATA;
  if (!data) return false;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  await Promise.all(Object.entries(data.models).map(async ([name, url]) => {
    try {
      const g = await loader.loadAsync(url);
      const inner = g.scene;
      inner.traverse((o: any) => {
        if (!o.isMesh) return;
        const m = o.material as THREE.MeshStandardMaterial;
        // Texturierte Modelle (Lackierungen) bekommen einheitliche Werte; Modelle mit eigenen Materialien behalten ihre
        if (m.map) { m.map.colorSpace = THREE.SRGBColorSpace; m.map.anisotropy = 4; m.map.needsUpdate = true; m.metalness = 0.35; m.roughness = 0.55; }
        m.envMapIntensity = 0.8;
        if (m.name.startsWith('ext_pan')) panelShader(m);
      });
      inner.rotation.y = Math.PI;                 // Nase von +Z nach −Z
      inner.userData.glbRoot = true;              // Koordinaten der GLB-Datei (Gelenke beweglicher Teile, setDoors)
      const wrap = new THREE.Group(); wrap.add(inner);
      wrap.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(wrap), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      inner.position.sub(c);                      // Mitte in den Ursprung
      const s = 1 / size.z;
      const norm = new THREE.Group(); norm.scale.setScalar(s); norm.add(wrap);
      TPL[name] = { group: norm, w: size.x * s, h: size.y * s, l: 1, frame: { innerPos: inner.position.clone(), s } };
    } catch (e) { console.warn('Modell konnte nicht geladen werden:', name, e); }
  }));
  const tl = new THREE.TextureLoader();
  for (const [key, uri] of Object.entries(data.paints)) {
    const t = tl.load(uri);
    t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    PAINT_TEX[key] = t;
  }
  loaded = Object.keys(TPL).length > 0;
  return loaded;
}
export const hasModel = (name: string) => loaded && !!TPL[name];

// Plattenfugen, Nieten und Schmutz im Shader (Materialien ext_pan_*, eigene Modelle aus Blender, z. B. die Elster): Die Texturkoordinaten
// sind Meter auf dem Rumpf (u = Länge, v = Umfang), genau wie im Blender-Shader. Zwei versetzte Ziegelmuster ergeben die Fugen
// (vertieft), daneben Nieten (erhaben), dazu Flecken und Laufspuren. Fugen und Nieten blenden aus, sobald sie kleiner als ein Pixel werden.
const PANEL_PARS = /* glsl */ `
varying vec2 vPan;
float pHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float pNoise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(pHash(i), pHash(i + vec2(1.0, 0.0)), u.x), mix(pHash(i + vec2(0.0, 1.0)), pHash(i + vec2(1.0, 1.0)), u.x), u.y); }
float pBrick(vec2 p, float w, float h, float off, out vec2 id) {
  float row = floor(p.y / h); float x = p.x + (mod(row, 2.0) > 0.5 ? off * w : 0.0); float col = floor(x / w); id = vec2(col, row);
  float fx = x - col * w, fy = p.y - row * h; return min(min(fx, w - fx), min(fy, h - fy)); }
`;
const PANEL_COLOR = /* glsl */ `
#include <color_fragment>
float pAa = max(max(fwidth(vPan.x), fwidth(vPan.y)), 1e-5);
vec2 pId1, pId2; float pD1 = pBrick(vPan, 1.6, 0.9, 0.5, pId1), pD2 = pBrick(vPan, 0.8, 0.45, 0.25, pId2);
float pM1 = (1.0 - smoothstep(0.009 - pAa, 0.009 + pAa, pD1)) * clamp(1.6 - pAa / 0.03, 0.0, 1.0);
float pM2 = (1.0 - smoothstep(0.005 - pAa, 0.005 + pAa, pD2)) * 0.45 * clamp(1.6 - pAa / 0.018, 0.0, 1.0);
float pMask = max(pM1, pM2);
float pBand = (1.0 - step(0.075, pD1)) * (1.0 - pM1);
float pRd = length(fract(vPan * 13.0) - 0.5) / 13.0;
float pRiv = pBand * (1.0 - smoothstep(0.0045, 0.007 + pAa, pRd)) * clamp(1.6 - pAa / 0.006, 0.0, 1.0);
float pVar = mix(0.9, 1.0, pHash(pId1));
float pGrime = mix(0.88, 1.06, pNoise(vPan * 0.7)) * mix(0.95, 1.03, pNoise(vPan * 5.0 + 17.0));
float pStreak = mix(1.0, 0.88, smoothstep(0.52, 0.78, pNoise(vec2(vPan.x * 4.0, vPan.y * 0.35) + 3.0)));
diffuseColor.rgb *= pVar * pGrime * pStreak * (1.0 - 0.48 * pMask) * (1.0 - 0.25 * pRiv);
float pHeight = (-pMask + 0.6 * pRiv) * 0.0035;
`;
const PANEL_ROUGH = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = clamp(roughnessFactor + pMask * 0.3 + (pNoise(vPan * 3.0) - 0.5) * 0.12, 0.04, 1.0);
`;
const PANEL_NORMAL = /* glsl */ `
#include <normal_fragment_maps>
{ vec2 pdH = vec2(dFdx(pHeight), dFdy(pHeight)); vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition);
  vec3 r1 = cross(sy, normal), r2 = cross(normal, sx); float det = dot(sx, r1) * faceDirection;
  vec3 grad = sign(det) * (pdH.x * r1 + pdH.y * r2); normal = normalize(abs(det) * normal - grad); }
`;
function panelShader(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec2 vPan;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvPan = uv;');
    sh.fragmentShader = PANEL_PARS + sh.fragmentShader.replace('#include <color_fragment>', PANEL_COLOR)
      .replace('#include <roughnessmap_fragment>', PANEL_ROUGH).replace('#include <normal_fragment_maps>', PANEL_NORMAL);
  };
  m.customProgramCacheKey = () => 'platten';
}
export const hasPaint = (name: string, p: Paint) => p === 'Orange' || !!PAINT_TEX[`${name}_${p}`];

// Kopie eines Modells in gewünschter Länge (Meter) und Lackierung
export function modelInstance(name: string, length: number, paint: Paint = 'Orange') {
  const t = TPL[name];
  const obj = t.group.clone(true);
  const tex = paint !== 'Orange' ? PAINT_TEX[`${name}_${paint}`] : null;
  if (tex) obj.traverse((o: any) => { if (o.isMesh) { o.material = o.material.clone(); o.material.map = tex; o.material.needsUpdate = true; } });
  const holder = new THREE.Group();
  holder.userData.model = name;      // für setDoors: welche beweglichen Teile das Modell hat
  obj.scale.multiplyScalar(length);
  const far = TPL[name + 'Fern'];
  if (far) {      // Fernmodell (z. B. ElsterFern.glb): ab sechs Schiffslängen die stark vereinfachte Fassung zeigen
    const lod = new THREE.LOD(), fo = far.group.clone(true); fo.scale.multiplyScalar(length);
    lod.addLevel(obj, 0); lod.addLevel(fo, length * 6); holder.add(lod);
  } else holder.add(obj);
  return { obj: holder, w: t.w * length, h: t.h * length, l: length };
}

// Fahrwerk und Rampe (Meshes mit dem Material „gear“) zeigen oder verbergen: im Flug eingezogen, am Boden ausgefahren
export function setGear(root: THREE.Object3D, down: boolean) {
  let list = root.userData.gear as THREE.Object3D[] | undefined;
  if (!list) { list = []; root.traverse((o: any) => { if (o.isMesh && o.material?.name === 'gear') list!.push(o); }); root.userData.gear = list; }
  for (const o of list) o.visible = down;
}

// ---------- Bewegliche Teile: Heckrampe, Lukendeckel, Leiter ----------
// Im Modell erkennbar am Materialnamen („… |rampe“ usw., Export asset-src/neu/kormoran/kor_export.py). Gelenke und Wege in den
// Koordinaten der GLB-Datei (dort haben die Meshes keine eigene Lage). Ablauf wie im Blender-Modell (kor_anim.py), gemessen am
// Fortschritt der Gruppe von 0 (zu) bis 1 (offen): t0–t1 ist der Abschnitt, in dem sich das Teil bewegt.
interface DoorPart { tag: string; grp: string; t0: number; t1: number; hinge?: number[]; angle?: number; slide?: number[]; under?: string; retract?: boolean }
const DOORS: Record<string, { dur: Record<string, number>; parts: DoorPart[] }> = {
  // Wisent (asset-src/neu/wisent/wis_rampe.py): Tor oben klappt 97° hoch, Rampe schwenkt von senkrecht bis zum Boden, drei Auszüge fahren nacheinander aus
  Wisent: {
    dur: { rampe: 6.0 },
    parts: [
      { tag: 'tor', grp: 'rampe', t0: 0.0, t1: 0.35, hinge: [0, 12.18, -40.06], angle: 1.69297 },
      { tag: 'rampe', grp: 'rampe', t0: 0.25, t1: 0.65, hinge: [0, 6.4, -40.06], angle: -2.23416 },
      { tag: 'rampe2', grp: 'rampe', t0: 0.6, t1: 0.75, slide: [0, 2.6, 0], under: 'rampe' },
      { tag: 'rampe3', grp: 'rampe', t0: 0.72, t1: 0.87, slide: [0, 2.6, 0], under: 'rampe2' },
      { tag: 'rampe4', grp: 'rampe', t0: 0.84, t1: 1.0, slide: [0, 2.6, 0], under: 'rampe3' },
    ],
  },
  Kormoran: {
    dur: { rampe: 4.2, leiter: 2.5 },
    parts: [
      { tag: 'rampe', grp: 'rampe', t0: 0.12, t1: 0.72, hinge: [0, 2.45, -21.65], angle: -1.9513 },      // von senkrecht auf 21,8° nach unten
      { tag: 'rampe2', grp: 'rampe', t0: 0.66, t1: 0.96, slide: [0, 3, 0], under: 'rampe' },            // Verlängerung fährt 3 m aus
      { tag: 'luke', grp: 'leiter', t0: 0, t1: 0.3, hinge: [0, 1.99, 11.55], angle: -1.7453 },          // Lukendeckel klappt 100° nach unten
      { tag: 'leiter', grp: 'leiter', t0: 0.27, t1: 0.93, slide: [0, 1.906, -0.411], retract: true },   // Leiter gleitet aus dem Schacht
    ],
  },
};
interface DoorRig { cfg: typeof DOORS[string]; p: Record<string, number>; init: boolean; parts: { d: DoorPart; pivot: THREE.Object3D }[] }
const ease = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
function rigDoors(root: THREE.Object3D): DoorRig | null {
  let name = ''; root.traverse(o => { if (!name && o.userData.model) name = o.userData.model; });
  const cfg = DOORS[name]; if (!cfg) return null;
  const meshes: Record<string, THREE.Mesh[]> = {};
  root.traverse((o: any) => { if (!o.isMesh) return; const m = /\|(\w+)$/.exec(o.material?.name || ''); if (m) (meshes[m[1]] = meshes[m[1]] || []).push(o); });
  const rig: DoorRig = { cfg, p: {}, init: false, parts: [] }, pivots: Record<string, THREE.Object3D> = {};
  // Die komprimierten Meshes hängen an eigenen Knoten (Verschiebung, Maßstab der Quantisierung): darum weltlagetreu umhängen (attach)
  const glbRoot = (o: THREE.Object3D) => { let p = o.parent; while (p && !p.userData.glbRoot) p = p.parent; return p; };
  root.updateMatrixWorld(true);
  for (const d of cfg.parts) {
    const list = meshes[d.tag], gr = list?.length ? glbRoot(list[0]) : null; if (!gr) continue;
    const base = d.under ? pivots[d.under] : null, pivot = new THREE.Object3D(); pivot.name = 'Gelenk ' + d.tag;
    if (base) base.add(pivot); else { gr.add(pivot); pivot.position.set(...((d.hinge || [0, 0, 0]) as [number, number, number])); }
    pivot.updateMatrixWorld(true);
    for (const m of list) pivot.attach(m);
    pivots[d.tag] = pivot; rig.parts.push({ d, pivot });
  }
  return rig;
}
// Stand einer Gruppe (0 zu … 1 offen), z. B. ob die Rampe ganz offen ist
export function doorProgress(root: THREE.Object3D, grp: string) { const rig = root.userData.doors as DoorRig | null | undefined; return rig ? rig.p[grp] ?? 0 : 0; }
// Heckrampe zum Betreten ohne Taste (Schiffskoordinaten wie die Laufkarte: Nase −Z): Türebene, Fuß der offenen Rampe, halbe Breite.
// RAMP.want schaltet der Rampenschalter (innen am Laderaum, außen am Rampenfuß); im Hangar öffnet die Rampe, solange want gilt.
export const RAMP_ENTRY: Record<string, { door: number; foot: number; hw: number }> = { Wisent: { door: 41.39, foot: 49.9, hw: 3.7 } };
export const RAMP = { want: true };
// Öffnen oder schließen (jedes Bild aufrufen, dt = Spielzeit des Bildes): beim ersten Aufruf sofort im Zielzustand, danach mit der Dauer aus DOORS
export function setDoors(root: THREE.Object3D, open: boolean, dt = 0) {
  let rig = root.userData.doors as DoorRig | null | undefined;
  if (rig === undefined) rig = root.userData.doors = rigDoors(root);
  if (!rig) return;
  const step = rig.init ? Math.min(0.1, dt) : 1e9; rig.init = true;
  for (const g of Object.keys(rig.cfg.dur)) rig.p[g] = Math.max(0, Math.min(1, (rig.p[g] ?? 0) + (open ? 1 : -1) * step / rig.cfg.dur[g]));
  for (const { d, pivot } of rig.parts) {
    const k = ease((rig.p[d.grp] - d.t0) / (d.t1 - d.t0));
    if (d.angle !== undefined) pivot.rotation.x = d.angle * k;
    if (d.slide) {
      const f = d.retract ? 1 - k : k; pivot.position.set(d.slide[0] * f, d.slide[1] * f, d.slide[2] * f);      // unter einem Gelenk: im Rahmen des Gelenks
      if (d.retract) pivot.visible = rig.p[d.grp] > d.t0;      // eingezogene Leiter steckt im Schacht hinter dem Deckel
    }
  }
}

// Koordinatensystem eines Modells im Spiel (für Innenmodelle, die deckungsgleich zum Außenmodell sitzen sollen):
// Modell um 180° gedreht, um innerPos verschoben, mit s × Länge skaliert
export const modelFrame = (name: string) => TPL[name]?.frame || null;

// ---------- Kanzel (seit 2026-11-25, Konzept docs/konzept-schiffe-fracht.md, Schritt 2) ----------
// Jäger und Elster steigen über die Kanzel aus. Die Modelle haben dafür kein eigenes bewegliches Teil, aber das Kanzelglas ist ein eigenes
// Material: Diese Netze hängen an einem Gelenk an der hinteren Oberkante des Glases und klappen vorn hoch. Venom: das ganze Glas ist ein Stück.
const KANZEL: Record<string, { mats: string[]; angle: number; zMax?: number }> = {
  Venom: { mats: ['glass_clear'], angle: 0.26, zMax: -1.2 },      // nur das Glas vor z = −1,2 m (über dem Cockpit), der Rest bleibt fest
  Wuerger: { mats: ['Schauglas (Spiel)'], angle: 0.95 },
  Elster: { mats: ['Kuppelglas (Spiel)'], angle: 1.05 },
};
interface KanzelRig { pivot: THREE.Object3D; angle: number; p: number; box: THREE.Box3 }
function rigKanzel(root: THREE.Object3D): KanzelRig | null {
  let name = ''; root.traverse(o => { if (!name && o.userData.model) name = o.userData.model; });
  const cfg = KANZEL[name]; if (!cfg) return null;
  let list: THREE.Mesh[] = []; root.traverse((o: any) => { if (o.isMesh && cfg.mats.includes(o.material?.name)) list.push(o); });
  if (!list.length) return null;
  root.updateMatrixWorld(true);
  if (cfg.zMax !== undefined) list = list.map(m => kanzelTeil(m, root, cfg.zMax!)).filter(Boolean) as THREE.Mesh[];
  if (!list.length) return null;
  let gr = list[0].parent; while (gr && !gr.userData.glbRoot) gr = gr.parent;
  if (!gr) return null;
  const ginv = new THREE.Matrix4().copy(gr.matrixWorld).invert(), rinv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const gb = new THREE.Box3(), sb = new THREE.Box3();
  for (const m of list) { m.geometry.computeBoundingBox(); gb.union(m.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(ginv, m.matrixWorld))); sb.union(m.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(rinv, m.matrixWorld))); }
  // Nase im Rahmen der GLB-Datei: Schiffs-Nase ist −Z im Spiel
  const nose = new THREE.Vector3(0, 0, -1).transformDirection(root.matrixWorld).transformDirection(ginv);
  const front = nose.z >= 0 ? 1 : -1, pivot = new THREE.Object3D(); pivot.name = 'Gelenk Kanzel';
  gr.add(pivot); pivot.position.set((gb.min.x + gb.max.x) / 2, gb.max.y, front > 0 ? gb.min.z : gb.max.z); pivot.updateMatrixWorld(true);
  for (const m of list) pivot.attach(m);
  return { pivot, angle: -front * cfg.angle, p: 0, box: sb };      // vorn hoch: um x mit dem Vorzeichen gegen die Nasenrichtung
}
// Glas in zwei Netze teilen: Dreiecke mit dem Schwerpunkt vor zMax (Schiffskoordinaten) werden die Kanzel (eigene Kopie der Geometrie)
function kanzelTeil(m: THREE.Mesh, root: THREE.Object3D, zMax: number): THREE.Mesh | null {
  const g = m.geometry, idx = g.index, p = g.attributes.position; if (!idx) return null;
  const M = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(root.matrixWorld).invert(), m.matrixWorld), v = new THREE.Vector3();
  const vorn: number[] = [], rest: number[] = [];
  for (let t = 0; t < idx.count; t += 3) {
    let z = 0; for (let k = 0; k < 3; k++) z += v.fromBufferAttribute(p, idx.getX(t + k)).applyMatrix4(M).z;
    (z / 3 < zMax ? vorn : rest).push(idx.getX(t), idx.getX(t + 1), idx.getX(t + 2));
  }
  if (!vorn.length) return null;
  const gv = g.clone(); gv.setIndex(vorn); const gr = g.clone(); gr.setIndex(rest); m.geometry = gr;
  const k = new THREE.Mesh(gv, m.material); k.matrix.copy(m.matrix); k.matrixAutoUpdate = m.matrixAutoUpdate; k.position.copy(m.position); k.quaternion.copy(m.quaternion); k.scale.copy(m.scale);
  m.parent!.add(k); k.updateMatrixWorld(true); return k;
}
const kRig = (root: THREE.Object3D) => { let r = root.userData.kanzel as KanzelRig | null | undefined; if (r === undefined) r = root.userData.kanzel = rigKanzel(root); return r; };
/** Kanzel öffnen oder schließen (jedes Bild, dt = Spielzeit); 1,2 s für den ganzen Weg */
export function setKanzel(root: THREE.Object3D, open: boolean, dt = 0) {
  const r = kRig(root); if (!r) return;
  r.p = Math.max(0, Math.min(1, r.p + (open ? 1 : -1) * Math.min(0.1, dt) / 1.2));
  r.pivot.rotation.x = r.angle * ease(r.p);
}
/** Lage des Kanzelglases im Schiff (Schiffskoordinaten: Nase −Z, oben +Y) und wie weit sie offen ist; null = keine Kanzel */
export function kanzelInfo(root: THREE.Object3D): { box: THREE.Box3; p: number } | null { const r = kRig(root); return r ? { box: r.box, p: r.p } : null; }
