import { $, fmtN, esc } from '../core/util';
import { dockBark } from '../game/barks';
import { snd, sfx } from '../core/audio';
import { releaseAll, centerMouse } from '../core/input';
import { P, G, stats, cargoUsed, saveGame, emptyUp } from '../game/state';
import { world, type Station } from '../game/world';
import { placePlayer, setShipModel } from '../game/player';
import { PAINTS, PAINT_N, PAINT_C, hasPaint, hasModel, type Paint } from '../models/gltfShips';
import { SECTOR, FACTION, findRoute } from '../data/galaxy';
import { ITEMS, ITEM_IDS, REFINE, type ItemId } from '../data/items';
import { UPG, MAXLV, upCost, upgFor, type UpgId } from '../data/upgrades';
import { SHIPS, SHIP_IDS, computeStats, type ShipId, type Up } from '../data/ships';
import { sectorOres } from '../data/ores';
import { PLANETS, planetBaseId } from '../data/planets';
import { unitPrice, basePriceHere, sellValue, sell, refineInfo, refineStart, refineCollect, refineTime, offers, accept, deliver, abandon, MAX_CONTRACTS, sellsHere, buyPrice, buy } from '../game/economy';
import { itemIcon } from './icons';
import { shipsAt, board, buyShip, sellShip, sellPrice, stored, storedTotal, storeFromCargo, takeToCargo, shipPrice } from '../game/fleet';
import { REP, stationFaction, rankName, serviceFactor, repOf, level, refineFeeFactor } from '../game/reputation';
import { missionOffers, acceptMission, abandonMission, MAX_MISSIONS, missionTypeName, minRankName } from '../game/missions';
import { RARITY, KIND_N, GEAR_SLOTS, WEAR_SLOTS, gearDef, isShipKind, type GearKind, type GearSlot } from '../data/gear';
import { shipMods, gearStock, gearBuyPrice, gearSellPrice, buyGear, sellGear, toLocker, fromLocker, invCap, invCount, canAdd, canStore, LOCKER_SLOTS } from '../game/inventory';
import { gearIcon } from './icons';
import { statRows } from './invApp';
import { showItem, hideItem, itemHasModel } from './teilPreview';
import { trachtOf } from '../game/avatar';
import { radio } from './radio';
import { showShip, hideShip, showModel } from './shipPreview';
import { FZ, FZ_IDS, buildFahrzeug, fzLaden, normFz, type FzId } from '../models/rover';

// Stationsterminals (seit Alpha 1.25): Jeder Dienst hat seinen eigenen Ort auf der Station und sein eigenes Terminal.
// Es gibt keine Leiste mehr, über die man von einem Dienst zum nächsten springt: Wer etwas anderes will, läuft hin.
type Tab = 'markt' | 'ausruester' | 'raffinerie' | 'auftraege' | 'missionen' | 'lager' | 'hangar' | 'werft' | 'werkstatt' | 'service' | 'info';
let tab: Tab = 'markt';
let note = '';
let opening = false;   // nur das erste Bild nach dem Öffnen blendet ein (sonst flackert jeder Klick)
export const dockHooks = { leaveCity: () => {}, openMap: () => {}, shipChanged: () => {}, enter: (_s: Station) => {}, leave: () => {}, launch: (_done: () => void) => false, leaveBase: () => {} };
let launched = false;   // der Startablauf im Hangar ist durch: jetzt wirklich ablegen

// Auswahl in den Terminals: gilt, solange ein Terminal offen ist
const cart = { sell: {} as Partial<Record<ItemId, number>>, buy: {} as Partial<Record<ItemId, number>> };
let refSel: Partial<Record<ItemId, number>> = {};      // Raffinerie: gewählte Chargen je Rohstoff
let selShip: ShipId | null = null, selUp: UpgId | null = null, selFz: FzId | null = null;      // selFz: in der Werft ein Bodenfahrzeug gewählt (statt eines Schiffs)
const resetSel = () => { cart.sell = {}; cart.buy = {}; refSel = {}; selShip = null; selUp = null; selFz = null; shop.mode = 'kauf'; shop.cat = 'alle'; shop.sub = ''; shop.q = ''; shop.sel = ''; shop.probe = false; };

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

