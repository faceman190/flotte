# Quartier auf der Bastion

Stand: 24.11.2026. Auftrag: „Genauso umsetzen. Mit einem Aufzug irgendwo im Deck der Bastion zu den Quartieren. Für das Quartier wirklich
viel Mühe geben, kleine Details, schöne Beleuchtung.“

## Idee: ein Raum für alle, eine Fassung je Pilot

- Es gibt **ein** Quartiermodell. Jeder Pilot hat seine eigene Fassung davon: Wessen Quartier es gerade ist, bestimmt nur, was darin steht
  (Schiffsmodelle, Kristalle, Türschild) und wer darin zu sehen ist.
- Das Modell liegt im Plan der Rundhalle weit abseits (QX 0, QY 150). Das Spiel zeichnet nur Teile, die näher als 70 m sind, also sehen
  sich Halle und Quartier nie. Der Aufzug versetzt die Figur nur (hinter einer kurzen Blende).
- Im Mehrspieler heißt der Ort im Quartier `bastion#q:<Besitzer>` (statt `bastion`). Mitspieler sieht man nur am selben Ort.
- Besuch nur auf Einladung: Der Besitzer lädt am Bildschirm einen Piloten auf der Bastion ein (Server-Nachricht `qi`). Die Einladung trägt
  die Ausstattung des Quartiers mit und gilt 15 Minuten. Der Gast wählt sie am Aufzug.

## Im Spiel

- **Aufzug „QUARTIERE“** im Wandstück bei 90° (Nordseite der Halle, zwischen Handelskontor und Werft), mit großem Leuchtschild wie über den Buchten und Bodenschrift an der Leitspur. Seit 25.11.2026 steht davor nichts mehr: Imbiss nach −90° (vor das Schott „DECK 2“), Baustelle nach −45°, Banner „Niemand kommt uns holen“ innen an die Kuppel, Kisten weg. [E] öffnet das Aufzugterminal:
  Quartier mieten (2.500 Cr, einmal), ins eigene Quartier fahren, Einladungen annehmen.
- **Vorraum:** Aufzugtür mit Stockanzeige, Türschild mit Nummer und Name (vom Spiel gezeichnet), Waschplatz mit Spiegel, Garderobe,
  Feuerlöscher.
- **Koje** in einer Nische: ausruhen (Hülle und Schild voll, Spielstand gesichert). Danach ist die Koje der Aufwachpunkt: Nach einem
  Abschuss wacht man in der Koje auf (main.ts, hooks.respawn → interior.ts inKojeAufwachen).
- **Spind:** nur einlagern und herausnehmen (Reiter „Im Spind“ und „Einlagern“), kein Kaufen und Verkaufen. Das geht nur beim Ausrüster auf Deck 3.
- **Regal:** Sammlung (Schiffe, Kristalle, legendäre Stücke). Im Regal und auf dem Wandbord stehen bis zu vier Modelle der eigenen Schiffe
  und je ein Kristall jeder Sorte aus Rucksack und Spind.
- **Bildschirm** am Schreibtisch: Pilotenübersicht, Ruf, Gäste einladen.
- **Fenster:** Blick ins All mit Planet. Die Fläche hinter dem Fenster (Material „Ausblick“) zeichnet den Himmel nach der Blickrichtung
  (deck.ts, ausblickMat): Sterne, Milchstraße, Planet mit Tag- und Nachtseite, Wolken, Lichtern der Städte und Lufthülle. Er dreht sich langsam.
- Bei Gästen bleiben Koje, Spind und Bildschirm zu.
- Testlabor (F8 → Reisen): „Bastion · im eigenen Quartier“ mietet gratis und fährt hinauf.

## Dateien

| Was | Wo |
|---|---|
| Modell, Licht, Kameras | `asset-src/neu/bastion/qu_bau.py` (läuft nach bk_kit, bk_mehr, bk_med, rh_kit) |
| Spieldaten | `asset-src/neu/bastion/qu_spiel.py` → `asset-src/data/deck_quartier.json`, `lm2_quartier.json` |
| Läufer | `qu_lauf.py -- [ansicht …\|alle]` rendert `qu-<ansicht>.jpg`; `qu_lauf.py -- backen` backt den Lichtraum 2 |
| Aufzug in der Halle | `rh_kit.py` sector_fill, Art `aufzug`; `rh_deck.py` SECTORS (60°–120°) |
| Spiel | `src/game/quartier.ts` (Zustand, Miete, Einladungen, Sammlung), `deck.ts` (Anbau, Ausblick), `interior.ts` (Aufzug, Möbel, Regal), `ui/dock.ts` (Terminal „quartier“), `net.ts` und `server/server.mjs` (`qi`) |

Neu backen (Blender im Hintergrund, etwa 3 Minuten): `blender.exe -b --python qu_lauf.py -- backen`, danach `npm run assets` und
`public/assets` mit committen. Die Rundhalle muss nur neu gebacken werden, wenn sich am Aufzug etwas ändert (`rh_back_lauf.py`, etwa 13 Minuten).

## Licht

Warm und wohnlich gegen das kühle Deck 3: Lichtvoute rundum (Lichtbänder nach oben gegen die helle Deckenmitte), fünf Einbaustrahler im
Deckenrand (leicht zur Wand geneigt), Leselampe und Lichtleiste in der Koje, Schreibtischlampe, Stehlampe, Leuchtleisten unter Regalböden
und Wandbord, Spiegellicht, warme Sockelleisten. Durchs Fenster kommt kühles Licht des Planeten. Im Spiel kommen die Schlüsselstrahler
(Schatten der Figuren) an den Plätzen der Einbaustrahler dazu (deck.ts, SPOT quartier).
