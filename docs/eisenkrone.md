# Gildehütte Eisenkrone (Raffinerie-Station)

Seit Alpha 1.22 steht im Sektor Heimstatt eine eigene Raffinerie-Station: die Gildehütte **Eisenkrone**, betrieben von der Bergbaugilde.
Sie ersetzt den Raffinerie-Tresen im Lager der Bastion. Entwurf und Begründung: Raffinieren in einem kleinen Raum auf dem Trägerschiff ergab
keinen Sinn. Eine Hütte braucht Öfen, Abwärme und Platz.

## Was sich im Spiel ändert

- Neue Station `eisenkrone` in `src/data/galaxy.ts` (Sektor Heimstatt), am Metallfeld, rund 2 km von der Bastion.
- **Raffinerie** haben im All jetzt: Eisenkrone, Splitter-Mine, Tess-Vorposten. Dazu wie bisher alle Planetenbasen (darunter Schmelzwerk Zwölf
  mit dem Bonus 3 → 2). Bastion, Heimstatt-Ring, Lichtwall-Werft und Neuhafen raffinieren nicht mehr. Gebühren und Ausbeute sind unverändert.
- Folge für den Handel: Barren verkauft nur, wer raffiniert (`sellsHere` in `src/game/economy.ts`). In Heimstatt gibt es Barren deshalb an der
  Eisenkrone, nicht mehr an der Bastion. Ankaufen tun weiter alle Stationen.
- Dienste der Eisenkrone: Markt, Raffinerie, Aufträge, Missionen, Lager, Hangar, Service, Station. **Kein** Ausrüster, keine Werft, keine
  Werkstatt (Feld `no` der Station; `tabs()` in `src/ui/dock.ts`). Die bleiben auf der Bastion.
- Die Station gehört der Gilde (Feld `gilde`): Ruf und Missionen wie an den Planetenbasen (`stationFaction` in `src/game/reputation.ts`).

## Außenmodell

Ordner `asset-src/neu/raffinerie/` (liegt im ausgenommenen Ordner `asset-src/neu`; die Skripte sind einzeln eingecheckt).

| Datei | Zweck |
| --- | --- |
| `raff_konzept.py`, `konzeptblatt.cjs` | Entwurf (Blockmodell und beschriftetes Blatt), Stand vor dem Bau |
| `ek_aussen.py` | baut das Modell in `Eisenkrone.blend`: läuft nach `../bastion/bk_kit.py` (dessen Materialhelfer), 690 m lang, +X = Hangartor |
| `ek_export.py` | gibt aus: `asset-src/glb/base/Eisenkrone.glb` und `asset-src/data/eisenkrone.json`. **Verändert die Szene, danach nicht speichern.** |

Aufbau von links (−X) nach rechts: Erzannahme (Korb mit Trichter), Rückgrat aus Fachwerk mit Förderrohr, darunter drei Drehöfen mit glühenden
Köpfen, darüber der Wärmetauscher mit acht Radiatoren (an der Wurzel rotglühend), Schlackewerfer nach unten mit glühender Fahne, Tanklager,
Barrenlager mit Kran, Hangarblock mit Wohnturm und Leitstand.

Das Modell trägt keine Bilder. Je Eckpunkt steht Farbe × Verdeckung (als Wurzel), bei Leuchten die Strahldichte (`w = Wurzel(x / (1 + x))`).
Die Art einer Fläche steht im Materialnamen:

| Material | Fläche | im Spiel (`src/models/eisenkrone.ts`) |
| --- | --- | --- |
| `ext_ek_hull` | Rumpf | Standardmaterial mit dem Rumpfbild `hull_mil` (Würfelprojektion, eine Kachel je 26 m) × Eckpunktfarbe |
| `ext_ek_paint` | Lack | wie Rumpf mit `hull_light`, weniger metallisch |
| `ext_ek_warn` | Warnschraffur | wie Lack; die Streifen zeichnet das Spiel |
| `ext_ek_glow` | Leuchten, Glut, Radiatoren | selbstleuchtend, im Farbton gedeckelt (`ekTune.cap`) |
| `ext_ek_feld` | Kraftfeld im Hangartor | durchscheinend, additiv |

Objekte im Modell: `koerper` und `schlacke` (die Fahne zählt nicht zur Kollision). Die Daten enthalten Leuchtpunkte (`lauf` = Lauflichter
der Anflugschneise, `rot`, `gruen`, `weiss` = Positionslichter), den Startpunkt 46 m vor dem Tor und den Andockpunkt 65 m weiter draußen.

**Kollision:** Rasterkugeln (44 m) über den Körper. Im Bereich des Hangarblocks und der Anflugschneise werden sie verworfen und durch neun
Kugeln von Hand ersetzt, damit das Tor frei bleibt. Wer das Modell am Hangarblock umbaut, muss diese Zahlen in `buildEisenkrone()` nachziehen.

**Lage:** `addStation()` in `src/game/world.ts` dreht die Station fest (`EISENKRONE_YAW`): Das Tor zeigt schräg zur Bastion, die Erzannahme zum
Metallfeld. Ist das Modell noch nicht geladen, steht dort kurz die übliche Station und wird dann getauscht.

Einstellen im Testfenster: `ekTune.u.uGain.value` (Helligkeit der Rumpffarben), `uGlow`, `uCap`.

## Innen: Hangar und Hüttendeck

Der Hangar ist der übliche Stationshangar. Hinter der Schleuse liegt das **Hüttendeck**.

