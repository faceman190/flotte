# Wisent: eigener schwerer Frachter mit viel Feuerkraft, Schaumodell in Blender (18.11.2026).
# Wunsch des Nutzers: „Ein großer Frachter mit viel Feuerkraft. Entwerfe so ein Schiff in Blender, gib dir wirklich Mühe. Außen als auch innen.
# Ich will das schönste Cockpit haben, so viel Detail wie auf den Bildern.“ Die Bilder zeigten einen Frachter aus einem anderen Spiel; das hier ist
# ein eigener Entwurf in dieser Art, keine Kopie: Delfinnase mit schräg umlaufendem Sichtband, breiter Knickflügel mit ovalen Triebwerksgondeln im Knick,
# hohe Endscheiben, dazu eigene Teile (zwei schräge Leitwerke am Heck, Schubdüsen mit Leitschaufeln, Senkrechtstartzellen für Flugkörper auf den
# Flügeln, sechs Geschütztürme, Heckrampe unten).
# Aufruf ohne Fenster: blender.exe -b --python wis_lauf.py -- <ansichten> | alle
#
# Achsen wie beim Würger: +X nach vorn, +Y Backbord, +Z oben, Boden z = 0. Maße rund 84 × 64 × 20 m.
# Werkzeuge kommen aus ../elster/els_kit.py (die wiederum ../wuerger/wue_kit.py lädt): Plattenmaterial mit Fugen und Nieten im Shader,
# Superellipsen-Rumpf (params/hull_point werden hier neu gesetzt, die Bandwerkzeuge der Elster nutzen sie dann automatisch).
import bpy, bmesh, math, random, os, json
from mathutils import Vector, Matrix
NUR_HELFER_ELSTER = True
HERE_W = os.path.dirname(bpy.data.filepath)
_ek = os.path.join(HERE_W, '..', 'elster', 'els_kit.py')
exec(compile(open(_ek, encoding='utf-8').read(), 'els_kit.py', 'exec'))
_wis_view0 = _view0      # Ansicht aus dem Würger (Bühnen, Belichtung)

# =====================================================================================
# Materialien: Graphit mit großen Platten, Grau unten, Signalrot, Schwarz
# =====================================================================================
M['p_graphit'] = panel_mat('Rumpf Graphit', (0.034, 0.036, 0.04), 0.45, 0.4, 0.7, brick=(3.4, 1.9), mortar=0.007)
M['p_grau'] = panel_mat('Rumpf Mittelgrau', (0.1, 0.104, 0.11), 0.4, 0.42, 0.8, brick=(3.0, 1.6), mortar=0.007)
M['p_rot'] = panel_mat('Rumpf Signalrot', (0.32, 0.018, 0.012), 0.25, 0.4, 0.8, brick=(3.0, 1.6), mortar=0.006, rivets=False)
M['p_schwarz'] = panel_mat('Rumpf Schwarz', (0.012, 0.012, 0.014), 0.5, 0.38, 0.5, brick=(2.4, 1.4), rivets=False)
M['p_hell'] = panel_mat('Rumpf Hellgrau', (0.26, 0.262, 0.265), 0.3, 0.42, 0.9, brick=(3.0, 1.6), mortar=0.007)
M['g_rot'] = hull_mat('Lack Signalrot', (0.32, 0.016, 0.01), 0.25, 0.4, 0.8)
M['g_graphit'] = hull_mat('Lack Graphit', (0.034, 0.036, 0.04), 0.5, 0.38, 0.7)
M['g_grau'] = hull_mat('Lack Mittelgrau', (0.1, 0.104, 0.11), 0.45, 0.4, 0.8)
M['g_hell'] = hull_mat('Lack Hellgrau', (0.26, 0.262, 0.265), 0.3, 0.42, 0.9)
M['g_schwarz'] = hull_mat('Lack Schwarz', (0.012, 0.012, 0.014), 0.55, 0.36, 0.5)
M['sicht'] = mk('Sichtbandglas', (0.42, 0.46, 0.5), 0.0, 0.02, var=0, rvar=0.004, grime=False, trans=1.0)
low_spec(M['sicht'], 0.45)
M['vls'] = hull_mat('Zellendeckel', (0.06, 0.063, 0.068), 0.6, 0.38, 0.8)
HULL_MATS = ['p_graphit', 'p_grau', 'p_rot', 'p_schwarz', 'p_hell']
GRAPHIT, GRAU, ROT, SCHWARZ, HELL = range(5)

# =====================================================================================
# Rumpf: Superellipsen-Spanten, lange Delfinnase, gerundetes Heck mit Rampe unten
# =====================================================================================
XN, XT, ZTIP = 16.0, 43.0, 11.2      # Beginn der Nasenrundung, Spitze, Höhe der Spitze
XR, XE = -35.5, -40.0                # Beginn der Heckrundung, Heckplatte
TBL = [  # x, halbe Breite, Oberkante, Unterkante, Exponent
    (-30.0, 8.0, 15.0, 4.0, 3.4), (-20.0, 9.0, 15.6, 3.9, 3.5), (-8.0, 9.3, 15.8, 3.9, 3.6), (4.0, 9.0, 15.7, 3.9, 3.5),
    (10.0, 8.3, 15.7, 4.0, 3.4), (16.0, 7.5, 15.7, 4.1, 3.3)]
