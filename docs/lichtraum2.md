# Lichtraum 2: Material im Spiel, gebacken wird nur das Licht

Probe seit Alpha 1.29 (16.11.2026) am Raum **Spinde** der Bastion. Anlass: Der Nutzer war mit Backzeiten und Aussehen der Lichträume
(docs/lichtraum.md) unzufrieden. Schalter zum Vergleich: `deckTune.scharf` (deck.ts). Vergleichsbild: `docs/bilder/lichtraum2-probe-spinde.jpg`.

## Was am bisherigen Weg falsch war

`lm_raum.py` backt Farbe, Rauheit und Relief je Raum in ein eigenes Bild. Nachgemessen (Fläche der Modelle gegen belegte Bildfläche):

| Raum | Fläche | Schärfe der Farbe |
| --- | --- | --- |
| Leitstand | 1.530 m² | 78 Bildpunkte je Meter |
| Werkstatt, Lager, Krankenstation | rund 1.600 m² | 70 bis 71 |
| Treffpunkt | 2.059 m² | 58 |
| Besprechung, Spinde, kleines Quartier | 742 bis 2.632 m² | 51 bis 54 |

Üblich sind etwa 500. Die Flächen wirken aus der Nähe verwaschen (Lüftungsschlitze, Schrift, Kanten). Das Lichtbild war mit 25 bis 39
Bildpunkten je Meter dagegen feiner als nötig und kostete mit 1536 Abtastungen den Großteil der Backzeit.

## Der neue Weg

Die Materialien des Baukastens sind in Blender reine Rechenmuster (`bk_lib.mk`): fleckige Helligkeit und Rauheit, Schmutz in Bodennähe,
Laufspuren, feines Korn, Kantenabrieb. Das Spiel rechnet sie jetzt selbst, nach der Lage der Fläche und beliebig scharf. Bilder für
Farbe, Rauheit, Relief und Leuchten gibt es nicht mehr.

**Blender** (`asset-src/neu/bastion/lm2_raum.py`, Aufruf über `lm_lauf.py … lm2_bastion.json lm2_raum.py`):

1. Bausteine der Zellen auflösen wie bisher; die Materialien bleiben je Fläche erhalten.
2. Materialtabelle: `bk_lib.mk` legt seine Angaben am Material ab (Eigenschaft `bk`); dazu die Art (lit, glow, screen, stars, glass).
3. Licht ohne Farbe in zwei Formen:
   - große Flächen (ab 0,03 m², bei den Spinden 970 Flächen mit 94 % der Fläche): eine grobe Lichtkarte, 1024 Punkte, 256 Abtastungen;
   - alle Flächen: Licht je Eckpunkt. Das Spiel nimmt es für die Kleinteile, deren Abwicklung bei x = −1 liegt.
4. Im Alphakanal der Eckfarben: Ist die Fläche ein schmaler Streifen (Breite unter 13 mm)? Das sind die Fasen, dort sitzt der Kantenabrieb.
5. Ausgabe: Modell mit Materialnamen `ext_l2_<Material>`, `tex-world/l2_<raum>_lit@1024.png`, `data/lichtraum2_<deck>.json`.

**Spiel** (`src/game/deck.ts`, Abschnitt „Lichtraum 2“):

- Zwei kleine Rauschbilder (256 Punkte, kachelbar, beim Start gerechnet): Flecken, Korn, Gefälle des Korns.
- Je Material ein Shader mit den Angaben aus der Tabelle als feste Zahlen. Das Muster liegt entlang der beiden Achsen, die in der
  Fläche liegen (nach der größten Komponente der Flächenrichtung); eine Abwicklung braucht es dafür nicht.
- Licht: Lichtkarte oder Eckpunkt, dieselbe Kodierung wie bisher. Strahler, Raumspiegelung, Figurenschatten und Speicherfreigabe des
  Lichtraums gelten unverändert (dieselbe Lichtschleife, dieselben Schalter).
- Leuchten sind feste Farben aus der Tabelle, gedeckelt wie bisher.

## Gemessen an den Spinden

| | bisher | Lichtraum 2 |
| --- | --- | --- |
| Backen (nur Cycles) | 126 s | 42 s (Lichtkarte 34 s, Eckpunkte 8 s) |
| Bilder zum Herunterladen | 1,42 MB (fünf Bilder) | 0,12 MB (ein Bild) |
| Grafikspeicher der Bilder (gerechnet) | rund 43 MB | rund 5 MB |
| Schärfe | 54 Bildpunkte je Meter | unbegrenzt (gerechnet statt gebacken) |
| Bildzeit (1280 × 720, Testfenster) | 4,0 bis 4,8 ms | 4,4 bis 4,7 ms |

Der ganze Lauf dauerte 159 s. Davon entfallen 24 s auf den Deckbau und rund 90 s auf das Ende (Materialien zuweisen, Modell ausgeben);
warum die Ausgabe so lange braucht, ist noch nicht untersucht.

## Was anders aussieht

- Der Raum ist im Mittel etwa 20 % dunkler und kontrastreicher. Im alten Bild verschmierte der helle Kantenabrieb über die groben
  Bildpunkte in die Flächen und hellte sie auf.
