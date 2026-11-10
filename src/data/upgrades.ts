import type { Stats, ShipId } from './ships';
import { SHIPS } from './ships';

// Ausbaustufen (gelten pro Schiff). d() beschreibt die Wirkung anhand der berechneten Schiffswerte.
const n1 = (v: number) => v.toFixed(1).replace('.', ',');
export const UPG = {
  guns: { n: 'Bordkanonen', s: 'KAN', d: (s: Stats) => `${s.dmg} Schaden/Schuss` },
  rate: { n: 'Feuerrate', s: 'FEU', d: (s: Stats) => `${(1 / s.rate).toFixed(0)} Schuss/s` },
  hull: { n: 'Panzerung', s: 'PAN', d: (s: Stats) => `${s.maxHull} HP` },
  shield: { n: 'Schild', s: 'SCH', d: (s: Stats) => `${s.maxShield} Schildpunkte` },
  mag: { n: 'Magazin', s: 'MAG', d: (s: Stats) => `${s.maxAmmo} Schuss` + (s.maxRockets ? ` · ${s.maxRockets} Raketen` : '') + (s.maxCharges ? ` · ${s.maxCharges} Ladungen` : '') },
  engine: { n: 'Triebwerk', s: 'TRW', d: (s: Stats) => `${s.max} m/s Höchsttempo` },
  laser: { n: 'Bergbaulaser', s: 'LAS', d: (s: Stats) => `${n1(s.laserRate * s.beams)} E/s · ${s.laserRange} m · ${Math.round(100 / s.laserHeat)} s bis Überhitzung` + (s.drones ? ` · Drohnen ${n1(s.droneRate)} E/s` : '') },
  cargo: { n: 'Frachtraum & Traktor', s: 'FRA', d: (s: Stats) => `${s.cargo} Fracht · ${s.magnet} m Traktor` },
  scanner: { n: 'Scanner', s: 'SCN', d: (s: Stats) => `${n1(s.scan / 1000)} km Scan · ${n1(s.radar / 1000)} km Radar` },
};
export type UpgId = keyof typeof UPG;
export const UPG_IDS = Object.keys(UPG) as UpgId[];
export const MAXLV = 8;
export const upCost = (l: number, cls: ShipId = 'falke') => Math.round(120 * Math.pow(1.55, l) * SHIPS[cls].upMul / 10) * 10;
// Ausbauten, die für eine Klasse Sinn ergeben
export const upgFor = (cls: ShipId) => UPG_IDS.filter(k => k !== 'laser' || SHIPS[cls].laser > 0);
