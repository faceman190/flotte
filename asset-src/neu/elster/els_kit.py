# Elster (Fassung 2, 18.11.2026): eigenes einsitziges Bergbauschiff, Schaumodell in Blender.
# Wunsch des Nutzers: „Die Elster gefällt mir noch nicht, sie sollte wie das Vorbild eher runde Akzente haben, nicht so kantig. Das Modell schaut
# sehr schlicht aus. Gib dir mehr Mühe.“ Vorbild war eine Bergbau-Bauart aus einem anderen Spiel; das hier ist ein eigener Entwurf, keine Kopie.
# Fassung 1 (kantig, Gitterrahmen) liegt als els_kit_v1.py daneben und im Git (Alpha 1.39).
#
# Neu: glatter Rumpf aus Superellipsen-Spanten mit Eiernase und großer Glaskuppel (Glas folgt der Rumpfform, Rahmen und Streben als Bänder
# auf der Fläche), Plattenfugen und Nieten im Shader (UV „Platten“: u = x, v = Winkel), runde Wülste zwischen den Abschnitten, runde
# Triebwerksgondeln mit Einlasslippe, Lüfterrad und Schubdüse mit Klappen, Pylone im Tropfenprofil, Rückenhaube mit Kühlschlitzen,
# Kugellaser unter dem Kinn, Erzkanister mit gewölbten Kappen in ockerfarbenen Rundklammern, runde Ladeschleuse mit Irisblende,
# Bullaugen, Tür mit runden Ecken, die sich der Rumpfwölbung anpasst.
# Aufruf ohne Fenster: blender.exe -b --python els_lauf.py -- <ansichten> | alle   (Bauplan: -- bauplan, als eigener Lauf)
#
# Achsen wie beim Würger: +X nach vorn, +Y Backbord, +Z oben, Boden z = 0.
# Werkzeuge, Grundmaterialien, Bühnen und Kameras kommen aus ../wuerger/wue_kit.py (nur die Helfer, NUR_HELFER).
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
ANCH = {}      # Punkte für Bauplan und Spiel (werden beim Bau gefüllt)

