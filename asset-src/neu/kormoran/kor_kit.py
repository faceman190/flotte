# Kormoran: eigenes 46-m-Schiff (Korvette/Frachter), Schaumodell in Blender. Wunsch des Nutzers (17.11.2026): ein Schiff in der Art der
# gezeigten Vorlage (flacher, gestufter Keil, dunkler Rumpf mit Akzentstreifen), 46 m lang, 34 m breit, 8 m hoch, später innen ausgebaut,
# Zugang hinten über eine Rampe und vorne unter dem Cockpit über eine ausfahrbare Leiter. Eigener Entwurf, keine Kopie der Vorlage.
# Aufruf ohne Fenster: blender.exe -b --python kor_lauf.py -- <ansichten>  (baut Kormoran.blend neu)
#
# Achsen: +X nach vorn (Bug bei x = 23), +Y nach links (Backbord), +Z nach oben, Boden (Landefüße) bei z = 0.
# Arbeitsschritte (wie bei den Baukästen gelernt):
#   1. Grundkörper als Facettenrumpf aus Spanten (Querschnitte), keine runden Flächen: wirkt wie Panzerplatten.
#   2. Schichtplatten: Flächen in Umrissen (Draufsicht) ausschneiden und anheben, so entstehen die gestuften Lagen.
#   3. Plattenfugen: Schnitte quer, längs und parallel zu den Kanten, dann jede Platte einzeln eingerückt (Fuge 4 cm, Platte 1 cm erhaben).
#   4. Schrauben an den Plattenecken und Nietreihen an langen Kanten (Instanzen auf winzigen Flächen, folgen jeder Schräge).
#   5. Öffnungen (Heckrampe, Leiterluke, Kanzel) aus dem Rumpf schneiden und dahinter Räume setzen.
#   6. Anbauten nach Funktion: Triebwerke am Heck, Waffen dort, wo sie freies Schussfeld haben, Fahrwerk unter den Lastpfaden,
#      Steuerdüsen an den Enden der Hebelarme, Lichter nach Luftfahrtregel (rot Backbord, grün Steuerbord, weiß hinten).
#   7. Beschriftung und Akzente sparsam: Kennung, Warnhinweise, zwei Streifenpaare, Formationslichter.
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
PI = math.pi
HERE = os.path.dirname(bpy.data.filepath)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for c in list(bpy.data.collections): bpy.data.collections.remove(c)
SC = bpy.context.scene
CUR = [SC.collection]; REC = [None]
exec(compile(open(os.path.join(HERE, '..', 'bastion', 'bk_lib.py'), encoding='utf-8').read(), 'bk_lib.py', 'exec'))
def setp(o, k, v):
    try: setattr(o, k, v)
    except Exception: pass
def coll(name):
    c = bpy.data.collections.new(name); SC.collection.children.link(c); return c
C_HULL, C_PART, C_GEAR, C_WPN = coll('Rumpf'), coll('Anbauten'), coll('Fahrwerk'), coll('Waffen')
C_LITE, C_DECAL, C_IN, C_ROOM, C_STU = coll('Lichter'), coll('Beschriftung'), coll('Innenraum Platzhalter'), coll('Innenraeume'), coll('Studio')
RND = random.Random(46)

# ---------- Materialien ----------
def hull_mat(name, col, metal=0.3, rough=0.5, wear=0.5):
    return mk(name, col, metal, rough, var=0.05, rvar=0.06, scale=0.8, streak=0.08, bump=0.1, bscale=60, wear=wear)
