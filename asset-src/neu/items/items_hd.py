# Hohe Detailstufe für alle Gegenstände. Wird als letzte Datei geladen (nach items_lib, items_build, items_pilot, items_test).
#  - @extend('<id>') führt die vorhandene Bauvorschrift aus und ergänzt Schilder, Klappen, Anschlüsse, Verschraubungen.
#  - Helme und Anzüge werden nach dem Muster von Sturmhelm und Sturmrüstung neu aufgebaut (helm_base, suit).
# Teile und Schilder werden per Strahl auf die getroffene Fläche gesetzt (tag, on): Man gibt nur an, von wo man auf das Modell blickt.
from mathutils import Matrix

def item(id, rar):
    def deco(fn):
        ITEMS[id] = (rar, fn)
        if id not in ORDER: ORDER.append(id)
        return fn
    return deco
def extend(id):
    rar, old = ITEMS[id]
    def deco(fn):
        def both(A): old(A); fn(A)
        ITEMS[id] = (rar, both)
        return fn
    return deco

# ---------- Strahl auf das Modell ----------
FRONT, TOP, RIGHT, LEFT, BACK = (0, 1, 0), (0, 0, -1), (-1, 0, 0), (1, 0, 0), (0, -1, 0)      # Blickrichtungen des Strahls
def _hit(origin, direction):
    bpy.context.view_layer.update(); dg = bpy.context.evaluated_depsgraph_get()
    o = Vector(origin); d = Vector(direction).normalized(); best = None
    for ob in COL.all_objects:
        if ob.type != 'MESH' or ob.hide_render or ob.name.startswith('schrift'): continue
        mi = ob.matrix_world.inverted(); lo = mi @ o; ld = (mi.to_3x3() @ d).normalized()
        try: ok, loc, nor, idx = ob.evaluated_get(dg).ray_cast(lo, ld)
        except Exception: continue
        if ok:
            w = ob.matrix_world @ loc; dist = (w - o).length
            if best is None or dist < best[0]: best = (dist, w, (ob.matrix_world.to_3x3().inverted().transposed() @ nor).normalized())
    return best
def _face_rot(n):
    n = Vector(n).normalized(); up = Vector((0, 0, 1))
    if abs(n.dot(up)) > 0.97: up = Vector((0, 1, 0))
    za = (up - n * up.dot(n)).normalized(); ya = -n; xa = ya.cross(za)
    return Matrix((xa, ya, za)).transposed().to_euler()
def tag(name, w, origin, d=FRONT, lift=0.003):
    # Schild dorthin, wo der Strahl das Modell trifft
    h = _hit(origin, d)
    if h and not GROUP: return decal(name, w, tuple(h[1] + h[2] * lift), normal=tuple(h[2]), lift=0.0)
class on:
    # Baugruppe auf der getroffenen Fläche: -Y zeigt aus der Fläche heraus, Ursprung liegt auf der Fläche
    def __init__(self, origin, d=FRONT): self.h = _hit(origin, d)
    def __enter__(self):
        e = bpy.data.objects.new('gruppe', None); COL.objects.link(e)
        if self.h: e.location = self.h[1]; e.rotation_euler = _face_rot(self.h[2])
        else: e.scale = (0, 0, 0)
        GROUP.append(e); return e
    def __exit__(self, *a): GROUP.pop()
def put(fn, origin, d=FRONT, *args, **kw):
    with on(origin, d): fn(*args, **kw)

# ---------- Detailteile (Vorderseite -Y, Mitte im Ursprung) ----------
def hatch(w=0.2, h=0.14):
    box(w, 0.012, h, (0, -0.006, 0), GUN(), bevel=0.005); box(w * 0.74, 0.008, h * 0.72, (0, -0.014, 0), BLACK(), bevel=0.003)
    bolts([(w * 0.42 * sx, -0.013, h * 0.4 * sz) for sx in (-1, 1) for sz in (-1, 1)], r=min(0.011, w * 0.06)); box(w * 0.14, 0.014, h * 0.12, (0, -0.02, -h * 0.26), STEEL(), bevel=0.003)
def perf(w=0.3, h=0.16):
    box(w, 0.008, h, (0, -0.004, 0), STEEL(), bevel=0.003)
    nx = max(3, int(w / 0.036)); nz = max(2, int(h / 0.04))
    for r in range(nz):
        for c in range(nx): cyl(0.009, 0.01, (-w / 2 + (c + 0.5 + (0.25 if r % 2 else -0.25)) * w / nx, -0.006, -h / 2 + (r + 0.5) * h / nz), BLACK(), rot=(90, 0, 0), seg=8)
def port(r=0.05, a=None):
    cyl(r * 1.45, 0.024, (0, -0.012, 0), STEEL(), rot=(90, 0, 0), seg=6); cyl(r, 0.06, (0, -0.04, 0), ALU(), rot=(90, 0, 0), seg=28)
    cyl(r * 0.72, 0.064, (0, -0.042, 0), BLACK(), rot=(90, 0, 0), seg=20); torus(r, r * 0.13, (0, -0.066, 0), a or GUN(), rot=(90, 0, 0), seg=28, sseg=6)
def plug(r=0.035, a=None): conn((0, 0, 0), r=r, a=a)
def rivets(w=0.3, h=0.2, nx=4, nz=2, r=0.011):
    bolts([(-w / 2 + c * w / max(1, nx - 1), -0.004, -h / 2 + q * h / max(1, nz - 1)) for c in range(nx) for q in range(nz)], r=r)
def gauge(r=0.05):
    cyl(r * 1.15, 0.02, (0, -0.01, 0), GUN(), rot=(90, 0, 0), seg=32); cyl(r, 0.012, (0, -0.018, 0), pbr('skala', (0.5, 0.5, 0.47), 0.0, 0.5, wear=0.0, bevel=0), rot=(90, 0, 0), seg=32)
    ring_of(9, r * 0.8, lambda x, z, a: box(r * 0.05, 0.004, r * 0.16, (x, -0.025, z), BLACK(), rot=(0, 90 - a, 0), bevel=0), phase=20)
    box(r * 0.06, 0.006, r * 0.75, (0, -0.027, r * 0.25), paint((0.5, 0.05, 0.03)), rot=(0, 32, 0), bevel=0); cyl(r * 0.12, 0.012, (0, -0.028, 0), BLACK(), rot=(90, 0, 0), seg=10)
def switches(n=4, w=0.03):
    box(n * w * 1.5 + 0.02, 0.008, w * 2.6, (0, -0.004, 0), BLACK(), bevel=0.003)
    for i in range(n):
        x = (i - (n - 1) / 2) * w * 1.5
        box(w * 0.5, 0.02, w * 0.9, (x, -0.014, -w * 0.3), STEEL(), rot=(18 if i % 2 else -18, 0, 0), bevel=0.003); cyl(w * 0.16, 0.006, (x, -0.009, w * 0.85), led((0.2, 1, 0.4) if i % 3 else (1, 0.4, 0.1), 3), rot=(90, 0, 0), seg=8)
