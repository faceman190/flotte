# Würger: eigener einsitziger schwerer Jäger, Schaumodell in Blender. Wunsch des Nutzers (17.11.2026): ein Fighter in der Art der gezeigten
# Vorlage (Ares Inferno aus Star Citizen: schwarzer Keil mit roten Akzenten, breite Flügel mit Stufen, große Triebwerksgondeln, Musterplatten),
# „benutz was du gelernt hast, mach es noch besser“. Eigener Entwurf, keine Kopie: Schienenkanone unter dem Rumpf statt seitlicher Gatling,
# Rautenplatten statt Waben, flache Schubvektordüsen, nach außen geneigte Leitwerke auf den Gondeln.
# Aufruf ohne Fenster: blender.exe -b --python wue_lauf.py -- <ansichten>  (baut Wuerger.blend neu)
#
# Achsen: +X nach vorn (Staurohr bei x = 12), +Y Backbord, +Z oben, Boden bei z = 0. Maße 24 × 26 × 4,9 m.
# Bauweise (wie beim Kormoran gelernt, docs/kormoran.md): Rumpf, Flügel und Gondeln als eigene Facettenkörper; zuerst das Plattenraster,
# dann Schichtplatten mit exakten Umrissen, Rahmen- und Musterfelder, dann jede Platte eingerückt (Fuge), Schrauben als Instanzen,
# weich schattiert mit scharfen Kanten ab 6°, Schrift per Shrinkwrap, ruhige symmetrische Farbunterschiede.
import bpy, bmesh, math, random, os, json
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
PI = math.pi
HERE = os.path.dirname(bpy.data.filepath)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for c in list(bpy.data.collections): bpy.data.collections.remove(c)
SC = bpy.context.scene
CUR = [SC.collection]; REC = [None]
exec(compile(open(os.path.join(HERE, '..', 'bastion', 'bk_lib.py'), encoding='utf-8').read(), 'bk_lib.py', 'exec'))
def setp(o, k, v):
    try: setattr(o, k, v)
    except Exception: pass
def coll(name):
    c = bpy.data.collections.new(name); SC.collection.children.link(c); return c
C_HULL, C_PART, C_GEAR, C_WPN, C_LITE, C_DECAL, C_ROOM = coll('Rumpf'), coll('Anbauten'), coll('Fahrwerk'), coll('Waffen'), coll('Lichter'), coll('Beschriftung'), coll('Cockpit')
C_GRAU, C_HANGAR, C_STU = coll('Studio grau'), coll('Hangar'), coll('Kameras')

# =====================================================================================
# Materialien
# =====================================================================================
def low_spec(m, v=0.26):
    b = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    for nm in ('Specular IOR Level', 'Specular'):
        if nm in b.inputs: b.inputs[nm].default_value = v; break
    return m
def hull_mat(name, col, metal=0.32, rough=0.56, wear=0.65):
    return low_spec(mk(name, col, metal, rough, var=0.045, rvar=0.07, scale=0.9, streak=0.08, bump=0.1, bscale=70, wear=wear))
def rauten_mat(name, base, line, scale=2.3):
    # Rautenplatten: um 45° gedrehtes Raster, die Fugen dunkel und vertieft (Bump), dazwischen matte Kacheln
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; K = nt.links
    m['bk'] = json.dumps(dict(col=list(base), metal=0.3, rough=0.6, pattern='rauten', line=list(line), scale=scale))
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); I(b, 'Metallic').default_value = 0.3; I(b, 'Roughness').default_value = 0.62
    tc = N.new('ShaderNodeTexCoord'); mr0 = N.new('ShaderNodeMapping'); mr0.inputs['Scale'].default_value = (1.0, 1.75, 1.0)
    mp = N.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, 0, PI / 4); mp.inputs['Scale'].default_value = (scale, scale, scale)
    K.new(tc.outputs['Object'], mr0.inputs['Vector']); K.new(mr0.outputs[0], mp.inputs['Vector']); sp = N.new('ShaderNodeSeparateXYZ'); K.new(mp.outputs[0], sp.inputs[0])
    def mth(op, a, c=None):
        q = N.new('ShaderNodeMath'); q.operation = op
        for i, v in enumerate((a, c)):
            if v is None: continue
            if isinstance(v, (int, float)): q.inputs[i].default_value = v
            else: K.new(v, q.inputs[i])
        return q.outputs[0]
    lines = []
    for ax in (0, 1):
        f = mth('FRACT', sp.outputs[ax]); d = mth('ABSOLUTE', mth('SUBTRACT', f, 0.5)); lines.append(mth('GREATER_THAN', d, 0.47))
    ln = mth('MAXIMUM', lines[0], lines[1])
    nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 1.2; K.new(tc.outputs['Object'], nz.inputs['Vector'])
    var = N.new('ShaderNodeMapRange'); var.inputs['From Min'].default_value = 0.3; var.inputs['From Max'].default_value = 0.7; var.inputs['To Min'].default_value = 0.9; var.inputs['To Max'].default_value = 1.1
    K.new(nz.outputs[0], var.inputs['Value'])
    cmb = N.new('ShaderNodeCombineXYZ')
    for k in range(3):
        q = N.new('ShaderNodeMapRange'); q.inputs['To Min'].default_value = base[k]; q.inputs['To Max'].default_value = line[k]; K.new(ln, q.inputs['Value'])
        K.new(mth('MULTIPLY', q.outputs[0], var.outputs[0]), cmb.inputs[k])
    K.new(cmb.outputs[0], I(b, 'Base Color'))
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.5; bp.inputs['Distance'].default_value = 0.004; K.new(mth('MULTIPLY', ln, -1.0), bp.inputs['Height']); K.new(bp.outputs[0], I(b, 'Normal'))
    return low_spec(m)
M.update(
    w1=hull_mat('Rumpf Anthrazit', (0.019, 0.02, 0.022)),
    w2=hull_mat('Rumpf Grauschwarz', (0.029, 0.03, 0.033)),
    w3=hull_mat('Rumpf Blauschwarz', (0.021, 0.023, 0.028)),
    rauten=rauten_mat('Rautenplatte', (0.02, 0.021, 0.024), (0.004, 0.004, 0.005), 1.9),
    fuge=mk('Fuge', (0.005, 0.005, 0.006), 0.6, 0.6, var=0.0, rvar=0.0, grime=False),
    rot=hull_mat('Signalrot', (0.3, 0.012, 0.008), 0.25, 0.42, 0.75),
    dunkel=mk('Schwarzmetall', (0.01, 0.01, 0.011), 0.8, 0.42, var=0.1, wear=0.4),
    mittel=mk('Gussgrau', (0.06, 0.062, 0.066), 0.85, 0.4, var=0.14, bump=0.2, wear=0.6),
    schraube=mk('Schraube', (0.07, 0.07, 0.075), 0.9, 0.36, var=0.1, grime=False),
    chrom=mk('Kolbenstange', (0.62, 0.62, 0.64), 1.0, 0.14, var=0.04, rvar=0.03, grime=False),
    duese=mk('Duesenstahl', (0.05, 0.044, 0.04), 0.9, 0.46, var=0.12, bump=0.12, wear=0.3),
    glut=mk('Triebwerksglut', (0.03, 0.035, 0.04), 0.6, 0.35, var=0, rvar=0, emit=(0.95, 0.42, 0.2), es=0.0, grime=False),
    kanzel=mk('Kanzelglas', (0.78, 0.74, 0.66), 0.0, 0.12, var=0, rvar=0.01, grime=False, trans=1.0),
    rauchglas=mk('Sensorglas', (0.01, 0.012, 0.016), 0.0, 0.05, var=0, rvar=0.01, grime=False),
    kante=mk('Kantenleiste', (0.15, 0.152, 0.158), 0.85, 0.38, var=0.1, scale=3.0, bump=0.1, wear=0.8),
    innen=mk('Cockpitwanne', (0.05, 0.052, 0.056), 0.3, 0.55, var=0.12, scale=3.0, bump=0.2, wear=0.4),
    verkleidung=mk('Cockpitverkleidung', (0.07, 0.072, 0.078), 0.2, 0.55, var=0.06, scale=3.0, bump=0.25, bscale=220),
    sitz=mk('Sitzbezug', (0.02, 0.021, 0.024), 0.0, 0.7, var=0.15, scale=6.0, bump=0.4, bscale=300),
    gurt=mk('Gurt', (0.12, 0.02, 0.015), 0.0, 0.8, var=0.1, scale=8.0, bump=0.3, bscale=300),
    taste=mk('Taste', (0.03, 0.03, 0.034), 0.2, 0.5, var=0.05, grime=False),
    rakete=mk('Flugkoerper', (0.06, 0.062, 0.066), 0.3, 0.45, var=0.08, scale=3.0, wear=0.6),
    nav_r=mk('Positionslicht rot', (1, 0.1, 0.05), 0, 0.2, var=0, rvar=0, emit=(1.0, 0.06, 0.03), es=40, grime=False),
    nav_g=mk('Positionslicht gruen', (0.1, 1, 0.3), 0, 0.2, var=0, rvar=0, emit=(0.1, 1.0, 0.35), es=40, grime=False),
    blitz=mk('Blitzlicht', (1, 1, 1), 0, 0.2, var=0, rvar=0, emit=(1.0, 0.97, 0.92), es=40, grime=False),
    form=mk('Formationslicht', (1, 0.3, 0.2), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.18, 0.1), es=4, grime=False),
    figur=mk('Figur', (0.04, 0.042, 0.046), 0.2, 0.6, var=0.1, grime=False),
)
low_spec(M['kanzel'], 0.3)
M['mfd'] = stripes('Anzeige Petrol', (0.05, 0.42, 0.4), (0.0, 0.03, 0.035), 160, emit=1.4, direction='Z', duty=0.9)
M['mfd2'] = stripes('Anzeige Bernstein', (0.42, 0.24, 0.05), (0.04, 0.02, 0.0), 160, emit=1.3, direction='Z', duty=0.9)
M['warnrw'] = stripes('Warnstreifen', (0.6, 0.45, 0.04), (0.02, 0.02, 0.022), 10)
HULL_MATS = ['w1', 'w2', 'w3', 'rauten', 'fuge', 'rot', 'dunkel']
RAUTEN, ROT, DUNKEL, FUGE = 3, 5, 6, 4

