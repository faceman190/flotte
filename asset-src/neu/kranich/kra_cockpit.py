# Kranich: Cockpit in voller Ausführung, im Schiffsmodell selbst (wird von kra_kit.py in build() nach kra_innen.py ausgeführt).
# Wunsch des Nutzers: „Für den Innenraum und Cockpit soll alles im Modell passen … keine Lücken lassen. Das volle Cockpitmodell mit ins Schiffspaket bauen.“
# Gebaut mit dem Cockpit-Baukasten Stil 2 (../cockpit/cp_lib.py, cp_teile.py) in dessen eigenem Namensraum (CP), damit gleichnamige Werkzeuge
# des Innenraums (platten …) nicht überschrieben werden.
# Koordinaten: Der Baukasten baut in „Bau-Koordinaten“ (X rechts, Y nach vorn, Z oben). Der unterste Rahmen bildet sie auf den Schiffsbaukasten ab
# (X nach vorn, Y Backbord): kit = (Y, −X, Z), also eine Drehung um −90° um Z; Ursprung gleich. Für den Export der Ich-Sicht (kra_export_cockpit.py)
# werden die Teile in die Mitte des Spielmodells verschoben.
# Aufbau (kit-x): Schott mit Tür bei 8,6 (Boden FL), drei Stufen bis 9,5 hinauf auf FLC; zwei Plätze nebeneinander (links der Spieler), Augpunkt
# bei x 11,35; Mittelkonsole; Seitenbänke zwischen Armkonsole und Wand; Geräteschränke hinter den Sitzen; Deck unter der Scheibe bis in die Nase;
# Innenhaut aus dem Rumpf versetzt, Laibung und tiefe Streben an der Verglasung; Deckenkonsole unter der Mittelstrebe.
import bpy, bmesh, math, json
from mathutils import Vector, Matrix
CP = {}
for _f in ('cp_lib.py', 'cp_teile.py'):
    _p = os.path.join(HIER, '..', 'cockpit', _f); exec(compile(open(_p, encoding='utf-8').read(), _f, 'exec'), CP)
BASIS = Matrix.Rotation(-PI / 2, 4, 'Z')      # Bau → kit
CP['STAPEL'][0] = BASIS.copy()
for _n in ('quader', 'prisma', 'keil', 'zyl', 'kugel', 'rohr', 'flaeche', 'schrift', 'Platz', 'SAM', 'mat', 'MAT', 'Marke', 'welt', 'stab', 'schraube', 'tastenfeld',
           'anzeige', 'schubhebel', 'sitz', 'warnkreis', 'warndreieck', 'schild', 'lichtleiste', 'kabel', 'lueftung', 'griffleiste', 'armkonsole', 'pedale', 'pultmodul', '_ab'):
    globals()['c_' + _n] = CP[_n]
cplatten = CP['platten']
CP['stil_materialien'](akzent=(0.32, 0.03, 0.02))      # Akzent im Kronenrot des Kranichs
for _n in ('Lage', 'Systeme', 'Ziel', 'Antrieb', 'Fracht', 'Band', 'Energie', 'Funk', 'Funk2', 'Karte', 'Schiff', 'Waffen'): c_mat('Schirm ' + _n, (0.0, 0.0, 0.0), 0.0, 0.2, (0.25, 0.6, 1.0), 2.2)
c_mat('Schirm Holo', (0, 0, 0), 0.0, 0.1, alpha=0.0)
C_CP = bpy.data.collections.new('Cockpit Kranich'); SC.collection.children.link(C_CP)      # Sammlung „Cockpit“ ist schon der Innenraum (wue_kit C_ROOM)

def kb(v): return Vector((-v[1], v[0], v[2]))      # kit → Bau
def bk(v): return Vector((v[1], -v[0], v[2]))      # Bau → kit
def kit_netz(bm, m):
    """bmesh in kit-Koordinaten in den Sammler (in Bau-Koordinaten umgerechnet; der Sammler dreht wieder zurück)"""
    bmesh.ops.transform(bm, matrix=BASIS.inverted(), verts=bm.verts); c__ab(bm, m)

