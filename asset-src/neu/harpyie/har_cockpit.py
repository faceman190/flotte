# Harpyie: Cockpit in voller Ausführung im Schiffsmodell (wird von har_kit.py in build() nach har_innen.py ausgeführt).
# Wie beim Kranich mit dem Cockpit-Baukasten Stil 2 (../cockpit/cp_lib.py, cp_teile.py) im eigenen Namensraum CP; Bau-Koordinaten
# (X rechts, Y vorn) → Schiff (X vorn, Y Backbord) über BASIS (−90° um Z).
# Sicht: Cockpitboden ZC 4,1 im Kanzelbuckel, Augpunkt 1,2 m darüber bei x 14,55, knapp 1,8 m hinter der Unterkante der Frontscheibe;
# Pult 0,3 m tiefer als im Baukasten; die Treppe aus dem Truppenraum kommt hinten mittig an (Schott bei XS0).
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
CP['stil_materialien'](akzent=(0.5, 0.34, 0.02))      # Akzent im Warngelb der Harpyie
for _n in ('Lage', 'Systeme', 'Ziel', 'Antrieb', 'Fracht', 'Band', 'Energie', 'Funk', 'Funk2', 'Karte', 'Schiff', 'Waffen'): c_mat('Schirm ' + _n, (0.0, 0.0, 0.0), 0.0, 0.2, (0.25, 0.6, 1.0), 2.2)
c_mat('Schirm Holo', (0, 0, 0), 0.0, 0.1, alpha=0.0)
C_CP = bpy.data.collections.new('Cockpit Harpyie'); SC.collection.children.link(C_CP)

def kb(v): return Vector((-v[1], v[0], v[2]))      # kit → Bau
def bk(v): return Vector((v[1], -v[0], v[2]))      # Bau → kit
def kit_netz(bm, m):
    bmesh.ops.transform(bm, matrix=BASIS.inverted(), verts=bm.verts); c__ab(bm, m)

AUGE_K = Vector((14.55, 0.62, ZC + 1.2))       # Augpunkt (kit), linker Sitz
PULT_TIEF = 0.3
AUGE = kb(AUGE_K)
BODEN = ZC - AUGE_K.z
XFRONT = 16.2                                  # Stirnwand innen (kit-x)

def cockpit_haut():
    bm, bl = block_haut(i_bei(XS0 - 0.04), NXB, lambda x: ZC, kappe=True)
    kit_netz(bm, 'Verkleidung'); kit_netz(bl, 'Rahmen')
    bm = bmesh.new()
    for P, N in RAHMEN_INNEN: streifen(bm, P, N, 0.11, 0.004, 0.03)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); kit_netz(bm, 'Rahmen')

