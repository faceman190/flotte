# Elster: eigenes einsitziges Bergbauschiff, Schaumodell in Blender. Wunsch des Nutzers (17.11.2026): „Dieses Schiff entwerfen“ mit Bildern
# der MISC Prospector aus Star Citizen (Bauplan, Seitenansicht) und einem Freelancer-Poster. Eigener Entwurf in dieser Art, keine Kopie:
# kantiger Industrie-Look in Altweiß, Grau und Petrol statt Chrom; Laser auf einem Schwenkturm unter dem Kinn statt Greifarm;
# je Seite zwei liegende Erzkanister im Gitterrahmen statt Erzsäcken; zwei tief liegende Triebwerksgondeln und Kühlrippen auf dem Rücken.
# Der Name Elster ist die Prospektor-Klasse im Spiel (bisher mit gekauftem Modell „Zenith“).
# Aufruf ohne Fenster: blender.exe -b --python els_lauf.py -- <ansichten>
#
# Achsen wie beim Würger: +X nach vorn, +Y Backbord, +Z oben, Boden z = 0. Rund 23 × 9 × 6 m.
# Die Werkzeuge, Materialien, Bühnen und Kameras kommen aus ../wuerger/wue_kit.py (nur die Helfer, NUR_HELFER).
import bpy, bmesh, math, random, os, json
from mathutils import Vector, Matrix
NUR_HELFER = True
_wk = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'wuerger', 'wue_kit.py')
exec(compile(open(_wk, encoding='utf-8').read(), 'wue_kit.py', 'exec'))
class Part:      # wie im Würger, aber verschachtelbar (inneres Leerobjekt hängt am äußeren, Lage relativ dazu)
    def __init__(self, name, mw, col=None): self.name, self.mw, self.col = name, mw, col
    def __enter__(self):
        if self.col: CUR[0] = self.col
        self.e = group(self.name, self.mw); self.prev = REC[0]; REC[0] = []; return self.e
    def __exit__(self, *a):
        objs = REC[0]; REC[0] = self.prev
        for o in objs: o.parent = self.e
        return False

# =====================================================================================
# Farben: Altweiß mit Gebrauchsspuren, Grau, Gussgrau für Struktur, Petrol als Akzent
# =====================================================================================
M['w1'] = hull_mat('Lack Altweiss', (0.26, 0.26, 0.245), 0.15, 0.5, 0.9)
M['w2'] = hull_mat('Lack Hellgrau', (0.205, 0.21, 0.21), 0.2, 0.52, 0.9)
M['w3'] = hull_mat('Lack Grauweiss', (0.235, 0.235, 0.225), 0.15, 0.5, 0.9)
M['fuge'] = mk('Fuge hell', (0.05, 0.051, 0.053), 0.4, 0.6, var=0.0, rvar=0.0, grime=False)      # weiche Fugen: schwarze Linien wirkten auf Weiß wie Fliesen
M['rahmen'] = hull_mat('Rahmen Ocker', (0.2, 0.135, 0.03), 0.3, 0.55, 1.0)
M['grau2'] = hull_mat('Lack Mittelgrau', (0.11, 0.113, 0.118), 0.25, 0.5, 0.9)
M['rauten'] = hull_mat('Rumpf Gussgrau', (0.045, 0.047, 0.05), 0.55, 0.45, 0.6)
M['rot'] = hull_mat('Lack Petrol', (0.015, 0.15, 0.14), 0.2, 0.45, 0.8)
M['erz'] = hull_mat('Kanister Grau', (0.09, 0.092, 0.095), 0.45, 0.42, 0.9)
M['laser'] = mk('Laserlinse', (0.9, 0.5, 0.2), 0.0, 0.1, var=0, rvar=0, emit=(1.0, 0.45, 0.15), es=6, grime=False)
M['strahl'] = mk('Laserstrahl', (1, 0.5, 0.2), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.4, 0.12), es=60, grime=False)
M['fels'] = mk('Felsen', (0.07, 0.062, 0.055), 0.1, 0.85, var=0.4, scale=0.6, bump=0.6, bscale=4, grime=False)
M['erzader'] = mk('Erzader', (0.4, 0.3, 0.12), 0.8, 0.35, var=0.3, scale=2, grime=False)
GRAU, STRUKT, PETROL = 1, 3, 5

# =====================================================================================
# 1. Rumpf: Kanzelkopf, schmale Taille an den Kanistern, Maschinenteil hinten
# =====================================================================================
EX = [10.6, 9.9, 8.7, 6.6, 3.6, 0.6, -3.8, -6.8, -9.6, -10.8]
EW = [0.3, 1.0, 1.45, 1.62, 1.62, 1.38, 1.3, 1.55, 1.6, 1.38]
ET = [3.35, 4.1, 4.6, 4.95, 5.25, 4.85, 4.75, 4.95, 4.85, 4.6]
EB = [2.95, 2.4, 2.12, 2.02, 2.0, 2.2, 2.3, 2.2, 2.3, 2.55]
def etab(Tb, x):
    if x >= EX[0]: return Tb[0]
    for i in range(len(EX) - 1):
        a, b = EX[i], EX[i + 1]
        if a >= x >= b: return Tb[i] + (Tb[i + 1] - Tb[i]) * (a - x) / (a - b)
    return Tb[-1]
def eprofile(x):
    w, zt, zb = etab(EW, x), etab(ET, x), etab(EB, x); h = zt - zb
    return [(0, zt), (0.55 * w, zt), (w, zt - 0.2 * h), (w, zb + 0.2 * h), (0.6 * w, zb), (0, zb)]
def build_body():
    rings = []
    for x in EX:
        P = eprofile(x); rings.append([(x, y, z) for y, z in P] + [(x, -y, z) for y, z in reversed(P[1:-1])])
    bm, caps = tube(rings)
    for x in (10.2, 9.4, 8.2, 7.4, 6.0, 4.8, 3.6, 2.4, 1.2, 0.0, -1.2, -2.4, -3.6, -4.8, -6.0, -7.2, -8.4, -9.6, -10.3): rcut(bm, (x, 0, 0), (1, 0, 0))
    for y in (0.0, 0.7, -0.7): rcut(bm, (0, y, 0), (0, 1, 0), lambda f: abs(f.normal.z) > 0.5)
    for y in (0.62, -0.62): rcut(bm, (0, y, 0), (0, 1, 0), lambda f: f.normal.z > 0.5 and 6.2 < f.calc_center_median().x < 10.4)
    for z in (2.9, 3.6, 4.32, 4.52): rcut(bm, (0, 0, z), (0, 0, 1), lambda f: abs(f.normal.z) < 0.5)
    raise_poly(bm, [(2.4, 0.5), (1.9, 0.6), (-9.8, 0.6), (-10.2, 0.4), (-10.2, -0.4), (-9.8, -0.6), (1.9, -0.6), (2.4, -0.5)], 0.07, 1)
    raise_poly(bm, [(6.2, 0.62), (-7.5, 0.62), (-7.5, -0.62), (6.2, -0.62)], 0.06, -1)
    raise_poly(bm, [(5.8, 0.4), (1.0, 0.4), (1.0, -0.4), (5.8, -0.4)], 0.05, -1)
    return bm
