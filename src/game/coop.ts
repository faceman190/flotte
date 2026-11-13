import { SHARED } from './shared';

// =====================================================================================
// Koop zu Fuß (Alpha 0.91): gemeinsame Minen und gemeinsamer Kampf auf dem Planetenboden.
//
// Prinzip: Wer am selben Ort ist (dieselbe Mine bzw. zu Fuß/im Rover auf demselben Planeten), bildet eine Gruppe.
// Gastgeber ist der Pilot mit der kleinsten Kennung. Er steuert die Drohnen (Bewegung, Ziel, Schüsse) und schickt
// ihren Stand 10× pro Sekunde. Die anderen zeigen diesen Stand nur an und melden ihre Treffer an den Gastgeber.
// Geschosse der Drohnen kommen als Ereignis bei allen an; jeder prüft selbst, ob es ihn trifft.
// Schalter, Tor und Kisten sind gemeinsam: Wer etwas umlegt oder öffnet, meldet es allen. Beute wird geteilt –
// jeder bekommt aus einer Kiste seinen eigenen Fund.
//
// Netz: Nachricht { t: 'co', k: <Art>, ... }; der Server reicht sie an alle im selben Raum weiter (mit from = Absender).
// =====================================================================================

export const coopNet = {
  id: 0,                                     // eigene Kennung (0 = nicht verbunden)
  send: (_m: Record<string, unknown>) => {}, // setzt net.ts
};
type Handler = (m: any) => void;
const handlers = new Map<string, Handler>();
export function onCoop(kind: string, h: Handler) { handlers.set(kind, h); }
export function coopReceive(m: any) { if (m && typeof m.k === 'string' && m.from !== coopNet.id) handlers.get(m.k)?.(m); }
export function coopSend(kind: string, body: Record<string, unknown>) { if (coopNet.id) coopNet.send({ t: 'co', k: kind, ...body }); }
// Gruppe an einem Ort: Gastgeber ist, wer am längsten da ist (Zeit des Betretens, bei Gleichstand die kleinere Kennung).
// So bleibt der Stand beim Dazukommen erhalten – wer neu kommt, übernimmt die Wächter so, wie sie gerade sind.
// Wer seine Ankunftszeit noch nicht gemeldet hat, gilt als älter: kurz nach dem Dazukommen steuert niemand doppelt.
export class CoopGroup {
  since = new Map<number, number>();
  mine = 0;
  reset() { this.since.clear(); this.mine = coopNow(); }
  host(ids: Iterable<number>) {
    let best = coopNet.id, bs = this.mine;
    for (const id of ids) { const s = this.since.get(id) ?? -Infinity; if (s < bs || (s === bs && id < best)) { best = id; bs = s; } }
    return best;
  }
  amHost(ids: Iterable<number>) { return !coopNet.id || this.host(ids) === coopNet.id; }
}
// gemeinsame Uhr (Serverzeit, ohne Verbindung die eigene)
export const coopNow = () => (SHARED.online ? SHARED.now() : performance.now() / 1000);
const r2 = (v: number) => Math.round(v * 100) / 100;
export const pack = (...v: number[]) => v.map(r2);
