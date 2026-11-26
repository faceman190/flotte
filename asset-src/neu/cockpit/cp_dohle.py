# Dohle: Cockpit für die Ich-Sicht im Flug (Stil 2).  blender -b --python cp_dohle.py -- [bild:vorn bild:links …] [export]
# Einsitzer unter der Glaskuppel der Dohle. Rahmen und Glas kommen aus dem Rumpfmodell (passen damit genau zur Außenansicht),
# alles andere ist neu: Pult mit fünf Anzeigen, Seitenkonsolen mit zwei Steuerknüppeln, Sitz, Wandfelder, Boden, Deck unter der Scheibe.
import bpy, sys, os
B = os.path.dirname(os.path.abspath(__file__))
for f in ('cp_lib.py', 'cp_teile.py'): exec(open(os.path.join(B, f), encoding='utf-8').read())
NAME, LAENGE = 'Dohle', 16.7
AUGE = Vector((0.0, 5.6, 0.42))      # Bau-Koordinaten; Spiel: (0, 0.42, −5.6)
BODEN = -1.05                        # Boden unter dem Auge
# Brüstung der Kuppel (rechte Seite, von vorn nach hinten), relativ zum Auge; gemessen mit cp_glas.py
RING = [(0.0, 2.22, -0.03), (0.23, 2.21, -0.04), (0.5, 2.1, -0.07), (0.68, 1.98, -0.11), (0.86, 1.76, -0.18), (0.95, 1.55, -0.24), (0.99, 1.33, -0.29), (1.03, 1.1, -0.3),
        (1.06, 0.87, -0.26), (1.08, 0.64, -0.18), (1.08, 0.49, -0.11), (1.03, 0.29, 0.0), (0.94, 0.12, 0.12), (0.79, -0.02, 0.24), (0.66, -0.09, 0.3)]
BOGEN = [(0.66, -0.12, 0.3), (0.49, -0.18, 0.35), (0.4, -0.18, 0.37), (0.29, -0.18, 0.38), (0.15, -0.18, 0.39), (0.0, -0.18, 0.39)]      # hinterer Rand der Kuppel, rechte Hälfte

