# Möwe MW-1 (26.11.2026): eigener Fahrzeugtransporter nach dem Konzeptbild docs/bilder/moewe-konzept.png.
# Nutzer: „Bau den so im Blender, wirklich Mühe geben, mach dir Gedanken über das Fahrwerk, über die Rampen, wie die ein- und ausfahren,
# wie das zusammenspielt mit dem Rumpf … Mach dir Gedanken fürs Cockpit, dass man auch eine gute Sicht im Flug hat.“
# Zweiter Anlauf nach: „Das schaut nicht aus wie auf dem Bild … Die Form ist ganz anders. Das Fahrwerk ist viel zu klein … 1:1 nachmachen.“
#
# Maße aus der Bauzeichnung des Bildes (Länge 40 m als Maßstab, 24 px/m in der Seitenansicht, 15,4 px/m in der Draufsicht).
# Achsen wie Milan, Dohle, Kranich: +X nach vorn, +Y Backbord, +Z oben, Boden z = 0. Spitze der offenen Haube bei x ≈ 20, Heck bei x = −20.
#  - Rumpf KANTIG: flaches Dach (8,5 m), breite obere Fase, senkrechte Seiten, große untere Fase nach innen, Boden 1,9 m über Grund.
#    Weiß oben, graues Band mit weißer Linie, dunkelgraues Unterteil (Bild).
#  - BUG: Die gelb gestreifte HAUBE ist das Bugtor. Gelenk oben unter dem Cockpit (15,0 / 7,4). Geschlossen steht sie vor der Öffnung
#    (Bugplatte bei x 14,0) und bildet Bugfläche und Seiten des Bugs; offen schwenkt sie um −82° nach oben und steht als Schnabel nach vorn
#    (Bild: Haube mit Fachwerk von unten sichtbar). Alle Punkte bleiben dabei unter dem Gelenk (kein Anschlag am Cockpit darüber).
#    Unten bleibt der „Unterkiefer“ (Boden bis x 14,9); die BUGRAMPE steht geschlossen senkrecht hinter der Haube, schwenkt nach vorn unten,
#    eine Verlängerung fährt aus.
#  - HECK: Die Unterseite steigt hinten schräg an (Bild); diese Schräge ist die geschlossene HECKRAMPE (7,3 m, Gelenk am Bodenende), sie
#    schwenkt nach unten, eine Verlängerung fährt aus: rund 15° Neigung.
#  - FAHRWERK: vier schwere Beine (Panzerschenkel, Knie, Doppelkolben, Fuß 2,4 × 1,5 m). Einfahren: das Bein klappt um die Hüfte 90°
#    in einen kantigen FAHRWERKSKASTEN unten an der Flanke (vorn nach hinten, hinten nach vorn); der Fuß klappt gegenläufig mit und liegt
#    dann flach unter dem Bein – seine Sohle schließt den Kasten unten. Zwei Klappen schließen den Rest des Schlitzes.
#  - Oben: COCKPIT-Aufbau fast rumpfbreit, ragt vorn über die Haube (Frontscheibe mit vier Feldern, Kinnfenster darunter), dahinter ein
#    Rückengrat mit dem Trapezflügel; große Mantelrotoren an den Flügelspitzen (gelandet senkrecht, schwenken im Flug nach vorn), zwei
#    kleinere Rotoren auf gepfeilten Stummeln ganz hinten, kleine Rückenflosse.
import bpy, bmesh, math, random, os, json
from mathutils import Vector, Matrix
NUR_HELFER_MILAN = True
_mk = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'milan', 'mil_kit.py')
exec(compile(open(_mk, encoding='utf-8').read(), 'mil_kit.py', 'exec'))
HIER = os.path.dirname(bpy.data.filepath)
ANCH = {}; GELENKE.clear(); GRUPPEN.clear(); PIVOTS.clear()
UNTER = {'rampe2': 'rampe', 'bugrampe2': 'bugrampe'}

# ---------- Materialien (Bild: verwittertes Weiß, Schiefergrau, gelb-schwarze Warnkanten) ----------
M['m_hell'] = panel_mat('Rumpf Moewenweiss', (0.42, 0.41, 0.385), 0.2, 0.5, 1.0, brick=(1.4, 0.8), mortar=0.008)
M['m_grau'] = panel_mat('Rumpf Schiefergrau', (0.07, 0.075, 0.08), 0.4, 0.45, 0.9, brick=(1.4, 0.8), mortar=0.008)
M['m_mittel'] = panel_mat('Rumpf Moewengrau', (0.15, 0.158, 0.165), 0.3, 0.45, 0.9, brick=(1.4, 0.8), mortar=0.008)
M['m_gelb'] = panel_mat('Rumpf Signalgelb', (0.55, 0.38, 0.02), 0.2, 0.45, 0.9, brick=(1.4, 0.8), rivets=False)
M['hell'] = hull_mat('Lack Moewenweiss', (0.4, 0.39, 0.37), 0.2, 0.5, 1.0)
M['anth'] = hull_mat('Lack Schiefer', (0.06, 0.065, 0.07), 0.4, 0.45, 0.8)
M['grau2'] = hull_mat('Lack Moewengrau', (0.15, 0.155, 0.16), 0.3, 0.45, 0.9)
M['gelb'] = hull_mat('Lack Warngelb', (0.55, 0.38, 0.02), 0.2, 0.45, 0.9)
M['bein'] = hull_mat('Fahrwerk Grauweiss', (0.3, 0.295, 0.28), 0.35, 0.45, 1.0)
M['schacht'] = mk('Schachtgrund', (0.045, 0.047, 0.05), 0.4, 0.5, var=0.15, scale=3.0, bump=0.2, wear=0.4)
M['hubglut'] = mk('Hubglut', (0.03, 0.035, 0.04), 0.6, 0.35, var=0, rvar=0, emit=(0.55, 0.75, 1.0), es=0.0, grime=False)
M['rcsglut'] = mk('Steuerglut', (0.03, 0.035, 0.04), 0.6, 0.35, var=0, rvar=0, emit=(0.8, 0.9, 1.0), es=0.0, grime=False)
M['formlicht'] = mk('Formationsleuchte', (0.2, 1.0, 0.45), 0, 0.3, var=0, rvar=0, emit=(0.25, 1.0, 0.45), es=3.0, grime=False)
M['landelicht'] = mk('Landescheinwerfer', (1.0, 0.97, 0.9), 0, 0.2, var=0, rvar=0, emit=(1.0, 0.96, 0.88), es=6.0, grime=False)
M['buglicht'] = mk('Torlicht', (1.0, 0.85, 0.6), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.8, 0.5), es=4.0, grime=False)
M['rotor'] = mk('Rotorblatt', (0.08, 0.082, 0.086), 0.3, 0.45, var=0.08, scale=4.0, wear=0.5)
HULL_MATS = ['m_hell', 'm_grau', 'm_mittel', 'm_gelb']
HELL, GRAU, MITTEL, GELB = 0, 1, 2, 3
def farbe(z): return GRAU if z < 4.55 else (MITTEL if z < 5.3 else HELL)      # Bild: dunkles Unterteil, graues Band, weiß
DUESEN = {'haupt': [], 'hub': [], 'rcs': []}

# =====================================================================================
# 1. Kantiger Rumpf: Querschnitt als Vieleck mit gerundeten Kanten; hull_point(x, t) schneidet einen Strahl aus der Mitte damit
# =====================================================================================
XE, XB = -20.0, 13.0           # Heck, Bugplatte (Toröffnung); davor die Haube (2 m tief)
XBU = 15.2                     # Bugöffnung unten (oben bei XB): die Öffnung steht schräg (Bild: Haube als Keil, schräge Torrahmen)
XT = XBU + 0.03                # Grenze für hull_normal
def xline(z):
    """x der schrägen Bugöffnung auf Höhe z (oben XB bei 8,0 m, unten XBU bei 2,4 m); darüber liegt der Cockpit-Aufbau"""
    if z >= 8.0: return XB
    return XB + (8.0 - max(z, FL)) / (8.0 - FL) * (XBU - XB)
BUG_N = Vector((8.0 - FL, 0, XBU - XB)).normalized()      # Normale der schrägen Öffnung (nach vorn oben)
FL = 2.4                       # Boden im Laderaum
ZB, ZT, WR = 1.9, 8.5, 4.4     # Unterseite, Dach, halbe Breite
CU, CL = 1.1, 1.6              # obere Fase, untere Fase
TOR = (3.0, FL, 7.8)           # Toröffnung Bug: halbe Breite, unten, oben (Bild: hoch und breit)
HK = (-13.6, ZB, XE, 6.9)      # Heckschräge: Fuß (x, z) unten, oben am Heck (x, z)
def heck_cut(x):
    if x >= HK[0]: return None
    return HK[1] + (HK[0] - x) / (HK[0] - HK[2]) * (HK[3] - HK[1])
def params(x):      # für die Helfer aus mil_kit (zc_of): halbe Breite, Dach, Unterseite (nach dem Heckschnitt), Exponent (unbenutzt)
    c = heck_cut(x); return WR, ZT, max(ZB, c) if c else ZB, 8.0
def _rund(P, r):
    """Ecken eines offenen Linienzugs mit drei Punkten abrunden (Fasenkanten nicht messerscharf)"""
    out = [P[0]]
    for i in range(1, len(P) - 1):
        a, b, c = Vector(P[i - 1]), Vector(P[i]), Vector(P[i + 1])
        u, v = (a - b), (c - b); k = min(r, u.length * 0.4, v.length * 0.4)
        p0, p1 = b + u.normalized() * k, b + v.normalized() * k
        out += [tuple(p0), tuple((p0 + p1) * 0.25 + b * 0.5), tuple(p1)]
    out.append(P[-1]); return out
