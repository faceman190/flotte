# Zweites Texturblatt des Baukastens: Innenräume der Stationen (kit_int_col/_nrm/_orm). Läuft in Blender (Trimsheet_Innen.blend, Textblock trim_int).
# Nutzt die Werkzeuge aus trim_build.py (Platten, Schrauben, Lamellen, Rendern, Bilder berechnen) und ersetzt nur Streifen, Kacheln und Namen.
# Aufruf wie dort: build(), render(), compose().
import os, math
from mathutils import Matrix

_HERE = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte\asset-src\neu\baukasten'
tb = {'__name__': 'trim_build'}
exec(compile(open(os.path.join(_HERE, 'trim_build.py'), encoding='utf-8').read(), 'trim_build', 'exec'), tb)
plate, bar, bolt, cylz, ring, louvres, box_m, S = (tb[k] for k in ('plate', 'bar', 'bolt', 'cylz', 'ring', 'louvres', 'box_m', 'S'))
RND = lambda: tb['R']
tb['NAME'] = 'kit_int'; tb['ATLAS'] = 'kit_int_atlas.json'
tb['CFG'].update({'chip': 0.72, 'flat': 0.25, 'scratch': 110, 'dirt': 0.75, 'streak': 0.5, 'walls': ('iwall',), 'long': ('iwall', 'iwall2')})
tb['PAINT'].update({'F': (0.62, 0.62, 0.62), 'B': (0.05, 0.16, 0.42), 'GN': (0.1, 0.32, 0.14)})
tb['PRM'].update({'F': (0, 0.95, 0), 'B': (0, 0.5, 1), 'GN': (0, 0.5, 1)})
ST = tb['STRIPS']; ST.clear()
ST.update({'iwall': (0.0, 3.0), 'iwall2': (3.0, 4.5), 'ifloor': (4.5, 6.5), 'iceil': (6.5, 8.0), 'rib': (8.0, 8.8), 'shutter': (8.8, 9.4),
           'fabric': (9.4, 9.7), 'itrim': (9.7, 9.9), 'iplain': (9.9, 10.0)})
TL = tb['TILES']; TL.clear()
TL.update({'shelf': (0, 10, 2, 12), 'vending': (2, 10, 4, 12), 'terminal': (4, 10, 6, 12), 'locker': (6, 10, 8, 12), 'sdoor': (8, 10, 10, 12), 'utility': (10, 10, 12, 12)})

def iwall():
    y0, y1 = ST['iwall']
    plate('D', -1, y0, S + 1, y1, 0.004, bev=0)
    x = 0.0
    for i, w in enumerate([2, 2, 1, 2, 2, 2, 1]):
        j = RND().uniform(-0.04, 0.04); a, b = x + 0.012, x + w - 0.012; z = 0.03
        plate('P', a, y0 + 0.015, b, y1 - 0.015, z, jit=j)
        plate('M2', a + 0.03, y1 - 0.42, b - 0.03, y1 - 0.04, 0.022, z, bev=0.008)                       # Sockelblech mit Nieten
        for k in range(int(w / 0.25)): cylz('M', a + 0.125 + k * 0.25, y1 - 0.1, 0.012, 0.006, z + 0.022, seg=8, r2=0.007)
        plate('P', a + 0.03, y0 + 0.04, b - 0.03, y0 + 0.34, 0.016, z, bev=0.008, jit=j - 0.05)           # Kopfband
        if w == 2:
            for k in range(10): plate('K', a + 0.3 + k * 0.14, y0 + 0.12, a + 0.37 + k * 0.14, y0 + 0.26, 0.003, z + 0.016, bev=0)
            if i % 2 == 0:      # ein großes, weich gepolstertes Feld mit Lichtfuge
                plate('P', a + 0.12, y0 + 0.46, b - 0.12, y1 - 0.52, 0.03, z, bev=0.028, seg=3, jit=j + 0.03)
                plate('K', a + 0.94, y0 + 0.52, a + 1.04, y1 - 0.58, 0.004, z + 0.03, bev=0)
            else:               # vier Felder
                for c in range(2):
                    xa = a + 0.12 + c * 0.9
                    plate('P', xa, y0 + 0.46, xa + 0.84, y0 + 1.5, 0.026, z, bev=0.024, seg=3, jit=j + 0.03)
                    plate('P', xa, y0 + 1.58, xa + 0.84, y1 - 0.52, 0.026, z, bev=0.024, seg=3, jit=j - 0.02)
                    for bx in (xa + 0.07, xa + 0.77): bolt(bx, y0 + 1.54, z, 0.012)
        else:                   # Versorgungssäule: Klappe, Lamellen, Kennstreifen
            plate('P', a + 0.1, y0 + 0.46, b - 0.1, y0 + 1.5, 0.02, z, bev=0.012, jit=j - 0.08)
            bar('M', a + 0.72, y0 + 0.85, a + 0.78, y0 + 1.15, 0.03, z + 0.02)
            for bx in (a + 0.17, b - 0.17):
                for by in (y0 + 0.53, y0 + 1.43): bolt(bx, by, z + 0.02, 0.014)
            plate('K', a + 0.18, y0 + 1.7, b - 0.18, y0 + 2.2, 0.002, z, bev=0); louvres('M2', a + 0.18, y0 + 1.7, b - 0.18, y0 + 2.2, 6, z)
            for fa, fb, fc, fd in ((a + 0.12, y0 + 1.64, b - 0.12, y0 + 1.7), (a + 0.12, y0 + 2.2, b - 0.12, y0 + 2.26), (a + 0.12, y0 + 1.64, a + 0.18, y0 + 2.26), (b - 0.18, y0 + 1.64, b - 0.12, y0 + 2.26)):
                plate('P', fa, fb, fc, fd, 0.03, z, bev=0.006, jit=j - 0.06)
            plate('Y', a + 0.3, y0 + 2.36, b - 0.3, y0 + 2.43, 0.003, z, bev=0)
        x += w

