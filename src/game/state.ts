import { ITEM_IDS, type ItemId } from '../data/items';
import { UPG_IDS, type UpgId } from '../data/upgrades';
import { SHIPS, RETIRED, computeStats, type ShipId, type Up , STARTER } from '../data/ships';
import type { GearSlot, ShipSlot } from '../data/gear';
import { sanitizeInv, shipMods, type InvItem } from './inventory';

// ---------------- Einstellungen ----------------
const SETTINGS_KEY = 'lf_settings_v1';
export const settings = { quality: 'high' as 'high' | 'low', fov: 66, sens: 1, invertY: false, steer: 'direkt' as 'direkt' | 'zeiger', volume: 0.7, music: 0.5, hud: 1, walk: true, server: '', camZoom: 1, voice: 1 };
export function loadSettings() {
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* ignorieren */ }
  settings.walk = true;   // seit Alpha 1.25 betritt man Stationen immer zu Fuß (kein Stationsmenü mehr beim Andocken)
}
export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { /* ignorieren */ }
}

// ---------------- Spielerprofil (wird gespeichert; später auf dem Server) ----------------
export interface Player {
  v: number;
  name: string;
  credits: number;
  cargo: Record<ItemId, number>;
  up: Record<UpgId, number>;
  hull: number; shield: number; ammo: number; rockets: number;
  sector: string;
  x: number; y: number; z: number; yaw: number; pitch: number;
  vx: number; vy: number; vz: number;
  home: { sector: string; station: string };
  visited: string[];
  route: string | null;
  kills: number;
  earned: number;
  playtime: number;
  tool: Tool;
  mined: number;
  market: Record<string, Partial<Record<ItemId, { s: number; t: number }>>>; // Marktsättigung je Station
  contracts: Contract[];
  cctr: Record<string, number>;   // Zähler je Auftrags-Slot (neue Angebote nach Annahme)
  // aktives Schiff (die Felder oben cargo/up/hull/... gehören ebenfalls zum aktiven Schiff)
  cls: ShipId; shipName: string; uid: number; charges: number; dronesOn: boolean; paint: string;
  fleet: ShipRec[];                // geparkte Schiffe an Stationen
  storage: Record<string, Partial<Record<ItemId, number>>>; // Stationslager
  refJobs?: { st: string; to: ItemId; n: number; end: number; told?: boolean }[];   // Schmelzaufträge der Raffinerien (end: Uhrzeit in ms, ab der die Barren abholbereit sind)
  nextUid: number;
  track?: string;                  // im HUD verfolgter Auftrag
  savedAt?: number;                // Zeitpunkt des letzten Speicherns (ms), entscheidet bei Konto-Ständen, welcher neuer ist
  surface?: boolean;               // gespeichert auf der Planetenoberfläche
  rover?: Partial<Record<ItemId, number>>; // Ladung des Rovers
  fahrzeug?: string;                        // Bodenfahrzeug, das beim Landen ausgesetzt wird: 'dachs' (Vorgabe) | 'wiesel' (models/rover.ts FZ)
  fahrzeuge?: string[];                     // eigene Bodenfahrzeuge (der Dachs der Basen ist geliehen, game/fahrzeuge.ts)
  fzOrt?: Partial<Record<string, string>>;  // wo ein eigenes Fahrzeug steht: 'sh:<uid>' an Bord, 'st:<Station>' in der Fahrzeughalle, 'pl:<Sektor>' draußen abgestellt (game/fahrzeuge.ts)
  fzPark?: Partial<Record<string, { x: number; y: number; z: number; yaw: number }>>;      // Lage der draußen abgestellten Fahrzeuge (zu 'pl:')
  boden?: Record<string, import('./bodenaufgaben').BodenAkt>;   // laufende Bodenaufgaben auf Planeten (game/bodenaufgaben.ts)
  bodenGen?: Record<string, number>;        // je Bodenaufgabe: wie oft erledigt (neue Orte)
  bodenZuletzt?: Record<string, number>;
  adern?: Record<string, number>;
  fahndung?: { s: number; t: number };      // Fahndungsstufe 0–3 und letzte Tat (ms), game/recht.ts           // Kristalladern in Minen: wann abgebaut (ms), je '<Mine>:<Nummer>' (dungeon.ts)    // je Bodenaufgabe: wann zuletzt erledigt (ms), für die Pause                     // gekaufte Bodenfahrzeuge (der Dachs gehört jedem Piloten und steht hier nicht)
  quartier?: { nr: number; seit: number; koje?: boolean };      // Quartier auf der Bastion (game/quartier.ts): Nummer, seit wann gemietet, Koje ist der Aufwachpunkt
  rep?: Record<string, number>;    // Ruf bei den Fraktionen (siehe reputation.ts)
  missions?: import('./missions').Mission[];   // angenommene Fraktionsmissionen
  story?: import('./story').StoryState;        // Fortschritt der Geschichte (Prolog)
  // persönliches Inventar des Piloten (siehe inventory.ts)
  inv: InvItem[];                               // Rucksack: ein Eintrag je belegtem Platz
  gear: Partial<Record<GearSlot, string>>;      // angelegte Ausrüstung
  locker: InvItem[];                            // Spind, von jeder Station aus erreichbar
  shipGear: Partial<Record<ShipSlot, string>>;  // Module des aktiven Schiffs
  legends?: string[];                                       // gefundene legendäre Stücke (feste Fundorte, src/game/salvage.ts): jedes gibt es je Spielstand einmal
  salvage?: Record<string, { t: number; open: number[] }>;   // je Planet: Zeitpunkt, geöffnete Kisten (Wracks und Versorgungskisten, src/game/salvage.ts)
  dungeons?: Record<string, { t: number; open: number[]; sw?: boolean; sws?: number[] }>;
  crewMem?: { kills: number; mined: number; earned: number; cls: string; done: string[] };   // Stand beim letzten Betreten einer Station (Stimmen der Crew, crewStimmen.ts)
  figur?: number;                                           // gewählte Spielerfigur (game/figur.ts FIGUREN; fehlt in alten Spielständen = 1)
  gesicht?: string;                                         // eigenes Gesicht aus dem Gesichts-Editor (Code, data/gesicht.ts; seit 2026-11-27). Gesetzt: gilt statt figur
  look?: { kopf: number; farbe: number };                   // Aussehen: Kopf und Uniformfarbe (Charaktererstellung, Garderobe; mineArt.ts LOOK_*)
  smgStart?: boolean;                                       // ältere Spielstände: SMG einmal in den leeren Waffenplatz gelegt (loadGame)
  akademie?: { ring?: number; schuss?: number; med: { ring: number; schuss: number } };   // Übungsgelände Heimstatt: Bestzeiten (s), Abzeichen 0–3 (src/game/akademie.ts)
  werft?: Record<string, number>;                           // Alte Werft: Bergungsgut → Zeitpunkt der Bergung (ms), kommt nach einer Weile wieder (src/game/altewerft.ts)   // je Mine: Zeitpunkt des letzten frischen Besuchs, geöffnete Kisten, Schalter
  gedenk?: number;                                          // Gedenkboje im Sonnenfeld schon besucht (src/game/gedenkboje.ts)
  fernohr?: number;                                         // Horchposten Fernohr schon besucht (src/game/sektor3.ts)
  aufgaben?: Record<string, { n: number; t0: number }>;     // laufende Stationsaufgaben (src/game/aufgaben.ts): Fortschritt, Start (ms)
  aufgabenZuletzt?: Record<string, number>;                 // wann eine Stationsaufgabe zuletzt erledigt wurde (ms), für die Pause
  at?: PlayerAt;                                            // wo der Pilot beim Speichern zu Fuß war (fehlt: im Schiff); main.ts, whereAmI und resumeAt
}
// Standort zu Fuß im Spielstand (seit 2026-11-23): „Weiterspielen“ setzt den Piloten dort wieder ab statt ins Cockpit vor der Station.
//   st:   in einer Station oder Basis (id). base: Planetenbasis zu Fuß (das Schiff steht draußen auf dem Landefeld); city: draußen in der Stadt
//         (weiter geht es an der Promenadentür); x, z, yaw: Standpunkt im Innenraum (fehlt an Bord des eigenen Schiffs im Hangar)
//   land: auf einem Planeten gelandet. ship: Lage des Schiffs, rover: Lage des Rovers, foot: Standpunkt zu Fuß (fehlt: im Rover; 'ship': an Bord)
export type PlayerAt =
  | { k: 'st'; id: string; base?: boolean; city?: boolean; x?: number; z?: number; yaw?: number; eb?: 'd' }      // eb: auf Deck 3 der Bastion (zwei Ebenen, deck.ts EBENE)
  | { k: 'land'; ship: { x: number; y: number; z: number; yaw: number }; rover: { x: number; z: number; yaw: number }; foot?: { x: number; z: number; yaw: number } | 'ship' };
