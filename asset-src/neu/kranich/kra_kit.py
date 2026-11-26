# Kranich KR-1 (26.11.2026): eigenes Mehrzweckschiff für zwei, innen begehbar.
# Wunsch des Nutzers: „Jetzt ein neues Schiff erstellen, mit allem, was du bisher gelernt hast. Es soll außen wie innen besser als alles bisher
# aussehen und funktionieren. Für den Innenraum und das Cockpit soll alles im Modell passen, den kompletten Raum innen ausnutzen, keine Lücken
# lassen. Das volle Cockpitmodell mit ins Schiffspaket bauen. Mache dir auch Gedanken zum Antrieb … zum vertikalen Start braucht man auch ein
# paar kleine unten und zum Manövrieren.“ Eigener Entwurf, kein Vorbild aus einem anderen Spiel.
#
# Aufbau (Achsen wie Milan und Dohle: +X nach vorn, +Y Backbord, +Z oben, Boden z = 0; Länge 32 m):
#  - Rumpf aus Superellipsen-Spanten: Ogivnase mit dunklem Radom, Cockpit mit Rundumverglasung (zwei Plätze nebeneinander), langer Mittelrumpf,
#    kastiger Laderaum, flache Heckplatte mit Rampe (zwei Teile: Rampe schwenkt hinunter, Verlängerung fährt aus)
#  - Antrieb: zwei Haupttriebwerke in Gondeln an Stummelflügeln (Einlauf mit Lüfterrad, Schubdüse mit Klappen), vier Hubdüsen unten
#    (zwei im Bug, zwei unter den Gondeln) mit Leitschaufeln für den senkrechten Start, acht Steuerdüsenblöcke mit je drei Düsen
#    (Nase und Heck, oben und unten, beide Seiten) zum Manövrieren
#  - vier Landebeine mit Füßen: vorn fahren sie nach hinten in den Bug, hinten nach vorn in die Gondeln
#  - Innenraum (kra_innen.py) folgt der Rumpfform: die Innenhaut ist der Rumpf nach innen versetzt, Boden und Schotten schließen daran an
#  - Cockpit in voller Ausführung (kra_cockpit.py, Cockpit-Baukasten Stil 2), es liegt im Schiffsmodell selbst
# Bewegliche Teile hängen an Gelenken (Gruppen fw, rampe); mil_kit.py liefert Werkzeuge, Landebein mit Fuß, Gelenkverwaltung.
# Aufruf ohne Fenster: blender.exe -b --python kra_lauf.py -- <ansichten> | alle
import bpy, bmesh, math, random, os, json
from mathutils import Vector, Matrix
NUR_HELFER_MILAN = True
_mk = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'milan', 'mil_kit.py')
exec(compile(open(_mk, encoding='utf-8').read(), 'mil_kit.py', 'exec'))
HIER = os.path.dirname(bpy.data.filepath)
ANCH = {}; GELENKE.clear(); GRUPPEN.clear(); PIVOTS.clear()
RND = random.Random(11)

# =====================================================================================
# Materialien: Kranichgrau oben, Anthrazit unten, dunkles Radom, eine rote Krone hinter dem Cockpit (wie beim Vogel), wenig Gelb für Warnkanten
# =====================================================================================
M['k_hell'] = panel_mat('Rumpf Kranichgrau', (0.172, 0.176, 0.181), 0.3, 0.44, 0.85, brick=(1.4, 0.8), mortar=0.008)
M['k_dunkel'] = panel_mat('Rumpf Anthrazit', (0.030, 0.032, 0.036), 0.5, 0.4, 0.65, brick=(1.4, 0.8), mortar=0.008)
M['k_nase'] = panel_mat('Rumpf Radom', (0.017, 0.018, 0.02), 0.15, 0.5, 0.35, rivets=False)
M['k_rot'] = panel_mat('Rumpf Kronenrot', (0.30, 0.016, 0.012), 0.25, 0.42, 0.75, brick=(1.4, 0.8), rivets=False)
M['hell'] = hull_mat('Lack Kranichgrau', (0.16, 0.164, 0.168), 0.3, 0.45, 0.8)
M['anth'] = hull_mat('Lack Anthrazit', (0.03, 0.032, 0.036), 0.5, 0.4, 0.6)
M['krone'] = hull_mat('Lack Kronenrot', (0.30, 0.016, 0.012), 0.25, 0.42, 0.75)
M['gelb'] = hull_mat('Lack Warngelb', (0.55, 0.38, 0.02), 0.2, 0.45, 0.9)
M['schacht'] = mk('Schachtgrund', (0.045, 0.047, 0.05), 0.4, 0.5, var=0.15, scale=3.0, bump=0.2, wear=0.4)
M['hubglut'] = mk('Hubglut', (0.03, 0.035, 0.04), 0.6, 0.35, var=0, rvar=0, emit=(0.55, 0.75, 1.0), es=0.0, grime=False)
M['rcsglut'] = mk('Steuerglut', (0.03, 0.035, 0.04), 0.6, 0.35, var=0, rvar=0, emit=(0.8, 0.9, 1.0), es=0.0, grime=False)
M['formlicht'] = mk('Formationsleuchte', (0.2, 1.0, 0.45), 0, 0.3, var=0, rvar=0, emit=(0.25, 1.0, 0.45), es=3.0, grime=False)
M['landelicht'] = mk('Landescheinwerfer', (1.0, 0.97, 0.9), 0, 0.2, var=0, rvar=0, emit=(1.0, 0.96, 0.88), es=6.0, grime=False)
HULL_MATS = ['k_hell', 'k_dunkel', 'k_nase', 'k_rot']
HELL, DUNKEL, NASE, ROT = 0, 1, 2, 3

# =====================================================================================
# 1. Rumpf: Spanten aus Superellipsen (Tabelle), Ogivnase, flache Heckplatte
# =====================================================================================
XN, XT, ZTIP = 13.6, 16.0, 3.35      # Beginn der Nasenrundung, Spitze, Höhe der Spitze
XR, XE = -14.9, -15.6               # Beginn des Hecks, Heckebene
TBL = [  # x, halbe Breite, Oberkante, Unterkante, Exponent (größer = kastiger). Körper (Laderaum) → Hals (Kabine) → Kopf (Cockpit), wie beim Vogel
    (-14.9, 3.25, 6.35, 1.78, 4.6), (-11.0, 3.35, 6.45, 1.72, 4.8), (-5.0, 3.35, 6.45, 1.72, 4.8), (-1.6, 3.22, 6.40, 1.75, 4.4),
    (1.4, 2.72, 5.98, 1.85, 3.6), (4.0, 2.28, 5.48, 1.95, 3.2), (6.6, 2.24, 5.42, 2.0, 3.0), (9.0, 2.38, 5.58, 2.05, 2.8),
    (11.3, 2.18, 5.38, 2.15, 2.6), (13.6, 1.56, 4.58, 2.4, 2.3)]
_F = [pchip([r[0] for r in TBL], [r[k] for r in TBL], 0.0, 0.0) for k in range(1, 5)]
def base(x): return tuple(f(x) for f in _F)
def params(x):
    if x > XN:      # Ogive: läuft spitz zu, oben flacher (Blick über die Nase)
        e = min(1.0, (x - XN) / (XT - XN)); W0, zt0, zb0, n0 = base(XN)
        fw = max(0.0, 1 - e ** 1.7) ** 0.62; ft = max(0.0, 1 - e ** 1.5) ** 0.62; fb = max(0.0, 1 - e ** 1.9) ** 0.62
        return W0 * fw, ZTIP + (zt0 - ZTIP) * ft, ZTIP - (ZTIP - zb0) * fb, n0 + (2.0 - n0) * e
    if x < XR:      # Heck: kaum eingezogen bis zur Heckplatte
        e = min(1.0, (XR - x) / (XR - XE)); g = 1 - 0.05 * e * e
        W0, zt0, zb0, n0 = base(XR); zc0 = zb0 + 0.48 * (zt0 - zb0)
        return W0 * g, zc0 + (zt0 - zc0) * g, zc0 - (zc0 - zb0) * g, n0
    return base(x)
