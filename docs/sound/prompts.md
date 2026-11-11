# Geräusch-Prompts für ElevenLabs

Für die Geräuscherzeugung („Sound Effects“). Die Prompts sind englisch, weil das meist genauer trifft.

## So benutzt du die Liste

- **Dateiname** = Kennung in der ersten Spalte, als `.mp3`, Ablage in `asset-src/sound/`.
- **Länge** ist ein Richtwert. Bei Schleifen so lang wie möglich.
- **Schleife:** Wo „ja“ steht, die Schleifen-Option einschalten (falls vorhanden) und auf gleichbleibende Lautstärke achten.
- **Trocken und ohne Musik.** Keine Stimmen, außer es steht dabei.
- **Mehrere Fassungen** erzeugen und die unauffälligste nehmen: Ein Geräusch, das man hundertmal hört, darf nicht nerven.
- Nach dem Ablegen Bescheid sagen. Einige Kennungen sind im Spiel schon verdrahtet (siehe letzte Spalte), die anderen hänge ich dann ein.

## 1. Das eigene Schiff

| Kennung | Länge | Schleife | Prompt | Stand im Spiel |
|---|---|---|---|---|
| `jump_charge` | 6 s | nein | `Sci-fi spaceship jump drive charging up over six seconds. Starts as a low electrical hum, rises steadily in pitch and intensity, layers of whining energy building, ends at maximum tension right before release. No explosion at the end, no voices, no music.` | neu, ersetzt die Pieptöne |
| `jump_out` | 2 s | nein | `Spaceship jumping to faster-than-light. Sharp energy release, deep bass thump followed by a fast whoosh being sucked away into silence. Powerful, clean, short tail.` | neu |
| `jump_in` | 2 s | nein | `Spaceship arriving from a faster-than-light jump. Reverse whoosh rushing in, ending in a soft deep thud and a short settling hum. Calm ending.` | neu |
| `cruise_on` | 1.5 s | nein | `Spaceship engines spooling up to cruise speed. Turbines rising quickly from idle to a strong steady roar, mechanical and powerful, ends sustained.` | neu |
| `cruise_off` | 1.5 s | nein | `Spaceship engines spooling down from cruise to idle. Turbine whine falling in pitch, settling into a low quiet hum.` | neu |
| `gear` | 2 s | nein | `Heavy spacecraft landing gear moving. Hydraulic whir, metal sliding, firm mechanical clunk as it locks at the end. Close and weighty.` | neu, bei Start und Landung |
| `touchdown` | 1.5 s | nein | `Large spaceship setting down on a metal hangar deck. Heavy muffled thud, landing struts compressing with a short hydraulic hiss, slight metallic resonance in a big hall.` | neu |
| `launch` | 4 s | nein | `Spaceship lifting off inside a hangar. Thrusters igniting, rising roar with echo in a large metal hall, then moving away.` | vorhanden, ersetzt die Kenney-Datei |
| `rocket_fire` | 1.5 s | nein | `Sci-fi missile launch from a spaceship. Sharp ignition burst and a fast hissing whoosh moving away. Punchy, no explosion.` | neu |
| `lock_tone` | 0.6 s | nein | `Short sci-fi target lock confirmation tone. Two quick rising electronic beeps, clean and precise, cockpit computer.` | neu |
| `warn_hull` | 1.2 s | nein | `Spaceship cockpit hull damage warning. Urgent low double buzzer with a metallic edge, serious but not shrill.` | neu |
| `warn_shield` | 1 s | nein | `Energy shield collapsing on a spaceship. Electric crackle dropping in pitch and fizzling out, short.` | neu |
| `warn_heat` | 1 s | nein | `Overheat warning in a spaceship cockpit. Rising electronic alert ending in a hiss of venting steam.` | neu |

## 2. Umgebungen (alle als Schleife)