def strip(w=0.4, t=0.02):
    box(w, 0.006, t, (0, -0.003, 0), STEEL(), bevel=0.002); bolts([(-w * 0.45, -0.007, 0), (w * 0.45, -0.007, 0)], r=t * 0.32)
def clasp(w=0.06, h=0.1):
    box(w, 0.016, h, (0, -0.008, 0), STEEL(), bevel=0.005); box(w * 0.7, 0.02, h * 0.3, (0, -0.02, h * 0.2), GUN(), bevel=0.004); cyl(0.008, w * 0.9, (0, -0.014, -h * 0.36), STEEL(), rot=(0, 90, 0), seg=8)

# =====================================================================================
# Helme nach dem Muster des Sturmhelms
# =====================================================================================
def helm_base(A, lack, stripe, matt, visor, vis=(0.84, 0.31, 0.125), stripes=((0, 0.12), (-0.125, 0.028), (0.125, 0.028)), slits=4, kamm=True, cheeks=True, marks=()):
    SC = (0.93, 1.08, 1.0)
    def ball(r, m): return sph(r, (0, 0, 0.05), m, scale=SC, seg=80)
    def cutter(sx, sy, sz, loc, bevel=0.0, seg=1): return box(sx, sy, sz, loc, BLACK(), bevel=bevel, seg=seg)
    vb = min(0.13, vis[1] * 0.42)
    vc = cutter(vis[0], 0.6, vis[1], (0, -0.42, vis[2]), vb, 5)
    hals = cyl(0.39, 0.6, (0, 0.02, -0.6), BLACK(), seg=48)
    s = ball(0.5, lack); shell(s, 0.035); cut(s, vc); cut(s, hals)
    ball(0.468, visor)
    r = ball(0.512, matt); shell(r, 0.02); keep(r, cutter(vis[0] + 0.09, 0.6, vis[1] + 0.09, (0, -0.42, vis[2]), vb + 0.03, 5)); cut(r, vc)
    k = ball(0.524, matt); shell(k, 0.03); keep(k, cutter(0.74, 0.5, 0.3, (0, -0.42, -0.21), 0.08, 3)); cut(k, hals)
    for sx in (-1, 1):
        for i in range(slits): cut(k, cutter(0.15, 0.3, 0.016, (0.19 * sx, -0.5, -0.13 - 0.04 * i)))
    box(0.14, 0.06, 0.1, (0, -0.565, -0.2), GUN(), bevel=0.02); cyl(0.035, 0.04, (0, -0.6, -0.2), ALU(), rot=(90, 0, 0), seg=20); cyl(0.024, 0.044, (0, -0.602, -0.2), BLACK(), rot=(90, 0, 0), seg=16)
    for (x, w) in stripes:
        st = ball(0.5012, stripe); shell(st, 0.004); keep(st, cutter(w, 1.5, 0.84, (x, 0, 0.44))); cut(st, vc)
    if kamm: ka = ball(0.516, matt); shell(ka, 0.022); keep(ka, cutter(0.06, 0.62, 0.5, (0, 0.2, 0.42), 0.02))
    if cheeks:
        for sx in (-1, 1):
            w = ball(0.515, matt); shell(w, 0.024); keep(w, cutter(0.3, 0.44, 0.3, (0.43 * sx, 0.0, -0.13), 0.07, 3)); cut(w, hals)
    b = ball(0.516, matt); shell(b, 0.024); keep(b, cutter(0.46, 0.4, 0.27, (0, 0.44, -0.07), 0.07, 3))
    for i in range(5): cut(b, cutter(0.3, 0.3, 0.014, (0, 0.5, 0.02 - 0.04 * i)))
    for sx in (-1, 1):
        with grp((0.468 * sx, 0.03, -0.06), (0, 90 * sx, 0)):
            cyl(0.15, 0.05, (0, 0, 0), GUN(), seg=48, bevel=0.01); knurl(0.12, 0.04, (0, 0, 0.035), BLACK(), n=3); cyl(0.07, 0.03, (0, 0, 0.06), GUN(), seg=6)
            torus(0.15, 0.007, (0, 0, 0.022), anod(A), seg=48, sseg=6); ring_of(6, 0.135, lambda u, v, a: bolt((u, v, 0.028), rot=(0, 0, 0), r=0.009))
    cyl(0.405, 0.06, (0, 0.02, -0.33), GUN(), seg=72); torus(0.405, 0.01, (0, 0.02, -0.3), anod(A), seg=72, sseg=6); ring_of(14, 0.405, lambda u, v, a: bolt((u, 0.02 + v, -0.33), rot=(90, 0, a - 90), r=0.01))
    for i, rr in enumerate((0.38, 0.365, 0.35)): torus(rr, 0.022, (0, 0.02, -0.39 - 0.04 * i), RUBBER(), seg=64, sseg=8)
    cyl(0.33, 0.14, (0, 0.02, -0.44), BLACK(), seg=48)
    def on_shell(n):
        v = Vector(n).normalized(); return (0.502 * SC[0] * v.x, 0.502 * SC[1] * v.y, 0.05 + 0.502 * v.z), (v.x / SC[0], v.y / SC[1], v.z)
    for (name, w, n) in marks:
        p, nn = on_shell(n); decal(name, w, p, normal=nn, lift=0.007)
def helm_hoses():
    for sx in (-1, 1):
        cyl(0.05, 0.06, (0.15 * sx, 0.5, -0.2), ALU(), rot=(60, 0, 0), seg=20); cyl(0.062, 0.02, (0.15 * sx, 0.485, -0.19), STEEL(), rot=(60, 0, 0), seg=6)
        hose([(0.15 * sx, 0.52, -0.22), (0.19 * sx, 0.6, -0.36), (0.24 * sx, 0.5, -0.52)], 0.036)
@item('helm_pilot', 1)
def _(A):
    weiss = pbr('helmweiss', (0.4, 0.41, 0.42), 0.0, 0.26, wear=0.75, wear_col=(0.04, 0.04, 0.05), dirt=0.8, coat=0.7)
    helm_base(A, weiss, pbr('helmblau', (0.03, 0.1, 0.3), 0.0, 0.3, wear=0.7, coat=0.6), pbr('helmmatt', (0.026, 0.028, 0.032), 0.0, 0.58, wear=0.7),
              pbr('helmvisier', (0.05, 0.06, 0.085), 1.0, 0.05, wear=0.0, dirt=0.0, coat=1.0, bevel=0.003), vis=(0.86, 0.36, 0.11), stripes=((0, 0.07),), slits=3, kamm=False,
              marks=(('flotte_dunkel', 0.12, (0.8, -0.34, 0.5)), ('ziffer_dunkel', 0.14, (-0.78, -0.3, 0.55)), ('groesse', 0.1, (-0.6, 0.72, 0.3))))
    helm_hoses(); decal('sauerstoff', 0.11, (0, 0.585, -0.165), rot=(8, 0, 180))
