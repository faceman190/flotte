import * as THREE from 'three';
import { glowMat } from '../core/engine';
import { decoLaden, decoVorlage, prep } from './bojen';

// =====================================================================================
// Bodenfahrzeuge aus Blender (seit 2026-11-24), beide im Hintergrund-Paket (asset-src/neu/rover → deco/<Name>):
//  - Bergbaurover „Dachs“ R-4 (rv_bau.py → deco/Rover): sechs Räder, Bohrer, Erzmulde. Jeder Pilot hat ihn.
//  - Erkundungsbuggy „Wiesel“ E-2 (bg_bau.py → deco/Wiesel): vier Räder, offener Käfig, Sensormast mit drehender Radarleiste. Werft.
// Netze heißen <Teil>__<Gruppe>: Aufbau (starr), Rad_VL … Rad_HR, Bohrer bzw. Sensor. Hier bekommt jedes Rad einen eigenen Drehpunkt in der
// Nabe (aufgehängt: federt, die Vorderräder lenken; darin dreht sich das Rad); der Bohrer dreht um seine Längsachse (z), der Sensor um y.
// Spielachsen: x rechts, y oben, −z vorn; Ursprung am Boden unter der Fahrzeugmitte. Blender (x, y, z) → Spiel (x, z, −y).
// =====================================================================================

export type FzId = 'dachs' | 'wiesel';
export const FZ_IDS: FzId[] = ['dachs', 'wiesel'];
// Fahrwerte je Fahrzeug (surface.ts updateRover). v/vB: Höchsttempo ohne/mit Umschalt (m/s), eng/engB: Zugkraft (m/s²), grip/gripEis: Seitenführung,
// lat/latEis: größte Querbeschleunigung, steer: größter Lenkeinschlag (nimmt bis steerRef um steerFade ab), wb: Radstand, trk: Spur,
// ax: Achsen (Spiel-z), susp: Federweg (aus, ein), jump: Absprung an Kuppen (k: wie viel schneller als die Schwerkraft der Boden wegfallen muss,
// vy: wie schnell, v: ab welchem Tempo, abs: was die Federung an Kanten schluckt, m/s), lean/squat: Neigen in der Kurve, Einnicken; cap: Erzladung (0 = kein Bohrer); cam: Abstand und Höhe der Kamera
export interface FzDef {
  n: string; kurz: string; glb: string; d: string; price: number;
  radR: number; wb: number; trk: number; ax: number[];
  v: number; vB: number; eng: number; engB: number; brake: number; grip: number; gripEis: number; lat: number; latEis: number;
  steer: number; steerFade: number; steerRef: number; susp: [number, number]; jump: { k: number; vy: number; v: number; abs: number };
  lean: number; squat: number; cap: number; cam: [number, number]; drag: number;
}
export const FZ: Record<FzId, FzDef> = {
  dachs: {
    n: 'Bergbaurover „Dachs“ R-4', kurz: 'Dachs', glb: 'Rover', price: 6500,
    d: 'Schwerer Bergbaurover mit Druckkabine, sechs Rädern und Schneckenbohrer. Bohrt Lagerstätten an und fasst 40 Einheiten Erz. Jede Planetenbasis verleiht einen; ein eigener fährt in Pfeil oder Wisent überall mit.',
    radR: 0.75, wb: 4.1, trk: 3.2, ax: [-2.05, 0, 2.05],
    v: 24, vB: 33, eng: 7, engB: 9, brake: 15, grip: 7.5, gripEis: 3.5, lat: 8, latEis: 5.5,
    steer: 0.55, steerFade: 0.45, steerRef: 24, susp: [-0.32, 0.26], jump: { k: 4, vy: -5, v: 14, abs: 2.0 },
    lean: 0.006, squat: 0.025, cap: 40, cam: [13, 5.5], drag: 0.0045,
  },
  wiesel: {
    n: 'Erkundungsbuggy „Wiesel“ E-2', kurz: 'Wiesel', glb: 'Wiesel', price: 9500,
    d: 'Leichter offener Buggy für zwei: schnell, wendig, springt über Kuppen. Kein Bohrer, dafür ein Sensormast: [R] tastet 1,6 km um den Buggy nach Lagerstätten, Kisten, Wracks und Stollen ab.',
    radR: 0.52, wb: 2.8, trk: 2.04, ax: [-1.42, 1.38],
    v: 33, vB: 44, eng: 10, engB: 13, brake: 19, grip: 9, gripEis: 4.2, lat: 10, latEis: 6.5,
    steer: 0.6, steerFade: 0.4, steerRef: 33, susp: [-0.28, 0.16], jump: { k: 3.5, vy: -4.5, v: 12, abs: 1.4 },
    lean: 0.009, squat: 0.035, cap: 0, cam: [9.5, 4.2], drag: 0.0035,
  },
};
export const normFz = (k: unknown): FzId => (k === 'wiesel' ? 'wiesel' : 'dachs');

export interface RoverRad { mount: THREE.Object3D; spin: THREE.Object3D; rest: THREE.Vector3; front: boolean; side: number }
export interface RoverNeu {
  g: THREE.Group; body: THREE.Group; wheels: THREE.Object3D[]; drill: THREE.Object3D; beacon: THREE.Sprite; head: { intensity: number };
  rads: RoverRad[]; neu: true; kind: FzId;
  sensor: THREE.Object3D | null;       // Wiesel: Radarleiste (dreht um y)
  seat: THREE.Vector3 | null;          // Wiesel: Sitzpunkt des Fahrers (Hüfte) und Lenkradmitte (Spielachsen, im body)
  wheel: THREE.Vector3 | null;
}
export const fzBereit = (k: FzId) => !!decoVorlage(FZ[k].glb);
export const fzLaden = (k: FzId) => decoLaden(FZ[k].glb);
export const roverBereit = () => fzBereit('dachs');
export const roverLaden = () => fzLaden('dachs');
export const RAD_R = 0.75;

