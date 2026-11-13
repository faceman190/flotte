# Städte auf Planeten (ab Alpha 0.92)

Die meisten Planeten haben eine begehbare Basis (Landefeld, Tür, zu Fuß hinein: `src/game/basewalk.ts`). Größere Orte sind **Städte**:
Man fliegt durch ein großes Hallentor in einen echten Hangar, geht über die Promenade hinaus in die Stadt und zu Fuß durch die Straßen.

Erste Stadt: **Talstadt** auf Heimstatt II (aus der früheren Talstation; Kennung `heimstatt_base` bleibt, Spielstände gelten weiter).

## Aufbau

| Teil | Datei |
|---|---|
| Stadtmodell (Baukasten) | `asset-src/neu/stadt/stadt_kit.py` + `Talstadt.blend` → `asset-src/glb/city/Talstadt.glb`, Angaben `asset-src/data/kit_Talstadt.json` |
| Leuchtschriften der Städte | `scripts/make-kit-city.mjs` → `asset-src/tex/kit_city@2048.png`, `asset-src/neu/baukasten/kit_city.json`; im Baukasten `K.neon(...)`, Material `kit_neon` |
| Spiel | `src/game/city.ts` (Laden, Modell, Leben, Ansprechpunkte), Einbindung in `world.ts` (addStation), `surface.ts`, `interior.ts`, `onfoot.ts`, `main.ts` |
| Planet | `src/data/planets.ts`: `city: 'Talstadt'` statt einer Basis |

**Gleiches Koordinatensystem wie der Innenraum.** Das Modell ist in den Koordinaten des Stations-Innenraums gebaut (Blender-y = −z): Die Halle
umschließt genau den Hangar (184 × 162 × 42 m, Tor 124 × 32 m), das Promenadenhaus genau Korridor und Promenade. Im Spiel legt `enterInterior`
den Innenraum an den Startpunkt der Station; mit `launch = (0, 16, 112)` und Blick nach außen liegt er deckungsgleich in der Stadt.
Von außen sieht man durchs offene Tor den echten Hangar (`hangarDisplay()` in interior.ts), drinnen ist das Stadtmodell ausgeblendet.

## Ablauf im Spiel

- **Anflug:** Das Tor zeigt zum Ankunftspunkt (Nordwesten). [E] am Andockpunkt 63 m vor dem Tor oder einfach **durchs Tor fliegen**
  (`insideCityGate` → `openDock`): Der Landeanflug im Hangar übernimmt.
- **Hangar und Promenade** wie in den Raumstationen (Menüs, Händler, Werft …). Am Ende der Promenade: Tür **„Hinaus nach Talstadt“**.
- **Stadt zu Fuß** (`G.cityWalk`): Man steht auf dem Marktplatz vor dem Promenadenhaus. Das Schiff steht im Hangar (durchs Tor sichtbar),
  angedockt bleibt man die ganze Zeit. Wände und Böden kommen aus dem Stadtmodell (Dreiecksraster wie bei den Basen, nur das Modell selbst –
  `userData.walkRoot`), vor dem Hallentor steht ein Absperrgitter.
- **Ansprechen:** Marktstände (Markt), Sanität (Service), Ersatzteile (Werkstatt), Lagerhaus (Lager), Kneipe „Zur Schleuse“ (Aufträge),
  Herberge (ausruhen, Spielstand sichern), Gründerdenkmal (Tafel). Die Menüs schließen zurück in die Stadt.
- **Zurück:** Tür des Promenadenhauses → Promenade (ohne Landeanflug). **Ablegen** im Menü startet direkt aus dem Hangar.

## Leben

- 14 Passanten (Figuren mit Skelett aus den Stationen) auf festen Wegen aus `kit_Talstadt.json` → `paths`, mit Pausen; sie halten vor dem Spieler.
- Händler hinter den acht Ständen, sechs Wachen (Soldaten mit Gewehr) an Promenade, Rovertoren und Vorfeld.
- Verkehr: alle 25–45 s fliegt ein Schiff durchs Tor hinein oder heraus.
- Alles hängt am Stationsmodell (eine Gruppe „leben“) und verschwindet mit ihm im Innenraum.

