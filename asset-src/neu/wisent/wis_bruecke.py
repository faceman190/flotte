# Wisent: Brücke in der Nase (wird von wis_kit.py in build() geladen, gleiche Namen).
# Helle gewölbte Innenhaut mit Plattenfugen, das Sichtband als Fenster mit dickem weißem Rahmen und umlaufendem Lichtband,
# dunkle Pultzone unten. Fünf Plätze: zwei Piloten vorn, Kommandant hinten mittig, zwei Seitenstationen (Waffen, Maschine).
# Geschwungenes Hauptpult unter dem Fenster mit vielen Anzeigen, Mittelpult mit Schubhebeln, Deckenkonsole, Monitore an Armen,
# Sitze auf Bodenschienen mit Leuchtringen, Rückwand mit großem Lagebild, Tür zum Mannschaftsgang (zwei Stufen hoch).
FL = 11.2          # Boden der Brücke
XB0 = 24.6         # Rückwand
SH = 0.3           # Abstand der Innenhaut von der Außenhaut

# ---------- Materialien ----------
M['i_weiss'] = panel_mat('Innen Weiss', (0.6, 0.61, 0.62), 0.12, 0.34, 0.25, brick=(1.25, 0.62), mortar=0.006, rivets=False, streak=0.0, spec=0.4)
M['i_boden'] = panel_mat('Brueckenboden', (0.03, 0.032, 0.036), 0.55, 0.42, 0.5, brick=(0.9, 0.9), mortar=0.008, rivets=True, streak=0.0)
M['i_schwarz'] = mk('Pult Schwarz', (0.018, 0.019, 0.022), 0.35, 0.42, var=0.05, rvar=0.06, scale=4.0, bump=0.12, bscale=260, wear=0.25)
M['i_grau'] = mk('Pult Grau', (0.12, 0.124, 0.13), 0.4, 0.4, var=0.06, scale=4.0, bump=0.1, wear=0.3)
M['i_kunst'] = mk('Kunststoff Weiss', (0.66, 0.665, 0.67), 0.0, 0.3, var=0.03, rvar=0.03, scale=5.0, grime=False)
M['i_licht'] = mk('Lichtband', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.92, 0.96, 1.0), es=16, grime=False)
M['i_licht_rot'] = mk('Licht Rot', (1, 0.1, 0.06), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.08, 0.05), es=7, grime=False)
M['i_boden_licht'] = mk('Bodenlicht', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.85, 0.92, 1.0), es=5, grime=False)
M['leder'] = mk('Sitzleder', (0.016, 0.016, 0.018), 0.0, 0.55, var=0.12, scale=7.0, bump=0.35, bscale=320)
M['ui_teal'] = stripes('Anzeige Lagebild', (0.06, 0.55, 0.62), (0.0, 0.04, 0.06), 70, emit=1.8, direction='Z', duty=0.82)
M['ui_gruen'] = stripes('Anzeige Systeme', (0.18, 0.62, 0.32), (0.0, 0.05, 0.02), 45, emit=1.5, direction='Z', duty=0.6)
M['ui_blau'] = stripes('Anzeige Karte', (0.12, 0.3, 0.75), (0.0, 0.02, 0.06), 110, emit=1.7, direction='DIAGONAL', duty=0.9)
M['ui_rot'] = stripes('Anzeige Warnung', (0.7, 0.08, 0.05), (0.06, 0.0, 0.0), 30, emit=1.6, direction='Z', duty=0.7)
def ui_mat(name, col, kind, es=2.6):      # Bildschirm: dunkler Grund, Gitter, Textzeilen, Radar, Kurven oder Karte (aus den erzeugten Koordinaten der Bildfläche)
    m = bpy.data.materials.new(name); m.use_nodes = True; N = m.node_tree.nodes; K = m.node_tree.links
    m['bk'] = json.dumps(dict(col=[c * 0.3 for c in col], metal=0.0, rough=0.2, emit=list(col), es=es))
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); I(b, 'Base Color').default_value = (0.005, 0.008, 0.01, 1); I(b, 'Roughness').default_value = 0.12
    tc = N.new('ShaderNodeTexCoord'); sp = N.new('ShaderNodeSeparateXYZ'); K.new(tc.outputs['Generated'], sp.inputs[0])
    X, Y = sp.outputs[0], sp.outputs[1]
    def M_(op, a, c=None, clamp=False):
        q = N.new('ShaderNodeMath'); q.operation = op; q.use_clamp = clamp
        for i, v in enumerate((a, c)):
            if v is None: continue
            if isinstance(v, (int, float)): q.inputs[i].default_value = v
            else: K.new(v, q.inputs[i])
        return q.outputs[0]
    def comb(a, c):
        q = N.new('ShaderNodeCombineXYZ')
        for i, v in enumerate((a, c)):
            if isinstance(v, (int, float)): q.inputs[i].default_value = v
            else: K.new(v, q.inputs[i])
        return q.outputs[0]
    def wn(vec):
        q = N.new('ShaderNodeTexWhiteNoise'); q.noise_dimensions = '3D'; K.new(vec, q.inputs['Vector']); return q.outputs['Value']
    def line(v, freq, w):      # dünne Linien bei jedem 1/freq
        f = M_('FRACT', M_('MULTIPLY', v, freq)); return M_('LESS_THAN', f, w)
    grid = M_('MULTIPLY', M_('MAXIMUM', line(X, 16, 0.04), line(Y, 10, 0.05)), 0.18)
    border = M_('MAXIMUM', M_('MAXIMUM', M_('LESS_THAN', X, 0.015), M_('GREATER_THAN', X, 0.985)), M_('MAXIMUM', M_('LESS_THAN', Y, 0.02), M_('GREATER_THAN', Y, 0.98)))
    head = M_('MULTIPLY', M_('GREATER_THAN', Y, 0.88), M_('LESS_THAN', Y, 0.94))
    rows = 16.0; ry = M_('FLOOR', M_('MULTIPLY', Y, rows)); inrow = M_('MULTIPLY', M_('GREATER_THAN', M_('FRACT', M_('MULTIPLY', Y, rows)), 0.3), M_('LESS_THAN', M_('FRACT', M_('MULTIPLY', Y, rows)), 0.72))
    cx = M_('FLOOR', M_('MULTIPLY', X, 34.0)); word = M_('GREATER_THAN', wn(comb(M_('FLOOR', M_('MULTIPLY', X, 7.0)), ry)), 0.35)
    ch = M_('GREATER_THAN', wn(comb(cx, M_('ADD', ry, 0.37))), 0.25)
    lenmask = M_('LESS_THAN', X, M_('ADD', 0.25, M_('MULTIPLY', wn(comb(ry, 3.1)), 0.7)))
    text = M_('MULTIPLY', M_('MULTIPLY', M_('MULTIPLY', inrow, word), ch), lenmask)
    dx, dy = M_('SUBTRACT', X, 0.5), M_('SUBTRACT', Y, 0.47)
    r = M_('SQRT', M_('ADD', M_('MULTIPLY', dx, dx), M_('MULTIPLY', M_('MULTIPLY', dy, dy), 0.45)))
    if kind == 'text': pat = M_('MAXIMUM', M_('MULTIPLY', text, M_('LESS_THAN', Y, 0.84)), head)
    elif kind == 'radar':
        rings = M_('MULTIPLY', line(r, 8.0, 0.06), M_('LESS_THAN', r, 0.46))
        ang = M_('ARCTAN2', dy, dx); sweep = M_('MULTIPLY', M_('GREATER_THAN', M_('FRACT', M_('DIVIDE', ang, 6.2832)), 0.82), M_('LESS_THAN', r, 0.45))
        blips = M_('MULTIPLY', M_('GREATER_THAN', wn(comb(M_('FLOOR', M_('MULTIPLY', X, 24)), M_('FLOOR', M_('MULTIPLY', Y, 14)))), 0.985), M_('LESS_THAN', r, 0.44))
        pat = M_('MAXIMUM', M_('MAXIMUM', rings, M_('MULTIPLY', sweep, M_('SUBTRACT', 1.0, M_('FRACT', M_('DIVIDE', ang, 6.2832))))), blips)
        pat = M_('MAXIMUM', pat, M_('MULTIPLY', M_('LESS_THAN', M_('ABSOLUTE', dx), 0.004), M_('LESS_THAN', r, 0.46)))
    elif kind == 'graph':
        wav = M_('ADD', 0.45, M_('MULTIPLY', M_('SINE', M_('MULTIPLY', X, 23.0)), M_('ADD', 0.12, M_('MULTIPLY', M_('SINE', M_('MULTIPLY', X, 5.0)), 0.1))))
        curve = M_('LESS_THAN', M_('ABSOLUTE', M_('SUBTRACT', Y, wav)), 0.018)
        bars = M_('MULTIPLY', M_('LESS_THAN', Y, M_('MULTIPLY', wn(comb(M_('FLOOR', M_('MULTIPLY', X, 22)), 7.0)), 0.25)), M_('GREATER_THAN', M_('FRACT', M_('MULTIPLY', X, 22)), 0.25))
        pat = M_('MAXIMUM', M_('MAXIMUM', curve, M_('MULTIPLY', bars, 0.7)), head)
    else:      # Karte: Zellenränder und Kurslinie
        vo = N.new('ShaderNodeTexVoronoi'); vo.feature = 'DISTANCE_TO_EDGE'; vo.inputs['Scale'].default_value = 7.0; K.new(tc.outputs['Generated'], vo.inputs['Vector'])
        edges = M_('LESS_THAN', vo.outputs['Distance'], 0.03)
        course = M_('LESS_THAN', M_('ABSOLUTE', M_('SUBTRACT', Y, M_('ADD', 0.2, M_('MULTIPLY', X, 0.6)))), 0.012)
        pat = M_('MAXIMUM', M_('MULTIPLY', edges, 0.6), course)
    pat = M_('MAXIMUM', M_('MAXIMUM', pat, grid), M_('MULTIPLY', border, 0.8))
    em = N.new('ShaderNodeMix'); em.data_type = 'RGBA'; K.new(pat, em.inputs['Factor']); em.inputs[6].default_value = (col[0] * 0.05, col[1] * 0.05, col[2] * 0.05, 1); em.inputs[7].default_value = (*col, 1)
    K.new(em.outputs[2], I(b, 'Emission Color', 'Emission')); I(b, 'Emission Strength').default_value = es
    return m
