# Bastion-Baukasten (Innenräume aus Zellen)

Stand 15.11.2026: Schaustück in Blender, noch nicht im Spiel. Vorbild für den Look ist der eigene Wartungsgang (`asset-src/neu/gang/`),
Maßstab für die Detailtiefe die Star-Citizen-Studie von Magnus Tellmann (nur als Maßstab, nichts davon ist kopiert).

Zweck: Die Bastion soll nicht mehr aus zwei Räumen mit einem kurzen Gang bestehen, sondern aus einem Deck mit verwinkelten Gängen,
einem Treffpunkt, einem Besprechungsraum und weiteren Räumen. Dafür braucht es Bausteine, die sich nach einem Plan zusammensetzen lassen.

## Wo was liegt

Ordner `asset-src/neu/bastion/` (nicht im Repository, nur die Skripte werden einzeln aufgenommen):

- `mach_lib.cjs` löst Materialien und Bauhelfer aus den Skripten des Wartungsgangs heraus und schreibt `bk_lib.py`. Eine Quelle für beide.
- `bk_kit.py`: Hüllen, erste Wandfüllungen und Objekte.
- `bk_mehr.py`: weitere Wandfüllungen und Objekte (zweite Runde).
- `bk_plan.py`: Decksplan, Zusammenbau, Übersichtsblätter, Kameras, Rendern.
- `BastionKit.blend`: die gebaute Szene. Aufbau immer neu aus den Skripten (`bk_kit.py`, `bk_mehr.py`, `bk_plan.py` nacheinander im selben Namensraum ausführen; dauert gut 30 Sekunden).

## Raster und Zellen

- Eine Zelle misst 4 × 4 m. Gänge sind innen 3,4 m breit und 2,9 m hoch (mit Deckenschrägen), Räume 3,4 m hoch mit flacher Decke.
- Jede Zelle hat vier Seiten. Der Zustand der Seiten bestimmt, was die Zelle ist:

| Zustand | Gangzelle | Raumzelle |
|---|---|---|
| `W` | Wand mit Sockellicht, Mittelspant und Deckenschräge | Wand mit Sockellicht, Lichtfuge und Oberfeldern |
| `O` | offen | offen (derselbe Raum geht weiter) |
| `S` | offen mit Spant in der Zellgrenze | – |
| `B` | Schott mit eingefahrenem Tor zwischen zwei Gangzellen (Durchgang 2,2 × 2,45 m) | – |
| `D` | Schott mit offenem Tor zu einem Raum | – |
| `C` | Schott mit geschlossenem Tor (Hangar, Promenade) | – |
| `X` | – | Wand mit Türöffnung (das Schott gehört zur Gangzelle) |

- Gerader Gang, Ecke, Abzweig, Kreuzung und Gangende sind also keine eigenen Modelle, sondern dieselbe Zelle mit anderen Seiten.
  Der Boden folgt den Seiten: Zu jeder offenen Seite läuft der Rost über dem Leitungsgraben, zu jeder Wand liegt eine Platte.
- Jede vorkommende Zelle wird einmal gebaut (eine Sammlung, dazu eine für alles über Kopf) und dann als Instanz gesetzt.

## Wandfüllungen (2 m breit, zwei je Wandseite)

`feld1`, `feld2`, `feld3` (geschnittene Wandfelder), `feldh1`, `feldh2` (mit Handlauf und Kabelbahn), `gitter`, `terminal`,
`rohr`, `rohr_a`, `rohr_b` (Leitungsstrang: durchlaufend, aus der Wand kommend, in die Wand gehend), `schrank`, `spind`, `bank`,
`fenster`, `schirm`, `tauscher`, `pumpe` (braucht beide Felder einer Seite).

Zweite Runde: `tuer1`, `tuer2` (geschlossene Kammertür, deutet weitere Räume an), `karte` (Decksplan, zeichnet den echten `PLAN`),
`theke` (Ausgabe der Kombüse), `kojen`, `regal`, `werkbank`, `feuer` (Brandposten), `flaschen`, `pflanzwand` (Hydrokultur), `aushang`, `luke` (Steigleiter).

