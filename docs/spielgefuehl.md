# Spielgefühl (Alpha 1.40, 1.41)

Nutzerwunsch 2026-11-17: Optik und Modelle passen, jetzt soll sich das Spiel besser anfühlen. Aus der Schwächenliste gewählt:

## Umgesetzt

**Ferrox-Angriffsanflüge** (`src/game/combat.ts`, `updateEnemies`)
- Jäger gegen Spieler, Mitspieler und Patrouillen kreisen nicht mehr dauerhaft in 190 m, sondern fliegen Anflüge:
  `in` = anfliegen (auf großer Entfernung schlingernd, ab 520 m gerade), Feuerstöße nur mit der Nase aufs Ziel (Kegel ~35°, 90 bis 850 m);
  `out` = am Ziel vorbei abdrehen, 18 % schneller, Abstand 480 bis 720 m gewinnen, dann neu ansetzen.
- Höchstens drei Jäger zugleich im Anflug auf dasselbe Ziel (`MAX_RUNS`), die anderen kreisen solange in Abstand.
- Gegen Frachter und für Bomber gilt das alte Verhalten.
- Zielhilfe des Spielers unverändert (kein Vorhaltepunkt, Wunsch des Nutzers).
- Messung (Testpilot mit 0,2 s Reaktionszeit, Gefahr 3, drei Jäger): Gefecht 15 bis 35 s, Schaden 0 bis 400. Acht Jäger gegen einen stillstehenden Spieler (Gefahr 4): im Schnitt 12,6 Schaden/s, Spitzen ~50/s.

**Treffer-VFX** (`src/game/fx.ts`: `sparks`, `flash`, `shieldRipple`, `floatText`)
- Treffer am Ferrox: heller Blitz am Einschlag, Funkenstreifen vom Panzer weg, die Panzerung glüht kurz orange
  (eigene Materialkopien je Feind mit Wert `uHit`, ein gemeinsamer Shader; vorgewärmt in `initFerrox` → `warmFerrox`),
  leiser metallischer Ton (gedrosselt auf 14/s).
- Abschuss: „+15 Cr“ schwebt über dem Wrack.
- Eigenes Schiff mit Schild: Welle über die Schildblase vom Einschlag aus, heller Kern, der abgelenkte Schuss fliegt als Funken in Abprallrichtung weiter (`impactFx` in `player.ts`). Die ganze Blase leuchtet nur noch schwach.
- Ohne Schild: Funken und Glut aus der Hülle.
- Kamera bleibt starr (Nutzerwunsch Alpha 1.15).

**Bergbau** (`src/game/mining.ts`)
- „+1 FE“ (Kürzel und Farbe des Erzes) links vom Laserpunkt, zählt bei Dauerfeuer hoch.
- Risse im Brocken: Der beschossene Asteroid bekommt eine Materialkopie mit Rissmuster (Zellrauschen im Objektraum, verzogen).
  Die Risse wachsen vom Einschlagpunkt aus mit dem Abbau, werden nach außen haarfein und glühen nahe am Laser. Shader je Gesteinsmaterial vorgewärmt (`warmCracks`).

**Flug** (`src/game/player.ts`, `src/ui/hud.ts`)
- Manöverflug: 0 auf 143 m/s in 2,0 s (vorher 4,5 s). Bremsen/Rückwärts wie bisher.
- Ohne Schub rollt das Schiff aus (−22 %/s statt −50 %/s).
- Tempo links am Fadenkreuz mit dünnem Balken bis zur Höchstgeschwindigkeit der Flugstufe (blau im Reiseflug).

## Offen
- Kühlfenster am Laser (Loslassen kurz vor Rot = schnelle Abkühlung) nur vorgeschlagen, Nutzer fragt nach.
- Belohnungstempo, Laufen (Rennen nur 13 % schneller), Sichtbarkeit der Ferrox auf Entfernung.

## Laserbolzen der Bordkanonen (Alpha 1.41)

`src/game/bolts.ts`: Alle Schüsse (eigene, Patrouillen, Ferrox) zeichnet ein einziges InstancedMesh als zur Kamera gedrehte Fläche:
weißheißer Kern, farbiger Saum, runde Spitze, dünn auslaufender Schweif, dazu ein rundes Kopfleuchten mit Mindestgröße am Bildschirm
(sonst sieht man die eigenen Schüsse aus der Verfolgerkamera kaum, weil sie direkt wegfliegen). Vorher: ein gelbes Kästchen je Schuss.

Stufen in `BOLTS` (Farbe, Breite, Länge, Saum, Mündungsblitz, Einschlagstärke, Tonhöhe des Schusses):
- `p1` Leichter Laser (bernstein), `p2` Laser (orange), `p3` Schwerer Laser (rotorange), `p4` Plasmalaser (blauweiß)
- `w` Patrouillen/Mitspieler (blassgelb), `e` Ferrox (violett)

