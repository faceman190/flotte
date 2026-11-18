#!/usr/bin/env bash
# =====================================================================================
# Letzte Crew – neue Version ausrollen (läuft als Benutzer "crew", jede Minute über letzte-crew-deploy.timer)
#  1. Gibt es auf GitHub (main) einen neuen Stand? Sonst sofort fertig.
#  2. Holen, bauen (tsc + vite), Dateien vorkomprimieren.
#  3. Ins Live-Verzeichnis kopieren, das Caddy ausliefert (Spiel nach /srv/letzte-crew/dist, Website site/ nach /srv/letzte-crew/site). Alte Spieldateien bleiben liegen (Spieler mit der alten Seite
#     laden sie noch; das Spiel räumt seinen eigenen Speicher selbst auf).
#  4. Den Node-Server nur neu starten, wenn sich server/ oder die Pakete geändert haben (Neustart trennt die Mehrspieler kurz).
# Schlägt der Build fehl, bleibt die laufende Version unverändert online; derselbe Stand wird dann nicht jede Minute neu
# versucht, erst der nächste Push (oder --force).
# Von Hand: sudo -u crew -H bash /opt/letzte-crew/repo/deploy/deploy.sh --force
# Protokoll: journalctl -u letzte-crew-deploy -n 50
# =====================================================================================
set -euo pipefail

REPO=/opt/letzte-crew/repo
STAGE=/srv/letzte-crew/stage
LIVE=/srv/letzte-crew/dist
SITE=/srv/letzte-crew/site
BRANCH=main
STATE=/srv/letzte-crew/ausgerollt        # zuletzt erfolgreich ausgerollter Stand
FAILED=/srv/letzte-crew/fehlgeschlagen   # zuletzt gescheiterter Stand
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

echo "Vorkomprimieren …"
mkdir -p "$STAGE" "$LIVE"
# Spiegel des Builds; .br/.gz sind ausgenommen und bleiben deshalb vom Löschen verschont (precompress räumt Verwaiste weg).
# Ohne Zeitstempel (-rlc statt -a): unveränderte Dateien bleiben unberührt und behalten ihre fertige .br-Fassung.
rsync -rlc --delete --exclude='*.br' --exclude='*.gz' dist/ "$STAGE/"
node deploy/precompress.mjs "$STAGE"

echo "Ausrollen …"
# --delay-updates: alle geänderten Dateien werden erst am Ende auf einmal eingesetzt (Seite, Code und .br passen zusammen)
rsync -rlc --delay-updates "$STAGE/" "$LIVE/"
# Website (vorerst fertige Dateien in site/; wird später gebaut)
if [[ -d site ]]; then mkdir -p "$SITE"; rsync -rlc --delete --delay-updates site/ "$SITE/"; fi

if [[ $FULL == 1 ]] || grep -qE '^(server/|package-lock\.json$|package\.json$)' <<<"$CHANGED"; then
  echo "Server neu starten …"
  sudo /usr/bin/systemctl restart letzte-crew
fi
echo "$NEW" > "$STATE"
rm -f "$FAILED"
echo "Fertig: ${NEW:0:7}"
