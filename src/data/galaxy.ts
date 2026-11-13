import type { ItemId } from './items';

// Die feste Galaxie. Gleiche Daten für alle Spieler: der Server übernimmt sie später 1:1.
export type Faction = 'core' | 'border' | 'ferrox';
export type FieldKind = 'metal' | 'ice' | 'mixed' | 'crystal';
export type Nebula = 'red' | 'blue' | 'green' | 'gold' | 'violet' | 'crimson' | 'heimat';   // heimat: hochauflösend, Heimstatt und Hauptmenü
export interface StationDef {
  id: string;
  kind: 'carrier' | 'station' | 'outpost';
  city?: string;                  // Stadt auf einem Planeten (Modell asset-src/glb/city/<Name>.glb, src/game/city.ts)
  name: string;
  pos: [number, number, number];
  prices?: Partial<Record<ItemId, number>>; // Faktor auf den Grundpreis
  refinery?: boolean;
}
export interface FieldDef { kind: FieldKind; pos: [number, number, number]; r: number; n: number; ore?: Partial<Record<ItemId, number>> }
export interface SectorDef {
  id: string;
  name: string;
  faction: Faction;
  danger: number;               // 0 sicher … 5 tödlich
  map: [number, number];        // Position auf der Galaxiekarte (0–1000 × 0–600)
  links: string[];              // Sprungtor-Verbindungen
  desc: string;
  neb: Nebula;
  tint: number;                 // Färbung des Nebelhimmels
  planet?: { size: number; tint: number; dir: [number, number, number]; atm?: number };
  stations: StationDef[];
  fields: FieldDef[];
  hives?: number;               // Ferrox-Bienenstöcke (Mutterschiffe)
  sky?: { rot?: [number, number, number]; gain?: number };   // feste Himmelsdrehung und Helligkeit (sonst zufällig je Sektor)
}

export const FACTION = {
  core: { n: 'Menschenraum', c: '#ffb347', gate: 0xffb347 },
  border: { n: 'Grenzgebiet', c: '#f2d36b', gate: 0xf2d36b },
  ferrox: { n: 'Ferrox-Gebiet', c: '#c070ff', gate: 0xb070ff },
};

