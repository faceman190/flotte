# Texturblatt (Trim Sheet) des Baukastens für Letzte Crew. Läuft in Blender (Trimsheet.blend, Textblock trim_build).
# Ablauf: build() baut alle Details als echte Geometrie auf einer 12 × 12 m großen Fläche (Paneele, Schrauben, Lamellen, Gitter …),
# render() fotografiert sie senkrecht von oben in fünf Durchgängen (Farbe, Materialwerte, Relief, Höhe, Verdeckung),
# compose() rechnet daraus drei Bilder: Farbe mit Abnutzung und Schmutz, Relief (Normal-Map, OpenGL) und ORM (Verdeckung, Rauheit, Metall).
# Maße: 12 m = 2048 px (rund 170 px je Meter). Koordinaten: x nach rechts, yt = Abstand von der Oberkante (beides in Metern).
# Streifen kacheln waagrecht (alles ist über die 12 m periodisch), Kacheln unten sind Einzelmotive.
import bpy, bmesh, math, random, os, json
import numpy as np
from mathutils import Matrix

S, N, HK = 12.0, 2048, 10.0
ROOT = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte'
OUT = os.path.join(ROOT, 'asset-src', 'tex')
HERE = os.path.join(ROOT, 'asset-src', 'neu', 'baukasten')
TMP = os.path.join(HERE, '_tmp')

STRIPS = {  # Name: (yt oben, yt unten)
    'wall_a': (0.0, 3.0), 'wall_b': (3.0, 5.0), 'roof': (5.0, 6.5), 'floor': (6.5, 7.5),
    'beam': (7.5, 8.0), 'girder': (8.0, 8.5), 'hazard': (8.5, 8.9), 'pipe': (8.9, 9.3),
    'edge': (9.3, 9.5), 'hose': (9.5, 9.7), 'plain': (9.7, 10.0),
}
TILES = {  # Name: (x links, yt oben, x rechts, yt unten)
    'vent': (0, 10, 2, 12), 'fan': (2, 10, 4, 12), 'hatch': (4, 10, 6, 12),
    'ctrl': (6, 10, 8, 12), 'crate': (8, 10, 10, 12), 'door': (10, 10, 12, 12),
}
# Lackfarben (linear) und Materialwerte (Metall, Rauheit, Abnutzung an Kanten)
PAINT = {'P': (0.8, 0.8, 0.8), 'D': (0.09, 0.09, 0.1), 'M': (0.5, 0.51, 0.53), 'M2': (0.26, 0.27, 0.29), 'K': (0.03, 0.03, 0.033),
         'Y': (0.8, 0.5, 0.04), 'R': (0.5, 0.06, 0.04), 'W': (0.85, 0.85, 0.85), 'G': (0.015, 0.03, 0.05)}
PRM = {'P': (0, 0.55, 1), 'D': (0, 0.75, 0.2), 'M': (1, 0.36, 0), 'M2': (1, 0.5, 0), 'K': (0, 0.85, 0),
       'Y': (0, 0.5, 1), 'R': (0, 0.5, 1), 'W': (0, 0.5, 1), 'G': (0, 0.1, 0)}
R = random.Random(7)
G = {}

def grp(k, jit=0.0):
    key = (k, round(jit, 2))
    if key not in G: G[key] = bmesh.new()
    return G[key]

def box_m(k, M, bev=0.0, seg=2, jit=0.0):
    bm = grp(k, jit)
    r = bmesh.ops.create_cube(bm, size=1.0, matrix=M)
    if bev > 0:
        es = list({e for v in r['verts'] for e in v.link_edges})
        bmesh.ops.bevel(bm, geom=es, offset=bev, offset_type='OFFSET', segments=seg, profile=0.5, affect='EDGES')

def plate(k, x0, y0, x1, y1, h, z=0.0, bev=0.012, seg=2, jit=0.0, rot=None):
    w, d = abs(x1 - x0), abs(y1 - y0)
    M = Matrix.Translation(((x0 + x1) / 2, S - (y0 + y1) / 2, z + h / 2)) @ (rot or Matrix.Identity(4)) @ Matrix.Diagonal((w, d, h, 1))
    box_m(k, M, min(bev, h * 0.8, w * 0.45, d * 0.45), seg, jit)

def bar(k, x0, y0, x1, y1, h, z=0.0, jit=0.0):
    plate(k, x0, y0, x1, y1, h, z, bev=min(abs(x1 - x0), abs(y1 - y0), h * 2) * 0.42, seg=3, jit=jit)

def cylz(k, x, y, r, h, z=0.0, seg=16, r2=None, jit=0.0):
    bmesh.ops.create_cone(grp(k, jit), cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h,
                          matrix=Matrix.Translation((x, S - y, z + h / 2)))

def bolt(x, y, z=0.03, r=0.022):
    cylz('M', x, y, r, 0.012, z, seg=6, r2=r * 0.72)

