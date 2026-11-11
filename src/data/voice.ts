// Vertonte Zeilen: ein unverwechselbares Textstück → Kennung der Aufnahme (asset-src/voice/**/<Kennung>.mp3).
// Die Liste zum Einsprechen steht in docs/voice/prolog.md. Fehlt eine Datei, bleibt es beim Untertitel.
export const VOICE_LINES: [string, string][] = [
  ['Schichtwechsel auf allen Decks', 'p01_brummer'],
  ['Hier drüben, bei deiner', 'p02_achterberg'],
  ['letzter Ausbildungstag', 'p03_achterberg'],
  ['dein Flottenband. Noch mit Kadettenstatus', 'p04_achterberg'],
  ['Schau rein. Taste B', 'p05_achterberg'],
  ['Pilotensitz, dann holst du dir', 'p06_achterberg'],
  ['Startfreigabe erteilt', 'p07_brummer'],
  ['Flieg sie der Reihe nach ab', 'p08_achterberg'],
  ['Die Crew lebt von Erz', 'p09_achterberg'],
  ['Das markierte Feld ist Eisenerz', 'p10_achterberg'],
  ['Sie fressen uns die Hülle weg', 'p11_kompass'],
  ['Ferrox-Späher im Sektor', 'p11_brummer'],
  ['Das ist keine Übung mehr', 'p12_achterberg'],
  ['Ich hab schon Schlechtere vereidigt', 'p13_achterberg'],
  ['Haltung, Kadett', 'p14_achterberg'],
  ['hat meine Mutter in diesem Hangar', 'p15_hollweg'],
  ['Niemand ist gekommen, um uns zu holen', 'p16_hollweg'],
  ['Sprich mit uns', 'p17_hollweg'],
  ['Wir sind die letzte Crew. Niemand kommt uns holen', 'p18_crew'],
  ['Also bauen wir uns selbst eine Flotte', 'p19_crew'],
  ['Willkommen in der Crew, Pilot', 'p20_hollweg'],
  ['Und jetzt raus mit dir', 'p21_achterberg'],
  ['Willkommen, Pilot. Aufträge gibt es', 'p22_brummer'],
  ['Signal aus den Trümmern im Sonnenfeld', 'p23_brummer'],
];
export const voiceIdFor = (text: string) => VOICE_LINES.find(([s]) => text.includes(s))?.[1] || null;
// Über Funk gesprochen (bekommt im Spiel den Funkklang): Lotse und Frachter immer, alle anderen nur im Flug
export const RADIO_VOICES = new Set(['BRUMMER', 'KOMPASS']);