Alle sind an einer Bezugsseite gebaut (Wand bei x = −1,7 m) und werden beim Setzen auf die richtige Seite gedreht.

## Objekte

`kisten`, `fass`, `wagen`, `stuhl`, `tisch` (Besprechungstisch mit Kartenfeld und Projektor), `stehtisch` (mit drei Hockern),
`pflanze` (Kübel mit Pflanzlicht), `automat`, `saeule` (Infosäule).

Zweite Runde: `messtisch` (mit zwei Bänken), `sessel`, `pult`, `holo` (Sockel mit Kugel aus Leuchtringen), `karre`, `palette`, `tonne`,
`absperrung`, `trommel` (Kabeltrommel), `pendel` (Pendelleuchte), `stuetze`.

## Was die Hüllen von selbst mitbringen

- Gangzellen: Bodenpfeil, Feldnummer, Ablaufrost, Flecken und Abrieb (je Zellart anders), Stempel und Rostspur am Mittelspant.
- Raumzellen: Bodenluke, Lüftungskanal, Kabelbahn, Sprinkler und kleine Strahler an der Decke; drei Lichtstimmungen (`hell`, `warm`, `dunkel`),
  je Raumart in `MOOD` gewählt.
- Türen zu Räumen tragen den Raumnamen über dem Sturz und auf dem Boden davor. `wegweiser()` hängt Richtungsschilder an Abzweigungen.

## Plan

`PLAN` in `bk_plan.py` ist eine Textkarte, ein Zeichen je Zelle: `G` Gang, `H` Tor zum Hangar, `P` Tor zur Promenade, ein Buchstabe je Raum
(`T` Treffpunkt, `B` Besprechung, `M` Maschinenraum, `S` Spinde, `L` Lager), `.` nichts. `DOORS` nennt die Türen zwischen Gang und Raum;
ohne Eintrag bleibt dort eine Wand. `choose()` legt fest, welche Wandfüllung wohin kommt (je Raumart feste Regeln, in den Gängen
gewürfelt mit festem Startwert), `furnish()` stellt die Objekte.

Der Probeplan misst 13 × 9 Zellen (52 × 36 m): 60 Zellen aus 98 Bausteinen, 376 gesetzte Instanzen. Räume: Treffpunkt, Besprechung,
Maschinenraum, Spinde, Lager, Quartier, Werkstatt. `BULK` nennt die Schotte zwischen Gangzellen.

## Neuen Baustein anlegen

- Wandfüllung: Funktion `d_name()` in `bk_kit.py` (Bezugsseite, Mitte bei y = 0, von y = −0,87 bis 0,87), Eintrag in `DRESS`.
- Objekt: Funktion `p_name()` (Ursprung am Boden), Eintrag in `PROP`.
- Neue Raumart: Buchstabe in `PLAN`, Name in `NAMES`, Regel in `choose()`, Möbel in `furnish()`.

## Hangar im selben Look

Stand 15.11.2026: Schaustück in Blender (`BastionHangar.blend`), noch nicht im Spiel. Der Hangar ist in den Maßen des Spiels gebaut
(`src/game/interior.ts`: 184 × 162 × 42 m, Tor 124 × 32 m), damit er den heutigen Hangar später ersetzen kann.
Blender-y ist −Spiel-z: Rückwand mit Ausgang bei y = +50, Tor bei y = −112, Stellplätze bei x = 0 und ±60, y = −28.

Skripte (nach `bk_kit.py` und `bk_mehr.py` im selben Namensraum, in der eigenen Datei):

- `bk_hangar.py`: Bausteine der Halle.
- `bk_halle.py`: Objekte, Zusammenbau, Draußen (Kraftfeld, Sterne, Planet), Dunst, Kameras, Rendern.

Bausteine (Wandteile an einer Bezugswand gebaut: Wandebene x = 0, Blick nach +X, Länge entlang y):