export const SECTORS: SectorDef[] = [
  // ---------------- Menschenraum (Westen) ----------------
  {
    id: 'heimstatt', name: 'Heimstatt', faction: 'core', danger: 0, map: [170, 300], links: ['lichtwall', 'neuhafen', 'sonnenfeld'],
    desc: 'Herz des Menschenraums. Hier ging die Bastion vor Anker, nachdem ihre Crew hinter dem Riss gestrandet war.',
    // Nebel-Mitte (Bildmitte) liegt hinter der Menüszene: Drehung π − 0,6 passt zur Menükamera (main.ts, MENU_ORBIT)
    neb: 'heimat', tint: 0xffffff, sky: { rot: [0, Math.PI - 0.6, 0], gain: 1.7 }, planet: { size: 3000, tint: 0xc8dcff, dir: [-0.6, -0.2, -0.8], atm: 0x80b0ff },
    stations: [
      { id: 'bastion', kind: 'carrier', name: 'Bastion', pos: [0, 0, 0], prices: { schrott: 1.2 }, refinery: true },
      { id: 'heimring', kind: 'station', name: 'Heimstatt-Ring', pos: [1100, 120, -900], prices: { zellen: 1.15 }, refinery: true },
    ],
    fields: [{ kind: 'metal', pos: [-1800, 0, 1000], r: 900, n: 40 }, { kind: 'ice', pos: [1700, -100, 1500], r: 700, n: 22 }],
  },
  {
    id: 'lichtwall', name: 'Lichtwall', faction: 'core', danger: 0, map: [270, 180], links: ['heimstatt', 'eisgarten', 'rotfels'],
    desc: 'Werftsektor. Hier entstehen die neuen Schiffe des Menschenraums, Erz ist immer gefragt.',
    neb: 'gold', tint: 0x9c9088, planet: { size: 2200, tint: 0xffd8c8, dir: [0.7, 0.3, -0.6], atm: 0xff9a60 },
    stations: [{ id: 'lichtwerft', kind: 'station', name: 'Lichtwall-Werft', pos: [0, 0, 0], prices: { erz: 1.2, eis: 0.95, stahl: 1.2, titanb: 1.15 }, refinery: true }],
    fields: [{ kind: 'mixed', pos: [1900, 100, -700], r: 1000, n: 55 }, { kind: 'metal', pos: [-1500, -200, -1500], r: 700, n: 30 }],
  },
  {
    id: 'eisgarten', name: 'Eisgarten', faction: 'core', danger: 0, map: [140, 100], links: ['lichtwall'],
    desc: 'Eisfelder, so weit das Auge reicht. Wassereis ist hier billig, Erz dafür knapp.',
    neb: 'green', tint: 0xa8b8b4, planet: { size: 3400, tint: 0xd8f0ff, dir: [0.2, -0.4, 1], atm: 0xa0d0ff },
    stations: [{ id: 'eisstation', kind: 'outpost', name: 'Eisgarten-Station', pos: [0, 0, 0], prices: { eis: 0.7, erz: 1.3 } }],
    fields: [
      { kind: 'ice', pos: [1600, 0, 600], r: 1100, n: 60 },
      { kind: 'ice', pos: [-1300, 150, -1400], r: 900, n: 45 },
      { kind: 'ice', pos: [-500, -200, 2100], r: 700, n: 30 },
    ],
  },
  {
    id: 'neuhafen', name: 'Neuhafen', faction: 'core', danger: 1, map: [280, 430], links: ['heimstatt', 'kupferbucht', 'splitter'],
    desc: 'Handelsknoten Richtung Süden. Vereinzelt tauchen Ferrox-Späher auf.',
    neb: 'red', tint: 0xc0c0c0, planet: { size: 2600, tint: 0xffffff, dir: [0.5, -0.1, 0.8], atm: 0xff9a60 },
    stations: [{ id: 'neuhafen', kind: 'station', name: 'Neuhafen', pos: [0, 0, 0], prices: { schrott: 1.25, kupferb: 1.15 }, refinery: true }],
    fields: [{ kind: 'mixed', pos: [-1600, 0, 900], r: 900, n: 40 }],
  },
  {
    id: 'sonnenfeld', name: 'Sonnenfeld', faction: 'core', danger: 0, map: [55, 330], links: ['heimstatt'],
    desc: 'Erzreiche Trümmerfelder im Licht einer alten Sonne: die Reste des Halden-Tors, das beim Riss zerbrach. Ruhig und ertragreich.',
    neb: 'gold', tint: 0xa89a8c, planet: { size: 3600, tint: 0xffd8a0, dir: [-0.3, 0.1, -1], atm: 0xffb060 },
    stations: [{ id: 'sonnenwacht', kind: 'outpost', name: 'Sonnenwacht', pos: [0, 0, 0], prices: { erz: 0.85 } }],
    fields: [{ kind: 'metal', pos: [1400, 0, -1000], r: 1000, n: 65, ore: { erz: 6, kupfer: 3, titan: 0.3 } }, { kind: 'metal', pos: [-1600, 100, 700], r: 900, n: 50 }],
  },
  {
    id: 'kupferbucht', name: 'Kupferbucht', faction: 'core', danger: 1, map: [170, 525], links: ['neuhafen'],
    desc: 'Bergbaukolonie am Rand. Viel Erz, wenig Eis, gelegentlich Ärger.',
    neb: 'red', tint: 0xc8b8a8,
    stations: [{ id: 'kupfermine', kind: 'outpost', name: 'Kupferbucht-Mine', pos: [0, 0, 0], prices: { erz: 0.8, eis: 1.35 } }],
    fields: [{ kind: 'metal', pos: [1300, -100, 1200], r: 1000, n: 65, ore: { kupfer: 6, erz: 3, titan: 0.3 } }, { kind: 'mixed', pos: [-1500, 0, -900], r: 800, n: 35 }],
  },
  // ---------------- Grenzgebiet ----------------
  {
    id: 'rotfels', name: 'Rotfels', faction: 'border', danger: 2, map: [410, 150], links: ['lichtwall', 'nebeltor', 'wacht'],
    desc: 'Rötliche Gesteinsbrocken und die ersten Spuren der Ferrox.',
    neb: 'red', tint: 0xc8b0a8, planet: { size: 2800, tint: 0xffb090, dir: [0.4, 0.2, 0.9], atm: 0xff8050 },
    stations: [{ id: 'rotrelais', kind: 'outpost', name: 'Rotfels-Relais', pos: [0, 0, 0], prices: { erz: 1.15, eis: 1.2, schrott: 1.3 } }],
    fields: [{ kind: 'metal', pos: [-1300, 0, 1400], r: 1100, n: 55, ore: { erz: 4, titan: 2.5, kupfer: 1.5 } }],
  },
  {
    id: 'wacht', name: 'Wachtposten Ost', faction: 'border', danger: 2, map: [430, 300], links: ['rotfels', 'splitter', 'grauzone'],
    desc: 'Die vorderste Verteidigungslinie. Patrouillen fliegen hier rund um die Uhr.',
    neb: 'blue', tint: 0xb8bcc8,
    stations: [{ id: 'wachtposten', kind: 'outpost', name: 'Wachtposten Ost', pos: [0, 0, 0], prices: { schrott: 1.45, eis: 1.15 } }],
    fields: [{ kind: 'mixed', pos: [1500, 0, -1100], r: 900, n: 40 }],
  },
  {
    id: 'splitter', name: 'Splittergürtel', faction: 'border', danger: 3, map: [410, 465], links: ['neuhafen', 'wacht', 'schlacke'],
    desc: 'Ein riesiger Trümmergürtel voller Erz. Die Ferrox kommen regelmäßig zum Plündern.',
    neb: 'crimson', tint: 0xd8c8c8,
    stations: [{ id: 'splittermine', kind: 'outpost', name: 'Splitter-Mine', pos: [0, 0, 0], prices: { erz: 1.05, eis: 1.4, zellen: 1.3 }, refinery: true }],
    fields: [{ kind: 'metal', pos: [0, 0, 1900], r: 1500, n: 100, ore: { erz: 4, titan: 3, kupfer: 2, iridium: 0.15 } }, { kind: 'ice', pos: [-1900, 0, -600], r: 800, n: 30 }],
  },
  {
    id: 'nebeltor', name: 'Nebeltor', faction: 'border', danger: 3, map: [570, 90], links: ['rotfels', 'schwarzglas'],
    desc: 'Dichter Nebel und die ersten Ferrit-Kristalle. Keine Station, keine Hilfe.',
    neb: 'green', tint: 0xa0b0b0, planet: { size: 3000, tint: 0xb0c0ff, dir: [-0.5, 0.3, 0.8], atm: 0x8090ff },
    stations: [],
    fields: [{ kind: 'ice', pos: [1100, 100, 1100], r: 1200, n: 55 }, { kind: 'crystal', pos: [-1600, -100, -900], r: 600, n: 12 }],
  },
  {
    id: 'grauzone', name: 'Grauzone', faction: 'border', danger: 3, map: [585, 300], links: ['wacht', 'schlacke', 'narbe'],
    desc: 'Umkämpftes Niemandsland zwischen Menschen und Ferrox.',
    neb: 'gold', tint: 0x8c847c,
    stations: [],
    fields: [{ kind: 'mixed', pos: [-1000, 0, 1400], r: 1000, n: 50 }, { kind: 'crystal', pos: [1500, 0, -900], r: 600, n: 14 }],
  },
  {
    id: 'schlacke', name: 'Schlackenfeld', faction: 'border', danger: 3, map: [565, 505], links: ['splitter', 'grauzone', 'aschewelt'],
    desc: 'Ausgebrannte Gesteinsfelder. Der Tess-Vorposten kauft alles, was die Ferrox hinterlassen.',
    neb: 'crimson', tint: 0xc8b8b8, planet: { size: 3200, tint: 0xa09080, dir: [0.3, -0.3, -0.9], atm: 0xff7040 },
    stations: [{ id: 'tess', kind: 'outpost', name: 'Tess-Vorposten', pos: [0, 0, 0], prices: { ferrit: 1.15, schrott: 1.35, iridium: 1.1 }, refinery: true }],
    fields: [{ kind: 'metal', pos: [1600, 0, 900], r: 1000, n: 55, ore: { titan: 4, erz: 3, iridium: 0.3 } }],
  },
  // ---------------- Ferrox-Gebiet (Osten) ----------------
  {
    id: 'schwarzglas', name: 'Schwarzglas', faction: 'ferrox', danger: 4, map: [725, 120], links: ['nebeltor', 'kristallbruch'],
    desc: 'Glasartige Felder aus Ferrox-Kristall. Ständige Patrouillen.',
    neb: 'violet', tint: 0xc8c0d0, stations: [],
    fields: [{ kind: 'crystal', pos: [1300, 0, 700], r: 900, n: 28 }, { kind: 'metal', pos: [-1100, 0, -1500], r: 900, n: 35 }],
  },
  {
    id: 'narbe', name: 'Die Narbe', faction: 'ferrox', danger: 4, map: [740, 310], links: ['grauzone', 'kristallbruch', 'stummfeld'],
    desc: 'Hier fiel die letzte Verteidigungslinie. Wracks und Ferrox überall.',
    neb: 'crimson', tint: 0xd0c0c8, stations: [],
    fields: [{ kind: 'mixed', pos: [-1200, 0, 1000], r: 1000, n: 45 }, { kind: 'crystal', pos: [1400, 100, -800], r: 700, n: 20 }],
  },
  {
    id: 'aschewelt', name: 'Aschewelt', faction: 'ferrox', danger: 4, map: [725, 515], links: ['schlacke', 'stummfeld'],
    desc: 'Eine verbrannte Welt unter violettem Licht.',
    neb: 'crimson', tint: 0xc0b0b8, planet: { size: 3800, tint: 0x806060, dir: [0.6, -0.2, 0.7], atm: 0xb050ff },
    stations: [],
    fields: [{ kind: 'metal', pos: [1500, 0, -700], r: 1000, n: 50, ore: { erz: 2, titan: 3, iridium: 2 } }, { kind: 'crystal', pos: [-1400, 0, 900], r: 700, n: 18 }],
  },
  {
    id: 'kristallbruch', name: 'Kristallbruch', faction: 'ferrox', danger: 5, map: [875, 185], links: ['schwarzglas', 'narbe', 'ferroxkern'],
    desc: 'Die reichsten Ferrit-Vorkommen der bekannten Galaxie, bewacht von einem Bienenstock.',
    neb: 'violet', tint: 0xd8d0e0, stations: [], hives: 1,
    fields: [{ kind: 'crystal', pos: [1200, 0, 1000], r: 1000, n: 40 }, { kind: 'crystal', pos: [-1300, 100, -1100], r: 900, n: 35 }],
  },
  {
    id: 'stummfeld', name: 'Stummfeld', faction: 'ferrox', danger: 5, map: [885, 430], links: ['narbe', 'aschewelt', 'ferroxkern'],
    desc: 'Funkstille. Wer hier fliegt, ist auf sich allein gestellt.',
    neb: 'blue', tint: 0x9898b8, stations: [],
    fields: [{ kind: 'crystal', pos: [-1000, 0, 1300], r: 900, n: 30 }, { kind: 'ice', pos: [1500, 0, -800], r: 1000, n: 45 }],
  },
  {
    id: 'ferroxkern', name: 'Ferrox-Kern', faction: 'ferrox', danger: 5, map: [970, 305], links: ['kristallbruch', 'stummfeld'],
    desc: 'Das Herz der Ferrox. Kein Mensch ist von hier zurückgekehrt.',
    neb: 'violet', tint: 0xe0d0e8, planet: { size: 4200, tint: 0x9070c0, dir: [0.2, 0.2, -1], atm: 0xb050ff }, hives: 2,
    stations: [],
    fields: [{ kind: 'crystal', pos: [0, 0, 1600], r: 1300, n: 60 }],
  },
];

