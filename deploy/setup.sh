#!/usr/bin/env bash
# =====================================================================================
# Letzte Crew – eigenen Server einrichten (einmalig, als root, auf frischem Ubuntu 24.04)
#
#   scp deploy/setup.sh root@SERVER:            # vom eigenen Rechner aus dem Projektordner
#   ssh root@SERVER bash setup.sh letztecrew.de   # Website auf der Domain, Spiel auf spielen.<domain>
#
# Das Skript darf beliebig oft laufen. Beim ersten Mal hält es an und zeigt einen Deploy-Schlüssel, den man auf GitHub
# beim Repository einträgt (Settings → Deploy keys, nur Lesen); danach dasselbe Kommando noch einmal.
# Was es einrichtet: Updates/Firewall/fail2ban, Node 22, Caddy (HTTPS), Benutzer crew, Dienst letzte-crew,
# Auto-Deploy (letzte-crew-deploy.timer: Push auf main → nach 1–2 Minuten plus Bauzeit online). Siehe docs/vps.md.
# =====================================================================================
set -euo pipefail

REPO_URL=${REPO_URL:-git@github.com:faceman190/flotte.git}
APP=/opt/letzte-crew
SRV=/srv/letzte-crew
ENVF=/etc/letzte-crew.env

[[ $EUID -eq 0 ]] || { echo "Bitte als root ausführen."; exit 1; }
. /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || echo "Hinweis: gedacht für Ubuntu 24.04, gefunden: ${PRETTY_NAME:-unbekannt}"

IP=$(hostname -I | awk '{print $1}')
DOMAIN=${1:?Domain angeben, z. B.: bash setup.sh letztecrew.de}
echo "== Letzte Crew einrichten: Website https://$DOMAIN, Spiel https://spielen.$DOMAIN"
echo "   (DNS: A-Einträge für $DOMAIN, www und spielen auf $IP)"

export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=a
APT_OPTS=(-y -q -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)

# ---------- System, Pakete ----------
echo "== Pakete …"
apt-get update -q
apt-get "${APT_OPTS[@]}" upgrade
apt-get "${APT_OPTS[@]}" install curl gnupg ca-certificates git rsync ufw fail2ban unattended-upgrades debian-keyring debian-archive-keyring apt-transport-https

# Auslagerungsspeicher, falls der Server wenig RAM hat (der Build braucht kurz etwa 1–2 GB)
if [[ $(free -m | awk '/^Mem:/{print $2}') -lt 3500 && -z $(swapon --show) ]]; then
  echo "== 2 GB Auslagerungsdatei …"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Node 22 (NodeSource) und Caddy (offizielle Paketquelle)
install -d -m 755 /etc/apt/keyrings
if [[ ! -f /etc/apt/sources.list.d/nodesource.list ]]; then
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list
fi
if [[ ! -f /etc/apt/sources.list.d/caddy-stable.list ]]; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
fi
apt-get update -q
apt-get "${APT_OPTS[@]}" install nodejs caddy
echo "   Node $(node -v), $(caddy version | cut -d' ' -f1)"

# ---------- Sicherheit ----------
echo "== Firewall, Updates, SSH …"
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null   # HTTP/3
ufw --force enable >/dev/null

# Sicherheitsupdates automatisch; falls nötig Neustart nachts um 4:30 (trennt Mehrspieler kurz)
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
cat > /etc/apt/apt.conf.d/52letzte-crew-upgrades <<'EOF'
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "04:30";
EOF
systemctl enable --now fail2ban >/dev/null 2>&1 || true

# Anmeldung nur noch mit Schlüssel – aber nur, wenn root schon einen hinterlegt hat (sonst sperrt man sich aus).
# 01-…: sshd nimmt den ersten Wert; Anbieter legen oft 50-cloud-init.conf mit PasswordAuthentication yes an.
if [[ -s /root/.ssh/authorized_keys ]]; then
  cat > /etc/ssh/sshd_config.d/01-letzte-crew.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
else
  echo "   Hinweis: root hat keinen SSH-Schlüssel – Kennwort-Anmeldung bleibt erlaubt."
fi

# ---------- Benutzer, Ordner, Einstellungen ----------
echo "== Benutzer crew, Ordner …"
id crew >/dev/null 2>&1 || useradd --create-home --shell /bin/bash crew
install -d -o crew -g crew -m 755 "$APP" "$SRV" "$SRV/dist" "$SRV/stage" "$SRV/site"

