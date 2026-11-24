# Eiswerk-Baukasten und Deck des Pumpwerks

Stand: 24.11.2026. Wunsch des Nutzers: „Eigenes Deck fürs Pumpwerk umsetzen, baue einen Baukasten, gib dir Mühe. Es soll lebendig, vielfältig,
überschaubar und groß sein.“ Das Pumpwerk Reifschleier ist die zweite Station der Bergbaugilde in Heimstatt (Phase 3, `docs/heimstatt.md`).

## Was anders ist als in der Hütte der Eisenkrone

Der Eiswerk-Baukasten baut auf dem Hütten-Baukasten auf (`docs/huette-baukasten.md`): dasselbe 6-m-Raster, dieselben Hüllen, Tore und Anschlüsse
ans Spiel. Eigen sind Look, Bausteine und die große Halle.

| | Hütte (Eisenkrone) | Eiswerk (Pumpwerk) |
| --- | --- | --- |
| Stimmung | Glut, Erz, Schlacke | Kälte, Eis, Wasser |
| Wandtafeln | dunkles Stahlblech | blaugraue, gedämmte Tafeln |
| Träger | Oxidrot (Mennige) | dunkles Gildenpetrol |
| Tore und Schränke | Gildenpetrol | helles Emaillegrau |
| Licht | Natrium (warm) | kaltweiß; warm nur in Messe und Quartieren (eigene Hüllen) und am Kessel |
| Schirme | Bernstein | eisblau |
| Zeichen | Barren mit Krone | Tropfen über drei Wellen (eigener Entwurf) |

## Wo was liegt

Ordner `asset-src/neu/eiswerk/` (im ausgenommenen Ordner `asset-src/neu`):

- `ew_kit.py`: läuft nach `../huette/hk_kit.py`; stellt die Farben der Hüllen um, neue Wandfüllungen, Objekte und die Halle.
- `ew_deck.py`: Deckplan, Fenster, warme Räume, Füllungen je Raum, Einrichtung, Personal, Wege; schreibt die Spieldaten
  (`asset-src/data/deck_pumpwerk.json`, `lm2_pumpwerk.json`).
- `ew_lauf.py`: `blender.exe -b --python ew_lauf.py -- [Ansicht … | alle | backen]` baut `EiswerkDeck.blend`, rendert Vorschauen
  (`deck-<ansicht>.jpg`) oder backt den Lichtraum 2 (`../bastion/lm2_raum.py`). Bauen dauert 4 s, eine Ansicht rund 30 s.

## Bausteine

- Wandfüllungen (2,7 m): `isolier` (gesteppte Dämmmatten, Reif, Tropfwanne), `ventile` (Sammelrohr mit fünf Abgängen im Farbcode: Wasser blau,
  Sole grün, Gas gelb, Heizung rot), `pegel` (vier Pegelrohre mit leuchtendem Wasser), `kuehl` (Kühlaggregat mit Lüftern und Reif), `pumpe`
  (Kreiselpumpe mit Motor und Spiralgehäuse), `anzuege` (orange Kälteanzüge, Helme, Stiefel), `labor` (Proben, Mikroskop, Analysegerät, Abzug),
  `hydro` (Regal mit drei Ebenen Salat und Kräutern unter Wachstumslicht), `kojen`, `kombuese`, `foerder` (Förderband mit Eisblöcken durch die
  Wand), `tafel_pw` (Tafel des Pumpwerks), `schichtplan`. Dazu alle Füllungen der Hütte.
- Objekte: `eisblock` (Palette), `eiswagen`, `kanister`, `heizer` (glühende Wendeln), `pumpenblock` (Doppelpumpe „P3“), `tank`, `messe_tisch`
  (mit warmer Pendelleuchte), `sofa`, `pflanztisch`, `koje_schrank`, `teilekisten`, `tresen_pw_*` (Markt, Lager, Service, Aufträge).
- Halle: `halle_oben` (Wände von 5,9 bis 11,6 m, Dachbinder, sechs Hallenstrahler, Kranbrücke, Rohrbrücken, schräger Eisförderer von der Annahme
  über den Kessel) und `kessel` (8 m Durchmesser, gedämmter Mantel, Messingbänder, acht Schaugläser mit Glut, Laufsteg auf 4 m mit Leitern,
  Bodenablauf). Nur der Kessel zählt als Standfläche.

## Deck (100 Zellen)

```
...AAAA..BBB....     A Eisannahme (Markt, Lager)        B Probenlabor
...AaAA..BbB....     L Leitstand (Service), Fenster in die Halle
HGGGGGGgGGGGGGG.     S Schmelzhalle 24 × 18 m, 11,6 m hoch, drei Türen
.G.LlSsSSGMMM...     T Kältekammer (Anzüge, Spinde)
.G.LLSSSSGmMM...     M Messe mit Kombüse (Auskunft, Galaxiekarte), warmes Licht
.G.TtSsSsGMMM...     Q Quartiere (warmes Licht)         K Gildenkontor (Aufträge, Missionen)
.GGGGGgGGGGGGGG.     V Hydrokultur                      U Pumpenraum
..QqQ.KkKVvV.UuU
..QQQ.KKKVVV.UUU
```

- Überschaubar: Vom Hangartor aus der lange Nordgang mit allen Schildern; zwei Gänge (Nord, Süd) und zwei Querverbindungen, die Halle in der Mitte
  ist von beiden Gängen und der Messe aus erreichbar.
- Lebendig: 13 feste Leute, davon sieben mit eigenem Satz (Annahmemeister, Laborantin, Schmelzmeisterin, Kesselwart, Koch, Gärtner,
  Pumpenmeister), sechs Laufwege zwischen den Räumen, vier Gesprächsgruppen (Messe, Annahme, Halle, Hydrokultur).
- Buchstaben `P` und `H` sind im Hütten-Baukasten Tore (`hk_plan.py states`, `deck.ts isG`): Räume dürfen sie nicht benutzen.

## Spiel

- `src/game/deck.ts`: `DECKS.pumpwerk`, `LICHT2.pumpwerk`; neu in den Deckdaten: `fenster` (Zellpaare, durch die die Sichtprüfung sieht) und
  `hoch` (Räume mit eigener Deckenhöhe für Kamera und Sprung). `src/main.ts` lädt das Deck im Hintergrund wie das der Eisenkrone.
- Andocken: Station `pumpwerk` in `galaxy.ts`, Außenmodell `src/models/pumpwerk.ts`.

## Offen

- Gesetzte Dreiecke rund 2,7 Mio. (einmalige 0,7 Mio.); der Nutzer zieht Detail vor, gemessen wird im Spiel.
- Die Sätze der Leute sind nicht vertont; der Pumpenmeister fragt nach Dichtungen (Aufhänger für eine Nebenaufgabe, noch ohne Auftrag).
- Hangar ist der Stationshangar.
