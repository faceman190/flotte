# Kampf-Klänge und Granatwerfer (seit 27.11.2026)

Aus Epics Beispielprojekt **ShooterGame** (UE 4.27, `C:\EXTRA\UnrealProjects\ShooterGame`) übernommen: Einschlagsklänge je Material,
Körperfall, Aufsammeln und der Granatwerfer mit Modell und allen Klängen. Spiellogik und Blueprints von ShooterGame sind nicht übernommen.

## Woher

- ShooterGame braucht UE 4.27 und C++. Die Ordner `Sounds`, `Weapons` und `Effects` wurden deshalb in ein UE-5.8-Projekt
  (`C:\EXTRA\UnrealProjects\FirstPerson`) kopiert, mit ihren Originalpfaden, und dort mit `scripts/ue/shooter_export.py` exportiert
  (Ergebnis: `ShooterGame\WebExport\shooter\`, 128 WAV, Modelle als FBX und GLB, 30 Bilder, Sockets in `liste.txt`).
- Das Skelett-Modell des Granatwerfers ließ sich nur mit offenem Editorfenster exportieren (`UnrealEditor.exe … -ExecutePythonScript=…`);
  ohne Fenster stürzte der Export ab.
- Klänge: mono, auf gleiche Spitze gebracht, lange Aufnahmen gekürzt, als OGG in `asset-src/sound-lazy/` (57 Dateien, 0,8 MB, Paket world).
  Herkunft jeder Gruppe in `QUELLEN.txt`.
- Modell: `node scripts/ue/granatwerfer-glb.mjs <Weapon_Launcher.glb>` schreibt `asset-src/glb/lazy/Granatwerfer.glb` (Haut entfernt, Achsen
  wie die Lyra-Waffen, Specular-Bilder weg, WebP). Im Spiel `lazy/Granatwerfer` (0,8 MB), erst beim ersten Gebrauch geladen.

## Einschläge je Material

- `footfx.ts impact(…, stoff)`: Klang und Bild nach Material. **Boden** (Erde, Fels, Sandsäcke, Kisten), **Metall** (Drohnen, Container,
  Fässer und Wracks im Plünderer-Lager), **Wasser** (spritzt, kein Staub), **Fleisch** (Treffer an Plünderern, kein Staub).
- Planet: eigene Schüsse (`fieldfight.ts`) und die der Plünderer (`ki/pluenderer.ts`). Material der Stelle aus `FELD_EXTRA.stoff`
  (Lager-Teile nach Art, sonst Wasser, wo der Planet Flüssigkeit hat). Minen: Fels Boden, Drohnen Metall.
- Höchstens ein Einschlagsklang je 70 ms (Schrot). Solange das Paket world lädt, der alte Klang `w_x_imp`.

## Granatwerfer GW-40

- Gegenstand `waffe_gw40` beim Ausrüster (4200 Credits). Vier Granaten in der Trommel, Einzelfeuer, Feuerpause 0,8 s, Nachladen 3,4 s
  (Klänge Trommel auf und Klappe zu).
- Geschoss statt Strahl (`src/game/granatwerfer.ts`): 40 m/s, leichter Bogen (4 m/s² nach unten, auf 30 m gut 1 m), zündet beim ersten
  Kontakt mit Boden, Wand, Deckung, Drohne oder Plünderer, sonst nach 4 s. Rauchfahne und leuchtendes Heck.
- Explosion wie die Granate (Feuerball, Rauch, Kamerastoß), Umkreis 4,5 m, Schaden 90 in der Mitte, am Rand 30 %. Trifft auch den Schützen
  (bis 50, wenn das Ziel zu nah steht). Plünderer: über `FELD_EXTRA.blast` wie bei der Granate.
- Klänge: Abschuss (4), Flug (2), Explosion nah (5) und fern (3, ab 40 m), Nachladen.
- Modell in beiden Ansichten über den Weg der Lyra-Waffen (`lyraGuns.ts`, Art `launcher`, Kennung `gw40`); die Figur hält ihn wie ein Gewehr
  (`LYRA_HALT`). Mündung aus ShooterGames `MuzzleFlashSocket`. Keine Hülsen, keine eigenen Clips.
- Mine und Planet teilen die Umgebung mit der Granate (`mineEnv` in `dungeon.ts`, `feldEnv` in `fieldfight.ts`).

## Sonst

- **Körperfall**: Ein Plünderer schlägt hörbar auf, wenn seine Todesbewegung den Boden erreicht (0,6 s nach dem Tod; auch bei Mitspielern).
- **Aufsammeln**: Kisten in den Minen (Durchwühlen), Verbandskasten (Heilung), Fund bei einem Plünderer.

## Prüfen

- `npm run build`, `node scripts/kitest.mjs` (KI-Logiktest; Ersatz für `sfxAny` in `scripts/kitest/stub.mjs`).
- Flugbahn ohne Bild geprüft (Wand in 25 m nach 0,62 s, Gegner in 15 m nach 0,35 s, vor die Füße: Eigenschaden).
- Nicht im Spiel angesehen oder angehört. Zu prüfen: Lage des Werfers in der Hand und in der Ich-Sicht (`LYRA_SPEC.launcher`: `view`, `ads`),
  Lautstärken.

## Offen

- Mitspieler sehen das Geschoss nicht fliegen (nur die Explosion trifft ihre Gegner über die bisherigen Nachrichten). Für Koop ein eigenes
  Ereignis nötig.
- Die Plünderer könnten den Werfer selbst tragen (seltene Rolle „Grenadier“).
- Kein Symbol im HUD und kein gerendertes Bild beim Ausrüster (`hud_ly_launcher`, `img`).
- Lizenz: Epic-Beispielinhalt; ob er außerhalb der Unreal Engine genutzt werden darf, ist wie bei Lyra vom Projektinhaber zu prüfen.