def body_colour(f, c):
    if abs(f.normal.z) < 0.5 and 4.32 < c.z < 4.52 and c.x > -10.4: return PETROL      # Petrolband längs der Flanke
    if f.normal.z < -0.5: return GRAU
    if abs(f.normal.x) > 0.7 and c.x < -10.5: return STRUKT
    return None
# Kanzel: große Haube mit tief gezogenen Seitenscheiben (Blick auf den Felsen), Verkleidung dahinter
CANOPY = [(9.95, 0.55, 0.25, 4.32), (9.2, 1.08, 0.55, 4.98), (8.2, 1.32, 0.76, 5.3), (7.1, 1.38, 0.72, 5.36), (6.4, 1.34, 0.58, 5.28)]
FAIRING = [(6.4, 1.34, 0.58, 5.28), (5.2, 1.3, 0.42, 5.36), (3.9, 1.12, 0.22, 5.34), (2.6, 0.8, 0.05, 5.1)]
CTIP = 10.4

# =====================================================================================
# 2. Triebwerksgondeln (tief, hinter den Kanistern), Pylone, Kühlrippen
# =====================================================================================
NY, NZ = 2.35, 3.15
NXS = [(-4.9, 0.7), (-5.5, 0.95), (-6.1, 1.0), (-10.4, 1.0), (-11.2, 0.93)]
def build_nacelle(side):
    yc = NY * side; prof = chamfer_rect(1.9, 1.9, 0.5)
    rings = [[(x, yc + u * s, NZ + v * s) for u, v in prof] for x, s in NXS]
    bm, caps = tube(rings, True, False)
    for x in (-5.8, -6.6, -7.6, -8.6, -9.6, -10.2): rcut(bm, (x, 0, 0), (1, 0, 0))
    rcut(bm, (0, yc, 0), (0, 1, 0), lambda f: abs(f.normal.z) > 0.5)
    raise_poly(bm, [(-6.4, yc - 0.4), (-9.8, yc - 0.4), (-9.8, yc + 0.4), (-6.4, yc + 0.4)], 0.05, 1)
    return bm
def nacelle_colour(f, c):
    if -6.1 < c.x < -5.5: return PETROL
    if c.x > -5.5: return STRUKT
    if c.x < -10.2: return STRUKT
    return None
def bell(name, r1, r2, L, x0, m, n=32):      # offene Düsenglocke längs −X
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=n, radius1=r2, radius2=r1, depth=L, matrix=T(x0 - L / 2, 0, 0) @ RY(PI / 2))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    return link(bpy.data.objects.new(name, me))
def engines():
    for s in (1, -1):
        yc = NY * s
        with Part('Triebwerk', T(-11.2, yc, NZ), C_PART):
            cyl('Duesenkragen', 0.86, 0.22, -0.05, 0, 0, M['dunkel'], 'X', n=24)
            bell('Duesenglocke', 0.7, 0.86, 0.9, -0.1, M['duese'], 32)
            cyl('Glut', 0.66, 0.05, -0.3, 0, 0, M['glut'], 'X', n=24)
            for k in range(3): ring('Kuehlring', 0.8 + k * 0.03, 0.025, (-0.35 - k * 0.22, 0, 0), (1, 0, 0), M['mittel'], 24)
        # Pylon zum Rumpf, Ansaugkiemen vorn an der Gondel
        prism('Pylon', [(-5.8, NZ - 0.35), (-9.8, NZ - 0.35), (-10.2, NZ + 0.35), (-6.4, NZ + 0.45)], s * 1.2, s * (NY - 0.7), M['rauten'], 'Y', 0.02)
        cyl('Einlass', 0.62, 0.1, -4.85, yc, NZ, M['dunkel'], 'X', n=24)
        for k in range(5): box('Einlassgitter', 0.03, 1.15, 0.03, -4.8, yc, NZ - 0.5 + k * 0.25, M['mittel'], 0)
def radiators():      # zwei schräge Kühlrippenfelder auf dem Maschinenteil
    for s in (1, -1):
        with Part('Kuehlrippen', T(-8.2, s * 0.62, 4.95) @ RX(-s * math.radians(24)), C_PART):
            prism('Rippentraeger', [(2.0, 0), (-2.2, 0), (-2.4, 1.35), (1.2, 1.35)], -0.06, 0.06, M['rauten'], 'Y', 0.01)
            for k in range(14): box('Rippe', 0.05, 0.16, 1.1, 1.4 - k * 0.27, 0, 0.72, M['mittel'], 0.004)
            box('Rippenkante', 3.7, 0.18, 0.08, -0.6, 0, 1.36, M['rot'], 0.01)
            sphere('Blitzlicht', 0.035, -2.38, 0, 1.38, M['blitz'], 10)

# =====================================================================================
# 3. Bergbau: Laserturm unter dem Kinn, Fangstrahler, Erzkanister im Gitterrahmen, Zuleitungen
# =====================================================================================
LASER_ROT = math.radians(-10)
def laser_turret():
    x0 = 8.3; zt = surf(x0, 0, -1)[0].z
    with Part('Laserturm', T(x0, 0, zt), C_WPN):
        cyl('Drehkranz', 0.62, 0.16, 0, 0, -0.08, M['dunkel'], 'Z', n=32)
        cyl('Turmsockel', 0.5, 0.3, 0, 0, -0.3, M['w2'], 'Z', n=24)
        for s in (1, -1): prism('Gabel', [(-0.35, -0.3), (0.35, -0.3), (0.25, -0.95), (-0.25, -0.95)], s * 0.36, s * 0.48, M['rauten'], 'Y', 0.01)
        with Part('Laser', T(0, 0, -0.75) @ RY(-LASER_ROT), C_WPN):
            cyl('Lagerachse', 0.09, 1.0, 0, 0, 0, M['chrom'], 'Y', n=12)
            cyl('Lasergehaeuse', 0.3, 1.5, 0.35, 0, 0, M['w1'], 'X', n=16)
            cyl('Heckkappe', 0.3, 0.3, -0.55, 0, 0, M['rauten'], 'X', n=16, r2=0.22)
            for k in range(4): ring('Fokusspule', 0.33, 0.035, (0.75 + k * 0.22, 0, 0), (1, 0, 0), M['duese'], 20)
            cyl('Laserrohr', 0.16, 0.9, 1.45, 0, 0, M['dunkel'], 'X', n=14)
            cyl('Emitter', 0.21, 0.14, 1.95, 0, 0, M['rauten'], 'X', n=14)
            cyl('Linse', 0.12, 0.02, 2.03, 0, 0, M['laser'], 'X', n=14)
            for k in range(6): box('Kuehlrippe', 0.05, 0.66, 0.08, -0.1 + k * 0.12, 0, 0.3, M['dunkel'], 0.003)
            box('Laserstreifen', 0.3, 0.62, 0.03, 0.2, 0, 0.29, M['warnrw'], 0)
        pipe('Laserkabel', [Vector((-0.4, 0.2, -0.05)), Vector((-0.55, 0.25, -0.5)), Vector((-0.3, 0.32, -0.8))], 0.03, M['rubber'], rad=0.1)
    for s in (1, -1):      # Fangstrahler: holen die gelösten Brocken heran
        loc, _ = surf(9.2, s * 0.85, -1)
        with Part('Fangstrahler', T(9.2, s * 0.85, loc.z), C_WPN):
            cyl('Strahlerfuss', 0.14, 0.2, 0, 0, -0.08, M['dunkel'], 'Z', n=12)
            cyl('Strahler', 0.11, 0.42, 0.18, 0, -0.22, M['w2'], 'X', n=12, r2=0.15)
            cyl('Strahlerlinse', 0.13, 0.02, 0.4, 0, -0.22, M['e_teal'], 'X', n=12)
