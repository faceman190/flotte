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
- **Tempo der Bewegungen.** Mit Manny läuft das Spiel so schnell wie die Clips (`footPace` → `mannyPace`): Laufen 5,1 m/s, Sprinten 7,1,
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
- Der Fuß kippt am Hang nicht mit (er bleibt waagerecht). Sprint-Schleife und Stopps haben in den Clips selbst noch Gleiten (Tabelle).
- Stufe 2: Oberkörper (Waffe, Zielen, Schießen, Nachladen, Treffer, Tod). Stufe 3: echtes Motion Matching mit vorausberechnetem Weg,
  Messdaten beim Packen statt beim Laden. Stufe 4: MetaHuman.

## Richtung (Entscheidung 23.11.2026)
Wir bauen künftig auf dem Unreal-System auf: Skelett nach UE5/MetaHuman-Namen, Bewegungen aus Unreal (Game Animation Sample und eigene),
diese Bewegungslogik als Grundlage. Die Lizenzfrage (Epic-Inhalte außerhalb von Unreal) bleibt offen, bis die Bewegungen eigene oder frei lizenzierte sind.

## Aufbau
- `src/game/mannyAvatar.ts`: Schalter, Laden, Anbindung an `driveAvatar` (avatar.ts; nur Figuren mit `player`, also die eigene).
- `src/game/manny/`: Bewegungslogik (JavaScript, aus der Manny-Demo übernommen). `MannyAnimator.js` (Zustände, Auswahl der Clips nach Pose),
  `ClipFeatures.js` (misst jeden Clip beim Laden), `Inertializer.js` (weiche Übergänge), `FootIK.js` (Füße am Boden halten),
  `clipMap.js` (alle Clipnamen und Einstellwerte an einer Stelle).
- Datei: `asset-src/glb/lazy/Manny.glb` (321 Clips). Paket **lazy**: weder vor dem Menü noch im Hintergrund geladen, nur auf Anforderung.
  Einzeln neu packen: `node scripts/build-manny.mjs` (dauert rund 10 Minuten); `npm run assets` packt sie ebenfalls.

## Herkunft und Lizenz
Figur (UE5-Mannequin „Manny“) und Bewegungen stammen aus Epics **Game Animation Sample** (UE 5.8), wurden in Unreal auf Manny übertragen,
als FBX exportiert und in Blender zu GLB zusammengeführt. Das ist Epic-Inhalt unter der **Unreal-Engine-EULA**, die solche Inhalte
nach unserem Verständnis nur in Unreal-Engine-Produkten erlaubt. Deshalb ist Manny nur als Test gedacht. Für eine Veröffentlichung
die Bewegungslogik mit eigenen oder frei lizenzierten Clips (gleiche Clipnamen in `clipMap.js` anpassen) nutzen.
