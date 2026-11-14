# Aussehen der Ferrox · Entwurf zum Freigeben

Stand: 2026-11-14. Noch nichts gebaut. Erst nach deinem Okay zu den Entscheidungen unten entstehen Konzeptbilder und Modelle.

## Ausgangslage

- Im Spiel stehen drei Raumschiffe aus Grundformen (`src/models/ferrox.ts`): ein Kegel mit Flügeln, ein Kasten mit Kegelnase, ein Zwanzigflächner mit Stacheln. Alle in schwarzem Chrom mit violettem Leuchten.
- Zu Fuß kämpft man gegen ein gekauftes Drohnenmodell, das mit diesen Schiffen nichts gemeinsam hat.
- Die Geschichte sagt seit Kapitel 4 etwas anderes: Die Ferrox sind die Schürfmaschinen der Erbauer, die nie abgeschaltet wurden. Davon sieht man nichts.

## Leitidee: Werkzeug, nicht Waffe

**Kein Ferrox wurde zum Kämpfen gebaut.** Alles, was dem Piloten wehtut, ist ein Werkzeug: ein Schneidstrahl, ein Greifer, ein Bohrkopf, eine Schleuder für Schlacke. Der Spieler soll beim zweiten Hinsehen erkennen, dass er von Bergbaugerät angegriffen wird. Das ist der Spiegel der Geschichte: Die Crew fliegt selbst mit Bergbaulasern.

## Formensprache: drei Schichten an jeder Maschine

1. **Kern der Erbauer.** Das ursprüngliche Gerät: dunkle, sehr genau gearbeitete Platten mit feinen violetten Adern, wie am Archiv auf Kernkristall. Alt, abgeschliffen, an wenigen Stellen noch makellos.
2. **Flickwerk.** Die Maschinen reparieren sich mit dem, was sie fressen. Aufgeschweißte Bleche aus Menschenschiffen, sichtbar fremd: ein Stück Frachterhülle mit verblasstem Farbstreifen, Nietenreihen, ein halbes Lukenschott. Grob gefügt, schief.
3. **Ferrit.** Kristalle wachsen aus Fugen und Wunden. Je älter die Maschine, desto mehr. Junge Jäger tragen fast keines, ein Bienenstock ist auf einer Seite zugewachsen.

Dazu fünf feste Regeln:

- **Unsymmetrisch.** Links und rechts sind nie gleich. Ein Greifer ist ersetzt, eine Platte fehlt.
- **Kein Gesicht, kein Cockpit.** Statt eines Auges ein Bündel kleiner Linsen an der Stelle, wo das Werkzeug sitzt.
- **Rost statt Chrom.** Mattes Schwarz und dunkles Stahlgrau, braune Rostfahnen, stumpf. Der Name kommt vom Rost; heute glänzen sie wie poliert.
- **Violett sparsam.** Nur als dünne Adern, im Ferrit und im Werkzeug, wenn es arbeitet. Keine großen Leuchtflächen. Das Triebwerk brennt blass violett-weiß.
- **Jeder Typ hat einen eigenen Umriss**, den man auf einen Kilometer erkennt.

## Die Typen

Die Größen bleiben wie heute, damit sich Treffer, Sichtbarkeit und Spielgefühl nicht ändern.

| Im Funk heißt er | War einmal | Größe | Umriss | Werkzeug (im Spiel: Waffe) |
|---|---|---|---|---|
| **Jäger** | Schürfdrohne: sucht Erz, schneidet es heraus | 16 m lang, 26 m breit | Flacher Keil mit zwei ungleichen Greifarmen nach vorn, dazwischen der Schneidkopf. Erinnert an einen Hirschkäfer. | Schneidstrahl aus dem Kopf (die heutigen Schüsse). Beim Feuern glüht der Kopf. |
| **Bomber** | Brecher: zerkleinert Brocken und wirft sie zum Sammler | 35 m | Dicke Trommel mit einer Bohrkrone vorn, die sich langsam dreht, und zwei Schlacketanks an den Seiten. | Schleudert gepresste Schlacke (die heutigen Bomben). Die Krone läuft an, bevor er wirft. |
| **Bienenstock** | Schmelzhütte: nimmt Erz auf, baut daraus neue Maschinen | 200 m | Langer, gerippter Ofenkörper statt eines Sterns. Vorn ein offenes Maul, in dem es glüht. Seitlich Startschächte. Eine Seite ist von Ferrit-Spitzen überwachsen. An Trossen hängen halb gefressene Schiffsrümpfe. | Setzt Jäger aus den Schächten aus; Schneidstrahlen zur Nahabwehr. |
| **Wächter** (zu Fuß) | Wartungsgerät im Inneren von Anlagen | 0,9 m, schwebt | Flacher Rumpf mit drei dünnen Armen: Schweißbrenner, Greifer, Linsenbündel. | Schweißbrenner auf Abstand. |
| **Wächterkern** (zu Fuß) | Fest eingebaute Aufsicht eines Speichers | 2 m | Wie der Wächter, aber dreimal so groß, mit einer Krone aus Ferrit. | Starker Brenner. |

**Im Funk bleiben die Namen der Piloten:** Jäger, Bomber, Bienenstock. So sind die Zeilen aufgenommen, und so reden Leute, die nicht wissen, was sie vor sich haben. „Schürfer“ sagt nur der Ferrit-Leser.

