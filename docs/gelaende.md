# Neues Planetengelände (Test, `?gelaende=neu`)

Seit 2026-11-25 hinter dem Testschalter `?gelaende=neu` (zurück mit `?gelaende=alt`, bleibt im Browser gespeichert).

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
