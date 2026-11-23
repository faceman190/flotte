# Testfigur Manny (Bewegungen aus Unreal)

Seit 2026-11-23 (Branch `manny-animator`). Manny ersetzt auf Wunsch den Soldaten als **eigene Spielerfigur in der Außensicht**.
Für alle anderen ändert sich nichts.

## Einschalten
- Spiel mit `?manny=1` öffnen (bleibt auf dem Gerät gespeichert), mit `?manny=0` wieder aus.
- Außensicht mit **V**. Beim ersten Mal lädt das Spiel die Datei `lazy/Manny` (gut 55 MB, danach aus dem Speicher).
- Fehlt die Datei oder schlägt das Laden fehl, bleibt es beim Soldaten (Hinweis in der Konsole).

## Was Manny kann und was nicht
- Kann: Stehen, Drehen auf der Stelle (45/90/135/180°), Gehen, Laufen, Sprinten, Starts und Stops passend zum Fuß, 8 Richtungen,
  Ducken, Sprung mit leichter oder schwerer Landung. Kurzes Tippen = kleiner Schritt.
- Kann nicht: Waffen halten, Anschlag, Schießen, Nachladen, Treffer-Zucken. Beim Tod wechselt die Darstellung zurück zum Soldaten.
- Die Spielphysik bewegt die Figur; Mannys eigene Fortbewegung in den Clips (Root Motion) wird nur für die Darstellung genutzt.
- Behoben (23.11.2026): In Stationen und Schiffen lief Manny um die Drehung des Raums versetzt (oft 90° seitlich statt geradeaus).
  Ursache: Die Blickrichtung wurde gegen die Weltdrehung des Halters gerechnet, Richtung und Tempo kommen aber in Raumkoordinaten.
  Jetzt zählt die lokale Drehung des Halters (mannyAvatar.ts). Geprüft auf Deck 3 der Bastion: W geradeaus, D seitlich nach rechts (docs/bilder/manny-laufen.jpg).

## Anschluss ans Spiel: die Kapsel führt (Stufe 1, 23.11.2026)
Wie in Unreals Beispiel bewegt die Spielphysik die Figur, und die Animation richtet sich nach ihr. Damit die Füße trotzdem nicht rutschen:

- **Absicht statt Tempo.** Die Laufstellen (interior.ts, onfoot.ts, dungeon.ts) melden mit `setIntent` die Tastenrichtung und das Sprinten.
  Manny wählt damit sofort den richtigen Start (vorher: Geh-Start, weil das Tempo beim Anlaufen noch klein war) und beginnt den Stopp beim Loslassen.
  Läuft die Figur gegen eine Wand (Absicht ja, Tempo nein), bleibt Manny nach 0,3 s stehen.
- **Tempo der Bewegungen.** Mit Manny läuft das Spiel so schnell wie die Clips (`footPace` → `mannyPace`): Laufen 5,2 m/s, Sprinten 7,2,
  seitwärts 3,6, rückwärts 3,1, geduckt 2,3. Sprinten gibt es nur nach vorn (bis 60° seitlich). Ohne Manny bleibt alles beim alten Tempo
  (Station 6 / 6,8, Planet und Mine 4,2 / 6,4). In Stationen ist Manny vorher dauernd gesprintet, weil 6 m/s über der Sprintgrenze lag.
- **Start und Stopp nach Strecke** (Distance Matching, `vel` und `stopDist` im Animator): Der Start-Clip steht immer an der Stelle, die so weit
  gelaufen ist wie die Figur; der Stopp wird an dem Bild betreten, das noch so viel Weg hat wie die Figur, und danach nach Reststrecke abgespielt.
  Schleifen laufen im echten Tempo (0,6- bis 1,3-fach).
- **Weicheres Bremsen** mit Manny (`footBrake`, Rate 8 statt 12–13 pro Sekunde, Bremsweg beim Laufen rund 0,55 m statt 0,35 m): Die Stopp-Bewegung
  hat Platz für ihren letzten Schritt. Einstellbar über `MANNY.brake`.
- **Erscheinen und Versetzen** (`teleport`): Neu im Halter oder um mehr als 1,5 m versetzt steht Manny sofort richtig, ohne Drehbewegung.
- **Füße.** Die Fußsperre lebt im Raum der Figur (ein fliegendes Schiff nimmt die Füße mit) und hält nur in der Ebene; die Höhe kommt vom Boden.
  `GroundAdapt` (FootIK.js) fragt die Bodenhöhe unter jedem Knöchel ab (`Drive.ground`: Gelände und Stege auf Planeten, Laufkarte in Schiffen),
  senkt die Hüfte zum tieferen Fuß und beugt das andere Bein. Das Knie hat eine feste Beugerichtung nach vorn (ein fast gestrecktes Bein knickte sonst falsch herum).
