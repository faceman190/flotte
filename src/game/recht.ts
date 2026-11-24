import { view, ux } from '../core/engine';
import { fmtN } from '../core/util';
import { snd } from '../core/audio';
import { P, G, saveGame } from './state';
import { SECTOR } from '../data/galaxy';
import { addRep } from './reputation';
import { radio } from '../ui/radio';

// =====================================================================================
// Recht und Ordnung (seit 2026-11-24, Konzept docs/konzept-welt-und-leben.md Punkt 10)
// Fahndungsstufe 0–3 (P.fahndung), steigt mit Taten an friedlichen Schiffen:
//  - Treffer auf Verkehr oder Patrouille: erst eine Warnung der Wacht, ein zweiter Treffer binnen 25 s → Stufe 1
//  - Abschuss: +2 Stufen (höchstens 3)
//  - im Ferrox-Gebiet gibt es weder Verkehr noch Wacht; im Grenzgebiet zählt alles wie im Menschenraum
// Folgen: Stufe 2+ Patrouillen greifen an (nicht in Heimstatt, npc.ts), Stationen im Menschenraum lassen nur gegen Bußgeld andocken
// (Heimstatt: die Bastion lässt immer andocken und zieht das Bußgeld ein, die Geschichte darf nicht hängen), Stufe 3 zusätzlich zwei
// Kopfgeldjäger der Wacht (npc.ts). Fällt von allein: je Stufe 4 Minuten ohne neue Tat. Tod löscht die Fahndung, kostet 10 Ruf beim Rat.
// =====================================================================================

const ABBAU = 4 * 60 * 1000;      // so lange ohne Tat, bis die Stufe um eins sinkt
export const BUSSGELD = [0, 500, 1500, 4000];
let warnT = -99, deadSeen = false;
const st = () => (P.fahndung ||= { s: 0, t: 0 });
export const stufe = () => (P.fahndung?.s || 0);
const zone = () => SECTOR[P.sector]?.faction || 'core';

function setze(s: number, warum: string) {
  const f = st(), alt = f.s; f.s = Math.max(0, Math.min(3, s)); f.t = Date.now();
  if (f.s > alt) {
    const txt = f.s === 1 ? 'Sie sind zur Fahndung ausgeschrieben, Stufe 1. Stellen Sie das Feuer ein.' : f.s === 2 ? 'Fahndungsstufe 2. Patrouillen sind angewiesen, Sie zu stellen. Andocken im Menschenraum nur gegen Bußgeld.' : 'Fahndungsstufe 3. Kopfgeld ausgesetzt. Jäger der Wacht sind unterwegs.';
    radio('GRENZWACHT', `${warum} ${txt}`, '#ff6b5b'); snd(330, 0.5, 'square', 0.05, -120);
  }
  saveGame();
}
/** Tat an einem friedlichen Schiff (combat.ts): treffer oder abschuss, ziel für den Funkspruch */
export function rechtTat(art: 'treffer' | 'abschuss', ziel: string) {
  if (zone() === 'ferrox' || G.dead) return;
  const f = st();
  if (art === 'abschuss') { setze(f.s + 2, `${ziel} zerstört.`); return; }
  if (f.s > 0) { f.t = Date.now(); return; }      // schon gesucht: die Uhr beginnt von vorn
  if (G.time - warnT < 25) { warnT = -99; setze(1, `Erneut Feuer auf ${ziel}.`); return; }
  warnT = G.time; radio('GRENZWACHT', `Achtung: Sie haben ${ziel} getroffen. Feuer einstellen, das ist eine Warnung.`, '#ffb347');
}
/** greifen die Patrouillen hier an? (npc.ts) */
export const rechtFeind = () => stufe() >= 2 && P.sector !== 'heimstatt' && zone() !== 'ferrox' && !G.dead;
/** Andocken: frei, gegen Bußgeld oder (Heimstatt) mit eingezogenem Bußgeld. Liefert den Hinweistext und ob angedockt werden darf. */
export function rechtDock(stName: string, stationFaction: string | null): { ok: boolean; zahlen: number; text: string } {
  const s = stufe(); if (s < 2 || stationFaction !== 'rat' && stationFaction !== 'wacht') return { ok: true, zahlen: 0, text: '' };
  const b = BUSSGELD[s];
  if (P.sector === 'heimstatt') return { ok: true, zahlen: Math.min(b, P.credits), text: `Bußgeld ${fmtN(b)} Cr wird beim Andocken eingezogen` };
  return { ok: P.credits >= b, zahlen: b, text: P.credits >= b ? `Bußgeld ${fmtN(b)} Cr zahlen und andocken` : `Andocken verweigert: Bußgeld ${fmtN(b)} Cr, zu wenig Credits` };
}
/** Bußgeld bezahlt (main.ts beim Andocken) */
export function rechtZahlen(betrag: number, stName: string) {
  if (!betrag && stufe() < 2) return;
  P.credits = Math.max(0, P.credits - betrag); st().s = 0; st().t = Date.now();
  radio(stName.toUpperCase(), `Bußgeld über ${fmtN(betrag)} Credits erhalten. Ihre Fahndung ist aufgehoben.`, '#9fd8ff');
  saveGame();
}
/** jedes Bild: Abbau über die Zeit, Tod löscht die Fahndung */
export function updateRecht() {
  const f = P.fahndung; if (!f || !f.s) { deadSeen = !!G.dead; return; }
  if (G.dead && !deadSeen) { deadSeen = true; f.s = 0; f.t = Date.now(); addRep('rat', -10); radio('GRENZWACHT', 'Fahndung erledigt.', '#ffb347'); saveGame(); return; }
  deadSeen = !!G.dead;
  if (Date.now() - f.t > ABBAU) { f.s--; f.t = Date.now(); radio('GRENZWACHT', f.s ? `Fahndungsstufe auf ${f.s} gesenkt.` : 'Die Fahndung nach Ihnen ist eingestellt.', '#9fd8ff'); saveGame(); }
}
/** Anzeige oben in der Mitte: GESUCHT mit Sternen und Restzeit bis zur nächsten Stufe */
export function drawRecht() {
  const f = P.fahndung; if (!f || !f.s) return;
  const W = view.W, rest = Math.max(0, Math.ceil((ABBAU - (Date.now() - f.t)) / 1000));
  ux.save(); ux.textAlign = 'center'; ux.font = '700 13px "Share Tech Mono",Consolas,monospace';
  const t = `GESUCHT  ${'★'.repeat(f.s)}${'☆'.repeat(3 - f.s)}  ·  ${Math.floor(rest / 60)}:${String(rest % 60).padStart(2, '0')}`;
  const tw = ux.measureText(t).width + 26;
  ux.fillStyle = 'rgba(40,6,6,.82)'; ux.strokeStyle = '#ff6b5b'; ux.lineWidth = 1; ux.beginPath(); ux.rect(W / 2 - tw / 2, 112, tw, 26); ux.fill(); ux.stroke();
  ux.fillStyle = Math.sin(G.time * 5) > -0.3 ? '#ff6b5b' : '#c04030'; ux.fillText(t, W / 2, 130);
  ux.restore();
}
