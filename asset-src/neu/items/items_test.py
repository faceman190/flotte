# Drei hoch aufgelöste Gegenstände als Maßstab für den Zielstil: Kühler, Helm, Rüstung.
# Braucht items_lib.py und items_build.py (Kleinteile). Eigene Entwürfe mit eigenen Zeichen (Hersteller „Frostwerk“, Flottenzeichen).
# Die Rüstung nutzt das Körpernetz 'char1' (Sammlung „koerper_quelle“ in Items.blend, aus asset-src/neu/figuren/mechaniker_meshy.glb).

# ---------------------------------------------------------------- Kühler ----------------------------------------------------------------
@item('sy_kuehler', 1)
def _(A):
    blue = pbr('kuehlerlack', (0.03, 0.115, 0.36), 0.0, 0.36, wear=0.9, coat=0.35)
    blk = BLACK(); gun = GUN(); red = pbr('leitung', (0.35, 0.02, 0.015), 0.0, 0.5, wear=0.0)
    # Grundkörper, Kufen, Füße, Eckprofile
    box(1.7, 0.7, 0.3, (0, 0, -0.14), gun, bevel=0.02); box(1.62, 0.66, 0.2, (0, 0, 0.1), blk, bevel=0.02)
    for s in (-1, 1):
        box(1.76, 0.09, 0.07, (0, 0.27 * s, -0.31), blk, bevel=0.015)
        for x in (-0.72, -0.24, 0.24, 0.72): box(0.13, 0.1, 0.03, (x, 0.27 * s, -0.357), RUBBER(), bevel=0.008)
    for x in (-0.845, 0.845):
        box(0.05, 0.72, 0.56, (x, 0, -0.02), gun, bevel=0.012)
        bolts([(x, -0.361, z) for z in (-0.2, 0.0, 0.2)], r=0.014)
    # blaue Haube mit sieben Kühlrippen, vordere Leiste
    box(1.1, 0.6, 0.06, (0.27, 0.02, 0.23), blue, bevel=0.015)
    for i in range(7):
        prism([(-0.28, 0.0), (0.27, 0.0), (0.27, 0.105), (-0.02, 0.105), (-0.28, 0.022)], 0.055, (-0.19 + 0.153 * i, 0.03, 0.258), blue, rot=(0, 0, 90), bevel=0.008)
        box(0.03, 0.03, 0.012, (-0.19 + 0.153 * i, 0.27, 0.366), blk, bevel=0.003)
    for i in range(6): box(0.07, 0.3, 0.012, (-0.113 + 0.153 * i, 0.12, 0.264), blk, bevel=0.003)          # dunkle Schlitze zwischen den Rippen
    box(1.1, 0.07, 0.13, (0.27, -0.312, 0.2), blue, bevel=0.015)
    bolts([(-0.24 + 0.17 * i, -0.3, 0.266) for i in range(7)], rot=(0, 0, 0), r=0.014)
    box(0.52, 0.07, 0.03, (0.12, -0.2, 0.268), blk, bevel=0.008); tube([(-0.24, -0.245, 0.272), (0.1, -0.238, 0.278), (0.5, -0.244, 0.274), (0.8, -0.24, 0.27)], 0.008, red)
    for x in (-0.2, 0.3, 0.76): box(0.04, 0.03, 0.02, (x, -0.243, 0.272), gun, bevel=0.004)
    # linker Block: zwei Wartungsklappen, Lüfter, Griff
    box(0.54, 0.66, 0.2, (-0.56, 0, 0.26), blk, bevel=0.025)
    for i in range(2):
        x = -0.69 + 0.25 * i
        box(0.21, 0.27, 0.014, (x, -0.15, 0.366), gun, bevel=0.006); box(0.15, 0.2, 0.01, (x, -0.15, 0.374), blk, bevel=0.004)
        bolts([(x + 0.085 * sx, -0.15 + 0.115 * sy, 0.374) for sx in (-1, 1) for sy in (-1, 1)], rot=(0, 0, 0), r=0.011)
        cyl(0.018, 0.012, (x, -0.06, 0.382), STEEL(), seg=6)
    vent(0.42, 0.16, (-0.56, 0.2, 0.362), rot=(-90, 0, 0), n=8); handle(0.2, 0.05, (-0.56, 0.02, 0.366), rot=(-90, 0, 0), r=0.012)
    # Vorderseite: Lochblech, zwölf Anschlüsse, sechs Schlauchbögen
    box(1.12, 0.02, 0.38, (0.26, -0.345, -0.03), STEEL(), bevel=0.004)
    for r in range(5):
        for c in range(25): cyl(0.0105, 0.012, (-0.27 + 0.044 * c + (0.022 if r % 2 else 0), -0.356, 0.125 - 0.075 * r), blk, rot=(90, 0, 0), seg=8)
    def port(x, z):
        cyl(0.072, 0.026, (x, -0.362, z), STEEL(), rot=(90, 0, 0), seg=6); cyl(0.052, 0.05, (x, -0.385, z), ALU(), rot=(90, 0, 0), seg=28); torus(0.052, 0.006, (x, -0.4, z), gun, rot=(90, 0, 0), seg=28, sseg=6)
    for i in range(6):
        x = -0.2 + 0.19 * i
        port(x, 0.095); port(x + 0.095, -0.165)
        hose([(x, -0.4, 0.095), (x, -0.52, 0.07), (x + 0.05, -0.575, -0.035), (x + 0.095, -0.52, -0.14), (x + 0.095, -0.4, -0.165)], 0.04)
        box(0.012, 0.012, 0.2, (x + 0.142, -0.35, -0.03), gun, bevel=0.002)
    # blaues Modul links vorn mit Herstellerzeichen, zwei Stutzen an der Stirnseite
    box(0.3, 0.1, 0.36, (-0.665, -0.37, -0.05), blue, bevel=0.02)
    bolts([(-0.665 + 0.125 * sx, -0.421, -0.05 + 0.155 * sz) for sx in (-1, 1) for sz in (-1, 1)], r=0.012)
    box(0.2, 0.02, 0.05, (-0.665, -0.415, 0.16), blk, bevel=0.006)
    for z in (0.03, -0.13):
        cyl(0.075, 0.03, (-0.875, -0.2, z), STEEL(), rot=(0, 90, 0), seg=6); cyl(0.056, 0.12, (-0.93, -0.2, z), ALU(), rot=(0, 90, 0), seg=28)
        cyl(0.042, 0.124, (-0.932, -0.2, z), blk, rot=(0, 90, 0), seg=20); torus(0.056, 0.007, (-0.985, -0.2, z), anod(A), rot=(0, 90, 0), seg=28, sseg=6)
    # rechte Stirnseite: Platte mit zwei großen Rohrstutzen
    box(0.07, 0.6, 0.42, (0.885, 0, -0.03), gun, bevel=0.012)
    for y in (-0.15, 0.15):
        cyl(0.1, 0.03, (0.93, y, -0.03), STEEL(), rot=(0, 90, 0), seg=8); cyl(0.082, 0.16, (0.99, y, -0.03), ALU(), rot=(0, 90, 0), seg=32); cyl(0.064, 0.164, (0.992, y, -0.03), blk, rot=(0, 90, 0), seg=24)
        torus(0.082, 0.008, (1.06, y, -0.03), anod(A), rot=(0, 90, 0), seg=32, sseg=6); ring_of(6, 0.088, lambda u, v, a, y=y: bolt((0.947, y + u, -0.03 + v), rot=(0, 90, 0), r=0.01))
    bolts([(0.922, 0.26 * sy, -0.03 + 0.17 * sz) for sy in (-1, 1) for sz in (-1, 1)], rot=(0, 90, 0), r=0.014)
    # Rückseite oben: Kabelkanal
    box(1.5, 0.05, 0.05, (0.05, 0.31, 0.24), gun, bevel=0.01)
    # Beschriftung
    decal('marke_dunkel', 0.52, (0.27, -0.348, 0.205)); decal('logo_dunkel', 0.2, (-0.665, -0.421, -0.06)); decal('typ', 0.3, (-0.56, -0.331, 0.3))
    decal('schild', 0.15, (-0.4, -0.351, -0.19)); decal('kreis_a', 0.13, (-0.37, -0.351, -0.06)); decal('heiss', 0.15, (-0.385, -0.351, 0.06))
    decal('streifen', 0.56, (0.02, -0.351, -0.255)); decal('streifen', 0.56, (0.56, -0.351, -0.255))
    decal('klein', 0.3, (-0.56, 0.05, 0.3665), rot=(-90, 0, 0)); decal('pfeile', 0.1, (-0.69, -0.24, 0.3745), rot=(-90, 0, 0)); decal('pfeile', 0.1, (-0.44, -0.24, 0.3745), rot=(-90, 0, 0))
    decal('warn', 0.09, (0.921, 0.0, 0.11), rot=(0, 0, 90)); decal('strich', 0.14, (0.921, 0.0, -0.17), rot=(0, 0, 90)); decal('druck', 0.16, (0.72, -0.2, 0.2615), rot=(-90, 0, 0))