# =====================================================================================
# Werkzeuge für Facettenkörper (aus dem Kormoran übernommen)
# =====================================================================================
def fbox(f):
    xs = [v.co.x for v in f.verts]; ys = [v.co.y for v in f.verts]; return min(xs), max(xs), min(ys), max(ys)
def rcut(bm, co, no, filt=None):
    F = [f for f in bm.faces if filt is None or filt(f)]
    if not F: return
    V = list({v for f in F for v in f.verts}); E = list({e for f in F for e in f.edges})
    bmesh.ops.bisect_plane(bm, geom=V + E + F, dist=1e-4, plane_co=co, plane_no=no); bm.normal_update()
def inside(pt, poly):
    x, y = pt; c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
    return c
def outline_cuts(bm, poly, side=1, closed=True):      # exakter Umriss (Draufsicht) auf einer Seite; Schnittkanten außerhalb der Strecken werden aufgelöst
    n = len(poly)
    for i in range(n if closed else n - 1):
        p, q = Vector(poly[i]), Vector(poly[(i + 1) % n]); d = q - p
        lx, hx, ly, hy = min(p.x, q.x) - 0.05, max(p.x, q.x) + 0.05, min(p.y, q.y) - 0.05, max(p.y, q.y) + 0.05
        def filt(f, lx=lx, hx=hx, ly=ly, hy=hy):
            if f.normal.z * side < 0.15: return False
            a, b, c, e = fbox(f); return not (b < lx or a > hx or e < ly or c > hy)
        F = [f for f in bm.faces if filt(f)]
        if not F: continue
        V = list({v for f in F for v in f.verts}); E = list({e for f in F for e in f.edges})
        r = bmesh.ops.bisect_plane(bm, geom=V + E + F, dist=1e-4, plane_co=(p.x, p.y, 0), plane_no=(-d.y, d.x, 0))
        L2 = d.length_squared; out = []
        for e in [g for g in r['geom_cut'] if isinstance(g, bmesh.types.BMEdge)]:
            m = (e.verts[0].co + e.verts[1].co) / 2; t = (Vector((m.x, m.y)) - p).dot(d) / L2
            if t < -0.002 or t > 1.002: out.append(e)
        out = [e for e in out if e.is_valid and len(e.link_faces) == 2]
        if out: bmesh.ops.dissolve_edges(bm, edges=out, use_verts=False)
        bm.normal_update()
def raise_poly(bm, poly, h, side=1):
    outline_cuts(bm, poly, side)
    F = [f for f in bm.faces if f.normal.z * side >= 0.15 and inside(f.calc_center_median().xy, poly)]
    if not F: return 0
    r = bmesh.ops.extrude_face_region(bm, geom=F)
    nv = [g for g in r['geom'] if isinstance(g, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=nv, vec=(0, 0, h * side)); bm.normal_update(); return len(F)
def mirror(poly): return [(x, -y) for x, y in poly][::-1]
def hsh(c, a=12.9898, b=78.233, k=37.719): return (math.sin(round(c.x, 1) * a + round(abs(c.y), 1) * b + round(c.z, 1) * k) * 43758.5453) % 1.0
def finish_part(bm, name, colour, recess=0.05, bolts=0.55):
    # Farbe je Platte (colour(f, c) → Materialindex oder None), Fugen, vertiefte Klappen, Schrauben, Schattierung, Fase → Objekt
    panels = []
    for f in bm.faces:
        c = f.calc_center_median(); h = hsh(c); k = colour(f, c)
        f.material_index = k if k is not None else 0 if h < 0.68 else 1 if h < 0.87 else 2
        a = f.calc_area(); per = f.calc_perimeter()
        if a > 0.04 and 2 * a / per > 0.05: panels.append(f)
    r = bmesh.ops.inset_individual(bm, faces=panels, thickness=0.014, depth=0.007, use_even_offset=True)
    for f in r['faces']: f.material_index = FUGE
    bm.normal_update()
    rec = [f for f in panels if 0.3 < f.calc_area() < 2.5 and hsh(f.calc_center_median(), 91.7, 13.3, 5.1) < recess and f.material_index not in (ROT, RAUTEN) and 2 * f.calc_area() / f.calc_perimeter() > 0.18]
    r2 = bmesh.ops.inset_individual(bm, faces=rec, thickness=0.06, depth=-0.025, use_even_offset=True)
    for f in r2['faces']: f.material_index = FUGE
    for f in rec: f.material_index = 2
    recset = set(rec); bm.normal_update()
    pts = []
    for f in panels:
        if not f.is_valid or f.calc_area() < 0.25 or f in recset: continue
        rng = random.Random(int(abs(f.calc_center_median().x * 1000 + abs(f.calc_center_median().y) * 77)))
        if rng.random() > bolts: continue
        rows = rng.random() < 0.4; n = f.normal.copy(); c = f.calc_center_median(); vs = [v.co.copy() for v in f.verts]; k = len(vs)
        for i in range(k):
            v, a, b = vs[i], vs[i - 1], vs[(i + 1) % k]; e1, e2 = a - v, b - v
            if e1.length < 0.18 or e2.length < 0.18 or e1.normalized().dot(e2.normalized()) < -0.94: continue
            pts.append((v + e1.normalized() * 0.05 + e2.normalized() * 0.05, n, e2.normalized()))
            if rows and e2.length > 0.7:
                m = int(e2.length / 0.3); inw = n.cross(e2.normalized())
                if inw.dot(c - v) < 0: inw = -inw
                for j in range(1, m): pts.append((v + e2 * (j / m) + inw * 0.035, n, e2.normalized()))
    for f in bm.faces: f.smooth = True
    for e in bm.edges: e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(PI) < math.radians(6)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for k in HULL_MATS: me.materials.append(M[k])
    CUR[0] = C_HULL; ob = link(bpy.data.objects.new(name, me))
    bv = ob.modifiers.new('Fase', 'BEVEL'); bv.width = 0.012; bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
    bolt_carrier(name + ' Schrauben', pts)
    return ob, len(pts)
BOLT = [None]
def bolt_carrier(name, pts, m='schraube', r=0.011):
    if BOLT[0] is None:
        bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=6, radius1=r, radius2=r * 0.8, depth=0.006)
        bmesh.ops.translate(bm, verts=bm.verts[:], vec=(0, 0, 0.003)); me = bpy.data.meshes.new('Schraubenkopf'); bm.to_mesh(me); bm.free(); me.materials.append(M[m])
        BOLT[0] = bpy.data.objects.new('Schraubenkopf', me); C_HULL.objects.link(BOLT[0]); BOLT[0].hide_render = True; BOLT[0].hide_viewport = True
    bm = bmesh.new(); s = 0.002
    for p, n, t in pts:
        bq = n.cross(t); bm.faces.new([bm.verts.new(p + t * sx * s + bq * sy * s) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); C_HULL.objects.link(ob)
    ob.instance_type = 'FACES'; ob.show_instancer_for_render = False; ob.show_instancer_for_viewport = False
    ch = bpy.data.objects.new(name + ' Kopf', BOLT[0].data); C_HULL.objects.link(ch); ch.parent = ob
    return ob
def make_bvh(bms):
    V, P = [], []
    for b in bms:
        o = len(V); V += [v.co.copy() for v in b.verts]; b.verts.index_update(); P += [[o + v.index for v in f.verts] for f in b.faces]
    return BVHTree.FromPolygons(V, P)
def surf(x, y, side=1):
    o = Vector((x, y, 40.0 if side > 0 else -40.0)); d = Vector((0, 0, -1.0 if side > 0 else 1.0))
    loc, nor, idx, dist = BVH.ray_cast(o, d)
    if loc is None: return None, None
    if nor.dot(d) > 0: nor = -nor
    return loc, nor
def onsurf(x, y, side=1, fwd=(1, 0, 0), lift=0.0):
    loc, n = surf(x, y, side)
    X = Vector(fwd); X = (X - n * X.dot(n)).normalized(); Y = n.cross(X)
    mw = Matrix((X, Y, n)).transposed().to_4x4(); mw.translation = loc + n * lift; return mw
def group(name, mw):
    e = bpy.data.objects.new(name, None); link(e); e.matrix_world = mw; e.empty_display_size = 0.3; return e
class Part:
    def __init__(self, name, mw, col=None): self.name, self.mw, self.col = name, mw, col
    def __enter__(self):
        if self.col: CUR[0] = self.col
        self.e = group(self.name, self.mw); REC[0] = []; return self.e
    def __exit__(self, *a):
        objs = REC[0]; REC[0] = None
        for o in objs: o.parent = self.e
        return False
def T(x, y, z): return Matrix.Translation((x, y, z))
def RX(a): return Matrix.Rotation(a, 4, 'X')
def RY(a): return Matrix.Rotation(a, 4, 'Y')
def RZ(a): return Matrix.Rotation(a, 4, 'Z')
def sphere(name, r, x, y, z, m, seg=24):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me)); ob.location = (x, y, z); return ob
def chamfer_rect(w, h, c):
    return [(-w / 2 + c, -h / 2), (w / 2 - c, -h / 2), (w / 2, -h / 2 + c), (w / 2, h / 2 - c), (w / 2 - c, h / 2), (-w / 2 + c, h / 2), (-w / 2, h / 2 - c), (-w / 2, -h / 2 + c)]
