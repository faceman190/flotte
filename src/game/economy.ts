import { rng, hashStr } from '../core/util';
import { ITEMS, ITEM_IDS, REFINE, type ItemId, type Zone } from '../data/items';
import { SECTOR, type StationDef } from '../data/galaxy';
import { P, stats, cargoUsed, type Contract } from './state';
import { SHARED } from './shared';
import { addRep, stationFaction, sellFactor, refineFeeFactor, contractFactor, trustSlot } from './reputation';

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
  const guild = ITEMS[k].cat === 'salvage' ? 1 : sellFactor();   // Bergbaugilde: bessere Preise für Erz und Barren
  return Math.max(1, Math.round(ITEMS[k].base * (sd.prices?.[k] ?? 1) * originFactor(k, z) * satFactor(satNow(sd.id, k) + extra) * guild));
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
  // Ruf: Erz und Barren für die Gilde, Ferrox-Schrott für die Grenzwacht
  if (ITEMS[k].cat === 'salvage') addRep('wacht', cr / 150); else addRep('gilde', cr / 200);
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
  const bars = Math.floor(P.cargo[k] / r.ratio), fee = Math.max(1, Math.round(r.fee * refineFeeFactor()));
  return { ...r, fee, bars, cost: bars * fee };
}
export function refine(k: ItemId) {
  const r = refineInfo(k);
  if (!r || r.bars <= 0) return 0;
  const bars = Math.min(r.bars, Math.floor(P.credits / r.fee));
  if (bars <= 0) return 0;
  P.cargo[k] -= bars * r.ratio;
  P.cargo[r.to] += bars;
  P.credits -= bars * r.fee;
  addRep('gilde', bars * 0.25);
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
  // ab Rang „Vertraut“ gibt es einen vierten Platz: Vertrauensauftrag (größer, deutlich besser bezahlt)
  const slots = trustSlot(sd.id, sectorId) ? 4 : 3, cf = contractFactor(sd.id, sectorId);
  for (let slot = 0; slot < slots; slot++) {
    const key = `${sd.id}:${slot}`, n = P.cctr[key] || 0, R = rng(hashStr(`${key}:${n}`));
    const item = R.pick(WANTS[z]), base = ITEMS[item].base;
    const trust = slot === 3;
    let amount = base < 20 ? Math.round(R.range(20, 40)) : base < 60 ? Math.round(R.range(10, 24)) : base < 120 ? Math.round(R.range(6, 14)) : Math.round(R.range(3, 6));
    if (trust) amount = Math.round(amount * 1.25);
    const reward = Math.round(amount * base * originFactor(item, z) * 1.6 * cf * (trust ? 1.4 : 1) / 10) * 10;
    out.push({ id: `${key}:${n}`, station: sd.id, sector: sectorId, stName: sd.name, item, amount, reward, slot, ...(trust ? { trust: true } : {}) });
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
  addRep(stationFaction(c.station, c.sector), Math.max(3, Math.round(c.reward / 50)) * (c.trust ? 1.5 : 1));
  return true;
}
// Abbrechen kostet Ruf bei der Fraktion, die den Auftrag vergeben hat
export function abandon(c: Contract) { P.contracts = P.contracts.filter(x => x !== c); addRep(stationFaction(c.station, c.sector), c.trust ? -25 : -10); }
export const allItems = ITEM_IDS;
