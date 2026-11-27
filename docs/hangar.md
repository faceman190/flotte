# Hangar der Bastion

Der Hangar ist die Hangarbucht des Piloten (`docs/hangarbuchten.md`): 184 × 162 × 42 m, Tor 124 × 32 m, drei Stellplätze. Gebaut in Blender
aus dem Bastion-Baukasten, im Spiel als Lichtraum 2 (`docs/lichtraum2.md`): Das Material rechnet das Spiel, gebacken ist nur das Licht.

| Runde | Stand | Dateien |
|---|---|---|
| 1 (Alpha 1.21, Lichtraum 2 seit 1.33) | Halle, Wände, Dach, Tor, Stellplätze, Container, Fahrzeuge | `bk_hangar.py`, `bk_halle.py` |
| 2 (27.11.2026) | mehr Detail und bessere Lichtqualität, siehe unten | `bk_hangar2.py`, `hg_lauf.py`, `lm2_hangar_lauf.py`, `lm2_raum.py` |

Alle Dateien liegen in `asset-src/neu/bastion/`.

## Zweite Runde (27.11.2026)

Freigegeben in Alpha 1.68 (27.11.2026), zusammen mit den zwei Ebenen (`docs/deck3.md`). Vor der Freigabe in der gebauten Fassung gestartet
(„Weiterspielen“ mit einem Spielstand zu Fuß im Hangar): Menü, Laden, neuer Hangar, keine Fehler.

Der Nutzer nach dem neuen Deck 3: „Das Deck ist gut geworden. Hangar auch nochmal überarbeiten mit mehr Details und dann mit möglichst guter
Qualität ins Spiel, MB spielen keine Rolle, dürfen 50-100 sein“.

Vergleich im Spiel (links Alpha 1.67, rechts die zweite Runde, dieselbe Kamera im Testfenster): `docs/bilder/hangar2-vorher-nachher.jpg`
(Blick vom Ausgang zum Tor), `docs/bilder/hangar2-stellplatz.jpg` (Gerät am mittleren Stellplatz), `docs/bilder/hangar2-wand.jpg` (Längswand).

### Was dazugekommen ist (`bk_hangar2.py`)

Die erste Runde bleibt unverändert stehen; `bk_hangar2.py` läuft danach im selben Namensraum und setzt eigene Bausteine an dieselben Stellen.

- **Wand** (`h2_joch`, je Joch): Fassade hinter der Galerie (Türen mit Leuchtfenster, Felder, Lüftung, Schaltschränke), Wandfluter auf dem
  Gesims der Galerie (strahlen die großen Wandfelder von unten warm an), Lageanzeigen (`tafel`: dunkle Scheibe mit Meldelampen und
  Leuchtbalken), Steigtrasse mit Verteilerkasten, Rohrstrang unter der Kranbahn, Rost- und Staubspuren.
- **Spant** (`h2_spant`): zwei Strahler in 34 m Höhe, Leitungsrohr.
- **Rückwand** (`h2_mitte`): Leuchtschild AUFZÜGE · DECK 3 · QUARTIERE über dem Ausgang.
- **Dach** (`h2_dach`): zwei Laufstege zwischen den Stellplätzen, Oberlicht auf den Hallenleuchten (erst damit sind Pfetten, Kanäle und
  Binder zu sehen), Sprinkler, Kabelbahnen. Nichts hängt tiefer als 34 m: Die Laufkatzen hat der Nutzer am 18.11. entfernen lassen, weil
  sie über großen Schiffen störten.
- **Tor** (`h2_tor`): Feldprojektoren am Rahmen, Antriebe auf dem Sturz, Anzeigen, Leitfeuer und Haltelinie im Boden, Verriegelungen.
- **Boden** (`h2_boden`, `h2_platz`): Fahrweg hinter den Stellplätzen, Zebrastreifen vom Ausgang zum mittleren Platz, Entfernungsmarken,
  Feuer um den Aufsetzkreis, Brandspuren unter den Schiffen, Reifenspuren, Flecken.
- **Gerät**: Lichtmast, Bodenstromaggregat, Scherenbühne, Werkzeugschrank, Löschkarre, Gabelstapler, Ersatztriebwerk auf Gestell,
  Schwenkkran, Frachtstapel, Platzpylon mit Nummer, Kegel. Gesetzt in `detail()`.
