# Bauvorschriften aller Gegenstände (IDs wie in src/data/gear.ts). Braucht items_lib.py.
# A = Farbe der Seltenheit; sie erscheint nur an kleinen eloxierten Teilen (anod(A)).
BLUE = (0.035, 0.075, 0.14); OLIVE = (0.10, 0.12, 0.07); SAND = (0.26, 0.22, 0.15); ORANGE = (0.55, 0.19, 0.03); REDC = (0.30, 0.03, 0.025); YEL = (0.62, 0.42, 0.03)
GREY = (0.16, 0.17, 0.18); WHITE = (0.55, 0.56, 0.57); NAVY = (0.03, 0.045, 0.09); BROWN = (0.13, 0.075, 0.04); TAN = (0.3, 0.24, 0.15)

# ---------- Kleinteile und Baugruppen ----------
def bolt(p, rot=(90, 0, 0), r=0.016, m=None): cyl(r, 0.014, p, m or STEEL(), rot=rot, seg=6)
def bolts(pts, rot=(90, 0, 0), r=0.016, m=None):
    for p in pts: bolt(p, rot, r, m)
def vent(w, h, loc, rot=(0, 0, 0), n=7):
    # Lüftungsgitter in der XZ-Ebene, Vorderseite -Y
    with grp(loc, rot):
        box(w, 0.02, h, (0, 0.012, 0), BLACK(), bevel=0)
        for i in range(n): box(w * 0.95, 0.036, h / n * 0.4, (0, -0.006, -h / 2 + (i + 0.5) * h / n), GUN(), rot=(32, 0, 0), bevel=0.003)
        for s in (-1, 1):
            box(0.022, 0.04, h + 0.044, (s * (w / 2 + 0.011), -0.004, 0), STEEL(), bevel=0.004); box(w + 0.044, 0.04, 0.022, (0, -0.004, s * (h / 2 + 0.011)), STEEL(), bevel=0.004)
def fins(w, h, d, loc, rot=(0, 0, 0), n=9, m=None):
    # Kühlrippen: Grundplatte in der XZ-Ebene, Rippen stehen nach -Y ab
    with grp(loc, rot):
        box(w, 0.02, h, (0, 0, 0), m or GUN(), bevel=0.004)
        for i in range(n): box(w / n * 0.38, d, h, (-w / 2 + (i + 0.5) * w / n, -d / 2, 0), m or GUN(), bevel=0.003)
def conn(loc, rot=(0, 0, 0), r=0.05, a=None):
    # Steckverbinder, Achse -Y
    with grp(loc, rot):
        cyl(r * 1.3, 0.03, (0, -0.015, 0), STEEL(), rot=(90, 0, 0), seg=6); cyl(r, 0.07, (0, -0.05, 0), a or ALU(), rot=(90, 0, 0)); cyl(r * 0.68, 0.076, (0, -0.052, 0), BLACK(), rot=(90, 0, 0))
def label(w, h, loc, rot=(0, 0, 0), col=(0.5, 0.5, 0.48)):
    # Typenschild, Vorderseite -Y
    with grp(loc, rot):
        box(w, 0.006, h, (0, 0, 0), pbr('schild', col, 0.0, 0.6, wear=0.2, dirt=0.3, bevel=0), bevel=0)
        for i in range(2): box(w * 0.66, 0.008, h * 0.11, (-w * 0.1, -0.001, h * 0.18 - i * h * 0.32), BLACK(), bevel=0)
def hazard(w, h, loc, rot=(0, 0, 0)): label(w, h, loc, rot, (0.62, 0.4, 0.02))
def handle(w, h, loc, rot=(0, 0, 0), r=0.018, m=None):
    with grp(loc, rot): tube([(-w / 2, 0, 0), (-w / 2, -h, 0), (w / 2, -h, 0), (w / 2, 0, 0)], r, m or STEEL())
def rails(sx, sy, sz, m=None, t=0.05, corners=True):
    # Rahmen aus Kantenprofilen und Eckstücken um einen Quader
    m = m or GUN()
    for a in (-1, 1):
        for b in (-1, 1):
            box(sx, t, t, (0, a * (sy - t) / 2, b * (sz - t) / 2), m, bevel=0.012)
            box(t, sy, t, (a * (sx - t) / 2, 0, b * (sz - t) / 2), m, bevel=0.012)
            box(t, t, sz, (a * (sx - t) / 2, b * (sy - t) / 2, 0), m, bevel=0.012)
            if corners:
                for c in (-1, 1): box(t * 1.6, t * 1.6, t * 1.6, (a * (sx - t * 1.6) / 2, b * (sy - t * 1.6) / 2, c * (sz - t * 1.6) / 2), m, bevel=0.016)
def unit(sx, sy, sz, body, m=None, t=0.05):
    box(sx - t, sy - t, sz - t, (0, 0, 0), body, bevel=0.02); rails(sx, sy, sz, m, t)
def hose(pts, r=0.03, m=None):
    tube(pts, r, m or RUBBER())
    for p, q in ((pts[0], pts[1]), (pts[-1], pts[-2])):
        d = (Vector(q) - Vector(p)).normalized(); e = Vector((0, 0, 1)).rotation_difference(d).to_euler()
        cyl(r * 1.35, r * 1.6, tuple(Vector(p) + d * r * 0.8), STEEL(), rot=tuple(math.degrees(v) for v in e), seg=16)
def knurl(r, h, loc, m, rot=(0, 0, 0), n=3):
    # gerändelter Ring: mehrere dünne Wülste
    with grp(loc, rot):
        cyl(r, h, (0, 0, 0), m)
        for i in range(n): torus(r, h / n * 0.28, (0, 0, -h / 2 + (i + 0.5) * h / n), m, seg=40, sseg=6)