## Laden

Das Stadtmodell (7 MB) liegt im **Hintergrund-Paket** (`asset-src/glb/city/` → Paket `world`, im Spiel `window.CITYDATA`).
`preloadCities()` holt es kurz nach dem Start. Landet man vorher auf dem Planeten, steht vorerst die Basis; sobald die Stadt geladen ist,
ersetzt `addStation` sie (solange man nicht gerade dort angedockt ist). Pflanzen, Felsen und Versorgungskisten halten um eine Stadt 360 m Abstand (`src/game/keep.ts`).

## Neonhafen (ab Alpha 0.93): Cyberpunk-Gassen auf Neuhafen IV

Zweite Stadt, aus der Klippenbasis (Kennung `neuhafen_base`). Skript `asset-src/neu/stadt/neonhafen_kit.py` + `Neonhafen.blend` → `asset-src/glb/city/Neonhafen.glb` (rund 457 000 Dreiecke, 11 MB im Hintergrund-Paket).

- **Aufbau:** Hangarhalle und Promenadenhaus wie in Talstadt (gleiches Koordinatensystem), darüber der 113 m hohe **Hafenturm** (Krone LUMEN KORP, Holo-Ring)
  und der **Kapselturm** über der Promenade. Drumherum 33 Türme (48–118 m, hohe mit Rücksprung und Dachterrasse) und ein Netz enger **Gassen** (8–9 m):
  Ladenzeilen im Erdgeschoss mit Neon, Kabel mit Laternen quer über die Gassen, Laufbrücken, Klimakästen, Rohre, Pfützen, Abfall, Dampfschächte.
- **Lichtplatz** hinter der Promenade: abgesenkte Grube mit der Lichtskulptur „Der Funke“ (im Spiel drehende Ringe um einen leuchtenden Kern), vier Lampensterne,
  NACHTMARKT-Hologramm, Lichtvorhang, zwei Garküchen (Schleusenbräu, Nudelbar Drache), Bänke, Automaten; Werbewand LUMEN am Nordturm.
- **Ansprechen:** Garküche (Aufträge), Kapselhotel in der Seitengasse am Promenadenhaus (ausruhen), Läden (Markt, Service, Werkstatt …), Skulptur.
- **Stil „neon“** (`style: 'neon'` in den Angaben, `src/game/city.ts`): Je tiefer man in der Stadt ist (Kamera innerhalb der Grenzen, unter 120 m), desto dichter
  der bläuliche Dunst, desto dunkler Sonne und Grundlicht und desto stärker das Leuchten (Bloom). Hologramme flackern, Dampf steigt aus den Schächten,
  bis zu 30 Passanten. Im Innenraum regelt der Innenraum das Licht; beim Verlassen des Planeten werden Nebel und Licht zurückgesetzt.
- **Neue Baukasten-Teile:** `K.facade` (Turmfassade als eine Fläche, Material `kit_tower`: kachelndes Bild mit Fenstern und Leuchtkarte, `scripts/make-kit-tower.mjs`),
  `K.holo` (Hologramm, `kit_holo`), zweiter Neon-Atlas `kit_city2` (`scripts/make-kit-city2.mjs`: Nachtmarkt, Neonhafen, Lumen Korp, Volta, Nudelbar Drache,
  Kapselhotel, Schleusenbräu, Späti 24/7, Klinik, Pfandhaus, Robo·Tek, Karaoke, Zone 3, Piktogramme, senkrechte Schilder, zwei Werbewände), Boden `kit_wet` (dunkel, glänzend).
- **Nebenbei für alle Städte:** Wer zu Fuß in der Stadt ist, ist für Mitspieler sichtbar (Netz-Zustand „fuss“); die Kamera der Außensicht rückt vor Hauswänden heran;
  die Promenadentür hat Vorrang vor anderen Ansprechpunkten.

