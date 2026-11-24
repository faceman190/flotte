# Bergbaurover „Dachs“ R-4

Stand: 24.11.2026. Ersetzt den alten Rover aus den Anfängen (Kisten aus three.js-Grundkörpern, fuhr wie auf Schienen).
Wunsch des Nutzers: „Der Rover. Der ist noch von Anfang an und nicht schön. Das Modell und Fahrverhalten.“

## Modell

- Eigener Entwurf in Blender, Skript statt Handarbeit: `asset-src/neu/rover/rv_bau.py` (wird mit `-f` einzeln eingecheckt, der Ordner ist ignoriert).
  - Sechs Räder (Radius 0,75 m, Breite 0,56 m, halbe Spur 1,6 m, Achsen bei +2,05 / 0 / −2,05 m), Schwingen, Dämpfer, Federn.
  - Fahrerhaus mit schrägen Scheiben, Tür, Trittstufen, Lichtleiste und Rundumleuchte auf dem Dach, Antennen.
  - Erzmulde mit Erzbrocken hinten, Bohrarm mit Schneckenbohrer vorn (Spitze bei y 4,45 m).
  - Lack ockergelb mit Plattenfugen, Abnutzung und Schlieren (Werkzeug, kein Spielzeug), dazu Warnstreifen und Beschriftung „R-4 DACHS“.
- `rv_lauf.py` baut `Rover.blend` und rendert Ansichten: `blender.exe -b --python rv_lauf.py -- alle` (schraeg, heck, seite, front, rad → `rv-<ansicht>.jpg`).
- `rv_export.py` (abgeleitet von `../sektor3/s3_export.py`) schreibt `asset-src/glb/deco/Rover.glb`: Ecken­farben je Materialgruppe wie bei den Bojen,
  Netze heißen `<Teil>__<Gruppe>` mit den Teilen Aufbau, Rad_VL … Rad_HR, Bohrer. Rund 56 000 Dreiecke, keine Fernstufe (der Rover ist nur nah zu sehen).
  `rv-anker.json` hält die Lage der Leuchten.
- Danach `npm run assets`: Der Rover landet im Hintergrund-Paket „world“ als `deco/Rover`.

## Im Spiel (`src/models/rover.ts`, `src/game/surface.ts`)

- `buildRover()` stößt das Laden an und nimmt das neue Modell, sobald es da ist; bis dahin fährt das alte (es wird beim nächsten Bild getauscht).
- Jedes Rad bekommt einen Drehpunkt in der Nabe: federt einzeln bis zum Boden unter ihm (−0,32 … +0,26 m), die Vorderräder lenken, alle drehen mit dem Tempo.
- Der Bohrer dreht um seine Längsachse; Leuchtpunkte für Lichtleiste, Scheinwerfer, Rückleuchten und Rundumleuchte.

## Fahrverhalten

| Größe | Wert |
|---|---|
| Höchsttempo | 24 m/s (86 km/h), mit Umschalt 33 m/s |
| Beschleunigung | 0 → 18 m/s in 3 s, lässt mit dem Tempo nach |
| Bremsen | 15 m/s² |
| Rollen ohne Gas | sanft (22,6 → 15,3 m/s in 2 s) |
| Seitenführung | 7,5 (auf Eis 3,5: der Rover rutscht und driftet) |
| Lenkung | Einschlag sinkt mit dem Tempo, Drehrate durch die Querbeschleunigung begrenzt |

- Schwung bleibt erhalten: Das Tempo ist ein Vektor, die Räder ziehen ihn nur langsam in Fahrtrichtung (daher Drift in schnellen Kurven).
- Hänge: Hangabtrieb aus der Bodenebene der sechs Räder, im Stand hält die Feststellbremse.
- Lage: Neigung und Rollen aus derselben Bodenebene, weich gefedert, dazu Einnicken beim Bremsen/Gasgeben und Neigen in der Kurve.
- Sprünge: Fällt der Boden an einer Kuppe schneller weg, als die Federung folgen kann (über 14 m/s, Boden sinkt schneller als 5 m/s), hebt der Rover ab.
  In der Luft zieht die Schwerkraft stärker (kurze Sprünge statt Segeln), ab 3 m Höhe noch einmal mehr. Landung mit Federschlag, Ton und Staub.
- Zusammenstöße mit Felsen und Gebäuden federn ab, Flüssigkeiten und Kartenrand halten auf. Staub hinter den Rädern, mehr beim Rutschen.

## Messungen (Entwicklungsserver, Eisgarten)

- Räder in über 98 % der Bilder höchstens 15 cm über dem Boden.
- 48 s Vollgas mit Umschalt und Schlangenlinien über Hügel: 13 Sprünge, 16 % der Zeit in der Luft, höchstens 6,6 m hoch.
- Höhe des Bodens: `heightAt` folgt seit 2026-11-24 den Dreiecken des Geländenetzes (vorher bilinear, bis 3,95 m daneben; daher das Einsinken zu Fuß
  und die schiefe Lage des Rovers).

## Offen

- Fahrgefühl nur gemessen und auf Standbildern geprüft; der Nutzer hat noch nicht selbst gefahren.
- Stellschrauben bei Bedarf: Absprungschwelle (`vyG < R.vy - GR * dt * 4 && vyG < -5 && |vF| > 14`), Luftschwerkraft, Seitenführung auf Eis.