NRING = 128
def x_samples():
    xs = [XE + (XR - XE) * k / 6 for k in range(6)]
    x = XR
    while x < XN - 1e-6: xs.append(x); x += 0.12
    K = 44
    for k in range(K): xs.append(XN + (XT - XN) * math.sin(k / K * PI / 2))
    return sorted(set(round(v, 4) for v in xs))
# Verglasung: Superellipse in (x, Winkel); vorn tiefer herumgezogen
GX, GH, GT, GP = 12.35, 2.15, 1.5, 3.0      # GT 1,5: Glas weit an den Seiten herunter (Sicht vom Sitz)
def glas_g(x, t):
    tt = ((t + PI) % (2 * PI)) - PI; xs = (x - GX) / GH
    tw = GT * (1.0 + 0.16 * max(0.0, xs))      # vorn etwas weiter um die Seiten
    return abs(xs) ** GP + abs(tt / tw) ** GP
def build_hull():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); XS = x_samples(); rings = []
    for x in XS: rings.append([bm.verts.new(hull_point(x, 2 * PI * k / NRING)) for k in range(NRING)])
    tip = bm.verts.new((XT, 0, ZTIP)); faces = []
    for i in range(len(XS) - 1):
        for k in range(NRING):
            k2 = (k + 1) % NRING; f = bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2])); faces.append((f, i, k))
    for k in range(NRING): bm.faces.new((rings[-1][k], tip, rings[-1][(k + 1) % NRING])).material_index = NASE
    q = NRING // 4
    for f, i, k in faces:
        xm = (XS[i] + XS[i + 1]) / 2; tm = 2 * PI * (k + 0.5) / NRING
        tt = ((tm + PI) % (2 * PI)) - PI
        if xm > 14.6: f.material_index = NASE
        elif abs(tt) > 1.92: f.material_index = DUNKEL                       # unterhalb der Seitenkante
        elif 5.2 < xm < 8.4 and abs(tt) < 0.42 and (xm - 5.2) > abs(tt) * 2.6: f.material_index = ROT      # rote Krone hinter dem Cockpit
        else: f.material_index = HELL
    vk = {}
    for i, r in enumerate(rings):
        for k, v in enumerate(r): vk[v] = (XS[i], k)
    for f, i, k in faces:
        ks = [vk[lp.vert][1] for lp in f.loops]; wrap = max(ks) - min(ks) > NRING // 2
        for lp in f.loops:
            x, kv = vk[lp.vert]
            if wrap and kv < NRING // 2: kv += NRING
            lp[uvl].uv = (x, 2 * PI * kv / NRING * 3.1)      # v: etwa Meter um den Umfang
    bm.normal_update()
    return bm, rings, XS

# Öffnungen: Verglasung, Bugbeinschächte, Hubdüsen vorn, Heckplatte (eigene Fläche mit Rampenöffnung)
FL = 2.35                     # Boden innen (Laderaum, Gang, Technik)
FLC = 2.92                    # Boden im Cockpit (drei Stufen höher, Stufen im Cockpit hinter der Tür; Blick über die Nase)
RAMP = (1.55, FL, 5.15)       # Rampenöffnung in der Heckplatte: halbe Breite, unten, oben
NBAY = (11.6, 8.95, 1.0, 1.9)       # Bugbeinschächte (unter dem Cockpitboden): x vorn, x hinten, |y| innen, |y| außen
HUBV = (7.6, 1.3, 0.5)        # vordere Hubdüsen (unter dem Gangboden): x, |y|, Radius
KAB_FENSTER = [(3.3, 4.35), (5.0, 6.05)]      # Bullaugen des Wohnteils (x von, bis), beide Seiten
KAB_Z, KAB_R = (4.0, 4.55), 0.2
def in_fenster(x, z, ins=0.0):
    """liegt (x, z) im Bullauge (um ins nach innen versetzt)?"""
    zm, hh = (KAB_Z[0] + KAB_Z[1]) / 2, (KAB_Z[1] - KAB_Z[0]) / 2 - ins; r = KAB_R - ins
    for a, b in KAB_FENSTER:
        xm, hw = (a + b) / 2, (b - a) / 2 - ins
        dx, dz = max(0.0, abs(x - xm) - (hw - r)), max(0.0, abs(z - zm) - (hh - r))
        if abs(x - xm) < hw and abs(z - zm) < hh and dx * dx + dz * dz < r * r: return True
    return False
def fenster_umriss(a, b, ins=0.0, n=8):
    zm, hh = (KAB_Z[0] + KAB_Z[1]) / 2, (KAB_Z[1] - KAB_Z[0]) / 2 - ins; r = KAB_R - ins; xm, hw = (a + b) / 2, (b - a) / 2 - ins; P = []
    for cx, cz, a0 in ((xm + hw - r, zm - hh + r, -PI / 2), (xm + hw - r, zm + hh - r, 0.0), (xm - hw + r, zm + hh - r, PI / 2), (xm - hw + r, zm - hh + r, PI)):
        for k in range(n + 1): P.append((cx + r * math.cos(a0 + PI / 2 * k / n), cz + r * math.sin(a0 + PI / 2 * k / n)))
    return P
def cut_openings(bm):
    dead = []
    for f in bm.faces:
        c = f.calc_center_median()
        if abs(c.y) > 1.2 and 3.9 < c.z < 4.7 and in_fenster(c.x, c.z, 0.04): dead.append(f); continue
        if c.x > 9.0 and c.z > 2.9 and glas_g(c.x, math.atan2(c.y, c.z - zc_of(c.x))) < 1.0: dead.append(f); continue
        if NBAY[1] < c.x < NBAY[0] and NBAY[2] < abs(c.y) < NBAY[3] and c.z < 2.6: dead.append(f); continue
        if math.hypot(c.x - HUBV[0], abs(c.y) - HUBV[1]) < HUBV[2] + 0.02 and c.z < 2.8: dead.append(f); continue
    bmesh.ops.delete(bm, geom=dead, context='FACES')

def tail_plate(rings):
    """Heckplatte mit Rampenöffnung (Ring 0 außen, Rechteck innen), Rand der Öffnung, Wülste"""
    bm = bmesh.new()
    outer = [bm.verts.new(c.copy()) for c in rings]      # Ring 0 des Rumpfs (Koordinaten)
    hw, z0, z1 = RAMP; rr = 0.18
    inner_pts = [(hw, z0), (-hw, z0)] + [(-hw + rr - rr * math.cos(a), z1 - rr + rr * math.sin(a)) for a in [PI / 2 * j / 6 for j in range(1, 6)]] + [(-hw + rr, z1), (hw - rr, z1)] + \
                [(hw - rr + rr * math.cos(PI / 2 - PI / 2 * j / 6), z1 - rr + rr * math.sin(PI / 2 - PI / 2 * j / 6)) for j in range(1, 6)]
    inner = [bm.verts.new((XE, y, z)) for y, z in inner_pts]
    edges = [bm.edges.new((outer[i], outer[(i + 1) % len(outer)])) for i in range(len(outer))] + [bm.edges.new((inner[i], inner[(i + 1) % len(inner)])) for i in range(len(inner))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges, normal=Vector((-1, 0, 0)))
    for f in bm.faces:
        c = f.calc_center_median()
        if abs(c.y) < hw - 0.01 and z0 + 0.01 < c.z < z1 - 0.01: f.select = True
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.select], context='FACES')
    for f in bm.faces: f.material_index = DUNKEL if f.calc_center_median().z < 2.6 else HELL
    bm.normal_update()
    if sum(f.normal.x for f in bm.faces) > 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    uvl = bm.loops.layers.uv.new('Platten')
    for f in bm.faces:
        for lp in f.loops: lp[uvl].uv = (lp.vert.co.y, lp.vert.co.z)
    mesh_obj('Heckplatte', bm, HULL_MATS, False, C_HULL)
    # Rahmen der Öffnung (Laibung bis in den Laderaum), Dichtung, Warnkante unten
    for side in (1, -1):
        box('Laibung Seite', 0.5, 0.08, z1 - z0 - 0.1, XE + 0.2, side * (hw + 0.04), (z0 + z1) / 2, M['anth'], 0.01)
        box('Dichtung', 0.04, 0.03, z1 - z0 - 0.2, XE - 0.01, side * (hw - 0.015), (z0 + z1) / 2, M['rubber'], 0.006)
    box('Laibung oben', 0.5, 2 * hw, 0.1, XE + 0.2, 0, z1 + 0.05, M['anth'], 0.01)
    box('Schwelle', 0.5, 2 * hw, 0.06, XE + 0.2, 0, z0 - 0.03, M['mittel'], 0.008)
    for side in (1, -1):      # Rücklichter, Heckwülste, Griffe
        cyl('Ruecklicht', 0.06, 0.03, XE - 0.015, side * 2.55, 4.6, M['nav_r'], 'X', n=16)
        box('Heckleiste', 0.06, 0.08, 2.6, XE - 0.03, side * 2.85, 3.95, M['kante'], 0.01)
        for k in range(3): box('Haltegriff', 0.05, 0.03, 0.34, XE - 0.06, side * (hw + 0.28), 3.0 + k * 0.7, M['gelb'], 0.01)
    ANCH['rampe_scharnier'] = Vector((XE + 0.02, 0, z0))

