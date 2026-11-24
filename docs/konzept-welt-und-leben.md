# Konzept: Welt und Leben (Punkte 6–10)

Stand: 24.11.2026. Auftrag des Nutzers nach dem Vergleich mit Star Citizen: „6-10 hört sich gut an. konzept entwickeln und einbauen im
testserver“. Leitlinien wie immer: realistisch statt verspielt, im Browser flüssig, nichts, was die Geschichte stört, Heimstatt bleibt sicher.

## 6. Tag, Nacht und Wetter auf Planeten

- **Uhr je Planet** aus der echten Zeit (alle Spieler sehen dasselbe): ein Tag dauert 24 Minuten (14 hell, je 2 Dämmerung, 6 Nacht),
  jeder Planet hat seinen eigenen Versatz. Mondwelten ohne Luft: harter Wechsel, schwarzer Himmel.
- **Licht:** Sonne und Grundlicht werden mit der Tageszeit gedimmt und gefärbt (Dämmerung warm, Nacht kaltes Mondlicht), der Himmel dunkelt
  ab (vorhandener Dämmerungswert der Lufthülle), Sterne kommen heraus, Dunst wird dunkler. Die Sonnenrichtung bleibt fest (Schatten und
  Bodenschattierung sind darauf abgestimmt). Keine zusätzlichen echten Lichter (kosten Shader), die Leuchtpunkte von Fahrzeugen,
  Außenstellen und Basen tragen die Nacht.
- **Wetter je Planetentyp:** Eiswelt Schneesturm, Wüste und Kristall Sandsturm, Vulkan und Asche Aschenregen, Felsplaneten Regen, Mond nichts.
  Ein Sturm kommt aus der Uhr (alle sehen denselben), etwa jede halbe Stunde mit einer Wahrscheinlichkeit je Typ, 4–8 Minuten, mit
  Aufziehen und Abflauen. Wirkung: Teilchen um die Kamera, dichter Dunst (Sicht 150–400 m), mehr Wolken, Windgeräusch, Funkmeldung
  „Sturm zieht auf“. Im Sturm halten Bodenfahrzeuge etwas schlechter.
- **Testlabor:** Tageszeit und Wetter von Hand setzen.

## 7. Außenbordeinsatz in der Schwerelosigkeit

- Im All bei fast stehendem Schiff: [F] „Aussteigen (Außenbord)“. Die Figur schwebt im Raumanzug neben der Schleuse.
- **Steuerung:** Düsen am Anzug: WASD, Leertaste hoch, Strg runter, Maus dreht; kleine Trägheit. Anzeige: Sauerstoff (4 Minuten) und
  Düsentreibstoff, Abstand zum Schiff. [F] an der Schleuse: wieder einsteigen. Leerer Sauerstoff: Bewusstlos, das Schiff holt einen
  zurück (Hülle zahlt den Preis).
- **Wozu:** Treibende Kisten und Container (Treibgut der Begegnungen, Bergungscontainer der Alten Werft) mit [E] von Hand bergen, gibt mehr
  als mit dem Traktorstrahl; einfach schön, das eigene Schiff von außen zu sehen.
- Haltung: die Figur in einer ruhigen Schwebehaltung (Stehpose leicht gebeugt, langsames Treiben), keine Laufclips.

## 8. Bergbau mit der Hand

- In den Minen (Stollen auf den Planeten) wachsen **Kristalladern** aus den Wänden, leuchtend in der Farbe des Erzes.
- Mit dem neuen Werkzeug **Handbohrer HB-1** (Ausrüster, Werkzeug-Platz) [E] halten: 3 Sekunden abbauen, dann fallen 1–3 Kristallbrocken
  in den Rucksack (Fundstücke, je nach Planet Eisen-, Titan-, Iridium- oder Ferrit-Kristall). Ohne Bohrer: „Dafür brauchst du einen
  Handbohrer“. Verkaufen beim Ausrüster oder am Markt als Fundstück.
- Adern sind je Mine fest, abgebaute bleiben eine Stunde leer (wie die Kisten).

## 9. Eigenes Quartier auf der Bastion

- Am Treffpunkt von Deck 3 ein Terminal **„Quartiere“**: einmal 2.500 Cr Miete, dann gehört es dir.
- Das Quartier ist ein eigener kleiner Raum (Blender, Bastion-Baukasten-Look): Koje, Spind, Schreibtisch mit Bildschirm, Regal,
  Fenster ins All, Tür. Begehbar wie die Schiffe (Laufkarte).
- **Was es kann:** Koje: ausruhen (Hülle und Gesundheit voll, speichert, hier wacht man nach dem Tod auf). Spind: der vorhandene Spind ohne
  Ausrüster. Regal: zeigt gefundene legendäre Stücke und Fundstücke. Bildschirm: Übersicht (Ruf, Aufgaben, Flotte).
- Zugang: über das Terminal am Treffpunkt („Ins Quartier“), zurück durch die Tür.

## 10. Recht und Ordnung

- **Fahndungsstufe** 0–3 (P.fahndung) mit Zeitpunkt. Steigt, wenn man friedliche Schiffe (Verkehr, Verbündete, Wachen) beschießt oder
  zerstört: Treffer +1 Stufe (höchstens 1), Abschuss +2. Fällt von allein: je Stufe 4 Minuten ohne neue Tat, schneller außerhalb des
  Menschenraums nicht (dort kümmert es keinen: Grenz- und Ferrox-Gebiet zählen nur Taten an Wachen).
- **Folgen:** Stufe 1: Warnung, Wachen beobachten. Stufe 2: Wachen und Torwachen in der Nähe greifen an, Stationen im Menschenraum
  verweigern das Andocken. Stufe 3: dazu Kopfgeldjäger (zwei NPC-Jäger) folgen einem durch den Sektor.
- **Ausweg:** Bußgeld zahlen am Funk der Station ([E] „Bußgeld zahlen“ im Anflug, 500/1.500/4.000 Cr) oder abwarten. Tod löscht die Fahndung,
  kostet aber Ruf beim Flottenrat.
- Anzeige: Stern-Symbol mit Stufe im HUD, Funkmeldungen der Wacht. Heimstatt bleibt sicher: dort gibt es keine Kämpfe mit Wachen, nur
  Andockverbot und Bußgeld.

## Reihenfolge

6 (Wetter) → 8 (Handbergbau) → 10 (Recht) → 9 (Quartier) → 7 (Außenbord). Jeder Punkt kommt einzeln auf den Testserver.