def iwall2():
    y0, y1 = ST['iwall2']
    plate('D', -1, y0, S + 1, y1, 0.004, bev=0)
    for i in range(4):
        a, b = i * 3 + 0.012, i * 3 + 2.988; j = RND().uniform(-0.04, 0.04); z = 0.025
        plate('P', a, y0 + 0.015, b, y1 - 0.015, z, jit=j)
        for k in range(3): plate('P', a + 0.1, y0 + 0.1 + k * 0.3, b - 0.1, y0 + 0.34 + k * 0.3, 0.018, z, bev=0.012, seg=3, jit=j + RND().uniform(-0.03, 0.03))
        plate('M2', a + 0.05, y1 - 0.42, b - 0.05, y1 - 0.1, 0.03, z, bev=0.008)                         # Kabelwanne
        for k in range(3): bar('K', a + 0.08, y1 - 0.385 + k * 0.095, b - 0.08, y1 - 0.315 + k * 0.095, 0.03, z + 0.03)
        for cx in (a + 0.6, a + 1.5, a + 2.4): plate('M', cx - 0.03, y1 - 0.4, cx + 0.03, y1 - 0.12, 0.068, z, bev=0.006)
        if i % 2:
            plate('P', a + 1.2, y0 + 0.22, a + 1.8, y0 + 0.82, 0.05, z + 0.018, bev=0.014, jit=-0.1)
            cylz('R', a + 1.35, y0 + 0.36, 0.03, 0.01, z + 0.068, seg=10); cylz('GN', a + 1.47, y0 + 0.36, 0.03, 0.01, z + 0.068, seg=10)
            plate('K', a + 1.3, y0 + 0.5, a + 1.7, y0 + 0.72, 0.004, z + 0.068, bev=0)
        for bx in (a + 0.05, b - 0.05):
            for by in (y0 + 0.07, y0 + 0.5, y0 + 0.95): bolt(bx, by, z, 0.012)

def ifloor():
    y0, y1 = ST['ifloor']
    plate('D', -1, y0, S + 1, y1, 0.004, bev=0)
    for i in range(6):
        a, b = i * 2 + 0.008, i * 2 + 1.992; j = RND().uniform(-0.035, 0.035); z = 0.02
        plate('P', a, y0 + 0.008, b, y1 - 0.008, z, bev=0.006, jit=j)
        for bx in (a + 0.09, b - 0.09):
            for by in (y0 + 0.09, y1 - 0.09): cylz('M2', bx, by, 0.022, 0.003, z, seg=10)
        if i == 1:
            for u in range(10):
                for v in range(10): cylz('P', a + 0.28 + u * 0.16, y0 + 0.28 + v * 0.16, 0.035, 0.006, z, seg=8, r2=0.022, jit=j)
        elif i == 3:
            plate('P', a + 0.5, y0 + 0.5, b - 0.5, y1 - 0.5, 0.006, z, bev=0.004, jit=j - 0.04)
            for hy in (y0 + 0.62, y1 - 0.72): plate('M2', a + 0.9, hy, a + 1.1, hy + 0.06, 0.002, z + 0.006, bev=0)
        elif i == 4:
            for k in range(7): plate('P', a + 0.25, y0 + 0.4 + k * 0.2, b - 0.25, y0 + 0.44 + k * 0.2, 0.006, z, bev=0.004, jit=j - 0.06)
        elif i == 5:
            plate('P', a + 0.75, y0 + 0.012, a + 1.25, y1 - 0.012, 0.004, z, bev=0.002, jit=j - 0.07)
            for k in range(5): cylz('M', a + 0.8, y0 + 0.2 + k * 0.4, 0.014, 0.003, z + 0.004, seg=8); cylz('M', a + 1.2, y0 + 0.2 + k * 0.4, 0.014, 0.003, z + 0.004, seg=8)

