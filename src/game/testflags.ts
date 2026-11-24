// Schalter des Testlabors (game/testlabor.ts, nur auf dem Testserver und im Entwicklungsmodus). Eigene kleine Datei, damit Schiff, Feldkampf
// und Mine sie abfragen können, ohne das ganze Testlabor einzubinden.
//   gott: kein Schaden (Schiff, zu Fuß auf Planeten, in Minen) · zeit: Faktor auf die Spielzeit (Zeitlupe für Animationen, 1 = normal)
export const TESTF = { gott: false, zeit: 1 };
