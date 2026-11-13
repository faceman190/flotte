# Hochhäuser für dichte Städte (Neonhafen und folgende), zweite Fassung: gegliederte Baukörper statt glatter Quader.
# Läuft in Blender (Hochhaeuser.blend), gebaut mit dem Baukasten (kit_lib.py).
#
# Fassaden: drei kachelnde Bilder mit Relief (scripts/make-kit-hh.mjs → asset-src/neu/stadt/tex):
#   'a' Glasraster (kit_hha), 'b' schwere Paneele (kit_hhb), 'c' Fensterbänder mit Betonbrüstung (kit_hhc); je 24 m × 25,6 m.
# Gliederung aus echter Geometrie: senkrechte Rippen, Gesimse, Technikgeschosse, Eckpfeiler, angesetzte Scheiben, auskragende Module,
# Dachaufbauten, Klingen und Antennen, Landeplattformen, Werbetafeln, Steigleitungen, Lichtbänder, Kräne, Laufbrücken.
#
# Benutzung:  import hochhaus_kit as H;  H.tower_konzern(K, (x, y))  usw.;  H.tower_bundle(K, (x, y), seed, h, w, d) erzeugt beliebig viele Varianten.
# Schaubühnen: H.city(lib) → Objekte „Hochhaus_Stadt“ und „Hochhaus_Ferne“ (Schlucht mit Tiefenstaffelung), H.lineup(lib) → „Hochhaus_Reihe“.
import math, random

PI = math.pi
PER = (24.0, 25.6)
MAT = {'a': 'kit_hha', 'b': 'kit_hhb', 'c': 'kit_hhc'}
# Tönungen (werden mit dem Fassadenbild multipliziert)
T_DARK, T_MID, T_LIGHT, T_RED, T_GREEN, T_BLUE, T_SAND = (0.5, 0.51, 0.55), (0.78, 0.78, 0.8), (1.15, 1.15, 1.15), (1.0, 0.4, 0.33), (0.7, 0.8, 0.74), (0.66, 0.74, 0.9), (1.0, 0.93, 0.8)
PALETTE = [T_DARK, T_DARK, T_MID, T_MID, T_LIGHT, T_GREEN, T_BLUE, T_SAND]
NEON = ['n_lumen', 'n_volta', 'n_kapsel', 'n_robo', 'n_klinik', 'n_nudel', 'n_bier', 'n_karaoke', 'n_nachtmarkt', 'n_neonhafen']
ADS = ['a_lumen', 'a_volta']
VERT = ['v_nudeln', 'v_kapsel', 'v_bar', 'v_offen']
ICON = ['n_auge', 'n_blitz', 'n_ring', 'n_kreuz', 'n_schale']
def F32(z): return round(z / 3.2) * 3.2      # auf Geschosshöhe runden
PODIUM = True      # False: Türme ohne eigenen Sockel bauen (sie stehen dann auf einem fremden Unterbau, z. B. den Blöcken von Neonhafen)

# ------------------------------------------------------------------ Grundrisse (gegen den Uhrzeigersinn, von oben)
def rect(cx, cy, sx, sy):
    return [(cx - sx / 2, cy - sy / 2), (cx + sx / 2, cy - sy / 2), (cx + sx / 2, cy + sy / 2), (cx - sx / 2, cy + sy / 2)]
def chamfer(cx, cy, sx, sy, c):
    x0, x1, y0, y1 = cx - sx / 2, cx + sx / 2, cy - sy / 2, cy + sy / 2
    return [(x0 + c, y0), (x1 - c, y0), (x1, y0 + c), (x1, y1 - c), (x1 - c, y1), (x0 + c, y1), (x0, y1 - c), (x0, y0 + c)]
def circle(cx, cy, r, n=16, a0=0.0):
    return [(cx + math.cos(a0 + i / n * 2 * PI) * r, cy + math.sin(a0 + i / n * 2 * PI) * r) for i in range(n)]
def offset(pts, d):
    """Grundriss um d nach außen verschieben (für konvexe Vielecke)."""
    n = len(pts); out = []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        e1 = (p1[0] - p0[0], p1[1] - p0[1]); e2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1 = math.hypot(*e1) or 1; l2 = math.hypot(*e2) or 1
        n1 = (e1[1] / l1, -e1[0] / l1); n2 = (e2[1] / l2, -e2[0] / l2)
        bx, by = n1[0] + n2[0], n1[1] + n2[1]; bl = math.hypot(bx, by) or 1
        k = d / max(0.3, (bx * n1[0] + by * n1[1]) / bl)
        out.append((p1[0] + bx / bl * k, p1[1] + by / bl * k))
    return out
def center(pts):
    return sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts)
def bounds(pts):
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]; return min(xs), max(xs), min(ys), max(ys)
def _edge(a, b):
    """Länge, Richtung und Außennormale einer Kante."""
    L = math.hypot(b[0] - a[0], b[1] - a[1]) or 1e-6; ex, ey = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    return L, ex, ey, ey, -ex
def edge_rect(a, b, t0, t1, d, inset=0.3):
    """Rechteck, das vor einer Kante sitzt (von t0 bis t1 der Kantenlänge, d tief): Grundriss für angesetzte Scheiben und Erker."""
    L, ex, ey, nx, ny = _edge(a, b)
    p0 = (a[0] + ex * L * t0 - nx * inset, a[1] + ey * L * t0 - ny * inset); p1 = (a[0] + ex * L * t1 - nx * inset, a[1] + ey * L * t1 - ny * inset)
    return [(p0[0] + nx * (d + inset), p0[1] + ny * (d + inset)), (p1[0] + nx * (d + inset), p1[1] + ny * (d + inset)), p1, p0]
def _face(nx, ny):
    """Drehung, bei der die Vorderseite (-Y) in Richtung (nx, ny) zeigt."""
    return math.atan2(nx, -ny)

# ------------------------------------------------------------------ Bausteine: Baukörper
def shaft(K, pts, z0, z1, kind='a', tint='none', roof=True):
    """Turmabschnitt: je Kante eine Fassadenfläche. Geschosse beginnen an der Unterkante, Pfeiler/Rippen im Bild liegen im 6-m- bzw. 3-m-Raster."""
    n = len(pts); zz = 3.2 * K.R.randrange(8); mat = MAT[kind]
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        u0 = 6.0 * K.R.randrange(4) if kind != 'b' else 3.0 * K.R.randrange(8)
        K.facade((a[0], a[1], z0), (b[0], b[1], z0), (a[0], a[1], z1), tint, per=PER, z0=zz, mat=mat, u0=u0)
    if roof: K.ngon([(p[0], p[1], z1) for p in pts], 'roof', 'hull_dark')
def underside(K, pts, z, tint='hull_dark'):
    K.ngon([(p[0], p[1], z) for p in reversed(pts)], 'plain', tint)
def band(K, pts, z, h=3.2, d=0.9, tint='hull_dark', glow=None, strip='wall_b', gh=0.14):
    """Vorspringendes Band (Technikgeschoss, Gesims, Brüstung) mit Ober- und Unterseite; optional Lichtfuge."""
    o = offset(pts, d); n = len(pts)
    for i in range(n):
        a, b = o[i], o[(i + 1) % n]; ia, ib = pts[i], pts[(i + 1) % n]
        K.surf((a[0], a[1], z), (b[0], b[1], z), (a[0], a[1], z + h), strip, tint)
        K.poly([(ia[0], ia[1], z + h), (ib[0], ib[1], z + h), (b[0], b[1], z + h), (a[0], a[1], z + h)], [(0, 0.5)] * 4, (0.05, 0.05, 0.06), 'kit_trim')
        K.poly([(a[0], a[1], z), (b[0], b[1], z), (ib[0], ib[1], z), (ia[0], ia[1], z)], [(0, 0.5)] * 4, (0.03, 0.03, 0.035), 'kit_trim')
        if glow:
            L, ex, ey, nx, ny = _edge(a, b); mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            K.glow(glow, (mx + nx * 0.02, my + ny * 0.02, z + h * 0.5), (ex, ey, 0), (0, 0, 1), L * 0.94, gh)
def parapet(K, pts, z, h=1.2, d=0.25, tint='hull_dark'):
    band(K, pts, z - 0.4, h + 0.4, d, tint, strip='beam')
def ledges(K, pts, z0, z1, step=12.8, h=0.45, d=0.5, tint='hull_dark'):
    """Schmale Gesimse in festem Abstand."""
    z = z0 + step
    while z < z1 - 2: band(K, pts, z - h / 2, h, d, tint, strip='beam'); z += step
