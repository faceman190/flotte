# Kormoran: Cockpit für die Ich-Sicht im Flug (Stil 2).  blender -b --python cp_kormoran.py -- [bild:vorn bild:rechts …]
# Zweisitzer-Brücke unter der Glaskuppel. Streben und Glas kommen aus dem Rumpfmodell (passen zur Außenansicht), alles andere ist neu:
# zwei Pilotenplätze mit je drei Anzeigen und zwei Steuerknüppeln, Mittelkonsole mit Karte und Schubhebeln, Deck unter der Scheibe,
# Wandfelder, Boden mit Luke, Klappsitze und Schott hinten, Deckenkonsole. Der Spieler sitzt links.
import bpy, sys, os
B = os.path.dirname(os.path.abspath(__file__))
for f in ('cp_lib.py', 'cp_teile.py'): exec(open(os.path.join(B, f), encoding='utf-8').read())
NAME, LAENGE = 'Kormoran', 46.0
AUGE = Vector((-0.85, 13.1, 1.75))      # Bau-Koordinaten (linker Sitz); Spiel: (−0.85, 1.75, −13.1)
ZB = 0.52                               # Boden der Brücke (Bau-Koordinaten)
BODEN = ZB - AUGE.z                     # Boden unter dem Auge
# Spanten der Kuppel (cp_glas.py): Y, Brüstung (x, z), Schulter (x, z), Scheitel z
SPANT = [(9.61, (3.13, 1.78), (2.75, 2.14), 2.69), (11.01, (2.79, 1.62), (2.48, 2.02), 2.62), (13.41, (2.22, 1.30), (2.0, 1.74), 2.41),
         (15.61, (1.68, 0.97), (1.52, 1.39), 2.02), (17.4, (1.23, 0.62), (1.08, 0.96), 1.49)]
SPITZE = (19.2, 0.56)
def bruest(y):      # Brüstung (halbe Breite, Höhe) an der Stelle y, zwischen den Spanten gerade
    if y <= SPANT[0][0]: return SPANT[0][1]
    for a, b in zip(SPANT, SPANT[1:]):
        if y <= b[0]: t = (y - a[0]) / (b[0] - a[0]); return (a[1][0] + (b[1][0] - a[1][0]) * t, a[1][1] + (b[1][1] - a[1][1]) * t)
    t = min(1.0, (y - SPANT[-1][0]) / (SPITZE[0] - SPANT[-1][0])); return (SPANT[-1][1][0] * (1 - t), SPANT[-1][1][1] + (SPITZE[1] - SPANT[-1][1][1]) * t)
def scheitel(y):
    if y <= SPANT[0][0]: return SPANT[0][3]
    for a, b in zip(SPANT, SPANT[1:]):
        if y <= b[0]: t = (y - a[0]) / (b[0] - a[0]); return a[3] + (b[3] - a[3]) * t
    t = min(1.0, (y - SPANT[-1][0]) / (SPITZE[0] - SPANT[-1][0])); return SPANT[-1][3] + (SPITZE[1] - SPANT[-1][3]) * t
YH = 9.98      # Schott hinten

