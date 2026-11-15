# Wartungsgang, dritte Lage. Läuft nach gang_detail.py im selben Namensraum.
# Geschnittene Wandfelder und Bodenplatten (Platten mit Fugen, schrägen Ecken und Ausklinkungen), feiner geformte Pumpe mit Motorhaube,
# Standglas am Tauscher, ausgearbeitetes Tor, von Hand gesetzte Laufspuren und Flecken.

# ---------- Helfer ----------
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
    ob = bpy.data.objects.new(name, me); COL['Schilder'].objects.link(ob); ob.matrix_world = mw; return ob
def streak(top, xd, yd, w, h, m='spur'):      # top = Mitte der Oberkante; läuft von dort nach unten aus
    mw, X, Y, Z = frame(top, xd, yd); mw.translation = Vector(top) + Z * 0.0016
    return quad('Laufspur', ((-0.5, -1), (0.5, -1), (0.5, 0), (-0.5, 0)), M[m], mw @ Matrix.Diagonal((w, h, 1, 1)))
def spot(c, r, m='fleck', sq=1.0):
    mw, X, Y, Z = frame(c, FL_X, FL_Y); mw.translation = Vector(c) + Z * 0.0012
    return quad('Fleck', ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)), M[m], mw @ Matrix.Diagonal((2 * r * sq, 2 * r, 1, 1)))

# =====================================================================================
# Wandfelder: alte glatte Platten weg, geschnittene Platten hin
# =====================================================================================
kill('Feld unten', 'Feld oben', 'Feldrippe', 'Feld', 'Feld oben L', 'Nische', bodies=('ABSCHNITT C', 'FLUCHTWEG  >>>  SCHLEUSE C-3'))
use('WandRechts')
for i in range(5):
    y0, y1 = i * BAY + 0.13, i * BAY + 1.87
    field(1, y0, y1, 0.3, 1.02, (3, 2, 3, 4, 2)[i], flip=i % 2 == 1)
    field(1, y0, y1, 1.25, 1.87, (1, 3, 4, 2, 3)[i], flip=i in (0, 3))
text('ABSCHNITT C', 0.16, (W - 0.032, 3.72, 1.52), RIGHT_X, RIGHT_Y, M['txtw'])
text('FLUCHTWEG  >>>  SCHLEUSE C-3', 0.04, (W - 0.032, 3.72, 1.45), RIGHT_X, RIGHT_Y, M['txto'])
use('WandLinks')
field(-1, 8.13, 9.87, 0.3, 1.02, 2); field(-1, 8.13, 9.87, 1.25, 1.87, 3)
field(-1, 2.13, 3.87, 1.55, 2.05, 3); field(-1, 4.13, 5.87, 1.55, 2.05, 4, flip=True)
field(-1, 6.13, 7.87, 0.26, 2.05, 4)      # Nische hinter dem Tauscher
for y in (2.4, 3.3, 4.6, 5.5):      # Wand hinter der Pumpe: schmale stehende Platten
    prism('Wandplatte', inset([(y - 0.42, 0.62), (y + 0.42, 0.62), (y + 0.42, 1.1), (y + 0.34, 1.18), (y - 0.42, 1.18)], 0.005), XL + 0.004, XL + 0.022, M['wall4'], 'X', 0.004)

# =====================================================================================
# Boden: geschnittene Platten mit schräger Fuge, Hebeschlitz und Nummer
# =====================================================================================
kill('Bodenplatte')
use('Boden')
for i in range(5):
    for s in (-1, 1):
        xa, xb = s * (GX + 0.075), s * (W - 0.165); y0, y1 = i * BAY + 0.02, i * BAY + 1.98; ym = (y0 + y1) / 2; d = 0.16 if (i + (s > 0)) % 2 else -0.16
        for k, poly in enumerate(([(xa, y0), (xb, y0), (xb, ym - d), (xa, ym + d)], [(xa, ym + d), (xb, ym - d), (xb, y1), (xa, y1)])):
            prism('Bodenplatte', inset(poly, 0.004), -0.012, 0.012, M['floor'], 'Z', 0.004)
        box('Hebeschlitz', 0.09, 0.022, 0.006, s * (W - 0.32), y0 + 0.3, 0.0105, M['frame'], 0)
        box('Hebeschlitz', 0.09, 0.022, 0.006, s * (W - 0.32), y1 - 0.3, 0.0105, M['frame'], 0)
        text('B-%d%d' % (i + 1, 1 if s < 0 else 2), 0.03, (s * (GX + 0.2) + 0.06, y0 + 0.12, 0.0125), FL_X, FL_Y, M['txtw'])

