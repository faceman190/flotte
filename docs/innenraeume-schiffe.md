# Innenräume der Schiffe: Details und Oberflächen (25.11.2026)

Wunsch des Nutzers: „die Innenräume der Kormoran und Wisent auf unser jetziges Niveau bringen, sind viel zu einfach, keine Details an
Wänden und Boden.“ Dazu die Normkisten mit mehr Detail (`asset-src/neu/rover/fr_bau.py`, Vorschau `fr_bild.py`).

## Warum sie schlicht aussahen

Zwei Gründe:
- **Geometrie:** Wände waren glatte 1,2-m-Felder, Böden eine einzige Platte, Decken leer.
- **Material:** Der Schiffsexport macht aus jedem Blender-Material eine Einheitsfarbe, das Rechenmuster aus `mk()` geht dabei verloren.
  Es fehlten Flecken, Laufspuren, Korn und Noppen. In Blender sah es deshalb besser aus als im Spiel.

## Geometrie: `asset-src/neu/innen/innen_detail.py`

Gemeinsamer Baukasten für beide Schiffe. Eingebunden von `kormoran/kor_innen.py` und `wisent/wis_raeume.py`.

- `Sammel`: fasst viele kleine Quader und Zylinder zu **einem** Netz zusammen, mit einem Material je Fläche und einer gemeinsamen Fase.
  So bleiben Objektzahl und Zeichenaufrufe klein.
- `platten`: Bodenplatten mit Fugen über einer dunklen Unterlage, Senkschrauben und Tonwechsel.
- `gitter`: Gitterrost über einem Schacht.
- `wandfeld`: Rahmenfeld mit Schrauben. Je nach Nummer kommen Lüftungsgitter, Wartungsklappe mit Griff oder Anschlusskasten dazu.
- `deckenraster`: Rasterleisten unter der Decke.
- `zurrschiene`: Ankerschiene mit Langlöchern, am Boden oder an der Wand.
- `schelle`: Rohrschelle mit Fuß.

### Kormoran

- Jede Wand aus `iwall` bekommt auf beiden Seiten Wandfelder.
- Gang: Gitterrost in der Mitte und Platten seitlich. Unter der Decke laufen zwei Leitungen mit Haltern.
- Kabinen und Messe: Plattenböden und Deckenraster. Der Teppich liegt jetzt auf den Platten.
- Laderaum:
  - schwere Platten 1,2 × 1,6 m, vier Ankerschienen im Boden
  - Ankerschienen an den Wänden in zwei Höhen
  - Leitungsbündel mit Schellen an jedem Spant
  - Käfigleuchten, Anschlusskästen, Feldschrift A1–A3 und B1–B3
  - zwei Kabelpritschen unter der Decke
- **Die festen Frachtattrappen sind entfernt** (Kisten, Container, Fässer). Das Spiel stellt echte Normkisten (`src/game/laderaum.ts`).
  Deshalb gibt es keine `aus`-Liste mehr, und der Boden liegt bei −1,39.

### Wisent

- Laderaum:
  - Platten 1,5 m in den Seitenbahnen. Sie folgen der Breite, die zum Heck hin abnimmt.
  - Bodenluken in der Mittelbahn, ab 8 m hinter der Rampe
  - Stoßbleche, eine Ankerschiene und Schrauben an den geraden Wandfeldern
  - zwei Leitungen entlang der Wand mit Schellen an jeder Rippe
- Mannschaftsgang: Gitterrost in der Mitte.

## Oberfläche im Spiel: `src/models/innenFlaeche.ts`

- Der Export (`kor_export.py`, `wis_export.py`) hängt Innenraum-Materialien eine Kennung an:
  - ` ~iw`: Wand und Decke
  - ` ~ib`: Boden
  - ` ~ig`: Gitterrost
  - ` ~im`: Metall
- Als Innenraum gelten Objekte in der Sammlung „Innenraeume“ (Kormoran) bzw. „Cockpit“ (Wisent, enthält Brücke, Gang und Laderaum).
- Leuchten, Glas, Schrift, Schraffur, Bildschirme und Plattenmaterialien `ext_pan_*` bekommen keine Kennung.
- `gltfShips.ts` gibt diesen Materialien beim Laden einen Shader. Es gibt einen je Art, gemeinsam für alle Materialien dieser Art.
- Was der Shader rechnet:
  - fleckige Helligkeit und Rauheit, feines Korn
  - Laufspuren an senkrechten Flächen
  - Riffelblech im 4-cm-Raster auf Böden, mit abgelaufenen Stellen
  - Löcher im Gitterrost
  - Schleifspuren auf Metall
- Das Muster liegt auf den zwei Achsen der Fläche, gemessen in Metern im Modell. Es bleibt deshalb am Schiff fest, auch wenn das Schiff
  sich dreht. Es braucht keine Abwicklung.
- Die Rauschbilder teilen sich Bastion und Schiffe: `src/core/rauschen.ts` (vorher in `deck.ts`).
- Vergleichen: `window.__innenK.value = 0` schaltet die Oberfläche aus, `1` wieder ein.

## Pipeline

1. `sh asset-src/neu/kormoran/kor_spiel.sh` und `sh asset-src/neu/wisent/wis_spiel.sh` bauen, exportieren, vereinfachen und rechnen
   die Laufkarte.
2. Danach `npm run assets`.
3. Normkisten: `FR_NAME=<Name> blender -b --python fr_lauf.py`, dann `blender -b <Name>.blend --python rv_export.py`.