def _clip(poly, zc):
    """Vieleck auf z ≥ zc beschneiden (Heckschräge)"""
    out = []
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]; ia, ib = a[1] >= zc, b[1] >= zc
        if ia: out.append(a)
        if ia != ib: t = (zc - a[1]) / (b[1] - a[1]); out.append((a[0] + (b[0] - a[0]) * t, zc))
    return out
def _rund_schnitt(poly, zc, r=0.42):
    """die beiden Ecken des Heckschnitts abrunden (sonst Sägezähne: die Strahlen der Ringe treffen die wandernde Ecke abwechselnd links und rechts)"""
    out = []; n = len(poly)
    for i in range(n):
        p = poly[i]
        if abs(p[1] - zc) > 1e-6: out.append(p); continue
        P = Vector(p); a, b = Vector(poly[i - 1]), Vector(poly[(i + 1) % n]); u, v = a - P, b - P; k = min(r, u.length * 0.45, v.length * 0.45)
        p0, p1 = P + u.normalized() * k, P + v.normalized() * k
        for j in range(7): t = j / 6; q = p0 * (1 - t) ** 2 + P * 2 * t * (1 - t) + p1 * t * t; out.append((q.x, q.y))
    return out
_SEC = {}
def sec(x):
    k = round(x, 3)
    if k in _SEC: return _SEC[k]
    half = _rund([(0.0, ZT), (WR - CU, ZT), (WR, ZT - CU), (WR, ZB + CL), (WR - CL, ZB), (0.0, ZB)], 0.16)
    poly = half + [(-y, z) for y, z in reversed(half[1:-1])]
    c = heck_cut(x)
    if c: poly = _rund_schnitt(_clip(poly, c), c)
    _SEC[k] = poly; return poly
def _strahl(poly, zc, t):
    d = (math.sin(t), math.cos(t)); best = None
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]; ex, ez = b[0] - a[0], b[1] - a[1]
        den = d[0] * (-ez) + d[1] * ex
        if abs(den) < 1e-12: continue
        rx, rz = a[0], a[1] - zc
        s = (rx * (-ez) + rz * ex) / den; u = (d[0] * rz - d[1] * rx) / den
        if s > 0 and -1e-9 <= u <= 1 + 1e-9 and (best is None or s < best): best = s
    best = best or 0.0
    return d[0] * best, zc + d[1] * best
_UMF = {}
def _umfang(x):
    k = round(x, 3)
    if k not in _UMF:
        P = sec(x); cum = [0.0]
        for i in range(len(P)): a, b = P[i], P[(i + 1) % len(P)]; cum.append(cum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
        _UMF[k] = (P, cum)
    return _UMF[k]
def _punkt_s(x, s):
    P, cum = _umfang(x); s %= cum[-1]; lo, hi = 0, len(P)
    while hi - lo > 1:
        m = (lo + hi) // 2
        if cum[m] <= s: lo = m
        else: hi = m
    a, b = P[lo], P[(lo + 1) % len(P)]; seg = cum[lo + 1] - cum[lo]; u = (s - cum[lo]) / seg if seg > 1e-12 else 0.0
    return a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u
def _s_von(x, y, z):
    P, cum = _umfang(x); best = (1e9, 0.0)
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]; ex, ez = b[0] - a[0], b[1] - a[1]; l2 = ex * ex + ez * ez
        u = 0.0 if l2 < 1e-12 else max(0.0, min(1.0, ((y - a[0]) * ex + (z - a[1]) * ez) / l2)); d = (a[0] + ex * u - y) ** 2 + (a[1] + ez * u - z) ** 2
        if d < best[0]: best = (d, cum[i] + u * math.sqrt(l2))
    return best[1]
def _w_bei(P, z):
    w = 0.0
    for i in range(len(P)):
        p, q = P[i], P[(i + 1) % len(P)]
        if (p[1] - z) * (q[1] - z) <= 0 and abs(q[1] - p[1]) > 1e-9: w = max(w, p[0] + (q[0] - p[0]) * (z - p[1]) / (q[1] - p[1]))
    return w
def hull_point(x, t):
    """Strahl aus der Mitte des ungeschnittenen Querschnitts. An der Heckschräge bleiben alle Punkte oberhalb der Schnittecke, wo sie ohne Schnitt
    lägen (Ringe und Farbgrenzen bleiben gerade); die übrigen werden nach Bogenlänge auf Ecke und Schnittkante verteilt (sonst Sägezähne)"""
    c = heck_cut(x)
    if not c:
        y, z = _strahl(sec(x), zc_of(x), t); return Vector((x, y, z))
    x0 = HK[0] + 0.01; y0, z0 = _strahl(sec(x0), zc_of(x0), t); zr = c + 0.5
    if z0 >= zr: return Vector((x, y0, z0))
    P0, cum0 = _umfang(x0); L0 = cum0[-1]; sc0 = _s_von(x0, _w_bei(P0, zr), zr); s0 = _s_von(x0, y0, z0)
    P, cum = _umfang(x); L = cum[-1]; sc = _s_von(x, _w_bei(P, zr), zr)
    if s0 <= sc0: sv = s0
    elif s0 >= L0 - sc0: sv = L - (L0 - s0)
    else: sv = sc + (s0 - sc0) * (L - 2 * sc) / (L0 - 2 * sc0)
    y, z = _punkt_s(x, sv); return Vector((x, y, z))
NRING = 128
def x_samples():
    xs = []; x = XE
    while x < XBU - 1e-6: xs.append(round(x, 4)); x += 0.2
    xs.append(XBU); return xs
KASTEN_V, KASTEN_H = (6.6, 12.4), (-10.3, -5.2)      # Fahrwerkskästen (x von, bis)
KY0, KY1, KZ0, KZ1 = 3.6, 5.6, 2.85, 4.1             # Kasten: |y| innen, außen, unten, oben
TREPPE = (7.0, 9.3, 2.05, 3.15)                      # Treppenloch im Dach unter dem Cockpit-Aufbau (backbord, neben der Fahrgasse)
HR_X = -14.25                                        # Gelenk der Heckrampe (Ende des Laderaumbodens)
def build_hull():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); XS = x_samples(); rings = []
    for x in XS:
        row = []
        for k in range(NRING):
            p = hull_point(x, 2 * PI * k / NRING)
            if p.x > xline(p.z): p.x = xline(p.z)      # vor der schrägen Öffnung: auf die Öffnungsebene zurück (dort sitzt die Bugplatte)
            row.append(bm.verts.new(p))
        rings.append(row)
    for i in range(len(XS) - 1):
        for k in range(NRING):
            k2 = (k + 1) % NRING; q = (rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2]); c = sum((v.co for v in q), Vector()) / 4
            if any(a + 0.05 < c.x < b - 0.05 for a, b in (KASTEN_V, KASTEN_H)) and abs(c.y) > KY0 - 0.05 and c.z < KZ1 + 0.05: continue      # im Fahrwerkskasten
            hc = heck_cut(c.x)
            if hc and abs(c.y) < TOR[0] + 0.08 and c.z < hc + 0.3 and c.x < HR_X: continue      # Öffnung der Heckrampe (in der Schräge)
            if TREPPE[0] < c.x < TREPPE[1] and TREPPE[2] < c.y < TREPPE[3] and c.z > ZT - 0.1: continue
            if (q[1].co - q[0].co).cross(q[3].co - q[0].co).length < 1e-6 and (q[2].co - q[1].co).cross(q[0].co - q[1].co).length < 1e-6: continue      # entartet (auf der Öffnungsebene)
            f = bm.faces.new(q); f.material_index = farbe(c.z)
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, lp.vert.co.z + abs(lp.vert.co.y) * (1.0 if lp.vert.co.z > 5 else 0.6))
    bmesh.ops.dissolve_degenerate(bm, dist=0.0005, edges=bm.edges[:])
    bm.normal_update()
    if sum(f.normal.dot(f.calc_center_median() - Vector((f.calc_center_median().x, 0, zc_of(f.calc_center_median().x)))) for f in bm.faces[:300]) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return bm, rings, XS
def heckplatte(ring):
    """Heckfläche oberhalb der Schräge (zwischen Heckkante 6,9 m und Dach), zwei Schubdüsen darin"""
    bm = bmesh.new(); vs = [bm.verts.new(c.copy()) for c in ring]; f = bm.faces.new(vs); bm.normal_update()
    if f.normal.x > 0: f.normal_flip()
    f.material_index = HELL; L = bm.loops.layers.uv.new('Platten')
    for lp in f.loops: lp[L].uv = (lp.vert.co.y, lp.vert.co.z)
    mesh_obj('Heckflaeche', bm, HULL_MATS, False, C_HULL)
    for s in (1, -1):
        with Part('Schubduese', T(XE, s * 2.4, 7.65), C_PART):
            box('Duesenkasten', 0.7, 1.6, 0.9, -0.25, 0, 0, M['anth'], 0.04); box('Duesenrahmen', 0.14, 1.7, 1.0, -0.62, 0, 0, M['grau2'], 0.03)
            box('Duesenschacht', 0.08, 1.4, 0.7, -0.66, 0, 0, M['schacht'], 0.01)
            for k in range(5): box('Duesenlamelle', 0.36, 0.05, 0.75, -0.55, -0.56 + k * 0.28, 0, M['duese'], 0.004, rot=(0, 0, math.radians(10)))
            box('Duesenglut', 0.02, 1.35, 0.62, -0.5, 0, 0, M['glut'], 0.0)
        ANCH['duese%d' % s] = Vector((XE - 0.9, s * 2.4, 7.65))
        DUESEN['haupt'].append({'p': [XE - 0.9, s * 2.4, 7.65], 'd': [-1, 0, 0], 'r': 0.55})
        cyl('Ruecklicht', 0.09, 0.04, XE - 0.02, s * 3.9, 8.0, M['nav_r'], 'X', n=16)
    sphere('Hecklicht', 0.08, XE - 0.03, 0, 8.3, M['blitz'], 10)
