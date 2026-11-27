# Gesichts-Editor

Stand 27.11.2026: im Spiel bei „Neuer Pilot“ (statt Figur 1–3), dazu die Testseite. Plan: Claude Doc „Plan: Gesichts-Editor für die Spielerfigur“.

## Im Spiel

- Personalakte „Neuer Pilot“: Abschnitte Gesicht (Hautton, Augenfarbe, Zufall, Zurücksetzen), Kopfform (16 Regler in Gruppen) und
  Haare (Frisur, Bart, Schnurrbart, Brauen, Haarfarbe); `src/ui/gesichtUi.ts`, Werte und Kodierung in `src/data/gesicht.ts`.
- Nur dort wählbar (Wunsch des Spielers): Die Garderobe zeigt die Figur nur noch. Alte Spielstände ohne Gesicht wählen dort weiter
  Figur 1–3.
- Spielstand `P.gesicht` (Code), Netz: 11. Feld von `g` (Server lässt bis 48 Zeichen durch). Ist es gesetzt, gilt es statt `P.figur`.
- Figur (`src/game/figur.ts`, `Tracht.gesicht`): hautenger Anzug von Figur 3 (`lazy/Koerper3`, nur `koerper`) ohne Kopf, `neck_02` und
  Hände, die MetaHuman-Hände aus `lazy/Koerper2` (nehmen den Hautton an), Kopf `lazy/Gesicht_kopf_mh`, je Haarplatz die gewählte Datei.
  Jede Figur bekommt eigene Kopien der Materialien (Bilder bleiben geteilt) für Hautton, Iris und Haarfarbe; die Regler sind Morphs.
  Frisur verschwindet unter dem Helm. Die Vorschau blinzelt alle paar Sekunden.
- Dateien: gepackt in `asset-src/glb/gesicht/`, mit `node scripts/build-gesicht.mjs` als `lazy/Gesicht_<name>` in die Paketliste
  (Paket „lazy“, nur bei Bedarf geladen). Die Testseite lädt aus derselben Liste.

## Testseite

`/gesicht.html` (auch auf test.letztecrew.de/gesicht.html). Kopf drehen mit der Maus, rechts die Regler. three.js kommt dort vom CDN
(jsdelivr, three 0.170.0), damit die Seite ohne Build läuft. Der Link merkt sich das Gesicht (`#g=<Code>`).

## Grundkopf

- Quelle: MetaHuman „Charaktererstellung“ aus dem UE-Projekt `C:\EXTRA\UnrealProjects\MetaHuman`, neu gerigged mit Blendshapes und als
  „Cinematic“ exportiert (`WebExport\metahuman_lod0`, Arbeitskopie `WebExport\_work`).
- Web-Kopf per Blender-Skript (`Charaktererstellung\Skripte\gesicht_00` bis `gesicht_04`, Ausgabe `WebExport\gesicht_web`): Manny-Skelett
  (161 Knochen), alle Gesichtsknochen auf `head`, Kopf auf Mannys Kopfknochen verschoben (MetaHuman saß 47 mm höher).
- `kopf_mh.glb`: Haut, Augen, Zähne, Augenhülle, Wimpern, Tränenflüssigkeit; 16 Kopfform-Morphs `form_*` (Hals bleibt
  unverändert) und 12 Mimik-Morphs `mimik_*` (Näherung aus Gelenkbewegung plus MetaHuman-Korrekturform).
- `haar_haare|bart|schnurrbart|brauen.glb`: Haarkarten an `head`, Atlas in Graustufen (Farbe aus dem Material), mit den
  vom Kopf übertragenen Morphs (nur die mit Wirkung).
- Packen: `node scripts/pack-gesicht.mjs <Quellordner> asset-src/glb/gesicht` (Meshopt, WebP bis 2048): 56 MB → 7,7 MB, danach
  `node scripts/build-gesicht.mjs`.

## Frisuren, Bärte, Brauen

26 Haarkarten-Sätze aus dem MetaHuman-Plugin (UE 5.8), an den Grundkopf angepasst und gepackt (151 MB → 28,6 MB): 12 Frisuren
(`haar_frisur_*`), 6 Bärte (`haar_bart_*`), 4 Schnurrbärte (`haar_schnurr_*`), 4 Brauen (`haar_brauen_*`), dazu die vier Haare des
MetaHuman selbst. Liste und Werte: [gesicht-frisuren.txt](gesicht-frisuren.txt), Bildbogen `bilder/gesicht-frisuren.jpg`. Skripte:
`Charaktererstellung\Skripte\gesicht_05_frisuren.py` (weitere Grooms über `auswahl.json`), `ue_groom_export.py`. Grooms ohne Karten
(Buzzcut, Stoppeln) gibt es nur als aufgemalte Textur: später als Hautebene. Die Testseite lädt jede Datei erst, wenn sie gewählt wird.

## Hautton und Iris

- Hautton: Farbleiste mit 7 Stufen (sRGB), Stufe 4 = Originalhaut (Mittelwert der Textur 0,581/0,394/0,313). Der Shader multipliziert die
  Textur je Kanal mit Ziel/Original, Poren und Rötungen bleiben.
- Iris: In der Augentextur liegt die Iris grau als Ring um die UV-Mitte (Radius 0,044 bis 0,166). Der Shader färbt diesen Ring nach der
  Helligkeit um; 10 Vorgaben und ein Farbwähler.

## Speicherformat

Version, 16 Regler (je ein Byte, −100…100 als 0…200), Hautton, Haarfarbe, Irisfarbe (3 Byte), je Haarplatz die Nummer (Frisur, Bart, Schnurrbart, Brauen; 0 = ohne), als URL-sicheres Base64 (26 Byte = 35 Zeichen, Version 2).
Version 1 (frühe Testseite) wird noch gelesen.

## Offen

- Halsansatz: Der Spieler passt den Hals in Blender an (`Charaktererstellung\03_Blender\hals_anpassung.blend`, Körper koerper_01,
  Gruppen `hals_naht`, `hals_rand`, `alter_kopf`; Skript `gesicht_08_hals_datei.py`). Bis dahin sieht man am Kragen Reste des alten Halses.
  Danach Kopf und Körper neu exportieren und packen.
- Lidschlag und Mimik nur in der Vorschau, noch nicht an der Figur im Spiel.
- Narben und Tattoos als Ebenen (Stufe 2); echte Hautvarianten (Sommersprossen, Alter) als gebackene MetaHuman-Hautvorlagen.
- Haarkarten werden ausgestanzt (alphaTest 0,22), wirken dadurch strähnig; ggf. später sortiert durchscheinend.
- Weitere Köpfe aus MetaHuman Creator als ganze Morphs (Vorlagen zum Mischen).
