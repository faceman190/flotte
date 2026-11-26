# Testlabor (F8)

Stand: 24.11.2026 (`src/game/testlabor.ts`, Schalter in `src/game/testflags.ts`). Wunsch des Nutzers: „Ich brauche eine Art Testumgebung
auf unserem Testserver, wo ich das alles einfach testen kann … damit ich Fahrzeuge, Waffen, Animationen, alles besser testen kann.“

## Wo es geht

- Testserver `test.letztecrew.de` (der Hinweis oben links heißt dort „TESTSERVER · F8 TESTLABOR“), lokaler Entwicklungsserver,
  und überall mit `?dev=1` (derselbe Entwicklermodus wie die Funkbefehle `/geld` usw., `?dev=0` schaltet ab).
- Auf spielen.letztecrew.de ohne `?dev=1` gibt es kein F8.
- Solange das Menü offen ist, bekommt das Spiel keine Tasten; Esc oder F8 schließt.
- Alles ändert den echten Spielstand auf diesem Gerät und dieser Adresse (der Testserver hat seinen eigenen Speicher).

## Bereiche

**Reisen:** jede Station (zu Fuß in der Station oder im All davor) und jeder Planet (gelandet im Dachs, gelandet im Wiesel, zu Fuß an der Basis).
Doppelklick oder „Hinreisen“. Läuft über denselben Weg wie „Weiterspielen“ (`resumeAt` in main.ts); auf Planeten sucht es eine trockene,
flache Stelle 300–900 m neben der Basis.

**Ausrüstung:** +100.000 Cr, alles auffüllen, jedes Schiff (einsteigen; das bisherige bleibt im Hangar der Station bzw. Heimatstation),
Bodenfahrzeug fürs nächste Landen (schaltet beide frei), jeder Gegenstand nach Art (Waffen, Helme, Westen, Anzüge, Module, Schiffsteile …)
in den Rucksack oder gleich angelegt, Fracht +20 oder leeren.

**Figur & Animation:**
- Figur 1–3 wählen.
- Zeit: normal, 0,5×, 0,25×, 0,1× (gilt fürs ganze Spiel: `TESTF.zeit` auf den Zeitschritt in main.ts). Mit [V] auf Schulterblick.
- Animator-Anzeige oben links: Zustand, Gangart, Tempo, Blickrichtung, Fußsperren und die stärksten Clips der eigenen Figur (zehnmal je Sekunde).
- Clip-Vorführung: Suche im Bewegungssatz (alle geladenen Clips), „Vor mir abspielen“ stellt eine zweite Figur in der eigenen Tracht 3 m vor
  den Piloten, die den Clip in Schleife spielt (ohne Wurzelbewegung), Tempo 0,25× / 0,5× / 1. Nur zu Fuß auf Planeten.

**Welt:** Plündererlager mit Gegner-KI vor dem Piloten aufstellen oder entfernen, dazu eine Debug-Ansicht (nur zu Fuß auf Planeten, [ki-gegner.md](ki-gegner.md)), unverwundbar (Schiff, zu Fuß, Mine), Begegnung jetzt (Kapsel, Treibgut, Panne, Angriff; nur im Flug), Kapitel 1–5 abschließen
(dann stören keine Szenen mehr, nicht rückgängig), Pause der Stationsaufgaben zurücksetzen.

## Erweitern

Neue Knöpfe in `html()` (Abschnitt je Reiter) mit `data-a="<aktion>"`, die Aktion in `act()`. Was main.ts-intern ist (Reisen, Schiffswechsel),
geht über `testHooks`, die main.ts setzt.