AUGE_K = Vector((11.35, 0.78, FLC + 1.2))       # Augpunkt (kit), linker Sitz
PULT_TIEF = 0.2      # Pult und Mittelkonsole so viel tiefer als im Baukasten (Sicht über die Nase)
AUGE = kb(AUGE_K)                               # Bau
BODEN = FLC - AUGE_K.z
XS_STUFE = 9.95                                 # Ende der Stufen, ab hier Cockpitboden

# ---------- Innenhaut, Verglasung von innen ----------
def glas_rand(k_x=1.0, k_t=1.0, n=240):
    """Rand der Verglasungsmaske als (x, t), mit Faktoren für Länge und Winkel (Flansch innen/außen)"""
    R = []
    for k in range(n):
        a = 2 * PI * k / n; c, s = math.cos(a), math.sin(a)
        xs = math.copysign(abs(c) ** (2 / GP), c); x = GX + (GH if xs < 0 else GH_V) * xs * k_x; tw = GT * (1.0 + 0.16 * max(0.0, xs)) * k_t
        R.append((x, math.copysign(abs(s) ** (2 / GP), s) * tw))
    return R
def cockpit_haut():
    x0, x1 = X_WOHN1 + 0.04, 15.55; nt = 64
    bm = bmesh.new(); n = int((x1 - x0) / 0.1); R = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n; tf = abs(t_at(x, FL)); R.append([(x, -tf + 2 * tf * j / nt) for j in range(nt + 1)])
    V = {}
    def v(i, j):
        if (i, j) not in V: V[(i, j)] = bm.verts.new(ipt(*R[i][j]))
        return V[(i, j)]
    for i in range(n):
        for j in range(nt):
            xm = (R[i][j][0] + R[i + 1][j][0]) / 2; tm = (R[i][j][1] + R[i][j + 1][1]) / 2
            if glas_g(xm, tm) < 1.0: continue
            bm.faces.new((v(i, j), v(i, j + 1), v(i + 1, j + 1), v(i + 1, j)))
    bm.normal_update(); sc = 0
    for f in bm.faces[:60]:
        c = f.calc_center_median(); sc += f.normal.dot(Vector((0, -c.y, zc_of(c.x) - c.z)))
    if sc < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    kit_netz(bm, 'Verkleidung')
    # Flansch auf der Innenhaut um die Verglasung (deckt die gestuften Lochkanten) und Laibung bis zum Glas
    A = glas_rand(0.995, 0.99); Bq = glas_rand(1.03, 1.05); bm = bmesh.new()      # Flansch innen schmal: verdeckt kaum Glas
    def inn(x, t, lift): return ipt(x, t) - hull_normal(x, t) * lift
    ra = [bm.verts.new(inn(x, t, 0.014)) for x, t in A]; rb = [bm.verts.new(inn(x, t, 0.014)) for x, t in Bq]
    ro = [bm.verts.new(hull_point(x, t) + hull_normal(x, t) * 0.004) for x, t in A]; nA = len(A)
    for i in range(nA):
        j = (i + 1) % nA
        f = bm.faces.new((rb[i], rb[j], ra[j], ra[i])); f.normal_update(); c = f.calc_center_median()
        if f.normal.dot(Vector((0, -c.y, zc_of(c.x) - c.z))) < 0: f.normal_flip()
        f = bm.faces.new((ra[i], ra[j], ro[j], ro[i])); f.normal_update(); c = f.calc_center_median()
        if f.normal.dot(Vector((GX - c.x, -c.y * 0.3, 0))) < 0 and abs(c.y) > 0.3: f.normal_flip()
    kit_netz(bm, 'Rahmen')
    # tiefe Streben: von der Außenhaut bis zur Innenhaut, Mittelstrebe, zwei Seitenstreben, Querspant
    def strebe(pts, w):
        bm = bmesh.new(); rows = []
        for x, t in pts:
            d = (hull_point(x, t + 0.01) - hull_point(x, t - 0.01)).normalized() * (w / 2)
            po, pi = hull_point(x, t) + hull_normal(x, t) * 0.01, hull_point(x, t) - hull_normal(x, t) * 0.06      # flach: tiefe Streben wirkten schräg gesehen dick
            rows.append([bm.verts.new(p) for p in (po - d, po + d, pi + d, pi - d)])
        for a, b in zip(rows, rows[1:]):
            for k in range(4): bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
        bm.faces.new(rows[0]); bm.faces.new(list(reversed(rows[-1])))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); kit_netz(bm, 'Rahmen')
    X0, X1 = GX - GH, GX + GH_V
    for t0, w, xmax in ((0.0, 0.045, 11.6), (1.02, 0.05, 99), (-1.02, 0.05, 99)):      # wie die Pfosten außen (kra_kit.py glazing)
        pts = [(X0 + (X1 - X0) * i / 80, t0) for i in range(81)]; pts = [p for p in pts if glas_g(p[0], p[1]) < 1.02 and p[0] <= xmax]
        if len(pts) > 2: strebe(pts, w)
    tb = GT * (1 - abs((11.15 - GX) / GH) ** GP) ** (1 / GP); strebe([(11.15, -tb * 1.02 + 2 * tb * 1.02 * i / 50) for i in range(51)], 0.05)

