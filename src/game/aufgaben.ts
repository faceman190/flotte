import { d3 } from '../core/util';
import { snd, sfx } from '../core/audio';
import { P, G, saveGame } from './state';
import { world, type Asteroid } from './world';
import { radio } from '../ui/radio';
import { addRep, type RepId } from './reputation';
import { ortById } from './orte';

// =====================================================================================
// Stationsaufgaben (seit 2026-11-24): kleine Aufträge, die Figuren auf den Decks selbst vergeben – ansprechen (E), das Angebot hören,
// noch einmal E zum Annehmen; unterwegs erledigen; zurück zur Figur und abgeben. Wiederholbar nach einer Pause. Erste Figuren: das
// Pumpwerk Reifschleier (asset-src/neu/eiswerk/ew_deck.py: Pumpenmeister, Laborantin, Annahmemeister).
//  - dichtungen  Dichtungen aus den Bergungscontainern der Alten Werft (altewerft.ts meldet jede Bergung)
//  - eisproben   Kernproben aus drei markierten Brocken im Reifschleier (mining.ts meldet jede abgebaute Einheit)
//  - eislieferung  Eis in der Zeit an die Annahme; je schneller, desto höher der Lohn
// Fortschritt in P.aufgaben, letzte Erledigung in P.aufgabenZuletzt. Anzeige im Aufgabenfeld (hud.ts) und im Flottenband (band.ts).
// =====================================================================================

interface Def {
  id: string; station: string; npc: string; titel: string; fac: RepId; lohn: number; ruf: number; n: number;
  zeit?: number;                  // Sekunden bis zur Abgabe (sonst ohne Frist)
  bonus?: number;                 // zusätzlicher Lohn, wenn sofort abgegeben (fällt mit der Zeit auf 0)
  angebot: string; laeuft: (n: number, rest: number) => string; fertig: string;
}
const PAUSE = 20 * 60 * 1000;      // so lange, bis dieselbe Figur wieder etwas zu tun hat
const PROBE_JE_BROCKEN = 5;        // abgebaute Einheiten je markiertem Brocken für eine Probe
const EIS = 20;
export const AUFGABEN: Def[] = [
  { id: 'dichtungen', station: 'pumpwerk', npc: 'pumpenmeister', titel: 'Dichtungen für Pumpe drei', fac: 'gilde', lohn: 900, ruf: 15, n: 4,
    angebot: 'Pumpe drei klemmt wieder, die Dichtungen sind hin. In der Alten Werft stehen noch Container mit Ersatzteilen aus den ersten Jahren. Bring mir vier Dichtungen, ich zahle neunhundert.',
    laeuft: n => `Vier Dichtungen, Pilot. Du hast ${n}. Die Container an den Wracks der Alten Werft, mit E an Bord holen.`,
    fertig: 'Passen wie angegossen. Pumpe drei läuft wieder, und bei der Gilde hast du was gut.' },
  { id: 'eisproben', station: 'pumpwerk', npc: 'laborantin', titel: 'Kernproben aus dem Reifschleier', fac: 'gilde', lohn: 700, ruf: 12, n: 3,
    angebot: 'Ich brauche frische Kernproben aus dem Reifschleier. Drei Brocken habe ich dir markiert. Mit dem Laser rein, fünf Einheiten je Brocken, dann kommt die Probe mit.',
    laeuft: n => `Drei markierte Brocken im Reifschleier. ${n} von drei Proben hast du.`,
    fertig: 'Sauber gezogen. Wenn Ferrit in diesen Brocken steckt, finde ich es.' },
  { id: 'eislieferung', station: 'pumpwerk', npc: 'eisrufer', titel: 'Eis für die Kessel', fac: 'gilde', lohn: 600, ruf: 8, n: EIS, zeit: 15 * 60, bonus: 400,
    angebot: 'Die Kessel laufen leer. Bring mir zwanzig Eis in fünfzehn Minuten. Je schneller du zurück bist, desto mehr zahle ich.',
    laeuft: (n, rest) => `Zwanzig Eis. Du hast ${n} an Bord, noch ${Math.max(1, Math.ceil(rest / 60))} Minuten.`,
    fertig: 'Frisch aus dem Feld, so mag ich das. Ab aufs Band damit.' },
];
const DEF = Object.fromEntries(AUFGABEN.map(a => [a.id, a])) as Record<string, Def>;
const st = () => (P.aufgaben = P.aufgaben || {});
const aktiv = (id: string) => st()[id] || null;
const rest = (d: Def, a: { t0: number }) => (d.zeit ? d.zeit - (Date.now() - a.t0) / 1000 : Infinity);
/** Fortschritt (Eis: was an Bord ist, sonst gezählt) */
const stand = (d: Def, a: { n: number }) => (d.id === 'eislieferung' ? Math.min(P.cargo.eis || 0, d.n) : a.n);
const pause = (d: Def) => Date.now() - (P.aufgabenZuletzt?.[d.id] || 0) < PAUSE;
const defFor = (station: string, npc: string) => AUFGABEN.find(d => d.station === station && d.npc === npc) || null;
let offer: { id: string; t: number } | null = null;      // Angebot gehört, aber noch nicht angenommen (E noch einmal)

