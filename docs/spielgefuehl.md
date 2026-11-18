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