# ============================ SCHIFF ============================
# ----- Waffensysteme -----
@item('sw_lauf', 0)
def _(A):
    for s in (-1, 1):
        cyl(0.058, 1.5, (0.12, 0.13 * s, 0), GUN(), rot=(0, 90, 0)); cyl(0.075, 0.5, (-0.3, 0.13 * s, 0), GUN(), rot=(0, 90, 0))
        for i in range(4): torus(0.075, 0.012, (-0.5 + 0.1 * i, 0.13 * s, 0), STEEL(), rot=(0, 90, 0), seg=28, sseg=6)
        cyl(0.08, 0.2, (0.86, 0.13 * s, 0), STEEL(), rot=(0, 90, 0))
        for k in range(3): box(0.03, 0.17, 0.04, (0.8 + 0.06 * k, 0.13 * s, 0), BLACK(), bevel=0)
        cyl(0.03, 0.02, (0.965, 0.13 * s, 0), BLACK(), rot=(0, 90, 0), seg=16)
        box(0.3, 0.2, 0.2, (-0.68, 0.13 * s, 0), GUN(), bevel=0.025)
    for x in (-0.15, 0.45): box(0.09, 0.5, 0.2, (x, 0, 0), STEEL(), bevel=0.02); bolts([(x, -0.251, 0.06), (x, -0.251, -0.06)])
    box(0.6, 0.4, 0.1, (-0.5, 0, -0.16), GUN(), bevel=0.02); label(0.16, 0.07, (-0.68, -0.232, 0.03))
@item('sw_lader', 0)
def _(A):
    unit(0.8, 0.56, 0.62, paint(OLIVE, 0.6)); cyl(0.26, 0.2, (0.0, -0.3, -0.02), GUN(), rot=(90, 0, 0)); cyl(0.2, 0.22, (0.0, -0.31, -0.02), STEEL(), rot=(90, 0, 0)); cyl(0.06, 0.26, (0, -0.32, -0.02), BLACK(), rot=(90, 0, 0), seg=6)
    for i in range(7):
        a = i * 13; box(0.15, 0.3, 0.07, (0.42 + 0.115 * i - 0.004 * i * i, 0.02, 0.26 - 0.011 * i * i), GUN(), rot=(0, a, 0), bevel=0.01)
        cyl(0.03, 0.26, (0.42 + 0.115 * i - 0.004 * i * i, 0.02, 0.3 - 0.011 * i * i), BRASS(), rot=(90, 0, 0), seg=12)
    handle(0.3, 0.08, (-0.1, 0, 0.31), rot=(-90, 0, 0)); hazard(0.14, 0.09, (-0.26, -0.282, 0.18)); conn((-0.4, 0.1, -0.1), rot=(0, 0, -90))
    bolts([(0.3 * sx, -0.281, 0.24 * sz) for sx in (-1, 1) for sz in (-1, 1)])
@item('sw_zielrechner', 1)
def _(A):
    unit(0.95, 0.6, 0.44, paint(GREY, 0.55)); fins(0.8, 0.5, 0.07, (0, 0, 0.22), rot=(-90, 0, 0), n=14)
    box(0.26, 0.012, 0.16, (-0.26, -0.276, 0.04), screen((0.1, 0.5, 0.4), 0.8), bevel=0); box(0.3, 0.02, 0.2, (-0.26, -0.272, 0.04), BLACK(), bevel=0.004)
    for i in range(3): conn((0.05 + 0.14 * i, -0.27, -0.06), r=0.04, a=anod(A) if i == 0 else None)
    for i in range(4): cyl(0.012, 0.01, (0.02 + 0.06 * i, -0.278, 0.1), led((0.2, 1, 0.4) if i < 3 else (1, 0.5, 0.1), 3), rot=(90, 0, 0), seg=8)
    label(0.2, 0.06, (0.2, -0.277, 0.14)); cyl(0.15, 0.2, (0.56, -0.05, 0.0), GUN(), rot=(0, 90, 0)); knurl(0.12, 0.1, (0.7, -0.05, 0), STEEL(), rot=(0, 90, 0)); cyl(0.09, 0.02, (0.755, -0.05, 0), lens(), rot=(0, 90, 0))
@item('sw_rotation', 1)
def _(A):
    ring_of(6, 0.13, lambda y, z, a: cyl(0.042, 1.15, (0.3, y, z), GUN(), rot=(0, 90, 0), seg=16))
    for x in (0.0, 0.45, 0.84): cyl(0.2, 0.05, (x, 0, 0), STEEL(), rot=(0, 90, 0))
    cyl(0.03, 0.9, (0.4, 0, 0), STEEL(), rot=(0, 90, 0), seg=12)
    cyl(0.27, 0.5, (-0.42, 0, 0), GUN(), rot=(0, 90, 0), bevel=0.02); torus(0.27, 0.018, (-0.22, 0, 0), anod(A), rot=(0, 90, 0))
    box(0.36, 0.26, 0.3, (-0.5, 0.3, -0.05), paint(GREY), bevel=0.03); box(0.3, 0.2, 0.2, (-0.45, -0.02, -0.36), GUN(), bevel=0.03)
    conn((-0.69, 0.0, 0.1), rot=(0, 0, -90)); label(0.14, 0.06, (-0.42, -0.265, 0.08)); bolts([(-0.6 + 0.12 * i, -0.26, -0.1) for i in range(4)])
@item('sw_gauss', 2)
def _(A):
    cyl(0.05, 1.8, (0.15, 0, 0), STEEL(), rot=(0, 90, 0))
    for i in range(6):
        x = -0.38 + 0.25 * i
        cyl(0.14, 0.15, (x, 0, 0), BLACK(), rot=(0, 90, 0)); torus(0.14, 0.02, (x - 0.06, 0, 0), COPPER(), rot=(0, 90, 0)); torus(0.14, 0.02, (x + 0.06, 0, 0), COPPER(), rot=(0, 90, 0))
        hose([(x, -0.03, 0.14), (x - 0.06, -0.06, 0.26), (-0.62, -0.1, 0.24)], 0.014)
    for (y, z) in ((0.17, 0), (-0.17, 0), (0, -0.17)): box(1.55, 0.035, 0.05, (0.26, y, z), ALU(), bevel=0.008)
    with grp((-0.86, 0, 0)):
        unit(0.46, 0.5, 0.5, paint(GREY)); fins(0.36, 0.4, 0.06, (0, 0, 0.25), rot=(-90, 0, 0), n=8); hazard(0.14, 0.1, (0.0, -0.252, 0.06)); conn((-0.1, -0.24, -0.12), r=0.04, a=anod(A))
    cyl(0.085, 0.14, (1.02, 0, 0), GUN(), rot=(0, 90, 0)); torus(0.085, 0.012, (1.02, 0, 0), anod(A), rot=(0, 90, 0))