# ---------- Boden, Stufen, Schott ----------
def boden():
    # Grund mit dem Umriss der Innenhaut auf Cockpitboden-Höhe (schließt an die Wand), darauf Platten und ein Gitterrost-Mittelgang
    bm = bmesh.new(); L = []; Rr = []; xa, xb = XS_STUFE - 0.02, 13.0; n = 30
    for i in range(n + 1):
        x = xa + (xb - xa) * i / n; w = half_w(x, FLC); L.append(bm.verts.new((x, w, FLC - 0.002))); Rr.append(bm.verts.new((x, -w, FLC - 0.002)))
    for i in range(n): bm.faces.new((Rr[i], Rr[i + 1], L[i + 1], L[i]))
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    kit_netz(bm, 'Rumpf innen')
    yv = AUGE.y + 0.98      # Stirnwand unter dem Pult (Bau-Y)
    cplatten('Bodenrost', (-0.3, XS_STUFE, FLC), (0.3, XS_STUFE, FLC), (0.3, yv, FLC), (-0.3, yv, FLC), 2, 6, 0.012, 0.006, 0.003)
    for s in (-1, 1):
        for ya, yb in ((XS_STUFE, 10.4), (10.4, 11.3), (11.3, 12.2)):
            w = min(half_w(ya, FLC), half_w(yb, FLC)) - 0.04
            a, b, c, d = (s * 0.31, ya, FLC), (s * w, ya, FLC), (s * w, yb, FLC), (s * 0.31, yb, FLC)
            if s > 0: cplatten('Formteil hell', a, b, c, d, 3, 2, 0.012, 0.006, 0.003)
            else: cplatten('Formteil hell', b, a, d, c, 3, 2, 0.012, 0.006, 0.003)
        c_lichtleiste('Licht Warm', (s * 0.315, XS_STUFE + 0.15, FLC + 0.012), (s * 0.315, AUGE.y + 0.6, FLC + 0.012), 0.006, 0.004)
    # Stufen von FL auf FLC (drei), Gitterrost mit gelber Kante, Seitenwangen; daneben ist der Boden auf FLC (Schränke stehen darauf)
    hb = 0.5; n = 5; dz = (FLC - FL) / n; xs = [X_WOHN1 + 0.12 + k * (XS_STUFE - X_WOHN1 - 0.12) / n for k in range(n + 1)]      # erste Stufe hinter dem Türsturz (Kopfhöhe)
    c_quader('Metall', (2 * hb + 0.1, 0.24, 0.012), (0, X_WOHN1 + 0.0, FL + 0.006), 0.003)      # Schwelle in der Tür (sonst Spalt zwischen Gangboden und erster Stufe)
    for k in range(n):
        z = FL + dz * (k + 1)
        c_quader('Formteil', (2 * hb, XS_STUFE - xs[k], dz * (k + 1)), (0, (xs[k] + XS_STUFE) / 2, FL + dz * (k + 1) / 2), 0.006)
        cplatten('Bodenrost', (-hb + 0.02, xs[k] + 0.01, z), (hb - 0.02, xs[k] + 0.01, z), (hb - 0.02, xs[k + 1] - 0.01, z), (-hb + 0.02, xs[k + 1] - 0.01, z), 2, 1, 0.01, 0.006, 0.003)
        c_quader('Warngelb', (2 * hb - 0.04, 0.035, 0.006), (0, xs[k] + 0.03, z + 0.012), 0.002)
    for s in (-1, 1):
        c_quader('Formteil hell', (0.04, XS_STUFE - X_WOHN1 - 0.04, FLC - FL + 0.05), (s * (hb + 0.02), (X_WOHN1 + XS_STUFE) / 2 + 0.02, (FL + FLC) / 2 + 0.02), 0.006)
        w = half_w(9.0, FLC); c_quader('Formteil hell', (w - hb - 0.04, XS_STUFE - X_WOHN1 - 0.04, 0.012), (s * (hb + 0.04 + (w - hb - 0.04) / 2), (X_WOHN1 + XS_STUFE) / 2 + 0.02, FLC + 0.006), 0.003)
        c_griffleiste((s * (hb + 0.06), X_WOHN1 + 0.25, FLC + 0.25), (s * (hb + 0.06), XS_STUFE - 0.1, FLC + 0.85), 0.014, n=(-s, 0, 0))
    # Schott Wohnteil/Cockpit: zum Gang hell wie die übrigen Schotten, zum Cockpit dunkles Futter (Tür auf FL, 1,0 × 2,1 m)
    schott('Schott Wohnteil', X_WOHN1 - 0.03, FL, [(0.0, 1.0, 2.1)], M['i_feld'], dicke=0.05)
    schott('Schott Cockpit', X_WOHN1 + 0.0, FL, [(0.0, 1.0, 2.1)], c_MAT['Verkleidung'], dicke=0.0, rahmen=False, col=C_CP)
    for s in (-1, 1): c_quader('Rahmen', (0.08, 0.1, 2.1), (s * 0.54, X_WOHN1 + 0.05, FL + 1.05), 0.014)
    c_quader('Rahmen', (1.16, 0.1, 0.08), (0, X_WOHN1 + 0.05, FL + 2.14), 0.014); c_lichtleiste('Licht Kalt', (-0.4, X_WOHN1 + 0.1, FL + 2.2), (0.4, X_WOHN1 + 0.1, FL + 2.2), 0.008, 0.004)
    with c_Platz((0, X_WOHN1 + 0.11, FL + 2.3), 0, 0, 180): c_schild('WOHNTEIL · TECHNIK · LADERAUM', (0, 0, 0), 0.03)

