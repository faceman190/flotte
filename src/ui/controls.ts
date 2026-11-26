import { look } from '../core/input';
import { $, esc } from '../core/util';
import { P, G, stats, settings } from '../game/state';
import { world } from '../game/world';
import { nearDock } from '../game/player';
import { landInfo, nearShip, ROVER } from '../game/surface';
import { IN, nearestOther } from '../game/interior';
import { TRADE } from '../game/trade';
import { isOnline } from '../game/net';
import { MINE } from '../game/mining';
import { DUN } from '../game/dungeon';
import { SF, navTarget, goalNav, sfBlock, sfFar } from '../game/schnellflug';
import { nextHop } from './hud';
import { SECTOR } from '../data/galaxy';
import { FOOT } from '../game/onfoot';
import { grenadeCount } from '../game/granate';
import { GUN } from '../game/footgun';
import { aufstehGrund } from '../game/bordflug';

// Steuerungsleiste links unten: nur was gerade wichtig ist (seit Alpha 1.51, Wunsch des Spielers).
// Keine Grundtasten mehr (W/S, Maus, A/D, V, Mausrad, Laufen, Springen …): die sind in jedem Spiel ähnlich und stehen unter Esc → Steuerung.
// Es bleiben Aktionen, die jetzt gehen (Andocken, Landen, Rakete, Abbauen, Kurzsprung …), und Tasten, die man in der Lage braucht und nicht
// errät (Bergbaulaser im Feld, Scannen, Sprung entlang der Route). Nur in den ersten zehn Spielminuten kommen ein paar Spieltasten dazu.
// Ohne Zeilen verschwindet die Leiste ganz. Hervorgehoben (hi) ist, was jetzt sofort möglich ist.
type Row = [string, string, boolean?];   // Taste, Aktion, hervorgehoben
let last = '', t = 0;