def huelle(netze):
    zone = ((-3.4, 9.5, 0.4), (3.4, 19.4, 2.9))
    rumpf_teile(netze, 'Schwarzmetall', zone, 'Rahmen', innen=lambda c: c.z > bruest(c.y)[1] - 0.06)
    rumpf_teile(netze, 'Schauglas', zone, 'Glas')
    def aussen(c):      # nicht im Inneren der Brücke (dort steht das alte Cockpit)
        if not (YH - 0.1 < c.y < 19.0 and c.z > ZB - 0.06): return True
        bx, bz = bruest(c.y); top = scheitel(c.y); ax = abs(c.x)
        if ax > bx - 0.04: return True
        return c.z > top - (top - bz) * (ax / max(bx, 0.01)) ** 2 - 0.05
    rumpf_teile(netze, r'^(?!.*( ~i|glas|Anzeige|Bildschirm|Licht|LED |Ambient|Decken|HUD|Schwarzmetall|Warnschraffur|Lack ocker|Sitz|Gurt|Taste|Schrift|Typenschild|Positions|[|])).*', ((-3.7, 9.3, 0.15), (3.7, 19.6, 3.1)), 'Rumpf innen', innen=aussen)
    # Brüstungsholm und Wandfelder je Seite, Spant für Spant
    for s in (1, -1):
        P = [Vector((s * (bx - 0.05), y, bz - 0.04)) for y, (bx, bz), _, _ in SPANT]
        rohr('Rahmen', [p + Vector((-s * 0.01, 0, 0.0)) for p in P] + [Vector((0, SPITZE[0] - 0.12, SPITZE[1] - 0.02))], 0.04, 6)
        for a, b in zip(P, P[1:]):
            if a.y > 16.0: continue      # vorn verdeckt das Deck die Wand
            ua, ub = Vector((a.x * 0.985, a.y, ZB)), Vector((b.x * 0.985, b.y, ZB)); ma, mb = (a + ua) / 2, (b + ub) / 2
            ta, tb = a + Vector((-s * 0.02, 0, -0.06)), b + Vector((-s * 0.02, 0, -0.06))
            if s > 0: platten('Verkleidung', mb, ma, ta, tb, 2, 1, 0.016, 0.006, 0.004); platten('Formteil hell', ub, ua, ma, mb, 2, 1, 0.016, 0.006, 0.004, hub=0.004)
            else: platten('Verkleidung', ma, mb, tb, ta, 2, 1, 0.016, 0.006, 0.004); platten('Formteil hell', ua, ub, mb, ma, 2, 1, 0.016, 0.006, 0.004, hub=0.004)
            lichtleiste('Licht Warm', ua + Vector((-s * 0.03, 0.1, 0.03)), ub + Vector((-s * 0.03, -0.1, 0.03)), 0.006, 0.004)
        # Geräte an der Wand: Kästen, Lüftung, Schilder (im Rahmen der Wand am Pilotenplatz)
        a, b = P[1], P[2]; d = (b - a).normalized(); wn = Vector((-s * d.y, s * d.x, 0)).normalized()      # in den Raum
        for k, (t, hh) in enumerate(((0.25, 0.55), (0.55, 0.5), (0.8, 0.6))):
            p = a + (b - a) * t; p = Vector((p.x * 0.985, p.y, ZB + hh)) + wn * 0.05
            M = Matrix(((-d.x * s, -wn.x, 0, p.x), (-d.y * s, -wn.y, 0, p.y), (0, 0, 1, p.z), (0, 0, 0, 1)))
            with Platz(m=M):
                if k == 0: quader('Formteil', (0.3, 0.07, 0.22), (0, 0, 0), 0.012); tastenfeld(4, 3, 0.2, 0.1, (0, -0.036, 0.02), 0.5); schild(('NOTSTROM', 'SAUERSTOFF')[s > 0], (0, -0.036, -0.075), 0.012)
                elif k == 1: lueftung((0, -0.02, 0), 0.05); lueftung((0.16, -0.02, 0), 0.05)
                else: zyl('Warnrot', 0.055, 0.34, (0, -0.07, -0.1), 'Z', 16, 0.012); zyl('Metall', 0.02, 0.05, (0, -0.07, 0.09), 'Z', 10, 0.004); quader('Metall', (0.14, 0.012, 0.02), (0, -0.012, -0.05), 0.003); warnkreis((0.14, -0.01, 0.1), 0.03)
    # Schott hinten mit Tür
    bx, bz = bruest(YH); top = scheitel(YH)
    for s in (-1, 1):
        A = [Vector((s * 0.5, YH, ZB)), Vector((s * (bx - 0.1), YH, ZB)), Vector((s * (bx - 0.1), YH, bz + 0.25)), Vector((s * 0.5, YH, top - 0.2))]
        if s > 0: platten('Verkleidung', A[1], A[0], A[3], A[2], 3, 3, 0.016, 0.006, 0.004, hub=0.004, abwechselnd='Formteil hell')
        else: platten('Verkleidung', A[0], A[1], A[2], A[3], 3, 3, 0.016, 0.006, 0.004, hub=0.004, abwechselnd='Formteil hell')
        quader('Rahmen', (0.08, 0.07, 2.0), (s * 0.5, YH + 0.01, ZB + 1.0), 0.016)
        # Geräteschrank mit Leuchten
        with Platz((s * 1.4, YH + 0.02, ZB + 1.05)):
            quader('Formteil', (0.9, 0.1, 0.7), (0, 0.05, 0), 0.016)
            for k in range(3):
                quader('Formteil hell', (0.26, 0.012, 0.6), (-0.29 + k * 0.29, 0.106, 0), 0.006)
                for j in range(4): quader(('Licht Kalt', 'Licht Gruen', 'Licht Kalt', 'Licht Warm')[(j + k) % 4], (0.03, 0.003, 0.008), (-0.29 + k * 0.29 - 0.07, 0.113, 0.2 - j * 0.05), 0)
    quader('Formteil hell', (0.92, 0.04, 1.96), (0, YH - 0.0, ZB + 0.98), 0.02); quader('Rahmen', (1.08, 0.07, 0.08), (0, YH + 0.01, ZB + 2.02), 0.016)
    quader('Schirmglas', (0.34, 0.012, 0.22), (0, YH + 0.024, ZB + 1.55), 0.012)
    with Platz((0, YH + 0.03, ZB + 1.85)): schrift('GANG · MESSE', 0.035, (0, 0, 0), 'Schrift', rx=90, rz=180)
    with Platz((0.34, YH + 0.03, ZB + 1.1), 0, 0, 180): quader('Formteil', (0.1, 0.016, 0.14), (0, 0, 0), 0.006); tastenfeld(2, 3, 0.06, 0.075, (0, -0.008, -0.02), 0.5); quader('Licht Gruen', (0.05, 0.002, 0.012), (0, -0.009, 0.045), 0.001)