- **Sprung.** Der Absprung-Clip wurde nie gespielt (er verlangte Bodenkontakt in dem Bild, in dem das Spiel schon in der Luft ist). Jetzt beginnt er am Absprung.
- **Laden.** Das Vermessen der 321 Clips (rund 0,4 s) läuft in Scheiben von 6 ms, das Spiel friert dabei nicht ein.
- **Material.** Die Datei bringt reinweißes Material mit, das in der Sonne überstrahlte. Jetzt mattes Grau in zwei Tönen.

### Messung (scripts/mannytest.js, Bilder von 50 ms)
Gemessen wird, wie weit ein aufgesetzter Fuß über den Boden gleitet. „Unvermeidbar“ ist der Wert, den dieselben Clips hätten, wenn die Figur
genau ihrer eigenen Fortbewegung folgte. Bastion Deck 3, alter Anschluss gegen neuen:

| Abschnitt | alt: Gleiten | neu: Gleiten | neu: unvermeidbar |
|---|---|---|---|
| Laufen 2 s | 110 cm auf 12,0 m | 9 cm auf 10,2 m | 9 cm |
| seitwärts 2 s | 356 cm auf 11,6 m | 70 cm auf 6,9 m | 74 cm |
| rückwärts 2 s | 415 cm auf 11,6 m | 26 cm auf 5,9 m | 29 cm |
| Kurve 2,5 s | 121 cm | 49 cm | 32 cm |
| fünf Stopps zusammen | 458 cm | 249 cm | 244 cm |

Der Weg der Figur und der Weg der Clips stimmen jetzt überein (Laufen 10,19 m gegen 10,19 m; alt 12,0 m gegen 14,2 m).
Am Hang (Schlacke, 8 bis 42 % Steigung, zwölf Stellen): Höhenunterschied der beiden Knöchel über ihrem Boden 9,3 cm ohne und 0,1 cm mit Bodenanpassung.
Planet und Mine zeigen dieselben Werte wie die Station.

### Offen
- Nicht geprüft: Kormoran und Wisent zu Fuß (Rampen, Stufen der Laufkarte), ein Schiff im Flug, ein schwacher Rechner.
- Der Fuß kippt am Hang nicht mit (er bleibt waagerecht).
- Stufe 2: Oberkörper (Waffe, Zielen, Schießen, Nachladen, Treffer, Tod). Stufe 4: MetaHuman.

## Stufe 3: Motion Matching (23.11.2026) – gebaut, gemessen, wieder ausgebaut
**Stand:** Der Schalter `?mm=1` und die Suche sind am selben Tag wieder entfernt worden. Im Test auf dem Testserver war zwischen beiden Wegen
kein Unterschied zu sehen oder zu spüren, und die Messung spricht für die abgestimmte Zustandslogik. Der Code steht in Commit `ecc2187`
(`src/game/manny/MotionMatcher.js`, Zustand `mm` im Animator), falls ein größerer Bewegungssatz die Suche später lohnt. Geblieben sind die drei
Korrekturen weiter unten und die sauberen Schrittzyklen der Schleifen (jetzt `GaitCycle.js`). Der Rest dieses Abschnitts beschreibt den Versuch.

**Was es war** (`MotionMatcher.js`, Zustand `mm` im Animator): eine Datenbank aus allen Einzelbildern der Starts, Schleifen, Stopps und
Richtungswechsel (201 Clips, 23.178 Bilder, je 20 Werte: Fußlage, Fußtempo, Körpertempo und der Weg der nächsten 0,15 / 0,35 / 0,6 s).
Alle 0,1 s und sofort bei neuer Absicht wird das Bild gesucht, das zur gezeigten Haltung und zum vorausberechneten Weg der Figur passt
(Modell der Spielphysik: das Tempo folgt dem Ziel mit Anlauf- bzw. Bremsrate). Eine Suche dauert 0,2 ms. Gespielt wird nach Strecke wie in Stufe 1.
Stehen, Drehen auf der Stelle und Sprünge bleiben Zustände.

**Abstimmung:** Gruppen zählen als Ganzes (Körpertempo und Weg entscheiden Clip und Richtung, die Füße den Zeitpunkt; mit der ersten Gewichtung
gewann beim Seitwärts-Stopp ein stehendes Bild aus der falschen Richtung). Ein neues Bild muss deutlich billiger sein (`mmBias`, `mmGain`),
nach einem Sprung ruht die Suche 0,25 s (`mmHold`). Starts sind nur in ihrer Beschleunigung spielbar, Richtungswechsel nur um die Wende,
ein laufender Stopp wird nicht neu gesucht.

