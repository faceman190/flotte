# Begegnungen unterwegs

Stand: 24.11.2026 (`src/game/begegnungen.ts`). Wunsch des Nutzers aus meiner Vorschlagsliste: zufällige Ereignisse beim Fliegen, damit die langen
Strecken im großen Sektor nicht leer sind.

## Ablauf

- Im Flug (nicht angedockt, nicht direkt an einer Station, nach dem Prolog) kommt alle 3 bis 6 Minuten Flugzeit eine Begegnung: 2,5 bis 6 km
  vor dem Schiff (in kleinen Sektoren bis 3,5 km), nie in Stationen, Toren oder Feldern.
- Funkspruch (Notruf oder Funk) und eine Marke im HUD; die Marke ist auch Ziel für Kurzsprung und Schnellflug (N).
- Wer nicht auf 2 km herankommt, verliert das Signal nach 6 Minuten; wer weiter als 9 km wegfliegt, lässt die Begegnung zurück.
- Eine Begegnung zur Zeit, nur für den eigenen Piloten (nicht im Mehrspieler geteilt).

## Arten

| Art | Was zu tun ist | Lohn |
|---|---|---|
| Rettungskapsel | auf 70 m heran, [E] bergen (3,5 s Traktorstrahl) | 300–500 Cr, +6 Rat |
| Treibgut | 3–5 Container auffliegen (auf 28 m), je 2–5 Einheiten Ware in den Frachtraum | Ware |
| Frachter mit Antriebsschaden | auf 220 m heran, [E] Starthilfe (5 s); danach fliegt er weiter | 450–700 Cr, +5 Gilde |
| Frachter unter Beschuss (nur in unsicheren Sektoren, nie in Heimstatt) | Ferrox erscheinen beim Anflug (2–5 Jäger), alle abschießen | 700–1000 Cr, +10 Wacht, dazu Kopfgeld |

Testaufruf: `begegnungJetzt('kapsel' | 'treibgut' | 'panne' | 'angriff')`.

## Offen

- Funksprüche nicht vertont.
- Weitere Arten denkbar: Schmuggler für die Torwache, Wrack mit Logbuch, Händler mit Sonderangebot.