def ring(k, x, y, ri, ro, h, z=0.0, seg=40, jit=0.0):
    bm = grp(k, jit); cy = S - y; b = min(h, (ro - ri) * 0.3)
    prof = ((ro, z), (ro - b, z + h), (ri + b, z + h), (ri, z))
    vs = [[bm.verts.new((x + math.cos(i / seg * math.tau) * r, cy + math.sin(i / seg * math.tau) * r, zz)) for r, zz in prof] for i in range(seg)]
    for i in range(seg):
        a, c = vs[i], vs[(i + 1) % seg]
        for j in range(3): bm.faces.new((a[j], c[j], c[j + 1], a[j + 1]))

def louvres(k, x0, y0, x1, y1, n, z=0.03, tilt=38):
    dy = (y1 - y0) / n
    for i in range(n):
        yc = y0 + (i + 0.5) * dy
        plate(k, x0, yc - dy * 0.46, x1, yc + dy * 0.46, 0.01, z + dy * 0.25, bev=0.003, seg=1, rot=Matrix.Rotation(math.radians(tilt), 4, 'X'))

# ------------------------------------------------------------------ Streifen
def wall_a():
    y0, y1 = STRIPS['wall_a']
    plate('D', -1, y0, S + 1, y1, 0.004, bev=0)
    x = 0.0
    for i, w in enumerate([3, 2, 1, 3, 2, 1]):
        j = R.uniform(-0.06, 0.05); a, b = x + 0.02, x + w - 0.02; z = 0.03
        plate('P', a, y0 + 0.025, b, y1 - 0.025, z, jit=j)
        if i == 0:      # aufgesetzte Platte, Wartungsklappe, Schürze mit Schlitzen
            plate('P', a + 0.22, 0.25, b - 0.22, 1.85, 0.018, z, bev=0.01, jit=j + 0.03)
            for bx in (a + 0.32, b - 0.32):
                for by in (0.35, 1.05, 1.75): bolt(bx, by, z + 0.018)
            plate('P', a + 1.0, 0.6, a + 1.9, 1.3, 0.014, z + 0.018, bev=0.008, jit=j - 0.05)
            for bx in (a + 1.07, a + 1.83):
                for by in (0.67, 1.23): bolt(bx, by, z + 0.032, 0.016)
            bar('M', a + 1.3, 0.9, a + 1.6, 0.96, 0.02, z + 0.032)
            plate('P', a + 0.22, 2.0, b - 0.22, 2.75, 0.012, z, bev=0.008, jit=j - 0.03)
            for k in range(8): plate('K', a + 0.5 + k * 0.26, 2.2, a + 0.62 + k * 0.26, 2.6, 0.003, z + 0.012, bev=0)
        elif i == 3:    # vier Teilplatten mit Schrauben, Nietleiste
            for xa, xb in ((a + 0.12, x + 1.47), (x + 1.53, b - 0.12)):
                for ya, yb in ((0.15, 1.45), (1.55, 2.85)):
                    plate('P', xa, ya, xb, yb, 0.014, z, bev=0.008, jit=j + R.uniform(-0.04, 0.04))
                    for bx in (xa + 0.08, xb - 0.08):
                        for by in (ya + 0.08, yb - 0.08): bolt(bx, by, z + 0.014, 0.018)
            plate('Y', x + 0.35, 0.5, x + 1.2, 0.62, 0.003, z + 0.014, bev=0)
        elif i == 1:    # Rippen unten, Lüftungsgitter oben
            for k in range(5): bar('P', a + 0.2 + k * 0.36, 1.5, a + 0.34 + k * 0.36, 2.8, 0.03, z, jit=j - 0.02)
            for fx0, fy0, fx1, fy1 in ((a + 0.25, 0.25, b - 0.25, 0.33), (a + 0.25, 1.07, b - 0.25, 1.15), (a + 0.25, 0.25, a + 0.33, 1.15), (b - 0.33, 0.25, b - 0.25, 1.15)):
                plate('P', fx0, fy0, fx1, fy1, 0.03, z, bev=0.008, jit=j - 0.06)
            plate('K', a + 0.33, 0.33, b - 0.33, 1.07, 0.002, z, bev=0)
            louvres('M2', a + 0.33, 0.33, b - 0.33, 1.07, 8, z)
            for bx in (a + 0.29, b - 0.29):
                for by in (0.29, 1.11): bolt(bx, by, z + 0.03, 0.014)
        elif i == 4:    # glatte Platte mit zwei Querholmen und Schild
            for by in (0.55, 2.35): bar('P', a + 0.12, by, b - 0.12, by + 0.14, 0.035, z, jit=j - 0.05)
            plate('P', a + 0.3, 0.95, b - 0.3, 2.1, 0.012, z, bev=0.008, jit=j + 0.04)
            plate('W', a + 0.55, 1.2, a + 1.25, 1.45, 0.003, z + 0.012, bev=0)
            plate('R', a + 0.55, 1.5, a + 1.25, 1.56, 0.003, z + 0.012, bev=0)
            for bx in (a + 0.38, b - 0.38):
                for by in (1.03, 2.02): bolt(bx, by, z + 0.012, 0.016)
        elif i == 2:    # Kabelkanal mit Schellen und Verteilerkasten
            bar('M', x + 0.42, y0 - 0.2, x + 0.58, y1 + 0.2, 0.06, z)
            for by in (0.4, 2.3): plate('M2', x + 0.36, by, x + 0.64, by + 0.08, 0.07, z, bev=0.01)
            plate('P', x + 0.22, 1.1, x + 0.78, 1.8, 0.08, z, bev=0.018, jit=j - 0.1)
            for bx in (x + 0.28, x + 0.72):
                for by in (1.16, 1.74): bolt(bx, by, z + 0.08, 0.014)
            cylz('R', x + 0.5, 1.3, 0.035, 0.012, z + 0.08, seg=12)
            plate('K', x + 0.34, 1.45, x + 0.66, 1.66, 0.004, z + 0.08, bev=0)
        else:           # Steigleiter
            for rx in (x + 0.3, x + 0.7): bar('M', rx - 0.025, 0.1, rx + 0.025, 2.9, 0.05, z + 0.02)
            for k in range(9): bar('M', x + 0.3, 0.25 + k * 0.31, x + 0.7, 0.29 + k * 0.31, 0.035, z + 0.02)
            for by in (0.15, 1.5, 2.85): plate('M2', x + 0.24, by - 0.04, x + 0.76, by + 0.04, 0.02, z, bev=0.005)
        x += w

