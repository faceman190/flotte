// Meldeformular (/melden/): Art umschalten, Zähler, Entwurf im Browser merken, Bildschirmfoto verkleinern, absenden an /api/meldung
const ENTWURF = 'lc-meldung-entwurf';
const MAX_KANTE = 1600;     // Bild wird auf diese Kantenlänge verkleinert und als JPEG geschickt

function erkenne(ua: string) {
  const browser = /Edg\/([\d]+)/.test(ua) ? 'Edge ' + RegExp.$1
    : /OPR\/([\d]+)/.test(ua) ? 'Opera ' + RegExp.$1
    : /Firefox\/([\d]+)/.test(ua) ? 'Firefox ' + RegExp.$1
    : /Chrome\/([\d]+)/.test(ua) ? 'Chrome ' + RegExp.$1
    : /Version\/([\d.]+).*Safari/.test(ua) ? 'Safari ' + RegExp.$1 : 'unbekannt';
  const system = /Windows NT 10/.test(ua) ? 'Windows 10/11' : /Windows/.test(ua) ? 'Windows'
    : /iPhone|iPad/.test(ua) ? 'iOS' : /Android ([\d.]+)/.test(ua) ? 'Android ' + RegExp.$1
    : /Mac OS X/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'unbekannt';
  return { browser, system };
}

function verkleinere(file: File): Promise<{ data: string; w: number; h: number }> {
  return new Promise((ok, no) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(1, MAX_KANTE / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.round(img.naturalWidth * s), h = Math.round(img.naturalHeight * s);
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const g = c.getContext('2d')!;
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      let q = 0.85, data = c.toDataURL('image/jpeg', q);
      while (data.length > 2.4e6 && q > 0.4) { q -= 0.15; data = c.toDataURL('image/jpeg', q); }
      ok({ data, w, h });
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('Das Bild konnte nicht gelesen werden.')); };
    img.src = url;
  });
}

