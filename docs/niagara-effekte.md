# Effekte aus dem Niagara Examples Pack (seit 27.11.2026)

Epics Fab-Paket **Niagara Examples Pack** (`Downloads\Niagara Examples Pack-0e188eca`, 1 GB, nur `.uasset`). Die Niagara-Systeme
laufen nur in Unreal. Übernommen sind ihre **Bildfolgen** (Flipbooks) und ihr **Aufbau** als Vorlage für eigene Teilchen.
Lizenz: Fab-Standardlizenz, außerhalb von Unreal nutzbar (Prüfung durch Face).

## Woher

1. `Content\NiagaraExamples` nach `C:\EXTRA\UnrealProjects\FirstPerson\Content\NiagaraExamples` kopiert (UE 5.8).
2. `scripts/ue/niagara_export.py` im Editor **mit Fenster** (`UnrealEditor.exe … -ExecutePythonScript=…`). Ergebnis flach in
   `Downloads\NiagaraExport\` (Texturen, 14 Meshes als FBX/GLB, `materialien.txt` mit den Parametern aller Material-Instanzen).
   - `TextureExporterPNG` fest vorzugeben stürzt ab (Assertion `SupportsTexture`). Das Skript lässt Unreal den Exporter wählen.
   - Die Flipbooks (16-Bit-Gleitkomma) kommen nur als EXR. `python3 scripts/niagara-exr.py` macht daraus 8-Bit-PNG.
3. `node scripts/build-niagara.mjs`: verkleinert, schreibt `asset-src/tex-world/fx_ng_*.png` und trägt sie in die Paketliste ein
   (Paket world, 10 Bilder, 4,2 MB).

| Bild | Quelle | Raster | Verwendung |
|---|---|---|---|
| `fx_ng_expl` (2048) | T_Explosion_EOO | 8 × 8, einmal | Feuerball, der zu Rauch wird |
| `fx_ng_wide` (2048) | T_ExplosionWide_EOO | 8 × 16, einmal | Erdwurf am Boden |
| `fx_ng_fire` | T_FireRoil_EOO_Loop | 8 × 8, Schleife | Flammen (Explosion, brennende Stelle) |
| `fx_ng_smoke` | T_SmokePuff_EOO_Loop | 8 × 8, Schleife | Rauchsäule |
| `fx_ng_dust` | T_SmokePuffLight_EOO_Loop | 8 × 8, Schleife | Einschlagstaub, Rauchfahne des GW-40 |
| `fx_ng_mflame` | T_MuzzleFlash | 4 × 1 | Mündungsflamme von der Seite |
| `fx_ng_mfront` | T_MuzzleFlash_Sphere | 2 × 2 | Mündungsfeuer von vorn (Welt und Ich-Sicht) |
| `fx_ng_msmoke` | T_ThinSmoke_FX | 8 × 8, einmal | Schmauch nach dem Schuss |
| `fx_ng_scorch` | ExplosionDecalMasks | 2 × 2 | Brandflecken |
| `fx_ng_hole` | BulletHole | – | Einschussloch |

Aufbau der „EOO“-Bilder (Niagara-Material `M_SmokeAndFire_Sprites`): **R** Leuchten, **G** Verschattung, **A** Deckung, B leer.
Die Normalen-Bilder sind nicht übernommen (doppelte Größe; die Verschattung in G reicht für den Eindruck von Licht).

## Im Spiel (`src/game/ngfx.ts`)

- Je Bildfolge ein Objekt (`InstancedBufferGeometry`), die Vierecke drehen sich im Shader zur Kamera (Erdwurf nur um die Hochachse,
  Mündungsflamme entlang des Laufs). Zwischen zwei Bildern wird überblendet. Wolken werden je Bild von hinten nach vorn sortiert.
- Feuerfarbe aus dem Leuchtkanal (Glut → Gelb), Rauchfarbe je Effekt. Leuchten macht dichter (wie Niagaras „Emissive To Opacity“).
- Solange die Bilder laden, geben die Funktionen `false` zurück, und der alte Effekt erscheint (Lyra-Flipbooks, Leuchtflecken).
- Vorgeladen mit den Lyra-Bildern beim Anlegen einer Waffe (`warmFlips` → `warmNg`).

| Effekt | Funktion | Wo |
|---|---|---|
| Mündungsfeuer: Stern von vorn, Flamme entlang des Laufs, manchmal Schmauch; gedämpft nur kleiner Stern | `ngMuzzle` | Außensicht (`fieldfight.ts`, `dungeon.ts`), Plünderer (`ki/pluenderer.ts`) |
| Mündungsfeuer Ich-Sicht: zufälliges Sternbild statt Leuchtfleck | `ngVmFlash` | `fieldfight.ts`, `dungeon.ts` |
| Einschlag Boden: Staubwolke + Nachwolke; Metall: dunkler Rauchstoß zu den Funken | `ngImpact` (aus `footfx.ts impact`) | überall, wo `impact` läuft |
| Einschussloch (64 im Umlauf) | `bulletHole` (aus `impact`, wenn eine Flächennormale bekannt ist) | Gelände und Deckungen (Planet), Boden und Felswände (Mine) |
| Explosion am Boden: Feuerball, Flammenstoß, Erdwurf, vier Rauchwolken, Brandfleck (40 s) | `ngExplosion` (aus `grenadeFx`) | Handgranate, GW-40 |
| Explosion in der Luft: Feuerball, zwei Rauchwolken | `ngAirBlast` (aus `droneDeath`) | Drohnen |
| Rauchfahne des Geschosses | `ngTrail` | GW-40 |
| Brennende Stelle | `ngBurn` | noch nicht benutzt |

Geprüft im Testfenster (nur die Teilchen in einer leeren Szene, nicht das ganze Spiel): Explosion, Erdwurf, Rauch, Mündungsfeuer,
Einschläge mit Löchern. Im Spiel selbst noch nicht angesehen.

## Offen

- Im Spiel ansehen: Größen und Helligkeit in der Mine (dort ist es dunkel, der Rauch ist ungeleuchtet) und auf hellen Planeten.
- Rauchsäule in der Mine steigt bis über die Decke (5,4 m): dort niedriger halten.
- Exportiert, aber noch nicht genutzt: Trümmer-Meshes (Beton, Holz, Rinde, Fels) statt der grauen Klötze in `footfx.ts`,
  Glassplitter, Hülse `SM_BulletShell`, Linsenreflexe `LensFlare_01/02`, Plasma-Schwaden `T_Plasma_Wisps`, Rauchschwaden `T_Smoke_Wispy`.
- `ngBurn` für Wracks oder Lagerfeuer einsetzen.
- Nicht brauchbar: Nebelbänke (Sparse Volume Textures), Demo-Level, Mannequins, Dino.