`playerBolt(dmg, cls)` wählt die eigene Stufe nach Schaden je Schuss (unter 9 → p1, ab 9 → p2, ab 15 → p3, ab 26 → p4); eine Schiffsklasse kann
mit `bolt` eine feste Stufe vorgeben. Für spätere Waffen-Ausrüstung: neue Stufe in `BOLTS` eintragen und beim Feuern `{ bolt }` mitgeben.
Einschlag am Ferrox (Blitz, Funken) und Mündungsblitz skalieren mit der Stufe; schwere Kanonen klingen tiefer (`gunSound(vol, pitch)`).

## Nachbesserungen nach Spielerrückmeldung (2026-11-18)

**Hauptmenü ruckelte die ersten 5 bis 10 s.** Gemessen: Das erste Bild des Menüs dauerte 3,4 s (alle Shader auf einmal), danach blockierten
13 Pausen von 50 bis 470 ms das Bild (Auspacken von Städten, Planetenbasen, Schiffsinnenräumen und dem gebackenen Hangar im Hintergrund).
Jetzt bleibt der Ladebildschirm stehen (`hideBoot` in `assets.ts`, aufgerufen aus `main.ts`), bis die Menüszene vorbereitet ist:
Felsmodell geladen, Shader übersetzt (`compileFor`), Hintergrund-Pakete ausgepackt (höchstens 6 s; beim ersten Besuch kommt der Rest danach).
Ergebnis: nach dem Ladebildschirm kein langes Bild mehr (16 s gemessen). Der Ladebildschirm steht dafür etwas länger.

**Alte Brocken im Menü:** Die Menüszene entstand, bevor das Felsmodell geladen war (`loadRockModel` wird jetzt abgewartet).

**Lotse „Klammern greifen“:** Man landet im Hangar, daher sagen Stationen jetzt dieselbe Zeile wie Planetenbasen (`k_an2`, `barks.ts`).

**Kran im Hangar:** Die drei Laufkatzen mit Seil und Haken sind aus `bk_halle.py` entfernt (Hangar neu gebacken, 27 min, danach `npm run assets`) und werden im alten
Hangar-Modell beim Aufbau weggelassen (`deck.ts`, `loadHangar`). Die Kranschienen an Wand und Decke bleiben.

**Weniger Systemmeldungen:** weg sind „Reiseflug: … träge“ / „Manöverflug“, „Kamera wieder hinter dem Schiff“, „Du bist jetzt Gastgeber
dieses Sektors“ (kam nach jedem Sprung) und „Du bist der erste Pilot online“.

**Maussteuerung im Flug: direkt statt Zeiger-Ausschlag.** Vorher lief der Zeiger frei, sein Abstand zur Bildmitte war die Drehrate
(Linie, Raute, Kreis im HUD), und eingefangen war der Zeiger nur zu Fuß. Beim Wechsel stand er irgendwo, und Schiff oder Blick drehten
sofort los. Jetzt (`settings.steer = 'direkt'`, Standard):
- Der Zeiger ist auch im Flug eingefangen; die Mausbewegung sammelt sich in `steer` (`input.ts`) und wird in `player.ts` zu einem Drehwunsch,
  dem das Schiff mit seiner Wendigkeit folgt (begrenzt auf 0,9 rad Gier und 0,7 rad Nicken, damit ein Wisch keine Kehrtwende anstaut).
- Beim Abdocken, Einsteigen auf Planeten und Verlassen eines Wracks bleibt der Zeiger eingefangen (`interior.ts`, `onfoot.ts`, `dungeon.ts`).
  Fehlt er (nach Menü, Karte, Chat), holt ihn das Spiel zurück, sobald der Browser es erlaubt, sonst reicht ein Klick (der dann nicht schießt).
  Esc im Flug gibt den Zeiger frei und öffnet die Pause.
- Ohne eingefangenen Zeiger dreht zu Fuß nichts mehr nach der Zeigerposition.
- Die alte Steuerung bleibt wählbar: Einstellungen → „Alte Maussteuerung (Zeiger aus der Mitte ziehen)“.

## Ladezeiten Andocken und Einsteigen, Innenlicht der Schiffe (2026-11-18, nach Alpha 1.44)

**Schiff betreten (erstes Mal):** Beim Einsteigen kamen die Lampen des Innenraums als neue Lichter dazu (dazu eine andere Umgebungsspiegelung);
alle sichtbaren Materialien brauchten neue Shader: 0,9 s Standbild (gemessen, Kormoran im Bastion-Hangar). Jetzt wärmt `prewarmShipRoom`
(`interior.ts`) gleich nach dem Andocken vor: Innenraum für einen Augenblick dazusetzen, Sichtbares übersetzen, wieder herausnehmen.
Wichtig: three.js `compile` nimmt jedes Objekt der Szene, auch versteckte; ein erster Versuch übersetzte so 40 statt 13 Shader und dauerte 7 s.
Darum werden versteckte Zweige für den Aufruf aus den Kinderlisten genommen. Ergebnis: Einsteigen ohne langes Bild, Vorwärmen kostet 62 ms.