/** Text am Ansprechpunkt einer Figur (null: der übliche) */
export function aufgabeLabel(station: string, npc: string, name: string): string | null {
  const d = defFor(station, npc); if (!d) return null;
  const a = aktiv(d.id);
  if (a && stand(d, a) >= d.n) return `${name} · Aufgabe abgeben`;
  if (!a && offer?.id === d.id && G.time - offer.t < 30) return `${name} · Aufgabe annehmen: ${d.titel}`;
  if (!a && !pause(d)) return `${name} ansprechen · hat Arbeit für dich`;
  return null;
}
/** Figur angesprochen: Angebot, Annahme, Stand oder Abgabe. false = keine Aufgabe, die Figur sagt ihren üblichen Satz */
export function aufgabeTalk(station: string, npc: string, name: string, say: (who: string, text: string) => void): boolean {
  const d = defFor(station, npc); if (!d) return false;
  const a = aktiv(d.id);
  if (a) {
    if (d.zeit && rest(d, a) <= 0) { fail(d); say(name, 'Zu spät, die Kessel sind schon wieder voll. Beim nächsten Mal schneller.'); return true; }
    if (stand(d, a) < d.n) { say(name, d.laeuft(stand(d, a), rest(d, a))); return true; }
    // Abgabe
    let lohn = d.lohn;
    if (d.bonus && d.zeit) lohn += Math.round(d.bonus * Math.max(0, rest(d, a)) / d.zeit);
    if (d.id === 'eislieferung') P.cargo.eis -= d.n;
    P.credits += lohn; addRep(d.fac, d.ruf);
    delete st()[d.id]; (P.aufgabenZuletzt = P.aufgabenZuletzt || {})[d.id] = Date.now();
    if (P.track === 'auf:' + d.id) P.track = undefined;
    say(name, d.fertig);
    radio('GILDE', `Aufgabe erledigt: ${d.titel}. +${lohn.toLocaleString('de-DE')} Credits, +${d.ruf} Ruf bei der Bergbaugilde.`, '#ffb347');
    sfx('ui_confirm', 0.5, 1, () => snd(880, 0.15, 'sine', 0.05, 300));
    saveGame(); return true;
  }
  if (pause(d)) return false;
  if (offer?.id === d.id && G.time - offer.t < 30) {      // zweites E: angenommen
    st()[d.id] = { n: 0, t0: Date.now() }; offer = null; P.track = 'auf:' + d.id; probenWahl.clear();
    say(name, d.id === 'eislieferung' ? 'Die Uhr läuft. Los.' : 'Gut. Ich verlass mich auf dich.');
    radio('GILDE', `Neue Aufgabe: ${d.titel}.${d.zeit ? ` Frist ${Math.round(d.zeit / 60)} Minuten.` : ''}`, '#ffb347');
    snd(660, 0.12, 'sine', 0.04, 200); saveGame(); return true;
  }
  offer = { id: d.id, t: G.time };
  say(name, d.angebot + ' (E: annehmen)');
  return true;
}
function fail(d: Def) {
  delete st()[d.id]; (P.aufgabenZuletzt = P.aufgabenZuletzt || {})[d.id] = Date.now() - PAUSE + 5 * 60 * 1000;      // nach fünf Minuten wieder
  if (P.track === 'auf:' + d.id) P.track = undefined;
  saveGame();
}