**Messung** (`MT.bench()`: 28 Durchgänge im Hangar der Bastion, alle Richtungen, acht Loslass-Zeitpunkte, Sprint, Richtungswechsel; 50-ms-Bilder).
Gleiten = Weg aufgesetzter Füße über den Boden, Sprung = mittlere Verdrehung aller Knochen an einer Überblendung:

| Fassung | Gleiten | Überblendungen | Sprung gesamt |
|---|---|---|---|
| Stufe 1 wie am Morgen | 2.215 cm | – | – |
| Zustandslogik mit den Korrekturen unten (Standard) | 1.568 cm | 131 | 541° |
| Motion Matching (`?mm=1`) | 1.914 cm | 180 | 847° |

Im gleichmäßigen Lauf (fünf Richtungen, je 4 s): Zustandslogik 302 cm, Motion Matching 356 cm, die alte Fassung mit ganzen Schleifen 467 cm.
Warum die Suche hier nicht gewinnt: Es gibt je Richtung nur einen Start, einen Stopp und eine Schleife, die Zustandslogik trifft also schon fast immer
dieselbe Wahl, und die Suche wechselt öfter. Dazu beschleunigt die Spielphysik in 0,25 s, die Starts brauchen 0,67 s – kein Bild der Datenbank
passt zu Tempo UND Weg der Figur. Mehr Bewegungsmaterial oder eine weichere Anlaufrate (`MANNY.accel`, noch nicht ausprobiert) würden das ändern.

### Fehler, die dabei gefunden wurden (gelten für beide Wege)
- **Stopp zu früh beendet.** Der Stopp ging in die Ruhehaltung über, sobald der Körper stand; der zweite Fuß war noch im Nachsetzen und sprang dann
  um 13–20 cm. Jetzt läuft der Stopp, bis beide Füße stehen (`_stopExit`). 24 Stopps: 1.148 → 701 cm.
- **Überblendung wiederholte ein Bild.** `Inertializer` verglich die Haltung des letzten Bildes mit der neuen Bewegung eines Bild später: Die Figur
  fror für ein Bild ein, während das Spiel sie weiterschob, beide Füße rutschten. Jetzt wird die alte Haltung mit dem Tempo jedes Knochens um ein Bild
  weitergeführt (Lauf vorwärts mit Nahtstellen: 351 → 88 cm).
- **Schleifen schließen nicht.** In der GLB liegt das letzte Bild jeder Schleife 0,3–0,9 m (Füße) neben dem ersten, das gab alle 2,5 s einen Ruck.
  `findCycle` (`GaitCycle.js`) sucht in jedem Clip den saubersten Schrittzyklus (0,5–1 s, Naht 4–15 cm); Schleifen spielen nur ihn, die Naht wird in 0,12 s
  überblendet. Phase 0 ist überall „linker Fuß setzt auf“, damit Richtungen im selben Schritt gemischt werden. Daraus stammt auch das echte Lauftempo
  (5,17 statt 5,10 m/s: Der ganze Clip hat ein doppeltes letztes Bild).
- Die Sprint-Naht bleibt mit rund 7° die gröbste. Die Naht nach dem ganzen Körper zu wählen (`TUNING.cycleBody`) macht sie glatter (4°),
  lässt aber die Füße insgesamt mehr gleiten (450 statt 356 cm) und ist deshalb aus.
- „Messdaten beim Packen statt beim Laden“ ist nicht nötig: Vermessen 0,35 s in Scheiben, Datenbank bauen 0,09 s.

## Ruhiger Anlauf und Stopp beim Joggen (23.11.2026)
Rückmeldung nach dem ersten Test: Beim Anlaufen blitzt kurz eine Sprint-Bewegung auf, beim Anhalten kommt der Stopp aus dem Sprint, obwohl man
nur joggt. Gespielt wurden die richtigen Clips (`Run_Start`, `Run_Stop`) – sie sehen aber fast wie die des Sprints aus:

| Clip | größte Vorlage des Oberkörpers | tiefste Hüfte |
|---|---|---|
| Run_Start_F | 59° | 72 cm |
| Sprint_Start_F | 61° | 73 cm |
| Run_Loop_F (zum Vergleich) | 23–32° | 89–94 cm |
| Run_Stop_F | – | 70 cm |
| Walk_Stop_F | – | 86–95 cm |

Das Spiel ist nach 0,25 s auf vollem Tempo, der Start-Clip braucht 0,8 s. Er wurde deshalb in fünf Bildern durchgespult: tief abducken, gleich
wieder aufrichten. Fürs Joggen gilt jetzt (`TUNING.calmGait = { run: 'walk' }`, `{}` = altes Verhalten):
- **Anlauf:** kein Start-Clip. Aus dem Stand direkt in die Schleife, in der Phase, die zur Standhaltung passt; in der ersten halben Sekunde wird
  die Gangart nach dem echten Tempo gemischt (Gehen ↔ Laufen, im selben Schritt). Vorlage steigt gleichmäßig von 3° auf 27°, Hüfte bleibt über 87 cm.