# ---------- Plätze ----------
def station(x0, links):
    with c_Platz((x0, AUGE.y, AUGE.z)):
        c_sitz((0, -0.02, -0.8), sockel=-BODEN - 0.82)
        gr = c_armkonsole(1, -0.42, 0.56, 0.26, 0.56, -0.5, BODEN, 'Energie' if links else 'Waffen', beweglich=links)
        gl = c_armkonsole(-1, -0.42, 0.56, 0.26, 0.56, -0.5, BODEN, 'Funk2' if links else 'Energie', beweglich=links)
        with c_Platz((0, 0.03, -PULT_TIEF)): c_pultmodul(BODEN + PULT_TIEF, sockel=False, fluegel=(links, not links), aussen=('Antrieb' if links else None, None if links else 'Fracht'))
        c_pedale((0, 0.86, BODEN + 0.03), 0.15)
        c_prisma('Formteil', [(-0.5, 0.0), (0.5, 0.0), (0.5, 0.5 - PULT_TIEF), (-0.5, 0.5 - PULT_TIEF)], 0.06, (0, 1.01, BODEN), fase=0.01, achse='Y')
        if links: c_flaeche('Schirm Holo', [(-0.8, 1.6, -0.14), (0.8, 1.6, -0.14), (0.8, 1.6, 0.38), (-0.8, 1.6, 0.38)], uv=True)
        return gl, gr