_F = [pchip([r[0] for r in TBL], [r[k] for r in TBL], 0.0, 0.0) for k in range(1, 5)]
def base(x): return tuple(f(x) for f in _F)
def params(x):
    if x > XN:      # Delfinnase: Breite elliptisch, Oberseite lang auslaufend, Kinn voller
        e = min(1.0, (x - XN) / (XT - XN)); W0, zt0, zb0, n0 = base(XN)
        fw = (1 - e ** 1.3) ** (1 / 1.3); ft = (1 - e ** 1.25) ** (1 / 1.25); fb = (1 - e ** 1.45) ** (1 / 1.45)
        return W0 * fw, ZTIP + (zt0 - ZTIP) * ft, ZTIP - (ZTIP - zb0) * fb, n0 + (2.8 - n0) * e
    if x < XR:
        e = min(1.0, (XR - x) / (XR - XE)); g = 0.72 + 0.28 * math.sqrt(max(0.0, 1 - e ** 2))
        W0, zt0, zb0, n0 = base(XR); zc0 = zb0 + 0.48 * (zt0 - zb0)
        gb = g      # unten früher hoch: Platz für die schräge Rampe
        return W0 * g, zc0 + (zt0 - zc0) * g, zc0 - (zc0 - zb0) * gb, n0
    return base(x)
def zw(x): return 12.92 - 0.1 * (x - 30.0)      # Mitte des Sichtbands (fällt zur Spitze hin)
def win_mask(p, pad=0.0):
    if p.x < 25.6: return False
    return ((p.z - zw(p.x)) / (0.84 + pad)) ** 2 + (max(0.0, 27.4 - p.x) / (1.8 + pad)) ** 2 < 1.0
NRING = 192
DOOR_Y, DOOR_Z0 = 4.3, 6.4      # Heckklappe: halbe Breite, Unterkante (= Laderaumboden)
def door_z1(): return zc_of(XE) + 3.0
def hole_outline():      # Öffnung in der Heckplatte (etwas kleiner als die Klappe, damit die geschlossene Klappe sie deckt)
    return fillet([(-(DOOR_Y - 0.25), DOOR_Z0 + 0.12), (DOOR_Y - 0.25, DOOR_Z0 + 0.12), (DOOR_Y - 0.25, door_z1() - 0.25), (-(DOOR_Y - 0.25), door_z1() - 0.25)], 0.7, 10)
def ray_hit(poly, c, d):      # Schnitt des Strahls c + s·d mit dem geschlossenen Vieleck (kleinstes s > 0)
    best = None; n = len(poly)
    for i in range(n):
        a, b = Vector(poly[i]), Vector(poly[(i + 1) % n]); e = b - a; den = d.x * e.y - d.y * e.x
        if abs(den) < 1e-9: continue
        w = a - c; s = (w.x * e.y - w.y * e.x) / den; u = (w.x * d.y - w.y * d.x) / den
        if s > 0 and -1e-6 <= u <= 1 + 1e-6 and (best is None or s < best): best = s
    return c + d * best
def x_samples():
    xs = [XE + (XR - XE) * math.sin(k / 16 * PI / 2) for k in range(16)]
    x = XR
    while x < XN - 1e-6: xs.append(x); x += 0.5 if x < 12 else 0.25
    K = 120
    for k in range(K): xs.append(XN + (XT - XN) * math.sin(k / K * PI / 2))
    return sorted(set(round(v, 4) for v in xs))