@item('sw_zwilling', 2)
def _(A):
    cyl(0.44, 0.1, (-0.1, 0, -0.5), GUN(), bevel=0.02); cyl(0.36, 0.08, (-0.1, 0, -0.42), STEEL()); ring_of(10, 0.4, lambda x, y, a: bolt((x - 0.1, y, -0.445), rot=(0, 0, 0)))
    for s in (-1, 1): prism([(-0.3, -0.38), (0.2, -0.38), (0.28, 0.0), (0.1, 0.24), (-0.22, 0.24)], 0.06, (-0.1, 0.3 * s, 0), GUN(), bevel=0.015)
    box(0.56, 0.5, 0.3, (-0.14, 0, 0.02), paint(OLIVE, 0.6), bevel=0.03)
    for s in (-1, 1):
        cyl(0.055, 1.25, (0.62, 0.14 * s, 0.05), GUN(), rot=(0, 90, 0)); cyl(0.085, 0.4, (0.3, 0.14 * s, 0.05), STEEL(), rot=(0, 90, 0)); cyl(0.075, 0.18, (1.2, 0.14 * s, 0.05), STEEL(), rot=(0, 90, 0))
        for k in range(3): box(0.025, 0.16, 0.035, (1.15 + 0.05 * k, 0.14 * s, 0.05), BLACK(), bevel=0)
        cyl(0.025, 0.4, (0.2, 0.14 * s, 0.19), ALU(), rot=(0, 90, 0), seg=12)
        box(0.3, 0.14, 0.24, (-0.2, 0.42 * s, 0.02), GUN(), bevel=0.02)
    cyl(0.07, 0.6, (-0.1, 0, 0), STEEL(), rot=(90, 0, 0)); torus(0.075, 0.015, (-0.1, -0.345, 0), anod(A), rot=(90, 0, 0)); hazard(0.12, 0.08, (-0.2, -0.492, 0.04)); label(0.16, 0.05, (-0.1, -0.252, 0.1))
@item('sw_lanze', 3)
def _(A):
    lathe([(0.15, 0), (0.12, 0.5), (0.02, 1.75)], (-0.25, 0, 0), alien(), rot=(0, 90, 0), seg=6, flat=True)
    for k in range(3): lathe([(0.05, 0), (0.04, 0.4), (0.0, 0.95)], (-0.2, 0.17 * math.cos(k * 2.094 + 0.5), 0.17 * math.sin(k * 2.094 + 0.5)), alien(), rot=(0, 90, 40 * k), seg=5, flat=True)
    ico(0.3, (-0.5, 0, 0), alien(), scale=(1.2, 0.85, 0.85), sub=2)
    cyl(0.24, 0.12, (-0.12, 0, 0), STEEL(), rot=(0, 90, 0)); ring_of(8, 0.2, lambda y, z, a: bolt((-0.055, y, z), rot=(0, 90, 0)))
    torus(0.245, 0.016, (-0.12, 0, 0), anod(A), rot=(0, 90, 0))
    box(0.5, 0.44, 0.14, (-0.5, 0, -0.34), GUN(), bevel=0.02)
    for s in (-1, 1): prism([(-0.2, 0), (0.2, 0), (0.12, 0.3), (-0.12, 0.3)], 0.05, (-0.5, 0.16 * s, -0.28), GUN())
    hose([(-0.7, -0.1, -0.3), (-0.86, -0.16, -0.05), (-0.72, -0.14, 0.14)], 0.022); conn((-0.72, -0.22, -0.34), r=0.035)
    torus(0.12, 0.006, (0.2, 0, 0), led((0.5, 0.25, 1.0), 4), rot=(0, 90, 0)); torus(0.09, 0.005, (0.55, 0, 0), led((0.5, 0.25, 1.0), 4), rot=(0, 90, 0))

# ----- Abwehrsysteme -----
@item('sa_platten', 0)
def _(A):
    tilt(-14, 0, 0)
    P = [(-0.55, -0.38), (0.45, -0.38), (0.6, -0.22), (0.6, 0.38), (-0.45, 0.38), (-0.6, 0.22)]
    for i in range(3): prism([(x * (1 - 0.07 * i), z * (1 - 0.07 * i)) for x, z in P], 0.06, (0.03 * i, 0.1 - 0.085 * i, 0.02 * i), GUN() if i != 1 else STEEL(), bevel=0.014)
    bolts([(0.42 * sx + 0.06, -0.1, 0.25 * sz + 0.04) for sx in (-1, 1) for sz in (-1, 1)], r=0.03); bolts([(0.06, -0.1, 0.27), (0.06, -0.1, -0.19)], r=0.03)
    label(0.22, 0.08, (-0.14, -0.101, 0.04)); box(0.5, 0.008, 0.02, (0.06, -0.1, -0.08), BLACK(), bevel=0)
