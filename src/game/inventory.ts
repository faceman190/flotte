import { P, stats, cargoUsed } from './state';
import type { ShipMods } from '../data/ships';
import { hashStr } from '../core/util';
import { GEAR_IDS, GEAR_SLOTS, SHIP_SLOTS, HANDEL_MAX, gearDef, slotKind, shipSlotKind, isShipKind, type GearSlot, type ShipSlot, type StatId } from '../data/gear';
import { serviceFactor } from './reputation';

// =====================================================================================
// Persönliches Inventar des Piloten: Rucksack (Plätze), angelegte Ausrüstung, Spind auf den Stationen,
// Kaufen und Verkaufen beim Ausrüster. Die Gegenstände stehen in data/gear.ts.
// Gespeichert in P.inv (Rucksack), P.gear (angelegt) und P.locker (Spind, von jeder Station aus erreichbar).
// =====================================================================================
export interface InvItem { id: string; n: number }
export const BASE_SLOTS = 12, LOCKER_SLOTS = 40;
export const invHooks = { changed: () => {} };

// Summe eines Wertes über alles Angelegte
export function gearStat(k: StatId): number {
  let v = 0;
  for (const s of GEAR_SLOTS) { const d = gearDef(P.gear?.[s] || ''); if (d?.st?.[k]) v += d.st[k]!; }
  return k === 'handel' ? Math.min(HANDEL_MAX, v) : v;
}
// Zuschläge der Module eines Schiffs als Anteil (für computeStats)
const MOD_KEY: Partial<Record<StatId, keyof ShipMods>> = { s_dmg: 'dmg', s_rate: 'rate', s_hull: 'hull', s_shield: 'shield', s_speed: 'speed', s_turn: 'turn', s_cargo: 'cargo', s_laser: 'laser', s_scan: 'scan' };
export function shipMods(gear?: Partial<Record<ShipSlot, string>>): ShipMods {
  const m: ShipMods = {};
  for (const s of SHIP_SLOTS) {
    const d = gearDef(gear?.[s] || '');
    if (d?.st) for (const [k, v] of Object.entries(d.st)) { const mk = MOD_KEY[k as StatId]; if (mk) m[mk] = (m[mk] || 0) + (v as number) / 100; }
  }
  return m;
}
export const shipStat = (k: StatId) => SHIP_SLOTS.reduce((a, s) => a + (gearDef(P.shipGear?.[s] || '')?.st?.[k] || 0), 0);
// Faktor für Wirkungen in Prozent (Lauftempo, Abbau, Handel)
export const gearFactor = (k: 'tempo' | 'abbau' | 'handel') => Math.max(0.5, 1 + gearStat(k) / 100);
export const invCap = () => BASE_SLOTS + gearStat('plaetze');
export const invUsed = () => P.inv.length;
export const invCount = (id: string) => P.inv.reduce((a, it) => a + (it.id === id ? it.n : 0), 0);
const stackOf = (id: string) => gearDef(id)?.stack || 1;

// In eine Liste legen (Rucksack oder Spind); Rückgabe: wie viele hineingepasst haben
function put(list: InvItem[], cap: number, id: string, n: number): number {
  const max = stackOf(id); let left = n;
  if (max > 1) for (const it of list) { if (it.id !== id || it.n >= max) continue; const m = Math.min(left, max - it.n); it.n += m; left -= m; if (!left) break; }
  while (left > 0 && list.length < cap) { const m = Math.min(left, max); list.push({ id, n: m }); left -= m; }
  return n - left;
}
// Platz für n Stück?
function fits(list: InvItem[], cap: number, id: string, n: number): boolean {
  const max = stackOf(id); let room = (cap - list.length) * max;
  if (max > 1) for (const it of list) if (it.id === id) room += max - it.n;
  return room >= n;
}
export const canAdd = (id: string, n = 1) => !!gearDef(id) && fits(P.inv, invCap(), id, n);
export function addItem(id: string, n = 1): number {
  if (!gearDef(id)) return 0;
  const m = put(P.inv, invCap(), id, n);
  if (m) invHooks.changed();
  return m;
}
function take(list: InvItem[], i: number, n: number): number {
  const it = list[i]; if (!it) return 0;
  const m = Math.min(n, it.n); it.n -= m;
  if (it.n <= 0) list.splice(i, 1);
  return m;
}
export function dropAt(i: number, n = 9999) { const m = take(P.inv, i, n); if (m) invHooks.changed(); return m; }

