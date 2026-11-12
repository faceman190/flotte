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

## Bewegungen der Figuren aus FBX-Dateien (Alpha 0.55/0.56)
- Rohdateien in asset-src/neu/ (nicht im Git). Alle Clips neu erzeugen: `sh scripts/anims.sh`, danach `npm run assets`.
  Einzeln: `node scripts/fbx-anim.mjs <datei.fbx> <figur>_<art> --figure=merchant|worker [--inplace] [--in=s --out=s] [--alt=s] [--fps=20]`;
  ohne Namen zeigt das Skript nur, was in der Datei steckt.
- Arten je Figur: `idle`, `walk` (Schleife, auf der Stelle), `start` (Anlaufen), `stop` (Abbremsen), `talk1`, `talk2`.
  Ergebnis: asset-src/data/anim_<figur>_<art>.json mit `meta` (Tempo in m/s, Tempo je Bild, zweiter Einstieg).
- Im Spiel: src/models/charModels.ts lädt die Clips (`DATAFILES.anim_…`) und führt jede Figur über `animStep`
  (Stehen → Anlaufen → Gehen → Abbremsen → Stehen, dazwischen Sprechen über `animTalk`). Beim Anlaufen und Abbremsen
  gibt der Clip das Tempo vor, damit die Füße nicht rutschen. `npcSpeak(name, sekunden)` in src/game/interior.ts lässt eine Figur gebärden;
  die Geschichte ruft es für jede gesprochene Zeile auf (src/game/story.ts, speak).
- Mixamo: die eigene Figur dort hochladen und die Bewegung „mit Skin“ laden. Dann steht die Hülle in beiden Skeletten gleich,
  und das Skript überträgt die Drehungen ohne Angleichen. `--align` nur bei Bewegungen auf einem fremden Körper (Mixamo-Standardfigur).
  Die jetzigen Dateien beruhen auf dem Händler-Körper; auf den Arbeiter passen sie über die gleiche Grundhaltung.
- Finger hat unser Skelett (24 Knochen) nicht; Fingerbewegungen entfallen.

## Bastion (Alpha 0.58)
- Quelle: `asset-src/neu/bastion/Bastion.blend` (in Blender per Skript gebaut; die Hilfsfunktionen liegen als Text `bastion_lib` in der Datei).
  Export fürs Spiel: alle Netze der Sammlung „Bastion“ zu einem Netz verbunden → `asset-src/glb/station/Carrier.glb`, dann `npm run assets`.
- Im Spiel: `buildCarrierModel()` in `src/models/stationModels.ts`. Maßstab `CARRIER_K` 1,9 (Rumpf rund 975 m, doppelt so lang wie die alte Bastion).
  Punkte sind dort in Blender-Koordinaten notiert (`B(x, y, z)`): Andockpunkt über der Plattform an Steuerbord, Startpunkt in der Mitte der
  Hangaröffnung (dort schließt der begehbare Hangar an), Kollisionskugeln, Lauflichter, Triebwerksglühen.
- Materialnamen `bastion_*` steuern im Spiel Leuchtstärke und Durchsicht (Hangarfeld). Fehlt die Datei, erscheint die alte Bastion aus Grundformen.

## Figuren aus Bildern, gebaut in Blender (Alpha 0.59)
- Quelle: `asset-src/neu/figuren/Figuren.blend`. Je Figur drei Bilder im selben Ordner: `<name>_vorn.png`, `<name>_hinten.png`, `<name>_seite.png`
  (Higgsfield, Modell gpt_image_2_6, 0,25 Credits je Bild; Rück- und Seitenansicht mit der Frontansicht als Vorlage erzeugt).
- Die Skripte liegen als Textblöcke in der Blender-Datei: `figur_lib` (Bilder laden, Umriss erkennen), `figur_build` mit
  `build_figure(Name, Größe)` (Körper aus den Umrissen: je Bildzeile ein elliptischer Querschnitt, Tiefe aus der Seitenansicht;
  Voxel-Verschmelzung, Glättung, 9.000 Dreiecke; Textur aus allen drei Ansichten weich überblendet und in ein Bild gebacken)
  und `rig_figure(P)` (Händler-Skelett einpassen, automatische Gewichte, Körper in die T-Haltung des Skeletts bringen).