M['ui_teal'] = ui_mat('Anzeige Lagebild', (0.15, 0.85, 0.95), 'radar')
M['ui_text'] = ui_mat('Anzeige Text', (0.55, 0.85, 1.0), 'text')
M['ui_gruen'] = ui_mat('Anzeige Systeme', (0.35, 1.0, 0.55), 'graph')
M['ui_blau'] = ui_mat('Anzeige Karte', (0.3, 0.6, 1.0), 'map')
M['ui_bern'] = ui_mat('Anzeige Antrieb', (1.0, 0.62, 0.2), 'graph')
M['ui_rot'] = ui_mat('Anzeige Warnung', (1.0, 0.18, 0.12), 'text')
M['ui_weiss'] = ui_mat('Anzeige Daten', (0.85, 0.9, 1.0), 'text')
UIS = ['ui_teal', 'ui_text', 'ui_gruen', 'ui_blau', 'ui_bern', 'ui_weiss', 'ui_rot', 'ui_gruen']


# ---------- Innenhaut ----------
def t_floor(x):
    lo, hi = 0.02, PI - 0.02
    for _ in range(40):
        mid = (lo + hi) / 2; p = hull_point(x, mid) - hull_normal(x, mid) * SH
        if p.z > FL: lo = mid
        else: hi = mid
    return (lo + hi) / 2
