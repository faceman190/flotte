# Bastion: Deck 3 und Hangar im Spiel (Alpha 1.20 und 1.21)

In der Bastion gibt es keine Promenade mehr. Hinter der Schleuse an der Rückwand des Hangars liegt Deck 3 nach Plan D aus dem
Bastion-Baukasten (`docs/bastion-baukasten.md`): verwinkelte Gänge, Treffpunkt, Besprechung, Krankenstation, Werkstatt, Lager,
Maschinenraum, Spinde, Quartiere. Die Dienste der Station stehen in den Räumen. Außenposten und Planetenbasen behalten Korridor und Promenade.

## Was der Spieler sieht

| Dienst | Raum | Weg vom Hangar |
|---|---|---|
| Werft, Werkstatt, Service | Werkstatt · Werft (links hinter der Schleuse) | etwa 20 m |
| Markt, Ausrüster, Raffinerie, Lager | Lager · Markt (rechts hinter der Schleuse) | etwa 20 m |
| Aufträge, Missionen | Besprechung | etwa 55 m |
| Auskunft, Galaxiekarte | Treffpunkt (an der Holo-Kugel) | etwa 55 m |
| Krankenstation | nur Kulisse, eine Sanitätskraft mit einem Satz | etwa 100 m |

Der Deckmeister bleibt im Hangar. Die Figuren der Geschichte stehen weiter im Hangar (`hangarSpot`); sie kommen und gehen durch die Schleuse.
Das Schott am Ostende des Decks („Deck 2“) ist geschlossen und für später gedacht.

## Wie es gebaut ist

**In Blender** (`asset-src/neu/bastion/`):

1. `bk_deck_d.py` baut das Deck aus der Karte (`KARTE`) und schreibt `deck_d_meta.json`: Türen, Schotte, Personalplätze (`staff()`), Laufwege
   (`ROUTES`), Gesprächsgruppen (`CHATS`). Neu sind die Tresen der Dienste (`p_tresen`) und die Schleuse zum Hangar (`p_schleuse`).
2. `bk_export.py` gibt das Deck aus. Es läuft in `BastionDeckD.blend` nach dem Aufbau und verändert die Szene: **danach nicht speichern.**
   Je Baustein: abspecken (Fasen unter 8 mm weg, sonst eine Stufe; Schrauben und Niete weg; winzige Schrift weg; Rohre mit weniger Seiten),
   an der Stelle seines ersten Einsatzes als ein Netz in die Szene stellen, große Flächen im 0,5-m-Raster teilen, Licht backen.
   Ausgabe: `asset-src/glb/base/BastionDeck.glb` (jeder Baustein einmal) und `asset-src/data/deck_bastion.json`.
3. `npm run assets` packt beides (Modell im Hintergrund-Paket, Daten im Kern-Paket).

**Licht:** Cycles rechnet je Eckpunkt die beleuchtete Farbe (direkt + indirekt + Eigenfarbe) im fertig zusammengebauten Deck. Gespeichert wird
w = sqrt(x / (1 + x)) der Strahldichte x; das Spiel rechnet zurück. Im Spiel streuen die Flächen kein Licht mehr: Sie leuchten mit dieser Farbe und
spiegeln die Raumumgebung (`interiorEnv`). Deshalb kostet das Deck keine Lichter, und es sieht aus wie in Blender, nur ohne feine Schatten
(das Licht steht nur in den Eckpunkten, große Flächen alle 0,5 m). Ein Baustein hat überall das Licht seines ersten Einsatzes.

**Arten der Flächen** (Materialnamen `ext_bk_…`): `metal`, `paint`, `soft` (beleuchtet, viel bis kein Glanz), `glow` (Leuchten, überstrahlen im
Bloom), `warn` (Warnschraffur, Muster aus der Lage), `screen` (Bildschirme mit Zeilen), `glass`, `gloss` (dunkles Glas), `stain` (Laufspuren und
Flecken, Deckkraft je Eckpunkt), `stars` (Fenster).

**Im Spiel** (`src/game/deck.ts`, eingehängt in `src/game/interior.ts`):

