# bk_lib.py: Materialien und Bauhelfer für den Bastion-Baukasten. ERZEUGT von mach_lib.cjs aus ../gang/*.py, nicht von Hand ändern.
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
    # die Angaben am Material ablegen: lm2_raum.py gibt sie ans Spiel, das die Muster selbst rechnet
    import json as _json
    m['bk'] = _json.dumps(dict(col=list(col), metal=float(metal), rough=float(rough), var=float(var), rvar=float(rvar), scale=float(scale), emit=list(emit) if emit else None, es=float(es),
                               grime=bool(grime), wear=float(wear), bump=float(bump), bscale=float(bscale), streak=float(streak), studs=bool(studs), trans=float(trans)))
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
def link(ob):
    CUR[0].objects.link(ob)
    if REC[0] is not None: REC[0].append(ob)
    return ob
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
    ob = bpy.data.objects.new(name, cu); link(ob)
    X, Y = Vector(xdir).normalized(), Vector(ydir).normalized(); Z = X.cross(Y)
    mw = Matrix((X, Y, Z)).transposed().to_4x4(); mw.translation = Vector(origin) + Z * 0.0025
    ob.matrix_world = mw
    return ob
LEFT_X, LEFT_Y = (0, 1, 0), (0, 0, 1)       # Schrift auf der linken Wand (Blick nach −X)
RIGHT_X, RIGHT_Y = (0, -1, 0), (0, 0, 1)    # auf der rechten Wand (Blick nach +X)
END_X, END_Y = (1, 0, 0), (0, 0, 1)         # auf dem Tor am Gangende (Blick nach +Y)
def area(name, loc, rot, sx, sy, watt, col):
    li = bpy.data.lights.new(name, 'AREA'); li.shape = 'RECTANGLE'; li.size = sx; li.size_y = sy; li.energy = watt; li.color = col
    ob = bpy.data.objects.new(name, li); link(ob); ob.location = loc; ob.rotation_euler = rot
    return ob
def point(name, loc, watt, col, r=0.05):
    li = bpy.data.lights.new(name, 'POINT'); li.energy = watt; li.color = col; li.shadow_soft_size = r
    ob = bpy.data.objects.new(name, li); link(ob); ob.location = loc
    return ob
def bolts(x, ys, zs, m=None, axis='X', r=0.012, ln=0.012):
    for y in ys:
        for z in zs: cyl('Schraube', r, ln, x, y, z, m or M['steel'], axis, n=6, bev=0)

def frame(origin, xd, yd):
    X, Y = Vector(xd).normalized(), Vector(yd).normalized(); Z = X.cross(Y)
    mw = Matrix((X, Y, Z)).transposed().to_4x4(); mw.translation = Vector(origin); return mw, X, Y, Z
def plate(w, h, origin, xd, yd, m, th=0.003, bev=0, name='Schild'):      # flache Platte, origin = linke untere Ecke
    ob = box(name, w, h, th, 0, 0, 0, m, bev); mw, X, Y, Z = frame(origin, xd, yd)
    mw.translation = Vector(origin) + X * w / 2 + Y * h / 2 + Z * th / 2; ob.matrix_world = mw; return ob
def label(s, size, origin, xd, yd, pm='plate', tm='txtd'):              # Schild mit Schrift, Breite nach Textlänge
    w = max(0.04, len(s) * size * 0.6 + 0.024); h = size * 1.7
    plate(w, h, origin, xd, yd, M[pm]); mw, X, Y, Z = frame(origin, xd, yd)
    text(s, size, Vector(origin) + X * 0.012 + Y * h * 0.3 + Z * 0.003, xd, yd, M[tm]); return w
def arrow(origin, xd, yd, ln, m, wd=0.03):                               # Pfeil in Richtung xd, origin = Ende des Schafts
    bm = bmesh.new(); a = wd / 2
    v = [bm.verts.new(p) for p in ((0, -a, 0), (ln * 0.62, -a, 0), (ln * 0.62, a, 0), (0, a, 0), (ln * 0.62, -a * 2.6, 0), (ln, 0, 0), (ln * 0.62, a * 2.6, 0))]
    bm.faces.new(v[:4]); bm.faces.new(v[4:])
    me = bpy.data.meshes.new('Pfeil'); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = bpy.data.objects.new('Pfeil', me); link(ob)
    mw, X, Y, Z = frame(origin, xd, yd); mw.translation = Vector(origin) + Z * 0.002; ob.matrix_world = mw; return ob
def warnsign(c, xd, yd, r=0.08):                                         # gelbes Warndreieck mit Ausrufezeichen
    bm = bmesh.new(); pts = [(math.sin(k * 2 * PI / 3) * r, math.cos(k * 2 * PI / 3) * r, 0) for k in range(3)]
    bm.faces.new([bm.verts.new(p) for p in pts])
    me = bpy.data.meshes.new('Warnzeichen'); bm.to_mesh(me); bm.free(); me.materials.append(M['platey'])
    ob = bpy.data.objects.new('Warnzeichen', me); link(ob)
    mw, X, Y, Z = frame(c, xd, yd); mw.translation = Vector(c) + Z * 0.002; ob.matrix_world = mw
    text('!', r * 0.9, Vector(c) - X * r * 0.11 - Y * r * 0.38 + Z * 0.001, xd, yd, M['txtd'])
