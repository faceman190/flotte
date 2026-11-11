# Spieldaten: Modelle, Texturen, Klänge

## Wie die Spieldaten zum Spieler kommen

- Alle Spieldaten liegen als einzelne Dateien unter `public/assets/`, jede mit einer Prüfsumme im Namen, z. B. `ship/Striker.3f2a9c01de.glb`.
- `public/assets/manifest.json` ist die Paketliste: jede Datei mit Größe und Paket.
  - **core**: wird vor dem Hauptmenü geladen (Ladebalken). Enthält Schiffe, Stationen, Figuren, Oberflächen, Klänge und den Nebel von Heimstatt.
  - **world**: weitere Nebel, Planetenkarten und Bodentexturen. Wird nach dem Start still im Hintergrund geholt. Braucht das Spiel eine Datei früher, lädt es sie sofort selbst.
- Der Service Worker (`public/sw.js`) legt jede Datei dauerhaft im Browser ab. Ab dem zweiten Start kommt alles vom Gerät, auch ohne Netz (Einzelspieler).
- Ändert sich eine Datei, bekommt sie einen neuen Namen. Der Browser lädt dann nur diese eine neu, alte Dateien räumt das Spiel nach dem Start auf (`src/core/assets.ts`).
- Der Server (`server/server.mjs`) sagt dem Browser, dass Dateien mit Prüfsumme sich nie ändern, und komprimiert Text, Code und Modelle (Brotli/gzip).

## Neue Modelle als GLB (der übliche Weg)

1. GLB-Datei in `asset-src/neu/` legen (Export-Tipps: `asset-src/neu/LIESMICH.md`) und sagen, was es sein soll.
2. Claude prüft Größe, Ausrichtung, Polygonzahl und Texturen und legt die Datei nach `asset-src/glb/<Art>/<Name>.glb`
   (Art: `ship`, `station`, `char`, `deco`). Gleichnamige Modelle ersetzen die bisherigen.
3. `npm run assets` komprimiert sie und nimmt sie in die Paketliste auf (`ship/<Name>`, `station/<Name>` …);
   danach wird das Modell im Spielcode eingebunden (Schiffsklasse, Stationsart, Figur, Dekoration).

## Schwere Modelle spieltauglich machen (Beispiel: Pfeil / Carbine Arrow)

Gekaufte Modelle sind oft für Renderbilder gemacht (Millionen Dreiecke, Innenräume, Materialien nur in der FBX).
Werkzeuge in `scripts/`:

1. `inspect-glb.mjs <datei.glb>`: Aufbau, Dreiecke, Texturen, Materialien, Abmessungen.
2. `fbx-materials.mjs <datei.fbx> <karte.json>`: liest aus der FBX, welches Teil welches Material hat (falls die GLB alles weiß zeigt).
3. `measure-decks.mjs <datei.glb> [Raster] [x0,x1,z0,z1]`: misst Raumhöhen, um den Maßstab zu prüfen (2,2–2,6 = Meter).
4. `split-visible.mjs <ein.glb> <außen.glb> <teile.json> --mat=<karte.json>`: per Sichtstrahlen nur die von außen
   sichtbaren Teile behalten (Flugmodell); die verdeckten Teile (Innenräume) stehen in `teile.json`.
5. `simplify-hard.mjs <ein.glb> <aus.glb> [Anteil] [Fehler] [Knick] --rotY=<Grad>`: stark vereinfachen (ohne Nähte),
   Normalen mit Knickwinkel neu, Transformationen einrechnen, Nase nach +Z drehen.
6. Ergebnis nach `asset-src/glb/ship/<Name>.glb`, dann `npm run assets`.

Der Pfeil: `split-visible` (3 Mio. → 2,3 Mio. sichtbare Dreiecke) und `simplify-hard 0.03 0.002 35 --rotY=90`
(→ 78.000 Dreiecke, 1,5 MB komprimiert). Spielwerte in `src/data/ships.ts`. Vorschau: `/modelview.html?f=…`.

## Ältere Wege: Rohdaten und Erzeugungsskripte

1. Rohdaten ablegen wie bisher:
   - Schiffe: `models/<Name>/glTF/…` → `node scripts/build-ships.mjs`
   - Stationen: `assets/stations/*.glb` → `node scripts/build-stations.mjs`
   - Figuren: `assets/chars/*.glb` → `node scripts/build-stations.mjs chars`
   - Oberflächen, Nebel, Planeten: `assets/tex`, `assets/nebula`, `assets/planet`, `assets/ground` → `node scripts/build-textures.mjs`
   - Klänge: `sounds/` → `node scripts/build-sounds.mjs`
   Diese Skripte schreiben Quellpakete nach `asset-src/legacy/`.