def inner_pt(x, t): return hull_point(x, t) - hull_normal(x, t) * SH
XB1 = next(x for x in [36.0 + i * 0.05 for i in range(200)] if inner_pt(x, t_floor(x)).y < 1.25)      # vorn: Boden zu schmal
def inner_shell():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); NT = 120
    XS = [XB0 + (XB1 - XB0) * i / 110 for i in range(111)]
    R = []; PT = {}
    for x in XS:
        tf = t_floor(x); row = []
        for j in range(NT + 1):
            t = -tf + 2 * tf * j / NT; v = bm.verts.new(inner_pt(x, t)); PT[v] = (x, t); row.append(v)
        R.append(row)
    F = []
    for i in range(len(XS) - 1):
        for j in range(NT):
            f = bm.faces.new((R[i][j], R[i + 1][j], R[i + 1][j + 1], R[i][j + 1])); F.append(f)
            xm = (XS[i] + XS[i + 1]) / 2; tm = (PT[R[i][j]][1] + PT[R[i][j + 1]][1]) / 2
            f.material_index = 1 if f.calc_center_median().z < FL + 0.85 else 0
            for lp in f.loops: x, t = PT[lp.vert]; lp[uvl].uv = (x, t * 4.0)
    bm.normal_update()
    if sum(f.normal.dot(hull_normal(*PT[f.verts[0]])) for f in F[:200]) > 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    def ring_of(pad):
        sel = set(f for f in F if f.is_valid and win_mask(hull_point(*[sum(PT[v][k] for v in f.verts) / 4 for k in (0, 1)]), pad))
        edges = [e for e in bm.edges if sum(1 for f in e.link_faces if f in sel) == 1]
        out = []
        for ch in loops_of(edges):
            P = smooth_loop([PT[v] for v in ch], 14)[::2]; out.append(P)
        return sel, out
    _, light_paths = ring_of(0.3)
    sel, frame_paths = ring_of(0.0)
    bmesh.ops.delete(bm, geom=list(sel), context='FACES')
    # Vorderwand (kleiner Abschluss) zu
    mesh_obj('Brueckenhaut', bm, ['i_weiss', 'i_schwarz'], True, C_ROOM)
    # Boden: Streifen zwischen den unteren Rändern der Haut
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); prev = None
    for x in XS:
        y = inner_pt(x, t_floor(x)).y; a, b = bm.verts.new((x, -y, FL)), bm.verts.new((x, y, FL))
        if prev:
            f = bm.faces.new((prev[0], a, b, prev[1]))
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, lp.vert.co.y)
        prev = (a, b)
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Brueckenboden', bm, ['i_boden'], True, C_ROOM)
    # Fensterrahmen innen (weiß, dick) und Lichtband etwas außerhalb
    for P in frame_paths:
        pts = [inner_pt(x, t) for x, t in P]; nn = [-hull_normal(x, t) for x, t in P]
        strip_mesh('Fensterrahmen innen', pts, nn, 0.16, 0.09, M['i_kunst'], True, 0.0, C_ROOM)
        strip_mesh('Fensterlaibung', [p - n * 0.02 for p, n in zip(pts, nn)], nn, 0.05, 0.3, M['i_grau'], True, 0.0, C_ROOM)
    for P in light_paths:
        pts = [inner_pt(x, t) for x, t in P]; nn = [-hull_normal(x, t) for x, t in P]
        strip_mesh('Lichtband', pts, nn, 0.022, 0.025, M['i_licht'], True, 0.0, C_ROOM)
        strip_mesh('Lichtbandfassung', pts, nn, 0.06, 0.012, M['i_kunst'], True, 0.0, C_ROOM)
    return XS
def half_w(x, z=None):      # halbe Breite der Innenhaut bei x in Höhe z
    z = FL + 0.8 if z is None else z; lo, hi = 0.02, PI - 0.02
    for _ in range(36):
        mid = (lo + hi) / 2
        if inner_pt(x, mid).z > z: lo = mid
        else: hi = mid
    return inner_pt(x, (lo + hi) / 2).y