@item('helm_grenz', 2)
def _(A):
    oliv = pbr('helmoliv', (0.05, 0.06, 0.035), 0.0, 0.62, wear=0.9, wear_col=(0.25, 0.25, 0.26), dirt=0.9)
    helm_base(A, oliv, pbr('helmsand', (0.2, 0.17, 0.11), 0.0, 0.6, wear=0.8), pbr('helmmatt', (0.026, 0.028, 0.032), 0.0, 0.58, wear=0.7),
              pbr('helmvisier2', (0.09, 0.06, 0.03), 1.0, 0.07, wear=0.0, dirt=0.0, coat=1.0, bevel=0.003), vis=(0.78, 0.2, 0.14), stripes=((0.2, 0.03),), slits=5,
              marks=(('flotte', 0.11, (0.82, -0.3, 0.48)), ('ziffer', 0.13, (-0.78, -0.3, 0.55)), ('crew', 0.18, (0.72, 0.62, 0.3))))
    # Stirnplatte, Nachtsichthalter, Antenne
    box(0.3, 0.06, 0.08, (0, -0.5, 0.3), GUN(), rot=(-28, 0, 0), bevel=0.015); box(0.1, 0.12, 0.07, (0, -0.56, 0.36), GUN(), rot=(-28, 0, 0), bevel=0.012); bolts([(-0.11, -0.535, 0.29), (0.11, -0.535, 0.29)], rot=(62, 0, 0), r=0.012)
    box(0.13, 0.16, 0.09, (0.34, -0.36, 0.36), GUN(), rot=(0, 0, 18), bevel=0.02); cyl(0.036, 0.1, (0.385, -0.47, 0.36), BLACK(), rot=(90, 0, 18)); cyl(0.028, 0.01, (0.4, -0.52, 0.36), lens((0.2, 0.5, 0.3)), rot=(90, 0, 18))
    cyl(0.007, 0.36, (-0.5, 0.13, 0.2), STEEL(), seg=8); cyl(0.014, 0.05, (-0.5, 0.13, 0.05), BLACK(), seg=10); helm_hoses()
@item('helm_kristall', 3)
def _(A):
    navy = pbr('helmnavy', (0.012, 0.018, 0.045), 0.0, 0.24, wear=0.6, wear_col=(0.3, 0.26, 0.16), dirt=0.5, coat=0.9)
    helm_base(A, navy, BRASS(), pbr('helmmatt', (0.026, 0.028, 0.032), 0.0, 0.58, wear=0.7), alien(), vis=(0.84, 0.36, 0.11), stripes=((-0.1, 0.02), (0.1, 0.02)), slits=3,
              marks=(('flotte', 0.12, (0.8, -0.34, 0.5)), ('crew', 0.2, (0.72, 0.62, 0.3))))
    ico(0.462, (0, -0.02, 0.05), alien(), scale=(0.93, 1.03, 0.98), sub=3)
    for (x, z) in [(-0.16, 0.14), (0.12, 0.04), (0.2, 0.2), (-0.05, 0.02)]: sph(0.008, (x, -0.475, z), led((0.5, 0.25, 1.0), 5), seg=8)
    helm_hoses()
@extend('helm_werk')
def _(A):
    tag('g_gl', 0.1, (0.0, -2, 0.33)); tag('ziffer_dunkel', 0.12, (0.6, -0.5, 0.25), (-1, 0.6, -0.2)); tag('gl', 0.2, (-0.5, 0.6, 0.3), (1, -0.9, -0.3))
    for s in (-1, 1): tube([(0.42 * s, 0.03, -0.3), (0.3 * s, -0.1, -0.5), (0.0, -0.18, -0.56)], 0.012, fabric((0.04, 0.04, 0.04)))
    box(0.06, 0.03, 0.04, (0, -0.19, -0.56), STEEL(), bevel=0.006); box(0.12, 0.012, 0.03, (0, -0.56, 0.05), STEEL(), bevel=0.003)

