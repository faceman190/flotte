import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { glowMat } from '../core/engine';
import { std } from '../core/textures';
import type { StructureModel } from './structures';

// KI-generierte Stationsmodelle als GLB-Dateien aus public/assets/station (scripts/build-stations.mjs → build-assets.mjs).
// Das Modell bildet den Rumpf; Landeplattform, Lauflichter und Positionslichter kommen weiterhin aus dem Spiel,
// damit Andocken überall gleich funktioniert. Kollision: Kugeln aus einem Raster über die Modellpunkte.

interface Tpl { group: THREE.Group; size: THREE.Vector3 }
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
      TPL[name] = { group: wrap, size };
    } catch (e) { console.warn('Stationsmodell nicht geladen:', name, e); }
  }));
  return Object.keys(TPL).length > 0;
}
export const hasStationModel = (name: string) => !!TPL[name];

// Kollisionskugeln: belegte Rasterzellen (lokale Koordinaten nach Skalierung)
function collisionSpheres(obj: THREE.Object3D, cell: number) {
  obj.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(obj.matrixWorld).invert(), v = new THREE.Vector3(), cells = new Map<string, number[]>();
  obj.traverse((o: any) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position as THREE.BufferAttribute, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    const step = Math.max(1, Math.floor(p.count / 6000));
    for (let i = 0; i < p.count; i += step) {
      v.fromBufferAttribute(p, i).applyMatrix4(m);
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
