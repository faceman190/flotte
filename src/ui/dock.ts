import { $, fmtN, esc } from '../core/util';
import { snd } from '../core/audio';
import { releaseAll, centerMouse } from '../core/input';
import { P, G, stats, cargoUsed, saveGame, emptyUp, settings } from '../game/state';
import { world, type Station } from '../game/world';
import { placePlayer, setShipModel } from '../game/player';
import { PAINTS, PAINT_N, PAINT_C, hasPaint, hasModel, type Paint } from '../models/gltfShips';
import { SECTOR, FACTION, findRoute } from '../data/galaxy';
import { ITEMS, ITEM_IDS, REFINE, type ItemId } from '../data/items';
import { UPG, MAXLV, upCost, upgFor, type UpgId } from '../data/upgrades';
import { SHIPS, SHIP_IDS, computeStats, type ShipId, type Up } from '../data/ships';
import { sectorOres } from '../data/ores';
import { PLANETS, planetBaseId } from '../data/planets';
import { unitPrice, basePriceHere, sellValue, sell, refineInfo, refine, offers, accept, deliver, abandon, MAX_CONTRACTS, sellsHere, buyPrice, buy } from '../game/economy';
import { itemIcon } from './icons';
import { shipsAt, board, buyShip, sellShip, sellPrice, stored, storedTotal, storeFromCargo, takeToCargo, shipPrice } from '../game/fleet';
import { REP, stationFaction, rankName, serviceFactor, repOf, level } from '../game/reputation';
import { missionOffers, acceptMission, abandonMission, MAX_MISSIONS, missionTypeName, minRankName } from '../game/missions';

type Tab = 'markt' | 'raffinerie' | 'auftraege' | 'missionen' | 'lager' | 'hangar' | 'werft' | 'werkstatt' | 'service' | 'info';
let tab: Tab = 'markt';
let note = '';
export const dockHooks = { openMap: () => {}, shipChanged: () => {}, enter: (_s: Station) => {}, leave: () => {} };

const CHARGE_COST = 40, PAINT_COST = 250;
// Servicepreise (Flottenrat-Rang gibt Rabatt, Misstrauen kostet Aufschlag)
const hpPrice = () => 2 * serviceFactor(), rocketPrice = () => Math.round(25 * serviceFactor()), chargePrice = () => Math.round(CHARGE_COST * serviceFactor());
const repairCost = () => Math.ceil(Math.max(0, stats().maxHull - P.hull) * hpPrice());
const ammoCost = () => Math.ceil(Math.max(0, stats().maxAmmo - P.ammo) / 4 * serviceFactor());
const rocketCost = () => Math.max(0, stats().maxRockets - P.rockets) * rocketPrice();
const chargeCost = () => Math.max(0, stats().maxCharges - P.charges) * chargePrice();
const st = () => G.dockedAt as Station;
const secId = () => world.def!.id;
const loc = () => ({ sector: secId(), station: st().id });

export function openDock(s: Station) {
  G.dockedAt = s;
  P.vx = P.vy = P.vz = 0;
  P.shield = stats().maxShield;
  G.heat = 0; G.overheat = false;
  const newHome = !world.surface && (P.home.sector !== secId() || P.home.station !== s.id);
  if (!world.surface) P.home = { sector: secId(), station: s.id };
  const due = P.contracts.filter(c => c.station === s.id && P.cargo[c.item] + stored(s.id, c.item) >= c.amount).length;
  note = `Angedockt an ${s.name}. Schild aufgeladen.${newHome ? ' Neuer Heimathafen gesetzt.' : ''}${due ? ` ${due} Auftrag kann abgeliefert werden!` : ''}`;
  tab = due ? 'auftraege' : cargoUsed() ? 'markt' : 'service';
  releaseAll();
  snd(520, 0.2, 'sine', 0.05, 300);
  $('hud').classList.add('hidden');
  if (settings.walk) dockHooks.enter(s);   // zu Fuß aussteigen (Modus 'walk')
  else showMenu();
  saveGame();
}
// Stationsmenü zeigen (vom Stand aus, per Tab-Taste oder direkt beim Andocken)
export function showMenu(t?: string, n?: string) {
  if (!G.dockedAt) return;
  if (t && tabs().includes(t as Tab)) tab = t as Tab;
  if (n) note = n;
  G.mode = 'dock';
  if (document.pointerLockElement) document.exitPointerLock();
  releaseAll();
  render();
  $('dock').classList.remove('hidden');
  document.body.classList.remove('playing');
}
// Menü schließen und weiterlaufen (nur zu Fuß)
export function closeMenu() {
  if (G.mode !== 'dock' || !G.inside) return;
  $('dock').classList.add('hidden');
  G.mode = 'walk';
  document.body.classList.add('playing');
  centerMouse();
}
export const dockTabs = (s: Station) => { const prev = G.dockedAt; G.dockedAt = s; const t = tabs(); G.dockedAt = prev; return t as string[]; };
export function undock() {
  const s = st();
  if (G.inside) dockHooks.leave();
  $('dock').classList.add('hidden');
  $('hud').classList.remove('hidden');
  document.body.classList.add('playing');
  G.mode = 'play';
  G.dockedAt = null;
  const r = stats().radius;
  placePlayer(s.launch.x - Math.sin(s.launch.yaw) * r * 2, s.launch.y, s.launch.z - Math.cos(s.launch.yaw) * r * 2, s.launch.yaw, 140);
  centerMouse();
  snd(300, 0.6, 'sawtooth', 0.05, 500);
  saveGame();
}

