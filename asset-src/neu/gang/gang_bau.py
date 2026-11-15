# Wartungsgang der Bastion (Deck 3, Kühlkreis B): eigener Entwurf, gebaut nach der Arbeitsweise aus der Star-Citizen-Studie
# (mittlere Polygonzahl, Fasen mit gewichteten Normalen, aufgesetzte Schilder und Teile, modulare Felder von 2 m).
# Aufruf in Blender:  exec(compile(open(PFAD).read(), PFAD, 'exec'))   → baut die Szene neu und legt Kameras an.
# Achsen: +Y den Gang entlang, Z oben, Gangmitte x = 0. Maße in Metern.
import bpy, bmesh, math, random
from mathutils import Vector, Matrix, Euler

random.seed(7)
W, H1, HC, CX, L, BAY = 1.7, 2.1, 2.9, 0.9, 10.0, 2.0      # halbe Breite, Wandhöhe, Deckenhöhe, halbe Deckenbreite, Länge, Feld
PI = math.pi

# ---------- Szene leeren ----------
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
    for d in list(coll):
        if d.users == 0: coll.remove(d)
SC = bpy.context.scene
def coll(name):
    c = bpy.data.collections.get(name)
    if not c: c = bpy.data.collections.new(name); SC.collection.children.link(c)
    return c
COL = {k: coll(k) for k in ('Rohbau', 'Boden', 'Decke', 'WandLinks', 'WandRechts', 'Tor', 'Schilder', 'Licht')}
CUR = [COL['Rohbau']]
def use(k): CUR[0] = COL[k]

# ---------- Materialien ----------
def I(node, *names):
    for n in names:
        if n in node.inputs: return node.inputs[n]
    raise KeyError(names)
def mk(name, col, metal=0.0, rough=0.5, var=0.18, rvar=0.12, scale=7.0, emit=None, es=0.0, grime=True, wear=0.0, bump=0.0, bscale=170.0, streak=0.0, studs=False, trans=0.0):
    # Lack oder Metall mit Leben: fleckige Helligkeit und Rauheit, Schmutz in Bodennähe und in Ecken (AO), Laufspuren von oben nach unten,
    # feine Struktur (Bump), an den Kanten blankes Metall (wear; nur in Cycles, dort liefert die Geometrie die Kantenlage), Noppen für Bodenplatten
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; K = nt.links
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); out = next(n for n in N if n.type == 'OUTPUT_MATERIAL')
    I(b, 'Base Color').default_value = (*col, 1); I(b, 'Metallic').default_value = metal; I(b, 'Roughness').default_value = rough
    if emit: I(b, 'Emission Color', 'Emission').default_value = (*emit, 1); I(b, 'Emission Strength').default_value = es
    if trans:
        try: I(b, 'Transmission Weight', 'Transmission').default_value = trans
        except Exception: pass
    tc = N.new('ShaderNodeTexCoord'); geo = N.new('ShaderNodeNewGeometry')
    def noise(sc, det=6.0, vec=None):
        n = N.new('ShaderNodeTexNoise'); I(n, 'Scale').default_value = sc; I(n, 'Detail').default_value = det
        K.new(vec or tc.outputs['Object'], n.inputs['Vector']); return n.outputs[0]
    def remap(sock, a, c, lo, hi):
        q = N.new('ShaderNodeMapRange'); I(q, 'From Min').default_value = a; I(q, 'From Max').default_value = c; I(q, 'To Min').default_value = lo; I(q, 'To Max').default_value = hi
        K.new(sock, I(q, 'Value')); return q.outputs[0]
    def mul(a, c):
        q = N.new('ShaderNodeMath'); q.operation = 'MULTIPLY'; K.new(a, q.inputs[0])
        if isinstance(c, float): q.inputs[1].default_value = c
        else: K.new(c, q.inputs[1])
        return q.outputs[0]
    val = None
    if var: val = remap(noise(scale, 8.0), 0.3, 0.7, 1 - var * 1.6, 1 + var * 0.5)
    if grime:
        sep = N.new('ShaderNodeSeparateXYZ'); K.new(geo.outputs['Position'], sep.inputs[0])
        g = remap(sep.outputs[2], 0.0, 0.5, 0.6, 1.0); val = mul(val, g) if val else g
        try:
            ao = N.new('ShaderNodeAmbientOcclusion'); I(ao, 'Distance').default_value = 0.14
            try: ao.samples = 4
            except Exception: pass
            val = mul(val, remap(ao.outputs['AO'], 0.55, 1.0, 0.5, 1.0))
        except Exception: pass
    if streak:
        mp = N.new('ShaderNodeMapping'); I(mp, 'Scale').default_value = (26, 26, 1.3); K.new(geo.outputs['Position'], mp.inputs['Vector'])
        st = remap(noise(1.0, 4.0, mp.outputs[0]), 0.5, 0.75, 1.0, 1 - streak); val = mul(val, st) if val else st
    if val:
        hsv = N.new('ShaderNodeHueSaturation'); I(hsv, 'Color').default_value = (*col, 1)
        K.new(val, I(hsv, 'Value')); K.new(hsv.outputs[0], I(b, 'Base Color'))
    if rvar:
        K.new(remap(noise(scale * 2.7), 0.3, 0.7, max(0.04, rough - rvar), min(1, rough + rvar * 1.4)), I(b, 'Roughness'))
    h = None
    if bump: h = mul(noise(bscale, 3.0), bump)
    if studs:      # Noppenblech
        vo = N.new('ShaderNodeTexVoronoi'); I(vo, 'Scale').default_value = 42.0
        try: I(vo, 'Randomness').default_value = 0.0
        except Exception: pass
        K.new(tc.outputs['Object'], vo.inputs['Vector'])
        h2 = remap(vo.outputs[0], 0.12, 0.3, 1.0, 0.0); h = h2 if h is None else h
    b2 = None
    if wear:
        b2 = N.new('ShaderNodeBsdfPrincipled'); I(b2, 'Base Color').default_value = (0.36, 0.34, 0.31, 1); I(b2, 'Metallic').default_value = 1.0; I(b2, 'Roughness').default_value = 0.34
        # Kantenlage: Abweichung zwischen der gerundeten Normale (Bevel-Knoten, nur Cycles) und der wahren Normale. Die eingebaute
        # „Pointiness“ taugt hier nicht: Sie wird je Eckpunkt gerechnet, und unsere großen Flächen haben nur Eckpunkte an den Kanten.
        bv = N.new('ShaderNodeBevel'); I(bv, 'Radius').default_value = 0.011
        try: bv.samples = 4
        except Exception: pass
        dt = N.new('ShaderNodeVectorMath'); dt.operation = 'DOT_PRODUCT'; K.new(bv.outputs[0], dt.inputs[0]); K.new(geo.outputs['Normal'], dt.inputs[1])
        inv = N.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = 1.0; K.new(dt.outputs['Value'], inv.inputs[1])
        edge = remap(inv.outputs[0], 0.004, 0.05, 0.0, 1.0)
        mask = mul(mul(edge, remap(noise(46.0, 5.0), 0.42, 0.6, 0.0, 1.0)), float(wear) * 0.85)
        ms = N.new('ShaderNodeMixShader'); K.new(mask, ms.inputs[0]); K.new(b.outputs[0], ms.inputs[1]); K.new(b2.outputs[0], ms.inputs[2]); K.new(ms.outputs[0], out.inputs['Surface'])
    if h is not None:
        bp = N.new('ShaderNodeBump'); I(bp, 'Strength').default_value = 0.6 if studs else 0.35; I(bp, 'Distance').default_value = 0.004 if studs else 0.0015
        K.new(h, I(bp, 'Height')); K.new(bp.outputs[0], I(b, 'Normal'))
        if b2: K.new(bp.outputs[0], I(b2, 'Normal'))
    return m
