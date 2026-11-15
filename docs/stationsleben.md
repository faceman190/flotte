# Leben in den Stationen (seit Alpha 1.19)

Code: `src/game/interior.ts` (Aufbau in `build`, Ablauf in `updateRoomLife`), Bewegungen in `src/models/charModels.ts`.
Gilt für alle Stationen mit Hangar und Promenade (Bastion, Außenposten, Planetenbasen). Die Städte (`city.ts`) haben ihre eigenen Läufer und sind davon nicht berührt.

## Was der Spieler sieht

- **Besorgungen:** Die Läufer gehen nicht mehr nur im Kreis. Auf der Promenade treten sie an einen Stand und reden mit dem Personal (beide gebärden
  abwechselnd, das Personal sieht den Kunden an), bleiben am Fenster stehen und sehen hinaus oder an der Galaxiekarte. Im Hangar pendelt an jeder
  Längswand jemand zwischen Tor und Rückwand und sieht nach den Wandgeräten; ein Dritter geht zwischen dem Regal an der Rückwand und dem
  Deckmeister hin und her.
- **Gesprächsgruppen:** Auf der Promenade und im Hangar stehen je zwei Gruppen aus zwei oder drei Leuten. Einer redet 2,5 bis 7 Sekunden, kurze
  Pause, dann ein anderer; ab und zu schweigen alle. Die Zuhörer sehen den Sprecher an. Kommt der Pilot auf gut drei Meter heran, sieht ihn an,
  wer ihm zugewandt steht. Außenposten haben je eine Gruppe weniger.
- **Zuwenden:** Steht der Pilot näher als 4,6 m und mehr als 45° seitlich, dreht sich die Figur nach gut einer halben Sekunde zu ihm um. Der Kopf
  geht voraus (das gab es schon), der Körper folgt mit Schritten. Ist der Pilot länger als 3,5 s weiter als 8 m weg, dreht sie sich zurück.
  Das gilt für Personal, Deckmeister und alle Figuren der Geschichte; Personal hinter der Theke dreht höchstens 70° zur Seite.
- **Abgang:** Nach der Schlussszene eines Kapitels (und nach „Sanders Rechnung“ in Kapitel 5) drehen sich die Figuren der Geschichte um und gehen
  durch den Gang hinaus.
- **Frauen und Männer:** Unter den Läufern sind beide zu gleichen Teilen. Das Personal an den Ständen trägt die Figur, die zum Namen passt
  (vorher stand überall die Frauenfigur, auch wenn eine Männerstimme antwortete). Gleiche Modelle bekommen leicht verschiedene Farbtöne.

## Wie es gebaut ist

- **Haltepunkte der Läufer:** Ein Weg ist eine Liste von Wegmarken; eine Marke kann einen `Stop` tragen (Standort, Blickrichtung, Dauer,
  Wahrscheinlichkeit, optional das Personal, mit dem dort geredet wird). `nextNode` entscheidet an der Marke davor, ob der Stop angelaufen wird;
  ein Stop, an dem schon jemand steht oder zu dem jemand unterwegs ist (`busy`), wird übersprungen. Am Stop: hindrehen, verweilen, zum nächsten
  Ziel drehen, weitergehen.
- **Neue Wege:** Promenade wie bisher als Runde (vier Läufer, Außenposten zwei). Im Hangar gibt es statt der großen Runde zwei Pendelwege an den
  Längswänden (1,7 m vor den Wandpfeilern, mit Spurmarken vor und hinter jedem Gerät, damit niemand durch einen Pfeiler läuft) und die kleine
  Runde neun Meter vor dem Treffpunkt der Geschichte (`hangarSpot`). Die alte große Runde führte drei Meter an diesem Treffpunkt vorbei.
- **Drehen auf der Stelle:** `turnStep(p, richtung, dt)` in `interior.ts`. Ab 26° nimmt es die Dreh-Clips (`animTurn`), darunter und bei Figuren
  ohne Clips dreht es weich. Die Clips stammen aus Vargas Mixamo-Paket (Viertel- und halbe Drehung, links und rechts) und sind für alle drei
  Skelett-Familien umgerechnet. `fbx-anim.mjs --turn` nimmt die Drehung um die Hochachse aus dem Clip und legt sie als Verlauf ab (`meta.yaw`);
  `animStep` dreht damit die ganze Figur und streckt oder staucht den Verlauf auf den gewünschten Winkel. So endet jeder Clip in der Haltung,
  in der er beginnt, und passt auf jeden Winkel. Die Füße stehen nah an der Drehachse; bei einem anderen Winkel als im Clip rutschen sie um wenige
  Zentimeter.
- **Gesprächsgruppen:** `mkChat(x, z, n)`. Die Mitglieder sind normale stehende Figuren (`persons`) mit `fix` (kein Zuwenden mit dem Körper) und
  eigenem Blickpunkt (`look`). Die Gruppe ist für den Piloten ein Hindernis (`block`). Im Hangar stehen die Gruppen links vom Ausgang und weit
  rechts; der Treffpunkt der Geschichte liegt dazwischen und bleibt frei.
- **Abgang:** `storyNpcsLeave()` nimmt die Figuren der Geschichte aus `persons`, entfernt ihre Ansprechpunkte und Namensschilder und schickt sie
  als `leavers` zum Gang. `endChain` in `story.ts` ruft es auf. Grund: siehe `docs/probelauf.md` (Fehler am Übergang zwischen zwei Kapiteln).
- **Bewegungen gebündelt:** Die 37 Bewegungsdateien gehen seit Alpha 1.19 als eine Datei `anims` ins Paket (`scripts/build-assets.mjs`), weil
  das Artifact höchstens 511 Dateien je Fassung fasst. `loadExtraClips` liest das Bündel und weiterhin einzelne Dateien.

## Neue Stelle einrichten

- Haltepunkt: in `build` eine Marke mit `look(x, z, blickrichtung, [von, bis], wahrscheinlichkeit)` in den Weg setzen. Liegt sie abseits der
  Gehspur, davor und dahinter je eine Spurmarke setzen.
- Gesprächsgruppe: `mkChat(x, z, 2 oder 3)`, mindestens drei Meter neben jedem Laufweg und nicht am Treffpunkt der Geschichte
  (im Hangar x zwischen −12 und +35 bei z um −43 frei lassen).
- Dreh-Clips für eine neue Skelett-Familie: Zeilen am Ende von `scripts/anims.sh` ergänzen.

## Geprüft und offen

- Geprüft im Testfenster (Bastion): vier Minuten Ablauf ohne hängende Läufer, jeder Läufer hält neun- bis dreizehnmal, kein Läufer kommt einer
  stehenden Figur näher als 2,9 m; Kehrtwende, Drehung zum Piloten und Kunde am Stand im Bild (`docs/bilder/leben-119-*.jpg`).
- Nicht geprüft: Außenposten und Planetenbasen einzeln im Bild (sie nutzen dieselben Räume), das Zusammenspiel mit anderen Piloten im Mehrspieler.
- Offen: Sitzen (es gibt keinen Clip dafür), Seitschritte, Rennen und Springen aus den Paketen sind weiter ungenutzt.
