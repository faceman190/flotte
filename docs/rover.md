# Bodenfahrzeuge: Bergbaurover „Dachs“ R-4 und Erkundungsbuggy „Wiesel“ E-2

Stand: 24.11.2026. Der Dachs ersetzt den alten Rover aus den Anfängen (Kisten aus three.js-Grundkörpern, fuhr wie auf Schienen).
Wünsche des Nutzers: „Der Rover. Der ist noch von Anfang an und nicht schön. Das Modell und Fahrverhalten.“ Danach: „Es soll auch einen
Erkundungsrover geben. Wie ein Buggy. Erstell den noch. Gib dir Mühe.“

## Die beiden Fahrzeuge

| | Dachs (Bergbau) | Wiesel (Erkundung) |
|---|---|---|
| Wer hat ihn | Leihrover an jeder Planetenbasis, eigener in der Werft 6.500 Cr (fährt in Pfeil und Wisent mit) | Werft, 9.500 Cr (fährt in Kormoran, Pfeil, Wisent mit) |
| Räder | 6, Radius 0,75 m, Spur 3,2 m | 4, Radius 0,52 m, Spur 2,04 m, Radstand 2,8 m |
| Höchsttempo | 86 km/h, mit Umschalt 119 km/h | 119 km/h, mit Umschalt 158 km/h |
| Anzug | 0 → 65 km/h in 3 s | 0 → 93 km/h in 3 s |
| Seitenführung | 7,5 (Eis 3,5) | 9 (Eis 4,2) |
| Sprünge | selten, nur mit Umschalt | häufig, kurz (0,3–0,9 s, meist 1–4 m) |
| Werkzeug | Schneckenbohrer, Erzmulde 40 E | Sensormast: [R] tastet 1,6 km ab, kein Bohrer |
| Fahrer sichtbar | nein (geschlossene Kabine) | ja (offener Käfig) |

Alle Fahrwerte stehen in `src/models/rover.ts` (`FZ`), `updateRover` in `src/game/surface.ts` liest sie.

## Modelle (Blender, `asset-src/neu/rover`, Ordner ignoriert: Dateien einzeln mit `-f` einchecken)

- Dachs: `rv_bau.py` → `Rover.blend` (`rv_lauf.py`), Renderbilder `rv-<ansicht>.jpg`, Leuchten in `rv-anker.json`.
  Druckkabine, sechs Räder an Schwingen mit Federbeinen, Erzmulde, Bohrarm mit Schneckenbohrer, ockergelber, abgenutzter Lack.
- Wiesel: `bg_bau.py` → `Wiesel.blend` (`bg_lauf.py -- alle`: schraeg, heck, seite, front, rad, cockpit → `bg-<ansicht>.jpg`), `bg-anker.json`.
  Offener Rohrrahmen mit Überrollkäfig (gebogene Rohre), Keilhaube, zwei Schalensitze mit Gurten, Lenkrad und Bordschirm,
  Doppelquerlenker mit Federbeinen und Ausgleichsbehältern, Ballonreifen mit Stollen und Beadlock-Felgen, schmale Kunststoffkotflügel,
  Akku-/Motorkasten mit Kühlrippen, Ersatzrad am Heck, Kanister, Probenkisten, Schaufel, Peitschenantenne mit Wimpel, Lichtleiste,
  Sensormast mit Lidar, Kamera und drehender Radarleiste. Petrolgrauer Lack, Beschriftung „E-2 WIESEL / ERKUNDUNG“ auf den Seitenkästen.
- Export für beide: `blender.exe -b <Name>.blend --python rv_export.py` → `asset-src/glb/deco/Rover.glb` bzw. `Wiesel.glb`
  (Eckenfarben je Materialgruppe wie bei den Bojen; Netze `<Teil>__<Gruppe>` mit den Teilen Aufbau, Rad_VL … Rad_HR, Bohrer bzw. Sensor;
  Dachs rund 56 000, Wiesel rund 59 000 Dreiecke; keine Fernstufe). Danach `npm run assets` (Hintergrund-Paket „world“, `deco/Rover`, `deco/Wiesel`).

## Im Spiel

- `buildFahrzeug(kind)` (models/rover.ts) baut das Fahrzeug aus der geladenen Vorlage: jedes Rad mit eigenem Drehpunkt in der Nabe
  (federt einzeln bis zum Boden, Vorderräder lenken), Bohrer dreht um seine Achse, Sensor um die Senkrechte, Leuchtpunkte je Fahrzeug.
  Solange das Modell lädt, steht der alte Rover aus Grundformen da; `updateRover` fordert das Modell an und tauscht, sobald es geladen ist.
