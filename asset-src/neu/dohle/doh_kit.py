# Dohle (25.11.2026): eigener kleiner Frachter für Einsteiger, das Gegenstück zum Milan (Jäger).
# Wunsch des Nutzers: „Erstelle bitte noch einen zweiten Einsteigerflieger … frachtfreundlich. Auch genauso viel Mühe wie jetzt. Überleg dir
# was Schönes, einen kleinen Frachter, einsitzigen Frachter zum Einstieg.“ Eigener Entwurf, kein Vorbild aus einem anderen Spiel.
#
# Aufbau (Achsen wie Milan: +X nach vorn, +Y Backbord, +Z oben, Boden z = 0):
#  - Rumpf aus Superellipsen-Spanten: stumpfe Cockpitnase mit Rundumverglasung, kastenförmiges Frachtmodul, offenes Heck mit Rampe
#  - Cockpit hinter der Verglasung: Sitz, Pult mit Anzeigen, Deckenpult, Konsolen; Stufen hinunter in den Gang
#  - Einstiegstür links mit eingebauter Treppe (klappt nach unten bis auf den Boden), dahinter Vorraum und Gang nach vorn
#  - Laderaum (5,7 × 3,1 × 2,4 m) für Paletten und Normkisten, Heckrampe bis zum Boden, Zurrschienen, Leuchten, Netz, Warnmarken
#  - zwei Triebwerksgondeln oben an Pylonen (Einlauf mit Lüfterrad, Schubdüse mit Klappen), Leitflossen, Seitenleitwerk
#  - zwei Hubdüsen unter dem Rumpf, Ladescheinwerfer über der Heckluke, Dachluke mit Handläufen
#  - Fahrwerk: Bugbein mit Zwillingsrädern (fährt nach hinten ein), Hauptbeine mit Zwillingsrädern in seitlichen Fahrwerkswülsten
# Bewegliche Teile hängen an Gelenken (Gruppen fw, rampe, tuer); mil_kit.py liefert Werkzeuge, Rad, Federbein, Gelenkverwaltung.
# Aufruf ohne Fenster: blender.exe -b --python doh_lauf.py -- <ansichten> | alle | bauplan
import bpy, bmesh, math, random, os, json
from mathutils import Vector, Matrix
NUR_HELFER_MILAN = True
_mk = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'milan', 'mil_kit.py')
exec(compile(open(_mk, encoding='utf-8').read(), 'mil_kit.py', 'exec'))
HIER = os.path.dirname(bpy.data.filepath)
ANCH = {}; GELENKE.clear(); GRUPPEN.clear(); PIVOTS.clear()

# =====================================================================================
# Materialien: Sandweiß oben, Schiefer unten, Ocker für Warnmarken und Kanten, dunkle Nase
# =====================================================================================
M['d_weiss'] = panel_mat('Rumpf Sandweiss', (0.27, 0.262, 0.243), 0.2, 0.46, 0.9, brick=(1.5, 0.82), mortar=0.008)
M['d_schiefer'] = panel_mat('Rumpf Schiefer', (0.042, 0.045, 0.05), 0.45, 0.42, 0.7, brick=(1.5, 0.82), mortar=0.008)
M['d_nase'] = panel_mat('Rumpf Nase', (0.022, 0.023, 0.025), 0.3, 0.45, 0.5, rivets=False)
M['d_ocker'] = panel_mat('Rumpf Ocker', (0.34, 0.19, 0.028), 0.25, 0.45, 1.0, brick=(1.5, 0.82), rivets=False)
M['weiss2'] = hull_mat('Lack Sandweiss', (0.25, 0.243, 0.226), 0.2, 0.46, 0.9)
M['ocker'] = hull_mat('Lack Ocker', (0.34, 0.19, 0.028), 0.25, 0.45, 1.0)
M['gangwand'] = mk('Gangwand', (0.11, 0.115, 0.12), 0.25, 0.5, var=0.1, scale=3.0, bump=0.2, wear=0.4)
M['boden2'] = mk('Ladeboden', (0.05, 0.052, 0.056), 0.6, 0.45, var=0.15, scale=4.0, bump=0.4, bscale=200, wear=0.9)
HULL_MATS = ['d_weiss', 'd_schiefer', 'd_nase', 'd_ocker']
WEISS, SCHIEFER, NASE, OCKER = 0, 1, 2, 3

# =====================================================================================
# 1. Rumpf: stumpfe Nase, Cockpitkanzel, Übergang, kastenförmiges Frachtmodul, offenes Heck
# =====================================================================================
XN, XT, ZTIP = 8.0, 9.35, 2.55
XR, XE = -6.0, -6.4
TBL = [  # x, halbe Breite, Oberkante, Unterkante, Exponent
    (-6.0, 1.82, 4.25, 1.33, 4.4), (-4.0, 1.86, 4.3, 1.3, 4.6), (-0.6, 1.86, 4.3, 1.3, 4.6), (1.8, 1.78, 4.2, 1.33, 4.3), (3.4, 1.55, 3.95, 1.42, 3.6),
    (4.6, 1.36, 3.7, 1.52, 3.0), (5.8, 1.28, 3.6, 1.58, 2.7), (7.0, 1.2, 3.48, 1.62, 2.5), (8.0, 1.06, 3.32, 1.7, 2.3)]
_F = [pchip([r[0] for r in TBL], [r[k] for r in TBL], 0.0, 0.0) for k in range(1, 5)]
def base(x): return tuple(f(x) for f in _F)
def params(x):
    if x > XN:      # stumpfe Nase: Breite und Höhe laufen rund zu (Blick nach vorn unten durch die Verglasung)
        e = min(1.0, (x - XN) / (XT - XN)); W0, zt0, zb0, n0 = base(XN)
        fw = max(0.0, 1 - e ** 2.2) ** 0.5; ft = max(0.0, 1 - e ** 1.8) ** 0.55; fb = max(0.0, 1 - e ** 2.6) ** 0.5
        return W0 * fw, ZTIP + (zt0 - ZTIP) * ft, ZTIP - (ZTIP - zb0) * fb, n0 + (2.1 - n0) * e
    if x < XR:
        e = min(1.0, (XR - x) / (XR - XE)); g = 1 - 0.03 * e * e
        W0, zt0, zb0, n0 = base(XR); zc0 = zb0 + 0.48 * (zt0 - zb0)
        return W0 * g, zc0 + (zt0 - zc0) * g, zc0 - (zc0 - zb0) * g, n0
    return base(x)
def x_samples():
    xs = [XE + (XR - XE) * k / 4 for k in range(4)]; x = XR
    while x < XN - 1e-6: xs.append(x); x += 0.1
    for k in range(36): xs.append(XN + (XT - XN) * math.sin(k / 36 * PI / 2))
    return sorted(set(round(v, 4) for v in xs))
SEAM_X = [7.2, 5.3, 3.4, 1.8, -0.6, -2.6, -4.6]
GX, GH, GT = 7.62, 1.28, 1.26      # Verglasung: Mitte und halbe Länge in x, halbe Weite als Winkel
def glas_r(x, t): tt = ((t + PI) % (2 * PI)) - PI; return math.sqrt(((x - GX) / GH) ** 2 + (tt / GT) ** 2)
def build_hull():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); XS = x_samples(); rings = []
    for x in XS: rings.append([bm.verts.new(hull_point(x, 2 * PI * k / NRING)) for k in range(NRING)])
    tip = bm.verts.new((XT, 0, ZTIP)); faces = []
    for i in range(len(XS) - 1):
        for k in range(NRING):
            k2 = (k + 1) % NRING; f = bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2])); faces.append((f, i, k))
    for k in range(NRING): bm.faces.new((rings[-1][k], tip, rings[-1][(k + 1) % NRING])).material_index = NASE
    for f, i, k in faces:
        xm = (XS[i] + XS[i + 1]) / 2
        if xm > 8.85: f.material_index = NASE
        elif 30 <= k < 66: f.material_index = SCHIEFER
        elif k in (28, 29, 66, 67) and xm < 4.0: f.material_index = OCKER      # Ockerband längs der Seite am Frachtmodul
        else: f.material_index = WEISS
    vk = {}
    for i, r in enumerate(rings):
        for k, v in enumerate(r): vk[v] = (XS[i], k)
    for f, i, k in faces:
        ks = [vk[lp.vert][1] for lp in f.loops]; wrap = max(ks) - min(ks) > NRING // 2
        for lp in f.loops:
            x, kv = vk[lp.vert]
            if wrap and kv < NRING // 2: kv += NRING
            lp[uvl].uv = (x, 2 * PI * kv / NRING * 1.8)
    bm.normal_update()
    return bm, rings, XS