POD = (-4.7, 1.5, 2.6, (2.95, 4.62), 0.8)      # Kanister: x von–bis, Mitte |y|, Höhen der zwei Lagen, Radius
def ore_pods():
    x0, x1, yc, zs, r = POD; L = x1 - x0
    for s in (1, -1):
        y = s * yc
        with Part('Erzrahmen', T(0, 0, 0), C_PART):
            for z in zs:      # liegende Kanister mit Kappen, Spannbändern, Warnband
                cyl('Erzkanister', r, L - 0.8, (x0 + x1) / 2, y, z, M['erz'], 'X', n=20)
                for xe, sg in ((x1 - 0.4, 1), (x0 + 0.4, -1)):
                    cyl('Kanisterkappe', r, 0.4, xe + sg * 0.2, y, z, M['w1'], 'X', n=20, r2=r * 0.62) if sg > 0 else cyl('Kanisterkappe', r * 0.62, 0.4, xe - 0.2, y, z, M['w1'], 'X', n=20, r2=r)
                    cyl('Kappenring', r + 0.03, 0.08, xe, y, z, M['rauten'], 'X', n=20)
                cyl('Fuellstutzen', 0.14, 0.25, x1 + 0.12, y, z, M['mittel'], 'X', n=10)
                for k in range(3): cyl('Spannband', r + 0.035, 0.12, x0 + 1.4 + k * (L - 2.8) / 2, y, z, M['rauten'], 'X', n=20)
                cyl('Warnband', r + 0.01, 0.35, x1 - 1.0, y, z, M['warnrw'], 'X', n=20)
                cyl('Petrolband', r + 0.012, 0.18, x0 + 0.95, y, z, M['rot'], 'X', n=20)
                for ang in (0.35, 1.22, 2.09, 2.96, 3.84, 4.71, 5.59):
                    box('Laengsrippe', L - 1.9, 0.07, 0.045, (x0 + x1) / 2 - 0.1, y + math.cos(ang) * (r + 0.015), z + math.sin(ang) * (r + 0.015), M['rauten'], 0.005, rot=(ang, 0, 0))
                cyl('Ventil', 0.06, 0.3, x1 + 0.28, y + 0.25 * s, z + 0.3, M['mittel'], 'X', n=10)
                ring('Handrad', 0.11, 0.015, (x1 + 0.45, y + 0.25 * s, z + 0.3), (1, 0, 0), M['rot'], 16)
                cyl('Manometer', 0.07, 0.04, x1 - 0.2, y + s * (r * 0.62), z + 0.45, M['dunkel'], 'Y', n=14)
            # Gitterrahmen: Längsträger oben, Mitte, unten; Stützen an den Enden und in der Mitte; Arme zum Rumpf
            zb, zm, ztop = zs[0] - r - 0.1, (zs[0] + zs[1]) / 2, zs[1] + r + 0.1
            for z in (zb, ztop):
                for yo in (-r - 0.05, r + 0.05): box('Laengstraeger', L + 0.3, 0.12, 0.12, (x0 + x1) / 2, y + yo, z, M['rahmen'], 0.01)
            for xx in (x0 - 0.05, (x0 + x1) / 2, x1 + 0.05):
                for yo in (-r - 0.05, r + 0.05): box('Rahmenstuetze', 0.14, 0.12, ztop - zb, xx, y + yo, (zb + ztop) / 2, M['rahmen'], 0.01)
                box('Querjoch', 0.14, 2 * r + 0.2, 0.12, xx, y, zb, M['rahmen'], 0.01); box('Querjoch', 0.14, 2 * r + 0.2, 0.12, xx, y, ztop, M['rahmen'], 0.01)
                box('Mittelsteg', 0.14, 2 * r + 0.2, 0.1, xx, y, zm, M['rahmen'], 0.01)
            for xx in (x0 + 0.6, (x0 + x1) / 2, x1 - 0.6):
                for z in (zs[0], zs[1] - 0.2):
                    a = Vector((xx, s * (etab(EW, xx) - 0.1), min(z, 4.4))); b = Vector((xx, y - s * (r + 0.05), z))
                    pipe('Tragarm', [a, b], 0.07, M['mittel'])
            box('Kanisterschild', 0.9, 0.02, 0.32, x1 - 1.9, y + s * (r + 0.02), zs[1], M['plate'], 0.002)
        # Zuleitung vom Laser unter dem Rumpf zum vorderen Kanister
        zt = surf(6.5, 0, -1)[0].z
        pipe('Erzleitung', [Vector((7.6, s * 0.3, zt - 0.1)), Vector((5.0, s * 0.5, zt - 0.12)), Vector((x1 + 0.6, s * 1.0, zs[0] - 0.4)), Vector((x1 + 0.3, y, zs[0] - 0.5))], 0.09, M['rubber'], rad=0.5)

