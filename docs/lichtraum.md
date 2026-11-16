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

## Mischform (Alpha 1.26)

Schritt 2 des Plans nach der WebGPU-Probe (docs/webgpu-probe.md): der Leitstand im heutigen WebGL-Renderer, gebackenes Licht plus
echte Lampen. Vergleich: `docs/bilder/hybrid-126-vergleich.jpg`.

**Was im Spiel dazukommt** (alles in `src/game/deck.ts`, Schalter `deckTune.hybrid`):

- **Raumspiegelung.** Beim ersten Blick in den Raum nimmt eine Würfelkamera in der Raummitte die Flächen des Lichtraums auf (512 je
  Seite, in Weltlage, weil der Innenraum mit der Station gedreht ist) und filtert sie für den Glanz vor. Leuchten dürfen dabei
  viermal heller sein als im Bild (`lmCap`), sonst spiegeln sich Lampen nicht als helle Flecken. Boden, Metall und Glas spiegeln
  jetzt den Raum statt der allgemeinen Umgebung der Station.
- **Schlüssellampen.** Je Zelle des Raums ein Strahler unter der Deckenleuchte (sechs im Leitstand, 2,6 cd). Sie geben den Flächen
  Glanzlichter, beleuchten die Figuren und werfen deren Schatten.
- **Nebenstrahler.** Der Glutschein der Öfen fällt als drei warme Strahler durch die Fenster (`LM_SIDE`, ohne Schatten). Von ihnen
  kommen die warmen Glanzbahnen auf dem Boden.
- **Figurenschatten.** Nur Figuren stehen in den Schattenkarten (512 je Strahler). Der Schatten nimmt dem Strahler seinen Glanz und
  dunkelt zusätzlich das gebackene Licht ab (`deckTune.shade`). Je Bild werden zwei der sechs Karten erneuert.

**Was anders ist als im Plan, und warum**

- Das direkte Licht der Lampen bleibt gebacken. Geplant war, nur das indirekte Licht zu backen und das direkte von echten Lampen zu
  rechnen. Die gebackenen Flächenleuchten geben aber weiche Schatten, die drei bis sechs Strahler nicht hinbekommen; und es braucht
  kein neues Backen. Die echten Lampen liefern, was Backen nicht kann: Glanz, der mit dem Blick wandert, und Licht und Schatten für
  bewegte Figuren.
- Die Lichtschleife der Lichtraum-Flächen ist eine eigene Fassung des three-Bausteins `lights_fragment_begin`: Sie rechnet nur
  Strahler. Punkt-, Richtungs- und Himmelslicht der Station würden das gebackene Licht verdoppeln.
- Das Schattengewicht folgt dem Winkel im Lichtkegel, nicht der wahren Beleuchtungsstärke. Rechnerisch nimmt eine von sechs
  Deckenlampen am Ort ihres Schattens nur etwa 6 % Licht weg; das sah niemand.
- **AgX verworfen.** Die Filmkurve macht den dunklen Raum flacher und grauer, das Orange der Glut stumpf. ACES bleibt.
- **GTAO verworfen.** Der Durchgang zeichnet die Szene ein zweites Mal (0,97 → 1,47 Mio. Dreiecke je Bild). Im Lichtraum steckt die
  Verdeckung schon im gebackenen Licht, der sichtbare Gewinn war gering.

**Kosten** (RTX 3060 Ti, 1280 × 720, Testfenster): 4,0 bis 4,4 ms je Bild ohne, 4,3 bis 5,7 ms mit Mischform. Die Schattenkarten
kosten rund 0,5 Mio. Dreiecke je Bild, weil die Figuren fein aufgelöst sind. Ohne das reihum Erneuern waren es 1,7 Mio.

**Fallen**

- three rollt die Lichtschleife ohne eigene Klammern aus: Eine Variable, die im Schleifenrumpf vereinbart wird, ist doppelt vereinbart.
- `markShadows` (engine.ts) setzt auf jedes Netz mit Standardmaterial Schattenwurf. Netze der Decks tragen deshalb
  `userData.sh = false`; sonst zeichnet jeder Strahler das halbe Deck in seine Schattenkarte.