def build_hull():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); XS = x_samples(); rings = []
    for x in XS: rings.append([bm.verts.new(hull_point(x, 2 * PI * k / NRING)) for k in range(NRING)])
    tip = bm.verts.new((XT, 0, ZTIP))
    faces = []
    for i in range(len(XS) - 1):
        for k in range(NRING):
            k2 = (k + 1) % NRING; f = bm.faces.new((rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2])); faces.append((f, i, k))
    for k in range(NRING):
        bm.faces.new((rings[-1][k], tip, rings[-1][(k + 1) % NRING])).material_index = SCHWARZ
    hp = hole_outline(); c0 = Vector((0.0, zc_of(XE))); H = []
    for k in range(NRING):
        t = 2 * PI * k / NRING; q = ray_hit(hp, c0, Vector((math.sin(t), math.cos(t)))); H.append(bm.verts.new((XE, q.x, q.y)))
    for k in range(NRING):
        bm.faces.new((rings[0][(k + 1) % NRING], H[(k + 1) % NRING], H[k], rings[0][k])).material_index = GRAPHIT
    for f, i, k in faces:
        xm = (XS[i] + XS[i + 1]) / 2; t = 2 * PI * (k + 0.5) / NRING; c = math.cos(t)
        if xm > 41.3: f.material_index = SCHWARZ
        elif c < -0.42: f.material_index = GRAU
        else: f.material_index = GRAPHIT
    vk = {}
    for i, r in enumerate(rings):
        for k, v in enumerate(r): vk[v] = (XS[i], k)
    for f, i, k in faces:
        ks = [vk[lp.vert][1] for lp in f.loops]; wrap = max(ks) - min(ks) > NRING // 2
        for lp in f.loops:
            x, kv = vk[lp.vert]
            if wrap and kv < NRING // 2: kv += NRING
            lp[uvl].uv = (x, 2 * PI * kv / NRING * 6.5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.normal_update()
    return bm, rings, XS, vk
def loops_of(edges):      # Randkanten zu geschlossenen Ketten von Punkten
    adj = {}
    for e in edges:
        a, b = e.verts; adj.setdefault(a, []).append(b); adj.setdefault(b, []).append(a)
    seen = set(); out = []
    for v0 in adj:
        if v0 in seen: continue
        chain = [v0]; seen.add(v0); prev, cur = None, v0
        while True:
            nx = [w for w in adj[cur] if w != prev and w not in seen]
            if not nx: break
            prev, cur = cur, nx[0]; chain.append(cur); seen.add(cur)
        if len(chain) > 8: out.append(chain)
    return out
def smooth_loop(pts, it=12):      # Punkte (x, t) glätten, geschlossen
    n = len(pts)
    for _ in range(it): pts = [((pts[i - 1][0] + 2 * pts[i][0] + pts[(i + 1) % n][0]) / 4, (pts[i - 1][1] + 2 * pts[i][1] + pts[(i + 1) % n][1]) / 4) for i in range(n)]
    return pts
def window_cut(bm, rings, XS, vk):
    dead = [f for f in bm.faces if win_mask(f.calc_center_median())]
    keep = set(dead)
    # Glas: dieselben Zellen, 4 cm nach innen versetzt (der Rahmen steht dann über)
    gb = bmesh.new(); vm = {}
    def gv(v):
        if v not in vm:
            if v not in vk: vm[v] = gb.verts.new(v.co - Vector((0.04, 0, 0))); return vm[v]
            x, k = vk[v]; t = 2 * PI * k / NRING; vm[v] = gb.verts.new(hull_point(x, t) - hull_normal(x, t) * 0.04)
        return vm[v]
    for f in dead: gb.faces.new([gv(v) for v in f.verts])
    edges = [e for e in bm.edges if sum(1 for f in e.link_faces if f in keep) == 1]
    chains = loops_of(edges)
    bmesh.ops.delete(bm, geom=dead, context='FACES')
    gb.normal_update()
    mesh_obj('Sichtband Glas', gb, ['sicht'], True, C_PART)
    paths = []
    for ch in chains:
        P = []
        for v in ch:
            x, k = vk[v]; t = 2 * PI * k / NRING
            if t > PI: t -= 2 * PI
            P.append((x, t))
        P = smooth_loop(P, 18)[::3]
        paths.append(P)
    return paths

# =====================================================================================
# Flügel: Knickflügel (oben am Rumpf, tief an den Gondeln, außen wieder hoch), Profil mit flacher Unterseite
# =====================================================================================
WY0, WY1 = 5.0, 31.5
_ZW = pchip([5.0, 10.0, 17.0, 23.0, 31.5], [13.0, 11.6, 9.2, 9.6, 11.6], 0.0, 0.0)
_TW = pchip([5.0, 10.0, 17.0, 23.0, 31.5], [5.2, 4.0, 2.6, 1.6, 0.8])
def xle(y): return 16.0 - 1.0 * (y - 5.0)
def xte(y): return -31.0 + 0.264 * (y - 5.0)
def wzm(y): return _ZW(abs(y))
def wth(y): return _TW(abs(y))
def foil(u): return 2.6 * math.sqrt(max(u, 0.0)) * (1 - u) + 0.025
def wing_point(y, u, upper=True):
    a = abs(y); x = xle(a) + (xte(a) - xle(a)) * u; t = wth(a); z = wzm(a) + (0.56 if upper else -0.44) * t * foil(u)
    return Vector((x, y, z))
def build_wing(s):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); NS, NC = 70, 40
    YS = [WY0 + (WY1 - WY0) * i / NS for i in range(NS + 1)]
    U = [(1 - math.cos(PI * i / NC)) / 2 for i in range(NC + 1)]
    R = []
    for y in YS:
        row = [wing_point(s * y, u, True) for u in U] + [wing_point(s * y, u, False) for u in reversed(U[1:-1])]
        R.append([bm.verts.new(p) for p in row])
    n = len(R[0])
    for i in range(NS):
        for k in range(n):
            k2 = (k + 1) % n; q = (R[i][k], R[i][k2], R[i + 1][k2], R[i + 1][k]); f = bm.faces.new(q if s < 0 else q[::-1])
            up = k < NC; u = U[k] if up else U[NC - (k - NC)] if k - NC <= NC else 0
            f.material_index = GRAPHIT if up else GRAU
            for lp in f.loops:
                co = lp.vert.co; lp[uvl].uv = (co.x, abs(co.y))
    c = bm.verts.new(sum((v.co for v in R[-1]), Vector()) / n)
    for k in range(n):
        q = (R[-1][k], R[-1][(k + 1) % n], c); f = bm.faces.new(q if s < 0 else q[::-1]); f.material_index = SCHWARZ
    bm.normal_update()
    up = [f for f in bm.faces if f.material_index == GRAPHIT]
    if sum(f.normal.z for f in up) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:]); bm.normal_update()
    return bm

# =====================================================================================
# Triebwerksgondeln im Flügelknick: ovale Superellipse, schräger Einlauf vorn, ovale Düse mit Leitschaufeln hinten
# =====================================================================================
NY, NZ, NW, NH = 17.0, 7.6, 3.7, 2.65
NX0, NX1 = 6.5, -31.0
_NS = pchip([-31.0, -29.5, -26.0, 2.0, 4.9, 5.9, 6.5], [0.9, 0.96, 1.0, 1.0, 0.97, 0.9, 0.86], 0.0, 0.0)
NEXP = 3.2
def nac_point(x, a, s):      # a = Winkel ab oben
    k = _NS(x); ca, sa = math.cos(a), math.sin(a); p = 2 / NEXP
    return Vector((x, s * NY + s * NW * k * math.copysign(abs(sa) ** p, sa), NZ + NH * k * math.copysign(abs(ca) ** p, ca)))