def stripes(name, a, c, scale=9.0, emit=0.0, direction='DIAGONAL', duty=0.5):      # Warnschraffur: schräge Bänder in zwei Farben
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; K = nt.links
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); I(b, 'Roughness').default_value = 0.6
    tc = N.new('ShaderNodeTexCoord'); wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = direction; I(wv, 'Scale').default_value = scale
    K.new(tc.outputs['Object'], wv.inputs['Vector'])
    gt = N.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = duty; K.new(wv.outputs[0], gt.inputs[0])
    mr = N.new('ShaderNodeMapRange'); cmb = N.new('ShaderNodeCombineXYZ')
    # Farbe aus drei Kanälen mischen (ohne Mix-Knoten, dessen Anschlüsse sich zwischen Blender-Fassungen ändern)
    outs = []
    for k in range(3):
        q = N.new('ShaderNodeMapRange'); I(q, 'To Min').default_value = c[k]; I(q, 'To Max').default_value = a[k]; K.new(gt.outputs[0], I(q, 'Value')); outs.append(q.outputs[0])
    N.remove(mr)
    for k in range(3): K.new(outs[k], cmb.inputs[k])
    K.new(cmb.outputs[0], I(b, 'Base Color'))
    if emit: K.new(cmb.outputs[0], I(b, 'Emission Color', 'Emission')); I(b, 'Emission Strength').default_value = emit
    return m

M = dict(
    wall=mk('Wand', (0.035, 0.04, 0.05), 0.55, 0.5, streak=0.35, bump=0.25, wear=0.5),
    wall2=mk('Wandfeld', (0.075, 0.085, 0.1), 0.45, 0.48, streak=0.4, bump=0.3, wear=0.8),
    frame=mk('Spant', (0.02, 0.022, 0.026), 0.8, 0.42, bump=0.2, wear=0.9),
    floor=mk('Bodenplatte', (0.03, 0.032, 0.036), 0.7, 0.5, scale=11, studs=True, wear=0.7),
    grate=mk('Rost', (0.05, 0.052, 0.056), 0.9, 0.38),
    white=mk('Lack weiss', (0.62, 0.62, 0.58), 0.0, 0.42, var=0.11, scale=4.0, streak=0.25, bump=0.3, wear=1.0),
    ochre=mk('Lack ocker', (0.72, 0.3, 0.03), 0.0, 0.45, var=0.25, bump=0.3, wear=1.0),
    teal=mk('Lack petrol', (0.02, 0.2, 0.19), 0.1, 0.4, var=0.2, bump=0.3, wear=1.0),
    red=mk('Lack rot', (0.45, 0.03, 0.02), 0.0, 0.4, var=0.2, bump=0.3, wear=0.9),
    steel=mk('Stahl blank', (0.45, 0.46, 0.48), 1.0, 0.3, var=0.12),
    copper=mk('Kupfer', (0.72, 0.35, 0.2), 1.0, 0.35, var=0.2),
    rubber=mk('Gummi', (0.012, 0.012, 0.013), 0.0, 0.75, var=0.1),
    cab=mk('Schrank', (0.16, 0.19, 0.2), 0.3, 0.45, streak=0.3, bump=0.3, wear=1.0),
    door=mk('Schranktuer', (0.21, 0.24, 0.25), 0.3, 0.42, streak=0.3, bump=0.3, wear=1.0),
    glass=mk('Glas', (0.02, 0.03, 0.035), 0.0, 0.06, var=0, rvar=0, grime=False),
    lens=mk('Schauglas', (0.9, 0.95, 1.0), 0.0, 0.03, var=0, rvar=0, grime=False, trans=1.0),
    oil=mk('Ölfleck', (0.006, 0.006, 0.006), 0.0, 0.06, var=0, rvar=0.03, grime=False),
    txtw=mk('Schrift hell', (0.7, 0.7, 0.66), 0.0, 0.55, var=0.3, grime=False),
    txtd=mk('Schrift dunkel', (0.03, 0.03, 0.035), 0.0, 0.6, var=0.2, grime=False),
    txto=mk('Schrift ocker', (0.8, 0.36, 0.04), 0.0, 0.55, var=0.3, grime=False),
    plate=mk('Schild weiss', (0.66, 0.66, 0.62), 0.0, 0.5, var=0.15, grime=False),
    platey=mk('Schild gelb', (0.78, 0.5, 0.03), 0.0, 0.5, var=0.15, grime=False),
    e_white=mk('Leuchte', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.82, 0.9, 1.0), es=14, grime=False),
    e_amber=mk('Licht bernstein', (1, 0.5, 0.1), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.42, 0.06), es=10, grime=False),
    e_teal=mk('Licht petrol', (0.1, 1, 0.9), 0, 0.3, var=0, rvar=0, emit=(0.1, 0.95, 0.8), es=8, grime=False),
    e_green=mk('LED gruen', (0.1, 1, 0.2), 0, 0.3, var=0, rvar=0, emit=(0.15, 1.0, 0.25), es=6, grime=False),
    e_red=mk('LED rot', (1, 0.1, 0.05), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.08, 0.04), es=6, grime=False),
    warn=stripes('Warnschraffur', (0.75, 0.33, 0.03), (0.02, 0.02, 0.022), 14),
    warn2=stripes('Warnschraffur Boden', (0.6, 0.27, 0.03), (0.03, 0.03, 0.034), 5),
    screen=stripes('Bildschirm', (0.08, 0.75, 0.65), (0.0, 0.06, 0.06), 34, emit=2.2, direction='Z', duty=0.42),
    crate=mk('Kiste', (0.1, 0.11, 0.1), 0.2, 0.55, bump=0.3, wear=1.0),
)

# ---------- Bauhelfer ----------
def link(ob): CUR[0].objects.link(ob); return ob
def finish(ob, bev, seg=2):
    if bev:
        for p in ob.data.polygons: p.use_smooth = True
        m = ob.modifiers.new('Fase', 'BEVEL'); m.width = bev; m.segments = seg; m.limit_method = 'ANGLE'; m.angle_limit = math.radians(40)
        try: m.harden_normals = True
        except Exception: pass
        wn = ob.modifiers.new('Normalen', 'WEIGHTED_NORMAL'); wn.keep_sharp = True; wn.weight = 60
    return ob
def box(name, sx, sy, sz, x, y, z, m, bev=0.006, rot=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = link(bpy.data.objects.new(name, me)); ob.location = (x, y, z)
    if rot: ob.rotation_euler = rot
    return finish(ob, bev)
def cyl(name, r, ln, x, y, z, m, axis='Z', n=24, bev=0.004, r2=None):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=n, radius1=r, radius2=r if r2 is None else r2, depth=ln)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = link(bpy.data.objects.new(name, me)); ob.location = (x, y, z)
    ob.rotation_euler = {'Z': (0, 0, 0), 'Y': (PI / 2, 0, 0), 'X': (0, PI / 2, 0)}[axis]
    for p in me.polygons: p.use_smooth = True
    if bev:
        mo = ob.modifiers.new('Fase', 'BEVEL'); mo.width = bev; mo.segments = 2; mo.limit_method = 'ANGLE'; mo.angle_limit = math.radians(50)
    wn = ob.modifiers.new('Normalen', 'WEIGHTED_NORMAL'); wn.keep_sharp = True
    if not bev:
        sm = ob.modifiers.new('Kanten', 'EDGE_SPLIT'); sm.split_angle = math.radians(50)
    return ob
