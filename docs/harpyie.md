# Harpyie HP-1

Eigenes schweres Landungsschiff, gebaut am 26.11.2026. Der Nutzer schickte Bilder eines Landungsschiffs aus einem anderen Spiel: „Baue dieses Schiff nach in dem dunklen Grauton mit leicht gelben Akzenten … das muss besser sein als alles … alle Details … sehr realistisch … darf viele Dreiecke haben.“ Die Vorlage wird nicht kopiert (wie bei Kormoran, Würger, Elster, Wisent): Die Harpyie ist ein eigener Entwurf desselben Typs, mit eigener Form und eigenem Namen.

![Harpyie gelandet](bilder/harpyie-schraeg.jpg)

| | |
|---|---|
| Maße | 37,6 × 19,7 × 10,2 m |
| Besatzung | 2 im Cockpit, 1 Schütze, 4 Kojen, 12 Klappsitze im Truppenraum |
| Spielwerte | `harpyie` in `src/data/ships.ts`: 38.000 Cr, Rumpf 480, Schild 180, Fracht 140, 8 Flugkörper |
| Laderaum | Truppenraum 22 m, Heckrampe 4,6 m breit, ein Dachs |
| Begehbar | ja, 146 m² Laufkarte: Heckrampe, Truppenraum, Waffenkammer, Technikraum, Treppe, Oberdeck, Cockpit |

## Aufbau außen

`asset-src/neu/harpyie/har_kit.py`, Achsen wie bei den übrigen eigenen Schiffen: +X vorn, +Y Backbord, +Z oben, Boden z = 0.

- Rumpf (Truppenraum) kantig, Querschnitt aus einer Tabelle (`RT`) weich überblendet; die Nase verjüngt sich, die Heckschräge ist die Rampe (Rumpfpunkte an der Schräge nach Bogenlänge verteilt, wie bei der Möwe).
- Zwei seitliche Panzerwülste (`wulst`) mit dem Fahrwerk, vorn drei Einlassschlitze, aufgesetzte Seitenpanzer, Andockringe, Leiter.
- Kanzelbuckel auf der Nase: schmaler als die Dachfläche (sitzt auf, steht nicht über die Fase), Frontscheibe mit zwei Sprossen, Seitenfenster bis an die Frontscheibe, glatte Rahmen über den Rasterstufen.
- Flügel statt flacher Platten (Nutzer: „aerodynamisch sind diese Flugflächen vorne natürlich nicht … runde Leading Edge“): Profil mit runder Vorderkante, gewölbter Oberseite, flacherer Unterseite, nach außen dünner, gelbe Spitzen.
- Rückenturm mit Doppelrohr, Rückengrat mit Lüftern und Leitungen, Kommunikationsmast, Dachpanzer in Lagen, zwei nach außen geneigte Heckflossen.
- Vier Triebwerksgondeln: vorn an Auslegern aus den Wülsten, hinten auf Pylonen über den hinteren Flügeln. Gelandet zeigen die Düsen nach unten. Im Flug schwenken die Gondeln um 90° (Gruppe `fw`), dann zeigen die Düsen nach hinten und der Einlass oben nach vorn.
- Fahrwerk: vier Beine klappen um die Hüfte in Schächte im Boden der Wülste, die Füße klappen gegenläufig mit (verschachteltes Gelenk wie bei der Möwe), Schachtklappen zuletzt.

![Bug](bilder/harpyie-bug.jpg)

![Im Flug](bilder/harpyie-flug.jpg)

![Heckrampe offen](bilder/harpyie-heck.jpg)

## Innenraum und Cockpit

Nutzer: „Hast du den ganzen Innenraum? Was ist alles im Flieger drin, außer der Bucht für die Truppen und das Cockpit?“ Zuerst gab es nur diese beiden. Seit der zweiten Runde nutzt der Ausbau die 4,2 m Höhe des Rumpfs mit zwei Decks im vorderen Teil (`har_innen.py`):

- **Truppenraum** (hinten, volle Höhe): zwölf Klappsitze auf Podesten, Netze, Ablagen, Rampenpult (`ramp`), Stellplatz für einen Dachs, Spanten mit Lichtleisten.
- **Oberdeck** (x 1,9 … 10,3, Boden 4,15 m wie das Cockpit, 2,07 m lichte Höhe), über eine Treppe aus dem Truppenraum: Schützenplatz unter dem Rückenturm (Drehsitz, Richtgriffe, Visierschirm, Korbring in der Decke), Anzugschränke, Geräteregal, zwei Doppelstockkojen (`bed`), Messe mit Tisch und Bank (`log`: Einsatzschirm), Kombüse mit Hängeschrank. Vorn das Schott mit Tür ins Cockpit.
- **Unterdeck** darunter: Waffenkammer, offen zum Truppenraum (Waffenspinde `locker`, Waffenständer, Systempult `scanner`), dahinter ein Schott mit Tür zum **Technikraum** (Energiekern, Lebenserhaltung mit Tanks und Luftwäscher, Schaltschränke, Werkbank, Deckenleitungen).
- **Cockpit** (`har_cockpit.py`, Cockpit-Baukasten Stil 2): zwei Plätze, Augpunkt bei x 14,55. Ich-Sicht aus `HarpyieCockpit.glb`.
- Die Panzerwülste enthalten nur die Fahrwerksschächte, sie sind nicht begehbar.

Damit das Oberdeck bis zum Cockpitschott Kopfhöhe hat, bleibt das Rumpfdach bis x 10,5 auf voller Höhe (Tabelle `RT`); die Spanten sind über dem Oberdeck flach.

![Truppenraum mit Treppe und Galerie](bilder/harpyie-truppenraum.jpg)

![Oberdeck](bilder/harpyie-oberdeck.jpg)

![Technikraum](bilder/harpyie-technik.jpg)

![Cockpit nach hinten](bilder/harpyie-cockpit.jpg)

![Cockpit-Sicht im Spiel](bilder/harpyie-cockpit-spiel.jpg)

## Details außen (zweite Runde)

`greebles2()` in `har_kit.py`: Raketenbehälter unter den vorderen Flügeln, Klappenfugen, Scharnierverkleidungen und statische Entlader, Lüfterkästen, Luken und Leitungskanal auf den Wülsten, Warnstreifen und Schrift an den Fahrwerksschächten, Hebepunkte, Bolzenreihen, aufgesetzte Heckpanzer, Tankstutzen, Sprossen, Handläufe auf dem Dach, Staurohre, Scheibenwischer, Schlepphaken, Warnrahmen an der Rampenöffnung, Ruderfugen und Nummer an den Flossen, Bauchantennen und Bauchscheinwerfer, Beschriftung auf Flügeln und Wülsten. An den Gondeln Bolzenkränze, Leitungen und Lüfterkästen.

![Detail Gondel und Wulst](bilder/harpyie-detail.jpg)

## Ablauf

```sh
sh asset-src/neu/harpyie/har_spiel.sh     # bauen, exportieren, Cockpit backen, vereinfachen, Laufkarte
npm run assets
```

Ansichten: `KOR_SAMPLES=24 blender -b --python har_lauf.py -- bild bug flug heckoffen in_truppenraum cp_vorn …`

## Offen

- Rückenturm, Kinnkanonen und Raketenbehälter sind im Spiel noch nicht als eigene Waffen angesteuert; der Schützenplatz ist nur Einrichtung.
- Seitentür ist nur Optik; Gäste im Mehrspieler kommen über die Heckrampe.