def build_nacelle(s):
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); NA = 96
    XS = sorted(set([round(NX1 + (NX0 - NX1) * i / 90, 4) for i in range(91)]))
    R = [[bm.verts.new(nac_point(x, 2 * PI * a / NA, s)) for a in range(NA)] for x in XS]
    for i in range(len(XS) - 1):
        xm = (XS[i] + XS[i + 1]) / 2
        for a in range(NA):
            a2 = (a + 1) % NA; q = (R[i][a], R[i][a2], R[i + 1][a2], R[i + 1][a]); f = bm.faces.new(q if s > 0 else q[::-1])
            ang = 2 * PI * (a + 0.5) / NA; ca = math.cos(ang)
            f.material_index = ROT if 4.45 < xm < 4.85 else (GRAU if ca < -0.35 else GRAPHIT)
            for lp, (ii, aa) in zip(f.loops, ((i, a), (i, a + 1), (i + 1, a + 1), (i + 1, a)) if s > 0 else ((i + 1, a), (i + 1, a + 1), (i, a + 1), (i, a))):
                lp[uvl].uv = (XS[ii], 2 * PI * aa / NA * 3.2)
    bm.normal_update()
    return bm
def oval_ring(name, x, k, w, h, m, s, n=96, dk=0.0):      # Band auf dem Oval der Gondel bei x (Maßstab k)
    P = []; Nn = []
    for i in range(n):
        a = 2 * PI * i / n; p = nac_point(x, a, s); c = Vector((x, s * NY, NZ)); q = c + (p - c) * (k / _NS(x)) ; P.append(q)
        d = (q - c); d.x = 0; Nn.append(d.normalized())
    ob = strip_mesh(name, P, Nn, w, h, m, True, 0.0, C_PART)
    me = ob.data; c0 = me.polygons[0]
    if c0.normal.dot(Nn[0]) < 0 and s > 0: me.flip_normals()
    return ob
def oval_loft(name, sections, m, s, cap=None, inward=False):      # sections: (x, Maßstab); Röhre entlang x mit dem Gondeloval
    bm = bmesh.new(); NA = 96; R = []
    for x, k in sections:
        R.append([bm.verts.new(Vector((x, s * NY, NZ)) + (nac_point(-10.0, 2 * PI * a / NA, s) - Vector((-10.0, s * NY, NZ))) * k) for a in range(NA)])
    for i in range(len(R) - 1):
        for a in range(NA):
            q = (R[i][a], R[i][(a + 1) % NA], R[i + 1][(a + 1) % NA], R[i + 1][a]); bm.faces.new(q if (s > 0) != inward else q[::-1])
    if cap is not None:
        f = bm.faces.new(R[-1] if (s > 0) != inward else R[-1][::-1]); f.material_index = 1
    bm.normal_update()
    return mesh_obj(name, bm, m if isinstance(m, list) else [m], True, C_PART)
def nacelle_parts(s):
    yc = s * NY
    # Einlauf: Lippe, nach innen laufender dunkler Kanal, Trennwand, Verdichter mit zwei Laufrädern, Gitter
    oval_ring('Einlasslippe', NX0, 0.86, 0.16, 0.12, M['g_grau'], s)
    oval_loft('Einlasskanal', [(NX0, 0.84), (NX0 - 1.2, 0.8), (NX0 - 3.2, 0.76)], ['dunkel', 'dunkel'], s, cap=True, inward=True)
    slab('Einlasstrennwand', (NX0 - 1.4, yc, NZ), (1, 0, 0), (0, 1, 0), (2.8, 0.18, NH * 1.55), M['g_graphit'], 0.03)
    for dy in (-1.45, 1.45):
        with Part('Verdichter', T(NX0 - 3.1, yc + dy, NZ), C_PART):
            cyl('Nabe', 0.42, 0.7, 0.2, 0, 0, M['g_hell'], 'X', n=32, r2=0.06)
            ring('Nabenring', 0.43, 0.03, (-0.1, 0, 0), (1, 0, 0), M['g_rot'], 32)
            for k in range(18):
                a = 2 * PI * k / 18; ob = box('Schaufel', 0.3, 0.04, 0.95, 0, 0, 0, M['mittel'], 0.006)
                ob.matrix_basis = RX(a) @ Matrix.Translation((0, 0, 0.9)) @ RZ(0.55)
    for k in range(7): slab('Einlassgitter', (NX0 - 0.25, yc, NZ - 1.95 + k * 0.65), (1, 0, 0), (0, 1, 0), (0.06, NW * 1.55, 0.05), M['mittel'], 0.004)
    # Düse: Kragen, kurze Verengung, dunkler Schacht mit Glut, sieben senkrechte Leitschaufeln, Klappen oben und unten
    oval_ring('Duesenkragen', NX1, 0.905, 0.2, 0.12, M['g_grau'], s)
    oval_loft('Duesenmantel', [(NX1, 0.9), (NX1 - 1.4, 0.84), (NX1 - 1.9, 0.82)], ['duese'], s)
    oval_loft('Duesenschacht', [(NX1 - 1.9, 0.8), (NX1 - 0.6, 0.7), (NX1 + 1.2, 0.62)], ['dunkel', 'glut'], s, cap=True, inward=True)
    for k in range(7):
        y = yc + (k - 3) * NW * 0.22
        slab('Leitschaufel', (NX1 - 1.1, y, NZ), (1, 0, 0), (0, 1, 0), (1.5, 0.07, NH * 1.35), M['duese'], 0.01)
    for sg in (1, -1):
        slab('Duesenklappe', (NX1 - 2.2, yc, NZ + sg * NH * 0.8), (1, 0, -sg * 0.12), (0, 1, 0), (1.6, NW * 1.4, 0.08), M['duese'], 0.012)
        for dy in (-1.2, 1.2): rod('Klappenzylinder', (NX1 - 0.4, yc + dy, NZ + sg * NH * 0.92), (NX1 - 1.8, yc + dy, NZ + sg * NH * 0.84), 0.09, M['mittel'], 16)
    # Kühlringe und Klappen am Heck der Gondel
    for k in range(3): oval_ring('Kuehlring', NX1 + 0.9 + k * 0.5, 0.965 + 0.002, 0.05, 0.04, M['mittel'], s)
    sphere('Positionslicht', 0.14, NX1 + 1.5, yc + s * (NW * 0.96 + 0.05), NZ, M['nav_r' if s > 0 else 'nav_g'], 14)
    ANCH['duese%d' % s] = Vector((NX1 - 2.0, yc, NZ)); ANCH['einlass%d' % s] = Vector((NX0, yc, NZ))