# =====================================================================================
# Pumpe: geformtes Gehäuse, Anschluss, Motorhaube
# =====================================================================================
kill('Pumpe Gehäuse', 'Pumpe Haube', 'Druckrohr', 'Druckflansch', 'Drucksensor', 'Sensorkopf', 'Sensorkabel')
use('WandLinks')
prof = [(XL + 0.03, 0.34), (XL + 0.5, 0.34), (XL + 0.53, 0.37), (XL + 0.53, 0.86), (XL + 0.36, 1.11), (XL + 0.33, 1.13), (XL + 0.03, 1.13)]
prism('Pumpe Gehäuse', prof, PY - 0.575, PY + 0.575, M['white'], 'Y', 0.014)
for z in (0.365, 0.835): box('Gehäuseleiste', 0.012, 1.1, 0.026, XL + 0.534, PY, z, M['wall2'], 0.004)
for dy in (-0.36, 0.36):      # Deckel oben mit Hebeösen
    prism('Deckplatte', inset([(XL + 0.07, PY + dy - 0.17), (XL + 0.3, PY + dy - 0.17), (XL + 0.3, PY + dy + 0.12), (XL + 0.25, PY + dy + 0.17), (XL + 0.07, PY + dy + 0.17)], 0.0), 1.13, 1.142, M['wall2'], 'Z', 0.004)
    ring('Hebeöse', 0.03, 0.008, (XL + 0.18, PY + dy, 1.165), (0, 1, 0), M['steel'], 16)
    cyl('Ösenfuß', 0.02, 0.02, XL + 0.18, PY + dy, 1.146, M['steel'], 'Z', n=10, bev=0.003)
XD = XL + 0.3
pipe('Druckrohr', [(XD, PY - 0.3, 1.1), (XD, PY - 0.3, ZP - 0.08)], 0.07, M['white'])
cyl('Druckflansch', 0.1, 0.05, XD, PY - 0.3, 1.2, M['steel'], 'Z', n=20, bev=0.005)
for a in range(8): cyl('Flanschschraube', 0.008, 0.07, XD + math.cos(a * PI / 4) * 0.086, PY - 0.3 + math.sin(a * PI / 4) * 0.086, 1.2, M['frame'], 'Z', n=6, bev=0)
cyl('Drucksensor', 0.018, 0.09, XD + 0.1, PY - 0.3, 1.34, M['steel'], 'X', n=12, bev=0.004)
box('Sensorkopf', 0.05, 0.05, 0.05, XD + 0.16, PY - 0.3, 1.34, M['ochre'], 0.008)
cable((XD + 0.16, PY - 0.3, 1.365), (XL + 0.06, PY - 0.62, 1.98), 0.006, M['rubber'], sag=0.1, name='Sensorkabel')
# Motor: Lüfterhaube mit Gitter, Füße, Schild, Hebeöse
cyl('Lüfterhaube', 0.212, 0.16, XL + 0.32, MY + 0.44, 0.62, M['wall2'], 'Y', n=28, bev=0.012)
for k, r in enumerate((0.17, 0.125, 0.08, 0.035)): ring('Lüftergitter', r, 0.006, (XL + 0.32, MY + 0.524, 0.62), (0, 1, 0), M['steel'], 24)
for a in range(4): box('Gitterstrebe', 0.34, 0.006, 0.008, XL + 0.32, MY + 0.526, 0.62, M['steel'], 0, (0, a * PI / 4, 0))
for dy in (-0.22, 0.22): box('Motorfuß', 0.36, 0.07, 0.07, XL + 0.32, MY + dy, 0.4, M['frame'], 0.008)
ring('Hebeöse', 0.026, 0.007, (XL + 0.32, MY - 0.2, 0.86), (0, 1, 0), M['steel'], 16)
label('M2 · 90 kW · 2970 /MIN', 0.011, (XL + 0.541, MY - 0.17, 0.585), LEFT_X, LEFT_Y)
text('M 2', 0.05, (XL + 0.533, MY + 0.39, 0.6), LEFT_X, LEFT_Y, M['txtw'])

