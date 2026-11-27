// =====================================================================================
// Gesicht der Spielerfigur (Gesichts-Editor, seit 2026-11-27; docs/gesicht-editor.md). Ein Grundkopf aus dem MetaHuman mit
// 16 Kopfform-Morphs (form_*), dazu Hautton, Irisfarbe und je Haarplatz eine Auswahl. Gespeichert und übers Netz geschickt wird nur
// ein kurzer Code (URL-sicheres Base64, 35 Zeichen). Dieselbe Kodierung nutzt die Testseite public/gesicht.html.
// Nur bei „Neuer Pilot“ wählbar; danach bleibt das Gesicht (Wunsch des Spielers).
// =====================================================================================

export const FORM: [string, [string, string][]][] = [
  ['Kopf', [['kopf_breite', 'Kopfbreite'], ['stirn_hoehe', 'Stirnhöhe']]],
  ['Augen', [['augen_abstand', 'Abstand'], ['augen_hoehe', 'Höhe'], ['augen_groesse', 'Größe']]],
  ['Nase', [['nase_laenge', 'Länge'], ['nase_breite', 'Breite'], ['nasenruecken', 'Nasenrücken']]],
  ['Wangen', [['wangenknochen', 'Wangenknochen'], ['wangen_fuelle', 'Fülle']]],
  ['Mund', [['mund_breite', 'Breite'], ['lippen_volumen', 'Lippen']]],
  ['Kinn und Kiefer', [['kiefer_breite', 'Kieferbreite'], ['kinn_laenge', 'Kinnlänge'], ['kinn_breite', 'Kinnbreite']]],
  ['Ohren', [['ohr_groesse', 'Größe']]],
];
export const FORM_KEYS = FORM.flatMap(g => g[1].map(x => x[0]));

export const HAARFARBEN: [string, string][] = [['#e8e2d6', 'Weißgrau'], ['#9a9c9f', 'Grau'], ['#d8b77a', 'Blond'], ['#8a5a32', 'Hellbraun'], ['#4a2e1c', 'Braun'],
  ['#1c1714', 'Schwarz'], ['#9c3a1e', 'Rot'], ['#3a6ea8', 'Blau']];
/** Hautton: Farbleiste in sRGB; Stufe 3 ist die Originalhaut des MetaHuman (Mittelwert der Textur). Der Shader multipliziert je Kanal mit Ziel/Original. */
export const HAUT: [number, number, number][] = [[0.97, 0.84, 0.75], [0.90, 0.72, 0.61], [0.78, 0.58, 0.47], [0.581, 0.394, 0.313], [0.44, 0.29, 0.21], [0.30, 0.19, 0.14], [0.20, 0.13, 0.10]];
export const IRIS: [string, string][] = [['#4f7fb8', 'Blau'], ['#7da6c9', 'Hellblau'], ['#5f8a5a', 'Grün'], ['#8a8a5a', 'Haselnuss'], ['#7b5a3a', 'Hellbraun'],
  ['#3e2a1c', 'Dunkelbraun'], ['#8d949b', 'Grau'], ['#c08a2a', 'Bernstein'], ['#9b3030', 'Rot'], ['#7a4fb0', 'Violett']];

export type HaarPlatz = 'frisur' | 'bart' | 'schnurr' | 'brauen';
export const HAAR_PLAETZE: HaarPlatz[] = ['frisur', 'bart', 'schnurr', 'brauen'];
const liste = (pre: string, l: [string, string][]) => l.map(([f, n]) => [pre + f, n] as [string, string]);
/** je Platz: Wahl 0 = ohne, 1 = Haar des MetaHuman selbst, danach die Grooms aus dem MetaHuman-Plugin. Datei: lazy/Gesicht_<id> */
export const HAAR: Record<HaarPlatz, { n: string; ohne: string; opts: [string, string][] }> = {
  frisur: { n: 'Frisur', ohne: 'Glatze', opts: [['haar_haare', 'Hochgestrichen'], ...liste('haar_frisur_', [['kurz_klassisch', 'Kurz klassisch'], ['zurueckgekaemmt', 'Zurückgekämmt'],
    ['wuschelig', 'Wuschelig'], ['undercut', 'Undercut'], ['irokese', 'Irokese'], ['fade_locken', 'Fade mit Locken'], ['geheimratsecken', 'Geheimratsecken'], ['zopf', 'Zopf'],
    ['flechtdutt', 'Flechtdutt'], ['lang_glatt', 'Lang glatt'], ['bob_locken', 'Bob mit Locken'], ['afro', 'Afro']])] },
  bart: { n: 'Bart', ohne: 'Glatt rasiert', opts: [['haar_bart', 'Kurz gelockt'], ...liste('haar_bart_', [['vollbart_lang', 'Vollbart lang'], ['vollbart_kurz', 'Vollbart kurz'],
    ['wild', 'Wild'], ['locken', 'Locken'], ['spitzbart', 'Spitzbart'], ['kinnriemen', 'Kinnriemen']])] },
  schnurr: { n: 'Schnurrbart', ohne: 'Ohne', opts: [['haar_schnurrbart', 'Gelockt'], ...liste('haar_schnurr_', [['lenker', 'Lenker'], ['western', 'Western'], ['voll', 'Voll'], ['strich', 'Strich']])] },
  brauen: { n: 'Brauen', ohne: 'Ohne', opts: [['haar_brauen', 'Flach dicht'], ...liste('haar_brauen_', [['duenn', 'Dünn'], ['dicht', 'Dicht'], ['bogen', 'Bogen'], ['buschig', 'Buschig']])] },
};
export const KOPF_DATEI = 'lazy/Gesicht_kopf_mh';
export const haarDatei = (p: HaarPlatz, wahl: number) => { const o = wahl > 0 ? HAAR[p].opts[wahl - 1] : null; return o ? 'lazy/Gesicht_' + o[0] : null; };