# =====================================================================================
# Endscheiben an den Flügelspitzen und Leitwerke am Heck
# =====================================================================================
def fin_plate(name, mw, outline, th, m, edge_m, tip_light=None, hinge=None):
    with Part(name, mw, C_PART) as e:
        out = fillet(outline, 0.6, 8)
        prism('Scheibe', [(p[0], p[1]) for p in out], -th / 2, th / 2, M[m], 'Y', 0.04)
        n = len(outline); best = max(range(n), key=lambda i: outline[i][0] + outline[(i + 1) % n][0])
        a, b = Vector((*outline[best], 0)), Vector((*outline[(best + 1) % n], 0))
        for sg in (1, -1):
            pass
        rod('Vorderkante', Vector((a.x, 0, a.y)), Vector((b.x, 0, b.y)), th * 0.62, M[edge_m], 16)
        if hinge is not None:
            for sg in (1, -1): slab('Faltfuge', (hinge[0], sg * (th / 2 + 0.003), hinge[1]), (1, 0, 0), (0, 0, 1), (hinge[2], 0.012, 0.04), M['fuge'], 0)
        if tip_light: sphere('Blitzlicht', 0.16, *tip_light, M['blitz'], 12)
    return e
def fins():
    for s in (1, -1):
        # Endscheibe: hoch über und kurz unter der Flügelspitze, leicht nach außen geneigt, Faltfuge an der Flügelkante
        z0 = wzm(WY1); xm = (xle(WY1) + xte(WY1)) / 2
        mw = T(xm, s * (WY1 + 0.32), z0) @ RX(-s * math.radians(7))
        out = [(5.2, -5.4), (3.0, 7.8), (-1.2, 8.4), (-5.6, 7.2), (-6.4, -4.2), (-3.6, -6.2), (2.8, -6.6)]
        fin_plate('Endscheibe', mw, out, 0.62, 'g_graphit', 'g_rot', (-1.4, 0, 8.45), (0, 0.0, 10.0))
        with Part('Endscheibenstreifen', mw, C_PART):
            for k, z in enumerate((5.6, 6.1)): slab('Signalstreifen', (-2.2, s * 0.32, z), (1, 0, 0), (0, 0, 1), (6.0 - k * 0.6, 0.012, 0.18), M['g_rot'], 0)
            slab('Signalstreifen', (-2.2, s * 0.32, 4.9), (1, 0, 0), (0, 0, 1), (6.4, 0.012, 0.06), M['g_hell'], 0)
        # Heckleitwerke: schräg nach außen auf dem Rücken
        x0 = -27.5; zt = params(x0 - 4)[1]
        mw = T(x0 - 5.0, s * 3.2, zt - 0.4) @ RX(-s * math.radians(28))
        out = [(5.0, 0.0), (0.6, 5.6), (-2.8, 6.4), (-6.2, 6.0), (-5.6, 0.0)]
        fin_plate('Heckleitwerk', mw, out, 0.5, 'g_graphit', 'g_rot', (-4.5, 0, 6.3))
    ANCH['endscheibe'] = Vector((xle(WY1) - 3, WY1 + 0.5, wzm(WY1) + 7))

