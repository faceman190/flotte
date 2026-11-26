# Kranich: Innenraum (wird von kra_kit.py in build() ausgeführt, mit dessen Namensraum).
# Grundsatz (Wunsch des Nutzers: „alles im Modell passen, den kompletten Raum innen ausnutzen, keine Lücken lassen“):
#  - Die Innenhaut ist der Rumpf, um D_IN nach innen versetzt (gleiche Spanten). Wände und Decken folgen damit genau der Außenform.
#  - Der Boden ist ein Vieleck mit dem genauen Umriss der Innenhaut auf Bodenhöhe; die Platten liegen darauf. Darunter sieht man nichts.
#  - Schotten haben den Querschnitt der Innenhaut an ihrer Stelle, mit Türöffnungen. Abgehängte Decken schließen an die Haut an.
#  - Alles, was innen steht, schließt an Haut, Boden oder Schott an (Kojen, Schränke, Pulte, Rohre).
# Räume von hinten nach vorn (Boden FL = 2,35, im Cockpit FLC = 2,92):
#  Laderaum x −15,4 … −3,0 (Heckrampe, Zurrschienen, Netze, Kran, Spinde, Stellplatz für einen Wiesel, zwei Kistenreihen)
#  Technik  x −3,0 … 1,4 (Energiekern mit Leitungen, Lebenserhaltung, Werkbank, Wartungsgang)
#  Wohnteil x 1,4 … 8,6 (Gang in der Mitte; links Kabine mit zwei Kojen, Schrank, Schreibplatz, rechts Kombüse mit Tisch; vorn Waschzelle
#           und Anzugschrank; Bullaugen auf beiden Seiten)
#  Cockpit  x 8,6 … 14 (kra_cockpit.py)
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
M['i_bett'] = mk('Bettzeug', (0.26, 0.035, 0.028), 0.0, 0.9, var=0.12, scale=6.0, bump=0.35, bscale=140)
M['i_decke'] = mk('Wolldecke', (0.12, 0.125, 0.13), 0.0, 0.92, var=0.15, scale=6.0, bump=0.4, bscale=160)
M['i_tisch'] = mk('Tischplatte', (0.19, 0.185, 0.17), 0.1, 0.4, var=0.08, scale=3.0, wear=0.4)
M['i_rot'] = mk('Lack rot', (0.3, 0.02, 0.015), 0.25, 0.42, var=0.1, wear=0.6)
M['i_licht'] = mk('Deckenlicht', (0.9, 0.95, 1.0), 0, 0.3, var=0, rvar=0, emit=(0.92, 0.96, 1.0), es=6.0, grime=False)
M['i_warm'] = mk('Ambientlicht', (1.0, 0.6, 0.3), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.55, 0.22), es=4.0, grime=False)
M['i_petrol'] = mk('Licht petrol', (0.2, 0.9, 0.85), 0, 0.3, var=0, rvar=0, emit=(0.25, 0.95, 0.9), es=4.0, grime=False)
M['i_kern'] = mk('Kernglut', (0.3, 0.8, 1.0), 0, 0.2, var=0, rvar=0, emit=(0.35, 0.8, 1.0), es=12.0, grime=False)
M['i_stahl'] = mk('Stahl blank', (0.5, 0.51, 0.53), 1.0, 0.25, var=0.05, grime=False)
M['i_kupfer'] = mk('Kupfer', (0.45, 0.2, 0.09), 1.0, 0.3, var=0.08, wear=0.5)
M['i_schrank'] = mk('Schrank', (0.2, 0.205, 0.21), 0.3, 0.45, var=0.06, scale=3.0, wear=0.3)
M['i_fliese'] = mk('Fliesen', (0.42, 0.43, 0.43), 0.1, 0.3, var=0.04, scale=3.0, bump=0.2, bscale=60)
M['i_bild'] = M['mfd']
C_IN = C_ROOM
D_IN = 0.17                      # Wandstärke: Abstand Innenhaut – Außenhaut
X_LADE0, X_LADE1 = XE + 0.17, -3.0
X_TECH1, X_WOHN1 = 1.4, 8.6
GANG = 0.68                      # halbe Gangbreite im Wohnteil
DECKE = FL + 2.3                 # abgehängte Decke in Gang und Kabinen
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