def huelle(netze):
    # Rahmen und Glas aus dem Rumpf (Zone um die Kuppel, in Bau-Koordinaten)
    zone = ((-1.3, 5.3, 0.3), (1.3, 7.98, 1.0))
    with Platz((0, 0, 0)):
        # ohne die Mittelstrebe im Blickfeld nach vorn: Sie stünde genau vor dem Fadenkreuz (über Kopf bleibt sie)
        def frei(c): return not (abs(c.x) < 0.11 and c.y > AUGE.y + 0.25 and (c.z - AUGE.z) < (c.y - AUGE.y) * 1.1)
        rumpf_teile(netze, 'Schwarzmetall|Kanzelrahmen', ((-1.3, 5.3, 0.48), (1.3, 7.98, 1.3)), 'Rahmen', innen=frei)
        rumpf_teile(netze, 'Kuppelglas', zone, 'Glas')
        # Außenhaut rund um die Kabine als dunkle Innenseite (ohne das alte Cockpit im Inneren der Kabine)
        def aussen(c):      # nicht im Inneren der Kabine und nicht im Bereich der Kuppel (dort stehen sonst Mittelstrebe und Sockel der Rippen im Bild)
            if c.x * c.x + (c.y - 6.3) ** 2 < 1.5 ** 2 and c.z > 0.07 and c.y > 5.45: return False
            return not (abs(c.x) < 0.97 and AUGE.y - 0.78 < c.y < AUGE.y + 1.5 and AUGE.z - 1.04 < c.z < AUGE.z + 0.26)
        rumpf_teile(netze, r'^(?!.*( ~i|glas|Anzeige|Bildschirm|Polster|Leuchte|Licht|LED |Schwarzmetall|Kanzelrahmen|Sitzbezug|Gurt|Taste|Schrift|Blitz|Positions|Formations|[|])).*', ((-2.4, AUGE.y - 1.6, AUGE.z - 1.7), (2.4, AUGE.y + 2.6, AUGE.z + 1.0)), 'Rumpf innen', innen=aussen)
    with Platz(AUGE):
        for s in (1, -1):
            R = [Vector((s * x, y, z)) for x, y, z in RING]; Bg = [Vector((s * x, y, z)) for x, y, z in BOGEN]
            # Brüstungsholm innen an der Scheibe
            rohr('Rahmen', [p + Vector((-s * 0.02 if p.x * s > 0.1 else 0, -0.012, -0.012)) for p in R] + [Bg[0] + Vector((-s * 0.02, 0, 0))], 0.03, 6)
            rohr('Rahmen', [p + Vector((0, 0.0, -0.02)) for p in Bg], 0.035, 6)
            rohr('Gummi', [p + Vector((-s * 0.012 if p.x * s > 0.1 else 0, -0.0, 0.016)) for p in R[2:]], 0.008, 6)      # Dichtung
            # Seitenwand unter der Brüstung: eben, Oberkante folgt der Brüstung; unten zwei Reihen Felder, oben ein Formteil
            xw = s * 1.0
            with Platz((xw, 0, 0), 0, 0, -s * 90):      # Rahmen der Wand: lokale X = nach vorn (s > 0) bzw. nach hinten, −Y = in die Kabine
                def u(y): return s * y
                O = [(-0.11, 0.24), (-0.02, 0.2), (0.29, -0.04), (0.64, -0.21), (1.1, -0.33), (1.5, -0.3)]
                P_ = [(u(-0.11), -0.4)] + [(u(y), z - 0.05) for y, z in O] + [(u(1.5), -0.4)]
                if s > 0: P_ = list(reversed(P_))
                prisma('Verkleidung', P_ if s < 0 else P_, 0.016, (0, 0.0, 0), fase=0.004, achse='Y')
                for i in range(4):
                    ya, yb = -0.11 + i * 0.4025, -0.11 + (i + 1) * 0.4025
                    for k, (za, zb) in enumerate(((BODEN, -0.74), (-0.74, -0.4))):
                        quader('Formteil hell' if (i + k) % 2 else 'Verkleidung', (yb - ya - 0.006, 0.016, zb - za - 0.006), (u((ya + yb) / 2), -0.002 if (i + k) % 2 else 0.0, (za + zb) / 2), 0.004)
                lueftung((u(0.5), -0.012, -0.57), 0.04); lueftung((u(0.9), -0.012, -0.57), 0.04)
                schild(('SAUERSTOFF', 'NOTSTROM')[s > 0], (u(0.7), -0.0095, -0.48), 0.012)
                quader('Formteil', (0.2, 0.03, 0.12), (u(0.2), -0.02, -0.56), 0.01); tastenfeld(3, 2, 0.12, 0.05, (u(0.2), -0.036, -0.56), 0.5)
                warndreieck((u(0.2), -0.011, -0.85), 0.05); schild('HOCHSPANNUNG', (u(0.2), -0.011, -0.9), 0.01)
            griffleiste((s * 0.975, 0.45, -0.3), (s * 0.975, 0.85, -0.37), n=(-s, 0, 0))
            # Seitenwand hinter der Kuppel bis zum Schott, mit Spant
            xh = s * 0.72; yh = -0.8
            A = [Vector((xh, -0.11, BODEN)), Vector((xh, yh, BODEN)), Vector((xh, yh, 0.32)), Vector((xh, -0.11, 0.3))]
            if s > 0: platten('Verkleidung', A[0], A[1], A[2], A[3], 3, 4, 0.014, 0.005, hub=0.004, abwechselnd='Formteil hell')
            else: platten('Verkleidung', A[1], A[0], A[3], A[2], 3, 4, 0.014, 0.005, hub=0.004, abwechselnd='Formteil hell')
            stab('Rahmen', (s * 0.7, -0.1, BODEN), (s * 0.69, -0.1, 0.3), 0.07, 0.06, 0.012)
            # Decke hinter der Kuppel
            D = [Vector((0, -0.2, 0.37)), Vector((s * 0.7, -0.2, 0.3)), Vector((s * 0.7, yh, 0.3)), Vector((0, yh, 0.37))]
            if s > 0: platten('Verkleidung', D[0], D[3], D[2], D[1], 2, 2, 0.014, 0.005)
            else: platten('Verkleidung', D[3], D[0], D[1], D[2], 2, 2, 0.014, 0.005)
            lichtleiste('Licht Warm', (s * 0.66, -0.25, 0.27), (s * 0.66, yh + 0.1, 0.27), 0.006, 0.004)
            # Ausrüstung an der Seitenwand hinten
        # Schott mit Tür hinter dem Sitz
        yh = -0.8
        platten('Verkleidung', (0.72, yh, BODEN), (0.36, yh, BODEN), (0.36, yh, 0.34), (0.72, yh, 0.3), 1, 4, 0.014, 0.005, hub=0.004)
        platten('Verkleidung', (-0.36, yh, BODEN), (-0.72, yh, BODEN), (-0.72, yh, 0.3), (-0.36, yh, 0.34), 1, 4, 0.014, 0.005, hub=0.004)
        quader('Formteil hell', (0.66, 0.03, 1.3), (0, yh + 0.005, BODEN + 0.66), 0.02)      # Türblatt
        quader('Rahmen', (0.76, 0.05, 0.07), (0, yh - 0.0, BODEN + 1.36), 0.014)
        for s in (-1, 1): quader('Rahmen', (0.06, 0.05, 1.36), (s * 0.36, yh, BODEN + 0.68), 0.014)
        quader('Schirmglas', (0.26, 0.012, 0.16), (0, yh - 0.016, BODEN + 1.05), 0.012)      # Türfenster
        with Platz((0.22, yh - 0.022, BODEN + 0.72), 0, 0, 180):
            quader('Formteil', (0.1, 0.016, 0.14), (0, 0, 0), 0.006); tastenfeld(2, 3, 0.06, 0.075, (0, -0.008, -0.02), 0.5); quader('Licht Gruen', (0.05, 0.002, 0.012), (0, -0.009, 0.045), 0.001)
        with Platz((0, yh - 0.02, BODEN + 1.25), 0, 0, 180): schild('GANG · LADERAUM', (0, 0, 0), 0.02, m='Schrift')
        with Platz((-0.5, yh - 0.012, BODEN + 0.9), 0, 0, 180): warnkreis((0, 0, 0), 0.035); schild('FEUERLÖSCHER', (0, 0, -0.06), 0.012)
        zyl('Warnrot', 0.05, 0.3, (0.52, yh + 0.07, BODEN + 0.5), 'Z', 16, 0.012); zyl('Metall', 0.02, 0.05, (0.52, yh + 0.07, BODEN + 0.67), 'Z', 10, 0.004)
        for z in (BODEN + 0.42, BODEN + 0.58): quader('Metall', (0.12, 0.012, 0.02), (0.52, yh + 0.125, z), 0.003)

