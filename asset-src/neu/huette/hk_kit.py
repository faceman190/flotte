# Hütten-Baukasten der Eisenkrone: Innenräume aus Zellen von 6 × 6 m, eigener Look neben dem Bastion-Baukasten (../bastion).
# Aufruf ohne Fenster: blender.exe -b --python hk_lauf.py -- <bilder> (baut HuetteKit.blend neu; hk_kit.py, dann hk_plan.py)
#
# Unterschiede zur Bastion (Wunsch des Nutzers, 17.11.2026: „eigener Baukasten, andere Farbakzente, größere Gänge“):
#   Maße    Zelle 6 m statt 4 m. Gang innen 4,6 m breit, Wände 4,4 m hoch, darüber die offene Decke mit Trägern (Bastion: 3,4 × 2,9 m mit
#           Deckenschrägen). Räume 6 m hoch. Tore 3,2 × 3,4 m in 1,4 m dicken Wänden.
#   Formen  Hütte statt Kriegsschiff: genietete Stahlbleche, Wellblech oben, Doppel-T-Träger mit Kopfbändern, Rohrbrücke und Hängebahn unter
#           der Decke, Rammschutz an den Wänden, Kabelkanäle mit Rost an beiden Wänden statt eines Grabens in der Mitte.
#   Farben  Oxidrot (Mennige) für Träger und Rahmen, Petrol als Farbe der Gilde (wie am Außenmodell) für Tore und Schränke, Messing für
#           Beschläge und Schilder, warmes Natriumlicht statt kühlem Weiß, Rot-Weiß-Schraffur statt Schwarz-Orange.
# Aufbau wie in der Bastion: Hüllen je Zelle (Seitenzustände W O D X C B), Wandfüllungen (2,7 m breit, zwei je Wandseite), Objekte.
# Jeder Baustein wird einmal gebaut (eigene Sammlung) und als Instanz gesetzt. Materialien und Bauhelfer aus ../bastion/bk_lib.py.
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix
PI = math.pi
HERE = os.path.dirname(bpy.data.filepath)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for c in list(bpy.data.collections): bpy.data.collections.remove(c)
SC = bpy.context.scene
CUR = [SC.collection]; REC = [None]
CELL, HALF = 6.0, 3.0
W = 2.3                     # halbe Gangbreite: Wandfläche bei x = −W (Bezugsseite aller Wandteile)
HW, HB = 3.6, 4.4           # Oberkante Blechwand (darüber Wellblech), Unterkante Träger
HC = 4.8                    # Gangdecke
RH, RB = 6.4, 5.9           # Raumdecke, Unterkante der Raumträger
DOOR_W, DOOR_H = 3.2, 3.4   # Toröffnung
FW = 2.7                    # Breite einer Wandfüllung; Mitten bei y = ±1.55 (zwischen Mittelspant und Zellgrenze)
exec(compile(open(os.path.join(HERE, '..', 'bastion', 'bk_lib.py'), encoding='utf-8').read(), 'bk_lib.py', 'exec'))

# ---------- Materialien der Hütte ----------
SODIUM = (1.0, 0.66, 0.36)      # Natriumlicht
M.update(
    hwand=mk('Huettenblech', (0.058, 0.054, 0.05), 0.5, 0.55, streak=0.4, bump=0.3, wear=0.7),
    hwand2=mk('Huettenblech hell', (0.09, 0.084, 0.077), 0.45, 0.52, streak=0.35, bump=0.3, wear=0.7),
    hwand3=mk('Huettenblech dunkel', (0.038, 0.036, 0.034), 0.55, 0.55, streak=0.35, bump=0.3, wear=0.7),
    hwelle=mk('Wellblech', (0.072, 0.07, 0.066), 0.6, 0.5, streak=0.5, bump=0.2, wear=0.6),
    oxid=mk('Mennige', (0.075, 0.026, 0.018), 0.15, 0.6, var=0.25, streak=0.3, bump=0.3, wear=1.0),
    oxid2=mk('Mennige dunkel', (0.045, 0.02, 0.015), 0.2, 0.62, var=0.25, streak=0.3, bump=0.3, wear=1.0),
    petrol=mk('Gildenpetrol', (0.01, 0.042, 0.04), 0.25, 0.48, var=0.2, streak=0.25, bump=0.3, wear=0.9),
    petrol2=mk('Gildenpetrol hell', (0.018, 0.06, 0.056), 0.2, 0.48, var=0.18, bump=0.3, wear=0.9),
    brass=mk('Messing', (0.3, 0.21, 0.1), 1.0, 0.36, var=0.3),
    brass2=mk('Messing matt', (0.24, 0.17, 0.08), 1.0, 0.5, var=0.25),
    riffel=mk('Riffelblech', (0.05, 0.048, 0.045), 0.85, 0.42, scale=9, studs=True, wear=0.8),
    hboden=mk('Hallenboden', (0.055, 0.052, 0.048), 0.55, 0.6, var=0.25, scale=3.0, bump=0.3, wear=0.6),
    hrost=mk('Huettenrost', (0.055, 0.05, 0.046), 0.9, 0.4),
    isol=mk('Isolierblech', (0.48, 0.48, 0.47), 1.0, 0.42, var=0.15, scale=2.0),
    guss=mk('Grauguss', (0.08, 0.078, 0.075), 0.8, 0.55, var=0.3, bump=0.5, bscale=90.0),
    rostbr=mk('Rost braun', (0.16, 0.07, 0.03), 0.3, 0.75, var=0.4, bump=0.6, bscale=60.0),
    holz=mk('Bohle', (0.05, 0.032, 0.019), 0.0, 0.7, var=0.3, scale=4.0, bump=0.4, bscale=40.0),
    sack=mk('Sackleinen', (0.16, 0.13, 0.09), 0.0, 0.9, var=0.25, bump=0.6, bscale=300.0),
    erz=mk('Erz', (0.09, 0.07, 0.06), 0.4, 0.7, var=0.5, scale=6.0, bump=0.8, bscale=30.0, grime=False),
    kupferb=mk('Kupferbarren', (0.32, 0.15, 0.09), 1.0, 0.38, var=0.25),
    eisenb=mk('Eisenbarren', (0.17, 0.17, 0.18), 1.0, 0.4, var=0.2),
    gasblau=mk('Flasche blau', (0.012, 0.028, 0.085), 0.15, 0.45, var=0.2, wear=0.8),
    gasrot=mk('Flasche rotbraun', (0.08, 0.018, 0.012), 0.15, 0.45, var=0.2, wear=0.8),
    txtb=mk('Schrift messing', (0.62, 0.45, 0.2), 1.0, 0.35, var=0.15, grime=False),
    txtr=mk('Schrift oxid', (0.5, 0.1, 0.05), 0.0, 0.5, var=0.2, grime=False),
    e_sod=mk('Natriumlicht', (1, 0.7, 0.4), 0, 0.3, var=0, rvar=0, emit=SODIUM, es=9, grime=False),
    e_sod2=mk('Natriumlicht schwach', (1, 0.7, 0.4), 0, 0.3, var=0, rvar=0, emit=SODIUM, es=3.5, grime=False),
    e_glut=mk('Glut', (1, 0.35, 0.08), 0, 0.4, var=0, rvar=0, emit=(1.0, 0.3, 0.05), es=9, grime=False),
    e_signal=mk('Signal bernstein', (1, 0.55, 0.1), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.5, 0.08), es=8, grime=False),
)
M['warnrw'] = stripes('Schraffur rot-weiss', (0.24, 0.235, 0.22), (0.12, 0.028, 0.02), 7)
M['warnrw2'] = stripes('Schraffur rot-weiss Boden', (0.2, 0.195, 0.185), (0.1, 0.024, 0.018), 3)
M['schirm'] = stripes('Bildschirm bernstein', (0.95, 0.55, 0.12), (0.06, 0.025, 0.0), 30, emit=2.0, direction='Z', duty=0.4)
WARMDIM = (1.0, 0.6, 0.3)

# ---------- Bausteine: einmal bauen, als Instanz setzen ----------
MOD = {}
ANG = {0: -PI / 2, 1: PI, 2: PI / 2, 3: 0.0}      # Drehung der Bezugsseite (West) auf Nord, Ost, Süd, West
def module(name, fn, *a):
    if name not in MOD:
        c = bpy.data.collections.new(name); MOD[name] = c; prev = CUR[0]; CUR[0] = c
        try: fn(*a)
        finally: CUR[0] = prev
    return MOD[name]
def rotz(objs, ang, loc=(0, 0, 0)):
    Rm = Matrix.Translation(loc) @ Matrix.Rotation(ang, 4, 'Z')
    for ob in objs: ob.matrix_basis = Rm @ ob.matrix_basis
def on_side(k, fn, *a):
    REC[0] = []; fn(*a); objs = REC[0]; REC[0] = None; rotz(objs, ANG[k])
def inst(c, loc, ang=0.0, into=None, name=None):
    e = bpy.data.objects.new(name or ('I ' + c.name), None); e.instance_type = 'COLLECTION'; e.instance_collection = c
    e.location = loc; e.rotation_euler = (0, 0, ang); e.empty_display_size = 0.3; (into or CUR[0]).objects.link(e); return e
def array(ob, n, off):
    ar = ob.modifiers.new('Reihe', 'ARRAY'); ar.count = n; ar.use_relative_offset = False; ar.use_constant_offset = True; ar.constant_offset_displace = off
    return ob
def rivets(x, ys, zs, axis='X', m=None, r=0.014):      # Nietköpfe: flache Halbkugeln als niedrige Zylinder mit Fase
    for y in ys:
        for z in zs: cyl('Niet', r, 0.012, x, y, z, m or M['steel'], axis, n=6, bev=0)
def rivet_row(x, y0, y1, z, step=0.15, axis='X', m=None, alongz=False, z1=None):
    n = max(1, int(round((y1 - y0) / step)))
    ob = cyl('Nietreihe', 0.013, 0.012, x, y0, z, m or M['steel'], axis, n=6, bev=0)
    return array(ob, n + 1, (0, 0, (z1 - z) / n) if alongz else (0, (y1 - y0) / n, 0))
def ibeam(name, ln, x, y, z, axis, h=0.36, b=0.22, tf=0.03, tw=0.018, m=None, up='Z'):
    # Doppel-T-Träger der Länge ln entlang axis, Höhe h in Richtung up, Breite b in der dritten Richtung, Mitte (x, y, z)
    m = m or M['oxid']; ax = 'XYZ'.index(axis); ui = 'XYZ'.index(up); wi = 3 - ax - ui
    def sz(a, u, w): d = [0, 0, 0]; d[ax] = a; d[ui] = u; d[wi] = w; return d
    for sg in (-1, 1):
        c = [x, y, z]; c[ui] += sg * (h / 2 - tf / 2); box(name + ' Flansch', *sz(ln, tf, b), *c, m, 0.004)
    box(name + ' Steg', *sz(ln, h - 2 * tf, tw), x, y, z, m, 0)
