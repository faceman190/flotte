import * as THREE from 'three';
import { SHIPS, type ShipId } from '../data/ships';
import { modelFrame } from '../models/gltfShips';
import { renderer } from '../core/engine';

// =====================================================================================
// Begehbare Innenräume aus echten Modellen (z. B. Pfeil): Das Schiffsmodell enthält seinen Innenraum selbst (volles Modell),
// dazu kommt eine Laufkarte aus scripts/build-walkmap.mjs. Beim Betreten bleibt das Schiffsmodell stehen; dieser Raum
// bringt nur Licht, Spiegelungen und die Laufkarte mit.
// Die Laufkarte kennt je 20-cm-Zelle die begehbaren Böden (mehrere Decks); Treppen und Rampen ergeben sich aus den Höhen.
// =====================================================================================
declare global { interface Window { SHIPINT?: Record<string, string>; WALKMAP?: Record<string, string> } }
interface WalkData {
  cell: number; x0: number; z0: number; nx: number; nz: number; step: number;
  floors: Map<number, number[]>;   // je Zelle Paare: Bodenhöhe, Kopfhöhe darüber (Meter)
  spawn: { x: number; y: number; z: number; yaw: number };
  spots: { kind: string; x: number; y: number; z: number; r: number }[];
  lamps: number[][]; areas: { name: string; z1: number }[];
}
interface Loaded { walk: WalkData }
const cache: Record<string, Promise<Loaded | null>> = {}, ready: Record<string, Loaded | null> = {}, failed: Record<string, boolean> = {};
const modelOf = (cls: string) => SHIPS[cls as ShipId]?.model || '';
// Scheitert das Laden beim Einsteigen (zwei Versuche), gilt die Laufkarte für diese Sitzung als nicht vorhanden: das Schiff bekommt den Standardraum
export const hasMeshRoom = (cls: string) => { const m = modelOf(cls); return !!(m && window.WALKMAP?.[m] && !failed[m]); };

async function loadOnce(m: string): Promise<Loaded> {
  const wj = await fetch(window.WALKMAP![m]).then(r => { if (!r.ok) throw new Error('Laufkarte: ' + r.status); return r.json(); });
  // Laufkarte entpacken: je Zelle die Bodenhöhen (Meter)
  const b64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0)).buffer;
  const cells = new Int32Array(b64(wj.cells)), ys = new Int16Array(b64(wj.ys)), hs = wj.hs ? new Uint8Array(b64(wj.hs)) : null, floors = new Map<number, number[]>();
  for (let i = 0; i < cells.length; i++) { const l = floors.get(cells[i]) || []; l.push(ys[i] / 100, hs ? hs[i] / 10 : 2.4); floors.set(cells[i], l); }
  return { walk: { ...wj, floors } };
}
export function loadMeshRoom(cls: string, preload = false): Promise<Loaded | null> {
  const m = modelOf(cls);
  if (!hasMeshRoom(cls)) return Promise.resolve(null);
  if (ready[m]) return Promise.resolve(ready[m]);
  return (cache[m] = cache[m] || (async (): Promise<Loaded | null> => {
    // zwei Versuche mit kurzer Pause; ein Fehlschlag wird nicht behalten, der nächste Aufruf versucht es neu
    for (let i = 0; i < 2; i++) {
      try { return (ready[m] = await loadOnce(m)); }
      catch (e) { console.warn('Laufkarte nicht geladen:', m, e); if (!i) await new Promise(r => setTimeout(r, 1200)); }
    }
    if (!preload) failed[m] = true;   // Vorladen im Hintergrund darf scheitern, ohne dass der Innenraum verloren geht
    delete cache[m];
    return null;
  })());
}
// sofort verfügbar? (für den synchronen Einstieg)
export function meshRoomReady(cls: string) { const m = modelOf(cls); return ready[m] || null; }
export function preloadMeshRooms() { for (const cls of Object.keys(SHIPS)) if (hasMeshRoom(cls)) loadMeshRoom(cls, true); }

