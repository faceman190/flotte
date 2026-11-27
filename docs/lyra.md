# Lyra-Paket: Waffen, Haltung, Zielkamera, Effekte, Anzeige und Geräusche zu Fuß

Stand 24.11.2026. Quelle: `lyra_paket.zip` im OneDrive-Ordner `Blender` (Inhalte aus Epics **Lyra Starter Game**, in Unreal
exportiert und für three.js aufbereitet; die README des Pakets beschreibt den Aufbau). Lokale Kopie: `asset-src/neu/lyra`
(nicht im Repository). Grundlagen der Figur: [manny.md](manny.md).

## Was im Spiel ist

Alles gilt zu Fuß auf Planeten und in Minen. In Stationen, Schiffen und Städten bleibt die Figur unbewaffnet.

### Vier neue Gegenstände beim Ausrüster (jede Station führt sie)

| Gegenstand | Kennung | Werte |
|---|---|---|
| Pistole SP-12 | `waffe_sp12` | 12 Schuss, Einzelfeuer alle 0,16 s, Schaden 10, ab 20 m halbe Wirkung |
| Kampfgewehr KG-30 | `waffe_kg30` | 30 Schuss, Dauerfeuer alle 0,12 s, Schaden 15, ab 28 m halbe Wirkung |
| Trommelflinte TF-8 | `waffe_tf8` | 8 Schuss, 9 Kugeln alle 0,5 s, Schaden 22 je Schuss, ab 6 m schwächer |
| Splittergranate | `vb_granate` | Wurf mit **G**, zündet nach 2,3 s, Umkreis 5,5 m, trifft auch den Werfer; Stapel 6 |

Magazingröße, Feuerrate, Kugelzahl, Schadensabfall und Streuung stammen aus `lyra.json`; den Schaden legt das Spiel fest (im Paket
ist er leer). Die drei Waffen haben in **beiden Ansichten** Lyras Modell: in der Außensicht an der Hand der Figur, in der Ich-Sicht
vor der Kamera (ohne Hände – für diese Waffen gibt es keine gestellten). Der Verschluss bewegt sich je Schuss, beim Nachladen fällt
das Magazin heraus.

**Streuung nach Hitze** (nur diese drei Waffen, `footgun.ts` `HEAT`): Jeder Schuss erzeugt Hitze, die Hitze öffnet die Garbe; nach
einer kurzen Pause kühlt die Waffe ab. Zielen, Stillstehen und Ducken verengen, Springen weitet. Beim Gewehr und der Pistole sitzt der
erste Schuss aus dem Stand fast genau. Das Fadenkreuz zeigt die Streuung in beiden Ansichten: Es geht im Dauerfeuer auf und beim
Zielen zusammen.

### Für alle Waffen zu Fuß

| Was | Woher im Paket |
|---|---|
| Haltung der Figur: Waffe gesenkt, im Anschlag, geduckt; Zielen nach oben, unten, zur Seite | `MM_<…>_Idle_Hipfire`, `_Idle_ADS`, `_Crouch_Idle`, Zielposen `…_AO_…` |
| Rückstoß, Nachladen, Waffe ziehen, Treffer, Granatwurf | `MM_<…>_Fire`, `_Reload`, `_Equip`, `MM_HitReact_…`, `MM_Rifle_GrenadeToss` |
| **Zielen** (rechte Maustaste halten), beide Ansichten | `lyra.json` `camera_ads`: Überblenden 0,22 s, Sichtfeld im Verhältnis 80° → 70° |
| Ich-Sicht beim Zielen: Waffe in der Bildmitte, Visier auf Augenhöhe | – |
| Streuung beim Zielen auf 65 % (Waffen ohne Hitze-Modell) | `lyra.json` `spread.mult.Aiming` |
| **Effekte:** Staubwolke am Einschlag, Feuerball bei zerstörter Drohne und Granate | `textures/effects`: Squib-Flipbook (14 × 14), Explosions-Flipbook (8 × 8) |
| **Anzeige:** Fadenkreuzpunkt, Treffermarke, Munitionssymbol, Abschüsse in Folge, Granatenzähler | `textures/hud` |
| **Geräusche:** Zielen ein/aus, Waffenwechsel, Einschlag, eigener Treffer, Abschuss, Geschoss fliegt vorbei, Granate | `audio/foley_misc`, `impacts`, `whizbys`, `grenade` |
| Kamerastoß bei eigenem Treffer, beim Schuss einer Flinte, bei einer Granate in der Nähe | – |