# =====================================================================================
# Anzüge nach dem Muster der Sturmrüstung (Körpernetz als Unterzeug, angeschmiegte Platten)
# =====================================================================================
def suit(A, under, m1, m2, o, trim=None, marks=True):
    me = mesh_from('char1')
    L = dict(arm=(0.219, 0.036, 1.428), fore=(0.326, 0.028, 1.232), hand=(0.48, -0.039, 1.055), up=(0.107, -0.013, 0.934), leg=(0.157, -0.052, 0.564), foot=(0.191, -0.007, 0.161))
    mir = lambda p, s: (p[0] * s, p[1], p[2])
    T, G = 0.014, 0.005
    kopf = box(0.7, 0.7, 0.6, (0, 0, 1.845), BLACK(), bevel=0)
    body = bpy.data.objects.new('koerper', me); COL.objects.link(body); me.materials.append(under)
    for pl in me.polygons: pl.use_smooth = True
    md = body.modifiers.new('ohne_kopf', 'BOOLEAN'); md.operation = 'DIFFERENCE'; md.object = kopf; md.solver = 'FLOAT'; kopf.hide_render = True
    bake(body); bpy.data.objects.remove(kopf, do_unlink=True)
    P = lambda m, c, n, w, h, t=T, gap=G, k=0.6, nu=16, nv=12, sm=3: patch(body, m, c, n, w, h, t=t, gap=gap, k=k, nu=nu, nv=nv, smooth=sm)
    S = lambda m, a, b, f0, f1, r, face=None, arc=360, tip=0.0, t=T, gap=G: sleeve(body, m, a, b, f0, f1, r, t=t, gap=gap, face=face, arc=arc, tip=tip, smooth=3)
    brust = None
    if 'brust' in o:
        brust = P(m1, (0, -0.45, 1.375), (0, -1, 0), 0.42, 0.17, t=0.02, gap=0.022, k=0.75, nu=24, nv=12, sm=14)
        P(m2, (0, -0.45, 1.375), (0, -1, 0), 0.05, 0.15, gap=0.044, k=0.3, nu=4, nv=10, sm=14)
        for s in (-1, 1): P(m2, (0.12 * s, -0.4, 1.475), (0.1 * s, -1, 0.7), 0.14, 0.07, k=0.6, nu=10, nv=6)
    if 'rippen' in o:
        for s in (-1, 1): P(m1, (0.105 * s, -0.45, 1.25), (0, -1, 0), 0.19, 0.08, gap=0.012, k=0.45, nv=8, sm=10)
    if 'bauch' in o:
        for z, w in ((1.165, 0.33), (1.095, 0.3), (1.03, 0.27)): P(m2, (0, -0.45, z), (0, -1, 0), w, 0.06, k=0.3, nu=18, nv=5)
    if 'ruecken' in o:
        for s in (-1, 1): P(m2, (0.1 * s, 0.45, 1.36), (0, 1, 0), 0.19, 0.2, t=0.018)
        for z, w in ((1.2, 0.3), (1.13, 0.28), (1.06, 0.26)): P(m2, (0, 0.45, z), (0, 1, 0), w, 0.06, k=0.3, nu=18, nv=5)
    if 'flanke' in o:
        for s in (-1, 1): P(m2, (0.5 * s, 0.0, 1.22), (s, 0, 0), 0.16, 0.22, k=0.6, nu=10, nv=12)
    if 'guertel' in o:
        S(m2, (0, 0, 0.955), (0, 0, 1.01), 0, 1, 0.26, t=0.018); P(m2, (0, -0.45, 0.89), (0, -1, 0), 0.15, 0.15, k=0.8, nu=10, nv=10)
    sch = {}
    for s in (-1, 1):
        A_, F_, H_, U_, K_, T_ = (mir(L[k], s) for k in ('arm', 'fore', 'hand', 'up', 'leg', 'foot'))
        out = (s, 0, 0.2)
        if 'schulter' in o:
            sch[s] = dome(m1, (0.243 * s, 0.03, 1.43), 0.118, 0.07, scale=(1.0, 1.2, 1.0), rot=(0, 34 * s, 0))
            tr = torus(0.118, 0.008, (0.243 * s, 0.03, 1.432), trim or m2, rot=(0, 34 * s, 0), seg=40, sseg=6); tr.scale = (1.0, 1.2, 1.0)
            S(m1, A_, F_, 0.1, 0.34, 0.1, face=out, arc=210, tip=0.02)
        if 'oberarm' in o:
            S(m2, A_, F_, 0.38, 0.62, 0.095, face=out, arc=200, tip=0.02); S(m2, A_, F_, 0.68, 0.9, 0.09, face=out, arc=170)
            dome(m2, (F_[0] + 0.045 * s, F_[1] + 0.035, F_[2] - 0.01), 0.05, 0.03, rot=(-70, 60 * s, 0))
        if 'unterarm' in o:
            S(m1, F_, H_, 0.12, 0.84, 0.08, face=(s, 0.4, 0), arc=230, tip=0.03); S(m2, F_, H_, 0.78, 0.9, 0.075, t=0.01)
            P(m2, (H_[0] + 0.25 * s, H_[1] - 0.04, H_[2] - 0.055), (s, -0.2, 0.15), 0.075, 0.085, t=0.01, k=0.8, nu=8, nv=8)
        if 'huefte' in o:
            P(m1, (0.2 * s, -0.42, 0.865), (0.45 * s, -1, 0), 0.15, 0.17, k=0.7, nu=12, nv=12); P(m2, (0.5 * s, 0.02, 0.9), (s, 0, 0), 0.16, 0.16, k=0.7, nu=10, nv=10)
        if 'schenkel' in o:
            S(m1, U_, K_, 0.32, 0.8, 0.13, face=(0.25 * s, -1, 0), arc=150, tip=0.04); S(m2, U_, K_, 0.3, 0.74, 0.13, face=(s, 0.25, 0), arc=110, tip=0.02)
        if 'knie' in o:
            dome(m2, (K_[0], K_[1] - 0.062, K_[2] + 0.005), 0.062, 0.04, scale=(1.0, 1.0, 1.2), rot=(90, 0, 0)); S(m2, U_, K_, 0.84, 0.94, 0.11, face=(0.1 * s, -1, 0), arc=170)
        if 'schiene' in o:
            S(m1, K_, T_, 0.15, 0.86, 0.105, face=(0.15 * s, -1, 0), arc=190, tip=0.045); S(m2, K_, T_, 0.2, 0.7, 0.11, face=(0, 1, 0), arc=130, tip=0.02)
            P(m2, (T_[0] + 0.012 * s, -0.4, 0.07), (0, -1, 0.5), 0.11, 0.09, k=0.8, nu=8, nv=8)
        if 'riemen' in o:
            for (a, b, fr, rr) in ((F_, H_, 0.3, 0.07), (F_, H_, 0.7, 0.06), (U_, K_, 0.45, 0.12), (K_, T_, 0.36, 0.09), (K_, T_, 0.72, 0.075)):
                S(under, a, b, fr - 0.025, fr + 0.025, rr, t=0.006, gap=0.002)
                c = Vector(a).lerp(Vector(b), fr); box(0.026, 0.026, 0.034, (c.x + rr * s * 0.92, c.y + 0.02, c.z), GUN(), bevel=0.005)
        if 'ringe' in o:        # Druckanzug: Gelenkringe aus Gummi und Metall
            for (a, b, fr, rr) in ((A_, F_, 0.12, 0.1), (A_, F_, 0.9, 0.085), (F_, H_, 0.82, 0.07), (U_, K_, 0.2, 0.14), (U_, K_, 0.92, 0.11), (K_, T_, 0.85, 0.09)):
                S(RUBBER(), a, b, fr - 0.04, fr + 0.04, rr, t=0.014, gap=0.004); S(STEEL(), a, b, fr - 0.012, fr + 0.012, rr, t=0.008, gap=0.014)
        if 'rahmen' in o:       # Exo-Rahmen: Rohre außen an Arm und Bein, Gelenke mit Antrieben
            ox = lambda p, d: (p[0] + d * s, p[1] + 0.01, p[2])
            tube([ox(A_, 0.085), ox(F_, 0.09), ox(H_, 0.06)], 0.012, ALU()); tube([ox(U_, 0.12), ox(K_, 0.1), ox(T_, 0.085)], 0.014, ALU())
            for (p, d, r) in ((A_, 0.09, 0.045), (F_, 0.095, 0.036), (U_, 0.125, 0.05), (K_, 0.105, 0.042), (T_, 0.09, 0.034)):
                c = ox(p, d); cyl(r, 0.04, c, GUN(), rot=(0, 90, 0), seg=24); cyl(r * 0.5, 0.05, c, anod(A), rot=(0, 90, 0), seg=6)
            for (a, b, fr, rr) in ((A_, F_, 0.55, 0.095), (F_, H_, 0.5, 0.07), (U_, K_, 0.5, 0.125), (K_, T_, 0.5, 0.095)): S(GUN(), a, b, fr - 0.03, fr + 0.03, rr, t=0.01, gap=0.004)
        if marks and 'schulter' in o:
            if s > 0: stick('ziffer', 0.06, sch[s], (0.8, 0.02, 1.52), (-1, 0, -0.12))
            else: stick('flotte', 0.055, sch[s], (-0.8, 0.02, 1.52), (1, 0, -0.12))
    if 'rahmen' in o: tube([(0, 0.2, 1.0), (0, 0.23, 1.25), (0, 0.2, 1.45)], 0.016, ALU()); tube([(-0.2, 0.1, 0.98), (0, 0.2, 1.0), (0.2, 0.1, 0.98)], 0.014, ALU())
    if marks and brust: stick('flotte', 0.06, brust, (0.12, -1, 1.385), (0, 1, 0)); stick('crew', 0.1, brust, (-0.11, -1, 1.385), (0, 1, 0))
    if 'geraet' in o:
        with grp((0, -0.236, 1.25)):
            box(0.12, 0.05, 0.075, (0, 0, 0), GUN(), bevel=0.012); box(0.08, 0.008, 0.03, (0, -0.026, 0.012), screen((0.1, 0.5, 0.4), 0.8), bevel=0)
            for i in range(3): cyl(0.005, 0.006, (-0.026 + 0.026 * i, -0.027, -0.02), led((0.2, 1, 0.4) if i else (1, 0.4, 0.1), 4), rot=(90, 0, 0), seg=8)
            conn((0.075, -0.006, 0.0), rot=(0, 0, 90), r=0.015, a=anod(A)); conn((-0.075, -0.006, 0.0), rot=(0, 0, -90), r=0.015)
        for s in (-1, 1): hose([(0.1 * s, -0.24, 1.25), (0.21 * s, -0.2, 1.2), (0.265 * s, 0.0, 1.17), (0.16 * s, 0.21, 1.2)], 0.011)
    if 'kragen' in o:
        torus(0.11, 0.016, (0, 0.0, 1.535), GUN(), seg=40, sseg=8); torus(0.11, 0.005, (0, 0.0, 1.552), anod(A), seg=40, sseg=6); cyl(0.095, 0.03, (0, 0, 1.53), BLACK(), seg=32)
        ring_of(10, 0.11, lambda u, v, a: bolt((u, v, 1.535), rot=(90, 0, a - 90), r=0.007))
    else: cyl(0.09, 0.02, (0, 0, 1.535), under, seg=32); torus(0.092, 0.012, (0, 0, 1.54), under, seg=32, sseg=6)
    if 'tornister' in o:
        with grp((0, 0.235, 1.3)):
            box(0.26, 0.1, 0.34, (0, 0, 0), GUN(), bevel=0.025); vent(0.16, 0.09, (0, 0.052, 0.08), rot=(0, 0, 180), n=5)
            for sx in (-1, 1): cyl(0.04, 0.28, (0.09 * sx, 0.03, -0.03), ALU(), seg=20); cyl(0.045, 0.03, (0.09 * sx, 0.03, 0.12), GUN(), seg=20)
    if 'taschen' in o:
        for (x, y, rz) in ((0.12, -0.215, 0), (-0.12, -0.215, 0), (0.25, -0.02, 80), (-0.25, -0.02, -80)): box(0.07, 0.045, 0.09, (x, y, 0.985), fabric((0.1, 0.1, 0.11)), rot=(0, 0, rz), bevel=0.012)
    return body
