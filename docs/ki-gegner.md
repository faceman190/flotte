# Gegner-KI: Plünderer mit Deckung (seit 26.11.2026)

Wunsch des Spielers: „NPCs, die rumlaufen und mit dir interagieren, und auch feindliche, die angreifen, denken, in Deckung gehen usw.“
Entscheidung: zuerst die Feinde. Erster Gegner ist ein Trupp **Plünderer** mit Gewehr in einem kleinen Lager auf dem Planetenboden.
Vorerst nur über das Testlabor (F8 → Welt → „Lager vor mir aufstellen“), noch nicht von selbst in der Welt.

Code: `src/game/ki/` (Bausteine ohne three.js) und `src/game/ki/pluenderer.ts` (der Gegner im Spiel). Anschluss an den Kampf zu Fuß über
`FELD_EXTRA` in `src/game/fieldfight.ts`. Test ohne Bild: `node scripts/kitest.mjs`.

## Was der Spieler sieht

- **Lager:** etwa 38 m vor dem Piloten ein Platz mit Sandsackwällen (halbhoch), Kisten, Kistenstapeln und einem Container (hoch) und
  Fässern. Drei bis sechs Plünderer, je nach Gefahr des Sektors. Zwei halten Wache am Lager und schauen sich um, die anderen gehen Streife
  auf einem Ring um das Lager.
- **Bemerken:** Wer in ihr Blickfeld kommt, wird nicht sofort beschossen. Je nach Abstand dauert es etwa 0,3 s (ganz nah) bis knapp 1 s
  (am Rand der Sichtweite von 48 m), geduckt länger. Wer hinter ihnen ist, wird erst ganz nah (3,5 m) bemerkt. Schüsse und Granaten hören
  sie bis 60 bis 80 m weit; dann gehen sie vorsichtig zur Stelle und sehen nach („Was war das?“).
- **Alarm:** Wer den Spieler entdeckt, ruft („Kontakt!“) und gibt die Stelle an den Trupp weiter. Im Kampf sehen sie weiter (75 m) und fast
  rundum.
- **Deckung:** Sie laufen zu einer Deckung, die sie vor dem Spieler schützt und aus der sie schießen können. Hinter halbhohen Wällen hocken
  sie und stehen zum Schießen auf; an hohen Kisten und am Container lehnen sie sich seitlich heraus. Nach einer Salve tauchen sie wieder ab.
  Wer unter Feuer steht (auch knapp daneben oder in die Deckung), bleibt länger unten.
- **Trupp:** Höchstens zwei schießen gleichzeitig; die Freigabe wandert alle paar Sekunden weiter. Jeder zweite hat die Rolle „vor“ und
  flankiert: Er sucht eine Deckung seitlich des Spielers („Ich flankiere!“).
- **Nachladen** nach 30 Schuss (2,4 s, geduckt), **Granaten** weichen sie aus, **Rückzug** bei schweren Treffern oder wenn der Trupp
  schrumpft (zu einer Deckung weiter weg, ohne Rücksicht auf die Schusslinie). Steht der Spieler ganz nah vor ihnen und sie sind gesund,
  stürmen sie.
- **Rufe** stehen kurz als Text über dem Kopf (bis 35 m). Vertonung fehlt noch.
- **Treffer:** Kopf zählt 1,6-fach. Leben 85 (mehr in gefährlichen Sektoren). Ausgeschaltet: Credits wie bei Drohnen (etwas mehr),
  20 % Fund (Waffe, Helm, Weste). Die Leiche bleibt 25 s liegen.
- **Fair:** Ihre Treffer sind Würfe, keine perfekten Schüsse: auf 40 m trifft etwa jeder vierte bis fünfte Schuss einen stehenden Spieler.
  Schlechter, wenn der Spieler läuft oder sich duckt, wenn sie selbst laufen oder unter Feuer stehen, und bei den ersten Schüssen auf ein
  neues Ziel. Schaden 6 je Treffer (mehr in gefährlichen Sektoren). Wer still im Freien steht, hält gegen vier etwa 15 bis 25 s durch (100 Leben, ohne Schutzausrüstung).
- Deckungen halten auch die Schüsse des Spielers auf (Wälle, Kisten, Container). Man läuft nicht durch Hindernisse und Plünderer hindurch.

## Wie es gebaut ist

| Baustein | Datei | Aufgabe |
|---|---|---|
| Wahrnehmung | `ki/wahrnehmung.ts` | Sichtkegel, Sichtlinie (Gelände und Hindernisse), Wert „wach“ 0..1, Gehör, Gedächtnis (zuletzt gesehen), Kampfzustand bis 25 s ohne Spur |
| Entscheiden | `ki/gehirn.ts` | Utility-KI: alle 0,3–0,5 s Werte für Streife, Untersuchen, Sichern, Deckung, Schießen, Flankieren, Nachladen, Rückzug, Ausweichen, Stürmen; die beste gewinnt, die laufende hat einen Bonus. Feuerfreigabe des Trupps (`Freigabe`) |
| Deckung | `ki/deckung.ts` | Punkte an den Seiten der Hindernisse (halbhoch: hocken/aufstehen, hoch: an den Kanten herauslehnen), Bewertung je Lage: schützt, Schusslinie frei, Abstand zur Waffe, Weg nicht am Ziel vorbei, Abstand zu Kameraden, Flanke |
| Wegfindung | `ki/navi.ts` | Navmesh mit recast-navigation-js, zur Laufzeit aus Gelände und Hindernissen gebaut (rund 50–100 ms), Wege und Bewegung auf dem Navmesh |
| Lager | `ki/lager.ts` | Plan aus einem Startwert (alle Mitspieler sehen dasselbe), schlichte Modelle, Dreiecke fürs Navmesh |
| Plünderer | `ki/pluenderer.ts` | Ablauf je Gegner (Wahrnehmen → Entscheiden → Ausführen), Schießen, Treffer, Tod, Netz, Anzeige |

