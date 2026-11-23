# Lyra-Paket: Waffenhaltung, Schuss und Nachladen der Spielerfigur

Stand 23.11.2026. Quelle: `lyra_paket.zip` im OneDrive-Ordner `Blender` (Inhalte aus Epics **Lyra Starter Game**, in Unreal
exportiert und für three.js aufbereitet; die README des Pakets beschreibt den Aufbau). Lokale Kopie: `asset-src/neu/lyra`
(nicht im Repository). Grundlagen der Figur: [manny.md](manny.md).

## Was im Spiel ist

**Waffe in der Hand der eigenen Figur (Außensicht, Taste V).** Wo geschossen werden kann – zu Fuß auf Planeten und in Minen –
trägt die Figur die angelegte Waffe. In Stationen, Schiffen und Städten bleibt sie unbewaffnet.

| Was | Woher |
|---|---|
| Grundhaltung: Waffe gesenkt, im Anschlag, geduckt | `MM_<Rifle/Pistol/Shotgun>_Idle_Hipfire`, `_Idle_ADS`, `MM_<Rifle/Pistol>_Crouch_Idle` |
| Zielen nach oben, unten und zur Seite | Zielposen `…_AO_LU` bis `…_AO_RBD` (15 je Haltung) als Aufschlag |
| Rückstoß je Schuss | `MM_<…>_Fire`, als Aufschlag gegen das letzte Bild des Clips |
| Nachladen | `MM_<…>_Reload`, über die Nachladezeit der Waffe gestreckt |
| Waffe ziehen (beim Wechsel der Waffenart) | `MM_<Rifle/Pistol>_Equip` |
| Treffer | `MM_HitReact_…`, als Aufschlag gegen das erste Bild |
| Schuss: Knall und Nachhall | `audio/weapons_<rifle/pistol/shotgun>`: Punch-Close + Noise-…-Close |
| Nachladen: Magazin heraus, hinein, Verschluss | ClipOut, ClipIn, Bolt bzw. Slide |

Die **Waffenmodelle bleiben die des Spiels** (AR-39, K-12, IG-3, EF-2, P-9, SMG, Splitterwerfer). Welche Haltung zu welcher Waffe
gehört, steht in `mannyAvatar.ts` (`HOLD`): Gewehrhaltung für AR-39, K-12, IG-3 und SMG, Flintenhaltung für die EF-2,
Pistolenhaltung für P-9 und Splitterwerfer.

Die Geräusche gelten für die Patronenwaffen: Pistole, Karabiner, Flinte (`dungeon.ts`, `WEAP … kind`). Die SMG behält die eigene
Schussaufnahme, bekommt aber die Nachladegeräusche. Impuls- und Splitterwaffe und der Schneidbrenner behalten den Laserton.

## Wie es gebaut ist

- **Nur der Oberkörper** kommt aus den Lyra-Clips. Beine und Becken laufen weiter mit den Bewegungen des Game Animation Sample
  (Starts, Stopps, Richtungswechsel, Fußhalt bleiben, wie sie sind). `src/game/manny/WeaponLayer.js` liest die Spuren selbst aus dem
  Bewegungssatz und schreibt die Knochen ab `spine_01` direkt – nach dem Mixer, vor den weichen Übergängen (wie `PoseLayers.js`).
- **Brust im Raum der Figur:** Im Stand behält die Brust die Haltung des Clips, egal was die Hüfte tut (in Unreal: Mesh Space Rotation
  Blend). Beim Laufen folgt sie der Hüfte zu 20 %, im Sprint und in der Luft überwiegend (`MannyAnimator._applyLayers`, `_ms`),
  damit die Waffe mit dem Körper geht.
- **Waffe am Knochen `weapon_r`** (x = Lauf, z = oben; Lyra bewegt diesen Knochen in den Clips mit). `WeaponLayer.socket` dreht ein
  Modell mit Lauf nach −z und Oberseite +y dorthin. Die Waffen des Spiels haben den Nullpunkt verschieden hoch am Griff; sie werden so
  verschoben, dass ihr Lauf auf der Höhe von Lyras Lauf liegt (`BORE`, Pistolen zu 70 %).