def stencil(s, size, origin, xd, yd, m=None): return text(s, size, origin, xd, yd, m or M['txtw'], name='Schablone')
def crown(c, xd, yd, R, m):      # Zeichen der Eisenkrone: Barren als Sockel, darüber drei Zacken (Krone aus Ambossspitzen), eigener Entwurf
    mw, X, Y, Z = frame(c, xd, yd); c = Vector(c) + Z * 0.004
    pipe('Krone Barren', [c - X * R * 0.62 - Y * R * 0.55, c + X * R * 0.62 - Y * R * 0.55], R * 0.11, m)
    pipe('Krone Linie', [c - X * R * 0.5 - Y * R * 0.3, c - X * R * 0.62 + Y * R * 0.42, c - X * R * 0.25 + Y * R * 0.05, c + Y * R * 0.6,
                         c + X * R * 0.25 + Y * R * 0.05, c + X * R * 0.62 + Y * R * 0.42, c + X * R * 0.5 - Y * R * 0.3, c - X * R * 0.5 - Y * R * 0.3], R * 0.07, m)
    for q in (-0.62, 0, 0.62): cyl('Krone Perle', R * 0.1, R * 0.06, *(c + X * R * q + Y * R * (0.5 if q else 0.7)), m, 'X', n=12, bev=0)

# =====================================================================================
# Hüllen: Gangzelle (Seitenzustände W Wand · O offen · D Tor zum Raum · C geschlossenes Tor · B Schott zwischen Gangzellen)
# =====================================================================================
def wall_plates(y0, y1, z0, z1, mats=('hwand', 'hwand2', 'hwand', 'hwand3'), seed=0, cols=2):
    # Blechwand bei x = −W aus genieteten Tafeln (je Spalte zwei bis drei Felder, Fugen 1 cm), Nietreihen an den Tafelkanten
    R = random.Random(seed); ws = (y1 - y0) / cols
    for i in range(cols):
        ya, yb = y0 + i * ws, y0 + (i + 1) * ws; cuts = sorted([z0] + [z0 + (z1 - z0) * R.uniform(0.3, 0.45)] + ([z0 + (z1 - z0) * R.uniform(0.62, 0.8)] if R.random() < 0.6 else []) + [z1])
        for j in range(len(cuts) - 1):
            za, zb = cuts[j], cuts[j + 1]; m = M[mats[(i + j + seed) % len(mats)]]
            box('Tafel', 0.014, yb - ya - 0.012, zb - za - 0.012, -W + 0.007, (ya + yb) / 2, (za + zb) / 2, m, 0.004)
            for zz in (za + 0.05, zb - 0.05): rivet_row(-W + 0.016, ya + 0.06, yb - 0.06, zz, 0.16)
    box('Wandgrund', 0.06, y1 - y0, z1 - z0, -W - 0.03, (y0 + y1) / 2, (z0 + z1) / 2, M['hwand3'], 0)
def corrugated(y0, y1, z0, z1, x=None):      # Wellblechband (Trapezprofil: Rippen als schmale Kästen vor dem Grund)
    x = -W if x is None else x
    box('Wellgrund', 0.03, y1 - y0, z1 - z0, x - 0.015, (y0 + y1) / 2, (z0 + z1) / 2, M['hwelle'], 0)
    n = int((y1 - y0) / 0.2)
    array(box('Wellrippe', 0.035, 0.09, z1 - z0, x + 0.0175, y0 + 0.1, (z0 + z1) / 2, M['hwelle'], 0), n, (0, (y1 - y0) / n, 0))
    for z in (z0 + 0.03, z1 - 0.03): box('Wellleiste', 0.05, y1 - y0, 0.06, x + 0.025, (y0 + y1) / 2, z, M['oxid2'], 0.006)
def fender(y0, y1):      # Rammschutz: zwei Rohre auf Konsolen, unten ein Stoßbalken mit Schraffur
    for z in (0.55, 0.95): pipe('Rammrohr', [(-W + 0.16, y0 + 0.1, z), (-W + 0.16, y1 - 0.1, z)], 0.045, M['oxid'])
    for y in [y0 + 0.4 + q * 1.1 for q in range(int((y1 - y0 - 0.6) / 1.1) + 1)]:
        box('Konsole', 0.16, 0.08, 0.5, -W + 0.08, y, 0.75, M['oxid2'], 0.008)
    box('Stossbalken', 0.1, y1 - y0 - 0.2, 0.16, -W + 0.05, (y0 + y1) / 2, 0.08, M['warnrw'], 0.008)
def column(y=0.0, h=HB):      # Mittelspant an der Wand: Doppel-T-Stütze, Fußplatte mit Ankern, Kopfband zur Decke, Nummer
    ibeam('Stuetze', h, -W + 0.12, y, h / 2, 'Z', h=0.24, b=0.3, up='X')
    box('Fussplatte', 0.44, 0.5, 0.04, -W + 0.2, y, 0.02, M['oxid2'], 0.006)
    for (dx, dy) in ((0.06, -0.19), (0.06, 0.19), (0.34, -0.19), (0.34, 0.19)): cyl('Anker', 0.022, 0.05, -W + dx, y + dy, 0.06, M['steel'], 'Z', n=6, bev=0)
    box('Stuetze Band', 0.25, 0.31, 0.12, -W + 0.12, y, 1.6, M['petrol'], 0.004)
    stencil('%02d' % (int(abs(y) * 7 + 3) % 40), 0.09, (-W + 0.245, y - 0.05, 1.56), LEFT_X, LEFT_Y)
    rivets(-W + 0.245, [y - 0.1, y + 0.1], [0.4, 1.1, 2.2, 3.0])
def gang_wall(seed):
    wall_plates(-HALF, HALF, 0.0, HW, seed=seed); corrugated(-HALF, HALF, HW, HB)
    column(0.0)
    box('Randbalken', 0.3, CELL, 0.4, -W + 0.15, 0, HB + 0.2, M['oxid'], 0.01)      # Längsträger über der Wand
    prism('Kopfband', [(-0.15, HB - 0.9), (0.15, HB - 0.9), (0.15, HB - 0.75), (-0.15, HB - 0.75)], -W + 0.02, -W + 0.24, M['oxid'], 'X', 0.006)
    box('Kopfband', 0.2, 0.16, 1.1, -W + 0.45, 0, HB - 0.38, M['oxid'], 0.008, (0, math.radians(-38), 0))
    streak((-W + 0.25, 0.0, 2.6), LEFT_X, LEFT_Y, 0.2, 1.6, 'rost'); streak((-W + 0.02, -1.4 + (seed % 3), HW - 0.05), LEFT_X, LEFT_Y, 0.8, 2.2, 'spur')
def door_frame(closed, sign_text=''):
    # Tor in der Zellgrenze (x = −3), Laibung von der Wandfläche (−W) bis dorthin; Gegenstück an der Raumseite (raum_side 'X')
    hw, hh = DOOR_W / 2, DOOR_H
    for sy in (-1, 1):      # Wandstücke neben dem Tor und Sturz
        wall_plates(sy * hw if sy > 0 else -HALF, HALF if sy > 0 else -hw, 0.0, HW, seed=3 + sy, cols=1)
        prism('Laibung', [(sy * hw, 0.0), (sy * (hw + 0.05), 0.0), (sy * (hw + 0.05), hh), (sy * hw, hh)], -HALF, -W, M['hwand3'], 'X', 0)
        ibeam('Torpfosten', hh, -HALF + 0.12, sy * (hw + 0.15), hh / 2, 'Z', h=0.24, b=0.3, up='X')
        box('Torpfosten Schraffur', 0.05, 0.3, hh, -W + 0.025, sy * (hw + 0.15), hh / 2, M['warnrw'], 0.004)
    corrugated(-HALF, HALF, HW, HB)
    box('Randbalken', 0.3, CELL, 0.4, -W + 0.15, 0, HB + 0.2, M['oxid'], 0.01)      # wie an der Gangwand: schließt das Band bis zur Decke (sonst Blick in den Wandhohlraum)
    box('Sturz', HALF - W, DOOR_W + 0.1, HB - hh, -(HALF + W) / 2, 0, (hh + HB) / 2, M['hwand3'], 0)
    ibeam('Torsturz', DOOR_W + 0.6, -HALF + 0.12, 0, hh + 0.18, 'Y', h=0.36, b=0.24)
    box('Sturzblende', 0.04, DOOR_W + 0.6, 0.5, -W + 0.02, 0, hh + 0.25, M['oxid'], 0.006)
    box('Torleuchte', 0.05, 1.2, 0.06, -W + 0.06, 0, hh + 0.56, M['e_signal'], 0)
    area('Torlicht', (-W + 0.25, 0, hh + 0.5), (0, math.radians(-40), 0), 1.0, 0.1, 30, (1.0, 0.55, 0.15))
    box('Schwelle', HALF - W + 0.1, DOOR_W, 0.04, -(HALF + W) / 2, 0, 0.02, M['steel'], 0.006)
    box('Schwellenschraffur', 0.5, DOOR_W, 0.003, -W + 0.3, 0, 0.0135, M['warnrw2'], 0)
    lw = hw + 0.05
    for sy in (-1, 1):      # Torblätter (Petrol mit Messingleisten): geschlossen in der Mitte, offen in die Wand gefahren
        yc = sy * lw / 2 if closed else sy * (hw + 0.55)
        box('Torblatt', 0.12, lw if closed else 0.9, hh - 0.05, -HALF + 0.35, yc, (hh - 0.05) / 2, M['petrol'], 0.012)
        if closed:
            for z in (0.9, 2.3): box('Torleiste', 0.02, lw - 0.2, 0.08, -HALF + 0.42, yc, z, M['brass'], 0.004)
            box('Torfenster', 0.02, 0.36, 0.5, -HALF + 0.42, sy * 0.4, 1.75, M['glass'], 0.006)
            box('Torschraffur', 0.13, lw, 0.22, -HALF + 0.35, yc, 0.12, M['warnrw'], 0.004)
            rivet_row(-HALF + 0.425, yc - lw / 2 + 0.1, yc + lw / 2 - 0.1, 3.1, 0.2)
        else:
            box('Torkante', 0.13, 0.08, hh - 0.05, -HALF + 0.35, sy * (hw + 0.14), (hh - 0.05) / 2, M['warnrw'], 0.004)
    cyl('Tor LED', 0.025, 0.02, -W + 0.03, -hw - 0.45, 1.6, M['e_red' if closed else 'e_green'], 'X', n=12, bev=0)
    box('Torkasten', 0.12, 0.3, 0.42, -W + 0.06, -hw - 0.45, 1.3, M['petrol'], 0.01); box('Torknopf', 0.02, 0.12, 0.12, -W + 0.13, -hw - 0.45, 1.25, M['brass'], 0.004)
