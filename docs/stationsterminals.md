# Stationsterminals

Seit Alpha 1.25 (16.11.2026). Wunsch: Man soll nicht mehr über eine Leiste durch alle Dienste einer Station blättern. Jeder Dienst hat
seinen Ort, und man läuft hin. Vorbild für den Aufbau waren Bildschirmfotos der Terminals aus Star Citizen (Raffinerie, Schiffsverleih,
Laden). Der Look ist ein eigener, abgeleitet vom Bastion-Baukasten.

Entwürfe: https://claude.ai/artifact/1a3VDJP3EkAtNuZd7ETyUj (sechs Blätter, Entwurfsfläche).

## Was sich für den Spieler ändert

- **Andocken öffnet kein Menü mehr.** Man steht im Hangar. Die Einstellung „Stationen zu Fuß betreten“ ist entfallen (`settings.walk`
  ist immer an).
- **Ein Dienst, ein Ort.** Am Tresen oder Stand E drücken öffnet nur diesen einen Dienst, bildschirmfüllend. Esc schließt. Die Taste Tab
  öffnet in der Station nichts mehr. Im Fuß jedes Terminals steht, welche Dienste die Station sonst hat.
- **Ablegen** geht nur noch am Schiff (einsteigen), nicht mehr über einen Knopf im Menü.
- **Raffinerie mit Wartezeit.** Ein Schmelzauftrag nimmt Erz und Gebühr sofort. Die Barren sind nach 10 s plus 0,6 s je Barren fertig
  (höchstens 75 s) und warten am Terminal. Abholen: „Ins Schiff“ (so viel passt) oder „Ins Lager“. Die Zeit läuft nach der Uhr, auch
  wenn man ablegt oder das Spiel schließt. Unterwegs meldet die Hütte per Funk, wenn ein Auftrag fertig ist.
- **Markt mit Abrechnung.** Mengen wählen (Umschalt-Klick: zehn auf einmal), rechts steht die Rechnung, der Knopf „Abschließen“ führt alles in einem Zug aus.

## Wo steht was

| Station | Ort | Dienste |
|---|---|---|
| Bastion, Deck 3 | Hangar, Deckmeister rechts der Schleuse | Hangar (Schiff wechseln, verkaufen, lackieren) |
| | Raum Lager | Markt, Ausrüster, Lager |
| | Raum Werkstatt | Werft, Werkstatt, Service |
| | Besprechung | Aufträge, Missionen |
| | Treffpunkt | Auskunft, Galaxiekarte |
| Eisenkrone, Hüttendeck | Hangar | Hangar |
| | Annahme | Raffinerie, Markt, Lager |
| | Leitstand | Service |
| | Gildenkontor | Aufträge, Missionen |
| | Kantine | Auskunft, Galaxiekarte |
| Stationen mit Promenade | Hangar: Deckmeister. Promenade: je Dienst ein Stand | alle Dienste der Station |
| Planetenbasen | Schild „Landefeld“ links neben der Ausgangstür | Hangar (dort gibt es keinen Hangar mit Deckmeister) |
| Städte (Talstadt) | Läden am Marktplatz | wie bisher, je Laden ein Dienst |

Die Zuordnung der Tresen steht wie bisher in den Deckdaten (`personal` in `deck_*.json`) und für die Promenade in `interior.ts`.

## Technik

- `src/ui/dock.ts` ist neu geschrieben. `showMenu(tab, note)` öffnet genau ein Terminal; ohne gültigen Dienst passiert nichts.
  Je Dienst gibt es eine Funktion (`vMarkt`, `vRaff`, `vLager`, `vWerft`, `vWerkstatt`, `vService`, `vAusruester`, `vAuftraege`,
  `vMissionen`, `vHangar`, `vInfo`), die Kennzahlen, Spaltenraster und Inhalt liefert; `render()` setzt Kopf und Fuß darum.
- Auswahl im Terminal (`cart`, `refSel`, `selShip`, `selUp`) gilt, solange es offen ist, und wird beim Öffnen geleert.
- Schmelzaufträge: `refineStart`, `refineCollect`, `refineTime` in `src/game/economy.ts`; gespeichert in `P.refJobs`
  (`st`, `to`, `n`, `end` als Uhrzeit in ms, `told`). Ein Zeitgeber in `dock.ts` zählt die Restzeit im offenen Terminal und funkt unterwegs.
- Schiffsansicht der Werft: `src/ui/shipPreview.ts`. Sie zeichnet das Schiff mit dem Renderer des Spiels **vor** dem eigentlichen Bild
  (`prePass` in `src/core/engine.ts`), kopiert den Ausschnitt in eine 2D-Fläche des Terminals, danach übermalt das Spielbild alles.
  Kein zweiter WebGL-Kontext, kein Flackern. Maß genommen wird nur an sichtbaren Flächen (ohne Schildkugel und Leuchtpunkte).
- Stile: Block „Stationsterminals“ am Ende von `src/style.css`, alles unter `.tm`. Schriften Saira Condensed, IBM Plex Sans und
  IBM Plex Mono kommen mit über die Schriftzeile in `index.html`.
- Das Einblenden (`.tm.in`) gibt es nur beim Öffnen. Jeder Klick baut den Inhalt neu; würde er dabei wieder einblenden, flackerte es.

## Was beim ersten Blick im Spiel falsch war

- Die Schiffsansicht war winzig: Das Maß kam vom ganzen Modell samt unsichtbarer Schildkugel.
- Jeder Klick ließ das Terminal neu einblenden (halb durchsichtig für 0,2 s).
- Seitenspalten liefen über, der große Knopf brach in zwei Zeilen um, Namen und Zahlen brachen in schmalen Spalten um.

## Offen

- Die Terminals öffnen sich weiter als Überlagerung, nicht als Bildschirm im Raum.
- Tresen im selben Raum stehen nah beieinander; ein eigenes Quartier für das Lager gibt es nicht (Entscheidung: Lager bleibt im Raum Lager).
- An Planetenbasen ist das Landefeld-Terminal nur ein Schild an der Wand.
- Schmale Fenster (unter etwa 1100 px Breite) sind nicht eigens gestaltet.