def boden_und_deck():
    # Boden: Mittelgang aus Trittrosten, außen Formteil-Platten, Luke mit Warnrand hinten
    platten('Bodenrost', (-0.42, YH, ZB), (0.42, YH, ZB), (0.42, 14.3, ZB), (-0.42, 14.3, ZB), 2, 7, 0.016, 0.006, 0.004)
    for s in (-1, 1):
        for ya, yb in ((YH, 11.6), (11.6, 13.2), (13.2, 14.6)):
            xa, xb = bruest(ya)[0] - 0.08, bruest(yb)[0] - 0.08
            a, b, c, d = (s * 0.42, ya, ZB), (s * xa, ya, ZB), (s * xb, yb, ZB), (s * 0.42, yb, ZB)
            if s > 0: platten('Formteil hell', a, b, c, d, 3, 2, 0.016, 0.006, 0.004)
            else: platten('Formteil hell', b, a, d, c, 3, 2, 0.016, 0.006, 0.004)
        lichtleiste('Licht Warm', (s * 0.43, YH + 0.3, ZB + 0.012), (s * 0.43, 13.9, ZB + 0.012), 0.006, 0.004)
    quader('Rumpf innen', (6.4, 5.0, 0.02), (0, 12.3, ZB - 0.024), 0)      # Grund unter den Platten (wird nicht geteilt)
    # Luke im Gang hinten (Leiter nach unten)
    quader('Formteil hell', (0.7, 0.9, 0.012), (0, 10.95, ZB + 0.012), 0.006)
    for s in (-1, 1):
        for k in range(6): stab('Warngelb', (s * 0.31, 10.55 + k * 0.15, ZB + 0.019), (s * 0.37, 10.63 + k * 0.15, ZB + 0.019), 0.03, 0.002, 0)
    griffleiste((-0.15, 10.6, ZB + 0.018), (0.15, 10.6, ZB + 0.018), 0.012, n=(0, 0, 1))
    with Platz((0, 11.2, ZB + 0.02), -90, 0, 0): schild('LEITER · DECK 1', (0, 0, 0), 0.03, m='Schrift')
    # Stirnwand unter dem Pult, von Brüstung zu Brüstung
    yv = AUGE.y + 1.0; bx, bz = bruest(yv)
    platten('Formteil hell', (-bx + 0.06, yv, ZB), (bx - 0.06, yv, ZB), (bx - 0.06, yv, bz - 0.04), (-bx + 0.06, yv, bz - 0.04), 7, 2, 0.016, 0.006, 0.004, hub=0.004)
    # Deck unter der Scheibe: vom Pult nach vorn bis zur Spitze, in Platten; liegt auf Höhe der Brüstung
    ys = [yv - 0.25, 14.8, 15.61, 16.5, 17.4, 18.3]
    for ya, yb in zip(ys, ys[1:]):
        (xa, za), (xb, zb) = bruest(ya), bruest(yb)
        platten('Verkleidung', (-xa + 0.07, ya, za - 0.06), (xa - 0.07, ya, za - 0.06), (xb - 0.07, yb, zb - 0.06), (-xb + 0.07, yb, zb - 0.06), 4 if xa > 1.2 else 2, 1, 0.014, 0.006, 0.004)
    (xb, zb) = bruest(18.3); bm = bmesh.new(); f = bm.faces.new([bm.verts.new(p) for p in ((-xb + 0.07, 18.3, zb - 0.07), (xb - 0.07, 18.3, zb - 0.07), (0, SPITZE[0] - 0.15, SPITZE[1] - 0.07))]); _ab(bm, 'Verkleidung')
    # Mittelrücken auf dem Deck mit Sensoren und Kabelkanal
    for ya, yb in zip(ys[:-1], ys[1:]):
        za, zb = bruest(ya)[1] - 0.045, bruest(yb)[1] - 0.045; stab('Formteil', (0, ya, za + 0.03), (0, yb, zb + 0.03), 0.22, 0.06, 0.014)
    for y in (15.2, 16.3, 17.3):
        z = bruest(y)[1]; kugel('Schirmglas', 0.05, (0, y, z + 0.035), 16, (1, 1.3, 0.6)); zyl('Metall', 0.06, 0.012, (0, y, z + 0.022), 'Z', 20, 0.003)
    for s in (-1, 1):
        stab('Akzent', (s * 0.14, ys[0] + 0.1, bruest(ys[0])[1] - 0.012), (s * 0.14, 15.5, bruest(15.5)[1] - 0.012), 0.008, 0.004, 0.001)
        for k in range(5):
            y = 14.9 + k * 0.5; bxk, bzk = bruest(y)
            if bxk > 0.7: quader('Schirmglas', (0.3, 0.02, 0.004), (s * (bxk * 0.55), y, bzk - 0.042), 0.001)      # Lüftungsschlitze an der Scheibe
    with Platz((0, ys[0] + 0.02, bruest(ys[0])[1] + 0.02), -20, 0, 0): schild('KORMORAN · KV-7', (0, 0, 0), 0.018)