- Export: Skelett `Armature` und Netz auswählen → `asset-src/glb/char/<name>.glb` (ohne Animation), dann `npm run assets`.
- Im Spiel: Größe in `HEIGHT` und Skelett-Vorbild in `RIG_OF` (src/models/charModels.ts). Weil das Skelett mit dem des Händlers
  übereinstimmt, laufen alle Händler-Bewegungen ohne Umrechnung. Story-Figuren wählen das Modell über `NpcLook.model` (src/game/interior.ts).
- Grenzen der Methode: einfache Körperform (keine Nase, Fäustlinge statt Finger), an Kopfseite und Körperflanken leicht verwischte Textur.

## Figuren von Meshy (Alpha 0.60)
- Erzeugt über Higgsfield (`multi_image_to_3d`, Vorder- und Rückansicht, Textur und Skelett, 35 Credits je Figur).
  Rohdatei: `asset-src/neu/figuren/<name>_meshy.glb` (15.000 Dreiecke, Textur 2048 px, Skelett mit denselben Knochennamen wie Händler und Arbeiter).
- Das Skelett von Meshy hat je Figur eine andere Grundhaltung. Damit die Händler-Bewegungen passen, wird die Figur in Blender
  (`Figuren.blend`) umgestellt: jeden Knochen so drehen, dass er wie der Händler-Knochen in Ruhe zeigt, das Netz in dieser Haltung
  einfrieren und die Haltung als neue Ruhelage übernehmen. Gewichte und Knochenlagen von Meshy bleiben erhalten.
- Export wie bei den Blender-Figuren nach `asset-src/glb/char/<name>.glb`; im Spiel `HEIGHT` und `RIG_OF` in src/models/charModels.ts.
- Achterberg nutzt seit Alpha 0.60 die Meshy-Fassung; die aus Bildern gebaute Fassung liegt ausgeblendet in der Blender-Datei.
- Alpha 0.61: Mechaniker (1,78 m) und Lagerarbeiter (1,86 m) kommen ebenfalls von Meshy. Umstellen und Export erledigt
  `meshy_to_merchant(Name)` (Textblock `figur_build` in `Figuren.blend`). Im Spiel rechnet `fit()` in src/models/charModels.ts
  die Hüftspur geliehener Clips auf die Beinlänge der Figur um. Einsatz: Hangarmeister = Mechaniker, die Leute auf den Gängen
  gemischt aus Arbeiter, Lagerarbeiter und Mechaniker (`buildPerson(..., model)` in src/game/interior.ts).

## Hangar (Alpha 0.62)
- Quelle: `asset-src/neu/hangar/Hangar.blend` (per Skript gebaut; Textblöcke `hangar_lib` und `hangar_build` mit `build_shell`, `build_details`, `build_props`).
  Gebaut in den Maßen aus `src/game/interior.ts` (184 × 162 × 42 m, Tor 124 × 32 m, drei Stellplätze). Koordinaten im Skript sind Spielkoordinaten.
- Export: alle Netze der Sammlung „Hangar“ verbunden → `asset-src/glb/station/Hangar.glb`, dann `npm run assets`.
  Die Standflächen der Requisiten schreibt das Skript nach `hangar_blocks.json`; daraus entsteht `src/data/hangarBlocks.ts` (im Spiel nicht begehbar).
- Im Spiel: `addHangarModel()` in `src/game/interior.ts` ersetzt die Grundformen des Hangars (Korridor und Promenade bleiben wie bisher).
  Materialnamen `hangar_*`: Boden und Wand nehmen Farbe und Rumpfbild des Stationstyps, `hangar_accent` dessen Akzentfarbe, Leuchtflächen strahlen von selbst.
- Der Streifen hinter dem mittleren Stellplatz (x −30 … 30, z −41 … −24,5) bleibt frei: Dort kommt der Spieler an, dort stehen die Story-Figuren.

