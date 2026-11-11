import { $, esc } from '../core/util';
import { P, G, stats } from '../game/state';
import { world } from '../game/world';
import { nearDock } from '../game/player';
import { landInfo, nearShip, ROVER } from '../game/surface';
import { IN, nearestOther } from '../game/interior';
import { TRADE } from '../game/trade';
import { isOnline } from '../game/net';
import { MINE } from '../game/mining';

// Steuerungsleiste links unten: zeigt nur die Tasten, die gerade Sinn ergeben.
// Hervorgehoben (hi) ist, was jetzt möglich ist, z. B. Andocken oder Landen.
type Row = [string, string, boolean?];   // Taste, Aktion, hervorgehoben
let last = '', t = 0;

const tradeAsk = () => (TRADE.ask && performance.now() - TRADE.ask.at < 90000 ? TRADE.ask.name : '');
function rowsFor(): { title: string; rows: Row[] } | null {
  const m = G.mode;
  if (G.dead) return null;
  if (m === 'walk') {
    const r: Row[] = [];
    if (IN.target) r.push(['E', IN.target.label(), true]);
    const ask = tradeAsk(), near = isOnline() ? nearestOther() : null;
    if (ask) r.push(['T', `Handelsanfrage von ${ask}`, true]);
    else if (near) r.push(['T', `Handel mit ${near.name} anbieten`, true]);
    r.push(['W A S D', 'Laufen'], ['Umschalt', 'Rennen']);
    if (IN.station && !IN.ship) r.push(['Tab', 'Stationsmenü']);
    r.push(['B', 'Flottenband'], ['M', 'Karte'], ['Esc', 'Menü']);
    return { title: IN.ship ? `An Bord · ${IN.area}` : `Zu Fuß · ${IN.area}`, rows: r };
  }
  if (m === 'rover') {
    const r: Row[] = [];
    if (nearShip()) r.push(['E', `An Bord der ${P.shipName}`, true]);
    if (ROVER.target) r.push(['Klick halten', 'Bohren', true]);
    r.push(['W / S', 'Gas / Bremse'], ['A / D', 'Lenken'], ['Umschalt', 'Schneller'], ['B', 'Flottenband'], ['Esc', 'Menü']);
    return { title: 'Bergbau-Rover', rows: r };
  }
  if (m === 'play') {
    const r: Row[] = [], st = stats();
    if (tradeAsk()) r.push(['T', `Handelsanfrage von ${tradeAsk()}`, true]);
    const dock = nearDock(), li = !dock ? landInfo() : null;
    if (dock) r.push(['E', `Andocken · ${dock.name}`, true]);
    else if (li && li.ok) r.push(['E', 'Landen, Rover aussetzen', true]);
    if (G.lockT && P.rockets > 0) r.push(['F', 'Rakete abfeuern', true]);
    const fire = P.tool === 'laser' ? (MINE.target ? 'Laser halten: abbauen' : 'Bergbaulaser') : P.tool === 'charge' ? 'Sprengladung werfen' : 'Kanonen feuern';
    r.push(['Klick', fire, P.tool === 'laser' && !!MINE.target]);
    r.push(['W / S', 'Schub / Bremsen'], ['Maus', 'Lenken'], ['A / D', 'Ausweichen']);
    r.push(['1–4', st.laser ? 'Werkzeug wählen' : 'Waffen']);
    if (st.laser) r.push(['R', 'Asteroiden scannen']);
    r.push(['B', 'Flottenband'], ['M', 'Karte']);
    return { title: world.surface ? `Flug · ${world.def?.name || ''}` : `Flug · ${P.tool === 'laser' ? 'Bergbau' : P.tool === 'charge' ? 'Sprengen' : 'Kampf'}`, rows: r.slice(0, 9) };
  }
  return null;
}

export function updateControls(dt: number, scale: number) {
  t -= dt;
  if (t > 0) return;
  t = 0.15;
  const el = $('ctrlP'), d = rowsFor();
  if (!d) { if (last !== '') { el.classList.add('hidden'); last = ''; } return; }
  const key = d.title + d.rows.map(r => r.join('|')).join('/');
  if (key === last) return;
  last = key;
  el.classList.remove('hidden');
  el.style.transform = `scale(${scale})`;
  el.innerHTML = `<div class="ct">${esc(d.title)}</div>` + d.rows.map(([k, a, hi]) => `<div class="cr${hi ? ' hi' : ''}"><kbd>${esc(k)}</kbd><span>${esc(a)}</span></div>`).join('');
}
