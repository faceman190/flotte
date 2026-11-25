// =====================================================================================
// Begehen im Flug (Schritt 5 des Konzepts docs/konzept-schiffe-fracht.md, 25.11.2026)
// =====================================================================================
//  - Im All an Bord eines begehbaren Schiffs (Modell-Innenraum: Kormoran, Wisent): [G] vom Pilotensitz aufstehen. Das Schiff richtet sich
//    waagrecht aus, der Autopilot hält Kurs und Tempo. Man steht hinter dem Pilotensitz und geht durchs Schiff (Gang, Kabinen, Laderaum).
//  - Autopilot: fliegt mit der Geschwindigkeit von eben weiter. Liegt ein Hindernis auf dem Kurs (Felsen, Station, Tor, Planetenorbit,
//    Sektorrand) in den nächsten zehn Sekunden, bremst er bis zum Stillstand und meldet sich.
//  - Gefahr: Treffer auf Schild oder Hülle lösen Alarm aus („zurück ans Steuer“). Ist das Schiff zerstört, geht es zurück in den Flug, dort
//    läuft der übliche Ablauf (Wrack, Rettung).
//  - Zurück: am Pilotensitz [E] „Steuer übernehmen“. An der Heckrampe [E] Außenbord (wie [F] im Flug, eva.ts: Schiff muss stehen).
//  - Nicht möglich: über Planeten (dort gilt Landen und Aussteigen), im Schnellflug, beim Laden des Sprungantriebs, mit Ferrox in der Nähe.
//  Die Bewegung des Schiffs rechnet updateBordflug (main.ts simulate, Modus walk); der Innenraum folgt dem Schiff (interior.ts folgeSchiff).
import { snd, sfx } from '../core/audio';
import { releaseAll, centerMouse } from '../core/input';
import { d3 } from '../core/util';
import { P, G, settings } from './state';
import { SHIP } from './player';
import { world, SECTOR_RADIUS } from './world';
import { hasMeshRoom } from './meshRoom';
import { enterShip, leaveShip, IN } from './interior';
import { SF } from './schnellflug';
import { evaGrund, startEva } from './eva';
import { radio } from '../ui/radio';

export const BORD = { aktiv: false, bremst: false, trefferT: 0, hull: 0, shield: 0, feindT: 0 };
const VORAUS = 10;          // Sekunden Vorausschau des Autopiloten
const BREMS = 18;           // m/s² beim Bremsen vor einem Hindernis
const FEIND = 1500;         // Ferrox näher als das: nicht aufstehen
const $ = (id: string) => document.getElementById(id);

/** Grund, warum man gerade nicht aufstehen kann (null = geht) */
export function aufstehGrund(): string | null {
  if (!hasMeshRoom(P.cls) || !settings.walk) return 'In diesem Schiff gibt es nur den Pilotensitz.';
  if (G.dead || G.mode !== 'play') return 'Nicht jetzt.';
  if (world.surface) return 'Über dem Planeten bleibst du am Steuer. Zum Aussteigen landen.';
  if (SF.phase !== 'off') return 'Nicht im Schnellflug.';
  if (G.jd) return 'Nicht während der Sprungantrieb lädt.';
  if ((world.enemies as any[]).some(e => d3(e.x, e.y, e.z, P.x, P.y, P.z) < FEIND)) return 'Ferrox in der Nähe. Bleib am Steuer.';
  return null;
}

/** [G] im Flug: vom Pilotensitz aufstehen */
export function aufstehen() {
  const g = aufstehGrund(); if (g) { radio('BORDRECHNER', g, '#ffb347'); return false; }
  P.pitch = 0; G.roll = 0; G.rollOff = 0; G.thrust = 0; G.cruise = false;      // waagrecht ausrichten: der Innenraum steht aufrecht im Schiff
  BORD.aktiv = true; BORD.bremst = false; BORD.trefferT = 0; BORD.feindT = 0; BORD.hull = P.hull; BORD.shield = P.shield;
  releaseAll();
  $('hud')?.classList.add('hidden');
  enterShip({ cls: P.cls, uid: P.uid, name: P.shipName, ctx: 'flug' }, SHIP);
  if (!IN.active) { BORD.aktiv = false; $('hud')?.classList.remove('hidden'); return false; }      // Innenraum noch nicht geladen: enterShip meldet sich und versucht es selbst
  const v = Math.hypot(P.vx, P.vy, P.vz);
  radio('BORDRECHNER', v > 1 ? `Autopilot hält Kurs, ${Math.round(v)} m/s. Am Pilotensitz [E] übernimmst du wieder.` : 'Autopilot hält die Position. Am Pilotensitz [E] übernimmst du wieder.', '#8fd3ff');
  sfx('ui_open', 0.4, 1, () => snd(520, 0.2, 'sine', 0.03, -120));
  return true;
}

