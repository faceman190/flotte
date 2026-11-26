# Harpyie: Innenraum (wird von har_kit.py in build() ausgeführt, mit dessen Namensraum).
# Grundsätze wie Kranich und Möwe: Innenhaut = Rumpf um D_IN nach innen versetzt; Boden mit dem Umriss der Haut; alles schließt an.
# Räume:
#  Truppenraum  Boden FL 2,0 von der Heckrampe (Gelenk x HR_X) bis zum Schott bei x 10,3, Decke 6,2 m (4,2 m lichte Höhe):
#               zwölf Klappsitze an den Wänden (je sechs), Gepäcknetze und Ablagen darüber, Waffenspinde, Stellplatz für ein Fahrzeug,
#               Spanten, Deckenleuchten, Leiter zum Rückenturm, Rampenpult, Systempult.
#  Oberdeck     Mannschaftsdeck über dem vorderen Truppenraum (x 1,9 … 10,3, Boden ZC 4,15 wie das Cockpit, 2,07 m lichte Höhe):
#               Schützenplatz unter dem Rückenturm, Anzugschränke, Geräteregal, zwei Doppelstockkojen, Messe mit Tisch und Bank, Kombüse.
#  Unterdeck    darunter (2,07 m): Waffenkammer (offen zum Truppenraum: Spinde, Waffenständer, Systempult) und Technikraum hinter einem
#               Schott (Energiekern, Lebenserhaltung, Schaltschränke, Werkbank).
#  Treppe       mittig vom Truppenraum (x −0,25) hinauf aufs Oberdeck; von dort durch das Schott ins Cockpit.
#  Cockpit      im Kanzelbuckel (har_cockpit.py): zwei Plätze nebeneinander, Pilot links.
import bpy, bmesh, math
from mathutils import Vector, Matrix
_idk = os.path.join(HIER, '..', 'innen', 'innen_detail.py')
exec(compile(open(_idk, encoding='utf-8').read(), 'innen_detail.py', 'exec'), globals())

M['i_wand'] = mk('Innenwand Graphit', (0.11, 0.115, 0.12), 0.25, 0.5, var=0.06, scale=3.0, bump=0.12, wear=0.3)
M['i_feld'] = mk('Innenfeld', (0.075, 0.078, 0.082), 0.3, 0.5, var=0.08, scale=3.0, bump=0.12, wear=0.3)
M['i_dunkel'] = mk('Innenwand dunkel', (0.03, 0.031, 0.034), 0.35, 0.5, var=0.08, scale=3.0, bump=0.15, wear=0.4)
M['i_rahmen'] = mk('Innenrahmen', (0.05, 0.053, 0.058), 0.65, 0.4, var=0.1, scale=4.0, wear=0.5)
M['i_boden'] = mk('Innenboden', (0.04, 0.042, 0.045), 0.55, 0.45, var=0.15, scale=4.0, bump=0.4, bscale=200, wear=0.9)
M['i_boden2'] = mk('Bodenplatte hell', (0.07, 0.072, 0.077), 0.5, 0.45, var=0.12, scale=4.0, bump=0.3, bscale=200, wear=0.8)
M['i_fuge'] = mk('Bodenfuge', (0.01, 0.01, 0.011), 0.4, 0.6, var=0.0, rvar=0.0, grime=False)
M['i_gitter'] = mk('Gitterrost', (0.06, 0.062, 0.066), 0.8, 0.4, var=0.1, scale=4.0, wear=0.7)
M['i_schacht'] = mk('Schacht', (0.012, 0.012, 0.013), 0.3, 0.7, var=0.05, grime=False)
M['i_polster'] = mk('Polster', (0.045, 0.047, 0.05), 0.0, 0.85, var=0.12, scale=6.0, bump=0.5, bscale=120)
M['i_gurt'] = mk('Gurtband', (0.36, 0.25, 0.02), 0.0, 0.8, var=0.1, scale=6.0, bump=0.3, bscale=160)
M['i_netz'] = mk('Netz', (0.02, 0.02, 0.022), 0.0, 0.9, var=0.05, scale=6.0)
M['i_bett'] = mk('Bettzeug', (0.2, 0.15, 0.03), 0.0, 0.9, var=0.12, scale=6.0, bump=0.35, bscale=140)
M['i_decke'] = mk('Wolldecke', (0.1, 0.105, 0.11), 0.0, 0.92, var=0.15, scale=6.0, bump=0.4, bscale=160)
M['i_tisch'] = mk('Tischplatte', (0.16, 0.158, 0.15), 0.1, 0.4, var=0.08, scale=3.0, wear=0.4)
M['i_kern'] = mk('Kernglut', (0.3, 0.8, 1.0), 0, 0.2, var=0, rvar=0, emit=(0.35, 0.8, 1.0), es=12.0, grime=False)
M['i_kupfer'] = mk('Kupfer', (0.45, 0.2, 0.09), 1.0, 0.3, var=0.08, wear=0.5)
M['i_rot'] = mk('Lack rot', (0.3, 0.02, 0.015), 0.25, 0.42, var=0.1, wear=0.6)
M['i_licht'] = mk('Deckenlicht', (0.9, 0.95, 1.0), 0, 0.3, var=0, rvar=0, emit=(0.92, 0.96, 1.0), es=6.0, grime=False)
M['i_warm'] = mk('Ambientlicht', (1.0, 0.6, 0.3), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.55, 0.22), es=4.0, grime=False)
M['i_petrol'] = mk('Licht petrol', (0.2, 0.9, 0.85), 0, 0.3, var=0, rvar=0, emit=(0.25, 0.95, 0.9), es=4.0, grime=False)
M['i_rotlicht'] = mk('Licht rot', (1.0, 0.1, 0.05), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.12, 0.05), es=4.0, grime=False)
M['i_stahl'] = mk('Stahl blank', (0.5, 0.51, 0.53), 1.0, 0.25, var=0.05, grime=False)
M['i_schrank'] = mk('Schrank', (0.09, 0.093, 0.098), 0.35, 0.45, var=0.06, scale=3.0, wear=0.3)
M['i_bild'] = M['mfd']
C_IN = C_ROOM
D_IN = 0.17
ZC = 4.15                        # Cockpitboden = Oberdeck
XS0 = 10.3                       # Schott Oberdeck / Cockpit
XD0 = 1.9                        # Hinterkante des Oberdecks
XT = 6.2                         # Schott Waffenkammer / Technikraum (Unterdeck)
TR_X0 = XD0 - (ZC - 2.0)         # Fuß der Treppe (45°)
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

