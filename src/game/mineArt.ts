import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
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
  muzzle: THREE.Vector3; lightPos: THREE.Vector3; id: string; pos: [number, number, number]; glow: THREE.MeshBasicMaterial | null;
}
// Modelle je Waffe (Blender: waffe_build.py für den K-12, waffen_build.py für IG-3 und EF-2). Knoten: Körper, Glas, Absehen, Leuchtteile.
// muzzle: Mündung im Spiel-Raum (Blender x, z, −y); pos: Lage vor der Kamera (rechts, unten, vorn).
interface WDef { tpl: string; body: string; glas: string; absehen: string; licht: string; tex: string; muzzle: [number, number, number]; pos: [number, number, number]; col: number; env?: number }   // env: Spiegelung der Umgebung (viel Metall → weniger)
const WDEFS: Record<string, WDef> = {
  k12: { tpl: 'Mine_Waffe', body: 'waffe', glas: 'glas', absehen: 'absehen', licht: 'lampenglas', tex: 'waffe', muzzle: [0, 0.04, -0.5585], pos: [0.118, -0.178, -0.30], col: 0xfff2dc },
  ig3: { tpl: 'Mine_W_ig3', body: 'ig3', glas: 'ig3_glas', absehen: 'ig3_absehen', licht: 'ig3_licht', tex: 'waffe_ig3', muzzle: [0, 0.046, -0.724], pos: [0.128, -0.228, -0.42], col: 0x8fd0ff },
  ef2: { tpl: 'Mine_W_ef2', body: 'ef2', glas: 'ef2_glas', absehen: 'ef2_absehen', licht: 'ef2_licht', tex: 'waffe_ef2', muzzle: [0, 0.046, -0.330], pos: [0.112, -0.168, -0.29], col: 0x6fc2ff, env: 0.07 },
  p9: { tpl: 'Mine_W_p9', body: 'p9', glas: 'p9_glas', absehen: 'p9_absehen', licht: 'p9_licht', tex: 'waffe_p9', muzzle: [0, 0.030, -0.112], pos: [0.052, -0.080, -0.185], col: 0xffe2b0 },
  sw: { tpl: 'Mine_W_sw', body: 'sw', glas: 'sw_glas', absehen: 'sw_absehen', licht: 'sw_licht', tex: 'waffe_sw', muzzle: [0, 0.038, -0.232], pos: [0.098, -0.140, -0.27], col: 0xc070ff, env: 0.12 },
};
// Welches Modell zur angelegten Waffe gehört (fehlt die Datei, nimmt das Spiel den K-12)
export function viewModelId(gear?: string) {
  const id = gear === 'waffe_impuls' ? 'ig3' : gear === 'waffe_flinte' ? 'ef2' : gear === 'waffe_pistole' ? 'p9' : gear === 'waffe_splitter' ? 'sw' : 'k12';
  return stationTemplate(WDEFS[id].tpl) ? id : 'k12';
}
let ENV: THREE.Texture | null = null;
export function buildViewModel(id = 'k12'): ViewModel | null {
  const W = WDEFS[id] || WDEFS.k12;
  const t = stationTemplate(W.tpl); if (!t) return null;
  const sceneV = new THREE.Scene();
  if (!ENV) { const pm = new THREE.PMREMGenerator(renderer); ENV = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); }
  sceneV.environment = ENV;
  const cam = new THREE.PerspectiveCamera(52, 16 / 9, 0.01, 10);
  const gun = new THREE.Group(), inner = new THREE.Group(); gun.add(inner);
  const gm = pbr(W.tex); gm.envMapIntensity = W.env ?? 0.22;
  let lens: THREE.MeshBasicMaterial | null = null;
  for (const n of [W.body, W.glas, W.absehen, W.licht]) {
    const node = t.getObjectByName(n); if (!node) continue;
    const c = node.clone(true); inner.add(c);
    const src = meshOf(c, n); if (!src) continue;
    const m = src; m.material = gm;
    if (n === W.glas) m.material = new THREE.MeshPhysicalMaterial({ color: 0x0b1418, roughness: 0.04, metalness: 0, transmission: 0, transparent: true, opacity: 0.38, envMapIntensity: 1.4, clearcoat: 1 });
    if (n === W.absehen) m.material = new THREE.MeshBasicMaterial({ color: 0xff2a14, toneMapped: false });
    if (n === W.licht) { lens = new THREE.MeshBasicMaterial({ color: W.col, toneMapped: false }); m.material = lens; }
    m.frustumCulled = false; m.renderOrder = n === W.glas ? 2 : n === W.absehen ? 3 : 0;
  }
  // Hände des Spielers (Arme des Soldaten, in Blender per IK an diese Waffe gelegt: asset-src/neu/soldier/soldat_build.py)
  const ht = stationTemplate('Mine_Haende'), hn = ht?.getObjectByName('haende_' + id);
  if (hn) {
    const hm = pbr('soldat', { metalness: 1, roughness: 1 }); hm.envMapIntensity = 0.12;
    const c = hn.clone(true); inner.add(c);
    c.traverse((o: any) => { if (o.isMesh) { o.material = hm; o.frustumCulled = false; } });
  }
  sceneV.add(gun);
  const key = new THREE.DirectionalLight(0xfff2e4, 0.46); key.position.set(-0.6, 1.0, 0.4); sceneV.add(key); sceneV.add(key.target);
  const fill = new THREE.HemisphereLight(0x8fa4c0, 0x241c14, 0.13); sceneV.add(fill);
  const lampWarm = new THREE.PointLight(0xffb070, 0, 3, 1.6); lampWarm.position.set(-0.4, 0.5, -0.6); sceneV.add(lampWarm);
  const muzzle = new THREE.Vector3(...W.muzzle), lightPos = new THREE.Vector3(0.0355, 0.04, -0.3835);
  const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, toneMapped: false }));
  flash.scale.setScalar(0.16); flash.position.copy(muzzle); flash.visible = false; flash.renderOrder = 5; inner.add(flash);
  const flashLight = new THREE.PointLight(0xffb060, 0, 1.5, 1.4); flashLight.position.copy(muzzle).add(new THREE.Vector3(0, 0.05, 0.05)); inner.add(flashLight);
  return { scene: sceneV, cam, gun, flash, flashLight, key, fill, lampWarm, lens, muzzle, lightPos, id, pos: W.pos, glow: id === 'k12' ? null : lens };
}