@item('sa_kondensator', 0)
def _(A):
    box(1.1, 0.5, 0.1, (0, 0, -0.5), GUN(), bevel=0.02); box(1.1, 0.12, 0.08, (0, 0.2, 0.3), GUN(), bevel=0.02)
    for s in (-1, 1): box(0.06, 0.1, 0.8, (0.52 * s, 0.2, -0.1), GUN(), bevel=0.015)
    for i in range(3):
        x = -0.34 + 0.34 * i
        cyl(0.145, 0.72, (x, -0.02, -0.09), paint(BLUE, 0.45), bevel=0.02)
        for z in (-0.36, -0.1, 0.16): torus(0.146, 0.012, (x, -0.02, z), STEEL(), seg=36, sseg=6)
        lathe([(0.06, 0.27), (0.085, 0.3), (0.05, 0.33), (0.085, 0.36), (0.05, 0.39), (0.075, 0.42), (0.03, 0.46)], (x, -0.02, 0), CERAMIC(), seg=24); cyl(0.02, 0.06, (x, -0.02, 0.48), BRASS(), seg=12)
        label(0.1, 0.07, (x, -0.166, -0.05))
    box(0.82, 0.05, 0.02, (0, -0.02, 0.5), COPPER(), bevel=0.004); hazard(0.14, 0.09, (0.36, -0.252, -0.5))
@item('sa_waben', 1)
def _(A):
    tilt(-22, 0, 0)
    cyl(0.66, 0.08, (0, 0.03, 0), GUN(), rot=(90, 0, 0), seg=6, bevel=0.02)
    def cell(x, z, a): cyl(0.2, 0.1, (x, -0.01, z), STEEL(), rot=(90, 30, 0), seg=6, bevel=0.012); cyl(0.12, 0.11, (x, -0.012, z), GUN(), rot=(90, 30, 0), seg=6, bevel=0.008)
    ring_of(6, 0.385, cell, phase=30); cell(0, 0, 0)
    cyl(0.12, 0.112, (0, -0.014, 0), anod(A), rot=(90, 30, 0), seg=6, bevel=0.008)
    ring_of(6, 0.6, lambda x, z, a: bolt((x, -0.012, z), r=0.026))
@item('sa_projektor', 1)
def _(A):
    with grp((0, 0, -0.42)):
        unit(0.76, 0.6, 0.26, paint(GREY)); vent(0.3, 0.12, (-0.14, -0.302, 0), n=5); conn((0.2, -0.29, 0), r=0.04); label(0.12, 0.05, (0.2, -0.303, 0.08))
    for s in (-1, 1): prism([(-0.1, 0), (0.1, 0), (0.07, 0.42), (-0.07, 0.42)], 0.05, (0.3 * s, 0, -0.3), GUN(), rot=(0, 0, 90))
    with grp((0, 0, 0.12), (52, 0, 70)):
        lathe([(0.1, -0.12), (0.26, -0.1), (0.3, 0.0), (0.3, 0.1), (0.27, 0.1), (0.24, 0.02), (0.1, 0.0)], (0, 0, 0), GUN())
        torus(0.2, 0.035, (0, 0, 0.05), COPPER()); cyl(0.1, 0.16, (0, 0, 0.08), STEEL()); cyl(0.07, 0.02, (0, 0, 0.165), lens((0.25, 0.4, 0.7)))
        torus(0.3, 0.012, (0, 0, 0.1), anod(A)); cyl(0.12, 0.1, (0, 0, -0.16), BLACK())
    cyl(0.035, 0.66, (0, 0, 0.12), STEEL(), rot=(0, 90, 0), seg=12)
@item('sa_reaktiv', 2)
def _(A):
    tilt(-16, 0, 0)
    box(1.26, 0.06, 0.9, (0, 0.06, 0), STEEL(), bevel=0.016)
    for r in range(2):
        for c in range(3):
            x, z = -0.4 + 0.4 * c, -0.21 + 0.42 * r
            box(0.35, 0.12, 0.37, (x, -0.03, z), paint(OLIVE, 0.65), bevel=0.03); bolt((x, -0.092, z), r=0.022)
            for sx in (-1, 1): box(0.02, 0.1, 0.08, (x + 0.16 * sx, -0.035, z), GUN(), bevel=0.004)
    hazard(0.1, 0.07, (0.5, -0.092, 0.3)); label(0.12, 0.05, (-0.3, -0.092, -0.32)); box(1.22, 0.012, 0.03, (0, 0.03, 0), anod(A), bevel=0)
@item('sa_phasen', 2)
def _(A):
    box(0.9, 0.5, 0.16, (0, 0, -0.56), GUN(), bevel=0.02); vent(0.3, 0.07, (-0.2, -0.252, -0.56), n=3); conn((0.24, -0.24, -0.56), r=0.035)
    for s in (-1, 1): box(0.08, 0.2, 0.3, (0.36 * s, 0, -0.38), GUN(), bevel=0.015)
    torus(0.46, 0.065, (0, 0, 0.08), STEEL(), rot=(90, 0, 0)); torus(0.38, 0.03, (0, 0, 0.08), COPPER(), rot=(90, 0, 0)); torus(0.46, 0.012, (0, -0.066, 0.08), anod(A), rot=(90, 0, 0))
    ring_of(6, 0.46, lambda x, z, a: box(0.14, 0.17, 0.12, (x, 0, 0.08 + z), GUN(), rot=(0, 90 - a, 0), bevel=0.02), phase=30)
    ring_of(6, 0.46, lambda x, z, a: bolt((x, -0.09, 0.08 + z), r=0.02), phase=30)
    sph(0.2, (0, 0, 0.08), glass((0.02, 0.03, 0.06))); ring_of(3, 0.3, lambda x, z, a: cyl(0.014, 0.2, (x, 0, 0.08 + z), ALU(), rot=(0, 90 - a, 0), seg=10), phase=90)
