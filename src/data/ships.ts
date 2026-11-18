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
  // Eigenes Modell (asset-src/neu/elster, Blender-Skripte, docs/elster.md), Fassung 2: 23,1 × 8,5 × 6,6 m, runder Rumpf mit Glaskuppel, Kugel-
  // Bergbaulaser unter dem Kinn, vier Erzkanister in Rundklammern, Manteltriebwerke; Fernmodell ElsterFern
  elster: {
    n: 'Elster', role: 'Prospektor', price: 3200, desc: 'Kleines Bergbauschiff mit starkem Laser unter dem Kinn, vier Erzkanistern, weitreichendem Scanner und Sprengladungen. Schwach bewaffnet.',
    hull: 140, shield: 35, speed: 235, acc: 430, turn: 0.85, cargo: 70, ammo: 200, rockets: 2, dmg: 0.7,
    laser: 1.7, beams: 1, laserRange: 270, heat: 0.85, scan: 1900, charges: 4, drones: 0, radius: 8, camUp: 12, camBack: 38, upMul: 1.15, col: 0x3fb7a0, model: 'Elster', len: 23.1,
  },
  // Modell: „Arrow Carbine Spaceship“ (CGTrader, Royalty-Free), maßstabsgetreu 93 m, mit begehbaren Innenräumen
  pfeil: {
    n: 'Pfeil', role: 'Langstreckenkreuzer', price: 45000, desc: 'Großer Allzweck-Kreuzer mit Wohndeck, Frachtraum und Cockpit. Kräftig, gut gepanzert, mit Bergbaulaser und Drohne. Innen begehbar.',
    hull: 400, shield: 160, speed: 240, acc: 360, turn: 0.7, cargo: 220, ammo: 450, rockets: 6, dmg: 1.2,
    laser: 1.2, beams: 1, laserRange: 300, heat: 0.9, scan: 2000, charges: 4, drones: 1, radius: 22, camUp: 46, camBack: 150, upMul: 2, col: 0xff8a2a, model: 'Pfeil', len: 93,
  },
  // Eigenes Modell (asset-src/neu/kormoran, Blender-Skripte, docs/kormoran.md): 46 × 34 × 8 m, innen begehbar
  kormoran: {
    n: 'Kormoran', role: 'Korvette', price: 26000, desc: 'Schwere Korvette mit Laderaum und Heckrampe, drei Kabinen, Sanität, Messe und Technik. Zwei Kanonen, Rückenturm, sechs Flugkörper. Innen begehbar.',
    hull: 330, shield: 130, speed: 250, acc: 400, turn: 0.75, cargo: 150, ammo: 450, rockets: 6, dmg: 1.35,
    laser: 0, beams: 0, laserRange: 0, heat: 1, scan: 1700, charges: 0, drones: 0, radius: 15, camUp: 24, camBack: 78, upMul: 1.7, col: 0x4a86d8, model: 'Kormoran', len: 46,
  },
  // Eigenes Modell (asset-src/neu/wuerger, Blender-Skripte, docs/wuerger.md): 24,8 × 26,2 × 5 m, einsitzig, kein Innenraum
  wuerger: {
    n: 'Würger', role: 'Schwerer Jäger', price: 16000, desc: 'Einsitziger schwerer Jäger der Bastion: Schienenkanone unter dem Rumpf, zwei Flügelkanonen, vier Flugkörper, dicke Panzerung. Kaum Fracht, kein Bergbau.',
    hull: 260, shield: 110, speed: 275, acc: 510, turn: 0.9, cargo: 18, ammo: 600, rockets: 4, dmg: 1.85,
    laser: 0, beams: 0, laserRange: 0, heat: 1, scan: 1500, charges: 0, drones: 0, radius: 10, camUp: 11, camBack: 40, upMul: 1.5, col: 0xc8282a, model: 'Wuerger', len: 24.8,
  },
  // Eigenes Modell (asset-src/neu/wisent, Blender-Skripte, docs/wisent.md): 83 × 66 × 20 m, Brücke, Mannschaftsgang und Laderaum begehbar,
  // Heckrampe öffnet sich im Hangar; über die offene Rampe geht man ohne Taste an Bord und von Bord (game/interior.ts)
  wisent: {
    n: 'Wisent', role: 'Schwerer Frachter', price: 68000, desc: 'Großer Frachter mit viel Feuerkraft: sechs Doppeltürme, Kinnkanone, 20 Raketenzellen, 45 m Laderaum mit Heckrampe. Brücke, Gang und Laderaum begehbar.',
    hull: 560, shield: 240, speed: 210, acc: 290, turn: 0.5, cargo: 340, ammo: 900, rockets: 20, dmg: 1.8,
    laser: 0, beams: 0, laserRange: 0, heat: 1, scan: 1900, charges: 0, drones: 0, radius: 34, camUp: 38, camBack: 140, upMul: 2.1, col: 0xc0302a, model: 'Wisent', len: 83.3,
  },
} satisfies Record<string, ShipClass>;
export type ShipId = keyof typeof SHIPS;
// Seit 2026-11-18 entfernt (Fremdmodelle aus dem alten Gratis-Paket): Spielstände mit diesen Klassen bekommen eine Venom und den Kaufpreis zurück (state.ts loadGame)
export const RETIRED: Record<string, { n: string; price: number }> = {
  falke: { n: 'Falke', price: 0 }, habicht: { n: 'Habicht', price: 9500 }, maulwurf: { n: 'Maulwurf', price: 14000 }, kaerrner: { n: 'Kärrner', price: 8000 },
};
// Kleine Flieger (unter 30 m) haben keinen begehbaren Innenraum: man steigt ein und fliegt los
export const hasInterior = (cls: string) => ((SHIPS as any)[cls]?.len || 0) >= 30;
export const SHIP_IDS = Object.keys(SHIPS) as ShipId[];

