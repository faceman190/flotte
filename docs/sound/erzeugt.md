# Über die ElevenLabs-Verbindung erzeugte Geräusche

Arbeitsbereich-Flow: `k9fbN2C8foWJIZhkfH4X` (alle Geräusche liegen dort). Modell: `eleven_text_to_sound_v2`, 17 Credits je Fassung.
Zum Herunterladen einer Fassung: `creative_get_generations` mit Flow und Kennung der Fassung, dann die `full_res_url` laden
und als `<name>.mp3` nach `asset-src/sound/` legen.

## Gruppe 1 (eingebaut in Alpha 0.47)

| Name | Fassung 1 | Fassung 2 | gewählt |
|---|---|---|---|
| cruise_on | zwZG8EnnqwofHbhvSkJf | ravj0h1H4jqwVabbLJ0A | 1 |
| cruise_off | 3HogNshVMKnQsXPKRM3E | b2FiLGD8Gzt0CD0okt95 | 2 |
| rocket_fire | 25IyNKJMVSehBdO6Onor | T8jVer1KdyKthXf5dAwu | 2 |
| warn_hull | eg56oj695aD4TxVs9sPY | R0kWkAWO5Otk7Xh5ZMLc | 2 |
| warn_shield | 6A8FoLIDv36aNFp1bywO | uFzRvEmK3jsfJVG8XkNh | 1 |
| warn_heat | SCDe6UXx0uhnfdEPgZHs | OxfUEXs62Lo1MaA4M7Bj | 1 |

## Gruppe 2 (eingebaut in Alpha 0.48; gewählt: ferrox_attack 1, ferrox_death 1, torpedo_fire 1, entry 1, success 2, rank_up 2)

| Name | Fassung 1 | Fassung 2 | Einbau geplant |
|---|---|---|---|
| ferrox_attack | k07svusLHTCwug9urZjC | et5glBthtD88qtFZu1V0 | wenn ein Ferrox schießt (combat.ts) |
| ferrox_death | coJ5dmBwp1qheklVcj8L | BVjdIBVUgj01wdF9Qepx | beim Zerstören, zusätzlich zur Explosion |
| torpedo_fire | 3MIgR0cJttJ5OXWnRlhK | gQOzOPDr0PQkwekNDXcr | fireTorp in combat.ts |
| entry | OX6Tg7UgjoHoQ75z8JQf | 6i9tWNLtuSRWa4cm9l6J | startEntry in main.ts |
| success | zeJjZd2y2h0RVTQjdqZN | 51XKDmIcA5vOO0xySzKE | Auftrag/Mission erfüllt (dock.ts, missions.ts) |
| rank_up | cvdCCJAgN2jLX4fZDWxo | r7ruA3NM1veBsCBolAdH | Rang gestiegen (reputation.ts) |

## Noch nicht erzeugt

Schleifen (brauchen die Schleifen-Option, also einen Geräusch-Knoten mit `loop: true`): amb_ship, amb_planet_wind, amb_planet_ice,
amb_planet_lava, torpedo_fly, mother_hum, rover_engine, rover_drill, drone_hum.
Einzeltöne: step_grate0 bis step_grate4, oath.

## Stimmen im Arbeitsbereich

Brummer = eigene Stimme „Brummer“ (`qrAVdiuWINwZUeJuzGA1`) · Hollweg = „Commander Blake“ (`Z2yQ1EdlDmcIgh9Pn4Lw`) ·
Achterberg = „Nora Vale - Mission Control“ (`iV1OKYxbmgRtpzJ2q8kx`) · Erzähler: noch nicht bestätigt
(im Arbeitsbereich liegen „Robert Ranger - Cool Storyteller“ und „Waldfried - Deep, Theatrical“).

## Schleifen (Knoten angelegt, noch NICHT erzeugt)

Eigener Flow: `0gDWtMztf77PvsfH9bZg`. Alle Knoten mit `loop: true`, `prompt_influence: 0.5`.
Vorabschätzung für alle neun mit je zwei Fassungen: 2680 Credits (mit je einer Fassung etwa die Hälfte).
Erzeugen: `creative_run_flow_nodes` mit dem Flow und den Knoten, `generations_count` 1 oder 2.

