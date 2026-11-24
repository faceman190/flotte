# Rundhalle (neues Deck 3 der Bastion): Bausteine. Läuft nach bk_kit.py, bk_mehr.py und bk_med.py im selben Namensraum
# (Materialien, Bauhelfer, Wandfüllungen und Objekte des alten Baukastens werden mitbenutzt).
# Aufbau nach der Skizze vom 18.11.2026: breiter Korridor vom Hangar, runde offene Halle mit Treffpunkt in der Mitte,
# ringsum fünf Buchten mit den Läden der Dienste, dazwischen gekrümmte Wandstücke mit Türen, Schott, Automaten und Stationsplan.
#
# Koordinaten: Hallenmitte im Ursprung, Korridor nach Westen (−x), Hangartor bei x = −31. Winkel in Grad, 0 = Osten, gegen den Uhrzeiger.
# Drei Bauweisen für Bausteine:
#   polar:     direkt in Hallenkoordinaten um den Ursprung gebaut (Boden, Decke, Treffpunkt), als Instanz um die Hochachse gedreht
#   flach (F): Wandebene x = 0, Raum bei x < 0, längs der Wand y (Pfeiler, Portale, Wandtafeln); Schrift mit RIGHT_X/RIGHT_Y
#   abgerollt (U): gekrümmte Wandstücke werden flach gebaut (x = Bogenlänge nach rechts, y = Tiefe hinter der Wandfläche,
#              Raum bei y < 0, z = Höhe) und danach auf den Hallenradius gebogen (bend). Schrift mit END_X/END_Y.
import math
RH_R = 16.5            # Innenradius der Hallenwand
RH_HW = 7.2            # Wandhöhe der Halle (Unterkante Ringbalken)
RH_RD, RH_HD = 6.5, 10.6      # Trommel über dem Treffpunkt: Radius, Höhe der Trommeldecke
BW, BD, BH = 9.0, 8.75, 4.6   # Bucht: lichte Breite, Tiefe (ab Mündung), Höhe
KW, KH, KL = 8.0, 5.0, 16.0   # Korridor: Breite, Höhe, Länge
KX0 = -32.0                   # Hangartor
D0 = math.sqrt(RH_R ** 2 - (BW / 2) ** 2)      # Mündung der Bucht (Sehne)
DK = math.sqrt(RH_R ** 2 - (KW / 2) ** 2)      # Mündung des Korridors
HA_B, HA_K = math.asin(BW / 2 / RH_R), math.asin(KW / 2 / RH_R)
PW = 1.0                                        # Pfeilerbreite
OW_B, OH_B, OW_K, OH_K = 8.4, 4.2, 7.6, 4.6      # lichte Öffnung der Portale (Bucht, Korridor)
YP_B, YP_K = OW_B / 2 + 0.86, OW_K / 2 + 0.86    # Pfeilermitte neben dem Portal (quer zur Öffnung)
TH_B, TH_K = math.asin(YP_B / RH_R), math.asin(YP_K / RH_R)      # Winkel der Pfeiler gegen die Öffnungsmitte
RAD = math.radians

M['hall'] = mk('Hallenboden', (0.05, 0.055, 0.062), 0.62, 0.36, scale=8, bump=0.18, wear=0.6, streak=0.0)
M['hall2'] = mk('Hallenboden hell', (0.095, 0.1, 0.108), 0.55, 0.4, scale=8, bump=0.2, wear=0.6)
M['messing'] = mk('Messing', (0.62, 0.42, 0.18), 1.0, 0.32, var=0.15)
M['e_sig_a'] = mk('Schild Auftraege', (0.1, 1, 0.9), 0, 0.3, var=0, rvar=0, emit=(0.15, 0.95, 0.85), es=4.5, grime=False)
M['e_sig_h'] = mk('Schild Handel', (1, 0.55, 0.1), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.5, 0.08), es=4.5, grime=False)
M['e_sig_w'] = mk('Schild Werft', (0.8, 0.9, 1), 0, 0.3, var=0, rvar=0, emit=(0.75, 0.88, 1.0), es=5, grime=False)
M['e_sig_r'] = mk('Schild Ausruester', (1, 0.25, 0.1), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.22, 0.06), es=4.5, grime=False)
M['e_sig_k'] = mk('Schild Kantine', (1, 0.75, 0.4), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.68, 0.32), es=4, grime=False)
M['e_holo'] = mk('Holo', (0.3, 0.8, 1), 0, 0.3, var=0, rvar=0, emit=(0.25, 0.7, 1.0), es=6, grime=False)
M['flasche'] = mk('Flaschenglas', (0.25, 0.12, 0.04), 0.0, 0.08, var=0.3, rvar=0, grime=False)
M['flasche2'] = mk('Flaschenglas gruen', (0.04, 0.16, 0.08), 0.0, 0.08, var=0.3, rvar=0, grime=False)
M['visier'] = mk('Visier', (0.25, 0.18, 0.05), 1.0, 0.08, var=0.1, rvar=0, grime=False)
M['screen3'] = stripes('Preistafel', (0.35, 0.2, 0.05), (0.02, 0.012, 0.004), 30, emit=1.0, direction='Z', duty=0.25)
M['screen5'] = stripes('Ringschirm', (0.05, 0.3, 0.38), (0.0, 0.025, 0.035), 16, emit=1.2, direction='Z', duty=0.5)
M['screen4'] = stripes('Auftragstafel', (0.06, 0.32, 0.3), (0.0, 0.03, 0.035), 22, emit=1.0, direction='Z', duty=0.3)
M['karte2'] = stripes('Sternkarte', (0.03, 0.12, 0.18), (0.005, 0.02, 0.035), 6, emit=1.0, direction='X', duty=0.92)
M['holo2'] = mk('Holo blau', (0.3, 0.7, 1), 0, 0.3, var=0, rvar=0, emit=(0.3, 0.65, 1.0), es=3.5, grime=False)
M['holoschleier'] = mk('Holoschleier', (0.3, 0.7, 1), 0, 0.3, var=0, rvar=0, emit=(0.3, 0.6, 1.0), es=0.6, grime=False)
M['holoschleier'].node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = 0.07
SIG = {'a': 'e_sig_a', 'h': 'e_sig_h', 'w': 'e_sig_w', 'r': 'e_sig_r', 'k': 'e_sig_k'}
SIGC = {'a': (0.15, 0.95, 0.85), 'h': (1.0, 0.5, 0.08), 'w': (0.75, 0.88, 1.0), 'r': (1.0, 0.22, 0.06), 'k': (1.0, 0.68, 0.32)}

