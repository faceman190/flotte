# Kormoran (Schaumodell in Blender)

Stand 17.11.2026, erste Fassung, noch nicht im Spiel. Wunsch des Nutzers: ein Schiff in der Art der gezeigten Vorlage (flacher, gestufter
Keil, dunkler Rumpf mit Akzentstreifen), 46 × 34 × 8 m, später innen ausgebaut, Zugang hinten über eine Rampe und vorne unter dem Cockpit
über eine ausfahrbare Leiter. Die Vorlage war die Zeus Mk II aus Star Citizen; gebaut ist ein **eigener Entwurf** in dieser Formensprache
(keine Kopie von Form, Logo oder Namen).

Bilder: `docs/bilder/kormoran-aussen.jpg`, `docs/bilder/kormoran-innen.jpg` (Übersichten), Einzelbilder `asset-src/neu/kormoran/kor-*.jpg` (front, seite, heck, oben, unten, leiter, detail, weltraum) und `kor-blatt.jpg` (Übersicht).

## Maße und Achsen

- Länge 46,0 m (Bug x = 23, Düsenenden x = −23), Breite 34,0 m, Höhe 7,96 m vom Boden (Landeteller) bis zur Antenne.
- +X nach vorn, +Y Backbord, +Z oben. Rumpfunterseite 1,9 m über dem Boden.

## Aufbau (`kor_kit.py`)

1. **Facettenrumpf** aus 14 Spanten (Tabellen `KX`, `B`, `ZT`, `ZB`, `ZE`, `EE`): Rücken, Schulter, Flügelwurzel, Außenkante; dazwischen
   ebene Facetten. Gerade Vorderkante ab x = 8, gepfeilte Hinterkante zum Heck.
2. **Schichtplatten** (`PLATES_1`, `PLATES_2`): Umrisse in der Draufsicht exakt ausgeschnitten und angehoben (Rücken, Flügel, Bauch,
   Triebwerksdeck, Bugwinkel). Flügelplatten in Flügelkoordinaten (`st()`: längs und quer zur Vorderkante), damit ihre Kanten zu den
   Plattenreihen passen.
3. **Plattenfugen**: am Rumpf Querfugen, an den Flügeln Fugen parallel und senkrecht zur Vorderkante, Rahmenbänder innen an den Platten,
   Klappen an der Hinterkante. Jede Platte einzeln eingerückt (Fuge 4 cm, Platte 1 cm erhaben), einige als vertiefte Klappen.
4. **Schrauben**: 5.784 Sechskantköpfe als Instanzen an Plattenecken und in Reihen an langen Kanten.
5. **Öffnungen**: Hecktor (4,8 × 3,15 m) mit Rampe (3,1 m + 3,2 m Verlängerung, 22° Neigung, zwei Zylinder), Laderaum dahinter;
   Leiterluke 1,1 × 1,1 m bei x = 11 mit Schacht und dreiteiliger Teleskopleiter; Kanzel aus dem Rumpf geschnitten, Cockpit mit zwei Sitzen.
6. **Anbauten**: zwei Haupt- und zwei Hilfstriebwerke, Fahrwerk (Bug, zwei Haupt-, zwei Heckbeine mit Federbein, Schere, Stützstrebe,
   Teller, Klappen), zwei Kanonen unter den Flügelwurzeln, Rückenturm, Kinnturm, zwei Flugkörperträger mit je drei Flugkörpern,
   Steuerdüsen an Spitzen, Bug und Heck, Endscheiben, Heckflossen, Antennen, Sensorkuppel, Kühler und Wärmetauscher, Wartungsklappen.
7. **Lichter und Beschriftung**: rot Backbord, grün Steuerbord, weiß hinten, Warnlicht oben und unten, Formationslichter, Scheinwerfer;
   Kennung „LC 46“ und „KORMORAN“ (per Shrinkwrap auf dem Rumpf), Warnhinweise, Laufweglinien, zwei Kobaltbalken je Flügel.

Zustände: `zustand(offen, fahrwerk)` stellt Rampe, Luke, Leiter und Fahrwerk.

## Innenraum (Platzhalter, Sammlung „Innenraum Platzhalter“)

Laderaum (10,7 × 7,2 × 3,3 m), Hauptgang, Quartiere Backbord und Steuerbord, Messe, Technik, Treppe zum Cockpit, Leiterschacht. Die
Prüfung in `rooms()` meldet nur die hinteren Unterkanten des Laderaums (Boden 2,55 m, Rumpfunterseite am Heck 2,43 m): Dort wird der
Boden beim Ausbau zur Rampe hin abgeschrägt.