# ---------- Fensterlöcher (Bullaugen des Wohnteils, wie außen in kra_kit.py cabin_windows) ----------
FENSTER = KAB_FENSTER
def im_fenster(c): return abs(c.y) > 1.2 and in_fenster(c.x, c.z, 0.04)
def fenster_laibung(a, b, s):
    """Laibung durch die Wand: Flansch auf der Innenhaut (deckt die gestuften Lochkanten ab) und Röhre bis zur Außenhaut, gleiche Form wie das Glas"""
    A = fenster_umriss(a, b, 0.06); B = fenster_umriss(a, b, -0.07)
    def inn(x, z, lift): t = t_at(x, z, s); return ipt(x, t) - hull_normal(x, t) * lift
    bm = bmesh.new()
    rb = [bm.verts.new(inn(x, z, 0.012)) for x, z in B]; ra = [bm.verts.new(inn(x, z, 0.012)) for x, z in A]
    ro = [bm.verts.new(hull_point(x, t_for_z(x, z, s)) - hull_normal(x, t_for_z(x, z, s)) * 0.004) for x, z in A]
    n = len(A); xm, zm = (a + b) / 2, sum(KAB_Z) / 2
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((rb[i], rb[j], ra[j], ra[i])); f.normal_update()
        if f.normal.y * s > 0: f.normal_flip()
        f = bm.faces.new((ra[i], ra[j], ro[j], ro[i])); f.normal_update(); c = f.calc_center_median()
        if f.normal.dot(Vector((xm - c.x, 0, zm - c.z))) < 0: f.normal_flip()
    mesh_obj('Fensterlaibung', bm, [M['i_rahmen']], False, C_IN)
    xm = (a + b) / 2; t = t_at(xm, KAB_Z[0] - 0.09, s); p = ipt(xm, t)
    box('Fensterbank', b - a + 0.1, 0.16, 0.035, xm, s * (abs(p.y) - 0.07), KAB_Z[0] - 0.09, M['i_rahmen'], 0.008)

# =====================================================================================
# Hülle innen: Haut, Böden, Schotten, Decken
# =====================================================================================
def huelle():
    fl = lambda x: FL
    schale('Innenhaut Laderaum', X_LADE0, X_LADE1, fl, M['i_wand'])
    schale('Innenhaut Technik', X_LADE1, X_TECH1, fl, M['i_feld'])
    schale('Innenhaut Wohnteil', X_TECH1, X_WOHN1, fl, M['i_wand'], loch=im_fenster)
    boden_umriss('Bodengrund', X_LADE0, X_WOHN1, FL, M['i_schacht'])
    # Heckseite innen: Futter der Heckplatte mit Rampenöffnung (Fläche nach vorn)
    hw, z0, z1 = RAMP
    schott('Heckfutter', X_LADE0, FL, [(0.0, 2 * hw, z1 - z0)], M['i_feld'], dicke=0.0, rahmen=False)
    # Laibung der Rampenöffnung zwischen Heckplatte und Futter
    for sg in (1, -1): box('Rampenlaibung', X_LADE0 - XE + 0.02, 0.06, z1 - z0, (XE + X_LADE0) / 2, sg * (hw + 0.03), (z0 + z1) / 2, M['i_rahmen'], 0.006)
    box('Rampenlaibung oben', X_LADE0 - XE + 0.02, 2 * hw + 0.12, 0.06, (XE + X_LADE0) / 2, 0, z1 + 0.03, M['i_rahmen'], 0.006)
    # Schotten: Laderaum/Technik (breites Tor), Technik/Wohnteil (Tür), Wohnteil/Cockpit macht kra_cockpit.py
    schott('Schott Laderaum', X_LADE1, FL, [(0.0, 1.9, 2.25)], M['i_feld'])
    schott('Schott Technik', X_TECH1, FL, [(0.0, 1.05, 2.1)], M['i_feld'])
    tuerschild(X_LADE1, -1, 0.0, FL + 2.45, 'TECHNIK · WOHNTEIL'); tuerschild(X_TECH1, -1, 0.0, FL + 2.3, 'WOHNTEIL · COCKPIT')
    # Bullaugen: Laibung durch die Wand bis zum Glas
    for s in (1, -1):
        for a, b in FENSTER: fenster_laibung(a, b, s)