def boden_und_deck():
    with Platz(AUGE):
        # Boden: Trittroste in der Mitte, Formteil außen, Kante vor dem Sitz
        platten('Bodenrost', (-0.24, -0.8, BODEN), (0.24, -0.8, BODEN), (0.24, 1.0, BODEN), (-0.24, 1.0, BODEN), 1, 4, 0.016, 0.006, 0.004)
        for s in (-1, 1):
            a, b, c, d = (s * 0.24, -0.8, BODEN), (s * 1.02, -0.8, BODEN), (s * 1.02, 1.3, BODEN), (s * 0.24, 1.3, BODEN)
            if s > 0: platten('Formteil hell', a, b, c, d, 2, 5, 0.016, 0.006, 0.004)
            else: platten('Formteil hell', b, a, d, c, 2, 5, 0.016, 0.006, 0.004)
            lichtleiste('Licht Warm', (s * 0.245, -0.3, BODEN + 0.012), (s * 0.245, 0.6, BODEN + 0.012), 0.006, 0.004)
        quader('Rumpf innen', (2.0, 2.2, 0.02), (0, 0.25, BODEN - 0.024), 0)      # Grund unter den Platten (wird nicht geteilt)
        # Fußraum: schräge Stirnwand, Fußstützen
        platten('Formteil hell', (-0.5, 1.02, BODEN), (0.5, 1.02, BODEN), (0.5, 1.3, BODEN + 0.5), (-0.5, 1.3, BODEN + 0.5), 3, 2, 0.014, 0.005)
        pedale((0, 0.86, BODEN + 0.03), 0.15)
        # Deck unter der Scheibe: vom Pult nach vorn bis an die Brüstung
        bm = bmesh.new(); vorn = [Vector((x, y, z - 0.035)) for x, y, z in RING if y > 0.6]; pts = [Vector((-p.x, p.y, p.z)) for p in reversed(vorn[1:])] + vorn
        hinten = [Vector((x, 0.86 + abs(x) * -0.25, -0.2 - abs(x) * 0.05)) for x in (-1.0, -0.6, -0.3, 0.0, 0.3, 0.6, 1.0)]
        mitte = [Vector((p.x * 0.55, 1.45 + 0.35 * (1 - abs(p.x)), -0.1)) for p in hinten]
        def band(A, Bv):
            va = [bm.verts.new(p) for p in A]; vb = [bm.verts.new(p) for p in Bv]; n = min(len(va), len(vb))
            for i in range(n - 1): bm.faces.new((va[i], va[i + 1], vb[i + 1], vb[i]))
        vr = [pts[int(round(i * (len(pts) - 1) / 6))] for i in range(7)]
        band(hinten, mitte); band(mitte, vr)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
        _ab(bm, 'Verkleidung')
        # Aufbauten auf dem Deck: Mittelrücken mit Sensorhöcker, zwei Hörner (Projektoren), Lüftungsschlitze
        prisma('Formteil', [(-0.13, 0.0), (0.13, 0.0), (0.09, 0.05), (-0.09, 0.05)], 0.75, (0, 1.42, -0.125), fase=0.012, achse='Y')
        kugel('Schirmglas', 0.045, (0, 1.72, -0.07), 16, (1, 1.3, 0.6)); zyl('Metall', 0.052, 0.012, (0, 1.72, -0.078), 'Z', 20, 0.003)
        for s in (-1, 1):
            with Platz((s * 0.34, 1.12, -0.17), 0, 0, -s * 10):
                prisma('Formteil', [(-0.1, 0.0), (0.1, 0.0), (0.085, 0.1), (0.03, 0.14), (-0.06, 0.14), (-0.1, 0.07)] if s > 0 else [(-0.1, 0.0), (0.1, 0.0), (0.1, 0.07), (0.06, 0.14), (-0.03, 0.14), (-0.085, 0.1)], 0.3, (0, 0.05, 0), fase=0.014, achse='Y')
                quader('Schirmglas', (0.1, 0.006, 0.05), (-s * 0.005, -0.101, 0.085), 0.004); quader('Licht Kalt', (0.07, 0.002, 0.004), (-s * 0.005, -0.104, 0.05), 0)
                for k in range(4): quader('Metall', (0.012, 0.16, 0.004), (-0.04 + k * 0.027, 0.07, 0.142), 0.001)
            for k in range(6): quader('Schirmglas', (0.16, 0.012, 0.003), (s * 0.68, 1.1 + k * 0.035, -0.208 + k * 0.0045), 0.001)
            stab('Akzent', (s * 0.2, 1.08, -0.118), (s * 0.2, 1.74, -0.118), 0.006, 0.004, 0.001)
        schild('DOHLE · DH-2', (0, 1.045, -0.1), 0.014, rx=-20)

