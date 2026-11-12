import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { renderer, GLOW } from '../core/engine';
import { stationTemplate, stationClips } from '../models/stationModels';
import { applyKit } from '../models/kit';

// =====================================================================================
// Modelle und Bilder der Minen (src/game/dungeon.ts nutzt sie; fehlen sie, baut dungeon.ts einfache Ersatzformen).
//  Mine_Felsen.glb  zehn Felsen F01–F10 (asset-src/neu/mine/mine_rocks.py, Quelle CliffRocks01), Bilder tex/fels_col/_nrm/_orm
//  Mine_Kit.glb     Baukasten-Module (asset-src/neu/mine/mine_kit.py): stuetze, gleis, leitung, lampe, tor, tor_blatt, schalter, hebel,
//                   korb, wagen, kiste(+_deckel), tresorkiste(+_deckel), sanikiste(+_deckel), portal, deko
//  Mine_Drohne.glb  Wachdrohne mit Animationen (idle, attack, …), Quelle MilitaryDroneCG
//  Mine_Waffe.glb   Karabiner K-12 für die Ich-Sicht (asset-src/neu/mine/waffe_build.py), Bilder tex/waffe_col/_nrm/_orm
// Achsen: Blender (x, y, z) → Spiel (x, z, −y). Module zeigen mit der Vorderseite nach +Z, Gänge laufen entlang X.
// =====================================================================================

const loader = new THREE.TextureLoader();
const TEXC: Record<string, THREE.Texture | null> = {};
function tex(name: string, srgb: boolean, aniso = 8) {
  if (name in TEXC) return TEXC[name];
  const url = window.TEXDATA?.[name];
  if (!url) return (TEXC[name] = null);
  const t = loader.load(url);
  t.flipY = false; t.anisotropy = aniso; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return (TEXC[name] = t);
}
function pbr(base: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  const orm = tex(base + '_orm', false);
  const m = new THREE.MeshStandardMaterial({ map: tex(base + '_col', true), normalMap: tex(base + '_nrm', false), aoMap: orm, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1, ...extra });
  m.normalScale.set(1, -1);          // Bilder wie in glTF (nicht gespiegelt), Tangenten aus den Texturkoordinaten
  return m;
}
const meshOf = (root: THREE.Object3D | null, name: string) => {
  const o = root?.getObjectByName(name);
  if (!o) return null;
  if ((o as THREE.Mesh).isMesh) return o as THREE.Mesh;
  let m: THREE.Mesh | null = null; o.traverse((c: any) => { if (!m && c.isMesh) m = c; });
  return m;
};

// ---------- Felsen ----------
export interface RockT { geo: THREE.BufferGeometry; w: number; h: number; d: number; name: string }
let ROCKS: RockT[] | null = null, rockMat: THREE.MeshStandardMaterial | null = null;
export function rockSet(): RockT[] | null {
  if (ROCKS) return ROCKS;
  const t = stationTemplate('Mine_Felsen'); if (!t) return null;
  const out: RockT[] = [];
  for (let i = 1; i <= 10; i++) {
    const n = 'F' + String(i).padStart(2, '0'), m = meshOf(t, n); if (!m) continue;
    const g = m.geometry; g.computeBoundingBox(); const s = g.boundingBox!.getSize(new THREE.Vector3());
    out.push({ geo: g, w: s.x, h: s.y, d: s.z, name: n });
  }
  return (ROCKS = out.length === 10 ? out : null);
}
export function rockMaterial(tint: THREE.Color) {
  if (!rockMat) { rockMat = pbr('fels', { metalness: 0 }); rockMat.metalnessMap = null; rockMat.envMapIntensity = 0.15; }
  rockMat.color.copy(tint);
  return rockMat;
}

// ---------- Baukasten-Module ----------
// Die Asset-Pipeline speichert Punkte quantisiert (−1 … 1); Größe und Lage stecken dann in der Transformation des Knotens. Deshalb wird der Knoten
// samt eigener Transformation geklont und in eine leere Gruppe gehängt (der Ursprung aus Blender liegt bei allen Modulen im Nullpunkt).
export function kitPart(name: string): THREE.Object3D | null {
  const t = stationTemplate('Mine_Kit'); const o = t?.getObjectByName(name); if (!o) return null;
  const w = new THREE.Group(); w.add(o.clone(true));
  applyKit(w);
  w.traverse((q: any) => { q.userData.sh = false; });
  return w;
}
export const hasMineKit = () => !!stationTemplate('Mine_Kit');
// Scharnier eines Kistendeckels (Blender: Mitte hinten oben) im Spiel-Raum
export const LID_HINGE: Record<string, [number, number, number]> = {
  kiste: [0, 0.46 * 0.78, -0.3], tresorkiste: [0, 0.62 * 0.78, -0.425], sanikiste: [0, 0.36 * 0.78, -0.21],
};

