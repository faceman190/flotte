# Große Sektoren, Phase 3 (24.11.2026): drei neue Bauten für Heimstatt, eigene Entwürfe nach den Beschreibungen in docs/heimstatt-bildprompts.md
# (Abschnitte 8–10; Konzeptbilder gibt es nicht). Zusammengesetzt aus dem Plattform-Baukasten (../plattform/pf_lib.py) und dem
# Orbitalwerft-Baukasten (../raumwerft/ow_lib.py).
#   Torwache   ≈ 120 m  Flotte: Leitturm mit Verkehrsleitung, Andockarm für zwei Patrouillenjäger, Sensormast, Prüfrahmen, Scheinwerfer zum Tor
#   Fernohr    ≈ 200 m  Flotte: Horchposten am Ostrand, drei Parabolantennen auf einem Fachwerkrücken, Dipolfeld, Wohn- und Energiemodul
#   Pumpwerk   ≈ 150 m  Bergbaugilde: Eisschmelze am Reifschleier, zwei Ansaugarme, Tankreihe, Kühlflügel, Hangartor (andockbar)
# Achsen: X vorn (Torwache: zum Tor, Fernohr: Blickrichtung der Schüsseln, Pumpwerk: Hangartor), Y links, Z oben. Mitte im Ursprung.
# Aufruf über s3_lauf.py (setzt MODELL).
import bpy, os, math, random, json
from mathutils import Vector, Matrix
_pf = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'plattform', 'pf_lib.py')
exec(compile(open(_pf, encoding='utf-8').read(), 'pf_lib.py', 'exec'))
MODELL = globals().get('MODELL', 'Torwache')
ANCH = {}

# ---------- Farben ----------
M.update(
    # Flotte: mittelgrau und Gunmetal, schmale Amberstreifen
    s3_grau=panel_overlay(rusty(mk('Flottengrau', (0.2, 0.2, 0.2), 0.45, 0.55, var=0.14, rvar=0.1, scale=1.2, bump=0.1, bscale=40, wear=0.7, streak=0.3), 0.25), (4.0, 3.0, 2.5)),
    s3_gun=panel_overlay(rusty(mk('Gunmetal', (0.07, 0.072, 0.078), 0.6, 0.48, var=0.14, rvar=0.1, scale=1.2, bump=0.1, bscale=40, wear=0.6, streak=0.25), 0.25), (5.0, 3.5, 2.5)),
    s3_amber=mk('Amberstreifen', (0.62, 0.36, 0.05), 0.15, 0.55, var=0.2, rvar=0.1, scale=1.0, grime=True, wear=0.4),
    s3_weiss=mk('Schüsselweiß', (0.62, 0.62, 0.6), 0.05, 0.45, var=0.12, rvar=0.1, scale=2.0, grime=True, wear=0.35, streak=0.25),
    s3_frost=mk('Reif', (0.55, 0.62, 0.66), 0.0, 0.75, var=0.25, rvar=0.15, scale=0.8, grime=False),
    s3_gruen=mk('Positionslicht grün', (0.1, 1.0, 0.35), 0.0, 0.3, var=0, rvar=0, emit=(0.1, 1.0, 0.35), es=10.0, grime=False),
    s3_fenster=mk('Fenster hell', (1.0, 0.8, 0.55), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.78, 0.5), es=1.0, grime=False),
    s3_kalt=mk('Fenster kalt', (0.7, 0.88, 1.0), 0.0, 0.3, var=0, rvar=0, emit=(0.7, 0.88, 1.0), es=0.8, grime=False),
    s3_scheinwerfer=mk('Scheinwerfer', (1.0, 0.97, 0.9), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.96, 0.88), es=14.0, grime=False),
    # Bergbaugilde: Oxidrot, Petrol, Messing, Natriumlicht (wie die Eisenkrone)
    s3_oxid=panel_overlay(rusty(mk('Gildeoxid', (0.17, 0.052, 0.032), 0.35, 0.62, var=0.2, rvar=0.12, scale=1.2, bump=0.12, bscale=40, wear=0.9, streak=0.5), 0.6, (0.16, 0.05, 0.02)), (4.0, 3.0, 2.5)),
    s3_petrol=panel_overlay(rusty(mk('Gildepetrol', (0.024, 0.11, 0.118), 0.4, 0.58, var=0.18, rvar=0.12, scale=1.2, bump=0.1, bscale=40, wear=0.8, streak=0.45), 0.45), (5.0, 3.5, 2.5)),
    s3_messing=mk('Messing', (0.55, 0.38, 0.14), 0.9, 0.38, var=0.2, rvar=0.12, scale=2.0, grime=True, wear=0.6),
    s3_natrium=mk('Natriumlicht', (1.0, 0.6, 0.2), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.55, 0.15), es=12.0, grime=False),
    s3_glut=mk('Kühlerglut', (0.7, 0.2, 0.06), 0.0, 0.5, var=0.1, rvar=0, emit=(0.9, 0.28, 0.08), es=1.2, grime=False),
)
for _k in ('s3_grau', 's3_gun', 's3_oxid', 's3_petrol'): low_spec(M[_k], 0.22)
A = M['s3_amber']

