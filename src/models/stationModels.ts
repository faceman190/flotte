import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { glowMat } from '../core/engine';
import { std } from '../core/textures';
import { applyKit, kitMeta, loadKitMeta, KIT_GLOW } from './kit';
import type { StructureModel } from './structures';

// KI-generierte Stationsmodelle als GLB-Dateien aus public/assets/station (scripts/build-stations.mjs → build-assets.mjs).
// Das Modell bildet den Rumpf; Landeplattform, Lauflichter und Positionslichter kommen weiterhin aus dem Spiel,
// damit Andocken überall gleich funktioniert. Kollision: Kugeln aus einem Raster über die Modellpunkte.

interface Tpl { group: THREE.Group; size: THREE.Vector3; clips: THREE.AnimationClip[] }
const TPL: Record<string, Tpl> = {};

export async function loadStationModels() {
  const data = window.STATIONDATA;
  if (!data) return false;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  await Promise.all(Object.entries(data).map(async ([name, url]) => {
    try {
      const g = await loader.loadAsync(url);
      const inner = g.scene;
      inner.traverse((o: any) => {
        if (!o.isMesh) return;
        const m = o.material as THREE.MeshStandardMaterial;
        for (const t of [m.map, m.emissiveMap]) if (t) t.colorSpace = THREE.SRGBColorSpace;
        for (const t of [m.map, m.normalMap, m.roughnessMap, m.metalnessMap]) if (t) t.anisotropy = 4;
        m.envMapIntensity = 0.9;
        if (m.metalness > 0.8 && !m.metalnessMap) m.metalness = 0.6;
      });
      const wrap = new THREE.Group(); wrap.add(inner); wrap.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(wrap), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      inner.position.sub(c);
      TPL[name] = { group: wrap, size, clips: g.animations || [] };
    } catch (e) { console.warn('Stationsmodell nicht geladen:', name, e); }
  }));
  await loadKitMeta(Object.keys(TPL));     // Zusatzangaben der Baukasten-Modelle (Leuchtpunkte, Landefeld)
  return Object.keys(TPL).length > 0;
}
export const hasStationModel = (name: string) => !!TPL[name];
// Vorlage eines geladenen Modells (zentriert; das erste Kind trägt die Verschiebung zum Ursprung der Datei)
export const stationTemplate = (name: string) => TPL[name]?.group || null;
export const stationClips = (name: string) => TPL[name]?.clips || [];

// Kollisionskugeln: belegte Rasterzellen (lokale Koordinaten nach Skalierung); minY: Punkte darunter zählen nicht (flache Bodenteile)
function collisionSpheres(obj: THREE.Object3D, cell: number, minY = -Infinity) {
  obj.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), v = new THREE.Vector3(), cells = new Map<string, number[]>();
  obj.traverse((o: any) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position as THREE.BufferAttribute, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const step = Math.max(1, Math.floor(p.count / 6000));
    for (let i = 0; i < p.count; i += step) {
      v.fromBufferAttribute(p, i).applyMatrix4(m);
      if (v.y < minY) continue;
      const k = `${Math.floor(v.x / cell)},${Math.floor(v.y / cell)},${Math.floor(v.z / cell)}`;
      if (!cells.has(k)) cells.set(k, [(Math.floor(v.x / cell) + 0.5) * cell, (Math.floor(v.y / cell) + 0.5) * cell, (Math.floor(v.z / cell) + 0.5) * cell, cell * 0.72]);
    }
  });
  return [...cells.values()];
}

