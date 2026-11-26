import { P } from './state';

// =====================================================================================
// Hangarbuchten (seit 2026-11-26). Nutzer: „wenn man zum Beispiel sich in der Bastion trifft, hat ja jeder sein Schiff im Hangar stehen. Aber
// ich kann ja dann nicht im Schiff meines Freundes einsteigen. … Wollen wir zum Beispiel für jeden einen einzelnen Hangar machen, wie auch das
// Quartier ähnlich“ – entschieden: eigene Bucht je Pilot, Zutritt per Einladung.
//  - Jeder Pilot hat an jeder Station seine eigene Hangarbucht. Wer andockt oder vom Deck durch die Schleuse geht, steht in seiner Bucht.
//    Im Hangar sieht man nur Piloten, die in derselben Bucht sind (Ortskennung „<station>#h:<Besitzer>“, quartier.ts ortKennung).
//  - In eine fremde Bucht kommt man mit einer Einladung des Besitzers (15 Minuten gültig): über den Aufzug auf Deck 3 der Bastion oder an der
//    Buchtenwahl an der Rückwand jedes Hangars. Dort steht das Schiff des Besitzers; über seine Rampe geht man an Bord (interior.ts
//    refreshHangarShips). Legt er ab, fliegt man mit (net.ts Mitreise).
//  - Wer die Bucht durch die Schleuse zum Deck verlässt, kommt beim nächsten Mal wieder in die eigene.
// =====================================================================================
export const HB_MS = 15 * 60 * 1000;
export interface HEinladung { von: string; id: number; t: number }
export const HB = {
  owner: '', id: 0,                // fremde Bucht: Name und Kennung des Besitzers ('' = eigene Bucht)
  cls: '', paint: '',              // sein Schiff, das dort steht ('' = er hat abgelegt)
  zone: false,                     // die Figur steht gerade im Hangar (interior.ts setzt es jedes Bild)
  einladungen: [] as HEinladung[],
};
export const buchtFremd = () => !!HB.owner && HB.owner !== P.name;
/** Anhang der Ortskennung im Netz: im Hangar zählt, in wessen Bucht man steht */
export const buchtKennung = () => (HB.zone ? '#h:' + (HB.owner || P.name) : '');
export function buchtEinladung(von: string, id: number) {
  HB.einladungen = HB.einladungen.filter(e => e.von !== von && Date.now() - e.t < HB_MS);
  HB.einladungen.push({ von, id, t: Date.now() });
}
export const buchtEinladungen = () => HB.einladungen.filter(e => Date.now() - e.t < HB_MS);
// Verbindungen nach außen (net.ts setzt sie)
export const buchtHooks = {
  fahren: (_owner: string, _id: number) => '' as string,      // in die Bucht fahren (eigene: owner leer); Rückgabe = Grund, warum es nicht geht
  einladen: (_id: number) => false,                            // Einladung an einen Piloten an dieser Station
  piloten: () => [] as { id: number; name: string }[],        // andere Piloten an dieser Station
};