## Aufruf

```
blender.exe -b --python asset-src/neu/kormoran/kor_lauf.py -- alle      # baut Kormoran.blend, rendert alle Ansichten (KOR_SAMPLES, Standard 96)
blender.exe -b --python asset-src/neu/kormoran/kor_blatt.py             # Übersichtsblatt
```

Ein Lauf dauert rund 2 Minuten (Bau 3 s, je Ansicht 13–16 s auf der Grafikkarte). 257.000 Dreiecke einschließlich Schraubeninstanzen.

## Nachgeschärft (17.11.2026, „Look nachschärfen“)

- Lack mit wenig Spiegelung im Streiflicht (Specular 0,28), Sonne flacher (34° über dem Horizont): Fugen und Lagen treten hervor.
- Hitzekragen mit Schrauben und Hitzeschildplatten an den Triebwerken, Düsen innen dunkel, Heckleuchten, Heckkamera.
- Helle Kantenleisten an Vorder- und Hinterkante, Kabelkanäle auf dem Rücken, Kiel unter dem Bauch, Lufteinlässe unter den Flügelwurzeln, Bauchantennen.
- Rahmenbänder auch an Triebwerksdeck, Bauch und Flügelunterseite; Bugwinkel neben der Kanzel in Sand als Akzent.
- Größere Fase am Rumpf (2 cm, zwei Segmente) für Lichtkanten; eigenes Licht für die Unteransicht.

## Innenausbau (17.11.2026, „Innenraum ausbauen“)

Eigene Datei `kor_innen.py` (von `kor_kit.py` geladen). Hauptdeck z = 2,55 m, Decke 5,0 m, Laderaum bis 5,85 m.

```
  y +5,2  Kabine 1 | Kabine 2 | Messe (Kochzeile, Esstisch, Eckbank, Wandbildschirm)
  y ±1,0  Laderaum → Hauptgang (17 m, Handläufe, Leitlicht) → Treppe (11 Stufen) → Cockpit
  y −5,2  Kabine 3 | Waschraum | Technik (Energiekern mit Geländer, Schaltschränke, Werkbank, Rohre)
```

- Wände aus 1,2-m-Feldern mit Fugen, dunklem Sockel und Oberband, Türrahmen; Schiebetüren mit Kobaltstreifen und Bedienfeld; Schilder an den Türen.
- Kabinen: Koje mit Schubladen, Matratze, Decke, Ablage und Leselicht, Spind, Schreibtisch mit Stuhl und Bildschirm.
- Waschraum: Dusche mit Glaswänden, Toilette, Waschtisch mit Spiegel und Licht, Handtuchhalter, Fliesen.
- Laderaum: Stirnwand mit offener Tür in den Gang (Sichtachse von der Rampe bis zur Treppe).
- Treppe: 11 Stufen mit Leuchtkanten, Geländer, schräge Decke; der Rumpf darüber ist offen, das Dach bildet die Kanzelverkleidung.
- Cockpit: Rückwand mit Durchgang, die der Kanzel folgt, Seitenkonsolen. Das Kanzelglas ist jetzt durchsichtig.
- Licht: Flächenleuchten je Raum (Kabinen warm, Technik kühl), Leuchtbänder, Kernlicht.
- Ansichten: `gang`, `kabine`, `messe`, `technik`, `waschraum`, `laderaum`, `treppe`, `cockpit`, `schnitt` (Draufsicht, Kamera knapp unter
  der Decke, Außenhaut ausgeblendet); `kor_lauf.py -- innen` rendert nur diese, `kor_blatt.py -- innen` macht das Blatt `kor-blatt-innen.jpg`.

## Cockpit (17.11.2026, „Cockpit verfeinern“)

Eigene Datei `kor_cockpit.py` (von `kor_innen.py` geladen). Boden 4,5 m, Augenhöhe etwa 5,75 m.

- Instrumentenbrett mit Fußraum: schräge Fläche (34°) mit je zwei Mehrzweckanzeigen pro Pilot (Radarbild mit Ringen und Ziel,
  Zustandsbalken in Bernstein) und Navigationsanzeige in der Mitte, Rahmen mit Tastenreihen, Blendschutz.
