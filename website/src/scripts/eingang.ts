// Eingang der Meldungen (/melden/eingang/): Liste laden, filtern, Status und Notiz setzen. Schlüssel bleibt nur in diesem Browser.
const KEY = 'lc-meldungen-schluessel';
type Meldung = {
  nr: number; zeit: string; art: string; bereich: string; titel: string; text: string; schritte: string; erwartet: string;
  pilot: string; kontakt: string; version: string; geraet: string; bildschirm: string; bild: boolean; status: string; notiz: string;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const zeit = (iso: string) => new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export function starteEingang() {
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const N = JSON.parse($('namen').textContent || '{}') as { arten: Record<string, string>; bereiche: Record<string, string>; status: Record<string, string> };
  let schluessel = '';
  try { schluessel = localStorage.getItem(KEY) || ''; } catch { /* egal */ }
  let alle: Meldung[] = [];
  const offen = new Set<number>();

  async function api(pfad: string, init: RequestInit = {}) {
    const r = await fetch(pfad, { ...init, headers: { ...(init.headers || {}), 'X-Schluessel': schluessel, 'Content-Type': 'application/json' } });
    if (r.status === 401) throw Object.assign(new Error('Schlüssel stimmt nicht.'), { code: 401 });
    return r;
  }

  async function laden() {
    try {
      const r = await api('/api/meldungen');
      const j = await r.json();
      if (!r.ok) throw new Error(j.fehler || 'Fehler ' + r.status);
      alle = j.meldungen;
      try { localStorage.setItem(KEY, schluessel); } catch { /* egal */ }
      $('login').hidden = true; $('inhalt').hidden = false; $('e-aktion').hidden = false;
      zeigen();
    } catch (e) {
      $('login').hidden = false; $('inhalt').hidden = true; $('e-aktion').hidden = true;
      $('login-fehler').textContent = /Failed to fetch|NetworkError/i.test((e as Error).message) ? 'Server nicht erreichbar.' : (e as Error).message;
    }
  }

  function zeigen() {
    const z = (f: (m: Meldung) => boolean) => alle.filter(f).length;
    $('zahlen').innerHTML = [
      ['Neu', z((m) => m.status === 'neu')],
      ['Offen', z((m) => !['erledigt', 'abgelehnt'].includes(m.status))],
      ['Fehler', z((m) => m.art === 'fehler' && !['erledigt', 'abgelehnt'].includes(m.status))],
      ['Vorschläge', z((m) => m.art === 'vorschlag' && !['erledigt', 'abgelehnt'].includes(m.status))],
      ['Gesamt', alle.length],
    ].map(([t, n]) => `<div class="zahl"><b>${n}</b><span>${t}</span></div>`).join('');

    const fa = $<HTMLSelectElement>('f-art').value, fs = $<HTMLSelectElement>('f-status').value, fb = $<HTMLSelectElement>('f-bereich').value;
    const q = $<HTMLInputElement>('f-suche').value.trim().toLowerCase();
    const liste = alle.filter((m) => (!fa || m.art === fa) && (!fb || m.bereich === fb)
      && (fs === 'offen' ? !['erledigt', 'abgelehnt'].includes(m.status) : !fs || m.status === fs)
      && (!q || [m.titel, m.text, m.schritte, m.pilot, String(m.nr)].join(' ').toLowerCase().includes(q)));
    $('leer').hidden = liste.length > 0;
    $('liste').innerHTML = liste.map((m) => `
      <li><details class="mel art-${m.art}" data-nr="${m.nr}"${offen.has(m.nr) ? ' open' : ''}>
        <summary>
          <span class="mel-nr">#${String(m.nr).padStart(4, '0')}</span>
          <span class="mel-titel">${esc(m.titel)}</span>
          <span class="pill st-${m.status}">${N.status[m.status] || m.status}</span>
          <span class="mel-meta">${N.arten[m.art] || m.art} · ${N.bereiche[m.bereich] || m.bereich} · ${zeit(m.zeit)}${m.pilot ? ' · ' + esc(m.pilot) : ''}${m.bild ? ' · Bild' : ''}</span>
        </summary>
        <div class="mel-body">
          <div>
            <h4>${m.art === 'fehler' ? 'Was ist passiert' : 'Text'}</h4><p class="txt">${esc(m.text)}</p>
            ${m.schritte ? `<h4>Schritte</h4><p class="txt">${esc(m.schritte)}</p>` : ''}
            ${m.erwartet ? `<h4>Erwartet</h4><p class="txt">${esc(m.erwartet)}</p>` : ''}
            ${m.bild ? `<div class="bild" data-nr="${m.nr}"></div>` : ''}
          </div>
          <div class="mel-seite">
            <h4>Status</h4>
            <div class="st-knoepfe">${Object.entries(N.status).map(([k, t]) => `<button type="button" data-status="${k}" class="${k === m.status ? 'an' : ''}">${t}</button>`).join('')}</div>
            <h4>Notiz</h4>
            <textarea class="notiz" placeholder="Nur für die Werft sichtbar">${esc(m.notiz || '')}</textarea>
            <button type="button" class="speichern">Notiz speichern</button>
            <dl>
              ${m.kontakt ? `<dt>Kontakt</dt><dd>${esc(m.kontakt)}</dd>` : ''}
              ${m.version ? `<dt>Version</dt><dd>${esc(m.version)}</dd>` : ''}
              ${m.bildschirm ? `<dt>Bildschirm</dt><dd>${esc(m.bildschirm)}</dd>` : ''}
              ${m.geraet ? `<dt>Gerät</dt><dd>${esc(m.geraet)}</dd>` : ''}
            </dl>
          </div>
        </div>
      </details></li>`).join('');
    document.querySelectorAll<HTMLDetailsElement>('details.mel[open]').forEach(ladeBild);
  }

  // Bild erst beim Aufklappen holen (braucht den Schlüssel in der Kopfzeile, deshalb fetch statt <img src>)
  async function ladeBild(d: HTMLDetailsElement) {
    const box = d.querySelector<HTMLElement>('.bild');
    if (!box || box.dataset.geladen) return;
    box.dataset.geladen = '1';
    const r = await api(`/api/meldungen/${box.dataset.nr}/bild`);
    if (!r.ok) { box.textContent = 'Bild nicht gefunden.'; return; }
    const url = URL.createObjectURL(await r.blob());
    box.innerHTML = `<a href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="Bildschirmfoto zur Meldung"></a>`;
  }

  async function setze(nr: number, daten: { status?: string; notiz?: string }) {
    const r = await api(`/api/meldungen/${nr}/status`, { method: 'POST', body: JSON.stringify(daten) });
    const j = await r.json();
    if (!r.ok) { alert(j.fehler || 'Fehler'); return null; }
    const i = alle.findIndex((m) => m.nr === nr);
    if (i >= 0) alle[i] = j.meldung;
    return j.meldung as Meldung;
  }

  $('liste').addEventListener('toggle', (e) => {
    const d = e.target as HTMLDetailsElement, nr = +d.dataset.nr!;
    if (d.open) { offen.add(nr); ladeBild(d); } else offen.delete(nr);
  }, true);
  $('liste').addEventListener('click', async (e) => {
    const t = e.target as HTMLElement, d = t.closest<HTMLDetailsElement>('details.mel');
    if (!d) return;
    const nr = +d.dataset.nr!;
    if (t.dataset.status) { if (await setze(nr, { status: t.dataset.status })) zeigen(); }
    if (t.classList.contains('speichern')) {
      const m = await setze(nr, { notiz: d.querySelector<HTMLTextAreaElement>('.notiz')!.value });
      if (m) { t.insertAdjacentHTML('afterend', '<span class="ok"> gespeichert</span>'); setTimeout(() => t.nextElementSibling?.remove(), 1500); }
    }
  });
  for (const id of ['f-art', 'f-status', 'f-bereich']) $(id).addEventListener('change', zeigen);
  $('f-suche').addEventListener('input', zeigen);
  $('login').addEventListener('submit', (e) => { e.preventDefault(); schluessel = $<HTMLInputElement>('schluessel').value.trim(); $('login-fehler').textContent = ''; laden(); });
  $('neu-laden').addEventListener('click', laden);
  $('abmelden').addEventListener('click', () => { try { localStorage.removeItem(KEY); } catch { /* egal */ } schluessel = ''; alle = []; location.reload(); });
  if (schluessel) laden();
}