def fillet(pts, rad, n=7):
    P = [Vector(p) for p in pts]
    if rad <= 0 or len(P) < 3: return P
    out = [P[0]]
    for i in range(1, len(P) - 1):
        A, B, C = P[i - 1], P[i], P[i + 1]
        d1, d2 = (A - B).normalized(), (C - B).normalized(); phi = d1.angle(d2)
        if phi > PI - 0.02: out.append(B); continue
        t = min(rad / math.tan(phi / 2), (A - B).length * 0.45, (C - B).length * 0.45); r = t * math.tan(phi / 2)
        O = B + (d1 + d2).normalized() * (r / math.sin(phi / 2)); S, E = B + d1 * t - O, B + d2 * t - O
        for k in range(n + 1): out.append(O + S.slerp(E, k / n).normalized() * S.length)      # slerp liefert Einheitsvektoren
    out.append(P[-1]); return out
def pipe(name, pts, r, m, rad=0.0, res=6, cyclic=False):
    Q = fillet(pts, rad)
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = res; cu.use_fill_caps = True; cu.twist_mode = 'MINIMUM'
    sp = cu.splines.new('POLY'); sp.points.add(len(Q) - 1); sp.use_cyclic_u = cyclic
    for i, q in enumerate(Q): sp.points[i].co = (q.x, q.y, q.z, 1)
    cu.materials.append(m)
    return link(bpy.data.objects.new(name, cu))
def ring(name, R, r, c, normal, m, n=28):      # Ring (Handrad, Leuchtring) um den Punkt c, Achse = normal
    nz = Vector(normal).normalized(); ax = nz.orthogonal().normalized(); ay = nz.cross(ax)
    c = Vector(c)
    return pipe(name, [c + ax * math.cos(a) * R + ay * math.sin(a) * R for a in [k * 2 * PI / n for k in range(n)]], r, m, cyclic=True)
def text(s, size, origin, xdir, ydir, m, align='LEFT', name='Schrift', sp=1.08):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = s; cu.size = size; cu.align_x = align; cu.space_character = sp
    cu.materials.append(m)
    ob = bpy.data.objects.new(name, cu); COL['Schilder'].objects.link(ob)
    X, Y = Vector(xdir).normalized(), Vector(ydir).normalized(); Z = X.cross(Y)
    mw = Matrix((X, Y, Z)).transposed().to_4x4(); mw.translation = Vector(origin) + Z * 0.0025
    ob.matrix_world = mw
    return ob
LEFT_X, LEFT_Y = (0, 1, 0), (0, 0, 1)       # Schrift auf der linken Wand (Blick nach −X)
RIGHT_X, RIGHT_Y = (0, -1, 0), (0, 0, 1)    # auf der rechten Wand (Blick nach +X)
END_X, END_Y = (1, 0, 0), (0, 0, 1)         # auf dem Tor am Gangende (Blick nach +Y)
def area(name, loc, rot, sx, sy, watt, col):
    li = bpy.data.lights.new(name, 'AREA'); li.shape = 'RECTANGLE'; li.size = sx; li.size_y = sy; li.energy = watt; li.color = col
    ob = bpy.data.objects.new(name, li); COL['Licht'].objects.link(ob); ob.location = loc; ob.rotation_euler = rot
    return ob
def point(name, loc, watt, col, r=0.05):
    li = bpy.data.lights.new(name, 'POINT'); li.energy = watt; li.color = col; li.shadow_soft_size = r
    ob = bpy.data.objects.new(name, li); COL['Licht'].objects.link(ob); ob.location = loc
    return ob
def bolts(x, ys, zs, m=None, axis='X', r=0.012, ln=0.012):
    for y in ys:
        for z in zs: cyl('Schraube', r, ln, x, y, z, m or M['steel'], axis, n=6, bev=0)

# =====================================================================================
# Rohbau: Hülle und Spanten
# =====================================================================================
use('Rohbau')
box('Wand L', 0.06, L, H1, -(W + 0.03), L / 2, H1 / 2, M['wall'], 0)
box('Wand R', 0.06, L, H1, W + 0.03, L / 2, H1 / 2, M['wall'], 0)
DL = math.hypot(W - CX, HC - H1)
for s in (-1, 1):
    box('Schräge', 0.06, L, DL + 0.1, s * ((W + CX) / 2 + 0.021), L / 2, (H1 + HC) / 2 + 0.021, M['wall'], 0, (0, -s * PI / 4, 0))
box('Decke', 2 * CX + 0.1, L, 0.06, 0, L / 2, HC + 0.03, M['wall'], 0)
for i in range(6):
    y = i * BAY
    for s in (-1, 1):
        box('Spant Pfosten', 0.13, 0.18, H1, s * (W - 0.065), y, H1 / 2, M['frame'], 0.012)
        box('Spant Schräge', 0.13, 0.18, DL + 0.06, s * ((W + CX) / 2 - 0.046), y, (H1 + HC) / 2 - 0.046, M['frame'], 0.012, (0, -s * PI / 4, 0))
        box('Spant Knoten', 0.2, 0.2, 0.2, s * (W - 0.09), y, H1 - 0.02, M['frame'], 0.02)
        box('Spant Fuß', 0.2, 0.24, 0.07, s * (W - 0.1), y, 0.035, M['frame'], 0.01)
        box('Spant Marke', 0.134, 0.184, 0.1, s * (W - 0.065), y, 1.32, M['ochre'], 0.004)
        bolts(s * (W - 0.135), [y - 0.055, y + 0.055], [0.3, 0.9, 1.7], axis='X')
    box('Spant Riegel', 2 * CX + 0.14, 0.18, 0.13, 0, y, HC - 0.065, M['frame'], 0.012)

# =====================================================================================
# Boden: seitliche Platten, Rost über dem Leitungsgraben, beleuchtete Sockel
# =====================================================================================
use('Boden')
GX = 0.55      # halbe Breite des Grabens
box('Grabenboden', 2 * GX + 0.1, L, 0.04, 0, L / 2, -0.3, M['frame'], 0)
for s in (-1, 1):
    box('Unterbau', W - GX, L, 0.3, s * (GX + (W - GX) / 2), L / 2, -0.165, M['frame'], 0)
    box('Rostrahmen', 0.05, L, 0.05, s * (GX - 0.005), L / 2, -0.012, M['steel'], 0.006)
    box('Randlinie', 0.05, L, 0.003, s * (GX + 0.09), L / 2, 0.0135, M['ochre'], 0)
    for i in range(5):
        box('Bodenplatte', W - GX - 0.24, BAY - 0.03, 0.024, s * (GX + 0.05 + (W - GX - 0.2) / 2), i * BAY + 1, 0, M['floor'], 0.005)
        bolts(0, [], [])
        for by in (0.12, BAY - 0.12):
            for bx in (GX + 0.14, W - 0.3):
                cyl('Plattenschraube', 0.014, 0.01, s * bx, i * BAY + by, 0.014, M['steel'], 'Z', n=6, bev=0)
    # Sockel mit Lichtband
    box('Sockel', 0.13, L, 0.2, s * (W - 0.065), L / 2, 0.1, M['frame'], 0.01)
    box('Sockelnase', 0.2, L, 0.035, s * (W - 0.1), L / 2, 0.2175, M['wall2'], 0.008)