# =====================================================================================
# Helfer
# =====================================================================================
def arc_mesh(name, r0, r1, a0, a1, z0, z1, m, bev=0.005, step=RAD(2.0)):
    # Bogenstück (Ring-Ausschnitt) von Radius r0 bis r1, Winkel a0 bis a1 (Bogenmaß), Höhe z0 bis z1
    n = max(1, int(math.ceil(abs(a1 - a0) / step)))
    bm = bmesh.new(); rings = []
    for i in range(n + 1):
        a = a0 + (a1 - a0) * i / n; c, s = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((r * c, r * s, z)) for (r, z) in ((r0, z0), (r1, z0), (r1, z1), (r0, z1))])
    for i in range(n):
        A, B_ = rings[i], rings[i + 1]
        for k in range(4): bm.faces.new((A[k], A[(k + 1) % 4], B_[(k + 1) % 4], B_[k]))
    bm.faces.new(rings[0]); bm.faces.new(rings[-1][::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    ob = link(bpy.data.objects.new(name, me))
    if bev: return finish(ob, bev)
    for p in me.polygons: p.use_smooth = True
    sm = ob.modifiers.new('Kanten', 'EDGE_SPLIT'); sm.split_angle = RAD(30)
    return ob
def disc(name, r, z0, z1, m, n=64, bev=0.006):
    return cyl(name, r, z1 - z0, 0, 0, (z0 + z1) / 2, m, 'Z', n=n, bev=bev)
def polar(r, a): return (r * math.cos(a), r * math.sin(a))
def bend(objs, R, phi0=0.0, step=0.3):
    # abgerollt gebaute Teile auf den Radius R biegen: x = Bogenlänge nach rechts (im Uhrzeigersinn), y = nach außen, z bleibt
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get(); out = []
    def mp(x, y, z):
        t = phi0 - x / R; r = R + y
        return Vector((r * math.cos(t), r * math.sin(t), z)), t
    for ob in objs:
        if ob.type in ('CURVE', 'FONT'):
            ev = ob.evaluated_get(dg); me = bpy.data.meshes.new_from_object(ev)
            nob = bpy.data.objects.new(ob.name, me)
            for c in ob.users_collection: c.objects.link(nob)
            nob.matrix_world = ob.matrix_world.copy(); bpy.data.objects.remove(ob, do_unlink=True); ob = nob
            for p in me.polygons: p.use_smooth = False
        if ob.type == 'MESH':
            me = ob.data; bm = bmesh.new(); bm.from_mesh(me); bm.transform(ob.matrix_basis)
            xs = [v.co.x for v in bm.verts]
            if xs:
                x0, x1 = min(xs), max(xs); k = math.floor(x0 / step) + 1
                while k * step < x1:
                    g = bm.verts[:] + bm.edges[:] + bm.faces[:]
                    bmesh.ops.bisect_plane(bm, geom=g, plane_co=(k * step, 0, 0), plane_no=(1, 0, 0)); k += 1
            for v in bm.verts: v.co = mp(v.co.x, v.co.y, v.co.z)[0]
            bm.to_mesh(me); bm.free(); ob.matrix_basis = Matrix.Identity(4)
        else:
            mw = ob.matrix_world.copy(); p = mw.translation; q, t = mp(p.x, p.y, p.z)
            L = Matrix(((math.sin(t), math.cos(t), 0), (-math.cos(t), math.sin(t), 0), (0, 0, 1))).to_4x4()
            ob.matrix_world = Matrix.Translation(q) @ L @ mw.to_3x3().to_4x4()
        out.append(ob)
    return out
def bent_module(name, fn, R, *a):
    if name in MOD: return MOD[name]
    c = bpy.data.collections.new(name); SC.collection.children.link(c); MOD[name] = c
    prev = CUR[0]; CUR[0] = c; REC[0] = []
    try: fn(*a)
    finally: objs = REC[0]; REC[0] = None; CUR[0] = prev
    bend(objs, R)
    SC.collection.children.unlink(c)
    return c
def inst_rec(c, loc, ang=0.0):      # Instanz innerhalb eines Bausteins (wird mitgebogen)
    e = inst(c, loc, ang)
    if REC[0] is not None: REC[0].append(e)
    return e
def wplate(x0, x1, z0, z1, var, flip=False, mats=('wall2', 'wall3', 'wall2', 'wall4'), y=0.0, d=0.03, gap=0.01, rivets=True):
    # Wandfeld in Platten (abgerollte Bauweise: Wandfläche bei y, Raum bei −y)
    for k, poly in enumerate(VAR[var]):
        pts = [(x0 + ((1 - s) if flip else s) * (x1 - x0), z0 + t * (z1 - z0)) for s, t in poly]
        prism('Wandplatte', inset(pts, gap / 2), y - d, y, M[mats[k % len(mats)]], 'Y', 0.005)
        if rivets:
            for (u, v) in inset(pts, 0.04): cyl('Plattenniet', 0.006, 0.006, u, y - d - 0.001, v, M['steel'], 'Y', n=6, bev=0)
def fplate(y0, y1, z0, z1, var, flip=False, mats=('wall2', 'wall3', 'wall2', 'wall4'), x=0.0, d=0.03, gap=0.01, rivets=True):
    # dasselbe in flacher Bauweise (Wandfläche bei x, Raum bei −x)
    for k, poly in enumerate(VAR[var]):
        pts = [(y0 + ((1 - s) if flip else s) * (y1 - y0), z0 + t * (z1 - z0)) for s, t in poly]
        prism('Wandplatte', inset(pts, gap / 2), x - d, x, M[mats[k % len(mats)]], 'X', 0.005)
        if rivets:
            for (u, v) in inset(pts, 0.04): cyl('Plattenniet', 0.006, 0.006, x - d - 0.001, u, v, M['steel'], 'X', n=6, bev=0)
def grille(x0, x1, z0, z1, y=0.0, n=None):      # Lüftungsgitter (abgerollt)
    box('Gitterrahmen', x1 - x0, 0.06, z1 - z0, (x0 + x1) / 2, y - 0.03, (z0 + z1) / 2, M['frame'], 0.01)
    n = n or max(3, int((z1 - z0) / 0.07))
    for k in range(n):
        z = z0 + 0.05 + k * (z1 - z0 - 0.1) / max(1, n - 1)
        box('Lamelle', x1 - x0 - 0.08, 0.05, 0.018, (x0 + x1) / 2, y - 0.07, z, M['grate'], 0.003, (RAD(35), 0, 0))
def stencil(s, size, x, z, y=-0.034, m='txtw'):      # Schablonenschrift auf der abgerollten Wand (zentriert)
    text(s, size, (x, y, z), END_X, END_Y, M[m], align='CENTER')

# =====================================================================================
# Pfeiler (flach): an jeder Kante einer Öffnung, 1,0 m breit, 0,7 m tief, bis unter den Ringbalken
# =====================================================================================
def b_pfeiler():
    h = RH_HW
    prism('Pfeilerfuß', [(0.0, -0.62), (-0.82, -0.62), (-0.9, -0.54), (-0.9, 0.54), (-0.82, 0.62), (0.0, 0.62)], 0.0, 0.28, M['frame'], 'Z', 0.015)
    prism('Pfeiler', [(0.0, -0.5), (-0.56, -0.5), (-0.72, -0.34), (-0.72, 0.34), (-0.56, 0.5), (0.0, 0.5)], 0.28, h - 0.62, M['wall3'], 'Z', 0.02)
    prism('Pfeilerkopf', [(0.0, -0.6), (-0.86, -0.6), (-1.0, -0.46), (-1.0, 0.46), (-0.86, 0.6), (0.0, 0.6)], h - 0.62, h, M['frame'], 'Z', 0.02)
    box('Kopfband', 0.02, 0.92, 0.06, -1.005, 0, h - 0.3, M['e_cool'], 0)
    # Frontfeld mit Lichtkanten, Schrauben, Nummer
    box('Pfeilerfeld', 0.04, 0.5, h - 1.6, -0.73, 0, 0.9 + (h - 1.6) / 2, M['wall4'], 0.008)
    for sy in (-1, 1):
        box('Pfeilerlicht', 0.03, 0.03, h - 1.9, -0.66, sy * 0.43, 1.0 + (h - 1.9) / 2, M['e_cool'], 0, (0, 0, sy * PI / 4))
        bolts(-0.752, [sy * 0.2], [1.0, 2.2, 3.4, 4.6, 5.8], axis='X')
    box('Warnband', 0.012, 0.66, 0.5, -0.725, 0, 0.58, M['warn'], 0)
    box('Stoßkante', 0.1, 1.1, 0.08, -0.86, 0, 0.32, M['rubber'], 0.01)
    # Löschposten
    box('Löscherkasten', 0.22, 0.34, 0.62, -0.84, 0, 1.55, M['red'], 0.012); box('Löscherfenster', 0.01, 0.24, 0.36, -0.952, 0, 1.6, M['glass'], 0)
    cyl('Löscher', 0.07, 0.42, -0.86, 0, 1.56, M['red'], 'Z', n=16, bev=0.01); text('LÖSCHER', 0.04, (-0.955, 0, 1.3), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
    # Leitung an der Seite
    for sy in (-1, 1):
        pipe('Pfeilerleitung', [(-0.18, sy * 0.56, 0.3), (-0.18, sy * 0.56, h - 0.7)], 0.035, M['steel'])
        for z in (1.2, 3.0, 4.8, 6.2): box('Rohrschelle', 0.12, 0.1, 0.05, -0.12, sy * 0.53, z, M['frame'], 0.006)
    text('D3', 0.16, (-0.755, 0, 6.05), RIGHT_X, RIGHT_Y, M['txto'], align='CENTER')
    for sy in (-1, 1): streak((-0.75, sy * 0.15, h - 0.9), RIGHT_X, RIGHT_Y, 0.25, 1.8, 'spur')

# =====================================================================================
# Gekrümmte Wandstücke zwischen den Öffnungen (abgerollt gebaut, dann gebogen)
# kind: 'tuer' (Tür mit Schild), 'schott' (Schott zum nächsten Deck), 'automat' (Nische mit zwei Automaten), 'info' (Stationsplan),
#       'aufzug' (Aufzug zu den Quartieren, seit dem Quartier nach Alpha 1.58)
# =====================================================================================
def sector_fill(L, kind, label=''):
    h = RH_HW; xa, xb = -L / 2, L / 2
    nw = {'tuer': 2.7, 'gang': 3.4, 'schott': 4.2, 'automat': 2.9, 'info': 0.0, 'aufzug': 2.9}[kind]
    nh = {'tuer': 2.85, 'gang': 2.9, 'schott': 3.4, 'automat': 2.75, 'info': 0.0, 'aufzug': 3.0}[kind]
    nd = {'tuer': 0.5, 'gang': 0.5, 'schott': 0.75, 'automat': 0.85, 'info': 0.0, 'aufzug': 0.5}[kind]
    # Rückwand (mit Aussparung für die Nische)
    if nw:
        for (u0, u1) in ((xa, -nw / 2), (nw / 2, xb)): box('Hallenwand', u1 - u0, 0.15, h, (u0 + u1) / 2, 0.075, h / 2, M['wall4'], 0)
        box('Hallenwand', nw, 0.15, h - nh, 0, 0.075, nh + (h - nh) / 2, M['wall4'], 0)
    else: box('Hallenwand', L, 0.15, h, 0, 0.075, h / 2, M['wall4'], 0)
    # Sockel mit Licht
    for (u0, u1) in (((xa, -nw / 2 - 0.12), (nw / 2 + 0.12, xb)) if nw else ((xa, xb),)):
        w = u1 - u0; c = (u0 + u1) / 2
        box('Sockel', w, 0.13, 0.22, c, -0.065, 0.11, M['frame'], 0.01); box('Sockelnase', w, 0.2, 0.035, c, -0.1, 0.2375, M['wall2'], 0.008)
        box('Sockellicht', w, 0.02, 0.012, c, -0.19, 0.212, M['e_amber'], 0)
    # unteres Band: Felder um die Nische herum
    def fields(u0, u1, z0, z1, seed, vars_=(1, 2, 4, 1, 2)):
        n = max(1, int(round((u1 - u0) / 1.9))); w = (u1 - u0) / n; R = random.Random(seed)
        for i in range(n):
            a, b = u0 + i * w, u0 + (i + 1) * w
            if R.random() < 0.18 and z1 - z0 > 1.8: wplate(a, b, z0, z0 + 0.9, 3, rivets=True); grille(a + 0.15, b - 0.15, z0 + 1.05, z1 - 0.15)
            else: wplate(a, b, z0, z1, R.choice(vars_), flip=R.random() < 0.5)
            if i: box('Fugenleiste', 0.07, 0.05, z1 - z0, a, -0.035, (z0 + z1) / 2, M['frame'], 0.006)
    z0, z1 = 0.26, 2.85
    if nw: fields(xa, -nw / 2 - 0.12, z0, z1, 11); fields(nw / 2 + 0.12, xb, z0, z1, 12)
    else: fields(xa, xb, z0, z1, 13)
    # Lichtband und Kabelbahn
    box('Lichtgesims', L, 0.28, 0.06, 0, -0.14, 2.9, M['frame'], 0.008); box('Lichtfuge', L, 0.03, 0.025, 0, -0.27, 2.86, M['e_cool'], 0)
    box('Kabelbahn', L, 0.3, 0.07, 0, -0.18, 3.28, M['grate'], 0.004)
    for k, (dy, dz, r, mm) in enumerate(((-0.1, 3.36, 0.022, 'rubber'), (-0.18, 3.36, 0.018, 'red'), (-0.25, 3.37, 0.026, 'rubber'))):
        pipe('Kabel', [(xa, dy, dz), (xb, dy, dz)], r, M[mm])
    u = xa + 0.6
    while u < xb - 0.3: box('Kabelhalter', 0.05, 0.34, 0.12, u, -0.17, 3.22, M['frame'], 0.004); u += 1.2
    # oberes Band: große Platten, Rippen, Gitter, Bereichsnummer
    n = max(2, int(round(L / 2.6))); w = L / n; R = random.Random(len(label) + int(L * 10))
    for i in range(n):
        a, b = xa + i * w, xa + (i + 1) * w
        if i == n // 2 and kind != 'info': wplate(a, b, 3.5, 4.6, 3); grille(a + 0.2, b - 0.2, 4.75, 6.3)
        else: wplate(a, b, 3.5, 6.35, R.choice((3, 4, 1)), flip=R.random() < 0.5, mats=('wall4', 'wall2', 'wall4', 'wall3'))
        box('Rippe', 0.16, 0.16, 3.05, a, -0.08, 4.95, M['frame'], 0.012)
    box('Rippe', 0.16, 0.16, 3.05, xb, -0.08, 4.95, M['frame'], 0.012)
    # Gesims mit Licht zur Decke, Ringleitung
    box('Kranz', L, 0.5, 0.14, 0, -0.25, 6.5, M['frame'], 0.012); box('Kranzlicht', L, 0.05, 0.03, 0, -0.47, 6.585, M['e_panel'], 0)
    box('Kranzband', L, 0.2, 0.55, 0, -0.1, 6.9, M['wall2'], 0.008)
    pipe('Ringleitung', [(xa, -0.75, 6.95), (xb, -0.75, 6.95)], 0.2, M['wall'], res=8)
    u = xa + 0.7
    while u < xb - 0.3:
        box('Leitungsträger', 0.08, 0.7, 0.06, u, -0.45, 6.72, M['frame'], 0.006); pipe('Leitungsbügel', [(u, -0.97, 6.72), (u, -0.97, 7.18)], 0.012, M['steel']); u += 1.6
    for q in range(3): streak((xa + L * (0.2 + 0.3 * q), -0.035, 2.82), END_X, END_Y, 0.3, 1.5, 'spur' if q != 1 else 'rost')
    # Nische
    if kind in ('tuer', 'schott', 'automat', 'gang', 'aufzug'):
        for sx in (-1, 1):
            box('Laibung', 0.14, nd, nh, sx * (nw / 2 + 0.07), nd / 2 - 0.02, nh / 2, M['frame'], 0.012)
            box('Nischenrahmen', 0.24, 0.12, nh + 0.24, sx * (nw / 2 + 0.12), -0.06, (nh + 0.24) / 2, M['frame'], 0.02)
        box('Nischensturz', nw + 0.48, 0.12, 0.24, 0, -0.06, nh + 0.12, M['frame'], 0.02); box('Sturzlicht', nw, 0.03, 0.025, 0, -0.13, nh - 0.02, M['e_cool'], 0)
        box('Nischendecke', nw, nd, 0.06, 0, nd / 2, nh - 0.03, M['wall4'], 0); box('Nischenboden', nw, nd, 0.04, 0, nd / 2, 0.01, M['floor'], 0.004)
        if kind != 'gang': box('Nischenrückwand', nw, 0.1, nh, 0, nd + 0.05, nh / 2, M['wall4'], 0)
    if kind == 'gang':      # offener Durchgang in einen Gang des alten Baukastens (Querschnitt 3,4 m, Wand 2,1 m, Decke 2,9 m)
        for sx in (-1, 1):
            prism('Gangecke', [(sx * 1.7, 2.1), (sx * 1.7, nh), (sx * 0.9, nh)], nd - 0.12, nd, M['frame'], 'Y', 0.01)
            box('Durchgangslicht', 0.03, 0.03, 2.0, sx * (nw / 2 - 0.02), -0.13, 1.1, M['e_cool'], 0)
            box('Warnband', 0.3, 0.012, 0.9, sx * (nw / 2 + 0.2), -0.125, 0.55, M['warn'], 0)
        box('Durchgangschwelle', nw, nd + 0.1, 0.03, 0, nd / 2, 0.015, M['steel'], 0.008)
        box('Türschild', len(label) * 0.11 + 0.3, 0.04, 0.3, 0, -0.14, nh + 0.42, M['wall4'], 0.01)
        text(label, 0.16, (0, -0.165, nh + 0.36), END_X, END_Y, M['txtw'], align='CENTER')
        text(label, 0.2, (0, -1.0, 0.012), (1, 0, 0), (0, 1, 0), M['txto'], align='CENTER')
    if kind == 'tuer':
        y = nd - 0.02; tw = 1.8
        box('Türrahmen', tw + 0.36, 0.12, 2.62, 0, y - 0.02, 1.31, M['frame'], 0.015)
        for sx in (-1, 1):
            box('Türflügel', tw / 2 - 0.01, 0.1, 2.42, sx * (tw / 4 + 0.005), y - 0.09, 1.21, M['door'], 0.012)
            box('Türfenster', 0.12, 0.012, 0.7, sx * 0.2, y - 0.146, 1.65, M['glass'], 0)
            box('Türband', tw / 2 - 0.1, 0.012, 0.16, sx * (tw / 4), y - 0.146, 0.9, M['warn'], 0)
        box('Türfuge', 0.02, 0.11, 2.42, 0, y - 0.09, 1.21, M['rubber'], 0)
        box('Bedienfeld', 0.2, 0.05, 0.3, nw / 2 - 0.3, y - 0.07, 1.35, M['frame'], 0.008); box('Bedienbild', 0.14, 0.01, 0.18, nw / 2 - 0.3, y - 0.1, 1.38, M['screen'], 0)
        cyl('Statuslicht', 0.03, 0.02, nw / 2 - 0.3, y - 0.1, 1.6, M['e_green'], 'Y', n=12, bev=0)
        box('Türschild', len(label) * 0.11 + 0.3, 0.04, 0.3, 0, -0.14, nh + 0.42, M['wall4'], 0.01)
        text(label, 0.16, (0, -0.165, nh + 0.36), END_X, END_Y, M['txtw'], align='CENTER')
        text(label, 0.2, (0, -1.0, 0.012), (1, 0, 0), (0, 1, 0), M['txto'], align='CENTER')
    elif kind == 'aufzug':      # Aufzug zu den Quartieren: zwei Schiebetüren aus Stahl, Stockanzeige, Rufpult, Lichtleisten in der Laibung
        y = nd - 0.02; tw = 1.5; th = 2.3
        box('Aufzugrahmen', tw + 0.44, 0.14, th + 0.22, 0, y - 0.03, (th + 0.22) / 2, M['frame'], 0.018)
        box('Aufzugschacht', tw, 0.1, th, 0, y + 0.08, th / 2, M['wall4'], 0)
        for sx in (-1, 1):
            box('Aufzugtür', tw / 2 - 0.006, 0.05, th - 0.01, sx * (tw / 4 + 0.003), y - 0.1, th / 2, M['steel'], 0.006)
            box('Türschlitz', 0.06, 0.008, 0.95, sx * 0.24, y - 0.128, 1.4, M['glass'], 0)
            box('Türband', tw / 2 - 0.1, 0.008, 0.16, sx * tw / 4, y - 0.128, 0.16, M['warn'], 0)
            box('Laibungslicht', 0.03, 0.03, nh - 0.3, sx * (nw / 2 - 0.03), -0.04, (nh - 0.3) / 2 + 0.15, M['e_cool'], 0)
        box('Türfuge', 0.012, 0.055, th - 0.01, 0, y - 0.1, th / 2, M['rubber'], 0)
        box('Aufzugschwelle', tw + 0.4, 0.55, 0.012, 0, y - 0.3, 0.006, M['warn2'], 0.004)
        box('Stockanzeige', 0.62, 0.06, 0.16, 0, y - 0.1, th + 0.36, M['frame'], 0.008); box('Stockbild', 0.56, 0.008, 0.11, 0, y - 0.134, th + 0.36, M['screen5'], 0)
        text('D3', 0.07, (-0.2, y - 0.14, th + 0.33), END_X, END_Y, M['e_holo']); text('Q', 0.07, (0.14, y - 0.14, th + 0.33), END_X, END_Y, M['e_amber'])
        bx = tw / 2 + 0.42
        box('Rufpult', 0.2, 0.06, 0.38, bx, y - 0.08, 1.3, M['frame'], 0.008); box('Rufpultbild', 0.12, 0.008, 0.08, bx, y - 0.114, 1.42, M['screen'], 0)
        for (z, mm) in ((1.3, 'e_cool'), (1.19, 'e_amber')): cyl('Rufknopf', 0.03, 0.016, bx, y - 0.118, z, M[mm], 'Y', n=16, bev=0)
        box('Türschild', len(label) * 0.11 + 0.9, 0.04, 0.3, 0, -0.14, nh + 0.42, M['wall4'], 0.01)
        text('AUFZUG  ·  ' + label, 0.16, (0, -0.165, nh + 0.36), END_X, END_Y, M['txtw'], align='CENTER')
        text(label, 0.2, (0, -1.0, 0.012), (1, 0, 0), (0, 1, 0), M['txto'], align='CENTER')
    elif kind == 'schott':
        y = nd - 0.02; tw = 3.6; th = 3.0
        box('Schottrahmen', tw + 0.5, 0.2, th + 0.3, 0, y - 0.05, (th + 0.3) / 2, M['frame'], 0.03)
        for sx in (-1, 1):
            prism('Schotthälfte', [(sx * 0.01, 0.05), (sx * tw / 2, 0.05), (sx * tw / 2, th), (sx * 0.4, th), (sx * 0.01, th - 0.39)], y - 0.24, y - 0.12, M['wall2'], 'Y', 0.02)
            box('Schottband', tw / 2 - 0.2, 0.01, 0.36, sx * tw / 4, y - 0.245, 0.4, M['warn'], 0)
            for z in (1.0, 1.6, 2.2): box('Schottrippe', tw / 2 - 0.3, 0.05, 0.08, sx * tw / 4, y - 0.26, z, M['frame'], 0.008)
            cyl('Zylinder', 0.07, 1.6, sx * (tw / 2 + 0.05), y - 0.25, 1.6, M['steel'], 'Z', n=16, bev=0.006)
            cyl('Zylindermantel', 0.1, 0.8, sx * (tw / 2 + 0.05), y - 0.25, 2.6, M['ochre'], 'Z', n=16, bev=0.008)
            cyl('Warnleuchte', 0.07, 0.08, sx * (tw / 2 + 0.05), y - 0.3, th + 0.15, M['e_red'], 'Y', n=16, bev=0)
        text(label, 0.32, (0, y - 0.275, 1.95), END_X, END_Y, M['txtw'], align='CENTER')
        text('GESPERRT', 0.11, (0, y - 0.275, 1.55), END_X, END_Y, M['txto'], align='CENTER')
        box('Schwelle', tw + 0.4, 0.5, 0.05, 0, y - 0.3, 0.025, M['warn2'], 0.01)
    elif kind == 'automat':
        for k, x in enumerate((-0.7, 0.7)): inst_rec(prop('automat'), (x, nd - 0.35, 0.0), -PI / 2)
        box('Nischenschild', 1.8, 0.04, 0.26, 0, -0.14, nh + 0.38, M['wall4'], 0.01)
        text('VERPFLEGUNG', 0.13, (0, -0.165, nh + 0.33), END_X, END_Y, M['txtw'], align='CENTER')
    elif kind == 'info':
        box('Planrahmen', 3.2, 0.12, 1.9, 0, -0.06, 1.75, M['frame'], 0.02); box('Planbild', 3.0, 0.02, 1.7, 0, -0.125, 1.75, M['screen2'], 0)
        box('Planleiste', 3.2, 0.25, 0.1, 0, -0.12, 0.75, M['frame'], 0.01)
        text('STATIONSPLAN  ·  DECK 3', 0.11, (0, -0.15, 2.82), END_X, END_Y, M['txtw'], align='CENTER')
        for (u, v) in ((-0.8, 1.9), (0.4, 1.5), (1.0, 2.1), (-0.2, 1.2)): cyl('Planpunkt', 0.04, 0.01, u, -0.14, v, M['e_amber'], 'Y', n=12, bev=0)

# =====================================================================================
# Portale der Buchten und des Korridors (flach, Wandebene = Sehne der Mündung, Halle bei x < 0)
# =====================================================================================
def b_portal(ow, oh, deep=0.75, hw=5.0, kind='laden'):
    h = RH_HW; x0 = -0.12
    # Leibungen und Sturz
    for sy in (-1, 1):
        box('Portalwand', deep - x0, hw - ow / 2, h, (x0 + deep) / 2, sy * (ow / 2 + hw) / 2, h / 2, M['wall4'], 0)
        box('Portalpfosten', 0.34, 0.36, oh + 0.36, x0 - 0.1, sy * (ow / 2 + 0.18), (oh + 0.36) / 2, M['frame'], 0.03)
        box('Laibung', deep, 0.1, oh, deep / 2, sy * (ow / 2 + 0.05), oh / 2, M['frame'], 0.01)
        box('Portallicht', 0.04, 0.04, oh - 0.3, x0 - 0.28, sy * (ow / 2 + 0.02), (oh - 0.3) / 2 + 0.15, M['e_cool'], 0)
        box('Warnband', 0.012, 0.3, 0.9, x0 - 0.275, sy * (ow / 2 + 0.2), 0.55, M['warn'], 0)
        box('Stoßkante', 0.14, 0.4, 0.12, x0 - 0.24, sy * (ow / 2 + 0.2), 0.12, M['rubber'], 0.01)
        if kind == 'laden':
            box('Gitterschiene', 0.12, 0.08, oh, 0.25, sy * (ow / 2 - 0.02), oh / 2, M['steel'], 0.006)
        if kind == 'gang':      # Eckschrägen oben in der Öffnung, wie die Schrägen im Korridor
            prism('Eckschräge', [(sy * ow / 2, oh - 1.2), (sy * ow / 2, oh), (sy * (ow / 2 - 0.6), oh)], x0, deep, M['frame'], 'X', 0.01)
            box('Schräglicht', 0.04, 0.04, 1.3, x0 - 0.01, sy * (ow / 2 - 0.32), oh - 0.62, M['e_cool'], 0, (RAD(-26.57) * sy, 0, 0))
    box('Portalwand', deep - x0, 2 * hw, h - oh, (x0 + deep) / 2, 0, oh + (h - oh) / 2, M['wall4'], 0)
    box('Portalsturz', 0.34, ow + 0.72, 0.36, x0 - 0.1, 0, oh + 0.18, M['frame'], 0.03)
    box('Sturzlicht', 0.04, ow, 0.04, x0 - 0.28, 0, oh + 0.02, M['e_cool'], 0)
    box('Laibung', deep, ow, 0.1, deep / 2, 0, oh + 0.05, M['frame'], 0.01)
    if kind == 'laden':      # halb heruntergelassenes Rollgitter
        box('Rollgitter', 0.06, ow - 0.1, 0.24, 0.25, 0, oh - 0.12, M['cab'], 0.004)
        for k in range(4): box('Gitterlamelle', 0.075, ow - 0.1, 0.012, 0.25, 0, oh - 0.03 - k * 0.06, M['frame'], 0)
        box('Gitterleiste', 0.1, ow - 0.08, 0.05, 0.25, 0, oh - 0.26, M['steel'], 0.006)
    # Schildkasten über der Öffnung (Schrift kommt je Bucht dazu)
    sz0, sz1 = oh + 0.75, oh + 2.1
    box('Schildkasten', 0.22, ow + 0.4, sz1 - sz0 + 0.2, x0 - 0.1, 0, (sz0 + sz1) / 2, M['frame'], 0.02)
    box('Schildfeld', 0.02, ow + 0.1, sz1 - sz0 - 0.1, x0 - 0.215, 0, (sz0 + sz1) / 2, M['wall4'], 0)
    fplate(-ow / 2 - 0.1, -1.0, oh + 0.42, oh + 0.62, 3, x=x0, mats=('wall2',), rivets=False); fplate(1.0, ow / 2 + 0.1, oh + 0.42, oh + 0.62, 3, x=x0, mats=('wall2',), rivets=False)
    fplate(-ow / 2 - 0.1, ow / 2 + 0.1, oh + 2.25, h - 0.78, 3, x=x0, mats=('wall3',))
    for sy in (-1, 1):
        box('Portalrippe', 0.18, 0.2, h - oh - 0.4, x0 - 0.09, sy * (ow / 2 + 0.3), oh + 0.2 + (h - oh - 0.4) / 2, M['frame'], 0.012)
    box('Portalkranz', 0.5, 2 * hw, 0.14, x0 - 0.25, 0, h - 0.7, M['frame'], 0.012); box('Kranzlicht', 0.05, 2 * hw, 0.03, x0 - 0.47, 0, h - 0.615, M['e_panel'], 0)
    box('Schwelle', deep - x0 + 0.1, ow, 0.03, (x0 + deep) / 2 - 0.05, 0, 0.015, M['steel'], 0.01)
    for q in range(int(ow / 0.6)): box('Schwellenrille', 0.6, 0.02, 0.004, (x0 + deep) / 2, -ow / 2 + 0.3 + q * 0.6, 0.031, M['rubber'], 0)
def portal_sign(title, sub, sig, ow, oh, x0=-0.12):
    # Schrift, Leuchtlinien und Zeichen im Schildkasten eines Portals (flach)
    sz0, sz1 = oh + 0.75, oh + 2.1; zc = (sz0 + sz1) / 2; x = x0 - 0.228
    text(title, 0.52, (x, -0.4, zc - 0.12), RIGHT_X, RIGHT_Y, M[SIG[sig]], align='CENTER')
    text(sub, 0.13, (x, -0.4, zc - 0.48), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
    box('Schildlinie', 0.012, ow - 0.2, 0.025, x + 0.002, 0, sz1 - 0.12, M[SIG[sig]], 0); box('Schildlinie', 0.012, ow - 0.2, 0.025, x + 0.002, 0, sz0 + 0.12, M[SIG[sig]], 0)
    emblem((x, ow / 2 - 0.75, zc), RIGHT_X, RIGHT_Y, 0.42, M[SIG[sig]])
    area('Schildlicht', (x - 0.6, 0, zc), (0, -PI / 2, 0), ow, 1.0, 120, SIGC[sig])

# =====================================================================================
# Decke der Halle (polar): Keil von 30°, zwölfmal gesetzt
# =====================================================================================
M['e_panel_h'] = mk('Lichtfeld Halle', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.88, 0.92, 1.0), es=1.8, grime=False)      # Lichtleisten der Hallendecke, gedimmt seit 23.11.2026 (mehr Kontrast)
def b_deckenkeil():
    a = RAD(15); h = RH_HW; R = RH_R; r = RH_RD
    arc_mesh('Ringbalken', R - 0.7, R + 0.2, -a, a, h, h + 0.7, M['frame'], 0.012)
    arc_mesh('Ringbalken Licht', R - 0.72, R - 0.69, -a, a, h + 0.08, h + 0.12, M['e_cool'], 0)
    arc_mesh('Deckenplatte', r + 0.4, R + 0.2, -a, a, h + 0.95, h + 1.1, M['wall4'], 0)
    arc_mesh('Zwischenring', 11.0, 11.4, -a, a, h + 0.35, h + 0.95, M['frame'], 0.01)
    arc_mesh('Trommelring', r - 0.15, r + 0.55, -a, a, h, h + 0.95, M['frame'], 0.012)
    arc_mesh('Trommelring Licht', r - 0.17, r - 0.14, -a, a, h + 0.1, h + 0.14, M['e_panel'], 0)
    # Radialbalken in der Mitte des Keils
    ln = R - r; xm = (R + r) / 2
    box('Radialbalken', ln, 0.5, 0.75, xm, 0, h + 0.55, M['frame'], 0.015); box('Balkenlicht', ln - 1.6, 0.08, 0.02, xm, 0, h + 0.17, M['e_cool'], 0)
    box('Balkensteg', ln, 0.12, 0.3, xm, 0, h + 0.05, M['wall2'], 0.008)
    for x in (8.6, 13.6): box('Balkenlasche', 0.5, 0.56, 0.6, x, 0, h + 0.55, M['wall2'], 0.01)
    # Kassetten mit Lichtfeldern (je Halbkeil zwei Ringe)
    for sg in (-1, 1):
        for (r0, r1) in ((r + 0.8, 10.75), (11.65, R - 1.0)):
            a0, a1 = sorted((sg * RAD(2.0), sg * RAD(13.4)))
            arc_mesh('Kassettenrahmen', r0, r1, a0, a1, h + 0.82, h + 0.95, M['wall2'], 0.006)
            m0 = 0.35 / ((r0 + r1) / 2)
            arc_mesh('Kassette', r0 + 0.35, r1 - 0.35, a0 + m0, a1 - m0, h + 0.86, h + 0.88, M['wall4'], 0)
            tm = (a0 + a1) / 2; wl = 0.12 / ((r0 + r1) / 2)
            arc_mesh('Lichtleiste', r0 + 0.5, r1 - 0.5, tm - wl, tm + wl, h + 0.8, h + 0.83, M['e_panel_h'], 0)
            for rr in (r0 + 0.35 + (r1 - r0 - 0.7) * q / 4 for q in range(1, 4)):
                arc_mesh('Lichtsteg', rr - 0.02, rr + 0.02, a0 + m0, a1 - m0, h + 0.79, h + 0.8, M['frame'], 0)
    # Lüftung und Sprinkler
    rr = 14.0; n = 8
    pipe('Lüftungsring', [Vector((rr * math.cos(-a + 2 * a * k / n), rr * math.sin(-a + 2 * a * k / n), h + 0.55)) for k in range(n + 1)], 0.24, M['wall'], res=8)
    for k in (1, 4, 7):
        t = -a + 2 * a * k / n; p = Vector((rr * math.cos(t), rr * math.sin(t), h + 0.55))
        pipe('Hänger', [p + Vector((0, 0, 0.2)), p + Vector((0, 0, 0.42))], 0.015, M['steel'])
    for rr2 in (9.5, 13.2):
        for sg in (-1, 1):
            x, y = polar(rr2, sg * RAD(7.5)); cyl('Sprinkler', 0.03, 0.08, x, y, h + 0.76, M['copper'], 'Z', n=8, bev=0)
    # Trommel: Wand mit Lichtschlitzen, Decke
    arc_mesh('Trommelwand', r, r + 0.15, -a, a, h + 0.95, RH_HD, M['wall2'], 0)
    for sg in (-1, 1):
        t = sg * RAD(7.5); w = 0.35 / r
        arc_mesh('Lichtschlitz', r - 0.02, r, t - w, t + w, h + 1.5, RH_HD - 0.5, M['e_panel'], 0)
        arc_mesh('Schlitzrahmen', r - 0.08, r, t - w - 0.05 / r, t + w + 0.05 / r, h + 1.35, h + 1.5, M['frame'], 0.004)
        arc_mesh('Schlitzrahmen', r - 0.08, r, t - w - 0.05 / r, t + w + 0.05 / r, RH_HD - 0.5, RH_HD - 0.35, M['frame'], 0.004)
    x, y = polar(r - 0.12, 0.0); box('Trommelrippe', 0.25, 0.35, RH_HD - h - 0.95, x, y, (h + 0.95 + RH_HD) / 2, M['frame'], 0.012)
    arc_mesh('Trommeldecke', 0.6, r + 0.15, -a, a, RH_HD, RH_HD + 0.15, M['wall4'], 0)
    arc_mesh('Deckenring', 3.2, 3.5, -a, a, RH_HD - 0.3, RH_HD, M['frame'], 0.008)
    x0_, x1_ = 0.8, r - 0.2; box('Deckenstrebe', x1_ - x0_, 0.18, 0.3, (x0_ + x1_) / 2, 0, RH_HD - 0.15, M['frame'], 0.01)
def b_lichtkrone():      # Lichtkrone unter der Trommeldecke (einmal)
    z = RH_HD - 0.9
    for (rr, mm, th) in ((1.6, 'e_white', 0.05), (3.0, 'e_white', 0.06), (4.6, 'e_panel', 0.05)):
        ring('Kronenring', rr, th, (0, 0, z), (0, 0, 1), M[mm], 72); ring('Kronenträger', rr, th + 0.04, (0, 0, z + 0.09), (0, 0, 1), M['frame'], 72)
    for k in range(12):
        t = k * PI / 6; c, s = math.cos(t), math.sin(t)
        pipe('Kronenspeiche', [(1.6 * c, 1.6 * s, z + 0.09), (4.6 * c, 4.6 * s, z + 0.09)], 0.03, M['frame'])
        if k % 3 == 0: pipe('Kronenseil', [(3.0 * c, 3.0 * s, z + 0.12), (3.0 * c, 3.0 * s, RH_HD - 0.3)], 0.012, M['steel'])
    disc('Kronennabe', 0.7, z - 0.1, z + 0.2, M['frame'], 32, 0.02); disc('Nabenlicht', 0.5, z - 0.12, z - 0.1, M['e_white'], 32, 0)
    area('Kronenlicht', (0, 0, z - 0.2), (0, 0, 0), 6.0, 6.0, 1400, (0.85, 0.92, 1.0))

# =====================================================================================
# Boden der Halle (polar): Keil von 60° um eine Öffnung, sechsmal gesetzt
# =====================================================================================
RINGS = ((4.6, 6.8), (6.8, 9.2), (9.2, 11.6), (11.6, 14.0), (14.0, RH_R + 0.05))
def b_bodenkeil():
    a = RAD(30); g = 0.012; R = random.Random(5)
    for ri, (r0, r1) in enumerate(RINGS):
        n = max(2, int(round(RAD(60) * (r0 + r1) / 2 / 2.1)))
        for i in range(n):
            a0 = -a + 2 * a * i / n; a1 = -a + 2 * a * (i + 1) / n
            mid = (a0 + a1) / 2
            m = 'hall2' if abs(mid) * (r0 + r1) / 2 < 1.0 else ('floor' if ri == 4 else ('hall' if R.random() < 0.88 else 'hall2'))
            arc_mesh('Bodenplatte', r0 + g, r1 - g, a0 + g / r0, a1 - g / r0, -0.06, 0.0, M[m], 0.004)
            if ri in (1, 3) and R.random() < 0.25:
                x, y = polar((r0 + r1) / 2, mid); box('Bodenluke', 0.6, 0.6, 0.008, x, y, 0.004, M['frame'], 0.003, (0, 0, mid))
                for q in range(4): cyl('Lukenschraube', 0.012, 0.01, x + 0.25 * math.cos(mid + q * PI / 2 + PI / 4) * 1.41, y + 0.25 * math.sin(mid + q * PI / 2 + PI / 4) * 1.41, 0.009, M['steel'], 'Z', n=6, bev=0)
        # Fuge zwischen den Ringen: dunkle Leiste, am Treffpunktring Messing
        arc_mesh('Ringfuge', r0 - 0.03, r0 + 0.03, -a, a, -0.06, -0.005, M['messing' if ri == 0 else 'frame'], 0)
    # Rinne an der Wand
    arc_mesh('Wandrinne', RH_R - 0.15, RH_R + 0.05, -a, a, -0.02, 0.002, M['grate'], 0)
    # Leitspur zur Öffnung: zwei Linien, Pfeile nach außen
    for sy in (-1, 1): box('Leitlinie', RH_R - 5.4, 0.06, 0.004, (RH_R + 4.6) / 2, sy * 0.95, 0.002, M['txto'], 0)
    for x in (6.2, 10.4, 14.6): arrow((x, 0, 0.0), (1, 0, 0), (0, 1, 0), 0.9, M['txto'], 0.16)
    # Spuren und Flecken
    for k in range(10):
        r = R.uniform(5.0, RH_R - 0.6); t = R.uniform(-a, a); x, y = polar(r, t)
        spot((x, y, 0.0), R.uniform(0.25, 0.9), 'abrieb' if k % 3 else 'fleck', R.uniform(0.6, 1.6))

# =====================================================================================
# Treffpunkt in der Mitte (polar, einmal): Podest, Galaxiekarte, Bankring, Pflanzen
# =====================================================================================
def b_treffpunkt():
    disc('Podest', 4.6, -0.06, 0.04, M['frame'], 96, 0.02)
    ring('Podestlicht', 4.62, 0.018, (0, 0, 0.02), (0, 0, 1), M['e_amber'], 96)
    for k in range(12):
        t0, t1 = k * PI / 6, (k + 1) * PI / 6
        arc_mesh('Podestplatte', 1.8, 4.5, t0 + 0.006, t1 - 0.006, 0.04, 0.06, M['hall2' if k % 2 else 'hall'], 0.004)
    disc('Kartenring', 1.8, 0.04, 0.07, M['messing'], 72, 0.006)
    # Galaxiekarte: runder Tisch, darüber die Scheibe aus Lichtarmen und Sternen
    disc('Kartensockel', 1.25, 0.07, 0.75, M['wall2'], 72, 0.03); disc('Kartenkragen', 1.45, 0.75, 0.86, M['frame'], 72, 0.02)
    disc('Kartenglas', 1.32, 0.86, 0.88, M['e_holo'], 72, 0)
    for k in range(16):
        t = k * PI / 8; x, y = polar(1.38, t); cyl('Kragenschraube', 0.014, 0.01, x, y, 0.865, M['steel'], 'Z', n=6, bev=0)
    for k in range(4):
        t = k * PI / 2; c, s = math.cos(t), math.sin(t)
        box('Kartenpult', 0.5, 0.3, 0.05, 1.55 * c, 1.55 * s, 0.9, M['frame'], 0.01, (0, 0.35, t)); box('Pultbild', 0.4, 0.22, 0.008, 1.56 * c, 1.56 * s, 0.93, M['screen'], 0, (0, 0.35, t))
    z = 1.95; R = random.Random(9); tilt = 0.32
    def tp(x, y, zz): return (x, y * math.cos(tilt) - (zz - z) * math.sin(tilt), z + y * math.sin(tilt) + (zz - z) * math.cos(tilt))
    for arm in range(4):
        pts = []
        for q in range(30):
            u = q / 29; t = arm * PI / 2 + u * 3.8; rr = 0.12 + u * 1.2
            pts.append(tp(rr * math.cos(t), rr * math.sin(t), z))
        pipe('Galaxiearm', pts, 0.022, M['e_holo'])
        for q in range(45):
            u = R.random() ** 0.8; t = arm * PI / 2 + u * 3.8 + R.uniform(-0.3, 0.3); rr = 0.12 + u * 1.2 + R.uniform(-0.1, 0.1)
            cyl('Stern', 0.014 + R.random() * 0.016, 0.03, *tp(rr * math.cos(t), rr * math.sin(t), z + R.uniform(-0.05, 0.05)), M['e_white' if R.random() < 0.35 else 'e_holo'], 'Z', n=6, bev=0)
    ob = cyl('Galaxiekern', 0.16, 0.1, 0, 0, z, M['e_amber'], 'Z', n=16, bev=0); ob.rotation_euler = (tilt, 0, 0)
    ring('Kartenrand', 1.38, 0.01, (0, 0, z), (0, -math.sin(tilt), math.cos(tilt)), M['e_holo'], 96); ring('Kartenrand', 1.32, 0.006, (0, 0, 0.9), (0, 0, 1), M['e_holo'], 96)
    ob = cyl('Holoschleier', 1.36, 0.02, 0, 0, z, M['holoschleier'], 'Z', n=64, bev=0); ob.rotation_euler = (tilt, 0, 0)
    ob = cyl('Lichtkegel', 1.3, z - 0.95, 0, 0, (z + 0.88) / 2, M['holoschleier'], 'Z', n=64, bev=0, r2=1.25)
    point('Kartenlicht', (0, 0, z), 90, (0.3, 0.7, 1.0), 0.6)
    # Bankring mit Lücken an den sechs Wegen; Pflanzkübel zwischen den Wegen
    for k in range(6):
        t = RAD(60 * k + 30); w = RAD(18)
        arc_mesh('Banksockel', 2.65, 3.05, t - w, t + w, 0.06, 0.42, M['frame'], 0.012)
        arc_mesh('Banksitz', 2.55, 3.15, t - w - 0.01, t + w + 0.01, 0.42, 0.52, M['polster'], 0.03)
        arc_mesh('Banklehne', 3.15, 3.3, t - w, t + w, 0.42, 0.95, M['wall2'], 0.02)
        arc_mesh('Lehnenpolster', 3.08, 3.16, t - w + 0.01, t + w - 0.01, 0.58, 0.92, M['polster'], 0.02)
        arc_mesh('Banklicht', 2.6, 2.63, t - w, t + w, 0.27, 0.29, M['e_amber'], 0)
        # niedriger Pflanzkübel hinter der Lehne mit Büschen
        arc_mesh('Kübel', 3.4, 4.25, t - w * 0.8, t + w * 0.8, 0.06, 0.6, M['cab'], 0.03)
        arc_mesh('Kübelband', 3.39, 4.26, t - w * 0.81, t + w * 0.81, 0.44, 0.49, M['teal'], 0.004)
        arc_mesh('Kübelrand', 3.35, 4.3, t - w * 0.82, t + w * 0.82, 0.6, 0.66, M['frame'], 0.01)
        arc_mesh('Erde', 3.46, 4.19, t - w * 0.76, t + w * 0.76, 0.56, 0.6, M['erde'], 0)
        for q in range(4):
            tt = t - w * 0.55 + w * 1.1 * q / 3; rr = 3.82 + 0.12 * (1 if q % 2 else -1); x, y = polar(rr, tt)
            e = inst(BUSCH(), (x, y, 0.58), q * 1.9 + k); sc = 0.75 + 0.25 * ((q * 7 + k * 3) % 4) / 3; e.scale = (sc, sc, sc)
        x, y = polar(3.8, t); point('Pflanzlicht', (x, y, 2.2), 18, (0.95, 0.85, 0.7), 0.3)

M['blatt2'] = mk('Blatt dunkel', (0.025, 0.075, 0.03), 0.0, 0.55, var=0.5, scale=3.0, grime=False)
def b_busch():      # Busch aus flachen, gebogenen Blättern (einmal gebaut, im Treffpunkt vielfach gesetzt)
    R = random.Random(81)
    for k in range(34):
        a = R.uniform(0, 2 * PI); up = R.uniform(0.35, 1.25); ln = R.uniform(0.32, 0.6); wd = ln * R.uniform(0.16, 0.26)
        bm = bmesh.new(); vs = []
        for i in range(6):
            u = i / 5; hw_ = wd * math.sin(math.pi * min(u * 1.15, 1)) * 0.5
            r_ = u * ln; zz = r_ * math.sin(up) - (u ** 2) * ln * 0.45; xx = r_ * math.cos(up)
            vs.append((xx, -hw_, zz)); vs.append((xx, hw_, zz + hw_ * 0.25))
        V = [bm.verts.new(v) for v in vs]
        for i in range(5): bm.faces.new((V[2 * i], V[2 * i + 2], V[2 * i + 3], V[2 * i + 1]))
        me = bpy.data.meshes.new('Blatt'); bm.to_mesh(me); bm.free(); me.materials.append(M['blatt2' if k % 3 else 'blatt'])
        for p in me.polygons: p.use_smooth = True
        ob = link(bpy.data.objects.new('Blatt', me)); ob.rotation_euler = (0, 0, a); ob.location = (0, 0, R.uniform(0.0, 0.12))
        so = ob.modifiers.new('Dicke', 'SOLIDIFY'); so.thickness = 0.004
    for k in range(5): pipe('Stängel', [(0, 0, 0), (math.cos(k * 1.3) * 0.08, math.sin(k * 1.3) * 0.08, 0.25)], 0.008, M['blatt2'])
def BUSCH(): return module('Busch', b_busch)
def n_kuebel():      # runder Pflanzkübel mit drei Büschen
    cyl('Kübel', 0.42, 0.62, 0, 0, 0.31, M['cab'], 'Z', n=32, bev=0.02); ring('Kübelband', 0.425, 0.02, (0, 0, 0.45), (0, 0, 1), M['teal'], 32)
    cyl('Kübelrand', 0.46, 0.06, 0, 0, 0.64, M['frame'], 'Z', n=32, bev=0.01); cyl('Erde', 0.38, 0.03, 0, 0, 0.6, M['erde'], 'Z', n=32, bev=0)
    for k in range(3): e = inst(BUSCH(), (0.16 * math.cos(k * 2.1), 0.16 * math.sin(k * 2.1), 0.6), k * 2.0); e.scale = (0.8, 0.8, 0.8 + 0.15 * k)
    point('Pflanzlicht', (0, 0, 2.0), 10, (0.95, 0.85, 0.7), 0.3)
def b_ringschirm():      # Ring aus sechs Bildschirmen über dem Treffpunkt (einmal)
    z0, z1 = 5.5, 6.3; r = 2.5
    for k in range(6):
        t = k * PI / 3; c, s = math.cos(t), math.sin(t); w = 2 * r * math.tan(PI / 6)
        box('Schirmkasten', 0.28, w - 0.04, z1 - z0, r * c, r * s, (z0 + z1) / 2, M['frame'], 0.02, (0, 0, t))
        box('Schirm', 0.02, w - 0.24, z1 - z0 - 0.16, (r + 0.15) * c, (r + 0.15) * s, (z0 + z1) / 2, M['screen5'], 0, (0, 0, t))
        box('Schirmlicht unten', 0.2, w - 0.1, 0.02, r * c, r * s, z0 - 0.005, M['e_cool'], 0, (0, 0, t))
        lab = ['TREFFPUNKT', 'DECK 3', 'AUFTRÄGE  >', 'BASTION', 'TREFFPUNKT', 'WILLKOMMEN'][k]
        xd = (-s, c, 0)
        text(lab, 0.2, ((r + 0.165) * c, (r + 0.165) * s, (z0 + z1) / 2 - 0.07), xd, (0, 0, 1), M['e_sig_a'], align='CENTER')
        box('Schirmleiste', 0.3, w - 0.04, 0.05, r * c, r * s, z1 + 0.03, M['e_cool'], 0, (0, 0, t))
        p = Vector((r * 0.8 * c, r * 0.8 * s, z1))
        pipe('Schirmseil', [p, p + Vector((0, 0, RH_HD - 0.9 - z1))], 0.012, M['steel'])

# =====================================================================================
# Bucht (Laden): Hülle in eigenem Rahmen: Mündung bei x = 0, Tiefe nach +x bis BD, Breite y ±BW/2
# =====================================================================================
def b_buchtwand():      # 2-m-Stück Buchtwand an der Bezugsseite (x = −1,7, Blick nach +X) wie die Wandfüllungen; trägt Sockel, Lichtfuge, Oberfelder
    box('Buchtwand', 0.06, 2.0, BH, XL - 0.03, 0, BH / 2, M['wall'], 0)
    box('Sockel', 0.13, 2.0, 0.2, XL + 0.065, 0, 0.1, M['frame'], 0.01); box('Sockelnase', 0.2, 2.0, 0.035, XL + 0.1, 0, 0.2175, M['wall2'], 0.008)
    box('Lichtfuge', 0.02, 1.96, 0.035, XL + 0.012, 0, 2.165, M['e_cool'], 0); box('Gesims', 0.09, 2.0, 0.06, XL + 0.045, 0, 2.215, M['frame'], 0.008)
    field(-1, -0.9, 0.9, 2.27, 3.3, 3)
    box('Pilaster', 0.1, 0.2, BH, XL + 0.05, -1.0, BH / 2, M['frame'], 0.012)
    box('Oberband', 0.12, 2.0, 0.08, XL + 0.06, 0, 3.4, M['frame'], 0.008); box('Oberlicht', 0.02, 1.96, 0.03, XL + 0.125, 0, 3.37, M['e_cool'], 0)
    field(-1, -0.9, 0.9, 3.5, BH - 0.1, 4)
def b_buchtschale():      # Boden, Decke, Ecken der Bucht
    R = random.Random(21); nx, ny = 5, 6
    for i in range(nx):
        for j in range(ny):
            x0, x1 = 0.75 + i * (BD - 0.75) / nx, 0.75 + (i + 1) * (BD - 0.75) / nx; y0, y1 = -BW / 2 + j * BW / ny, -BW / 2 + (j + 1) * BW / ny
            box('Buchtboden', x1 - x0 - 0.02, y1 - y0 - 0.02, 0.06, (x0 + x1) / 2, (y0 + y1) / 2, -0.03, M['floor2' if R.random() < 0.75 else 'floor'], 0.004)
    box('Buchtboden Rand', 0.75, BW, 0.06, 0.375, 0, -0.03, M['floor'], 0.004)
    for sy in (-1, 1): box('Buchtrückwand', BD, 0.15, BH, BD / 2, sy * (BW / 2 + 0.075), BH / 2, M['wall4'], 0)
    box('Buchtrückwand', 0.15, BW + 0.3, BH, BD + 0.075, 0, BH / 2, M['wall4'], 0)
    for sy in (-1, 1): box('Eckleiste', 0.2, 0.2, BH, BD - 0.1, sy * (BW / 2 - 0.1), BH / 2, M['frame'], 0.012)
    for k in range(5):
        spot((R.uniform(1.5, BD - 1), R.uniform(-3.5, 3.5), 0.0), R.uniform(0.25, 0.7), 'abrieb' if k % 2 else 'fleck', R.uniform(0.7, 1.5))

def b_buchtdecke():      # Decke der Bucht (eigener Baustein: für den Blick von oben abschaltbar)
    box('Buchtdecke', BD, BW, 0.15, BD / 2, 0, BH + 0.075, M['wall4'], 0)
    for x in (3.0, 5.85): box('Deckenträger', 0.3, BW, 0.35, x, 0, BH - 0.175, M['frame'], 0.012)
    for (xc, yc) in ((1.65, -2.2), (1.65, 2.2), (4.42, -2.2), (4.42, 2.2), (7.3, -2.2), (7.3, 2.2)):
        box('Lichtrahmen', 1.9, 2.6, 0.06, xc, yc, BH - 0.03, M['frame'], 0.01); box('Kassette', 1.7, 2.4, 0.02, xc, yc, BH - 0.062, M['wall4'], 0)
        for sx in (-1, 1): box('Lichtleiste', 0.22, 2.3, 0.02, xc + sx * 0.5, yc, BH - 0.07, M['e_panel'], 0)
    pipe('Buchtleitung', [(0.5, 0, BH - 0.45), (BD - 0.3, 0, BH - 0.45)], 0.16, M['wall'], res=8)
    pipe('Buchtleitung', [(0.5, 0.45, BH - 0.32), (BD - 0.3, 0.45, BH - 0.32)], 0.06, M['red'], res=6)
    for x in (1.0, 3.0, 5.0, 7.0): box('Leitungsschelle', 0.08, 0.9, 0.06, x, 0.2, BH - 0.24, M['frame'], 0.004)
    for (x, y) in ((1.65, 0.0), (4.42, 0.0), (7.3, 0.0)): cyl('Sprinkler', 0.03, 0.08, x, y + 0.9, BH - 0.07, M['copper'], 'Z', n=8, bev=0)

# =====================================================================================
# Korridor vom Hangar (eigener Rahmen: x längs von 0 bis 4 je Joch, Halle bei +x, y quer)
# =====================================================================================
def b_joch():
    hw = KW / 2; L = 4.0; R = random.Random(31)
    # Boden: Mittelspur hell, Seiten mit Noppen, Rinnen an der Wand
    box('Mittelspur', L - 0.02, 2.2, 0.06, L / 2, 0, -0.03, M['hall2'], 0.004)
    for sy in (-1, 1):
        for j in range(2):
            y0 = sy * (1.1 + j * 1.25); y1 = sy * (1.1 + (j + 1) * 1.25)
            for i in range(2): box('Gangplatte', L / 2 - 0.02, abs(y1 - y0) - 0.02, 0.06, L / 4 + i * L / 2, (y0 + y1) / 2, -0.03, M['floor' if j else 'hall'], 0.004)
        box('Rinne', L, 0.2, 0.02, L / 2, sy * (hw - 0.3), -0.005, M['grate'], 0)
        box('Leitlinie', L, 0.06, 0.004, L / 2, sy * 1.08, 0.002, M['txto'], 0)
    arrow((1.2, 0, 0.0), (1, 0, 0), (0, 1, 0), 1.1, M['txto'], 0.2)
    # Wände: senkrecht bis 3,0 m, dann Schräge bis zur Decke (5,0 m, 6 m breit)
    for sy in (-1, 1):
        box('Gangwand', L, 0.15, 3.0, L / 2, sy * (hw + 0.075), 1.5, M['wall4'], 0)
        prism('Schräge', [(sy * hw, 3.0), (sy * (hw + 0.15), 3.0), (sy * 3.15, KH + 0.15), (sy * 3.0, KH + 0.15), (sy * 3.0, KH)], 0, L, M['wall2'], 'X', 0)
        box('Sockel', L, 0.13, 0.22, L / 2, sy * (hw - 0.065), 0.11, M['frame'], 0.01); box('Sockelnase', L, 0.2, 0.035, L / 2, sy * (hw - 0.1), 0.2375, M['wall2'], 0.008)
        box('Sockellicht', L, 0.02, 0.012, L / 2, sy * (hw - 0.19), 0.212, M['e_amber'], 0)
        box('Gesims', L, 0.3, 0.08, L / 2, sy * (hw - 0.15), 3.0, M['frame'], 0.01); box('Gesimslicht', L, 0.03, 0.03, L / 2, sy * (hw - 0.29), 2.95, M['e_cool'], 0)
        # Platten auf der Schräge (Schräge von y = ±4, z = 3 bis y = ±3, z = 5; Normale zeigt in den Gang)
        rx = RAD(116.57) if sy > 0 else RAD(63.43)
        for i in range(2):
            xc = 0.36 + 0.9 + i * 1.82
            box('Schrägplatte', 1.74, 2.0, 0.03, xc, sy * 3.482, 3.991, M['wall3' if (i + (sy > 0)) % 2 else 'wall2'], 0.006, (rx, 0, 0))
            box('Schrägleiste', 0.05, 2.1, 0.05, xc + 0.9, sy * 3.47, 3.985, M['frame'], 0.006, (rx, 0, 0))
        # wie die Raumwände des alten Baukastens: Lichtfuge, Gesims und Oberfelder über den Wandfüllungen
        box('Lichtfuge', L, 0.02, 0.035, L / 2, sy * (hw - 0.012), 2.165, M['e_cool'], 0); box('Gesims2', L, 0.09, 0.06, L / 2, sy * (hw - 0.045), 2.215, M['frame'], 0.008)
        for (a, b) in ((0.4, 2.1), (2.2, 3.92)):
            prism('Oberfeld', inset([(a, 2.27), (b, 2.27), (b, 2.82), (b - 0.08, 2.9), (a, 2.9)], 0.005), sy * (hw - 0.03), sy * hw, M['wall2'], 'Y', 0.005)
        # Lichtband am Übergang zur Decke
        box('Deckenkante', L, 0.25, 0.1, L / 2, sy * 3.0, KH - 0.05, M['frame'], 0.01)
    box('Decke', L, 6.3, 0.15, L / 2, 0, KH + 0.075, M['wall4'], 0)
    box('Lichtbandrahmen', L, 0.9, 0.08, L / 2, 0, KH - 0.04, M['frame'], 0.008); box('Lichtband', L - 0.02, 0.6, 0.02, L / 2, 0, KH - 0.085, M['e_panel'], 0)
    for sy in (-1, 1): pipe('Gangleitung', [(0, sy * 2.2, KH - 0.35), (L, sy * 2.2, KH - 0.35)], 0.13, M['wall' if sy > 0 else 'red'], res=6)
    for sy in (-1, 1): box('Leitungsträger', 0.08, 0.5, 0.05, 1.0, sy * 2.2, KH - 0.17, M['frame'], 0.004); box('Leitungsträger', 0.08, 0.5, 0.05, 3.0, sy * 2.2, KH - 0.17, M['frame'], 0.004)
    # Spant am Jochanfang: folgt dem Querschnitt
    for sy in (-1, 1):
        box('Spantpfosten', 0.36, 0.34, 3.0, 0.18, sy * (hw - 0.17), 1.5, M['frame'], 0.02)
        box('Spantlicht', 0.04, 0.03, 2.4, 0.18, sy * (hw - 0.355), 1.6, M['e_cool'], 0)
        box('Spantschräge', 0.36, 0.34, 2.3, 0.18, sy * 3.348, 3.924, M['frame'], 0.02, (RAD(26.57) * sy, 0, 0))
        box('Spantfuß', 0.5, 0.45, 0.3, 0.18, sy * (hw - 0.22), 0.15, M['frame'], 0.015); box('Fußband', 0.51, 0.012, 0.22, 0.18, sy * (hw - 0.45), 0.16, M['warn'], 0)
    box('Spantriegel', 0.36, 6.3, 0.34, 0.18, 0, KH - 0.17, M['frame'], 0.02)
    for q in range(2): streak((1.0 + q * 2.0, (hw - 0.002) * (1 if q else -1), 2.9), (0, -1, 0) if q else (0, 1, 0), (0, 0, 1), 0.3, 1.6, 'spur')
    spot((R.uniform(0.5, 3.5), R.uniform(-2.5, 2.5), 0.0), 0.6, 'abrieb', 1.4)
def b_hangartor():      # Ende des Korridors am Hangar (eigener Rahmen wie das Joch, Tor bei x = 0, Hangar bei x < 0)
    ow, oh = 5.6, 4.4; hw = KW / 2      # Tor passt in die Öffnung der Hangarrückwand im Spiel (6,3 × 4,8 m)
    for sy in (-1, 1):
        box('Torwand', 0.6, hw + 0.6 - ow / 2, KH + 0.2, -0.3, sy * (ow / 2 + (hw + 0.6 - ow / 2) / 2), (KH + 0.2) / 2, M['wall4'], 0)
        box('Torpfosten', 0.8, 0.5, oh + 0.3, 0.1, sy * (ow / 2 + 0.25), (oh + 0.3) / 2, M['frame'], 0.03)
        box('Torflügel', 0.25, 0.5, oh, -0.25, sy * (ow / 2 + 0.05), oh / 2, M['wall2'], 0.02)
        box('Torband', 0.012, 0.42, 1.2, 0.505, sy * (ow / 2 + 0.25), 0.7, M['warn'], 0)
        cyl('Torleuchte', 0.08, 0.06, 0.52, sy * (ow / 2 + 0.25), oh - 0.4, M['e_amber'], 'X', n=16, bev=0)
        box('Torlicht', 0.04, 0.04, oh - 0.5, 0.52, sy * (ow / 2 + 0.02), oh / 2, M['e_cool'], 0)
    box('Torwand', 0.6, KW + 1.2, KH + 0.2 - oh, -0.3, 0, oh + (KH + 0.2 - oh) / 2, M['wall4'], 0)
    box('Torsturz', 0.8, ow + 1.0, 0.45, 0.1, 0, oh + 0.225, M['frame'], 0.03)
    box('Torschild', 0.1, 4.4, 0.6, 0.55, 0, oh + 0.75 - 0.05, M['wall4'], 0.01)
    text('HANGAR', 0.32, (0.61, 0, oh + 0.6), (0, -1, 0), (0, 0, 1), M['txtw'], align='CENTER')
    box('Torschwelle', 1.2, ow, 0.04, 0.0, 0, 0.02, M['warn2'], 0.01)
    # Hangarseite: Rahmen mit Feldern, Schild DECK 3, Lichtbänder, Warnbänder (die Fläche der Torwand zeigt bei x = −0,6 in den Hangar)
    xf = -0.6
    for sy in (-1, 1):
        fplate(sy * (ow / 2 + 0.55), sy * (KW / 2 + 0.5), 0.3, oh + 0.2, 4 if sy > 0 else 2, flip=sy < 0, x=xf)
        box('Torlicht außen', 0.04, 0.04, oh - 0.3, xf - 0.02, sy * (ow / 2 + 0.52), oh / 2, M['e_cool'], 0)
        box('Warnband außen', 0.012, 0.42, 1.2, xf - 0.006, sy * (ow / 2 + 0.25), 0.7, M['warn'], 0)
        box('Pfosten außen', 0.2, 0.12, oh + 0.3, xf - 0.1, sy * (ow / 2 + 0.56), (oh + 0.3) / 2, M['frame'], 0.012)
    box('Torsockel außen', 0.13, KW + 1.0, 0.22, xf - 0.065, 0, 0.11, M['frame'], 0.01)
    box('Torschild außen', 0.12, 4.6, 0.62, xf - 0.06, 0, oh + 0.48, M['wall4'], 0.012)
    text('DECK 3  ·  TREFFPUNKT', 0.24, (xf - 0.125, 0, oh + 0.4), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
    box('Schildlicht außen', 0.03, 4.4, 0.03, xf - 0.13, 0, oh + 0.82, M['e_cool'], 0)
    # Kulisse: Hangar dahinter (Boden, ferne Rückwand mit Lichtbändern)
    box('Hangarboden', 40, 60, 0.1, -20.5, 0, -0.05, M['floor'], 0)
    box('Hangarwand', 0.5, 60, 30, -40, 0, 15, M['wall4'], 0)
    for z in (6, 14, 22): box('Hangarlicht', 0.1, 50, 0.3, -39.7, 0, z, M['e_cool'], 0)
    for y in (-12, -4, 4, 12): box('Hangarbalken', 40, 0.8, 1.2, -20.5, y, 26, M['frame'], 0)
    area('Hangarlicht', (-20, 0, 24), (0, 0, 0), 30, 30, 30000, COOL)

# =====================================================================================
# Ladenmöbel (Ursprung am Boden; Tresen: Vorderseite nach −y, Personal bei +y)
# =====================================================================================
def n_tresen(tag, sig='a', ln=2.8):
    prism('Tresen', [(-ln / 2, 0.35), (ln / 2, 0.35), (ln / 2, -0.25), (ln / 2 - 0.05, -0.38), (-ln / 2 + 0.05, -0.38), (-ln / 2, -0.25)], 0.1, 1.0, M['cab'], 'Z', 0.02)
    prism('Tresenfront', [(-ln / 2 + 0.1, -0.385), (ln / 2 - 0.1, -0.385), (ln / 2 - 0.1, -0.4), (-ln / 2 + 0.1, -0.4)], 0.25, 0.85, M['wall2'], 'Z', 0.004)
    box('Tresensockel', ln - 0.05, 0.65, 0.1, 0, -0.02, 0.05, M['frame'], 0.008)
    box('Tresenplatte', ln + 0.12, 0.88, 0.05, 0, -0.03, 1.025, M['frame'], 0.012); box('Tresenkante', ln + 0.1, 0.02, 0.03, 0, -0.475, 1.02, M[SIG[sig]], 0)
    box('Fußlicht', ln - 0.3, 0.02, 0.02, 0, -0.33, 0.11, M[SIG[sig]], 0)
    text(tag, 0.13, (0, -0.403, 0.5), (1, 0, 0), (0, 0, 1), M['txtw'], align='CENTER')
    for sx in (-1, 1): box('Frontleiste', 0.04, 0.03, 0.6, sx * (ln / 2 - 0.2), -0.405, 0.55, M[SIG[sig]], 0)
    # Arbeitsplatz dahinter
    box('Bildschirm', 0.6, 0.04, 0.38, -0.5, 0.15, 1.34, M['frame'], 0.008, (RAD(-12), 0, 0)); box('Bild', 0.54, 0.006, 0.32, -0.5, 0.127, 1.345, M['screen'], 0, (RAD(-12), 0, 0))
    box('Schirmfuß', 0.08, 0.08, 0.12, -0.5, 0.2, 1.1, M['frame'], 0.006)
    box('Kundenschirm', 0.36, 0.03, 0.26, 0.55, -0.32, 1.22, M['frame'], 0.006, (RAD(20), 0, 0)); box('Kundenbild', 0.3, 0.006, 0.2, 0.55, -0.338, 1.225, M['screen2'], 0, (RAD(20), 0, 0))
    box('Lesegerät', 0.18, 0.26, 0.03, 0.05, -0.25, 1.065, M['frame'], 0.006); box('Lesefeld', 0.12, 0.18, 0.006, 0.05, -0.25, 1.082, M[SIG[sig]], 0)
    box('Ablage', 0.4, 0.3, 0.12, 1.0, 0.12, 1.11, M['crate'], 0.01); box('Tablett', 0.3, 0.22, 0.02, -1.05, -0.15, 1.06, M['steel'], 0.004)
    area('Tresenlicht', (0, -0.1, 2.4), (0, 0, 0), ln, 0.6, 60, COOL)
def n_hocker():
    cyl('Hockerfuß', 0.22, 0.03, 0, 0, 0.015, M['frame'], 'Z', n=20, bev=0.006); cyl('Hockerstange', 0.035, 0.68, 0, 0, 0.37, M['steel'], 'Z', n=12, bev=0)
    ring('Fußring', 0.18, 0.012, (0, 0, 0.3), (0, 0, 1), M['steel'], 24); cyl('Hockersitz', 0.19, 0.07, 0, 0, 0.74, M['polster'], 'Z', n=20, bev=0.02)
def n_bistro():
    cyl('Tischfuß', 0.28, 0.03, 0, 0, 0.015, M['frame'], 'Z', n=24, bev=0.006); cyl('Tischsäule', 0.05, 1.0, 0, 0, 0.53, M['steel'], 'Z', n=12, bev=0)
    cyl('Tischplatte', 0.4, 0.04, 0, 0, 1.06, M['wall3'], 'Z', n=32, bev=0.008); ring('Tischkante', 0.4, 0.01, (0, 0, 1.06), (0, 0, 1), M['messing'], 32)
    cyl('Becher', 0.035, 0.1, 0.12, 0.08, 1.13, M['white'], 'Z', n=12, bev=0.003)
def n_vitrine(kind=0):
    box('Vitrinensockel', 1.6, 0.7, 0.85, 0, 0, 0.425, M['cab'], 0.02); box('Sockelband', 1.61, 0.71, 0.04, 0, 0, 0.82, M['frame'], 0.006)
    box('Vitrinenglas', 1.56, 0.66, 0.5, 0, 0, 1.11, M['lens'], 0.004); box('Vitrinendeckel', 1.6, 0.7, 0.05, 0, 0, 1.385, M['frame'], 0.008)
    box('Vitrinenlicht', 1.4, 0.04, 0.012, 0, 0, 1.355, M['e_white'], 0)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Glasleiste', 0.03, 0.03, 0.5, sx * 0.785, sy * 0.335, 1.11, M['frame'], 0)
    R = random.Random(41 + kind)
    for q in range(3):
        x = -0.5 + q * 0.5
        box('Auflage', 0.36, 0.42, 0.04, x, 0, 0.885, M['polster'], 0.008)
        if kind == 0:      # Werkzeugmodule
            box('Modul', 0.22, 0.3, 0.08, x, 0, 0.945, M[R.choice(['ochre', 'teal', 'wall2'])], 0.01); box('Modulfeld', 0.12, 0.012, 0.04, x, -0.152, 0.945, M['e_green'], 0)
            cyl('Modulstecker', 0.03, 0.05, x + 0.07, 0.16, 0.945, M['steel'], 'Y', n=10, bev=0)
        else:      # Bergbauköpfe
            cyl('Kopf', 0.07, 0.24, x, 0, 0.98, M['steel'], 'Y', n=16, bev=0.006); cyl('Kopflinse', 0.05, 0.02, x, -0.125, 0.98, M['e_teal'], 'Y', n=16, bev=0)
            for k in range(3): ring('Kühlring', 0.08, 0.008, (x, -0.06 + k * 0.06, 0.98), (0, 1, 0), M['copper'], 16)
        box('Preisschild', 0.12, 0.004, 0.05, x, -0.21, 0.92, M['plate'], 0, (RAD(-30), 0, 0))
def n_helmregal():      # flach: Wandregal mit Helmen (Wandebene x = 0, Raum bei x < 0)
    box('Regalrückwand', 0.04, 2.0, 2.0, -0.02, 0, 1.4, M['wall2'], 0.008)
    for z in (0.75, 1.35, 1.95):
        box('Regalbrett', 0.4, 1.9, 0.04, -0.22, 0, z, M['steel'], 0.006); box('Brettlicht', 0.02, 1.8, 0.012, -0.41, 0, z - 0.03, M['e_white'], 0)
        for q in range(4):
            y = -0.7 + q * 0.47
            cyl('Helmhals', 0.1, 0.05, -0.22, y, z + 0.045, M['rubber'], 'Z', n=16, bev=0)
            ob = cyl('Helm', 0.15, 0.24, -0.22, y, z + 0.18, M['white' if q % 2 else 'ochre'], 'Z', n=20, bev=0.0)
            sp = ob.modifiers.new('Rund', 'SUBSURF'); sp.levels = 2; sp.render_levels = 2
            box('Visier', 0.06, 0.2, 0.11, -0.36, y, z + 0.2, M['visier'], 0.03)
    text('HELME  ·  ANZÜGE', 0.07, (-0.05, 0, 2.15), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
def n_preistafel(w=3.6):      # flach: Kurstafel des Handelskontors
    box('Tafelrahmen', 0.14, w + 0.2, 1.6, -0.07, 0, 2.6, M['frame'], 0.02)
    for q in range(3):
        y = -w / 2 + w / 6 + q * w / 3
        box('Tafelfeld', 0.02, w / 3 - 0.08, 1.3, -0.145, y, 2.6, M['screen3'], 0)
        for r_, (nm, pr) in enumerate([('EISENERZ', '12'), ('KUPFER', '31'), ('TITAN', '58'), ('GAS', '22'), ('KRISTALL', '140'), ('NAHRUNG', '9')][q * 2:q * 2 + 2] + [('ALGEN', '6'), ('SCHROTT', '4'), ('ZELLEN', '75')][q:q + 1]):
            zz = 3.0 - r_ * 0.38
            text(nm, 0.075, (-0.158, y + w / 6 - 0.12, zz), RIGHT_X, RIGHT_Y, M['e_sig_h'])
            text(pr, 0.075, (-0.158, y - w / 6 + 0.12, zz), RIGHT_X, RIGHT_Y, M['e_green' if (q + r_) % 2 else 'e_red'], align='RIGHT')
    box('Tafelkopf', 0.16, w + 0.2, 0.22, -0.08, 0, 3.52, M['wall4'], 0.01)
    text('KURSE  ·  ERZ  ·  GAS  ·  WAREN', 0.1, (-0.165, 0, 3.47), RIGHT_X, RIGHT_Y, M['e_sig_h'], align='CENTER')
def n_auftragswand(w=7.4):      # flach: große Auftragswand
    box('Wandrahmen', 0.16, w + 0.2, 2.4, -0.08, 0, 2.55, M['frame'], 0.02)
    box('Karte', 0.02, w * 0.46, 2.1, -0.165, -w * 0.25, 2.55, M['karte2'], 0)
    for q in range(3):
        box('Liste', 0.02, w * 0.46, 0.62, -0.165, w * 0.25, 3.27 - q * 0.72, M['screen4'], 0)
        for r_, s_ in enumerate((['GELEIT  ·  BROCKEN', 'ERZ LIEFERN  ·  12 t'], ['KOPFGELD  ·  FERROX', 'BERGUNG  ·  WRACK 7'], ['VERMESSUNG  ·  NEBEL', 'FRACHT  ·  EISENKRONE'])[q]):
            text(s_, 0.085, (-0.177, w * 0.25 + w * 0.21, 3.36 - q * 0.72 - r_ * 0.22), RIGHT_X, RIGHT_Y, M['e_sig_a'])
            text(['1.200 CR', '850 CR', '2.400 CR', '600 CR', '1.900 CR', '700 CR'][q * 2 + r_], 0.085, (-0.177, w * 0.25 - w * 0.21, 3.36 - q * 0.72 - r_ * 0.22), RIGHT_X, RIGHT_Y, M['txtw'], align='RIGHT')
    yc_ = -w * 0.25; hw_ = w * 0.23
    for k in range(7): yy = yc_ - hw_ + 0.1 + k * (2 * hw_ - 0.2) / 6; pipe('Kartengitter', [(-0.177, yy, 1.55), (-0.177, yy, 3.55)], 0.0025, M['holo2'])
    for k in range(5): zz = 1.6 + k * 0.48; pipe('Kartengitter', [(-0.177, yc_ - hw_ + 0.05, zz), (-0.177, yc_ + hw_ - 0.05, zz)], 0.0025, M['holo2'])
    for route in (((-2.6, 2.9), (-2.0, 1.9), (-1.2, 2.2)), ((-3.0, 2.0), (-2.6, 2.9), (-0.8, 3.2))):
        pipe('Kartenroute', [(-0.181, u, v) for (u, v) in route], 0.006, M['e_amber'])
    for (u, v) in ((-2.6, 2.9), (-1.2, 2.2), (-2.0, 1.9), (-0.8, 3.2), (-3.0, 2.0)): cyl('Zielpunkt', 0.05, 0.01, -0.18, u, v, M['e_amber'], 'X', n=12, bev=0); ring('Zielring', 0.1, 0.006, (-0.18, u, v), (1, 0, 0), M['e_amber'], 20)
    box('Wandkopf', 0.18, w + 0.2, 0.28, -0.09, 0, 3.9, M['wall4'], 0.01)
    text('AUFTRÄGE  ·  MISSIONEN  ·  KOPFGELD', 0.12, (-0.185, 0, 3.84), RIGHT_X, RIGHT_Y, M['e_sig_a'], align='CENTER')
def n_bauplanwand(w=6.0):      # flach: Werft – Bauplan eines Schiffes
    box('Planrahmen', 0.14, w + 0.2, 2.2, -0.07, 0, 2.5, M['frame'], 0.02); box('Planfläche', 0.02, w, 2.0, -0.145, 0, 2.5, M['glass'], 0)
    c = Vector((-0.16, 0, 2.5)); pts = []
    for k in range(25):
        u = k / 24; y = -2.4 + 4.8 * u; hgt = 0.55 * math.sin(math.pi * min(1, u * 1.3)) ** 0.7 + 0.05
        pts.append((y, hgt))
    pipe('Bauplanlinie', [c + Vector((0, y, h_)) for y, h_ in pts] + [c + Vector((0, y, -h_)) for y, h_ in pts[::-1]], 0.008, M['e_sig_w'], cyclic=True)
    for y in (-1.6, -0.6, 0.4, 1.4): pipe('Bauplanspant', [c + Vector((0, y, -0.5)), c + Vector((0, y, 0.5))], 0.005, M['e_sig_w'])
    pipe('Bauplanachse', [c + Vector((0, -2.7, 0)), c + Vector((0, 2.7, 0))], 0.004, M['e_sig_w'])
    for sy in (-1, 1): pipe('Bauplangondel', [c + Vector((0, 0.6, sy * 0.62)), c + Vector((0, 2.3, sy * 0.62)), c + Vector((0, 2.3, sy * 0.85)), c + Vector((0, 0.6, sy * 0.85))], 0.006, M['e_sig_w'], cyclic=True)
    text('WERFT  ·  BAUPLÄNE  ·  UMBAU', 0.1, (-0.155, 0, 3.45), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
def n_triebwerk():      # Werft: Triebwerk auf Montagebock
    for sx in (-1, 1): box('Bockfuß', 0.15, 1.2, 0.12, sx * 0.6, 0, 0.06, M['ochre'], 0.01); box('Bockstütze', 0.12, 0.12, 0.7, sx * 0.6, 0, 0.45, M['ochre'], 0.01)
    box('Bockwiege', 1.4, 0.3, 0.1, 0, 0, 0.82, M['ochre'], 0.012)
    cyl('Triebwerk', 0.5, 1.6, 0, 0, 1.4, M['steel'], 'X', n=32, bev=0.01); cyl('Düse', 0.62, 0.7, 1.05, 0, 1.4, M['frame'], 'X', n=32, bev=0.01, r2=0.45)
    cyl('Düseninnen', 0.5, 0.02, 1.405, 0, 1.4, M['e_amber'], 'X', n=32, bev=0)
    for k in range(5): ring('Triebwerksring', 0.51, 0.02, (-0.7 + k * 0.32, 0, 1.4), (1, 0, 0), M['copper'], 32)
    cyl('Einlass', 0.42, 0.3, -0.92, 0, 1.4, M['wall2'], 'X', n=32, bev=0.01)
    for k in range(6):
        t = k * PI / 3; pipe('Triebwerksleitung', [(-0.6, 0.53 * math.cos(t), 1.4 + 0.53 * math.sin(t)), (0.6, 0.53 * math.cos(t), 1.4 + 0.53 * math.sin(t))], 0.02, M['rubber'])
    box('Prüfschild', 0.4, 0.01, 0.2, 0, -0.52, 0.92, M['platey'], 0)
def n_bar(ln=5.0):      # Kantine: lange Theke (Vorderseite nach −y)
    prism('Theke', [(-ln / 2, 0.35), (ln / 2, 0.35), (ln / 2, -0.3), (-ln / 2, -0.3)], 0.1, 1.05, M['wall2'], 'Z', 0.02)
    box('Thekenfront', ln - 0.1, 0.02, 0.8, 0, -0.31, 0.55, M['polster'], 0.006)
    for q in range(int(ln / 0.5)): box('Frontrippe', 0.04, 0.03, 0.8, -ln / 2 + 0.25 + q * 0.5, -0.32, 0.55, M['messing'], 0)
    box('Thekenplatte', ln + 0.1, 0.8, 0.06, 0, 0.0, 1.08, M['frame'], 0.015); box('Thekenlicht', ln - 0.2, 0.02, 0.02, 0, -0.32, 0.12, M['e_sig_k'], 0)
    pipe('Fußstange', [(-ln / 2 + 0.2, -0.45, 0.25), (ln / 2 - 0.2, -0.45, 0.25)], 0.02, M['messing'])
    for x in (-ln / 2 + 0.6, ln / 2 - 0.6): box('Stangenhalter', 0.03, 0.16, 0.03, x, -0.38, 0.25, M['messing'], 0)
    R = random.Random(51)
    for q in range(5):
        x = -ln / 2 + 0.6 + q * (ln - 1.2) / 4
        cyl('Glas', 0.035, 0.12, x, -0.1, 1.17, M['lens'], 'Z', n=12, bev=0); cyl('Teller', 0.11, 0.015, x + 0.2, 0.05, 1.12, M['white'], 'Z', n=20, bev=0.003)
    box('Zapfanlage', 0.5, 0.15, 0.45, 0.6, 0.2, 1.33, M['steel'], 0.01)
    for k in range(3): cyl('Zapfhahn', 0.018, 0.16, 0.45 + k * 0.15, 0.08, 1.4, M['messing'], 'Y', n=10, bev=0)
    box('Kasse', 0.3, 0.25, 0.2, -1.6, 0.15, 1.21, M['frame'], 0.008); box('Kassenbild', 0.24, 0.006, 0.12, -1.6, 0.02, 1.25, M['screen'], 0, (RAD(-20), 0, 0))
def n_flaschenwand(w=6.0):      # flach: Rückwand der Kantine mit beleuchteten Flaschenborden und Speisekarte
    box('Bordwand', 0.06, w, 2.6, -0.03, 0, 1.75, M['wall4'], 0.008)
    R = random.Random(61)
    for z in (1.25, 1.75, 2.25):
        box('Bord', 0.3, w - 1.8, 0.03, -0.17, -0.9, z, M['messing'], 0.004); box('Bordlicht', 0.012, w - 1.9, 0.012, -0.31, -0.9, z - 0.02, M['e_warm'], 0)
        y = -w / 2 + 0.15
        while y < w / 2 - 1.95:
            hh = R.uniform(0.22, 0.34); m = R.choice(['flasche', 'flasche2', 'lens', 'flasche'])
            cyl('Flasche', 0.04, hh, -0.17, y, z + 0.015 + hh / 2, M[m], 'Z', n=12, bev=0); cyl('Flaschenhals', 0.014, 0.08, -0.17, y, z + 0.015 + hh + 0.04, M[m], 'Z', n=8, bev=0)
            y += R.uniform(0.11, 0.16)
    box('Karte', 0.05, 1.5, 1.3, -0.05, w / 2 - 0.9, 1.9, M['frame'], 0.01); box('Kartenbild', 0.01, 1.36, 1.16, -0.08, w / 2 - 0.9, 1.9, M['screen2'], 0)
    text('KANTINE', 0.18, (-0.09, w / 2 - 0.9, 2.78), RIGHT_X, RIGHT_Y, M['e_sig_k'], align='CENTER')
    for q, s in enumerate(('EINTOPF  ·  4', 'BRÜHE  ·  2', 'ALGENBROT  ·  3', 'KAFFEE  ·  1')): text(s, 0.07, (-0.086, w / 2 - 0.9, 2.2 - q * 0.22), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
def n_schiffsholo():      # Werft: Projektor mit Drahtgitter-Schiff
    disc('Projektorfuß', 0.6, 0.0, 0.08, M['frame'], 40, 0.012); disc('Projektor', 0.45, 0.08, 0.7, M['wall2'], 40, 0.02); disc('Projektorlinse', 0.38, 0.7, 0.72, M['holo2'], 40, 0)
    z = 1.65; L = 1.7
    def sec(x, w, h): return [(x, w * math.cos(t), z + h * math.sin(t)) for t in [k * 2 * PI / 10 for k in range(10)]]
    stations = [(-L / 2, 0.05, 0.05), (-L * 0.35, 0.28, 0.2), (0.0, 0.36, 0.26), (L * 0.3, 0.3, 0.22), (L / 2, 0.18, 0.16)]
    for (x, w, h) in stations: pipe('Holospant', sec(x, w, h), 0.0035, M['holo2'], cyclic=True)
    for k in range(10):
        pipe('Hololängs', [sec(x, w, h)[k] for (x, w, h) in stations], 0.003, M['holo2'])
    for sy in (-1, 1): pipe('Hologondel', [(0.1, sy * 0.5, z - 0.05), (L * 0.55, sy * 0.5, z - 0.05)], 0.025, M['holo2'])
    for k in range(3): pipe('Lichtkegel', [(0.38 * math.cos(k * 2.1), 0.38 * math.sin(k * 2.1), 0.72), (0.9 * math.cos(k * 2.1), 0.9 * math.sin(k * 2.1), z - 0.3)], 0.002, M['holo2'])
    point('Hololicht', (0, 0, z), 30, (0.7, 0.85, 1.0), 0.5)
def n_warenstapel():      # Handelskontor: Warenproben auf Palette
    box('Palette', 1.2, 1.0, 0.14, 0, 0, 0.07, M['crate'], 0.01)
    R = random.Random(71)
    for (x, y, w, h) in ((-0.3, -0.2, 0.5, 0.4), (0.3, -0.2, 0.5, 0.5), (-0.3, 0.25, 0.5, 0.35), (0.3, 0.25, 0.5, 0.3), (0.0, 0.0, 0.45, 0.35)):
        z = 0.14 + h / 2 + (0.45 if (x, y) == (0.0, 0.0) else 0)
        box('Warenkiste', w, 0.42, h, x, y, z, M[R.choice(['ochre', 'teal', 'crate', 'green'])], 0.015)
        box('Warenetikett', 0.16, 0.004, 0.08, x, y - 0.212, z + 0.05, M['plate'], 0)
    for sx in (-1, 1): box('Spanngurt', 0.04, 1.02, 0.02, sx * 0.3, 0, 0.62, M['ochre'], 0)
def n_waage():      # Handelskontor: Prüfwaage mit Erzprobe
    box('Waagenfuß', 0.9, 0.7, 0.85, 0, 0, 0.425, M['cab'], 0.02); box('Waagenplatte', 0.8, 0.6, 0.04, 0, 0, 0.87, M['steel'], 0.006)
    box('Waagenanzeige', 0.3, 0.05, 0.18, 0.2, -0.3, 1.0, M['frame'], 0.006); box('Anzeigebild', 0.24, 0.006, 0.12, 0.2, -0.326, 1.0, M['e_sig_h'], 0)
    for k in range(5):
        ob = cyl('Erzbrocken', 0.06 + k * 0.01, 0.1, -0.15 + k * 0.07, 0.05 * math.sin(k), 0.94, M['wall2' if k % 2 else 'copper'], 'Z', n=7, bev=0.0)
        ob.rotation_euler = (k * 0.7, k * 1.3, k)

for k_, f_ in (('pfeiler', b_pfeiler), ('deckenkeil', b_deckenkeil), ('lichtkrone', b_lichtkrone), ('bodenkeil', b_bodenkeil), ('treffpunkt', b_treffpunkt),
               ('ringschirm', b_ringschirm), ('buchtschale', b_buchtschale), ('buchtdecke', b_buchtdecke), ('joch', b_joch), ('hangartor', b_hangartor), ('hocker', n_hocker), ('bistro', n_bistro),
               ('vitrine', n_vitrine), ('vitrine2', lambda: n_vitrine(1)), ('helmregal', n_helmregal), ('preistafel', n_preistafel), ('auftragswand', n_auftragswand),
               ('bauplanwand', n_bauplanwand), ('triebwerk', n_triebwerk), ('bar', n_bar), ('flaschenwand', n_flaschenwand), ('schiffsholo', n_schiffsholo),
               ('warenstapel', n_warenstapel), ('waage', n_waage), ('kuebel', n_kuebel)):
    PROP['rh_' + k_] = f_
DRESS['buchtwand'] = (b_buchtwand,)