# =====================================================================================
# Laderaum
# =====================================================================================
LADE_STELL = -8.4      # Mitte des Fahrzeugstellplatzes (Wiesel, 4,3 m)
def laderaum():
    S = Sammel('Laderaum Kleinteile', C_IN)
    x0, x1 = X_LADE0 + 0.05, X_LADE1 - 0.05; w = half_w(-8.0, FL)
    # Boden: Mittelbahn (hell, Platten), seitlich Kistenbahnen mit Rollen, Zurrschienen
    platten(S, x0, x1, -1.25, 1.25, FL, M['i_boden2'], M['i_fuge'], ma=M['i_boden'], p=1.25, q=1.25)
    for sg in (1, -1):
        platten(S, x0, x1, (1.3 if sg > 0 else -w + 0.02), (w - 0.02 if sg > 0 else -1.3), FL, M['i_boden'], M['i_fuge'], p=1.0, q=0.6)
        zurrschiene(S, x0 + 0.2, x1 - 0.2, (sg * 1.27, FL + 0.013), (0, 0, 1), M['i_rahmen'], M['i_fuge'])
        for x in [x0 + 0.5 + k * 0.6 for k in range(int((x1 - x0 - 1.0) / 0.6) + 1)]:      # Rollenbahn
            S.cyl(0.035, 1.0, Vector((x, sg * (1.3 + (w - 1.3) / 2), FL + 0.04)), (0, 1, 0), M['i_stahl'], 10)
        S.box(x1 - x0, 0.05, 0.06, (x0 + x1) / 2, sg * 1.31, FL + 0.03, M['gelb'])      # Kante der Kistenbahn
    # Stellplatz: gelbe Ecken, Schrift
    for dx in (-2.2, 2.2):
        for sg in (1, -1):
            S.box(0.5, 0.06, 0.004, LADE_STELL + dx - math.copysign(0.25, dx), sg * 1.15, FL + 0.014, M['gelb']); S.box(0.06, 0.4, 0.004, LADE_STELL + dx, sg * 0.97, FL + 0.014, M['gelb'])
    CUR[0] = C_IN; text('STELLPLATZ · FAHRZEUG', 0.16, (LADE_STELL, 0, FL + 0.016), (0, 1, 0), (-1, 0, 0), M['gelb'], align='CENTER', name='Bodenschrift')
    # Spanten: dem Querschnitt folgende Rahmen alle 1,55 m, dazwischen Wandfelder mit Details, Lichtband oben
    xs = [x0 + 0.6 + k * 1.55 for k in range(8)]
    for x in xs:
        P = querschnitt(x, FL + 0.02, D_IN + 0.0, 40)
        pts = [Vector((x, y, z)) for y, z in P]
        rohr_band('Spant', pts, 0.12, 0.08, M['i_rahmen'])
    for k, (xa, xb) in enumerate(zip(xs, xs[1:])):
        for sg in (1, -1):
            # Wandfeld unten (senkrechter Teil) mit Netz oder Gerät
            xm = (xa + xb) / 2; p = ipt(xm, t_at(xm, FL + 1.0, sg)); yw = abs(p.y)
            if k % 2 == 0:      # Frachtnetz
                for j in range(6): S.box(xb - xa - 0.25, 0.015, 0.012, xm, sg * (yw - 0.06), FL + 0.35 + j * 0.3, M['i_dunkel'])
                for j in range(5): S.box(0.012, 0.015, 1.55, xa + 0.2 + j * (xb - xa - 0.4) / 4, sg * (yw - 0.06), FL + 1.1, M['i_dunkel'])
                for zz in (FL + 0.3, FL + 1.9):
                    for xx in (xa + 0.2, xb - 0.2): S.cyl(0.03, 0.06, Vector((xx, sg * (yw - 0.04), zz)), (0, 1, 0), M['gelb'], 8)
            else:              # Wandkasten mit Anzeige und Griffen
                S.box(0.8, 0.22, 0.6, xm, sg * (yw - 0.11), FL + 1.35, M['i_schrank'])
                S.box(0.3, 0.01, 0.16, xm - 0.15, sg * (yw - 0.225), FL + 1.45, M['i_bild']); S.box(0.06, 0.012, 0.06, xm + 0.25, sg * (yw - 0.226), FL + 1.45, M['i_petrol'])
                S.box(0.5, 0.03, 0.03, xm, sg * (yw - 0.24), FL + 1.1, M['i_stahl'])
            # Lichtband an der oberen Kante
            pu = ipt(xm, t_at(xm, 5.55, sg)); S.box(xb - xa - 0.2, 0.05, 0.05, xm, sg * (abs(pu.y) - 0.05), 5.55, M['i_licht'])
    # Kranschiene unter der Decke mit Laufkatze und Kettenzug
    zt = ipt(-8.0, 0.0).z - 0.05
    S.box(x1 - x0 - 0.6, 0.22, 0.16, (x0 + x1) / 2, 0, zt - 0.08, M['gelb'])
    S.box(0.4, 0.3, 0.18, -6.0, 0, zt - 0.25, M['i_rahmen']); S.cyl(0.08, 0.3, Vector((-6.0, 0, zt - 0.45)), (0, 0, 1), M['i_dunkel'], 12)
    for k in range(10): S.box(0.03, 0.05, 0.08, -6.0, 0, zt - 0.6 - k * 0.09, M['i_stahl'])
    S.box(0.18, 0.06, 0.12, -6.0, 0, zt - 1.55, M['gelb'])
    for x in (x0 + 0.8, -10.0, -6.5, x1 - 0.8): S.box(0.12, 0.6, 0.1, x, 0, zt - 0.02, M['i_rahmen'])
    # Deckenleuchten
    for x in (-13.6, -10.4, -7.2, -4.4):
        for sg in (1, -1): lampe(x, sg * 1.2, top_in(x, sg * 1.2) - 0.045, 1.0, 0.18)
    # Spinde an der Vorderwand links (Auslöser „locker“), Werkzeugwand rechts
    for k in range(4):
        x = X_LADE1 - 0.36; y = 1.45 + k * 0.42
        if y > half_w(x, FL + 2.0) - 0.15: continue
        S.box(0.5, 0.4, 2.0, x, y, FL + 1.0, M['i_schrank']); S.box(0.012, 0.36, 1.92, x - 0.256, y, FL + 1.0, M['i_feld'])
        for zz in (FL + 1.7, FL + 1.78, FL + 1.86): S.box(0.01, 0.2, 0.012, x - 0.263, y, zz, M['i_dunkel'])
        S.box(0.02, 0.03, 0.14, x - 0.27, y - 0.14, FL + 1.05, M['i_stahl'])
    ANCH['raum']['locker'] = Vector((X_LADE1 - 1.2, 1.9, FL))
    for k in range(3):
        y = -1.5 - k * 0.5; x = X_LADE1 - 0.06
        S.box(0.04, 0.46, 1.1, x, y, FL + 1.35, M['i_dunkel'])
        for j in range(4): S.box(0.08, 0.03, 0.2 + 0.05 * j, x - 0.06, y - 0.15 + j * 0.1, FL + 1.5, M['i_stahl'])
    # Rampenbedienung innen neben der Öffnung, Warnmarken am Rand
    S.box(0.08, 0.3, 0.42, X_LADE0 + 0.06, RAMP[0] + 0.35, FL + 1.25, M['i_schrank']); S.box(0.01, 0.12, 0.12, X_LADE0 + 0.105, RAMP[0] + 0.35, FL + 1.35, M['i_rot'])
    S.box(0.01, 0.12, 0.06, X_LADE0 + 0.105, RAMP[0] + 0.35, FL + 1.15, M['i_petrol'])
    for sg in (1, -1): S.box(0.02, 0.18, RAMP[2] - RAMP[1], X_LADE0 + 0.05, sg * (RAMP[0] + 0.12), (RAMP[1] + RAMP[2]) / 2, M['warnrw'])
    S.fertig()
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
# Technik: Energiekern, Lebenserhaltung, Werkbank
# =====================================================================================
def technik():
    S = Sammel('Technik Kleinteile', C_IN)
    x0, x1 = X_LADE1 + 0.05, X_TECH1 - 0.05
    gitter(S, x0, x1, -0.85, 0.85, FL, M['i_gitter'], M['i_schacht'])
    for sg in (1, -1):
        w = wmin(x0, x1, FL, FL + 0.03); platten(S, x0, x1, (0.88 if sg > 0 else -w + 0.02), (w - 0.02 if sg > 0 else -0.88), FL, M['i_boden'], M['i_fuge'], p=0.9, q=0.7)
        S.box(x1 - x0, 0.04, 0.05, (x0 + x1) / 2, sg * 0.87, FL + 0.025, M['gelb'])
    # Energiekern links: Zylinder mit Glutringen in einem Käfig, Leitungen in Boden und Decke
    cx, cy = -0.8, 1.75; ztop = ipt(cx, t_at(cx, 5.5, 1)).z
    with Part('Energiekern', T(cx, cy, FL), C_IN):
        cyl('Kernsockel', 0.7, 0.25, 0, 0, 0.125, M['i_rahmen'], 'Z', n=40, bev=0.02)
        cyl('Kernmantel', 0.55, 2.2, 0, 0, 1.35, M['i_dunkel'], 'Z', n=40, bev=0.01)
        for k in range(6): cyl('Kernglut', 0.565, 0.08, 0, 0, 0.55 + k * 0.32, M['i_kern'], 'Z', n=40, bev=0)
        for k in range(8):
            a = 2 * PI * k / 8; rod('Kaefigstab', Vector((0.68 * math.cos(a), 0.68 * math.sin(a), 0.25)), Vector((0.68 * math.cos(a), 0.68 * math.sin(a), 2.45)), 0.022, M['i_stahl'], 8)
        cyl('Kernkappe', 0.7, 0.2, 0, 0, 2.55, M['i_rahmen'], 'Z', n=40, bev=0.02)
        for k in range(3):
            a = PI * 0.6 + k * 0.5; rod('Kernleitung', Vector((0.45 * math.cos(a), 0.45 * math.sin(a), 2.6)), Vector((0.45 * math.cos(a), 0.45 * math.sin(a), ztop - FL - 0.05)), 0.07, M['i_kupfer'], 12)
    box('Warnfeld Kern', 1.6, 1.6, 0.004, cx, cy, FL + 0.014, M['warnrw'], 0.0)
    # Pult vor dem Kern (Auslöser „scanner“: Systemanzeige)
    with Part('Kernpult', T(cx + 1.15, 1.2, FL), C_IN):
        prism('Pultkoerper', [(-0.3, 0.0), (0.3, 0.0), (0.3, 0.9), (0.05, 1.1), (-0.3, 1.0)], -0.35, 0.35, M['i_schrank'], 'Y', 0.02)
        box('Pultschirm', 0.26, 0.6, 0.012, 0.18, 0, 1.008, M['i_bild'], 0.003, rot=(0, math.radians(38.7), 0))
    ANCH['raum']['scanner'] = Vector((cx + 1.7, 1.2, FL))
    # Lebenserhaltung rechts: zwei Tanks, Luftwäscher mit Lüfter, Wassertank, Rohre
    for k, x in enumerate((-2.3, -1.5)):
        cyl('Tank', 0.32, 1.6, x, -2.3, FL + 0.95, M['i_feld'], 'Z', n=32, bev=0.05); cyl('Tankkappe', 0.2, 0.1, x, -2.3, FL + 1.8, M['i_rahmen'], 'Z', n=24, bev=0.02)
        box('Tankband', 0.68, 0.68, 0.06, x, -2.3, FL + 0.6, M['i_rahmen'], 0.01); box('Tankband', 0.68, 0.68, 0.06, x, -2.3, FL + 1.3, M['i_rahmen'], 0.01)
        CUR[0] = C_IN; text(('O2', 'N2')[k], 0.12, (x - 0.33, -2.3, FL + 1.0), (0, 1, 0), (0, 0, 1), M['txtd'], align='CENTER', name='Tankschrift')
    with Part('Luftwaescher', T(-0.3, -2.15, FL), C_IN):
        box('Waeschergehaeuse', 1.0, 0.7, 1.7, 0, 0, 0.85, M['i_schrank'], 0.03)
        cyl('Luefter', 0.28, 0.06, 0, 0.36, 1.2, M['i_dunkel'], 'Y', n=32)
        for k in range(5): box('Luefterlamelle', 0.5, 0.02, 0.025, 0, 0.395, 1.0 + k * 0.1, M['i_stahl'], 0.002)
        box('Waescheranzeige', 0.3, 0.012, 0.16, 0.25, 0.356, 0.6, M['i_bild'], 0.003)
    # Werkbank rechts vorn mit Werkzeugwand
    with Part('Werkbank', T(0.85, -2.0, FL), C_IN):
        box('Werkbankplatte', 0.9, 0.7, 0.05, 0, 0, 0.92, M['i_tisch'], 0.01)
        box('Werkbankunterbau', 0.86, 0.6, 0.85, 0, 0.03, 0.45, M['i_schrank'], 0.02)
        for k in range(3): box('Schublade', 0.8, 0.012, 0.22, 0, -0.275, 0.2 + k * 0.26, M['i_feld'], 0.004)
        box('Schraubstock', 0.18, 0.12, 0.12, 0.25, 0.1, 1.0, M['i_rahmen'], 0.01)
    # Leitungsbündel an der Decke über dem Gang
    zt = min(ipt(x0, 0.0).z, ipt(x1, 0.0).z)      # vorn fällt der Rücken zum Hals ab
    for k, (m, yy) in enumerate((('i_kupfer', -0.35), ('i_rot', -0.2), ('i_stahl', 0.2), ('i_rahmen', 0.35))):
        rod('Deckenleitung', Vector((x0, yy, zt - 0.32 - (k % 2) * 0.08)), Vector((x1, yy, zt - 0.32 - (k % 2) * 0.08)), 0.05, M[m], 12)
    for x in (x0 + 0.5, (x0 + x1) / 2, x1 - 0.5): box('Leitungshalter', 0.06, 1.0, 0.04, x, 0, zt - 0.22, M['i_rahmen'], 0.005)
    for x in (-2.2, 0.6): lampe(x, 0, zt - 0.12, 0.9, 0.16)
    S.fertig()

