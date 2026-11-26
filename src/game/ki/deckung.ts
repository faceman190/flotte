import { type Quader, type Sicht, type Boden, achsen, imQuader } from './typen';

// =====================================================================================
// Deckungspunkte (seit 26.11.2026). Einmal je Ort aus den Hindernissen erzeugt, dann je Gegner und Lage bewertet (wie EQS in Unreal).
//
// Erzeugen: an jeder Seite eines Quaders alle 1,3 m ein Punkt, 0,6 m vor der Fläche, Blick zur Fläche hin.
//  - halbhoch (0,8 bis 1,55 m): Deckung im Hocken, zum Schießen aufstehen (über die Kante hinweg).
//  - hoch (ab 1,55 m): nur die Punkte an den Enden einer Seite; geschossen wird seitlich an der Kante vorbei (seite = −1 oder +1).
//    Punkte in der Mitte einer hohen Wand taugen nur zum Verstecken (seite = 0), etwa zum Nachladen.
//  - Punkte in einem anderen Hindernis, auf Wasser oder an zu steilen Stellen fallen weg (frei(x, z) des Aufrufers).
//
// Bewerten (bewerte): Schutz vor dem Ziel (Sichtlinie zu Brust und Kopf in Deckungshaltung verdeckt), freie Schusslinie aus der
// Schussposition, Abstand zum Ziel passend zur Waffe, Weg dorthin (kurz, nicht am Ziel vorbei), Abstand zu den Kameraden.
// =====================================================================================

export type DeckArt = 'halb' | 'voll';
export interface Deckung {
  id: number;
  x: number; y: number; z: number;
  nx: number; nz: number;          // zeigt von der Deckung weg (Rücken des Gegners zur Fläche, Blick über die Fläche = −n)
  tx: number; tz: number;          // entlang der Fläche
  art: DeckArt;
  seite: -1 | 0 | 1 | 2;           // hohe Deckung: an welcher Kante man herauslehnen kann (0 = nur verstecken, 2 = an beiden)
  lehne: -1 | 0 | 1;               // gewählte Seite für das aktuelle Ziel (besteDeckung)
  belegt: number;                  // Kennung des Gegners, der hier steht oder hinläuft (−1 = frei)
  q: number;                       // Index des Quaders
}

export const DECK = {
  abstand: 0.6,                    // vor der Fläche
  schritt: 1.3,                    // Punkte entlang der Fläche
  halbMin: 0.8, vollMin: 1.55,
  augeHock: 1.05, brustHock: 0.8,  // Höhen in Deckungshaltung (über dem Boden)
  augeStand: 1.55, brustStand: 1.25,
  lehnen: 0.75,                    // seitlicher Schritt aus hoher Deckung
};

export function erzeugeDeckung(quader: Quader[], boden: Boden, frei: (x: number, z: number) => boolean): Deckung[] {
  const out: Deckung[] = [];
  quader.forEach((q, qi) => {
    if (q.h < DECK.halbMin) return;
    const art: DeckArt = q.h >= DECK.vollMin ? 'voll' : 'halb';
    const { ax, az, bx, bz } = achsen(q);
    // vier Seiten: Normale n, Tangente t, halbe Länge L, Abstand der Fläche von der Mitte e
    const seiten = [
      { nx: ax, nz: az, tx: bx, tz: bz, L: q.hz, e: q.hx },
      { nx: -ax, nz: -az, tx: -bx, tz: -bz, L: q.hz, e: q.hx },
      { nx: bx, nz: bz, tx: -ax, tz: -az, L: q.hx, e: q.hz },
      { nx: -bx, nz: -bz, tx: ax, tz: az, L: q.hx, e: q.hz },
    ];
    for (const s of seiten) {
      const n = Math.max(1, Math.floor((2 * s.L - 0.6) / DECK.schritt) + 1);
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : -s.L + 0.3 + i * (2 * s.L - 0.6) / (n - 1);
        let seite: -1 | 0 | 1 | 2 = 0;
        if (art === 'voll') { const r = t > s.L - 0.9, l = t < -s.L + 0.9; seite = r && l ? 2 : r ? 1 : l ? -1 : 0; }
        const x = q.x + s.nx * (s.e + DECK.abstand) + s.tx * t, z = q.z + s.nz * (s.e + DECK.abstand) + s.tz * t;
        if (!frei(x, z)) continue;
        if (quader.some((o, oi) => oi !== qi && imQuader(o, x, z, 0.35))) continue;
        // hohe Deckung: Lehnposition muss frei sein
        const lehnFrei = (k: number) => { const lx = x + s.tx * k * DECK.lehnen * 1.4, lz = z + s.tz * k * DECK.lehnen * 1.4; return frei(lx, lz) && !quader.some(o => imQuader(o, lx, lz, 0.3)); };
        if (seite) { const r = (seite === 1 || seite === 2) && lehnFrei(1), l = (seite === -1 || seite === 2) && lehnFrei(-1); seite = r && l ? 2 : r ? 1 : l ? -1 : 0; }
        out.push({ id: out.length, x, y: boden(x, z), z, nx: s.nx, nz: s.nz, tx: s.tx, tz: s.tz, art, seite, lehne: seite === 2 ? 1 : seite as -1 | 0 | 1, belegt: -1, q: qi });
      }
    }
  });
  return out;
}

/** Schussposition (Augen) an einer Deckung: aufgestanden bzw. seitlich herausgelehnt (Seite: die gewählte oder die angegebene) */
export function schussPunkt(d: Deckung, seite: number = d.lehne) {
  const k = d.art === 'voll' ? seite * DECK.lehnen : 0;
  return { x: d.x + d.tx * k, y: d.y + DECK.augeStand, z: d.z + d.tz * k };
}

