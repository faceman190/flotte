# Relief-Blatt des Baukastens (kit_relief_col/_nrm/_orm/_mask): kleine Bauteile zum Aufsetzen auf Flächen, mit weicher Maske.
# Vorbild: die „Floater“-Decals aus Star Citizen (siehe docs/baukasten.md). Schrauben, Griffe, Lüfter, Klappen, Anschlüsse und Fugen werden einmal
# als echte Geometrie gebaut, von oben gerendert und im Spiel als flache Vierecke auf die Wände gelegt (kit_lib.py: Kit.relief, Kit.seam).
# Läuft in Blender (Trimsheet_Relief.blend, Textblock trim_relief). Nutzt die Werkzeuge aus trim_build.py wie trim_int.py.
# Maßstab: 4 m = 2048 px (512 px je Meter, viermal so fein wie das Texturblatt der Wände), weil die Teile klein sind.
# Aufruf: build(), render() (auf die fünf Dateien _tmp/kit_relief_*.npy warten), compose(), mask().
import os, math
import numpy as np
import bpy
from mathutils import Matrix

_HERE = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte\asset-src\neu\baukasten'
tb = {'__name__': 'trim_build'}
exec(compile(open(os.path.join(_HERE, 'trim_build.py'), encoding='utf-8').read(), 'trim_build', 'exec'), tb)
RS = 4.0
tb['S'] = RS; tb['NAME'] = 'kit_relief'; tb['ATLAS'] = 'kit_relief_atlas.json'
plate, bar, bolt, cylz, ring, louvres, N = (tb[k] for k in ('plate', 'bar', 'bolt', 'cylz', 'ring', 'louvres', 'N'))
RND = lambda: tb['R']
# die Teile sind neu aufgesetzt gedacht: wenig abgeplatzter Lack, etwas Schmutz in den Kehlen, kaum Läufer
tb['CFG'].update({'chip': 0.8, 'flat': 0.15, 'scratch': 120, 'dirt': 0.9, 'streak': 0.25, 'walls': (), 'long': ()})
ST = tb['STRIPS']; ST.clear()
ST.update({'r_seam': (3.5, 3.56), 'r_weld': (3.56, 3.7), 'r_rib': (3.7, 3.82), 'r_lip': (3.82, 3.9), 'r_groove': (3.9, 4.0)})
TL = tb['TILES']; TL.clear()
FLOOR = 0.004                                                # Höhe der Grundplatte; alles darüber ist Bauteil
DRAW = []

def cell(name, x, y, w, h):
    TL[name] = (x, y, x + w, y + h)
    def deco(fn): DRAW.append((name, fn)); return fn
    return deco
CUR = [0.0, 0.0]                                             # linke obere Ecke des Felds, in dem gerade gezeichnet wird
def Br(k, a, b, c, d, h, z=FLOOR, **kw): bar(k, CUR[0] + a, CUR[1] + b, CUR[0] + c, CUR[1] + d, h, z, **kw)      # Rundstab im Feld
def B(name):
    """Zeichenwerkzeuge im Feld: Koordinaten relativ zur linken oberen Ecke."""
    x0, y0, x1, y1 = TL[name]; CUR[0] = x0; CUR[1] = y0
    P = lambda k, a, b, c, d, h, z=FLOOR, **kw: plate(k, x0 + a, y0 + b, x0 + c, y0 + d, h, z, **kw)
    C = lambda k, a, b, r, h, z=FLOOR, **kw: cylz(k, x0 + a, y0 + b, r, h, z, **kw)
    R_ = lambda k, a, b, ri, ro, h, z=FLOOR, **kw: ring(k, x0 + a, y0 + b, ri, ro, h, z, **kw)
    Bo = lambda a, b, z=FLOOR, r=0.018: bolt(x0 + a, y0 + b, z, r)
    return P, C, R_, Bo, x0, y0, x1 - x0, y1 - y0

