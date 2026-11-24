# Quartier fürs Spiel: Laufflächen, Standflächen, Orte, Plätze für Koje, Spind, Regal, Tisch, Fenster, Türschild, Schiffsmodelle und
# Fundstücke, dazu die Teile für den Lichtraum 2. Läuft nach qu_bau.py im selben Namensraum. Alle Angaben in Plankoordinaten der Rundhalle
# (Blender x, y; das Quartier liegt bei QX, QY weit abseits der Halle). Schreibt asset-src/data/deck_quartier.json (Spiel: deck.ts hängt
# es an das Deck der Bastion an) und lm2_quartier.json (Angaben fürs Backen mit lm2_raum.py, OPT split = 'rund').
import json
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
def P(x, y): return [round(QX + x, 3), round(QY + y, 3)]
def R(x0, x1, y0, y1): return [P(x0, y0), P(x1, y0), P(x1, y1), P(x0, y1)]
WALK = [R(-RQ_X + 0.2, RQ_X - 0.2, -RQ_Y + 0.2, RQ_Y - 0.2), R(VX0 + 0.25, VX1 + 0.3, -VY + 0.22, VY - 0.22), R(VX1 - 0.2, -RQ_X + 0.35, PORT[0] + 0.2, PORT[1] - 0.2)]
SX, SY = 2.05, -1.4      # Sessel
BLOCKS = [R(KJ[0], KJ[1], KJ[2] - 0.05, KJ[3]), R(RQ_X - 0.52, RQ_X, BANK[0], BANK[1]), R(DESK[0], DESK[1], DESK[2], DESK[3]), R(SP[0], SP[1], SP[2], SP[3] + 0.04),
          R(RG[0], RG[1], RG[2], RG[3]), R(SX - 0.45, SX + 0.45, SY - 0.45, SY + 0.45), R(2.6, 3.1, -2.2, -1.65), R(1.12, 1.48, -2.2, -1.8), R(-0.2, 0.32, -1.55, -1.05),
          R(-4.4, -3.84, VY - 0.44, VY)]
ORTE = [{'name': 'Quartier', 'poly': R(-RQ_X, RQ_X, -RQ_Y, RQ_Y), 'decke': RQ_H - 0.05}, {'name': 'Quartier', 'poly': R(VX0, -RQ_X, -VY, VY), 'decke': RQ_H - 0.05}]
QU = {
    'mitte': P(0, 0), 'r': 8.0,
    'ankunft': P(-4.3, 0.0) + [0.0],                 # nach der Fahrt: im Vorraum vor der Aufzugstür, Blick in den Raum (Grad, 0 = Osten = Fenster)
    'aufzug': P(-4.55, 0.0), 'koje': P(1.9, 0.75), 'spind': P(-2.56, -1.25), 'regal': P(-2.3, 1.4), 'tisch': P(0.05, -0.9), 'fenster': P(2.45, 0.0),
    'schild': P(-4.1, -VY + 0.032) + [1.51, 0, 1, 0.46, 0.17],      # Mitte x, y, Höhe, Blickrichtung (Plan), Breite, Höhe
    'monitor': P(-0.05, DESK[2] + 0.2318) + [DESK[4] + 0.381, 0, 1, 0.62, 0.36, 0.08],      # Hauptschirm am Tisch (wie schild, dazu die Neigung nach hinten)
    'karte': P(0.53, DESK[2] + 0.0345) + [1.44, 0, 1, 0.64, 0.54, 0.0],      # Sternkarte über dem Tisch (zeichnet das Spiel)
    'schiffe': [P(x, DESK[2] + 0.12) + [1.945] for x in (0.12, 0.42, 0.72)] + [P(-2.75, (RG[2] + RG[3]) / 2) + [1.305]],      # Schiffsmodelle (Wandbord, Regal)
    'funde': [P(-3.0 + k * 0.2, (RG[2] + RG[3]) / 2) + [0.905] for k in range(5)],                                             # Fundstücke im Regal
}
HALLE = {'aufzug': [0.0, 15.55], 'tuer': [0.0, RH_R + 0.48]}      # Aufzug „QUARTIERE“ im Wandstück bei 90° (rh_kit, sector_fill 'aufzug')
TEILE = [{'name': 'quartier', 'cells': [P(0.0, 0.0)] + [P(x, y) for (x, y) in DOWN] + [P(-4.1, 0.0), P(1.5, 0.2)], 'lm': 2048}]
for o in list(C_DECK.objects) + list(C_CEIL.objects) + list(C_SIGN.objects): o['l2part'] = 'quartier'
meta = {'typ': 'anbau', 'name': 'Quartier', 'walk': WALK, 'blocks': BLOCKS, 'orte': ORTE, 'quartier': QU, 'halle': HALLE, 'licht2': ['lichtraum2_quartier', 'Lichtraum2Quartier']}
open(os.path.join(ROOT, 'asset-src', 'data', 'deck_quartier.json'), 'w', encoding='utf-8').write(json.dumps(meta, ensure_ascii=False))
open(os.path.join(HERE, 'lm2_quartier.json'), 'w', encoding='utf-8').write(json.dumps({'rooms': TEILE, 'split': 'rund', 'glb': 'Lichtraum2Quartier.glb', 'json': 'lichtraum2_quartier.json',
     'mark': 'lm2-quartier.txt', 'clamp_direct': 8, 'clamp_indirect': 4, 'spuren': True, 'deflicker': 2.5, 'vsmooth': 0.12, 'samples': 384, 'vsamples': 64}, ensure_ascii=False))
spiel = {'walk': len(WALK), 'blocks': len(BLOCKS), 'teile': len(C_DECK.objects) + len(C_CEIL.objects)}
