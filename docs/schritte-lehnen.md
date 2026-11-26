# Schritte je Untergrund und seitlich lehnen (seit 26.11.2026)

Aus dem Fab-Paket **TFP Movement** (`C:\EXTRA\UnrealProjects\TFPMovementV1`) übernommen: die Schrittgeräusche und die Idee des Lehnens.
Die Bewegungslogik des Pakets (Blueprints) passt nicht ins Spiel und ist nicht übernommen.

## Schritte

- 131 Aufnahmen für 13 Untergründe: Gras, Sand, Kies, Fels, Erde, Matsch, Schnee (harsch), Pulverschnee, Wasser, Metall, Beton, Holz, Teppich.
  Je 6 bis 10 Schritte, dazu wo vorhanden Absprung und Aufkommen. Liegen in `asset-src/sound-lazy/fs_*.ogg` (1,1 MB, Paket world), Herkunft
  in `QUELLEN.txt` daneben. Solange das Paket world lädt, klingen die alten Schritte `step0–4`.
- Code: `src/game/schritte.ts` (Auswahl, Lautstärke je Untergrund, nie zweimal dieselbe Aufnahme hintereinander).
- **Planetenboden** (`onfoot.ts`, `footGrund`): nach Planetentyp und Hang. Felsplanet Gras (steil Fels), Wüste Sand (steil Kies), Eiswelt
  Schnee (steil Pulver), Vulkan Fels (steil Kies), Asche und Mond Erde (steil Kies), Kristall Fels. Am Ufer Wasser (Eiswelt Matsch).
  Stege und Landefeld der Basis Metall, Stadt Beton.
- **Schiffe und Stationen** (`interior.ts`): Schiff Metall, Station Beton, Hangar und Lager Metall, Quartiere Teppich, Bars Holz;
  der Frachtraum mit Gitterboden behält `step_grate`.
- **Minen** (`dungeon.ts`): Fels.
- Sprung: Absprung und Aufkommen sind hörbar (Aufkommen lauter, je tiefer der Fall). Geduckt sind Schritte leiser.

## Lehnen

- **Q** lehnt nach links, **E gehalten** nach rechts (erst nach 0,15 s, und nur wenn nichts zum Benutzen in Reichweite ist, damit E weiter
  „benutzen“ bleibt). Auf Planeten und in Minen, nicht im Sprint und nicht im Sprung.
- Kamera: Augen bis 0,45 m zur Seite und 6 cm tiefer, Bild bis 11° geneigt. In der Außensicht rückt die Kamera mit, kaum Neigung.
- Figur: die drei Wirbel neigen sich zusammen um bis 18° zur Seite (Ich- und Außensicht).
- Wände, Deckungen der Plünderer, Bäume und Körper begrenzen, wie weit es geht.
- Kampf: Geschossen wird aus der geneigten Kamera. Die Plünderer sehen den Kopf an der geneigten Stelle und treffen gelehnt seltener (×0,6);
  die Drohnen in den Minen zielen ebenfalls auf den Kopf.
- Code: `src/game/lehnen.ts` (`updateLehnen`, `lehnKamera`, `lehnFigur`, `lehnKopf`). Stellschrauben oben in der Datei: `WEIT`, `TIEF`, `NEIG`, `KOERPER`.
- Steuerungsleiste zu Fuß zeigt „Q / E halten · Zur Seite lehnen“ in den ersten Minuten und im Kampf; Esc → Steuerung erklärt es.

## Geprüft

- Typprüfung, Bau, `node scripts/kitest.mjs` bestanden. Neigung der Figur in Node nachgerechnet (Kopf geht zur richtigen Seite, die Neigung
  summiert sich nicht auf, wenn keine Animation die Knochen neu setzt).
- **Nicht angesehen und nicht angehört** (der Cloud-Rechner kann nicht rendern und hat keinen Ton): Lautstärke der Untergründe zueinander,
  wie das Lehnen in Ich- und Außensicht aussieht, ob die Neigung der Manny-Figur zur Haltung passt.

## Offen

- Mitspieler sehen das Lehnen der anderen noch nicht (wird nicht übers Netz geschickt). Schritte der Mitspieler, Stadtwachen und Plünderer
  nutzen die Untergründe noch nicht.
- Untergrund nach dem Bodenbild an der Stelle (Pfützen, Kiesflächen) statt nur nach Hang; Holzstege in alten Minen (Old-Mine-Baukasten).
- Rutschen, Klettern und Hinlegen aus dem Paket wären weitere Schritte, wenn gewünscht.