def bulkhead():      # Schott zwischen zwei Gangzellen (Zellgrenze x = −3): Rahmen verengt auf 3,4 × 3,6 m, Torblätter eingefahren
    hw, hh = 1.7, 3.6
    for sy in (-1, 1):
        prism('Schott', [(sy * hw, 0.0), (sy * (W + 0.05), 0.0), (sy * (W + 0.05), HC), (sy * hw, HC)], -HALF - 0.25, -HALF + 0.25, M['hwand3'], 'X', 0.006)
        ibeam('Schottpfosten', hh, -HALF, sy * (hw + 0.12), hh / 2, 'Z', h=0.5, b=0.24, up='X')
        box('Schottkante', 0.52, 0.05, hh, -HALF, sy * (hw + 0.025), hh / 2, M['warnrw'], 0.004)
        box('Schottblatt', 0.12, 0.08, hh - 0.1, -HALF + 0.14, sy * (hw + 0.02), (hh - 0.1) / 2, M['petrol'], 0.008)
        cyl('Hubzylinder', 0.06, 1.4, -HALF - 0.3, sy * (hw + 0.35), hh + 0.4, M['oxid2'], 'Y', n=14, bev=0.006)
        for sx in (-1, 1): rivets(-HALF + sx * 0.26, [sy * (hw + 0.3)], [0.5, 1.2, 1.9, 2.6, 3.3])
    box('Schottsturz', 0.5, 2 * W + 0.1, HC - hh, -HALF, 0, (hh + HC) / 2, M['hwand3'], 0)
    ibeam('Schottriegel', 2 * hw + 0.6, -HALF, 0, hh + 0.2, 'Y', h=0.4, b=0.5)
    box('Schottschwelle', 0.5, 2 * hw, 0.05, -HALF, 0, 0.025, M['steel'], 0.006)
    for sx in (-1, 1): box('Schwellenschraffur', 0.35, 2 * hw, 0.003, -HALF + sx * 0.45, 0, 0.0135, M['warnrw2'], 0)
    for sx in (-1, 1):
        stencil('SCHOTT 4', 0.14, (-HALF + sx * 0.255, sx * -0.55, hh + 0.42), LEFT_X if sx > 0 else RIGHT_X, LEFT_Y, M['txtw'])
        box('Schottlampe', 0.05, 0.5, 0.08, -HALF + sx * 0.27, 0, hh + 0.05, M['e_signal'], 0)
def gang_side(st, k, seed):
    if st == 'W': gang_wall(seed)
    elif st == 'D': door_frame(False)
    elif st == 'C': door_frame(True)
    elif st == 'B': bulkhead()
def gang_floor_side(is_open):      # Kabelkanal an der Wand (nur an Wandseiten): Abdeckung mit Rost, 3 cm über dem Boden, dazu die weiße Randlinie
    if is_open: return
    for sx in (-1, 1): box('Kanalrahmen', 0.04, CELL, 0.035, -W + 0.31 + sx * 0.29, 0, 0.0175, M['steel'], 0.004)
    array(box('Kanalrost', 0.54, 0.02, 0.025, -W + 0.31, -HALF + 0.05, 0.0125, M['hrost'], 0), 60, (0, 0.1, 0))
    box('Randlinie', 0.08, CELL, 0.003, -W + 0.72, 0, 0.0015, M['white'], 0)
def corner_pillar():      # Innenecke bei (−3, −3): massive Ecksäule bis zur Decke, unten Schraffur (schließt den Spalt zwischen den Nachbarwänden)
    s = HALF - W + 0.05; c = -HALF + s / 2; e = -HALF + s
    box('Ecksaeule', s, s, HC, c, c, HC / 2, M['hwand3'], 0.01)
    box('Eckschutz', s + 0.02, s + 0.02, 1.0, c, c, 0.5, M['warnrw'], 0.006)
    box('Eckwinkel', 0.05, s + 0.05, HC, e + 0.025, c + 0.025, HC / 2, M['oxid'], 0.006); box('Eckwinkel', s + 0.05, 0.05, HC, c + 0.025, e + 0.025, HC / 2, M['oxid'], 0.006)
CORNERS = ((3, 2, 0.0), (2, 1, PI / 2), (1, 0, PI), (0, 3, -PI / 2))
def gang_ceiling(ns, st):
    # offene Decke: Querträger über dem Mittelspant, Deckenblech, Rohrbrücke längs (gedämmte Leitung, zwei Rohre, Kabelpritsche),
    # Hängebahn (Doppel-T-Schiene) mit Laufkatze in jeder zweiten Zelle, zwei Hallenstrahler
    box('Deckenblech', CELL, CELL, 0.06, 0, 0, HC + 0.03, M['hwand3'], 0)
    for q in range(5): box('Deckenrippe', CELL, 0.08, 0.12, 0, -2.4 + q * 1.2, HC - 0.06, M['hwelle'], 0)
    ibeam('Quertraeger', CELL, 0, 0, HB + 0.2, 'X', h=0.4, b=0.24)
    REC2 = REC[0]
    # alles Längslaufende im Bezug „Gang läuft entlang y“ bauen, für Ost-West-Gänge gedreht
    REC[0] = []
    pipe('Daemmleitung', [(-1.45, -HALF, HB - 0.32), (-1.45, HALF, HB - 0.32)], 0.26, M['isol'])
    for y in (-2.0, 0.6, 2.4): cyl('Daemmband', 0.268, 0.04, -1.45, y, HB - 0.32, M['steel'], 'Y', n=24, bev=0)
    for (x, r, mat) in ((-0.95, 0.07, 'oxid'), (-0.72, 0.05, 'copper')): pipe('Leitung', [(x, -HALF, HB - 0.2), (x, HALF, HB - 0.2)], r, M[mat])
    box('Kabelpritsche', 0.6, CELL, 0.03, 1.6, 0, HB - 0.12, M['steel'], 0.004)
    for sx in (-1, 1): box('Pritschenrand', 0.02, CELL, 0.1, 1.6 + sx * 0.3, 0, HB - 0.08, M['steel'], 0)
    for (x, r, mat) in ((1.42, 0.03, 'rubber'), (1.52, 0.022, 'oxid'), (1.62, 0.035, 'rubber'), (1.74, 0.02, 'petrol')): pipe('Kabel', [(x, -HALF, HB - 0.08 + r), (x, HALF, HB - 0.08 + r)], r, M[mat])
    for y in (-1.5, 1.5):
        box('Rohrhaenger', 0.04, 0.04, 0.5, -1.2, y, HB - 0.05, M['steel'], 0); box('Rohrjoch', 1.0, 0.06, 0.04, -1.2, y, HB - 0.32 - 0.28, M['oxid2'], 0.004)
    ibeam('Haengebahn', CELL, 0.55, 0, HB - 0.32, 'Y', h=0.22, b=0.12, m=M['oxid2'])
    for y in (-1.6, 1.6):
        pipe('Lampenpendel', [(-0.25, y, HB), (-0.25, y, HB - 0.55)], 0.012, M['steel'])
        cyl('Strahler Haube', 0.32, 0.22, -0.25, y, HB - 0.65, M['oxid2'], 'Z', n=24, bev=0.006, r2=0.12)
        cyl('Strahler Glas', 0.26, 0.02, -0.25, y, HB - 0.77, M['e_sod'], 'Z', n=24, bev=0)
        for a in range(4): box('Schutzkorb', 0.012, 0.56, 0.012, -0.25, y, HB - 0.84, M['steel'], 0, (0, 0, a * PI / 4))
        area('Strahlerlicht', (-0.25, y, HB - 0.8), (0, 0, 0), 0.5, 0.5, 170, SODIUM)
    objs = REC[0]; REC[0] = REC2
    if not ns: rotz(objs, PI / 2)
    if REC[0] is not None: REC[0].extend(objs)
def build_gang(st, cm, cd):
    CUR[0] = cm; ns = st[0] != 'W' or st[2] != 'W'
    box('Unterboden', CELL, CELL, 0.4, 0, 0, -0.22, M['hwand3'], 0)
    for q in range(4):      # Riffelblechtafeln 1,5 × 3 m
        for y0 in (-HALF, 0.0): box('Riffeltafel', 1.48, 2.98, 0.03, -HALF + 0.75 + q * 1.5, y0 + 1.5, -0.015, M['riffel'], 0.004)
    R = random.Random(sum(ord(q) * (i + 3) for i, q in enumerate(st)))
    spot((R.uniform(-1.2, 1.2), R.uniform(-2, 2), 0.0125), 0.35, 'fleck'); spot((R.uniform(-1.2, 1.2), R.uniform(-2, 2), 0.0125), 0.5, 'abrieb', 1.8)
    REC[0] = []; arrow((-0.2, -0.9, 0.0125), FL_X, FL_Y, 1.2, M['txtw'], 0.16); stencil('H%d' % (R.randint(1, 9)), 0.22, (0.6, 1.4, 0.0125), FL_X, FL_Y); dec = REC[0]; REC[0] = None
    if not ns: rotz(dec, PI / 2)
    if len(st) > 4:
        for i, (_a, _b, ang) in enumerate(CORNERS):
            if st[4 + i] == 'k': REC[0] = []; corner_pillar(); objs = REC[0]; REC[0] = None; rotz(objs, ang)
    for k in range(4):
        CUR[0] = cm; on_side(k, gang_floor_side, st[k] != 'W'); on_side(k, gang_side, st[k], k, k + len(st))
    CUR[0] = cd; REC[0] = []; gang_ceiling(ns, st); REC[0] = None

