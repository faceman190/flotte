# Möwe: Innenraum (wird von moe_kit.py in build() ausgeführt, mit dessen Namensraum).
# Grundsätze wie beim Kranich (Nutzer: „alles im Modell passen, den kompletten Raum innen ausnutzen, keine Lücken lassen“):
#  - Innenhaut = Rumpf um D_IN nach innen versetzt; Boden mit dem genauen Umriss der Haut; alles schließt an Haut, Boden oder Futter an.
# Räume:
#  Laderaum   Boden FL 2,4 von der Heckrampe (Gelenk x −14,25) bis zur schrägen Bugrampe (x 15,2 unten / 13,0 oben), Decke 8,33 m:
#             Durchfahrt für zwei Dachs hintereinander (Fahrgasse ±2,0 m), seitlich Kistenbahnen, vier Fahrwerkskästen als Höcker an den
#             Wänden, Spanten, Netze, Deckenlichter, Spinde, Rampenpult; Futter an der schrägen Bugplatte und über der Heckschräge.
#  Treppe     45° an der Backbordwand (y 2,1 … 3,1) von x 3,15 hinauf durch das Dachloch (x 7,0 … 9,3) in die Kabine.
#  Kabine     im Cockpit-Aufbau auf dem Rumpfdach, Boden 8,55 m, x 7,0 … 13,0: sechs Klappsitze an den Wänden (je drei, zur Mitte),
#             Gepäckfächer, Schreibplatz; vorn eine Stufe hinunter (0,4 m) ins Cockpit (moe_cockpit.py, Boden 8,15 m über der Haube).
import bpy, bmesh, math
from mathutils import Vector, Matrix
_idk = os.path.join(HIER, '..', 'innen', 'innen_detail.py')
exec(compile(open(_idk, encoding='utf-8').read(), 'innen_detail.py', 'exec'), globals())

M['i_wand'] = mk('Innenwand hell', (0.2, 0.205, 0.205), 0.15, 0.55, var=0.06, scale=3.0, bump=0.12, wear=0.25)
M['i_feld'] = mk('Innenfeld', (0.15, 0.158, 0.165), 0.2, 0.5, var=0.08, scale=3.0, bump=0.12, wear=0.3)
M['i_dunkel'] = mk('Innenwand dunkel', (0.035, 0.037, 0.04), 0.3, 0.5, var=0.08, scale=3.0, bump=0.15, wear=0.4)
M['i_rahmen'] = mk('Innenrahmen', (0.06, 0.064, 0.07), 0.65, 0.4, var=0.1, scale=4.0, wear=0.5)
M['i_boden'] = mk('Innenboden', (0.045, 0.047, 0.05), 0.55, 0.45, var=0.15, scale=4.0, bump=0.4, bscale=200, wear=0.9)
M['i_boden2'] = mk('Bodenplatte hell', (0.085, 0.088, 0.093), 0.5, 0.45, var=0.12, scale=4.0, bump=0.3, bscale=200, wear=0.8)
M['i_fuge'] = mk('Bodenfuge', (0.01, 0.01, 0.011), 0.4, 0.6, var=0.0, rvar=0.0, grime=False)
M['i_gitter'] = mk('Gitterrost', (0.07, 0.072, 0.076), 0.8, 0.4, var=0.1, scale=4.0, wear=0.7)
M['i_schacht'] = mk('Schacht', (0.012, 0.012, 0.013), 0.3, 0.7, var=0.05, grime=False)
M['i_polster'] = mk('Polster', (0.05, 0.052, 0.056), 0.0, 0.85, var=0.12, scale=6.0, bump=0.5, bscale=120)
M['i_gurt'] = mk('Gurtband', (0.32, 0.22, 0.02), 0.0, 0.8, var=0.1, scale=6.0, bump=0.3, bscale=160)
M['i_rot'] = mk('Lack rot', (0.3, 0.02, 0.015), 0.25, 0.42, var=0.1, wear=0.6)
M['i_licht'] = mk('Deckenlicht', (0.9, 0.95, 1.0), 0, 0.3, var=0, rvar=0, emit=(0.92, 0.96, 1.0), es=6.0, grime=False)
M['i_warm'] = mk('Ambientlicht', (1.0, 0.6, 0.3), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.55, 0.22), es=4.0, grime=False)
M['i_petrol'] = mk('Licht petrol', (0.2, 0.9, 0.85), 0, 0.3, var=0, rvar=0, emit=(0.25, 0.95, 0.9), es=4.0, grime=False)
M['i_stahl'] = mk('Stahl blank', (0.5, 0.51, 0.53), 1.0, 0.25, var=0.05, grime=False)
M['i_schrank'] = mk('Schrank', (0.2, 0.205, 0.21), 0.3, 0.45, var=0.06, scale=3.0, wear=0.3)
M['i_bild'] = M['mfd']
C_IN = C_ROOM
D_IN = 0.17                      # Wandstärke: Abstand Innenhaut – Außenhaut
ZK = ZT + 0.05                   # Kabinenboden (auf dem Rumpfdach)
ZC = KB0 + 0.15                  # Cockpitboden (über der Haube)
XK1 = XB                         # Stufe Kabine → Cockpit (Ende des Rumpfdachs)
GASSE = 2.0                      # halbe Fahrgasse im Laderaum (Dachs 3,8 m breit)
TR_Y = (2.1, 3.1)                # Treppe (Wangen innen)
TR_X0 = TREPPE[1] - (ZK - FL)    # 45°: Fuß der Treppe
ANCH['raum'] = {}

# ---------- Innenhaut ----------
def ipt(x, t, d=D_IN): return hull_point(x, t) - hull_normal(x, t) * d
def t_at(x, z, s=1, d=D_IN):
    """Winkel auf der Seite s, an dem die Innenhaut die Höhe z hat (von oben t = 0 bis unten t = PI)"""
    lo, hi = 0.0, PI
    if ipt(x, 0.0, d).z < z: return 0.0
    for _ in range(36):
        m = (lo + hi) / 2
        if ipt(x, s * m, d).z > z: lo = m
        else: hi = m
    return s * (lo + hi) / 2
def half_w(x, z, d=D_IN): return abs(ipt(x, t_at(x, z, 1, d), d).y)
def wmin(x0, x1, z0, z1, nz=6):
    """kleinste halbe Breite der Innenhaut zwischen x0 und x1, z0 und z1 (im Hals zieht der Rumpf unten stark ein: Möbel dort nach innen)"""
    return min(half_w(x, z0 + (z1 - z0) * k / nz) for x in (x0, (x0 + x1) / 2, x1) for k in range(nz + 1))
def wandkasten(name, x0, x1, yi, z0, z1, s, m, nz=10):
    """Kasten von yi bis an die Innenhaut (Seite s), die Außenkante folgt der Rumpfform 5 cm in die Wand hinein: keine Lücke, nichts sticht durch"""
    zs = [z0 + (z1 - z0) * k / nz for k in range(nz + 1)]
    pts = [(yi, z0)] + [(min(half_w(x, z) for x in (x0, (x0 + x1) / 2, x1)) + 0.05, z) for z in zs] + [(yi, z1)]
    return prism(name, [(s * y, z) for y, z in pts], x0, x1, m, 'X', 0.006)
