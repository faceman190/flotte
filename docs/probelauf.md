# Probelauf durch die Geschichte (Bot)

Ein Skript spielt die Geschichte vom Prolog bis zum Ende von Kapitel 5 im Testfenster durch und meldet Hänger, Fehler und jeden Auftragstext.
Zuerst gelaufen für Alpha 1.19 (15.11.2026). Das Skript liegt in `scripts/probelauf.js`.

## Was der Bot tut und was nicht

- Er liest den aktuellen Schritt der Geschichte (`storyChapter`, `storyObjective`, `storyMarkers`) und führt die dazu passende Handlung aus:
  zum Ziel fliegen, andocken, die Figur ansprechen (er stellt den Piloten davor und drückt E über `interact`), scannen, Gegner ausschalten,
  landen, zu Fuß gehen, im Wrack Schalter umlegen und das Ziel bergen, wieder hinaus.
- Er rechnet das Spiel mit `lf.tick` weiter, ohne Bilder zu zeichnen (rund fünfzigmal schneller als in Echtzeit). Ein ganzer Durchlauf dauert
  etwa 30 Sekunden.
- **Er spielt nicht wie ein Mensch.** Er versetzt das Schiff an sein Ziel, statt zu fliegen, schaltet Gegner nach einigen Sekunden direkt aus
  und hält den Rumpf heil. Erz, Kupferbarren, Ferrit, Eis und Helium-3 schreibt er gut, statt sie zu schürfen oder zu kaufen. Geprüft ist damit
  der **Ablauf**: Jeder Schritt lässt sich erreichen und abschließen, jede Szene startet, nichts wirft einen Fehler. Nicht geprüft sind
  Schwierigkeit, Flugwege, Kämpfe und alles, was man hören oder sehen muss.
- Ein Schritt, der nach 300 Sekunden Spielzeit (Geleit und Schlacht: 1.500) nicht fertig ist, gilt als Hänger; der Bot meldet ihn mit dem
  Auftragstext und springt weiter.

## Drei Arten von Läufen

1. **Neues Spiel bis zum Ende**, mit einer Wahl für die drei Entscheidungen (Kapitel 2: Gilde oder Rat, Kapitel 3: Grenzwacht oder Rat,
   Kapitel 4: Rat, Grenzwacht oder Gilde).
2. **Sitzen bleiben:** Der Bot beginnt das nächste Kapitel sofort, während der Pilot noch im Hangar der Schlussszene steht. Im Spiel vergehen
   bis dahin 22 bis 30 Sekunden; wer so lange stehen bleibt, erlebt dasselbe.
3. **Laden an jedem Schritt:** Beim Durchlauf merkt sich der Bot an jedem Schrittbeginn den Spielstand (so, wie ihn das Spiel dort selbst
   speichert). Danach lädt er jeden dieser Stände in einem frischen Fenster über „Weiterspielen“ (der echte Ladeweg) und spielt mindestens
   drei Schritte weiter. Das findet Schritte, die nach Beenden und Wiederkommen nicht mehr weitergehen.

## So startet man ihn

Im eigenen Testfenster auf dem Entwicklungsserver (nie im Fenster des Entwicklers, siehe Merkzettel zum Testfenster):

1. Den Inhalt von `scripts/probelauf.js` in die Konsole geben. Er legt `__setup`, `__bot` und `__orch` an und schaltet das Speichern in
   diesem Fenster ab (`Storage.prototype.setItem`), damit kein echter Spielstand überschrieben wird.
2. Ein Lauf im selben Fenster: `await __setup(); await __bot(); B.start(); await B.run(20000)` (wiederholen, bis `B.done`).
3. Viele Läufe nacheinander in frischen Fenstern: `__orch([{ name: 'neu', ms: 70000 }, …])`; Ergebnisse stehen in `O.res`.
   Für Lade-Tests bekommt ein Eintrag `snap` (Spielstand als Text) und `stop` (Abbruchbedingung als Funktionskörper).

Solange Läufe im Hintergrund laufen, keine Quelldatei speichern: Der Entwicklungsserver lädt die Seite neu und bricht sie ab.

## Wenn ein Kapitel dazukommt

In `scripts/probelauf.js` je Schritt eine Zeile in der Tabelle `H` ergänzen (Schlüssel `ch6:0`, `ch6:1` …) und die Kette in der Liste der
Kapitel nachtragen. Stationen außerhalb von `SEC_OF` dort eintragen.

## Ergebnis für Alpha 1.19

Siehe den Abschnitt „Probelauf“ in `docs/story.md`.