def nav_light(p, green=False, size=0.7):
    p = Vector(p); ocyl('Positionslichtfuß', p - Vector((0, 0, size * 0.6)), p, size * 0.25, M['ow_stahl'], 8, bev=0)
    sphere('Positionslicht', size * 0.4, p.x, p.y, p.z, M['s3_gruen' if green else 'ow_rot'], 10)
def stripe_band(c, size): return block('Amberband', c, size, A, 0.02)
def dish(name, c, axis, R, depth, m=None, ribs=8, feed=True):
    # Parabolschüssel: Schale (Rotationsfläche z = r²·depth/R²), Randring, Rückenrippen, Speisehorn auf drei Stäben im Brennpunkt
    c = Vector(c); ax = Vector(axis).normalized(); X, Y, Z = basis(ax)
    bm = bmesh.new(); seg, nr = 48, 10; rings = []
    for i in range(nr + 1):
        r = R * i / nr; z = depth * (r / R) ** 2
        rings.append([bm.verts.new(Vector((math.cos(2 * math.pi * k / seg) * r, math.sin(2 * math.pi * k / seg) * r, z))) for k in range(seg)] if i else [bm.verts.new(Vector((0, 0, 0)))])
    for k in range(seg): bm.faces.new((rings[0][0], rings[1][k], rings[1][(k + 1) % seg]))
    for i in range(1, nr):
        for k in range(seg): bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][(k + 1) % seg], rings[i][(k + 1) % seg]))
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=-0.25)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m or M['s3_weiss'])
    for pg in me.polygons: pg.use_smooth = True
    ob = link(bpy.data.objects.new(name, me)); T = mframe(c, Y, Z, X); ob.matrix_world = T
    P = lambda x, y, z: T @ Vector((x, y, z))
    ring(name + ' Rand', R + 0.15, 0.35, P(0, 0, depth), ax, M['s3_grau'], 64)
    for k in range(ribs):
        a = 2 * math.pi * k / ribs; pts = [P(math.cos(a) * R * t, math.sin(a) * R * t, depth * t * t - 0.6 - 0.8 * (1 - t)) for t in (0.1, 0.4, 0.7, 1.0)]
        pipe(name + ' Rippe', pts, 0.25, M['s3_gun'])
    block_at = P(0, 0, -1.8); ocyl(name + ' Nabe', P(0, 0, -3.5), P(0, 0, 0.2), R * 0.12, M['s3_gun'], 20, bev=0.05)
    if feed:
        f = depth + R * R / (4 * depth) * 0.0 + R * 0.55
        for k in range(3):
            a = 2 * math.pi * k / 3 + 0.4; pipe(name + ' Speisestab', [P(math.cos(a) * R * 0.92, math.sin(a) * R * 0.92, depth), P(0, 0, f)], 0.14, M['s3_grau'])
        ocyl(name + ' Speisehorn', P(0, 0, f - 1.2), P(0, 0, f + 0.6), R * 0.06, M['s3_gun'], 16, r2=R * 0.04, bev=0.03)
        nav_light(P(0, 0, f + 1.2), size=0.6)
    return ob