# =====================================================================================
# Wohnteil: Gang, Kabine, Kombüse, Waschzelle, Anzugschrank
# =====================================================================================
def wand_y(name, x0, x1, y, z0, z1, m, tueren=(), dicke=0.06):
    """senkrechte Trennwand bei y (x0 … x1) mit Türöffnungen (xc, Breite, Höhe)"""
    cuts = sorted(tueren); xa = x0
    for xc, w, h in cuts:
        if xc - w / 2 > xa: box(name, xc - w / 2 - xa, dicke, z1 - z0, (xa + xc - w / 2) / 2, y, (z0 + z1) / 2, m, 0.008)
        box(name + ' Sturz', w, dicke, z1 - z0 - h, xc, y, z0 + h + (z1 - z0 - h) / 2, m, 0.008)
        for sg in (1, -1): box('Tuerrahmen', 0.06, dicke + 0.05, h, xc + sg * (w / 2 + 0.03), y, z0 + h / 2, M['i_rahmen'], 0.008)
        box('Tuerlicht', w * 0.7, dicke + 0.055, 0.02, xc, y, z0 + h + 0.06, M['i_petrol'], 0.004)
        xa = xc + w / 2
    if x1 > xa: box(name, x1 - xa, dicke, z1 - z0, (xa + x1) / 2, y, (z0 + z1) / 2, m, 0.008)