@item('sa_bollwerk', 3)
def _(A):
    rails(0.96, 0.96, 1.1, t=0.085)
    sph(0.36, (0, 0, 0.04), STEEL()); torus(0.37, 0.035, (0, 0, 0.04), GUN()); ring_of(16, 0.37, lambda x, y, a: bolt((x, y, 0.078), rot=(0, 0, 0), r=0.018))
    torus(0.365, 0.012, (0, 0, 0.2), anod(A)); torus(0.365, 0.012, (0, 0, -0.12), anod(A))
    cyl(0.14, 0.14, (0, 0, 0.44), GUN()); cyl(0.2, 0.03, (0, 0, 0.5), STEEL(), seg=8); cyl(0.14, 0.2, (0, 0, -0.4), GUN())
    for s in (-1, 1): hose([(0.3 * s, -0.1, 0.24), (0.42 * s, -0.36, 0.1), (0.4 * s, -0.4, -0.4)], 0.035, ALU()); cyl(0.07, 0.05, (0.36 * s, 0, 0.04), GUN(), rot=(0, 90, 0))
    box(0.3, 0.02, 0.16, (0, -0.47, -0.36), GUN(), bevel=0.004); box(0.22, 0.01, 0.09, (0, -0.482, -0.35), screen((0.6, 0.4, 0.1), 0.9), bevel=0); hazard(0.12, 0.08, (0.3, -0.482, 0.3))

# ----- Antrieb (Düse zeigt nach +Z, das Ganze wird gekippt) -----
ENG = (105, 0, 62)
def bell(r0, r1, h, z, m, n_ribs=4, rib=None):
    lathe([(r0, z), (r0 * 1.12, z + h * 0.18), (r1 * 0.8, z + h * 0.62), (r1, z + h), (r1 * 0.95, z + h), (r1 * 0.76, z + h * 0.6), (r0 * 0.98, z + h * 0.2), (r0 * 0.6, z + h * 0.08)], (0, 0, 0), m, seg=48)
    for i in range(n_ribs):
        f = (i + 1) / (n_ribs + 1); zz = z + h * (0.18 + 0.82 * f)
        rr = r0 * 1.12 + (r1 * 0.8 - r0 * 1.12) * min(1, f / 0.54) if f < 0.54 else r1 * 0.8 + (r1 - r1 * 0.8) * (f - 0.54) / 0.46
        torus(rr, 0.012, (0, 0, zz), rib or STEEL(), seg=48, sseg=6)
    cyl(r0 * 0.6, 0.02, (0, 0, z + h * 0.09), BLACK())
@item('st_duesen', 0)
def _(A):
    tilt(*ENG)
    bell(0.2, 0.44, 0.66, 0.0, GUN()); cyl(0.24, 0.26, (0, 0, -0.13), STEEL(), bevel=0.02); cyl(0.3, 0.05, (0, 0, -0.28), GUN(), seg=8)
    ring_of(8, 0.26, lambda x, y, a: bolt((x, y, -0.25), rot=(0, 0, 0)))
    cyl(0.1, 0.3, (0.3, 0, -0.1), GUN()); hose([(0.3, 0, 0.06), (0.36, 0, 0.2), (0.22, 0, 0.3)], 0.03, ALU()); hose([(-0.2, 0.1, -0.2), (-0.34, 0.12, 0.0), (-0.24, 0.1, 0.2)], 0.022)
@item('st_wirbel', 0)
def _(A):
    tilt(-18, 0, 22)
    box(0.56, 0.56, 0.5, (0, 0, 0), GUN(), bevel=0.05); box(0.6, 0.4, 0.12, (0, 0, -0.3), STEEL(), bevel=0.02)
    for (p, r) in [((0, 0, 0.25), (0, 0, 0)), ((0.28, 0, 0), (0, 90, 0)), ((0, -0.28, 0), (90, 0, 0)), ((-0.28, 0, 0), (0, -90, 0))]:
        with grp(p, r):
            lathe([(0.07, 0), (0.09, 0.05), (0.17, 0.24), (0.155, 0.24), (0.07, 0.05), (0.04, 0.02)], (0, 0, 0), STEEL(), seg=28); cyl(0.04, 0.01, (0, 0, 0.03), BLACK()); torus(0.1, 0.012, (0, 0, 0.02), GUN(), sseg=6)
    bolts([(0.2 * sx, -0.281, 0.19 * sz) for sx in (-1, 1) for sz in (-1, 1)]); conn((0.14, 0.27, 0.1), rot=(0, 0, 180), r=0.035); label(0.12, 0.05, (-0.12, -0.281, -0.17))
@item('st_nachbrenner', 1)
def _(A):
    tilt(*ENG)
    lathe([(0.22, 0), (0.24, 0.5), (0.3, 0.62), (0.28, 0.62), (0.2, 0.5), (0.18, 0.05)], (0, 0, 0), GUN(), seg=48)
    ring_of(14, 0.31, lambda x, y, a: box(0.012, 0.13, 0.36, (x, y, 0.78), STEEL(), rot=(0, 0, a + 90), bevel=0.003))
    ring_of(14, 0.34, lambda x, y, a: box(0.012, 0.13, 0.36, (x, y, 0.8), GUN(), rot=(10, 0, a + 90), bevel=0.003), phase=12.8)
    torus(0.27, 0.03, (0, 0, 0.3), ALU()); ring_of(8, 0.27, lambda x, y, a: cyl(0.02, 0.1, (x, y, 0.36), STEEL(), seg=10))
    cyl(0.26, 0.3, (0, 0, -0.14), STEEL(), bevel=0.02); torus(0.262, 0.012, (0, 0, -0.02), anod(A)); cyl(0.32, 0.05, (0, 0, -0.3), GUN(), seg=8)
    hose([(0.26, 0, -0.1), (0.4, 0, 0.1), (0.3, 0, 0.3)], 0.028, ALU()); cyl(0.17, 0.02, (0, 0, 0.1), BLACK())
@item('st_vektor', 1)
def _(A):
    tilt(*ENG)
    with grp((0, 0, 0.08), (10, 8, 0)): bell(0.18, 0.38, 0.62, 0.0, GUN(), n_ribs=3); cyl(0.2, 0.16, (0, 0, -0.06), STEEL()); torus(0.2, 0.012, (0, 0, 0.02), anod(A))
    torus(0.4, 0.04, (0, 0, 0.0), STEEL()); torus(0.31, 0.03, (0, 0, -0.04), GUN())
    cyl(0.42, 0.06, (0, 0, -0.3), GUN(), seg=8); cyl(0.2, 0.2, (0, 0, -0.2), GUN())
    def act(x, y, a):
        cyl(0.03, 0.26, (x, y, -0.14), STEEL(), seg=12); cyl(0.018, 0.2, (x, y, 0.02), ALU(), seg=10); sph(0.035, (x, y, 0.12), STEEL(), seg=12)
    ring_of(4, 0.34, act, phase=45); ring_of(8, 0.37, lambda x, y, a: bolt((x, y, -0.265), rot=(0, 0, 0)))
