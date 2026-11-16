# Hütten-Baukasten der Eisenkrone

Entwurf vom 17.11.2026, seit Alpha 1.34 im Spiel (Hüttendeck der Eisenkrone, siehe unten). Wunsch des Nutzers: „Entwirf für die Eisenkrone einen eigenen Baukasten, mit
anderen Farbakzenten, größere Gänge.“ Bisher ist das Hüttendeck der Eisenkrone mit dem Bastion-Baukasten gebaut (`docs/eisenkrone.md`).

Bilder: `docs/bilder/huette-entwurf-ansichten.jpg` (sechs Ansichten) und `docs/bilder/huette-entwurf-bausteine.jpg` (Plan, Hüllen,
Wandfüllungen, Objekte). Einzelbilder in `asset-src/neu/huette/huette-*.jpg`.

## Was anders ist als in der Bastion

| | Bastion | Eisenkrone (Hütte) |
| --- | --- | --- |
| Zelle | 4 × 4 m | 6 × 6 m |
| Gang innen | 3,4 m breit, 2,9 m hoch, Deckenschrägen | 4,6 m breit, Wände 4,4 m, offene Decke bis 4,8 m |
| Räume | 3,4 m hoch | 6 m hoch, Träger in beiden Richtungen, Kranbahn |
| Tore | 1,5 × 2,3 m | 3,2 × 3,4 m in 1,4 m dicker Wand (Laibung), Schott verengt auf 3,4 × 3,6 m |
| Wände | glatte geschnittene Wandfelder, Sockellicht | genietete Stahltafeln, Wellblech oben, Rammschutz |
| Decke | Paneele mit Lichtleiste | Querträger, Rohrbrücke (gedämmte Leitung, Rohre, Kabelpritsche), Hängebahn, Hallenstrahler |
| Boden | Rost über einem Graben in der Mitte | Riffelblech, Kabelkanäle mit Rost an beiden Wänden, weiße Randlinie |
| Leitfarben | Schwarzgrau, Ocker, Petrolgrün-Licht | Oxidrot (Mennige) für Träger, Gildenpetrol für Tore und Schränke, Messing für Beschläge |
| Licht | kühles Weiß, Bernstein-Akzente | warmes Natriumlicht |
| Warnfarbe | Schwarz-Orange | Rot-Weiß |

Zeichen der Eisenkrone (eigener Entwurf): ein Barren als Sockel, darüber eine Krone aus drei Zacken mit Perlen.

## Wo was liegt

Ordner `asset-src/neu/huette/` (liegt im ausgenommenen Ordner `asset-src/neu`):

- `hk_kit.py`: Maße, Materialien, Bauhelfer (Doppel-T-Träger, Nietreihen, Wellblech, Rammschutz), Hüllen, Wandfüllungen, Objekte. Nutzt die
  Materialhelfer aus `../bastion/bk_lib.py` (`mk`, `stripes`; die Angaben landen wie gewohnt am Material, `lm2_raum.py` kann sie lesen).
- `hk_plan.py`: Probeplan, Zusammenbau, Übersichtsblätter, Kameras, Rendern.
- `hk_lauf.py`: ohne Fenster bauen und rendern: `blender.exe -b --python hk_lauf.py -- alle` (oder einzelne Kameras, z. B. `"A Hauptgang"`).
  Baut `HuetteKit.blend` neu, Proben mit `HK_SAMPLES=32`. Bauen dauert 2 s, alle zwölf Bilder rund 5 Minuten.

## Zellen

Wie in der Bastion bestimmt der Zustand der vier Seiten, was eine Zelle ist. Gang: `W` Wand, `O` offen, `D` Tor zum Raum (offen), `C` Tor
geschlossen (Hangar, Ofenhalle), `B` Schott. Die Zeichen 5 bis 8 schließen Innenecken mit einer Ecksäule. Raum: `W`, `O`, `X` (Wand mit Tor).
Die Wandfläche liegt in Gang und Raum bei 2,3 m von der Zellmitte, deshalb passen dieselben Wandfüllungen in beide.

## Bausteine

- Wandfüllungen (2,7 m breit, zwei je Wandseite, links und rechts vom Mittelspant): `platte`, `luke`, `welle`, `rohre` (drei Steigleitungen mit
  Schiebern und Messinghandrädern, Manometer), `schalt` (Schaltschränke), `spinde`, `loesch` (Löschposten), `gas` (Flaschengestell),
  `terminal` (Gildenterminal mit Bernsteinschirm), `werkzeug` (Werkzeugwand über Werkbank), `aushang`, `kran` (Schwenkkran), `schauloch`
  (Glutfenster zur Ofenseite), `rutsche` (Erzrutsche mit Bunker), `bank`.
- Objekte: `lore`, `tiegel`, `barren`, `saecke`, `fass`, `gaswagen`, `pult`, `kiste`, `absperrung`, `werkbank`.

## Probeplan

```
..AAA...     A Annahme (18 × 12 m)
..AAA...     W Werkstatt (12 × 12 m)
HGGGGGGP     G Gang, H Tor zum Hangar, P Tor zur Ofenhalle
.G...G..     Schott zwischen den Spalten 4 und 5 des Hauptgangs
.G.WWG..
.GGWWG..
```

25 Zellen, 26 Bausteine, 157 Instanzen; 1,58 Mio. gesetzte und 0,95 Mio. einmalige Dreiecke.

## Im Spiel (Alpha 1.34)

Das Hüttendeck der Eisenkrone ist aus diesem Baukasten gebaut (Plan und Ablauf in `docs/eisenkrone.md`).

- `hk_deck_ek.py`: Deckplan (57 Zellen), Seitenzustände (Leitstand-Nordwand `F` = Fensterwand), Füllungen je Raum, Einrichtung, Personal,
  Wege; schreibt die Spieldaten. Neue Bausteine dafür in `hk_kit.py`: `window_wall`, `leitpult`, `ofenhalle` (Halle hinter dem Fenster, ohne
  Vorderwand), `tresen_*`, `tisch`, `kartentisch`, `tafel`, `theke`, `schleuse`.
- `hk_deck_lauf.py`: baut `HuetteDeck.blend`, schreibt die Daten, rendert Ansichten oder backt (`-- backen`).
- `hk_plan.py` mit `NUR_HELFER = True` geladen liefert nur die Helfer (Plan, Zustände, Zusammenbau).
- `lm2_raum.py` (Bastion) kann jetzt andere Zellmaße (`cell` in den Optionen) und nimmt freie Objekte (Kurven, Schrift) mit.
- Farben im Spiel gedeckter als in den Cycles-Bildern (die Filmkurve verstärkt Rot und Grün); die Werte stehen in `hk_kit.py`.
- Lückensuche: Der Torrahmen des Gangs braucht wie die Gangwand den Randbalken zwischen 4,4 m und der Decke, sonst sieht man aus dem
  Leitstand in den Wandhohlraum.

## Offen

- Dreiecke abspecken (Rost des Kabelkanals als Fläche, Nietreihen sparsamer): 1,45 Mio. gesetzte Dreiecke im Deck.
- Die Ofenhalle ist weiter nur durchs Fenster zu sehen.
- Hangar der Eisenkrone ist noch der Stationshangar; im selben Look denkbar.