def ceil_z(x, y=0.0):
    lo, hi = 0.0, PI / 2
    for _ in range(36):
        mid = (lo + hi) / 2
        if inner_pt(x, mid).y < y: lo = mid
        else: hi = mid
    return inner_pt(x, (lo + hi) / 2).z

# ---------- Bildschirme und Tasten ----------
def screen(name, mw, w, h, m, frame=0.03, thick=0.035):
    with Part(name, mw, C_ROOM):
        slab('Bildrahmen', (0, 0, 0), (1, 0, 0), (0, 1, 0), (w + 2 * frame, h + 2 * frame, thick), M['i_schwarz'], 0.008)
        slab('Bild', (0, 0, thick / 2 + 0.001), (1, 0, 0), (0, 1, 0), (w, h, 0.002), M[m], 0)
def keys(mw, nx, ny, dx=0.045, dy=0.04, lit=0.25, seed=1):
    r = random.Random(seed)
    with Part('Tastenfeld', mw, C_ROOM):
        slab('Tastenplatte', (0, 0, 0), (1, 0, 0), (0, 1, 0), (nx * dx + 0.03, ny * dy + 0.03, 0.012), M['i_grau'], 0.004)
        for i in range(nx):
            for j in range(ny):
                q = r.random(); m = 'i_licht_rot' if q < 0.06 else 'e_teal' if q < 0.06 + lit * 0.5 else 'i_licht' if q < 0.06 + lit else 'taste'
                slab('Taste', ((i - (nx - 1) / 2) * dx, (j - (ny - 1) / 2) * dy, 0.011), (1, 0, 0), (0, 1, 0), (dx * 0.72, dy * 0.7, 0.012), M[m], 0.002)
def surface_frame(c, xdir, nrm):      # Matrix: Ursprung c, lokale X = xdir (in der Fläche), Z = nrm
    Z = Vector(nrm).normalized(); X = Vector(xdir); X = (X - Z * X.dot(Z)).normalized(); Y = Z.cross(X)
    m = Matrix((X, Y, Z)).transposed().to_4x4(); m.translation = Vector(c); return m

# ---------- Hauptpult unter dem Fenster ----------
def dash_curve(y): return 35.6 - 1.15 * (y / 3.3) ** 2
DPROF = [(0.0, 0.0), (0.0, 0.92), (0.12, 1.02), (0.42, 1.04), (0.52, 0.98), (1.02, 0.78), (1.1, 0.7), (1.1, 0.0)]      # (Abstand nach hinten, Höhe)
def main_dash():
    bm = bmesh.new(); YS = [-3.3 + 6.6 * i / 60 for i in range(61)]; R = []
    for y in YS:
        x0 = dash_curve(y); dxdy = -2 * 1.15 * y / 3.3 ** 2; tng = Vector((dxdy, 1, 0)).normalized(); back = Vector((-tng.y, tng.x, 0))
        if back.x > 0: back = -back
        R.append([bm.verts.new(Vector((x0, y, FL)) + back * d + Vector((0, 0, h))) for d, h in DPROF])
    for i in range(len(R) - 1):
        for k in range(len(DPROF) - 1):
            f = bm.faces.new((R[i][k], R[i][k + 1], R[i + 1][k + 1], R[i + 1][k])); f.material_index = 1 if k in (2, 3) else 0
    for r_ in (R[0], R[-1][::-1]): bm.faces.new(r_)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh_obj('Hauptpult', bm, ['i_schwarz', 'i_grau'], True, C_ROOM)
    # Blendschutz mit Lichtkante, Anzeigen auf der Schräge, Tastenfelder, kleine Stellräder
    pipe('Pultlichtkante', [Vector((dash_curve(y) + 0.0, y, FL + 0.93)) for y in [-3.25 + 6.5 * i / 40 for i in range(41)]], 0.012, M['i_licht'])
    pipe('Pultkante', [Vector((dash_curve(y) - 0.12, y, FL + 1.035)) for y in [-3.2 + 6.4 * i / 40 for i in range(41)]], 0.02, M['i_kunst'])
    for k, y in enumerate([-2.75, -2.05, -1.35, -0.45, 0.45, 1.35, 2.05, 2.75]):
        x0 = dash_curve(y); dxdy = -2 * 1.15 * y / 3.3 ** 2; tng = Vector((dxdy, 1, 0)).normalized(); back = Vector((-tng.y, tng.x, 0))
        if back.x > 0: back = -back
        a = Vector((x0, y, FL)) + back * 0.52 + Vector((0, 0, 0.98)); b = Vector((x0, y, FL)) + back * 1.02 + Vector((0, 0, 0.78))
        c = (a + b) / 2; up = (a - b).normalized(); nrm = up.cross(tng).normalized()
        if nrm.z < 0: nrm = -nrm
        screen('Pultanzeige', surface_frame(c + nrm * 0.02, tng, nrm), 0.58, 0.4, UIS[k])
        keys(surface_frame(Vector((x0, y, FL)) + back * 0.27 + Vector((0, 0, 1.045)) , tng, (0, 0, 1)), 8, 3, seed=k + 3)
    for s in (1, -1):      # Monitore an Armen über dem Pult
        base_ = Vector((dash_curve(s * 2.2) - 0.2, s * 2.2, FL + 1.04))
        rod('Monitorarm', base_, base_ + Vector((-0.05, -s * 0.15, 0.32)), 0.02, M['i_grau'], 10)
        screen('Armmonitor', surface_frame(base_ + Vector((-0.1, -s * 0.2, 0.42)), Vector((0, 1, 0)), Vector((-1, s * 0.35, 0.25))), 0.34, 0.24, 'ui_teal')
    ANCH['pult'] = Vector((34.6, 0, FL + 1.0))