# ---------------------------------------------------------------- Helm ----------------------------------------------------------------
@item('helm_sturm', 2)
def _(A):
    SC = (0.93, 1.08, 1.0)
    lack = pbr('helmlack', (0.011, 0.012, 0.015), 0.0, 0.2, wear=0.55, wear_col=(0.22, 0.22, 0.24), dirt=0.4, coat=0.9)
    weiss = pbr('helmweiss', (0.42, 0.43, 0.44), 0.0, 0.28, wear=0.7, wear_col=(0.04, 0.04, 0.05), dirt=0.7, coat=0.7)
    matt = pbr('helmmatt', (0.026, 0.028, 0.032), 0.0, 0.58, wear=0.7)
    visor = pbr('helmvisier', (0.05, 0.06, 0.085), 1.0, 0.05, wear=0.0, dirt=0.0, coat=1.0, bevel=0.003)
    def ball(r, m): return sph(r, (0, 0, 0.05), m, scale=SC, seg=80)
    def cutter(sx, sy, sz, loc, bevel=0.0, seg=1, rot=(0, 0, 0)): return box(sx, sy, sz, loc, BLACK(), rot=rot, bevel=bevel, seg=seg)
    vis = cutter(0.84, 0.6, 0.31, (0, -0.42, 0.125), 0.13, 5)
    hals = cyl(0.39, 0.6, (0, 0.02, -0.6), BLACK(), seg=48)
    # Schale mit Sichtöffnung, dahinter das verspiegelte Visier
    s = ball(0.5, lack); shell(s, 0.035); cut(s, vis); cut(s, hals)
    ball(0.468, visor)
    # Rahmen um die Sichtöffnung
    r = ball(0.512, matt); shell(r, 0.02); keep(r, cutter(0.93, 0.6, 0.4, (0, -0.42, 0.125), 0.16, 5)); cut(r, vis)
    # Kinnschutz mit Atemschlitzen
    k = ball(0.524, matt); shell(k, 0.03); keep(k, cutter(0.74, 0.5, 0.3, (0, -0.42, -0.21), 0.08, 3)); cut(k, hals)
    for sx in (-1, 1):
        for i in range(4): cut(k, cutter(0.15, 0.3, 0.016, (0.19 * sx, -0.5, -0.13 - 0.04 * i)))
    box(0.14, 0.06, 0.1, (0, -0.565, -0.2), GUN(), bevel=0.02); cyl(0.035, 0.04, (0, -0.6, -0.2), ALU(), rot=(90, 0, 0), seg=20); cyl(0.024, 0.044, (0, -0.602, -0.2), BLACK(), rot=(90, 0, 0), seg=16)
    # aufgemalte Streifen über den Scheitel
    for (x, w) in ((0, 0.12), (-0.125, 0.028), (0.125, 0.028)):
        st = ball(0.5012, weiss); shell(st, 0.004); keep(st, cutter(w, 1.5, 0.84, (x, 0, 0.44))); cut(st, vis)
    # Kamm, Wangenplatten, Hinterkopfplatte mit Lüftungsschlitzen
    ka = ball(0.516, matt); shell(ka, 0.022); keep(ka, cutter(0.06, 0.62, 0.5, (0, 0.2, 0.42), 0.02))
    for sx in (-1, 1):
        w = ball(0.515, matt); shell(w, 0.024); keep(w, cutter(0.3, 0.44, 0.3, (0.43 * sx, 0.0, -0.13), 0.07, 3)); cut(w, hals)
    b = ball(0.516, matt); shell(b, 0.024); keep(b, cutter(0.46, 0.4, 0.27, (0, 0.44, -0.07), 0.07, 3))
    for i in range(5): cut(b, cutter(0.3, 0.3, 0.014, (0, 0.5, 0.02 - 0.04 * i)))
    # Ohrmodule
    for sx in (-1, 1):
        with grp((0.468 * sx, 0.03, -0.06), (0, 90 * sx, 0)):
            cyl(0.15, 0.05, (0, 0, 0), GUN(), seg=48, bevel=0.01); knurl(0.12, 0.04, (0, 0, 0.035), BLACK(), n=3); cyl(0.07, 0.03, (0, 0, 0.06), GUN(), seg=6)
            torus(0.15, 0.007, (0, 0, 0.022), anod(A), seg=48, sseg=6); ring_of(6, 0.135, lambda u, v, a: bolt((u, v, 0.028), rot=(0, 0, 0), r=0.009))
    cyl(0.007, 0.34, (-0.5, 0.13, 0.2), STEEL(), seg=8); cyl(0.014, 0.05, (-0.5, 0.13, 0.05), BLACK(), seg=10)
    # Sensoren an den Schläfen
    for sx in (-1, 1):
        box(0.09, 0.07, 0.055, (0.33 * sx, -0.4, 0.37), GUN(), rot=(-20, 0, 18 * sx), bevel=0.012); cyl(0.02, 0.02, (0.345 * sx, -0.435, 0.36), lens((0.2, 0.4, 0.6)), rot=(70, 0, 18 * sx), seg=14)
    # Halsring, Dichtung, zwei Luftschläuche
    cyl(0.405, 0.06, (0, 0.02, -0.33), GUN(), seg=72); torus(0.405, 0.01, (0, 0.02, -0.3), anod(A), seg=72, sseg=6); ring_of(14, 0.405, lambda u, v, a: bolt((u, 0.02 + v, -0.33), rot=(90, 0, a - 90), r=0.01))
    for i, rr in enumerate((0.38, 0.365, 0.35)): torus(rr, 0.022, (0, 0.02, -0.39 - 0.04 * i), RUBBER(), seg=64, sseg=8)
    cyl(0.33, 0.14, (0, 0.02, -0.44), BLACK(), seg=48)
    for sx in (-1, 1):
        cyl(0.05, 0.06, (0.15 * sx, 0.5, -0.2), ALU(), rot=(60, 0, 0), seg=20); cyl(0.062, 0.02, (0.15 * sx, 0.485, -0.19), STEEL(), rot=(60, 0, 0), seg=6)
        pts = [(0.15 * sx, 0.52, -0.22), (0.19 * sx, 0.6, -0.36), (0.24 * sx, 0.5, -0.52)]
        hose(pts, 0.036)
        for j in range(7):
            f = (j + 1) / 8.0; a = Vector(pts[0]).lerp(Vector(pts[1]), min(1, f * 2)) if f < 0.5 else Vector(pts[1]).lerp(Vector(pts[2]), (f - 0.5) * 2)
            torus(0.039, 0.006, tuple(a), RUBBER(), rot=(60 - 70 * f, 0, 0), seg=20, sseg=6)
    # Beschriftung auf der Schale
    def on(n):
        v = Vector(n).normalized(); return (0.502 * SC[0] * v.x, 0.502 * SC[1] * v.y, 0.05 + 0.502 * v.z), (v.x / SC[0], v.y / SC[1], v.z)
    p, n = on((0.8, -0.34, 0.5)); decal('flotte', 0.12, p, normal=n, lift=0.006)
    p, n = on((-0.78, -0.3, 0.55)); decal('ziffer', 0.15, p, normal=n, lift=0.007)
    p, n = on((0.72, 0.62, 0.3)); decal('crew', 0.2, p, normal=n, lift=0.009)
    p, n = on((-0.6, 0.72, 0.34)); decal('groesse', 0.12, p, normal=n, lift=0.006)
    decal('sauerstoff', 0.11, (0, 0.585, -0.165), rot=(8, 0, 180))

