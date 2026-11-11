import { P } from './state';
import { SECTOR } from '../data/galaxy';
import { radio } from '../ui/radio';
import { snd } from '../core/audio';

// =====================================================================================
// Ruf bei den Fraktionen der Letzten Flotte
//  - Flottenrat: regiert den Menschenraum von der Bastion aus (Stationen im Menschenraum)
//  - Grenzwacht: hält das Grenzgebiet gegen die Ferrox (Stationen im Grenzgebiet)
//  - Bergbaugilde: Schürfer und Planetenbasen
// Ruf steigt mit Aufträgen, Ferrox-Abschüssen und Erzverkauf und sinkt mit abgebrochenen Aufträgen.
// Jeder Rang bringt Vorteile; ab „Vertraut“ vergibt die Fraktion an ihren Stationen einen Vertrauensauftrag.
// =====================================================================================
export type RepId = 'rat' | 'wacht' | 'gilde';
export const REP_IDS: RepId[] = ['rat', 'wacht', 'gilde'];
export const REP: Record<RepId, { n: string; c: string; desc: string; how: string[]; perk: (l: number) => string[] }> = {
  rat: {
    n: 'Flottenrat', c: '#7cc4ff',
    desc: 'Regiert den Menschenraum von der Bastion aus und hält die Versorgung der Flotte am Laufen.',
    how: ['Lieferaufträge an Stationen im Menschenraum', 'Ferrox im Menschenraum abschießen'],
    perk: l => [`Service (Reparatur, Munition, Raketen, Ladungen) −${4 * l} %`, `Neue Schiffe −${2 * l} %`, `Aufträge im Menschenraum +${5 * l} % Lohn`],
  },
  wacht: {
    n: 'Grenzwacht', c: '#f2d36b',
    desc: 'Die Freiwilligen an der Grenze. Sie zahlen für jeden Ferrox, der nicht durchkommt.',
    how: ['Ferrox im Grenz- und Ferrox-Gebiet abschießen', 'Lieferaufträge an Stationen im Grenzgebiet', 'Ferrox-Schrott verkaufen'],
    perk: l => [`Kopfgeld +${10 * l} %`, `Aufträge im Grenzgebiet +${5 * l} % Lohn`],
  },
  gilde: {
    n: 'Bergbaugilde', c: '#ffb347',
    desc: 'Die Schürfer der Flotte. Ihr gehören die Planetenbasen, und sie kennt jeden, der Erz liefert.',
    how: ['Erz und Barren an Stationen verkaufen', 'In der Raffinerie veredeln', 'Lieferaufträge an Planetenbasen'],
    perk: l => [`Verkaufspreise für Erz und Barren +${(1.5 * l).toFixed(1).replace('.', ',')} %`, `Raffineriegebühr −${10 * l} %`, `Aufträge an Planetenbasen +${5 * l} % Lohn`],
  },
};
// Ränge: Schwelle (Rufpunkte) und Name; unter 0 „Misstrauisch“
export const RANKS = [
  { at: 0, n: 'Neutral' }, { at: 50, n: 'Bekannt' }, { at: 150, n: 'Geschätzt' },
  { at: 400, n: 'Vertraut' }, { at: 900, n: 'Angesehen' }, { at: 2000, n: 'Ehrenmitglied' },
];
export const TRUST_LV = 3;   // ab hier gibt es Vertrauensaufträge

export const repOf = (id: RepId) => (P.rep && P.rep[id]) || 0;
export function level(id: RepId) {
  const v = repOf(id);
  if (v < 0) return -1;
  let l = 0;
  for (let i = 0; i < RANKS.length; i++) if (v >= RANKS[i].at) l = i;
  return l;
}
export const rankName = (id: RepId) => (level(id) < 0 ? 'Misstrauisch' : RANKS[level(id)].n);
// Fortschritt zum nächsten Rang (0–1) und Punkte bis dahin
export function nextRank(id: RepId) {
  const l = level(id), v = repOf(id);
  if (l < 0) return { n: RANKS[0].n, at: 0, need: -v, frac: 0 };
  const nx = RANKS[l + 1];
  if (!nx) return null;
  return { n: nx.n, at: nx.at, need: Math.ceil(nx.at - v), frac: (v - RANKS[l].at) / (nx.at - RANKS[l].at) };
}

// Wem gehört eine Station? Planetenbasen der Gilde, sonst nach Zone des Sektors
export function stationFaction(stationId: string, sectorId: string): RepId | null {
  if (stationId.endsWith('_base')) return 'gilde';
  const f = SECTOR[sectorId]?.faction;
  return f === 'core' ? 'rat' : f === 'border' ? 'wacht' : null;
}
// Fraktion, die Ferrox-Abschüsse in einem Sektor belohnt
export const killFaction = (sectorId: string): RepId => (SECTOR[sectorId]?.faction === 'core' ? 'rat' : 'wacht');

export const repHooks = { changed: (_id: RepId, _d: number) => {} };
// Ruf ändern; Rangwechsel melden
export function addRep(id: RepId | null, d: number) {
  if (!id || !d) return;
  P.rep = P.rep || {};
  const before = level(id);
  P.rep[id] = Math.round(((P.rep[id] || 0) + d) * 100) / 100;
  const after = level(id);
  if (after > before) {
    const name = rankName(id), perks = after > 0 ? REP[id].perk(after) : [];
    radio('RUF', `${REP[id].n}: Du giltst jetzt als „${name}“.${after === TRUST_LV ? ' Ihre Stationen bieten dir ab sofort Vertrauensaufträge an.' : ''} ${perks[0] ? perks[0] + '.' : ''}`, REP[id].c);
    snd(660, 0.15, 'triangle', 0.05, 500); setTimeout(() => snd(990, 0.2, 'triangle', 0.05, 300), 150);
  } else if (after < before) {
    radio('RUF', `${REP[id].n}: Dein Ruf ist gesunken, du giltst nur noch als „${rankName(id)}“.`, '#ff6b5b');
  }
  repHooks.changed(id, d);
}

// ---------- Wirkungen ----------
const pos = (id: RepId) => Math.max(0, level(id));
export const serviceFactor = () => (level('rat') < 0 ? 1.15 : 1 - 0.04 * pos('rat'));
export const shipFactor = () => 1 - 0.02 * pos('rat');
export const bountyFactor = () => 1 + 0.1 * pos('wacht');
export const sellFactor = () => 1 + 0.015 * pos('gilde');
export const refineFeeFactor = () => 1 - 0.1 * pos('gilde');
export function contractFactor(stationId: string, sectorId: string) {
  const f = stationFaction(stationId, sectorId);
  if (!f) return 1;
  return level(f) < 0 ? 0.85 : 1 + 0.05 * pos(f);
}
export function trustSlot(stationId: string, sectorId: string) { const f = stationFaction(stationId, sectorId); return !!f && level(f) >= TRUST_LV; }
