# Ich-Sicht mit ganzem Körper

Stand 24.11.2026. Zu Fuß gibt es nur noch **eine** Figur für beide Ansichten: dieselbe Spielerfigur, dieselben Bewegungen, dieselbe
Waffe in der Hand. Die Außensicht (Taste V) schaut ihr über die Schulter, die Ich-Sicht sitzt in ihrem Kopf. Grundlagen der Figur:
[manny.md](manny.md), Waffen und Haltungen: [lyra.md](lyra.md).

## Woher die Lösung kommt

`FirstPerson.zip` im OneDrive-Ordner `Blender` ist Unreals **First-Person-Vorlage** (UE 5.8, Blueprint). Sie arbeitet so:

- Die Figur hat **ein Skelett und eine Animation**. Das volle Netz ist für den Besitzer unsichtbar (`bOwnerNoSee`), wirft aber den
  Schatten.
- Ein zweites Netz (`FirstPersonMesh`, nur für den Besitzer) **kopiert die Pose** (`ABP_FP_Copy`: Copy Pose From Mesh). Ein Control Rig
  (`CtrlRig_FPWarp`) zieht darin die Wirbelsäule zurück und bindet den Kopf an die Kamera, damit der Körper nicht in die Kamera ragt.
- Dieses Netz wird als „First Person“ gezeichnet: mit eigenem Sichtfeld und zur Kamera hin verkleinert, damit Arme und Waffe nicht in
  Wände ragen.

So machen es viele Spiele, in denen man zwischen den Ansichten wechselt (zum Beispiel Star Citizen, ARMA, PUBG): ein Körper,
die Kamera im Kopf, dazu ein Trick gegen das Durchdringen von Wänden. Der ältere Weg – in der Ich-Sicht nur schwebende Arme mit eigener
Waffe und eigenen Bewegungen (so war es hier bis jetzt) – verdoppelt jede Waffe und jede Bewegung und passt nie ganz zur Außensicht.

Vom Inhalt des Projekts selbst ist wenig neu: Die Animationen sind eine Teilmenge des Lyra-Pakets (dazu Lauf-Clips in den Diagonalen,
ein Nahkampf-Satz, Dash, Wandsprung). Als `.uasset` lassen sie sich hier nicht lesen; sie müssten wie das Lyra-Paket aus Unreal
exportiert werden. Übernommen ist die **Methode**.

## Wie es hier gebaut ist

- **Die Figur läuft immer mit.** `onfoot.ts`, `dungeon.ts` und `interior.ts` rufen `driveAvatar` auch in der Ich-Sicht (`fp: true`),
  sobald die neue Figur geladen ist (`avatar.ts` `bodyView`). Bis dahin – und mit `?manny=0` – gilt die alte Ich-Sicht (Waffe allein
  vor der Kamera, `mineArt.ts` `buildViewModel`).
- **Kopf an die Kamera** (`mannyAvatar.ts` `mannyFirstPerson`, aufgerufen aus den Kamerafunktionen, wenn die Kamera des Bildes steht):
  Die ganze Figur wird so verschoben, dass ihr Halsansatz (`neck_01`) hinter und unter dem Auge liegt, gerechnet im Raum der Kamera
  (`FP.back`, `FP.down`). Die Kamera neigt sich also mit dem Blick um den Hals: Beim Blick nach unten wandert sie über die Brust, man
  sieht Bauch, Beine und Füße. Der Kopf wird ausgeblendet (Knochen `head` auf Größe 0,001).
- **Eigener Zeichendurchgang** (`core/engine.ts` `bodyPass`): In der Ich-Sicht liegt die Figur auf der Ebene `BODY_LAYER`. Das
  Hauptbild zeichnet sie nicht; danach wird dieselbe Szene noch einmal nur mit dieser Ebene gezeichnet, mit gelöschter Tiefe und der
  Nahgrenze 3 cm. Folgen: Arme und Waffe ragen nie in Wände, die Figur steht im Licht der Szene, und die Nahgrenze des Hauptbilds
  (0,5 m auf Planeten) schneidet die Hände nicht ab. Schatten und Lagen kommen vom Hauptbild (kein zweiter Schattendurchgang).
- **Zielen** (rechte Maustaste): Die Figur wird um wenige Grad gedreht, bis der Lauf genau in Blickrichtung zeigt, und so verschoben,
  dass die Visierlinie der Waffe durchs Auge geht (`gun.sight`, `gun.fwd`). Bei den Lyra-Waffen ist das die Kimme; bei den älteren
  Waffen der höchste Punkt des Modells (man schaut über das Zielfernrohr hinweg).
- **Mündung**: Leuchtspur und Mündungsfeuer kommen in beiden Ansichten aus der Waffe der Figur (`avatarMuzzle`).

## Kleidung (seit 24.11.2026)

Die Figur trägt jetzt, was der Pilot angelegt hat ([spielcharakter.md](spielcharakter.md)): In der Ich-Sicht sieht man Handschuhe, Ärmel,
Weste, Beine und Stiefel. Helm, Kopf und Haare hängen am Kopfknochen und verschwinden mit ihm.

## Offen

- **Kein eigener Schatten** in der Ich-Sicht (die Figur fehlt im Hauptbild und damit im Schattendurchgang).
- **Füße**: Weil die ganze Figur zum Kopf hin verschoben wird, weichen sie beim Laufen um wenige Zentimeter vom Boden ab. Unreal zieht
  stattdessen nur die Wirbelsäule zurück.
- **Kamera wippt nicht mit dem Kopf der Figur**, sondern wie bisher mit der Laufbewegung der Kapsel; Arme und Waffe bewegen sich
  dagegen. Gefühl im Spiel ungeprüft.
- **Zielen mit den älteren Waffen**: Blick über das Modell hinweg, keine echte Kimme. Bräuchte je Waffe einen Visierpunkt.
- ~~Mündungslicht und Waffenlampe der Mine~~ (behoben am 24.11.2026): Beide sitzen an der Kamera, also mitten in Hand und Waffe der
  Figur, und überstrahlten sie aus wenigen Zentimetern; die hellen Flecken wanderten mit jeder kleinen Bewegung (Flackern). Lichter mit
  `userData.noBody` beleuchten den Körper der Ich-Sicht nicht mehr (`engine.ts` `renderBody`); in der Mine bekommt er zwei eigene
  Lichter (`dungeon.ts` `bodyLamp`, `bodyFlash`; `engine.ts` `bodyOnly`).
- **Hülsenauswurf** gibt es nur in der alten Ich-Sicht.
- Tod in der Ich-Sicht: Die Figur wird ausgeblendet, die Kamera sinkt wie bisher.