# ---------- Sitz ----------
def seat(name, mw, accent='g_rot', arms=True, sticks=True):
    with Part(name, mw, C_ROOM):
        # Schlitten auf der Schiene, Säule, Sitzschale
        slab('Schlitten', (0, 0, 0.05), (1, 0, 0), (0, 1, 0), (0.75, 0.42, 0.1), M['i_grau'], 0.02)
        cyl('Saeule', 0.11, 0.36, 0, 0, 0.27, M['mittel'], 'Z', n=20); cyl('Saeulenmanschette', 0.15, 0.12, 0, 0, 0.12, M['rubber'], 'Z', n=20)
        prism('Sitzschale', [(0.32, 0.42), (0.36, 0.52), (-0.28, 0.54), (-0.34, 0.44)], -0.31, 0.31, M['i_kunst'], 'Y', 0.03)
        slab('Sitzpolster', (0.02, 0, 0.6), (1, 0, 0), (0, 1, 0), (0.6, 0.52, 0.1), M['leder'], 0.035)
        # Lehne: schwarzer Kern, weiße Seitenschalen mit roter Kante, hohes Kopfteil mit rundem Rettungszeichen
        with Part('Lehne', T(-0.3, 0, 0.62) @ RY(math.radians(-13)), C_ROOM):
            slab('Lehnenkern', (0, 0, 0.5), (1, 0, 0), (0, 1, 0), (0.14, 0.5, 1.0), M['leder'], 0.04)
            for sg in (1, -1):
                prism('Seitenschale', [(0.12, 0.0), (0.16, 0.55), (0.05, 1.05), (-0.12, 1.12), (-0.14, 0.0)], sg * 0.24, sg * 0.32, M['i_kunst'], 'Y', 0.02)
                prism('Schalenkante', [(0.16, 0.5), (0.18, 0.56), (0.07, 1.06), (0.05, 1.0)], sg * 0.235, sg * 0.325, M[accent], 'Y', 0.005)
                slab('Gurt', (0.08, sg * 0.12, 0.6), (0, 0, 1), (0, 1, 0), (0.7, 0.06, 0.012), M['gurt'], 0.002)
            prism('Kopfteil', [(p[0], p[1]) for p in fillet([(0.07, 1.04), (0.07, 1.4), (-0.11, 1.42), (-0.12, 1.04)], 0.06, 4)], -0.22, 0.22, M['leder'], 'Y', 0.03)
            cyl('Rettungsscheibe', 0.13, 0.02, 0.075, 0, 1.22, M['i_grau'], 'X', n=32)
            ring('Rettungsring', 0.13, 0.008, (0.088, 0, 1.22), (1, 0, 0), M[accent], 32)
            slab('Rueckenschild', (-0.085, 0, 0.55), (1, 0, 0), (0, 1, 0), (0.03, 0.34, 0.62), M['i_schwarz'], 0.01)
            for sg in (1, -1): slab('Rueckenstreifen', (-0.1, sg * 0.12, 0.55), (1, 0, 0), (0, 1, 0), (0.01, 0.025, 0.58), M['i_grau'], 0)
            ring('Rueckenzeichen', 0.07, 0.008, (-0.104, 0, 0.92), (1, 0, 0), M[accent], 24)
        if arms:
            for sg in (1, -1):
                slab('Armlehne', (0.08, sg * 0.36, 0.78), (1, 0, 0), (0, 1, 0), (0.6, 0.11, 0.08), M['leder'], 0.03)
                slab('Armkonsole', (0.22, sg * 0.36, 0.68), (1, 0, 0), (0, 1, 0), (0.42, 0.13, 0.16), M['i_schwarz'], 0.02)
                slab('Armanzeige', (0.3, sg * 0.36, 0.765), (1, 0, 0), (0, 1, 0), (0.14, 0.08, 0.005), M['ui_teal'], 0)
                if sticks:
                    cyl('Griffsockel', 0.04, 0.05, 0.38, sg * 0.36, 0.83, M['rubber'], 'Z', n=14)
                    rod('Griff', Vector((0.38, sg * 0.36, 0.85)), Vector((0.41, sg * 0.36, 1.02)), 0.025, M['i_schwarz'], 12)
                    sphere('Griffknopf', 0.032, 0.415, sg * 0.36, 1.03, M[accent], 10)
        slab('Fussstuetze', (0.5, 0, 0.12), (1, 0, -0.5), (0, 1, 0), (0.3, 0.4, 0.03), M['i_grau'], 0.01)