## Hangar: Oberflächen und vorberechnetes Licht (Alpha 0.63)
- Oberflächen: `node scripts/make-hangar-tex.mjs` erzeugt vier kachelbare Bilder nach `asset-src/tex/` (`hangar_floor`, `hangar_wall`, `hangar_metal`, `hangar_paint`).
  Das Relief dazu rechnet das Spiel selbst aus der Helligkeit (src/core/textures.ts). Die Kachelgröße je Material steht in `addHangarModel()` (Meter je Wiederholung).
- Licht: In `Hangar.blend` liegt die Sammlung `Hangar_Export` mit zwei Netzen. `Hangar_Huelle` (Boden, Wände, Decke; ohne unsichtbare Flächen)
  hat einen zweiten Satz Texturkoordinaten `Lightmap`; darauf rechnet Cycles das Licht der Deckenleuchten (Bild `Hangar_Lichtkarte`, 2048 px) und die
  Verdeckung durch nahe Gegenstände (Bild `Hangar_Verdeckung`, Reichweite 3,5 m). Beides zusammen wird `asset-src/tex/hangar_lightmap@2048.png`.
  `Hangar_Rest` (Details, Requisiten) trägt sein Licht in den Eckpunktfarben (`Col`).
- Kodierung: Helligkeit L → v = x / (1 + x) mit x = L / 0,2647, gespeichert als sRGB. Die Kontaktschatten sind absichtlich kräftiger als gerechnet
  (v · (1 − 0,75 · Verdeckung^0,6)), sonst gehen sie unter den vielen Deckenleuchten unter. Stärke im Spiel: `HANGAR_LIGHT` in src/game/interior.ts.
- Pipeline: Ein Bild `name@2048.png` in `asset-src/tex/` darf bis zu dieser Größe bleiben (sonst höchstens 1024 px). Modelle mit zweitem Satz
  Texturkoordinaten behalten ihn beim Packen (scripts/build-assets.mjs), sonst ginge die Zuordnung zur Lichtkarte verloren.
- Nach Änderungen am Hangar in Blender: beide Netze neu erzeugen, Licht und Verdeckung neu rechnen, Bild und GLB neu schreiben, `npm run assets`.
  Das Spiel leuchtet den Hangar dann nicht mehr selbst aus; fehlt die Lichtkarte, bekommen die Flächen wieder ein schwaches Eigenleuchten.

## Planetenböden von Poly Haven (Alpha 0.64)
- Quelle: polyhaven.com, Lizenz CC0. Rohdateien in `asset-src/tex-src/polyhaven/<Name>/` (col.jpg, nor.jpg in OpenGL-Ausrichtung, rough.jpg; je 2k).
  Welche Textur zu welchem Planetentyp gehört, steht in `asset-src/tex-src/polyhaven/ground.json`:
  Fels `rocks_ground_02`, Wüste `sand_01`, Eis `snow_02`, Vulkan `dark_rock`, Asche `moon_01`, Kristall `dark_rock_02`.
- `npm run assets` macht daraus `planet/ground/<Typ>` (Farbe), `planet/groundn/<Typ>` (Relief) und `planet/groundr/<Typ>` (Rauheit), je 1024 px WebP.
  Sie ersetzen die früheren KI-Bodenbilder gleichen Namens.
- Im Spiel (`groundShader` in src/game/surface.ts, Tabelle `GROUND`): Das Bild liegt in der eingescannten Größe (m), aus drei Richtungen projiziert,
  damit es an Hängen nicht verzerrt. Mit der Entfernung gröbere Stufen (7,3- und 41-fach) mit weniger Kontrast, dazu grobe Flecken gegen Wiederholung;
  bei flachem Blickwinkel weniger Kontrast (sonst Streifen). `tint` zieht die Fotofarbe zur Bodenfarbe des Planetentyps (planets.ts, ground[1]).
- Neue Textur: Ordner mit den drei Bildern anlegen, in ground.json eintragen, in `GROUND` Größe und Färbung setzen, `npm run assets`.