def mitte():
    with c_Platz((0, AUGE.y + 0.03, AUGE.z - PULT_TIEF)):
        c_prisma('Formteil', [(0.0, -0.62), (0.3, -0.62), (0.3, -0.02), (0.14, 0.0), (0.03, -0.1), (0.0, -0.34)], 0.56, (0, 0.775, -0.19), fase=0.014, achse='X')
        c_prisma('Gummi', [(-0.28, 0.0), (0.28, 0.0), (0.26, 0.04), (-0.26, 0.04)], 0.2, (0, 0.8, -0.185), fase=0.012, seg=2, achse='Y')
        c_anzeige('Karte', 0.3, 0.2, (0, 0.735, -0.36), rx=-16, tief=0.06, haube=0.028, tasten=6)
        c_prisma('Formteil', [(-0.24, BODEN), (0.68, BODEN), (0.68, -0.62), (0.1, -0.735), (0.08, -0.62), (-0.24, -0.62)], 0.44, (0, 0, 0), fase=0.012, achse='X')
        with c_Platz((0, 0.36, -0.665), -79, 0, 0):
            c_quader('Formteil hell', (0.4, 0.012, 0.54), (0, 0, 0), 0.005)
            c_anzeige('Schiff', 0.25, 0.18, (0, -0.012, 0.14), rx=0, tief=0.016, haube=0.0, tasten=5, schrauben=False)
            c_tastenfeld(6, 2, 0.28, 0.06, (0, -0.006, -0.045), 0.45)
            for s in (-1, 1):
                c_zyl('Metall', 0.02, 0.014, (s * 0.15, -0.012, -0.13), 'Y', 18, 0.003); c_zyl('Gummi', 0.016, 0.014, (s * 0.15, -0.024, -0.13), 'Y', 14, 0.002)
                c_quader('Warnrot', (0.024, 0.016, 0.032), (s * 0.06, -0.014, -0.13), 0.004); c_schild(('SPRUNG', 'HUB')[s > 0], (s * 0.06, -0.0065, -0.162), 0.007)
            c_schild('ANTRIEB', (-0.15, -0.0065, -0.168), 0.007); c_schild('SCHILD', (0.15, -0.0065, -0.168), 0.007)
            for sx in (-1, 1):
                for sz in (-1, 1): CP['schraube']((sx * 0.185, -0.006, sz * 0.255))
        for s in (-1, 1): c_schubhebel((s * 0.09, -0.07, -0.616), s)
        c_quader('Formteil hell', (0.38, 0.26, 0.008), (0, -0.07, -0.618), 0.003)
        for s in (-1, 1): c_lichtleiste('Licht Kalt', (s * 0.215, -0.16, -0.66), (s * 0.215, 0.5, -0.66), 0.005, 0.004)
    # Deckenkonsole unter der Mittelstrebe, zwischen den Sitzen
    yk = 10.75; zo = ipt(yk, 0.0).z - 0.06
    with c_Platz((0, yk, zo), 6, 0, 0):
        c_prisma('Formteil', [(-0.2, 0.0), (0.2, 0.0), (0.16, -0.07), (-0.16, -0.07)], 0.9, (0, 0, 0), fase=0.012, achse='Y')
        with c_Platz((0, 0, -0.072), 90, 0, 0):
            c_quader('Formteil hell', (0.3, 0.008, 0.8), (0, 0, 0), 0.003)
            for k in range(9):
                for j in range(3):
                    x, zz = -0.09 + j * 0.09, -0.32 + k * 0.07; c_zyl('Metall', 0.006, 0.006, (x, -0.007, zz), 'Y', 8); c_stab('Metall blank', (x, -0.008, zz), (x, -0.026, zz + (0.008 if (k + j) % 2 else -0.008)), 0.004, 0.004, 0.001)
            for k in range(9): c_quader(('Licht Kalt', 'Licht Gruen', 'Licht Kalt', 'Licht Warm')[k % 4], (0.012, 0.002, 0.006), (-0.135, -0.005, -0.32 + k * 0.07), 0)
            c_schild('HUB · SCHWEBEN · STEUERDÜSEN', (0.0, -0.006, 0.36), 0.008)
        for s in (-1, 1): c_zyl('Formteil hell', 0.035, 0.03, (s * 0.12, -0.5, -0.05), 'Z', 18, 0.006); c_zyl('Licht Warm', 0.022, 0.004, (s * 0.12, -0.5, -0.067), 'Z', 14)

# ---------- Seitenbänke, Schränke, Wandgeräte ----------
def wand_kontur(ya, yb, z0, z1, n=8, plus=0.05):
    """Außenkante eines Einbaus: folgt der Innenhaut (kleinste Breite zwischen ya und yb, Bau-Y = kit-x) und reicht 5 cm in die Wand"""
    return [(min(half_w(x, z) for x in (ya, (ya + yb) / 2, yb)) + plus, z - FLC) for z in (z0 + (z1 - z0) * k / n for k in range(n + 1))]