def pult():
    with Platz(AUGE):
        pultmodul(BODEN)
        # Sichtgerät: holografische Fläche vor dem Piloten (im Spiel additiv)
        flaeche('Schirm Holo', [(-0.8, 1.55, -0.1), (0.8, 1.55, -0.1), (0.8, 1.55, 0.42), (-0.8, 1.55, 0.42)], uv=True)

def platz_pilot():
    with Platz(AUGE):
        sitz((0, -0.02, -0.8), sockel=0.2)
        gr = armkonsole(1, -0.42, 0.56, 0.26, 0.6, -0.5, BODEN, 'Energie', beweglich=True)
        gl = armkonsole(-1, -0.42, 0.56, 0.26, 0.6, -0.5, BODEN, 'Funk2', beweglich=True)
        # Bordwand außen neben den Konsolen: Ablage mit Geräten
        for s in (-1, 1):
            quader('Formteil', (0.36, 1.2, 0.5), (s * 0.82, 0.15, BODEN + 0.25), 0.02)
            with Platz((s * 0.82, 0.15, BODEN + 0.5)):
                quader('Formteil hell', (0.3, 0.36, 0.01), (0, -0.36, 0.005), 0.004); quader('Formteil hell', (0.3, 0.5, 0.01), (0, 0.12, 0.005), 0.004)
                quader('Gummi', (0.22, 0.26, 0.012), (0, -0.36, 0.014), 0.006)
                quader('Metall', (0.18, 0.24, 0.07), (0.0, 0.14, 0.04), 0.01)      # Gerätekasten
                for k in range(3): zyl('Metall blank', 0.007, 0.014, (-0.05 + k * 0.05, 0.015, 0.05), 'Y', 8)
                quader('Licht Gruen', (0.02, 0.002, 0.006), (0.06, 0.019, 0.065), 0)
                kabel('Kabel', [(-0.05, 0.01, 0.05), (-0.06, -0.08, 0.03), (-0.1, -0.16, 0.012), (-0.12, -0.5, 0.012)], 0.005)
                warndreieck((0.1, 0.4, 0.011), 0.035, rx=-90)
        return gl, gr

