import { $, esc } from '../core/util';
import { snd } from '../core/audio';
import { releaseAll, centerMouse } from '../core/input';
import { settings, saveSettings, G, hasSave } from '../game/state';
import { refreshContinue } from './menus';
import { SECTOR } from '../data/galaxy';
import { NET, connect, disconnect, defaultUrl, netHooks, sendChat, isOnline, register, login, logout, authHooks } from '../game/net';

// Mehrspieler-Fenster (aus Hauptmenü oder Pause) und Chat-Eingabe im Spiel
let from: 'menu' | 'pause' = 'menu';
const urlIn = $('mpUrl') as HTMLInputElement, chatIn = $('chatIn') as HTMLInputElement;
const click = () => snd(600, 0.05, 'sine', 0.03, 100);

export const roomName = (room: string) => { const [id, pl] = room.split(':'); const s = SECTOR[id]; return s ? s.name + (pl ? ' (Planet)' : '') : room ? '…' : 'Menü'; };
export function openMp(f: 'menu' | 'pause') {
  click(); from = f;
  $(f).classList.add('hidden'); $('mp').classList.remove('hidden');
  urlIn.value = settings.server || defaultUrl();
  render();
}
export const mpOpen = () => !$('mp').classList.contains('hidden');
export function closeMp() { click(); $('mp').classList.add('hidden'); $(from).classList.remove('hidden'); }
function render() {
  if (!mpOpen()) return;
  const st = NET.status;
  $('mpStatus').innerHTML = st === 'online' ? `<span class="good">● Verbunden</span> mit ${esc(NET.url)}` : st === 'verbinde' ? '<span class="acc">● Verbinde …</span>' : st === 'fehler' ? `<span class="bad">● ${esc(NET.err || 'Keine Verbindung')}</span>` : 'Nicht verbunden. Zum Testen: <kbd>npm run server</kbd> im Projektordner starten.';
  $('mpList').innerHTML = st === 'online' ? `<h3>PILOTEN ONLINE · ${NET.roster.length}</h3>` + NET.roster.map(r => `<div class="row" style="display:flex;justify-content:space-between"><span>${esc(r.name)}${r.id === NET.id ? ' <span class="hint">(du)</span>' : ''}</span><span class="hint">${esc(roomName(r.room))}</span></div>`).join('') : '';
  // Konto: An- und Abmelden nur im Hauptmenü (sonst würde der laufende Pilot gewechselt)
  const acc = $('mpAcc'), inMenu = from === 'menu';
  acc.classList.toggle('hidden', st !== 'online');
  $('mpAccIn').classList.toggle('hidden', !!NET.account || !inMenu);
  $('mpAccOut').classList.toggle('hidden', !NET.account && inMenu);
  $('mpAccTxt').innerHTML = NET.account ? `<span class="good">●</span> Angemeldet als <b>${esc(NET.account)}</b>. Dein Spielstand wird auf dem Server gesichert${NET.savedAt ? `, zuletzt um ${new Date(NET.savedAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}.` : 'Anmelden geht im Hauptmenü.';
  ($('mpLogout') as HTMLButtonElement).classList.toggle('hidden', !NET.account || !inMenu);
  $('mpErr').textContent = NET.authErr || (NET.tempStore ? 'Hinweis: Dieser Server hat noch keine Datenbank. Spielstände gehen beim nächsten Neustart verloren.' : '');
  ($('mpGo') as HTMLButtonElement).disabled = st === 'verbinde';
  ($('mpOff') as HTMLButtonElement).disabled = st === 'aus';
}
$('mMp').onclick = () => openMp('menu');
$('pMp').onclick = () => openMp('pause');
$('mpBack').onclick = closeMp;
$('mpGo').onclick = () => { click(); settings.server = urlIn.value.trim(); saveSettings(); connect(settings.server || defaultUrl()); };
$('mpOff').onclick = () => { click(); disconnect(); };
urlIn.addEventListener('keydown', e => { if (e.key === 'Enter') $('mpGo').click(); });
const nameIn = $('mpName') as HTMLInputElement, passIn = $('mpPass') as HTMLInputElement;
$('mpLogin').onclick = () => { click(); login(nameIn.value.trim(), passIn.value); passIn.value = ''; };
$('mpReg').onclick = () => { click(); register(nameIn.value.trim(), passIn.value, ($('mpTake') as HTMLInputElement).checked); passIn.value = ''; };
passIn.addEventListener('keydown', e => { if (e.key === 'Enter') $('mpLogin').click(); });
$('mpLogout').onclick = () => { click(); logout(); };
// Hauptmenü: Hinweis auf das Konto und Weiterspielen passend zum Speicherplatz
function accountNote() {
  refreshContinue();
  $('mAcc').innerHTML = NET.account ? `<span class="good">●</span> Online als <b>${esc(NET.account)}</b> · Spielstand auf dem Server${hasSave() ? '' : ' · noch kein Pilot, starte ein neues Spiel'}` : '';
}
authHooks.changed = () => { accountNote(); render(); };

// ---------- Chat ----------
let chatFrom = '';
export function openChat() {
  if (!isOnline() || !(G.mode === 'play' || G.mode === 'walk' || G.mode === 'rover')) return false;
  chatFrom = G.mode;
  releaseAll();
  if (document.pointerLockElement) document.exitPointerLock();
  chatIn.value = ''; chatIn.classList.remove('hidden'); chatIn.focus();
  return true;
}
const closeChat = () => { chatIn.classList.add('hidden'); chatIn.blur(); if (chatFrom) centerMouse(); chatFrom = ''; };
chatIn.addEventListener('keydown', e => {
  e.stopPropagation();
  if (e.key === 'Enter') { sendChat(chatIn.value); closeChat(); }
  else if (e.key === 'Escape') closeChat();
});
chatIn.addEventListener('blur', () => { if (!chatIn.classList.contains('hidden')) closeChat(); });

const prev = netHooks.changed;
netHooks.changed = () => { prev(); render(); };