# ---------- Vielecke, Innenhaut des Kanzelbuckels (gleiches Raster wie kanzel(), Glas ausgespart) ----------
def einwaerts(poly, d):
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
D_K = 0.12
_KIN = {}
def kin(x, d=D_K):
    k = (round(x, 4), d)
    if k not in _KIN: _KIN[k] = einwaerts(ksec(x), d)
    return _KIN[k]
def kpoint_in(x, t, d=D_K):
    zt, W = kparams(x); y, z = _strahl(kin(x, d), KB0 + 0.45 * (zt - KB0), t); return Vector((x, y, z))
def bhw(x, z, d=D_K): return breite_bei(kin(x, d), z)
def i_bei(x): return max(0, min(NXB, int(round((x - KX0) / (KX1 - KX0) * NXB))))
def block_haut(i0, i1, zb, d=D_K, kappe=False):
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
            if (i, a) in KGLAS: continue
            q = [qp(i, a), qp(i + 1, a), qp(i + 1, a + 1), qp(i, a + 1)]
            if all(e[1] for e in q): continue
            bm.faces.new([e[2] for e in q])
    if kappe:
        ring_ = []
        for a in range(NAB):
            p = qp(i1, a)[2]
            if not ring_ or (ring_[-1].co - p.co).length > 1e-5: ring_.append(p)
        if len(ring_) > 2 and (ring_[0].co - ring_[-1].co).length < 1e-5: ring_.pop()
        try: bm.faces.new(ring_)
        except ValueError: pass
    bm.normal_update()
    for f in bm.faces:
        c = f.calc_center_median()
        if f.normal.dot(Vector((c.x - (0.0 if not kappe or abs(f.normal.x) < 0.9 else 1.0), 0, 5.4)) - c) < 0: f.normal_flip()
    for (i, a) in KGLAS:
        if not (i0 <= i < i1): continue
        for (ni, na), (e1, e2) in (((i, a + 1), ((i, a + 1), (i + 1, a + 1))), ((i, a - 1), ((i, a), (i + 1, a))), ((i + 1, a), ((i + 1, a), (i + 1, a + 1))), ((i - 1, a), ((i, a), (i, a + 1)))):
            if (ni, na % NAB) in KGLAS: continue
            o1, o2 = po(*e1), po(*e2); n1, n2 = qp(*e1)[0], qp(*e2)[0]
            bl.faces.new([bl.verts.new(p) for p in (o1, o2, n2, n1)])
    return bm, bl
RAHMEN_INNEN = []
for _Lp in glas_schleifen(KGLAS):
    _N = glaetten([vnorm(*k) for k in _Lp], 4)
    RAHMEN_INNEN.append((glaetten([kpoint_in(XSB[i], TB[a % NAB]) for i, a in _Lp]), [-n for n in _N]))