def baue():
    sc = neu_szene(); stil_materialien(akzent=(0.5, 0.27, 0.03))
    for n in ('Lage', 'Systeme', 'Ziel', 'Antrieb', 'Fracht', 'Band', 'Funk', 'Energie', 'Funk2'): mat('Schirm ' + n, (0.0, 0.0, 0.0), 0.0, 0.2, (0.25, 0.6, 1.0), 2.2)
    mat('Schirm Holo', (0, 0, 0), 0.0, 0.1, alpha=0.0)
    coll, netze = rumpf_laden(os.path.join(B, '..', '..', 'glb', 'ship', NAME + '.glb'), LAENGE)
    cp = bpy.data.collections.new('Cockpit'); sc.collection.children.link(cp)
    huelle(netze); boden_und_deck(); pult(); gl, gr = platz_pilot()
    objs = SAM.fertig(cp, 'cp')
    json.dump({'schiff': NAME, 'laenge': LAENGE, 'auge': [round(AUGE.x, 4), round(AUGE.z, 4), round(-AUGE.y, 4)],
               'griff_l': [round(gl.x, 4), round(gl.z, 4), round(-gl.y, 4)], 'griff_r': [round(gr.x, 4), round(gr.z, 4), round(-gr.y, 4)]}, open(os.path.join(B, 'cp-dohle.json'), 'w'), indent=1)
    return coll, cp

if __name__ == '__main__':
    arg = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    coll, cp = baue()
    alt = [o for o in coll.objects]
    for o in alt:      # altes Cockpit des Rumpfs für die Bilder ausblenden: alles, was innen in der Kabine liegt (Materialien mit ~i und die Anzeigen)
        me = o.data; n = me.materials[0].name if me.materials else ''
        if ' ~i' in n or n.startswith(('Anzeige', 'Bildschirm', 'Polster', 'Kuppelglas', 'Leuchte', 'Licht', 'LED')): o.hide_render = True
    AN = {'ecke': (-17, -20, 20), 'vorn': (0, -10), 'links': (-55, -25), 'rechts': (55, -25), 'unten': (0, -40), 'hinten': (150, -10), 'oben': (0, 35), 'weit_l': (-95, -15)}
    for a in arg:
        if a.startswith('bild:'):
            k = a[5:]; cam = kamera(k, AUGE, *AN[k]); bild(os.path.join(B, 'cp-dohle-%s.jpg' % k), cam, 1280, 720, 48, welt=5.0, sonne=((0.5, 0.35, 0.6), 4.0))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'CockpitDohle.blend'))
    print('FERTIG', sum(len(o.data.polygons) for o in cp.objects), 'Flächen')