def seiten():
    zb = AUGE.z - 0.48      # Oberkante der Bänke (etwas unter der Armauflage)
    for s in (-1, 1):      # s im Bau: −1 links (Backbord), +1 rechts
        xi = 1.42; ya, yb = 9.75, 12.05
        # Körper bis in die Wand, in Abschnitten: die Außenkante folgt der Innenhaut (vorn wird der Rumpf schmaler), schräge Oberkante zur Wand hin
        nseg = 5
        for k in range(nseg):
            y0, y1 = ya + (yb - ya) * k / nseg, ya + (yb - ya) * (k + 1) / nseg
            q = [(xi, 0.0)] + wand_kontur(y0, y1, FLC, zb + 0.1) + [(xi + 0.06, zb - FLC), (xi, zb - FLC - 0.05)]
            if s < 0: q = [(-x, z) for x, z in reversed(q)]
            c_prisma('Formteil', q, y1 - y0 + 0.002, (0, (y0 + y1) / 2, FLC), fase=0.004 if 0 < k < nseg - 1 else 0.012, achse='Y')
        # Deckplatten mit Tastenfeldern, kleine Anzeige, Leuchten
        wtop = min(half_w(bk((s * 1.8, ya, 0)).x, zb), half_w(bk((s * 1.8, yb, 0)).x, zb))
        for k, (y0, y1) in enumerate(((ya + 0.04, 10.6), (10.62, 11.4), (11.42, yb - 0.04))):
            xm = s * (xi + 0.06 + (wtop - xi - 0.12) / 2); bw = max(0.1, wtop - xi - 0.16)
            c_quader('Formteil hell', (bw, y1 - y0, 0.008), (xm, (y0 + y1) / 2, zb + 0.004), 0.003)
            with c_Platz((xm, (y0 + y1) / 2, zb + 0.009), 90, 0, 0):
                if k == 0: c_tastenfeld(3, 4, min(0.18, bw - 0.06), 0.3, (0, 0, 0), 0.45); c_schild(('LUFT · DRUCK', 'BELADUNG')[s > 0], (0, -0.0065, -0.19), 0.008)
                elif k == 1: c_anzeige(('Systeme', 'Ziel')[s > 0], min(0.2, bw - 0.08), 0.14, (0, -0.01, 0.05), rx=60, tief=0.03, haube=0.0, tasten=3, schrauben=False)
                else: c_lueftung((0, -0.01, 0.1), 0.04); c_tastenfeld(2, 3, 0.1, 0.12, (0, 0, -0.1), 0.35)
        c_lichtleiste('Licht Kalt', (s * (xi + 0.01), ya + 0.08, zb - 0.06), (s * (xi + 0.01), yb - 0.08, zb - 0.06), 0.005, 0.004)
        c_stab('Akzent', (s * (xi + 0.004), ya + 0.1, zb - 0.16), (s * (xi + 0.004), yb - 0.4, zb - 0.16), 0.004, 0.014, 0.001)
        with c_Platz((s * (xi - 0.001), (ya + yb) / 2, (FLC + zb) / 2), 0, 0, -s * 90):
            c_quader('Formteil hell', ((yb - ya) * 0.5, 0.006, 0.3), (0, 0, 0), 0.004)
            for sx in (-1, 1):
                for sz in (-1, 1): CP['schraube']((sx * ((yb - ya) * 0.25 - 0.014), -0.003, sz * 0.13))
            CP['warnkreis'](((yb - ya) * 0.19, -0.0035, -0.09), 0.016)
        # Wand über der Bank: Leiste, Griff, Feuerlöscher (links) / Erste Hilfe (rechts)
        y = 10.2; z = zb + 0.25; w = half_w(y, z) - 0.03
        with c_Platz((s * w, y, z), 0, 0, -s * 90):
            if s < 0:
                c_zyl('Warnrot', 0.05, 0.32, (0, -0.07, 0.0), 'Z', 16, 0.012); c_zyl('Metall', 0.018, 0.05, (0, -0.07, 0.18), 'Z', 10, 0.004); c_quader('Metall', (0.12, 0.012, 0.02), (0, -0.012, -0.05), 0.003)
            else:
                c_quader('Formteil', (0.26, 0.09, 0.2), (0, -0.045, 0), 0.012); c_quader('Warnrot', (0.06, 0.004, 0.018), (0, -0.092, 0.02), 0.001); c_quader('Warnrot', (0.018, 0.004, 0.06), (0, -0.092, 0.02), 0.001)
        c_griffleiste((s * (half_w(11.5, zb + 0.55) - 0.05), 11.0, zb + 0.55), (s * (half_w(11.9, zb + 0.5) - 0.05), 11.9, zb + 0.5), 0.012, n=(-s, 0, 0))
