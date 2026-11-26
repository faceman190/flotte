import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { innenArt, innenFlaeche, INNEN } from './innenFlaeche';

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
        if (m.emissive && m.emissive.getHex() !== 0) { m.userData.em0 = m.emissiveIntensity; SCHIFFSLICHT.mats.add(m); }
        if (m.name.startsWith('ext_pan')) panelShader(m);
        const art = innenArt(m.name); if (art) innenFlaeche(m, art);      // Innenräume (Kormoran, Wisent): Oberfläche im Shader
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
// ext_pan_innen (Wände der Laderäume) bekommt wie die Innenraum-Materialien weniger Umgebungslicht, solange man draußen steht (INNEN.amb)
function panelShader(m: THREE.MeshStandardMaterial) {
  const innen = m.name === 'ext_pan_innen';
  m.onBeforeCompile = (sh) => {
    if (innen) sh.uniforms.ifAmb = INNEN.amb;
    sh.vertexShader = 'varying vec2 vPan;\n' + sh.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvPan = uv;');
    sh.fragmentShader = PANEL_PARS + sh.fragmentShader.replace('#include <color_fragment>', PANEL_COLOR)
      .replace('#include <roughnessmap_fragment>', PANEL_ROUGH).replace('#include <normal_fragment_maps>', PANEL_NORMAL);
    if (innen) sh.fragmentShader = 'uniform float ifAmb;\n' + sh.fragmentShader.replace('#include <lights_fragment_end>',
      '#include <lights_fragment_end>\nreflectedLight.indirectDiffuse *= ifAmb; reflectedLight.indirectSpecular *= ifAmb;');
  };
  m.customProgramCacheKey = () => innen ? 'platten-innen' : 'platten';
}
// Leuchtflächen der Schiffsmodelle (seit 2026-11-25): Auf Planeten draußen bei Tag schwächer (wie ein Auge, das sich ans Tageslicht gewöhnt
// hat). Die Leuchten liegen bei 1,5 bis 3 und strahlten am Boden weiß aus Rampe und Laderaum (Nutzer: „Lichter blenden sehr stark“).
export const SCHIFFSLICHT = { k: 1, mats: new Set<THREE.MeshStandardMaterial>() };
export function schiffslicht(k: number) {
  if (Math.abs(k - SCHIFFSLICHT.k) < 0.002) return;
  SCHIFFSLICHT.k = k; for (const m of SCHIFFSLICHT.mats) m.emissiveIntensity = (m.userData.em0 ?? 1) * k;
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

// ---------- Bewegliche Teile: Fahrwerk, Heckrampe, Klappen, Leiter ----------
// Im Modell erkennbar am Materialnamen („… |rampe“ usw., Export asset-src/neu/kormoran/kor_export.py, milan/mil_export.py). Gelenke und Wege
// in den Koordinaten der GLB-Datei (dort haben die Meshes keine eigene Lage). Gemessen am Fortschritt der Gruppe von 0 bis 1: t0–t1 ist der
// Abschnitt, in dem sich das Teil bewegt. Klappen und Rampen: 0 zu … 1 offen (setDoors). Fahrwerk (Gruppe fw): 0 ausgefahren … 1 eingefahren
// (setGear). axis: Drehachse in der Datei (Standard x = quer). inv: gebaut offen, der Winkel schließt (wirkt bei 0). retract: gebaut
// ausgefahren, slide ist der Weg beim Einfahren. boden: Gruppen, die sich nur bei ausgefahrenem Fahrwerk öffnen (Bordleiter).
// Modelle mit Fernmodell (LOD) bekommen je Fassung eigene Gelenke, sonst hingen die Teile des Fernmodells im Nahmodell.
interface DoorPart { tag: string; grp: string; t0: number; t1: number; hinge?: number[]; angle?: number; axis?: 'x' | 'y' | 'z'; inv?: boolean; slide?: number[]; under?: string; retract?: boolean }
interface DoorCfg { dur: Record<string, number>; parts: DoorPart[]; boden?: string[] }
const DOORS: Record<string, DoorCfg> = {
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
  // Kranich (asset-src/neu/kranich, kra-gelenke.json): Heckrampe schwenkt auf 28,5° nach unten, Verlängerung fährt aus; vier Beine mit Füßen,
  // vorn nach hinten in den Bug, hinten nach vorn in die Gondeln, je zwei Schachtklappen schließen zuletzt
  Kranich: {
    dur: { rampe: 3.8, fw: 3.6 },
    parts: [
      { tag: 'rampe', grp: 'rampe', t0: 0.1, t1: 0.72, hinge: [0, 2.35, -15.58], axis: 'x', angle: -2.06822 },
      { tag: 'rampe2', grp: 'rampe', t0: 0.66, t1: 0.96, slide: [0, 2.25, 0], under: 'rampe' },
      { tag: 'fwv_l', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [1.45, 2.6498, 11.25], axis: 'x', angle: 1.53589 },
      { tag: 'fwvk_l0', grp: 'fw', t0: 0.72, t1: 1, hinge: [1, 2.1581, 10.275], axis: 'z', angle: 1.53589 },
      { tag: 'fwvk_l1', grp: 'fw', t0: 0.72, t1: 1, hinge: [1.9, 2.6073, 10.275], axis: 'z', angle: -1.53589 },
      { tag: 'fwh_l', grp: 'fw', t0: 0, t1: 0.7, hinge: [6.15, 2.507, -6.9], axis: 'x', angle: -1.50098 },
      { tag: 'fwhk_l0', grp: 'fw', t0: 0.72, t1: 1, hinge: [6.59, 2.207, -5.625], axis: 'z', angle: -1.48353 },
      { tag: 'fwhk_l1', grp: 'fw', t0: 0.72, t1: 1, hinge: [5.71, 2.207, -5.625], axis: 'z', angle: 1.48353 },
      { tag: 'fwv_r', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [-1.45, 2.6498, 11.25], axis: 'x', angle: 1.53589 },
      { tag: 'fwvk_r0', grp: 'fw', t0: 0.72, t1: 1, hinge: [-1, 2.1581, 10.275], axis: 'z', angle: -1.53589 },
      { tag: 'fwvk_r1', grp: 'fw', t0: 0.72, t1: 1, hinge: [-1.9, 2.6073, 10.275], axis: 'z', angle: 1.53589 },
      { tag: 'fwh_r', grp: 'fw', t0: 0, t1: 0.7, hinge: [-6.15, 2.507, -6.9], axis: 'x', angle: -1.50098 },
      { tag: 'fwhk_r0', grp: 'fw', t0: 0.72, t1: 1, hinge: [-5.71, 2.207, -5.625], axis: 'z', angle: -1.48353 },
      { tag: 'fwhk_r1', grp: 'fw', t0: 0.72, t1: 1, hinge: [-6.59, 2.207, -5.625], axis: 'z', angle: 1.48353 },
    ],
  },
  // Möwe (asset-src/neu/moewe, moe-gelenke.json): „rampe“ öffnet Bug und Heck: Haube schwenkt um −92° nach oben, Bugrampe nach vorn unten
  // mit Verlängerung, Heckrampe aus der Schräge nach unten mit Verlängerung. „fw“: vier Beine klappen in die Kästen, die Füße gegenläufig
  // (verschachtelt unter dem Bein), Schachtklappen zuletzt; die Mantelrotoren schwenken im Flug nach vorn.
  Moewe: {
    dur: { rampe: 6.0, fw: 4.2 },
    parts: [
      { tag: 'bug', grp: 'rampe', t0: 0, t1: 0.45, hinge: [0, 8, 15], axis: 'x', angle: -1.606 },
      { tag: 'bugrampe', grp: 'rampe', t0: 0.35, t1: 0.8, hinge: [0, 2.4, 15.15], axis: 'x', angle: 2.247 },
      { tag: 'bugrampe2', grp: 'rampe', t0: 0.75, t1: 1, slide: [0, 3.425, -1.346], under: 'bugrampe' },
      { tag: 'rampe', grp: 'rampe', t0: 0.1, t1: 0.72, hinge: [0, 2.4, -14.25], axis: 'x', angle: -0.931 },
      { tag: 'rampe2', grp: 'rampe', t0: 0.67, t1: 0.96, slide: [0, 1.227, -1.554], under: 'rampe' },
      { tag: 'fwv_l', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [4.4, 3.5, 11], axis: 'x', angle: 1.571 },
      { tag: 'fpv_l', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [4.6, 0.62, 11], axis: 'x', angle: -1.571, under: 'fwv_l' },
      { tag: 'fwh_l', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [4.4, 3.5, -9.6], axis: 'x', angle: -1.571 },
      { tag: 'fph_l', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [4.6, 0.62, -9.6], axis: 'x', angle: 1.571, under: 'fwh_l' },
      { tag: 'fwvk_l0', grp: 'fw', t0: 0.72, t1: 1, hinge: [3.6, 2.85, 10.6], axis: 'z', angle: 1.536 },
      { tag: 'fwvk_l1', grp: 'fw', t0: 0.72, t1: 1, hinge: [5.25, 2.85, 10.6], axis: 'z', angle: -1.536 },
      { tag: 'fwhk_l0', grp: 'fw', t0: 0.72, t1: 1, hinge: [3.6, 2.85, -8.25], axis: 'z', angle: 1.536 },
      { tag: 'fwhk_l1', grp: 'fw', t0: 0.72, t1: 1, hinge: [5.25, 2.85, -8.25], axis: 'z', angle: -1.536 },
      { tag: 'fwv_r', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [-4.4, 3.5, 11], axis: 'x', angle: 1.571 },
      { tag: 'fpv_r', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [-4.6, 0.62, 11], axis: 'x', angle: -1.571, under: 'fwv_r' },
      { tag: 'fwh_r', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [-4.4, 3.5, -9.6], axis: 'x', angle: -1.571 },
      { tag: 'fph_r', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [-4.6, 0.62, -9.6], axis: 'x', angle: 1.571, under: 'fwh_r' },
      { tag: 'fwvk_r0', grp: 'fw', t0: 0.72, t1: 1, hinge: [-3.6, 2.85, 10.6], axis: 'z', angle: -1.536 },
      { tag: 'fwvk_r1', grp: 'fw', t0: 0.72, t1: 1, hinge: [-5.25, 2.85, 10.6], axis: 'z', angle: 1.536 },
      { tag: 'fwhk_r0', grp: 'fw', t0: 0.72, t1: 1, hinge: [-3.6, 2.85, -8.25], axis: 'z', angle: -1.536 },
      { tag: 'fwhk_r1', grp: 'fw', t0: 0.72, t1: 1, hinge: [-5.25, 2.85, -8.25], axis: 'z', angle: 1.536 },
      { tag: 'rot_l', grp: 'fw', t0: 0.1, t1: 0.9, hinge: [10.5, 9.95, 2.4], axis: 'x', angle: 1.571 },
      { tag: 'rot_r', grp: 'fw', t0: 0.1, t1: 0.9, hinge: [-10.5, 9.95, 2.4], axis: 'x', angle: 1.571 },
    ],
  },
  // Dohle (asset-src/neu/dohle, doh-gelenke.json): Heckrampe bis zum Boden, Tür mit Treppe (nur bei ausgefahrenem Fahrwerk), Fahrwerk
  Dohle: {
    dur: { rampe: 3.5, tuer: 2.4, fw: 3.6 }, boden: ['tuer'],
    parts: [
      { tag: 'rampe', grp: 'rampe', t0: 0, t1: 1, hinge: [0, 1.5, -6.46], axis: 'x', angle: -2.22344 },
      { tag: 'tuer', grp: 'tuer', t0: 0, t1: 1, hinge: [1.6538, 1.62, 1.1], axis: 'z', angle: -2.44346 },
      { tag: 'fwn', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [0, 2.08, 6.55], axis: 'x', angle: 1.6057 },             // Bugbein fährt nach hinten ein
      { tag: 'fwnk_l', grp: 'fw', t0: 0.72, t1: 1, hinge: [0.3, 1.5795, 5.625], axis: 'z', angle: -1.53589 },
      { tag: 'fwnk_r', grp: 'fw', t0: 0.72, t1: 1, hinge: [-0.3, 1.5795, 5.625], axis: 'z', angle: 1.53589 },
      { tag: 'fwh_l', grp: 'fw', t0: 0, t1: 0.7, hinge: [2.05, 2.2, -2.05], axis: 'x', angle: 1.53589 },          // Hauptbeine fahren nach hinten in die Wülste
      { tag: 'fwh_r', grp: 'fw', t0: 0, t1: 0.7, hinge: [-2.05, 2.2, -2.05], axis: 'x', angle: 1.53589 },
      { tag: 'fwhk_la', grp: 'fw', t0: 0.72, t1: 1, hinge: [2.35, 1.2376, -3.1], axis: 'z', angle: -1.53589 },
      { tag: 'fwhk_li', grp: 'fw', t0: 0.72, t1: 1, hinge: [1.75, 1.2376, -3.1], axis: 'z', angle: 1.53589 },
      { tag: 'fwhk_ra', grp: 'fw', t0: 0.72, t1: 1, hinge: [-1.75, 1.2376, -3.1], axis: 'z', angle: -1.53589 },
      { tag: 'fwhk_ri', grp: 'fw', t0: 0.72, t1: 1, hinge: [-2.35, 1.2376, -3.1], axis: 'z', angle: 1.53589 },
    ],
  },
  // Milan (asset-src/neu/milan, mil-gelenke.json): Heckklappe des Frachtfachs, Bordleiter mit Klappe, einziehbares Fahrwerk
  Milan: {
    dur: { fracht: 1.6, leiter: 2.2, fw: 3.2 }, boden: ['leiter'],
    parts: [
      { tag: 'fracht', grp: 'fracht', t0: 0, t1: 1, hinge: [0, 3.695, -7.014], axis: 'x', angle: 1.74533 },
      { tag: 'luke', grp: 'leiter', t0: 0, t1: 0.3, hinge: [0.9308, 1.98, 2.95], axis: 'z', angle: -1.74533, inv: true },
      { tag: 'leiter', grp: 'leiter', t0: 0.25, t1: 0.95, slide: [-0.4392, 1.6327, 0], retract: true },
      { tag: 'fwn', grp: 'fw', t0: 0.05, t1: 0.72, hinge: [0, 1.92, 5], axis: 'x', angle: 1.62316 },             // Bugrad fährt nach hinten ein
      { tag: 'fwnk_l', grp: 'fw', t0: 0.72, t1: 1, hinge: [0.235, 1.6889, 4.07], axis: 'z', angle: -1.53589 },   // Bugradklappen schließen zuletzt
      { tag: 'fwnk_r', grp: 'fw', t0: 0.72, t1: 1, hinge: [-0.235, 1.6889, 4.07], axis: 'z', angle: 1.53589 },
      { tag: 'fwh_l', grp: 'fw', t0: 0, t1: 0.7, hinge: [1.355, 1.98, -2.25], axis: 'x', angle: -1.53589 },       // Haupträder fahren nach vorn ein
      { tag: 'fwh_r', grp: 'fw', t0: 0, t1: 0.7, hinge: [-1.355, 1.98, -2.25], axis: 'x', angle: -1.53589 },
      { tag: 'fwhk_l', grp: 'fw', t0: 0.72, t1: 1, hinge: [1.57, 1.8336, -0.53], axis: 'z', angle: -1.53589 },
      { tag: 'fwhk_r', grp: 'fw', t0: 0.72, t1: 1, hinge: [-1.57, 1.8336, -0.53], axis: 'z', angle: 1.53589 },
    ],
  },
};
interface DoorRig { cfg: DoorCfg; p: Record<string, number>; init: boolean; parts: { d: DoorPart; pivot: THREE.Object3D }[] }
const ease = (t: number) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const modelOf = (root: THREE.Object3D) => { let name = ''; root.traverse(o => { if (!name && o.userData.model) name = o.userData.model; }); return name; };
const glbRootOf = (o: THREE.Object3D) => { let p = o.parent; while (p && !p.userData.glbRoot) p = p.parent; return p; };
// Gelenke anlegen: die getaggten Netze jeder Fassung (Nah- und Fernmodell) an eigene Gelenke hängen (weltlagetreu, attach: die komprimierten
// Netze hängen an eigenen Knoten mit Verschiebung und Maßstab der Quantisierung)
function rigParts(root: THREE.Object3D, parts: DoorPart[]) {
  const by = new Map<THREE.Object3D, Record<string, THREE.Mesh[]>>();
  root.traverse((o: any) => {
    if (!o.isMesh) return; const m = /\|(\w+)$/.exec(o.material?.name || ''); if (!m) return;
    const gr = glbRootOf(o); if (!gr) return; let rec = by.get(gr); if (!rec) by.set(gr, (rec = {}));
    (rec[m[1]] = rec[m[1]] || []).push(o);
  });
  root.updateMatrixWorld(true);
  const out: { d: DoorPart; pivot: THREE.Object3D }[] = [];
  for (const [gr, meshes] of by) {
    const pivots: Record<string, THREE.Object3D> = {};
    for (const d of parts) {
      const list = meshes[d.tag]; if (!list?.length) continue;
      const base = d.under ? pivots[d.under] : null, pivot = new THREE.Object3D(); pivot.name = 'Gelenk ' + d.tag;
      if (base) {      // unter einem Gelenk: Verschiebung im Rahmen des Elterngelenks; ein eigenes Drehgelenk (Fuß am Bein) sitzt um den Abstand der Achsen versetzt
        base.add(pivot); const bh = parts.find(p => p.tag === d.under)?.hinge;
        if (d.hinge && bh) pivot.position.set(d.hinge[0] - bh[0], d.hinge[1] - bh[1], d.hinge[2] - bh[2]);
      } else { gr.add(pivot); pivot.position.set(...((d.hinge || [0, 0, 0]) as [number, number, number])); }
      pivot.updateMatrixWorld(true);
      for (const m of list) pivot.attach(m);
      pivots[d.tag] = pivot; out.push({ d, pivot });
    }
  }
  return out;
}
function rigDoors(root: THREE.Object3D, fw = false): DoorRig | null {
  const cfg = DOORS[modelOf(root)]; if (!cfg) return null;
  const parts = cfg.parts.filter(d => (d.grp === 'fw') === fw); if (!parts.length) return null;
  if (fw) fahrwerkTiefe(root);      // Landehöhe messen, solange das Fahrwerk noch in der gebauten Lage hängt
  return { cfg, p: {}, init: false, parts: rigParts(root, parts) };
}
function stellen(rig: DoorRig, target: (grp: string) => number, dt: number) {
  const step = rig.init ? Math.min(0.1, dt) : 1e9; rig.init = true;
  for (const g of Object.keys(rig.cfg.dur)) {
    const cur = rig.p[g] ?? target(g), want = target(g), d = step / rig.cfg.dur[g];
    rig.p[g] = want > cur ? Math.min(want, cur + d) : Math.max(want, cur - d);
  }
  for (const { d, pivot } of rig.parts) {
    const k = ease((rig.p[d.grp] - d.t0) / (d.t1 - d.t0));
    if (d.angle !== undefined) { const a = d.angle * (d.inv ? 1 - k : k); pivot.rotation.set(0, 0, 0); pivot.rotation[d.axis || 'x'] = a; }
    if (d.slide) {
      const f = d.retract ? 1 - k : k; pivot.position.set(d.slide[0] * f, d.slide[1] * f, d.slide[2] * f);      // unter einem Gelenk: im Rahmen des Gelenks
      if (d.retract) pivot.visible = rig.p[d.grp] > d.t0;      // eingezogene Leiter steckt im Schacht hinter dem Deckel
    }
  }
}
// Fahrwerk: im Flug eingezogen, am Boden ausgefahren. Modelle mit Fahrwerksgelenken (Milan) fahren es aus und ein (dt = Spielzeit des Bildes,
// beim ersten Aufruf sofort im Zielzustand); ältere Modelle blenden die Netze mit dem Material „gear“ nur ein und aus.
export function setGear(root: THREE.Object3D, down: boolean, dt = 0) {
  root.userData.zGear = down;      // gewünschter Zustand (Mehrspieler: net.ts schickt ihn mit)
  let rig = root.userData.gearRig as DoorRig | null | undefined;
  if (rig === undefined) rig = root.userData.gearRig = rigDoors(root, true);
  if (rig) { stellen(rig, g => (g === 'fw' ? (down ? 0 : 1) : (rig!.p[g] ?? 0)), dt); return; }
  let list = root.userData.gear as THREE.Object3D[] | undefined;
  if (!list) { list = []; root.traverse((o: any) => { if (o.isMesh && o.material?.name === 'gear') list!.push(o); }); root.userData.gear = list; }
  for (const o of list) o.visible = down;
}
/** Fahrwerk ganz ausgefahren? (Modelle ohne Gelenke: sobald es gewünscht ist) */
export function gearDown(root: THREE.Object3D) { const rig = root.userData.gearRig as DoorRig | null | undefined; return rig ? (rig.p.fw ?? 1) < 0.02 : !!root.userData.zGear; }
/** Modell mit eigener Bordleiter (dann hängt das Spiel keine an die Kanzel, ausstieg.ts) */
export const eigeneLeiter = (root: THREE.Object3D) => !!DOORS[modelOf(root)]?.boden?.includes('leiter');
// Stand einer Gruppe (0 zu … 1 offen), z. B. ob die Rampe ganz offen ist
export function doorProgress(root: THREE.Object3D, grp: string) { const rig = root.userData.doors as DoorRig | null | undefined; return rig ? rig.p[grp] ?? 0 : 0; }
// Heckrampe zum Betreten ohne Taste (Schiffskoordinaten wie die Laufkarte: Nase −Z): Türebene, Fuß der offenen Rampe, halbe Breite.
// RAMP.want schaltet der Rampenschalter (innen am Laderaum, außen am Rampenfuß); im Hangar öffnet die Rampe, solange want gilt.
// Heckrampen, über die man zu Fuß hinein- und hinausgeht (Hangar und gelandet auf Planeten, interior.ts rampTransit): door Innenkante, foot Rampenspitze (z, Schiffskoordinaten), hw halbe Breite
export const RAMP_ENTRY: Record<string, { door: number; foot: number; hw: number }> = { Wisent: { door: 41.39, foot: 49.9, hw: 3.7 }, Kormoran: { door: 21.4, foot: 27.6, hw: 2.1 }, Kranich: { door: 15.37, foot: 19.96, hw: 1.5 }, Moewe: { door: 11.839, foot: 20.5, hw: 2.85 } };      // Dohle: kein begehbarer Innenraum (hasInterior ab 30 m)
export const RAMP = { want: true };
// Öffnen oder schließen (jedes Bild aufrufen, dt = Spielzeit des Bildes): beim ersten Aufruf sofort im Zielzustand, danach mit der Dauer aus DOORS.
// Gruppen in boden (Bordleiter) öffnen nur bei ausgefahrenem Fahrwerk.
export function setDoors(root: THREE.Object3D, open: boolean, dt = 0) {
  root.userData.zDoors = open;
  let rig = root.userData.doors as DoorRig | null | undefined;
  if (rig === undefined) rig = root.userData.doors = rigDoors(root);
  if (!rig) return;
  const boden = rig.cfg.boden || [], unten = gearDown(root);
  stellen(rig, g => (g === 'fw' ? 0 : open && (!boden.includes(g) || unten) ? 1 : 0), dt);
}

// Koordinatensystem eines Modells im Spiel (für Innenmodelle, die deckungsgleich zum Außenmodell sitzen sollen):
// Modell um 180° gedreht, um innerPos verschoben, mit s × Länge skaliert
export const modelFrame = (name: string) => TPL[name]?.frame || null;

// ---------- Kanzel (seit 2026-11-25, Konzept docs/konzept-schiffe-fracht.md, Schritt 2) ----------
// Jäger und Elster steigen über die Kanzel aus. Die Modelle haben dafür kein eigenes bewegliches Teil, aber das Kanzelglas ist ein eigenes
// Material: Diese Netze hängen an einem Gelenk an der hinteren Oberkante des Glases und klappen vorn hoch. Venom: das ganze Glas ist ein Stück.
const KANZEL: Record<string, { mats: string[]; angle: number; zMax?: number; hinge?: number[] }> = {
  Venom: { mats: ['glass_clear'], angle: 0.26, zMax: -1.2 },      // nur das Glas vor z = −1,2 m (über dem Cockpit), der Rest bleibt fest
  Wuerger: { mats: ['Schauglas (Spiel)'], angle: 0.95 },
  Elster: { mats: ['Kuppelglas (Spiel)'], angle: 1.05 },
  Milan: { mats: ['Kuppelglas (Spiel)'], angle: 0.62, hinge: [0, 3.4318, 1.49] },      // einteilige Blase, Gelenk am hinteren Rahmen (mil-gelenke.json)
};
interface KanzelRig { pivots: THREE.Object3D[]; angle: number; p: number; box: THREE.Box3 }
function rigKanzel(root: THREE.Object3D): KanzelRig | null {
  const cfg = KANZEL[modelOf(root)]; if (!cfg) return null;
  let all: THREE.Mesh[] = []; root.traverse((o: any) => { if (o.isMesh && cfg.mats.includes(o.material?.name)) all.push(o); });
  if (!all.length) return null;
  root.updateMatrixWorld(true);
  if (cfg.zMax !== undefined) all = all.map(m => kanzelTeil(m, root, cfg.zMax!)).filter(Boolean) as THREE.Mesh[];
  const by = new Map<THREE.Object3D, THREE.Mesh[]>();
  for (const m of all) { const gr = glbRootOf(m); if (!gr) continue; let l = by.get(gr); if (!l) by.set(gr, (l = [])); l.push(m); }
  if (!by.size) return null;
  const rinv = new THREE.Matrix4().copy(root.matrixWorld).invert(), pivots: THREE.Object3D[] = []; let box: THREE.Box3 | null = null, angle = 0;
  for (const [gr, glas] of by) {
    const ginv = new THREE.Matrix4().copy(gr.matrixWorld).invert(), gb = new THREE.Box3(), sb = new THREE.Box3();
    for (const m of glas) { m.geometry.computeBoundingBox(); gb.union(m.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(ginv, m.matrixWorld))); sb.union(m.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(rinv, m.matrixWorld))); }
    const list = glas.concat(kanzelStreben(root, glas, sb, cfg.mats, 0.12, gr));      // Streben und Rahmen am Glas gehen mit
    // Nase im Rahmen der GLB-Datei: Schiffs-Nase ist −Z im Spiel
    const nose = new THREE.Vector3(0, 0, -1).transformDirection(root.matrixWorld).transformDirection(ginv);
    const front = nose.z >= 0 ? 1 : -1, pivot = new THREE.Object3D(); pivot.name = 'Gelenk Kanzel';
    gr.add(pivot);
    if (cfg.hinge) pivot.position.set(cfg.hinge[0], cfg.hinge[1], cfg.hinge[2]);
    else pivot.position.set((gb.min.x + gb.max.x) / 2, gb.max.y, front > 0 ? gb.min.z : gb.max.z);
    pivot.updateMatrixWorld(true);
    for (const m of list) pivot.attach(m);
    pivots.push(pivot); box = box || sb; angle = -front * cfg.angle;      // vorn hoch: um x mit dem Vorzeichen gegen die Nasenrichtung
  }
  return { pivots, angle, p: 0, box: box! };
}
// Netz in zwei teilen: Dreiecke, für die pred (Ecken in Schiffskoordinaten) gilt, kommen in ein neues Netz (eigene Kopie der Geometrie)
function teilen(m: THREE.Mesh, root: THREE.Object3D, pred: (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => boolean): THREE.Mesh | null {
  const g = m.geometry, p = g.attributes.position; if (!p) return null;
  const idx = g.index ? Array.from(g.index.array as ArrayLike<number>) : Array.from({ length: p.count }, (_, i) => i);
  const M = new THREE.Matrix4().multiplyMatrices(new THREE.Matrix4().copy(root.matrixWorld).invert(), m.matrixWorld);
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), ja: number[] = [], nein: number[] = [];
  for (let t = 0; t + 2 < idx.length; t += 3) {
    A.fromBufferAttribute(p, idx[t]).applyMatrix4(M); B.fromBufferAttribute(p, idx[t + 1]).applyMatrix4(M); C.fromBufferAttribute(p, idx[t + 2]).applyMatrix4(M);
    (pred(A, B, C) ? ja : nein).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  if (!ja.length) return null;
  const gv = g.clone(); gv.setIndex(ja); const gr = g.clone(); gr.setIndex(nein); m.geometry = gr;
  const k = new THREE.Mesh(gv, m.material); k.matrixAutoUpdate = m.matrixAutoUpdate; k.position.copy(m.position); k.quaternion.copy(m.quaternion); k.scale.copy(m.scale); k.matrix.copy(m.matrix);
  m.parent!.add(k); k.updateMatrixWorld(true); return k;
}
// Glas teilen: Dreiecke mit dem Schwerpunkt vor zMax (Schiffskoordinaten) werden die Kanzel
const kanzelTeil = (m: THREE.Mesh, root: THREE.Object3D, zMax: number) => teilen(m, root, (a, b, c) => (a.z + b.z + c.z) / 3 < zMax);
// Streben und Rahmen der Kanzel: alle übrigen Flächen (außer dem restlichen Glas), deren Schwerpunkt höchstens 12 cm vom Kanzelglas entfernt
// und über dem Kanzelrand liegt. Die Modelle haben dafür kein eigenes Teil; so geht der Rahmen mit dem Glas auf, Sitze und Rumpf bleiben.
function kanzelStreben(root: THREE.Object3D, glas: THREE.Mesh[], sb: THREE.Box3, glasMats: string[], abst = 0.12, scope: THREE.Object3D = root): THREE.Mesh[] {
  const rinv = new THREE.Matrix4().copy(root.matrixWorld).invert(), tris: THREE.Triangle[] = [], grid = new Map<string, number[]>(), Z = 0.3;
  const cell = (x: number, y: number, z: number) => Math.floor(x / Z) + ',' + Math.floor(y / Z) + ',' + Math.floor(z / Z);
  for (const m of glas) {
    const g = m.geometry, p = g.attributes.position, M = new THREE.Matrix4().multiplyMatrices(rinv, m.matrixWorld);
    const idx = g.index ? (g.index.array as ArrayLike<number>) : Array.from({ length: p.count }, (_, i) => i);
    for (let t = 0; t + 2 < idx.length; t += 3) {
      const tr = new THREE.Triangle(new THREE.Vector3().fromBufferAttribute(p, idx[t]).applyMatrix4(M), new THREE.Vector3().fromBufferAttribute(p, idx[t + 1]).applyMatrix4(M), new THREE.Vector3().fromBufferAttribute(p, idx[t + 2]).applyMatrix4(M));
      const i = tris.push(tr) - 1, bb = new THREE.Box3().setFromPoints([tr.a, tr.b, tr.c]).expandByScalar(abst);
      for (let x = Math.floor(bb.min.x / Z); x <= Math.floor(bb.max.x / Z); x++) for (let y = Math.floor(bb.min.y / Z); y <= Math.floor(bb.max.y / Z); y++) for (let z = Math.floor(bb.min.z / Z); z <= Math.floor(bb.max.z / Z); z++) {
        const k = x + ',' + y + ',' + z; let l = grid.get(k); if (!l) grid.set(k, (l = [])); l.push(i);
      }
    }
  }
  const nah = sb.clone().expandByScalar(abst + 0.05), sill = sb.min.y + 0.03, glasSet = new Set(glas), q = new THREE.Vector3(), c = new THREE.Vector3(), out: THREE.Mesh[] = [], kand: THREE.Mesh[] = [];
  scope.traverse((o: any) => {
    if (!o.isMesh || glasSet.has(o) || glasMats.includes(o.material?.name) || !o.geometry?.attributes?.position || /\|\w+$/.test(o.material?.name || '')) return;
    o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(rinv, o.matrixWorld));
    if (bb.intersectsBox(nah)) kand.push(o);
  });
  for (const o of kand) {
    const k = teilen(o, root, (a, b, d) => {
      c.copy(a).add(b).add(d).multiplyScalar(1 / 3);
      if (c.y < sill || !nah.containsPoint(c)) return false;
      const l = grid.get(cell(c.x, c.y, c.z)); if (!l) return false;
      for (const i of l) if (tris[i].closestPointToPoint(c, q).distanceToSquared(c) < abst * abst) return true;
      return false;
    });
    if (k) out.push(k);
  }
  return out;
}
const kRig = (root: THREE.Object3D) => { let r = root.userData.kanzel as KanzelRig | null | undefined; if (r === undefined) r = root.userData.kanzel = rigKanzel(root); return r; };
/** Kanzel öffnen oder schließen (jedes Bild, dt = Spielzeit); 1,2 s für den ganzen Weg */
export function setKanzel(root: THREE.Object3D, open: boolean, dt = 0) {
  root.userData.zKanzel = open;
  const r = kRig(root); if (!r) return;
  r.p = Math.max(0, Math.min(1, r.p + (open ? 1 : -1) * Math.min(0.1, dt) / 1.2));
  for (const pv of r.pivots) pv.rotation.x = r.angle * ease(r.p);
}
/** Lage des Kanzelglases im Schiff (Schiffskoordinaten: Nase −Z, oben +Y) und wie weit sie offen ist; null = keine Kanzel */
export function kanzelInfo(root: THREE.Object3D): { box: THREE.Box3; p: number } | null { const r = kRig(root); return r ? { box: r.box, p: r.p } : null; }

/** tiefster Punkt des Fahrwerks (ausgefahren) in Schiffskoordinaten, als positive Höhe über dem Boden; null = Modell ohne Fahrwerk */
export function fahrwerkTiefe(root: THREE.Object3D): number | null {
  if (root.userData.fwTiefe !== undefined) return root.userData.fwTiefe;
  const list: THREE.Mesh[] = []; root.traverse((o: any) => { if (o.isMesh && (o.material?.name === 'gear' || /\|fw/.test(o.material?.name || '')) && !o.parent?.name?.startsWith('Gelenk')) list.push(o); });
  if (!list.length) return (root.userData.fwTiefe = null);
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(); let y = 0;
  for (const m of list) { m.geometry.computeBoundingBox(); y = Math.min(y, m.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)).min.y); }
  return (root.userData.fwTiefe = y < -0.3 ? -y : null);
}