def floor_rail(x0, x1, y):
    slab('Bodenschiene', ((x0 + x1) / 2, y, FL + 0.004), (1, 0, 0), (0, 1, 0), (x1 - x0, 0.36, 0.01), M['i_grau'], 0.004)
    slab('Schienenschlitz', ((x0 + x1) / 2, y, FL + 0.01), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.06, 0.16, 0.004), M['dunkel'], 0)
    for k in range(int((x1 - x0) / 0.12)): slab('Schienenzahn', (x0 + 0.06 + k * 0.12, y, FL + 0.013), (1, 0, 0), (0, 1, 0), (0.05, 0.15, 0.004), M['mittel'], 0)
    for sg in (1, -1): slab('Schienenlicht', ((x0 + x1) / 2, y + sg * 0.17, FL + 0.012), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.1, 0.012, 0.004), M['i_boden_licht'], 0)
def floor_ring(x, y, r):
    ring('Bodenleuchtring', r, 0.012, (x, y, FL + 0.006), (0, 0, 1), M['i_boden_licht'], 64)
    ring('Bodenring', r + 0.05, 0.01, (x, y, FL + 0.004), (0, 0, 1), M['i_grau'], 64)

# ---------- Mittelpult, Seitenstationen, Kommandantenplatz, Deckenkonsole, Rückwand ----------
def center_pedestal():
    x0, x1 = 32.2, 34.6
    prism('Mittelpult', [(x0, FL), (x1, FL), (x1, FL + 0.55), (x1 - 0.5, FL + 0.95), (x0 + 0.5, FL + 0.82), (x0, FL + 0.7)], -0.36, 0.36, M['i_schwarz'], 'Y', 0.03)
    for sg in (1, -1):
        slab('Mittelpultkante', ((x0 + x1) / 2, sg * 0.365, FL + 0.62), (1, 0, 0), (0, 0, 1), (2.3, 0.04, 0.012), M['g_rot'], 0.002)
        slab('Mittelpultblende', ((x0 + x1) / 2, sg * 0.366, FL + 0.32), (1, 0, 0), (0, 0, 1), (2.2, 0.4, 0.01), M['i_grau'], 0.004)
        for k in range(5): slab('Blendenschlitz', (x0 + 0.5 + k * 0.32, sg * 0.372, FL + 0.32), (1, 0, 0), (0, 0, 1), (0.04, 0.3, 0.008), M['dunkel'], 0)
    for k in range(4):      # Schubhebel
        y = (k - 1.5) * 0.12; base_ = Vector((x0 + 0.95, y, FL + 0.87))
        slab('Hebelschlitz', base_, (1, 0, 0), (0, 1, 0), (0.42, 0.03, 0.01), M['dunkel'], 0)
        rod('Schubhebel', base_ + Vector((0.05 * (k % 2), 0, 0)), base_ + Vector((0.02 + 0.05 * (k % 2), 0, 0.2)), 0.012, M['chrom'], 8)
        slab('Hebelgriff', base_ + Vector((0.02 + 0.05 * (k % 2), 0, 0.22)), (1, 0, 0), (0, 1, 0), (0.06, 0.08, 0.05), M['g_rot' if k < 2 else 'i_kunst'], 0.012)
    nrm = Vector((0.4, 0, 1)).normalized()
    screen('Mittelanzeige', surface_frame(Vector((x1 - 0.32, 0, FL + 0.8)) + nrm * 0.02, (0, 1, 0), (0.62, 0, 1)), 0.5, 0.28, 'ui_blau')
    keys(surface_frame(Vector((x0 + 0.3, 0, FL + 0.84)), (0, 1, 0), (-0.25, 0, 1)), 6, 4, seed=21)
    emblem((x0 - 0.002, 0, FL + 0.38), (0, 1, 0), (0, 0, 1), 0.12, M['i_kunst'])
def side_station(s):
    xc = 29.6; w = half_w(xc); yd = s * (w - 0.42)
    with Part('Seitenstation', T(xc, yd, FL) @ RZ(s * PI / 2), C_ROOM):      # lokale +X zeigt zur Wand
        prism('Stationspult', [(-0.35, 0), (0.42, 0), (0.42, 0.9), (0.25, 1.0), (-0.25, 0.86), (-0.35, 0.78)], -1.0, 1.0, M['i_schwarz'], 'Y', 0.02)
        for k, yy in enumerate((-0.6, 0.0, 0.6)):
            screen('Stationsanzeige', T(0.3, yy, 1.32) @ RY(math.radians(-72)), 0.5, 0.34, UIS[(k + (3 if s > 0 else 5)) % len(UIS)])
        rod('Anzeigestuetze', Vector((0.36, 0, 0.98)), Vector((0.32, 0, 1.15)), 0.025, M['i_grau'], 10)
        keys(T(-0.02, 0, 0.93) @ RY(math.radians(-14)), 14, 4, seed=30 + s)
        slab('Stationslicht', (-0.36, 0, 0.75), (0, 1, 0), (0, 0, 1), (1.9, 0.02, 0.012), M['i_licht'], 0)
    floor_rail(xc - 0.1, xc + 0.1, 0)  if False else None
    seat('Stationssitz', T(xc, s * (w - 1.35), FL) @ RZ(s * PI / 2), 'g_rot', True, False)
    floor_ring(xc, s * (w - 1.35), 0.5)