slat = box('Roststab', 2 * GX - 0.06, 0.012, 0.034, 0, 0.03, -0.012, M['grate'], 0)
ar = slat.modifiers.new('Reihe', 'ARRAY'); ar.count = int((L - 0.06) / 0.042); ar.use_relative_offset = False; ar.use_constant_offset = True; ar.constant_offset_displace = (0, 0.042, 0)
for i in range(11):
    box('Rostträger', 2 * GX - 0.04, 0.05, 0.05, 0, i * 1.0 if i else 0.03, -0.045, M['steel'], 0.004)
for k in range(3):
    box('Roststrebe', 0.02, L, 0.03, (k - 1) * 0.3, L / 2, -0.03, M['grate'], 0)
# Leitungen im Graben
for k, (x, r, mat) in enumerate([(-0.4, 0.035, 'rubber'), (-0.3, 0.022, 'rubber'), (-0.22, 0.028, 'teal'), (0.05, 0.045, 'white'), (0.22, 0.02, 'copper'), (0.3, 0.02, 'copper'), (0.42, 0.03, 'rubber')]):
    pts = [(x + math.sin(i * 1.3 + k) * 0.025, i * 0.5, -0.27 + r + abs(math.sin(i * 0.9 + k * 2)) * 0.012) for i in range(21)]
    pipe('Grabenleitung', pts, r, M[mat])
for i in range(5):
    box('Grabenschelle', 2 * GX - 0.1, 0.04, 0.02, 0, i * BAY + 0.6, -0.2, M['steel'], 0.003)

# =====================================================================================
# Decke: Leuchten, Lüftungskanal links, Kabelrohre rechts
# =====================================================================================
use('Decke')
for i in range(5):
    y = i * BAY + 1
    box('Leuchte Gehäuse', 0.36, 1.34, 0.07, 0, y, HC - 0.035, M['frame'], 0.012)
    box('Leuchte Glas', 0.2, 1.14, 0.012, 0, y, HC - 0.074, M['e_white'], 0)
    for dy in (-0.62, 0.62): box('Leuchte Kappe', 0.3, 0.05, 0.085, 0, y + dy, HC - 0.04, M['wall2'], 0.006)
    for s in (-1, 1): box('Deckenfeld', CX - 0.26, BAY - 0.26, 0.02, s * (0.18 + (CX - 0.2) / 2), y, HC - 0.01, M['wall2'], 0.005)
ca = PI / 4
def onslope(s, t, off):      # Punkt auf der Deckenschräge: t = 0 unten (Wand) … 1 oben (Decke), off = Abstand in den Raum
    return (s * (W - (W - CX) * t - off * 0.7071), H1 + (HC - H1) * t - off * 0.7071)
x, z = onslope(-1, 0.5, 0.16)
box('Lüftungskanal', 0.34, L - 0.1, 0.24, x, L / 2, z, M['wall2'], 0.015, (0, PI / 4, 0))
for i in range(10):
    box('Kanalschelle', 0.37, 0.05, 0.27, x, i + 0.5, z, M['frame'], 0.006, (0, PI / 4, 0))
for i in (1, 3):      # Auslassgitter
    for k in range(7): box('Gitterlamelle', 0.012, 0.6, 0.006, *((lambda p: (p[0], i * BAY + 1, p[1]))(onslope(-1, 0.36 + k * 0.045, 0.285))), M['frame'], 0, (0, PI / 4, 0))
for k in range(5):
    x, z = onslope(1, 0.25 + k * 0.13, 0.035 + (0.012 if k % 2 else 0))
    cyl('Kabelrohr', 0.016 + (0.006 if k == 2 else 0), L - 0.06, x, L / 2, z, M['steel' if k != 2 else 'copper'], 'Y', n=12, bev=0)
for i in range(10):
    x, z = onslope(1, 0.5, 0.06)
    box('Rohrschelle', 0.03, 0.04, 0.62, x, i + 0.5, z, M['frame'], 0.004, (0, -PI / 4, 0))

# =====================================================================================
# Rechte Wand: ruhige Felder, Handlauf, Kabelbahn, Terminal, Feuerlöscher
# =====================================================================================
use('WandRechts')
XR = W
for i in range(5):
    y = i * BAY + 1
    box('Feld unten', 0.03, BAY - 0.26, 0.72, XR - 0.015, y, 0.66, M['wall2'], 0.008)
    box('Feld oben', 0.03, BAY - 0.26, 0.62, XR - 0.015, y, 1.56, M['wall2'], 0.008)
    bolts(XR - 0.032, [y - 0.8, y + 0.8], [0.36, 0.96, 1.3, 1.82])
    if i in (0, 3):      # Wartungsklappe
        box('Klappe', 0.022, 0.62, 0.44, XR - 0.04, y + 0.2, 0.66, M['wall'], 0.01)
        box('Klappengriff', 0.03, 0.16, 0.03, XR - 0.06, y + 0.2, 0.52, M['steel'], 0.006)
        bolts(XR - 0.054, [y - 0.07, y + 0.47], [0.48, 0.84])
    box('Handlaufhalter', 0.11, 0.03, 0.03, XR - 0.07, y - 0.5, 1.1, M['frame'], 0.004)
    box('Handlaufhalter', 0.11, 0.03, 0.03, XR - 0.07, y + 0.5, 1.1, M['frame'], 0.004)
pipe('Handlauf', [(XR - 0.05, 0.3, 1.0), (XR - 0.13, 0.3, 1.12), (XR - 0.13, L - 0.5, 1.12), (XR - 0.05, L - 0.5, 1.0)], 0.02, M['steel'], rad=0.06)
box('Kabelbahn', 0.2, L - 0.3, 0.015, XR - 0.12, L / 2, 1.93, M['steel'], 0.003)
box('Kabelbahn Rand', 0.012, L - 0.3, 0.06, XR - 0.22, L / 2, 1.955, M['steel'], 0.003)
for i in range(10): box('Kabelbahn Konsole', 0.2, 0.03, 0.05, XR - 0.11, i + 0.5, 1.9, M['frame'], 0.004)
for k in range(7):
    x = XR - 0.04 - k * 0.024; r = 0.008 + (k % 3) * 0.003
    pts = [(x + math.sin(i * 0.8 + k) * 0.004, 0.2 + i * 0.4, 1.94 + r + abs(math.sin(i * 1.7 + k)) * 0.004) for i in range(25)]
    pipe('Kabel', pts, r, M[['rubber', 'rubber', 'teal', 'rubber', 'ochre', 'rubber', 'copper'][k]])
