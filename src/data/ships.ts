// Schiffsklassen: jede Klasse hat eigene Grundwerte; Ausbaustufen wirken prozentual darauf
export interface ShipClass {
  n: string; role: string; price: number; desc: string;
  hull: number; shield: number; speed: number; acc: number; turn: number;
  cargo: number; ammo: number; rockets: number; dmg: number;
  laser: number;        // Förderleistung als Faktor (0 = kein Bergbaulaser)
  beams: number;        // Anzahl Laserstrahlen
  laserRange: number; heat: number;
  scan: number; charges: number; drones: number;
  radius: number;       // Kollisionsradius
  camUp: number; camBack: number; // Kameraposition hinter dem Schiff
  upMul: number;        // Kostenfaktor für Ausbauten
  col: number;          // Markierungsfarbe
  model: string; len: number; // 3D-Modell (models/) und Länge in Metern
}

export const SHIPS = {
  venom: {
    n: 'Venom', role: 'Abfangjäger', price: 0, desc: 'Schlanker Abfangjäger der Bastion: schnell, wendig, zwei Triebwerke. Das Schiff, auf dem jeder Pilot anfängt.',
    hull: 110, shield: 45, speed: 285, acc: 520, turn: 1, cargo: 32, ammo: 300, rockets: 4, dmg: 1,
    laser: 1, beams: 1, laserRange: 220, heat: 1, scan: 1300, charges: 0, drones: 0, radius: 7, camUp: 8, camBack: 28, upMul: 1, col: 0x6fbf3a, model: 'Venom', len: 18,
  },
  falke: {
    n: 'Falke', role: 'Jäger', price: 0, desc: 'Wendiger Jäger. Stark im Kampf, kleiner Frachtraum, einfacher Bergbaulaser.',
    hull: 100, shield: 40, speed: 280, acc: 520, turn: 1, cargo: 30, ammo: 300, rockets: 4, dmg: 1,
    laser: 1, beams: 1, laserRange: 220, heat: 1, scan: 1300, charges: 0, drones: 0, radius: 6, camUp: 7, camBack: 24, upMul: 1, col: 0xd9822b, model: 'Striker', len: 15,
  },
  elster: {
    n: 'Elster', role: 'Prospektor', price: 3200, desc: 'Kleines Bergbauschiff mit starkem Laser, weitreichendem Scanner und Sprengladungen. Schwach bewaffnet.',
    hull: 140, shield: 35, speed: 235, acc: 430, turn: 0.85, cargo: 70, ammo: 200, rockets: 2, dmg: 0.7,
    laser: 1.7, beams: 1, laserRange: 270, heat: 0.85, scan: 1900, charges: 4, drones: 0, radius: 8, camUp: 12, camBack: 38, upMul: 1.15, col: 0x3fb7a0, model: 'Zenith', len: 22,
  },
  maulwurf: {
    n: 'Maulwurf', role: 'Schwerer Bergbau', price: 14000, desc: 'Industrieschiff mit Doppellaser, zwei Bergbaudrohnen und großem Erzbunker. Langsam und träge.',
    hull: 280, shield: 60, speed: 170, acc: 300, turn: 0.6, cargo: 160, ammo: 200, rockets: 0, dmg: 0.6,
    laser: 1.5, beams: 2, laserRange: 300, heat: 0.8, scan: 2100, charges: 8, drones: 2, radius: 15, camUp: 30, camBack: 80, upMul: 1.7, col: 0xe0b030, model: 'Imperial', len: 62,
  },
  kaerrner: {
    n: 'Kärrner', role: 'Frachter', price: 8000, desc: 'Transportschiff mit riesigem Frachtraum. Kein Bergbaulaser, aber ideal für Handelsrouten und Lagertransporte.',
    hull: 230, shield: 75, speed: 210, acc: 330, turn: 0.65, cargo: 280, ammo: 250, rockets: 2, dmg: 0.6,
    laser: 0, beams: 0, laserRange: 0, heat: 1, scan: 1300, charges: 0, drones: 0, radius: 14, camUp: 26, camBack: 84, upMul: 1.35, col: 0x6a9ad8, model: 'Insurgent', len: 56,
  },
  habicht: {
    n: 'Habicht', role: 'Schwerer Jäger', price: 9500, desc: 'Kampfschiff für das Ferrox-Gebiet: starke Kanonen, 8 Raketen, dicke Panzerung. Kein Bergbau, kaum Fracht.',
    hull: 230, shield: 90, speed: 265, acc: 490, turn: 0.85, cargo: 20, ammo: 500, rockets: 8, dmg: 1.6,
    laser: 0, beams: 0, laserRange: 0, heat: 1, scan: 1300, charges: 0, drones: 0, radius: 8, camUp: 10, camBack: 34, upMul: 1.4, col: 0xc04040, model: 'Executioner', len: 22,
  },
  // Modell: „Arrow Carbine Spaceship“ (CGTrader, Royalty-Free), maßstabsgetreu 93 m, mit begehbaren Innenräumen
  pfeil: {
    n: 'Pfeil', role: 'Langstreckenkreuzer', price: 45000, desc: 'Großer Allzweck-Kreuzer mit Wohndeck, Frachtraum und Cockpit. Kräftig, gut gepanzert, mit Bergbaulaser und Drohne. Innen begehbar.',
    hull: 400, shield: 160, speed: 240, acc: 360, turn: 0.7, cargo: 220, ammo: 450, rockets: 6, dmg: 1.2,
    laser: 1.2, beams: 1, laserRange: 300, heat: 0.9, scan: 2000, charges: 4, drones: 1, radius: 22, camUp: 46, camBack: 150, upMul: 2, col: 0xff8a2a, model: 'Pfeil', len: 93,
  },
} satisfies Record<string, ShipClass>;
export type ShipId = keyof typeof SHIPS;
export const SHIP_IDS = Object.keys(SHIPS) as ShipId[];