def wall_b():
    y0, y1 = STRIPS['wall_b']
    plate('D', -1, y0, S + 1, y1, 0.004, bev=0)
    for i in range(3):
        a, b = i * 4 + 0.02, i * 4 + 3.98; j = R.uniform(-0.05, 0.05); z = 0.025
        plate('P', a, y0 + 0.025, b, y1 - 0.025, z, jit=j)
        rows = range(4) if i != 1 else range(2)
        for k in rows: plate('P', a + 0.16, y0 + 0.14 + k * 0.45, b - 0.16, y0 + 0.14 + k * 0.45 + 0.37, 0.022, z, bev=0.014, seg=3, jit=j + R.uniform(-0.03, 0.03))
        if i == 1:
            plate('P', a + 0.16, y0 + 1.08, b - 0.16, y0 + 1.86, 0.012, z, bev=0.008, jit=j + 0.04)
            for k in range(13): bolt(a + 0.3 + k * 0.28, y0 + 1.16, z + 0.012, 0.014); bolt(a + 0.3 + k * 0.28, y0 + 1.78, z + 0.012, 0.014)
            bar('M', a + 0.5, y0 + 1.42, b - 0.5, y0 + 1.5, 0.03, z + 0.012)
        for k in range(5):
            for bx in (a + 0.075, b - 0.075): bolt(bx, y0 + 0.2 + k * 0.4, z, 0.018)

def roof():
    y0, y1 = STRIPS['roof']
    plate('D', -1, y0, S + 1, y1, 0.004, bev=0)
    for k in range(-1, 12):
        plate('P', k + 0.54, y0 + 0.02, k + 1.46, y1 - 0.02, 0.02, bev=0.008, jit=R.uniform(-0.05, 0.05))
        bar('P', k + 0.46, y0 - 0.2, k + 0.54, y1 + 0.2, 0.05, jit=-0.06)
        for by in (y0 + 0.1, y0 + 0.75, y1 - 0.1):
            bolt(k + 0.62, by, 0.02, 0.016); bolt(k + 1.38, by, 0.02, 0.016)

def floor():
    y0, y1 = STRIPS['floor']
    plate('K', -1, y0, S + 1, y1, 0.003, bev=0)
    plate('M2', -1, y0, S + 1, y0 + 0.06, 0.035, bev=0.008); plate('M2', -1, y1 - 0.06, S + 1, y1, 0.035, bev=0.008)
    for k in range(14): plate('M2', -1, y0 + 0.078 + k * 0.0615, S + 1, y0 + 0.108 + k * 0.0615, 0.028, bev=0.006, seg=1)
    for k in range(24): plate('M2', 0.25 + k * 0.5 - 0.012, y0 + 0.06, 0.25 + k * 0.5 + 0.012, y1 - 0.06, 0.02, bev=0)

def beam():
    y0, y1 = STRIPS['beam']
    plate('P', -1, y0, S + 1, y1, 0.008, bev=0)
    plate('P', -1, y0, S + 1, y0 + 0.085, 0.04, bev=0.012, jit=-0.03); plate('P', -1, y1 - 0.085, S + 1, y1, 0.04, bev=0.012, jit=-0.03)
    for k in range(6):
        x = 1 + k * 2
        plate('P', x - 0.02, y0 + 0.085, x + 0.02, y1 - 0.085, 0.035, bev=0.006, jit=-0.04)
        plate('P', x + 0.3, y0 + 0.15, x + 0.75, y1 - 0.15, 0.012, 0.008, bev=0.005, jit=0.03)
        for bx in (x + 0.37, x + 0.525, x + 0.68):
            for by in (y0 + 0.2, y1 - 0.2): bolt(bx, by, 0.02, 0.016)