# =====================================================================================
# Torwache (≈ 120 m): Leitturm vorn, Rücken nach hinten mit Andockarm, Prüfrahmen am Heck
# =====================================================================================
def torwache():
    rng = random.Random(7)
    # Rücken: Kastenträger 84 m, darauf Module
    block('Rücken', (0, 0, 0), (84, 12, 9), M['s3_grau'], 0.3)
    for x in range(-40, 44, 8): block('Rücken Rippe', (x, 0, 0), (1.2, 13.2, 10.2), M['s3_gun'], 0.08)
    for s in (1, -1): stripe_band((0, s * 6.08, -2.6), (84, 0.1, 0.7))
    tech = [(-30, 8, 5), (-14, 10, 6), (6, 12, 5), (22, 9, 7)]
    for x, l, h in tech: block('Rückenmodul', (x, 0, 4.5 + h / 2), (l, 10, h), M['s3_gun' if rng.random() < 0.5 else 's3_grau'], 0.2)
    greebles((0, 0, 9.8), (70, 8, 1.2), 70, 3, scale=1.2)
    # Leitturm vorn: Turm 22 m, darauf Leitstand mit schrägem Fensterband (pf_lib), Funkmast
    tower('Leitturm', 36, 0, 4.5, 26, 14, 14, M['s3_grau'], bands=6.0, seed=2, warn=False)
    stripe_band((36, 0, 8), (14.2, 14.2, 0.8))
    roof = control_tower('Verkehrsleitung', (36, 0, 26), w=20, d=16, h_base=3.6, h_glass=3.2, number='TW', seed=4)
    rz = roof if isinstance(roof, (int, float)) else 33.5
    lattice_mast('Sensormast', (32, 0, rz), height=18, w0=2.6, w1=1.0, seed=5)
    # Radar: drehbare Schüssel auf dem Turm
    dish('Radarschüssel', (41, 4, rz + 2.8), (0.6, 0.2, 0.35), 3.2, 0.9, M['s3_weiss'], ribs=6, feed=False)
    ocyl('Radarsockel', Vector((41, 4, rz)), Vector((41, 4, rz + 2.2)), 0.9, M['s3_gun'], 12, bev=0.03)
    # Scheinwerfer zum Tor (+X)
    for s in (1, -1):
        b = Vector((44, s * 6.5, 12))
        block('Scheinwerferkonsole', b, (3, 3, 2.2), M['s3_gun'], 0.1)
        ocyl('Scheinwerfergehäuse', b + Vector((1.2, 0, 1.4)), b + Vector((3.2, 0, 1.4)), 1.1, M['s3_grau'], 18, r2=1.3, bev=0.04)
        ocyl('Scheinwerferglas', b + Vector((3.2, 0, 1.4)), b + Vector((3.28, 0, 1.4)), 1.15, M['s3_scheinwerfer'], 18, bev=0)
    # Andockarm: nach links (−Y) ausgreifend, zwei Liegeplätze mit Klammern für Patrouillenjäger
    truss('Andockarm', (4, -6, 0), (4, -46, 0), 5, 5, seg=5, rc=0.4, rw=0.2, m=M['s3_gun'])
    for k, y in enumerate((-22, -40)):
        block('Liegeplatz', (4, y, -3.4), (22, 9, 1.4), M['s3_grau'], 0.12)
        for s in (1, -1):
            for dx in (-7, 7): ocyl('Klammer', Vector((4 + dx, y + s * 3.6, -2.7)), Vector((4 + dx, y + s * 3.6, -0.8)), 0.45, M['s3_amber'], 10, bev=0.03)
        paint_text('0%d' % (k + 1), 3.0, (4, y, -2.65), rot=0.0, m=M['pf_weissfarbe'])
        lamp(Vector((15, y, -3.0)), (1, 0, 0), 0.6); lamp(Vector((-7, y, -3.0)), (-1, 0, 0), 0.6)
        ANCH['liegeplatz%d' % (k + 1)] = [4, y, -1.6]
    catwalk('Andocksteg', (4, -6, 3.0), (4, -44, 3.0), 2.0)
    # Prüfrahmen am Heck: quadratischer Fachwerkrahmen 26 m, Scanner-Leisten innen
    F = 13
    for a, b in (((-50, -F, -F), (-50, F, -F)), ((-50, F, -F), (-50, F, F)), ((-50, F, F), (-50, -F, F)), ((-50, -F, F), (-50, -F, -F))):
        truss('Prüfrahmen', a, b, 3, 3, seg=3.2, rc=0.3, rw=0.14, m=M['s3_grau'], up=(1, 0, 0))
    for k in range(4):
        z = -F + 4 + k * 6; block('Scannerleiste', (-50, F - 1.8, z), (1.0, 0.6, 3.6), M['s3_kalt'], 0.03); block('Scannerleiste', (-50, -F + 1.8, z), (1.0, 0.6, 3.6), M['s3_kalt'], 0.03)
    truss('Prüfarm', (-42, 0, 0), (-50, 0, -F), 3, 3, seg=3, rc=0.3, rw=0.14, m=M['s3_gun'])
    truss('Prüfarm', (-42, 0, 0), (-50, 0, F), 3, 3, seg=3, rc=0.3, rw=0.14, m=M['s3_gun'])
    paint = text('PRÜFRAHMEN · LANGSAM', 1.4, Vector((-49.2, -10, F + 1.6)), (0, 1, 0), (0, 0, 1), M['pf_weissfarbe'], align='LEFT', name='Schrift')
    # Geschütze in Gehäusen (unten), Kühlflügel (oben hinten)
    for x in (-24, 18):
        for s in (1, -1):
            c = Vector((x, s * 4, -6.6))
            ocyl('Geschützgehäuse', c + Vector((0, 0, 1.6)), c, 2.2, M['s3_gun'], 20, r2=1.8, bev=0.05)
            for d in (-0.35, 0.35): ocyl('Geschützrohr', c + Vector((0.8, d, -0.4)), c + Vector((4.6, d, -0.6)), 0.18, M['ow_stahl'], 10, bev=0)
    radiator_cluster('Kühlflügel', (-30, 0, 14), n=3, spacing=1.8, w=5, h=10, yaw=math.pi / 2)
    # Beschriftung, Positionslichter
    sign('TORWACHE', 2.6, face_frame((-20, 6.06, 0.6), (0, 1, 0)), M['pf_weissfarbe'])
    sign('TORWACHE', 2.6, face_frame((-22, -6.06, 0.6), (0, -1, 0)), M['pf_weissfarbe'])
    for x in (-42, 42): nav_light((x, 6.4, 4.6), green=False); nav_light((x, -6.4, 4.6), green=True)
    nav_light((32, 0, rz + 18.5), size=0.9)
    habitat('Mannschaftsmodul', (-12, 9.5, -1.0), length=22, w=7, h=6, yaw=0.0, seed=8)
    ANCH['leitstand'] = [36, 0, 28]; ANCH['scheinwerfer'] = [47, 0, 13.4]; ANCH['pruefrahmen'] = [-50, 0, 0]