if [[ ! -f "$ENVF" ]]; then
  cat > "$ENVF" <<'EOF'
# Letzte Crew – Einstellungen des Servers (nach Änderungen: systemctl restart letzte-crew)
PORT=2567
HOST=127.0.0.1
LF_DIST=/srv/letzte-crew/dist
NODE_ENV=production
# Spielstände in der Neon-Datenbank (dieselbe Adresse wie bei Render, mit Anführungszeichen). Ohne diese Zeile speichert
# der Server in /opt/letzte-crew/repo/data/accounts.json (bleibt auf dem eigenen Server erhalten, aber getrennt von Render).
#DATABASE_URL="postgresql://…"
EOF
  chown root:crew "$ENVF"; chmod 640 "$ENVF"
fi

# crew darf genau einen Befehl als root: den Spielserver nach einem Update neu starten
echo 'crew ALL=(root) NOPASSWD: /usr/bin/systemctl restart letzte-crew' > /etc/sudoers.d/letzte-crew
chmod 440 /etc/sudoers.d/letzte-crew
visudo -cf /etc/sudoers.d/letzte-crew >/dev/null

# ---------- Zugang zum Repository (Deploy-Schlüssel, nur Lesen) ----------
CREW_SSH=/home/crew/.ssh
install -d -o crew -g crew -m 700 "$CREW_SSH"
[[ -f $CREW_SSH/id_ed25519 ]] || sudo -u crew ssh-keygen -q -t ed25519 -N '' -C "letzte-crew-deploy@$(hostname)" -f "$CREW_SSH/id_ed25519"
# GitHubs Rechnerschlüssel einmal übernehmen (Fingerabdrücke: docs.github.com → GitHub's SSH key fingerprints)
grep -q '^github.com ' "$CREW_SSH/known_hosts" 2>/dev/null || ssh-keyscan -t ed25519 github.com 2>/dev/null | sudo -u crew tee -a "$CREW_SSH/known_hosts" >/dev/null

if ! sudo -u crew git ls-remote "$REPO_URL" >/dev/null 2>&1; then
  echo
  echo "=================================================================================="
  echo " Noch ein Schritt auf GitHub: Repository → Settings → Deploy keys → Add deploy key"
  echo " Titel: Letzte Crew Server, Haken bei 'Allow write access' NICHT setzen. Schlüssel:"
  echo
  cat "$CREW_SSH/id_ed25519.pub"
  echo
  echo " Danach dieses Skript noch einmal starten: bash setup.sh $DOMAIN"
  echo "=================================================================================="
  exit 2
fi

if [[ ! -d $APP/repo/.git ]]; then
  echo "== Repository holen …"
  sudo -u crew git clone --quiet --branch main "$REPO_URL" "$APP/repo"
fi
install -d -o crew -g crew -m 750 "$APP/repo/data"

# ---------- Dienste ----------
echo "== Dienste, Caddy …"
D=$APP/repo/deploy

cp "$D/letzte-crew.service" "$D/letzte-crew-deploy.service" "$D/letzte-crew-deploy.timer" /etc/systemd/system/
sed "s/__DOMAIN__/$DOMAIN/g" "$D/Caddyfile" > /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null
# validate legt die Logdatei als root an; Caddy selbst läuft als Benutzer caddy
install -d -o caddy -g caddy -m 755 /var/log/caddy
chown -R caddy:caddy /var/log/caddy
systemctl daemon-reload
systemctl enable letzte-crew >/dev/null 2>&1

echo "== Erste Version bauen und ausrollen (dauert ein paar Minuten) …"
sudo -u crew -H bash "$D/deploy.sh" --force

systemctl enable --now letzte-crew-deploy.timer >/dev/null 2>&1
systemctl reload caddy || systemctl restart caddy

sleep 2
echo
echo "=================================================================================="
echo " Fertig. Website:     https://$DOMAIN"
echo "        Spiel:       https://spielen.$DOMAIN   (Zertifikate holt Caddy, sobald das DNS auf diesen Server zeigt)"
echo " Status:              https://spielen.$DOMAIN/status"
echo " Spielstände (Neon):  nano $ENVF  → DATABASE_URL eintragen, dann: systemctl restart letzte-crew"
echo " Protokolle:          journalctl -u letzte-crew -f      journalctl -u letzte-crew-deploy -n 50"
echo "=================================================================================="
systemctl --no-pager --lines=0 status letzte-crew | head -3 || true
