# Sprechliste · Kapitel 4 „Ins Herz“

Stand: Alpha 1.08. Quelle der Texte: `src/game/chapter4.ts`. Regeln wie in `docs/voice/prolog.md`
(trocken erzeugen, Regie in eckigen Klammern auf Englisch, Zahlen ausgeschrieben, kein Spielername). Modell `eleven_v4`, je Zeile eine Fassung.

Ablage der Aufnahmen: `asset-src/voice/kapitel4/<Kennung>.mp3`, danach `npm run assets`. Zuordnung Zeile → Kennung: `src/data/voice.ts`.
Erzeugt am 2026-11-14 (alle 43 Zeilen, Kennungen der Fassungen in docs/sound/erzeugt.md).

Umfang: 43 Zeilen, 5483 Zeichen mit Regie (ein Credit je Zeichen, also 5483 Credits).
Je Figur: BRUMMER 359, HOLLWEG 843, ACHTERBERG 784, KRULL 1330, VARGA 1016, LESER 843, ROTH 308.

## Stimmen

| Figur | Stimme |
|---|---|
| Lotse Brummer | eigene Stimme „Brummer“ (`qrAVdiuWINwZUeJuzGA1`) |
| Ratsherr Hollweg | „Commander Blake“ (`Z2yQ1EdlDmcIgh9Pn4Lw`) |
| Hauptfrau Achterberg | „Nora Vale - Mission Control“ (`iV1OKYxbmgRtpzJ2q8kx`) |
| Gildemeisterin Krull | „Moreana - Dark, Charismatic, Seductive“ (`V8IDMv79XsMfnx3b9E2U`) |
| Wachtmeisterin Roth | „Lola - Female Action Character“ (`KzAyD2tTf9r77ytc2bYC`) |
| Kapitän Varga, neu (Mann seit Alpha 1.04) | „Leander - Warm, Calm, Thoughtful“ (`EFMWG4bgYSD1vaE3P8OS`); im Spiel die Kürzel VARGA (Aufnahmen) und VARGAL (Funk), beide mit Funkklang |
| Ferrit-Leser, neu | „Rocco Robot“ (`ee2pDOfqzj2pBerZvUCH`): gleichmäßige Maschinenstimme; im Spiel mit Funkklang |

Beide neuen Stimmen kosten 1 Credit je Zeichen (mit `estimate_only` geprüft).
Nicht genommen für den Leser: „Gaming - Black Mensa Transit“, weil sie die Stimme eines bekannten Spiels nachbildet.

**Varga** – Kapitän der „Weitsicht“. Im Logbuch (e17–e19) erschöpft und beherrscht, neun Tage nach dem Sprung. Über Funk (e26, e27, e34, e36) erst fassungslos, dann erleichtert.
**Ferrit-Leser** – Krulls Übersetzungsgerät. Liest die Einträge der Erbauer ohne jede Betonung vor; die Wucht kommt aus dem Text.

## Zeilen

