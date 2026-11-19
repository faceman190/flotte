# Animationen mit Cascadeur

Stand 19.11.2026. Der Spieler animiert in Cascadeur, ich baue die Clips ins Spiel ein. Startdateien liegen im OneDrive-Ordner
`Dokumente\Blender\Cascadeur_Soldat` (erzeugt mit `asset-src/neu/soldier/soldat_cascadeur.py`, Hintergrundlauf in Soldat.blend).

## Die Dateien

| Datei | Inhalt |
|---|---|
| `Soldat.fbx` | Soldat in Ruhelage, ohne Waffe |
| `Waffe_Gewehr.fbx` | Sturmgewehr AR-39 als eigenes Objekt mit eigenem Skelett: ein Knochen `root` am Griff, zeigt zur Mündung (0,44 m) |
| `Waffe_Pistole.fbx` | Dienstpistole P-7, ebenso (Knochen `root`, 0,11 m) |
| `Waffe_SMG.fbx` | Maschinenpistole des Spielers (aus `SMG_Final.fbx`, 0,80 m mit Schalldämpfer und Schaft), ebenso: Knochen `root` am Griff, zeigt zur Mündung (0,51 m); dazu ein zweiter Knochen `magazin` (Kind von `root`), damit sich das Magazin beim Nachladen lösen lässt |
| `Vorlage_Gewehr_Anschlag.fbx` | heutige Zielhaltung als Ausgangspunkt (Clip „aim“, ohne Waffe) |
| `Vorlage_Gewehr_Ruhe.fbx` | heutige Ruhehaltung als Ausgangspunkt (Clip „idle“, ohne Waffe) |

Skelett des Soldaten: 53 Knochen mit denselben Namen wie das Unreal-Mannequin (`pelvis`, `spine_01` … `spine_03`, `neck_01`, `head`,
`clavicle_l/r`, `upperarm_l/r`, `lowerarm_l/r`, `hand_l/r`, Finger, `thigh_l/r`, `calf_l/r`, `foot_l/r`, `ball_l/r`). Größe 1,82 m.
Die Waffen stehen genau dort, wo sie in der Ruhelage in der rechten Hand liegen (Lage wie im Spiel): Soldat und Waffe in dieselbe Szene
importieren, dann passt beides; in Cascadeur hängt man die Waffe an die rechte Hand und kann sie zum Nachladen oder Wegstecken lösen.
Der Kopf hat in der FBX keine Textur (spielt fürs Animieren keine Rolle). Die SMG ist schlicht grau: ihre Texturen
(`Low_Gun_*.png`, `Low_Scope_*.png`) stecken nicht in der FBX und liegen nicht im Ordner; fürs Spiel brauche ich sie später. Bei einem Import zurück in Blender zeigt der Waffenknochen 1 m
Länge; das ist nur die Darstellung des Blender-Imports, in der Datei ist er so lang wie die Waffe.

## In Cascadeur

1. Datei → Import → FBX: `Soldat.fbx` und eine Waffe (`Waffe_Gewehr.fbx`, `Waffe_Pistole.fbx` oder `Waffe_SMG.fbx`). Mit dem Quick-Rigging-Werkzeug das Skelett einrichten; die Namen folgen dem
   Unreal-Schema, das Cascadeur kennt.
2. Animieren. Bitte:
   - **30 Bilder pro Sekunde.**
   - **Am Platz:** Das Becken bleibt über dem Ursprung, auch bei Geh- und Laufschleifen (das Spiel bewegt die Figur selbst).
   - Blickrichtung wie in der importierten Datei lassen.
   - Bei Gewehr und Pistole: die linke Hand an den Vorderschaft bzw. unter die rechte Hand (das Spiel legt sie sonst per Rechnung hin).
   - Schleifen (Gehen, Laufen, Ruhe): erstes und letztes Bild gleich.
3. Datei → Export → FBX, je Clip eine Datei, Name wie in der Liste unten. Die Bewegung der Waffe (Knochen `root`) bitte mit exportieren,
   wenn sie sich von der Hand löst (Nachladen, Wegstecken); sonst reicht der Soldat. Ablage: `Dokumente\Blender\Cascadeur_Soldat\fertig`.