export type Up = Record<'guns' | 'rate' | 'hull' | 'shield' | 'mag' | 'engine' | 'laser' | 'cargo' | 'scanner', number>;

// Alle abgeleiteten Werte eines Schiffs (rein rechnerisch, damit Werkstatt "jetzt → nächste Stufe" zeigen kann)
// Zuschläge der eingebauten Module als Anteil (0,1 = +10 %), siehe game/inventory.ts shipMods
export interface ShipMods { dmg?: number; rate?: number; hull?: number; shield?: number; speed?: number; turn?: number; cargo?: number; laser?: number; scan?: number }
export function computeStats(cls: ShipId, u: Up, m: ShipMods = {}) {
  const c: ShipClass = SHIPS[cls] || SHIPS.venom;
  const f = (k: keyof ShipMods) => 1 + (m[k] || 0);
  return {
    cls: c,
    dmg: Math.round((6 + 3 * u.guns) * c.dmg * f('dmg')), rate: 0.09 * Math.pow(0.9, u.rate) / f('rate'),
    maxHull: Math.round(c.hull * (1 + 0.4 * u.hull) * f('hull')), maxShield: Math.round(c.shield * (1 + 0.6 * u.shield) * f('shield')),
    maxAmmo: c.ammo + 100 * u.mag, maxRockets: c.rockets ? c.rockets + u.mag : 0,
    maxCharges: c.charges ? c.charges + u.mag : 0,
    max: Math.round(c.speed * (1 + 0.107 * u.engine) * f('speed')), acc: c.acc * (1 + 0.105 * u.engine) * f('speed'), turn: c.turn * f('turn'),
    cargo: Math.round(c.cargo * (1 + 0.33 * u.cargo) * f('cargo')), magnet: 90 + 45 * u.cargo + c.radius * 4,
    radar: Math.round((2500 + 400 * u.scanner) * f('scan')), scan: Math.round((c.scan + 250 * u.scanner) * f('scan')),
    laser: c.laser > 0, beams: c.beams,
    laserRate: 1.4 * c.laser * (1 + 0.25 * u.laser) * f('laser'), laserRange: c.laserRange + 25 * u.laser,
    laserHeat: 16 * c.heat * (1 - 0.07 * u.laser), laserCool: 26 + 3 * u.laser,
    drones: c.drones, droneRate: 0.45 * (1 + 0.2 * u.laser),
    radius: c.radius, camUp: c.camUp, camBack: c.camBack,
  };
}
export type Stats = ReturnType<typeof computeStats>;