# =====================================================================================
# Hülle innen
# =====================================================================================
HFL = lambda x: heck_cut(x) + 0.21
LFL = lambda x: max(FL, (heck_cut(x) or -9.0) + 0.21)
def huelle():
    CUR[0] = C_IN
    schale('Innenhaut Truppenraum', HR_X, XS0, LFL, M['i_wand'], nt=80)
    schale('Innenhaut Heck', XE + 0.17, HR_X, HFL, M['i_wand'], nt=80)
    boden_umriss('Bodengrund', HR_X, XS0, FL, M['i_schacht'])
    bm = bmesh.new(); n = 30
    for s in (1, -1):
        R = []
        for k in range(n + 1):
            x = XE + 0.17 + (HR_X - XE - 0.17) * k / n; z = heck_cut(x) + 0.2
            R.append((bm.verts.new((x, s * (RAMP_HW + 0.08), z)), bm.verts.new((x, s * (half_w(x, z) + 0.05), z))))
        for a, b in zip(R, R[1:]): bm.faces.new((a[0], b[0], b[1], a[1]))
    bm.normal_update()
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    mesh_obj('Heckfutter Schraege', bm, [M['i_feld']], False, C_IN)
    H0 = Vector((HR_X, 0, FL)); H1 = Vector((XE + 0.05, 0, HK[3])); u = (H1 - H0).normalized(); nin = Vector((u.z, 0, -u.x))
    if nin.z < 0: nin = -nin
    for s in (1, -1):
        slab('Rampenlaibung', (H0 + H1) / 2 + nin * 0.105 + Vector((0, s * (RAMP_HW + 0.11), 0)), u, Vector((0, 1, 0)), ((H1 - H0).length, 0.06, 0.22), M['i_rahmen'], 0.006)
        for k in range(6):
            p = H0.lerp(H1, 0.08 + k * 0.15) + nin * 0.205 + Vector((0, s * (RAMP_HW + 0.3), 0)); slab('Warnmarke', p, u, Vector((0, 1, 0)), (0.35, 0.3, 0.012), M['warnrw'], 0.002)
    schott('Heckfutter', XE + 0.17, heck_cut(XE + 0.17) + 0.2, [], M['i_feld'], dicke=0.0, rahmen=False)
    schott('Schott Cockpit unten', XS0, FL, [], M['i_feld'], dicke=0.06, rahmen=False, ztop=ZC)
    schott('Schott Cockpit', XS0, ZC, [(0.0, 1.2, 1.99)], M['i_feld'], dicke=0.06)
    schott('Schott Technik', XT, FL, [(0.0, 1.2, 2.045)], M['i_feld'], dicke=0.06, ztop=ZC - 0.08)
    CUR[0] = C_IN; text('TECHNIK · KEIN ZUTRITT IM FLUG', 0.06, (XT - 0.04, -1.25, FL + 1.5), (0, 1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Schottschrift')
    # Seitentür (steuerbord) innen: Rahmen, Griff, Warnfeld
    x0, x1, z0, z1 = TUER; xm = (x0 + x1) / 2; yw = -(half_w(xm, (z0 + z1) / 2) - 0.03)
    box('Tuerinnenseite', x1 - x0, 0.05, z1 - z0, xm, yw, (z0 + z1) / 2, M['i_schrank'], 0.01)
    for dx in (-1, 1): box('Tuerrahmen innen', 0.1, 0.1, z1 - z0 + 0.2, xm + dx * (x1 - x0) / 2, yw + 0.03, (z0 + z1) / 2, M['i_rahmen'], 0.01)
    box('Tuersturz innen', x1 - x0 + 0.3, 0.1, 0.1, xm, yw + 0.03, z1 + 0.08, M['i_rahmen'], 0.01); box('Tuerhebel', 0.08, 0.06, 0.4, xm + 0.45, yw + 0.06, (z0 + z1) / 2, M['i_rot'], 0.01)
    box('Tuerwarnung', x1 - x0, 0.012, 0.1, xm, yw + 0.06, z1 + 0.18, M['warnrw'], 0.002)

# =====================================================================================
# Truppenraum
# =====================================================================================
STELL_X = (-8.6,)
def klappsitz(x, s, zf=None):
    zf = FL if zf is None else zf; yw = s * (half_w(x, zf + 1.0) - 0.02); i = -s
    def Y(d): return yw + i * d
    box('Sitzrueckwand', 0.56, 0.05, 0.8, x, Y(0.04), zf + 0.95, M['i_rahmen'], 0.01)
    box('Rueckenpolster', 0.48, 0.08, 0.66, x, Y(0.105), zf + 0.95, M['i_polster'], 0.025)
    box('Kopfstuetze', 0.3, 0.1, 0.22, x, Y(0.11), zf + 1.45, M['i_polster'], 0.03)
    box('Sitzschale', 0.54, 0.46, 0.06, x, Y(0.29), zf + 0.45, M['i_rahmen'], 0.01)
    box('Sitzpolster', 0.48, 0.4, 0.06, x, Y(0.29), zf + 0.51, M['i_polster'], 0.02)
    for sx in (-1, 1):
        rod('Sitzbein', Vector((x + sx * 0.24, Y(0.48), zf + 0.42)), Vector((x + sx * 0.24, Y(0.12), zf + 0.01)), 0.02, M['i_stahl'], 8)
        box('Gurt', 0.05, 0.012, 0.62, x + sx * 0.12, Y(0.15), zf + 0.98, M['i_gurt'], 0.002)
    box('Gurtschloss', 0.09, 0.03, 0.09, x, Y(0.16), zf + 0.72, M['i_stahl'], 0.008)
    box('Beckengurt', 0.42, 0.012, 0.05, x, Y(0.5), zf + 0.58, M['i_gurt'], 0.002)
def truppenraum():
    CUR[0] = C_IN
    S = Sammel('Truppenraum Kleinteile', C_IN)
    x0, x1 = HR_X + 0.05, XS0 - 0.05
    for k in range(int((x1 - x0) / 1.2) + 1):
        xa, xb = x0 + k * 1.2, min(x0 + (k + 1) * 1.2, x1)
        if xb <= xa + 0.05: continue
        w = min(half_w(xa, FL), half_w(xb, FL)) - 0.02
        platten(S, xa, xb, -1.7, 1.7, FL, M['i_boden2'], M['i_fuge'], ma=M['i_boden'], p=1.2, q=0.85)
        for sg in (1, -1): platten(S, xa, xb, (1.75 if sg > 0 else -w), (w if sg > 0 else -1.75), FL, M['i_boden'], M['i_fuge'], p=0.6, q=0.5)
    for sg in (1, -1):
        S.box(x1 - x0, 0.06, 0.006, (x0 + x1) / 2, sg * 1.725, FL + 0.015, M['gelb'])
        for yy in (0.8, 1.5): zurrschiene(S, x0 + 0.3, x1 - 0.3, (sg * yy, FL + 0.013), (0, 0, 1), M['i_rahmen'], M['i_fuge'])
    for xc in STELL_X:
        for dx in (-3.4, 3.4):
            for sg in (1, -1): S.box(0.6, 0.08, 0.004, xc + dx - math.copysign(0.3, dx), sg * 1.95, FL + 0.02, M['gelb']); S.box(0.08, 0.5, 0.004, xc + dx, sg * 1.74, FL + 0.02, M['gelb'])
        CUR[0] = C_IN; text('STELLPLATZ · FAHRZEUG', 0.2, (xc, 0, FL + 0.022), (0, -1, 0), (1, 0, 0), M['gelb'], align='CENTER', name='Bodenschrift')
    # Spanten mit Lichtleisten, dazwischen Netze und Wandkästen
    xs = [-13.4 + k * 2.2 for k in range(11)]
    for x in xs:
        P = querschnitt(x, FL + 0.02, D_IN, 72); rohr_band('Spant', [Vector((x, y, z)) for y, z in P], 0.16, 0.1 if x < XD0 else 0.04, M['i_rahmen'])      # über dem Oberdeck flach (Kopfhöhe)
    for k, (xa, xb) in enumerate(zip(xs, xs[1:])):
        xm = (xa + xb) / 2
        for sg in (1, -1):
            yw = half_w(xm, 4.6)
            if xb > XD0 + 0.3: pass      # vorn stehen Oberdeck und Einbauten
            elif k % 3 == 2:
                S.box(1.0, 0.24, 0.7, xm, sg * (yw - 0.12), 4.9, M['i_schrank']); S.box(0.36, 0.01, 0.2, xm - 0.2, sg * (yw - 0.245), 5.0, M['i_bild'])
                S.box(0.07, 0.012, 0.07, xm + 0.3, sg * (yw - 0.246), 5.0, M['i_petrol'])
            else:
                for j in range(5): S.box(xb - xa - 0.4, 0.015, 0.014, xm, sg * (yw - 0.08), 4.45 + j * 0.25, M['i_netz'])
                for j in range(6): S.box(0.014, 0.015, 1.1, xa + 0.3 + j * (xb - xa - 0.6) / 5, sg * (yw - 0.08), 4.95, M['i_netz'])
            pu = ipt(xm, t_at(xm, 5.75, sg)); S.box(xb - xa - 0.3, 0.06, 0.06, xm, sg * (abs(pu.y) - 0.06), 5.75, M['i_licht'])
            if xb <= XD0 + 0.3:
                for j in range(2): rod('Wandleitung', Vector((xa + 0.2, sg * (yw - 0.07), 4.1 + j * 0.13)), Vector((xb - 0.2, sg * (yw - 0.07), 4.1 + j * 0.13)), 0.035, M['i_rahmen'] if j else M['i_rot'], 10)
    # zwölf Klappsitze (je sechs an einer Wand), Ablage darüber
    for k in range(6):
        x = -4.6 + k * 0.85 + (0.9 if k >= 3 else 0.0)
        for s in (1, -1): klappsitz(x, s, FL + 0.55)
    for s in (1, -1):
        yw = half_w(0.0, FL + 1.6)
        S.box(6.0, 0.05, 0.05, -1.7, s * (yw - 0.03), FL + 0.85, M['i_rahmen']); S.box(6.0, 0.05, 0.05, -1.7, s * (yw - 0.03), FL + 2.2, M['i_rahmen'])
        S.box(6.2, 0.5, 0.04, -1.7, s * (half_w(0.0, FL + 2.6) - 0.26), FL + 2.55, M['i_rahmen'])
        for j in range(8): S.box(0.03, 0.5, 0.25, -4.7 + j * 0.86, s * (half_w(0.0, FL + 2.6) - 0.26), FL + 2.68, M['i_netz'])
        wk = lambda x: half_w(x, FL + 0.55)
        prism('Sitzpodest', [(s * (wk(-1.7) - 0.6), FL), (s * (wk(-1.7) + 0.05), FL), (s * (wk(-1.7) + 0.05), FL + 0.55), (s * (wk(-1.7) - 0.6), FL + 0.55)], -4.95, 1.7, M['i_schrank'], 'X', 0.01)
        S.box(6.6, 0.03, 0.04, -1.6, s * (wk(-1.7) - 0.6), FL + 0.52, M['gelb'])
    # Waffenspinde vorn links (Auslöser „locker“), Systempult vorn rechts (Auslöser „scanner“)
    for k in range(4):
        x = 4.0 + k * 0.62; yw = half_w(x, FL + 1.0)
        S.box(0.6, 0.55, 1.95, x, yw - 0.3, FL + 0.975, M['i_schrank']); S.box(0.54, 0.012, 1.85, x, yw - 0.58, FL + 0.975, M['i_feld'])
        for zz in (FL + 1.65, FL + 1.75): S.box(0.3, 0.01, 0.012, x, yw - 0.587, zz, M['i_dunkel'])
        S.box(0.03, 0.02, 0.16, x + 0.22, yw - 0.592, FL + 1.1, M['i_stahl']); S.box(0.1, 0.012, 0.1, x - 0.15, yw - 0.587, FL + 1.55, M['gelb'])
    ANCH['raum']['locker'] = Vector((5.0, half_w(5.0, FL + 1.0) - 1.3, FL))
    with Part('Systempult', T(5.2, -(half_w(5.2, FL + 1.0) - 0.45), FL), C_IN):
        prism('Pultkoerper', [(-0.35, 0.0), (0.35, 0.0), (0.35, 0.9), (-0.2, 1.2), (-0.35, 1.2)], -0.45, 0.45, M['i_schrank'], 'X', 0.02)
        box('Pultschirm', 0.7, 0.3, 0.012, 0, 0.075, 1.06, M['i_bild'], 0.003, rot=(math.radians(-28.6), 0, 0))
        box('Pultleiste', 0.7, 0.02, 0.04, 0, 0.36, 0.84, M['i_petrol'], 0.003)
    ANCH['raum']['scanner'] = Vector((5.2, -(half_w(5.2, FL + 1.0) - 1.3), FL))
    with Part('Rampenpult', T(HR_X + 0.9, RAMP_HW + 0.45, FL), C_IN):
        box('Rampensaeule', 0.4, 0.4, 1.3, 0, 0, 0.65, M['i_schrank'], 0.02)
        box('Rampenfeld', 0.32, 0.012, 0.4, 0, -0.206, 1.05, M['i_feld'], 0.003)
        cyl('Rampentaster', 0.05, 0.03, 0, -0.22, 1.12, M['i_rot'], 'Y', n=16); box('Rampenanzeige', 0.18, 0.01, 0.08, 0, -0.214, 0.92, M['i_petrol'], 0.002)
        box('Warnsaeule', 0.42, 0.42, 0.12, 0, 0, 0.06, M['warnrw'], 0.01)
    ANCH['raum']['ramp'] = Vector((HR_X + 1.1, RAMP_HW - 0.4, FL))
    CUR[0] = C_IN; text('HECKRAMPE', 0.09, (HR_X + 0.9, RAMP_HW + 0.24, FL + 1.38), (1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Pultschrift')
    # Deckenleuchten im hohen Teil, Rotlicht für den Absprung
    for x in (-12.6, -9.0, -5.4, -1.8, 0.8):
        for sg in (1, -1): lampe(x, sg * 1.4, top_in(x, sg * 1.4) - 0.045, 1.4, 0.2)
    for sg in (1, -1): S.box(0.3, 0.1, 0.1, HR_X + 0.4, sg * 1.9, top_in(HR_X + 0.4, sg * 1.9) - 0.1, M['i_rotlicht'])
    S.fertig()


# =====================================================================================
# Treppe zum Cockpit (mittig, durch das Schott)
# =====================================================================================
def treppe():
    CUR[0] = C_IN
    S = Sammel('Treppe Kleinteile', C_IN)
    xe = XD0 + 0.03; n = int(round((ZC - FL) / 0.2)); dz = (ZC - FL) / n; dx = (xe - TR_X0) / n; ya, yb = -0.6, 0.6
    for k in range(n):
        z = FL + dz * (k + 1); xa = TR_X0 + dx * k
        gitter(S, xa + 0.005, xa + dx + 0.04, ya + 0.02, yb - 0.02, z - 0.03, M['i_gitter'], M['i_schacht'], h=0.03)
        S.box(dx + 0.035, yb - ya - 0.04, 0.025, xa + dx / 2 + 0.02, 0, z - 0.045, M['i_rahmen'])
        S.box(0.04, yb - ya - 0.04, 0.012, xa + 0.025, 0, z + 0.002, M['gelb'])
    A = Vector((TR_X0, 0, FL)); B = Vector((xe, 0, ZC)); u = (B - A).normalized(); nn = Vector((-u.z, 0, u.x))
    for y in (ya - 0.03, yb + 0.03):
        slab('Treppenwange', (A + B) / 2 + Vector((0, y, 0)) - nn * 0.1, u, Vector((0, 1, 0)), ((B - A).length + 0.05, 0.06, 0.3), M['i_rahmen'], 0.008)
        rod('Handlauf', A + Vector((0, y, 0.95)), B + Vector((0, y, 0.95)), 0.025, M['gelb'], 12)
        for k in range(5):
            p = A.lerp(B, 0.04 + k * 0.23) + Vector((0, y, 0.02)); rod('Gelaenderpfosten', p, p + Vector((0, 0, 0.95)), 0.02, M['i_stahl'], 8)
    box('Treppenfuss', 0.9, 1.6, 0.004, TR_X0 - 0.45, 0, FL + 0.016, M['warnrw'], 0.0)
    S.fertig()

# =====================================================================================
# Oberdeck (Mannschaftsdeck) über dem vorderen Truppenraum, auf Höhe des Cockpits: Schützenplatz unter dem Rückenturm, Anzugschränke,
# Kojen, Kombüse und Messe. Nutzer: „Was ist alles im Flieger drin, außer der Bucht für die Truppen und das Cockpit?“
# =====================================================================================
def oberdeck():
    CUR[0] = C_IN
    bm = bmesh.new(); n = int((XS0 - XD0) / 0.15); To = []; Un = []
    for k in range(n + 1):
        x = XD0 + (XS0 - XD0) * k / n; w = half_w(x, ZC - 0.04) + 0.03
        To.append((bm.verts.new((x, -w, ZC - 0.002)), bm.verts.new((x, w, ZC - 0.002)))); Un.append((bm.verts.new((x, -w, ZC - 0.08)), bm.verts.new((x, w, ZC - 0.08))))
    for a, b in zip(To, To[1:]): bm.faces.new((a[0], b[0], b[1], a[1]))
    for a, b in zip(Un, Un[1:]): bm.faces.new((a[1], b[1], b[0], a[0]))
    bm.faces.new((To[0][0], To[0][1], Un[0][1], Un[0][0])); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh_obj('Oberdeck', bm, [M['i_feld']], False, C_IN); CUR[0] = C_IN
    S = Sammel('Oberdeck Kleinteile', C_IN)
    xs = [XD0 + 0.02 + k * 0.6 for k in range(int((XS0 - XD0) / 0.6) + 1)] + [XS0 - 0.03]
    for xa, xb in zip(xs, xs[1:]):
        if xb - xa < 0.05: continue
        w = min(half_w(xa, ZC + 0.01), half_w(xb, ZC + 0.01)) - 0.01; platten(S, xa, xb, -w, w, ZC, M['i_boden'], M['i_fuge'], p=0.6, q=0.75)
    S.box(XS0 - XD0 - 0.5, 1.1, 0.006, (XD0 + XS0) / 2 + 0.1, 0, ZC + 0.015, M['i_dunkel'])
    # Hinterkante: gelbe Kante, Geländer beiderseits der Treppe
    w0 = half_w(XD0, ZC + 0.5)
    S.box(0.08, 2 * w0 - 0.1, 0.1, XD0 + 0.02, 0, ZC - 0.03, M['gelb'])
    for s in (1, -1):
        for zz in (ZC + 0.55, ZC + 1.05): rod('Deckgelaender', Vector((XD0 + 0.06, s * 0.68, zz)), Vector((XD0 + 0.06, s * (w0 - 0.05), zz)), 0.022, M['gelb'] if zz > ZC + 1.0 else M['i_stahl'], 10)
        for yy in (0.68, 1.5, 2.3): rod('Gelaenderpfosten', Vector((XD0 + 0.06, s * yy, ZC)), Vector((XD0 + 0.06, s * yy, ZC + 1.05)), 0.022, M['i_stahl'], 10)
    # Unterseite: flache Leuchten für Waffenkammer und Technik; Oberdeck: flache Deckenleuchten
    for x in (3.0, 5.0, 7.4, 9.2):
        for s in (1, -1): S.box(1.0, 0.18, 0.02, x, s * 1.3, ZC - 0.09, M['i_licht'])
    for x in (2.9, 4.9, 6.9, 8.9):
        for s in (1, -1): S.box(0.9, 0.16, 0.02, x, s * 1.15, top_in(x, s * 1.15) - 0.012, M['i_licht'])
    # Schützenplatz unter dem Rückenturm: Korbring in der Decke, drehbarer Sitz, Richtgriffe, Visierschirm
    xt = TURM[0]; zt = top_in(xt, 0.0)
    cyl('Turmkorbring', 0.78, 0.05, xt, 0, zt - 0.025, M['i_rahmen'], 'Z', n=40, bev=0.01); cyl('Turmkorbgrund', 0.66, 0.02, xt, 0, zt - 0.04, M['i_schacht'], 'Z', n=40)
    ring('Korbring gelb', 0.72, 0.02, (xt, 0, zt - 0.055), (0, 0, 1), M['gelb'], 40)
    with Part('Schuetzenplatz', T(xt, 0, ZC), C_IN):
        cyl('Sitzsaeule', 0.09, 0.42, 0, 0, 0.21, M['i_stahl'], 'Z', n=16); cyl('Drehteller', 0.42, 0.04, 0, 0, 0.03, M['i_rahmen'], 'Z', n=32, bev=0.01)
        box('Schuetzensitz', 0.46, 0.46, 0.08, 0, 0, 0.46, M['i_polster'], 0.02); box('Schuetzenlehne', 0.08, 0.44, 0.62, -0.24, 0, 0.8, M['i_polster'], 0.03)
        box('Kopfteil', 0.1, 0.28, 0.2, -0.24, 0, 1.22, M['i_polster'], 0.03)
        for s in (1, -1):
            rod('Richtarm', Vector((0.05, s * 0.3, 0.5)), Vector((0.42, s * 0.24, 0.92)), 0.02, M['i_stahl'], 8); cyl('Richtgriff', 0.025, 0.14, 0.42, s * 0.24, 0.98, M['i_dunkel'], 'Z', n=10)
            box('Gurt', 0.012, 0.05, 0.5, -0.19, s * 0.12, 0.82, M['i_gurt'], 0.002)
        rod('Visierarm', Vector((-0.05, 0, zt - ZC - 0.05)), Vector((0.5, 0, 1.45)), 0.022, M['i_stahl'], 8)
        box('Visierschirm', 0.03, 0.34, 0.22, 0.52, 0, 1.4, M['i_bild'], 0.004); box('Visierrahmen', 0.05, 0.38, 0.26, 0.535, 0, 1.4, M['i_rahmen'], 0.008)
        box('Fussraste', 0.3, 0.5, 0.03, 0.42, 0, 0.16, M['i_gitter'], 0.005)
    box('Schuetzenmarke', 1.3, 1.3, 0.004, xt, 0, ZC + 0.016, M['warnrw'], 0.0)
    ANCH['schuetze'] = Vector((xt, 0, ZC))
    # Anzugschränke backbord, Geräteregal steuerbord (hinten am Deck)
    for k in range(3):
        x = 2.45 + k * 0.6; yw = half_w(x, ZC + 1.0)
        S.box(0.58, 0.55, 1.9, x, yw - 0.3, ZC + 0.95, M['i_schrank']); S.box(0.52, 0.012, 1.8, x, yw - 0.58, ZC + 0.95, M['i_feld'])
        S.box(0.24, 0.01, 0.3, x, yw - 0.587, ZC + 1.45, M['i_dunkel']); S.box(0.03, 0.02, 0.16, x + 0.2, yw - 0.592, ZC + 0.95, M['i_stahl'])
        S.box(0.1, 0.012, 0.06, x - 0.15, yw - 0.587, ZC + 1.72, M['i_petrol'])
    yw = half_w(3.0, ZC + 1.0)
    for j in range(4):
        zz = ZC + 0.25 + j * 0.45; S.box(1.7, 0.5, 0.03, 3.05, -(yw - 0.27), zz, M['i_rahmen'])
        for i in range(3): S.box(0.42, 0.36, 0.28 if (i + j) % 2 else 0.2, 2.5 + i * 0.55, -(yw - 0.27), zz + (0.155 if (i + j) % 2 else 0.115), (M['i_schrank'], M['i_feld'], M['i_dunkel'])[(i + j) % 3])
    for xx in (2.2, 3.9): S.box(0.04, 0.5, 1.75, xx, -(yw - 0.27), ZC + 0.9, M['i_rahmen'])
    cyl('Feuerloescher', 0.065, 0.4, 4.15, -(yw - 0.1), ZC + 0.5, M['i_rot'], 'Z', n=16, bev=0.015)
    # Kojen: je Seite ein Doppelstock (2,0 m), Vorhangschiene, Leselicht
    for s in (1, -1):
        yw = half_w(5.3, ZC + 0.6); yi = yw - 0.92
        for zz in (ZC + 0.32, ZC + 1.18):
            S.box(2.05, 0.92, 0.07, 5.3, s * (yw - 0.46), zz, M['i_rahmen']); S.box(1.95, 0.8, 0.1, 5.3, s * (yw - 0.46), zz + 0.085, M['i_bett'])
            S.box(0.36, 0.5, 0.07, 6.05, s * (yw - 0.46), zz + 0.17, M['i_wand']); S.box(0.9, 0.78, 0.03, 4.95, s * (yw - 0.47), zz + 0.15, M['i_decke'])
            S.box(2.05, 0.04, 0.16, 5.3, s * (yi + 0.02), zz + 0.09, M['i_rahmen']); S.box(0.3, 0.03, 0.04, 6.1, s * (yw - 0.06), zz + 0.6, M['i_warm'])
        for xx in (4.28, 6.32): S.box(0.05, 0.92, 1.85, xx, s * (yw - 0.46), ZC + 0.93, M['i_schrank'])
        rod('Vorhangschiene', Vector((4.3, s * yi, ZC + 1.92)), Vector((6.3, s * yi, ZC + 1.92)), 0.012, M['i_stahl'], 6)
        for k in range(3): S.box(0.03, 0.03, 0.03, 4.75 + k * 0.5, s * (yi - 0.02), ZC + 0.75, M['i_stahl'])
        for k in range(2): S.box(0.05, 0.04, 0.3, 4.4, s * (yi - 0.02), ZC + 0.5 + k * 0.8, M['i_stahl'])
    ANCH['raum']['bed'] = Vector((5.3, half_w(5.3, ZC + 0.6) - 1.35, ZC))
    # Messe backbord: Tisch mit Bank und Hockern (Auslöser „log“: Einsatzschirm am Tisch); Kombüse steuerbord
    yw = half_w(8.3, ZC + 0.6)
    wandkasten('Messebank', 7.2, 9.4, yw - 0.42, ZC, ZC + 0.45, 1, M['i_schrank']); S.box(2.1, 0.4, 0.07, 8.3, yw - 0.22, ZC + 0.485, M['i_polster'])
    S.box(2.1, 0.07, 0.5, 8.3, yw - 0.045, ZC + 0.8, M['i_polster'])
    with Part('Messetisch', T(8.3, yw - 1.0, ZC), C_IN):
        box('Tischplatte', 1.7, 0.78, 0.05, 0, 0, 0.74, M['i_tisch'], 0.015); cyl('Tischbein', 0.06, 0.72, 0, 0, 0.36, M['i_stahl'], 'Z', n=16); cyl('Tischfuss', 0.3, 0.03, 0, 0, 0.015, M['i_rahmen'], 'Z', n=24)
        box('Einsatzschirm', 0.5, 0.34, 0.012, -0.45, 0.05, 0.772, M['i_bild'], 0.003); box('Tischkante', 1.7, 0.02, 0.02, 0, -0.39, 0.745, M['i_petrol'], 0.003)
        for dx in (0.2, 0.55): cyl('Becher', 0.04, 0.09, dx, 0.1, 0.81, M['i_wand'], 'Z', n=12)
    for dx in (-0.5, 0.5):
        cyl('Hocker', 0.17, 0.05, 8.3 + dx, yw - 1.62, ZC + 0.45, M['i_polster'], 'Z', n=20, bev=0.01); cyl('Hockerbein', 0.04, 0.44, 8.3 + dx, yw - 1.62, ZC + 0.22, M['i_stahl'], 'Z', n=12)
    ANCH['raum']['log'] = Vector((8.3, yw - 1.95, ZC))
    wandkasten('Kombuese', 7.0, 9.7, yw - 0.62, ZC, ZC + 0.9, -1, M['i_schrank'])
    S.box(2.7, 0.64, 0.03, 8.35, -(yw - 0.31), ZC + 0.915, M['i_stahl']); S.box(0.5, 0.4, 0.012, 7.5, -(yw - 0.33), ZC + 0.925, M['i_dunkel'])
    for dx in (-0.12, 0.12): S.cyl(0.07, 0.006, Vector((7.5 + dx, -(yw - 0.33), ZC + 0.936)), (0, 0, 1), M['i_warm'], 16)
    S.box(0.46, 0.36, 0.02, 8.3, -(yw - 0.33), ZC + 0.9, M['i_schacht']); rod('Wasserhahn', Vector((8.3, -(yw - 0.1), ZC + 0.93)), Vector((8.3, -(yw - 0.25), ZC + 1.12)), 0.015, M['i_stahl'], 8)
    S.box(0.3, 0.3, 0.38, 9.2, -(yw - 0.3), ZC + 1.12, M['i_dunkel']); S.box(0.1, 0.01, 0.06, 9.2, -(yw - 0.455), ZC + 1.2, M['i_petrol'])
    for k in range(4): S.box(0.6, 0.012, 0.74, 7.3 + k * 0.68, -(yw - 0.626), ZC + 0.45, M['i_feld']); S.box(0.2, 0.02, 0.03, 7.3 + k * 0.68, -(yw - 0.64), ZC + 0.8, M['i_stahl'])
    wandkasten('Haengeschrank', 7.0, 9.7, yw - 0.38, ZC + 1.42, ZC + 1.9, -1, M['i_schrank'])
    for k in range(4): S.box(0.6, 0.012, 0.42, 7.3 + k * 0.68, -(yw - 0.386), ZC + 1.66, M['i_feld'])
    S.box(2.6, 0.03, 0.03, 8.35, -(yw - 0.4), ZC + 1.4, M['i_licht'])
    S.fertig()

# =====================================================================================
# Unterdeck vorn: Waffenkammer (offen zum Truppenraum, Spinde und Pult stehen schon) und Technikraum hinter dem Schott
# =====================================================================================
exec(compile(open(os.path.join(HIER, '..', 'innen', 'modulplatz.py'), encoding='utf-8').read(), 'modulplatz.py', 'exec'), globals())
def technik():
    CUR[0] = C_IN
    S = Sammel('Technik Kleinteile', C_IN)
    # Waffenständer steuerbord in der Waffenkammer, Werkbank
    yw = half_w(3.0, FL + 1.0)
    S.box(1.8, 0.08, 1.5, 3.2, -(yw - 0.06), FL + 1.05, M['i_dunkel'])
    for k in range(6):
        x = 2.5 + k * 0.28; rod('Gewehrlauf', Vector((x, -(yw - 0.16), FL + 0.5)), Vector((x, -(yw - 0.16), FL + 1.55)), 0.022, M['i_stahl'], 8)
        S.box(0.06, 0.1, 0.34, x, -(yw - 0.17), FL + 0.6, M['i_schrank']); S.box(0.05, 0.07, 0.2, x, -(yw - 0.22), FL + 0.95, M['i_dunkel'])
    for zz in (FL + 0.42, FL + 1.3): S.box(1.8, 0.14, 0.04, 3.2, -(yw - 0.14), zz, M['i_rahmen'])
    S.box(1.8, 0.02, 0.12, 3.2, -(yw - 0.11), FL + 1.75, M['warnrw'])
    # Technikraum x XT … XS0: Energiekern backbord, Lebenserhaltung steuerbord, Schaltschrank an der Stirnwand, Leitungen
    xm = (XT + XS0) / 2
    gitter(S, XT + 0.1, XS0 - 0.1, -0.7, 0.7, FL, M['i_gitter'], M['i_schacht'])
    cx, cy = 7.9, 1.55
    with Part('Energiekern', T(cx, cy, FL), C_IN):
        cyl('Kernsockel', 0.62, 0.22, 0, 0, 0.11, M['i_rahmen'], 'Z', n=40, bev=0.02); cyl('Kernmantel', 0.48, 1.5, 0, 0, 0.97, M['i_dunkel'], 'Z', n=40, bev=0.01)
        for k in range(5): cyl('Kernglut', 0.495, 0.07, 0, 0, 0.42 + k * 0.28, M['i_kern'], 'Z', n=40, bev=0)
        for k in range(8):
            a = 2 * PI * k / 8; rod('Kaefigstab', Vector((0.6 * math.cos(a), 0.6 * math.sin(a), 0.22)), Vector((0.6 * math.cos(a), 0.6 * math.sin(a), 1.76)), 0.02, M['i_stahl'], 8)
        cyl('Kernkappe', 0.62, 0.16, 0, 0, 1.84, M['i_rahmen'], 'Z', n=40, bev=0.02)
        for k in range(3): a = PI * 0.6 + k * 0.5; rod('Kernleitung', Vector((0.4 * math.cos(a), 0.4 * math.sin(a), 1.9)), Vector((0.4 * math.cos(a), 0.4 * math.sin(a), ZC - FL - 0.09)), 0.06, M['i_kupfer'], 12)
    box('Warnfeld Kern', 1.5, 1.5, 0.004, cx, cy, FL + 0.016, M['warnrw'], 0.0)
    ywt = half_w(7.6, FL + 1.0)
    for k, x in enumerate((7.0, 7.75)):
        cyl('Tank', 0.3, 1.5, x, -(ywt - 0.42), FL + 0.9, M['i_feld'], 'Z', n=32, bev=0.05); cyl('Tankkappe', 0.18, 0.1, x, -(ywt - 0.42), FL + 1.7, M['i_rahmen'], 'Z', n=24, bev=0.02)
        for zz in (FL + 0.55, FL + 1.25): box('Tankband', 0.64, 0.64, 0.05, x, -(ywt - 0.42), zz, M['i_rahmen'], 0.01)
        CUR[0] = C_IN; text(('O2', 'N2')[k], 0.11, (x, -(ywt - 0.735), FL + 0.95), (-1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Tankschrift')      # Betrachter im Gang blickt nach −y: liest entlang −x
    with Part('Luftwaescher', T(8.7,-(ywt - 0.45), FL), C_IN):
        box('Waeschergehaeuse', 1.0, 0.7, 1.6, 0, 0, 0.8, M['i_schrank'], 0.03); cyl('Waescherluefter', 0.26, 0.04, 0, 0.36, 1.1, M['i_dunkel'], 'Y', n=24)
        for k in range(6): box('Luefterlamelle', 0.5, 0.02, 0.03, 0, 0.375, 0.9 + k * 0.08, M['i_stahl'], 0.003)
        box('Waescheranzeige', 0.3, 0.012, 0.14, 0.2, 0.356, 1.42, M['i_bild'], 0.003); box('Waescherlicht', 0.08, 0.012, 0.05, -0.3, 0.356, 1.45, M['i_petrol'], 0.002)
    for yy, m_ in ((0.9, 'i_kupfer'), (1.05, 'i_rahmen'), (-1.0, 'i_rahmen'), (-1.15, 'i_rot')):
        rod('Deckenleitung', Vector((XT + 0.1, yy, ZC - 0.16)), Vector((XS0 - 0.1, yy, ZC - 0.16)), 0.035, M[m_], 10)
    S.fertig()
    # Modulplätze (seit 26.11.2026, ../innen/modulplatz.py): Bordsystem 1 und 2 als Einschubgestelle an der Stirnwand neben der Energieverteilung,
    # Abwehrsystem als Schildbock neben dem Energiekern, Antrieb als Reglerkäfig unter den Treibstoffleitungen, Waffensystem als offenes Gestell
    # am Schott zur Waffenkammer (steuerbord: backbord steht der Energiekern davor). Die Module selbst setzt das Spiel ein (Schiffsmodule.glb).
    CUR[0] = C_IN
    FW = Wand((XS0 - 0.03, 0, FL), (-1, 0, 0)); AW = Wand((XT + 0.07, -1.6, FL), (1, 0, 0))
    mp_verteiler(FW)
    ANCH['module'] = {
        'system1': mp_gestell(FW, -1.1, 'BORDSYSTEM 1'), 'system2': mp_gestell(FW, 1.1, 'BORDSYSTEM 2'),
        'abwehr': mp_schildbock(9.4, 2.2, FL, ZC - 0.09, quelle=(8.36, 1.82)),
        'antrieb': mp_regler(9.72, -2.15, FL, ZC - 0.16, leitungen=((-0.2, 'i_rot', -1.15), (0.05, 'i_rahmen', -1.0))),
        'waffe': mp_gestell(AW, 0, 'WAFFENSYSTEM', offen=True),
    }
    # Gurtkanal vom Waffengestell zur Decke (weiter zum Rückenturm), Bodenmarken vor den Plätzen
    AW.box('Gurtkanal', 0.3, 0.2, ZC - 0.08 - FL - 1.9 + 0.02, -0.3, 0.25, (1.9 + ZC - 0.08 - FL) / 2, M['i_rahmen'], 0.01)
    for k in range(3): AW.box('Kanalrippe', 0.32, 0.22, 0.02, -0.3, 0.25, 1.93 + k * 0.045, M['i_stahl'], 0.003)
    for W_, u0, bw in ((FW, -1.1, 1.24), (FW, 1.1, 1.24), (AW, 0, 1.3)):
        for sg in (1, -1): W_.box('Bodenmarke', 0.03, 0.7, 0.004, u0 + sg * bw / 2, 0.9, 0.012, M['gelb'], 0.0)
        W_.box('Bodenmarke', bw, 0.03, 0.004, u0, 1.25, 0.012, M['gelb'], 0.0)

def innen_lichter():
    for x in (-11.0, -6.0, -1.0): point('Truppenraumlicht', (x, 0, 5.6), 260, (0.95, 0.97, 1.0), 0.3)
    point('Waffenkammerlicht', (4.0, 0, FL + 1.7), 60, (0.95, 0.97, 1.0), 0.2); point('Techniklicht', (8.3, 0, FL + 1.7), 50, (0.7, 0.9, 1.0), 0.2)
    for x in (3.4, 6.2, 8.8): point('Oberdecklicht', (x, 0, ZC + 1.8), 70, (1.0, 0.92, 0.8), 0.2)
    point('Rotlicht', (HR_X + 0.5, 0, 5.4), 40, (1.0, 0.2, 0.1), 0.2)

huelle(); truppenraum(); treppe(); oberdeck(); technik(); innen_lichter()
for o in C_IN.all_objects: o['innen'] = 1
cam('Truppenraum', (-13.0, -1.6, 4.0), (6.0, 0.6, 3.6), 16); cam('Truppenraum2', (9.2, 1.8, 4.2), (-10.0, -0.6, 3.4), 16)
cam('Treppe', (-4.5, -1.4, 3.7), (2.5, 0.0, 4.4), 16)
cam('Oberdeck', (2.3, -1.9, ZC + 1.6), (9.5, 1.2, ZC + 0.9), 16); cam('Oberdeck2', (9.9, 1.4, ZC + 1.6), (3.0, -1.0, ZC + 0.8), 16)
cam('Technik', (6.5, -0.4, FL + 1.6), (9.8, 1.2, FL + 0.9), 16); cam('Waffenkammer', (0.5, 0.9, FL + 1.6), (5.5, -0.6, FL + 1.0), 16)
IN_VIEWS = {
    'in_truppenraum': ('Truppenraum', 'grau', True, 0.0, 0.0, {'rampe': 1.0}), 'in_truppenraum2': ('Truppenraum2', 'grau', True, 0.0, 0.0, {'rampe': 1.0}),
    'in_treppe': ('Treppe', 'grau', True, 0.0, 0.0, {}), 'in_oberdeck': ('Oberdeck', 'grau', True, 0.0, 0.0, {}), 'in_oberdeck2': ('Oberdeck2', 'grau', True, 0.0, 0.0, {}),
    'in_technik': ('Technik', 'grau', True, 0.0, 0.0, {}), 'in_waffenkammer': ('Waffenkammer', 'grau', True, 0.0, 0.0, {}),
}