# Terminal im dritten Feld
ty = 2 * BAY + 1
box('Terminal', 0.09, 0.56, 0.4, XR - 0.075, ty, 1.5, M['frame'], 0.014)
box('Terminal Bild', 0.006, 0.34, 0.22, XR - 0.122, ty - 0.07, 1.54, M['screen'], 0)
box('Terminal Rahmen', 0.01, 0.38, 0.26, XR - 0.118, ty - 0.07, 1.54, M['wall'], 0.004)
for k in range(4): box('Taste', 0.012, 0.035, 0.035, XR - 0.123, ty + 0.19, 1.63 - k * 0.055, M['wall2'] if k else M['ochre'], 0.004)
cyl('Terminal LED', 0.008, 0.01, XR - 0.122, ty + 0.19, 1.38, M['e_green'], 'X', n=10, bev=0)
pipe('Terminal Leitung', [(XR - 0.05, ty + 0.2, 1.7), (XR - 0.05, ty + 0.2, 1.9), (XR - 0.1, ty + 0.2, 1.94)], 0.012, M['rubber'], rad=0.03)
# Feuerlöscher im letzten Feld
fy = 4 * BAY + 0.55
box('Löscher Halter', 0.03, 0.3, 0.62, XR - 0.045, fy, 0.72, M['wall'], 0.008)
cyl('Löscher', 0.075, 0.46, XR - 0.14, fy, 0.68, M['red'], 'Z', n=20, bev=0.012)
cyl('Löscher Kopf', 0.03, 0.08, XR - 0.14, fy, 0.95, M['steel'], 'Z', n=12, bev=0.004)
box('Löscher Bügel', 0.02, 0.17, 0.03, XR - 0.07, fy, 0.78, M['steel'], 0.004)
pipe('Löscher Schlauch', [(XR - 0.14, fy, 0.97), (XR - 0.14, fy + 0.09, 0.96), (XR - 0.13, fy + 0.1, 0.6)], 0.01, M['rubber'], rad=0.03)

# =====================================================================================
# Linke Wand: Schaltschränke, Kühlkreis mit Pumpe, Wärmetauscher, Steigleiter
# =====================================================================================
use('WandLinks')
XL = -W
# --- Feld 1: drei Schaltschränke ---
for k in range(3):
    y = 0.42 + k * 0.58
    box('Schrank', 0.36, 0.55, 1.72, XL + 0.18, y, 0.88, M['cab'], 0.012)
    box('Schranktür', 0.02, 0.49, 1.5, XL + 0.368, y, 0.9, M['door'], 0.01)
    box('Türgriff', 0.03, 0.03, 0.2, XL + 0.39, y + 0.19, 0.95, M['steel'], 0.008)
    for hz in (0.4, 1.4): box('Scharnier', 0.025, 0.035, 0.09, XL + 0.375, y - 0.25, hz, M['frame'], 0.005)
    for q in range(6): box('Lüftungsschlitz', 0.012, 0.3, 0.012, XL + 0.38, y - 0.03, 1.4 + q * 0.03, M['frame'], 0)
    cyl('LED', 0.009, 0.012, XL + 0.38, y - 0.16, 1.6, M['e_green'], 'X', n=10, bev=0)
    cyl('LED', 0.009, 0.012, XL + 0.38, y - 0.12, 1.6, M['e_amber' if k != 1 else 'e_red'], 'X', n=10, bev=0)
    box('Typenschild', 0.004, 0.16, 0.05, XL + 0.38, y - 0.05, 1.22, M['white'], 0)
    text('S-0%d' % (k + 1), 0.1, (XL + 0.378, y - 0.17, 0.98), LEFT_X, LEFT_Y, M['txtw'])
    for dy in (-0.12, 0.1): pipe('Schrankleitung', [(XL + 0.14, y + dy, 1.72), (XL + 0.14, y + dy, 2.02), (XL + 0.06, y + dy, 2.06)], 0.018, M['steel'], rad=0.03)
box('Schranksockel', 0.4, 1.78, 0.04, XL + 0.2, 1.0, 0.02, M['frame'], 0.006)
box('Kabelkanal Schränke', 0.1, 1.8, 0.1, XL + 0.05, 1.0, 2.04, M['wall2'], 0.01)

# --- Felder 2 und 3: Hauptleitung, Petrol-Leitung, Kupferleitungen ---
XP, ZP = XL + 0.44, 1.62
cyl('Hauptleitung', 0.15, 4.84, XP, 4.36, ZP, M['white'], 'Y', n=28, bev=0)
for y in (2.45, 4.0, 5.55):
    cyl('Flansch', 0.2, 0.07, XP, y, ZP, M['steel'], 'Y', n=28, bev=0.006)
    for a in range(10): cyl('Flanschschraube', 0.012, 0.1, XP + math.cos(a * PI / 5) * 0.175, y, ZP + math.sin(a * PI / 5) * 0.175, M['frame'], 'Y', n=6, bev=0)
for y in (3.25, 4.8): cyl('Markierband', 0.1525, 0.14, XP, y, ZP, M['ochre'], 'Y', n=28, bev=0)
for y in (2.9, 4.45, 5.95):
    box('Rohrkonsole', 0.46, 0.06, 0.05, XL + 0.23, y, ZP - 0.2, M['frame'], 0.006)
    box('Rohrkonsole Strebe', 0.3, 0.04, 0.04, XL + 0.16, y, ZP - 0.32, M['frame'], 0.004, (0, PI / 4, 0))
    cyl('Rohrschelle', 0.158, 0.05, XP, y, ZP, M['frame'], 'Y', n=28, bev=0)
for y in (3.0, 5.0):      # Schieber mit Handrad
    cyl('Schieber', 0.075, 0.16, XP, y, ZP + 0.2, M['frame'], 'Z', n=16, bev=0.008)
    cyl('Schieberspindel', 0.016, 0.24, XP, y, ZP + 0.36, M['steel'], 'Z', n=10, bev=0)
    ring('Handrad', 0.11, 0.012, (XP, y, ZP + 0.46), (0, 0, 1), M['teal'])
    for a in range(3): box('Handradspeiche', 0.2, 0.014, 0.012, XP, y, ZP + 0.46, M['teal'], 0, (0, 0, a * PI / 3))
XT, ZT = XL + 0.2, 1.26
pipe('Petrol-Leitung', [(XT, 1.92, 2.0), (XT, 1.92, ZT), (XT, 6.72, ZT)], 0.055, M['teal'], rad=0.14)
for y in (2.6, 3.8, 5.0, 6.2): box('Petrol-Schelle', 0.2, 0.04, 0.14, XL + 0.11, y, ZT, M['frame'], 0.006)
for k in range(3):
    z = 0.4 + k * 0.05
    pipe('Kupferleitung', [(XL + 0.045, 1.9, z), (XL + 0.045, 7.9, z), (XL + 0.045, 7.9, 2.0)], 0.012, M['copper'], rad=0.06)
for y in [2.2 + i * 0.8 for i in range(8)]: box('Kupferschelle', 0.03, 0.03, 0.18, XL + 0.045, y, 0.45, M['frame'], 0.004)

for i in (1, 2):
    box('Feld oben L', 0.03, BAY - 0.26, 0.5, XL + 0.015, i * BAY + 1, 1.8, M['wall2'], 0.008)
    bolts(XL + 0.032, [i * BAY + 0.2, i * BAY + 1.8], [1.62, 1.98])
text('KÜHLKREIS B', 0.1, (XL + 0.032, 3.3, 1.86), LEFT_X, LEFT_Y, M['txtw'])
text('VORLAUF  >>>', 0.035, (XL + 0.032, 4.35, 1.885), LEFT_X, LEFT_Y, M['txto'])

