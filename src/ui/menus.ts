import { $ } from '../core/util';
import { setQuality } from '../core/engine';
import { audio, snd, setMusicVolume } from '../core/audio';
import { settings, saveSettings, hasSave, G } from '../game/state';
import { storageInfo, clearStoredAssets, ASSET_STATE, MANIFEST } from '../core/assets';

export const menuHooks = {
  newGame: (_name: string) => {},
  continueGame: () => {},
  resume: () => {},
  quit: () => {},
  openMap: () => {},
};

let returnTo: string | null = null;
const show = (id: string) => $(id).classList.remove('hidden');
const hide = (id: string) => $(id).classList.add('hidden');
const click = () => snd(600, 0.05, 'sine', 0.03, 100);

export function applySettings() {
  setQuality(settings.quality === 'high');
  audio.volume = settings.volume;
  setMusicVolume(settings.music);
}

// ---------- Hauptmenü ----------
export function showMainMenu() {
  show('menu');
  ($('mContinue') as HTMLButtonElement).disabled = !hasSave();
  ['newGame', 'pause', 'settings', 'controls', 'about', 'dock', 'band', 'hud', 'ctrlP', 'mp', 'chatIn', 'dlg', 'storyObj', 'scene', 'intro'].forEach(hide);
}
export function hideMainMenu() { hide('menu'); }
// nach An- oder Abmelden: Weiterspielen hängt vom Speicherplatz ab
export function refreshContinue() { ($('mContinue') as HTMLButtonElement).disabled = !hasSave(); }

function openSub(id: string, from: string) { click(); returnTo = from; hide(from); show(id); }
function closeSub(id: string) { click(); hide(id); if (returnTo) show(returnTo); returnTo = null; }

$('mContinue').onclick = () => { click(); menuHooks.continueGame(); };
$('mNew').onclick = () => {
  click();
  $('ngWarn').textContent = hasSave() ? 'Achtung: Dein bisheriger Spielstand wird überschrieben.' : '';
  hide('menu'); show('newGame');
  setTimeout(() => ($('ngName') as HTMLInputElement).select(), 30);
};
$('ngBack').onclick = () => { click(); hide('newGame'); show('menu'); };
const goNew = () => {
  const name = (($('ngName') as HTMLInputElement).value || '').trim().slice(0, 16) || 'Falke';
  hide('newGame');
  menuHooks.newGame(name);
};
$('ngGo').onclick = goNew;
$('ngName').addEventListener('keydown', e => { if ((e as KeyboardEvent).key === 'Enter') goNew(); });
$('mSettings').onclick = () => { syncSettingsUI(); openSub('settings', 'menu'); };
$('mControls').onclick = () => openSub('controls', 'menu');
$('mAbout').onclick = () => openSub('about', 'menu');
$('cBack').onclick = () => closeSub('controls');
$('aBack').onclick = () => closeSub('about');
$('sBack').onclick = () => { saveSettings(); closeSub('settings'); };

// ---------- Pause ----------
export function showPause() { show('pause'); }
export function hidePause() { ['pause', 'settings', 'controls', 'mp'].forEach(hide); returnTo = null; }
export function pauseSubOpen() { return !$('settings').classList.contains('hidden') || !$('controls').classList.contains('hidden') || !$('mp').classList.contains('hidden'); }
export function closePauseSub() { if (!$('settings').classList.contains('hidden')) { saveSettings(); closeSub('settings'); } else if (!$('controls').classList.contains('hidden')) closeSub('controls'); else if (!$('mp').classList.contains('hidden')) { click(); hide('mp'); show('pause'); } }
$('pResume').onclick = () => { click(); menuHooks.resume(); };
$('pMap').onclick = () => { click(); hide('pause'); menuHooks.openMap(); };
$('pSettings').onclick = () => { syncSettingsUI(); openSub('settings', 'pause'); };
$('pControls').onclick = () => openSub('controls', 'pause');
$('pQuit').onclick = () => { click(); menuHooks.quit(); };

