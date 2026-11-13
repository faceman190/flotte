import * as THREE from 'three';
import { renderer, scene, view, gl as canvas } from './engine';

// =====================================================================================
// Leistungsanzeige (F3 ein/aus, F4 kopiert einen Bericht in die Zwischenablage).
// Zeigt, was ein Bild kostet und woran es hängt: Bilder pro Sekunde, Hänger, Rechenzeit des Spiels, Zeichenaufrufe, Dreiecke,
// Lichter mit Schatten, Auflösung und die Grafikkarte, die der Browser wirklich benutzt.
// Ausgeschaltet kostet sie nichts außer zwei Zeitstempeln pro Bild.
// =====================================================================================
export const perfHooks = { where: () => '' };

const KEY = 'lf_perf';
let on = false, box: HTMLElement | null = null;
let prev = 0, t0 = 0;                       // Beginn des vorigen Bildes, Beginn dieses Bildes (ms)
const gaps: [number, number][] = [];        // [Zeitpunkt, Abstand zum vorigen Bild in ms], die letzten 30 s
let cpuSum = 0, cpuN = 0, callsMax = 0, trisMax = 0, shown = 0, lightsAt = 0;
let lights = { n: 0, point: 0, spot: 0, dir: 0, shadow: 0 }, meshes = 0;
let progs = 0, progLog: [number, number][] = [];   // Zahl der Shader, [Zeitpunkt, neu dazugekommen]
interface Sample { t: number; fps: number; low: number; worst: number; cpu: number; calls: number; tris: number; lights: number; shadow: number; where: string }
const log: Sample[] = [];                   // ein Eintrag pro Sekunde, die letzten 3 Minuten
let gpuName = '';

function gpu() {
  if (gpuName) return gpuName;
  try {
    const g = renderer.getContext(), ext = g.getExtension('WEBGL_debug_renderer_info');
    gpuName = String((ext && g.getParameter(ext.UNMASKED_RENDERER_WEBGL)) || g.getParameter(g.RENDERER) || 'unbekannt');
  } catch (e) { gpuName = 'unbekannt'; }
  return gpuName;
}
// Einschätzung der Grafikkarte aus ihrem Namen (nur ein Hinweis; die Namen sind nicht genormt)
function gpuKind(n: string) {
  if (/swiftshader|llvmpipe|basic render|software/i.test(n)) return 'KEINE Grafikkarte: Der Browser rechnet das Bild auf dem Prozessor (Hardwarebeschleunigung aus?)';
  if (/nvidia|geforce|rtx|gtx|radeon rx|radeon pro|arc\(tm\) a/i.test(n)) return 'eigene Grafikkarte';
  if (/intel|uhd|iris|radeon\(tm\) graphics|radeon graphics|vega|adreno|mali|apple/i.test(n)) return 'eingebauter Grafikchip (sparsam, deutlich langsamer als eine eigene Grafikkarte)';
  return '';
}
const nf = (n: number) => Math.round(n).toLocaleString('de-DE');
// Für das Hauptmenü: Name der benutzten Grafikkarte und ob es der eingebaute Chip ('chip'), gar keine ('soft') oder eine eigene ('own') ist
export function gpuInfo(): { name: string; kind: 'chip' | 'soft' | 'own' | '' } {
  const n = gpu(), k = gpuKind(n), m = /^ANGLE \([^,]*, (.+?)(?: \(0x[0-9a-fA-F]+\))?(?: Direct3D| OpenGL| Vulkan|,|\)$)/.exec(n);
  return { name: m ? m[1] : n, kind: !k ? '' : k.startsWith('KEINE') ? 'soft' : k.startsWith('eigene') ? 'own' : 'chip' };
}