# =====================================================================================
# 2. Verglasung: Glas auf der Maske, dicke Rahmen, zwei Seitenpfosten, Mittelpfosten, Querspant oben; Wischer und Dichtung
# =====================================================================================
def glas_pt(x, t, lift=0.0): return hull_point(x, t) + hull_normal(x, t) * lift
def glazing():
    CUR[0] = C_PART
    # Glas: Raster in (x, t), nur innerhalb der Maske (Rand per Schnitt der Maskenlinie)
    bm = bmesh.new(); NX, NT = 56, 72; X0, X1 = GX - GH * 1.02, GX + GH * 1.02; T0 = GT * 1.25
    V = {}
    def inside(x, t): return glas_g(x, t) < 0.985
    for i in range(NX + 1):
        x = X0 + (X1 - X0) * i / NX
        for j in range(NT + 1):
            t = -T0 + 2 * T0 * j / NT
            if inside(x, t): V[(i, j)] = bm.verts.new(glas_pt(x, t, 0.012))
    for i in range(NX):
        for j in range(NT):
            q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
            if all(k in V for k in q): bm.faces.new([V[k] for k in q])
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Kanzelglas', bm, ['kanzel'])
    # Rahmen: Rand der Maske (dick), Pfosten
    rim = []
    for k in range(240):
        a = 2 * PI * k / 240; c, s = math.cos(a), math.sin(a)
        # Punkt auf der Superellipse g = 1: xs = sign(c)|c|^(2/p), tt/tw = sign(s)|s|^(2/p)
        xs = math.copysign(abs(c) ** (2 / GP), c); x = GX + GH * xs; tw = GT * (1.0 + 0.16 * max(0.0, xs))
        t = math.copysign(abs(s) ** (2 / GP), s) * tw; rim.append((x, t))
    hull_band('Fensterrahmen', rim, 0.11, 0.05, M['anth'], True)
    hull_band('Fensterdichtung', [(x, t * 0.985) for x, t in rim], 0.03, 0.02, M['rubber'], True)
    def post(t0, name, w=0.075):
        pts = [(X0 + (X1 - X0) * i / 60, t0) for i in range(61)]
        pts = [p for p in pts if glas_g(p[0], p[1]) < 1.0]
        if len(pts) > 2: hull_band(name, pts, w, 0.045, M['anth'])
    post(0.0, 'Mittelpfosten', 0.07)
    for s in (1, -1): post(s * 0.86, 'Seitenpfosten', 0.08)
    for xr in (11.15,):      # Querspant oben
        tb = GT * 1.0 * (1 - abs((xr - GX) / GH) ** GP) ** (1 / GP)
        hull_band('Querspant', [(xr, -tb + 2 * tb * i / 40) for i in range(41)], 0.07, 0.045, M['anth'])
    for s in (1, -1):
        with Part('Wischer', place(13.85, s * 0.42, 0.04), C_PART):
            box('Wischerarm', 0.62, 0.02, 0.014, -0.28, 0, 0.01, M['dunkel'], 0.003); box('Wischerblatt', 0.52, 0.012, 0.022, -0.3, s * 0.02, 0.0, M['rubber'], 0.003)
    ANCH['kanzel_gelenk'] = Vector((GX, 0, 5.0))

# =====================================================================================
# 3. Gondeln mit Haupttriebwerken, Stummelflügel, Leitwerke
# =====================================================================================
NG = (6.15, 3.45)       # |y|, z der Gondelmitte
NX0, NX1 = -3.2, -15.3   # Einlauf vorn, Düsenebene hinten
_NR = pchip([NX1, -13.6, -9.0, -5.2, -3.9, NX0], [1.04, 1.28, 1.36, 1.33, 1.24, 1.16], 0.0, 0.0)
def nac_r(x): return _NR(max(NX1, min(NX0, x)))
def se(c, n=2.7): return math.copysign(abs(c) ** (2 / n), c)      # Superellipse: Gondeln leicht kastig
def build_nacelle(s):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); NA = 64; xs = [NX0 - (NX0 - NX1) * i / 60 for i in range(61)]; rings = []
    yc, zc = s * NG[0], NG[1]
    for x in xs:
        r = nac_r(x); rings.append([bm.verts.new((x, yc + r * se(math.cos(2 * PI * a / NA)), zc + r * se(math.sin(2 * PI * a / NA)) * 0.92)) for a in range(NA)])
    for i in range(len(xs) - 1):
        for a in range(NA):
            xm = (xs[i] + xs[i + 1]) / 2; ang = 2 * PI * (a + 0.5) / NA; ym = math.cos(ang) * nac_r(xm)
            if math.sin(ang) < -0.5 and (math.hypot(xm - HUBH[0], ym) < HUBH[1] + 0.02 or (-7.3 < xm < -3.95 and abs(ym) < 0.42)): continue      # Hubdüse, Beinschacht
            f = bm.faces.new((rings[i][a], rings[i][(a + 1) % NA], rings[i + 1][(a + 1) % NA], rings[i + 1][a]))
            f.material_index = DUNKEL if math.sin(ang) < -0.35 else HELL
            for lp in f.loops:
                aa = math.atan2((lp.vert.co.z - zc) / 0.92, lp.vert.co.y - yc) % (2 * PI)
                if a == NA - 1 and aa < 1.0: aa += 2 * PI
                lp[uvl].uv = (lp.vert.co.x, aa * 1.3)
    bm.normal_update()
    if sum(f.normal.dot(f.calc_center_median() - Vector((f.calc_center_median().x, yc, zc))) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Gondel ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_HULL)
