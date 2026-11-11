import { P, stats, cargoUsed, saveGame } from './state';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import { deposit } from './fleet';
import { NET, netHooks, sendMsg, myStation, pushSave } from './net';
import { radio } from '../ui/radio';
import { snd } from '../core/audio';

// =====================================================================================
// Handel zwischen Piloten (Client)
// Zwei Piloten in derselben Station tauschen Waren aus dem Frachtraum und Credits. Der Server führt den Ablauf:
// Anfrage → Annahme → Angebote → beide bestätigen denselben Stand → 'done'. Jede Änderung hebt beide
// Bestätigungen auf, damit niemand ein Angebot bestätigt, das sich danach noch ändert.
// Was man bekommt, geht in den Frachtraum; passt es nicht hinein, ins Lager der Station.
// =====================================================================================
export interface Offer { items: Partial<Record<ItemId, number>>; cr: number }
const empty = (): Offer => ({ items: {}, cr: 0 });
export const TRADE = {
  ask: null as null | { id: number; name: string; at: number },     // eingegangene Anfrage
  sent: null as null | { id: number; name: string; at: number },    // eigene Anfrage, wartet auf Antwort
  open: false, withId: 0, withName: '', station: '',
  mine: empty(), theirs: empty(), readyMe: false, readyThem: false, rev: 0,
  last: '',   // letzte Meldung (Ablehnung, Abbruch, Abschluss) für das Handelsfenster
};
export const tradeHooks = { changed: () => {}, opened: () => {} };
const changed = () => tradeHooks.changed();

export const tradeValue = (o: Offer) => ITEM_IDS.reduce((a, k) => a + (o.items[k] || 0) * ITEMS[k].base, 0);
export const offerCount = (o: Offer) => ITEM_IDS.reduce((a, k) => a + (o.items[k] || 0), 0);

export function requestTrade(id: number) {
  if (NET.status !== 'online') return;
  if (TRADE.open) { radio('SYSTEM', 'Du handelst schon.'); return; }
  sendMsg({ t: 'tr', op: 'ask', to: id });
}
export function acceptTrade() { if (TRADE.ask) { sendMsg({ t: 'tr', op: 'yes', from: TRADE.ask.id }); TRADE.ask = null; changed(); } }
export function declineTrade() { if (TRADE.ask) { sendMsg({ t: 'tr', op: 'no', from: TRADE.ask.id }); TRADE.ask = null; changed(); } }
export function withdrawTrade() { if (TRADE.sent) { sendMsg({ t: 'tr', op: 'back' }); TRADE.sent = null; changed(); } }
export function cancelTrade() { if (TRADE.open) sendMsg({ t: 'tr', op: 'cancel' }); }

// eigenes Angebot ändern (auf das Vorhandene begrenzt) und an den Server schicken
export function setOffer(k: ItemId | 'cr', n: number) {
  if (!TRADE.open) return;
  const o: Offer = { items: { ...TRADE.mine.items }, cr: TRADE.mine.cr };
  if (k === 'cr') o.cr = Math.max(0, Math.min(Math.floor(P.credits), Math.floor(n) || 0));
  else { const v = Math.max(0, Math.min(P.cargo[k] || 0, Math.floor(n) || 0)); if (v) o.items[k] = v; else delete o.items[k]; }
  TRADE.mine = o; TRADE.readyMe = false; TRADE.readyThem = false;
  sendMsg({ t: 'tr', op: 'offer', items: o.items, cr: o.cr });
  changed();
}
// Angebot noch gedeckt? (z. B. wenn inzwischen etwas verkauft wurde)
export function offerCovered() {
  if (TRADE.mine.cr > P.credits) return false;
  return ITEM_IDS.every(k => (TRADE.mine.items[k] || 0) <= (P.cargo[k] || 0));
}
export function setReady(v: boolean) {
  if (!TRADE.open) return;
  if (v && !offerCovered()) { TRADE.last = 'Dein Angebot ist nicht mehr gedeckt. Bitte anpassen.'; changed(); return; }
  if (v && !offerCount(TRADE.mine) && !TRADE.mine.cr && !offerCount(TRADE.theirs) && !TRADE.theirs.cr) { TRADE.last = 'Noch liegt auf keiner Seite etwas.'; changed(); return; }
  TRADE.readyMe = v;
  sendMsg({ t: 'tr', op: 'ready', v, rev: TRADE.rev });
  snd(v ? 880 : 520, 0.06, 'sine', 0.03, v ? 200 : -100);
  changed();
}
// wie viel vom Erhaltenen in den Frachtraum passt (Rest ins Stationslager)
export function cargoSpaceAfter() {
  const give = offerCount(TRADE.mine), get = offerCount(TRADE.theirs);
  return stats().cargo - cargoUsed() + give - get;
}

