# Bastion 2: das Trägerschiff der Bastion neu gebaut, in echten Metern (975 m), mit allem aus Kormoran und Würger (docs/kormoran.md,
# docs/wuerger.md). Wunsch des Nutzers (17.11.2026): „Die Bastion auch in Blender überarbeiten, mehr Details, noch besser als alles bisher.“
# Anordnung wie die alte Bastion (asset-src/neu/bastion/Bastion.blend, im Spiel ×1,9), damit sie später an dieselben Spielpunkte passt:
# Bugmodul mit Kragen, gestufte Decks, Turm achtern, seitliche Hangars mit Landeplattformen, Flugdeck-Flügel achtern, sechs Triebwerke darunter.
# Aufruf ohne Fenster: blender.exe -b --python bas_lauf.py -- <ansichten>
#
# Achsen wie bei der alten Bastion: +Y Bug, +X Steuerbord, +Z oben, Ursprung Rumpfmitte. Ein Blender-Meter = ein Meter.
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
C_HULL, C_DECK, C_GREEB, C_WPN, C_LITE, C_HANG, C_ENG, C_DECAL, C_REF, C_STU = (coll(n) for n in (
    'Rumpf', 'Decks', 'Aufbauten', 'Waffen', 'Lichter', 'Hangars', 'Triebwerke', 'Beschriftung', 'Vergleichsschiffe', 'Kameras'))

# =====================================================================================
# Materialien: großflächig gedacht (Flecken über Dutzende Meter, Laufspuren längs, feine Dellen)
# =====================================================================================
def big(name, col, metal=0.45, rough=0.5, var=0.045, streak=0.05, dent=0.06):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; K = nt.links
    m['bk'] = json.dumps(dict(col=list(col), metal=metal, rough=rough))
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); I(b, 'Metallic').default_value = metal
    for nm in ('Specular IOR Level', 'Specular'):
        if nm in b.inputs: b.inputs[nm].default_value = 0.35; break
    tc = N.new('ShaderNodeTexCoord')
    def noise(vec, sc, det=6.0):
        q = N.new('ShaderNodeTexNoise'); q.inputs['Scale'].default_value = sc; q.inputs['Detail'].default_value = det; K.new(vec, q.inputs['Vector']); return q.outputs[0]
    def rng(s, a, c, lo, hi):
        q = N.new('ShaderNodeMapRange'); q.inputs['From Min'].default_value = a; q.inputs['From Max'].default_value = c; q.inputs['To Min'].default_value = lo; q.inputs['To Max'].default_value = hi
        K.new(s, q.inputs['Value']); return q.outputs[0]
    def mul(a, c):
        q = N.new('ShaderNodeMath'); q.operation = 'MULTIPLY'; K.new(a, q.inputs[0]); K.new(c, q.inputs[1]); return q.outputs[0]
    v1 = rng(noise(tc.outputs['Object'], 0.012, 4), 0.3, 0.7, 1 - var * 1.5, 1 + var)
    v2 = rng(noise(tc.outputs['Object'], 0.09, 6), 0.3, 0.7, 1 - var, 1 + var * 0.6)
    mp = N.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (0.25, 0.012, 0.25); K.new(tc.outputs['Object'], mp.inputs['Vector'])
    st = rng(noise(mp.outputs[0], 1.0, 5), 0.5, 0.78, 1.0, 1 - streak)      # Laufspuren längs des Schiffs
    val = mul(mul(v1, v2), st)
    hsv = N.new('ShaderNodeHueSaturation'); hsv.inputs['Color'].default_value = (*col, 1); K.new(val, hsv.inputs['Value']); K.new(hsv.outputs[0], I(b, 'Base Color'))
    K.new(rng(noise(tc.outputs['Object'], 0.05, 5), 0.3, 0.7, max(0.05, rough - 0.12), min(1.0, rough + 0.15)), I(b, 'Roughness'))
    if dent:
        bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = dent; bp.inputs['Distance'].default_value = 0.08
        K.new(noise(tc.outputs['Object'], 0.8, 4), bp.inputs['Height']); K.new(bp.outputs[0], I(b, 'Normal'))
    return m
def emit_mat(name, col, es, base=(0.02, 0.02, 0.02)):
    return mk(name, base, 0.0, 0.4, var=0, rvar=0, emit=col, es=es, grime=False)
M.update(
    r1=big('Rumpf Grau', (0.072, 0.075, 0.08)), r2=big('Rumpf Hellgrau', (0.1, 0.102, 0.107)), r3=big('Rumpf Blaugrau', (0.058, 0.063, 0.071)),
    deck=big('Flugdeck', (0.045, 0.047, 0.05), 0.25, 0.72, 0.05, 0.25, 0.04),
    fuge=mk('Fuge', (0.008, 0.008, 0.009), 0.5, 0.6, var=0, rvar=0, grime=False),
    ocker=big('Signalocker', (0.5, 0.27, 0.035), 0.15, 0.48, 0.08, 0.15, 0.03),
    dunkel=big('Panzer dunkel', (0.032, 0.034, 0.038), 0.6, 0.45, 0.06, 0.1, 0.05),
    metall=big('Gussmetall', (0.13, 0.13, 0.135), 0.9, 0.38, 0.1, 0.05, 0.08),
    duese=big('Duesenstahl', (0.06, 0.05, 0.045), 0.9, 0.45, 0.15, 0.2, 0.1),
    glut=emit_mat('Triebwerksglut', (1.0, 0.55, 0.25), 0.0),
    duesenwand=big('Duesenwand', (0.022, 0.02, 0.019), 0.35, 0.72, 0.1, 0.0, 0.05),
    kern=emit_mat('Triebwerkskern', (0.85, 0.9, 1.0), 0.0),
    fenster=emit_mat('Fenster hell', (1.0, 0.78, 0.5), 2.6),
    fenster2=emit_mat('Fenster kalt', (0.75, 0.9, 1.0), 2.0),
    glas=mk('Fenster dunkel', (0.01, 0.012, 0.015), 0.0, 0.08, var=0, rvar=0, grime=False),
    brueckenglas=emit_mat('Brueckenglas', (0.45, 0.75, 0.85), 1.4, (0.01, 0.015, 0.02)),
    lampe=emit_mat('Lampe Ocker', (1.0, 0.62, 0.2), 40.0),
    lampe_w=emit_mat('Lampe Weiss', (1.0, 0.97, 0.92), 60.0),
    nav_r=emit_mat('Positionslicht rot', (1.0, 0.06, 0.03), 80.0), nav_g=emit_mat('Positionslicht gruen', (0.1, 1.0, 0.35), 80.0),
    hlicht=emit_mat('Hangarlicht', (0.9, 0.95, 1.0), 25.0),
    feld=mk('Hangarfeld', (0.2, 0.7, 0.8), 0.0, 0.1, var=0, rvar=0, emit=(0.15, 0.6, 0.75), es=0.4, grime=False, trans=1.0),
    markw=mk('Markierung weiss', (0.55, 0.55, 0.52), 0.0, 0.6, var=0.2, rvar=0.05, scale=0.3, grime=False),
    marko=mk('Markierung ocker', (0.55, 0.3, 0.04), 0.0, 0.6, var=0.2, rvar=0.05, scale=0.3, grime=False),
)
M['warn'] = stripes('Warnschraffur gross', (0.55, 0.3, 0.035), (0.02, 0.02, 0.022), 0.22)
HULL_MATS = ['r1', 'r2', 'r3', 'deck', 'fuge', 'ocker', 'dunkel']
TONE, DECK, FUGE, OCKER, DUNKEL = (0, 1, 2), 3, 4, 5, 6

# =====================================================================================
# Werkzeuge (aus Kormoran und Würger, auf Schiffsgröße gebracht)
# =====================================================================================
def fbox(f):
    xs = [v.co.x for v in f.verts]; ys = [v.co.y for v in f.verts]; return min(xs), max(xs), min(ys), max(ys)
def rcut(bm, co, no, filt=None):
    F = [f for f in bm.faces if filt is None or filt(f)]
    if not F: return
    V = list({v for f in F for v in f.verts}); E = list({e for f in F for e in f.edges})
    bmesh.ops.bisect_plane(bm, geom=V + E + F, dist=1e-3, plane_co=co, plane_no=no); bm.normal_update()
def inside(pt, poly):
    x, y = pt; c = False; n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1): c = not c
    return c