// ---------- Fortschritt von unterwegs ----------
/** Alte Werft: ein Container geborgen. Gibt den Text für die Anzeige zurück (oder null). */
export function aufgabeWerft(): string | null {
  const a = aktiv('dichtungen'); if (!a || a.n >= DEF.dichtungen.n) return null;
  a.n = Math.min(DEF.dichtungen.n, a.n + (Math.random() < 0.35 ? 2 : 1));
  if (a.n >= DEF.dichtungen.n) radio('PUMPWERK', 'Pumpenmeister an Pilot: Das reicht. Bring sie mir, Pumpe drei wartet.', '#9fd8ff');
  return `Dichtungen für das Pumpwerk · ${a.n}/${DEF.dichtungen.n}`;
}
// Kernproben: drei markierte Eisbrocken im Reifschleier, so lange gemerkt, wie der Sektor steht
const probenWahl = new Map<Asteroid, number>();
function probenBrocken(): Asteroid[] {
  const a = aktiv('eisproben'); if (!a || world.def?.id !== 'heimstatt' || world.surface) return [];
  for (const k of [...probenWahl.keys()]) if (!world.asteroids.includes(k)) probenWahl.delete(k);
  const want = DEF.eisproben.n - a.n;
  if (probenWahl.size < want) {
    const ice = world.asteroids.filter(r => r.field?.def.kind === 'ice' && !probenWahl.has(r) && r.yld >= PROBE_JE_BROCKEN + 2).sort((p, q) => q.yld - p.yld);
    for (const r of ice.slice(0, want - probenWahl.size)) probenWahl.set(r, 0);
  }
  while (probenWahl.size > want) probenWahl.delete(probenWahl.keys().next().value!);
  return [...probenWahl.keys()];
}
/** Bergbau: eine Einheit aus einem Brocken entnommen */
export function aufgabeAbbau(r: Asteroid) {
  const a = aktiv('eisproben'); if (!a || !probenWahl.has(r)) return;
  const k = probenWahl.get(r)! + 1; probenWahl.set(r, k);
  if (k < PROBE_JE_BROCKEN) return;
  probenWahl.delete(r); a.n++;
  radio('PUMPWERK', a.n >= DEF.eisproben.n ? 'Laborantin an Pilot: Das sind alle drei. Bring sie mir ins Labor, bevor sie warm werden.' : `Laborantin an Pilot: Probe ${a.n} von ${DEF.eisproben.n} ist sauber. Weiter zum nächsten Brocken.`, '#9fd8ff');
  snd(1200, 0.1, 'sine', 0.04, 400); saveGame();
}