- Geändert in der ersten Runde: Hallenboden um ein Drittel heller, Zurrpunkte dunkel statt blank (sie glitzerten), Platzlichter 10 cm hoch
  statt flach, Schlepper und zwei Kleinteile aus dem Weg des Läufers gerückt.

### Was frei bleiben muss

Blender-Lage: x wie im Spiel, y = −z des Spiels. `node scripts/hangarwege.cjs` prüft die Standflächen dagegen.

| Bereich | Grund |
|---|---|
| Stellplätze bis y = 15 | Der Wisent ist 83 × 66 m und reicht auf dem mittleren Platz bis y = 13,5 |
| x −30 … 30, y 24,5 … 41 | Weg vom Schiff zum Ausgang, Treffpunkt der Geschichte (`hangarSpot`) |
| y 26,6 … 35,4 hinter den Plätzen | Runde des Läufers (`interior.ts`, `mz`) |
| x ±85,6 an den Längswänden | Läufer zwischen Tor und Rückwand |
| (−22, 41) und (58, 41,5) | Gesprächsgruppen |

Gerät an den Stellplätzen steht deshalb nur in den hinteren Ecken (y 15 … 23), höchstens 9,4 m hoch.

### Bessere Lichtqualität (`lm2_raum.py`, `lm2_hangar.json`)

Gemessen vor der Runde: 7 bis 14 Bildpunkte je Meter in der Halle, 2 im Dach, die Lichtkarten nur zu 38 bis 76 % belegt.

- **`verdeckt`**: Große Flächen, die niemand sieht, kommen nicht mehr in die Lichtkarte (Rückseiten der Wandplatten, die Wand dahinter, der
  Grund unter den Bodenplatten, Außenseiten). Probe je Fläche an der Mitte und auf 80 % des Wegs zu jeder Ecke entlang der Normale; `innen`
  nennt die Kästen des Innenraums (Halle und Tordurchfahrt). Das war etwa die Hälfte der Fläche.
- **`teilen`** (3 m): Lange Flächen werden an einem Raster zerschnitten. Vorher zwang eine 184 m lange Dachplatte die ganze Abwicklung klein,
  und schmale Streifen hatten nur vier Lichtwerte auf ihrer ganzen Länge.
- **`schmal`** (Halle 0,3 m, Dach 0,8 m, Kleinteile 0): Schmale Streifen (Rohre, Leisten, Pfetten) bekommen Eckpunkt-Licht statt Lichtkarte.
- **Größen**: Halle 3072, die drei Teile an der Rückwand 4096, Dach 2048, Kleinteile 1024; 256 Abtastungen. Das Spiel lädt Karten über 2048
  ohne Verkleinerungsstufen (`deck.ts loadLicht2Set`).
- **`spuren`**: Laufspuren, Rost und Flecken gehen jetzt wie im Deck als eigene Netze ins Spiel. Vorher fehlten sie im Hangar ganz.
- **`fern`**: Größe kleiner Leuchten je Material (Platzlicht 0,26 m). Das Spiel blendet sie aus, wenn sie kleiner als ein Bildpunkt werden
  (`deck.ts`, Shader `l2glow`): Die Feuer im Boden blitzten sonst beim Gehen als Glitzerpunkte auf.

### Gemessen (endgültiger Lauf, 27.11.2026)

| | vorher (Alpha 1.67) | zweite Runde |
|---|---|---|
| Lichtkarte Halle | 7 bis 14 Bildpunkte je Meter | 22 bis 43 |
| Lichtkarte Dach | 2 | 11 |
| Lichtkarte Kleinteile | 35 bis 57 | 38 bis 89 |
| Lichtkarte belegt | 38 bis 76 % | 76 bis 92 % (ein Teil 46 %) |
| Dreiecke gesamt | 3,9 Mio. | 4,7 Mio. |
| Dreiecke je Bild (vier feste Blicke) | 1,0 bis 2,8 Mio. | 1,6 bis 3,5 Mio. |
| Modell gepackt | 53,2 MB | 75,6 MB |
| Lichtkarten gepackt | 4,9 MB | 9,7 MB |
| Backlauf | rund 15 Minuten | 43 Minuten |

