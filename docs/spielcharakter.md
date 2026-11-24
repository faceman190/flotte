# Spielerfiguren, Ausrüstung an der Figur und der neue Ausrüster

Stand 24.11.2026. Quelle: `Spielcharakter.zip` im OneDrive-Ordner `Blender` (vom Spieler: drei Figuren und acht Ausrüstungsteile,
alle auf dem UE5-Manny-Skelett, dazu `spiel.json`, `ausruestung.js`, `test.html`). Lokale Kopie: `asset-src/neu/spielcharakter`
(nicht im Repository). Grundlagen: [manny.md](manny.md) (Bewegungen), [ichsicht.md](ichsicht.md), [lyra.md](lyra.md) (Waffen).

## Was im Spiel ist

- **Drei Figuren zur Wahl** bei „Neuer Pilot“ und später an der Garderobe (Flottenband → Ausrüstung → Garderobe, in Stationen).
  Gespeichert in `P.figur` (1–3; alte Spielstände: 1 – das ist der Körper, den sie schon hatten).
- **Start nur im Unteranzug.** Ein neuer Pilot trägt keine Kleidung außer dem hautengen Anzug des Körpers; die Startwaffe bleibt.
- **Acht Ausrüstungsteile als Gegenstände**, die jeder Ausrüster führt. Angelegt (Flottenband, Taste I) erscheinen sie an der Figur –
  in der Außensicht, in der Ich-Sicht (Handschuhe, Ärmel, Beine, Stiefel) und in allen Vorschauen.

| Gegenstand | Kennung | Platz | Teil | Werte | Preis |
|---|---|---|---|---|---|
| Gefechtshelm GH-2 | `helm_filter` | Helm | `helm_01` | Schutz 9 | 900 |
| EVA-Helm | `helm_eva` | Helm | `helm_02` | Schutz 14 | 2.200 |
| Plattenträger PT-3 | `weste_platten` | Weste | `weste_01` | Schutz 12 | 1.100 |
| Feldoverall | `anzug_feld` | Anzug | `overall_01` | Schutz 5 | 350 |
| Raumanzug mit Panzerplatten | `anzug_raum` | Anzug | `overall_02` | Schutz 24, Lauftempo −2 % | 4.200 |
| Taktische Handschuhe | `hand_takt` | Handschuhe | `handschuh_01` | Schutz 2 | 180 |
| Kampfstiefel | `stiefel_kampf` | Stiefel | `stiefel_01` | Schutz 3 | 260 |
| Raumstiefel | `stiefel_raum` | Stiefel | `stiefel_02` | Schutz 5, Lauftempo +2 % | 780 |

Namen, Werte und Preise sind vom Spiel festgelegt (im Paket stehen nur Beschreibungen).

- **Neue Plätze am Körper:** Weste, Handschuhe, Stiefel (zu Helm, Anzug, Rucksack, Waffe, Werkzeug, zwei Modulen).
- **Ältere Helme und Anzüge** (Werkshelm, Pilotenhelm, Bordoverall, Druckanzug …) gibt es nicht mehr im Laden. Sie bleiben gültig
  (alte Spielstände, Funde) und zeigen an der Figur das nächstliegende Teil (`gear.ts`, Feld `teil`).

### Der Ausrüster als Laden

Nach einer Vorlage des Spielers (Bild eines Rüstungsladens): oben die Reiter **Kaufen / Verkaufen / Spind**, darunter die Filter
**Ziel** (Rucksack oder Spind), **Kategorie**, **Unterkategorie** und **Suche**; links das Raster der Gegenstände (Bild, Name, Art,
Preis, „Sofort kaufen“), rechts der gewählte Gegenstand mit Werten (verglichen mit dem Angelegten), Beschreibung, drehbarem Modell
und dem Kaufknopf. Bei Kleidung schaltet **Anprobieren** das Modell auf die eigene Figur mit diesem Teil um.
Drehbare Modelle haben die acht Teile und alle Waffen; alles andere zeigt sein Bild groß.

## Die drei Figuren

| Nr. | Körper | Anmerkung |
|---|---|---|
| 1 | Tripo-Körper mit Unteranzug (der bisherige `spieler_03`) | – |
| 2 | MetaHuman-Kopf mit Haaren und Bart | Das Paket hat dafür **keinen Rumpf und keinen Unteranzug** (nur Arme und Beine in Haut). Im Spiel trägt Figur 2 deshalb den Unteranzug-Körper von Figur 1 ohne dessen Kopf und Hände; Kopf, Haare, Bart und Hände kommen vom MetaHuman. Die Haare haben im Paket keine Farbe (reines Weiß) und sind im Spiel grau getönt. |
| 3 | Tripo-Körper mit Unteranzug und eigenem Kopf | Haut glänzt stark (so im Modell) |