def schale(name, x0, x1, zfl, m, loch=None, nt=56, dx=0.12, col=None):
    """Innenhaut zwischen x0 und x1 oberhalb des Bodens zfl(x); Flächen zeigen nach innen. loch(c): Fläche weglassen (Fenster)"""
    bm = bmesh.new(); n = max(2, int(abs(x1 - x0) / dx)); R = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n; tf = abs(t_at(x, zfl(x))); row = []
        for j in range(nt + 1): row.append(bm.verts.new(ipt(x, -tf + 2 * tf * j / nt)))
        R.append(row)
    for i in range(n):
        for j in range(nt):
            q = (R[i][j], R[i][j + 1], R[i + 1][j + 1], R[i + 1][j])
            if loch:
                c = sum((v.co for v in q), Vector()) / 4
                if loch(c): continue
            bm.faces.new(q)
    bm.normal_update()
    # nach innen: Normale zeigt zur Achse
    sc = 0
    for f in bm.faces[:40]:
        c = f.calc_center_median(); sc += f.normal.dot(Vector((0, -c.y, zc_of(c.x) - c.z)))
    if sc < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return mesh_obj(name, bm, [m], True, col or C_IN)
def boden_umriss(name, x0, x1, z, m, dx=0.1, col=None):
    """Bodengrund mit dem genauen Umriss der Innenhaut auf Höhe z (schließt lückenlos an die Wand)"""
    bm = bmesh.new(); n = max(2, int(abs(x1 - x0) / dx)); L = []; Rr = []
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n; w = half_w(x, z); L.append(bm.verts.new((x, w, z))); Rr.append(bm.verts.new((x, -w, z)))
    for i in range(n): bm.faces.new((Rr[i], Rr[i + 1], L[i + 1], L[i]))
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return mesh_obj(name, bm, [m], False, col or C_IN)
def querschnitt(x, z0, d=D_IN, nt=64, ztop=None):
    """Umriss der Innenhaut bei x oberhalb von z0 als (y, z), gegen den Uhrzeigersinn von der Seite gesehen"""
    tf = abs(t_at(x, z0, 1, d)); pts = []
    for j in range(nt + 1):
        p = ipt(x, -tf + 2 * tf * j / nt, d); pts.append((p.y, min(p.z, ztop) if ztop else p.z))
    return pts
def schott(name, x, z0, tueren, m, dicke=0.07, rahmen=True, col=None, ztop=None, rr=0.18, nx=1.0):
    """Schott mit dem Querschnitt der Innenhaut bei x (über dem Boden z0), Türöffnungen (yc, Breite, Höhe) mit runden oberen Ecken.
    Gebaut aus senkrechten Streifen: der Querschnitt ist über dem Boden konvex, je y gibt es eine Unter- und Oberkante. Nachbarstreifen teilen
    ihre Ecken (keine Risse); Türkanten liegen genau auf Streifengrenzen."""
    poly = querschnitt(x, z0, nt=120, ztop=ztop); poly = poly + [poly[0]]
    ymin, ymax = min(p[0] for p in poly), max(p[0] for p in poly)
    def span(y):
        zs = []
        for (ay, az), (by, bz) in zip(poly, poly[1:]):
            if (ay - y) * (by - y) <= 0 and abs(by - ay) > 1e-9: zs.append(az + (bz - az) * (y - ay) / (by - ay))
        if not zs: return z0, z0
        return max(z0, min(zs)), max(zs)
    ds = [(yc, w, h, min(rr, w / 3)) for yc, w, h in tueren]
    def dtop(y, d):
        yc, w, h, r = d; dy = abs(y - yc) - (w / 2 - r)
        return z0 + h - r + math.sqrt(max(0.0, r * r - dy * dy)) if dy > 0 else z0 + h
    ys = set(ymin + (ymax - ymin) * i / 90 for i in range(91))
    for yc, w, h, r in ds:
        for k in range(9): ys.add(yc - w / 2 + r * k / 8); ys.add(yc + w / 2 - r * k / 8)
        ys.add(yc)
    ys = sorted(y for y in ys if ymin <= y <= ymax)
    bm = bmesh.new(); V = {}
    def v(y, z):
        k = (round(y, 5), round(z, 5))
        if k not in V: V[k] = bm.verts.new((x, y, z))
        return V[k]
    def inner(y):      # Zusatzpunkte auf der senkrechten Kante bei y (Türkante: Türoberkante)
        return [dtop(y, d) for d in ds if abs(abs(y - d[0]) - d[1] / 2) < 1e-6]
    for ya, yb in zip(ys, ys[1:]):
        ym = (ya + yb) / 2; door = next((d for d in ds if abs(ym - d[0]) < d[1] / 2), None)
        la, ha = span(ya); lb, hb = span(yb)
        if door:
            pts = [(ya, dtop(ya, door)), (yb, dtop(yb, door)), (yb, hb), (ya, ha)]
        else:
            pts = [(ya, la), (yb, lb)] + [(yb, z) for z in sorted(inner(yb)) if lb < z < hb] + [(yb, hb), (ya, ha)] + [(ya, z) for z in sorted(inner(ya), reverse=True) if la < z < ha]
        vs = []
        for p in pts:
            q = v(*p)
            if not vs or vs[-1] is not q: vs.append(q)
        if len(vs) > 2 and vs[0] is vs[-1]: vs.pop()
        if len(vs) < 3: continue
        try: f = bm.faces.new(vs)
        except ValueError: continue
    bm.normal_update()
    for f in bm.faces:
        if f.normal.x * nx < 0: f.normal_flip()
    ob = mesh_obj(name, bm, [m], False, col or C_IN)
    if dicke:
        so = ob.modifiers.new('Dicke', 'SOLIDIFY'); so.thickness = dicke; so.offset = 0.0
    if rahmen:
        for yc, w, h, r in ds:
            for sg in (1, -1): box('Tuerrahmen', dicke + 0.06, 0.08, h, x, yc + sg * (w / 2 + 0.04), z0 + h / 2, M['i_rahmen'], 0.01)
            box('Tuersturz', dicke + 0.06, w + 0.16, 0.1, x, yc, z0 + h + 0.05, M['i_rahmen'], 0.01)
            box('Tuerlicht', dicke + 0.065, w * 0.7, 0.02, x, yc, z0 + h + 0.13, M['i_petrol'], 0.004)
    return ob
def top_in(x, y, d=D_IN):
    """Höhe der Innenhaut über der Stelle (x, y) (obere Hälfte)"""
    lo, hi = 0.0, PI / 2; s = 1 if y >= 0 else -1
    for _ in range(36):
        m_ = (lo + hi) / 2
        if abs(ipt(x, s * m_, d).y) < abs(y): lo = m_
        else: hi = m_
    return ipt(x, s * (lo + hi) / 2, d).z
