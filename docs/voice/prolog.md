# Sprechliste · Intro und Prolog „Vereidigung“

Stand: Alpha 0.42. Quelle der Texte: `src/game/intro.ts` (Erzähler) und `src/game/story.ts` (Prolog).

## So benutzt du die Liste

- **Eine Datei pro Zeile.** Dateiname = Kennung, z. B. `intro_01.mp3`. Ablage: `asset-src/voice/prolog/`.
- **Trocken erzeugen:** kein Hall, kein Funkeffekt, keine Musik. Den Funkklang legt das Spiel darüber.
- **Je Figur gleiche Einstellungen** für alle Zeilen.
- **Regie** steht in eckigen Klammern vor dem Text und ist auf Englisch geschrieben, so wie ElevenLabs solche Anweisungen üblicherweise versteht.
  Wenn dein Modell deutsche Anweisungen besser umsetzt, übersetze sie einfach; der Sprechtext bleibt gleich.
- **Zahlen sind ausgeschrieben**, Tasten als Wort („Taste R“).
- **Name und Schiff des Spielers** kommen im Spieltext vor, lassen sich aber nicht vertonen. Die Sprechfassung umgeht sie
  („Kadett!“ statt „Kadett Falke!“, „deine Maschine“ statt „deine Venom“). Der Untertitel im Spiel zeigt weiter den Namen.

## Aussprache

| Wort | Sprich |
|---|---|
| Ferrox | FÄR-rocks, Betonung vorn |
| Bastion | Bas-ti-OHN (deutsch, nicht englisch) |
| Achterberg | ACH-ter-berg |
| Hollweg | HOLL-wehg |
| Halden-Tor | HAL-den-Tor |
| Sonnenwacht | SON-nen-wacht |
| Kadett | Ka-DETT |

## Stimmen (Beschreibungen für die Stimmerzeugung)

**Erzähler (männlich)** – spricht nur das Intro, in der Wir-Form: einer von der alten Crew, der zurückblickt.
```
German man in his sixties, an old spacer looking back. Deep, warm, slightly gravelly voice. Calm and unhurried,
quietly proud, with a trace of weariness. Intimate, close to the microphone, like telling a story at night.
Clear standard German. No announcer tone, no pathos.
```

**Hauptfrau Achterberg (Ausbilderin, weiblich)**
```
German woman in her early fifties, veteran flight instructor. Low, slightly rough voice, dry and economical,
used to giving orders. Strict but not cold: dry humour and a trace of warmth underneath. Clear standard German.
```

**Lotse Brummer (Flugleitung der Bastion, männlich)**
```
German man in his forties, station flight controller. Calm, even baritone, routine professionalism, friendly but brief.
Steady and clear like air traffic control. Standard German with a faint northern colour.
```

**Ratsherr Hollweg (männlich)**
```
German man around sixty, council elder and son of the first captain. Dignified, measured, warm bass-baritone.
Speaks slowly and with weight, used to addressing a crowd without raising his voice. Clear standard German.
```

**Frachterkapitän der „Kompass“ (männlich, nur eine Zeile)**
```
German man in his fifties, freighter captain. Rough, hurried, working-class voice, under stress.
```

**Die Crew (Chor)** – zwei Zeilen Eid. Am einfachsten: dieselbe Zeile mit drei bis vier verschiedenen Stimmen erzeugen
(Achterberg, Brummer, Hollweg und eine weitere); das Spiel legt sie übereinander.

## Intro (Erzähler)

| Kennung | Sprechtext mit Regie |
|---|---|
| `intro_01` | [quiet, reflective, slow] Vor achtunddreißig Jahren flog die Bastion als Vorhut durch das Halden-Tor. [short pause] Elf Schiffe sollten folgen. |
| `intro_02` | [low, heavy, pauses between sentences] Dann brach das Tor zusammen. Niemand kam nach. Niemand kam uns holen. |
| `intro_03` | [quiet pride, a little firmer] Wir waren die letzte Crew. Also bauten wir uns eine Flotte. Schiff für Schiff. |
| `intro_04` | [darker, wary] Doch im Osten wartet der Schwarm. Die Ferrox fressen Metall: Erz, Wracks, Schiffe, Stationen. |
| `intro_05` | [matter-of-fact, lifting slightly] Jahr achtunddreißig nach dem Riss. Ein neuer Jahrgang Piloten wird vereidigt. |
| `intro_06` | [warm, direct, almost a smile] Du bist einer von ihnen. |

## Prolog

Reihenfolge wie im Spiel. Spalte „Spieltext“ nur dort, wo die Sprechfassung vom Bildschirmtext abweicht.