2. `npm run assets` ausführen. Das wandelt die Quellpakete in die fertigen Dateien unter `public/assets/` um:
   - Modelle mit Meshopt-Geometriekompression und WebP-Texturen (höchstens 1024 px)
   - Bilder als WebP, wenn das kleiner ist
   - neue Paketliste
3. Committen und pushen. Spieler laden beim nächsten Start nur die neuen oder geänderten Dateien.

Ein neues Paket für eine Region (z. B. nur beim ersten Besuch laden) lässt sich in `scripts/build-assets.mjs` über den dritten Wert von `put()` bzw. `image()`/`model()` festlegen.

## App-Symbol

`node scripts/build-icon.mjs` erzeugt `public/icon-192.png` und `public/icon-512.png` (für „App installieren“).

## Artifact auf claude.ai

claude.ai stellt keine `.glb`-Dateien bereit. Für das Artifact gibt es deshalb eine eigene Fassung:
`npm run build`, dann `node scripts/artifact-pack.mjs`. Das legt `dist-artifact/` an, bündelt die Modelle in
`assets/models.json` und vermerkt das in der Paketliste („embed“). Veröffentlicht wird `dist-artifact/`.

## Begehbare Innenräume aus Modellen (Pfeil)
Das Schiffsmodell ist das **vollständige** Modell (innen und außen in einer Datei, asset-src/glb/ship/<Modell>.glb); es wird nicht mehr
in Hülle und Innenteile getrennt. (Die Trennung per split-visible hatte Rumpfschalen und die Glaskanzel fälschlich nach innen sortiert,
weil deren Flächen nach innen zeigen.)
1. Kaufmodell direkt verarbeiten (Materialien setzen, Teile entfernen, vereinfachen):
   `node --max-old-space-size=14000 scripts/simplify-hard.mjs asset-src/neu/Carbine_Arrow_0.50.glb asset-src/glb/ship/Pfeil.glb 0.25 0.0004 35 --rotY=90 --mat=asset-src/glb/ship/Pfeil.materials.json --look=asset-src/glb/ship/Pfeil.look.json`
   - `Pfeil.materials.json`: Teil → Material aus der FBX (scripts/fbx-materials.mjs).
   - `Pfeil.look.json`: entfernte Teile (geschlossene Türen) und Materialien nach Teilnamen (Sofa, Kissen, Rohre, Böden, Leuchten …).
   - Teile an einer Stelle finden: `node scripts/list-parts.mjs <kauf.glb> <materials.json> x0,x1,y0,y1,z0,z1 [maxDickeZ]` (Schiffskoordinaten).
2. Materialwerte stehen in `LOOK` (scripts/glb-lib.mjs). Die Kaufdateien der Pfeil enthalten keine Texturen und nur sieben einfarbige
   Platzhalter; die Werte sind den Verkaufsbildern nachempfunden. Nach Änderungen: `node scripts/relook.mjs asset-src/glb/ship/<Modell>.glb`.
3. Laufkarte: `node --max-old-space-size=12000 scripts/build-walkmap.mjs <modell.glb> <modell.glb> asset-src/walk/<Modell>.json`
   (20-cm-Zellen, mehrere Decks, Treppen bis 45 cm, Türen gelten als offen, Gitterroste werden geschlossen; Einstieg, Sitz, Koje usw.
   und acht Lampen werden automatisch gesetzt). Pfeil: `--start=1.7,-4.3,10 --minY=-6.4 --doors=0` (Türen sind im Modell entfernt).
   Kontrolle: `node scripts/walkmap-image.mjs …` (Draufsicht) und `node scripts/slice-image.mjs <modell.glb> <modell.glb> bild.png <x> [walk.json]` (Längsschnitt).
4. `npm run assets`. Nicht ausführen, während jemand im Entwicklungsfenster spielt (Dateinamen ändern sich).
Im Spiel (src/game/meshRoom.ts) bleibt das Schiffsmodell beim Betreten stehen; der Raum bringt Licht, Spiegelungen und die Laufkarte mit.