export type Up = Record<'guns' | 'rate' | 'hull' | 'shield' | 'mag' | 'engine' | 'laser' | 'cargo' | 'scanner', number>;

// Alle abgeleiteten Werte eines Schiffs (rein rechnerisch, damit Werkstatt "jetzt → nächste Stufe" zeigen kann)
export function computeStats(cls: ShipId, u: Up) {
  const c: ShipClass = SHIPS[cls] || SHIPS.falke;
  return {
    cls: c,
    dmg: Math.round((6 + 3 * u.guns) * c.dmg), rate: 0.09 * Math.pow(0.9, u.rate),
    maxHull: Math.round(c.hull * (1 + 0.4 * u.hull)), maxShield: Math.round(c.shield * (1 + 0.6 * u.shield)),
    maxAmmo: c.ammo + 100 * u.mag, maxRockets: c.rockets ? c.rockets + u.mag : 0,
    maxCharges: c.charges ? c.charges + u.mag : 0,
    max: Math.round(c.speed * (1 + 0.107 * u.engine)), acc: c.acc * (1 + 0.105 * u.engine), turn: c.turn,
    cargo: Math.round(c.cargo * (1 + 0.33 * u.cargo)), magnet: 90 + 45 * u.cargo + c.radius * 4,
    radar: 2500 + 400 * u.scanner, scan: c.scan + 250 * u.scanner,
    laser: c.laser > 0, beams: c.beams,
    laserRate: 1.4 * c.laser * (1 + 0.25 * u.laser), laserRange: c.laserRange + 25 * u.laser,
    laserHeat: 16 * c.heat * (1 - 0.07 * u.laser), laserCool: 26 + 3 * u.laser,
    drones: c.drones, droneRate: 0.45 * (1 + 0.2 * u.laser),
    radius: c.radius, camUp: c.camUp, camBack: c.camBack,
  };
}
export type Stats = ReturnType<typeof computeStats>;