- HUD je Pilot: Projektor, zwei Streben, geneigte Glasscheibe mit Zielring.
- Pilotensitze: Schienen, Sockel, Polster mit Seitenwangen, geneigte Lehne mit Kopfstütze und Schultergurten, Beckengurt mit Schloss,
  Armlehnen; rechts Steuerknüppel mit Abzug, links Schubhebel; Pedale und Fußstütze.
- Mittelkonsole (Schalterfeld mit Leuchtdioden, zwei Hebel, Anzeige), Seitenkonsolen an der Wanne, Deckenkonsole mit Kippschaltern.
- Wanne verkleidet, warmes Lichtband an der Oberkante, Bodenplatten, Bodenluke zum Leiterschacht, zwei Klappsitze an der Rückwand.
- Licht: Deckenfläche, Fußraumlichter (warm), Anzeigenglanz. Neue Ansichten `pilot` (Blick des Piloten) und `konsole`.

## Animationen (17.11.2026)

Eigene Datei `kor_anim.py` (von `kor_kit.py` geladen), 24 Bilder/s, als Schlüsselbilder je Bild gebacken (linear,
Sichtbarkeit als Schalter). Rückwärts abgespielt schließen Rampe und Leiter wieder.

- **Rampe öffnen**, Bild 1–100 (4,2 s): Die Rampe schwenkt aus der Senkrechten (zu) auf 21,8° nach unten (Bild 12–72), danach fährt die
  Verlängerung 3 m aus (Bild 66–96). Die beiden Zylinder folgen: fester Zylinder 2 m, die Kolbenstange fährt aus.
- **Leiter ausfahren**, Bild 1–60 (2,5 s): Der Lukendeckel klappt nach unten (Bild 1–18), die Leiter gleitet aus dem Schacht (Bild 16–56).
- Aktionen heißen „Rampe oeffnen …“ und „Leiter ausfahren …“ (je Objekt eine).
- `zustand(offen)` stellt seitdem das passende Bild ein (1 = zu, 100 = offen); die Standbilder zeigen also die Endstellungen der Animation.
- Vorschauvideos: `kor_lauf.py -- film:rampe film:leiter` → `kor-film-rampe.mp4`, `kor-film-leiter.mp4` (960 × 540, Cycles, zusammen
  gut 11 Minuten). Ablaufblatt mit je sechs Zwischenbildern: `blender.exe -b Kormoran.blend --python kor_ablauf.py` → `kor-ablauf.jpg`.
- Achtung: Die Leitergruppe heißt „Leiter“, die Kamera dafür deshalb „Leiter.001“; Skripte suchen Kameras über den Typ.

## Kabinen und Laderaum (17.11.2026)

Eigene Datei `kor_raeume.py` (von `kor_innen.py` geladen).

- **Kabine 1** (Kapitän): Koje, Schreibtisch, Sternenfenster an der hinteren Wand (Bildschirm mit Sternen und Nebel), Teppich,
  Wandregal mit Büchern, Kiste, Bilderrahmen, Tasse.
- **Kabine 2** (Mannschaft): Etagenkoje mit Pfosten, Absturzsicherung und Leiter, zwei Spinde mit Lüftungsschlitzen, Klapptisch mit Hocker,
  Seesack, Wandbildschirm.
- **Sanität** (statt Kabine 3, Schild am Gang geändert): Behandlungsliege mit aufgestelltem Kopfteil und Gitter, OP-Leuchte am Gelenkarm,
  Monitor am Wandarm, Medizinschrank mit Glastür und Fächern, Waschbecken, Spender, Rotes Kreuz, Rollhocker, Fliesenboden, kühles Licht.
- **Laderaum**: helle und dunkle Wandplatten zwischen den Spanten, Frachtnetze in vier Feldern je Seite, Zurrösen an den Bodenschienen,
  gelbe Ladegasse und Gefahrenband vor der Rampe, Laufkran mit Katze, Seil und Haken, Kistenstapel mit Spanngurten und Palette (Backbord),
  Container mit Rippen und Türen und vier Fässer (Steuerbord), Spinde an der Stirnwand, Rampen-Bedienpult mit Tastern, Warnleuchte über
  der Rampe, zwei warme Arbeitsleuchten.
- Neue Ansichten: `kabine2`, `sanitaet`, `laderaum2` (vom Gang zur offenen Rampe).

## Im Spiel (Alpha 1.35)

Schiffsklasse `kormoran` (src/data/ships.ts): Korvette, 26.000 Cr in der Werft, Rumpf 330, Schild 130, Fracht 150, 6 Flugkörper,
kein Bergbaulaser. Eingebunden wie die Pfeil: volles Modell mit Innenraum, eigene Laufkarte (src/game/meshRoom.ts).