def fins(K, pts, z0, z1, step=6.0, d=0.7, w=0.45, strip='beam', tint='hull_dark', minlen=5.0):
    """Senkrechte Rippen vor der Fassade."""
    n = len(pts)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]; L, ex, ey, nx, ny = _edge(a, b)
        if L < minlen: continue
        m = int(round(L / step)); st = L / max(1, m)
        for k in range(1, m):
            t = k * st; px, py = a[0] + ex * t + nx * d / 2, a[1] + ey * t + ny * d / 2
            K.box((w, d, z1 - z0), (px, py, z0), side=strip, tint=tint, bevel=0.0, rz=math.atan2(ey, ex), along='z', bottom=True)
def rrect(cx, cy, sx, sy, rz):
    c, s = math.cos(rz), math.sin(rz)
    return [(cx + dx * c - dy * s, cy + dx * s + dy * c) for (dx, dy) in ((-sx / 2, -sy / 2), (sx / 2, -sy / 2), (sx / 2, sy / 2), (-sx / 2, sy / 2))]
def pier(K, x, y, w, d, rz, z0, z1, tint=T_DARK, cap=True):
    """Pfeiler mit Paneelfassade (statt eines glatten Kastens), oben mit kleiner Abdeckplatte."""
    p = rrect(x, y, w, d, rz); shaft(K, p, z0, z1, 'b', tint)
    if cap: band(K, p, z1 - 0.5, 0.7, 0.18, 'hull_dark', strip='beam')
def piers(K, pts, z0, z1, s=2.2, over=5.0, tint='hull_dark', spike=0.0, idx=None, strip='girder'):
    """Pfeiler an den Ecken, über das Dach hinausgeführt; optional mit Spitze."""
    cx, cy = center(pts)
    for i, p in enumerate(pts):
        if idx is not None and i not in idx: continue
        rz = round(math.atan2(p[1] - cy, p[0] - cx) / (PI / 4)) * PI / 4
        pier(K, p[0], p[1], s, s, rz, z0, z1 + over)
        if spike: K.tube((p[0], p[1], z1 + over), (p[0], p[1], z1 + over + spike), s * 0.3, 'pipe', tint, 6, r2=0.06, caps=False)
def slab(K, a, b, t0, t1, d, z0, z1, kind='b', tint='none', strut=True, top=True):
    """Angesetzte Scheibe vor einer Kante: eigener Baukörper mit Fassade und Brüstung; beginnt sie über dem Boden, bekommt sie Unterseite und Streben."""
    p = edge_rect(a, b, t0, t1, d)
    shaft(K, p, z0, z1, kind, tint)
    if top: parapet(K, p, z1, 1.0, 0.2)
    if z0 > 1.0:
        underside(K, p, z0); band(K, p, z0, 1.2, 0.25, 'hull_dark', strip='girder')
        if strut:
            for (w_, q) in ((p[3], p[0]), (p[2], p[1])): K.beam((w_[0], w_[1], z0 - d * 1.3), (q[0], q[1], z0 + 0.2), 0.6, 0.6, 'girder', 'hull_dark', bevel=0.0)
    return p
def pod(K, x, y, z, sx, sy, sz, dirx, diry, kind='c', tint=T_MID):
    """Auskragendes Modul: Fassaden außen, dunkle Unterseite, Rahmen oben und unten, zwei Streben schräg zur Wand."""
    pts = rect(x, y, sx, sy); shaft(K, pts, z, z + sz, kind, tint); underside(K, pts, z)
    band(K, pts, z + sz - 0.8, 1.2, 0.3, 'hull_dark', strip='beam'); band(K, pts, z - 0.3, 0.9, 0.3, 'hull_dark', strip='girder')
    for s in (-1, 1):
        ox, oy = -diry * s * sx * 0.35, dirx * s * sy * 0.35
        K.beam((x - dirx * sx * 0.55 + ox, y - diry * sy * 0.55 + oy, z - sz * 0.9), (x + dirx * sx * 0.4 + ox, y + diry * sy * 0.4 + oy, z), 0.5, 0.5, 'girder', 'hull_dark', bevel=0.0)

# ------------------------------------------------------------------ Bausteine: Dach und Krone
def spire(K, x, y, z, h, r=0.32, lamp=True, tint='hull_dark'):
    K.tube((x, y, z), (x, y, z + h * 0.5), r, 'pipe', tint, 6, r2=r * 0.62, caps=False)
    K.tube((x, y, z + h * 0.5), (x, y, z + h), r * 0.6, 'pipe', tint, 5, r2=0.04, caps=False)
    K.tube((x, y, z + h * 0.5 - 0.25), (x, y, z + h * 0.5 + 0.25), r * 1.5, 'plain', tint, 6)
    if lamp: K.glowbox('redlamp', (0.45, 0.45, 0.45), (x, y, z + h)); K.light('redlamp', (x, y, z + h), 5.0)
def blade(K, x, y, z, h, w=1.6, d=0.6, rz=0.0, tint='hull_dark'):
    """Klinge: schmale hohe Scheibe, oben abgesetzt (Blitzableiter, Zierpfeiler der Krone)."""
    K.box((w, d, h * 0.62), (x, y, z), side='girder', tint=tint, bevel=0.0, rz=rz, along='z', bottom=True)
    K.box((w * 0.5, d * 0.7, h * 0.4), (x, y, z + h * 0.6), side='beam', tint=tint, bevel=0.0, rz=rz, along='z', bottom=True)
def crown_spikes(K, pts, z, n=6, h=(8, 26), blades=0.5):
    """Bündel aus Antennen und Klingen, verteilt über die Dachfläche."""
    x0, x1, y0, y1 = bounds(pts); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; R = K.R
    for k in range(n):
        px, py = cx + (R.random() - 0.5) * (x1 - x0) * 0.62, cy + (R.random() - 0.5) * (y1 - y0) * 0.62; hh = R.uniform(*h)
        if R.random() < blades: blade(K, px, py, z, hh, R.uniform(1.0, 2.2), R.uniform(0.4, 0.8), R.choice([0, PI / 2]))
        else: spire(K, px, py, z, hh, R.uniform(0.2, 0.4), lamp=R.random() < 0.6)
def roof_mech(K, pts, z, n=4):
    """Dachaufbauten: Technikhäuser, Lüfter, Tanks, Schüsseln, Leitungen."""
    x0, x1, y0, y1 = bounds(pts); cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; R = K.R; sx, sy = (x1 - x0) * 0.56, (y1 - y0) * 0.56
    for k in range(n):
        px, py = cx + (R.random() - 0.5) * sx, cy + (R.random() - 0.5) * sy; t = R.random()
        if t < 0.4:
            bx, by, bz = R.uniform(2.5, max(3.0, min(8, sx))), R.uniform(2.5, max(3.0, min(6, sy))), R.uniform(2.4, 5.0)
            K.box((bx, by, bz), (px, py, z), side='siding', top='roof', tint=R.choice(['hull_mid', 'hull_dark', 'hull']), bevel=0.05)
            if R.random() < 0.6: K.vent_unit((px, py, z + bz), sx=min(2.2, bx - 0.6), sy=min(2.2, by - 0.6), sz=1.0)
            if R.random() < 0.5: K.pipe([(px + bx / 2 + 0.3, py, z + 0.4), (px + bx / 2 + 0.3, py, z + bz + 1.6)], 0.28, 'steel')
        elif t < 0.65: K.vent_unit((px, py, z), R.choice([0, PI / 2]), sx=2.6, sy=2.6, sz=1.4)
        elif t < 0.8: K.tank(R.uniform(1.0, 1.6), R.uniform(3.5, 6), (px, py, z), R.choice([0, PI / 2]), R.choice(['hull_light', 'hull_mid', 'white']), None)
        elif t < 0.92: K.dish(R.uniform(1.4, 2.4), (px, py, z), R.uniform(0, 6.28), 0.7)
        else: K.antenna(R.uniform(8, 16), (px, py, z))
def avlights(K, pts, z):
    for p in pts[::2]: K.glowbox('redlamp', (0.5, 0.5, 0.5), (p[0], p[1], z + 0.4)); K.light('redlamp', (p[0], p[1], z + 0.4), 5.0)