# ---------------------------------------------------------------- Reihe 1: Kleinteile (je 0,25 m)
for i, nm in enumerate(('b_round', 'b_hex', 'b_washer', 'b_dome', 'b_flat', 'rivet', 'latch', 'cap')): TL[nm] = (i * 0.25, 0.0, i * 0.25 + 0.25, 0.25)
def small():
    P, C, R_, Bo, *_ = B('b_round'); C('M', 0.125, 0.125, 0.045, 0.02, seg=20, r2=0.038); C('M2', 0.125, 0.125, 0.018, 0.004, FLOOR + 0.02, seg=6)
    P, C, R_, Bo, *_ = B('b_hex'); C('M', 0.125, 0.125, 0.05, 0.022, seg=6, r2=0.044); C('M', 0.125, 0.125, 0.022, 0.012, FLOOR + 0.022, seg=12, r2=0.016)
    P, C, R_, Bo, *_ = B('b_washer'); R_('P', 0.125, 0.125, 0.03, 0.075, 0.008, seg=28); C('M', 0.125, 0.125, 0.04, 0.02, seg=6, r2=0.034)
    P, C, R_, Bo, *_ = B('b_dome'); C('P', 0.125, 0.125, 0.06, 0.012, seg=24, r2=0.05); C('P', 0.125, 0.125, 0.045, 0.012, FLOOR + 0.012, seg=24, r2=0.025)
    P, C, R_, Bo, *_ = B('b_flat'); C('P', 0.125, 0.125, 0.055, 0.006, seg=24, r2=0.05); P('K', 0.085, 0.118, 0.165, 0.132, 0.002, FLOOR + 0.006, bev=0)
    P, C, R_, Bo, *_ = B('rivet'); C('P', 0.125, 0.125, 0.03, 0.012, seg=16, r2=0.016)
    P, C, R_, Bo, *_ = B('latch'); P('P', 0.05, 0.07, 0.2, 0.18, 0.012, bev=0.006); P('M', 0.08, 0.1, 0.17, 0.15, 0.014, FLOOR + 0.012, bev=0.006); Bo(0.07, 0.125, FLOOR + 0.012, 0.01); Bo(0.18, 0.125, FLOOR + 0.012, 0.01)
    P, C, R_, Bo, *_ = B('cap'); R_('P', 0.125, 0.125, 0.05, 0.085, 0.014, seg=28); C('M2', 0.125, 0.125, 0.05, 0.006, seg=24); P('K', 0.1, 0.12, 0.15, 0.13, 0.002, FLOOR + 0.006, bev=0)

@cell('handle', 2.0, 0.0, 0.5, 0.25)
def _():
    P, C, R_, Bo, *_ = B('handle')
    for x in (0.08, 0.42): P('P', x - 0.035, 0.085, x + 0.035, 0.165, 0.012, bev=0.006); Bo(x, 0.1, FLOOR + 0.012, 0.009); Bo(x, 0.15, FLOOR + 0.012, 0.009)
    Br('M', 0.07, 0.108, 0.43, 0.142, 0.03, FLOOR + 0.012)
@cell('bracket', 2.5, 0.0, 0.5, 0.25)
def _():
    P, C, R_, Bo, *_ = B('bracket')
    P('P', 0.04, 0.05, 0.46, 0.2, 0.012, bev=0.008); P('P', 0.16, 0.08, 0.34, 0.17, 0.03, FLOOR + 0.012, bev=0.012, seg=3)
    for x in (0.09, 0.41):
        for y in (0.09, 0.16): Bo(x, y, FLOOR + 0.012, 0.012)
@cell('lamp', 3.0, 0.0, 0.5, 0.25)
def _():
    P, C, R_, Bo, *_ = B('lamp')
    P('P', 0.04, 0.06, 0.46, 0.19, 0.016, bev=0.01); P('D', 0.07, 0.085, 0.43, 0.165, 0.012, FLOOR + 0.016, bev=0.01)
    for k in range(5): P('M2', 0.1 + k * 0.066, 0.09, 0.106 + k * 0.066, 0.16, 0.008, FLOOR + 0.028, bev=0)