// ---------- Anlegen und Ablegen ----------
// Rückgabe: Fehlermeldung oder '' bei Erfolg
export function equip(i: number): string {
  const it = P.inv[i], d = it && gearDef(it.id);
  if (!it || !d) return 'Gegenstand fehlt.';
  if (d.kind === 'verbrauch' || d.kind === 'fund') return 'Das lässt sich nicht anlegen.';
  if (isShipKind(d.kind)) return equipShip(i);
  const slot: GearSlot = d.kind === 'modul' ? (!P.gear.modul1 ? 'modul1' : !P.gear.modul2 ? 'modul2' : 'modul1') : d.kind as GearSlot;
  const old = P.gear[slot];
  // Rucksack tauschen: der neue muss alles fassen, was gerade getragen wird (der alte kommt an die Stelle des neuen)
  const capAfter = invCap() - (gearDef(old || '')?.st?.plaetze || 0) + (d.st?.plaetze || 0);
  if (P.inv.length - (old ? 0 : 1) > capAfter) return 'Dafür ist zu viel im Rucksack.';
  P.gear[slot] = it.id;
  if (old) P.inv[i] = { id: old, n: 1 }; else P.inv.splice(i, 1);
  invHooks.changed();
  return '';
}
export function unequip(slot: GearSlot): string {
  const id = P.gear[slot], d = gearDef(id || '');
  if (!id || !d) return 'Der Platz ist leer.';
  if (P.inv.length + 1 > invCap() - (d.st?.plaetze || 0)) return 'Kein Platz im Rucksack.';
  delete P.gear[slot];
  P.inv.push({ id, n: 1 });
  invHooks.changed();
  return '';
}
// Schiffsmodul einbauen (ins aktive Schiff); das bisherige Modul des Platzes kommt in den Rucksack
function equipShip(i: number): string {
  const it = P.inv[i], d = gearDef(it.id)!;
  const slot: ShipSlot = d.kind === 'schiffswaffe' ? 'waffe' : d.kind === 'schiffsabwehr' ? 'abwehr' : d.kind === 'schiffsantrieb' ? 'antrieb' : !P.shipGear.system1 ? 'system1' : !P.shipGear.system2 ? 'system2' : 'system1';
  const old = P.shipGear[slot];
  P.shipGear[slot] = it.id;
  if (cargoUsed() > stats().cargo) { if (old) P.shipGear[slot] = old; else delete P.shipGear[slot]; return 'Dafür ist zu viel im Frachtraum.'; }
  if (old) P.inv[i] = { id: old, n: 1 }; else P.inv.splice(i, 1);
  clampShip();
  invHooks.changed();
  return '';
}
export function unequipShip(slot: ShipSlot): string {
  const id = P.shipGear[slot];
  if (!id) return 'Der Platz ist leer.';
  if (P.inv.length + 1 > invCap()) return 'Kein Platz im Rucksack.';
  delete P.shipGear[slot];
  if (cargoUsed() > stats().cargo) { P.shipGear[slot] = id; return 'Dafür ist zu viel im Frachtraum.'; }
  P.inv.push({ id, n: 1 });
  clampShip();
  invHooks.changed();
  return '';
}
// Hülle und Schild auf die neuen Höchstwerte begrenzen
function clampShip() { const S = stats(); P.hull = Math.min(P.hull, S.maxHull); P.shield = Math.min(P.shield, S.maxShield); }
// Verbrauchsgut benutzen (wirkt auf das Schiff)
export function useItem(i: number): string {
  const it = P.inv[i], d = it && gearDef(it.id);
  if (!it || !d?.use) return 'Das lässt sich nicht benutzen.';
  const S = stats();
  if (d.use.hull) { if (P.hull >= S.maxHull) return 'Die Hülle ist unbeschädigt.'; P.hull = Math.min(S.maxHull, P.hull + d.use.hull); }
  if (d.use.shield) { if (P.shield >= S.maxShield) return 'Der Schild ist voll.'; P.shield = Math.min(S.maxShield, P.shield + d.use.shield); }
  take(P.inv, i, 1);
  invHooks.changed();
  return '';
}