ALLE = {'brust', 'rippen', 'bauch', 'ruecken', 'flanke', 'guertel', 'schulter', 'oberarm', 'unterarm', 'huefte', 'schenkel', 'knie', 'schiene', 'riemen', 'geraet', 'kragen', 'tornister', 'taschen'}
@item('anzug_overall', 0)
def _(A):
    body = suit(A, pbr('overall', (0.03, 0.045, 0.075), 0.0, 0.85, wear=0.0, dirt=1.0, bevel=0.006), None, None, {'taschen'}, marks=False)
    stick('flotte', 0.05, body, (0.1, -1, 1.36), (0, 1, 0)); stick('crew', 0.09, body, (-0.1, -1, 1.36), (0, 1, 0)); stick('ziffer', 0.07, body, (0, 1, 1.36), (0, -1, 0))
@item('anzug_druck', 1)
def _(A):
    w = pbr('druckweiss', (0.34, 0.35, 0.36), 0.0, 0.4, wear=0.8, wear_col=(0.05, 0.05, 0.06), dirt=0.9, coat=0.3, bevel=0.004)
    suit(A, pbr('druckstoff', (0.2, 0.2, 0.2), 0.0, 0.8, wear=0.0, dirt=1.0, bevel=0.006), w, pbr('druckgrau', (0.07, 0.075, 0.08), 0.2, 0.5, wear=0.8, bevel=0.004),
         {'brust', 'rippen', 'ruecken', 'guertel', 'schulter', 'unterarm', 'schiene', 'ringe', 'geraet', 'kragen', 'tornister'})
@item('anzug_exo', 2)
def _(A):
    d = pbr('exodunkel', (0.024, 0.025, 0.029), 0.4, 0.46, wear=1.0, wear_col=(0.32, 0.32, 0.34), dirt=0.8, bevel=0.004)
    suit(A, pbr('unterzeug', (0.014, 0.015, 0.018), 0.0, 0.66, wear=0.0, dirt=0.9, bevel=0.006), d, d, {'brust', 'guertel', 'knie', 'rahmen', 'geraet', 'kragen', 'tornister', 'taschen'})
@item('anzug_panzer', 2)
def _(A):
    ol = pbr('panzeroliv', (0.055, 0.065, 0.035), 0.0, 0.6, wear=1.0, wear_col=(0.3, 0.3, 0.3), dirt=1.0, bevel=0.004)
    suit(A, pbr('unterzeug', (0.014, 0.015, 0.018), 0.0, 0.66, wear=0.0, dirt=0.9, bevel=0.006), ol, pbr('panzerdunkel', (0.03, 0.034, 0.026), 0.2, 0.55, wear=1.0, dirt=0.9, bevel=0.004), ALLE)
@item('anzug_veteran', 3)
def _(A):
    nv = pbr('vetnavy', (0.014, 0.02, 0.05), 0.0, 0.4, wear=1.0, wear_col=(0.4, 0.33, 0.18), dirt=0.9, coat=0.3, bevel=0.004)
    suit(A, pbr('unterzeug', (0.014, 0.015, 0.018), 0.0, 0.66, wear=0.0, dirt=0.9, bevel=0.006), nv, pbr('vetdunkel', (0.022, 0.023, 0.03), 0.4, 0.44, wear=1.0, wear_col=(0.4, 0.33, 0.18), dirt=0.8, bevel=0.004), ALLE, trim=BRASS())
    for z in (1.3, 1.44): tube([(-0.2, -0.225, z), (0, -0.25, z + 0.01), (0.2, -0.225, z)], 0.004, BRASS())

