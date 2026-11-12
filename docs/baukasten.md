# Baukasten für Gebäude und Umgebungen (ab Alpha 0.66)

Mit dem Baukasten entstehen detaillierte Gebäude per Skript in Blender. Die Details (Paneele, Schrauben, Lamellen, Abnutzung, Schmutz)
kommen aus einem gemeinsamen Texturblatt; die Bauteile sind kleine Funktionen, die Flächen darauf abbilden. Ein neues Gebäude braucht deshalb
nur ein kurzes Skript und im Spiel fast keinen Code.

Bilder aller Teile: `docs/baukasten/katalog_1_gebaeude.jpg`, `katalog_2_technik_fracht.jpg`, `katalog_3_landefeld.jpg`.

## Dateien

| Datei | Inhalt |
|---|---|
| `asset-src/neu/baukasten/trim_build.py` + `Trimsheet.blend` | Texturblatt: Details als echte Geometrie, von oben gerendert, daraus Farbe, Relief, ORM |
| `scripts/make-kit-decals.mjs` | Aufkleber-Atlas: Ziffern, Wörter, Zeichen, Schilder, Schmutz |
| `asset-src/neu/baukasten/kit_lib.py` | Die Bibliothek: Grundformen, Bauteile, Verdeckung, Export |
| `asset-src/neu/baukasten/kit_catalog.py` + `Baukasten.blend` | Katalog aller Teile, Vorschaubilder (`stage()`, `shot()`) |
| `asset-src/neu/baukasten/kit_atlas.json`, `kit_decals.json` | Lage der Streifen, Kacheln und Aufkleber (werden erzeugt, nicht von Hand ändern) |
| `asset-src/tex/kit_trim_col/_nrm/_orm@2048.png`, `kit_decals@2048.png` | Die fertigen Bilder |
| `src/models/kit.ts` | Materialien im Spiel, `applyKit()`, Zusatzangaben `kitMeta()` |
| `asset-src/neu/aussenposten/posten_kit.py` | Beispiel: der Außenposten (rund 90 Zeilen) |

## Ein neues Gebäude bauen

1. Skript schreiben (Vorlage: `posten_kit.py`): `K = lib.Kit('Name')`, Bauteile aufrufen, `return K.build('Sammlung')`.
2. In Blender laden und ausführen (Textblöcke `kit_lib` und das eigene Skript), mit `kit_catalog.stage()` und `shot()` ansehen.
3. `lib.bake_ao(ob)` rechnet die Verdeckung in die Eckfarben, `lib.export(ob, 'Name', meta)` schreibt
   `asset-src/glb/station/Name.glb` und `asset-src/data/kit_Name.json` (Leuchtpunkte, eigene Angaben wie das Landefeld).
4. `npm run assets`. Im Spiel: Vorlage holen, `applyKit(body)` aufrufen, Leuchtpunkte aus `kitMeta('Name').lights` setzen
   (Beispiel: `buildBaseModel()` in `src/models/stationModels.ts`).

Maße in Metern. In Blender zeigt die Vorderseite eines Teils nach −Y, +Z ist oben; der Ursprung eines Teils ist die Mitte seiner Grundfläche.
Mit `with K.at((x, y, z), drehung):` wird alles darin verschoben und um Z gedreht.

## Bauteile (Methoden von `Kit`)

- **Grundformen:** `box` (Kasten mit gefasten Kanten), `beam` (Balken zwischen zwei Punkten), `tube` (Rohr, Tank, Reifen), `sphere`,
  `prism` (Querschnitt gezogen, z. B. Pultdach), `slab` (Betonplatte), `surf`/`face` (einzelne Fläche), `ring` (umlaufender Rahmen).
- **Gebäude:** `block` (Baukörper mit Sockel und Attika), `wing` (Flügel mit Pultdach und Trägern), `gate` (großes Tor), `door`, `windows`,
  `ramp`, `stairs`, `walkway`, `platform`, `railing`, `ladder`, `pipe`, `cable`.
- **Technik:** `panel` (Wandkasten mit Motiv), `vent_unit`, `generator`, `mast_light`, `antenna`, `dish`, `turret`, `tank`, `silo`.
- **Fracht und Fahrzeuge:** `crate`, `container`, `barrel`, `cage`, `hauler`, `cart`, `wheel`.
- **Gelände:** `pad` (Landefeld), `post`, `beacon`, `barrier`, `signpost` (Schild auf Pfosten), `sign` (Leuchtschild).
- **Aufgesetztes:** `tile` (Kachelmotiv: vent, fan, hatch, ctrl, crate, door), `decal` (Aufkleber), `number` (Ziffernfolge),
  `glow`/`glowbox` (leuchtende Fläche), `glass`, `light` (Leuchtpunkt fürs Spiel).