def decke_abgehaengt(x0, x1, y0, y1, z, m):
    """abgehängte Decke von Wand zu Wand (in der Breite bis zur Innenhaut), darüber ein Abschluss zur Haut"""
    box('Decke', x1 - x0, y1 - y0, 0.05, (x0 + x1) / 2, (y0 + y1) / 2, z + 0.025, m, 0.006)
def wohnteil():
    S = Sammel('Wohnteil Kleinteile', C_IN)
    x0, x1 = X_TECH1 + 0.05, X_WOHN1 - 0.05
    # Gang: Platten, Laufstreifen, Wände mit Türen, abgehängte Decke mit Licht
    platten(S, x0, x1, -GANG, GANG, FL, M['i_boden2'], M['i_fuge'], p=0.9, q=0.68)
    for sg in (1, -1): S.box(x1 - x0, 0.03, 0.005, (x0 + x1) / 2, sg * (GANG - 0.08), FL + 0.015, M['i_warm'])
    wand_y('Gangwand links', x0, x1, GANG + 0.03, FL, DECKE, M['i_wand'], [(4.9, 0.85, 2.05), (7.6, 0.75, 2.05)])
    wand_y('Gangwand rechts', x0, 6.05, -(GANG + 0.03), FL, DECKE, M['i_wand'], [(2.4, 1.6, 2.15)])
    wand_y('Gangwand rechts vorn', 6.05, x1, -(GANG + 0.03), FL, DECKE, M['i_wand'], [(7.2, 0.75, 2.05)])
    # Decken: im Gang Lichtfeld, darüber bis zur Haut geschlossen (Hautstücke oberhalb von DECKE sind die Haut selbst)
    for xx0, xx1 in ((x0, x1),):
        w = half_w((xx0 + xx1) / 2, DECKE)
        decke_abgehaengt(xx0, xx1, -w + 0.02, w - 0.02, DECKE, M['i_feld'])
    for x in (2.6, 4.6, 6.6): lampe(x, 0, DECKE - 0.005, 1.2, 0.22)
    deckenraster(S, x0, x1, -GANG, GANG, DECKE, M['i_rahmen'], p=1.0)
    for y, n, segs in ((GANG, -1, [(x0, 4.42), (5.38, 7.18), (7.98, x1)]), (-GANG, 1, [(3.27, 6.05), (6.05, 6.78), (7.62, x1)])):
        for k, (s0, s1) in enumerate(segs):
            for j, (a_, b_) in enumerate(((s0, (s0 + s1) / 2), ((s0 + s1) / 2, s1)) if s1 - s0 > 1.6 else ((s0, s1),)):
                wandfeld(S, (0, y, 0), (1, 0, 0), (0, n, 0), a_ + 0.04, b_ - 0.04, FL + 0.12, DECKE - 0.12, k * 2 + j + (1 if n > 0 else 0), M['i_feld'], M['i_rahmen'], M['i_dunkel'], M['i_stahl'], M['mfd'])
    for x in (2.2, 4.0, 5.8, 7.6):      # Deckenraster in den Räumen
        for sg in (1, -1): lampe(x, sg * 1.45, DECKE - 0.005, 0.5, 0.12, 'i_warm')
    # Bodenplatten der Räume
    for sg in (1, -1):
        w = wmin(x0, x1, FL, FL + 0.03); platten(S, x0, x1, (GANG + 0.06 if sg > 0 else -w + 0.02), (w - 0.02 if sg > 0 else -GANG - 0.06), FL, M['i_boden'], M['i_fuge'], p=0.8, q=0.8)
    # ---- Kabine links (x 1,45 … 6,15): zwei Kojen an der Außenwand, Schrank, Schreibplatz unter dem Bullauge
    ywand = lambda x, z: half_w(x, z)
    with Part('Kojen', T(0, 0, 0), C_IN):
        for k, zb in enumerate((FL + 0.42, FL + 1.38)):
            xa, xb = 1.55, 3.75; yo = wmin(xa, xb, zb - 0.06, zb + 0.35) - 0.02; yi = GANG + 0.1 + 0.95 if False else max(GANG + 0.12, yo - 0.92)
            box('Kojenrahmen', xb - xa, yo - yi, 0.1, (xa + xb) / 2, (yo + yi) / 2, zb, M['i_rahmen'], 0.01)
            box('Matratze', xb - xa - 0.1, yo - yi - 0.08, 0.14, (xa + xb) / 2, (yo + yi) / 2, zb + 0.12, M['i_polster'], 0.04)
            box('Bettdecke', (xb - xa) * 0.62, yo - yi - 0.06, 0.06, xa + (xb - xa) * 0.6, (yo + yi) / 2, zb + 0.22, M['i_bett'], 0.03)
            box('Kissen', 0.42, (yo - yi) * 0.6, 0.12, xa + 0.3, (yo + yi) / 2 + 0.05, zb + 0.24, M['i_decke'], 0.05)
            box('Kojenlicht', 0.2, 0.06, 0.05, xa + 0.35, yo - 0.08, zb + 0.75, M['i_warm'], 0.01)
            box('Kojenkante', xb - xa, 0.05, 0.12, (xa + xb) / 2, yi, zb + 0.12, M['i_rot'], 0.01)
            box('Kojenvorhang', (xb - xa) * 0.35, 0.02, 0.75, xb - 0.38, yi + 0.02, zb + 0.55, M['i_decke'], 0.005)
        for xx in (1.52, 3.78): box('Kojenstuetze', 0.06, 0.06, 2.1, xx, GANG + 0.16, FL + 1.05, M['i_rahmen'], 0.01)
        for k in range(5): box('Leitersprosse', 0.04, 0.4, 0.03, 3.6, GANG + 0.35, FL + 0.6 + k * 0.25, M['i_stahl'], 0.005)
    ANCH['raum']['bed'] = Vector((2.65, GANG + 0.6, FL))
    # Schrank zwischen Koje und Tür
    ws = wmin(6.645, 7.195, FL, FL + 2.15)
    wandkasten('Schrank', 6.645, 7.195, GANG + 0.12, FL, FL + 2.15, 1, M['i_schrank']); S.box(0.012, ws - GANG - 0.2, 2.05, 6.64, (ws + GANG + 0.12) / 2, FL + 1.075, M['i_feld'])
    for zz in (FL + 1.0, FL + 1.1): S.box(0.02, 0.03, 0.14, 6.625, GANG + 0.25, zz, M['i_stahl'])
    # Schreibplatz unter dem vorderen Bullauge (Auslöser „log“): Tisch an der Wand, Stuhl, Bildschirm, Lampe
    yw = wmin(5.0, 6.1, FL, FL + 0.8)
    with Part('Schreibplatz', T(5.55, yw - 0.32, FL), C_IN):
        box('Schreibtisch', 1.05, 0.6, 0.04, 0, 0.02, 0.76, M['i_tisch'], 0.008)
        box('Tischfuss', 0.05, 0.5, 0.72, -0.45, 0.02, 0.37, M['i_rahmen'], 0.006)
        box('Bildschirm', 0.5, 0.03, 0.32, 0, 0.24, 1.05, M['i_rahmen'], 0.01); box('Bildschirmfeld', 0.46, 0.005, 0.28, 0, 0.222, 1.05, M['i_bild'], 0.002)
        cyl('Stuhlsitz', 0.22, 0.08, 0, -0.45, 0.48, M['i_polster'], 'Z', n=24, bev=0.02); cyl('Stuhlsaeule', 0.03, 0.4, 0, -0.45, 0.24, M['i_stahl'], 'Z', n=12)
        box('Stuhllehne', 0.36, 0.06, 0.4, 0, -0.65, 0.78, M['i_polster'], 0.03); cyl('Stuhlfuss', 0.25, 0.03, 0, -0.45, 0.03, M['i_rahmen'], 'Z', n=5)
        box('Logbuch', 0.22, 0.16, 0.03, 0.3, -0.05, 0.795, M['i_rot'], 0.006)
    ANCH['raum']['log'] = Vector((5.55, yw - 0.85, FL))
    # Waschzelle links vorn (x 7,2 … 8,55): Fliesen, Toilette, Duschwanne, Spiegel
    w2 = wmin(7.9, 8.5, FL, FL + 0.5)
    for xx in (7.23, 8.52): wandkasten('Waschwand', xx - 0.025, xx + 0.025, GANG + 0.06, FL, DECKE, 1, M['i_fliese'])
    wf = wmin(7.23, 8.52, FL, FL + 0.03); S.box(1.25, wf - GANG - 0.1, 0.02, 7.87, (wf + GANG + 0.06) / 2, FL + 0.012, M['i_fliese'])
    with Part('Toilette', T(8.25, w2 - 0.32, FL), C_IN):
        cyl('Schuessel', 0.2, 0.42, 0, 0, 0.21, M['i_wand'], 'Z', n=24, bev=0.04, r2=0.16); cyl('Deckel', 0.21, 0.03, 0, 0, 0.44, M['i_feld'], 'Z', n=24, bev=0.01)
    wsp = wmin(7.35, 7.85, FL + 1.25, FL + 1.85); S.box(0.5, 0.03, 0.6, 7.6, wsp - 0.03, FL + 1.55, M['i_stahl'])      # Spiegel
    wb = wmin(7.4, 7.8, FL + 0.88, FL + 1.02); S.box(0.4, 0.3, 0.12, 7.6, wb - 0.17, FL + 0.95, M['i_wand']); S.cyl(0.02, 0.2, Vector((7.6, wb - 0.08, FL + 1.12)), (0, 1, 0), M['i_stahl'], 8)
    # ---- Kombüse rechts (x 1,45 … 6,0, offen zum Gang): Zeile an der Außenwand, Kühlschrank, Herd, Tisch mit Bänken unter dem Bullauge
    ywr = wmin(1.45, 3.85, FL, FL + 0.95)
    S.box(2.4, 0.62, 0.9, 2.65, -(ywr - 0.31), FL + 0.45, M['i_schrank'])
    S.box(2.45, 0.66, 0.04, 2.65, -(ywr - 0.33), FL + 0.92, M['i_tisch'])
    for k in range(4): S.box(0.56, 0.012, 0.8, 1.7 + k * 0.6, -(ywr - 0.625), FL + 0.45, M['i_feld'])
    S.box(0.5, 0.42, 0.012, 2.3, -(ywr - 0.33), FL + 0.946, M['i_dunkel'])      # Kochfeld
    for k in range(2): S.cyl(0.08, 0.004, Vector((2.18 + k * 0.24, -(ywr - 0.33), FL + 0.953)), (0, 0, 1), M['i_warm'], 16)
    S.box(0.4, 0.3, 0.012, 3.2, -(ywr - 0.33), FL + 0.946, M['i_stahl'])        # Spüle
    S.box(0.6, 0.6, 2.05, 1.75, -(ywr - 0.3), FL + 1.025, M['i_stahl']) if False else None
    yk = wmin(3.84, 4.46, FL, FL + 2.0)
    wandkasten('Kuehlschrank', 3.84, 4.46, GANG + 0.7, FL, FL + 2.0, -1, M['i_schrank'])
    S.box(0.03, 0.03, 0.5, 4.15 - 0.33, -(GANG + 0.78), FL + 1.2, M['i_stahl']); S.box(0.012, yk - GANG - 0.76, 0.012, 4.15 - 0.312, -(yk - (yk - GANG - 0.7) / 2), FL + 0.72, M['i_dunkel'])
    ywo = wmin(1.45, 3.85, FL + 1.6, FL + 2.1)
    S.box(2.4, 0.36, 0.5, 2.65, -(ywo - 0.18), FL + 1.85, M['i_schrank'])     # Oberschrank
    with Part('Messe', T(5.3, 0, FL), C_IN):
        yt = -(wmin(4.5, 6.1, FL, FL + 0.5) - 0.42)
        box('Messetisch', 1.0, 0.8, 0.05, 0, yt, 0.74, M['i_tisch'], 0.01); cyl('Tischsaeule', 0.05, 0.7, 0, yt, 0.36, M['i_stahl'], 'Z', n=12)
        for dx in (-0.75, 0.75):
            box('Bank', 0.42, 0.8, 0.42, dx, yt, 0.21, M['i_schrank'], 0.02); box('Bankpolster', 0.42, 0.78, 0.08, dx, yt, 0.46, M['i_polster'], 0.03)
            box('Banklehne', 0.08, 0.78, 0.5, dx + math.copysign(0.2, dx), yt, 0.75, M['i_polster'], 0.03)
    # Anzugschrank rechts vorn (x 6,05 … 8,55): Raumanzug hinter Glas, Helm, Sanitätskasten
    w3 = wmin(6.6, 8.0, FL + 0.5, FL + 1.9)
    wandkasten('Anzugschrank', 6.6, 8.0, GANG + 0.1, FL, FL + 2.2, -1, M['i_schrank'])
    S.box(1.2, 0.012, 1.9, 7.3, -(GANG + 0.11), FL + 1.1, M['kanzel'])
    S.box(0.45, 0.25, 1.1, 7.3, -(w3 - 0.35), FL + 1.0, M['gelb']); S.cyl(0.17, 0.32, Vector((7.3, -(w3 - 0.35), FL + 1.8)), (0, 0, 1), M['hell'], 16)
    S.box(0.4, 0.12, 0.3, 6.35, -(GANG + 0.16), FL + 1.5, M['i_rot']); S.box(0.06, 0.012, 0.2, 6.35, -(GANG + 0.22), FL + 1.5, M['i_wand']); S.box(0.2, 0.012, 0.06, 6.35, -(GANG + 0.221), FL + 1.5, M['i_wand'])
    S.fertig()