def outline_cuts(bm, poly, side=1):
    n = len(poly)
    for i in range(n):
        p, q = Vector(poly[i]), Vector(poly[(i + 1) % n]); d = q - p
        lx, hx, ly, hy = min(p.x, q.x) - 0.5, max(p.x, q.x) + 0.5, min(p.y, q.y) - 0.5, max(p.y, q.y) + 0.5
        def filt(f, lx=lx, hx=hx, ly=ly, hy=hy):
            if f.normal.z * side < 0.15: return False
            a, b, c, e = fbox(f); return not (b < lx or a > hx or e < ly or c > hy)
        F = [f for f in bm.faces if filt(f)]
        if not F: continue
        V = list({v for f in F for v in f.verts}); E = list({e for f in F for e in f.edges})
        r = bmesh.ops.bisect_plane(bm, geom=V + E + F, dist=1e-3, plane_co=(p.x, p.y, 0), plane_no=(-d.y, d.x, 0))
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
def rect(x0, x1, y0, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
def hsh(c, a=12.9898, b=78.233, k=37.719): return (math.sin(round(c.x / 3) * a + round(abs(c.y) / 3) * b + round(c.z / 3) * k) * 43758.5453) % 1.0
def ccw(P):
    a = sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))
    return P if a > 0 else P[::-1]
def finish_part(bm, name, colour=None, col=None, groove=0.3, depth=0.14, recess=0.06, bevel=0.25):
    # Farbe je Platte, Fugen (jede Platte eingerückt), einige vertiefte Klappen, Schattierung, Fase → Objekt
    panels = []
    for f in bm.faces:
        c = f.calc_center_median(); h = hsh(c); k = colour(f, c) if colour else None
        f.material_index = k if k is not None else 0 if h < 0.62 else 1 if h < 0.82 else 2
        a = f.calc_area(); per = f.calc_perimeter()
        if a > 6 and 2 * a / per > 0.8: panels.append(f)
    r = bmesh.ops.inset_individual(bm, faces=panels, thickness=groove, depth=depth, use_even_offset=True)
    for f in r['faces']: f.material_index = FUGE
    bm.normal_update()
    rec = [f for f in panels if 20 < f.calc_area() < 260 and hsh(f.calc_center_median(), 91.7, 13.3, 5.1) < recess and f.material_index in TONE and 2 * f.calc_area() / f.calc_perimeter() > 3]
    r2 = bmesh.ops.inset_individual(bm, faces=rec, thickness=0.9, depth=-0.5, use_even_offset=True)
    for f in r2['faces']: f.material_index = FUGE
    for f in rec: f.material_index = DUNKEL
    for f in bm.faces: f.smooth = True
    for e in bm.edges: e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(PI) < math.radians(6)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for k in HULL_MATS: me.materials.append(M[k])
    CUR[0] = col or C_HULL; ob = link(bpy.data.objects.new(name, me))
    if bevel:
        bv = ob.modifiers.new('Fase', 'BEVEL'); bv.width = bevel; bv.segments = 2; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(35)
    return ob
def make_bvh(bms):
    V, P = [], []
    for b in bms:
        o = len(V); V += [v.co.copy() for v in b.verts]; b.verts.index_update(); P += [[o + v.index for v in f.verts] for f in b.faces]
    return BVHTree.FromPolygons(V, P)
BVH = [None]
def surf(x, y, side=1):
    o = Vector((x, y, 400.0 if side > 0 else -400.0)); d = Vector((0, 0, -1.0 if side > 0 else 1.0))
    loc, nor, idx, dist = BVH[0].ray_cast(o, d)
    if loc is None: return None, None
    if nor.dot(d) > 0: nor = -nor
    return loc, nor
