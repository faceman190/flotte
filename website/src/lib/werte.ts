// Welche Schiffswerte der Explorer zeigt, mit Beschriftung und Einheit (Grundwerte ohne Ausbauten, aus src/data/ships.ts)
export interface Wert { k: string; t: string; e: string; fmt?: (v: number) => string; gruppe: 'flug' | 'kampf' | 'bergbau' }
const x = (v: number) => (v ? v.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' ×' : '–');
const n = (v: number) => (v ? v.toLocaleString('de-DE') : '–');

export const WERTE: Wert[] = [
  { k: 'hull', t: 'Rumpf', e: 'Punkte', gruppe: 'kampf' },
  { k: 'shield', t: 'Schild', e: 'Punkte', gruppe: 'kampf' },
  { k: 'dmg', t: 'Kanonenschaden', e: 'Faktor', fmt: x, gruppe: 'kampf' },
  { k: 'ammo', t: 'Munition', e: 'Schuss', gruppe: 'kampf' },
  { k: 'rockets', t: 'Raketen', e: 'Stück', fmt: n, gruppe: 'kampf' },
  { k: 'speed', t: 'Höchstgeschwindigkeit', e: 'm/s', gruppe: 'flug' },
  { k: 'turn', t: 'Wendigkeit', e: 'Faktor', fmt: x, gruppe: 'flug' },
  { k: 'cargo', t: 'Frachtraum', e: 'Einheiten', gruppe: 'flug' },
  { k: 'scan', t: 'Scanner', e: 'm', gruppe: 'flug' },
  { k: 'laser', t: 'Bergbaulaser', e: 'Förderleistung', fmt: x, gruppe: 'bergbau' },
  { k: 'beams', t: 'Laserstrahlen', e: 'Stück', fmt: n, gruppe: 'bergbau' },
  { k: 'laserRange', t: 'Laserreichweite', e: 'm', fmt: n, gruppe: 'bergbau' },
  { k: 'charges', t: 'Sprengladungen', e: 'Stück', fmt: n, gruppe: 'bergbau' },
  { k: 'drones', t: 'Bergbaudrohnen', e: 'Stück', fmt: n, gruppe: 'bergbau' },
];
export const GRUPPEN = { flug: 'Flug und Fracht', kampf: 'Kampf', bergbau: 'Bergbau' } as const;
export const fmtWert = (w: Wert, v: number) => (w.fmt ? w.fmt(v) : v.toLocaleString('de-DE'));
export const credits = (s: { id: string; price: number }) => (s.price > 0 ? s.price.toLocaleString('de-DE') + ' Cr' : s.id === 'venom' ? 'Startschiff' : 'Nicht in der Werft');