# =====================================================================================
# Horchposten „Fernohr“ (≈ 200 m): Fachwerkrücken, drei Schüsseln (alle nach +X), Dipolfeld, Wohn- und Energiemodul
# =====================================================================================
def fernohr():
    rng = random.Random(11)
    truss('Rücken', (-95, 0, 0), (95, 0, 0), 8, 8, seg=6, rc=0.55, rw=0.28, m=M['s3_grau'])
    for x in range(-90, 96, 30): block('Rückenknoten', (x, 0, 0), (3.2, 9.2, 9.2), M['s3_gun'], 0.12)
    # drei Schüsseln auf Lafetten über dem Rücken, alle blicken nach +X und leicht nach oben
    for nm, x, R, h in (('Große Schüssel', -45, 30, 34), ('Mittlere Schüssel', 25, 21, 26), ('Kleine Schüssel', 70, 13, 18)):
        base = Vector((x, 0, 4.2))
        block(nm + ' Drehkranz', base + Vector((0, 0, 1.0)), (R * 0.45, R * 0.45, 2.0), M['s3_gun'], 0.2)
        # Lafette hinter der Schüssel: zwei Stützen bis unter die Nabe, Querachse; die Schale beginnt 3 m davor (nach +X)
        for s in (1, -1): obox(nm + ' Lafette', base + Vector((-1, s * R * 0.2, 2)), base + Vector((-1, s * R * 0.2, h - 1)), 2.4, 3.2, M['s3_grau'], bev=0.1)
        obox(nm + ' Achse', base + Vector((-1, -R * 0.24, h - 1)), base + Vector((-1, R * 0.24, h - 1)), 1.8, 1.8, M['s3_gun'], bev=0.08)
        ocyl(nm + ' Achsträger', base + Vector((-1, 0, h - 1)), base + Vector((2.2, 0, h)), 1.2, M['s3_gun'], 14, bev=0.04)
        dish(nm, base + Vector((3, 0, h)), (1.0, 0.0, 0.32), R, R * 0.42, M['s3_weiss'], ribs=10)
        ANCH[nm] = [x, 0, h]
    # Dipolfeld unter dem Rücken: Stäbe mit Querdipolen
    for k in range(18):
        x = -85 + k * 10 + rng.uniform(-2, 2); L = rng.uniform(14, 26); b = Vector((x, rng.uniform(-3, 3), -4.2))
        ocyl('Dipolmast', b, b - Vector((0, 0, L)), 0.22, M['s3_grau'], 8, bev=0)
        for j in range(3):
            z = -4.2 - L * (0.35 + j * 0.25); w = rng.uniform(3, 6)
            ocyl('Dipol', Vector((x, b.y - w / 2, z)), Vector((x, b.y + w / 2, z)), 0.09, M['s3_weiss'], 6, bev=0)
        nav_light(b - Vector((0, 0, L + 0.4)), size=0.45)
    # lange Drahtantennen zwischen Rückenende und Masten
    for s in (1, -1):
        cable(Vector((-95, s * 4, 4)), Vector((95, s * 4, 4)), 0.06, M['ow_kabel'], sag=1.5, n=24, name='Drahtantenne')
    # Wohnmodul mit zwei hellen Fenstern, Energiemodul mit Kühlflügeln, kleiner Andockport
    habitat('Wohnmodul', (-10, 0, -10.5), length=26, w=8, h=6.5, yaw=0.0, seed=12)
    for x in (-14, -6): block('Fenster', (x, 4.03, -9.6), (2.0, 0.12, 1.3), M['s3_fenster'], 0.02)
    block('Energiemodul', (-75, 0, -9), (16, 10, 8), M['s3_gun'], 0.2)
    reactor_like = ocyl('Energiekern', Vector((-75, 0, -13)), Vector((-75, 0, -19)), 3.2, M['s3_grau'], 20, bev=0.05)
    radiator_cluster('Kühlflügel', (-75, 7, -10), n=3, spacing=1.6, w=6, h=12, yaw=0.0)
    radiator_cluster('Kühlflügel', (-75, -7, -10), n=3, spacing=1.6, w=6, h=12, yaw=0.0)
    block('Andockport', (10, 0, -11), (6, 6, 5), M['s3_grau'], 0.15)
    ocyl('Andockkragen', Vector((13, 0, -11)), Vector((15.5, 0, -11)), 2.2, M['s3_amber'], 20, bev=0.05)
    sign('FERNOHR', 3.2, face_frame((-10, 4.1, -7.7), (0, 1, 0)), M['pf_weissfarbe'])
    sign('HORCHPOSTEN H-3', 1.2, face_frame((-10, 4.1, -12.4), (0, 1, 0)), M['pf_weissfarbe'])
    # Reif auf der Schattenseite (−Y, unten): flache Flecken
    for k in range(40):
        x = rng.uniform(-90, 90); block('Reif', (x, -4.15, rng.uniform(-3.8, 3.8)), (rng.uniform(1.5, 5), 0.06, rng.uniform(0.6, 2.2)), M['s3_frost'], 0.0)
    for x in (-95, 95): nav_light((x, 4.6, 0), green=False); nav_light((x, -4.6, 0), green=True)
    ANCH['wohnmodul'] = [-10, 0, -10.5]; ANCH['andock'] = [16, 0, -11]

