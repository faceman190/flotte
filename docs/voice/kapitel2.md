# Sprechliste · Kapitel 2 „Splitter der Erbauer“

Stand: Alpha 0.86. Quelle der Texte: `src/game/chapter2.ts`. Regeln wie in `docs/voice/prolog.md`
(trocken erzeugen, Regie in eckigen Klammern auf Englisch, Zahlen ausgeschrieben, kein Spielername). Modell `eleven_v4`, je Zeile eine Fassung.

Ablage der Aufnahmen: `asset-src/voice/kapitel2/<Kennung>.mp3`, danach `npm run assets`. Zuordnung Zeile → Kennung: `src/data/voice.ts`.

## Stimmen

| Figur | Stimme |
|---|---|
| Gildemeisterin Krull | „Moreana - Dark, Charismatic, Seductive“ (`V8IDMv79XsMfnx3b9E2U`) wie Kapitel 1 |
| Wachtmeisterin Roth | „Lola - Female Action Character“ (`KzAyD2tTf9r77ytc2bYC`) wie Kapitel 1 |
| Ratsherr Hollweg | „Commander Blake“ (`Z2yQ1EdlDmcIgh9Pn4Lw`) wie Prolog |
| Lotse Brummer | eigene Stimme „Brummer“ (`qrAVdiuWINwZUeJuzGA1`) |
| Vorarbeiter Kessler (Splitter-Mine), neu | „Leonard Berger – Rough & Resonant“ (`Lpl4mdZ3QP3R1V6iShDZ`) |
| Kapitänin Varga („Weitsicht“, nur Aufnahme), neu | „Irene - reflective thinking“ (`ZswvODxwIaNVszyBPqBF`) |

**Kessler** – Ende fünfzig, gräbt seit zwanzig Jahren im Splittergürtel. Rau, trocken, unaufgeregt, ein wenig abergläubisch.
**Varga** – Kapitänin der verschollenen „Weitsicht“. Erschöpft, gefasst, spricht in eine Kapsel-Aufzeichnung, Störungen im Signal.

## Zeilen

| Kennung | Figur | Prompt (Regie + Text) |
|---|---|---|
| c01_krull | KRULL | [quiet, conspiratorial, over comms] Pilot, Krull hier. Seit dem Signal singt das Ferrit im Splittergürtel. Meine Leute an der Splitter-Mine hören es in den Scannern. |
| c02_krull | KRULL | [low, firm] Flieg hin und sprich mit Vorarbeiter Kessler. Der Rat muss davon nichts wissen. [pause] Noch nicht. |
| c03_kessler | KESSLER | [gruff, over comms] Splitter-Mine an Pilot. Krull hat dich angekündigt. Dock an, ich warte unten im Gang. |
| c04_kessler | KESSLER | [dry, weary] Kessler. Ich grabe seit zwanzig Jahren in diesem Gürtel, und so was hab ich noch nie gehört. |
| c05_kessler | KESSLER | [lowering voice, uneasy] Drei Brocken draußen im Feld leuchten im Scanner wie Kirchenfenster. Das Muster ändert sich, wenn man hinsieht. |
| c06_kessler | KESSLER | [matter-of-fact, then warning] Scann alle drei mit R. Ich schick die Daten an die Gilde. Und Pilot: Die Brocken ziehen Ferrox an. |
| c07_kessler | KESSLER | [short, gruff] Drei Brocken, drei Scans. Und bleib wachsam. |
| c08_kessler | KESSLER | [over comms, intrigued] Erstes Muster ist drin. Es wiederholt sich, wie ein Satz. |
| c09_kessler | KESSLER | [over comms, dry humor] Zweites Muster. Krull flucht gerade sehr leise. |
| c10_krull | KRULL | [excited but controlled] Das ist keine Störung. Das ist eine Karte. Alle drei Muster zeigen auf denselben Ort: Schlacke Prime, im Schlackenfeld. Auf der Oberfläche. |
| c11_krull | KRULL | [smooth, persuasive] Flieg runter und sieh nach, was da liegt. Die Gilde zahlt das Doppelte für alles, was du findest. |
| c12_roth | ROTH | [stern, over comms] Pilot, hier Roth. Ich hab gehört, wo du bist. Das Schlackenfeld ist Grenzgebiet, da unten wimmeln Drohnen. Lande nicht zu nah. |
| c13_krull | KRULL | [awed, almost whispering] Siehst du das? Säulen aus reinem Ferrit. Das haben keine Menschen gebaut. |
| c14_roth | ROTH | [shouting, urgent] Wachdrohnen! Die bewachen das Ding. Räum sie weg! |
| c15_krull | KRULL | [tense, careful] In der Mitte schwebt ein Kristall. Nimm ihn mit, vorsichtig. |
| c16_krull | KRULL | [relieved, then stunned] Du hast ihn! [pause] Moment … neben der Ruine liegt noch etwas. Eine Rettungskapsel. Menschlich. |
| c17_varga | VARGA | [exhausted, distant recording, static] Hier spricht Kapitänin Varga, Weitsicht. [pause] Wir sind durch. Das Tor hat uns nicht zerrissen, es hat uns verschoben. [quiet] Wer das hört: Wir leben. |
| c18_roth | ROTH | [shaken, then commanding] Eine Kapsel der Weitsicht. Hier draußen. Bring alles zurück. Sofort. |
| c19_krull | KRULL | [possessive, cool] Bring den Kristall zur Splitter-Mine. Die Gilde hat ihn gefunden, die Gilde behält ihn. |
| c20_hollweg | HOLLWEG | [firm, over comms] Pilot, das Archiv gehört der Crew, nicht der Gilde. Bring es zur Bastion. |
| c21_krull | KRULL | [satisfied, intrigued] Gute Entscheidung. Der Kristall ist ein Speicher, Pilot. Ein Archiv der Erbauer. Und es ist nicht leer. |
| c22_kessler | KESSLER | [uneasy, low] Er antwortet auf das Tor-Signal. Als würde er auf etwas warten. |
| c23_hollweg | HOLLWEG | [cold anger, over comms] Krull, das war kein Gildefund, das war Eigentum der Crew. Darüber reden wir noch. |
| c24_krull | KRULL | [mocking, calm] Reden wir, Ratsherr. Sobald Sie verstehen, was wir in der Hand haben. |
| c25_hollweg | HOLLWEG | [grateful, measured] Danke, Pilot. Der Kristall bleibt in der Bastion, unter Verschluss. |
| c26_krull | KRULL | [outraged, over comms] Unter Verschluss? Hollweg, Sie sperren die wichtigste Entdeckung seit dem Riss in einen Schrank! |
| c27_roth | ROTH | [dry, serious] Lieber im Schrank als bei den Ferrox. Die Drohnen da unten haben ihn bewacht. [pause] Die Frage ist: wofür? |
| c28_brummer | BRUMMER | [hesitant, over comms] Ich hab die Kapsel ausgewertet. Die Aufnahme ist echt. Und sie ist nicht achtunddreißig Jahre alt. |
| c29_brummer | BRUMMER | [quiet, stunned] Sie ist vier Monate alt. |