| Name | Knoten | Länge |
|---|---|---|
| amb_ship | dDsqs1y8epkwTAGn1r3T | 22 s |
| amb_planet_wind | NIgQDOpViyr4EGGX0fgJ | 22 s |
| amb_planet_ice | kr2wnMO0LtyeFRLtKr4p | 22 s |
| amb_planet_lava | Ba1GGb5y0KHdJBlJ7iq1 | 22 s |
| torpedo_fly | P71w0NsYgWEW0Ec4aOFS | 6 s |
| mother_hum | n1CC7xKlsw25RX4Lm1vV | 20 s |
| rover_engine | clNVjMc1Tdw5WfGjyRVZ | 8 s |
| rover_drill | IvSZXQmkS3ogrNY41cz3 | 6 s |
| drone_hum | I9D3fJfnOBe6sQ5btAD1 | 6 s |

### Schleifen erzeugt (je eine Fassung, zusammen 446 Credits)

amb_ship 3kEn6ntPBAtSYerZWHG2 (Sitzung 6kOceWbFpFL0F7I1HK87) · amb_planet_wind qK0MwuTxtcsgmEUcxSLe (wPY4howY7YmboA2IMluu) ·
amb_planet_ice ZxlCaEfKayhJG5gLhKix (6jKgD4XBcRXS71zo5iSi) · amb_planet_lava 5zwFp5RE4WjWt6qlzu1G (c6Rd3MNDkGJrmFPlg5y6) ·
torpedo_fly 3POg5r1TwtnzjSwamGdm (UDxWRJeASEaERAvwIQvd) · mother_hum ebrs84M2IrnZSLw1jsAT (aRJyeBamv9c1MCRGbVlW) ·
rover_engine RSeEAYVXo9PJ4crTnrbz (mlHZcpilFX6Sz4CzfF1y) · rover_drill gOCI7YaMNtenqaRWbKqJ (rnTpHFpLTyOO5nu9Kbv8) ·
drone_hum dJOnd9khwN5DCHaICDz8 (W1DOX28cysXVFzZEHBxk)

## Stand Alpha 0.50

Alle Geräusche aus docs/sound/prompts.md sind erzeugt und eingebaut. Zuletzt: step_grate0 bis step_grate3 (vier Varianten, Laderaum der Pfeil), oath (Vereidigung), Erfolgston auch bei Fraktionsmissionen. Verbrauch am 2026-11-11 insgesamt 1025 Credits.

## Stimmen Kapitel 1 (eingebaut in Alpha 0.57, 2026-11-11)

Flow `DjfXlXQs7BmZdyMK99Kd`, Modell `eleven_v4`, je Zeile eine Fassung. Kosten: 1 Credit je Zeichen des Prompts,
die Regie in eckigen Klammern zählt mit. Zusammen 3.394 Credits (Hollweg 1.032, Tamm 1.389, Krull 461, Roth 273, Brummer 239).
Texte und Regie: docs/voice/kapitel1.md. Dateien: asset-src/voice/kapitel1/<Kennung>.mp3.

Stimmen: Hollweg „Commander Blake“ · Brummer eigene Stimme · Tamm „Maria - Autorin - warm und freundlich“ (`7SPou3nQ7wlCIHhDegzd`) ·
Krull „Moreana - Dark, Charismatic, Seductive“ (`V8IDMv79XsMfnx3b9E2U`) · Roth „Lola - Female Action Character“ (`KzAyD2tTf9r77ytc2bYC`).

| Kennung | Fassung | Kennung | Fassung |
|---|---|---|---|
| k01_hollweg | 9VgVZvk161LJk9IteYry | k02_hollweg | bvuBohDVeG9yvW1ZRyt1 |
| k03_tamm | ZOCLJZN0RUKmPDpmZuVK | k04_tamm | 7zfyivHjTAtbsiGVZQxX |
| k05_tamm | wsEGn9CDH8PgNRZYPRWL | k06_tamm | whVCaKjHSfx51Rib28Vp |
| k07_tamm | kCmVKbRqT7EBa5kcqeDv | k08_tamm | i8hcOqnPKz2ywravL1Q8 |
| k09_tamm | OyXIuvLuaU4VC1zzimfF | k10_tamm | TUBnEYwFzxWsJhfcZ0CI |
| k11_tamm | JynPQ6NvfUEpY2ZGSVTB | k13_hollweg | agRqVuUpMqiIDCdglrHT |
| k14_tamm | tfVVzuBups5lGowtAuYY | k15_tamm | XvkNV4vAQHDBv9p5jhJw |
| k16_hollweg | cGxfLxweCRZ8jMs4oApn | k17_hollweg | xH1wd1vNCkzVj9VgdUIX |
| k18_hollweg | GsyMFkH7ltvO930jlTpR | k19_krull | QkJI0fBRCqREQhImaubj |
| k20_krull | c0VGxWh5IjYvSDQGp8pf | k21_roth | Qotx3WpvX5aRO14RvIGo |
| k22_roth | n3askIUEccJyDCBtSd7g | k23_hollweg | tY3e8fjItoVIWvlOEMqR |
| k24_brummer | VOtDs3WEPyrdvyB3iw4v | k25_brummer | 7EKkYHz3He1OVVS9Cd8Q |
| k26_hollweg | flVjzST38nQjJs2W39Pt | k27_krull | g2fTaULvqO7KGgcxjbnK |