M.update(
    h1=hull_mat('Rumpf Graphit', (0.024, 0.026, 0.029)),
    h2=hull_mat('Rumpf Stahlgrau', (0.037, 0.039, 0.043)),
    h3=hull_mat('Rumpf Blaugrau', (0.026, 0.03, 0.038)),
    h4=hull_mat('Rumpf Sand', (0.1, 0.092, 0.072), 0.3, 0.5, 0.6),
    fuge=mk('Fuge', (0.006, 0.006, 0.007), 0.6, 0.6, var=0.0, rvar=0.0, grime=False),
    akzent=mk('Akzent Kobalt', (0.01, 0.034, 0.14), 0.3, 0.38, var=0.1, scale=2.0, bump=0.1, wear=0.6),
    dunkel=mk('Schwarzmetall', (0.012, 0.012, 0.014), 0.8, 0.4, var=0.1, wear=0.4),
    mittel=mk('Gussgrau', (0.07, 0.072, 0.076), 0.85, 0.38, var=0.14, bump=0.2, wear=0.6),
    schraube=mk('Schraube', (0.075, 0.075, 0.08), 0.9, 0.35, var=0.1, grime=False),
    chrom=mk('Kolbenstange', (0.62, 0.62, 0.64), 1.0, 0.14, var=0.04, rvar=0.03, grime=False),
    duese=mk('Duesenstahl', (0.055, 0.047, 0.042), 0.9, 0.5, var=0.25, bump=0.3),
    kante=mk('Kantenleiste', (0.16, 0.162, 0.168), 0.85, 0.36, var=0.1, scale=3.0, bump=0.1, wear=0.8),
    glut=mk('Triebwerksglut', (0.03, 0.035, 0.04), 0.6, 0.35, var=0, rvar=0, emit=(0.42, 0.62, 1.0), es=4, grime=False),
    kanzel=mk('Kanzelglas', (0.32, 0.36, 0.4), 0.0, 0.03, var=0, rvar=0.01, grime=False, trans=1.0),
    innen=mk('Innenraum', (0.06, 0.062, 0.066), 0.3, 0.55, var=0.15, scale=3.0, bump=0.2, wear=0.4),
    innen2=mk('Innenraum hell', (0.16, 0.165, 0.17), 0.2, 0.5, var=0.12, scale=3.0, bump=0.2, wear=0.4),
    sitz=mk('Sitzbezug', (0.02, 0.021, 0.024), 0.0, 0.7, var=0.15, scale=6.0, bump=0.4, bscale=300),
    rakete=mk('Flugkoerper', (0.32, 0.32, 0.3), 0.1, 0.45, var=0.08, scale=3.0, wear=0.5),
    nav_r=mk('Positionslicht rot', (1, 0.1, 0.05), 0, 0.2, var=0, rvar=0, emit=(1.0, 0.06, 0.03), es=40, grime=False),
    nav_g=mk('Positionslicht gruen', (0.1, 1, 0.3), 0, 0.2, var=0, rvar=0, emit=(0.1, 1.0, 0.35), es=40, grime=False),
    blitz=mk('Blitzlicht', (1, 1, 1), 0, 0.2, var=0, rvar=0, emit=(1.0, 0.97, 0.92), es=40, grime=False),
    form=mk('Formationslicht', (0.2, 0.5, 1), 0, 0.3, var=0, rvar=0, emit=(0.22, 0.55, 1.0), es=5, grime=False),
    deck=mk('Deckenlicht', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.95, 0.97, 1.0), es=9, grime=False),
    figur=mk('Figur', (0.75, 0.75, 0.75), 0.0, 0.5, var=0, rvar=0, grime=False),
)
for _k in ('h1', 'h2', 'h3', 'h4', 'akzent', 'fuge'):      # Lack: wenig Spiegelung im Streiflicht
    _b = next(n for n in M[_k].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    for _nm in ('Specular IOR Level', 'Specular'):
        if _nm in _b.inputs: _b.inputs[_nm].default_value = 0.28; break
M['warnrw'] = stripes('Warnstreifen Rampe', (0.6, 0.45, 0.04), (0.02, 0.02, 0.022), 10)
HULL_MATS = ['h1', 'h2', 'h3', 'h4', 'fuge', 'akzent', 'dunkel']

# =====================================================================================
# 1. Grundkörper: Spanten (Querschnitte) entlang X, dazwischen ebene Facetten
# =====================================================================================
KX = [23.0, 19.0, 15.0, 11.0, 8.0, 4.0, 0.0, -4.0, -8.0, -11.5, -13.5, -15.5, -18.5, -21.8]
B  = [0.12, 1.6, 3.3, 5.0, 6.3, 8.43, 10.57, 12.7, 14.83, 16.7, 17.0, 17.0, 13.4, 9.5]    # halbe Spannweite (Vorderkante gerade ab x = 8)
ZT = [3.5, 4.5, 5.4, 6.0, 6.4, 6.8, 7.1, 7.25, 7.35, 7.4, 7.4, 7.35, 7.2, 6.9]            # Rücken in der Mitte
ZB = [3.1, 2.5, 2.15, 2.0, 1.95, 1.9, 1.9, 1.9, 1.9, 1.9, 1.9, 1.95, 2.15, 2.35]          # Bauch in der Mitte
ZE = [3.3, 3.25, 3.2, 3.15, 3.1, 3.0, 2.95, 2.9, 2.9, 2.9, 2.9, 2.95, 3.1, 3.3]           # Mitte der Außenkante
EE = [0.1, 0.28, 0.38, 0.42, 0.42, 0.4, 0.38, 0.35, 0.32, 0.3, 0.3, 0.32, 0.6, 1.0]      # Dicke der Außenkante
X_NOSE, X_STERN = 23.0, -21.8
def tab(T, x):
    if x >= KX[0]: return T[0]
    for i in range(len(KX) - 1):
        a, b = KX[i], KX[i + 1]
        if a >= x >= b: return T[i] + (T[i + 1] - T[i]) * (a - x) / (a - b)
    return T[-1]
def ys_at(x): return min(4.4, tab(B, x) * 0.6)      # Schulter des Rückens
def profile(x):      # halber Querschnitt (y ≥ 0), von oben Mitte bis unten Mitte
    b, zt, zb, ze, e = (tab(T, x) for T in (B, ZT, ZB, ZE, EE))
    H = zt - zb; ys = ys_at(x); yr = min(ys + (b - ys) * 0.38, b - 0.04); y1 = ys * 0.5
    zst = zt - 0.1 * H; et, eb = ze + e / 2, ze - e / 2
    zrt = et + (zst - et) * 0.55; zrb = eb - (eb - zb) * 0.7; zsb = zb + 0.03 * H
    return [(0, zt), (y1, zt - 0.012 * H), (ys, zst), (yr, zrt), (b, et), (b, eb), (yr, zrb), (ys, zsb), (y1, zb), (0, zb)]
def build_hull():
    bm = bmesh.new(); rings = []
    for x in KX:
        P = profile(x)
        ring = [(x, y, z) for y, z in P] + [(x, -y, z) for y, z in reversed(P[1:-1])]
        rings.append([bm.verts.new(p) for p in ring])
    n = len(rings[0])
    for i in range(len(rings) - 1):
        A, C = rings[i], rings[i + 1]
        for k in range(n): bm.faces.new((A[k], A[(k + 1) % n], C[(k + 1) % n], C[k]))
    bm.faces.new(rings[0]); bm.faces.new(rings[-1][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm

# ---------- Schnitte ----------
def fbox(f):
    xs = [v.co.x for v in f.verts]; ys = [v.co.y for v in f.verts]; return min(xs), max(xs), min(ys), max(ys)
def rcut(bm, co, no, filt=None):      # Schnitt mit einer Ebene, nur durch die Flächen, die filt durchlässt
    F = [f for f in bm.faces if filt is None or filt(f)]
    if not F: return
    V = list({v for f in F for v in f.verts}); E = list({e for f in F for e in f.edges})
    bmesh.ops.bisect_plane(bm, geom=V + E + F, dist=1e-4, plane_co=co, plane_no=no)
    bm.normal_update()
def inside(pt, poly):
    x, y = pt; c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
    return c
def outline_cuts(bm, poly, side=1):      # Umriss (Draufsicht) in die Flächen einer Seite schneiden
    n = len(poly)
    for i in range(n):
        p, q = Vector(poly[i]), Vector(poly[(i + 1) % n]); d = q - p
        lx, hx, ly, hy = min(p.x, q.x) - 0.05, max(p.x, q.x) + 0.05, min(p.y, q.y) - 0.05, max(p.y, q.y) + 0.05
        def filt(f, lx=lx, hx=hx, ly=ly, hy=hy):
            if f.normal.z * side < 0.15: return False
            a, b, c, e = fbox(f); return not (b < lx or a > hx or e < ly or c > hy)
        F = [f for f in bm.faces if filt(f)]
        if not F: continue
        V = list({v for f in F for v in f.verts}); E = list({e for f in F for e in f.edges})
        r = bmesh.ops.bisect_plane(bm, geom=V + E + F, dist=1e-4, plane_co=(p.x, p.y, 0), plane_no=(-d.y, d.x, 0))
        L2 = d.length_squared; out = []
        for e in [g for g in r['geom_cut'] if isinstance(g, bmesh.types.BMEdge)]:
            m = (e.verts[0].co + e.verts[1].co) / 2; t = (Vector((m.x, m.y)) - p).dot(d) / L2
            if t < -0.002 or t > 1.002: out.append(e)
        out = [e for e in out if e.is_valid and len(e.link_faces) == 2]
        if out: bmesh.ops.dissolve_edges(bm, edges=out, use_verts=False)
        bm.normal_update()
def raise_poly(bm, poly, h, side=1):      # 2. Schichtplatte: Umriss ausschneiden und senkrecht anheben (side −1: Unterseite)
    outline_cuts(bm, poly, side)
    F = [f for f in bm.faces if f.normal.z * side >= 0.15 and inside(f.calc_center_median().xy, poly)]
    if not F: return 0
    r = bmesh.ops.extrude_face_region(bm, geom=F)
    nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=nv, vec=(0, 0, h * side)); bm.normal_update()
    return len(F)
def mirror(poly): return [(x, -y) for x, y in poly][::-1]
_LA, _LB = Vector((8.0, 6.3)), Vector((-11.5, 16.7))
_D = (_LB - _LA).normalized(); _N = Vector((_D.y, -_D.x))
if _N.dot(-_LA) < 0: _N = -_N
def st(pts):      # Flügelkoordinaten (s längs der Vorderkante ab x = 8, t senkrecht nach innen) → Draufsicht (x, y), Backbord
    return [tuple(_LA + _D * a + _N * b) for a, b in pts]

PLATES_1 = [      # erste Lage (Draufsicht, Backbordseite; symmetrische Umrisse einmal)
    ([(7.5, 0), (5.0, 3.4), (-20.6, 3.4), (-21.3, 2.6), (-21.3, -2.6), (-20.6, -3.4), (5.0, -3.4)], 0.16, 1, False),
    (st([(4.0, 2.4), (19.0, 2.4), (21.5, 4.9), (21.5, 8.6), (18.5, 11.4), (10.0, 7.4), (4.0, 4.2)]), 0.14, 1, True),
    ([(21.6, 0), (19.6, 0.95), (18.3, 1.0), (18.3, -1.0), (19.6, -0.95)], 0.07, 1, False),
    ([(-15.2, 3.6), (-15.6, 8.4), (-21.3, 8.8), (-21.3, 3.6)], 0.22, 1, True),
    ([(15.6, 2.25), (13.0, 3.55), (10.0, 4.95), (9.2, 4.55), (12.4, 3.0), (15.0, 1.98)], 0.08, 1, True),
    ([(9.0, 0), (6.0, 3.0), (-14.5, 3.0), (-15.5, 2.0), (-15.5, -2.0), (-14.5, -3.0), (6.0, -3.0)], 0.12, -1, False),
    (st([(6.0, 3.0), (18.0, 3.0), (20.0, 5.0), (20.0, 8.0), (16.0, 9.0), (8.0, 5.5)]), 0.08, -1, True),
]
PLATES_2 = [      # zweite Lage auf der ersten
    ([(2.5, 0), (0.8, 1.9), (-17.0, 1.9), (-17.8, 1.2), (-17.8, -1.2), (-17.0, -1.9), (0.8, -1.9)], 0.12, 1, False),
    (st([(11.5, 3.0), (17.5, 3.0), (19.0, 4.5), (19.0, 7.6), (17.5, 9.0), (11.5, 6.0)]), 0.1, 1, True),
    ([(0.5, 1.65), (0.2, 1.35), (-16.2, 1.35), (-16.5, 1.65)], 0.05, 1, True),
    ([(8.0, 0.5), (-14.0, 0.5), (-14.0, -0.5), (8.0, -0.5)], 0.05, -1, False),
]
XCUTS = [21.0, 18.3, 15.8, 13.2, 11.55, 10.45, 8.6, 6.0, 3.0, 0.0, -3.0, -6.0, -9.0, -12.0, -15.0, -18.0, -20.4]
YCUTS = [0.0] + [s * v for v in (1.2, 2.4, 3.6) for s in (1, -1)]
FRAMES = [(0, 0.6), (1, 0.7), (3, 0.5), (5, 0.5), (6, 0.6)]      # Rücken, Flügel, Triebwerksdeck, Bauch, Flügel unten      # Rahmenband innen an diesen Platten der ersten Lage (Index, Breite)
LE_A, LE_B = Vector((8.0, 6.3)), Vector((-11.5, 16.7))      # gerade Vorderkante (Backbord)
TE_A, TE_B = Vector((-15.5, 17.0)), Vector((-21.8, 9.5))    # Hinterkante
def edge_dist(p, A, Bv):      # Abstand eines Punkts (Draufsicht) von der Linie A–B, positiv zur Rumpfmitte hin
    d = (Bv - A).normalized(); nrm = Vector((d.y, -d.x))
    if nrm.dot(Vector((0, 0)) - A) < 0: nrm = -nrm
    return (p - A).dot(nrm)
def line_cut(bm, A, Bv, off, side, filt=None):      # Schnitt parallel zur Kante, um off nach innen versetzt, nur auf einer Seite (side = Vorzeichen von y)
    d = (Bv - A).normalized(); nrm = Vector((d.y, -d.x))
    if nrm.dot(-A) < 0: nrm = -nrm
    P = A + nrm * off
    if side < 0: P = Vector((P.x, -P.y)); nrm = Vector((nrm.x, -nrm.y))
    rcut(bm, (P.x, P.y, 0), (nrm.x, nrm.y, 0), filt or (lambda f: f.calc_center_median().y * side > 0.5))

DOOR_Y, DOOR_Z = 2.4, 5.6        # Hecköffnung |y| < 2,4, von der Unterkante bis z = 5,6
HATCH = (10.45, 11.55, 0.55)     # Leiterluke: x von–bis, halbe Breite
def canopy_stations():      # Kanzel: (x, halbe Breite unten, halbe Breite oben, Höhe oben)
    return [(17.4, 0.9, 0.5, 5.42), (15.6, 0.92, 0.86, 5.95), (13.4, 0.93, 1.12, 6.34), (11.0, 0.93, 1.25, 6.55), (9.6, 0.93, 1.25, 6.62), (7.0, 0.95, 0.95, 6.72), (4.4, 0.95, 0.35, 6.86)]

def make_hull():
    global BVH, HULL
    bm = build_hull()
    panel_cuts(bm)
    for poly, h, side, mir in PLATES_1:
        raise_poly(bm, poly, h, side)
        if mir: raise_poly(bm, mirror(poly), h, side)
    for poly, h, side, mir in PLATES_2:
        raise_poly(bm, poly, h, side)
        if mir: raise_poly(bm, mirror(poly), h, side)
    # 3. Plattenfugen: quer, längs, entlang Vorder- und Hinterkante
    frames = []
    for i, d in FRAMES:
        poly, h, side, mir = PLATES_1[i]
        for P in ([poly, mirror(poly)] if mir else [poly]):
            Q = inset(P, d); outline_cuts(bm, Q, side); frames.append((P, Q, side))
    rest_cuts(bm)
    BVH = BVHTree.FromBMesh(bm)
    return finish_hull(bm, frames)
def panel_cuts(bm):
    # Rumpfmitte: Querfugen und wenige Längsfugen; Flügel: Fugen parallel und senkrecht zur Vorderkante (Plattenreihen folgen der Pfeilung)
    body = lambda f: abs(f.calc_center_median().y) < 4.5 or f.calc_center_median().x > 8.5
    for x in XCUTS: rcut(bm, (x, 0, 0), (1, 0, 0), body)
    for y in YCUTS: rcut(bm, (0, y, 0), (0, 1, 0), lambda f: abs(f.calc_center_median().y) < 4.6 or f.normal.x < -0.7)
    dle = (LE_B - LE_A).normalized()
    for s in (1, -1):
        wing = lambda f, s=s: f.calc_center_median().y * s > 4.3 and f.calc_center_median().x < 8.7
        for off in (0.7, 1.5, 1.8, 3.6, 6.2, 9.0): line_cut(bm, LE_A, LE_B, off, s, wing)
        for k in range(-1, 8):
            P = LE_A + dle * (k * 3.0 + 1.5)
            rcut(bm, (P.x, P.y * s, 0), (dle.x, dle.y * s, 0), wing)
        line_cut(bm, TE_A, TE_B, 1.4, s, wing)
def rest_cuts(bm):
    # Ruderklappen an der Hinterkante: Querschnitte nur im Klappenband
    for s in (1, -1):
        for y in (10.6, 13.2, 15.6):
            rcut(bm, (0, s * y, 0), (0, 1, 0), lambda f, s=s: f.calc_center_median().y * s > 9 and edge_dist(f.calc_center_median().xy * Vector((1, s)), TE_A, TE_B) < 1.5)
    # 5. Öffnungen vorbereiten: Hecktor (Oberkante), Leiterluke
    rcut(bm, (0, 0, DOOR_Z), (0, 0, 1), lambda f: f.normal.x < -0.7)
    for y in (HATCH[2], -HATCH[2]):
        rcut(bm, (0, y, 0), (0, 1, 0), lambda f: f.normal.z < -0.3 and 9.5 < f.calc_center_median().x < 12.5)
def finish_hull(bm, frames):
    global HULL
    # Öffnungen ausschneiden
    dead = set()
    for f in bm.faces:
        c = f.calc_center_median()
        if f.normal.x < -0.7 and abs(c.y) < DOOR_Y and c.z < DOOR_Z: dead.add(f)
        if f.normal.z < -0.3 and HATCH[0] < c.x < HATCH[1] and abs(c.y) < HATCH[2]: dead.add(f)
        if f.normal.z > 0.2 and all(9.9 < v.co.x < 18.6 and abs(v.co.y) < canopy_half(v.co.x) - 0.1 for v in f.verts): dead.add(f)
        if f.normal.z > 0.2 and all(5.9 < v.co.x < 10.5 and abs(v.co.y) < 1.25 for v in f.verts): dead.add(f)      # über der Treppe (Dach: Kanzelverkleidung)
    bmesh.ops.delete(bm, geom=list(dead), context='FACES')
    # Farben je Platte, Akzentband entlang der Vorderkante, dann Fugen
    def pick(c):
        h = (math.sin(round(c.x, 1) * 12.9898 + round(abs(c.y), 1) * 78.233 + round(c.z, 1) * 37.719) * 43758.5453) % 1.0
        return 0 if h < 0.7 else 1 if h < 0.88 else 2
    panels = []
    for f in bm.faces:
        c = f.calc_center_median(); f.material_index = pick(c)
        for P, Q, side in frames:
            if f.normal.z * side > 0.15 and inside(c.xy, P) and not inside(c.xy, Q): f.material_index = 1
        if f.normal.z > 0.15 and (inside(c.xy, PLATES_1[4][0]) or inside(c.xy, mirror(PLATES_1[4][0]))): f.material_index = 3
        if f.normal.z > 0.15 and -10 < c.x < 6.5:
            d = edge_dist(Vector((c.x, abs(c.y))), LE_A, LE_B)
            if 1.5 < d < 1.8: f.material_index = 5
        if abs(f.normal.z) < 0.35 and abs(f.normal.x) < 0.8: f.material_index = 1      # Plattenkanten und Außenkante
        a = f.calc_area(); per = f.calc_perimeter()
        if a > 0.12 and 2 * a / per > 0.08: panels.append(f)
    r = bmesh.ops.inset_individual(bm, faces=panels, thickness=0.02, depth=0.01, use_even_offset=True)
    for f in r['faces']: f.material_index = 4
    bm.normal_update()
    rec = []      # einige Platten (symmetrisch gewählt) als vertiefte Klappen: Rand schräg, Grund dunkel
    for f in panels:
        a = f.calc_area(); c = f.calc_center_median(); hh = (math.sin(round(c.x, 1) * 91.7 + round(abs(c.y), 1) * 13.3) * 9821.1) % 1.0
        if 0.6 < a < 5.0 and hh < 0.06 and 2 * a / f.calc_perimeter() > 0.25 and f.material_index != 5 and edge_dist(Vector((c.x, abs(c.y))), LE_A, LE_B) > 2.2: rec.append(f)
    r2 = bmesh.ops.inset_individual(bm, faces=rec, thickness=0.09, depth=-0.035, use_even_offset=True)
    for f in r2['faces']: f.material_index = 1
    for f in rec: f.material_index = 6
    recset = set(rec); bm.normal_update()
    # 4. Schrauben
    pts = []
    for f in panels:
        if not f.is_valid or f.calc_area() < 0.5 or f in recset: continue
        rng = random.Random(int(abs(f.calc_center_median().x * 1000 + f.calc_center_median().y * 77)))
        if rng.random() > 0.55: continue
        rows = rng.random() < 0.45; n = f.normal.copy(); c = f.calc_center_median(); vs = [v.co.copy() for v in f.verts]; k = len(vs)
        for i in range(k):
            v, a, b = vs[i], vs[i - 1], vs[(i + 1) % k]; e1, e2 = a - v, b - v
            if e1.length < 0.25 or e2.length < 0.25 or e1.normalized().dot(e2.normalized()) < -0.94: continue
            pts.append((v + e1.normalized() * 0.07 + e2.normalized() * 0.07, n, e2.normalized()))
            if rows and e2.length > 1.0:
                m = int(e2.length / 0.42); inw = n.cross(e2.normalized())
                if inw.dot(c - v) < 0: inw = -inw
                for j in range(1, m): pts.append((v + e2 * (j / m) + inw * 0.05, n, e2.normalized()))
    for f in bm.faces: f.smooth = True
    for e in bm.edges: e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(PI) < math.radians(6)
    me = bpy.data.meshes.new('Rumpf'); bm.to_mesh(me); bm.free()
    for k in HULL_MATS: me.materials.append(M[k])
    CUR[0] = C_HULL; HULL = link(bpy.data.objects.new('Rumpf', me))
    bv = HULL.modifiers.new('Fase', 'BEVEL'); bv.width = 0.02; bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
    bolt_carrier('Rumpfschrauben', pts)
    return len(me.polygons), len(pts)
def canopy_half(x):      # halbe Breite der Kanzel unten (für das Ausschneiden des Rumpfs darunter)
    st = canopy_stations()
    if x > 19.2 or x < st[-1][0]: return 0.0
    if x > st[0][0]: return ys_at(x) * st[0][1] * (19.2 - x) / (19.2 - st[0][0])
    for i in range(len(st) - 1):
        a, b = st[i], st[i + 1]
        if a[0] >= x >= b[0]:
            t = (a[0] - x) / (a[0] - b[0]); return ys_at(x) * (a[1] + (b[1] - a[1]) * t)
    return 0.0

BOLT = [None]
def bolt_carrier(name, pts, m='schraube', r=0.016):
    if BOLT[0] is None:      # ein Schraubenkopf (Sechskant mit Fase) als Vorlage
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=6, radius1=r, radius2=r * 0.8, depth=0.008)
        bmesh.ops.translate(bm, verts=bm.verts[:], vec=(0, 0, 0.004)); me = bpy.data.meshes.new('Schraubenkopf'); bm.to_mesh(me); bm.free(); me.materials.append(M[m])
        BOLT[0] = bpy.data.objects.new('Schraubenkopf', me); C_HULL.objects.link(BOLT[0]); BOLT[0].hide_render = True; BOLT[0].hide_viewport = True
    bm = bmesh.new(); s = 0.003
    for p, n, t in pts:
        bq = n.cross(t)
        bm.faces.new([bm.verts.new(p + t * sx * s + bq * sy * s) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); C_HULL.objects.link(ob)
    ob.instance_type = 'FACES'; ob.show_instancer_for_render = False; ob.show_instancer_for_viewport = False
    ch = bpy.data.objects.new(name + ' Kopf', BOLT[0].data); C_HULL.objects.link(ch); ch.parent = ob
    return ob

# ---------- Platzieren auf der Rumpfoberfläche ----------
def surf(x, y, side=1):
    o = Vector((x, y, 40.0 if side > 0 else -40.0)); d = Vector((0, 0, -1.0 if side > 0 else 1.0))
    loc, nor, idx, dist = BVH.ray_cast(o, d)
    if loc is None: return None, None
    if nor.dot(d) > 0: nor = -nor
    return loc, nor
def onsurf(x, y, side=1, fwd=(1, 0, 0), lift=0.012):      # Rahmen auf der Oberfläche: X nach vorn (projiziert), Z = Flächennormale
    loc, n = surf(x, y, side)
    X = Vector(fwd); X = (X - n * X.dot(n)).normalized(); Y = n.cross(X)
    mw = Matrix((X, Y, n)).transposed().to_4x4(); mw.translation = loc + n * lift
    return mw
def group(name, mw):
    e = bpy.data.objects.new(name, None); link(e); e.matrix_world = mw; e.empty_display_size = 0.4; return e
class Part:      # sammelt alle in diesem Block gebauten Objekte und hängt sie an ein Leerobjekt (Lage im Raum)
    def __init__(self, name, mw, col=None): self.name, self.mw, self.col = name, mw, col
    def __enter__(self):
        if self.col: CUR[0] = self.col
        self.e = group(self.name, self.mw); REC[0] = []; return self.e
    def __exit__(self, *a):
        objs = REC[0]; REC[0] = None
        for o in objs: o.parent = self.e
        return False
def T(x, y, z): return Matrix.Translation((x, y, z))
def RY(a): return Matrix.Rotation(a, 4, 'Y')
def RZ(a): return Matrix.Rotation(a, 4, 'Z')
def RX(a): return Matrix.Rotation(a, 4, 'X')
def sphere(name, r, x, y, z, m, seg=24):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me)); ob.location = (x, y, z); return ob
def chamfer_rect(w, h, c):      # Rechteck mit abgeschrägten Ecken (u, v)
    return [(-w / 2 + c, -h / 2), (w / 2 - c, -h / 2), (w / 2, -h / 2 + c), (w / 2, h / 2 - c), (w / 2 - c, h / 2), (-w / 2 + c, h / 2), (-w / 2, h / 2 - c), (-w / 2, -h / 2 + c)]

