import * as THREE from 'three';
import { texMat } from '../core/textures';

// =====================================================================================
// Baukasten: gemeinsame Materialien für alle Modelle, die in Blender mit asset-src/neu/baukasten/kit_lib.py gebaut wurden.
// Solche Modelle tragen keine eigenen Bilder, nur Materialnamen (kit_*), Texturkoordinaten ins Texturblatt und eine Tönung je Ecke
// (Lackfarbe × vorberechnete Verdeckung). Ein Material reicht deshalb für alle Gebäude; neue Modelle brauchen hier keinen Code.
//   kit_trim     Texturblatt (tex/kit_trim_col, _nrm, _orm: Farbe, Relief, Verdeckung/Rauheit/Metall)
//   kit_decal    Aufkleber mit Transparenz (tex/kit_decals): Schrift, Ziffern, Schilder, Schmutz
//   kit_concrete Beton (kachelt in Metern), kit_glass dunkle Scheiben, kit_light/lamp/redlamp/screen/green selbstleuchtend
// Zusatzangaben je Modell (Leuchtpunkte, Landefeld) stehen in data/kit_<Name>.json (aus Blender, export() in kit_lib.py).
// =====================================================================================

const loader = new THREE.TextureLoader();
function tex(name: string, srgb: boolean) {
  const url = window.TEXDATA?.[name];
  if (!url) return null;
  const t = loader.load(url);
  t.flipY = false; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return t;
}

// Staub bzw. Schnee auf waagrechten Flächen, in der Bodenfarbe des Planeten (setKitDust beim Aufbau der Oberfläche)
const DUST = { col: { value: new THREE.Color(0xffffff) }, k: { value: 0 } };
export function setKitDust(c: THREE.ColorRepresentation, k: number) { DUST.col.value.set(c); DUST.k.value = k; }
function dusty<T extends THREE.Material>(m: T, key: string) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.dustCol = DUST.col; sh.uniforms.dustK = DUST.k;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDustN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDustN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 dustCol; uniform float dustK; varying vec3 vDustN;')
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, dustCol, dustK * smoothstep(0.55, 0.95, normalize(vDustN).y));');
  };
  m.customProgramCacheKey = () => 'kitdust-' + key;
  return m;
}

export const KIT_GLOW: Record<string, number> = { light: 0xfff0d8, lamp: 0xffa030, redlamp: 0xff3a24, screen: 0x3f9fd0, green: 0x40ff80 };
let MATS: Record<string, THREE.Material> | null = null;
export function kitMaterials() {
  if (MATS) return MATS;
  const orm = tex('kit_trim_orm', false);
  const trim = new THREE.MeshStandardMaterial({
    map: tex('kit_trim_col', true), normalMap: tex('kit_trim_nrm', false), aoMap: orm, roughnessMap: orm, metalnessMap: orm,
    roughness: 1, metalness: 1, vertexColors: true,
  });
  trim.normalScale.set(1, -1);          // Bilder liegen wie in glTF (nicht gespiegelt), Tangenten kommen aus den Texturkoordinaten
  trim.envMapIntensity = 0.35;
  const decal = new THREE.MeshStandardMaterial({
    map: tex('kit_decals', true), transparent: true, depthWrite: false, vertexColors: true, roughness: 0.75, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const concrete = texMat(0xffffff, 'hangar_floor', { vertexColors: true, roughness: 0.92, metalness: 0.04 });
  concrete.envMapIntensity = 0.3;
  const glass = new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.08, metalness: 0.7, envMapIntensity: 1.6 });
  MATS = { kit_trim: dusty(trim, 'trim'), kit_decal: decal, kit_concrete: dusty(concrete, 'concrete'), kit_glass: glass };
  for (const [k, c] of Object.entries(KIT_GLOW)) MATS['kit_' + k] = new THREE.MeshBasicMaterial({ color: c });
  return MATS;
}
// Ersetzt in einem geladenen Modell alle kit_*-Materialien durch die gemeinsamen
export function applyKit(root: THREE.Object3D) {
  const M = kitMaterials();
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    const m = M[o.material?.name];
    if (!m) return;
    o.material = m;
    if (m === M.kit_decal) o.renderOrder = 1;
  });
}

// Zusatzangaben der Modelle aus Blender
export interface KitMeta { lights?: { k: string; p: [number, number, number]; s: number }[]; pad?: { x: number; y: number; z: number; r: number }; R?: number; collide_above?: number }
const META: Record<string, KitMeta> = {};
export const kitMeta = (name: string): KitMeta => META[name] || {};
export async function loadKitMeta(names: string[]) {
  const files = (window as any).DATAFILES as Record<string, string> | undefined;
  if (!files) return;
  await Promise.all(names.map(async (n) => {
    const url = files['kit_' + n];
    if (!url) return;
    try { META[n] = await (await fetch(url)).json(); } catch (e) { console.warn('Baukasten-Angaben nicht geladen:', n, e); }
  }));
}