# =====================================================================================
# Bänder, Klappen, Fenster, Lichter, Schrift
# =====================================================================================
def hull_details(paths):
    for P in paths:      # Rahmen um das Sichtband, Mittelsteg und Streben
        hull_band('Sichtbandrahmen', P, 0.2, 0.09, M['g_schwarz'], True, 0.004)
    for xs in (28.4, 31.0, 33.6, 36.2):      # senkrechte Streben im Sichtband (beidseits) und Mittelsteg über der Nase
        for s in (1, -1):
            zc = zw(xs); t0, t1 = t_for_z(xs, zc + 0.9, s), t_for_z(xs, zc - 0.9, s)
            if abs(t1 - t0) > 0.02: hull_band('Sichtbandstrebe', [(xs, t0 + (t1 - t0) * i / 10) for i in range(11)], 0.07, 0.07, M['g_schwarz'], False, 0.006)
    xs0 = next(x for x in [30.0 + i * 0.05 for i in range(240)] if params(x)[1] < zw(x) + 0.86)
    hull_band('Mittelsteg', [(xs0 - 0.3 + i * 0.15, 0.0) for i in range(int((41.6 - xs0) / 0.15))], 0.09, 0.08, M['g_schwarz'], False, 0.006)
    # rote Zierlinie längs der Flanke, Hellgraues Band über dem Kinn, Wülste an den Abschnitten
    for s in (1, -1):
        path = []
        for i in range(120):
            x = -36.0 + i * (40.0 / 119); path.append((x, t_for_z(x, zc_of(x) + 0.6, s)))
        hull_band('Zierlinie', path, 0.06, 0.012, M['g_rot'], False, 0.003)
        path = []
        for i in range(60):
            x = 4.0 + i * (34.0 / 59); path.append((x, t_for_z(x, zc_of(x) - 0.6 - 0.04 * max(0.0, x - 24), s)))
        hull_band('Kinnlinie', path, 0.035, 0.01, M['g_hell'], False, 0.003)
    for s in (1, -1):      # Seitenleiste (harte Kante längs der Flanke) und aufgesetzte Panzerplatten mit Rahmen
        hull_band('Seitenleiste', [(x, t_for_z(x, zc_of(x) - 1.25, s)) for x in [38.0 - i * 0.5 for i in range(130)]], 0.26, 0.2, M['g_graphit'], False, 0.004)
        for x0, x1, z0, z1 in ((-26.0, -15.0, 5.6, 8.6), (-13.0, -3.0, 5.6, 8.6), (-1.0, 9.0, 5.6, 8.6)):
            side_patch('Panzerplatte', x0, x1, z0, z1, 0.6, s, 0.06, M['p_grau'], 10, 22, C_PART)
            side_frame('Panzerrahmen', x0, x1, z0, z1, 0.6, s, 0.05, 0.08, M['g_schwarz'], C_PART)
    for x, m in ((24.0, 'g_schwarz'), (6.0, 'g_schwarz'), (-12.0, 'g_schwarz'), (-29.5, 'g_schwarz')):
        hull_band('Hauptfuge', [(x, 2 * PI * i / 160) for i in range(160)], 0.03, 0.02, M[m], True, 0.003)
    # Bullaugen Oberdeck (Mannschaftsgang), runde Rechtecke an beiden Seiten
    for s in (1, -1):
        for k in range(6):
            x0 = 8.0 + k * 2.6; z = 13.4
            side_patch('Bullauge', x0, x0 + 0.9, z - 0.28, z + 0.28, 0.24, s, 0.006, M['fenster'], 6, 8, C_PART)
            side_frame('Bullaugenrahmen', x0 - 0.05, x0 + 0.95, z - 0.33, z + 0.33, 0.27, s, 0.06, 0.06, M['g_schwarz'], C_PART)
    # Klappen: große Wartungsklappen, Ladeluke vorn an der Seite
    for s in (1, -1):
        side_frame('Seitenluke', 12.0, 15.6, 5.4, 9.2, 0.5, s, 0.07, 0.05, M['g_schwarz'], C_PART)
        side_patch('Lukenwarnfeld', 12.1, 15.5, 5.45, 5.75, 0.08, s, 0.004, M['warnrw'], 2, 10, C_PART)
        for x0 in (-5.0, -18.0):
            side_frame('Wartungsklappe', x0, x0 + 2.2, 6.0, 7.6, 0.25, s, 0.04, 0.03, M['g_schwarz'], C_PART)
    ANCH['sichtband'] = hull_point(33.0, 0.55)

def rcs_block(name, mw):
    with Part(name, mw, C_PART):
        slab('Block', (0, 0, 0.18), (1, 0, 0), (0, 1, 0), (1.3, 0.9, 0.36), M['g_grau'], 0.05)
        for dx, dy, ax in ((0.0, 0.0, 'Z'), (0.66, 0, 'X'), (-0.66, 0, 'X')):
            cyl('Steuerduese', 0.09, 0.14, dx, dy, 0.4 if ax == 'Z' else 0.18, M['duese'], ax, n=14, r2=0.12)
def lights_misc():
    for s in (1, -1):
        sphere('Positionslicht', 0.18, xte(WY1) + 1.0, s * (WY1 - 0.4), wzm(WY1), M['nav_r' if s > 0 else 'nav_g'], 14)
        rcs_block('Steuerduesen', place(22.0, s * 1.05))
        rcs_block('Steuerduesen', place(-33.0, s * 1.4))
        rcs_block('Steuerduesen unten', place(-25.0, s * 2.6))
    for x in (20.0, -2.0, -22.0): sphere('Blitzlicht oben', 0.14, x, 0, params(x)[1] + 0.06, M['blitz'], 12)
    for x in (16.0, -10.0): sphere('Warnlicht unten', 0.14, x, 0, params(x)[2] - 0.06, M['nav_r'], 12)
    # Landescheinwerfer unter der Nase
    for s in (1, -1):
        with Part('Scheinwerfer', place(34.0, s * 2.55), C_PART):
            slab('Gehaeuse', (0, 0, 0.05), (1, 0, 0), (0, 1, 0), (0.8, 0.45, 0.12), M['g_schwarz'], 0.03); slab('Lampe', (0, 0, 0.11), (1, 0, 0), (0, 1, 0), (0.62, 0.3, 0.02), M['e_white'], 0)
def markings():
    W = bpy.data.objects
    for s in (1, -1):
        p = hull_point(17.0, s * 1.62); n = hull_normal(17.0, s * 1.62)
        up = Vector((0, 0, 1)) - n * n.z
        CUR[0] = C_DECAL
        o = text('WISENT', 1.1, p + n * 0.02, Vector((-s, 0, 0)), up, M['g_hell'], align='CENTER', name='Schriftzug')
        dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        ob = link(bpy.data.objects.new('Schriftzug', me)); ob.matrix_world = o.matrix_world.copy(); bpy.data.objects.remove(o, do_unlink=True)
        sw = ob.modifiers.new('Auflegen', 'SHRINKWRAP'); sw.target = W['Rumpf']; sw.offset = 0.012; sw.wrap_mode = 'OUTSIDE_SURFACE'
        p = hull_point(-24.0, s * 1.1); n = hull_normal(-24.0, s * 1.1)
        emblem(tuple(p + n * 0.02), (-s, 0, 0), tuple(Vector((0, 0, 1)) - n * n.z), 1.1, M['g_hell'])
        stencil('WS 12', 2.4, xle(24.0) - 9.5, s * 24.0, 1, (0, s, 0), 'txtw', target=W['Fluegel ' + ('links' if s > 0 else 'rechts')])