# =====================================================================================
# Hüllen: Raumzelle (6 m hoch). Wandfläche ebenfalls bei x = −W, damit dieselben Wandfüllungen passen.
# Seiten: W Wand · O offen (derselbe Raum) · X Wand mit Tor (Laibung von der Zellgrenze bis zur Wandfläche)
# =====================================================================================
def raum_side(st, k):
    if st == 'F': window_wall(k); return
    if st == 'W':
        wall_plates(-HALF, HALF, 0.0, HW, seed=k + 11); corrugated(-HALF, HALF, HW, RB)
        column(0.0, RB)
        box('Kranbahn Konsole', 0.5, 0.3, 0.3, -W + 0.4, 0, 4.6, M['oxid'], 0.008)
        ibeam('Kranbahn', CELL, -W + 0.55, 0, 4.88, 'Y', h=0.3, b=0.2)
        box('Randbalken', 0.3, CELL, 0.5, -W + 0.15, 0, RB + 0.25, M['oxid'], 0.01)
        box('Wandleuchte', 0.12, 1.4, 0.1, -W + 0.08, -1.55, HW + 0.2, M['e_sod2'], 0); box('Wandleuchte', 0.12, 1.4, 0.1, -W + 0.08, 1.55, HW + 0.2, M['e_sod2'], 0)
        area('Wandlicht', (-W + 0.3, 0, HW + 0.1), (0, math.radians(-60), 0), 2.8, 0.1, 30, SODIUM)
    elif st == 'X':
        hw, hh = DOOR_W / 2, DOOR_H
        for sy in (-1, 1):
            wall_plates(hw if sy > 0 else -HALF, HALF if sy > 0 else -hw, 0.0, HW, seed=k + 21, cols=1)
            prism('Laibung', [(sy * hw, 0.0), (sy * (hw + 0.05), 0.0), (sy * (hw + 0.05), hh), (sy * hw, hh)], -HALF, -W, M['hwand3'], 'X', 0)
            box('Torpfosten Schraffur', 0.05, 0.3, hh, -W + 0.025, sy * (hw + 0.15), hh / 2, M['warnrw'], 0.004)
            fender(-HALF, -hw - 0.3) if sy < 0 else fender(hw + 0.3, HALF)
        corrugated(-HALF, HALF, HW, RB)
        box('Sturz', HALF - W, DOOR_W + 0.1, HW - hh + 0.01, -(HALF + W) / 2, 0, (hh + HW) / 2, M['hwand3'], 0)
        box('Sturzblende', 0.04, DOOR_W + 0.6, 0.4, -W + 0.02, 0, hh + 0.2, M['oxid'], 0.006)
        box('Randbalken', 0.3, CELL, 0.5, -W + 0.15, 0, RB + 0.25, M['oxid'], 0.01)
        box('Schwelle', HALF - W + 0.1, DOOR_W, 0.04, -(HALF + W) / 2, 0, 0.02, M['steel'], 0.006)
def room_corner():      # Ecke zweier Wandseiten bei (−W, −W): Eckstütze
    ibeam('Eckstuetze', RB, -W + 0.15, -W + 0.15, RB / 2, 'Z', h=0.3, b=0.3, up='X')
    box('Eckschutz', 0.34, 0.34, 1.0, -W + 0.15, -W + 0.15, 0.5, M['warnrw'], 0.006)
def build_raum(st, cm, cd):
    CUR[0] = cm
    box('Unterboden', CELL, CELL, 0.4, 0, 0, -0.22, M['hwand3'], 0)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Bodenplatte', 2.96, 2.96, 0.04, sx * 1.5, sy * 1.5, -0.02, M['hboden'], 0.006)
    R = random.Random(sum(ord(q) * (i + 5) for i, q in enumerate(st)))
    spot((R.uniform(-2, 2), R.uniform(-2, 2), 0.0125), 0.6, 'fleck', 1.4); spot((R.uniform(-2, 2), R.uniform(-2, 2), 0.0125), 0.8, 'abrieb', 1.6)
    for i, (a, b, ang) in enumerate(CORNERS):
        if st[a] == 'W' and st[b] == 'W': REC[0] = []; room_corner(); objs = REC[0]; REC[0] = None; rotz(objs, ang)
    for k in range(4): on_side(k, raum_side, st[k], k)
    CUR[0] = cd; REC[0] = []
    box('Raumdecke', CELL, CELL, 0.06, 0, 0, RH + 0.03, M['hwand3'], 0)
    for q in range(5): box('Deckenrippe', CELL, 0.08, 0.14, 0, -2.4 + q * 1.2, RH - 0.07, M['hwelle'], 0)
    ibeam('Raumtraeger', CELL, 0, 0, RB + 0.25, 'X', h=0.5, b=0.26); ibeam('Raumtraeger', CELL, 0, 0, RB + 0.25, 'Y', h=0.5, b=0.26)
    pipe('Lampenpendel', [(0, 0, RB), (0, 0, RB - 1.0)], 0.014, M['steel'])
    cyl('Halle Haube', 0.5, 0.3, 0, 0, RB - 1.15, M['oxid2'], 'Z', n=28, bev=0.006, r2=0.18)
    cyl('Halle Glas', 0.42, 0.02, 0, 0, RB - 1.31, M['e_sod'], 'Z', n=28, bev=0)
    area('Hallenlicht', (0, 0, RB - 1.34), (0, 0, 0), 0.8, 0.8, 420, SODIUM)
    pipe('Sprinkler', [(1.2, -HALF, RB - 0.1), (1.2, HALF, RB - 0.1)], 0.03, M['red'])
    REC[0] = None
SHELLS = {}
def shell(kind, st):
    key = kind + ' ' + ''.join(st)
    if key not in SHELLS:
        cm = bpy.data.collections.new('Huelle ' + key); cd = bpy.data.collections.new('Decke ' + key); SHELLS[key] = (cm, cd); prev = CUR[0]
        try: (build_gang if kind == 'gang' else build_raum)(st, cm, cd)
        finally: CUR[0] = prev
    return SHELLS[key]

# =====================================================================================
# Wandfüllungen: an der Bezugsseite gebaut (Wand bei x = −W), Mitte bei y = 0, von y = −1,35 bis 1,35, bis 3,6 m hoch.
# =====================================================================================
X0 = -W
def d_platte():      # Tafelfeld mit Schablonennummer und Prüfplakette
    fender(-FW / 2, FW / 2)
    stencil('EK-%d' % 214, 0.16, (X0 + 0.02, -0.6, 2.35), LEFT_X, LEFT_Y); plate(0.16, 0.1, (X0 + 0.017, 0.5, 1.6), LEFT_X, LEFT_Y, M['brass'])
def d_luke():      # Tafeln mit Revisionsluke (verschraubt) und Handgriffen
    fender(-FW / 2, FW / 2)
    box('Luke', 0.04, 1.1, 1.3, X0 + 0.03, 0, 1.25, M['hwand2'], 0.012); box('Lukenrahmen', 0.03, 1.24, 1.44, X0 + 0.02, 0, 1.25, M['oxid'], 0.008)
    for y in (-0.45, 0.45):
        for z in (0.68, 1.82): cyl('Lukenschraube', 0.022, 0.02, X0 + 0.055, y, z, M['brass'], 'X', n=8, bev=0)
    for z in (1.0, 1.5): pipe('Lukengriff', [(X0 + 0.05, -0.2, z), (X0 + 0.12, -0.15, z), (X0 + 0.12, 0.15, z), (X0 + 0.05, 0.2, z)], 0.012, M['steel'])
    stencil('NUR MIT FREIGABE', 0.06, (X0 + 0.052, -0.33, 1.98), LEFT_X, LEFT_Y, M['txtr'])
def d_welle():      # Wellblech über die ganze Höhe mit Lüftungsjalousie
    fender(-FW / 2, FW / 2)
    corrugated(-FW / 2, FW / 2, 0.0, HW, X0 + 0.03)
    box('Jalousierahmen', 0.08, 1.4, 1.0, X0 + 0.09, 0, 2.4, M['oxid'], 0.008)
    for q in range(8): box('Lamelle', 0.06, 1.3, 0.05, X0 + 0.11, 0, 1.98 + q * 0.11, M['hwand3'], 0.004, (0, math.radians(30), 0))
    streak((X0 + 0.14, 0.2, 1.9), LEFT_X, LEFT_Y, 0.9, 1.4, 'rost')
def d_rohre():      # Rohrstrang: drei Leitungen aus dem Boden nach oben, Flansche, Schieber mit Messinghandrad, Manometer
    for (y, r, mat) in ((-0.8, 0.11, 'oxid'), (-0.2, 0.08, 'isol'), (0.5, 0.13, 'petrol')):
        x = X0 + 0.25
        cyl('Steigrohr', r, HW + 0.8, x, y, (HW + 0.8) / 2 - 0.3, M[mat], 'Z', n=20, bev=0)
        for z in (0.35, 1.5, 2.9): cyl('Flansch', r + 0.045, 0.05, x, y, z, M['steel'], 'Z', n=20, bev=0.004)
        for z in (1.2, 2.6): box('Rohrschelle', 0.3, r * 2 + 0.06, 0.05, X0 + 0.13, y, z, M['oxid2'], 0.004)
        cyl('Schiebergehaeuse', r + 0.06, 0.32, x, y, 1.0, M['guss'], 'Z', n=20, bev=0.006)
        cyl('Spindel', 0.02, 0.3, x + r + 0.15, y, 1.0, M['steel'], 'X', n=8, bev=0); ring('Handrad', 0.15, 0.016, (x + r + 0.3, y, 1.0), (1, 0, 0), M['brass'])
    cyl('Manometer', 0.09, 0.05, X0 + 0.32, 0.12, 1.75, M['steel'], 'X', n=24, bev=0.004); cyl('Manometerblatt', 0.075, 0.005, X0 + 0.345, 0.12, 1.75, M['plate'], 'X', n=24, bev=0)
    box('Zeiger', 0.004, 0.006, 0.06, X0 + 0.35, 0.13, 1.77, M['red'], 0, (math.radians(35), 0, 0))
    for (y, s) in ((-0.8, 'SCHLACKE'), (-0.2, 'DAMPF'), (0.5, 'KUEHLWASSER')): label(s, 0.05, (X0 + 0.39, y - 0.1, 0.62), LEFT_X, LEFT_Y)
def d_schalt():      # Schaltschränke in Gildenpetrol mit Leuchtmeldern und Messingschildern
    for (y, w) in ((-0.7, 1.15), (0.6, 1.25)):
        box('Schaltschrank', 0.5, w, 2.2, X0 + 0.25, y, 1.15, M['petrol'], 0.012); box('Sockel', 0.48, w - 0.04, 0.1, X0 + 0.24, y, 0.05, M['oxid2'], 0.004)
        for sy in (-1, 1): box('Tuerfuge', 0.004, 0.008, 1.9, X0 + 0.502, y + sy * 0.0, 1.15, M['hwand3'], 0)
        for q in range(3): cyl('Leuchtmelder', 0.022, 0.03, X0 + 0.51, y - 0.25 + q * 0.12, 1.85, M[('e_green', 'e_signal', 'e_red')[q]], 'X', n=12, bev=0)
        box('Griff', 0.04, 0.03, 0.22, X0 + 0.52, y + 0.12, 1.2, M['brass'], 0.006)
        plate(0.3, 0.07, (X0 + 0.503, y - 0.35, 1.6), LEFT_X, LEFT_Y, M['brass']); warnsign((X0 + 0.503, y + 0.3, 1.62), LEFT_X, LEFT_Y, 0.07)
    pipe('Kabelzug', [(X0 + 0.15, -0.7, 2.25), (X0 + 0.15, -0.7, HW + 0.4)], 0.06, M['rubber']); pipe('Kabelzug', [(X0 + 0.15, 0.6, 2.25), (X0 + 0.15, 0.6, HW + 0.4)], 0.07, M['rubber'])
