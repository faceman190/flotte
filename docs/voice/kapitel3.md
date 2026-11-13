# Sprechliste · Kapitel 3 „Die Wahrheit über die Narbe“

Stand: Alpha 0.99. Quelle der Texte: `src/game/chapter3.ts`. Regeln wie in `docs/voice/prolog.md`
(trocken erzeugen, Regie in eckigen Klammern auf Englisch, Zahlen ausgeschrieben, kein Spielername). Modell `eleven_v4`, je Zeile eine Fassung.

Ablage der Aufnahmen: `asset-src/voice/kapitel3/<Kennung>.mp3`, danach `npm run assets`. Zuordnung Zeile → Kennung: `src/data/voice.ts`.
Noch nicht erzeugt: Solange die Dateien fehlen, zeigt das Spiel nur den Untertitel.

Umfang: 41 Zeilen, 5019 Zeichen mit Regie (ein Credit je Zeichen, also rund 5019 Credits).
Je Figur: BRUMMER 783, HOLLWEG 513, ROTH 1517, BRANDT 492, ACHTERBERG 606, WERK 272, MAREN 341, ACHTERBERG31 341, KRULL 154.

## Stimmen

| Figur | Stimme |
|---|---|
| Lotse Brummer | eigene Stimme „Brummer“ (`qrAVdiuWINwZUeJuzGA1`) |
| Ratsherr Hollweg | „Commander Blake“ (`Z2yQ1EdlDmcIgh9Pn4Lw`) wie Prolog |
| Wachtmeisterin Roth | „Lola - Female Action Character“ (`KzAyD2tTf9r77ytc2bYC`) wie Kapitel 1 |
| Gildemeisterin Krull | „Moreana - Dark, Charismatic, Seductive“ (`V8IDMv79XsMfnx3b9E2U`) wie Kapitel 1 |
| Hauptfrau Achterberg | wie Prolog (siehe `docs/voice/prolog.md`) |
| Staffelführerin Achterberg, Jahr 31 (nur Aufnahme) | dieselbe Stimme wie Achterberg, in der Regie jünger und gehetzt; im Spiel mit Funkklang |
| Kommandantin Maren Hollweg, Jahr 31 (nur Aufnahme), neu | noch zu wählen: ältere Frau, befehlsgewohnt, ruhig |
| Ilvar Brandt, neu | noch zu wählen: Mann um die sechzig, rau, müde |
| Schmelzwerk Zwölf, Schichtleitung, neu | noch zu wählen: nüchtern, über Werksfunk |

**Brandt** – Funker der „Eidwacht“ im Jahr 31, heute Koch an der Garküche Schleusenbräu in Neonhafen. Hat sieben Jahre geschwiegen.
**Maren Hollweg** – erste Kommandantin, Mutter von Ratsherr Hollweg. In der Aufnahme unter Druck, aber beherrscht; kein Bösewicht.
**Achterberg, Jahr 31** – sieben Jahre jünger, Staffelführerin im Gefecht. Der Satz „Keiner wird zurückgelassen“ ist der Eid.

## Zeilen

