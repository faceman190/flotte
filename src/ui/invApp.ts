import { esc, fmtN } from '../core/util';
import { snd, sfx } from '../core/audio';
import { P } from '../game/state';
import { GEAR_SLOTS, SLOT_N, KIND_N, RARITY, STAT_N, STAT_IDS, HANDEL_MAX, gearDef, type GearSlot, type GearDef, type StatId } from '../data/gear';
import { invCap, gearStat, equip, unequip, useItem, dropAt, gearSellPrice } from '../game/inventory';
import { gearIcon } from './icons';

// =====================================================================================
// App „Ausrüstung“ im Flottenband: links, was der Pilot trägt, in der Mitte der Rucksack, rechts der gewählte Gegenstand.
// =====================================================================================
let sel: { w: 'i' | 'g'; k: string } | null = null, msg = '', dropArm = -1;

const sgn = (v: number) => (v > 0 ? '+' : '') + v;
const statText = (k: StatId, v: number) => `${k === 'schutz' || k === 'schaden' ? v : sgn(v)}${STAT_N[k].unit}`;
// Werte eines Gegenstands; cmp = das Angelegte auf demselben Platz (zeigt den Unterschied)
export function statRows(d: GearDef, cmp?: GearDef) {
  const keys = STAT_IDS.filter(k => d.st?.[k] || cmp?.st?.[k]);
  return keys.map(k => {
    const v = d.st?.[k] || 0, diff = cmp ? v - (cmp.st?.[k] || 0) : 0;
    return `<div class="row"><span>${STAT_N[k].n}</span><b>${statText(k, v)}${cmp && diff ? ` <span class="${diff > 0 ? 'good' : 'bad'}">(${sgn(diff)})</span>` : ''}</b></div>`;
  }).join('');
}
export const statLine = (d: GearDef) => STAT_IDS.filter(k => d.st?.[k]).map(k => `${STAT_N[k].n} ${statText(k, d.st![k]!)}`).join(' · ');