def girder():
    y0, y1 = STRIPS['girder']
    plate('P', -1, y0 + 0.01, S + 1, y1 - 0.01, 0.02, bev=0.008)
    for k in range(24):
        x = 0.25 + k * 0.5
        ring('P', x, y0 + 0.25, 0.11, 0.145, 0.012, 0.02, seg=28, jit=-0.04); cylz('K', x, y0 + 0.25, 0.11, 0.002, 0.02, seg=28)
    for k in range(96):
        for by in (y0 + 0.055, y1 - 0.055): cylz('M', 0.0625 + k * 0.125, by, 0.012, 0.007, 0.02, seg=8, r2=0.007)

def small_strips():
    y0, y1 = STRIPS['hazard']; plate('P', -1, y0 + 0.015, S + 1, y1 - 0.015, 0.012, bev=0.006)
    y0, y1 = STRIPS['pipe']; plate('P', -1, y0, S + 1, y1, 0.005, bev=0)
    for k in range(6):
        x = 1 + k * 2
        plate('P', x - 0.07, y0, x + 0.07, y1, 0.03, 0.005, bev=0.01, jit=-0.05)
        for q in range(5): bolt(x, y0 + 0.04 + q * 0.08, 0.035, 0.016)
        for wx in (x - 1, ): plate('P', wx - 0.015, y0, wx + 0.015, y1, 0.005, 0.005, bev=0.002, seg=1)
    plate('P', S - 0.015, y0, S + 0.015, y1, 0.005, 0.005, bev=0.002, seg=1)
    y0, y1 = STRIPS['edge']; plate('P', -1, y0, S + 1, y1, 0.006, bev=0)
    y0, y1 = STRIPS['hose']; plate('K', -1, y0, S + 1, y1, 0.003, bev=0)
    for k in range(240): plate('K', k * 0.05 + 0.006, y0 - 0.05, k * 0.05 + 0.044, y1 + 0.05, 0.014, bev=0.012, seg=2)
    y0, y1 = STRIPS['plain']; plate('P', -1, y0, S + 1, y1, 0.006, bev=0)
    for x in (1.5, 4.5, 7.5, 10.5): plate('D', x - 0.006, y0, x + 0.006, y1, 0.0065, bev=0)