def bugplatte(ring):
    """schräge Bugplatte (oben x 13,0 bei 8 m, unten x 15,2 bei 2,4 m) mit großer Toröffnung; Torpfosten mit Fachwerk und Leiter (Bild), Torlichter;
    vorn der Unterkiefer (Boden bis 15,2 m)"""
    bm = bmesh.new(); P0 = sec(XB)
    outer = [bm.verts.new((xline(z), y, z)) for y, z in P0]
    hw, z0, z1 = TOR; rr = 0.35
    P = [(hw, z0), (-hw, z0)] + [(-hw + rr - rr * math.cos(a_), z1 - rr + rr * math.sin(a_)) for a_ in [PI / 2 * j / 6 for j in range(1, 6)]] + [(-hw + rr, z1), (hw - rr, z1)] + \
        [(hw - rr + rr * math.cos(PI / 2 - PI / 2 * j / 6), z1 - rr + rr * math.sin(PI / 2 - PI / 2 * j / 6)) for j in range(1, 6)]
    inner = [bm.verts.new((xline(z), y, z)) for y, z in P]
    edges = [bm.edges.new((outer[i], outer[(i + 1) % len(outer)])) for i in range(len(outer))] + [bm.edges.new((inner[i], inner[(i + 1) % len(inner)])) for i in range(len(inner))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges, normal=BUG_N)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.calc_center_median().y) < hw - 0.01 and z0 + 0.01 < f.calc_center_median().z < z1 - 0.01], context='FACES')
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z < FL - 0.01], context='FACES')      # unter dem Boden: Kieferstirn
    for f in bm.faces: f.material_index = MITTEL
    bm.normal_update()
    if sum(f.normal.dot(BUG_N) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    L = bm.loops.layers.uv.new('Platten')
    for f in bm.faces:
        for lp in f.loops: lp[L].uv = (lp.vert.co.y, lp.vert.co.z)
    mesh_obj('Bugplatte', bm, HULL_MATS, False, C_HULL)
    u = Vector((XB - XBU, 0, 8.0 - FL)).normalized(); side = Vector((0, 1, 0))      # entlang der Schräge nach oben
    def am(z, y, tief=0.0): return Vector((xline(z), y, z)) - BUG_N * tief
    Lz = (z1 - z0) / u.z
    for s in (1, -1):      # Torrahmen: Pfosten mit Fachwerk und Leiter (Bild), Warnkante
        slab('Torpfosten', am((z0 + z1) / 2, s * (hw + 0.16), 0.3), u, side, (Lz, 0.32, 0.7), M['anth'], 0.02)
        for k in range(5):
            za = z0 + 0.3 + k * 0.95; rod('Torfachwerk', am(za, s * (hw + 0.05), -0.06), am(za + 0.45, s * (hw + 0.27), -0.06), 0.035, M['grau2'], 8)
        for k in range(16): slab('Leitersprosse', am(z0 + 0.3 + k * 0.32, s * (hw + 0.62), -0.12), u, side, (0.03, 0.28, 0.04), M['chrom'], 0.004)
        for yy in (hw + 0.47, hw + 0.77): slab('Leiterholm', am((z0 + z1) / 2, s * yy, -0.12), u, side, (Lz - 0.2, 0.04, 0.05), M['grau2'], 0.006)
        slab('Warnkante', am((z0 + z1) / 2, s * (hw - 0.05), -0.01), u, side, (Lz - 0.4, 0.14, 0.03), M['warnrw'], 0.002)
    box('Torsturz', 0.7, 2 * hw + 0.6, 0.3, xline(z1) - 0.25, 0, z1 + 0.12, M['anth'], 0.02)
    for k in range(5): box('Torlicht', 0.5, 0.06, 0.04, xline(z1) - 0.4, -2.0 + k * 1.0, z1 - 0.02, M['buglicht'], 0.005)
    # Unterkiefer: Bodenplatte bis 15,2 m (der Rumpf darunter reicht bis dort), Stirnfläche, Scheinwerfer
    yw = max(abs(p[0]) for p in sec(XBU) if p[1] <= FL + 0.01)
    box('Kieferboden', XBU - XB + 0.1, 2 * yw - 0.1, 0.06, (XB + XBU) / 2, 0, FL - 0.03, M['grau2'], 0.01)
    st = [(y, z) for y, z in sec(XBU) if z <= FL + 0.001]
    if len(st) > 2:
        bs = bmesh.new(); fs_ = bs.faces.new([bs.verts.new((XBU, y, z)) for y, z in st]); bs.normal_update()
        if fs_.normal.x < 0: fs_.normal_flip()
        fs_.material_index = GRAU; mesh_obj('Kieferstirn', bs, HULL_MATS, False, C_HULL)
    for s in (1, -1): cyl('Kieferscheinwerfer', 0.12, 0.06, XBU + 0.01, s * 1.8, (FL + ZB) / 2 + 0.03, M['landelicht'], 'X', n=20)

# =====================================================================================
# 2. Haube (Bugtor) und Bugrampe
# =====================================================================================
HAUBE_G = (15.0, 8.0)          # Gelenk der Haube (x, z), unter der Vorderkante des Cockpits
XF_U = 15.6                    # Bugfläche unten (oben am Gelenk 15,0)
HAUBE_W = -math.radians(92)    # öffnen: nach oben, steht dann leicht ansteigend nach vorn (Bild)
def xf(z): return XF_U - (z - FL) / (HAUBE_G[1] - FL) * (XF_U - HAUBE_G[0])
def _profil_hoehe(zz):
    P = [(y, z) for y, z in sec(XB + 0.5) if y > 0]
    for a, b in zip(P, P[1:]):
        if (a[1] - zz) * (b[1] - zz) <= 0 and a[1] != b[1]: t = (zz - a[1]) / (b[1] - a[1]); return (a[0] + (b[0] - a[0]) * t, zz)
    return (WR, zz)
def haube():
    """geschlossen gebaut: Seiten (Rumpfquerschnitt zwischen 2,4 und 7,4 m) von der Bugplatte bis zur Bugfläche, Bugfläche, Ober- und Unterkante;
    innen eine zweite Haut mit Fachwerk (sichtbar, wenn sie offen steht)"""
    prof = [(y, z) for y, z in sec(XB + 0.5) if y > 0 and FL + 0.01 < z < HAUBE_G[1] - 0.01]
    prof = sorted([_profil_hoehe(FL), _profil_hoehe(HAUBE_G[1])] + prof, key=lambda p: p[1])
    x0 = XB + 0.03
    def xb_(z): return xline(z) + 0.03
    with Gruppe('bug'):
        for dicke, name, mi in ((0.0, 'Haube', None), (0.12, 'Haube innen', MITTEL)):
            bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten')
            for s in (1, -1):      # Seiten
                for (ya, za), (yb, zb_) in zip(prof, prof[1:]):
                    ya2, yb2 = s * (ya - dicke), s * (yb - dicke)
                    vs = [bm.verts.new(p) for p in ((xb_(za) + dicke, ya2, za), (xf(za) - dicke, ya2, za), (xf(zb_) - dicke, yb2, zb_), (xb_(zb_) + dicke, yb2, zb_))]
                    f = bm.faces.new(vs); f.material_index = mi if mi is not None else farbe((za + zb_) / 2)
            fr = [bm.verts.new((xf(z) - dicke, y - dicke, z)) for y, z in prof] + [bm.verts.new((xf(z) - dicke, -(y - dicke), z)) for y, z in reversed(prof)]
            f = bm.faces.new(fr); f.material_index = mi if mi is not None else HELL
            yt, yb0 = prof[-1][0] - dicke, prof[0][0] - dicke
            ft = bm.faces.new([bm.verts.new(p) for p in ((x0 + dicke, yt, HAUBE_G[1] - dicke), (xf(HAUBE_G[1]) - dicke, yt, HAUBE_G[1] - dicke), (xf(HAUBE_G[1]) - dicke, -yt, HAUBE_G[1] - dicke), (x0 + dicke, -yt, HAUBE_G[1] - dicke))]); ft.material_index = MITTEL
            fb = bm.faces.new([bm.verts.new(p) for p in ((xb_(FL) + dicke, yb0, FL + dicke), (xf(FL) - dicke, yb0, FL + dicke), (xf(FL) - dicke, -yb0, FL + dicke), (xb_(FL) + dicke, -yb0, FL + dicke))]); fb.material_index = GRAU
            for fc in bm.faces:
                for lp in fc.loops: lp[L].uv = (lp.vert.co.x + lp.vert.co.y, lp.vert.co.z)
            bm.normal_update()
            cen = Vector(((XB + XF_U) / 2 + 0.6, 0, (FL + HAUBE_G[1]) / 2))
            for fc in bm.faces:
                out = fc.normal.dot(fc.calc_center_median() - cen) > 0
                if out != (dicke == 0.0): fc.normal_flip()
            mesh_obj(name, bm, HULL_MATS, False, C_HULL)
        # Fachwerk innen (Bild: Haube von unten mit Trägern), Verriegelungen, Scheinwerfer, gelbe Warnkanten
        yw = prof[-1][0] - 0.25
        for k in range(4):
            z = FL + 0.6 + k * 1.3; box('Haubentraeger', 0.18, 2 * (yw - 0.1), 0.2, xf(z) - 0.32, 0, z, M['anth'], 0.015)
        for s in (1, -1):
            for k in range(3):
                z0 = FL + 0.4 + k * 1.6; rod('Haubenstrebe', Vector((xf(z0) - 0.3, s * (yw - 0.2), z0)), Vector((xb_(z0 + 1.4) + 0.25, s * (yw - 0.2), z0 + 1.4)), 0.05, M['grau2'], 8)
            rod('Haubenrandtraeger', Vector((xb_(FL + 0.3) + 0.18, s * (yw - 0.05), FL + 0.3)), Vector((xb_(7.7) + 0.18, s * (yw - 0.05), 7.7)), 0.11, M['anth'], 8)
            for z in (3.0, 4.8, 6.6): box('Verriegelung', 0.2, 0.14, 0.16, xb_(z) + 0.1, s * (yw + 0.12), z, M['chrom'], 0.01)
            for k in range(5):      # gelb-schwarze Warnkante an der vorderen senkrechten Kante (Bild)
                z = FL + 0.5 + k * 1.0; w = _profil_hoehe(z)[0]
                box('Warnkante', 0.02, 0.5, 0.85, xf(z) + 0.012, s * (w - 0.25), z, M['warnrw'], 0.002)
            box('Warnkante oben', 0.02, 1.6, 0.4, xf(7.7) + 0.012, s * (prof[-1][0] - 0.8), 7.7, M['gelb'], 0.002)
            cyl('Haubenscheinwerfer', 0.16, 0.08, xf(3.2) + 0.04, s * 2.2, 3.2, M['landelicht'], 'X', n=24)
            ring('Scheinwerferring', 0.18, 0.025, (xf(3.2) + 0.08, s * 2.2, 3.2), (1, 0, 0), M['anth'], 24)
        rod('Haubenscharnier', Vector((HAUBE_G[0] - 0.05, -3.0, HAUBE_G[1] - 0.05)), Vector((HAUBE_G[0] - 0.05, 3.0, HAUBE_G[1] - 0.05)), 0.09, M['chrom'], 16)
        for k in range(4): box('Scharnierbock', 0.4, 0.3, 0.3, HAUBE_G[0] - 0.1, -2.4 + k * 1.6, HAUBE_G[1] - 0.05, M['anth'], 0.02)
        for y0 in (-1.6, 0.0, 1.6): box('Bugfeld', 0.02, 1.3, 1.8, xf(4.8) + 0.012, y0, 4.8, M['grau2'], 0.004)
    gelenk('bug', (HAUBE_G[0], 0, HAUBE_G[1]), 'Y', HAUBE_W, 'rampe', 0.0, 0.45)
RAMP_L1, RAMP_L2 = 4.4, 3.8
HR_L1, HR_L2 = 7.3, 2.1
def _rampenblatt(tag, h, nx, L1, L2, hw, kipp, auf, t0, t1, t2):
    """Rampe mit Verlängerung. Gebaut senkrecht am Gelenk h (Lauffläche zum Laderaum, nx: +1 vorn, −1 hinten), dann um kipp (rad um Y)
    in die geschlossene Lage gedreht (Heckrampe liegt schräg); auf: Öffnungswinkel von der geschlossenen Lage aus"""
    H = Vector(h); R = Matrix.Translation(H) @ Matrix.Rotation(kipp, 4, 'Y') @ Matrix.Translation(-H); xb = H.x - nx * 0.1
    with Gruppe(tag):
        with Part('Rampe ' + tag, R, C_PART):
            box('Rampenblatt', 0.2, 2 * hw, L1, xb, 0, H.z + L1 / 2, M['anth'], 0.03)
            box('Rampenhaut', 0.012, 2 * hw - 0.3, L1 - 0.3, xb + nx * 0.105, 0, H.z + L1 / 2, M['grau2'], 0.004)
            for k in range(int(L1 / 0.3)): box('Gitterleiste', 0.04, 2 * hw - 0.9, 0.08, xb - nx * 0.12, 0, H.z + 0.25 + k * 0.3, M['mittel'], 0.006)
            for s in (1, -1):
                box('Rampenwange', 0.32, 0.4, L1, xb - nx * 0.06, s * (hw - 0.2), H.z + L1 / 2, M['grau2'], 0.015)
                for k in range(int(L1 / 0.55)): box('Warnstreifen', 0.012, 0.42, 0.3, xb - nx * 0.225, s * (hw - 0.2), H.z + 0.3 + k * 0.55, M['gelb'], 0.002)
                for k in range(4): box('Rampenrippe', 0.1, 0.08, L1 - 0.3, xb + nx * 0.13, s * (0.5 + k * 0.6), H.z + L1 / 2, M['anth'], 0.01)
            box('Rampenlicht', 0.03, 2 * hw - 1.2, 0.04, xb - nx * 0.13, 0, H.z + L1 - 0.18, M['landelicht'], 0.004)
            for s in (1, -1): cyl('Rampenscharnier', 0.11, 0.6, H.x, s * (hw - 0.8), H.z + 0.02, M['chrom'], 'Y', n=16)
    gelenk(tag, tuple(H), 'Y', auf, 'rampe', t0, t1)
    d = Vector((math.sin(kipp), 0, math.cos(kipp)))      # Richtung der Rampe (geschlossen)
    with Gruppe(tag + '2'):
        with Part('Verlaengerung ' + tag, R, C_PART):
            box('Verlaengerung', 0.1, 2 * hw - 0.5, L2, xb, 0, H.z + L1 - L2 / 2 - 0.1, M['mittel'], 0.012)
            for k in range(int(L2 / 0.3)): box('Gitterleiste', 0.035, 2 * hw - 1.0, 0.06, xb - nx * 0.07, 0, H.z + L1 - L2 + 0.15 + k * 0.3, M['mittel'], 0.005)
            box('Rampenkante', 0.14, 2 * hw - 0.5, 0.1, xb, 0, H.z + L1 - 0.12, M['gelb'], 0.012)
    gelenk(tag + '2', (0, 0, 0), None, 0.0, 'rampe', t1 - 0.05, t2, slide=tuple(d * (L2 - 0.12)))
    ANCH[tag + '_scharnier'] = H.copy()
def bugrampe():
    hw, z0, z1 = TOR; L = RAMP_L1 + RAMP_L2 - 0.12; kipp = math.atan2(XB - XBU, 8.0 - FL)      # geschlossen in der schrägen Öffnung (inneres Tor)
    _rampenblatt('bugrampe', (XBU - 0.05, 0, z0), 1, RAMP_L1, RAMP_L2, hw - 0.1, kipp, math.radians(90) + math.asin(FL / L) - kipp, 0.35, 0.8, 1.0)
def heckrampe():
    global HR_L1
    H = Vector((HR_X, 0, FL)); top = Vector((XE + 0.05, 0, HK[3])); d = top - H; HR_L1 = d.length
    kipp = math.atan2(d.x, d.z)      # aus der Senkrechten in die Schräge (negativ: nach hinten)
    Lt = HR_L1 + HR_L2 - 0.12; a = math.asin(FL / Lt); phi_o = math.atan2(-math.cos(a), -math.sin(a))
    _rampenblatt('rampe', tuple(H), -1, HR_L1, HR_L2, TOR[0] - 0.05, kipp, phi_o - kipp, 0.1, 0.72, 0.96)

# =====================================================================================
# 3. Fahrwerk: Kästen und schwere Beine (Bein klappt um die Hüfte, der Fuß gegenläufig flach darunter)
# =====================================================================================
def kasten(name, x0, x1, s):
    """kantiger Fahrwerkskasten: innen am Rumpf (|y| 3,6), außen 5,6; unten offen (Schlitz), Fasen wie der Rumpf"""
    bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten')
    def prof(x, e):
        yo = KY1 - (0.45 if e else 0.0); zt = KZ1 + (0.0 if e else 0.25)
        return [(KY0, KZ0), (yo - 0.35, KZ0), (yo, KZ0 + 0.35), (yo, zt - 0.4), (yo - 0.6, zt), (KY0 - 0.05, zt + 0.35)]
    sx = [(x0, True), (x0 + 0.6, False), (x1 - 0.6, False), (x1, True)]
    R = [[bm.verts.new((x, s * y, z)) for y, z in prof(x, e)] for x, e in sx]
    for i in range(3):
        for k in range(len(R[0]) - 1):
            q = (R[i][k], R[i + 1][k], R[i + 1][k + 1], R[i][k + 1]); c = sum((v.co for v in q), Vector()) / 4
            if k == 0 and i == 1: continue      # Schlitz unten
            f = bm.faces.new(q); f.material_index = GRAU if c.z < 3.9 else MITTEL
    for row in (R[0], R[-1]): bm.faces.new(row)
    for fc in bm.faces:
        for lp in fc.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.z + abs(lp.vert.co.y))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh_obj(name, bm, HULL_MATS, False, C_HULL)
    open_box(name + ' Schacht', x0 + 0.6, x1 - 0.6, s * KY0 if s > 0 else -(KY1 - 0.35), s * (KY1 - 0.35) if s > 0 else -KY0, KZ0 + 0.02, KZ1 - 0.05, M['schacht'], '-z', C_GEAR)
    for k in range(3): box('Kastenrippe', 0.06, 0.04, 0.9, x0 + 1.4 + k * (x1 - x0 - 2.8) / 2, s * (KY1 - 0.43), KZ0 + 0.85, M['grau2'], 0.005)
