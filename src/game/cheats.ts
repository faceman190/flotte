// Entwicklerbefehle im Funk-Eingabefeld (Enter). Nur im Entwicklermodus: Adresse einmal mit ?dev=1 öffnen
// (bleibt auf diesem Gerät gespeichert; ?dev=0 schaltet ihn wieder ab). Im lokalen Entwicklungsserver immer an.
// Kein Schutz gegen Kundige: Spielstände kommen ohnehin vom Gerät. Für echten Schutz müsste der Server Credits verwalten.
import { P, saveGame, stats } from './state';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import { radio } from '../ui/radio';
import { fmtN } from '../core/util';

const KEY = 'lc_dev';
try {
  const q = new URLSearchParams(location.search).get('dev');
  if (q === '1') localStorage.setItem(KEY, '1');
  if (q === '0') localStorage.removeItem(KEY);
} catch (e) { /* ohne Speicher: nur lokal */ }
export function devMode() {
  if ((import.meta as any).env?.DEV) return true;
  try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
}

const HELP = '/geld [Betrag] · /heilen · /fracht <Ware> [Menge] · /fracht leer · /waren · /hilfe';
// true = die Eingabe war ein Befehl (nicht als Funkspruch senden)
export function runCommand(text: string): boolean {
  const t = text.trim();
  if (!t.startsWith('/')) return false;
  if (!devMode()) { radio('SYSTEM', 'Befehle gibt es nur im Entwicklermodus.'); return true; }
  const [cmd, a, b] = t.slice(1).toLowerCase().split(/\s+/);
  const say = (s: string) => radio('ENTWICKLER', s, '#c070ff');
  if (cmd === 'geld' || cmd === 'money') {
    const n = Math.round(Number(a ?? 100000));
    if (!isFinite(n)) { say('Beispiel: /geld 50000'); return true; }
    P.credits = Math.max(0, P.credits + n);
    say(`${n >= 0 ? '+' : ''}${fmtN(n)} Credits · Kontostand ${fmtN(P.credits)}`);
  } else if (cmd === 'heilen' || cmd === 'heal') {
    const s = stats();
    P.hull = s.maxHull; P.shield = s.maxShield; P.ammo = s.maxAmmo; P.rockets = s.maxRockets;
    say('Hülle, Schild, Munition und Raketen aufgefüllt.');
  } else if (cmd === 'fracht' || cmd === 'cargo') {
    if (a === 'leer') { for (const k of ITEM_IDS) P.cargo[k] = 0; say('Frachtraum geleert.'); }
    else {
      const id = ITEM_IDS.find(k => k === a || ITEMS[k].n.toLowerCase() === a || ITEMS[k].n.toLowerCase().startsWith(a || '\u0000')) as ItemId | undefined;
      const n = Math.max(1, Math.round(Number(b ?? 10)) || 10);
      if (!id) say('Unbekannte Ware. Liste: /waren');
      else { P.cargo[id] = (P.cargo[id] || 0) + n; say(`+${n} ${ITEMS[id].n} (ohne Rücksicht auf den Frachtraum).`); }
    }
  } else if (cmd === 'waren') say(ITEM_IDS.map(k => ITEMS[k].n).join(', '));
  else say(HELP);
  saveGame();
  return true;
}