- `loadDeck()` lädt Modell und Daten beim Start. `buildDeck(HZ0)` setzt die Bausteine: je Bereich (Raum oder Gangstück) und Art ein Netz.
  Bereiche weiter als 46 m vom Spieler werden nicht gezeichnet.
- Laufflächen: je Zelle ein Rechteck (an Wänden 1,7 m von der Zellmitte), dazu Türen und das Tor; Standflächen aus den Bausteinen
  (Umriss der Teile zwischen 0,2 und 1,9 m Höhe), Schotte verengen den Gang.
- `build()` in `interior.ts`: Für die Bastion (`st.id === 'bastion'`) entfallen Korridor, Promenade, Stände, Holo-Tisch und deren Läufer.
  Stattdessen: Personal an den Plätzen aus den Daten (`talk(name, tab)` wie an den Ständen), Galaxiekarte an der Holo-Kugel, Läufer auf den
  Wegen, Gesprächsgruppen. Ist das Deck nicht geladen, bleibt es beim alten Aufbau.
- `outPath()` gibt den Weg der Story-Figuren (durch die Schleuse und um die Ecke außer Sicht). Ortsanzeige und Deckenhöhe kommen aus der Karte.
- Stellgrößen: `deckTune.LIGHT` (Stärke des vorberechneten Lichts), `deckTune.GLOW` (Leuchten), `RANGE` in `deck.ts`.

## Karte ändern

Karte, Einrichtung, Personalplätze und Wege stehen in `bk_deck_d.py`. Nach einer Änderung: Deck neu aufbauen, `bk_export.py` laufen lassen
(rund 45 Minuten, der größte Teil ist das Licht), `npm run assets`. Am Spielcode ist nichts zu ändern, solange das Tor zum Hangar (`H`) am
Westrand bleibt und der Gang dahinter nach Osten führt.

## Geprüft (15.11.2026)

- **Umfang:** 182 Bausteine, 390.000 Dreiecke einmalig, 1,08 Millionen gesetzt, 647 Instanzen. Modell gepackt 6,4 MB, Daten 28 KB.
- **Zeichenlast** (Testrechner, je Bild, alle Durchgänge): im Deck 200.000 bis 520.000 Dreiecke und 80 bis 180 Zeichenaufrufe. Davon entfallen
  110.000 bis 390.000 auf das Deck. Der Hangar allein kostet rund 500.000; er wird deshalb nicht gezeichnet, solange man vom Standort aus
  nicht durch die Schleuse sehen kann. Figuren in Räumen, in die man nicht hineinsehen kann, werden ebenfalls nicht gezeichnet.
- **Sichtprüfung:** `sees()` in `deck.ts` schickt Strahlen durch das Zellraster (offene Seiten und Türöffnungen lassen durch). Neu gerechnet
  wird, wenn der Pilot sich 0,6 m bewegt hat.
- **Begehbarkeit** (`__walkAll()` in `scripts/decktest.js`, füllt vom Hangar aus alle erreichbaren Punkte): alle elf Ansprechpunkte und die
  Galaxiekarte sind erreichbar. Nicht betretbar sind mit Absicht die Reihe hinter den Tresen im Lager und einzelne zugestellte Ecken
  (Bettenreihe der Krankenstation, Sitzgruppe im Quartier, Tische im Treffpunkt).
- **Dienste:** Alle Ansprechpunkte zeigen die richtige Zeile, die Taste E öffnet das Stationsmenü am richtigen Reiter.
- **Läufer:** vier Minuten Spielzeit, alle sechs Läufer des Decks gehen ihre Wege durch die Türen und halten an Tresen und Blickpunkten.
- **Andere Stationen:** Heimring hat weiter Korridor und Promenade (21 Figuren, 7 Läufer wie zuvor).
- **Geschichte:** Story-Bot (`docs/probelauf.md`) dreimal vom Prolog bis zum Ende von Kapitel 5 (Rat, Gilde, Grenzwacht): keine Hänger,
  keine Fehler. Dazu 17 Lade-Tests über „Weiterspielen“ quer durch die Kapitel.

## Hangar im Look des Baukastens (Alpha 1.21)

