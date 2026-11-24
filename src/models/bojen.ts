import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { stationTemplate } from './stationModels';

// =====================================================================================
// Bojen aus Blender (seit 23.11.2026): Navigationsboje TB-317 (6 m) und Gedenkboje MB-11 (9,7 m),
// asset-src/neu/bojen_export.py → station/<Name>.glb (Nahmodell) und station/<Name>Fern.glb (Fernmodell).
// Je Datei wenige Netze, eines je Material: bj_lack / bj_metall / bj_matt / bj_schrift tragen die Farben in den Eckfarben,
// bj_warn ist das gelbe Warnband (die schwarzen Streifen rechnet der Shader hier), bj_glow_* leuchten, bj_glas ist durchsichtig.
// bojeTeile() liefert die Netze in Dateikoordinaten (Ursprung am Fuß der Boje, oben +Y), fertig zum Instanzieren.
// =====================================================================================

export interface BojeTeil { geo: THREE.BufferGeometry; mat: THREE.Material }
const CACHE: Record<string, BojeTeil[] | null> = {};
const MATS: Record<string, THREE.Material> = {};

const NOISE = /* glsl */ `
varying vec3 vBjP;
float bjH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float bjN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(bjH(i), bjH(i + vec3(1, 0, 0)), f.x), mix(bjH(i + vec3(0, 1, 0)), bjH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(bjH(i + vec3(0, 0, 1)), bjH(i + vec3(1, 0, 1)), f.x), mix(bjH(i + vec3(0, 1, 1)), bjH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
`;

// Lack und Stahl: leichte Flecken und Laufspuren aus der Lage im Modell (wie die Blender-Materialien, nur ohne Texturen);
// Warnband: diagonale schwarze Streifen
export function prep(src: THREE.MeshStandardMaterial): THREE.Material {
  const key = src.name.replace(/\.\d+$/, '');
  if (MATS[key]) return MATS[key];
  const m = src.clone();
  m.envMapIntensity = 0.8;
  if (key.startsWith('bj_glow')) { m.toneMapped = true; return (MATS[key] = m); }
  if (key === 'bj_glas') { m.transparent = true; m.opacity = 0.25; m.depthWrite = false; m.side = THREE.DoubleSide; return (MATS[key] = m); }
  m.vertexColors = true;
  const warn = key === 'bj_warn', schrift = key === 'bj_schrift';
  if (schrift) { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -2; }
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vBjP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvBjP = position;');
    sh.fragmentShader = NOISE + sh.fragmentShader.replace('#include <color_fragment>', warn ? `#include <color_fragment>
float bjS = step(0.5, fract((vBjP.x + vBjP.y + vBjP.z) * 3.2));
diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.02, 0.02, 0.022), bjS) * (0.85 + 0.25 * bjN(vBjP * 6.0));` : schrift ? '#include <color_fragment>' : `#include <color_fragment>
float bjG = bjN(vBjP * vec3(2.2, 0.35, 2.2)) * 0.6 + bjN(vBjP * 7.0) * 0.4;
diffuseColor.rgb *= 0.8 + 0.4 * bjG;`)
      .replace('#include <roughnessmap_fragment>', warn || schrift ? '#include <roughnessmap_fragment>' : '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + (bjN(vBjP * 4.0) - 0.5) * 0.25, 0.05, 1.0);');
  };
  m.customProgramCacheKey = () => 'bj|' + (warn ? 'w' : schrift ? 's' : 'l');
  return (MATS[key] = m);
}

// quantisierte Attribute (Packen mit meshopt) als Float32, damit die Lage eingerechnet werden kann
function floatGeo(g: THREE.BufferGeometry) {
  const out = new THREE.BufferGeometry();
  for (const [name, a] of Object.entries(g.attributes)) {
    const src = a as THREE.BufferAttribute, n = src.count, s = src.itemSize, arr = new Float32Array(n * s);
    for (let i = 0; i < n; i++) for (let k = 0; k < s; k++) arr[i * s + k] = src.getComponent(i, k);
    out.setAttribute(name, new THREE.BufferAttribute(arr, s));
  }
  if (g.index) out.setIndex(g.index.clone());
  return out;
}

// Bauten aus dem Hintergrund-Paket (deco/<Name>, seit 24.11.2026: Torwache, Fernohr, Pumpwerk aus asset-src/neu/sektor3): gleiche Machart wie die
// Bojen, aber erst bei Bedarf geladen (nicht vor dem Menü). decoLaden(name) lädt; danach liefern bojeTeile/bojeGruppe das Modell.
const DECO: Record<string, THREE.Group> = {}, DECO_P: Record<string, Promise<boolean>> = {};
export function decoLaden(name: string): Promise<boolean> {
  if (DECO[name]) return Promise.resolve(true);
  if (name in DECO_P) return DECO_P[name];
  const url = (window as any).DECODATA?.[name] as string | undefined;
  if (!url) return Promise.resolve(false);
  return (DECO_P[name] = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).then(g => {
    const wrap = new THREE.Group(); wrap.add(g.scene); DECO[name] = wrap; return true;
  }, e => { console.warn('Bau nicht geladen:', name, e); delete DECO_P[name]; return false; }));
}
export const decoBereit = (name: string) => !!DECO[name];
/** Vorlage eines geladenen Baus (erstes Kind = Szene der Datei), z. B. für Modelle mit beweglichen Teilen (models/rover.ts) */
export const decoVorlage = (name: string) => DECO[name] || null;

// Netze einer Bojendatei in Dateikoordinaten (null, solange das Modell nicht geladen ist)
export function bojeTeile(name: string): BojeTeil[] | null {
  if (name in CACHE) return CACHE[name];
  const t = stationTemplate(name) || DECO[name] || null;
  if (!t || !t.children[0]) return null;
  const inner = t.children[0];
  t.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(inner.matrixWorld).invert(), out: BojeTeil[] = [];
  inner.traverse((o: any) => {
    if (!o.isMesh) return;
    const geo = floatGeo(o.geometry);
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    geo.computeBoundingSphere();
    out.push({ geo, mat: prep(o.material) });
  });
  return (CACHE[name] = out);
}

// ganzes Modell als Gruppe (für Einzelstücke wie die Gedenkboje)
export function bojeGruppe(name: string): THREE.Group | null {
  const parts = bojeTeile(name);
  if (!parts) return null;
  const g = new THREE.Group();
  for (const p of parts) g.add(new THREE.Mesh(p.geo, p.mat));
  return g;
}