## Neonhafen ab Alpha 0.94: gegliederte Hochhäuser und neue Gassen

Die 33 Kastentürme sind ersetzt. Jeder Block behält seinen Ladensockel (Gassen, Wege, Läden und Ansprechpunkte bleiben, wo sie waren), darüber
steht ein Mittelbau mit vier bis acht Geschossen und darauf ein oder zwei Hochhäuser aus `hochhaus_kit.py` (Bündeltürme nach Kennzahl; zehn Blöcke und
der Nordturm tragen einen der ausgearbeiteten Typen). Hafenturm und Kapselturm haben die neuen Fassaden, Rippen und Kronen. Höchster Punkt rund 287 m.

- **Gassen:** Belag `kit_sta` über die ganze Stadt, Längsgassen mit Fahrbahn `kit_stb` (Rinnen, Linien, Schienenbett, Leuchtpunkte), Quergassen mit
  Mittelstreifen aus Metalldeck `kit_stc`; Kabelbündel mit Lampions, Auslegerschilder, Rohrleitungen auf Konsolen, Werbetafeln mit Rahmen.
- **Schaufenster:** gedämpftes Ladenlicht (`kit_shopw`, `kit_shopc`) mit Sprossen, Regalböden und Ware als dunkle Umrisse (vorher verdeckte dunkles Glas das Licht).
- **Lichtplatz:** Geländer mit Scheiben und Lichtfuge um die Grube, Metalldeck als Rand, zwei Werbesäulen, Pflanzkübel.
- **Im Spiel** (`src/models/kit.ts`): Stadtmaterialien entstehen erst, wenn ein Modell sie nennt (`cityMat`), ihre Bilder liegen im Hintergrund-Paket
  (`asset-src/tex-world`, erzeugt von `scripts/sync-city-tex.mjs`). Eigene Spiegel-Umgebung `cityEnv` (dunstiger Himmel, Stadtlichter): Die Umgebung der
  Szene ist der Nebel des Sektors, und `envMapIntensity` wirkt in three nur mit eigener `envMap`; ohne sie spiegelten die Pfützen rötlich.
  Farbe der Fassaden 2,4-fach aufgehellt und nur 20 % Metall, sonst sind sie im Tageslicht fast schwarz.
- **Umfang:** rund 628 000 Dreiecke, 759 Leuchtpunkte (oben ausgedünnt), Modell 15,6 MB im Hintergrund-Paket, Texturen rund 2,5 MB.
- **Neu bauen:** `node scripts/make-kit-hh.mjs`, `node scripts/make-kit-str.mjs`, `node scripts/sync-city-tex.mjs`; in Blender (`Neonhafen.blend`)
  `neonhafen_kit.build`, `kit_lib.bake_ao(ob, 6.0, 16)`, `kit_lib.export(..., kind='city')`; dann `npm run assets`.

## Hochhaus-Baukasten (seit Alpha 0.94 in Neonhafen)

Gegliederte Türme statt glatter Quader: `asset-src/neu/stadt/hochhaus_kit.py` + `Hochhaeuser.blend`, Vorschaubilder in `asset-src/neu/stadt/bilder/`.

- **Fassaden:** drei kachelnde Bilder mit Relief (`scripts/make-kit-hh.mjs` → `asset-src/neu/stadt/tex/`): `kit_hha` Glasraster, `kit_hhb` schwere Paneele,
  `kit_hhc` Fensterbänder; je Farbe, Leuchten, Relief und Rauheit/Metall. Sie liegen bewusst nicht in `asset-src/tex`, weil dort alles ins Kernpaket des Spiels wandert.
  Im Baukasten: `K.facade(..., mat='kit_hha')`; die Tönung der Ecken färbt die Fassade.
