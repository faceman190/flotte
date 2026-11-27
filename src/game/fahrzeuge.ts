// Fahrzeuge, die zu den Schiffen passen (seit 2026-11-25, Konzept docs/konzept-schiffe-fracht.md, Schritt 1).
//
// Jedes Bodenfahrzeug hat Maße, jedes Schiff mit Laderaum ein Tor und Stellplätze. Ein Fahrzeug passt, wenn es durchs Tor geht (Breite mit
// 0,3 m Luft je Seite, Höhe mit 0,1 m Luft) und auf einen Stellplatz. Jäger (Milan, Würger) und die Elster tragen keins.
// Wo ein eigenes Fahrzeug ist, steht in P.fzOrt: 'sh:<uid>' an Bord des Schiffs mit dieser Nummer, 'st:<Station>' in deren Fahrzeughalle, 'pl:<Sektor>' draußen abgestellt (Lage in P.fzPark).
// Ausgesetzt wird beim Landen nur, was an Bord des aktiven Schiffs steht. An jeder Planetenbasis stellt die Fahrzeughalle einen Leihrover
// „Dachs“ aufs Landefeld; er bleibt auf dem Planeten (beim Abheben fährt ihn die Basis zurück in die Halle). Abseits der Basen und ohne
// Fahrzeug an Bord steigt man zu Fuß aus.
import { P } from './state';
import { SHIPS } from '../data/ships';
import { FZ, normFz, type FzId } from '../models/rover';
import { SECTOR } from '../data/galaxy';

// Außenmaße der Fahrzeuge: Länge, Breite, Höhe (m), mit Rädern, Bohrer bzw. Sensormast
export const FZ_MASS: Record<FzId, [number, number, number]> = { dachs: [6.6, 3.8, 3.3], wiesel: [4.3, 2.4, 2.2] };
// Laderäume: Tor (Breite, Höhe) und Stellplätze (Länge, Breite, Höhe). Kormoran: Hecktor und Laderaum aus docs/kormoran.md
export const STELL: Record<string, { tor: [number, number]; plaetze: [number, number, number][] }> = {
  kormoran: { tor: [4.8, 3.15], plaetze: [[10.7, 7.2, 3.3]] },
  kranich: { tor: [3.1, 2.8], plaetze: [[11.0, 2.5, 3.6]] },      // Heckluke 3,1 × 2,8 m, Fahrgasse 2,5 m breit: ein Wiesel, kein Dachs (kra_kit.py RAMP)
  pfeil: { tor: [5.5, 4.0], plaetze: [[12, 8, 4.5]] },
  harpyie: { tor: [4.6, 3.7], plaetze: [[7.0, 4.0, 3.9]] },      // Heckrampe 4,6 m breit, ein Dachs hinten im Truppenraum (har_kit.py RAMP_HW, har_innen.py STELL_X)
  moewe: { tor: [5.7, 5.8], plaetze: [[6.8, 4.0, 5.5], [6.8, 4.0, 5.5]] },      // Heckrampe 6 m breit; Fahrgasse ±2,0 m: zwei Dachs hintereinander (moe_kit.py TOR, moe_innen.py STELL_X)
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
const setzeOrt = (k: FzId, o: string) => { (P.fzOrt ||= {})[k] = o; if (!o.startsWith('pl:') && P.fzPark) delete P.fzPark[k]; };
/** Draußen abgestellt (beim Abheben stehen gelassen, abseits einer Basis): bleibt dort, bis man es abholt (game/surface.ts boardShip) */
export function parken(kind: FzId, sektor: string, x: number, y: number, z: number, yaw: number) { setzeOrt(kind, 'pl:' + sektor); (P.fzPark ||= {})[kind] = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, z: Math.round(z * 10) / 10, yaw: Math.round(yaw * 100) / 100 }; }
/** draußen abgestellte Fahrzeuge in diesem Sektor (mit Lage) */
export const geparkt = (sektor: string) => eigene().filter(k => ortVon(k) === 'pl:' + sektor && P.fzPark?.[k]).map(k => ({ kind: k, ...P.fzPark![k]! }));
/** ein abgestelltes Fahrzeug in der Nähe (Landeplatz): bis 800 m */
export const parkNahe = (sektor: string, x: number, z: number) => geparkt(sektor).filter(p => Math.hypot(p.x - x, p.z - z) < 800).sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
export const ABHOLEN_PREIS = 900;
/** Werft: abgestelltes Fahrzeug von einem Bergungstrupp in die Halle dieser Station bringen lassen */
export function abholen(kind: FzId, station: string): string {
  if (!ortVon(kind).startsWith('pl:')) return `Der ${FZ[kind].kurz} steht nicht draußen.`;
  if (P.credits < ABHOLEN_PREIS) return 'Zu wenig Credits.';
  P.credits -= ABHOLEN_PREIS; setzeOrt(kind, 'st:' + station);
  return `Der Bergungstrupp holt den ${FZ[kind].kurz}. Er steht jetzt in der Fahrzeughalle.`;
}