# ------------------------------------------------------------------ Kacheln (je 2 × 2 m)
def tiles():
    def T(name):
        x0, y0, _, _ = TILES[name]
        return (lambda k, a, b, c, d, h, z=0.0, **kw: plate(k, x0 + a, y0 + b, x0 + c, y0 + d, h, z, **kw)), x0, y0
    # Lüftungsgitter
    P, X, Y = T('vent'); j = -0.03
    P('P', 0.03, 0.03, 1.97, 1.97, 0.03, jit=j)
    for a, b, c, d in ((0.2, 0.2, 1.8, 0.32), (0.2, 1.68, 1.8, 1.8), (0.2, 0.2, 0.32, 1.8), (1.68, 0.2, 1.8, 1.8), (0.96, 0.32, 1.04, 1.68)):
        P('P', a, b, c, d, 0.035, 0.03, bev=0.01, jit=j - 0.06)
    P('K', 0.32, 0.32, 1.68, 1.68, 0.002, 0.03, bev=0)
    louvres('M2', X + 0.32, Y + 0.32, X + 0.96, Y + 1.68, 11, 0.03); louvres('M2', X + 1.04, Y + 0.32, X + 1.68, Y + 1.68, 11, 0.03)
    for bx in (0.26, 1.0, 1.74):
        for by in (0.26, 1.74): bolt(X + bx, Y + by, 0.065, 0.02)
    for bx, by in ((0.1, 0.1), (1.9, 0.1), (0.1, 1.9), (1.9, 1.9)): bolt(X + bx, Y + by, 0.03)
    # Ventilator
    P, X, Y = T('fan'); j = 0.02
    P('P', 0.03, 0.03, 1.97, 1.97, 0.03, jit=j)
    ring('P', X + 1, Y + 1, 0.74, 0.86, 0.05, 0.03, seg=48, jit=j - 0.07); cylz('K', X + 1, Y + 1, 0.74, 0.002, 0.03, seg=48)
    for i in range(7):
        M = Matrix.Translation((X + 1, S - (Y + 1), 0.055)) @ Matrix.Rotation(i / 7 * math.tau, 4, 'Z') @ Matrix.Translation((0.42, 0, 0)) @ Matrix.Rotation(math.radians(28), 4, 'X') @ Matrix.Diagonal((0.56, 0.24, 0.012, 1))
        box_m('M2', M, 0.004, 1)
    cylz('M', X + 1, Y + 1, 0.15, 0.06, 0.03, seg=20, r2=0.11)
    for r in (0.3, 0.5, 0.7): ring('M', X + 1, Y + 1, r - 0.009, r + 0.009, 0.012, 0.08, seg=48)
    for i in range(4):
        M = Matrix.Translation((X + 1, S - (Y + 1), 0.086)) @ Matrix.Rotation(i / 4 * math.pi + 0.4, 4, 'Z') @ Matrix.Diagonal((1.5, 0.018, 0.012, 1))
        box_m('M', M)
    for bx, by in ((0.12, 0.12), (1.88, 0.12), (0.12, 1.88), (1.88, 1.88)): bolt(X + bx, Y + by, 0.03, 0.028)
    P('Y', 0.12, 1.62, 0.5, 1.74, 0.003, 0.03, bev=0)
    # Wartungsluke
    P, X, Y = T('hatch'); j = -0.02
    P('P', 0.03, 0.03, 1.97, 1.97, 0.03, jit=j)
    P('P', 0.2, 0.15, 1.8, 1.85, 0.03, 0.03, bev=0.02, seg=3, jit=j - 0.05)
    P('P', 0.35, 0.95, 1.65, 1.7, 0.012, 0.06, bev=0.008, jit=j + 0.02)
    P('M', 0.58, 0.3, 1.42, 0.74, 0.02, 0.06, bev=0.008); P('G', 0.65, 0.37, 1.35, 0.67, 0.004, 0.08, bev=0)
    for by in (0.4, 1.4): bar('M', X + 0.1, Y + by, X + 0.26, Y + by + 0.22, 0.06, 0.03)
    bar('M', X + 1.55, Y + 0.95, X + 1.63, Y + 1.35, 0.045, 0.06)
    for k in range(6):
        for bx in (0.27, 1.73): bolt(X + bx, Y + 0.25 + k * 0.3, 0.06, 0.018)
    for k in range(4):
        for by in (0.21, 1.79): bolt(X + 0.55 + k * 0.3, Y + by, 0.06, 0.018)
    P('R', 0.45, 1.1, 0.95, 1.24, 0.003, 0.072, bev=0)
    # Schaltschrank
    P, X, Y = T('ctrl'); j = 0.0
    P('P', 0.03, 0.03, 1.97, 1.97, 0.03, jit=j)
    P('P', 0.15, 0.15, 1.85, 1.85, 0.06, 0.03, bev=0.02, seg=3, jit=j - 0.09)
    P('K', 0.3, 0.3, 1.2, 0.95, 0.012, 0.09, bev=0.006); P('G', 0.35, 0.35, 1.15, 0.9, 0.003, 0.102, bev=0)
    for i in range(3):
        for q in range(4): cylz('K', X + 1.38 + i * 0.13, Y + 0.36 + q * 0.13, 0.04, 0.012, 0.09, seg=12, r2=0.032)
    for i, c in enumerate(('R', 'Y', 'W')): cylz(c, X + 1.38 + i * 0.13, Y + 0.92, 0.03, 0.012, 0.09, seg=12)
    for k in range(10): bar('M2', X + 0.3 + k * 0.09, Y + 1.1, X + 0.35 + k * 0.09, Y + 1.7, 0.035, 0.09)
    cylz('K', X + 1.5, Y + 1.42, 0.11, 0.04, 0.09, seg=20, r2=0.09); ring('M', X + 1.5, Y + 1.42, 0.11, 0.14, 0.015, 0.09, seg=24)
    for bx, by in ((0.22, 0.22), (1.78, 0.22), (0.22, 1.78), (1.78, 1.78)): bolt(X + bx, Y + by, 0.09, 0.02)
    # Kistenseite
    P, X, Y = T('crate'); j = 0.0
    P('P', 0.02, 0.02, 1.98, 1.98, 0.02, jit=j)
    for a, b, c, d in ((0.02, 0.02, 1.98, 0.17), (0.02, 1.83, 1.98, 1.98), (0.02, 0.02, 0.17, 1.98), (1.83, 0.02, 1.98, 1.98)):
        P('P', a, b, c, d, 0.05, 0.0, bev=0.014, jit=j - 0.07)
    for k in range(6): bar('P', X + 0.24, Y + 0.26 + k * 0.265, X + 1.76, Y + 0.38 + k * 0.265, 0.03, 0.02, jit=j - 0.02)
    for cx, cy in ((0.02, 0.02), (1.68, 0.02), (0.02, 1.68), (1.68, 1.68)):
        P('M', cx, cy, cx + 0.3, cy + 0.3, 0.062, 0.0, bev=0.012)
        for bx, by in ((0.08, 0.08), (0.22, 0.08), (0.08, 0.22), (0.22, 0.22)): bolt(X + cx + bx, Y + cy + by, 0.062, 0.016)
    P('K', 0.75, 0.9, 1.25, 1.1, 0.002, 0.05, bev=0); bar('M', X + 0.8, Y + 0.97, X + 1.2, Y + 1.03, 0.03, 0.05)
    P('W', 1.3, 1.5, 1.72, 1.74, 0.004, 0.05, bev=0)
    # Tür
    P, X, Y = T('door'); j = -0.02
    P('P', 0.02, 0.02, 1.98, 1.98, 0.02, jit=j)
    for a, b, c, d in ((0.24, 0.02, 0.37, 1.98), (1.63, 0.02, 1.76, 1.98), (0.24, 0.02, 1.76, 0.15)):
        P('P', a, b, c, d, 0.07, 0.0, bev=0.016, jit=j - 0.1)
    P('P', 0.37, 0.15, 1.63, 1.98, 0.03, 0.02, bev=0.014, jit=j + 0.04)
    P('M', 0.72, 0.38, 1.28, 0.8, 0.014, 0.05, bev=0.006); P('G', 0.77, 0.43, 1.23, 0.75, 0.004, 0.064, bev=0)
    P('M2', 0.42, 1.62, 1.58, 1.93, 0.008, 0.05, bev=0.004)
    for k in range(9):
        for q in range(2): cylz('M2', X + 0.5 + k * 0.125, Y + 1.7 + q * 0.14, 0.02, 0.006, 0.058, seg=8, r2=0.012)
    bar('M', X + 1.45, Y + 0.95, X + 1.52, Y + 1.25, 0.045, 0.05)
    P('P', 0.47, 0.95, 1.38, 1.5, 0.008, 0.05, bev=0.005, jit=j)
    P('K', 1.8, 0.9, 1.93, 1.15, 0.03, 0.02, bev=0.008); cylz('R', X + 1.865, Y + 0.96, 0.02, 0.006, 0.05, seg=10)
    for by in (0.3, 1.0, 1.7): bolt(X + 0.305, Y + by, 0.07, 0.016); bolt(X + 1.695, Y + by, 0.07, 0.016)

