#!/usr/bin/env bash
# =====================================================================================
# Letzte Crew – neue Version ausrollen (läuft als Benutzer "crew", jede Minute über letzte-crew-deploy.timer)
#  1. Gibt es auf GitHub (main) einen neuen Stand? Sonst sofort fertig.
#  2. Holen, Spiel bauen (tsc + vite), Website bauen (Astro, Ordner website/), Dateien vorkomprimieren.
#  3. Ins Live-Verzeichnis kopieren, das Caddy ausliefert (Spiel nach /srv/letzte-crew/dist, Website website/dist nach /srv/letzte-crew/site). Alte Spieldateien bleiben liegen (Spieler mit der alten Seite
#     laden sie noch; das Spiel räumt seinen eigenen Speicher selbst auf).
#  4. Den Node-Server nur neu starten, wenn sich server/ oder die Pakete geändert haben (Neustart trennt die Mehrspieler kurz).
# Schlägt ein Build fehl (Spiel oder Website), bleibt die laufende Version unverändert online; derselbe Stand wird dann nicht jede Minute neu
# versucht, erst der nächste Push (oder --force).
# Von Hand: sudo -u crew -H bash /opt/letzte-crew/repo/deploy/deploy.sh --force
# Protokoll: journalctl -u letzte-crew-deploy -n 50
# Testserver (seit 2026-11-20, test.letztecrew.de): dasselbe Skript mit LC_*-Variablen aus letzte-crew-test-deploy.service – Zweig test,
# eigenes Repository, eigene Ordner, eigener Node-Dienst, ohne Website. Ohne die Variablen gilt alles wie vorher (Live).
# =====================================================================================
set -euo pipefail

REPO=${LC_REPO:-/opt/letzte-crew/repo}
SRV=${LC_SRV:-/srv/letzte-crew}
STAGE=$SRV/stage
LIVE=$SRV/dist
SITE=$SRV/site
BRANCH=${LC_BRANCH:-main}
STATE=$SRV/ausgerollt        # zuletzt erfolgreich ausgerollter Stand
FAILED=$SRV/fehlgeschlagen   # zuletzt gescheiterter Stand
SERVICE=${LC_SERVICE:-letzte-crew}   # Node-Dienst, der bei Server-Änderungen neu startet
WITH_SITE=${LC_SITE:-1}              # 0: Website nicht bauen (Testserver)
FORCE=${1:-}

cd "$REPO"
git fetch --quiet origin "$BRANCH"
NEW=$(git rev-parse "origin/$BRANCH")
OLD=$(cat "$STATE" 2>/dev/null || true)
if [[ "$FORCE" != "--force" ]]; then
  [[ "$NEW" == "$OLD" ]] && exit 0
  [[ "$NEW" == "$(cat "$FAILED" 2>/dev/null || true)" ]] && exit 0
fi
trap 'echo "$NEW" > "$FAILED"; echo "FEHLGESCHLAGEN: ${NEW:0:7} – die bisherige Version bleibt online." >&2' ERR

echo "Neue Version: ${OLD:0:7} → ${NEW:0:7}  $(git log -1 --format=%s "$NEW")"
git reset --quiet --hard "$NEW"

# Hat sich deploy.sh selbst geändert, die neue Fassung ausführen: bash liest ein laufendes Skript weiter aus der alten Datei,
# sonst liefe dieses eine Mal noch der alte Ablauf (so geschehen beim ersten Ausrollen der Website, 2ddd45c).
if [[ -z "${LC_NEUSTART:-}" && -n "$OLD" ]] && ! git diff --quiet "$OLD" "$NEW" -- deploy/deploy.sh 2>/dev/null; then
  echo "deploy.sh hat sich geändert – starte die neue Fassung"
  trap - ERR
  LC_NEUSTART=1 exec bash "$REPO/deploy/deploy.sh" "$@"   # LC_*-Variablen gehen mit
fi

# Was hat sich geändert? Ohne bekannten alten Stand (erstes Ausrollen) gilt alles als geändert.
FULL=0
if [[ "$FORCE" == "--force" || -z "$OLD" ]] || ! git cat-file -e "$OLD^{commit}" 2>/dev/null; then
  FULL=1
  CHANGED=""
else
  CHANGED=$(git diff --name-only "$OLD" "$NEW")
fi

# Pakete nur neu installieren, wenn sich die Paketliste geändert hat (oder noch keine da sind)
if [[ $FULL == 1 || ! -d node_modules ]] || grep -qx 'package-lock.json' <<<"$CHANGED"; then
  echo "Pakete installieren …"
  npm ci --include=dev --no-audit --no-fund --loglevel=error
fi

echo "Bauen …"
npm run build --silent

# Website (website/, Astro): vor dem Ausrollen bauen, damit ein Fehler hier nichts halb ausgerollt zurücklässt.
# Liest die Spieldaten aus src/data und kopiert die Schiffsmodelle aus public/assets (website/scripts/modelle.mjs).
if [[ -d website && "$WITH_SITE" == "1" ]]; then
  if [[ $FULL == 1 || ! -d website/node_modules ]] || grep -qx 'website/package-lock.json' <<<"$CHANGED"; then
    echo "Website: Pakete installieren …"
    (cd website && npm ci --no-audit --no-fund --loglevel=error)
  fi
  echo "Website bauen …"
  (cd website && npm run build --silent)
fi

echo "Vorkomprimieren …"
mkdir -p "$STAGE" "$LIVE"
# Spiegel des Builds; .br/.gz sind ausgenommen und bleiben deshalb vom Löschen verschont (precompress räumt Verwaiste weg).
# Ohne Zeitstempel (-rlc statt -a): unveränderte Dateien bleiben unberührt und behalten ihre fertige .br-Fassung.
rsync -rlc --delete --exclude='*.br' --exclude='*.gz' dist/ "$STAGE/"
node deploy/precompress.mjs "$STAGE"

echo "Ausrollen …"
# --delay-updates: alle geänderten Dateien werden erst am Ende auf einmal eingesetzt (Seite, Code und .br passen zusammen)
rsync -rlc --delay-updates "$STAGE/" "$LIVE/"
# Website: gebaute Fassung spiegeln (Seiten und Bilder tragen bei Änderungen neue Namen, verwaiste Dateien fliegen raus)
if [[ -d website/dist && "$WITH_SITE" == "1" ]]; then mkdir -p "$SITE"; rsync -rlc --delete --delay-updates website/dist/ "$SITE/"; fi

if [[ $FULL == 1 ]] || grep -qE '^(server/|package-lock\.json$|package\.json$)' <<<"$CHANGED"; then
  echo "Server neu starten …"
  sudo /usr/bin/systemctl restart "$SERVICE"
fi
echo "$NEW" > "$STATE"
rm -f "$FAILED"
echo "Fertig: ${NEW:0:7}"
