import type { ItemId, RockKind } from './items';

// Landbare Planeten: einer pro Sektor mit Planet. Oberfläche wird aus dem Namen deterministisch erzeugt.
export type PlanetType = 'fels' | 'wueste' | 'eis' | 'vulkan' | 'asche' | 'kristall';
export interface PlanetDef {
  name: string; type: PlanetType; danger: number;
  base?: string;               // Name der Bodenstation (ohne = keine)
  city?: string;                 // statt der Basis eine Stadt mit Hangar
}
export interface PlanetTypeDef {
  n: string;                   // Beschreibung
  ground: [number, number, number]; // Boden: Tal, Hang, Gipfel (Farben)
  sky: [number, number];       // Horizont, Zenit
  fog: number; fogDensity: number;
  amp: number;                 // Berghöhe
  liquid?: { level: number; color: number; glow: boolean; deadly: boolean; n: string };
  rock: RockKind;              // Aussehen der Lagerstätten
  ore: Partial<Record<ItemId, number>>;
  craters: number;
}

export const PTYPE: Record<PlanetType, PlanetTypeDef> = {
  fels: {
    n: 'Felsplanet mit dünner Atmosphäre', ground: [0x6a6250, 0x8a8270, 0xc8c4ba], sky: [0x9ab8d8, 0x2a4a78], fog: 0x8aa4c0, fogDensity: 0.00014,
    amp: 520, liquid: { level: -25, color: 0x1a3048, glow: false, deadly: false, n: 'See' }, rock: 'metal', ore: { erz: 5, kupfer: 3, erden: 1.5 }, craters: 3,
  },
  wueste: {
    n: 'Wüstenwelt, heiß und trocken', ground: [0xb08050, 0xc8a070, 0xe0c8a0], sky: [0xe8b880, 0x8a5a38], fog: 0xd8a878, fogDensity: 0.00016,
    amp: 380, rock: 'metal', ore: { kupfer: 4, titan: 2, erden: 2 }, craters: 2,
  },
  eis: {
    n: 'Eiswelt, klirrend kalt', ground: [0x9ab0c0, 0xc8d8e4, 0xf0f6fa], sky: [0xc8e0f0, 0x4a7aa8], fog: 0xd0e4f0, fogDensity: 0.00017,
    amp: 460, liquid: { level: -20, color: 0x8ab8d8, glow: false, deadly: false, n: 'Eissee' }, rock: 'ice', ore: { eis: 6, helium: 3, erden: 0.5 }, craters: 1,
  },
  vulkan: {
    n: 'Vulkanwelt mit Lavaseen', ground: [0x2a2422, 0x4a3a32, 0x6a5a50], sky: [0xb05030, 0x301010], fog: 0x803828, fogDensity: 0.00019,
    amp: 620, liquid: { level: -10, color: 0xff5a10, glow: true, deadly: true, n: 'Lava' }, rock: 'metal', ore: { titan: 4, erz: 2, erden: 2, iridium: 0.4 }, craters: 2,
  },
  asche: {
    n: 'Verbrannte Welt unter violettem Himmel', ground: [0x3a3438, 0x5a4a58, 0x7a6a78], sky: [0x9a60c0, 0x2a1040], fog: 0x6a4880, fogDensity: 0.00018,
    amp: 480, rock: 'metal', ore: { titan: 3, erden: 3, iridium: 1, ferrit: 1 }, craters: 5,
  },
  kristall: {
    n: 'Kristallwüste der Ferrox', ground: [0x302a40, 0x4a3a68, 0x8a70c0], sky: [0x8a50d0, 0x180830], fog: 0x5a3a90, fogDensity: 0.00018,
    amp: 560, rock: 'crystal', ore: { ferrit: 5, iridium: 2, erden: 1 }, craters: 2,
  },
};

export const PLANETS: Record<string, PlanetDef> = {
  heimstatt: { name: 'Heimstatt II', type: 'fels', danger: 0, base: 'Talstadt', city: 'Talstadt' },   // Stadt mit Hangar (src/game/city.ts)
  lichtwall: { name: 'Lichtwall Prime', type: 'wueste', danger: 0, base: 'Sandhafen' },
  eisgarten: { name: 'Frostbiss', type: 'eis', danger: 0, base: 'Eisgrube Nord' },
  neuhafen: { name: 'Neuhafen IV', type: 'fels', danger: 1, base: 'Klippenbasis' },
  sonnenfeld: { name: 'Glutsand', type: 'wueste', danger: 0, base: 'Oase Sieben' },
  rotfels: { name: 'Rotkessel', type: 'vulkan', danger: 2, base: 'Schlotwacht' },
  nebeltor: { name: 'Nebelfrost', type: 'eis', danger: 3 },
  schlacke: { name: 'Schlacke Prime', type: 'vulkan', danger: 3, base: 'Hitzeschild-Basis' },
  aschewelt: { name: 'Aschewelt', type: 'asche', danger: 4 },
  ferroxkern: { name: 'Kernkristall', type: 'kristall', danger: 5 },
};
// Aussehen im Orbit: Typ (Karte), Stadtlichter (bewohnt), Ringfarbe
const RINGS: Record<string, number> = { sonnenfeld: 0xc8b090, aschewelt: 0x9a8aa0, nebeltor: 0xb8c8d8 };
export const planetLook = (sector: string) => {
  const pd = PLANETS[sector];
  if (!pd) return {};
  return { type: pd.type, cities: pd.base ? (sector === 'heimstatt' ? 1 : 0.55) : 0, ring: RINGS[sector] };
};
export const planetBaseId = (sector: string) => `${sector}_base`;
