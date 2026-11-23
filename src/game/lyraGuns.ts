import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MANIFEST } from '../core/assets';

// =====================================================================================
// Die drei Handwaffen aus dem Lyra-Paket (seit 2026-11-24 eigene Waffen beim Ausrüster, docs/lyra.md):
//   Kampfgewehr KG-30 (waffe_kg30) · Pistole SP-12 (waffe_sp12) · Trommelflinte TF-8 (waffe_tf8)
// Modelle: lazy/LyraGewehr, LyraPistole, LyraFlinte (asset-src/glb/lazy, aus lyra_paket/weapons). Jedes hat Knochen und zwei eigene
// Clips: …_fire (Verschluss) und …_reload (Magazin fällt heraus und kommt neu). Achsen des Modells: x = Lauf, y = links, z = oben –
// der Rahmen des Waffenknochens weapon_r der Spielerfigur. Geladen wird beim ersten Gebrauch; je Ansicht eine eigene Kopie
// (Außensicht an der Hand der Figur: mannyAvatar.ts; Ich-Sicht: mineArt.ts buildViewModel).
// =====================================================================================
export type LyraKind = 'rifle' | 'pistol' | 'shotgun';
/** Gegenstand → Waffe des Pakets */
export const LYRA_ITEM: Record<string, LyraKind> = { waffe_kg30: 'rifle', waffe_sp12: 'pistol', waffe_tf8: 'shotgun' };
/** Kennung als Waffenmodell (wie die Schlüssel in mineArt WDEFS; geht auch an Mitspieler) */
export const LYRA_VM: Record<LyraKind, string> = { rifle: 'lyg', pistol: 'lyp', shotgun: 'lyf' };
export const LYRA_OF_VM: Record<string, LyraKind> = { lyg: 'rifle', lyp: 'pistol', lyf: 'shotgun' };
// muzzle: Mündung im Rahmen der Waffe (lyra.json, sockets.Muzzle) · view: Lage vor der Kamera in der Ich-Sicht (rechts, unten, vorn) ·
// ads: Lage beim Zielen – Visier in der Bildmitte, so weit vorn, dass der Schaft nicht ins Bild ragt
export const LYRA_SPEC: Record<LyraKind, { file: string; muzzle: [number, number, number]; view: [number, number, number]; ads: [number, number, number] }> = {
  rifle: { file: 'lazy/LyraGewehr', muzzle: [0.6981, 0, 0.0893], view: [0.13, -0.22, -0.42], ads: [0, -0.158, -0.5] },
  pistol: { file: 'lazy/LyraPistole', muzzle: [0.1913, 0, 0.0837], view: [0.105, -0.165, -0.4], ads: [0, -0.118, -0.42] },
  shotgun: { file: 'lazy/LyraFlinte', muzzle: [0.4374, 0, 0.0995], view: [0.135, -0.235, -0.44], ads: [0, -0.168, -0.52] },
};

export interface LyraGun { g: THREE.Object3D; mixer: THREE.AnimationMixer; fire: THREE.AnimationAction | null; reload: THREE.AnimationAction | null; shots: number; reloading: boolean }
const tpl: Partial<Record<LyraKind, { scene: THREE.Object3D; clips: THREE.AnimationClip[] } | 'lädt' | 'fehlt'>> = {};
/** ist das Modell geladen? Stößt das Laden an. */
export function lyraGunReady(kind: LyraKind): boolean {
  const have = tpl[kind];
  if (have) return typeof have !== 'string';
  const url = MANIFEST?.files[LYRA_SPEC[kind].file]?.url;
  if (!url) { tpl[kind] = 'fehlt'; return false; }
  tpl[kind] = 'lädt';
  new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url).then(gl => {
    gl.scene.traverse((o: any) => {
      o.userData.sh = false; o.userData.shared = true;
      if (!o.isMesh) return;
      o.frustumCulled = false; o.castShadow = true;
      if (o.material) { o.material.envMapIntensity = 0.3; for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap']) if (o.material[k]) o.material[k].anisotropy = 8; }
    });
    tpl[kind] = { scene: gl.scene, clips: gl.animations };
  }).catch((e: unknown) => { tpl[kind] = 'fehlt'; console.warn('Lyra-Waffe nicht geladen:', e); });
  return false;
}
/** eine eigene Kopie der Waffe (null, solange sie lädt oder wenn sie fehlt) */
export function makeLyraGun(kind: LyraKind): LyraGun | null {
  if (!lyraGunReady(kind)) return null;
  const T = tpl[kind] as { scene: THREE.Object3D; clips: THREE.AnimationClip[] };
  const g = skClone(T.scene), mixer = new THREE.AnimationMixer(g);
  const act = (end: string) => { const c = T.clips.find(a => a.name.endsWith(end)); if (!c) return null; const a = mixer.clipAction(c); a.setLoop(THREE.LoopOnce, 1); return a; };
  return { g, mixer, fire: act('_fire'), reload: act('_reload'), shots: -1, reloading: false };
}
/** je Bild: Verschluss bei jedem Schuss (shots zählt hoch), Magazin im Takt des Nachladens (reload 0..1, sonst −1) */
export function driveLyraGun(L: LyraGun, shots: number, reload: number, dt: number) {
  if (L.shots >= 0 && shots !== L.shots && L.fire && !L.reloading) L.fire.reset().play();
  L.shots = shots;
  if (L.reload) {
    if (reload >= 0) {
      if (!L.reloading) { L.fire?.stop(); L.reload.reset().play(); L.reloading = true; }
      L.reload.paused = true; L.reload.time = Math.min(0.999, reload) * L.reload.getClip().duration;      // die Zeit gibt das Nachladen des Spiels vor
    } else if (L.reloading) { L.reload.stop(); L.reloading = false; }
  }
  L.mixer.update(dt);
}