def tuerschild(x, nx, yc, z, text_):
    CUR[0] = C_IN
    o = text(text_, 0.07, (x + nx * 0.045, yc + nx * 0.25, z), (0, -nx, 0), (0, 0, 1), M['txtw'] if 'txtw' in M else M['txtd'], align='CENTER', name='Tuerschild')
def lampe(x, y, z, l=0.9, w=0.16, m='i_licht'):
    box('Leuchte', l + 0.06, w + 0.06, 0.04, x, y, z + 0.02, M['i_rahmen'], 0.008); box('Leuchtfeld', l, w, 0.012, x, y, z - 0.002, M[m], 0.004)


def rohr_band(name, pts, w, h, m):
    """flaches Band (Spant) entlang Punkten, Breite w längs x, Tiefe h nach innen"""
    bm = bmesh.new(); R = []
    for i, p in enumerate(pts):
        q = pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]; inward = Vector((0, -p.y, zc_of(p.x) - p.z)).normalized()
        R.append([bm.verts.new(p + Vector((dx, 0, 0)) + inward * dd) for dx, dd in ((-w / 2, 0.0), (w / 2, 0.0), (w / 2, h), (-w / 2, h))])
    for a, b in zip(R, R[1:]):
        for k in range(4): bm.faces.new((a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return mesh_obj(name, bm, [m], False, C_IN)

# =====================================================================================

# ---------- Werkzeuge: Vielecke ----------
def einwaerts(poly, d):
    """konvexes Vieleck (y, z) um d nach innen versetzen (Ecken entlang der Winkelhalbierenden)"""
    n = len(poly); A = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n)); sg = 1 if A > 0 else -1
    out = []
    for i in range(n):
        p0, p1, p2 = Vector(poly[i - 1]), Vector(poly[i]), Vector(poly[(i + 1) % n])
        e1, e2 = p1 - p0, p2 - p1
        if e1.length < 1e-9: e1 = e2.copy()
        if e2.length < 1e-9: e2 = e1.copy()
        e1.normalize(); e2.normalize(); n1 = Vector((-e1.y, e1.x)) * sg; n2 = Vector((-e2.y, e2.x)) * sg; b = n1 + n2
        b = b.normalized() if b.length > 1e-9 else n1
        out.append((p1.x + b.x * d / max(0.3, b.dot(n1)), p1.y + b.y * d / max(0.3, b.dot(n1))))
    return out
def schnitt(poly, k, v, oben=True):
    """Vieleck auf Koordinate k (0 = y, 1 = z) ≥ v (oben) bzw. ≤ v beschneiden"""
    out = []
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]; ia, ib = (a[k] >= v) == oben, (b[k] >= v) == oben
        if ia: out.append(a)
        if ia != ib:
            t = (v - a[k]) / (b[k] - a[k]); out.append((a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t))
    return out
def breite_bei(poly, z):
    w = 0.0
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]
        if (a[1] - z) * (b[1] - z) <= 0 and abs(b[1] - a[1]) > 1e-9: w = max(w, abs(a[0] + (b[0] - a[0]) * (z - a[1]) / (b[1] - a[1])))
    return w

# ---------- Innenhaut des Cockpit-Aufbaus (Kabine hier, Cockpit in moe_cockpit.py): gleiches Raster wie aufbau(), Glas ausgespart ----------
D_K = 0.12
NXB, NAB = 140, 112
XSB = [KX0 + (KX1 - KX0) * i / NXB for i in range(NXB + 1)]
TB = [2 * PI * a / NAB - PI for a in range(NAB)]
_KIN = {}; _PO = {}
def kin(x, d=D_K):
    k = (round(x, 4), d)
    if k not in _KIN: _KIN[k] = einwaerts(ksec(x), d)
    return _KIN[k]
def kpoint_in(x, t, d=D_K):
    zt, W = kparams(x); y, z = _strahl(kin(x, d), KB0 + 0.4 * (zt - KB0), t); return Vector((x, y, z))
def bhw(x, z, d=D_K): return breite_bei(kin(x, d), z)
def po(i, a):
    a %= NAB
    if (i, a) not in _PO: _PO[(i, a)] = kpoint(XSB[i], TB[a])
    return _PO[(i, a)]
def _glas(i, a):
    pts = [po(i, a), po(i + 1, a), po(i + 1, a + 1), po(i, a + 1)]; c = sum(pts, Vector()) / 4
    if c.z < KB0 + 0.02 or (c.x < XB and c.z < ZT - 0.05 and abs(c.y) < WR - 0.6): return False
    nrm = (pts[1] - pts[0]).cross(pts[3] - pts[0]); nrm = nrm.normalized() if nrm.length > 1e-9 else Vector((0, 0, 1))
    if nrm.dot(c - Vector((c.x - 0.5, 0, 8.4))) < 0: nrm = -nrm
    ay = abs(c.y)
    return (c.x > 14.65 and KS_U + 0.06 < c.z < KS_O - 0.04 and nrm.x > 0.3 and ay < 3.15) or (12.2 < c.x < 14.9 and 8.55 < c.z < 9.55 and ay > 3.3 and abs(nrm.z) < 0.6)
GLAS = {(i, a) for i in range(NXB) for a in range(NAB) if _glas(i, a)}
def i_bei(x): return max(0, min(NXB, int(round((x - KX0) / (KX1 - KX0) * NXB))))
def kboden(x): return ZK if x < XK1 else ZC
def block_haut(i0, i1, zb=kboden, d=D_K, kappe=False):
    """Innenhaut des Aufbaus zwischen den Ringen i0 und i1 über dem Boden zb(x) (Punkte darunter werden auf den Boden gehoben: die Haut
    schließt am Boden an); Glasfelder ausgespart, Laibung von der Außenhaut bis zur Innenhaut. kappe: Stirnwand am vorderen Ende."""
    bm = bmesh.new(); bl = bmesh.new(); V = {}
    def qp(i, a):
        a %= NAB
        if (i, a) not in V:
            p = kpoint_in(XSB[i], TB[a], d); z0 = zb(p.x); cl = p.z < z0
            if cl: p.z = z0
            V[(i, a)] = (p, cl, bm.verts.new(p))
        return V[(i, a)]
    for i in range(i0, i1):
        for a in range(NAB):
            if (i, a) in GLAS: continue
            q = [qp(i, a), qp(i + 1, a), qp(i + 1, a + 1), qp(i, a + 1)]
            if all(e[1] for e in q): continue
            bm.faces.new([e[2] for e in q])
    if kappe:
        ring = []
        for a in range(NAB):
            p = qp(i1, a)[2]
            if not ring or (ring[-1].co - p.co).length > 1e-5: ring.append(p)
        if len(ring) > 2 and (ring[0].co - ring[-1].co).length < 1e-5: ring.pop()
        try: bm.faces.new(ring)
        except ValueError: pass
    bm.normal_update()
    for f in bm.faces:
        c = f.calc_center_median()
        if f.normal.dot(Vector((c.x - (0.0 if not kappe or abs(f.normal.x) < 0.9 else 1.0), 0, 9.4)) - c) < 0: f.normal_flip()
    for (i, a) in GLAS:
        if not (i0 <= i < i1): continue
        for (ni, na), (e1, e2) in (((i, a + 1), ((i, a + 1), (i + 1, a + 1))), ((i, a - 1), ((i, a), (i + 1, a))), ((i + 1, a), ((i + 1, a), (i + 1, a + 1))), ((i - 1, a), ((i, a), (i, a + 1)))):
            if (ni, na % NAB) in GLAS: continue
            o1, o2 = po(*e1), po(*e2); n1, n2 = qp(*e1)[0], qp(*e2)[0]
            bl.faces.new([bl.verts.new(p) for p in (o1, o2, n2, n1)])
    return bm, bl