function doSell(k: ItemId, n: number) {
  const amt = Math.min(n, P.cargo[k]);
  const cr = sell(st().def, secId(), k, amt);
  if (cr) { note = `${amt}× ${ITEMS[k].n} verkauft: +${fmtN(cr)} Credits`; snd(900, 0.12, 'sine', 0.05, 300); }
}
function sellAll() {
  let cr = 0, n = 0;
  for (const k of ITEM_IDS) { if (P.cargo[k]) { n += P.cargo[k]; cr += sell(st().def, secId(), k, P.cargo[k]); } }
  if (n) { note = `Gesamte Fracht verkauft (${n} Einheiten): +${fmtN(cr)} Credits`; snd(900, 0.15, 'sine', 0.05, 400); }
}
function upgrade(k: UpgId) {
  const l = P.up[k], c = upCost(l, P.cls);
  if (l >= MAXLV || P.credits < c) return;
  const before = stats();
  P.credits -= c;
  P.up[k]++;
  const s = stats();
  if (k === 'hull') P.hull = Math.min(s.maxHull, P.hull + (s.maxHull - before.maxHull));
  if (k === 'shield') P.shield = s.maxShield;
  note = `${UPG[k].n} der ${P.shipName} auf Stufe ${P.up[k]} ausgebaut.`;
  snd(500, 0.25, 'triangle', 0.06, 500);
}
function repair() { const c = Math.min(repairCost(), P.credits); if (c <= 0) return; P.credits -= c; P.hull = Math.min(stats().maxHull, P.hull + c / hpPrice()); note = 'Hülle repariert.'; snd(400, 0.2, 'sine', 0.05, 200); }
function rearm() {
  const s = stats();
  const a = Math.min(ammoCost(), P.credits); P.credits -= a; P.ammo = Math.min(s.maxAmmo, P.ammo + Math.floor(a * 4 / serviceFactor()));
  const rp = rocketPrice(), rn = Math.min(s.maxRockets - P.rockets, Math.floor(P.credits / rp)); P.credits -= rn * rp; P.rockets += rn;
  const cp = chargePrice(), cn = Math.min(s.maxCharges - P.charges, Math.floor(P.credits / cp)); P.credits -= cn * cp; P.charges += cn;
  note = 'Munition nachgeladen.'; snd(400, 0.2, 'sine', 0.05, 200);
}

const dot = (k: ItemId) => itemIcon(k, 20);
const bar = (v: number, max: number, col: string) => `<span class="bar"><i style="width:${Math.min(100, Math.round(v / Math.max(1, max) * 100))}%;background:${col}"></i></span>`;
const hasYard = () => st().kind !== 'outpost';
function tabs(): Tab[] {
  return ['markt', ...(st().def.refinery ? ['raffinerie' as Tab] : []), 'auftraege', ...(stationFaction(st().id, secId()) ? ['missionen' as Tab] : []), 'lager', 'hangar', ...(hasYard() ? ['werft' as Tab] : []), 'werkstatt', 'service', 'info'];
}
const TAB_N: Record<Tab, string> = { markt: 'Markt', raffinerie: 'Raffinerie', auftraege: 'Aufträge', missionen: 'Missionen', lager: 'Lager', hangar: 'Hangar', werft: 'Werft', werkstatt: 'Werkstatt', service: 'Service', info: 'Station' };
const n1 = (v: number) => v.toFixed(1).replace('.', ',');
function shipSummary(cls: ShipId) {
  const s = computeStats(cls, emptyUp() as Up), c = SHIPS[cls];
  const extras = [s.laser ? `Laser ${n1(s.laserRate * s.beams)} E/s${s.beams > 1 ? ' (doppelt)' : ''}` : 'kein Laser', s.maxCharges ? `${s.maxCharges} Sprengladungen` : '', s.drones ? `${s.drones} Drohnen` : '', s.maxRockets ? `${s.maxRockets} Raketen` : ''].filter(Boolean);
  return `Fracht <b>${s.cargo}</b> · Hülle <b>${s.maxHull}</b> · Schild <b>${s.maxShield}</b> · Tempo <b>${s.max}</b> · Wendigkeit <b>${Math.round(c.turn * 100)} %</b> · Kanonen <b>${s.dmg}</b> Schaden<br>${extras.join(' · ')}`;
}

