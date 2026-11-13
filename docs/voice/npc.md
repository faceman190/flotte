# NPC-Rufe (Alpha 0.90)

Kurze Rufe, die neben der Geschichte laufen: Stationspersonal an den Theken, Wächterdrohnen, Andockkontrolle.
Ablage: `asset-src/voice/npc/<Kennung>.mp3`, danach `npm run assets`. Abgespielt über `bark()` in `src/core/audio.ts`
(eigener Kanal; eine Geschichtsstimme hat Vorrang und schneidet den Ruf ab).

Stimmen: Personal männlich **Maks** (`FmACKMYLGND71Mko3lVz`), Personal weiblich **Corinna Core** (`gVOibprogMfmHVVyo5r6`),
Drohnen **Rocco Robot** (`ee2pDOfqzj2pBerZvUCH`, im Spiel zusätzlich metallisch verfremdet), Andockkontrolle **Georg Meister** (`353NZhE0RsQTksFuUR82`, im Spiel mit Funkklang).

## Personal an den Theken (je Theke männlich `_m` und weiblich `_w`)
Die Texte entsprechen `GREET` in `src/game/interior.ts`. Welche Stimme spricht, folgt dem Vornamen der Figur.

| Kennung | Text |
|---|---|
| g_markt | Zeig her, was du im Frachtraum hast. Oder suchst du Ware? |
| g_raffinerie | Die Öfen laufen. Was soll eingeschmolzen werden? |
| g_auftraege | Wir haben immer Bedarf. Schau dir die Aufträge an. |
| g_missionen | Wir suchen verlässliche Piloten. Hier sind die Missionen unserer Fraktion. |
| g_lager | Dein Lagerabteil ist bei uns sicher. |
| g_werft | Auf der Suche nach einem neuen Schiff? |
| g_werkstatt | Was sollen wir an deinem Schiff verbessern? |
| g_service | Reparatur, Munition, Sprengladungen. Alles da. |
| g_info | Willkommen an Bord. Frag, was du wissen willst. |
| g_hangar | Deine Schiffe stehen bereit. |

## Wächterdrohnen (Mine und Planet)
| Kennung | Anlass | Text |
|---|---|---|
| d_alarm1 | entdeckt dich | [cold, mechanical] Eindringling erfasst. |
| d_alarm2 | entdeckt dich | [cold, mechanical] Unbefugter Zutritt. Abwehr aktiv. |
| d_alarm3 | entdeckt dich | [cold, mechanical] Ziel markiert. Feuer frei. |
| d_tot1 | zerstört | [glitching, fading out] Systemausfall... |
| d_tot2 | zerstört | [glitching, fading out] Kern... beschädigt... |

## Andockkontrolle (Funk)
| Kennung | Anlass | Text |
|---|---|---|
| k_an1 | angedockt | [calm, over radio] Andocken bestätigt. Klammern greifen. Willkommen, Pilot. |
| k_an2 | angedockt | [calm, over radio] Landefeld frei, du bist sicher unten. Willkommen zurück. |
| k_ab1 | abgelegt | [calm, over radio] Ablegen genehmigt. Gute Jagd da draußen. |
| k_ab2 | abgelegt | [calm, over radio] Tor ist offen. Flieg vorsichtig, Pilot. |

## Im Spiel
- **Personal:** `talk()` in `interior.ts` → `staffBark(name, theke)`. Frauennamen (Mira, Leta, Ilka, Sefa, Runa, Yara, Edda, Tilda, Nele, Kaja) sprechen mit Corinna, alle anderen mit Maks.
- **Drohnen:** Beim ersten Entdecken (Sicht oder Treffer) ein Alarmruf, beim Zerstören in 60 % der Fälle ein Ausfallruf. Lautstärke nach Entfernung
  (ab etwa 35 m stumm), danach 7 s (Alarm) bzw. 3 s (Ausfall) Pause, damit ein Schwarm nicht durcheinander ruft. In Minen und auf dem Planeten.
- **Andockkontrolle:** angedockt an einer Station → k_an1, gelandet an einer Planetenbasis → k_an2, abgelegt (nach dem Startablauf) → k_ab1 oder k_ab2.
- Ein Ruf entfällt, solange eine Geschichtsstimme spricht; beginnt eine, wird der Ruf ausgeblendet. Es läuft immer nur ein Ruf.