Die älteren Waffen (Dienstpistole, Sturmgewehr AR-39, SM-4, Enterflinte, Impulsgewehr, Splitterwerfer) behalten ihre Modelle in
beiden Ansichten und ihre Werte; die Figur trägt sie mit Lyras Haltungen (`mannyAvatar.ts`, `HOLD`). Pistole, AR-39 und Enterflinte
schießen und laden mit Lyras Aufnahmen, die SM-4 behält die eigene Schussaufnahme, die Energiewaffen den Laserton.

### Waffe gesenkt, wenn nicht gezielt wird (seit 24.11.2026)

| Lage | Haltung |
|---|---|
| Stehen, ruhig | Hüfthaltung, der Lauf zeigt auf den Zielpunkt. In der Ich-Sicht sinkt sie nach 1,4 s ohne Schuss um 7°; in der Außensicht seit 27.11.2026 nicht mehr (vorher 16°) |
| Joggen und Sprinten | Tragehaltung: Waffe quer vor dem Körper, rund 20° nach unten (`MM_Rifle_Jog_Fwd`, `MM_Pistol_Jog_Fwd`) |
| Zielen, Schuss, Nachladen, Granatwurf | Waffe sofort oben; nach einem Schuss bleibt sie 0,9 s oben, auch im Lauf |

Eigene Sprint-Clips mit Waffe hat das Paket nicht: Der Sprint nutzt denselben Clip, etwas schneller abgespielt. In der Ich-Sicht wird
die Tragehaltung nur zu 50 % (Joggen) bis 68 % (Sprint) eingemischt – voll getragen läge die Waffe unter dem Bildrand.
Einstellwerte: `WeaponLayer.js` `TUNE` (`carry…`, `lowReady…`).

### Schuss, Fadenkreuz und Lauf (seit 27.11.2026)

Der Nutzer am 27.11.2026: „Die waffe zeigt nicht immer dort hin wo das crosshair ist in third person, schüsse sind ab und zu sehr schräg,
nicht da wo das crosshair hinzeigt und nicht in verlängerung des laufs, kommen ab und zu neben dem lauf. in first person auch, schießt
teilweise nicht da hin wo kimme und korn oder crosshair zeigen.“

Was falsch war und was jetzt gilt (Planet `fieldfight.ts` und Mine `dungeon.ts` gleich):

| Fehler | Ursache | Jetzt |
|---|---|---|
| Einschlag neben dem Fadenkreuz (Außensicht) | Der Schuss lief vom Kopf der Figur in Blickrichtung; die Kamera steht 0,45 bis 0,58 m rechts über der Schulter | Zielstrahl von der Kamera durch die Bildmitte (`footgun.ts` `ZIEL`, `zielStrahl`). Er beginnt auf Höhe der Figur: Was zwischen Kamera und Figur liegt, wird nicht getroffen |
| Kugeln außerhalb der angezeigten Streuung | Nick- und Gierwinkel wurden einzeln gewürfelt (ein Quadrat, Ecken 41 % außerhalb) | Kegel wie in Lyra (`spreadDir`, Abstand von der Mitte = Zufall ^ `exponent`): jede Kugel bleibt im Kreis des Fadenkreuzes |
| Einschlag im Bild des Schusses unter dem Fadenkreuz | Die Kamera sprang im selben Bild um den Rückstoß nach oben | Der Rückstoß der Kamera setzt ein Bild später ein (`kickView`) |
| Leuchtspur neben dem Lauf | Sie begann an der Mündung des vorigen Bildes; in der Ich-Sicht wird die Figur erst nach der Kamera verschoben | Die Endpunkte warten (`footfx.ts` `shotTrail`), die Kamerafunktion setzt die Spur an die Mündung des gezeigten Bildes (`shotFlush`) |
| Leuchtspur nicht in Verlängerung des Laufs | Lyras Haltungen richten die Waffe nur ungefähr nach dem Blick (gemessen 1 bis 11° daneben); beim Laufen war sie im Bild des Schusses noch gesenkt | `mannyAvatar.ts` `fitGun` dreht die Brust samt Armen, bis der Lauf von der Mündung auf den Zielpunkt zeigt. Ein Schuss hebt die Waffe im selben Bild aus der Tragehaltung. Der Rückstoß der Figur beginnt ein Bild später (Pistole und Flinte begannen voll ausgelenkt, 6 bis 9°) |
| Ich-Sicht: Kimme und Korn zeigen woanders hin | Im Kampf (nach einem Schuss 3,5 s lang) nahm die Figur die Zielhaltung ein, ohne dass das Visier auf die Blickachse gerückt wurde; die Visierhöhen von Gewehr und Flinte stimmten nicht | In der Ich-Sicht gibt es die Zielhaltung nur noch mit der rechten Maustaste, und das Visier rückt mit der Haltung selbst vor das Auge (`mannyFirstPerson`, `WeaponLayer.aimW`). Visierhöhen am Bild abgeglichen (`lyraGuns.ts` `ads`): Gewehr 154,5 mm, Pistole 121 mm, Flinte 145 mm |

