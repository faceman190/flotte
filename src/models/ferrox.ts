import * as THREE from 'three';
import { glowMat } from '../core/engine';
import { texMat, boxUV, buildEmissive } from '../core/textures';
import { mesh, alongZ, extrude } from './helpers';
import { stationTemplate } from './stationModels';
import { ferroxMaterials, kitMeta } from './kit';

// Ferrox: schwarzes, kantiges Metall mit leuchtend violetten Adern
export const FX = {
  chrome: texMat(0xffffff, 'ferrox', { metalness: 0.85, roughness: 0.25, emissive: 0x000000 }),
  dark: texMat(0x8a8a90, 'ferrox', { metalness: 0.9, roughness: 0.3, emissive: 0x000000 }),
  vio: new THREE.MeshBasicMaterial({ color: 0xb070ff }),
};
buildEmissive('ferrox', [FX.chrome, FX.dark]);

function buildDrone() {
  const g = new THREE.Group(), b = new THREE.Group();
  b.rotation.y = Math.PI; g.add(b);
  const body = alongZ(mesh(new THREE.ConeGeometry(1.7, 10, 4), FX.chrome, 0, 0, -0.5)); body.rotation.y = Math.PI / 4; b.add(body);
  for (const s of [-1, 1]) {
    const w = extrude([[s * 0.8, 1], [s * 7.5, -2.5], [s * 8.2, 1.2], [s * 1.2, 3.2]], 0.22, FX.chrome, 0.06); w.rotation.x = Math.PI / 2; b.add(w);
    const sp = mesh(new THREE.ConeGeometry(0.3, 3, 4), FX.dark, s * 7.9, 0, -1.5); sp.rotation.x = -Math.PI / 2; b.add(sp);
  }
  b.add(mesh(new THREE.BoxGeometry(2.6, 0.35, 0.4), FX.vio, 0, 0.55, -2.6));
  const eye = new THREE.Sprite(glowMat(0xb070ff, 0.9)); eye.position.set(0, 0.6, -2.8); eye.scale.setScalar(3.4); b.add(eye);
  const en = new THREE.Sprite(glowMat(0x9050ff, 0.9)); en.position.set(0, 0, 4.8); en.scale.setScalar(4); b.add(en);
  return g;
}
function buildBomber() {
  const g = new THREE.Group(), b = new THREE.Group();
  b.rotation.y = Math.PI; g.add(b);
  b.add(mesh(new THREE.BoxGeometry(7, 4, 16), FX.chrome, 0, 0, 1));
  const nose = alongZ(mesh(new THREE.ConeGeometry(3.6, 9, 4), FX.chrome, 0, 0, -11.5)); nose.rotation.y = Math.PI / 4; b.add(nose);
  for (const s of [-1, 1]) {
    b.add(alongZ(mesh(new THREE.CylinderGeometry(1.8, 1.8, 12, 6), FX.dark, s * 6, -0.5, 3)));
    const w = extrude([[s * 3, -4], [s * 13, 4], [s * 13, 7], [s * 3, 7]], 0.4, FX.chrome, 0.1); w.rotation.x = Math.PI / 2; b.add(w);
    const en = new THREE.Sprite(glowMat(0x9050ff, 0.9)); en.position.set(s * 6, -0.5, 9.6); en.scale.setScalar(6); b.add(en);
  }
  b.add(mesh(new THREE.BoxGeometry(5, 0.5, 0.5), FX.vio, 0, 1.2, -6.8));
  const eye = new THREE.Sprite(glowMat(0xb070ff, 0.9)); eye.position.set(0, 1.2, -7); eye.scale.setScalar(5); b.add(eye);
  return g;
}
// Ferrox-Bienenstock (Mutterschiff): setzt laufend Jäger aus. Seit 2026-11-18 das Blender-Modell (hive2, unten); der Zwanzigflächner bleibt Ersatz.
export function buildMother() {
  const hv = hive2();
  if (hv) { const c = hv.clone(); c.userData = { ...hv.userData, ring: new THREE.Object3D() }; c.rotation.y = Math.random() * Math.PI * 2; return c; }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.IcosahedronGeometry(55, 0), FX.chrome));
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(11, 80, 5), FX.dark);
    c.position.set(d[0] * 70, d[1] * 70, d[2] * 70);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]));
    g.add(c);
  }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(95, 5, 4, 10), FX.dark); ring.rotation.x = Math.PI / 2; g.add(ring);
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2, sp = new THREE.Sprite(glowMat(0xb070ff, 1)); sp.position.set(Math.cos(a) * 95, 0, Math.sin(a) * 95); sp.scale.setScalar(16); ring.add(sp); }
  const core = new THREE.Sprite(glowMat(0x8040ff, 0.45)); core.scale.setScalar(260); g.add(core);
  boxUV(g, 1 / 60);
  g.userData.ring = ring;
  return g;
}
// =====================================================================================
// Jäger, Fassung 2 (seit 2026-11-18): Schaumodell aus Blender (asset-src/neu/fxjaeger, fxj_export.py → station/Ferrox_Jaeger2 und
// Ferrox_Jaeger2Fern). Nahmodell mit Rumpf und zwei Greifarmen als Knoten (arm_r = Arm der Erbauer auf −X, arm_l = Ersatzarm auf +X),
// Fernmodell als ein Netz (THREE.LOD). Die Materialien fx2_* sind schlicht; Rost, Flecken und die violetten Adern rechnet der Shader hier
// aus der Lage im Modell (wie das Blender-Bild, nur ohne Texturen). Schüsse kommen aus der Schneidlanze (userData.muzzle, combat.ts).
// =====================================================================================
const FX2_NOISE = /* glsl */ `
varying vec3 vFxP;
float fxH(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float fxN(vec3 x) { vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fxH(i), fxH(i + vec3(1, 0, 0)), f.x), mix(fxH(i + vec3(0, 1, 0)), fxH(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(fxH(i + vec3(0, 0, 1)), fxH(i + vec3(1, 0, 1)), f.x), mix(fxH(i + vec3(0, 1, 1)), fxH(i + vec3(1, 1, 1)), f.x), f.y), f.z); }
`;
// Rostanteil, Aufhellung (die Blender-Farben sind fürs Studiolicht sehr dunkel) und Adern (Stärke, Dichte) je Material
// Drei Gruppen mit Eckfarben (die Einzelfarben, schon aufgehellt, stecken im Farbattribut; fxj_export.py): Platten der Erbauer mit Adern, Stahl, Menschenblech
const FX2: Record<string, { r: number; k: number; v?: [number, number] }> = {
  plat: { r: 0.5, k: 1, v: [1.3, 0.62] }, stahl: { r: 0.4, k: 1 }, blech: { r: 0.65, k: 1 },
};
const FX2_CACHE: Record<string, THREE.Material> = {};
function fx2Material(src: THREE.MeshStandardMaterial): THREE.Material {
  const key = src.name.replace(/^fx2_/, '').replace(/\.\d+$/, '');
  if (FX2_CACHE[key]) return FX2_CACHE[key];
  const p = FX2[key], m = src.clone();
  m.envMapIntensity = 0.7;
  if (key === 'ofenglut') m.emissiveIntensity *= 0.6;      // Glutfenster des Bienenstocks: mit dem Glanz des Spiels sonst zu grell
  if (key === 'ferrit') { m.color.setRGB(0.05, 0.02, 0.08); m.emissive.setRGB(0.3, 0.08, 0.6); m.emissiveIntensity = 0.25; m.roughness = 0.2; m.metalness = 0; }
  if (!p) return (FX2_CACHE[key] = m);
  m.color.multiplyScalar(p.k); m.vertexColors = true;
  const R = p.r.toFixed(3), V = p.v ? p.v[0].toFixed(2) : '0.0', VD = p.v ? p.v[1].toFixed(2) : '0.0';
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = 'varying vec3 vFxP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFxP = position;');
    sh.fragmentShader = FX2_NOISE + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
