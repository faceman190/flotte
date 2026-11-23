# Lyra-Paket: Waffen, Haltung, Zielkamera, Effekte, Anzeige und Geräusche zu Fuß

Stand 24.11.2026. Quelle: `lyra_paket.zip` im OneDrive-Ordner `Blender` (Inhalte aus Epics **Lyra Starter Game**, in Unreal
exportiert und für three.js aufbereitet; die README des Pakets beschreibt den Aufbau). Lokale Kopie: `asset-src/neu/lyra`
(nicht im Repository). Grundlagen der Figur: [manny.md](manny.md).

## Was im Spiel ist

Alles gilt zu Fuß auf Planeten und in Minen. In Stationen, Schiffen und Städten bleibt die Figur unbewaffnet.

| Was | Woher im Paket |
|---|---|
| **Waffen** der Figur in der Außensicht: Karabiner, Pistole, Flinte | `weapons/lyra_rifle`, `lyra_pistol`, `lyra_shotgun` mit Knochen und eigenen Clips |
| Verschluss bewegt sich je Schuss, Magazin fällt beim Nachladen heraus | `rifle_fire`, `rifle_reload` usw. in den Waffen |
| Grundhaltung: Waffe gesenkt, im Anschlag, geduckt | `MM_<Rifle/Pistol/Shotgun>_Idle_Hipfire`, `_Idle_ADS`, `MM_<Rifle/Pistol>_Crouch_Idle` |
| Zielen nach oben, unten und zur Seite | Zielposen `…_AO_LU` bis `…_AO_RBD` (15 je Haltung) als Aufschlag |
| Rückstoß, Nachladen, Waffe ziehen, Treffer | `MM_<…>_Fire`, `_Reload`, `_Equip`, `MM_HitReact_…` |
| **Zielkamera** (rechte Maustaste halten) | `lyra.json` `camera_ads`: Überblenden 0,22 s, Sichtfeld im Verhältnis 80° → 70° |
| Streuung beim Zielen auf 65 % | `lyra.json` `spread.mult.Aiming` |
| **Effekte:** Staubwolke am Einschlag, Feuerball mit Rauch, wenn eine Drohne zerbricht | `textures/effects`: Squib-Flipbook (14 × 14), Explosions-Flipbook (8 × 8) |
| **Anzeige:** Fadenkreuzpunkt, Umriss der Waffe, Munitionssymbol, Doppel-/Dreifach-/Vierfachabschuss | `textures/hud` |
| **Geräusche:** Schuss (Knall + Nachhall), Nachladen in drei Schritten | `audio/weapons_<rifle/pistol/shotgun>` |
| Zielen ein/aus, Waffenwechsel, Einschlag, eigener Treffer, Abschuss, Geschoss fliegt vorbei | `audio/foley_misc`, `impacts`, `whizbys` |

**Welche Waffe was bekommt**

- Karabiner, Pistole, Flinte: Lyras Modell in der Hand der Figur, Lyras Schuss- und Nachladegeräusche, Umriss in der Anzeige.
- SMG, Impuls- und Splitterwaffe, Schneidbrenner: weiter die Modelle des Spiels in der Hand, mit Lyras Haltungen
  (`mannyAvatar.ts`, `HOLD`). Die SMG behält die eigene Schussaufnahme und bekommt Lyras Nachladegeräusche; die Energiewaffen
  behalten den Laserton.
- Die **Ich-Sicht** zeigt für alle Waffen weiter das Modell des Spiels mit den Händen des Soldaten. Für Karabiner, Pistole und
  Flinte sieht man also in der Ich-Sicht eine andere Waffe als in der Außensicht (offen, siehe unten).

Zielen, Fadenkreuz, Treffermarke, Kamerastoß und die allgemeinen Geräusche gelten für alle Waffen und beide Ansichten.

## Wie es gebaut ist

- **Oberkörper** aus den Lyra-Clips, Beine und Becken weiter aus dem Game Animation Sample. `src/game/manny/WeaponLayer.js` liest die
  Spuren selbst aus dem Bewegungssatz und schreibt die Knochen ab `spine_01` direkt – nach dem Mixer, vor den weichen Übergängen.
  Im Stand behält die Brust die Haltung des Clips, egal was die Hüfte tut; beim Laufen folgt sie zu 20 %, im Sprint und in der Luft
  überwiegend (`MannyAnimator._applyLayers`, `_ms`).
