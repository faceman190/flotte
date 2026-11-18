// Spieldaten für die Website: dieselben Dateien wie im Spiel (../src/data), keine Kopie
import { SHIPS, SHIP_IDS, hasInterior, type ShipId } from '../../../src/data/ships';
import { SECTORS, FACTION } from '../../../src/data/galaxy';
import modelle from './modelle.json';

export const SPIEL_URL = 'https://spielen.letztecrew.de/';
export const STATUS_URL = 'https://spielen.letztecrew.de/status';
export const DISCORD_URL = '';   // Platzhalter: sobald es einen Discord gibt, hier eintragen

export interface SchiffInfo {
  id: ShipId; n: string; role: string; price: number; desc: string; len: number; col: string; innen: boolean;
  modell: string | null;
  werte: Record<string, number>;
}

// Reihenfolge im Explorer: Startschiffe zuerst, dann nach Preis
const order = [...SHIP_IDS].sort((a, b) => SHIPS[a].price - SHIPS[b].price);

export const SCHIFFE: SchiffInfo[] = order.map((id) => {
  const s = SHIPS[id];
  return {
    id, n: s.n, role: s.role, price: s.price, desc: s.desc, len: s.len,
    col: '#' + s.col.toString(16).padStart(6, '0'),
    innen: hasInterior(id),
    modell: (modelle.ship as Record<string, string>)[s.model] ?? null,
    werte: {
      hull: s.hull, shield: s.shield, speed: s.speed, turn: s.turn, cargo: s.cargo, dmg: s.dmg,
      ammo: s.ammo, rockets: s.rockets, laser: s.laser, beams: s.beams, laserRange: s.laserRange,
      scan: s.scan, charges: s.charges, drones: s.drones,
    },
  };
});

export const ENV_URL = modelle.env;
export { SECTORS, FACTION };
export { credits } from './werte';