// Andocken: kein Menü mehr. Man steht im Hangar und läuft zu dem Dienst, den man braucht.
export function openDock(s: Station) {
  G.dockedAt = s;
  P.vx = P.vy = P.vz = 0;
  P.shield = stats().maxShield;
  G.heat = 0; G.overheat = false;
  if (!world.surface) P.home = { sector: secId(), station: s.id };
  releaseAll();
  dockBark('an');   // ohne den alten Sinus-Ping (seit Alpha 1.54): Den Anflug begleiten Landeaufnahme und Aufsetzen im Hangar
  $('hud').classList.add('hidden');
  dockHooks.enter(s);
  saveGame();
}
// Ein Terminal öffnen (vom Tresen oder Stand aus): genau ein Dienst
export function showMenu(t?: string, n?: string) {
  if (!G.dockedAt || !t || !tabs().includes(t as Tab)) return;
  tab = t as Tab; note = n || '';
  resetSel(); opening = true;
  G.mode = 'dock';
  if (document.pointerLockElement) document.exitPointerLock();
  releaseAll();
  render();
  $('dock').classList.remove('hidden');
  document.body.classList.remove('playing');
}
// Terminal schließen und weiterlaufen
export function closeMenu() {
  if (G.mode !== 'dock' || (!G.inside && !G.cityWalk)) return;
  hideShip(); hideItem();
  $('dock').classList.add('hidden');
  G.mode = G.cityWalk ? 'rover' : 'walk';
  document.body.classList.add('playing');
  centerMouse();
}
export const dockTabs = (s: Station) => { const prev = G.dockedAt; G.dockedAt = s; const t = tabs(); G.dockedAt = prev; return t as string[]; };
export function undock() {
  hideShip(); hideItem();
  if (G.cityWalk) dockHooks.leaveCity();                  // Stadt zu Fuß: direkt starten (das Schiff fliegt aus dem Hangar)
  if (G.baseWalk) { $('dock').classList.add('hidden'); dockHooks.leaveBase(); return; }   // Planetenbasis: zu Fuß hinaus
  const s = st();
  // erst der Startablauf im Hangar (abheben, durchs Tor), danach geht es hier weiter
  if (G.inside && !launched && dockHooks.launch(() => { launched = true; try { undock(); } finally { launched = false; } })) { $('dock').classList.add('hidden'); return; }
  if (G.inside) dockHooks.leave();
  $('dock').classList.add('hidden');
  $('hud').classList.remove('hidden');
  document.body.classList.add('playing');
  G.mode = 'play';
  G.dockedAt = null;
  const r = stats().radius;
  placePlayer(s.launch.x - Math.sin(s.launch.yaw) * r * 2, s.launch.y, s.launch.z - Math.cos(s.launch.yaw) * r * 2, s.launch.yaw, 140);
  centerMouse();
  // Startton nur ohne Startablauf im Hangar (der spielt die Aufnahme schon; bis Alpha 1.51 kam danach noch ein synthetischer Sägezahn-Ton)
  if (!launched) sfx('launch', 0.6, 1, () => snd(300, 0.6, 'sawtooth', 0.05, 500));
  dockBark('ab', 1600);
  saveGame();
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

const hasYard = () => st().kind !== 'outpost' && !st().def.no?.includes('werft');
function tabs(): Tab[] {
  const all: Tab[] = ['markt', 'ausruester', ...(st().def.refinery ? ['raffinerie' as Tab] : []), 'auftraege', ...(stationFaction(st().id, secId()) ? ['missionen' as Tab] : []), 'lager', 'hangar', ...(hasYard() ? ['werft' as Tab] : []), 'werkstatt', 'service', 'info'];
  const no = st().def.no;      // Dienste, die es an dieser Station nicht gibt (Eisenkrone: Ausrüster, Werft und Werkstatt bleiben auf der Bastion)
  return no ? all.filter(t => !no.includes(t)) : all;
}
const TAB_N: Record<Tab, string> = { ausruester: 'Ausrüster', markt: 'Markt', raffinerie: 'Raffinerie', auftraege: 'Aufträge', missionen: 'Missionen', lager: 'Lager', hangar: 'Hangar', werft: 'Werft', werkstatt: 'Werkstatt', service: 'Service', info: 'Auskunft' };
const TAB_T: Record<Tab, string> = {
  markt: 'Markt · Waren handeln', ausruester: 'Ausrüster · Ausrüstung und Module', raffinerie: 'Raffinerie · Erz einschmelzen', auftraege: 'Aufträge · Lieferungen',
  missionen: 'Missionen', lager: 'Lager · Fracht einlagern', hangar: 'Hangar · Deine Schiffe', werft: 'Werft · Schiffe kaufen', werkstatt: 'Werkstatt · Schiff ausbauen',
  service: 'Service · Reparatur und Munition', info: 'Auskunft · Station und Sektor',
};
const n1 = (v: number) => v.toFixed(1).replace('.', ',');
const clampN = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fmtT = (sec: number) => { const s = Math.max(0, Math.ceil(sec)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// ---------- Bausteine der Terminals ----------
const ico = (k: ItemId) => itemIcon(k, 22);
const kpi = (label: string, value: string) => `<div><p class="lb">${label}</p><b>${value}</b></div>`;
const line = (a: string, b: string, cls = '') => `<div class="ln"><span>${a}</span><b class="${cls}">${b}</b></div>`;
const stp = (grp: string, k: string, n: number, canUp: boolean, all = 'Alle') => `<span class="stp"><button class="st" data-a="dec" data-g="${grp}" data-k="${k}" ${n ? '' : 'disabled'} aria-label="weniger">−</button><b>${n}</b><button class="st" data-a="inc" data-g="${grp}" data-k="${k}" ${canUp ? '' : 'disabled'} aria-label="mehr">+</button><button class="sm" data-a="max" data-g="${grp}" data-k="${k}" ${canUp ? '' : 'disabled'}>${all}</button></span>`;
const pips = (l: number, sel: boolean) => `<span class="pips" aria-hidden="true">${Array.from({ length: MAXLV }, (_, i) => `<i class="${i < l ? 'f' : i === l && sel ? 'n' : ''}"></i>`).join('')}</span>`;
function plate(name: string) {
  const w = name.replace(/\(.*\)/, '').trim().split(/[\s-]+/).filter(Boolean);
  return (w.length > 1 ? w.map(x => x[0]).join('').slice(0, 3) : name.slice(0, 3)).toUpperCase();
}
interface View { k: string; cols: string; h: string }

// ---------- Markt: Auswahl sammeln, dann in einem Zug abrechnen ----------
function buyCost(k: ItemId, n: number) { let c = 0; for (let i = 0; i < n; i++) c += buyPrice(st().def, secId(), k, i); return c; }
function bill() {
  const s = st(), sec = secId();
  let sn = 0, sc = 0, bn = 0, bc = 0;
  for (const k of ITEM_IDS) {
    const a = Math.min(cart.sell[k] || 0, P.cargo[k]); cart.sell[k] = a;
    if (a) { sn += a; sc += sellValue(s.def, sec, k, a); }
    const b = cart.buy[k] || 0;
    if (b) { bn += b; bc += buyCost(k, b); }
  }
  return { sn, sc, bn, bc, cargo: cargoUsed() - sn + bn, cred: P.credits + sc - bc };
}
function vMarkt(): View {
  const s = st(), def = world.def!, S = stats(), bl = bill(), room = S.cargo - bl.cargo;
  const have = ITEM_IDS.filter(k => P.cargo[k] > 0), offer = ITEM_IDS.filter(k => sellsHere(s.def, def.id, k)), rest = ITEM_IDS.filter(k => !P.cargo[k]);
  const trend = (k: ItemId, pr: number) => pr > ITEMS[k].base * 1.08 ? ' <i class="up">▲</i>' : pr < ITEMS[k].base * 0.92 ? ' <i class="dn">▼</i>' : '';
  let h = `<section class="pn"><h3>Aus dem Frachtraum verkaufen</h3>`;
  if (!have.length) h += `<p class="hint">Der Frachtraum ist leer.</p>`;
  else {
    h += `<div class="rh gM"><span>Ware</span><span class="r">An Bord</span><span class="r">Ankauf</span><span>Menge</span><span class="r">Erlös</span></div>`;
    for (const k of have) {
      const pr = unitPrice(s.def, def.id, k), base = basePriceHere(s.def, def.id, k), n = cart.sell[k] || 0;
      h += `<div class="rw gM"><span class="nm">${ico(k)}<span><b>${ITEMS[k].n}</b>${pr < base * 0.97 ? `<small class="dn">gesättigt, sonst ${base} Cr</small>` : ''}</span></span><span class="r mo">${P.cargo[k]}</span><span class="r mo">${pr} Cr${trend(k, pr)}</span>${stp('sell', k, n, n < P.cargo[k])}<span class="r mo ${n ? 'hi' : 'dim'}">${n ? fmtN(sellValue(s.def, def.id, k, n)) + ' Cr' : '—'}</span></div>`;
    }
  }
  h += `<h3>Hier kaufen</h3>`;
  if (!offer.length) h += `<p class="hint">Diese Station verkauft keine Waren.</p>`;
  else {
    h += `<div class="rh gM"><span>Ware</span><span class="r">An Bord</span><span class="r">Preis</span><span>Menge</span><span class="r">Kosten</span></div>`;
    for (const k of offer) {
      const n = cart.buy[k] || 0, bp = buyPrice(s.def, def.id, k, n), can = room > 0 && bl.cred >= bp;
      h += `<div class="rw gM"><span class="nm">${ico(k)}<span><b>${ITEMS[k].n}</b></span></span><span class="r mo">${P.cargo[k]}</span><span class="r mo">${buyPrice(s.def, def.id, k)} Cr</span>${stp('buy', k, n, can, 'Max')}<span class="r mo ${n ? 'hi' : 'dim'}">${n ? fmtN(buyCost(k, n)) + ' Cr' : '—'}</span></div>`;
    }
  }
  if (rest.length) h += `<h3>Was die Station sonst ankauft</h3><div class="chips">${rest.map(k => { const pr = unitPrice(s.def, def.id, k); return `<span>${ico(k)}${ITEMS[k].n} <b class="mo">${pr} Cr</b>${trend(k, pr)}</span>`; }).join('')}</div>`;
  h += `<p class="hint end">Waren von weit her bringen mehr. Große Mengen bewegen den Preis; der Markt erholt sich nach einigen Minuten. Umschalt-Klick auf + und −: zehn auf einmal.</p></section>`;
  const over = bl.cargo > S.cargo, broke = bl.cred < 0, any = bl.sn + bl.bn > 0, net = bl.sc - bl.bc;
  h += `<aside class="pn"><p class="lb">Abrechnung</p><div>
    ${line(`Verkauf · ${bl.sn} Einheiten`, bl.sn ? `+${fmtN(bl.sc)} Cr` : '0 Cr', bl.sn ? 'up' : 'dim')}
    ${line(`Kauf · ${bl.bn} Einheiten`, bl.bn ? `−${fmtN(bl.bc)} Cr` : '0 Cr', bl.bn ? '' : 'dim')}
    ${line('Frachtraum danach', `${bl.cargo} / ${S.cargo}`, over ? 'dn' : '')}
    ${line('Credits danach', `${fmtN(bl.cred)} Cr`, broke ? 'dn' : '')}</div>
    ${over ? '<p class="dn">Dafür reicht der Frachtraum nicht.</p>' : broke ? '<p class="dn">Dafür reichen die Credits nicht.</p>' : ''}
    ${!s.def.refinery && def.faction === 'core' ? `<div class="box"><p class="lb acc">Hinweis vom Tresen</p><p>Erz bringt als Barren mehr. Diese Station schmilzt nicht ein: Das macht die Gildehütte Eisenkrone im Sektor Heimstatt${def.id === 'heimstatt' ? ', am Metallfeld' : ''}.</p></div>` : ''}
    <div class="act"><button data-a="selall" ${have.length ? '' : 'disabled'}>Ganze Fracht auswählen</button>
    <button class="pri big" data-a="trade" ${any && !over && !broke ? '' : 'disabled'}><span>Abschließen</span><span class="mo">${net > 0 ? '+' : net < 0 ? '−' : ''}${fmtN(Math.abs(net))} Cr</span></button></div></aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi(`Frachtraum · ${esc(P.shipName)}`, `${cargoUsed()} / ${S.cargo}`), cols: 'minmax(0,1fr) 390px', h };
}

// ---------- Raffinerie: Schmelzauftrag aufgeben, kurz warten, Barren abholen ----------
function vRaff(): View {
  const s = st(), def = world.def!, S = stats(), ores = Object.keys(REFINE) as ItemId[], now = Date.now();
  let h = `<section class="pn"><p class="lb">Schritt 1</p><h3>Was soll in den Ofen?</h3><div class="rh gR"><span>Rohstoff</span><span class="r">An Bord</span><span>In den Ofen</span></div>`;
  let fee = 0, bars = 0, oreN = 0, v0 = 0, v1 = 0, order = '';
  for (const k of ores) {
    const r = refineInfo(k)!, mx = Math.floor(P.cargo[k] / r.batch), b = clampN(refSel[k] || 0, 0, mx);
    refSel[k] = b;
    h += `<div class="rw gR ${mx ? '' : 'off'}"><span class="nm">${ico(k)}<span><b>${ITEMS[k].n}</b><small>wird zu ${ITEMS[r.to].n}</small></span></span><span class="r mo">${P.cargo[k]}</span>${stp('ref', k, b * r.batch, b < mx)}</div>`;
    if (!b) continue;
    const out = b * r.out, c = out * r.fee;
    fee += c; bars += out; oreN += b * r.batch;
    v0 += basePriceHere(s.def, def.id, k) * b * r.batch; v1 += basePriceHere(s.def, def.id, r.to) * out;
    order += `<div class="ol"><span class="nm">${ico(k)}<span><b>${b * r.batch} ${ITEMS[k].n}</b></span></span><i>→</i><span class="nm">${ico(r.to)}<span><b>${out} ${ITEMS[r.to].n}</b></span></span><span class="r mo">${fmtN(c)} Cr</span></div>`;
  }
  h += `<div class="act"><button data-a="refall">Alles auswählen</button><button data-a="clr" ${bars ? '' : 'disabled'}>Auswahl leeren</button></div></section>`;
  const mine = (P.refJobs || []).map((j, i) => ({ j, i })).filter(o => o.j.st === s.id);
  h += `<section class="pn"><p class="lb">Schritt 2</p><h3>Schmelzauftrag</h3>${order || '<p class="hint">Noch nichts ausgewählt.</p>'}
    <div class="tiles"><div><p class="lb">Gebühr</p><b class="mo">${fmtN(fee)} Cr</b></div><div><p class="lb">Dauer</p><b class="mo">${bars ? fmtT(refineTime(bars)) : '—'}</b></div><div><p class="lb">Warenwert</p><b class="mo">${bars ? `${fmtN(v0)} → ${fmtN(v1)}` : '—'}</b></div></div>
    <button class="pri big" data-a="refstart" ${bars && P.credits >= fee ? '' : 'disabled'}><span>Einschmelzen</span><span class="mo">${fmtN(fee)} Cr</span></button>
    ${bars && P.credits < fee ? '<p class="dn">Dafür reichen die Credits nicht.</p>' : ''}
    <h3>Im Ofen und abholbereit</h3>`;
  if (!mine.length) h += `<p class="hint">Kein Auftrag an dieser Station.</p>`;
  for (const { j, i } of mine) {
    const done = now >= j.end;
    h += `<div class="rw gJ"><span class="nm">${ico(j.to)}<span><b>${j.n} ${ITEMS[j.to].n}</b></span></span>${done
      ? `<span class="up">fertig</span><span class="r"><button data-a="refget" data-n="${i}" data-k="ship" ${cargoUsed() < S.cargo ? '' : 'disabled'}>Ins Schiff</button> <button data-a="refget" data-n="${i}" data-k="store">Ins Lager</button></span>`
      : `<span class="dim">im Ofen</span><span class="r mo" data-end="${j.end}">${fmtT((j.end - now) / 1000)}</span>`}</div>`;
  }
  h += `</section>`;
  const big = !!s.def.refineBonus, ff = refineFeeFactor(), other = (P.refJobs || []).filter(j => j.st !== s.id);
  h += `<aside class="pn deep"><p class="lb">Diese Hütte</p>
    ${line('Ausbeute', big ? '3 Rohstoff → 2 Barren' : '2 Rohstoff → 1 Barren')}
    <p class="lb">Gebühr je Stück</p><div>${ores.map(k => line(ITEMS[REFINE[k]!.to].n, `${refineInfo(k)!.fee} Cr`)).join('')}</div>
    ${line('Gildenrang', ff < 1 ? `−${Math.round((1 - ff) * 100)} % Gebühr` : 'kein Nachlass', ff < 1 ? 'up' : 'dim')}
    <p class="hint">${big ? 'Die Großraffinerie holt mehr aus dem Erz als jede andere Hütte, zur halben Gebühr.' : 'Barren sind mehr wert als das Rohmaterial und brauchen nur den halben Frachtraum.'} Der Ofen braucht ein paar Sekunden je Auftrag. Du kannst solange weiterlaufen: Die Barren warten hier auf dich.</p>
    ${other.length ? `<p class="lb">Aufträge anderswo</p>${other.map(j => `<p>${esc(stationName(j.st))}: ${j.n} ${ITEMS[j.to].n}${now >= j.end ? ', fertig' : ''}</p>`).join('')}` : ''}</aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi(`Frachtraum · ${esc(P.shipName)}`, `${cargoUsed()} / ${S.cargo}`), cols: 'minmax(0,1fr) minmax(0,1fr) 300px', h };
}

// ---------- Lager ----------
function vLager(): View {
  const s = st(), S = stats(), used = cargoUsed(), inC = ITEM_IDS.filter(k => P.cargo[k] > 0), inS = ITEM_IDS.filter(k => stored(s.id, k) > 0);
  const val = (k: ItemId, n: number) => fmtN(basePriceHere(s.def, secId(), k) * n);
  let h = `<section class="pn"><div class="pt"><h3>Frachtraum · ${esc(P.shipName)}</h3><span class="mo">${used} / ${S.cargo}</span></div><div class="br wide"><i style="width:${Math.min(100, Math.round(used / Math.max(1, S.cargo) * 100))}%"></i></div>`;
  if (!inC.length) h += `<p class="hint">Der Frachtraum ist leer.</p>`;
  else h += `<div class="rh gL"><span>Ware</span><span class="r">Menge</span><span class="r">Wert</span><span></span></div>` + inC.map(k => `<div class="rw gL"><span class="nm">${ico(k)}<span><b>${ITEMS[k].n}</b></span></span><span class="r mo hi">${P.cargo[k]}</span><span class="r mo dim">${val(k, P.cargo[k])} Cr</span><button data-a="store" data-k="${k}">Einlagern</button></div>`).join('');
  h += `<div class="act"><button class="pri" data-a="storeall" ${used ? '' : 'disabled'}>Alles einlagern</button></div></section>`;
  h += `<section class="pn"><div class="pt"><h3>Dein Lager · ${esc(s.name)}</h3><span class="mo">ohne Obergrenze</span></div><div class="br wide"><i class="mut" style="width:100%"></i></div>`;
  if (!inS.length) h += `<p class="hint">Das Lager ist leer.</p>`;
  else h += `<div class="rh gL"><span>Ware</span><span class="r">Menge</span><span class="r">Wert</span><span></span></div>` + inS.map(k => `<div class="rw gL"><span class="nm">${ico(k)}<span><b>${ITEMS[k].n}</b></span></span><span class="r mo hi">${stored(s.id, k)}</span><span class="r mo dim">${val(k, stored(s.id, k))} Cr</span><button data-a="take" data-k="${k}" ${used < S.cargo ? '' : 'disabled'}>Ins Schiff</button></div>`).join('');
  h += `<p class="hint end">Frei im Schiff: ${S.cargo - used} Einheiten. Was nicht passt, bleibt im Lager.</p></section>`;
  const elsewhere = Object.entries(P.storage).filter(([id]) => id !== s.id).map(([id, m]) => ({ id, items: ITEM_IDS.filter(k => (m[k] || 0) > 0).map(k => `${m[k]} ${ITEMS[k].n}`) })).filter(o => o.items.length);
  h += `<aside class="pn deep"><p class="lb">Lager an anderen Stationen</p>${elsewhere.length ? elsewhere.map(o => `<div class="box"><b>${esc(stationName(o.id))}</b><p>${o.items.join(' · ')}</p></div>`).join('') : '<p class="hint">Sonst liegt nirgends etwas von dir.</p>'}
    <p class="hint end">Jede Station hat ein eigenes Lager. Eingelagerte Ware liegt dort, wo du sie abgibst, und zählt bei Aufträgen dieser Station mit.</p></aside>`;
  return { k: kpi(`Frachtraum · ${esc(P.shipName)}`, `${used} / ${S.cargo}`) + kpi('Lager hier', `${storedTotal(s.id)} Einheiten`), cols: 'minmax(0,1fr) minmax(0,1fr) 320px', h };
}

// ---------- Werft ----------
let shipMax: { hull: number; shield: number; cargo: number; speed: number; turn: number; dmg: number } | null = null;
function vWerft(): View {
  const S = stats(), ids = SHIP_IDS.filter(id => SHIPS[id].price > 0), here = shipsAt(st().id);
  if (!shipMax) {
    shipMax = { hull: 1, shield: 1, cargo: 1, speed: 1, turn: 1, dmg: 1 };
    for (const id of SHIP_IDS) { const b = computeStats(id, emptyUp() as Up); shipMax.hull = Math.max(shipMax.hull, b.maxHull); shipMax.shield = Math.max(shipMax.shield, b.maxShield); shipMax.cargo = Math.max(shipMax.cargo, b.cargo); shipMax.speed = Math.max(shipMax.speed, b.max); shipMax.turn = Math.max(shipMax.turn, b.turn); shipMax.dmg = Math.max(shipMax.dmg, b.dmg); }
  }
  if (!selShip || !ids.includes(selShip)) selShip = ids.find(id => id !== P.cls && P.credits >= shipPrice(id)) || ids[0];
  const sel = selShip, c = SHIPS[sel], b = computeStats(sel, emptyUp() as Up), pr = shipPrice(sel), M = shipMax;
  let h = `<nav class="pn" aria-label="Schiffe"><p class="lb">Im Angebot</p>`;
  for (const id of ids) {
    const p = shipPrice(id), own = id === P.cls ? 'dein Schiff' : here.some(r => r.cls === id) ? 'im Hangar' : '', on = id === sel && !selFz;
    h += `<button class="row ${on ? 'sel' : ''}" data-a="ship" data-k="${id}" ${on ? 'aria-current="true"' : ''}><span><b>${SHIPS[id].n}</b><small>${SHIPS[id].role}${own ? ` · <i class="up">${own}</i>` : ''}</small></span><span class="mo ${P.credits < p ? 'dn' : 'hi'}">${fmtN(p)} Cr</span></button>`;
  }
  // Bodenfahrzeuge (seit 2026-11-24): fahren im Schiff mit, eins davon wird beim Landen ausgesetzt
  h += `<p class="lb">Bodenfahrzeuge</p>`;
  for (const k of FZ_IDS) {
    const f = FZ[k], have = k === 'dachs' || (P.fahrzeuge || []).includes(k), on = selFz === k;
    h += `<button class="row ${on ? 'sel' : ''}" data-a="fz" data-k="${k}" ${on ? 'aria-current="true"' : ''}><span><b>${f.kurz}</b><small>${k === 'dachs' ? 'Bergbaurover' : 'Erkundungsbuggy'}${have ? ` · <i class="up">${fzAktiv() === k ? 'wird ausgesetzt' : 'im Schiff'}</i>` : ''}</small></span><span class="mo ${have ? 'dim' : P.credits < f.price ? 'dn' : 'hi'}">${have ? 'gehört dir' : fmtN(f.price) + ' Cr'}</span></button>`;
  }
  h += `<p class="hint end">Rot: Dafür reichen deine Credits nicht.</p></nav>`;
  if (selFz) return vWerftFz(h, selFz);
  h += `<section class="pn deep flush"><div class="prev"><canvas id="tmShip" width="900" height="420"></canvas></div><div class="pd"><div class="pt"><h2>${c.n}</h2><p class="lb">${c.role}</p></div><p>${c.desc}</p><p class="hint">Ausbauten gelten pro Schiff. Ein neues Schiff steht nach dem Kauf im Hangar; dein jetziges behältst du.</p></div></section>`;
  const cmp = (label: string, v: number, cur: number, max: number, unit = '') => {
    const d = Math.round(v - cur);
    return `<div class="cp"><div><span>${label}</span><span class="mo"><b>${fmtN(Math.round(v))}${unit}</b>${d ? ` <i class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '+' : '−'}${fmtN(Math.abs(d))}</i>` : ''}</span></div><div class="br"><i class="${d < 0 ? 'dn' : ''}" style="width:${Math.round(Math.min(1, v / max) * 100)}%"></i></div></div>`;
  };
  const extras = [b.laser ? `Bergbaulaser ${n1(b.laserRate * b.beams)} E/s${b.beams > 1 ? ' (doppelt)' : ''}` : 'kein Bergbaulaser', b.maxCharges ? `${b.maxCharges} Sprengladungen` : '', b.drones ? `${b.drones} Bergbaudrohnen` : '', b.maxRockets ? `${b.maxRockets} Raketen` : 'keine Raketen'].filter(Boolean);
  h += `<aside class="pn"><p class="lb">Werte · Vergleich mit deiner ${esc(P.shipName)}</p>
    ${cmp('Hülle', b.maxHull, S.maxHull, M.hull)}${cmp('Schild', b.maxShield, S.maxShield, M.shield)}${cmp('Frachtraum', b.cargo, S.cargo, M.cargo)}${cmp('Tempo', b.max, S.max, M.speed, ' m/s')}${cmp('Wendigkeit', b.turn * 100, S.turn * 100, M.turn * 100, ' %')}${cmp('Kanonen', b.dmg, S.dmg, M.dmg, ' Schaden')}
    <div class="sep"></div><p class="lb">Ausrüstung</p><p>${extras.join(' · ')}</p>
    <div class="act">${line('Credits danach', `${fmtN(P.credits - pr)} Cr`, P.credits < pr ? 'dn' : '')}
    <button class="pri big" data-a="buy" data-k="${sel}" ${P.credits >= pr ? '' : 'disabled'}><span>Kaufen</span><span class="mo">${pr < c.price ? `<s>${fmtN(c.price)}</s> ` : ''}${fmtN(pr)} Cr</span></button></div></aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi('Deine Schiffe hier', String(1 + here.length)), cols: '300px minmax(0,1fr) 370px', h };
}

// Werft, Bodenfahrzeug gewählt: Ansicht, Beschreibung, Werte im Vergleich, Kaufen bzw. „beim Landen aussetzen“
const fzAktiv = (): FzId => { const k = normFz(P.fahrzeug); return k === 'wiesel' && !(P.fahrzeuge || []).includes('wiesel') ? 'dachs' : k; };
function vWerftFz(nav: string, k: FzId): View {
  const f = FZ[k], have = k === 'dachs' || (P.fahrzeuge || []).includes(k), aktiv = fzAktiv() === k, o = FZ[k === 'dachs' ? 'wiesel' : 'dachs'];
  let h = nav;
  h += `<section class="pn deep flush"><div class="prev"><canvas id="tmShip" width="900" height="420"></canvas></div><div class="pd"><div class="pt"><h2>${f.n}</h2><p class="lb">${k === 'dachs' ? 'Bergbaurover' : 'Erkundungsbuggy'}</p></div><p>${f.d}</p><p class="hint">Beide Fahrzeuge fahren im Schiff mit. Am gelandeten Schiff tauschst du mit [X]; hier legst du fest, welches beim Landen ausgesetzt wird.</p></div></section>`;
  const row = (label: string, v: number, ov: number, max: number, unit: string) => {
    const d = Math.round(v - ov);
    return `<div class="cp"><div><span>${label}</span><span class="mo"><b>${fmtN(Math.round(v))}${unit}</b>${d ? ` <i class="${d > 0 ? 'up' : 'dn'}">${d > 0 ? '+' : '−'}${fmtN(Math.abs(d))}</i>` : ''}</span></div><div class="br"><i class="${d < 0 ? 'dn' : ''}" style="width:${Math.round(Math.min(1, v / max) * 100)}%"></i></div></div>`;
  };
  h += `<aside class="pn"><p class="lb">Werte · Vergleich mit dem ${o.kurz}</p>
    ${row('Tempo', f.v * 3.6, o.v * 3.6, 170, ' km/h')}${row('Mit Umschalt', f.vB * 3.6, o.vB * 3.6, 170, ' km/h')}${row('Anzug', f.eng * 10, o.eng * 10, 140, ' %')}${row('Erzladung', f.cap, o.cap, 40, ' E')}
    <div class="sep"></div><p class="lb">Ausrüstung</p><p>${k === 'dachs' ? 'Schneckenbohrer · Erzmulde 40 E · Druckkabine · sechs Räder' : 'Sensormast 1,6 km ([R]) · Lichtleiste · zwei Sitze · Ersatzrad · kein Bohrer'}</p>
    <div class="act">${have ? line('Beim Landen', aktiv ? 'wird ausgesetzt' : 'bleibt im Schiff') : line('Credits danach', `${fmtN(P.credits - f.price)} Cr`, P.credits < f.price ? 'dn' : '')}
    ${have ? `<button class="pri big" data-a="usefz" data-k="${k}" ${aktiv ? 'disabled' : ''}><span>${aktiv ? 'Wird beim Landen ausgesetzt' : 'Beim Landen aussetzen'}</span><span class="mo"></span></button>`
      : `<button class="pri big" data-a="buyfz" data-k="${k}" ${P.credits >= f.price ? '' : 'disabled'}><span>Kaufen</span><span class="mo">${fmtN(f.price)} Cr</span></button>`}</div></aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi('Fahrzeuge', String(1 + (P.fahrzeuge || []).length)), cols: '300px minmax(0,1fr) 370px', h };
}