export type Tool = 'guns' | 'laser' | 'charge';
export interface Contract { id: string; station: string; sector: string; stName: string; item: ItemId; amount: number; reward: number; trust?: boolean }
export interface ShipRec {
  uid: number; cls: ShipId; name: string; up: Record<UpgId, number>; cargo: Record<ItemId, number>;
  hull: number; ammo: number; rockets: number; charges: number; loc: { sector: string; station: string }; paint?: string;
  gear?: Partial<Record<ShipSlot, string>>;   // eingebaute Module
}
export const P = {} as Player;

export const emptyCargo = () => { const c = {} as Record<ItemId, number>; for (const k of ITEM_IDS) c[k] = 0; return c; };
export const emptyUp = () => { const u = {} as Record<UpgId, number>; for (const k of UPG_IDS) u[k] = 0; return u; };

export function newPlayer(name: string): Player {
  return {
    v: 2, name, credits: 300, cargo: emptyCargo(), up: emptyUp(), hull: 100, shield: 40, ammo: 300, rockets: 4,
    sector: 'heimstatt', x: 0, y: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vy: 0, vz: 0,
    home: { sector: 'heimstatt', station: 'bastion' }, visited: ['heimstatt'], route: null, kills: 0, earned: 0, playtime: 0,
    tool: 'guns', mined: 0, market: {}, contracts: [], cctr: {},
    // Startschiff: Milan (seit 2026-11-25; vorher die Venom)
    cls: 'milan', shipName: 'Milan', uid: 1, charges: 0, dronesOn: true, paint: 'Orange', fleet: [], storage: {}, nextUid: 2, rep: {}, missions: [], story: { prolog: 'done' },
    inv: [], gear: { waffe: 'waffe_smg' }, locker: [], shipGear: {}, look: { kopf: 6, farbe: 0 }, figur: 1,   // Startwaffe: SMG (seit 2026-11-19); Kleidung: keine, nur der Körper im Unteranzug (seit 2026-11-24)
  };
}
export function setPlayer(p: Player) {
  for (const k of Object.keys(P)) delete (P as any)[k];
  Object.assign(P, p);
}