# =====================================================================================
# Schiffsmodule: Schilder, Klappen, Anschlüsse
# =====================================================================================
@extend('sw_lauf')
def _(A):
    tag('hw', 0.3, (-0.5, -2, -0.16)); tag('sn1', 0.1, (-0.68, -2, -0.05)); tag('g_hw', 0.07, (-0.68, -2, 0.04)); put(plug, (-2, -0.13, 0), LEFT, 0.035); put(plug, (-2, 0.13, 0), LEFT, 0.035)
    put(rivets, (-0.5, 0, 2), TOP, 0.3, 0.14, 4, 2); tag('munition', 0.12, (-0.15, -2, 0.0))
@extend('sw_lader')
def _(A):
    tag('hw', 0.34, (-0.1, -2, 0.25)); tag('munition', 0.2, (0.2, -2, -0.2)); tag('sn2', 0.12, (-0.22, -2, -0.24)); tag('streifen', 0.5, (0, 0, 2), TOP)
    put(hatch, (-2, 0, 0.05), LEFT, 0.26, 0.2); put(switches, (-0.25, -2, 0.05), FRONT, 3, 0.026)
@extend('sw_zielrechner')
def _(A):
    tag('lotse', 0.3, (0.2, -2, 0.04)); tag('sn1', 0.1, (-0.26, -2, -0.12)); tag('klein', 0.2, (0.1, -2, -0.14)); put(hatch, (-2, 0, 0), LEFT, 0.3, 0.2); tag('laser', 0.14, (0.56, -2, 0.1))
@extend('sw_rotation')
def _(A):
    tag('hw', 0.3, (-0.42, -2, 0.0)); tag('munition', 0.16, (-0.5, -2, -0.36)); put(hatch, (-0.5, 2, -0.05), BACK, 0.22, 0.18); tag('warn', 0.07, (-0.6, -2, 0.16)); put(plug, (-0.45, -2, -0.3), FRONT, 0.03)
@extend('sw_gauss')
def _(A):
    tag('hw', 0.28, (-0.86, -2, 0.12)); tag('spannung', 0.18, (-0.86, -2, -0.16)); tag('sn2', 0.1, (-0.76, -2, -0.06)); put(hatch, (-2, 0, 0), LEFT, 0.26, 0.24); put(gauge, (-0.98, -2, -0.04), FRONT, 0.035)
@extend('sw_zwilling')
def _(A):
    tag('hw', 0.3, (-0.14, -2, -0.04)); tag('munition', 0.14, (-0.2, -2, -0.06)); tag('sn1', 0.1, (-0.1, -2, -0.48)); put(hatch, (-0.14, 0, 2), TOP, 0.26, 0.2); tag('warn', 0.07, (-0.3, -2, 0.1))
@extend('sw_lanze')
def _(A):
    tag('hw', 0.26, (-0.5, -2, -0.34)); tag('nichtoeffnen', 0.2, (-0.5, 0, 2), TOP); tag('warn', 0.07, (-0.3, -2, -0.34)); put(plug, (-2, 0.1, -0.34), LEFT, 0.03)
@extend('sa_platten')
def _(A):
    tag('sw', 0.4, (0.06, -2, 0.18)); tag('sn1', 0.12, (0.36, -2, -0.2)); tag('werk', 0.3, (0.0, -2, -0.26)); tag('g_sw', 0.1, (-0.36, -2, 0.2))
@extend('sa_kondensator')
def _(A):
    tag('sw', 0.36, (0, -2, -0.5)); tag('spannung', 0.2, (0, -2, 0.3));
    for i in range(3): tag('g_sw', 0.07, (-0.34 + 0.34 * i, -2, 0.08)); put(gauge, (-0.34 + 0.34 * i, -2, -0.24), FRONT, 0.03)
@extend('sa_waben')
def _(A):
    tag('sw', 0.3, (0, -2, -0.52)); tag('sn2', 0.1, (0.36, -2, 0.42)); tag('g_sw', 0.08, (-0.4, -2, 0.42))
@extend('sa_projektor')
def _(A):
    tag('sw', 0.3, (0.12, -2, -0.5)); tag('sn1', 0.1, (-0.2, -2, -0.52)); put(hatch, (0, 0, 2), TOP, 0.2, 0.16); put(gauge, (0.3, -2, -0.36), FRONT, 0.03); tag('spannung', 0.14, (-2, 0, -0.42), LEFT)
@extend('sa_reaktiv')
def _(A):
    tag('sw', 0.3, (0, -2, 0.0));
    for c in range(3): tag('nichtoeffnen', 0.12, (-0.4 + 0.4 * c, -2, 0.3)); tag('sn1', 0.08, (-0.4 + 0.4 * c, -2, -0.3))
    tag('warn', 0.06, (-0.4, -2, 0.12)); tag('warn', 0.06, (0.4, -2, -0.12))
@extend('sa_phasen')
def _(A):
    tag('sw', 0.3, (0.05, -2, -0.6)); tag('spannung', 0.14, (0.3, -2, -0.52)); put(switches, (-0.2, 0, 2), TOP, 4, 0.024); tag('sn2', 0.1, (-0.3, -2, -0.62)); put(gauge, (0.36, -2, -0.4), FRONT, 0.028)
@extend('sa_bollwerk')
def _(A):
    box(0.84, 0.84, 0.08, (0, 0, -0.5), GUN(), bevel=0.015); box(0.5, 0.012, 0.3, (0, -0.43, -0.3), GUN(), bevel=0.006)
    tag('sw', 0.36, (0, -2, -0.22)); tag('spannung', 0.16, (-0.12, -2, -0.38)); put(gauge, (0.16, -2, -0.37), FRONT, 0.035); tag('g_sw', 0.12, (0.0, -2, 0.06)); tag('sn1', 0.1, (0, -2, -0.5))
@extend('st_duesen')
def _(A):
    tag('vt', 0.2, (0, -2, -0.13)); tag('schub', 0.08, (0.3, -2, -0.1)); put(plug, (-2, 0, -0.13), LEFT, 0.03); tag('sn1', 0.08, (0, -2, -0.28)); put(gauge, (0, 2, -0.13), BACK, 0.03)
@extend('st_wirbel')
def _(A):
    tag('vt', 0.3, (0, -2, 0.14)); tag('schub', 0.1, (0.14, -2, -0.08)); tag('sn2', 0.1, (0, -2, -0.3)); put(hatch, (0, 2, 0), BACK, 0.24, 0.2); tag('treibstoff', 0.2, (2, 0, 0.1), RIGHT)
