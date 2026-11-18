# Bildprompts für die neuen Modelle (GPT Image)

Stand 2026-11-18. Entwürfe für die Konzeptbilder zu Phase 2 und 3 von Heimstatt und zur Gedenkboje im Sonnenfeld (Konzept: `docs/heimstatt.md`).
Die Bilder dienen als Vorlage für die Modelle in Blender, so wie beim Ferrox-Jäger und beim Bienenstock.

## So benutzt du sie

1. Für jedes Bild: zuerst den **Stilblock**, dann den Block **Blattaufbau**, dann den Prompt des Modells einfügen (alles in einen Prompt).
2. Format 3:2 quer (z. B. 1536 × 1024), höchste Qualität.
3. Wenn ein Bild gefällt: im selben Chat nachschärfen („mehr Details am Rumpf“, „Farben gedeckter“, „nur die Seitenansicht groß“).
   Für Blender helfen am meisten eine saubere Seiten- und Draufsicht.
4. Schrift auf den Bildern (Namen, Beschriftungen) gerät GPT Image oft falsch. Die richtigen Namen setze ich im Modell selbst. Auf dem Bild
   zählt nur, *wo* Schrift sitzt.
5. Keine Vorbilder aus anderen Spielen nennen (Namen, Logos). Die Prompts beschreiben alles selbst.

## Stilblock (immer vorweg)

```
Grounded, realistic hard-surface sci-fi concept art for a space game. Industrial, functional, used and maintained, never toy-like:
painted steel and dark gunmetal panels with visible panel seams, bolts, rivets, access hatches, vents, cable bundles, pipes, handrails,
maintenance ladders, small stencilled markings and hazard stripes, scuffs, dirt in corners, worn edges. Muted, desaturated colours with
small accents only. Lights are small practical navigation lights and floodlights, no neon, no glowing crystals, no magic energy, no fantasy
shapes. Believable engineering and believable scale. Physically plausible lighting: one hard key light like a distant sun, a soft fill,
a subtle rim light. High resolution, sharp fine detail.
```

## Blattaufbau (immer danach)

```
Layout: a single industrial-design concept sheet on a neutral dark grey background. One large three-quarter hero view on the left,
and on the right smaller flat orthographic views without perspective: front, side and top. Same object, same colours and same details in
every view. A small 1.8 m tall human silhouette next to the side view for scale. No text, no labels, no logos on the sheet itself;
only small stencils and markings on the object.
```

## Farbsprache

- **Flotte** (Bastion, Akademie, Torwachen, Leitbojen, Alte Werft, Horchposten): mittelgrau und dunkles Gunmetal, schmale amberfarbene
  Streifen, weiße Schablonenschrift, kleine rote und grüne Positionslichter.
- **Bergbaugilde** (Pumpwerk, wie die Eisenkrone): Oxidrot, Petrol, Messingbeschläge, natriumorange Flutlichter.
- **Gedenkboje:** geschwärzter Stahl und dunkle Bronze, Messingtafeln, ein einziges warmweißes Leuchtfeuer.

---

## 1. Gedenkboje am Halden-Tor (Sonnenfeld)

**Wofür:** Erinnerung an den Riss. Sie steht an den Trümmern des Halden-Tors und trägt die Namen der elf Schiffe, die nicht ankamen. Dazu kommt
ein Archiv mit Funksprüchen aus Jahr 0. Ein stiller Ort ohne Kampf.
**Größe:** etwa 18 m hoch, schwebt frei im All.

```
A memorial buoy floating in deep space, about 18 metres tall, built by a stranded human crew to remember eleven colony ships that never
arrived. Slender vertical body of blackened steel and dark bronze, like a lighthouse mast without ground: a heavy lower counterweight
section, a middle ring of eleven tall brass name plates arranged around the hull (engraved ship names, slightly weathered, each with a small
recessed lamp below it), and an upper section with a small radio antenna array and one single warm white beacon lamp inside a protective
cage. A small docking handle ring and a maintenance hatch with a radio archive console behind a window. Quiet, dignified and handmade
rather than military, but still sturdy engineering. In the background, huge broken fragments of an ancient ring-shaped jump gate drift
among dark ore-rich asteroids, lit by an old yellow sun.
```

