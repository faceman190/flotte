import { rng, hashStr } from '../core/util';
import { ITEMS, ITEM_IDS, REFINE, type ItemId, type Zone } from '../data/items';
import { SECTOR, type StationDef } from '../data/galaxy';
import { P, stats, cargoUsed, type Contract } from './state';
import { SHARED } from './shared';

// =============== Preise ===============
// Grundpreis × Stationsfaktor × Herkunft (weit weg = teurer) × Sättigung (viel verkauft = billiger, erholt sich)
const ZI: Record<Zone, number> = { core: 0, border: 1, ferrox: 2 };
export function stationZone(sectorId: string): Zone { return SECTOR[sectorId].faction; }
export const originFactor = (k: ItemId, zone: Zone) => 1 + 0.15 * Math.abs(ZI[zone] - ZI[ITEMS[k].origin]);
const SAT_TAU = 600;      // Sekunden, bis sich der Markt zu ~63 % erholt hat
const SAT_STEP = 0.006;   // Preisrückgang pro verkaufter Einheit

// Online gilt der gemeinsame Markt des Servers (Serverzeit), sonst der eigene im Spielstand (Spielzeit)
function satNow(stId: string, k: ItemId) {
  const m = SHARED.online ? SHARED.market[stId]?.[k] : P.market[stId]?.[k];
  if (!m) return 0;
  return m.s * Math.exp(-((SHARED.online ? SHARED.now() : P.playtime) - m.t) / SAT_TAU);
}
function addSat(stId: string, k: ItemId, n: number) {
  const s = satNow(stId, k);
  if (SHARED.online) {
    (SHARED.market[stId] = SHARED.market[stId] || {})[k] = { s: Math.max(-80, s + n), t: SHARED.now() };   // sofort, der Server bestätigt
    SHARED.sendMarket(stId, k, n);
    return;
  }
  (P.market[stId] = P.market[stId] || {})[k] = { s: Math.max(-80, s + n), t: P.playtime };
}
const satFactor = (s: number) => Math.min(1, Math.max(0.45, 1 - SAT_STEP * s));

export function unitPrice(sd: StationDef, sectorId: string, k: ItemId, extra = 0) {
  const z = stationZone(sectorId);
  return Math.max(1, Math.round(ITEMS[k].base * (sd.prices?.[k] ?? 1) * originFactor(k, z) * satFactor(satNow(sd.id, k) + extra)));
}
export function basePriceHere(sd: StationDef, sectorId: string, k: ItemId) {
  return Math.round(ITEMS[k].base * (sd.prices?.[k] ?? 1) * originFactor(k, stationZone(sectorId)));
}
// Erlös für n Einheiten (jede Einheit drückt den Preis ein wenig)
export function sellValue(sd: StationDef, sectorId: string, k: ItemId, n: number) {
  let sum = 0;
  for (let i = 0; i < n; i++) sum += unitPrice(sd, sectorId, k, i);
  return sum;
}
export function sell(sd: StationDef, sectorId: string, k: ItemId, n: number) {
  n = Math.min(n, P.cargo[k]);
  if (n <= 0) return 0;
  const cr = sellValue(sd, sectorId, k, n);
  P.cargo[k] -= n;
  P.credits += cr;
  P.earned += cr;
  addSat(sd.id, k, n);
  return cr;
}