# ---------------------------------------------------------------- Rüstung ----------------------------------------------------------------
# Platten sind saubere Flächen (Gitter oder Manschetten), die sich an das Körpernetz anschmiegen (Shrinkwrap) und dann Wandstärke bekommen.
def _wrap(ob, target, m, t=0.024, gap=0.012, smooth=6):
    ob.data.materials.append(m)
    for pl in ob.data.polygons: pl.use_smooth = True
    sw = ob.modifiers.new('anschmiegen', 'SHRINKWRAP'); sw.target = target; sw.wrap_method = 'NEAREST_SURFACEPOINT'; sw.wrap_mode = 'ABOVE_SURFACE'; sw.offset = gap + t / 2
    if smooth: sm = ob.modifiers.new('glatt', 'SMOOTH'); sm.factor = 0.6; sm.iterations = smooth
    so = ob.modifiers.new('wand', 'SOLIDIFY'); so.thickness = t; so.offset = 0
    bv = ob.modifiers.new('fase', 'BEVEL'); bv.width = min(0.006, t * 0.3); bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(50)
    return ob
def patch(target, m, center, normal, w, h, t=0.024, gap=0.012, k=0.55, nu=20, nv=16, up=(0, 0, 1), smooth=6):
    # Gitterfläche mit runden Ecken, senkrecht zu normal vor den Körper gestellt, dann angeschmiegt
    n = Vector(normal).normalized(); u_ = Vector(up); za = (u_ - n * u_.dot(n)).normalized(); xa = za.cross(n).normalized(); c = Vector(center)
    bm = bmesh.new(); g = []
    for j in range(nv + 1):
        row = []
        for i in range(nu + 1):
            u = -1 + 2 * i / nu; v = -1 + 2 * j / nv
            x = u * math.sqrt(max(0.0, 1 - k * v * v / 2)); z = v * math.sqrt(max(0.0, 1 - k * u * u / 2))
            row.append(bm.verts.new(c + xa * (x * w / 2) + za * (z * h / 2)))
        g.append(row)
    for j in range(nv):
        for i in range(nu): bm.faces.new((g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]))
    me = bpy.data.meshes.new('platte'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('platte', me); COL.objects.link(ob)
    return _wrap(ob, target, m, t, gap, smooth)
def sleeve(target, m, p, q, f0, f1, r, t=0.024, gap=0.012, face=None, arc=360, seg=28, rings=8, tip=0.0, smooth=6):
    # Manschette um die Strecke p→q (Anteil f0 bis f1); face = Richtung der Mitte, arc = Winkelbreite; tip verlängert die Mitte (spitze Form)
    p, q = Vector(p), Vector(q); d = (q - p).normalized(); f = Vector((0, -1, 0)); f = (f - d * f.dot(d)).normalized(); sd = d.cross(f)
    a0 = math.atan2(Vector(face).dot(sd), Vector(face).dot(f)) if face is not None else 0.0
    full = arc >= 360; n = seg if full else seg + 1; L = (q - p).length
    bm = bmesh.new(); g = []
    for j in range(rings + 1):
        row = []
        for i in range(n):
            a = a0 + math.radians(arc) * (i / seg - 0.5); w = math.cos((i / seg - 0.5) * math.pi) if not full else math.cos(a - a0)
            ff = f0 + (f1 - f0) * j / rings + (tip / L) * w * (-1 if j < rings / 2 else 1) * abs(1 - 2 * j / rings)
            row.append(bm.verts.new(p + d * (L * ff) + (f * math.cos(a) + sd * math.sin(a)) * r))
        g.append(row)
    for j in range(rings):
        for i in range(seg if full else seg):
            bm.faces.new((g[j][i], g[j][(i + 1) % n], g[j + 1][(i + 1) % n], g[j + 1][i]))
    me = bpy.data.meshes.new('manschette'); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new('manschette', me); COL.objects.link(ob)
    return _wrap(ob, target, m, t, gap, smooth)
def dome(m, loc, r, h, scale=(1, 1, 1), rot=(0, 0, 0), t=0.02):
    # gewölbte Kappe (Schulter, Knie): Schale mit Wandstärke
    prof = [(r * math.cos(a), h * math.sin(a)) for a in (math.radians(8 + 82 * i / 9) for i in range(10))]
    ob = lathe(prof + [(0.0, h)], loc, m, rot=rot, seg=40); ob.scale = scale
    # Boden- und Deckfläche des Drehkörpers entfernen wäre sauberer; die Kappe sitzt auf dem Körper, die Unterseite sieht man nicht
    return ob

@item('anzug_sturm', 2)
def _(A):
    me = mesh_from('char1')
    under = pbr('unterzeug', (0.014, 0.015, 0.018), 0.0, 0.66, wear=0.0, dirt=0.9, bevel=0.006)
    rot_ = pbr('ruestrot', (0.2, 0.014, 0.011), 0.0, 0.44, wear=1.0, wear_col=(0.32, 0.32, 0.34), dirt=0.9, coat=0.15, bevel=0.004)
    dkl = pbr('ruestdunkel', (0.024, 0.025, 0.029), 0.4, 0.46, wear=1.0, wear_col=(0.32, 0.32, 0.34), dirt=0.8, bevel=0.004)
    L = dict(arm=(0.219, 0.036, 1.428), fore=(0.326, 0.028, 1.232), hand=(0.48, -0.039, 1.055), up=(0.107, -0.013, 0.934), leg=(0.157, -0.052, 0.564), foot=(0.191, -0.007, 0.161))
    mir = lambda p, s: (p[0] * s, p[1], p[2])
    T, G = 0.014, 0.005          # Wandstärke und Abstand der Platten zum Unterzeug
    # Körper ohne Kopf als Unterzeug
    kopf = box(0.7, 0.7, 0.6, (0, 0, 1.845), BLACK(), bevel=0)
    body = bpy.data.objects.new('koerper', me); COL.objects.link(body); me.materials.append(under)
    for pl in me.polygons: pl.use_smooth = True
    md = body.modifiers.new('ohne_kopf', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = kopf; md.solver = 'FLOAT'; kopf.hide_render = True
    bake(body); bpy.data.objects.remove(kopf, do_unlink=True)
    P = lambda m, c, n, w, h, t=T, gap=G, k=0.6, nu=16, nv=12, sm=3: patch(body, m, c, n, w, h, t=t, gap=gap, k=k, nu=nu, nv=nv, smooth=sm)
    S = lambda m, a, b, f0, f1, r, face=None, arc=360, tip=0.0, t=T, gap=G: sleeve(body, m, a, b, f0, f1, r, t=t, gap=gap, face=face, arc=arc, tip=tip, smooth=3)
    # ----- Brust: zwei Brustplatten, Brustbein, Rippenplatten, drei Bauchschienen, Schlüsselbeinplatten -----
    brust = P(rot_, (0, -0.45, 1.375), (0, -1, 0), 0.42, 0.17, t=0.02, gap=0.022, k=0.75, nu=24, nv=12, sm=14)
    for s in (-1, 1):
        P(rot_, (0.105 * s, -0.45, 1.25), (0, -1, 0), 0.19, 0.08, gap=0.012, k=0.45, nv=8, sm=10)
        P(dkl, (0.12 * s, -0.4, 1.475), (0.1 * s, -1, 0.7), 0.14, 0.07, k=0.6, nu=10, nv=6)
        P(dkl, (0.5 * s, 0.0, 1.22), (s, 0, 0), 0.16, 0.22, k=0.6, nu=10, nv=12)                       # Flanke
        P(dkl, (0.1 * s, 0.45, 1.36), (0, 1, 0), 0.19, 0.2, t=0.018)                                    # Schulterblatt
    P(dkl, (0, -0.45, 1.375), (0, -1, 0), 0.05, 0.15, gap=0.044, k=0.3, nu=4, nv=10, sm=14)
    for z, w in ((1.165, 0.33), (1.095, 0.3), (1.03, 0.27)): P(dkl, (0, -0.45, z), (0, -1, 0), w, 0.06, k=0.3, nu=18, nv=5)
    for z, w in ((1.2, 0.3), (1.13, 0.28), (1.06, 0.26)): P(dkl, (0, 0.45, z), (0, 1, 0), w, 0.06, k=0.3, nu=18, nv=5)
    S(dkl, (0, 0, 0.955), (0, 0, 1.01), 0, 1, 0.26, t=0.018)                                            # Gürtel
    P(dkl, (0, -0.45, 0.89), (0, -1, 0), 0.15, 0.15, k=0.8, nu=10, nv=10)                               # Schritt
    for s in (-1, 1):
        A_, F_, H_, U_, K_, T_ = (mir(L[k], s) for k in ('arm', 'fore', 'hand', 'up', 'leg', 'foot'))
        out = (s, 0, 0.2)
        # Schulter: flache Kappe mit Randleiste, darunter zwei Schienen; Oberarmplatte, Ellbogenkappe, Unterarmschiene
        sch = dome(rot_, (0.243 * s, 0.03, 1.43), 0.118, 0.07, scale=(1.0, 1.2, 1.0), rot=(0, 34 * s, 0))
        tr = torus(0.118, 0.008, (0.243 * s, 0.03, 1.432), dkl, rot=(0, 34 * s, 0), seg=40, sseg=6); tr.scale = (1.0, 1.2, 1.0)
        S(rot_, A_, F_, 0.1, 0.34, 0.1, face=out, arc=210, tip=0.02)
        S(dkl, A_, F_, 0.38, 0.62, 0.095, face=out, arc=200, tip=0.02)
        S(dkl, A_, F_, 0.68, 0.9, 0.09, face=out, arc=170)
        dome(dkl, (F_[0] + 0.045 * s, F_[1] + 0.035, F_[2] - 0.01), 0.05, 0.03, rot=(-70, 60 * s, 0))
        S(rot_, F_, H_, 0.12, 0.84, 0.08, face=(s, 0.4, 0), arc=230, tip=0.03)
        S(dkl, F_, H_, 0.78, 0.9, 0.075, t=0.01)                                                        # Handgelenkring
        P(dkl, (H_[0] + 0.25 * s, H_[1] - 0.04, H_[2] - 0.055), (s, -0.2, 0.15), 0.075, 0.085, t=0.01, k=0.8, nu=8, nv=8)
        # Hüfte, Oberschenkel vorn und außen, Knie, Schienbein, Wade, Stiefelkappe
        P(rot_, (0.2 * s, -0.42, 0.865), (0.45 * s, -1, 0), 0.15, 0.17, k=0.7, nu=12, nv=12)
        P(dkl, (0.5 * s, 0.02, 0.9), (s, 0, 0), 0.16, 0.16, k=0.7, nu=10, nv=10)
        S(rot_, U_, K_, 0.32, 0.8, 0.13, face=(0.25 * s, -1, 0), arc=150, tip=0.04)
        S(dkl, U_, K_, 0.3, 0.74, 0.13, face=(s, 0.25, 0), arc=110, tip=0.02)
        dome(dkl, (K_[0], K_[1] - 0.062, K_[2] + 0.005), 0.062, 0.04, scale=(1.0, 1.0, 1.2), rot=(90, 0, 0))
        S(dkl, U_, K_, 0.84, 0.94, 0.11, face=(0.1 * s, -1, 0), arc=170)
        S(rot_, K_, T_, 0.15, 0.86, 0.105, face=(0.15 * s, -1, 0), arc=190, tip=0.045)
        S(dkl, K_, T_, 0.2, 0.7, 0.11, face=(0, 1, 0), arc=130, tip=0.02)
        P(dkl, (T_[0] + 0.012 * s, -0.4, 0.07), (0, -1, 0.5), 0.11, 0.09, k=0.8, nu=8, nv=8)
        if s > 0: stick('ziffer', 0.06, sch, (0.8, 0.02, 1.52), (-1, 0, -0.12))
        else: stick('flotte', 0.055, sch, (-0.8, 0.02, 1.52), (1, 0, -0.12))
        # Riemen mit Schnallen an Unterarm, Oberschenkel und Schienbein
        for (a, b, fr, rr) in ((F_, H_, 0.3, 0.07), (F_, H_, 0.7, 0.06), (U_, K_, 0.45, 0.12), (K_, T_, 0.36, 0.09), (K_, T_, 0.72, 0.075)):
            S(under, a, b, fr - 0.025, fr + 0.025, rr, t=0.006, gap=0.002)
            c = Vector(a).lerp(Vector(b), fr); box(0.026, 0.026, 0.034, (c.x + rr * s * 0.92, c.y + 0.02, c.z), GUN(), bevel=0.005)
    # ----- Brustgerät, Halsring, Tornister, Schläuche, Taschen -----
    stick('flotte', 0.06, brust, (0.12, -1, 1.385), (0, 1, 0)); stick('crew', 0.1, brust, (-0.11, -1, 1.385), (0, 1, 0))
    with grp((0, -0.236, 1.25)):
        box(0.12, 0.05, 0.075, (0, 0, 0), GUN(), bevel=0.012); box(0.08, 0.008, 0.03, (0, -0.026, 0.012), screen((0.1, 0.5, 0.4), 0.8), bevel=0)
        for i in range(3): cyl(0.005, 0.006, (-0.026 + 0.026 * i, -0.027, -0.02), led((0.2, 1, 0.4) if i else (1, 0.4, 0.1), 4), rot=(90, 0, 0), seg=8)
        conn((0.075, -0.006, 0.0), rot=(0, 0, 90), r=0.015, a=anod(A)); conn((-0.075, -0.006, 0.0), rot=(0, 0, -90), r=0.015)
    torus(0.11, 0.016, (0, 0.0, 1.535), GUN(), seg=40, sseg=8); torus(0.11, 0.005, (0, 0.0, 1.552), anod(A), seg=40, sseg=6); cyl(0.095, 0.03, (0, 0, 1.53), BLACK(), seg=32)
    ring_of(10, 0.11, lambda u, v, a: bolt((u, v, 1.535), rot=(90, 0, a - 90), r=0.007))
    with grp((0, 0.235, 1.3)):
        box(0.26, 0.1, 0.34, (0, 0, 0), GUN(), bevel=0.025); vent(0.16, 0.09, (0, 0.052, 0.08), rot=(0, 0, 180), n=5)
        for sx in (-1, 1): cyl(0.04, 0.28, (0.09 * sx, 0.03, -0.03), ALU(), seg=20); cyl(0.045, 0.03, (0.09 * sx, 0.03, 0.12), GUN(), seg=20)
    for s in (-1, 1): hose([(0.1 * s, -0.24, 1.25), (0.21 * s, -0.2, 1.2), (0.265 * s, 0.0, 1.17), (0.16 * s, 0.21, 1.2)], 0.011)
    for (x, y, rz) in ((0.12, -0.215, 0), (-0.12, -0.215, 0), (0.25, -0.02, 80), (-0.25, -0.02, -80)): box(0.07, 0.045, 0.09, (x, y, 0.985), fabric((0.05, 0.05, 0.055)), rot=(0, 0, rz), bevel=0.012)