const PAD = std(0x2a2c30, { metalness: 0.5, roughness: 0.6 }), MARK = std(0xc87a20, { metalness: 0.3, roughness: 0.5, emissive: 0x3a1a00 });
// Station mit KI-Rumpf: size = größte Ausdehnung in Metern; ground = Unterkante liegt bei y = -ground (Planetenbasis)
export function buildModelStation(name: string, size: number, opt: { ground?: number; cell: number; R: number }): StructureModel | null {
  const t = TPL[name];
  if (!t) return null;
  const g = new THREE.Group(), lights: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  const s = size / Math.max(t.size.x, t.size.y, t.size.z), body = t.group.clone(true);
  body.scale.setScalar(s);
  const hx = t.size.x * s / 2, hy = t.size.y * s / 2, hz = t.size.z * s / 2;
  if (opt.ground !== undefined) body.position.y = -opt.ground + hy;
  g.add(body);
  const sph = collisionSpheres(g, opt.cell);   // in Koordinaten der Gruppe (inkl. Skalierung des Rumpfs)
  // Landeplattform vor dem Rumpf (+Z), in Höhe der Unterkante
  // im All an den vordersten Rumpfteil (größtes z) anschließen, auf dem Planeten auf den Boden
  const front = sph.reduce((a, b) => (b[2] > a[2] ? b : a), [0, 0, -1e9, 0]);
  const padY = opt.ground !== undefined ? -opt.ground + 1.5 : front[1], padZ = (opt.ground !== undefined ? hz : front[2] + front[3]) + 34;
  const pad = new THREE.Mesh(new THREE.BoxGeometry(56, 3, 56), PAD); pad.position.set(0, padY, padZ); g.add(pad);
  const mk = new THREE.Mesh(new THREE.BoxGeometry(34, 3.2, 4), MARK); mk.position.set(0, padY, padZ); g.add(mk);
  if (opt.ground === undefined) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(10, 8, 40), PAD); arm.position.set(0, padY + 2, padZ - 44); g.add(arm);
  }
  for (const [x, z] of [[-26, -26], [26, -26], [-26, 26], [26, 26], [0, -26], [0, 26], [-26, 0], [26, 0]]) {
    const sp = new THREE.Sprite(glowMat(0xffa030, 1)); sp.position.set(x, padY + 2.5, padZ + z); sp.scale.setScalar(5); g.add(sp); lights.push(sp);
  }
  sph.push([0, padY, padZ, 22]);
  for (const sx of [-1, 1]) {
    const nl = new THREE.Sprite(glowMat(sx < 0 ? 0xff3030 : 0x30ff70, 1)); nl.position.set(sx * (hx + 4), body.position.y, 0); nl.scale.setScalar(10); g.add(nl); navs.push(nl);
  }
  const top = new THREE.Sprite(glowMat(0xffffff, 1)); top.position.set(0, body.position.y + hy + 6, 0); top.scale.setScalar(9); g.add(top); navs.push(top);
  return {
    g, lights, navs, sph, R: opt.R,
    dock: { x: 0, y: padY + 12, z: padZ },
    launch: { x: 0, y: padY + 14, z: padZ + 60, yaw: Math.PI },
  };
}

// ---------- Trägerschiff Bastion (eigenes Modell aus Blender: asset-src/neu/bastion/Bastion.blend → asset-src/glb/station/Carrier.glb) ----------
// Das Modell ist 514 m lang gebaut (Blender: +Y = Bug, +Z = oben) und wird hier auf die doppelte Länge der alten Bastion gebracht.
// Punkte unten sind in Blender-Koordinaten des Modells notiert und werden mit B() ins Spiel umgerechnet (x, z, -y) * K.
export const CARRIER_K = 1.9;
const B = (x: number, y: number, z: number): [number, number, number] => [x * CARRIER_K, z * CARRIER_K, -y * CARRIER_K];
export function buildCarrierModel(): (StructureModel & { glows: THREE.Sprite[]; turrets: THREE.Group[] }) | null {
  const t = TPL.Carrier;
  if (!t) return null;
  const g = new THREE.Group(), body = t.group.clone(true);
  body.children[0].position.set(0, 0, 0);   // der Lader zentriert Modelle; hier gilt der Ursprung aus Blender
  body.scale.setScalar(CARRIER_K);
  body.traverse((o: any) => {
    if (!o.isMesh) return;
    const m = o.material as THREE.MeshStandardMaterial;
    // Leuchtstärken fürs Spiel (mit Bloom): Das Hangarfeld bleibt ein dünner Schleier, sonst blendet es beim Start aus dem Hangar
    if (m.name === 'bastion_hangar_field') { m.transparent = true; m.depthWrite = false; m.side = THREE.DoubleSide; m.opacity = 0.12; m.emissiveIntensity = 0.3; }
    else if (m.name === 'bastion_windows') m.emissiveIntensity = 1.1;
    else if (m.name === 'bastion_lamps') m.emissiveIntensity = 1.6;
    else if (m.name === 'bastion_engine_glow') m.emissiveIntensity = 3;
    else { m.metalness = Math.min(m.metalness, 0.35); m.envMapIntensity = 1.1; }   // weniger Spiegelglanz: Ohne helle Umgebung wirkt Metall sonst fast schwarz
  });
  g.add(body);
  // Kollision: zwei Reihen Kugeln längs durch den Rumpf, dazu Turm, Flügeldeck und die beiden Landeplattformen
  const sph: number[][] = [];
  // im Bereich des Hangartunnels sitzen die Kugeln höher und sind kleiner: Die Öffnungen bleiben frei für Start und Anflug
  for (let y = -240; y <= 250; y += 30) for (const s of [-1, 1]) { const tun = y > -32 && y < 62, [x, yy, z] = B(s * 18, y, tun ? 11 : -2); sph.push([x, yy, z, (tun ? 26 : y > 140 ? 34 : 32) * CARRIER_K]); }
  sph.push([...B(0, -128, 42), 40], [...B(0, -132, 62), 24]);
  for (const s of [-1, 1]) {
    for (const [x, y, r] of [[58, -110, 15], [86, -160, 15], [112, -200, 16], [140, -214, 15], [66, -215, 16], [95, -238, 14]]) sph.push([...B(s * x, y, -4), r * CARRIER_K]);
    for (const x of [52, 74]) for (const y of [-12, 15, 42]) sph.push([...B(s * x, y, -27), 8 * CARRIER_K]);
  }
  // Lauflichter an den Außenkanten der Plattformen, Glühen an den sechs Triebwerken
  const lights: THREE.Sprite[] = [], glows: THREE.Sprite[] = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 8; i++) { const sp = new THREE.Sprite(glowMat(0xffa030, 1)); sp.position.set(...B(s * 86, -22 + i * 10.6, -17.6)); sp.scale.setScalar(9); g.add(sp); lights.push(sp); }
    for (let i = 0; i < 3; i++) { const sp = new THREE.Sprite(glowMat(0xffa860, 0.5)); sp.position.set(...B(s * (72 + i * 27), -246 - i * 9, -13.5)); sp.scale.setScalar(64); g.add(sp); glows.push(sp); }
  }
  const [dx, dy, dz] = B(64, 15, -9), [lx, ly, lz] = B(40.5, 15, -11);
  return {
    g, lights, navs: [], glows, turrets: [], sph, R: 520,
    dock: { x: dx, y: dy, z: dz },                       // über der Landeplattform an Steuerbord
    launch: { x: lx, y: ly, z: lz, yaw: -Math.PI / 2 },  // Mitte der Hangaröffnung, Blick nach außen (der Hangar-Innenraum schließt hier an)
  };
}