# =====================================================================================
# Pumpwerk am Reifschleier (≈ 150 m, Bergbaugilde): Schmelze in der Mitte, zwei Ansaugarme nach −X (zum Eisfeld), Tankreihe, Hangar nach +X
# =====================================================================================
def pumpwerk():
    rng = random.Random(23)
    # Schmelze: dicker Zylinderkörper, Wärmetauscher, Dampfventile
    ocyl('Schmelze', Vector((-8, 0, -14)), Vector((-8, 0, 16)), 15, M['s3_oxid'], 32, bev=0.2)
    for z in (-10, -2, 6, 13): ring('Schmelze Band', 15.4, 0.5, Vector((-8, 0, z)), (0, 0, 1), M['s3_messing'], 64)
    ocyl('Schmelze Kuppel', Vector((-8, 0, 16)), Vector((-8, 0, 20)), 13, M['s3_petrol'], 32, r2=7, bev=0.1)
    for k in range(6):
        a = 2 * math.pi * k / 6 + 0.3; p = Vector((-8 + math.cos(a) * 15.6, math.sin(a) * 15.6, 2))
        block('Wärmetauscher', p, (3.2, 3.2, 14), M['s3_petrol'], 0.15).rotation_euler = (0, 0, a)
        for j in range(5): ring('Tauscherrippe', 2.0, 0.12, p + Vector((0, 0, -5 + j * 2.5)), (0, 0, 1), M['s3_messing'], 20)
    for k in range(4):
        a = 2 * math.pi * k / 4 + 0.8; p = Vector((-8 + math.cos(a) * 8, math.sin(a) * 8, 19))
        ocyl('Dampfventil', p, p + Vector((0, 0, 5)), 1.0, M['s3_messing'], 14, bev=0.03)
        ocyl('Dampfventil Kappe', p + Vector((0, 0, 5)), p + Vector((0, 0, 5.6)), 1.4, M['s3_oxid'], 14, bev=0.03)
    # Hauptträger quer durch (X), Hangarblock vorn (+X) mit Tor und Gildezeichen
    block('Hauptträger', (12, 0, -4), (60, 10, 8), M['s3_oxid'], 0.25)
    block('Hangar', (52, 0, -2), (34, 34, 24), M['s3_oxid'], 0.4)
    # Hangarhaut: Eckpfeiler, senkrechte Rippen, Dachaufbauten, Leitstandfenster, Leitungen
    for sx in (-1, 1):
        for sy in (-1, 1): block('Hangar Eckpfeiler', (52 + sx * 16.4, sy * 16.4, -2), (2.2, 2.2, 25), M['s3_petrol'], 0.1)
    for x in range(38, 68, 5):
        for s in (1, -1): block('Hangar Rippe', (x, s * 17.1, -2), (0.8, 0.5, 23), M['s3_oxid'], 0.05)
    for y in range(-12, 13, 6):
        block('Hangar Rippe hinten', (34.9, y, -2), (0.5, 0.8, 23), M['s3_oxid'], 0.05)
    block('Leitstand', (44, 0, 11.6), (14, 12, 3.4), M['s3_petrol'], 0.2)
    block('Leitstand Fenster', (51.05, 0, 11.8), (0.1, 10, 1.4), M['s3_fenster'], 0.02)
    for s in (1, -1): block('Leitstand Fenster', (44, s * 6.05, 11.8), (11, 0.1, 1.4), M['s3_fenster'], 0.02)
    greebles((56, 0, 10.6), (24, 28, 1.0), 40, 17, scale=1.3)
    for s in (1, -1):
        pipe('Hangarleitung', [Vector((36, s * 17.6, 8)), Vector((60, s * 17.6, 8)), Vector((66, s * 17.6, 2))], 0.5, M['s3_messing'])
        for x in (40, 50, 60): utility_box((x, s * 17.3, -8), (0, s, 0), (2.4, 1.8, 0.9), seed=x + (s > 0))
    for z in (-10, 6): block('Hangar Band', (52, 0, z), (34.4, 34.4, 1.0), M['s3_petrol'], 0.06)
    block('Hangartor Rahmen', (69.2, 0, -2), (0.8, 26, 16), M['s3_messing'], 0.08)
    block('Hangartor', (69.5, 0, -2), (0.4, 24, 14), M['s3_petrol'], 0.05)
    for s in (1, -1): block('Hangartor Warnstreifen', (69.6, s * 12.6, -2), (0.3, 1.2, 15), M['ow_warn'], 0.02)
    sign('GILDE · PUMPWERK REIFSCHLEIER', 1.8, face_frame((69.8, 0, 7.6), (1, 0, 0)), M['pf_weissfarbe'])
    sign('PW-2', 3.6, face_frame((52, 17.45, 3), (0, 1, 0)), M['pf_weissfarbe'])
    sign('PW-2', 3.6, face_frame((52, -17.45, 3), (0, -1, 0)), M['pf_weissfarbe'])
    for s in (1, -1):
        for z in (-9, 5): lamp(Vector((69.8, s * 14, z)), (1, 0, 0), 0.8)
    # Natrium-Flutlichter auf dem Hangar
    for s in (1, -1):
        for x in (40, 62):
            b = Vector((x, s * 15, 10)); ocyl('Flutlichtmast', b, b + Vector((0, 0, 7)), 0.3, M['ow_stahl'], 8, bev=0)
            block('Flutlicht', b + Vector((0.6, 0, 7.4)), (1.2, 2.4, 1.2), M['ow_stahl'], 0.05); block('Flutlicht Glas', b + Vector((1.22, 0, 7.4)), (0.08, 2.1, 0.9), M['s3_natrium'], 0.02)
    # Tankreihe: vier liegende Tanks (Wasser, Gas) neben dem Träger, Leitungen zur Schmelze
    for k, x in enumerate((6, 18, 30)):
        for s in (1, -1):
            c = Vector((x, s * 13, -6)); tank('Speichertank', c, (0, 0, 1), 16, 5.0, m=M['s3_petrol' if k % 2 else 's3_oxid'], bands=3, seed=k * 3 + (s > 0))
            pipe('Tankleitung', [c + Vector((0, -s * 4.5, 6)), Vector((x, s * 4, 2)), Vector((-8, s * 4, 2))], 0.55, M['s3_messing'])
            ANCH.setdefault('tanks', []).append([x, s * 13, -6])
    # Ansaugarme zum Eisfeld (−X): Fachwerk mit Förderröhre und Greifschaufel am Ende
    for s in (1, -1):
        a, b = Vector((-20, s * 8, -2)), Vector((-74, s * 22, -10))
        truss('Ansaugarm', a, b, 4, 4, seg=4.5, rc=0.35, rw=0.16, m=M['s3_oxid'])
        pipe('Förderröhre', [a + Vector((0, 0, 3)), b + Vector((0, 0, 3))], 1.1, M['s3_petrol'])
        for t in (0.25, 0.5, 0.75): ring('Röhrenschelle', 1.25, 0.12, a.lerp(b, t) + Vector((0, 0, 3)), (b - a).normalized(), M['s3_messing'], 20)
        g = b + (b - a).normalized() * 3
        block('Greifschaufel', g, (6, 5, 4), M['ow_stahl'], 0.2).rotation_euler = (0, 0, math.atan2(b.y - a.y, b.x - a.x))
        for j in range(4): ocyl('Schaufelzahn', g + Vector((-2.6, (j - 1.5) * 1.2, -2)), g + Vector((-3.8, (j - 1.5) * 1.2, -3.2)), 0.25, M['ow_stahl'], 6, bev=0)
        nav_light(g + Vector((0, 0, 3)), green=(s < 0))
        # Reif und Eiszapfen am kalten Ende
        for j in range(10):
            p = a.lerp(b, 0.6 + 0.4 * rng.random()) + Vector((rng.uniform(-1.5, 1.5), rng.uniform(-1.5, 1.5), -2.2))
            ocyl('Eiszapfen', p, p - Vector((0, 0, rng.uniform(0.8, 3.2))), rng.uniform(0.15, 0.4), M['s3_frost'], 6, r2=0.02, bev=0)
        ANCH['greifer%d' % (1 if s > 0 else 2)] = list(g)
    # Kühlflügel mit schwacher Glut über der Schmelze, Andockklammern für kleine Bergbauschiffe unten
    for s in (1, -1):
        for k in range(3):
            radiator('Kühlflügel', (-8 + (k - 1) * 7, s * 22, 6), w=5.5, h=16, th=0.45, yaw=0.0)
        for k in range(3): block('Kühler Glut', (-8 + (k - 1) * 7, s * 22, -2.3), (5.2, 0.5, 0.35), M['s3_glut'], 0.0)      # glühende Sammelleitung unten am Flügel
    for k, x in enumerate((-2, 14, 30)):
        c = Vector((x, 0, -9.5)); block('Andockklammer', c, (5, 4, 3), M['s3_messing'], 0.1)
        for d in (-2.2, 2.2): ocyl('Klammerbacke', c + Vector((d, 0, -1.5)), c + Vector((d, 0, -4.5)), 0.5, M['s3_oxid'], 10, bev=0.03)
    # Frost auf der Schattenseite der Schmelze
    for k in range(30):
        a = math.pi + rng.uniform(-1.2, 1.2); z = rng.uniform(-12, 14)
        block('Reif', (-8 + math.cos(a) * 15.25, math.sin(a) * 15.25, z), (rng.uniform(1, 4), rng.uniform(1, 4), rng.uniform(0.6, 2.4)), M['s3_frost'], 0.0).rotation_euler = (0, 0, a)
    greebles((12, 0, 0.6), (56, 8, 1.2), 60, 9, scale=1.1)
    for p in ((70, 17.5, 10), (70, -17.5, 10), (-80, 0, -6)): nav_light(p, green=p[1] < 0)
    ANCH['tor'] = [69.5, 0, -2]; ANCH['andock'] = [110, 0, -2]; ANCH['start'] = [95, 0, -2]