// Alpha 0.54: Die Sektoren sind gestreckt (Stationen, Felder und Tore liegen weiter auseinander) und die Asteroidenfelder
// deutlich größer und voller. Die Zahlen oben sind die alten Grundwerte; hier werden sie einmal beim Start umgerechnet.
export const STRETCH = 1.3;
for (const s of SECTORS) {
  for (const st of s.stations) st.pos = [Math.round(st.pos[0] * STRETCH), st.pos[1], Math.round(st.pos[2] * STRETCH)];
  for (const f of s.fields) { f.pos = [Math.round(f.pos[0] * STRETCH), f.pos[1], Math.round(f.pos[2] * STRETCH)]; f.r = Math.round(f.r * 1.4); f.n = Math.round(f.n * 1.6); }
}
export const SECTOR: Record<string, SectorDef> = Object.fromEntries(SECTORS.map(s => [s.id, s]));

// Kürzester Weg (Anzahl Sprünge) zwischen zwei Sektoren
export function findRoute(from: string, to: string): string[] | null {
  if (from === to) return [from];
  const prev: Record<string, string> = { [from]: '' }, q = [from];
  while (q.length) {
    const c = q.shift()!;
    for (const n of SECTOR[c].links) {
      if (n in prev) continue;
      prev[n] = c;
      if (n === to) {
        const path = [to];
        let p = c;
        while (p) { path.unshift(p); p = prev[p]; }
        return path;
      }
      q.push(n);
    }
  }
  return null;
}

// Wo im Sektor liegt das Tor zum Nachbarn? Richtung entspricht der Lage auf der Karte.
export const GATE_DIST = 6000;
export function gatePos(from: string, to: string): [number, number, number] {
  const a = SECTOR[from].map, b = SECTOR[to].map, dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  const yOff = ((from.length * 37 + to.length * 53) % 300) - 150;
  return [dx / l * GATE_DIST, yOff, dy / l * GATE_DIST];
}