// ---------- Spielerfigur in der Außensicht (Soldat.glb aus asset-src/neu/soldier/soldat_tp.py) ----------
// Ausrüstung bestimmt das Aussehen: Helm → einer der 8 Köpfe, Anzug → Rüstungsplatten und Uniformfarbe, Rucksack → Taschen.
// Die Waffe hängt an der rechten Hand; ihre Lage dort steht in data/soldat_tp.json (aus der Gewehrhaltung in Blender).
export interface SoldierVis { g: THREE.Group; root: THREE.Object3D; mixer: THREE.AnimationMixer; clips: THREE.AnimationClip[]; hand: THREE.Object3D | null; spine: THREE.Object3D | null; spine2: THREE.Object3D | null; weapon: THREE.Object3D | null; muzzle: THREE.Vector3; wid: string; gearKey: string }
// Clipdaten aus Blender (soldat_anim.py): Laufclips mit Tempo (m/s), Richtung [vor, rechts], Schrittlänge je Zyklus und Phase (linker Fuß setzt auf)
export interface ClipMeta { frames: number; loop: boolean; speed?: number; dir?: [number, number]; stride?: number; phase?: number }
let TP: { weapon_in_hand: Record<string, number[][]>; clips?: Record<string, ClipMeta> } | null = null, tpLoading = false;
export const soldierMeta = () => { loadTP(); return TP?.clips || null; };
export const soldierGearKey = (gear: { helm?: string; anzug?: string; rucksack?: string }) => [gear.helm || '', gear.anzug || '', gear.rucksack || ''].join('|');
function loadTP() {
  if (TP || tpLoading) return; tpLoading = true;
  const url = (window as any).DATAFILES?.soldat_tp;
  if (url) fetch(url).then(r => r.json()).then(j => { TP = j; }).catch(() => {});
}
const hashS = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };
const C = new THREE.Matrix4().set(1, 0, 0, 0, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1);         // Blender (z oben) → glTF (y oben)
const CI = C.clone().invert();
export function buildSoldier(gear: { helm?: string; anzug?: string; rucksack?: string; waffe?: string }): SoldierVis | null {
  loadTP();
  const t = stationTemplate('Soldat'); if (!t) return null;
  const root = skClone(t) as THREE.Group;
  const inner = root.children[0]; if (inner) inner.position.set(0, 0, 0);                  // der Lader zentriert Modelle; hier gilt der Ursprung aus Blender (Boden)
  const variant = gear.anzug ? ['soldat_col', 'soldat_col_v2', 'soldat_col_v4', 'soldat_col_v6'][hashS(gear.anzug) % 4] : 'soldat_col';
  const body = pbr('soldat', { metalness: 1, roughness: 1 }); body.envMapIntensity = 0.25;
  if (variant !== 'soldat_col') { const m = tex(variant, true); if (m) body.map = m; }
  const km = pbr('kopf_m'); km.emissiveMap = tex('kopf_m_emi', true); km.emissive.set(0xffffff); km.emissiveIntensity = 1.5; km.envMapIntensity = 0.4;
  const kh = pbr('kopf_h'); kh.envMapIntensity = 0.35;
  const head = gear.helm ? 1 + (hashS(gear.helm) % 8) : 6;
  root.traverse((o: any) => {
    o.userData.sh = false; o.userData.shared = true;
    if (!o.isMesh) return;
    o.frustumCulled = false;
    const mn = o.material?.name || '';
    o.material = mn === 'ext_kopf_m' ? km : mn === 'ext_kopf_h' ? kh : body;
    const n: string = o.name || '';
    const hm = n.match(/^Head0(\d)/); if (hm) o.visible = +hm[1] === head;
    if (n.startsWith('Armor')) o.visible = !!gear.anzug;
    if (n.startsWith('Bags')) o.visible = !!gear.rucksack;
  });
  const g = new THREE.Group(); g.add(root);
  const mixer = new THREE.AnimationMixer(root);
  const hand = root.getObjectByName('hand_r') || null, spine = root.getObjectByName('spine_03') || null, spine2 = root.getObjectByName('spine_02') || null;
  return { g, root, mixer, clips: stationClips('Soldat'), hand, spine, spine2, weapon: null, muzzle: new THREE.Vector3(), wid: '', gearKey: soldierGearKey(gear) };
}
// Waffe an die rechte Hand hängen (sobald die Lage aus data/soldat_tp.json geladen ist)
export function soldierWeapon(s: SoldierVis, id: string) {
  if (s.wid === id || !s.hand || !TP) return;
  if (s.weapon) { s.weapon.removeFromParent(); s.weapon = null; }
  const W = WDEFS[id] || WDEFS.k12, t = stationTemplate(W.tpl), rel = TP.weapon_in_hand[id] || TP.weapon_in_hand.k12;
  const node = t?.getObjectByName(W.body); if (!node || !rel) return;
  const w = new THREE.Group(), c = node.clone(true); w.add(c);
  const gm = pbr(W.tex); gm.envMapIntensity = W.env ?? 0.22;
  c.traverse((o: any) => { if (o.isMesh) { o.material = gm; o.frustumCulled = false; } o.userData.sh = false; o.userData.shared = true; });
  const R = new THREE.Matrix4(); R.set(...(rel.flat() as [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]));
  w.matrixAutoUpdate = false; w.matrix.copy(C).multiply(R).multiply(CI);
  s.hand.add(w); s.weapon = w; s.wid = id; s.muzzle.set(...W.muzzle);
}
