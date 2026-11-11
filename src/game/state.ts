import { ITEM_IDS, type ItemId } from '../data/items';
import { UPG_IDS, type UpgId } from '../data/upgrades';
import { SHIPS, computeStats, type ShipId, type Up } from '../data/ships';

// ---------------- Einstellungen ----------------
const SETTINGS_KEY = 'lf_settings_v1';
export const settings = { quality: 'high' as 'high' | 'low', fov: 66, sens: 1, invertY: false, volume: 0.7, music: 0.5, hud: 1, walk: true, server: '', camZoom: 1 };
export function loadSettings() {
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')); } catch (e) { /* ignorieren */ }
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
  nextUid: number;
  track?: string;                  // im HUD verfolgter Auftrag
  savedAt?: number;                // Zeitpunkt des letzten Speicherns (ms), entscheidet bei Konto-Ständen, welcher neuer ist
  surface?: boolean;               // gespeichert auf der Planetenoberfläche
  rover?: Partial<Record<ItemId, number>>; // Ladung des Rovers
  rep?: Record<string, number>;    // Ruf bei den Fraktionen (siehe reputation.ts)
  missions?: import('./missions').Mission[];   // angenommene Fraktionsmissionen
  story?: import('./story').StoryState;        // Fortschritt der Geschichte (Prolog)
}
export type Tool = 'guns' | 'laser' | 'charge';
export interface Contract { id: string; station: string; sector: string; stName: string; item: ItemId; amount: number; reward: number; trust?: boolean }
export interface ShipRec {
  uid: number; cls: ShipId; name: string; up: Record<UpgId, number>; cargo: Record<ItemId, number>;
  hull: number; ammo: number; rockets: number; charges: number; loc: { sector: string; station: string }; paint?: string;
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
    // zum Testen startet man im Pfeil (sonst: cls 'falke', shipName 'Falke')
    cls: 'pfeil', shipName: 'Pfeil', uid: 1, charges: 0, dronesOn: true, paint: 'Orange', fleet: [], storage: {}, nextUid: 2, rep: {}, missions: [], story: { prolog: 'done' },
  };
}
export function setPlayer(p: Player) {
  for (const k of Object.keys(P)) delete (P as any)[k];
  Object.assign(P, p);
}

export function stats() { return computeStats(P.cls, P.up as Up); }
export const cargoUsed = () => ITEM_IDS.reduce((a, k) => a + P.cargo[k], 0);

// ---------------- Speichern ----------------
// Ohne Konto ein lokaler Speicherplatz; mit Pilotenkonto ein eigener Platz je Konto, der zusätzlich auf den Server geht
const SAVE_KEY = 'lf_save_v2';
let saveKey = SAVE_KEY;
export const saveHooks = { saved: (_p: Player) => {} };
export function setSaveSlot(account: string | null) { saveKey = account ? SAVE_KEY + '@' + account.toLowerCase() : SAVE_KEY; }
export const onAccountSlot = () => saveKey !== SAVE_KEY;
export function hasSave() { try { return !!localStorage.getItem(saveKey); } catch (e) { return false; } }
export function saveGame() {
  if (!P.name) return;
  P.savedAt = Date.now();
  try { localStorage.setItem(saveKey, JSON.stringify(P)); } catch (e) { /* ignorieren */ }
  saveHooks.saved(P);
}
export function rawSave(): any { try { return JSON.parse(localStorage.getItem(saveKey) || 'null'); } catch (e) { return null; } }
export function writeRawSave(d: any) { try { localStorage.setItem(saveKey, JSON.stringify(d)); } catch (e) { /* ignorieren */ } }
// Spielstand des lokalen Platzes (für „von diesem Gerät übernehmen“)
export function localSave(): any { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { return null; } }
export function loadGame(): Player | null {
  try {
    const d = JSON.parse(localStorage.getItem(saveKey) || 'null');
    if (!d || d.v !== 2) return null;
    const base = newPlayer(d.name || 'Falke');
    const p: Player = { ...base, ...d, cargo: { ...base.cargo, ...d.cargo }, up: { ...base.up, ...d.up } };
    if (!SHIPS[p.cls]) p.cls = 'falke';
    if (!Array.isArray(p.missions)) p.missions = [];
    p.fleet = (p.fleet || []).map(r => ({ ...r, cargo: { ...emptyCargo(), ...r.cargo }, up: { ...emptyUp(), ...r.up } }));
    return p;
  } catch (e) { return null; }
}

// ---------------- Laufzeitzustand (nicht gespeichert) ----------------
export type Mode = 'menu' | 'play' | 'pause' | 'dock' | 'map' | 'jump' | 'walk' | 'rover' | 'entry' | 'intro' | 'scene';
export const G = {
  mode: 'menu' as Mode,
  dead: 0,            // Sekunden bis zum Neustart (0 = lebt)
  time: 0,
  shake: 0, hitMark: 0, sinceHit: 99, roll: 0, thrust: 0, cool: 0, gunSide: 0,
  lockT: null as any,
  dockedAt: null as any,
  jumpT: 0, jumpTo: null as string | null, jumpFrom: null as string | null,
  warnT: 0,
  saveT: 20,
  camInit: false,
  heat: 0, overheat: false,
  inside: false,      // zu Fuß in einer Station
  transT: 0, transTo: null as null | 'surface' | 'orbit',
};