// ---------- Ablauf, Anzeige ----------
export function updateAufgaben() {
  const s = P.aufgaben; if (!s) return;
  for (const [id, a] of Object.entries(s)) {
    const d = DEF[id]; if (!d) { delete s[id]; continue; }
    if (d.zeit && rest(d, a) <= 0) { fail(d); radio('PUMPWERK', 'Annahme an Pilot: Die Frist ist um, die Kessel sind wieder voll. Beim nächsten Mal schneller.', '#9fd8ff'); }
  }
}
export const aufgabenAktiv = () => Object.keys(P.aufgaben || {}).filter(id => DEF[id]);
const stName = (id: string) => world.stations.find(s => s.id === id)?.name || 'Pumpwerk Reifschleier';
/** Zeilen fürs Aufgabenfeld (verfolgte Aufgabe, sonst die erste) */
export function aufgabeObjective(): { title: string; lines: [string, boolean, boolean][] } | null {
  const ids = aufgabenAktiv(); if (!ids.length) return null;
  const tr = String(P.track || ''), id = tr.startsWith('auf:') && ids.includes(tr.slice(4)) ? tr.slice(4) : ids[0], d = DEF[id], a = aktiv(id)!;
  const n = stand(d, a), done = n >= d.n, L: [string, boolean, boolean][] = [];
  const dist = (x: number, y: number, z: number) => { const m = d3(x, y, z, P.x, P.y, P.z); return m >= 1000 ? (m / 1000).toFixed(1).replace('.', ',') + ' km' : Math.round(m) + ' m'; };
  if (id === 'dichtungen') {
    const o = ortById('altewerft');
    L.push([`Container in der Alten Werft bergen${o && world.def?.id === 'heimstatt' ? ` · <b>${dist(o.x, o.y, o.z)}</b>` : ''}`, done, false]);
    L.push([`Dichtungen · <b>${n}/${d.n}</b>`, done, false]);
  } else if (id === 'eisproben') {
    L.push([`Markierte Brocken im Reifschleier abbauen · <b>${n}/${d.n}</b>`, done, false]);
  } else {
    L.push([`${d.n} Eis laden · <b>${n}/${d.n}</b>`, done, false]);
    L.push([`Noch <b>${Math.max(0, Math.ceil(rest(d, a) / 60))} min</b>`, false, true]);
  }
  L.push([`Bei ${d.npc === 'pumpenmeister' ? 'Pumpenmeister' : d.npc === 'laborantin' ? 'Laborantin' : 'Annahmemeister'} im ${stName(d.station)} abgeben`, false, false]);
  L.push([`Lohn <b>${d.lohn.toLocaleString('de-DE')} Cr</b>${d.bonus ? ` + bis ${d.bonus} Eilbonus` : ''} · +${d.ruf} Ruf`, false, true]);
  return { title: `Aufgabe · ${d.titel}`, lines: L };
}
/** Marken in der Welt */
export function aufgabenMarkers() {
  const out: { x: number; y: number; z: number; label: string; col: string; big?: boolean }[] = [];
  if (world.def?.id !== 'heimstatt' || world.surface) return out;
  const col = '#9fd8ff';
  for (const id of aufgabenAktiv()) {
    const d = DEF[id], a = aktiv(id)!, done = stand(d, a) >= d.n;
    if (done) { const s = world.stations.find(q => q.id === d.station); if (s) out.push({ x: s.x, y: s.y + 60, z: s.z, label: `ABGABE · ${d.titel.toUpperCase()}`, col, big: true }); continue; }
    if (id === 'dichtungen') { const o = ortById('altewerft'); if (o) out.push({ x: o.x, y: o.y + 40, z: o.z, label: 'ALTE WERFT · DICHTUNGEN', col, big: true }); }
    if (id === 'eisproben') probenBrocken().forEach((r, i) => out.push({ x: r.x, y: r.y, z: r.z, label: `PROBE ${i + 1}`, col }));
    if (id === 'eislieferung') { const f = world.fields.find(q => q.def.kind === 'ice'); if (f && P.cargo.eis < d.n) out.push({ x: f.x, y: f.y, z: f.z, label: 'REIFSCHLEIER · EIS', col, big: true }); }
  }
  return out;
}
/** Flottenband: aktive Aufgaben (für die Liste der Aufträge) */
export function aufgabenListe() {
  return aufgabenAktiv().map(id => { const d = DEF[id], a = aktiv(id)!; return { id, titel: d.titel, n: stand(d, a), max: d.n, lohn: d.lohn, ruf: d.ruf, ort: stName(d.station), rest: d.zeit ? rest(d, a) : null }; });
}
export function aufgabeAbbrechen(id: string) { const d = DEF[id]; if (d) fail(d); }