def boden():
    # Grund mit dem Umriss der Innenhaut, Platten, Gitterrost-Mittelgang zwischen den Sitzen
    bm = bmesh.new(); L = []; Rr = []; xa, xb = XS0 - 0.02, XFRONT; n = 30
    for i in range(n + 1):
        x = xa + (xb - xa) * i / n; w = bhw(x, ZC + 0.01) + 0.02; L.append(bm.verts.new((x, w, ZC - 0.002))); Rr.append(bm.verts.new((x, -w, ZC - 0.002)))
    for i in range(n): bm.faces.new((Rr[i], Rr[i + 1], L[i + 1], L[i]))
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    kit_netz(bm, 'Rumpf innen')
    yv = AUGE.y + 0.98
    cplatten('Bodenrost', (-0.3, XS0 + 0.3, ZC), (0.3, XS0 + 0.3, ZC), (0.3, yv, ZC), (-0.3, yv, ZC), 2, 7, 0.012, 0.006, 0.003)
    for s in (-1, 1):
        for ya, yb in ((XS0 + 0.3, 14.0), (14.0, 14.8), (14.8, 15.6)):
            w = min(bhw(ya, ZC + 0.01), bhw(yb, ZC + 0.01)) - 0.02
            a, b, c, d = (s * 0.31, ya, ZC), (s * w, ya, ZC), (s * w, yb, ZC), (s * 0.31, yb, ZC)
            if s > 0: cplatten('Formteil hell', a, b, c, d, 3, 2, 0.012, 0.006, 0.003)
            else: cplatten('Formteil hell', b, a, d, c, 3, 2, 0.012, 0.006, 0.003)
        c_lichtleiste('Licht Warm', (s * 0.315, XS0 + 0.4, ZC + 0.012), (s * 0.315, AUGE.y + 0.6, ZC + 0.012), 0.006, 0.004)
    # Ankunft der Treppe: gelbe Kante, Haltegriffe am Schott
    c_quader('Warngelb', (1.3, 0.04, 0.006), (0, XS0 + 0.14, ZC + 0.014), 0.002)
    for s in (-1, 1): c_griffleiste((s * 0.75, XS0 + 0.08, ZC + 0.4), (s * 0.75, XS0 + 0.08, ZC + 1.4), 0.016, n=(0, 1, 0))
    # Ablage unter der Frontscheibe (deckt den Fußraum vorn ab), Sensoren darauf
    wd = bhw(15.95, 4.45) - 0.01
    c_quader('Verkleidung', (2 * wd, XFRONT - 15.75, 0.03), (0, (15.75 + XFRONT) / 2, 4.45), 0.004)
    for x in (-0.9, 0.0, 0.9): c_kugel('Schirmglas', 0.045, (x, 16.0, 4.49), 16, (1, 1.3, 0.6)); c_zyl('Metall', 0.055, 0.012, (x, 16.0, 4.475), 'Z', 20, 0.003)
    with c_Platz((0, 15.85, 4.467), -90, 0, 0): c_schild('HARPYIE · HP-1', (0, 0, 0), 0.02)

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
        c_prisma('Formteil', [(-0.24, BODEN + PULT_TIEF), (0.68, BODEN + PULT_TIEF), (0.68, -0.62), (0.1, -0.735), (0.08, -0.62), (-0.24, -0.62)], 0.44, (0, 0, 0), fase=0.012, achse='X')
        with c_Platz((0, 0.36, -0.665), -79, 0, 0):
            c_quader('Formteil hell', (0.4, 0.012, 0.54), (0, 0, 0), 0.005)
            c_anzeige('Schiff', 0.25, 0.18, (0, -0.012, 0.14), rx=0, tief=0.016, haube=0.0, tasten=5, schrauben=False)
            c_tastenfeld(6, 2, 0.28, 0.06, (0, -0.006, -0.045), 0.45)
            for s in (-1, 1):
                c_zyl('Metall', 0.02, 0.014, (s * 0.15, -0.012, -0.13), 'Y', 18, 0.003); c_zyl('Gummi', 0.016, 0.014, (s * 0.15, -0.024, -0.13), 'Y', 14, 0.002)
                c_quader('Warnrot', (0.024, 0.016, 0.032), (s * 0.06, -0.014, -0.13), 0.004); c_schild(('BUGTOR', 'HUB')[s > 0], (s * 0.06, -0.0065, -0.162), 0.007)
            c_schild('ROTOREN', (-0.15, -0.0065, -0.168), 0.007); c_schild('RAMPE', (0.15, -0.0065, -0.168), 0.007)
            for sx in (-1, 1):
                for sz in (-1, 1): CP['schraube']((sx * 0.185, -0.006, sz * 0.255))
        for s in (-1, 1): c_schubhebel((s * 0.09, -0.07, -0.616), s)
        c_quader('Formteil hell', (0.38, 0.26, 0.008), (0, -0.07, -0.618), 0.003)
        for s in (-1, 1): c_lichtleiste('Licht Kalt', (s * 0.215, -0.16, -0.66), (s * 0.215, 0.5, -0.66), 0.005, 0.004)
    # Deckenkonsole zwischen den Sitzen (Hub, Rotoren, Tore)
    yk = 13.6; zo = KBT - D_K - 0.04
    with c_Platz((0, yk, zo), 0, 0, 0):
        c_prisma('Formteil', [(-0.24, 0.0), (0.24, 0.0), (0.2, -0.09), (-0.2, -0.09)], 1.1, (0, 0, 0), fase=0.012, achse='Y')
        with c_Platz((0, 0, -0.092), 90, 0, 0):
            c_quader('Formteil hell', (0.38, 0.008, 1.0), (0, 0, 0), 0.003)
            for k in range(11):
                for j in range(4):
                    x, zz = -0.12 + j * 0.08, -0.42 + k * 0.075; c_zyl('Metall', 0.006, 0.006, (x, -0.007, zz), 'Y', 8); c_stab('Metall blank', (x, -0.008, zz), (x, -0.026, zz + (0.008 if (k + j) % 2 else -0.008)), 0.004, 0.004, 0.001)
            for k in range(11): c_quader(('Licht Kalt', 'Licht Gruen', 'Licht Kalt', 'Licht Warm')[k % 4], (0.012, 0.002, 0.006), (-0.17, -0.005, -0.42 + k * 0.075), 0)
            c_schild('HUB · ROTOREN · BUGTOR · HECKRAMPE', (0.0, -0.006, 0.46), 0.008)
        for s in (-1, 1): c_zyl('Formteil hell', 0.04, 0.03, (s * 0.15, -0.62, -0.05), 'Z', 18, 0.006); c_zyl('Licht Warm', 0.026, 0.004, (s * 0.15, -0.62, -0.067), 'Z', 14)

