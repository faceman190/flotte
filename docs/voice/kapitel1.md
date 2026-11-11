# Sprechliste · Kapitel 1 „Echo im Sonnenfeld“

Stand: Alpha 0.57. Quelle der Texte: `src/game/chapter1.ts`. Regeln wie in `docs/voice/prolog.md`
(trocken erzeugen, Regie in eckigen Klammern auf Englisch, Zahlen ausgeschrieben, kein Spielername).

Ablage der Aufnahmen: `asset-src/voice/kapitel1/<Kennung>.mp3`, danach `npm run assets`.
Zuordnung Zeile → Kennung: `src/data/voice.ts`.

## Stimmen

| Figur | Stimme | Stand |
|---|---|---|
| Ratsherr Hollweg | „Commander Blake“ (`Z2yQ1EdlDmcIgh9Pn4Lw`) | wie im Prolog |
| Lotse Brummer | eigene Stimme „Brummer“ (`qrAVdiuWINwZUeJuzGA1`) | wie im Prolog |
| Rika Tamm (Leiterin der Sonnenwacht) | „Maria - Autorin - warm und freundlich“ (`7SPou3nQ7wlCIHhDegzd`) | bestätigt, erzeugt in Alpha 0.57 |
| Gildemeisterin Krull (Bergbaugilde) | „Moreana - Dark, Charismatic, Seductive“ (`V8IDMv79XsMfnx3b9E2U`) | bestätigt, erzeugt in Alpha 0.57 |
| Wachtmeisterin Roth (Grenzwacht) | „Lola - Female Action Character“ (`KzAyD2tTf9r77ytc2bYC`) | bestätigt, erzeugt in Alpha 0.57 |

Beschreibungen der neuen Figuren (für die Stimmwahl oder eine eigene Stimme):

**Rika Tamm** – Ende vierzig, leitet einen abgelegenen Außenposten. Praktisch, warm, technisch versiert, spricht schnell,
wenn sie aufgeregt ist. War als Kind Zeugin, wie das Tor zerbrach.

**Gildemeisterin Krull** – um die fünfzig, Chefin der Bergbaugilde. Kühl, geschäftstüchtig, neugierig bis zur Besessenheit,
spricht leise und genau, mit einem Anflug von Spott.

**Wachtmeisterin Roth** – um die vierzig, Grenzwacht. Hart, direkt, ungeduldig, gewohnt zu befehlen. Hat Ferrox aus der Nähe gesehen.

## Aussprache (zusätzlich zum Prolog)

| Wort | Sprich |
|---|---|
| Tamm | Tamm (kurzes a) |
| Krull | Krull (kurzes u) |
| Roth | Roht (langes o) |
| Ferrit | Fä-RIHT |
| Altwelten | ALT-wel-ten |
| WS-07 | „We Es null sieben“ |

## Zeilen

Reihenfolge wie im Spiel. Über Funk (Flug) legt das Spiel den Funkklang selbst darüber.