@cell('rivets', 3.5, 0.0, 0.5, 0.25)
def _():
    P, C, R_, Bo, *_ = B('rivets')
    for k in range(4): C('P', 0.0625 + k * 0.125, 0.125, 0.022, 0.01, seg=14, r2=0.012)

# ---------------------------------------------------------------- Reihe 2: Anschlüsse (0,5 m hoch)
@cell('port', 0.0, 0.25, 0.5, 0.5)
def _():
    P, C, R_, Bo, *_ = B('port')
    R_('P', 0.25, 0.25, 0.13, 0.2, 0.02, seg=40); R_('M', 0.25, 0.25, 0.09, 0.13, 0.03, seg=36); C('K', 0.25, 0.25, 0.09, 0.004, seg=30)
    for k in range(6): a = k / 6 * math.tau; Bo(0.25 + math.cos(a) * 0.165, 0.25 + math.sin(a) * 0.165, FLOOR + 0.02, 0.012)
@cell('socket', 0.5, 0.25, 0.5, 0.5)
def _():
    P, C, R_, Bo, *_ = B('socket')
    P('P', 0.06, 0.1, 0.44, 0.4, 0.018, bev=0.012); P('K', 0.1, 0.15, 0.4, 0.35, 0.004, FLOOR + 0.018, bev=0)
    for k in range(6): P('M', 0.125 + k * 0.045, 0.18, 0.145 + k * 0.045, 0.32, 0.012, FLOOR + 0.018, bev=0.003, seg=1)
    for x, y in ((0.085, 0.125), (0.415, 0.125), (0.085, 0.375), (0.415, 0.375)): Bo(x, y, FLOOR + 0.018, 0.01)
@cell('valve', 1.0, 0.25, 0.5, 0.5)
def _():
    P, C, R_, Bo, *_ = B('valve')
    C('P', 0.25, 0.25, 0.17, 0.014, seg=8, r2=0.16); R_('M', 0.25, 0.25, 0.085, 0.125, 0.02, FLOOR + 0.014, seg=30)
    for k in range(3): a = k / 3 * math.pi; plate('M', TL['valve'][0] + 0.25 - 0.1, TL['valve'][1] + 0.25 - 0.011, TL['valve'][0] + 0.25 + 0.1, TL['valve'][1] + 0.25 + 0.011, 0.014, FLOOR + 0.02, bev=0.004, seg=1, rot=Matrix.Rotation(a, 4, 'Z'))
    C('M', 0.25, 0.25, 0.03, 0.03, FLOOR + 0.014, seg=12)
@cell('vent_grid', 1.5, 0.25, 0.5, 0.5)
def _():
    P, C, R_, Bo, *_ = B('vent_grid')
    P('P', 0.05, 0.05, 0.45, 0.45, 0.012, bev=0.012)
    for i in range(6):
        for j in range(6): C('K', 0.1 + i * 0.06, 0.1 + j * 0.06, 0.02, 0.003, FLOOR + 0.012, seg=10)
@cell('cable', 2.0, 0.25, 0.5, 0.5)
def _():
    P, C, R_, Bo, *_ = B('cable')
    P('P', 0.08, 0.08, 0.42, 0.42, 0.014, bev=0.014)
    for x, y in ((0.18, 0.18), (0.32, 0.18), (0.18, 0.32), (0.32, 0.32)): R_('M', x, y, 0.028, 0.05, 0.016, FLOOR + 0.014, seg=18); C('K', x, y, 0.028, 0.004, FLOOR + 0.014, seg=14)
@cell('pan_sq', 2.5, 0.25, 0.5, 0.5)
def _():
    P, C, R_, Bo, *_ = B('pan_sq')
    for a, b, c, d in ((0.05, 0.05, 0.45, 0.1), (0.05, 0.4, 0.45, 0.45), (0.05, 0.05, 0.1, 0.45), (0.4, 0.05, 0.45, 0.45)): P('P', a, b, c, d, 0.016, bev=0.008)
    P('P', 0.15, 0.15, 0.35, 0.35, 0.008, bev=0.008, jit=-0.05)
