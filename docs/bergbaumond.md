# Bergbaumond Brocken und Schmelzwerk Zwölf (ab Alpha 0.95)

Im Sektor Kupferbucht kreist der Mond **Brocken** um einen Gasriesen. Auf ihm steht die Großraffinerie **Schmelzwerk Zwölf**.

## Der Mond

| Teil | Wo |
|---|---|
| Planetentyp `mond` | `src/data/planets.ts` (PTYPE: grauer Regolith, schwarzer Himmel, neun Krater, Erze: Eisen, Kupfer, Titan, Seltene Erden) |
| Boden | `scripts/make-mond-boden.mjs`: Geröllbild rocks_ground_02 (Poly Haven, CC0) entfärbt → `asset-src/tex-src/polyhaven/mond_kies`; Kachelgröße und Tönung in `surface.ts` (GROUND.mond) |
| Steine | `src/game/flora.ts`: FLORA.mond mit `stones` (zwei Lagen Geröll rund um die Kamera, gekippt, ohne Farbstich), mehr Felsbrocken und Felsnadeln |
| Himmel | `src/core/sky.ts`: `body.giant` zeichnet den Gasriesen (verwirbelte Bänder, Sturmfleck, Nachtseite, verdeckt die Sterne), `moon` einen kleinen Begleiter, `air` nahe 0 nimmt den Schein der Lufthülle weg |
| Im Orbit | Sektor Kupferbucht hat einen Planeten; der Mond nutzt die Karte der Aschewelt und fast keine Lufthülle (`planetVis.ts`). Der Gasriese ist nur von der Oberfläche aus zu sehen. |

## Schmelzwerk Zwölf

Modell: `asset-src/neu/raffinerie/schmelzwerk_kit.py` + `Schmelzwerk.blend` → `asset-src/glb/base/Schmelzwerk.glb` (rund 70 000 Dreiecke, 1,8 MB im Hintergrund-Paket).

- **Anlage:** Leitstand mit Nummernturm, zwei Schmelztürme (sich verjüngende Monolithen mit roten Lichtschlitzen und Ofenglut), Ofenhalle mit drei Schloten,
  Brecher mit Förderbändern und Erzhalden, Tanklager mit Rohrbrücke, drei Fackelmasten, Frachtfeld mit Kran, Wohnmodule auf Stelzen, Betonhof mit Landefeld.
- **Regel für die Tür:** Das Spiel sucht die Tür an der ersten Wand zwischen Landefeld und Ursprung (`basewalk.ts`). Das Feld liegt deshalb gerade vor dem Leitstand,
  und der Streifen dazwischen bleibt frei von hohen Aufbauten und Lichtmasten.
- **Bohrturm** (`build_bohrturm`): eigenes kleines Modell, steht im Spiel an jeder der sechs Lagerstätten des Monds.
- **Laden:** Modelle unter `asset-src/glb/base` kommen ins Hintergrund-Paket (`window.BASEDATA`). `loadBase` / `buildBaseModel(name)` / `buildDeco(name)` in
  `src/models/stationModels.ts`; bis das Modell geladen ist, steht der Außenposten, dann tauscht `addStation` es aus (wie bei den Städten).
  Ein Planet bekommt ein eigenes Basis-Modell über `model:` in `planets.ts`.
- **Bewegtes** (`src/game/basefx.ts`, aus den Zusatzangaben `flares`, `steam`, `glow`): Flammen an den Fackelmasten, Rauch- und Dampffahnen, pulsierende Ofenglut,
  dazu vier Geysire im Gelände (weit sichtbare Dampfsäulen).

## Großraffinerie

`refineBonus` an der Station (`planets.ts`, `galaxy.ts`): je 3 Rohstoff 2 Barren zur halben Gebühr statt 2 → 1 (`refineInfo` / `refine` in `src/game/economy.ts`,
Text im Reiter Raffinerie in `src/ui/dock.ts`). Es wird nur in ganzen Chargen geschmolzen.

## Neu bauen

1. In Blender (`Schmelzwerk.blend`): `ob, extra = schmelzwerk_kit.build(lib)`, `lib.bake_ao(ob, 6.0, 16)`, `lib.export(ob, 'Schmelzwerk', schmelzwerk_kit.meta(extra), kind='base')`;
   Bohrturm ebenso mit `build_bohrturm` und `{'R': 14}`.
2. `node scripts/make-mond-boden.mjs` (nur wenn das Bodenbild fehlt), `npm run assets`.

## Alpha 0.98: Lampenlicht und Schatten
Das Schmelzwerk hat eine Lichtkarte (Flutlichter, Ofenglut, Lichtschlitze) und eine Schattenkarte (Sonne, Himmel). Aufruf und Werte stehen im Kopf von `schmelzwerk_kit.py` und in `docs/staedte.md` (Abschnitt „Schattenkarte, Lampenlicht und Lichtraster“). Der Bohrturm hat keine eigenen Karten.
