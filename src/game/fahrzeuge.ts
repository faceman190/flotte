// Fahrzeuge, die zu den Schiffen passen (seit 2026-11-25, Konzept docs/konzept-schiffe-fracht.md, Schritt 1).
//
// Jedes Bodenfahrzeug hat Maße, jedes Schiff mit Laderaum ein Tor und Stellplätze. Ein Fahrzeug passt, wenn es durchs Tor geht (Breite mit
// 0,3 m Luft je Seite, Höhe mit 0,1 m Luft) und auf einen Stellplatz. Jäger (Venom, Würger) und die Elster tragen keins.
// Wo ein eigenes Fahrzeug ist, steht in P.fzOrt: 'sh:<uid>' an Bord des Schiffs mit dieser Nummer, 'st:<Station>' in deren Fahrzeughalle.
// Ausgesetzt wird beim Landen nur, was an Bord des aktiven Schiffs steht. An jeder Planetenbasis stellt die Fahrzeughalle einen Leihrover
// „Dachs“ aufs Landefeld; er bleibt auf dem Planeten (beim Abheben fährt ihn die Basis zurück in die Halle). Abseits der Basen und ohne
// Fahrzeug an Bord steigt man zu Fuß aus.
import { P } from './state';
import { SHIPS } from '../data/ships';
import { FZ, normFz, type FzId } from '../models/rover';

// Außenmaße der Fahrzeuge: Länge, Breite, Höhe (m), mit Rädern, Bohrer bzw. Sensormast
export const FZ_MASS: Record<FzId, [number, number, number]> = { dachs: [6.6, 3.8, 3.3], wiesel: [4.3, 2.4, 2.2] };
// Laderäume: Tor (Breite, Höhe) und Stellplätze (Länge, Breite, Höhe). Kormoran: Hecktor und Laderaum aus docs/kormoran.md
export const STELL: Record<string, { tor: [number, number]; plaetze: [number, number, number][] }> = {
  kormoran: { tor: [4.8, 3.15], plaetze: [[10.7, 7.2, 3.3]] },
  pfeil: { tor: [5.5, 4.0], plaetze: [[12, 8, 4.5]] },
  wisent: { tor: [9, 6], plaetze: [[14, 9, 6], [14, 9, 6]] },
};
export const LEIH_KIND: FzId = 'dachs';

export function passtIn(kind: FzId, cls: string): boolean {
  const s = STELL[cls], [l, b, h] = FZ_MASS[kind];
  if (!s) return false;
  if (b > s.tor[0] - 0.6 || h > s.tor[1] - 0.1) return false;
  return s.plaetze.some(p => l <= p[0] && b <= p[1] && h <= p[2]);
}
export const schiffePasst = (kind: FzId) => Object.keys(STELL).filter(c => passtIn(kind, c)).map(c => (SHIPS as any)[c].n as string);
export const stellplaetze = (cls: string) => STELL[cls]?.plaetze.length || 0;

export const eigene = (): FzId[] => (P.fahrzeuge || []).map(normFz).filter((k, i, a) => a.indexOf(k) === i);
export const ortVon = (k: FzId) => P.fzOrt?.[k] || '';
export const anBord = (uid = P.uid): FzId[] => eigene().filter(k => ortVon(k) === 'sh:' + uid);
export const inHalle = (st: string): FzId[] => eigene().filter(k => ortVon(k) === 'st:' + st);
export const freiePlaetze = (cls = P.cls, uid = P.uid) => stellplaetze(cls) - anBord(uid).length;
const setzeOrt = (k: FzId, o: string) => { (P.fzOrt ||= {})[k] = o; };

/** Spielstand von vor Schritt 1: Der Dachs gehörte jedem (wird zum Leihrover der Basen), ein gekaufter Wiesel steht an Bord, wenn er passt,
 *  sonst in der Halle der Bastion. Fahrzeuge auf verkauften Schiffen kommen in die Halle der Bastion. */
