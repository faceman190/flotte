# Planetengelände (Standard seit 2026-11-25)

Seit 2026-11-25 Standard. Das alte Gelände ist zum Vergleich mit `?gelaende=alt` erreichbar (bleibt im Browser gespeichert, zurück mit `?gelaende=neu`).

## Was anders ist
- **Form** (`src/game/terrain.ts`): Simplex-Rauschen ohne Details unter 2,5 Gitterfeldern, Domain Warping, Gebirge nur in Regionen,
  runde Grate (`sqrt(n² + k)` statt `|n|`), Krater mit Schüssel, Rand, Auswurf und Zentralberg, Dünen auf Wüstenwelten.
- **Gitter** 513 × 513 statt 257 × 257 (15,6-m- statt 31-m-Felder). `heightAt` folgt weiter genau den Dreiecken.
- **Erosion** beim Landen: Tropfen-Erosion (Rinnen, Talböden) und thermische Erosion (Schutthalden). Ergebnis je Planet im Speicher.
- **Seen**: Höhen werden so verschoben, dass etwa 7 % des Spielgebiets unter dem Flüssigkeitsspiegel liegen.
- **Shader** (`groundShader` in `surface.ts`, `#define TERR`): Normale pro Bildpunkt aus einer Geländekarte (keine Dreieckskanten im Licht),
  Masken für Abfluss (feucht, dunkler), Sediment (feiner Boden statt Fels), Schutt (Geröll), Krümmung (Fels an Kuppen).
- **Bewuchs** (`flora.ts`): Felsbrocken auf Schutthalden, an Hängen und Kuppen; Geröll auf allen Planeten nach Schuttmaske;
  Gras und Büsche dichter auf Sediment und an Rinnen.

## Böden aus dem Fab-Paket „MW Landscape Auto Material“
1. Paketordner `Content/MWLandscapeAutoMaterial` in ein Unreal-Projekt kopieren, Projekt öffnen.
2. `Tools > Execute Python Script…` → `scripts/ue/mw_export.py` (schreibt nach `<Projekt>/WebExport/mw`).
3. `node scripts/mw-import.mjs "<Projekt>/WebExport/mw"`, dann `npm run assets`.
Danach nutzt das neue Gelände auf Fels-, Wüsten- und Eiswelten die MW-Böden (`MWSET` in `surface.ts`).

## Kosten
Aufbau beim ersten Landen rund 1–1,5 s länger (Höhen und Erosion), danach aus dem Speicher.

## Gras und Licht (src/game/grass.ts, terrain.ts bakeLight)

- **Gras als echte Halme:** Zwei Gitter aus Büscheln ziehen mit der Kamera mit (nah 0,6-m-Zellen mit 14 Halmen bis 36 m, fern 1,5-m-Zellen mit 6 Halmen bis 90 m; bei niedriger Grafikqualität nur ein Gitter). Alles rechnet der Vertex-Shader: Platz und Größe aus der Zellnummer, Boden aus der Höhentextur (genau die Dreiecke des Geländenetzes), Dichte aus den Erosionsmasken (Sediment und Rinnen dicht, Schutt kaum, Steilhang nichts), große Flecken, keine Halme unter Wasser, über der Schneegrenze, auf den Schneeflecken des Bodenshaders und auf dem Landeplatz. Wind schwingt in langen Wellen. Die alten Grasbüschel-Karten entfallen im neuen Gelände.
- **Licht:** Die Sonne steht im neuen Gelände tiefer (Höhe 0,3–0,48), damit Hänge Form bekommen. `bakeLight` rechnet beim Landen einmal weiche Bergschatten (Strahl zur Sonne bis 4,5 km) und Umgebungsverdeckung (8 Richtungen) in eine 257er Textur. Boden und Gras dunkeln damit direktes Licht bzw. Umgebungslicht ab.