def bein(key, xh, s, dirn):
    """schweres Landebein (Bild): Hüftblock, Panzerschenkel bis zum Knie (vorn), Doppelkolben, Federbein, Knöchel, Fuß 2,4 × 1,5 m"""
    y = s * 4.6; H = Vector((xh, s * 4.4, 3.5)); K = Vector((xh + 0.55 * dirn, s * 4.75, 1.95)); A = Vector((xh, y, 0.62))
    tag = 'fw%s_%s' % (key, 'l' if s > 0 else 'r')
    with Gruppe(tag):
        with Part('Landebein', T(0, 0, 0), C_GEAR):
            box('Hueftblock', 1.2, 0.95, 0.8, H.x, H.y, H.z + 0.05, M['bein'], 0.05)
            rod('Hueftachse', H - Vector((0, 0.5, 0)), H + Vector((0, 0.5, 0)), 0.14, M['chrom'], 20)
            d = (K - H); u = d.normalized(); side = Vector((0, 1, 0)); n = u.cross(side).normalized()
            slab('Schenkel', (H + K) / 2, u, side, (d.length + 0.45, 0.82, 0.78), M['bein'], 0.07)
            slab('Schenkelplatte', (H + K) / 2 + n * 0.43 * dirn, u, side, (d.length * 0.9, 0.9, 0.1), M['bein'], 0.035)
            for k in range(3): slab('Plattenleiste', H.lerp(K, 0.2 + k * 0.3) + n * 0.49 * dirn, u, side, (0.06, 0.84, 0.03), M['anth'], 0.008)
            rod('Knieachse', K - Vector((0, 0.42, 0)), K + Vector((0, 0.42, 0)), 0.16, M['chrom'], 20)
            for sg in (1, -1): cyl('Kniescheibe', 0.34, 0.14, K.x, K.y + sg * 0.48, K.z, M['bein'], 'Y', n=24, bev=0.02)
            for sg in (1, -1):
                a = H + Vector((-0.45 * dirn, sg * 0.22, -0.15)); b = K.lerp(A, 0.55) + Vector((-0.28 * dirn, sg * 0.22, 0))
                rod('Kolbenzylinder', a, a.lerp(b, 0.55), 0.14, M['mittel'], 16); rod('Kolbenstange', a.lerp(b, 0.5), b, 0.075, M['chrom'], 12)
                sphere('Kolbenauge', 0.08, *b, M['mittel'], 12)
            rod('Federbein', K, K.lerp(A, 0.62), 0.3, M['bein'], 24); rod('Federkolben', K.lerp(A, 0.55), A + Vector((0, 0, 0.12)), 0.19, M['chrom'], 20)
            for f in (0.15, 0.35): ring('Federbeinschelle', 0.235, 0.02, tuple(K.lerp(A, f)), tuple((A - K).normalized()), M['anth'], 24)
            box('Knoechel', 0.75, 0.7, 0.45, A.x, A.y, A.z + 0.08, M['bein'], 0.05)
            rod('Knoechelachse', A - Vector((0, 0.36, 0)), A + Vector((0, 0.36, 0)), 0.1, M['chrom'], 16)
    gelenk(tag, tuple(H), 'Y', dirn * math.radians(90), 'fw', 0.05, 0.72)
    ftag = tag.replace('fw', 'fp')      # Fuß: hängt am Bein, klappt gegenläufig (liegt eingefahren flach unter dem Bein)
    with Gruppe(ftag):
        with Part('Landefuss', T(0, 0, 0), C_GEAR):
            pf = [(xh - 1.2, 0.0), (xh + 1.2, 0.0), (xh + 1.2, 0.24), (xh + 0.9, 0.44), (xh - 0.9, 0.44), (xh - 1.2, 0.24)]
            prism('Fussplatte', pf, y - 0.75, y + 0.75, M['bein'], 'Y', 0.03)
            prism('Fusssohle', [(xh - 1.18, -0.01), (xh + 1.18, -0.01), (xh + 1.18, 0.05), (xh - 1.18, 0.05)], y - 0.73, y + 0.73, M['rubber'], 'Y', 0.01)
            for sg in (1, -1): box('Fusskante', 2.3, 0.04, 0.16, xh, y + sg * 0.755, 0.14, M['warnrw'], 0.003)
            for k in range(3): box('Fussrippe', 0.08, 1.3, 0.16, xh - 0.6 + k * 0.6, y, 0.5, M['anth'], 0.01)
            box('Fussgelenkbock', 0.6, 0.62, 0.3, A.x, A.y, 0.5, M['bein'], 0.03)
            for sg in (1, -1): rod('Fussdaempfer', Vector((xh + sg * 0.8, y, 0.44)), A + Vector((sg * 0.25, 0, 0.05)), 0.05, M['chrom'], 10)
            sphere('Kontaktlampe', 0.04, xh + 1.1, y, 0.3, M['e_green'], 8)
    gelenk(ftag, tuple(A), 'Y', -dirn * math.radians(90), 'fw', 0.05, 0.72)
    UNTER[ftag] = tag
    ANCH['fuss_%s%d' % (key, s)] = Vector((xh, y, 0.0))