# =====================================================================================
# Kanzel (Glas mit Streben), Verkleidung dahinter, Cockpit innen
# =====================================================================================
def loft(name, stations, mats, cap_front=None, cap_back=False):
    bm = bmesh.new(); rings = []
    for x, pts, mi in stations: rings.append(([bm.verts.new((x, u, v)) for u, v in pts], mi))
    if cap_front is not None:
        tip = bm.verts.new(cap_front); R0 = rings[0][0]
        for k in range(len(R0) - 1): f = bm.faces.new((tip, R0[k + 1], R0[k])); f.material_index = rings[0][1]
    for i in range(len(rings) - 1):
        A, C = rings[i][0], rings[i + 1][0]
        for k in range(len(A) - 1): f = bm.faces.new((A[k], A[k + 1], C[k + 1], C[k])); f.material_index = rings[i][1]
    if cap_back: f = bm.faces.new(rings[-1][0]); f.material_index = rings[-1][1]
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(M[m])
    return link(bpy.data.objects.new(name, me))
def canopy():
    CUR[0] = C_PART
    tip_loc, _ = surf(19.2, 0, 1)
    st_glass, st_fair = [], []
    for x, fb, ft, zt in canopy_stations():
        yb = ys_at(x) * fb; zb = surf(x, yb, 1)[0].z - 0.05; yt = ft; ym = yb * 0.8 + yt * 0.2; zm = zb + (zt - zb) * 0.42
        ring = [(yb, zb), (ym, zm), (yt, zt), (0, zt + 0.05), (-yt, zt), (-ym, zm), (-yb, zb)]
        if x >= 9.6: st_glass.append((x, ring, 0))
        if x <= 9.6: st_fair.append((x, ring, 0))
    g = loft('Kanzelglas', st_glass, ['kanzel'], cap_front=(19.2, 0, tip_loc.z + 0.02))
    fr = loft('Kanzelstreben', st_glass, ['dunkel'], cap_front=(19.2, 0, tip_loc.z + 0.02))
    wf = fr.modifiers.new('Streben', 'WIREFRAME'); wf.thickness = 0.07; wf.use_even_offset = False; wf.use_boundary = True; wf.offset = 0.0
    fa = loft('Kanzelverkleidung', st_fair, ['h1'])
    bv = fa.modifiers.new('Fase', 'BEVEL'); bv.width = 0.015; bv.segments = 1; bv.limit_method = 'ANGLE'
    # Rahmen unten (Sims) als Rohr entlang der Kanzelkante
    for s in (1, -1):
        pts = [Vector((19.2, 0, tip_loc.z))] + [Vector((x, s * r[0][0], r[0][1] + 0.04)) for x, r, _ in st_glass]
        pipe('Kanzelsims', pts, 0.05, M['dunkel'])
    # Cockpit innen: Wanne (Einrichtung in kor_cockpit.py)
    CUR[0] = C_ROOM
    fl = 4.5
    tub = []
    for x in (18.4, 17.0, 15.0, 13.0, 11.0, 9.9):
        w = max(0.3, canopy_half(x) - 0.12); zt = surf(x, w, 1)[0].z - 0.02
        tub.append((x, [(w, zt), (w, fl), (-w, fl), (-w, zt)], 0))
    loft('Cockpitwanne', tub, ['innen'])
    # Sitze, Konsolen und Licht: kor_cockpit.py
    return g