def step_crown(K, pts, z, levels=3, kind='b', tint=T_DARK, glow='cool', spikes=5):
    """Gestufte Krone: schrumpfende Aufsätze mit Lichtfuge, darauf Klingen und Antennen."""
    cx, cy = center(pts); cur = pts
    for k in range(levels):
        s = 0.8 - k * 0.04; cur = [(cx + (p[0] - cx) * s, cy + (p[1] - cy) * s) for p in cur]; h = K.R.uniform(5.0, 9.0)
        shaft(K, cur, z, z + h, kind, tint); band(K, cur, z, 0.9, 0.35, 'hull_dark', glow if k < 2 else None, strip='beam'); parapet(K, cur, z + h, 0.9, 0.2)
        z += h
    crown_spikes(K, cur, z, spikes, (10, 30)); avlights(K, cur, z)
    return z
def lattice_crown(K, pts, z, h=18.0, sign=None):
    """Offene Gitterkrone über einem Rechteck: Stützen, Riegel, Diagonalen; optional Leuchtschrift an der Vorderseite."""
    n = len(pts)
    for i, q in enumerate(pts):
        K.beam((q[0], q[1], z), (q[0], q[1], z + h), 0.55, 0.55, 'girder', 'hull_dark', bevel=0.0)
        q2 = pts[(i + 1) % n]
        for k in range(1, 4):
            zz = z + h * k / 3; K.beam((q[0], q[1], zz), (q2[0], q2[1], zz), 0.4, 0.4, 'girder', 'hull_dark', bevel=0.0)
            K.beam((q[0], q[1], zz - h / 3), (q2[0], q2[1], zz), 0.22, 0.22, 'beam', 'hull_mid', bevel=0.0)
    if sign:
        a, b = pts[0], pts[1]; L, ex, ey, nx, ny = _edge(a, b)
        K.neon(sign, ((a[0] + b[0]) / 2 + nx * 0.4, (a[1] + b[1]) / 2 + ny * 0.4, z + h * 0.5), (ex, ey, 0), (0, 0, 1), L * 0.92)
    avlights(K, pts, z + h)

# ------------------------------------------------------------------ Bausteine: Anbauten
def landing_pad(K, x, y, z, dx, dy, r=8.0, arm=3.0):
    """Auskragende Landeplattform: (x, y) liegt auf der Fassade, (dx, dy) zeigt nach außen."""
    cx, cy = x + dx * (arm + r), y + dy * (arm + r); px, py = -dy, dx
    K.tube((cx, cy, z - 0.9), (cx, cy, z), r, 'hazard', 'none', 12, mode='around', cap_tint='hull_mid')
    K.tube((cx, cy, z - 2.2), (cx, cy, z - 0.9), r * 0.55, 'girder', 'hull_dark', 10, mode='around', r2=r * 0.96, caps=False)
    with K.at((x + dx * (arm + 1) / 2, y + dy * (arm + 1) / 2, z - 0.9), math.atan2(dy, dx)):
        K.box((arm + 2.5, 4.4, 0.8), (0, 0, 0), side='beam', top='floor', tint='hull_dark', bevel=0.0, bottom=True)
    for s in (-1, 1):
        K.beam((x + px * s * 2.6, y + py * s * 2.6, z - r * 1.1), (cx + px * s * r * 0.5, cy + py * s * r * 0.5, z - 1.4), 0.6, 0.6, 'girder', 'hull_dark', bevel=0.0)
    for i in range(6):
        a = i / 6 * 2 * PI + 0.5; lx, ly = cx + math.cos(a) * (r - 0.5), cy + math.sin(a) * (r - 0.5)
        K.glowbox('lamp', (0.35, 0.35, 0.25), (lx, ly, z + 0.12)); K.light('lamp', (lx, ly, z + 0.2), 3.0)
    K.glow('light', (cx, cy, z + 0.02), (1, 0, 0), (0, 1, 0), r * 0.9, 0.3); K.glow('light', (cx, cy, z + 0.02), (0, 1, 0), (-1, 0, 0), r * 0.9, 0.3)
def billboard(K, x, y, z, nx, ny, w, name, depth=0.8, legs=0.0, glow=None):
    """Werbetafel mit Rahmen: (x, y) auf der Fassade, (nx, ny) Blickrichtung, z = Mitte. legs > 0: steht auf Stützen auf dem Dach, z = Dachhöhe."""
    import kit_lib as L_
    d = L_.CITY.get(name) or L_.CITY2[name]; h = w * d['h'] / d['w']
    if legs: z = z + legs + h / 2 + 0.4
    with K.at((x, y, z), _face(nx, ny)):
        K.box((w + 0.8, depth, h + 0.8), (0, -depth / 2, -h / 2 - 0.4), side='beam', tint='hull_dark', bevel=0.0, bottom=True)
        K.box((w + 0.1, 0.1, h + 0.1), (0, -depth - 0.05, -h / 2 - 0.05), side='plain', tint='black', bevel=0.0, bottom=True)
        K.neon(name, (0, -depth - 0.1, 0), (1, 0, 0), (0, 0, 1), w, h)
        if glow: K.glow(glow, (0, -depth - 0.06, -h / 2 - 0.25), (1, 0, 0), (0, 0, 1), w, 0.12)
        for s in (-1, 1):
            K.beam((s * w * 0.4, 0.1, h * 0.3), (s * w * 0.4, -depth - 0.9, h / 2 + 0.6), 0.14, 0.14, 'beam', 'hull_mid', bevel=0.0)
            K.glowbox('cool', (0.5, 0.25, 0.18), (s * w * 0.4, -depth - 0.9, h / 2 + 0.55))
            if legs:
                K.beam((s * w * 0.42, -depth / 2, -h / 2 - 0.4 - legs), (s * w * 0.42, -depth / 2, -h / 2 - 0.4), 0.4, 0.4, 'girder', 'hull_dark', bevel=0.0)
                K.beam((s * w * 0.42, -depth / 2 + 2.4, -h / 2 - 0.4 - legs), (s * w * 0.42, -depth / 2, -h / 2), 0.25, 0.25, 'beam', 'hull_dark', bevel=0.0)
    K.light('screen', (x + nx * (depth + 0.5), y + ny * (depth + 0.5), z), max(6.0, w * 0.7))
def lstrip(K, x, y, z0, z1, kind='light', w=0.4):
    """Senkrechtes Lichtband."""
    K.glowbox(kind, (w, w, z1 - z0), (x, y, (z0 + z1) / 2))
def edge_strip(K, a, b, t, z0, z1, kind='light', w=0.45, frame=True):
    """Lichtband vor einer Fassade (bei t der Kantenlänge), in dunklem Rahmen."""
    L, ex, ey, nx, ny = _edge(a, b); x, y = a[0] + ex * L * t, a[1] + ey * L * t; rz = math.atan2(ey, ex)
    if frame:
        for s in (-1, 1): K.box((0.5, 1.0, z1 - z0), (x + ex * s * (w / 2 + 0.3) + nx * 0.5, y + ey * s * (w / 2 + 0.3) + ny * 0.5, z0), side='beam', tint='hull_dark', bevel=0.0, rz=rz, along='z', bottom=True)
    with K.at((x + nx * 0.35, y + ny * 0.35, (z0 + z1) / 2), _face(nx, ny)): K.glow(kind, (0, 0, 0), (1, 0, 0), (0, 0, 1), w, z1 - z0)
def risers(K, a, b, t, z0, z1, n=3, r=0.3, tint='hull_mid'):
    """Steigleitungen vor der Fassade, mit Schellen."""
    L, ex, ey, nx, ny = _edge(a, b); cols = ['steel', tint, 'hull_dark', 'rust', 'yellow']
    for k in range(n):
        tt = t * L + (k - (n - 1) / 2) * r * 3.0; px, py = a[0] + ex * tt + nx * (r + 0.3), a[1] + ey * tt + ny * (r + 0.3)
        K.tube((px, py, z0), (px, py, z1), r, 'pipe', cols[k % len(cols)] if k else tint, 8, caps=False)
    z = z0 + 4.0
    while z < z1:
        with K.at((a[0] + ex * t * L + nx * (r + 0.3), a[1] + ey * t * L + ny * (r + 0.3), z), math.atan2(ey, ex)): K.box((n * r * 3.0 + 0.4, r * 2 + 0.7, 0.3), (0, 0, 0), side='beam', tint='hull_dark', bevel=0.0, bottom=True)
        z += 9.6