Seit Alpha 1.21 steht in der Bastion der Hangar aus `BastionHangar.blend` (`docs/bastion-baukasten.md`, Abschnitt „Hangar im selben Look“).
Andere Stationen behalten das bisherige Hangar-Modell. Maße, Tor, Stellplätze, Pult des Deckmeisters und der freie Streifen für die Figuren
der Geschichte liegen wie zuvor; Landung, Start und die Wege der Läufer sind unverändert.

- **Fassung fürs Spiel** (`SPIEL = True` vor `bk_hangar.py`): In der Rückwand ist eine Öffnung für die Schleuse des Decks statt des eigenen
  Portals, auf der Galerie stehen keine Wandfüllungen, die Ablaufrinnen sind Flächen statt einzelner Stäbe.
- **Ausgabe:** `bk_export_hangar.py` (setzt die Angaben und ruft `bk_export.py`), rund 8 Minuten. Gröberes Abspecken als im Deck (Fasen unter 3 cm
  weg, Teile unter 12 cm weg), kein Raster in den großen Flächen. Boden und Stellplätze werden als Ganzes gebacken (`unique`), weil ihr Licht
  vom Ort abhängt; alles andere wie im Deck je Baustein an der Stelle seines ersten Einsatzes. Ergebnis: `asset-src/glb/base/BastionHangar.glb`
  und `asset-src/data/hangar_bastion.json`.
- **Im Spiel:** `loadHangar()` und `buildHangar()` in `deck.ts` (dieselbe Zusammensetzung wie das Deck, `assemble()`), eingehängt in `build()` in
  `interior.ts`. Standflächen kommen aus den Bausteinen (Spantfüße, Ecktürme, Regale, Container, Fahrzeuge, Wandfüllungen). Wandfüllungen und
  Kleinteile weiter als 85 m werden nicht gezeichnet (`FAR_SMALL`).
- **Zwei neue Arten:** `warnbig` (breite Warnschraffur) und `mark` (Bodenmarkierungen); beide liegen nur wenige Millimeter über dem Boden und
  werden in der Tiefe ein Stück vorgezogen, sonst flimmern sie auf Entfernung.
- **Drei Dinge, die erst im Spiel auffielen:** (1) Die Strahldichte der Leuchten ist gedeckelt (`GLOW_MAX`); ungedeckelt überstrahlten die über
  hundert Hallenleuchten im Bloom das ganze Bild. (2) Auch beleuchtete Flächen sind gedeckelt (`LIT_MAX`): Eckpunkte direkt an einer Leuchte
  tragen eine riesige Strahldichte und wurden im Bloom zu hellen Vierecken. (3) Lampen und Sonne des Spiels wirken auf die Flächen des
  Baukastens nicht mehr; sie schienen durch Wände und setzten Glanzflecken auf den Hallenboden. Die Hangarlampe gilt jetzt allein den
  Schiffen und Figuren und ist dafür heller.
- **Umfang und Last:** 80 Bausteine, 215.000 Dreiecke einmalig, 764.000 gesetzt, gepackt 3,7 MB. Im Hangar 640.000 bis 760.000 Dreiecke je
  Bild (mit Schiff und Figuren; der alte Hangar lag bei rund 500.000) und rund 200 Zeichenaufrufe.
- **Geprüft:** Landung und Start mit echten Bildern ohne Fehler; 28.000 m² begehbar, Schleuse, Deckmeister, Treffpunkt der Geschichte und
  alle drei Stellplätze erreichbar; Heimring unverändert; Story-Bot dreimal bis zum Ende von Kapitel 5 (Rat, Gilde, Grenzwacht) und 13 Lade-Tests über „Weiterspielen“: keine Hänger, keine Fehler.

## Offen

- Ein Baustein hat überall das Licht seines ersten Einsatzes; in Räumen mit anderer Lichtstimmung passt der Ton nicht ganz.
- Feine Schatten fehlen (Licht nur in den Eckpunkten). Eine Lichtkarte je Raum wäre der nächste Schritt, kostet aber Speicher.
- Die Krankenstation hat noch keine Funktion im Spiel.
- Der Laptop mit schwacher Grafik (siehe `docs` zur Leistung) ist nicht nachgemessen.