// ---------- Werkstatt: Ausbaustufen ----------
function vWerkstatt(): View {
  const ks = upgFor(P.cls);
  if (!selUp || !ks.includes(selUp)) selUp = ks.find(k => P.up[k] < MAXLV) || ks[0];
  const sel = selUp, u = UPG[sel], l = P.up[sel], mx = l >= MAXLV, c = upCost(l, P.cls);
  const nowS = computeStats(P.cls, P.up as Up, shipMods(P.shipGear)), next = computeStats(P.cls, { ...P.up, [sel]: l + 1 } as Up, shipMods(P.shipGear));
  let h = `<section class="pn"><div class="rh gU"><span>Kürzel</span><span>System</span><span>Ausbau</span><span>Stand</span><span class="r">Nächste Stufe</span></div>`;
  for (const k of ks) {
    const lv = P.up[k], full = lv >= MAXLV, cost = upCost(lv, P.cls);
    h += `<button class="row gU ${k === sel ? 'sel' : ''}" data-a="upsel" data-k="${k}" ${k === sel ? 'aria-current="true"' : ''}><span class="mo dim">${UPG[k].s}</span><span><b>${UPG[k].n}</b></span>${pips(lv, k === sel)}<span class="mo">Stufe ${lv} / ${MAXLV}</span><span class="r mo ${full ? 'dim' : P.credits < cost ? 'dn' : 'hi'}">${full ? 'voll ausgebaut' : fmtN(cost) + ' Cr'}</span></button>`;
  }
  h += `</section><aside class="pn"><p class="lb">Ausgewählt</p><h2>${u.n}</h2>
    <div class="box"><p class="lb">Jetzt · Stufe ${l}</p><p class="hi">${u.d(nowS)}</p></div>
    ${mx ? '<p class="hint">Dieses System ist voll ausgebaut.</p>' : `<div class="box"><p class="lb up">Danach · Stufe ${l + 1}</p><p class="up">${u.d(next)}</p></div>`}
    <div class="act">${line('Gilt nur für dieses Schiff', esc(P.shipName))}${mx ? '' : line('Credits danach', `${fmtN(P.credits - c)} Cr`, P.credits < c ? 'dn' : '')}
    <button class="pri big" data-a="up" data-k="${sel}" ${mx || P.credits < c ? 'disabled' : ''}><span>${mx ? 'Voll ausgebaut' : 'Ausbauen'}</span><span class="mo">${mx ? '' : fmtN(c) + ' Cr'}</span></button></div></aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi('Schiff', `${esc(P.shipName)}`), cols: 'minmax(0,1fr) 400px', h };
}

// ---------- Service: Reparatur und Munition ----------
function vService(): View {
  const S = stats(), rc = repairCost(), ac = ammoCost(), kc = rocketCost(), cc = chargeCost(), sf = serviceFactor();
  const row = (n: string, v: number, max: number, info: string, cost: number) => `<div class="rw gS"><span><b>${n}</b></span><span class="mo">${fmtN(Math.ceil(v))} / ${fmtN(max)}</span><div class="br"><i class="${v < max * 0.35 ? 'dn' : ''}" style="width:${Math.round(Math.min(1, v / Math.max(1, max)) * 100)}%"></i></div><span class="dim">${info}</span><span class="r mo ${cost ? 'hi' : 'dim'}">${cost ? fmtN(cost) + ' Cr' : 'voll'}</span></div>`;
  let h = `<section class="pn"><div class="rh gS"><span>Posten</span><span>Stand</span><span></span><span>Preis</span><span class="r">Auffüllen</span></div>
    ${row('Hülle', P.hull, S.maxHull, `${hpPrice().toFixed(2).replace('.', ',').replace(',00', '')} Cr pro HP`, rc)}
    ${row('Munition', P.ammo, S.maxAmmo, `1 Cr für ${(4 / sf).toFixed(1).replace('.', ',').replace(',0', '')} Schuss`, ac)}
    ${S.maxRockets ? row('Raketen', P.rockets, S.maxRockets, `${rocketPrice()} Cr pro Stück`, kc) : ''}
    ${S.maxCharges ? row('Sprengladungen', P.charges, S.maxCharges, `${chargePrice()} Cr pro Stück`, cc) : ''}
    <div class="act"><button data-a="repair" ${rc && P.credits > 0 ? '' : 'disabled'}>Nur reparieren</button><button data-a="rearm" ${(ac || kc || cc) && P.credits > 0 ? '' : 'disabled'}>Nur nachladen</button></div></section>`;
  const sum = rc + ac + kc + cc;
  h += `<aside class="pn"><p class="lb">Rechnung</p><div>${line('Reparatur', rc ? fmtN(rc) + ' Cr' : '—', rc ? '' : 'dim')}${line('Munition und Ladungen', ac + kc + cc ? fmtN(ac + kc + cc) + ' Cr' : '—', ac + kc + cc ? '' : 'dim')}${line('Credits danach', `${fmtN(Math.max(0, P.credits - sum))} Cr`)}</div>
    ${sf !== 1 ? `<p class="${sf < 1 ? 'up' : 'dn'}">${sf < 1 ? `Flottenrat-Rabatt: −${Math.round((1 - sf) * 100)} % auf alle Servicepreise.` : 'Der Flottenrat misstraut dir: 15 % Aufschlag auf alle Servicepreise.'}</p>` : ''}
    <p class="hint">Der Schild lädt sich beim Andocken von selbst auf.</p>
    <div class="act"><button class="pri big" data-a="all" ${sum && P.credits > 0 ? '' : 'disabled'}><span>Alles auffüllen</span><span class="mo">${fmtN(sum)} Cr</span></button></div></aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi('Schiff', esc(P.shipName)), cols: 'minmax(0,1fr) 380px', h };
}

