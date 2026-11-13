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
Die Stirnlampe sitzt an der Waffenlampe rechts unten.

**Weitere Waffen (Alpha 0.78):** `asset-src/neu/mine/waffen_build.py` baut zwei eigene Entwürfe von Hammerwerk und nutzt dafür die Hilfsfunktionen aus `waffe_build.py`:
- **IG-3 Weitblick** (Impulsgewehr): Graphitkern mit weißer Lackschale, Fugen und Lüftungsschlitzen, integriertes Zielfernrohr mit Entfernungsmesser,
  Skelettschaft, Energiezellen-Magazin mit Ladeanzeige, Leuchtstreifen, orange Markierungen, untere Schiene. Rund 47.000 Dreiecke.
- **EF-2 Brecher** (Enterflinte): kompakter Körper mit Energiekern und Leuchtring, geknickten Leuchtstreifen, Hülse im Auswurf, Patronenfenster im
  Magazin, Reflexvisier, Gitterschaft, Kabel vom Kern. Rund 34.000 Dreiecke.
- Ablauf je Waffe: `build_ig3()` bzw. `build_ef2()` → `prepare_w(key)` → `bake_w(key)` (wartet auf `tex_tmp/<key>_fertig.txt`) → `show_w(key)` → `export_w(key)`.
  Beide teilen sich die Back-Materialien: immer eine Waffe fertig backen, bevor die nächste gebaut wird.
- Im Spiel wählt `viewModelId()` in `src/game/mineArt.ts` das Modell nach der angelegten Waffe: Impulsgewehr → IG-3, Enterflinte → EF-2, sonst K-12.
  Wechselt man die Waffe in der Mine, wird das Modell sofort getauscht. Die Leuchtteile pulsieren leicht.

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

## Spielerfigur: Hände und Außensicht (Alpha 0.79/0.80)

Grundlage ist der gekaufte Soldat (CGTrader, Royalty Free; Rohdaten in `asset-src/neu/soldier_src/`, nicht im Repository). Blender-Datei: `asset-src/neu/soldier/Soldat.blend`.

- **Texturen:** `soldat_build.py` → `textures()` wandelt die 4K-TGA (Unity: Metall in Rot, Glätte im Alphakanal) in unser Format: `soldat_col/nrm/orm@2048`,
  drei weitere Uniformfarben `soldat_col_v2/v4/v6`, Köpfe `kopf_h_*` und `kopf_m_*` (mit Leuchtkarte).
- **Hände in der Ich-Sicht:** `pose_hands(id)` legt die Arme des Soldaten (`SKM_Custom_Soldier_Arms`) per IK an jede Waffe: rechte Hand am Griff,
  linke Hand seitlich am Handschutz (Daumen oben, so sieht man Handrücken und Daumen). Oberkörper leicht schräg, links darf die Schulter nach vorn.
  Die Griffpunkte stehen in `GRIP`; `export_hands()` schreibt `Mine_Haende.glb` (Knoten `haende_k12/ig3/ef2`). Im Spiel hängen sie in der Waffenebene.
- **Fallstrick Skelett:** In diesem UE-Skelett zeigen die Knochenenden nicht zum nächsten Gelenk (Unterarm, Oberschenkel), und der Handknochen zeigt
  nicht zu den Fingern. `fix_arm_bones` setzt die Armknochen Gelenk an Gelenk; die Handausrichtung rechnet mit der Linie Handgelenk → Mittelfinger.
- **Außensicht, Figur:** `soldat_tp.py` → `prepare()` nimmt die ältere Fassung des Soldaten (UE4-Skelett, alle 8 Köpfe, Rüstung, Taschen an einem Skelett).
- **Animationen (Alpha 0.80):** Mixamo-Gewehrclips (FBX, ohne Skin, 30 fps) liegen in `asset-src/neu/mixamo/` (nicht im Repository), in Blender als
  Sammlung `mx_rifle`. `soldat_anim.py` → `retarget_full()` überträgt den ganzen Körper inklusive Arme und Finger: je Knochen die Weltdrehung
  relativ zur Ruhelage; die Ruhelagen (Mixamo T-Pose, Soldat A-Pose) werden angeglichen – Arme und Beine über die Linie zum nächsten Gelenk,
  Unterarm, Hand und Finger über den Handrahmen (Fingerrichtung + Knöchellinie Zeige- → Kleinfinger). Schleifen laufen am Platz (die Vorwärtsbewegung
  der Hüfte wird herausgerechnet); gemessen werden Tempo, Richtung, Schrittlänge und Phase (linker Fuß setzt auf) → `soldat_tp.json` → `clips`.
  `weapon_rels('aim')` legt jede Waffe so an die rechte Hand, dass der Lauf im Zielclip zur linken Hand zeigt. `export_all()` schreibt alles.
  Clips: idle (Rifle Idle), aim (Rifle Aiming Idle), fire (Firing Rifle), walk_f/b/l/r/fl/fr, death_f/b. Neue Gangart: Clips `run_*` nennen, fertig.
- **Im Spiel (`src/game/avatar.ts`):** gemeinsam für Mine, Station, Hangar, eigene Schiffe und den Planetenboden.
  Laufclips werden nach Laufrichtung relativ zum Körper überblendet (die zwei Nachbarrichtungen), Gangarten (walk, run) nach Tempo. Alle laufen in einem
  gemeinsamen Schrittzyklus, der nach Tempo ÷ Schrittlänge vorrückt (höchstens 1,9 Zyklen/s). Im Stand dreht der Körper erst ab einem Winkel mit
  Seitschritten nach, bis dahin dreht der Oberkörper; er neigt sich mit dem Blick. Nach einem Schuss (oder mit wachen Wächtern in der Nähe) bleibt die
  Figur im Anschlag; Schießen legt eine Oberkörper-Ebene darüber; in der Mine spielt beim Tod eine Sterbeanimation.
  Helm → einer der 8 Köpfe, Anzug → Rüstungsplatten und Uniformfarbe, Rucksack → Taschen (Figur wird bei Wechsel neu gebaut).