// ---------- Ausrüster ----------
// Angebot einer Station: steht je Station fest. Größere Auswahl in gefährlichen Sektoren.
export function gearStock(stationId: string, danger: number): string[] {
  return GEAR_IDS.filter(id => {
    const d = gearDef(id)!;
    if (d.shop === undefined) return false;
    if (d.shop === 2 && danger < 3) return false;
    const h = hashStr(stationId + ':' + id) % 100;
    return h < (d.shop === 0 ? 85 : d.shop === 1 ? 55 : 60);
  });
}
export const gearBuyPrice = (id: string) => Math.round((gearDef(id)?.val || 0) * serviceFactor());
export const gearSellPrice = (id: string) => Math.round((gearDef(id)?.val || 0) * 0.45);
export function buyGear(id: string): string {
  const pr = gearBuyPrice(id);
  if (!gearDef(id)) return 'Gegenstand fehlt.';
  if (P.credits < pr) return 'Zu wenig Credits.';
  if (!canAdd(id)) return 'Kein Platz im Rucksack.';
  P.credits -= pr; addItem(id, 1);
  return '';
}
export function sellGear(i: number, n = 1): number {
  const it = P.inv[i]; if (!it) return 0;
  const id = it.id, m = take(P.inv, i, n), cr = m * gearSellPrice(id);
  P.credits += cr; P.earned += cr;
  if (m) invHooks.changed();
  return cr;
}

// ---------- Spind ----------
export function toLocker(i: number): string {
  const it = P.inv[i]; if (!it) return 'Gegenstand fehlt.';
  if (!fits(P.locker, LOCKER_SLOTS, it.id, it.n)) return 'Der Spind ist voll.';
  put(P.locker, LOCKER_SLOTS, it.id, it.n); P.inv.splice(i, 1);
  invHooks.changed();
  return '';
}
export function fromLocker(i: number): string {
  const it = P.locker[i]; if (!it) return 'Gegenstand fehlt.';
  if (!fits(P.inv, invCap(), it.id, it.n)) return 'Kein Platz im Rucksack.';
  put(P.inv, invCap(), it.id, it.n); P.locker.splice(i, 1);
  invHooks.changed();
  return '';
}

// ---------- Beute ----------
// Abschuss eines Ferrox: mit kleiner Wahrscheinlichkeit ein Fundstück. Rückgabe: Name des Fundes oder ''
export function rollKillLoot(type: string): string {
  const r = Math.random(), big = type === 'mother', mid = type === 'bomber';
  const id = big ? (r < 0.25 ? 'fund_siegel' : 'fund_relikt') : r < (mid ? 0.03 : 0.012) ? 'fund_relikt' : r < (mid ? 0.16 : 0.07) ? 'fund_datenkern' : '';
  if (!id) return '';
  return addItem(id, 1) ? gearDef(id)!.n : '';
}

// Spielstand nach dem Laden in Ordnung bringen: unbekannte Gegenstände entfernen, Mengen begrenzen
export function sanitizeInv(p: { inv?: any; gear?: any; locker?: any; shipGear?: any; fleet?: any[] }) {
  const clean = (l: any): InvItem[] => (Array.isArray(l) ? l : []).filter((it: any) => it && gearDef(it.id) && it.n > 0).map((it: any) => ({ id: it.id, n: Math.min(Math.floor(it.n), gearDef(it.id)!.stack || 1) }));
  p.inv = clean(p.inv); p.locker = clean(p.locker).slice(0, LOCKER_SLOTS);
  const g: Record<string, string> = {};
  for (const s of GEAR_SLOTS) { const id = p.gear?.[s], d = gearDef(id || ''); if (d && d.kind === slotKind(s)) g[s] = id; }
  p.gear = g;
  const ship = (sg: any) => { const o: Record<string, string> = {}; for (const s of SHIP_SLOTS) { const id = sg?.[s], d = gearDef(id || ''); if (d && d.kind === shipSlotKind(s)) o[s] = id; } return o; };
  p.shipGear = ship(p.shipGear);
  for (const r of p.fleet || []) r.gear = ship(r.gear);
}
