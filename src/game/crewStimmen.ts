import { P, stats } from './state';
import { SECTORS, SECTOR, type StationDef } from '../data/galaxy';
import { ITEMS, type ItemId } from '../data/items';
import { unitPrice } from './economy';
import * as S from '../data/crewSprueche';

// =====================================================================================
// Stimmen der Crew (seit 2026-11-20): Die Leute in den Stationen reagieren auf den Piloten und auf die Welt.
// - Gedächtnis: Ferrox-Angriffe je Sektor (combat.ts meldet sie) und was der Pilot seit dem letzten Besuch getan hat
//   (Abschüsse, Erz, Geld, neues Schiff, Schaden, fertige Kapitel; Vergleich mit dem Stand beim letzten Betreten, P.crewMem).
// - Sprüche: crewSpruch() wählt einen Satz nach Lage (Taten zuerst, dann Angriff, sonst Geschichte, Ort, Alltag, Gerüchte).
// - Durchsage der Station einmal je Besuch (Angriff im Sektor, gerade beendetes Kapitel an der Bastion).
// Angezeigt und ausgelöst in interior.ts (Sprechblase über dem Kopf). Texte: src/data/crewSprueche.ts.
// =====================================================================================
export const crewHooks = { busy: () => false };      // läuft gerade ein Gespräch oder eine Szene der Geschichte? (main.ts setzt es)

// ---------- Ereignisse ----------
const ANGRIFFE: { sector: string; t: number }[] = [];
export function crewAngriff(sector: string) {
  ANGRIFFE.push({ sector, t: Date.now() });
  while (ANGRIFFE.length > 20) ANGRIFFE.shift();
}
export const angriffKuerzlich = (sector: string, ms = 6 * 60e3) => ANGRIFFE.some(a => a.sector === sector && Date.now() - a.t < ms);

// ---------- Abschnitt der Geschichte ----------
const KAP = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'] as const;
export function storyAbschnitt(): string {
  const s = P.story as any;
  if (!s) return 'frei';
  if (s.prolog !== 'done') return 'prolog';
  for (let i = 0; i < KAP.length; i++) {
    const v = s[KAP[i]];
    if (v === 'done') continue;
    if (v === undefined) return i === 0 ? 'frei' : 'nach' + i;       // fertig bis Kapitel i, das nächste hat noch nicht begonnen
    return KAP[i];
  }
  return 'nach5';
}
const fertig = () => { const s = P.story as any; return s ? ['prolog', ...KAP].filter(k => s[k] === 'done') : []; };

// ---------- Besuch: Taten seit dem letzten Mal ----------
interface Mem { kills: number; mined: number; earned: number; cls: string; done: string[] }
type Taten = { abschuss: number; erz: number; geld: number; schiff: boolean; schaden: boolean; kapitel: string[] };
let taten: Taten = { abschuss: 0, erz: 0, geld: 0, schiff: false, schaden: false, kapitel: [] };
let gesagt: Record<string, number> = {};            // je Anlass, wie oft schon in diesem Besuch
let station: { id: string; kind: string; sector: string; gilde: boolean } | null = null;
let durchsageOffen: string | null = null;
const zuletzt: string[] = [];                       // die letzten Sätze, damit sich nichts schnell wiederholt

export function crewBesuch(st: { id: string; def: StationDef }, sector: string) {
  const m = (P as any).crewMem as Mem | undefined, done = fertig();
  const max = stats().maxHull || 1;
  taten = m ? {
    abschuss: Math.max(0, P.kills - m.kills), erz: Math.max(0, (P.mined || 0) - m.mined), geld: Math.max(0, (P.earned || 0) - m.earned),
    schiff: m.cls !== P.cls, schaden: P.hull / max < 0.5, kapitel: done.filter(k => !m.done.includes(k)),
  } : { abschuss: 0, erz: 0, geld: 0, schiff: false, schaden: P.hull / max < 0.5, kapitel: [] };
  (P as any).crewMem = { kills: P.kills, mined: P.mined || 0, earned: P.earned || 0, cls: P.cls, done } as Mem;
  gesagt = {};
  station = { id: st.id, kind: st.def.kind, sector, gilde: !!(st.def as any).gilde };
  // Durchsage: Angriff im Sektor vor allem; an der Bastion das gerade beendete Kapitel
  const kap = taten.kapitel[taten.kapitel.length - 1];
  durchsageOffen = angriffKuerzlich(sector) ? S.DURCHSAGE.angriff : kap && st.id === 'bastion' && S.DURCHSAGE[kap] ? S.DURCHSAGE[kap] : null;
}
/** Einmal je Besuch: Text der Durchsage oder null */
export function crewDurchsage(): string | null { const d = durchsageOffen; durchsageOffen = null; return d ? fill(d) : null; }
/** Leute gehen schneller und bleiben seltener stehen, solange ein Angriff im Sektor frisch ist */
export const crewEile = () => (station && angriffKuerzlich(station.sector, 4 * 60e3) ? 1.35 : 1);