# =====================================================================================
# Triebwerke am Heck
# =====================================================================================
def nozzle(name, y, z, w, h, L, glow=1.0):
    CUR[0] = C_PART
    xa, xb = X_STERN - L + 0.6, X_STERN + 0.6      # hinten offen bei xa, vorn im Rumpf bei xb
    out = [(y + u, z + v) for u, v in chamfer_rect(w, h, min(w, h) * 0.22)]
    inn = [(y + u, z + v) for u, v in chamfer_rect(w - 0.36, h - 0.3, min(w, h) * 0.16)]
    bm = bmesh.new(); n = len(out); dep = 0.9
    Oa = [bm.verts.new((xa, u, v)) for u, v in out]; Ob = [bm.verts.new((xb, u, v)) for u, v in out]
    Ia = [bm.verts.new((xa, u, v)) for u, v in inn]; Id = [bm.verts.new((xa + dep, u, v)) for u, v in inn]
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((Oa[i], Oa[j], Ob[j], Ob[i])).material_index = 0
        bm.faces.new((Ia[i], Ia[j], Oa[j], Oa[i])).material_index = 1
        bm.faces.new((Id[i], Id[j], Ia[j], Ia[i])).material_index = 2
    bm.faces.new(Id).material_index = 3
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in ('h2', 'duese', 'dunkel', 'glut'): me.materials.append(M[m])
    ob = link(bpy.data.objects.new(name, me))
    bv = ob.modifiers.new('Fase', 'BEVEL'); bv.width = 0.02; bv.segments = 2; bv.limit_method = 'ANGLE'
    for k in range(3):      # Leitbleche in der Düse
        zz = z - (h - 0.3) / 2 + (h - 0.3) * (k + 1) / 4
        box('Leitblech', 0.7, w - 0.4, 0.04, xa + 0.45, y, zz, M['dunkel'], 0.004)
    box('Mittelsteg', 0.7, 0.05, h - 0.32, xa + 0.45, y, z, M['dunkel'], 0.004)
    prism('Hitzekragen', [(y + u, z + v) for u, v in chamfer_rect(w + 0.3, h + 0.3, min(w, h) * 0.26)], X_STERN - 0.22, X_STERN + 0.05, M['h1'], 'X', 0.03)
    for k in range(int(w / 0.5)):      # Hitzeschildplatten oben auf dem Gehäuse
        box('Hitzeschild', 1.0, 0.44, 0.03, xa + 0.7, y - w / 2 + 0.3 + k * 0.5, z + h / 2 + 0.015, M['duese'], 0.004)
    for a in range(10):      # Schrauben am Kragen
        t = a / 10 * 2 * PI; cyl('Kragenschraube', 0.03, 0.03, X_STERN - 0.235, y + math.cos(t) * (w / 2 + 0.06), z + math.sin(t) * (h / 2 + 0.06), M['schraube'], 'X', n=6, bev=0)
    pipe('Duesenrand', [Vector((xa - 0.01, u, v)) for u, v in out], 0.03, M['duese'], cyclic=True)
    for s in (-1, 1):      # Stellzylinder oben und unten
        cyl('Stellzylinder', 0.07, 1.0, xa + 0.6, y + s * (w / 2 - 0.4), z + h / 2 + 0.05, M['mittel'], 'X', n=12)
    return ob
def engines():
    for s in (1, -1):
        nozzle('Haupttriebwerk', s * 4.8, 4.15, 3.2, 1.8, 1.8)
        nozzle('Hilfstriebwerk', s * 7.9, 3.55, 1.4, 0.9, 1.4)
    # Kühlgitter über dem Hecktor
    for k in range(9): box('Kuehlrippe', 0.5, 0.05, 0.6, X_STERN - 0.2, -1.6 + k * 0.4, 6.15, M['dunkel'], 0.004)
    box('Kuehlrahmen', 0.4, 3.6, 0.08, X_STERN - 0.15, 0, 6.5, M['mittel'], 0.01)
    for sg in (1, -1):      # Heckleuchten außen, Kamera am Torsturz
        box('Heckleuchte', 0.04, 0.5, 0.12, X_STERN - 0.03, sg * 8.9, 3.3, M['blitz'], 0)
        point('Heckleuchte', (X_STERN - 0.3, sg * 8.9, 3.3), 3, (1, 0.97, 0.92), 0.05)
    box('Heckkamera', 0.2, 0.2, 0.14, X_STERN - 0.25, 0, DOOR_Z + 0.36, M['dunkel'], 0.01)
    box('Heckkamera Glas', 0.01, 0.1, 0.08, X_STERN - 0.36, 0, DOOR_Z + 0.36, M['kanzel'], 0)
    box('Kuehlrahmen', 0.4, 3.6, 0.08, X_STERN - 0.15, 0, 5.8, M['mittel'], 0.01)

# =====================================================================================
# Heckrampe mit Verlängerung, Laderaum dahinter
# =====================================================================================
HINGE = (X_STERN + 0.15, 2.45)
RAMP = {}
def ramp():
    CUR[0] = C_PART
    hx, hz = HINGE; L1, L2, W = 3.1, 3.2, 4.6
    e = group('Rampe Gelenk', T(hx, 0, hz)); RAMP['gelenk'] = e
    REC[0] = []
    box('Rampe', L1, W, 0.16, -L1 / 2, 0, -0.08, M['h2'], 0.02)
    box('Rampe Aussenhaut', L1 - 0.12, W - 0.12, 0.02, -L1 / 2, 0, -0.17, M['h1'], 0.004)
    for k in range(11): box('Trittleiste', 0.05, W - 0.5, 0.025, -0.2 - k * 0.27, 0, 0.012, M['mittel'], 0.004)
    for s in (1, -1):
        box('Rampenrand', L1, 0.12, 0.12, -L1 / 2, s * (W / 2 - 0.06), 0.06, M['warnrw'], 0.006)
        box('Scharnier', 0.24, 0.4, 0.2, 0.0, s * 1.6, -0.06, M['mittel'], 0.01)
    for k in range(3): box('Rampe Fuge', 0.03, W - 0.2, 0.004, -0.8 - k * 0.8, 0, -0.181, M['fuge'], 0)
    main = REC[0]; REC[0] = None
    for o in main: o.parent = e
    ext = group('Rampe Verlaengerung', T(hx, 0, hz)); ext.parent = e; ext.matrix_parent_inverse = e.matrix_world.inverted()
    REC[0] = []
    box('Verlaengerung', L2, W - 0.4, 0.1, -L1 - L2 / 2 + 0.1, 0, -0.13, M['h2'], 0.015)
    for k in range(11): box('Trittleiste', 0.05, W - 0.8, 0.025, -L1 - 0.1 - k * 0.27, 0, -0.07, M['mittel'], 0.004)
    prism('Auflaufkante', [(-L1 - L2 + 0.1, -0.08), (-L1 - L2 - 0.22, -0.18), (-L1 - L2 + 0.1, -0.18)], -(W - 0.4) / 2, (W - 0.4) / 2, M['warnrw'], 'Y', 0.005)
    xo = REC[0]; REC[0] = None
    for o in xo: o.parent = ext
    RAMP['ext'] = ext; RAMP['ext_objs'] = xo
    # Zylinder der Rampe (nur offen sichtbar): zwei Stück, oben an der Laderaumwand
    RAMP['zyl'] = []
    for s in (1, -1):
        c1 = cyl('Rampenzylinder', 0.09, 1.6, 0, 0, 0, M['mittel'], 'Z', n=14); c2 = cyl('Rampenkolben', 0.05, 1.6, 0, 0, 0, M['chrom'], 'Z', n=12)
        RAMP['zyl'].append((s, c1, c2))
    # Rahmen der Hecköffnung mit Warnstreifen
    for s in (1, -1): box('Torpfosten', 0.24, 0.22, DOOR_Z - 2.35, X_STERN - 0.05, s * (DOOR_Y + 0.11), (DOOR_Z + 2.35) / 2, M['warnrw'], 0.01)
    box('Torsturz', 0.24, 2 * DOOR_Y + 0.44, 0.24, X_STERN - 0.05, 0, DOOR_Z + 0.12, M['warnrw'], 0.01)