@extend('st_nachbrenner')
def _(A):
    tag('vt', 0.2, (0, -2, -0.14)); tag('treibstoff', 0.14, (0.0, -2, -0.24)); put(plug, (-2, 0, -0.14), LEFT, 0.03); put(gauge, (0, 2, -0.14), BACK, 0.03); tag('warn', 0.06, (0, -2, 0.28))
@extend('st_vektor')
def _(A):
    tag('vt', 0.18, (0, -2, -0.2)); tag('schub', 0.08, (0.1, -2, -0.3)); put(plug, (-2, 0, -0.2), LEFT, 0.028); put(plug, (2, 0, -0.2), RIGHT, 0.028)
@extend('st_fusion')
def _(A):
    tag('vt', 0.22, (0, -2, -0.2)); tag('treibstoff', 0.16, (0.0, -2, -0.3)); put(gauge, (-0.14, -2, -0.12), FRONT, 0.03); put(plug, (2, 0, -0.2), RIGHT, 0.035, anod(A)); tag('warn', 0.06, (0.16, -2, -0.12))
@extend('st_gyro')
def _(A):
    tag('lotse', 0.26, (0, -2, -0.4)); tag('sn1', 0.1, (-0.2, -2, -0.47)); put(switches, (0.2, 0, 2), TOP, 3, 0.022); tag('nichtoeffnen', 0.16, (0, 0, 2), TOP)
@extend('st_sturm')
def _(A):
    tag('vt', 0.3, (0, -2, -0.14)); tag('schub', 0.1, (0.3, -2, -0.2)); tag('treibstoff', 0.18, (-0.2, -2, -0.2)); put(plug, (-2, 0, -0.14), LEFT, 0.035, anod(A)); put(gauge, (0, 2, -0.14), BACK, 0.035); tag('sn2', 0.1, (0, -2, -0.3))
@extend('sy_netz')
def _(A):
    tag('gl', 0.3, (0.0, -2, 0.2)); tag('inhalt', 0.14, (-0.36, -2, -0.2)); tag('strich', 0.14, (0.36, -2, -0.2)); tag('gl', 0.3, (0, 0, 2), TOP)
    for x in (-0.36, 0.36): put(clasp, (x, -2, 0.26), FRONT, 0.05, 0.08)
@extend('sy_linse')
def _(A):
    tag('lotse', 0.2, (0, 0, 2), TOP); tag('laser', 0.12, (0.0, 0.05, -0.2), (0, 0, -1)); tag('sn1', 0.1, (0, -2, -0.45)); tag('g_lotse', 0.07, (-2, 0, 0.08), LEFT)
@extend('sy_antenne')
def _(A):
    tag('lotse', 0.2, (0.1, -2, -0.6)); tag('sn2', 0.1, (0.12, -2, -0.67)); put(plug, (-2, 0, -0.6), LEFT, 0.03); put(hatch, (0, 2, -0.6), BACK, 0.2, 0.12); put(switches, (0.1, 0, 2), TOP, 2, 0.02)
@extend('sy_ausbau')
def _(A):
    tag('gl', 0.24, (-0.33, -2, -0.3)); tag('g_gl', 0.1, (0.33, -2, -0.26)); tag('inhalt', 0.14, (0.0, -2, 0.12)); tag('ziffer', 0.12, (0.0, -2, 0.26)); tag('strich', 0.12, (0.33, -2, -0.36)); tag('streifen', 0.4, (-0.33, -2, -0.38))
@extend('sy_prisma')
def _(A):
    tag('lotse', 0.28, (-0.2, -2, 0.06)); tag('laser', 0.16, (0.2, -2, -0.08)); tag('sn1', 0.1, (-0.3, -2, -0.1)); put(switches, (-0.3, 0, 2), TOP, 3, 0.02); tag('nichtoeffnen', 0.14, (0.3, 0.2, 2), TOP)
@extend('sy_sonde')
def _(A):
    tag('lotse', 0.14, (0, -2, 0.3)); tag('g_lotse', 0.06, (0, -2, -0.1)); tag('sn2', 0.08, (0, -2, 0.0)); tag('streifen', 0.16, (0, -2, 0.46))
@extend('sy_kompressor')
def _(A):
    tag('gl', 0.3, (0, -2, 0.52)); tag('sn1', 0.1, (0, -2, -0.56)); put(gauge, (-0.2, -2, -0.02), FRONT, 0.03); put(switches, (0.2, -2, -0.02), FRONT, 3, 0.02); tag('warn', 0.07, (0.0, -2, -0.02))
@extend('sy_resonator')
def _(A):
    tag('lotse', 0.26, (0.0, -2, -0.5)); tag('spannung', 0.14, (0.0, -2, -0.34)); tag('sn2', 0.1, (0.2, -2, -0.58)); put(gauge, (0, 0, 2), TOP, 0.03)
@extend('sy_orakel')
def _(A):
    tag('lotse', 0.2, (-0.22, -2, -0.47)); tag('nichtoeffnen', 0.16, (0.18, -2, -0.47)); tag('warn', 0.06, (0, -2, -0.6)); put(plug, (-2, 0, -0.54), LEFT, 0.03); put(switches, (0.3, 0.2, 2), TOP, 3, 0.02)
@extend('sy_herz')
def _(A):
    box(0.78, 0.78, 0.08, (0, 0, -0.56), GUN(), bevel=0.015); box(0.5, 0.012, 0.22, (0, -0.4, -0.42), GUN(), bevel=0.006)
    tag('sw', 0.34, (0, -2, -0.4)); tag('spannung', 0.16, (-0.12, -2, -0.48)); put(gauge, (0.16, -2, -0.47), FRONT, 0.032); tag('g_sw', 0.1, (0, -2, 0.3)); tag('sn1', 0.1, (0, -2, -0.56))

# =====================================================================================
# Pilotenausrüstung: Schilder, Schnallen, Beschläge
# =====================================================================================
@extend('ruck_tasche')
def _(A):
    tag('gl', 0.24, (0, -2, -0.14)); tag('g_gl', 0.07, (0.3, -2, 0.18)); put(clasp, (0, 0, 2), TOP, 0.05, 0.07); tag('groesse', 0.1, (-0.3, -2, -0.18))
@extend('ruck_feld')
def _(A):
    tag('gl', 0.22, (0, -2, 0.36)); tag('flotte', 0.08, (0, -2, -0.2)); tag('g_gl', 0.06, (0.42, -2, -0.02)); tag('ziffer', 0.08, (-0.42, -2, -0.02))
    for x in (-0.14, 0.14): put(clasp, (x, -2, -0.42), FRONT, 0.04, 0.06)