const tradeAsk = () => (TRADE.ask && performance.now() - TRADE.ask.at < 90000 ? TRADE.ask.name : '');
const fresh = () => (P.playtime || 0) < 600;
const near = (x: number, y: number, z: number, d: number) => Math.hypot(x - P.x, y - P.y, z - P.z) < d;
function rowsFor(): { title: string; rows: Row[] } | null {
  const m = G.mode;
  if (G.dead) return null;
  if (m === 'walk') {
    const r: Row[] = [];
    if (IN.target) r.push(['E', IN.target.label(), true]);
    const ask = tradeAsk(), other = isOnline() ? nearestOther() : null;
    if (ask) r.push(['T', `Handelsanfrage von ${ask}`, true]);
    else if (other) r.push(['T', `Handel mit ${other.name} anbieten`, true]);
    if (fresh()) r.push(['I', 'Ausrüstung'], ['B', 'Flottenband']);
    return { title: IN.ship ? 'An Bord' : 'Zu Fuß', rows: r };
  }
  if ((m as string) === 'dungeon') {
    const r: Row[] = [];
    if (DUN.prompt) r.push(['E', DUN.prompt, true]);
    if (GUN.max && GUN.reload <= 0 && GUN.mag < GUN.max * 0.5) r.push(['R', 'Nachladen']);
    if (fresh()) r.push(['Rechtsklick halten', 'Zielen']);
    if (grenadeCount() > 0) r.push(['G', 'Granate werfen']);
    return { title: DUN.e ? DUN.e.name : 'Mine', rows: r };
  }
  if (m === 'rover' && FOOT.active) {
    const r: Row[] = [];
    if (FOOT.prompt) r.push(['E', FOOT.prompt, true]);
    if (FOOT.act === 'rover' && !FOOT.prompt) r.push(['F', 'In den Rover steigen', true]);   // steht die Aufforderung schon da (E), nicht doppelt
    if (GUN.max && GUN.reload <= 0 && GUN.mag < GUN.max * 0.5) r.push(['R', 'Nachladen']);
    if (fresh()) r.push(['Rechtsklick halten', 'Zielen']);
    if (grenadeCount() > 0) r.push(['G', 'Granate werfen']);
    return { title: 'Zu Fuß', rows: r };
  }
  if (m === 'rover') {
    const r: Row[] = [];
    if (nearShip()) r.push(['E', `An Bord der ${P.shipName}`, true]);
    if (ROVER.target) r.push(['Klick halten', 'Bohren', true]);
    r.push(['Q', ROVER.kind === 'wiesel' ? 'Handbremse (auch Leertaste)' : 'Handbremse'], ['V', ROVER.view ? 'Verfolgerkamera' : ROVER.kind === 'wiesel' ? 'Fahrersicht' : 'Motorhaubensicht']);
    r.push(['F', 'Aussteigen']);
    return { title: 'Rover', rows: r };
  }
  if (m === 'play') {
    const r: Row[] = [], st = stats();
    if (tradeAsk()) r.push(['T', `Handelsanfrage von ${tradeAsk()}`, true]);
    const dock = nearDock(), li = !dock ? landInfo() : null;
    if (dock) r.push(['E', world.surface && settings.walk ? `Landen · ${dock.name}` : `Andocken · ${dock.name}`, true]);
    else if (li && li.ok) r.push(['E', 'Landen, Rover aussetzen', true]);
    if (G.lockT && P.rockets > 0) r.push(['Rechtsklick', 'Rakete abfeuern', true]);
    // Werkzeug passend zur Lage: im Feld der Laser, bei Ferrox in der Nähe die Kanonen
    const inField = world.fields.some(f => near(f.x, f.y, f.z, f.r + 400)), foes = world.enemies.some(e => near(e.x, e.y, e.z, 1600));
    if (P.tool === 'laser') {
      if (MINE.target) r.push(['Klick halten', 'Abbauen', true]);
      if (foes) r.push(['1', 'Kanonen', true]);
      else if (inField) r.push(['R', 'Scannen']);
    } else if (st.laser && inField && !foes) r.push(['2', 'Bergbaulaser']);
    // Reisen: Sprung entlang der Route, Kurzsprung zum Ziel; in großen Sektoren fern von allem auch Ziel wählen und Schnellflug
    if (G.jd) r.push(['J', 'Sprung abbrechen', true]);
    else if (!world.surface) { const hop = nextHop(); if (hop) r.push(['J', `Sprung → ${SECTOR[hop]?.name || hop}`]); }
    // Seit 2026-11-26 (Spieltest: Reiseflug und Kurzsprung fand man nicht): Ist das Ziel des Auftrags weit weg, steht „N · Kurs auf …“ da;
    // mit gesetztem Ziel der Kurzsprung, und wenn er gerade nicht geht, warum. Für nahe Ziele der Reiseflug.
    let far = false;
    if (!world.surface) {
      const nt = navTarget(), goal = nt ? null : goalNav();
      if (SF.phase === 'fly') r.push(['H', 'Schnellflug beenden', true]);
      else if (SF.phase === 'spool') r.push(['H', 'Schnellflug abbrechen', true]);
      else if (nt && sfFar(nt)) { const b = sfBlock(); r.push(['H', b ? `Kurzsprung → ${nt.name} · ${b}` : `Kurzsprung → ${nt.name}`, !b]); }
      else if (goal && sfFar(goal) && !dock) r.push(['N', `Kurs auf ${goal.name} setzen`, true]);
      else if (world.def?.size && !world.stations.some(s => near(s.x, s.y, s.z, 5000)) && !foes) r.push(['N', 'Ziel im Fadenkreuz wählen'], ['H', 'Schnellflug']);
      const t = nt || goal; far = !!t && !near(t.x, t.y, t.z, t.R + 1500);
    }
    if (!aufstehGrund()) r.push(['G', 'Aufstehen, Autopilot fliegt']);      // begehbare Schiffe im All (bordflug.ts)
    if (look.free) r.push(['V', 'Freie Kamera beenden', true]);
    if (SF.phase === 'off' && !dock && !foes && (fresh() || G.cruise || (far && !inField))) r.push(['Umschalt', G.cruise ? 'Reiseflug aus' : 'Reiseflug (schneller)']);
    if (fresh()) r.push(['B', 'Flottenband'], ['M', 'Karte']);
    if (!world.surface) r.push(['Alt', 'halten: alle Namen']);      // Beschriftungen im All (hud.ts, seit 2026-11-26)
    return { title: 'Flug', rows: r.slice(0, 8) };
  }
  return null;
}

export function updateControls(dt: number, scale: number) {
  t -= dt;
  if (t > 0) return;
  t = 0.15;
  const el = $('ctrlP'), d = rowsFor();
  if (!d || !d.rows.length) { if (last !== '') { el.classList.add('hidden'); last = ''; } return; }   // nichts Wichtiges: Leiste weg
  const key = d.title + d.rows.map(r => r.join('|')).join('/');
  if (key === last) return;
  last = key;
  el.classList.remove('hidden');
  el.style.transform = `scale(${scale})`;
  el.innerHTML = `<div class="ct">${esc(d.title)}</div>` + d.rows.map(([k, a, hi]) => `<div class="cr${hi ? ' hi' : ''}"><kbd>${esc(k)}</kbd><span>${esc(a)}</span></div>`).join('');
}