# =====================================================================================
# 4. Beine mit Kniegelenk, Tür und Leiter, Cockpit
# =====================================================================================
def leg(name, x, y, out, foot=(0.9, 0.75)):
    s = 1 if y >= 0 else -1; loc, _ = surf(x, y, -1); zt = loc.z
    hip = Vector((x, y, zt - 0.05)); knee = Vector((x - 0.3, y + s * out, zt * 0.55)); ft = Vector((x - 0.1, y + s * out * 1.15, 0.32))
    CUR[0] = C_GEAR
    with Part(name, T(0, 0, 0), C_GEAR):
        box('Beinlager', 0.6, 0.5, 0.22, x, y, zt - 0.1, M['rauten'], 0.01)
        pipe('Oberschenkel', [hip, knee], 0.16, M['grau2']); pipe('Unterschenkel', [knee, ft], 0.13, M['mittel']); pipe('Schutzblech', [hip.lerp(knee, 0.15) + Vector((0.12, 0, 0)), hip.lerp(knee, 0.8) + Vector((0.12, 0, 0))], 0.09, M['w1'])
        sphere('Kniegelenk', 0.2, knee.x, knee.y, knee.z, M['rauten'], 16); cyl('Kniebolzen', 0.08, 0.5, knee.x, knee.y, knee.z, M['chrom'], 'X', n=12)
        a = hip + Vector((0.35, 0, -0.05)); pipe('Hydraulikzylinder', [a, a.lerp(knee, 0.55)], 0.06, M['dunkel']); pipe('Kolbenstange', [a.lerp(knee, 0.5), knee + Vector((0.12, 0, 0.05))], 0.035, M['chrom'])
        box('Fussplatte', foot[0], foot[1], 0.12, ft.x, ft.y, 0.14, M['mittel'], 0.02); box('Fusssohle', foot[0] - 0.05, foot[1] - 0.05, 0.08, ft.x, ft.y, 0.04, M['rubber'], 0.01)
        for dx in (-0.3, 0.3): pipe('Fussstrebe', [ft + Vector((0, 0, -0.05)), Vector((ft.x + dx, ft.y, 0.2))], 0.04, M['mittel'])
def door_ladder():      # Tür an Backbord vor den Kanistern, Leiter aus der Schwelle
    x0, x1, z0, z1 = 3.95, 5.05, 2.72, 4.58; w = etab(EW, 4.5)
    with Part('Tuer', T(0, w, 0), C_PART):
        for z in (z0 - 0.04, z1 + 0.04): box('Tuerrahmen', x1 - x0 + 0.16, 0.06, 0.08, (x0 + x1) / 2, 0.02, z, M['rauten'], 0.006)
        for x in (x0 - 0.04, x1 + 0.04): box('Tuerrahmen', 0.08, 0.06, z1 - z0 + 0.16, x, 0.02, (z0 + z1) / 2, M['rauten'], 0.006)
        box('Tuerblatt', x1 - x0, 0.03, z1 - z0, (x0 + x1) / 2, 0.015, (z0 + z1) / 2, M['w2'], 0.006)
        box('Tuerfenster', 0.3, 0.02, 0.4, (x0 + x1) / 2, 0.03, z1 - 0.45, M['rauchglas'], 0.004)
        box('Tuergriff', 0.06, 0.05, 0.24, x1 - 0.18, 0.05, (z0 + z1) / 2, M['warnrw'], 0.004)
        box('Schwelle', x1 - x0 + 0.3, 0.12, 0.06, (x0 + x1) / 2, 0.06, z0 - 0.08, M['warnrw'], 0.004)
        sphere('Tuerlicht', 0.03, x1 + 0.2, 0.04, z1 + 0.05, M['e_green'], 8)
    top, bot = Vector((4.5, w + 0.08, z0 - 0.08)), Vector((4.5, w + 0.75, 0.03)); d = bot - top; n = int(d.length / 0.3)
    CUR[0] = C_GEAR
    for off in (-0.22, 0.22): o = Vector((off, 0, 0)); pipe('Leiterholm', [top + o, bot + o], 0.022, M['mittel'])
    for k in range(1, n): p = top + d * (k / n); pipe('Leitersprosse', [p + Vector((-0.22, 0, 0)), p + Vector((0.22, 0, 0))], 0.014, M['steel'])
    for off in (-0.22, 0.22): box('Leiterfuss', 0.12, 0.12, 0.04, bot.x + off, bot.y, 0.02, M['rubber'], 0.008)
def cockpit():
    CUR[0] = C_ROOM; FL = 3.0
    tub = []
    for x in (9.8, 9.0, 8.0, 7.0, 6.3):
        w = max(0.3, canopy_half(x) - 0.06); zt = surf(x, w, 1)[0].z - 0.02
        tub.append((x, [(w, zt), (w, FL), (-w, FL), (-w, zt)], 0))
    loft('Cockpitwanne', tub, ['innen'], cap_back=True)
    box('Sitzsockel', 0.5, 0.44, 0.36, 7.2, 0, FL + 0.18, M['mittel'], 0.01)
    box('Sitzpolster', 0.58, 0.5, 0.12, 7.25, 0, FL + 0.42, M['sitz'], 0.03)
    with Part('Sitzlehne', T(6.95, 0, FL + 0.42) @ RY(math.radians(-14)), C_ROOM):
        box('Lehne', 0.12, 0.54, 0.95, 0, 0, 0.48, M['sitz'], 0.03); box('Kopfteil', 0.16, 0.4, 0.28, 0, 0, 1.02, M['dunkel'], 0.02)
        for sg in (1, -1): box('Gurt', 0.012, 0.06, 0.7, 0.07, sg * 0.1, 0.45, M['gurt'], 0.002)
    prism('Pult', [(8.25, FL), (9.2, FL), (9.2, FL + 0.55), (8.55, FL + 0.95), (8.3, FL + 0.8)], -0.6, 0.6, M['verkleidung'], 'Y', 0.015)
    for k, (y, m) in enumerate(((0.38, 'mfd2'), (0.0, 'mfd'), (-0.38, 'mfd2'))):
        with Part('Anzeige', T(8.42, y, FL + 0.9) @ RY(math.radians(38)), C_ROOM):
            box('Rahmen', 0.025, 0.32, 0.24, 0, 0, 0, M['dunkel'], 0.004); box('Bild', 0.004, 0.28, 0.2, -0.014, 0, 0, M[m], 0)
    for s in (1, -1):
        box('Armlehne', 0.7, 0.14, 0.42, 7.35, s * 0.42, FL + 0.32, M['verkleidung'], 0.01)
        cyl('Griff', 0.025, 0.2, 7.55, s * 0.42, FL + 0.62, M['dunkel'], 'Z', n=10)
    area('Cockpitlicht', (7.6, 0, 4.9), (0, 0, 0), 0.6, 0.4, 6, (0.85, 0.9, 1.0))