// =============== Einkauf ===============
// Stationen verkaufen, was in ihrer Zone gefördert wird (und Barren, wenn sie raffinieren). Aufschlag 20 %;
// wer viel kauft, treibt den Preis. So lohnen sich Handelsrouten, aber kein Hin-und-her an derselben Station.
const BUY_MARKUP = 1.2;
export const PLANET_ONLY: ItemId[] = ['erden', 'helium'];
export function sellsHere(sd: StationDef, sectorId: string, k: ItemId) {
  const it = ITEMS[k];
  if (PLANET_ONLY.includes(k)) return sd.id.endsWith('_base');
  if (it.cat === 'salvage' || it.origin !== stationZone(sectorId)) return false;
  if (it.cat === 'refined') return !!sd.refinery;
  return (sd.prices?.[k] ?? 1) <= 1.05;
}
export function buyPrice(sd: StationDef, sectorId: string, k: ItemId, extra = 0) {
  const scarce = Math.max(0, -(satNow(sd.id, k) - extra));
  return Math.max(1, Math.round(ITEMS[k].base * (sd.prices?.[k] ?? 1) * originFactor(k, stationZone(sectorId)) * BUY_MARKUP * (1 + 0.004 * scarce)));
}
export function buy(sd: StationDef, sectorId: string, k: ItemId, n: number) {
  if (!sellsHere(sd, sectorId, k)) return { n: 0, cost: 0 };
  n = Math.min(n, stats().cargo - cargoUsed());
  let cost = 0, got = 0;
  for (let i = 0; i < n; i++) { const p = buyPrice(sd, sectorId, k, i); if (cost + p > P.credits) break; cost += p; got++; }
  if (!got) return { n: 0, cost: 0 };
  P.credits -= cost;
  P.cargo[k] += got;
  addSat(sd.id, k, -got);
  return { n: got, cost };
}

// =============== Raffinerie ===============
export function refineInfo(k: ItemId) {
  const r = REFINE[k];
  if (!r) return null;
  const bars = Math.floor(P.cargo[k] / r.ratio);
  return { ...r, bars, cost: bars * r.fee };
}
export function refine(k: ItemId) {
  const r = refineInfo(k);
  if (!r || r.bars <= 0) return 0;
  const bars = Math.min(r.bars, Math.floor(P.credits / r.fee));
  if (bars <= 0) return 0;
  P.cargo[k] -= bars * r.ratio;
  P.cargo[r.to] += bars;
  P.credits -= bars * r.fee;
  return bars;
}

// =============== Lieferaufträge ===============
// Jede Station hat drei Angebots-Plätze. Angebote sind deterministisch und wechseln, wenn man eins annimmt.
const WANTS: Record<Zone, ItemId[]> = {
  core: ['titan', 'titanb', 'iridium', 'ferrit', 'schrott', 'stahl', 'kupferb', 'zellen', 'kupfer', 'erden'],
  border: ['erz', 'kupfer', 'eis', 'stahl', 'kupferb', 'zellen', 'ferrit', 'iridium', 'titanb', 'helium', 'erden'],
  ferrox: [],
};
export const MAX_CONTRACTS = 3;
export function offers(sd: StationDef, sectorId: string): (Contract & { slot: number })[] {
  const z = stationZone(sectorId), out: (Contract & { slot: number })[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const key = `${sd.id}:${slot}`, n = P.cctr[key] || 0, R = rng(hashStr(`${key}:${n}`));
    const item = R.pick(WANTS[z]), base = ITEMS[item].base;
    const amount = base < 20 ? Math.round(R.range(20, 40)) : base < 60 ? Math.round(R.range(10, 24)) : base < 120 ? Math.round(R.range(6, 14)) : Math.round(R.range(3, 6));
    const reward = Math.round(amount * base * originFactor(item, z) * 1.6 / 10) * 10;
    out.push({ id: `${key}:${n}`, station: sd.id, sector: sectorId, stName: sd.name, item, amount, reward, slot });
  }
  return out;
}
export function accept(o: Contract & { slot: number }) {
  if (P.contracts.length >= MAX_CONTRACTS || P.contracts.some(c => c.id === o.id)) return false;
  const { slot, ...c } = o;
  P.contracts.push(c);
  const key = `${o.station}:${slot}`;
  P.cctr[key] = (P.cctr[key] || 0) + 1;
  return true;
}
export function deliver(c: Contract) {
  if (P.cargo[c.item] < c.amount) return false;
  P.cargo[c.item] -= c.amount;
  P.credits += c.reward;
  P.earned += c.reward;
  P.contracts = P.contracts.filter(x => x !== c);
  return true;
}
export function abandon(c: Contract) { P.contracts = P.contracts.filter(x => x !== c); }
export const allItems = ITEM_IDS;