Außensicht zusätzlich: Vom Kopf der Figur wird der Weg zum Zielpunkt geprüft. Steht dort eine Wand oder ein Gegner (die Kamera sieht über
die Schulter an einer Kante vorbei, die Waffe nicht), trifft die Kugel das.

Mit der Arbeit der anderen Sitzung zusammengeführt (Niagara-Effekte, GW-40, Lehnen): Das neue Mündungsfeuer entsteht an der Mündung des
gezeigten Bildes; der Granatwerfer richtet sein Geschoss auf den Punkt unter dem Fadenkreuz (mindestens 12 m, in der Mine 8 m weit);
gelehnt (Q / E) gilt der zur Seite gerückte Kopf, und die Figur lehnt, bevor der Lauf ausgerichtet wird (`Drive.vorFit`).

Steht die Figur dicht an einer Wand (Einschlag unter 1,5 m vor der Mündung), gibt es keine Leuchtspur: So nah kann der Lauf nicht mehr auf
den Einschlag zeigen.

Gemessen im Testfenster (`scripts/schusstest.js`, Winkel in Grad; „Fadenkreuz“ von der Kamera des gezeigten Bildes aus):

| | vorher | jetzt |
|---|---|---|
| Fadenkreuz ↔ Einschlag, Außensicht, erster Schuss im Stand | 1,0 bis 5,1 (Boden in 6 bis 15 m) | 0,01 bis 0,12 (Streuung des ersten Schusses 0,10 bis 0,15) |
| Fadenkreuz ↔ Einschlag, alle Fälle | – | immer unter der Streuung des Schusses |
| Lauf ↔ Leuchtspur, Gewehr | 1 bis 11 (so weit dreht `fitGun` nach) | 0,1 bis 1,4 |
| Lauf ↔ Leuchtspur, Pistole und Flinte | 6 bis 9 dazu aus dem Rückstoß | 0,1 bis 1,4 |

Bilder: `docs/bilder/schuss-aussensicht.jpg`, `docs/bilder/schuss-ichsicht.jpg` (Bild des Schusses, die Spur beginnt an der Mündung).

Nicht geändert: Die älteren Waffen des Spiels haben keine echte Visierung, beim Zielen in der Ich-Sicht schaut man knapp über das Modell.
Mitspieler und Wachen richten ihre Waffe weiter nur nach den Haltungen.

## Wie es gebaut ist

- **Lyras Waffen** (`src/game/lyraGuns.ts`): Zuordnung Gegenstand → Waffe (`LYRA_ITEM`), Lage und Mündung (`LYRA_SPEC`), Laden beim
  ersten Gebrauch, je Ansicht eine eigene Kopie, `driveLyraGun` für Verschluss und Magazin. Dateien `lazy/LyraGewehr`, `LyraPistole`,
  `LyraFlinte`, `LyraGranate` (zusammen 1,5 MB).
- **Oberkörper** aus den Lyra-Clips, Beine und Becken weiter aus dem Game Animation Sample (`src/game/manny/WeaponLayer.js`, nach dem
  Mixer, vor den weichen Übergängen). Im Stand behält die Brust die Haltung des Clips; beim Laufen folgt sie der Hüfte zu 20 %, im
  Sprint und in der Luft überwiegend.
- **Waffe am Knochen `weapon_r`** (x = Lauf, z = oben). `WeaponLayer.mount` ist der Rahmen des Knochens (Lyras Waffen hängen dort
  unverändert), `WeaponLayer.socket` dreht die Modelle des Spiels dorthin und hebt sie auf die Höhe von Lyras Lauf (`BORE`); deren
  linke Hand führt eine Zwei-Knochen-IK an den Vorderschaft.
