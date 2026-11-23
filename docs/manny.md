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
  Weil die Spieltempos (4,2 und 6,4 m/s) nicht genau zu den Clips passen (Laufen 5,1, Sprinten 7,1 m/s), rutschen die Füße beim Laufen etwas.
- Behoben (23.11.2026): In Stationen und Schiffen lief Manny um die Drehung des Raums versetzt (oft 90° seitlich statt geradeaus).
  Ursache: Die Blickrichtung wurde gegen die Weltdrehung des Halters gerechnet, Richtung und Tempo kommen aber in Raumkoordinaten.
  Jetzt zählt die lokale Drehung des Halters (mannyAvatar.ts). Geprüft auf Deck 3 der Bastion: W geradeaus, D seitlich nach rechts (docs/bilder/manny-laufen.jpg).

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