def schraenke():
    # hinter den Sitzen an den Wänden: links Geräteschrank mit Leuchten, rechts Steh-Pult (Sensoren/Bordwaffen)
    for s in (-1, 1):
        ya, yb = X_WOHN1 + 0.2, 10.35; xi = 1.12; z1 = FLC + 1.75      # stehen auf dem erhöhten Boden neben den Stufen
        w = min(half_w(ya, z1), half_w(yb, z1))
        q = [(xi, 0.0)] + wand_kontur(ya, yb, FLC, z1) + [(xi, 1.62)] if s < 0 else [(xi, 0.0)] + wand_kontur(ya, yb, FLC, FLC + 1.0) + [(xi + 0.25, 1.0), (xi, 0.92)]
        if s < 0: q = [(-x, z) for x, z in reversed(q)]
        c_prisma('Formteil', q, yb - ya, (0, (ya + yb) / 2, FLC), fase=0.014, achse='Y')
        with c_Platz((s * xi, (ya + yb) / 2, FLC), 0, 0, -s * 90):
            if s < 0:
                for k in range(3):
                    c_quader('Formteil hell', ((yb - ya) * 0.28, 0.012, 1.4), (-(yb - ya) * 0.3 + k * (yb - ya) * 0.3, -0.006, 0.82), 0.006)
                    for j in range(5): c_quader(('Licht Kalt', 'Licht Gruen', 'Licht Kalt', 'Licht Warm', 'Licht Rot')[(j + k) % 5], (0.03, 0.003, 0.008), (-(yb - ya) * 0.3 + k * (yb - ya) * 0.3 - 0.06, -0.013, 1.42 - j * 0.05), 0)
                    CP['griffleiste']((-(yb - ya) * 0.3 + k * (yb - ya) * 0.3 + 0.07, -0.012, 0.6), (-(yb - ya) * 0.3 + k * (yb - ya) * 0.3 + 0.07, -0.012, 0.9), 0.009)
                c_schild('ENERGIEVERTEILUNG', (0, -0.013, 1.56), 0.012)
            else:
                with c_Platz((0, -0.12, 1.0), -62, 0, 0):
                    c_quader('Formteil hell', (yb - ya - 0.08, 0.012, 0.3), (0, 0, 0), 0.004)
                    c_anzeige('Waffen', 0.3, 0.17, (0, -0.012, 0.04), rx=0, tief=0.02, haube=0.0, tasten=5, schrauben=False)
                    c_tastenfeld(5, 1, 0.3, 0.03, (0, -0.006, -0.11), 0.5)
                c_lichtleiste('Licht Kalt', (-(yb - ya) / 2 + 0.06, -0.01, 0.9), ((yb - ya) / 2 - 0.06, -0.01, 0.9), 0.005, 0.004)
                c_quader('Formteil hell', (yb - ya - 0.1, 0.012, 0.6), (0, -0.006, 0.45), 0.006)
                c_lueftung((0.12, -0.012, 0.6), 0.04); c_schild('SENSOREN · BORDWAFFEN', (0, -0.013, 0.2), 0.012)
                # Wand darüber: Bildschirm an Schwenkarm
                c_stab('Metall', (0.0, -0.02, 1.25), (0.0, -0.22, 1.32), 0.03, 0.03, 0.006)
                with c_Platz((0.0, -0.26, 1.36), -8, 0, 0): c_anzeige('Karte', 0.3, 0.19, (0, 0, 0), rx=0, tief=0.04, haube=0.02, tasten=4)