def commander():
    x = 27.9
    prism('Kommandopodest', [(p[0] + x, p[1]) for p in fillet([(-0.9, -0.9), (0.9, -0.9), (0.9, 0.9), (-0.9, 0.9)], 0.4, 6)], FL, FL + 0.12, M['i_grau'], 'Z', 0.02)
    ring('Podestlicht', 0.88, 0.012, (x, 0, FL + 0.125), (0, 0, 1), M['i_boden_licht'], 64) if False else None
    seat('Kommandantensitz', T(x, 0, FL + 0.12), 'g_rot', True, False)
    for sg in (1, -1):      # Seitenarme mit Anzeigen
        slab('Kommandoarm', (x + 0.3, sg * 0.62, FL + 0.82), (1, 0, 0), (0, 1, 0), (0.7, 0.2, 0.08), M['i_schwarz'], 0.02)
        screen('Kommandoanzeige', T(x + 0.48, sg * 0.62, FL + 0.95) @ RY(math.radians(-30)), 0.3, 0.2, 'ui_teal' if sg > 0 else 'ui_blau')
def overhead():
    x0, x1 = 30.6, 33.8; zc = ceil_z((x0 + x1) / 2) - 0.05
    with Part('Deckenkonsole', T((x0 + x1) / 2, 0, zc), C_ROOM):
        slab('Deckenkasten', (0, 0, -0.18), (1, 0, 0), (0, 1, 0), (x1 - x0, 1.1, 0.36), M['i_kunst'], 0.04)
        slab('Kastenboden', (0, 0, -0.37), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.2, 0.9, 0.03), M['i_schwarz'], 0.01)
        for k in range(5):
            keys(T(-1.2 + k * 0.6, 0, -0.39) @ RX(PI), 7, 5, 0.05, 0.05, 0.4, seed=40 + k)
        for sg in (1, -1): slab('Kastenlicht', (0, sg * 0.56, -0.25), (1, 0, 0), (0, 0, 1), (x1 - x0 - 0.1, 0.12, 0.012), M['i_licht'], 0)
        slab('Kastenwarnlicht', (0.9, 0, -0.395), (1, 0, 0), (0, 1, 0), (0.25, 0.08, 0.01), M['i_licht_rot'], 0)
def ceiling_lights():
    for x in (25.6, 27.2, 28.8):
        z = ceil_z(x) - 0.02
        for sg in (1, -1):
            slab('Deckenleuchte', (x, sg * 1.2, ceil_z(x, 1.2) - 0.02), (1, 0, 0), (0, 1, 0), (1.1, 0.35, 0.02), M['i_licht'], 0)
    for x in [25.0 + i * 0.9 for i in range(11)]:
        slab('Deckenfuge', (x, 0, ceil_z(x) - 0.012), (0, 1, 0), (1, 0, 0), (2.4, 0.03, 0.01), M['i_grau'], 0) if False else None
    area('Brueckenlicht', (27.5, 0, ceil_z(27.5) - 0.2), (0, 0, 0), 2.4, 1.6, 320, (0.85, 0.92, 1.0))
    area('Pultlicht', (33.6, 0, FL + 1.9), (math.radians(30), 0, math.radians(90)), 3.0, 0.4, 90, (0.6, 0.85, 1.0))
    area('Fensterfuellung', (31.0, 0, FL + 1.4), (0, math.radians(90), 0), 2.0, 2.0, 40, (0.8, 0.9, 1.0))
def back_wall():
    w = half_w(XB0 + 0.05, FL + 1.2); zt = ceil_z(XB0 + 0.05); hw = half_w(XB0 + 0.05, FL + 0.05)
    # Wand mit Türöffnung (1,4 × 2,2), Wandplatten, großes Lagebild, Spinde, Stufen in den Gang
    pts = [(-hw, FL), (-0.75, FL), (-0.75, FL + 2.25), (0.75, FL + 2.25), (0.75, FL), (hw, FL)]
    top = [(half_w(XB0 + 0.05, z), z) for z in [FL + 0.2 + i * (zt - FL - 0.25) / 14 for i in range(15)]]
    outline = pts + top + [(-y, z) for y, z in reversed(top)]
    prism('Rueckwand', [(-p[0], p[1]) for p in outline[::-1]], XB0 - 0.12, XB0, M['i_kunst'], 'X', 0.02)
    for sg in (1, -1):
        screen('Lagebild', T(XB0 + 0.03, sg * 2.1, FL + 1.55) @ RY(PI / 2) @ RZ(PI / 2), 2.0, 1.0, 'ui_blau' if sg > 0 else 'ui_teal', 0.05, 0.05)
        for k in range(3): slab('Spind', (XB0 + 0.3, sg * (1.25 + k * 0.62) * (1 if k < 2 else 1), FL + 0.45), (0, 1, 0), (0, 0, 1), (0.58, 0.88, 0.5), M['i_grau'], 0.03)
        slab('Tuerlicht', (XB0 + 0.04, sg * 0.86, FL + 1.1), (0, 0, 1), (0, 1, 0), (2.2, 0.06, 0.02), M['i_licht'], 0)
    slab('Tuersturz', (XB0 + 0.02, 0, FL + 2.32), (0, 1, 0), (0, 0, 1), (1.8, 0.16, 0.1), M['i_grau'], 0.02)
    for k in range(2): slab('Stufe', (XB0 - 0.3 - k * 0.3, 0, FL + 0.1 + k * 0.2), (1, 0, 0), (0, 1, 0), (0.3 + 0.3 * (1 - k), 1.4, 0.2), M['i_grau'], 0.01)