def d_spinde():      # Spinde in hellem Petrol, Bank davor
    for q in range(5):
        y = -1.08 + q * 0.54
        box('Spind', 0.5, 0.52, 1.95, X0 + 0.25, y, 0.975 + 0.12, M['petrol2' if q % 2 else 'petrol'], 0.01)
        for z in (1.75, 1.82, 1.89): box('Spindschlitz', 0.004, 0.3, 0.018, X0 + 0.502, y, z, M['hwand3'], 0)
        plate(0.12, 0.05, (X0 + 0.503, y - 0.06, 1.55), LEFT_X, LEFT_Y, M['brass']); box('Spindgriff', 0.03, 0.02, 0.12, X0 + 0.51, y + 0.17, 1.15, M['steel'], 0.004)
    box('Spindsockel', 0.5, FW, 0.12, X0 + 0.25, 0, 0.06, M['oxid2'], 0.004)
    box('Bank', 0.36, FW - 0.2, 0.06, X0 + 0.85, 0, 0.45, M['holz'], 0.008)
    for y in (-1.0, 0, 1.0): box('Bankfuss', 0.3, 0.06, 0.42, X0 + 0.85, y, 0.21, M['oxid'], 0.006)
def d_loesch():      # Löschposten: rote Schranktür, Schlauchhaspel, zwei Löscher, rot-weißer Rahmen
    box('Loeschrahmen', 0.03, 2.2, 2.6, X0 + 0.015, 0, 1.4, M['warnrw'], 0.004)
    box('Loeschschrank', 0.32, 0.9, 1.0, X0 + 0.18, -0.45, 1.5, M['red'], 0.012); box('Schaufenster', 0.02, 0.6, 0.6, X0 + 0.345, -0.45, 1.55, M['glass'], 0.006)
    ring('Haspel', 0.32, 0.06, (X0 + 0.25, 0.5, 1.6), (1, 0, 0), M['red']); cyl('Haspelnabe', 0.12, 0.2, X0 + 0.2, 0.5, 1.6, M['steel'], 'X', n=16, bev=0.004)
    for y in (0.2, 0.75):
        cyl('Loescher', 0.09, 0.62, X0 + 0.16, y, 0.43, M['red'], 'Z', n=20, bev=0.006); cyl('Loescherkopf', 0.03, 0.1, X0 + 0.16, y, 0.8, M['steel'], 'Z', n=10, bev=0)
    box('Loeschschild', 0.01, 0.9, 0.25, X0 + 0.04, 0, 2.85, M['red'], 0.004); text('LÖSCHPOSTEN', 0.1, (X0 + 0.046, -0.4, 2.8), LEFT_X, LEFT_Y, M['txtw'])
def d_gas():      # Gasflaschen im Gestell mit Ketten, Druckminderer aus Messing
    for z in (0.5, 1.3): box('Gestellholm', 0.06, FW - 0.1, 0.06, X0 + 0.4, 0, z, M['oxid'], 0.006)
    for y in (-1.25, 1.25): box('Gestellpfosten', 0.06, 0.06, 1.5, X0 + 0.4, y, 0.75, M['oxid'], 0.006)
    for q in range(7):
        y = -1.05 + q * 0.35; m = M['gasblau' if q % 3 else 'gasrot']
        cyl('Gasflasche', 0.115, 1.4, X0 + 0.22, y, 0.72, m, 'Z', n=20, bev=0.01); cyl('Flaschenhals', 0.05, 0.12, X0 + 0.22, y, 1.48, m, 'Z', n=14, bev=0.004)
        cyl('Ventil', 0.03, 0.08, X0 + 0.22, y, 1.58, M['brass'], 'Z', n=10, bev=0); cyl('Druckminderer', 0.04, 0.07, X0 + 0.28, y, 1.6, M['brass'], 'X', n=12, bev=0)
    pipe('Kette', [(X0 + 0.38, -1.25, 1.1), (X0 + 0.36, 0, 1.06), (X0 + 0.38, 1.25, 1.1)], 0.008, M['steel'])
    box('Gasschild', 0.01, 0.8, 0.22, X0 + 0.02, 0, 2.3, M['platey'], 0.004); text('DRUCKGAS', 0.09, (X0 + 0.026, -0.3, 2.25), LEFT_X, LEFT_Y, M['txtd'])
def d_terminal():      # Gildenterminal: schräges Pult mit Bernsteinschirm, Messingrahmen, Zeichen der Eisenkrone darüber
    box('Pultsockel', 0.6, 1.4, 0.9, X0 + 0.3, 0, 0.45, M['petrol'], 0.012)
    box('Pultplatte', 0.62, 1.44, 0.05, X0 + 0.36, 0, 0.98, M['hwand3'], 0.008, (0, math.radians(-14), 0))
    box('Schirmgehaeuse', 0.14, 1.2, 0.8, X0 + 0.1, 0, 1.6, M['hwand3'], 0.012, (0, math.radians(-8), 0))
    box('Schirm', 0.02, 1.04, 0.64, X0 + 0.18, 0, 1.6, M['schirm'], 0, (0, math.radians(-8), 0))
    box('Schirmrahmen', 0.015, 1.12, 0.72, X0 + 0.172, 0, 1.6, M['brass'], 0.004, (0, math.radians(-8), 0))
    for q in range(5): box('Taste', 0.04, 0.12, 0.03, X0 + 0.36 + (q % 2) * 0.12, -0.5 + q * 0.25, 1.01, M['brass2'], 0.004)
    crown((X0 + 0.016, 0, 2.6), LEFT_X, LEFT_Y, 0.32, M['brass'])
    area('Schirmlicht', (X0 + 0.5, 0, 1.6), (0, math.radians(-80), 0), 1.0, 0.6, 12, (1.0, 0.55, 0.15))
def d_werkzeug():      # Werkzeugwand (Lochblech mit Umrissen) über einer schweren Werkbank mit Schraubstock
    box('Lochblech', 0.02, 2.4, 1.2, X0 + 0.02, 0, 1.75, M['hwand2'], 0.004)
    x = X0 + 0.06
    for q in range(3):      # Schraubenschlüssel in drei Größen: Stiel und Maulring
        y, ln = -1.0 + q * 0.16, 0.32 + q * 0.06; box('Schluesselstiel', 0.012, 0.03 + q * 0.006, ln, x, y, 1.95, M['steel'], 0.003); ring('Schluesselmaul', 0.035 + q * 0.006, 0.01, (x, y, 1.95 + ln / 2 + 0.03), (1, 0, 0), M['steel'], n=14)
    cyl('Hammerstiel', 0.016, 0.42, x, -0.42, 1.9, M['holz'], 'Z', n=8, bev=0); box('Hammerkopf', 0.05, 0.14, 0.05, x, -0.42, 2.13, M['guss'], 0.006)
    for sy in (-1, 1): box('Zangenschenkel', 0.012, 0.02, 0.3, x, -0.18 + sy * 0.025, 1.85, M['oxid2'], 0.003, (sy * 0.12, 0, 0))
    box('Zangenkopf', 0.02, 0.05, 0.08, x, -0.18, 2.04, M['steel'], 0.004)
    for q in range(4): cyl('Schraubendreher', 0.008, 0.2, x, 0.05 + q * 0.07, 1.82, M['steel'], 'Z', n=6, bev=0); cyl('Griff', 0.016, 0.1, x, 0.05 + q * 0.07, 1.98, M[('red', 'petrol', 'brass2', 'red')[q]], 'Z', n=8, bev=0)
    box('Saege', 0.008, 0.5, 0.12, x, 0.6, 2.1, M['steel'], 0.002); box('Saegegriff', 0.03, 0.1, 0.14, x, 0.88, 2.1, M['holz'], 0.006)
    ring('Kabelrolle', 0.12, 0.03, (x + 0.02, 0.95, 1.65), (1, 0, 0), M['rubber']); box('Messschieber', 0.01, 0.04, 0.28, x, 0.42, 1.75, M['steel'], 0.002)
    box('Feile', 0.01, 0.025, 0.3, x, 0.3, 1.95, M['guss'], 0.002)
    box('Werkbankplatte', 0.75, 2.5, 0.08, X0 + 0.38, 0, 0.9, M['holz'], 0.008)
    for y in (-1.15, 1.15): box('Werkbankfuss', 0.7, 0.08, 0.86, X0 + 0.38, y, 0.43, M['oxid'], 0.006)
    box('Schublade', 0.65, 0.8, 0.5, X0 + 0.36, 0.7, 0.6, M['petrol'], 0.008)
    box('Schraubstock', 0.25, 0.2, 0.18, X0 + 0.7, -0.6, 1.03, M['guss'], 0.01); cyl('Spindel', 0.015, 0.3, X0 + 0.88, -0.6, 1.03, M['steel'], 'X', n=8, bev=0)
    box('Bankleuchte', 0.15, 1.6, 0.05, X0 + 0.15, 0, 2.5, M['e_sod2'], 0); area('Banklicht', (X0 + 0.3, 0, 2.45), (0, 0, 0), 1.6, 0.2, 40, SODIUM)
