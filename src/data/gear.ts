// =====================================================================================
// Persönliche Gegenstände des Piloten: Ausrüstung zum Anlegen, Verbrauchsgüter und Fundstücke.
// Getrennt von den Handelsgütern im Frachtraum (data/items.ts). Jeder Gegenstand belegt einen Platz im Rucksack;
// stapelbare liegen bis zur Stapelgröße auf einem Platz.
// =====================================================================================

// Art des Gegenstands: die ersten sechs lassen sich anlegen, 'verbrauch' wird benutzt, 'fund' nur verkauft
export type GearKind = 'helm' | 'anzug' | 'rucksack' | 'waffe' | 'werkzeug' | 'modul' | 'verbrauch' | 'fund';
// Plätze am Körper (zwei Module)
export type GearSlot = 'helm' | 'anzug' | 'rucksack' | 'waffe' | 'werkzeug' | 'modul1' | 'modul2';
export const GEAR_SLOTS: GearSlot[] = ['helm', 'anzug', 'rucksack', 'waffe', 'werkzeug', 'modul1', 'modul2'];
export const SLOT_N: Record<GearSlot, string> = { helm: 'Helm', anzug: 'Anzug', rucksack: 'Rucksack', waffe: 'Waffe', werkzeug: 'Werkzeug', modul1: 'Modul 1', modul2: 'Modul 2' };
export const KIND_N: Record<GearKind, string> = { helm: 'Helm', anzug: 'Anzug', rucksack: 'Rucksack', waffe: 'Waffe', werkzeug: 'Werkzeug', modul: 'Modul', verbrauch: 'Verbrauchsgut', fund: 'Fundstück' };

// Seltenheit: Name und Farbe
export const RARITY = [
  { n: 'Gewöhnlich', c: '#aab4c0' },
  { n: 'Selten', c: '#5fd0ff' },
  { n: 'Episch', c: '#c070ff' },
  { n: 'Legendär', c: '#ffb347' },
] as const;

// Werte: Schutz und Schaden zählen in Kämpfen zu Fuß (kommen mit den Dungeons); die übrigen wirken schon jetzt.
export type StatId = 'schutz' | 'schaden' | 'tempo' | 'handel' | 'abbau' | 'plaetze';
export const STAT_N: Record<StatId, { n: string; unit: string; hint: string }> = {
  schutz: { n: 'Schutz', unit: '', hint: 'Fängt Schaden in Kämpfen zu Fuß ab' },
  schaden: { n: 'Schaden', unit: '', hint: 'Schaden je Treffer in Kämpfen zu Fuß' },
  tempo: { n: 'Lauftempo', unit: ' %', hint: 'Schneller zu Fuß in Stationen' },
  handel: { n: 'Handel', unit: ' %', hint: 'Besserer Erlös beim Warenverkauf' },
  abbau: { n: 'Abbau', unit: ' %', hint: 'Der Rover-Bohrer fördert schneller' },
  plaetze: { n: 'Plätze', unit: '', hint: 'Zusätzliche Plätze im Rucksack' },
};
export const STAT_IDS = Object.keys(STAT_N) as StatId[];
export const HANDEL_MAX = 8;   // Obergrenze für den Handelsbonus (bleibt unter dem Aufschlag der Stationen)

export interface GearDef {
  n: string; kind: GearKind; rar: 0 | 1 | 2 | 3; val: number; desc: string;
  st?: Partial<Record<StatId, number>>;
  stack?: number;                                  // Stapelgröße (fehlt = 1)
  use?: { hull?: number; shield?: number };        // Verbrauchsgut: füllt Hülle oder Schild des Schiffs auf
  shop?: 0 | 1 | 2;                                // im Laden: 0 fast überall, 1 seltener, 2 nur in gefährlichen Sektoren; fehlt = nur zu finden
}