| Kennung | Länge | Prompt | Stand im Spiel |
|---|---|---|---|
| `amb_hangar` | 20–30 s | `Seamless looping ambience of a huge spaceship hangar bay interior. Deep, steady low-frequency hum of large ventilation and power systems, wide reverberant metal hall. Faint distant mechanical activity: a far-off pneumatic hiss, a soft metallic clank now and then, quiet electrical buzz. Calm, spacious, slightly cold. No voices, no music, no alarms, no footsteps, no sudden loud events. Constant volume.` | neu, nur auf dem Hangardeck |
| `amb_station` | 20–30 s | `Seamless looping ambience of a space station promenade. Soft murmur of a distant crowd, indistinct and wordless, gentle air circulation, faint electronic chimes far away, warm and inhabited. No clear speech, no music, no sudden events. Constant volume.` | vorhanden, ersetzt die Kenney-Datei |
| `amb_ship` | 20–30 s | `Seamless looping room tone inside a medium-sized spaceship. Quiet steady engine hum felt through the hull, soft air recycling, occasional tiny electronic tick. Intimate, enclosed, calm. No voices, no music, no events. Constant volume.` | vorhanden, ersetzt die Kenney-Datei |
| `amb_planet_wind` | 20–30 s | `Seamless looping wind on a barren alien planet. Steady medium wind over rock and dust, occasional soft gusts, empty and lonely. No animals, no voices, no music.` | neu, Planetenoberfläche |
| `amb_planet_ice` | 20–30 s | `Seamless looping wind on a frozen ice planet. Thin cold whistling wind, faint cracking of ice far away, crystalline and bleak. No voices, no music.` | neu, Eisplaneten |
| `amb_planet_lava` | 20–30 s | `Seamless looping ambience of a volcanic planet. Low rumbling ground, distant bubbling lava, hot wind, occasional soft hiss of steam. No voices, no music.` | neu, Vulkanplaneten |
| `entry` | 4 s (keine Schleife) | `Spaceship entering a planet's atmosphere. Roaring wind and fire building up, hull shaking and rattling, then easing off as it breaks through. No explosion.` | neu, Landeanflug |

## 3. Gegner und Kampf

| Kennung | Länge | Schleife | Prompt | Stand im Spiel |
|---|---|---|---|---|
| `ferrox_attack` | 1 s | nein | `Alien metal-eating swarm creature attacking in space. Harsh metallic screech with grinding, tearing texture, insect-like and aggressive, short.` | neu |
| `ferrox_death` | 1.5 s | nein | `Alien machine-creature breaking apart. Metallic shriek cut off by a crunchy burst of shattering metal fragments, brittle and sharp.` | neu, zusätzlich zur Explosion |
| `torpedo_fire` | 1.5 s | nein | `Alien plasma torpedo launch. Deep pulsing energy charge released with a heavy thrum, ominous, slow.` | neu |
| `torpedo_fly` | 6 s | ja | `Seamless looping hum of a slow alien plasma torpedo flying. Pulsing low throb with a wavering electric shimmer, menacing.` | neu |
| `mother_hum` | 20 s | ja | `Seamless looping drone of a gigantic alien hive ship. Extremely deep slow throbbing, grinding metal undertones, unsettling and vast. No voices, no music.` | neu, nahe am Mutterschiff |

## 4. Kleinigkeiten

| Kennung | Länge | Schleife | Prompt | Stand im Spiel |
|---|---|---|---|---|
| `step_grate0` bis `step_grate4` | je 0.4 s | nein | `Single footstep of a boot on a metal grating floor. Short, dry metallic clank with slight rattle, close microphone. One step only.` (fünf Fassungen erzeugen) | neu, Gitterrost in der Pfeil |
| `rover_engine` | 8 s | ja | `Seamless looping engine of a small electric planetary rover driving on rocky ground. Whirring motor, crunching gravel under wheels, steady.` | neu |
| `rover_drill` | 6 s | ja | `Seamless looping heavy mining drill grinding into rock. Rough rotating grind, stone cracking, constant.` | neu |
| `drone_hum` | 6 s | ja | `Seamless looping soft whir of a small mining drone hovering. Light electric buzz, gentle and steady.` | neu |
| `scan_pulse` | 1.5 s | nein | `Sci-fi scanner pulse. A clean sonar-like ping expanding outward with a soft shimmering tail.` | neu |
| `band_open` | 0.5 s | nein | `Wrist computer opening. Soft holographic interface swoosh with a small confirming blip, friendly, quick.` | neu |
| `band_close` | 0.4 s | nein | `Wrist computer closing. Soft reverse holographic swoosh, quick and quiet.` | neu |
| `success` | 1.2 s | nein | `Short positive sci-fi success chime. Three clean rising tones, warm, rewarding, not cheesy.` | neu, Auftrag erfüllt |
| `rank_up` | 2 s | nein | `Sci-fi promotion fanfare, short. Warm rising synth chord with a soft brass-like swell, proud and calm.` | neu, Rang gestiegen |
| `oath` | 3 s | nein | `Solemn low orchestral swell with a distant drum hit, dignified and hopeful, short ceremonial sting. No melody.` | neu, Ende der Vereidigung |

## Reihenfolge

Abschnitt 1 zuerst (Sprung, Reiseflug, Fahrwerk: die neuen Funktionen haben bisher fast keinen Klang), dann die Umgebungen.
