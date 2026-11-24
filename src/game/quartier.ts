// Quartier auf der Bastion (seit 2026-11-24, nach Alpha 1.58): ein eigener kleiner Wohnraum je Pilot.
//
// Ein Raum für alle, eine Fassung je Pilot: Das Quartier ist ein einziges Modell (Blender: asset-src/neu/bastion/qu_bau.py), weit abseits
// der Rundhalle im selben Deck (deck.ts hängt deck_quartier.json an). Der Aufzug „QUARTIERE“ auf Deck 3 versetzt die Figur dorthin.
// Wessen Quartier es gerade ist, steht in QS.owner; was darin steht (Schiffsmodelle, Fundstücke, Türschild), kommt aus dem Spielstand des
// Besitzers (QDeko). Im Mehrspieler sieht man nur Piloten im selben Quartier: Der Ort im Netz heißt dann „bastion#q:<Besitzer>“ (net.ts).
// Besuch nur auf Einladung: Der Besitzer lädt am Bildschirm einen Piloten auf der Bastion ein, die Einladung trägt seine Ausstattung mit.
import { P } from './state';
import { gearDef } from '../data/gear';
import { SHIPS, type ShipId } from '../data/ships';

export interface QDeko { nr: number; name: string; schiffe: string[]; funde: string[]; legenden: string[] }
export interface QEinladung { von: string; id: number; deko: QDeko; t: number }
export type QMode = 'aufzug' | 'schirm' | 'regal';
export const QPREIS = 2500;
export const QEINLADUNG_MS = 15 * 60 * 1000;
export const QS = {
  in: false,                       // die Figur ist im Quartier (sonst auf Deck 3)
  owner: '',                       // wessen Quartier (Name des Piloten)
  deko: null as QDeko | null,      // was darin steht
  mode: 'aufzug' as QMode,         // welches Terminal offen ist (dock.ts, Tab „quartier“)
  einladungen: [] as QEinladung[],
};
// Verbindungen nach außen (main.ts, interior.ts, net.ts setzen sie)
export const quartierHooks = {
  fahren: (_owner: string, _deko: QDeko | null) => {},       // Aufzug fahren: ins Quartier (owner) oder zurück auf Deck 3 (owner leer)
  einladen: (_id: number, _deko: QDeko) => false,            // Einladung an einen Piloten schicken (net.ts)
  piloten: () => [] as { id: number; name: string }[],        // andere Piloten auf der Bastion (net.ts)
};

export const eigenes = () => QS.in && QS.owner === P.name;
export const hatQuartier = () => !!P.quartier;
export function quartierNr(name: string) {
  let h = 2166136261; for (const c of name) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return 101 + ((h >>> 0) % 799);
}
export const nrText = (nr: number) => `Q-${nr}`;
// Ort im Netz: Mitspieler sieht man nur im selben Quartier (oder beide auf Deck 3)
export const ortKennung = (station: string) => station + (QS.in && QS.owner ? '#q:' + QS.owner : '');

const FUND = ['fund_k_ferrit', 'fund_k_iridium', 'fund_k_erden', 'fund_k_titan', 'fund_k_kupfer', 'fund_k_eisen', 'fund_k_eis'];
export function funde(): Record<string, number> {
  const n: Record<string, number> = {};
  for (const it of [...P.inv, ...(P.locker || [])]) if (FUND.includes(it.id)) n[it.id] = (n[it.id] || 0) + it.n;
  return n;
}
export function schiffe(): ShipId[] {
  const s: ShipId[] = [P.cls];
  for (const f of P.fleet) if (!s.includes(f.cls)) s.push(f.cls);
  return s;
}
export function eigeneDeko(): QDeko {
  const f = funde();
  return { nr: P.quartier?.nr || quartierNr(P.name), name: P.name, schiffe: schiffe().slice(0, 4), funde: FUND.filter(k => f[k]).slice(0, 5), legenden: (P.legends || []).slice(0, 8) };
}
export function mieten(): string {
  if (P.quartier) return 'Du hast schon ein Quartier.';
  if (P.credits < QPREIS) return `Die Miete kostet ${QPREIS.toLocaleString('de-DE')} Credits. So viel hast du nicht.`;
  P.credits -= QPREIS;
  P.quartier = { nr: quartierNr(P.name), seit: Date.now() };
  return `Quartier ${nrText(P.quartier.nr)} gehört jetzt dir. Der Aufzug bringt dich hin.`;
}
// Einladung eines anderen Piloten (net.ts): die neueste je Absender gilt
export function einladungAn(von: string, id: number, deko: QDeko) {
  QS.einladungen = QS.einladungen.filter(e => e.von !== von && Date.now() - e.t < QEINLADUNG_MS);
  QS.einladungen.push({ von, id, deko, t: Date.now() });
}
export const gueltigeEinladungen = () => QS.einladungen.filter(e => Date.now() - e.t < QEINLADUNG_MS);
// Netzdaten säubern (fremde Einladung)
export function dekoAusNetz(d: any, name: string): QDeko | null {
  if (!d || typeof d !== 'object') return null;
  const ids = (a: unknown, n: number, ok: (s: string) => boolean) => (Array.isArray(a) ? a.filter(v => typeof v === 'string' && ok(v)).slice(0, n) : []) as string[];
  const nr = Math.floor(+d.nr);
  return { nr: nr >= 101 && nr <= 899 ? nr : quartierNr(name), name, schiffe: ids(d.schiffe, 4, s => s in SHIPS), funde: ids(d.funde, 5, s => FUND.includes(s)), legenden: ids(d.legenden, 8, s => !!gearDef(s)) };
}
export const fundName = (id: string) => gearDef(id)?.n || id;
// Farbe der Kristalle im Regal (Leuchten)
export const FUND_FARBE: Record<string, number> = { fund_k_eisen: 0xc0583a, fund_k_kupfer: 0xd88a3a, fund_k_titan: 0xb8c4d0, fund_k_iridium: 0x6a8cff, fund_k_erden: 0x7ad8a0, fund_k_eis: 0xbfe8ff, fund_k_ferrit: 0xff4a2a };