- **Bausteine:** `shaft`, `slab` (angesetzte Scheibe), `pod`, `fins`, `ledges`, `band`, `pier`, `step_crown`, `lattice_crown`, `crown_spikes`, `roof_mech`,
  `landing_pad`, `billboard`, `edge_strip`, `risers`, `balconies`, `crane`, `skybridge`, `podium`.
- **Türme:** `tower_konzern`, `tower_stufen`, `tower_kern`, `tower_rund`, `tower_werk` und `tower_bundle(K, (x, y), seed, h, w, d, far=False)` für beliebig viele Varianten
  (`far=True`: sparsame Fassung für den Hintergrund). Schaubühnen: `lineup(lib)` und `city(lib)`.
- **Vorschau in Blender:** Dunst als Volumenkasten (nicht über die Welt, das schluckt alles). Punktlichter im Dunst nur ohne Schatten und mit mäßiger Leistung, sonst fällt der Dunst aus.

## Straßen-Baukasten (seit Alpha 0.94 in Neonhafen)

Straßen, Plätze und Gassen zu den Hochhäusern: `asset-src/neu/stadt/strassen_kit.py`, Schaubühne `street_scene(lib)` → Objekt „Hochhaus_Strasse“
(liegt in der Schlucht der Hochhaus-Stadt; dafür `hochhaus_kit.city(lib, street=True)`). Bilder: `asset-src/neu/stadt/bilder/strasse_*.jpg`.

- **Beläge** (`scripts/make-kit-str.mjs` → `asset-src/neu/stadt/tex/`): `kit_sta` Gehweg/Platz (Betonplatten, Rostreihe, Riffelblech), `kit_stb` Fahrbahn
  (läuft längs: Rinnen, gelbe Linien, Pfeile, Schienenbett, Leuchtpunkte), `kit_stc` Metalldeck. Alle mit Relief, Pfützen (glatt, dunkel) und Abnutzung.
- **Querschnitt:** Fahrbahn 10,24 m, Gehweg bis zur Baulinie (10,6 m von der Mitte), Häuser mit 3,8 m tiefer Arkade im 5,4 m hohen Erdgeschoss.
- **Bausteine:** `road`, `curb`, `crosswalk`, `street_building` (Arkade, Stützen, Ladenbuchten `bay_stall` / `bay_glass` / `bay_shutter` / `bay_service`,
  Vordächer, Leuchtschriften, Auslegerschilder, Rohre), `alley`, `plaza` (Stufen, Geländer, Stände, Werbesäulen, Tanks), `lamp_post`, `bollard`, `blade_sign`,
  `cable_span` (Kabelbündel mit Lampions), `ad_pylon`, `pipe_run`, `tank_stack`, `glass_rail`, `furnish` (Bänke, Kübel, Automaten, Poller, Kisten).
- **Vorschau in Blender:** Abendlicht, rund 190 Punktlichter aus `K.lamp` (nur die Laternen mit Schatten), Spiegelungen der nassen Böden über Raytracing.
  Im Spiel gibt es diese Lichter nicht: Dort tragen Leuchtflächen, Glüh-Punkte, Überstrahlen und die Spiegel-Umgebung der Stadt die Stimmung.

## Neue Stadt bauen

1. Skript nach dem Vorbild `stadt_kit.py` (Halle und Promenadenhaus in denselben Maßen, Rest frei), `meta()` mit Tür, Tor, Andock- und Startpunkt,
   Ständen, Wegen und Wachen (Spielkoordinaten x, z = Blender x, −y).
2. In Blender: bauen, `kit_lib.bake_ao(ob, 6.0, 16)`, `kit_lib.export(ob, 'Name', meta, kind='city')`.
3. In `planets.ts` beim Planeten `city: 'Name'` und `base: 'Name'` eintragen, `npm run assets`.
4. Große, ferne Flächen mit `K.seg = 8 … 10` bauen (breitere Spalten, weniger Dreiecke); Talstadt hat so rund 307 000 Dreiecke.