function countLights(now: number) {
  lightsAt = now;
  const L = { n: 0, point: 0, spot: 0, dir: 0, shadow: 0 }; let m = 0;
  scene.traverseVisible((o: any) => {
    if (o.isMesh) m++;
    if (!o.isLight || o.isAmbientLight || o.isHemisphereLight || o.intensity <= 0) return;
    L.n++; if (o.isPointLight) L.point++; else if (o.isSpotLight) L.spot++; else L.dir++;
    if (o.castShadow) L.shadow++;
  });
  lights = L; meshes = m;
}

export function perfFrameStart() {
  const now = performance.now();
  if (prev) { gaps.push([now, now - prev]); while (gaps.length && now - gaps[0][0] > 30000) gaps.shift(); }
  prev = t0 = now;
  if (on) renderer.info.reset();           // von Hand, damit alle Durchgänge eines Bildes zusammengezählt werden (Schatten, Bloom, Waffe)
}
export function perfFrameEnd() {
  if (!on) return;
  const now = performance.now();
  cpuSum += now - t0; cpuN++;
  callsMax = Math.max(callsMax, renderer.info.render.calls); trisMax = Math.max(trisMax, renderer.info.render.triangles);
  const p = renderer.info.programs ? renderer.info.programs.length : 0;
  if (progs && p > progs) progLog.push([now, p - progs]);
  progs = p;
  if (now - shown < 500) return;
  shown = now;
  if (now - lightsAt > 1000) countLights(now);
  // Auswertung: letzte Sekunde, letzte 10 Sekunden, letzte 30 Sekunden
  const g1 = gaps.filter(g => now - g[0] <= 1000), g10 = gaps.filter(g => now - g[0] <= 10000).map(g => g[1]).sort((a, b) => a - b);
  const fps = g1.length, avg = g1.length ? g1.reduce((s, g) => s + g[1], 0) / g1.length : 0;
  const low = g10.length ? 1000 / g10[Math.min(g10.length - 1, Math.floor(g10.length * 0.99))] : 0, worst = g10.length ? g10[g10.length - 1] : 0;
  const hitch = gaps.filter(g => g[1] > 50).length;
  const cpu = cpuN ? cpuSum / cpuN : 0;
  while (progLog.length && now - progLog[0][0] > 10000) progLog.shift();
  const newProgs = progLog.reduce((s, e) => s + e[1], 0);
  const where = perfHooks.where();
  if (fps > 0 && (!log.length || now - log[log.length - 1].t >= 1000)) { log.push({ t: now, fps, low, worst, cpu, calls: callsMax, tris: trisMax, lights: lights.n, shadow: lights.shadow, where }); if (log.length > 180) log.shift(); }
  const dpr = devicePixelRatio || 1, name = gpu(), kind = gpuKind(name), mem = (performance as any).memory;
  const col = fps >= 55 ? '#7fe0a0' : fps >= 30 ? '#ffd27a' : '#ff8a7a';
  const rows: [string, string][] = [
    ['Bilder/s', `<b style="color:${col}">${fps}</b> · Ø ${avg.toFixed(1)} ms · schwächstes 1 %: ${low.toFixed(0)}/s`],
    ['Hänger', `längstes Bild ${worst.toFixed(0)} ms (10 s) · ${hitch} Bilder über 50 ms (30 s)`],
    ['Spielrechnung', `${cpu.toFixed(1)} ms pro Bild${avg ? ` (${Math.round((cpu / avg) * 100)} % der Bildzeit)` : ''}`],
    ['Zeichenaufrufe', `${nf(callsMax)} · Dreiecke ${nf(trisMax)} · sichtbare Teile ${nf(meshes)}`],
    ['Lichter', `${lights.n} (Punkt ${lights.point}, Strahler ${lights.spot}, Sonne ${lights.dir}) · mit Schatten ${lights.shadow}`],
    ['Speicher', `Formen ${nf(renderer.info.memory.geometries)} · Texturen ${nf(renderer.info.memory.textures)} · Shader ${progs}${newProgs ? ` (+${newProgs} neu in 10 s)` : ''}${mem ? ` · Skript ${nf(mem.usedJSHeapSize / 1048576)} MB` : ''}`],
    ['Auflösung', `${canvas.width}×${canvas.height} · Fenster ${innerWidth}×${innerHeight} · Skalierung ${Math.round(dpr * 100)} % · Qualität ${view.hiQ ? 'hoch' : 'niedrig'}`],
    ['Grafikkarte', `${name}${kind ? `<br><i>${kind}</i>` : ''}`],
    ['Ort', where || '–'],
  ];
  if (box) box.innerHTML = `<div class="pfT">LEISTUNG · F3 aus · F4 Bericht kopieren</div>` + rows.map(r => `<div class="pfR"><span>${r[0]}</span><span>${r[1]}</span></div>`).join('');
  cpuSum = cpuN = callsMax = trisMax = 0;
}

