# Minen (Dungeons)

Stand Alpha 0.77 (Modelle aus Blender seit 0.77). Code: `src/game/dungeon.ts`, eingehängt in `src/main.ts`, `src/game/surface.ts`, `src/ui/controls.ts`.

## Was der Spieler erlebt
- Auf jedem Planeten liegen drei Stolleneingänge (Betonportal mit Förderturm). Der Rover zeigt sie ab rund 1,4 km als Wegweiser an
  (ein Scanner-Werkzeug mit Abbau-Wert vergrößert die Reichweite). Am Tor: `[E] <Name> betreten`.
- Unten läuft man zu Fuß in Ich-Sicht: WASD, Umschalt rennt, Klick schießt, `E` benutzt, `I` Ausrüstung, Esc Pausenmenü.
  Die Maus wird eingefangen; gibt der Browser sie frei (Esc), öffnet sich das Pausenmenü.
- Ziel: Kisten plündern, den Schalter finden, damit das Tor zum Tresor auffährt, den Wächterkern besiegen, Tresorkiste öffnen,
  am Förderkorb (Startpunkt) wieder hinauf.
- Die Karte oben rechts deckt sich beim Erkunden auf. Punkte: blau Kiste, grün Verbandskasten, gelb Tresorkiste, rot Schalter (grün, wenn umgelegt),
  weiß Förderkorb, rote Punkte sind alarmierte Wächter.
- Wer zusammenbricht, wird nach oben gebracht. Geöffnete Kisten bleiben offen, die Wächter stehen wieder.
- Nach 20 Minuten füllt sich eine Mine neu (Kisten, Schalter). Der Stand steht in `P.dungeons[<sektor>:<nr>]`.

## Aufbau
- Kachelraster, Kachel = 3,2 m. `0` Fels, `1` Boden, `2` Tor. Größe `n` Zellen ergibt `2n+1` Kacheln: 7, 9 und 11 Zellen je Planet
  (15, 19, 23 Kacheln Kantenlänge).
- `generate(seed, n)`: Tresor (2×2 Zellen) in der fernen Ecke, Labyrinth per Tiefensuche mit Hang zu geraden Stücken, zusätzliche Durchbrüche
  (7 %) für Rundwege, Kavernen (ausgeräumte Blöcke mit hoher Decke), Tor am Tresorrand, Schalter in der Sackgasse, die am weitesten vom Tor liegt.
  Der Plan hängt nur vom Namen der Mine ab, ist also bei jedem Besuch gleich.
- `buildRock`: jede Kachel wird 4×4 unterteilt. `edge(x,z)` misst die Nähe zum Fels; damit wölbt sich die Decke zur Wand hin und der Boden steigt an.
  Die Verschiebung der Punkte hängt nur vom Ort ab, deshalb schließen Boden, Wand und Decke dicht.
- `buildProps`: Stützen und Träger in geraden Gängen, Rohr und Kabelkanal, Hängelampen, Erzkristalle. Alles je Material zu einem Netz verschmolzen.
- Die Mine liegt weit unter der Welt (y = −60000). Beim Betreten werden Sonne, Nebel und Kamera umgestellt und beim Verlassen zurückgesetzt.
- Licht: Stirnlampe (SpotLight) und fünf Punktlichter, die laufend den nächsten Lampen zugeteilt werden.

## Wächter
- Wachdrohne: 34 Leben, Bolzen mit 8 Schaden. Wächterkern im Tresor: 260 Leben, drei Bolzen mit je 13 Schaden.
  Beides steigt mit der Gefahrenstufe des Sektors.
- Verhalten: Streife, bei Sichtkontakt Alarm, halten Abstand und weichen seitlich aus. Ohne Sicht folgen sie einem Abstandsfeld zum Spieler
  (`flood`). Vor jedem Schuss glüht das Auge kurz gelb auf.
- Eigener Schutz: `100 + 2 × Schutz` Leben, Schaden wird mit `100 / (100 + 3 × Schutz)` verringert.

## Waffen
- Zählt die ausgerüstete Pilotenwaffe (`P.gear.waffe`), Werte in der Tabelle `WEAP`. Ohne Waffe: Schneidbrenner (schwach).
- Treffer per Strahltest: erst Fels, dann Wächter.

## Beute
- `lootId`: Stufe nach Gefahr des Sektors, kleine Kisten bis Episch, Tresorkiste eine Stufe höher und selten Legendär.
  Vier Stücke sind ausgenommen und für feste Fundorte reserviert: `sw_lanze`, `sy_orakel`, `waffe_splitter`, `helm_kristall`.
- Dazu Credits (Tresorkiste rund das Zehnfache) und in der Tresorkiste ein Fundstück (Relikt oder Datenkern) zum Verkaufen.
- Ist der Rucksack voll, bleibt die Kiste zu.

## Modelle (Alpha 0.77)

Alles liegt in `asset-src/neu/mine/` (Blender-Datei `Mine.blend`), die fertigen Dateien in `asset-src/glb/station/Mine_*.glb` und `asset-src/tex/`.
Im Spiel lädt `src/game/mineArt.ts` sie; fehlt eine Datei, baut `dungeon.ts` die alten Ersatzformen.