**Erstes Andocken an der Bastion:** 2,7 s Blende (Raumspiegelungen aller 17 Deckräume und des Hangars 1,5 s, Hochladen 0,3 bis 0,9 s); das
zweite Andocken nur 0,25 s, weil beides erhalten bleibt. Jetzt erledigt `primeStationEarly` (`deck.ts`) beides hinter dem Ladebildschirm.
Ergebnis: erstes Andocken 0,48 s, Neues Spiel kommt ohne Blende in den Hangar. Der Ladebildschirm steht dafür rund 1,7 s länger.

**Innenlicht Kormoran und Wisent („sehr hell, blendet“):** Punktlichter des Innenraums Stärke 8 statt 24 und 0,5 m unter der Leuchte
(direkt an der Decke strahlten sie die eigene Abdeckung gleißend an). An Bord: Grund- und Sonnenlicht von draußen auf 30 %, Leuchtflächen
gedimmt und ohne Grundfarbe (`ROOM_GLOW` in `interior.ts`: Deckenlicht, Lichtband, Blitzlicht, Leuchte, Bodenlicht, Portallicht).
Die Materialien teilen sich alle Schiffe; beim Aussteigen wird alles zurückgestellt (von außen leuchten die Lichter wie vorher).

## Waffenmodule mit eigenem Geschoss (2026-11-18, nach Alpha 1.45)

Vorher hoben die Module im Waffen-Steckplatz nur Schaden oder Feuerrate; sie sahen und klangen wie die Serienkanone. Jetzt kann ein Modul
ein eigenes Geschoss vorgeben (`bolt` in `data/gear.ts`, Stile in `game/bolts.ts`, Auswahl in `playerBolt(dmg, cls, mod)`):

| Modul | Geschoss | Eigenheit |
|---|---|---|
| Rotationsverschluss | Schnellfeuer-Bolzen (kurz, gelb) | heller Ton |
| Gauss-Beschleuniger | Gauss-Geschoss (lang, dünn, cyan) | 35 % schneller (`speed`), gleiche Reichweite, Zielhilfe rechnet mit dem Tempo |
| Zwillingslafette | Zwillingsbolzen (rotorange) | |
| Ferrox-Lanze | Ferrit-Lanze (dick, violett) | schwerer Einschlag |

Läufe, Lader und Zielrechner geben kein Geschoss vor: Dann gilt weiter die Laserstufe nach Schaden (p1 bis p4).
Laden und Inventar zeigen „Geschoss: …“ in der Werteliste (`statLine`). Neues Modul mit eigenem Geschoss: Stil in `BOLTS` und `bolt` am Modul.

Nebenbei: Beim Aussteigen aus einem Schiff stellt das Spiel jetzt genau das Licht von vor dem Einsteigen wieder her (vorher pauschal
`setExposure(0.2)`; gemessen ohne sichtbaren Unterschied, aber unabhängig von späteren Änderungen am Licht).

## Kühlfenster, Ferrox auf Entfernung, Belohnungstempo (2026-11-18, nach Alpha 1.46)

**Kühlfenster am Bergbaulaser** (`mining.ts`, `COOL_WIN` = 72 bis 94 %): Wer im Fenster loslässt, löst eine Schnellkühlung aus (0,7 s dreifach
schnell, Zischen, Dampf an den Emittern, „SCHNELLKÜHLUNG“ am Fadenkreuz). Am Hitzebogen markiert ein dünner Abschnitt das Fenster, im Fenster
wird der Bogen hellblau. Gemessen (Venom): im Fenster losgelassen rund 1,7 s bis kalt, bei 66 % 2,6 s, überhitzt 4,5 s Zwangspause.

**Ferrox auf Entfernung** (`hud.ts`): Rahmen mindestens 12 statt 9 Bildpunkte, ab 700 m die Entfernung darunter; wer gerade einen Angriff
auf dich fliegt, hat einen rötlichen Rahmen und einen Randpfeil bis 2,5 km (sonst 1,3 km). Kein Leuchten, kein Vorhaltepunkt.

**Belohnungstempo** (Testpilot, Venom, Heimstatt, mit Kühlfenster): eine Ladung (32) in 30 s Abbau plus 6 s zwischen den Brocken, Wert
554 Cr; mit Rückflug (1,9 km), Landung, Verkauf und Start grob 90 s, also rund 370 Cr/min am Anfang (Elster nach etwa 9 min, Kormoran nach
etwa einer Stunde). Kampf brachte nur gut 200 Cr/min (Jäger 15 Cr plus 70 % Schrott zu 38 Cr) trotz Risiko und Kosten. Darum Kopfgeld
verdoppelt: Jäger 30, Bomber 90 Cr (Bienenstock bleibt 600). Bergbau unverändert.

