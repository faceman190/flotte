// Startet das Laden der Spieldaten. Alle Module, die beim Start Spieldaten brauchen, importieren diese Datei
// zuerst; durch das „await“ hier warten sie, bis das Grundpaket da ist (Ladebalken in index.html, #boot).
import { loadAssets } from './assets';
await loadAssets();
