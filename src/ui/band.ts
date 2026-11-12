import { $, esc, fmtN, fmtD, d3 } from '../core/util';
import { snd, sfx } from '../core/audio';
import { releaseAll } from '../core/input';
import { P, G, stats, cargoUsed, saveGame, type Mode, type ShipRec } from '../game/state';
import { world } from '../game/world';
import { SECTOR, SECTORS, FACTION, findRoute } from '../data/galaxy';
import { ITEMS, ITEM_IDS, type ItemId } from '../data/items';
import { SHIPS, computeStats, type Up, type ShipId } from '../data/ships';
import { UPG, MAXLV, upgFor } from '../data/upgrades';
import { PLANETS } from '../data/planets';
import { abandon } from '../game/economy';
import { radioLog, radioHooks } from './radio';
import { itemIcon } from './icons';
import { showMap, hideMap, drawMap } from './galaxyMap';
import { SIL, trackedContract } from './hud';
import { NET, netHooks, sendChat, isOnline, pilotsHere, myStation } from '../game/net';
import { TRADE, tradeHooks, requestTrade, acceptTrade, declineTrade, withdrawTrade, cancelTrade, setOffer, setReady, tradeValue, offerCount, cargoSpaceAfter, offerCovered, type Offer } from '../game/trade';
import { roomName } from './mp';
import { REP, REP_IDS, RANKS, TRUST_LV, level, nextRank, rankName, repOf, repHooks, type RepId } from '../game/reputation';
import { abandonMission, missionLines, missionTypeName, missionHooks } from '../game/missions';
import { storyObjective } from '../game/story';
import { invApp, invAct } from './invApp';