# =====================================================================================
# Tauscher: Standglas, Verschlüsse am Kopf, Erdungsband
# =====================================================================================
ga = -0.55; gx, gy = EX + math.cos(ga) * 0.36, EY + math.sin(ga) * 0.36
cyl('Standglas', 0.013, 0.56, gx, gy, 0.8, M['lens'], 'Z', n=12, bev=0)
cyl('Standglas Füllung', 0.009, 0.3, gx, gy, 0.67, M['e_teal'], 'Z', n=10, bev=0)
for z in (0.5, 1.1):
    cyl('Standglas Fassung', 0.02, 0.05, gx, gy, z, M['copper'], 'Z', n=10, bev=0.003)
    pipe('Standglas Stutzen', [(gx, gy, z), (EX + math.cos(ga) * 0.25, EY + math.sin(ga) * 0.25, z)], 0.009, M['copper'])
for a in (0.9, 2.5, 4.1, 5.6):
    box('Kopfverschluss', 0.03, 0.05, 0.09, EX + math.cos(a) * 0.298, EY + math.sin(a) * 0.298, ZP - 0.16, M['steel'], 0.006, (0, 0, a))
pipe('Erdungsband', [(EX - 0.2, EY - 0.28, 0.22), (XL + 0.08, EY - 0.4, 0.22), (XL + 0.04, EY - 0.4, 0.5)], 0.008, M['green'], rad=0.05)

# =====================================================================================
# Tor: geformte Felder, Riegel, Hubzylinder
# =====================================================================================
kill('Torblatt Feld', bodies=('C', '3'))
use('Tor')
for s in (-1, 1):
    up = [(s * 0.23, 1.02), (s * 0.66, 1.02), (s * 0.66, 1.82), (s * 0.56, 1.96), (s * 0.23, 1.96)]
    lo = [(s * 0.12, 0.34), (s * 0.66, 0.34), (s * 0.66, 0.94), (s * 0.3, 0.94), (s * 0.22, 0.84), (s * 0.12, 0.84)]
    prism('Torfeld', inset(up, 0.0), L - 0.075, L - 0.055, M['wall'], 'Y', 0.006)
    prism('Torfeld', inset(lo, 0.0), L - 0.072, L - 0.055, M['wall4'], 'Y', 0.006)
    for (x, z) in inset(up, 0.04): cyl('Torniet', 0.007, 0.008, x, L - 0.076, z, M['steel'], 'Y', n=6, bev=0)
    for z in (0.52, 1.72): cyl('Torriegel', 0.022, 0.09, s * 0.045, L - 0.08, z, M['steel'], 'X', n=12, bev=0.004)
    cyl('Hubzylinder', 0.034, 0.9, s * 0.97, L - 0.13, 1.45, M['frame'], 'Z', n=14, bev=0.006)
    cyl('Kolbenstange', 0.016, 0.7, s * 0.97, L - 0.13, 0.75, M['steel'], 'Z', n=10, bev=0)
    for z in (0.42, 1.92): box('Zylinderlager', 0.07, 0.07, 0.05, s * 0.97, L - 0.1, z, M['frame'], 0.006)
    pipe('Hydraulikschlauch', [(s * 0.97, L - 0.13, 1.88), (s * 1.08, L - 0.1, 2.05), (s * 1.2, L - 0.04, 2.3)], 0.01, M['rubber'], rad=0.08)

