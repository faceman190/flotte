# Inventar und Ausrüstung (Alpha 0.70, Schiffsmodule und Bilder seit 0.72)

Persönliche Gegenstände sind von den Handelsgütern im Frachtraum getrennt.

## Wo was steht
- `src/data/gear.ts`: alle Gegenstände (`GEAR`), Arten, Plätze am Körper, Seltenheit, Werte. Ein neuer Gegenstand ist ein Eintrag in dieser Liste.
- `src/game/inventory.ts`: Rucksack, Anlegen und Ablegen, Benutzen, Laden (Angebot, Preise), Spind, Beute, Prüfung beim Laden des Spielstands.
- `src/ui/invApp.ts`: App „Ausrüstung“ im Flottenband (Taste I).
- `src/ui/dock.ts`: Reiter „Ausrüster“ im Stationsmenü (kaufen, verkaufen, Spind). In der Promenade hat er eine eigene Ladennische.
- `src/ui/icons.ts`: `gearIcon` (Form nach Art, Farbe nach Seltenheit).

## Spielstand
- `P.inv`: Rucksack, ein Eintrag `{ id, n }` je belegtem Platz. Grundgröße 12 Plätze, Rucksäcke geben mehr.
- `P.gear`: angelegt, je Platz eine Gegenstands-ID. Plätze: Helm, Anzug, Rucksack, Waffe, Werkzeug, zwei Module.
- `P.locker`: Spind mit 40 Plätzen, von jeder Station aus erreichbar.
- Alte Spielstände bekommen einen leeren Rucksack und den Bordoverall. Unbekannte Gegenstände fallen beim Laden heraus (`sanitizeInv`).

## Werte und ihre Wirkung
| Wert | Wirkung | Stelle im Code |
|---|---|---|
| Lauftempo | schneller zu Fuß in Stationen | `interior.ts`, Bewegung des Spielers |
| Abbau | Rover-Bohrer fördert schneller | `surface.ts`, `updateRover` |
| Handel | besserer Erlös beim Warenverkauf, höchstens 8 % | `economy.ts`, `unitPrice` |
| Plätze | größerer Rucksack | `inventory.ts`, `invCap` |
| Schutz, Schaden | noch ohne Wirkung, gedacht für Kämpfe zu Fuß | – |

Verbrauchsgüter wirken auf das Schiff (Hülle, Schild).

## Laden
- Angebot je Station fest (`gearStock`): hängt von Stations-ID und Gefahr des Sektors ab. Gegenstände ohne `shop` gibt es nur als Fund.
- Kaufpreis = Wert × Servicefaktor (Ruf beim Flottenrat), Ankauf = 45 % des Werts.

## Beute
- Abgeschossene Ferrox lassen mit kleiner Wahrscheinlichkeit ein Fundstück zurück (`rollKillLoot`), der Bienenstock immer.

## Noch offen
- Gegenstände sind nicht am Körper sichtbar (Ego-Ansicht, Figur fehlt).
- Fundorte fehlen noch: Legendäre Gegenstände gibt es in keinem Laden und bisher an keinem Fundort (außer zwei Fundstücken aus Abschüssen). Geplant: Belohnungen für Aufträge, Missionen und Geschichte, Kisten auf Planeten und in Wracks, Dungeons.
- Kein Handel von Gegenständen zwischen Spielern.
- Der Server prüft Gegenstände nicht; der Spielstand wird als Ganzes gespeichert.

## Schiffsmodule (Alpha 0.72)
- Vier Arten: Waffensystem, Abwehrsystem, Antrieb, Bordsystem. Jedes Schiff hat fünf Plätze (zwei Bordsysteme).
- Module liegen wie alles andere im Rucksack und werden im Flottenband unter „Ausrüstung“, Reiter „Schiff“, ins aktive Schiff eingebaut.
  Gespeichert in `P.shipGear` (aktives Schiff) und `ShipRec.gear` (geparkte Schiffe); beim Umsteigen bleiben sie im Schiff,
  beim Verkauf eines Schiffs wandern sie in den Spind.
- Wirkung: `shipMods()` (inventory.ts) summiert die Zuschläge, `computeStats(cls, up, mods)` (data/ships.ts) rechnet sie ein:
  Waffenschaden, Feuerrate, Hülle, Schild, Höchsttempo, Wendigkeit, Frachtraum, Bergbaulaser, Scanner.
- Ein Frachtmodul lässt sich nicht ausbauen, solange die Fracht sonst nicht mehr passt.

## Bilder der Gegenstände (Alpha 0.72)
- Quelle: `asset-src/neu/items/Items.blend`, gebaut aus `items_lib.py` (Grundformen, Materialien, Kamera, Licht, Rendern, Bildbogen)
  und `items_build.py` (eine Bauvorschrift je Gegenstand, gleiche ID wie in gear.ts). Jeder Gegenstand ist eine eigene Sammlung `it_<id>`.
- Die Farbe der Seltenheit steckt im Modell: Leuchten, Glas und Kristall tragen sie (grau, blau, violett, gold).
- Neu rendern in Blender: beide Dateien mit `exec` in ein gemeinsames Verzeichnis laden, `build_item(id, index)` für jede ID,
  `render_items(ordner, ids)` (204 px, Cycles, 64 Abtastungen, rund 2 s je Bild; in Teilen von etwa 20 aufrufen),
  dann `make_atlas(ordner, 'asset-src/tex/items@2048.png', 'asset-src/neu/items/atlas.json')`.
- Danach `node scripts/make-item-atlas.mjs` (schreibt `src/data/gearAtlas.ts` und meldet Gegenstände ohne Bild) und `npm run assets`.
- Im Spiel: `gearIcon()` in src/ui/icons.ts zeigt den Ausschnitt aus dem Bogen; fehlt der Bogen, erscheint das gezeichnete Symbol.
- Neuer Gegenstand: Eintrag in gear.ts, Bauvorschrift mit `@item('<id>', seltenheit)` in items_build.py, rendern, Bogen neu bauen.