# ---------- Deck unter der Scheibe ----------
def deck():
    X = [12.1 + k * 0.1 for k in range(35)]      # bis 15,5
    def rand_z(x):
        xs = glas_xs(x)
        if abs(xs) >= 1: return 9.0
        tw = GT * (1.0 + 0.16 * max(0.0, xs)); te = tw * (1 - abs(xs) ** GP) ** (1 / GP); return hull_point(x, te).z
    zr = [rand_z(x) - 0.06 if x <= 14.9 else None for x in X]      # Unterkante des Glases; vorn steigt sie zur Spitze, das Deck nicht
    last = next(z for z in reversed(zr) if z is not None); Z = []; zmin = last
    for z in reversed(zr): zmin = min(zmin, z if z is not None else last); Z.append(zmin)
    Z = list(reversed(Z)); bm = bmesh.new(); L = []; Rr = []
    for x, z in zip(X, Z):
        w = half_w(x, z) - 0.005 if ipt(x, 0.0).z > z + 0.05 else 0.02
        L.append(bm.verts.new((x, w, z))); Rr.append(bm.verts.new((x, -w, z)))
    for i in range(len(X) - 1): bm.faces.new((Rr[i], Rr[i + 1], L[i + 1], L[i]))
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    kit_netz(bm, 'Verkleidung')
    # Mittelrücken mit Sensoren und Leitungen, Schlitze an der Scheibe
    for i in range(0, len(X) - 6, 4):
        c_stab('Formteil', (0, X[i], Z[i] + 0.03), (0, X[i + 4], Z[i + 4] + 0.03), 0.2, 0.06, 0.014)
    for y in (12.9, 13.6, 14.2):
        k = int((y - 12.1) / 0.1); z = Z[k]; c_kugel('Schirmglas', 0.05, (0, y, z + 0.07), 16, (1, 1.3, 0.6)); c_zyl('Metall', 0.06, 0.012, (0, y, z + 0.06), 'Z', 20, 0.003)
    for s in (-1, 1):
        for k in range(4):
            y = 12.6 + k * 0.45; i = int((y - 12.1) / 0.1); w = half_w(y, Z[i])
            if w > 0.6: c_quader('Schirmglas', (0.3, 0.02, 0.004), (s * w * 0.62, y, Z[i] + 0.004), 0.001)
    with c_Platz((0, 12.35, Z[2] + 0.012), -90, 0, 0): c_schild('KRANICH · KR-1', (0, 0, 0), 0.02)
def lichter_bild():
    for nm, p, w, c in (('Cockpitlicht', (10.2, 0, FLC + 1.9), 30, (0.6, 0.75, 1.0)), ('Pultlicht', (11.9, 0, FLC + 0.9), 12, (0.5, 0.7, 1.0))):
        point(nm, p, w, c, 0.1)

cockpit_haut(); boden(); gl, gr = station(AUGE.x, True); station(-AUGE.x, False); mitte(); seiten(); schraenke(); deck()
c_SAM.fertig(C_CP, 'cp')
lichter_bild()
ANCH['auge'] = AUGE_K.copy(); ANCH['griffe'] = [[round(v, 4) for v in gl], [round(v, 4) for v in gr]]
# Ansichten aus dem Cockpit (Glas ausgeblendet, siehe view())
cam('Cockpit vorn', tuple(AUGE_K), tuple(AUGE_K + Vector((3.0, -0.1, -0.5))), 14)
cam('Cockpit rechts', tuple(AUGE_K), tuple(AUGE_K + Vector((1.2, -2.6, -0.7))), 14)
cam('Cockpit hinten', (13.2, 0.0, FLC + 1.3), (9.0, 0.0, FLC + 0.5), 14)
cam('Cockpit Gang', (6.4, 0.0, FL + 1.65), (11.0, 0.0, FLC + 0.9), 16)
IN_VIEWS.update({'cp_vorn': ('Cockpit vorn', 'grau', True, 0.0, 0.0, {}), 'cp_rechts': ('Cockpit rechts', 'grau', True, 0.0, 0.0, {}),
                 'cp_hinten': ('Cockpit hinten', 'grau', True, 0.0, 0.0, {}), 'in_cpgang': ('Cockpit Gang', 'grau', True, 0.0, 0.0, {})})
