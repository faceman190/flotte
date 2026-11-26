import { type Sicht, winkel, clamp01 } from './typen';

// =====================================================================================
// Wahrnehmung (seit 26.11.2026): Sehen, Hören, Gedächtnis.
//
// Sehen baut einen Wert „wach“ auf (0 bis 1). Erst bei 1 hat der Gegner den Spieler wirklich entdeckt; bis dahin schaut er hin
// (verdächtig ab 0,35). So hat der Spieler je nach Abstand eine Reaktionszeit von etwa 0,3 s (ganz nah) bis 2 s (am Rand der
// Sichtweite), statt sofort beschossen zu werden. Geduckt und am Rand des Blickfelds dauert es länger.
// Hören: Schüsse und Einschläge in der Nähe machen sofort verdächtig und merken die Stelle (dann sieht er dort nach).
// Gedächtnis: wo das Ziel zuletzt gesehen wurde und wann; der Trupp teilt es (pluenderer.ts).
// =====================================================================================

export const SINN = {
  weit: 48,              // Sichtweite ruhig (m)
  weitAlarm: 75,         // Sichtweite im Kampf
  fov: 62 * Math.PI / 180,        // halber Blickwinkel ruhig
  fovAlarm: 110 * Math.PI / 180,  // halber Blickwinkel im Kampf
  rundum: 3.5,           // so nah wird man immer bemerkt
  auf: 3.2,              // Aufbau je Sekunde bei voller Sichtstärke
  ab: 0.18,              // Abbau je Sekunde ohne Sicht
  verdacht: 0.35,
  vergessen: 25,         // s ohne Sicht und Geräusch, dann ist der Kampf vorbei
};

export interface Sinne {
  wach: number;                          // 0..1, 1 = entdeckt
  kampf: boolean;                        // einmal entdeckt: im Kampf, bis das Ziel 25 s lang weder gesehen noch gehört wurde
  sieht: boolean;                        // Ziel gerade sichtbar (Sichtlinie frei, im Blickfeld)
  zuletzt: { x: number; y: number; z: number; t: number } | null;   // zuletzt gesehen / gehört
  ziel: number;                          // Kennung des Ziels (−1 = keins)
  gehoert: number;                       // Zeit des letzten Geräuschs
}
export const neueSinne = (): Sinne => ({ wach: 0, kampf: false, sieht: false, zuletzt: null, ziel: -1, gehoert: -1e9 });

export interface Auge { x: number; y: number; z: number; yaw: number; alarm: boolean }      // yaw: Blickrichtung (atan2(dx, dz))
export interface Kandidat { id: number; x: number; y: number; z: number; geduckt: boolean; bewegt: boolean }

/** Sichtstärke 0..1 für einen Kandidaten (0 = nicht zu sehen) */
export function sichtStaerke(a: Auge, k: Kandidat, sicht: Sicht) {
  const dx = k.x - a.x, dz = k.z - a.z, d = Math.hypot(dx, dz);
  const weit = a.alarm ? SINN.weitAlarm : SINN.weit;
  if (d > weit) return 0;
  const off = Math.abs(winkel(Math.atan2(dx, dz) - a.yaw)), fov = a.alarm ? SINN.fovAlarm : SINN.fov;
  if (d > SINN.rundum && off > fov) return 0;
  // Kopf und Brust prüfen: ist eines frei, ist er zu sehen
  if (!sicht(a.x, a.y, a.z, k.x, k.y, k.z) && !sicht(a.x, a.y, a.z, k.x, k.y - 0.5, k.z)) return 0;
  const nahe = 1 - d / weit;
  const rand = d <= SINN.rundum ? 1 : 1 - 0.55 * (off / fov);       // am Rand des Blickfelds schwächer
  return clamp01((0.25 + 0.75 * Math.sqrt(nahe)) * rand * (k.geduckt ? 0.6 : 1) * (k.bewegt ? 1.15 : 1));
}

/**
 * Sinne für ein Bild fortschreiben. Gibt das gesehene Ziel zurück (oder null). Mehrere Kandidaten (Mitspieler): der am stärksten
 * sichtbare; ein bekanntes Ziel bleibt, solange es nicht deutlich schwächer zu sehen ist als ein anderes.
 */
export function sinneUpdate(s: Sinne, a: Auge, kand: Kandidat[], sicht: Sicht, dt: number, jetzt: number): Kandidat | null {
  let best: Kandidat | null = null, bs = 0;
  for (const k of kand) {
    let st = sichtStaerke(a, k, sicht);
    if (k.id === s.ziel) st *= 1.25;
    if (st > bs) { bs = st; best = k; }
  }
  s.sieht = !!best && bs > 0;
  if (best) {
    s.wach = Math.min(1, s.wach + bs * SINN.auf * dt * (a.alarm ? 2 : 1));
    if (s.wach >= SINN.verdacht) { s.zuletzt = { x: best.x, y: best.y, z: best.z, t: jetzt }; s.ziel = best.id; }
  } else {
    s.wach = Math.max(s.zuletzt && jetzt - s.zuletzt.t < 20 ? 0.5 : 0, s.wach - SINN.ab * dt);
  }
  if (s.wach >= 1) s.kampf = true;
  if (s.kampf && (!s.zuletzt || jetzt - s.zuletzt.t > SINN.vergessen)) { s.kampf = false; s.wach = Math.min(s.wach, 0.5); }
  // im Kampf ist ein gesehenes Ziel sofort erkannt (kein neuer Aufbau nach jedem Abtauchen)
  if (s.sieht && s.kampf && best) { s.zuletzt = { x: best.x, y: best.y, z: best.z, t: jetzt }; s.ziel = best.id; return best; }
  return s.sieht && s.wach >= 1 ? best : null;
}

/** Geräusch bei (x, y, z) mit Reichweite r gehört? Dann verdächtig und Stelle merken. */
export function hoeren(s: Sinne, a: { x: number; z: number }, g: { x: number; y: number; z: number; r: number }, jetzt: number) {
  if (Math.hypot(g.x - a.x, g.z - a.z) > g.r) return false;
  s.wach = Math.max(s.wach, 0.6);
  if (!s.zuletzt || jetzt - s.zuletzt.t > 1.5) s.zuletzt = { x: g.x, y: g.y, z: g.z, t: jetzt };
  s.gehoert = jetzt;
  return true;
}