def d_aushang():      # Aushangtafel der Gilde: Messingrahmen, Zettel, Schichtplan
    fender(-FW / 2, FW / 2)
    box('Tafel', 0.03, 1.8, 1.1, X0 + 0.03, 0, 1.7, M['holz'], 0.006); box('Tafelrahmen', 0.035, 1.9, 1.2, X0 + 0.02, 0, 1.7, M['brass'], 0.006)
    R = random.Random(4)
    for q in range(9):
        y, z = -0.7 + (q % 4) * 0.45 + R.uniform(-0.05, 0.05), 1.95 - (q // 4) * 0.4 + R.uniform(-0.05, 0.05)
        plate(0.3, 0.32, (X0 + 0.047, y - 0.15, z - 0.16), LEFT_X, LEFT_Y, M['plate' if q % 3 else 'platey'], th=0.002)
    text('GILDE · SCHICHTPLAN', 0.07, (X0 + 0.05, -0.5, 2.18), LEFT_X, LEFT_Y, M['txtb'])
def d_kran():      # Schwenkkran an der Wand: Säule, Ausleger, Laufkatze mit Haken
    fender(-FW / 2, FW / 2)
    cyl('Kransaeule', 0.1, 3.3, X0 + 0.2, -1.0, 1.65, M['oxid'], 'Z', n=16, bev=0.006)
    for z in (0.5, 3.0): box('Kranlager', 0.25, 0.3, 0.2, X0 + 0.1, -1.0, z, M['oxid2'], 0.008)
    ibeam('Ausleger', 2.4, X0 + 0.2, 0.2, 3.1, 'Y', h=0.24, b=0.14)
    box('Zugstrebe', 0.06, 2.0, 0.06, X0 + 0.2, -0.05, 3.5, M['steel'], 0.004, (math.radians(-13), 0, 0))
    box('Laufkatze', 0.3, 0.3, 0.25, X0 + 0.2, 0.8, 2.85, M['petrol'], 0.008)
    pipe('Kranseil', [(X0 + 0.2, 0.8, 2.72), (X0 + 0.2, 0.8, 1.6)], 0.01, M['steel']); ring('Haken', 0.06, 0.018, (X0 + 0.2, 0.8, 1.5), (1, 0, 0), M['oxid'])
    stencil('SWL 2 t', 0.1, (X0 + 0.32, -0.1, 3.0), LEFT_X, LEFT_Y)
def d_schauloch():      # Schauloch zur Ofenseite: rundes Glutfenster mit Hitzeschild und Klappe, Temperaturanzeige
    box('Hitzeschild', 0.1, 1.6, 1.6, X0 + 0.05, 0, 1.6, M['guss'], 0.02)
    cyl('Schaulochring', 0.32, 0.18, X0 + 0.12, 0, 1.6, M['brass2'], 'X', n=32, bev=0.008); cyl('Glutfenster', 0.25, 0.02, X0 + 0.19, 0, 1.6, M['e_glut'], 'X', n=32, bev=0)
    box('Klappe', 0.05, 0.56, 0.2, X0 + 0.24, 0, 2.05, M['guss'], 0.01); pipe('Klappengriff', [(X0 + 0.27, -0.2, 2.15), (X0 + 0.35, 0, 2.18), (X0 + 0.27, 0.2, 2.15)], 0.012, M['steel'])
    box('Anzeige', 0.06, 0.5, 0.18, X0 + 0.08, 0, 0.6, M['hwand3'], 0.008); box('Anzeigefeld', 0.01, 0.42, 0.1, X0 + 0.115, 0, 0.6, M['e_glut'], 0)
    text('1460 °C', 0.06, (X0 + 0.122, -0.16, 0.57), LEFT_X, LEFT_Y, M['txtd'])
    point('Glutschein', (X0 + 0.5, 0, 1.6), 90, (1.0, 0.35, 0.08), 0.2)
def d_rutsche():      # Erzrutsche aus der Wand in einen Bunker mit Schieber, darunter Platz für eine Lore
    prism('Rutsche', [(-0.5, 2.6), (0.5, 2.6), (0.4, 1.7), (-0.4, 1.7)], X0, X0 + 0.9, M['rostbr'], 'X', 0.01)
    box('Bunker', 1.0, 1.4, 0.8, X0 + 0.85, 0, 2.1, M['oxid'], 0.012)
    prism('Trichter', [(-0.7, 1.7), (0.7, 1.7), (0.25, 1.25), (-0.25, 1.25)], X0 + 0.4, X0 + 1.3, M['oxid2'], 'X', 0.01)
    box('Schieber', 0.6, 0.6, 0.06, X0 + 0.85, 0, 1.22, M['steel'], 0.006); pipe('Schieberhebel', [(X0 + 1.3, -0.3, 1.25), (X0 + 1.6, -0.5, 1.6)], 0.02, M['brass'])
    for z in (2.3, 2.5): box('Erzschicht', 0.8, 1.2, 0.08, X0 + 0.85, 0, z, M['erz'], 0.02)
    stencil('ERZ · ROH', 0.12, (X0 + 1.355, -0.4, 2.15), (0, 1, 0), (0, 0, 1))
def d_bank():      # schwere Bank mit Rückenblech und Haken
    box('Banksitz', 0.45, FW - 0.2, 0.07, X0 + 0.28, 0, 0.47, M['holz'], 0.008); box('Rueckenblech', 0.04, FW - 0.2, 0.5, X0 + 0.04, 0, 0.85, M['petrol'], 0.008)
    for y in (-1.1, 0, 1.1): box('Bankfuss', 0.42, 0.07, 0.44, X0 + 0.26, y, 0.22, M['oxid'], 0.006)
    for q in range(6): pipe('Kleiderhaken', [(X0 + 0.02, -1.0 + q * 0.4, 1.8), (X0 + 0.12, -1.0 + q * 0.4, 1.78), (X0 + 0.14, -1.0 + q * 0.4, 1.86)], 0.01, M['brass'])
DRESS = {n[2:]: f for n, f in list(globals().items()) if n.startswith('d_') and callable(f)}
def dress(name): return module('Wand ' + name, DRESS[name])

# =====================================================================================
# Objekte (Ursprung am Boden)
# =====================================================================================
def p_lore():      # Erzlore auf Rädern, mit Erz gefüllt
    prism('Lorenmulde', [(-0.6, 0.35), (0.6, 0.35), (0.75, 1.1), (-0.75, 1.1)], -0.45, 0.45, M['oxid'], 'Y', 0.012)
    box('Erzfuellung', 1.35, 0.8, 0.12, 0, 0, 1.0, M['erz'], 0.03)
    for sx in (-1, 1):
        for sy in (-1, 1): cyl('Rad', 0.17, 0.08, sx * 0.4, sy * 0.38, 0.17, M['guss'], 'Y', n=20, bev=0.006)
    box('Fahrgestell', 1.2, 0.6, 0.12, 0, 0, 0.3, M['hwand3'], 0.008); pipe('Deichsel', [(0.62, 0, 0.35), (1.1, 0, 0.5)], 0.03, M['steel'])
def p_tiegel():      # Schmelztiegel auf Gestell, abgekühlt mit Glutrest
    for a in range(3): box('Tiegelbein', 0.08, 0.08, 0.6, 0.45 * math.cos(a * 2 * PI / 3), 0.45 * math.sin(a * 2 * PI / 3), 0.3, M['oxid'], 0.006)
    ring('Tiegelring', 0.45, 0.04, (0, 0, 0.6), (0, 0, 1), M['oxid'])
    cyl('Tiegel', 0.42, 0.7, 0, 0, 0.95, M['guss'], 'Z', n=28, bev=0.01, r2=0.32); cyl('Glutrest', 0.36, 0.02, 0, 0, 1.29, M['e_glut'], 'Z', n=24, bev=0)
    for sy in (-1, 1): cyl('Tiegelzapfen', 0.06, 0.15, 0, sy * 0.45, 1.05, M['steel'], 'Y', n=12, bev=0)
def p_barren():      # Barrenstapel auf Palette (Eisen und Kupfer im Kreuzverband)
    box('Palette', 1.2, 1.0, 0.14, 0, 0, 0.07, M['holz'], 0.006)
    for lay in range(5):
        for q in range(4):
            m = M['kupferb' if lay == 4 else 'eisenb']
            if lay % 2: box('Barren', 0.95, 0.2, 0.1, 0, -0.33 + q * 0.22, 0.19 + lay * 0.105, m, 0.012)
            else: box('Barren', 0.2, 0.85, 0.1, -0.36 + q * 0.24, 0, 0.19 + lay * 0.105, m, 0.012)
def p_saecke():      # Zuschlag (Kalk) in Säcken auf Palette
    box('Palette', 1.2, 1.0, 0.14, 0, 0, 0.07, M['holz'], 0.006)
    for lay in range(3):
        for q in range(3): box('Sack', 0.36 if lay % 2 else 1.1, 1.0 if lay % 2 else 0.3, 0.2, (-0.38 + q * 0.38) if lay % 2 else 0, 0 if lay % 2 else (-0.32 + q * 0.32), 0.24 + lay * 0.2, M['sack'], 0.06)
def p_fass():      # Fass in Oxidrot mit Gildenschablone
    cyl('Fass', 0.3, 0.88, 0, 0, 0.44, M['oxid'], 'Z', n=24, bev=0.01)
    for z in (0.28, 0.6): cyl('Fassring', 0.31, 0.03, 0, 0, z, M['oxid2'], 'Z', n=24, bev=0)
def p_gaswagen():      # Flaschenwagen mit zwei Flaschen und Schlauchpaket
    box('Wagenrahmen', 0.5, 0.6, 0.06, 0, 0, 0.12, M['oxid'], 0.006); pipe('Wagenbuegel', [(-0.25, -0.25, 0.1), (-0.25, -0.25, 1.3), (-0.25, 0.25, 1.3), (-0.25, 0.25, 0.1)], 0.02, M['oxid'])
    for sy in (-1, 1): cyl('Wagenrad', 0.14, 0.06, 0.15, sy * 0.33, 0.14, M['rubber'], 'Y', n=16, bev=0.004)
    for (y, m) in ((-0.13, 'gasblau'), (0.13, 'gasrot')): cyl('Gasflasche', 0.1, 1.15, 0, y, 0.75, M[m], 'Z', n=18, bev=0.008); cyl('Ventil', 0.03, 0.08, 0, y, 1.36, M['brass'], 'Z', n=10, bev=0)
    ring('Schlauchring', 0.16, 0.02, (0.12, 0, 0.9), (1, 0, 0), M['rubber'])
def p_pult():      # Stehpult des Schichtmeisters mit Buch und Leuchte
    box('Pultfuss', 0.5, 0.5, 1.0, 0, 0, 0.5, M['petrol'], 0.01); box('Pultplatte', 0.7, 0.6, 0.05, 0.05, 0, 1.08, M['holz'], 0.008, (0, math.radians(-12), 0))
    box('Buch', 0.32, 0.24, 0.04, 0.05, 0, 1.13, M['red'], 0.006, (0, math.radians(-12), 0))
    pipe('Pultlampe', [(-0.2, 0.22, 1.1), (-0.2, 0.22, 1.5), (0.0, 0.18, 1.6)], 0.012, M['brass']); cyl('Lampenschirm', 0.07, 0.08, 0.02, 0.18, 1.56, M['brass'], 'Z', n=14, bev=0, r2=0.03)
def p_kiste():      # Holzkiste mit Messingbeschlägen und Schablone
    box('Kiste', 1.0, 0.7, 0.7, 0, 0, 0.35, M['holz'], 0.012)
    for sx in (-1, 1): box('Beschlag', 0.04, 0.72, 0.72, sx * 0.48, 0, 0.35, M['oxid2'], 0.004)
    stencil('EK 7', 0.12, (0.351, -0.15, 0.3), (0, 1, 0), (0, 0, 1))
def p_absperrung():      # Absperrpfosten mit rot-weißer Kette
    for y in (-0.9, 0.9):
        cyl('Pfosten', 0.04, 1.0, 0, y, 0.5, M['warnrw'], 'Z', n=12, bev=0.004); cyl('Pfostenfuss', 0.18, 0.05, 0, y, 0.025, M['guss'], 'Z', n=16, bev=0.004)
    cable((0, -0.9, 0.9), (0, 0.9, 0.9), 0.012, M['red'], sag=0.2)
def p_werkbank():      # freistehender Arbeitstisch mit Amboss
    box('Tischplatte', 1.6, 0.9, 0.08, 0, 0, 0.9, M['guss'], 0.01)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Tischbein', 0.08, 0.08, 0.86, sx * 0.72, sy * 0.38, 0.43, M['oxid'], 0.004)
    box('Ambossfuss', 0.2, 0.18, 0.12, -0.3, 0, 1.0, M['guss'], 0.01); box('Amboss', 0.5, 0.16, 0.12, -0.3, 0, 1.12, M['guss'], 0.012)
    cyl('Hammerstiel', 0.015, 0.35, 0.3, 0.1, 0.96, M['holz'], 'X', n=8, bev=0); box('Hammerkopf', 0.05, 0.1, 0.05, 0.48, 0.1, 0.96, M['steel'], 0.006)
PROP = {n[2:]: f for n, f in list(globals().items()) if n.startswith('p_') and callable(f)}
def prop(name): return module('Objekt ' + name, PROP[name])

# =====================================================================================
# Teile fürs Hüttendeck der Eisenkrone (seit Alpha 1.34): Fensterwand mit Leitpult und Ofenhalle, Tresen, Kantine, Galaxiekarte,
# Gildentafel, Rahmen zum Hangar
# =====================================================================================
M['halle'] = mk('Hallenwand', (0.045, 0.044, 0.042), 0.5, 0.6, var=0.3, streak=0.4, bump=0.3)
M['ofen'] = mk('Ofenmantel', (0.085, 0.06, 0.045), 0.6, 0.62, var=0.35, streak=0.5, bump=0.4, wear=0.8)
M['e_schmelze'] = mk('Schmelze', (1, 0.6, 0.2), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.52, 0.13), es=14, grime=False)
GLUT = (1.0, 0.42, 0.14)
def window_wall(k):      # Fensterwand (Zustand F): Brüstung bis 0,95 m, Glas bis 2,9 m, darüber Blech; Mittelspant als Pfosten
    wall_plates(-HALF, HALF, 0.0, 0.95, seed=k + 31); wall_plates(-HALF, HALF, 2.95, HW, seed=k + 37); corrugated(-HALF, HALF, HW, RB)
    column(0.0, RB); box('Randbalken', 0.3, CELL, 0.5, -W + 0.15, 0, RB + 0.25, M['oxid'], 0.01)
    for sy in (-1, 1):
        y0, y1 = (0.16, HALF) if sy > 0 else (-HALF, -0.16); yc = (y0 + y1) / 2
        for z in (0.98, 2.92): box('Fensterriegel', 0.18, y1 - y0, 0.08, -W + 0.05, yc, z, M['oxid2'], 0.008)
        for q in (1, 2): box('Fenstersprosse', 0.12, 0.06, 1.9, -W + 0.05, y0 + (y1 - y0) * q / 3, 1.95, M['oxid2'], 0.006)
        box('Hallenglas', 0.016, y1 - y0, 1.9, -W + 0.02, yc, 1.95, M['lens'], 0)
        rivet_row(-W + 0.142, y0 + 0.1, y1 - 0.1, 0.98, 0.25)
    area('Glutschein', (-W + 0.15, 0, 1.9), (0, -PI / 2, 0), 1.9, 5.6, 40, GLUT)      # was durch das Glas an Glut in den Raum fällt