Streifen (`side=`, `top=`): `wall` (Paneele, reihenweise), `siding` (Lamellen), `roofing` (Dachbahnen), `floor` (Gitterrost), `beam`, `girder`,
`hazard` (Warnstreifen, Tönung `none`), `pipe`, `hose`, `plain`, `edge`. Tönungen stehen in `TINT` (linear: 0,06 ist dunkelgrau, 0,3 hellgrau).

## Texturblatt und Aufkleber ändern

- **Texturblatt:** `Trimsheet.blend` öffnen, Textblock `trim_build` ausführen: `build()` (Geometrie), `render()` (fünf Durchgänge, dauert
  rund zwei Minuten), `compose()` (Abnutzung, Schmutz, Bilder schreiben). Wer nur Abnutzung oder Schmutz ändert, braucht nur `compose()`.
  Neue Streifen oder Kacheln in `STRIPS`/`TILES` eintragen; die Streifen müssen über 12 m periodisch sein.
- **Aufkleber:** `node scripts/make-kit-decals.mjs`. Neue Felder dort eintragen; sie stehen danach in `kit_decals.json`.
- Danach `npm run assets`.

## Was man wissen muss

- Baukasten-Modelle tragen keine Bilder, nur Materialnamen `kit_*`, Texturkoordinaten und Eckfarben. Die Asset-Pipeline erkennt sie am
  Materialnamen und lässt die Texturkoordinaten ungepackt (sie kacheln über 1 hinaus).
- Eckfarbe = Lackfarbe × Verdeckung. `bake_ao` rechnet zweimal, damit Aufkleber, Kacheln und Bodenmarkierungen (alles in
  `with K.overlay():`) die Fläche darunter nicht verdunkeln.
- Aufkleber sind flach: auf gewölbten Flächen (Tanks) ein Schild davor setzen statt direkt aufzukleben.
- Relief im Spiel: `normalScale = (1, -1)`, weil die Bilder nicht gespiegelt geladen werden.
- Staub und Schnee auf waagrechten Flächen setzt das Spiel je Planet (`setKitDust`).
- Lange Rechnungen in Blender (Rendern) laufen weiter, auch wenn die Verbindung die Antwort nicht abwartet: auf die Ausgabedatei warten.

## Innenräume der Stationen (ab Alpha 0.67)

Für begehbare Stationen gibt es ein zweites Texturblatt, Leuchtschilder und eigene Teile. Bilder: `docs/baukasten/innen_1_promenade.jpg`, `innen_2_laeden.jpg`.

| Datei | Inhalt |
|---|---|
| `asset-src/neu/baukasten/trim_int.py` + `Trimsheet_Innen.blend` | Innenraum-Blatt `kit_int_*`: Wandpaneele, Technikband, Bodenplatten, Deckenplatten, Tragrippe, Rollladen, Stoff, Leiste; Motive Regal, Automat, Terminal, Spind, Schiebetür, Wandausstattung |
| `scripts/make-kit-signs.mjs` | Leuchtschilder `kit_signs`: Wegweiser, Hallennummern, Piktogramme, Abflugtafel (weiß, im Spiel in der Akzentfarbe der Station) und vier farbige Werbetafeln |
| `asset-src/neu/baukasten/kit_interior.py` | Innenraum-Teile; `install(lib)` hängt sie an `Kit` |
| `asset-src/neu/station/promenade_kit.py` + `Promenade.blend` | Beispiel: Promenade und Korridor aller Stationen |

- **Teile:** `wall`, `floor`, `ceiling` (Raumflächen), `portal` (Tragrahmen), `light_bar`, `hanging_sign`, `wall_sign`, `ad_screen`, `floor_strip`,
  `floor_line`, `duct`, `shop_bay` (Ladennische; merkt Händlerplatz, Ansprechpunkt und Schildplatz in `K.slots`), `shutter`, `vending`, `kiosk`,
  `lockers`, `sdoor`, `panel_i`, `bench`, `plant`, `planter`, `bin`, `stanchion`, `dais`. Dazu `sign` (Leuchtschild aus dem Atlas),
  `lamp` (Lichtquelle nur für die Berechnung) und `block_rect` (Standfläche, landet als `blocks` in den Zusatzangaben).