def wall_frame(x, s, z, lift=0.02):      # Matrix an der Innenhaut (Seite s) in Höhe z, lokale Z zeigt in den Raum
    lo, hi = 0.02, PI - 0.02
    for _ in range(36):
        mid = (lo + hi) / 2
        if inner_pt(x, mid).z > z: lo = mid
        else: hi = mid
    t = s * (lo + hi) / 2; p = inner_pt(x, t); n = -hull_normal(x, t)
    return surface_frame(p + n * lift, (1, 0, 0), n)
def bridge_details():
    # Mittlere Deckenlichtleiste und Deckenrippen, Lüftungsgitter und Wandkästen unten, Beschriftungen, Haltegriffe, Bodenlichter
    xs = [25.2 + i * 0.25 for i in range(26)]
    pipe('Deckenleiste', [Vector((x, 0, ceil_z(x) - 0.03)) for x in xs], 0.06, M['i_kunst'])
    pipe('Deckenlicht', [Vector((x, 0, ceil_z(x) - 0.09)) for x in xs], 0.018, M['i_licht'])
    for s in (1, -1):
        for k, x in enumerate((25.6, 26.8, 31.0, 34.0)):
            with Part('Wandgitter', wall_frame(x, s, FL + 0.45), C_ROOM):
                slab('Gitterrahmen', (0, 0, 0), (1, 0, 0), (0, 1, 0), (0.7, 0.32, 0.03), M['i_grau'], 0.01)
                for j in range(9): slab('Gitterlamelle', (-0.3 + j * 0.075, 0, 0.02), (1, 0, 0), (0, 1, 0), (0.025, 0.26, 0.02), M['i_schwarz'], 0)
        with Part('Wandkasten', wall_frame(27.4, s, FL + 1.05), C_ROOM):
            slab('Kasten', (0, 0, 0.06), (1, 0, 0), (0, 1, 0), (1.1, 0.7, 0.12), M['i_grau'], 0.02)
            keys(T(0.15, 0.05, 0.125), 8, 5, 0.06, 0.05, 0.35, seed=50 + s)
            slab('Kastenanzeige', (-0.35, 0.05, 0.125), (1, 0, 0), (0, 1, 0), (0.28, 0.4, 0.004), M['ui_gruen'], 0)
        with Part('Rettungstafel', wall_frame(26.2, s, FL + 1.6), C_ROOM):
            slab('Tafel', (0, 0, 0.005), (1, 0, 0), (0, 1, 0), (0.7, 0.32, 0.01), M['i_kunst'], 0.003)
            ring('Tafelring', 0.1, 0.012, (-0.22, 0, 0.012), (0, 0, 1), M['g_rot'], 24)
            o = text('EVAC SYS %d' % (1 if s > 0 else 2), 0.07, (-0.08, -0.03, 0.012), (1, 0, 0), (0, 1, 0), M['g_rot'], name='Tafelschrift')
        with Part('Haltegriff', wall_frame(25.1, s, FL + 1.3, 0.08), C_ROOM):
            pipe('Griff', [Vector((-0.3, 0, -0.08)), Vector((-0.3, 0, 0)), Vector((0.3, 0, 0)), Vector((0.3, 0, -0.08))], 0.02, M['i_grau'], rad=0.05)
        slab('Bodenkantenlicht', (29.5, s * (half_w(29.5, FL + 0.02) - 0.08), FL + 0.008), (1, 0, 0), (0, 1, 0), (8.0, 0.02, 0.006), M['i_boden_licht'], 0)
    for k in range(8): slab('Gangleuchte', (25.6 + k * 0.7, 0, FL + 0.006), (1, 0, 0), (0, 1, 0), (0.18, 0.06, 0.004), M['i_boden_licht'], 0)
    o = text('BRÜCKE  ·  WS 12', 0.11, (XB0 + 0.025, 0.55, FL + 2.45), (0, -1, 0), (0, 0, 1), M['g_rot'], align='CENTER', name='Wandschrift')
def bridge():
    inner_shell(); main_dash(); center_pedestal(); overhead(); ceiling_lights(); back_wall(); commander(); bridge_details()
    for s in (1, -1):
        seat('Pilotensitz', T(32.7, s * 1.25, FL), 'g_rot', True, True)
        floor_rail(31.6, 33.4, s * 1.25); floor_ring(32.7, s * 1.25, 0.62)
        side_station(s)
    floor_rail(27.0, 28.8, 0.0) if False else None
    cam('Bruecke', (24.95, 0.7, FL + 1.85), (35.5, -0.3, FL + 0.95), 15); VIEWS['bruecke'] = ('Bruecke', 'weltraum', False, 0.4, 0.0)
    cam('Bruecke2', (33.3, 2.55, FL + 1.5), (26.3, 0.2, FL + 0.85), 18); VIEWS['bruecke2'] = ('Bruecke2', 'weltraum', False, 0.4, 0.0)
    cam('Bruecke3', (31.0, -2.4, FL + 1.75), (33.8, 0.6, FL + 0.8), 22); VIEWS['bruecke3'] = ('Bruecke3', 'weltraum', False, 0.4, 0.0)

bridge()
