import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

// Schiffsmodelle als komprimierte GLB-Dateien aus public/assets/ship (scripts/build-ships.mjs → build-assets.mjs).
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
      });
      inner.rotation.y = Math.PI;                 // Nase von +Z nach −Z
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
export const hasPaint = (name: string, p: Paint) => p === 'Orange' || !!PAINT_TEX[`${name}_${p}`];

// Kopie eines Modells in gewünschter Länge (Meter) und Lackierung
export function modelInstance(name: string, length: number, paint: Paint = 'Orange') {
  const t = TPL[name];
  const obj = t.group.clone(true);
  const tex = paint !== 'Orange' ? PAINT_TEX[`${name}_${paint}`] : null;
  if (tex) obj.traverse((o: any) => { if (o.isMesh) { o.material = o.material.clone(); o.material.map = tex; o.material.needsUpdate = true; } });
  const holder = new THREE.Group();
  obj.scale.multiplyScalar(length);
  holder.add(obj);
  return { obj: holder, w: t.w * length, h: t.h * length, l: length };
}

// Koordinatensystem eines Modells im Spiel (für Innenmodelle, die deckungsgleich zum Außenmodell sitzen sollen):
// Modell um 180° gedreht, um innerPos verschoben, mit s × Länge skaliert
export const modelFrame = (name: string) => TPL[name]?.frame || null;
