# Weltleben im All (seit 2026-11-20, Testserver)

Code: `src/game/weltLeben.ts` (Funk, Schürfer, Frachtkisten, Notrufe), Andocken im Verkehr `src/game/npc.ts`. Aufgerufen aus `main.ts`
(`initWeltLeben` bei jedem Sektoraufbau neben `initTraffic`, `updateWeltLeben` jedes Bild nach `updateTraffic`).

## Frachter docken an
- Ankommende Frachter fliegen nicht mehr zu einem Wartepunkt, sondern 700 m vor das Hangartor (`st.launch` liegt in der Torebene,
  `f = (−sin yaw, −cos yaw)` zeigt hinaus), dann langsam (26 m/s) aufs Tor zu und hinein (14 m/s). 60 m hinter dem Tor verschwinden sie.
- Nach 60 bis 150 s legen sie wieder ab: Sie erscheinen 40 m hinter dem Tor, fliegen hinaus und dann zu einem Tor.
- Ist der Pilot in einer Station (`G.inside`), dockt niemand an (der Innenraum liegt an derselben Stelle): Der Frachter wartet draußen
  und fliegt weiter wie früher.
- Mitspieler: Der Gastgeber meldet das Andocken mit dem Ereignis `k` (still entfernen, kein Sprungblitz).

## Funk im Hintergrund
- Alle 55 bis 100 s eine Zeile im Funkfeld, nur im Flug, nicht im Ferrox-Gebiet, nicht bei Ferrox im Umkreis von 3 km, nicht während
  die Geschichte spricht. In Heimstatt spricht Lotse Brummer, sonst die Station.
- Arten: Anflugfreigabe für einen Frachter, der gerade ans Tor geht (mit Antwort), Ausflug, Gespräch zweier Frachter, Patrouille,
  Schürfer, Angebot des Marktes (echte Ware unter dem Grundpreis, echter Preis), Leitstelle an alle. Alles mit den Namen der Schiffe,
  die gerade im Sektor fliegen.

## Schürfer
- Zwei Elster (Kernsektoren) bzw. eine (Grenze) arbeiten an großen Brocken der Felder: orangefarbener Strahl, Glutpunkt am Gestein,
  Splitter. Alle 50 bis 110 s ziehen sie zum nächsten Brocken. Nur Kulisse: kein Treffer, kein Netz, jeder Spieler hat eigene.

## Treibende Frachtkiste
- Alle 5 bis 9 Minuten (60 %) meldet die Station eine verlorene Kiste „zwischen dem Tor nach … und …“, mit blinkendem Licht weithin sichtbar.
  Auf 60 m heran: Die Ladung (drei Packen raffinierte Ware oder Erz, je 2 bis 6) schwebt heraus und wird wie Beute eingesammelt. 10 Minuten.

## Notruf
- Alle 7 bis 13 Minuten (50 %, nur ohne Ferrox im Sektor, nur ab Gefahr 1, nie in Heimstatt): Drei Ferrox (vier ab Gefahr 3) fallen über
  einen Frachter im Umkreis von 9 km her, Funk „NOTRUF“. Sind die Angreifer weg und der Pilot war in der Nähe (4 km): 350 bis 700 Credits
  und 12 Ruf bei der Fraktion der Station. Geht der Frachter verloren, meldet es die Leitstelle wie bisher.

## Geprüft
- Neuhafen im Testfenster, 26 Minuten Spielzeit: ganzer Kreislauf Anflug → Tor → Hangar → Ablegen → Sprung bei elf Frachtern, Funkzeilen
  aller Arten, Kistenmeldung; Kiste geborgen (13 Teile), Notruf mit Dank und 360 Credits; Bild vom Schürfer mit Strahl.
- Nicht geprüft: von Hand geflogen (nur gesetzte Positionen), Mitspieler, die Bastion in Heimstatt (großer Sektor, Schnellflug der Frachter).
