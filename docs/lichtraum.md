# Lichtraum: ein Raum mit Lichtkarten (Probe, Alpha 1.23)

Frage des Nutzers nach Alpha 1.22: Kommt das Spiel grafisch näher an die Blender-Bilder heran? Antwort: ja, vor allem durch Lichtkarten
statt Licht je Eckpunkt. Als Probe ist der **Leitstand der Eisenkrone** samt Ofenhalle so gebaut. Alle übrigen Räume und Decks bleiben, wie
sie sind.

## Was anders ist

| | bisher (Bausteine, `bk_export.py`) | Lichtraum (`lm_raum.py`) |
| --- | --- | --- |
| Licht | je Eckpunkt gebacken, ein Baustein trägt das Licht seiner ersten Stelle | je Bildpunkt, jede Stelle ihr eigenes Licht |
| Schatten | nur so fein wie die Eckpunkte, auf großen Flächen keine | weiche Schatten von Pulten, Stühlen, Geländern |
| Oberflächen | einfarbig je Art, dazu ein Kornbild | Farbe, Schmutz, Kantenabrieb, Rauheit und Relief der Blender-Materialien als Bilder |
| Fasen | ab 8 mm abgeschaltet, sonst eine Stufe | alle Fasen in voller Güte |
| Teile | dieselben Bausteine überall | der Raum ist ein eigenes Modell, nur hier verwendbar |

## Ablauf

1. Deck bauen wie bisher (`bk_deck_ek.py` in `EisenkroneDeck.blend`).
2. `lm_raum.py` in derselben Datei ausführen (verändert die Szene, danach **nicht speichern**). OPT: `cells` (Zellen des Raums), `hall`
   (Name eines großen Bausteins mit eigenem Bild, hier die Ofenhalle), `size` (Farbbild), `lm` (Licht, Rauheit, Relief), `samples` (Licht),
   `test: True` schreibt kleine Proben nach `asset-src/neu/bastion/lm_test/`.
   - Die Instanzen in den Zellen werden aufgelöst (jede Lampe bleibt als echte Lampe), Spuren und Flecken entfallen.
   - Abwicklung: Smart UV, gepackt mit festem Rand je Insel (`ADD`, 2 Bildpunkte im Lichtbild) und Form `CONVEX`. Ein Rand als Anteil der
     Bildgröße ließ bei den vielen Tausend Kleinteilen die Inseln auf Punkte schrumpfen.
   - Gebacken (Cycles, Metall zählt als Lack wie bei `bk_export.py`): `col` Farbe (4096), `lit` Licht ohne Farbe (2048, 512 Abtastungen),
     `emi` Leuchten (4096), `orm` Rauheit im Grünkanal, `nrm` Relief im Tangentenraum (2048). Etwa 5 Minuten auf der RTX 3060 Ti.
   - Licht und Leuchten kodiert wie die Eckfarben: w = Wurzel(x / (1 + x)).
3. Ausgabe: `asset-src/tex-world/lm_<teil>_<art>@<größe>.png`, `asset-src/glb/base/LichtraumEisenkrone.glb` (Materialnamen `ext_lm_<Art>`),
   `asset-src/data/lichtraum_eisenkrone.json` (Zellen und Teile). Dann `npm run assets`.

## Im Spiel (`src/game/deck.ts`)

- `LICHT` nennt je Deck Daten und Modell; `loadDeck(id)` lädt den Lichtraum im Hintergrund dazu (`loadLicht`).
- `buildDeck`: Die Zellen des Lichtraums bekommen keine Bausteine (ihre Standflächen bleiben), an ihre Stelle tritt das Modell im selben
  Bereich, also mit derselben Sichtprüfung. Ist der Lichtraum nicht geladen, steht der Raum wie bisher aus Bausteinen.
- Material: Strahldichte = Farbe × Licht + Leuchten, gedeckelt (`LM_MAX` 1,6), dazu der Glanz aus der Raumumgebung mit Rauheit und Relief
  aus den Bildern. Leuchten und Bildschirme zeigen nur ihr Leuchten; Bildschirme schwächer und unter der Bloom-Schwelle, sonst überstrahlen
  die großen Bildwände den Raum. (Vor den Bildwänden sitzt eine kleine Lampe, deren gebackenes Streulicht die Fläche weiß machte.)
- `deckTune.lichtraum = false` zeigt den Raum wieder aus Bausteinen (für Vergleiche, beim nächsten Betreten).

## Messung (Leitstand, 1280 × 720, RTX 3060 Ti)

- Download: Modell 2,4 MB, zehn Bilder 7,0 MB (WebP), zusammen 9,4 MB, im Hintergrund-Paket.
- Dreiecke: Raum 109 000, Halle 41 000. Je Bild 280 000 bis 385 000 gezeichnet (bisher 250 000 bis 355 000), Zeichenaufrufe gleich.
- Grafikkarte: 1,3 bis 1,8 ms je Bild statt 1,2 bis 1,7 ms.
- Grafikspeicher: grob 150 MB für die Bilder (4096er Farbbild mit Stufen allein etwa 85 MB).

## Grenzen und nächste Schritte

- Bewegte Dinge (Figuren, Schiffe) bekommen kein gebackenes Licht; sie stehen weiter im Licht der Spiellampen.
- Je Raum etwa 9 MB Download: für ein ganzes Deck 50 bis 90 MB. Deshalb lohnt es sich vor allem für Räume, die man oft sieht.
- Blender zeigt zusätzlich Dunst und eine weichere Farbumsetzung (AgX). Beides wären Effekte für das ganze Spiel (GTAO, AgX, Nebel).

## Alpha 1.24: weniger Rauschen

Dem Nutzer war der Leitstand zu verrauscht. Ursachen und Abhilfe in `lm_raum.py`:

- Das Farbbild war mit 16 Abtastungen gebacken; die Materialien streuen ihre Farbe aber über einen Verdeckungsknoten, der je Abtastung
  würfelt. Jetzt 128 Abtastungen (`col_samples`).
- Licht mit 1536 statt 512 Abtastungen (Halle 1024), danach leicht geglättet (`soften`, 5 × 5).
- Relief mit 16 statt 4 Abtastungen; im Spiel wirkt es nur noch zu 70 % (`normalScale`), weil feines Korn im Glanz glitzerte.

Backzeit jetzt rund 8 Minuten. Vergleich vorher und nachher: `docs/bilder/lichtraum-124-rauschen.jpg`.