# =====================================================================================
# 5. Kleinteile, Lichter, Beschriftung
# =====================================================================================
def details():
    for s in (1, -1):
        rcs('Steuerduesen Bug', 9.3, s * 0.9, -1, s); rcs('Steuerduesen Heck', -9.6, s * 1.1, 1, s); rcs('Steuerduesen unten', -2.0, s * 0.9, -1, s)
        naca('Lufteinlass', 2.0, s * 0.95, 1, 0.8, 0.26)
        access('Wartungsklappe', -1.0, s * 0.95, 0.6, 0.45); access('Wartungsklappe', -5.6, s * 0.95, 0.5, 0.45)
        grille('Abluft', -8.0, s * NY, 1.6, 0.6, 1, 10)
        sphere('Positionslicht', 0.05, -10.6, s * (NY + 0.96), NZ, M['nav_r' if s > 0 else 'nav_g'], 12)
        loc, _ = surf(9.6, s * 0.5, -1); sphere('Arbeitslicht', 0.07, 9.6, s * 0.5, loc.z - 0.05, M['blitz'], 12)
        spot = bpy.data.lights.new('Arbeitsscheinwerfer', 'SPOT'); spot.energy = 400; spot.spot_size = math.radians(55); spot.color = (1, 0.95, 0.85)
        so = bpy.data.objects.new('Arbeitsscheinwerfer', spot); C_LITE.objects.link(so); so.location = (9.6, s * 0.5, loc.z - 0.1)
        so.rotation_euler = (Vector((4, 0, -3))).to_track_quat('-Z', 'Y').to_euler()
    CUR[0] = C_PART
    with Part('Sensormast', onsurf(-2.5, 0, 1), C_PART):
        cyl('Mast', 0.04, 0.9, 0, 0, 0.45, M['mittel'], 'Z', n=8); cyl('Scanner', 0.22, 0.08, 0, 0, 0.92, M['w2'], 'Z', n=16, r2=0.14)
        sphere('Mastlicht', 0.03, 0, 0, 0.98, M['nav_r'], 8)
    with Part('Klingenantenne', onsurf(-4.4, 0, 1), C_PART): prism('Antenne', [(0.2, 0), (-0.16, 0), (-0.28, 0.24), (-0.12, 0.24)], -0.015, 0.015, M['dunkel'], 'Y', 0.003)
    with Part('Kinnfenster', onsurf(9.7, 0, -1), C_PART):
        box('Fensterrahmen', 0.9, 0.9, 0.04, 0, 0, 0.015, M['rauten'], 0.01); box('Kinnglas', 0.78, 0.78, 0.02, 0, 0, 0.035, M['rauchglas'], 0.006)
def wear_details():
    CUR[0] = C_PART
    access('Dachluke', 1.2, 0.0, 0.8, 0.8); grille('Dachluefter', -1.6, 0.0, 1.0, 0.5, 1, 8); grille('Dachluefter', -5.4, 0.0, 1.0, 0.5, 1, 8)
    for x0, x1 in ((2.2, -0.4), (-2.6, -4.6)): strip((x0, 0.62), (x1, 0.62), 0.06, 1, 'warnrw', 3, -0.06, 1); strip((x0, 0.62), (x1, 0.62), 0.06, 1, 'warnrw', 3, -0.06, -1)
    w = etab(EW, 4.5)
    for x in (3.75, 5.25): pipe('Haltegriff', [Vector((x, w + 0.02, 2.95)), Vector((x, w + 0.1, 3.0)), Vector((x, w + 0.1, 4.2)), Vector((x, w + 0.02, 4.25))], 0.018, M['warnrw'], rad=0.04)
    CUR[0] = C_DECAL
    rng = random.Random(5)
    for s in (1, -1):      # Laufspuren an den Flanken (unter Lüftern, Klappen, Tür), Ruß an den Gondeln, Staub am Bauch
        xd = (-1, 0, 0) if s > 0 else (1, 0, 0)
        for x in (8.0, 6.2, 2.6, 0.9, -5.8, -7.4, -9.2):
            if 3.6 < x < 5.4 and s > 0: continue
            W = etab(EW, x); zt = etab(ET, x) - 0.2 * (etab(ET, x) - etab(EB, x))
            streak((x + rng.uniform(-0.3, 0.3), s * (W + 0.004), zt - 0.05), xd, (0, 0, 1), rng.uniform(0.3, 0.6), rng.uniform(0.8, 1.6), 'spur')
        streak((4.5, s * (etab(EW, 4.5) + 0.03), 2.68), xd, (0, 0, 1), 1.3, 0.6, 'staub') if s > 0 else None
        yo = s * (NY + 0.955)
        for x in (-6.4, -8.8): streak((x, yo, NZ + 0.6), xd, (0, 0, 1), 0.7, 1.2, 'spur')
        spot((-10.7, s * NY, NZ + 0.955), 0.7, 'fleck', 1.4); spot((-9.6, s * 0.0 + s * 0.3, etab(ET, -9.6) + 0.075), 0.5, 'fleck', 1.6)
        for x in (-2.0, -4.0): spot((x, s * 0.9, etab(ET, x) + 0.01), 0.45, 'abrieb', 1.5)