- Schmutz in Ecken (in Blender über die Umgebungsverdeckung) fehlt; Schmutz in Bodennähe ist da.
- Was beim ersten Blick falsch war: Die Flecken waren wolkig (unser Rauschen streut breiter als das von Blender, jetzt gestaucht), und
  die Abwicklung blieb leer („uv.select_all“ wählt ohne Fenster alle Flächen des Netzes aus; die kleinen Flächen werden jetzt ausgeblendet).

## Offen

- Nur ein Raum. Warnschraffur, Bildschirme mit Zeilenmuster, Noppenblech und Glas sind im neuen Material erst einfach umgesetzt
  (feste Farbe) oder fehlen; die Spinde brauchen sie nicht.
- Gänge und Hangar: dieselbe Technik, noch nicht gebaut.
- Die alten Lichträume und ihre Bilder bleiben, bis die Entscheidung gefallen ist.

## Ganzes Deck der Bastion (Alpha 1.30)

Der Nutzer hat die Probe freigegeben („Ja super. Ganzes Deck“). Deck 3 der Bastion ist jetzt ganz Lichtraum 2: neun Räume und acht
Gangstücke, 105 Zellen. Vergleich: `docs/bilder/lichtraum2-130-deck.jpg`.

**Backen.** `lm2_bastion.json` entsteht aus der Karte: ein Teil je Bereich des Spiels (`zoneOf` in deck.ts: Räume = zusammenhängende
Zellen eines Buchstabens, Gänge = Blöcke von 6 × 5 Zellen). So gilt die Sichtprüfung des Decks unverändert. Lichtkarte 1024, ab zehn
Zellen 1536. Gemessen für das ganze Deck: 30 Minuten, davon 20 Minuten Auflösen der Bausteine und 10,5 Minuten Backen (17 Teile).
Der alte Weg hätte für dasselbe gut zwei Stunden gebraucht (hochgerechnet aus 62 Minuten für die neun Räume).

**Geometrie.** Volle Fasen: 2,4 Mio. Dreiecke, gepackt 62 MB. Eine schlankere Fassung (`OPT['slim']`, Fasen mit einer Stufe, etwa 60 %
der Dreiecke) ist vorbereitet; der Nutzer hat sich für die volle entschieden („Warum sind 62 MB zu groß, nimm diese“).

**Neu im Material:** Warnschraffur und Bildschirmzeilen (`bk_lib.stripes` legt seine Angaben wie `mk` am Material ab; das Spiel rechnet
die Bänder, in der Ferne fließen sie zur Mischfarbe), Noppenblech (Raster von 42 Noppen je Meter als Gefälle), Sternenfenster und Glas
wie im alten Lichtraum.

**Im Spiel.**
- Wo ein Satz der neuen Art da ist, lädt das Deck die alten Sätze nicht mehr. Der alte Satz der Bastion (Treffpunkt, Lager) bleibt nur
  als Rückfall für die Artifact-Fassung; die Bilder und Modelle der sieben Räume aus Alpha 1.28 sind entfernt.
- Raumspiegelung: 256 statt 512 je Seite (6 statt 25 MB je Bereich), sie wird mit den Bildern des Bereichs freigegeben. Aufgenommen
  wird in der Zelle, die der Mitte des Bereichs am nächsten liegt (Gänge knicken ab, ihre Mitte kann in einer Wand liegen).
- Später Umbau: Ist das Deck ohne Lichträume gebaut worden, weil die Daten noch luden, tauscht der Innenraum es aus, sobald sie da
  sind (`deck.stale()`). Im Test: Start mit Bausteinen, Umschalten nach einer Sekunde.

**Gemessen** (RTX 3060 Ti, 1280 × 720, Testfenster; Bausteine → Lichtraum 2):

| Blick | Bildzeit | Dreiecke je Bild |
| --- | --- | --- |
| Gang | 3,3 bis 3,5 → 5,5 ms | 0,66 → 1,46 Mio. |
| Treffpunkt | 2,4 bis 2,5 → 4,9 bis 5,4 ms | 0,76 → 1,66 Mio. |
| Werkstatt | 3,7 → 5,1 bis 5,7 ms | 0,64 → 1,35 Mio. |
| Besprechung | 4,1 bis 4,3 → 5,0 bis 5,1 ms | 0,58 → 1,03 Mio. |

Herunterzuladen: Deckmodell 62 MB und 17 Lichtkarten mit zusammen 3 MB (vorher 48 MB für die neun Räume in der alten Art).

**Geprüft:** Lückensuche über alle 105 Zellen ohne Fund, Begehbarkeit wie vorher, Story-Durchlauf sauber.

**Artifact-Fassung.** Das Deckmodell passt nicht (gebündelt 82 MB, Grenze 256 MiB je Fassung). Dort bleibt die Bastion beim Stand von
Alpha 1.27: Treffpunkt und Lager in der alten Art, sonst Bausteine.

**Offen:** Hangar und Eisenkrone sind noch nicht umgestellt. Schmutz in Ecken fehlt weiter. Das Deckmodell ist eine einzige große
Datei; es in Teile zu zerlegen, würde den ersten Besuch beschleunigen.