- Die Raumspiegelung in Raumlage aufgenommen sah zuerst eindrucksvoller aus, war aber um den Stationswinkel verdreht.

**Offen:** Die Spiegelung stammt von einem Punkt in der Raummitte, in Scheiben nah an der Wand stimmt sie nur ungefähr. Schwache
Rechner sind nicht gemessen. Weitere Räume (Bastion Treffpunkt und Lager, dann der Hangar) brauchen erst Lichtkarten.

## Bastion: Treffpunkt und Lager (Alpha 1.27)

Schritt 3 des Plans: die Mischform für zwei Räume der Bastion. Vergleich: `docs/bilder/lichtraum-127-bastion.jpg`.

**Backen.** `lm_raum.py` backt jetzt mehrere Räume eines Decks in einem Lauf (`OPT['rooms']`: Name und Zellen je Raum, wahlweise `size`,
`lm`, `samples`, `emi`). Das Objekt im Modell heißt wie der Raum, die Bilder `lm_<raum>_…`. Die alte Form (ein Raum und seine Halle,
Eisenkrone) bleibt. Ohne offenes Blender: `blender.exe -b --python lm_lauf.py -- bk_deck_d.py BastionDeckD.blend lm_bastion.json`
baut das Deck frisch, speichert es und backt dann (danach wird nicht mehr gespeichert). Dauer für beide Räume: 23 Minuten
(Treffpunkt 9 Zellen, 148 Tsd. Dreiecke, 51 Lampen; Lager 6 Zellen, 115 Tsd. Dreiecke, 27 Lampen). Das Leuchtenbild ist hier 2048 statt
4096 groß. Die Abwicklung belegt nur 41 % und 49 % der Bilder (Leitstand: gut 75 %).

**Im Spiel** (`src/game/deck.ts`):

- Ein Deck kann mehrere Lichträume haben (`LM[id].rooms`), jeder mit eigenen Netzen, Materialien und eigener Raumspiegelung. Die
  Spiegelung wird an einem freien Punkt nahe der Raummitte aufgenommen: Im Treffpunkt steht dort der Kartentisch.
- Die Strahler sind ein Vorrat je Deck: so viele, wie der größte Raum Zellen hat, davon höchstens sechs mit Schatten (`KEYS_MAX`).
  Sie stehen im sichtbaren Lichtraum, der dem Piloten am nächsten ist. Im Treffpunkt (neun Zellen) stehen die sechs mit Schatten auf
  den Zellen nächst dem Piloten; wer schon auf einer gewünschten Zelle steht, bleibt dort, damit sein Schatten nicht springt.
- Je Bild wird nur noch eine Schattenkarte erneuert. Im Treffpunkt mit seinen vielen Figuren kosteten zwei Karten 0,8 Mio. Dreiecke je Bild.
- Glanz der Strahler von 3 auf 2,2: Neun Deckenlampen machten den Boden sonst milchig.
- Nebenstrahler (`LM_SIDE`) gibt es je Deck und Raum; die Bastion-Räume haben keine.

**Kosten** (RTX 3060 Ti, 1280 × 720, Testfenster, ms je Bild): Treffpunkt 2,9 mit Bausteinen, 3,2 nur Lichtkarte, 3,5 bis 4,3 Mischform.
Lager 3,3, dann 3,5, dann 3,5 bis 3,65. Herunterzuladen sind je Raum rund 5 MB mehr (im Hintergrund nach dem Start).

**Geprüft:** Lückensuche über alle 105 Zellen der Bastion ohne Fund (auch an den Nähten zwischen gebackenem Raum und Gang),
Begehbarkeit wie vorher, Story-Durchlauf sauber.

**Offen:** Der Hangar (dritter Raum des Plans) hat eine eigene Lichtkarte anderer Art und ist nicht umgestellt. Die übrigen Räume der
Bastion (Werkstatt, Besprechung, Krankenstation, Quartier, Maschinenraum, Spinde) sind weiter Bausteine mit Licht je Eckpunkt.

## Bastion: alle Räume (Alpha 1.28)