- **Pro Rifle Pack (Alpha 0.82):** 49 Mixamo-Clips in `asset-src/neu/mixamo/pro_rifle/` (Sammlung `mx_pack`, Armaturen `px_<Name>`). Übertragen:
  idle, aim, cidle, caim (geduckt), jump (Hüfte relativ zu den Füßen, die Flughöhe macht das Spiel), walk_/run_/sprint_/crouch_ je 8 Richtungen (f, fl, fr, l, r, b, bl, br),
  death_f/b/r/h, death_c (geduckt); fire weiter aus Firing Rifle. Tempo nach Übertragung: Gehen 1,8, Rennen 4,5, Sprinten 6,75, geduckt 1,9 m/s.
  Im Spiel: Gangarten nach Tempo überblendet, **Taste C** = ducken (überall zu Fuß: langsamer, Augenhöhe 1,12 m, eigene Clips), Sprung-Clip in der Luft.
- **Mitspieler (Alpha 0.81):** andere Piloten zu Fuß in derselben Station erscheinen als Soldaten mit denselben Clips. Das Netz schickt im Feld `g`
  ihr Aussehen mit (Helm, Anzug, Rucksack, Waffe; Server bereinigt es), die Laufrichtung ergibt sich aus der nachgeführten Bewegung relativ zu ihrer Blickrichtung.
- **Taste V** schaltet überall zu Fuß Ich-Sicht ↔ Außensicht (wird im Browser gemerkt). Kamera über der rechten Schulter; sie rückt vor Wänden,
  Decken, Felsen, Bäumen und dem Rover heran.
- **Zu Fuß auf dem Planeten (`src/game/onfoot.ts`):** im Rover **F** = aussteigen (Rover muss stehen), am Rover F oder E = einsteigen.
  Über die Rampe aus dem Schiff steht man zu Fuß hinter dem Schiff. [E] am Schiff = an Bord, an einem Stolleneingang = Mine betreten
  (danach steht man wieder am Eingang). Gelände folgt dem Boden, zu steile Hänge, Wasser/Lava, Lagerstätten, Schiff, Rover und Bäume halten auf.
- **Tempo zu Fuß:** Station/Hangar/Schiff gehen 6 m/s, rennen 6,8 m/s (Alpha 0.83, vorher 10; passt zum Sprint-Clip); Mine und Planet 4,2 / 6,4 m/s.
- **Noch offen:**
  Nachladen, Treffer, Springen als Clip; Hände an der Waffe korrigieren (linke Hand per IK an den Handschutz).

## Planeten zu Fuß: Basen und Bergung (Alpha 0.84)
- **Basen ohne Hangar:** Auf Planeten fliegt man nicht mehr in die Basis. [E] am Andockpunkt landet das Schiff auf dem Landefeld (`src/game/basewalk.ts`: Feld per Strahltests vermessen),
  man steigt aus und geht zur Tür (an der ersten echten Wand zwischen Feld und Basismitte, mit Leuchtschild EINGANG). Drinnen beginnt man im Gang zur Promenade,
  der Hangar ist abgesperrt; [E] an der Ausgangstür oder „Ablegen“ im Menü führt wieder hinaus. Größere Städte/Stationen mit Hangar kommen später.
- **Begehen der Basis:** Boden und Wände kommen aus den Dreiecken des Modells (Raster 2 m, eigener Strahltest): Sockel und Stufen bis 1,7 m werden erstiegen.
- **Bergung (`src/game/salvage.ts`):** je Planet 4 Wracks (verkohlte Schiffsmodelle) mit Tresorkiste und 2 Kisten, dazu 12 verstreute Versorgungskisten.
  Beute wie in Minen (Ausrüstung nach Gefahr, Credits); die Tresorkiste im Wrack enthält mit 25 % ein legendäres Stück (Sonnenlanze, Orakel, Splitterwerfer, Kristallhelm).
  Geöffnet bleibt 60 Minuten (P.salvage). Wracks qualmen, sind auf Sicht markiert und halten Rover und Fußgänger auf.

- **Kampf zu Fuß (Alpha 0.85, `src/game/fieldfight.ts`):** Ferrox-Wachdrohnen (Modell der Minendrohne): 2–3 an jedem Wrack, 3 auf Streife; sie bemerken den Spieler
  auf 34 m bei freier Sicht über das Gelände, halten ~15 m Abstand und schießen Leuchtkugeln. Klick schießt mit der angelegten Waffe (Werte aus der Mine),
  in der Ich-Sicht mit Waffenmodell und Händen. Leben zu Fuß wie in der Mine (Schutz-Ausrüstung), Erholung außer Gefecht; wer zusammenbricht, wacht am Schiff auf.
  Abschuss: Credits nach Gefahr, 15 % Chance auf einen kleinen Fund.

## Noch offen
- Nur ein Aussehen (Bergwerk). Geplant: je Planetentyp eigene Farben und Einbauten, weitere Arten (Bunker, Wrack), große Meteoriten im All.
- Fallen, Rätsel über mehrere Schalter, Schlüssel, mehrere Ebenen.
- Eigene Modelle für Pistole und Splitterwerfer in der Ich-Sicht; Hände/Handschuhe an der Waffe.
- Werte (Leben, Schaden, Beute) sind geschätzt und nicht eingespielt.