# =====================================================================================
# Spuren von Hand: Laufspuren unter Halterungen und Anschlüssen, Rost an Pfostenfüßen, Flecken und Abrieb am Boden
# =====================================================================================
for y in (2.9, 4.45, 5.95): streak((XL + 0.023, y, 1.4), LEFT_X, LEFT_Y, 0.14, 0.7, 'rost' if y == 4.45 else 'spur')
for y in (2.6, 5.0): streak((XL + 0.001, y, 1.18), LEFT_X, LEFT_Y, 0.1, 0.5)
for k in range(3): streak((XL + 0.3805, 0.39 + k * 0.58, 1.39), LEFT_X, LEFT_Y, 0.26, 0.42, 'staub')
streak((XL + 0.031, EY - 0.66, 1.02), LEFT_X, LEFT_Y, 0.22, 0.6); streak((XL + 0.031, 9.1, 1.36), LEFT_X, LEFT_Y, 0.08, 0.5, 'rost'); streak((XL + 0.031, 9.5, 2.02), LEFT_X, LEFT_Y, 0.3, 0.5)
streak((XL + 0.5335, PY - 0.3, 0.4), LEFT_X, LEFT_Y, 0.2, 0.06); streak((XL + 0.5335, PY + 0.18, 0.43), LEFT_X, LEFT_Y, 0.5, 0.09, 'staub')
for i in range(5):
    y = i * BAY + 1
    streak((FX - 0.001, y - 0.72, 1.725), RIGHT_X, RIGHT_Y, 0.07, 0.42, 'rost' if i % 2 else 'spur')
    if i in (0, 2, 4): streak((FX - 0.001, y - 0.5, 1.54), RIGHT_X, RIGHT_Y, 0.18, 0.28)
    streak((FX - 0.001, y + 0.35, 1.02), RIGHT_X, RIGHT_Y, 0.5, 0.5, 'staub')
for i in range(6):
    for s in (-1, 1):
        if (i + (s > 0)) % 2: streak((s * (W - 0.1312), i * BAY, 0.55), (0, -s, 0), (0, 0, 1), 0.11, 0.5, 'rost')
for s in (-1, 1):
    streak((s * 0.13, L - 0.0762, 1.3), END_X, END_Y, 0.11, 0.42); streak((s * 0.39, L - 0.0762, 1.0), END_X, END_Y, 0.5, 0.3, 'staub')
spot((EX + 0.5, EY + 0.55, 0.0125), 0.32); spot((XR - 0.42, 7.35, 0.0125), 0.36); spot((0.0, L - 0.55, 0.0125), 0.55, 'abrieb', 2.2)
spot((XR - 0.2, 0.56, 0.0125), 0.3); spot((CXW, CYW, 0.0125), 0.42, 'abrieb'); spot((0.95, 2.6, 0.0125), 0.5, 'abrieb', 0.6)
for k, (x, y, r) in enumerate(((-0.95, 1.4, 0.22), (1.0, 4.4, 0.16), (-0.9, 6.0, 0.2), (0.85, 8.6, 0.25), (-1.1, 8.9, 0.18), (0.75, 0.8, 0.2))): spot((x, y, 0.0125), r, 'fleck' if k % 2 else 'abrieb')

text('C', 0.2, (-0.56, L - 0.0755, 1.36), END_X, END_Y, M['txto'])
text('3', 0.2, (0.36, L - 0.0755, 1.36), END_X, END_Y, M['txto'])

# ---------- weitere Kameras ----------
cam('K9 Wandfeld', (0.05, 7.55, 1.5), (1.7, 6.75, 1.45), 30); dof('K9 Wandfeld', 1.9, 3.2)
cam('K10 Tor', (0.3, 7.5, 1.25), (-0.05, 10.0, 1.25), 35); dof('K10 Tor', 2.5, 4.0)