# =====================================================================================
# Bühnen: graues Studio (aus dem Würger, Hangar ausgeblendet), Weltraum mit Planet, Wüste mit Dunst
# =====================================================================================
def stages_wisent():
    stages()
    for o in list(C_HANGAR.all_objects): bpy.data.objects.remove(o, do_unlink=True)
    fo = STAGE['fill']; fo.location = (-140, -110, 110); fo.data.size = 90; fo.rotation_euler = (Vector((0, 0, 8)) - fo.location).to_track_quat('-Z', 'Y').to_euler()
    pl = STAGE['planet']; d = (Vector((0, 0, 8)) - Vector((95, -70, 34))).normalized(); pc = Vector((0, 0, 8)) + d * 9000 + Vector((0, 0, -3600))
    pl.location = pc; pl.scale = (3.6, 3.6, 3.6)
    p2 = pl.copy(); C_STU.objects.link(p2); p2.location = (21000, -4200, -10400); p2.hide_render = True; STAGE['planet2'] = p2
    # Wüste: weiter Boden mit Dünenrelief und Felsrippen, Dunst als Volumen, tiefstehende Sonne
    CUR[0] = C_STU
    dm = bpy.data.materials.new('Wuestenboden'); dm.use_nodes = True; N = dm.node_tree.nodes; K = dm.node_tree.links
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); tc = N.new('ShaderNodeTexCoord')
    def nz(sc, det, rough=0.55):
        q = N.new('ShaderNodeTexNoise'); q.inputs['Scale'].default_value = sc; q.inputs['Detail'].default_value = det; q.inputs['Roughness'].default_value = rough
        K.new(tc.outputs['Object'], q.inputs['Vector']); return q.outputs[0]
    cr = N.new('ShaderNodeValToRGB'); E = cr.color_ramp.elements; E[0].position, E[0].color = 0.35, (0.19, 0.13, 0.085, 1); E[1].position, E[1].color = 0.7, (0.36, 0.26, 0.17, 1)
    K.new(nz(0.02, 8), cr.inputs[0]); K.new(cr.outputs[0], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.92
    bp = N.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.35; bp.inputs['Distance'].default_value = 0.08; K.new(nz(0.9, 10, 0.7), bp.inputs['Height']); K.new(bp.outputs[0], b.inputs['Normal'])
    bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=240, y_segments=240, size=900)
    rnd = random.Random(4)
    for v in bm.verts:
        x, y = v.co.x, v.co.y; r = math.hypot(x, y)
        h = 3.5 * math.sin(x * 0.011 + y * 0.004) * math.sin(y * 0.009 - x * 0.002) + 1.2 * math.sin(x * 0.037 + 1.3) * math.cos(y * 0.031)
        v.co.z = h * min(1.0, max(0.0, (r - 70) / 120)) - 0.02
    me = bpy.data.meshes.new('Wueste'); bm.to_mesh(me); bm.free(); me.materials.append(dm)
    for p in me.polygons: p.use_smooth = True
    STAGE['wueste'] = link(bpy.data.objects.new('Wueste', me)); STAGE['wueste'].hide_render = True
    for k in range(26):      # Felsrippen in der Ferne
        r = random.Random(k + 11); a = r.uniform(-1.2, 2.6); dist = r.uniform(170, 520)
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.0)
        for v in bm.verts: v.co *= r.uniform(0.8, 1.15)
        me = bpy.data.meshes.new('Felsrippe'); bm.to_mesh(me); bm.free(); me.materials.append(M['felsen'] if 'felsen' in M else dm)
        ob = link(bpy.data.objects.new('Felsrippe', me)); ob.location = (math.cos(a) * dist - 40, math.sin(a) * dist, -2); ob.scale = (r.uniform(14, 40), r.uniform(8, 20), r.uniform(5, 18)); ob.rotation_euler = (0, 0, r.uniform(0, 3))
        STAGE.setdefault('felsen', []).append(ob); ob.hide_render = True
    vm = bpy.data.materials.new('Dunst'); vm.use_nodes = True; N = vm.node_tree.nodes; K = vm.node_tree.links
    for n in list(N): N.remove(n)
    vo = N.new('ShaderNodeVolumePrincipled'); vo.inputs['Color'].default_value = (0.75, 0.6, 0.45, 1); vo.inputs['Density'].default_value = 0.0016
    out = N.new('ShaderNodeOutputMaterial'); K.new(vo.outputs[0], out.inputs['Volume'])
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); me = bpy.data.meshes.new('Dunst'); bm.to_mesh(me); bm.free(); me.materials.append(vm)
    hz = link(bpy.data.objects.new('Dunst', me)); hz.scale = (1600, 1600, 140); hz.location = (0, 0, 60); hz.hide_render = True; STAGE['dunst'] = hz
def world_wisent(kind):
    if kind != 'wueste': return world(kind)
    w = STAGE['world']; nt = w.node_tree; N = nt.nodes; K = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputWorld'); sky = N.new('ShaderNodeTexSky'); bg = N.new('ShaderNodeBackground')
    try:
        sky.sky_type = 'NISHITA'; sky.sun_elevation = math.radians(16); sky.sun_rotation = math.radians(205); sky.altitude = 800; sky.air_density = 1.6; sky.dust_density = 4.0
    except Exception: pass
    K.new(sky.outputs[0], bg.inputs[0]); bg.inputs['Strength'].default_value = 0.32; K.new(bg.outputs[0], out.inputs[0])
