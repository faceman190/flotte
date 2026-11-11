import * as THREE from 'three';
import { texMat, std, boxUV } from '../core/textures';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import type { ShipId } from '../data/ships';

// =====================================================================================
// Innenräume der eigenen Schiffe (lokal: Bug zeigt nach −Z wie beim Schiffsmodell, Boden bei y = 0).
// Je Klasse ein eigener Grundriss: Falke/Habicht nur Cockpit, Elster mit Frachtraum und Scanner,
// Maulwurf mit Erzbunker, Drohnenbucht und Werkbank, Kärrner mit langem Frachtraum und Quartier.
// Gebaut wird hier nur Geometrie und Grundriss; was die Stationen tun, legt interior.ts fest.
// =====================================================================================
export type Rect = [number, number, number, number];
export type StationKind = 'seat' | 'hatch' | 'log' | 'scanner' | 'bench' | 'drones' | 'bed' | 'locker';
export interface ShipSpot { kind: StationKind; x: number; z: number; r: number; label: string }
export interface ShipRoom {
  g: THREE.Group; rects: Rect[]; obstacles: Rect[]; spots: ShipSpot[];
  spawn: { x: number; z: number; yaw: number }; lamps: [number, number, number, number][];   // x, y, z, Stärke
  area: (x: number, z: number) => string; height: number; disposables: (THREE.Material | THREE.Texture)[];
}

interface Zone { name: string; x0: number; x1: number; z0: number; z1: number; h: number }
interface Layout { zones: Zone[]; hold?: Zone; spots: ShipSpot[]; spawn: { x: number; z: number; yaw: number } }

// Grundrisse (Maße in Metern). Zonen liegen hintereinander, Türen entstehen dort, wo sie sich berühren.
function layout(cls: ShipId): Layout {
  switch (cls) {
    case 'elster': {
      const cp: Zone = { name: 'Cockpit', x0: -2, x1: 2, z0: -7, z1: -3, h: 2.6 };
      const gang: Zone = { name: 'Gang', x0: -0.9, x1: 0.9, z0: -3, z1: -1, h: 2.4 };
      const hold: Zone = { name: 'Frachtraum', x0: -3, x1: 3, z0: -1, z1: 7, h: 3 };
      return {
        zones: [cp, gang, hold], hold, spawn: { x: 0, z: 5.6, yaw: 0 },
        spots: [
          { kind: 'seat', x: 0, z: -5.4, r: 1.5, label: '' }, { kind: 'log', x: -1.5, z: -3.6, r: 1.3, label: '' },
          { kind: 'scanner', x: 2.6, z: 0.4, r: 1.5, label: '' }, { kind: 'locker', x: -2.6, z: 0.4, r: 1.4, label: '' },
          { kind: 'hatch', x: 0, z: 6.8, r: 1.6, label: '' },
        ],
      };
    }
    case 'maulwurf': {
      const br: Zone = { name: 'Brücke', x0: -4, x1: 4, z0: -12, z1: -7, h: 3 };
      const gang: Zone = { name: 'Gang', x0: -1.1, x1: 1.1, z0: -7, z1: -4, h: 2.6 };
      const hold: Zone = { name: 'Erzbunker', x0: -6, x1: 6, z0: -4, z1: 10, h: 5 };
      const bay: Zone = { name: 'Drohnenbucht', x0: 6, x1: 10, z0: 1, z1: 7, h: 3.2 };
      return {
        zones: [br, gang, hold, bay], hold, spawn: { x: 0, z: 8.5, yaw: 0 },
        spots: [
          { kind: 'seat', x: 0, z: -10.2, r: 1.6, label: '' }, { kind: 'log', x: -3, z: -8, r: 1.4, label: '' },
          { kind: 'drones', x: 8.8, z: 4, r: 2, label: '' }, { kind: 'bench', x: -5.3, z: 6.5, r: 1.8, label: '' },
          { kind: 'locker', x: -5.4, z: -2.6, r: 1.4, label: '' }, { kind: 'hatch', x: 0, z: 9.8, r: 1.8, label: '' },
        ],
      };
    }
    case 'pfeil':   // vorläufig wie der Kärrner, bis der echte Innenraum aus dem Modell kommt
    case 'kaerrner': {
      const br: Zone = { name: 'Brücke', x0: -3.5, x1: 3.5, z0: -17, z1: -12, h: 2.8 };
      const gang: Zone = { name: 'Gang', x0: -1, x1: 1, z0: -12, z1: -9, h: 2.5 };
      const hold: Zone = { name: 'Frachtraum', x0: -4, x1: 4, z0: -9, z1: 15, h: 4.2 };
      const qu: Zone = { name: 'Quartier', x0: -8, x1: -4, z0: -8, z1: -3, h: 2.5 };
      return {
        zones: [br, gang, hold, qu], hold, spawn: { x: 0, z: 13.5, yaw: 0 },
        spots: [
          { kind: 'seat', x: 0, z: -15.2, r: 1.6, label: '' }, { kind: 'log', x: 2.6, z: -13, r: 1.4, label: '' },
          { kind: 'bed', x: -6.6, z: -6.6, r: 1.8, label: '' }, { kind: 'locker', x: -7.4, z: -3.6, r: 1.3, label: '' },
          { kind: 'hatch', x: 0, z: 14.8, r: 1.8, label: '' },
        ],
      };
    }
    default: {
      // Falke, Habicht: enges Cockpit mit Luke hinten
      const cp: Zone = { name: 'Cockpit', x0: -1.4, x1: 1.4, z0: -2.6, z1: 1.6, h: 2.3 };
      return {
        zones: [cp], spawn: { x: 0, z: 0.9, yaw: 0 },
        spots: [
          { kind: 'seat', x: 0, z: -1.5, r: 1.3, label: '' }, { kind: 'log', x: 1.0, z: -0.2, r: 1.0, label: '' },
          { kind: 'hatch', x: 0, z: 1.5, r: 1.2, label: '' },
        ],
      };
    }
  }
}