- **Körper:** dieselbe Figur wie Mitspieler und Stadtwachen (Manny-Skelett, `fremdFigur.ts`) mit Lyra-Gewehr. Haltung, Ducken, Zielen,
  Schuss, Nachladen, Treffer und Tod kommen von dort. Tracht: Overall 2, Stiefel 2, teils Helm 2 und Weste, Figur 1–3 abwechselnd.
- **Wegfindung laden:** Die Bibliothek (0,73 MB, 230 KB gepackt) liegt als eigene Datei `lazy/Recast` in der Paketliste und wird erst geholt,
  wenn ein Lager entsteht. Erzeugt von `scripts/recast-pack.mjs` (in `npm run assets` enthalten; einzeln: `node scripts/build-recast.mjs`).
  Fehlt sie, laufen die Plünderer geradeaus und bleiben an Hindernissen stehen.
- **Mehrspieler:** wie die Drohnen. Wer ein Lager aufstellt, meldet Ort und Startwert (`kl`); der Gastgeber des Planeten rechnet alle
  Plünderer und schickt 10× je Sekunde Stand, Schüsse und Abschüsse (`kst`, alle 2 s auch das Lager für Nachzügler); Mitspieler melden
  ihre Treffer (`kh`). Jeder Treffer an einem Mitspieler wird beim Gastgeber gewürfelt und kommt bei diesem an.
- **Kosten:** Die Logik braucht für sechs Plünderer im Mittel unter 0,1 ms je Bild (gemessen in Node). Zeichnen kostet wie sechs Stadtwachen;
  ab 50 m die einfache Stufe, ab 260 m gar nicht.
- **Debug-Ansicht** (Testlabor, Haken unter dem Knopf): über jedem Plünderer Aktion, Phase, Rolle, „wach“, Niederhalten, Magazin und die
  drei höchsten Werte; seine Wegpunkte als Linie; alle Deckungspunkte (grün halbhoch, blau hoch mit Lehnseite, dunkelblau nur Verstecken,
  rot belegt); oben links Zahl der Lebenden, Navmesh, Feuerfreigaben.

## Stellschrauben

- Waffe, Tempo, Leben: `WAFFE`, `TEMPO`, `LEBEN` oben in `pluenderer.ts`; Trefferwahrscheinlichkeit in `trefferChance`.
- Sehen und Hören: `SINN` in `wahrnehmung.ts`. Deckung: `DECK` in `deckung.ts`.
- Verhalten: die Formeln in `bewerte` (`gehirn.ts`). Größere Zahl = wird öfter gewählt.

## Geprüft

`node scripts/kitest.mjs` (ohne Bild, Ersatz für die Spielmodule in `scripts/kitest/`): Strahl gegen Quader, Deckungspunkte und -wahl,
Bemerken nach Abstand, Haltung und Sichtlinie, Entscheidungen in acht Lagen, Feuerfreigabe, Navmesh (30 Wege quer durchs Lager, keiner
durch ein Hindernis), ein Gefecht über 60 s gegen einen stehenden Spieler (Trupp geht nach gut 2 s in Deckung, schießt fast nur aus der
Deckung, flankiert, lädt nach) und ein Schuss hinter einem Erdwall (der Trupp sieht nach).
Im Spiel selbst ist es noch **nicht angesehen** (der Cloud-Rechner kann nicht rendern): Haltungen hinter der Deckung, Herauslehnen,
Laufen über das Gelände und die Rufe müssen im Testlabor geprüft werden.

## Offen

- Im Spiel ansehen und einstellen (siehe oben), vor allem: sieht das Hocken/Aufstehen hinter den Wällen gut aus, trifft das Herauslehnen
  an den hohen Kisten, sind sie zu stark oder zu schwach.
- Echte Deckungs-Clips fehlen (an der Wand lehnen, seitlich herausschießen, blind feuern); jetzt Hocken plus Aufstehen bzw. ein seitlicher
  Schritt. Quellen: ein Cover-Paket von Fab oder Cascadeur.
- Modelle des Lagers sind schlichte Formen; echte Modelle an dieselben Quader stellen (`lager.ts`).
- Rufe vertonen (Stimmen wie bei den Drohnen, `barks.ts`).
- Lager von selbst in die Welt setzen (z. B. an Wracks, die Plünderer ausschlachten) und an Aufgaben/Geschichte hängen.
- Granaten werfen die Plünderer noch nicht; Nahkampf (Schubsen/Takedown aus dem Game Animation Sample) fehlt.
- Dieselbe KI für Minen (Kachelraster, Navmesh aus den Wänden), Stationen und Städte; dort das Navmesh beim Packen vorab backen.
- Danach die friedlichen Figuren auf Manny und Navmesh umstellen (Sitzplätze, mit E ansprechen), Reaktionen auf Kampf (fliehen, ducken).