# =====================================================================================
# Materialien: Lack mit Plattenfugen, Nieten an den Fugen, Flecken, Laufspuren, abgegriffene Kanten
# =====================================================================================
def panel_mat(name, col, metal=0.25, rough=0.42, wear=0.8, brick=(1.6, 0.9), mortar=0.009, rivets=True, streak=0.12, spec=0.32):
    m = bpy.data.materials.new(name); m.use_nodes = True; N = m.node_tree.nodes; K = m.node_tree.links
    m['bk'] = json.dumps(dict(col=list(col), metal=float(metal), rough=float(rough)))
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); out = next(n for n in N if n.type == 'OUTPUT_MATERIAL')
    I(b, 'Metallic').default_value = metal
    for nm in ('Specular IOR Level', 'Specular'):
        if nm in b.inputs: b.inputs[nm].default_value = spec; break
    uv = N.new('ShaderNodeUVMap'); uv.uv_map = 'Platten'; tc = N.new('ShaderNodeTexCoord'); geo = N.new('ShaderNodeNewGeometry')
    def node(t, **kw):
        q = N.new(t)
        for k, v in kw.items(): setattr(q, k, v)
        return q
    def math_(op, a, c):
        q = node('ShaderNodeMath', operation=op)
        for i, s in enumerate((a, c)):
            if isinstance(s, (int, float)): q.inputs[i].default_value = s
            else: K.new(s, q.inputs[i])
        return q.outputs[0]
    def rng(s, a, c, lo, hi, clamp=True):
        q = node('ShaderNodeMapRange'); q.clamp = clamp
        q.inputs['From Min'].default_value = a; q.inputs['From Max'].default_value = c; q.inputs['To Min'].default_value = lo; q.inputs['To Max'].default_value = hi
        K.new(s, q.inputs['Value']); return q.outputs[0]
    def noise(sc, det=6.0, vec=None):
        q = node('ShaderNodeTexNoise'); q.inputs['Scale'].default_value = sc; q.inputs['Detail'].default_value = det
        K.new(vec or tc.outputs['Object'], q.inputs['Vector']); return q.outputs[0]
    def brick_tex(w, h, mort, off, c2=0.9, smooth=0.15):
        q = node('ShaderNodeTexBrick', offset=off, offset_frequency=2, squash=1.0, squash_frequency=2)
        for k, v in (('Scale', 1.0), ('Mortar Size', mort), ('Mortar Smooth', smooth), ('Bias', 0.0), ('Brick Width', w), ('Row Height', h)): q.inputs[k].default_value = v
        q.inputs['Color1'].default_value = (1, 1, 1, 1); q.inputs['Color2'].default_value = (c2, c2, c2, 1); q.inputs['Mortar'].default_value = (0, 0, 0, 1)
        K.new(uv.outputs['UV'], q.inputs['Vector']); return q
    br1 = brick_tex(brick[0], brick[1], mortar, 0.5, 0.9)
    br2 = brick_tex(brick[0] / 2, brick[1] / 2, mortar * 0.55, 0.25, 0.96)
    mask = math_('MAXIMUM', br1.outputs['Fac'], math_('MULTIPLY', br2.outputs['Fac'], 0.45))
    # Flecken (groß und klein), Schmutz in Ecken (AO), Laufspuren nach unten
    val = math_('MULTIPLY', rng(noise(0.7, 6), 0.3, 0.7, 0.88, 1.06), rng(noise(5.0, 4), 0.3, 0.7, 0.95, 1.03))
    try:
        ao = node('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.35
        val = math_('MULTIPLY', val, rng(ao.outputs['AO'], 0.45, 1.0, 0.62, 1.0))
    except Exception: pass
    if streak:
        mp = node('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (7, 7, 0.45); K.new(tc.outputs['Object'], mp.inputs['Vector'])
        val = math_('MULTIPLY', val, rng(noise(1.0, 4, mp.outputs[0]), 0.52, 0.78, 1.0, 1 - streak))
    val = math_('MULTIPLY', val, math_('SUBTRACT', 1.0, math_('MULTIPLY', mask, 0.48)))
    rv = None
    if rivets:      # Nieten: Punkte im schmalen Streifen neben den Hauptfugen
        band = brick_tex(brick[0], brick[1], 0.075, 0.5, 1.0, 0.0)
        ring_ = math_('MAXIMUM', math_('SUBTRACT', band.outputs['Fac'], br1.outputs['Fac']), 0.0)
        vo = node('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 13.0; K.new(uv.outputs['UV'], vo.inputs['Vector'])
        dot = rng(vo.outputs['Distance'], 0.07, 0.13, 1.0, 0.0)
        rv = math_('MULTIPLY', ring_, dot)
        val = math_('MULTIPLY', val, math_('SUBTRACT', 1.0, math_('MULTIPLY', rv, 0.25)))
    hsv = node('ShaderNodeHueSaturation'); hsv.inputs['Color'].default_value = (*col, 1); K.new(val, hsv.inputs['Value'])
    mx = node('ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY'); mx.inputs[0].default_value = 1.0
    K.new(hsv.outputs[0], mx.inputs[6]); K.new(br1.outputs['Color'], mx.inputs[7]); K.new(mx.outputs[2], I(b, 'Base Color'))
    r0 = rng(noise(3.0, 5), 0.3, 0.7, max(0.05, rough - 0.08), min(1.0, rough + 0.12))
    K.new(math_('ADD', r0, math_('MULTIPLY', mask, 0.3)), I(b, 'Roughness'))
    # Höhe: Fugen vertieft, Nieten erhaben, feine Struktur
    h = math_('MULTIPLY', mask, -1.0)
    if rv is not None: h = math_('ADD', h, math_('MULTIPLY', rv, 0.6))
    bp = node('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.55; bp.inputs['Distance'].default_value = 0.004; K.new(h, bp.inputs['Height'])
    bp2 = node('ShaderNodeBump'); bp2.inputs['Strength'].default_value = 0.06; bp2.inputs['Distance'].default_value = 0.001
    K.new(noise(90, 3), bp2.inputs['Height']); K.new(bp.outputs[0], bp2.inputs['Normal']); K.new(bp2.outputs[0], I(b, 'Normal'))
    if wear:      # abgegriffene Kanten: blankes Metall, wo die gerundete Normale (Bevel, nur Cycles) von der echten abweicht
        b2 = N.new('ShaderNodeBsdfPrincipled'); I(b2, 'Base Color').default_value = (0.36, 0.34, 0.31, 1); I(b2, 'Metallic').default_value = 1.0; I(b2, 'Roughness').default_value = 0.34
        bv = N.new('ShaderNodeBevel'); I(bv, 'Radius').default_value = 0.012
        try: bv.samples = 4
        except Exception: pass
        dt = node('ShaderNodeVectorMath', operation='DOT_PRODUCT'); K.new(bv.outputs[0], dt.inputs[0]); K.new(geo.outputs['Normal'], dt.inputs[1])
        edge = rng(math_('SUBTRACT', 1.0, dt.outputs['Value']), 0.004, 0.05, 0.0, 1.0)
        seam_w = math_('MULTIPLY', br1.outputs['Fac'], 0.35)      # auch an den Fugen leicht abgerieben
        msk = math_('MULTIPLY', math_('ADD', edge, seam_w), math_('MULTIPLY', rng(noise(46.0, 5), 0.42, 0.62, 0.0, 1.0), float(wear) * 0.8))
        ms = N.new('ShaderNodeMixShader'); K.new(msk, ms.inputs[0]); K.new(b.outputs[0], ms.inputs[1]); K.new(b2.outputs[0], ms.inputs[2]); K.new(ms.outputs[0], out.inputs['Surface'])
        K.new(bp2.outputs[0], I(b2, 'Normal'))
    return m
M['p_weiss'] = panel_mat('Rumpf Altweiss', (0.30, 0.295, 0.278), 0.18, 0.44, 0.9)
M['p_gun'] = panel_mat('Rumpf Gussgrau', (0.046, 0.05, 0.056), 0.55, 0.36, 0.7)
M['p_petrol'] = panel_mat('Rumpf Petrol', (0.012, 0.13, 0.124), 0.3, 0.4, 0.9)
M['p_dunkel'] = panel_mat('Rumpf Dunkel', (0.022, 0.024, 0.027), 0.5, 0.4, 0.5, rivets=False)
M['w1'] = hull_mat('Lack Altweiss', (0.27, 0.265, 0.25), 0.15, 0.45, 0.9)
M['w2'] = hull_mat('Lack Hellgrau', (0.17, 0.172, 0.175), 0.2, 0.45, 0.9)
M['rahmen'] = hull_mat('Klammer Ocker', (0.25, 0.155, 0.03), 0.3, 0.45, 1.0)
M['gun'] = hull_mat('Gussgrau', (0.045, 0.049, 0.055), 0.6, 0.35, 0.7)
M['rot'] = hull_mat('Lack Petrol', (0.012, 0.13, 0.124), 0.25, 0.42, 0.8)
M['erz'] = hull_mat('Kanister Grau', (0.15, 0.155, 0.16), 0.45, 0.36, 0.9)
M['glas2'] = mk('Kuppelglas', (0.86, 0.93, 0.95), 0.0, 0.03, var=0, rvar=0.005, grime=False, trans=1.0)
M['innen2'] = mk('Cockpit hell', (0.13, 0.135, 0.14), 0.2, 0.5, var=0.1, scale=3.0, bump=0.15, wear=0.3)
M['frame'] = hull_mat('Kanzelrahmen', (0.05, 0.053, 0.058), 0.7, 0.34, 0.7)
M['laser'] = mk('Laserlinse', (0.9, 0.5, 0.2), 0.0, 0.1, var=0, rvar=0, emit=(1.0, 0.45, 0.15), es=6, grime=False)
M['strahl'] = mk('Laserstrahl', (1, 0.5, 0.2), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.4, 0.12), es=60, grime=False)
M['fenster'] = mk('Bullauge Licht', (0.4, 0.3, 0.2), 0.0, 0.1, var=0, rvar=0, emit=(1.0, 0.72, 0.42), es=2.5, grime=False)
HULL_MATS = ['p_weiss', 'p_gun', 'p_petrol', 'p_dunkel']

# =====================================================================================
# Hilfen: glatte Interpolation, Rumpfpunkt, Bänder auf der Fläche, Flächen-Flicken
# =====================================================================================
def pchip(xs, ys, m0=None, m1=None):      # monotone kubische Interpolation (kein Überschwingen); xs aufsteigend
    n = len(xs); h = [xs[i + 1] - xs[i] for i in range(n - 1)]; d = [(ys[i + 1] - ys[i]) / h[i] for i in range(n - 1)]
    m = [0.0] * n; m[0] = d[0] if m0 is None else m0; m[-1] = d[-1] if m1 is None else m1
    for i in range(1, n - 1):
        if d[i - 1] * d[i] <= 0: m[i] = 0.0
        else: w1, w2 = 2 * h[i] + h[i - 1], h[i] + 2 * h[i - 1]; m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        i = max(k for k in range(n - 1) if xs[k] <= x); t = (x - xs[i]) / h[i]
        return (2 * t ** 3 - 3 * t ** 2 + 1) * ys[i] + (t ** 3 - 2 * t ** 2 + t) * h[i] * m[i] + (-2 * t ** 3 + 3 * t ** 2) * ys[i + 1] + (t ** 3 - t ** 2) * h[i] * m[i + 1]
    return f
XN, XT, ZTIP = 7.4, 10.8, 3.5      # Beginn der Nasenrundung, Spitze, Höhe der Spitze
XR, XE = -10.0, -11.2              # Beginn der Heckrundung, Heckplatte
TBL = [  # x, halbe Breite, Oberkante, Unterkante, Superellipsen-Exponent (2 = Ellipse, größer = kastiger)
    (-10.0, 1.66, 5.18, 2.20, 2.6), (-8.0, 1.80, 5.30, 2.10, 2.7), (-5.6, 1.74, 5.28, 2.12, 2.8), (-4.1, 1.47, 5.12, 2.26, 2.9),
    (-2.6, 1.32, 5.04, 2.34, 2.9), (0.6, 1.34, 5.06, 2.32, 2.9), (1.9, 1.50, 5.18, 2.22, 2.9), (3.6, 1.76, 5.38, 2.05, 2.8),
    (5.6, 1.80, 5.46, 2.00, 2.7), (7.4, 1.77, 5.44, 1.98, 2.5)]
_F = [pchip([r[0] for r in TBL], [r[k] for r in TBL], 0.0, 0.0) for k in range(1, 5)]
def base(x): return tuple(f(x) for f in _F)
def params(x):
    if x > XN:      # Eiernase: Breite elliptisch, Oberseite flacher auslaufend (Kuppel), Kinn stumpf
        e = min(1.0, (x - XN) / (XT - XN)); W0, zt0, zb0, n0 = base(XN)
        fw = (1 - e ** 2.2) ** (1 / 2.2); ft = (1 - e ** 1.75) ** (1 / 1.75); fb = (1 - e ** 2.6) ** (1 / 2.6)
        return W0 * fw, ZTIP + (zt0 - ZTIP) * ft, ZTIP - (ZTIP - zb0) * fb, n0 + (2.1 - n0) * e
    if x < XR:      # gerundetes Heck bis zur Heckplatte (dort noch die Hälfte des Querschnitts)
        e = min(1.0, (XR - x) / (XR - XE)); g = 0.3 + 0.7 * math.sqrt(max(0.0, 1 - e * e))
        W0, zt0, zb0, n0 = base(XR); zc0 = zb0 + 0.48 * (zt0 - zb0)
        return W0 * g, zc0 + (zt0 - zc0) * g, zc0 - (zc0 - zb0) * g, n0
    return base(x)
def zc_of(x): W, zt, zb, n = params(x); return zb + 0.48 * (zt - zb)
def hull_point(x, t):      # t = Winkel ab Oberkante, positiv nach Backbord (+Y)
    W, zt, zb, n = params(x); zc = zb + 0.48 * (zt - zb); s, c = math.sin(t), math.cos(t); p = 2.0 / n
    return Vector((x, W * math.copysign(abs(s) ** p, s), zc + (zt - zc if c >= 0 else zc - zb) * math.copysign(abs(c) ** p, c)))
def hull_normal(x, t):
    dx, dt = 0.01, 0.01; x = min(x, XT - 0.02); x = max(x, XE + 0.011)
    n = (hull_point(x + dx, t) - hull_point(x - dx, t)).cross(hull_point(x, t + dt) - hull_point(x, t - dt))
    return n.normalized() if n.length > 1e-9 else Vector((1, 0, 0))
def t_rate(x, t):      # Meter je Bogenmaß an dieser Stelle (für Kreise auf der Fläche)
    return max(0.05, (hull_point(x, t + 0.01) - hull_point(x, t - 0.01)).length / 0.02)
def t_for_z(x, z, s=1):      # Winkel auf der Seite s, an dem der Rumpf die Höhe z hat
    lo, hi = 0.02, PI - 0.02
    for _ in range(40):
        mid = (lo + hi) / 2
        if hull_point(x, mid).z > z: lo = mid
        else: hi = mid
    return s * (lo + hi) / 2
def place(x, t, lift=0.0, fwd=(1, 0, 0)):      # Matrix auf dem Rumpf: Z = Flächennormale, X = möglichst nach vorn
    p = hull_point(x, t); n = hull_normal(x, t); X = Vector(fwd); X = (X - n * X.dot(n)).normalized(); Y = n.cross(X)
    mw = Matrix((X, Y, n)).transposed().to_4x4(); mw.translation = p + n * lift; return mw
def mesh_obj(name, bm, mats, smooth=True, col=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for k in mats: me.materials.append(M[k] if isinstance(k, str) else k)
    if smooth:
        for p in me.polygons: p.use_smooth = True
    if col: CUR[0] = col
    return link(bpy.data.objects.new(name, me))
def strip_mesh(name, P, Nn, w, h, m, closed=False, lift=0.004, col=None):      # Band mit gerundetem Profil entlang Punkten P (Normalen Nn)
    prof = [(-w, 0.0), (-0.7 * w, 0.75 * h), (-0.3 * w, h), (0.3 * w, h), (0.7 * w, 0.75 * h), (w, 0.0)]
    bm = bmesh.new(); rows = []; n = len(P)
    for i in range(n):
        a = P[i - 1] if (closed or i > 0) else P[i]; b = P[(i + 1) % n] if (closed or i < n - 1) else P[i]
        tng = (b - a).normalized(); S = Nn[i].cross(tng).normalized()
        rows.append([bm.verts.new(P[i] + S * u + Nn[i] * (v + lift)) for u, v in prof])
    for i in range(n if closed else n - 1):
        A, B = rows[i], rows[(i + 1) % n]
        for k in range(len(prof) - 1): bm.faces.new((A[k], A[k + 1], B[k + 1], B[k]))
    bm.normal_update()
    return mesh_obj(name, bm, [m], True, col)
def hull_band(name, path, w, h, m, closed=False, lift=0.004, col=None):      # path: (x, t) auf dem Rumpf
    P = [hull_point(x, t) for x, t in path]; Nn = [hull_normal(x, t) for x, t in path]
    ob = strip_mesh(name, P, Nn, w, h, m, closed, lift, col)
    # Normalen nach außen drehen (Band liegt außen auf dem Rumpf)
    me = ob.data; flip = 0
    for p in me.polygons[:8]:
        c = p.center; k = min(range(len(P)), key=lambda i: (P[i] - c).length)
        flip += 1 if p.normal.dot(Nn[k]) < 0 else -1
    if flip > 0: me.flip_normals()
    return ob
def hull_circle(name, x, t, r, w, h, m, lift=0.004, n=40, col=None):      # Kreis auf der Fläche (Klappe, Schleusenrand)
    k = t_rate(x, t); return hull_band(name, [(x + r * math.cos(a), t + r * math.sin(a) / k) for a in [2 * PI * i / n for i in range(n)]], w, h, m, True, lift, col)
def rrect(x0, x1, z0, z1, rad, n=6):      # Umriss eines Rechtecks mit runden Ecken (x, z), gegen den Uhrzeigersinn
    pts = []
    for cx, cz, a0 in ((x1 - rad, z0 + rad, -PI / 2), (x1 - rad, z1 - rad, 0.0), (x0 + rad, z1 - rad, PI / 2), (x0 + rad, z0 + rad, PI)):
        for k in range(n + 1): a = a0 + (PI / 2) * k / n; pts.append((cx + rad * math.cos(a), cz + rad * math.sin(a)))
    return pts
def side_patch(name, x0, x1, z0, z1, rad, s, lift, m, rows=14, cols=12, col=None):      # Flicken mit runden Ecken, schmiegt sich an die Rumpfseite
    bm = bmesh.new(); R = []
    for i in range(rows + 1):
        z = z0 + (z1 - z0) * i / rows; dx = 0.0
        if z < z0 + rad: dz = z0 + rad - z; dx = rad - math.sqrt(max(0.0, rad * rad - dz * dz))
        elif z > z1 - rad: dz = z - (z1 - rad); dx = rad - math.sqrt(max(0.0, rad * rad - dz * dz))
        row = []
        for j in range(cols + 1):
            x = x0 + dx + (x1 - x0 - 2 * dx) * j / cols; t = t_for_z(x, z, s)
            row.append(bm.verts.new(hull_point(x, t) + hull_normal(x, t) * lift))
        R.append(row)
    for i in range(rows):
        for j in range(cols):
            q = (R[i][j], R[i][j + 1], R[i + 1][j + 1], R[i + 1][j]); bm.faces.new(q if s > 0 else q[::-1])
    return mesh_obj(name, bm, [m], True, col)
def side_frame(name, x0, x1, z0, z1, rad, s, w, h, m, col=None):
    path = [(x, t_for_z(x, z, s)) for x, z in rrect(x0, x1, z0, z1, rad, 8)]
    return hull_band(name, path, w, h, m, True, 0.004, col)

# =====================================================================================
# 1. Rumpf: Spanten aus Superellipsen, Zweifarbig mit Petrolband, dunkle Bugspitze und Heckplatte
# =====================================================================================
NRING = 96
CX, CH, CTW = 8.3, 1.95, 1.12      # Glaskuppel: Mitte und halbe Länge in x, halbe Breite als Winkel
def canopy_r(x, t):
    tt = t if t <= PI else t - 2 * PI
    return math.sqrt(((x - CX) / CH) ** 2 + (tt / CTW) ** 2)
def x_samples():
    xs = [XE + (XR - XE) * (1 - math.cos(k / 12 * PI / 2)) for k in range(12)]      # Heck: zur Platte hin dichter
    x = XR
    while x < XN - 1e-6:
        xs.append(x); x += 0.15 if x > 4.8 else 0.2
    K = 44
    for k in range(K): xs.append(XN + (XT - XN) * math.sin(k / K * PI / 2))
    return sorted(set(round(v, 4) for v in xs))
SEAM_X = [10.45, 6.3, 3.4, 1.55, -3.75, -5.45, -10.05]      # Hauptfugen (auch Linien im Bauplan)
def build_hull():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten')
    XS = x_samples(); rings = []
    for x in XS:
        rings.append([bm.verts.new(hull_point(x, 2 * PI * k / NRING)) for k in range(NRING)])
    tip = bm.verts.new((XT, 0, ZTIP)); tail = bm.verts.new((XE + 0.06, 0, zc_of(XE)))
    faces = []
    for i in range(len(XS) - 1):
        for k in range(NRING):
            k2 = (k + 1) % NRING
            f = bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2])); faces.append((f, i, k))
    for k in range(NRING):
        bm.faces.new((rings[-1][k], tip, rings[-1][(k + 1) % NRING])).material_index = 3
        bm.faces.new((rings[0][(k + 1) % NRING], tail, rings[0][k])).material_index = 1
    for f, i, k in faces:      # Farbe je Spalte: unten Gussgrau, darüber zwei Spalten Petrol (nur hinter der Kuppel), Spitze dunkel
        xm = (XS[i] + XS[i + 1]) / 2
        lo, hi = (28, 68) if xm < 6.2 else (33, 63)      # an der Nase schmaler: sonst wirkt die Front wie ein dunkles Maul
        if xm > 10.76: f.material_index = 3
        elif lo <= k < hi: f.material_index = 1
        elif k in (26, 27, 68, 69) and -10.1 < xm < 6.25: f.material_index = 2
        else: f.material_index = 0
    # UV: u = x, v = Winkel × 1,7 m (an der Naht fortgesetzt)
    vk = {}
    for i, r in enumerate(rings):
        for k, v in enumerate(r): vk[v] = (XS[i], k)
    for f, i, k in faces:
        ks = [vk[lp.vert][1] for lp in f.loops]
        wrap = max(ks) - min(ks) > NRING // 2
        for lp in f.loops:
            x, kv = vk[lp.vert]
            if wrap and kv < NRING // 2: kv += NRING
            lp[uvl].uv = (x, 2 * PI * kv / NRING * 1.7)
    bm.normal_update()
    return bm, rings, XS
def cut_canopy(bm):
    dead = [f for f in bm.faces if f.calc_center_median().z > 3.6 and canopy_r(f.calc_center_median().x, _t_of(f.calc_center_median())) < 0.94]
    bmesh.ops.delete(bm, geom=dead, context='FACES')
def _t_of(p):      # Winkel eines Punkts um die Rumpfachse (für die Kuppelmaske)
    zc = zc_of(p.x); return math.atan2(p.y, p.z - zc) % (2 * PI)
def canopy():
    CUR[0] = C_PART
    # Glas: Polarnetz in der Kuppel-Ellipse, auf die Rumpfform gelegt und 12 mm angehoben
    bm = bmesh.new(); J, NA = 16, 96; rings_ = []
    ctr = bm.verts.new(hull_point(CX, 0.0) + hull_normal(CX, 0.0) * 0.012)
    for j in range(1, J + 1):
        r = 0.935 * j / J; row = []
        for a in range(NA):
            ph = 2 * PI * a / NA; x = CX + CH * r * math.cos(ph); t = CTW * r * math.sin(ph)
            row.append(bm.verts.new(hull_point(x, t) + hull_normal(x, t) * 0.012))
        rings_.append(row)
    for a in range(NA): bm.faces.new((ctr, rings_[0][a], rings_[0][(a + 1) % NA]))
    for j in range(J - 1):
        for a in range(NA): bm.faces.new((rings_[j][a], rings_[j + 1][a], rings_[j + 1][(a + 1) % NA], rings_[j][(a + 1) % NA]))
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Kanzelglas', bm, ['glas2'])
    # Rahmen: Rand der Kuppel, Mittelstrebe, zwei Querspanten, Rand vorn tiefer gezogen
    hull_band('Kanzelrahmen', [(CX + CH * 0.955 * math.cos(p), CTW * 0.955 * math.sin(p)) for p in [2 * PI * i / 160 for i in range(160)]], 0.115, 0.03, M['frame'], True)
    hull_band('Kanzelstrebe', [(x, 0.0) for x in [CX - CH * 0.93 + i * (2 * CH * 0.93) / 40 for i in range(41)]], 0.04, 0.032, M['frame'])
    for xr in (7.55, 9.05):
        tb = CTW * 0.93 * math.sqrt(max(0.0, 1 - ((xr - CX) / CH) ** 2))
        hull_band('Kanzelspant', [(xr, -tb + 2 * tb * i / 40) for i in range(41)], 0.035, 0.03, M['frame'])
    ANCH['kanzel'] = hull_point(8.6, 0.5) + Vector((0, 0, 0.05))
def collars():      # runde Wülste zwischen den Abschnitten (vorn Petrol, sonst Gussgrau), dazu feine Hauptfugen
    for x, w, h, m in ((1.55, 0.11, 0.07, 'rot'), (-3.75, 0.12, 0.075, 'gun'), (-10.05, 0.08, 0.05, 'gun'), (6.15, 0.05, 0.03, 'gun')):
        hull_band('Wulst', [(x, 2 * PI * i / 120) for i in range(120)], w, h, M[m], True)
        for dx in (-w - 0.05, w + 0.05):      # Nietreihe beidseits
            for i in range(0, 120, 3):
                t = 2 * PI * i / 120; p = hull_point(x + dx, t); nrm = hull_normal(x + dx, t)
                sphere('Wulstniet', 0.012, *(p + nrm * 0.003), M['steel'], 6)
    for x in (3.4, -5.45):
        hull_band('Hauptfuge', [(x, 2 * PI * i / 120) for i in range(120)], 0.012, 0.004, M['frame'], True, 0.002)
    hull_band('Bugring', [(10.74, 2 * PI * i / 96) for i in range(96)], 0.03, 0.02, M['gun'], True)      # Ring um die dunkle Sensorspitze

# =====================================================================================
# 2. Cockpit unter der Kuppel
# =====================================================================================
def cockpit():
    CUR[0] = C_ROOM; FL = 3.0; bm = bmesh.new(); R = []
    XSC = [6.38 + i * (10.1 - 6.38) / 18 for i in range(19)]
    for x in XSC:
        tb = CTW * 0.94 * math.sqrt(max(0.0, 1 - ((x - CX) / CH) ** 2)); W = params(x)[0]
        pts = []
        for t in (tb, 1.35, PI / 2, 1.95):
            if t < tb and t != tb: continue
            p = hull_point(x, t); pts.append(Vector((x, p.y * 0.965, zc_of(x) + (p.z - zc_of(x)) * 0.965)))
        side = pts + [Vector((x, W * 0.55, FL))]
        ring_ = side + [Vector((p.x, -p.y, p.z)) for p in reversed(side)]
        R.append(ring_)
    n = min(len(r) for r in R)
    R = [r if len(r) == n else (r[:n // 2] + r[-(n // 2):]) for r in R]
    V = [[bm.verts.new(p) for p in r] for r in R]
    for i in range(len(V) - 1):
        for k in range(n - 1): bm.faces.new((V[i][k], V[i][k + 1], V[i + 1][k + 1], V[i + 1][k]))
    bm.faces.new(V[0]); bm.faces.new(V[-1][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Cockpitwanne', bm, ['innen2'], True, C_ROOM)
    cyl('Sitzsockel', 0.24, 0.36, 7.2, 0, FL + 0.18, M['mittel'], 'Z', n=20)
    box('Sitzpolster', 0.58, 0.52, 0.12, 7.25, 0, FL + 0.42, M['sitz'], 0.04)
    with Part('Sitzlehne', T(6.95, 0, FL + 0.42) @ RY(math.radians(-14)), C_ROOM):
        box('Lehne', 0.12, 0.56, 0.95, 0, 0, 0.48, M['sitz'], 0.05); box('Kopfteil', 0.16, 0.42, 0.3, 0, 0, 1.02, M['dunkel'], 0.05)
        for sg in (1, -1): box('Gurt', 0.012, 0.06, 0.7, 0.07, sg * 0.11, 0.45, M['gurt'], 0.002); box('Seitenwange', 0.2, 0.06, 0.6, 0.05, sg * 0.3, 0.42, M['dunkel'], 0.025)
    prism('Pult', [(8.25, FL), (9.25, FL), (9.25, FL + 0.55), (8.6, FL + 0.95), (8.3, FL + 0.82)], -0.62, 0.62, M['verkleidung'], 'Y', 0.02)
    for y, mm in ((0.4, 'mfd2'), (0.0, 'mfd'), (-0.4, 'mfd2')):
        with Part('Anzeige', T(8.46, y, FL + 0.9) @ RY(math.radians(38)), C_ROOM):
            box('Rahmen', 0.025, 0.34, 0.25, 0, 0, 0, M['dunkel'], 0.006); box('Bild', 0.004, 0.3, 0.21, -0.014, 0, 0, M[mm], 0)
    for s in (1, -1):
        box('Armlehne', 0.7, 0.14, 0.42, 7.35, s * 0.44, FL + 0.32, M['verkleidung'], 0.03)
        cyl('Griff', 0.028, 0.2, 7.58, s * 0.44, FL + 0.62, M['dunkel'], 'Z', n=12); sphere('Griffknauf', 0.04, 7.58, s * 0.44, FL + 0.73, M['dunkel'], 12)
    area('Cockpitlicht', (7.6, 0, 4.9), (0, 0, 0), 0.9, 0.7, 140, (0.85, 0.9, 1.0))
    area('Pultlicht', (8.3, 0, FL + 1.25), (math.radians(-60), 0, math.radians(90)), 0.8, 0.3, 25, (0.6, 0.9, 1.0))
    with Part('Steuerknueppel', T(7.62, 0.0, FL + 0.36), C_ROOM):      # Knüppel zwischen den Knien, HUD-Scheibe über dem Pult
        cyl('Knueppelfuss', 0.07, 0.06, 0, 0, 0, M['rubber'], 'Z', n=16); cyl('Knueppel', 0.022, 0.42, 0, 0, 0.22, M['dunkel'], 'Z', n=12); sphere('Knauf', 0.045, 0, 0, 0.45, M['dunkel'], 12)
    box('HUD-Scheibe', 0.006, 0.34, 0.2, 8.62, 0, FL + 1.15, M['glas2'], 0.002, rot=(0, math.radians(-25), 0))
    for k in range(6): box('Pulttaste', 0.06, 0.05, 0.015, 8.45 + (k % 3) * 0.1, -0.12 + (k // 3) * 0.24, FL + 0.6, M['e_white'] if k == 2 else M['dunkel'], 0.004)
    for s in (1, -1):      # Seitenkonsolen mit Schaltern
        box('Seitenkonsole', 1.1, 0.28, 0.5, 7.9, s * 0.95, FL + 0.25, M['verkleidung'], 0.03)
        for k in range(5): box('Schalter', 0.08, 0.05, 0.02, 7.5 + k * 0.18, s * 0.95, FL + 0.51, M['taste'] if 'taste' in M else M['dunkel'], 0.005)
        box('Seitenlicht', 0.9, 0.02, 0.02, 7.9, s * 0.8, FL + 0.48, M['e_teal'], 0)

# =====================================================================================
# 3. Triebwerksgondeln: rund, Einlasslippe, Lüfterrad, Schubdüse mit Klappen, Pylon im Tropfenprofil, Leitflosse
# =====================================================================================
NY, NZ = 3.15, 3.3
NX0, NX1 = -4.55, -11.4
_NR = pchip([-11.4, -11.0, -10.0, -6.0, -5.2, -4.75, -4.55], [0.9, 0.97, 1.04, 1.06, 1.02, 0.93, 0.87], 0.0, 0.0)
def nacelle_r(x): return _NR(x)
def build_nacelle(s):
    yc = s * NY; NA = 64; XS = sorted(set([round(NX1 + (NX0 - NX1) * i / 50, 4) for i in range(51)] + [-5.55, -5.25]))
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); R = []
    for x in XS:
        r = nacelle_r(x); R.append([bm.verts.new((x, yc + r * math.sin(2 * PI * a / NA), NZ + r * math.cos(2 * PI * a / NA))) for a in range(NA)])
    for i in range(len(XS) - 1):
        xm = (XS[i] + XS[i + 1]) / 2
        for a in range(NA):
            a2 = (a + 1) % NA; q = (R[i][a], R[i][a2], R[i + 1][a2], R[i + 1][a])
            f = bm.faces.new(q if s > 0 else q[::-1])
            ang = 2 * PI * (a + 0.5) / NA
            f.material_index = 2 if -5.55 < xm < -5.25 else (1 if math.cos(ang) < -0.3 else 0)
            for lp, (ii, aa) in zip(f.loops, ((i, a), (i, a + 1), (i + 1, a + 1), (i + 1, a)) if s > 0 else ((i + 1, a), (i + 1, a + 1), (i, a + 1), (i, a))):
                lp[uvl].uv = (XS[ii], 2 * PI * aa / NA * 1.05)
    bm.normal_update()
    return bm
def bell(name, r1, r2, L, x0, m, n=40):      # offene Düsenglocke längs −X (r1 vorn, r2 hinten)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=n, radius1=r2, radius2=r1, depth=L, matrix=T(x0 - L / 2, 0, 0) @ RY(PI / 2))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    return link(bpy.data.objects.new(name, me))
def nacelle_parts(s):
    yc = s * NY
    with Part('Einlass', T(NX0, yc, NZ), C_PART):      # Einlass: Lippe, Kanal, Lüfterrad mit Nabe
        ring('Einlasslippe', 0.83, 0.075, (0, 0, 0), (1, 0, 0), M['gun'], 64)
        bell('Einlasskanal', 0.8, 0.8, 0.9, 0.02, M['dunkel'], 48)
        cyl('Nabe', 0.27, 0.42, -0.62, 0, 0, M['w2'], 'X', n=32, r2=0.04)
        ring('Nabenring', 0.27, 0.02, (-0.82, 0, 0), (1, 0, 0), M['rot'], 32)
        for k in range(16):
            a = 2 * PI * k / 16; ob = box('Schaufel', 0.16, 0.025, 0.5, 0, 0, 0, M['mittel'], 0.004)
            ob.matrix_basis = Matrix.Translation((-0.86, 0, 0)) @ RX(a) @ Matrix.Translation((0, 0, 0.52)) @ RZ(0.5)
        cyl('Lagerkreuz', 0.05, 1.6, -0.95, 0, 0, M['gun'], 'Z', n=10); cyl('Lagerkreuz', 0.05, 1.6, -0.95, 0, 0, M['gun'], 'Y', n=10)
    with Part('Schubduese', T(NX1, yc, NZ), C_PART):      # Düse: Ring, verjüngende Glocke, 16 Klappen, Glut, Mittelkegel
        ring('Duesenring', 0.89, 0.04, (0, 0, 0), (1, 0, 0), M['gun'], 64)
        bell('Duesenglocke', 0.86, 0.74, 0.6, 0.0, M['duese'], 48)
        cyl('Glut', 0.73, 0.04, -0.35, 0, 0, M['glut'], 'X', n=40)
        cyl('Mittelkegel', 0.32, 0.7, -0.55, 0, 0, M['dunkel'], 'X', n=32, r2=0.05)
        for k in range(16):
            a = 2 * PI * k / 16; ob = box('Duesenklappe', 0.62, 0.3, 0.025, 0, 0, 0, M['gun'], 0.004)
            ob.matrix_basis = RX(a) @ Matrix.Translation((-0.3, 0, 0.84)) @ RY(math.radians(-7))
        for k in range(3): ring('Kuehlring', nacelle_r(NX1 + 0.25 + k * 0.18) + 0.012, 0.018, (0.25 + k * 0.18, 0, 0), (1, 0, 0), M['mittel'], 64)
    # Pylon: Tropfenprofil von der Rumpfseite in die Gondel
    bm = bmesh.new(); R = []; Ys = [1.45, 1.8, 2.15, 2.5, 2.75]
    for i, y in enumerate(Ys):
        f = i / (len(Ys) - 1); ax = 1.8 - 0.25 * f; az = 0.24 - 0.05 * f; cx = -7.45 - 0.15 * f; cz = 3.62 + (NZ - 3.62) * f
        R.append([bm.verts.new((cx + ax * math.cos(a) * (1.0 if math.cos(a) > 0 else 1.0), s * y, cz + az * math.sin(a) * (1 - 0.35 * max(0.0, -math.cos(a))))) for a in [2 * PI * k / 40 for k in range(40)]])
    for i in range(len(R) - 1):
        for k in range(40):
            q = (R[i][k], R[i][(k + 1) % 40], R[i + 1][(k + 1) % 40], R[i + 1][k]); bm.faces.new(q if s < 0 else q[::-1])
    mesh_obj('Pylon', bm, ['gun'], True, C_PART)
    # Leitflosse oben außen, runder Umriss
    with Part('Leitflosse', T(-9.1, yc + s * 0.35, NZ + 0.95) @ RX(-s * math.radians(22)), C_PART):
        out = fillet([(0.95, 0.0), (0.15, 0.62), (-0.45, 0.7), (-0.95, 0.0)], 0.28, 8)
        prism('Flosse', [(p[0], p[1]) for p in out], -0.04, 0.04, M['w1'], 'Y', 0.02)
        box('Flossenkante', 0.55, 0.095, 0.05, -0.15, 0, 0.67, M['rot'], 0.015)
        sphere('Flossenlicht', 0.035, -0.45, 0, 0.71, M['blitz'], 10)
    sphere('Positionslicht', 0.06, NX1 + 0.6, yc + s * (nacelle_r(NX1 + 0.6) + 0.03), NZ, M['nav_r' if s > 0 else 'nav_g'], 12)
    ANCH['triebwerk%d' % s] = Vector((NX1 - 0.3, yc + s * 0.6, NZ + 0.5)); ANCH['einlass%d' % s] = Vector((NX0, yc + s * 0.75, NZ + 0.45))

# =====================================================================================
# 4. Rückenhaube mit Kühlschlitzen und Lüftern, Sensorkuppel, Antenne
# =====================================================================================
def dorsal():
    xc, hl = -6.75, 3.0; bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); R = []; XS = [xc - hl + 2 * hl * i / 40 for i in range(41)]
    for x in XS:
        e = (x - xc) / hl; g = math.sqrt(max(0.0, 1 - e ** 4)) ** 0.8; Wh, Hh = 0.9 * g + 0.02, 0.48 * g + 0.01; zb = params(x)[1] - 0.12
        row = []
        for k in range(25):
            a = PI * k / 24; ca, sa = math.cos(a), math.sin(a); p = 2 / 2.6
            row.append(bm.verts.new((x, Wh * math.copysign(abs(ca) ** p, ca), zb + Hh * abs(sa) ** p)))
        R.append(row)
    for i in range(len(R) - 1):
        for k in range(24):
            f = bm.faces.new((R[i][k], R[i + 1][k], R[i + 1][k + 1], R[i][k + 1]))
            for lp, (ii, kk) in zip(f.loops, ((i, k), (i + 1, k), (i + 1, k + 1), (i, k + 1))): lp[uvl].uv = (XS[ii], kk * 0.09)
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Rueckenhaube', bm, ['p_weiss'], True, C_PART)
    for s in (1, -1):      # Kühlschlitze an den Flanken der Haube
        for k in range(9):
            x = -8.6 + k * 0.42; e = (x - xc) / hl; g = math.sqrt(max(0.0, 1 - e ** 4)) ** 0.8; zb = params(x)[1] - 0.12
            box('Kuehlschlitz', 0.26, 0.05, 0.2 * g, x, s * (0.9 * g * 0.86), zb + 0.48 * g * 0.45, M['dunkel'], 0.01, rot=(s * math.radians(-38), 0, 0))
    for y in (0.36, -0.36):      # runde Lüfter oben
        x = -7.9; z = params(x)[1] - 0.12 + 0.47
        with Part('Luefter', T(x, y, z), C_PART):
            ring('Luefterring', 0.22, 0.03, (0, 0, 0), (0, 0, 1), M['gun'], 32); cyl('Luefterschacht', 0.21, 0.04, 0, 0, -0.01, M['dunkel'], 'Z', n=32)
            for k in range(6): box('Luefterstab', 0.4, 0.025, 0.02, 0, 0, 0.012, M['mittel'], 0.003, rot=(0, 0, k * PI / 6))
            cyl('Luefternabe', 0.05, 0.04, 0, 0, 0.02, M['rot'], 'Z', n=16)
    xd = -3.55; zd = params(xd)[1]
    with Part('Sensorkuppel', T(xd, 0, zd - 0.02), C_PART):
        cyl('Kuppelsockel', 0.3, 0.1, 0, 0, 0.05, M['gun'], 'Z', n=32); sphere('Sensorkuppel', 0.24, 0, 0, 0.1, M['rauchglas'], 32)
        ring('Kuppelring', 0.25, 0.02, (0, 0, 0.1), (0, 0, 1), M['rot'], 32)
    ANCH['kuppel'] = Vector((xd, 0, zd + 0.3)); ANCH['haube'] = Vector((-6.2, -0.7, params(-6.2)[1] + 0.2))
    with Part('Klingenantenne', place(-1.0, 0.0), C_PART):
        out = fillet([(0.25, 0.0), (-0.05, 0.3), (-0.22, 0.32), (-0.2, 0.0)], 0.08, 6)
        prism('Antenne', [(p[0], p[1]) for p in out], -0.016, 0.016, M['dunkel'], 'Y', 0.004)
    sphere('Blitzlicht', 0.04, -9.55, 0, params(-9.55)[1] + 0.02, M['nav_r'], 10)

# =====================================================================================
# 5. Bergbau: Kugellaser unter dem Kinn, Fangstrahler, Erzkanister in Rundklammern, Erzleitungen
# =====================================================================================
LASER_ROT = math.radians(-10)
LX = 8.55
def orient(a, b):      # Matrix: lokale Z-Achse von a nach b, Ursprung in der Mitte
    d = b - a; q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return d.length, Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4()
def rod(name, a, b, r, m, n=24, r2=None):      # Zylinder (oder Kegel) zwischen zwei Punkten
    a, b = Vector(a), Vector(b); L, mw = orient(a, b)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=n, radius1=r, radius2=r if r2 is None else r2, depth=L)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me)); ob.matrix_basis = mw
    es = ob.modifiers.new('Kanten', 'EDGE_SPLIT'); es.split_angle = math.radians(40)
    return ob
def slab(name, c, X, Y, size, m, bev=0.01):      # Quader mit eigenen Achsen (X, Y; Z = X × Y), Maße (x, y, z)
    X = Vector(X).normalized(); Y = (Vector(Y) - X * X.dot(Vector(Y))).normalized(); Z = X.cross(Y)
    mw = Matrix((X, Y, Z)).transposed().to_4x4(); mw.translation = Vector(c)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= size[0]; v.co.y *= size[1]; v.co.z *= size[2]
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = link(bpy.data.objects.new(name, me)); ob.matrix_basis = mw
    return finish(ob, bev)
def link_bar(name, a, b, w, t, side, m):      # flacher Lenker zwischen zwei Gelenken, runde Augen an den Enden
    a, b = Vector(a), Vector(b); X = (b - a)
    slab(name, (a + b) / 2, X, side, (X.length, t, w), m, 0.008)
    for p in (a, b): rod(name + ' Auge', p - Vector(side).normalized() * t * 0.6, p + Vector(side).normalized() * t * 0.6, w * 0.55, m, 20)
def bolts(c, axis, R, r, n, m):      # Schraubenkranz um c in der Ebene senkrecht zu axis
    nz = Vector(axis).normalized(); ax = nz.orthogonal().normalized(); ay = nz.cross(ax)
    for k in range(n):
        a = 2 * PI * k / n; sphere('Schraube', r, *(Vector(c) + (ax * math.cos(a) + ay * math.sin(a)) * R), m, 6)

def laser_turret():      # Bergbaulaser: Zahnkranz mit Antrieb, Gabel mit Höhenmotoren, Resonatorgehäuse mit Kühlkörper und Kondensatoren, Strahlrohr mit Kühlwendel, Fokuseinheit, Blende, Schutzhaube
    zt = surf(LX, 0, -1)[0].z; ZP = -0.78
    with Part('Bergbaulaser', T(LX, 0, zt), C_WPN):
        cyl('Kranzplatte', 0.64, 0.06, 0, 0, -0.03, M['gun'], 'Z', n=64)
        bolts((0, 0, -0.06), (0, 0, 1), 0.6, 0.018, 24, M['steel'])
        cyl('Zahnkranz', 0.55, 0.08, 0, 0, -0.1, M['mittel'], 'Z', n=64)
        for k in range(56):
            a = 2 * PI * k / 56; box('Zahn', 0.045, 0.03, 0.07, 0.565 * math.cos(a), 0.565 * math.sin(a), -0.1, M['mittel'], 0.003, rot=(0, 0, a))
        cyl('Drehantrieb', 0.11, 0.26, -0.5, 0.5, -0.1, M['gun'], 'Z', n=24); cyl('Antriebsdeckel', 0.08, 0.03, -0.5, 0.5, -0.24, M['rot'], 'Z', n=20)
        cyl('Ritzel', 0.07, 0.07, -0.43, 0.43, -0.1, M['chrom'], 'Z', n=16)
        cyl('Jochplatte', 0.5, 0.12, 0, 0, -0.2, M['w2'], 'Z', n=64); ring('Jochring', 0.5, 0.02, (0, 0, -0.26), (0, 0, 1), M['gun'], 64)
        for s in (1, -1):
            out = fillet([(-0.36, -0.22), (0.32, -0.22), (0.26, -0.6), (0.15, ZP - 0.18), (-0.15, ZP - 0.18), (-0.26, -0.6)], 0.12, 6)
            prism('Gabelarm', [(p[0], p[1]) for p in out], s * 0.36, s * 0.47, M['w2'], 'Y', 0.02)
            prism('Armversteifung', [(-0.05, -0.3), (0.05, -0.3), (0.05, ZP + 0.05), (-0.05, ZP + 0.05)], s * 0.47, s * 0.5, M['gun'], 'Y', 0.01)
            cyl('Hoehenmotor', 0.17, 0.16, 0, s * 0.58, ZP, M['gun'], 'Y', n=32)
            cyl('Motordeckel', 0.12, 0.03, 0, s * 0.675, ZP, M['rot'], 'Y', n=24)
            bolts((0, s * 0.665, ZP), (0, 1, 0), 0.145, 0.012, 8, M['steel'])
            pipe('Motorkabel', [Vector((-0.16, s * 0.6, ZP + 0.06)), Vector((-0.24, s * 0.6, -0.45)), Vector((-0.2, s * 0.52, -0.24))], 0.022, M['rubber'], rad=0.08)
        with Part('Laserkopf', T(0, 0, ZP) @ RY(-LASER_ROT), C_WPN):
            cyl('Hoehenachse', 0.09, 0.84, 0, 0, 0, M['chrom'], 'Y', n=24)
            box('Resonatorgehaeuse', 1.15, 0.6, 0.46, 0.04, 0, 0, M['w1'], 0.07)
            box('Gehaeuseboden', 1.0, 0.62, 0.1, 0.02, 0, -0.22, M['gun'], 0.03)
            box('Rueckwand', 0.08, 0.5, 0.36, -0.56, 0, 0, M['gun'], 0.02)
            for k in range(14): box('Kuehlrippe', 0.03, 0.48, 0.13, -0.42 + k * 0.066, 0, 0.29, M['mittel'], 0.004)
            for s in (1, -1):
                box('Kuehlwange', 0.96, 0.03, 0.12, 0.02, s * 0.255, 0.285, M['gun'], 0.01)
                for zz in (0.09, -0.07):
                    cyl('Kondensator', 0.06, 0.78, 0.02, s * 0.34, zz, M['gun'], 'X', n=20)
                    for xx in (-0.38, 0.42): ring('Kondensatorring', 0.062, 0.01, (xx, s * 0.34, zz), (1, 0, 0), M['mittel'], 20)
                box('Laserwarnung', 0.32, 0.01, 0.07, 0.36, s * 0.302, 0.17, M['warnrw'], 0)
                pipe('Kuehlleitung', [Vector((0.42, s * 0.24, 0.24)), Vector((0.72, s * 0.24, 0.24)), Vector((0.8, s * 0.16, 0.14))], 0.022, M['rot'], rad=0.06)
                pipe('Energieleitung', [Vector((-0.6, s * 0.16, 0.04)), Vector((-0.82, s * 0.16, 0.04)), Vector((-0.82, s * 0.2, 0.42)), Vector((-0.42, s * 0.22, 0.56))], 0.035, M['rubber'], rad=0.12)
            cyl('Strahlrohr', 0.13, 0.92, 1.05, 0, 0, M['gun'], 'X', n=32)
            for xx in (0.63, 1.47):
                cyl('Flansch', 0.19, 0.05, xx, 0, 0, M['mittel'], 'X', n=32); bolts((xx + 0.026, 0, 0), (1, 0, 0), 0.16, 0.012, 8, M['steel'])
            for k in range(8): ring('Kuehlwendel', 0.147, 0.014, (0.73 + k * 0.09, 0, 0), (1, 0, 0), M['duese'], 32)
            cyl('Fokuseinheit', 0.22, 0.3, 1.66, 0, 0, M['w2'], 'X', n=40)
            for xx in (1.53, 1.79): ring('Fokusring', 0.222, 0.018, (xx, 0, 0), (1, 0, 0), M['gun'], 40)
            box('Fokusmotor', 0.18, 0.1, 0.09, 1.66, 0.0, 0.25, M['gun'], 0.015)
            cyl('Linse', 0.15, 0.02, 1.81, 0, 0, M['laser'], 'X', n=32)
            bell('Schutzhaube', 0.25, 0.2, 0.3, 2.1, M['dunkel'], 40)
            ring('Haubenrand', 0.25, 0.018, (2.1, 0, 0), (1, 0, 0), M['warnrw'], 40)
            for k in range(8):
                a = 2 * PI * k / 8; ob = box('Blendenlamelle', 0.02, 0.09, 0.05, 0, 0, 0, M['mittel'], 0.003)
                ob.matrix_basis = Matrix.Translation((1.86, 0, 0)) @ RX(a) @ Matrix.Translation((0, 0, 0.18)) @ RX(0.5)
            box('Entfernungsmesser', 0.36, 0.11, 0.11, 0.86, 0.25, 0.27, M['gun'], 0.02)
            cyl('Messlinse', 0.04, 0.02, 1.05, 0.25, 0.27, M['e_teal'], 'X', n=16)
            text('LASER KL. 4', 0.055, (0.15, 0.302, -0.12), (-1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Laserschrift')
    piv = Vector((LX, 0, zt + ZP)); th = -LASER_ROT; d = Vector((math.cos(th), 0, -math.sin(th)))
    ANCH['laser_piv'] = piv; ANCH['laser_tip'] = piv + d * 1.82
    for s in (1, -1):      # Fangstrahler: runde Kugelköpfe seitlich am Kinn
        t = s * 2.2
        with Part('Fangstrahler', place(9.55, t, 0.0), C_WPN):
            cyl('Strahlerfuss', 0.17, 0.08, 0, 0, 0.04, M['gun'], 'Z', n=32); sphere('Strahlerkopf', 0.15, 0, 0, 0.17, M['w2'], 32)
            cyl('Strahlerlinse', 0.1, 0.03, 0.12, 0, 0.17, M['e_teal'], 'X', n=24); ring('Linsenring', 0.105, 0.012, (0.135, 0, 0.17), (1, 0, 0), M['gun'], 24)
        ANCH['fang%d' % s] = hull_point(9.55, t)
POD = (-3.45, 1.15, 2.23, (3.05, 4.58), 0.74)      # Kanister: x von–bis, Mitte |y|, Höhen der zwei Lagen, Radius
def canister(x0, x1, y, z, r, s, label):
    L = x1 - x0; cap = 0.42
    cyl('Erzkanister', r, L - 2 * cap, (x0 + x1) / 2, y, z, M['erz'], 'X', n=40, bev=0)
    for xe, sg in ((x1 - cap, 1), (x0 + cap, -1)):
        ob = sphere('Kanisterkappe', r, xe, y, z, M['w1'], 40); ob.scale = (cap / r, 1, 1)
        ring('Kappenring', r + 0.005, 0.03, (xe, y, z), (1, 0, 0), M['gun'], 40)
    cyl('Warnband', r + 0.006, 0.3, x1 - 1.0, y, z, M['warnrw'], 'X', n=40, bev=0)
    cyl('Petrolband', r + 0.008, 0.16, x0 + 0.95, y, z, M['rot'], 'X', n=40, bev=0)
    for k in range(2): ring('Spannband', r + 0.02, 0.022, (x0 + 1.6 + k * (L - 3.2), y, z), (1, 0, 0), M['gun'], 40)
    for a in [0.4 + k * 2 * PI / 7 for k in range(7)]:      # Längsrippen
        pipe('Kanisterrippe', [Vector((x0 + cap + 0.05, y + math.cos(a) * (r + 0.01), z + math.sin(a) * (r + 0.01))), Vector((x1 - cap - 0.05, y + math.cos(a) * (r + 0.01), z + math.sin(a) * (r + 0.01)))], 0.016, M['gun'])
    box('Fuellstandsfenster', 1.6, 0.012, 0.07, (x0 + x1) / 2 + 0.3, y + s * (r + 0.006), z + 0.32, M['dunkel'], 0.003)
    box('Fuellstand', 1.0, 0.01, 0.04, (x0 + x1) / 2 + 0.0, y + s * (r + 0.012), z + 0.32, M['e_teal'], 0.0)
    cyl('Fuellstutzen', 0.12, 0.3, x1 + 0.08, y, z, M['mittel'], 'X', n=16); ring('Handrad', 0.13, 0.018, (x1 + 0.23, y, z), (1, 0, 0), M['rot'], 20)
    for k in range(4): box('Handradspeiche', 0.02, 0.24, 0.02, x1 + 0.23, y, z, M['rot'], 0.003, rot=(k * PI / 4, 0, 0))
    cyl('Manometer', 0.075, 0.04, x1 - 0.55, y + s * r * 0.62, z + r * 0.72, M['dunkel'], 'Z', n=20); cyl('Manometerglas', 0.06, 0.01, x1 - 0.55, y + s * r * 0.62, z + r * 0.72 + 0.022, M['e_white'], 'Z', n=20)
    text(label, 0.13, (x0 + L * 0.42 + (0.22 if s > 0 else -0.22), y + s * (r + 0.012), z - 0.06), (-1, 0, 0) if s > 0 else (1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Kanisterschrift')
    box('Kanisterschild', 0.72, 0.01, 0.24, x0 + L * 0.42, y + s * (r + 0.004), z, M['plate'], 0.002)
def ore_pods():
    x0, x1, yc, zs, r = POD; R = r + 0.07
    for s in (1, -1):
        y = s * yc; CUR[0] = C_PART
        for k, z in enumerate(zs): canister(x0, x1, y, z, r, s, 'ERZ %d' % (k + 1 + (0 if s > 0 else 2)))
        for xx in (x0 + 0.75, (x0 + x1) / 2, x1 - 0.75):      # Rundklammer um beide Kanister (Stadionform) mit Spannschloss
            pts = []
            for k in range(25): a = PI * k / 24; pts.append(Vector((xx, y + R * math.cos(a), zs[1] + R * math.sin(a))))
            for k in range(25): a = PI + PI * k / 24; pts.append(Vector((xx, y + R * math.cos(a), zs[0] + R * math.sin(a))))
            pipe('Rundklammer', pts, 0.065, M['rahmen'], cyclic=True, res=4)
            for zz in zs: cyl('Spannschloss', 0.09, 0.22, xx, y + s * R, zz, M['gun'], 'X', n=16)
            for zz, hz in ((zs[0], 0.0), (zs[1], -0.25)):      # Tragarme zum Rumpf, gebogen
                tz = t_for_z(xx, min(zz + hz, 4.6), s); a = hull_point(xx, tz); b = Vector((xx, y - s * R, zz))
                pipe('Tragarm', [a, a.lerp(b, 0.45) + Vector((0, 0, 0.12)), b], 0.075, M['gun'], rad=0.2)
                sphere('Armgelenk', 0.11, *a, M['gun'], 16)
        for zz in (zs[1] + R, zs[0] - R): pipe('Klammerschiene', [Vector((x0 + 0.6, y, zz)), Vector((x1 - 0.6, y, zz))], 0.045, M['rahmen'])
        ANCH['kanister%d' % s] = Vector(((x0 + x1) / 2 - 0.4, y + s * r * 0.9, zs[0] + 0.3)); ANCH['klammer%d' % s] = Vector((x1 - 0.75, y, zs[1] + R + 0.05))
        zt = surf(6.5, 0, -1)[0].z      # Erzleitung vom Laser unter dem Rumpf zum unteren Kanister
        pipe('Erzleitung', [Vector((7.9, s * 0.3, zt - 0.06)), Vector((5.0, s * 0.55, zt - 0.08)), Vector((x1 + 0.7, s * 1.05, zs[0] - 0.55)), Vector((x1 + 0.08, y, zs[0] - 0.4))], 0.085, M['rubber'], rad=0.5)
        for xx in (6.8, 5.6): ring('Leitungsschelle', 0.1, 0.02, (xx, s * (0.3 + (7.9 - xx) * 0.09), zt - 0.07), (1, 0, 0), M['gun'], 16)

# =====================================================================================
# 6. Seiten: Tür mit runden Ecken (an Backbord), Ladeschleuse mit Irisblende, Bullaugen, Klappen, Scheinwerfer
# =====================================================================================
DOOR = (4.2, 5.3, 2.78, 4.62, 0.24)
def door_ladder():
    x0, x1, z0, z1, rad = DOOR
    side_patch('Tuerblatt', x0, x1, z0, z1, rad, 1, 0.012, M['w2'], col=C_PART)
    side_frame('Tuerrahmen', x0 - 0.04, x1 + 0.04, z0 - 0.04, z1 + 0.04, rad + 0.04, 1, 0.045, 0.03, M['gun'], col=C_PART)
    side_patch('Tuerfenster', 4.55, 4.95, 4.0, 4.45, 0.15, 1, 0.022, M['rauchglas'], 6, 6, col=C_PART)
    side_frame('Fensterrahmen', 4.53, 4.97, 3.98, 4.47, 0.16, 1, 0.02, 0.02, M['gun'], col=C_PART)
    t = t_for_z(x1 - 0.17, 3.7, 1); p = hull_point(x1 - 0.17, t); n = hull_normal(x1 - 0.17, t)
    pipe('Tuergriff', [p + n * 0.02 + Vector((0, 0, -0.14)), p + n * 0.07 + Vector((0, 0, -0.1)), p + n * 0.07 + Vector((0, 0, 0.1)), p + n * 0.02 + Vector((0, 0, 0.14))], 0.016, M['warnrw'], rad=0.03)
    for x in (x0 - 0.2, x1 + 0.2):      # Haltegriffe neben der Tür
        ta, tb = t_for_z(x, 3.0, 1), t_for_z(x, 4.3, 1); a, b = hull_point(x, ta), hull_point(x, tb); na, nb = hull_normal(x, ta), hull_normal(x, tb)
        pipe('Haltegriff', [a + na * 0.01, a + na * 0.09, b + nb * 0.09, b + nb * 0.01], 0.017, M['warnrw'], rad=0.04)
    t = t_for_z(4.75, z1 + 0.18, 1); sphere('Tuerlicht', 0.035, *(hull_point(4.75, t) + hull_normal(4.75, t) * 0.02), M['e_green'], 10)
    tz = t_for_z(4.75, z0 - 0.05, 1); top = hull_point(4.75, tz) + Vector((0, 0.06, -0.02)); bot = Vector((4.75, top.y + 0.7, 0.03)); d = bot - top; n = int(d.length / 0.3)
    CUR[0] = C_GEAR
    for off in (-0.22, 0.22): o = Vector((off, 0, 0)); pipe('Leiterholm', [top + o, bot + o], 0.022, M['mittel'])
    for k in range(1, n): p = top + d * (k / n); pipe('Leitersprosse', [p + Vector((-0.22, 0, 0)), p + Vector((0.22, 0, 0))], 0.015, M['steel'])
    for off in (-0.22, 0.22): cyl('Leiterfuss', 0.06, 0.04, bot.x + off, bot.y, 0.02, M['rubber'], 'Z', n=12)
    ANCH['tuer'] = hull_point(4.75, t_for_z(4.75, 3.4, 1))
def iris_port(s):      # runde Ladeschleuse: Wulstring, versenkte Irisblende, Leuchtpunkte
    x = 2.45; t = s * PI / 2
    with Part('Ladeschleuse', place(x, t, 0.0), C_PART):
        ring('Schleusenwulst', 0.6, 0.07, (0, 0, 0.03), (0, 0, 1), M['gun'], 64)
        ring('Schleuseninnenring', 0.5, 0.025, (0, 0, 0.0), (0, 0, 1), M['rot'], 64)
        cyl('Schleusengrund', 0.53, 0.05, 0, 0, -0.01, M['dunkel'], 'Z', n=64)
        for k in range(10):
            a = 2 * PI * k / 10; ob = box('Irisblatt', 0.42, 0.2, 0.025, 0, 0, 0, M['w2'], 0.006)
            ob.matrix_basis = RZ(a) @ Matrix.Translation((0.22, 0.06, 0.02)) @ RZ(0.55)
        cyl('Irismitte', 0.09, 0.05, 0, 0, 0.03, M['e_teal'], 'Z', n=24)
        for k in range(8): a = 2 * PI * k / 8 + 0.2; sphere('Schleusenlicht', 0.022, 0.66 * math.cos(a), 0.66 * math.sin(a), 0.06, M['e_white'] if k % 2 else M['e_teal'], 8)
    ANCH['schleuse%d' % s] = hull_point(x, t)
def portholes():      # Bullaugen an Steuerbord (gegenüber der Tür), oberhalb der Mitte
    for x in (4.15, 4.85, 5.55):
        t = -(PI / 2 - 0.42)
        with Part('Bullauge', place(x, t, 0.0), C_PART):
            ring('Bullaugenring', 0.17, 0.035, (0, 0, 0.02), (0, 0, 1), M['gun'], 40); cyl('Bullaugenglas', 0.16, 0.02, 0, 0, 0.012, M['fenster'], 'Z', n=40)
            for k in range(8): a = 2 * PI * k / 8; sphere('Bullaugenniet', 0.012, 0.215 * math.cos(a), 0.215 * math.sin(a), 0.01, M['steel'], 6)
def hatches():      # runde Wartungsklappen und Fugenkreise, Lufteinlässe mit runden Enden
    for x, t, r in ((0.2, 0.0, 0.32), (-1.9, 0.0, 0.25), (2.6, 0.55, 0.22), (2.6, -0.55, 0.22), (-2.4, 1.15, 0.2), (-2.4, -1.15, 0.2), (-8.9, 1.25, 0.2), (-8.9, -1.25, 0.2), (6.9, 1.9, 0.18), (6.9, -1.9, 0.18)):
        hull_circle('Klappenfuge', x, t, r, 0.012, 0.004, M['frame'], 0.002)
        p = place(x + r * 0.62, t, 0.004)
        with Part('Klappenriegel', p, C_PART): box('Riegel', 0.07, 0.04, 0.012, 0, 0, 0.004, M['gun'], 0.003)
    for s in (1, -1):
        for x in (-1.0, -6.6):
            t = s * 1.05; k = t_rate(x, t)
            hull_band('Einlassrand', [(x + 0.32 * math.cos(a) * (1.6 if abs(math.cos(a)) > 0.1 else 1.6), t + 0.13 * math.sin(a) / k) for a in [2 * PI * i / 48 for i in range(48)]], 0.025, 0.02, M['gun'], True)
            with Part('Einlassgitter', place(x, t, 0.004), C_PART):
                for j in range(7): box('Gitterstab', 0.035, 0.18, 0.012, -0.36 + j * 0.12, 0, 0.0, M['dunkel'], 0.002)
def lights_rcs():
    for s in (1, -1):      # Scheinwerfer in runden Gehäusen unten seitlich an der Nase
        t = s * 2.05
        with Part('Scheinwerfer', place(10.0, t, 0.0), C_PART):
            ring('Lampenring', 0.13, 0.03, (0, 0, 0.02), (0, 0, 1), M['gun'], 32); cyl('Lampenglas', 0.12, 0.02, 0, 0, 0.012, M['blitz'], 'Z', n=32)
        p = hull_point(10.0, t) + hull_normal(10.0, t) * 0.1
        spot_ = bpy.data.lights.new('Arbeitsscheinwerfer', 'SPOT'); spot_.energy = 450; spot_.spot_size = math.radians(55); spot_.color = (1, 0.95, 0.85)
        so = bpy.data.objects.new('Arbeitsscheinwerfer', spot_); C_LITE.objects.link(so); so.location = p; so.rotation_euler = Vector((4, s * 0.4, -2.5)).to_track_quat('-Z', 'Y').to_euler()
        for x, tt in ((9.2, s * 1.35), (-9.7, s * 1.2), (-9.7, s * 2.1), (-1.6, s * 2.25)):      # Steuerdüsen in runden Töpfen
            with Part('Steuerduese', place(x, tt, 0.0), C_PART):
                cyl('Duesentopf', 0.12, 0.1, 0, 0, 0.05, M['gun'], 'Z', n=24); ring('Topfring', 0.12, 0.015, (0, 0, 0.1), (0, 0, 1), M['mittel'], 24)
                for k in range(3): a = 2 * PI * k / 3; cyl('Duesenmund', 0.03, 0.05, 0.055 * math.cos(a), 0.055 * math.sin(a), 0.12, M['dunkel'], 'Z', n=12, r2=0.04)
    with Part('Kinnfenster', place(9.75, PI, 0.0), C_PART):
        ring('Kinnfensterring', 0.3, 0.035, (0, 0, 0.02), (0, 0, 1), M['gun'], 48); cyl('Kinnglas', 0.29, 0.02, 0, 0, 0.012, M['rauchglas'], 'Z', n=48)

# =====================================================================================
# 7. Beine: Federbein mit Verkleidung, Knie, runder Fußteller
# =====================================================================================
def landing_leg(name, x, y, inner, out, under_nacelle=False, tag=''):
    # Landebein: Schacht mit zwei offenen Klappen, Lagerbock mit Bolzen, Federbein (Zylinder, verchromter Kolben, Stopfbuchse, Abstreifer),
    # Scherenlenker vorn, Knickstrebe nach innen mit Verriegelung, Stellzylinder, Hydraulikleitungen mit Schellen, Fahrwerkslicht,
    # Kugelgelenk mit Gabel, Fußteller mit Rippen, Rand, Gummisohle, Bodensensor und Zurraugen
    s = 1 if y >= 0 else -1; loc, _ = surf(x, y, -1); zt = loc.z
    H = Vector((x, y, zt - 0.2)); A = Vector((x - 0.06, y + s * out, 0.56)); ax = A - H; u = ax.normalized()
    side = u.cross(Vector((1, 0, 0))).normalized(); fw = side.cross(u).normalized()
    if fw.x < 0: fw = -fw
    P = lambda f: H + ax * f
    with Part(name, T(0, 0, 0), C_GEAR):
        # Schacht: dunkler Grund, Rahmen, zwei Klappen vorn und hinten (gelenkig, halb offen), Klappenzylinder
        slab('Schachtgrund', (x, y, zt - 0.004), (1, 0, 0), (0, 1, 0), (1.1, 0.78, 0.02), M['dunkel'], 0.005)
        for dx in (-0.56, 0.56): slab('Schachtrahmen', (x + dx, y, zt - 0.012), (1, 0, 0), (0, 1, 0), (0.05, 0.86, 0.035), M['gun'], 0.005)
        for dy in (-0.41, 0.41): slab('Schachtrahmen', (x, y + dy, zt - 0.012), (1, 0, 0), (0, 1, 0), (1.17, 0.05, 0.035), M['gun'], 0.005)
        for sx in (-1, 1):
            hinge = Vector((x + sx * 0.55, y, zt - 0.03)); dr = Vector((sx * math.sin(math.radians(24)), 0, -math.cos(math.radians(24))))
            c = hinge + dr * 0.27
            slab('Schachtklappe', c, dr, (0, 1, 0), (0.54, 0.74, 0.035), M['w1'], 0.012)
            slab('Klappenrippe', c - Vector((sx, 0, 0)) * 0.03, dr, (0, 1, 0), (0.46, 0.05, 0.04), M['gun'], 0.008)
            rod('Klappenscharnier', hinge - Vector((0, 0.36, 0)), hinge + Vector((0, 0.36, 0)), 0.025, M['chrom'], 12)
            a0 = Vector((x + sx * 0.3, y + 0.25, zt - 0.03)); a1 = hinge + dr * 0.32 + Vector((-sx * 0.03, 0.25, 0))
            rod('Klappenzylinder', a0, a0.lerp(a1, 0.6), 0.025, M['gun'], 12); rod('Klappenkolben', a0.lerp(a1, 0.55), a1, 0.014, M['chrom'], 10)
        # Lagerbock mit Querbolzen
        slab('Lagerbock', (x, y, zt - 0.1), (1, 0, 0), (0, 1, 0), (0.42, 0.36, 0.2), M['gun'], 0.025)
        rod('Lagerbolzen', H - Vector((0.3, 0, 0)), H + Vector((0.3, 0, 0)), 0.065, M['chrom'], 20)
        for sx in (-1, 1): rod('Bolzenkappe', H + Vector((sx * 0.27, 0, 0)), H + Vector((sx * 0.33, 0, 0)), 0.095, M['gun'], 24)
        # Federbein
        rod('Federbein', P(0.0), P(0.58), 0.165, M['grau2'] if 'grau2' in M else M['w2'], 36)
        for f in (0.05, 0.3, 0.56): ring('Beinring', 0.172, 0.018, tuple(P(f)), tuple(u), M['gun'], 36)
        rod('Warnband', P(0.44), P(0.52), 0.168, M['warnrw'], 36)
        rod('Stopfbuchse', P(0.57), P(0.61), 0.185, M['gun'], 36)
        rod('Kolben', P(0.55), P(0.95), 0.108, M['chrom'], 36)
        rod('Abstreifer', P(0.605), P(0.625), 0.122, M['rubber'], 36)
        rod('Gabelkopf', P(0.93), P(1.0), 0.15, M['gun'], 28)
        # Scherenlenker vorn (überträgt das Drehmoment vom Zylinder auf den Kolben)
        t0, t1 = P(0.585) + fw * 0.2, P(0.94) + fw * 0.18; kn = (t0 + t1) / 2 + fw * 0.26
        link_bar('Lenkeransatz', P(0.585) + fw * 0.1, t0, 0.09, 0.05, side, M['gun']); link_bar('Lenkeransatz', P(0.94) + fw * 0.1, t1, 0.09, 0.05, side, M['gun'])
        link_bar('Scherenlenker', t0, kn, 0.085, 0.035, side, M['mittel']); link_bar('Scherenlenker', kn, t1, 0.085, 0.035, side, M['mittel'])
        for p in (t0, kn, t1): rod('Lenkerbolzen', p - side * 0.06, p + side * 0.06, 0.022, M['chrom'], 12)
        # Knickstrebe nach innen mit Gelenk und Verriegelung
        B0 = surf(x + 0.15, inner, -1)[0] + Vector((0, 0, -0.06)); B1 = P(0.4) - side * s * 0.0; Bk = B0.lerp(B1, 0.5) + Vector((0, 0, -0.18))
        slab('Strebenbock', B0 + Vector((0, 0, 0.03)), (1, 0, 0), (0, 1, 0), (0.24, 0.2, 0.1), M['gun'], 0.015)
        rod('Strebe', B0, Bk, 0.055, M['gun'], 20); rod('Strebe', Bk, B1, 0.055, M['gun'], 20)
        rod('Strebengelenk', Bk - Vector((0.08, 0, 0)), Bk + Vector((0.08, 0, 0)), 0.075, M['mittel'], 20)
        rod('Verriegelung', Bk, P(0.22), 0.028, M['rot'], 12); sphere('Riegelauge', 0.04, *P(0.22), M['gun'], 10)
        ring('Strebenschelle', 0.18, 0.03, tuple(P(0.4)), tuple(u), M['gun'], 36)
        # Stellzylinder (fährt das Bein ein)
        R0 = Vector((x - 0.32, y - s * 0.22, zt - 0.08)); R1 = P(0.2) - fw * 0.18
        rod('Stellzylinder', R0, R0.lerp(R1, 0.6), 0.068, M['gun'], 24); rod('Stellkolben', R0.lerp(R1, 0.55), R1, 0.038, M['chrom'], 16)
        sphere('Zylinderauge', 0.07, *R0, M['gun'], 12); sphere('Kolbenauge', 0.06, *R1, M['gun'], 12)
        # Hydraulikleitungen mit Schellen
        for k, off in enumerate((0.1, -0.1)):
            pts = [H + side * off + Vector((0, 0, 0.12)), P(0.08) + side * off - fw * 0.2, P(0.5) + side * off - fw * 0.2, P(0.88) + side * off * 0.8 - fw * 0.15, P(0.95) + side * off * 0.6 - fw * 0.1]
            pipe('Hydraulikleitung', pts, 0.016, M['rubber'], rad=0.1)
        for f in (0.2, 0.36): ring('Leitungsschelle', 0.21, 0.012, tuple(P(f) - fw * 0.02), tuple(u), M['mittel'], 36)
        sphere('Fahrwerkslicht', 0.04, *(P(0.08) + fw * 0.19), M['blitz'], 12); rod('Lichtgehaeuse', P(0.08) + fw * 0.15, P(0.08) + fw * 0.2, 0.05, M['gun'], 16)
        if tag: text(tag, 0.07, tuple(P(0.18) + fw * 0.168), tuple((-u).cross(fw)), tuple(-u), M['txtd'], align='CENTER', name='Beinschrift')
        # Fuß: Gabel, Kugelgelenk, Teller
        for sd in (1, -1): link_bar('Fussgabel', P(0.96) + side * sd * 0.16, A + side * sd * 0.16 + Vector((0, 0, -0.02)), 0.12, 0.04, side, M['gun'])
        sphere('Kugelgelenk', 0.14, *A, M['chrom'], 24)
        F = Vector((A.x, A.y, 0.0))
        rod('Tellernabe', F + Vector((0, 0, 0.2)), F + Vector((0, 0, 0.46)), 0.16, M['gun'], 32, r2=0.11)
        rod('Fussteller', F + Vector((0, 0, 0.07)), F + Vector((0, 0, 0.2)), 0.5, M['grau2'] if 'grau2' in M else M['w2'], 48, r2=0.4)
        rod('Sohle', F, F + Vector((0, 0, 0.07)), 0.48, M['rubber'], 48)
        ring('Tellerrand', 0.5, 0.024, tuple(F + Vector((0, 0, 0.075))), (0, 0, 1), M['gun'], 48)
        for k in range(8):
            a = 2 * PI * k / 8; slab('Tellerrippe', F + Vector((0.27 * math.cos(a), 0.27 * math.sin(a), 0.2)), (math.cos(a), math.sin(a), 0), (-math.sin(a), math.cos(a), 0), (0.24, 0.03, 0.09), M['gun'], 0.006)
        rod('Bodensensor', F + Vector((0.42, 0, 0.21)), F + Vector((0.42, 0, 0.02)), 0.022, M['mittel'], 10); sphere('Sensorlampe', 0.025, *(F + Vector((0.42, 0, 0.23))), M['e_green'], 8)
        for sd in (1, -1): ring('Zurrauge', 0.045, 0.012, tuple(F + Vector((-0.1, sd * 0.53, 0.1))), (1, 0, 0), M['mittel'], 14)
    if under_nacelle: ANCH['bein'] = Vector((A.x, A.y, 0.15))

# =====================================================================================
# 8. Beschriftung
# =====================================================================================
def tail_and_pipes():
    xz = zc_of(XE)
    with Part('Heckduese', T(XE, 0, xz), C_PART):      # kleine Hilfsdüse in der Heckplatte
        ring('Heckring', 0.42, 0.04, (0, 0, 0), (1, 0, 0), M['gun'], 48)
        bell('Hilfsduese', 0.26, 0.31, 0.32, -0.02, M['duese'], 40)
        cyl('Hilfsglut', 0.25, 0.03, -0.12, 0, 0, M['glut'], 'X', n=32); cyl('Hilfskegel', 0.1, 0.3, -0.2, 0, 0, M['dunkel'], 'X', n=24, r2=0.02)
        for s in (1, -1): sphere('Hecklicht', 0.04, -0.02, s * 0.33, 0.28, M['nav_r'], 10)
    for s in (1, -1):      # zwei Leitungen an der unteren Flanke vom vorderen zum hinteren Wulst, mit Schellen
        for t0, rr in ((2.02, 0.05), (2.2, 0.035)):
            pts = [hull_point(x, s * t0) + hull_normal(x, s * t0) * (rr + 0.02) for x in [1.4 - k * 0.25 for k in range(21)]]
            pipe('Flankenleitung', pts, rr, M['gun' if rr > 0.04 else 'rot'])
            for k in range(0, 21, 4):
                x = 1.4 - k * 0.25; c = hull_point(x, s * t0) + hull_normal(x, s * t0) * (rr + 0.02)
                ring('Schelle', rr + 0.012, 0.012, tuple(c), (1, 0, 0), M['mittel'], 16)
def dorsal_spine():      # Rückengrat vorn zwischen Kuppel und Wulst, Handläufe, Dachluke, Radarschale
    hull_band('Rueckengrat', [(6.0 - i * 0.1, 0.0) for i in range(43)], 0.2, 0.07, M['w2'])
    for s in (1, -1):
        pts = []
        for i in range(9):
            x = 5.7 - i * 0.45; tt = s * 0.32; p = hull_point(x, tt); n = hull_normal(x, tt); pts.append(p + n * 0.09)
            if i % 2 == 0: sphere('Handlaufstuetze', 0.02, *(p + n * 0.045), M['mittel'], 8)
        pipe('Handlauf', pts, 0.016, M['warnrw'])
    hull_circle('Dachluke', 3.0, 0.0, 0.34, 0.03, 0.025, M['gun']); hull_circle('Dachlukenfuge', 3.0, 0.0, 0.28, 0.01, 0.004, M['frame'], 0.002)
    with Part('Lukengriff', place(3.0, 0.0, 0.004), C_PART): pipe('Griff', [Vector((-0.08, 0, 0)), Vector((-0.06, 0, 0.05)), Vector((0.06, 0, 0.05)), Vector((0.08, 0, 0))], 0.012, M['warnrw'])
    with Part('Radar', place(-0.6, 0.0, 0.0), C_PART):
        cyl('Radarsockel', 0.12, 0.08, 0, 0, 0.04, M['gun'], 'Z', n=24); cyl('Radarmast', 0.035, 0.35, 0, 0, 0.25, M['mittel'], 'Z', n=12)
        with Part('Radarschale', T(0, 0, 0.45) @ RY(math.radians(-25)), C_PART):
            ob = sphere('Schale', 0.32, 0, 0, 0, M['w1'], 32); ob.scale = (0.25, 1, 1)
            ring('Schalenrand', 0.3, 0.015, (0.03, 0, 0), (1, 0, 0), M['gun'], 32); cyl('Speisehorn', 0.02, 0.3, 0.18, 0, 0, M['mittel'], 'X', n=10); sphere('Hornkopf', 0.04, 0.33, 0, 0, M['rot'], 10)
    # Haube: Mittelschiene, Warnstreifen vorn, zwei Peitschenantennen hinten
    xs = [-4.1 - i * 0.25 for i in range(20)]
    pipe('Haubenschiene', [Vector((x, 0, params(x)[1] - 0.12 + 0.48 * math.sqrt(max(0.0, 1 - ((x + 6.75) / 3.0) ** 4)) ** 0.8 + 0.02)) for x in xs], 0.025, M['gun'])
    for x in (-5.2, -5.6, -6.0):
        for s in (1, -1): box('Haubenwarnung', 0.16, 0.5, 0.012, x, s * 0.42, params(x)[1] + 0.31, M['warnrw'], 0.003, rot=(s * math.radians(-24), 0, 0))
    for s in (1, -1):
        x = -9.3; z = params(x)[1] + 0.05
        cyl('Antennenfuss', 0.04, 0.06, x, s * 0.4, z, M['gun'], 'Z', n=12); cyl('Peitschenantenne', 0.008, 1.3, x, s * 0.4, z + 0.68, M['dunkel'], 'Z', n=6); sphere('Antennenspitze', 0.018, x, s * 0.4, z + 1.34, M['nav_r'], 8)
def belly():      # Unterseite: Kiel, runde Klappen, Antennen, Abläufe, rote Bauchlichter, Begrenzungslichter
    hull_band('Kiel', [(6.2 - i * 0.2, PI) for i in range(78)], 0.24, 0.06, M['gun'])
    for x in (4.6, 2.9, -0.6, -2.4, -6.2, -8.0):
        for s in (1, -1): hull_circle('Bauchklappe', x, PI + s * 0.35, 0.22, 0.012, 0.004, M['frame'], 0.002)
    for x in (3.8, -4.6):
        with Part('Bauchantenne', place(x, PI + 0.6, 0.0), C_PART):
            out = fillet([(0.2, 0.0), (-0.05, 0.22), (-0.2, 0.24), (-0.2, 0.0)], 0.07, 6); prism('Antenne', [(p[0], p[1]) for p in out], -0.014, 0.014, M['dunkel'], 'Y', 0.004)
    for x in (5.4, 0.0, -7.2): sphere('Bauchlicht', 0.05, *(hull_point(x, PI) + Vector((0, 0, -0.07))), M['nav_r'], 10)
    for s in (1, -1):
        for x in (1.0, -3.0, -8.6):
            p = hull_point(x, s * (PI - 0.75)); n = hull_normal(x, s * (PI - 0.75)); sphere('Ablauf', 0.035, *(p + n * 0.01), M['dunkel'], 10)
        for x in (5.8, 3.6, 0.4, -2.8, -8.2): sphere('Flankenlicht', 0.025, *(hull_point(x, s * 1.92) + hull_normal(x, s * 1.92) * 0.02), M['e_white'], 8)
def label_on(x, t, s_, size, m='txtd'):      # kleine Beschriftung, liegt auf der Fläche, lesbar von außen
    p = hull_point(x, t); n = hull_normal(x, t); Z = Vector((0, 0, 1))
    up = (Z - n * n.dot(Z)); up = up.normalized() if up.length > 0.2 else Vector((1, 0, 0))
    xd = up.cross(n).normalized()
    CUR[0] = C_DECAL
    text(s_, size, tuple(p + n * 0.006 - up * size * 0.35), tuple(xd), tuple(up), M[m], align='CENTER', name='Beschriftung')
def small_labels():
    for x, t, s_, sz, m in ((4.75, PI / 2 + 0.55, 'NOTÖFFNUNG', 0.055, 'txtd'), (5.65, PI / 2 - 0.15, 'EINSTIEG', 0.06, 'txtd'), (2.45, PI / 2 - 0.78, 'LADESCHLEUSE', 0.06, 'txtd'),
                            (2.45, -(PI / 2 - 0.78), 'LADESCHLEUSE', 0.06, 'txtd'), (8.2, 2.35, 'LASERBEREICH FREIHALTEN', 0.06, 'txtw'), (8.2, -2.35, 'LASERBEREICH FREIHALTEN', 0.06, 'txtw'),
                            (-2.4, 1.42, 'WARTUNG', 0.05, 'txtd'), (-2.4, -1.42, 'WARTUNG', 0.05, 'txtd'), (0.2, 0.42, 'NICHT AUFSTEIGEN', 0.05, 'txtd'),
                            (-8.9, 1.5, 'ERDUNG', 0.05, 'txtd'), (-8.9, -1.5, 'ERDUNG', 0.05, 'txtd'), (6.9, 2.15, 'SENSOR', 0.045, 'txtd'), (6.9, -2.15, 'SENSOR', 0.045, 'txtd')):
        label_on(x, t, s_, sz, m)
def markings():
    for s in (1, -1):
        r = nacelle_r(-7.4); yo = s * (NY + r + 0.012)
        text('ELSTER' if s > 0 else 'EL 03', 0.34, (-6.2 if s > 0 else -8.6, yo, NZ + 0.05), (-1, 0, 0) if s > 0 else (1, 0, 0), (0, 0, 1), M['txtw'], name='Name')
        emblem((-9.35 if s > 0 else -5.45, yo + s * 0.002, NZ + 0.22), (-1, 0, 0) if s > 0 else (1, 0, 0), (0, 0, 1), 0.24, M['txtw'])
        text('NICHT BETRETEN', 0.08, (-9.0 if s > 0 else -8.0, s * (NY + 0.3), NZ + r * 0.96), (-1, 0, 0) if s > 0 else (1, 0, 0), (0, s, 0.0) if False else (0, s * 0.3, 1), M['txtd'], align='CENTER', name='Beschriftung')
    W = bpy.data.objects
    stencil('VORSICHT LASER', 0.07, 8.0, 0.0, -1, (1, 0, 0), 'txto', target=W['Rumpf'])
    stencil('EL 03', 0.34, 0.95, 0.0, 1, (1, 0, 0), target=W['Rumpf'])
    for s in (1, -1):
        p = hull_point(3.0, s * (PI / 2 - 0.62)); n = hull_normal(3.0, s * (PI / 2 - 0.62))
        emblem(tuple(p + n * 0.006), (-1, 0, 0) if s > 0 else (1, 0, 0), tuple(Vector((0, 0, 1)) - n * n.z), 0.2, M['txtd'])

# =====================================================================================
# Bühnen (aus dem Würger), dazu Felsbrocken und Laserstrahl für die Abbau-Szene
# =====================================================================================
_view0 = view
def mining_scene():
    CUR[0] = C_STU
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
    rock = link(bpy.data.objects.new('Felsbrocken', me)); rock.location = (26.0, -1.2, 0.0); rock.scale = (1.25, 1.0, 0.82); rock.rotation_euler = (0.3, 0.5, 0.2)
    tx = bpy.data.textures.new('Felsform', 'CLOUDS'); tx.noise_scale = 1.4; tx.noise_depth = 3
    d = rock.modifiers.new('Form', 'DISPLACE'); d.texture = tx; d.strength = 2.4; d.mid_level = 0.5
    tx2 = bpy.data.textures.new('Felskanten', 'VORONOI'); tx2.noise_scale = 0.9
    d2 = rock.modifiers.new('Kanten', 'DISPLACE'); d2.texture = tx2; d2.strength = 0.7
    tx3 = bpy.data.textures.new('Felskorn', 'CLOUDS'); tx3.noise_scale = 0.25
    d3 = rock.modifiers.new('Korn', 'DISPLACE'); d3.texture = tx3; d3.strength = 0.18
    STAGE['rock'] = rock
    a = ANCH['laser_tip']; th = -LASER_ROT; dvec = Vector((math.cos(th), 0, -math.sin(th))); b = a + dvec * (20.9 - a.x) / dvec.x
    STAGE['beam'] = pipe('Laserstrahl', [a, b], 0.06, M['strahl'])
    STAGE['hot'] = sphere('Glutpunkt', 0.35, b.x + 0.1, b.y, b.z, M['strahl'], 12)
    pt = bpy.data.lights.new('Glutlicht', 'POINT'); pt.energy = 2500; pt.color = (1.0, 0.5, 0.2); pt.shadow_soft_size = 0.5
    po = bpy.data.objects.new('Glutlicht', pt); C_STU.objects.link(po); po.location = (b.x - 0.6, b.y, b.z + 0.3); STAGE['hotlight'] = po
    for k in range(14):
        r = random.Random(k); s = r.uniform(0.12, 0.4)
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=s)
        for v in bm.verts: v.co *= r.uniform(0.75, 1.2)
        me2 = bpy.data.meshes.new('Brocken'); bm.to_mesh(me2); bm.free(); me2.materials.append(M['felsen'])
        ob = link(bpy.data.objects.new('Brocken', me2)); t = r.uniform(0.35, 0.95); p = a.lerp(b, t); ob.location = (p.x, p.y + r.uniform(-1.6, 1.6), p.z + r.uniform(-1.0, 1.4)); ob.rotation_euler = (r.random() * 3, r.random() * 3, r.random() * 3); ob.scale = (1, r.uniform(0.6, 1), r.uniform(0.5, 0.9))
        STAGE.setdefault('brocken', []).append(ob)
    cam('Abbau', (6.0, 15.5, 7.5), (14.5, -0.5, 1.8), 28)
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
# Die Plattenfugen kommen im Bauplan aus markierten Kanten (Hauptfugen-Spanten und einige Längslinien des Rumpfnetzes)
# =====================================================================================
PLAN_W, PLAN_H = 2400, 1500
PLAN_FEAT = [  # Beschriftung, Ankerpunkt, Versatz des Textes in Pixeln
    ('GLASKUPPEL', 'kanzel', (-70, -150)), ('KUGELLASER', 'laser_tip', (-160, 70)), ('FANGSTRAHLER', 'fang-1', (-200, -40)),
    ('EINSTIEG MIT LEITER', 'tuer', (-170, 300)), ('LADESCHLEUSE', 'schleuse1', (-230, 105)), ('ERZKANISTER', 'kanister1', (-30, 250)),
    ('RUNDKLAMMERN', 'klammer1', (-250, -120)), ('KÜHLHAUBE', 'haube', (150, -110)), ('SENSORKUPPEL', 'kuppel', (-80, -160)),
    ('LÜFTEREINLASS', 'einlass1', (230, -60)), ('SCHUBDÜSEN', 'triebwerk1', (120, 140)), ('LANDEBEINE', 'bein', (150, 60)),
]
def plan_txt(ext):
    return ['HERSTELLER: BASTION-WERFT, DECK 3', 'MODELL: ELSTER (FASSUNG 2)', 'KLASSE: PROSPEKTOR (BERGBAU)', 'BESATZUNG: 1',
            'LÄNGE: %.1f M' % ext['laenge'], 'BREITE: %.1f M' % ext['breite'], 'HÖHE: %.1f M (MIT BEINEN)' % ext['hoehe'],
            'ERZ: 4 KANISTER JE 8 M³', 'BERGBAU: KUGELLASER, 4 FOKUSSPULEN', '2 FANGSTRAHLER', 'ANTRIEB: 2 MANTELTRIEBWERKE', 'KENNUNG: EL 03']
def mark_plan_edges():
    ob = bpy.data.objects['Rumpf']; me = ob.data; marks = HULL_GRID['marks']
    key = lambda i: tuple(round(c, 4) for c in me.vertices[i].co)
    want = set(tuple(e.vertices) for e in me.edges if tuple(sorted((key(e.vertices[0]), key(e.vertices[1])))) in marks)
    want = set(tuple(sorted(w)) for w in want)
    try:
        attr = me.attributes.get('freestyle_edge') or me.attributes.new('freestyle_edge', 'BOOLEAN', 'EDGE')
        for e in me.edges:
            if tuple(sorted(e.vertices)) in want: attr.data[e.index].value = True
    except Exception:
        for e in me.edges:
            if tuple(sorted(e.vertices)) in want: e.use_freestyle_mark = True
def bauplan(path):
    import numpy as np, tempfile
    from bpy_extras.object_utils import world_to_camera_view
    W, H = PLAN_W, PLAN_H; ext = extents()
    try: mark_plan_edges()
    except Exception as e: print('Kantenmarken:', e)
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
    fs = vl.freestyle_settings; fs.crease_angle = math.radians(140)
    ls = fs.linesets[0] if len(fs.linesets) else fs.linesets.new('Linien')
    ls.select_by_visibility = True; ls.select_by_edge_types = True; ls.select_silhouette = True; ls.select_border = True; ls.select_crease = True
    try: ls.select_edge_mark = True
    except Exception: pass
    if ls.linestyle is None: ls.linestyle = bpy.data.linestyles.new('Bauplanlinie')
    ls.linestyle.color = (0.05, 0.05, 0.06); ls.linestyle.thickness = 1.25
    setp(SC.view_settings, 'view_transform', 'Standard'); setp(SC.view_settings, 'look', 'None'); SC.view_settings.exposure = -0.35
    SC.cycles.samples = 24
    tmp = tempfile.gettempdir(); cxm = (ext['min'][0] + ext['max'][0]) / 2
    def shot(camn, rw, rh):
        SC.camera = CAMS[camn]; R.resolution_x, R.resolution_y = rw, rh; R.resolution_percentage = 100
        R.image_settings.file_format = 'PNG'; R.image_settings.color_mode = 'RGBA'
        p = os.path.join(tmp, 'els_plan_%s.png' % camn); R.filepath = p; bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(p); a = np.array(im.pixels[:], dtype=np.float32).reshape(rh, rw, 4)[::-1]; bpy.data.images.remove(im); return a
    c = CAMS['Schraeg']; c.location = (cxm + 22, 18, 9.0); c.rotation_euler = (Vector((cxm, 0, 2.8)) - c.location).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = 35
    side_scale = (ext['laenge'] + 1.2) * 1220 / 1180
    c = CAMS['Seite']; c.location = (cxm, 60, 3.1); c.data.ortho_scale = side_scale
    c = CAMS['Draufsicht']; c.location = (cxm, 0, 60); c.data.ortho_scale = side_scale * 720 / 540 * 1.0
    c = CAMS['Front']; c.location = (60, 0, 3.1); c.data.ortho_scale = (ext['breite'] + 0.6) * 540 / 330      # Bildbereich ist hochkant: Maßstab gilt für die längere Seite
    regions = {'Schraeg': (700, 150, 1660, 760), 'Seite': (40, 930, 1220, 540), 'Draufsicht': (1290, 930, 720, 540), 'Front': (2030, 930, 330, 540)}
    sheet = np.full((H, W, 3), 0.86, dtype=np.float32)
    for gx in range(0, W, 40): sheet[:, gx] *= 0.95
    for gy in range(0, H, 40): sheet[gy, :] *= 0.95
    for camn, (rx, ry, rw, rh) in regions.items():
        img = shot(camn, rw, rh); al = img[..., 3:4]
        sheet[ry:ry + rh, rx:rx + rw] = sheet[ry:ry + rh, rx:rx + rw] * (1 - al) + img[..., :3] * al
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
    def txt(s, size, sx, sy, align='LEFT'):
        cu = bpy.data.curves.new('t', 'FONT'); cu.body = s; cu.size = size; cu.align_x = align; cu.extrude = 0
        cu.materials.append(blk); ob = bpy.data.objects.new('t', cu); ts.collection.objects.link(ob); ob.location = T2(sx, sy)
    def line(p, q, wdt=2.0):
        p, q = T2(*p), T2(*q); d = q - p
        if d.length < 1: return
        bm = bmesh.new(); n = Vector((-d.y, d.x, 0)).normalized() * wdt / 2
        bm.faces.new([bm.verts.new(v) for v in (p - n, q - n, q + n, p + n)]); me = bpy.data.meshes.new('l'); bm.to_mesh(me); bm.free(); me.materials.append(blk)
        ts.collection.objects.link(bpy.data.objects.new('l', me))
    def rect(x0, y0, x1, y1, wdt=2.0):
        for p, q in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))): line(p, q, wdt)
    rect(20, 20, W - 20, H - 20, 3); line((20, 120), (W - 20, 120), 3); line((40, 900), (W - 40, 900), 1.5)
    txt('ELSTER', 64, 40, 98); txt('PROSPEKTOR · EIGENER ENTWURF DER BASTION · FASSUNG 2', 24, 330, 92)
    txt('BAUPLAN BL-0307-B', 22, W - 40, 70, 'RIGHT'); txt('BLATT 1 / 1 · MASSE IN METERN', 18, W - 40, 100, 'RIGHT')
    for i, s_ in enumerate(plan_txt(ext)): txt(s_, 24, 44, 200 + i * 40)
    line((40, 690), (640, 690), 1.5); txt('Einsitziges Bergbauschiff für Felsfelder und Monde.', 19, 44, 730)
    txt('Glatter Rumpf mit großer Glaskuppel, Kugellaser unter dem Kinn,', 19, 44, 760); txt('Erzkanister in Rundklammern, runde Manteltriebwerke.', 19, 44, 790)
    for lab, (rx, ry, rw, rh) in (('SCHRÄGANSICHT', regions['Schraeg']), ('SEITENANSICHT (BACKBORD)', regions['Seite']), ('DRAUFSICHT', regions['Draufsicht']), ('VORNE', regions['Front'])):
        txt(lab, 20, rx + 8, ry + rh - 4 if lab != 'SCHRÄGANSICHT' else ry + 26)
    rx, ry, rw, rh = regions['Schraeg']; SC.render.resolution_x, SC.render.resolution_y = rw, rh
    for lab, key, (dx, dy) in PLAN_FEAT:
        if key not in ANCH: continue
        v = world_to_camera_view(SC, CAMS['Schraeg'], ANCH[key]); px, py = rx + v.x * rw, ry + (1 - v.y) * rh
        tx, ty = px + dx, py + dy
        line((px, py), (tx, ty), 1.6); line((tx - 4, ty), (tx + 4, ty), 1.6)
        bm = bmesh.new(); bmesh.ops.create_circle(bm, cap_ends=True, segments=12, radius=4, matrix=Matrix.Translation(T2(px, py))); me = bpy.data.meshes.new('p'); bm.to_mesh(me); bm.free(); me.materials.append(blk); ts.collection.objects.link(bpy.data.objects.new('p', me))
        txt(lab, 20, tx + (8 if dx >= 0 else -8), ty - 8, 'LEFT' if dx >= 0 else 'RIGHT')
    rx, ry, rw, rh = regions['Seite']; sc = CAMS['Seite'].data.ortho_scale
    px0 = rx + rw / 2 + (ext['min'][0] - cxm) / sc * rw; px1 = rx + rw / 2 + (ext['max'][0] - cxm) / sc * rw; yy = ry + rh - 40
    line((px0, yy), (px1, yy), 1.5); line((px0, yy - 10), (px0, yy + 10), 1.5); line((px1, yy - 10), (px1, yy + 10), 1.5); txt('%.1f M' % ext['laenge'], 20, (px0 + px1) / 2, yy - 10, 'CENTER')
    tp = os.path.join(tmp, 'els_plan_text.png'); ts.render.filepath = tp; bpy.ops.render.render(write_still=True, scene=ts.name)
    im = bpy.data.images.load(tp); tx_ = np.array(im.pixels[:], dtype=np.float32).reshape(H, W, 4)[::-1, :, :3]; bpy.data.images.remove(im)
    sheet = sheet * np.clip(tx_, 0, 1)
    rgba = np.ones((H, W, 4), dtype=np.float32); rgba[..., :3] = sheet; o = bpy.data.images.new('Bauplan', W, H); o.pixels = rgba[::-1].ravel()
    o.filepath_raw = path; o.file_format = 'JPEG'; o.save()

HULL_GRID = {}
def build():
    global BVH
    hull, rings, XS = build_hull(); nl, nr = build_nacelle(1), build_nacelle(-1)
    BVH = make_bvh([hull, nl, nr])
    # Linien für den Bauplan als Koordinatenpaare merken (Hauptfugen-Spanten, einige Längslinien), vor dem Kuppelschnitt
    key = lambda v: tuple(round(c, 4) for c in v.co)
    marks = set()
    for sx in SEAM_X:
        r = rings[min(range(len(XS)), key=lambda k: abs(XS[k] - sx))]
        for k in range(NRING): marks.add(tuple(sorted((key(r[k]), key(r[(k + 1) % NRING])))))
    for k in (14, 34, 62, 82):
        for i in range(len(rings) - 1):
            if -10.0 < XS[i] < 6.2: marks.add(tuple(sorted((key(rings[i][k]), key(rings[i + 1][k])))))
    HULL_GRID['marks'] = marks
    cut_canopy(hull)
    mesh_obj('Rumpf', hull, HULL_MATS, True, C_HULL if 'C_HULL' in globals() else C_PART)
    for s, bm in ((1, nl), (-1, nr)): mesh_obj('Gondel ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_PART)
    canopy(); collars(); cockpit(); dorsal(); laser_turret(); ore_pods()
    for s in (1, -1): nacelle_parts(s); iris_port(s)
    door_ladder(); portholes(); hatches(); lights_rcs()
    for s in (1, -1):
        landing_leg('Bein vorn', 6.3, s * 1.05, s * 0.35, 0.62, tag='FW %d' % (1 if s > 0 else 2)); landing_leg('Bein hinten', -8.5, s * NY, s * (NY - 0.65), 0.28, under_nacelle=s > 0, tag='FW %d' % (3 if s > 0 else 4))
    tail_and_pipes(); dorsal_spine(); belly(); markings(); small_labels(); stages(); world('grau'); mining_scene()
    for nm, loc, yaw in (('Figur Studio', (5.4, 3.95, 0), -2.2), ('Figur Pilot', (5.7, 3.6, 0), -2.4), ('Figur Techniker', (6.8, 2.7, 0), 2.6)):
        if nm in bpy.data.objects: o = bpy.data.objects[nm]; o.location = loc; o.rotation_euler = (0, 0, yaw)
    for nm, loc, tgt, lens in (('Schraeg', (21, 17.5, 9.5), (-0.6, 0, 3.0), 45), ('Hangar', (18, 13.5, 5.5), (-0.6, 0.8, 2.9), 30), ('Heck', (-21, -15, 7), (-5.5, 0, 3.2), 40),
                               ('Cockpit', (8.9, 1.3, 6.6), (7.7, -0.1, 3.4), 24), ('Detail', (4.0, 9.0, 6.5), (-1.3, 2.4, 3.7), 35), ('Weltraum', (22, -15.5, 9), (-0.6, 0, 3.0), 45)):
        c = CAMS[nm]; c.location = loc; c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lens
    CAMS['Seite'].location = (-0.4, 60, 3.0); CAMS['Front'].location = (60, 0, 3.0); CAMS['Front'].data.ortho_scale = 17; CAMS['Seite'].data.ortho_scale = 27
    CAMS['Draufsicht'].data.ortho_scale = 46; CAMS['Draufsicht'].location = (-0.6, 0, 60)
    cam('Nase', (14.5, 6.5, 4.2), (8.5, 0, 3.4), 40); VIEWS['nase'] = ('Nase', 'grau', True, 0.1, 0.0)
    cam('Gondel', (-13.5, 8.5, 5.0), (-8.0, 3.1, 3.3), 35); VIEWS['gondel'] = ('Gondel', 'grau', True, 0.1, 0.0)
    cam('Unten', (7.0, 7.5, -11.0), (-1.2, 0, 2.6), 40); VIEWS['unten'] = ('Unten', 'weltraum', False, 1.3, 5.0)
    cam('Ruecken', (-14.0, -6.5, 11.5), (-3.0, 0, 4.8), 38); VIEWS['ruecken'] = ('Ruecken', 'grau', True, 0.1, 0.0)
    cam('Fahrwerk', (9.4, 5.2, 1.3), (6.2, 1.3, 1.0), 32); VIEWS['fahrwerk'] = ('Fahrwerk', 'grau', True, 0.2, 0.0)
    cam('Fahrwerk hinten', (-5.0, 7.2, 1.0), (-8.4, 3.3, 1.1), 32); VIEWS['fahrwerk2'] = ('Fahrwerk hinten', 'hangar', True, 0.7, 0.0)
    cam('Laser', (11.6, 3.6, 0.9), (9.0, 0, 1.35), 30); VIEWS['laser'] = ('Laser', 'grau', True, 0.2, 0.0)
    # Punkte fürs Spiel (Blender-Koordinaten): Düsenenden, Laserlinse, Fangstrahler-Linse, Umriss für die HUD-Silhouette
    fp = hull_point(9.55, 2.2) + hull_normal(9.55, 2.2) * 0.17 + Vector((0.13, 0, 0))
    anchors = {'duese': [NX1 - 0.6, NY, NZ], 'laser': list(ANCH['laser_tip']), 'kanone': list(fp),
               'umriss': [[round(x, 2), round(params(x)[0], 3)] for x in [XT] + [10.6, 10.2, 9.5, 8.5, 7.4, 5.6, 3.6, 1.9, 0.6, -2.6, -4.1, -5.6, -8.0, -10.0, -10.8, XE]],
               'kanister': [POD[0], POD[1], POD[2] - POD[4] - 0.07, POD[2] + POD[4] + 0.07], 'gondel': [NX0, NX1 - 0.6, NY - 1.06, NY + 1.06]}
    open(os.path.join(os.path.dirname(bpy.data.filepath) or os.path.dirname(_wk) + '/../elster', 'els-anker.json'), 'w').write(json.dumps(anchors))
    return {'ringe': len(XS)}
if not globals().get('NUR_HELFER_ELSTER'):
    result = build()