def fahrwerk():
    for s in (1, -1):
        kasten('Fahrwerkskasten vorn', KASTEN_V[0], KASTEN_V[1], s); kasten('Fahrwerkskasten hinten', KASTEN_H[0], KASTEN_H[1], s)
        bein('v', 11.0, s, 1); bein('h', -9.6, s, -1)
        for key, xa, xb in (('v', 9.4, KASTEN_V[1] - 0.6), ('h', KASTEN_H[0] + 0.6, -6.8)):      # Klappen über dem Rest des Schlitzes, schließen zuletzt
            for k, (yy, sg) in enumerate(((KY0, 1), (KY1 - 0.35, -1))):
                tg = 'fw%sk_%s%d' % (key, 'l' if s > 0 else 'r', k); w = (KY1 - 0.35 - KY0) / 2
                with Gruppe(tg):
                    box('Schachtklappe', xb - xa - 0.04, 0.05, w, (xa + xb) / 2, s * yy, KZ0 - w / 2, M['anth'], 0.01)
                gelenk(tg, ((xa + xb) / 2, s * yy, KZ0), 'X', s * sg * math.radians(88), 'fw', 0.72, 1.0)

# =====================================================================================
# 4. Cockpit-Aufbau, Rückengrat, Trapezflügel, Mantelrotoren, Heckrotoren, Flosse, Steuer- und Hubdüsen
# =====================================================================================
KX0, KX1 = 7.0, 16.0           # Aufbau: hinten, vorn (ragt 1 m über das Hauben-Gelenk)
KB0, KBT = 8.0, 10.7           # Unterseite über dem Tor (= Hauben-Gelenk), Dach
KS_U, KS_O = 8.5, 10.45        # Frontscheibe unten (vorn), oben (zurückgesetzt)
def kparams(x):
    W = 3.95 - 1.1 * ease((x - 14.8) / 1.2)
    zt = KBT if x < 14.6 else KBT - (x - 14.6) / (KX1 - 14.6) * (KBT - KS_U)
    if x < KX0 + 1.0: zt = 8.7 + (KBT - 8.7) * ease((x - KX0) / 1.0)
    return max(zt, KS_U), W
def ksec(x):
    zt, W = kparams(x); zb = KB0; cu = min(0.9, (zt - zb) * 0.45)
    half = _rund([(0.0, zt), (W - cu, zt), (W, zt - cu), (W, zb), (0.0, zb)], 0.14)
    return half + [(-y, z) for y, z in reversed(half[1:-1])]
def kpoint(x, t):
    zt, W = kparams(x); y, z = _strahl(ksec(x), KB0 + 0.4 * (zt - KB0), t); return Vector((x, y, z))