| Kennung | Figur | Prompt (Regie + Text) |
|---|---|---|
| e01_brummer | BRUMMER | [over comms, tired, urgent] Bastion an Pilot. Der Rat hat die ganze Nacht getagt, wegen der Kennung aus der Narbe. Komm an Bord. Sie wollen dich sehen. |
| e02_hollweg | HOLLWEG | [measured, relieved] Ich habe dem Rat die Aufnahme vorgespielt. Danach gab es keine Gegenstimme mehr. Der Flug ist frei. |
| e03_hollweg | HOLLWEG | [weary, honest] Seit die Wacht die Aufnahme gehört hat, fragt mich jeder dasselbe: Und jetzt? Der Rat hat geantwortet. Der Flug ist frei. |
| e04_hollweg | HOLLWEG | [quiet, sincere] Nicht, weil wir mutig geworden sind. Sondern weil da draußen ein Schiff von uns ist. |
| e05_achterberg | ACHTERBERG | [briefing, sober] Die Weitsicht ist durch die Narbe nach Osten. Dahinter liegt das Stummfeld, dahinter der Kern. Von dort ist noch keiner zurückgekommen. |
| e06_achterberg | ACHTERBERG | [firm, dry] Staffel Vier wartet am Rand der Narbe, bis du uns brauchst. Diesmal mit Befehl. |
| e07_hollweg | HOLLWEG | [practical] Flieg vorher zu Krull nach Talstadt. Sie baut etwas, das Ferrit lesen kann. |
| e08_achterberg | ACHTERBERG | [curt reminder] Erst zu Krull nach Talstadt. Ohne ihren Leser fliegst du blind. |
| e09_krull | KRULL | [pleased, eager, then dry] Da bist du. Der Archivkristall hat mir gezeigt, wie die Erbauer ihr Ferrit beschrieben haben. Ich kann es lesen. Fast. |
| e10_krull | KRULL | [businesslike] Für den Leser brauche ich sechs Ferrit, saubere Kristalle. Schürf sie in den Kristallfeldern der Grauzone oder am Nebeltor. Zu kaufen gibt es die nirgends. |
| e11_krull | KRULL | [impatient] Sechs Ferrit, Pilot. Vorher kann ich nichts bauen. |
| e12_krull | KRULL | [brisk] Sechs Stück. Gib her. |
| e13_krull | KRULL | [satisfied, instructing] So. Der Leser hängt an deinem Scanner. Halt ihn ruhig an Ferrit, und er zieht heraus, was drinsteht. Das dauert, also flieg dabei nicht davon. |
| e14_krull | KRULL | [low, possessive] Und Pilot: Was immer er findet, ich will es als Erste sehen. |
| e15_krull | KRULL | [impatient] Der Leser sitzt. Worauf wartest du? Das Stummfeld liegt hinter der Narbe. |
| e16_achterberg | ACHTERBERG | [over comms, serious warning] Achterberg an Pilot. Ab dem Stummfeld hörst du uns nicht mehr, da draußen trägt kein Funk. Der Dämpfer vom Schmelzwerk hält noch. Unter sechzig Metern pro Sekunde bist du für den Schwarm ein Stück Schrott. |
| e17_varga | VARGA | [log recording, exhausted, controlled] Logbuch Weitsicht, Tag neun nach dem Sprung. Die Triebwerke sind aus, und wir fliegen trotzdem. Sie haben uns am Rumpf gepackt. Hunderte. |
| e18_varga | VARGA | [log recording, strained disbelief] Sie fressen uns nicht. Sie schleppen uns. Kurs Ost, immer tiefer hinein. Dreitausend Schläfer an Bord, und ich bekomme keinen einzigen wach. |
| e19_varga | VARGA | [log recording, resolved] Ich trenne Frachtmodul drei ab. Wer es findet: Folgt uns nicht. Oder kommt mit allem, was ihr habt. |
| e20_leser | LESER | [flat, synthetic, even pace] Verbindung steht. Speicher gefunden, drei Einträge lesbar. Die Riegel halten den Kern verschlossen. |
| e21_leser | LESER | [flat, synthetic, even pace] Erster Eintrag. Wir bauten Schürfer, die sich selbst bauen. Sie brauchten uns nicht mehr. Wir nannten es Fortschritt. |
| e22_leser | LESER | [flat, synthetic, even pace] Zweiter Eintrag. Die Schürfer kennen kein Genug. Als das Erz ausging, nahmen sie unsere Schiffe. Dann unsere Städte. |
| e23_leser | LESER | [flat, synthetic, even pace] Dritter Eintrag. Jedes Tor, das anläuft, ruft sie zur Arbeit. Wir haben die Tore abgeschaltet, eines nach dem anderen. Es war zu spät. |
| e24_leser | LESER | [flat, synthetic, even pace] Letzter Eintrag. Der Leitkristall trägt einen einzigen Befehl an die Schürfer: Fracht freigeben. Mehr konnten wir ihnen am Ende nicht mehr sagen. |
| e25_leser | LESER | [flat, synthetic, even pace] Befehl gesendet: Fracht freigeben. Die Träger schalten ab. |
| e26_varga | VARGA | [over comms, urgent, astonished] Hier Weitsicht, Kapitän Varga. Die Klammern lösen sich. Wer immer das war: Ich fahre die Triebwerke hoch. Sagen Sie mir, wohin. |
| e27_varga | VARGA | [over comms, relieved, moved] Weitsicht ist durch. Dreitausend Schläfer, und alle atmen. Wir folgen Ihrer Spur. |
| e28_achterberg | ACHTERBERG | [over comms, commanding] Staffel Vier deckt den Rückweg. Raus hier, Pilot. |
| e29_achterberg | ACHTERBERG | [over comms, fierce, proud] Staffel Vier ist da. Wir haben das Stummfeld durchquert, ohne zu fragen. Halt durch, Pilot. |
| e30_hollweg | HOLLWEG | [over comms, earnest] Pilot. Der Kristall hat seinen Befehl verbraucht, aber er kennt die Sprache, in der man mit dem Schwarm redet. Bring ihn zur Bastion. Wir lernen das eine Wort, das Heimstatt schützt. |
| e31_roth | ROTH | [over comms, sharp, impatient] Schützen, immer nur schützen. Bring ihn zum Wachtposten Ost. Wer den Schwarm rufen kann, kann ihn auch in eine Falle rufen. So holen wir uns die Narbe zurück. |
| e32_krull | KRULL | [over comms, intense, tempting] In dem Ding stehen die Baupläne der Tore. Bring ihn nach Talstadt, und ich finde heraus, wie man eines baut, das den Schwarm nicht ruft. Vielleicht eines nach Hause. |
| e33_brummer | BRUMMER | [over comms, stunned] Bastion an alle. Kontakt am Tor. Groß. Sehr groß. Kennung WS null sieben. |
| e34_varga | VARGA | [over comms, hoarse, pleading] Hier Weitsicht. Wir bitten um einen Ankerplatz. Wir hatten zwölf Schiffe und einen Auftrag. Sagt mir, dass hier jemand ist. |
| e35_hollweg | HOLLWEG | [over comms, moved, warm] Weitsicht, hier Bastion. Ihr seid achtunddreißig Jahre zu spät, und ihr kommt genau richtig. |
| e36_varga | VARGA | [over comms, stunned, quiet] Achtunddreißig Jahre. Für uns waren es neun Tage. Wir dachten, wir wären die Letzten. |
| e37_achterberg | ACHTERBERG | [soft, dry] Das dachten wir auch. |
| e38_krull | KRULL | [grave, revealing] Der Leser ist durch mit dem Kristall. Das Halden-Tor ist nicht eingestürzt. Es war angefressen, lange bevor wir kamen. Der Riss war kein Unfall. Er war Hunger. |
| e39_krull | KRULL | [quiet, unsettled] Und die Ferrox sind kein Volk. Es sind Schürfer, die keiner abgeschaltet hat. Sie tun, was wir tun. Nur ohne aufzuhören. |
| e40_hollweg | HOLLWEG | [decided] Der Kristall bleibt auf der Bastion. Bis wir das eine Wort können. |
| e41_roth | ROTH | [hard, determined] Der Kristall bleibt bei der Wacht. Und wenn wir so weit sind, rufen wir sie. Zu unseren Bedingungen. |
| e42_krull | KRULL | [confident] Der Kristall bleibt in Talstadt. Gebt mir ein Jahr und genug Ferrit. |
| e43_brummer | BRUMMER | [over comms, awed] Da ist noch etwas. Die Weitsicht hat im Sprung mitgehört. Zehn Kennungen. Alle noch unterwegs. |
