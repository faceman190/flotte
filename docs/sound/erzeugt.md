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
