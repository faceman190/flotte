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