_tf = lambda p, x: math.atan2(p.y, p.z - zc_of(x)) % (2 * PI)
NB = (6.85, 4.4, 0.3)                       # Bugradschacht: x vorn, x hinten, halbe Breite
DOOR = (0.62, 1.58, 1.62, 3.55)             # Tür links: x hinten, x vorn, z unten, z oben
HOLD = (XE + 0.02, -0.6, 1.53, 1.5, 3.97)   # Laderaum innen: x hinten, x vorn, halbe Breite, Boden, Decke
def cut_openings(bm):
    dead = []
    for f in bm.faces:
        c = f.calc_center_median()
        if c.x > 6.2 and c.z > zc_of(c.x) - 0.3 and glas_r(c.x, _tf(c, c.x)) < 0.94: dead.append(f); continue
        if NB[1] < c.x < NB[0] and abs(c.y) < NB[2] and c.z < zc_of(c.x): dead.append(f); continue
        if DOOR[0] < c.x < DOOR[1] and DOOR[2] < c.z < DOOR[3] and c.y > 0.5: dead.append(f); continue
    bmesh.ops.delete(bm, geom=dead, context='FACES')

# =====================================================================================
# 2. Verglasung und Cockpit
# =====================================================================================
def glazing():
    CUR[0] = C_PART; bm = bmesh.new(); J, NA = 18, 96; rings_ = []
    ctr = bm.verts.new(hull_point(GX, 0.0) + hull_normal(GX, 0.0) * 0.012)
    for j in range(1, J + 1):
        r = 0.94 * j / J; row = []
        for a in range(NA):
            ph = 2 * PI * a / NA; x = GX + GH * r * math.cos(ph); t = GT * r * math.sin(ph)
            row.append(bm.verts.new(hull_point(x, t) + hull_normal(x, t) * 0.012))
        rings_.append(row)
    for a in range(NA): bm.faces.new((ctr, rings_[0][a], rings_[0][(a + 1) % NA]))
    for j in range(J - 1):
        for a in range(NA): bm.faces.new((rings_[j][a], rings_[j + 1][a], rings_[j + 1][(a + 1) % NA], rings_[j][(a + 1) % NA]))
    bm.normal_update()
    if sum(f.normal.dot(f.calc_center_median() - Vector((f.calc_center_median().x, 0, zc_of(f.calc_center_median().x)))) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Kanzelglas', bm, ['glas2'])
    # Rahmen: Rand, Mittelpfosten, zwei Seitenpfosten, Querspant; Scheibenwischer vorn
    hull_band('Fensterrahmen', [(GX + GH * 0.955 * math.cos(p), GT * 0.955 * math.sin(p)) for p in [2 * PI * i / 180 for i in range(180)]], 0.065, 0.025, M['gun'], True)
    hull_band('Mittelpfosten', [(GX - GH * 0.92 + i * (2 * GH * 0.92) / 40, 0.0) for i in range(41)], 0.035, 0.025, M['gun'])
    for tt in (0.66, -0.66):
        xa = GX - GH * 0.92 * math.sqrt(max(0.0, 1 - (tt / (GT * 0.92)) ** 2)); xb = GX + GH * 0.92 * math.sqrt(max(0.0, 1 - (tt / (GT * 0.92)) ** 2))
        hull_band('Seitenpfosten', [(xa + (xb - xa) * i / 30, tt) for i in range(31)], 0.032, 0.025, M['gun'])
    for xr in (7.0, 8.25):
        tb = GT * 0.92 * math.sqrt(max(0.0, 1 - ((xr - GX) / (GH * 0.92)) ** 2))
        hull_band('Querspant', [(xr, -tb + 2 * tb * i / 40) for i in range(41)], 0.03, 0.025, M['gun'])
    for s in (1, -1):
        p = hull_point(8.55, s * 0.33); n = hull_normal(8.55, s * 0.33)
        with Part('Wischer', place(8.55, s * 0.33, 0.03), C_PART):
            box('Wischerarm', 0.5, 0.02, 0.012, -0.22, 0, 0.01, M['dunkel'], 0.003); box('Wischerblatt', 0.42, 0.012, 0.02, -0.24, s * 0.02, 0.0, M['rubber'], 0.003)
    ANCH['kanzel'] = hull_point(7.5, 0.7) + Vector((0, 0, 0.05))
FLC = 2.25
def cockpit():
    CUR[0] = C_ROOM; bm = bmesh.new(); R = []
    XSC = [5.95 + (8.75 - 5.95) * i / 24 for i in range(25)]
    for x in XSC:
        W = params(x)[0]; yi = W - 0.07; zt = top_z(x, yi * 0.9) - 0.05
        side = [Vector((x, yi * 0.9, zt)), Vector((x, yi, zc_of(x))), Vector((x, yi * 0.92, FLC + 0.25)), Vector((x, yi * 0.75, FLC))]
        R.append(side + [Vector((p.x, -p.y, p.z)) for p in reversed(side)])
    V = [[bm.verts.new(p) for p in r] for r in R]
    for i in range(len(V) - 1):
        for k in range(len(V[0]) - 1): bm.faces.new((V[i][k], V[i][k + 1], V[i + 1][k + 1], V[i + 1][k]))
    bm.faces.new(V[-1][::-1]); bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Cockpitwanne', bm, ['innen3'], True, C_ROOM)
    # Rückwand mit Durchgang zum Gang
    wr = params(5.95)[0] * 0.78 - 0.42      # Rückwand mit Durchgang (bleibt innerhalb der Wanne)
    for s in (1, -1): box('Rueckwand', 0.06, wr, 1.05, 5.97, s * (0.42 + wr / 2), FLC + 0.52, M['gangwand'], 0.01)
    box('Durchgangssturz', 0.06, 0.84, 0.18, 5.97, 0, FLC + 1.0, M['gangwand'], 0.01)
    xs = 6.75
    with Part('Pilotensitz', T(xs, 0, FLC) @ RY(math.radians(-10)), C_ROOM):
        cyl('Sitzsaeule', 0.08, 0.3, 0.05, 0, 0.15, M['mittel'], 'Z', n=16); box('Sitzwanne', 0.52, 0.5, 0.12, 0.08, 0, 0.36, M['dunkel'], 0.02)
        box('Sitzpolster', 0.5, 0.48, 0.1, 0.09, 0, 0.45, M['sitz'], 0.03); box('Lehne', 0.12, 0.5, 0.75, -0.16, 0, 0.86, M['sitz'], 0.04)
        box('Kopfstuetze', 0.12, 0.3, 0.2, -0.17, 0, 1.33, M['sitz'], 0.03)
        for s in (1, -1):
            box('Armlehne', 0.4, 0.07, 0.06, 0.05, s * 0.29, 0.62, M['dunkel'], 0.015); box('Gurt', 0.012, 0.05, 0.6, -0.09, s * 0.12, 0.8, M['gurt'], 0.002)
    xp = 7.85
    prism('Pult', [(xp + 0.25, FLC), (xp + 0.55, FLC), (xp + 0.55, FLC + 0.62), (xp + 0.15, FLC + 0.86), (xp, FLC + 0.8)], -0.8, 0.8, M['verkleidung'], 'Y', 0.02)
    for y, mm in ((0.45, 'mfd2'), (0.15, 'mfd'), (-0.15, 'mfd'), (-0.45, 'mfd2')):
        with Part('Anzeige', T(xp + 0.05, y, FLC + 0.77) @ RY(math.radians(-58)), C_ROOM):
            box('Rahmen', 0.22, 0.27, 0.025, 0, 0, 0, M['dunkel'], 0.006); box('Bild', 0.18, 0.23, 0.004, 0, 0, 0.014, M[mm], 0)
    for k in range(10): box('Pulttaste', 0.05, 0.05, 0.015, xp + 0.3 + (k % 2) * 0.08, -0.36 + (k // 2) * 0.18, FLC + 0.64, M['taste'] if k % 3 else M['e_white'], 0.004)
    with Part('Steuerhorn', T(7.45, 0, FLC + 0.62), C_ROOM):      # Doppelgriff wie ein kurzes Steuerhorn
        cyl('Saeule', 0.035, 0.62, 0.12, 0, -0.31, M['dunkel'], 'Z', n=12); cyl('Saeulenfuss', 0.08, 0.04, 0.12, 0, -0.6, M['rubber'], 'Z', n=16); box('Horn', 0.06, 0.4, 0.05, 0, 0, 0.06, M['dunkel'], 0.015)
        for s in (1, -1): box('Griff', 0.05, 0.05, 0.14, 0, s * 0.2, 0.12, M['rubber'], 0.015)
    for s in (1, -1):
        box('Seitenkonsole', 0.9, 0.22, 0.42, 6.95, s * 0.62, FLC + 0.21, M['verkleidung'], 0.02)
        for k in range(5): box('Schalter', 0.08, 0.05, 0.018, 6.6 + k * 0.17, s * 0.62, FLC + 0.43, M['taste'], 0.004)
    with Part('Schubhebel', T(6.95, -0.62, FLC + 0.43), C_ROOM):
        for k in range(2): cyl('Hebel', 0.014, 0.16, k * 0.06 - 0.03, 0, 0.08, M['mittel'], 'Z', n=10); box('Hebelgriff', 0.05, 0.04, 0.05, k * 0.06 - 0.03, 0, 0.17, M['dunkel'], 0.01)
    zt = top_z(6.5, 0) - 0.12
    box('Deckenpult', 0.7, 0.5, 0.06, 6.55, 0, zt, M['verkleidung'], 0.012)
    for k in range(8): box('Deckenschalter', 0.05, 0.04, 0.012, 6.3 + (k % 4) * 0.16, -0.12 + (k // 4) * 0.24, zt - 0.035, M['taste'], 0.003)
    area('Cockpitlicht', (6.8, 0, 3.35), (0, 0, 0), 0.7, 0.5, 50, (0.85, 0.9, 1.0))
    ANCH['sitz'] = Vector((xs, 0, FLC + 0.9))

# =====================================================================================
# 3. Einstieg: Tür mit Treppe, Vorraum und Gang nach vorn
# =====================================================================================
FLG = 1.62
def entry():
    x0, x1, z0, z1 = DOOR; xm = (x0 + x1) / 2
    CUR[0] = C_ROOM
    open_box('Vorraum', 0.45, 1.75, -0.65, params(1.1)[0] + 0.02, FLG, 3.75, M['gangwand'], '+y', C_ROOM)
    open_box('Gang', 1.72, 4.3, -0.62, 0.62, FLG, 3.6, M['gangwand'], '+x', C_ROOM)
    box('Gangboden', 2.6, 1.22, 0.02, 3.0, 0, FLG + 0.01, M['boden2'], 0.004); box('Vorraumboden', 1.28, 2.3, 0.02, 1.1, 0.5, FLG + 0.01, M['boden2'], 0.004)
    for k in range(3):      # Stufen hinauf ins Cockpit
        box('Stufe', 0.32, 1.0, 0.02, 4.45 + k * 0.33, 0, FLG + 0.21 * (k + 1), M['boden2'], 0.004); box('Stufenkante', 0.03, 1.0, 0.21, 4.3 + k * 0.33, 0, FLG + 0.21 * k + 0.105, M['warnrw'], 0.002)
        box('Stufenwange', 0.33, 0.04, 0.21 * (k + 1), 4.45 + k * 0.33, 0.52, FLG + 0.105 * (k + 1), M['gangwand'], 0.004); box('Stufenwange', 0.33, 0.04, 0.21 * (k + 1), 4.45 + k * 0.33, -0.52, FLG + 0.105 * (k + 1), M['gangwand'], 0.004)
    box('Gangleuchte', 2.2, 0.08, 0.012, 3.0, 0, 3.594, M['e_white'], 0)
    for k in range(4): box('Wandfeld', 0.5, 0.012, 1.1, 2.0 + k * 0.6, -0.614, 2.5, M['innen3'], 0.006)
    with Part('Spind', T(0.75, -0.45, FLG), C_ROOM):
        box('Spindkorpus', 0.5, 0.36, 1.9, 0, 0, 0.95, M['verkleidung'], 0.012); box('Spindtuer', 0.012, 0.32, 1.8, 0.256, 0, 0.95, M['innen3'], 0.003)
        for k in range(3): box('Lueftung', 0.004, 0.2, 0.012, 0.263, 0, 1.6 + k * 0.03, M['dunkel'], 0)
        text('ANZUG', 0.05, (0.264, 0.0, 1.3), (0, 1, 0), (0, 0, 1), M['txtw'], align='CENTER', name='Spindschrift')
    with Part('Feuerloescher', T(1.6, -0.55, FLG + 0.9), C_ROOM):
        cyl('Loescher', 0.06, 0.42, 0, 0, 0, M['rotlack'], 'Z', n=16); cyl('Loescherkopf', 0.025, 0.08, 0, 0, 0.25, M['dunkel'], 'Z', n=10)
    pipe('Handlauf', [Vector((1.8, 0.55, 2.6)), Vector((4.2, 0.55, 2.6)), Vector((5.2, 0.5, 3.25))], 0.018, M['chrom'], rad=0.2)
    area('Ganglicht', (2.6, 0, 3.4), (0, 0, 0), 2.0, 0.6, 40, (0.85, 0.9, 1.0))
    area('Vorraumlicht', (1.1, 0.6, 3.6), (0, 0, 0), 1.0, 1.0, 45, (1.0, 0.92, 0.82)); box('Vorraumleuchte', 0.6, 0.6, 0.012, 1.1, 0.6, 3.744, M['e_white'], 0)
    # Tür (beweglich, unten angeschlagen): Außenhaut, Rahmen innen, Treppe mit sechs Stufen (waagrecht, wenn die Tür offen ist), Handläufe
    t = t_for_z(xm, z0, 1); hp = hull_point(xm, t); h = z1 - z0
    OPEN = math.radians(-140)
    with Gruppe('tuer'):
        CUR[0] = C_PART
        side_patch2('Tuer', x0 + 0.01, x1 - 0.01, z0 + 0.01, z1 - 0.01, 1, M['weiss2'], 0.002, 10, 8, 0.05, C_PART)
        Wd = hull_point(xm, t_for_z(xm, (z0 + z1) / 2, 1)).y
        for k in range(6):
            s_ = 0.25 + k * (h - 0.4) / 5; p = Vector((xm, Wd - 0.1, z0 + s_))
            ob = box('Treppenstufe', x1 - x0 - 0.18, 0.26, 0.035, 0, 0, 0, M['boden2'], 0.005)
            ob.matrix_basis = T(*p) @ RX(-OPEN) @ T(0, 0.06, 0)
            ob2 = box('Stufenkante', x1 - x0 - 0.18, 0.03, 0.04, 0, 0, 0, M['warnrw'], 0.003); ob2.matrix_basis = T(*p) @ RX(-OPEN) @ T(0, 0.19, 0)
        for sx in (1, -1):
            box('Treppenwange', 0.05, 0.14, h - 0.1, xm + sx * ((x1 - x0) / 2 - 0.07), Wd - 0.11, z0 + h / 2, M['gun'], 0.006)
            pipe('Treppenhandlauf', [Vector((xm + sx * ((x1 - x0) / 2 - 0.05), Wd - 0.15, z0 + 0.15)), Vector((xm + sx * ((x1 - x0) / 2 - 0.05), Wd - 0.75, z0 + 0.45)), Vector((xm + sx * ((x1 - x0) / 2 - 0.05), Wd - 0.75, z0 + h - 0.2)), Vector((xm + sx * ((x1 - x0) / 2 - 0.05), Wd - 0.15, z0 + h - 0.1))], 0.016, M['warnrw'], rad=0.12)
        box('Tuergriff', 0.16, 0.03, 0.05, x1 - 0.18, Wd + 0.03, z0 + h * 0.62, M['chrom'], 0.006)
    gelenk('tuer', tuple(hp), 'X', OPEN, 'tuer', 0.0, 1.0)
    CUR[0] = C_PART
    side_frame('Tuerrahmen', x0 - 0.03, x1 + 0.03, z0 - 0.02, z1 + 0.03, 0.06, 1, 0.035, 0.02, M['ocker'])
    label_on(xm, t_for_z(xm, z1 + 0.14, 1), 'EINSTIEG', 0.06, 'txtd')
    with Part('Tuerlicht', place(x1 + 0.15, t_for_z(x1 + 0.15, z1 - 0.1, 1), 0.0), C_PART):
        box('Lampenfuss', 0.08, 0.06, 0.03, 0, 0, 0.0, M['gun'], 0.005); sphere('Lampe', 0.025, 0, 0, 0.025, M['e_amber'], 10)
    ANCH['tuer'] = hull_point(xm, t_for_z(xm, (z0 + z1) / 2, 1)) + Vector((0, 0.1, 0))

# =====================================================================================
# 4. Laderaum mit Heckrahmen und Rampe
# =====================================================================================
def hold():
    x0, x1, hw, z0, z1 = HOLD
    CUR[0] = C_PART
    open_box('Laderaum', x0, x1, -hw, hw, z0, z1, M['gangwand'], '-x', C_PART)
    box('Ladeboden', x1 - x0, 2 * hw - 0.02, 0.02, (x0 + x1) / 2, 0, z0 + 0.01, M['boden2'], 0.004)
    for y in (-0.36, 0.36):
        box('Zurrschiene', x1 - x0 - 0.05, 0.05, 0.02, (x0 + x1) / 2, y, z0 + 0.025, M['mittel'], 0.004)
        for k in range(7): ring('Zurrauge', 0.025, 0.006, (x0 + 0.3 + k * (x1 - x0 - 0.6) / 6, y, z0 + 0.05), (1, 0, 0), M['chrom'], 12)
    for s in (1, -1):
        for k in range(5):
            xx = x0 + 0.4 + k * (x1 - x0 - 0.8) / 4
            box('Spant', 0.08, 0.05, z1 - z0 - 0.04, xx, s * (hw - 0.03), (z0 + z1) / 2, M['mittel'], 0.006)
        box('Wandschiene', x1 - x0 - 0.1, 0.03, 0.04, (x0 + x1) / 2, s * (hw - 0.03), z0 + 1.25, M['mittel'], 0.004)
        box('Stossleiste', x1 - x0 - 0.1, 0.04, 0.25, (x0 + x1) / 2, s * (hw - 0.03), z0 + 0.16, M['ocker'], 0.006)
    for k in range(3): box('Deckenleuchte', 0.9, 0.12, 0.02, x0 + 0.9 + k * 1.85, 0, z1 - 0.012, M['e_white'], 0)
    for k in range(6): box('Netzstrang', 0.012, 2 * hw - 0.3, 0.01, x1 - 0.03, 0, z0 + 0.35 + k * 0.35, M['gurt'], 0)
    for k in range(7): box('Netzstrang', 0.012, 0.01, z1 - z0 - 0.4, x1 - 0.03, -hw + 0.3 + k * (2 * hw - 0.6) / 6, (z0 + z1) / 2, M['gurt'], 0)
    text('LADERAUM · MAX 2,5 T', 0.08, (x1 - 0.045, 0.75, z1 - 0.3), (0, -1, 0), (0, 0, 1), M['txto'], name='Laderaumschrift')
    area('Laderaumlicht', ((x0 + x1) / 2, 0, z1 - 0.3), (0, 0, 0), 4.0, 2.0, 120, (0.85, 0.9, 1.0))
    # Ladung (nur in Blender, Ansicht „fracht“): zwei Paletten und zwei Kisten
    CUR[0] = C_STU
    with Part('Ladung', T(0, 0, 0), C_STU):
        for (xx, yy, w, hh, m) in ((-1.4, 0.82, 1.2, 1.2, 'kiste'), (-2.7, 0.82, 1.2, 1.2, 'ocker'), (-1.4, -0.82, 1.2, 1.2, 'graphit')):
            box('Palettenfuss', 1.2, w, 0.14, xx, yy, z0 + 0.07, M['mittel'], 0.01); box('Palettenkiste', 1.15, w - 0.05, hh - 0.16, xx, yy, z0 + 0.14 + (hh - 0.16) / 2, M[m], 0.02)
            for sg in (1, -1): box('Spanngurt', 0.05, w + 0.01, 0.012, xx + sg * 0.3, yy, z0 + hh + 0.006, M['gurt'], 0.002)
        for xx in (-2.7,):
            box('Kiste', 1.2, 0.8, 0.8, xx, -1.0, z0 + 0.4, M['kiste'], 0.02); box('Kiste', 1.2, 0.8, 0.8, xx, -1.0, z0 + 1.2, M['kiste'], 0.02)
    STAGE['kiste'] = bpy.data.objects['Ladung']
    # Heckrahmen: zwischen Rumpfrand und Ladeöffnung (zwei Schleifen gleicher Länge, verbunden)
    CUR[0] = C_HULL; bm = bmesh.new(); N2 = 96; xr = XE
    oz0, oz1, ohw, orad = z0 + 0.02, z1, hw - 0.01, 0.18; zcen = (oz0 + oz1) / 2
    ring_pts = [hull_point(xr, 2 * PI * k / 600) for k in range(600)]
    def outer(ang): return min(ring_pts, key=lambda p: abs(((math.atan2(p.z - zcen, p.y) - ang + PI) % (2 * PI)) - PI))
    def inner(ang):
        hh = (oz1 - oz0) / 2; ca, sa = math.cos(ang), math.sin(ang)
        tm = min(ohw / abs(ca) if abs(ca) > 1e-6 else 1e9, hh / abs(sa) if abs(sa) > 1e-6 else 1e9); y, z = ca * tm, sa * tm
        cy, cz = math.copysign(ohw - orad, y), math.copysign(hh - orad, z)
        if abs(y) > ohw - orad and abs(z) > hh - orad: d = Vector((y - cy, z - cz)).normalized() * orad; y, z = cy + d.x, cz + d.y
        return Vector((xr, y, zcen + z))
    O = [bm.verts.new(outer(2 * PI * k / N2)) for k in range(N2)]; In = [bm.verts.new(inner(2 * PI * k / N2)) for k in range(N2)]
    for k in range(N2): bm.faces.new((O[k], O[(k + 1) % N2], In[(k + 1) % N2], In[k]))
    bm.normal_update()
    if sum(f.normal.x for f in bm.faces) > 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Heckrahmen', bm, ['graphit'], True, C_HULL)
    CUR[0] = C_PART
    for s in (1, -1):      # Warnmarken am Rahmen, Ladescheinwerfer oben, Rampenzylinder (fest am Rahmen, Kolben unsichtbar im Schacht)
        box('Rahmenwarnung', 0.02, 0.1, oz1 - oz0 - 0.4, xr - 0.012, s * (ohw + 0.08), zcen, M['warnrw'], 0.002)
        with Part('Ladescheinwerfer', T(xr - 0.05, s * 1.2, oz1 + 0.18), C_PART):
            box('Scheinwerfergehaeuse', 0.12, 0.22, 0.1, 0, 0, 0, M['gun'], 0.01); box('Scheinwerferglas', 0.01, 0.18, 0.07, -0.062, 0, 0, M['e_white'], 0)
    box('Rahmenwarnung oben', 0.02, 2 * ohw - 0.4, 0.1, xr - 0.012, 0, oz1 + 0.06, M['warnrw'], 0.002)
    # Rampe (beweglich, unten angeschlagen): Platte, Trittrillen innen, Seitenwangen, Rampenspitze, Außenhaut mit Ockerrand und Schrift
    xh = xr - 0.06; L = oz1 - oz0 + 0.02
    with Gruppe('rampe'):
        CUR[0] = C_PART
        out = rrect(-ohw - 0.04, ohw + 0.04, oz0 - 0.02, oz1 + 0.03, orad + 0.03, 6)
        prism('Rampenplatte', [(y, z) for y, z in out], xh - 0.05, xh + 0.05, M['graphit'], 'X', 0.01)
        for k in range(14): box('Trittrille', 0.025, 2 * ohw - 0.4, 0.025, xh + 0.06, 0, oz0 + 0.2 + k * (L - 0.4) / 13, M['dunkel'], 0.004)
        for s in (1, -1):
            box('Rampenwange', 0.14, 0.06, L - 0.05, xh + 0.1, s * (ohw - 0.05), (oz0 + oz1) / 2, M['gun'], 0.008)
            box('Rampenrand aussen', 0.012, 0.12, L - 0.1, xh - 0.056, s * (ohw - 0.08), (oz0 + oz1) / 2, M['ocker'], 0.002)
        box('Rampenspitze', 0.08, 2 * ohw, 0.06, xh + 0.03, 0, oz1 + 0.01, M['chrom'], 0.008)
        box('Rampenrand oben', 0.012, 2 * ohw - 0.3, 0.1, xh - 0.056, 0, oz1 - 0.12, M['ocker'], 0.002)
        CUR[0] = C_PART
        text('DOHLE', 0.28, (xh - 0.057, 0, zcen + 0.25), (0, -1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Rampenschrift')
        text('LADERAMPE · NICHT BETRETEN, WENN SIE SICH BEWEGT', 0.045, (xh - 0.057, 0, zcen - 0.1), (0, -1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Rampenschrift')
        for s in (1, -1): sphere('Rampenlicht', 0.03, xh - 0.06, s * (ohw - 0.2), oz0 + 0.18, M['e_amber'], 10)
    for s in (1, -1): cyl('Rampenscharnier', 0.04, 0.3, xh + 0.02, s * (ohw - 0.4), oz0 - 0.02, M['chrom'], 'Y', n=14)
    open_a = -(PI / 2 + math.asin(min(0.99, (oz0 - 0.02) / L)))
    gelenk('rampe', (xh, 0, oz0 - 0.02), 'Y', open_a, 'rampe', 0.0, 1.0)
    tip = Vector((xh + L * math.sin(open_a), 0, oz0 - 0.02 + L * math.cos(open_a)))
    ANCH['rampe_spitze'] = tip; ANCH['fracht'] = Vector((xh - 1.2, 0, oz0 + 0.8)); ANCH['laderaum'] = Vector(((x0 + x1) / 2, 0, z0 + 0.6))
    ANCH['raum'] = dict(boden=z0 + 0.02, hw=hw, x0=x1, tuer=xr, tip=list(tip))

# =====================================================================================
# 5. Triebwerksgondeln an Pylonen, Leitflossen, Seitenleitwerk, Hubdüsen
# =====================================================================================
NG = (2.95, 3.45)      # |y|, z der Gondelmitte
NX0, NX1 = -0.4, -6.7
_NR = pchip([-6.7, -6.35, -2.0, -0.85, -0.4], [0.5, 0.58, 0.6, 0.56, 0.5], 0.0, 0.0)
def build_nacelle(s):
    yc = s * NG[0]; zc = NG[1]; NA = 56; XS = [NX1 + (NX0 - NX1) * i / 44 for i in range(45)]
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); R = []
    for x in XS:
        r = _NR(x); R.append([bm.verts.new((x, yc + r * math.sin(2 * PI * a / NA), zc + r * math.cos(2 * PI * a / NA))) for a in range(NA)])
    for i in range(len(XS) - 1):
        for a in range(NA):
            a2 = (a + 1) % NA; q = (R[i][a], R[i][a2], R[i + 1][a2], R[i + 1][a]); f = bm.faces.new(q if s > 0 else q[::-1])
            ang = 2 * PI * (a + 0.5) / NA; xm = (XS[i] + XS[i + 1]) / 2
            f.material_index = OCKER if -1.25 < xm < -1.05 else (SCHIEFER if math.cos(ang) < -0.25 else WEISS)
            idx = ((i, a), (i, a + 1), (i + 1, a + 1), (i + 1, a)) if s > 0 else ((i + 1, a), (i + 1, a + 1), (i, a + 1), (i, a))
            for lp, (ii, aa) in zip(f.loops, idx): lp[uvl].uv = (XS[ii], 2 * PI * aa / NA * 0.6)
    bm.normal_update()
    return mesh_obj('Gondel ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_HULL)
def nacelle_parts(s):
    yc = s * NG[0]; zc = NG[1]
    with Part('Einlass', T(NX0, yc, zc), C_PART):
        ring('Einlasslippe', 0.5, 0.05, (0, 0, 0), (1, 0, 0), M['kante'], 56)
        bell('Einlasskanal', 0.47, 0.47, 0.6, 0.02, M['dunkel'], 40)
        cyl('Nabe', 0.16, 0.28, -0.42, 0, 0, M['weiss2'], 'X', n=24, r2=0.03); ring('Nabenring', 0.16, 0.012, (-0.56, 0, 0), (1, 0, 0), M['ocker'], 24)
        for k in range(14):
            ob = box('Schaufel', 0.1, 0.018, 0.3, 0, 0, 0, M['mittel'], 0.003); ob.matrix_basis = Matrix.Translation((-0.58, 0, 0)) @ RX(2 * PI * k / 14) @ Matrix.Translation((0, 0, 0.3)) @ RZ(0.5)
    with Part('Schubduese', T(NX1, yc, zc), C_PART):
        ring('Duesenring', 0.52, 0.03, (0, 0, 0), (1, 0, 0), M['gun'], 56)
        bell('Duesenglocke', 0.5, 0.42, 0.45, 0.0, M['duese'], 40)
        cyl('Glut', 0.42, 0.03, -0.25, 0, 0, M['glut'], 'X', n=36); cyl('Mittelkegel', 0.18, 0.5, -0.4, 0, 0, M['dunkel'], 'X', n=24, r2=0.03)
        for k in range(14):
            ob = box('Duesenklappe', 0.42, 0.2, 0.018, 0, 0, 0, M['duese'], 0.003); ob.matrix_basis = RX(2 * PI * k / 14) @ Matrix.Translation((-0.22, 0, 0.48)) @ RY(math.radians(-7))
        for k in range(3): ring('Kuehlring', _NR(NX1 + 0.3 + k * 0.15) + 0.01, 0.014, (0.3 + k * 0.15, 0, 0), (1, 0, 0), M['mittel'], 56)
    # Pylon: flaches Tropfenprofil von der oberen Modulseite zur Gondel
    bm = bmesh.new(); R = []; Ys = [1.6, 1.95, 2.3, 2.5]
    for i, y in enumerate(Ys):
        f = i / (len(Ys) - 1); ax = 1.9 - 0.3 * f; az = 0.1; cx = -3.3; cz = 3.75 + (zc - 3.75) * f
        R.append([bm.verts.new((cx + ax * math.cos(a), s * y, cz + az * math.sin(a) * (1 - 0.4 * max(0.0, -math.cos(a))))) for a in [2 * PI * k / 40 for k in range(40)]])
    for i in range(len(R) - 1):
        for k in range(40): q = (R[i][k], R[i][(k + 1) % 40], R[i + 1][(k + 1) % 40], R[i + 1][k]); bm.faces.new(q if s < 0 else q[::-1])
    mesh_obj('Pylon', bm, ['weiss2'], True, C_PART)
    # Leitflosse außen am Gondelende
    with Part('Leitflosse', T(-5.9, yc + s * 0.5, zc) @ RX(s * math.radians(-12)), C_PART):
        out = fillet([(0.7, 0.0), (0.1, 0.0), (-0.55, 0.62), (-0.85, 0.62), (-0.85, 0.0)], 0.12, 6)
        prism('Flosse', [(p[0], s * p[1]) for p in out], -0.03, 0.03, M['weiss2'], 'Z', 0.012)
        box('Flossenspitze', 0.3, 0.07, 0.07, -0.7, s * 0.6, 0, M['ocker'], 0.01)
    sphere('Positionslicht', 0.05, -1.0, yc + s * (_NR(-1.0) + 0.03), zc, M['nav_r' if s > 0 else 'nav_g'], 12)
    ANCH['duese%d' % s] = Vector((NX1 - 0.45, yc, zc)); ANCH['gondel%d' % s] = Vector((NX0 + 0.1, yc + s * 0.4, zc + 0.35))
    c = Vector((-0.9, yc + s * (_NR(-0.9) + 0.004), zc + 0.12))
    surf_text('GEFAHR ANSAUGUNG', 0.05, c, (0, s, 0), (0, 0, 1), 'txto', bpy.data.objects['Gondel ' + ('links' if s > 0 else 'rechts')])
    c = Vector((-3.6, yc + s * (_NR(-3.6) + 0.004), zc + 0.05))
    surf_text('DH 04', 0.24, c, (0, s, 0), (0, 0, 1), 'txtd', bpy.data.objects['Gondel ' + ('links' if s > 0 else 'rechts')])
def lift_fans():
    for x in (2.55, -0.05):
        z = bot_z(x, 0)
        with Part('Hubduese', T(x, 0, z - 0.002), C_PART):
            ring('Hubring', 0.52, 0.03, (0, 0, 0), (0, 0, 1), M['gun'], 48); cyl('Hubschacht', 0.5, 0.02, 0, 0, 0.012, M['dunkel'], 'Z', n=48)
            for k in range(9): box('Lamelle', 0.06, 0.96 * math.sqrt(max(0.0, 1 - ((k - 4) / 4.6) ** 2)), 0.012, (k - 4) * 0.11, 0, -0.004, M['mittel'], 0.002, rot=(0, math.radians(25), 0))
            cyl('Hubnabe', 0.08, 0.03, 0, 0, -0.005, M['ocker'], 'Z', n=16)

# =====================================================================================
# 6. Fahrwerk: Bugbein mit Zwillingsrädern, Hauptbeine in seitlichen Fahrwerkswülsten
# =====================================================================================
SP = (2.05, -1.45, -5.55, 0.42, 1.16, 2.78)      # Wulst: |y| Mitte, x vorn, x hinten, halbe Breite, unten, oben
_SW2 = pchip([-5.55, -5.25, -4.6, -2.4, -1.75, -1.45], [0.04, 0.3, 0.42, 0.42, 0.3, 0.04], 0.0, 0.0)
def sponson(s):
    yc = s * SP[0]; NA = 40; XS = [SP[2] + (SP[1] - SP[2]) * i / 40 for i in range(41)]
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); R = []
    for x in XS:
        w = _SW2(x); hz = (SP[5] - SP[4]) / 2 * min(1.0, w / 0.42) ** 0.6 + 0.02; zc = (SP[4] + SP[5]) / 2
        R.append([bm.verts.new((x, yc + w * math.copysign(abs(math.sin(2 * PI * a / NA)) ** 0.6, math.sin(2 * PI * a / NA)), zc + hz * math.copysign(abs(math.cos(2 * PI * a / NA)) ** 0.6, math.cos(2 * PI * a / NA)))) for a in range(NA)])
    faces = []
    for i in range(len(XS) - 1):
        for a in range(NA):
            q = (R[i][a], R[i][(a + 1) % NA], R[i + 1][(a + 1) % NA], R[i + 1][a]); f = bm.faces.new(q if s > 0 else q[::-1])
            f.material_index = SCHIEFER if math.cos(2 * PI * (a + 0.5) / NA) < 0.1 else WEISS
            idx = ((i, a), (i, a + 1), (i + 1, a + 1), (i + 1, a)) if s > 0 else ((i + 1, a), (i + 1, a + 1), (i, a + 1), (i, a))
            for lp, (ii, aa) in zip(f.loops, idx): lp[uvl].uv = (XS[ii], aa * 0.07)
    dead = [f for f in bm.faces if -4.35 < f.calc_center_median().x < -1.85 and abs(f.calc_center_median().y - yc) < 0.3 and f.calc_center_median().z < SP[4] + 0.25]
    bmesh.ops.delete(bm, geom=dead, context='FACES'); bm.normal_update()
    if sum(f.normal.dot(f.calc_center_median() - Vector((f.calc_center_median().x, yc, (SP[4] + SP[5]) / 2))) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Fahrwerkswulst ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_HULL)
def sp_bot(d):      # Unterkante des Wulsts bei seitlichem Abstand d von seiner Mitte (volle Breite)
    w = 0.42; zc = (SP[4] + SP[5]) / 2; hz = (SP[5] - SP[4]) / 2 + 0.02
    sn = min(1.0, abs(d) / w) ** (1 / 0.6); cs = math.sqrt(max(0.0, 1 - sn * sn)); return zc - hz * cs ** 0.6
def twin_wheels(name, A, rw, ww, gap):
    for sg in (1, -1): wheel(name, A + Vector((0, sg * (gap / 2 + ww / 2), 0)), (0, 1, 0), rw, ww)
    rod(name + ' Achse', A - Vector((0, gap / 2 + ww + 0.03, 0)), A + Vector((0, gap / 2 + ww + 0.03, 0)), 0.035, M['chrom'], 14)
def leg(name, P0, A, r, rw, ww, gap, tag_label):
    strut(name, P0, A, r)
    rod('Lagerachse', P0 - Vector((0, 0.22, 0)), P0 + Vector((0, 0.22, 0)), 0.055, M['chrom'], 20)
    for sg in (1, -1): rod('Lagerbock', P0 + Vector((0, sg * 0.18, 0)), P0 + Vector((0, sg * 0.24, 0)), 0.085, M['gun'], 20)
    bot = P0.lerp(A, 0.82); slab('Achsschwinge', (bot + A) / 2, (0, 0, 1), (1, 0, 0), ((bot - A).length + 0.1, 0.12, 0.12), M['gun'], 0.012)
    twin_wheels(name + 'rad', A, rw, ww, gap)
    fw = Vector((1, 0, 0)); t0 = P0.lerp(A, 0.55) + fw * 0.1; t1 = P0.lerp(A, 0.82) + fw * 0.1; kn = (t0 + t1) / 2 + fw * 0.17
    link_bar('Drehmomentlenker', t0, kn, 0.055, 0.028, (0, 1, 0), M['mittel']); link_bar('Drehmomentlenker', kn, t1, 0.055, 0.028, (0, 1, 0), M['mittel'])
    rod('Einziehzylinder', P0 + Vector((-0.35, 0.09, 0.1)), P0.lerp(A, 0.15) + Vector((-0.05, 0.09, 0)), 0.03, M['gun'], 14)
    pipe('Hydraulikleitung', [P0 + Vector((0.08, -0.08, 0.02)), P0.lerp(A, 0.3) + Vector((0.09, -0.09, 0)), P0.lerp(A, 0.55) + Vector((0.08, -0.09, 0))], 0.011, M['rubber'], rad=0.05)
    text(tag_label, 0.05, tuple(P0.lerp(A, 0.28) + Vector((r + 0.004, 0, 0))), (0, -1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Beinschrift')
def nose_gear():
    P0 = Vector((6.55, 0, 2.08)); A = Vector((6.66, 0, 0.29))
    with Gruppe('fwn'):
        with Part('Bugfahrwerk', T(0, 0, 0), C_GEAR):
            leg('Bug', P0, A, 0.075, 0.29, 0.16, 0.08, 'FW 1')
            with Part('Rollscheinwerfer', T(*(P0.lerp(A, 0.3) + Vector((0.09, 0, 0)))), C_GEAR):
                box('Lampenhalter', 0.05, 0.16, 0.04, 0, 0, 0, M['gun'], 0.006)
                for sg in (1, -1): rod('Scheinwerfer', (0, sg * 0.05, 0.0), (0.06, sg * 0.05, 0.0), 0.03, M['gun'], 16); cyl('Lampe', 0.024, 0.006, 0.062, sg * 0.05, 0, M['blitz'], 'X', n=14)
    gelenk('fwn', tuple(P0), 'Y', math.radians(92), 'fw', 0.05, 0.72)
    x0, x1, hw = NB[1], NB[0], NB[2]; CUR[0] = C_PART
    open_box('Bugradschacht', x0, x1, -hw, hw, 0, 2.4, M['schacht'], '-z', C_PART, floor=lambda x, y: bot_z(x, y) + 0.004)
    for k in range(5): box('Schachtrippe', 0.03, 2 * hw - 0.02, 0.05, x0 + 0.2 + k * (x1 - x0 - 0.4) / 4, 0, 2.37, M['mittel'], 0.004)
    for sg in (1, -1):
        tag = 'fwnk_' + ('l' if sg > 0 else 'r'); hy = sg * hw; xm = (x0 + x1) / 2; hz = bot_z(xm, hw)
        with Gruppe(tag):
            ob = hull_patch('Bugradklappe', x0 + 0.02, x1 - 0.02, 0.006 * sg, hw * sg, False, M['graphit'], 0.002, 10, 6, 0.022, C_GEAR)
            ob.matrix_world = T(xm, hy, hz) @ RX(sg * math.radians(88)) @ T(-xm, -hy, -hz)
        gelenk(tag, (xm, hy, hz), 'X', -sg * math.radians(88), 'fw', 0.72, 1.0)
    ANCH['bugrad'] = A
def main_gear(s):
    yc = s * SP[0]; P0 = Vector((-2.05, yc, 2.2)); A = Vector((-2.05, yc, 0.34))
    tag = 'fwh_' + ('l' if s > 0 else 'r')
    with Gruppe(tag):
        with Part('Hauptfahrwerk', T(0, 0, 0), C_GEAR):
            leg('Haupt', P0, A, 0.085, 0.34, 0.2, 0.06, 'FW %d' % (2 if s > 0 else 3))
            for sg in (1, -1): slab('Bremssattel', A + Vector((-0.2, sg * 0.25, 0.12)), (1, 0, 0), (0, 1, 0), (0.1, 0.04, 0.12), M['rotlack'], 0.01)
    gelenk(tag, tuple(P0), 'Y', math.radians(88), 'fw', 0.0, 0.7)
    CUR[0] = C_PART
    open_box('Wulstschacht', -4.35, -1.85, yc - 0.3, yc + 0.3, 0, 2.7, M['schacht'], '-z', C_PART, floor=lambda x, y: sp_bot(y - yc) + 0.01)
    for k in range(5): box('Schachtrippe', 0.03, 0.56, 0.05, -4.2 + k * 0.55, yc, 2.66, M['mittel'], 0.004)
    for sg in (1, -1):      # zwei Längsklappen, außen am Schacht angeschlagen; gebaut offen
        tagk = 'fwhk_' + ('l' if s > 0 else 'r') + ('a' if sg > 0 else 'i'); hy = yc + sg * 0.3; hz = sp_bot(0.3) + 0.005; xm = -3.1
        with Gruppe(tagk):
            ob = box('Wulstklappe', 2.46, 0.3, 0.025, 0, 0, 0, M['graphit'], 0.006)
            ob.matrix_world = T(xm, hy, hz) @ RX(sg * math.radians(88)) @ T(-xm, -hy, -hz) @ T(xm, yc + sg * 0.15, hz)
        gelenk(tagk, (xm, hy, hz), 'X', -sg * math.radians(88), 'fw', 0.72, 1.0)
    if s > 0: ANCH['hauptrad'] = A + Vector((0, 0.3, 0.3))

# =====================================================================================
# 7. Details: Seitenleitwerk, Dachluke, Handläufe, Antennen, Lichter, Kinnlaser, Kanonen, Steuerdüsen, Klappen, Beschriftung
# =====================================================================================
def details():
    CUR[0] = C_PART
    for x in SEAM_X: hull_band('Hauptfuge', [(x, 2 * PI * i / 160) for i in range(160)], 0.009, 0.003, M['frame'], True, 0.002)
    hull_band('Nasenfuge', [(8.9, 2 * PI * i / 120) for i in range(120)], 0.012, 0.004, M['frame'], True, 0.002)
    # Seitenleitwerk auf dem Modulheck (gerade, mittig)
    ob = build_fin(1, 'Seitenleitwerk', y0=0.0, cant=0.0, h=1.25, root=(-3.3, -6.15), tip=(-5.15, -6.4), tc=0.05)
    hh = 0.6; xa, xb, b0 = fin_geo(1, hh, 0.0, 0.0, (-3.3, -6.15), (-5.15, -6.4), 1.25, False); L = xa - xb
    for s in (1, -1):
        nrm = Vector((0, s, 0)); pc = Vector((xa - 0.45 * L, 0, b0.z)) + nrm * (naca(0.45, 0.05 * (1 - 0.35 * hh / 1.25)) * L + 0.008)
        up = Vector((0, 0, 1)); xd = up.cross(nrm).normalized(); CUR[0] = C_DECAL; emblem(tuple(pc), tuple(xd), tuple(up), 0.24, M['txtd'])
    CUR[0] = C_LITE; xa, xb, b0 = fin_geo(1, 1.22, 0.0, 0.0, (-3.3, -6.15), (-5.15, -6.4), 1.25, False); sphere('Leitwerkslicht', 0.04, xb + 0.06, 0, b0.z, M['blitz'], 10)
    CUR[0] = C_PART
    hull_circle('Dachluke', 2.4, 0.0, 0.32, 0.03, 0.025, M['gun']); hull_circle('Dachlukenfuge', 2.4, 0.0, 0.26, 0.01, 0.004, M['frame'], 0.002)
    with Part('Lukengriff', place(2.4, 0.0, 0.004), C_PART): pipe('Griff', [Vector((-0.08, 0, 0)), Vector((-0.06, 0, 0.05)), Vector((0.06, 0, 0.05)), Vector((0.08, 0, 0))], 0.012, M['warnrw'])
    for s in (1, -1):
        pts = []
        for i in range(12):
            x = 1.6 - i * 0.6; tt = s * 0.5; p = hull_point(x, tt); n = hull_normal(x, tt); pts.append(p + n * 0.09)
            if i % 2 == 0: sphere('Handlaufstuetze', 0.02, *(p + n * 0.045), M['mittel'], 8)
        pipe('Handlauf', pts, 0.016, M['warnrw'])
    for x in (0.6, -2.2):
        with Part('Klingenantenne', T(x, 0, top_z(x, 0) - 0.004), C_PART): prism('Antenne', [(0.16, 0.0), (-0.12, 0.0), (-0.2, 0.22), (-0.08, 0.22)], -0.012, 0.012, M['dunkel'], 'Y', 0.003)
    for x in (3.0, -3.0):
        with Part('Klingenantenne', place(x, PI, 0.0), C_PART): prism('Antenne', [(0.14, 0.0), (-0.1, 0.0), (-0.16, 0.16), (-0.06, 0.16)], -0.01, 0.01, M['dunkel'], 'Y', 0.003)
    with Part('Radarschale', T(4.3, 0, top_z(4.3, 0)), C_PART):
        cyl('Radarsockel', 0.12, 0.08, 0, 0, 0.04, M['gun'], 'Z', n=24); cyl('Radarmast', 0.03, 0.25, 0, 0, 0.2, M['mittel'], 'Z', n=12)
        with Part('Schale', T(0, 0, 0.36) @ RY(math.radians(-20)), C_PART):
            ob = sphere('Schale', 0.26, 0, 0, 0, M['weiss2'], 32); ob.scale = (0.25, 1, 1); ring('Schalenrand', 0.25, 0.012, (0.03, 0, 0), (1, 0, 0), M['ocker'], 32)
    CUR[0] = C_LITE
    sphere('Blitzlicht oben', 0.045, -1.2, 0, top_z(-1.2, 0) + 0.03, M['nav_r'], 12); sphere('Blitzlicht unten', 0.045, 1.2, 0, bot_z(1.2, 0) - 0.03, M['nav_r'], 12)
    for s in (1, -1):
        for x in (3.6, -1.0, -4.8): sphere('Flankenlicht', 0.03, *(hull_point(x, s * 1.95) + hull_normal(x, s * 1.95) * 0.02), M['formlicht'], 8)
    CUR[0] = C_PART
    zl = bot_z(8.5, 0)
    with Part('Werkzeuglaser', T(8.5, 0, zl + 0.01), C_PART):
        cyl('Lasersockel', 0.14, 0.06, 0, 0, -0.02, M['graphit'], 'Z', n=24); sphere('Laserkugel', 0.11, 0, 0, -0.1, M['graphit'], 24)
        cyl('Laserrohr', 0.034, 0.22, 0.12, 0, -0.12, M['duese'], 'X', n=16); ring('Fokusring', 0.04, 0.008, (0.18, 0, -0.12), (1, 0, 0), M['ocker'], 16)
        cyl('Laserlinse', 0.028, 0.01, 0.235, 0, -0.12, M['laser'], 'X', n=16)
    ANCH['laser'] = Vector((8.74, 0, zl - 0.11))
    for s in (1, -1):
        xk = 7.3; tt = s * 2.15; p = hull_point(xk, tt)
        with Part('Kanone', T(p.x, p.y, p.z), C_WPN):
            ob = sphere('Kanonenverkleidung', 0.09, -0.2, 0, -0.02, M['graphit'], 24); ob.scale = (4.5, 0.85, 0.85)
            cyl('Lauf', 0.025, 0.4, 0.3, 0, -0.02, M['duese'], 'X', n=14); ring('Muendung', 0.027, 0.007, (0.5, 0, -0.02), (1, 0, 0), M['dunkel'], 14)
        ANCH['kanone%d' % s] = Vector((xk + 0.51, p.y, p.z - 0.02))
        for x, tt2 in ((8.2, s * 1.45), (-5.6, s * 0.9), (-5.6, s * 2.25)):
            with Part('Steuerduese', place(x, tt2, 0.0), C_PART):
                box('Duesenfeld', 0.14, 0.1, 0.01, 0, 0, 0.0, M['dunkel'], 0.003)
                for j in range(3): box('Duesenschlitz', 0.025, 0.07, 0.006, -0.04 + j * 0.04, 0, 0.005, M['duese'], 0.001)
        for x, tt2 in ((5.0, s * 1.7), (-1.6, s * 1.45), (-3.6, s * 1.45), (-5.2, s * 1.9), (3.0, s * 2.4)):
            with Part('Wartungsklappe', place(x, tt2, 0.0015), C_PART):
                box('Klappenfuge', 0.46, 0.3, 0.003, 0, 0, 0, M['fuge'], 0.0); box('Klappe', 0.44, 0.28, 0.004, 0, 0, 0.002, M['weiss2' if math.cos(tt2) > -0.1 else 'graphit'], 0.0)
                for sx in (1, -1):
                    for sy in (1, -1): cyl('Klappenschraube', 0.01, 0.006, sx * 0.2, sy * 0.12, 0.005, M['schraube'], 'Z', n=6, bev=0)
        with Part('Tankstutzen', place(-0.2, s * 1.2, 0.002), C_PART):
            cyl('Stutzendeckel', 0.08, 0.01, 0, 0, 0, M['dunkel'], 'Z', n=20); ring('Stutzenring', 0.085, 0.008, (0, 0, 0.004), (0, 0, 1), M['ocker'], 20)
    CUR[0] = C_PART
    with Part('Sensorkugel', T(6.0, 0, top_z(6.0, 0) - 0.02), C_PART):
        cyl('Sensorsockel', 0.1, 0.05, 0, 0, 0.025, M['graphit'], 'Z', n=24); sphere('Sensorglas', 0.08, 0, 0, 0.07, M['rauchglas'], 24)

def markings():
    for s in (1, -1):
        label_on(2.75, s * (PI / 2 - 0.42), 'DOHLE', 0.36, 'txtd')
        label_on(6.2, s * 1.2, 'DH 04', 0.2, 'txtd')
        label_on(-0.2, s * 1.37, 'TREIBSTOFF', 0.045, 'txto')
        label_on(-5.85, s * (PI / 2 - 0.3), 'LADERAUM', 0.06, 'txtd')
        p = hull_point(1.1, s * 0.35); n = hull_normal(1.1, s * 0.35); surf_text('NICHT BETRETEN', 0.05, p, n, (1, 0, 0), 'txtd', bpy.data.objects['Rumpf'])
    label_on(2.4, 0.42, 'NOTAUSSTIEG', 0.05, 'txto')
    CUR[0] = C_DECAL
    def spot_n(c, n, r, m, sq=1.0):
        n = Vector(n).normalized(); xd = Vector((1, 0, 0)) - n * n.x; xd = xd.normalized() if xd.length > 0.1 else n.orthogonal().normalized()
        mw, X, Y, Z = frame(c, xd, n.cross(xd)); mw.translation = Vector(c) + n * 0.002
        return quad('Fleck', ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)), M[m], mw @ Matrix.Diagonal((2 * r * sq, 2 * r, 1, 1)))
    for s in (1, -1):
        for x in (4.6, 0.0, -2.4, -4.8):
            p = hull_point(x, s * 1.75); n = hull_normal(x, s * 1.75); up = (Vector((0, 0, 1)) - n * n.z).normalized()
            streak(tuple(p + n * 0.006), tuple(up.cross(n).normalized()), tuple(up), 0.36, 0.9)
        p = hull_point(-6.1, s * 1.62); n = hull_normal(-6.1, s * 1.62); spot_n(p + n * 0.004, n, 0.3, 'fleck', 1.6)
        p = Vector((NX1 + 0.4, s * NG[0], NG[1] + _NR(NX1 + 0.4) + 0.005)); spot_n(p, (0, 0, 1), 0.25, 'fleck', 2.0)
    p = hull_point(1.1, 1.62); n = hull_normal(1.1, 1.62); spot_n(p + n * 0.004, n, 0.35, 'abrieb', 1.4)

# =====================================================================================
# Gelenke, Zustand, Ansichten, Bauplan, Bau
# =====================================================================================
def gelenke_anlegen():
    for g in GELENKE:
        e = bpy.data.objects.new('Gelenk ' + g['tag'], None); C_PART.objects.link(e); hinge = g['hinge'] if not g['slide'] else (0, 0, 0)
        e.location = hinge; e.empty_display_size = 0.15; PIVOTS[g['tag']] = e
        for o in GRUPPEN.get(g['tag'], []):
            if o.parent is not None: continue
            o.parent = e; o.matrix_parent_inverse = Matrix.Translation(Vector(hinge)).inverted()
        for o in [e] + list(e.children_recursive): o['tag'] = g['tag']
def zustand(fw=0.0, rampe=0.0, tuer=0.0):      # wie im Spiel: fw 0 ausgefahren … 1 eingefahren; rampe und tuer 0 zu … 1 offen
    want = {'fw': fw, 'rampe': rampe, 'tuer': tuer}
    for g in GELENKE:
        e = PIVOTS[g['tag']]; p = want[g['grp']]; k = ease((p - g['t0']) / (g['t1'] - g['t0'])); kk = 1 - k if g['inv'] else k
        e.rotation_euler = (0, 0, 0); e.rotation_euler[{'X': 0, 'Y': 1, 'Z': 2}[g['axis']]] = g['angle'] * kk
    bpy.context.view_layer.update()
ZUST = {}
def view(name, path, res=(1600, 900)):
    st = ZUST.get(name, {}); zustand(st.get('fw', 0.0), st.get('rampe', 0.0), st.get('tuer', 0.0))
    for o in bpy.data.objects:
        if o.name.startswith('Kanzelglas'): o.hide_render = name == 'cockpit'
    for o in [STAGE['kiste']] + list(STAGE['kiste'].children_recursive): o.hide_render = not st.get('kiste', False)
    boden = bpy.data.objects.get('Boden grau'); bz = boden.location.z if boden else 0
    if boden and name == 'unten': boden.location.z = -60
    try: _view_w(name, path, res)
    finally:
        if boden: boden.location.z = bz
PLAN_FEAT = [
    ('RUNDUMVERGLASUNG', 'kanzel', (-60, -160)), ('EINSTIEGSTÜR MIT TREPPE', 'tuer', (-110, 195)), ('BUGRAD, ZWILLINGSRÄDER', 'bugrad', (-260, 50)),
    ('HAUPTFAHRWERK IM WULST', 'hauptrad', (-60, 170)), ('LADERAUM 5,7 × 3,1 × 2,4 M', 'laderaum', (240, 45)), ('HECKRAMPE', 'rampe_spitze', (140, 120)),
    ('TRIEBWERKSGONDELN', 'gondel1', (150, -120)), ('WERKZEUGLASER', 'laser', (-220, 80)),
]
def plan_txt(ext):
    return ['HERSTELLER: BASTION-WERFT, DECK 3', 'MODELL: DOHLE', 'KLASSE: KLEINER FRACHTER (EINSTEIGER)', 'BESATZUNG: 1',
            'LÄNGE: %.1f M' % ext['laenge'], 'BREITE: %.1f M' % ext['breite'], 'HÖHE: %.1f M (AUSGEFAHREN)' % ext['hoehe'],
            'LADERAUM: 5,7 × 3,1 × 2,4 M', 'FRACHT: PALETTEN UND KISTEN, HECKRAMPE', 'EINSTIEG: TÜR MIT TREPPE', 'ANTRIEB: 2 GONDELN, 2 HUBDÜSEN', 'KENNUNG: DH 04']
_src = open(_ek, encoding='utf-8').read(); _a = _src.index('def bauplan(path):'); _b = _src.index('\nHULL_GRID = {}')
_bp = _src[_a:_b]
for _o, _n in (("txt('ELSTER', 64, 40, 98); txt('PROSPEKTOR · EIGENER ENTWURF DER BASTION · FASSUNG 2', 24, 330, 92)", "txt('DOHLE', 64, 40, 98); txt('KLEINER FRACHTER · EIGENER ENTWURF DER BASTION · EINSTEIGER', 24, 300, 92)"),
               ("'BAUPLAN BL-0307-B'", "'BAUPLAN DH-0104-A'"), ("'Einsitziges Bergbauschiff für Felsfelder und Monde.'", "'Einsitziger kleiner Frachter für den Einstieg in den Handel.'"),
               ("'Glatter Rumpf mit großer Glaskuppel, Kugellaser unter dem Kinn,'", "'Rundumverglaste Kanzel, Tür mit Treppe, Laderaum mit Heckrampe,'"),
               ("'Erzkanister in Rundklammern, runde Manteltriebwerke.'", "'Gondeln an Pylonen, Hauptfahrwerk in seitlichen Wülsten.'"),
               ("c.location = (cxm + 22, 18, 9.0); c.rotation_euler = (Vector((cxm, 0, 2.8))", "c.location = (cxm + 17, 13.5, 7.2); c.rotation_euler = (Vector((cxm, 0, 2.3))"),
               ("c = CAMS['Seite']; c.location = (cxm, 60, 3.1)", "c = CAMS['Seite']; c.location = (cxm, 60, 2.6)"), ("c = CAMS['Front']; c.location = (60, 0, 3.1)", "c = CAMS['Front']; c.location = (60, 0, 2.6)"), ("'els_plan_", "'doh_plan_")):
    if _o not in _bp: raise RuntimeError('Bauplan: ' + _o[:40])
    _bp = _bp.replace(_o, _n)
exec(compile(_bp, 'els_bauplan(dohle)', 'exec'))
_bauplan_els = bauplan
def bauplan(path):
    for k in ('rock', 'beam', 'hot', 'hotlight'): STAGE.setdefault(k, bpy.data.objects.new('leer_' + k, None))
    for o in [STAGE['kiste']] + list(STAGE['kiste'].children_recursive): o.hide_render = True
    zustand(0, 0, 1); _bauplan_els(path)
def build():
    global BVH
    hull, rings, XS = build_hull(); BVH = make_bvh([hull])
    cut_openings(hull)
    mesh_obj('Rumpf', hull, HULL_MATS, True, C_HULL)
    glazing(); cockpit(); entry(); hold()
    for s in (1, -1): build_nacelle(s); nacelle_parts(s); sponson(s); main_gear(s)
    lift_fans(); nose_gear(); details(); markings()
    gelenke_anlegen()
    stages(); world('grau')
    for nm, loc, yaw in (('Figur Studio', (-0.6, 4.1, 0), -2.2), ('Figur Pilot', (1.4, 3.3, 0), -1.9), ('Figur Techniker', (-9.4, -1.2, 0), 1.2)):
        if nm in bpy.data.objects: o = bpy.data.objects[nm]; o.location = loc; o.rotation_euler = (0, 0, yaw)
    for nm, loc, tgt, lens in (('Schraeg', (17.5, 13.5, 7.6), (0.4, 0, 2.5), 45), ('Hangar', (14.5, 10.5, 4.0), (0.2, 0.6, 2.3), 30), ('Heck', (-17.5, -11.5, 6.0), (-4.0, 0, 2.6), 40),
                               ('Cockpit', (7.9, 0.9, 4.4), (7.0, -0.05, 2.7), 24), ('Detail', (4.6, 6.6, 2.3), (1.0, 1.8, 1.6), 32), ('Weltraum', (17.0, -12.5, 7.0), (0.0, 0, 2.6), 45)):
        c = CAMS[nm]; c.location = loc; c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lens
    CAMS['Seite'].location = (1.0, 60, 2.7); CAMS['Front'].location = (60, 0, 2.6); CAMS['Front'].data.ortho_scale = 11; CAMS['Seite'].data.ortho_scale = 20
    CAMS['Draufsicht'].data.ortho_scale = 20; CAMS['Draufsicht'].location = (1.0, 0, 60)
    cam('Fahrwerk', (8.6, 2.8, 0.8), (6.6, 0.0, 1.0), 30); cam('Fahrwerk hinten', (0.3, 4.6, 0.8), (-2.2, 2.0, 1.1), 30)
    cam('Fracht', (-12.6, -2.8, 3.4), (-4.0, 0, 2.3), 30); cam('Unten', (6.5, 7.0, -4.0), (0.0, 0, 2.0), 38); cam('Einstieg', (4.2, 6.4, 2.2), (1.0, 1.6, 1.8), 30)
    global VIEWS
    V6 = {
        'schraeg': ('Schraeg', 'grau', True, 0.0, 0.0, {}), 'draufsicht': ('Draufsicht', 'grau', True, 0.2, 0.0, {}), 'seite': ('Seite', 'grau', True, 0.9, 0.0, {}),
        'front': ('Front', 'grau', True, 0.7, 0.0, {}), 'heck': ('Heck', 'grau', True, 0.1, 0.0, {}), 'hangar': ('Hangar', 'hangar', True, 0.4, 0.0, {'tuer': 1.0, 'rampe': 1.0, 'kiste': True}),
        'cockpit': ('Cockpit', 'grau', True, 0.3, 0.0, {}), 'detail': ('Detail', 'grau', True, 0.2, 0.0, {'tuer': 1.0}),
        'weltraum': ('Weltraum', 'weltraum', True, 0.0, 6.0, {'fw': 1.0}), 'unten': ('Unten', 'grau', True, 0.6, 0.0, {'fw': 1.0}),
        'fahrwerk': ('Fahrwerk', 'grau', True, 0.3, 0.0, {}), 'fahrwerk2': ('Fahrwerk hinten', 'grau', True, 0.3, 0.0, {}),
        'fracht': ('Fracht', 'hangar', True, 0.6, 0.0, {'rampe': 1.0, 'kiste': True}), 'einstieg': ('Einstieg', 'grau', True, 0.2, 0.0, {'tuer': 1.0}),
        'halb': ('Schraeg', 'grau', True, 0.0, 0.0, {'fw': 0.55}),
    }
    VIEWS = {k: v[:5] for k, v in V6.items()}; ZUST.update({k: v[5] for k, v in V6.items()})
    anchors = {'duese': list(ANCH['duese1']), 'kanone': list(ANCH['kanone1']), 'laser': list(ANCH['laser']), 'fracht': list(ANCH['fracht']), 'raum': ANCH['raum'],
               'umriss': [[round(x, 2), round(max(params(x)[0], 0.0), 3)] for x in [XT, 9.1, 8.6, 8.0, 7.0, 5.8, 4.6, 3.4, 1.8, -0.6, -4.0, -6.0, XE]],
               'gelenke': GELENKE}
    open(os.path.join(HIER, 'doh-anker.json'), 'w').write(json.dumps(anchors, indent=1))
    zustand(0, 0, 0)
    return {'ringe': len(XS), 'gelenke': len(GELENKE)}
if not globals().get('NUR_HELFER_DOHLE'):
    result = build()