def ac_units(K, pts, z0, z1, n=10):
    """Klimakästen verteilt über die Fassaden (im Geschossraster)."""
    m = len(pts)
    for k in range(n):
        i = K.R.randrange(m); a, b = pts[i], pts[(i + 1) % m]; L, ex, ey, nx, ny = _edge(a, b)
        if L < 4: continue
        t = K.R.uniform(0.12, 0.88); z = z0 + 3.2 * K.R.randrange(1, max(2, int((z1 - z0) / 3.2))) + 0.3
        K.panel('vent', (a[0] + ex * L * t, a[1] + ey * L * t, z), math.atan2(ey, ex), 1.3, 1.0, 0.6, K.R.choice(['hull_light', 'hull_mid', 'hull']))
def balconies(K, a, b, z0, z1, t0=0.2, t1=0.8, step=6.4, d=1.6):
    """Balkonplatten mit Brüstung vor einer Kante."""
    L, ex, ey, nx, ny = _edge(a, b); w = L * (t1 - t0); mx, my = a[0] + ex * L * (t0 + t1) / 2, a[1] + ey * L * (t0 + t1) / 2; z = z0
    while z < z1:
        with K.at((mx + nx * d / 2, my + ny * d / 2, z), math.atan2(ey, ex)):
            K.box((w, d, 0.3), (0, 0, 0), side='beam', tint='hull_dark', bevel=0.0, bottom=True)
            K.box((w, 0.12, 1.0), (0, -d / 2 + 0.06, 0.3), side='beam', tint='hull_mid', bevel=0.0)
        z += step