## Außenposten auf den Planeten (Alpha 0.65)
- Quelle: `asset-src/neu/aussenposten/Aussenposten.blend`, gebaut per Skript `asset-src/neu/aussenposten/posten_build.py` (in der Datei als Textblock `posten_build`,
  Aufruf `build_all()`). Maße in Metern, Vorderseite nach −Y, Ursprung = Boden in der Mitte des Hauptgebäudes.
  Hauptgebäude mit Tor und Rampe, schräge Flügel mit gelben Trägern, Turm mit Antenne und Schüssel, Geschütz; drumherum Lichtmasten, Fässer in Käfigen,
  Lader, Wagen, zwei Ladeplattformen, Tanks, Funkbake, Markierungspfosten, Abwehrgeschütz und ein Landefeld (PAD = (−62, −38)).
- Export: Kopien aller Teile der Sammlung „Posten“ zu einem Netz verbunden (Sammlung „Posten_Export“, ein Teilnetz je Material) →
  `asset-src/glb/station/Aussenposten.glb`, dann `npm run assets`.
- Im Spiel: `buildBaseModel()` in src/models/stationModels.ts ersetzt für alle Planetenbasen das frühere KI-Modell. Materialnamen `posten_*`
  bekommen die Hangarbilder (Metall, Lack, Boden); waagrechte Flächen tragen Staub bzw. Schnee in der Bodenfarbe des Planeten (`setOutpostDust` in surface.ts).
  Andockpunkt 12 m über dem Landefeld; Kollision nur für Teile über 1 m Höhe, damit das Landefeld frei bleibt.

## Baukasten (Alpha 0.66)
Gebäude und Umgebungen entstehen ab jetzt mit dem Baukasten: gemeinsames Texturblatt, Aufkleber-Atlas und eine Bibliothek von Bauteilen in Blender.
Alles dazu steht in `docs/baukasten.md`. Der Außenposten der Planeten ist das erste Gebäude daraus (`asset-src/neu/aussenposten/posten_kit.py`);
das frühere Skript `posten_build.py` bleibt nur als Vorgänger liegen. Auf Planeten nimmt das Gegenlicht jetzt die Farbe des Himmels am Horizont
(src/core/sky.ts), statt des blauen Raumlichts.

## Planetenoberflächen: Gelände, Himmel, Bewuchs (Alpha 0.69)

Alles entsteht im Spiel, ohne neue Dateien.

- **Gelände bis zum Horizont** (`src/game/surface.ts`): Die Höhenformel `hfun` gilt für die bespielbare Karte (8 × 8 km) und für ein grobes Netz drumherum (34 km, 125 m je Feld). Außerhalb der Karte läuft das Gelände als Bergland weiter; unter der Karte liegt das ferne Netz 70 m tiefer, am Rand schließt es an. Die Flüssigkeitsfläche reicht ebenso weit.
- **Bodenauflage** (im Bodenmaterial): Schnee, Sand, Asche, blankes Eis oder Reif liegen in Flecken auf flachen Stellen, mit der Höhe zunehmend. Auf dem Felsplaneten färbt eine Wiesenschicht die tiefen, flachen Lagen. Dunst sammelt sich in den Tälern und wächst mit der Entfernung. Die Werte je Planetentyp stehen in `SKYLOOK`.
- **Himmel** (`src/core/sky.ts`, `ATM_FS`): Verlauf mit Dunst am Horizont, Sonnenschein, ziehende Wolken aus Rauschen, Sterne im Zenit und ein Nachbarplanet als beleuchtete Sichel, bei manchen Sektoren mit Ring (Richtung, Größe und Farbe stehen je Sektor fest: `skyBody`). Aufruf über `setSurfaceSky` mit `clouds`, `cloudCol`, `stars`, `body`.
- **Bewuchs und Felsen** (`src/game/flora.ts`): Felsbrocken und Felsnadeln stehen fest über die Karte verteilt. Gras, Büsche und Bäume entstehen nur rund um die Kamera und ziehen mit; eine feste Zufallszahl je Zelle entscheidet über Ort und Größe, so steht jede Pflanze immer an derselben Stelle. Die Bilder für Gras, Busch und Nadelbaum werden einmal auf eine Zeichenfläche gemalt. Was wächst, steht je Planetentyp in `FLORA`.
- Seen spiegeln die Himmelsfarbe statt des Weltraums.
