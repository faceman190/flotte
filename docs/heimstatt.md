# Heimstatt als großer Sektor

Stand 2026-11-18. Phase 1 ist gebaut und mit Alpha 1.50 veröffentlicht. Entscheidungen des Spielers: Phase 1 zuerst, freier Schnellflug über lange Strecken
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

Phase 1 ist seit Alpha 1.50 (18.11.2026) im Spiel.

## Phase 2 (gebaut am 19.11.2026, noch nicht veröffentlicht)

Alles aus vorhandenen Teilen (Außenposten-Modell, Schiffsmodelle, Geometrie aus Kastenprofilen), alles sicher, keine Gegner.

| Ort | Lage (x, y, z in m) | Datei |
|---|---|---|
| Akademie-Übungsgelände | 10 500, 400, −6 500 (12 km NO, 3,9 km neben der Verkehrslinie zum Lichtwall-Tor) | `src/game/akademie.ts` |
| Alte Werft | −37 000, −200, 15 000 (40 km WSW, 5 km neben der Linie zum Sonnenfeld-Tor) | `src/game/altewerft.ts` |

- **Orte im Sektor** (`src/game/orte.ts`): Register für Plätze ohne Andocken. Navigation (N, Sektorkarte mit eigenem Zeichen ⬡ und eigener Gruppe
  „Orte“), Kurzsprung (hält vor dem Ort, im Ort lädt kein Schnellflug), Fernansicht, HUD-Name mit Entfernung. Dazu `world.solids` (Kollision und
  Geschossfang für Großobjekte außer Stationen) und `sectorHooks` in `world.ts` (Aufbau nach `buildSector`, Abbau beim Leeren).
- **Akademie:** Leitstand (Außenposten, nicht andockbar). **Ringparcours**: zwölf Fachwerkringe (lichter Radius 40 m, Klammergehäuse in Signalfarbe,
  Positionslichter) als Rundkurs von 8,5 km. Durch den Startring fliegen startet die Uhr, Ziel ist wieder der Startring; der nächste Ring blinkt
  hell, der übernächste leuchtet ruhig, ein Rahmen im HUD zeigt ihn. **Schießstand**: vier ausgemusterte Venoms (rote Lackierung) als Zieldrohnen
  auf Lissajous-Bahnen, schießen nicht zurück, lassen sich erfassen und mit Raketen treffen. Der erste Treffer startet die Übung, zwölf Abschüsse
  beenden sie, die Drohnen werden mit jedem Abschuss schneller. Uhr unter dem Kompass. Abbruch bei Schnellflug, Tod, zu weit weg oder zu lange
  ohne Fortschritt (Ringe 90 s, Schießstand 60 s). Abzeichen Bronze/Silber/Gold: Ringe unter L/120, L/170, L/240 Sekunden (L = Kurslänge;
  ≈ 71, 50, 35 s), Schießstand unter 85, 55, 35 s. Lohn einmal je Abzeichen und Disziplin: 250, 500, 1000 Credits. Bestzeiten in `P.akademie`.
  Nur beim eigenen Piloten (im Mehrspieler fliegt jeder für sich).
- **Alte Werft:** drei offene Hellinge (Gerüste nach der Größe des Rumpfs darin, manche Spanten fehlen oder sind verbogen, rote Warnlichter) mit
  verlassenen Rümpfen (Wisent, Kormoran, Elster; dunkler und matter, ohne Lichter), fünf treibende Wracks, die alte Werftverwaltung (dunkel),
  320 Trümmerplatten. **Bergung:** 14 Frachtcontainer mit Bernsteinlicht. [E] in 85 m holt einen per Traktorstrahl an Bord (4 s, Abbruch bei mehr
  als 165 m Abstand): 4–9 Schrott in den Frachtraum, 22 % ein Ausrüstungsstück (gewöhnlich oder ungewöhnlich) in den Rucksack, 2 % ein altes
  Flottensiegel. Jeder Container kommt nach 40 Minuten wieder (`P.werft`). Funkspruch der Bastion beim ersten Besuch.
- **Leitbojen** (`src/game/leitbojen.ts`): alle 2 km, 220 m rechts neben den Strecken von der Bastion zu Ring, Eisenkrone, den drei Toren und den
  beiden Orten (nicht in Asteroidenfeldern), gut 9 m hoch mit Signalband. Ein Lichtpuls läuft von der Bastion nach außen; ferne Bojen dunkler.
- **Sichtbare Frachtersprünge** (`src/game/npc.ts`): Beim Sprung leuchtet das Tor kurz auf (Blitz am Tormodell, rückt mit der Fernansicht heran),
  der Frachter streckt sich ins Tor; bei der Ankunft schießt er gestreckt heraus und zieht sich zusammen. Schiffe der Geschichte springen wie bisher.
- Geprüft (Entwicklungsserver): Ringparcours ganz durchflogen (Silber, 750 Credits), Vorbeiflug neben dem Ring zählt nicht, Schießübung mit echten
  Laserschüssen gestartet und beendet, Rakete auf Drohne, Zielerfassung, Bergung mit Taste E samt Hinweistext, Abflug und Ankunft eines Frachters,
  Schnellflug-Sperre im Ort, Hauptmenü ohne Spielstand. Gebaute Fassung: Spielstand am Übungsgelände, mit echter Taste W durch den Startring, Uhr läuft,
  keine Fehler. Nicht geprüft: Bildrate auf echter Grafikkarte, Mehrspieler.
- Testhelfer: `scripts/ph2test.js` (nach `probelauf.js`: `await __ph2()`, dann `T.place`, `T.snap`, `T.game`).

## Weiter (Konzept, abgestimmt am 18.11.2026)

- ~~Phase 2~~ siehe oben.
- **Phase 3**, neue Modelle: Pumpwerk am Reifschleier, Torwachen, Horchposten „Fernohr“ (55 km O).
- **Gedenkboje: nicht in Heimstatt, sondern im Sonnenfeld** an den Trümmern des Halden-Tors (Wunsch des Spielers). Dort kam die Bastion durch,
  dort brach das Tor zusammen. Sie trägt die Namen der elf Schiffe, die nicht ankamen: Weitsicht, Anna, Kranich, Sirius, Ida, Bussard, Wega, Emma,
  Reiher, Atair, Klara. Nach Kapitel 5 werden die geretteten markiert. Dazu ein Archiv mit Funksprüchen aus Jahr 0 und Sätzen aus dem Eid.
  Ein Ort ohne Kampf und ohne Auftrag.
- **Ankunftspunkt in Heimstatt** (5 km NW der Bastion, `AP` in chapter5.ts) bleibt der Ort, an dem in Kapitel 5 die acht Schiffe aus dem
  zerbrochenen Sprung fallen (der Sprung spuckt sie an verschiedenen Orten aus: Anna im Lichtwall, Kranich in der Narbe). Offen: Sanders Satz
  „Dort, wo vor achtunddreißig Jahren die Bastion herausfiel“ widerspricht Intro und Story (die Bastion kam im Sonnenfeld durch). Vorschlag:
  „Dort, wo die Bastion damals vor Anker ging.“ Kostet nichts, solange Kapitel 5 noch nicht vertont ist.
- Bildprompts für die neuen Modelle (GPT Image): `docs/heimstatt-bildprompts.md`.