export function fzOrdnen() {
  if (!P) return;
  P.fahrzeuge = eigene();
  const uids = new Set([P.uid, ...P.fleet.map(f => f.uid)]);
  for (const k of eigene()) {
    const o = ortVon(k);
    if (o.startsWith('sh:') && uids.has(+o.slice(3))) continue;
    if (o.startsWith('st:')) continue;
    if (!o && passtIn(k, P.cls) && freiePlaetze() > 0) setzeOrt(k, 'sh:' + P.uid);
    else setzeOrt(k, 'st:bastion');
  }
}
/** Was beim Landen ausgesetzt wird: ein eigenes Fahrzeug an Bord (bevorzugt P.fahrzeug), an einer Basis sonst der Leihrover; null = zu Fuß */
export function ausgabe(anBasis: boolean): { kind: FzId; leih: boolean } | null {
  const ab = anBord();
  if (ab.length) { const w = normFz(P.fahrzeug); return { kind: ab.includes(w) ? w : ab[0], leih: false }; }
  return anBasis ? { kind: LEIH_KIND, leih: true } : null;
}
/** Fahrzeuge zur Wahl am Schiff (Taste X): die an Bord, an der Basis dazu der Leihrover */
export function wahl(anBasis: boolean): { kind: FzId; leih: boolean }[] {
  const o: { kind: FzId; leih: boolean }[] = anBord().map(kind => ({ kind, leih: false }));
  if (anBasis && !o.some(q => q.kind === LEIH_KIND)) o.push({ kind: LEIH_KIND, leih: true });
  return o;
}
/** Werft: gekauftes Fahrzeug an Bord (wenn es passt und Platz ist), sonst in die Halle der Station */
export function kaufen(kind: FzId, station: string): string {
  if (eigene().includes(kind)) return `Du hast schon einen ${FZ[kind].kurz}.`;
  if (P.credits < FZ[kind].price) return 'Zu wenig Credits.';
  P.credits -= FZ[kind].price; (P.fahrzeuge ||= []).push(kind);
  if (passtIn(kind, P.cls) && freiePlaetze() > 0) { setzeOrt(kind, 'sh:' + P.uid); P.fahrzeug = kind; return `${FZ[kind].kurz} gekauft und in den Laderaum der ${P.shipName} gefahren.`; }
  setzeOrt(kind, 'st:' + station);
  return `${FZ[kind].kurz} gekauft. Er steht in der Fahrzeughalle, bis ein Schiff mit passendem Laderaum ihn abholt.`;
}
/** Werft: aus der Halle dieser Station an Bord des aktiven Schiffs, oder umgekehrt */
export function verladen(kind: FzId, station: string): string {
  const o = ortVon(kind);
  if (o === 'sh:' + P.uid) { setzeOrt(kind, 'st:' + station); return `${FZ[kind].kurz} in die Fahrzeughalle gestellt.`; }
  if (o !== 'st:' + station) return `Der ${FZ[kind].kurz} steht nicht hier.`;
  if (!passtIn(kind, P.cls)) return `Der ${FZ[kind].kurz} passt nicht in die ${P.shipName}.`;
  if (freiePlaetze() <= 0) return `Kein freier Stellplatz in der ${P.shipName}.`;
  setzeOrt(kind, 'sh:' + P.uid); P.fahrzeug = kind;
  return `${FZ[kind].kurz} in den Laderaum der ${P.shipName} gefahren. Er wird beim Landen ausgesetzt.`;
}
/** Testlabor: Fahrzeug ohne Rücksicht auf die Maße an Bord stellen */
export function testAnBord(kind: FzId) { if (!eigene().includes(kind)) (P.fahrzeuge ||= []).push(kind); setzeOrt(kind, 'sh:' + P.uid); P.fahrzeug = kind; }
export function ortText(kind: FzId, stName: (id: string) => string): string {
  const o = ortVon(kind);
  if (o.startsWith('sh:')) { const uid = +o.slice(3); return uid === P.uid ? `an Bord der ${P.shipName}` : `an Bord der ${P.fleet.find(f => f.uid === uid)?.name || 'geparkten Schiffs'}`; }
  if (o.startsWith('st:')) return `Fahrzeughalle ${stName(o.slice(3))}`;
  return '';
}