def markings():
    W = bpy.data.objects
    for s in (1, -1):
        X = (1, 0, 0) if s < 0 else (-1, 0, 0)      # Leserichtung: an Backbord nach hinten lesbar von außen
        yo = s * (NY + 0.96)
        o = text('ELSTER' if s > 0 else 'EL 03', 0.3, (-7.0 if s > 0 else -9.4, yo + s * 0.01, NZ + 0.12), (-1, 0, 0) if s > 0 else (1, 0, 0), (0, 0, 1), M['txtw'], name='Name')
        if s > 0: emblem((-8.9, yo + 0.012, NZ - 0.05), (-1, 0, 0), (0, 0, 1), 0.22, M['txtw'])
        stencil('NICHT BETRETEN', 0.08, -8.2, s * 1.0, 1, (0, s, 0), target=W['Rumpf'])
        stencil('VORSICHT LASER', 0.07, 7.0, s * 0.75, -1, (1, 0, 0), 'txto', target=W['Rumpf'])
    stencil('EL 03', 0.32, 0.6, 0.0, 1, (1, 0, 0), target=W['Rumpf'])
    for s in (1, -1):
        for k, z in enumerate(POD[3]):
            text('ERZ %d' % (k + 1 + (0 if s > 0 else 2)), 0.12, (POD[1] - 1.9 + (0.25 if s > 0 else -0.25), s * (POD[2] + POD[4] + 0.045), z - 0.06), (-1, 0, 0) if s > 0 else (1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Kanisterschrift')

# =====================================================================================
# Bühnen (aus dem Würger), dazu Felsbrocken und Laserstrahl für die Abbau-Szene
# =====================================================================================
_view0 = view
def mining_scene():
    CUR[0] = C_STU
    # Felsbrocken: fein unterteilt, zweifach verformt, Erzadern und Gestein im Shader (Rauschen statt einzelner Dreiecke)
    rm = bpy.data.materials.new('Fels mit Erz'); rm.use_nodes = True; N = rm.node_tree.nodes; K = rm.node_tree.links
    bs = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); tc = N.new('ShaderNodeTexCoord')
    def nz(sc, det, rough=0.6, dist=0.0):
        q = N.new('ShaderNodeTexNoise'); q.inputs['Scale'].default_value = sc; q.inputs['Detail'].default_value = det; q.inputs['Roughness'].default_value = rough
        if 'Distortion' in q.inputs: q.inputs['Distortion'].default_value = dist
        K.new(tc.outputs['Object'], q.inputs['Vector']); return q.outputs[0]
    cr = N.new('ShaderNodeValToRGB'); E = cr.color_ramp.elements; E[0].position, E[0].color = 0.3, (0.035, 0.031, 0.028, 1); E[1].position, E[1].color = 0.75, (0.11, 0.098, 0.085, 1)
    K.new(nz(0.6, 10), cr.inputs[0])
    vr = N.new('ShaderNodeMapRange'); vr.inputs['From Min'].default_value = 0.47; vr.inputs['From Max'].default_value = 0.5; vr.inputs['To Min'].default_value = 1.0; vr.inputs['To Max'].default_value = 0.0
    ad = N.new('ShaderNodeMath'); ad.operation = 'ABSOLUTE'; sb = N.new('ShaderNodeMath'); sb.operation = 'SUBTRACT'; K.new(nz(0.35, 4, 0.5, 2.5), sb.inputs[0]); sb.inputs[1].default_value = 0.5
    K.new(sb.outputs[0], ad.inputs[0]); ad2 = N.new('ShaderNodeMath'); ad2.operation = 'ADD'; K.new(ad.outputs[0], ad2.inputs[0]); ad2.inputs[1].default_value = 0.47; K.new(ad2.outputs[0], vr.inputs['Value'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; K.new(vr.outputs[0], mx.inputs['Factor']); K.new(cr.outputs[0], mx.inputs[6]); mx.inputs[7].default_value = (0.55, 0.38, 0.12, 1)
    K.new(mx.outputs[2], bs.inputs['Base Color']); K.new(vr.outputs[0], bs.inputs['Metallic'])
    rr = N.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.88; rr.inputs['To Max'].default_value = 0.35; K.new(vr.outputs[0], rr.inputs['Value']); K.new(rr.outputs[0], bs.inputs['Roughness'])
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.6; bp.inputs['Distance'].default_value = 0.05; K.new(nz(3.0, 8), bp.inputs['Height']); K.new(bp.outputs[0], bs.inputs['Normal'])
    M['felsen'] = rm
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=6, radius=5.5); me = bpy.data.meshes.new('Felsbrocken'); bm.to_mesh(me); bm.free()
    me.materials.append(rm)
    for p in me.polygons: p.use_smooth = True
    rock = link(bpy.data.objects.new('Felsbrocken', me)); rock.location = (25.5, -1.2, 0.2); rock.scale = (1.25, 1.0, 0.82); rock.rotation_euler = (0.3, 0.5, 0.2)
    tx = bpy.data.textures.new('Felsform', 'CLOUDS'); tx.noise_scale = 1.4; tx.noise_depth = 3
    d = rock.modifiers.new('Form', 'DISPLACE'); d.texture = tx; d.strength = 2.4; d.mid_level = 0.5
    tx2 = bpy.data.textures.new('Felskanten', 'VORONOI'); tx2.noise_scale = 0.9
    d2 = rock.modifiers.new('Kanten', 'DISPLACE'); d2.texture = tx2; d2.strength = 0.7
    tx3 = bpy.data.textures.new('Felskorn', 'CLOUDS'); tx3.noise_scale = 0.25
    d3 = rock.modifiers.new('Korn', 'DISPLACE'); d3.texture = tx3; d3.strength = 0.18
    STAGE['rock'] = rock
    # Strahl: vom Emitter des Lasers in Laserrichtung bis zur Felsoberfläche
    th = -LASER_ROT; x0 = 8.3; zt = surf(x0, 0, -1)[0].z; piv = Vector((x0, 0, zt - 0.75))
    dvec = Vector((math.cos(th), 0, -math.sin(th))); a = piv + dvec * 2.05
    b = a + dvec * (20.4 - a.x) / dvec.x
    beam = pipe('Laserstrahl', [a, b], 0.06, M['strahl']); STAGE['beam'] = beam
    hot = sphere('Glutpunkt', 0.35, b.x + 0.1, b.y, b.z, M['strahl'], 12); STAGE['hot'] = hot
    pt = bpy.data.lights.new('Glutlicht', 'POINT'); pt.energy = 2500; pt.color = (1.0, 0.5, 0.2); pt.shadow_soft_size = 0.5
    po = bpy.data.objects.new('Glutlicht', pt); C_STU.objects.link(po); po.location = (b.x - 0.6, b.y, b.z + 0.3); STAGE['hotlight'] = po
    for k in range(14):      # gelöste Brocken im Strahlweg
        r = random.Random(k); s = r.uniform(0.12, 0.4)
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=s)
        for v in bm.verts: v.co *= r.uniform(0.75, 1.2)
        me2 = bpy.data.meshes.new('Brocken'); bm.to_mesh(me2); bm.free(); me2.materials.append(M['felsen'])
        ob = link(bpy.data.objects.new('Brocken', me2)); t = r.uniform(0.35, 0.95); p = a.lerp(b, t); ob.location = (p.x, p.y + r.uniform(-1.6, 1.6), p.z + r.uniform(-1.0, 1.4)); ob.rotation_euler = (r.random() * 3, r.random() * 3, r.random() * 3); ob.scale = (1, r.uniform(0.6, 1), r.uniform(0.5, 0.9))
        STAGE.setdefault('brocken', []).append(ob)
    cam('Abbau', (6.0, 15.0, 7.5), (14.0, -0.5, 1.8), 28)
    VIEWS['abbau'] = ('Abbau', 'weltraum', False, 0.2, 5.0)
def view(name, path, res=(1600, 900)):
    on = name == 'abbau'
    for k in ('rock', 'beam', 'hot', 'hotlight'): STAGE[k].hide_render = not on
    for o in STAGE.get('brocken', []): o.hide_render = not on
    for o in bpy.data.objects:      # Cockpitbild ohne spiegelndes Glas (sonst sieht man nur Spiegelungen)
        if o.name.startswith('Kanzelglas'): o.hide_render = name == 'cockpit'
    _view0(name, path, res)

# =====================================================================================
# Bauplan-Blatt: Linienzeichnung (Freestyle) in vier Ansichten, Raster, Kenndaten, Beschriftung mit Hinweislinien
# =====================================================================================
PLAN_W, PLAN_H = 2400, 1500
PLAN_FEAT = [  # Beschriftung, Punkt am Schiff (Blender), Versatz des Textes in Pixeln
    ('KANZEL', (8.4, 0.3, 5.3), (-60, -150)), ('LASERTURM', (10.2, 0.0, 1.3), (-150, 60)), ('FANGSTRAHLER', (9.6, -0.85, 1.9), (-180, -40)),
    ('EINSTIEG MIT LEITER', (4.5, 1.9, 1.6), (40, 150)), ('ERZKANISTER', (-0.4, 3.35, 3.4), (-40, 260)), ('GITTERRAHMEN', (-4.75, 3.45, 5.5), (-260, -110)),
    ('KÜHLRIPPEN', (-8.4, -1.1, 6.0), (150, -90)), ('TRIEBWERKE', (-11.9, 2.35, 3.15), (90, 150)), ('LANDEBEINE', (-8.4, 2.9, 0.3), (140, 60)),
    ('SENSORMAST', (-2.5, 0.0, 5.95), (-90, -140)), ('KÜHLLUFTEINLASS', (-4.85, 2.35, 3.6), (230, -40)),
]
PLAN_TXT = ['HERSTELLER: BASTION-WERFT, DECK 3', 'MODELL: ELSTER', 'KLASSE: PROSPEKTOR (BERGBAU)', 'BESATZUNG: 1', 'LÄNGE: 22,8 M', 'BREITE: 7,0 M', 'HÖHE: 6,3 M (MIT BEINEN)',
            'ERZ: 4 KANISTER JE 9 M³', 'BERGBAU: LASER MIT VIER FOKUSSPULEN', '2 FANGSTRAHLER', 'ANTRIEB: 2 HAUPTTRIEBWERKE', 'KENNUNG: EL 03']
def bauplan(path):
    import numpy as np, tempfile
    from bpy_extras.object_utils import world_to_camera_view
    W, H = PLAN_W, PLAN_H
    for o in list(C_HANGAR.all_objects) + STAGE.get('brocken', []): o.hide_render = True
    for k in ('planet', 'rock', 'beam', 'hot', 'hotlight'): STAGE[k].hide_render = True
    for o in C_GRAU.all_objects: o.hide_render = o.name.startswith('Boden')
    for o in C_GEAR.all_objects: o.hide_render = False
    STAGE['sun'].data.energy = 0.0; STAGE['fill'].data.energy = 0.0
    for o in bpy.data.objects:
        if o.type == 'LIGHT' and o.name not in ('Sonne', 'Gegenlicht'): o.hide_render = True
    w = STAGE['world']; nt = w.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    bg = nt.nodes.new('ShaderNodeBackground'); out = nt.nodes.new('ShaderNodeOutputWorld'); nt.links.new(bg.outputs[0], out.inputs[0]); bg.inputs['Color'].default_value = (1, 1, 1, 1); bg.inputs['Strength'].default_value = 1.0
    wm = bpy.data.materials.new('Bauplan weiss'); wm.use_nodes = True; pb = next(n for n in wm.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    pb.inputs['Base Color'].default_value = (0.95, 0.95, 0.95, 1); pb.inputs['Roughness'].default_value = 1.0
    for nm in ('Specular IOR Level', 'Specular'):
        if nm in pb.inputs: pb.inputs[nm].default_value = 0.0
    vl = bpy.context.view_layer; vl.material_override = wm
    R = SC.render; R.use_freestyle = True; R.line_thickness_mode = 'ABSOLUTE'; R.line_thickness = 1.25; R.film_transparent = True
    fs = vl.freestyle_settings; fs.crease_angle = math.radians(146)
    ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new('Linien')
    ls.select_by_visibility = True; ls.select_by_edge_types = True; ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('Bauplanlinie')
    ls.linestyle.color = (0.05, 0.05, 0.06); ls.linestyle.thickness = 1.25
    setp(SC.view_settings, 'view_transform', 'Standard'); setp(SC.view_settings, 'look', 'None'); SC.view_settings.exposure = -0.35
    SC.cycles.samples = 24
    tmp = tempfile.gettempdir()
    def shot(camn, rw, rh):
        SC.camera = CAMS[camn]; R.resolution_x, R.resolution_y = rw, rh; R.resolution_percentage = 100
        R.image_settings.file_format = 'PNG'; R.image_settings.color_mode = 'RGBA'
        p = os.path.join(tmp, 'els_plan_%s.png' % camn); R.filepath = p; bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(p); a = np.array(im.pixels[:], dtype=np.float32).reshape(rh, rw, 4)[::-1]; bpy.data.images.remove(im); return a
    # Kameras für die Ansichten (Mitte des Schiffs x −0,8)
    c = CAMS['Schraeg']; c.location = (21, 17, 9.0); c.rotation_euler = (Vector((-0.8, 0, 2.6)) - c.location).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = 35
    c = CAMS['Seite']; c.location = (-0.8, 60, 3.1); c.data.ortho_scale = 24.5
    c = CAMS['Draufsicht']; c.location = (-0.8, 0, 60); c.data.ortho_scale = 33.0
    c = CAMS['Front']; c.location = (60, 0, 3.1); c.data.ortho_scale = 11.8
    regions = {'Schraeg': (700, 150, 1660, 760), 'Seite': (40, 930, 1220, 540), 'Draufsicht': (1290, 930, 720, 540), 'Front': (2030, 930, 330, 540)}
    sheet = np.full((H, W, 3), 0.86, dtype=np.float32)
    for gx in range(0, W, 40): sheet[:, gx] *= 0.95
    for gy in range(0, H, 40): sheet[gy, :] *= 0.95
    shots = {}
    for camn, (rx, ry, rw, rh) in regions.items():
        img = shot(camn, rw, rh); shots[camn] = img; al = img[..., 3:4]
        sheet[ry:ry + rh, rx:rx + rw] = sheet[ry:ry + rh, rx:rx + rw] * (1 - al) + img[..., :3] * al
    # Beschriftung in eigener Szene: Text und Linien schwarz auf Weiß, Pixel als Einheit
    ts = bpy.data.scenes.new('Bauplantext'); ts.render.engine = 'CYCLES'; ts.cycles.samples = 8; ts.cycles.use_denoising = False
    setp(ts.view_settings, 'view_transform', 'Standard'); ts.render.resolution_x, ts.render.resolution_y = W, H; ts.render.resolution_percentage = 100
    ts.render.image_settings.file_format = 'PNG'; ts.render.image_settings.color_mode = 'RGB'
    tw = bpy.data.worlds.new('Bauplanwelt'); tw.use_nodes = True; ts.world = tw; tw.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
    blk = bpy.data.materials.new('Bauplan schwarz'); blk.use_nodes = True; bb = next(n for n in blk.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'); bb.inputs['Base Color'].default_value = (0.02, 0.02, 0.025, 1); bb.inputs['Roughness'].default_value = 1
    for nm in ('Specular IOR Level', 'Specular'):
        if nm in bb.inputs: bb.inputs[nm].default_value = 0.0
    cd = bpy.data.cameras.new('Bauplankamera'); cd.type = 'ORTHO'; cd.ortho_scale = W
    co = bpy.data.objects.new('Bauplankamera', cd); ts.collection.objects.link(co); co.location = (W / 2, H / 2, 100); ts.camera = co
    def T2(sx, sy): return Vector((sx, H - sy, 0))
    def txt(s, size, sx, sy, align='LEFT', bold=1.0):
        cu = bpy.data.curves.new('t', 'FONT'); cu.body = s; cu.size = size; cu.align_x = align; cu.offset = 0.0; cu.extrude = 0
        if bold > 1: cu.offset = size * 0.02
        cu.materials.append(blk); ob = bpy.data.objects.new('t', cu); ts.collection.objects.link(ob); ob.location = T2(sx, sy)
    def line(p, q, wdt=2.0):
        p, q = T2(*p), T2(*q); d = q - p; L = d.length
        if L < 1: return
        bm = bmesh.new(); n = Vector((-d.y, d.x, 0)).normalized() * wdt / 2
        bm.faces.new([bm.verts.new(v) for v in (p - n, q - n, q + n, p + n)]); me = bpy.data.meshes.new('l'); bm.to_mesh(me); bm.free(); me.materials.append(blk)
        ob = bpy.data.objects.new('l', me); ts.collection.objects.link(ob)
    def rect(x0, y0, x1, y1, wdt=2.0):
        for p, q in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))): line(p, q, wdt)
    rect(20, 20, W - 20, H - 20, 3); line((20, 120), (W - 20, 120), 3); line((40, 900), (W - 40, 900), 1.5)
    txt('ELSTER', 64, 40, 98); txt('PROSPEKTOR · EIGENER ENTWURF DER BASTION', 24, 330, 92)
    txt('BAUPLAN BL-0307', 22, W - 40, 70, 'RIGHT'); txt('BLATT 1 / 1 · MASSE IN METERN', 18, W - 40, 100, 'RIGHT')
    for i, s_ in enumerate(PLAN_TXT): txt(s_, 24, 44, 200 + i * 40)
    line((40, 690), (640, 690), 1.5); txt('Einsitziges Bergbauschiff für Felsfelder und Monde.', 19, 44, 730)
    txt('Laser unter dem Kinn, vier Erzkanister im Gitterrahmen,', 19, 44, 760); txt('große Kanzel mit Kinnfenster für den Blick auf den Fels.', 19, 44, 790)
    for lab, (rx, ry, rw, rh) in (('SCHRÄGANSICHT', regions['Schraeg']), ('SEITENANSICHT (BACKBORD)', regions['Seite']), ('DRAUFSICHT', regions['Draufsicht']), ('VORNE', regions['Front'])):
        txt(lab, 20, rx + 8, ry + rh - 4 if lab != 'SCHRÄGANSICHT' else ry + 26)
    # Hinweislinien in der Schrägansicht
    rx, ry, rw, rh = regions['Schraeg']; SC.render.resolution_x, SC.render.resolution_y = rw, rh
    for lab, p3, (dx, dy) in PLAN_FEAT:
        v = world_to_camera_view(SC, CAMS['Schraeg'], Vector(p3)); px, py = rx + v.x * rw, ry + (1 - v.y) * rh
        tx, ty = px + dx, py + dy
        line((px, py), (tx, ty), 1.6); line((tx - 4, ty), (tx + 4, ty), 1.6)
        bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=12, radius=4, matrix=Matrix.Translation(T2(px, py))); me = bpy.data.meshes.new('p'); bm.to_mesh(me); bm.free(); me.materials.append(blk); ob = bpy.data.objects.new('p', me); ts.collection.objects.link(ob)
        txt(lab, 20, tx + (8 if dx >= 0 else -8), ty - 8, 'LEFT' if dx >= 0 else 'RIGHT')
    # Maßlinien: Länge unter der Seitenansicht, Breite neben der Draufsicht
    rx, ry, rw, rh = regions['Seite']; px0 = rx + rw / 2 + (-12.2 + 0.8) / 24.5 * rw; px1 = rx + rw / 2 + (10.61 + 0.8) / 24.5 * rw; yy = ry + rh - 40
    line((px0, yy), (px1, yy), 1.5); line((px0, yy - 10), (px0, yy + 10), 1.5); line((px1, yy - 10), (px1, yy + 10), 1.5); txt('22,8 M', 20, (px0 + px1) / 2, yy - 10, 'CENTER')
    tp = os.path.join(tmp, 'els_plan_text.png'); ts.render.filepath = tp; bpy.ops.render.render(write_still=True, scene=ts.name)
    im = bpy.data.images.load(tp); tx_ = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)[::-1, :, :3]; bpy.data.images.remove(im)
    sheet = sheet * np.clip(tx_, 0, 1)
    rgba = np.ones((H, W, 4), dtype=np.float32); rgba[..., :3] = sheet; o = bpy.data.images.new('Bauplan', W, H); o.pixels = rgba[::-1].ravel()
    o.filepath_raw = path; o.file_format = 'JPEG'; o.save()