| Baustein | Inhalt |
|---|---|
| `h_joch(v, L)` | Wandjoch, 18 m (an der Torwand 24 m), drei Spielarten: Band auf Augenhöhe mit Sockellicht und Pfosten alle 2 m, Fußweg, Großfelder, Galerie auf 9,6 m mit Rohrstrang darunter, Kranbahn, Lamellenband; dazu je Spielart Lüftungsgitter, Steigschacht mit Leiter oder Umluftgebläse |
| `h_spant()` | Hauptspant zwischen zwei Jochen mit gegliedertem Fuß und Lichtschlitzen |
| `h_mitte()` | Rückwand Mitte, 36 m: Ausgang (das geschlossene Tor des Baukastens, also dasselbe Tor wie auf der Gangseite), Pult des Deckmeisters mit Vordach, Leitstand als Kanzel mit Glas und Innenraum, Schriftzug |
| `h_turm()` | Eckturm mit Treppenhaus, deckt die vier Ecken ab |
| `h_tor()` | Torpfeiler, Sturz, Warnbänder, Lichtbänder, Schwelle |
| `h_binder()`, `h_dachfeld()` | Fachwerkbinder und Dachfeld mit Hallenleuchten, Luftkanälen, Löschleitungen, Kranschienen |
| `h_boden(v)` | Bodenfeld 18 × 18 m aus geschnittenen Platten, Ablaufrinne, Zurrpunkte, Spuren (drei Spielarten) |
| `h_platz(hw)` | Stellplatz 52 oder 60 × 104 m: Rahmen, Ecken, Aufsetzkreis, Leitlinie zum Tor, Bodenlichter, Versorgungsschächte, Strahler |

Die Wandfelder auf Augenhöhe und auf der Galerie sind die Wandfüllungen des Baukastens (`dress(name)`), dieselben wie in den Gängen.
`ROWS` in `bk_halle.py` nennt die Belegungen je Joch, `GAL` in `bk_hangar.py` die der Galerie.

Objekte: `p_container` (fünf Lackierungen), `p_schlepper`, `p_tankwagen`, `p_treppe` (fahrbare Treppe), `p_regal` (Hochregal),
`p_versorgung` (Versorgungssäule), `p_laufkatze`; dazu Kleinteile aus dem Baukasten. Schiffsmodelle stehen bewusst keine drin.

Aus dem Spiel übernommen: Der Streifen hinter dem mittleren Stellplatz (x −30 … 30, y 24,5 … 41) ist frei von Gegenständen,
das Pult des Deckmeisters steht auf dem Block des Spiels (x 7,4 … 10,6), die Hochregale auf den Blöcken an der Rückwand (x ±45,5 … 83,5).

Zu wissen:

- `BastionHangar.blend` ist aus `BastionKit.blend` entstanden und erbt dessen Welt. Deren Dunst (ganze Welt, dicht) wird in `bk_halle.py`
  abgehängt, sonst verschwindet alles hinter dem Tor. Der Dunst der Halle ist ein eigener Körper (`Dunst`), nur innen.
- Der Planet hinter dem Tor ist Kulisse für die Bilder; im Spiel zeigt das Tor den echten Weltraum.
- Umfang: 63 Bausteine, 517 gesetzte Instanzen, 4.161 Objekte. `tris()` zählt 5,39 Millionen gesetzte Dreiecke, 493.000 davon einmalig.
  Für das Spiel ist das zu viel; hier gilt dasselbe Abspecken wie beim Deck (siehe unten), dazu Lichtkarte wie beim heutigen Hangar.
- Aufbau dauert rund 20 Sekunden, Rendern über `job([...])` (Marke `fertig-hangar.txt`). Bilder: `hangar-*.jpg`.

## Entwürfe für den echten Deckplan