# ---------- glatte Rahmen um die Verglasung: das Glas folgt dem Raster (Stufen an schrägen Rändern); ein 22 cm breiter Rahmen entlang
# der geglätteten Randlinie deckt die Stufen außen und innen ab ----------
def glas_schleifen():
    E = set()
    for (i, a) in GLAS:
        cs = [(i, a % NAB), (i + 1, a % NAB), (i + 1, (a + 1) % NAB), (i, (a + 1) % NAB)]
        for k in range(4): E.add((cs[k], cs[(k + 1) % 4]))
    nxt = {}
    for u, v in E:
        if (v, u) not in E: nxt.setdefault(u, []).append(v)
    loops = []; used = set()
    for s in list(nxt):
        for v0 in nxt[s]:
            if (s, v0) in used: continue
            L = [s]; u, v = s, v0
            while True:
                used.add((u, v))
                if v == s: break
                L.append(v); cand = [w for w in nxt.get(v, []) if (v, w) not in used]
                if not cand: break
                u, v = v, cand[0]
            if len(L) > 3: loops.append(L)
    return loops
def vnorm(i, a):
    i0, i1 = max(0, i - 1), min(NXB, i + 1); c = po(i, a)
    n = (po(i1, a) - po(i0, a)).cross(po(i, a + 1) - po(i, a - 1)); n = n.normalized() if n.length > 1e-9 else Vector((0, 0, 1))
    if n.dot(c - Vector((c.x - 0.5, 0, 8.4))) < 0: n = -n
    return n
def glaetten(P, k=10):
    P = [p.copy() for p in P]; n = len(P)
    for _ in range(k): P = [P[i] * 0.5 + (P[i - 1] + P[(i + 1) % n]) * 0.25 for i in range(n)]
    return P
def streifen(bm, P, N, hw, lift, dick):
    n = len(P); R = []
    for i in range(n):
        t = P[(i + 1) % n] - P[i - 1]; w = t.cross(N[i]); w = w.normalized() * hw if w.length > 1e-9 else Vector((0, 0, 0))
        a, b = P[i] - w + N[i] * lift, P[i] + w + N[i] * lift
        R.append([bm.verts.new(p) for p in (a, b, b + N[i] * dick, a + N[i] * dick)])
    for i in range(n):
        A, B = R[i], R[(i + 1) % n]
        for k in range(4): bm.faces.new((A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k]))