def cargo_bay():
    CUR[0] = C_ROOM
    x0, x1, w, f0, c0 = X_STERN + 0.05, -11.0, 3.6, 2.55, 5.85
    bm = bmesh.new()
    P = [bm.verts.new(p) for p in ((x0, -w, f0), (x1, -w, f0), (x1, w, f0), (x0, w, f0), (x0, -w, c0), (x1, -w, c0), (x1, w, c0), (x0, w, c0))]
    for q in ((0, 1, 2, 3), (4, 7, 6, 5), (0, 4, 5, 1), (3, 2, 6, 7)): bm.faces.new([P[i] for i in q])      # Stirnwand mit Tür: kor_innen.py
    me = bpy.data.meshes.new('Laderaum'); bm.to_mesh(me); bm.free(); me.materials.append(M['innen'])
    link(bpy.data.objects.new('Laderaum', me))
    # Stirnwand des Hecks innen neben der Öffnung (deckt den Rumpf von innen ab)
    for s in (1, -1): box('Heckwand innen', 0.06, w - DOOR_Y, c0 - f0, x0 + 0.04, s * (DOOR_Y + (w - DOOR_Y) / 2), (f0 + c0) / 2, M['innen'], 0)
    box('Heckwand oben', 0.06, 2 * DOOR_Y, c0 - DOOR_Z, x0 + 0.04, 0, (DOOR_Z + c0) / 2, M['innen'], 0)
    for k in range(9):      # Spanten, Bodenschienen, Deckenlichter
        x = x0 + 0.6 + k * 1.2
        for s in (1, -1): box('Spant', 0.16, 0.22, c0 - f0, x, s * (w - 0.11), (f0 + c0) / 2, M['mittel'], 0.01)
        box('Deckenspant', 0.16, 2 * w, 0.2, x, 0, c0 - 0.1, M['mittel'], 0.01)
        if k % 2 == 0: box('Deckenleuchte', 0.5, 1.6, 0.03, x + 0.6, 0, c0 - 0.03, M['deck'], 0)
    for s in (1, -1):
        box('Zurrschiene', x0 - x1, 0.08, 0.02, (x0 + x1) / 2, s * 1.6, f0 + 0.01, M['mittel'], 0.004)
        box('Bodenrand', x0 - x1, 0.4, 0.03, (x0 + x1) / 2, s * (w - 0.2), f0 + 0.015, M['warnrw'], 0.004)
    box('Bodenblech', x0 - x1, 2 * w - 0.8, 0.02, (x0 + x1) / 2, 0, f0 + 0.01, M['floor'], 0.004)
    area('Laderaumlicht', (-16.5, 0, c0 - 0.2), (0, 0, 0), 6.0, 2.4, 260, (0.9, 0.95, 1.0))

# =====================================================================================
# Leiterluke unter dem Cockpit
# =====================================================================================
HATCHP = {}
def ladder_hatch():
    x0, x1, hw = HATCH; xc = (x0 + x1) / 2; zb = surf(xc, 0, -1)[0].z if surf(xc, 0, -1)[0] else 2.0
    zb = min(surf(x0 - 0.05, 0.0, -1)[0].z, surf(x1 + 0.05, 0.0, -1)[0].z)
    CUR[0] = C_ROOM
    for s in (1, -1): box('Schachtwand', x1 - x0, 0.04, 4.5 - zb + 0.1, xc, s * hw, (4.5 + zb) / 2, M['innen'], 0)
    for xx in (x0, x1): box('Schachtwand', 0.04, 2 * hw, 4.5 - zb + 0.1, xx, 0, (4.5 + zb) / 2, M['innen'], 0)
    box('Schachtdecke', x1 - x0, 2 * hw, 0.04, xc, 0, 4.5, M['innen2'], 0)
    for k in range(6): box('Schachtsprosse', 0.03, 0.6, 0.03, x0 + 0.06, 0, zb + 0.35 + k * 0.32, M['steel'], 0.004)
    box('Schachtlicht', 0.03, 0.5, 0.06, x1 - 0.05, 0, 4.3, M['deck'], 0)
    point('Schachtleuchte', (xc, 0, 4.0), 12, (0.9, 0.95, 1.0), 0.1)
    CUR[0] = C_PART
    for s in (1, -1): box('Lukenrahmen', x1 - x0 + 0.2, 0.1, 0.06, xc, s * (hw + 0.05), zb - 0.01, M['warnrw'], 0.005)
    for xx in (x0 - 0.05, x1 + 0.05): box('Lukenrahmen', 0.1, 2 * hw + 0.2, 0.06, xx, 0, zb - 0.01, M['warnrw'], 0.005)
    hg = group('Lukendeckel Gelenk', T(x1, 0, zb)); HATCHP['gelenk'] = hg
    REC[0] = []
    box('Lukendeckel', x1 - x0 - 0.04, 2 * hw - 0.04, 0.06, -(x1 - x0) / 2, 0, -0.02, M['h2'], 0.01)
    box('Lukengriff', 0.05, 0.4, 0.04, -(x1 - x0) + 0.15, 0, -0.07, M['mittel'], 0.005)
    for o in REC[0]: o.parent = hg
    REC[0] = None
    # Leiter: drei Teleskopstücke, Sprossen, Gummifüße; steht leicht schräg nach vorn
    lg = group('Leiter', T(xc, 0, zb)); HATCHP['leiter'] = lg
    REC[0] = []
    top, bot = Vector((-0.1, 0, 0.6)), Vector((0.45, 0, -zb + 0.04))
    d = bot - top; Lg = d.length; ang = math.atan2(d.x, -d.z)
    for s in (1, -1):
        for k, (a, b, wd) in enumerate(((0.0, 0.4, 0.07), (0.36, 0.72, 0.06), (0.68, 1.0, 0.05))):
            p, q = top + d * a, top + d * b; c = (p + q) / 2
            box('Leiterholm', wd, wd * 0.6, (q - p).length, c.x, s * (0.32 - k * 0.012), c.z, M['mittel'], 0.004, rot=(0, -ang, 0))
        box('Leiterfuss', 0.2, 0.1, 0.05, bot.x, s * 0.3, bot.z, M['rubber'], 0.01)
    n = int(Lg / 0.28)
    for k in range(1, n):
        p = top + d * (k / n); cyl('Leitersprosse', 0.018, 0.62, p.x, 0, p.z, M['steel'], 'Y', n=8)
    for s in (1, -1): pipe('Haltebuegel', [Vector((-0.4, s * 0.38, 0.0)), Vector((-0.4, s * 0.38, -0.5)), Vector((-0.1, s * 0.38, -0.7))], 0.02, M['warnrw'], rad=0.1)
    for o in REC[0]: o.parent = lg
    REC[0] = None

# =====================================================================================
# Fahrwerk: Federbein, Stützstrebe, Drehmomentschere, Landeteller, Schachtklappen
# =====================================================================================
def gear(name, x, y, pad=(1.4, 1.0), brace=1):
    loc, n = surf(x, y, -1); zt = loc.z
    with Part(name, T(x, y, 0), C_GEAR):
        box('Schacht', pad[0] + 0.6, pad[1] + 0.4, 0.06, 0, 0, zt - 0.01, M['dunkel'], 0.01)
        for s in (1, -1):      # Klappen offen, hängen seitlich
            box('Schachtklappe', pad[0] + 0.5, 0.05, 0.75, 0, s * ((pad[1] + 0.4) / 2 + 0.03), zt - 0.38, M['h1'], 0.01, rot=(s * math.radians(8), 0, 0))
        cyl('Federbein', 0.2, zt - 1.0, 0, 0, (zt + 1.0) / 2, M['mittel'], 'Z', n=20)
        cyl('Federbein Kragen', 0.24, 0.12, 0, 0, 1.06, M['dunkel'], 'Z', n=20)
        cyl('Kolbenstange', 0.13, 0.75, 0, 0, 0.72, M['chrom'], 'Z', n=20)
        box('Gelenkkopf', 0.36, 0.32, 0.22, 0, 0, 0.36, M['mittel'], 0.02)
        box('Landeteller', pad[0], pad[1], 0.14, 0, 0, 0.13, M['mittel'], 0.03)
        box('Landeteller Sohle', pad[0] - 0.06, pad[1] - 0.06, 0.06, 0, 0, 0.03, M['rubber'], 0.01)
        for s in (1, -1):
            box('Tellerrippe', pad[0] - 0.2, 0.06, 0.12, 0, s * 0.18, 0.26, M['mittel'], 0.008)
            box('Schere', 0.06, 0.05, 0.42, 0.22, s * 0.06, 0.9 + s * 0.0, M['dunkel'], 0.005, rot=(0, math.radians(25 * s), 0))
        bx = brace * 0.95
        pipe('Stuetzstrebe', [Vector((bx, 0, zt - 0.05)), Vector((0.12 * brace, 0, 1.25))], 0.07, M['mittel'])
        box('Strebenlager', 0.3, 0.2, 0.12, bx, 0, zt - 0.08, M['dunkel'], 0.01)
        pipe('Hydraulikleitung', [Vector((0.15, 0.2, zt - 0.05)), Vector((0.21, 0.21, 1.6)), Vector((0.18, 0.21, 1.15))], 0.014, M['rubber'])
        point('Landelicht', (0.3, 0, zt - 0.2), 0, (1, 1, 1))
def landing_gear():
    gear('Bugfahrwerk', 15.8, 0.0, (1.0, 0.8), -1)
    for s in (1, -1):
        gear('Hauptfahrwerk', -5.0, s * 7.8, (1.5, 1.1), 1)
        gear('Heckfahrwerk', -13.0, s * 4.4, (1.3, 1.0), 1)

# =====================================================================================
# Waffen: zwei Kanonen unter den Flügelwurzeln, Rückenturm, Kinnturm, zwei Flugkörperträger
# =====================================================================================
def gunpod(name, x, y):
    loc, _ = surf(x, y, -1)
    with Part(name, T(x, y, loc.z), C_WPN):
        box('Pylon', 1.8, 0.24, 0.5, 0.2, 0, -0.15, M['h2'], 0.02)
        prism('Kanonengehaeuse', chamfer_rect(0.64, 0.56, 0.14), -1.3, 1.6, M['h1'], 'X', 0.02)
        for o in REC[0][-1:]: o.location.z = -0.66
        prism('Gehaeusenase', [(-0.22, -0.18), (0.22, -0.18), (0.22, 0.14), (-0.22, 0.14)], 1.6, 2.0, M['dunkel'], 'X', 0.02)
        for o in REC[0][-1:]: o.location.z = -0.66
        cyl('Rohrmantel', 0.11, 0.9, 2.4, 0, -0.66, M['dunkel'], 'X', n=16)
        for k in range(5): cyl('Kuehlring', 0.125, 0.04, 2.05 + k * 0.17, 0, -0.66, M['mittel'], 'X', n=16)
        cyl('Rohr', 0.07, 1.8, 3.6, 0, -0.66, M['mittel'], 'X', n=16)
        cyl('Muendungsbremse', 0.1, 0.32, 4.5, 0, -0.66, M['dunkel'], 'X', n=8)
        box('Munitionsklappe', 1.0, 0.02, 0.32, -0.3, 0.33, -0.66, M['h2'], 0.004)
        for k in range(6): box('Lueftung', 0.05, 0.3, 0.02, -0.9 + k * 0.12, 0, -0.37, M['dunkel'], 0)