Ablauf (`sh asset-src/neu/kormoran/kor_spiel.sh`, danach `npm run assets`):
1. `kor_lauf.py` baut `Kormoran.blend` neu.
2. `kor_export.py` exportiert den geschlossenen Zustand (Bild 1) ohne Studio, Platzhalter, Lichter und Schrauben als `Kormoran_roh.glb`;
   jedes Material wird zu einem schlichten PBR-Material aus seinen `bk`-Angaben, Glas halbdurchsichtig, das Fahrwerk bekommt das
   Material `gear` (im Flug ausgeblendet). Etwa 324.000 Dreiecke, 77 Materialien.
3. `scripts/simplify-hard.mjs … 0.6 0.0004 35 --rotY=-90` → `asset-src/glb/ship/Kormoran.glb` (197.000 Dreiecke, Nase nach +Z;
   gepackt 3,4 MB).
4. `scripts/build-walkmap.mjs … --start=0,-1.38,5.02 --minY=-1.6 --doors=0 --spots=asset-src/glb/ship/Kormoran.look.json` →
   `asset-src/walk/Kormoran.json`: 149 m² begehbar (Laderaum, Gang, alle Räume, Treppe, Cockpit), Einstieg im Laderaum an der Rampe;
   Auslöser: Pilotensitz (Cockpit), Logbuch (Schreibtisch Kapitänskabine), Koje (Kapitänskabine), Spind (Laderaum), Scanner (Technik).
5. src/models/playerShips.ts: vier Triebwerksleuchten an den Düsen, Kanonenpunkt an den Kanonen unter den Flügelwurzeln.

Für die Laufkarte geändert: Treppendecke oben auf 6,55 m (Kopfhöhe ≥ 1,95 m), Außenhaut über der Treppe offen (Dach ist die
Kanzelverkleidung), Handläufe im Gang mit Lücken an den Türen, Waschraumtür offen, Cockpittür ohne Sturz.

Schiffskoordinaten (Laufkarte, Auslöser): x = −y(Blender), y = z(Blender) − 3,98, z = −(x(Blender) + 0,02).

## Rampe und Leiter im Spiel (Alpha 1.36)

- Export (`kor_export.py`): Rampe, Verlängerung, Lukendeckel und Leiter behalten eigene Materialien mit der Endung ` |rampe`, ` |rampe2`,
  ` |luke`, ` |leiter` (Rauheit minimal verschoben, sonst legt simplify-hard sie mit gleichen Materialien zusammen). Verlängerung eingefahren
  (Bild 1), Leiter ausgefahren (Bild 60). Per Schlüsselbild versteckte Teile werden vor dem Export eingeblendet und neu ausgewertet (sonst
  übernimmt Blender ihre alte Lage). Die Gelenkpunkte stehen in `kor-export.txt`.
- Spiel (`src/models/gltfShips.ts`, `DOORS` und `setDoors`): Die Teile werden weltlagetreu an Gelenke gehängt (`attach`, die komprimierten
  Meshes haben eigene Quantisierungsknoten). Rampe: Drehung um die Querachse durch das Scharnier, −111,8°; Verlängerung: 3 m entlang der
  Rampe; Lukendeckel: −100°; Leiter: gleitet 1,95 m aus dem Schacht und ist eingezogen unsichtbar. Abläufe wie in Blender: Rampe 4,2 s
  (Schwenk 12–72 %, Verlängerung 66–96 %), Leiter 2,5 s (Deckel 0–30 %, Leiter 27–93 %).
- Auslöser (`src/main.ts`): im Hangar offen, solange das Fahrwerk unten ist (`hangarGearDown`), auf Planeten offen, im Flug und beim
  Landeanflug zu. Gerechnet mit der Spielzeit des Bildes (`dt`).

## Offen

- Die Zylinder der Rampe fehlen im Spiel (in Blender vorhanden).
- Über die offene Rampe kann man im Spiel nicht laufen (die Laufkarte ist für das geschlossene Schiff gerechnet; Einstieg wie bisher am Schiff).
- Cockpit: Die Anzeigen sind geometrische Platzhalter (keine Bildschirminhalte als Textur).
- Bug: viele kleine Dreiecke, wo Querfugen die spitzen Facetten schneiden.
- Fürs Spiel: Dreiecke reduzieren, Materialien auf das Spielformat bringen, Kollision, Andocken.
