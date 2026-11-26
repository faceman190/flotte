// =====================================================================================
// Gemeinsame Typen der Gegner-KI (src/game/ki/, seit 26.11.2026). Die Module hier kennen weder three.js noch den Ort:
// Was sie über die Welt wissen müssen (Sichtlinie, Boden, Weg), bekommen sie als Funktionen vom Aufrufer (pluenderer.ts).
// So laufen sie auch in Node (scripts/kitest.mjs) und passen später in Minen, Stationen und Städte.
// =====================================================================================

export interface V3 { x: number; y: number; z: number }

/** freie Sichtlinie von a nach b (true = nichts dazwischen) */
export type Sicht = (ax: number, ay: number, az: number, bx: number, by: number, bz: number) => boolean;

/** Bodenhöhe an (x, z) */
export type Boden = (x: number, z: number) => number;

/**
 * Hindernis als gedrehter Quader: Mitte (x, z), Fußpunkt y0, halbe Breite hx (lokale x-Achse) und halbe Tiefe hz (lokale z-Achse),
 * Höhe h, Drehung yaw um die Hochachse (wie Object3D.rotation.y: lokal (1, 0) liegt in der Welt bei (cos yaw, −sin yaw)).
 */
export interface Quader { x: number; z: number; y0: number; hx: number; hz: number; h: number; yaw: number }

/** lokale Achsen eines Quaders in der Welt */
export function achsen(q: Quader) {
  const c = Math.cos(q.yaw), s = Math.sin(q.yaw);
  return { ax: c, az: -s, bx: s, bz: c };      // a = lokal x, b = lokal z
}

/** liegt (x, z) im Quader, um rand vergrößert? */
export function imQuader(q: Quader, x: number, z: number, rand = 0) {
  const { ax, az, bx, bz } = achsen(q), dx = x - q.x, dz = z - q.z;
  return Math.abs(dx * ax + dz * az) < q.hx + rand && Math.abs(dx * bx + dz * bz) < q.hz + rand;
}

/**
 * Strahl gegen Quader (Slab-Verfahren im lokalen Raum). Gibt den Abstand t (in Einheiten der Richtung d) des ersten Eintritts zurück,
 * −1 ohne Treffer. Wer im Quader startet, trifft nicht (Schütze hinter einer Kante soll nicht an sich selbst hängen bleiben).
 */
export function strahlQuader(q: Quader, ox: number, oy: number, oz: number, dx: number, dy: number, dz: number, tMax: number) {
  const { ax, az, bx, bz } = achsen(q);
  const rx = ox - q.x, rz = oz - q.z;
  const o = [rx * ax + rz * az, oy - (q.y0 + q.h / 2), rx * bx + rz * bz];
  const d = [dx * ax + dz * az, dy, dx * bx + dz * bz];
  const e = [q.hx, q.h / 2, q.hz];
  let t0 = 0, t1 = tMax;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (Math.abs(o[i]) > e[i]) return -1; continue; }
    let a = (-e[i] - o[i]) / d[i], b = (e[i] - o[i]) / d[i];
    if (a > b) { const t = a; a = b; b = t; }
    if (a > t0) t0 = a; if (b < t1) t1 = b;
    if (t0 > t1) return -1;
  }
  if (t0 <= 0) return -1;      // Start im Quader
  return t0;
}

export const winkel = (a: number) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
