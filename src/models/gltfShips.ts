import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Schiffsmodelle als komprimierte GLB-Dateien aus public/assets/ship (scripts/build-ships.mjs → build-assets.mjs).
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
  holder.add(obj);
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