| Kennung | Figur | Prompt (Regie + Text) |
|---|---|---|
| d01_brummer | BRUMMER | [over comms, serious] Bastion an Pilot. Der Kristall ist gelesen. Die Karte endet nicht auf Schlacke Prime. Sie zeigt nach Osten, mitten in die Narbe. |
| d02_hollweg | HOLLWEG | [firm, over comms, final] Niemand fliegt in die Narbe. Das ist seit sieben Jahren Beschluss des Rats, und er gilt auch für dich. |
| d03_roth | ROTH | [low, determined, over comms] Roth an Pilot. Komm zum Wachtposten Ost. Es wird Zeit, dass jemand die richtigen Fragen stellt. |
| d04_roth | ROTH | [brisk, over comms] Wachtposten Ost an Pilot. Dock an. Ich warte im Gang. |
| d05_roth | ROTH | [telling a story everyone knows, proud] Jahr einunddreißig. Wir hatten die Ferrox zurückgedrängt bis in die Narbe. Kommandantin Hollweg führte selbst, von der Eidwacht aus. Dem einzigen Träger, den wir je selbst gebaut haben. |
| d06_roth | ROTH | [flat, then bitter] Dann kamen sie von allen Seiten. Die Linie brach, die Eidwacht blieb zurück. So steht es in jedem Schulbuch, und so hab ich es mit sechzehn geglaubt. |
| d07_roth | ROTH | [quieter, confiding] Aber die, die dabei waren, reden nicht. Einer steht in Neonhafen an der Garküche Schleusenbräu. Ilvar Brandt, damals Funker der Eidwacht. Frag ihn. |
| d08_roth | ROTH | [short] Neonhafen, die Garküche Schleusenbräu. Frag nach Ilvar Brandt. |
| d09_brandt | BRANDT | [gruff, tired, busy behind a counter] Roth schickt dich? Dann setz dich nicht, es dauert nicht lang. |
| d10_brandt | BRANDT | [low, haunted] Ich saß am Funk der Eidwacht. Ich hab jeden Befehl dieses Tages gehört, und einen davon werd ich nicht mehr los. |
| d11_brandt | BRANDT | [matter-of-fact, bitter] Was wirklich war, steht im Flugschreiber. Der sitzt noch auf der Brücke, im Wrack. Niemand hat ihn je geholt, weil niemand ihn hören wollte. |
| d12_brandt | BRANDT | [pause, then pointed] Und wenn du wissen willst, wer damals Nein gesagt hat: Frag deine Ausbilderin. |
| d13_achterberg | ACHTERBERG | [dry, unsurprised] Brandt redet also wieder. Hätte ich mir denken können. |
| d14_achterberg | ACHTERBERG | [calm, hard] Ich erzähl dir nichts, Pilot. Nicht weil ich mich schäme. Du sollst nicht mir glauben, sondern dem Schreiber. |
| d15_achterberg | ACHTERBERG | [instructing, brisk] In der Narbe frisst der Schwarm alles, was sendet. Lass dir am Schmelzwerk Zwölf einen Signaldämpfer wickeln. Vier Kupferbarren, die Leute dort wissen Bescheid. |
| d16_achterberg | ACHTERBERG | [quiet, final] Hol den Schreiber. Dann reden wir. |
| d17_achterberg | ACHTERBERG | [short] Vier Kupferbarren, Schmelzwerk Zwölf. Dann die Narbe. |
| d18_werk | WERK | [over a factory intercom, no-nonsense] Schmelzwerk Zwölf. Vier Barren, eine Spule, keine Fragen. Achterberg hat angerufen. |
| d19_werk | WERK | [practical, a little warmer at the end] Der Dämpfer sitzt. Solange du nicht scannst, bist du für den Schwarm ein Stück Schrott. Viel Glück da draußen. |
| d20_roth | ROTH | [hushed, over comms] Du bist drin. Vor dir liegt, was von der Linie übrig ist. Die Eidwacht ist das größte Wrack, aber von hier sieht jedes nach ihr aus. Scann die Kennungen. |
| d21_brummer | BRUMMER | [over comms, reading data] Kennung gelesen: Frachter Morgenrot. Nicht die Eidwacht. Weiter. |
| d22_brummer | BRUMMER | [over comms, then alarmed] Jäger der vierten Staffel. Achterbergs Staffel. Und Pilot: Der Scan hat sie geweckt. Ferrox im Anflug. |
| d23_brummer | BRUMMER | [over comms, awed] Das ist sie. Trägerschiff Eidwacht. An der Flanke klafft eine Bresche, da kommst du rein. |
| d24_roth | ROTH | [tense, over comms] Du gehst allein rein. Leg die Notstromschalter um, dann fährt das Schott zur Brücke auf. Und rechne mit Wächtern. |
| d25_maren | MAREN | [old recording, static, commanding under pressure] Eidwacht an alle Staffeln. Linie halten. Das Tor darf nicht fallen. Ich wiederhole: Linie halten. |
| d26_brummer | BRUMMER | [over comms, relieved, urgent] Ich hab ihn. Der Schreiber sendet noch, nach sieben Jahren. Raus da, Pilot. |
| d27_roth | ROTH | [shouting, over comms] Sie kommen aus dem Kristallbruch, ein ganzer Zug. Spring, Pilot, spring! |
| d28_roth | ROTH | [fierce, over comms] Bring den Schreiber zum Wachtposten Ost. Die Wacht hat ein Recht darauf zu hören, wofür sie gestorben ist. |
| d29_hollweg | HOLLWEG | [quiet, almost pleading, over comms] Pilot. Bring ihn zur Bastion. Bitte. Manche Wahrheiten muss man erst selbst gehört haben, bevor man sie allen zumutet. |
| d30_maren | MAREN | [old recording, static, steady command voice] Eidwacht an alle Staffeln. Das Tor läuft an. Linie halten, bis es steht. |
| d31_achterberg | ACHTERBERG31 | [old recording, younger, urgent, cockpit noise] Staffel Vier an Eidwacht. Der Schwarm kommt von allen Seiten. Die Transporter liegen offen. Vierhundert Leute, Kommandantin. |
| d32_maren | MAREN | [old recording, cold, final] Die Linie hält, Hauptfrau. Das ist ein Befehl. |
| d33_achterberg | ACHTERBERG31 | [old recording, younger, breath, then resolved] Dann ist es einer, den ich nicht befolge. Staffel Vier bricht aus. Wir holen die Transporter. Keiner wird zurückgelassen. |
| d34_achterberg | ACHTERBERG | [quiet, steady, no self-pity] Jetzt weißt du es. Ich habe den Eid gehalten und die Kommandantin verraten. Beides stimmt. |
| d35_hollweg | HOLLWEG | [heavy, remembering] Zwei Jahre später hat meine Mutter zu mir gesagt: Sie hatte recht, Bendix. Sag es ihr nie. Ich habe mich daran gehalten. Bis heute. |
| d36_roth | ROTH | [stunned, hollow] Wir wollten zurück in die Narbe, um ein Tor zu holen, das es nicht mehr gibt? |
| d37_roth | ROTH | [hard, decided] Die Wacht hört das heute Abend, Ratsherr. Alle. |
| d38_hollweg | HOLLWEG | [low, firm] Das bleibt in diesem Raum, bis ich weiß, wie ich es der Crew sage. |
| d39_krull | KRULL | [sharp, connecting the dots] Seht auf die Zeitmarken. Das Tor läuft an, neunzig Sekunden später ist der Schwarm da. Wie im Sonnenfeld. Die Tore rufen sie. |
| d40_brummer | BRUMMER | [hesitant, over comms] Da ist noch etwas. Der Schreiber hat nie aufgehört mitzuhören. Sieben Jahre lang. |
| d41_brummer | BRUMMER | [quiet, stunned] Vor vier Monaten zog eine Kennung durch die Narbe. Nach Osten. WS null sieben. |
