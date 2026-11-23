# Spielerfigur auf dem UE5-Skelett (Bewegungen aus Unreal, „Manny-Satz“)

Seit 2026-11-23. Erst als Testfigur Manny hinter `?manny=1`, seit dem Abend des 23.11.2026 mit eigener Figur und als Standard:
Die **eigene Spielerfigur in der Außensicht** ist das Modell `spieler_03` (Grundkörper mit Unteranzug, auf Mannys Skelett gebunden)
mit den Bewegungen des Manny-Satzes. Mannys Netz wird nicht mehr gezeigt und nicht mehr ausgeliefert.

## Figur und Bewegungssatz sind zwei Dateien
- `lazy/Spieler` – die Figur: `asset-src/glb/lazy/Spieler.glb` (Kopie von OneDrive `Blender/Spielfigur/Final/spieler_03.glb`,
  ein Netz, 60.000 Dreiecke, 161 Knochen, drei Texturen; gepackt 1,3 MB, Texturen auf 2048 begrenzt – die Quelle hat 4096).
- `lazy/Bewegungen` – der Bewegungssatz: 449 Clips (1.447 s) in einem eigenen kompakten Format, 12,5 MB
  (siehe „Vollständiger Bewegungssatz“ unten). Bis zum Nachmittag des 23.11.2026 war es `lazy/Manny`, eine GLB mit 321 Clips und 40 MB.
- Die Clips finden ihre Knochen über den **Namen**. Jede Figur mit genau diesem Skelett (gleiche Knochennamen, gleiche Ruhelage)
  kann den Satz nutzen: Datei nach `asset-src/glb/lazy/` legen, `node scripts/build-manny.mjs <Name>`, in `mannyAvatar.ts`
  als `lazy/<Name>` eintragen. Geprüft für `spieler_03`: Ruhelage aller 161 Knochen gleich Manny (Abweichung unter 0,001 mm
  und 0,06°), gleiche Eltern, gleiche Bindematrizen. Weicht ein Skelett ab (andere Proportionen), reicht das nicht: Die Clips
  bringen Mannys Knochenlängen mit und würden das Netz verziehen; dann müssen die Verschiebungsspuren bis auf `root` und
  `pelvis` entfallen.
- Messung mit der neuen Figur (`MT.bench()`): 1.826 cm Gleiten, 549° Haltungssprünge – genau die Werte mit Manny.
  Bild: `docs/bilder/spieler_03_im_spiel.jpg` (Stand, Sprint, Ducken, seitwärts geduckt, rückwärts).

## Schalter
- Standard: ein. `?manny=0` zeigt wieder die alte Soldatenfigur mit altem Lauftempo (bleibt auf dem Gerät gespeichert), `?manny=1` schaltet zurück.
- Außensicht mit **V**. Die Figur lädt ihre beiden Dateien, sobald das Hauptmenü steht (`whenIdle` in `core/assets.ts`);
  bis sie da sind, zeigt das Spiel die Soldatenfigur mit dem alten Lauftempo.
- Fehlt eine Datei oder schlägt das Laden fehl, bleibt es beim Soldaten (Hinweis in der Konsole).

## Vollständiger Bewegungssatz (23.11.2026, abends)

Seit dem 23.11.2026 liegt der ganze Satz aus Epics Game Animation Sample auf Mannys Skelett vor: 19 GLB-Dateien, **1.879 Clips,
gut zwei Stunden Bewegung** (OneDrive `Blender/Spielfigur/Animationen`, lokale Kopie `asset-src/neu/spielfigur/animationen`,
400 MB, nicht im Repository). Davon sind 926 Clips (3.276 s) der Stil „Neutral“, 893 (3.916 s) der Stil „Relaxed“, der Rest
Interaktionen, Ragdoll und Tests.

### Eigenes Format statt GLB
Als GLB braucht jeder Clip 483 Kanäle mit eigenem Eintrag: Von den 40 MB für 321 Clips waren 28 MB reine Verwaltung.
`scripts/build-clips.mjs` schreibt deshalb `asset-src/lazy/Bewegungen.lca` (Format LCA1, im Kopf des Skripts beschrieben):
je Clip eine Zeile, Drehungen mit 16 Bit in fester Bildfolge (30 je Sekunde), mit Meshopt verdichtet. Spuren, die sich im Clip
nicht ändern, kosten einen Wert, Spuren in Ruhelage nichts. Nur 78 der 161 Knochen haben überhaupt eine Drehspur, 2 eine
Verschiebespur.
- **449 Clips (1.447 s) brauchen 12,5 MB** – vorher 321 Clips 40 MB. Hochgerechnet passt der ganze neutrale Stil in rund 28 MB.
- `src/game/manny/ClipStore.js` liest die Datei. Beim Laden wird nichts ausgepackt; ein Clip entsteht erst, wenn er gebraucht
  wird, und der Animator hält höchstens rund hundert Aktionen (`_act`, `_trim`). Die Analyse aller Clips liest nur die Beine: 270 ms.
- Die Messreihe ist mit dem neuen Format unverändert: 1.825 cm Gleiten, 549° Haltungssprünge.
- Auswahl: `scripts/clipset.mjs` (`BASE` = die 321 Clips der ersten Fassung, `EXTRA` = Muster für das, was dazukam).
  Neu packen dauert Sekunden: `node scripts/build-clips.mjs` (`--liste` zeigt nur die Auswahl). Fehlt der Quellordner, bleibt
  die `.lca`-Datei im Repository die Quelle; `npm run assets` kopiert sie in die Paketliste.

