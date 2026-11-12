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
- **Gelände:** `pad` (Landefeld), `post`, `beacon`, `barrier`, `sign`.
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