// =====================================================================================
// Flottenband: der Armbandrechner, den die Flotte jedem Piloten mitgibt.
// Apps: Übersicht, Aufträge, Karte, Fuhrpark, Fracht, Ruf, Handel, Funk. Solange es offen ist, steht das Spiel (Modus 'map').
// =====================================================================================
export type App = 'start' | 'inventar' | 'auftraege' | 'karte' | 'fuhrpark' | 'fracht' | 'ruf' | 'handel' | 'funk';
const APPS: { id: App; n: string; sub: string; ico: string }[] = [
  { id: 'start', n: 'Übersicht', sub: 'Pilot, Standort und Schiff', ico: '<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>' },
  { id: 'inventar', n: 'Ausrüstung', sub: 'Was du trägst und was im Rucksack liegt', ico: '<path d="M9 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="5.5" y="7" width="13" height="14" rx="3"/>' },
  { id: 'auftraege', n: 'Aufträge', sub: 'Angenommene Lieferaufträge', ico: '<path d="M5 3h10l4 4v14H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 11h8M8 15h8M8 7h5" stroke="currentColor" stroke-width="2"/>' },
  { id: 'karte', n: 'Karte', sub: 'Galaxiekarte und Routenplanung', ico: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4v16M4 12h16" stroke="currentColor" stroke-width="1.5"/><circle cx="15" cy="9" r="2"/>' },
  { id: 'fuhrpark', n: 'Fuhrpark', sub: 'Deine Schiffe und ihre Ausstattung', ico: '<path d="M12 2 15 10l7 4-7 1-3 7-3-7-7-1 7-4z"/>' },
  { id: 'fracht', n: 'Fracht', sub: 'Frachtraum, Rover und Stationslager', ico: '<path d="M3 8 12 3l9 5v9l-9 5-9-5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 8l9 5 9-5M12 13v9" stroke="currentColor" stroke-width="2"/>' },
  { id: 'ruf', n: 'Ruf', sub: 'Ansehen bei Flottenrat, Grenzwacht und Bergbaugilde', ico: '<path d="M12 2l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17l-5.9 3.2 1.3-6.6L2.5 9l6.6-.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>' },
  { id: 'handel', n: 'Handel', sub: 'Waren und Credits mit anderen Piloten tauschen', ico: '<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' },
  { id: 'funk', n: 'Funk', sub: 'Verlauf der Funkmeldungen', ico: '<path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 9h8M8 12h5" stroke="currentColor" stroke-width="2"/>' },
];
let app: App = 'start', prevMode: Mode = 'play', fleetSel = 0, hudWasOn = false, dockWasOn = false;
export const bandHooks = { closed: (_m: Mode) => {}, openTab: (_t: string) => {} };
export const bandOpen = () => G.mode === 'map';
export const bandApp = () => app;

// App-Leiste einmal aufbauen
$('bandApps').innerHTML = APPS.map(a => `<button data-app="${a.id}"><svg viewBox="0 0 24 24" fill="currentColor">${a.ico}</svg>${a.n}</button>`).join('');
$('bandApps').addEventListener('click', e => { const b = (e.target as HTMLElement).closest('button'); if (b?.dataset.app) setApp(b.dataset.app as App); });
$('bandX').onclick = () => closeBand();

export function openBand(a?: App) {
  if (G.mode === 'map') { if (a && a !== app) setApp(a); return; }
  prevMode = G.mode;
  G.mode = 'map';
  if (document.pointerLockElement) document.exitPointerLock();
  releaseAll();
  hudWasOn = !$('hud').classList.contains('hidden');
  $('hud').classList.add('hidden');
  dockWasOn = !$('dock').classList.contains('hidden'); $('dock').classList.add('hidden');   // Stationsmenü scheint sonst durch
  $('band').classList.remove('hidden');
  document.body.classList.remove('playing');
  sfx('band_open', 0.5, 1, () => snd(980, 0.06, 'sine', 0.03, 300));
  fleetSel = 0;
  setApp(a || app);
}
export function closeBand() {
  if (G.mode !== 'map') return;
  if (TRADE.open) cancelTrade();   // das Handelsfenster gehört zum Band: zu = Handel abgebrochen
  hideMap();
  $('band').classList.add('hidden');
  if (hudWasOn) $('hud').classList.remove('hidden');
  if (dockWasOn) $('dock').classList.remove('hidden');
  G.mode = prevMode;
  sfx('band_close', 0.5, 1, () => snd(620, 0.06, 'sine', 0.03, -200));
  bandHooks.closed(prevMode);
}
export function setApp(a: App) {
  if (a !== 'handel' && app === 'handel' && TRADE.open) cancelTrade();
  app = a;
  for (const b of $('bandApps').querySelectorAll('button')) b.classList.toggle('on', (b as HTMLElement).dataset.app === a);
  const def = APPS.find(x => x.id === a)!;
  $('bandTitle').textContent = def.n;
  $('bandSub').textContent = def.sub;
  $('bandCr').textContent = `${fmtN(P.credits)} Cr`;
  $('bandName').textContent = P.name;
  $('bandNote').innerHTML = `${esc(where())}<br>${esc(SECTOR[P.sector].name)} · ${esc(FACTION[SECTOR[P.sector].faction].n)}`;
  if (a === 'karte') { $('bandBody').innerHTML = ''; showMap(); }
  else { hideMap(); render(); }
}
// pro Bild (nur Karte und Fuhrpark zeichnen laufend)
export function drawBand() {
  if (app === 'karte') drawMap();
  else if (app === 'fuhrpark') drawBlueprint();
}

// ---------- Hilfen ----------
function where() {
  if (G.dockedAt) return `Angedockt an ${G.dockedAt.name}`;
  if (world.surface) return `Auf ${world.def?.name || 'einem Planeten'}`;
  return 'Im Flug';
}
function stationName(id: string) {
  for (const s of SECTORS) { const st = s.stations.find(x => x.id === id); if (st) return { name: st.name, sector: s.id }; }
  for (const [sec, pl] of Object.entries(PLANETS)) if (`${sec}_base` === id && pl.base) return { name: `${pl.base} (${pl.name})`, sector: sec };
  return { name: id, sector: '' };
}
const meter = (v: number, max: number, col?: string) => `<div class="meter"><i style="width:${Math.max(0, Math.min(100, v / Math.max(1, max) * 100))}%${col ? `;background:${col}` : ''}"></i></div>`;
const hms = (s: number) => { const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h ? `${h} h ${m} min` : `${m} min`; };

function render() {
  const b = $('bandBody');
  b.innerHTML = app === 'start' ? startApp() : app === 'inventar' ? invApp() : app === 'auftraege' ? jobsApp() : app === 'fuhrpark' ? fleetApp() : app === 'fracht' ? cargoApp() : app === 'handel' ? tradeApp() : app === 'ruf' ? repApp() : funkApp();
  b.querySelectorAll<HTMLElement>('[data-a]').forEach(el => el.onclick = () => act(el.dataset.a!, el.dataset.k || ''));
  const ci = document.getElementById('bandChat') as HTMLInputElement | null;
  if (ci) {
    const go = () => { sendChat(ci.value); ci.value = ''; };
    ci.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') go(); });
    document.getElementById('bandChatGo')!.onclick = go;
  }
  const cr = document.getElementById('trCr') as HTMLInputElement | null;
  if (cr) {
    const go = () => { const v = Math.floor(+cr.value || 0); if (v !== TRADE.mine.cr) setOffer('cr', v); else render(); };
    cr.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') cr.blur(); });
    cr.addEventListener('change', go);
  }
}
// Online-Liste oder neue Funkmeldung: Übersicht und Funk neu zeichnen (ohne eine angefangene Nachricht zu verlieren)
const prevNet = netHooks.changed;
netHooks.changed = () => { prevNet(); if (bandOpen() && (app === 'start' || (app === 'handel' && !TRADE.open))) render(); };
// Handel: Fenster neu zeichnen (ohne eine angefangene Credit-Eingabe zu verlieren); angenommener Handel öffnet die App
tradeHooks.changed = () => {
  if (!bandOpen() || (app !== 'handel' && app !== 'start')) return;
  const ci = document.getElementById('trCr') as HTMLInputElement | null;
  if (ci && document.activeElement === ci) return;
  render();
};
tradeHooks.opened = () => { if (bandOpen()) setApp('handel'); else if (G.mode === 'play' || G.mode === 'dock' || G.mode === 'walk' || G.mode === 'rover') openBand('handel'); };
export function bandRadioChanged() {
  if (!bandOpen() || app !== 'funk') return;
  const ci = document.getElementById('bandChat') as HTMLInputElement | null, txt = ci?.value || '', focus = document.activeElement === ci;
  render();
  const n = document.getElementById('bandChat') as HTMLInputElement | null;
  if (n) { n.value = txt; if (focus) n.focus(); }
}
function act(a: string, k: string) {
  if (a === 'track') { P.track = k; snd(800, 0.06, 'sine', 0.03, 200); }
  if (a === 'route') { P.route = k === P.sector ? null : k; snd(700, 0.08, 'sine', 0.04, 200); }
  if (a === 'mdrop') { const m = (P.missions || []).find(x => x.id === k); if (m && confirmDrop(m.id)) { abandonMission(m); if (P.track === m.id) P.track = undefined; } }
  if (a === 'drop') { const c = P.contracts.find(x => x.id === k); if (c && confirmDrop(c.id)) { abandon(c); if (P.track === c.id) P.track = undefined; } }
  if (a === 'ship') fleetSel = +k;
  if (a === 'app') { setApp(k as App); return; }
  if (invAct(a, k)) { saveGame(); $('bandCr').textContent = `${fmtN(P.credits)} Cr`; render(); return; }
  if (a.startsWith('tr')) { tradeAct(a, k); return; }
  saveGame();
  render();
}
let dropArm = '';
function confirmDrop(id: string) { if (dropArm === id) { dropArm = ''; return true; } dropArm = id; setTimeout(() => { if (dropArm === id) { dropArm = ''; if (app === 'auftraege') render(); } }, 3000); return false; }

// ---------- Übersicht ----------
function startApp() {
  const here = new Set(pilotsHere().map(r => r.id));
  const S = stats(), sec = SECTOR[P.sector], fac = FACTION[sec.faction], c = trackedContract();
  const home = stationName(P.home.station).name;
  return `<div class="bgrid">
    <div class="bcard"><h4>Pilot</h4><div class="bbig">${esc(P.name.toUpperCase())}</div><div class="bsub">Pilot der Crew</div>
      <div class="row" style="margin-top:12px"><span>Credits</span><b class="amb">${fmtN(P.credits)} Cr</b></div>
      <div class="row"><span>Verdient gesamt</span><b>${fmtN(P.earned)} Cr</b></div>
      <div class="row"><span>Flugzeit</span><b>${hms(P.playtime)}</b></div>
      <div class="row"><span>Erkundet</span><b>${P.visited.length}/${SECTORS.length} Sektoren</b></div></div>
    <div class="bcard"><h4>Standort</h4><div class="bbig">${esc(sec.name.toUpperCase())}</div><div class="bsub" style="color:${fac.c}">${esc(fac.n)} · Gefahr ${sec.danger}/5</div>
      <div class="row" style="margin-top:12px"><span>Lage</span><b>${esc(where())}</b></div>
      <div class="row"><span>Heimathafen</span><b>${esc(home)}</b></div>
      <div class="row"><span>Route</span><b>${P.route && SECTOR[P.route] ? esc(SECTOR[P.route].name) + ` · ${(findRoute(P.sector, P.route)?.length || 1) - 1} Sprünge` : '—'}</b></div>
      <div class="btnRow" style="justify-content:flex-start"><button data-a="app" data-k="karte">Karte öffnen</button></div></div>
    <div class="bcard"><h4>Aktives Schiff</h4><div class="bbig">${esc(P.shipName.toUpperCase())}</div><div class="bsub">${esc(SHIPS[P.cls].role)}</div>
      <div class="row" style="margin-top:10px"><span>Hülle</span><b>${Math.ceil(P.hull)}/${S.maxHull}</b></div>${meter(P.hull, S.maxHull, P.hull < S.maxHull * 0.35 ? 'var(--bad)' : undefined)}
      <div class="row"><span>Schild</span><b>${Math.ceil(P.shield)}/${S.maxShield}</b></div>${meter(P.shield, S.maxShield)}
      <div class="row"><span>Fracht</span><b>${cargoUsed()}/${S.cargo}</b></div>${meter(cargoUsed(), S.cargo, 'linear-gradient(90deg,#c87a20,#ffb347)')}</div>
    <div class="bcard"><h4>Aktueller Auftrag</h4>${c ? `<div style="font-size:18px;font-weight:700">${itemIcon(c.item, 22)}${c.amount}× ${ITEMS[c.item].n}</div>
      <div class="row" style="margin-top:8px"><span>Ziel</span><b>${esc(c.stName)}</b></div><div class="row"><span>Sektor</span><b>${esc(SECTOR[c.sector]?.name || '')}</b></div>
      <div class="row"><span>An Bord</span><b>${Math.min(P.cargo[c.item], c.amount)}/${c.amount}</b></div>${meter(P.cargo[c.item], c.amount, 'var(--grn)')}
      <div class="row"><span>Belohnung</span><b class="amb">${fmtN(c.reward)} Cr</b></div>` : '<p>Kein Auftrag angenommen. Aufträge gibt es im Stationsmenü.</p>'}
      <div class="btnRow" style="justify-content:flex-start"><button data-a="app" data-k="auftraege">Alle Aufträge</button></div></div>
    <div class="bcard"><h4>Piloten online</h4>${NET.status === 'online' ? NET.roster.map(r => `<div class="row" style="align-items:center"><span style="color:${r.id === NET.id ? 'var(--amb)' : 'var(--grn)'}">${esc(r.name)}${r.id === NET.id ? ' (du)' : ''}</span><b>${here.has(r.id) ? `<button class="mini" data-a="trAsk" data-k="${r.id}">Handeln</button>` : esc(roomName(r.room))}</b></div>`).join('') : '<p class="hint">Nicht mit einem Mehrspieler-Server verbunden. Verbinden: Pausenmenü → Mehrspieler.</p>'}</div>
    <div class="bcard"><h4>Ruf</h4>${REP_IDS.map(id => { const nx = nextRank(id); return `<div class="row"><span style="color:${REP[id].c}">${REP[id].n}</span><b>${esc(rankName(id))}</b></div>${meter(nx ? Math.max(0, nx.frac) * 100 : 100, 100, REP[id].c)}`; }).join('')}
      <div class="btnRow" style="justify-content:flex-start"><button data-a="app" data-k="ruf">Ruf ansehen</button></div></div>
    <div class="bcard"><h4>Bilanz</h4>
      <div class="row"><span>Erz abgebaut</span><b>${fmtN(P.mined)} E</b></div>
      <div class="row"><span>Ferrox zerstört</span><b>${P.kills}</b></div>
      <div class="row"><span>Aufträge offen</span><b>${P.contracts.length}</b></div>
      <div class="row"><span>Schiffe</span><b>${1 + P.fleet.length}</b></div></div>
  </div>`;
}

// ---------- Aufträge ----------
function jobsApp() {
  // Hauptgeschichte (Prolog, Kapitel) ganz oben
  const so = storyObjective();
  const story = so ? `<div class="bcard" style="max-width:820px;margin-bottom:18px;border-left:3px solid #ffd27a"><h4 style="color:#ffd27a">Hauptgeschichte</h4><div class="bbig" style="font-size:20px">${esc(so.title.toUpperCase())}</div>${so.lines.map(([t, done, sub]) => `<div class="obj${done ? ' done' : ''}${sub ? ' sub' : ''}" style="margin-top:6px">${sub ? '' : '<i></i>'}<span>${t}</span></div>`).join('')}</div>` : '';
  const ms = P.missions || [];
  const mis = ms.length ? `<h4 class="bh">FRAKTIONSMISSIONEN (${ms.length}/2)</h4><div class="blist" style="margin-bottom:18px">${ms.map(m => {
    const on = P.track === m.id, ml = missionLines(m), r = findRoute(P.sector, m.tgt), j = r ? r.length - 1 : 0;
    return `<div class="bitem${on ? ' on' : ''}" style="cursor:default;align-items:flex-start;border-left:3px solid ${REP[m.fac].c}">
      <div style="flex:1;min-width:0"><div class="sm" style="color:${REP[m.fac].c}">${esc(REP[m.fac].n)} · ${missionTypeName(m.type)}</div><div class="nm">${esc(m.title)}</div>
        <div class="sm">${esc(SECTOR[m.tgt].name)} · ${m.tgt === P.sector ? 'hier' : `${j} ${j === 1 ? 'Sprung' : 'Sprünge'}`} · ${m.got}/${m.n}</div>
        ${meter(m.got, m.n, REP[m.fac].c)}
        <div class="btnRow" style="justify-content:flex-start;margin-top:6px">
          <button data-a="track" data-k="${m.id}" ${on ? 'disabled' : ''}>${on ? 'Wird verfolgt' : 'Im HUD verfolgen'}</button>
          ${m.tgt !== P.sector ? `<button data-a="route" data-k="${m.tgt}" class="${P.route === m.tgt ? '' : 'pri'}">${P.route === m.tgt ? 'Route steht' : 'Route setzen'}</button>` : ''}
          <button data-a="mdrop" data-k="${m.id}">${dropArm === m.id ? 'Wirklich abbrechen?' : 'Abbrechen'}</button></div></div>
      <div style="text-align:right"><div class="amb" style="font-family:var(--mono);font-size:20px">${fmtN(m.reward)} Cr</div><div class="sm">+${m.rep} Ruf</div></div></div>`;
  }).join('')}</div>` : '';
  if (!P.contracts.length) return story + mis + (ms.length ? '' : `<div class="bcard" style="max-width:560px;margin-bottom:12px"><h4>Keine Missionen</h4><p>Fraktionsmissionen bekommst du an Stationen: Stationsmenü → Missionen. Sie bringen viel Ruf.</p></div>`) + `<div class="bcard" style="max-width:560px"><h4>Keine Aufträge</h4><p>Lieferaufträge nimmst du an Stationen an: Stationsmenü → Aufträge. Angenommene Aufträge erscheinen hier und rechts oben im HUD.</p></div>`;
  const tr = trackedContract();
  return story + mis + `<h4 class="bh">LIEFERAUFTRÄGE</h4><div class="blist">${P.contracts.map(c => {
    const have = Math.min(P.cargo[c.item], c.amount), r = findRoute(P.sector, c.sector), j = r ? r.length - 1 : 0, on = tr === c;
    const st = c.sector === P.sector ? world.stations.find(s => s.id === c.station) : null;
    return `<div class="bitem${on ? ' on' : ''}" style="cursor:default;align-items:flex-start">
      <div style="padding-top:2px">${itemIcon(c.item, 30)}</div>
      <div style="flex:1;min-width:0"><div class="nm">${c.amount}× ${ITEMS[c.item].n} → ${esc(c.stName)}</div>
        <div class="sm">${esc(SECTOR[c.sector]?.name || '')} · ${c.sector === P.sector ? (st ? fmtD(d3(st.x, st.y, st.z, P.x, P.y, P.z)) : 'hier') : `${j} ${j === 1 ? 'Sprung' : 'Sprünge'}`} · an Bord ${have}/${c.amount}</div>
        ${meter(have, c.amount, have >= c.amount ? 'var(--grn)' : undefined)}
        <div class="btnRow" style="justify-content:flex-start;margin-top:6px">
          <button data-a="track" data-k="${c.id}" ${on ? 'disabled' : ''}>${on ? 'Wird verfolgt' : 'Im HUD verfolgen'}</button>
          ${c.sector !== P.sector ? `<button data-a="route" data-k="${c.sector}" class="${P.route === c.sector ? '' : 'pri'}">${P.route === c.sector ? 'Route steht' : 'Route setzen'}</button>` : ''}
          <button data-a="drop" data-k="${c.id}">${dropArm === c.id ? 'Wirklich aufgeben?' : 'Aufgeben'}</button></div></div>
      <div style="text-align:right"><div class="amb" style="font-family:var(--mono);font-size:20px">${fmtN(c.reward)} Cr</div><div class="sm">Belohnung</div></div></div>`;
  }).join('')}</div>`;
}

// ---------- Fuhrpark ----------
interface FleetEntry { cls: ShipId; name: string; up: Record<string, number>; hull: number; cargo: Record<ItemId, number>; loc: string; sector: string; active: boolean }
function fleetList(): FleetEntry[] {
  const here = G.dockedAt ? G.dockedAt.name : where();
  return [{ cls: P.cls, name: P.shipName, up: P.up, hull: P.hull, cargo: P.cargo, loc: here, sector: P.sector, active: true },
    ...P.fleet.map((r: ShipRec) => { const s = stationName(r.loc.station); return { cls: r.cls, name: r.name, up: r.up, hull: r.hull, cargo: r.cargo, loc: s.name, sector: r.loc.sector, active: false }; })];
}
function fleetApp() {
  const L = fleetList(); if (fleetSel >= L.length) fleetSel = 0;
  const e = L[fleetSel], S = computeStats(e.cls, e.up as Up), used = ITEM_IDS.reduce((a, k) => a + (e.cargo[k] || 0), 0), ups = upgFor(e.cls);
  return `<div class="split">
    <div class="blist">${L.map((x, i) => `<div class="bitem${i === fleetSel ? ' on' : ''}" data-a="ship" data-k="${i}"><div><div class="nm">${esc(x.name)}</div><div class="sm">${esc(SHIPS[x.cls].role)} · ${esc(x.loc)}</div></div>${x.active ? '<span class="lock">● AKTIV</span>' : ''}</div>`).join('')}
      <p class="hint" style="margin-top:6px">Schiffe kaufst und wechselst du in der Werft und im Hangar einer Station.</p></div>
    <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
      <div class="blueprint"><canvas id="bpC"></canvas></div>
      <div class="bgrid">
        <div class="bcard"><h4>${esc(e.name)}</h4>
          <div class="row"><span>Klasse</span><b>${esc(SHIPS[e.cls].role)}</b></div>
          <div class="row"><span>Standort</span><b>${esc(e.loc)}</b></div>
          <div class="row"><span>Hülle</span><b>${Math.ceil(e.hull)}/${S.maxHull}</b></div>${meter(e.hull, S.maxHull)}
          <div class="row"><span>Fracht</span><b>${used}/${S.cargo}</b></div>${meter(used, S.cargo, 'linear-gradient(90deg,#c87a20,#ffb347)')}
          ${!e.active && e.sector !== P.sector ? `<div class="btnRow" style="justify-content:flex-start"><button class="pri" data-a="route" data-k="${e.sector}">Route zum Standort</button></div>` : ''}</div>
        <div class="bcard"><h4>Werte</h4>
          <div class="row"><span>Tempo</span><b>${S.max} m/s</b></div><div class="row"><span>Schild</span><b>${S.maxShield}</b></div>
          <div class="row"><span>Kanonen</span><b>${S.dmg} Schaden</b></div>
          <div class="row"><span>Bergbaulaser</span><b>${S.laser ? `${(S.laserRate * S.beams).toFixed(1).replace('.', ',')} E/s` : '—'}</b></div>
          <div class="row"><span>Sprengladungen</span><b>${S.maxCharges || '—'}</b></div><div class="row"><span>Drohnen</span><b>${S.drones || '—'}</b></div></div>
        <div class="bcard"><h4>Ausbau</h4>${ups.map(k => `<div class="row"><span>${esc(UPG[k].n)}</span><span class="lv">${Array.from({ length: MAXLV }, (_, i) => `<i class="${i < (e.up[k] || 0) ? 'f' : ''}"></i>`).join('')}</span></div>`).join('')}</div>
      </div></div></div>`;
}
let bpT = 0;
function drawBlueprint() {
  const cv = document.getElementById('bpC') as HTMLCanvasElement | null;
  if (!cv) return;
  const r = cv.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
  if (cv.width !== Math.round(r.width * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
  const g = cv.getContext('2d')!, W = r.width, H = r.height, e = fleetList()[fleetSel];
  if (!e) return;
  bpT += 0.016;
  g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
  const sil = SIL[e.cls] || SIL.falke;
  let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
  for (const poly of sil.body) for (const [x, y] of poly) { mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mny = Math.min(mny, y); mxy = Math.max(mxy, y); }
  const k = Math.min((W - 80) / (mxx - mnx), (H - 60) / (mxy - mny)), cx = W / 2, cy = H / 2 - (mny + mxy) / 2 * k;
  // Seitlich liegend (Bug nach rechts) wie eine Konstruktionszeichnung
  g.save(); g.translate(cx, cy + (mny + mxy) / 2 * k); g.rotate(Math.PI / 2); g.translate(0, -(mny + mxy) / 2 * k);
  const kk = Math.min((H - 50) / (mxx - mnx), (W - 120) / (mxy - mny));
  g.scale(kk / k, kk / k);
  g.shadowColor = '#5fd0ff'; g.shadowBlur = 10;
  for (const poly of [...sil.body, ...(sil.lite || [])]) {
    g.beginPath(); poly.forEach(([x, y], i) => (i ? g.lineTo(x * k, y * k) : g.moveTo(x * k, y * k))); g.closePath();
    g.fillStyle = 'rgba(95,208,255,.08)'; g.fill();
    g.strokeStyle = 'rgba(140,225,255,.9)'; g.lineWidth = 1.4 * k / kk; g.stroke();
  }
  g.shadowBlur = 0;
  for (const [x, y] of sil.eng) { g.fillStyle = `rgba(255,160,60,${0.5 + Math.sin(bpT * 5) * 0.2})`; g.beginPath(); g.arc(x * k, y * k, 2.2 * k, 0, 6.283); g.fill(); }
  for (const [x, y] of sil.guns) { g.fillStyle = '#ffb347'; g.fillRect(x * k - 1.2 * k, y * k - 2 * k, 2.4 * k, 4 * k); }
  g.restore();
  // Abtastlinie
  const sy = (bpT * 60) % H;
  g.fillStyle = 'rgba(95,208,255,.08)'; g.fillRect(0, sy, W, 2);
  g.fillStyle = '#5fd0ff'; g.font = '12px "Share Tech Mono",Consolas,monospace'; g.textAlign = 'left';
  g.fillText(`${e.name.toUpperCase()} · ${SHIPS[e.cls].role.toUpperCase()}`, 14, 22);
  g.fillStyle = '#8aa0b0'; g.fillText(`Länge ${SHIPS[e.cls].len || '—'} m`, 14, 40);
}

// ---------- Fracht ----------
function cargoTable(c: Partial<Record<ItemId, number>>) {
  const ks = ITEM_IDS.filter(k => c[k]);
  if (!ks.length) return '<p class="hint">leer</p>';
  return `<table><tbody>${ks.map(k => `<tr><td>${itemIcon(k, 20)}${ITEMS[k].n}</td><td class="num">${c[k]}</td></tr>`).join('')}</tbody></table>`;
}
function cargoApp() {
  const S = stats(), rover = P.rover && ITEM_IDS.some(k => P.rover![k]) ? P.rover : null;
  const stores = Object.entries(P.storage || {}).filter(([, v]) => ITEM_IDS.some(k => (v as any)[k]));
  return `<div class="bgrid">
    <div class="bcard"><h4>Frachtraum · ${esc(P.shipName)}</h4><div class="row"><span>Belegt</span><b>${cargoUsed()}/${S.cargo}</b></div>${meter(cargoUsed(), S.cargo, 'linear-gradient(90deg,#c87a20,#ffb347)')}${cargoTable(P.cargo)}</div>
    ${rover ? `<div class="bcard"><h4>Rover</h4>${cargoTable(rover)}</div>` : ''}
    ${P.fleet.filter(r => ITEM_IDS.some(k => r.cargo[k])).map(r => `<div class="bcard"><h4>${esc(r.name)} (geparkt)</h4><div class="hint" style="margin-bottom:6px">${esc(stationName(r.loc.station).name)}</div>${cargoTable(r.cargo)}</div>`).join('')}
    ${stores.map(([id, v]) => { const s = stationName(id); return `<div class="bcard"><h4>Lager · ${esc(s.name)}</h4><div class="hint" style="margin-bottom:6px">${esc(SECTOR[s.sector]?.name || '')}</div>${cargoTable(v as any)}</div>`; }).join('')}
    ${!stores.length ? '<div class="bcard"><h4>Stationslager</h4><p class="hint">Noch nichts eingelagert. Lagern kannst du im Stationsmenü unter „Lager“.</p></div>' : ''}
  </div>`;
}

// ---------- Handel ----------
function tradeAct(a: string, k: string) {
  if (a === 'trAsk') requestTrade(+k);
  else if (a === 'trYes') acceptTrade();
  else if (a === 'trNo') declineTrade();
  else if (a === 'trBack') withdrawTrade();
  else if (a === 'trCancel') cancelTrade();
  else if (a === 'trReady') setReady(!TRADE.readyMe);
  else if (a === 'trSet') { const [item, n] = k.split(':'); setOffer(item as ItemId, +n); }
  render();
}
const offerList = (o: Offer) => {
  const ks = ITEM_IDS.filter(k => o.items[k]);
  if (!ks.length && !o.cr) return '<p class="hint">Noch nichts angeboten.</p>';
  return `<table><tbody>${ks.map(k => `<tr><td>${itemIcon(k, 20)}${ITEMS[k].n}</td><td class="num">${o.items[k]}</td></tr>`).join('')}${o.cr ? `<tr><td>Credits</td><td class="num amb">${fmtN(o.cr)} Cr</td></tr>` : ''}</tbody></table>`;
};
function tradeApp() {
  if (!isOnline()) return '<div class="bcard" style="max-width:620px"><h4>Handel</h4><p>Handeln geht nur mit einem Mehrspieler-Server (Pausenmenü → Mehrspieler).</p></div>';
  const last = TRADE.last ? `<div class="msg" style="border-color:var(--amb);max-width:860px;margin-bottom:12px">${esc(TRADE.last)}</div>` : '';
  if (TRADE.open) {
    const ks = ITEM_IDS.filter(k => P.cargo[k] > 0 || TRADE.mine.items[k]);
    const space = cargoSpaceAfter(), ok = offerCovered();
    const btn = (k: string, n: number, label: string, on: boolean) => `<button class="mini" data-a="trSet" data-k="${k}:${n}" ${on ? '' : 'disabled'}>${label}</button>`;
    const rows = ks.map(k => {
      const n = TRADE.mine.items[k] || 0, have = P.cargo[k] || 0;
      return `<tr><td>${itemIcon(k, 20)}${ITEMS[k].n}<div class="sm">an Bord ${have}</div></td>
        <td class="trQ">${btn(k, 0, '0', n > 0)}${btn(k, n - 10, '−10', n > 0)}${btn(k, n - 1, '−1', n > 0)}<b class="${n > have ? 'bad' : ''}">${n}</b>${btn(k, n + 1, '+1', n < have)}${btn(k, n + 10, '+10', n < have)}${btn(k, have, 'Alles', n < have)}</td></tr>`;
    }).join('');
    const mine = `<div class="bcard"><h4>Dein Angebot</h4>
      ${ks.length ? `<table class="trT"><tbody>${rows}</tbody></table>` : '<p class="hint">Dein Frachtraum ist leer. Waren aus dem Stationslager holst du vorher im Stationsmenü (Lager) an Bord.</p>'}
      <div class="row" style="margin-top:12px;align-items:center"><span>Credits (du hast ${fmtN(P.credits)})</span><input id="trCr" type="number" min="0" max="${Math.floor(P.credits)}" step="10" value="${TRADE.mine.cr}" style="width:130px;text-align:right"></div>
      <div class="row"><span>Richtwert der Waren</span><b>${fmtN(tradeValue(TRADE.mine))} Cr</b></div>
      ${ok ? '' : '<p class="bad">Dein Angebot ist nicht mehr gedeckt (Frachtraum oder Credits geändert).</p>'}</div>`;
    const theirs = `<div class="bcard"><h4>Angebot von ${esc(TRADE.withName)}</h4>${offerList(TRADE.theirs)}
      <div class="row" style="margin-top:12px"><span>Richtwert der Waren</span><b>${fmtN(tradeValue(TRADE.theirs))} Cr</b></div>
      ${offerCount(TRADE.theirs) && space < 0 ? `<p class="hint">${-space} Einheiten passen nicht in deinen Frachtraum und kommen ins Lager dieser Station.</p>` : ''}</div>`;
    const st = (who: string, r: boolean) => `<div class="row"><span>${esc(who)}</span><b style="color:${r ? 'var(--grn)' : 'var(--mut)'}">${r ? '✔ bestätigt' : 'noch nicht bestätigt'}</b></div>`;
    return `${last}<div class="bgrid trade">${mine}${theirs}</div>
      <div class="bcard" style="margin-top:12px;max-width:860px"><h4>Abschluss</h4>
        ${st('Du', TRADE.readyMe)}${st(TRADE.withName, TRADE.readyThem)}
        <p class="hint">Der Handel gilt, sobald beide denselben Stand bestätigt haben. Jede Änderung hebt beide Bestätigungen auf. Schließen des Flottenbands bricht den Handel ab.</p>
        <div class="btnRow" style="justify-content:flex-start"><button class="${TRADE.readyMe ? '' : 'pri'}" data-a="trReady">${TRADE.readyMe ? 'Bestätigung zurücknehmen' : 'Handel bestätigen'}</button><button data-a="trCancel">Abbrechen</button></div></div>`;
  }
  const now = performance.now();
  const ask = TRADE.ask && now - TRADE.ask.at < 90000 ? `<div class="bcard" style="border-color:var(--amb)"><h4>Handelsanfrage</h4><p><b>${esc(TRADE.ask.name)}</b> möchte mit dir handeln.</p>
    <div class="btnRow" style="justify-content:flex-start"><button class="pri" data-a="trYes">Annehmen</button><button data-a="trNo">Ablehnen</button></div></div>` : '';
  const sent = TRADE.sent && now - TRADE.sent.at < 90000 ? `<div class="bcard"><h4>Anfrage gesendet</h4><p>Warte auf Antwort von <b>${esc(TRADE.sent.name)}</b> …</p>
    <div class="btnRow" style="justify-content:flex-start"><button data-a="trBack">Zurückziehen</button></div></div>` : '';
  const stn = myStation(), list = pilotsHere();
  const here = !stn ? '<p>Handeln geht nur in einer Station: Dockt beide an derselben Station an (oder lauft dort zu Fuß herum). Dann tauscht ihr Waren aus dem Frachtraum und Credits.</p>'
    : list.length ? list.map(r => `<div class="row" style="align-items:center"><span style="color:var(--grn)">${esc(r.name)}</span>${TRADE.ask?.id === r.id ? '<span class="amb">fragt dich an</span>' : `<button class="pri mini" data-a="trAsk" data-k="${r.id}" ${TRADE.sent?.id === r.id ? 'disabled' : ''}>Handel anbieten</button>`}</div>`).join('')
    : '<p class="hint">Gerade ist kein anderer Pilot in dieser Station. Zu Fuß kannst du auch direkt zu einem Piloten gehen und <kbd>T</kbd> drücken.</p>';
  return `${last}<div class="bgrid">${ask}${sent}<div class="bcard"><h4>Piloten in dieser Station</h4>${here}</div>
    <div class="bcard"><h4>So geht's</h4><p>1. Handel anbieten (hier oder zu Fuß mit <kbd>T</kbd> bei einem Piloten).<br>2. Beide legen Waren aus dem Frachtraum und Credits aufs Angebot.<br>3. Beide bestätigen. Erst dann wird getauscht.</p><p class="hint">Was nicht in den Frachtraum passt, kommt ins Lager der Station.</p></div></div>`;
}

// ---------- Ruf ----------
const EMBLEM: Record<RepId, string> = {
  rat: '<path d="M12 2 21 6v6c0 5-4 9-9 10C7 21 3 17 3 12V6z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v10M7.5 11h9" stroke="currentColor" stroke-width="1.8"/>',
  wacht: '<path d="M12 2 20 5v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 12l3 3 5-6" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  gilde: '<path d="M4 20 14 10M14 10l-2-2 4-5 5 5-5 4z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="6" cy="18" r="1.6"/>',
};
function repApp() {
  const cards = REP_IDS.map(id => {
    const f = REP[id], l = level(id), nx = nextRank(id), v = repOf(id);
    const pips = RANKS.map((r, i) => `<i class="${l >= i && l >= 0 ? 'f' : ''}" title="${r.n} ab ${r.at}"></i>`).join('');
    const now = l > 0 ? f.perk(l) : [];
    const next = nx && l >= 0 ? f.perk(l + 1) : [];
    return `<div class="bcard repC" style="--rc:${f.c}">
      <div style="display:flex;gap:12px;align-items:center"><svg viewBox="0 0 24 24" width="38" height="38" fill="currentColor" style="color:${f.c};flex:none">${EMBLEM[id]}</svg>
        <div><h4 style="color:${f.c};margin:0">${esc(f.n)}</h4><div class="bbig" style="font-size:22px">${esc(rankName(id).toUpperCase())}</div></div></div>
      <div class="hint" style="margin:8px 0">${esc(f.desc)}</div>
      <div class="row"><span>Ruf</span><b>${fmtN(Math.floor(v))}${nx ? ` / ${fmtN(nx.at)}` : ''}</b></div>
      ${meter(nx ? Math.max(0, nx.frac) * 100 : 100, 100, f.c)}
      <div class="lv" style="margin:6px 0 10px">${pips}</div>
      ${l < 0 ? `<p class="bad">Misstrauisch: Aufträge dieser Fraktion zahlen 15 % weniger${id === 'rat' ? ', Service kostet 15 % mehr' : ''}. Noch ${Math.ceil(-v)} Punkte bis „Neutral“.</p>` : ''}
      <div class="sm" style="color:var(--mut);letter-spacing:2px;font-size:11px">VORTEILE JETZT</div>
      ${now.length ? `<ul class="repL">${now.map(p => `<li>${esc(p)}</li>`).join('')}${l >= TRUST_LV ? '<li>Vertrauensaufträge an ihren Stationen</li>' : ''}</ul>` : '<p class="hint" style="margin:4px 0 8px">Noch keine. Ab „Bekannt“ geht es los.</p>'}
      ${nx ? `<div class="sm" style="color:var(--mut);letter-spacing:2px;font-size:11px">NÄCHSTER RANG: ${esc(nx.n.toUpperCase())} · NOCH ${fmtN(nx.need)}</div>
        ${next.length ? `<ul class="repL dim">${next.map(p => `<li>${esc(p)}</li>`).join('')}${l + 1 === TRUST_LV ? '<li>Vertrauensaufträge an ihren Stationen</li>' : ''}</ul>` : ''}` : '<p class="good" style="margin:4px 0 8px">Höchster Rang erreicht.</p>'}
      <div class="sm" style="color:var(--mut);letter-spacing:2px;font-size:11px">SO STEIGT DEIN RUF</div>
      <ul class="repL dim">${f.how.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
    </div>`;
  }).join('');
  return `<div class="bgrid rep">${cards}</div><p class="hint" style="margin-top:12px;max-width:900px">Ränge: ${RANKS.map(r => `${r.n} (${r.at})`).join(' · ')}. Abgebrochene Aufträge kosten Ruf bei der Fraktion, die sie vergeben hat.</p>`;
}

// ---------- Funk ----------
function funkApp() {
  const now = G.time;
  const chat = isOnline() ? `<div style="display:flex;gap:8px;margin-bottom:12px;max-width:820px"><input id="bandChat" maxlength="200" placeholder="Nachricht an alle Piloten" style="flex:1" autocomplete="off"><button class="pri" id="bandChatGo">Senden</button></div>` : '<p class="hint">Chat gibt es, sobald du mit einem Mehrspieler-Server verbunden bist (Pausenmenü → Mehrspieler). Im Flug öffnet <kbd>Enter</kbd> die Chat-Zeile.</p>';
  if (!radioLog.length) return chat + '<p class="hint">Noch keine Funkmeldungen.</p>';
  return chat + `<div style="max-width:820px">${[...radioLog].reverse().map(m => { const ago = Math.max(0, Math.round(now - m.t)); return `<div class="msg" style="border-color:${m.col}"><span class="tm">vor ${ago < 60 ? ago + ' s' : Math.round(ago / 60) + ' min'}</span><b style="color:${m.col}">${esc(m.who)}</b>${esc(m.text)}</div>`; }).join('')}</div>`;
}

radioHooks.added = () => bandRadioChanged();

repHooks.changed = () => { if (bandOpen() && (app === 'ruf' || app === 'start')) render(); };
missionHooks.completed = () => { if (bandOpen() && (app === 'auftraege' || app === 'ruf' || app === 'start')) render(); };
