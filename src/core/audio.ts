// Ton: Synthesizer-Effekte, Hintergrundmusik und Bergbaulaser (Sounds aus public/sounds.js)
declare global {
  interface Window { SOUNDDATA?: { music?: string; laser?: string; booster?: string; gun?: string } }
}
let AC: AudioContext | null = null;
export const audio = { volume: 0.7, music: 0.5 };
const ctx = () => (AC = AC || new (window.AudioContext || (window as any).webkitAudioContext)());

export function snd(f: number, d: number, type: OscillatorType = 'square', v = 0.04, slide = 0) {
  if (audio.volume <= 0) return;
  try {
    const ac = ctx(), t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v * audio.volume * 1.4, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g).connect(ac.destination);
    o.start(t);
    o.stop(t + d);
  } catch (e) { /* Audio nicht verfügbar */ }
}

// ---------------- Hintergrundmusik ----------------
// Audio-Element statt Web Audio: streamt, braucht kaum Speicher. Startet erst nach der ersten Eingabe (Browser-Regel).
let music: HTMLAudioElement | null = null, musicDuck = 1;
const MUSIC_GAIN = 0.55;
function applyMusicVolume() { if (music) music.volume = Math.max(0, Math.min(1, audio.music * MUSIC_GAIN * musicDuck)); }
export function setMusicVolume(v: number) { audio.music = v; applyMusicVolume(); if (music && v > 0 && music.paused) music.play().catch(() => {}); }
export function duckMusic(f: number) { musicDuck = f; applyMusicVolume(); }
function startMusic() {
  const src = window.SOUNDDATA?.music;
  if (!src || audio.music <= 0) return;
  if (!music) { music = new Audio(src); music.loop = true; applyMusicVolume(); }
  if (music.paused) music.play().catch(() => {});
}

// ---------------- Aufgenommene Sounds (Web Audio) ----------------
const BUF: Record<string, AudioBuffer> = {};
const TRIM: Record<string, [number, number]> = {};
async function loadBuf(key: string) {
  const src = window.SOUNDDATA?.[key as keyof NonNullable<Window['SOUNDDATA']>];
  if (!src) return;
  try {
    const ac = ctx(), bin = atob(src.split(',')[1]), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const b = await ac.decodeAudioData(u.buffer);
    // MP3-Stille am Anfang/Ende überspringen, damit Schleifen nahtlos sind
    const d = b.getChannelData(0), th = 0.004;
    let a = 0, e = d.length - 1;
    while (a < d.length && Math.abs(d[a]) < th) a++;
    while (e > a && Math.abs(d[e]) < th) e--;
    BUF[key] = b;
    TRIM[key] = [a / b.sampleRate, e / b.sampleRate];
  } catch (e) { /* Datei fehlt oder defekt: Ersatzton bleibt aktiv */ }
}

// Dauerschleife mit weichem Ein-/Ausblenden, Lautstärke und Tonhöhe laufend steuerbar
class Loop {
  src: AudioBufferSourceNode | null = null;
  gain: GainNode | null = null;
  constructor(private key: string, private edge = 0) {}
  get ready() { return !!BUF[this.key] && !!AC; }
  set(vol: number, rate = 1) {
    if (!this.ready) return false;
    const ac = AC!, t = ac.currentTime;
    if (vol <= 0.001) { this.stop(); return true; }
    if (!this.src) {
      const [a, b] = TRIM[this.key];
      this.gain = ac.createGain();
      this.gain.gain.setValueAtTime(0, t);
      this.src = ac.createBufferSource();
      this.src.buffer = BUF[this.key];
      this.src.loop = true;
      this.src.loopStart = a + this.edge; this.src.loopEnd = b - this.edge;
      this.src.connect(this.gain).connect(ac.destination);
      this.src.start(t, a + this.edge);
    }
    this.src.playbackRate.setTargetAtTime(rate, t, 0.12);
    this.gain!.gain.setTargetAtTime(vol * audio.volume, t, 0.06);
    return true;
  }
  stop() {
    if (!this.src || !AC) return;
    const t = AC.currentTime, s = this.src, g = this.gain!;
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0, t + 0.12);
    s.stop(t + 0.15);
    this.src = null; this.gain = null;
  }
}
const laserLoop = new Loop('laser'), boosterLoop = new Loop('booster', 0.25);

// Bergbaulaser: Tonhöhe steigt mit der Hitze
export function laserSound(on: boolean, heat = 0) {
  if (!laserLoop.ready) return false;
  if (on) laserLoop.set(0.55, 0.92 + 0.28 * Math.min(1, heat / 100)); else laserLoop.stop();
  return true;
}
// Antrieb: leises Brummen im Leerlauf, laut bei Schub; Tonhöhe folgt der Geschwindigkeit
export function boosterSound(on: boolean, thrust = 0, speedFrac = 0, jump = 0) {
  if (!on) { boosterLoop.stop(); return; }
  boosterLoop.set(0.07 + 0.3 * thrust + 0.35 * jump, 0.8 + 0.25 * speedFrac + 0.5 * jump);
}
// Einzelschuss der Bordkanone: nur der kurze Anfang der Aufnahme, leicht variiert
let lastShot = 0;
export function gunSound(vol = 1) {
  const b = BUF.gun;
  if (!b || !AC) return false;
  const ac = AC, t = ac.currentTime;
  if (t - lastShot < 0.05) return true;     // bei sehr schnellem Feuer nicht jede Kugel einzeln
  lastShot = t;
  const s = ac.createBufferSource(), g = ac.createGain(), start = TRIM.gun[0], len = 0.36;
  s.buffer = b;
  s.playbackRate.value = 0.94 + Math.random() * 0.14;
  g.gain.setValueAtTime(0.32 * vol * audio.volume, t);
  g.gain.setTargetAtTime(0, t + len * 0.55, 0.06);
  s.connect(g).connect(ac.destination);
  s.start(t, start, len + 0.2);
  return true;
}
export const hasLaserSound = () => !!BUF.laser;
export const audioDebug = () => ({ musicPlaying: !!music && !music.paused, musicTime: music?.currentTime || 0, musicDur: music?.duration || 0, loaded: Object.keys(BUF), trim: TRIM, ctx: AC?.state });

// ---------------- Freischalten nach der ersten Eingabe ----------------
let unlocked = false;
function unlock() {
  if (unlocked) return;
  unlocked = true;
  try { ctx().resume(); } catch (e) { /* ignorieren */ }
  startMusic();
}
addEventListener('pointerdown', unlock, { capture: true });
addEventListener('keydown', unlock, { capture: true });
for (const k of ['laser', 'booster', 'gun']) loadBuf(k);