float fxR = smoothstep(0.5, 0.68, fxN(vFxP * vec3(5.5, 0.55, 5.5))) * mix(0.15, 1.0, smoothstep(0.4, 0.6, fxN(vFxP * 0.35 + 7.0))) * ${R};
vec3 fxRc = mix(vec3(0.2, 0.075, 0.028), vec3(0.09, 0.03, 0.01), fxN(vFxP * 9.0));
diffuseColor.rgb = mix(diffuseColor.rgb * (0.82 + 0.36 * fxN(vFxP * 1.4)), fxRc, fxR);`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.9, fxR);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.1, fxR);')
      .replace('#include <emissivemap_fragment>', p.v ? `#include <emissivemap_fragment>
{ float fxV = fxN(vFxP * 1.1 + vec3(fxN(vFxP * 2.0)) * 0.6);
  float fxL = (1.0 - smoothstep(0.0, 0.025, abs(fxV - 0.5))) * clamp(1.0 - fwidth(fxV) * 25.0, 0.0, 1.0);
  totalEmissiveRadiance += vec3(0.55, 0.16, 1.0) * fxL * smoothstep(${VD}, ${VD} + 0.07, fxN(vFxP * 0.42)) * ${V}; }` : '#include <emissivemap_fragment>');
  };
  m.customProgramCacheKey = () => 'fx2|' + R + '|' + V + '|' + VD;
  return (FX2_CACHE[key] = m);
}
const FX2_PIVOT: Record<string, number[]> = { arm_r: [-3.85, -0.85, 2.4], arm_l: [3.95, -0.9, 2.3] };      // Schultern (fxj-spiel.json)
const FX2_MUZZLE = new THREE.Vector3(-2.3, -1.38, 7.15), FX2_NOZZLES = [[-0.55, 0.02, -11.4, 1.0], [0.95, 0.12, -10.8, 0.65]], FX2_LENS = [0.1, 0.6, 5.0];
let JAEGER2: THREE.Object3D | null = null;
function jaeger2(): THREE.Object3D | null {
  if (JAEGER2) return JAEGER2;
  const near = stationTemplate('Ferrox_Jaeger2'), far = stationTemplate('Ferrox_Jaeger2Fern');
  if (!near || !near.children[0]) return null;
  const prep = (t: THREE.Object3D) => {
    const inner = t.children[0].clone(true); inner.position.set(0, 0, 0);      // Ursprung der Datei = Rumpfmitte
    inner.traverse((o: any) => { if (o.isMesh && o.material?.name?.startsWith('fx2_')) o.material = fx2Material(o.material); });
    // Drehpunkte der Greifer: Das Packen (Quantisierung) schreibt Verschiebung und Maßstab in die Knoten der Arme, ihr Ursprung liegt dann
    // nicht mehr an der Schulter. Deshalb hängt jeder Arm unter einem eigenen Gelenk an der Schulter, das combat.ts dreht.
    for (const [name, p] of Object.entries(FX2_PIVOT)) {
      const n = inner.getObjectByName(name); if (!n || !n.parent) continue;
      const j = new THREE.Group(); j.name = name; n.name = name + '_netz'; j.position.set(p[0], p[1], p[2]);
      n.parent.add(j); n.position.sub(j.position); j.add(n);
    }
    return inner;
  };
  const lod = new THREE.LOD(), g = new THREE.Group();
  lod.addLevel(prep(near), 0);
  if (far && far.children[0]) lod.addLevel(prep(far), 300);
  g.add(lod);
  for (const [x, y, z, s] of FX2_NOZZLES) { const sp = new THREE.Sprite(glowMat(0xc8b8ff, 0.7)); sp.position.set(x, y, z - 0.3); sp.scale.setScalar(3.2 * s); g.add(sp); }
  const lens = new THREE.Sprite(glowMat(0xa070ff, 0.35)); lens.position.set(FX2_LENS[0], FX2_LENS[1], FX2_LENS[2] + 0.4); lens.scale.setScalar(2.2); g.add(lens);
  g.userData.muzzle = FX2_MUZZLE; g.userData.big = 1.1; g.userData.trailZ = -11.8;      // 23,6 m lang → im Spiel rund 26 m (wie der alte Jäger mit Faktor 1,6)
  return (JAEGER2 = g);
}

// =====================================================================================
// Bienenstock (seit 2026-11-18): Schmelzhütte aus Blender (asset-src/neu/fxbienen, fxb_export.py → station/Ferrox_Bienenstock und
// Ferrox_BienenstockFern), rund 400 m, Maul nach +Z. Materialien wie beim Jäger 2 (fx2Material). Glut im Maul, in den Schornsteinen und Schächten
// als Sprites; Trefferkugeln über die ganze Länge (userData.spheres), Jäger fallen aus den Startschächten (userData.launch), Schüsse aus dem Maul.
// Er dreht sich nicht (userData.still); der Ring des alten Modells ist hier ein leerer Knoten.
// =====================================================================================
const HV_MAW = [0, 1.9, 190], HV_WALL = [0, -1.5, 102.6];
const HV_CHUTES = [79.8, 54.72, 29.64, 4.56, -20.52, -45.6, -70.68, -95.76].map(z => [49.4, -26.7, z]);
const HV_NOZZLES = [[0, 6.08, -204.25], [-6.08, 0.38, -204.25], [5.7, -0.76, -204.25]];
const HV_CHIMNEYS = [[10.45, 56.42, 61.18], [-9.5, 51.76, 26.22], [9.5, 59.36, -8.74], [-8.55, 53.73, -43.7]];
let HIVE: THREE.Group | null = null;
function hive2(): THREE.Group | null {
  if (HIVE) return HIVE;
  const near = stationTemplate('Ferrox_Bienenstock'), far = stationTemplate('Ferrox_BienenstockFern');
  if (!near || !near.children[0]) return null;
  const prep = (t: THREE.Object3D) => {
    const inner = t.children[0].clone(true); inner.position.set(0, 0, 0);
    inner.traverse((o: any) => { if (o.isMesh && o.material?.name?.startsWith('fx2_')) o.material = fx2Material(o.material); });
    return inner;
  };
  const lod = new THREE.LOD(), g = new THREE.Group();
  lod.addLevel(prep(near), 0);
  if (far && far.children[0]) lod.addLevel(prep(far), 1600);
  g.add(lod);
  const glow = (p: number[], col: number, op: number, sc: number) => { const sp = new THREE.Sprite(glowMat(col, op)); sp.position.set(p[0], p[1], p[2]); sp.scale.setScalar(sc); g.add(sp); };
  glow([HV_MAW[0], HV_MAW[1] - 4, HV_MAW[2] - 30], 0xff7a2a, 0.35, 110);      // Schlund
  glow([HV_WALL[0], HV_WALL[1], HV_WALL[2] + 4], 0xff8a3a, 0.55, 70);         // Glutwand
  for (const p of HV_CHIMNEYS) glow([p[0], p[1] + 2, p[2]], 0xff8a3a, 0.55, 16);
  for (const p of HV_NOZZLES) glow([p[0], p[1], p[2] - 2], 0xc8b8ff, 0.7, 18);
  for (const p of HV_CHUTES) glow([p[0] - 4, p[1] + 6, p[2]], 0xff7a2a, 0.3, 18);
  g.userData.still = true;
  g.userData.maw = new THREE.Vector3(HV_MAW[0], HV_MAW[1] - 6, HV_MAW[2] + 8);
  g.userData.launch = HV_CHUTES.map(p => new THREE.Vector3(p[0] + 14, p[1] - 12, p[2]));
  // Trefferkugeln entlang der Rumpfachse (Kopf etwas dicker)
  g.userData.spheres = [-180, -135, -90, -45, 0, 45, 90, 135, 172].map(z => [0, -2, z, z > 100 ? 52 : z < -150 ? 34 : 46]);
  return (HIVE = g);
}

// Jäger nach dem Entwurf „Werkzeug, nicht Waffe“ (Alpha 1.11): verwilderte Schürfdrohne aus Blender (asset-src/neu/ferrox/jaeger_kit.py →
// station/Ferrox_Jaeger). Rumpf und zwei Greifarme als eigene Knoten (arm_r, arm_l, Ursprung an der Schulter; combat.ts bewegt sie).
// Seit 2026-11-18 ersetzt durch die Fassung 2 (oben); dieser bleibt Ersatz, falls deren Dateien fehlen. Ohne beide fliegt der Jäger aus Grundformen.
let JAEGER: THREE.Group | null = null;
export function ferroxDrone(): THREE.Object3D {
  const j2 = jaeger2();
  if (j2) { const c = j2.clone(); c.userData = { ...j2.userData }; return c; }
  if (!JAEGER) {
    const t = stationTemplate('Ferrox_Jaeger');
    if (t && t.children[0]) {
      const M = ferroxMaterials(), inner = t.children[0].clone(true);
      inner.position.set(0, 0, 0);                                   // die Vorlage ist auf ihre Mitte gerückt; hier zählt der Ursprung der Datei (Schwerpunkt des Rumpfs)
      inner.traverse((o: any) => { if (o.isMesh && M[o.material?.name]) o.material = M[o.material.name]; });
      const g = new THREE.Group(); g.add(inner);
      const eye = (kitMeta('Ferrox_Jaeger').lights || []).find(l => l.k === 'fxeye');
      const sp = new THREE.Sprite(glowMat(0xb070ff, 0.55)); sp.position.set(eye ? eye.p[0] : 0.15, eye ? eye.p[1] : 0.1, eye ? eye.p[2] : 4.8); sp.scale.setScalar(2.4); g.add(sp);
      JAEGER = g;
    }
  }
  return (JAEGER || DRONE_T).clone();
}
export const DRONE_T = buildDrone();
export const BOMBER_T = buildBomber();
boxUV(DRONE_T, 1 / 7);
boxUV(BOMBER_T, 1 / 11);