| Datei | Inhalt | Skript |
|---|---|---|
| `Mine_Felsen.glb` + `tex/fels_col/_nrm/_orm` | 10 Felsen (F01–F10) aus CliffRocks01, gröbste Detailstufe, Material `ext_fels` | `mine_rocks.py`, `scripts/make-rock-textures.mjs` |
| `Mine_Kit.glb` | Baukasten-Module: stuetze, gleis, leitung, lampe, tor (+tor_blatt), schalter (+hebel), korb, wagen, kiste/tresorkiste/sanikiste (+_deckel), portal, deko | `mine_kit.py` (nutzt `baukasten/kit_lib.py`) |
| `Mine_Drohne.glb` | Wachdrohne mit Animationen idle/attack/turn/landing (MilitaryDroneCG, Texturen auf 1024 verkleinert, Normalen ins OpenGL-Format gedreht) | in Blender importiert, siehe unten |
| `Mine_Waffe.glb` + `tex/waffe_col/_nrm/_orm` | Karabiner K-12 (Hammerwerk) für die Ich-Sicht, rund 47.000 Dreiecke, gebackene Abnutzung | `waffe_build.py` |

**Höhle:** `buildCaveRocks()` setzt an jede Wandkante drei Felsen unten und zwei oben, an jede Bodenkachel einen Deckenfels und Geröll. Die Felsen
stecken großteils im Gestein und ragen 0,1–0,4 m in den Gang; die Kollision hält deshalb 0,58 m Abstand zur Wandlinie. Gleiche Felsen eines Bereichs
von 4 × 4 Kacheln sind ein InstancedMesh. Bereiche, die über den Weg weiter als 13 Kacheln entfernt sind oder hinter dem geschlossenen Tor liegen,
werden ausgeblendet (Labyrinth: was hinter einer Wand liegt, sieht man nie). Sichtweite 38 m, Nebel 0,048. Unter Tage rechnet die Sonne keine Schatten.

**Einbauten:** Ausbau (Türstock) in jedem zweiten geraden Gangstück, auf die Deckenhöhe gestreckt; Gleise in allen geraden Stücken; Leitungen
(Wetterlutte, Kabelpritsche, Wasserrohr) in etwa jedem vierten; Grubenlampen an den Lampenplätzen; zwei Förderwagen; Kram in Kavernen.
Wiederholte Module sind InstancedMeshes (ein Zeichenaufruf je Teil und Material).

**Waffe in der Ich-Sicht:** eigene Szene und Kamera (`overlay` in `src/core/engine.ts`), nach dem Bild mit leerem Tiefenpuffer gezeichnet: Sie ragt
nie in Wände und wird nicht von der Stirnlampe überstrahlt. Licht: ein ruhiges Führungslicht, Himmel/Boden-Licht und ein warmes Licht aus Richtung der
nächsten Grubenlampe. Pendeln bei Drehungen, Gehbewegung, Rückstoß, Mündungsfeuer (Sprite + Licht in der Waffenszene + Licht in der Welt).
Die Stirnlampe sitzt an der Waffenlampe rechts unten. Derzeit zeigt jede Pilotenwaffe den K-12.

**Neu bauen:** `Mine.blend` öffnen, die Skripte mit `exec(open(...).read(), ns)` laden.
- Felsen: `build()`, `export()`. Texturen: `node scripts/make-rock-textures.mjs` (Quelle `rocks_src/`, aus Textures.zip).
- Module: `build(lib)`, `bake(lib)` (blendet beim Backen alle anderen Objekte aus), `export(lib)`.
- Waffe: `build()` → Vorschau (`waffe_fp.py`, `mine_preview.py`) → `prepare()` → `bake_start()` (rund 5 Minuten, wartet auf
  `tex_tmp/waffe_fertig.txt`) → `show_baked()` → `export()`.
- Danach `npm run assets`.

**Fallstricke:**
- Die Asset-Pipeline speichert Punkte quantisiert; Größe und Lage stecken dann in der Knoten-Transformation. Knoten deshalb samt Transformation klonen
  (`kitPart()`), nie nur die Geometrie nehmen.
- Leere Knoten (Leerobjekte) entfernt die Pipeline. Mündung und Lampenkopf der Waffe stehen deshalb als Zahlen in `mineArt.ts`.
- Blender exportiert nichts aus ausgeblendeten Sammlungen.
- Materialien mit `ext_` behalten wie `kit_` ihre Texturkoordinaten ohne eigene Bilder (`scripts/build-assets.mjs`).

**Rechte:** Felsen (CliffRocks01, Textures.zip) und Drohne (MilitaryDroneCG) hat der Spieleentwickler bereitgestellt; Quelle und Lizenz bitte
neben den Dateien vermerken (siehe `asset-src/neu/LIESMICH.md`).

## Noch offen
- Nur ein Aussehen (Bergwerk). Geplant: je Planetentyp eigene Farben und Einbauten, weitere Arten (Bunker, Wrack), große Meteoriten im All.
- Fallen, Rätsel über mehrere Schalter, Schlüssel, mehrere Ebenen.
- Eigene Modelle für Pistole, Flinte und Impulswaffe in der Ich-Sicht; Hände/Handschuhe an der Waffe.
- Werte (Leben, Schaden, Beute) sind geschätzt und nicht eingespielt.