def tube(rings, cap_front=True, cap_back=True):      # geschlossener Körper aus Ringen (Listen von Punkten, gleiche Anzahl)
    bm = bmesh.new(); R = [[bm.verts.new(p) for p in r] for r in rings]; n = len(R[0])
    for i in range(len(R) - 1):
        for k in range(n): bm.faces.new((R[i][k], R[i][(k + 1) % n], R[i + 1][(k + 1) % n], R[i + 1][k]))
    caps = []
    if cap_front: caps.append(bm.faces.new(R[0]))
    if cap_back: caps.append(bm.faces.new(R[-1][::-1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm, caps
def loft(name, stations, mats, cap_front=None, cap_back=False):
    bm = bmesh.new(); rings = []
    for x, pts, mi in stations: rings.append(([bm.verts.new((x, u, v)) for u, v in pts], mi))
    if cap_front is not None:
        tip = bm.verts.new(cap_front); R0 = rings[0][0]
        for k in range(len(R0) - 1): bm.faces.new((tip, R0[k + 1], R0[k])).material_index = rings[0][1]
    for i in range(len(rings) - 1):
        A, C = rings[i][0], rings[i + 1][0]
        for k in range(len(A) - 1): bm.faces.new((A[k], A[k + 1], C[k + 1], C[k])).material_index = rings[i][1]
    if cap_back: bm.faces.new(rings[-1][0]).material_index = rings[-1][1]
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats: me.materials.append(M[m])
    return link(bpy.data.objects.new(name, me))

# =====================================================================================
# 1. Rumpf: schmaler Keil mit Seitenkante (Chine), Kanzel vorn
# =====================================================================================
FX = [11.5, 10.6, 9.4, 7.8, 5.6, 3.0, 0.0, -3.0, -6.0, -8.8, -10.8]
FW = [0.1, 0.55, 0.95, 1.3, 1.6, 1.78, 1.85, 1.85, 1.75, 1.55, 1.3]
FT = [2.52, 2.8, 3.05, 3.28, 3.42, 3.5, 3.52, 3.5, 3.42, 3.28, 3.14]
FB = [2.42, 2.12, 1.9, 1.76, 1.66, 1.62, 1.62, 1.64, 1.72, 1.86, 2.0]
FC = [2.47, 2.45, 2.42, 2.42, 2.43, 2.45, 2.48, 2.52, 2.56, 2.6, 2.6]
def ftab(Tb, x):
    if x >= FX[0]: return Tb[0]
    for i in range(len(FX) - 1):
        a, b = FX[i], FX[i + 1]
        if a >= x >= b: return Tb[i] + (Tb[i + 1] - Tb[i]) * (a - x) / (a - b)
    return Tb[-1]
def fprofile(x):
    w, zt, zb, zc = ftab(FW, x), ftab(FT, x), ftab(FB, x), ftab(FC, x)
    return [(0, zt), (0.55 * w, zt - 0.035), (w, zc + 0.14), (w, zc - 0.14), (0.6 * w, zb + 0.035), (0, zb)]
def build_fuselage():
    rings = []
    for x in FX:
        P = fprofile(x); rings.append([(x, y, z) for y, z in P] + [(x, -y, z) for y, z in reversed(P[1:-1])])
    bm, caps = tube(rings)
    for x in (11.0, 10.2, 9.6, 8.0, 6.6, 5.2, 3.8, 2.4, 1.0, -0.4, -1.8, -3.2, -4.6, -6.0, -7.4, -8.8, -10.0): rcut(bm, (x, 0, 0), (1, 0, 0))
    for y in (0.0, 0.75, -0.75, 1.3, -1.3): rcut(bm, (0, y, 0), (0, 1, 0), lambda f: abs(f.normal.z) > 0.5)
    for y in (0.6, -0.6): rcut(bm, (0, y, 0), (0, 1, 0), lambda f: f.normal.z > 0.5 and 4.3 < f.calc_center_median().x < 9.7)
    raise_poly(bm, [(0.9, 0.55), (0.5, 0.62), (-9.6, 0.62), (-10.2, 0.4), (-10.2, -0.4), (-9.6, -0.62), (0.5, -0.62), (0.9, -0.55)], 0.07, 1)
    raise_poly(bm, [(7.0, 0.42), (-1.5, 0.42), (-1.5, -0.42), (7.0, -0.42)], 0.05, -1)
    return bm

# =====================================================================================
# 2. Flügel: gepfeilt mit zwei Stufen an der Hinterkante, Vorderkante abgeschrägt, leicht hängend
# =====================================================================================
WP = [(6.6, 0.6), (-3.5, 12.6), (-4.4, 13.0), (-6.6, 13.0), (-8.6, 9.6), (-7.4, 9.1), (-10.2, 4.6), (-10.2, 0.6)]
LE_A, LE_B = Vector((6.0, 1.3)), Vector((-3.5, 12.6))
_D = (LE_B - LE_A).normalized(); _N = Vector((_D.y, -_D.x))
if _N.dot(Vector((-5.0, 6.0)) - LE_A) < 0: _N = -_N
def st(pts): return [tuple(LE_A + _D * a + _N * b) for a, b in pts]      # Flügelkoordinaten: s längs der Vorderkante, t senkrecht nach hinten
def wz(y): return 2.46 - 0.03 * (abs(y) - 1.3)          # Mittelebene (leicht hängend)
def wt(y): return max(0.14, 0.56 - 0.036 * (abs(y) - 1.3))      # Dicke innen
RAUTEN_P = [(-1.9, 4.7), (-9.4, 4.7), (-7.2, 8.3), (-4.93, 8.3)]
W_PLATE1 = st([(4.6, 1.5), (12.6, 1.5), (12.0, 3.4), (5.4, 3.4)])
W_PLATE2 = st([(6.5, 1.9), (10.5, 1.9), (10.0, 3.0), (7.0, 3.0)])
W_PLATE3 = st([(5.0, 1.6), (12.0, 1.6), (11.5, 3.2), (5.5, 3.2)])      # Unterseite (Träger der Flugkörper)
FLAPS = [[(-6.6, 13.0), (-8.6, 9.6), (-7.75, 9.25), (-5.8, 12.55)], [(-7.4, 9.1), (-10.2, 4.6), (-9.3, 4.6), (-6.6, 8.75)]]
def build_wing(side):
    P = WP[:]
    area = sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))
    if area < 0: P = P[::-1]
    Q = inset(P, 0.32)
    bm = bmesh.new(); n = len(P)
    Ot = [bm.verts.new((x, y, wz(y) + 0.025)) for x, y in P]; Ob = [bm.verts.new((x, y, wz(y) - 0.025)) for x, y in P]
    It = [bm.verts.new((x, y, wz(y) + wt(y) / 2)) for x, y in Q]; Ib = [bm.verts.new((x, y, wz(y) - wt(y) / 2)) for x, y in Q]
    bm.faces.new(It); bm.faces.new(Ib[::-1])
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((Ot[i], Ot[j], It[j], It[i])); bm.faces.new((Ob[j], Ob[i], Ib[i], Ib[j])); bm.faces.new((Ot[j], Ot[i], Ob[i], Ob[j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    # Plattenraster in Flügelkoordinaten
    for off in (0.9, 1.15, 2.5, 4.2, 6.0, 8.0):
        p = LE_A + _N * off; rcut(bm, (p.x, p.y, 0), (_N.x, _N.y, 0))
    for k in range(9):
        p = LE_A + _D * (0.9 + 1.6 * k); rcut(bm, (p.x, p.y, 0), (_D.x, _D.y, 0))
    rcut(bm, (0, 3.0, 0), (0, 1, 0))
    for fl in FLAPS:
        outline_cuts(bm, fl, 1); outline_cuts(bm, fl, -1)
    outline_cuts(bm, RAUTEN_P, 1)
    raise_poly(bm, W_PLATE1, 0.06, 1); raise_poly(bm, W_PLATE2, 0.05, 1); raise_poly(bm, W_PLATE3, 0.04, -1)
    if side < 0:
        for v in bm.verts: v.co.y = -v.co.y
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:]); bm.normal_update()
    return bm
def wing_colour(f, c):
    p = (c.x, abs(c.y))
    if f.normal.z > 0.15:
        if inside(p, RAUTEN_P): return RAUTEN
        t = (Vector(p) - LE_A).dot(_N); s = (Vector(p) - LE_A).dot(_D)
        if 0.9 < t < 1.15 and 2.5 < s < 13.5: return ROT
    if any(inside(p, fl) for fl in FLAPS): return 1
    return None

# =====================================================================================
# 3. Triebwerksgondeln: achteckig, vorn Einlauf, hinten flache Schubvektordüse
# =====================================================================================
NY, NZ, NWH = 3.05, 2.45, (2.5, 2.3)
NXS = [(0.6, 0.84), (0.0, 0.96), (-1.2, 1.0), (-9.0, 1.0), (-10.6, 0.97), (-11.4, 0.93)]
SHEAR = 0.3      # Einlauf schräg: Oberlippe weiter vorn
def build_nacelle(side):
    yc = NY * side; prof = chamfer_rect(NWH[0], NWH[1], 0.6)
    rings = [[(x + (SHEAR * v * s if i == 0 else 0), yc + u * s, NZ + v * s) for u, v in prof] for i, (x, s) in enumerate(NXS)]
    bm, caps = tube(rings)
    front = caps[0]; back = caps[1]
    # Einlauf: vordere Kappe eingerückt und 0,8 m tief eingezogen (dunkler Kanal); hinten offen für die Düse
    r = bmesh.ops.inset_individual(bm, faces=[front], thickness=0.15, depth=-0.8, use_even_offset=True)
    front.material_index = DUNKEL
    for f in r['faces']: f.material_index = DUNKEL
    bmesh.ops.delete(bm, geom=[back], context='FACES')
    keep = set(r['faces']) | {front}
    side_f = lambda f: f not in keep and f.calc_center_median().x < 0.2
    for x in (-0.4, -1.4, -2.6, -3.8, -5.0, -6.2, -7.4, -8.6, -9.8): rcut(bm, (x, 0, 0), (1, 0, 0), side_f)
    rcut(bm, (0, yc, 0), (0, 1, 0), lambda f: side_f(f) and abs(f.normal.z) > 0.5)
    for dz in (0.55, -0.55): rcut(bm, (0, 0, NZ + dz), (0, 0, 1), lambda f: side_f(f) and abs(f.normal.z) < 0.5)
    raise_poly(bm, [(-1.0, yc - 0.58), (-9.6, yc - 0.58), (-9.6, yc + 0.58), (-1.0, yc + 0.58)], 0.08, 1)
    raise_poly(bm, [(-4.0, yc - 0.42), (-8.6, yc - 0.42), (-8.6, yc + 0.42), (-4.0, yc + 0.42)], 0.06, 1)
    return bm
def nacelle_colour(f, c):
    if f.material_index == DUNKEL and c.x > -1.0: return DUNKEL
    if c.x < -9.85: return DUNKEL      # Heckring hitzedunkel
    if -0.4 < c.x < -0.02 and f.normal.z > -0.3: return ROT      # roter Ring hinter dem Einlauf (nicht unten)
    return None

# =====================================================================================
# Kanzel und Cockpit
# =====================================================================================
CANOPY = [(9.5, 0.45, 0.2, 3.44), (8.3, 0.68, 0.38, 3.88), (6.9, 0.77, 0.46, 4.06), (5.5, 0.77, 0.44, 4.02), (4.5, 0.75, 0.35, 3.9)]      # (x, halbe Breite unten, halbe Breite oben, Höhe oben)
FAIRING = [(4.5, 0.75, 0.35, 3.9), (3.0, 0.73, 0.28, 3.77), (1.2, 0.63, 0.15, 3.62), (-0.4, 0.46, 0.05, 3.56)]
CTIP = 10.3
def canopy_half(x):
    st_ = CANOPY
    if x > CTIP or x < st_[-1][0]: return 0.0
    if x > st_[0][0]: return st_[0][1] * (CTIP - x) / (CTIP - st_[0][0])
    for i in range(len(st_) - 1):
        a, b = st_[i], st_[i + 1]
        if a[0] >= x >= b[0]: t = (a[0] - x) / (a[0] - b[0]); return a[1] + (b[1] - a[1]) * t
    return 0.0
def canopy_rings(stations):
    out = []
    for x, fb, ft, zt in stations:
        yb = fb; zb = surf(x, yb, 1)[0].z - 0.04; ym = yb * 0.78 + ft * 0.22; zm = zb + (zt - zb) * 0.45
        out.append((x, [(yb, zb), (ym, zm), (ft, zt), (0, zt + 0.04), (-ft, zt), (-ym, zm), (-yb, zb)], 0))
    return out
def canopy():
    CUR[0] = C_PART
    tip = surf(CTIP, 0, 1)[0]; tipv = (CTIP, 0, tip.z + 0.02)
    g = canopy_rings(CANOPY)
    loft('Kanzelglas', g, ['kanzel'], cap_front=tipv)
    fr = loft('Kanzelstreben', g, ['dunkel'], cap_front=tipv)
    wf = fr.modifiers.new('Streben', 'WIREFRAME'); wf.thickness = 0.045; wf.use_even_offset = False; wf.use_boundary = True
    fa = loft('Kanzelverkleidung', canopy_rings(FAIRING), ['w2'], cap_back=True)
    bv = fa.modifiers.new('Fase', 'BEVEL'); bv.width = 0.012; bv.segments = 1; bv.limit_method = 'ANGLE'
    for s in (1, -1): pipe('Kanzelsims', [Vector((CTIP, 0, tip.z))] + [Vector((x, s * r[0][0], r[0][1] + 0.03)) for x, r, _ in g], 0.03, M['dunkel'])
    # Kanzelbügel hinter dem Kopf, Rettungsgriff
    x, r, _ = g[-1]; pipe('Kanzelbuegel', [Vector((x, r[0][0], r[0][1])), Vector((x, r[2][0], r[2][1])), Vector((x, -r[2][0], r[2][1])), Vector((x, -r[0][0], r[0][1]))], 0.05, M['dunkel'], rad=0.15)
def cockpit():
    CUR[0] = C_ROOM; FL = 2.35
    tub = []
    for x in (9.4, 8.4, 7.2, 6.0, 4.7):
        w = max(0.25, canopy_half(x) - 0.08); zt = surf(x, w, 1)[0].z - 0.02
        tub.append((x, [(w, zt), (w, FL), (-w, FL), (-w, zt)], 0))
    loft('Cockpitwanne', tub, ['innen'], cap_back=True)
    # Schleudersitz: Sockel, Wanne, Polster, geneigte Lehne mit Kopfteil, Zuggriff, Gurte
    box('Sitzsockel', 0.5, 0.44, 0.4, 6.0, 0, FL + 0.2, M['mittel'], 0.01)
    box('Sitzwanne', 0.62, 0.56, 0.1, 6.05, 0, FL + 0.45, M['mittel'], 0.01)
    box('Sitzpolster', 0.56, 0.48, 0.09, 6.08, 0, FL + 0.54, M['sitz'], 0.03)
    with Part('Sitzlehne', T(5.78, 0, FL + 0.5) @ RY(math.radians(-18)), C_ROOM):
        box('Lehnenrahmen', 0.1, 0.58, 1.05, -0.05, 0, 0.52, M['mittel'], 0.01)
        box('Lehnenpolster', 0.08, 0.44, 0.8, 0.04, 0, 0.45, M['sitz'], 0.03)
        box('Kopfteil', 0.16, 0.42, 0.3, 0.0, 0, 1.0, M['dunkel'], 0.02)
        for sg in (1, -1):
            box('Schultergurt', 0.012, 0.06, 0.72, 0.085, sg * 0.1, 0.45, M['gurt'], 0.002)
            box('Seitenwange', 0.12, 0.07, 0.75, 0.03, sg * 0.25, 0.42, M['sitz'], 0.02)
        pipe('Zuggriff', [Vector((0.15, -0.12, 0.25)), Vector((0.2, -0.12, 0.15)), Vector((0.2, 0.12, 0.15)), Vector((0.15, 0.12, 0.25))], 0.012, M['warnrw'], rad=0.03)
    # Instrumentenbrett mit drei Anzeigen und HUD, Mittelknüppel, Schubhebel links, Seitenkonsolen
    prism('Instrumentenbrett', [(7.6, FL), (8.5, FL), (8.5, 3.05), (7.75, 3.22), (7.5, 2.9), (7.55, 2.75), (7.9, 2.75)], -0.52, 0.52, M['verkleidung'], 'Y', 0.015)
    box('Blendschutz', 0.06, 1.0, 0.03, 7.76, 0, 3.235, M['dunkel'], 0.005)
    for k, (y, m) in enumerate(((0.33, 'mfd2'), (0.0, 'mfd'), (-0.33, 'mfd2'))):
        with Part('Anzeige', T(7.62, y, 3.05) @ RY(math.radians(32)), C_ROOM):
            box('Rahmen', 0.025, 0.28, 0.24, 0, 0, 0, M['dunkel'], 0.004)
            box('Bild', 0.004, 0.24, 0.2, -0.014, 0, 0, M[m], 0)
            if m == 'mfd':
                for rr in (0.08, 0.045): ring('Radarring', rr, 0.0018, (-0.017, 0, -0.005), (1, 0, 0), M['e_teal'], 28)
    box('HUD-Projektor', 0.12, 0.2, 0.06, 7.95, 0, 3.26, M['dunkel'], 0.01)
    with Part('HUD', T(8.02, 0, 3.42) @ RY(math.radians(24)), C_ROOM):
        box('HUD-Scheibe', 0.006, 0.26, 0.2, 0, 0, 0, M['lens'], 0)
        ring('HUD-Ring', 0.04, 0.002, (-0.005, 0, 0), (1, 0, 0), M['e_green'], 24)
    cyl('Knueppelmanschette', 0.05, 0.04, 6.75, 0, FL + 0.32, M['rubber'], 'Z', n=14)
    cyl('Knueppel', 0.022, 0.38, 6.75, 0, FL + 0.52, M['dunkel'], 'Z', n=12)
    box('Knueppelkopf', 0.07, 0.05, 0.07, 6.77, 0, FL + 0.74, M['dunkel'], 0.012)
    for s in (1, -1):
        w = canopy_half(6.4) - 0.2
        box('Seitenkonsole', 1.4, 0.22, 0.55, 6.4, s * w, FL + 0.275, M['verkleidung'], 0.01)
        for i in range(5):
            for j in range(2): box('Schalter', 0.02, 0.02, 0.01, 5.9 + i * 0.2, s * w + (j - 0.5) * 0.08, FL + 0.56, M['taste'], 0.002)
    box('Schubhebel', 0.05, 0.04, 0.16, 6.55, canopy_half(6.4) - 0.2, FL + 0.66, M['dunkel'], 0.005, rot=(0, math.radians(12), 0))
    area('Cockpitlicht', (6.6, 0, 3.75), (0, 0, 0), 0.6, 0.4, 8, (0.85, 0.9, 1.0))

# =====================================================================================
# Triebwerksdüsen, Leitwerke, Waffen, Fahrwerk, Leiter, Kleinteile
# =====================================================================================
def nozzle(side):      # flache Schubvektordüse: kurze Ummantelung, oben und unten zusammenlaufende Klappen, tiefer Glutschacht
    CUR[0] = C_PART; yc = NY * side; x0 = NXS[-1][0]; s = NXS[-1][1]; w, h = NWH[0] * s, NWH[1] * s
    with Part('Schubduese', T(x0, yc, NZ), C_PART):
        R = [(0.05, chamfer_rect(w, h, 0.56 * s)), (-0.45, chamfer_rect(w * 0.97, h * 0.93, 0.46)),
             (-0.45, chamfer_rect(w * 0.86, h * 0.8, 0.22)), (-1.35, chamfer_rect(w * 0.84, h * 0.46, 0.1)),
             (-1.35, chamfer_rect(w * 0.79, h * 0.38, 0.07)), (-0.7, chamfer_rect(w * 0.74, h * 0.4, 0.07)), (-0.25, chamfer_rect(w * 0.72, h * 0.5, 0.08))]
        mats = [0, 1, 1, 1, 2, 2]
        bm = bmesh.new(); V = [[bm.verts.new((x, u, v)) for u, v in p] for x, p in R]; n = len(R[0][1])
        for i in range(len(V) - 1):
            for k in range(n): bm.faces.new((V[i][k], V[i][(k + 1) % n], V[i + 1][(k + 1) % n], V[i + 1][k])).material_index = mats[i]
        bm.faces.new(V[-1][::-1]).material_index = 3
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        me = bpy.data.meshes.new('Duese'); bm.to_mesh(me); bm.free()
        for m in ('w2', 'duese', 'dunkel', 'glut'): me.materials.append(M[m])
        for p in me.polygons: p.use_smooth = False
        ob = link(bpy.data.objects.new('Duese', me)); bv = ob.modifiers.new('Fase', 'BEVEL'); bv.width = 0.01; bv.segments = 2; bv.limit_method = 'ANGLE'
        for sg in (1, -1):
            # Klappenfugen quer und längs, Gelenkband an der Ummantelung, zwei Stellzylinder je Klappe
            for k in (-1, 0, 1):
                y = k * w * 0.27; pipe('Klappenfuge', [Vector((-0.47, y, sg * h * 0.4)), Vector((-1.33, y, sg * h * 0.235))], 0.006, M['fuge'])
            cyl('Gelenkband', 0.04, w * 0.84, -0.47, 0, sg * h * 0.4, M['mittel'], 'Y', n=12)
            for k in (1, -1):
                a, b = Vector((0.2, k * w * 0.3, sg * (h * 0.47 + 0.02))), Vector((-0.95, k * w * 0.3, sg * (h * 0.3 + 0.03)))
                pipe('Stellzylinder', [a, a.lerp(b, 0.55)], 0.045, M['mittel']); pipe('Kolbenstange', [a.lerp(b, 0.5), b], 0.025, M['chrom'])
        for k in (1, -1): box('Seitenwange', 0.95, 0.05, h * 0.5, -0.9, k * w * 0.415, 0, M['duese'], 0.006)
def tail_fin(side):
    yc = NY * side; y0 = yc + side * 0.66; z0 = NZ + NWH[1] / 2 - 0.02
    with Part('Leitwerk', T(0, y0, z0) @ RX(-side * math.radians(32)), C_PART):
        prism('Leitwerk', [(-6.9, -0.1), (-11.2, -0.1), (-11.45, 1.55), (-9.7, 1.55)], -0.05, 0.05, M['w1'], 'Y', 0.012)
        prism('Leitwerkskante', [(-9.65, 1.47), (-11.44, 1.47), (-11.45, 1.57), (-9.7, 1.57)], -0.055, 0.055, M['rot'], 'Y', 0.006)
        box('Leitwerksfuge', 0.008, 0.112, 1.4, -9.95, 0, 0.78, M['fuge'], 0); box('Leitwerksfuge', 2.6, 0.112, 0.008, -9.0, 0, 0.55, M['fuge'], 0)
        box('Ruder', 0.9, 0.11, 1.2, -10.75, 0, 0.75, M['w2'], 0.008)
        sphere('Blitzlicht', 0.04, -11.45, 0, 1.6, M['blitz'], 10)
        if side > 0: emblem((-9.6, 0.056, 0.7), (-1, 0, 0), (0, 0, 1), 0.32, M['txtw'])
def railgun():
    with Part('Schienenkanone', T(0, 0, 0), C_WPN):
        prism('Kanonengehaeuse', [(u, v + 1.42) for u, v in chamfer_rect(0.92, 0.72, 0.18)], -2.6, 7.0, M['w2'], 'X', 0.015)
        prism('Gehaeusenase', [(-0.32, 1.18), (0.32, 1.18), (0.32, 1.58), (-0.32, 1.58)], 7.0, 7.5, M['dunkel'], 'X', 0.01)
        for s in (1, -1):
            box('Schiene', 4.3, 0.07, 0.11, 9.6, s * 0.13, 1.39, M['mittel'], 0.005)
            cyl('Kondensator', 0.11, 3.4, 2.0, s * 0.5, 1.32, M['mittel'], 'X', n=14)
            for k in range(10): box('Kuehlrippe', 0.04, 0.12, 0.34, -1.6 + k * 0.32, s * 0.5, 1.48, M['dunkel'], 0.003)
        for k in range(6): ring('Spule', 0.2, 0.035, (7.8 + k * 0.62, 0, 1.39), (1, 0, 0), M['duese'], 20)
        prism('Muendung', [(u, v + 1.39) for u, v in chamfer_rect(0.46, 0.36, 0.12)], 11.45, 11.95, M['dunkel'], 'X', 0.012)
        for k in range(3):
            for s in (1, -1): box('Muendungsschlitz', 0.06, 0.03, 0.2, 11.55 + k * 0.14, s * 0.23, 1.39, M['fuge'], 0)
        prism('Laufmantel', [(u, v + 1.39) for u, v in chamfer_rect(0.36, 0.3, 0.09)], 7.5, 7.75, M['w2'], 'X', 0.01)
def wing_gun(side):
    y = 4.9 * side; xl = 6.0 - 0.8407 * (4.9 - 1.3); z = surf(xl - 1.2, y, -1)[0].z - 0.16
    with Part('Fluegelkanone', T(xl, y, z), C_WPN):
        prism('Kanonenverkleidung', chamfer_rect(0.46, 0.34, 0.1), -2.2, 0.3, M['w2'], 'X', 0.012)
        prism('Verkleidungsspitze', chamfer_rect(0.3, 0.22, 0.07), 0.3, 0.55, M['dunkel'], 'X', 0.008)
        box('Kanonentraeger', 1.6, 0.12, 0.2, -1.0, 0, 0.22, M['w2'], 0.01)
        cyl('Rohrmantel', 0.1, 0.4, 0.72, 0, 0, M['dunkel'], 'X', n=16)
        cyl('Rohr', 0.062, 0.8, 1.3, 0, 0, M['mittel'], 'X', n=14)
        prism('Muendungsbremse', chamfer_rect(0.2, 0.2, 0.06), 1.62, 1.86, M['dunkel'], 'X', 0.008)
        for k in range(2): box('Bremsschlitz', 0.05, 0.21, 0.04, 1.68 + k * 0.1, 0, 0, M['fuge'], 0)
        for k in range(4): box('Kuehlschlitz', 0.05, 0.47, 0.025, -1.6 + k * 0.18, 0, 0.08, M['fuge'], 0)
def missile(x, y, z):
    cyl('Flugkoerper', 0.13, 2.2, x - 0.2, y, z, M['rakete'], 'X', n=16)
    cyl('Suchkopf', 0.13, 0.4, x + 1.1, y, z, M['rauchglas'], 'X', n=16, r2=0.02)
    cyl('Band', 0.135, 0.07, x + 0.6, y, z, M['rot'], 'X', n=16, bev=0)
    for k in range(4):
        a = PI / 4 + k * PI / 2; box('Leitwerk', 0.28, 0.018, 0.16, x - 1.15, y + math.cos(a) * 0.18, z + math.sin(a) * 0.18, M['rakete'], 0.002, rot=(a - PI / 2, 0, 0))
def weapons():
    railgun()
    for s in (1, -1):
        wing_gun(s)
        for x, y in ((-3.0, 6.2), (-4.4, 8.6)):
            loc, _ = surf(x, s * y, -1)
            with Part('Flugkoerpertraeger', T(x, s * y, loc.z), C_WPN):
                box('Pylon', 1.6, 0.1, 0.28, 0, 0, -0.1, M['w2'], 0.01)
                box('Abwurfschiene', 1.9, 0.18, 0.08, 0, 0, -0.27, M['mittel'], 0.005)
                missile(0.1, 0, -0.45)
def gear(name, x, y, pad=(1.0, 0.7)):
    loc, _ = surf(x, y, -1); zt = loc.z
    with Part(name, T(x, y, 0), C_GEAR):
        box('Schacht', pad[0] + 0.3, pad[1] + 0.2, 0.05, 0, 0, zt - 0.01, M['dunkel'], 0.008)
        for s in (1, -1): box('Schachtklappe', pad[0] + 0.25, 0.04, 0.5, 0, s * ((pad[1] + 0.2) / 2 + 0.02), zt - 0.25, M['w1'], 0.006, rot=(s * math.radians(8), 0, 0))
        cyl('Federbein', 0.14, zt - 0.7, 0, 0, (zt + 0.7) / 2, M['mittel'], 'Z', n=18)
        cyl('Kragen', 0.17, 0.08, 0, 0, 0.74, M['dunkel'], 'Z', n=18)
        cyl('Kolbenstange', 0.09, 0.45, 0, 0, 0.5, M['chrom'], 'Z', n=16)
        box('Gelenkkopf', 0.26, 0.22, 0.16, 0, 0, 0.28, M['mittel'], 0.015)
        box('Landeteller', pad[0], pad[1], 0.11, 0, 0, 0.11, M['mittel'], 0.02)
        box('Sohle', pad[0] - 0.04, pad[1] - 0.04, 0.05, 0, 0, 0.025, M['rubber'], 0.01)
        pipe('Stuetzstrebe', [Vector((0.6, 0, zt - 0.04)), Vector((0.08, 0, 0.9))], 0.05, M['mittel'])
        pipe('Hydraulikleitung', [Vector((0.1, 0.15, zt - 0.04)), Vector((0.15, 0.16, 1.1)), Vector((0.13, 0.16, 0.8))], 0.01, M['rubber'])
def ladder():      # Einstiegsleiter links am Cockpit, über die Seitenkante gehängt
    zc = ftab(FC, 6.9); w = ftab(FW, 6.9)
    top, bot = Vector((6.9, w + 0.1, zc + 0.02)), Vector((7.3, w + 0.8, 0.03))
    d = bot - top; L = d.length; u = d.normalized()
    CUR[0] = C_GEAR
    for off in (-0.2, 0.2):
        o = Vector((off, 0, 0)); pipe('Leiterholm', [top + o, bot + o], 0.022, M['mittel'])
    n = int(L / 0.3)
    for k in range(1, n): p = top + d * (k / n); pipe('Leitersprosse', [p + Vector((-0.2, 0, 0)), p + Vector((0.2, 0, 0))], 0.014, M['steel'])
    for off in (-0.2, 0.2): pipe('Leiterhaken', [top + Vector((off, 0, 0)), top + Vector((off, 0, 0.2)), top + Vector((off, -0.3, 0.28)), top + Vector((off, -0.42, 0.22))], 0.018, M['warnrw'], rad=0.04)
    for off in (-0.2, 0.2): box('Leiterfuss', 0.12, 0.12, 0.04, bot.x + off, bot.y, 0.02, M['rubber'], 0.008)
def rcs(name, x, y, side, out):
    with Part(name, onsurf(x, y, side), C_PART):
        box('Duesenblock', 0.4, 0.3, 0.14, 0, 0, 0.06, M['w2'], 0.012)
        for dx, dy, dz, ax in ((0, out * 0.16, 0.06, 'Y'), (0.21, 0, 0.06, 'X'), (-0.21, 0, 0.06, 'X')):
            cyl('Steuerduese', 0.035, 0.05, dx, dy, dz, M['duese'], ax, n=10, r2=0.045)
def grille(name, x, y, lx, ly, side=1, n=8, col=C_PART):
    with Part(name, onsurf(x, y, side), col):
        box('Gittergrund', lx, ly, 0.015, 0, 0, 0.008, M['dunkel'], 0)
        for k in range(n): box('Lamelle', 0.022, ly - 0.05, 0.045, -lx / 2 + (k + 0.5) * lx / n, 0, 0.03, M['mittel'], 0.003, rot=(0, math.radians(30), 0))
        for s in (1, -1):
            box('Gitterrahmen', lx + 0.05, 0.03, 0.055, 0, s * (ly / 2 + 0.012), 0.028, M['w2'], 0.004)
            box('Gitterrahmen', 0.03, ly, 0.055, s * (lx / 2 + 0.012), 0, 0.028, M['w2'], 0.004)
def naca(name, x, y, side=1, l=0.9, w=0.28):      # versenkter Lufteinlass: dunkle Keilmulde
    with Part(name, onsurf(x, y, side), C_PART):
        bm = bmesh.new(); vs = [bm.verts.new(p) for p in ((l / 2, -w * 0.25, 0.004), (l / 2, w * 0.25, 0.004), (-l / 2, w / 2, 0.004), (-l / 2, -w / 2, 0.004))]
        bm.faces.new(vs); me = bpy.data.meshes.new('Einlassmulde'); bm.to_mesh(me); bm.free(); me.materials.append(M['dunkel']); link(bpy.data.objects.new('Einlassmulde', me))
        box('Einlasslippe', 0.03, w + 0.02, 0.03, -l / 2, 0, 0.015, M['mittel'], 0.004)
def access(name, x, y, w, l, side=1):
    with Part(name, onsurf(x, y, side), C_PART):
        for s in (1, -1):
            box('Klappenfuge', w, 0.018, 0.005, 0, s * l / 2, 0.0025, M['fuge'], 0); box('Klappenfuge', 0.018, l, 0.005, s * w / 2, 0, 0.0025, M['fuge'], 0)
        for sx in (1, -1):
            for sy in (1, -1): cyl('Verschluss', 0.018, 0.008, sx * (w / 2 - 0.05), sy * (l / 2 - 0.05), 0.004, M['mittel'], 'Z', n=8, bev=0)
def intake_fan(side):
    yc = NY * side; x = -0.15
    CUR[0] = C_PART
    cyl('Verdichter', 0.78, 0.08, x, yc, NZ, M['dunkel'], 'X', n=32)
    cyl('Nabe', 0.22, 0.3, x + 0.1, yc, NZ, M['mittel'], 'X', n=20, r2=0.06)
    for k in range(14):
        a = k * 2 * PI / 14; box('Schaufel', 0.03, 0.12, 0.62, x + 0.05, yc + math.cos(a) * 0.45, NZ + math.sin(a) * 0.45, M['duese'], 0, rot=(a + PI / 2, 0, 0))
    for k in range(5): dz = -0.7 + k * 0.35; box('Einlassgitter', 0.025, 2.0, 0.02, 0.5 + SHEAR * dz, yc, NZ + dz, M['mittel'], 0)
def nacelle_extras(side):
    yc = NY * side; yo = yc + side * NWH[0] / 2; CUR[0] = C_PART
    with Part('Panzerleiste', T(0, yo, NZ), C_PART):
        prism('Leiste', [(0, -0.16), (side * 0.12, -0.1), (side * 0.12, 0.1), (0, 0.16)], -1.2, -9.4, M['w2'], 'X', 0.01)
        prism('Leistenspitze', [(0, -0.12), (side * 0.08, -0.07), (side * 0.08, 0.07), (0, 0.12)], -0.4, -1.2, M['w2'], 'X', 0.008)
        for k in range(6): cyl('Leistenbolzen', 0.025, 0.03, -1.8 - k * 1.4, side * 0.13, 0, M['schraube'], 'Y', n=8, bev=0)
    box('Splitterplatte', 1.1, 0.05, 1.9, 0.1, yc, NZ, M['dunkel'], 0.008)
    for k in range(7):
        x = -10.0 + k * 0.1
        box('Hitzelamelle', 0.035, NWH[0] * 0.8, 0.03, x, yc, NZ + NWH[1] / 2 + 0.015, M['duese'], 0)
def details():
    for s in (1, -1):
        nozzle(s); tail_fin(s); intake_fan(s); nacelle_extras(s)
        rcs('Steuerduesen Spitze', -5.3, s * 12.3, 1, s); rcs('Steuerduesen Spitze unten', -5.3, s * 12.3, -1, s)
        rcs('Steuerduesen Bug', 9.0, s * 0.75, -1, s); rcs('Steuerduesen Heck', -10.3, s * NY, -1, s)
        grille('Abgaskuehler', -6.3, s * NY, 1.8, 0.8, 1, 12)
        if s > 0: grille('Kuehler', -2.4, 0.0, 0.9, 0.5, 1, 6)
        naca('Lufteinlass', -0.8, s * 1.0, 1)
        naca('Lufteinlass unten', 1.5, s * 1.0, -1, 0.8, 0.24)
        access('Wartungsklappe', -1.8, s * 1.0, 0.6, 0.4)
        access('Wartungsklappe', -6.0, s * 1.0, 0.6, 0.4)
        access('Munitionsklappe', -4.0, s * 2.5, 0.8, 0.5, -1)
        access('Tankklappe', 2.6, s * 2.0, 0.45, 0.45)
        gear('Bugfahrwerk', 8.4, s * 0.55, (0.45, 0.35))
        with Part('Sensorfenster', onsurf(9.8, s * 0.45, -1), C_PART):
            box('Sensorrahmen', 0.42, 0.26, 0.05, 0, 0, 0.02, M['dunkel'], 0.01); box('Sensorglas', 0.34, 0.19, 0.02, 0, 0, 0.045, M['rauchglas'], 0.006)
    CUR[0] = C_PART
    cyl('Staurohr', 0.025, 0.55, 11.75, 0, 2.47, M['mittel'], 'X', n=8, r2=0.012)
    with Part('Klingenantenne', onsurf(-4.2, 0.0, 1), C_PART): prism('Antenne', [(0.22, 0), (-0.18, 0), (-0.3, 0.26), (-0.14, 0.26)], -0.015, 0.015, M['dunkel'], 'Y', 0.003)
    for s in (1, -1): gear('Hauptfahrwerk', -5.8, s * NY, (1.0, 0.7))
    ladder()

# =====================================================================================
# Lichter, Beschriftung, rote Akzente
# =====================================================================================
def stencil(s, size, x, y, side=1, up=(1, 0, 0), m='txtw', target=None, align='CENTER'):
    loc, n = surf(x, y, side)
    Yv = Vector(up); Yv = (Yv - n * Yv.dot(n)).normalized(); Xv = Yv.cross(n)
    CUR[0] = C_DECAL
    o = text(s, size, loc + n * 0.012 - Yv * size * 0.35, Xv, Yv, M[m], align=align, name='Beschriftung')
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    ob = link(bpy.data.objects.new('Beschriftung', me)); ob.matrix_world = o.matrix_world.copy(); bpy.data.objects.remove(o, do_unlink=True)
    if target:
        sw = ob.modifiers.new('Auflegen', 'SHRINKWRAP'); sw.target = target; sw.offset = 0.01; sw.wrap_mode = 'OUTSIDE_SURFACE'
    return ob
def decal_quad(name, pts, side, m, lift=0.013):
    bm = bmesh.new(); vs = []
    for x, y in pts:
        cx, cy = sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts); loc = None; k = 0
        while loc is None and k < 12: loc, n = surf(x + (cx - x) * k * 0.08, y + (cy - y) * k * 0.08, side); k += 1
        vs.append(bm.verts.new(loc + n * lift))
    bm.faces.new(vs if side > 0 else vs[::-1])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(M[m])
    CUR[0] = C_DECAL; return link(bpy.data.objects.new(name, me))
def strip(a, b, w, side, m, n=6, offs=0.0, ysign=1):      # schmaler Streifen von a nach b (Draufsicht), Breite w, in Stücke geteilt (folgt der Fläche)
    A, Bv = Vector(a), Vector(b); d = Bv - A; nrm = Vector((-d.y, d.x)).normalized()
    for k in range(n):
        p, q = A + d * (k / n), A + d * ((k + 1) / n)
        pts = [p + nrm * offs, q + nrm * offs, q + nrm * (offs + w), p + nrm * (offs + w)]
        pts = [(v.x, v.y * ysign) for v in pts]
        if ysign < 0: pts = pts[::-1]
        decal_quad('Akzentstreifen', pts, side, m)
def markings():
    W = bpy.data.objects
    for s in (1, -1):
        wing = W['Fluegel ' + ('links' if s > 0 else 'rechts')]
        strip((-6.6, 13.0), (-8.6, 9.6), 0.16, 1, 'rot', 4, 0.05, s)          # rote Kanten an den Stufen der Hinterkante
        strip((-7.4, 9.1), (-10.2, 4.6), 0.12, 1, 'rot', 4, 0.05, s)
        strip((-1.9, 4.7), (-4.93, 8.3), 0.06, 1, 'rot', 4, -0.1, s)             # Vorderrand des Rautenfeldes
        for a, b in ((RAUTEN_P[0], RAUTEN_P[1]), (RAUTEN_P[1], RAUTEN_P[2]), (RAUTEN_P[2], RAUTEN_P[3])): strip(a, b, 0.05, 1, 'kante', 4, 0.0, s)
        yc = NY * s; z = surf(-7.3, yc, 1)[0].z + 0.003
        CUR[0] = C_DECAL; streak((-7.25, yc, z), (0, -1, 0), (1, 0, 0), 0.75, 1.9)      # Abgasspur hinter dem Kühler
        z = surf(-10.3, yc, 1)[0].z + 0.003; streak((-10.25, yc, z), (0, -1, 0), (1, 0, 0), 1.6, 1.3)
        spot((4.2, s * 2.1, wz(2.1) + wt(2.1) / 2 + 0.004), 0.6, 'abrieb', 1.4)      # abgelaufene Stelle an der Flügelwurzel
        spot((3.2, s * 1.0, surf(3.2, 1.0, 1)[0].z + 0.004), 0.35, 'abrieb', 1.6)
        strip((0.8, 0.66), (-9.4, 0.66), 0.035, 1, 'rot', 10, 0.0, s)          # Rückenlinie
        a = LE_A + _D * 0.4 + _N * 0.06; b = LE_B - _D * 0.2 + _N * 0.06; strip(tuple(a), tuple(b), 0.07, 1, 'kante', 12, 0.0, s)      # helle Kantenleiste an der Vorderkante
        for k in range(3):                                                      # Formationslichter oben an der Vorderkante
            p = LE_A + _D * (4.0 + k * 3.2) + _N * 0.36; q = p + _D * 0.6
            strip(tuple(p), tuple(q), 0.04, 1, 'form', 1, 0.0, s)
        stencil('NICHT BETRETEN', 0.11, -6.2, s * 10.2, 1, (0, s, 0), target=wing)
        stencil('GEFAHR  ANSAUGUNG', 0.1, -0.6, s * NY, 1, (1, 0, 0), 'txto', target=W['Gondel ' + ('links' if s > 0 else 'rechts')])
        stencil('MUNITION', 0.09, -4.0, s * 2.5, -1, (1, 0, 0), target=W['Gondel ' + ('links' if s > 0 else 'rechts')])
        pb = Vector(st([(8.5, 2.45)])[0]); up = -_N
        stencil('WR 07' if s > 0 else 'WÜRGER', 0.42, pb.x, s * pb.y, 1, (up.x, s * up.y, 0), target=wing)
        stencil('WR 07' if s > 0 else 'WÜRGER', 1.0, -6.0, s * 6.6, -1, (0, s, 0), target=wing)
    for s in (1, -1): stencil('RETTUNG', 0.08, 2.4, s * 1.05, 1, (1, 0, 0), 'txto', target=W['Rumpf'])
    CUR[0] = C_LITE
    for s in (1, -1):
        sphere('Positionslicht', 0.06, -5.5, s * 13.02, wz(13.0), M['nav_r' if s > 0 else 'nav_g'], 12)
        point('Positionslicht', (-5.5, s * 13.15, wz(13.0)), 2, (1, 0.1, 0.05) if s > 0 else (0.1, 1, 0.3), 0.03)
    loc, _ = surf(-5.0, 0, -1); sphere('Warnlicht', 0.05, -5.0, 0, loc.z - 0.03, M['nav_r'], 12)
    loc, _ = surf(9.9, 0.3, -1); sphere('Landescheinwerfer', 0.06, 9.9, 0.3, loc.z - 0.02, M['blitz'], 12)

# =====================================================================================
# Bühnen: graues Studio (Datenblatt), dunkler Hangar mit nassem Boden, Weltraum mit Planet
# =====================================================================================
CAMS = {}; STAGE = {}
def cam(name, loc, tgt, lens=50, ortho=None, up=None):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_end = 5000; cd.clip_start = 0.05
    if ortho: cd.type = 'ORTHO'; cd.ortho_scale = ortho
    ob = bpy.data.objects.new(name, cd); C_STU.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', up or 'Y').to_euler(); CAMS[name] = ob
def figure(name, x, y, yaw=0.0, col=C_HANGAR, helm=False):
    with Part(name, T(x, y, 0) @ RZ(yaw), col):
        for s in (1, -1):
            cyl('Bein', 0.075, 0.86, 0, s * 0.1, 0.43, M['figur'], 'Z', n=12); cyl('Arm', 0.05, 0.62, 0, s * 0.26, 1.16, M['figur'], 'Z', n=10)
        box('Rumpf', 0.26, 0.44, 0.62, 0, 0, 1.17, M['figur'], 0.06); sphere('Kopf', 0.12, 0, 0, 1.64, M['figur'], 16)
        if helm: sphere('Helm', 0.15, 0.25, 0.3, 1.0, M['dunkel'], 16)
def stages():
    CUR[0] = C_GRAU
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=600); me = bpy.data.meshes.new('Boden grau'); bm.to_mesh(me); bm.free()
    me.materials.append(mk('Studioboden', (0.17, 0.17, 0.175), 0.0, 0.25, var=0.03, rvar=0.03, scale=0.2, grime=False)); link(bpy.data.objects.new('Boden grau', me))
    figure('Figur Studio', 9.0, 3.4, -2.4, C_GRAU)
    # Hangar: nasser dunkler Boden (Rauheit fleckig), Bodenlinien, Rückwand mit Feldern und Lichtbändern, rote Warnleuchten, Deckenstrahler
    CUR[0] = C_HANGAR
    fm = bpy.data.materials.new('Hangarboden nass'); fm.use_nodes = True; N = fm.node_tree.nodes; K = fm.node_tree.links
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); I(b, 'Base Color').default_value = (0.022, 0.023, 0.025, 1); I(b, 'Metallic').default_value = 0.2
    tc = N.new('ShaderNodeTexCoord'); nz = N.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 0.08; nz.inputs['Detail'].default_value = 8; K.new(tc.outputs['Object'], nz.inputs['Vector'])
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.42; mr.inputs['From Max'].default_value = 0.6; mr.inputs['To Min'].default_value = 0.05; mr.inputs['To Max'].default_value = 0.55
    K.new(nz.outputs[0], mr.inputs['Value']); K.new(mr.outputs[0], I(b, 'Roughness'))
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=120); me = bpy.data.meshes.new('Hangarboden'); bm.to_mesh(me); bm.free(); me.materials.append(fm)
    link(bpy.data.objects.new('Hangarboden', me))
    for k in range(-4, 5): box('Bodenplattenfuge', 240, 0.04, 0.004, 0, k * 6.0, 0.002, M['fuge'], 0)
    for k in range(-20, 21): box('Bodenplattenfuge', 0.04, 240, 0.004, k * 6.0, 0, 0.002, M['fuge'], 0)
    for s in (1, -1): box('Bodenlinie', 34, 0.18, 0.006, -1, s * 15.5, 0.004, M['platey'], 0)
    box('Bodenlinie', 0.18, 31, 0.006, -17.5, 0, 0.004, M['platey'], 0)
    wall = mk('Hangarwand', (0.03, 0.032, 0.036), 0.5, 0.5, var=0.1, scale=0.5, streak=0.4, bump=0.2, wear=0.4)
    for k in range(14):
        y = -39 + k * 6
        box('Wandfeld', 0.4, 5.8, 15.0, -30.0, y, 7.5, wall, 0.05)
        box('Wandrippe', 0.9, 0.5, 18.0, -29.6, y + 3.0, 9.0, M['dunkel'], 0.04)
        if k % 3 == 1:
            for j in range(3): box('Warnleuchte', 0.1, 0.25, 0.12, -29.55, y + (j - 1) * 0.4, 6.0, M['nav_r'], 0)
    box('Lichtband Wand', 0.1, 80, 0.15, -29.5, 0, 12.0, M['e_white'], 0)
    box('Rueckwand Decke', 80, 80, 0.4, 0, 0, 20.0, M['dunkel'], 0)
    for x in (-12, 0, 12):
        area('Deckenstrahler', (x, 0, 16), (0, 0, 0), 8, 2, 4500, (0.85, 0.9, 1.0))
    area('Kantenlicht', (-24, 8, 9), (math.radians(70), 0, math.radians(-110)), 14, 6, 9000, (0.9, 0.95, 1.0))
    point('Warnlicht Rot', (-28, -4, 6), 300, (1, 0.1, 0.05), 0.3)
    figure('Figur Pilot', 9.6, 3.6, -2.0, C_HANGAR, helm=True); figure('Figur Techniker', 10.3, 2.6, 2.2, C_HANGAR)
    # Weltraum: Sonne, Planet unten (Kugel mit Wolkenrauschen und hellem Rand)
    pm = bpy.data.materials.new('Planet'); pm.use_nodes = True; N = pm.node_tree.nodes; K = pm.node_tree.links
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); I(b, 'Roughness').default_value = 0.85
    tc = N.new('ShaderNodeTexCoord')
    def noise(sc, det, dist=0.0):
        q = N.new('ShaderNodeTexNoise'); q.inputs['Scale'].default_value = sc; q.inputs['Detail'].default_value = det
        if 'Distortion' in q.inputs: q.inputs['Distortion'].default_value = dist
        K.new(tc.outputs['Object'], q.inputs['Vector']); return q.outputs[0]
    def ramp(inp, stops):
        r = N.new('ShaderNodeValToRGB'); E = r.color_ramp.elements
        E[0].position, E[0].color = stops[0]; E[1].position, E[1].color = stops[-1]
        for p, c in stops[1:-1]: e = E.new(p); e.color = c
        K.new(inp, r.inputs[0]); return r.outputs[0]
    land = ramp(noise(0.004, 10, 0.3), [(0.5, (0.012, 0.03, 0.06, 1)), (0.53, (0.05, 0.05, 0.035, 1)), (0.62, (0.11, 0.09, 0.06, 1)), (0.75, (0.16, 0.15, 0.13, 1))])
    cl = N.new('ShaderNodeMapRange'); cl.inputs['From Min'].default_value = 0.52; cl.inputs['From Max'].default_value = 0.68; K.new(noise(0.007, 12, 1.2), cl.inputs['Value'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; K.new(cl.outputs[0], mx.inputs['Factor']); K.new(land, mx.inputs[6]); mx.inputs[7].default_value = (0.75, 0.77, 0.8, 1)
    K.new(mx.outputs[2], I(b, 'Base Color'))
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.35
    rim = N.new('ShaderNodeMath'); rim.operation = 'POWER'; K.new(lw.outputs['Facing'], rim.inputs[0]); rim.inputs[1].default_value = 3.0
    rs = N.new('ShaderNodeMath'); rs.operation = 'MULTIPLY'; K.new(rim.outputs[0], rs.inputs[0]); rs.inputs[1].default_value = 2.5
    K.new(rs.outputs[0], I(b, 'Emission Strength')); I(b, 'Emission Color', 'Emission').default_value = (0.25, 0.5, 1.0, 1)
    CUR[0] = C_STU
    d = (Vector((0, 0, 2.5)) - Vector((26, -18, 10))).normalized(); pc = Vector((0, 0, 2.5)) + d * 2600 + Vector((0, 0, -1050))
    pl = sphere('Planet', 1100, pc.x, pc.y, pc.z, pm, 128); pl.hide_render = True; STAGE['planet'] = pl
    sun = bpy.data.lights.new('Sonne', 'SUN'); sun.energy = 3.4; sun.angle = math.radians(2.5)
    so = bpy.data.objects.new('Sonne', sun); C_STU.objects.link(so); so.rotation_euler = (math.radians(52), 0, math.radians(150)); STAGE['sun'] = so
    fill = bpy.data.lights.new('Gegenlicht', 'AREA'); fill.energy = 25000; fill.size = 30; fill.color = (0.85, 0.9, 1.0)
    fo = bpy.data.objects.new('Gegenlicht', fill); C_STU.objects.link(fo); fo.location = (-36, -24, 26); fo.rotation_euler = (Vector((0, 0, 2)) - fo.location).to_track_quat('-Z', 'Y').to_euler(); STAGE['fill'] = fo
    w = SC.world or bpy.data.worlds.new('Welt'); SC.world = w; w.use_nodes = True; STAGE['world'] = w
    cam('Schraeg', (24, 20, 11), (0.5, 0, 2.4), 50)
    cam('Draufsicht', (0, 0, 60), (0, 0, 0), 50, ortho=46); CAMS['Draufsicht'].rotation_euler = (0, 0, -PI / 2)
    cam('Seite', (0, 60, 2.5), (0, 0, 2.5), 50, ortho=26)
    cam('Front', (60, 0, 2.6), (0, 0, 2.6), 50, ortho=29)
    cam('Heck', (-22, -15, 5.5), (-6, 0, 2.6), 45)
    cam('Hangar', (21, 15, 6.5), (0.5, 0.8, 2.2), 32)
    cam('Cockpit', (8.4, 2.3, 5.5), (6.5, 0, 3.0), 30)
    cam('Detail', (-1.0, 9.6, 5.4), (-6.5, 4.2, 2.6), 35)
    cam('Weltraum', (26, -18, 10), (0, 0, 2.5), 45)
def world(kind):
    w = STAGE['world']; nt = w.node_tree; N = nt.nodes; K = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputWorld'); bg = N.new('ShaderNodeBackground'); K.new(bg.outputs[0], out.inputs[0])
    if kind == 'grau': bg.inputs['Color'].default_value = (0.2, 0.2, 0.21, 1); bg.inputs['Strength'].default_value = 0.42; return
    if kind == 'hangar': bg.inputs['Color'].default_value = (0.02, 0.022, 0.026, 1); bg.inputs['Strength'].default_value = 0.4; return
    tc = N.new('ShaderNodeTexCoord'); vo = N.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 420; K.new(tc.outputs['Generated'], vo.inputs['Vector'])
    mr = N.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 0.05; mr.inputs['To Min'].default_value = 3.0; mr.inputs['To Max'].default_value = 0.0
    K.new(vo.outputs['Distance'], mr.inputs['Value']); K.new(mr.outputs[0], bg.inputs['Strength']); bg.inputs['Color'].default_value = (0.8, 0.86, 1.0, 1)

def build():
    global BVH
    fus = build_fuselage(); wl, wr = build_wing(1), build_wing(-1); nl, nr = build_nacelle(1), build_nacelle(-1)
    BVH = make_bvh([fus, wl, wr, nl, nr])
    # Rumpf unter dem Glas ausschneiden (Cockpit)
    dead = [f for f in fus.faces if f.normal.z > 0.2 and all(4.6 < v.co.x < 9.5 and abs(v.co.y) < canopy_half(v.co.x) - 0.08 for v in f.verts)]
    bmesh.ops.delete(fus, geom=dead, context='FACES')
    nb = 0
    fus_col = lambda f, c: DUNKEL if c.x > 10.5 else 1 if (abs(f.normal.z) < 0.35) else None      # dunkle Radomspitze, Seiten etwas heller
    for bm, name, colour in ((fus, 'Rumpf', fus_col), (wl, 'Fluegel links', wing_colour), (wr, 'Fluegel rechts', wing_colour), (nl, 'Gondel links', nacelle_colour), (nr, 'Gondel rechts', nacelle_colour)):
        ob, n = finish_part(bm, name, colour); nb += n
    canopy(); cockpit(); weapons(); details(); markings(); stages(); world('grau')
    return {'schrauben': nb}
def extents():
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    skip = set(o.name for c in (C_STU, C_GRAU, C_HANGAR) for o in c.all_objects)
    for o in bpy.data.objects:
        if o.type not in ('MESH', 'CURVE', 'FONT') or o.name in skip or o.hide_render: continue
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c); lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
    return {'laenge': round(hi.x - lo.x, 2), 'breite': round(hi.y - lo.y, 2), 'hoehe': round(hi.z - lo.z, 2), 'min': [round(v, 2) for v in lo], 'max': [round(v, 2) for v in hi]}
def tris():
    dg = bpy.context.evaluated_depsgraph_get(); t = 0
    skip = set(o.name for c in (C_STU, C_GRAU, C_HANGAR) for o in c.all_objects)
    for it in dg.object_instances:
        ob = it.object
        if ob.type != 'MESH' or ob.original.name in skip: continue
        try: me = ob.to_mesh(); t += sum(len(p.vertices) - 2 for p in me.polygons); ob.to_mesh_clear()
        except Exception: pass
    return t
def cycles(samples=96):
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 8), ('glossy_bounces', 4), ('diffuse_bounces', 3), ('transmission_bounces', 6), ('adaptive_threshold', 0.02)): setp(cy, k, v)
    R = SC.render; R.image_settings.file_format = 'JPEG'; R.image_settings.quality = 92
    setp(SC.view_settings, 'view_transform', 'AgX'); setp(SC.view_settings, 'look', 'AgX - Medium High Contrast')
