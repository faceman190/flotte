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
#  - Fahrwerk (25.11.2026 auf Wunsch des Nutzers ohne Räder: „die starten senkrecht und nicht auf einer Landebahn“): Landebeine mit
#    Füßen (Federbein, Gabel, kippbarer Fußteller mit Gummisohle und zwei Dämpfern); Bugbein fährt nach hinten ein, Hauptbeine in die Wülste
#  - Innenräume (25.11.2026 aufgewertet): Cockpit mit Schalensitz, Seitenstick, Pult mit Blendschutz; Vorraum und Gang verbunden, Luke
#    zum Laderaum; Laderaum mit Rollenbahnen, Wandfeldern, Kabelpritschen und Kettenzug (Kleinteile aus innen/innen_detail.py)
# Bewegliche Teile hängen an Gelenken (Gruppen fw, rampe, tuer); mil_kit.py liefert Werkzeuge, Federbein, Gelenkverwaltung.
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
# Innenräume (25.11.2026): helle Wände, dunklere Felder, Polster, Rahmen; Kleinteile über innen_detail.py (wie Kormoran und Wisent)
M['d_innen'] = mk('Innenwand hell', (0.25, 0.255, 0.25), 0.15, 0.55, var=0.08, scale=3.0, bump=0.15, wear=0.3)
M['d_feld'] = mk('Innenfeld', (0.13, 0.138, 0.145), 0.2, 0.5, var=0.1, scale=3.0, bump=0.15, wear=0.3)
M['d_polster'] = mk('Polster', (0.06, 0.062, 0.066), 0.0, 0.8, var=0.12, scale=6.0, bump=0.5, bscale=120)
M['d_rahmen'] = mk('Innenrahmen', (0.07, 0.075, 0.08), 0.6, 0.4, var=0.1, scale=4.0, wear=0.5)
_idk = os.path.join(HIER, '..', 'innen', 'innen_detail.py')
exec(compile(open(_idk, encoding='utf-8').read(), 'innen_detail.py', 'exec'))
C_HOLD = bpy.data.collections.new('Laderaum innen'); bpy.context.scene.collection.children.link(C_HOLD)
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
def open_box2(name, x0, x1, y0, y1, z0, z1, m, open_sides, col):      # wie open_box, aber mit mehreren offenen Seiten (Durchgänge)
    bmb = bmesh.new(); bmesh.ops.create_cube(bmb, size=1.0)
    for v in bmb.verts: v.co.x = x0 + (x1 - x0) * (v.co.x + 0.5); v.co.y = y0 + (y1 - y0) * (v.co.y + 0.5); v.co.z = z0 + (z1 - z0) * (v.co.z + 0.5)
    bmb.normal_update(); dead = set()
    for f in bmb.faces:
        for s_ in open_sides:
            ax = {'x': 0, 'y': 1, 'z': 2}[s_[1]]; sg = 1 if s_[0] == '+' else -1
            if f.normal[ax] * sg > 0.9: dead.add(f)
    bmesh.ops.delete(bmb, geom=list(dead), context='FACES'); bmesh.ops.reverse_faces(bmb, faces=bmb.faces[:])
    return mesh_obj(name, bmb, [m], False, col)
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
    mesh_obj('Cockpitwanne', bm, ['d_innen'], True, C_ROOM)
    # Rückwand mit Durchgang zum Gang, gepolstert
    wr = params(5.95)[0] * 0.78 - 0.42      # Rückwand mit Durchgang (bleibt innerhalb der Wanne)
    for s in (1, -1): box('Rueckwand', 0.06, wr, 1.05, 5.97, s * (0.42 + wr / 2), FLC + 0.52, M['d_feld'], 0.01)
    box('Durchgangssturz', 0.06, 0.84, 0.18, 5.97, 0, FLC + 1.0, M['d_feld'], 0.01)
    for s in (1, -1): box('Durchgangskante', 0.08, 0.04, 1.0, 5.99, s * 0.42, FLC + 0.5, M['ocker'], 0.008)
    S = Sammel('Cockpit Kleinteile', C_ROOM)
    for s in (1, -1):
        for i in range(2):
            for j in range(3): S.box(0.03, wr / 2 - 0.035, 0.25, 6.015, s * (0.42 + (i + 0.5) * wr / 2), FLC + 0.27 + j * 0.27, M['d_polster'])
    # Boden: Trittplatten, Gummimatte im Fußraum, Kabelstränge an den Wandfüßen
    platten(S, 6.02, 7.72, -0.6, 0.6, FLC, M['boden2'], M['dunkel'], M['mittel'], p=0.57, q=0.6)
    S.box(0.5, 0.62, 0.008, 7.48, 0, FLC + 0.017, M['rubber'])
    for s in (1, -1):
        pts = [Vector((x, s * (params(x)[0] - 0.07) * 0.79, FLC + 0.07)) for x in (6.05, 6.6, 7.2, 7.75, 8.15)]
        pipe('Kabelstrang', pts, 0.022, M['dunkel'], rad=0.2); pipe('Kabelstrang', [p + Vector((0, 0, 0.05)) for p in pts], 0.014, M['ocker'], rad=0.2)
    # Sitz: Schalensitz auf Schienen, Seitenwangen, Steppnähte, Fünfpunktgurt, Kopfstütze mit Wangen
    xs = 6.75; kz = min(1.18, top_z(xs - 0.25, 0) - FLC - 0.27)      # Kopfstütze bleibt unter der Kanzel
    for s in (1, -1):
        S.box(0.8, 0.045, 0.035, xs - 0.02, s * 0.19, FLC + 0.03, M['mittel'])
        for k in range(6): S.cyl(0.011, 0.004, (xs - 0.35 + k * 0.13, s * 0.19, FLC + 0.049), (0, 0, 1), M['dunkel'], 6)
    with Part('Pilotensitz', T(xs, 0, FLC + 0.04) @ RY(math.radians(-10)), C_ROOM):
        box('Sitzsockel', 0.4, 0.4, 0.18, 0.0, 0, 0.09, M['dunkel'], 0.02)
        box('Sitzschale', 0.56, 0.56, 0.08, 0.06, 0, 0.22, M['d_rahmen'], 0.02)
        box('Sitzpolster', 0.48, 0.38, 0.08, 0.08, 0, 0.3, M['sitz'], 0.03)
        box('Schalenlehne', 0.08, 0.56, kz - 0.2, -0.25, 0, 0.26 + (kz - 0.2) / 2, M['d_rahmen'], 0.03)
        box('Lehnenpolster', 0.07, 0.38, kz - 0.36, -0.18, 0, 0.36 + (kz - 0.36) / 2, M['sitz'], 0.03)
        for k in range(4): box('Steppnaht', 0.004, 0.36, 0.008, -0.143, 0, 0.45 + k * (kz - 0.5) / 4, M['dunkel'], 0)
        for s in (1, -1):
            box('Seitenwange', 0.46, 0.08, 0.12, 0.08, s * 0.235, 0.33, M['sitz'], 0.035)
            box('Lehnenwange', 0.11, 0.08, kz - 0.5, -0.175, s * 0.235, 0.38 + (kz - 0.5) / 2, M['sitz'], 0.035)
            box('Armlehne', 0.36, 0.07, 0.05, 0.02, s * 0.32, 0.54, M['dunkel'], 0.015); box('Armstuetze', 0.05, 0.05, 0.2, -0.13, s * 0.32, 0.42, M['d_rahmen'], 0.01)
            box('Schultergurt', 0.012, 0.05, kz - 0.5, -0.135, s * 0.11, 0.36 + (kz - 0.5) / 2, M['gurt'], 0.002)
            box('Beckengurt', 0.24, 0.05, 0.012, 0.03, s * 0.12, 0.35, M['gurt'], 0.002)
        box('Kopfstuetze', 0.12, 0.28, 0.2, -0.2, 0, kz, M['sitz'], 0.035)
        for s in (1, -1): box('Kopfwange', 0.1, 0.06, 0.17, -0.17, s * 0.16, kz, M['sitz'], 0.03)
        cyl('Gurtschloss', 0.045, 0.02, 0.16, 0, 0.36, M['chrom'], 'Z', n=20); box('Schrittgurt', 0.012, 0.05, 0.08, 0.21, 0, 0.32, M['gurt'], 0.002)
        box('Verstellhebel', 0.16, 0.02, 0.02, 0.16, 0.26, 0.14, M['ocker'], 0.005)
    # Seitenkonsolen: rechts Seitenstick, links Schubhebel, Tasten, Drehknöpfe, kleine Anzeigen, Fußraumleisten
    for s in (1, -1):
        box('Seitenkonsole', 0.9, 0.22, 0.42, 6.95, s * 0.62, FLC + 0.21, M['verkleidung'], 0.02)
        box('Konsolendeckel', 0.86, 0.2, 0.02, 6.95, s * 0.62, FLC + 0.43, M['d_rahmen'], 0.005)
        S.box(0.84, 0.012, 0.012, 6.95, s * 0.505, FLC + 0.06, M['e_teal'])
        with Part('Konsolenanzeige', T(7.28, s * 0.62, FLC + 0.46) @ RY(math.radians(-22)), C_ROOM):
            box('Rahmen', 0.18, 0.17, 0.02, 0, 0, 0, M['dunkel'], 0.005); box('Bild', 0.14, 0.13, 0.004, 0, 0, 0.011, M['mfd2'] if s > 0 else M['mfd'], 0)
        for k in range(4): S.box(0.05, 0.04, 0.016, 6.56 + (k % 2) * 0.08, s * (0.57 + (k // 2) * 0.09), FLC + 0.448, M['taste'])
        for k in range(2): S.cyl(0.017, 0.022, (6.76, s * (0.57 + k * 0.09), FLC + 0.451), (0, 0, 1), M['dunkel'], 12)
        for k in range(5): S.box(0.004, 0.012, 0.18, 6.52 + k * 0.2, s * 0.508, FLC + 0.25, M['dunkel'])      # Lüftungsschlitze
    with Part('Seitenstick', T(7.0, -0.62, FLC + 0.44), C_ROOM):
        cyl('Stickmanschette', 0.05, 0.04, 0, 0, 0.02, M['rubber'], 'Z', n=16); cyl('Sticksaeule', 0.016, 0.1, 0, 0, 0.09, M['dunkel'], 'Z', n=12)
        box('Stickgriff', 0.06, 0.055, 0.13, 0.01, 0, 0.2, M['rubber'], 0.02, rot=(0, math.radians(12), 0))
        box('Stickkappe', 0.08, 0.065, 0.025, 0.02, 0, 0.275, M['dunkel'], 0.01); cyl('Stickknopf', 0.011, 0.012, 0.03, 0.0, 0.292, M['rotlack'], 'Z', n=10)
        box('Stickabzug', 0.015, 0.025, 0.035, 0.05, 0, 0.21, M['dunkel'], 0.004)
    with Part('Schubhebel', T(6.98, 0.62, FLC + 0.44), C_ROOM):
        box('Hebelkulisse', 0.26, 0.11, 0.012, 0, 0, 0.0, M['dunkel'], 0.003)
        for k in range(2):
            yy = (k - 0.5) * 0.05
            box('Hebel', 0.02, 0.014, 0.16, 0.03, yy, 0.08, M['mittel'], 0.003, rot=(0, math.radians(-18), 0)); box('Hebelgriff', 0.055, 0.04, 0.05, 0.055, yy, 0.165, M['dunkel'], 0.012)
        box('Hebelschild', 0.05, 0.08, 0.002, -0.1, 0, 0.007, M['ocker'], 0)
    for s in (1, -1):
        with Part('Pedal', T(7.55, s * 0.17, FLC + 0.03), C_ROOM):
            box('Pedalarm', 0.04, 0.03, 0.2, 0.06, 0, 0.1, M['mittel'], 0.005, rot=(0, math.radians(20), 0))
            box('Pedalplatte', 0.035, 0.12, 0.22, 0.0, 0, 0.15, M['dunkel'], 0.01, rot=(0, math.radians(-25), 0))
            box('Pedalgummi', 0.01, 0.1, 0.18, -0.02, 0, 0.16, M['rubber'], 0.003, rot=(0, math.radians(-25), 0))
    # Instrumentenpult: großes Mittelbild, je zwei Seitenbilder mit Randtasten, Blendschutz mit Warnleuchten und Notinstrument, Drehknöpfe, Tastenfeld
    xp = 7.85
    prism('Pult', [(xp + 0.25, FLC), (xp + 0.55, FLC), (xp + 0.55, FLC + 0.62), (xp + 0.15, FLC + 0.86), (xp, FLC + 0.8)], -0.8, 0.8, M['verkleidung'], 'Y', 0.02)
    for y, w, mm in ((0.0, 0.32, 'mfd'), (0.35, 0.25, 'mfd2'), (-0.35, 0.25, 'mfd'), (0.62, 0.17, 'screen'), (-0.62, 0.17, 'mfd2')):
        with Part('Anzeige', T(xp + 0.05, y, FLC + 0.77) @ RY(math.radians(-58)), C_ROOM):
            box('Rahmen', 0.24, w, 0.025, 0, 0, 0, M['dunkel'], 0.006); box('Bild', 0.19, w - 0.05, 0.004, 0, 0, 0.014, M[mm], 0)
            for sg in (1, -1):
                for k in range(4): box('Randtaste', 0.025, 0.012, 0.01, -0.075 + k * 0.05, sg * (w / 2 - 0.012), 0.015, M['taste'], 0.002)
    prism('Blendschutz', [(xp - 0.07, FLC + 0.93), (xp + 0.3, FLC + 0.955), (xp + 0.3, FLC + 0.905), (xp - 0.05, FLC + 0.885)], -0.5, 0.5, M['d_polster'], 'Y', 0.01)
    LAMPEN = [M['e_amber'], M['e_green'], M['e_red'], M['e_white']]
    for k in range(9): S.box(0.006, 0.05, 0.022, xp - 0.062, -0.28 + k * 0.07, FLC + 0.908, LAMPEN[k % 4] if k != 4 else M['dunkel'])
    cyl('Notinstrument', 0.035, 0.03, xp - 0.07, 0, FLC + 0.908, M['dunkel'], 'X', n=20); cyl('Notinstrument Bild', 0.028, 0.004, xp - 0.086, 0, FLC + 0.908, M['mfd2'], 'X', n=20)
    n_ = Vector((-0.8, 0, -0.25)).normalized(); up_ = Vector((-0.25, 0, 0.8)).normalized()
    def pf(y, z): return Vector((xp + 0.25 * (0.8 - (z - FLC)) / 0.8, y, z))      # Punkt auf der schrägen Pultfront
    for c_, w_, h_ in (((0.0, FLC + 0.55), 1.1, 0.1), ((0.23, FLC + 0.388), 0.2, 0.22), ((-0.255, FLC + 0.37), 0.2, 0.25)):      # eingelassene Felder
        S.obox(tuple(pf(*c_) + n_ * 0.003), (0, 1, 0), up_, (w_, h_, 0.006), M['d_feld'])
        for sy in (-1, 1):
            for sz in (-1, 1): S.cyl(0.006, 0.004, tuple(pf(c_[0] + sy * (w_ / 2 - 0.015), c_[1] + sz * (h_ / 2 - 0.015) * 0.954) + n_ * 0.007), n_, M['mittel'], 6)
    for k in range(7):
        p = pf(-0.45 + k * 0.15, FLC + 0.55); S.cyl(0.02, 0.03, tuple(p + n_ * 0.015), n_, M['dunkel'], 12)
        S.obox(tuple(p + n_ * 0.031 + up_ * 0.01), (0, 1, 0), up_, (0.006, 0.014, 0.003), M['e_white'])
    for k in range(12): p = pf(0.18 + (k % 3) * 0.05, FLC + 0.32 + (k // 3) * 0.045); S.obox(tuple(p + n_ * 0.008), (0, 1, 0), up_, (0.038, 0.035, 0.014), M['taste'])
    for k in range(6): p = pf(-0.3 + (k % 2) * 0.09, FLC + 0.3 + (k // 2) * 0.07); S.obox(tuple(p + n_ * 0.008), (0, 1, 0), up_, (0.05, 0.03, 0.016), M['e_amber'] if k == 0 else M['taste'])
    # Deckenpult: Sicherungen, Kippschalter mit roten Schutzkappen, kleine Anzeige, Haltegriff, Kartenleuchte
    zt = top_z(6.5, 0) - 0.12
    box('Deckenpult', 0.78, 0.54, 0.06, 6.52, 0, zt, M['verkleidung'], 0.012)
    for k in range(16): S.cyl(0.012, 0.03, (6.22 + (k % 8) * 0.085, -0.17 + (k // 8) * 0.07, zt - 0.045), (0, 0, 1), M['dunkel'], 8)
    for k in range(6): S.box(0.04, 0.03, 0.012, 6.27 + k * 0.1, 0.16, zt - 0.036, M['taste'])
    for s in (1, -1): S.box(0.05, 0.05, 0.03, 6.82, s * 0.19, zt - 0.045, M['rotlack'])
    S.box(0.12, 0.08, 0.006, 6.82, 0, zt - 0.033, M['mfd2'])
    pipe('Haltegriff', [Vector((6.05, -0.32, zt + 0.04)), Vector((6.07, -0.32, zt - 0.08)), Vector((6.07, 0.32, zt - 0.08)), Vector((6.05, 0.32, zt + 0.04))], 0.014, M['chrom'], rad=0.05)
    sphere('Kartenleuchte', 0.022, 6.2, 0.22, zt - 0.04, M['e_white'], 10)
    # Kleinigkeiten an der Rückwand: Helm am Haken, Datentafel in der Halterung, Feuerlöscher
    with Part('Helm', T(6.18, 0.74, FLC + 0.62), C_ROOM):
        sphere('Helmschale', 0.13, 0, 0, 0, M['weiss2'], 20); box('Helmvisier', 0.05, 0.18, 0.1, 0.1, 0, 0.0, M['rauchglas'], 0.03)
        box('Helmstreifen', 0.2, 0.03, 0.02, 0.0, 0, 0.125, M['ocker'], 0.008); cyl('Helmhaken', 0.008, 0.08, -0.12, 0, 0.12, M['chrom'], 'X', n=8)
    with Part('Datentafel', T(6.06, -0.72, FLC + 0.7), C_ROOM):
        box('Tafelhalter', 0.04, 0.24, 0.06, 0.0, 0, -0.16, M['dunkel'], 0.006); box('Tafel', 0.02, 0.2, 0.28, 0.01, 0, 0.0, M['dunkel'], 0.01); box('Tafelbild', 0.003, 0.17, 0.24, 0.022, 0, 0.0, M['mfd2'], 0)
    with Part('Feuerloescher', T(6.1, -0.6, FLC + 0.3), C_ROOM):
        cyl('Loescher', 0.05, 0.34, 0, 0, 0, M['rotlack'], 'Z', n=16); cyl('Loescherkopf', 0.02, 0.07, 0, 0, 0.2, M['dunkel'], 'Z', n=10); box('Loescherband', 0.02, 0.12, 0.03, -0.04, 0, 0.08, M['dunkel'], 0.004)
    CUR[0] = C_ROOM
    area('Cockpitlicht', (6.8, 0, 3.35), (0, 0, 0), 0.7, 0.5, 50, (0.85, 0.9, 1.0))
    area('Fussraumlicht', (7.3, 0, FLC + 0.35), (0, 0, 0), 0.5, 0.6, 8, (0.6, 0.9, 1.0))
    S.fertig()
    ANCH['sitz'] = Vector((xs, 0, FLC + 0.9))

def luke(xw, nx, yc, zf, schrift, col):      # geschlossene Durchgangsluke (Wand bei x = xw, Fläche zeigt nach nx): Rahmen, Blatt, Fenster, Hebel, Scharniere, Warnband
    CUR[0] = col
    box('Lukenrahmen', 0.04, 0.88, 1.94, xw + nx * 0.02, yc, zf + 0.97, M['d_rahmen'], 0.01)
    box('Lukenblatt', 0.03, 0.74, 1.8, xw + nx * 0.05, yc, zf + 0.94, M['d_feld'], 0.012)
    box('Lukenfenster', 0.012, 0.22, 0.3, xw + nx * 0.066, yc, zf + 1.42, M['rauchglas'], 0.004)
    box('Fensterrahmen innen', 0.01, 0.26, 0.34, xw + nx * 0.063, yc, zf + 1.42, M['dunkel'], 0.004)
    for z in (zf + 0.45, zf + 1.45): cyl('Lukenscharnier', 0.025, 0.14, xw + nx * 0.05, yc + 0.39, z, M['chrom'], 'Z', n=12)
    box('Lukenhebel', 0.03, 0.05, 0.22, xw + nx * 0.075, yc - 0.27, zf + 0.95, M['chrom'], 0.006)
    box('Hebellager', 0.02, 0.08, 0.08, xw + nx * 0.068, yc - 0.27, zf + 1.02, M['dunkel'], 0.006)
    box('Lukenwarnband', 0.012, 0.88, 0.06, xw + nx * 0.044, yc, zf + 1.97, M['warnrw'], 0.002)
    for z in (zf + 0.2, zf + 1.7):
        for sg in (1, -1): cyl('Lukenschraube', 0.012, 0.01, xw + nx * 0.067, yc + sg * 0.3, z, M['mittel'], 'X', n=8)
    text(schrift, 0.06, (xw + nx * 0.067, yc, zf + 1.68), (0, nx, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Lukenschrift')

# =====================================================================================
# 3. Einstieg: Tür mit Treppe, Vorraum und Gang nach vorn
# =====================================================================================
FLG = 1.62
def entry():
    x0, x1, z0, z1 = DOOR; xm = (x0 + x1) / 2
    CUR[0] = C_ROOM; yv = params(1.1)[0] + 0.02
    # Vorraum und Gang hängen zusammen (Durchgang bei x 1,72–1,75), helle Wände, Gitterrost in der Gangmitte
    open_box2('Vorraum', 0.45, 1.75, -0.65, yv, FLG, 3.75, M['d_innen'], ('+y', '+x'), C_ROOM)
    box('Vorraumwand', 0.04, yv - 0.62, 3.75 - FLG, 1.75, (0.62 + yv) / 2, (FLG + 3.75) / 2, M['d_innen'], 0.005)
    open_box2('Gang', 1.72, 4.3, -0.62, 0.62, FLG, 3.6, M['d_innen'], ('+x', '-x'), C_ROOM)
    box('Gangsturz', 0.06, 1.24, 0.15, 1.74, 0, 3.675, M['d_innen'], 0.005)
    S = Sammel('Gang Kleinteile', C_ROOM)
    platten(S, 0.47, 1.73, -0.63, yv - 0.08, FLG, M['boden2'], M['dunkel'], M['mittel'], p=0.62, q=0.62)
    gitter(S, 1.74, 4.3, -0.3, 0.3, FLG + 0.004, M['grate'], M['dunkel'])
    platten(S, 1.74, 4.3, 0.3, 0.61, FLG, M['boden2'], M['dunkel'], M['mittel'], p=0.64, q=0.31); platten(S, 1.74, 4.3, -0.61, -0.3, FLG, M['boden2'], M['dunkel'], M['mittel'], p=0.64, q=0.31)
    for s in (1, -1): S.box(2.5, 0.01, 0.006, 3.0, s * 0.33, FLG + 0.04, M['e_teal'])      # Leitstreifen am Rost
    # Wandfelder (Lüftung, Wartungsklappen, Anschlusskästen), Stoßleisten, Deckenraster, Leitungen mit Schellen, Leuchten
    for i in range(4):
        wandfeld(S, (1.75, -0.62, FLG), (1, 0, 0), (0, 1, 0), i * 0.635, (i + 1) * 0.635, 0.2, 1.86, i, M['d_feld'], M['d_rahmen'], M['dunkel'], M['mittel'], M['ocker'])
        wandfeld(S, (1.75, 0.62, FLG), (1, 0, 0), (0, -1, 0), i * 0.635, (i + 1) * 0.635, 0.2, 1.86, (3, 4, 5, 1)[i], M['d_feld'], M['d_rahmen'], M['dunkel'], M['mittel'], M['ocker'])
    for s in (1, -1): S.box(2.55, 0.012, 0.14, 3.02, s * 0.613, FLG + 0.08, M['ocker'])
    S.box(1.26, 0.012, 0.14, 1.1, -0.643, FLG + 0.08, M['ocker'])
    deckenraster(S, 1.75, 4.28, -0.6, 0.6, 3.6, M['d_rahmen'], p=0.63)
    deckenraster(S, 0.47, 1.73, -0.63, yv - 0.1, 3.75, M['d_rahmen'], p=0.63)
    for s in (1, -1):
        pipe('Gangleitung', [Vector((1.76, s * 0.5, 3.51)), Vector((4.26, s * 0.5, 3.51))], 0.025, M['mittel' if s > 0 else 'ocker'])
        pipe('Gangleitung', [Vector((1.76, s * 0.42, 3.53)), Vector((4.26, s * 0.42, 3.53))], 0.015, M['dunkel'])
        for x in (2.05, 2.95, 3.85): schelle(S, (x, s * 0.5, 3.51), (0, 0, -1), 0.025, M['d_rahmen'])
    for x in (2.4, 3.65):
        S.box(0.66, 0.18, 0.03, x, 0, 3.565, M['d_rahmen']); S.box(0.6, 0.12, 0.006, x, 0, 3.548, M['e_white'])
    S.box(0.6, 0.6, 0.03, 1.1, 0.6, 3.73, M['d_rahmen']); S.box(0.52, 0.52, 0.006, 1.1, 0.6, 3.713, M['e_white'])
    text('COCKPIT', 0.07, (3.95, 0.613, FLG + 1.95), (1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Gangschrift')
    text('GANG 1 · DH 04', 0.045, (2.5, -0.613, FLG + 1.95), (-1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Gangschrift')
    for k in range(3):      # Stufen hinauf ins Cockpit
        box('Stufe', 0.32, 1.0, 0.02, 4.45 + k * 0.33, 0, FLG + 0.21 * (k + 1), M['boden2'], 0.004); box('Stufenkante', 0.03, 1.0, 0.21, 4.3 + k * 0.33, 0, FLG + 0.21 * k + 0.105, M['warnrw'], 0.002)
        box('Stufenwange', 0.33, 0.04, 0.21 * (k + 1), 4.45 + k * 0.33, 0.52, FLG + 0.105 * (k + 1), M['d_rahmen'], 0.004); box('Stufenwange', 0.33, 0.04, 0.21 * (k + 1), 4.45 + k * 0.33, -0.52, FLG + 0.105 * (k + 1), M['d_rahmen'], 0.004)
        for s in (1, -1): S.box(0.26, 0.008, 0.006, 4.45 + k * 0.33, s * 0.45, FLG + 0.21 * (k + 1) + 0.012, M['e_teal'])
    # Vorraum: Spind, Verbandskasten, Feuerlöscher, Türbedienung, Luke zum Laderaum
    with Part('Spind', T(0.75, -0.45, FLG), C_ROOM):
        box('Spindkorpus', 0.5, 0.36, 1.9, 0, 0, 0.95, M['verkleidung'], 0.012); box('Spindtuer', 0.012, 0.32, 1.8, 0.256, 0, 0.95, M['d_feld'], 0.003)
        for k in range(3): box('Lueftung', 0.004, 0.2, 0.012, 0.263, 0, 1.6 + k * 0.03, M['dunkel'], 0)
        box('Spindgriff', 0.02, 0.025, 0.14, 0.27, -0.12, 1.0, M['chrom'], 0.004); box('Namensschild', 0.003, 0.14, 0.04, 0.263, 0, 1.45, M['ocker'], 0)
        text('ANZUG', 0.05, (0.264, 0.0, 1.3), (0, 1, 0), (0, 0, 1), M['txtw'], align='CENTER', name='Spindschrift')
    with Part('Feuerloescher', T(1.6, -0.55, FLG + 0.5), C_ROOM):
        cyl('Loescher', 0.06, 0.42, 0, 0, 0, M['rotlack'], 'Z', n=16); cyl('Loescherkopf', 0.025, 0.08, 0, 0, 0.25, M['dunkel'], 'Z', n=10)
        box('Loescherhalter', 0.08, 0.04, 0.04, 0, -0.07, 0.05, M['dunkel'], 0.004)
    with Part('Verbandskasten', T(1.28, -0.6, FLG + 1.45), C_ROOM):
        box('Kastenkorpus', 0.32, 0.1, 0.24, 0, 0, 0, M['white'], 0.01)
        box('Kreuz', 0.08, 0.004, 0.024, 0, 0.051, 0, M['rotlack'], 0); box('Kreuz', 0.024, 0.004, 0.08, 0, 0.051, 0, M['rotlack'], 0)
        box('Kastengriff', 0.12, 0.02, 0.015, 0, 0.055, 0.1, M['dunkel'], 0.003)
    with Part('Tuerbedienung', T(0.47, 1.3, FLG + 1.25), C_ROOM):
        box('Bedienkasten', 0.04, 0.16, 0.24, 0, 0, 0, M['dunkel'], 0.006)
        sphere('Taster', 0.016, 0.024, 0, 0.04, M['e_green'], 10); sphere('Taster', 0.016, 0.024, 0, -0.04, M['e_red'], 10)
        text('TÜR', 0.03, (0.022, 0.0, 0.085), (0, 1, 0), (0, 0, 1), M['txtw'], align='CENTER', name='Bedienschrift')
    luke(0.45, 1, 0.45, FLG, 'LADERAUM', C_ROOM)
    pipe('Handlauf', [Vector((1.8, 0.55, 2.6)), Vector((4.2, 0.55, 2.6)), Vector((5.2, 0.5, 3.25))], 0.018, M['chrom'], rad=0.2)
    S.fertig()
    CUR[0] = C_ROOM
    area('Ganglicht', (2.6, 0, 3.4), (0, 0, 0), 2.0, 0.6, 40, (0.85, 0.9, 1.0))
    area('Vorraumlicht', (1.1, 0.6, 3.6), (0, 0, 0), 1.0, 1.0, 45, (1.0, 0.92, 0.82))
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
    CUR[0] = C_HOLD; xc = (x0 + x1) / 2; L = x1 - x0
    open_box('Laderaum', x0, x1, -hw, hw, z0, z1, M['d_innen'], '-x', C_HOLD)
    S = Sammel('Laderaum Kleinteile', C_HOLD)
    # Boden: Ladeplatten, zwei Rollenbahnen unter den Ladereihen (y ±0,92, wie RAEUME.Dohle), Ankerschienen, Warnkante an der Rampe
    platten(S, x0 + 0.02, x1 - 0.02, -hw + 0.02, hw - 0.02, z0, M['boden2'], M['dunkel'], M['mittel'], p=0.96, q=0.76)
    for yl in (-0.92, 0.92):
        for sg in (-1, 1): S.box(L - 0.5, 0.03, 0.03, xc + 0.1, yl + sg * 0.17, z0 + 0.027, M['mittel'])
        for k in range(int((L - 0.7) / 0.22) + 1): S.cyl(0.016, 0.31, (x0 + 0.42 + k * 0.22, yl, z0 + 0.022), (0, 1, 0), M['chrom'], 8)
    for y in (0.0, -1.4, 1.4): zurrschiene(S, x0 + 0.25, x1 - 0.25, (y, z0 + 0.0135), (0, 0, 1), M['mittel'], M['dunkel'])
    S.box(0.12, 2 * hw - 0.1, 0.004, x0 + 0.1, 0, z0 + 0.0155, M['warnrw'])
    # Spanten an Wand und Decke, Knotenbleche, Stoßleisten, Wandfelder zwischen den Spanten, Ankerschiene oben
    XF = [x0 + 0.4 + k * (L - 0.8) / 4 for k in range(5)]
    for s in (1, -1):
        for k, xx in enumerate(XF):
            box('Spant', 0.08, 0.05, z1 - z0 - 0.04, xx, s * (hw - 0.03), (z0 + z1) / 2, M['mittel'], 0.006)
            S.obox((xx, s * (hw - 0.11), z1 - 0.11), (1, 0, 0), (0, -s, 1), (0.06, 0.2, 0.012), M['mittel'])
        for k in range(4):
            wandfeld(S, (XF[k], s * hw, z0), (1, 0, 0), (0, -s, 0), 0.07, XF[k + 1] - XF[k] - 0.07, 0.34, 1.86, (1, 3, 5, 0)[k] if s > 0 else (5, 0, 1, 3)[k], M['d_feld'], M['d_rahmen'], M['dunkel'], M['mittel'], M['ocker'])
        zurrschiene(S, x0 + 0.3, x1 - 0.1, (s * (hw - 0.002), z0 + 2.02), (0, -s, 0), M['mittel'], M['dunkel'])
        box('Stossleiste', L - 0.1, 0.04, 0.25, xc, s * (hw - 0.03), z0 + 0.16, M['ocker'], 0.006)
    for xx in XF: box('Deckenspant', 0.08, 2 * hw - 0.06, 0.06, xx, 0, z1 - 0.03, M['mittel'], 0.006)
    # Decke: Kabelpritschen und Leitungen an beiden Seiten, Laufschiene mit Kettenzug in der Mitte, Leuchten in Fassungen
    for s in (1, -1):
        S.box(L - 0.3, 0.22, 0.01, xc, s * (hw - 0.42), z1 - 0.16, M['mittel'])
        for sg in (-1, 1): S.box(L - 0.3, 0.01, 0.05, xc, s * (hw - 0.42) + sg * 0.11, z1 - 0.14, M['mittel'])
        for k in range(3): S.box(L - 0.32, 0.025, 0.02, xc, s * (hw - 0.42) + (k - 1) * 0.06, z1 - 0.145, [M['dunkel'], M['ocker'], M['dunkel']][k])
        for xx in XF: S.box(0.02, 0.02, 0.1, xx + 0.12, s * (hw - 0.42), z1 - 0.1, M['mittel'])
        pipe('Laderaumleitung', [Vector((x0 + 0.1, s * (hw - 0.25), z1 - 0.09)), Vector((x1 - 0.05, s * (hw - 0.25), z1 - 0.09))], 0.03, M['mittel' if s > 0 else 'ocker'])
        for xx in XF: schelle(S, (xx + 0.3, s * (hw - 0.25), z1 - 0.09), (0, 0, -1), 0.03, M['d_rahmen'])
        for k in range(3):
            xl = x0 + 1.1 + k * 1.85
            S.box(1.0, 0.2, 0.04, xl, s * 0.72, z1 - 0.04, M['d_rahmen']); S.box(0.9, 0.12, 0.006, xl, s * 0.72, z1 - 0.062, M['e_white'])
    S.box(L - 0.4, 0.12, 0.012, xc, 0, z1 - 0.18, M['gun']); S.box(L - 0.4, 0.012, 0.12, xc, 0, z1 - 0.12, M['gun']); S.box(L - 0.4, 0.1, 0.012, xc, 0, z1 - 0.065, M['gun'])
    for xx in XF: S.box(0.06, 0.06, 0.06, xx, 0, z1 - 0.03, M['gun'])
    with Part('Kettenzug', T(x1 - 0.55, 0, z1 - 0.19), C_HOLD):
        box('Laufkatze', 0.24, 0.2, 0.08, 0, 0, -0.04, M['ocker'], 0.01)
        for sg in (1, -1): cyl('Laufrolle', 0.03, 0.02, sg * 0.08, 0.075, 0.03, M['dunkel'], 'Y', n=12); cyl('Laufrolle', 0.03, 0.02, sg * 0.08, -0.075, 0.03, M['dunkel'], 'Y', n=12)
        cyl('Zuggehaeuse', 0.09, 0.22, 0, 0, -0.17, M['ocker'], 'Y', n=20)
        for k in range(5): ring('Kettenglied', 0.018, 0.005, (0.04, 0, -0.27 - k * 0.03), (1, 0, 0) if k % 2 else (0, 1, 0), M['chrom'], 10)
        box('Hakenblock', 0.06, 0.05, 0.08, 0.04, 0, -0.45, M['ocker'], 0.008); ring('Lasthaken', 0.04, 0.01, (0.04, 0, -0.52), (0, 1, 0), M['chrom'], 14)
        text('MAX 500 KG', 0.025, (0.0, -0.092, -0.17), (1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Zugschrift')
    # Stirnwand: Luke zum Vorraum, Netz links daneben, Feuerlöscher, Schrift; Rampenbedienung an der rechten Wand hinten
    luke(x1, -1, 0.45, z0, 'VORRAUM', C_HOLD)
    for k in range(5): S.box(0.012, 1.25, 0.01, x1 - 0.03, -0.62, z0 + 0.35 + k * 0.38, M['gurt'])
    for k in range(5): S.box(0.012, 0.01, 1.6, x1 - 0.03, -1.22 + k * 0.3, z0 + 1.1, M['gurt'])
    for y in (-1.25, 0.0):
        for z in (z0 + 0.3, z0 + 1.9): S.cyl(0.02, 0.03, (x1 - 0.02, y, z), (1, 0, 0), M['chrom'], 8)
    with Part('Feuerloescher', T(x1 - 0.08, 1.25, z0 + 0.55), C_HOLD):
        cyl('Loescher', 0.07, 0.48, 0, 0, 0, M['rotlack'], 'Z', n=16); cyl('Loescherkopf', 0.03, 0.08, 0, 0, 0.28, M['dunkel'], 'Z', n=10)
    text('LADERAUM · MAX 2,5 T', 0.08, (x1 - 0.045, 0.75, z1 - 0.3), (0, -1, 0), (0, 0, 1), M['txto'], name='Laderaumschrift')
    with Part('Rampenbedienung', T(x0 + 0.2, -(hw - 0.03), z0 + 1.3), C_HOLD):
        box('Bedienkasten', 0.22, 0.05, 0.32, 0, 0, 0, M['dunkel'], 0.008)
        for k, mm in enumerate(('e_green', 'e_red', 'e_amber')): cyl('Rampentaster', 0.022, 0.02, -0.06 + k * 0.06, 0.03, -0.04, M[mm], 'Y', n=12)
        box('Notaus', 0.07, 0.03, 0.07, 0.0, 0.035, 0.08, M['ocker'], 0.006); cyl('Notauspilz', 0.03, 0.025, 0.0, 0.055, 0.08, M['rotlack'], 'Y', n=14)
        text('RAMPE', 0.035, (0.0, 0.027, -0.12), (-1, 0, 0), (0, 0, 1), M['txtw'], align='CENTER', name='Rampenschrift innen')
    for s in (1, -1): sphere('Notleuchte', 0.035, x1 - 0.06, s * (hw - 0.08), z1 - 0.22, M['e_amber'], 10)
    S.fertig()
    CUR[0] = C_HOLD
    area('Laderaumlicht', (xc, 0, z1 - 0.3), (0, 0, 0), 4.0, 2.0, 120, (0.85, 0.9, 1.0))
    CUR[0] = C_PART
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
# 6. Fahrwerk: Landebeine mit Füßen (senkrechter Start, keine Räder); Bugbein, Hauptbeine in seitlichen Fahrwerkswülsten
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
# foot() (Landefuß) steht seit dem Umbau des Milan in ../milan/mil_kit.py
def leg(name, P0, Ap, r, hx, hy, tag_label):
    # Federbein vom Lagerbock bis zum Kolbenende E, darunter Gabelbrücke und Gabel zum Querbolzen Ap des Landefußes
    u = (Ap - P0).normalized(); E = Ap - u * 0.2; A2 = P0 + (E - P0) / 0.82      # strut() rechnet in Anteilen bis 0,82 (Kolbenende)
    strut(name, P0, A2, r)
    rod('Lagerachse', P0 - Vector((0, 0.22, 0)), P0 + Vector((0, 0.22, 0)), 0.055, M['chrom'], 20)
    for sg in (1, -1): rod('Lagerbock', P0 + Vector((0, sg * 0.18, 0)), P0 + Vector((0, sg * 0.24, 0)), 0.085, M['gun'], 20)
    rod(name + ' Gabelkopf', E - u * 0.04, E + u * 0.03, r * 0.9, M['gun'], 24)
    slab(name + ' Gabelbruecke', E + u * 0.03, (1, 0, 0), (0, 1, 0), (0.3, 0.26, 0.05), M['gun'], 0.01)
    for sg in (1, -1): link_bar(name + ' Gabel', E + u * 0.03 + Vector((0, sg * 0.1, 0)), Ap + Vector((0, sg * 0.1, 0)), 0.07, 0.024, (0, 1, 0), M['gun'])
    foot(name + 'fuss', Ap, E + u * 0.03, hx, hy)
    bw = Vector((-1, 0, 0)); t0 = P0.lerp(A2, 0.55) + bw * 0.1; t1 = E + bw * 0.1; kn = (t0 + t1) / 2 + bw * 0.17      # Drehmomentlenker hinten
    link_bar('Drehmomentlenker', t0, kn, 0.055, 0.028, (0, 1, 0), M['mittel']); link_bar('Drehmomentlenker', kn, t1, 0.055, 0.028, (0, 1, 0), M['mittel'])
    for p in (t0, kn, t1): rod('Lenkerbolzen', p - Vector((0, 0.04, 0)), p + Vector((0, 0.04, 0)), 0.016, M['chrom'], 12)
    rod('Einziehzylinder', P0 + Vector((-0.35, 0.09, 0.1)), P0.lerp(A2, 0.15) + Vector((-0.05, 0.09, 0)), 0.03, M['gun'], 14)
    hl = Vector((0.02, -(r + 0.026), 0))      # Hydraulikleitung dicht am Bein, mit Schellen
    pipe('Hydraulikleitung', [P0 + Vector((0.06, -0.1, 0.04)), P0.lerp(A2, 0.12) + hl, P0.lerp(A2, 0.5) + hl, E + u * 0.0 + Vector((0.02, -0.11, 0.0))], 0.011, M['rubber'], rad=0.05)
    for f in (0.22, 0.42): ring('Leitungsschelle', r + 0.012, 0.008, tuple(P0.lerp(A2, f)), tuple(u), M['mittel'], 24); slab('Schellenfuss', P0.lerp(A2, f) + Vector((0.01, -(r + 0.016), 0)), u, (0, 1, 0), (0.03, 0.025, 0.02), M['mittel'], 0.003)
    text(tag_label, 0.05, tuple(P0.lerp(A2, 0.28) + Vector((r + 0.004, 0, 0))), (0, -1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Beinschrift')
    return E
def nose_gear():
    P0 = Vector((6.55, 0, 2.08)); Aw = Vector((6.66, 0, 0.29)); Ap = P0 + (Aw - P0) * ((P0.z - 0.25) / (P0.z - Aw.z))      # Fußgelenk auf 0,25 m
    with Gruppe('fwn'):
        with Part('Bugfahrwerk', T(0, 0, 0), C_GEAR):
            leg('Bug', P0, Ap, 0.075, 0.32, 0.25, 'FW 1')
            with Part('Landescheinwerfer', T(*(P0.lerp(Ap, 0.3) + Vector((0.09, 0, 0)))), C_GEAR):
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
    ANCH['bugrad'] = Vector((Ap.x, 0, 0.15))
def main_gear(s):
    yc = s * SP[0]; P0 = Vector((-2.05, yc, 2.2)); Ap = Vector((-2.05, yc, 0.27))
    tag = 'fwh_' + ('l' if s > 0 else 'r')
    with Gruppe(tag):
        with Part('Hauptfahrwerk', T(0, 0, 0), C_GEAR):
            leg('Haupt', P0, Ap, 0.085, 0.4, 0.255, 'FW %d' % (2 if s > 0 else 3))
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
    if s > 0: ANCH['hauptrad'] = Vector((-2.05, yc + 0.28, 0.4))

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
        if o.name.startswith('Kanzelglas'): o.hide_render = name.startswith('cockpit')
    for o in [STAGE['kiste']] + list(STAGE['kiste'].children_recursive): o.hide_render = not st.get('kiste', False)
    boden = bpy.data.objects.get('Boden grau'); bz = boden.location.z if boden else 0
    if boden and name == 'unten': boden.location.z = -60
    try: _view_w(name, path, res)
    finally:
        if boden: boden.location.z = bz
PLAN_FEAT = [
    ('RUNDUMVERGLASUNG', 'kanzel', (-60, -160)), ('EINSTIEGSTÜR MIT TREPPE', 'tuer', (-110, 195)), ('BUGBEIN MIT LANDEFUSS', 'bugrad', (-260, 50)),
    ('LANDEBEINE IM WULST', 'hauptrad', (-60, 170)), ('LADERAUM 5,7 × 3,1 × 2,4 M', 'laderaum', (240, 45)), ('HECKRAMPE', 'rampe_spitze', (140, 120)),
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
    for c in (C_ROOM, C_HOLD):      # Innenräume: der Export hängt den Materialien „ ~i…“ an (Oberflächen-Shader im Spiel)
        for o in c.all_objects: o['innen'] = 1
    gelenke_anlegen()
    stages(); world('grau')
    for nm, loc, yaw in (('Figur Studio', (-0.6, 4.1, 0), -2.2), ('Figur Pilot', (1.4, 3.3, 0), -1.9), ('Figur Techniker', (-9.4, -1.2, 0), 1.2)):
        if nm in bpy.data.objects: o = bpy.data.objects[nm]; o.location = loc; o.rotation_euler = (0, 0, yaw)
    for nm, loc, tgt, lens in (('Schraeg', (17.5, 13.5, 7.6), (0.4, 0, 2.5), 45), ('Hangar', (14.5, 10.5, 4.0), (0.2, 0.6, 2.3), 30), ('Heck', (-17.5, -11.5, 6.0), (-4.0, 0, 2.6), 40),
                               ('Cockpit', (7.9, 0.9, 4.4), (7.0, -0.05, 2.7), 24), ('Detail', (4.6, 6.6, 2.3), (1.0, 1.8, 1.6), 32), ('Weltraum', (17.0, -12.5, 7.0), (0.0, 0, 2.6), 45)):
        c = CAMS[nm]; c.location = loc; c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lens
    CAMS['Seite'].location = (1.0, 60, 2.7); CAMS['Front'].location = (60, 0, 2.6); CAMS['Front'].data.ortho_scale = 11; CAMS['Seite'].data.ortho_scale = 20
    CAMS['Draufsicht'].data.ortho_scale = 20; CAMS['Draufsicht'].location = (1.0, 0, 60)
    cam('Fahrwerk', (8.6, 2.8, 0.8), (6.6, 0.0, 1.0), 30); cam('Fahrwerk hinten', (-1.0, 5.2, 0.7), (-2.3, 2.0, 0.65), 32); cam('Cockpit innen', (6.12, 0.32, 3.42), (7.9, -0.05, 2.75), 22)
    cam('Fracht', (-12.6, -2.8, 3.4), (-4.0, 0, 2.3), 30); cam('Unten', (6.5, 7.0, -4.0), (0.0, 0, 2.0), 38); cam('Einstieg', (4.2, 6.4, 2.2), (1.0, 1.6, 1.8), 30)
    global VIEWS
    V6 = {
        'schraeg': ('Schraeg', 'grau', True, 0.0, 0.0, {}), 'draufsicht': ('Draufsicht', 'grau', True, 0.2, 0.0, {}), 'seite': ('Seite', 'grau', True, 0.9, 0.0, {}),
        'front': ('Front', 'grau', True, 0.7, 0.0, {}), 'heck': ('Heck', 'grau', True, 0.1, 0.0, {}), 'hangar': ('Hangar', 'hangar', True, 0.4, 0.0, {'tuer': 1.0, 'rampe': 1.0, 'kiste': True}),
        'cockpit': ('Cockpit', 'grau', True, 0.3, 0.0, {}), 'detail': ('Detail', 'grau', True, 0.2, 0.0, {'tuer': 1.0}),
        'weltraum': ('Weltraum', 'weltraum', True, 0.0, 6.0, {'fw': 1.0}), 'unten': ('Unten', 'grau', True, 0.6, 0.0, {'fw': 1.0}),
        'fahrwerk': ('Fahrwerk', 'grau', True, 0.3, 0.0, {}), 'fahrwerk2': ('Fahrwerk hinten', 'grau', True, 0.3, 0.0, {}),
        'fracht': ('Fracht', 'hangar', True, 0.6, 0.0, {'rampe': 1.0, 'kiste': True}), 'einstieg': ('Einstieg', 'grau', True, 0.2, 0.0, {'tuer': 1.0}),
        'halb': ('Schraeg', 'grau', True, 0.0, 0.0, {'fw': 0.55}), 'cockpit2': ('Cockpit innen', 'grau', True, 0.3, 0.0, {}),
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