// ---------- Einstellungen ----------
function syncSettingsUI() {
  ($('sQuality') as HTMLSelectElement).value = settings.quality;
  ($('sFov') as HTMLInputElement).value = String(settings.fov);
  ($('sSens') as HTMLInputElement).value = String(settings.sens);
  ($('sInvert') as HTMLInputElement).checked = settings.invertY;
  ($('sWalk') as HTMLInputElement).checked = settings.walk;
  ($('sVol') as HTMLInputElement).value = String(settings.volume);
  ($('sMusic') as HTMLInputElement).value = String(settings.music);
  ($('sHud') as HTMLInputElement).value = String(settings.hud);
  labels();
}
function labels() {
  $('sFovV').textContent = settings.fov + '°';
  $('sSensV').textContent = settings.sens.toFixed(2).replace('.', ',') + '×';
  $('sVolV').textContent = Math.round(settings.volume * 100) + ' %';
  $('sMusicV').textContent = Math.round(settings.music * 100) + ' %';
  $('sHudV').textContent = Math.round(settings.hud * 100) + ' %';
}
$('sQuality').onchange = e => { settings.quality = (e.target as HTMLSelectElement).value as any; applySettings(); };
$('sFov').oninput = e => { settings.fov = +(e.target as HTMLInputElement).value; labels(); };
$('sSens').oninput = e => { settings.sens = +(e.target as HTMLInputElement).value; labels(); };
$('sInvert').onchange = e => { settings.invertY = (e.target as HTMLInputElement).checked; };
$('sWalk').onchange = e => { settings.walk = (e.target as HTMLInputElement).checked; };
$('sVol').oninput = e => { settings.volume = +(e.target as HTMLInputElement).value; audio.volume = settings.volume; labels(); };
$('sVol').onchange = () => snd(660, 0.1, 'sine', 0.05);
$('sMusic').oninput = e => { settings.music = +(e.target as HTMLInputElement).value; setMusicVolume(settings.music); labels(); };
$('sHud').oninput = e => { settings.hud = +(e.target as HTMLInputElement).value; labels(); };

export const isMenuMode = () => G.mode === 'menu';

// ---------- Spieldaten auf diesem Gerät (Einstellungen) ----------
const mbStr = (n: number) => (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
async function showStorage() {
  const st = await storageInfo(), total = Object.values(MANIFEST?.files || {}).reduce((a, f) => a + f.size, 0);
  $('sData').innerHTML = !ASSET_STATE.sw && !st.stored
    ? 'Dieser Browser speichert die Spieldaten nur im normalen Zwischenspeicher.'
    : `Gespeichert: <b>${mbStr(st.stored)}</b> von ${mbStr(total)} · ${st.persisted ? 'dauerhaft gesichert' : 'der Browser darf aufräumen, wenn der Platz knapp wird'}.<br>Beim nächsten Start lädt das Spiel aus diesem Speicher.`;
}
let installEv: any = null;
addEventListener('beforeinstallprompt', (e: any) => { e.preventDefault(); installEv = e; $('sInstall').classList.remove('hidden'); });
$('sInstall').onclick = async () => { if (!installEv) return; installEv.prompt(); await installEv.userChoice.catch(() => null); installEv = null; $('sInstall').classList.add('hidden'); };
let clearArm = false;
$('sClear').onclick = async () => {
  if (!clearArm) { clearArm = true; $('sClear').textContent = 'Wirklich löschen? (Spielstand bleibt)'; setTimeout(() => { clearArm = false; $('sClear').textContent = 'Spieldaten löschen'; }, 3000); return; }
  clearArm = false; $('sClear').textContent = 'Spieldaten löschen';
  await clearStoredAssets();
  $('sData').textContent = 'Gelöscht. Beim nächsten Start werden die Spieldaten neu geladen.';
};
$('mSettings').addEventListener('click', showStorage);
$('pSettings').addEventListener('click', showStorage);
