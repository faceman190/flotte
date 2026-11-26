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
- **Unterdeck** darunter: Waffenkammer, offen zum Truppenraum (Waffenspinde `locker`, Waffenständer, Systempult `scanner`), dahinter ein Schott mit Tür zum **Technikraum** (Energiekern, Lebenserhaltung mit Tanks und Luftwäscher, Energieverteilung, Deckenleitungen) mit den fünf Modulplätzen (siehe unten).
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

## Rückenturm und Schützenplatz

Seit dem 26.11.2026 (`src/game/turm.ts`). Der Nutzer: „Fliegt man alleine, soll der Turm mit auf das Ziel des Piloten schießen“, dazu der Schützenplatz für einen zweiten Spieler und für den Piloten selbst.

- **Aufgeschaltet (Pilot allein):** Der Turm folgt dem Ziel, das der Pilot erfasst hat, und feuert mit der Feuertaste mit. Er hält das Ziel auch, wenn es aus dem Fadenkreuz wandert, solange es in seinem Schussfeld und in 1.400 m Reichweite bleibt. 60 % der Feuerrate. Munition aus dem gemeinsamen Vorrat.
- **Schützenplatz** (Oberdeck, unter dem Turm, [E]): Blick der Turmkamera, die Maus richtet, linke Taste feuert mit voller Feuerrate, rechte Taste vergrößert, [E] steht wieder auf. Dauerfeuer überhitzt die Rohre nach rund drei Sekunden. Geht gelandet und im Flug (das Schiff hält dann Kurs, `bordflug.ts`), nicht im Hangar.
- **Schussfeld:** rundum, Höhe −5° … +70°. Nach vorn nicht unter die Waagerechte (Kanzel), zwischen den Heckflossen nicht unter 10°. Unter dem Rumpf gibt es kein Schussfeld; dort lässt der Turm das Ziel los. Er dreht mit rund 90° je Sekunde.
- **Raketen** starten aus den Behältern unter den vorderen Flügeln.
- **Modell:** Der Turm ist in zwei Teile getrennt, Kennung `turm` (dreht um die Hochachse) und `rohr` (Rohrwiege, darunter). Gelenke in `gltfShips.ts` (`TURM`, `setTurm`), Punkte aus `har-gelenke.json` (`turm`).

![Blick der Turmkamera im Spiel](bilder/harpyie-turmsicht.jpg)

### Mitflug

Ein Mitspieler kann wie bisher über die offene Heckrampe an Bord gehen. Neu: Hebt der Besitzer ab, bleibt der Gast an Bord und fliegt mit (`net.ts gastZiele`, `interior.ts folgeGast`). Der Innenraum folgt dem fliegenden Schiff mit voller Lage, der Gast kann herumlaufen und sich an den Schützenplatz setzen. Er schießt eigene Geschosse und meldet die Stellung des Turms (`tu`); solange Meldungen kommen, ruht beim Besitzer das Aufschalten. Landet das Schiff woanders, steigt der Gast dort aus.

Grenzen der ersten Stufe:

- Der Mitflug gilt innerhalb eines Raums, also über dem Planeten, auf dem der Gast eingestiegen ist. Verlässt das Schiff ihn (Orbit, Sprung, Andocken) oder geht der Besitzer offline, steht der Gast wieder am letzten Landeplatz des Schiffs. Der Besitzer bekommt vor der Wolkendecke eine Warnung.
- Das eigene Schiff des Gastes bleibt stehen, wo er es gelandet hat.
- Andere sehen den Gast während des Flugs nicht als Figur.
- Als Gast verbraucht der Schütze keine Munition des Besitzers.

## Modulplätze im Technikraum

Die fünf Schiffsmodule haben feste Plätze im Technikraum; das eingebaute Modul steht dort als Modell. Alles dazu in [schiffsmodule.md](schiffsmodule.md).

![Technikraum mit Modulplätzen](bilder/module-raum.jpg)

## Ablauf

```sh
sh asset-src/neu/harpyie/har_spiel.sh     # bauen, exportieren, Cockpit backen, vereinfachen, Laufkarte
npm run assets
```

Ansichten: `KOR_SAMPLES=24 blender -b --python har_lauf.py -- bild bug flug heckoffen in_truppenraum cp_vorn …`

## Offen

- Kinnkanonen sind die Bordkanonen des Piloten; sie schwenken nicht.
- Mitflug über den Raum hinaus (Orbit, Sprung, Andocken mit Gast an Bord).
- Seitentür ist nur Optik; Gäste im Mehrspieler kommen über die Heckrampe.