export function invApp(): string {
  const cap = invCap();
  if (sel?.w === 'i' && !P.inv[+sel.k]) sel = null;
  if (sel?.w === 'g' && !P.gear[sel.k as GearSlot]) sel = null;
  // ----- angelegt -----
  const slots = GEAR_SLOTS.map(s => {
    const id = P.gear[s], d = gearDef(id || '');
    return `<button class="islot${d ? '' : ' empty'}${sel?.w === 'g' && sel.k === s ? ' on' : ''}" data-a="inv:g" data-k="${s}" ${d ? `style="--rc:${RARITY[d.rar].c}"` : 'disabled'}>
      ${d ? gearIcon(id!, 34) : gearIcon(s, 34, true)}<span><i>${SLOT_N[s]}</i><b>${d ? esc(d.n) : 'leer'}</b></span></button>`;
  }).join('');
  const totals = STAT_IDS.map(k => {
    const v = gearStat(k);
    return `<div class="row" title="${STAT_N[k].hint}"><span>${STAT_N[k].n}</span><b class="${v > 0 ? '' : v < 0 ? 'bad' : 'dim'}">${k === 'plaetze' ? invCap() : statText(k, v)}${k === 'handel' && v >= HANDEL_MAX ? ' (Höchstwert)' : ''}</b></div>`;
  }).join('');
  // ----- Rucksack -----
  let cells = '';
  for (let i = 0; i < Math.max(cap, P.inv.length); i++) {
    const it = P.inv[i], d = it && gearDef(it.id);
    cells += d ? `<button class="icell${sel?.w === 'i' && +sel.k === i ? ' on' : ''}" data-a="inv:i" data-k="${i}" style="--rc:${RARITY[d.rar].c}" title="${esc(d.n)}">${gearIcon(it.id, 36)}${it.n > 1 ? `<em>${it.n}</em>` : ''}</button>`
      : '<span class="icell empty"></span>';
  }
  // ----- Auswahl -----
  let info = '<p class="hint">Wähle einen Gegenstand im Rucksack oder an deiner Ausrüstung.</p>';
  if (sel) {
    const inInv = sel.w === 'i', it = inInv ? P.inv[+sel.k] : null, id = inInv ? it!.id : P.gear[sel.k as GearSlot]!, d = gearDef(id)!;
    const wear = d.kind !== 'verbrauch' && d.kind !== 'fund';
    // Vergleich mit dem, was auf dem passenden Platz liegt (bei Modulen: mit Modul 1, wenn beide Plätze belegt sind)
    const cmpSlot: GearSlot | null = !inInv || !wear ? null : d.kind === 'modul' ? (P.gear.modul1 && P.gear.modul2 ? 'modul1' : null) : d.kind as GearSlot;
    const cmp = cmpSlot ? gearDef(P.gear[cmpSlot] || '') : undefined;
    info = `<div class="ihead" style="--rc:${RARITY[d.rar].c}">${gearIcon(id, 54)}<div><div class="iname">${esc(d.n)}</div><div class="isub">${KIND_N[d.kind]} · ${RARITY[d.rar].n}${it && it.n > 1 ? ` · ${it.n} Stück` : ''}</div></div></div>
      <p style="margin:10px 0">${esc(d.desc)}</p>${statRows(d, cmp)}
      ${cmp ? `<div class="hint" style="margin-top:4px">Verglichen mit: ${esc(cmp.n)}</div>` : ''}
      ${d.st?.schutz || d.st?.schaden ? '<div class="hint" style="margin-top:6px">Schutz und Schaden zählen in Kämpfen zu Fuß. Die kommen mit den Dungeons.</div>' : ''}
      <div class="row" style="margin-top:10px"><span>Verkaufswert</span><b class="amb">${fmtN(gearSellPrice(id))} Cr</b></div>
      <div class="btnRow" style="justify-content:flex-start;margin-top:12px">
        ${inInv && wear ? '<button class="pri" data-a="inv:equip">Anlegen</button>' : ''}
        ${!inInv ? '<button class="pri" data-a="inv:unequip">Ablegen</button>' : ''}
        ${inInv && d.use ? '<button class="pri" data-a="inv:use">Benutzen</button>' : ''}
        ${inInv ? `<button data-a="inv:drop" ${dropArm === +sel.k ? 'style="border-color:#ff6b5b"' : ''}>${dropArm === +sel.k ? 'Wirklich wegwerfen?' : 'Wegwerfen'}</button>` : ''}
      </div>`;
  }
  return `<div class="invwrap">
    <div class="bcard"><h4>Ausrüstung</h4><div class="islots">${slots}</div><h4 style="margin-top:16px">Werte</h4>${totals}</div>
    <div class="bcard"><h4>Rucksack · ${P.inv.length}/${cap}</h4><div class="igrid">${cells}</div>
      <p class="hint" style="margin-top:12px">Kaufen, verkaufen und einlagern kannst du beim Ausrüster jeder Station. Fundstücke lassen manche Ferrox beim Abschuss zurück.</p></div>
    <div class="bcard"><h4>Gegenstand</h4>${info}${msg ? `<p class="bad" style="margin-top:10px">${esc(msg)}</p>` : ''}</div>
  </div>`;
}

// Klick in der App; Rückgabe true = behandelt
export function invAct(a: string, k: string): boolean {
  if (!a.startsWith('inv:')) return false;
  const op = a.slice(4);
  msg = '';
  if (op !== 'drop') dropArm = -1;
  if (op === 'i' || op === 'g') { sel = { w: op, k }; snd(800, 0.05, 'sine', 0.03, 200); return true; }
  if (!sel) return true;
  if (op === 'equip' && sel.w === 'i') {
    const id = P.inv[+sel.k]?.id, d = gearDef(id || '');
    msg = equip(+sel.k);
    if (!msg && d) {
      // Auswahl folgt dem Gegenstand an den Körper
      const s = GEAR_SLOTS.find(x => P.gear[x] === id);
      sel = s ? { w: 'g', k: s } : null;
      sfx('ui_confirm', 0.5, 1, () => snd(700, 0.12, 'sine', 0.05, 200));
    }
  }
  if (op === 'unequip' && sel.w === 'g') { msg = unequip(sel.k as GearSlot); if (!msg) { sel = { w: 'i', k: String(P.inv.length - 1) }; snd(520, 0.1, 'sine', 0.04, -150); } }
  if (op === 'use' && sel.w === 'i') { msg = useItem(+sel.k); if (!msg) snd(900, 0.25, 'triangle', 0.05, 400); }
  if (op === 'drop' && sel.w === 'i') {
    if (dropArm === +sel.k) { dropAt(+sel.k); dropArm = -1; sel = null; snd(300, 0.15, 'sawtooth', 0.03, -200); }
    else dropArm = +sel.k;
  }
  return true;
}