def iceil():
    y0, y1 = ST['iceil']
    plate('D', -1, y0, S + 1, y1, 0.004, bev=0)
    for i in range(8):
        a, b = i * 1.5 + 0.01, i * 1.5 + 1.49; j = RND().uniform(-0.04, 0.04); z = 0.02; cx, cy = (a + b) / 2, (y0 + y1) / 2
        plate('P', a, y0 + 0.01, b, y1 - 0.01, z, bev=0.008, jit=j)
        if i % 4 == 2:
            ring('M', cx, cy, 0.26, 0.33, 0.02, z, seg=32); cylz('K', cx, cy, 0.26, 0.002, z, seg=32)
        elif i % 4 == 0:
            for k in range(8): plate('K', a + 0.25, y0 + 0.26 + k * 0.13, b - 0.25, y0 + 0.31 + k * 0.13, 0.002, z, bev=0)
        else:
            for u in range(12):
                for v in range(12): cylz('K', a + 0.19 + u * 0.1, y0 + 0.2 + v * 0.1, 0.022, 0.002, z, seg=6)

def small():
    y0, y1 = ST['rib']
    plate('P', -1, y0, S + 1, y1, 0.012, bev=0)
    plate('P', -1, y0 + 0.2, S + 1, y1 - 0.2, 0.05, 0.0, bev=0.03, seg=3, jit=-0.03)
    plate('M2', -1, y0, S + 1, y0 + 0.07, 0.03, bev=0.008); plate('M2', -1, y1 - 0.07, S + 1, y1, 0.03, bev=0.008)
    for k in range(6):
        x = 1 + k * 2
        plate('P', x - 0.3, y0 + 0.1, x + 0.3, y1 - 0.1, 0.07, bev=0.012, jit=-0.07)
        for bx in (x - 0.2, x, x + 0.2):
            for by in (y0 + 0.17, y1 - 0.17): bolt(bx, by, 0.07, 0.016)
        plate('K', x + 0.6, y0 + 0.31, x + 1.4, y1 - 0.31, 0.002, 0.05, bev=0)
    y0, y1 = ST['shutter']
    plate('K', -1, y0, S + 1, y1, 0.004, bev=0)
    for k in range(6): bar('P', -1, y0 + 0.008 + k * 0.094, S + 1, y0 + 0.094 + k * 0.094, 0.03, jit=(k % 2) * 0.03 - 0.02)
    plate('M2', -1, y1 - 0.03, S + 1, y1, 0.045, bev=0.006)
    y0, y1 = ST['fabric']
    plate('F', -1, y0, S + 1, y1, 0.01, bev=0)
    for k in range(16): plate('K', k * 0.75 + 0.371, y0, k * 0.75 + 0.379, y1, 0.0105, bev=0)
    bar('F', -1, y0, S + 1, y0 + 0.03, 0.02, jit=-0.12); bar('F', -1, y1 - 0.03, S + 1, y1, 0.02, jit=-0.12)
    y0, y1 = ST['itrim']
    plate('P', -1, y0, S + 1, y1, 0.02, bev=0); plate('K', -1, y0 + 0.08, S + 1, y0 + 0.12, 0.0205, bev=0)
    for k in range(24): cylz('M', 0.25 + k * 0.5, y0 + 0.04, 0.012, 0.004, 0.02, seg=8); cylz('M', 0.25 + k * 0.5, y1 - 0.04, 0.012, 0.004, 0.02, seg=8)
    y0, y1 = ST['iplain']; plate('P', -1, y0, S + 1, y1, 0.006, bev=0)