def d_leitpult():      # Leitpult der Schmelzer vor dem Hallenfenster: schräge Platte mit drei Bernsteinschirmen, Hebel, Leuchtmelder
    x0 = X0
    prism('Leitpult', [(x0, 0.0), (x0 + 0.75, 0.0), (x0 + 0.75, 0.78), (x0 + 0.3, 0.92), (x0, 0.92)], -1.3, 1.3, M['petrol'], 'Y', 0.015)
    box('Pultsockel', 0.7, 2.56, 0.1, x0 + 0.37, 0, 0.05, M['oxid2'], 0.006); box('Pultkante', 0.02, 2.6, 0.06, x0 + 0.755, 0, 0.75, M['brass'], 0.004)
    sl = (0, 0.3, 0)
    for (y, w) in ((-0.82, 0.62), (0.0, 0.56), (0.82, 0.62)):
        box('Pultschirm Rahmen', 0.32, w + 0.06, 0.016, x0 + 0.5, y, 0.865, M['hwand3'], 0.005, sl); box('Pultschirm', 0.27, w, 0.006, x0 + 0.5, y, 0.875, M['schirm'], 0, sl)
    for sy in (-1, 1):
        cyl('Hebelfuss', 0.035, 0.02, x0 + 0.16, sy * 1.18, 0.93, M['oxid2'], 'Z', n=12, bev=0); pipe('Hebel', [(x0 + 0.16, sy * 1.18, 0.93), (x0 + 0.2, sy * 1.18, 1.08)], 0.009, M['steel'])
        cyl('Hebelknauf', 0.022, 0.03, x0 + 0.205, sy * 1.18, 1.09, M['red' if sy < 0 else 'brass'], 'Z', n=10, bev=0)
        for q in range(4): cyl('Leuchtmelder', 0.01, 0.01, x0 + 0.12, sy * (0.32 + q * 0.07), 0.925, M[('e_green', 'e_signal', 'e_green', 'e_red')[q]], 'Z', n=8, bev=0)
    plate(0.5, 0.07, (x0 + 0.757, -0.25, 0.5), LEFT_X, LEFT_Y, M['brass']); text('OFENLEITSTAND', 0.04, (x0 + 0.761, -0.21, 0.515), LEFT_X, LEFT_Y, M['txtd'])
    area('Pultschein', (x0 + 0.7, 0, 1.3), (0, 0, 0), 2.2, 0.5, 14, (1.0, 0.55, 0.15))
def d_ofenhalle():      # Ofenhalle hinter dem Fenster: ein Baustein, Ursprung in der mittleren Zelle des Leitstands (eigener Nachbau der Halle von Alpha 1.22 in den Farben der Hütte)
    X = lambda d: -W - 0.06 - d      # gleich hinter dem Glas der Fensterwand (Wandfläche bei −W)
    D, HWH, Z0, Z1 = 24.0, 9.0, -4.6, 9.0
    box('Hallenboden', D, HWH * 2, 0.3, X(D / 2), 0, Z0 - 0.15, M['hboden'], 0); box('Hallendach', D, HWH * 2, 0.3, X(D / 2), 0, Z1 + 0.15, M['halle'], 0)
    box('Hallenwand hinten', 0.3, HWH * 2, Z1 - Z0, X(D + 0.15), 0, (Z0 + Z1) / 2, M['halle'], 0)
    for sy in (-1, 1):
        box('Hallenwand Seite', D, 0.3, Z1 - Z0, X(D / 2), sy * (HWH + 0.15), (Z0 + Z1) / 2, M['halle'], 0)
        for q in range(5): ibeam('Hallenstuetze', Z1 - Z0, X(2.5 + q * 5.0), sy * (HWH - 0.25), (Z0 + Z1) / 2, 'Z', h=0.5, b=0.4, up='Y')
        ibeam('Kranbahn', D, X(D / 2), sy * (HWH - 0.6), 6.2, 'X', h=0.6, b=0.3)
    for q in range(6): ibeam('Dachbinder', HWH * 2, X(1.4 + q * 4.4), 0, Z1 - 0.4, 'Y', h=0.8, b=0.3)
    for n, y in enumerate((-5.7, 0.0, 5.7)):      # drei Drehöfen: Trommeln in die Tiefe, die Köpfe zum Fenster
        zc, r = -1.2, 1.9
        cyl('Trommel', r, 13.0, X(15.0), y, zc, M['ofen'], 'X', n=40, bev=0)
        for d in (10.2, 19.2): cyl('Laufring', r + 0.2, 0.5, X(d), y, zc, M['steel'], 'X', n=40, bev=0.03)
        cyl('Zahnkranz', r + 0.26, 0.34, X(14.5), y, zc, M['oxid2'], 'X', n=40, bev=0.03)
        for d in (10.2, 19.2):
            box('Rollenbock', 1.2, 4.2, -Z0 + zc - r - 0.3, X(d), y, (Z0 + zc - r - 0.3) / 2, M['oxid2'], 0.04)
            for sy in (-1, 1): cyl('Tragrolle', 0.42, 0.6, X(d), y + sy * 1.55, zc - 1.99, M['steel'], 'X', n=24, bev=0.02)
        box('Antrieb', 1.4, 1.2, 1.4, X(14.5), y + 2.6, Z0 + 0.7, M['petrol'], 0.05)
        prism('Ofenkopf', [(y - 2.3, zc - 2.5), (y + 2.3, zc - 2.5), (y + 2.3, zc + 1.9), (y + 1.7, zc + 2.5), (y - 1.7, zc + 2.5), (y - 2.3, zc + 1.9)], X(8.5), X(6.9), M['halle'], 'X', 0.05)
        ring('Glutfuge', r + 0.03, 0.05, (X(8.53), y, zc), (1, 0, 0), M['e_glut'], 40)
        cyl('Schauloch Rahmen', 0.62, 0.16, X(6.86), y, zc + 0.3, M['brass2'], 'X', n=32, bev=0.02); cyl('Schauloch', 0.48, 0.02, X(6.77), y, zc + 0.3, M['e_schmelze'], 'X', n=32, bev=0)
        text(str(n + 1), 1.0, (X(6.88), y + 0.95, zc + 0.9), LEFT_X, LEFT_Y, M['txtw'])
        box('Abzug', 1.3, 1.5, Z1 - zc - 2.4, X(7.7), y, (Z1 + zc + 2.4) / 2, M['halle'], 0.04)
        prism('Abstichrinne', [(X(7.0), zc - 2.5), (X(5.2), zc - 3.0), (X(5.2), zc - 2.75), (X(7.0), zc - 2.2)], y - 0.3, y + 0.3, M['oxid2'], 'Y', 0.02)
        area('Glut Ofenkopf', (X(5.8), y, zc + 0.3), (0, PI / 2, 0), 1.4, 1.4, 420, GLUT)
        point('Glut Fuge', (X(8.9), y + 2.5, zc + 0.6), 90, GLUT, 0.3)
    box('Giessrinne', 1.1, 16.4, 0.5, X(4.6), 0, -4.15, M['oxid2'], 0.04); box('Schmelze', 0.6, 16.0, 0.02, X(4.6), 0, -3.93, M['e_schmelze'], 0)
    area('Glut Rinne', (X(4.6), 0, -3.6), (PI, 0, 0), 0.6, 15.0, 520, GLUT)
    box('Laufsteg', 1.3, HWH * 2 - 0.8, 0.08, X(12.6), 0, 1.5, M['riffel'], 0.01)
    for sx in (-1, 1): pipe('Handlauf', [(X(12.6 + sx * 0.62), -HWH + 0.5, 2.55), (X(12.6 + sx * 0.62), HWH - 0.5, 2.55)], 0.03, M['oxid'])
    for y in (-8.3, -2.85, 2.85, 8.3): box('Stegstuetze', 0.2, 0.2, 1.5 - Z0, X(12.6), y, (1.5 + Z0) / 2, M['oxid2'], 0.02)
    for y in (-4.0, 4.0):
        cyl('Hallenstrahler', 0.5, 0.3, X(12.6), y, 6.8, M['oxid2'], 'Z', n=24, bev=0, r2=0.2); cyl('Hallenstrahler Glas', 0.42, 0.02, X(12.6), y, 6.64, M['e_sod'], 'Z', n=24, bev=0)
        area('Arbeitslicht', (X(12.6), y, 6.6), (0, 0, 0), 0.8, 0.8, 900, SODIUM)
    box('Kranbruecke', 0.8, HWH * 2 - 1.2, 0.7, X(3.4), 0, 6.9, M['ochre'], 0.04); box('Laufkatze', 1.2, 1.4, 0.5, X(3.4), 3.0, 6.35, M['oxid2'], 0.04)
    for (dx, dy) in ((-0.4, -0.45), (0.4, -0.45), (-0.4, 0.45), (0.4, 0.45)): pipe('Kranseil', [(X(3.4 + dx), 3.0 + dy, 6.1), (X(3.4 + dx * 0.5), 3.0 + dy * 1.9, 0.75)], 0.018, M['steel'])
    cyl('Giesspfanne', 0.78, 1.5, X(3.4), 3.0, -0.75, M['ofen'], 'Z', n=36, bev=0.03, r2=0.95); cyl('Pfannenbad', 0.86, 0.02, X(3.4), 3.0, -0.06, M['e_schmelze'], 'Z', n=36, bev=0)
    area('Glut Pfanne', (X(3.4), 3.0, 0.5), (PI, 0, 0), 1.2, 1.2, 260, GLUT)
    for q, (z, rr, mat) in enumerate(((3.6, 0.22, 'isol'), (4.3, 0.14, 'petrol'), (0.0, 0.3, 'ofen'))): pipe('Wandrohr', [(X(D - 0.6), -HWH + 0.4, z), (X(D - 0.6), HWH - 0.4, z)], rr, M[mat])
