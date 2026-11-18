# Heimstatt als großer Sektor

Stand 2026-11-18. Phase 1 ist gebaut (noch nicht veröffentlicht). Entscheidungen des Spielers: Phase 1 zuerst, freier Schnellflug über lange Strecken
zusätzlich zum Kurzsprung, der Heimstatt-Ring zieht zum Planeten, Heimstatt bleibt komplett sicher (keine Schrottdiebe).

## Maßstab

- Heimstatt: 60 km Radius, ±6 km Höhe (`size` in `src/data/galaxy.ts`). Alle anderen Sektoren bleiben bei 8 km / ±1,6 km.
- Große Sektoren stehen in echten Metern in `galaxy.ts`: Die alte Streckung (`STRETCH` 1,3, Felder ×1,4 Radius, ×1,6 Brocken) gilt für sie nicht.
- Die Bastion bleibt im Mittelpunkt. Alle Story-Koordinaten beziehen sich auf sie (Ankerplätze und Sammelpunkt in Kapitel 5, Andock-Ziele,
  Intro, Hauptmenü) und stimmen weiter.
- Fließkomma-Genauigkeit: Bei 60 km reicht sie ohne Mitverschieben der Welt (Shader mit Weltkoordinaten liegen bei rund 7 mm Schrittweite,
  die Spiellogik rechnet ohnehin doppelt genau). Ab etwa 100 km bräuchte es eine verschiebbare Weltmitte.

## Orte (Phase 1)

| Ort | Lage (x, y, z in m) | Bemerkung |
|---|---|---|
| Bastion | 0, 0, 0 | unverändert |
| Heimstatt-Ring | −16 500, −300, −24 500 | 30 km Richtung Planet, neben der Anflugzone |
| Anflugzone Heimstatt II | 32 km Richtung Planet | `size.orbit` |
| Eisenkrone | 1 200, 60, 20 500 | am Ostrand des Eisengürtels, Drehung 0,869 (Tor zeigt wie früher schräg zur Bastion) |
| Eisengürtel (Metallfeld) | −1 700, 0, 22 500, r 2 500, 110 Brocken | |
| Reifschleier (Eisfeld) | 26 000, −100, 10 000, r 1 100, 34 Brocken | |
| Tore | 50 km (`size.gate`) | Lichtwall NO, Neuhafen SO, Sonnenfeld W |

Norden ist −z (Richtung Planet etwa Nordnordwest).

## Technik

- **Fernansicht** (`src/game/farview.ts`): Stationen, Tore und die Anflugzone weiter als 7 km rücken verkleinert auf 7 km an die Kamera heran
  (gleiche Bildgröße, echte Richtung). So bleiben sie über jede Entfernung sichtbar, ohne die Kamera weiter als 30 km reichen zu lassen, und der
  Tiefenpuffer bleibt genau. Ab 3,5 km kommt ein kleiner Lichtpunkt dazu (Tore pulsieren leicht). Die Spiellogik nutzt nur `s.x/y/z`, nie die Lage
  des Modells. Auf Planeten ist sie aus (Städte und Bodenbasen rechnen mit den Modell-Koordinaten).
- **Planet wächst beim Anflug** (`src/core/sky.ts`, `near`): Gedachte Lage im Raum, von der Sektormitte aus sieht er aus wie bisher (auch im Menü),
  an der Anflugzone hat er gut 40° Winkelradius (höchstens 42°). Er steht dafür 24 km weit, schreibt keine Tiefe und hat eine feinere Kugel.
- **Dunst** im großen Sektor dünner (`setSpaceFog`: 0,000016 statt 0,00005), damit man Orte auf 20 bis 30 km sieht.
- **Schnellflug und Kurzsprung** (`src/game/schnellflug.ts`): H lädt 3,5 s, dann bis 8 km/s. Ohne Ziel lenkt der Spieler selbst (träge, kein
  Driften); mit Navigationsziel fliegt der Autopilot hin und hält gut 1 km davor fast an. Nahe an Stationen, Toren und Feldern wird er langsamer;
  zu nah, am Sektorrand, bei S, H oder einem Treffer endet er. Lädt nicht im Gefecht, im Feld oder direkt an einer Station. Geht in jedem Sektor.
  Die Kamera bleibt starr; der Raumstaub zieht Schlieren (höchstens 140 m).
- **Navigationsziele:** N wählt den Ort im Fadenkreuz (noch einmal: löschen), oder Klick auf der Sektorkarte. Ziele sind Stationen, Tore, Felder,
  die Anflugzone und Markierungen aus Geschichte und Aufträgen. Das Vorladen fürs erste Andocken (`approachPrime.ts`) beginnt sofort für das Ziel.
- **Sektorkarte** (`src/ui/galaxyMap.ts`): zweite Ansicht der Karte (Reiter Sektor / Galaxie; in großen Sektoren zuerst die Sektorkarte).
- **Verkehr:** In großen Sektoren sieben statt vier Frachter; fern von Stationen und Ziel fliegen sie im Schnellflug (bis 2,5 km/s).
- Einmal je Sitzung beim Ankommen ein Funkhinweis auf N, M und H (nur bis zum ersten Schnellflug).

## Geprüft

- Story-Bot vom Prolog bis zum Ende von Kapitel 5: keine Fehler, kein Hänger.
- Andocken an Eisenkrone und Ring an den neuen Plätzen, Kurzsprung Bastion → Eisenkrone (20 km in gut 9 s) und → Ring (45 km in etwa 12 s),
  freier Schnellflug bis 8 km/s mit Halt am Sektorrand, Halt vor der Bastion, gebaute Fassung (Schnellflug, Karte, Neues Spiel).
- Nicht geprüft: Bildrate auf echter Grafikkarte (das Testfenster rendert ohne Beschleunigung), Mehrspieler mit zwei Piloten.

## Weiter (Konzept)

- **Phase 2**, aus vorhandenen Teilen: Gedenkboje „Ankunft“ (5 km NW), Akademie-Übungsgelände (12 km NO: Zieldrohnen, Ringparcours),
  Alte Werft (40 km WSW, Wrackfriedhof mit Bergung, ohne Gegner), Leitbojen entlang der Verkehrswege, sichtbare Sprünge der Frachter.
- **Phase 3**, neue Modelle: Pumpwerk am Reifschleier, Torwachen, Horchposten „Fernohr“ (55 km O).