# ------------------------------------------------------------------ Szene
def build():
    global R
    R = random.Random(7); G.clear()
    sc = bpy.context.scene
    for o in list(sc.objects): bpy.data.objects.remove(o, do_unlink=True)
    wall_a(); wall_b(); roof(); floor(); beam(); girder(); small_strips(); tiles()
    n = 0
    for (k, jit), bm in G.items():
        me = bpy.data.meshes.new(f'hp_{k}_{jit}'); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(me.name, me); sc.collection.objects.link(o)
        o['k'] = k; o['jit'] = jit; n += len(me.polygons)
    G.clear()
    cd = bpy.data.cameras.new('Kamera'); cd.type = 'ORTHO'; cd.ortho_scale = S; cd.clip_end = 20
    cam = bpy.data.objects.new('Kamera', cd); cam.location = (S / 2, S / 2, 5); sc.collection.objects.link(cam); sc.camera = cam
    os.makedirs(TMP, exist_ok=True)
    json.dump({'size_m': S, 'px': N, 'strips': STRIPS, 'tiles': TILES}, open(os.path.join(HERE, 'kit_atlas.json'), 'w'), indent=1)
    return n

def _mat(name, kind):
    m = bpy.data.materials.get(name)
    if m: bpy.data.materials.remove(m)
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); em = nt.nodes.new('ShaderNodeEmission'); nt.links.new(em.outputs[0], out.inputs[0])
    if kind == 'col':
        n = nt.nodes.new('ShaderNodeObjectInfo'); nt.links.new(n.outputs['Color'], em.inputs['Color'])
    elif kind == 'nrm':
        g = nt.nodes.new('ShaderNodeNewGeometry'); v = nt.nodes.new('ShaderNodeVectorMath'); v.operation = 'MULTIPLY_ADD'
        v.inputs[1].default_value = (0.5, 0.5, 0.5); v.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(g.outputs['Normal'], v.inputs[0]); nt.links.new(v.outputs[0], em.inputs['Color'])
    elif kind == 'hgt':
        g = nt.nodes.new('ShaderNodeNewGeometry'); s = nt.nodes.new('ShaderNodeSeparateXYZ'); mm = nt.nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'
        mm.inputs[1].default_value = HK
        nt.links.new(g.outputs['Position'], s.inputs[0]); nt.links.new(s.outputs['Z'], mm.inputs[0]); nt.links.new(mm.outputs[0], em.inputs['Color'])
    elif kind == 'ao':
        a = nt.nodes.new('ShaderNodeAmbientOcclusion'); a.samples = 16; a.inputs['Distance'].default_value = 0.14
        nt.links.new(a.outputs['AO'], em.inputs['Color'])
    return m

def render():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 0; sc.render.film_transparent = False
    sc.render.resolution_x = sc.render.resolution_y = N; sc.render.resolution_percentage = 100
    w = sc.world or bpy.data.worlds.new('W'); sc.world = w; w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.0
    im = sc.render.image_settings; im.file_format = 'OPEN_EXR'; im.color_mode = 'RGB'; im.color_depth = '32'
    vl = sc.view_layers[0]; res = {}
    def go(name, mat, samples):
        vl.material_override = mat; sc.cycles.samples = samples
        p = os.path.join(TMP, 'trim_' + name + '.exr'); sc.render.filepath = p
        bpy.ops.render.render(write_still=True)
        img = bpy.data.images.load(p, check_existing=False)
        a = np.empty(N * N * 4, np.float32); img.pixels.foreach_get(a); bpy.data.images.remove(img)
        np.save(os.path.join(TMP, 'trim_' + name + '.npy'), a.reshape(N, N, 4)[..., :3].copy())
        res[name] = float(a.mean())
    mc = _mat('pass_col', 'col')
    for o in sc.objects:
        if o.type == 'MESH': c = PAINT[o['k']]; f = 1 + o['jit']; o.color = (c[0] * f, c[1] * f, c[2] * f, 1)
    go('col', mc, 12)
    for o in sc.objects:
        if o.type == 'MESH': o.color = (*PRM[o['k']], 1)
    go('prm', mc, 12)
    go('nrm', _mat('pass_nrm', 'nrm'), 12)
    go('hgt', _mat('pass_hgt', 'hgt'), 12)
    go('ao', _mat('pass_ao', 'ao'), 48)
    vl.material_override = None
    return res

