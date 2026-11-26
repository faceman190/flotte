# Katalog „Old Mine“ – 60 Megascans-Assets

Stand 26.11.2026 · Quelle: `Old Mine-dc4dc139\mine_raw\<id>` · Übersicht aller Vorschaubilder: `survey\uebersicht.jpg`
Maße in Metern als **X × Y × Z, Z = Höhe** (nach FBX-Import in Blender, Z oben). Dreiecke = LOD0 (Rohscan, vor jeder Reduktion).

## Einheitenprüfung (Blender 5.3, `einheiten_check.py`)

- Alle geprüften FBX (tgmrafyfa, wcbpdfsdw, ufekaeedw, ueujednfa, ueihabqfa, udklcbuiw, ufmodhpfa, ufekadxdw, wcskfaidw) haben im Header `UnitScaleFactor = 1.0` (= Zentimeter) und `UpAxis = Y`.
- Blender-Szene nach Import: `METRIC`, `scale_length = 1.0`, Meter. Jedes Objekt bekommt beim Import `scale = 0.01` und `rot X = 90°` (Y-oben → Z-oben). Die Rohdaten liegen also in cm vor (z. B. Stempel lokal 255,96), die Welt-Maße sind 2,56 m.
- **Ergebnis: Die Maße in survey.json sind echte Meter** (Welt-Bounding-Box inkl. Importskalierung). Plausibel: Stempel 2,3–2,56 m, Spitzhacke 0,87 m, Fäustel 0,49 m, Schienennagel 13–17 cm, Türstock-Gang 2,36 m hoch.
- Beim Export für three.js/glTF die Import-Skalierung 0,01 anwenden (Apply Transform), sonst stehen 100-fache Werte im Mesh.

## Wichtige Hinweise für den Baukasten (Raster 3,2 m, Höhe 3 m)

1. **Gleis und Loren passen nicht zusammen:** Die Gleisstücke ufekaeedw/ufekaevdw sind Normalspur (Schienenkopfmitte 1,53 m auseinander, Schwellen 2,5 m). Der Radsatz ueihabqfa hat ~0,53 m Spur, die Muldenlore ufmodhpfa ~0,44 m. Für die Loren eigenes Schmalspurgleis (~0,6 m) bauen oder Gleis in Querrichtung auf ~0,4 skalieren (Schwellen dann neu verteilen).
2. **wcbpdfsdw ist das beste Grundmodul:** außen 3,17 m breit (≈ 3,2-m-Raster), 3,0 m lang, aber nur 2,36 m hoch → Z ×1,27 für 3 m, oder 2,36 m als Ganghöhe akzeptieren. Länge ×1,067 für exakt 3,2 m.
3. **Stahlbögen (wdpnc…) sind zu groß:** Spannweite ~5,9 m außen, Höhe 3,6–3,8 m, Länge 3,5–4,8 m – passen nur in eine Hauptstrecke mit 6,4-m-Raster (2 Felder) oder müssen stark skaliert werden.
4. **Schutzhelm udklcbuiw ist zu klein** gescannt (18 × 15 × 9 cm statt ~30 × 23 × 15 cm) → ×1,6.
5. Mehrere Dateien enthalten **Varianten übereinander am selben Ort** (ricaS, tl2effiva, wcskfaidw, uddmcgbia) – vor Verwendung trennen.
6. Sehr hohe Dreieckszahlen (0,2–8 Mio. je Asset): Für den Browser müssen alle Meshes dezimiert/neu gebacken werden.

¹ Oberflächen und Decals sind reine Texturen ohne Mesh (keine Megascans-JSON im Paket). Die reale Kachelgröße ist nicht hinterlegt; bei Megascans-Oberflächen üblich 2 × 2 m. Decals haben eine Opacity-Map (4K, Splitt-Decals zusätzlich Translucency); tlgmehog ist ein Einzel-Decal in 8K.

Zählung nach Form: 19 frei stehend · 8 Wandstück · 8 Bodenplatte · 12 Kleinteil · 8 kachelbare Oberfläche · 5 Decal

## Assets

