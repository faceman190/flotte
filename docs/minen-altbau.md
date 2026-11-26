# Minen: Altbau aus den Megascans „Old Mine“

Stand 2026-11-26. Ersetzt in Minen (nicht in Wracks/Schiffen) die Stahl-Module aus `Mine_Kit.glb` durch gescannte Holz- und Stahlteile.
Code: `src/game/mineAlt.ts` (Laden), `src/game/dungeon.ts` → `buildAltProps`, `lined`, `buildRock(…, alt)`.

## Quelle und Bau
- Fab/Megascans-Paket „Old Mine“ (Standardlizenz, außerhalb UE nutzbar). Rohdaten (8,2 GB, 60 Scans, FBX in cm + 8K-JPG) liegen auf dem Laptop
  in `Downloads\Old Mine-dc4dc139\mine_raw`, nicht im Repository. Katalog aller Scans: `Downloads\MinenBaukasten\KATALOG.md`.
- Gebaut in Blender 5.3 (`Downloads\MinenBaukasten\MinenBaukasten.blend`, Skripte in `scripts\`): Import, Transformation angewendet, Ursprung
  Mitte am Boden, Decimate (Collapse) auf 15k–200k Dreiecke, Normalen vom Hochpoly mit Original-Normalmap zurückgebacken (Cycles/OptiX),
  Farbe/AO/Rauheit über die erhaltenen UVs verkleinert. Texturen col / nrm (OpenGL) / orm (AO, Rauheit, Metall), eingebettet als WEBP 75.
- Bestandsaufnahme: `asset-src/neu/mine/megascans/ms_survey.py`.

## Dateien (Paket „lazy“, `asset-src/glb/lazy/MineAlt_*.glb`, zusammen ~113 MB)
| Datei | Module |
|---|---|
| Gang | gang_a (wcbpdfsdw, 3,2 × 3,2 × 2,37 m, 4K), gang_b (wcbpdgcdw, breit, 4K) |
| Boegen | bogen_a … bogen_d (Stahlbögen, Spannweite ~5,9 m, 3,6–3,8 m hoch; noch nicht platziert) |
| Ausbau | stempel_1…4, stempel_kurz, kappe, holz_1…3, stahlstempel_1…3, tuerstock (lichte Weite 2,6 m, 2,67 m hoch) |
| Loren | lore_kohle, lore_leer, wagen_holz, lore_saecke, wagen_leer, radsatz (fahren entlang X, Räder auf 0) |
| Boden | gleisbett, bohlenboden, verladung, gleis_a/b (Normalspur!), rampe, geroell_a/b, kohlegrus |
| Kram | faeustel, spaten, spitzhacke, schaufel, helm, lampe (Wandleuchte, Rückseite −Z), nagel_a/b, keil_1/2, eisenkeil, brett, erz |
| Flaechen | flaeche_<id> (2 × 2 m, kachelbar): uebmddyn (Wand/Decke), shnnehua (Kohleboden), ueijag3ew, uh1nbhzlw, ueknfaclw, venoehv, ud0nfezew, ud4ofc0fw; decal_sinqgag, decal_smtinfh |

`scripts/lazy-pack.mjs` lässt die Texturen von `MineAlt_*` unverändert (keepTex), komprimiert aber die Geometrie mit Meshopt.

## Im Spiel
- Laden: sobald man einem Stolleneingang auf 700 m nahe kommt (`preloadMineAlt` aus `nearEntrance`). Ist beim Betreten noch nicht alles da,
  kommt die alte Mine mit einem Hinweis. Vergleich: `?altbau=0` schaltet den Altbau ab.
- Gerade Gangstücke bis 3,6 m Decke: durchgehend gang_a (75 %) oder gang_b, auf 3,2 m Länge/Breite und die Deckenhöhe (höchstens 2,8 m) gestreckt.
  Dort keine Felsen; Wände und Decke des Gesteins schwanken weniger (sonst sticht der Fels durch den Verzug).
- Kurven, Abzweige, Kreuzungen: Türstock in jeder Öffnung zu einem ausgebauten Gang. Kavernen: Felsen wie bisher plus Wagen, Holzstapel,
  Geröll, Werkzeug, Helm.
- Gestein: Wand/Decke flaeche_uebmddyn, Boden flaeche_shnnehua (2-m-Kacheln, Eckfarben wie bisher).
- Gleise weiter aus Mine_Kit (Schmalspur), weil die gescannten Gleise Normalspur sind und nicht zu den Loren passen.
- Grubenlampen: Wandleuchte an der nächsten Felswand, 1,95 m hoch.

## Offen
- Stahlbögen in Hallen (zwei Kacheln breit), Verladestelle und Bohlenboden platzieren, Decals.
- Schmalspurgleis aus gescannten Teilen (Schwellen holz_*, Nägel).
- Leistung auf schwachen Rechnern prüfen (gang_a 200k Dreiecke je Kachel, instanziert).