export function stats() { return computeStats(P.cls, P.up as Up, shipMods(P.shipGear)); }
export const cargoUsed = () => ITEM_IDS.reduce((a, k) => a + P.cargo[k], 0);

// ---------------- Speichern ----------------
// Ohne Konto ein lokaler Speicherplatz; mit Pilotenkonto ein eigener Platz je Konto, der zusätzlich auf den Server geht
const SAVE_KEY = 'lf_save_v2';
let saveKey = SAVE_KEY;
// where: Standort zu Fuß im Augenblick des Speicherns (main.ts); null = im Schiff, undefined = unverändert lassen (Hauptmenü)
// block: solange true, wird nicht gespeichert (als Gast auf dem Schiff eines Mitspielers unterwegs, net.ts MIT: der Stand bleibt beim eigenen Schiff)
export const saveHooks = { saved: (_p: Player) => {}, where: (): PlayerAt | null | undefined => undefined, block: () => false };
export function setSaveSlot(account: string | null) { saveKey = account ? SAVE_KEY + '@' + account.toLowerCase() : SAVE_KEY; }
export const onAccountSlot = () => saveKey !== SAVE_KEY;
export function hasSave() { try { return !!localStorage.getItem(saveKey); } catch (e) { return false; } }
export function saveGame() {
  if (!P.name || saveHooks.block()) return;
  P.savedAt = Date.now();
  try { const at = saveHooks.where(); if (at) P.at = at; else if (at === null) delete P.at; } catch (e) { /* Standort bleibt, wie er war */ }
  try { localStorage.setItem(saveKey, JSON.stringify(P)); } catch (e) { /* ignorieren */ }
  saveHooks.saved(P);
}
export function rawSave(): any { try { return JSON.parse(localStorage.getItem(saveKey) || 'null'); } catch (e) { return null; } }
export function writeRawSave(d: any) { try { localStorage.setItem(saveKey, JSON.stringify(d)); } catch (e) { /* ignorieren */ } }
// Spielstand des lokalen Platzes (für „von diesem Gerät übernehmen“)
export function localSave(): any { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
// Ältere Spielstände ohne Handwaffe: die SMG einmal in den Waffenplatz legen (vorher zeigte die Ich-Sicht ein Gewehr, der Platz im Inventar war leer)
export function startWeapon(p: Player) {
  if (p.smgStart) return;
  p.smgStart = true; p.gear = p.gear || {};
  if (!p.gear.waffe) p.gear.waffe = 'waffe_smg';
}
export function loadGame(): Player | null {
  try {
    const d = JSON.parse(localStorage.getItem(saveKey) || 'null');
    if (!d || d.v !== 2) return null;
    const base = newPlayer(d.name || 'Falke');
    const p: Player = { ...base, ...d, cargo: { ...base.cargo, ...d.cargo }, up: { ...base.up, ...d.up } };
    if (!Array.isArray(p.missions)) p.missions = [];
    sanitizeInv(p);
    startWeapon(p);
    p.fleet = (p.fleet || []).map(r => ({ ...r, cargo: { ...emptyCargo(), ...r.cargo }, up: { ...emptyUp(), ...r.up } }));
    retireShips(p);
    return p;
  } catch (e) { return null; }
}

// Entfernte Schiffsklassen (data/ships.ts RETIRED): Das Schiff wird zum Startschiff (Milan), der Kaufpreis kommt aufs Konto. Ausbaustufen und Module bleiben,
// Ladung über dem neuen Frachtraum geht ins Lager der Station (aktives Schiff: Heimatstation). Hinweis für den Funk in retireNote.
export let retireNote = '';
function retireShips(p: Player) {
  const out: string[] = [];
  let refund = 0, moved = false;
  const swap = (cls: string, name: string, cargo: Record<ItemId, number>, up: Record<UpgId, number>, gear: any, station: string) => {
    const old = RETIRED[cls] || { n: cls, price: 0 };
    refund += old.price;
    out.push(name && name !== old.n ? `${old.n} „${name}“` : old.n);
    const cap = computeStats(STARTER, up as Up, shipMods(gear)).cargo;
    let used = ITEM_IDS.reduce((a, k) => a + cargo[k], 0);
    for (const k of ITEM_IDS) {
      if (used <= cap) break;
      const m = Math.min(cargo[k], used - cap); if (m <= 0) continue;
      cargo[k] -= m; used -= m; moved = true;
      (p.storage[station] = p.storage[station] || {})[k] = (p.storage[station][k] || 0) + m;
    }
    return name && name !== old.n ? name : SHIPS[STARTER].n;
  };
  if (!SHIPS[p.cls]) {
    p.shipName = swap(p.cls, p.shipName, p.cargo, p.up, p.shipGear, p.home.station);
    p.cls = STARTER; p.paint = 'Orange';
    const st = computeStats(STARTER, p.up as Up, shipMods(p.shipGear));
    p.hull = Math.min(p.hull, st.maxHull); p.shield = Math.min(p.shield, st.maxShield); p.ammo = Math.min(p.ammo, st.maxAmmo); p.rockets = Math.min(p.rockets, st.maxRockets); p.charges = 0;
    if (p.tool !== 'guns') p.tool = 'laser';
  }
  for (const r of p.fleet) {
    if (SHIPS[r.cls]) continue;
    r.name = swap(r.cls, r.name, r.cargo, r.up, r.gear, r.loc.station);
    r.cls = STARTER; r.paint = 'Orange';
    const st = computeStats(STARTER, r.up as Up, shipMods(r.gear));
    r.hull = Math.min(r.hull, st.maxHull); r.ammo = Math.min(r.ammo, st.maxAmmo); r.rockets = Math.min(r.rockets, st.maxRockets); r.charges = 0;
  }
  p.credits += refund;
  retireNote = out.length ? [`Werft der Bastion: ${out.join(', ')} ${out.length > 1 ? 'wurden' : 'wurde'} außer Dienst gestellt und durch einen Milan ersetzt.`,
    refund ? `Erstattet: ${refund.toLocaleString('de-DE')} Cr.` : '', moved ? 'Ladung, die nicht mehr passte, liegt im Stationslager.' : ''].filter(Boolean).join(' ') : '';
}

// ---------------- Laufzeitzustand (nicht gespeichert) ----------------
export type Mode = 'menu' | 'play' | 'pause' | 'dock' | 'map' | 'jump' | 'walk' | 'rover' | 'entry' | 'intro' | 'scene' | 'launch' | 'dungeon' | 'eva';   // dungeon: zu Fuß in einer Mine (game/dungeon.ts)   // launch: Start- oder Landeablauf im Hangar
export const G = {
  mode: 'menu' as Mode,
  dead: 0,            // Sekunden bis zum Neustart (0 = lebt)
  time: 0,
  shake: 0, hitMark: 0, sinceHit: 99, roll: 0, thrust: 0, cool: 0, gunSide: 0,
  lockT: null as any,
  dockedAt: null as any,
  cityWalk: false,    // zu Fuß in einer Stadt (Schiff steht im Hangar; Tür am Marktplatz führt in die Promenade)
  baseWalk: false,    // zu Fuß in einer Planetenbasis (kein Hangar; hinaus geht es durch die Tür)
  jumpT: 0, jumpTo: null as string | null, jumpFrom: null as string | null,
  warnT: 0,
  saveT: 20,
  camInit: false,
  cruise: false,
  rollOff: 0,      // mit Q/E gehaltene Rolllage
  eBusy: false,    // E wird gerade zum Andocken/Landen gebraucht (dann rollt E nicht)
  jd: 0, jdTo: null as string | null,   // Sprungantrieb: verbleibende Ladezeit (0 = aus) und Zielsektor   // Navigationsflug (Umschalt, früher Reiseflug; zeigt die Stationsmarken): schneller, träger; sonst Manöverflug
  heat: 0, overheat: false,
  inside: false,      // zu Fuß in einer Station
  transT: 0, transTo: null as null | 'surface' | 'orbit',
};

// Flugstufen: Manöverflug bis zur halben Höchstgeschwindigkeit (Jäger: 140 m/s), Navigationsflug etwas darüber (Jäger: 300 m/s)
export const flightMax = () => Math.round(stats().max * (G.cruise ? 1.07 : 0.5));
