// =====================================================================================
// Persönliche Gegenstände des Piloten: Ausrüstung zum Anlegen, Verbrauchsgüter und Fundstücke.
// Getrennt von den Handelsgütern im Frachtraum (data/items.ts). Jeder Gegenstand belegt einen Platz im Rucksack;
// stapelbare liegen bis zur Stapelgröße auf einem Platz.
// =====================================================================================

// Art des Gegenstands: die ersten sechs lassen sich anlegen, 'verbrauch' wird benutzt, 'fund' nur verkauft
export type GearKind = 'helm' | 'anzug' | 'rucksack' | 'waffe' | 'werkzeug' | 'modul' | 'verbrauch' | 'fund' | 'schiffswaffe' | 'schiffsabwehr' | 'schiffsantrieb' | 'schiffssystem';
// Plätze am Körper (zwei Module)
export type GearSlot = 'helm' | 'anzug' | 'rucksack' | 'waffe' | 'werkzeug' | 'modul1' | 'modul2';
export const GEAR_SLOTS: GearSlot[] = ['helm', 'anzug', 'rucksack', 'waffe', 'werkzeug', 'modul1', 'modul2'];
export const SLOT_N: Record<GearSlot, string> = { helm: 'Helm', anzug: 'Anzug', rucksack: 'Rucksack', waffe: 'Waffe', werkzeug: 'Werkzeug', modul1: 'Modul 1', modul2: 'Modul 2' };
export const KIND_N: Record<GearKind, string> = {
  helm: 'Helm', anzug: 'Anzug', rucksack: 'Rucksack', waffe: 'Waffe', werkzeug: 'Werkzeug', modul: 'Modul', verbrauch: 'Verbrauchsgut', fund: 'Fundstück',
  schiffswaffe: 'Waffensystem', schiffsabwehr: 'Abwehrsystem', schiffsantrieb: 'Antrieb', schiffssystem: 'Bordsystem',
};
// Plätze am Schiff (zwei Bordsysteme). Module gehören zum Schiff, in das sie eingebaut sind.
export type ShipSlot = 'waffe' | 'abwehr' | 'antrieb' | 'system1' | 'system2';
export const SHIP_SLOTS: ShipSlot[] = ['waffe', 'abwehr', 'antrieb', 'system1', 'system2'];
export const SHIP_SLOT_N: Record<ShipSlot, string> = { waffe: 'Waffensystem', abwehr: 'Abwehrsystem', antrieb: 'Antrieb', system1: 'Bordsystem 1', system2: 'Bordsystem 2' };
export const shipSlotKind = (s: ShipSlot): GearKind => (s === 'waffe' ? 'schiffswaffe' : s === 'abwehr' ? 'schiffsabwehr' : s === 'antrieb' ? 'schiffsantrieb' : 'schiffssystem');
export const isShipKind = (k: GearKind) => k.startsWith('schiff');

// Seltenheit: Name und Farbe
export const RARITY = [
  { n: 'Gewöhnlich', c: '#aab4c0' },
  { n: 'Selten', c: '#5fd0ff' },
  { n: 'Episch', c: '#c070ff' },
  { n: 'Legendär', c: '#ffb347' },
] as const;

