import { sfx, snd } from '../core/audio';

// =====================================================================================
// Schritte je Untergrund (seit 26.11.2026). Aufnahmen aus dem Fab-Paket „TFP Movement“ (asset-src/sound-lazy/fs_*, Paket world),
// Schlüssel fs_<grund><n>, fs_<grund>_land<n> (Aufkommen nach einem Sprung) und fs_<grund>_jump<n> (Absprung).
// Solange das Paket world noch lädt oder eine Aufnahme fehlt, klingen die alten Schritte step0–4.
//
// Wer welchen Untergrund meldet:
//  - Planetenboden (onfoot.ts): nach Planetentyp, Hangneigung und Ufer (grundPlanet), Stege der Basis Metall, Stadt Beton
//  - Schiffe und Stationen (interior.ts): Metall, Beton, Quartiere Teppich, Bars Holz (grundInnen)
//  - Minen (dungeon.ts): Fels
// =====================================================================================

export type Grund = 'gras' | 'sand' | 'kies' | 'fels' | 'erde' | 'matsch' | 'schnee' | 'pulver' | 'wasser' | 'metall' | 'beton' | 'holz' | 'teppich';

// Zahl der Aufnahmen: Schritte, Aufkommen, Absprung
const ZAHL: Record<Grund, [number, number, number]> = {
  gras: [8, 3, 2], sand: [8, 0, 0], kies: [8, 3, 1], fels: [8, 2, 2], erde: [8, 3, 1], matsch: [6, 3, 0], schnee: [8, 0, 0],
  pulver: [8, 0, 0], wasser: [8, 4, 0], metall: [10, 0, 0], beton: [8, 3, 1], holz: [6, 2, 1], teppich: [6, 0, 0],
};
// Lautstärke je Untergrund (die Aufnahmen sind auf gleiche Spitze gebracht; weiche Böden etwas leiser, Teppich deutlich)
const LAUT: Record<Grund, number> = {
  gras: 0.9, sand: 0.85, kies: 1, fels: 1, erde: 0.95, matsch: 0.95, schnee: 0.95, pulver: 0.85, wasser: 1.15, metall: 1.05, beton: 1, holz: 1, teppich: 0.45,
};

const zuletzt: Record<string, number> = {};
function waehle(key: string, n: number) {
  let i = Math.floor(Math.random() * n);
  if (n > 1 && i === zuletzt[key]) i = (i + 1) % n;      // nie zweimal dieselbe Aufnahme hintereinander
  zuletzt[key] = i;
  return key + i;
}
const alt = (vol: number, rate: number) => sfx('step' + Math.floor(Math.random() * 5), vol, rate, () => snd(70 + Math.random() * 20, 0.06, 'triangle', vol * 0.06, -20));

/** ein Schritt; vol wie bisher (Gehen um 0,3, Rennen um 0,5) */
export function schritt(g: Grund, vol: number, rate = 0.92 + Math.random() * 0.16) {
  sfx(waehle('fs_' + g, ZAHL[g][0]), vol * LAUT[g] * 1.15, rate, () => alt(vol, rate));
}

/** Absprung */
export function sprungLaut(g: Grund) {
  const n = ZAHL[g][2];
  if (n) sfx(waehle(`fs_${g}_jump`, n), 0.38 * LAUT[g], 0.95 + Math.random() * 0.1, () => alt(0.22, 1.1));
  else schritt(g, 0.28, 1.08);
}

/** Aufkommen; wucht 0..1 (Fallgeschwindigkeit) */
export function landeLaut(g: Grund, wucht = 0.6) {
  const n = ZAHL[g][1], v = 0.3 + 0.35 * Math.min(1, wucht);
  if (n) sfx(waehle(`fs_${g}_land`, n), v * LAUT[g], 0.95 + Math.random() * 0.1, () => alt(v, 0.85));
  else { schritt(g, v, 0.9); setTimeout(() => schritt(g, v * 0.7, 1.0), 70); }      // ohne eigene Aufnahme: beide Füße kurz nacheinander
}

/** Planetenboden: Typ des Planeten (PlanetDef.type), Hangneigung (0 = eben, 1 = 45°), am Wasser? */
export function grundPlanet(typ: string | undefined, hang: number, ufer: boolean): Grund {
  if (ufer && (typ === 'fels' || typ === 'eis' || typ === 'wueste')) return typ === 'eis' ? 'matsch' : 'wasser';
  const steil = hang > 0.45;
  switch (typ) {
    case 'fels': return steil ? 'fels' : 'gras';
    case 'wueste': return steil ? 'kies' : 'sand';
    case 'eis': return steil ? 'pulver' : 'schnee';
    case 'vulkan': return steil ? 'kies' : 'fels';
    case 'asche': return steil ? 'kies' : 'erde';
    case 'kristall': return 'fels';
    case 'mond': return steil ? 'kies' : 'erde';
    default: return 'erde';
  }
}

/** Schiffe und Stationen: nach Raum */
export function grundInnen(schiff: boolean, raum: string): Grund {
  if (/Quartier|Kabine|Suite/i.test(raum)) return 'teppich';
  if (/Bar|Kantine|Lounge|Taverne/i.test(raum)) return 'holz';
  if (schiff || /Hangar|Fracht|Lager|Werk|Maschin/i.test(raum)) return 'metall';
  return 'beton';
}