@cell('keypad', 3.0, 0.25, 0.25, 0.5)
def _():
    P, C, R_, Bo, *_ = B('keypad')
    P('D', 0.035, 0.05, 0.215, 0.45, 0.02, bev=0.01); P('G', 0.055, 0.075, 0.195, 0.19, 0.004, FLOOR + 0.02, bev=0)
    for i in range(3):
        for j in range(4): P('M2', 0.06 + i * 0.047, 0.22 + j * 0.052, 0.098 + i * 0.047, 0.258 + j * 0.052, 0.008, FLOOR + 0.02, bev=0.003, seg=1)
@cell('hinge', 3.25, 0.25, 0.25, 0.5)
def _():
    P, C, R_, Bo, *_ = B('hinge')
    P('P', 0.05, 0.08, 0.2, 0.42, 0.012, bev=0.008); Br('M', 0.105, 0.06, 0.145, 0.44, 0.03, FLOOR + 0.006)
    for y in (0.13, 0.25, 0.37): Bo(0.075, y, FLOOR + 0.012, 0.01); Bo(0.175, y, FLOOR + 0.012, 0.01)
@cell('lock', 3.5, 0.25, 0.5, 0.5)
def _():
    P, C, R_, Bo, *_ = B('lock')
    P('P', 0.07, 0.12, 0.43, 0.38, 0.016, bev=0.014); R_('M', 0.18, 0.25, 0.04, 0.07, 0.018, FLOOR + 0.016, seg=24); C('K', 0.18, 0.25, 0.04, 0.004, FLOOR + 0.016, seg=18)
    P('M', 0.28, 0.2, 0.39, 0.3, 0.02, FLOOR + 0.016, bev=0.008); P('K', 0.3, 0.243, 0.37, 0.257, 0.002, FLOOR + 0.036, bev=0)

# ---------------------------------------------------------------- Reihe 3: Lüfter und Mulden (1 × 0,5 m)
@cell('vent_slot', 0.0, 0.75, 1.0, 0.5)
def _():
    P, C, R_, Bo, x0, y0, w, h = B('vent_slot')
    for a, b, c, d in ((0.04, 0.05, 0.96, 0.1), (0.04, 0.4, 0.96, 0.45), (0.04, 0.05, 0.09, 0.45), (0.91, 0.05, 0.96, 0.45)): P('P', a, b, c, d, 0.022, bev=0.008)
    P('K', 0.09, 0.1, 0.91, 0.4, 0.002, bev=0)
    louvres('M2', x0 + 0.09, y0 + 0.1, x0 + 0.91, y0 + 0.4, 7, FLOOR)
    for x in (0.065, 0.5, 0.935):
        for y in (0.075, 0.425): Bo(x, y, FLOOR + 0.022, 0.009)
@cell('pan_rect', 1.0, 0.75, 1.0, 0.5)
def _():
    P, C, R_, Bo, *_ = B('pan_rect')
    for a, b, c, d in ((0.05, 0.06, 0.95, 0.11), (0.05, 0.39, 0.95, 0.44), (0.05, 0.06, 0.1, 0.44), (0.9, 0.06, 0.95, 0.44)): P('P', a, b, c, d, 0.018, bev=0.009)
    P('P', 0.16, 0.16, 0.56, 0.34, 0.01, bev=0.01, jit=-0.04); P('M2', 0.64, 0.17, 0.84, 0.33, 0.008, bev=0.006)
    for k in range(4): P('K', 0.66 + k * 0.045, 0.19, 0.675 + k * 0.045, 0.31, 0.002, FLOOR + 0.008, bev=0)
@cell('pan_pill', 2.0, 0.75, 1.0, 0.5)
def _():
    P, C, R_, Bo, *_ = B('pan_pill')
    Br('P', 0.06, 0.1, 0.94, 0.4, 0.02); P('P', 0.2, 0.19, 0.8, 0.31, 0.012, FLOOR + 0.018, bev=0.012, jit=0.05)
    for x in (0.13, 0.87): Bo(x, 0.25, FLOOR + 0.02, 0.014)
