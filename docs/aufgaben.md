# Aufgaben: Stationsaufgaben, Bodenaufgaben, Schwarzes Brett

Stand: 24.11.2026. Wunsch des Nutzers: Spielerlebnis und Nebenaufgaben ausarbeiten („Stationsaufgaben“, danach aus meiner Liste:
Aufgaben auf Planeten, mehr Stationsaufgaben, Schwarzes Brett).

## Stationsaufgaben (`src/game/aufgaben.ts`)

Leute auf den Decks vergeben sie selbst: hingehen, ansprechen (E), Angebot hören, noch einmal E zum Annehmen; erledigen; zurück und abgeben.
Nach der Abgabe 20 Minuten Pause, nach einer verpassten Frist 5 Minuten.

| Wo | Wer | Aufgabe | Art | Lohn |
|---|---|---|---|---|
| Pumpwerk Reifschleier | Pumpenmeister | 4 Dichtungen aus der Alten Werft | werft | 900 Cr, +15 Gilde |
| | Laborantin | 3 Kernproben aus markierten Brocken | proben | 700 Cr, +12 Gilde |
| | Annahmemeister | 20 Eis in 15 min | ware | 600 Cr + bis 400 Eilbonus, +8 Gilde |
| Bastion, Deck 3 | Krankenstation | 2 Rettungskapseln aus den Begegnungen bergen | kapsel | 1.100 Cr, +12 Rat |
| | Einsatzleitung | 6 Ferrox abschießen (Schiffe, überall) | ferrox | 1.200 Cr, +12 Wacht |
| | Kantine | 15 Eis | ware | 520 Cr, +6 Rat |
| Gildehütte Eisenkrone | Schmelzmeister | 25 Kupfererz in 20 min | ware | 800 Cr + bis 300 Eilbonus, +10 Gilde |

Neue Aufgabe: Eintrag in `AUFGABEN` (station, npc = `tab` der Figur in den Deckdaten, art, Texte). Meldungen von unterwegs:
`aufgabeWerft` (altewerft.ts), `aufgabeAbbau` (mining.ts), `aufgabeKapsel` (begegnungen.ts), `aufgabeFerrox` (combat.ts, killEnemy).

## Bodenaufgaben (`src/game/bodenaufgaben.ts`)

Je Planet mit Basis drei Aushänge, angenommen am Schwarzen Brett:

- **Vorräte zur Außenstelle:** Die Kisten liegen im Fahrzeug. Zur Außenstelle 1,2–2,8 km von der Basis fahren, im Fahrzeug [E] abladen.
  650–1.000 Cr plus Gefahrenzuschlag, Eilbonus bis 300 Cr in den ersten 12 Minuten, +8 Gilde.
- **Vermisster Rover:** Im Suchgebiet (450 m um die Marke) liegt ein umgekippter Dachs, qualmend, mit blinkender Rundumleuchte. Ab 110 m
  gilt er als gefunden, mit dem Sensormast des Wiesel ([R], 1,6 km) sofort. [E] am Rover: Fahrtenschreiber bergen. 900–1.350 Cr, +12 Rat.
- **Erz für die Basis:** 15–25 Einheiten einer Erzart des Planeten (aus dem Dachs oder dem Frachtraum), am Brett der Basis abgeben. +10 Gilde.

Nach jeder Erledigung liegt die nächste Aufgabe derselben Art woanders (`P.bodenGen`), 8 Minuten Pause. Orte werden beim ersten Besuch
auf trockenen, flachen Boden geschoben. Marken auf dem Planeten mit Pfeil am Bildrand, wenn sie verfolgt werden.
Außenstelle: Blender-Modell `asset-src/neu/rover/as_bau.py` (Container auf Kufen, Funkmast, Solarfeld, Dieseltank, Vorratskisten,
Flutlicht), Export `rv_export.py` → `deco/Aussenstelle` und `deco/AussenstelleFern` (11 000 / 1 000 Dreiecke).

## Schwarzes Brett (`src/ui/dock.ts`, im Aufträge-Terminal)

Unter „Deine Aufträge“: die Bodenarbeiten für den Planeten des Sektors (annehmen; Erz an der Basis abgeben) und die Liste, wer auf welcher
Station gerade Arbeit hat. Aufgabenfeld und Flottenband zeigen Stations- und Bodenaufgaben gemeinsam.

## Ruf schaltet frei (`src/game/reputation.ts`)

- Werft: Würger ab „Bekannt“ (Grenzwacht), Kormoran ab „Bekannt“ (Flottenrat), Pfeil ab „Geschätzt“ (Flottenrat), Wisent ab „Geschätzt“
  (Bergbaugilde). Wer das Schiff schon besitzt, behält es. `SHIP_RANG`, `shipLock`.
- Ausrüster: seltene Zufallsstücke (Rang „Episch“) ab „Bekannt“, Spitzenstücke („Legendär“) ab „Vertraut“ bei der Fraktion der Station;
  das Grundsortiment (`immer`: Figurenpaket, Lyra-Waffen) bleibt frei. `gearLock`.
- Flottenband → Ruf: „Freigeschaltet je Rang“ mit Haken und Schlössern (`unlocks`).

## Fremde Bodenfahrzeuge (`src/game/net.ts`, `server/server.mjs`)

Das Netzfeld `v` = [Art, Tempo, Lenkung, x, y, z, qx, qy, qz, qw] des Bodenfahrzeugs (auch wenn der Pilot daneben zu Fuß ist). Bei den
anderen steht das richtige Modell (Dachs oder Wiesel), Räder federn, drehen und lenken (`driveRemoteRover`). Ältere Fassungen ohne `v`
zeigen weiter den starren Rover. Fremde Fahrer sitzen noch nicht sichtbar im Wiesel.
