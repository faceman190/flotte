# Minen (Dungeons)

Stand Alpha 0.76. Code: `src/game/dungeon.ts`, eingehängt in `src/main.ts`, `src/game/surface.ts`, `src/ui/controls.ts`.

## Was der Spieler erlebt
- Auf jedem Planeten liegen drei Stolleneingänge (Betonportal mit Mast). Der Rover zeigt sie ab rund 1,4 km als Wegweiser an
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

## Noch offen
- Nur ein Aussehen (Bergwerk). Geplant: je Planetentyp eigene Farben und Einbauten, weitere Arten (Bunker, Wrack), große Meteoriten im All.
- Fallen, Rätsel über mehrere Schalter, Schlüssel, mehrere Ebenen.
- Die Waffe im Bild ist ein einfaches Modell, nicht das Blender-Modell des Gegenstands. Wächter und Kisten sind einfache Formen.
- Werte (Leben, Schaden, Beute) sind geschätzt und nicht eingespielt.