@cell('nameplate', 3.0, 0.75, 1.0, 0.5)
def _():
    P, C, R_, Bo, *_ = B('nameplate')
    P('M', 0.08, 0.1, 0.92, 0.4, 0.008, bev=0.004)
    for k in range(4): P('M2', 0.16, 0.16 + k * 0.055, 0.84 - (k % 2) * 0.2, 0.185 + k * 0.055, 0.003, FLOOR + 0.008, bev=0)
    for x, y in ((0.11, 0.13), (0.89, 0.13), (0.11, 0.37), (0.89, 0.37)): C('M', x, y, 0.012, 0.006, FLOOR + 0.008, seg=10)

# ---------------------------------------------------------------- Reihe 4: Klappen und Gitter (0,75 m hoch)
@cell('hatch_s', 0.0, 1.25, 0.75, 0.75)
def _():
    P, C, R_, Bo, *_ = B('hatch_s')
    P('P', 0.05, 0.05, 0.7, 0.7, 0.012, bev=0.02, seg=3); P('P', 0.1, 0.1, 0.65, 0.65, 0.014, FLOOR + 0.012, bev=0.016, seg=3, jit=0.04)
    P('P', 0.2, 0.2, 0.55, 0.42, 0.008, FLOOR + 0.026, bev=0.008, jit=-0.05); Br('M', 0.26, 0.5, 0.49, 0.535, 0.024, FLOOR + 0.026)
    for x, y in ((0.075, 0.075), (0.675, 0.075), (0.075, 0.675), (0.675, 0.675), (0.375, 0.075), (0.375, 0.675)): Bo(x, y, FLOOR + 0.012, 0.012)
@cell('fan', 0.75, 1.25, 0.75, 0.75)
def _():
    P, C, R_, Bo, x0, y0, w, h = B('fan')
    P('P', 0.05, 0.05, 0.7, 0.7, 0.014, bev=0.02, seg=3); R_('P', 0.375, 0.375, 0.24, 0.3, 0.03, FLOOR + 0.014, seg=44); C('K', 0.375, 0.375, 0.24, 0.003, FLOOR + 0.014, seg=36)
    for k in range(4): a = k / 4 * math.pi; plate('P', x0 + 0.375 - 0.25, y0 + 0.375 - 0.012, x0 + 0.375 + 0.25, y0 + 0.375 + 0.012, 0.012, FLOOR + 0.034, bev=0.004, seg=1, rot=Matrix.Rotation(a, 4, 'Z'))
    C('P', 0.375, 0.375, 0.06, 0.02, FLOOR + 0.034, seg=16, r2=0.05)
    for x, y in ((0.09, 0.09), (0.66, 0.09), (0.09, 0.66), (0.66, 0.66)): Bo(x, y, FLOOR + 0.014, 0.012)
@cell('cover', 1.5, 1.25, 0.75, 0.75)
def _():
    P, C, R_, Bo, *_ = B('cover')
    P('P', 0.06, 0.06, 0.69, 0.69, 0.016, bev=0.014, seg=3, jit=0.05)
    for k in range(5):
        t = 0.1 + k * 0.1375
        for x, y in ((t, 0.095), (t, 0.655), (0.095, t), (0.655, t)): Bo(x, y, FLOOR + 0.016, 0.011)
    P('P', 0.2, 0.2, 0.55, 0.55, 0.006, FLOOR + 0.016, bev=0.006, jit=-0.04)
@cell('grille', 2.25, 1.25, 0.75, 0.75)
def _():
    P, C, R_, Bo, *_ = B('grille')
    for a, b, c, d in ((0.05, 0.05, 0.7, 0.1), (0.05, 0.65, 0.7, 0.7), (0.05, 0.05, 0.1, 0.7), (0.65, 0.05, 0.7, 0.7)): P('P', a, b, c, d, 0.02, bev=0.008)
    P('K', 0.1, 0.1, 0.65, 0.65, 0.002, bev=0)
    for k in range(9): Br('M2', 0.125 + k * 0.058, 0.1, 0.153 + k * 0.058, 0.65, 0.012)
    Br('M2', 0.1, 0.36, 0.65, 0.39, 0.016)