## Standbilder bei Übergängen (2026-11-18)

**Ruckler-Protokoll** (`perf.ts`, läuft immer mit): jedes Bild über 70 ms mit Ort und Ursache (neue Shader, hochgeladene Bilder und Formen,
Speicherbereinigung). F3 zeigt die letzten vier, F4 kopiert alle in den Bericht. Bilder hinter einer Blende zählen nicht.

**Gemessen und behoben** (Testfenster ohne echte Grafikbeschleunigung, Zeiten deshalb übertrieben):
| Übergang | vorher | Ursache | jetzt |
|---|---|---|---|
| Planetenoberfläche betreten | 3,7 und 4,9 s Standbild | 44 neue Shader, Bilder | hinter einer Blende „Landeanflug“ (1,1 s), danach 0,09 s |
| Landen (Rover) | 0,25 s | Rover-Scheinwerfer (immer 0, zählte aber als Licht) | entfernt, 0 Shader |
| Zu Fuß aussteigen | 5,5 bis 7,9 s | Tür der Basis mit Lampe entstand erst beim ersten Schritt (+1 Licht → alle Shader neu) | Landefeld beim Betreten berechnet; Rover und Figur hinter der Blende gebaut; 0,1 bis 0,17 s |
| Andocken, nach der Blende | 0,22 bis 0,36 s | Kleinteile, die erst aus der Nähe eingeblendet werden | `uploadAll` lädt hinter der Blende alles hoch |

Außerdem: Das Punktlicht fürs Mündungsfeuer zu Fuß ist weg (blieb nach dem ersten Schritt für immer in der Szene und zwang später im All
und im Hangar erneut alle Shader neu). Regel: Jedes Licht, das unterwegs dazukommt oder verschwindet, kostet ein Standbild; Lichter mit
dem Gebiet zusammen anlegen. Hangar: Ein- und Aussteigen und der Gang Deck ↔ Hangar ohne langes Bild; nach der Landung bleibt ein kurzes
Stocken (0,17 s im Testfenster) für das Vorwärmen „an Bord“ (hinter der Blende passt die Szene noch nicht, gemessen 14 Shader beim Einsteigen).

## Vorbereiten beim Anflug, Sprung und Eintritt ohne Standbild (2026-11-18, nach Alpha 1.48)

- **Erstes Andocken an Stationen mit Deck (Eisenkrone)** wird beim Anflug vorbereitet (`approachPrime.ts`, unter 7 km): Deck aufbauen,
  Raumspiegelungen (je Schritt eine, `deck.primeStep`), Bilder und Formen in Portionen hochladen, Shader Teil für Teil gegen eine Licht-Kopie
  der Szene mit den Deck-Strahlern übersetzen. Höchstens 4 ms je Bild. Gemessen: Blende 6,9 → 1,2 s (Shader 5,1 → 0,2 s), Stocker danach
  2,8 → 0,12 s. Gewöhnliche Stationen (Sonnenwacht) brauchten das nicht (Blende 1,1 s, danach nichts). Die Bastion erledigt der Start.
- **Sprung und Atmosphäreneintritt:** Der weiße bzw. orange Blitz bleibt stehen, bis der neue Sektor bzw. die Oberfläche übersetzt ist
  (`warmScene(…, quiet)`), statt sofort auszublenden. Weiterspielen bekommt eine kurze Blende „Spiel wird geladen“.
- **Gleiche Spiegelungsgröße überall** (`textures.ts`, `envFor`): Die Umgebungsspiegelung aus dem Nebelbild wird immer aus 512 × 256
  berechnet. Vorher ergab sich die Größe aus dem Nebelbild (2048 bis 8192 breit) und stand in jedem Shader – jeder Sektor brauchte eigene
  Shader für alle Schiffe und Stationen. Nach einem Sprung jetzt kein Shader-Stocker mehr (vorher 1,45 s mit 12 Shadern).
- **Nach der Landung im Hangar** (`prewarmShipRoom`/`stepShipWarm`): Vorwärmen „an Bord“ Teil für Teil der Szene, Teile mit Lichtern zerlegt
  (sonst zählen Lampen doppelt), in einem Zug. Gemessen kein Bild über 45 ms mehr, Einsteigen ohne neuen Shader. Auf viele Bilder verteilt
  war es schlechter (1,3 s: normale neue Shader warteten hinter der Warteschlange).
- Verworfen: alle Schiffsmodelle beim Start vorwärmen (Start 3,7 s länger, half wegen der verschiedenen Spiegelungsgrößen nicht).
