# Inventar und Ausrüstung des Piloten (Alpha 0.70)

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
- Kein Handel von Gegenständen zwischen Spielern.
- Der Server prüft Gegenstände nicht; der Spielstand wird als Ganzes gespeichert.