// ---------- Ausrüster: Ausrüstung für den Piloten, Module fürs Schiff ----------
// Seit 2026-11-24 als Laden mit Kacheln (nach einer Vorlage des Spielers): oben Kaufen / Verkaufen / Spind, darunter Filter
// (Ziel, Kategorie, Unterkategorie, Suche), links das Raster der Gegenstände, rechts der gewählte Gegenstand mit Werten,
// drehbarem Modell (ui/teilPreview.ts) und dem Kaufknopf.
type ShopMode = 'kauf' | 'verkauf' | 'spind';
const SHOP_CATS: { k: string; n: string; kinds: GearKind[] }[] = [
  { k: 'kleidung', n: 'Kleidung und Rüstung', kinds: ['helm', 'weste', 'anzug', 'handschuh', 'stiefel', 'rucksack'] },
  { k: 'waffen', n: 'Waffen', kinds: ['waffe'] },
  { k: 'technik', n: 'Werkzeug und Module', kinds: ['werkzeug', 'modul'] },
  { k: 'verbrauch', n: 'Verbrauch und Fundstücke', kinds: ['verbrauch', 'fund'] },
  { k: 'schiff', n: 'Schiffsmodule', kinds: ['schiffswaffe', 'schiffsabwehr', 'schiffsantrieb', 'schiffssystem'] },
];
const KIND_ORDER = SHOP_CATS.flatMap(c => c.kinds);
const shop = { mode: 'kauf' as ShopMode, cat: 'alle', sub: '', q: '', sel: '', ziel: 'rucksack' as 'rucksack' | 'spind', probe: false };
interface ShopRow { key: string; id: string; n: number }
function shopRows(): ShopRow[] {
  const rows: ShopRow[] = shop.mode === 'kauf'
    ? gearStock(st().id, world.def!.danger).map(id => ({ key: id, id, n: 1 }))
      .sort((a, b) => KIND_ORDER.indexOf(gearDef(a.id)!.kind) - KIND_ORDER.indexOf(gearDef(b.id)!.kind) || gearDef(a.id)!.val - gearDef(b.id)!.val)
    : (shop.mode === 'verkauf' ? P.inv : P.locker).map((it, i) => ({ key: String(i), id: it.id, n: it.n }));
  const kinds = shop.sub ? [shop.sub as GearKind] : SHOP_CATS.find(c => c.k === shop.cat)?.kinds;
  return kinds ? rows.filter(r => kinds.includes(gearDef(r.id)!.kind)) : rows;
}
const shortCr = (v: number) => (v >= 10000 ? (v / 1000).toFixed(v >= 100000 ? 0 : 1).replace('.', ',') + 'k' : fmtN(v));
function vAusruester(): View {
  const rows = shopRows(), buy = shop.mode === 'kauf';
  if (!rows.some(r => r.key === shop.sel)) shop.sel = rows[0]?.key || '';
  const sel = rows.find(r => r.key === shop.sel) || null;
  const cat = SHOP_CATS.find(c => c.k === shop.cat);
  const opt = (v: string, n: string, cur: string) => `<option value="${v}"${v === cur ? ' selected' : ''}>${esc(n)}</option>`;
  // ----- Raster -----
  const card = (r: ShopRow) => {
    const d = gearDef(r.id)!, pr = buy ? gearBuyPrice(r.id) : gearSellPrice(r.id) * r.n;
    const ok = buy ? P.credits >= pr && (shop.ziel === 'spind' ? canStore(r.id) : canAdd(r.id)) : true;
    const quick = buy ? `<button class="shQ" data-a="gbuy" data-k="${r.id}" ${ok ? '' : 'disabled'}>Sofort kaufen</button>`
      : shop.mode === 'verkauf' ? `<button class="shQ" data-a="${r.n > 1 ? 'gsellall' : 'gsell'}" data-n="${r.key}">Verkaufen</button>`
      : `<button class="shQ" data-a="gtake" data-n="${r.key}">Nehmen</button>`;
    return `<div class="shCard${r.key === shop.sel ? ' on' : ''}" data-n="${esc(d.n.toLowerCase())}" style="--rc:${RARITY[d.rar].c}">
      <button class="shPic" data-a="shsel" data-k="${r.key}" aria-label="${esc(d.n)}">${gearIcon(r.id, 98)}${r.n > 1 ? `<em>${r.n}</em>` : ''}</button>
      <button class="shInfo" data-a="shsel" data-k="${r.key}"><b>${esc(d.n)}</b><small>${KIND_N[d.kind]} · ${RARITY[d.rar].n}</small>
        <span class="shPr${buy && P.credits < pr ? ' dn' : ''}">${shop.mode === 'spind' ? 'Im Spind' : `¤ ${shortCr(pr)}`}</span></button>
      ${quick}</div>`;
  };
  const empty = buy ? 'In dieser Auswahl führt der Ausrüster nichts.' : shop.mode === 'verkauf' ? 'Im Rucksack liegt nichts aus dieser Auswahl.' : 'Im Spind liegt nichts aus dieser Auswahl. Er ist von jedem Ausrüster aus erreichbar.';
  let h = `<section class="pn sh">
    <div class="shTop"><div class="shTabs">${(['kauf', 'verkauf', 'spind'] as ShopMode[]).map(m => `<button data-a="shmode" data-k="${m}" class="${m === shop.mode ? 'on' : ''}">${m === 'kauf' ? 'Kaufen' : m === 'verkauf' ? 'Verkaufen' : 'Spind'}</button>`).join('')}</div>
      <p class="hint">${buy ? 'Angelegt wird Gekauftes im Flottenband unter „Ausrüstung“ (Taste I).' : shop.mode === 'verkauf' ? 'Händler zahlen 45 % des Werts. Angelegtes musst du erst ablegen.' : 'Der Spind ist von jedem Ausrüster aus erreichbar.'}</p></div>
    <div class="shFilt">
      ${buy ? `<label><span class="lb">Ziel</span><select data-f="ziel">${opt('rucksack', `Rucksack · ${P.inv.length}/${invCap()}`, shop.ziel)}${opt('spind', `Spind · ${P.locker.length}/${LOCKER_SLOTS}`, shop.ziel)}</select></label>` : ''}
      <label><span class="lb">Kategorie</span><select data-f="cat">${opt('alle', 'Alle Kategorien', shop.cat)}${SHOP_CATS.map(c => opt(c.k, c.n, shop.cat)).join('')}</select></label>
      <label><span class="lb">Unterkategorie</span><select data-f="sub" ${cat && cat.kinds.length > 1 ? '' : 'disabled'}>${opt('', 'Alle', shop.sub)}${(cat?.kinds || []).map(k => opt(k, KIND_N[k], shop.sub)).join('')}</select></label>
      <label class="grow"><span class="lb">Suche</span><input data-f="q" type="search" placeholder="Name des Gegenstands" value="${esc(shop.q)}" autocomplete="off" spellcheck="false"></label>
    </div>
    <div class="shGrid">${rows.map(card).join('') || `<p class="hint shNone">${empty}</p>`}</div></section>`;
  // ----- gewählter Gegenstand -----
  h += '<aside class="pn shDet">';
  if (!sel) h += '<p class="hint">Wähle links einen Gegenstand.</p>';
  else {
    const id = sel.id, d = gearDef(id)!, pr = gearBuyPrice(id), sp = gearSellPrice(id);
    const slot = (GEAR_SLOTS as string[]).includes(d.kind) ? d.kind as GearSlot : null, cmp = slot && P.gear[slot] && P.gear[slot] !== id ? gearDef(P.gear[slot]!) : undefined;
    const model = itemHasModel(id), wear = !!d.teil && (WEAR_SLOTS as string[]).includes(d.kind);
    const room = shop.ziel === 'spind' ? canStore(id) : canAdd(id), have = invCount(id) + P.locker.reduce((a, it) => a + (it.id === id ? it.n : 0), 0);
    h += `<div class="shName" style="--rc:${RARITY[d.rar].c}"><h3>${esc(d.n)}</h3><p class="lb">${KIND_N[d.kind]} · ${RARITY[d.rar].n}</p></div>
      <div class="shFacts">${statRows(d, buy ? cmp : undefined)}${d.stack ? `<div class="row"><span>Stapel</span><b>bis ${d.stack}</b></div>` : ''}
        <div class="row"><span>Im Besitz</span><b>${have}</b></div></div>
      ${buy && cmp ? `<p class="hint">Verglichen mit dem angelegten: ${esc(cmp.n)}</p>` : ''}
      <p class="shDesc">${esc(d.desc)}</p>
      <div class="shView">${model ? '<canvas id="tmItem"></canvas>' : `<div class="shBig">${gearIcon(id, 190)}</div>`}
        ${model && wear ? `<button class="sm shProbe" data-a="shprobe">${shop.probe ? 'Nur das Teil' : 'Anprobieren'}</button>` : ''}</div>`;
    if (buy) h += `<button class="pri big" data-a="gbuy" data-k="${id}" ${P.credits >= pr && room ? '' : 'disabled'}><span>${P.credits < pr ? 'Zu wenig Credits' : !room ? (shop.ziel === 'spind' ? 'Spind voll' : 'Rucksack voll') : 'Kaufen'}</span><span class="mo">${fmtN(pr)} Cr</span></button>`;
    else if (shop.mode === 'verkauf') h += `<div class="shActs"><button data-a="gstore" data-n="${sel.key}">In den Spind</button>${sel.n > 1 ? `<button data-a="gsell" data-n="${sel.key}">Eins verkaufen · ${fmtN(sp)}</button>` : ''}</div>
      <button class="pri big" data-a="${sel.n > 1 ? 'gsellall' : 'gsell'}" data-n="${sel.key}"><span>${sel.n > 1 ? `Alle ${sel.n} verkaufen` : 'Verkaufen'}</span><span class="mo">+${fmtN(sp * sel.n)} Cr</span></button>`;
    else h += `<button class="pri big" data-a="gtake" data-n="${sel.key}"><span>In den Rucksack</span><span class="mo">${P.inv.length}/${invCap()}</span></button>`;
  }
  h += '</aside>';
  return { k: kpi('Guthaben', `${fmtN(P.credits)} Cr`) + kpi('Rucksack', `${P.inv.length} / ${invCap()}`) + kpi('Spind', `${P.locker.length} / ${LOCKER_SLOTS}`), cols: 'minmax(0,1fr) 400px', h };
}
// Suche: Kacheln ein- und ausblenden, ohne das Terminal neu aufzubauen (das Eingabefeld behält den Cursor)
function shopFilter() {
  const q = shop.q.trim().toLowerCase();
  document.querySelectorAll<HTMLElement>('#dockCard .shCard').forEach(c => { c.style.display = !q || c.dataset.n!.includes(q) ? '' : 'none'; });
}
// nach jedem Aufbau: Suche anwenden, Modell des gewählten Gegenstands zeigen
function shopAfter() {
  shopFilter();
  const sel = shopRows().find(r => r.key === shop.sel), d = sel && gearDef(sel.id);
  if (!sel || !d || !itemHasModel(sel.id)) { hideItem(); return; }
  const wear = !!d.teil && (WEAR_SLOTS as string[]).includes(d.kind);
  showItem(document.getElementById('tmItem') as HTMLCanvasElement | null, sel.id, shop.probe && wear ? trachtOf(P.figur, { ...P.gear, [d.kind]: sel.id }) : null);
}