export interface Gesicht { form: Record<string, number>; haut: number; haar: number; iris: string; wahl: Record<HaarPlatz, number> }
export const neuesGesicht = (): Gesicht => ({ form: Object.fromEntries(FORM_KEYS.map(k => [k, 0])), haut: 50, haar: 4, iris: IRIS[0][0], wahl: { frisur: 2, bart: 0, schnurr: 0, brauen: 2 } });

// Kodierung (Version 2): Version, 16 Regler (je 1 Byte, -100..100 → 0..200), Hautton (0..100), Haarfarbe, Iris (RGB), je Haarplatz die Nummer.
// Version 1 (Testseite, Teile als Bits) wird noch gelesen.
export function gesichtCode(g: Gesicht): string {
  const ic = parseInt(g.iris.slice(1), 16) || 0;
  const b = [2, ...FORM_KEYS.map(k => Math.round(Math.max(-1, Math.min(1, g.form[k] || 0)) * 100) + 100), g.haut, g.haar, ic >> 16, (ic >> 8) & 255, ic & 255, ...HAAR_PLAETZE.map(p => g.wahl[p])];
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** Code lesen; ungültig oder leer: null */
export function gesichtAus(code: string | null | undefined): Gesicht | null {
  if (!code) return null;
  try {
    const b = [...atob(code.replace(/-/g, '+').replace(/_/g, '/'))].map(c => c.charCodeAt(0));
    if ((b[0] !== 1 && b[0] !== 2) || b.length < FORM_KEYS.length + 4) return null;
    const g = neuesGesicht();
    FORM_KEYS.forEach((k, i) => g.form[k] = Math.max(-1, Math.min(1, (b[1 + i] - 100) / 100)));
    let i = 1 + FORM_KEYS.length;
    g.haut = Math.min(100, b[i++]); g.haar = Math.min(HAARFARBEN.length - 1, b[i++]);
    if (b.length >= FORM_KEYS.length + 7) g.iris = '#' + ((b[i++] << 16) | (b[i++] << 8) | b[i++]).toString(16).padStart(6, '0');
    if (b[0] === 1) { const t = b[i]; HAAR_PLAETZE.forEach((p, j) => g.wahl[p] = (t >> j) & 1 ? 1 : 0); }
    else HAAR_PLAETZE.forEach(p => g.wahl[p] = Math.min(HAAR[p].opts.length, b[i++] ?? 0));
    return g;
  } catch { return null; }
}
export function zufallsGesicht(): Gesicht {
  const g = neuesGesicht(), r = Math.random;
  for (const k of FORM_KEYS) g.form[k] = Math.round((r() * 2 - 1) * 70) / 100;
  g.haut = Math.round(r() * 100); g.haar = Math.floor(r() * 6); g.iris = IRIS[Math.floor(r() * 8)][0];
  const zw = (p: HaarPlatz, leer: number) => (r() < leer ? 0 : 1 + Math.floor(r() * HAAR[p].opts.length));
  g.wahl = { frisur: zw('frisur', 0.1), bart: zw('bart', 0.45), schnurr: zw('schnurr', 0.7), brauen: zw('brauen', 0) };
  if (g.wahl.bart) g.wahl.schnurr = 0;
  return g;
}
/** Hautton als Faktor je Kanal (linear) gegenüber der Originalhaut */
export function hautFaktor(haut: number, lin: (c: [number, number, number]) => [number, number, number]): [number, number, number] {
  const x = haut / 100 * (HAUT.length - 1), i = Math.min(HAUT.length - 2, Math.floor(x)), f = x - i;
  const a = lin(HAUT[i]), b = lin(HAUT[i + 1]), o = lin(HAUT[3]);
  return [0, 1, 2].map(k => (a[k] + (b[k] - a[k]) * f) / o[k]) as [number, number, number];
}
