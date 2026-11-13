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

## Neue Stadt bauen

1. Skript nach dem Vorbild `stadt_kit.py` (Halle und Promenadenhaus in denselben Maßen, Rest frei), `meta()` mit Tür, Tor, Andock- und Startpunkt,
   Ständen, Wegen und Wachen (Spielkoordinaten x, z = Blender x, −y).
2. In Blender: bauen, `kit_lib.bake_ao(ob, 6.0, 16)`, `kit_lib.export(ob, 'Name', meta, kind='city')`.
3. In `planets.ts` beim Planeten `city: 'Name'` und `base: 'Name'` eintragen, `npm run assets`.
4. Große, ferne Flächen mit `K.seg = 8 … 10` bauen (breitere Spalten, weniger Dreiecke); Talstadt hat so rund 307 000 Dreiecke.