function reset() {
  TRADE.open = false; TRADE.withId = 0; TRADE.withName = ''; TRADE.station = '';
  TRADE.mine = empty(); TRADE.theirs = empty(); TRADE.readyMe = TRADE.readyThem = false; TRADE.rev = 0;
}
function cleanIn(o: any): Offer {
  const out = empty();
  if (o && o.items) for (const k of ITEM_IDS) { const n = Math.floor(+o.items[k] || 0); if (n > 0) out.items[k] = n; }
  out.cr = Math.max(0, Math.floor(+(o && o.cr) || 0));
  return out;
}
// Abschluss buchen: Abgabe aus Frachtraum und Konto, Erhaltenes in Frachtraum, Überlauf ins Stationslager
function book(give: Offer, get: Offer, name: string) {
  for (const k of ITEM_IDS) { const n = Math.min(give.items[k] || 0, P.cargo[k] || 0); if (n) P.cargo[k] -= n; }
  P.credits = Math.max(0, P.credits - Math.min(give.cr, P.credits)) + get.cr;
  const cap = stats().cargo, st = myStation() || TRADE.station;
  let stored = 0;
  for (const k of ITEM_IDS) {
    const n = get.items[k] || 0; if (!n) continue;
    const fit = Math.max(0, Math.min(n, cap - cargoUsed()));
    P.cargo[k] += fit;
    if (n > fit) { if (st) deposit(st, k, n - fit); stored += n - fit; }
  }
  const parts = [...ITEM_IDS.filter(k => get.items[k]).map(k => `${get.items[k]}× ${ITEMS[k].n}`), ...(get.cr ? [`${get.cr} Cr`] : [])];
  TRADE.last = `Handel mit ${name} abgeschlossen.${parts.length ? ' Erhalten: ' + parts.join(', ') + '.' : ''}${stored ? ` ${stored} Einheiten passten nicht in den Frachtraum und liegen im Stationslager.` : ''}`;
  radio('HANDEL', TRADE.last, '#ffb347');
  saveGame(); pushSave(true);
  snd(660, 0.12, 'sine', 0.05, 400);
}

netHooks.trade = (m: any) => {
  const now = performance.now();
  if (m.op === 'ask') {
    TRADE.ask = { id: m.from, name: m.name, at: now };
    radio('HANDEL', `${m.name} möchte mit dir handeln. Taste T oder Flottenband → Handel.`, '#ffb347');
    snd(740, 0.08, 'sine', 0.04, 300);
  } else if (m.op === 'gone') {
    if (TRADE.ask && TRADE.ask.id === m.from) TRADE.ask = null;
  } else if (m.op === 'sent') {
    TRADE.sent = { id: m.to, name: m.name, at: now }; TRADE.last = '';
    radio('HANDEL', `Handelsanfrage an ${m.name} geschickt.`, '#ffb347');
  } else if (m.op === 'no') {
    TRADE.sent = null; TRADE.last = m.why || `${m.name} hat abgelehnt.`;
    radio('HANDEL', TRADE.last, '#ffb347');
  } else if (m.op === 'err') {
    TRADE.last = m.why || 'Handel nicht möglich.';
    radio('HANDEL', TRADE.last, '#ffb347');
  } else if (m.op === 'open') {
    reset();
    TRADE.open = true; TRADE.withId = m.id; TRADE.withName = m.name; TRADE.station = myStation();
    TRADE.sent = null; TRADE.ask = null; TRADE.last = '';
    snd(880, 0.1, 'sine', 0.04, 200);
    tradeHooks.opened();
  } else if (m.op === 'st') {
    if (!TRADE.open) return;
    TRADE.mine = cleanIn(m.mine); TRADE.theirs = cleanIn(m.theirs);
    TRADE.readyMe = !!m.rm; TRADE.readyThem = !!m.rt; TRADE.rev = +m.rev || 0;
  } else if (m.op === 'end') {
    if (!TRADE.open) return;
    TRADE.last = m.why || 'Handel abgebrochen.';
    radio('HANDEL', TRADE.last, '#ffb347');
    reset();
  } else if (m.op === 'done') {
    if (!TRADE.open) return;
    book(cleanIn(m.give), cleanIn(m.get), m.name || TRADE.withName);
    reset();
  }
  changed();
};
netHooks.lost = () => { const was = TRADE.open; reset(); TRADE.ask = null; TRADE.sent = null; if (was) TRADE.last = 'Verbindung verloren, Handel abgebrochen.'; changed(); };