# =====================================================================================
# Lichter fürs Bild (im Spiel setzt die Laufkarte eigene Lampen)
# =====================================================================================
def innen_lichter():
    for x in (-13.0, -9.0, -5.0): point('Laderaumlicht', (x, 0, 5.5), 260, (0.95, 0.97, 1.0), 0.3)
    point('Techniklicht', (-0.8, 0, 4.4), 140, (0.85, 0.95, 1.0), 0.2); point('Kernlicht', (-0.8, 2.05, 3.6), 70, (0.4, 0.8, 1.0), 0.2)
    for x in (2.6, 4.6, 6.6): point('Ganglicht', (x, 0, DECKE - 0.25), 60, (0.95, 0.97, 1.0), 0.15)
    point('Kabinenlicht', (3.0, 1.45, DECKE - 0.3), 90, (1.0, 0.8, 0.6), 0.15); point('Kombuesenlicht', (3.4, -1.6, DECKE - 0.3), 45, (1.0, 0.85, 0.7), 0.15)

huelle(); laderaum(); technik(); wohnteil(); innen_lichter()
for o in C_IN.all_objects: o['innen'] = 1
# Innenansichten (Kameras im Raum, Außenhaut bleibt)
cam('Laderaum', (-14.6, -1.6, 4.4), (-5.0, 0.6, 3.4), 18); cam('Laderaum2', (-3.6, 1.8, 4.6), (-12.0, -0.5, 3.1), 18)
cam('Technik', (1.0, -0.4, 4.1), (-2.0, 1.4, 3.3), 16); cam('Gang', (1.6, 0.0, 4.0), (8.0, 0.0, 3.4), 18)
cam('Kabine', (6.35, 0.95, 4.15), (1.8, 1.55, 3.15), 16); cam('Kombuese', (1.7, -0.3, 4.1), (5.5, -1.6, 3.2), 16)
IN_VIEWS = {
    'in_laderaum': ('Laderaum', 'grau', True, 0.0, 0.0, {'rampe': 1.0}), 'in_laderaum2': ('Laderaum2', 'grau', True, 0.0, 0.0, {'rampe': 1.0}),
    'in_technik': ('Technik', 'grau', True, 0.0, 0.0, {}), 'in_gang': ('Gang', 'grau', True, 0.0, 0.0, {}),
    'in_kabine': ('Kabine', 'grau', True, 0.0, 0.0, {}), 'in_kombuese': ('Kombuese', 'grau', True, 0.0, 0.0, {}),
}