VIEWS = {      # Ansicht: (Kamera, Bühne, Fahrwerk und Leiter, Belichtung, Triebwerksglut)
    'schraeg': ('Schraeg', 'grau', True, 0.0, 0.0), 'draufsicht': ('Draufsicht', 'grau', True, 0.2, 0.0), 'seite': ('Seite', 'grau', True, 0.9, 0.0),
    'front': ('Front', 'grau', True, 0.7, 0.0), 'heck': ('Heck', 'grau', True, 0.1, 0.0), 'hangar': ('Hangar', 'hangar', True, 0.4, 0.0),
    'cockpit': ('Cockpit', 'grau', True, 0.2, 0.0), 'detail': ('Detail', 'grau', True, 0.1, 0.0), 'weltraum': ('Weltraum', 'weltraum', False, 0.0, 6.0),
}
def view(name, path, res=(1600, 900)):
    camn, stage, gear_on, ex, glow = VIEWS[name]
    world(stage)
    for o in C_GRAU.all_objects: o.hide_render = stage != 'grau'
    for o in C_HANGAR.all_objects: o.hide_render = stage != 'hangar'
    for o in C_GEAR.all_objects: o.hide_render = not gear_on
    STAGE['planet'].hide_render = stage != 'weltraum'
    STAGE['sun'].data.energy = {'grau': 3.4, 'hangar': 0.0, 'weltraum': 4.0}[stage]
    STAGE['fill'].data.energy = {'grau': 25000, 'hangar': 0.0, 'weltraum': 14000}[stage]
    M['glut'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = glow
    SC.view_settings.exposure = ex
    SC.camera = CAMS[camn]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = 100
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)

if not globals().get('NUR_HELFER'):
    result = build()