# --- Pumpe (Felder 2 und 3) ---
PY = 3.0
box('Pumpe Rahmen', 0.6, 2.3, 0.08, XL + 0.32, 3.55, 0.3, M['frame'], 0.012)
for y in (2.5, 3.55, 4.6): box('Pumpe Fuß', 0.5, 0.08, 0.26, XL + 0.3, y, 0.13, M['frame'], 0.008)
box('Pumpe Warnkante', 0.012, 2.3, 0.07, XL + 0.626, 3.55, 0.3, M['warn'], 0)
box('Pumpe Gehäuse', 0.5, 1.15, 0.6, XL + 0.28, PY, 0.64, M['white'], 0.03)
box('Pumpe Haube', 0.34, 1.05, 0.2, XL + 0.2, PY, 1.02, M['white'], 0.03)
box('Pumpe Pult', 0.03, 1.0, 0.3, XL + 0.46, PY, 1.0, M['wall'], 0.008, (0, -0.6, 0))
nx, nz = math.cos(0.6), math.sin(0.6)      # Normale des schrägen Pults
def pult(dy, dv, off=0.02): return (XL + 0.46 + nx * off - nz * dv * 0, PY + dy, 1.0 + dv * math.cos(0.6) + nz * off)
for k, dy in enumerate((-0.36, -0.2, -0.04)):
    px, py, pz = pult(dy, 0.03, 0.022); px += -math.sin(0.6) * 0.03
    g = cyl('Manometer', 0.058, 0.03, px, py, pz, M['frame'], 'X', n=20, bev=0.004); g.rotation_euler = (0, PI / 2 - 0.6, 0)
    f = cyl('Manometer Blatt', 0.047, 0.006, px + nx * 0.015, py, pz + nz * 0.015, M['white'], 'X', n=20, bev=0); f.rotation_euler = (0, PI / 2 - 0.6, 0)
    n_ = box('Manometer Zeiger', 0.004, 0.006, 0.04, px + nx * 0.02, py, pz + nz * 0.02, M['red'], 0, (0.5 + k * 0.9, -0.6, 0))
px, py, pz = pult(0.26, 0.02, 0.02)
box('Pumpe Bild', 0.006, 0.26, 0.15, px, py, pz, M['screen'], 0, (0, -0.6, 0))
for k in range(5): box('Kippschalter', 0.02, 0.022, 0.03, *pult(0.14 + k * 0.06, -0.11, 0.022), M['steel'] if k % 2 else M['ochre'], 0.003, (0, -0.6, 0))
for dy in (-0.52, 0.52):      # Griffbügel
    pipe('Griffbügel', [(XL + 0.5, PY + dy, 0.48), (XL + 0.6, PY + dy, 0.48), (XL + 0.6, PY + dy, 0.82), (XL + 0.5, PY + dy, 0.82)], 0.014, M['ochre'], rad=0.035)
for k in range(9): box('Kühlschlitz', 0.012, 0.5, 0.014, XL + 0.532, PY + 0.18, 0.44 + k * 0.03, M['frame'], 0)
box('Wartungsdeckel', 0.012, 0.36, 0.24, XL + 0.532, PY - 0.3, 0.52, M['wall2'], 0.008)
bolts(XL + 0.54, [PY - 0.45, PY - 0.15], [0.43, 0.61])
box('Gehäusefuge', 0.004, 1.15, 0.006, XL + 0.531, PY, 0.69, M['frame'], 0)
box('Typenschild Pumpe', 0.004, 0.2, 0.07, XL + 0.533, PY + 0.4, 0.8, M['steel'], 0)
# Motor
MY = 4.25
cyl('Motor', 0.2, 0.74, XL + 0.32, MY, 0.62, M['frame'], 'Y', n=28, bev=0.012)
rib = cyl('Motorrippe', 0.218, 0.014, XL + 0.32, MY - 0.3, 0.62, M['wall'], 'Y', n=28, bev=0)
ar = rib.modifiers.new('Reihe', 'ARRAY'); ar.count = 16; ar.use_relative_offset = False; ar.use_constant_offset = True; ar.constant_offset_displace = (0, 0, -0.04)
cyl('Motor Lagerschild', 0.13, 0.1, XL + 0.32, MY + 0.4, 0.62, M['steel'], 'Y', n=24, bev=0.01)
cyl('Kupplung', 0.085, 0.24, XL + 0.32, MY - 0.47, 0.62, M['steel'], 'Y', n=20, bev=0.008)
box('Kupplungsschutz', 0.24, 0.2, 0.14, XL + 0.32, MY - 0.47, 0.72, M['ochre'], 0.02)
box('Klemmkasten', 0.16, 0.22, 0.1, XL + 0.32, MY + 0.05, 0.86, M['wall2'], 0.012)
pipe('Motorkabel', [(XL + 0.32, MY + 0.05, 0.9), (XL + 0.32, MY + 0.05, 1.05), (XL + 0.08, MY + 0.05, 1.08), (XL + 0.06, MY + 0.05, 1.95)], 0.016, M['rubber'], rad=0.07)
# Rohranschlüsse der Pumpe
pipe('Druckrohr', [(XP, PY - 0.3, 1.1), (XP, PY - 0.3, ZP - 0.14)], 0.075, M['white'])
cyl('Druckflansch', 0.105, 0.05, XP, PY - 0.3, 1.2, M['steel'], 'Z', n=20, bev=0.005)
pipe('Saugrohr', [(XL + 0.3, PY + 0.25, 1.1), (XL + 0.3, PY + 0.25, ZT), (XT + 0.02, PY + 0.25, ZT)], 0.05, M['teal'], rad=0.09)
for k in range(2):
    pipe('Schlauch', [(XL + 0.5, PY + 0.35 + k * 0.08, 0.4), (XL + 0.62, PY + 0.4 + k * 0.1, 0.22), (XL + 0.58, PY + 1.1 + k * 0.1, 0.06), (XL + 0.5, MY + 0.2 + k * 0.06, 0.42)], 0.016, M['rubber'], rad=0.12)
text('PUMPE 2', 0.075, (XL + 0.535, PY - 0.44, 0.745), LEFT_X, LEFT_Y, M['txtd'])
text('KREIS B  ·  16 BAR', 0.026, (XL + 0.535, PY - 0.44, 0.705), LEFT_X, LEFT_Y, M['txtd'])

