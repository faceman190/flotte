# Website letztecrew.de

Statische Website von Letzte Crew, gebaut mit [Astro](https://astro.build). Das Spiel selbst liegt eine Ebene höher und läuft auf
spielen.letztecrew.de.

## Befehle

```bash
npm install        # einmal
npm run dev        # Entwicklungsserver auf http://localhost:4321
npm run build      # fertige Seite nach dist/
npm run preview    # dist/ ansehen auf http://localhost:4322
```

`dev` und `build` rufen zuerst `scripts/modelle.mjs` auf. Das Skript kopiert die Schiffsmodelle (Meshopt-GLB) aus `../public/assets` nach
`public/modelle/` und schreibt die Zuordnung nach `src/lib/modelle.json`. Beides ist erzeugt und steht nicht im Repository.
Die Modelle kommen von der eigenen Adresse, weil spielen.letztecrew.de für `/assets` keinen CORS-Header schickt.

## Ausrollen

Ein Push auf `main` reicht. `deploy/deploy.sh` baut auf dem VPS erst das Spiel, dann die Website, und spiegelt `website/dist` nach
`/srv/letzte-crew/site`. Caddy liefert diesen Ordner unter letztecrew.de aus. Schlägt einer der Builds fehl, bleibt die laufende Fassung online.

## Wo was steht

| Was | Datei |
|---|---|
| Seitenrahmen, Navigation, Fußzeile | `src/layouts/Base.astro` |
| Farben, Schriften, Knöpfe, Fließtext | `src/styles/global.css` |
| Startseite (Bild, Status, Galaxie, Flotte) | `src/pages/index.astro` |
| Schiffs-Explorer | `src/pages/schiffe.astro`, `src/scripts/explorer.ts`, `src/lib/werte.ts` |
| Galaxiekarte | `src/components/Galaxie.astro` |
| Guides | `src/content/guides/*.md` |
| Neuigkeiten | `src/content/neuigkeiten/*.md` |
| Community, Discord-Link | `src/pages/community.astro`, `DISCORD_URL` in `src/lib/spiel.ts` |
| Bilder | `src/assets/bilder/` (Astro rechnet sie beim Build in WebP-Größen um) |
| Meldeformular, Eingang | `src/pages/melden/`, `src/scripts/melden.ts`, `src/scripts/eingang.ts`, `src/lib/meldung.ts`; Server: `../server/meldungen.mjs` |

## Meldungen (Fehler und Vorschläge)

Spieler melden unter **/melden/** Fehler, Vorschläge oder Sonstiges, auf Wunsch mit Bildschirmfoto (wird im Browser auf höchstens
1600 px verkleinert). Das Formular schickt an `/api/meldung`. Caddy reicht `/api/*` von letztecrew.de an den Node-Server weiter
(`server/meldungen.mjs`), der die Meldungen in `data/meldungen.json` und die Bilder in `data/meldungen/` ablegt. Schutz: Lockfeld
gegen Bots, höchstens 6 Meldungen je Adresse und Stunde, keine IP-Adresse wird gespeichert.

Lesen und abhaken: **/melden/eingang/** (nicht verlinkt, noindex). Der Schlüssel steht auf dem VPS in `/etc/letzte-crew.env` als
`MELDUNGEN_SCHLUESSEL=…` (mindestens 12 Zeichen; nach einer Änderung `systemctl restart letzte-crew`). Ohne Schlüssel bleibt der
Eingang zu, Meldungen werden trotzdem angenommen.

Lokal: Spielserver mit Schlüssel starten (`MELDUNGEN_SCHLUESSEL=… npm run server` im Hauptordner) und `npm run dev` hier; der
Dev-Server leitet `/api` an Port 2567 weiter (`astro.config.mjs`). `npm run preview` kann das nicht.

## Spieldaten

Schiffe und Sektoren kommen direkt aus `../src/data/ships.ts` und `../src/data/galaxy.ts` (`src/lib/spiel.ts`). Ein neues Schiff im Spiel
erscheint damit beim nächsten Ausrollen von selbst im Explorer und in der Tabelle. Der Explorer behandelt die Materialien wie
`src/models/gltfShips.ts` im Spiel (Lackierungen in sRGB, Plattenfugen-Shader für `ext_pan_*`, Fahrwerk = Material `gear`). Ändert sich
das im Spiel, muss `src/scripts/explorer.ts` nachziehen.

## Neuer Beitrag

Eine Markdown-Datei in `src/content/neuigkeiten/` anlegen, Name `JJJJ-MM-TT-kurzname.md`:

```markdown
---
titel: Neues Schiff Sowieso
datum: 2026-11-20
version: Alpha 1.43        # optional; die neueste Version erscheint oben auf der Startseite
kurz: Ein Satz für die Übersicht.
bild: ../../assets/bilder/sowieso.jpg   # optional
---

Text …
```

Guides genauso in `src/content/guides/`, mit `titel`, `kurz`, `reihe` (Reihenfolge), `stufe`, `bild` und `stand` (Spielversion).
