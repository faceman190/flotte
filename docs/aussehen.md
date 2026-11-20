# Aussehen der Spielfigur

Stand 20.11.2026 (Stufe 1 und 2 des Plans; zuerst auf dem Testserver). Die Figur ist der gekaufte Soldat (`Soldat.glb`, 53 Knochen,
Unreal-Namen). Alles hängt an diesem einen Skelett, deshalb laufen alle Clips (auch der SMG-Anschlag aus Cascadeur) mit jedem Teil.

## Was der Spieler wählt (Aussehen, `P.look`)

- **Gesicht:** Kopf 6 (Glatze, Headset), Kopf 8 (Bart, Kappe, Brille), Kopf 5 (Sturmhaube). Mehr Gesichter hat das Modell nicht.
- **Uniform:** vier Farben (`soldat_col`, `_v2` Wald, `_v4` Wüste, `_v6` Nacht).
- Gewählt bei **Neues Spiel** (Charaktererstellung mit drehbarer Figur) und später an der **Garderobe**: Flottenband → Ausrüstung → Knopf
  „Garderobe“, nur in einer Station (angedockt oder zu Fuß drinnen).
- Ältere Spielstände ohne Aussehen: Kopf 6, Uniform Flotte.

## Was die Ausrüstung zeigt (`mineArt.ts`)

| Platz | Gegenstand | Modell |
|---|---|---|
| Helm | Werkshelm | Kopf 7, Atemschutzmaske |
| | Pilotenhelm Mk II | Kopf 2, geschlossener Helm mit Visier |
| | Grenzwacht-Visier | Kopf 1, schwarzer Visierhelm |
| | Sturmhelm | Kopf 4, schwerer Helm mit Leuchten |
| | Kristallhelm | Kopf 3, Tuch mit drei Linsen |
| Anzug | Overall | nur die Uniform |
| | Druckanzug | Schienbeinplatten |
| | Exoskelett | Oberschenkelplatten |
| | Panzer, Veteran, Sturm | beide |
| Rucksack | Tasche | Gürteltaschen |
| | Feld, Schwebe | Rucksack |
| | Lasten | Rucksack und Gürteltaschen |

Ohne Helm sieht man das gewählte Gesicht. Wachen in der Stadt (ohne Aussehen) werden wie bisher aus ihrer Ausrüstung gewürfelt.

## Technik

- `FigGear` = Ausrüstung plus `look`; `figGear()` (avatar.ts) für die eigene Figur, `soldierGearKey` enthält das Aussehen (Figur wird bei
  Änderung neu gebaut).
- Netz: Feld `g[5]` = „Kopf,Farbe“ (Server reicht jetzt sechs Felder durch); fehlt es, gilt das Standardaussehen.
- Fenster (seit dem zweiten Testserver-Stand): „Personalakte“ mit Bühne links (Namensschild, Umschalter Ganzkörper/Gesicht, Drehknöpfe,
  ziehen zum Drehen) und rechts nummerierten Abschnitten: Rufzeichen, Gesicht und Uniform als Kacheln mit Standbildern der echten Figur
  (`figPortrait`, erst wenn Clips und Bilder geladen sind), Dienstantritt. Garderobe nutzt dasselbe Fenster. Achtung: `canvas` ist in
  style.css global `position:fixed`; jede Vorschaufläche braucht eine eigene Position (`.figCv`, `.invFigBox canvas`), sonst liegt sie
  über den Bedienelementen (Fehler des ersten Stands).
- Vorschau `src/ui/figPreview.ts`: wie die Schiffsansicht der Werft mit dem Renderer des Spiels vor dem Bild (prePass), in eine 2D-Fläche
  kopiert; drehen mit der Maus. Genutzt von „Neuer Pilot“, Garderobe und Ausrüstung im Flottenband.
- Ich-Sicht: Arme bleiben vorerst die alten Soldatenarme (keine Uniformfarbe).

## Weiter (Stufe 3 und 4)

Weitere Körper (z. B. weiblich) am selben Skelett und neue Helme, Overalls und Rüstungen; Weg offen: gekaufter modularer Bausatz auf dem
Unreal-Skelett (am schnellsten) oder eigene Modelle.

## Probe Pilotin (20.11.2026, Testserver)

Weiblicher Körper aus **MPFB** (MakeHuman für Blender, alle Teile CC0) am Skelett der Spielerfigur. Wahl „Körper: Pilot / Pilotin“ in
der Charaktererstellung und der Garderobe; Netz: `g[5]` = „Kopf,Farbe,w“.

- Bau: `asset-src/neu/pilotin/pilotin_bau.py` (Blender im Hintergrund, Schritte `bauen`, `skelett`, `posen`, `export`) →
  `asset-src/glb/station/Pilotin.glb` (rund 33.000 Dreiecke, Bilder 1024 px; im Spiel 0,99 MB).
- MPFB-Figur mit dem MPFB-Skelett `game_engine` (dieselben Unreal-Namen wie der Soldat). Arme, Hände, Finger, Hals und Beine werden in
  die Grundhaltung des Soldaten gedreht (Rumpf und Schlüsselbein nicht: dort setzen MPFB und der Soldat die Gelenke verschieden, es kippte
  die Figur). Dann bekommt das Skelett des Soldaten ihre Gelenkpunkte bei unveränderter Ausrichtung jedes Knochens (Prüfung: 0,0°).
- Clips: die des Soldaten. Seine Clips tragen für jeden Knochen auch die Lage (seine Knochenlängen); für sie zählen nur die Drehungen, das
  Becken wird auf ihre Höhe umgerechnet (`pilotinClips` in mineArt.ts). Geprüft: Füße bleiben beim Gehen und Rennen am Boden.
- Offen in der Probe: Helme, Rüstung und Rucksäcke (gehören zum Soldatennetz und passen ihr nicht), nur ein Gesicht und ein Overall
  (Oliv, umgefärbter MPFB-Arbeitsanzug). Ich-Sicht-Arme bleiben die des Soldaten.
