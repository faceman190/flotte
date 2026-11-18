// Meldeformular (/melden/) und Eingang (/melden/eingang/). Die Schlüssel müssen zu server/meldungen.mjs passen (ARTEN, BEREICHE, STATUS).
import fs from 'node:fs';
import path from 'node:path';

export const API = '/api/meldung';

export const ARTEN = [
  { k: 'fehler', t: 'Fehler', e: 'Etwas funktioniert nicht, stürzt ab, ruckelt oder sieht falsch aus.' },
  { k: 'vorschlag', t: 'Vorschlag', e: 'Eine Idee, eine Verbesserung oder etwas, das dir fehlt.' },
  { k: 'sonstiges', t: 'Sonstiges', e: 'Lob, Fragen, alles andere.' },
] as const;

export const BEREICHE = [
  { k: 'flug', t: 'Flug und Navigation' },
  { k: 'bergbau', t: 'Bergbau und Raffinerie' },
  { k: 'handel', t: 'Handel und Märkte' },
  { k: 'kampf', t: 'Kampf und Ferrox' },
  { k: 'stationen', t: 'Stationen und Zu Fuß' },
  { k: 'geschichte', t: 'Geschichte und Missionen' },
  { k: 'mehrspieler', t: 'Mehrspieler und Konto' },
  { k: 'grafik', t: 'Grafik und Leistung' },
  { k: 'steuerung', t: 'Steuerung und Bedienung' },
  { k: 'website', t: 'Website' },
  { k: 'sonstiges', t: 'Sonstiges' },
] as const;

export const STATUS = [
  { k: 'neu', t: 'Neu' },
  { k: 'gesehen', t: 'Gesehen' },
  { k: 'in-arbeit', t: 'In Arbeit' },
  { k: 'erledigt', t: 'Erledigt' },
  { k: 'abgelehnt', t: 'Abgelehnt' },
] as const;

// Aktuelle Spielversion aus der Startseite des Spiels (index.html, Zeile <div class="ver">Alpha 1.48 · …</div>); läuft nur beim Bauen
export function spielVersion(): string {
  try {
    const html = fs.readFileSync(path.resolve(process.cwd(), '..', 'index.html'), 'utf8');
    return html.match(/class="ver">\s*(Alpha [0-9.]+)/)?.[1] || '';
  } catch { return ''; }
}