- **Linke Hand:** Zwei-Knochen-IK an den Vorderschaft der getragenen Waffe (`HOLD … grip`: Anteil der Strecke Griff → Mündung,
  Höhe unter dem Lauf). Pistolen ohne IK. Beim Nachladen und Ziehen führt der Clip die Hand.
- **Mündung** für Leuchtspur und Mündungsfeuer: `avatarMuzzle()` in `avatar.ts` (vorher stand die Mündung der unsichtbaren
  Soldatenfigur an der falschen Stelle).

## Packen

- Clips: `scripts/clipset.mjs` (`LYRA`, `LYRA_BONES`) wählt 91 Clips; `node scripts/build-clips.mjs` packt sie mit in
  `asset-src/lazy/Bewegungen.lca`. Von den Lyra-Clips bleiben nur die Drehspuren des Oberkörpers, das Becken als Bezug und die Lage von
  `weapon_r`: zusammen 0,4 MB (der Satz wächst von 18,8 auf 19,2 MB). Diese Clips sind nicht für den Mixer gedacht (Beine in Ruhelage).
- Geräusche: 30 Aufnahmen in `asset-src/sound-lazy` (0,5 MB, Schlüssel `w_<Art>_…`), Paket **world**: geladen erst, wenn die Waffe
  angelegt ist (`audio.ts`, `gunSounds`). Nachtragen ohne ganzen Paketlauf: `node scripts/add-lazy-sounds.mjs`.

## Prüfen

Im eigenen Testfenster: `MANNY.test = { id: 'ar39', aim: true, shots: 0, hits: 0, reload: -1 }` (mannyAvatar.ts) lässt die Figur die
Waffe überall tragen, auch im Hangar. `shots++` löst den Rückstoß aus, `hits++` das Zucken, `reload` 0..1 das Nachladen.
Gemessen am 23.11.2026: Rückstoß 4,5 cm an der rechten Hand in zwei Bildern; Zielposen decken ±90° Höhe und ±180° Seite ab.

## Nicht übernommen (Stand 23.11.2026)

- **Lyras Waffenmodelle** (Gewehr, Pistole, Flinte mit Knochen und eigenen Clips, Granate, Medipack): Das Spiel hat eigene Waffen.
  Folge: Beim Nachladen fällt kein Magazin heraus.
- **Lyras Laufbewegungen mit Waffe** (330 Clips: Jog, Walk, Starts, Stopps, Pivots je Waffe): Die Beine nutzen den vorhandenen Satz.
- **Waffenwerte aus `lyra.json`** (Streuung über Hitze, Schadensabfall, Magazingrößen, Feuerrate) und die **Zielkamera** (FOV 70):
  Feuerrate, Streuung und Magazine des Spiels sind unverändert.
- Tod (`MM_Death_…`; der Sturz der Figur kommt weiter aus dem Game Animation Sample), Nahkampf, Granatwurf, Leerabzug, Dash, Emote,
  Sitzen auf der Bank, Posen.
- Übrige Geräusche (Schritte, Einschläge, Vorbeiflug, Explosionen, Oberfläche), HUD-Symbole, Effekt-Texturen.
- Andere Figuren (Mitspieler, Wachen) sind weiter die Soldatenfigur mit ihren Mixamo-Clips.

## Lizenz

Die README des Pakets nennt die Fab Standard License und hält fest, dass das Paket **nicht in ein öffentliches Repository** gehört.
Nach unserem Verständnis ist Lyra wie das Game Animation Sample Epic-Inhalt, der nur in Unreal-Engine-Produkten genutzt werden darf (siehe manny.md). Das
Repository dieses Spiels ist öffentlich und der Server baut aus ihm: Mit dem Hochladen stehen die umgewandelten Clips (in
`Bewegungen.lca`) und die 30 Aufnahmen öffentlich. Das ist vor dem Hochladen zu entscheiden.