function render() {
  const s = st(), def = world.def!, S = stats(), fac = FACTION[def.faction], rf = stationFaction(s.id, def.id);
  if (!tabs().includes(tab)) tab = 'markt';
  const dueHere = P.contracts.filter(c => c.station === s.id).length, parked = shipsAt(s.id).length, inStore = storedTotal(s.id);
  let h = `<div class="top"><div><h2>${esc(s.name.toUpperCase())}</h2>
    <div class="hint">Sektor ${esc(def.name)} · <span style="color:${fac.c}">${fac.n}</span>${rf ? ` · <span style="color:${REP[rf].c}">${REP[rf].n}: ${rankName(rf)}</span>` : ''}${s.def.refinery ? ' · Raffinerie' : ''}${hasYard() ? ' · Werft' : ''}</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">${G.inside ? '<button class="pri" data-a="close">Zurück [Esc]</button>' : '<button data-a="walk">Station betreten</button>'}<button data-a="map">Galaxiekarte [M]</button><button class="${G.inside ? '' : 'pri'}" data-a="launch">Ablegen${G.inside ? '' : ' [E]'}</button></div></div>
    <div class="sum">${esc(note)}</div>
    <div class="stats"><span>Credits: <b class="amb">${fmtN(P.credits)}</b></span><span>Schiff: <b>${esc(P.shipName)}</b> <span class="hint">(${SHIPS[P.cls].role})</span></span><span>Fracht: <b>${cargoUsed()}/${S.cargo}</b> ${bar(cargoUsed(), S.cargo, cargoUsed() >= S.cargo ? 'var(--bad)' : 'var(--amb)')}</span><span>Hülle: <b>${Math.ceil(P.hull)}/${S.maxHull}</b> ${bar(P.hull, S.maxHull, P.hull < S.maxHull * 0.35 ? 'var(--bad)' : 'var(--grn)')}</span></div>
    <div class="tabs">${tabs().map(t => `<button data-a="tab" data-k="${t}" class="${tab === t ? 'on' : ''}">${TAB_N[t]}${t === 'auftraege' && dueHere ? ` (${dueHere})` : t === 'hangar' && parked ? ` (${parked})` : t === 'lager' && inStore ? ` (${inStore})` : ''}</button>`).join('')}</div>`;

  if (tab === 'markt') {
    let total = 0;
    const groups: [string, ItemId[]][] = [['ROHSTOFFE', ITEM_IDS.filter(k => ITEMS[k].cat === 'raw')], ['VEREDELT', ITEM_IDS.filter(k => ITEMS[k].cat === 'refined')], ['BERGUNG', ITEM_IDS.filter(k => ITEMS[k].cat === 'salvage')]];
    const room = S.cargo - cargoUsed();
    h += `<table><tr><th>Gut</th><th class="num">Fracht</th><th class="num">Ankauf</th><th class="num">Erlös</th><th class="num">Verkaufen</th><th class="num">Preis</th><th class="num">Kaufen</th></tr>`;
    for (const [gname, ids] of groups) {
      h += `<tr><td colspan="7" class="hint" style="padding-top:12px;letter-spacing:2px">${gname}</td></tr>`;
      for (const k of ids) {
        const pr = unitPrice(s.def, def.id, k), base = basePriceHere(s.def, def.id, k), n = P.cargo[k], val = n ? sellValue(s.def, def.id, k, n) : 0;
        total += val;
        const tr = pr > ITEMS[k].base * 1.08 ? ' <span class="good">▲</span>' : pr < ITEMS[k].base * 0.92 ? ' <span class="bad">▼</span>' : '';
        const sat = pr < base * 0.97 ? `<div class="hint bad">gesättigt (normal ${base} Cr)</div>` : '';
        const sells = sellsHere(s.def, def.id, k), bp = sells ? buyPrice(s.def, def.id, k) : 0, can = sells && room > 0 && P.credits >= bp;
        h += `<tr style="${n || sells ? '' : 'opacity:.55'}"><td>${dot(k)}${ITEMS[k].n}<div class="hint">${ITEMS[k].desc}</div></td>
          <td class="num">${n}</td><td class="num">${pr} Cr${tr}${sat}</td><td class="num amb">${n ? fmtN(val) : '—'}</td>
          <td class="num"><button data-a="sell1" data-k="${k}" ${n ? '' : 'disabled'}>1</button> <button data-a="sellk" data-k="${k}" ${n ? '' : 'disabled'}>Alle</button></td>
          <td class="num">${sells ? bp + ' Cr' : '<span class="hint">—</span>'}</td>
          <td class="num">${sells ? `<button data-a="buy1" data-k="${k}" ${can ? '' : 'disabled'}>1</button> <button data-a="buy10" data-k="${k}" ${can ? '' : 'disabled'}>10</button> <button data-a="buymax" data-k="${k}" ${can ? '' : 'disabled'}>Max</button>` : ''}</td></tr>`;
      }
    }
    h += `</table><div class="btnRow"><span class="hint" style="margin-right:auto;align-self:center;max-width:430px">Waren von weit her bringen mehr. Stationen verkaufen, was in ihrer Zone gefördert wird. Große Mengen bewegen den Preis; der Markt erholt sich nach einigen Minuten. Frei im Frachtraum: ${room}</span>
      <button class="pri" data-a="sellall" ${total ? '' : 'disabled'}>Alles verkaufen (+${fmtN(total)} Cr)</button></div>`;
  } else if (tab === 'raffinerie') {
    h += `<p style="margin-top:0">Die Raffinerie schmilzt je 2 Einheiten Erz oder Eis zu 1 Barren. Barren sind mehr wert als das Rohmaterial und sparen Frachtraum.</p>
      <table><tr><th>Rohstoff</th><th class="num">Fracht</th><th>→ Produkt</th><th class="num">Barren</th><th class="num">Gebühr</th><th class="num">Wertgewinn</th><th></th></tr>`;
    for (const k of Object.keys(REFINE) as ItemId[]) {
      const r = refineInfo(k)!, gain = r.bars ? basePriceHere(s.def, def.id, r.to) * r.bars - basePriceHere(s.def, def.id, k) * r.bars * r.ratio - r.cost : 0;
      h += `<tr style="${P.cargo[k] >= 2 ? '' : 'opacity:.55'}"><td>${dot(k)}${ITEMS[k].n}</td><td class="num">${P.cargo[k]}</td><td>${dot(r.to)}${ITEMS[r.to].n}</td>
        <td class="num">${r.bars}</td><td class="num">${r.bars ? r.cost + ' Cr' : '—'}</td><td class="num ${gain > 0 ? 'good' : ''}">${r.bars ? (gain > 0 ? '+' : '') + fmtN(gain) + ' Cr' : '—'}</td>
        <td class="num"><button data-a="refine" data-k="${k}" ${r.bars && P.credits >= r.fee ? '' : 'disabled'}>Raffinieren</button></td></tr>`;
    }
    h += `</table><p class="hint">Wertgewinn = Barrenwert minus Rohstoffwert minus Gebühr, zu den Normalpreisen dieser Station.</p>`;
  } else if (tab === 'auftraege') {
    const mine = P.contracts;
    h += `<h3 style="margin-top:0">DEINE AUFTRÄGE (${mine.length}/${MAX_CONTRACTS})</h3>`;
    if (!mine.length) h += `<p class="hint">Keine aktiven Aufträge.</p>`;
    else {
      h += `<table><tr><th>Lieferung</th><th>Ziel</th><th class="num">Fortschritt</th><th class="num">Lohn</th><th></th></tr>`;
      mine.forEach((c, i) => {
        const here = c.station === s.id, have = P.cargo[c.item] + (here ? stored(s.id, c.item) : 0);
        h += `<tr><td>${dot(c.item)}${c.amount}× ${ITEMS[c.item].n}</td><td>${esc(c.stName)}<div class="hint">${esc(SECTOR[c.sector].name)}</div></td>
          <td class="num ${have >= c.amount ? 'good' : ''}">${Math.min(have, c.amount)}/${c.amount}</td><td class="num amb">${fmtN(c.reward)} Cr</td>
          <td class="num">${here ? `<button class="pri" data-a="deliver" data-n="${i}" ${have >= c.amount ? '' : 'disabled'}>Abliefern</button>` : ''} <button data-a="abandon" data-n="${i}">Abbrechen</button></td></tr>`;
      });
      h += `</table>`;
    }
    h += `<h3>ANGEBOTE VON ${esc(s.name.toUpperCase())}</h3><table><tr><th>Lieferung</th><th>Wo zu finden</th><th class="num">Lohn</th><th></th></tr>`;
    const full = mine.length >= MAX_CONTRACTS;
    for (const o of offers(s.def, def.id)) {
      const it = ITEMS[o.item], src = it.cat === 'refined' ? 'Raffinerie' : it.cat === 'salvage' ? 'Ferrox-Wracks' : it.origin === 'core' ? 'Menschenraum' : it.origin === 'border' ? 'Grenzgebiet' : 'Ferrox-Gebiet';
      h += `<tr${o.trust ? ` style="background:linear-gradient(90deg,rgba(255,179,71,.12),transparent)"` : ''}><td>${dot(o.item)}${o.amount}× ${it.n}${o.trust && rf ? `<div class="hint" style="color:${REP[rf].c}">Vertrauensauftrag · ${REP[rf].n}</div>` : ''}</td><td class="hint">${src}</td><td class="num amb">${fmtN(o.reward)} Cr</td>
        <td class="num"><button data-a="accept" data-k="${o.slot}" ${full ? 'disabled' : ''}>Annehmen</button></td></tr>`;
    }
    h += `</table><p class="hint">Aufträge zahlen deutlich mehr als der Markt. Abliefern kannst du nur bei der Station, die den Auftrag vergeben hat; Waren aus dem Lager dieser Station zählen mit.${rf ? ` Erfüllte Aufträge steigern deinen Ruf ${rf === 'rat' ? 'beim' : 'bei der'} ${REP[rf].n}, abgebrochene kosten Ruf. Ab Rang „Vertraut“ gibt es hier einen Vertrauensauftrag.` : ''}</p>`;
  } else if (tab === 'missionen') {
    const mf = stationFaction(s.id, def.id)!, F = REP[mf], ms = P.missions || [];
    h += `<p style="margin-top:0"><b style="color:${F.c}">${F.n}</b> · dein Rang: <b>${rankName(mf)}</b>. ${esc(F.desc)} Missionen erfüllst du unterwegs; der Lohn kommt sofort, dazu viel Ruf.</p>`;
    h += `<h3>DEINE MISSIONEN (${ms.length}/${MAX_MISSIONS})</h3>`;
    if (!ms.length) h += `<p class="hint">Keine aktiven Missionen.</p>`;
    else {
      h += `<table><tr><th>Mission</th><th>Ziel</th><th class="num">Stand</th><th class="num">Lohn</th><th></th></tr>`;
      ms.forEach((m, i) => {
        h += `<tr><td><span style="color:${REP[m.fac].c}">${missionTypeName(m.type)}</span> · ${esc(m.title)}<div class="hint">${esc(REP[m.fac].n)} · ${esc(m.stName)}</div></td><td>${esc(SECTOR[m.tgt].name)}</td>
          <td class="num">${m.got}/${m.n}</td><td class="num amb">${fmtN(m.reward)} Cr<div class="hint">+${m.rep} Ruf</div></td>
          <td class="num"><button data-a="mdrop" data-n="${i}">Abbrechen</button></td></tr>`;
      });
      h += `</table>`;
    }
    h += `<h3>ANGEBOTE · ${esc(F.n.toUpperCase())}</h3><table><tr><th>Mission</th><th>Ziel</th><th class="num">Lohn</th><th></th></tr>`;
    const full = ms.length >= MAX_MISSIONS, lv = level(mf);
    for (const o of missionOffers(s.id, s.name, def.id)) {
      const locked = lv < o.minLv, tg = SECTOR[o.tgt], r = findRoute(def.id, o.tgt), j = r ? r.length - 1 : 0;
      h += `<tr style="${locked ? 'opacity:.5' : ''}"><td><span style="color:${F.c}">${missionTypeName(o.type)}</span>${o.minLv ? ` <span class="hint">· ab „${minRankName(o.minLv)}“</span>` : ''}<div>${esc(o.title)}</div></td>
        <td>${esc(tg.name)}<div class="hint">${o.tgt === def.id ? 'dieser Sektor' : `${j} ${j === 1 ? 'Sprung' : 'Sprünge'}`} · Gefahr ${tg.danger}/5</div></td>
        <td class="num amb">${fmtN(o.reward)} Cr<div class="hint">+${o.rep} Ruf</div></td>
        <td class="num">${locked ? `<span class="hint">Rang „${minRankName(o.minLv)}“ nötig</span>` : `<button class="pri" data-a="macc" data-k="${o.slot}" ${full ? 'disabled' : ''}>Annehmen</button>`}</td></tr>`;
    }
    h += `</table><p class="hint">Säuberung: Ferrox im Zielsektor abschießen. Vermessung: die drei Messpunkte anfliegen. Bergung: Kapseln am Wrackfeld einsammeln (Vorsicht, Hinterhalt). Bienenstock: das Ferrox-Mutterschiff zerstören. Abbrechen kostet Ruf.</p>`;
  } else if (tab === 'lager') {
    const any = ITEM_IDS.some(k => P.cargo[k] || stored(s.id, k));
    h += `<p style="margin-top:0">Jede Station hat ein eigenes Lager ohne Größenbeschränkung. Lagere Erz hier ein und hole es später mit einem Frachter ab, oder sammle für große Aufträge.</p>`;
    if (!any) h += `<p class="hint">Frachtraum und Lager sind leer.</p>`;
    else {
      h += `<table><tr><th>Gut</th><th class="num">Frachtraum</th><th class="num">Lager hier</th><th></th></tr>`;
      for (const k of ITEM_IDS) {
        const c = P.cargo[k], sv = stored(s.id, k);
        if (!c && !sv) continue;
        h += `<tr><td>${dot(k)}${ITEMS[k].n}</td><td class="num">${c}</td><td class="num">${sv}</td>
          <td class="num"><button data-a="store" data-k="${k}" ${c ? '' : 'disabled'}>Einlagern →</button> <button data-a="take" data-k="${k}" ${sv && cargoUsed() < S.cargo ? '' : 'disabled'}>← Laden</button></td></tr>`;
      }
      h += `</table>`;
    }
    h += `<div class="btnRow"><span class="hint" style="margin-right:auto;align-self:center">Frei im Frachtraum: ${S.cargo - cargoUsed()}</span><button data-a="storeall" ${cargoUsed() ? '' : 'disabled'}>Alles einlagern</button></div>`;
    const elsewhere = Object.entries(P.storage).filter(([id]) => id !== s.id).map(([id, m]) => ({ id, n: Object.values(m).reduce((a, b) => a + (b || 0), 0) })).filter(o => o.n > 0);
    if (elsewhere.length) h += `<h3>LAGER AN ANDEREN STATIONEN</h3><p style="margin:0">${elsewhere.map(o => { const sd = stationName(o.id); return `${esc(sd)}: ${o.n} E`; }).join(' · ')}</p>`;
  } else if (tab === 'hangar') {
    const here = shipsAt(s.id);
    h += `<table><tr><th>Schiff</th><th>Klasse</th><th class="num">Hülle</th><th class="num">Fracht</th><th></th></tr>
      <tr><td><b>${esc(P.shipName)}</b> <span class="good">● aktiv</span></td><td>${SHIPS[P.cls].role}</td><td class="num">${Math.ceil(P.hull)}/${S.maxHull}</td><td class="num">${cargoUsed()}/${S.cargo}</td><td></td></tr>`;
    for (const r of here) {
      const rs = computeStats(r.cls, r.up as Up), cu = ITEM_IDS.reduce((a, k) => a + r.cargo[k], 0);
      h += `<tr><td><b>${esc(r.name)}</b></td><td>${SHIPS[r.cls].role}</td><td class="num">${Math.ceil(r.hull)}/${rs.maxHull}</td><td class="num">${cu}/${rs.cargo}</td>
        <td class="num"><button class="pri" data-a="board" data-n="${r.uid}">Einsteigen</button> <button data-a="sellship" data-n="${r.uid}">Verkaufen (${fmtN(sellPrice(r))} Cr)</button></td></tr>`;
    }
    h += `</table>`;
    if (hasModel(SHIPS[P.cls].model)) {
      const cur = (P.paint || 'Orange') as Paint;
      h += `<h3>LACKIERUNG DER ${esc(P.shipName.toUpperCase())}</h3><div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">` +
        PAINTS.filter(p => hasPaint(SHIPS[P.cls].model, p)).map(p => `<button data-a="paint" data-k="${p}" class="${p === cur ? 'pri' : ''}" ${p === cur || P.credits < PAINT_COST ? 'disabled' : ''}><span class="dot" style="background:${PAINT_C[p]}"></span>${PAINT_N[p]}</button>`).join('') +
        `<span class="hint">${PAINT_COST} Cr pro Lackierung</span></div>`;
    }
    if (!here.length) h += `<p class="hint">Keine weiteren Schiffe an dieser Station.${hasYard() ? ' In der Werft kannst du neue kaufen.' : ' Neue Schiffe gibt es in den Werften großer Stationen.'}</p>`;
    const other = P.fleet.filter(r => r.loc.station !== s.id);
    if (other.length) h += `<h3>DEINE SCHIFFE ANDERSWO</h3><p style="margin:0">${other.map(r => `<b>${esc(r.name)}</b> <span class="hint">(${SHIPS[r.cls].role})</span> an ${esc(stationName(r.loc.station))}, ${esc(SECTOR[r.loc.sector].name)}`).join('<br>')}</p>`;
    h += `<p class="hint">Beim Umsteigen bleibt dein aktuelles Schiff samt Fracht hier geparkt.</p>`;
  } else if (tab === 'werft') {
    h += `<p style="margin-top:0">Neue Schiffe werden hier ausgeliefert und stehen danach in deinem Hangar.</p><table>`;
    for (const id of SHIP_IDS) {
      const c = SHIPS[id];
      if (!c.price) continue;
      h += `<tr><td style="width:62%"><b class="amb">${c.n}</b> <span class="hint">· ${c.role}</span><div class="hint" style="margin:3px 0">${c.desc}</div><div style="font-size:12px">${shipSummary(id)}</div></td>
        <td class="num amb">${shipPrice(id) < c.price ? `<s class="hint">${fmtN(c.price)}</s> ` : ''}${fmtN(shipPrice(id))} Cr</td><td class="num"><button class="pri" data-a="buy" data-k="${id}" ${P.credits >= shipPrice(id) ? '' : 'disabled'}>Kaufen</button></td></tr>`;
    }
    h += `</table><p class="hint">Ausbauten gelten pro Schiff. Verkaufte Schiffe bringen 60 % des Neupreises.</p>`;
  } else if (tab === 'werkstatt') {
    h += `<p style="margin-top:0">Ausbauten für die <b>${esc(P.shipName)}</b> (${SHIPS[P.cls].role}).</p>
      <table><tr><th>System</th><th>Stufe</th><th>Aktuell → Nächste</th><th class="num">Credits</th><th></th></tr>`;
    for (const k of upgFor(P.cls)) {
      const u = UPG[k], l = P.up[k], c = upCost(l, P.cls), mx = l >= MAXLV;
      const nowS = computeStats(P.cls, P.up as Up), next = computeStats(P.cls, { ...P.up, [k]: l + 1 } as Up);
      h += `<tr><td>${u.n}</td><td><span class="lv">${Array.from({ length: MAXLV }, (_, i) => `<i class="${i < l ? 'f' : ''}"></i>`).join('')}</span></td>
        <td class="hint">${u.d(nowS)}${mx ? '' : ' → <span class="good">' + u.d(next) + '</span>'}</td>
        <td class="num amb">${mx ? '—' : fmtN(c)}</td><td><button data-a="up" data-k="${k}" ${mx || P.credits < c ? 'disabled' : ''}>${mx ? 'Max' : 'Bauen'}</button></td></tr>`;
    }
    h += `</table>`;
  } else if (tab === 'service') {
    const rc = repairCost(), ac = ammoCost(), kc = rocketCost(), cc = chargeCost();
    h += `<table>
      <tr><td>Hülle reparieren</td><td class="hint">${Math.ceil(P.hull)}/${S.maxHull} HP · ${hpPrice().toFixed(2).replace('.', ',').replace(',00', '')} Cr pro HP</td><td class="num amb">${rc ? fmtN(rc) + ' Cr' : '—'}</td><td class="num"><button data-a="repair" ${rc && P.credits > 0 ? '' : 'disabled'}>Reparieren</button></td></tr>
      <tr><td>Munition</td><td class="hint">${P.ammo}/${S.maxAmmo} Schuss · 1 Cr für ${(4 / serviceFactor()).toFixed(1).replace('.', ',').replace(',0', '')} Schuss</td><td class="num amb">${ac ? fmtN(ac) + ' Cr' : '—'}</td><td></td></tr>
      ${S.maxRockets ? `<tr><td>Raketen</td><td class="hint">${P.rockets}/${S.maxRockets} · ${rocketPrice()} Cr pro Stück</td><td class="num amb">${kc ? fmtN(kc) + ' Cr' : '—'}</td><td></td></tr>` : ''}
      ${S.maxCharges ? `<tr><td>Sprengladungen</td><td class="hint">${P.charges}/${S.maxCharges} · ${chargePrice()} Cr pro Stück</td><td class="num amb">${cc ? fmtN(cc) + ' Cr' : '—'}</td><td></td></tr>` : ''}
      <tr><td></td><td></td><td></td><td class="num"><button data-a="rearm" ${(ac || kc || cc) && P.credits > 0 ? '' : 'disabled'}>Nachladen</button></td></tr>
    </table>
    ${serviceFactor() !== 1 ? `<p class="hint" style="color:${REP.rat.c}">${serviceFactor() < 1 ? `Flottenrat-Rabatt: −${Math.round((1 - serviceFactor()) * 100)} % auf alle Servicepreise.` : 'Der Flottenrat misstraut dir: 15 % Aufschlag auf alle Servicepreise.'}</p>` : ''}
    <div class="btnRow"><button class="pri" data-a="all" ${(rc || ac || kc || cc) && P.credits > 0 ? '' : 'disabled'}>Alles auffüllen (${fmtN(rc + ac + kc + cc)} Cr)</button></div>`;
  } else {
    const ores = sectorOres(def);
    h += `<p style="margin-top:0">${esc(def.desc)}</p>
      <div class="stats" style="margin-top:0"><span>Zone: <b style="color:${fac.c}">${fac.n}</b></span><span>Gefahr: <b>${def.danger}/5</b></span><span>Stationen im Sektor: <b>${def.stations.length}</b></span></div>
      <h3>ROHSTOFFE IM SEKTOR</h3><p style="margin:0">${ores.map(o => `${dot(o.k)}${ITEMS[o.k].n} ${Math.round(o.p * 100)} %`).join(' &nbsp; ') || '—'}</p>
      <h3>SPRUNGTORE</h3><p style="margin:0">${def.links.map(l => `<span style="color:${FACTION[SECTOR[l].faction].c}">${esc(SECTOR[l].name)}</span>`).join(' · ')}</p>
      <h3>HEIMATHAFEN</h3><p style="margin:0">Hier startest du nach einem Abschuss neu. Jede Station, an der du andockst, wird dein Heimathafen.</p>
      <h3>PILOT</h3><p style="margin:0">${esc(P.name)} · ${P.kills} Abschüsse · ${fmtN(P.mined)} E abgebaut · ${fmtN(P.earned)} Credits verdient · ${1 + P.fleet.length} Schiffe · ${P.visited.length}/18 Sektoren erkundet</p>`;
  }
  $('dockCard').innerHTML = h;
}
function stationName(id: string) {
  for (const s of Object.values(SECTOR)) { const f = s.stations.find(x => x.id === id); if (f) return f.name; }
  for (const [sec, pl] of Object.entries(PLANETS)) if (planetBaseId(sec) === id && pl.base) return `${pl.base} (${pl.name})`;
  return id;
}

