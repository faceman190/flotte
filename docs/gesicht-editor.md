# Gesichts-Editor

Stand 27.11.2026: Stufe 1 als Testseite, noch nicht im Spiel. Plan: Claude Doc „Plan: Gesichts-Editor für die Spielerfigur“.

## Testseite

`/gesicht.html` (auch auf test.letztecrew.de/gesicht.html). Kopf drehen mit der Maus, rechts die Regler. three.js kommt dort vom CDN
(jsdelivr, three 0.170.0), damit die Seite ohne Build läuft. Der Link merkt sich das Gesicht (`#g=<Code>`).

## Grundkopf

- Quelle: MetaHuman „Charaktererstellung“ aus dem UE-Projekt `C:\EXTRA\UnrealProjects\MetaHuman`, neu gerigged mit Blendshapes und als
  „Cinematic“ exportiert (`WebExport\metahuman_lod0`, Arbeitskopie `WebExport\_work`).
- Web-Kopf per Blender-Skript (`Charaktererstellung\Skripte\gesicht_00` bis `gesicht_04`, Ausgabe `WebExport\gesicht_web`): Manny-Skelett
  (161 Knochen), alle Gesichtsknochen auf `head`, Kopf auf Mannys Kopfknochen verschoben (MetaHuman saß 47 mm höher).
- `public/gesicht/kopf_mh.glb`: Haut, Augen, Zähne, Augenhülle, Wimpern, Tränenflüssigkeit; 16 Kopfform-Morphs `form_*` (Hals bleibt
  unverändert) und 12 Mimik-Morphs `mimik_*` (Näherung aus Gelenkbewegung plus MetaHuman-Korrekturform).
- `public/gesicht/haar_haare|bart|schnurrbart|brauen.glb`: Haarkarten an `head`, Atlas in Graustufen (Farbe aus dem Material), mit den
  vom Kopf übertragenen Morphs (nur die mit Wirkung).
- Packen: `node scripts/pack-gesicht.mjs <Quellordner> public/gesicht` (Meshopt, WebP bis 2048): 56 MB → 7,7 MB.

## Speicherformat (Entwurf)

Version, 16 Regler (je ein Byte, −100…100 als 0…200), Hautton, Haarfarbe, Teile als Bits, als URL-sicheres Base64 (26 Zeichen).
Kommt später nach `P.gesicht` und ins Netzfeld `g`.

## Offen

- Halsansatz: Der MetaHuman-Hals ragt an den Schultern aus Mannys Körper (spine_05 liegt 69 mm tiefer als bei Manny); kürzen oder an den
  Körper anpassen, Kopf und Hals des Körpers ausblenden.
- Hautton ist nur eine Vorschau (Grundfarbe multipliziert); Stufe 2: entsättigte Grundtextur, Farbleiste, Narben und Tattoos als Ebenen.
- Haarkarten werden ausgestanzt (alphaTest 0,22), wirken dadurch strähnig; ggf. später sortiert durchscheinend.
- Weitere Köpfe aus MetaHuman Creator als ganze Morphs (Vorlagen zum Mischen).
