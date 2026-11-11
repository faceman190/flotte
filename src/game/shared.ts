// Gemeinsame Welt (Mehrspieler): kleiner Knoten ohne eigene Abhängigkeiten, damit Spielmodule und Netzcode
// voneinander nichts importieren müssen.
//  - client: true, wenn ein anderer Pilot in diesem Sektor Gastgeber ist. Dann erzeugt dieser Client keine
//    Asteroiden selbst (kein Nachwachsen, keine Bruchstücke), sondern übernimmt den Stand des Gastgebers.
//  - Markt: Sättigung je Station liegt auf dem Server und gilt für alle; Zeitbasis ist die Serverzeit.
export const SHARED = {
  client: false,
  online: false,
  market: {} as Record<string, Record<string, { s: number; t: number }>>,
  now: () => 0,                                                      // Serverzeit in Sekunden
  sendMarket: (_st: string, _k: string, _n: number) => {},
  // Ferrox: andere Piloten als mögliche Ziele (beim Gastgeber), Schüsse für die Mitspieler, Treffer an den Gastgeber
  pilots: [] as { id: number; x: number; y: number; z: number; vx: number; vy: number; vz: number }[],
  shots: [] as number[][],
  foeHit: (_e: any, _dmg: number, _byPlayer: boolean) => {},
  // NPC-Verkehr und Patrouillen: Ereignisse (Funk, Explosionen, Sprünge) und Patrouillenschüsse des Gastgebers
  ev: [] as any[][],
  ashots: [] as number[][],
};
// Gastgeber: Ereignis für die Mitspieler im Sektor mitschreiben
export function hostEvent(e: any[]) { if (SHARED.online && !SHARED.client) SHARED.ev.push(e); }
export const isHost = () => SHARED.online && !SHARED.client;