// Werte: Schutz und Schaden zählen in Kämpfen zu Fuß (kommen mit den Dungeons); die übrigen wirken schon jetzt.
export type StatId = 'schutz' | 'schaden' | 'tempo' | 'handel' | 'abbau' | 'plaetze' | 's_dmg' | 's_rate' | 's_hull' | 's_shield' | 's_speed' | 's_turn' | 's_cargo' | 's_laser' | 's_scan';
export const STAT_N: Record<StatId, { n: string; unit: string; hint: string }> = {
  schutz: { n: 'Schutz', unit: '', hint: 'Fängt Schaden in Kämpfen zu Fuß ab' },
  schaden: { n: 'Schaden', unit: '', hint: 'Schaden je Treffer in Kämpfen zu Fuß' },
  tempo: { n: 'Lauftempo', unit: ' %', hint: 'Schneller zu Fuß in Stationen' },
  handel: { n: 'Handel', unit: ' %', hint: 'Besserer Erlös beim Warenverkauf' },
  abbau: { n: 'Abbau', unit: ' %', hint: 'Der Rover-Bohrer fördert schneller' },
  plaetze: { n: 'Plätze', unit: '', hint: 'Zusätzliche Plätze im Rucksack' },
  // Schiffsmodule (alle in Prozent des Schiffswerts)
  s_dmg: { n: 'Waffenschaden', unit: ' %', hint: 'Schaden der Bordkanonen' },
  s_rate: { n: 'Feuerrate', unit: ' %', hint: 'Schüsse je Sekunde' },
  s_hull: { n: 'Hülle', unit: ' %', hint: 'Hüllenpunkte des Schiffs' },
  s_shield: { n: 'Schild', unit: ' %', hint: 'Schildpunkte des Schiffs' },
  s_speed: { n: 'Höchsttempo', unit: ' %', hint: 'Höchsttempo und Beschleunigung' },
  s_turn: { n: 'Wendigkeit', unit: ' %', hint: 'Wie schnell das Schiff dreht' },
  s_cargo: { n: 'Frachtraum', unit: ' %', hint: 'Größe des Frachtraums' },
  s_laser: { n: 'Bergbaulaser', unit: ' %', hint: 'Förderleistung des Lasers' },
  s_scan: { n: 'Scanner', unit: ' %', hint: 'Reichweite von Scanner und Radar' },
};
export const PILOT_STATS: StatId[] = ['schutz', 'schaden', 'tempo', 'handel', 'abbau', 'plaetze'];
export const SHIP_STATS: StatId[] = ['s_dmg', 's_rate', 's_hull', 's_shield', 's_speed', 's_turn', 's_cargo', 's_laser', 's_scan'];
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
  helm_sturm: { n: 'Sturmhelm', kind: 'helm', rar: 2, val: 1900, desc: 'Geschlossener Kampfhelm mit verspiegeltem Visier und Funkmodulen.', st: { schutz: 15 }, shop: 1 },
  helm_kristall: { n: 'Kristallvisier', kind: 'helm', rar: 3, val: 5200, desc: 'Aus geschliffenem Ferrit. Zeigt Erzadern im Gestein.', st: { schutz: 20, abbau: 5 } },
  // ----- Anzüge -----
  anzug_overall: { n: 'Bordoverall', kind: 'anzug', rar: 0, val: 90, desc: 'Der Overall, den jeder Pilot der Crew bekommt.', st: { schutz: 3 }, shop: 0 },
  anzug_druck: { n: 'Druckanzug', kind: 'anzug', rar: 1, val: 650, desc: 'Dicht, gefüttert, für Arbeiten im Vakuum.', st: { schutz: 12 }, shop: 0 },
  anzug_exo: { n: 'Exo-Rahmen', kind: 'anzug', rar: 2, val: 2900, desc: 'Leichter Anzug mit Stützmotoren an den Beinen.', st: { schutz: 16, tempo: 12 }, shop: 1 },
  anzug_panzer: { n: 'Gefechtspanzer', kind: 'anzug', rar: 2, val: 2400, desc: 'Schwere Platten. Schützt gut, macht aber langsam.', st: { schutz: 26, tempo: -6 }, shop: 2 },
  anzug_sturm: { n: 'Sturmrüstung', kind: 'anzug', rar: 2, val: 3200, desc: 'Gepanzerter Kampfanzug: rot lackierte Platten über dichtem Unterzeug, Versorgung im Tornister.', st: { schutz: 28, tempo: -3 }, shop: 1 },
  anzug_veteran: { n: 'Veteranenrüstung', kind: 'anzug', rar: 3, val: 7800, desc: 'Getragen von den Letzten, die den Rückzug deckten.', st: { schutz: 34, tempo: 4 } },
  // ----- Rucksäcke -----
  ruck_tasche: { n: 'Umhängetasche', kind: 'rucksack', rar: 0, val: 80, desc: 'Kleine Tasche für das Nötigste.', st: { plaetze: 4 }, shop: 0 },
  ruck_feld: { n: 'Feldrucksack', kind: 'rucksack', rar: 1, val: 420, desc: 'Robuster Rucksack mit vielen Fächern.', st: { plaetze: 8 }, shop: 0 },
  ruck_lasten: { n: 'Lastengestell', kind: 'rucksack', rar: 2, val: 1500, desc: 'Tragegestell der Bergleute. Fasst viel, drückt aufs Tempo.', st: { plaetze: 14, tempo: -4 }, shop: 1 },
  ruck_schwebe: { n: 'Schwebetornister', kind: 'rucksack', rar: 3, val: 6000, desc: 'Trägt sein Gewicht selbst.', st: { plaetze: 20 } },
  // ----- Waffen -----
  waffe_pistole: { n: 'Dienstpistole P-7', kind: 'waffe', rar: 0, val: 200, desc: 'Zuverlässige Seitenwaffe der Flotte.', st: { schaden: 8 }, shop: 0 },
  waffe_karabiner: { n: 'Sturmgewehr AR-39', kind: 'waffe', rar: 1, val: 900, desc: 'Das Standardgewehr der Flotte. Kurz genug für enge Gänge.', st: { schaden: 16 }, shop: 1 },
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
  mod_kompass: { n: 'Kompass der Letzten', kind: 'modul', rar: 3, val: 6500, desc: 'Zeigt nicht nach Norden, sondern dorthin, wo es sich lohnt.', st: { tempo: 10, handel: 3, abbau: 10 } },
  mod_siegel: { n: 'Gildensiegel', kind: 'modul', rar: 2, val: 2800, desc: 'Wer es trägt, bekommt bei Händlern bessere Preise.', st: { handel: 4 }, shop: 2 },
  // ----- Verbrauchsgüter -----
  vb_schaum: { n: 'Reparaturschaum', kind: 'verbrauch', rar: 0, val: 60, desc: 'Dichtet Risse in der Hülle. Stellt 25 Hüllenpunkte wieder her.', stack: 10, use: { hull: 25 }, shop: 0 },
  vb_zelle: { n: 'Schildzelle', kind: 'verbrauch', rar: 1, val: 110, desc: 'Lädt den Schild des Schiffs sofort um 40 Punkte auf.', stack: 10, use: { shield: 40 }, shop: 0 },
  vb_satz: { n: 'Feldreparatursatz', kind: 'verbrauch', rar: 2, val: 320, desc: 'Flickplatten, Kleber, Schweißdraht. Stellt 70 Hüllenpunkte wieder her.', stack: 5, use: { hull: 70 }, shop: 1 },
  vb_notkern: { n: 'Notkern', kind: 'verbrauch', rar: 2, val: 380, desc: 'Einmal-Energiekern. Lädt den Schild um 120 Punkte auf.', stack: 5, use: { shield: 120 }, shop: 1 },
  // ----- Fundstücke -----
  fund_datenkern: { n: 'Datenkern', kind: 'fund', rar: 1, val: 350, desc: 'Speicher aus einem Ferrox-Wrack. Händler zahlen gut dafür.', stack: 20 },
  fund_relikt: { n: 'Ferrox-Relikt', kind: 'fund', rar: 2, val: 1400, desc: 'Ein Bauteil unbekannten Zwecks.', stack: 10 },
  fund_kristall: { n: 'Singender Kristall', kind: 'fund', rar: 0, val: 120, desc: 'Summt leise, wenn man ihn in die Sonne hält.', stack: 20 },
  fund_siegel: { n: 'Altes Flottensiegel', kind: 'fund', rar: 3, val: 5000, desc: 'Abzeichen eines Schiffs, das nie zurückkam.', stack: 5 },
  fund_sternkarte: { n: 'Sternkarte der Alten', kind: 'fund', rar: 3, val: 8000, desc: 'Routen, die auf keiner Karte der Flotte stehen.', stack: 3 },
  // ===== Schiffsmodule =====
  // ----- Waffensysteme -----
  sw_lauf: { n: 'Gehärtete Läufe', kind: 'schiffswaffe', rar: 0, val: 400, desc: 'Halten mehr Druck aus als die Serienläufe.', st: { s_dmg: 6 }, shop: 0 },
  sw_lader: { n: 'Schnelllader', kind: 'schiffswaffe', rar: 0, val: 380, desc: 'Führt die Munition schneller nach.', st: { s_rate: 6 }, shop: 0 },
  sw_zielrechner: { n: 'Zielrechner Mk II', kind: 'schiffswaffe', rar: 1, val: 1400, desc: 'Rechnet den Vorhalt für jede Salve neu.', st: { s_dmg: 10, s_rate: 4 }, shop: 0 },
  sw_rotation: { n: 'Rotationsverschluss', kind: 'schiffswaffe', rar: 1, val: 1500, desc: 'Sechs Kammern, ein Lauf.', st: { s_rate: 14 }, shop: 1 },
  sw_gauss: { n: 'Gauss-Beschleuniger', kind: 'schiffswaffe', rar: 2, val: 5200, desc: 'Spulenringe treiben das Geschoss ein zweites Mal an.', st: { s_dmg: 22 }, shop: 2 },
  sw_zwilling: { n: 'Zwillingslafette', kind: 'schiffswaffe', rar: 2, val: 5600, desc: 'Zwei Kanonen auf einer Lafette, abwechselnd feuernd.', st: { s_rate: 20, s_dmg: 6 }, shop: 2 },
  sw_lanze: { n: 'Ferrox-Lanze', kind: 'schiffswaffe', rar: 3, val: 18000, desc: 'Aus einem Bienenstock geborgen. Sie will benutzt werden.', st: { s_dmg: 32, s_rate: 12 } },
  // ----- Abwehrsysteme -----
  sa_platten: { n: 'Schottplatten', kind: 'schiffsabwehr', rar: 0, val: 420, desc: 'Zusätzliche Platten an den Schotten.', st: { s_hull: 10 }, shop: 0 },
  sa_kondensator: { n: 'Schildkondensator', kind: 'schiffsabwehr', rar: 0, val: 440, desc: 'Speichert etwas mehr Ladung für den Schild.', st: { s_shield: 12 }, shop: 0 },
  sa_waben: { n: 'Wabenpanzerung', kind: 'schiffsabwehr', rar: 1, val: 1500, desc: 'Leicht und zäh, verteilt jeden Treffer.', st: { s_hull: 20 }, shop: 0 },
  sa_projektor: { n: 'Schildprojektor Typ B', kind: 'schiffsabwehr', rar: 1, val: 1600, desc: 'Zweiter Projektor für die Flanken.', st: { s_shield: 25 }, shop: 1 },
  sa_reaktiv: { n: 'Reaktivpanzer', kind: 'schiffsabwehr', rar: 2, val: 5400, desc: 'Sprengt dem Treffer entgegen.', st: { s_hull: 30, s_shield: 10 }, shop: 2 },
  sa_phasen: { n: 'Phasenschild', kind: 'schiffsabwehr', rar: 2, val: 5800, desc: 'Der Schild schwingt und lässt weniger durch.', st: { s_shield: 45 }, shop: 2 },
  sa_bollwerk: { n: 'Bollwerk-Kern', kind: 'schiffsabwehr', rar: 3, val: 19000, desc: 'Der Schildkern eines Schlachtschiffs, in ein kleines Schiff gezwängt.', st: { s_hull: 40, s_shield: 50 } },
  // ----- Antrieb -----
  st_duesen: { n: 'Feindüsen', kind: 'schiffsantrieb', rar: 0, val: 400, desc: 'Sauberer Strahl, etwas mehr Schub.', st: { s_speed: 5 }, shop: 0 },
  st_wirbel: { n: 'Steuerwirbler', kind: 'schiffsantrieb', rar: 0, val: 380, desc: 'Kleine Steuerdüsen an Bug und Heck.', st: { s_turn: 10 }, shop: 0 },
  st_nachbrenner: { n: 'Nachbrenner', kind: 'schiffsantrieb', rar: 1, val: 1500, desc: 'Verbrennt den Rest gleich mit.', st: { s_speed: 10 }, shop: 0 },
  st_vektor: { n: 'Vektorschub', kind: 'schiffsantrieb', rar: 1, val: 1600, desc: 'Schwenkbare Düsen für enge Kurven.', st: { s_turn: 18, s_speed: 4 }, shop: 1 },
  st_fusion: { n: 'Fusionsbrenner', kind: 'schiffsantrieb', rar: 2, val: 5500, desc: 'Brennt heißer, als die Düsen eigentlich dürfen.', st: { s_speed: 18 }, shop: 2 },
  st_gyro: { n: 'Gyrostabilisator', kind: 'schiffsantrieb', rar: 2, val: 5300, desc: 'Drei Kreisel halten das Schiff in jeder Wende ruhig.', st: { s_turn: 30, s_speed: 6 }, shop: 2 },
  st_sturm: { n: 'Sturmtriebwerk', kind: 'schiffsantrieb', rar: 3, val: 18500, desc: 'Der Prototyp, der nie in Serie ging. Zu schnell für die Piloten.', st: { s_speed: 26, s_turn: 22 } },
  // ----- Bordsysteme -----
  sy_netz: { n: 'Frachtnetze', kind: 'schiffssystem', rar: 0, val: 350, desc: 'Was festgezurrt ist, braucht weniger Platz.', st: { s_cargo: 10 }, shop: 0 },
  sy_linse: { n: 'Fokuslinse', kind: 'schiffssystem', rar: 0, val: 380, desc: 'Bündelt den Bergbaulaser enger.', st: { s_laser: 10 }, shop: 0 },
  sy_antenne: { n: 'Weitbereichsantenne', kind: 'schiffssystem', rar: 0, val: 360, desc: 'Hört weiter ins Dunkel.', st: { s_scan: 15 }, shop: 0 },
  sy_kuehler: { n: 'Kryo-Kühler FK-220', kind: 'schiffssystem', rar: 1, val: 1600, desc: 'Sechs Kühlkreise von Frostwerk. Hält Kanonen und Bergbaulaser länger auf Temperatur.', st: { s_rate: 6, s_laser: 14 }, shop: 0 },
  sy_ausbau: { n: 'Frachtraum-Ausbau', kind: 'schiffssystem', rar: 1, val: 1400, desc: 'Zwischenwände raus, Regale rein.', st: { s_cargo: 20 }, shop: 0 },
  sy_prisma: { n: 'Prismenlaser', kind: 'schiffssystem', rar: 1, val: 1500, desc: 'Teilt den Strahl und setzt ihn im Gestein wieder zusammen.', st: { s_laser: 22 }, shop: 1 },
  sy_sonde: { n: 'Tiefensonde', kind: 'schiffssystem', rar: 1, val: 1450, desc: 'Sieht durch Staub und Trümmer.', st: { s_scan: 30 }, shop: 1 },
  sy_kompressor: { n: 'Frachtkompressor', kind: 'schiffssystem', rar: 2, val: 5200, desc: 'Presst Erz zu dichten Blöcken.', st: { s_cargo: 35 }, shop: 2 },
  sy_resonator: { n: 'Erzresonator', kind: 'schiffssystem', rar: 2, val: 5600, desc: 'Bringt die Ader zum Schwingen, bevor der Laser ansetzt.', st: { s_laser: 35, s_scan: 15 }, shop: 2 },
  sy_orakel: { n: 'Orakel-Kern', kind: 'schiffssystem', rar: 3, val: 17000, desc: 'Ein Rechner der Ferrox. Er weiß, was hinter dem nächsten Asteroiden liegt.', st: { s_scan: 60, s_laser: 25 } },
  sy_herz: { n: 'Herz der Flotte', kind: 'schiffssystem', rar: 3, val: 20000, desc: 'Der Reaktor des Flaggschiffs. Alles an Bord läuft damit besser.', st: { s_cargo: 30, s_laser: 30, s_scan: 30 } },
} satisfies Record<string, GearDef>;
export type GearId = keyof typeof GEAR;
export const GEAR_IDS = Object.keys(GEAR) as GearId[];
export const gearDef = (id: string): GearDef | undefined => (GEAR as Record<string, GearDef>)[id];
export const slotKind = (s: GearSlot): GearKind => (s === 'modul1' || s === 'modul2' ? 'modul' : s);