def station(x0, links):
    """Pilotenplatz (x0: Sitzmitte in Bau-Koordinaten). links: Spielerplatz (linker Sitz) oder rechter Sitz."""
    with Platz((x0, AUGE.y, AUGE.z)):
        sitz((0, -0.02, -0.8), sockel=-BODEN - 0.82)
        gr = armkonsole(1, -0.42, 0.56, 0.26, 0.56, -0.5, BODEN, 'Energie' if links else 'Funk2', beweglich=links)
        gl = armkonsole(-1, -0.42, 0.56, 0.26, 0.56, -0.5, BODEN, 'Funk2' if links else 'Energie', beweglich=links)
        pultmodul(BODEN, sockel=False, fluegel=(links, not links), aussen=('Antrieb' if links else None, None if links else 'Fracht'))
        pedale((0, 0.86, BODEN + 0.03), 0.15)
        prisma('Formteil', [(-0.5, 0.0), (0.5, 0.0), (0.5, 0.5), (-0.5, 0.5)], 0.06, (0, 1.0, BODEN), fase=0.01, achse='Y')      # Stirnwand im Fußraum
        if links: flaeche('Schirm Holo', [(-0.8, 1.6, -0.14), (0.8, 1.6, -0.14), (0.8, 1.6, 0.38), (-0.8, 1.6, 0.38)], uv=True)
        return gl, gr