## Wie es gebaut ist

- **Ein Skelett, viele Dateien.** `scripts/build-figuren.mjs` zerlegt das Paket: `lazy/Skelett` (161 Knochen und ein unsichtbares
  Dreieck – ohne Haut lädt three.js keine Knochen), `lazy/Koerper1` bis `3` (nur der Körper, ohne die mitgelieferte Ausrüstung),
  `lazy/Teil_<id>` (je Teil eine Datei). Zusammen 12 MB; geladen wird nur, was die Figur gerade trägt.
  Texturen: Farbe 2048 (Helm und Stiefel 1024), Normalen und ORM 1024.
- **`src/game/figur.ts`**, Klasse `Figur`: hängt Körper und Teile über die Knochennamen an ein Skelett (`setzen({ figur, teile })`),
  lädt Fehlendes nach und lässt bis dahin den alten Stand stehen. Dateien werden gezählt geteilt und 30 s nach dem letzten Gebrauch
  freigegeben. Jedes Netz behält seine eigenen Bindematrizen (darin steckt nach dem Packen auch die Umrechnung seiner verdichteten
  Eckpunkte – ein gemeinsames Skelett für alle Netze verzerrt sie).
- **Verdeckte Körperflächen** werden ausgeblendet (`spiel.json` → `src/data/figurTeile.ts`): Hände unter Handschuhen, Füße unter
  Stiefeln, Rumpf, Arme und Beine unter einem Anzug. Haare verschwinden unter einem Helm. Technik: je Figur eine eigene Flächenliste
  über denselben Eckpunkten.
- **Eigene Figur** (`mannyAvatar.ts`): Der Animator lädt nur noch das Skelett; `Figur` hängt daran, was `avatar.ts` `figTracht()` aus
  `P.figur` und `P.gear` liefert. Solange Skelett oder Körper laden, zeigt das Spiel wie bisher die alte Soldatenfigur.
- **Vorschauen** (`ui/figPreview.ts`: Neuer Pilot, Garderobe, Ausrüstung im Flottenband; `ui/teilPreview.ts`: Laden): eigenes Skelett
  (`neuesSkelett()`), dieselben Netze und Bilder wie im Spiel, Stehbewegung aus dem Bewegungssatz.
- **Gegenstände** (`data/gear.ts`): Arten und Plätze `weste`, `handschuh`, `stiefel`; Feld `teil` = Modell an der Figur;
  `WEAR_SLOTS` = Plätze, die man an der Figur sieht. `inventory.ts` `buyGear(id, ziel)` kauft auch direkt in den Spind.
- **Laden** (`ui/dock.ts` `vAusruester`, `shopRows`, `shopAfter`; Gestaltung am Ende von `style.css`, Klassen `.sh…`).
- **Bilder** (`tex/aus_<name>`, 384 px, freigestellt): `node scripts/build-itembilder.mjs` rendert sie mit Blender (Cycles) aus den echten
  Spielmodellen – die acht Teile, alle neun Waffen und die Granate. Studio, Licht und Blickwinkel sind die des Bildbogens der übrigen
  Gegenstände (`asset-src/neu/items/items_lib.py`), damit im Laden alles zusammenpasst; das Skript ist
  `asset-src/neu/spielcharakter_skripte/bilder.py`. Handschuhe und Stiefel werden dafür als Paar aufgestellt, Waffen schräg ins Bild
  gelegt. Welcher Gegenstand welches Bild zeigt: `gear.ts`, Feld `img`. Übersicht: `bilder/spielcharakter-itembilder.jpg`.

## Mitspieler und Wachen (seit 24.11.2026)

Mitspieler zu Fuß (Station, Mine, Planet) und die Wachen der Städte sind dieselben Figuren mit denselben Teilen und Bewegungen wie die
eigene Figur (`game/fremdFigur.ts`):

- **Je Figur** eine eigene Kopie des Skeletts (`neuesSkelett`) und ein eigener Animator. Der Bewegungssatz und seine Auswertung kommen
  vom Animator der eigenen Figur (`MannyAnimator.spawn`): nichts wird ein zweites Mal geladen oder ausgewertet. Netze und Bilder
  teilen sich alle Figuren. Solange das lädt, steht dort der alte Soldat.
