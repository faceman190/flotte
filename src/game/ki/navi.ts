import type { V3 } from './typen';

// =====================================================================================
// Wegfindung über ein Navmesh (seit 26.11.2026): recast-navigation-js (Recast/Detour, dasselbe System wie in Unreal, als WebAssembly).
//
// Laden: Die Bibliothek ist rund 1 MB groß und wird erst geholt, wenn ein Ort Gegner mit Wegfindung braucht. Sie liegt nicht im
// Spielcode, sondern als eigene Datei im Paket „lazy“ (lazy/Recast, gebaut von scripts/build-recast.mjs bzw. npm run assets).
// Fehlt die Datei oder schlägt das Laden fehl, laufen die Gegner ohne Navmesh (gerade Linie mit Ausweichen um Hindernisse).
//
// Bauen: aus Dreiecken des Orts (Gelände-Ausschnitt und Hindernisse), zur Laufzeit in einigen zehn Millisekunden.
// Später für feste Orte (Stationen, Städte, Minen) vorab beim Packen backen.
// =====================================================================================

export interface RecastMod {
  init: () => Promise<void>;
  NavMeshQuery: any;
  generateSoloNavMesh: (pos: ArrayLike<number>, idx: ArrayLike<number>, cfg?: Record<string, number>) => { success: boolean; navMesh?: any; error?: string };
}

let mod: RecastMod | null = null, laden: Promise<RecastMod | null> | null = null;

/** für Tests in Node: Bibliothek direkt setzen */
export async function setzeRecast(m: RecastMod) { await m.init(); mod = m; }

/** Bibliothek laden (einmal); url aus der Paketliste */
export function ladeRecast(url: string | undefined): Promise<RecastMod | null> {
  if (mod) return Promise.resolve(mod);
  if (laden) return laden;
  if (!url) return Promise.resolve(null);
  const abs = typeof location !== 'undefined' ? new URL(url, location.href).href : url;
  laden = import(/* @vite-ignore */ abs).then(async (m: RecastMod) => { await m.init(); mod = m; return m; })
    .catch(e => { console.warn('Wegfindung (recast) nicht geladen – Gegner laufen ohne Navmesh:', e); return null; });
  return laden;
}
export const recastBereit = () => !!mod;

// Einstellungen für Menschen: Zellen 25 cm, Körper 0,4 m Radius, 1,8 m hoch, Stufen bis 45 cm, Hänge bis 42°
export const NAVI_CFG = { cs: 0.25, ch: 0.15, walkableRadius: 2, walkableHeight: 12, walkableClimb: 3, walkableSlopeAngle: 42, maxEdgeLen: 48, maxSimplificationError: 1.3, minRegionArea: 8, mergeRegionArea: 20, detailSampleDist: 6, detailSampleMaxError: 1 };

export interface NaviPunkt extends V3 { ref: number }

export class Navi {
  private constructor(private q: any, private nm: any) {}

  static bauen(pos: ArrayLike<number>, idx: ArrayLike<number>, cfg: Record<string, number> = NAVI_CFG): Navi | null {
    if (!mod) return null;
    const r = mod.generateSoloNavMesh(pos, idx, cfg);
    if (!r.success || !r.navMesh) { console.warn('Navmesh nicht gebaut:', r.error); return null; }
    return new Navi(new mod.NavMeshQuery(r.navMesh), r.navMesh);
  }

  /** nächster Punkt auf dem Navmesh (Suche ±2 m waagerecht, ±4 m senkrecht) */
  naechster(x: number, y: number, z: number, weit = 2): NaviPunkt | null {
    const r = this.q.findClosestPoint({ x, y, z }, { halfExtents: { x: weit, y: 4, z: weit } });
    if (!r.success || !r.polyRef) return null;
    return { x: r.point.x, y: r.point.y, z: r.point.z, ref: r.polyRef };
  }

  /** Weg als Eckpunkte (erster = Start) oder leer */
  weg(a: V3, b: V3): V3[] {
    const r = this.q.computePath(a, b, { halfExtents: { x: 3, y: 4, z: 3 } });
    if (!r.success) return [];
    return r.path.map((p: V3) => ({ x: p.x, y: p.y, z: p.z }));
  }

  /** Bewegung von a nach b auf dem Navmesh (rutscht an Kanten entlang); ref: Polygon von a */
  schieben(ref: number, a: V3, b: V3): NaviPunkt {
    const r = this.q.moveAlongSurface(ref, a, b);
    if (!r.success) return { x: a.x, y: a.y, z: a.z, ref };
    const nr = r.visited.length ? r.visited[r.visited.length - 1] : ref;
    const p = r.resultPosition;
    return { x: p.x, y: p.y, z: p.z, ref: nr };
  }

  /** zufälliger erreichbarer Punkt im Umkreis */
  zufall(x: number, y: number, z: number, r: number): V3 | null {
    const res = this.q.findRandomPointAroundCircle({ x, y, z }, r, { halfExtents: { x: 3, y: 4, z: 3 } });
    return res.success ? { x: res.randomPoint.x, y: res.randomPoint.y, z: res.randomPoint.z } : null;
  }

  frei(x: number, y: number, z: number) {
    const p = this.naechster(x, y, z, 0.3);
    return !!p && Math.hypot(p.x - x, p.z - z) < 0.2;
  }

  dispose() { try { this.q.destroy?.(); this.nm.destroy?.(); } catch { /* schon weg */ } }
}

/** Weglänge einer Eckpunktliste (waagerecht) */
export function wegLaenge(w: V3[]) { let s = 0; for (let i = 1; i < w.length; i++) s += Math.hypot(w[i].x - w[i - 1].x, w[i].z - w[i - 1].z); return s; }