def nacelle_parts(s):
    yc, zc = s * NG[0], NG[1]; ri = nac_r(NX0)
    with Part('Einlauf', T(NX0, yc, zc), C_PART):
        ring('Einlauflippe', ri - 0.02, 0.07, (0.02, 0, 0), (1, 0, 0), M['kante'], 64)
        bell('Einlaufkanal', ri - 0.06, ri - 0.12, 1.4, 0.0, M['schacht'], 56)
        cyl('Lueftergehaeuse', ri - 0.14, 0.05, -1.25, 0, 0, M['mittel'], 'X', n=56)
        cyl('Nabe', 0.32, 0.5, -1.05, 0, 0, M['anth'], 'X', n=32, r2=0.08)
        for k in range(22):      # Lüfterschaufeln
            a = 2 * PI * k / 22; ob = box('Schaufel', 0.05, 0.12, ri - 0.5, 0, 0, 0, M['mittel'], 0.004)
            ob.matrix_basis = Matrix.Translation((-1.2, 0, 0)) @ RX(a) @ Matrix.Translation((0, 0, 0.33 + (ri - 0.5) / 2)) @ RZ(math.radians(28))
        for k in range(6):       # Leitgitter vor dem Lüfter
            a = 2 * PI * k / 6; ob = box('Leitstrebe', 0.06, 0.04, ri - 0.2, 0, 0, 0, M['anth'], 0.006)
            ob.matrix_basis = Matrix.Translation((-0.45, 0, 0)) @ RX(a) @ Matrix.Translation((0, 0, (ri - 0.2) / 2 + 0.08))
        ring('Warnring', ri - 0.13, 0.012, (-0.3, 0, 0), (1, 0, 0), M['krone'], 56)
    rn = nac_r(NX1)
    with Part('Schubduese', T(NX1, yc, zc), C_PART):
        bell('Duesenmantel', rn + 0.02, rn - 0.04, 1.2, 0.9, M['anth'], 56)
        ring('Mantelring', rn + 0.02, 0.025, (-0.3, 0, 0), (1, 0, 0), M['mittel'], 56)
        bell('Brennkammer', rn - 0.1, rn - 0.12, 1.15, 0.85, M['duese'], 48)
        for k in range(3): ring('Flammhalter', rn * (0.58 - k * 0.16), 0.016, (0.3 - k * 0.05, 0, 0), (1, 0, 0), M['duese'], 32)
        cyl('Glut', rn - 0.14, 0.03, 0.5, 0, 0, M['glut'], 'X', n=48)
        for k in range(24):      # Klappenkranz
            a = 2 * PI * k / 24; ob = box('Duesenklappe', 0.55, 0.26, 0.022, 0, 0, 0, M['duese'], 0.003)
            ob.matrix_basis = RX(a) @ Matrix.Translation((-0.55, 0, rn - 0.03)) @ RY(math.radians(-8))
            ob2 = box('Dichtklappe', 0.5, 0.09, 0.014, 0, 0, 0, M['dunkel'], 0.002); ob2.matrix_basis = RX(a + PI / 24) @ Matrix.Translation((-0.55, 0, rn - 0.05)) @ RY(math.radians(-8))
        for k in range(4):
            d = Vector((0, math.cos(PI / 4 + k * PI / 2), math.sin(PI / 4 + k * PI / 2)))
            rod('Duesenstellzylinder', d * (rn + 0.1) + Vector((0.35, 0, 0)), d * (rn + 0.08) + Vector((-0.3, 0, 0)), 0.03, M['mittel'], 12)
        for k in range(3): ring('Hitzering', rn + 0.03, 0.009, (0.0 + k * 0.14, 0, 0), (1, 0, 0), M['duese'], 56)
    ANCH['duese%d' % s] = Vector((NX1 - 0.7, yc, zc))
    # Gondelbänder (Hauptfugen), Wartungsklappen, Auslässe, Positionslicht vorn
    for x in (-5.2, -9.0, -13.6):
        r = nac_r(x); ring('Gondelfuge', r * 1.0 + 0.004, 0.012, (x, yc, zc), (1, 0, 0), M['fuge'], 64)
    for k in range(7):      # Kühlschlitze oben hinten
        x = -11.2 - k * 0.32; r = nac_r(x)
        box('Kuehlschlitz', 0.12, 0.62, 0.03, x, yc, zc + r * 0.92 + 0.005, M['dunkel'], 0.008)
    cyl('Gondellicht', 0.05, 0.04, NX0 - 0.6, yc + s * nac_r(NX0 - 0.6) * 1.0, zc, M['nav_r' if s > 0 else 'nav_g'], 'Y', n=16)

def wing_section(y, s):
    """Profil des Stummelflügels bei |y|: (x vorn, x hinten, z Mitte, Dicke)"""
    u = (abs(y) - 3.05) / (NG[0] - 1.1 - 3.05)
    xa = -1.9 + (-3.6 + 1.9) * u; xb = -12.6 + (-11.9 + 12.6) * u
    return xa, xb, 3.05 + 0.35 * u, 0.56 - 0.12 * u