@extend('ruck_lasten')
def _(A):
    tag('gl', 0.24, (0, -2, 0.1)); tag('inhalt', 0.14, (0.2, -2, -0.48)); tag('strich', 0.12, (-0.2, -2, -0.48)); tag('streifen', 0.3, (0, -2, -0.56)); put(clasp, (0.3, -2, -0.32), FRONT, 0.04, 0.06); put(clasp, (-0.3, -2, -0.32), FRONT, 0.04, 0.06)
@extend('ruck_schwebe')
def _(A):
    tag('vt', 0.26, (0, -2, 0.42)); tag('schub', 0.08, (0.43, -2, -0.1)); tag('schub', 0.08, (-0.43, -2, -0.1)); tag('sn1', 0.1, (0, -2, -0.14)); put(switches, (0, 0, 2), TOP, 3, 0.022); tag('warn', 0.05, (-0.2, -2, 0.3))
@extend('waffe_pistole')
def _(A):
    tag('hw', 0.26, (0.1, -2, 0.16)); tag('sn1', 0.1, (0.2, -2, 0.02)); tag('g_hw', 0.05, (-0.28, -2, -0.2))
@extend('waffe_karabiner')
def _(A):
    tag('hw', 0.3, (0.6, -2, 0.2)); tag('sn2', 0.1, (-0.3, -2, 0.0)); tag('g_hw', 0.06, (-0.8, -2, 0.0)); tag('ziffer_dunkel', 0.06, (-0.42, -2, 0.16))
@extend('waffe_flinte')
def _(A):
    tag('hw', 0.26, (-0.05, -2, 0.2)); tag('sn1', 0.1, (0.0, -2, -0.0)); tag('g_hw', 0.06, (-0.8, -2, 0.0)); tag('munition', 0.1, (0.66, -2, 0.04))
@extend('waffe_impuls')
def _(A):
    tag('hw', 0.26, (-0.25, -2, 0.2)); tag('laser', 0.12, (0.3, -2, 0.18)); tag('spannung', 0.1, (0.24, -2, -0.16)); tag('g_hw', 0.06, (-0.8, -2, 0.0))
@extend('waffe_splitter')
def _(A):
    tag('hw', 0.22, (-0.3, -2, 0.19)); tag('nichtoeffnen', 0.12, (0.3, -2, 0.1)); tag('warn', 0.05, (0.62, -2, 0.1)); tag('g_hw', 0.06, (-0.8, -2, 0.0))
@extend('werk_scanner')
def _(A):
    tag('lotse', 0.2, (0, -2, 0.41)); tag('sn1', 0.1, (0, -2, -0.2)); tag('g_lotse', 0.05, (0, -2, -0.4))
@extend('werk_bohrkopf')
def _(A):
    tag('gl', 0.2, (0, -2, 0.08)); tag('sn2', 0.08, (0, -2, -0.02)); tag('warn', 0.05, (0.16, -2, 0.12))
@extend('werk_resonanz')
def _(A):
    tag('gl', 0.26, (-0.1, 0, 2), TOP); tag('sn1', 0.1, (-0.2, -2, 0.02)); tag('warn', 0.06, (0.26, 0, 2), TOP); put(switches, (-0.36, -2, -0.46), FRONT, 2, 0.02)
@extend('werk_kernsonde')
def _(A):
    tag('lotse', 0.1, (0, -2, 0.42)); tag('sn2', 0.06, (0, -2, 0.3)); tag('streifen', 0.1, (0, -2, -0.66))
@extend('mod_servo')
def _(A):
    tag('gl', 0.24, (-0.2, -2, 0.1)); tag('sn1', 0.1, (0.16, -2, -0.13)); tag('warn', 0.05, (0.16, 0, 2), TOP); tag('g_gl', 0.06, (0.16, 0, 2), TOP)
@extend('mod_platte')
def _(A):
    tag('sw', 0.36, (0, -2, 0.3)); tag('groesse', 0.14, (0.16, -2, -0.3)); tag('sn1', 0.12, (-0.16, -2, -0.3))
@extend('mod_rechner')
def _(A):
    tag('lotse', 0.2, (-0.1, -2, -0.46)); tag('sn2', 0.08, (0.2, -2, -0.46))
@extend('mod_logbuch')
def _(A):
    tag('flotte_dunkel', 0.12, (-0.06, -2, 0.34)); tag('crew', 0.2, (-0.06, -2, -0.3))
@extend('mod_siegel')
def _(A):
    tag('g_gl', 0.14, (0, -2, 0.14)); tag('sn1', 0.08, (0, -2, -0.2))
@extend('mod_kompass')
def _(A):
    tag('lotse', 0.2, (0, -2, -0.2)); tag('g_lotse', 0.08, (0, -2, 0.2))
@extend('vb_schaum')
def _(A):
    tag('frost_ersatz' if False else 'gl', 0.22, (0, -2, 0.08)); tag('inhalt', 0.14, (0, -2, -0.06)); tag('warn', 0.07, (0.0, -2, 0.28)); tag('klein', 0.2, (0, -2, -0.3))
@extend('vb_zelle')
def _(A):
    tag('sw', 0.3, (0, -2, 0.3)); tag('spannung', 0.18, (0, -2, -0.3)); tag('strich', 0.12, (2, 0, 0), RIGHT); tag('sn1', 0.1, (0, -2, 0.09))
@extend('vb_satz')
def _(A):
    tag('gl', 0.3, (0, -2, -0.18)); tag('g_gl', 0.1, (-0.36, -2, 0.1)); tag('gl', 0.34, (0, 0, 2), TOP); tag('inhalt', 0.12, (0.36, -2, -0.2))
@extend('vb_notkern')
def _(A):
    tag('sw', 0.2, (0, -2, 0.42)); tag('spannung', 0.14, (0, -2, -0.42)); tag('sn2', 0.08, (-0.12, -2, 0.1)); tag('nichtoeffnen', 0.12, (2, 0, 0.1), RIGHT)
@extend('fund_datenkern')
def _(A):
    tag('lotse', 0.2, (0.16, -2, 0.1)); tag('nichtoeffnen', 0.14, (0.2, -2, -0.12)); tag('strich', 0.12, (-2, 0, 0), LEFT); tag('sn2', 0.1, (-0.2, 0.26, 2), TOP)
@extend('fund_siegel')
def _(A):
    tag('flotte_dunkel', 0.1, (0, -2, 0.1), FRONT, 0.035)
@extend('fund_sternkarte')
def _(A):
    tag('g_lotse', 0.07, (0.3, -2, -0.3)); tag('sn1', 0.08, (-0.28, -2, -0.3))