def mitte():
    """Mittelkonsole zwischen den Sitzen: oben Karte und Schiffsanzeige, darunter Sockel mit zwei Schubhebeln; Deckenkonsole an der Mittelstrebe"""
    with Platz((0, AUGE.y, AUGE.z)):
        prisma('Formteil', [(0.0, -0.62), (0.3, -0.62), (0.3, -0.02), (0.14, 0.0), (0.03, -0.1), (0.0, -0.34)], 0.74, (0, 0.775, -0.19), fase=0.014, achse='X')
        prisma('Gummi', [(-0.37, 0.0), (0.37, 0.0), (0.35, 0.04), (-0.35, 0.04)], 0.2, (0, 0.8, -0.185), fase=0.012, seg=2, achse='Y')
        anzeige('Karte', 0.33, 0.22, (0, 0.735, -0.36), rx=-16, tief=0.06, haube=0.028, tasten=6)
        # Sockel: schräges Pult vom Armaturenbrett nach hinten unten, dann bis zum Boden
        prisma('Formteil', [(-0.24, BODEN), (0.68, BODEN), (0.68, -0.62), (0.1, -0.735), (0.08, -0.62), (-0.24, -0.62)], 0.5, (0, 0, 0), fase=0.012, achse='X')
        with Platz((0, 0.36, -0.665), -79, 0, 0):      # Pultfläche, leicht zum Heck abfallend
            quader('Formteil hell', (0.44, 0.012, 0.54), (0, 0, 0), 0.005)
            anzeige('Schiff', 0.27, 0.19, (0, -0.012, 0.14), rx=0, tief=0.016, haube=0.0, tasten=5, schrauben=False)
            tastenfeld(6, 2, 0.3, 0.06, (0, -0.006, -0.045), 0.45)
            for s in (-1, 1):
                zyl('Metall', 0.02, 0.014, (s * 0.16, -0.012, -0.13), 'Y', 18, 0.003); zyl('Gummi', 0.016, 0.014, (s * 0.16, -0.024, -0.13), 'Y', 14, 0.002)
                quader('Warnrot', (0.024, 0.016, 0.032), (s * 0.06, -0.014, -0.13), 0.004); schild(('SPRUNG', 'ANKER')[s > 0], (s * 0.06, -0.0065, -0.162), 0.007)
            schild('ANTRIEB', (-0.16, -0.0065, -0.168), 0.007); schild('SCHILD', (0.16, -0.0065, -0.168), 0.007)
            for sx in (-1, 1):
                for sz in (-1, 1): schraube((sx * 0.205, -0.006, sz * 0.255))
        for s in (-1, 1): schubhebel((s * 0.09, -0.07, -0.616), s)
        quader('Formteil hell', (0.4, 0.26, 0.008), (0, -0.07, -0.618), 0.003)
        for s in (-1, 1): lichtleiste('Licht Kalt', (s * 0.235, -0.16, -0.66), (s * 0.235, 0.5, -0.66), 0.005, 0.004)
        # Deckenkonsole: hängt unter der Mittelstrebe, Schalter und zwei Leseleuchten
        zo = scheitel(AUGE.y + 0.5) - AUGE.z - 0.07
        with Platz((0, 0.5, zo), 8, 0, 0):
            prisma('Formteil', [(-0.2, 0.0), (0.2, 0.0), (0.16, -0.06), (-0.16, -0.06)], 0.8, (0, 0, 0), fase=0.012, achse='Y')
            with Platz((0, 0, -0.062), 90, 0, 0):
                quader('Formteil hell', (0.3, 0.008, 0.7), (0, 0, 0), 0.003)
                for k in range(8):
                    for j in range(3):
                        x, zz = -0.09 + j * 0.09, -0.28 + k * 0.07; zyl('Metall', 0.006, 0.006, (x, -0.007, zz), 'Y', 8); stab('Metall blank', (x, -0.008, zz), (x, -0.026, zz + (0.008 if (k + j) % 2 else -0.008)), 0.004, 0.004, 0.001)
                for k in range(8): quader(('Licht Kalt', 'Licht Gruen', 'Licht Kalt', 'Licht Warm')[k % 4], (0.012, 0.002, 0.006), (-0.135, -0.005, -0.28 + k * 0.07), 0)
            for s in (-1, 1): zyl('Formteil hell', 0.035, 0.03, (s * 0.12, -0.46, -0.05), 'Z', 18, 0.006); zyl('Licht Warm', 0.022, 0.004, (s * 0.12, -0.46, -0.067), 'Z', 14)