def naca(c, tc): return 5 * tc * (0.2969 * math.sqrt(max(c, 0.0)) - 0.126 * c - 0.3516 * c * c + 0.2843 * c ** 3 - 0.1036 * c ** 4)
def build_wing(s):
    """Stummelflügel vom Rumpf bis in die Gondel; Profil aus Vorder- und Hinterkante, Dicke wie NACA"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); NY, NC = 14, 30
    ys = [3.0 + (NG[0] - 0.95 - 3.0) * j / NY for j in range(NY + 1)]
    R = []
    for y in ys:
        xa, xb, zm, th = wing_section(y, s); row = []
        for i in range(NC + 1):      # oben von vorn nach hinten, dann unten zurück
            c = 1 - math.cos(PI / 2 * i / NC)
            row.append((xa + (xb - xa) * c, zm + naca(c, 1.0) * th / 0.6 * 0.6))
        low = [(xa + (xb - xa) * (1 - math.cos(PI / 2 * i / NC)), zm - naca(1 - math.cos(PI / 2 * i / NC), 1.0) * th / 0.6 * 0.6 * 0.7) for i in range(NC, -1, -1)]
        R.append([bm.verts.new((x, s * y, z)) for x, z in row + low[1:-1]])
    n = len(R[0])
    for j in range(NY):
        for i in range(n):
            f = bm.faces.new((R[j][i], R[j + 1][i], R[j + 1][(i + 1) % n], R[j][(i + 1) % n]))
            f.material_index = HELL if i < NC else DUNKEL
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, abs(lp.vert.co.y))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.normal_update()
    mesh_obj('Fluegel ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_HULL)
    # Vorderkante: Kantenleiste; Waffen in den Wurzeln
    xa, xb, zm, th = wing_section(3.3, s)
    with Part('Kanone', T(xa - 0.1, s * 3.55, zm - 0.05), C_WPN):
        prism('Kanonenverkleidung', [(0.0, -0.18), (0.0, 0.18), (-1.6, 0.24), (-1.6, -0.24)], -0.16, 0.16, M['anth'], 'Z', 0.03)
        rod('Kanonenrohr', Vector((0.0, 0, 0)), Vector((1.25, 0, 0)), 0.055, M['dunkel'], 16)
        rod('Muendungsbremse', Vector((1.1, 0, 0)), Vector((1.32, 0, 0)), 0.075, M['mittel'], 16)
        for k in range(4): cyl('Kuehlrippe', 0.075, 0.02, 0.3 + k * 0.12, 0, 0, M['mittel'], 'X', n=16)
    ANCH['kanone%d' % s] = Vector((xa + 1.25, s * 3.55, zm - 0.05))
    # Flügelspitzen außen: kleine Endplatte mit Positionslicht
    xa2, xb2, zm2, th2 = wing_section(NG[0] - 0.95, s)

def fin(s):
    """Seitenleitwerk auf der Gondel, 14° nach außen geneigt; rote Vorderkante, Blitzlicht oben"""
    yc, zc = s * NG[0], NG[1] + 1.18; cant = math.radians(14) * s
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); NH, NC = 10, 22; H = 2.5
    R = []
    for j in range(NH + 1):
        h = H * j / NH; xa = -9.4 - h * 0.92; xb = -14.6 - h * 0.28; tc = 0.11 - 0.04 * j / NH; row = []
        for i in range(NC + 1):
            c = 1 - math.cos(PI / 2 * i / NC); row.append((xa + (xb - xa) * c, naca(c, tc) * (xa - xb) * 0.5))
        low = [(x, -w) for x, w in reversed(row)][1:-1]
        R.append([bm.verts.new((x, yc + w * math.cos(cant) + h * math.sin(cant), zc + h * math.cos(cant) - w * math.sin(cant))) for x, w in row + low])
    n = len(R[0])
    for j in range(NH):
        for i in range(n): f = bm.faces.new((R[j][i], R[j + 1][i], R[j + 1][(i + 1) % n], R[j][(i + 1) % n])); f.material_index = HELL
    top = bm.faces.new(R[-1][::-1]); top.material_index = DUNKEL
    for f in bm.faces:
        for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, lp.vert.co.z)
    bm.normal_update(); mesh_obj('Leitwerk ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_HULL)
    tipc = Vector((-9.4 - H * 0.92 - 0.2, yc + H * math.sin(cant), zc + H * math.cos(cant)))
    sphere('Blitzlicht', 0.05, *tipc, M['blitz'], 10)
    # Vorderkante rot (Krone wiederholt)
    pts = []
    for j in range(NH + 1):
        h = H * j / NH; xa = -9.4 - h * 0.92; pts.append(Vector((xa - 0.01, yc + h * math.sin(cant), zc + h * math.cos(cant))))
    for a, b in zip(pts, pts[1:]): rod('Leitwerkskante', a, b, 0.035, M['krone'], 10)

# =====================================================================================
# 4. Antrieb: Hubdüsen (senkrechter Start) und Steuerdüsen (Manövrieren)
# =====================================================================================
HUBH = (-9.6, 0.68)      # hintere Hubdüsen unter den Gondeln: x, Radius
DUESEN = {'haupt': [], 'hub': [], 'rcs': []}      # für das Spiel (kra-anker.json): Punkte und Richtungen
def lift_nozzle(name, c, r, tief=0.42):
    """Hubdüse: versenkter Schacht mit Rand, Leitschaufeln quer (schwenkbar), Glutboden, Schrauben"""
    with Part(name, Matrix.Translation(c), C_PART):
        ring('Hubrand', r + 0.04, 0.045, (0, 0, 0), (0, 0, 1), M['anth'], 56)
        ring('Hubrand innen', r - 0.02, 0.02, (0, 0, 0.03), (0, 0, 1), M['mittel'], 56)
        cyl('Hubschacht', r, tief, 0, 0, tief / 2 + 0.01, M['schacht'], 'Z', n=56)
        cyl('Hubglut', r - 0.05, 0.02, 0, 0, tief - 0.02, M['hubglut'], 'Z', n=48)
        cyl('Brenner', r * 0.4, 0.1, 0, 0, tief - 0.09, M['duese'], 'Z', n=24, r2=r * 0.25)
        nv = int(r / 0.11)
        for k in range(nv):      # Leitschaufeln
            yy = -r + 0.06 + k * (2 * r - 0.12) / max(1, nv - 1); w = 2 * math.sqrt(max(0.0, r * r - yy * yy)) - 0.06
            if w > 0.1: box('Leitschaufel', 0.07, w, 0.012, yy, 0, 0.12, M['mittel'], 0.002, rot=(0, math.radians(18), math.radians(90)))
        rod('Schaufelwelle', Vector((0, -r + 0.03, 0.12)), Vector((0, r - 0.03, 0.12)), 0.015, M['chrom'], 8)
        for k in range(16): cyl('Randschraube', 0.012, 0.01, (r + 0.04) * math.cos(2 * PI * k / 16), (r + 0.04) * math.sin(2 * PI * k / 16), -0.04, M['schraube'], 'Z', n=6)
    DUESEN['hub'].append({'p': [round(v, 3) for v in c], 'd': [0, 0, -1], 'r': r})
def lift_thrusters():
    for s in (1, -1):
        x, y, r = HUBV[0], s * HUBV[1], HUBV[2]; z = bot_z(x, y)
        lift_nozzle('Hubduese vorn', Vector((x, y, z + 0.005)), r, max(0.18, FL - 0.06 - z))
        x2, r2 = HUBH; y2 = s * NG[0]; z2 = NG[1] - nac_r(x2) * 0.92
        lift_nozzle('Hubduese hinten', Vector((x2, y2, z2 + 0.03)), r2)
def rcs_block(name, p, n_out, up, fwd):
    """Steuerdüsenblock auf der Haut: Grundplatte, drei Düsen (seitlich nach außen, senkrecht, längs)"""
    n_out = Vector(n_out).normalized(); up = Vector(up); up = (up - n_out * up.dot(n_out)).normalized(); fwd = Vector(fwd).normalized()
    side = up.cross(n_out).normalized()
    with Part(name, Matrix.Translation(p) @ Matrix((side, up, n_out)).transposed().to_4x4(), C_PART):
        prism('Duesenblock', [(-0.22, -0.16), (0.22, -0.16), (0.26, 0.0), (0.22, 0.16), (-0.22, 0.16), (-0.26, 0.0)], -0.01, 0.12, M['anth'], 'Z', 0.02)
        for k in range(6): cyl('Blockschraube', 0.012, 0.01, -0.2 + k * 0.08, 0.13 * (1 if k % 2 else -1), 0.125, M['schraube'], 'Z', n=6)
    dirs = []
    for nm, d in (('aussen', n_out), ('senk', up), ('laengs', fwd)):
        q = p + n_out * 0.07 + (d * 0.0 if nm == 'aussen' else d * 0.16)
        rod('Steuerduese', q - d * 0.06, q + d * 0.08, 0.05, M['duese'], 16, r2=0.065)
        sphere('Steuerglut', 0.032, *(q + d * 0.06), M['rcsglut'], 10)
        dirs.append({'p': [round(v, 3) for v in (q + d * 0.08)], 'd': [round(v, 3) for v in d]})
    DUESEN['rcs'].extend(dirs)
def rcs():
    for s in (1, -1):
        for x, t, upd, fw in ((15.05, 0.85, 1, 1), (12.9, 2.25, -1, 1),      # oben vorn auf dem Radom (vor dem Glas)
                               (-13.9, 1.05, 1, -1), (-13.9, 2.15, -1, -1)):
            tt = s * t; p = hull_point(x, tt); n = hull_normal(x, tt)
            rcs_block('Steuerduesen', p, n, (0, 0, upd), (fw, 0, 0))
    # Gondelspitzen hinten außen: je ein weiterer Block (Gieren mit langem Hebel)
    for s in (1, -1):
        x = -14.2; r = nac_r(x); p = Vector((x, s * (NG[0] + r), NG[1])); rcs_block('Steuerduesen', p, (0, s, 0), (0, 0, 1), (-1, 0, 0))

# =====================================================================================
# 5. Fahrwerk: vier Landebeine mit Füßen; vorn fahren sie nach hinten in den Bug, hinten nach vorn in die Gondeln
# =====================================================================================
def front_leg(s):
    y = s * (NBAY[2] + NBAY[3]) / 2; xp = NBAY[0] - 0.35; zp = bot_z(xp, y) + 0.25
    P0 = Vector((xp, y, zp)); A = Vector((xp + 0.12, y, 0.25)); tag = 'fwv_' + ('l' if s > 0 else 'r')
    with Gruppe(tag):
        with Part('Bugbein', T(0, 0, 0), C_GEAR):
            bein_fuss('Bug', P0, A, 0.085, 0.36, 0.28, 1)
            box('Beinlager', 0.34, 0.3, 0.18, xp, y, zp + 0.05, M['mittel'], 0.02)
    gelenk(tag, (xp, y, zp), 'Y', math.radians(88), 'fw', 0.05, 0.72)      # nach hinten in den Bug
    # Schacht: offener Kasten, Klappen (schließen zuletzt)
    yi, yo = NBAY[2], NBAY[3]; x0, x1 = NBAY[1], NBAY[0]
    open_box('Bugbeinschacht', x0, x1, s * yi if s > 0 else -yo, s * yo if s > 0 else -yi, bot_z((x0 + x1) / 2, s * (yi + yo) / 2) + 0.02, FLC - 0.05, M['schacht'], '-z', C_GEAR)
    for k, (yy, sg) in enumerate(((yi, 1), (yo, -1))):
        tg = 'fwvk_%s%d' % ('l' if s > 0 else 'r', k)
        with Gruppe(tg):
            zb = bot_z((x0 + x1) / 2, s * yy)
            box('Schachtklappe', x1 - x0 - 0.06, 0.04, 0.42, (x0 + x1) / 2, s * yy, zb - 0.21, M['anth'], 0.01)
        gelenk(tg, ((x0 + x1) / 2, s * yy, zb), 'X', s * sg * math.radians(88), 'fw', 0.72, 1.0)
    ANCH['fuss_v%d' % s] = Vector((A.x, y, 0))
def rear_leg(s):
    y = s * NG[0]; xp = -6.9; zp = NG[1] - nac_r(xp) * 0.92 + 0.3
    P0 = Vector((xp, y, zp)); A = Vector((xp - 0.15, y, 0.25)); tag = 'fwh_' + ('l' if s > 0 else 'r')
    with Gruppe(tag):
        with Part('Hauptbein', T(0, 0, 0), C_GEAR):
            bein_fuss('Haupt', P0, A, 0.1, 0.44, 0.34, -1)
            box('Beinlager', 0.4, 0.36, 0.2, xp, y, zp + 0.06, M['mittel'], 0.02)
    gelenk(tag, (xp, y, zp), 'Y', -math.radians(86), 'fw', 0.0, 0.7)      # nach vorn in die Gondel
    x0, x1 = xp - 0.4, xp + 2.95      # Schacht in der Gondel (Öffnung in build_nacelle)
    zb = NG[1] - nac_r(xp) * 0.92
    open_box('Hauptbeinschacht', x0, x1, y - 0.42, y + 0.42, zb + 0.06, zb + 0.78, M['schacht'], '-z', C_GEAR)
    for k, sg in enumerate((1, -1)):
        tg = 'fwhk_%s%d' % ('l' if s > 0 else 'r', k)
        with Gruppe(tg):
            box('Schachtklappe', x1 - x0 - 0.06, 0.04, 0.48, (x0 + x1) / 2, y + sg * 0.44, zb - 0.24, M['anth'], 0.01)
        gelenk(tg, ((x0 + x1) / 2, y + sg * 0.44, zb), 'X', -sg * math.radians(85), 'fw', 0.72, 1.0)
    ANCH['fuss_h%d' % s] = Vector((A.x, y, 0))

# =====================================================================================
# 6. Rampe: schwenkt hinunter, Verlängerung fährt aus (wie beim Kormoran)
# =====================================================================================
RAMP_L1, RAMP_L2 = 2.78, 2.35        # Länge der Rampe und der Verlängerung
RAMP_WINKEL = -math.radians(90 + 28.5)      # von senkrecht nach hinten unten, bis die Spitze den Boden berührt
def ramp():
    hw, z0, z1 = RAMP; xh = XE + 0.02
    with Gruppe('rampe'):
        with Part('Rampe', T(0, 0, 0), C_PART):
            # gebaut geschlossen: senkrecht in der Öffnung, Außenseite nach hinten (−X), Innenseite = Lauffläche
            box('Rampenblatt', 0.12, 2 * hw - 0.06, RAMP_L1, xh + 0.06, 0, z0 + RAMP_L1 / 2, M['anth'], 0.02)
            box('Rampenhaut', 0.01, 2 * hw - 0.2, RAMP_L1 - 0.2, xh - 0.005, 0, z0 + RAMP_L1 / 2, M['hell'], 0.004)
            for k in range(11):      # Trittleisten innen
                box('Trittleiste', 0.03, 2 * hw - 0.5, 0.05, xh + 0.135, 0, z0 + 0.22 + k * 0.24, M['mittel'], 0.006)
            for s in (1, -1):
                box('Rampenwange', 0.2, 0.08, RAMP_L1, xh + 0.13, s * (hw - 0.08), z0 + RAMP_L1 / 2, M['gelb'], 0.01)
                box('Warnband', 0.012, 0.3, RAMP_L1 - 0.3, xh + 0.125, s * (hw - 0.3), z0 + RAMP_L1 / 2, M['warnrw'], 0.002)
            box('Rampenlicht', 0.03, 2 * hw - 0.6, 0.03, xh + 0.15, 0, z0 + RAMP_L1 - 0.12, M['landelicht'], 0.004)
    gelenk('rampe', (xh, 0, z0), 'Y', RAMP_WINKEL, 'rampe', 0.1, 0.72)
    with Gruppe('rampe2'):
        with Part('Rampenverlaengerung', T(0, 0, 0), C_PART):
            box('Verlaengerung', 0.08, 2 * hw - 0.3, RAMP_L2, xh + 0.06, 0, z0 + RAMP_L1 - RAMP_L2 / 2 - 0.05, M['mittel'], 0.012)
            for k in range(9): box('Trittleiste', 0.03, 2 * hw - 0.6, 0.04, xh + 0.115, 0, z0 + RAMP_L1 - RAMP_L2 + 0.15 + k * 0.24, M['mittel'], 0.005)
            box('Rampenkante', 0.1, 2 * hw - 0.3, 0.06, xh + 0.06, 0, z0 + RAMP_L1 - 0.06, M['gelb'], 0.008)
    # Gleitweg in Rampenrichtung (gebaut eingefahren: die Verlängerung liegt in der Rampe)
    gelenk('rampe2', (0, 0, 0), None, 0.0, 'rampe', 0.66, 0.96, slide=(0, 0, RAMP_L2 - 0.1))
    for s in (1, -1):      # Hydraulik: von der Laibung zur Rampe (gebaut eingefahren)
        rod('Rampenzylinder', Vector((xh + 0.35, s * (hw + 0.1), z0 + 1.6)), Vector((xh + 0.35, s * (hw + 0.1), z0 + 0.6)), 0.05, M['mittel'], 12)

# =====================================================================================
# 6b. Form: Rückengrat, Seitenwülste am Laderaum, Panzerplatten, Bullaugen der Kabine
# =====================================================================================
def spine():
    """Rückengrat vom Cockpit bis zwischen die Leitwerke: flache Haube mit Kühlgittern, Scanner, Antennen; bricht die Rohrform"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); XS = [8.6 - (8.6 + 13.8) * i / 90 for i in range(91)]; NA = 24; R = []
    for x in XS:
        zt = params(x)[1]; e0 = min(1.0, (8.6 - x) / 1.6); e1 = min(1.0, (x + 13.8) / 1.2); f = ease(min(e0, e1))
        w = 0.62 * f + 0.05; h = 0.34 * f + 0.01; row = []
        for a in range(NA + 1):
            ph = PI * a / NA; c, sn = math.cos(ph), math.sin(ph)
            y = w * math.copysign(abs(c) ** 0.55, c); z = zt - 0.04 + h * abs(sn) ** 0.45
            row.append(bm.verts.new((x, y, z)))
        R.append(row)
    for i in range(len(XS) - 1):
        for a in range(NA):
            f = bm.faces.new((R[i][a], R[i][a + 1], R[i + 1][a + 1], R[i + 1][a])); f.material_index = HELL
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, lp.vert.co.y * 1.6)
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Rueckengrat', bm, HULL_MATS, True, C_HULL)
    for x in (6.0, 2.0, -2.0, -6.4, -10.6): box('Gratfuge', 0.03, 1.3, 0.4, x, 0, params(x)[1] + 0.12, M['fuge'], 0.004)
    for k in range(10):      # Kühlgitter oben auf dem Grat über der Technik
        x = -0.6 - k * 0.3; z = params(x)[1] + 0.29
        box('Kuehlschlitz', 0.14, 0.78, 0.03, x, 0, z, M['dunkel'], 0.008)