# ------------------------------------------------------------------ Bilder berechnen
def _fx(): return np.fft.rfftfreq(N)[None, :].astype(np.float32)
def _fy(): return np.fft.fftfreq(N)[:, None].astype(np.float32)
def noise(beta, seed, ax=1.0, ay=1.0):
    w = np.random.default_rng(seed).standard_normal((N, N)).astype(np.float32)
    k = np.sqrt((_fx() * ax) ** 2 + (_fy() * ay) ** 2); k[0, 0] = 1
    F = np.fft.rfft2(w) * k ** (-beta); F[0, 0] = 0
    n = np.fft.irfft2(F, s=(N, N)).astype(np.float32)
    return np.clip(n / (n.std() * 2.6) * 0.5 + 0.5, 0, 1)
def blur(a, sig, sy=None):
    sy = sig if sy is None else sy
    g = np.exp(-2 * math.pi ** 2 * ((_fx() * sig) ** 2 + (_fy() * sy) ** 2))
    if a.ndim == 3: return np.stack([blur(a[..., c], sig, sy) for c in range(a.shape[2])], -1)
    return np.fft.irfft2(np.fft.rfft2(a) * g, s=(N, N)).astype(np.float32)
def sstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def rows(y0, y1):   # Zeilenbereich (Bild von unten nach oben) zu yt oben / unten
    return int(round((S - y1) / S * N)), int(round((S - y0) / S * N))
def srgb(v):
    v = np.clip(v, 0, 1); return np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(np.maximum(v, 1e-8), 1 / 2.4) - 0.055)