Eine Zeile neu erzeugen: `creative_generate_speech` mit demselben Flow, Text aus der Sprechliste, Stimme wie oben, `generations_count` 1;
die neue Datei unter demselben Namen ablegen und `npm run assets`.


## Stimmen Kapitel 2 (eingebaut in Alpha 0.86, 2026-11-13)

Flow `obTuDaY5TEaVhIP0A2FU`, Modell `eleven_v4`, je Zeile eine Fassung, zusammen **3.124 Credits**. Texte und Regie: docs/voice/kapitel2.md, Dateien: asset-src/voice/kapitel2/<Kennung>.mp3.
Neue Stimmen: Kessler „Leonard Berger – Rough & Resonant“ (`Lpl4mdZ3QP3R1V6iShDZ`), Varga „Irene - reflective thinking“ (`ZswvODxwIaNVszyBPqBF`).
| Kennung | Fassung |
|---|---|
| c01_krull | dHTXKyXzYkfqVQJGyz3b |
| c02_krull | zfgo5ya2UV3nxN6Zh8HP |
| c03_kessler | ss3COIoJV085zO3XXM7H |
| c04_kessler | ykElWMxcqbuoUyv97vU4 |
| c05_kessler | heJLj7ruOVOPtzXzbQDt |
| c06_kessler | 59IyGRynC1ZQYdxyKpuX |
| c07_kessler | 00XpXQKG5lXizdha8UU7 |
| c08_kessler | OSy7pgRiyfySAbYqXXTk |
| c09_kessler | sXmnovBMTvxqzBnZwQnE |
| c10_krull | MG7xEatggdvhf9HpSVQg |
| c11_krull | kZkbWuVR8d1EijGIyf18 |
| c12_roth | dh4VEuR34678N4XR5wp7 |
| c13_krull | vT4Bp5vGPMCNl00DLpG3 |
| c14_roth | q7TTvfGOFI171OvbBKAU |
| c15_krull | rFZ07V4dkO3hJsb8p9WI |
| c16_krull | 5MwYj85dTMBWZJ6IbCuZ |
| c17_varga | 8SlYHEjChajl9YsveO4u |
| c18_roth | sFjOevG7MmcZCEwkh2Pk |
| c19_krull | lN3ZUqrOp6uUnKKiXuwV |
| c20_hollweg | W3KdbICsWT8Bw7Cb5CN7 |
| c21_krull | U3CS8sBuhPfSIselTQ3a |
| c22_kessler | 3FBumF6J1vez7GIOc1Mr |
| c23_hollweg | jW7SIuQZQ7lc1INigvCJ |
| c24_krull | yeqboPMkLcphqgzJergC |
| c25_hollweg | VvwQfw9OC9bIvth7fwe4 |
| c26_krull | tjGPaANXGIFMw3lLmwbc |
| c27_roth | jXUBF0br4YE1R2oASiIX |
| c28_brummer | NFYhJtwmemQXFowEeu3Y |
| c29_brummer | LP5wJ5qErgeSdNzUDtD0 |


## NPC-Rufe (eingebaut in Alpha 0.90, 2026-11-13)

Flow `VZhyu9OiozOx850XHeHN`, Modell `eleven_v4`, je Zeile eine Fassung, zusammen **1.609 Credits**
(Drohnen 222, Andockkontrolle 267, Personal Maks 560, Personal Corinna 560). Texte, Stimmen und Anlässe: docs/voice/npc.md,
Dateien: asset-src/voice/npc/<Kennung>.mp3 (29 Stück). Im Spiel: `bark()` in src/core/audio.ts, Auslöser in src/game/barks.ts.
Eine Zeile neu erzeugen: `creative_generate_speech` mit diesem Flow, Text und Stimme aus docs/voice/npc.md, `generations_count` 1.
Herunterladen: `creative_get_generations` → `full_res_url` unverändert laden (die Signatur nicht URL-kodieren, sonst 403).