**Später möglich, nicht Teil dieses Entwurfs:** der **Schlepper**. Kleine Klammergeräte, die sich zu Hunderten an einen Rumpf heften und ihn wegziehen. Varga beschreibt sie in Kapitel 4, zu sehen sind bisher nur Ferrit-Klammern.

## Entscheidungen, die du treffen musst

1. **Leitidee „Werkzeug, nicht Waffe“.** Die Ferrox sehen nach verwildertem Bergbaugerät aus, nicht nach Kampfschiffen. Mein Vorschlag: ja.
2. **Weniger Leuchten.** Rostiges Schwarz mit dünnen violetten Adern statt glänzendem Chrom mit Leuchtbalken. Damit sind sie im Dunkeln schwerer zu sehen; die Zielmarke im HUD bleibt. Mein Vorschlag: ja.
3. **Bienenstock als Schmelzhütte.** Ein langer Ofen mit Maul statt der Stachelkugel. Das ändert sein Aussehen am stärksten. Mein Vorschlag: ja.
4. **Menschenschrott am Rumpf.** Erkennbare Teile gefressener Schiffe an jeder Maschine. Das macht sie unheimlicher und erzählt, wohin die verlorenen Frachter gehen. Mein Vorschlag: ja.
5. **Wächter zu Fuß ersetzen.** Das gekaufte Drohnenmodell bringt vier fertige Bewegungen mit; ein eigenes Modell braucht dieselben neu. Mein Vorschlag: erst nach den drei Raumschiffen, als eigenes Vorhaben.
6. **Wer baut.** Zwei Wege:
   - Ich baue die Modelle in Blender (wie die Gebäude aus dem Baukasten). Kostet nichts, das Ergebnis ist kantig und sauber, aber weniger organisch.
   - Du erzeugst sie mit Tripo aus Bildvorgaben (wie die Figuren), ich bereite sie fürs Spiel auf. Das wirkt gewachsener, braucht aber deine Zeit.
   Mein Vorschlag: Jäger und Bomber baue ich, den Bienenstock machst du mit Tripo, weil er am meisten von der überwachsenen Form lebt.
7. **Konzeptbilder vorab.** Vier Bilder über Higgsfield, eines je Typ, zusammen 1 Credit. Du siehst die Richtung, bevor jemand ein Modell baut. Mein Vorschlag: ja.

## Bildvorgaben (Englisch, für Konzeptbilder oder Tripo)

Gemeinsamer Schluss für alle vier:

> Realistic hard-surface science fiction concept art, photographic materials, matte black and dark gunmetal, brown rust streaks, thin faint violet veins, clusters of dark violet crystals growing from seams, asymmetrical, no cockpit, no face, no weapons, no text, no cartoon style, no toy look. Neutral dark grey background, soft studio lighting, three-quarter front view.

**Jäger**

> A derelict autonomous mining drone the size of a small aircraft, flat wedge-shaped body, two mismatched grabber arms reaching forward like the mandibles of a stag beetle, a cutting head with a cluster of small lenses between them. Ancient precise dark plating patched with crudely welded scrap panels from human cargo ships, one panel with a faded paint stripe and rivets. A few small crystals on its back.

**Bomber**

> A heavy derelict autonomous ore crusher machine, thick barrel-shaped body, a large rotary drill crown at the front, two battered slag tanks on the sides, a short launch chute under the drill. Ancient precise dark plating patched with crudely welded scrap panels from human ships. Crystals growing along the seams of the tanks.

**Bienenstock**

> A gigantic derelict autonomous smelter ship, long ribbed furnace hull, a wide open intake maw at the front glowing dull orange from inside, rows of launch chutes along one flank, the other flank overgrown with tall spires of dark violet crystal. Half-eaten hulls of cargo ships hang from cables beneath it. Ancient precise dark plating patched with scrap. Seen from a distance, vast scale.

**Wächter**

> A small hovering maintenance robot, flat oval body about one metre wide, three thin articulated arms: a welding torch, a small gripper, a cluster of lenses. Ancient precise dark plating with thin violet veins, one arm replaced by a mismatched scrap part. Tiny crystals at the joints.

## Technik (für die Umsetzung)

- Ein gemeinsames Texturblatt für alle Ferrox (Platte der Erbauer, Menschenblech, Rost, Adern, Ferrit), damit sie zusammengehören und wenig Speicher kosten.
- Dreiecke: Jäger höchstens 3.000 (oft fünfzehn und mehr im Bild), Bomber 6.000, Bienenstock 40.000 mit einfacher Fernfassung.
- Trefferkugeln bleiben: Jäger 13 m, Bomber 18 m, Bienenstock 80 m.
- Bewegliche Teile: Greifer des Jägers, Bohrkrone des Bombers, Ring oder Trommel am Bienenstock (heute dreht sich der Ring).
- Die Ferrit-Kristalle an Wracks und im Archiv bleiben, wie sie sind; die Maschinen übernehmen deren Material.

## Reihenfolge

1. Konzeptbilder (falls Entscheidung 7: ja), du wählst aus.
2. Texturblatt und Jäger, im Spiel prüfen.
3. Bomber.
4. Bienenstock.
5. Wächter zu Fuß (falls Entscheidung 5: ja).

Jeder Schritt ist für sich veröffentlichbar; alte und neue Modelle können nebeneinander im Spiel stehen.
