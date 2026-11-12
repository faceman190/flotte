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

export const KIT_GLOW: Record<string, number> = { light: 0xfff0d8, lamp: 0xffa030, redlamp: 0xff3a24, screen: 0x3f9fd0, green: 0x40ff80, cool: 0xc8e0ff, accent: 0x40d8c0 };
// Innenräume: vorberechnetes Licht (Bild über den zweiten Satz Texturkoordinaten, sonst in den Eckfarben) und Akzentfarbe der Station
export interface KitLook { lightmap?: string; intensity?: number; accent?: number }
const SETS: Record<string, Record<string, THREE.Material>> = {};
const TEXS: Record<string, THREE.Texture | null> = {};
const shared = (name: string, srgb: boolean) => (name in TEXS ? TEXS[name] : (TEXS[name] = tex(name, srgb)));
function sheet(name: string) {
  const orm = shared(name + '_orm', false);
  const m = new THREE.MeshStandardMaterial({
    map: shared(name + '_col', true), normalMap: shared(name + '_nrm', false), aoMap: orm, roughnessMap: orm, metalnessMap: orm,
    roughness: 1, metalness: 1, vertexColors: true,
  });
  m.normalScale.set(1, -1);          // Bilder liegen wie in glTF (nicht gespiegelt), Tangenten kommen aus den Texturkoordinaten
  m.envMapIntensity = 0.35;
  return m;
}
// Die Lichtkarte speichert v = x / (1 + x); hier wird zurückgerechnet, damit helle Lichtinseln und dunkle Ecken ihren echten Abstand behalten
function decodeLight(m: THREE.Material) {
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_maps>', THREE.ShaderChunk.lights_fragment_maps.replace(
      'vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;',
      'vec3 lmV = min(lightMapTexel.rgb, vec3(0.965)); vec3 lightMapIrradiance = lmV / (1.0 - lmV) * lightMapIntensity;'));
  };
  m.customProgramCacheKey = () => 'kitlm';
}
export function kitMaterials(look: KitLook = {}) {
  const key = (look.lightmap || '') + '|' + (look.accent ?? '');
  if (SETS[key]) return SETS[key];
  const inside = !!look.lightmap;
  const trim = sheet('kit_trim'), int = sheet('kit_int');
  const decal = new THREE.MeshStandardMaterial({
    map: shared('kit_decals', true), transparent: true, depthWrite: false, vertexColors: true, roughness: 0.75, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
  const concrete = texMat(0xffffff, 'hangar_floor', { vertexColors: true, roughness: 0.92, metalness: 0.04 });
  concrete.envMapIntensity = 0.3;
  const glass = new THREE.MeshStandardMaterial({ color: 0x070b10, roughness: 0.08, metalness: 0.7, envMapIntensity: 1.6 });
  if (inside) {
    const lm = tex(look.lightmap!, true);
    if (lm) { lm.channel = 1; lm.wrapS = lm.wrapT = THREE.ClampToEdgeWrapping; lm.anisotropy = 2; }
    for (const m of [trim, int, concrete, decal]) { m.lightMap = lm; m.lightMapIntensity = look.intensity ?? 1; decodeLight(m); }
  }
  const M: Record<string, THREE.Material> = inside
    ? { kit_trim: trim, kit_int: int, kit_decal: decal, kit_concrete: concrete, kit_glass: glass }
    : { kit_trim: dusty(trim, 'trim'), kit_int: dusty(int, 'int'), kit_decal: decal, kit_concrete: dusty(concrete, 'concrete'), kit_glass: glass };
  for (const [k, c] of Object.entries(KIT_GLOW)) M['kit_' + k] = new THREE.MeshBasicMaterial({ color: k === 'accent' && look.accent !== undefined ? look.accent : c });
  const signs = shared('kit_signs', true);
  M.kit_sign = new THREE.MeshBasicMaterial({ map: signs, color: look.accent ?? KIT_GLOW.accent });     // Wegweiser in der Akzentfarbe der Station
  M.kit_poster = new THREE.MeshBasicMaterial({ map: signs, color: 0xd8d8d8 });
  return (SETS[key] = M);
}
// Ersetzt in einem geladenen Modell alle kit_*-Materialien durch die gemeinsamen
export function applyKit(root: THREE.Object3D, look: KitLook = {}) {
  const M = kitMaterials(look);
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    const m = M[o.material?.name];
    if (!m) return;
    o.material = m;
    if (m === M.kit_decal) o.renderOrder = 1;
  });
}

// Zusatzangaben der Modelle aus Blender
export interface KitMeta {
  lights?: { k: string; p: [number, number, number]; s: number }[]; pad?: { x: number; y: number; z: number; r: number }; R?: number; collide_above?: number;
  blocks?: number[][];                                                                             // Standflächen [x0, x1, z0, z1]
  slots?: { x: number; z: number; tx: number; tz: number; sx: number; sy: number; sz: number; yaw: number }[];   // Ladenplätze: Händler, Ansprechpunkt, Schild
  dims?: { w: number; d: number; h: number };
}
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