## Stimmen Kapitel 3 (eingebaut in Alpha 0.99, 2026-11-13)

Flow `q7tyyVSucSE1DlH6rXWM`, Modell `eleven_v4`, je Zeile eine Fassung. 40 von 41 Zeilen erzeugt, zusammen **5.277 Credits**.
Texte und Regie: docs/voice/kapitel3.md, Dateien: asset-src/voice/kapitel3/<Kennung>.mp3.
Neue Stimmen: Brandt „Axel - ruhig, erzählend, leicht rauh“ (`CD5xyRjkR74P5qby9tmm`), Schmelzwerk „Kalle – Raspy & Energetic“ (`LvlM6UD7pLIgPGDeuuxU`),
Maren Hollweg „Elinor - The Gruff Aunt“ (`gDQfVolj9RbmXgumLcOq`). Achterberg im Jahr 31 spricht mit ihrer Stimme „Nora Vale“, in der Regie jünger.

**Achtung, Preis:** Die Stimme „Elinor“ kostet 2,25 Credits je Zeichen statt 1 (d25: 333 statt 148, d30: 266 statt 118). Vor dem Einsatz einer
neuen Stimme eine Zeile mit `estimate_only` und genau dieser Stimme prüfen. Die Zeile **d32_maren** („Die Linie hält, Hauptfrau. Das ist ein Befehl.“)
ist deshalb noch nicht erzeugt (rund 160 Credits mit Elinor); im Spiel läuft sie als Untertitel.

| Kennung | Fassung |
|---|---|
| d01_brummer | qdkZKm1UMfjL2Gs2RHlS |
| d02_hollweg | 8mSTMOdqUd8u672kAR6X |
| d03_roth | mxJMiQZwFIG97sjtZxE4 |
| d04_roth | XqIL4ZEJatPJIAMJx0pH |
| d05_roth | 5m67DSnh56zgpbTOnxGo |
| d06_roth | LZJhR9XHJYs1NNouV1WX |
| d07_roth | BWexAshfZ4PPhGbt7fKK |
| d08_roth | sulLo9dZlA6jl8DO82XT |
| d09_brandt | QbhYExvKEw1bJCp1Twia |
| d10_brandt | 0z3wWw8L5TU32wNGulj8 |
| d11_brandt | kjIQUVjEWmfUX0SbgfAG |
| d12_brandt | ki5Wp9q5bJ5ynsEVDS5b |
| d13_achterberg | SXOdf5XPQ1onLHAZXwGV |
| d14_achterberg | 2mYTcVsnAsxMbWEbqfD6 |
| d15_achterberg | BNLrdR0uDHrna2I1q3IY |
| d16_achterberg | KYiuKMUQ6I65mFmw02Th |
| d17_achterberg | RBbA7rJ6YMmkXilbrpV0 |
| d18_werk | OzxZe7XvcWjBXVYVuNzP |
| d19_werk | iGvq71uiPGxSqdF4oKis |
| d20_roth | 9MUOkGU2kx77FjDqzIdj |
| d21_brummer | 9qcRaI7MkW3qgIbhYFuU |
| d22_brummer | XnMU0i3XzYKgYK5ENKs9 |
| d23_brummer | hsnxMzx0xOnhdB0QFTRU |
| d24_roth | 6wZKv12nXpeg4UjnjyCW |
| d25_maren | 2J523nFAUGe3W9dO3jYz |
| d26_brummer | pwChV0VH7trtyEzwk46A |
| d27_roth | K4BHXUOazQ8xPazvOKXy |
| d28_roth | Czb4Z5NhKIzdY3NqloxI |
| d29_hollweg | wTRreDSYxIJGR3Q7bnNq |
| d30_maren | gkUnus27jnGC9GWLeYB9 |
| d31_achterberg | kxz6Ea4ScQqlIswQZ2Hd |
| d33_achterberg | nQ88nAdjATYPXsSKLDEF |
| d34_achterberg | LfxBgbDCqD7hkQQeCRBM |
| d35_hollweg | 0di9sxunU64lQlUqw87a |
| d36_roth | sJ82YEniHSA5rSiGsfos |
| d37_roth | aoxofwGUmaQZksOYd0QO |
| d38_hollweg | zULkfQp0VpBx33LPlsf8 |
| d39_krull | z0RErnWx21ngSeMorxgu |
| d40_brummer | 0OVqCy4esEpft05thLrs |
| d41_brummer | AOHmORTNLwo0g8yZj3Jz |
