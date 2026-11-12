import { SHIPS, type ShipId } from '../data/ships';
import { ITEM_IDS, type ItemId } from '../data/items';
import { P, stats, cargoUsed, emptyCargo, emptyUp, type ShipRec } from './state';
import { setShipModel } from './player';
import type { Paint } from '../models/gltfShips';
import { shipFactor } from './reputation';

// Eigene Schiffe: das aktive Schiff steckt direkt im Spielerzustand, alle anderen parken an Stationen.
type Loc = { sector: string; station: string };
export const shipsAt = (station: string) => P.fleet.filter(r => r.loc.station === station);
export const sellPrice = (r: ShipRec) => Math.round(SHIPS[r.cls].price * 0.6);

function activeRec(loc: Loc): ShipRec {
  return { uid: P.uid, cls: P.cls, name: P.shipName, up: { ...P.up }, cargo: { ...P.cargo }, hull: P.hull, ammo: P.ammo, rockets: P.rockets, charges: P.charges, loc, paint: P.paint, gear: { ...P.shipGear } };
}
function load(r: ShipRec) {
  P.uid = r.uid; P.cls = r.cls; P.shipName = r.name; P.up = { ...r.up }; P.cargo = { ...r.cargo };
  P.hull = r.hull; P.ammo = r.ammo; P.rockets = r.rockets; P.charges = r.charges; P.paint = r.paint || 'Orange'; P.shipGear = { ...(r.gear || {}) };
  const st = stats();
  P.shield = st.maxShield;
  if (P.tool === 'laser' && !st.laser) P.tool = 'guns';
  if (P.tool === 'charge' && !st.maxCharges) P.tool = 'guns';
  setShipModel(P.cls, P.paint as Paint);
}

// Umsteigen: aktuelles Schiff bleibt an der Station, das gewählte wird aktiv
export function board(r: ShipRec, loc: Loc) {
  if (r.loc.station !== loc.station) return false;
  const cur = activeRec(loc);
  P.fleet = P.fleet.filter(x => x !== r);
  P.fleet.push(cur);
  load(r);
  return true;
}

function nextName(cls: ShipId) {
  const roman = ['', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII'];
  const used = new Set([P.shipName, ...P.fleet.map(r => r.name)]);
  for (const r of roman) if (!used.has(SHIPS[cls].n + r)) return SHIPS[cls].n + r;
  return SHIPS[cls].n + ' ' + P.nextUid;
}
// Neupreis (Flottenrat-Rang gibt Rabatt)
export const shipPrice = (cls: ShipId) => Math.round(SHIPS[cls].price * shipFactor());
export function buyShip(cls: ShipId, loc: Loc) {
  const c = SHIPS[cls], price = shipPrice(cls);
  if (P.credits < price) return null;
  P.credits -= price;
  const up = emptyUp();
  const r: ShipRec = { uid: P.nextUid++, cls, name: nextName(cls), up, cargo: emptyCargo(), hull: c.hull, ammo: c.ammo, rockets: c.rockets, charges: c.charges, loc };
  P.fleet.push(r);
  return r;
}
export function sellShip(r: ShipRec) {
  const cr = sellPrice(r);
  P.credits += cr;
  // eingebaute Module wandern in den Spind (auch wenn er dadurch überläuft), die Fracht ins Stationslager
  for (const id of Object.values(r.gear || {})) if (id) P.locker.push({ id, n: 1 });
  for (const k of ITEM_IDS) if (r.cargo[k]) deposit(r.loc.station, k, r.cargo[k]);
  P.fleet = P.fleet.filter(x => x !== r);
  return cr;
}

// ---------- Stationslager ----------
export const stored = (station: string, k: ItemId) => P.storage[station]?.[k] || 0;
export const storedTotal = (station: string) => ITEM_IDS.reduce((a, k) => a + stored(station, k), 0);
export function deposit(station: string, k: ItemId, n: number) {
  (P.storage[station] = P.storage[station] || {})[k] = stored(station, k) + n;
}
export function storeFromCargo(station: string, k: ItemId, n = Infinity) {
  const m = Math.min(n, P.cargo[k]);
  if (m <= 0) return 0;
  P.cargo[k] -= m;
  deposit(station, k, m);
  return m;
}
export function takeToCargo(station: string, k: ItemId, n = Infinity) {
  const room = stats().cargo - cargoUsed(), m = Math.min(n, stored(station, k), room);
  if (m <= 0) return 0;
  P.storage[station][k] = stored(station, k) - m;
  P.cargo[k] += m;
  return m;
}