// ---------- Drohne ----------
export interface DroneVis { g: THREE.Group; mixer: THREE.AnimationMixer | null; mat: THREE.MeshStandardMaterial[]; idle?: THREE.AnimationAction; attack?: THREE.AnimationAction; base: THREE.Color[] }
export function buildDrone(boss: boolean): DroneVis | null {
  const t = stationTemplate('Mine_Drohne'); if (!t) return null;
  const inner = t.clone(true);
  const box = new THREE.Box3().setFromObject(inner), size = box.getSize(new THREE.Vector3());
  const s = (boss ? 2.3 : 1.35) / Math.max(size.x, size.z);
  const g = new THREE.Group(); inner.scale.setScalar(s); g.add(inner);
  const mats: THREE.MeshStandardMaterial[] = [], base: THREE.Color[] = [];
  inner.traverse((o: any) => {
    o.userData.sh = false;
    if (!o.isMesh) return;
    const m = (o.material as THREE.MeshStandardMaterial).clone();
    if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
    if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
    m.envMapIntensity = 0.5;
    if (boss) m.color.multiplyScalar(0.55).lerp(new THREE.Color(0x3a2448), 0.35);
    m.emissive.set(0xffffff); m.emissiveIntensity = 1.6;
    o.material = m; mats.push(m); base.push(m.color.clone());
  });
  const clips = stationClips('Mine_Drohne');
  let mixer: THREE.AnimationMixer | null = null, idle, attack;
  if (clips.length) {
    mixer = new THREE.AnimationMixer(inner);
    const find = (k: string) => clips.find(c => c.name.toLowerCase().endsWith('|' + k));
    const ci = find('idle'), ca = find('attack');
    if (ci) { idle = mixer.clipAction(ci); idle.play(); idle.time = Math.random() * ci.duration; }
    if (ca) { attack = mixer.clipAction(ca); attack.setEffectiveWeight(0); attack.play(); }
  }
  return { g, mixer, mat: mats, idle, attack, base };
}

// ---------- Waffe in der Ich-Sicht ----------
export interface ViewModel {
  scene: THREE.Scene; cam: THREE.PerspectiveCamera; gun: THREE.Group; flash: THREE.Sprite; flashLight: THREE.PointLight;
  key: THREE.DirectionalLight; fill: THREE.HemisphereLight; lampWarm: THREE.PointLight; lens: THREE.MeshBasicMaterial | null;
  muzzle: THREE.Vector3; lightPos: THREE.Vector3;
}
let ENV: THREE.Texture | null = null;
export function buildViewModel(): ViewModel | null {
  const t = stationTemplate('Mine_Waffe'); if (!t) return null;
  const sceneV = new THREE.Scene();
  if (!ENV) { const pm = new THREE.PMREMGenerator(renderer); ENV = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); }
  sceneV.environment = ENV;
  const cam = new THREE.PerspectiveCamera(52, 16 / 9, 0.01, 10);
  const gun = new THREE.Group(), inner = new THREE.Group(); gun.add(inner);
  const gm = pbr('waffe'); gm.envMapIntensity = 0.22;
  let lens: THREE.MeshBasicMaterial | null = null;
  for (const n of ['waffe', 'glas', 'absehen', 'lampenglas']) {
    const node = t.getObjectByName(n); if (!node) continue;
    const c = node.clone(true); inner.add(c);
    const src = meshOf(c, n); if (!src) continue;
    const m = src; m.material = gm;
    if (n === 'glas') m.material = new THREE.MeshPhysicalMaterial({ color: 0x0b1418, roughness: 0.04, metalness: 0, transmission: 0, transparent: true, opacity: 0.38, envMapIntensity: 1.4, clearcoat: 1 });
    if (n === 'absehen') m.material = new THREE.MeshBasicMaterial({ color: 0xff2a14, toneMapped: false });
    if (n === 'lampenglas') { lens = new THREE.MeshBasicMaterial({ color: 0xfff2dc, toneMapped: false }); m.material = lens; }
    m.frustumCulled = false; m.renderOrder = n === 'glas' ? 2 : n === 'absehen' ? 3 : 0;
  }
  sceneV.add(gun);
  const key = new THREE.DirectionalLight(0xfff2e4, 0.62); key.position.set(-0.6, 1.0, 0.4); sceneV.add(key); sceneV.add(key.target);
  const fill = new THREE.HemisphereLight(0x8fa4c0, 0x241c14, 0.2); sceneV.add(fill);
  const lampWarm = new THREE.PointLight(0xffb070, 0, 3, 1.6); lampWarm.position.set(-0.4, 0.5, -0.6); sceneV.add(lampWarm);
  const muzzle = new THREE.Vector3(0, 0.04, -0.5585), lightPos = new THREE.Vector3(0.0355, 0.04, -0.3835);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false }));
  flash.scale.setScalar(0.16); flash.position.copy(muzzle); flash.visible = false; flash.renderOrder = 5; inner.add(flash);
  const flashLight = new THREE.PointLight(0xffb060, 0, 1.5, 1.4); flashLight.position.copy(muzzle).add(new THREE.Vector3(0, 0.05, 0.05)); inner.add(flashLight);
  return { scene: sceneV, cam, gun, flash, flashLight, key, fill, lampWarm, lens, muzzle, lightPos };
}