def aufbau():
    NX, NA = 140, 112; xs = [KX0 + (KX1 - KX0) * i / NX for i in range(NX + 1)]
    P = [[kpoint(x, 2 * PI * a / NA - PI) for a in range(NA)] for x in xs]
    bh = bmesh.new(); bg = bmesh.new(); L = bh.loops.layers.uv.new('Platten'); VH = {}; VG = {}
    def vv(bm, D, i, a):
        a %= NA
        if (i, a) not in D: D[(i, a)] = bm.verts.new(P[i][a])
        return D[(i, a)]
    for i in range(NX):
        for a in range(NA):
            pts = [P[i][a], P[i + 1][a], P[i + 1][(a + 1) % NA], P[i][(a + 1) % NA]]; c = sum(pts, Vector()) / 4
            if c.z < KB0 + 0.02: continue      # Unterseite: im Rumpf bzw. über dem Tor (dort schließt die Haube)
            if c.x < XB and c.z < ZT - 0.05 and abs(c.y) < WR - 0.6: continue      # im Rumpf
            nrm = (pts[1] - pts[0]).cross(pts[3] - pts[0]); nrm = nrm.normalized() if nrm.length > 1e-9 else Vector((0, 0, 1))
            if nrm.dot(c - Vector((c.x - 0.5, 0, 8.4))) < 0: nrm = -nrm
            ay = abs(c.y)
            g = (c.x > 14.65 and KS_U + 0.06 < c.z < KS_O - 0.04 and nrm.x > 0.3 and ay < 3.15) or (12.2 < c.x < 14.9 and 8.55 < c.z < 9.55 and ay > 3.3 and abs(nrm.z) < 0.6)
            if g: bg.faces.new([vv(bg, VG, i, a), vv(bg, VG, i + 1, a), vv(bg, VG, i + 1, a + 1), vv(bg, VG, i, a + 1)])
            else:
                f = bh.faces.new([vv(bh, VH, i, a), vv(bh, VH, i + 1, a), vv(bh, VH, i + 1, a + 1), vv(bh, VH, i, a + 1)])
                f.material_index = GRAU if (c.z < 8.0 and c.x > XB) else HELL
                for lp in f.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.z + abs(lp.vert.co.y))
    fv = bh.faces.new([vv(bh, VH, NX, a) for a in range(NA) if P[NX][a].z >= KB0 - 0.001]); fv.material_index = GRAU      # Stirn (Kinnband)
    fr = bh.faces.new([bh.verts.new(P[0][a]) for a in range(NA) if P[0][a].z >= ZT - 0.06]); fr.material_index = HELL      # hintere Stirn über dem Dach
    fu = bh.faces.new([bh.verts.new(p) for p in ((XB, -3.9, KB0), (KX1, -2.85, KB0), (KX1, 2.85, KB0), (XB, 3.9, KB0))]); fu.material_index = GRAU      # Unterseite über dem Tor
    for bm in (bh, bg):
        bm.normal_update()
        for fc in bm.faces:
            c = fc.calc_center_median()
            if fc.normal.dot(c - Vector((c.x - (0.5 if fc is not fv else 2.0), 0, 8.6))) < 0: fc.normal_flip()
    br = bmesh.new()      # schmale Rahmen um die Glasflächen
    for e in [e for e in bg.edges if len(e.link_faces) == 1]:
        a, b = e.verts[0].co, e.verts[1].co; dd = b - a
        if dd.length < 1e-5: continue
        n = e.link_faces[0].normal.copy(); u = dd.normalized(); w = u.cross(n).normalized() * 0.06; h = n * 0.05
        q = [br.verts.new(p) for p in (a - w, a + w, b + w, b - w)]; q2 = [br.verts.new(p + h) for p in (a - w, a + w, b + w, b - w)]
        br.faces.new(q2)
        for k in range(4): br.faces.new((q[k], q[(k + 1) % 4], q2[(k + 1) % 4], q2[k]))
    mesh_obj('Kanzelaufbau', bh, HULL_MATS, True, C_HULL)
    mesh_obj('Kanzelglas', bg, ['kanzel'], True, C_PART)
    mesh_obj('Fensterrahmen', br, [M['anth']], False, C_PART)
    for yy in (-1.55, 0.0, 1.55):      # Sprossen: vier Felder vorn (Bild)
        Q = []
        for x in [14.66 + (KX1 - 0.06 - 14.66) * i / 10 for i in range(11)]:
            zt, W = kparams(x); Q.append(Vector((x + 0.03, yy, zt + 0.03)))
        for a, b in zip(Q, Q[1:]): slab('Scheibensprosse', (a + b) / 2, (b - a).normalized(), Vector((0, 1, 0)), ((b - a).length + 0.01, 0.06, 0.05), M['anth'], 0.008)
    for k in range(3):      # Kinnfenster in der Stirn
        y0 = -1.4 + k * 1.4
        slab('Kinnfensterrahmen', (KX1 + 0.01, y0, KB0 + 0.26), Vector((0, 1, 0)), Vector((0, 0, 1)), (1.0, 0.36, 0.014), M['anth'], 0.003)
        slab('Kinnfenster', (KX1 + 0.018, y0, KB0 + 0.26), Vector((0, 1, 0)), Vector((0, 0, 1)), (0.88, 0.26, 0.01), M['kanzel'], 0.002)
    with Part('Radar', T(11.2, 0, KBT - 0.02), C_PART):
        cyl('Radarsockel', 0.38, 0.22, 0, 0, 0.1, M['anth'], 'Z', n=32, bev=0.02); sphere('Radarkuppel', 0.42, 0, 0, 0.32, M['hell'], 28)
    for x, h in ((9.0, 1.4), (9.6, 0.9)):
        rod('Antenne', Vector((x, -0.9, KBT - 0.05)), Vector((x - 0.12, -0.9, KBT + h)), 0.025, M['dunkel'], 8); sphere('Antennenspitze', 0.04, x - 0.12, -0.9, KBT + h, M['blitz'], 8)
    for s in (1, -1):
        for k in range(2): slab('Lueftungsgitter', (12.8 + k * 0.9, s * 3.0, KBT + 0.005), Vector((1, 0, 0)), Vector((0, 1, 0)), (0.7, 0.5, 0.03), M['dunkel'], 0.006)
        sphere('Kanzellicht', 0.06, KX1 - 0.4, s * 3.0, KBT - 0.6, M['nav_r' if s > 0 else 'nav_g'], 10)
        with Part('Abwehrkanone', T(13.5, s * 3.98, 8.15), C_WPN):
            cyl('Kanonenkapsel', 0.2, 1.2, 0, 0, 0, M['anth'], 'X', n=20, bev=0.02); rod('Kanonenrohr', Vector((0.55, 0, 0)), Vector((1.45, 0, 0)), 0.045, M['dunkel'], 12)
        ANCH['kanone%d' % s] = Vector((14.95, s * 3.98, 8.15))
    ANCH['kanzel'] = Vector((15.6, 0, 9.0))