- Bildzeit im Testfenster (versteckter Tab, 1024 × 768, `render` plus `finish`): vorher 10 bis 17 ms, jetzt 10 bis 13 ms. Ein Unterschied
  ist dort nicht messbar; im sichtbaren Fenster des Nutzers und auf einem schwachen Rechner ist es nicht gemessen.
- Grafikspeicher der Lichtkarten (gerechnet, nicht gemessen): etwa 460 MB statt 230 MB.
- Gebaute Fassung im versteckten Tab: Die Navigation dorthin wurde abgelehnt. Es ging mit einem Rahmen im schon offenen Tab, in den die
  Seite samt Ersatz für `requestAnimationFrame` geschrieben wird (`document.write`); ein Bild kommt mit `toDataURL` direkt nach dem Bildaufruf.
- Story-Bot durch Prolog und fünf Kapitel ohne erzwungene Schritte und ohne Fehler; Laufprobe beider Ebenen (`__walkRund`) ohne
  unerreichbare Punkte; der Wisent steht auf dem mittleren Platz frei neben dem Gerät.

### Offen

- In der Ferne funkeln am Boden weiter einzelne helle Punkte (kleine Teile mit Eckpunkt-Licht, erhabene Platzlichter). Weniger als vorher,
  aber nicht weg.
- Am Durchgang zum Deck steht im Deckmodell noch „DECK 3 · TREFFPUNKT“ (`rh_kit.py b_hangartor`). Im Spiel liegt ein Schild
  „HANGARZUGANG · AUFZÜGE“ davor (`interior.ts`); beim nächsten Backen von Deck 3 den Text im Modell ändern und das Schild im Spiel entfernen.
- Eisenkrone und Pumpwerk haben weiter den alten Hangar.

### Standflächen

`lm2_hangar_lauf.py` schreibt `asset-src/data/hangar_bastion2.json`: je gesetztem Baustein der Umriss seiner Teile zwischen 0,2 und 1,9 m
Höhe (Bausteine mit den Namen „Wand …“, „Objekt …“, „Halle …“, „H Spant“, „H Eckturm“). `deck.ts buildHangar` nimmt diese Liste; ohne die
Datei gelten wie bisher die Standflächen aus `hangar_bastion.json`. Ein neues Gerät braucht also nur `put(...)` in `detail()`.

### Ablauf

```
blender.exe -b --python hg_lauf.py -- ankunft geraet wand --pct=60 --samples=64     Vorschau (Fassung fürs Spiel, ohne Dunst), 11 s je Bild
blender.exe -b --python lm2_hangar_lauf.py -- lm2_hangar_schnell.json               Probe-Backlauf (1024/512, 24 Abtastungen), 13 Minuten
blender.exe -b --python lm2_hangar_lauf.py -- lm2_hangar.json                       endgültig
npm run assets
node scripts/hangarwege.cjs
```

Vor `npm run assets` die Lichtkarten des vorigen Laufs mit anderer Größe löschen (`asset-src/tex-world/l2_hangar_*_lit@<größe>.png`): Zwei
Dateien mit demselben Namen und verschiedener Größe ergeben denselben Schlüssel.

Im Testfenster: `scripts/hangaransichten.js` (`__hvinit()`, `hview(name, tag)`) nimmt dieselben Ansichten wie die Blender-Kameras auf.

### Lehren

- Erst der Probe-Backlauf, dann der lange: Er zeigt nach 13 Minuten, ob Bausteine, Teile, Standflächen und Spuren im Spiel ankommen.
- Das Testfenster muss warten, bis der Hangar der neuen Art geladen ist (`hangar2Ready`) und die Blende zu Ende ist. Vorher zeigt es den alten
  Hangar oder einen Boden ohne Spiegelung.
- Mehr Spiegelung am Boden (Faktor 1 statt 0,5) färbt ihn bräunlich: Die warmen Wandfluter und die Torlichter spiegeln sich.
- Flache, kleine, helle Dinge am Boden (Leuchten, gelbe Ringe, blanker Stahl) glitzern aus Augenhöhe ab etwa 30 m. Dunkel machen, erhaben
  bauen oder über `fern` ausblenden.