// Spiegelungen im Innenraum: kühles Blau von oben, warmes Orange von unten, helle Leuchtbänder (statt des dunklen Weltraums)
let env: THREE.Texture | null = null;
export function interiorEnv() {
  if (env) return env;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d')!, gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#5aa6e8'); gr.addColorStop(0.38, '#27456e'); gr.addColorStop(0.55, '#1a1c24'); gr.addColorStop(0.78, '#7a4416'); gr.addColorStop(1, '#d9801e');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  g.fillStyle = 'rgba(235,245,255,.95)'; for (const x of [40, 190, 330, 450]) g.fillRect(x, 58, 46, 9);       // Deckenleuchten
  g.fillStyle = 'rgba(255,170,60,.95)'; for (const x of [0, 128, 256, 384]) g.fillRect(x + 20, 176, 88, 5);     // orange Leuchtbänder
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.mapping = THREE.EquirectangularReflectionMapping;
  const pm = new THREE.PMREMGenerator(renderer); env = pm.fromEquirectangular(t).texture; pm.dispose(); t.dispose();
  return env;
}

// Raum bauen: Gruppe in Schiffskoordinaten (wie das Schiffsmodell) mit Licht, dazu Punkte und Laufkarten-Abfrage
export function buildMeshRoom(cls: string) {
  const L = meshRoomReady(cls), m = modelOf(cls), fr = modelFrame(m);
  if (!L || !fr) return null;
  const k = fr.s * SHIPS[cls as ShipId].len;   // Maßstab Laufkarte → Schiff (1, wenn die Länge stimmt)
  const g = new THREE.Group();
  // Grundlicht: kühl von oben, warm von unten
  g.add(new THREE.HemisphereLight(0xa8c8f0, 0x4a3018, 0.5));
  const W = L.walk;
  // Deckenlampen mit natürlichem Abfall, über die begehbare Fläche verteilt (aus der Laufkarte); jede dritte warm-orange
  W.lamps.forEach((l, i) => { const p = new THREE.PointLight(i % 3 === 2 ? 0xffa050 : 0xe6f0ff, 24 * l[3], 18 * k, 2); p.position.set(l[0] * k, l[1] * k, l[2] * k); g.add(p); });
  // Boden an (x, z) in Schrittweite zur aktuellen Höhe y (Schiffskoordinaten); null = nicht begehbar.
  // air (im Sprung): der höchste Boden unter den Füßen, höchstens 1,3 m tiefer (kein Sturz auf ein anderes Deck).
  let lastHead = 2.4;   // Kopfhöhe über dem zuletzt gefundenen Boden
  const floorAt = (x: number, z: number, y: number, air = false): number | null => {
    const ix = Math.floor((x / k - W.x0) / W.cell), iz = Math.floor((z / k - W.z0) / W.cell);
    if (ix < 0 || iz < 0 || ix >= W.nx || iz >= W.nz) return null;
    const fl = W.floors.get(ix * W.nz + iz); if (!fl) return null;
    let best: number | null = null;
    for (let i = 0; i < fl.length; i += 2) {
      const fy = fl[i] * k;
      if (air ? fy <= y + 0.05 && y - fy <= 1.3 && (best === null || fy > best) : Math.abs(fy - y) <= W.step * k + 0.05 && (best === null || Math.abs(fy - y) < Math.abs(best - y))) { best = fy; lastHead = fl[i + 1] * k; }
    }
    return best;
  };
  const area = (_x: number, z: number) => (W.areas.find(a => z / k < a.z1) || W.areas[W.areas.length - 1]).name;
  return {
    g, k, floorAt, area, head: () => lastHead,
    spawn: { x: W.spawn.x * k, y: W.spawn.y * k, z: W.spawn.z * k, yaw: W.spawn.yaw },
    spots: W.spots.map(s => ({ kind: s.kind, x: s.x * k, y: s.y * k, z: s.z * k, r: s.r, label: '' })),
    lamps: W.lamps.map(l => [l[0] * k, l[1] * k, l[2] * k, l[3]] as [number, number, number, number]),
  };
}
