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
- Quelle: `asset-src/neu/items/Items.blend`, gebaut aus `items_lib.py` (Grundformen, Materialien, Kamera, Licht, Rendern, Bildbogen),
  `items_build.py` (Kleinteile und Baugruppen, Schiffsmodule) und `items_pilot.py` (Pilotenausrüstung). Eine Bauvorschrift je Gegenstand,
  gleiche ID wie in gear.ts. Jeder Gegenstand ist eine eigene Sammlung `it_<id>`.
- Stil seit Alpha 0.73: realistische Technik. Dunkle, abgenutzte Metalle (Kantenabrieb, Schmutz in den Fugen und gerundete Kanten entstehen im
  Material `pbr`), gedeckte Lackfarben, Typenschilder, Schrauben, Lüftungsgitter, Schläuche, kaum Leuchten. Die Seltenheit zeigt sich am
  Modell nur in kleinen eloxierten Teilen (`anod(A)`); die Kachel im Spiel trägt Farbe und Stufe (T1–T4).
- Baugruppen in items_build.py: `unit` (Gehäuse mit Rahmen), `rails`, `vent`, `fins`, `conn`, `label`, `hazard`, `hose`, `knurl`, `bolt`;
  mit `with grp(ort, drehung):` baut man Teile relativ zu einer Baugruppe.
- Neu rendern in Blender: alle drei Dateien mit `exec` in ein gemeinsames Verzeichnis laden, `build_item(id, index)` für jede ID,
  `render_items(ordner, ids)` (204 px, Cycles, 80 Abtastungen, rund 2,5 s je Bild; in Teilen von etwa 18 aufrufen),
  dann `make_atlas(ordner, 'asset-src/tex/items@2048.png', 'asset-src/neu/items/atlas.json')`.
- Danach `node scripts/make-item-atlas.mjs` (schreibt `src/data/gearAtlas.ts` und meldet Gegenstände ohne Bild) und `npm run assets`.
- Im Spiel: `gearIcon()` in src/ui/icons.ts zeigt den Ausschnitt aus dem Bogen; fehlt der Bogen, erscheint das gezeichnete Symbol.
- Neuer Gegenstand: Eintrag in gear.ts, Bauvorschrift mit `@item('<id>', seltenheit)` in items_build.py oder items_pilot.py, rendern, Bogen neu bauen.

## Drei Maßstabsmodelle in hoher Detailstufe (Alpha 0.74)
- `asset-src/neu/items/items_test.py`: Kryo-Kühler (`sy_kuehler`), Sturmhelm (`helm_sturm`), Sturmrüstung (`anzug_sturm`). Eigene Entwürfe mit eigener
  Marke („Frostwerk“) und eigenem Flottenzeichen; Vorlagen aus anderen Spielen dienen nur als Maßstab für Bauart und Detaildichte.
- Beschriftungen: `node scripts/make-item-decals.mjs` erzeugt `asset-src/neu/items/tex/decals.png` und `decals.json`; im Modell setzt
  `decal(name, breite, ort, drehung)` ein Feld als Fläche, `stick(...)` legt es per Strahl auf eine gekrümmte Oberfläche.
- Helm: Schale, Rahmen, Kinnschutz, Streifen und Platten sind Kugelschalen, die mit Schneidkörpern zugeschnitten werden (`shell`, `cut`, `keep`).
- Rüstung: Das Körpernetz `char1` (Sammlung „koerper_quelle“, aus mechaniker_meshy.glb) dient ohne Kopf als Unterzeug. Platten sind saubere Gitter
  (`patch`) und Manschetten (`sleeve`), die sich mit Shrinkwrap an den Körper legen und dann Wandstärke bekommen. Platten direkt aus dem
  Körpernetz zu schneiden hat nicht funktioniert (zerrissene, stachelige Flächen).
- Große Bilder: `render_items(ordner, ids, size=900, samples=72)`; das dauert länger als eine Anfrage, deshalb über `bpy.app.timers` starten
  und auf `_fertig.txt` warten. Übersicht: `docs/inventar/test-kuehler-helm-ruestung.jpg`.
- Beim Laden in Blender `ITEM_DIR` (Ordner asset-src/neu/items) ins Verzeichnis legen, bevor items_lib.py ausgeführt wird.