## Venom (Startschiff)
Kaufmodell „Venom X Spaceship“ (asset-src/neu/venom-x-spaceship, ohne Texturen, ein graues Material). Weg ins Spiel:
1. `node scripts/obj-to-glb.mjs asset-src/neu/venom-x-spaceship/Venom_obj.obj asset-src/neu/_test/venom_raw.glb` (OBJ → GLB mit benannten Teilen)
2. `node scripts/simplify-hard.mjs asset-src/neu/_test/venom_raw.glb asset-src/glb/ship/Venom.glb 1 0.0001 35 --mat=asset-src/glb/ship/Venom.materials.json --look=asset-src/glb/ship/Venom.look.json`
   (keine Vereinfachung nötig: 150.000 Dreiecke; Farben nach Teilnamen in Venom.look.json)
3. `npm run assets`. Schiffsklasse `venom` in src/data/ships.ts, Startschiff in src/game/state.ts (newPlayer).

## Fahrwerk
Teile mit dem Material `gear` (Regel in <Modell>.look.json) bilden ein eigenes Mesh; `setGear()` in src/models/gltfShips.ts blendet es im Flug aus.
Auslöser im Innenraum: `spots` in <Modell>.look.json, an die Laufkarte übergeben mit `--spots=<Modell>.look.json`.

## Einzelne Aufnahmen (Schritte, Klicks, Türen, Grundgeräusche)
Dateien unter asset-src/sound/<name>.ogg kommen mit `npm run assets` ins Startpaket und sind im Spiel über `sfx('<name>')` bzw.
`ambience('<name>')` (src/core/audio.ts) abspielbar. Herkunft und Lizenz stehen in asset-src/sound/QUELLEN.txt.
Die heruntergeladenen Pakete liegen in asset-src/sound-packs/ (nicht im Repository): Kenney Sci-Fi, Interface und Impact Sounds, alle CC0.

## Asteroidenfelder (Alpha 0.54)
- Felsmodell: `asset-src/data/Rock.json` (990 Dreiecke) für abbaubare Asteroiden, `RockLo.json` (rund 300 Dreiecke,
  erzeugt mit `node scripts/rock-lo.mjs 0.3`) für Geröll und Brocken. Bilder: `asset-src/tex/rock_d.png`, `rock_n.png`.
- Aufbau in `src/game/world.ts`: `fieldRock` (abbaubar, Größen 16–92 m, die Hälfte in zwei bis drei dichten Kernen je Feld)
  und `buildDeco` (Kulisse als InstancedMesh, sechs Stücke je Feld: Geröll 1–5 m zerplatzt am Rumpf, Brocken 6–22 m sind fest;
  nicht abbaubar, nicht im Netz geteilt, auf jedem Gerät gleich aus dem Feldnamen erzeugt).
- Sektorgröße: Grundwerte in `src/data/galaxy.ts`, einmalig gestreckt mit `STRETCH` (1,3; Feldradius ×1,4; Anzahl ×1,6),
  Tore bei `GATE_DIST` 6000 m, Grenze `SECTOR_RADIUS` 8000 m.
- Vorspann: `clearRocks` räumt den Raum um das Halden-Tor und den Keil dahinter frei (`src/game/intro.ts`, `placeGate`).

## Bewegungen der Figuren aus FBX-Dateien (Alpha 0.55)
- Ablage der Rohdatei: `asset-src/neu/` (nicht im Git). Umrechnen: `node scripts/fbx-anim.mjs <datei.fbx> <figur>_<art> [figur] [fps] [align]`,
  z. B. `node scripts/fbx-anim.mjs asset-src/neu/standing_idle_merchant.fbx merchant_idle`. Ohne Namen zeigt das Skript nur, was in der Datei steckt.
- Ergebnis: `asset-src/data/anim_<figur>_<art>.json` (Art `idle` oder `walk`), nach `npm run assets` im Spiel als `DATAFILES.anim_…`.
  `src/models/charModels.ts` lädt diese Clips und nimmt sie für genau diese Figur statt der eingebauten Bewegung.
- Mixamo: am besten die eigene Figur dort hochladen und die Bewegung „mit Skin“ laden. Dann steht die Hülle in beiden Skeletten gleich,
  und das Skript überträgt die Drehungen ohne Angleichen. `align` nur bei Bewegungen auf einem fremden Körper (Mixamo-Standardfigur).
- Finger hat unser Skelett (24 Knochen) nicht; Fingerbewegungen entfallen.