// Leuchtpunkte je Fahrzeug (Lage aus rv-anker.json / bg-anker.json, umgerechnet in Spielachsen): weiß vorn, rot hinten, Rundumleuchte
const LICHT: Record<FzId, { w: number[][]; r: number[][]; b: number[] }> = {
  dachs: {
    w: [[-0.75, 3.2, -2.7, 0.9], [-0.25, 3.2, -2.7, 0.9], [0.25, 3.2, -2.7, 0.9], [0.75, 3.2, -2.7, 0.9], [-0.85, 1.42, -3.12, 1.4], [0.85, 1.42, -3.12, 1.4]],
    r: [[-1.05, 1.05, 3.25, 0.7], [1.05, 1.05, 3.25, 0.7]], b: [-0.6, 3.3, -1.0, 1.3],
  },
  wiesel: {
    w: [[-0.4, 1.79, -0.47, 0.55], [-0.2, 1.79, -0.47, 0.55], [0, 1.79, -0.47, 0.55], [0.2, 1.79, -0.47, 0.55], [0.4, 1.79, -0.47, 0.55], [-0.38, 0.64, -2.27, 0.8], [0.38, 0.64, -2.27, 0.8], [-0.66, 0.98, -1.15, 0.6], [0.66, 0.98, -1.15, 0.6]],
    r: [[-0.48, 0.78, 2.03, 0.45], [0.48, 0.78, 2.03, 0.45]], b: [-0.5, 1.86, 0.62, 0.8],
  },
};

export function buildFahrzeug(kind: FzId): RoverNeu | null {
  const t = decoVorlage(FZ[kind].glb); if (!t || !t.children[0]) return null;
  const inner = t.children[0]; t.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(inner.matrixWorld).invert();
  const parts: Record<string, { geo: THREE.BufferGeometry; mat: THREE.Material }[]> = {};
  inner.traverse((o: any) => {
    if (!o.isMesh) return;
    const nm = String(o.name.includes('__') ? o.name : o.parent?.name || o.name), teil = nm.split('__')[0] || 'Aufbau';
    const geo = o.geometry.clone();
    // gepackte Eckpunkte (meshopt) als Float32, damit sich die Lage einrechnen lässt
    for (const [k, a] of Object.entries(geo.attributes)) { const src = a as THREE.BufferAttribute, arr = new Float32Array(src.count * src.itemSize); for (let i = 0; i < src.count; i++) for (let c = 0; c < src.itemSize; c++) arr[i * src.itemSize + c] = src.getComponent(i, c); geo.setAttribute(k, new THREE.BufferAttribute(arr, src.itemSize)); }
    geo.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    (parts[teil] ||= []).push({ geo, mat: prep(o.material) });
  });
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  for (const p of parts.Aufbau || []) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = true; body.add(m); }
  // ein Teil um den Mittelpunkt seines Umrisses drehbar machen
  const pivot = (ps: { geo: THREE.BufferGeometry; mat: THREE.Material }[], into: THREE.Object3D, shadow = true) => {
    const box = new THREE.Box3(); for (const p of ps) { p.geo.computeBoundingBox(); box.union(p.geo.boundingBox!); }
    const c = box.getCenter(new THREE.Vector3());
    for (const p of ps) { p.geo.translate(-c.x, -c.y, -c.z); const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = shadow; into.add(m); }
    return c;
  };
  const rads: RoverRad[] = [];
  for (const nm of ['Rad_VL', 'Rad_VR', 'Rad_ML', 'Rad_MR', 'Rad_HL', 'Rad_HR']) {
    const ps = parts[nm]; if (!ps) continue;
    const mount = new THREE.Group(), spin = new THREE.Group(); mount.add(spin); body.add(mount);
    const c = pivot(ps, spin); mount.position.copy(c);
    rads.push({ mount, spin, rest: c.clone(), front: nm.startsWith('Rad_V'), side: nm.endsWith('L') ? -1 : 1 });
  }
  const drill = new THREE.Group();
  if (parts.Bohrer) drill.position.copy(pivot(parts.Bohrer, drill, false));
  body.add(drill);
  let sensor: THREE.Group | null = null;
  if (parts.Sensor) { sensor = new THREE.Group(); sensor.position.copy(pivot(parts.Sensor, sensor)); body.add(sensor); }
  const L = LICHT[kind];
  for (const [x, y, z, s] of L.w) { const l = new THREE.Sprite(glowMat(0xfff0d0, 0.85)); l.position.set(x, y, z); l.scale.setScalar(s); body.add(l); }
  for (const [x, y, z, s] of L.r) { const l = new THREE.Sprite(glowMat(0xff2a18, 0.8)); l.position.set(x, y, z); l.scale.setScalar(s); body.add(l); }
  const beacon = new THREE.Sprite(glowMat(0xffa030, 1)); beacon.position.set(L.b[0], L.b[1], L.b[2]); beacon.scale.setScalar(L.b[3]); body.add(beacon);
  const wz = kind === 'wiesel';
  return {
    g, body, wheels: rads.map(r => r.spin), drill, beacon, head: { intensity: 0 }, rads, neu: true, kind, sensor,
    seat: wz ? new THREE.Vector3(-0.34, 0.7, 0.1) : null, wheel: wz ? new THREE.Vector3(-0.34, 0.98, -0.56) : null,
  };
}
export const buildRoverNeu = () => buildFahrzeug('dachs');