export function starteMelden() {
  const form = document.getElementById('meldung') as HTMLFormElement | null;
  if (!form) return;
  const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  const feld = (n: string) => form.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement;
  const hinweis = $('hinweis'), knopf = $<HTMLButtonElement>('senden');
  const fertig = $('fertig');
  const version = form.dataset.version || '';
  const { browser, system } = erkenne(navigator.userAgent);
  // Fenstergröße zählt fürs Spiel; die Bildschirmgröße kommt dazu, wenn der Browser sie meldet (eingebettete Fenster melden 0)
  const dpr = (devicePixelRatio || 1).toFixed(2).replace(/\.?0+$/, '');
  const bildschirm = `Fenster ${innerWidth}×${innerHeight} @${dpr}x` + (screen.width ? ` · Bildschirm ${screen.width}×${screen.height}` : '');
  $('t-browser').textContent = browser;
  $('t-system').textContent = system;
  $('t-bild').textContent = bildschirm;

  // ---- Art: Beschriftungen und Platzhalter umschalten ----
  const art = () => (form.querySelector('input[name="art"]:checked') as HTMLInputElement)?.value || 'fehler';
  function zeigeArt() {
    const a = art();
    form.dataset.art = a;
    form.querySelectorAll<HTMLElement>('[data-ph-' + a + ']').forEach((el) => ((el as HTMLInputElement).placeholder = el.dataset['ph' + a[0].toUpperCase() + a.slice(1)] || ''));
    form.querySelectorAll<HTMLElement>('[data-t-' + a + ']').forEach((el) => (el.textContent = el.dataset['t' + a[0].toUpperCase() + a.slice(1)] || ''));
  }

  // ---- Zähler ----
  function zaehle() {
    form.querySelectorAll<HTMLElement>('.zaehler').forEach((z) => {
      const f = feld(z.dataset.fuer!);
      z.textContent = `${f.value.length} / ${f.maxLength}`;
    });
  }

  // ---- Technische Angaben an/aus ----
  const technik = feld('technik') as HTMLInputElement;
  const zeigeTechnik = () => $('technik').classList.toggle('aus', !technik.checked);

  // ---- Bildschirmfoto ----
  let bild: string | null = null;
  const ablage = $('ablage'), datei = $<HTMLInputElement>('bild');
  const leer = ablage.querySelector<HTMLElement>('.ablage-leer')!, voll = ablage.querySelector<HTMLElement>('.ablage-voll')!;
  async function nimmBild(f?: File | null) {
    if (!f || !f.type.startsWith('image/')) return;
    try {
      const r = await verkleinere(f);
      bild = r.data;
      $<HTMLImageElement>('bild-vorschau').src = r.data;
      $('bild-info').textContent = `${r.w} × ${r.h} px · ${Math.round(r.data.length * 0.75 / 1024)} KB`;
      leer.hidden = true; voll.hidden = false;
    } catch (e) { melde((e as Error).message, true); }
  }
  function bildWeg() { bild = null; datei.value = ''; leer.hidden = false; voll.hidden = true; }
  ablage.addEventListener('click', (e) => { if (!bild && !(e.target as HTMLElement).closest('button')) datei.click(); });
  ablage.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && !bild) { e.preventDefault(); datei.click(); } });
  datei.addEventListener('change', () => nimmBild(datei.files?.[0]));
  $('bild-weg').addEventListener('click', (e) => { e.stopPropagation(); bildWeg(); });
  ablage.addEventListener('dragover', (e) => { e.preventDefault(); ablage.classList.add('drueber'); });
  ablage.addEventListener('dragleave', () => ablage.classList.remove('drueber'));
  ablage.addEventListener('drop', (e) => { e.preventDefault(); ablage.classList.remove('drueber'); nimmBild(e.dataTransfer?.files?.[0]); });
  document.addEventListener('paste', (e) => {
    const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (it && !form.hidden) { e.preventDefault(); nimmBild(it.getAsFile()); }
  });

  // ---- Entwurf merken (nur in diesem Browser) ----
  const TEXTE = ['titel', 'text', 'schritte', 'erwartet', 'pilot', 'kontakt'];
  function merke() {
    const d: Record<string, string> = { art: art(), bereich: (form.querySelector('input[name="bereich"]:checked') as HTMLInputElement)?.value || '' };
    for (const n of TEXTE) d[n] = feld(n).value;
    try { localStorage.setItem(ENTWURF, JSON.stringify(d)); } catch { /* privates Fenster */ }
  }
  function lade() {
    let d: Record<string, string> | null = null;
    try { d = JSON.parse(localStorage.getItem(ENTWURF) || 'null'); } catch { d = null; }
    const q = new URLSearchParams(location.search);
    const setze = (name: string, v?: string | null) => { const r = v && form.querySelector<HTMLInputElement>(`input[name="${name}"][value="${CSS.escape(v)}"]`); if (r) r.checked = true; };
    if (d) { setze('art', d.art); setze('bereich', d.bereich); for (const n of TEXTE) if (d[n]) feld(n).value = d[n]; }
    else { try { const p = localStorage.getItem('lc-meldung-pilot'); if (p) feld('pilot').value = p; } catch { /* egal */ } }
    setze('art', q.get('art')); setze('bereich', q.get('bereich'));
  }

  function melde(t: string, fehler = false) { hinweis.textContent = t; hinweis.classList.toggle('fehler', fehler); }

  // ---- Absenden ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.querySelectorAll('.feld.falsch').forEach((f) => f.classList.remove('falsch'));
    const titel = feld('titel').value.trim(), text = feld('text').value.trim();
    const falsch = (n: string, t: string) => { const f = feld(n); f.closest('.feld')?.classList.add('falsch'); f.focus(); melde(t, true); };
    if (titel.length < 4) return falsch('titel', 'Bitte einen kurzen Titel angeben (mindestens 4 Zeichen).');
    if (text.length < 10) return falsch('text', 'Bitte etwas ausführlicher beschreiben (mindestens 10 Zeichen).');
    const mit = technik.checked;
    const daten = {
      art: art(), bereich: (form.querySelector('input[name="bereich"]:checked') as HTMLInputElement)?.value,
      titel, text, schritte: art() === 'fehler' ? feld('schritte').value : '', erwartet: art() === 'fehler' ? feld('erwartet').value : '',
      pilot: feld('pilot').value, kontakt: feld('kontakt').value,
      version: mit ? version : '', geraet: mit ? `${browser} · ${system} · ${navigator.userAgent}` : '', bildschirm: mit ? bildschirm : '',
      bild, website: feld('website').value,
    };
    knopf.disabled = true;
    melde(bild ? 'Wird gesendet (mit Bild) …' : 'Wird gesendet …');
    try {
      const r = await fetch('/api/meldung', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(daten) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.fehler || `Der Server antwortet nicht richtig (${r.status}).`);
      try { localStorage.removeItem(ENTWURF); if (daten.pilot) localStorage.setItem('lc-meldung-pilot', daten.pilot); } catch { /* egal */ }
      $('fertig-nr').textContent = '#' + String(j.nr).padStart(4, '0');
      melde(''); form.hidden = true; fertig.hidden = false;
      fertig.scrollIntoView({ behavior: 'smooth', block: 'center' });
      fertig.focus({ preventScroll: true });
    } catch (err) {
      const m = (err as Error).message;
      melde(/Failed to fetch|NetworkError|Load failed/i.test(m) ? 'Keine Verbindung zur Werft. Dein Text bleibt erhalten, bitte gleich noch einmal versuchen.' : m, true);
    } finally {
      knopf.disabled = false;
    }
  });

  $('noch-eine').addEventListener('click', () => {
    const pilot = feld('pilot').value, kontakt = feld('kontakt').value;
    form.reset(); bildWeg();
    feld('pilot').value = pilot; feld('kontakt').value = kontakt;
    zeigeArt(); zaehle(); zeigeTechnik(); melde('');
    fertig.hidden = true; form.hidden = false;
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  form.addEventListener('input', () => { zaehle(); merke(); });
  form.addEventListener('change', () => { zeigeArt(); zeigeTechnik(); merke(); });
  lade(); zeigeArt(); zaehle(); zeigeTechnik();
}