# ---------- Bühne und Ansichten (Studio wie beim Plattform-Baukasten) ----------
SPAN = {'Torwache': 120, 'Fernohr': 210, 'Pumpwerk': 170}[MODELL]
def stages():
    CUR[0] = C_STU
    sun = bpy.data.lights.new('Sonne', 'SUN'); sun.energy = 3.2; sun.angle = math.radians(2.0)
    so = bpy.data.objects.new('Sonne', sun); C_STU.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(-35)); STAGE['sun'] = so
    fill = bpy.data.lights.new('Gegenlicht', 'AREA'); fill.energy = 2.5e5 * (SPAN / 70) ** 2; fill.size = SPAN; fill.color = (0.8, 0.86, 1.0)
    fo = bpy.data.objects.new('Gegenlicht', fill); C_STU.objects.link(fo); fo.location = (SPAN * 1.4, SPAN * 1.6, SPAN * 0.8)
    fo.rotation_euler = (Vector((0, 0, 0)) - fo.location).to_track_quat('-Z', 'Y').to_euler(); STAGE['fill'] = fo
    w = SC.world or bpy.data.worlds.new('Welt'); SC.world = w; w.use_nodes = True; STAGE['world'] = w
    k = SPAN / 70 * 0.72
    cam('Schraeg', (62 * k, -80 * k, 38 * k), (0, 0, -2), 33)
    cam('Heck', (-70 * k, 64 * k, 28 * k), (0, 0, 0), 33)
    cam('Seite', (0, -300 * k, 3), (0, 0, 3), 50, ortho=SPAN * 1.15)
    cam('Draufsicht', (0, 0, 300 * k), (0, 0, 0), 50, ortho=SPAN * 1.15); CAMS['Draufsicht'].rotation_euler = (0, 0, 0)
    cam('Nah', (SPAN * 0.42, -SPAN * 0.32, SPAN * 0.16), (SPAN * 0.2, 0, 2), 30)
