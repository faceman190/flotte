import * as THREE from 'three';
import { rng } from '../../core/util';
import { type Quader, imQuader } from './typen';

// =====================================================================================
// Plündererlager (seit 26.11.2026): ein kleiner Platz mit Deckungen auf dem Planetenboden. Erzeugt aus einem Startwert, damit alle
// Mitspieler dasselbe Lager sehen. Liefert die Quader (für Deckung, Sichtlinien, Treffer, Navmesh), die Modelle und die Dreiecke
// des Bodens rund ums Lager (Quelle fürs Navmesh).
//
// Die Modelle sind vorerst schlichte Formen (Sandsackwälle, Kisten, Fässer, ein Container). Wer echte Modelle einsetzen will:
// stellt sie an dieselben Quader (bauLager → teile), die Spielregeln hängen nur an den Quadern.
// =====================================================================================

export interface LagerTeil { art: 'wall' | 'kiste' | 'stapel' | 'container' | 'fass' | 'wrack'; q: Quader }
export interface LagerPlan { x: number; z: number; r: number; teile: LagerTeil[]; quader: Quader[]; wachen: { x: number; z: number; blick: number }[]; streife: { x: number; z: number }[] }

/** Plan des Lagers (ohne three.js-Modelle). boden(x, z): Höhe; frei(x, z): betretbar (kein Wasser, nicht zu steil); hindernis: schon vorhandene Kreise (Wracks) */
export function planLager(x: number, z: number, seed: number, boden: (x: number, z: number) => number, frei: (x: number, z: number) => boolean, hindernis: { x: number; z: number; r: number }[] = []): LagerPlan {
  const R = rng(seed), teile: LagerTeil[] = [], r = 17;
  const passt = (q: Quader) => {
    for (const t of teile) if (Math.hypot(t.q.x - q.x, t.q.z - q.z) < Math.hypot(t.q.hx, t.q.hz) + Math.hypot(q.hx, q.hz) + 1.4) return false;
    for (const h of hindernis) if (Math.hypot(h.x - q.x, h.z - q.z) < h.r + Math.hypot(q.hx, q.hz) + 1) return false;
    const { cos, sin } = Math;
    for (const [a, b] of [[1, 1], [1, -1], [-1, 1], [-1, -1], [0, 0]]) {
      const px = q.x + a * q.hx * cos(q.yaw) + b * q.hz * sin(q.yaw), pz = q.z - a * q.hx * sin(q.yaw) + b * q.hz * cos(q.yaw);
      if (!frei(px, pz)) return false;
    }
    return true;
  };
  const setze = (art: LagerTeil['art'], dist: [number, number], hx: number, hz: number, h: number, yawTangent: boolean) => {
    for (let k = 0; k < 24; k++) {
      const a = R.range(0, Math.PI * 2), d = R.range(dist[0], dist[1]);
      const qx = x + Math.cos(a) * d, qz = z + Math.sin(a) * d;
      // Wälle stehen quer zur Richtung von der Mitte (wie ein Ring um das Lager), der Rest beliebig
      const yaw = yawTangent ? Math.atan2(-Math.sin(a), Math.cos(a)) + Math.PI / 2 + R.range(-0.3, 0.3) : R.range(0, Math.PI);
      const q: Quader = { x: qx, z: qz, y0: 0, hx, hz, h, yaw };
      q.y0 = Math.min(...[[-1, -1], [1, 1], [-1, 1], [1, -1]].map(([u, v]) => boden(qx + u * hx, qz + v * hz))) - 0.05;
      if (!passt(q)) continue;
      teile.push({ art, q }); return true;
    }
    return false;
  };
  setze('container', [3, 7], 3.0, 1.2, 2.6, false);
  for (let i = 0; i < 3; i++) setze('wall', [9, 15], 1.7, 0.35, 1.1, true);
  for (let i = 0; i < 2; i++) setze('wall', [4, 9], 1.4, 0.35, 1.1, true);
  for (let i = 0; i < 3; i++) setze('kiste', [3, 14], 0.6, 0.6, 1.2, false);
  for (let i = 0; i < 2; i++) setze('stapel', [5, 13], 0.65, 0.65, 2.0, false);
  for (let i = 0; i < 3; i++) setze('fass', [2, 12], 0.32, 0.32, 0.95, false);
  const quader = teile.map(t => t.q);
  // Wachen: zwei am Lager, Blick nach außen; Streife: sechs Punkte auf einem Ring
  const wachen: LagerPlan['wachen'] = [], streife: LagerPlan['streife'] = [];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2 + R.range(-0.2, 0.2), d = R.range(16, 22);
    const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (frei(px, pz) && !quader.some(q => imQuader(q, px, pz, 0.8))) streife.push({ x: px, z: pz });
  }
  for (let i = 0; i < 2; i++) {
    for (let k = 0; k < 12; k++) {
      const a = R.range(0, Math.PI * 2), d = R.range(2, 6), px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (!frei(px, pz) || quader.some(q => imQuader(q, px, pz, 0.8))) continue;
      wachen.push({ x: px, z: pz, blick: Math.atan2(px - x, pz - z) }); break;
    }
  }
  return { x, z, r, teile, quader, wachen, streife };
}

