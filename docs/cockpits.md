# Cockpits und Cockpit-Sicht im Flug

Taste K schaltet im Flug zwischen Verfolgersicht und Cockpit (bleibt gespeichert). V mit der Maus dreht den Kopf. Radar und Schiffsanzeige des HUD sind in der Cockpit-Sicht aus, sie stehen auf den Anzeigen.

| Schiff | Stil | Datei | Bauskript |
|---|---|---|---|
| Milan | 1 | `MilanCockpit.glb` | `asset-src/neu/milan/mil_cockpit.py` (siehe `docs/milan.md`) |
| Dohle | 2 | `DohleCockpit.glb` | `asset-src/neu/cockpit/cp_dohle.py` |
| Kormoran | 2 | `KormoranCockpit.glb` | `asset-src/neu/cockpit/cp_kormoran.py` |
| Kranich | 2 | `KranichCockpit.glb` (Teile stecken auch im Schiffsmodell) | `asset-src/neu/kranich/kra_cockpit.py`, siehe `docs/kranich.md` |
| Möwe | 2 | `MoeweCockpit.glb` (Teile stecken auch im Schiffsmodell) | `asset-src/neu/moewe/moe_cockpit.py`, siehe `docs/moewe.md` |
| Harpyie | 2 | `HarpyieCockpit.glb` (Teile stecken auch im Schiffsmodell) | `asset-src/neu/harpyie/har_cockpit.py`, siehe `docs/harpyie.md` |

## Stil 2

Wunsch des Nutzers (26.11.2026, zwei Vorbilder aus Star Citizen): Cockpits für Dohle und Kormoran auf diesem Niveau. Übernommen ist der Stil, nicht der Entwurf:

- fast schwarze, seidenmatte Formteile mit Fasen statt heller Blechtafeln
- Anzeigen in dicken Gehäusen mit Haube, blau-weißes Bild; die Anzeigen sind die wichtigste Lichtquelle
- zwei Steuerknüppel auf Seitenkonsolen, die Hände des Piloten liegen darauf
- Sitz mit Wabenstoff, Trittroste mit Lochung, warme Lichtleisten am Boden, kalte an den Konsolen
- Warnmarken, kleine Beschriftungen, Kabel
- Sonne wirft scharfe Schatten der Fensterrahmen in die Kabine

## Baukasten (`asset-src/neu/cockpit/`)

- `cp_lib.py`: Materialien (`stil_materialien`), Grundkörper als bmesh (`quader`, `prisma`, `keil`, `zyl`, `rohr`, `flaeche`, `schrift`), Rahmen (`Platz`), Rumpf laden (`rumpf_laden`, `rumpf_teile`), Kamera und Bild.
- `cp_teile.py`: Bauteile. `anzeige`, `tastenfeld`, `knueppel`, `schubhebel`, `sitz`, `armkonsole`, `pultmodul`, `platten`, `lichtleiste`, `lueftung`, `griffleiste`, `kabel`, `pedale`, `warnkreis`, `warndreieck`, `schild`.
- `cp_dohle.py`, `cp_kormoran.py`: je ein Cockpit. Aufruf mit Bildern: `blender -b --python cp_dohle.py -- bild:vorn bild:rechts`.
- `cp_export.py`: Export fürs Spiel mit gebackenem Licht.
- Messhilfen: `cp_mess.py` (Materialien und Strahlen vom Augpunkt), `cp_zone.py` (Materialien in einer Zone), `cp_glas.py` (Form der Verglasung), `cp_blick.py` (Blick vom Sitz durch den alten Rumpf).

Regeln:

- Gebaut wird in Schiffskoordinaten wie im Spiel: Blender X rechts, Y zur Nase, Z oben, Ursprung = Mitte des Schiffsmodells. `rumpf_laden` legt das Spiel-GLB des Schiffs genau so hin.
- Bauteile liegen in einem Rahmen (`with Platz(ort, rx, ry, rz)`), meist am Augpunkt des Piloten. Der Pilot schaut nach +Y, Flächen zum Piloten zeigen nach −Y.
- Fensterrahmen und Glas werden aus dem Rumpf kopiert (`rumpf_teile`), damit innen und außen zusammenpassen. Die Außenhaut um die Kabine kommt als „Rumpf innen“ dazu: Sie schließt Lücken und wirft den Sonnenschatten.
- Materialnamen sind die Schnittstelle zum Spiel („CP Stoff“, „CP Bodenrost“, „CP Schirm Lage“ …).
- Anzeigen heißen nach ihrem Inhalt: Lage, Systeme, Ziel, Antrieb, Fracht, Band, Energie, Funk, Funk2, Karte, Schiff, Holo (Sichtgerät, additiv).

## Export (`cp_export.py`)

```bash
cd asset-src/neu/cockpit
blender -b --python cp_dohle.py
blender -b CockpitDohle.blend --python cp_export.py -- Dohle
cd ../../.. && npm run assets
```