def compose(preview=True):
    L = lambda n: np.load(os.path.join(TMP, 'trim_' + n + '.npy'))
    col, prm, nrm, hgt, ao = L('col'), L('prm'), L('nrm'), L('hgt')[..., 0] / HK, np.clip(L('ao')[..., 0], 0, 1)
    px = S / N
    X = (np.arange(N, dtype=np.float32)[None, :] + 0.5) * px; Y = (np.arange(N, dtype=np.float32)[:, None] + 0.5) * px
    metal, rough, wear = prm[..., 0].copy(), prm[..., 1].copy(), prm[..., 2].copy()
    # Warnstreifen: gelb/schwarz schräg
    r0, r1 = rows(*STRIPS['hazard'])
    hz = (((X + Y) % 0.5) < 0.25)[r0:r1]
    col[r0:r1] = np.where(hz[..., None], np.array(PAINT['Y'], np.float32), np.array((0.035, 0.035, 0.04), np.float32)) * (col[r0:r1].mean(-1, keepdims=True) / 0.8)
    # Rauschen in mehreren Größen (kachelt)
    n_lo, n_mid, n_fine, n_hi = noise(2.2, 1), noise(1.6, 2), noise(0.9, 3), noise(0.3, 4)
    n_str = noise(1.4, 5, ax=6.0, ay=0.35)      # senkrechte Schlieren
    # Krümmung aus dem Relief: nach außen gewölbte Kanten (Abnutzung) und Kehlen (Schmutz)
    nx, ny = nrm[..., 0] * 2 - 1, nrm[..., 1] * 2 - 1
    div = (np.roll(nx, -1, 1) - np.roll(nx, 1, 1)) * 0.5 + (np.roll(ny, -1, 0) - np.roll(ny, 1, 0)) * 0.5
    cvx = blur(np.maximum(div, 0), 1.3); cvx /= max(np.percentile(cvx, 99.3), 1e-6)
    ccv = blur(np.maximum(-div, 0), 2.2); ccv /= max(np.percentile(ccv, 99.3), 1e-6)
    # Lack platzt an Kanten ab; zusätzlich einzelne Macken in der Fläche
    e0, e1 = rows(*STRIPS['edge'])
    ec = np.zeros((N, 1), np.float32); ec[e0:e1, 0] = np.exp(-(((np.arange(e0, e1) + 0.5 - (e0 + e1) / 2) / ((e1 - e0) * 0.2)) ** 2))
    drive = np.clip(cvx, 0, 1.4) * 1.1 + ec * 0.9
    chip = sstep(0.6, 0.78, drive + (n_mid - 0.5) * 0.9 + (n_fine - 0.5) * 0.7) * wear
    chip = np.maximum(chip, sstep(0.93, 0.99, n_mid * 0.6 + n_fine * 0.5 + n_hi * 0.15) * wear * 0.8)
    core = sstep(0.55, 0.9, blur(chip, 1.0)) * chip     # blankes Metall in der Mitte, Grundierung am Rand
    # Kratzer
    sc_ = np.zeros((N, N), np.float32); rg = np.random.default_rng(11)
    for _ in range(200):
        x, y, a, l = rg.uniform(0, N), rg.uniform(0, N), rg.uniform(0, math.pi), rg.uniform(8, 60)
        t = np.arange(0, l, 0.7); xs = (x + np.cos(a) * t).astype(int) % N; ys = (y + np.sin(a) * t).astype(int) % N
        sc_[ys, xs] = np.maximum(sc_[ys, xs], rg.uniform(0.4, 1.0))
    sc_ = blur(sc_, 0.6) * 1.0 * wear
    # Schmutz in Kehlen und Ablaufspuren nach unten
    dirt = np.clip((1 - ao) * 2.2 + np.clip(ccv, 0, 1.5) * 0.7, 0, 1) * (0.55 + 0.6 * n_lo)
    for nm in ('wall_a', 'wall_b'):      # Wände sind unten schmutziger
        a_, b_ = rows(*STRIPS[nm]); t = (1 - (np.arange(a_, b_) - a_) / (b_ - a_))[:, None].astype(np.float32)
        dirt[a_:b_] += t ** 4 * 0.4 * (0.3 + n_mid[a_:b_])
    src = sstep(0.3, 0.7, np.clip(ccv, 0, 1.5)) * sstep(0.45, 0.65, n_str) * sstep(0.3, 0.55, n_mid)
    streak = np.zeros((N, N), np.float32); acc = np.zeros(N, np.float32)
    cuts = set()
    for a, b in STRIPS.values(): cuts.add(rows(a, b)[1] - 1)
    for r in range(N - 1, -1, -1):
        if r in cuts: acc[:] = 0
        acc = np.maximum(src[r], acc * 0.9915); streak[r] = acc
    f0 = rows(*STRIPS['floor']); streak[f0[0]:rows(*STRIPS['plain'])[1]] *= 0.25       # nur Wände, Dach und Kacheln bekommen lange Läufer
    streak = blur(streak, 1.2, 0.6) * (0.5 + 0.7 * n_fine)
    dirt = np.clip(dirt + streak * 0.85, 0, 1)
    # ---------- Farbe
    base = col * (0.88 + 0.24 * n_lo[..., None]) * (0.96 + 0.08 * n_fine[..., None])
    base = base * (1 + sc_[..., None] * 0.14 * (1 - metal[..., None]))
    prim = base * 0.38 + 0.02
    base = base * (1 - chip[..., None]) + prim * chip[..., None]
    mcol = np.array((0.46, 0.45, 0.44), np.float32) * (0.8 + 0.4 * n_fine[..., None])
    base = base * (1 - core[..., None]) + mcol * core[..., None]
    dcol = np.array((0.075, 0.062, 0.05), np.float32); rust = np.array((0.2, 0.09, 0.035), np.float32)
    base = base * (1 - dirt[..., None] * 0.8) + dcol * dirt[..., None] * 0.8
    base = base * (1 - streak[..., None] * 0.35) + rust * streak[..., None] * 0.35 * (0.4 + n_lo[..., None])
    base *= (0.62 + 0.38 * ao)[..., None]
    # ---------- Rauheit, Metall, Verdeckung
    rgh = rough + (n_mid - 0.5) * 0.22 + (n_fine - 0.5) * 0.1
    rgh = rgh * (1 - chip) + 0.62 * chip; rgh = rgh * (1 - core) + (0.34 + 0.2 * n_fine) * core
    rgh = np.clip(rgh + dirt * 0.3 - sc_ * 0.12, 0.06, 1)
    met = np.clip(np.maximum(metal, core) * (1 - dirt * 0.7), 0, 1)
    orm = np.stack([np.clip(ao ** 0.8, 0, 1), rgh, met], -1)
    # ---------- Relief: gerendertes Relief plus feine Unebenheit, Lackkante und Kratzer
    micro = (n_fine - 0.5) * 0.0005 + (n_hi - 0.5) * 0.00025 - chip * 0.0012 - core * 0.0006 - sc_ * 0.0006 + (n_lo - 0.5) * 0.004
    gx = (np.roll(micro, -1, 1) - np.roll(micro, 1, 1)) * 0.5 / px; gy = (np.roll(micro, -1, 0) - np.roll(micro, 1, 0)) * 0.5 / px
    nb = blur(nrm * 2 - 1, 0.55)
    n3 = np.stack([nb[..., 0] - gx, nb[..., 1] - gy, np.maximum(nb[..., 2], 0.05)], -1)
    n3 /= np.linalg.norm(n3, axis=-1, keepdims=True)
    def save(name, rgb, enc):
        a = srgb(rgb) if enc else np.clip(rgb, 0, 1)
        buf = np.ones((N, N, 4), np.float32); buf[..., :3] = a
        img = bpy.data.images.get(name) or bpy.data.images.new(name, N, N, alpha=False)
        img.pixels.foreach_set(buf.ravel()); img.update()
        p = os.path.join(OUT, name + '@2048.png'); img.filepath_raw = p; img.file_format = 'PNG'; img.save()
        return p
    out = [save('kit_trim_col', base, True), save('kit_trim_nrm', n3 * 0.5 + 0.5, False), save('kit_trim_orm', orm, False)]
    return {'files': out, 'chip': float(chip.mean()), 'dirt': float(dirt.mean()), 'albedo': float(base.mean())}