| id | was es ist | Maße (m) X × Y × Z | Dreiecke | Form | Vorschlag im Bergwerksgang |
|---|---|---|---|---|---|
| ricaS | Kurze Kanthölzer/Holzkeile mit Absatz (5 Varianten in einer Datei, übereinander) | 0,07 × 0,81 × 0,05 | 2.499.980 | Kleinteil | Verkeilung zwischen Kappe und Verzug am Türstock, Streudeko am Stoßfuß |
| shnnehua | Kohleboden / dunkler Grubenboden (Kohlegrus, fein) | Textur ¹ | – | kachelbare Oberfläche | Standard-Sohle (Boden) im Kohlegang |
| sinqgag | Splitt-/Kohlebrocken-Streuung in Häufchen (Opacity-Atlas, 4K) | Textur ¹ | – | Decal | Schmutzinseln auf der Sohle, Fuß von Stempeln, Übergänge Boden/Wand |
| smnhxxh | Splitt locker und fein gestreut (Opacity, 4K) | Textur ¹ | – | Decal | Dezente Bodenvariation über Kohleboden, gegen Kachelwiederholung |
| smtinfh | Splitt dicht und gleichmäßig gestreut (Opacity, 4K) | Textur ¹ | – | Decal | Großflächige Schuttschicht auf Sohle und Gleisbett |
| smtqzuh | Splitt in Bändern/Wolken (Opacity, 4K) | Textur ¹ | – | Decal | Schuttspuren entlang der Stöße und der Gleise |
| tezvbcuda | Brettstück, abgebrochen (32 cm) | 0,32 × 0,08 × 0,03 | 1.999.994 | Kleinteil | Streudeko, Bruchholz am Boden |
| tgmrafyfa | Kantholz-Stempel 2,56 m, rau | 0,20 × 0,19 × 2,56 | 999.994 | frei stehend | Türstock-Stempel (Pfosten); mit Kappe ~2,75 m – passt unter 3 m |
| tgmsdc0fa | Kantholz-Stempel 2,50 m | 0,24 × 0,23 × 2,50 | 999.992 | frei stehend | Türstock-Stempel, Variante |
| tgnhcaafa | Kantholz-Stempel 2,43 m | 0,23 × 0,24 × 2,43 | 999.992 | frei stehend | Türstock-Stempel, Variante |
| tgnhde0fa | Kantholz-Stempel 2,32 m, dunkel/glatter | 0,26 × 0,27 × 2,32 | 999.994 | frei stehend | Türstock-Stempel, Variante; auch als schräger Notstempel |
| tgnidj2fa | Kantholz kurz 1,61 m, sehr verwittert mit Ästen | 0,25 × 0,25 × 1,61 | 999.994 | frei stehend | Kurzer Stempel, Holzstapel, umgekippter Pfosten |
| tkpmbcnjw | Schienennagel 13 cm, rostig | 0,13 × 0,02 × 0,03 | 1.076.718 | Kleinteil | Streudeko am Gleis |
| tkqmdbnhw | Schienennagel 17 cm, rostig | 0,17 × 0,03 × 0,03 | 1.077.672 | Kleinteil | Streudeko am Gleis |
| tl2effiva | Eisenkeile/Spaltkeile rostig, ~18 cm (5 Varianten übereinander) | 0,18 × 0,06 × 0,05 | 5.388.808 | Kleinteil | Werkzeugdeko, Kiste/Werkbank |
| tlgmehog | Mörtel-/Betonfleck mit Rand (Opacity, 8K) | Textur ¹ | – | Decal | Ausgebesserte Stellen auf Boden oder Wand, Fundamentfleck |
| uc1mfe1fa | Fäustel / Schlägel, 0,49 m | 0,49 × 0,13 × 0,04 | 999.996 | Kleinteil | Werkzeugdeko, Interaktionsobjekt |
| uckmaibfa | Stecheisen/Spaten mit langem Stiel und T-Griff, 1,68 m | 1,68 × 0,25 × 0,10 | 999.992 | Kleinteil | Werkzeug an Wand gelehnt |
| ucylebxfa | Spitzhacke, 0,87 m | 0,51 × 0,07 × 0,87 | 999.992 | Kleinteil | Werkzeugdeko, Interaktionsobjekt |
| ud0nfezew | Glatter, dunkelbrauner Lehm-/Estrichboden | Textur ¹ | – | kachelbare Oberfläche | Festgetretene Sohle, Kammern, Füllort |
| ud4ofc0fw | Graue, verwitterte Bohlen mit Fugen (evtl. Bretterschalung) | Textur ¹ | – | kachelbare Oberfläche | Bretterverschalung an Wand, Bohlenboden, Bühnen |
| uddjeelqx | Schaufel mit D-Griff, 0,99 m | 0,99 × 0,22 × 0,14 | 1.000.004 | Kleinteil | Werkzeugdeko an Schutthaufen |
| uddmcgbia | Grasbüschel (11 Varianten, Opacity) | 0,49 × 0,48 × 0,62 | 213.960 | frei stehend | Nur Stollenmundloch / Tagesoberfläche, nicht unter Tage |
| udklcbuiw | Bergmanns-Schutzhelm, olivgrün (gescannt zu klein: 18 cm statt ~30 cm) | 0,18 × 0,15 × 0,09 | 1.086.399 | Kleinteil | Deko-Fundstück; vorher ca. ×1,6 skalieren |
| udrffjjqx | Kantholz-Balken liegend 1,99 m, stark verwittert | 1,99 × 0,30 × 0,18 | 999.996 | frei stehend | Kappe (Querbalken) für schmale Türstöcke, Schwelle, Holzstapel |
| uebmddyn | Felswand / Bruchstein, grau mit Rostflecken | Textur ¹ | – | kachelbare Oberfläche | Stoß (Seitenwand) und Firste in unausgebauten Abschnitten |
| uebpbd3fa | Kantholz liegend 1,23 m | 1,23 × 0,18 × 0,11 | 999.992 | frei stehend | Schwelle, Verzugholz, Stapelware |
| uebpbetfa | Kantholz/Latte 1,69 m | 1,69 × 0,16 × 0,11 | 999.992 | frei stehend | Verzug, Handlauf, Stapelware |
| uebpbhcfa | Rundholz geschält 1,56 m | 1,56 × 0,23 × 0,14 | 999.992 | frei stehend | Verzug/Spreize, Holzstapel |
| ueihabqfa | Loren-Radsatz (Achse mit zwei Rädern), Spur ~0,53 m | 0,73 × 0,33 × 0,33 | 1.021.880 | Kleinteil | Ersatzteil-Deko, kaputte Lore |
| ueijag3ew | Geschichteter Fels, braun-grau mit Rost | Textur ¹ | – | kachelbare Oberfläche | Stoß und Firste, Variante zu uebmddyn |
| ueknfaclw | Felsstoß mit Schichtung und Schräm-/Bohrspuren | Textur ¹ | – | kachelbare Oberfläche | Ortsbrust (Stirnwand am Gangende), frisch aufgefahrene Stöße |
| ueujednfa | Kastenlore beladen mit Kohle | 2,06 × 0,95 × 1,56 | 2.099.598 | frei stehend | Hauptprop auf dem Gleis; Kohleladung bis 1,56 m |
| ufekab3dw | Bretterrampe auf zwei Stahlträger-Stützen | 1,61 × 2,60 × 1,33 | 999.996 | frei stehend | Gleisende/Auffahrt, Rutsche an Verladestelle |
| ufekadxdw | Bohlenboden mit eingelassenen Schienen, 5,0 × 3,21 m | 5,00 × 3,21 × 0,27 | 1.998.255 | Bodenplatte | Bodenmodul mit Gleis; Breite trifft das 3,2-m-Raster genau |
| ufekaeedw | Gleisstück gerade 2,5 m auf 4 Holzschwellen (Normalspur, Schienenmitte 1,53 m) | 2,50 × 2,50 × 0,22 | 1.000.010 | Bodenplatte | Gleis; Spur zu breit für die Loren (siehe Hinweis) |
| ufekaevdw | Gleisstück gerade 2,5 m mit Laschenstoß (Normalspur) | 2,50 × 2,44 × 0,22 | 1.000.006 | Bodenplatte | Gleis-Variante mit Schienenstoß |
| ufekaffdw | Kombination: Bohlenboden mit Schienen + Rampe (4 Objekte) | 5,00 × 3,21 × 1,36 | 4.998.267 | Bodenplatte | Fertige Verladestelle; zum Zerlegen in Einzelteile |
| ufmodhpfa | Leere Muldenlore aus Blech, Spur ~0,44 m | 0,77 × 1,10 × 1,06 | 2.000.146 | frei stehend | Lore auf dem Gleis, leer |
| ugfmehgfa | Stahl-Grubenstempel (Reibungsstempel) mit Schloss, 2,55 m | 0,31 × 0,25 × 2,55 | 1.000.004 | frei stehend | Stahlausbau-Stempel; Ersatz für Holzstempel |
| ugfndjqfa | Stahl-Grubenstempel kurz, 1,69 m | 0,31 × 0,25 × 1,69 | 1.000.004 | frei stehend | Stempel in niedrigen Abschnitten, liegend als Deko |
| uh1nbhzlw | Rötlich-brauner Fels, stark geklüftet | Textur ¹ | – | kachelbare Oberfläche | Stoß/Firste in eisenhaltigem Gestein, Erzgang |
| uhcgdblfa | Vierkant-Stahlstempel mit Klemmschloss, 1,60 m | 0,31 × 0,22 × 1,60 | 2.000.008 | frei stehend | Kurzer Stahlstempel, Variante |
| ujzhahdfa | Rungenwagen beladen mit Rundholz | 0,83 × 2,30 × 1,06 | 3.233.666 | frei stehend | Holztransport auf dem Gleis |
| ujzlbgzfa | Holzkastenlore beladen mit blauen Säcken | 0,77 × 1,25 × 1,08 | 2.120.398 | frei stehend | Materiallore auf dem Gleis |
| ul4lehiga | Flacher Geröll-/Erdhaufen, rötlich | 3,22 × 1,88 × 0,32 | 498.820 | Bodenplatte | Schuttkegel an der Wand, verschüttete Gangstelle |
| vcyjedsfa | Rungenwagen leer | 0,83 × 1,08 × 1,06 | 1.680.088 | frei stehend | Leerer Holzwagen auf dem Gleis |
| venoehv | Rötlich-brauner Erdboden | Textur ¹ | – | kachelbare Oberfläche | Sohle in eisenhaltigem Abschnitt, Stollenmundloch |
| vgyidfpaw | Wandleuchte (Ovalleuchte) mit Schutzgitter | 0,14 × 0,13 × 0,21 | 2.000.000 | Wandstück | Grubenlampe an Stoß oder Kappe, alle ~6 m |
| vmhdagb | Flache Geröllfläche (Schutt-Patch, Mesh) | 1,97 × 1,83 × 0,16 | 999.999 | Bodenplatte | Schutt auf der Sohle, Fugen zwischen Modulen verdecken |
| wcbpdfsdw | Stollensegment Türstock mit Rundholzverzug, schmal (innen ~2,45 m) | 3,05 × 3,21 × 2,37 | 3.997.587 | Wandstück | Grundmodul Gang: L 3,0 m, außen 3,17 m breit ≈ Raster; Höhe nur 2,36 m |
| wcbpdgcdw | Stollensegment Türstock mit Rundholzverzug, breit (innen ~3,0 m) | 2,82 × 3,80 × 2,36 | 3.998.453 | Wandstück | Breites Gangmodul, Kammer; L 2,8 m, außen 3,7 m – breiter als Raster |
| wcckeezdw | Kombination aus wcbpdgcdw + wcbpdfsdw (2 Objekte), Übergang breit→schmal | 5,65 × 3,80 × 2,37 | 7.996.040 | Wandstück | Übergangsmodul breit/schmal, Länge 5,65 m |
| wcskfaidw | Gleisbett mit Kohleschutt und Schienen (3 Varianten übereinander) | 2,50 × 1,50 × 0,32 | 5.997.543 | Bodenplatte | Gleisboden-Modul 2,5 × 1,5 m; Spur nicht gemessen |
| wd3efb0 | Gesteins-/Erzbrocken, 9 cm | 0,09 × 0,09 × 0,07 | 500.000 | Kleinteil | Streudeko, aufsammelbares Erz |
| wdpncgrdw | Stahlbogen-Ausbau mit Bretterverzug | 4,90 × 5,95 × 3,69 | 3.998.181 | Wandstück | Großer Gang/Hauptstrecke; Spannweite ~5,9 m, Höhe 3,69 m – zu groß fürs Raster |
| wdpnchedw | Stahlbogen-Ausbau, Bretterverzug mit Gesteinsbrocken | 3,52 × 5,95 × 3,77 | 3.998.163 | Wandstück | Wie wdpncgrdw, beschädigt/ausgebrochen |
| wdpnchtdw | Stahlbogen-Ausbau, Steinschüttung hinter Verzug | 4,55 × 5,88 × 3,62 | 2.000.000 | Wandstück | Wie wdpncgrdw, mit Gesteinshinterfüllung |
| wdpncihdw | Stahlbogen-Ausbau mit Rundholzverzug und Fußschwellen | 4,47 × 5,96 × 3,65 | 999.999 | Wandstück | Wie wdpncgrdw, Holz-Variante |
| wjfidjgdb | Flache Kohlegrus-Fläche (Mesh-Patch) | 2,77 × 2,35 × 0,06 | 2.000.000 | Bodenplatte | Kohlehaufen/-teppich auf der Sohle, Ladestelle |