**Varianten:** „close-up of the ring of eleven brass name plates“, „the buoy small in the foreground, the broken gate fragments large behind it“.

## 2. Leitboje (Verkehrswege in Heimstatt)

**Wofür:** Markiert die Fluglinien zwischen Toren, Ring, Bastion und Eisenkrone, alle paar Kilometer eine. Kommt oft vor, deshalb eher schlicht.
**Größe:** etwa 6 m.

```
A navigation buoy for spaceship traffic lanes, about 6 metres long. Compact cylindrical steel body in mid grey with a thin amber stripe,
a short lattice mast with a transponder antenna, two small solar panel wings, a ring of four small marker lamps (white front, amber sides,
red rear) and one flashing strobe on top. Small thruster nozzles for station keeping, a numbered stencil plate, bolted service panels,
handrails for maintenance crews, slight wear and micrometeorite pitting. Functional, mass-produced, unglamorous.
```

## 3. Akademie-Übungsgelände: Leitstand

**Wofür:** Zentrum des Übungsgeländes der Flottenakademie. Hier werden neue Piloten geprüft. Ein Beobachtungsdeck mit Blick auf Ringparcours
und Schießbahn, ein kleiner Landeplatz.
**Größe:** etwa 70 m.

```
A small orbital training control platform of a pilot academy, about 70 metres across. A flat hexagonal deck with an elevated glazed
observation bridge on top (instructors' stations visible as small silhouettes behind angled windows), a short landing pad for two small
fighters with painted markings and floodlights, a tall mast with a range-control antenna and signal lamps, storage racks for target drones
along one side, radiator fins and a compact reactor module underneath. Fleet colours: mid grey and gunmetal with amber stripes, white
stencils, black-and-amber hazard bands at the pad edges. Clean, well kept, slightly scuffed from daily use.
```

## 4. Akademie: Zieldrohne

**Wofür:** Übungsziel für Kanonen und Raketen. Fliegt langsame Bahnen und lässt sich treffen, ohne zu zerbrechen.
**Größe:** etwa 4 m.

```
A remote target drone for gunnery training, about 4 metres long. Boxy armoured body with replaceable impact plates (some dented and
scorched from hits), high-visibility markings in faded orange and white checks, four small thruster pods, a sensor puck that registers
hits, a tow hook, a small beacon lamp and a stencilled serial number. Robust, cheap, repaired many times with mismatched panels.
```

## 5. Akademie: Ringparcours-Tor

**Wofür:** Ringe, die man im Parcours der Reihe nach durchfliegt. Sie sollen auch aus der Entfernung gut zu sehen sein, ohne zu blenden.
**Größe:** etwa 40 m Durchmesser.

```
A flight-course ring gate for pilot training, about 40 metres in diameter, floating in space. A segmented steel ring made of eight
truss segments joined by bulky node boxes, each node with a small white lamp facing inward and an amber lamp facing outward, a numbered
panel on the top segment, small station-keeping thrusters, cable runs along the truss. Fleet grey with amber end caps. Practical
construction, no energy field inside the ring, only empty space.
```

## 6. Alte Werft: Trockendock-Gerüst

**Wofür:** Die erste Werft der Crew, wo in den Jahren nach dem Riss „Schiff für Schiff“ gebaut wurde. Heute aufgegeben, ein Ort für Bergung.
**Größe:** etwa 300 m lang.

