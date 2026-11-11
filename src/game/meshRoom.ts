import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { SHIPS, type ShipId } from '../data/ships';
import { modelFrame } from '../models/gltfShips';

// =====================================================================================
// Begehbare Innenräume aus echten Modellen (z. B. Pfeil): Innenmodell und Laufkarte aus scripts/build-walkmap.mjs.
// Das Innenmodell sitzt deckungsgleich zum Außenmodell (gleiches Koordinatensystem, siehe gltfShips.modelFrame).
// Die Laufkarte kennt je 20-cm-Zelle die begehbaren Böden (mehrere Decks); Treppen und Rampen ergeben sich aus den Höhen.
// =====================================================================================
declare global { interface Window { SHIPINT?: Record<string, string>; WALKMAP?: Record<string, string> } }
interface WalkData {
  cell: number; x0: number; z0: number; nx: number; nz: number; step: number;
  floors: Map<number, number[]>;
  spawn: { x: number; y: number; z: number; yaw: number };
  spots: { kind: string; x: number; y: number; z: number; r: number }[];
  lamps: number[][]; areas: { name: string; z1: number }[];
}
interface Loaded { scene: THREE.Group; walk: WalkData }
const cache: Record<string, Promise<Loaded | null>> = {}, ready: Record<string, Loaded | null> = {};
const modelOf = (cls: string) => SHIPS[cls as ShipId]?.model || '';
export const hasMeshRoom = (cls: string) => { const m = modelOf(cls); return !!(m && window.SHIPINT?.[m] && window.WALKMAP?.[m]); };

export function loadMeshRoom(cls: string): Promise<Loaded | null> {
  const m = modelOf(cls);
  if (!hasMeshRoom(cls)) return Promise.resolve(null);
  return (cache[m] = cache[m] || (async (): Promise<Loaded | null> => {
    try {
      const [g, wj] = await Promise.all([
        new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(window.SHIPINT![m]),
        fetch(window.WALKMAP![m]).then(r => r.json()),
      ]);
      g.scene.traverse((o: any) => { if (o.isMesh) { o.userData.shared = true; o.material.envMapIntensity = 0.25; } });
      // Laufkarte entpacken: je Zelle die Bodenhöhen (Meter)
      const b64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
      const cells = new Int32Array(b64(wj.cells)), ys = new Int16Array(b64(wj.ys)), floors = new Map<number, number[]>();
      for (let i = 0; i < cells.length; i++) { const l = floors.get(cells[i]) || []; l.push(ys[i] / 100); floors.set(cells[i], l); }
      return { scene: g.scene, walk: { ...wj, floors } };
    } catch (e) { console.warn('Innenraum nicht geladen:', m, e); return null; }
  })().then(r => (ready[m] = r)));
}
// sofort verfügbar? (für den synchronen Einstieg)
export function meshRoomReady(cls: string) { const m = modelOf(cls); return ready[m] || null; }
export function preloadMeshRooms() { for (const cls of Object.keys(SHIPS)) if (hasMeshRoom(cls)) loadMeshRoom(cls); }

// Raum bauen: Gruppe in Schiffskoordinaten (wie das Schiffsmodell), Punkte, Lichter, Laufkarten-Abfrage
export function buildMeshRoom(cls: string) {
  const L = meshRoomReady(cls), m = modelOf(cls), fr = modelFrame(m);
  if (!L || !fr) return null;
  const k = fr.s * SHIPS[cls as ShipId].len;   // Maßstab Laufkarte → Schiff (1, wenn die Länge stimmt)
  const g = new THREE.Group(), scaled = new THREE.Group(), inner = L.scene.clone(true);
  inner.rotation.y = Math.PI; inner.position.copy(fr.innerPos);
  scaled.scale.setScalar(k); scaled.add(inner); g.add(scaled);
  // Grundlicht, damit Räume ohne eigene Lampe nicht schwarz sind
  const hemi = new THREE.HemisphereLight(0xdfe8f2, 0x3a3630, 0.45); g.add(hemi);
  const W = L.walk;
  // eigene Deckenlampen mit natürlichem Abfall, über die begehbare Fläche verteilt (aus der Laufkarte)
  for (const l of W.lamps) { const p = new THREE.PointLight(0xffe8cc, 26 * l[3], 18 * k, 2); p.position.set(l[0] * k, l[1] * k, l[2] * k); g.add(p); }
  // Boden an (x, z) in Schrittweite zur aktuellen Höhe y (Schiffskoordinaten); null = nicht begehbar
  const floorAt = (x: number, z: number, y: number): number | null => {
    const ix = Math.floor((x / k - W.x0) / W.cell), iz = Math.floor((z / k - W.z0) / W.cell);
    if (ix < 0 || iz < 0 || ix >= W.nx || iz >= W.nz) return null;
    const fl = W.floors.get(ix * W.nz + iz); if (!fl) return null;
    let best: number | null = null;
    for (const f of fl) { const fy = f * k; if (Math.abs(fy - y) <= W.step * k + 0.05 && (best === null || Math.abs(fy - y) < Math.abs(best - y))) best = fy; }
    return best;
  };
  const area = (_x: number, z: number) => (W.areas.find(a => z / k < a.z1) || W.areas[W.areas.length - 1]).name;
  return {
    g, k, floorAt, area,
    spawn: { x: W.spawn.x * k, y: W.spawn.y * k, z: W.spawn.z * k, yaw: W.spawn.yaw },
    spots: W.spots.map(s => ({ kind: s.kind, x: s.x * k, y: s.y * k, z: s.z * k, r: s.r, label: '' })),
    lamps: W.lamps.map(l => [l[0] * k, l[1] * k, l[2] * k, l[3]] as [number, number, number, number]),
  };
}