Die übrigen Räume von Deck 3 sind umgestellt: Werkstatt, Besprechung, Krankenstation, Maschinenraum, Spinde und beide Quartiere.
Damit sind alle neun Räume der Bastion Lichträume; Gänge und Hangar bleiben, wie sie waren. Vergleich: `docs/bilder/lichtraum-128-bastion.jpg`.

**Backen.** Zweiter Satz `lm_bastion2.json` → `LichtraumBastion2.glb`, `lichtraum_bastion2.json` (sieben Räume, 39 Minuten). Kleine Räume
bekommen kleinere Bilder, damit die Dichte gleich bleibt: 12 und 6 Zellen 4096 (Farbe) und 2048, 4 Zellen 3072 und 1536, 2 Zellen 2048
und 1024. Ein Deck kann mehrere Sätze haben (`LICHT` in deck.ts); fehlt einer, bleiben seine Räume Bausteine.

**Sternenfenster.** Gebacken waren die Fenster der Besprechung schwarz: Die winzigen Sterne gehen im Leuchtenbild verloren. Das
Material „Sternfeld“ ist deshalb eine eigene Art `stars` und zeigt im Spiel das Sternfeld des Baukastens (ohne Lichtkarte).
`"export_only": true` in den Einstellungen gibt nur das Modell neu aus (Auflösen und Abwickeln wie beim Backen, die Bilder bleiben);
so ließ sich die Art ändern, ohne neu zu backen.

**Grafikspeicher.** Ein Raum belegt 45 bis 170 MB. Deshalb gibt das Deck die Bilder eines Raums frei, der 20 s nicht zu sehen war
und über 24 m entfernt ist, und alle beim Verlassen des Innenraums (`deck.release()`). Beim nächsten Blick lädt three sie aus dem
Arbeitsspeicher wieder hoch. Gemessen: 153 Bilder nach einem Gang durch alle Räume, 113 nach 21 s im Hangar.

**Strahler.** Höchstens neun je Deck (`SPOTS_MAX`), davon sechs mit Schatten. In der Besprechung (zwölf Zellen) stehen sie auf den
neun Zellen nächst dem Piloten.

**Artifact-Fassung.** claude.ai fasst höchstens 511 Dateien je Fassung. `scripts/artifact-pack.mjs` bündelt die Bilder der Lichträume
(`tex/lm_…`) jetzt wie die Modelle in JSON-Teile (`assets/lm-<n>.json`); der Lader (`src/core/assets.ts`) macht daraus wieder
Bilder im Speicher. Sie laden dort beim Start mit.
Dazu kommt eine zweite Grenze: 256 MiB je Fassung. Mit allen Lichträumen wären es 310 MB. Der zweite Satz der Bastion (die sieben
Räume aus Alpha 1.28) bleibt deshalb aus der Artifact-Fassung heraus (`SKIP_SETS` im Packskript); das Spiel baut dort für diese Räume
die Bausteine. Die Artifact-Fassung zeigt also Leitstand, Treffpunkt und Lager als Lichträume, der eigene Server (Render) alle zehn.
Stand: 492 Dateien, 245 MiB. Für weitere Räume ist auf claude.ai kein Platz mehr.

**Kosten** (RTX 3060 Ti, 1280 × 720, Testfenster, ms je Bild, Bausteine → Mischform): Werkstatt 2,9 bis 3,5 → 3,8 bis 3,95;
Besprechung 3,0 bis 3,2 → 3,7; Krankenstation 2,9 bis 3,0 → 3,6 bis 3,8; Maschinenraum 2,9 → 3,4 bis 3,5. Herunterzuladen sind für
die Bastion jetzt rund 48 MB Lichtraum-Daten (im Hintergrund nach dem Start).

**Geprüft:** Lückensuche über alle 105 Zellen ohne Fund, Begehbarkeit wie vorher, Story-Durchlauf sauber.

**Bekannte Schwäche:** Sind die Lichtraum-Daten beim Betreten des Decks noch nicht geladen (erster Start, langsame Leitung), baut das
Deck für diesen Besuch die Bausteine. Erst beim nächsten Andocken erscheinen die Lichträume.