- **Ich-Sicht** (`mineArt.ts`): `buildViewModel` baut für `lyg`, `lyp`, `lyf` das Lyra-Modell; `poseViewModel` führt die Waffe beim
  Zielen in die Bildmitte (`ads`) und treibt die Clips der Waffe.
- **Zielen, Hitze, Rückmeldungen** (`footgun.ts`): `AIM`, `aimUpdate`, `aimFov`, `gunSpread`, `gunFalloff`, `camShake`, `hurtSound`,
  `noteKill`, `whiz`. Kamera der Außensicht beim Zielen: 64 % des Abstands, weiter über die Schulter (`avatar.ts`, `tpCamPos`).
- **Granate** (`granate.ts`): Flugbahn mit Abprallen, Zündung, Schaden. Die Umgebung (Boden, Wände, Gegner) gibt der Aufrufer mit:
  `fieldfight.ts` `fieldGrenade`, `dungeon.ts` `dungeonKey`.
- **Flipbooks** (`footfx.ts`, `flip`): je Effekt ein Viereck zur Kamera, Bilder der Reihe nach; der Feuerball mischt die Farbkanäle
  im Shader (Rauch in Rot, Feuer in Grün, Deckung in Alpha).
- **Anzeige** (`ui/footHud.ts`): `drawFootCross` und die Symbole in `drawFootRing`. Bilder der neuen Gegenstände im Inventar und beim
  Ausrüster: Lyras Umrisse (`gear.ts` `img`, `ui/icons.ts`), weil sie nicht im Bildbogen aus Blender stehen.

## Packen

- Clips: `scripts/clipset.mjs` (`LYRA`) wählt 94 Clips, `node scripts/build-clips.mjs` packt sie in `asset-src/lazy/Bewegungen.lca`
  (nur Oberkörper, zusammen 0,4 MB).
- Waffen: `asset-src/glb/lazy/Lyra*.glb`, `node scripts/build-manny.mjs LyraGewehr LyraPistole LyraFlinte LyraGranate`.
- Geräusche, Effekte, Symbole: `node scripts/build-lyra.mjs` (67 Aufnahmen nach `asset-src/sound-lazy`, 14 Bilder nach
  `asset-src/tex-world`, Eintrag in die Paketliste; Paket **world**). Zusammen 1 MB.

## Prüfen

- `(0, eval)(await (await fetch('/scripts/waffentest.js')).text()); await __waffe();` – Figur mit Waffe und Lampe im Hangar.
- `await __feld('waffe_kg30', false)` – echter Ablauf zu Fuß auf Eisgarten (zweiter Wert: Außensicht), dann `tk(n)` und `show()`.
- `(0, eval)(await (await fetch('/scripts/schusstest.js')).text()); __schuss()` nach `__feld`: je Fall (Stand, Zielen, Laufen, beide Sichten)
  Winkel Fadenkreuz ↔ Einschlag und Lauf ↔ Leuchtspur.
- Gemessen: Rückstoß der Figur 4,5 cm in zwei Bildern; Sichtfeld beim Zielen 62,5° statt 72°; Streuung des KG-30 aus dem Stand
  0,15° für den ersten Schuss, nach 24 Schuss Dauerfeuer 3° nach jeder Seite, nach 2 s Pause wieder wie am Anfang.

## Nicht übernommen (Stand 24.11.2026)

- **Hände in der Ich-Sicht** für die drei Lyra-Waffen.
- **Medipack** (`lyra_healthpack`): kein Gegenstand zum Heilen zu Fuß.
- **Lyras Laufbewegungen mit Waffe** (rund 330 Clips): Die Beine nutzen den vorhandenen Satz.
- Tod, Nahkampf, Leerabzug, Dash, Emote, Sitzen auf der Bank.
- Einschusslöcher (`concrete_*`, `glass_*`), Trümmer-Texturen, übrige Effekt-Texturen; Schritte, Musik.
- Andere Figuren (Mitspieler, Wachen) sind weiter die Soldatenfigur; bei ihnen erscheinen die neuen Waffen als K-12.

## Lizenz

Die README des Pakets nennt die Fab Standard License. Entscheidung des Projektinhabers vom 23.11.2026: Die Standardlizenz erlaubt
die Nutzung für eigene Zwecke außerhalb der Unreal Engine und die Veröffentlichung; die Inhalte liegen deshalb im Repository und auf
dem Server. (Der Hinweis der README, das Paket gehöre nicht in ein öffentliches Repository, ist damit überholt.)