def rueckengrat():
    """Grat vom Cockpit bis hinter den Flügel (Draufsicht: knapp 4 m breit), trägt den Flügel"""
    xs = [KX0 + 0.2 - (KX0 + 0.2 + 3.2) * i / 50 for i in range(51)]; bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten'); R = []
    for x in xs:
        e = min(1.0, (x + 3.2) / 1.0); w = 1.95 - 0.35 * (KX0 - x) / (KX0 + 3.2); h = 0.95 * ease(e) + 0.02
        half = _rund([(0.0, ZT + h), (w - 0.5, ZT + h), (w, ZT + h - 0.45), (w + 0.25, ZT - 0.05)], 0.12)
        poly = list(reversed([(-y, z) for y, z in half[1:]])) + half
        R.append([bm.verts.new((x, y, z)) for y, z in poly])
    n = len(R[0])
    for i in range(len(xs) - 1):
        for k in range(n - 1):
            f = bm.faces.new((R[i][k], R[i + 1][k], R[i + 1][k + 1], R[i][k + 1])); f.material_index = HELL
            for lp in f.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.y)
    bm.faces.new(R[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh_obj('Rueckengrat', bm, HULL_MATS, True, C_HULL)
    for x in (5.5, 2.5, -0.5): box('Gratfuge', 0.03, 3.6, 0.9, x, 0, ZT + 0.45, M['fuge'], 0.004)
WZ = ZT + 0.95                 # Flügelwurzel (Unterseite) auf dem Grat
ROT_C, ROT_R, ROT_H = (2.4, 10.5, 9.95), 2.8, 2.0      # Mantelrotor: Mitte (x, |y|, z), Außenradius, Höhe
def naca(c, tc): return 5 * tc * (0.2969 * math.sqrt(max(c, 0.0)) - 0.126 * c - 0.3516 * c * c + 0.2843 * c ** 3 - 0.1036 * c ** 4)
def fluegel():
    """Trapezflügel (Draufsicht: Wurzel 7,5 m, Spitze 4,8 m), Vorderkante gepfeilt, Hinterkante leicht nach vorn"""
    NY, NC = 24, 28; ytip = ROT_C[1] - ROT_R + 0.08; bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten'); R = []
    ys = [-ytip + 2 * ytip * j / NY for j in range(NY + 1)]
    for y in ys:
        u = abs(y) / ytip; xa = 5.7 - (5.7 - 4.75) * u; xb = -1.8 + (1.8 - 0.05) * u; zc = WZ + 0.35 - 0.12 * u; th = 0.13 - 0.03 * u; ch = xa - xb
        top = [(xa - ch * (1 - math.cos(PI / 2 * i / NC)), zc + naca(1 - math.cos(PI / 2 * i / NC), th) * ch) for i in range(NC + 1)]
        low = [(xa - ch * (1 - math.cos(PI / 2 * i / NC)), zc - naca(1 - math.cos(PI / 2 * i / NC), th) * ch * 0.6) for i in range(NC, -1, -1)]
        R.append([bm.verts.new((x, y, z)) for x, z in top + low[1:-1]])
    n = len(R[0])
    for j in range(NY):
        for i in range(n):
            f = bm.faces.new((R[j][i], R[j + 1][i], R[j + 1][(i + 1) % n], R[j][(i + 1) % n])); f.material_index = HELL if i < NC else MITTEL
            for lp in f.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.y)
    bm.faces.new(R[0]); bm.faces.new(R[-1][::-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh_obj('Fluegel', bm, HULL_MATS, True, C_HULL)
    for s in (1, -1):
        for k in range(3): box('Landeklappe', 0.8, 1.8, 0.07, -1.2 + k * 0.4, s * (2.6 + k * 1.75), WZ + 0.22, M['grau2'], 0.01)
        cyl('Fluegellicht', 0.07, 0.25, 4.6, s * (ytip - 0.4), WZ + 0.35, M['landelicht'], 'X', n=16)
def mantel(name, R0, Hh, col, NA=72):
    prof = [(R0 - 0.32, -Hh / 2), (R0 - 0.3, Hh / 2 - 0.14), (R0 - 0.18, Hh / 2), (R0 - 0.02, Hh / 2 - 0.08), (R0, Hh / 2 - 0.4), (R0, -Hh / 2 + 0.25), (R0 - 0.1, -Hh / 2)]
    bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten'); RR = []
    for a in range(NA):
        ph = 2 * PI * a / NA; RR.append([bm.verts.new((r * math.cos(ph), r * math.sin(ph), z)) for r, z in prof])
    for a in range(NA):
        for k in range(len(prof)):
            f = bm.faces.new((RR[a][k], RR[(a + 1) % NA][k], RR[(a + 1) % NA][(k + 1) % len(prof)], RR[a][(k + 1) % len(prof)]))
            for j, lp in enumerate(f.loops): lp[L].uv = ((a + (1 if j in (1, 2) else 0)) * 2 * PI * R0 / NA, (k + (1 if j in (2, 3) else 0)) * 0.45)
            f.material_index = GELB if (k == 4 and (a * 8 // NA) % 2 == 0 and (a * 8 // NA) in (0, 2, 4, 6) and (a % (NA // 8)) < 3) else (MITTEL if k in (0, 6) else HELL)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return mesh_obj(name, bm, HULL_MATS, True, col)
def mantelrotor(s, tag):
    cx, cy, cz = ROT_C[0], s * ROT_C[1], ROT_C[2]; R0, Hh = ROT_R, ROT_H
    with Gruppe(tag):
        with Part('Mantelrotor', T(cx, cy, cz), C_PART):
            mantel('Mantel', R0, Hh, C_PART)
            for k in range(2): ring('Mantelband', R0 + 0.01, 0.03, (0, 0, -0.4 + k * 0.7), (0, 0, 1), M['anth'], 72)
            cyl('Motorgondel', 0.55, 1.5, 0, 0, -0.1, M['anth'], 'Z', n=32, bev=0.03); sphere('Spinner', 0.48, 0, 0, 0.62, M['grau2'], 24)
            for k in range(10):
                a = 2 * PI * k / 10; ob = box('Rotorblatt', R0 - 0.95, 0.46, 0.05, 0, 0, 0, M['rotor'], 0.01)
                ob.matrix_basis = Matrix.Rotation(a, 4, 'Z') @ Matrix.Translation(((R0 - 0.95) / 2 + 0.58, 0, 0.3)) @ Matrix.Rotation(math.radians(24), 4, 'X')
            for k in range(16):
                a = 2 * PI * k / 16; ob = box('Leitschaufel', R0 - 0.85, 0.05, 0.45, 0, 0, 0, M['anth'], 0.006)
                ob.matrix_basis = Matrix.Rotation(a, 4, 'Z') @ Matrix.Translation(((R0 - 0.85) / 2 + 0.52, 0, -0.5)) @ Matrix.Rotation(math.radians(12), 4, 'X')
            ring('Schutzgitter', R0 - 0.32, 0.025, (0, 0, Hh / 2 - 0.03), (0, 0, 1), M['anth'], 64)
            for k in range(11):
                yy = (k - 5) * 0.48
                if abs(yy) < R0 - 0.45: hw = math.sqrt((R0 - 0.32) ** 2 - yy * yy); rod('Gitterstab', Vector((-hw, yy, Hh / 2 - 0.03)), Vector((hw, yy, Hh / 2 - 0.03)), 0.014, M['anth'], 6)
            rod('Schwenkwelle', Vector((0, -s * (R0 - 0.05), 0)), Vector((0, -s * (R0 + 0.45), 0)), 0.28, M['chrom'], 24)
            box('Schwenklager', 0.9, 0.5, 0.9, 0, -s * (R0 + 0.15), 0, M['anth'], 0.04)
            sphere('Positionslicht', 0.09, 0, s * (R0 + 0.02), 0.2, M['nav_r' if s > 0 else 'nav_g'], 10)
    gelenk(tag, (cx, cy, cz), 'Y', math.radians(90), 'fw', 0.1, 0.9)      # im Flug nach vorn geschwenkt
    DUESEN['hub'].append({'p': [round(cx, 3), round(cy, 3), round(cz - Hh / 2, 3)], 'd': [0, 0, -1], 'r': round(R0 - 0.4, 3)})
def heckrotoren():
    """kleinere Rotoren auf gepfeilten Stummeln ganz hinten (Draufsicht: Mitte x ≈ −19, |y| 6,2, Ø 3,9 m)"""
    for s in (1, -1):
        cx, cy, cz, r = -18.9, s * 6.25, 9.35, 1.95
        pts = [Vector((-14.2, s * 3.3, ZT - 0.15)), Vector((-16.6, s * 3.3, ZT - 0.15)), Vector((cx - 0.9, cy - s * (r - 0.1), cz - 0.2)), Vector((cx + 0.7, cy - s * (r - 0.1), cz - 0.2))]
        bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten'); th = 0.35
        lo = [bm.verts.new(p) for p in pts]; hi = [bm.verts.new(p + Vector((0, 0, th))) for p in pts]
        quads = [(lo[0], lo[1], lo[2], lo[3]), (hi[3], hi[2], hi[1], hi[0]), (lo[0], hi[0], hi[1], lo[1]), (lo[1], hi[1], hi[2], lo[2]), (lo[2], hi[2], hi[3], lo[3]), (lo[3], hi[3], hi[0], lo[0])]
        for q in quads:
            f = bm.faces.new(q); f.material_index = HELL
            for lp in f.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.y)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); mesh_obj('Heckstummel', bm, HULL_MATS, False, C_HULL)
        with Part('Heckrotor', T(cx, cy, cz), C_PART):
            mantel('Heckmantel', r, 1.2, C_PART, 56)
            cyl('Heckmotor', 0.32, 0.9, 0, 0, -0.05, M['anth'], 'Z', n=24); sphere('Heckspinner', 0.28, 0, 0, 0.36, M['grau2'], 16)
            for k in range(8):
                a = 2 * PI * k / 8; ob = box('Rotorblatt', r - 0.55, 0.26, 0.035, 0, 0, 0, M['rotor'], 0.006)
                ob.matrix_basis = Matrix.Rotation(a, 4, 'Z') @ Matrix.Translation(((r - 0.55) / 2 + 0.33, 0, 0.18)) @ Matrix.Rotation(math.radians(24), 4, 'X')
            ring('Schutzgitter', r - 0.32, 0.016, (0, 0, 0.57), (0, 0, 1), M['anth'], 48)
        DUESEN['hub'].append({'p': [round(cx, 3), round(cy, 3), round(cz - 0.6, 3)], 'd': [0, 0, -1], 'r': round(r - 0.3, 3)})
    prism('Rueckenflosse', [(-12.6, ZT - 0.02), (-14.6, ZT - 0.02), (-14.9, ZT + 1.7), (-14.0, ZT + 1.7)], -0.12, 0.12, M['hell'], 'Y', 0.03)
    sphere('Flossenlicht', 0.06, -14.5, 0, ZT + 1.75, M['blitz'], 10)
def rcs_block(name, p, n_out, up, fwd):
    n_out = Vector(n_out).normalized(); up = Vector(up); up = (up - n_out * up.dot(n_out)).normalized(); fwd = Vector(fwd).normalized()
    side = up.cross(n_out).normalized()
    with Part(name, Matrix.Translation(p) @ Matrix((side, up, n_out)).transposed().to_4x4(), C_PART):
        prism('Duesenblock', [(-0.28, -0.2), (0.28, -0.2), (0.32, 0.0), (0.28, 0.2), (-0.28, 0.2), (-0.32, 0.0)], -0.01, 0.15, M['anth'], 'Z', 0.02)
    dirs = []
    for nm, d in (('aussen', n_out), ('senk', up), ('laengs', fwd)):
        q = p + n_out * 0.09 + (d * 0.0 if nm == 'aussen' else d * 0.2)
        rod('Steuerduese', q - d * 0.07, q + d * 0.1, 0.06, M['duese'], 16, r2=0.08); sphere('Steuerglut', 0.04, *(q + d * 0.08), M['rcsglut'], 10)
        dirs.append({'p': [round(v, 3) for v in (q + d * 0.1)], 'd': [round(v, 3) for v in d]})
    DUESEN['rcs'].extend(dirs)
def steuerduesen():
    for s in (1, -1):
        for x, z, upd, fw in ((13.2, 7.0, 1, 1), (13.2, 5.0, -1, 1), (-18.4, 7.9, 1, -1), (-12.0, 5.0, -1, -1)):
            t = t_for_z(x, z, s); p = hull_point(x, t); n = hull_normal(x, t); rcs_block('Steuerduesen', p, n, (0, 0, upd), (fw, 0, 0))
    for x in (8.0, 4.0, -2.0, -6.0):      # Hubdüsen unter dem Boden (senkrechter Start zusätzlich zu den Rotoren)
        for s in (1, -1):
            c = Vector((x, s * 1.8, ZB - 0.005))
            with Part('Hubduese', Matrix.Translation(c), C_PART):
                ring('Hubrand', 0.5, 0.05, (0, 0, 0), (0, 0, 1), M['anth'], 40); cyl('Hubschacht', 0.46, 0.4, 0, 0, 0.2, M['schacht'], 'Z', n=40)
                cyl('Hubglut', 0.4, 0.02, 0, 0, 0.36, M['hubglut'], 'Z', n=32)
                for k in range(7): box('Leitschaufel', 0.06, 0.82 - abs(k - 3) * 0.12, 0.012, -0.36 + k * 0.12, 0, 0.1, M['mittel'], 0.002, rot=(0, math.radians(18), math.radians(90)))
            DUESEN['hub'].append({'p': [x, s * 1.8, ZB - 0.05], 'd': [0, 0, -1], 'r': 0.42})

# =====================================================================================
# 5. Rumpfdetails und Beschriftung (Bild: Möwe-Logo, Schwung, Kennung, Warnfelder)
# =====================================================================================
def details():
    CUR[0] = C_PART
    for x in (-17.0, -12.0, -6.8, -1.6, 3.6, 9.7, 12.6):      # nicht über dem Treppenloch (x 7,0 … 9,3): die Fuge lag dort als Latte im Weg
        hull_band('Spantfuge', [(x, -PI + 2 * PI * i / 240) for i in range(241)], 0.035, 0.012, M['fuge'], False)
    for s in (1, -1):
        for z in (4.58, 5.27): hull_band('Bandkante', [(x, t_for_z(x, z, s)) for x in [-13.4 + (13.8 + 13.4) * i / 90 for i in range(91)]], 0.035, 0.01, M['fuge'], False)
        hull_band('Bandlinie', [(x, t_for_z(x, 4.92, s)) for x in [-2.0 + 15.6 * i / 60 for i in range(61)]], 0.06, 0.008, M['hell'], False)
        hull_band('Schwung', [(x, t_for_z(x, 4.92 + 1.0 * ease((-x - 2.0) / 9.0), s)) for x in [-2.0 - 11.4 * i / 60 for i in range(61)]], 0.42, 0.008, M['grau2'], False)
        hull_band('Schwunglinie', [(x, t_for_z(x, 5.25 + 1.0 * ease((-x - 2.0) / 9.0), s)) for x in [-2.0 - 11.4 * i / 60 for i in range(61)]], 0.06, 0.008, M['hell'], False)
        for x in (-4.0, 2.0):
            side_patch('Wartungsklappe', x - 0.6, x + 0.6, 3.6, 4.3, 0.08, s, 0.02, M['grau2'], 4, 6)
            side_frame('Klappenfuge', x - 0.62, x + 0.62, 3.58, 4.32, 0.09, s, 0.016, 0.01, M['fuge'])
        side_patch('Lueftung', 10.3, 11.4, 6.6, 7.2, 0.05, s, 0.02, M['dunkel'], 3, 6)
        side_patch('Personaltuer', 4.2, 5.1, 4.8, 7.0, 0.1, s, 0.015, M['grau2'], 6, 8); side_frame('Tuerfuge', 4.18, 5.12, 4.78, 7.02, 0.11, s, 0.018, 0.012, M['fuge'])
        hull_band('Formationsleiste', [(x0, t_for_z(x0, 7.2, s)) for x0 in (-8.0, -7.0, -6.0, -5.0)], 0.035, 0.01, M['formlicht'])
def label_on(x, z, s, size, text_, m='txtd'):
    t = t_for_z(x, z, s); return surf_text(text_, size, hull_point(x, t), hull_normal(x, t), (0, 0, 1), m)
def markings():
    for s in (1, -1):
        label_on(1.5 * s, 6.45, s, 1.15, 'MÖWE', 'txtd'); label_on(-3.0 * s, 6.4, s, 0.62, 'MW-1', 'txtd')
        label_on(-12.0, 6.0, s, 0.14, 'FAHRZEUGTRANSPORTER · BASTION-WERFT', 'txtd')
        label_on(12.2, 3.0, s, 0.12, 'FAHRWERK · ABSTAND HALTEN', 'txtd')
        pts = []      # Möwe als Silhouette hinter dem Namen (zwei Flügelbögen)
        for i in range(25):
            u = i / 24.0; xx = -6.6 * s + 1.7 * (u - 0.5) * 2; zz = 6.55 + 0.42 * abs(math.sin(PI * u * 2)) ** 0.7 + 0.15 * abs(u - 0.5)
            pts.append((xx, t_for_z(xx, zz, s)))
        hull_band('Moewenlogo', pts, 0.16, 0.008, M['anth'], False)

# =====================================================================================
# Zustand und Ansichten
# =====================================================================================
def gelenke_anlegen():
    def piv(tag, hinge):
        e = bpy.data.objects.new('Gelenk ' + tag, None); C_PART.objects.link(e); e.location = hinge; e.empty_display_size = 0.15; PIVOTS[tag] = e
        for o in GRUPPEN.get(tag, []):
            if o.parent is not None: continue
            o.parent = e; o.matrix_parent_inverse = Matrix.Translation(Vector(hinge)).inverted()
        return e
    for g in GELENKE:
        e = piv(g['tag'], g['hinge'] if not g['slide'] else (0, 0, 0))
        for o in [e] + list(e.children_recursive): o['tag'] = g['tag']
    for a, b in UNTER.items():      # Verlängerungen und Füße hängen an ihren Eltern-Gelenken
        if a in PIVOTS and b in PIVOTS:
            e2 = PIVOTS[a]; e1 = PIVOTS[b]; e2.parent = e1; e2.matrix_parent_inverse = Matrix.Translation(Vector(e1.location)).inverted()
    for g in GELENKE:
        if g['tag'] in UNTER: g['under'] = UNTER[g['tag']]
def zustand(fw=0.0, rampe=0.0):
    want = {'fw': fw, 'rampe': rampe}
    for g in GELENKE:
        e = PIVOTS[g['tag']]; p = want[g['grp']]; k = ease((p - g['t0']) / (g['t1'] - g['t0']))
        if g['slide']: e.location = Vector(g['slide']) * k
        else: e.rotation_euler = (0, 0, 0); e.rotation_euler[{'X': 0, 'Y': 1, 'Z': 2}[g['axis']]] = g['angle'] * k
    bpy.context.view_layer.update()
ZUST = {}
def view(name, path, res=(1600, 900)):
    st = ZUST.get(name, {})
    zustand(st.get('fw', 0.0), st.get('rampe', 0.0))
    for o in bpy.data.objects:
        if o.name.startswith('Kanzelglas'): o.hide_render = name.startswith('cp_') or name.startswith('in_')
    boden = bpy.data.objects.get('Boden grau'); bz = boden.location.z if boden else 0
    if boden and name == 'unten': boden.location.z = -60
    try: _view0(name, path, res)
    finally:
        if boden: boden.location.z = bz

def build():
    global BVH
    hull, rings, XS = build_hull()
    BVH = make_bvh([hull]); ring0 = [v.co.copy() for v in rings[0]]; ringB = [v.co.copy() for v in rings[-1]]
    mesh_obj('Rumpf', hull, HULL_MATS, True, C_HULL)
    heckplatte(ring0); bugplatte(ringB)
    haube(); bugrampe(); heckrampe(); fahrwerk()
    aufbau(); rueckengrat(); fluegel()
    for s in (1, -1): mantelrotor(s, 'rot_' + ('l' if s > 0 else 'r'))
    heckrotoren(); steuerduesen(); details(); markings()
    for nm in ('moe_innen.py', 'moe_cockpit.py'):
        p = os.path.join(HIER, nm)
        if os.path.exists(p): exec(compile(open(p, encoding='utf-8').read(), nm, 'exec'), globals())
    gelenke_anlegen()
    stages(); world('grau')
    for nm, loc, yaw in (('Figur Studio', (21.0, -6.0, 0), 2.6), ('Figur Pilot', (19.5, -7.0, 0), 2.3), ('Figur Techniker', (-26.0, -3.0, 0), 1.2)):
        if nm in bpy.data.objects: o = bpy.data.objects[nm]; o.location = loc; o.rotation_euler = (0, 0, yaw)
    for nm, loc, tgt, lens in (('Schraeg', (40, 30, 15), (0.5, 0, 5.0), 38), ('Hangar', (36, 24, 7.5), (0.0, 0.5, 5.0), 30), ('Heck', (-42, -27, 12), (-6.0, 0, 5.0), 36),
                               ('Cockpit', (24.0, 7.0, 11.5), (15.5, 0, 8.6), 28), ('Detail', (17.0, 12.0, 2.0), (11.0, 4.6, 1.6), 30), ('Weltraum', (38, -28, 15), (0.0, 0, 5.0), 40)):
        c = CAMS[nm]; c.location = loc; c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lens
    CAMS['Seite'].location = (0.0, 100, 6.0); CAMS['Front'].location = (100, 0, 6.0); CAMS['Front'].data.ortho_scale = 34; CAMS['Seite'].data.ortho_scale = 46
    CAMS['Draufsicht'].data.ortho_scale = 46; CAMS['Draufsicht'].location = (0.0, 0, 100)
    cam('Bild', (34.0, 21.0, 9.5), (6.0, 0.0, 4.6), 30)      # wie das Konzeptbild: drei Viertel von vorn links, leicht erhöht
    cam('Heck offen', (-36.0, -12.0, 5.5), (-17.0, 0, 3.5), 30)
    cam('Fahrwerk', (15.5, 12.5, 1.5), (10.6, 4.6, 1.8), 32); cam('Unten', (16.0, 20.0, -10.0), (0.0, 0, 3.0), 38)
    global VIEWS
    V6 = {
        'schraeg': ('Schraeg', 'grau', True, 0.0, 0.0, {}), 'draufsicht': ('Draufsicht', 'grau', True, 0.2, 0.0, {'rampe': 1.0}), 'seite': ('Seite', 'grau', True, 0.9, 0.0, {'rampe': 1.0}),
        'front': ('Front', 'grau', True, 0.7, 0.0, {}), 'heck': ('Heck', 'grau', True, 0.1, 0.0, {}), 'hangar': ('Hangar', 'hangar', True, 0.4, 0.0, {'rampe': 1.0}),
        'cockpit': ('Cockpit', 'grau', True, 0.3, 0.0, {}), 'detail': ('Detail', 'grau', True, 0.2, 0.0, {}),
        'weltraum': ('Weltraum', 'weltraum', True, 0.0, 6.0, {'fw': 1.0}), 'unten': ('Unten', 'grau', True, 0.6, 0.0, {}),
        'bild': ('Bild', 'grau', True, 0.2, 0.0, {'rampe': 1.0}), 'heckoffen': ('Heck offen', 'grau', True, 0.4, 0.0, {'rampe': 1.0}),
        'fahrwerk': ('Fahrwerk', 'grau', True, 0.3, 0.0, {}), 'halb': ('Schraeg', 'grau', True, 0.0, 0.0, {'fw': 0.5, 'rampe': 0.5}),
        'flug': ('Schraeg', 'grau', True, 0.0, 0.0, {'fw': 1.0}), 'zu': ('Bild', 'grau', True, 0.2, 0.0, {}),
    }
    if 'IN_VIEWS' in globals(): V6.update(IN_VIEWS)
    VIEWS = {k: v[:5] for k, v in V6.items()}; ZUST.update({k: v[5] for k, v in V6.items()})
    anchors = {'duesen': DUESEN, 'rampe_scharnier': list(ANCH['rampe_scharnier']), 'bugrampe_scharnier': list(ANCH['bugrampe_scharnier']),
               'fuesse': [list(ANCH[k]) for k in ('fuss_v1', 'fuss_v-1', 'fuss_h1', 'fuss_h-1')], 'gelenke': GELENKE,
               'masse': dict(FL=FL, TOR=list(TOR), RAMP_L1=RAMP_L1, RAMP_L2=RAMP_L2, HR_L1=HR_L1, HR_L2=HR_L2, XE=XE, XB=XB, HR_X=HR_X, ZK=globals().get('ZK', 0.0), ZC=globals().get('ZC', 0.0))}
    for k in ('auge', 'griffe', 'raum', 'kanone1'):
        if k in ANCH: anchors[k] = ANCH[k] if not isinstance(ANCH[k], Vector) else list(ANCH[k])
    open(os.path.join(HIER, 'moe-anker.json'), 'w').write(json.dumps(anchors, indent=1, default=lambda v: [round(c, 4) for c in v]))
    zustand(0, 0)
    return {'ringe': len(XS), 'gelenke': len(GELENKE)}
if not globals().get('NUR_HELFER_MOEWE'):
    result = build()