def turret_top():
    mw = onsurf(-2.0, 0.0, 1, lift=0.0)
    with Part('Rueckenturm', mw, C_WPN):
        cyl('Drehkranz', 0.95, 0.12, 0, 0, 0.06, M['mittel'], 'Z', n=32)
        prism('Turmkoerper', [(1.0, 0.0), (0.6, 0.62), (-0.7, 0.62), (-0.9, 0.4), (-0.9, -0.4), (-0.7, -0.62), (0.6, -0.62)], 0.12, 0.36, M['h2'], 'Z', 0.02)
        prism('Turmblende', [(0.55, 0.12), (1.05, 0.12), (1.05, 0.33), (0.55, 0.36)], -0.5, 0.5, M['dunkel'], 'Y', 0.01)
        for s in (1, -1):
            cyl('Turmrohr', 0.055, 2.1, 2.05, s * 0.28, 0.24, M['mittel'], 'X', n=14)
            cyl('Turmrohrmantel', 0.08, 0.5, 1.25, s * 0.28, 0.24, M['dunkel'], 'X', n=14)
        box('Zielsensor', 0.24, 0.2, 0.08, 0.3, 0.42, 0.4, M['dunkel'], 0.01)
        box('Zielsensor Glas', 0.01, 0.14, 0.05, 0.42, 0.42, 0.4, M['kanzel'], 0)
def turret_chin():
    loc, _ = surf(19.6, 0, -1)
    with Part('Kinnturm', T(19.6, 0, loc.z), C_WPN):
        cyl('Kinnturm Sockel', 0.5, 0.14, 0, 0, -0.04, M['mittel'], 'Z', n=28)
        sphere('Kinnturm Kugel', 0.4, 0, 0, -0.42, M['h2'])
        for s in (1, -1): cyl('Kinnturm Rohr', 0.045, 1.3, 0.9, s * 0.16, -0.46, M['mittel'], 'X', n=12)
        box('Kinnturm Blende', 0.2, 0.5, 0.26, 0.36, 0, -0.44, M['dunkel'], 0.02)
def missile(name, x, y, z):
    cyl(name, 0.14, 2.4, x - 0.2, y, z, M['rakete'], 'X', n=16)
    cyl(name + ' Spitze', 0.14, 0.45, x + 1.22, y, z, M['rakete'], 'X', n=16, r2=0.02)
    cyl(name + ' Band', 0.145, 0.08, x + 0.7, y, z, M['ochre'], 'X', n=16, bev=0)
    for k in range(4):
        a = PI / 4 + k * PI / 2
        box(name + ' Leitwerk', 0.3, 0.02, 0.18, x - 1.25, y + math.cos(a) * 0.2, z + math.sin(a) * 0.2, M['rakete'], 0.002, rot=(a - PI / 2, 0, 0))
def missile_rack(name, x, y):
    loc, _ = surf(x, y, -1)
    with Part(name, T(x, y, loc.z), C_WPN):
        box('Traegerpylon', 2.4, 0.2, 0.36, 0, 0, -0.14, M['h2'], 0.02)
        box('Abwurfschiene', 2.8, 0.74, 0.12, 0, 0, -0.38, M['mittel'], 0.01)
        for dy, dz in ((-0.24, -0.6), (0.24, -0.6), (0.0, -0.92)): missile('Flugkoerper', 0.0, dy, dz)
def weapons():
    for s in (1, -1):
        gunpod('Kanone', 4.5, s * 7.0)
        missile_rack('Flugkoerpertraeger', -7.5, s * 12.5)
    turret_top(); turret_chin()

# =====================================================================================
# Kleinteile: Steuerdüsen, Flügelendscheiben, Heckflossen, Antennen, Kühler, Luken, Lichter
# =====================================================================================
def rcs(name, x, y, side, out):      # Block mit drei Düsen: nach außen (out), nach oben/unten (side) und nach vorn/hinten
    mw = onsurf(x, y, side, lift=0.0)
    with Part(name, mw, C_PART):
        box('Duesenblock', 0.6, 0.45, 0.22, 0, 0, 0.1, M['h2'], 0.02)
        for k, (dx, dy, dz, ax) in enumerate(((0, out * 0.24, 0.1, 'Y'), (0.32, 0, 0.1, 'X'), (-0.32, 0, 0.1, 'X'), (0, 0, 0.22, 'Z'))):
            cyl('Steuerduese', 0.05, 0.08, dx, dy, dz, M['duese'], ax, n=12, r2=0.065)
            cyl('Steuerduese innen', 0.035, 0.085, dx, dy, dz, M['dunkel'], ax, n=12)
def fins():
    CUR[0] = C_PART
    for s in (1, -1):      # Endscheiben an den Flügelspitzen, senkrecht nach unten
        y = s * 16.94; zt = tab(ZE, -14.5) - 0.1
        prism('Endscheibe', [(-13.3, zt + 0.12), (-15.6, zt + 0.12), (-15.9, zt - 1.2), (-14.6, zt - 1.2)], y - 0.06, y + 0.06, M['h2'], 'Y', 0.015)
        sphere('Positionslicht', 0.06, -13.45, s * 16.94, zt - 0.2, M['nav_r' if s > 0 else 'nav_g'], 12)
        point('Positionslicht', (-13.3, s * 16.94, zt - 0.2), 3, (1, 0.1, 0.05) if s > 0 else (0.1, 1, 0.3), 0.03)
        # Heckflossen auf dem Rücken
        loc, n = surf(-19.4, s * 3.0, 1)
        prism('Heckflosse', [(-18.6, loc.z - 0.1), (-20.9, loc.z - 0.1), (-21.0, loc.z + 0.48), (-20.2, loc.z + 0.48)], s * 3.0 - 0.05, s * 3.0 + 0.05, M['h2'], 'Y', 0.01)
        sphere('Hecklicht', 0.045, -21.0, s * 3.0, loc.z + 0.44, M['blitz'], 12)
def antennas():
    CUR[0] = C_PART
    mw = onsurf(-10.0, 0.9, 1, lift=0.0)
    with Part('Klingenantenne', mw, C_PART):
        prism('Antenne', [(0.3, 0), (-0.25, 0), (-0.4, 0.28), (-0.2, 0.28)], -0.02, 0.02, M['dunkel'], 'Y', 0.004)
    mw = onsurf(-7.0, 0.0, 1, lift=0.0)
    with Part('Sensorkuppel', mw, C_PART):
        cyl('Kuppelsockel', 0.36, 0.06, 0, 0, 0.03, M['mittel'], 'Z', n=24)
        s = sphere('Sensorkuppel', 0.27, 0, 0, 0.06, M['kanzel'], 24)
        s.scale = (1, 1, 0.75)
    mw = onsurf(-14.0, -0.9, 1, lift=0.0)
    with Part('Stabantenne', mw, C_PART):
        cyl('Antennenfuss', 0.05, 0.08, 0, 0, 0.04, M['mittel'], 'Z', n=10)
        cyl('Antennenstab', 0.012, 0.24, 0, 0, 0.2, M['dunkel'], 'Z', n=6)
    for side in (1, -1):      # Kollisionswarnlicht oben und unten
        loc, n = surf(-6.0, 0.0, side)
        CUR[0] = C_LITE
        sphere('Warnlicht', 0.07, loc.x, loc.y, loc.z + side * 0.05, M['nav_r'], 12)
        point('Warnlicht', (loc.x, loc.y, loc.z + side * 0.15), 4, (1, 0.08, 0.04), 0.04)
def grille(name, x, y, lx, ly, side=1, n=10, fwd=(1, 0, 0)):      # Gitter auf der Oberfläche: dunkler Grund, Lamellen quer
    mw = onsurf(x, y, side, fwd, lift=0.0)
    with Part(name, mw, C_PART):
        box('Gittergrund', lx, ly, 0.02, 0, 0, 0.01, M['dunkel'], 0)
        for k in range(n): box('Lamelle', 0.035, ly - 0.08, 0.07, -lx / 2 + (k + 0.5) * lx / n, 0, 0.05, M['mittel'], 0.004, rot=(0, math.radians(30), 0))
        for s in (1, -1): box('Gitterrahmen', lx + 0.08, 0.05, 0.09, 0, s * (ly / 2 + 0.02), 0.045, M['h2'], 0.006)
        for s in (1, -1): box('Gitterrahmen', 0.05, ly, 0.09, s * (lx / 2 + 0.02), 0, 0.045, M['h2'], 0.006)
def access(name, x, y, w, l, side=1, fwd=(1, 0, 0)):      # Wartungsklappe: Rahmenfuge, zwei Griffmulden, Schnellverschlüsse
    mw = onsurf(x, y, side, fwd, lift=0.0)
    with Part(name, mw, C_PART):
        for s in (1, -1):
            box('Klappenfuge', w, 0.025, 0.006, 0, s * l / 2, 0.003, M['fuge'], 0)
            box('Klappenfuge', 0.025, l, 0.006, s * w / 2, 0, 0.003, M['fuge'], 0)
            box('Griffmulde', 0.16, 0.06, 0.008, s * (w / 2 - 0.16), 0, 0.004, M['dunkel'], 0)
        for sx in (1, -1):
            for sy in (1, -1): cyl('Verschluss', 0.024, 0.01, sx * (w / 2 - 0.07), sy * (l / 2 - 0.07), 0.005, M['ochre'], 'Z', n=10, bev=0)
def lamp(name, x, y, side, fwd, m='blitz', w=0.3, h=0.12):      # Scheinwerfer: Gehäuse, Glas nach vorn
    mw = onsurf(x, y, side, fwd, lift=0.0)
    with Part(name, mw, C_LITE):
        box('Lampengehaeuse', 0.3, w + 0.08, h + 0.08, 0, 0, (h + 0.08) / 2, M['dunkel'], 0.01)
        box('Lampenglas', 0.02, w, h, 0.16, 0, (h + 0.08) / 2, M[m], 0)