export const GEAR = {
  // ----- Helme -----
  helm_werk: { n: 'Werkshelm', kind: 'helm', rar: 0, val: 120, desc: 'Schlichter Schutzhelm der Hangarmannschaften.', st: { schutz: 4 }, shop: 0 },
  helm_pilot: { n: 'Pilotenhelm Mk II', kind: 'helm', rar: 1, val: 480, desc: 'Geschlossener Helm mit Sichtanzeige.', st: { schutz: 8 }, shop: 0 },
  helm_grenz: { n: 'Grenzwacht-Visier', kind: 'helm', rar: 2, val: 1600, desc: 'Gepanzertes Visier der Grenzwacht, stoßfest.', st: { schutz: 14 }, shop: 2 },
  helm_kristall: { n: 'Kristallvisier', kind: 'helm', rar: 3, val: 5200, desc: 'Aus geschliffenem Ferrit. Zeigt Erzadern im Gestein.', st: { schutz: 20, abbau: 5 } },
  // ----- Anzüge -----
  anzug_overall: { n: 'Bordoverall', kind: 'anzug', rar: 0, val: 90, desc: 'Der Overall, den jeder Pilot der Crew bekommt.', st: { schutz: 3 }, shop: 0 },
  anzug_druck: { n: 'Druckanzug', kind: 'anzug', rar: 1, val: 650, desc: 'Dicht, gefüttert, für Arbeiten im Vakuum.', st: { schutz: 12 }, shop: 0 },
  anzug_exo: { n: 'Exo-Rahmen', kind: 'anzug', rar: 2, val: 2900, desc: 'Leichter Anzug mit Stützmotoren an den Beinen.', st: { schutz: 16, tempo: 12 }, shop: 1 },
  anzug_panzer: { n: 'Gefechtspanzer', kind: 'anzug', rar: 2, val: 2400, desc: 'Schwere Platten. Schützt gut, macht aber langsam.', st: { schutz: 26, tempo: -6 }, shop: 2 },
  anzug_veteran: { n: 'Veteranenrüstung', kind: 'anzug', rar: 3, val: 7800, desc: 'Getragen von den Letzten, die den Rückzug deckten.', st: { schutz: 34, tempo: 4 } },
  // ----- Rucksäcke -----
  ruck_tasche: { n: 'Umhängetasche', kind: 'rucksack', rar: 0, val: 80, desc: 'Kleine Tasche für das Nötigste.', st: { plaetze: 4 }, shop: 0 },
  ruck_feld: { n: 'Feldrucksack', kind: 'rucksack', rar: 1, val: 420, desc: 'Robuster Rucksack mit vielen Fächern.', st: { plaetze: 8 }, shop: 0 },
  ruck_lasten: { n: 'Lastengestell', kind: 'rucksack', rar: 2, val: 1500, desc: 'Tragegestell der Bergleute. Fasst viel, drückt aufs Tempo.', st: { plaetze: 14, tempo: -4 }, shop: 1 },
  ruck_schwebe: { n: 'Schwebetornister', kind: 'rucksack', rar: 3, val: 6000, desc: 'Trägt sein Gewicht selbst.', st: { plaetze: 20 } },
  // ----- Waffen -----
  waffe_pistole: { n: 'Dienstpistole P-7', kind: 'waffe', rar: 0, val: 200, desc: 'Zuverlässige Seitenwaffe der Flotte.', st: { schaden: 8 }, shop: 0 },
  waffe_karabiner: { n: 'Karabiner K-12', kind: 'waffe', rar: 1, val: 900, desc: 'Kurzes Gewehr für enge Gänge.', st: { schaden: 16 }, shop: 1 },
  waffe_flinte: { n: 'Enterflinte', kind: 'waffe', rar: 2, val: 2100, desc: 'Auf kurze Entfernung verheerend.', st: { schaden: 24 }, shop: 2 },
  waffe_impuls: { n: 'Impulsgewehr', kind: 'waffe', rar: 2, val: 3400, desc: 'Verschießt gebündelte Energiestöße.', st: { schaden: 30 }, shop: 2 },
  waffe_splitter: { n: 'Splitterwerfer', kind: 'waffe', rar: 3, val: 9000, desc: 'Ferrox-Technik. Niemand weiß genau, wie er arbeitet.', st: { schaden: 44 } },
  // ----- Werkzeuge -----
  werk_scanner: { n: 'Handscanner', kind: 'werkzeug', rar: 0, val: 150, desc: 'Findet die ergiebigsten Stellen einer Ader.', st: { abbau: 5 }, shop: 0 },
  werk_bohrkopf: { n: 'Gehärteter Bohrkopf', kind: 'werkzeug', rar: 1, val: 700, desc: 'Ersatzkopf für den Rover-Bohrer, hält länger scharf.', st: { abbau: 12 }, shop: 0 },
  werk_resonanz: { n: 'Resonanzbohrer', kind: 'werkzeug', rar: 2, val: 2600, desc: 'Lockert das Gestein, bevor der Bohrer ansetzt.', st: { abbau: 22 }, shop: 1 },
  werk_kernsonde: { n: 'Kernsonde', kind: 'werkzeug', rar: 3, val: 7000, desc: 'Reicht bis in den Kern einer Ader.', st: { abbau: 35 } },
  // ----- Module -----
  mod_servo: { n: 'Servogelenke', kind: 'modul', rar: 1, val: 600, desc: 'Kleine Motoren an Knie und Hüfte.', st: { tempo: 8 }, shop: 0 },
  mod_platte: { n: 'Zusatzplatten', kind: 'modul', rar: 1, val: 500, desc: 'Schraubplatten für Brust und Schultern.', st: { schutz: 6 }, shop: 0 },
  mod_rechner: { n: 'Handelsrechner', kind: 'modul', rar: 1, val: 800, desc: 'Kennt die Preise der letzten Wochen.', st: { handel: 2 }, shop: 1 },
  mod_logbuch: { n: 'Prospektoren-Logbuch', kind: 'modul', rar: 2, val: 1900, desc: 'Aufzeichnungen eines alten Schürfers.', st: { abbau: 8, handel: 1 }, shop: 1 },
  mod_siegel: { n: 'Gildensiegel', kind: 'modul', rar: 2, val: 2800, desc: 'Wer es trägt, bekommt bei Händlern bessere Preise.', st: { handel: 4 }, shop: 2 },
  // ----- Verbrauchsgüter -----
  vb_schaum: { n: 'Reparaturschaum', kind: 'verbrauch', rar: 0, val: 60, desc: 'Dichtet Risse in der Hülle. Stellt 25 Hüllenpunkte wieder her.', stack: 10, use: { hull: 25 }, shop: 0 },
  vb_zelle: { n: 'Schildzelle', kind: 'verbrauch', rar: 1, val: 110, desc: 'Lädt den Schild des Schiffs sofort um 40 Punkte auf.', stack: 10, use: { shield: 40 }, shop: 0 },
  // ----- Fundstücke -----
  fund_datenkern: { n: 'Datenkern', kind: 'fund', rar: 1, val: 350, desc: 'Speicher aus einem Ferrox-Wrack. Händler zahlen gut dafür.', stack: 20 },
  fund_relikt: { n: 'Ferrox-Relikt', kind: 'fund', rar: 2, val: 1400, desc: 'Ein Bauteil unbekannten Zwecks.', stack: 10 },
  fund_siegel: { n: 'Altes Flottensiegel', kind: 'fund', rar: 3, val: 5000, desc: 'Abzeichen eines Schiffs, das nie zurückkam.', stack: 5 },
} satisfies Record<string, GearDef>;
export type GearId = keyof typeof GEAR;
export const GEAR_IDS = Object.keys(GEAR) as GearId[];
export const gearDef = (id: string): GearDef | undefined => (GEAR as Record<string, GearDef>)[id];
export const slotKind = (s: GearSlot): GearKind => (s === 'modul1' || s === 'modul2' ? 'modul' : s);