def crane(K, x, y, z, h=26.0, jib=30.0, rz=0.0, tint='orange'):
    """Turmdrehkran: Gittermast, Ausleger mit Obergurt, Gegenausleger mit Ballast, Abspannung, Haken."""
    with K.at((x, y, z), rz):
        s = 0.9
        def B(a, b, w=0.2): K.beam(a, b, w, w, 'beam', tint, bevel=0.0)
        for sx in (-s, s):
            for sy in (-s, s): B((sx, sy, 0), (sx, sy, h), 0.24)
        k = 0; zz = 0.0
        while zz < h - 0.1:
            z2 = min(h, zz + 3.0); f = 1 if k % 2 else -1
            B((-s * f, -s, zz), (s * f, -s, z2), 0.12); B((-s * f, s, zz), (s * f, s, z2), 0.12); B((-s, -s * f, zz), (-s, s * f, z2), 0.12); B((s, -s * f, zz), (s, s * f, z2), 0.12)
            zz = z2; k += 1
        K.box((2.6, 2.6, 0.5), (0, 0, h), side='girder', tint='hull_dark', bevel=0.0, bottom=True)
        K.box((2.0, 1.6, 2.0), (1.6, -1.6, h - 2.2), side='plain', tint='hull_light', bevel=0.04, bottom=True); K.glass((1.6, -2.42, h - 1.1), (1, 0, 0), (0, 0, 1), 1.6, 1.0)
        zj = h + 0.5; back = jib * 0.32; top = (0, 0, zj + 6.0)
        B((0, 0, zj), top, 0.3)
        for sy in (-0.7, 0.7): B((-back, sy, zj), (jib, sy, zj), 0.2)
        B((0, 0, zj + 1.5), (jib, 0, zj + 1.5), 0.18)
        n = int(jib // 3)
        for i in range(n):
            x0, x1 = jib * i / n, jib * (i + 1) / n
            for sy in (-0.7, 0.7): B((x0, sy, zj), ((x0 + x1) / 2, 0, zj + 1.5), 0.1); B(((x0 + x1) / 2, 0, zj + 1.5), (x1, sy, zj), 0.1)
            B((x0, -0.7, zj), (x0, 0.7, zj), 0.1)
        B(top, (jib * 0.62, 0, zj + 1.5), 0.08); B(top, (-back, 0, zj + 0.3), 0.08)
        K.box((3.0, 1.8, 2.0), (-back + 1.6, 0, zj - 2.0), side='plain', tint='hull_mid', bevel=0.04, bottom=True)
        hx = jib * 0.7; K.tube((hx, 0, zj - 9.0), (hx, 0, zj), 0.04, 'hose', 'black', 4, caps=False); K.box((0.5, 0.5, 0.7), (hx, 0, zj - 9.6), side='plain', tint='yellow', bevel=0.03, bottom=True)
        K.glowbox('redlamp', (0.4, 0.4, 0.4), (0, 0, zj + 6.2)); K.glowbox('redlamp', (0.35, 0.35, 0.35), (jib, 0, zj + 0.4))
def podium(K, pts, h=10.0, signs=(), kind='b', tint=T_MID):
    """Sockel mit Läden: Paneelwand, Schaufensterband mit Licht, Vordächer, Gesims; Leuchtschriften an den langen Seiten."""
    if not PODIUM: return
    shaft(K, pts, 0.0, h, kind, tint); parapet(K, pts, h, 1.1, 0.35); k = 0
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]; L, ex, ey, nx, ny = _edge(a, b)
        if L < 6: continue
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        K.glow(K.R.choice(['light', 'lamp', 'cool', 'cool', 'screen']), (mx + nx * 0.03, my + ny * 0.03, 2.3), (ex, ey, 0), (0, 0, 1), L * 0.84, 3.4)
        K.box((L * 0.86, 0.3, 0.5), (mx + nx * 0.1, my + ny * 0.1, 0), side='plain', tint='hull_mid', bevel=0.0, rz=math.atan2(ey, ex))
        m = max(1, int(L // 5))
        for j in range(m + 1): K.box((0.35, 0.3, 4.4), (a[0] + ex * L * (0.07 + 0.86 * j / m) + nx * 0.15, a[1] + ey * L * (0.07 + 0.86 * j / m) + ny * 0.15, 0), side='beam', tint='hull_dark', bevel=0.0, rz=math.atan2(ey, ex), along='z')
        with K.at((mx + nx * 1.1, my + ny * 1.1, 4.5), math.atan2(ey, ex)): K.box((L * 0.9, 2.2, 0.3), (0, 0, 0), side='beam', top='roof', tint='hull_dark', bevel=0.0, bottom=True)
        if k < len(signs) and signs[k]: K.neon(signs[k], (mx + nx * 0.35, my + ny * 0.35, h - 2.2), (ex, ey, 0), (0, 0, 1), min(L * 0.7, 12.0))
        k += 1
def skybridge(K, a, b, z, w=6.0):
    """Laufbrücke mit Fachwerk: Deck, Ober- und Untergurt, Diagonalen, Glaswände, Lichtbänder, Lüfter auf dem Dach."""
    ax, ay = a; bx, by = b; L = math.hypot(bx - ax, by - ay); ux, uy = (bx - ax) / L, (by - ay) / L
    with K.at(((ax + bx) / 2, (ay + by) / 2, z), math.atan2(uy, ux)):
        K.box((L, w, 0.6), (0, 0, 0), side='beam', top='floor', tint='hull_dark', bevel=0.0, bottom=True)
        for s in (-1, 1):
            K.beam((-L / 2, s * w / 2, 4.2), (L / 2, s * w / 2, 4.2), 0.6, 0.6, 'girder', 'hull_dark', bevel=0.0)
            K.beam((-L / 2, s * w / 2, 0.0), (L / 2, s * w / 2, 0.0), 0.6, 0.6, 'girder', 'hull_dark', bevel=0.0)
            n = max(2, int(L // 5))
            for i in range(n):
                x0, x1 = -L / 2 + L * i / n, -L / 2 + L * (i + 1) / n
                K.beam((x0, s * w / 2, 0.3), (x1, s * w / 2, 4.0) if i % 2 == 0 else (x0, s * w / 2, 4.0), 0.3, 0.3, 'beam', 'hull_mid', bevel=0.0)
                K.beam((x1, s * w / 2, 0.3), (x1, s * w / 2, 4.0), 0.3, 0.3, 'beam', 'hull_mid', bevel=0.0)
            K.glass((0, s * (w / 2 - 0.2), 2.2), (1, 0, 0) if s < 0 else (-1, 0, 0), (0, 0, 1), L - 1.0, 3.4)
            K.glow('cool', (0, s * (w / 2 - 0.25), 3.9), (1, 0, 0) if s < 0 else (-1, 0, 0), (0, 0, 1), L - 2.0, 0.25)
        K.box((L, w, 0.4), (0, 0, 4.4), side='beam', top='roof', tint='hull_dark', bevel=0.0, bottom=True)
        K.box((L * 0.9, 1.2, 1.4), (0, 0, -1.4), side='girder', tint='hull_dark', bevel=0.0, bottom=True)
        m = max(1, int(L // 14))
        for i in range(m): K.vent_unit((-L / 2 + (i + 0.5) * L / m, 0, 4.8), sx=2.0, sy=2.0, sz=0.9)

# ------------------------------------------------------------------ Turmtypen
def tower_konzern(K, c, h=236.0, sign='n_lumen'):
    """Konzernturm: Glasschaft mit Rippen zwischen zwei dunklen Paneelscheiben, roter Akzentstreifen, weiße Lichtbänder, Himmelsfoyer,
    großes Leuchtzeichen, gestufte Krone mit Klingen, Landeplattform."""
    x, y = c; h = F32(h)
    podium(K, chamfer(x, y, 44, 38, 6), 12.8, (sign, 'n_klinik', None, 'n_volta'), 'b', T_MID)
    pA = chamfer(x, y, 32, 26, 5); zl = F32(h * 0.5)
    shaft(K, pA, 12.8, zl, 'a', T_BLUE); fins(K, pA, 12.8, zl, 6.0, 0.9, 0.5)
    # Himmelsfoyer: eingezogen, Stützen, Lichtfugen
    pG = chamfer(x, y, 24, 19, 4); shaft(K, pG, zl, zl + 9.6, 'a', T_LIGHT, roof=False); underside(K, pA, zl + 9.6)
    for q in offset(pG, 3.0): K.box((1.1, 1.1, 9.6), (q[0], q[1], zl), side='girder', tint='hull_dark', bevel=0.0, along='z', bottom=True)
    band(K, pA, zl - 1.2, 1.2, 0.5, 'hull_dark', 'light', strip='beam'); band(K, pA, zl + 9.6, 1.6, 0.5, 'hull_dark', 'light', strip='beam')
    shaft(K, pA, zl + 11.2, h, 'a', T_BLUE); fins(K, pA, zl + 11.2, h, 6.0, 0.9, 0.5)
    ledges(K, pA, 12.8, zl - 4, 25.6, 0.6, 1.1); ledges(K, pA, zl + 11.2, h, 25.6, 0.6, 1.1)
    # Paneelscheiben an den Schmalseiten (+x und -x), verschieden hoch; roter Streifen auf der höheren
    e_f = (pA[0], pA[1]); e_r = (pA[2], pA[3]); e_b = (pA[4], pA[5]); e_l = (pA[6], pA[7]); zr = F32(h * 0.86); zq = F32(h * 0.7)
    sr = slab(K, e_r[0], e_r[1], -0.12, 1.12, 6.5, 0.0, zr, 'b', T_DARK); sl = slab(K, e_l[0], e_l[1], 0.0, 1.0, 5.0, 0.0, zq, 'b', T_MID)
    slab(K, sr[0], sr[1], 0.25, 0.75, 2.4, 32.0, F32(h * 0.78), 'b', T_RED); ledges(K, sr, 12.8, zr, 12.8, 0.4, 0.4)
    roof_mech(K, sr, zr, 2); crown_spikes(K, sr, zr, 3, (8, 18), 0.7); roof_mech(K, sl, zq, 3); crown_spikes(K, sl, zq, 3, (6, 14), 0.3)
    # Lichtbänder: weiß, senkrecht, an den Fugen zwischen Schaft und Scheiben
    for (a, b, t) in ((e_f[0], e_f[1], 1.0), (e_f[0], e_f[1], 0.0), (e_b[0], e_b[1], 0.0), (e_b[0], e_b[1], 1.0)):
        L, ex, ey, nx, ny = _edge(a, b); px, py = a[0] + ex * L * t + nx * 0.5, a[1] + ey * L * t + ny * 0.5
        lstrip(K, px, py, 14.0, zl - 2.0, 'light', 0.5); lstrip(K, px, py, zl + 13.0, h - 4.0, 'light', 0.5)
    # Leuchtzeichen
    L, ex, ey, nx, ny = _edge(*e_f); mx, my = (e_f[0][0] + e_f[1][0]) / 2, (e_f[0][1] + e_f[1][1]) / 2
    billboard(K, mx, my, h * 0.8, nx, ny, 20.0, sign, 1.2, glow='cool')
    L, ex, ey, nx, ny = _edge(sr[0], sr[1]); billboard(K, (sr[0][0] + sr[1][0]) / 2, (sr[0][1] + sr[1][1]) / 2 - 9, h * 0.22, nx, ny, 9.0, 'a_lumen', 0.9)
    L, ex, ey, nx, ny = _edge(sl[0], sl[1]); billboard(K, (sl[0][0] + sl[1][0]) / 2, (sl[0][1] + sl[1][1]) / 2, h * 0.42, nx, ny, 15.0, sign, 1.0, glow='light')
    edge_strip(K, sl[0], sl[1], 0.14, 16.0, zq - 4, 'light', 0.5); edge_strip(K, sl[0], sl[1], 0.86, 16.0, h * 0.34, 'light', 0.5)
    landing_pad(K, x + 4, pA[4][1], zl + 0.9, 0, 1, 9.0, 3.0)
    risers(K, e_b[0], e_b[1], 0.3, 12.8, zl, 4, 0.35); ac_units(K, sl, 14, zq - 4, 10)
    ztop = step_crown(K, pA, h, 3, 'b', T_DARK, 'light', 6)
    spire(K, x, y, ztop, 34.0, 0.6)
def tower_stufen(K, c, h=176.0, sign='n_kapsel'):
    """Stufenturm: fünf Stufen mit abgeschrägten Ecken, Eckpfeiler mit Klingen, Terrassen mit Technik, Steigleitungen, Kran auf einer Terrasse."""
    x, y = c; R = K.R
    podium(K, chamfer(x, y, 46, 44, 8), 9.6, (sign, None, 'n_nudel', None, 'n_bier', None, 'n_robo', None), 'b', T_MID)
    segs = [(40, 38, 7, 0.30, 'b', T_MID), (34, 31, 6, 0.52, 'c', T_SAND), (27, 25, 5, 0.72, 'b', T_DARK), (20, 18, 4, 0.88, 'a', T_GREEN), (13, 12, 2.5, 1.0, 'b', T_DARK)]
    zprev = 9.6; off = [(0, 0), (1.5, 2.0), (-1.0, 3.0), (0.5, 1.0), (0.0, 1.5)]; zc = 0.0
    for k, (sx, sy, ch, a1, kind, tint) in enumerate(segs):
        z0 = zprev; z1 = F32(h * a1); p = chamfer(x + off[k][0], y + off[k][1], sx, sy, ch)
        shaft(K, p, z0, z1 - 3.2, kind, tint); band(K, p, z1 - 3.2, 3.2, 1.0, 'hull_dark', 'cool' if k % 2 == 0 else 'lamp'); parapet(K, p, z1, 1.2, 1.0)
        if kind != 'b': fins(K, p, z0, z1 - 3.2, 6.0, 0.6, 0.4)
        else: ledges(K, p, z0, z1 - 4, 12.8, 0.45, 0.5)
        # Eckpfeiler an den Schrägen, über die Terrasse hinaus, darauf Klingen
        for i in (1, 3, 5, 7):
            a, b = p[i], p[(i + 1) % 8]; mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; L, ex, ey, nx, ny = _edge(a, b)
            pier(K, mx + nx * 0.5, my + ny * 0.5, ch * 0.9, 1.8, math.atan2(ey, ex), z0, z1 + 4.0)
            blade(K, mx + nx * 0.5, my + ny * 0.5, z1 + 4.0, R.uniform(6, 13), ch * 0.5, 0.8, math.atan2(ey, ex))
        if k < 4: roof_mech(K, p, z1, 5); ac_units(K, p, z0 + 2, z1 - 5, 8)
        if k == 0:
            for (i, t) in ((0, 0.25), (0, 0.75), (4, 0.3), (4, 0.7)): risers(K, p[i], p[i + 1], t, 9.6, z1 - 3, 3, 0.3)
            slab(K, p[2], p[3], 0.2, 0.8, 5.0, 0.0, z1 + 12.8, 'c', T_LIGHT); balconies(K, p[6], p[7], 16.0, z1 - 6, 0.15, 0.85)
        if k == 1: billboard(K, (p[0][0] + p[1][0]) / 2, p[0][1], z0 + 16, 0, -1, 13.0, 'a_volta', 0.9); landing_pad(K, p[2][0], (p[2][1] + p[3][1]) / 2, z1 - 6.4, 1, 0, 8.0, 2.5)
        if k == 2: billboard(K, p[7][0], (p[6][1] + p[7][1]) / 2, z0 + 12, -1, 0, 14.0, 'n_volta', 0.8); edge_strip(K, p[0], p[1], 0.5, z0 + 3, z1 - 6, 'light', 0.5); zc = z1
        zprev = z1
    top = chamfer(x, y + 1.5, 13, 12, 2.5); crown_spikes(K, top, zprev, 6, (12, 30), 0.5); avlights(K, top, zprev)
    crane(K, x - 1.0 - 27 / 2 + 2.6, y + 3.0 - 25 / 2 + 2.6, zc, 22.0, 26.0, -0.6)
def tower_kern(K, c, h=196.0, sign='n_volta'):
    """Kernturm: schlanker Paneelkern mit Eckpfeilern, daran gestapelte Module verschiedener Größe auf Streben, gläserner Aufzug, Gitterkrone."""
    x, y = c; R = K.R; h = F32(h)
    podium(K, rect(x, y, 36, 36), 9.6, (sign, 'n_spaeti', 'n_karaoke', 'n_pfand'), 'b', T_MID)
    p = rect(x, y, 18, 18); shaft(K, p, 9.6, h, 'b', T_DARK); piers(K, p, 9.6, h, 2.4, 0.0, 'hull_dark')
    z = 38.4
    while z < h - 10: band(K, p, z, 1.6, 0.6, 'hull_dark', 'accent', strip='beam'); z += 38.4
    k = 0; z = 16.0
    while z < h - 22:
        side = k % 4; sx, sy = R.uniform(11, 17), R.uniform(10, 15); sz = 3.2 * R.randint(3, 5)
        dx, dy = ((1, 0), (0, 1), (-1, 0), (0, -1))[side]; sh = R.uniform(-2.5, 2.5)
        px, py = x + dx * (9 + sx / 2 - 2.5) - dy * sh, y + dy * (9 + sy / 2 - 2.5) + dx * sh
        zz = F32(z); pod(K, px, py, zz, sx, sy, sz, dx, dy, R.choice(['c', 'c', 'a', 'b']), R.choice([T_MID, T_LIGHT, T_SAND, T_GREEN]))
        pp = rect(px, py, sx, sy)
        if R.random() < 0.6: roof_mech(K, pp, zz + sz + 0.4, 2)
        if R.random() < 0.45: K.neon(R.choice(VERT), (px + dx * (sx / 2 + 0.35), py + dy * (sy / 2 + 0.35), zz + sz * 0.5), (-dy, dx, 0), (0, 0, 1), 2.2)
        if R.random() < 0.3: billboard(K, px + dx * sx / 2, py + dy * sy / 2, zz + sz * 0.55, dx, dy, min(sy if dx else sx, 9.0) * 0.8, R.choice(ADS + ICON), 0.6)
        z += sz * R.uniform(0.45, 0.8); k += 1
    # Aufzugsschacht: Rohr mit Ringen, Lichtband und Kabine
    ex_, ey_ = x - 5, y - 10.6
    K.tube((ex_, ey_, 9.6), (ex_, ey_, h - 4), 1.7, 'siding', 'hull_dark', 8, mode='around', caps=False)
    for zz in range(14, int(h - 6), 10): K.tube((ex_, ey_, zz), (ex_, ey_, zz + 0.35), 1.9, 'plain', 'steel', 8, caps=False)
    K.glowbox('cool', (1.7, 1.7, 2.8), (ex_, ey_ - 1.0, h * 0.52)); lstrip(K, ex_, ey_ - 1.75, 12.0, h - 6, 'cool', 0.16)
    risers(K, p[1], p[2], 0.5, 9.6, h - 4, 3, 0.4)
    lattice_crown(K, p, h, 20.0, sign); crown_spikes(K, p, h + 20.0, 3, (14, 30), 0.0); roof_mech(K, p, h, 3)
    landing_pad(K, x, y + 9, F32(h * 0.78), 0, 1, 7.5, 2.0)
def tower_rund(K, c, h=170.0, sign='n_kapsel'):
    """Rundturm: drei runde Abschnitte, Rippen an jeder Kante, Lichtringe, Strebepfeiler mit Klingen, Kuppel mit Laterne und Spitze."""
    x, y = c
    podium(K, circle(x, y, 23, 12, PI / 12), 9.6, (sign, None, None, 'n_klinik', None, None, 'n_robo', None, None, 'n_bier'), 'b', T_MID)
    zs = [9.6, F32(h * 0.44), F32(h * 0.78), F32(h)]
    for k, r in enumerate((17.0, 14.0, 10.5)):
        z0, z1 = zs[k], zs[k + 1]; p = circle(x, y, r, 16, PI / 16)
        shaft(K, p, z0, z1 - 3.2, 'a' if k != 1 else 'c', (T_BLUE, T_SAND, T_GREEN)[k]); band(K, p, z1 - 3.2, 3.2, 1.2, 'hull_dark', 'lamp'); parapet(K, p, z1, 1.1, 1.2)
        for q in offset(p, 0.35): K.box((0.7, 0.9, z1 - 3.2 - z0), (q[0], q[1], z0), side='beam', tint='hull_dark', bevel=0.0, rz=math.atan2(q[1] - y, q[0] - x) + PI / 2, along='z', bottom=True)
        ledges(K, p, z0, z1 - 4, 12.8, 0.4, 0.55)
    for i in range(4):
        a = i * PI / 2 + PI / 4; ca, sa = math.cos(a), math.sin(a)
        pier(K, x + ca * 18.6, y + sa * 18.6, 1.6, 4.4, a + PI / 2, 9.6, zs[1] + 6)
        blade(K, x + ca * 18.6, y + sa * 18.6, zs[1] + 6, 12.0, 2.4, 0.9, a)
        pier(K, x + ca * 15.2, y + sa * 15.2, 1.4, 3.4, a + PI / 2, zs[1], zs[2] + 5)
    K.sphere(10.5, (x, y, zs[3]), 'hull_mid', 'wall_b', 24, 12, 0.6)
    K.tube((x, y, zs[3] + 5.5), (x, y, zs[3] + 9.5), 2.4, 'girder', 'hull_dark', 10, mode='around'); K.glowbox('lamp', (3.0, 3.0, 1.2), (x, y, zs[3] + 8.0))
    spire(K, x, y, zs[3] + 9.5, 30.0, 0.6)
    billboard(K, x, y - 17.2, zs[1] - 18, 0, -1, 15.0, sign, 0.9, glow='lamp'); billboard(K, x + 17.2, y, 36.0, 1, 0, 10.0, 'a_volta', 0.8)
    landing_pad(K, x - 13.6, y, zs[2] - 9.6, -1, 0, 7.0, 2.0)
def tower_werk(K, c, h=142.0, sign='n_robo'):
    """Industrieturm: Paneelquader im außenliegenden rostigen Tragwerk (Stützen, Riegel, Andreaskreuze), Tanks, Schlote, Steigleitungen, Kran."""
    x, y = c; h = F32(h)
    podium(K, rect(x, y, 38, 30), 9.6, (sign, None, 'n_pfand', None), 'b', T_DARK)
    zm = F32(h * 0.66)
    p = rect(x, y, 28, 22); shaft(K, p, 9.6, zm, 'b', T_SAND); z = 35.2
    while z < zm - 6: band(K, p, z, 3.2, 0.8, 'hull_dark', None); z += 28.8
    o = offset(p, 2.0)
    for q in o: K.box((1.4, 1.4, zm + 3 - 9.6), (q[0], q[1], 9.6), side='girder', tint='rust', bevel=0.0, along='z', bottom=True)
    for i in range(4):
        a, b = o[i], o[(i + 1) % 4]; mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        K.box((1.0, 1.0, zm + 3 - 9.6), (mx, my, 9.6), side='girder', tint='rust', bevel=0.0, along='z', bottom=True)
        z = 9.6
        while z < zm + 1:
            K.beam((a[0], a[1], z), (b[0], b[1], z), 0.7, 0.7, 'girder', 'rust', bevel=0.0)
            if z + 12.8 <= zm + 3:
                for (u, v) in ((a, (mx, my)), ((mx, my), b)):
                    K.beam((u[0], u[1], z), (v[0], v[1], z + 12.8), 0.3, 0.3, 'beam', 'hull_dark', bevel=0.0); K.beam((v[0], v[1], z), (u[0], u[1], z + 12.8), 0.3, 0.3, 'beam', 'hull_dark', bevel=0.0)
            z += 12.8
    parapet(K, p, zm, 1.2, 0.3)
    p2 = rect(x - 5, y + 2, 16, 15); shaft(K, p2, zm, h, 'c', T_MID); band(K, p2, h - 3.2, 3.2, 0.8, 'hull_dark', 'redlamp'); parapet(K, p2, h, 1.1, 0.8); piers(K, p2, zm, h, 1.6, 3.0, 'hull_dark', 8.0)
    K.tank(3.0, 10.0, (x + 8.5, y - 5, zm), PI / 2, 'hull_light', 'p_caution'); K.silo(3.2, 11.0, (x + 9, y + 6, zm), 'hull_mid'); K.tank(1.6, 6.0, (x + 3.5, y - 8.5, zm), 0, 'white', None)
    for (sx_, sy_, r_, hh) in ((x - 10, y - 8, 2.0, 62.0), (x - 6, y - 8.5, 1.3, 44.0)):
        K.tube((sx_, sy_, zm), (sx_, sy_, zm + hh), r_, 'siding', 'hull_light', 12, mode='around', r2=r_ * 0.7)
        for t in (0.35, 0.65, 0.95): K.tube((sx_, sy_, zm + hh * t), (sx_, sy_, zm + hh * t + 0.9), r_ * (1.0 - 0.3 * t) + 0.12, 'hazard', 'none', 12, mode='around', caps=False)
        K.glowbox('redlamp', (0.5, 0.5, 0.5), (sx_ + r_, sy_, zm + hh))
    K.pipe([(x + 16.6, y - 6, 10.2), (x + 16.6, y - 6, zm - 3.0), (x + 10, y - 6, zm + 0.8)], 0.7, 'yellow'); K.pipe([(x + 16.6, y + 5, 10.2), (x + 16.6, y + 5, zm - 6.0)], 0.5, 'steel')
    risers(K, p[2], p[3], 0.3, 9.6, zm, 4, 0.35, 'rust'); risers(K, p[0], p[1], 0.75, 9.6, zm - 8, 3, 0.3)
    roof_mech(K, p2, h, 3); crown_spikes(K, p2, h, 3, (8, 18), 0.2)
    billboard(K, x, y - 13.2, zm - 22, 0, -1, 17.0, sign, 1.0, glow='lamp'); billboard(K, x - 16.2, y, 40.0, -1, 0, 11.0, 'a_lumen', 0.8)
    crane(K, x + 9, y + 0, zm, 20.0, 28.0, 2.2)
def tower_bundle(K, c, seed=1, h=150.0, w=28.0, d=24.0, far=False, sign=None, zbase=None):
    """Bündelturm (Varianten nach seed): Hauptschaft, daran zwei bis vier Scheiben verschiedener Höhe, wechselnde Fassaden und Kronen,
    Gesimse, Rippen, Leitungen, Werbetafeln, Lichtbänder, Landeplattform. far=True: sparsame Fassung für den Hintergrund.
    zbase: Höhe eines fremden Unterbaus; der Turm beginnt dort und bekommt keinen eigenen Sockel. h ist immer die Höhe der Oberkante."""
    x, y = c; R = random.Random(seed * 7919 + 13); KR = K.R; K.R = R
    try:
        km, ks = R.choice([('b', 'a'), ('a', 'b'), ('c', 'b'), ('b', 'c'), ('b', 'b'), ('a', 'c'), ('c', 'a')]); tm = R.choice(PALETTE); ts = R.choice(PALETTE)
        ch = R.choice([0, 0, w * 0.14, w * 0.2]); base = chamfer(x, y, w, d, ch) if ch else rect(x, y, w, d)
        h = F32(h); z0 = 0.0
        if zbase is not None: z0 = zbase
        elif not far:
            pd = chamfer(x, y, w + 10, d + 10, 3.0); podium(K, pd, 9.6, tuple(R.choice(NEON + [None]) for _ in range(8)), 'b', R.choice([T_MID, T_DARK])); z0 = 9.6
        # Hauptschaft, optional mit Rücksprung im oberen Teil
        zs = F32(h * R.uniform(0.62, 0.86)) if R.random() < 0.6 else h
        shaft(K, base, z0, zs, km, tm)
        if km != 'b' and not far: fins(K, base, z0, zs, 6.0, R.uniform(0.5, 1.0), 0.45)
        if km == 'b' or far: ledges(K, base, z0, zs, 25.6 if far else 12.8, 0.5, 0.6)
        top = base
        if zs < h:
            s = R.uniform(0.62, 0.82); sh = R.uniform(-1, 1); top = [(x + (p[0] - x) * s + sh, y + (p[1] - y) * s) for p in base]
            band(K, base, zs - 3.2, 3.2, 0.9, 'hull_dark', R.choice(['cool', 'lamp', 'light', None])); parapet(K, base, zs, 1.2, 0.9)
            shaft(K, top, zs, h, R.choice([km, ks]), R.choice([tm, ts]))
            if not far: roof_mech(K, base, zs, 3); fins(K, top, zs, h, 6.0, 0.6, 0.4)
        # angesetzte Scheiben
        m = len(base); edges = [i for i in range(m) if _edge(base[i], base[(i + 1) % m])[0] > 9]
        R.shuffle(edges); nsl = R.randint(2, 4) if not far else R.randint(1, 3)
        for i in edges[:nsl]:
            a, b = base[i], base[(i + 1) % m]; t0 = R.uniform(0.05, 0.35); t1 = R.uniform(0.6, 0.97); dd = R.uniform(3.0, 7.5)
            zb = z0 if R.random() < 0.7 or far else F32(R.uniform(20, h * 0.35)); zt = F32(h * R.uniform(0.4, 0.95))
            if zt - zb < 16: continue
            tint = ts if R.random() < 0.8 else T_RED
            p = slab(K, a, b, t0, t1, dd, zb, zt, ks, tint)
            if far:
                if R.random() < 0.5: crown_spikes(K, p, zt, 2, (8, 20), 0.6)
                continue
            if ks != 'b' and R.random() < 0.5: fins(K, p, zb, zt, 6.0, 0.5, 0.4)
            else: ledges(K, p, zb, zt, 12.8, 0.4, 0.4)
            roof_mech(K, p, zt, 2); crown_spikes(K, p, zt, R.randint(1, 3), (6, 18), 0.6)
            L, ex, ey, nx, ny = _edge(p[0], p[1]); mx, my = (p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2
            r = R.random()
            if r < 0.4 and L > 8: billboard(K, mx, my, zb + (zt - zb) * R.uniform(0.25, 0.8), nx, ny, min(L * 0.8, R.uniform(8, 16)), R.choice(NEON + ADS + ADS), 0.8, glow=R.choice([None, 'cool', 'lamp']))
            elif r < 0.6: edge_strip(K, p[0], p[1], R.choice([0.12, 0.5, 0.88]), zb + 3, zt - 3, R.choice(['light', 'light', 'cool']), 0.45)
            elif r < 0.75: risers(K, p[0], p[1], R.uniform(0.25, 0.75), zb, zt - 2, R.randint(2, 4), 0.3)
            if R.random() < 0.5: lstrip(K, p[0][0], p[0][1], zb + 2, zt - 1, R.choice(['light', 'cool']), 0.3)
        # Krone
        r = R.random()
        if far:
            if r < 0.4: step_crown(K, top, h, 2, 'b', T_DARK, None, 3)
            else: parapet(K, top, h, 1.2, 0.3); crown_spikes(K, top, h, R.randint(2, 5), (10, 34), 0.6)
        elif r < 0.4:
            zt = step_crown(K, top, h, R.randint(2, 3), R.choice(['b', 'b', 'a']), T_DARK, R.choice(['cool', 'light', 'lamp']), R.randint(4, 7)); spire(K, x, y, zt, R.uniform(16, 34), 0.5)
        elif r < 0.7: parapet(K, top, h, 1.3, 0.4); roof_mech(K, top, h, 5); crown_spikes(K, top, h, R.randint(4, 8), (10, 32), 0.55); avlights(K, top, h)
        else:
            parapet(K, top, h, 1.3, 0.4); x0, x1, y0, y1 = bounds(top); q = rect((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.8, (y1 - y0) * 0.8)
            lattice_crown(K, q, h, R.uniform(12, 20), sign or R.choice(NEON)); roof_mech(K, q, h, 3); crown_spikes(K, q, h, 2, (16, 30), 0.0)
        # Anbauten am Hauptschaft
        if not far:
            ac_units(K, base, z0 + 2, zs - 4, R.randint(6, 14))
            for i in edges[nsl:]:
                a, b = base[i], base[(i + 1) % m]; L, ex, ey, nx, ny = _edge(a, b); mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; r = R.random()
                if r < 0.45: billboard(K, mx, my, z0 + (zs - z0) * R.uniform(0.2, 0.85), nx, ny, min(L * 0.75, R.uniform(9, 18)), sign or R.choice(NEON + ADS), 0.9, glow='cool')
                elif r < 0.7: landing_pad(K, mx, my, F32(z0 + (zs - z0) * R.uniform(0.35, 0.8)), nx, ny, R.uniform(6.5, 9), 2.5)
                elif r < 0.9: edge_strip(K, a, b, R.choice([0.2, 0.5, 0.8]), z0 + 4, zs - 5, 'light', 0.5); risers(K, a, b, 0.1, z0, zs - 3, 3, 0.3)
        elif edges and R.random() < 0.35:
            i = R.choice(edges); a, b = base[i], base[(i + 1) % m]; L, ex, ey, nx, ny = _edge(a, b)
            K.neon(R.choice(NEON + ICON), ((a[0] + b[0]) / 2 + nx * 0.4, (a[1] + b[1]) / 2 + ny * 0.4, h * R.uniform(0.6, 0.85)), (ex, ey, 0), (0, 0, 1), min(L * 0.7, 16.0))
    finally: K.R = KR
def block_low(K, c, sx, sy, h, seed=1):
    """Niedriger Block für den Schluchtgrund: Sockel mit Läden, Paneel- oder Bandfassade, Dachaufbauten, Werbetafel auf Stützen."""
    x, y = c; R = random.Random(seed * 31 + 5); KR = K.R; K.R = R
    try:
        h = F32(h); p = rect(x, y, sx, sy)
        podium(K, p, 6.4, tuple(R.choice(NEON + [None, None]) for _ in range(4)), 'b', R.choice([T_MID, T_DARK]))
        q = rect(x + R.uniform(-1, 1), y + R.uniform(-1, 1), sx - R.uniform(1, 4), sy - R.uniform(1, 4)); shaft(K, q, 6.4, h, R.choice(['c', 'b', 'b', 'a']), R.choice(PALETTE)); parapet(K, q, h, 1.1, 0.3)
        roof_mech(K, q, h, R.randint(3, 6)); ac_units(K, q, 8, h - 2, R.randint(4, 10))
        if R.random() < 0.6:
            nx, ny = R.choice([(0, -1), (0, -1), (1, 0), (-1, 0)]); nm = R.choice(NEON + NEON + ADS)
            billboard(K, x, y, h, nx, ny, min(sx * 0.6, 12.0) if nm in NEON else 6.0, nm, 0.7, legs=3.2)
        if R.random() < 0.5: crown_spikes(K, q, h, 2, (6, 14), 0.2)
    finally: K.R = KR

# ------------------------------------------------------------------ Schaubühnen
def lineup(lib, origin=(0.0, -900.0)):
    """Die fünf Turmtypen und zwei Bündelvarianten nebeneinander."""
    K = lib.Kit('Hochhaus_Reihe', seed=41); K.seg = 60.0; ox, oy = origin
    K.slab(480, 140, 0.2, (ox, oy, 0), tint=(0.2, 0.21, 0.23), cell=10.0, mat='kit_wet', uvm=4.0)
    tower_stufen(K, (ox - 190, oy)); tower_kern(K, (ox - 122, oy + 5)); tower_konzern(K, (ox - 52, oy)); tower_rund(K, (ox + 18, oy)); tower_werk(K, (ox + 82, oy + 5))
    tower_bundle(K, (ox + 142, oy), 3, 168.0, 28, 24); tower_bundle(K, (ox + 198, oy), 8, 190.0, 26, 26)
    return K.build('Hochhaus_Kit')
def city(lib, street=False):
    """Stadtschlucht mit Tiefenstaffelung: vorn ausgearbeitete Türme, dahinter Bündeltürme, in der Ferne sparsame Silhouetten."""
    K = lib.Kit('Hochhaus_Stadt', seed=909); K.seg = 60.0; R = random.Random(2077)
    K.slab(700, 760, 0.2, (0, 260, 0), tint=(0.16, 0.17, 0.19), cell=10.0, mat='kit_wet', uvm=4.0)
    # Vordergrund und Mitte: Schlucht entlang +y
    tower_konzern(K, (56, -84)); tower_stufen(K, (-68, -14)); tower_kern(K, (-58, 92)); tower_rund(K, (66, 36)); tower_werk(K, (74, 128))
    mid = [((-150, -70), 1, 150, 32, 28), ((-140, 30), 2, 204, 28, 26), ((-62, 190), 4, 214, 30, 26), ((70, 222), 5, 180, 28, 30), ((0, 300), 6, 250, 34, 30), ((150, 20), 7, 190, 30, 26),
           ((160, 130), 9, 226, 28, 28), ((-150, 150), 10, 170, 30, 24), ((-70, 300), 11, 160, 26, 26), ((84, 330), 12, 208, 28, 26), ((160, 250), 14, 150, 30, 30), ((-160, 260), 15, 236, 30, 28)]
    for (c, seed, h, w, d) in mid: tower_bundle(K, c, seed, h, w, d)
    # Laufbrücken und Kabel quer über die Schlucht
    skybridge(K, (-50.0, -8.0), (50.0, 30.0), 57.6, 6.0); skybridge(K, (-49.0, 92.0), (60.0, 128.0), 86.4, 5.0); skybridge(K, (-47.0, 188.0), (56.0, 222.0), 64.0, 6.0)
    if not street: skybridge(K, (-40.0, 60.0), (50.0, 44.0), 28.8, 6.0)
    for k in range(10):
        ya = R.uniform(-40, 300); K.cable((-45 + R.uniform(-4, 4), ya, R.uniform(14, 70)), (48 + R.uniform(-4, 4), ya + R.uniform(-20, 20), R.uniform(14, 70)), R.uniform(2, 6), 0.08, 8)
    # Schluchtgrund: niedrige Blöcke mit Läden und Tafeln
    k = 0
    for yy in range(170 if street else -110, 420, 34):      # street: Die Schlucht bis y = 140 gehört der Straße (strassen_kit.street_scene)
        for xx in (-18, 16):
            if R.random() < 0.72: k += 1; block_low(K, (xx + R.uniform(-4, 4), yy + R.uniform(-4, 4)), R.uniform(16, 24), R.uniform(16, 26), R.uniform(14, 44), k)
    for (xx, yy) in ((-110, -30), (-108, 80), (-104, 220), (112, 70), (116, 190), (110, 300), (-120, 330), (20, -150), (-40, -160), (-110, -150)):
        k += 1; block_low(K, (xx, yy), R.uniform(22, 30), R.uniform(22, 30), R.uniform(30, 70), k)
    ob = K.build('Hochhaus_Kit')
    # Ferne: sparsame Silhouetten in drei Staffeln (eigenes Objekt)
    F = lib.Kit('Hochhaus_Ferne', seed=77); F.seg = 60.0
    F.slab(2600, 2600, 0.2, (0, 800, -0.3), tint=(0.12, 0.13, 0.14), cell=40.0, mat='kit_wet', uvm=8.0)
    n = 0
    for (y0, y1, cnt, hmin, hmax) in ((380, 620, 22, 150, 300), (620, 1000, 34, 180, 380), (1000, 1700, 46, 200, 460)):
        for i in range(cnt):
            n += 1; xx = R.uniform(-1, 1) * (260 + (y0 - 380) * 0.75); yy = R.uniform(y0, y1)
            if abs(xx) < 40 and yy < 520: continue
            tower_bundle(F, (xx, yy), 100 + n, R.uniform(hmin, hmax), R.uniform(26, 44), R.uniform(24, 40), far=True)
    for (xx, yy, hh) in ((-230, 40, 210), (-250, 170, 260), (-240, 320, 190), (250, 60, 240), (240, 200, 200), (260, 330, 280), (-330, 120, 300), (340, 150, 320), (-320, -80, 230), (330, -40, 260)):
        n += 1; tower_bundle(F, (xx, yy), 300 + n, hh, R.uniform(30, 40), R.uniform(28, 38), far=True)
    for i in range(44):
        n += 1; sd = -1 if i % 2 else 1; xx = sd * R.uniform(400, 900); yy = R.uniform(-260, 560)
        tower_bundle(F, (xx, yy), 400 + n, R.uniform(160, 380), R.uniform(28, 44), R.uniform(26, 40), far=True)
    of = F.build('Hochhaus_Kit')
    return ob, of
