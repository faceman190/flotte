import { clamp01 } from './typen';

// =====================================================================================
// Entscheiden (seit 26.11.2026): Utility-KI. Alle 0,3 bis 0,5 s bewertet jeder Gegner seine Möglichkeiten mit Zahlen von 0 bis 1 und nimmt
// die beste. Die laufende Aktion bekommt einen Bonus (Trägheit), damit niemand zwischen zwei fast gleich guten hin- und herspringt.
// Wie eine Aktion ausgeführt wird (hinlaufen, hocken, aufstehen, schießen), entscheidet pluenderer.ts mit einem kleinen Ablauf je Aktion.
//
// Die Werte sind bewusst einfach gehalten und stehen alle in GEWICHT bzw. in den Formeln unten: Wer das Verhalten ändern will,
// dreht hier. Die Debug-Ansicht im Testlabor zeigt die Werte über jedem Gegner.
// =====================================================================================

export type Aktion = 'streife' | 'untersuchen' | 'sichern' | 'deckung' | 'schiessen' | 'flankieren' | 'nachladen' | 'rueckzug' | 'ausweichen' | 'stuermen';

export interface Lage {
  hp: number;                 // 0..1
  mag: number;                // 0..1 Magazin
  wach: number;               // 0..1
  sieht: boolean;             // Ziel sichtbar und entdeckt, oder aus der Schussposition der Deckung zu sehen (dann zum Schießen herauskommen)
  zielDist: number;           // m (Infinity ohne Ziel)
  zuletztAlter: number;       // s seit zuletzt gesehen/gehört (Infinity = nie)
  inDeckung: boolean;         // steht an einer Deckung, die vor dem Ziel schützt
  deckungFrei: boolean;       // es gibt eine brauchbare Deckung in Reichweite
  unterFeuer: number;         // 0..1 (Treffer und knappe Schüsse der letzten Sekunden)
  feuerFrei: boolean;         // darf schießen (der Trupp gibt höchstens zwei gleichzeitig frei)
  granate: boolean;           // Granate in der Nähe
  rolle: 'feuer' | 'vor';     // Feuerschutz oder vorrücken
  truppAnteil: number;        // 0..1 noch lebende Anteile des Trupps
  ideal: [number, number];    // Abstand, der der Waffe liegt
  flankeFrei: boolean;        // ein Flankenpunkt wurde gefunden
  aktion: Aktion;             // laufende Aktion
  zeit: number;               // s in der laufenden Aktion
}

export const GEWICHT = { traegheit: 0.12 };

const kurve = (x: number, lo: number, hi: number) => clamp01((x - lo) / (hi - lo));

export function bewerte(l: Lage): Record<Aktion, number> {
  const kampf = l.wach >= 1 && l.zuletztAlter < 25;      // wach: der Aufrufer gibt im Kampf 1 (Sinne.kampf)
  const [lo, hi] = l.ideal, d = l.zielDist;
  const zuNah = d < lo * 0.6, zuWeit = d > hi;
  const angst = clamp01((1 - l.hp) * 1.1 + l.unterFeuer * 0.5 + (1 - l.truppAnteil) * 0.4);
  const w: Record<Aktion, number> = {
    streife: l.wach < 0.35 ? 0.3 : 0,
    untersuchen: !kampf && l.wach >= 0.35 && l.zuletztAlter < 30 ? 0.45 + 0.2 * l.wach : 0,
    sichern: kampf && !l.sieht ? 0.35 + 0.25 * kurve(l.zuletztAlter, 0, 8) : 0,
    // Deckung: unter Feuer, ohne Deckung, die Gefahr wächst
    deckung: kampf && !l.inDeckung && l.deckungFrei ? 0.45 + 0.35 * l.unterFeuer + 0.2 * (l.sieht ? 1 : 0) + 0.15 * angst : 0,
    // Schießen: sieht das Ziel, hat Munition und Freigabe; aus Deckung lieber als im Freien
    schiessen: kampf && l.sieht && l.mag > 0 ? (l.feuerFrei ? 0.55 : 0.12) + (l.inDeckung ? 0.25 : 0) - 0.3 * l.unterFeuer * (l.inDeckung ? 0 : 1) - (zuWeit ? 0.15 : 0) : 0,
    // Flankieren: Rolle „vor“, eigenes Ziel nicht zu sehen oder festgenagelt, gesund genug
    flankieren: kampf && l.rolle === 'vor' && l.flankeFrei && l.hp > 0.45 ? 0.35 + 0.25 * kurve(l.zeit, 4, 12) * (l.aktion === 'schiessen' || l.aktion === 'deckung' || l.aktion === 'sichern' ? 1 : 0) + (l.sieht ? 0 : 0.25) : 0,
    nachladen: l.mag <= 0 ? 0.95 : l.mag < 0.3 && (!l.sieht || l.inDeckung) ? 0.5 : 0,
    rueckzug: kampf && angst > 0.65 && l.deckungFrei ? 0.45 + 0.6 * (angst - 0.65) / 0.35 : 0,
    ausweichen: l.granate ? 1 : 0,
    // Stürmen: Ziel ganz nah, selbst gesund, Ziel nicht in Deckung zu erreichen
    stuermen: kampf && l.sieht && zuNah && l.hp > 0.6 && l.mag > 0.3 ? 0.62 : 0,
  };
  // angekommen: Flankieren ist erledigt, sobald die neue Deckung erreicht ist; Rückzug nach ein paar Sekunden Verschnaufen
  if (l.aktion === 'flankieren' && l.inDeckung && l.zeit > 1) w.flankieren = 0;
  if (l.aktion === 'rueckzug' && l.inDeckung) w.rueckzug *= 1 - kurve(l.zeit, 4, 10);
  else if (l.inDeckung && l.unterFeuer < 0.5) w.rueckzug *= 0.5;      // schon geschützt: erst bei neuem Beschuss weiter zurück
  w[l.aktion] += GEWICHT.traegheit;
  return w;
}

export function waehle(l: Lage): { aktion: Aktion; werte: Record<Aktion, number> } {
  const werte = bewerte(l);
  let best: Aktion = 'streife', bw = -1;
  for (const k of Object.keys(werte) as Aktion[]) if (werte[k] > bw) { bw = werte[k]; best = k; }
  return { aktion: best, werte };
}

// ---------- Trupp: Feuerfreigabe (höchstens zwei schießen zugleich auf dasselbe Ziel) ----------
// Wie in vielen Deckungsshootern: Wer nicht schießen darf, sucht Deckung oder rückt vor. Die Freigabe wandert alle paar Sekunden weiter,
// damit nicht immer dieselben zwei feuern.
export class Freigabe {
  private halter = new Map<number, number>();     // Gegner → Ablaufzeit
  private pause = new Map<number, number>();      // Gegner → frühestens wieder frei (nach Ablauf erst die anderen)
  constructor(public max = 2, public dauer = 3.2, public warte = 1.6) {}
  frei(id: number, jetzt: number, will: boolean): boolean {
    for (const [k, t] of this.halter) if (t < jetzt) { this.halter.delete(k); this.pause.set(k, jetzt + this.warte); }
    if (!will) { this.halter.delete(id); return false; }
    if (this.halter.has(id)) return true;
    if ((this.pause.get(id) ?? -1) > jetzt) return false;
    if (this.halter.size < this.max) { this.halter.set(id, jetzt + this.dauer * (0.75 + Math.random() * 0.5)); return true; }
    return false;
  }
  weg(id: number) { this.halter.delete(id); this.pause.delete(id); }
  get anzahl() { return this.halter.size; }
}