def emblem(c, xd, yd, R, m):                                             # Zeichen der Bastion: Sechseck mit Winkel
    mw, X, Y, Z = frame(c, xd, yd); c = Vector(c) + Z * 0.004
    pipe('Zeichen Ring', [c + X * math.cos(k * PI / 3 + PI / 6) * R + Y * math.sin(k * PI / 3 + PI / 6) * R for k in range(6)], R * 0.07, m, cyclic=True)
    for sg in (-1, 1):
        pipe('Zeichen Winkel', [c + X * sg * R * 0.52 - Y * R * 0.3, c + Y * R * 0.3], R * 0.08, m)
    pipe('Zeichen Fuß', [c - X * R * 0.3 - Y * R * 0.48, c + X * R * 0.3 - Y * R * 0.48], R * 0.06, m)
def cable(a, b, r, m, sag=0.08, n=12, name='Kabel'):
    a, b = Vector(a), Vector(b)
    return pipe(name, [a.lerp(b, k / n) - Vector((0, 0, sag * 4 * (k / n) * (1 - k / n))) for k in range(n + 1)], r, m)
M['green'] = mk('Lack gruen', (0.03, 0.3, 0.1), 0.0, 0.45, var=0.2, bump=0.3, wear=0.8)
FL_X, FL_Y = (0, 1, 0), (-1, 0, 0)      # Schrift und Pfeile auf dem Boden, Leserichtung den Gang entlang

def kill(*names, bodies=()):
    for o in list(bpy.data.objects):
        if o.name.split('.')[0] in names or (o.type == 'FONT' and o.data.body in bodies): bpy.data.objects.remove(o, do_unlink=True)
def prism(name, pts, a, b, m, axis='X', bev=0.005):      # Vieleck (in den zwei anderen Achsen) von a bis b entlang der Achse
    bm = bmesh.new(); P = {'X': lambda u, v, w: (w, u, v), 'Y': lambda u, v, w: (u, w, v), 'Z': lambda u, v, w: (u, v, w)}[axis]
    lo = [bm.verts.new(P(u, v, a)) for u, v in pts]; hi = [bm.verts.new(P(u, v, b)) for u, v in pts]; n = len(pts)
    bm.faces.new(lo); bm.faces.new(hi)
    for i in range(n): bm.faces.new((lo[i], lo[(i + 1) % n], hi[(i + 1) % n], hi[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    if bm.calc_volume(signed=True) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])      # Normalen sicher nach außen
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    return finish(link(bpy.data.objects.new(name, me)), bev)
def inset(poly, d):      # Vieleck nach innen versetzen (jede Kante um d, Nachbarkanten neu verschneiden)
    n = len(poly)
    if sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n)) < 0: poly = poly[::-1]
    Ln = []
    for i in range(n):
        p, q = Vector(poly[i]), Vector(poly[(i + 1) % n]); e = (q - p).normalized(); Ln.append((p + Vector((-e.y, e.x)) * d, e))
    out = []
    for i in range(n):
        (p1, e1), (p2, e2) = Ln[i - 1], Ln[i]; den = e1.x * e2.y - e1.y * e2.x
        if abs(den) < 1e-6: out.append((p2.x, p2.y)); continue
        t = ((p2.x - p1.x) * e2.y - (p2.y - p1.y) * e2.x) / den; out.append((p1.x + e1.x * t, p1.y + e1.y * t))
    return out
M['wall3'] = mk('Wandfeld hell', (0.1, 0.112, 0.128), 0.45, 0.46, streak=0.4, bump=0.3, wear=0.8)
M['wall4'] = mk('Wandfeld dunkel', (0.05, 0.056, 0.066), 0.5, 0.5, streak=0.35, bump=0.3, wear=0.8)
# Aufteilungen eines Feldes in Platten (s = längs, t = hoch, jeweils 0 bis 1)
VAR = {
    1: [[(0, 0), (0.6, 0), (0.6, 0.5), (0.7, 0.64), (0.7, 1), (0.06, 1), (0, 0.88)], [(0.6, 0), (0.8, 0), (0.8, 0.5), (0.6, 0.5)], [(0.8, 0), (1, 0), (1, 0.5), (0.8, 0.5)],
        [(0.6, 0.5), (1, 0.5), (1, 0.86), (0.93, 1), (0.7, 1), (0.7, 0.64)]],
    2: [[(0, 0.58), (0.45, 0.58), (0.51, 0.48), (1, 0.48), (1, 1), (0, 1)], [(0, 0), (0.3, 0), (0.3, 0.58), (0, 0.58)],
        [(0.3, 0), (0.72, 0), (0.72, 0.48), (0.51, 0.48), (0.45, 0.58), (0.3, 0.58)], [(0.72, 0), (0.94, 0), (1, 0.12), (1, 0.48), (0.72, 0.48)]],
    3: [[(0, 0), (1, 0), (1, 0.84), (0.95, 1), (0.05, 1), (0, 0.84)]],
    4: [[(0, 0), (0.22, 0), (0.22, 1), (0.04, 1), (0, 0.9)], [(0.22, 0), (1, 0), (1, 0.42), (0.9, 0.56), (0.22, 0.56)], [(0.22, 0.56), (0.9, 0.56), (1, 0.42), (1, 1), (0.22, 1)]],
}
def field(side, y0, y1, z0, z1, var, flip=False, mats=('wall2', 'wall3', 'wall2', 'wall4'), gap=0.009):
    xa, xb = (XR - 0.004, XR - 0.03) if side > 0 else (XL + 0.004, XL + 0.03)
    for k, poly in enumerate(VAR[var]):
        wpts = [(y0 + ((1 - s) if flip else s) * (y1 - y0), z0 + t * (z1 - z0)) for s, t in poly]
        prism('Wandplatte', inset(wpts, gap / 2), xa, xb, M[mats[k % len(mats)]], 'X', 0.005)
        for (y, z) in inset(wpts, 0.035): cyl('Plattenniet', 0.0055, 0.006, xb - side * 0.001, y, z, M['steel'], 'X', n=6, bev=0)