- **Waffe am Knochen `weapon_r`** (x = Lauf, z = oben; Lyra bewegt ihn in den Clips mit). `WeaponLayer.mount` ist der Rahmen des
  Knochens: Lyras Waffen hängen dort unverändert. `WeaponLayer.socket` dreht die Modelle des Spiels (Lauf nach −z) dorthin und
  verschiebt sie auf die Höhe von Lyras Lauf (`BORE`); deren linke Hand führt eine Zwei-Knochen-IK an den Vorderschaft.
- **Lyras Waffen** (`mannyAvatar.ts`, `LYRA`): Dateien `lazy/LyraGewehr`, `LyraPistole`, `LyraFlinte` (zusammen 1,3 MB), geladen,
  wenn die Waffe zum ersten Mal in der Hand ist; bis dahin zeigt die Figur das Modell des Spiels. Der Schuss-Clip der Waffe startet
  mit jedem Schuss, der Nachlade-Clip läuft im Takt des Nachladens der Figur.
- **Zielen, Kamerastoß, Rückmeldungen** (`footgun.ts`, unten): `AIM`, `aimUpdate`, `aimFov`, `aimSpread`, `camShake`, `hurtSound`,
  `noteKill`, `whiz`. Die Kamera der Außensicht rückt beim Zielen auf 64 % des Abstands und weiter über die Schulter
  (`avatar.ts`, `tpCamPos`). Kamerastoß nur bei eigenem Treffer und beim Schuss der Flinte.
- **Flipbooks** (`footfx.ts`, `flip`): je Effekt ein Viereck, das sich zur Kamera dreht und die Bilder der Reihe nach zeigt. Der
  Feuerball mischt die Farbkanäle im Shader (Rauch in Rot, Feuer in Grün, Deckung in Alpha).
- **Anzeige** (`ui/footHud.ts`): `drawFootCross` (Punkt, Striche im Abstand der Streuung, Treffermarke, Abschüsse in Folge) und die
  Symbole in `drawFootRing`. Lyras Symbole sind Masken in den Farbkanälen; `build-lyra.mjs` macht daraus weiße Bilder mit Transparenz.
- **Mündung** für Leuchtspur und Mündungsfeuer: `avatarMuzzle()` in `avatar.ts`.

## Packen

- Clips: `scripts/clipset.mjs` (`LYRA`) wählt 91 Clips, `node scripts/build-clips.mjs` packt sie in `asset-src/lazy/Bewegungen.lca`
  (nur Oberkörper, zusammen 0,4 MB).
- Waffen: `asset-src/glb/lazy/Lyra*.glb`, `node scripts/build-manny.mjs LyraGewehr LyraPistole LyraFlinte`.
- Geräusche, Effekte, Symbole: `node scripts/build-lyra.mjs` (58 Aufnahmen nach `asset-src/sound-lazy`, 13 Bilder nach
  `asset-src/tex-world`, Eintrag in die Paketliste; Paket **world**, geladen erst zu Fuß mit Waffe). Zusammen 0,8 MB.

## Prüfen

`(0, eval)(await (await fetch('/scripts/waffentest.js')).text()); await __waffe();` stellt die Figur mit Waffe und Lampe in den Hangar
(`WT.X.id`, `WT.X.lyra`, `shots++`, `hits++`, `reload`). Gemessen am 23.11.2026: Rückstoß 4,5 cm an der rechten Hand in zwei
Bildern; Zielposen decken ±90° Höhe und ±180° Seite ab; Sichtfeld beim Zielen 62,5° statt 72°.

## Nicht übernommen (Stand 24.11.2026)

- **Ich-Sicht mit Lyras Waffen**: Die Hände der Ich-Sicht sind je Waffe des Spiels gestellt; für Lyras Modelle gibt es keine.
- **Lyras Laufbewegungen mit Waffe** (rund 330 Clips): Die Beine nutzen den vorhandenen Satz.
- **Waffenwerte** aus `lyra.json` außer der Streuung beim Zielen: Feuerrate, Magazine, Schaden, Hitze-Streuung des Spiels sind unverändert.
- Granate und Medipack, Tod, Nahkampf, Leerabzug, Dash, Emote, Sitzen.
- Einschusslöcher (`concrete_*`, `glass_*`), Trümmer-Texturen, übrige Effekt-Texturen; Schritte, Explosionen, Oberfläche, Musik.
- Andere Figuren (Mitspieler, Wachen) sind weiter die Soldatenfigur.

## Lizenz

Die README des Pakets nennt die Fab Standard License. Entscheidung des Projektinhabers vom 23.11.2026: Die Standardlizenz erlaubt
die Nutzung für eigene Zwecke außerhalb der Unreal Engine und die Veröffentlichung; die Inhalte liegen deshalb im Repository und auf
dem Server. (Der Hinweis der README, das Paket gehöre nicht in ein öffentliches Repository, ist damit überholt.)