// ---------- Sätze ----------
function fill(t: string, n = 0) { return t.replace(/\{name\}/g, P.name || 'Pilot').replace(/\{n\}/g, String(n)); }
function pick(list: string[]): string | null {
  const frei = list.filter(t => !zuletzt.includes(t));
  const t = (frei.length ? frei : list)[Math.floor(Math.random() * (frei.length ? frei : list).length)];
  if (!t) return null;
  zuletzt.push(t); while (zuletzt.length > 40) zuletzt.shift();
  return t;
}
// Anlass höchstens zweimal je Besuch
function einmal(k: string, max = 2) { if ((gesagt[k] || 0) >= max) return false; gesagt[k] = (gesagt[k] || 0) + 1; return true; }

function tatSatz(): string | null {
  const T = taten, k = T.kapitel[T.kapitel.length - 1];
  const opts: [string, string[], number][] = [];
  if (k && S.TAT[k]) opts.push(['kap', S.TAT[k], 0]);
  if (T.abschuss >= 10) opts.push(['abschuss', S.TAT.abschussViel, T.abschuss]); else if (T.abschuss >= 3) opts.push(['abschuss', S.TAT.abschuss, T.abschuss]);
  if (T.schaden) opts.push(['schaden', S.TAT.schaden, 0]);
  if (T.schiff) opts.push(['schiff', S.TAT.schiff, 0]);
  if (T.erz >= 40) opts.push(['erz', S.TAT.erz, 0]);
  if (T.geld >= 5000) opts.push(['geld', S.TAT.geld, 0]);
  for (const [key, list, n] of opts) if (einmal(key, key === 'kap' ? 3 : 2)) { const t = pick(list); if (t) return fill(t, n); }
  return null;
}
function ortSaetze(): string[] {
  if (!station) return [];
  const own = S.ORT_STATION[station.id] || [];
  if (station.id === 'bastion') return [...S.ORT_BASTION, ...own];
  if (station.gilde) return [...S.ORT_GILDE, ...own];
  const grenz = (SECTOR[station.sector]?.danger || 0) >= 2 ? S.ORT_GRENZE : [];
  return station.kind === 'outpost' ? [...S.ORT_AUSSEN, ...grenz, ...own] : [...grenz, ...own];
}
// Gerücht über einen guten Preis in der Nähe (bis zwei Sprünge), aus dem echten Markt
function preisGeruecht(): string | null {
  if (!station) return null;
  const nah = new Set([station.sector]);
  for (let i = 0; i < 2; i++) for (const s of [...nah]) for (const l of SECTOR[s]?.links || []) nah.add(l);
  const waren: ItemId[] = ['erz', 'kupfer', 'titan', 'eis', 'stahl', 'kupferb', 'titanb', 'zellen', 'schrott', 'ferrit'];
  const best: { st: string; k: ItemId; r: number }[] = [];
  for (const sec of SECTORS) {
    if (!nah.has(sec.id) || sec.faction === 'ferrox') continue;
    for (const sd of sec.stations) {
      if (sd.id === station.id) continue;
      for (const k of waren) {
        let p = 0; try { p = unitPrice(sd, sec.id, k); } catch { continue; }
        const r = p / ITEMS[k].base;
        if (r >= 1.15) best.push({ st: sd.name, k, r });
      }
    }
  }
  if (!best.length) return null;
  best.sort((a, b) => b.r - a.r);
  const b = best[Math.floor(Math.random() * Math.min(6, best.length))], t = pick(S.GERUECHT_PREIS);
  return t ? t.replace('{station}', b.st).replace('{ware}', ITEMS[b.k].n) : null;
}

/** Ein Satz für jemanden, an dem der Pilot vorbeigeht (oder null: diesmal schweigen) */
export function crewSpruch(): string | null {
  const ab = storyAbschnitt();
  if (Math.random() < 0.55) { const t = tatSatz(); if (t) return t; }
  if (station && angriffKuerzlich(station.sector) && Math.random() < 0.6) { const t = pick(S.ANGRIFF); if (t) return fill(t); }
  const r = Math.random(), story = S.STORY[ab] || [], ort = ortSaetze();
  if (r < 0.3 && story.length) return fill(pick(story)!);
  if (r < 0.5 && ort.length) return fill(pick(ort)!);
  if (r < 0.68) { const g = Math.random() < 0.6 ? preisGeruecht() : null; return g || fill(pick(S.GERUECHT_FEST)!); }
  return fill(pick(S.ALLTAG)!);
}
/** Gesprächsfetzen aus einer Gruppe */
export function crewFetzen(): string {
  const ab = storyAbschnitt(), extra = S.GRUPPE_STORY[ab] || [];
  return fill(pick(Math.random() < 0.4 && extra.length ? extra : S.GRUPPE)!);
}