$('dockCard').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!b || G.mode !== 'dock') return;
  const a = b.dataset.a, k = b.dataset.k as any, n = +(b.dataset.n || 0);
  if (a === 'launch') { undock(); return; }
  if (a === 'close') { closeMenu(); return; }
  if (a === 'walk') { $('dock').classList.add('hidden'); document.body.classList.add('playing'); dockHooks.enter(st()); centerMouse(); return; }
  if (a === 'buy1' || a === 'buy10' || a === 'buymax') {
    const r = buy(st().def, secId(), k, a === 'buy1' ? 1 : a === 'buy10' ? 10 : 9999);
    if (r.n) { note = `${r.n}× ${ITEMS[k as ItemId].n} gekauft: −${fmtN(r.cost)} Credits`; snd(700, 0.12, 'sine', 0.05, -200); }
    else note = 'Kauf nicht möglich: zu wenig Credits oder kein Platz im Frachtraum.';
  }
  if (a === 'map') { dockHooks.openMap(); return; }
  if (a === 'tab') tab = k;
  if (a === 'sell1') doSell(k, 1);
  if (a === 'sellk') doSell(k, 9999);
  if (a === 'sellall') sellAll();
  if (a === 'refine') { const bars = refine(k); if (bars) { note = `${bars}× ${ITEMS[REFINE[k as ItemId]!.to].n} hergestellt.`; snd(300, 0.4, 'sawtooth', 0.04, 300); } }
  if (a === 'accept') {
    const o = offers(st().def, secId()).find(x => x.slot === +k);
    if (o && accept(o)) { note = `Auftrag angenommen: ${o.amount}× ${ITEMS[o.item].n} für ${fmtN(o.reward)} Credits.`; snd(700, 0.15, 'sine', 0.05, 300); }
  }
  if (a === 'deliver') {
    const c = P.contracts[n];
    if (c) {
      // fehlende Menge aus dem Lager dieser Station nehmen
      const miss = c.amount - P.cargo[c.item], sid = st().id;
      if (miss > 0 && stored(sid, c.item) >= miss) { P.storage[sid][c.item] = stored(sid, c.item) - miss; P.cargo[c.item] += miss; }
      const rf = stationFaction(c.station, c.sector), r0 = rf ? repOf(rf) : 0;
      if (deliver(c)) { note = `Auftrag erfüllt! +${fmtN(c.reward)} Credits.${rf ? ` Ruf ${rf === 'rat' ? 'beim' : 'bei der'} ${REP[rf].n} +${Math.round(repOf(rf) - r0)}.` : ''}`; snd(800, 0.4, 'triangle', 0.06, 600); }
    }
  }
  if (a === 'macc') {
    const o = missionOffers(st().id, st().name, secId()).find(x => x.slot === +k);
    if (o && acceptMission(o)) { note = `Mission angenommen: ${o.title}. Sie steht rechts oben im HUD.`; snd(700, 0.15, 'sine', 0.05, 300); }
  }
  if (a === 'mdrop') {
    const m = (P.missions || [])[n];
    if (m && b.dataset.arm === '1') { const r0 = repOf(m.fac); abandonMission(m); note = `Mission abgebrochen. Ruf ${m.fac === 'rat' ? 'beim' : 'bei der'} ${REP[m.fac].n} ${Math.round(repOf(m.fac) - r0)}.`; }
    else if (m) { b.dataset.arm = '1'; b.textContent = 'Wirklich abbrechen?'; b.style.borderColor = '#ff6b5b'; return; }
  }
  if (a === 'abandon') { const c = P.contracts[n]; if (c) { const rf = stationFaction(c.station, c.sector), r0 = rf ? repOf(rf) : 0; abandon(c); note = `Auftrag abgebrochen.${rf ? ` Ruf ${rf === 'rat' ? 'beim' : 'bei der'} ${REP[rf].n} ${Math.round(repOf(rf) - r0)}.` : ''}`; } }
  if (a === 'store') { const m = storeFromCargo(st().id, k); if (m) note = `${m}× ${ITEMS[k as ItemId].n} eingelagert.`; }
  if (a === 'take') { const m = takeToCargo(st().id, k); note = m ? `${m}× ${ITEMS[k as ItemId].n} geladen.` : 'Kein Platz im Frachtraum.'; }
  if (a === 'storeall') { let m = 0; for (const it of ITEM_IDS) m += storeFromCargo(st().id, it); if (m) note = `${m} Einheiten eingelagert.`; }
  if (a === 'board') {
    const r = P.fleet.find(x => x.uid === n);
    if (r && board(r, loc())) { note = `Du bist auf die ${P.shipName} umgestiegen.`; snd(400, 0.4, 'sine', 0.05, 300); dockHooks.shipChanged(); }
  }
  if (a === 'sellship') {
    const r = P.fleet.find(x => x.uid === n);
    if (r && b.dataset.arm === '1') { const cr = sellShip(r); note = `${r.name} verkauft: +${fmtN(cr)} Credits. Ihre Fracht liegt im Lager.`; }
    else if (r) { b.dataset.arm = '1'; b.textContent = 'Wirklich verkaufen?'; b.style.borderColor = '#ff6b5b'; return; }
  }
  if (a === 'buy') {
    const r = buyShip(k as ShipId, loc());
    if (r) { note = `${r.name} gekauft! Sie steht im Hangar bereit.`; tab = 'hangar'; snd(600, 0.5, 'triangle', 0.06, 600); }
  }
  if (a === 'paint' && P.credits >= PAINT_COST && k !== P.paint) { P.credits -= PAINT_COST; P.paint = k; setShipModel(P.cls, k as Paint); note = `Die ${P.shipName} ist jetzt ${PAINT_N[k as Paint]} lackiert.`; snd(500, 0.3, 'triangle', 0.05, 200); }
  if (a === 'buy' || a === 'sellship' || a === 'paint') dockHooks.shipChanged();
  if (a === 'up') upgrade(k);
  if (a === 'repair') repair();
  if (a === 'rearm') rearm();
  if (a === 'all') { repair(); rearm(); note = 'Schiff repariert und aufmunitioniert.'; }
  render();
  saveGame();
});
export function refreshDock() { if (G.mode === 'dock') render(); }
