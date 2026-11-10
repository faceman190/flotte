// Handelsgüter: Rohstoffe aus Asteroiden, veredelte Waren aus der Raffinerie, Bergungsgut
export type Zone = 'core' | 'border' | 'ferrox';
export type ItemCat = 'raw' | 'refined' | 'salvage';
interface ItemDef { n: string; short: string; c: string; base: number; cat: ItemCat; origin: Zone; desc: string }

export const ITEMS = {
  erz: { n: 'Eisenerz', short: 'FE', c: '#d9822b', base: 14, cat: 'raw', origin: 'core', desc: 'Häufigstes Erz. Rückgrat jeder Werft.' },
  kupfer: { n: 'Kupfererz', short: 'CU', c: '#e8664a', base: 22, cat: 'raw', origin: 'core', desc: 'Für Leitungen und Elektronik. Im Süden des Menschenraums häufig.' },
  titan: { n: 'Titanerz', short: 'TI', c: '#8fb4f0', base: 40, cat: 'raw', origin: 'border', desc: 'Leicht und hart. Kommt vor allem im Grenzgebiet vor.' },
  iridium: { n: 'Iridium', short: 'IR', c: '#f2df7a', base: 160, cat: 'raw', origin: 'ferrox', desc: 'Sehr selten. Findet sich tief im Ferrox-Gebiet.' },
  eis: { n: 'Wassereis', short: 'H2O', c: '#bfe6ff', base: 11, cat: 'raw', origin: 'core', desc: 'Treibstoff, Atemluft, Kühlung.' },
  erden: { n: 'Seltene Erden', short: 'SE', c: '#7fe0a0', base: 70, cat: 'raw', origin: 'border', desc: 'Nur auf Planeten zu finden. Für Elektronik und Schilde unverzichtbar.' },
  helium: { n: 'Helium-3', short: 'HE3', c: '#ffe08a', base: 58, cat: 'raw', origin: 'core', desc: 'Fusionsbrennstoff aus dem Eis kalter Planeten.' },
  ferrit: { n: 'Ferrit-Kristall', short: 'FX', c: '#c070ff', base: 95, cat: 'raw', origin: 'ferrox', desc: 'Wächst nur in Ferrox-Gebieten. Sehr begehrt.' },
  stahl: { n: 'Stahlbarren', short: 'STL', c: '#c4c8d0', base: 36, cat: 'refined', origin: 'core', desc: 'Raffiniert aus Eisenerz.' },
  kupferb: { n: 'Kupferbarren', short: 'CUB', c: '#ff9a6a', base: 56, cat: 'refined', origin: 'core', desc: 'Raffiniert aus Kupfererz.' },
  titanb: { n: 'Titanbarren', short: 'TIB', c: '#c8dcff', base: 104, cat: 'refined', origin: 'border', desc: 'Raffiniert aus Titanerz. Für Panzerplatten.' },
  zellen: { n: 'Treibstoffzellen', short: 'ZEL', c: '#7fd8ff', base: 28, cat: 'refined', origin: 'core', desc: 'Aus Wassereis gewonnen.' },
  schrott: { n: 'Ferrox-Schrott', short: 'SCR', c: '#c8ccd2', base: 38, cat: 'salvage', origin: 'ferrox', desc: 'Wrackteile der Ferrox, für die Forschung wertvoll.' },
} satisfies Record<string, ItemDef>;
export type ItemId = keyof typeof ITEMS;
export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];

// Raffinerie: 2 Rohstoff → 1 Barren, gegen eine kleine Gebühr pro Barren
export const REFINE: Partial<Record<ItemId, { to: ItemId; ratio: number; fee: number }>> = {
  erz: { to: 'stahl', ratio: 2, fee: 3 },
  kupfer: { to: 'kupferb', ratio: 2, fee: 4 },
  titan: { to: 'titanb', ratio: 2, fee: 8 },
  eis: { to: 'zellen', ratio: 2, fee: 2 },
};

// Optik der Asteroiden (Gestein); was drin steckt, bestimmt die Zusammensetzung
export type RockKind = 'metal' | 'ice' | 'crystal';
