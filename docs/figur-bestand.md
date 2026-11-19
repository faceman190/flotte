# Spielfigur: Bestandsaufnahme (19.11.2026)

Aufgenommen in der Dev-Fassung nach Alpha 1.54, zu Fuß auf Sonnenfeld und im Hangar der Bastion, Figur „Soldat“ (gekauft, Mixamo-Gewehrclips).
Bildtafeln: `docs/bilder/figur_tp_karabiner.jpg` (Haltungen), `figur_tp_waffen.jpg` (alle Waffen, Third Person), `figur_fp_waffen.jpg`
(Ich-Sicht), `figur_tp_station.jpg` (Station). Aufnahme: eigene Kameras um die Figur (vorn, rechts, Hände), Spielkamera.

## Third Person

1. **Ohne Waffe** hält die Figur trotzdem ein großes weißes Gewehr. Ohne Waffe gilt im Spiel der Schneidbrenner; dazu passen leere Hände
   oder ein kleines Werkzeug.
2. **Stehen, Gehen, Seitwärts, Sprung, Drehen:** Das Gewehr steht schräg nach oben vor Brust und Gesicht, die linke Hand liegt nicht am
   Vorderschaft. Die entspannte Haltung („Waffe gesenkt“) passt nicht zur Waffe am Handgelenk.
3. **Anschlag:** Das Gewehr liegt auf Kinnhöhe, das Gehäuse geht sichtbar durch Kinn und Wange, der Schaft sitzt nicht an der Schulter. Der
   Oberkörper ist stark nach vorn gebeugt.
4. **Pistole** wird wie ein Gewehr gehalten (gestreckte Arme, dieselben Clips).
5. **Kein Nachladen:** Seit dem Magazin (Alpha 1.54) fällt das besonders auf.
6. **Station:** Die Figur läuft mit dem Gewehr vor der Brust durch den Hangar.

## First Person

7. **Keine richtigen Hände:** Pistole, Sturmgewehr und Splitterwerfer schweben ohne Hände; bei Flinte und Impulsgewehr liegt ein großer,
   unscharfer Tarnärmel ohne Finger direkt vor der Kamera.
8. **Lage und Größe:** Die Pistole ist zu groß und zu nah und wirkt klobig; der Splitterwerfer liegt fast ganz unter dem Bildrand.
9. **Ohne Waffe** zeigt die Ich-Sicht das Sturmgewehr statt des Schneidbrenners (dieselbe Lücke wie Punkt 1).
10. **Keine Bewegung:** Beim Gehen wippt die Waffe nicht, beim Schuss ist kaum Rückstoß zu sehen, beim Nachladen passiert nichts.

## Fehler nebenbei

11. Nach der Rückkehr vom Planeten in die Station bleibt das Waffenmodell der Ich-Sicht im Bild stehen, auch in der Außensicht
    (auf der Tafel `figur_tp_station.jpg` der Splitterwerfer, obwohl das Sturmgewehr ausgerüstet ist).

## Aussehen

Die Figur selbst wirkt realistisch (Tarnanzug, Schal, Ausrüstung). Helm, Anzug und Rucksack wechseln mit der Ausrüstung. Es gibt nur eine
Figur für alle Spieler.

## Vorschlag zur Reihenfolge

1. Schnell und ohne neue Dateien: Punkt 11 (Waffenmodell bleibt stehen), Punkt 8 (Lage und Größe in der Ich-Sicht), Wippen beim Gehen und
   sichtbarer Rückstoß (Punkt 10, ohne Clips), Waffe in Stationen auf dem Rücken (Punkt 6).
2. Mit neuen Clips von Mixamo: echte Arme in der Ich-Sicht (aus dem Soldaten geschnitten, dieselben Hände wie in Third Person), Nachladen in
   beiden Ansichten, eigene Pistolenhaltung, bessere entspannte Haltung und sauberer Anschlag.
3. Ohne Waffe: leere Hände oder ein kleines Schneidbrenner-Modell (Blender).
4. Später, getrennt: eigene Spielerfiguren zur Auswahl.