VIEWS = {'schraeg': ('Schraeg', 'grau', 0.3), 'heck': ('Heck', 'grau', 0.3), 'seite': ('Seite', 'grau', 0.4), 'draufsicht': ('Draufsicht', 'grau', 0.3),
         'nah': ('Nah', 'grau', 0.3), 'weltraum': ('Schraeg', 'weltraum', 0.2)}
def world_s3(kind):
    w = STAGE['world']; nt = w.node_tree; N_ = nt.nodes; K = nt.links
    for n in list(N_): N_.remove(n)
    out = N_.new('ShaderNodeOutputWorld'); bg = N_.new('ShaderNodeBackground'); K.new(bg.outputs[0], out.inputs[0])
    if kind == 'grau': bg.inputs['Color'].default_value = (0.13, 0.13, 0.135, 1); bg.inputs['Strength'].default_value = 0.55; return
    bg.inputs['Color'].default_value = (0.004, 0.005, 0.008, 1); bg.inputs['Strength'].default_value = 1.0
def view(name, path, res=(1600, 900)):
    camn, stage, ex = VIEWS[name]
    world_s3(stage)
    STAGE['sun'].data.energy = {'grau': 3.2, 'weltraum': 4.0}[stage]
    STAGE['fill'].data.energy = {'grau': 1.0, 'weltraum': 0.2}[stage] * 2.5e5 * (SPAN / 70) ** 2
    SC.view_settings.exposure = ex
    SC.camera = CAMS[camn]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = 100
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)
def extents():
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    skip = set(o.name for c in (C_STU, C_GRAU) for o in c.all_objects)
    for o in bpy.data.objects:
        if o.type not in ('MESH', 'CURVE', 'FONT') or o.name in skip or o.hide_render or not o.users_collection: continue
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    return {'x_m': round(hi.x - lo.x, 1), 'y_m': round(hi.y - lo.y, 1), 'z_m': round(hi.z - lo.z, 1), 'min': [round(v, 1) for v in lo], 'max': [round(v, 1) for v in hi]}

CUR[0] = coll(MODELL)
{'Torwache': torwache, 'Fernohr': fernohr, 'Pumpwerk': pumpwerk}[MODELL]()
stages(); world_s3('grau')
json.dump(ANCH, open(os.path.join(os.path.dirname(bpy.data.filepath), MODELL.lower() + '-anker.json'), 'w', encoding='utf-8'), indent=1)
result = {'objekte': len([o for o in bpy.data.objects if o.users_collection])}