@item('st_fusion', 2)
def _(A):
    tilt(*ENG)
    bell(0.24, 0.54, 0.78, 0.0, GUN(), n_ribs=0)
    for z, r in ((0.2, 0.33), (0.42, 0.44), (0.64, 0.535)):
        torus(r, 0.045, (0, 0, z), COPPER()); ring_of(4, r + 0.045, lambda x, y, a, z=z: box(0.06, 0.05, 0.08, (x, y, z), GUN(), rot=(0, 0, a), bevel=0.008), phase=45)
    cyl(0.3, 0.34, (0, 0, -0.2), STEEL(), bevel=0.03); torus(0.302, 0.014, (0, 0, -0.06), anod(A)); cyl(0.36, 0.05, (0, 0, -0.4), GUN(), seg=8)
    ring_of(3, 0.36, lambda x, y, a: hose([(x * 0.86, y * 0.86, -0.3), (x * 1.25, y * 1.25, -0.05), (x * 1.05, y * 1.05, 0.2)], 0.03, ALU()), phase=30)
    ring_of(6, 0.3, lambda x, y, a: cyl(0.03, 0.12, (x, y, -0.02), GUN(), seg=10))
@item('st_gyro', 2)
def _(A):
    rails(0.9, 0.9, 1.0, t=0.08); box(0.8, 0.8, 0.06, (0, 0, -0.47), GUN(), bevel=0.01)
    torus(0.38, 0.03, (0, 0, 0), STEEL(), rot=(90, 0, 0)); torus(0.31, 0.026, (0, 0, 0), ALU(), rot=(0, 0, 0))
    for s in (-1, 1): cyl(0.05, 0.1, (0.42 * s, 0, 0), GUN(), rot=(0, 90, 0)); cyl(0.04, 0.08, (0, 0.34 * s, 0), GUN(), rot=(90, 0, 0))
    with grp((0, 0, 0), (25, 20, 0)):
        lathe([(0.03, -0.2), (0.05, -0.06), (0.24, -0.045), (0.25, 0.0), (0.24, 0.045), (0.05, 0.06), (0.03, 0.2)], (0, 0, 0), BRASS(), seg=48); torus(0.25, 0.012, (0, 0, 0), anod(A)); torus(0.27, 0.018, (0, 0, 0), STEEL(), rot=(90, 0, 0))
    box(0.3, 0.2, 0.12, (0, -0.3, -0.4), GUN(), bevel=0.015); conn((0.0, -0.4, -0.4), r=0.035); label(0.12, 0.05, (0.26, -0.452, -0.47))
@item('st_sturm', 3)
def _(A):
    tilt(*ENG)
    def one(x, y, a):
        with grp((x, y, 0.0)):
            lathe([(0.12, 0), (0.14, 0.12), (0.23, 0.46), (0.28, 0.68), (0.265, 0.68), (0.2, 0.44), (0.11, 0.12), (0.07, 0.05)], (0, 0, 0), CERAMIC(), seg=40)
            torus(0.28, 0.012, (0, 0, 0.675), anod(A), sseg=6); torus(0.145, 0.018, (0, 0, 0.12), STEEL()); cyl(0.07, 0.01, (0, 0, 0.06), BLACK())
    ring_of(3, 0.29, one, phase=90)
    cyl(0.5, 0.26, (0, 0, -0.14), GUN(), bevel=0.04, seg=48); cyl(0.54, 0.05, (0, 0, -0.3), STEEL(), seg=12); torus(0.5, 0.014, (0, 0, -0.03), anod(A))
    ring_of(12, 0.5, lambda x, y, a: bolt((x, y, -0.27), rot=(0, 0, 0)))
    ring_of(3, 0.44, lambda x, y, a: hose([(x, y, -0.05), (x * 1.3, y * 1.3, 0.12), (x * 0.95, y * 0.95, 0.3)], 0.026, ALU()), phase=30)
    ring_of(3, 0.3, lambda x, y, a: cyl(0.05, 0.16, (x, y, 0.06), GUN(), seg=12), phase=30)

# ----- Bordsysteme -----
@item('sy_netz', 0)
def _(A):
    box(0.96, 0.7, 0.62, (0, 0, 0), paint(SAND, 0.65), bevel=0.03)
    for x in (-0.36, -0.12, 0.12, 0.36): box(0.05, 0.72, 0.64, (x, 0, 0), paint(tuple(v * 0.8 for v in SAND), 0.65), bevel=0.012)
    for x in (-0.24, 0.24):
        box(0.07, 0.74, 0.012, (x, 0, 0.316), fabric((0.03, 0.03, 0.035)), bevel=0); box(0.07, 0.012, 0.66, (x, -0.356, 0), fabric((0.03, 0.03, 0.035)), bevel=0)
        box(0.1, 0.03, 0.12, (x, -0.366, 0.12), STEEL(), bevel=0.008); box(0.06, 0.035, 0.04, (x, -0.37, 0.16), anod(A), bevel=0.004)
    for sx in (-1, 1):
        for sz in (-1, 1): box(0.1, 0.72, 0.1, (0.44 * sx, 0, 0.27 * sz), GUN(), bevel=0.015)
    label(0.16, 0.08, (0.0, -0.352, -0.12)); handle(0.2, 0.05, (0.485, 0, 0.05), rot=(0, 0, 90))