// ---------- Aufträge ----------
function vAuftraege(): View {
  const s = st(), def = world.def!, rf = stationFaction(s.id, def.id), mine = P.contracts, full = mine.length >= MAX_CONTRACTS;
  let h = `<section class="pn"><h3>Angebote von ${esc(s.name)}</h3><div class="rh gA"><span>Lieferung</span><span>Wo zu finden</span><span class="r">Lohn</span><span></span></div>`;
  for (const o of offers(s.def, def.id)) {
    const it = ITEMS[o.item], src = it.cat === 'refined' ? 'Raffinerie' : it.cat === 'salvage' ? 'Ferrox-Wracks' : it.origin === 'core' ? 'Menschenraum' : it.origin === 'border' ? 'Grenzgebiet' : 'Ferrox-Gebiet';
    h += `<div class="rw gA ${o.trust ? 'trust' : ''}"><span class="nm">${ico(o.item)}<span><b>${o.amount} ${it.n}</b>${o.trust && rf ? `<small style="color:${REP[rf].c}">Vertrauensauftrag · ${REP[rf].n}</small>` : ''}</span></span><span class="dim">${src}</span><span class="r mo hi">${fmtN(o.reward)} Cr</span><button data-a="accept" data-k="${o.slot}" ${full ? 'disabled' : ''}>Annehmen</button></div>`;
  }
  h += `<p class="hint end">Aufträge zahlen deutlich mehr als der Markt. Abliefern kannst du nur bei der Station, die den Auftrag vergeben hat; Waren aus dem Lager dieser Station zählen mit.${rf ? ` Erfüllte Aufträge steigern deinen Ruf ${rf === 'rat' ? 'beim' : 'bei der'} ${REP[rf].n}, abgebrochene kosten Ruf.` : ''}</p></section>`;
  h += `<aside class="pn"><div class="pt"><h3>Deine Aufträge</h3><span class="mo">${mine.length} / ${MAX_CONTRACTS}</span></div>`;
  if (!mine.length) h += `<p class="hint">Keine aktiven Aufträge.</p>`;
  mine.forEach((c, i) => {
    const here = c.station === s.id, have = P.cargo[c.item] + (here ? stored(s.id, c.item) : 0);
    h += `<div class="box"><div class="pt"><span class="nm">${ico(c.item)}<span><b>${c.amount} ${ITEMS[c.item].n}</b><small>${esc(c.stName)} · ${esc(SECTOR[c.sector].name)}</small></span></span><span class="mo hi">${fmtN(c.reward)} Cr</span></div>
      <div class="pt"><span class="mo ${have >= c.amount ? 'up' : ''}">${Math.min(have, c.amount)} / ${c.amount}</span><span>${here ? `<button class="pri" data-a="deliver" data-n="${i}" ${have >= c.amount ? '' : 'disabled'}>Abliefern</button> ` : ''}<button data-a="abandon" data-n="${i}">Abbrechen</button></span></div></div>`;
  });
  h += `</aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi(`Frachtraum · ${esc(P.shipName)}`, `${cargoUsed()} / ${stats().cargo}`), cols: 'minmax(0,1fr) 440px', h };
}

// ---------- Missionen ----------
function vMissionen(): View {
  const s = st(), def = world.def!, mf = stationFaction(s.id, def.id)!, F = REP[mf], ms = P.missions || [], full = ms.length >= MAX_MISSIONS, lv = level(mf);
  let h = `<section class="pn"><h3>Angebote · ${esc(F.n)}</h3><div class="rh gA"><span>Mission</span><span>Ziel</span><span class="r">Lohn</span><span></span></div>`;
  for (const o of missionOffers(s.id, s.name, def.id)) {
    const locked = lv < o.minLv, tg = SECTOR[o.tgt], r = findRoute(def.id, o.tgt), j = r ? r.length - 1 : 0;
    h += `<div class="rw gA ${locked ? 'off' : ''}"><span class="nm"><span><b>${esc(o.title)}</b><small style="color:${F.c}">${missionTypeName(o.type)}${o.minLv ? ` · ab „${minRankName(o.minLv)}“` : ''}</small></span></span>
      <span><span>${esc(tg.name)}</span><small class="dim">${o.tgt === def.id ? 'dieser Sektor' : `${j} ${j === 1 ? 'Sprung' : 'Sprünge'}`} · Gefahr ${tg.danger}/5</small></span>
      <span class="r mo hi">${fmtN(o.reward)} Cr<small class="dim">+${o.rep} Ruf</small></span>
      ${locked ? `<span class="dim">Rang nötig</span>` : `<button class="pri" data-a="macc" data-k="${o.slot}" ${full ? 'disabled' : ''}>Annehmen</button>`}</div>`;
  }
  h += `<p class="hint end">Säuberung: Ferrox im Zielsektor abschießen. Vermessung: die drei Messpunkte anfliegen. Bergung: Kapseln am Wrackfeld einsammeln (Vorsicht, Hinterhalt). Bienenstock: das Ferrox-Mutterschiff zerstören.</p></section>`;
  h += `<aside class="pn"><div class="box"><p class="lb" style="color:${F.c}">${esc(F.n)} · dein Rang: ${rankName(mf)}</p><p>${esc(F.desc)}</p></div><div class="pt"><h3>Deine Missionen</h3><span class="mo">${ms.length} / ${MAX_MISSIONS}</span></div>`;
  if (!ms.length) h += `<p class="hint">Keine aktiven Missionen.</p>`;
  ms.forEach((m, i) => {
    h += `<div class="box"><div class="pt"><span class="nm"><span><b>${esc(m.title)}</b><small style="color:${REP[m.fac].c}">${missionTypeName(m.type)} · ${esc(m.stName)}</small></span></span><span class="mo hi">${fmtN(m.reward)} Cr</span></div>
      <div class="pt"><span>${esc(SECTOR[m.tgt].name)} · <span class="mo">${m.got} / ${m.n}</span></span><button data-a="mdrop" data-n="${i}">Abbrechen</button></div></div>`;
  });
  h += `<p class="hint end">Missionen erfüllst du unterwegs; der Lohn kommt sofort, dazu viel Ruf. Abbrechen kostet Ruf.</p></aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi('Rang', rankName(mf)), cols: 'minmax(0,1fr) 440px', h };
}