def group(name, mw):
    e = bpy.data.objects.new(name, None); link(e); e.matrix_world = mw; e.empty_display_size = 3; return e
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
def tube(rings, caps=(True, True)):
    bm = bmesh.new(); R = [[bm.verts.new(p) for p in r] for r in rings]; n = len(R[0]); cf = []
    for i in range(len(R) - 1):
        for k in range(n): bm.faces.new((R[i][k], R[i][(k + 1) % n], R[i + 1][(k + 1) % n], R[i + 1][k]))
    if caps[0]: cf.append(bm.faces.new(R[0]))
    if caps[1]: cf.append(bm.faces.new(R[-1][::-1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return bm, cf
def slab(P, z0, h, c):      # Platte/Deck: Grundriss P, senkrechte Wände, oben eine Fase (c) zur Deckfläche
    P = ccw(P); Q = inset(P, c); bm = bmesh.new(); n = len(P)
    A = [bm.verts.new((x, y, z0)) for x, y in P]; Bv = [bm.verts.new((x, y, z0 + h - c)) for x, y in P]; Cv = [bm.verts.new((x, y, z0 + h)) for x, y in Q]
    bm.faces.new(A[::-1]); bm.faces.new(Cv)
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((A[i], A[j], Bv[j], Bv[i])); bm.faces.new((Bv[i], Bv[j], Cv[j], Cv[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); return bm
def grid_cuts(bm, xs=(), ys=(), zs=(), filt=None):
    for x in xs: rcut(bm, (x, 0, 0), (1, 0, 0), filt)
    for y in ys: rcut(bm, (0, y, 0), (0, 1, 0), filt)
    for z in zs: rcut(bm, (0, 0, z), (0, 0, 1), (lambda f: abs(f.normal.z) < 0.5 and (filt is None or filt(f))))
def frange(a, b, s):
    out = []; v = a
    while v <= b + 1e-6: out.append(v); v += s
    return out

class Batch:      # viele kleine Teile in einem Objekt (Aufbauten, Fenster, Lichter): schnell zu bauen und zu rendern
    def __init__(self, name, mats, col, bevel=0.0, smooth=False):
        self.bm = bmesh.new(); self.name, self.mats, self.col, self.bevel, self.smooth = name, mats, col, bevel, smooth
    def _mat(self, verts, mi):
        for f in {f for v in verts for f in v.link_faces}: f.material_index = mi
    def box(self, c, s, mi, rz=0.0, rx=0.0, ry=0.0):
        mw = T(*c) @ RZ(rz) @ RY(ry) @ RX(rx) @ Matrix.Diagonal((s[0], s[1], s[2], 1))
        r = bmesh.ops.create_cube(self.bm, size=1.0, matrix=mw); self._mat(r['verts'], mi)
    def cyl(self, c, r, h, mi, axis='Z', n=16, r2=None, rz=0.0):
        rot = {'Z': Matrix.Identity(4), 'X': RY(PI / 2), 'Y': RX(-PI / 2)}[axis]
        res = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=n, radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=T(*c) @ RZ(rz) @ rot)
        self._mat(res['verts'], mi)
    def sphere(self, c, r, mi, seg=8):
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=seg, v_segments=max(4, seg // 2), radius=r, matrix=T(*c)); self._mat(res['verts'], mi)
    def quad(self, pts, mi):
        f = self.bm.faces.new([self.bm.verts.new(p) for p in pts]); f.material_index = mi
    def done(self):
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for k in self.mats: me.materials.append(M[k])
        if self.smooth:
            for p in me.polygons: p.use_smooth = True
        CUR[0] = self.col; ob = link(bpy.data.objects.new(self.name, me))
        if self.bevel:
            bv = ob.modifiers.new('Fase', 'BEVEL'); bv.width = self.bevel; bv.segments = 1; bv.limit_method = 'ANGLE'; bv.angle_limit = math.radians(40)
        return ob
GMATS = ['r1', 'r2', 'r3', 'dunkel', 'metall', 'ocker', 'lampe', 'fuge', 'deck', 'glas', 'fenster']
G_R1, G_R2, G_R3, G_DK, G_MET, G_OCK, G_LMP, G_FUG, G_DECK, G_GLAS, G_FEN = range(11)

# =====================================================================================
# 1. Rumpf: langer Facettenkörper, Bugmodul mit Kragen, gestuftes Heck
# =====================================================================================
HY = [-470, -440, -300, -150, 0, 150, 260, 318, 345, 420, 468, 495]
HW = [50, 60, 64, 62, 58, 52, 44, 34, 40, 40, 28, 6]
HT = [28, 40, 46, 48, 46, 40, 32, 24, 28, 26, 16, 2]
HB = [-38, -46, -50, -50, -48, -44, -38, -30, -36, -34, -24, -6]
def tab(Tb, y):
    if y <= HY[0]: return Tb[0]
    for i in range(len(HY) - 1):
        a, b = HY[i], HY[i + 1]
        if a <= y <= b: return Tb[i] + (Tb[i + 1] - Tb[i]) * (y - a) / (b - a)
    return Tb[-1]
def zs1(y): return tab(HB, y) + 0.72 * (tab(HT, y) - tab(HB, y))
def zs2(y): return tab(HB, y) + 0.3 * (tab(HT, y) - tab(HB, y))
def hprofile(y):
    W, zt, zb = tab(HW, y), tab(HT, y), tab(HB, y)
    return [(0, zt), (0.68 * W, zt), (W, zs1(y)), (W, zs2(y)), (0.62 * W, zb), (0, zb)]
HANG = (-15.0, 75.0, -26.0, 8.0)      # Hangaröffnung je Seite: y von–bis, z von–bis
def build_hull():
    rings = []
    for y in HY:
        P = hprofile(y); rings.append([(x, y, z) for x, z in P] + [(-x, y, z) for x, z in reversed(P[1:-1])])
    bm, _ = tube(rings)
    grid_cuts(bm, xs=(0, 12, -12, 24, -24, 36, -36), ys=[y for y in frange(-464, 490, 12) if y not in HY], zs=frange(-36, 32, 6))
    # Kielpanzer unten, Panzerplatten oben am Bug und am Heck
    for y0, y1 in ((-430, -310), (-290, -170), (-150, -30), (90, 240), (360, 450)): raise_poly(bm, rect(-20, 20, y0, y1), 1.2, -1)
    for y0, y1 in ((-420, -330), (-140, -40)): raise_poly(bm, rect(-11, 11, y0 + 6, y1 - 6), 0.9, -1)
    for y0, y1 in ((352, 412), (420, 456)): raise_poly(bm, rect(-14, 14, y0, y1), 0.8, 1)
    raise_poly(bm, rect(-30, -16, 360, 440), 0.6, 1); raise_poly(bm, rect(16, 30, 360, 440), 0.6, 1)
    return bm
def hull_colour(f, c):
    if abs(f.normal.y) > 0.6 and c.y < -460: return DUNKEL      # Heckfläche
    if f.normal.z < -0.25: return 2      # Unterseite blaugrau
    if abs(f.normal.z) < 0.5 and c.z < zs2(c.y) + 0.5 * (zs1(c.y) - zs2(c.y)): return 2      # unteres Band der Bordwand
    if 0.25 < abs(f.normal.z) < 0.92: return 0      # Schrägen ruhig in einem Ton (Streifen wirkten unruhig)
    return None
def collar():      # Kragen zwischen Rumpf und Bugmodul: dicke Ringe, Rippen, Ockerband
    for y0, y1, s, mi in ((321, 329, 1.16, 'dunkel'), (331, 333, 1.2, 'ocker'), (335, 342, 1.14, 'dunkel')):
        rings = []
        for y in (y0, y1):
            P = hprofile(330); rings.append([(x * s, y, z * s + (1 - s) * 2) for x, z in P] + [(-x * s, y, z * s + (1 - s) * 2) for x, z in reversed(P[1:-1])])
        bm, _ = tube(rings)
        for f in bm.faces: f.material_index = 0
        me = bpy.data.meshes.new('Kragen'); bm.to_mesh(me); bm.free(); me.materials.append(M[mi])
        CUR[0] = C_HULL; ob = link(bpy.data.objects.new('Kragen', me)); bv = ob.modifiers.new('Fase', 'BEVEL'); bv.width = 0.4; bv.segments = 2; bv.limit_method = 'ANGLE'
    B = Batch('Kragenrippen', GMATS, C_HULL, 0.15)
    P = hprofile(330); ring = [(x, z) for x, z in P] + [(-x, z) for x, z in reversed(P[1:-1])]
    for i in range(len(ring)):
        x, z = ring[i]
        for s in (1.0,):
            B.box((x * 1.22, 332, z * 1.22 - 0.4), (3.0, 16, 3.0), G_MET)
    B.done()
def belts():      # Panzergürtel an den Seiten (je Seite eine Leiste längs, mit Abstand zum Rumpf)
    for s in (1, -1):
        for y0, y1, zf, hh in ((-430, -21, 0.55, 3.2), (81, 300, 0.55, 3.2), (-190, -21, 0.2, 2.0), (81, 300, 0.2, 2.0), (350, 460, 0.45, 2.6)):
            ys = [y0] + [y for y in HY if y0 < y < y1] + [y1]; rings = []
            for y in ys:
                W = tab(HW, y); z = zs2(y) + zf * (zs1(y) - zs2(y))
                rings.append([(s * W, y, z - hh), (s * (W + 1.6), y, z - hh + 0.8), (s * (W + 1.6), y, z + hh - 0.8), (s * W, y, z + hh)])
            bm, _ = tube(rings)
            for y in frange(y0 + 14, y1 - 6, 14): rcut(bm, (0, y, 0), (0, 1, 0))
            ob = finish_part(bm, 'Panzerguertel', lambda f, c: DUNKEL if abs(f.normal.x) > 0.8 else 1, C_HULL, 0.15, 0.08, 0, 0.12)

# =====================================================================================
# 2. Gestufte Decks, Turm, Flügel mit Flugdeck, Hangars mit Plattformen
# =====================================================================================
TIERS = [  # Grundriss (Steuerbordhälfte, wird gespiegelt), Unterkante, Oberkante, Fase
    ([(38, -425), (38, 140), (22, 240)], 36, 56, 2.5),
    ([(30, -405), (30, 90), (16, 170)], 52, 63, 2.0),
    ([(22, -390), (22, 30), (10, 90)], 60, 68, 1.5),
]
def tier_poly(half): return [(-x, y) for x, y in half] + [(x, y) for x, y in reversed(half)]
def build_tiers():
    out = []
    for i, (half, z0, z1, c) in enumerate(TIERS):
        bm = slab(tier_poly(half), z0, z1 - z0, c)
        grid_cuts(bm, xs=(0, 10, -10, 20, -20, 30, -30), ys=frange(-420, 236, 12), zs=frange(z0 + 4, z1 - 3, 4))
        out.append((bm, 'Deck %d' % (i + 1)))
    return out
WING = [(55, -205), (266, -402), (266, -452), (246, -470), (55, -470)]
def build_wings():
    out = []
    for s in (1, -1):
        P = [(s * x, y) for x, y in WING]; bm = slab(P, -13, 9, 2.5)
        grid_cuts(bm, xs=[s * x for x in frange(70, 260, 14)], ys=frange(-466, -210, 14), zs=(-9,))
        for x0, x1, y0, y1 in ((70, 126, -300, -246), (84, 140, -456, -396), (196, 252, -458, -432)): raise_poly(bm, [(s * x, y) for x, y in rect(x0, x1, y0, y1)][::s], 0.35, 1)
        for x0, x1, y0, y1 in ((140, 168, -330, -302), (126, 154, -390, -362)): raise_poly(bm, [(s * x, y) for x, y in rect(x0, x1, y0, y1)][::s], -1.2, 1)
        out.append((bm, 'Fluegel ' + ('Steuerbord' if s > 0 else 'Backbord')))
    return out
def wing_colour(f, c):
    if f.normal.z > 0.5 and c.z < -4.6 and abs(c.x) > 60: return DUNKEL      # versenkte Aufzüge
    if f.normal.z > 0.5 and abs(c.x) > 60 and c.z > -5: return DECK
    if abs(c.x) > 250 and c.y < -400: return OCKER
    return None
PLAT = (54.0, 160.0, -40.0, 100.0, -34.0, 8.0)      # Landeplattform je Seite: x von–bis (außen), y von–bis, Unterkante, Dicke
def build_platforms():
    x0, x1, y0, y1, z0, h = PLAT; out = []
    for s in (1, -1):
        P = [(s * x0, y0), (s * x1, y0 + 12), (s * x1, y1 - 12), (s * x0, y1)]
        bm = slab(P, z0, h, 1.2)
        grid_cuts(bm, xs=[s * x for x in frange(66, 156, 12)], ys=frange(-36, 96, 12), zs=(z0 + 4,))
        out.append((bm, 'Plattform ' + ('Steuerbord' if s > 0 else 'Backbord')))
    return out
def plat_colour(f, c):
    if f.normal.z > 0.5: return DECK
    return None

def hangar_cut(hull_ob):      # Hangaröffnungen in den Rumpf schneiden (Boolean), Innenraum mit Boden, Rückwand, Licht, Feld
    y0, y1, z0, z1 = HANG; depth = 30.0
    for s in (1, -1):
        W = min(tab(HW, y0), tab(HW, y1))
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0, matrix=T(s * (W - depth / 2 + 12), (y0 + y1) / 2, (z0 + z1) / 2) @ Matrix.Diagonal((depth + 24, y1 - y0, z1 - z0, 1)))
        me = bpy.data.meshes.new('Hangarschnitt'); bm.to_mesh(me); bm.free()
        cut = bpy.data.objects.new('Hangarschnitt', me); C_HANG.objects.link(cut); cut.hide_render = True; cut.hide_viewport = True
        bo = hull_ob.modifiers.new('Hangar', 'BOOLEAN'); bo.object = cut; bo.operation = 'DIFFERENCE'; bo.solver = 'EXACT'
        hull_ob.modifiers.move(len(hull_ob.modifiers) - 1, 0)
        xb = s * (W - depth)      # Rückwand
        B = Batch('Hangar innen', GMATS + ['hlicht', 'feld', 'warn', 'markw'], C_HANG, 0.08)
        HL, FELD, WARN, MW = 11, 12, 13, 14
        B.box((s * (W - depth / 2), (y0 + y1) / 2, z0 - 0.6), (depth + 2, y1 - y0, 1.2), G_DECK)
        B.box((xb - s * 0.5, (y0 + y1) / 2, (z0 + z1) / 2), (1.0, y1 - y0, z1 - z0), G_R3)
        B.box((s * (W - depth / 2), (y0 + y1) / 2, z1 + 0.5), (depth + 2, y1 - y0, 1.0), G_DK)
        for y in (y0 + 0.5, y1 - 0.5): B.box((s * (W - depth / 2), y, (z0 + z1) / 2), (depth + 2, 1.0, z1 - z0), G_R3)
        for k in range(9):      # Deckenträger mit Lichtbändern
            y = y0 + 5 + k * (y1 - y0 - 10) / 8
            B.box((s * (W - depth / 2), y, z1 - 1.2), (depth, 1.6, 2.2), G_MET); B.box((s * (W - depth / 2), y, z1 - 2.4), (depth - 4, 0.6, 0.25), HL)
        for k in range(6):      # Rückwand: Felder, Tore, Lichter
            y = y0 + 8 + k * (y1 - y0 - 16) / 5
            B.box((xb + s * 0.2, y, z0 + 6), (0.6, 10, 12), G_DK); B.box((xb + s * 0.35, y, z0 + 12.5), (0.3, 10, 0.5), HL)
            B.box((xb + s * 0.4, y, z0 + 0.7), (0.3, 10.4, 1.4), WARN)
        for y in frange(y0 + 4, y1 - 4, 6): B.box((s * (W - depth / 2), y, z0 + 0.03), (depth - 6, 0.5, 0.06), MW)
        B.box((s * (W - depth / 2), (y0 + y1) / 2, z0 + 0.03), (0.6, y1 - y0 - 6, 0.06), G_OCK)
        # Rahmen der Öffnung mit Warnstreifen und Lichtern, Feld
        for z in (z0 - 1.2, z1 + 1.0): B.box((s * (W + 0.4), (y0 + y1) / 2, z), (1.6, y1 - y0 + 4, 2.2), WARN)
        for y in (y0 - 1.0, y1 + 1.0): B.box((s * (W + 0.4), y, (z0 + z1) / 2), (1.6, 2.2, z1 - z0 + 4.4), G_DK)
        for y in frange(y0, y1, 6): B.box((s * (W + 1.3), y, z1 + 2.4), (0.5, 0.8, 0.5), G_LMP)
        B.quad([(s * (W - 1.5), y0, z0), (s * (W - 1.5), y1, z0), (s * (W - 1.5), y1, z1), (s * (W - 1.5), y0, z1)], FELD)
        B.done()
        for k in range(3): area('Hangarlicht', (s * (W - depth / 2), y0 + 15 + k * 30, z1 - 3), (0, 0, 0), 26, 22, 14000, (0.9, 0.95, 1.0))

# =====================================================================================
# 3. Aufbauten: Greebles in Rasterfeldern, Geschütze, Turm, Antennen, Fenster, Lichter
# =====================================================================================
def greebles(B, x0, x1, y0, y1, zf, seed, smin=3.0, hmax=6.0, side=1, lane=None):
    # Feld rekursiv teilen, jedes Blatt mit einem Teil füllen (Block, Stufenblock, Lüfter, Tanks, Kuppel, Rohre, Kühlrippen, frei)
    rng = random.Random(seed)
    def fill(a, b, c, d, depth):
        w, l = b - a, d - c
        if (max(w, l) > smin * 2.2 and depth < 7 and rng.random() < 0.92) or max(w, l) > 26:
            if w > l: m = a + w * rng.uniform(0.3, 0.7); fill(a, m, c, d, depth + 1); fill(m, b, c, d, depth + 1)
            else: m = c + l * rng.uniform(0.3, 0.7); fill(a, b, c, m, depth + 1); fill(a, b, m, d, depth + 1)
            return
        g = 0.5 + rng.random() * 0.6; a2, b2, c2, d2 = a + g, b - g, c + g, d - g
        if b2 - a2 < 1 or d2 - c2 < 1: return
        cx, cy = (a2 + b2) / 2, (c2 + d2) / 2; W, L = b2 - a2, d2 - c2
        if lane and lane[0] < cx < lane[1]: return
        z = zf(cx, cy)
        if z is None: return
        t = rng.random(); h = rng.uniform(0.6, hmax) * side; mi = rng.choice((G_R1, G_R1, G_R2, G_R3, G_DK))
        if t < 0.3: B.box((cx, cy, z + h / 2), (W, L, abs(h)), mi)
        elif t < 0.45:
            B.box((cx, cy, z + h / 4), (W, L, abs(h) / 2), mi); B.box((cx, cy, z + h * 0.6), (W * 0.6, L * 0.6, abs(h) * 0.4), G_R2)
        elif t < 0.57:      # Lüfter: Kasten mit Lamellen
            B.box((cx, cy, z + 0.5 * side), (W, L, 1.0), G_DK)
            n = max(2, int(W / 1.2))
            for k in range(n): B.box((a2 + (k + 0.5) * W / n, cy, z + 1.1 * side), (0.3, L * 0.9, 0.5), G_MET)
        elif t < 0.66:      # liegende Tanks
            n = max(1, int(W / 4)); r = min(W / n, L) * 0.4
            for k in range(n): B.cyl((a2 + (k + 0.5) * W / n, cy, z + r * side), r, L * 0.9, G_MET, 'Y', 12)
        elif t < 0.74:      # Kuppel oder Turm mit Antenne
            r = min(W, L) * 0.4; B.cyl((cx, cy, z + r * 0.35 * side), r, r * 0.7, mi, 'Z', 14, r * 0.55)
            if rng.random() < 0.5: B.cyl((cx, cy, z + (r * 0.7 + 3) * side), 0.15, 6, G_MET, 'Z', 6)
        elif t < 0.82:      # Rohrbündel
            n = rng.randint(2, 4)
            for k in range(n):
                if W > L: B.cyl((cx, c2 + (k + 0.5) * L / n, z + 0.6 * side), 0.45, W, G_MET, 'X', 8)
                else: B.cyl((a2 + (k + 0.5) * W / n, cy, z + 0.6 * side), 0.45, L, G_MET, 'Y', 8)
        elif t < 0.9:      # Kühlrippen
            n = max(3, int(L / 1.0))
            for k in range(n): B.box((cx, c2 + (k + 0.5) * L / n, z + h * 0.5), (W, 0.18, abs(h)), G_DK)
        elif t < 0.95: B.box((cx, cy, z + 0.15 * side), (W, L, 0.3), G_OCK if rng.random() < 0.3 else G_R2)      # Deckplatte
        if rng.random() < 0.06: B.box((cx, cy, z + (abs(h) + 0.3) * side), (0.5, 0.5, 0.5), G_LMP)
    fill(x0, x1, y0, y1, 0)
def turret_main(name, x, y, z, yaw=0.0):      # schweres Geschütz: Drehkranz, Panzerhaus mit Fase, drei Rohre
    with Part(name, T(x, y, z) @ RZ(yaw), C_WPN):
        cyl('Drehkranz', 10, 2, 0, 0, 1, M['dunkel'], 'Z', n=40)
        prism('Panzerhaus', [(-7, -8), (7, -8), (7, 4), (4.5, 9), (-4.5, 9), (-7, 4)], 2, 8, M['r2'], 'Z', 0.4)
        prism('Haubendach', [(-6, -7), (6, -7), (6, 3.5), (3.8, 8), (-3.8, 8), (-6, 3.5)], 8, 8.8, M['r1'], 'Z', 0.2)
        box('Entfernungsmesser', 16, 1.6, 1.6, 0, -4, 9.6, M['dunkel'], 0.2)
        for k in (-1, 0, 1):
            cyl('Rohrwurzel', 1.4, 3, k * 3.2, 9.8, 5, M['dunkel'], 'Y', n=16)
            cyl('Rohr', 0.75, 24, k * 3.2, 22, 5, M['metall'], 'Y', n=14)
            cyl('Muendung', 0.95, 1.6, k * 3.2, 34, 5, M['dunkel'], 'Y', n=14)
        box('Haubenstreifen', 14.2, 0.6, 0.3, 0, 2, 8.95, M['ocker'], 0)
def turret_pd(B, x, y, z, yaw, side=1):      # Nahverteidigung: kleiner Drehkranz, Gehäuse, Doppelrohr
    B.cyl((x, y, z + 0.4 * side), 2.2, 0.8, G_DK, 'Z', 14)
    c, s_ = math.cos(yaw), math.sin(yaw)
    B.box((x, y, z + 1.8 * side), (3.2, 3.6, 2.0), G_R2, rz=yaw)
    for k in (-0.6, 0.6): B.cyl((x + c * k - s_ * 3.6, y + s_ * k + c * 3.6, z + 2.0 * side), 0.22, 4.4, G_MET, 'Y', 8, rz=yaw)
def tower():
    y0 = -243
    parts = [
        (tier_poly([(16, y0 - 37), (16, y0 + 31), (10, y0 + 43)]), 66, 26, 4.0, 'Turm'),
        (tier_poly([(12, y0 - 27), (12, y0 + 21)]), 90, 10, 1.0, 'Turmhals'),
        (tier_poly([(22, y0 - 25), (22, y0 + 15), (16, y0 + 27)]), 100, 12, 2.0, 'Bruecke'),
        (tier_poly([(18, y0 - 21), (18, y0 + 11), (12, y0 + 21)]), 112, 4, 1.2, 'Bruekendach'),
        (tier_poly([(7, y0 - 12), (7, y0 + 4)]), 116, 6, 0.8, 'Mastfuss'),
    ]
    for P, z0, h, c, nm in parts:
        bm = slab(P, z0, h, c); grid_cuts(bm, xs=(0,), ys=frange(y0 - 32, y0 + 40, 16), zs=frange(z0 + 4, z0 + h - 2, 8))
        finish_part(bm, nm, None, C_DECK, 0.1, 0.05, 0.0, 0.25)
    for P, zs_ in ((parts[0][0], (73.6, 81.6, 89.4)), (parts[2][0], (103.2, 109.2))):      # Gesimse zwischen den Geschossen
        for z in zs_:
            bm = slab(inset(ccw(P), -0.7), z, 0.6, 0.25); finish_part(bm, 'Gesims', lambda f, c: 1, C_DECK, 0, 0, 0, 0.1)
    # Fensterband der Brücke ringsum, Fenster im Turmschaft
    B = Batch('Turmfenster', GMATS + ['brueckenglas', 'fenster2', 'nav_r', 'lampe_w'], C_DECK)
    BG, F2, NR, LW = 11, 12, 13, 14
    P = ccw(tier_poly([(22, y0 - 25), (22, y0 + 15), (16, y0 + 27)]))
    for i in range(len(P)):
        a, b = Vector(P[i]), Vector(P[(i + 1) % len(P)]); d = b - a; n = Vector((d.y, -d.x)).normalized(); L = d.length; k = int(L / 2.6)
        for j in range(k):
            p = a + d * ((j + 0.5) / k) + n * 0.12; t = d.normalized() * (L / k * 0.42)
            B.quad([(p.x - t.x, p.y - t.y, 104), (p.x + t.x, p.y + t.y, 104), (p.x + t.x, p.y + t.y, 108.6), (p.x - t.x, p.y - t.y, 108.6)][::1], BG)
    P = ccw(tier_poly([(16, y0 - 37), (16, y0 + 31), (10, y0 + 43)]))
    rng = random.Random(7)
    for i in range(len(P)):
        a, b = Vector(P[i]), Vector(P[(i + 1) % len(P)]); d = b - a; n = Vector((d.y, -d.x)).normalized(); L = d.length; k = int(L / 3.2)
        for z in frange(70, 86, 4):
            for j in range(k):
                if rng.random() < 0.3: continue
                p = a + d * ((j + 0.5) / k) + n * 0.12; t = d.normalized() * 0.9
                B.quad([(p.x - t.x, p.y - t.y, z), (p.x + t.x, p.y + t.y, z), (p.x + t.x, p.y + t.y, z + 1.2), (p.x - t.x, p.y - t.y, z + 1.2)], F2 if rng.random() < 0.7 else G_GLAS)
    # Masten, Radarschirme, Antennen, Blitzlichter
    for x, y, h, r in ((0, y0 - 4, 46, 0.9), (4, y0 - 8, 30, 0.5), (-4, y0 - 8, 34, 0.5), (0, y0 + 2, 22, 0.6)):
        B.cyl((x, y, 122 + h / 2), r, h, G_MET, 'Z', 10); B.sphere((x, y, 122 + h + 0.5), 0.7, NR, 8)
        for k in range(int(h / 8)): B.box((x, y, 126 + k * 8), (6 - k, 0.3, 0.3), G_MET)
    B.cyl((12, y0 - 14, 115), 0.6, 6, G_MET); B.cyl((12, y0 - 14, 119), 5.5, 1.2, G_R2, 'Y', 24, 3.5)
    B.cyl((-12, y0 - 14, 115), 0.6, 6, G_MET); B.cyl((-12, y0 - 14, 119), 4.0, 1.0, G_R2, 'Y', 20, 2.5)
    B.box((0, y0 + 23.5, 110), (26, 1.6, 1.2), G_OCK)
    for x in (-21, 21): B.sphere((x, y0 + 14, 112.6), 0.6, LW, 8)
    B.done()
def windows_all():
    B = Batch('Fenster', ['fenster', 'glas', 'fenster2'], C_DECK); rng = random.Random(11)
    def run(seq):      # Fenster gruppenweise an oder aus
        on = True; k = 0
        for item in seq:
            if k <= 0: on = rng.random() < 0.38; k = rng.randint(3, 14)
            k -= 1; yield item, (0 if rng.random() < 0.85 else 2) if on else 1
    y0h, y1h, z0h, z1h = HANG
    for s in (1, -1):
        rows = []
        for y in frange(-462, 488, 3.4):
            if 312 < y < 350 or y0h - 6 < y < y1h + 6 and True: pass
            W = tab(HW, y)
            zlo = zs2(y) + (0.6 if y < 345 else 0.08) * (zs1(y) - zs2(y))
            for z in frange(zlo, zs1(y) - 3, 4.6):
                if y0h - 6 < y < y1h + 6 and z0h - 6 < z < z1h + 6: continue
                if y < -200 and -16 < z < 0: continue
                if 312 < y < 350: continue
                if 350 < y < 422 and -14 < z < 10: continue
                rows.append((y, z, W))
        for (y, z, W), mi in run(rows):
            x = s * (W + 0.15) if True else 0
            # Seitenfläche ist senkrecht: Fenster als Rechteck in der Ebene x = W(y), Normale nach außen
            ya, yb = y - 0.7, y + 0.7; xa, xb = s * (tab(HW, ya) + 0.15), s * (tab(HW, yb) + 0.15)
            pts = [(xa, ya, z), (xb, yb, z), (xb, yb, z + 0.8), (xa, ya, z + 0.8)]
            B.quad(pts if s > 0 else pts[::-1], mi)
        for half, z0, z1, c in TIERS:      # Fensterreihen an den Wänden der Decks
            x, ya, yb = half[0][0], half[0][1], half[1][1]
            for z in frange(max(z0, 48) + 1.5, z1 - c - 1.8, 3.2):
                seq = [(y, z) for y in frange(ya + 4, yb - 4, 2.8)]
                for (y, zz), mi in run(seq):
                    pts = [(s * (x + 0.12), y - 0.8, zz), (s * (x + 0.12), y + 0.8, zz), (s * (x + 0.12), y + 0.8, zz + 1.0), (s * (x + 0.12), y - 0.8, zz + 1.0)]
                    B.quad(pts if s > 0 else pts[::-1], mi)
    B.done()
def deck_details():
    B = Batch('Aufbauten', GMATS, C_GREEB, 0.12)
    # oberstes Deck: zwei Felder links und rechts der Mittelgasse, frei um Turm und Geschütze
    for x0, x1 in ((-19.5, -3.5), (3.5, 19.5)):
        for y0, y1, sd in ((-386, -356, 1), (-314, -286, 2), (-196, 26, 3)):
            greebles(B, x0, x1, y0, y1, lambda x, y: 68.0, sd * 17 + int(x0), 2.6, 4.5)
    for s in (1, -1):      # schmale Streifen auf den unteren Decks und auf dem Rumpf
        greebles(B, s * 23.5, s * 28.5, -400, 86, lambda x, y: 63.0, 31 + s, 2.0, 3.0)
        greebles(B, s * 31.5, s * 36.5, -420, 136, lambda x, y: 56.0, 41 + s, 2.0, 3.0)
        greebles(B, s * 39.5, s * (0.68 * 60 - 0.5), -436, 120, lambda x, y: (surf(x, y)[0].z if surf(x, y)[0] else None), 51 + s, 1.8, 2.2)
        greebles(B, s * 2, s * 26, -466, -440, lambda x, y: (surf(x, y)[0].z if surf(x, y)[0] else None), 61 + s, 2.5, 5.0)
    greebles(B, -14, 14, 96, 168, lambda x, y: 63.0, 71, 2.4, 3.5, lane=(-11, 11))
    greebles(B, -20, 20, 170, 236, lambda x, y: 56.0 if inside((x, y), tier_poly(TIERS[0][0])) else None, 72, 2.4, 3.5, lane=(-12, 12))
    # Unterseite: hängende Aufbauten, Kühlrippen und Frachtluken zwischen den Kielplatten
    for y0, y1, sd in ((-460, -436, 81), (-306, -294, 82), (-166, -154, 83), (-24, 84, 84), (246, 310, 85)):
        greebles(B, -34, 34, y0, y1, lambda x, y: (surf(x, y, -1)[0].z if surf(x, y, -1)[0] else None), sd, 2.8, 4.0, -1)
    # Nahverteidigung an den Deckkanten und am Rumpf
    for s in (1, -1):
        for y in (-380, -300, -200, -100, 0, 100, 200):
            if y < 140: turret_pd(B, s * 35.5, y, 56, -s * PI / 2)
        for y in (-330, -150, 40):
            turret_pd(B, s * 27, y, 63, -s * PI / 2)
        for y in (380, 440):
            loc, _ = surf(s * 20, y); turret_pd(B, s * 20, y, loc.z, 0)
        for y in (-380, -240, -120, 120, 250):
            loc, _ = surf(s * 26, y, -1)
            if loc: turret_pd(B, s * 26, y, loc.z, PI, -1)
    # Sensorkuppel und Antennenfeld am Bug, Kühlflächen am Heck
    loc, _ = surf(0, 470); B.sphere((0, 470, loc.z + 1), 4.5, G_DK, 16); B.cyl((0, 470, loc.z), 5.5, 1.4, G_MET, 'Z', 20)
    for k in range(6): B.cyl((-10 + k * 4, 438, surf(-10 + k * 4, 438)[0].z + 4), 0.25, 8, G_MET, 'Z', 6)
    for s in (1, -1):
        for k in range(10): B.box((s * 30, -452 + k * 2.2, 58), (0.4, 1.4, 28) if False else (16, 0.35, 6), G_DK)
    B.done()
    turret_main('Hauptgeschuetz A', 0, 204, 56); turret_main('Hauptgeschuetz B', 0, 130, 63); turret_main('Hauptgeschuetz C', 0, 50, 68)
    turret_main('Hauptgeschuetz D', 0, -335, 68, PI)
def wing_details():
    B = Batch('Flugdeck', GMATS + ['markw', 'marko', 'warn', 'nav_r', 'nav_g'], C_DECK)
    MW, MO, WARN, NR, NG = 11, 12, 13, 14, 15
    for s in (1, -1):
        for k in range(14):      # Mittellinie gestrichelt, Landefelder, Kanten, Lichter
            t = k / 13; x = 80 + 160 * t; y = -300 - 120 * t
            B.box((s * x, y + (-470 + 300) * 0, -3.95), (5.5, 0.6, 0.06), MO, rz=s * 0.0)
        for cx, cy in ((110, -330), (170, -380), (226, -425)):
            ring('Landekreis', 9, 0.35, (s * cx, cy, -3.9), (0, 0, 1), M['markw'], 40)
            B.box((s * cx, cy, -3.92), (8, 1.2, 0.05), MW); B.box((s * cx, cy, -3.92), (1.2, 8, 0.05), MW)
        for k in range(26):
            t = k / 25; p = Vector(WING[0]).lerp(Vector(WING[1]), t)
            B.box((s * (p.x + 1.5), p.y - 1.5, -3.6), (0.7, 0.7, 0.7), G_LMP)
        B.box((s * 262, -428, -3.9), (6, 48, 0.08), WARN)
        B.sphere((s * 266.5, -427, -8.5), 1.0, NG if s > 0 else NR, 10)
        for x in frange(70, 240, 34): B.box((s * x, -466, -4.5), (10, 3, 1.2), G_DK)      # Deckaufbauten am Hinterrand
    B.done()
    for s in (1, -1): emblem((s * 165, -360, -3.88), (0, 1, 0) if s > 0 else (0, 1, 0), (-1, 0, 0) if s > 0 else (-1, 0, 0), 26, M['marko'])
def platform_details():
    x0, x1, y0, y1, z0, h = PLAT; zt = z0 + h
    B = Batch('Plattform', GMATS + ['markw', 'marko', 'warn', 'fenster2'], C_HANG, 0.1)
    MW, MO, WARN, F2 = 11, 12, 13, 14
    for s in (1, -1):
        for cy in (0, 60):
            ring('Landekreis', 16, 0.5, (s * 110, cy + 2, zt + 0.08), (0, 0, 1), M['marko'], 48)
            B.box((s * 110, cy + 2, zt + 0.05), (14, 1.6, 0.06), MO); B.box((s * 110, cy + 2, zt + 0.05), (1.6, 14, 0.06), MO)
        for y in frange(y0 + 6, y1 - 6, 7): B.box((s * (x1 - 3), y, zt + 0.05), (0.6, 4, 0.06), MW)
        for y in frange(y0 + 2, y1 - 2, 6): B.box((s * 80, y, zt + 0.05), (0.5, 3.2, 0.06), MW)
        for k in range(24):      # Randlichter (die alten Lauflichter des Spiels)
            t = k / 23; B.box((s * (x1 - 0.8), y0 + 13 + (y1 - y0 - 26) * t, zt + 0.5), (0.8, 0.8, 0.8), G_LMP)
        B.box((s * (x1 - 0.8), (y0 + y1) / 2, zt - 1.5), (1.8, y1 - y0 - 26, 3), WARN)
        # Kontrollkanzel an der äußeren Ecke, Kran, Ladegut, Tankanschlüsse
        B.box((s * (x1 - 9), y1 - 22, zt + 4), (10, 12, 8), G_R2); B.box((s * (x1 - 9), y1 - 22, zt + 8.6), (11, 13, 1.2), G_DK)
        for yy in frange(y1 - 27, y1 - 17, 2.5): B.quad([(s * (x1 - 3.9), yy - 0.9, zt + 5), (s * (x1 - 3.9), yy + 0.9, zt + 5), (s * (x1 - 3.9), yy + 0.9, zt + 7), (s * (x1 - 3.9), yy - 0.9, zt + 7)][::(1 if s > 0 else -1)], F2)
        B.box((s * 66, y0 + 8, zt + 9), (1.6, 1.6, 18), G_OCK); B.box((s * 76, y0 + 8, zt + 17.5), (22, 1.4, 1.4), G_OCK); B.box((s * 85, y0 + 8, zt + 12), (0.2, 0.2, 11), G_MET)
        for k in range(5): B.box((s * (70 + k * 4.5), y1 - 6, zt + 1.2), (3.6, 6, 2.4), G_R3 if k % 2 else G_DK)
        for y in (y0 + 30, y1 - 40): B.cyl((s * 60, y, zt + 1), 1.2, 2, G_MET)
        # Tragwerk unter der Plattform: Streben schräg zum Rumpf
        for y in frange(y0 + 10, y1 - 10, 22):
            for xo in (90, 130):
                a = Vector((s * xo, y, z0)); b = Vector((s * (tab(HW, y) - 2), y, z0 - 26))
                d = b - a; L = d.length; mid = (a + b) / 2; ang = math.atan2(d.z, abs(d.x))
                B.box(tuple(mid), (L, 2.2, 2.2), G_DK, ry=(-ang if s > 0 else ang))
            B.box((s * 100, y, z0 - 1), (90, 1.8, 2), G_MET)
    B.done()
def bell(name, r1, r2, L, yc, m, n=48):      # offene Düsenglocke längs −Y (r1 vorn, r2 hinten)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=False, cap_tris=False, segments=n, radius1=r2, radius2=r1, depth=L, matrix=T(0, yc, 0) @ RX(-PI / 2))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    return link(bpy.data.objects.new(name, me))
def engines():
    out = []
    for s in (1, -1):
        for k, (x, y) in enumerate(((137, -470), (188, -479), (240, -488))):
            x *= s; zc = -26.0; prof = chamfer_rect(28, 26, 8)
            st = [(y + 40, 0.55), (y + 28, 0.95), (y + 20, 1.0), (y - 34, 1.0), (y - 44, 0.94)]
            rings = [[(x + u * f, yy, zc + v * f) for u, v in prof] for yy, f in st]
            bm, caps = tube(rings, (True, False))
            grid_cuts(bm, ys=frange(y - 30, y + 24, 9), xs=(x,), zs=(zc - 6, zc + 6))
            out.append((bm, 'Triebwerksgondel'))
            with Part('Duese', T(x, y - 44, zc), C_ENG):
                cyl('Duesenkragen', 12.4, 4, 0, -2, 0, M['dunkel'], 'Y', n=40)
                bell('Duesenglocke', 12.0, 14.2, 18, -13, M['duesenwand'], 40); ring('Halsglut', 11.2, 0.5, (0, -5.4, 0), (0, 1, 0), M['kern'], 48)
                cyl('Glutscheibe', 11.0, 0.5, 0, -6, 0, M['glut'], 'Y', n=40)
                cyl('Kern', 4.0, 6, 0, -8, 0, M['kern'], 'Y', n=24, r2=1.5)
                for j in range(4): ring('Kuehlring', 12.0 + (3 + 3.6 * j) / 18 * 2.2 + 0.45, 0.35, (0, -7 - j * 3.6, 0), (0, 1, 0), M['metall'], 48)
            box('Pylon', 8, 40, 6, x, y + 4, -14, M['r1'], 0.3)
    for x, r in ((0, 15), (34, 11), (-34, 11)):      # Hauptantrieb im Heck
        with Part('Hauptduese', T(x, -470, -6), C_ENG):
            cyl('Duesenkragen', r + 2.5, 5, 0, 1, 0, M['dunkel'], 'Y', n=48)
            bell('Duesenglocke', r, r * 1.25, 22, -11, M['duesenwand'], 48); ring('Halsglut', r * 0.93, 0.6, (0, -1.4, 0), (0, 1, 0), M['kern'], 48)
            cyl('Glutscheibe', r * 0.92, 0.5, 0, -2, 0, M['glut'], 'Y', n=48)
            cyl('Kern', r * 0.35, 8, 0, -4, 0, M['kern'], 'Y', n=24, r2=r * 0.12)
            for j in range(5): ring('Kuehlring', r * (1 + (4 + 3.8 * j) / 22 * 0.25) + 0.5, 0.4, (0, -4 - j * 3.8, 0), (0, 1, 0), M['metall'], 48)
    return out
def side_details():
    B = Batch('Seitenrippen', GMATS, C_HULL, 0.12); y0h, y1h, z0h, z1h = HANG
    for s in (1, -1):
        for y in frange(-430, 300, 36):
            if y0h - 8 < y < y1h + 8: continue
            W = tab(HW, y); za, zb = zs2(y) + 1, zs1(y) - 1
            B.box((s * (W + 0.7), y, (za + zb) / 2), (1.4, 2.6, zb - za), G_DK)
            B.box((s * (W + 1.5), y, (za + zb) / 2), (0.3, 1.2, zb - za - 4), G_MET)
        for y in frange(-424, 296, 7.2):      # Rettungskapseln: Luke mit Ockerrand über der unteren Kante
            if y0h - 8 < y < y1h + 8 or (y < -190): continue
            W = tab(HW, y); z = zs2(y) + 2.6
            B.box((s * (W + 0.15), y, z), (0.3, 3.0, 3.0), G_OCK); B.box((s * (W + 0.3), y, z), (0.3, 2.4, 2.4), G_DK)
        for y0, y1 in ((-300, -210), (120, 230)):      # Kühlerfelder unter den Gürteln
            for y in frange(y0, y1, 1.6):
                W = tab(HW, y); z = zs2(y) + 8
                B.box((s * (W + 0.4), y, z), (0.8, 0.25, 5), G_MET)
        # Flügel: Kantenleiste vorn, Aufbauten an der Unterseite zwischen den Triebwerken
        for k in range(30):
            t0, t1 = k / 30, (k + 1) / 30; a = Vector(WING[0]).lerp(Vector(WING[1]), t0); b = Vector(WING[0]).lerp(Vector(WING[1]), t1)
            m = (a + b) / 2; d = b - a; B.box((s * m.x, m.y, -8.5), (d.length + 0.2, 1.4, 9.4), G_DK, rz=s * math.atan2(d.y, d.x))
    greebles(B, 64, 120, -456, -230, lambda x, y: (surf(x, y, -1)[0].z if surf(x, y, -1)[0] else None), 91, 3.5, 3.0, -1)
    greebles(B, -120, -64, -456, -230, lambda x, y: (surf(x, y, -1)[0].z if surf(x, y, -1)[0] else None), 92, 3.5, 3.0, -1)
    B.done()
def armor_layers():
    B = Batch('Panzerplatten', GMATS, C_HULL, 0.2); rng = random.Random(23); y0h, y1h, z0h, z1h = HANG
    def side_plate(s, ya, yb, fa, fb, t, mi):      # Platte auf der senkrechten Bordwand zwischen den Höhenanteilen fa..fb
        Wa, Wb = tab(HW, ya), tab(HW, yb); ym = (ya + yb) / 2; L = math.hypot(yb - ya, Wb - Wa)
        za, zb = zs2(ym) + fa * (zs1(ym) - zs2(ym)), zs2(ym) + fb * (zs1(ym) - zs2(ym))
        B.box((s * ((Wa + Wb) / 2 + t / 2), ym, (za + zb) / 2), (t, L, zb - za), mi, rz=-s * math.atan2(Wb - Wa, yb - ya))
    for s in (1, -1):
        for fa, fb, t, lmin, lmax in ((0.26, 0.5, 0.9, 22, 52), (0.29, 0.47, 1.6, 10, 26), (0.03, 0.15, 0.7, 14, 34)):
            y = -432.0
            while y < 300:
                L = rng.uniform(lmin, lmax); ya, yb = y, min(300, y + L); y = yb + rng.uniform(1.5, 6 if t < 1.2 else 26)
                if yb > y0h - 8 and ya < y1h + 8: continue
                if any(ya < hy < yb for hy in HY[:-1]) and yb - ya > 8:      # nicht über einen Knick der Bordwand
                    k = next(hy for hy in HY if ya < hy < yb); side_plate(s, ya, k - 0.5, fa, fb, t, G_DK if t > 1.2 else G_R1); side_plate(s, k + 0.5, yb, fa, fb, t, G_DK if t > 1.2 else G_R1); continue
                side_plate(s, ya, yb, fa, fb, t, G_DK if t > 1.2 else (G_R1 if rng.random() < 0.7 else G_R2))
        # Platten auf der oberen Schräge (Mitte der Schräge, längs gestückelt)
        y = -440.0
        while y < 300:
            L = rng.uniform(14, 34); ya, yb = y, min(300, y + L); y = yb + rng.uniform(1.5, 4); ym = (ya + yb) / 2
            W, zt, z1 = tab(HW, ym), tab(HT, ym), zs1(ym); a = math.atan2(zt - z1, 0.32 * W); w = 0.32 * W / math.cos(a)
            loc, _ = surf(s * 0.84 * W, ym)
            if loc is None: continue
            frac = rng.choice((0.5, 0.62, 0.8)); n = Vector((s * math.sin(a), 0, math.cos(a)))
            B.box(tuple(loc + n * 0.35), (w * frac, yb - ya, 0.7), G_R2 if rng.random() < 0.6 else G_R1, ry=s * a)
            if rng.random() < 0.35:
                for k in range(int((yb - ya) / 2.2)): B.box(tuple(loc + n * 0.9 + Vector((0, ya + 1.2 + k * 2.2 - ym, 0))), (w * frac * 0.5, 0.35, 0.5), G_DK, ry=s * a)
        # Pfeiler an den Deckwänden, rote Warnlichter an den Deckkanten
        for half, z0, z1, c in TIERS:
            x, ya, yb = half[0][0], half[0][1], half[1][1]
            for yy in frange(ya + 12, yb - 6, 24): B.box((s * (x + 0.6), yy, (max(z0, 47) + z1 - c) / 2), (1.2, 2.4, z1 - c - max(z0, 47)), G_DK)
            for yy in frange(ya + 6, yb, 60): B.sphere((s * (x + 0.4), yy, z1 + 0.6), 0.5, G_LMP, 6)
    B.done()
def markings():
    CUR[0] = C_DECAL
    for s in (1, -1):
        X = (0, 1, 0) if s > 0 else (0, -1, 0)
        W = 40.0; o = text('BASTION', 10, (s * (W + 0.3), 356 if s > 0 else 414, 0), X, (0, 0, 1), M['markw'], name='Name')
        text('LC 01', 5, (s * (W + 0.3), 356 if s > 0 else 414, -11), X, (0, 0, 1), M['marko'], name='Kennung')
        Wh = tab(HW, -60); text('HANGAR %d' % (1 if s > 0 else 2), 4, (s * (Wh + 1.0), -12 if s > 0 else 72, 13), X, (0, 0, 1), M['marko'], name='Hangarschrift')
        emblem((s * (tab(HW, 200) + 0.3), 200, 0), X, (0, 0, 1), 9, M['markw'])
    for s in (1, -1):      # Positionslichter am Bug, Blitzlichter
        sphere('Positionslicht', 1.0, s * 41.5, 400, zs1(400) - 1, M['nav_g' if s > 0 else 'nav_r'], 10)

# =====================================================================================
# Vergleichsschiffe, Bühne, Kameras
# =====================================================================================
def ref_ships():
    for path, nm, mw in ((os.path.join(HERE, '..', 'wuerger', 'Wuerger_roh.glb'), 'Wuerger', T(PLAT[0] + 56, 2, PLAT[4] + PLAT[5]) @ RZ(PI)),
                         (os.path.join(HERE, '..', 'wuerger', 'Wuerger_roh.glb'), 'Wuerger 2', T(PLAT[0] + 56, 62, PLAT[4] + PLAT[5]) @ RZ(PI * 0.92)),
                         (os.path.join(HERE, '..', 'kormoran', 'Kormoran_roh.glb'), 'Kormoran', T(185, 36, 4) @ RZ(PI * 1.04) @ RX(0.03))):
        if not os.path.exists(path): continue
        before = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=path)
        new = [o for o in bpy.data.objects if o not in before]
        e = bpy.data.objects.new(nm, None); C_REF.objects.link(e); e.matrix_world = mw
        for o in new:
            for c in list(o.users_collection): c.objects.unlink(o)
            C_REF.objects.link(o)
            if o.parent is None: o.parent = e
            if nm.startswith('Kormoran') and o.type == 'MESH' and any(m and m.name == 'gear' for m in o.data.materials): o.hide_render = True
CAMS = {}; STAGE = {}
def cam(name, loc, tgt, lens=50, ortho=None):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_end = 400000; cd.clip_start = 0.5
    if ortho: cd.type = 'ORTHO'; cd.ortho_scale = ortho
    ob = bpy.data.objects.new(name, cd); C_STU.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); CAMS[name] = ob
def stage():
    # Planet weit unten hinten, Sonne von vorn oben Steuerbord, schwaches Gegenlicht, Sterne
    pm = bpy.data.materials.new('Planet'); pm.use_nodes = True; N = pm.node_tree.nodes; K = pm.node_tree.links
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); I(b, 'Roughness').default_value = 0.85; tc = N.new('ShaderNodeTexCoord')
    def noise(sc, det, dist=0.0):
        q = N.new('ShaderNodeTexNoise'); q.inputs['Scale'].default_value = sc; q.inputs['Detail'].default_value = det
        if 'Distortion' in q.inputs: q.inputs['Distortion'].default_value = dist
        K.new(tc.outputs['Object'], q.inputs['Vector']); return q.outputs[0]
    r = N.new('ShaderNodeValToRGB'); E = r.color_ramp.elements
    E[0].position, E[0].color = 0.5, (0.01, 0.025, 0.05, 1); E[1].position, E[1].color = 0.72, (0.15, 0.13, 0.1, 1); e = E.new(0.54); e.color = (0.05, 0.045, 0.03, 1)
    K.new(noise(0.00012, 10, 0.4), r.inputs[0])
    cl = N.new('ShaderNodeMapRange'); cl.inputs['From Min'].default_value = 0.55; cl.inputs['From Max'].default_value = 0.72; K.new(noise(0.0009, 14, 0.35), cl.inputs['Value'])
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; K.new(cl.outputs[0], mx.inputs['Factor']); K.new(r.outputs[0], mx.inputs[6]); mx.inputs[7].default_value = (0.7, 0.72, 0.75, 1)
    K.new(mx.outputs[2], I(b, 'Base Color'))
    lw = N.new('ShaderNodeLayerWeight'); lw.inputs['Blend'].default_value = 0.3
    pw = N.new('ShaderNodeMath'); pw.operation = 'POWER'; K.new(lw.outputs['Facing'], pw.inputs[0]); pw.inputs[1].default_value = 3.0
    ms = N.new('ShaderNodeMath'); ms.operation = 'MULTIPLY'; K.new(pw.outputs[0], ms.inputs[0]); ms.inputs[1].default_value = 2.5
    K.new(ms.outputs[0], I(b, 'Emission Strength')); I(b, 'Emission Color', 'Emission').default_value = (0.25, 0.5, 1.0, 1)
    CUR[0] = C_STU; pl = sphere('Planet', 40000, -59000, -65000, -70000, pm, 160); STAGE['planet'] = pl
    sun = bpy.data.lights.new('Sonne', 'SUN'); sun.energy = 4.5; sun.angle = math.radians(1.5); sun.color = (1.0, 0.96, 0.9)
    so = bpy.data.objects.new('Sonne', sun); C_STU.objects.link(so); so.rotation_euler = Vector((-0.55, -0.35, -0.62)).to_track_quat('-Z', 'Y').to_euler(); STAGE['sun'] = so
    fill = bpy.data.lights.new('Gegenlicht', 'SUN'); fill.energy = 0.8; fill.color = (0.55, 0.7, 1.0); fill.angle = math.radians(20)
    fo = bpy.data.objects.new('Gegenlicht', fill); C_STU.objects.link(fo); fo.rotation_euler = Vector((0.5, 0.6, 0.35)).to_track_quat('-Z', 'Y').to_euler(); STAGE['fill'] = fo
    rim = bpy.data.lights.new('Kantenlicht', 'SUN'); rim.energy = 1.3; rim.color = (0.7, 0.82, 1.0); rim.angle = math.radians(3)
    ro = bpy.data.objects.new('Kantenlicht', rim); C_STU.objects.link(ro); ro.rotation_euler = Vector((0.35, 0.8, -0.2)).to_track_quat('-Z', 'Y').to_euler()
    w = SC.world or bpy.data.worlds.new('Welt'); SC.world = w; w.use_nodes = True; nt = w.node_tree; Nw = nt.nodes; Kw = nt.links
    for n in list(Nw): Nw.remove(n)
    out = Nw.new('ShaderNodeOutputWorld'); bg = Nw.new('ShaderNodeBackground'); Kw.new(bg.outputs[0], out.inputs[0])
    tcw = Nw.new('ShaderNodeTexCoord'); vo = Nw.new('ShaderNodeTexVoronoi'); vo.inputs['Scale'].default_value = 700; Kw.new(tcw.outputs['Generated'], vo.inputs['Vector'])
    mr = Nw.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 0.04; mr.inputs['To Min'].default_value = 2.5; mr.inputs['To Max'].default_value = 0.004
    Kw.new(vo.outputs['Distance'], mr.inputs['Value']); Kw.new(mr.outputs[0], bg.inputs['Strength']); bg.inputs['Color'].default_value = (0.8, 0.86, 1.0, 1)
    cam('Gesamt', (1150, 1250, 520), (0, -20, 10), 50)
    cam('Heck', (-700, -1350, 260), (40, -380, -10), 50)
    cam('Seite', (1900, 0, 60), (0, 10, 10), 50)
    cam('Unten', (520, 330, -300), (20, 40, -40), 35)
    cam('Hangar', (330, 150, 30), (80, 25, -18), 35)
    cam('Turm', (110, -150, 135), (0, -245, 98), 40)
    cam('Deck', (70, 300, 110), (0, 120, 60), 32)
    cam('Triebwerke', (260, -660, -40), (130, -500, -20), 35)
    cam('Bug', (260, 560, 40), (0, 400, 0), 40)
    cam('Held', (330, 760, -110), (10, 120, 10), 28)
def cycles(samples=96):
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 6), ('glossy_bounces', 3), ('diffuse_bounces', 2), ('transmission_bounces', 4), ('adaptive_threshold', 0.02)): setp(cy, k, v)
    R = SC.render; R.image_settings.file_format = 'JPEG'; R.image_settings.quality = 92
    setp(SC.view_settings, 'view_transform', 'AgX'); setp(SC.view_settings, 'look', 'AgX - Medium High Contrast')