@item('sy_linse', 0)
def _(A):
    tilt(0, 0, -28)
    with grp((0, 0, 0.08), (90, 0, 0)):
        cyl(0.3, 0.5, (0, 0, 0), GUN()); knurl(0.31, 0.12, (0, 0, -0.1), BLACK(), n=5); knurl(0.33, 0.1, (0, 0, 0.14), BLACK(), n=4)
        cyl(0.34, 0.08, (0, 0, 0.28), GUN()); torus(0.3, 0.012, (0, 0, 0.02), anod(A), sseg=6)
        lathe([(0.0, 0.3), (0.2, 0.31), (0.3, 0.33), (0.2, 0.36), (0.0, 0.375)], (0, 0, 0), lens((0.2, 0.35, 0.5))); cyl(0.3, 0.02, (0, 0, 0.3), BLACK())
        cyl(0.24, 0.1, (0, 0, -0.3), STEEL())
    box(0.2, 0.3, 0.24, (0, 0.05, -0.3), GUN(), bevel=0.02); box(0.5, 0.5, 0.06, (0, 0.05, -0.45), GUN(), bevel=0.012); bolts([(0.2 * sx, 0.05 + 0.2 * sy, -0.418) for sx in (-1, 1) for sy in (-1, 1)], rot=(0, 0, 0))
@item('sy_antenne', 0)
def _(A):
    box(0.5, 0.5, 0.2, (0, 0, -0.6), paint(GREY), bevel=0.02); vent(0.2, 0.08, (-0.08, -0.252, -0.6), n=3); cyl(0.07, 0.3, (0, 0, -0.38), STEEL())
    for s in (-1, 1): prism([(-0.07, 0), (0.07, 0), (0.05, 0.36), (-0.05, 0.36)], 0.04, (0, 0.26 * s, -0.26), GUN(), rot=(0, 0, 90))
    cyl(0.03, 0.56, (0, 0, 0.06), STEEL(), rot=(90, 0, 0), seg=12)
    with grp((0, 0, 0.06), (49, 0, 82)):
        lathe([(0.04, 0.0), (0.26, 0.045), (0.46, 0.15), (0.56, 0.3), (0.545, 0.305), (0.45, 0.165), (0.26, 0.06), (0.04, 0.02)], (0, 0, 0), CERAMIC(), seg=56)
        torus(0.555, 0.014, (0, 0, 0.3), GUN(), sseg=6); cyl(0.1, 0.08, (0, 0, -0.03), GUN())
        ring_of(3, 0.4, lambda x, y, a: cyl(0.01, 0.52, (x * 0.55, y * 0.55, 0.36), STEEL(), rot=(0, -40, a), seg=8))
        cyl(0.045, 0.1, (0, 0, 0.56), GUN()); lathe([(0.03, 0.5), (0.07, 0.44), (0.065, 0.44), (0.03, 0.49)], (0, 0, 0), STEEL(), seg=20)
@item('sy_ausbau', 1)
def _(A):
    def cont(x, z, c, sx=0.62):
        with grp((x, 0, z)):
            box(sx, 0.5, 0.4, (0, 0, 0), paint(c, 0.6), bevel=0.012)
            n = int(sx / 0.07)
            for k in range(n): box(0.028, 0.515, 0.34, (-sx / 2 + 0.05 + k * (sx - 0.1) / (n - 1), 0, 0), paint(tuple(v * 0.78 for v in c), 0.6), bevel=0.006)
            rails(sx + 0.02, 0.52, 0.42, GUN(), t=0.035, corners=True)
            for s in (-1, 1): cyl(0.01, 0.34, (sx / 2 + 0.012, 0.1 * s, 0), STEEL(), seg=8)
            label(0.1, 0.06, (sx / 2 - 0.12, -0.262, 0.1))
    cont(-0.33, -0.22, BLUE); cont(0.33, -0.22, (0.36, 0.14, 0.05)); cont(0.0, 0.21, OLIVE)
    box(0.05, 0.02, 0.05, (0.2, -0.262, 0.3), anod(A), bevel=0.004)
@item('sy_prisma', 1)
def _(A):
    unit(1.0, 0.6, 0.4, paint(GREY)); box(0.5, 0.36, 0.02, (0.05, 0, 0.196), glass((0.02, 0.03, 0.04)), bevel=0)
    prism([(-0.14, -0.1), (0.14, -0.1), (0, 0.14)], 0.26, (0.05, 0, 0.14), lens((0.5, 0.7, 0.9)), rot=(90, 0, 0), bevel=0.004)
    for (p, r) in [((-0.52, 0, 0), (0, 0, -90)), ((0.52, 0.12, 0), (0, 0, 90)), ((0.52, -0.12, 0), (0, 0, 90))]:
        with grp(p, r): cyl(0.09, 0.14, (0, -0.06, 0), GUN(), rot=(90, 0, 0)); knurl(0.1, 0.05, (0, -0.1, 0), BLACK(), rot=(90, 0, 0), n=2); cyl(0.065, 0.02, (0, -0.135, 0), lens(), rot=(90, 0, 0))
    for i in range(3): knurl(0.035, 0.05, (-0.3 + 0.12 * i, -0.2, 0.22), ALU(), n=2)
    label(0.18, 0.06, (0.2, -0.302, 0.06)); torus(0.092, 0.01, (-0.59, 0, 0), anod(A), rot=(0, 90, 0), sseg=6)
@item('sy_sonde', 1)
def _(A):
    tilt(0, 52, 0)
    lathe([(0.02, -0.72), (0.13, -0.56), (0.2, -0.3), (0.2, 0.4), (0.15, 0.52), (0.15, 0.6)], (0, 0, 0), CERAMIC(), seg=48)
    lathe([(0.02, -0.722), (0.132, -0.562), (0.172, -0.42), (0.172, -0.415), (0.13, -0.555)], (0, 0, 0), glass(), seg=48)
    for z in (-0.3, 0.0, 0.3): torus(0.201, 0.01, (0, 0, z), GUN(), sseg=6)
    torus(0.201, 0.014, (0, 0, -0.36), anod(A), sseg=6)
    ring_of(4, 0.2, lambda x, y, a: prism([(0, 0), (0.26, 0.16), (0.26, 0.36), (0, 0.32)], 0.02, (x, y, 0.2), GUN(), rot=(0, 0, a)))
    cyl(0.1, 0.1, (0, 0, 0.64), GUN()); cyl(0.06, 0.03, (0, 0, 0.7), BLACK()); cyl(0.008, 0.36, (0.21, 0, -0.1), STEEL(), seg=8); label(0.1, 0.05, (0, -0.201, 0.14))