// Bericht als Text (für die Zwischenablage): Gerät, Einstellungen und ein Eintrag pro Sekunde der letzten Minuten
export function perfReport() {
  const dpr = devicePixelRatio || 1, name = gpu();
  const head = [
    'Letzte Crew · Leistungsbericht · ' + (document.querySelector('.ver')?.textContent || document.title),
    'Grafikkarte: ' + name + (gpuKind(name) ? ' (' + gpuKind(name) + ')' : ''),
    `Auflösung: ${canvas.width}x${canvas.height}, Fenster ${innerWidth}x${innerHeight}, Skalierung ${Math.round(dpr * 100)} %, Qualität ${view.hiQ ? 'hoch' : 'niedrig'}`,
    'Browser: ' + navigator.userAgent,
    `Kerne: ${navigator.hardwareConcurrency || '?'}, Arbeitsspeicher laut Browser: ${(navigator as any).deviceMemory || '?'} GB`,
    'Sekunde | Bilder/s | schwächstes 1 % | längstes Bild ms | Spielrechnung ms | Zeichenaufrufe | Dreiecke | Lichter (mit Schatten) | Ort',
  ];
  const t1 = log.length ? log[log.length - 1].t : 0;
  const rows = log.map(s => [Math.round((s.t - t1) / 1000), s.fps, s.low.toFixed(0), s.worst.toFixed(0), s.cpu.toFixed(1), s.calls, s.tris, `${s.lights} (${s.shadow})`, s.where].join(' | '));
  return head.concat(rows).join('\n');
}

function setOn(v: boolean) {
  on = v;
  renderer.info.autoReset = !v;
  if (v && !box) { box = document.createElement('div'); box.id = 'perf'; document.body.appendChild(box); }
  if (box) { box.style.display = v ? 'block' : 'none'; if (v) box.innerHTML = '<div class="pfT">LEISTUNG · wird gemessen …</div>'; }
  if (v) { shown = 0; cpuSum = cpuN = callsMax = trisMax = 0; log.length = 0; gaps.length = 0; prev = 0; progs = 0; progLog = []; }      // Messung beginnt neu
  try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) { /* ignorieren */ }
}
export const perfActive = () => on;
export function perfToggle() { setOn(!on); }

window.addEventListener('keydown', e => {
  if (e.code === 'F3') { e.preventDefault(); perfToggle(); }
  else if (e.code === 'F4' && on) {
    e.preventDefault();
    const text = perfReport();
    const done = (ok: boolean) => { if (!box) return; const n = document.createElement('div'); n.className = 'pfT'; n.textContent = ok ? 'Bericht kopiert. Mit Strg+V einfügen.' : 'Kopieren nicht erlaubt: Bericht steht in der Browser-Konsole (F12).'; box.appendChild(n); shown = performance.now() + 2500; };
    try { navigator.clipboard.writeText(text).then(() => done(true), () => { console.log(text); done(false); }); } catch (err) { console.log(text); done(false); }
  }
}, true);
try { if (localStorage.getItem(KEY)) setOn(true); } catch (e) { /* ignorieren */ }