- Alles wird ein Netz aus Dreiecken, lange Kanten werden bis 9 cm geteilt, damit die Eckfarben Licht tragen.
- Bewegliche Steuerknüppel: Flächen, die in `with Marke(1)` (links) oder `Marke(2)` (rechts) entstehen, kennzeichnet der Export in G (0,3/0,4 und 0,6/0,7).
- Eckfarben sind Daten: R Verdeckung, G Kantenstreifen (Fasen), B kaltes Licht der Anzeigen und Lichtleisten, A warmes Licht der Bodenleuchten. Licht ist als Wurzel gespeichert.
- Dohle: 171.000 Dreiecke (4,0 MB im Spiel), Kormoran: 286.000 (6,6 MB, Kantenlänge 14 cm). Außenhaut und Streben werden nicht geteilt. Alles in einem Schritt: `sh asset-src/neu/cockpit/cp_spiel.sh`. Die Ausgabe `cp-<schiff>-export.txt` nennt Dreiecke und die Verteilung des gebackenen Lichts.

## Im Spiel

- `src/game/cockpit.ts`: Tabelle `COCKPITS` (Datei, Augpunkt, Stil, Griffpunkte, Materialien des Schiffsmodells, die in der Cockpit-Sicht verschwinden), Anzeigen als Zeichenflächen, Kamera.
- `src/game/cockpitStil2.ts`: Shader für Stil 2 und die Schattenkarte.
  - Eigene Schattenkarte nur fürs Cockpit (2048², Tiefenbild aus Sonnenrichtung). Sie wird nur neu gezeichnet, wenn sich die Sonne gegenüber dem Schiff bewegt hat, und hängt nicht an den Lampen von three.
  - Muster aus der Lage im Cockpit: Waben (Stoff), Lochung (Bodenrost), Narbung (Gummi), Körnung (Formteile).
- `src/game/fahrer.ts`: Der Pilot ist dieselbe Sitzfigur wie der Fahrer im Wiesel, mit eigener Tracht. Becken unter dem Auge, Hände per Zwei-Knochen-IK an den Griffpunkten, Finger gekrümmt, Kopf ausgeblendet. Stellwerte `PILOT_TUNE` in `cockpit.ts`.
- Steuerknüppel: `knueppel()` in `cockpit.ts` rechnet je Bild die Neigung (rechts aus Nick- und Gierrate, links aus Schub und A/D). Der Vertex-Shader dreht die gekennzeichneten Flächen um den Fußpunkt, `pilotArme` führt die Hände per IK nach.
- Die Figur des Piloten bekommt eigene Materialien (`pilotMaterial`): Sonne nur, wo die Schattenkarte es erlaubt, gedämpftes Umgebungslicht, etwas kaltes Licht der Anzeigen.
- Anzeigen im Stil 2 werden in 250 Einheiten Höhe gezeichnet (Beschriftung 18, Werte 26 bis 72), damit man sie aus dem Sitz lesen kann.
- HUD: `body.cockpit` (style.css) räumt Andock-Hinweis, Gesprächsfenster und Tastenhilfe nach oben, die Tempozeile entfällt.
- Stellwerte `CP_TUNE`: `fill2` (Grundlicht), `kalt`, `warm` (gebackenes Licht), `blick` (fester Blick für Prüfbilder).

## Neues Cockpit für ein weiteres Schiff

1. Mit `cp_mess.py`, `cp_zone.py` und `cp_glas.py` Augpunkt, Verglasung und Rahmenmaterial des Rumpfs bestimmen.
2. `cp_<schiff>.py` nach dem Muster der Dohle schreiben, Bilder ansehen.
3. Exportieren, `npm run assets`.
4. Eintrag in `COCKPITS`: Augpunkt und Griffpunkte stehen in `cp-<schiff>.json`.

## Gelernt

- Ein Körper hinter gedrehten Anzeigen ragt an deren Außenecke hervor, wenn er nicht weit genug hinten liegt (kleine Rauten vor dem Glas).
- Die Mittelstrebe der Dohle stand genau vor dem Fadenkreuz. Im Cockpit fehlt sie im Blickfeld nach vorn, über Kopf bleibt sie.
- Ohne geschlossene Hülle schien die Sonne durch die Wand. Die kopierte Außenhaut löst das.
- Abrieb an allen Fasen wirkte kalkig. Im Stil 2 leben die Kanten vom Licht, Abrieb ist fast aus.
- Prüfbilder: Der Testaufbau (`T.stub`) zeichnet nicht, die Schattenkarte bleibt dann leer. Für Bilder die Karte von Hand zeichnen (`SCHATTEN_PRUEF` in `cockpitStil2.ts`).
- Das Teilen aller langen Kanten machte aus der Brücke der Kormoran 900.000 Dreiecke. Abhilfe: Außenhaut nicht teilen, Grundplatte als „Rumpf innen“, gröbere Kante.
- JavaScript: `String.replace` deutet `$'` im Ersatztext als „Rest nach dem Treffer“. Ersatztexte mit `$` über `split/join` einsetzen.

## Offen

- Milan auf Stil 2 heben.
- Cockpits für Wisent, Würger, Elster, Pfeil.
- Schubhebel der Kormoran-Mittelkonsole und die Knüppel des Kopiloten bewegen sich nicht.
- Der Schatten der Steuerknüppel wandert nicht mit (Schattenkarte zeichnet sie in Ruhelage).