/** Spielstand von vor Schritt 1: Der Dachs gehörte jedem (wird zum Leihrover der Basen), ein gekaufter Wiesel steht an Bord, wenn er passt,
 *  sonst in der Halle der Bastion. Fahrzeuge auf verkauften Schiffen kommen in die Halle der Bastion. */
export function fzOrdnen() {
  if (!P) return;
  P.fahrzeuge = eigene();
  const uids = new Set([P.uid, ...P.fleet.map(f => f.uid)]);
  for (const k of eigene()) {
    const o = ortVon(k);
    if (o.startsWith('sh:') && uids.has(+o.slice(3))) continue;
    if (o.startsWith('st:') || (o.startsWith('pl:') && P.fzPark?.[k])) continue;
    if (!o && passtIn(k, P.cls) && freiePlaetze() > 0) setzeOrt(k, 'sh:' + P.uid);
    else setzeOrt(k, 'st:bastion');
  }
}
/** Was beim Landen ausgesetzt wird: ein eigenes Fahrzeug an Bord (bevorzugt P.fahrzeug), an einer Basis sonst der Leihrover; null = zu Fuß */
export function ausgabe(anBasis: boolean, basis = '', nahe?: { sektor: string; x: number; z: number }): { kind: FzId; leih: boolean } | null {
  const ab = anBord();
  if (ab.length) { const w = normFz(P.fahrzeug); return { kind: ab.includes(w) ? w : ab[0], leih: false }; }
  const pk = nahe ? parkNahe(nahe.sektor, nahe.x, nahe.z) : [];      // draußen abgestellt, in der Nähe des Landeplatzes
  if (pk.length) return { kind: pk[0].kind, leih: false };
  const h = basis ? inHalle(basis) : [];      // eigene Fahrzeuge in der Halle dieser Basis
  if (anBasis && h.length) return { kind: h[0], leih: false };
  return anBasis ? { kind: LEIH_KIND, leih: true } : null;
}
/** Fahrzeuge zur Wahl am Schiff (Taste X): die an Bord, an der Basis dazu der Leihrover */
export function wahl(anBasis: boolean, basis = '', nahe?: { sektor: string; x: number; z: number }): { kind: FzId; leih: boolean }[] {
  const o: { kind: FzId; leih: boolean }[] = anBord().map(kind => ({ kind, leih: false }));
  if (nahe) for (const p of parkNahe(nahe.sektor, nahe.x, nahe.z)) if (!o.some(q => q.kind === p.kind)) o.push({ kind: p.kind, leih: false });
  if (anBasis && basis) for (const kind of inHalle(basis)) if (!o.some(q => q.kind === kind)) o.push({ kind, leih: false });
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
/** In der Fahrzeughalle einer Basis abstellen (Taste E an der Basis) */
export function inHalleStellen(kind: FzId, basis: string) { setzeOrt(kind, 'st:' + basis); }
/** Ein Fahrzeug aus der Halle über die Rampe in den Laderaum gefahren: steht jetzt an Bord */
export function anBordStellen(kind: FzId) { if (eigene().includes(kind) && passtIn(kind, P.cls) && (ortVon(kind) === 'sh:' + P.uid || freiePlaetze() > 0)) { setzeOrt(kind, 'sh:' + P.uid); P.fahrzeug = kind; return true; } return false; }
/** Testlabor: Fahrzeug ohne Rücksicht auf die Maße an Bord stellen */
export function testAnBord(kind: FzId) { if (!eigene().includes(kind)) (P.fahrzeuge ||= []).push(kind); setzeOrt(kind, 'sh:' + P.uid); P.fahrzeug = kind; }
export function ortText(kind: FzId, stName: (id: string) => string): string {
  const o = ortVon(kind);
  if (o.startsWith('sh:')) { const uid = +o.slice(3); return uid === P.uid ? `an Bord der ${P.shipName}` : `an Bord der ${P.fleet.find(f => f.uid === uid)?.name || 'geparkten Schiffs'}`; }
  if (o.startsWith('st:')) return `Fahrzeughalle ${stName(o.slice(3))}`;
  if (o.startsWith('pl:')) return `draußen abgestellt auf ${(SECTOR as any)[o.slice(3)]?.name || o.slice(3)}`;
  return '';
}