**Seit Alpha 1.34** ist es aus dem eigenen Hütten-Baukasten gebaut (6-m-Zellen, 4,6 m breite Gänge, Mennige, Gildenpetrol, Messing,
Natriumlicht; siehe `docs/huette-baukasten.md`) und kommt als Lichtraum 2 ins Spiel (Material im Shader, nur Licht gebacken):

```
..AAA.EEE..      A Annahme · E Leitstand mit Fensterwand zur Ofenhalle · O Gildenkontor · C Kantine
..AaA.EeE..      S Spinde · M Maschinenraum · G Gang · g Schott · H Tor zum Hangar
HGGGGgGGGG.
.G.sSG.mMG.      57 Zellen, 8 Figuren mit Diensten wie bisher (Raffinerie, Markt, Lager, Service, Aufträge,
.G.SSG.MMG.      Missionen, Auskunft) und der Schmelzmeister
.GGGGGgGGG.
..OoO..CcC.
..OOO..CCC.
```

Bauen und backen: `blender.exe -b --python asset-src/neu/huette/hk_deck_lauf.py -- backen` (Deckplan, Einrichtung und Personal in
`hk_deck_ek.py`; schreibt `asset-src/data/deck_huette_ek.json` und `lm2_huette_ek.json`, backt mit `../bastion/lm2_raum.py`, gut 7 Minuten),
danach `npm run assets`. Das Spiel nimmt das erste Deck aus `DECKS.eisenkrone` (`src/game/deck.ts`), dessen Daten da sind; die Maße des
Decks (Wandabstand, Türbreite, Schott, Deckenhöhen, Lampen) stehen in `masse` in den Daten. Das Artifact lässt das neue Deck weg
(`SKIP_SETS`, `SKIP_DATA` in `scripts/artifact-pack.mjs`) und zeigt das alte.

### Bis Alpha 1.33: Hüttendeck aus dem Bastion-Baukasten

Gebaut mit dem Baukasten der Bastion (`asset-src/neu/bastion/bk_deck_ek.py`, eigene Datei `EisenkroneDeck.blend`, Ausgabe mit
`bk_export.py`; siehe `docs/bastion-deck.md`). Bleibt als Rückfall im Spiel (Artifact).

```
..AAA..EEE..     A Annahme: Tresen Raffinerie, Markt, Lager; Erzwaage, Erzkisten, Barrenstapel
..AaA..EeE..     E Leitstand: Fensterwand in die Ofenhalle, Service, Schmelzmeister
.GGGGgGGGGG.     O Gildenkontor: Aufträge (Pult vor der Tafel der Gilde), Missionen
HG.S.G.MM.G.     C Kantine: Auskunft, Galaxiekarte
.G.s.G.Mm.G.     S Spinde · M Maschinenraum
.GGGGGgGGGG.     G Gang · g Schott · H Tor zum Hangar
..OoO.CcC...
..OOO.CCC...
```

Neu im Baukasten für dieses Deck:

- **Fensterwand** (Zustand `F` in `raum_side`, `bk_kit.py`): Brüstung und Sturz, dazwischen 3,6 m offen. `bk_deck_ek.py` setzt sie an die
  Außenwand des Leitstands.
- **Fenster mit Leitpult** (`ofenfenster`) und die **Ofenhalle** dahinter (ein Baustein, 23 × 18 × 12 m): drei Drehöfen mit Schauloch und
  Abstich, Gießrinne, Laufsteg, Laufkran mit Gießpfanne. Sie liegt nördlich außerhalb der Karte und gehört zum Bereich des Leitstands: Gezeichnet
  wird sie nur, wenn man in den Leitstand sieht.
- Objekte: `waage`, `erzkiste`, `barren`, `barren_cu`, `gildentafel`.
- Figuren ohne Dienst: Ein Eintrag in `personal` mit `titel` und `satz` (hier der Schmelzmeister) steht nur da und sagt seinen Satz.

`bk_deck_d.py` ist dafür umgebaut: Karte ableiten (`plan_setzen`), Schleuse mit eigenem Schild, Angaben schreiben (`meta_schreiben`);
mit `DECK_HELFER = True` geladen baut die Datei nichts und liefert nur die Helfer.

Im Spiel verwaltet `src/game/deck.ts` die Decks je Station (`DECKS`: Daten und Modell). Die Bastion lädt beim Start, die Eisenkrone gleich
danach im Hintergrund. Der Weg der Story-Figuren hinter dem Tor richtet sich danach, wie weit der Gang dort nach Norden reicht.

## Prüfen

- `scripts/decktest.js`: `DT.enter('eisenkrone')`, `__walkAll()` (alle Zellen und Ansprechpunkte erreichbar), `DT.shot(...)`, `DT.info()`.
- Außen: Abstand der Start- und Andockpunkte zu den Kollisionskugeln, Reiter im Stationsmenü, Start aus dem Hangar.
- Nach Änderungen am Deck oder an den Diensten den Story-Bot laufen lassen (`scripts/probelauf.js`).

## Offen

- Die Ofenhalle ist nur durch das Fenster zu sehen, nicht zu betreten.
- Die Schlackefahne steht still.
- Kein eigener Funkverkehr und keine eigene Geschichte an der Hütte (Gildemeisterin Krull tritt hier noch nicht auf).
- Die Radiatoren leuchten, werfen aber kein Licht auf den Rumpf.