def tiles():
    def T(name):
        x0, y0, _, _ = TL[name]
        return (lambda k, a, b, c, d, h, z=0.0, **kw: plate(k, x0 + a, y0 + b, x0 + c, y0 + d, h, z, **kw)), x0, y0
    Rr = RND()
    # Ladenregal: drei Böden mit Kisten, Dosen und Flaschen
    P, X, Y = T('shelf')
    P('P', 0.02, 0.02, 1.98, 1.98, 0.02, jit=-0.1); P('K', 0.1, 0.1, 1.9, 1.9, 0.002, 0.02, bev=0)
    for a, b, c, d in ((0.02, 0.02, 1.98, 0.1), (0.02, 1.9, 1.98, 1.98), (0.02, 0.02, 0.1, 1.98), (1.9, 0.02, 1.98, 1.98)): P('P', a, b, c, d, 0.07, bev=0.012, jit=-0.14)
    for r in range(3):
        sy = 0.66 + r * 0.6
        P('M2', 0.1, sy, 1.9, sy + 0.05, 0.06, 0.02, bev=0.006)
        x = 0.14
        while x < 1.75:
            w = Rr.choice((0.12, 0.16, 0.22, 0.3)); h = Rr.uniform(0.2, 0.46); k = Rr.choice(('Y', 'R', 'W', 'B', 'GN', 'M', 'P'))
            if x + w > 1.86: break
            P(k, x, sy - h, x + w, sy, 0.03 + Rr.uniform(0, 0.02), 0.022, bev=min(0.02, w * 0.3), seg=2, jit=Rr.uniform(-0.1, 0.1))
            if Rr.random() < 0.5: P('W', x + w * 0.2, sy - h * 0.6, x + w * 0.8, sy - h * 0.35, 0.002, 0.072, bev=0)
            x += w + Rr.uniform(0.015, 0.05)
    # Verkaufsautomat
    P, X, Y = T('vending')
    P('P', 0.03, 0.03, 1.97, 1.97, 0.04, bev=0.02, seg=3, jit=-0.05)
    P('K', 0.14, 0.16, 1.3, 1.5, 0.002, 0.04, bev=0)
    for r in range(4):
        P('M2', 0.14, 0.44 + r * 0.33, 1.3, 0.47 + r * 0.33, 0.03, 0.04, bev=0.004)
        for c in range(7): P(Rr.choice(('R', 'Y', 'B', 'GN', 'W')), 0.19 + c * 0.155, 0.2 + r * 0.33, 0.3 + c * 0.155, 0.44 + r * 0.33, 0.02, 0.042, bev=0.012, seg=2, jit=Rr.uniform(-0.1, 0.1))
    for a, b, c, d in ((0.1, 0.12, 1.34, 0.16), (0.1, 1.5, 1.34, 1.54), (0.1, 0.12, 0.14, 1.54), (1.3, 0.12, 1.34, 1.54)): P('M', a, b, c, d, 0.02, 0.04, bev=0.006)
    P('K', 0.2, 1.62, 1.24, 1.86, 0.004, 0.04, bev=0); P('M2', 0.24, 1.66, 1.2, 1.7, 0.02, 0.04, bev=0.006)
    P('K', 1.44, 0.2, 1.86, 0.62, 0.012, 0.04, bev=0.006); P('G', 1.48, 0.24, 1.82, 0.58, 0.003, 0.052, bev=0)
    for u in range(3):
        for v in range(4): cylz('K', X + 1.5 + u * 0.14, Y + 0.76 + v * 0.13, 0.045, 0.012, 0.04, seg=10, r2=0.036)
    P('K', 1.5, 1.34, 1.8, 1.39, 0.004, 0.04, bev=0); P('R', 1.44, 1.5, 1.86, 1.82, 0.004, 0.04, bev=0)
    # Auskunftsterminal
    P, X, Y = T('terminal')
    P('P', 0.03, 0.03, 1.97, 1.97, 0.04, bev=0.02, seg=3, jit=-0.1)
    P('K', 0.18, 0.16, 1.82, 1.16, 0.014, 0.04, bev=0.008); P('G', 0.24, 0.22, 1.76, 1.1, 0.003, 0.054, bev=0)
    P('M2', 0.3, 1.3, 1.3, 1.78, 0.012, 0.04, bev=0.006)
    for u in range(8):
        for v in range(3): P('K', 0.36 + u * 0.115, 1.36 + v * 0.13, 0.45 + u * 0.115, 1.46 + v * 0.13, 0.008, 0.052, bev=0.003)
    P('K', 1.44, 1.34, 1.78, 1.4, 0.004, 0.04, bev=0); cylz('GN', X + 1.5, Y + 1.56, 0.03, 0.01, 0.04, seg=10); cylz('R', X + 1.62, Y + 1.56, 0.03, 0.01, 0.04, seg=10)
    for u in range(6):
        for v in range(2): cylz('K', X + 1.46 + u * 0.06, Y + 1.7 + v * 0.06, 0.016, 0.002, 0.04, seg=6)
    # Spinde
    P, X, Y = T('locker')
    P('P', 0.02, 0.02, 1.98, 1.98, 0.02, jit=-0.08)
    for c in range(2):
        xa = 0.06 + c * 0.96
        P('P', xa, 0.06, xa + 0.92, 1.94, 0.03, 0.02, bev=0.014, jit=0.02 - c * 0.05)
        P('K', xa + 0.14, 0.2, xa + 0.78, 0.5, 0.002, 0.05, bev=0); louvres('M2', X + xa + 0.14, Y + 0.2, X + xa + 0.78, Y + 0.5, 5, 0.05)
        P('K', xa + 0.14, 1.5, xa + 0.78, 1.8, 0.002, 0.05, bev=0); louvres('M2', X + xa + 0.14, Y + 1.5, X + xa + 0.78, Y + 1.8, 5, 0.05)
        bar('M', X + xa + 0.74, Y + 0.9, X + xa + 0.8, Y + 1.15, 0.035, 0.05); P('W', xa + 0.3, 0.62, xa + 0.62, 0.76, 0.003, 0.05, bev=0)
        for by in (0.3, 1.7): bar('M', X + xa + 0.02, Y + by, X + xa + 0.1, Y + by + 0.16, 0.04, 0.05)
    # Schiebetür: zwei Flügel mit Sichtfenstern und Warnkante
    P, X, Y = T('sdoor')
    P('P', 0.02, 0.02, 1.98, 1.98, 0.02, jit=-0.12)
    for c in range(2):
        xa = 0.05 + c * 0.955
        P('P', xa, 0.05, xa + 0.945, 1.98, 0.035, 0.02, bev=0.016, jit=0.03)
        P('M', xa + 0.2, 0.3, xa + 0.745, 0.8, 0.014, 0.055, bev=0.006); P('G', xa + 0.25, 0.35, xa + 0.695, 0.75, 0.004, 0.069, bev=0)
        P('P', xa + 0.1, 0.95, xa + 0.845, 1.5, 0.01, 0.055, bev=0.008, jit=-0.03)
        for k in range(5): P('Y' if k % 2 == 0 else 'K', xa + 0.02 + k * 0.181, 1.84, xa + 0.2 + k * 0.181, 1.95, 0.003, 0.055, bev=0)
        bar('M', X + xa + (0.85 if c == 0 else 0.04), Y + 0.9, X + xa + (0.9 if c == 0 else 0.09), Y + 1.25, 0.03, 0.055)
    P('K', 0.994, 0.05, 1.006, 1.98, 0.056, 0.0, bev=0)
    # Wandausstattung: Lautsprecher, Feuerlöscher, Steckdosen, Hinweis
    P, X, Y = T('utility')
    P('P', 0.02, 0.02, 1.98, 1.98, 0.02, jit=0.0)
    P('P', 0.12, 0.14, 0.92, 0.94, 0.03, 0.02, bev=0.014, jit=-0.1)
    for u in range(9):
        for v in range(9): cylz('K', X + 0.2 + u * 0.08, Y + 0.22 + v * 0.08, 0.022, 0.002, 0.05, seg=6)
    P('R', 1.14, 0.14, 1.84, 1.2, 0.07, 0.02, bev=0.02, seg=3); P('G', 1.24, 0.26, 1.74, 0.8, 0.004, 0.09, bev=0); P('W', 1.26, 0.9, 1.72, 1.08, 0.003, 0.09, bev=0)
    bar('M', X + 1.7, Y + 0.5, X + 1.76, Y + 0.7, 0.03, 0.09)
    P('P', 0.12, 1.14, 0.92, 1.84, 0.02, 0.02, bev=0.01, jit=-0.06)
    for u in range(3): P('K', 0.2 + u * 0.24, 1.26, 0.36 + u * 0.24, 1.42, 0.004, 0.04, bev=0); cylz('GN', X + 0.28 + u * 0.24, Y + 1.56, 0.02, 0.008, 0.04, seg=8)
    P('W', 0.2, 1.64, 0.84, 1.76, 0.003, 0.04, bev=0)
    P('Y', 1.14, 1.34, 1.84, 1.84, 0.004, 0.02, bev=0); P('K', 1.3, 1.5, 1.68, 1.68, 0.002, 0.024, bev=0)

tb['BUILDERS'][:] = [iwall, iwall2, ifloor, iceil, small, tiles]
build, render, compose = tb['build'], tb['render'], tb['compose']