@cell('junction', 3.0, 1.25, 1.0, 0.75)
def _():
    P, C, R_, Bo, *_ = B('junction')
    P('P', 0.06, 0.08, 0.6, 0.67, 0.03, bev=0.016, seg=3); P('P', 0.1, 0.12, 0.56, 0.63, 0.008, FLOOR + 0.03, bev=0.01, jit=0.05)
    Bo(0.14, 0.16, FLOOR + 0.038, 0.01); Bo(0.52, 0.16, FLOOR + 0.038, 0.01); Bo(0.14, 0.59, FLOOR + 0.038, 0.01); Bo(0.52, 0.59, FLOOR + 0.038, 0.01)
    P('Y', 0.2, 0.3, 0.46, 0.45, 0.002, FLOOR + 0.038, bev=0)
    for k in range(3): Br('M2', 0.6, 0.2 + k * 0.16, 0.94, 0.25 + k * 0.16, 0.035)      # Leitungen zur Seite
    for k in range(3): P('P', 0.74, 0.185 + k * 0.16, 0.8, 0.265 + k * 0.16, 0.042, bev=0.006)

# ---------------------------------------------------------------- Reihe 5: große Teile (1,5 m hoch)
@cell('hatch_l', 0.0, 2.0, 1.0, 1.5)
def _():
    P, C, R_, Bo, *_ = B('hatch_l')
    P('P', 0.06, 0.06, 0.94, 1.44, 0.012, bev=0.03, seg=3); P('P', 0.12, 0.12, 0.88, 1.38, 0.014, FLOOR + 0.012, bev=0.024, seg=3, jit=0.04)
    P('P', 0.22, 0.24, 0.78, 0.62, 0.008, FLOOR + 0.026, bev=0.01, jit=-0.05); P('P', 0.22, 0.86, 0.78, 1.26, 0.008, FLOOR + 0.026, bev=0.01, jit=-0.05)
    Br('M', 0.36, 0.72, 0.64, 0.76, 0.03, FLOOR + 0.026)
    for y in (0.3, 0.75, 1.2): P('M', 0.065, y - 0.06, 0.125, y + 0.06, 0.02, FLOOR + 0.012, bev=0.008)      # Scharniere
    for k in range(6): Bo(0.9, 0.2 + k * 0.22, FLOOR + 0.012, 0.012)
@cell('duct', 1.0, 2.0, 0.5, 1.5)
def _():
    P, C, R_, Bo, *_ = B('duct')
    Br('P', 0.14, 0.02, 0.36, 1.48, 0.08)
    for y in (0.2, 0.75, 1.3): P('M', 0.08, y - 0.04, 0.42, y + 0.04, 0.03, bev=0.008); Bo(0.105, y, FLOOR + 0.03, 0.012); Bo(0.395, y, FLOOR + 0.03, 0.012)
@cell('panel_big', 1.5, 2.0, 1.5, 1.5)
def _():
    P, C, R_, Bo, *_ = B('panel_big')
    P('P', 0.06, 0.06, 1.44, 1.44, 0.014, bev=0.03, seg=3, jit=0.03)
    for i in range(2):
        for j in range(2):
            a, b = 0.16 + i * 0.62, 0.16 + j * 0.62
            for q in ((a, b, a + 0.56, b + 0.04), (a, b + 0.52, a + 0.56, b + 0.56), (a, b, a + 0.04, b + 0.56), (a + 0.52, b, a + 0.56, b + 0.56)): P('P', *q, 0.012, FLOOR + 0.014, bev=0.006)
            P('P', a + 0.12, b + 0.12, a + 0.44, b + 0.44, 0.006, FLOOR + 0.014, bev=0.006, jit=-0.05 + 0.03 * (i + j))
    for k in range(7):
        t = 0.1 + k * 0.2167
        for x, y in ((t, 0.1), (t, 1.4), (0.1, t), (1.4, t)): Bo(x, y, FLOOR + 0.014, 0.012)