| Kennung | Figur | Sprechtext mit Regie | Spieltext weicht ab |
|---|---|---|---|
| `k01_hollweg` | Hollweg | [over radio, measured, a hint of urgency] Pilot, hier spricht Ratsherr Hollweg. Das Signal aus dem Sonnenfeld wird stärker. Die halbe Bastion hängt an den Funkgeräten und hofft. | nennt den Namen |
| `k02_hollweg` | Hollweg | [firm, decisive] Ich will wissen, was da sendet, bevor die Gerüchte schneller sind als wir. Flieg zur Sonnenwacht. Die Route ist gesetzt. | |
| `k03_tamm` | Tamm | [radio call, friendly, brisk] Sonnenwacht an Pilot: Wir sehen dich. Komm rein, die Andockzone ist frei. | |
| `k04_tamm` | Tamm | [introducing herself, then quieter, remembering] Rika Tamm, ich leite diesen Außenposten. Ich war neun, als das Tor zerbrach. Ich stand am Fenster der Bastion und hab das Licht gesehen. | |
| `k05_tamm` | Tamm | [matter-of-fact, a little frustrated] Seit drei Tagen pfeift es aus den Trümmern. Unsere Antennen hören es, aber das Feld streut das Signal. Wir finden die Quelle nicht. | |
| `k06_tamm` | Tamm | [instructing, clear] Flieg drei Peilpunkte rund um das Feld an und scanne dort mit Taste R. Aus drei Peilungen rechne ich dir die Quelle aus. | „mit R“ |
| `k07_tamm` | Tamm | [short, confident] Drei Peilpunkte, drei Scans. Den Rest rechne ich. | |
| `k08_tamm` | Tamm | [focused, over radio] Erste Peilung steht. Das Signal kommt aus der Tiefe des Feldes, nicht vom Rand. | |
| `k09_tamm` | Tamm | [growing excitement] Zweite Peilung. Es wird schärfer. Das ist kein Felsbrocken, das ist etwas Großes. | |
| `k10_tamm` | Tamm | [excited, then suddenly wary] Ich hab sie! Mitten im Feld treibt ein Bogenstück des Tors, so groß wie die Bastion. [pause, lower] Und Pilot … da bewegt sich was. | |
| `k11_tamm` | Tamm | [alarmed, shouting over radio] Ferrox! Im Sonnenfeld! Sie fressen am Tor! | |
| `k13_hollweg` | Hollweg | [urgent command over radio] Pilot, vertreib sie. Die Bastion schickt Verstärkung, aber du bist zuerst da. | |
| `k14_tamm` | Tamm | [relieved, then fascinated] Sie sind weg. Das Licht im Kernstück … es pulsiert im Takt des Signals. Flieg hinein, deine Bergungsklammer kann den Kern lösen. | |
| `k15_tamm` | Tamm | [triumphant, then hushed, then urgent] Kern gelöst! Das Licht ist aus. Und das Signal … ist still. Bring ihn zur Bastion, schnell. | |
| `k16_hollweg` | Hollweg | [relieved, then dry] Gute Arbeit. Bring den Kern zur Bastion. Krull und Roth sind schon unterwegs, und keine von beiden ist gut gelaunt. | |
| `k17_hollweg` | Hollweg | [grave, addressing a small group] Der Kern ist ausgewertet. Ich sage es gleich, damit niemand falsche Hoffnung hat: Das Signal kommt nicht aus den Altwelten. | |
| `k18_hollweg` | Hollweg | [slow, awed] Es ist das Tor selbst. Ein Ruf der Erbauer, Jahrtausende alt. Irgendetwas hat ihn wieder geweckt. | |
| `k19_krull` | Krull | [cool, precise, intrigued] Und jetzt das Merkwürdige. Das Muster im Signal gleicht dem Gitter in unseren Ferrit-Kristallen. Bis aufs Atom. | |
| `k20_krull` | Krull | [quiet intensity, almost greedy] Das Ferrit spricht dieselbe Sprache wie das Tor. Ich will wissen, was es sagt. Der Splittergürtel ist voll davon. | |
| `k21_roth` | Roth | [incredulous, angry] Ihr redet über Kristalle? Da draußen haben Ferrox am Tor gefressen. Im Sonnenfeld. Zwei Sprünge von hier. | |
| `k22_roth` | Roth | [hard, urgent, hammering each sentence] Das Signal lockt sie an. Sie fressen das Tor, und danach uns. Die Grenzwacht gehört ins Sonnenfeld. Sofort. | |
| `k23_hollweg` | Hollweg | [authority without shouting] Niemand verlegt hier irgendetwas, solange ich nicht weiß, womit wir es zu tun haben. | |
| `k24_brummer` | Brummer | [hesitant, interrupting, uneasy] Ratsherr … Verzeihung. Da ist noch etwas. Unter dem Rauschen, drei Sekunden lang. Ich hab es fünfmal abgespielt. | |
| `k25_brummer` | Brummer | [quiet, stunned, each word on its own] Eine Transponderkennung. Menschlich. We Es null sieben. | „WS-07“ |
| `k26_hollweg` | Hollweg | [long pause, then very quiet, shaken] Kein Wort davon verlässt diesen Hangar. [pause] Noch nicht. | |
| `k27_krull` | Krull | [low, confidential, a business offer] Pilot, auf ein Wort. Die Gilde zahlt gut für jeden, der im Splittergürtel die Augen offen hält. Wenn das Ferrit spricht, will ich es hören. | |

Zusammen 26 Zeilen: Hollweg 8, Tamm 11, Krull 3, Roth 2, Brummer 2.

Nicht vertont: die Tafeln („KAPITEL 1“, „WS-07: die Weitsicht …“, „KAPITEL 1 ABGESCHLOSSEN“) und Brummers Hinweis, dass Kapitel 2 in Arbeit ist.
Soll die Tafel zur „Weitsicht“ der Erzähler sprechen, bekommt sie die Kennung `k25_erzaehler`.