## Benötigte Mixamo-Clips (für Schritt 2, auf den Soldaten geladen, „In Place“, ohne Skin)

- Gewehr: „Rifle Idle“ (gesenkt), „Rifle Aiming Idle“, „Reloading“ (stehend) und „Crouch Reload“ (falls vorhanden), „Rifle Put Away“ /
  „Draw Rifle“ (Waffenwechsel).
- Pistole: „Pistol Idle“, „Pistol Walk“ / „Pistol Run“ (falls vorhanden mit Seitwärts), „Pistol Aim“ (Pistol Idle Aiming), „Pistol Reload“.
- Ohne Waffe für Stationen: „Idle“, „Walking“, „Running“, „Standard Walk Left/Right“ und „Walk Backward“ (falls nicht schon im Paket).

## Erledigt: schnelle Punkte (19.11.2026, Dev-Fassung)

- Punkt 11: Das Waffenmodell der Ich-Sicht verschwindet, sobald man nicht zu Fuß auf einem Planeten ist (`main.ts`, `hideFieldViewModel`).
- Punkt 2 und 6 (teilweise): Außerhalb des Anschlags hält die Figur die Waffe gesenkt, schräg nach unten quer vor dem Körper (die Pistole
  steiler und mittig), auch beim Gehen und in Stationen (`gripWeapon` in `avatar.ts`, Richtung nachgemessen). Waffe auf dem Rücken in Stationen
  braucht Clips ohne Waffe (Schritt 2).
- Punkt 8: Pistole weiter weg (`p9` 0.12/−0.13/−0.36), Splitterwerfer höher (`sw` 0.12/−0.10/−0.34) in `mineArt.ts`.
- Punkt 10: `poseViewModel` (mineArt.ts) für Planet und Mine: Achterbewegung beim Gehen, deutlicher Rückstoß, Pendeln, Nachladebewegung
  (Waffe kippt und kommt zurück) als Ersatz bis zu echten Clips.
- Offen bleibt: Punkt 1/9 (ohne Waffe), 3 (Anschlag durchs Kinn), 4 (Pistolenhaltung), 5 (Nachladen in Third Person), 7 (echte Arme). Die
  Ärmel bei Flinte und Impulsgewehr stammen aus `asset-src/neu/soldier/soldat_build.py` (Arme des Soldaten in Blender per IK an die Waffe
  gelegt, Knoten `haende_<waffe>` in `Mine_Haende`): Grundlage für die echten Arme.

## Erledigt: Waffe in der Hand und Nachladen (19.11.2026, Dev-Fassung)

- Verdrehung um 70–90 Grad in Third Person (Rückmeldung des Spielers): Die Lage der Waffe an der rechten Hand stammt aus dem Zielclip
  (`weapon_rels` in soldat_anim.py); in den anderen Mixamo-Clips ist die rechte Hand anders gedreht. Jetzt liegt das Gewehr außerhalb des
  Anschlags auf der Linie von der rechten zur linken Hand (so hält der Clip es) und die Oberseite zeigt nach oben (`orientWeapon` in
  avatar.ts, auch im Anschlag). Gemessen: Lauf zu Handlinie 0,95, Oberseite zu oben 0,99.
- Nachladen in Third Person (Punkt 5): Clip „Reloading“ aus dem Basic Shooter Pack (`asset-src/neu/mixamo/basic_shooter`) mit
  `asset-src/neu/soldier/soldat_clip_neu.py` im Hintergrund auf den Soldaten übertragen (ohne offenes Blender, Aufruf im Kopf der Datei).
  Im Spiel als Oberkörper-Ebene `reload_oben`, über die Nachladezeit der Waffe gestreckt; die linke Hand folgt dabei dem Clip, das Gewehr
  bleibt auf der Handlinie von kurz vorher.
- Weitere Clips aus den Paketen (Granate werfen, Treffer, Drehungen) liegen bereit, sind aber noch nicht eingebaut. Das Pro Rifle Pack ist
  dasselbe wie das schon verwendete.