def seiten():
    """Seitenkonsolen neben den Armkonsolen; sie enden 1,1 m vor der Wand, damit die Unterkante der Seitenfenster frei bleibt"""
    zb = AUGE.z - 0.48
    for s in (-1, 1):
        xi, xo = 1.42, 2.55; ya, yb = 13.9, 15.35
        q = [(xi, 0.0), (xo, 0.0), (xo, zb - ZC - 0.12), (xo - 0.12, zb - ZC), (xi, zb - ZC)]
        if s < 0: q = [(-x, z) for x, z in reversed(q)]
        c_prisma('Formteil', q, yb - ya, (0, (ya + yb) / 2, ZC), fase=0.012, achse='Y')
        for k, (y0, y1) in enumerate(((ya + 0.04, 14.4), (14.42, 14.9), (14.92, yb - 0.04))):
            xm = s * (xi + 0.5); bw = xo - xi - 0.22
            c_quader('Formteil hell', (bw, y1 - y0, 0.008), (xm, (y0 + y1) / 2, zb + 0.004), 0.003)
            with c_Platz((xm, (y0 + y1) / 2, zb + 0.009), 90, 0, 0):
                if k == 0: c_tastenfeld(4, 3, 0.36, 0.22, (0, 0, 0), 0.45); c_schild(('BUGTOR · RAMPE', 'LADUNG · ZURRUNG')[s > 0], (0, -0.0065, -0.15), 0.008)
                elif k == 1: c_anzeige(('Systeme', 'Fracht')[s > 0], 0.3, 0.16, (0, -0.01, 0.05), rx=60, tief=0.03, haube=0.0, tasten=3, schrauben=False)
                else: c_lueftung((0.15, -0.01, 0.0), 0.04); c_tastenfeld(3, 3, 0.18, 0.14, (-0.08, 0, 0), 0.35)
        c_lichtleiste('Licht Kalt', (s * (xi - 0.004), ya + 0.08, zb - 0.06), (s * (xi - 0.004), yb - 0.08, zb - 0.06), 0.005, 0.004)
        c_stab('Akzent', (s * (xo + 0.004), ya + 0.1, zb - 0.2), (s * (xo + 0.004), yb - 0.1, zb - 0.2), 0.004, 0.014, 0.001)
        # Wand: Haltegriff unter dem Seitenfenster, Feuerlöscher / Erste Hilfe hinten an der Spantwand
        w = bhw(14.0, 8.45) - 0.03
        c_griffleiste((s * w, 13.3, 8.45), (s * w, 14.8, 8.45), 0.014, n=(-s, 0, 0))
        with c_Platz((s * 2.9, XS0 + 0.02, ZC + 1.2), 0, 0, 180):
            if s < 0:
                c_zyl('Warnrot', 0.05, 0.32, (0, -0.07, 0.0), 'Z', 16, 0.012); c_zyl('Metall', 0.018, 0.05, (0, -0.07, 0.18), 'Z', 10, 0.004); c_quader('Metall', (0.12, 0.012, 0.02), (0, -0.012, -0.05), 0.003)
            else:
                c_quader('Formteil', (0.26, 0.09, 0.2), (0, -0.045, 0), 0.012); c_quader('Warnrot', (0.06, 0.004, 0.018), (0, -0.092, 0.02), 0.001); c_quader('Warnrot', (0.018, 0.004, 0.06), (0, -0.092, 0.02), 0.001)