- **Stopp:** Beim Loslassen rollt die Lauf-Schleife im echten Tempo aus (Füße bleiben auf dem Boden, den sie zurücklegen); unter 1,5 m/s setzt der
  Stopp aus dem Gehen ein (aufrecht, zweiter Fuß setzt nach). Der Standfuß wird dabei festgehalten. Hüfte bleibt über 82 cm.
- Sprint und Ducken behalten ihre eigenen Starts und Stopps. Ein Sprint stoppt als Sprint, auch wenn Shift zusammen mit der Richtung losgelassen
  wird (`_shownGait`: Es zählt die Gangart, die gerade zu sehen ist).

Preis: Die Füße gleiten bei Anlauf und Stopp etwas mehr, weil kein Clip mehr genau diese Bewegung liefert (Messreihe `MT.bench()`):

| Fassung | Gleiten gesamt | Anlauf (24) | Lauf | Stopp (24) | Haltungssprünge |
|---|---|---|---|---|---|
| Stufe 3 wie hochgeladen | 1.568 cm | 249 | 331 | 663 | 541° |
| dieselbe mit Naht in der Flugphase | 1.461 cm | 294 | 286 | 622 | 583° |
| ruhiger Anlauf und Stopp (Standard) | 1.826 cm | 508 | 324 | 726 | 549° |

Dabei gefunden:
- **Naht der Schleifen:** Der Rest zwischen den beiden Enden eines Schrittzyklus (bis 15 cm) wird in 0,12 s überblendet. Lag die Naht auf dem
  Aufsetzen eines Fußes, glitt dieser Fuß bei jedem Schritt bis 18 cm – je nachdem, wie die Phase zum Bildtakt lag, schwankte „Lauf“ zwischen 10 und
  68 cm je Sekunde. Die Naht liegt jetzt bevorzugt in der Flugphase (`TUNING.cycleAir`), dort sieht man die Überblendung nicht (10–21 cm).
  Die älteren Einzelvergleiche von Lauf-Abschnitten in diesem Dokument sind mit dieser Schwankung zu lesen.
- **Gangart beim Ausrollen nicht mischen** (`coastMix`): In 0,1 s schrumpft der Schritt vom Laufen aufs Gehen, die Füße wandern dabei 20–40 cm je Bild.

## Richtung (Entscheidung 23.11.2026)
Wir bauen künftig auf dem Unreal-System auf: Skelett nach UE5/MetaHuman-Namen, Bewegungen aus Unreal (Game Animation Sample und eigene),
diese Bewegungslogik als Grundlage. Die Lizenzfrage (Epic-Inhalte außerhalb von Unreal) bleibt offen, bis die Bewegungen eigene oder frei lizenzierte sind.

## Aufbau
- `src/game/mannyAvatar.ts`: Schalter, Laden, Anbindung an `driveAvatar` (avatar.ts; nur Figuren mit `player`, also die eigene).
- `src/game/manny/`: Bewegungslogik (JavaScript, aus der Manny-Demo übernommen). `MannyAnimator.js` (Zustände, Auswahl der Clips nach Pose),
  `ClipFeatures.js` (misst jeden Clip beim Laden), `GaitCycle.js` (saubere Schrittzyklen der Schleifen),
  `Inertializer.js` (weiche Übergänge), `FootIK.js` (Füße am Boden halten, Boden folgen),
  `clipMap.js` (alle Clipnamen und Einstellwerte an einer Stelle).
- Datei: `asset-src/glb/lazy/Manny.glb` (321 Clips). Paket **lazy**: weder vor dem Menü noch im Hintergrund geladen, nur auf Anforderung.
  Einzeln neu packen: `node scripts/build-manny.mjs` (dauert rund 10 Minuten); `npm run assets` packt sie ebenfalls.

## Herkunft und Lizenz
Figur (UE5-Mannequin „Manny“) und Bewegungen stammen aus Epics **Game Animation Sample** (UE 5.8), wurden in Unreal auf Manny übertragen,
als FBX exportiert und in Blender zu GLB zusammengeführt. Das ist Epic-Inhalt unter der **Unreal-Engine-EULA**, die solche Inhalte
nach unserem Verständnis nur in Unreal-Engine-Produkten erlaubt. Deshalb ist Manny nur als Test gedacht. Für eine Veröffentlichung
die Bewegungslogik mit eigenen oder frei lizenzierten Clips (gleiche Clipnamen in `clipMap.js` anpassen) nutzen.