`asset-src/neu/bastion/deckplaene.cjs` hält vier Entwürfe als Zellkarten (Rückgrat, Ringdeck, Zwei Stränge, Verwinkelt), prüft sie
(jeder Raum hat eine Tür, alles ist erreichbar) und zeichnet sie als Draufsicht mit Weglängen: `node deckplaene.cjs` schreibt `plan-A.png` bis
`plan-D.png` und `plan-alle.jpg`. Die Karten haben das Format von `PLAN`; Kleinbuchstaben sind Raumzellen mit Tür, `g` ein Gang mit Schott.
Mit `--tueren` gibt das Skript die Türen in der Form von `DOORS` aus. Stand 15.11.2026: Gewählt ist Plan D.

## Deck 3 nach Plan D (gebaut in Blender)

`bk_deck_d.py` baut Plan D in der eigenen Datei `BastionDeckD.blend` (nach `bk_kit.py`, `bk_mehr.py`, `bk_med.py` im selben Namensraum).
Es lädt `bk_plan.py` nur für die Helfer (`NUR_HELFER = True`) und bringt selbst mit: die Karte (`KARTE`, dasselbe Format wie in
`deckplaene.cjs`; Türen und Schotte entstehen daraus von selbst), die Regeln für die Wandfüllungen (`choose()`, jetzt nach Raumart und
Lage im Raum statt nach festen Zellen, dazu `hull()` für Außenwände mit Fenstern), die Einrichtung (`furnish()`) und die Kameras.

- Umfang: 103 Zellen, 108 Bausteine, rund 610 gesetzte Instanzen. Bilder: `deckd-00-plan.jpg` bis `deckd-11-ostgang.jpg`.
- Räume: Treffpunkt (12 × 12 m, liegt innen und hat keine Fenster), Besprechung (16 × 12 m, Fenster nach außen), Krankenstation (12 × 8 m),
  Werkstatt, Maschinenraum, Spinde, Lager, zwei Quartiere.
- Krankenstation (`bk_med.py`): Wandfüllungen `liege1` bis `liege4` (Bett quer zur Wand mit Versorgungsleiste, Monitor, Vorhang,
  Infusionsständer), `medschrank`, `waschplatz` (mit Erste-Hilfe-Wand), `diagnose`; Objekte `utisch` (Untersuchungsliege mit
  Scannerbogen und Leuchte), `tropf`, `stellwand`, `hocker`. Das Sanitätszeichen ist ein weißes Kreuz auf Grün.
- Seit Alpha 1.20 ist das Deck im Spiel und ersetzt in der Bastion Korridor und Promenade: siehe `docs/bastion-deck.md`. Dafür wurde der Plan
  umgestellt: Das Lager liegt vorn am Hangar (mit Markt, Ausrüster, Raffinerie, Lager), die Werkstatt trägt Werft, Werkstatt und Service, das
  Tor im Osten ist ein geschlossenes Schott zu Deck 2. `bk_deck_d.py` hält die gültige Karte; `deckplaene.cjs` zeigt noch die vier Entwürfe.

## Offen, bevor es ins Spiel kann

- **Texturen:** Die Oberflächen sind in Blender errechnet. Fürs Spiel wird jeder Baustein einmal gebacken (Farbe, Schmutz, Abrieb) und dann
  beliebig oft gesetzt. Das spart Speicher gegenüber einem einzeln gebackenen Deck.
- **Licht:** Entweder je Deck eine Lichtkarte oder Lichter im Spiel; zu entscheiden, wenn der echte Plan steht.
- **Laufflächen:** Aus demselben Plan lassen sich die begehbaren Rechtecke, Türen und Hindernisse ableiten; das Spiel braucht dafür einen
  Leser für `PLAN` und je Baustein die Standfläche.
- **Der echte Plan der Bastion:** welche Räume, wie Hangar und Promenade anschließen, wo die Figuren der Geschichte stehen (`hangarSpot`),
  wo die Läufer gehen. Der Probeplan ist nur ein Vorschlag.
- **Dreieckszahl:** `tris()` zählt für den Probeplan 1,84 Millionen gesetzte Dreiecke, 607.000 davon einmalig (jeder Baustein einmal).
  Das ist für das Spiel zu viel; abspecken heißt: Fasen nur an sichtbaren Kanten, Schrauben und Nieten in die Textur, Rundungen gröber.