VIEWS.update({
    'schraeg': ('Schraeg', 'grau', True, 0.1, 0.0), 'draufsicht': ('Draufsicht', 'grau', True, 0.3, 0.0), 'seite': ('Seite', 'grau', True, 0.8, 0.0),
    'front': ('Front', 'grau', True, 0.7, 0.0), 'heck': ('Heck', 'grau', True, 0.3, 0.0), 'weltraum': ('Weltraum', 'weltraum', False, 0.2, 6.0),
    'wueste': ('Wueste', 'wueste', True, 0.0, 1.5), 'nase': ('Nase', 'grau', True, 0.2, 0.0), 'detail': ('Detail', 'grau', True, 0.2, 0.0),
})
for k in ('hangar', 'cockpit'): VIEWS.pop(k, None)
def view(name, path, res=(1600, 900)):
    camn, stage, gear_on, ex, glow = VIEWS[name]
    world_wisent(stage)
    offen = name in ('laderaum', 'laderaum2', 'rampe')
    SC.frame_set(RAMP_F if offen and 'RAMP_F' in globals() else 1)      # Heckklappe: Bild 1 zu, RAMP_F offen (wis_rampe.py)
    for o in C_GRAU.all_objects: o.hide_render = stage != 'grau'
    for o in C_GEAR.all_objects: o.hide_render = not gear_on
    for k in ('wueste', 'dunst'): STAGE[k].hide_render = stage != 'wueste'
    for o in STAGE.get('felsen', []): o.hide_render = stage != 'wueste'
    STAGE['planet'].hide_render = stage != 'weltraum' or name.startswith('bruecke')
    if 'planet2' in STAGE: STAGE['planet2'].hide_render = not name.startswith('bruecke')
    sun = STAGE['sun']
    if stage == 'wueste': sun.rotation_euler = (math.radians(74), 0, math.radians(205 + 90)); sun.data.energy = 4.2; sun.data.color = (1.0, 0.86, 0.7)
    else: sun.rotation_euler = (math.radians(52), 0, math.radians(150)); sun.data.color = (1, 1, 1); sun.data.energy = {'grau': 3.4, 'weltraum': 4.0}.get(stage, 3.0)
    STAGE['fill'].data.energy = {'grau': 900000, 'weltraum': 500000, 'wueste': 120000}.get(stage, 0)
    M['glut'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = glow
    for o in bpy.data.objects:
        if o.name.startswith('Sichtband Glas'): o.hide_render = name in ('bruecke', 'bruecke2', 'bruecke3')
    SC.view_settings.exposure = ex
    SC.camera = CAMS[camn]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = 100
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)

def place_cams():
    for nm, loc, tgt, lens in (('Schraeg', (78, 60, 30), (-2, 0, 9), 45), ('Heck', (-82, -58, 26), (-12, 0, 9), 40), ('Weltraum', (95, -70, 34), (-2, 0, 9), 42),
                               ('Detail', (10, 34, 24), (-4, 14, 9), 35)):
        c = CAMS[nm]; c.location = loc; c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lens; c.data.clip_end = 30000
    CAMS['Seite'].location = (0, 200, 9.5); CAMS['Seite'].data.ortho_scale = 92
    CAMS['Front'].location = (200, 0, 9.5); CAMS['Front'].data.ortho_scale = 72
    CAMS['Draufsicht'].location = (0, 0, 200); CAMS['Draufsicht'].data.ortho_scale = 150; CAMS['Draufsicht'].rotation_euler = (0, 0, -PI / 2)
    for c in CAMS.values(): c.data.clip_end = 30000
    cam('Wueste', (64, -46, 6.5), (0, 0, 10.5), 32)
    cam('Nase', (58, 18, 16), (32, 0, 11), 38)
    for nm in ('Figur Studio',):
        if nm in bpy.data.objects:
            o = bpy.data.objects[nm]; o.location = (30.0, 9.0, 0); o.rotation_euler = (0, 0, -2.4)

HULL_GRID = {}
def build():
    global BVH
    hull, rings, XS, vk = build_hull(); wl, wr = build_wing(1), build_wing(-1); nl, nr = build_nacelle(1), build_nacelle(-1)
    BVH = make_bvh([hull, wl, wr, nl, nr])
    paths = window_cut(hull, rings, XS, vk)
    mesh_obj('Rumpf', hull, HULL_MATS, True, C_HULL)
    for s, bm in ((1, wl), (-1, wr)): mesh_obj('Fluegel ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_HULL)
    for s, bm in ((1, nl), (-1, nr)): mesh_obj('Gondel ' + ('links' if s > 0 else 'rechts'), bm, HULL_MATS, True, C_HULL)
    for s in (1, -1): nacelle_parts(s)
    fins(); hull_details(paths); lights_misc()
    for nm in ('wis_waffen.py', 'wis_bruecke.py', 'wis_raeume.py', 'wis_rampe.py'):
        p = os.path.join(HERE_W, nm)
        if os.path.exists(p): exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), globals())
    stages_wisent(); markings(); world('grau'); place_cams()
    js = lambda v: [round(c, 3) for c in v] if isinstance(v, Vector) else ({k: js(w) for k, w in v.items()} if isinstance(v, dict) else ([js(w) for w in v] if isinstance(v, (list, tuple)) else v))
    open(os.path.join(HERE_W, 'wis-anker.json'), 'w', encoding='utf-8').write(json.dumps({k: js(v) for k, v in ANCH.items()}, indent=1))      # Punkte fürs Spiel (Blender-Koordinaten)
    return {'ringe': len(XS), 'sichtband': len(paths)}
if not globals().get('NUR_HELFER_WISENT'):
    result = build()