# --- Feld 4: Wärmetauscher ---
EX, EY = XL + 0.46, 7.0
box('Nische', 0.03, 1.74, 1.9, XL + 0.015, EY, 1.15, M['wall'], 0.01)
cyl('Tauscher Sockel', 0.36, 0.2, EX, EY, 0.1, M['frame'], 'Z', n=32, bev=0.02)
cyl('Tauscher Kessel', 0.25, 1.3, EX, EY, 0.85, M['steel'], 'Z', n=32, bev=0)
fin = cyl('Tauscher Rippe', 0.33, 0.012, EX, EY, 0.38, M['wall2'], 'Z', n=32, bev=0)
ar = fin.modifiers.new('Reihe', 'ARRAY'); ar.count = 17; ar.use_relative_offset = False; ar.use_constant_offset = True; ar.constant_offset_displace = (0, 0, 0.055)
cyl('Tauscher Kopf', 0.29, 0.36, EX, EY, ZP, M['white'], 'Z', n=32, bev=0.03)
cyl('Tauscher Deckel', 0.2, 0.08, EX, EY, ZP + 0.21, M['frame'], 'Z', n=32, bev=0.015)
for a in range(8): cyl('Deckelschraube', 0.016, 0.05, EX + math.cos(a * PI / 4) * 0.16, EY + math.sin(a * PI / 4) * 0.16, ZP + 0.26, M['steel'], 'Z', n=6, bev=0)
ring('Leuchtring', 0.262, 0.012, (EX, EY, 1.38), (0, 0, 1), M['e_teal'], 36)
for a in (0.6, 2.2, 3.9, 5.4): cyl('Zuganker', 0.014, 1.2, EX + math.cos(a) * 0.345, EY + math.sin(a) * 0.345, 0.82, M['steel'], 'Z', n=8, bev=0)
cyl('Tauscher Stutzen', 0.15, 0.2, XP, EY - 0.33, ZP, M['white'], 'Y', n=28, bev=0)
cyl('Tauscher Flansch', 0.2, 0.06, XP, EY - 0.36, ZP, M['steel'], 'Y', n=28, bev=0.006)
pipe('Abgang', [(XP, EY + 0.25, ZP), (XP, EY + 0.75, ZP), (XP, EY + 0.75, 2.42), (XP + 0.3, EY + 0.75, 2.72)], 0.11, M['white'], rad=0.2, res=8)
cyl('Abgang Flansch', 0.16, 0.06, XP, EY + 0.75, 2.05, M['steel'], 'Z', n=24, bev=0.006)
pipe('Petrol Ablauf', [(XT, EY + 0.2, 0.5), (XT, EY + 0.62, 0.5), (XT, EY + 0.62, 0.02)], 0.055, M['teal'], rad=0.1)
box('Schaltkasten', 0.13, 0.32, 0.44, XL + 0.08, EY - 0.66, 1.25, M['cab'], 0.014)
box('Schaltkasten Bild', 0.006, 0.2, 0.12, XL + 0.149, EY - 0.66, 1.33, M['screen'], 0)
for k in range(3): cyl('Drucktaster', 0.016, 0.02, XL + 0.15, EY - 0.74 + k * 0.08, 1.14, M[['e_green', 'e_amber', 'red'][k]], 'X', n=12, bev=0)
pipe('Kastenleitung', [(XL + 0.08, EY - 0.66, 1.03), (XL + 0.08, EY - 0.66, 0.9), (XL + 0.3, EY - 0.4, 0.86)], 0.014, M['rubber'], rad=0.05)
box('Bodenmarke', 0.5, 1.7, 0.003, XL + 1.0, EY, 0.0135, M['warn2'], 0)
text('TAUSCHER 2', 0.13, (XL + 0.032, EY - 0.78, 1.9), LEFT_X, LEFT_Y, M['txto'])
text('HEISSE OBERFLÄCHE', 0.035, (XL + 0.032, EY + 0.32, 1.92), LEFT_X, LEFT_Y, M['txtw'])

# --- Feld 5: Wandfelder, Steigleiter zur Deckenluke, Decknummer ---
for z, h in ((0.66, 0.72), (1.56, 0.62)): box('Feld', 0.03, BAY - 0.26, h, XL + 0.015, 9.0, z, M['wall2'], 0.008)
bolts(XL + 0.032, [8.2, 9.8], [0.36, 0.96, 1.3, 1.82])
for dy in (-0.2, 0.2): pipe('Leiterholm', [(XL + 0.14, 9.3 + dy, 0.26), (XL + 0.14, 9.3 + dy, 2.3)], 0.018, M['ochre'])
for k in range(8): cyl('Sprosse', 0.014, 0.4, XL + 0.14, 9.3, 0.42 + k * 0.26, M['steel'], 'Y', n=10, bev=0)
for z in (0.5, 1.4, 2.2):
    for dy in (-0.2, 0.2): box('Leiterhalter', 0.12, 0.03, 0.03, XL + 0.07, 9.3 + dy, z, M['frame'], 0.004)
x, z = onslope(-1, 0.5, 0.01)
box('Deckenluke', 0.03, 0.7, 0.62, x - 0.08, 9.3, z + 0.3, M['wall2'], 0.012, (0, PI / 4, 0))
text('DECK 3', 0.26, (XL + 0.032, 8.2, 1.42), LEFT_X, LEFT_Y, M['txtw'])
text('WARTUNGSGANG  ·  KÜHLKREIS B', 0.045, (XL + 0.032, 8.2, 1.33), LEFT_X, LEFT_Y, M['txto'])

# =====================================================================================
# Gangende: Schott mit Tor
# =====================================================================================
use('Tor')
box('Schott', 2 * W + 0.2, 0.12, HC + 0.1, 0, L + 0.06, HC / 2, M['wall'], 0)
for s in (-1, 1):
    box('Torpfosten', 0.2, 0.2, 2.3, s * 0.82, L - 0.06, 1.15, M['frame'], 0.02)
    box('Torblatt', 0.72, 0.07, 2.12, s * 0.365, L - 0.02, 1.09, M['wall2'], 0.014)
    box('Torblatt Feld', 0.5, 0.02, 0.9, s * 0.39, L - 0.06, 1.42, M['wall'], 0.01)
    box('Tor Warnband', 0.72, 0.012, 0.16, s * 0.365, L - 0.058, 0.2, M['warn'], 0)
    box('Torfenster', 0.12, 0.02, 0.36, s * 0.13, L - 0.06, 1.5, M['glass'], 0.006)
    bolts(0, [], [])
    for z in (0.5, 1.0, 1.9): cyl('Torschraube', 0.016, 0.014, s * 0.66, L - 0.058, z, M['steel'], 'Y', n=6, bev=0)
box('Torsturz', 1.84, 0.22, 0.24, 0, L - 0.06, 2.4, M['frame'], 0.02)
box('Tor Leuchtband', 0.9, 0.02, 0.05, 0, L - 0.175, 2.4, M['e_amber'], 0)
box('Torschwelle', 1.5, 0.2, 0.03, 0, L - 0.08, 0.015, M['steel'], 0.006)
box('Torschloss', 0.1, 0.05, 0.3, 0, L - 0.07, 1.05, M['frame'], 0.012)
cyl('Tor LED', 0.012, 0.012, 0, L - 0.1, 1.14, M['e_red'], 'Y', n=10, bev=0)
text('SCHLEUSE C-3', 0.11, (-0.47, L - 0.175, 2.52), END_X, END_Y, M['txtw'])
text('MASCHINENDECK', 0.045, (-0.47, L - 0.175, 2.455), END_X, END_Y, M['txto'])
box('Bedienfeld', 0.2, 0.06, 0.3, 1.2, L - 0.03, 1.3, M['cab'], 0.012)
box('Bedienfeld Bild', 0.12, 0.006, 0.09, 1.2, L - 0.062, 1.36, M['screen'], 0)
for k in range(2): cyl('Bedienknopf', 0.02, 0.02, 1.16 + k * 0.08, L - 0.065, 1.22, M[['e_green', 'red'][k]], 'Y', n=12, bev=0)
# Schott am Ganganfang (hinter der ersten Kamera): Durchgang offen, dahinter dunkel
box('Schott vorn L', W - 0.75, 0.12, HC + 0.1, -(0.75 + (W - 0.75) / 2) - 0.05, -0.14, HC / 2, M['wall'], 0)
box('Schott vorn R', W - 0.75, 0.12, HC + 0.1, (0.75 + (W - 0.75) / 2) + 0.05, -0.14, HC / 2, M['wall'], 0)
box('Schott vorn Sturz', 1.7, 0.12, HC - 2.2, 0, -0.14, 2.2 + (HC - 2.2) / 2, M['wall'], 0)
for s in (-1, 1): box('Torpfosten vorn', 0.2, 0.2, 2.3, s * 0.82, -0.02, 1.15, M['frame'], 0.02)
box('Torsturz vorn', 1.84, 0.22, 0.24, 0, -0.02, 2.4, M['frame'], 0.02)
box('Tor Leuchtband vorn', 0.9, 0.02, 0.05, 0, 0.095, 2.4, M['e_amber'], 0)
box('Dunkel dahinter', 3.0, 0.1, 3.0, 0, -1.6, 1.4, M['frame'], 0)
# Requisiten rechts: Ersatzteilkisten und ein Fass
use('WandRechts')
box('Kiste groß', 0.5, 0.8, 0.42, W - 0.48, 3.15, 0.21, M['crate'], 0.02)
box('Kistendeckel', 0.52, 0.82, 0.06, W - 0.48, 3.15, 0.45, M['ochre'], 0.02)
for dy in (-0.25, 0.25): box('Kistenschloss', 0.03, 0.08, 0.1, W - 0.74, 3.15 + dy, 0.4, M['steel'], 0.006)
box('Kiste klein', 0.4, 0.5, 0.3, W - 0.46, 3.05, 0.63, M['crate'], 0.02, (0, 0, 0.18))
pipe('Kistengriff', [(W - 0.27, 2.86, 0.72), (W - 0.27, 2.86, 0.8), (W - 0.6, 2.92, 0.8), (W - 0.6, 2.92, 0.72)], 0.01, M['steel'], rad=0.03)
text('ERSATZTEILE', 0.05, (W - 0.732, 3.42, 0.2), RIGHT_X, RIGHT_Y, M['txtw'])
cyl('Fass', 0.24, 0.72, W - 0.42, 7.35, 0.36, M['teal'], 'Z', n=28, bev=0.02)
for z in (0.2, 0.52): cyl('Fassring', 0.248, 0.03, W - 0.42, 7.35, z, M['teal'], 'Z', n=28, bev=0.006)
cyl('Fassdeckel', 0.2, 0.02, W - 0.42, 7.35, 0.725, M['steel'], 'Z', n=28, bev=0.004)
cyl('Fass Spund', 0.03, 0.03, W - 0.32, 7.35, 0.74, M['frame'], 'Z', n=10, bev=0)
box('Fass Schild', 0.004, 0.2, 0.14, W - 0.661, 7.35, 0.4, M['white'], 0)
use('Tor')
# Schriften rechte Wand
text('ABSCHNITT C', 0.16, (W - 0.032, 2.9, 1.52), RIGHT_X, RIGHT_Y, M['txtw'])
text('FLUCHTWEG  >>>  SCHLEUSE C-3', 0.04, (W - 0.032, 2.9, 1.45), RIGHT_X, RIGHT_Y, M['txto'])
text('03', 0.3, (W - 0.032, 8.95, 1.38), RIGHT_X, RIGHT_Y, M['txto'])

