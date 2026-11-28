# Einstieg: Wegweiser zu Fuß und Hilfe beim Reisen

Stand 26.11.2026. Anlass: Beim Spieltest mit Freunden fand einer Ratsherr Hollweg in der Bastion nicht, ein anderer kam im All mit Reiseflug
und Kurzsprung nicht zurecht.

## Wegweiser zu Fuß (`interior.ts`, `deck.ts`, `wegweiser.ts`)

- In Stationen zeigt eine Marke mit Entfernung den Weg, außerhalb des Bildes ein Pfeil oben in der Mitte. Ziele, in dieser Reihenfolge:
  Figuren der Geschichte (stehen meist im Hangar), das Ziel des aktuellen Schritts (`walk` am Schritt, z. B. der Markt-Tresen im Prolog),
  die Abgabe einer erledigten Stationsaufgabe (`aufgabeAbgabe`).
- Auf dem Deck führt der Pfeil um Ecken: `Deck.route(x, z, tx, tz)` gibt den nächsten Wegpunkt und die Weglänge. Rundhalle: aus Buchten und
  Flügeln erst in die Halle, zwischen Halle und Hangar durch den Korridor. Raster-Decks (Eisenkrone, Pumpwerk): Breitensuche durch Zellen und Türen.
- Nah und sichtbar (unter 14 m) reicht der Name über der Figur; die Marke verschwindet.
- Prüfen: `T.INT.walkGoalDebug()` im Testfenster (scripts/probelauf.js).

## Reisen im All (`schnellflug.ts`, `ui/controls.ts`, `main.ts`)

- **N ohne Ort im Fadenkreuz** setzt Kurs auf das Ziel des Auftrags (`goalNav`: Geschichte, dann Stationsaufgabe, dann Auftrag; liegt die
  Marke an einer Station, ist die Station das Ziel). Danach sagt der Funk einmal, wie es weitergeht (bis der Schnellflug einmal benutzt wurde).
- **Steuerungsleiste:** Ist das Ziel weit weg und kein Kurs gesetzt, steht „N · Kurs auf …“ hervorgehoben da. Mit Kurs „H · Kurzsprung → …“;
  geht er gerade nicht, steht der Grund dabei (`sfBlock`: Gefecht, Feld, Station). „Umschalt · Navigationsflug“ (damals „Reiseflug“) bleibt stehen, solange ein Ziel
  weiter als 1,5 km entfernt ist (vorher nur in den ersten zehn Spielminuten).
- **J** schaltet den Navigationsflug selbst ein (vorher: Absage „nur im Reiseflug“). Die Auftragszeile „Springe ins …“ sagt jetzt „J springt“.
- **Esc → Steuerung** beginnt mit einem Absatz „Reisen im All, drei Stufen“.

## Navigationsflug und Stationsmarken (28.11.2026, `ui/hud.ts`, `ui/controls.ts`)

Wunsch von Face: Die Marken der Stationen sollen nur im Reisemodus erscheinen; der Reiseflug heißt seitdem **Navigationsflug**
(Umschalt, Code weiter `G.cruise`).

- Im normalen Flug (Manöverflug) zeichnet das HUD keine Stations- und Ortsmarken (Raute, Quadrat) und keinen Randpfeil zum Heimathafen mehr.
  Im Navigationsflug und im Schnellflug (`navMarken()` in `hud.ts`) stehen sie wie vorher da.
- Immer sichtbar bleiben: das gesetzte Navigationsziel (N, Sektorkarte, Kurs auf den Auftrag) samt Name und Klammern, die Marken der Aufträge
  und der Geschichte, Sprungtore, die Anflugzone zum Planeten, der Andockrahmen „ANDOCKEN“ unter 900 m und mit **Alt** alle Namen.
  So funktionieren die Reisehilfen aus dem Spieltest (N → H, „Kurs auf …“) unverändert.
- Die Steuerungsleiste zeigt „Umschalt · Navigationsflug: Stationsmarken, schneller“ jetzt auch, solange kein Navigationsziel gesetzt ist
  (nicht im Gefecht, nicht am Dock); im Navigationsflug „Umschalt · Navigationsflug aus“.
- HUD-Kürzel: Tempoanzeige „m/s · NAV“, Cockpit „NAV“ / „NAVIGATION“, Statuszeile „· NAVIGATIONSFLUG“.
- Offen: Ob die Radar-Punkte der Stationen ebenfalls nur im Navigationsflug erscheinen sollen (bisher unverändert).