- Welches Fahrzeug beim Landen ausgesetzt wird: `P.fahrzeug` ('dachs' | 'wiesel'), gekaufte stehen in `P.fahrzeuge`.
- Werft (`src/ui/dock.ts`): Liste „Bodenfahrzeuge“ unter den Schiffen, drehende Ansicht (`showModel` in `ui/shipPreview.ts`), Werte im Vergleich,
  Kaufen bzw. „Beim Landen aussetzen“.
- Am gelandeten Schiff (im Fahrzeug oder zu Fuß daneben): [X] nimmt das andere Fahrzeug (`fahrzeugTauschen`). Der Dachs lädt vorher sein Erz ins Schiff.
- Sensormast (`src/game/wiesel.ts`): [R] im Wiesel tastet 1,6 km ab (Ring über das Gelände, Radarleiste dreht schneller), zeigt 90 s lang
  Lagerstätten (Erz, Gehalt, Menge), ungeöffnete Kisten und Tresorkisten, Wracks und Stolleneingänge mit Entfernung, auch hinter Hügeln.
  Marken, deren Schrift sich überdecken würde, zeigen nur das Dreieck (die nächsten Funde zuerst). Danach lädt der Mast 12 s.
- Fahrer (`src/game/fahrer.ts`): Im Wiesel sitzt eine Kopie der eigenen Spielfigur mit der eigenen Tracht. Der Bewegungssatz hat keine
  Sitzhaltung; sie entsteht beim Einsetzen: Becken auf den Sitz, Oberkörper an die Lehne, Beine und Arme mit Zwei-Knochen-IK zu Pedalen
  und Lenkradkranz. Zu Fuß (`updateFoot`) wird er ausgeblendet.

## Fahrverhalten (beide)

- Schwung bleibt erhalten: Das Tempo ist ein Vektor, die Räder ziehen ihn nur langsam in Fahrtrichtung (Drift in schnellen Kurven, auf Eis mehr).
- Lenkung: Einschlag sinkt mit dem Tempo, Drehrate durch die größte Querbeschleunigung begrenzt.
- Hänge: Hangabtrieb aus der Bodenebene unter den Rädern, im Stand hält die Feststellbremse.
- Lage: Neigung und Rollen aus derselben Bodenebene, weich gefedert, dazu Einnicken beim Bremsen/Gasgeben und Neigen in der Kurve
  (der Wiesel stärker).
- Sprünge: Fällt der Boden an einer Kuppe schneller weg, als die Federung folgen kann, hebt das Fahrzeug ab. Die Federung schluckt Kanten
  zwischen den Geländedreiecken (`jump.abs`), der Schwung nach oben ist auf 5 m/s begrenzt. In der Luft zieht die Schwerkraft stärker,
  je höher über dem Boden, desto mehr (kein Segeln über Hänge). Landung mit Federschlag, Ton und Staub.
- Zusammenstöße mit Felsen, Gebäuden und Wracks federn ab, Flüssigkeiten und Kartenrand halten auf. Staub hinter den Hinterrädern.

## Messungen (Entwicklungsserver, Eisgarten, 48 s Vollgas mit Schlangenlinien über Hügel)

- Dachs ohne Umschalt: keine Sprünge, 89 km/h. Mit Umschalt: 9 Sprünge, 11 % der Zeit in der Luft (ein Abhang mit 8 m).
- Wiesel ohne Umschalt: 16 Sprünge, 20 % der Zeit in der Luft, meist 1–4 m, 117 km/h. Mit Umschalt bis 137 km/h.
- Räder in rund 98 % der Bilder höchstens 15 cm über dem Boden.
- Höhe des Bodens: `heightAt` folgt seit 2026-11-24 den Dreiecken des Geländenetzes (vorher bilinear, bis 3,95 m daneben).

## Offen

- Fahrgefühl nur gemessen und auf Standbildern geprüft; der Nutzer ist noch nicht selbst gefahren.
- Andere Spieler sehen fremde Bodenfahrzeuge nicht (wie bisher beim Rover).
- Stellschrauben: `FZ` in models/rover.ts (Tempo, Griff, `jump`), Luftschwerkraft in surface.ts.

Seit 25.11.2026 passen Fahrzeuge zu den Schiffen: siehe docs/konzept-schiffe-fracht.md (Stand der Umsetzung) und `src/game/fahrzeuge.ts`.