def schraenke():
    # an der Spantwand (Cockpitseite) neben dem Durchgang: links Energieverteilung, rechts Steh-Pult Sensoren/Bordwaffen
    for s in (-1, 1):
        x0, x1 = 1.85, 2.75; ya, yb = XS0 + 0.0, XS0 + 0.4; z1 = 1.7
        q = [(x0, 0.0), (x1, 0.0), (x1, z1), (x0, z1)] if s < 0 else [(x0, 0.0), (x1, 0.0), (x1, 1.0), (x0, 0.92)]
        if s < 0: q = [(-x, z) for x, z in reversed(q)]
        else: q = [(x, z) for x, z in q]
        c_prisma('Formteil', q, yb - ya, (0, (ya + yb) / 2, ZC), fase=0.014, achse='Y')
        with c_Platz((s * (x0 + x1) / 2, yb, ZC), 0, 0, 180):
            if s < 0:
                for k in range(2):
                    c_quader('Formteil hell', (0.38, 0.012, 1.4), (-0.21 + k * 0.42, -0.006, 0.82), 0.006)
                    for j in range(5): c_quader(('Licht Kalt', 'Licht Gruen', 'Licht Kalt', 'Licht Warm', 'Licht Rot')[(j + k) % 5], (0.03, 0.003, 0.008), (-0.21 + k * 0.42 - 0.08, -0.013, 1.42 - j * 0.05), 0)
                    CP['griffleiste']((-0.21 + k * 0.42 + 0.1, -0.012, 0.6), (-0.21 + k * 0.42 + 0.1, -0.012, 0.9), 0.009)
                c_schild('ENERGIEVERTEILUNG', (0, -0.013, 1.56), 0.012)
            else:
                with c_Platz((0, -0.12, 1.0), -62, 0, 0):
                    c_quader('Formteil hell', (0.82, 0.012, 0.3), (0, 0, 0), 0.004)
                    c_anzeige('Waffen', 0.3, 0.17, (0, -0.012, 0.04), rx=0, tief=0.02, haube=0.0, tasten=5, schrauben=False)
                    c_tastenfeld(5, 1, 0.3, 0.03, (0, -0.006, -0.11), 0.5)
                c_quader('Formteil hell', (0.8, 0.012, 0.6), (0, -0.006, 0.45), 0.006)
                c_lueftung((0.2, -0.012, 0.6), 0.04); c_schild('SENSOREN · BORDWAFFEN', (0, -0.013, 0.2), 0.012)
def lichter_bild():
    for nm, p, w, c in (('Cockpitlicht', (13.8, 0, ZC + 1.9), 40, (0.6, 0.75, 1.0)), ('Pultlicht', (15.1, 0, ZC + 0.9), 14, (0.5, 0.7, 1.0))):
        point(nm, p, w, c, 0.1)

cockpit_haut(); boden(); gl, gr = station(AUGE.x, True); station(-AUGE.x, False); mitte()
c_SAM.fertig(C_CP, 'cp')
lichter_bild()
ANCH['auge'] = AUGE_K.copy(); ANCH['griffe'] = [[round(v, 4) for v in gl], [round(v, 4) for v in gr]]
cam('Cockpit vorn', tuple(AUGE_K), tuple(AUGE_K + Vector((3.0, -0.1, -0.55))), 14)
cam('Cockpit unten', tuple(AUGE_K), tuple(AUGE_K + Vector((2.0, -0.2, -1.4))), 16)
cam('Cockpit rechts', tuple(AUGE_K), tuple(AUGE_K + Vector((1.2, -2.6, -0.7))), 14)
cam('Cockpit hinten', (15.6, 0.0, ZC + 1.35), (10.5, 0.0, ZC + 0.4), 14)
IN_VIEWS.update({'cp_vorn': ('Cockpit vorn', 'grau', True, 0.0, 0.0, {}), 'cp_unten': ('Cockpit unten', 'grau', True, 0.0, 0.0, {}),
                 'cp_rechts': ('Cockpit rechts', 'grau', True, 0.0, 0.0, {}), 'cp_hinten': ('Cockpit hinten', 'grau', True, 0.0, 0.0, {})})