VIEWS = {'gesamt': ('Gesamt', 0.4), 'heck': ('Heck', 0.6), 'seite': ('Seite', 0.6), 'unten': ('Unten', 1.5), 'hangar': ('Hangar', 0.5),
         'turm': ('Turm', 0.4), 'deck': ('Deck', 0.4), 'triebwerke': ('Triebwerke', 0.6), 'bug': ('Bug', 0.4), 'held': ('Held', 0.9)}
def view(name, path, res=(1920, 1080)):
    camn, ex = VIEWS[name]
    for k, es in (('glut', 1.8), ('kern', 9.0)): M[k].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = es
    SC.view_settings.exposure = ex; SC.camera = CAMS[camn]
    # Planet je Ansicht ins untere Bilddrittel hinter das Schiff legen (100 km entfernt, Oberkante 6° unter der Bildmitte)
    cm = CAMS[camn].matrix_world; d = -cm.col[2].xyz.normalized(); up = cm.col[1].xyz.normalized(); D, R_ = 100000.0, 40000.0
    a = math.asin(R_ / D) + math.radians(6 if camn != 'Unten' else -40); STAGE['planet'].location = cm.translation + (d * math.cos(a) - up * math.sin(a)) * D
    SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = 100
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)

def build():
    hull = build_hull(); tiers = build_tiers(); wings = build_wings(); plats = build_platforms()
    BVH[0] = make_bvh([hull] + [b for b, _ in tiers + wings + plats])
    hull_ob = finish_part(hull, 'Rumpf', hull_colour)
    for bm, nm in tiers: finish_part(bm, nm, None, C_DECK)
    for bm, nm in wings: finish_part(bm, nm, wing_colour, C_DECK)
    for bm, nm in plats: finish_part(bm, nm, plat_colour, C_HANG, 0.2, 0.1, 0.0)
    for bm, nm in engines(): finish_part(bm, nm, None, C_ENG, 0.2, 0.1, 0.05)
    hangar_cut(hull_ob); collar(); belts(); tower(); windows_all(); deck_details(); side_details(); armor_layers(); wing_details(); platform_details(); markings()
    ref_ships(); stage()
    return {'objekte': len(bpy.data.objects)}
def tris():
    dg = bpy.context.evaluated_depsgraph_get(); t = 0
    for it in dg.object_instances:
        ob = it.object
        if ob.type != 'MESH' or ob.original.name == 'Planet': continue
        try: me = ob.to_mesh(); t += sum(len(p.vertices) - 2 for p in me.polygons); ob.to_mesh_clear()
        except Exception: pass
    return t
if not globals().get('NUR_HELFER'):
    result = build()