def stain_mat(name, col, strength, spot=False):      # Laufspur (oben satt, nach unten und zu den Seiten auslaufend) oder runder Fleck, beides durchscheinend
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; K = nt.links
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); I(b, 'Base Color').default_value = (*col, 1); I(b, 'Roughness').default_value = 0.75
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); K.new(tc.outputs['Object'], sep.inputs[0])
    def mth(op, a, c=None, clamp=False):
        q = N.new('ShaderNodeMath'); q.operation = op; q.use_clamp = clamp
        for i, v in enumerate((a, c)):
            if v is None: continue
            if isinstance(v, (int, float)): q.inputs[i].default_value = v
            else: K.new(v, q.inputs[i])
        return q.outputs[0]
    mp = N.new('ShaderNodeMapping'); I(mp, 'Scale').default_value = (4, 4, 1) if spot else (11, 1.6, 1); K.new(tc.outputs['Object'], mp.inputs['Vector'])
    nz = N.new('ShaderNodeTexNoise'); I(nz, 'Scale').default_value = 1.0; I(nz, 'Detail').default_value = 6.0; K.new(mp.outputs[0], nz.inputs['Vector'])
    nm = N.new('ShaderNodeMapRange'); I(nm, 'From Min').default_value = 0.35; I(nm, 'From Max').default_value = 0.7; K.new(nz.outputs[0], I(nm, 'Value'))
    if spot:
        ln = N.new('ShaderNodeVectorMath'); ln.operation = 'LENGTH'; K.new(tc.outputs['Object'], ln.inputs[0])
        a = mth('SUBTRACT', 1.0, mth('MULTIPLY', ln.outputs['Value'], 2.0), True); a = mth('MULTIPLY', a, a)
    else:
        ax = mth('SUBTRACT', 1.0, mth('MULTIPLY', mth('ABSOLUTE', sep.outputs[0]), 2.0), True)
        ay = mth('ADD', 1.0, sep.outputs[1], True); a = mth('MULTIPLY', ax, mth('MULTIPLY', ay, ay))
    K.new(mth('MULTIPLY', mth('MULTIPLY', a, nm.outputs[0]), strength, True), I(b, 'Alpha'))
    for k, v in (('surface_render_method', 'BLENDED'), ('blend_method', 'BLEND')):
        try: setattr(m, k, v)
        except Exception: pass
    return m
M['spur'] = stain_mat('Laufspur', (0.012, 0.01, 0.008), 0.9); M['rost'] = stain_mat('Rostspur', (0.16, 0.06, 0.02), 0.75)
M['staub'] = stain_mat('Staubspur', (0.3, 0.29, 0.27), 0.35); M['fleck'] = stain_mat('Fleck', (0.008, 0.008, 0.008), 0.85, True); M['abrieb'] = stain_mat('Abrieb', (0.2, 0.2, 0.2), 0.3, True)
def quad(name, pts, m, mw):
    bm = bmesh.new(); bm.faces.new([bm.verts.new((u, v, 0)) for u, v in pts]); me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = bpy.data.objects.new(name, me); link(ob); ob.matrix_world = mw; return ob
def streak(top, xd, yd, w, h, m='spur'):      # top = Mitte der Oberkante; läuft von dort nach unten aus
    mw, X, Y, Z = frame(top, xd, yd); mw.translation = Vector(top) + Z * 0.0016
    return quad('Laufspur', ((-0.5, -1), (0.5, -1), (0.5, 0), (-0.5, 0)), M[m], mw @ Matrix.Diagonal((w, h, 1, 1)))
def spot(c, r, m='fleck', sq=1.0):
    mw, X, Y, Z = frame(c, FL_X, FL_Y); mw.translation = Vector(c) + Z * 0.0012
    return quad('Fleck', ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)), M[m], mw @ Matrix.Diagonal((2 * r * sq, 2 * r, 1, 1)))