- **Gesteuert nach dem Tempo** (bei Mitspielern aus den Netzpositionen geglättet), nicht nach einer Absicht wie die eigene Figur.
- **Waffe**: auf Planet und in der Mine die Waffe des Mitspielers mit denselben Haltungen (gesenkt, nach einem Schuss im Anschlag,
  Rückstoß je Schuss); in Stationen unbewaffnet. Wachen tragen ein Gewehr gesenkt.
- **Netz**: Das Feld `g` hat vier Einträge mehr: Figur, Weste, Handschuhe, Stiefel (`net.ts`, `avatar.ts gearFromNet`; der Server lässt
  jetzt zehn statt sechs Einträge durch). Ein älteres Spiel ohne diese Einträge erscheint als Figur 1 mit seinem Helm und Anzug.
- **Wachen**: abwechselnd Figur 1 und 3 in voller Ausrüstung (Gefechtshelm, Weste, Feldoverall, Handschuhe, Stiefel), mit dem Stadtlicht
  ihres Standorts (`kit.ts probeLit`, auch für Netze, die erst später dazukommen).
- **Kosten**: drei Mitspieler zusammen rund 1,7 ms je Bild im Testfenster (Bewegung und Zeichnen).
- **Behoben dabei**: Mitspieler bekamen bisher `player = true` (`syncAvatar`) und zogen dadurch die eigene neue Figur zu sich herüber.
  Mit einem Mitspieler in der Nähe sprang die eigene Figur zwischen beiden hin und her.

Bilder: `bilder/spielcharakter-mitspieler.jpg` (Station: Figur 2 ausgerüstet, Figur 3, dahinter ein älteres Spiel),
`bilder/spielcharakter-mitspieler-waffen.jpg` (Planet: KG-30 im Anschlag, SP-12 gesenkt), `bilder/spielcharakter-wache.jpg` (Talstadt).

## Neue Figur oder neues Teil einbauen

1. Paket neu erzeugen (beim Spieler: `python Skripte\spiel_paket.py`) und nach `asset-src/neu/spielcharakter` entpacken.
2. `node scripts/build-figuren.mjs` (zerlegt, packt, trägt in die Paketliste ein), danach `node scripts/build-itembilder.mjs`
   (rendert die Bilder; Blender unter `C:/EXTRA/Blender/blender.exe` oder Umgebungsvariable `BLENDER`).
3. Neues Teil: einen Gegenstand in `data/gear.ts` anlegen (`teil`, `img: 'aus_<id>'`). Neue Figur: Eintrag in `KOERPER`
   (`build-figuren.mjs`) und in `FIGUREN` (`figur.ts`).
4. Prüfen: `(0, eval)(await (await fetch('/scripts/figurtest.js')).text()); await __figur();` dann
   `await FT.set(3, { helm: 'helm_02', overall: 'overall_02' }); FT.shot(); FT.sheet();`

## Offen

- **Figur 2** ist eine Zusammenstellung (siehe oben). Sauber wäre ein eigener Körper im Unteranzug für den MetaHuman.
- **Weste über dem Raumanzug**: geht, ist aber für den Feldoverall gemacht; an den Schultern liegt sie nicht überall auf.
- **Rucksäcke** haben kein Modell an der Figur (im Paket gibt es den Platz, aber kein Teil).
- **Mitspieler**: im echten Mehrspieler mit zwei Rechnern noch nicht ausprobiert (geprüft mit nachgestellten Netzdaten). Mitspieler
  ducken, schießen und laufen, springen aber nicht sichtbar und fallen beim Tod nicht um (diese Zustände gehen nicht ins Netz).
- **SM-4**: Das Modell hat noch keine eigenen Bilder (im Spiel schlichtes Grau), entsprechend dunkel ist ihr Bild im Laden.
- Die Ausrüstung im Flottenband zeigt jetzt zehn Plätze in einer Spalte; die Liste ist lang.
- Gefühl und Aussehen im laufenden Spiel (Bewegung mit Kleidung, Durchstoßen in Extremhaltungen wie Ducken oder Sprint) sind ungeprüft.

## Bilder

- `bilder/spielcharakter-figuren.jpg` – die drei Figuren im Unteranzug (vorn und hinten)
- `bilder/spielcharakter-teile.jpg` – Teile in verschiedenen Zusammenstellungen an allen drei Figuren
- `bilder/spielcharakter-neuer-pilot.jpg` – „Neuer Pilot“ mit der Figurenwahl (gebaute Fassung)
- `bilder/spielcharakter-laden.jpg`, `bilder/spielcharakter-laden-helm.jpg` – der Ausrüster (Anprobe; Modell allein)
- `bilder/spielcharakter-im-spiel.jpg` – gekaufte und angelegte Ausrüstung an der Figur im Hangar