// ---------- Modelle ----------
let MAT: Record<string, THREE.MeshStandardMaterial> | null = null;
function mats() {
  if (MAT) return MAT;
  const m = (color: number, rough = 0.85, metal = 0.05) => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  MAT = { sand: m(0x7d725c, 0.95), kiste: m(0x5b5a3a, 0.8), band: m(0x2c2a24, 0.6, 0.4), container: m(0x8a4a2a, 0.7, 0.45), rippe: m(0x6e3a22, 0.65, 0.5), fass: m(0x3d4a55, 0.55, 0.6), deckel: m(0x9a7a2a, 0.5, 0.5) };
  return MAT;
}
const box = (w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); me.position.set(x, y, z); me.castShadow = me.receiveShadow = true; return me; };

export function bauModelle(plan: LagerPlan): THREE.Group {
  const M = mats(), g = new THREE.Group(); g.name = 'pluendererlager';
  for (const t of plan.teile) {
    const q = t.q, o = new THREE.Group();
    o.position.set(q.x, q.y0, q.z); o.rotation.y = q.yaw;
    const W = q.hx * 2, D = q.hz * 2, H = q.h;
    if (t.art === 'wall') {
      // Sandsäcke in drei Lagen, leicht versetzt
      const n = Math.max(2, Math.round(W / 0.6)), lh = H / 3;
      for (let L = 0; L < 3; L++) for (let i = 0; i < n - (L % 2); i++) {
        const s = box(W / n * 0.96, lh * 0.92, D * 0.9, M.sand, -W / 2 + (i + 0.5 + (L % 2) * 0.5) * W / n, lh * (L + 0.5), 0);
        s.rotation.y = (i * 7 + L * 3) % 5 * 0.03 - 0.06; o.add(s);
      }
    } else if (t.art === 'kiste' || t.art === 'stapel') {
      const lagen = t.art === 'stapel' ? 2 : 1, lh = H / lagen;
      for (let L = 0; L < lagen; L++) {
        const k = box(W, lh * 0.98, D, M.kiste, 0, lh * (L + 0.5), 0); k.rotation.y = L * 0.12; o.add(k);
        o.add(box(W * 1.02, 0.06, D * 1.02, M.band, 0, lh * (L + 0.2), 0), box(W * 1.02, 0.06, D * 1.02, M.band, 0, lh * (L + 0.8), 0));
      }
    } else if (t.art === 'container') {
      o.add(box(W, H, D, M.container, 0, H / 2, 0));
      for (let i = 0; i < 9; i++) o.add(box(0.06, H * 0.92, D * 1.03, M.rippe, -W / 2 + 0.3 + i * (W - 0.6) / 8, H / 2, 0));
    } else if (t.art === 'fass') {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(q.hx * 0.95, q.hx * 0.95, H, 14), M.fass); c.position.y = H / 2; c.castShadow = c.receiveShadow = true;
      const d = new THREE.Mesh(new THREE.CylinderGeometry(q.hx * 0.97, q.hx * 0.97, 0.05, 14), M.deckel); d.position.y = H; o.add(c, d);
    }
    g.add(o);
  }
  return g;
}

/**
 * Dreiecke fürs Navmesh: Boden im Umkreis rad (Raster schritt m, ohne nasse Zellen) und die Quader als feste Klötze.
 * hindernis: Kreise (Wracks), als achteckige Säulen mit 4 m Höhe.
 */
export function navQuelle(plan: LagerPlan, rad: number, schritt: number, boden: (x: number, z: number) => number, nass: (x: number, z: number) => boolean, hindernis: { x: number; z: number; r: number }[] = []) {
  const pos: number[] = [], idx: number[] = [];
  const n = Math.ceil(rad * 2 / schritt), x0 = plan.x - rad, z0 = plan.z - rad;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { const x = x0 + i * schritt, z = z0 + j * schritt; pos.push(x, boden(x, z), z); }
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = x0 + (i + 0.5) * schritt, cz = z0 + (j + 0.5) * schritt;
    if (nass(cx, cz) || Math.hypot(cx - plan.x, cz - plan.z) > rad) continue;
    const a = i * (n + 1) + j, b = a + 1, c = a + n + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);      // Oberseite nach oben (Recast braucht die Windung gegen den Uhrzeigersinn von oben gesehen)
  }
  const klotz = (ecken: [number, number][], y0: number, y1: number) => {
    const o = pos.length / 3, k = ecken.length;
    for (const [x, z] of ecken) pos.push(x, y0, z);
    for (const [x, z] of ecken) pos.push(x, y1, z);
    for (let i = 1; i < k - 1; i++) idx.push(o + k, o + k + i + 1, o + k + i);      // Deckel
    for (let i = 0; i < k; i++) { const a = o + i, b = o + (i + 1) % k; idx.push(a, b, b + k, a, b + k, a + k); }
  };
  for (const q of plan.quader) {
    const c = Math.cos(q.yaw), s = Math.sin(q.yaw);
    const e: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => [q.x + u * q.hx * c + v * q.hz * s, q.z - u * q.hx * s + v * q.hz * c]);
    klotz(e, q.y0 - 0.5, q.y0 + Math.max(q.h, 1.9));      // flache Hindernisse hoch genug, damit niemand darauf steht
  }
  for (const h of hindernis) {
    if (Math.hypot(h.x - plan.x, h.z - plan.z) > rad + h.r) continue;
    const e: [number, number][] = []; for (let i = 0; i < 8; i++) { const a = -i / 8 * Math.PI * 2; e.push([h.x + Math.cos(a) * h.r, h.z + Math.sin(a) * h.r]); }
    const y = boden(h.x, h.z); klotz(e, y - 1, y + 4);
  }
  return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
}