@item('sy_kompressor', 2)
def _(A):
    box(1.0, 0.8, 0.1, (0, 0, -0.56), GUN(), bevel=0.02); box(1.0, 0.8, 0.16, (0, 0, 0.54), GUN(), bevel=0.02)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl(0.055, 1.05, (0.4 * sx, 0.3 * sy, 0), ALU()); cyl(0.08, 0.05, (0.4 * sx, 0.3 * sy, 0.64), STEEL(), seg=6)
    cyl(0.17, 0.34, (0, 0, 0.32), STEEL()); cyl(0.09, 0.2, (0, 0, 0.1), ALU()); box(0.7, 0.56, 0.1, (0, 0, -0.02), paint(YEL, 0.55), bevel=0.02)
    box(0.5, 0.42, 0.4, (0, 0, -0.3), pbr('erzblock', (0.06, 0.05, 0.045), 0.5, 0.6, wear=0.3), bevel=0.012)
    hazard(0.16, 0.1, (0.24, -0.402, 0.54)); label(0.14, 0.06, (-0.26, -0.402, 0.54)); hose([(0.17, 0, 0.4), (0.3, -0.1, 0.5), (0.3, -0.3, 0.46)], 0.022)
    torus(0.172, 0.012, (0, 0, 0.2), anod(A), sseg=6)
@item('sy_resonator', 2)
def _(A):
    with grp((0, 0, -0.5)): unit(0.8, 0.5, 0.26, paint(GREY)); conn((0.2, -0.24, 0), r=0.035); label(0.14, 0.05, (-0.16, -0.252, 0))
    for s in (-1, 1):
        box(0.09, 0.12, 1.0, (0.2 * s, 0, 0.13), ALU(), bevel=0.02)
        for i in range(5): cyl(0.1, 0.07, (0.2 * s, 0, -0.14 + 0.13 * i), COPPER(), seg=28)
        box(0.1, 0.13, 0.03, (0.2 * s, 0, 0.6), anod(A), bevel=0.005)
    box(0.5, 0.12, 0.1, (0, 0, -0.34), GUN(), bevel=0.02); cyl(0.05, 0.3, (0, 0, -0.2), STEEL(), seg=12)
@item('sy_orakel', 3)
def _(A):
    box(0.9, 0.7, 0.2, (0, 0, -0.54), GUN(), bevel=0.02); vent(0.26, 0.08, (-0.22, -0.352, -0.54), n=3)
    box(0.24, 0.012, 0.1, (0.18, -0.352, -0.54), screen((0.5, 0.25, 0.9), 0.8), bevel=0); box(0.28, 0.02, 0.14, (0.18, -0.348, -0.54), BLACK(), bevel=0.004)
    ico(0.36, (0, 0, 0.1), alien(), scale=(1, 1, 1.15), sub=1)
    ring_of(3, 0.36, lambda x, y, a: prism([(-0.05, 0), (0.05, 0), (0.05, 0.62), (0.12, 0.72), (0.0, 0.74)], 0.07, (x, y, -0.44), STEEL(), rot=(0, 0, a + 180)), phase=90)
    torus(0.37, 0.022, (0, 0, -0.1), STEEL()); torus(0.372, 0.01, (0, 0, -0.06), anod(A), sseg=6)
    hose([(0.3, -0.2, -0.44), (0.42, -0.3, -0.2), (0.26, -0.2, 0.0)], 0.02); hose([(-0.3, -0.2, -0.44), (-0.46, -0.24, -0.1), (-0.28, -0.14, 0.14)], 0.02)
    for (x, y, z) in [(0.14, -0.3, 0.2), (-0.2, -0.26, 0.02), (0.02, -0.34, 0.0)]: sph(0.012, (x, y, z), led((0.5, 0.25, 1.0), 5), seg=8)
@item('sy_herz', 3)
def _(A):
    rails(0.9, 0.9, 1.2, t=0.085)
    cyl(0.3, 0.78, (0, 0, 0), STEEL(), seg=48)
    for z in (-0.4, 0.4):
        cyl(0.36, 0.06, (0, 0, z), GUN(), seg=48); ring_of(14, 0.33, lambda x, y, a, z=z: bolt((x, y, z + 0.035 * (1 if z > 0 else -1)), rot=(0, 0, 0), r=0.016))
    for z in (-0.2, 0.0, 0.2): torus(0.302, 0.014, (0, 0, z), anod(A) if z == 0 else GUN(), sseg=6)
    lathe([(0.3, 0.43), (0.2, 0.52), (0.08, 0.55)], (0, 0, 0), STEEL(), seg=48); cyl(0.12, 0.03, (0, 0, 0.57), GUN(), seg=8); cyl(0.3, 0.1, (0, 0, -0.48), GUN())
    for s in (-1, 1):
        hose([(0.3 * s, -0.06, 0.26), (0.42 * s, -0.3, 0.2), (0.4 * s, -0.4, -0.3), (0.3 * s, -0.3, -0.5)], 0.035, ALU()); hose([(0.24 * s, 0.2, -0.3), (0.4 * s, 0.34, 0.0), (0.24 * s, 0.2, 0.3)], 0.022)
    box(0.26, 0.02, 0.14, (0, -0.31, 0.06), BLACK(), bevel=0.004); box(0.2, 0.01, 0.08, (0, -0.322, 0.06), screen((0.7, 0.45, 0.1), 0.9), bevel=0); hazard(0.14, 0.09, (0, -0.305, -0.2))
