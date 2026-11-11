import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// KI-generierte Figuren mit Skelett (GLB-Dateien aus public/assets/char): 'worker' mit Laufanimation, 'merchant' mit Stand-Animation.
// Beide Skelette stammen aus demselben Rigging-Dienst und haben gleiche Knochennamen, daher passen die Clips auf beide.

interface Tpl { scene: THREE.Group; clips: THREE.AnimationClip[]; scale: number; footY: number }
const TPL: Record<string, Tpl> = {};
const HEIGHT: Record<string, number> = { worker: 1.8, merchant: 1.7 };

export async function loadCharModels() {
  const data = window.CHARDATA;
  if (!data) return false;
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  await Promise.all(Object.entries(data).map(async ([name, url]) => {
    try {
      const g = await loader.loadAsync(url);
      g.scene.traverse((o: any) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;   // Skinning verschiebt die Hülle, Bounding-Box stimmt sonst nicht
        const m = o.material as THREE.MeshStandardMaterial;
        if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
        m.envMapIntensity = 0.3;
        m.metalness = Math.min(m.metalness, 0.2);
      });
      g.scene.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g.scene), h = box.max.y - box.min.y || 1;
      const scale = (HEIGHT[name] || 1.75) / h;
      TPL[name] = { scene: g.scene, clips: g.animations, scale, footY: -box.min.y * scale };
    } catch (e) { console.warn('Figur nicht geladen:', name, e); }
  }));
  return Object.keys(TPL).length > 0;
}
export const hasChar = (name: string) => !!TPL[name];

const clipOf = (kind: 'walk' | 'idle') => {
  const own = kind === 'walk' ? TPL.worker : TPL.merchant;
  return own?.clips[0] || null;
};
// Eine Figur: Gruppe (Füße auf y=0, Blick nach +Z), Mixer und je eine Aktion fürs Laufen und Stehen
export function charInstance(name: string, tint: number | [number, number, number] = 1) {
  const t = TPL[name];
  const obj = SkeletonUtils.clone(t.scene) as THREE.Group;
  obj.scale.setScalar(t.scale);
  obj.position.y = t.footY;
  // Einfärben: Zahl = heller/dunkler, Dreier = Farbton (für Story-Figuren)
  if (tint !== 1) obj.traverse((o: any) => { if (o.isMesh) { o.material = o.material.clone(); if (Array.isArray(tint)) o.material.color.multiply(new THREE.Color(tint[0], tint[1], tint[2])); else o.material.color.multiplyScalar(tint); } });
  const g = new THREE.Group(); g.add(obj);
  const mixer = new THREE.AnimationMixer(obj);
  const w = clipOf('walk'), i = clipOf('idle');
  const walk = w ? mixer.clipAction(w) : null, idle = i ? mixer.clipAction(i) : null;
  return { g, mixer, walk, idle, mats: [] as THREE.Material[] };
}