// ---------- Außenposten auf den Planeten: mit dem Baukasten gebaut (asset-src/neu/aussenposten/posten_kit.py → asset-src/glb/station/Aussenposten.glb) ----------
// In echten Metern, Ursprung = Boden in der Mitte des Hauptgebäudes, das Tor zeigt nach +Z. Der Stationspunkt liegt 14 m über dem Plateau
// (surface.ts), deshalb sitzt das Modell 14 m tiefer. Materialien kommen aus src/models/kit.ts; Leuchtpunkte und Landefeld aus data/kit_Aussenposten.json.
const OUTPOST_Y = -14;
export { setKitDust as setOutpostDust } from './kit';
export function buildBaseModel(): StructureModel | null {
  const t = TPL.Aussenposten;
  if (!t) return null;
  const meta = kitMeta('Aussenposten');
  const g = new THREE.Group(), body = t.group.clone(true);
  body.children[0].position.set(0, 0, 0);          // der Lader zentriert Modelle; hier gilt der Ursprung aus Blender
  body.position.y = OUTPOST_Y;
  g.add(body); g.updateMatrixWorld(true);
  applyKit(body);
  const sph = collisionSpheres(g, 7, OUTPOST_Y + (meta.collide_above ?? 1));   // Landefeld und flache Markierungen zählen nicht
  // Leuchtpunkte aus Blender: Lampen am Landefeld laufen als Lauflicht, rote als Positionslichter, der Rest glüht ruhig
  const lights: THREE.Sprite[] = [], navs: THREE.Sprite[] = [];
  const P = meta.pad || { x: -62, z: 38, y: 0.6, r: 23 }, py = OUTPOST_Y + P.y;
  for (const l of meta.lights || []) {
    const sp = new THREE.Sprite(glowMat(KIT_GLOW[l.k] ?? 0xffffff, l.k === 'light' ? 0.5 : 0.9));
    sp.position.set(l.p[0], OUTPOST_Y + l.p[1], l.p[2]); sp.scale.setScalar(l.s); g.add(sp);
    const onPad = Math.abs(l.p[0] - P.x) < P.r + 1 && Math.abs(l.p[2] - P.z) < P.r + 1;
    if (l.k === 'lamp' && onPad) lights.push(sp); else if (l.k === 'redlamp' && l.p[1] > 20) navs.push(sp);
  }
  sph.push([P.x, py - 2, P.z, 3]);
  return {
    g, lights, navs, sph, R: meta.R ?? 130,
    dock: { x: P.x, y: py + 12, z: P.z },
    launch: { x: P.x, y: py + 14, z: P.z + 30, yaw: Math.PI },
  };
}