# =====================================================================================
# Licht
# =====================================================================================
for i in range(5):
    y = i * BAY + 1
    area('Deckenlicht', (0, y, HC - 0.09), (0, 0, 0), 0.2, 1.14, 55 if i != 3 else 22, (0.8, 0.9, 1.0))
    for s in (-1, 1):
        if s < 0 and i == 0: continue      # hinter den Schränken kein Lichtband
        box_ = None
        CUR[0] = COL['Boden']
        box('Sockellicht', 0.012, BAY - 0.5, 0.022, s * (W - 0.136), y, 0.165, M['e_amber'], 0)
        area('Sockellicht', (s * (W - 0.2), y, 0.17), (0, -s * 1.9, 0), 0.04, BAY - 0.5, 9, (1.0, 0.45, 0.08))
    area('Grabenlicht', (0.0, y, -0.27), (PI, 0, 0), 0.5, 1.2, 5, (1.0, 0.5, 0.12))
point('Tauscherlicht', (EX + 0.45, EY, 1.4), 6, (0.1, 0.95, 0.8), 0.1)
area('Torlicht', (0, L - 0.3, 2.36), (math.radians(35), 0, 0), 0.9, 0.05, 14, (1.0, 0.45, 0.08))
point('Bildschirmlicht', (W - 0.3, ty - 0.07, 1.54), 2.0, (0.1, 0.9, 0.8), 0.1)
point('Pumpenbild', (XL + 0.7, PY + 0.26, 1.05), 1.2, (0.1, 0.9, 0.8), 0.08)

# =====================================================================================
# Welt, Kameras, Rendereinstellungen
# =====================================================================================
wd = SC.world or bpy.data.worlds.new('Welt'); SC.world = wd; wd.use_nodes = True
bg = next((n for n in wd.node_tree.nodes if n.type == 'BACKGROUND'), None)
if bg: bg.inputs[0].default_value = (0.004, 0.005, 0.007, 1); bg.inputs[1].default_value = 1.0
CAMS = {}
def cam(name, loc, tgt, lens):
    c = bpy.data.cameras.new(name); c.lens = lens; c.clip_start = 0.05; c.clip_end = 60
    ob = bpy.data.objects.new(name, c); COL['Licht'].objects.link(ob); ob.location = loc
    d = Vector(tgt) - Vector(loc); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    CAMS[name] = ob; return ob
def dof(name, dist, fstop):
    c = CAMS[name].data; c.dof.use_dof = True; c.dof.focus_distance = dist; c.dof.aperture_fstop = fstop
vn = wd.node_tree.nodes.new('ShaderNodeVolumePrincipled')
try:
    vn.inputs['Density'].default_value = 0.022; vn.inputs['Color'].default_value = (0.75, 0.82, 0.9, 1); vn.inputs['Anisotropy'].default_value = 0.35
    wo = next(n for n in wd.node_tree.nodes if n.type == 'OUTPUT_WORLD'); wd.node_tree.links.new(vn.outputs[0], wo.inputs['Volume'])
except Exception as e: pass
cam('K1 Gang', (0.45, 0.35, 1.45), (-0.25, 9.0, 1.15), 20)
cam('K2 Pumpe', (0.75, 1.75, 1.35), (-1.45, 3.7, 0.85), 28)
cam('K3 Tauscher', (0.55, 5.1, 0.55), (-1.3, 7.1, 1.25), 24)
cam('K4 Zurück', (-0.35, 9.3, 1.6), (0.5, 1.0, 1.0), 20)
cam('K5 Boden', (0.2, 4.6, 0.32), (-1.5, 3.2, 0.5), 32)
dof('K2 Pumpe', 2.6, 2.8); dof('K3 Tauscher', 2.7, 2.8); dof('K5 Boden', 2.0, 2.0)
SC.camera = CAMS['K1 Gang']
R = SC.render; R.resolution_x, R.resolution_y, R.resolution_percentage = 1600, 900, 100
R.image_settings.file_format = 'JPEG'; R.image_settings.quality = 92
NOTE = []
def setp(o, k, v):
    try: setattr(o, k, v)
    except Exception as e: NOTE.append('%s: %s' % (k, e))
try: R.engine = 'BLENDER_EEVEE'
except Exception:
    try: R.engine = 'BLENDER_EEVEE_NEXT'
    except Exception as e: NOTE.append(str(e))
EE = SC.eevee
for k, v in (('taa_render_samples', 96), ('use_raytracing', True), ('use_shadows', True), ('use_gtao', True), ('ray_tracing_method', 'SCREEN'), ('use_volumetric_shadows', True), ('volumetric_end', 14.0), ('volumetric_tile_size', '4')): setp(EE, k, v)
VS = SC.view_settings
setp(VS, 'view_transform', 'AgX'); setp(VS, 'look', 'AgX - Medium High Contrast'); setp(VS, 'exposure', 0.6)
# zweite Lage: Einzelheiten (gang_detail.py, gleicher Ordner), im selben Namensraum
import os
for _f in ('gang_detail.py', 'gang_detail2.py'):
    _dp = os.path.join(os.path.dirname(bpy.data.filepath), _f)
    if os.path.exists(_dp): exec(compile(open(_dp, encoding='utf-8').read(), _dp, 'exec'))
result = {'objekte': len(bpy.data.objects), 'hinweise': NOTE, 'engine': R.engine}
