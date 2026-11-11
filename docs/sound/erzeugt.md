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