/** am Pilotensitz: zurück in den Flug (auch erzwungen, wenn das Schiff zerstört ist) */
export function zumSteuer(still = false) {
  if (!BORD.aktiv) return;
  BORD.aktiv = false; BORD.bremst = false;
  leaveShip();
  G.mode = 'play';
  $('hud')?.classList.remove('hidden');
  releaseAll(); centerMouse();
  if (!still) { radio('BORDRECHNER', 'Du hast das Steuer.', '#8fd3ff'); snd(660, 0.12, 'sine', 0.03, 120); }
}

/** an der Heckrampe: Außenbord (eva.ts prüft Stillstand und Anzug) */
export function ausBord() {
  const g = evaGrund(); if (g) { radio('ANZUG', g, '#ff9b7a'); return; }
  zumSteuer(true);
  startEva();
}

// Hindernis auf dem Kurs in den nächsten VORAUS Sekunden? (nächste Annäherung entlang der Geschwindigkeit)
function hindernis(vx: number, vy: number, vz: number): string | null {
  const v2 = vx * vx + vy * vy + vz * vz; if (v2 < 0.25) return null;
  const weit = Math.sqrt(v2) * VORAUS + 400;
  const nah = (x: number, y: number, z: number, r: number) => {
    const rx = x - P.x, ry = y - P.y, rz = z - P.z;
    if (Math.abs(rx) > weit + r || Math.abs(rz) > weit + r) return false;
    const t = Math.max(0, Math.min(VORAUS, (rx * vx + ry * vy + rz * vz) / v2));
    return Math.hypot(rx - vx * t, ry - vy * t, rz - vz * t) < r;
  };
  for (const s of world.stations) if (nah(s.x, s.y, s.z, s.R + 120)) return s.name;
  for (const gt of world.gates) if (nah(gt.x, gt.y, gt.z, 260)) return 'Sprungtor';
  if (world.orbit && nah(world.orbit.x, world.orbit.y, world.orbit.z, 200)) return world.orbit.name;
  for (const a of world.asteroids) if (nah(a.x, a.y, a.z, a.r + 60)) return 'Felsen';
  const t = VORAUS, ex = P.x + vx * t, ez = P.z + vz * t;
  if (Math.hypot(ex, ez) > SECTOR_RADIUS - 300 && Math.hypot(ex, ez) > Math.hypot(P.x, P.z)) return 'Sektorrand';
  return null;
}

/** jedes Bild, solange man im Flug an Bord herumläuft (main.ts simulate) */
export function updateBordflug(dt: number) {
  if (!BORD.aktiv) return;
  if (!IN.active || IN.ship?.ctx !== 'flug') { BORD.aktiv = false; return; }      // auf anderem Weg ausgestiegen (Hauptmenü, Szene)
  if (G.dead) { zumSteuer(true); return; }      // zerstört: der Flugablauf übernimmt (Wrack, Rettung)
  // Autopilot: Kurs halten, vor Hindernissen bis zum Stillstand bremsen
  const v = Math.hypot(P.vx, P.vy, P.vz);
  if (!BORD.bremst) {
    const h = hindernis(P.vx, P.vy, P.vz);
    if (h) { BORD.bremst = true; radio('BORDRECHNER', `Autopilot: ${h} auf dem Kurs. Das Schiff bremst und hält an.`, '#ffb347'); snd(330, 0.25, 'square', 0.03, -80); }
  }
  if (BORD.bremst && v > 0) { const k = Math.max(0, v - BREMS * dt) / v; P.vx *= k; P.vy *= k; P.vz *= k; }
  P.x += P.vx * dt; P.y += P.vy * dt; P.z += P.vz * dt;
  // Gefahr: Treffer, Ferrox im Anflug
  BORD.trefferT -= dt; BORD.feindT -= dt;
  if ((P.hull < BORD.hull - 0.01 || P.shield < BORD.shield - 0.5) && BORD.trefferT <= 0) {
    BORD.trefferT = 6;
    radio('BORDRECHNER', P.hull < BORD.hull ? 'ALARM: Hüllentreffer! Zurück ans Steuer.' : 'ALARM: Schild unter Beschuss! Zurück ans Steuer.', '#ff6b5b');
    sfx('alarm', 0.6, 1, () => { snd(880, 0.18, 'square', 0.05, -200); setTimeout(() => snd(880, 0.18, 'square', 0.05, -200), 260); });
  }
  if (BORD.feindT <= 0 && (world.enemies as any[]).some(e => d3(e.x, e.y, e.z, P.x, P.y, P.z) < FEIND)) {
    BORD.feindT = 15; radio('BORDRECHNER', 'Ferrox im Anflug. Zurück ans Steuer.', '#ff9b7a'); snd(500, 0.3, 'triangle', 0.04, -100);
  }
  BORD.hull = P.hull; BORD.shield = P.shield;
}