| Kennung | Figur | Sprechtext mit Regie | Spieltext weicht ab |
|---|---|---|---|
| `p01_brummer` | Brummer | [routine station announcement, calm] Guten Morgen, Bastion. Jahr achtunddreißig nach dem Riss, Tag einhundertzwölf. Schichtwechsel auf allen Decks. | |
| `p02_achterberg` | Achterberg | [calling across a hangar, sharp] Kadett! Hier drüben, bei deiner Maschine. Beweg dich. | nennt Name und Schiff |
| `p03_achterberg` | Achterberg | [dry, businesslike] Heute ist dein letzter Ausbildungstag. Fliegen, schürfen, heil zurückkommen. [beat] Klingt einfach. Ist es nicht. | |
| `p04_achterberg` | Achterberg | [handing something over, a little softer] Hier, dein Flottenband. Noch mit Kadettenstatus. Heute Abend, nach der Vereidigung, gehört es ganz dir. | |
| `p05_achterberg` | Achterberg | [short, instructing] Schau rein. Taste B. | |
| `p06_achterberg` | Achterberg | [approving, brisk] Gut. Und jetzt rein in die Maschine. Pilotensitz, dann holst du dir beim Lotsen die Startfreigabe. | nennt das Schiff |
| `p07_brummer` | Brummer | [radio procedure, even] Kadett von Bastion: Startfreigabe erteilt. Drei Übungsbojen sind markiert. | nennt Schiff und Name |
| `p08_achterberg` | Achterberg | [over radio, dry humour on the last sentence] Flieg sie der Reihe nach ab. W gibt Schub, mit der Maus lenkst du. Und ramm die Bojen nicht, die sind teurer als du. | |
| `p09_achterberg` | Achterberg | [teaching, plain and firm] Die Crew lebt von Erz. Kein Erz, keine Schiffe. Keine Schiffe, keine Crew. So einfach ist das. | |
| `p10_achterberg` | Achterberg | [instructing, clear] Das markierte Feld ist Eisenerz. Taste R ist der Scanner. Dann Taste zwei für den Bergbaulaser und draufhalten, bis der Brocken zerfällt. | |
| `p11_kompass` | Kompass | [panicked, shouting over radio] Frachter Kompass an alle: Ferrox-Späher! Sie fressen uns die Hülle weg! | nennt den Frachternamen |
| `p11_brummer` | Brummer | [urgent but controlled] Bastion an alle: Ferrox-Späher im Sektor! | Ersatz, falls kein Frachter da ist |
| `p12_achterberg` | Achterberg | [suddenly serious, urgent] Das ist keine Übung mehr, Kadett. Taste eins für die Kanonen. [fierce] Hol sie dir! | |
| `p13_achterberg` | Achterberg | [relieved, grudging praise] Sauber. Ich hab schon Schlechtere vereidigt. Bring das Erz nach Hause: an der Bastion andocken und im Markt verkaufen. | |
| `p14_achterberg` | Achterberg | [low, quick, aside] Haltung, Kadett. Der Rat ist da. | |
| `p15_hollweg` | Hollweg | [solemn, slow, addressing the hangar] Vor achtunddreißig Jahren hat meine Mutter in diesem Hangar die Crew versammelt. Hinter uns war das Tor gerade zerbrochen. | beginnt mit dem Namen |
| `p16_hollweg` | Hollweg | [quiet strength, building] Niemand ist gekommen, um uns zu holen. Also haben wir uns selbst gehalten. Mit jedem Schiff. Mit jeder Tonne Erz. Mit jedem Piloten. | |
| `p17_hollweg` | Hollweg | [gentle invitation] Sprich mit uns. | |
| `p18_crew` | Crew | [many voices together, steady, like an oath] Wir sind die letzte Crew. Niemand kommt uns holen. | |
| `p19_crew` | Crew | [many voices together, growing firmer] Also bauen wir uns selbst eine Flotte, Schiff für Schiff, und keiner von uns wird zurückgelassen. | |
| `p20_hollweg` | Hollweg | [warm, proud] Willkommen in der Crew, Pilot. Das Flottenband gehört jetzt dir. | |
| `p21_achterberg` | Achterberg | [gruff affection] Und jetzt raus mit dir. Da draußen wartet Arbeit. | |
| `p22_brummer` | Brummer | [station-wide, friendly] Bastion an alle Piloten: Willkommen, Pilot. Aufträge gibt es an jeder Station, Missionen bei den Fraktionen. | |
| `p23_brummer` | Brummer | [interrupting himself, puzzled, then uneasy] Moment … die Sonnenwacht meldet ein Signal aus den Trümmern im Sonnenfeld. Aus dem alten Tor. [quiet] Das gab es noch nie. | |

Zusammen: 6 Zeilen Intro und 24 Zeilen Prolog (davon eine Ersatzzeile und zwei Chorzeilen).

Nicht vertont: Meldungen des Bordrechners (SYSTEM) und die Zeile beim Überspringen des Prologs.

## Einbau im Spiel

- Aufnahmen nach `asset-src/voice/prolog/` legen (`.mp3` oder `.ogg`, Dateiname = Kennung), dann `npm run assets`.
- Zuordnung Zeile → Kennung: `src/data/voice.ts` (über ein Textstück der Zeile). Intro: `intro_01` bis `intro_06` nach Reihenfolge.
- Abspielen: `voice()` in `src/core/audio.ts`. Funkklang für Lotse und Frachter immer, für alle anderen nur im Flug.
- Eine Zeile bleibt mindestens so lange stehen, wie ihre Aufnahme dauert. Fehlt die Datei, bleibt es beim Untertitel.
- Lautstärke: Regler „Stimmen“ in den Einstellungen.
