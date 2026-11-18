# Eigener Server (VPS) statt Render

Stand 2026-11-18: in Betrieb. VPS bei Hostinger (179.198.219.43, Ubuntu 24.04, 1 Kern, 4 GB), Domain letztecrew.de (DNS bei Hostinger: A/AAAA für @ und spielen, www als CNAME).
Website unter https://letztecrew.de (Ordner website/, Astro, siehe website/README.md), Spiel unter https://spielen.letztecrew.de. Render läuft weiter, bis der eigene Server sicher läuft.

## Warum

Render Free schläft nach ~15 Minuten ohne Besucher ein (erster Besucher wartet 30 bis 60 s, Mehrspieler-Sitzungen enden), hat sehr wenig CPU,
steht ohne Regionsangabe in den USA (Mehrspieler ~150 ms aus Deutschland, jede Speicherung über den Atlantik zur Neon-Datenbank in Frankfurt)
und komprimiert die Spieldaten nach jedem Aufwachen neu, beim ersten Abruf jeder Datei.
Die Bildrate im Spiel ändert sich nicht (gerendert wird im Browser), aber Laden, Mehrspieler und Speichern werden schneller.

## Aufbau

```
Browser ──HTTPS──► Caddy (Port 443, Zertifikat automatisch)
                    ├─ /ws, /status ──► Node-Server (127.0.0.1:2567, Dienst letzte-crew)
                    └─ alles andere ──► /srv/letzte-crew/dist  (vorkomprimiert .br/.gz, Range für Musik, Cache-Regeln wie bisher)
Timer letzte-crew-deploy (jede Minute): git fetch → bei neuem Stand bauen, vorkomprimieren, ausrollen
```

Dateien in `deploy/`:
- `setup.sh`: einmalige Einrichtung als root auf Ubuntu 24.04 (darf beliebig oft laufen)
- `deploy.sh`: neue Version ausrollen (Timer oder von Hand mit `--force`)
- `precompress.mjs`: .br/.gz neben die Spieldateien legen, nur für geänderte Dateien (erstes Mal ~2 Minuten, 235 MB Modelle → 99 MB)
- `Caddyfile`, `letzte-crew.service`, `letzte-crew-deploy.service`, `letzte-crew-deploy.timer`

Verhalten beim Ausrollen:
- Der Node-Server startet nur neu, wenn sich `server/` oder die Pakete geändert haben (sonst bleiben Mehrspieler verbunden).
- Ein kaputter Build lässt die laufende Version online. Derselbe Stand wird nicht jede Minute neu versucht, erst der nächste Push.
- Alte Spieldateien bleiben liegen, damit Spieler mit der alten Seite noch laden können.

`server/server.mjs` versteht dafür `LF_DIST` (Ordner mit dem Spiel) und `HOST` (Bindung). Ohne beide verhält er sich wie bisher (Render).
Bei SIGTERM schreibt er die Spielstände noch weg.

## Schritte

**Du:**
1. SSH-Schlüssel auf deinem PC anlegen (falls noch keiner da ist). In PowerShell: `ssh-keygen -t ed25519` (Enter für alle Fragen,
   ein Kennwort für den Schlüssel ist optional). Der öffentliche Teil liegt danach in `C:\Users\<du>\.ssh\id_ed25519.pub`.
2. Bei Hetzner Cloud (oder einem anderen Anbieter) einen Server bestellen: Ubuntu 24.04, Standort Nürnberg oder Falkenstein,
   kleinster Typ mit 2 vCPU und 4 GB RAM (Shared vCPU reicht). Beim Anlegen den Inhalt von `id_ed25519.pub` als SSH-Schlüssel hinterlegen.
3. Optional eine eigene Domain kaufen und einen A-Eintrag auf die IP des Servers setzen. Ohne Domain läuft das Spiel unter
   `<ip-mit-bindestrichen>.sslip.io`, auch mit HTTPS.
4. Mir die IP (und ggf. die Domain) geben.

**Ich (oder du mit diesen Befehlen aus dem Projektordner):**
```
scp deploy/setup.sh root@IP:
ssh root@IP bash setup.sh letztecrew.de
```
Beim ersten Mal hält das Skript an und zeigt einen Deploy-Schlüssel.

**Du:** GitHub → Repository flotte → Settings → Deploy keys → Add deploy key, den Schlüssel einfügen, „Allow write access“ **nicht** ankreuzen.

**Ich:** dasselbe Kommando noch einmal. Es baut die erste Version (einige Minuten) und schaltet Caddy und den Timer ein.

**Du:** die Datenbank-Adresse eintragen (dieselbe wie bei Render unter Environment → DATABASE_URL), damit die Konten erhalten bleiben:
```
ssh root@IP
nano /etc/letzte-crew.env        # Zeile DATABASE_URL="postgresql://…" eintragen (Raute davor entfernen)
systemctl restart letzte-crew
```
Prüfen: `https://DOMAIN/status` zeigt `"store":"Postgres"` und `"datenbankFehler":null`.

Meldeformular der Website (letztecrew.de/melden/): In dieselbe Datei gehört `MELDUNGEN_SCHLUESSEL="…"` (mindestens 12 Zeichen), damit
der Eingang unter letztecrew.de/melden/eingang/ aufgeht. Meldungen liegen in `data/meldungen.json`. Details in `website/README.md`.

**Danach:** ein paar Tage parallel laufen lassen, dann bei Render den Dienst pausieren oder löschen. `render.yaml` kann dann raus.

## Später

- **Cloudflare (kostenlos) vor die eigene Domain:** liefert die Spieldaten aus Rechenzentren nah am Spieler, WebSocket geht durch.
  Dafür bei Cloudflare die Domain eintragen, Proxy einschalten, SSL-Modus „Full (strict)“.
- **Kosten:** Server rund 4 bis 6 € im Monat, Domain rund 1 € im Monat, Neon bleibt kostenlos.

## Betrieb

| Was | Befehl (als root auf dem Server) |
|---|---|
| Server-Protokoll | `journalctl -u letzte-crew -f` |
| Ausroll-Protokoll | `journalctl -u letzte-crew-deploy -n 50` |
| Jetzt ausrollen | `sudo -u crew -H bash /opt/letzte-crew/repo/deploy/deploy.sh --force` |
| Server neu starten | `systemctl restart letzte-crew` |
| Caddy-Protokoll | `tail -f /var/log/caddy/letzte-crew.log` |
| Ausgerollter Stand | `cat /srv/letzte-crew/ausgerollt` |

Sicherheitsupdates laufen automatisch (Neustart falls nötig um 4:30). Die Firewall lässt nur SSH, 80 und 443 durch, fail2ban sperrt
SSH-Rater, Anmeldung nur mit Schlüssel.