def sponson(s):
    """Seitenwulst unten am Laderaum (Ausrüstung, Tanks); geht hinten in den Flügel über"""
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); XS = [-0.4 - (-0.4 + 14.2) * i / 70 for i in range(71)]; NA = 32; R = []
    for x in XS:
        e0 = min(1.0, (-0.4 - x) / 2.2); e1 = min(1.0, (x + 14.2) / 0.9); f = ease(min(e0, e1))
        W = params(x)[0]; yc = s * (W - 0.15); zc = 2.55; hw = 0.55 * f + 0.02; hh = 0.62 * f + 0.02; row = []
        for a in range(NA):
            ph = 2 * PI * a / NA; row.append(bm.verts.new((x, yc + s * hw * se(math.cos(ph), 3.4), zc + hh * se(math.sin(ph), 3.4))))
        R.append(row)
    for i in range(len(XS) - 1):
        for a in range(NA):
            q4 = (R[i][a], R[i][(a + 1) % NA], R[i + 1][(a + 1) % NA], R[i + 1][a]); c = sum((v.co for v in q4), Vector()) / 4
            if abs(c.y) < abs(hull_point(c.x, t_for_z(c.x, c.z)).y) - 0.03: continue      # liegt im Rumpf: innen unsichtbar lassen (ragte in den Laderaum)
            f = bm.faces.new(q4)
            ang = 2 * PI * (a + 0.5) / NA; f.material_index = DUNKEL if math.sin(ang) < 0.2 else HELL
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, lp.vert.co.z * 1.4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.normal_update()
    mesh_obj('Seitenwulst ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_HULL)
    for x in (-3.4, -6.6, -9.8, -12.4):      # Wartungsklappen mit Griffmulde
        W = params(x)[0]; y = s * (W + 0.38)
        box('Wulstklappe', 1.4, 0.03, 0.62, x, y, 2.62, M['anth'], 0.02); box('Griffmulde', 0.18, 0.02, 0.06, x + 0.5, y + s * 0.012, 2.8, M['dunkel'], 0.01)
def armor():
    """aufgesetzte Panzerplatten mit runden Ecken (folgen der Rumpfseite), dazu Rahmen; symmetrisch, ruhig"""
    plates = [(-13.6, -9.3, 3.15, 5.55, 'hell'), (-9.0, -4.6, 3.15, 5.55, 'hell'), (-4.3, -1.9, 3.2, 5.45, 'hell'),
              (1.6, 7.6, 3.2, 3.82, 'anth'), (1.6, 3.12, 3.95, 4.72, 'hell'), (4.52, 4.83, 3.95, 4.72, 'hell'), (6.23, 7.6, 3.95, 4.72, 'hell'),
              (-13.6, -1.9, 2.18, 2.98, 'anth')]
    for s in (1, -1):
        for x0, x1, z0, z1, m in plates:
            ob = side_patch('Panzerplatte', x0, x1, z0, z1, 0.22, s, 0.03, M[m], 10, 18)
            so = ob.modifiers.new('Dicke', 'SOLIDIFY'); so.thickness = 0.035; so.offset = -1.0
            bv = ob.modifiers.new('Fase', 'BEVEL'); bv.width = 0.012; bv.segments = 2; bv.limit_method = 'ANGLE'
            side_frame('Plattenfuge', x0 - 0.03, x1 + 0.03, z0 - 0.03, z1 + 0.03, 0.25, s, 0.018, 0.012, M['fuge'])
def cabin_windows():
    """Bullaugen an beiden Seiten des Halses (Kabine links, Kombüse rechts), runde Ecken, dicke Rahmen"""
    for s in (1, -1):
        for a, b in KAB_FENSTER:
            ob = side_patch('Bullaugenglas', a, b, KAB_Z[0], KAB_Z[1], KAB_R, s, 0.006, M['kanzel'], 6, 10)
            side_frame('Bullaugenrahmen', a, b, KAB_Z[0], KAB_Z[1], KAB_R, s, 0.07, 0.04, M['anth'])

# =====================================================================================
# 7. Aufbauten und Kleinteile: Scannerkuppel (Erkunder), Antennen, Dachluke, Lichter, Kühlgitter, Kiel
# =====================================================================================
def details():
    CUR[0] = C_PART
    zt = params(2.0)[1] + 0.33
    with Part('Scanner', T(1.4, 0, zt - 0.05), C_PART):
        cyl('Scannersockel', 0.62, 0.22, 0, 0, 0.1, M['anth'], 'Z', n=48, bev=0.02)
        sphere('Scannerkuppel', 0.55, 0, 0, 0.22, M['rauchglas'], 40)
        ring('Scannerring', 0.6, 0.03, (0, 0, 0.23), (0, 0, 1), M['mittel'], 48)
        for k in range(8): cyl('Scannerschraube', 0.015, 0.01, 0.56 * math.cos(2 * PI * k / 8), 0.56 * math.sin(2 * PI * k / 8), 0.215, M['schraube'], 'Z', n=6)
    ANCH['scanner'] = Vector((1.4, 0, zt + 0.4))
    for x, h in ((-3.5, 1.2), (-4.3, 0.75)):
        zt2 = params(x)[1] + 0.3; rod('Antenne', Vector((x, 0.28, zt2 - 0.02)), Vector((x - 0.25, 0.28, zt2 + h)), 0.018, M['dunkel'], 8)
        sphere('Antennenspitze', 0.03, x - 0.25, 0.28, zt2 + h, M['blitz' if h > 1 else 'mittel'], 8)
    # Dachluke über dem Gang
    zl = top_z(4.6, -1.0)
    with Part('Dachluke', T(4.6, -1.0, zl - 0.01), C_PART):
        cyl('Lukenring', 0.42, 0.08, 0, 0, 0.03, M['anth'], 'Z', n=40, bev=0.015); cyl('Lukendeckel', 0.36, 0.06, 0, 0, 0.08, M['hell'], 'Z', n=40, bev=0.02)
        rod('Lukengriff', Vector((-0.12, 0, 0.13)), Vector((0.12, 0, 0.13)), 0.015, M['gelb'], 8)
    # Kiel unter dem Laderaum, Zurrösen, Abläufe
    for s in (1, -1):
        for x in (-4.0, -8.0, -12.0): ring('Zurroese', 0.06, 0.015, (x, s * 2.4, bot_z(x, s * 2.4) - 0.02), (0, s, 0), M['mittel'], 12)
    # Lichter: Positionslichter an den Flügelspitzen, weißes Hecklicht, Landescheinwerfer unter der Nase, Formationsleisten
    sphere('Hecklicht', 0.06, XE - 0.02, 0, 6.05, M['blitz'], 10)
    for s in (1, -1):
        x = 11.6; p = hull_point(x, s * 2.55)
        with Part('Landescheinwerfer', Matrix.Translation(p), C_PART):
            cyl('Scheinwerfergehaeuse', 0.13, 0.08, 0, 0, 0.0, M['anth'], 'Z', n=24); cyl('Scheinwerferglas', 0.1, 0.02, 0, 0, -0.045, M['landelicht'], 'Z', n=24)
        hull_band('Formationsleiste', [(x0, s * 1.86) for x0 in (5.0, 5.6, 6.2, 6.8, 7.4)], 0.025, 0.008, M['formlicht'])
        hull_band('Formationsleiste', [(x0, s * 1.86) for x0 in (-6.0, -6.8, -7.6, -8.4, -9.2, -10.0)], 0.025, 0.008, M['formlicht'])
    # Hauptfugen als Wülste am Rumpf
    for x in (9.2, 4.0, -1.6, -6.6, -11.4):
        hull_band('Spantfuge', [(x, -PI + 2 * PI * i / 160) for i in range(161)], 0.035, 0.012, M['fuge'], False)
def label_on(x, t, size, text_, m='txtd'):
    p = hull_point(x, t); n = hull_normal(x, t)
    return surf_text(text_, size, p, n, (1, 0, 0), m)
def markings():
    for s in (1, -1):
        label_on(3.0, s * 1.55, 0.42, 'KRANICH', 'txtd')
        label_on(-9.0, s * 1.45, 0.62, 'KR 1', 'txtd')
        label_on(-1.0, s * 2.05, 0.11, 'BASTION · WERFT 3 · DECK 3', 'txtd')
        label_on(11.4, s * 1.75, 0.09, 'RETTUNG – GRIFF ZIEHEN', 'txtd')
    for s in (1, -1):      # Warnmarken an den Hubdüsen und am Einlauf
        p = Vector((HUBV[0] - HUBV[2] - 0.35, s * HUBV[1], bot_z(HUBV[0] - HUBV[2] - 0.35, s * HUBV[1]) - 0.01))
        surf_text('ABGASSTRAHL', 0.07, tuple(p), (0, 0, -1), (1, 0, 0), 'txtd')

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
    # Verlängerung hängt an der Rampe (dreht mit, gleitet in deren Richtung)
    if 'rampe2' in PIVOTS and 'rampe' in PIVOTS:
        e2 = PIVOTS['rampe2']; e1 = PIVOTS['rampe']; e2.parent = e1; e2.matrix_parent_inverse = Matrix.Translation(Vector(e1.location)).inverted()      # matrix_world ist hier noch nicht gerechnet
def zustand(fw=0.0, rampe=0.0):
    want = {'fw': fw, 'rampe': rampe}
    for g in GELENKE:
        e = PIVOTS[g['tag']]; p = want[g['grp']]; k = ease((p - g['t0']) / (g['t1'] - g['t0']))
        if g['slide']:
            e.location = Vector(g['slide']) * k      # Verlängerung: 0 eingefahren … 1 ausgefahren (in Rampenrichtung, Rahmen der Rampe)
        else:
            e.rotation_euler = (0, 0, 0); e.rotation_euler[{'X': 0, 'Y': 1, 'Z': 2}[g['axis']]] = g['angle'] * k
    bpy.context.view_layer.update()
ZUST = {}
def view(name, path, res=(1600, 900)):
    st = ZUST.get(name, {})
    zustand(st.get('fw', 0.0), st.get('rampe', 0.0))
    for o in bpy.data.objects:
        if o.name.startswith('Kanzelglas'): o.hide_render = name.startswith('cp_') or name.startswith('in_')
        if o.name.startswith('Aussen'): o.hide_render = name.startswith('in_')
    boden = bpy.data.objects.get('Boden grau'); bz = boden.location.z if boden else 0
    if boden and name == 'unten': boden.location.z = -60
    try: _view0(name, path, res)
    finally:
        if boden: boden.location.z = bz

def build():
    global BVH
    hull, rings, XS = build_hull()
    BVH = make_bvh([hull]); ring0 = [v.co.copy() for v in rings[0]]
    cut_openings(hull)
    mesh_obj('Rumpf', hull, HULL_MATS, True, C_HULL)
    tail_plate(ring0)
    glazing()
    for s in (1, -1):
        build_nacelle(s); nacelle_parts(s); build_wing(s); fin(s); front_leg(s); rear_leg(s)
    spine(); armor(); cabin_windows()
    for s in (1, -1): sponson(s)
    lift_thrusters(); rcs(); ramp(); details(); markings()
    for s in (1, -1): DUESEN['haupt'].append({'p': [round(v, 3) for v in ANCH['duese%d' % s]], 'd': [-1, 0, 0], 'r': round(nac_r(NX1), 3)})
    for nm in ('kra_innen.py', 'kra_cockpit.py'):
        p = os.path.join(HIER, nm)
        if os.path.exists(p): exec(compile(open(p, encoding='utf-8').read(), nm, 'exec'), globals())
    gelenke_anlegen()
    stages(); world('grau')
    for nm, loc, yaw in (('Figur Studio', (6.0, 5.4, 0), -2.3), ('Figur Pilot', (5.0, 4.6, 0), -1.9), ('Figur Techniker', (-19.0, -2.0, 0), 1.2)):
        if nm in bpy.data.objects: o = bpy.data.objects[nm]; o.location = loc; o.rotation_euler = (0, 0, yaw)
    for nm, loc, tgt, lens in (('Schraeg', (31, 25, 13), (0.0, 0, 3.4), 45), ('Hangar', (26, 19, 6.5), (0.0, 0.6, 3.4), 30), ('Heck', (-32, -21, 10), (-6.0, 0, 3.6), 40),
                               ('Cockpit', (13.6, 3.6, 7.2), (12.0, 0, 3.9), 26), ('Detail', (9.0, 9.0, 2.6), (6.0, 2.4, 2.3), 30), ('Weltraum', (30, -22, 12), (0.0, 0, 3.4), 45)):
        c = CAMS[nm]; c.location = loc; c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lens
    CAMS['Seite'].location = (0.2, 80, 3.4); CAMS['Front'].location = (80, 0, 3.4); CAMS['Front'].data.ortho_scale = 19; CAMS['Seite'].data.ortho_scale = 35
    CAMS['Draufsicht'].data.ortho_scale = 35; CAMS['Draufsicht'].location = (0.2, 0, 80)
    cam('Fahrwerk', (13.5, 5.6, 1.0), (9.6, 1.4, 1.2), 30); cam('Fahrwerk hinten', (-2.0, 10.0, 1.0), (-6.9, 6.0, 1.4), 32)
    cam('Rampe', (-26.0, -7.0, 4.0), (-14.0, 0, 3.0), 30); cam('Unten', (12.0, 13.0, -7.0), (-1.0, 0, 2.6), 38); cam('Antrieb', (-24.0, 12.0, 2.0), (-14.0, 6.0, 3.4), 30)
    cam('Steuerduesen', (15.5, 4.2, 4.9), (12.9, 2.0, 3.9), 30)
    global VIEWS
    V6 = {      # Kamera, Bühne, Fahrwerk sichtbar, Belichtung, Glut, Zustand
        'schraeg': ('Schraeg', 'grau', True, 0.0, 0.0, {}), 'draufsicht': ('Draufsicht', 'grau', True, 0.2, 0.0, {}), 'seite': ('Seite', 'grau', True, 0.9, 0.0, {}),
        'front': ('Front', 'grau', True, 0.7, 0.0, {}), 'heck': ('Heck', 'grau', True, 0.1, 0.0, {}), 'hangar': ('Hangar', 'hangar', True, 0.4, 0.0, {'rampe': 1.0}),
        'cockpit': ('Cockpit', 'grau', True, 0.3, 0.0, {}), 'detail': ('Detail', 'grau', True, 0.2, 0.0, {}),
        'weltraum': ('Weltraum', 'weltraum', True, 0.0, 6.0, {'fw': 1.0}), 'unten': ('Unten', 'grau', True, 0.6, 0.0, {}),
        'fahrwerk': ('Fahrwerk', 'grau', True, 0.3, 0.0, {}), 'fahrwerk2': ('Fahrwerk hinten', 'grau', True, 0.3, 0.0, {}),
        'rampe': ('Rampe', 'hangar', True, 0.6, 0.0, {'rampe': 1.0}), 'antrieb': ('Antrieb', 'grau', True, 0.3, 4.0, {}), 'steuerduesen': ('Steuerduesen', 'grau', True, 0.3, 0.0, {}),
        'halb': ('Schraeg', 'grau', True, 0.0, 0.0, {'fw': 0.55, 'rampe': 0.5}),
    }
    if 'IN_VIEWS' in globals(): V6.update(IN_VIEWS)
    VIEWS = {k: v[:5] for k, v in V6.items()}; ZUST.update({k: v[5] for k, v in V6.items()})
    anchors = {'duesen': DUESEN, 'kanone': list(ANCH['kanone1']), 'scanner': list(ANCH['scanner']), 'rampe_scharnier': list(ANCH['rampe_scharnier']),
               'fuesse': [list(ANCH[k]) for k in ('fuss_v1', 'fuss_v-1', 'fuss_h1', 'fuss_h-1')], 'gelenke': GELENKE,
               'umriss': [[round(x, 2), round(max(params(x)[0], 0.0), 3)] for x in [XT, 15.0, 14.0, 13.6, 11.5, 9.0, 6.0, 2.5, -1.0, -5.0, -11.0, -14.9, XE]]}
    anchors['masse'] = dict(FL=FL, FLC=FLC, RAMP=list(RAMP), RAMP_L1=RAMP_L1, RAMP_L2=RAMP_L2, X_LADE0=globals().get('X_LADE0', XE + 0.17))
    if 'auge' in ANCH: anchors['auge'] = list(ANCH['auge'])
    if 'griffe' in ANCH: anchors['griffe'] = ANCH['griffe']
    if 'raum' in ANCH: anchors['raum'] = ANCH['raum']
    open(os.path.join(HIER, 'kra-anker.json'), 'w').write(json.dumps(anchors, indent=1, default=lambda v: [round(c, 4) for c in v]))
    zustand(0, 0)
    return {'ringe': len(XS), 'gelenke': len(GELENKE)}
if not globals().get('NUR_HELFER_KRANICH'):
    result = build()