RAHMEN_INNEN = []
def glasrahmen():
    alt = bpy.data.objects.get('Fensterrahmen')
    if alt: bpy.data.objects.remove(alt, do_unlink=True)
    bm = bmesh.new()
    for L in glas_schleifen():
        N = [vnorm(*k) for k in L]
        streifen(bm, glaetten([po(*k) for k in L]), glaetten(N, 4), 0.11, 0.004, 0.035)
        Pi = glaetten([kpoint_in(XSB[i], TB[a % NAB]) for i, a in L]); RAHMEN_INNEN.append((Pi, [-n for n in glaetten(N, 4)]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh_obj('Fensterrahmen', bm, [M['anth']], False, C_PART)
glasrahmen()

# =====================================================================================
# Hülle innen: Haut, Böden, Futter, Fahrwerkshöcker, Treppenloch
# =====================================================================================
def im_kasten(c, rand=0.05):
    return any(a - rand < c.x < b + rand for a, b in (KASTEN_V, KASTEN_H)) and abs(c.y) > 3.35 and c.z < 4.5
def loch_lade(c):
    if c.x > xline(min(c.z, 8.0)) - 0.1: return True
    if TREPPE[0] - 0.02 < c.x < TREPPE[1] + 0.02 and TREPPE[2] - 0.02 < c.y < TREPPE[3] + 0.02 and c.z > ZT - 0.5: return True
    return im_kasten(c)
def wand(x0, x1, z): return min(half_w(x, z) for x in (x0, (x0 + x1) / 2, x1)) + 0.05
HFL = lambda x: heck_cut(x) + 0.21      # über der versetzten Unterkante (+0,17): die Haut bleibt an den Seiten, die Rampenöffnung frei
LFL = lambda x: max(FL, (heck_cut(x) or -9.0) + 0.21)
def huelle():
    CUR[0] = C_IN
    schale('Innenhaut Laderaum', HR_X, XBU, LFL, M['i_wand'], loch=loch_lade, nt=72)
    schale('Innenhaut Heck', XE + 0.17, HR_X, HFL, M['i_wand'], nt=72)
    boden_umriss('Bodengrund', HR_X, 14.95, FL, M['i_schacht'])
    # Heckschräge: Futter neben der Rampenöffnung (Rampe schließt die Mitte), Laibung der Öffnung, Futter der Heckfläche
    bm = bmesh.new(); n = 30
    for s in (1, -1):
        R = []
        for k in range(n + 1):
            x = XE + 0.17 + (HR_X - XE - 0.17) * k / n; z = heck_cut(x) + 0.2
            R.append((bm.verts.new((x, s * (TOR[0] + 0.08), z)), bm.verts.new((x, s * (half_w(x, z) + 0.05), z))))
        for a, b in zip(R, R[1:]): bm.faces.new((a[0], b[0], b[1], a[1]))
    bm.normal_update()
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    mesh_obj('Heckfutter Schraege', bm, [M['i_feld']], False, C_IN)
    H0 = Vector((HR_X, 0, FL)); H1 = Vector((XE + 0.05, 0, HK[3])); u = (H1 - H0).normalized(); nin = Vector((u.z, 0, -u.x))
    if nin.z < 0: nin = -nin
    for s in (1, -1):
        slab('Rampenlaibung', (H0 + H1) / 2 + nin * 0.105 + Vector((0, s * (TOR[0] + 0.11), 0)), u, Vector((0, 1, 0)), ((H1 - H0).length, 0.06, 0.22), M['i_rahmen'], 0.006)
        for k in range(7):      # Warnmarken am Rand der Öffnung
            p = H0.lerp(H1, 0.08 + k * 0.13) + nin * 0.205 + Vector((0, s * (TOR[0] + 0.3), 0)); slab('Warnmarke', p, u, Vector((0, 1, 0)), (0.35, 0.3, 0.012), M['warnrw'], 0.002)
    schott('Heckfutter', XE + 0.17, heck_cut(XE + 0.17) + 0.2, [], M['i_feld'], dicke=0.0, rahmen=False)
    # Bugfutter: parallel zur schrägen Bugplatte, 14 cm dahinter, mit der Toröffnung; oben (über 8 m) senkrecht
    hw, z0, z1 = TOR; rr = 0.35
    outer = schnitt(einwaerts(sec(XB), 0.12), 1, FL - 0.001)
    P = [(hw, z0), (-hw, z0)] + [(-hw + rr - rr * math.cos(a_), z1 - rr + rr * math.sin(a_)) for a_ in [PI / 2 * j / 6 for j in range(1, 6)]] + [(-hw + rr, z1), (hw - rr, z1)] + \
        [(hw - rr + rr * math.cos(PI / 2 - PI / 2 * j / 6), z1 - rr + rr * math.sin(PI / 2 - PI / 2 * j / 6)) for j in range(1, 6)]
    def bf(y, z): return Vector((xline(min(z, 8.0)) - 0.14, y, z))
    bm = bmesh.new(); ov = [bm.verts.new(bf(y, z)) for y, z in outer]; iv = [bm.verts.new(bf(y, z)) for y, z in P]
    edges = [bm.edges.new((ov[i], ov[(i + 1) % len(ov)])) for i in range(len(ov))] + [bm.edges.new((iv[i], iv[(i + 1) % len(iv)])) for i in range(len(iv))]
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges, normal=BUG_N)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if abs(f.calc_center_median().y) < hw - 0.01 and z0 + 0.01 < f.calc_center_median().z < z1 - 0.01], context='FACES')
    bm.normal_update()
    for f in bm.faces:
        if f.normal.dot(BUG_N) > 0: f.normal_flip()
    mesh_obj('Bugfutter', bm, [M['i_feld']], False, C_IN)
    ub = Vector((XB - XBU, 0, 8.0 - FL)).normalized(); Lz = (z1 - z0) / ub.z
    def am(z, y, tief): return Vector((xline(z), y, z)) - BUG_N * tief
    for s in (1, -1):
        slab('Torlaibung', am((z0 + z1) / 2, s * (hw + 0.03), 0.08), ub, Vector((0, 1, 0)), (Lz, 0.06, 0.18), M['i_rahmen'], 0.006)
        for k in range(6): slab('Warnmarke', am(z0 + 0.4 + k * 0.9, s * (hw + 0.3), 0.15), ub, Vector((0, 1, 0)), (0.4, 0.4, 0.012), M['warnrw'], 0.002)
    slab('Torlaibung oben', am(z1 + 0.03, 0, 0.08), Vector((0, 1, 0)), ub, (2 * hw + 0.12, 0.06, 0.18), M['i_rahmen'], 0.006)
    # Fahrwerkshöcker: Verkleidung der Kästen im Laderaum (Innenseite senkrecht, oben schräg zur Wand)
    for x0, x1 in (KASTEN_V, KASTEN_H):
        a, b = x0 - 0.15, x1 + 0.15
        for s in (1, -1):
            pts = [(wand(a, b, 2.45), 2.45), (3.4, 2.8), (3.4, 4.3), (3.75, 4.75)] + [(wand(a, b, z), z) for z in [4.75 - (4.75 - 2.5) * k / 10 for k in range(11)]]
            prism('Fahrwerkshoecker', [(s * y, z) for y, z in pts], a, b, M['i_feld'], 'X', 0.02)
            for k in range(int((b - a) / 1.2)):
                xx = a + 0.6 + k * 1.2; box('Hoeckerrippe', 0.08, 0.06, 1.45, xx, s * 3.37, 3.55, M['i_rahmen'], 0.008)
            box('Hoeckerwarnung', b - a - 0.4, 0.02, 0.18, (a + b) / 2, s * 3.39, 2.95, M['warnrw'], 0.002)
            CUR[0] = C_IN; text('FAHRWERK', 0.16, ((a + b) / 2 - s * 0.55, s * 3.385, 3.9), (s, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Hoeckerschrift')
    # Treppenloch im Dach: Laibung zwischen Innenhaut und Kabinenboden
    xa, xb, ya, yb = TREPPE
    for y in (ya - 0.03, yb + 0.03): box('Lukenrahmen', xb - xa + 0.12, 0.06, ZK - 8.25, (xa + xb) / 2, y, (ZK + 8.25) / 2, M['i_rahmen'], 0.006)
    for x in (xa - 0.03, xb + 0.03): box('Lukenrahmen', 0.06, yb - ya, ZK - 8.25, x, (ya + yb) / 2, (ZK + 8.25) / 2, M['i_rahmen'], 0.006)

# =====================================================================================
# Laderaum
# =====================================================================================
STELL_X = (-7.2, 0.8)      # Stellplätze (Mitte), je ein Dachs (6,6 × 3,8 m)
def laderaum():
    CUR[0] = C_IN
    S = Sammel('Laderaum Kleinteile', C_IN)
    x0, x1 = HR_X + 0.05, 14.95
    # Boden: Fahrgasse aus schweren Platten, seitlich Kistenbahnen; Zurrschienen längs und quer, gelbe Gassenkanten
    platten(S, x0, x1, -GASSE, GASSE, FL, M['i_boden2'], M['i_fuge'], ma=M['i_boden'], p=1.5, q=1.0)
    for k in range(int((x1 - x0) / 1.5)):
        xa, xb = x0 + k * 1.5, x0 + (k + 1) * 1.5; w = min(half_w(xa, FL), half_w(xb, FL)) - 0.02
        for sg in (1, -1): platten(S, xa, xb, (GASSE + 0.05 if sg > 0 else -w), (w if sg > 0 else -GASSE - 0.05), FL, M['i_boden'], M['i_fuge'], p=0.75, q=0.6)
    for sg in (1, -1):
        S.box(x1 - x0, 0.08, 0.006, (x0 + x1) / 2, sg * (GASSE + 0.025), FL + 0.015, M['gelb'])
        for yy in (0.9, 1.75): zurrschiene(S, x0 + 0.3, x1 - 0.3, (sg * yy, FL + 0.013), (0, 0, 1), M['i_rahmen'], M['i_fuge'])
    for x in [x0 + 1.2 + k * 3.0 for k in range(9)]: S.box(0.07, 2 * GASSE - 0.2, 0.012, x, 0, FL + 0.018, M['i_rahmen'])
    for k, xc in enumerate(STELL_X):      # Stellplatz: gelbe Ecken und Schrift
        for dx in (-3.3, 3.3):
            for sg in (1, -1):
                S.box(0.6, 0.08, 0.004, xc + dx - math.copysign(0.3, dx), sg * 1.85, FL + 0.02, M['gelb']); S.box(0.08, 0.5, 0.004, xc + dx, sg * 1.64, FL + 0.02, M['gelb'])
        CUR[0] = C_IN; text('STELLPLATZ %d · FAHRZEUG' % (k + 1), 0.22, (xc, 0, FL + 0.022), (0, -1, 0), (1, 0, 0), M['gelb'], align='CENTER', name='Bodenschrift')
    CUR[0] = C_IN; text('DURCHFAHRT · BUGTOR', 0.2, (11.0, 0, FL + 0.022), (0, -1, 0), (1, 0, 0), M['gelb'], align='CENTER', name='Bodenschrift')
    # Spanten: dem Querschnitt folgend; über den Höckern und am Treppenloch unterbrochen
    for x in [-12.9 + k * 2.55 for k in range(11)]:
        P = querschnitt(x, FL + 0.02, D_IN, 72); run = []
        def frei(y, z): c = Vector((x, y, z)); return not (im_kasten(c, 0.3) or c.z < 4.85 and im_kasten(Vector((x, y, 4.4)), 0.3)) and not (TREPPE[0] - 0.2 < x < TREPPE[1] + 0.2 and TREPPE[2] - 0.15 < y < TREPPE[3] + 0.15 and z > 7.8) and x < xline(min(z, 8.0)) - 0.25
        for y, z in P + [(None, None)]:
            if y is not None and frei(y, z): run.append(Vector((x, y, z))); continue
            if len(run) > 2: rohr_band('Spant', run, 0.16, 0.1, M['i_rahmen'])
            run = []
    # Wandfelder zwischen den Spanten: Netz / Gerätekasten im senkrechten Teil, Lichtband an der oberen Fase
    xs = [-12.9 + k * 2.55 for k in range(11)]
    for k, (xa, xb) in enumerate(zip(xs, xs[1:])):
        xm = (xa + xb) / 2
        for sg in (1, -1):
            yw = half_w(xm, 5.5)
            if k % 2 == 0:
                for j in range(9): S.box(xb - xa - 0.4, 0.015, 0.014, xm, sg * (yw - 0.08), 4.9 + j * 0.3, M['i_dunkel'])
                for j in range(6): S.box(0.014, 0.015, 2.5, xa + 0.3 + j * (xb - xa - 0.6) / 5, sg * (yw - 0.08), 6.1, M['i_dunkel'])
                for zz in (4.85, 7.35):
                    for xx in (xa + 0.3, xb - 0.3): S.cyl(0.035, 0.07, Vector((xx, sg * (yw - 0.05), zz)), (0, 1, 0), M['gelb'], 8)
            else:
                S.box(1.0, 0.24, 0.7, xm, sg * (yw - 0.12), 5.4, M['i_schrank']); S.box(0.36, 0.01, 0.2, xm - 0.2, sg * (yw - 0.245), 5.5, M['i_bild'])
                S.box(0.07, 0.012, 0.07, xm + 0.3, sg * (yw - 0.246), 5.5, M['i_petrol']); S.box(0.6, 0.03, 0.03, xm, sg * (yw - 0.26), 5.12, M['i_stahl'])
                for j in range(3): rod('Wandleitung', Vector((xa + 0.25, sg * (yw - 0.07), 6.3 + j * 0.14)), Vector((xb - 0.25, sg * (yw - 0.07), 6.3 + j * 0.14)), 0.035, M['i_rahmen'] if j else M['i_rot'], 10)
            pu = ipt(xm, t_at(xm, 7.55, sg)); S.box(xb - xa - 0.3, 0.06, 0.06, xm, sg * (abs(pu.y) - 0.06), 7.55, M['i_licht'])
    # Deckenleuchten und Kranschiene mit Laufkatze und Kettenzug
    for x in (-12.0, -8.0, -4.0, 0.0, 4.0, 10.5):
        for sg in (1, -1): lampe(x, sg * 1.9, top_in(x, sg * 1.9) - 0.045, 1.4, 0.2)
    zt = top_in(-3.0, 0.0)
    S.box(20.0, 0.26, 0.2, -3.5, 0, zt - 0.12, M['gelb'])
    for x in (-13.0, -8.5, -3.5, 1.5, 6.0): S.box(0.14, 0.7, 0.12, x, 0, zt - 0.03, M['i_rahmen'])
    S.box(0.5, 0.36, 0.22, -6.5, 0, zt - 0.33, M['i_rahmen']); S.cyl(0.1, 0.34, Vector((-6.5, 0, zt - 0.56)), (0, 0, 1), M['i_dunkel'], 12)
    for k in range(18): S.box(0.035, 0.06, 0.09, -6.5, 0, zt - 0.75 - k * 0.1, M['i_stahl'])
    S.box(0.22, 0.08, 0.16, -6.5, 0, zt - 2.62, M['gelb'])
    # Spinde vorn rechts (Auslöser „locker“) vor dem Fahrwerkshöcker
    for k in range(4):
        x = 10.45 + k * 0.58
        S.box(0.56, 0.7, 2.0, x, -2.65, FL + 1.0, M['i_schrank']); S.box(0.5, 0.012, 1.92, x, -2.294, FL + 1.0, M['i_feld'])
        for zz in (FL + 1.7, FL + 1.78, FL + 1.86): S.box(0.22, 0.01, 0.012, x, -2.287, zz, M['i_dunkel'])
        S.box(0.03, 0.02, 0.14, x + 0.2, -2.28, FL + 1.05, M['i_stahl'])
    ANCH['raum']['locker'] = Vector((11.3, -1.75, FL))
    # Systempult an der Steuerbordseite (Auslöser „scanner“), Rampenpult backbord an der Heckrampe (Auslöser „ramp“)
    with Part('Systempult', T(-0.6, -2.65, FL), C_IN):
        prism('Pultkoerper', [(-0.35, 0.0), (0.35, 0.0), (0.35, 0.9), (-0.2, 1.2), (-0.35, 1.2)], -0.4, 0.4, M['i_schrank'], 'X', 0.02)
        box('Pultschirm', 0.6, 0.3, 0.012, 0, 0.075, 1.06, M['i_bild'], 0.003, rot=(math.radians(-28.6), 0, 0))
        box('Pultleiste', 0.6, 0.02, 0.04, 0, 0.36, 0.84, M['i_petrol'], 0.003)
    ANCH['raum']['scanner'] = Vector((-0.6, -1.75, FL))
    with Part('Rampenpult', T(-13.5, 2.75, FL), C_IN):
        box('Rampensaeule', 0.4, 0.4, 1.3, 0, 0, 0.65, M['i_schrank'], 0.02)
        box('Rampenfeld', 0.32, 0.012, 0.4, 0, -0.206, 1.05, M['i_feld'], 0.003)
        cyl('Rampentaster', 0.05, 0.03, 0, -0.22, 1.12, M['i_rot'], 'Y', n=16); box('Rampenanzeige', 0.18, 0.01, 0.08, 0, -0.214, 0.92, M['i_petrol'], 0.002)
        box('Warnsaeule', 0.42, 0.42, 0.12, 0, 0, 0.06, M['warnrw'], 0.01)
    ANCH['raum']['ramp'] = Vector((-13.3, 1.9, FL))
    CUR[0] = C_IN; text('HECKRAMPE', 0.09, (-13.5, 2.54, FL + 1.38), (1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Pultschrift')
    S.fertig()

# =====================================================================================
# Treppe zur Kabine (45°, an der Backbordwand, durch das Dachloch)
# =====================================================================================
def treppe():
    CUR[0] = C_IN
    S = Sammel('Treppe Kleinteile', C_IN)
    n = int(round((ZK - FL) / 0.205)); dz = (ZK - FL) / n; dx = (TREPPE[1] - TR_X0) / n; ya, yb = TR_Y; ym = (ya + yb) / 2
    for k in range(n):
        z = FL + dz * (k + 1); xa = TR_X0 + dx * k
        gitter(S, xa + 0.005, xa + dx + 0.04, ya + 0.02, yb - 0.02, z - 0.03, M['i_gitter'], M['i_schacht'], h=0.03)
        S.box(dx + 0.035, yb - ya - 0.04, 0.025, xa + dx / 2 + 0.02, ym, z - 0.045, M['i_rahmen'])
        S.box(0.04, yb - ya - 0.04, 0.012, xa + 0.025, ym, z + 0.002, M['gelb'])
    A = Vector((TR_X0, 0, FL)); B = Vector((TREPPE[1], 0, ZK)); u = (B - A).normalized(); nn = Vector((-u.z, 0, u.x))
    for y in (ya - 0.03, yb + 0.03):
        slab('Treppenwange', (A + B) / 2 + Vector((0, y, 0)) - nn * 0.1, u, Vector((0, 1, 0)), ((B - A).length + 0.05, 0.06, 0.3), M['i_rahmen'], 0.008)
        hr = [A + Vector((0, y, 0.95)), B + Vector((0, y, 0.95))]; rod('Handlauf', hr[0], hr[1], 0.025, M['gelb'], 12)
        for k in range(7):
            p = A.lerp(B, 0.03 + k * 0.155) + Vector((0, y, 0.02)); rod('Gelaenderpfosten', p, p + Vector((0, 0, 0.95)), 0.02, M['i_stahl'], 8)
    # Stützen unter der Treppe auf den Laderaumboden
    for f in (0.35, 0.68):
        p = A.lerp(B, f)
        for y in (ya + 0.05, yb - 0.05): rod('Treppenstuetze', Vector((p.x, y, FL)), Vector((p.x, y, p.z - 0.2)), 0.05, M['i_rahmen'], 12)
        S.box(0.1, yb - ya, 0.1, p.x, ym, p.z - 0.22, M['i_rahmen'])
    box('Treppenfuss', 0.9, yb - ya + 0.4, 0.004, TR_X0 - 0.45, ym, FL + 0.016, M['warnrw'], 0.0)
    S.fertig()

# =====================================================================================
# Kabine im Aufbau: Innenhaut, Boden mit Treppenloch, Geländer, sechs Klappsitze, Einsatztisch, Gepäckfächer, Spantwand zum Cockpit
# =====================================================================================
def klappsitz(x, s):
    """Klappsitz an der Wand (s: +1 Backbord, Blick nach −y), Rahmen an der Wandschiene, Gurtzeug"""
    yw = s * (bhw(x, ZK + 1.0) - 0.02); i = -s
    def Y(d): return yw + i * d
    box('Sitzrueckwand', 0.56, 0.05, 0.8, x, Y(0.04), ZK + 0.95, M['i_rahmen'], 0.01)
    box('Rueckenpolster', 0.48, 0.08, 0.66, x, Y(0.105), ZK + 0.95, M['i_polster'], 0.025)
    box('Kopfstuetze', 0.3, 0.1, 0.22, x, Y(0.11), ZK + 1.45, M['i_polster'], 0.03)
    box('Sitzschale', 0.54, 0.48, 0.06, x, Y(0.3), ZK + 0.45, M['i_rahmen'], 0.01)
    box('Sitzpolster', 0.48, 0.42, 0.06, x, Y(0.3), ZK + 0.51, M['i_polster'], 0.02)
    for sx in (-1, 1):
        rod('Sitzbein', Vector((x + sx * 0.24, Y(0.5), ZK + 0.42)), Vector((x + sx * 0.24, Y(0.12), ZK + 0.01)), 0.02, M['i_stahl'], 8)
        box('Gurt', 0.05, 0.012, 0.62, x + sx * 0.12, Y(0.15), ZK + 0.98, M['i_gurt'], 0.002)
    box('Gurtschloss', 0.09, 0.03, 0.09, x, Y(0.16), ZK + 0.72, M['i_stahl'], 0.008)
    box('Beckengurt', 0.42, 0.012, 0.05, x, Y(0.52), ZK + 0.58, M['i_gurt'], 0.002)
def kabine():
    CUR[0] = C_IN
    i0, i1 = i_bei(KX0), i_bei(XK1 - 0.04)
    bm, bl = block_haut(i0, i1)
    mesh_obj('Innenhaut Kabine', bm, [M['i_wand']], True, C_IN); mesh_obj('Fensterlaibung Kabine', bl, [M['i_rahmen']], False, C_IN)
    S = Sammel('Kabine Kleinteile', C_IN)
    xa, xb, ya, yb = TREPPE
    XS_ = [KX0, 7.5, 8.0, 8.5, 9.0, xb] + [xb + 0.5 * k for k in range(1, 8) if xb + 0.5 * k < XK1 - 0.1] + [XK1]
    for x0, x1 in zip(XS_, XS_[1:]):      # Boden in Streifen (die Wand folgt der Form); neben dem Treppenloch ausgespart
        w = min(bhw(x0, ZK + 0.01), bhw(x1, ZK + 0.01)) + 0.02
        if x1 <= xb + 1e-6:
            platten(S, x0, x1, -w, ya, ZK, M['i_boden'], M['i_fuge'], p=0.5, q=0.8); platten(S, x0, x1, yb, w, ZK, M['i_boden'], M['i_fuge'], p=0.5, q=0.8)
        else: platten(S, x0, x1, -w, w, ZK, M['i_boden'], M['i_fuge'], p=0.5, q=0.8)
    S.box(XK1 - xb - 0.2, 1.2, 0.006, (xb + XK1) / 2, 0, ZK + 0.015, M['i_dunkel'])      # Läufer in der Mitte
    bm = bmesh.new(); n = int((XK1 - KX0) / 0.1); R = []      # Grund unter den Platten mit dem Umriss der Haut (keine Spalten zur Wand)
    for k in range(n + 1):
        x = KX0 + (XK1 - KX0) * k / n; w = bhw(x, ZK + 0.005) + 0.03; R.append((x, [bm.verts.new((x, y, ZK - 0.002)) for y in (-w, ya, yb, w)]))
    for (xa_, A), (xb_, B) in zip(R, R[1:]):
        for j in range(3):
            if j == 1 and xa_ < xb - 0.01 and xb_ > xa + 0.01: continue
            bm.faces.new((A[j], B[j], B[j + 1], A[j + 1]))
    bm.normal_update()
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    mesh_obj('Kabinengrund', bm, [M['i_schacht']], False, C_IN); CUR[0] = C_IN
    # Geländer am Treppenloch (vorn offen: dort kommt man an)
    for y in (ya - 0.08, yb + 0.08):
        rod('Lukengelaender', Vector((xa + 0.3, y, ZK + 1.0)), Vector((xb - 0.05, y, ZK + 1.0)), 0.025, M['gelb'], 12)
        for x in (xa + 0.3, (xa + xb) / 2 + 0.1, xb - 0.05): rod('Lukenpfosten', Vector((x, y, ZK)), Vector((x, y, ZK + 1.0)), 0.025, M['i_stahl'], 10)
    for k in range(4): S.box((xb - xa) / 4 - 0.1, 0.012, 0.08, xa + 0.35 + k * (xb - xa) / 4.4, ya - 0.08, ZK + 0.08, M['warnrw'])
    # sechs Klappsitze, je drei an einer Wand
    for x in (10.2, 11.0, 11.8):
        for s in (1, -1): klappsitz(x, s)
        for s in (1, -1): S.box(0.04, 0.03, 0.03, x, s * (bhw(x, ZK + 1.6) - 0.02), ZK + 1.65, M['i_stahl'])
    for s in (1, -1):
        w = bhw(11.0, ZK + 0.3)
        for zz in (ZK + 0.3, ZK + 1.65): S.box(2.6, 0.04, 0.05, 11.0, s * (w - 0.02), zz, M['i_rahmen'])
    # Gepäckfächer über den Sitzen (unter der oberen Fase)
    for s in (1, -1):
        y_in = bhw(11.0, 9.7) - 0.6; zt_ = KBT - D_K
        wl = [(bhw(11.0, z) + 0.04, z) for z in [9.8 + (zt_ - 0.04 - 9.8) * k / 16 for k in range(17)] if bhw(11.0, z) > y_in]; ztop = wl[-1][1]
        pts = [(y_in, 9.72), (bhw(11.0, 9.72) + 0.05, 9.72)] + wl + [(y_in, ztop)]
        prism('Gepaeckfach', [(s * y, z) for y, z in pts], 9.6, 12.4, M['i_schrank'], 'X', 0.01)
        for k in range(4):
            x = 9.6 + 0.35 + k * 0.7; S.box(0.64, 0.012, 0.62, x, s * (y_in - 0.006), (9.72 + ztop) / 2, M['i_feld'])
            S.box(0.2, 0.02, 0.03, x, s * (y_in - 0.018), 9.82, M['i_stahl'])
        S.box(2.8, 0.03, 0.03, 11.0, s * (y_in - 0.01), 9.69, M['i_licht'])
    # Einsatztisch in der Mitte (Auslöser „log“): Kartenschirm, Lichtkante, Haltegriffe
    with Part('Einsatztisch', T(11.0, 0, ZK), C_IN):
        prism('Tischfuss', [(-0.25, 0.0), (0.25, 0.0), (0.18, 0.86), (-0.18, 0.86)], -0.35, 0.35, M['i_schrank'], 'Y', 0.02)
        box('Tischplatte', 1.5, 0.95, 0.06, 0, 0, 0.92, M['i_rahmen'], 0.02)
        box('Tischschirm', 1.2, 0.7, 0.01, 0, 0, 0.955, M['i_bild'], 0.003)
        for sy in (-1, 1): box('Tischlicht', 1.4, 0.02, 0.02, 0, sy * 0.47, 0.93, M['i_petrol'], 0.003)
        for sx in (-1, 1): rod('Tischgriff', Vector((sx * 0.78, -0.3, 0.9)), Vector((sx * 0.78, 0.3, 0.9)), 0.018, M['i_stahl'], 8)
    ANCH['raum']['log'] = Vector((11.0, -0.95, ZK))
    # Schrank hinten rechts (niedrige Decke): Erste Hilfe, Feuerlöscher an der Wand
    box('Kabinenschrank', 1.0, 0.6, 0.9, 8.6, -3.35, ZK + 0.45, M['i_schrank'], 0.015)
    box('Erste Hilfe', 0.3, 0.012, 0.2, 8.6, -3.044, ZK + 0.6, M['i_rot'], 0.003)
    cyl('Feuerloescher', 0.07, 0.42, 9.4, -3.65, ZK + 0.6, M['i_rot'], 'Z', n=16, bev=0.015)
    # Spantwand zum Cockpit: Seitenteile, Durchgang 3,4 m breit; Schirme zur Kabine
    for s in (1, -1):
        poly = schnitt(schnitt(kin(XK1 - 0.05, 0.08), 1, ZK), 0, s * 1.7, oben=s > 0)
        prism('Spantwand', poly, XK1 - 0.09, XK1 - 0.01, M['i_feld'], 'X', 0.006)
        box('Durchgangsrahmen', 0.12, 0.1, KBT - D_K - ZK, XK1 - 0.05, s * 1.72, (KBT - D_K + ZK) / 2, M['i_rahmen'], 0.01)
        box('Spantschirm', 0.012, 0.8, 0.5, XK1 - 0.096, s * 2.6, ZK + 1.45, M['i_bild'], 0.003)
        box('Spantleiste', 0.012, 1.4, 0.03, XK1 - 0.096, s * 2.6, ZK + 1.1, M['i_petrol'], 0.002)
    # Deckenleuchten
    for x in (8.6, 9.8, 11.0, 12.2):
        for sg in (1, -1): lampe(x, sg * 1.3, KBT - D_K - 0.04, 0.9, 0.16)
    S.fertig()

def innen_lichter():
    for x in (-11.0, -5.0, 1.0, 7.0, 11.5): point('Laderaumlicht', (x, 0, 7.4), 420, (0.95, 0.97, 1.0), 0.4)
    point('Treppenlicht', (6.0, 2.6, 7.6), 80, (1.0, 0.85, 0.65), 0.15)
    for x in (9.4, 11.6): point('Kabinenlicht', (x, 0, KBT - 0.5), 120, (0.95, 0.96, 1.0), 0.2)

huelle(); laderaum(); treppe(); kabine(); innen_lichter()
for o in C_IN.all_objects: o['innen'] = 1
cam('Laderaum', (-13.4, -2.4, 4.4), (4.0, 0.8, 4.2), 16); cam('Laderaum2', (13.6, 1.4, 4.6), (-8.0, -0.6, 4.0), 16)
cam('Treppe', (1.2, -1.2, 3.9), (8.0, 2.6, 7.2), 16); cam('Kabine', (8.4, -2.4, ZK + 1.6), (12.6, 1.4, ZK + 0.9), 16)
cam('Kabine2', (12.7, 1.0, ZK + 1.6), (8.2, -1.6, ZK + 0.6), 16)
IN_VIEWS = {
    'in_laderaum': ('Laderaum', 'grau', True, 0.0, 0.0, {'rampe': 1.0}), 'in_laderaum2': ('Laderaum2', 'grau', True, 0.0, 0.0, {'rampe': 1.0}),
    'in_treppe': ('Treppe', 'grau', True, 0.0, 0.0, {}), 'in_kabine': ('Kabine', 'grau', True, 0.0, 0.0, {}), 'in_kabine2': ('Kabine2', 'grau', True, 0.0, 0.0, {}),
}