```
An abandoned orbital shipyard dry dock, about 300 metres long. An open rectangular frame of heavy steel trusses with gantry cranes on
rails, hanging cable bundles, empty cradle arms, work platforms with broken floodlights, a crew habitat module with dark windows, a fuel
tank with a dent. Faded fleet grey paint with old amber stripes, sun-bleached on one side, scorch marks, torn insulation foil, a few
loose panels floating nearby. Inside the frame a half-finished ship hull skeleton that was never completed. Eerie, quiet, still and lifeless,
but realistic.
```

## 7. Alte Werft: Wrack eines frühen Eigenbaus

**Wofür:** Schiffsrümpfe aus den ersten Jahren nach dem Riss, zusammengebaut aus dem, was die Bastion hatte. Treiben im Wrackfeld, man kann sie bergen.
**Größe:** etwa 60 m.

```
A derelict early-generation spaceship hull, about 60 metres long, built by a stranded crew from salvaged parts: a mismatched mix of
heavy carrier-style armour plates and improvised modules welded together, an exposed engine block with two nozzles, a cargo spine with
empty container clamps, a small cockpit section with cracked windows. Patched hull with visible weld seams, hand-painted numbers, faded
grey and amber paint, one side opened by an old accident so the decks and frames are visible. No lights, drifting slowly, covered in fine dust.
```

**Variante:** „three different hulls of this kind side by side, varying size and damage“.

## 8. Pumpwerk am Reifschleier (Bergbaugilde)

**Wofür:** Nimmt Eis aus dem Feld Reifschleier an, schmilzt es und füllt Wasser und Gas in Tanks. Zweite Gildestation neben der Eisenkrone.
**Größe:** etwa 150 m.

```
An ice processing station operated by a mining guild, about 150 metres long, at the edge of an icy asteroid field. A central melting
plant with insulated tanks and heat exchangers, two long intake arms with conveyor tubes and grab buckets reaching toward the ice field,
large cylindrical storage tanks for water and gas in a row, a radiator array glowing faintly warm, frost and ice crust on the cold side,
dripping refrozen icicles, steam vents. Docking clamps for small mining ships and a hangar door with guild markings. Guild colours: oxide
red, petrol blue-green and brass fittings, sodium-orange floodlights, heavily used and repaired.
```

## 9. Torwache

**Wofür:** Kleine Station der Flotte neben jedem Sprungtor: Verkehrsleitung, Kontrolle, Ankerplatz für Patrouillenjäger.
**Größe:** etwa 120 m, das Tor daneben misst etwa 150 m im Durchmesser.

```
A small fleet guard station positioned beside a large ring-shaped jump gate, about 120 metres long. A compact command tower with a
traffic control room behind angled windows, a short docking spine with two berths for patrol fighters, a sensor mast with rotating radar
dish, searchlights pointed at the gate, a customs inspection arm with a scanning frame, defensive turrets in covered housings, radiator
fins. Fleet colours: mid grey and gunmetal with amber stripes, white stencils, red and green navigation lights. The jump gate behind it is a
heavy steel ring on eight pylons with small warm marker lights, only partly visible.
```

## 10. Horchposten „Fernohr“

**Wofür:** Antennenfeld am Ostrand von Heimstatt, das in Richtung Ferrox-Gebiet lauscht. Aufhänger für spätere Kapitel.
**Größe:** etwa 200 m.

```
A remote deep-space listening post, about 200 metres across, at the dark edge of a star system. A central truss spine carrying three large
parabolic dish antennas of different sizes, all pointing the same direction, plus a field of smaller dipole masts and long wire antennas,
a small crew module with two lit windows, a power module with radiators, a tiny docking port for one shuttle. Fleet grey with white dish
surfaces, faded amber markings, frost on shaded parts. Lonely and isolated, faint stars, one cold blue-white distant sun.
```

---

Wenn die Bilder fertig sind: in den OneDrive-Ordner `Dokumente\Blender` legen oder hier einfügen. Ich baue daraus die Modelle mit dem Baukasten
und den Platten- und Nietenmethoden wie bei Kormoran, Elster und den Ferrox.
