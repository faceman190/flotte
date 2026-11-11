# Neue Modelle hier ablegen

Leg exportierte Modelle als **GLB** hier hinein und sag Claude kurz, was jedes sein soll
(z. B. „neuer Frachter, größer als der Kärrner“ oder „Station fürs Grenzgebiet“).
Claude prüft, wandelt um, komprimiert, sortiert die Datei in den passenden Ordner unter `asset-src/glb/` und baut sie ins Spiel ein.

## Export aus Blender

*Datei → Exportieren → glTF 2.0 (.glb)* mit diesen Einstellungen:

- **Format:** glTF Binary (.glb)
- **Einschließen:** „Ausgewählte Objekte“, wenn nur ein Teil der Szene exportiert werden soll
- **Transformieren:** „+Y oben“ eingeschaltet lassen (Standard)
- **Daten → Mesh:** „Modifikatoren anwenden“ einschalten
- **Material:** Exportieren; Bilder „Automatisch“ (Texturen landen in der GLB-Datei)
- **Animation:** einschalten, wenn sich etwas bewegen soll (drehende Ringe, Tore, Figuren)

Vorher in Blender:

- *Strg+A → Alle Transformationen* anwenden (Größe und Drehung stimmen dann)
- Materialien mit dem Prinzipien-BSDF-Shader und Bildtexturen; rein prozedurale Node-Texturen werden nicht exportiert (vorher backen)
- Grober Rahmen für die Polygonzahl: Schiffe 10.000–50.000 Dreiecke, Stationen bis etwa 150.000, Figuren 5.000–20.000 (mehr geht, dann wird reduziert)
- Schiffe möglichst mit der Nase in eine klare Richtung (egal welche, Claude dreht sie passend)

## Rechte

Nur Modelle verwenden, an denen du die Rechte hast (selbst gemacht, gekauft oder mit passender freier Lizenz).
Bei fremden Modellen bitte Quelle und Lizenz dazuschreiben, z. B. in eine Textdatei mit gleichem Namen.