def p_tresen(tag):      # Tresen eines Dienstes in der Hütte: Petrol mit Messingplatte, Schild darüber; Vorderseite zeigt nach −y, das Personal steht dahinter
    box('Tresen', 2.6, 0.8, 1.02, 0, 0, 0.51, M['petrol'], 0.02); box('Tresenplatte', 2.72, 0.92, 0.05, 0, 0, 1.045, M['brass2'], 0.012); box('Tresensockel', 2.62, 0.82, 0.12, 0, 0, 0.06, M['oxid2'], 0.008)
    box('Tresenschraffur', 2.61, 0.012, 0.14, 0, -0.407, 0.2, M['warnrw'], 0)
    for x in (-0.95, 0.0, 0.95): box('Tresenfeld', 0.8, 0.02, 0.62, x, -0.405, 0.62, M['petrol2'], 0.006)
    text(tag, 0.13, (-len(tag) * 0.13 * 0.32, -0.418, 0.57), (1, 0, 0), (0, 0, 1), M['txtb'])
    for sx in (-1, 1): ibeam('Schildpfosten', 1.5, sx * 1.25, 0.3, 1.8, 'Z', h=0.12, b=0.12, up='X')
    box('Schildtafel', 2.6, 0.06, 0.4, 0, 0.3, 2.52, M['oxid2'], 0.012); box('Schildfeld', 2.5, 0.012, 0.3, 0, 0.265, 2.52, M['hwand3'], 0)
    text(tag, 0.17, (-len(tag) * 0.17 * 0.32, 0.257, 2.45), (1, 0, 0), (0, 0, 1), M['e_signal']); box('Schildlicht', 2.4, 0.03, 0.02, 0, 0.26, 2.73, M['e_sod2'], 0)
    box('Tresenschirm', 0.55, 0.03, 0.36, -0.7, 0.12, 1.3, M['hwand3'], 0.008, (0.3, 0, 0)); box('Tresenbild', 0.48, 0.006, 0.3, -0.7, 0.137, 1.305, M['schirm'], 0, (0.3, 0, 0))
    box('Ablage', 0.4, 0.3, 0.2, 0.9, 0.08, 1.17, M['holz'], 0.012)
    area('Tresenlicht', (0, -0.3, 2.4), (0, 0, 0), 2.2, 0.3, 40, SODIUM)
def p_tisch():      # Kantinentisch mit zwei Bänken (Bohlen auf Oxidrot-Gestell)
    box('Tischplatte', 2.4, 0.9, 0.06, 0, 0, 0.76, M['holz'], 0.008)
    for sx in (-1, 1): box('Tischbock', 0.08, 0.8, 0.72, sx * 1.0, 0, 0.37, M['oxid'], 0.006)
    box('Tischtraverse', 2.0, 0.06, 0.06, 0, 0, 0.2, M['oxid'], 0.004)
    for sy in (-1, 1):
        box('Bank', 2.3, 0.32, 0.05, 0, sy * 0.72, 0.45, M['holz'], 0.008)
        for sx in (-1, 1): box('Bankfuss', 0.06, 0.28, 0.43, sx * 0.95, sy * 0.72, 0.215, M['oxid'], 0.004)
    for x in (-0.6, 0.5): cyl('Becher', 0.04, 0.1, x, 0.12, 0.84, M['brass2'], 'Z', n=12, bev=0)
def p_kartentisch():      # Galaxiekarte: runder Kartentisch mit Messingrand und leuchtender Platte (Ansprechpunkt im Spiel)
    cyl('Kartenfuss', 0.35, 0.8, 0, 0, 0.4, M['oxid2'], 'Z', n=24, bev=0.008, r2=0.25); cyl('Kartentisch', 1.0, 0.1, 0, 0, 0.85, M['petrol'], 'Z', n=40, bev=0.01)
    ring('Kartenrand', 1.0, 0.035, (0, 0, 0.91), (0, 0, 1), M['brass'], 40); cyl('Kartenbild', 0.92, 0.01, 0, 0, 0.905, M['schirm'], 'Z', n=40, bev=0)
    for q in range(3): ring('Kartenring', 0.25 + q * 0.2, 0.008, (0, 0, 1.25 + q * 0.12), (0, 0, 1), M['e_signal'], 28)
    point('Kartenschein', (0, 0, 1.4), 25, (1.0, 0.55, 0.15), 0.2)
def d_tafel():      # Tafel der Bergbaugilde (Wandfüllung, ohne Rammschutz): Krone der Eisenkrone in Messing
    box('Tafel', 0.04, 2.5, 1.0, X0 + 0.02, 0, 1.9, M['oxid2'], 0.014); box('Tafelfeld', 0.012, 2.38, 0.88, X0 + 0.046, 0, 1.9, M['hwand3'], 0)
    crown((X0 + 0.05, -0.85, 1.92), LEFT_X, LEFT_Y, 0.34, M['brass'])
    text('BERGBAUGILDE', 0.15, (X0 + 0.054, -0.4, 1.96), LEFT_X, LEFT_Y, M['txtb']); text('KONTOR EISENKRONE  ·  HÜTTE 1', 0.065, (X0 + 0.054, -0.4, 1.76), LEFT_X, LEFT_Y, M['txtw'])
    box('Tafellicht', 0.03, 2.3, 0.02, X0 + 0.07, 0, 2.45, M['e_sod2'], 0); area('Tafellicht', (X0 + 0.3, 0, 2.5), (0, 0.9, 0), 0.05, 2.2, 18, SODIUM)
def d_theke():      # Ausgabe der Kantine: Theke mit Messingkante, Kessel, Becherbord
    box('Theke', 0.75, FW, 1.0, X0 + 0.38, 0, 0.5, M['petrol'], 0.012); box('Thekenplatte', 0.85, FW + 0.04, 0.05, X0 + 0.42, 0, 1.025, M['steel'], 0.008)
    box('Thekenkante', 0.02, FW, 0.06, X0 + 0.85, 0, 1.0, M['brass'], 0.004)
    for y in (-0.8, 0.0): cyl('Kessel', 0.22, 0.5, X0 + 0.3, y, 1.3, M['steel'], 'Z', n=20, bev=0.006)
    box('Becherbord', 0.25, 1.6, 0.03, X0 + 0.13, 0.5, 1.75, M['holz'], 0.004)
    for q in range(6): cyl('Becher', 0.04, 0.1, X0 + 0.13, -0.15 + q * 0.25, 1.82, M['brass2'], 'Z', n=12, bev=0)
    box('Thekenlicht', 0.15, FW - 0.2, 0.05, X0 + 0.15, 0, 2.4, M['e_sod2'], 0); area('Thekenlicht', (X0 + 0.4, 0, 2.35), (0, 0, 0), 2.4, 0.3, 40, SODIUM)
def p_schleuse():      # Rahmen zum Hangar: füllt die Öffnung der Hangarrückwand (6 × 4,6 m) um das Tor der Torzelle; Hangar liegt bei −x
    xa, xb = -HALF - 0.12, -HALF + 0.02; hw, hh = DOOR_W / 2, DOOR_H
    prism('Schleusenrahmen', [(-3.2, 0.0), (-hw - 0.05, 0.0), (-hw - 0.05, hh + 0.05), (hw + 0.05, hh + 0.05), (hw + 0.05, 0.0), (3.2, 0.0), (3.2, 4.9), (-3.2, 4.9)], xa, xb, M['oxid2'], 'X', 0.02)
    box('Schleuse Schild', 0.04, 3.4, 0.5, xa - 0.02, 0, hh + 0.6, M['hwand3'], 0.01)
    text('HÜTTENDECK', 0.26, (xa - 0.042, 1.6, hh + 0.5), RIGHT_X, RIGHT_Y, M['txtb'])
    for sy in (-1, 1): box('Schleuse Schraffur', 0.012, 0.7, 2.2, xa - 0.006, sy * (hw + 0.5), 1.1, M['warnrw'], 0); cyl('Schleuse Leuchte', 0.07, 0.05, xa - 0.02, sy * (hw + 0.5), 2.9, M['e_signal'], 'X', n=12, bev=0)
DRESS.update({'leitpult': d_leitpult, 'tafel': d_tafel, 'theke': d_theke})
PROP.update({'tresen_' + k: (lambda t=t: p_tresen(t)) for k, t in (('raffinerie', 'RAFFINERIE'), ('markt', 'MARKT'), ('lager', 'LAGER'), ('service', 'SERVICE'))})
PROP.update({'tisch': p_tisch, 'kartentisch': p_kartentisch, 'schleuse': p_schleuse})