// ---------- Hangar: Schiffe wechseln, verkaufen, lackieren ----------
function vHangar(): View {
  const s = st(), S = stats(), here = shipsAt(s.id);
  let h = `<section class="pn"><h3>Deine Schiffe an dieser Station</h3><div class="rh gH"><span>Schiff</span><span class="r">Hülle</span><span class="r">Fracht</span><span></span></div>
    <div class="rw gH sel"><span class="nm"><span><b>${esc(P.shipName)}</b><small>${SHIPS[P.cls].role} · <i class="up">aktiv</i></small></span></span><span class="r mo">${Math.ceil(P.hull)} / ${S.maxHull}</span><span class="r mo">${cargoUsed()} / ${S.cargo}</span><span></span></div>`;
  for (const r of here) {
    const rs = computeStats(r.cls, r.up as Up, shipMods(r.gear)), cu = ITEM_IDS.reduce((a, k) => a + r.cargo[k], 0);
    h += `<div class="rw gH"><span class="nm"><span><b>${esc(r.name)}</b><small>${SHIPS[r.cls].role}</small></span></span><span class="r mo">${Math.ceil(r.hull)} / ${rs.maxHull}</span><span class="r mo">${cu} / ${rs.cargo}</span>
      <span class="r"><button class="pri" data-a="board" data-n="${r.uid}">Umsteigen</button> <button data-a="sellship" data-n="${r.uid}">Verkaufen · ${fmtN(sellPrice(r))} Cr</button></span></div>`;
  }
  if (!here.length) h += `<p class="hint">Keine weiteren Schiffe an dieser Station.${hasYard() ? ' In der Werft kannst du neue kaufen.' : ' Neue Schiffe gibt es in den Werften großer Stationen.'}</p>`;
  // Lackierungen gibt es nur für Modelle mit Farbvarianten (seit dem Entfernen des alten Gratis-Pakets keines): bei nur einer Farbe keine Auswahl
  if (hasModel(SHIPS[P.cls].model) && PAINTS.filter(p => hasPaint(SHIPS[P.cls].model, p)).length > 1) {
    const cur = (P.paint || 'Orange') as Paint;
    h += `<h3>Lackierung der ${esc(P.shipName)}</h3><div class="paints">` +
      PAINTS.filter(p => hasPaint(SHIPS[P.cls].model, p)).map(p => `<button data-a="paint" data-k="${p}" class="${p === cur ? 'on' : ''}" ${p === cur || P.credits < PAINT_COST ? 'disabled' : ''}><i style="background:${PAINT_C[p]}"></i>${PAINT_N[p]}</button>`).join('') +
      `</div><p class="hint">${PAINT_COST} Cr pro Lackierung.</p>`;
  }
  h += `<p class="hint end">Beim Umsteigen bleibt dein aktuelles Schiff samt Fracht hier geparkt. Verkaufte Schiffe bringen 60 % des Neupreises; ihre Fracht kommt ins Lager.</p></section>`;
  const other = P.fleet.filter(r => r.loc.station !== s.id);
  h += `<aside class="pn deep"><p class="lb">Deine Schiffe anderswo</p>${other.length ? other.map(r => `<div class="box"><b>${esc(r.name)}</b><p>${SHIPS[r.cls].role} · ${esc(stationName(r.loc.station))}, ${esc(SECTOR[r.loc.sector].name)}</p></div>`).join('') : '<p class="hint">Alle deine Schiffe stehen hier.</p>'}
    <p class="hint end">Ablegen: zum Schiff laufen und einsteigen.</p></aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi('Schiffe hier', String(1 + here.length)), cols: 'minmax(0,1fr) 340px', h };
}

// ---------- Auskunft ----------
function vInfo(): View {
  const s = st(), def = world.def!, fac = FACTION[def.faction], rf = stationFaction(s.id, def.id), ores = sectorOres(def);
  let h = `<section class="pn"><h3>Sektor ${esc(def.name)}</h3><p>${esc(def.desc)}</p>
    <div class="tiles"><div><p class="lb">Zone</p><b style="color:${fac.c}">${fac.n}</b></div><div><p class="lb">Gefahr</p><b class="mo">${def.danger} / 5</b></div><div><p class="lb">Stationen</p><b class="mo">${def.stations.length}</b></div></div>
    <h3>Rohstoffe im Sektor</h3><div class="chips">${ores.map(o => `<span>${ico(o.k)}${ITEMS[o.k].n} <b class="mo">${Math.round(o.p * 100)} %</b></span>`).join('') || '<span>keine</span>'}</div>
    <h3>Sprungtore</h3><div class="chips">${def.links.map(l => `<span style="color:${FACTION[SECTOR[l].faction].c}">${esc(SECTOR[l].name)}</span>`).join('')}</div>
    <h3>Dienste dieser Station</h3><div class="chips">${tabs().filter(t => t !== 'info').map(t => `<span>${TAB_N[t]}</span>`).join('')}</div>
    <p class="hint end">Jeder Dienst hat seinen eigenen Tresen oder sein eigenes Terminal. Die Schilder an den Türen zeigen, was wo ist.</p></section>`;
  h += `<aside class="pn"><p class="lb">Pilot</p><h2>${esc(P.name)}</h2><div>
    ${line('Abschüsse', fmtN(P.kills))}${line('Abgebaut', `${fmtN(P.mined)} E`)}${line('Verdient', `${fmtN(P.earned)} Cr`)}${line('Schiffe', String(1 + P.fleet.length))}${line('Sektoren erkundet', `${P.visited.length} / 18`)}
    ${rf ? line(REP[rf].n, rankName(rf)) : ''}</div>
    <div class="box"><p class="lb acc">Heimathafen</p><p>Hier startest du nach einem Abschuss neu. Jede Station, an der du andockst, wird dein Heimathafen.</p></div></aside>`;
  return { k: kpi('Credits', `${fmtN(P.credits)} Cr`) + kpi('Zone', fac.n), cols: 'minmax(0,1fr) 400px', h };
}

const VIEWS: Record<Tab, () => View> = { markt: vMarkt, raffinerie: vRaff, lager: vLager, werft: vWerft, werkstatt: vWerkstatt, service: vService, ausruester: vAusruester, auftraege: vAuftraege, missionen: vMissionen, hangar: vHangar, info: vInfo };

function render() {
  const s = st(), def = world.def!;
  if (!tabs().includes(tab)) tab = tabs()[0];
  const v = VIEWS[tab](), others = tabs().filter(t => t !== tab).map(t => TAB_N[t]);
  $('dockCard').innerHTML = `<div class="tm${opening ? ' in' : ''}">
    <header class="tmH"><div class="tmPlate">${esc(plate(s.name))}</div>
      <div class="tmT"><h1>${TAB_T[tab]}</h1><p class="lb">${esc(s.name)} · Sektor ${esc(def.name)} · ${FACTION[def.faction].n}</p></div>
      <div class="tmK">${v.k}</div><button class="tmX" data-a="close">Terminal verlassen · Esc</button></header>
    ${note ? `<div class="tmN">${esc(note)}</div>` : ''}
    <div class="tmB" style="grid-template-columns:${v.cols}">${v.h}</div>
    <footer class="tmF"><p class="lb acc">Zu Fuß erreichbar</p><p>${others.join(' · ')} · Galaxiekarte (M)</p></footer></div>`;
  opening = false;
  if (tab === 'werft' && selFz) { const k = selFz; showModel($('tmShip') as HTMLCanvasElement, 'fz:' + k, () => { fzLaden(k); const m = buildFahrzeug(k); return m ? m.g : null; }); }
  else if (tab === 'werft' && selShip) showShip($('tmShip') as HTMLCanvasElement, selShip); else hideShip();
  if (tab === 'ausruester') shopAfter(); else hideItem();
}
function stationName(id: string) {
  for (const s of Object.values(SECTOR)) { const f = s.stations.find(x => x.id === id); if (f) return f.name; }
  for (const [sec, pl] of Object.entries(PLANETS)) if (planetBaseId(sec) === id && pl.base) return `${pl.base} (${pl.name})`;
  return id;
}

// Schmelzaufträge: Restzeit im offenen Terminal weiterzählen; unterwegs meldet sich die Hütte per Funk, wenn ein Auftrag fertig ist
setInterval(() => {
  const jobs = P && P.refJobs;
  if (!jobs || !jobs.length || G.mode === 'menu') return;
  const now = Date.now();
  let fresh = false;
  for (const j of jobs) {
    if (j.told || now < j.end) continue;
    j.told = true; fresh = true;
    if (G.mode === 'play') radio('RAFFINERIE', `${stationName(j.st)}: ${j.n} ${ITEMS[j.to].n} sind fertig und warten am Raffinerie-Terminal.`);
  }
  if (G.mode !== 'dock' || tab !== 'raffinerie') return;
  if (fresh) { snd(760, 0.18, 'sine', 0.05, 200); render(); }
  else document.querySelectorAll<HTMLElement>('#dockCard [data-end]').forEach(el => { el.textContent = fmtT((+el.dataset.end! - now) / 1000); });
}, 500);

$('dockCard').addEventListener('click', e => {
  const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
  if (!b || b.disabled || G.mode !== 'dock') return;
  const a = b.dataset.a, k = b.dataset.k as any, n = +(b.dataset.n || 0);
  if (a === 'close') { closeMenu(); return; }
  // Mengen wählen (Markt, Raffinerie): Umschalt-Klick ändert um zehn
  if (a === 'inc' || a === 'dec' || a === 'max') {
    const g = b.dataset.g, d = (a === 'dec' ? -1 : 1) * (e.shiftKey ? 10 : 1);
    if (g === 'sell') cart.sell[k as ItemId] = a === 'max' ? P.cargo[k as ItemId] : clampN((cart.sell[k as ItemId] || 0) + d, 0, P.cargo[k as ItemId]);
    if (g === 'buy') {
      const want = a === 'max' ? 9999 : Math.max(0, (cart.buy[k as ItemId] || 0) + d);
      cart.buy[k as ItemId] = 0;
      const bl = bill(), room = stats().cargo - bl.cargo;
      let m = 0, cost = 0;
      while (m < want && m < room) { const p = buyPrice(st().def, secId(), k, m); if (cost + p > bl.cred) break; cost += p; m++; }
      cart.buy[k as ItemId] = m;
    }
    if (g === 'ref') { const r = refineInfo(k)!, mx = Math.floor(P.cargo[k as ItemId] / r.batch); refSel[k as ItemId] = a === 'max' ? mx : clampN((refSel[k as ItemId] || 0) + d, 0, mx); }
    snd(a === 'dec' ? 420 : 560, 0.04, 'sine', 0.03);
  }
  if (a === 'selall') for (const it of ITEM_IDS) cart.sell[it] = P.cargo[it];
  if (a === 'refall') for (const it of Object.keys(REFINE) as ItemId[]) refSel[it] = Math.floor(P.cargo[it] / refineInfo(it)!.batch);
  if (a === 'clr') { cart.sell = {}; cart.buy = {}; refSel = {}; }
  if (a === 'trade') {
    const bl = bill();
    if (bl.sn + bl.bn > 0 && bl.cargo <= stats().cargo && bl.cred >= 0) {
      let cr = 0, sn = 0, cost = 0, bn = 0;
      for (const it of ITEM_IDS) { const m = cart.sell[it] || 0; if (m) { cr += sell(st().def, secId(), it, m); sn += m; } }
      for (const it of ITEM_IDS) { const m = cart.buy[it] || 0; if (m) { const r = buy(st().def, secId(), it, m); cost += r.cost; bn += r.n; } }
      note = [sn ? `${sn} Einheiten verkauft: +${fmtN(cr)} Credits.` : '', bn ? `${bn} Einheiten gekauft: −${fmtN(cost)} Credits.` : ''].filter(Boolean).join(' ');
      cart.sell = {}; cart.buy = {};
      sfx('ui_confirm', 0.5, 1, () => snd(900, 0.15, 'sine', 0.05, 400));
    }
  }
  if (a === 'refstart') {
    const r = refineStart(st().id, refSel);
    if (r) { note = `Schmelzauftrag läuft: ${r.bars} Barren, fertig in ${fmtT(r.secs)} min. Gebühr ${fmtN(r.fee)} Credits.`; refSel = {}; snd(300, 0.4, 'sawtooth', 0.04, 300); }
  }
  if (a === 'refget') {
    const j = (P.refJobs || [])[n], nm = j ? ITEMS[j.to].n : '', m = refineCollect(n, k === 'store');
    note = m ? `${m} ${nm} ${k === 'store' ? 'ins Lager gelegt' : 'ins Schiff geladen'}.` : 'Kein Platz im Frachtraum.';
    if (m) sfx('ui_confirm', 0.5, 1, () => snd(700, 0.12, 'sine', 0.05, 300));
  }
  if (a === 'ship') { selShip = k as ShipId; selFz = null; }
  if (a === 'fz') selFz = normFz(k);
  if (a === 'buyfz' && k === 'wiesel' && !(P.fahrzeuge || []).includes(k) && P.credits >= FZ.wiesel.price) {
    P.credits -= FZ.wiesel.price; (P.fahrzeuge ||= []).push(k); P.fahrzeug = k;
    note = `${FZ.wiesel.n} gekauft. Er fährt ab jetzt im Schiff mit und wird beim nächsten Landen ausgesetzt; am Schiff tauschst du mit [X].`; snd(600, 0.5, 'triangle', 0.06, 600);
  }
  if (a === 'usefz') { P.fahrzeug = normFz(k); note = `Beim Landen wird der ${FZ[normFz(k)].kurz} ausgesetzt.`; snd(500, 0.2, 'triangle', 0.04, 200); }
  if (a === 'upsel') selUp = k as UpgId;
  if (a === 'shmode') { shop.mode = k; shop.sel = ''; shop.probe = false; snd(700, 0.04, 'sine', 0.025, 200); }
  if (a === 'shsel') { shop.sel = k; snd(800, 0.05, 'sine', 0.03, 200); }
  if (a === 'shprobe') shop.probe = !shop.probe;
  if (a === 'gbuy') { const pr = gearBuyPrice(k), er = buyGear(k, shop.ziel); note = er || `${gearDef(k)!.n} gekauft: −${fmtN(pr)} Credits. ${shop.ziel === 'spind' ? 'Liegt im Spind.' : 'Liegt im Rucksack: anlegen im Flottenband unter „Ausrüstung“ (Taste I).'}`; if (!er) sfx('ui_confirm', 0.5, 1, () => snd(700, 0.12, 'sine', 0.05, -200)); }
  if (a === 'gsell' || a === 'gsellall') { const nm = gearDef(P.inv[n]?.id || '')?.n || '', cr = sellGear(n, a === 'gsell' ? 1 : 9999); if (cr) { note = `${nm} verkauft: +${fmtN(cr)} Credits.`; snd(600, 0.12, 'sine', 0.05, 200); } }
  if (a === 'gstore') { const er = toLocker(n); note = er || 'In den Spind gelegt.'; }
  if (a === 'gtake') { const er = fromLocker(n); note = er || 'Aus dem Spind genommen.'; }
  if (a === 'accept') {
    const o = offers(st().def, secId()).find(x => x.slot === +k);
    if (o && accept(o)) { note = `Auftrag angenommen: ${o.amount} ${ITEMS[o.item].n} für ${fmtN(o.reward)} Credits.`; sfx('ui_confirm', 0.5, 1, () => snd(700, 0.15, 'sine', 0.05, 300)); }
  }
  if (a === 'deliver') {
    const c = P.contracts[n];
    if (c) {
      // fehlende Menge aus dem Lager dieser Station nehmen
      const miss = c.amount - P.cargo[c.item], sid = st().id;
      if (miss > 0 && stored(sid, c.item) >= miss) { P.storage[sid][c.item] = stored(sid, c.item) - miss; P.cargo[c.item] += miss; }
      const rf = stationFaction(c.station, c.sector), r0 = rf ? repOf(rf) : 0;
      if (deliver(c)) { sfx('success', 0.6); note = `Auftrag erfüllt! +${fmtN(c.reward)} Credits.${rf ? ` Ruf ${rf === 'rat' ? 'beim' : 'bei der'} ${REP[rf].n} +${Math.round(repOf(rf) - r0)}.` : ''}`; snd(800, 0.4, 'triangle', 0.06, 600); }
    }
  }
  if (a === 'macc') {
    const o = missionOffers(st().id, st().name, secId()).find(x => x.slot === +k);
    if (o && acceptMission(o)) { note = `Mission angenommen: ${o.title}. Sie steht rechts oben im HUD.`; sfx('ui_confirm', 0.5, 1, () => snd(700, 0.15, 'sine', 0.05, 300)); }
  }
  if (a === 'mdrop') {
    const m = (P.missions || [])[n];
    if (m && b.dataset.arm === '1') { const r0 = repOf(m.fac); abandonMission(m); note = `Mission abgebrochen. Ruf ${m.fac === 'rat' ? 'beim' : 'bei der'} ${REP[m.fac].n} ${Math.round(repOf(m.fac) - r0)}.`; }
    else if (m) { b.dataset.arm = '1'; b.textContent = 'Wirklich abbrechen?'; b.classList.add('warn'); return; }
  }
  if (a === 'abandon') {
    const c = P.contracts[n];
    if (c && b.dataset.arm === '1') { const rf = stationFaction(c.station, c.sector), r0 = rf ? repOf(rf) : 0; abandon(c); note = `Auftrag abgebrochen.${rf ? ` Ruf ${rf === 'rat' ? 'beim' : 'bei der'} ${REP[rf].n} ${Math.round(repOf(rf) - r0)}.` : ''}`; }
    else if (c) { b.dataset.arm = '1'; b.textContent = 'Wirklich abbrechen?'; b.classList.add('warn'); return; }
  }
  if (a === 'store') { const m = storeFromCargo(st().id, k); if (m) note = `${m} ${ITEMS[k as ItemId].n} eingelagert.`; }
  if (a === 'take') { const m = takeToCargo(st().id, k); note = m ? `${m} ${ITEMS[k as ItemId].n} geladen.` : 'Kein Platz im Frachtraum.'; }
  if (a === 'storeall') { let m = 0; for (const it of ITEM_IDS) m += storeFromCargo(st().id, it); if (m) note = `${m} Einheiten eingelagert.`; }
  if (a === 'board') {
    const r = P.fleet.find(x => x.uid === n);
    if (r && board(r, loc())) { note = `Du bist auf die ${P.shipName} umgestiegen.`; snd(400, 0.4, 'sine', 0.05, 300); dockHooks.shipChanged(); }
  }
  if (a === 'sellship') {
    const r = P.fleet.find(x => x.uid === n);
    if (r && b.dataset.arm === '1') { const cr = sellShip(r); note = `${r.name} verkauft: +${fmtN(cr)} Credits. Ihre Fracht liegt im Lager.`; }
    else if (r) { b.dataset.arm = '1'; b.textContent = 'Wirklich verkaufen?'; b.classList.add('warn'); return; }
  }
  if (a === 'buy') {
    const r = buyShip(k as ShipId, loc());
    if (r) { note = `${r.name} gekauft. Sie steht im Hangar bereit: Dort kannst du umsteigen.`; snd(600, 0.5, 'triangle', 0.06, 600); }
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
// Ausrüster: Auswahlfelder (Ziel, Kategorie, Unterkategorie) und Suche
$('dockCard').addEventListener('change', e => {
  const el = e.target as HTMLSelectElement, f = el.dataset?.f;
  if (!f || G.mode !== 'dock' || tab !== 'ausruester' || el.tagName !== 'SELECT') return;
  if (f === 'ziel') shop.ziel = el.value as 'rucksack' | 'spind';
  if (f === 'cat') { shop.cat = el.value; shop.sub = ''; }
  if (f === 'sub') shop.sub = el.value;
  snd(700, 0.04, 'sine', 0.025, 200);
  render();
});
$('dockCard').addEventListener('input', e => {
  const el = e.target as HTMLInputElement;
  if (el.dataset?.f !== 'q' || tab !== 'ausruester') return;
  shop.q = el.value; shopFilter();
});
export function refreshDock() { if (G.mode === 'dock') render(); }
