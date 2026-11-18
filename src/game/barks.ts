import { bark } from '../core/audio';

// =====================================================================================
// Rufe von Figuren (Aufnahmen: asset-src/voice/npc, Sprechliste: docs/voice/npc.md).
// Laufen über bark() neben der Geschichte; eine Geschichtsstimme hat immer Vorrang.
// =====================================================================================

// Personal an den Theken: Stimme nach Vorname (Namen aus interior.ts → NAMES und Geschichtsfiguren)
const FEM = new Set(['mira', 'leta', 'ilka', 'sefa', 'runa', 'yara', 'edda', 'tilda', 'nele', 'kaja', 'tamm', 'roth', 'krull']);
export const isFem = (name: string) => FEM.has((name || '').trim().split(/\s+/)[0].toLowerCase());
export function staffBark(name: string, tab: string) { bark(`g_${tab}_${isFem(name) ? 'w' : 'm'}`); }

// Wächterdrohnen: metallische Stimme, leiser mit der Entfernung; Pause dazwischen, damit ein Schwarm nicht durcheinander ruft
let droneT = 0;
export function droneBark(kind: 'alarm' | 'tot', dist: number) {
  const now = performance.now();
  if (now < droneT || (kind === 'tot' && Math.random() < 0.4)) return;
  const vol = Math.max(0, Math.min(1, 1.25 - dist / 28));
  const id = kind === 'alarm' ? 'd_alarm' + (1 + Math.floor(Math.random() * 3)) : 'd_tot' + (Math.random() < 0.5 ? 1 : 2);
  droneT = now + 600;                                            // gegen Doppelstart im selben Augenblick
  bark(id, 'robo', vol).then(ok => { if (ok) droneT = performance.now() + (kind === 'alarm' ? 7000 : 3000); });
}

// Andockkontrolle über Funk: angedockt (Station), gelandet (Planetenbasis), abgelegt
export function dockBark(kind: 'an' | 'land' | 'ab', delay = 900) {
  // k_an1 („Klammern greifen“) passt nicht mehr, seit man im Hangar landet: Station und Planetenbasis sagen beide k_an2
  const id = kind === 'ab' ? (Math.random() < 0.5 ? 'k_ab1' : 'k_ab2') : 'k_an2';
  setTimeout(() => { bark(id, 'funk'); }, delay);
}
