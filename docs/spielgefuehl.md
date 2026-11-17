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