def hinten():
    """Klappsitze an der Rückwand, Blick nach vorn"""
    for s in (-1, 1):
        with Platz((s * 1.75, YH + 0.75, ZB + 0.45)): sitz((0, 0, 0), sockel=0.43, akzent=False)

def baue():
    sc = neu_szene(); stil_materialien(akzent=(0.05, 0.2, 0.3))
    for n in ('Lage', 'Systeme', 'Ziel', 'Antrieb', 'Fracht', 'Band', 'Energie', 'Funk2', 'Karte', 'Schiff'): mat('Schirm ' + n, (0.0, 0.0, 0.0), 0.0, 0.2, (0.25, 0.6, 1.0), 2.2)
    mat('Schirm Holo', (0, 0, 0), 0.0, 0.1, alpha=0.0)
    coll, netze = rumpf_laden(os.path.join(B, '..', '..', 'glb', 'ship', NAME + '.glb'), LAENGE)
    cp = bpy.data.collections.new('Cockpit'); sc.collection.children.link(cp)
    huelle(netze); boden_und_deck(); gl, gr = station(AUGE.x, True); station(-AUGE.x, False); mitte(); hinten()
    SAM.fertig(cp, 'cp')
    json.dump({'schiff': NAME, 'laenge': LAENGE, 'auge': [round(AUGE.x, 4), round(AUGE.z, 4), round(-AUGE.y, 4)],
               'griff_l': [round(gl.x, 4), round(gl.z, 4), round(-gl.y, 4)], 'griff_r': [round(gr.x, 4), round(gr.z, 4), round(-gr.y, 4)]}, open(os.path.join(B, 'cp-kormoran.json'), 'w'), indent=1)
    return coll, cp

if __name__ == '__main__':
    arg = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    coll, cp = baue()
    import re
    aus = re.compile(r' ~i|glas|Anzeige|Bildschirm|Licht|LED |Ambient|Decken|HUD|Warnschraffur|Lack ocker|Taste', re.I)
    for o in coll.objects:
        n = o.data.materials[0].name if o.data.materials else ''
        if aus.search(n): o.hide_render = True
    AN = {'vorn': (0, -10), 'links': (-60, -22), 'rechts': (60, -18), 'unten': (0, -40), 'hinten': (150, -10), 'oben': (20, 40), 'mitte': (40, -30)}
    for a in arg:
        if a.startswith('bild:'):
            k = a[5:]; cam = kamera(k, AUGE, *AN[k]); bild(os.path.join(B, 'cp-kormoran-%s.jpg' % k), cam, 1280, 720, 48, welt=5.0, sonne=((0.5, 0.35, 0.6), 4.0))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'CockpitKormoran.blend'))
    print('FERTIG', sum(len(o.data.polygons) for o in cp.objects), 'Flächen')