def extras():      # weitere Kleinteile, symmetrisch: Wartungsklappen am Rücken und Bauch, Wärmetauscher, Scheinwerfer, Ablassöffnungen
    for s in (1, -1):
        for x in (-1.0, -4.5, -8.5, -12.5): access('Rueckenklappe', x, s * 2.95, 0.8, 0.42)
        for x in (6.0, 0.0, -8.0): access('Bauchklappe', x, s * 1.5, 1.0, 0.5, -1)
        access('Hardpointabdeckung', -12.0, s * 11.5, 1.2, 0.8)
        access('Hardpointabdeckung', -4.0, s * 11.4, 0.9, 0.6)
        grille('Waermetauscher', -19.6, s * 6.3, 1.2, 2.0, 1, 7)
        grille('Ablass', 12.5, s * 1.4, 0.6, 0.4, -1, 4)
        lamp('Landescheinwerfer', 17.2, s * 0.75, -1, (1, 0, 0))
        lamp('Rumpfscheinwerfer', -1.0, s * 9.6, -1, (1, 0, 0), 'blitz', 0.22, 0.1)
        for k in range(4):      # Schnellverschlüsse entlang der Flügelwurzel oben
            x = -1.0 - k * 3.0; loc, n = surf(x, s * 4.75, 1)
            CUR[0] = C_PART; cyl('Verschluss', 0.03, 0.012, loc.x, loc.y, loc.z + 0.016, M['ochre'], 'Z', n=10, bev=0)

def details():
    for s in (1, -1):
        rcs('Steuerduesen Spitze', -14.6, s * 16.2, 1, s); rcs('Steuerduesen Spitze unten', -14.6, s * 16.2, -1, s)
        rcs('Steuerduesen Bug', 17.2, s * 2.12, 1, s); rcs('Steuerduesen Heck', -20.4, s * 7.2, 1, s)
        grille('Kuehler', -17.0, s * 6.3, 2.8, 2.0, 1, 14)
        grille('Ansaugung', -5.6, s * 2.6, 1.6, 0.7, 1, 7)
        grille('Ablass unten', -6.0, s * 1.9, 2.0, 0.9, -1, 9)
        access('Wartungsklappe', -9.0, s * 3.9, 0.9, 0.6)
        access('Tankklappe', -3.0, s * 8.3, 0.6, 0.6)
        access('Wartungsklappe unten', 3.0, s * 3.7, 1.2, 0.8, -1)
        access('Wartungsklappe unten', -11.5, s * 10.4, 1.0, 0.8, -1)
    fins(); antennas(); extras()

# =====================================================================================
# Beschriftung und Akzentstreifen
# =====================================================================================
def stencil(s, size, x, y, side=1, up=(1, 0, 0), m='txtw', align='CENTER'):
    loc, n = surf(x, y, side)
    Yv = Vector(up); Yv = (Yv - n * Yv.dot(n)).normalized(); Xv = Yv.cross(n)
    CUR[0] = C_DECAL
    o = text(s, size, loc + n * 0.016 - Yv * size * 0.35, Xv, Yv, M[m], align=align, name='Beschriftung')
    # in ein Netz wandeln und auf den Rumpf legen (die Facetten sind nicht ganz eben; so folgt die Schrift der Fläche wie Lack)
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    ob = link(bpy.data.objects.new('Beschriftung', me)); ob.matrix_world = o.matrix_world.copy(); bpy.data.objects.remove(o, do_unlink=True)
    sw = ob.modifiers.new('Auflegen', 'SHRINKWRAP'); sw.target = HULL; sw.offset = 0.014; sw.wrap_mode = 'OUTSIDE_SURFACE'
    return ob
def decal_quad(name, pts, side, m, lift=0.017):      # flaches Vieleck (Draufsicht) auf die Oberfläche gelegt, je Eckpunkt angepasst
    bm = bmesh.new(); vs = []
    for x, y in pts:
        loc, n = surf(x, y, side); vs.append(bm.verts.new(loc + n * lift))
    f = bm.faces.new(vs if side > 0 else vs[::-1])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(M[m])
    CUR[0] = C_DECAL; return link(bpy.data.objects.new(name, me))
def edge_strip(A, Bv, side, t0, t1, n_seg, m='kante', lift=0.016):      # schmale Leiste parallel zu einer Kante (Draufsicht), in Stücke geteilt
    d = (Bv - A); nrm = Vector((d.y, -d.x)).normalized()
    if nrm.dot(-A) < 0: nrm = -nrm
    for k in range(n_seg):
        p, q = A + d * (k / n_seg), A + d * ((k + 1) / n_seg - 0.004)
        pts = [p + nrm * t0, q + nrm * t0, q + nrm * t1, p + nrm * t1]
        pts = [(v.x, v.y * side) for v in pts]
        if side < 0: pts = pts[::-1]
        decal_quad('Kantenleiste', pts, 1, m, lift)
def scoop(name, x, y):      # Lufteinlass unter der Flügelwurzel: Keil mit dunklem Maul nach vorn
    mw = onsurf(x, y, -1, lift=0.0)
    with Part(name, mw, C_PART):
        prism('Einlasskeil', [(1.0, -0.02), (-1.2, -0.02), (-1.2, 0.06), (0.6, 0.36), (1.0, 0.36)], -0.45, 0.45, M['h2'], 'Y', 0.015)
        box('Einlassmaul', 0.05, 0.76, 0.3, 1.0, 0, 0.18, M['dunkel'], 0)
        for k in range(5): box('Einlassgitter', 0.03, 0.02, 0.28, 1.01, -0.3 + k * 0.15, 0.18, M['mittel'], 0)
def markings():
    for s in (1, -1):
        edge_strip(Vector((8.0, 6.3)), Vector((-11.5, 16.7)), s, 0.05, 0.16, 22)
        edge_strip(Vector((-15.5, 17.0)), Vector((-21.6, 9.74)), s, 0.05, 0.14, 8)
        scoop('Lufteinlass', -1.0, s * 5.6)
        mw = onsurf(-16.0, s * 1.5, -1, lift=0.0)
        with Part('Bauchantenne', mw, C_PART):
            prism('Antenne', [(0.3, 0), (-0.25, 0), (-0.4, 0.26), (-0.2, 0.26)], -0.02, 0.02, M['dunkel'], 'Y', 0.004)
    stencil('LC 46', 0.9, -2.0, 6.25, 1, (0, 1, 0))
    stencil('KORMORAN', 0.52, -2.2, -6.25, 1, (0, -1, 0))
    for s in (1, -1):
        for k in range(2):      # zwei Kobaltbalken nahe der Flügelspitze
            x0 = -11.0 - k * 0.9
            decal_quad('Akzentbalken', [(x0, s * 14.4), (x0 - 0.5, s * 14.4), (x0 - 1.2, s * 16.2), (x0 - 0.7, s * 16.2)][::s], 1, 'akzent')
        for k in range(12):      # Laufweg auf dem Rücken: gestrichelte Linien
            x = 3.0 - k * 1.6
            decal_quad('Laufweglinie', [(x, s * 2.15), (x - 0.9, s * 2.15), (x - 0.9, s * 2.21), (x, s * 2.21)][::s], 1, 'txtw', 0.02)
        stencil('NICHT BETRETEN', 0.14, -6.0, s * 12.6, 1, (0, s, 0))
        stencil('TREIBSTOFF', 0.12, -3.0, s * 7.85)
        stencil('TRIEBWERK  ABSTAND 15 M', 0.13, -20.95, s * 6.1, 1, (1, 0, 0), 'txto')
        stencil('WAFFE', 0.12, 3.0, s * 7.0, -1)
        for k in range(3):      # Formationslichter oben entlang der Vorderkante
            x0 = -2.0 - k * 3.6; b0, b1 = tab(B, x0), tab(B, x0 - 0.8)
            decal_quad('Formationslicht', [(x0, s * (b0 - 0.25)), (x0 - 0.8, s * (b1 - 0.25)), (x0 - 0.8, s * (b1 - 0.31)), (x0, s * (b0 - 0.31))][::s], 1, 'form')
    stencil('EINSTIEG', 0.14, 12.3, 0.0, -1)
    stencil('RAMPE  VORSICHT', 0.14, -14.5, 0.0, -1)

# =====================================================================================
# Innenraum-Platzhalter (für den späteren Ausbau) und Prüfung gegen den Rumpf
# =====================================================================================
ROOMS = {
    'Laderaum': (-21.7, -11.0, -3.6, 3.6, 2.55, 5.85),
    'Hauptgang': (-11.0, 6.0, -1.0, 1.0, 2.55, 5.0),
    'Quartiere Backbord': (-10.0, -2.0, 1.0, 5.2, 2.55, 5.0),
    'Quartiere Steuerbord': (-10.0, -2.0, -5.2, -1.0, 2.55, 5.0),
    'Messe': (-2.0, 5.0, 1.0, 4.6, 2.55, 5.0),
    'Technik': (-2.0, 5.0, -4.6, -1.0, 2.55, 5.0),
    'Treppe zum Cockpit': (6.0, 9.9, -1.0, 1.0, 2.55, 5.4),
    'Leiterschacht': (10.45, 11.55, -0.55, 0.55, 2.1, 4.5),
}
def rooms():
    CUR[0] = C_IN; bad = []
    for name, (x0, x1, y0, y1, z0, z1) in ROOMS.items():
        ob = box(name, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, M['innen'], 0)
        ob.display_type = 'WIRE'; ob.hide_render = True
        for x in (x0, (x0 + x1) / 2, x1):
            for y in (y0, y1):
                top = surf(x, y, 1)[0]; bot = surf(x, y, -1)[0]
                if top is None or top.z < z1 + 0.15: bad.append((name, 'oben', round(x, 1), round(y, 1), round(top.z, 2) if top else None))
                if name != 'Leiterschacht' and (bot is None or bot.z > z0 - 0.15): bad.append((name, 'unten', round(x, 1), round(y, 1), round(bot.z, 2) if bot else None))
    return bad

# =====================================================================================
# Bühne: Studio (grauer Boden mit Spiegelung) und Weltraum; Figuren zum Größenvergleich; Kameras
# =====================================================================================
CAMS = {}
def cam(name, loc, tgt, lens=50, ortho=None):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_end = 3000; cd.clip_start = 0.1
    if ortho: cd.type = 'ORTHO'; cd.ortho_scale = ortho
    ob = bpy.data.objects.new(name, cd); C_STU.objects.link(ob)
    ob.location = loc; ob.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); CAMS[name] = ob
def figure(name, x, y, yaw=0.0):
    CUR[0] = C_STU
    with Part(name, T(x, y, 0) @ RZ(yaw), C_STU):
        for s in (1, -1):
            cyl('Bein', 0.075, 0.86, 0, s * 0.1, 0.43, M['figur'], 'Z', n=12)
            cyl('Arm', 0.05, 0.62, 0, s * 0.26, 1.16, M['figur'], 'Z', n=10)
        box('Rumpf', 0.24, 0.42, 0.6, 0, 0, 1.17, M['figur'], 0.06)
        sphere('Kopf', 0.11, 0, 0, 1.64, M['figur'], 16)