/** schützt die Deckung vor einem Schützen an (zx, zy, zz) (Augenhöhe)? */
export function schuetzt(d: Deckung, zx: number, zy: number, zz: number, sicht: Sicht) {
  // Ziel muss auf der anderen Seite des Hindernisses stehen
  if ((zx - d.x) * d.nx + (zz - d.z) * d.nz > -0.2) return false;
  const kopf = d.art === 'voll' ? DECK.augeStand + 0.15 : DECK.augeHock;
  const brust = d.art === 'voll' ? DECK.brustStand : DECK.brustHock;
  return !sicht(zx, zy, zz, d.x, d.y + kopf, d.z) && !sicht(zx, zy, zz, d.x, d.y + brust, d.z);
}

export interface DeckWunsch {
  ich: { x: number; z: number; id: number };
  ziel: { x: number; y: number; z: number };   // Augen des Ziels
  ideal: [number, number];                      // Abstand zum Ziel, der der Waffe liegt (von, bis)
  kameraden: { x: number; z: number }[];         // Standorte bzw. Ziele der anderen im Trupp
  nurVerstecken?: boolean;                       // Schusslinie egal (Nachladen, Rückzug)
  flanke?: { x: number; z: number } | null;      // bevorzugte Richtung (Flankieren): Punkte dort zählen mehr
  maxWeg?: number;
  meiden?: { x: number; z: number; r: number } | null;   // nicht hier (Flankieren: weg vom bisherigen Platz)
}

export interface DeckWert { d: Deckung; wert: number; teile: Record<string, number>; lehne: -1 | 0 | 1 }

/**
 * Beste Deckung für den Wunsch. Sichtprüfungen sind teuer: erst grob nach Lage, Seite und Abstand vorsortieren, dann höchstens
 * `budget` Punkte mit Sichtlinien prüfen.
 */
export function besteDeckung(liste: Deckung[], w: DeckWunsch, sicht: Sicht, budget = 14): DeckWert | null {
  const maxWeg = w.maxWeg ?? 28;
  const grob: { d: Deckung; g: number; teile: Record<string, number> }[] = [];
  for (const d of liste) {
    if (d.belegt >= 0 && d.belegt !== w.ich.id) continue;
    if (!w.nurVerstecken && d.art === 'voll' && d.seite === 0) continue;
    const zx = w.ziel.x - d.x, zz = w.ziel.z - d.z, zd = Math.hypot(zx, zz);
    if (zd < 3) continue;
    if ((zx * d.nx + zz * d.nz) / zd > -0.35) continue;                  // Ziel nicht hinter der Fläche
    const weg = Math.hypot(d.x - w.ich.x, d.z - w.ich.z);
    if (weg > maxWeg) continue;
    if (w.meiden && Math.hypot(d.x - w.meiden.x, d.z - w.meiden.z) < w.meiden.r) continue;
    // Weg führt nicht am Ziel vorbei: Abstand des Ziels zur Strecke ich → Deckung
    const sx = d.x - w.ich.x, sz = d.z - w.ich.z, sl = Math.max(0.01, weg);
    const tt = Math.max(0, Math.min(1, ((w.ziel.x - w.ich.x) * sx + (w.ziel.z - w.ich.z) * sz) / (sl * sl)));
    const nah = Math.hypot(w.ich.x + sx * tt - w.ziel.x, w.ich.z + sz * tt - w.ziel.z);
    if (nah < 4) continue;
    const [lo, hi] = w.ideal;
    const abst = zd < lo ? zd / lo : zd > hi ? Math.max(0, 1 - (zd - hi) / hi) : 1;
    const wegW = 1 - weg / maxWeg;
    let team = 1;
    for (const k of w.kameraden) { const kd = Math.hypot(k.x - d.x, k.z - d.z); if (kd < 3.5) team = Math.min(team, kd / 3.5); }
    let flanke = 0.5;
    if (w.flanke) { const fl = Math.hypot(w.flanke.x, w.flanke.z) || 1, ox = d.x - w.ziel.x, oz = d.z - w.ziel.z, ol = Math.hypot(ox, oz) || 1; flanke = 0.5 + 0.5 * (ox * w.flanke.x + oz * w.flanke.z) / (fl * ol); }
    const teile = { abstand: w.nurVerstecken ? 1 : abst, weg: wegW, team, flanke, nah: Math.min(1, nah / 10) };
    const g = teile.abstand * 1.2 + teile.weg * 1.0 + teile.team * 0.8 + (w.flanke ? teile.flanke * 1.4 : 0) + teile.nah * 0.4 + (d.art === 'voll' ? 0.15 : 0);
    grob.push({ d, g, teile });
  }
  grob.sort((a, b) => b.g - a.g);
  let best: DeckWert | null = null;
  for (const c of grob.slice(0, budget)) {
    if (!schuetzt(c.d, w.ziel.x, w.ziel.y, w.ziel.z, sicht)) continue;
    let schuss = 1;
    let lehne = c.d.lehne;
    if (!w.nurVerstecken) {
      const seiten: number[] = c.d.art === 'halb' ? [0] : c.d.seite === 2 ? [1, -1] : [c.d.seite];
      const frei = seiten.find(k => { const p = schussPunkt(c.d, k); return sicht(p.x, p.y, p.z, w.ziel.x, w.ziel.y - 0.2, w.ziel.z); });
      if (frei === undefined) continue;
      lehne = frei as -1 | 0 | 1;
    }
    const wert = c.g + schuss * 0.5;
    if (!best || wert > best.wert) best = { d: c.d, wert, teile: { ...c.teile, schuss }, lehne };
  }
  return best;
}