def build():
    global BVH
    body = build_body(); nl, nr = build_nacelle(1), build_nacelle(-1)
    BVH = make_bvh([body, nl, nr])
    dead = [f for f in body.faces if f.normal.z > 0.2 and all(6.3 < v.co.x < 10.2 and abs(v.co.y) < canopy_half(v.co.x) - 0.08 for v in f.verts)]
    bmesh.ops.delete(body, geom=dead, context='FACES')
    nb = 0
    for bm, name, colour in ((body, 'Rumpf', body_colour), (nl, 'Gondel links', nacelle_colour), (nr, 'Gondel rechts', nacelle_colour)):
        ob, n = finish_part(bm, name, colour, 0.0, 0.4); nb += n
    canopy(); cockpit(); engines(); radiators(); laser_turret(); ore_pods()
    for s in (1, -1):
        leg('Bein vorn', 6.0, s * 1.0, 0.75); leg('Bein hinten', -8.4, s * NY, 0.55)
    door_ladder(); details(); wear_details(); markings(); stages(); world('grau'); mining_scene()
    # Figuren an die Leiter, Kameras auf die Elster
    for nm, loc, yaw in (('Figur Studio', (6.4, 3.4, 0), -2.2), ('Figur Pilot', (5.6, 3.4, 0), -2.4), ('Figur Techniker', (6.6, 2.4, 0), 2.6)):
        if nm in bpy.data.objects: o = bpy.data.objects[nm]; o.location = loc; o.rotation_euler = (0, 0, yaw)
    for nm, loc, tgt, lens in (('Schraeg', (21, 17, 9.5), (-0.5, 0, 3.0), 45), ('Hangar', (18, 13, 5.5), (-0.5, 0.8, 2.8), 30), ('Heck', (-20, -14, 7), (-5, 0, 3.2), 40),
                               ('Cockpit', (8.9, 1.25, 6.5), (7.7, -0.1, 3.4), 24), ('Detail', (3.5, 8.5, 6.5), (-1.6, 2.4, 3.6), 35), ('Weltraum', (22, -15, 9), (-0.5, 0, 3.0), 45)):
        c = CAMS[nm]; c.location = loc; c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lens
    CAMS['Seite'].location = (0, 60, 3.0); CAMS['Front'].location = (60, 0, 3.0); CAMS['Front'].data.ortho_scale = 16; CAMS['Seite'].data.ortho_scale = 26
    CAMS['Draufsicht'].data.ortho_scale = 45; CAMS['Draufsicht'].location = (-0.8, 0, 60)
    return {'schrauben': nb}
if not globals().get('NUR_HELFER_ELSTER'):
    result = build()