@cell('rungs', 3.0, 2.0, 1.0, 1.5)
def _():
    P, C, R_, Bo, *_ = B('rungs')
    for k in range(4):
        y = 0.2 + k * 0.37
        for x in (0.27, 0.73): P('P', x - 0.045, y - 0.05, x + 0.045, y + 0.05, 0.014, bev=0.008); Bo(x, y - 0.03, FLOOR + 0.014, 0.009); Bo(x, y + 0.03, FLOOR + 0.014, 0.009)
        Br('M', 0.25, y - 0.018, 0.75, y + 0.018, 0.045, FLOOR + 0.014)

# ---------------------------------------------------------------- Streifen (kacheln über 4 m): Fugen, Nähte, Rippen
def strips():
    y0, y1 = ST['r_seam']; m = (y0 + y1) / 2
    plate('P', -1, y0 + 0.006, RS + 1, m - 0.006, 0.006, FLOOR, bev=0.004, seg=1); plate('P', -1, m + 0.006, RS + 1, y1 - 0.006, 0.006, FLOOR, bev=0.004, seg=1)
    plate('K', -1, m - 0.006, RS + 1, m + 0.006, 0.001, FLOOR, bev=0)
    y0, y1 = ST['r_weld']
    bar('P', -1, y0 + 0.04, RS + 1, y1 - 0.04, 0.014, FLOOR)
    for k in range(16): cylz('P', 0.125 + k * 0.25, (y0 + y1) / 2, 0.022, 0.01, FLOOR + 0.014, seg=12, r2=0.012)
    y0, y1 = ST['r_rib']
    bar('P', -1, y0 + 0.025, RS + 1, y1 - 0.025, 0.035, FLOOR)
    y0, y1 = ST['r_lip']
    plate('P', -1, y0 + 0.012, RS + 1, y1 - 0.012, 0.014, FLOOR, bev=0.012, seg=3)
    for k in range(8): bolt(0.25 + k * 0.5, (y0 + y1) / 2, FLOOR + 0.014, 0.012)
    y0, y1 = ST['r_groove']
    for k in range(3): plate('P', -1, y0 + 0.012 + k * 0.028, RS + 1, y0 + 0.03 + k * 0.028, 0.008, FLOOR, bev=0.004, seg=1)

def floor():
    plate('P', -1, -1, RS + 1, RS + 1, FLOOR, 0.0, bev=0)

tb['BUILDERS'] = [floor, small] + [fn for _, fn in DRAW] + [strips]
build, render, compose = tb['build'], tb['render'], tb['compose']

def mask():
    """Maskenbild: Grün = Deckkraft (das Bauteil und ein schmaler Hof für den Schatten an seinem Fuß), Rot = Höhe (0 bis 10 cm) für die Tiefenwirkung."""
    blur, sstep, srgb, OUT, TMP, HK = (tb[k] for k in ('blur', 'sstep', 'srgb', 'OUT', 'TMP', 'HK'))
    hgt = np.load(os.path.join(TMP, 'kit_relief_hgt.npy'))[..., 0] / HK
    foot = (hgt > FLOOR + 0.0012).astype(np.float32)
    op = np.clip(np.maximum(foot, sstep(0.04, 0.5, blur(foot, 5.0))), 0, 1)
    op = np.clip(blur(op, 0.8), 0, 1)
    buf = np.zeros((N, N, 4), np.float32); buf[..., 3] = 1
    buf[..., 0] = np.clip((hgt - FLOOR) / 0.1, 0, 1); buf[..., 1] = op
    img = bpy.data.images.get('kit_relief_mask') or bpy.data.images.new('kit_relief_mask', N, N, alpha=False)
    img.colorspace_settings.name = 'Non-Color'
    img.pixels.foreach_set(buf.ravel()); img.update()
    p = os.path.join(OUT, 'kit_relief_mask@2048.png'); img.filepath_raw = p; img.file_format = 'PNG'; img.save()
    return {'file': p, 'cover': float(op.mean()), 'cells': len(TL)}