- **Streifen innen:** `iwalls`, `itech`, `ifloors`, `iceils`, `shutters` (reihenweise) sowie `rib`, `fabric`, `itrim`, `iplain`. Tönungen `i_*` in `TINT`.
- **Licht:** Mit `K.lm = True` bekommen große Flächen ein Feld in der Lichtkarte (zweiter Satz Texturkoordinaten), alles Übrige trägt sein Licht
  in den Eckfarben. `lib.bake_light(ob, 'name')` rechnet beides mit Cycles; Lichtquellen sind alle leuchtenden Flächen (Stärken in `EMIT`) und
  `K.lamp(...)`. Das Bild heißt `asset-src/tex/<name>_lightmap@2048.png`. Die Berechnung dauert rund drei Minuten.
- **Zusatzobjekte:** Teile, die das Spiel einzeln schalten soll (Rollläden leerer Läden), werden als eigene `Kit`-Objekte gebaut, mit
  `lib.bake_vertex_light(ob, ref)` beleuchtet und über `export(..., extra=[...])` in dieselbe Datei geschrieben. Im Spiel findet man sie am Namen.
- **Im Spiel:** `applyKit(body, { lightmap: 'promenade_lightmap', intensity, accent })` (src/models/kit.ts). Wegweiser und Lichtfugen (`kit_accent`,
  `kit_sign`) nehmen die Akzentfarbe der Station. In Korridor und Halle nimmt `zoneLight()` (src/game/interior.ts) Grund- und Gegenlicht des
  Spiels zurück, damit das vorberechnete Licht trägt. Ladenplätze, Standflächen und Maße liest das Spiel aus `data/kit_Promenade.json`.
- **Nach einer Dateiöffnung in Blender** erst im nächsten Aufruf rechnen lassen: Direkt danach fehlt das Fenster, das die Berechnung braucht.

## Hangar (ab Alpha 0.68)

Der Hangar aller Stationen ist ebenfalls ein Baukasten-Modell: `asset-src/neu/station/hangar_kit.py` + `Hangar_Kit.blend` → `asset-src/glb/station/Hangar.glb`,
Lichtkarte `asset-src/tex/hangar_lightmap@2048.png`. Maße wie im Spiel (184 × 162 × 42 m, Tor 124 × 32 m, drei Stellplätze).

- **Neue Teile für große Hallen** (kit_interior.py): `wall_open` (Wand mit Öffnungen), `buttress` (Wandpfeiler mit Lampen), `alcove` (Frachtnische hinter der
  Wand), `wall_lamp`, `pad_mark` (Stellplatz), `crane` (Brückenkran), `booth` (Leitstand), `console` (Bedienpult). `slab(..., holes=[...])` spart Felder
  der Bodenplatte aus, wenn dort ein anderer Belag liegt.
- **Aufbau:** Wände in fünf Zonen (Sockel, Trägerband, Lamellen, Farbband, obere Paneele), sieben Pfeiler je Seite, drei Frachtnischen je Seite,
  Laufstege, Rohre, Deckenträger mit Brückenkran, Leitstand über der Tür, Torwand mit Warnlicht.
- **Frei bleiben müssen** (steht auch im Kopf des Skripts): die Stellplätze, die Flugbahn zum Tor, der Streifen hinter dem mittleren Stellplatz
  (Story-Figuren) und die Laufwege der Passanten bei x = ±86, y = 40, y = 42 und y = −90.
- **Lichtkarte:** Die Halle ist groß, deshalb bekommen nur Flächen ab 14 m² ein eigenes Feld (`K.lm_min`); es bleiben knapp 5 Bildpunkte je Meter.
- **Flächen nie fast deckungsgleich legen:** Zwei Beläge mit wenigen Millimetern Abstand flimmern aus der Ferne. Entweder die untere Fläche aussparen
  (`holes`) oder mindestens 2 bis 3 cm Abstand lassen (Bodenlinien liegen deshalb bei 2 cm).
- **Im Spiel:** `addHangarModel()` in src/game/interior.ts erkennt das Baukasten-Modell an `data/kit_Hangar.json` und nimmt Standflächen von dort.
  Im ganzen Innenraum sind dann Grund-, Sonnen- und Gegenlicht des Spiels zurückgenommen (`zoneLight`), damit das berechnete Licht trägt.