## Wunschliste (in dieser Reihenfolge)

| Clip-Name | Waffe | Schleife | Was |
|---|---|---|---|
| `aim`, `caim` | Gewehr | ja | Anschlag stehend und geduckt: Schaft an der Schulter, Wange am Schaft (heute geht das Gewehr durchs Kinn) |
| `p_idle`, `p_aim` | Pistole | ja | Ruhe (Pistole gesenkt, beide Hände) und Anschlag |
| `p_walk_f`, `p_walk_b`, `p_walk_l`, `p_walk_r` | Pistole | ja | Gehen vor, zurück, links, rechts (ca. 1,8 m/s) |
| `p_run_f` | Pistole | ja | Laufen vor (ca. 4,5 m/s) |
| `p_reload` | Pistole | nein | Nachladen, etwa 1,5 s |
| `u_idle`, `u_walk_f`, `u_walk_b`, `u_walk_l`, `u_walk_r`, `u_run_f` | ohne | ja | ohne Waffe für Stationen und Hangars |
| `holster`, `draw` | Gewehr | nein | Gewehr auf den Rücken nehmen und wieder ziehen, je etwa 1 s |

Die Ich-Sicht braucht keine eigenen Dateien: Die Arme dort sollen aus denselben Clips kommen (Kamera im Kopf, Arme aus dem Soldaten).

## Rückweg ins Spiel (meine Seite)

Clips aus Cascadeur sitzen schon auf dem Skelett des Soldaten, die Umrechnung von Mixamo entfällt.

- **Direktmodus** in `soldat_clip_neu.py` (seit 19.11.2026): `<name>=direkt:<fbx>[@<waffe>]`, Hintergrundlauf in Soldat.blend. Je Knochen wird
  die Drehung gegenüber der Ruhelage übernommen (in Weltachsen, so stört eine andere Knochenrolle nach dem FBX-Umweg nicht), das Becken samt
  Verschiebung. Mit `@<waffe>` misst das Skript aus dem Waffenknochen `root` die Lage der Waffe zur rechten Hand (`weapon_in_hand`) und die
  der linken Hand in der Waffe (`grip_left`, für `GRIP` in `avatar.ts`). Danach `npm run assets`.
- **Erster Clip:** `Spieler-Idle-SMG.fbx` → `s_aim` (94 Bilder, Schleife). Geprüft: Becken, Hände und Kopf liegen nach dem Übertragen auf
  4–6 mm genau wie in der Datei. Im Spiel der Anschlag mit der SMG im Stand (Kampf oder nach einem Schuss); in Ruhe ist die SMG gesenkt
  (Gewehr-Clip `idle`), beim Gehen gelten die Gewehr-Gangarten, im Anschlag beim Gehen der Oberkörper aus `s_aim`.
- **SMG im Spiel:** Gegenstand `waffe_smg` „Maschinenpistole SM-4“ (ungewöhnlich, 1300 Cr, Schaden 11, Ausrüster), Magazin 40, Nachladen 1,6 s,
  Dauerfeuer alle 0,075 s. Modell `Mine_W_smg.glb` aus `asset-src/neu/soldier/smg_glb.py` (Visierglas als eigener Knoten). Texturen fehlen
  noch: bis dahin schlichtes Grau (`plain` in `WDEFS`, wechselt von selbst, sobald `waffe_smg_col/_nrm/_orm` da sind). Ich-Sicht ohne Hände
  (wie Pistole und Splitterwerfer).
- **Gefunden:** Die Knochen der Figur behalten im glTF die Achsen aus Blender. Richtig ist deshalb Waffe = Hand · R · CI; das Spiel hängt die
  älteren Waffen mit C · R · CI an und dreht sie danach mit `orientWeapon` auf die Handlinie oder den Blick. Die SMG nutzt die richtige
  Formel (`raw` in `WDEFS`) und liegt im Anschlag genau wie im Clip. Die älteren Waffen umzustellen wäre eine eigene Prüfung (vermutlich der
  Grund für das frühere „70–90 Grad verdreht“).
- Testhelfer: `scripts/figtest.js` (nach `probelauf.js` und `ph2test.js`: `await __fig()`, `T.drive(sec, {...})`, `T.shot(name, cam, ziel)`).