def stage():
    CUR[0] = C_STU
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=600)
    me = bpy.data.meshes.new('Boden'); bm.to_mesh(me); bm.free()
    fm = mk('Studioboden', (0.16, 0.16, 0.165), 0.0, 0.22, var=0.04, rvar=0.03, scale=0.2, grime=False)
    me.materials.append(fm); fl = link(bpy.data.objects.new('Boden', me))
    sun = bpy.data.lights.new('Sonne', 'SUN'); sun.energy = 3.6; sun.angle = math.radians(3); sun.color = (1.0, 0.97, 0.93)
    so = bpy.data.objects.new('Sonne', sun); C_STU.objects.link(so); so.rotation_euler = (math.radians(56), 0, math.radians(140))
    fill = bpy.data.lights.new('Gegenlicht', 'AREA'); fill.energy = 40000; fill.size = 40; fill.color = (0.85, 0.9, 1.0)
    fo = bpy.data.objects.new('Gegenlicht', fill); C_STU.objects.link(fo); fo.location = (-40, -30, 30)
    fo.rotation_euler = (Vector((0, 0, 3)) - fo.location).to_track_quat('-Z', 'Y').to_euler()
    ul = bpy.data.lights.new('Unterlicht', 'AREA'); ul.energy = 0; ul.size = 30; ul.color = (0.9, 0.93, 1.0)
    uo = bpy.data.objects.new('Unterlicht', ul); C_STU.objects.link(uo); uo.location = (8, -14, -26)
    uo.rotation_euler = (Vector((0, 0, 2)) - uo.location).to_track_quat('-Z', 'Y').to_euler(); STAGE['unter'] = uo
    figure('Figur Rampe', -28.6, 3.4, 0.4); figure('Figur Leiter', 13.6, -1.6, 2.6)
    w = SC.world or bpy.data.worlds.new('Welt'); SC.world = w; w.use_nodes = True
    STAGE.update(floor=fl, sun=so, fill=fo, world=w)
    cam('Front', (44, 30, 13), (1, 0, 3.6), 50)
    cam('Seite', (0, 82, 4.2), (0, 0, 4.0), 60)
    cam('Heck', (-46, -24, 6.5), (-14, 0, 3.2), 50)
    cam('Oben', (0, 0, 80), (0, 0, 0), 50, ortho=62)
    cam('Unten', (14, -34, -12), (-1, 0, 2.2), 45)
    cam('Detail', (22.5, 7.5, 8.6), (13.0, 0.5, 5.6), 50)
    cam('Leiter', (19.0, -9.0, 2.2), (11.0, 0, 1.4), 45)
    cam('Weltraum', (40, -36, 20), (0, 0, 3.0), 55)
STAGE = {}
def world(space):
    w = STAGE['world']; nt = w.node_tree; N = nt.nodes; K = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputWorld'); bg = N.new('ShaderNodeBackground'); K.new(bg.outputs[0], out.inputs[0])
    if not space:
        bg.inputs['Color'].default_value = (0.2, 0.2, 0.21, 1); bg.inputs['Strength'].default_value = 0.42; return
    tc = N.new('ShaderNodeTexCoord'); vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 420
    K.new(tc.outputs['Generated'], vo.inputs['Vector'])
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 0.05
    mr.inputs['To Min'].default_value = 3.0; mr.inputs['To Max'].default_value = 0.0; K.new(vo.outputs['Distance'], mr.inputs['Value'])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 2.5; K.new(tc.outputs['Generated'], nz.inputs['Vector'])
    m2 = N.new('ShaderNodeMapRange'); m2.inputs['From Min'].default_value = 0.55; m2.inputs['From Max'].default_value = 0.75; K.new(nz.outputs[0], m2.inputs['Value'])
    mul = N.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; K.new(mr.outputs[0], mul.inputs[0]); K.new(m2.outputs[0], mul.inputs[1])
    neb = N.new('ShaderNodeMath'); neb.operation = 'MULTIPLY'; neb.inputs[1].default_value = 0.006; K.new(nz.outputs[0], neb.inputs[0])
    add = N.new('ShaderNodeMath'); add.operation = 'ADD'; K.new(mul.outputs[0], add.inputs[0]); K.new(neb.outputs[0], add.inputs[1])
    K.new(add.outputs[0], bg.inputs['Strength']); bg.inputs['Color'].default_value = (0.8, 0.86, 1.0, 1)

def zustand(offen=True, fahrwerk=True):      # Rampe und Leiter offen oder zu (Bild der Animation, kor_anim.py); Fahrwerk aus/eingefahren
    if RAMP.get('animiert'):
        SC.frame_set(RAMP_F[1] if offen else 1)
        for o in C_GEAR.all_objects: o.hide_render = not fahrwerk
        return
    e = RAMP['gelenk']; hx, hz = HINGE
    th = math.radians(-21.8) if offen else math.radians(90)
    e.matrix_world = T(hx, 0, hz) @ RY(th)
    for o in RAMP['ext_objs']: o.hide_render = not offen; o.hide_viewport = not offen
    for s, c1, c2 in RAMP['zyl']:
        a = Vector((hx + 1.4, s * 2.15, 4.9)); b = (T(hx, 0, hz) @ RY(th)) @ Vector((-1.5, s * 2.15, 0.1))
        d = b - a; L = d.length; q = d.to_track_quat('Z', 'Y')
        for o, f0, f1 in ((c1, 0.0, 0.55), (c2, 0.45, 1.0)):
            o.location = a + d * (f0 + f1) / 2; o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = q
            o.scale = (1, 1, L * (f1 - f0) / 1.6); o.hide_render = not offen; o.hide_viewport = not offen
    hg = HATCHP['gelenk']; x1 = HATCH[1]; zb = hg.matrix_world.translation.z
    hg.matrix_world = T(x1, 0, zb) @ RY(math.radians(-100) if offen else 0.0)
    for o in [HATCHP['leiter']] + list(HATCHP['leiter'].children): o.hide_render = not offen; o.hide_viewport = not offen
    for o in C_GEAR.all_objects: o.hide_render = not fahrwerk

def build():
    nf, nb = make_hull()
    canopy(); engines(); ramp(); cargo_bay(); ladder_hatch(); landing_gear(); weapons(); details(); markings()
    innen()
    bad = rooms(); stage(); innen_cams(); world(False); zustand(True)
    animate(); RAMP['animiert'] = True; zustand(True)
    return {'flaechen_rumpf': nf, 'schrauben': nb, 'innenraum_konflikte': bad}
def extents():      # Maße über alles (ohne Bühne, Platzhalter, offene Rampe, Leiter)
    dg = bpy.context.evaluated_depsgraph_get(); lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3); tops = []
    skip = set(o.name for o in C_STU.all_objects) | set(o.name for o in C_IN.all_objects) | set(o.name for o in C_ROOM.all_objects)
    for o in bpy.data.objects:
        if o.type not in ('MESH', 'CURVE', 'FONT') or o.name in skip or o.hide_render or 'Rampe' in o.name or 'Verlaenger' in o.name or 'Auflauf' in o.name or 'Trittleiste' in o.name: continue
        if o.parent and o.parent.name.startswith(('Leiter', 'Lukendeckel')): continue
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p)); tops.append((round(p.z, 2), o.name))
    tops = sorted(set(tops), reverse=True)[:4]
    back = sorted(set((round((o.matrix_world @ Vector(c)).x, 2), o.name) for o in bpy.data.objects if o.type in ('MESH', 'CURVE', 'FONT') and o.name not in skip and not o.hide_render for c in o.bound_box))[:3]
    return {'oben': tops, 'hinten': back, 'laenge': round(hi.x - lo.x, 2), 'breite': round(hi.y - lo.y, 2), 'hoehe': round(hi.z - lo.z, 2), 'min': [round(v, 2) for v in lo], 'max': [round(v, 2) for v in hi]}
def tris():
    dg = bpy.context.evaluated_depsgraph_get(); t = 0
    for it in dg.object_instances:
        ob = it.object
        if ob.type != 'MESH' or ob.original.name in STAGE_NAMES: continue
        try: me = ob.to_mesh(); t += sum(len(p.vertices) - 2 for p in me.polygons); ob.to_mesh_clear()
        except Exception: pass
    return t
STAGE_NAMES = set()

def cycles(samples=96):
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 8), ('glossy_bounces', 4), ('diffuse_bounces', 3), ('transmission_bounces', 6), ('adaptive_threshold', 0.02)): setp(cy, k, v)
    R = SC.render; R.image_settings.file_format = 'JPEG'; R.image_settings.quality = 92
    setp(SC.view_settings, 'view_transform', 'AgX'); setp(SC.view_settings, 'look', 'AgX - Medium High Contrast')
VIEWS = {      # Ansicht: (Kamera, Rampe/Leiter offen, Fahrwerk, Weltraum, Belichtung)
    'front': ('Front', False, True, False, 0.0), 'seite': ('Seite', False, True, False, 0.0), 'heck': ('Heck', True, True, False, 0.2),
    'oben': ('Oben', False, True, False, 0.0), 'unten': ('Unten', True, True, False, 1.2), 'detail': ('Detail', False, True, False, 0.0),
    'leiter': ('Leiter', True, True, False, 1.0), 'weltraum': ('Weltraum', False, False, True, 0.0),
}
def view(name, path, res=(1600, 900)):
    camn, offen, gear_on, space, ex = VIEWS[name]
    zustand(offen, gear_on); world(space)
    STAGE['floor'].hide_render = space or name == 'unten'
    for o in C_STU.all_objects:
        if o.name.startswith('Figur') or (o.parent and o.parent.name.startswith('Figur')): o.hide_render = space
    STAGE['sun'].data.energy = 4.0 if space else 3.6; STAGE['fill'].data.energy = 30000 if space else 40000
    M['glut'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 18 if space else 0.0
    SC.view_settings.exposure = ex; STAGE['unter'].data.energy = 60000 if name == 'unten' else 0
    SC.camera = CAMS[camn]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = 100
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)

exec(compile(open(os.path.join(HERE, 'kor_innen.py'), encoding='utf-8').read(), 'kor_innen.py', 'exec'))
exec(compile(open(os.path.join(HERE, 'kor_anim.py'), encoding='utf-8').read(), 'kor_anim.py', 'exec'))
if not globals().get('NUR_HELFER'):
    result = build()
    STAGE_NAMES.update(o.name for o in C_STU.all_objects)