### Was aus dem neuen Satz genutzt wird
| Was | Clips | Wie |
|---|---|---|
| Blick | 42 Blickposen (`AO_Stand`, `AO_Crouch`) | Kopf und Brust folgen der Kamera nach oben und unten; im Stand dreht sich der Oberkörper mit, bis die Füße nachsetzen (`PoseLayers.js`) |
| Neigung | 6 Neigeposen (Laufen, Sprinten) | Der Körper legt sich beim Laufen in die Kurve, der Kopf führt; Gewicht aus Tempo × Drehrate |
| Standpausen | 6 im Stand, 5 geduckt | nach 9 bis 20 s Stehen spielt eine Pause; jede Eingabe bricht sie ab |
| Hinhocken, Aufstehen | 2 | im Stand als Bewegung statt als Überblendung |
| Geduckt laufen | +4 Richtungen | schräg rückwärts fehlte bisher |
| Sprung | 54 neue (vier Richtungen, beide Füße, leicht/schwer) | seitwärts und rückwärts eigene Absprünge und Landungen; die Fußvariante wählt der Animator nach der Haltung |
| Tod | 4 Stürze + 4 Liegeposen | die Figur wird umgeworfen und kommt in der passenden Liegepose zur Ruhe |

Die Schichten für Blick und Neigung liegen auf der gespielten Bewegung: je Knochen die Drehung von der Grundpose zur Pose, im
Raum des Elternknochens, nach dem Mixer und vor dem Überblenden aufgerechnet. Die Neigung verschiebt die Füße mit (wie in der
Pose): In der Kurve gleiten sie dadurch etwas mehr (Messlauf „kurve“: 86 statt 69 cm), geradeaus ändert sich nichts.

### Noch nicht genutzt (Stand 23.11.2026)
- **Richtungswechsel beim seitlichen Laufen** (`Box`, `Diamond`, `Hourglass`, `Prism`, `Shuffle`: rund 330 Clips, 1.100 s für
  Gehen, Laufen, Geduckt): echte Setzschritte von jeder Richtung in jede. Das ist die Datenbasis für Motion Matching. Passt erst,
  wenn die Spielphysik weicher beschleunigt (heute volle Geschwindigkeit nach 0,25 s; die Clips brauchen 0,6 bis 1 s).
- **Übergänge der Gangarten** (`Transition_Walk_to_Run`, `Run_to_Sprint` …, 12 Clips).
- **Stil „Relaxed“** (893 Clips): lockere Haltung, z. B. für Stationen. Würde den Download etwa verdoppeln.
- **Rutschen, Klettern und Überspringen** (`Slide`, `Traversal`): brauchen neue Spielmechanik (Hindernisse erkennen).
- **Aufstehen nach einem Sturz, Hinsetzen auf eine Bank, Gesten, Angriffe** (`getup`, `bench`, `gesture`, `takedown`).

## Was mit der neuen Figur noch fehlt
- **Waffe, Anschlag, Schießen, Nachladen, Treffer-Zucken**: Auch der vollständige Satz hat dafür keine Clips. In der Außensicht
  hält die Figur keine Waffe (die Ich-Sicht ist nicht betroffen).
- **Ausrüstung** (Helm, Anzug, Rucksack) zeigt die Figur nicht; sie ist der Grundkörper.
- **Charakterfenster, andere Spieler:innen, Wachen** zeigen weiter die Soldatenfigur.

## Was Manny kann und was nicht
- Kann: Stehen, Drehen auf der Stelle (45/90/135/180°), Gehen, Laufen, Sprinten, Starts und Stops passend zum Fuß, 8 Richtungen,
  Ducken, Sprung mit leichter oder schwerer Landung. Kurzes Tippen = kleiner Schritt.
- Kann nicht: Waffen halten, Anschlag, Schießen, Nachladen, Treffer-Zucken. (Stand der ersten Fassung; der Tod ist seit dem Abend des 23.11.2026 ein eigener Sturz, siehe oben.)
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
- Dateien: `asset-src/lazy/Bewegungen.lca` (Bewegungssatz) und `asset-src/glb/lazy/Spieler.glb` (Figur). Paket **lazy**:
  nicht vor dem Menü geladen; die Spielerfigur fordert ihre beiden Dateien an, sobald das Menü steht.
  Einzeln neu packen: `node scripts/build-manny.mjs Spieler` (Figur) bzw. `node scripts/build-clips.mjs` (Bewegungssatz); `npm run assets` nimmt beide mit.
- `ClipStore.js` (liest den Bewegungssatz), `PoseLayers.js` (Blick und Neigung).

## Herkunft und Lizenz
Figur (UE5-Mannequin „Manny“) und Bewegungen stammen aus Epics **Game Animation Sample** (UE 5.8), wurden in Unreal auf Manny übertragen,
als FBX exportiert und in Blender zu GLB zusammengeführt. Das ist Epic-Inhalt unter der **Unreal-Engine-EULA**, die solche Inhalte
nach unserem Verständnis nur in Unreal-Engine-Produkten erlaubt. Seit dem 23.11.2026 wird Mannys Netz nicht mehr ausgeliefert
(die Figur ist das eigene Modell `spieler_03`); die **Bewegungen** bleiben Epic-Inhalt, ebenso die Maße des Skeletts. Für eine
Veröffentlichung ohne dieses Risiko die Bewegungslogik mit eigenen oder frei lizenzierten Clips nutzen (gleiche Clipnamen in
`clipMap.js` anpassen).