// cargo: Ladung, die als Kisten im Frachtraum steht; cap = Frachtraumgröße
export function buildShipRoom(cls: ShipId, accent: number, cargo: Partial<Record<ItemId, number>>, cap: number): ShipRoom {
  const L = layout(cls), disposables: (THREE.Material | THREE.Texture)[] = [];
  const mat = <T extends THREE.Material>(m: T) => { disposables.push(m); if ((m as any).isMeshStandardMaterial) (m as any).envMapIntensity = 0.04; return m; };   // kaum Reflexion: drinnen spiegelt sich sonst der Weltraum
  const g = new THREE.Group(), S = new THREE.Group(), deco = new THREE.Group(); g.add(S, deco);
  const mFloor = mat(texMat(0x6a6e76, 'hull_mil', { roughness: 0.8, metalness: 0.3 }));
  const mWall = mat(texMat(0x8a8e96, 'hull_light', { roughness: 0.7, metalness: 0.2 }));
  const mDark = mat(texMat(0x3e4249, 'hull_mil', { roughness: 0.85, metalness: 0.3 }));
  const mLight = mat(new THREE.MeshBasicMaterial({ color: 0x6e685f }));   // gedämpft, sonst überstrahlt der Bloom im engen Raum
  const mAcc = mat(new THREE.MeshBasicMaterial({ color: accent }));
  const mScreen = mat(new THREE.MeshBasicMaterial({ color: 0x3aa0d8 }));
  const mGlass = mat(new THREE.MeshStandardMaterial({ color: 0x9ac8e8, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.7, depthWrite: false }));
  const box = (p: THREE.Object3D, m: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o;
  };
  const rects: Rect[] = [], obstacles: Rect[] = [];
  const block = (x0: number, x1: number, z0: number, z1: number) => obstacles.push([Math.min(x0, x1), Math.max(x0, x1), Math.min(z0, z1), Math.max(z0, z1)]);
  const T = 0.25;   // Wandstärke
  // Wände: jede Zonenkante wird in Stücke geteilt; wo eine Nachbarzone anliegt, bleibt eine Öffnung
  const open = (z: Zone, side: 'x0' | 'x1' | 'z0' | 'z1') => {
    const out: [number, number][] = [];
    for (const o of L.zones) {
      if (o === z) continue;
      if ((side === 'z0' && Math.abs(o.z1 - z.z0) < 0.01) || (side === 'z1' && Math.abs(o.z0 - z.z1) < 0.01)) {
        const a = Math.max(o.x0, z.x0), b = Math.min(o.x1, z.x1); if (b > a) out.push([a, b]);
      }
      if ((side === 'x0' && Math.abs(o.x1 - z.x0) < 0.01) || (side === 'x1' && Math.abs(o.x0 - z.x1) < 0.01)) {
        const a = Math.max(o.z0, z.z0), b = Math.min(o.z1, z.z1); if (b > a) out.push([a, b]);
      }
    }
    return out;
  };
  const wallRun = (z: Zone, side: 'x0' | 'x1' | 'z0' | 'z1', m: THREE.Material) => {
    const along = side === 'z0' || side === 'z1', a0 = along ? z.x0 : z.z0, a1 = along ? z.x1 : z.z1, pos = z[side];
    const gaps = open(z, side).sort((p, q) => p[0] - q[0]);
    let cur = a0;
    const seg = (s: number, e: number, y0 = 0, y1 = z.h) => {
      if (e - s < 0.01) return;
      const c = (s + e) / 2, h = y1 - y0;
      if (along) box(S, m, e - s, h, T, c, y0 + h / 2, pos); else box(S, m, T, h, e - s, pos, y0 + h / 2, c);
    };
    for (const [s, e] of gaps) {
      seg(cur, s);
      const nb = L.zones.find(o => o !== z && (along ? Math.abs((side === 'z0' ? o.z1 : o.z0) - pos) < 0.01 : Math.abs((side === 'x0' ? o.x1 : o.x0) - pos) < 0.01));
      const dh = Math.min(z.h, nb ? nb.h : z.h);
      seg(s, e, Math.min(dh, 2.3), z.h);   // Sturz über der Öffnung
      cur = e;
    }
    seg(cur, a1);
  };
  const front = L.zones[0];
  for (const z of L.zones) {
    const w = z.x1 - z.x0, d = z.z1 - z.z0, cx = (z.x0 + z.x1) / 2, cz = (z.z0 + z.z1) / 2;
    box(S, mFloor, w, 0.2, d, cx, -0.1, cz);
    box(S, mDark, w, 0.2, d, cx, z.h + 0.1, cz);
    rects.push([z.x0, z.x1, z.z0, z.z1]);
    for (const side of ['x0', 'x1', 'z1'] as const) wallRun(z, side, mWall);
    if (z !== front) wallRun(z, 'z0', mWall);
    // Deckenlicht und Leuchtleiste
    box(deco, mLight, Math.min(w * 0.15, 0.35), 0.04, d * 0.5, cx, z.h - 0.02, cz);
    for (const sx of [z.x0 + 0.14, z.x1 - 0.14]) box(deco, mAcc, 0.04, 0.06, d * 0.9, sx, 0.9, cz);
  }
  // Kanzel vorn: untere Brüstung, darüber Glas (man sieht nach draußen)
  {
    const z = front, w = z.x1 - z.x0, cx = (z.x0 + z.x1) / 2;
    box(S, mDark, w, 0.9, T, cx, 0.45, z.z0);
    const gl = box(deco, mGlass, w, z.h - 0.9, 0.05, cx, 0.9 + (z.h - 0.9) / 2, z.z0); gl.renderOrder = 2;
    for (let i = 0; i <= 3; i++) box(S, mDark, 0.08, z.h - 0.9, 0.12, z.x0 + (w * i) / 3, 0.9 + (z.h - 0.9) / 2, z.z0);
    box(S, mDark, w, 0.12, 0.12, cx, z.h - 0.06, z.z0);
  }
  // Einrichtung je Station
  for (const s of L.spots) {
    if (s.kind === 'seat') {
      box(S, mDark, 0.7, 0.5, 0.7, s.x, 0.25, s.z + 0.4);
      box(S, mDark, 0.7, 0.9, 0.15, s.x, 0.9, s.z + 0.75);
      box(S, mDark, Math.min(2.2, front.x1 - front.x0 - 0.4), 0.8, 0.5, s.x, 0.4, front.z0 + 0.45);
      box(deco, mScreen, Math.min(1.8, front.x1 - front.x0 - 0.8), 0.04, 0.32, s.x, 0.82, front.z0 + 0.45);
      block(s.x - 0.4, s.x + 0.4, s.z + 0.05, s.z + 0.85);
      block(front.x0, front.x1, front.z0, front.z0 + 0.7);
    } else if (s.kind === 'log' || s.kind === 'scanner') {
      box(S, mDark, 0.6, 1.1, 0.4, s.x, 0.55, s.z);
      const sc = box(deco, s.kind === 'scanner' ? mAcc : mScreen, 0.5, 0.35, 0.03, s.x, 1.35, s.z);
      sc.lookAt(sc.position.x, 1.35, sc.position.z + 1);
      block(s.x - 0.3, s.x + 0.3, s.z - 0.2, s.z + 0.2);
    } else if (s.kind === 'bench') {
      box(S, mDark, 0.9, 0.9, 2.2, s.x, 0.45, s.z);
      box(deco, mAcc, 0.9, 0.03, 2.2, s.x, 0.91, s.z);
      for (let i = 0; i < 3; i++) box(deco, mat(std(0xb0b4ba, { metalness: 0.7, roughness: 0.4 })), 0.15, 0.08, 0.3, s.x, 0.97, s.z - 0.6 + i * 0.6);
      block(s.x - 0.45, s.x + 0.45, s.z - 1.1, s.z + 1.1);
    } else if (s.kind === 'drones') {
      for (const dz of [-1.6, 1.6]) {
        box(S, mDark, 1.6, 0.25, 1.6, s.x, 0.12, s.z + dz);
        const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), mat(std(0xd0a050, { metalness: 0.6, roughness: 0.4, emissive: 0x3a2000 })));
        d.position.set(s.x, 0.8, s.z + dz); deco.add(d);
        block(s.x - 0.8, s.x + 0.8, s.z + dz - 0.8, s.z + dz + 0.8);
      }
    } else if (s.kind === 'bed') {
      box(S, mDark, 1.0, 0.5, 2.1, s.x, 0.25, s.z);
      box(S, mat(std(0x4a6a8a, { roughness: 0.95, metalness: 0 })), 0.9, 0.15, 2.0, s.x, 0.57, s.z);
      block(s.x - 0.5, s.x + 0.5, s.z - 1.05, s.z + 1.05);
    } else if (s.kind === 'locker') {
      box(S, mat(texMat(0x5a6470, 'hull_light', { roughness: 0.6, metalness: 0.4 })), 0.5, 2, 0.8, s.x, 1, s.z);
      block(s.x - 0.25, s.x + 0.25, s.z - 0.4, s.z + 0.4);
    } else if (s.kind === 'hatch') {
      // Luke in der Rückwand
      const z = L.zones.find(q => s.z >= q.z0 && s.z <= q.z1 + 0.01)!;
      box(deco, mAcc, 1.6, 2.1, 0.06, s.x, 1.05, z.z1 - 0.15);
      box(deco, mat(new THREE.MeshBasicMaterial({ color: 0x15171b })), 1.4, 1.95, 0.07, s.x, 1.0, z.z1 - 0.14);
    }
  }
  // Fracht als Kisten im Frachtraum (Füllstand wie im echten Frachtraum, Farben nach Rohstoff)
  if (L.hold && cap > 0) {
    const H = L.hold, cols: number[] = [];
    const nx = Math.floor((H.x1 - H.x0 - 1.4) / 1.15), nz = Math.floor((H.z1 - H.z0 - 3.6) / 1.15);
    const layers = H.h > 4 ? 3 : 2, slots = Math.max(0, nx) * Math.max(0, nz) * layers;
    const used = ITEM_IDS.reduce((a, k) => a + (cargo[k] || 0), 0), fill = Math.min(slots, Math.ceil(slots * used / cap));
    for (const k of ITEM_IDS) { const n = Math.round(fill * (cargo[k] || 0) / Math.max(1, used)); for (let i = 0; i < n; i++) cols.push(new THREE.Color(ITEMS[k].c).getHex()); }
    const byCol = new Map<number, THREE.MeshStandardMaterial>();
    // Kisten in den Seitenreihen, Mittelgang bleibt frei
    const half = Math.floor(nx / 2), x0 = H.x0 + 0.7 + 0.55, z0 = H.z0 + 1.4 + 0.55;
    let i = 0;
    for (let ly = 0; ly < layers && i < cols.length; ly++) for (let iz = 0; iz < nz && i < cols.length; iz++) for (let ix = 0; ix < nx && i < cols.length; ix++) {
      if (nx >= 3 && ix === half) continue;   // Gang
      const c = cols[i++];
      let m = byCol.get(c); if (!m) { m = mat(texMat(c, 'hull_light', { roughness: 0.7, metalness: 0.15 })); byCol.set(c, m); }
      box(S, m, 1.05, 1.0, 1.05, x0 + ix * 1.15, 0.5 + ly * 1.02, z0 + iz * 1.15);
    }
    // Sperrbereiche: belegte Seitenreihen
    if (cols.length) for (let ix = 0; ix < nx; ix++) {
      if (nx >= 3 && ix === half) continue;
      const rows = Math.min(nz, Math.ceil(cols.length / Math.max(1, (nx - (nx >= 3 ? 1 : 0)))));
      if (!rows) continue;
      block(x0 + ix * 1.15 - 0.55, x0 + ix * 1.15 + 0.55, z0 - 0.55, z0 + (rows - 1) * 1.15 + 0.55);
    }
    // Regale an der Wand
    // Regale an den Wänden, aber nicht vor Durchgängen in Nebenräume
    for (const [side, sx] of [['x0', H.x0 + 0.2], ['x1', H.x1 - 0.2]] as const) {
      const gaps = open(H, side).sort((p, q) => p[0] - q[0]);
      let cur = H.z0 + 0.5;
      for (const [a, b] of [...gaps, [H.z1 - 0.5, H.z1 - 0.5] as [number, number]]) {
        const e = Math.min(a, H.z1 - 0.5);
        if (e - cur > 0.5) box(S, mDark, 0.1, H.h * 0.8, e - cur, sx, H.h * 0.4, (cur + e) / 2);
        cur = b;
      }
    }
  }
  boxUV(S, 1 / 3);
  const zoneAt = (x: number, z: number) => L.zones.find(q => x >= q.x0 - 0.01 && x <= q.x1 + 0.01 && z >= q.z0 - 0.01 && z <= q.z1 + 0.01);
  // Lampen nach Raumgröße (kleines Cockpit: schwach), fehlende Lampen bleiben aus
  const lamps: [number, number, number, number][] = [...L.zones].sort((a, b) => (b.x1 - b.x0) * (b.z1 - b.z0) - (a.x1 - a.x0) * (a.z1 - a.z0)).slice(0, 3)
    .map(q => [(q.x0 + q.x1) / 2, q.h - 0.5, (q.z0 + q.z1) / 2, Math.min(0.35, Math.max(0.05, (q.x1 - q.x0) * (q.z1 - q.z0) / 220))]);
  while (lamps.length < 3) lamps.push([0, 1, 0, 0]);
  return {
    g, rects, obstacles, spots: L.spots, spawn: L.spawn, lamps, disposables,
    area: (x, z) => zoneAt(x, z)?.name || 'Schiff', height: Math.max(...L.zones.map(q => q.h)),
  };
}
