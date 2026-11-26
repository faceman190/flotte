# Harpyie HP-1 (26.11.2026): eigenes schweres Landungsschiff. Nutzer: „Baue dieses Schiff nach in dem dunklen Grauton mit leicht gelben
# Akzenten … das muss besser sein als alles … alle Details … sehr realistisch … darf viele Dreiecke haben.“ Die Vorlage (Bilder eines Schiffs
# aus einem anderen Spiel) wird nicht kopiert: eigener Entwurf desselben Typs (wie Kormoran, Würger, Elster, Wisent).
# Typ: gedrungener, gepanzerter Truppen- und Fahrzeuglander, 35 m:
#  - Rumpf (Truppenraum) kantig, darunter zwei seitliche PANZERWÜLSTE mit dem Fahrwerk und großen Lufteinlässen vorn
#  - KANZELBUCKEL auf der Nase (schräge Frontscheibe, Seitenfenster), Kinnkanonen
#  - geschichtete DECKPLATTEN: vordere und hintere Schulterplatten mit gelben Spitzen, mittlere Panzerplatten mit Fugen
#  - RÜCKENTURM mit Doppelrohr, RÜCKENGRAT mit Lüftern, Kommunikationsmast
#  - vier schwenkbare TRIEBWERKSGONDELN: vorn an Auslegern aus den Wülsten, hinten auf Pylonen über den hinteren Platten
#  - HECKRAMPE in der Schräge (mit Verlängerung), Seitentür, zwei nach außen geneigte HECKFLOSSEN
# Farbe: Graphit, schwarzgraue Unterteile, Eisengrau in einzelnen Platten, gelbe Warnkanten an Spitzen und Kanten.
# Achsen wie Milan, Dohle, Kranich, Möwe: +X nach vorn, +Y Backbord, +Z oben, Boden z = 0.
import bpy, bmesh, math, random, os, json
from mathutils import Vector, Matrix
NUR_HELFER_MILAN = True
_mk = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'milan', 'mil_kit.py')
exec(compile(open(_mk, encoding='utf-8').read(), 'mil_kit.py', 'exec'))
HIER = os.path.dirname(bpy.data.filepath)
ANCH = {}; GELENKE.clear(); GRUPPEN.clear(); PIVOTS.clear()
UNTER = {'rampe2': 'rampe'}
random.seed(11)

# ---------- Materialien ----------
M['h_graphit'] = panel_mat('Rumpf Graphit', (0.046, 0.048, 0.052), 0.45, 0.4, 0.95, brick=(1.25, 0.72), mortar=0.007)
M['h_schwarz'] = panel_mat('Rumpf Schwarzgrau', (0.024, 0.025, 0.027), 0.5, 0.43, 0.9, brick=(1.25, 0.72), mortar=0.007)
M['h_eisen'] = panel_mat('Rumpf Eisengrau', (0.072, 0.075, 0.079), 0.45, 0.4, 0.95, brick=(1.25, 0.72), mortar=0.007)
M['h_gelb'] = panel_mat('Rumpf Signalgelb', (0.5, 0.33, 0.02), 0.25, 0.42, 0.9, brick=(1.25, 0.72), rivets=False)
M['graphit'] = hull_mat('Lack Graphit', (0.046, 0.048, 0.052), 0.45, 0.42, 0.95)
M['schwarz'] = hull_mat('Lack Schwarzgrau', (0.022, 0.023, 0.025), 0.5, 0.45, 0.85)
M['eisen'] = hull_mat('Lack Eisengrau', (0.072, 0.075, 0.079), 0.45, 0.42, 0.95)
M['gelb'] = hull_mat('Lack Warngelb', (0.52, 0.34, 0.02), 0.2, 0.45, 0.9)
M['bein'] = hull_mat('Fahrwerk Graphit', (0.06, 0.062, 0.066), 0.5, 0.42, 1.0)
M['schacht'] = mk('Schachtgrund', (0.03, 0.031, 0.034), 0.4, 0.5, var=0.15, scale=3.0, bump=0.2, wear=0.4)
M['hubglut'] = mk('Hubglut', (0.03, 0.035, 0.04), 0.6, 0.35, var=0, rvar=0, emit=(0.55, 0.8, 1.0), es=0.0, grime=False)
M['rcsglut'] = mk('Steuerglut', (0.03, 0.035, 0.04), 0.6, 0.35, var=0, rvar=0, emit=(0.8, 0.9, 1.0), es=0.0, grime=False)
M['landelicht'] = mk('Landescheinwerfer', (1.0, 0.97, 0.9), 0, 0.2, var=0, rvar=0, emit=(1.0, 0.96, 0.88), es=6.0, grime=False)
M['warnlicht'] = mk('Warnleuchte', (1.0, 0.25, 0.1), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.2, 0.08), es=3.0, grime=False)
M['streifen'] = mk('Lichtstreifen', (0.85, 0.92, 1.0), 0, 0.3, var=0, rvar=0, emit=(0.8, 0.9, 1.0), es=2.5, grime=False)
M['gitter'] = mk('Ansauggitter', (0.02, 0.021, 0.023), 0.7, 0.4, var=0.05, scale=4.0, wear=0.3)
M['leitung'] = mk('Leitung Kupfer', (0.35, 0.16, 0.07), 0.9, 0.35, var=0.08, wear=0.5)
HULL_MATS = ['h_graphit', 'h_schwarz', 'h_eisen', 'h_gelb']
GRAPHIT, SCHWARZ, EISEN, GELB = 0, 1, 2, 3
DUESEN = {'haupt': [], 'hub': [], 'rcs': []}
TXT = 'txtw' if 'txtw' in M else 'txtd'
def sstep(t): t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)

# =====================================================================================
# 1. Rumpf (Truppenraum): Querschnitt aus einer Tabelle (halbe Breite, Dach, obere Fase, Kante der unteren Schräge, Bodenbreite, Boden),
#    zwischen den Stützstellen weich überblendet; Heckschräge = geschlossene Rampe
# =====================================================================================
XN, XE = 16.5, -18.5
#        x      w     zt   cu    zm    wb    zb
RT = [(-18.5, 2.9, 5.95, 0.5, 3.0, 2.3, 1.6),
      (-14.0, 3.2, 6.4, 0.62, 2.6, 2.4, 1.5),
      (8.5, 3.2, 6.4, 0.62, 2.6, 2.4, 1.5),
      (12.2, 2.75, 5.95, 0.6, 2.85, 2.0, 1.75),
      (15.2, 1.9, 4.85, 0.45, 3.05, 1.25, 2.2),
      (16.5, 1.35, 4.25, 0.32, 3.25, 0.85, 2.6)]
def prm(x):
    """(w, zb, zt, cu, zm, wb) bei x"""
    if x <= RT[0][0]: r = RT[0]
    elif x >= RT[-1][0]: r = RT[-1]
    else:
        for a, b in zip(RT, RT[1:]):
            if a[0] <= x <= b[0]: t = sstep((x - a[0]) / (b[0] - a[0])); r = tuple(a[k] + (b[k] - a[k]) * t for k in range(7)); break
    return r[1], r[6], r[2], r[3], r[4], r[5]
HK = (-13.5, 1.5, XE, 4.6)
FL = 2.0                                              # Boden im Truppenraum
def heck_cut(x):
    if x >= HK[0]: return None
    return HK[1] + (HK[0] - x) / (HK[0] - HK[2]) * (HK[3] - HK[1])
HR_X = HK[0] - (FL - HK[1]) / (HK[3] - HK[1]) * (HK[0] - HK[2])      # Rampengelenk am Ende des Bodens
def params(x):
    w, zb, zt, cu, zm, wb = prm(x); c = heck_cut(x); return w, zt, max(zb, c) if c else zb, 8.0
def _rund(P, r):
    out = [P[0]]
    for i in range(1, len(P) - 1):
        a, b, c = Vector(P[i - 1]), Vector(P[i]), Vector(P[i + 1])
        u, v = (a - b), (c - b); k = min(r, u.length * 0.4, v.length * 0.4)
        p0, p1 = b + u.normalized() * k, b + v.normalized() * k
        out += [tuple(p0), tuple((p0 + p1) * 0.25 + b * 0.5), tuple(p1)]
    out.append(P[-1]); return out
def _clip(poly, zc):
    out = []
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]; ia, ib = a[1] >= zc, b[1] >= zc
        if ia: out.append(a)
        if ia != ib: t = (zc - a[1]) / (b[1] - a[1]); out.append((a[0] + (b[0] - a[0]) * t, zc))
    return out
def _rund_schnitt(poly, zc, r=0.42):
    out = []; n = len(poly)
    for i in range(n):
        p = poly[i]
        if abs(p[1] - zc) > 1e-6: out.append(p); continue
        P = Vector(p); a, b = Vector(poly[i - 1]), Vector(poly[(i + 1) % n]); u, v = a - P, b - P; k = min(r, u.length * 0.45, v.length * 0.45)
        p0, p1 = P + u.normalized() * k, P + v.normalized() * k
        for j in range(7): t = j / 6; q = p0 * (1 - t) ** 2 + P * 2 * t * (1 - t) + p1 * t * t; out.append((q.x, q.y))
    return out
_SEC = {}
def sec(x):
    k = round(x, 3)
    if k in _SEC: return _SEC[k]
    w, zb, zt, cu, zm, wb = prm(x)
    half = _rund([(0.0, zt), (w - cu, zt), (w, zt - cu), (w, zm), (wb, zb), (0.0, zb)], 0.13)
    poly = half + [(-y, z) for y, z in reversed(half[1:-1])]
    c = heck_cut(x)
    if c: poly = _rund_schnitt(_clip(poly, c), c)
    _SEC[k] = poly; return poly
def _strahl(poly, zc, t):
    d = (math.sin(t), math.cos(t)); best = None
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]; ex, ez = b[0] - a[0], b[1] - a[1]
        den = d[0] * (-ez) + d[1] * ex
        if abs(den) < 1e-12: continue
        rx, rz = a[0], a[1] - zc
        s = (rx * (-ez) + rz * ex) / den; u = (d[0] * rz - d[1] * rx) / den
        if s > 0 and -1e-9 <= u <= 1 + 1e-9 and (best is None or s < best): best = s
    best = best or 0.0
    return d[0] * best, zc + d[1] * best
_UMF = {}
def _umfang(x):
    k = round(x, 3)
    if k not in _UMF:
        P = sec(x); cum = [0.0]
        for i in range(len(P)): a, b = P[i], P[(i + 1) % len(P)]; cum.append(cum[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
        _UMF[k] = (P, cum)
    return _UMF[k]
def _punkt_s(x, s):
    P, cum = _umfang(x); s %= cum[-1]; lo, hi = 0, len(P)
    while hi - lo > 1:
        m = (lo + hi) // 2
        if cum[m] <= s: lo = m
        else: hi = m
    a, b = P[lo], P[(lo + 1) % len(P)]; seg = cum[lo + 1] - cum[lo]; u = (s - cum[lo]) / seg if seg > 1e-12 else 0.0
    return a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u
def _s_von(x, y, z):
    P, cum = _umfang(x); best = (1e9, 0.0)
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]; ex, ez = b[0] - a[0], b[1] - a[1]; l2 = ex * ex + ez * ez
        u = 0.0 if l2 < 1e-12 else max(0.0, min(1.0, ((y - a[0]) * ex + (z - a[1]) * ez) / l2)); d = (a[0] + ex * u - y) ** 2 + (a[1] + ez * u - z) ** 2
        if d < best[0]: best = (d, cum[i] + u * math.sqrt(l2))
    return best[1]
def _w_bei(P, z):
    w = 0.0
    for i in range(len(P)):
        p, q = P[i], P[(i + 1) % len(P)]
        if (p[1] - z) * (q[1] - z) <= 0 and abs(q[1] - p[1]) > 1e-9: w = max(w, p[0] + (q[0] - p[0]) * (z - p[1]) / (q[1] - p[1]))
    return w
def hull_point(x, t):
    """Strahl aus der Mitte; an der Heckschräge bleiben die Punkte oberhalb der Schnittecke, wo sie ohne Schnitt lägen, die übrigen werden
    nach Bogenlänge auf Ecke und Schnittkante verteilt (keine Sägezähne; Lehre aus der Möwe)"""
    c = heck_cut(x)
    if not c:
        y, z = _strahl(sec(x), zc_of(x), t); return Vector((x, y, z))
    zc = zc_of(x); P0 = [p for p in sec(round(x, 3) + 0.0)]      # Bezug: derselbe Querschnitt ohne Schnitt
    w, zb, zt, cu, zm, wb = prm(x)
    full = _rund([(0.0, zt), (w - cu, zt), (w, zt - cu), (w, zm), (wb, zb), (0.0, zb)], 0.13); full = full + [(-y, z) for y, z in reversed(full[1:-1])]
    zcu = zb + 0.48 * (zt - zb); y0, z0 = _strahl(full, zcu, t); zr = c + 0.5
    if z0 >= zr: return Vector((x, y0, z0))
    cum0 = [0.0]
    for i in range(len(full)): a, b = full[i], full[(i + 1) % len(full)]; cum0.append(cum0[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    def s_in(P, cum, y, z):
        best = (1e9, 0.0)
        for i in range(len(P)):
            a, b = P[i], P[(i + 1) % len(P)]; ex, ez = b[0] - a[0], b[1] - a[1]; l2 = ex * ex + ez * ez
            u = 0.0 if l2 < 1e-12 else max(0.0, min(1.0, ((y - a[0]) * ex + (z - a[1]) * ez) / l2)); d = (a[0] + ex * u - y) ** 2 + (a[1] + ez * u - z) ** 2
            if d < best[0]: best = (d, cum[i] + u * math.sqrt(l2))
        return best[1]
    L0 = cum0[-1]; sc0 = s_in(full, cum0, _w_bei(full, zr), zr); s0 = s_in(full, cum0, y0, z0)
    P, cum = _umfang(x); L = cum[-1]; sc = _s_von(x, _w_bei(P, zr), zr)
    if s0 <= sc0: sv = s0
    elif s0 >= L0 - sc0: sv = L - (L0 - s0)
    else: sv = sc + (s0 - sc0) * (L - 2 * sc) / (L0 - 2 * sc0)
    y, z = _punkt_s(x, sv); return Vector((x, y, z))
NRING = 144
def x_samples():
    xs = []; x = XE
    while x < XN - 1e-6: xs.append(round(x, 4)); x += 0.18 if x < 11 else 0.1
    xs.append(XN); return xs
KX0, KX1 = 9.8, 16.35                                 # Kanzelbuckel
RAMP_HW = 2.3
TUER = (-11.6, -10.2, 2.25, 4.45)                     # Seitentür steuerbord hinter dem Wulst: x von, bis, z von, bis
def unter_kanzel(c):
    return KX0 + 1.0 < c.x < KX1 - 0.3 and abs(c.y) < kparams(c.x)[1] - 0.35 and c.z > prm(c.x)[2] - 0.15
def unter_wulst(c):
    return WX[0] + 1.0 < c.x < WX[1] - 0.3 and abs(c.y) > 3.12 and c.z < WZ1 - 0.25
def farbe(c):
    w, zb, zt, cu, zm, wb = prm(c.x)
    if c.z < zm - 0.1: return SCHWARZ
    if c.z > zt - 0.05 and (int((c.x + 40) / 2.4) + int((c.y + 9) / 1.6)) % 5 == 0: return EISEN
    return GRAPHIT
def build_hull():
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); XS = x_samples(); rings = []
    for x in XS: rings.append([bm.verts.new(hull_point(x, 2 * PI * k / NRING)) for k in range(NRING)])
    for i in range(len(XS) - 1):
        for k in range(NRING):
            k2 = (k + 1) % NRING; q = (rings[i][k], rings[i + 1][k], rings[i + 1][k2], rings[i][k2]); c = sum((v.co for v in q), Vector()) / 4
            if unter_kanzel(c) or unter_wulst(c): continue
            hc = heck_cut(c.x)
            if hc and abs(c.y) < RAMP_HW + 0.08 and c.z < hc + 0.3 and c.x < HR_X: continue      # Öffnung der Heckrampe
            if c.y < 0 and TUER[0] < c.x < TUER[1] and TUER[2] < c.z < TUER[3] and abs(c.y) > prm(c.x)[0] - 0.25: continue      # Seitentür
            if (q[1].co - q[0].co).cross(q[3].co - q[0].co).length < 1e-7: continue
            f = bm.faces.new(q); f.material_index = farbe(c)
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x, lp.vert.co.z + abs(lp.vert.co.y) * (1.0 if lp.vert.co.z > 5 else 0.6))
    bmesh.ops.dissolve_degenerate(bm, dist=0.0005, edges=bm.edges[:]); bm.normal_update()
    if sum(f.normal.dot(f.calc_center_median() - Vector((f.calc_center_median().x, 0, zc_of(f.calc_center_median().x)))) for f in bm.faces[:300]) < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    return bm, rings, XS
def kappe(name, rg, nx, mi):
    bm = bmesh.new(); vs = [bm.verts.new(c.copy()) for c in rg]; f = bm.faces.new(vs); bm.normal_update()
    if f.normal.x * nx < 0: f.normal_flip()
    f.material_index = mi; L = bm.loops.layers.uv.new('Platten')
    for lp in f.loops: lp[L].uv = (lp.vert.co.y, lp.vert.co.z)
    return mesh_obj(name, bm, HULL_MATS, False, C_HULL)
def heckflaeche(rg):
    kappe('Heckflaeche', rg, -1, GRAPHIT)
    w, zb, zt, cu, zm, wb = prm(XE)
    for s in (1, -1):
        box('Heckleuchtenleiste', 0.06, 1.0, 0.08, XE - 0.03, s * 1.6, zt - 0.22, M['streifen'], 0.01)
        cyl('Ruecklicht', 0.08, 0.05, XE - 0.03, s * (w - 0.4), zt - 0.42, M['nav_r'], 'X', n=16)
        box('Heckgitter', 0.05, 0.9, 0.32, XE - 0.02, s * 1.15, (HK[3] + zt) / 2 - 0.05, M['gitter'], 0.01)
    sphere('Hecklicht', 0.08, XE - 0.04, 0, zt - 0.1, M['blitz'], 10)
def bugstirn(rg):
    kappe('Bugstirn', rg, 1, SCHWARZ)
    w, zb, zt, cu, zm, wb = prm(XN)
    for s in (1, -1):
        cyl('Bugscheinwerfer', 0.13, 0.06, XN + 0.02, s * 0.6, zb + 0.4, M['landelicht'], 'X', n=24)
        ring('Scheinwerferring', 0.16, 0.025, (XN + 0.04, s * 0.6, zb + 0.4), (1, 0, 0), M['schwarz'], 24)
    box('Bugsensor', 0.12, 0.8, 0.28, XN + 0.05, 0, zb + 0.95, M['gitter'], 0.02)

# =====================================================================================
# 1b. Panzerwülste: seitliche Körper unter der Fase (Fahrwerk, Einlässe vorn), Loft aus Stützstellen
# =====================================================================================
WX = (-9.4, 13.4)                                     # Wulst: hinten (Spitze), vorn (Einlassfläche)
WZ1 = 4.95                                            # Oberkante
WT = [(-9.4, 3.1, 4.2, 2.1, 0.2), (-7.4, 5.25, 4.95, 1.5, 0.5), (11.4, 5.25, 4.95, 1.5, 0.5), (13.4, 5.05, 4.75, 1.72, 0.45)]      # x, außen, oben, unten, Fase
BAY_V, BAY_H = (8.4, 12.0), (-6.9, -3.3)              # Fahrwerksschächte im Wulst (x)
BAY_Y = (3.5, 4.95)
def wprm(x):
    if x <= WT[0][0]: return WT[0][1:]
    for a, b in zip(WT, WT[1:]):
        if a[0] <= x <= b[0]: t = sstep((x - a[0]) / (b[0] - a[0])); return tuple(a[k] + (b[k] - a[k]) * t for k in range(1, 5))
    return WT[-1][1:]
def wsec(x):
    yo, zt, zb, f = wprm(x); yi = 3.15
    return [(yi, zt), (yo - f, zt), (yo, zt - f), (yo, zb + f + 0.15), (yo - f - 0.15, zb), (yi, zb)]
def im_schacht(x, y, z):
    return any(a + 0.05 < x < b - 0.05 for a, b in (BAY_V, BAY_H)) and BAY_Y[0] + 0.05 < abs(y) < BAY_Y[1] - 0.05 and z < wprm(x)[2] + 0.08
def wulst(s):
    xs = []; x = WX[0]
    while x < WX[1] - 1e-6: xs.append(x); x += 0.15
    xs.append(WX[1]); bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten'); R = []
    for x in xs:
        P = _rund(wsec(x), 0.1); R.append([bm.verts.new((x, s * y, z)) for y, z in P])
    n = len(R[0])
    for i in range(len(xs) - 1):
        for k in range(n - 1):
            q = (R[i][k], R[i + 1][k], R[i + 1][k + 1], R[i][k + 1]); c = sum((v.co for v in q), Vector()) / 4
            if im_schacht(c.x, c.y, c.z): continue
            f = bm.faces.new(q); yo, zt, zb, ff = wprm(c.x)
            f.material_index = SCHWARZ if c.z < zb + 0.55 else (EISEN if (c.z > zt - 0.03 and int((c.x + 30) / 3.1) % 3 == 0) else GRAPHIT)
            for lp in f.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.z + abs(lp.vert.co.y) * 0.8)
    f = bm.faces.new(R[-1]); f.material_index = SCHWARZ
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); mesh_obj('Panzerwulst', bm, HULL_MATS, True, C_HULL)
    # Einlass in der Stirn: Rahmen, Vertiefung, drei waagerechte Schlitze mit Lamellen
    yo, zt, zb, f0 = wprm(WX[1]); ym = s * (2.85 + yo) / 2 + s * 0.12; wy = yo - 2.85 - 0.45
    slab('Einlassrahmen', (WX[1] + 0.03, ym, (zt + zb) / 2 + 0.1), Vector((0, 1, 0)), Vector((0, 0, 1)), (wy + 0.25, zt - zb - 0.35, 0.08), M['schwarz'], 0.03)
    for k in range(3):
        zz = zb + 0.65 + k * 0.82
        slab('Einlassschlitz', (WX[1] + 0.075, ym, zz), Vector((0, 1, 0)), Vector((0, 0, 1)), (wy - 0.1, 0.62, 0.02), M['schacht'], 0.004)
        for j in range(5): slab('Einlasslamelle', (WX[1] + 0.12, ym, zz - 0.24 + j * 0.12), Vector((0, 1, 0)), Vector((0, -0.3, 1)).normalized(), (wy - 0.16, 0.05, 0.04), M['gitter'], 0.004)
        slab('Schlitzsteg', (WX[1] + 0.13, ym, zz + 0.36), Vector((0, 1, 0)), Vector((0, 0, 1)), (wy - 0.05, 0.08, 0.06), M['graphit'], 0.008)
    slab('Einlasskante', (WX[1] + 0.02, s * (yo - 0.15), zt - 0.2), Vector((0, 1, 0)), Vector((0, 0, 1)), (0.3, 0.42, 0.1), M['gelb'], 0.01)
    # Seitenpanzer: aufgesetzte Platten mit Fasen, Fugen, Klappen, Ringe
    for x0, x1, z0, z1, m in ((-6.6, -1.2, 2.3, 4.3, 'eisen'), (-0.9, 4.6, 2.3, 4.3, 'graphit'), (4.9, 10.8, 2.3, 4.3, 'graphit')):
        xm, zmm = (x0 + x1) / 2, (z0 + z1) / 2; yy = s * (yo + 0.03)
        prism('Seitenpanzer', [(x0, z0 + 0.12), (x0 + 0.12, z0), (x1 - 0.12, z0), (x1, z0 + 0.12), (x1, z1 - 0.12), (x1 - 0.12, z1), (x0 + 0.12, z1), (x0, z1 - 0.12)], yy, yy + s * 0.07, M[m], 'Y', 0.02)
        for xx in (x0 + 1.3, x1 - 1.3): box('Panzerbolzen', 0.06, 0.03, 0.06, xx, s * (yo + 0.11), z1 - 0.18, M['eisen'], 0.004)
    for x in (-3.9, 2.0, 7.7):
        ring('Andockring', 0.26, 0.04, (x, s * (yo + 0.12), 3.3), (0, s, 0), M['schwarz'], 32); cyl('Andockkern', 0.17, 0.04, x, s * (yo + 0.1), 3.3, M['warnlicht'] if x == 2.0 else M['eisen'], 'Y', n=24)
    for x0 in (-5.8, 5.6):
        box('Wulstklappe', 1.1, 0.03, 0.6, x0, s * (yo + 0.11), 3.6, M['eisen'], 0.01); box('Klappengriff', 0.25, 0.04, 0.03, x0 + 0.3, s * (yo + 0.14), 3.45, M['gelb'], 0.004)
    for k in range(4): box('Wulstlicht', 0.25, 0.03, 0.05, -6.5 + k * 5.3, s * (yo + 0.03), zt - 0.62, M['streifen'], 0.004)
    slab('Wulstsaum', (5.0, s * (yo - f0 / 2), zt - f0 / 2), Vector((1, 0, 0)), Vector((0, -s, 1)).normalized(), (11.5, 0.05, 0.012), M['gelb'], 0.002)
    for x in (-5.0, 0.0, 5.0, 10.0): box('Wulstfuge', 0.03, 0.02, 2.2, x - 0.5 * (x > 4), s * (yo + 0.005), 3.3, M['fuge'], 0.002)
    # Trittleiter vom Wulst aufs Deck (steuerbord hinten)
    if s < 0:
        for k in range(5): box('Leitersprosse', 0.4, 0.05, 0.04, -7.1, s * (yo + 0.1), 2.3 + k * 0.38, M['eisen'], 0.004)
        for dx in (-0.22, 0.22): box('Leiterholm', 0.04, 0.05, 1.8, -7.1 + dx, s * (yo + 0.1), 3.1, M['schwarz'], 0.004)

# =====================================================================================
# 2. Kanzelbuckel: gepanzerter Aufbau auf der Nase, Frontscheibe schräg, Seitenfenster; Glas mit glatten Rahmen
# =====================================================================================
KB0, KBT = 3.9, 6.85
def kparams(x):
    w_, zb_, zt_, cu_ = prm(x)[:4]; W = min(1.85 - 0.45 * sstep((x - 14.6) / 1.75), w_ - cu_ - 0.14)      # sitzt auf der Dachfläche, steht nicht über die Fase
    zt = KBT if x < 14.3 else KBT - (x - 14.3) / (KX1 - 14.3) * (KBT - 4.55)
    if x < KX0 + 1.6: zr = prm(x)[2] + 0.02; zt = zr + (zt - zr) * sstep((x - KX0) / 1.6)
    return zt, W
def ksec(x):
    zt, W = kparams(x); cu = min(0.5, max(0.05, (zt - KB0) * 0.26))
    half = _rund([(0.0, zt), (W - cu, zt), (W, zt - cu), (W + 0.1, KB0), (0.0, KB0)], 0.09)
    return half + [(-y, z) for y, z in reversed(half[1:-1])]
def kpoint(x, t):
    zt, W = kparams(x); y, z = _strahl(ksec(x), KB0 + 0.45 * (zt - KB0), t); return Vector((x, y, z))
NXB, NAB = 150, 112
XSB = [KX0 + (KX1 - KX0) * i / NXB for i in range(NXB + 1)]
TB = [2 * PI * a / NAB - PI for a in range(NAB)]
_PO = {}
def po(i, a):
    a %= NAB
    if (i, a) not in _PO: _PO[(i, a)] = kpoint(XSB[i], TB[a])
    return _PO[(i, a)]
def k_im_rumpf(c):
    w, zb, zt = prm(c.x)[:3]; return c.z < zt - 0.02 and abs(c.y) < w - 0.2
def _kglas(i, a):
    pts = [po(i, a), po(i + 1, a), po(i + 1, a + 1), po(i, a + 1)]; c = sum(pts, Vector()) / 4
    if c.z < KB0 + 0.02 or k_im_rumpf(c): return False
    nrm = (pts[1] - pts[0]).cross(pts[3] - pts[0]); nrm = nrm.normalized() if nrm.length > 1e-9 else Vector((0, 0, 1))
    if nrm.dot(c - Vector((c.x - 0.5, 0, 5.0))) < 0: nrm = -nrm
    return (c.x > 14.4 and nrm.x > 0.25 and c.z > 4.6 and abs(c.y) < kparams(c.x)[1] - 0.03) or (12.0 < c.x < 16.1 and 4.85 < c.z < 6.25 and abs(nrm.y) > 0.5)      # Rundumsicht: Seitenfenster laufen bis an die Frontscheibe
KGLAS = {(i, a) for i in range(NXB) for a in range(NAB) if _kglas(i, a)}
def glas_schleifen(G):
    E = set()
    for (i, a) in G:
        cs = [(i, a % NAB), (i + 1, a % NAB), (i + 1, (a + 1) % NAB), (i, (a + 1) % NAB)]
        for k in range(4): E.add((cs[k], cs[(k + 1) % 4]))
    nxt = {}
    for u, v in E:
        if (v, u) not in E: nxt.setdefault(u, []).append(v)
    loops = []; used = set()
    for s0 in list(nxt):
        for v0 in nxt[s0]:
            if (s0, v0) in used: continue
            L = [s0]; u, v = s0, v0
            while True:
                used.add((u, v))
                if v == s0: break
                L.append(v); cand = [w for w in nxt.get(v, []) if (v, w) not in used]
                if not cand: break
                u, v = v, cand[0]
            if len(L) > 3: loops.append(L)
    return loops
def vnorm(i, a):
    i0, i1 = max(0, i - 1), min(NXB, i + 1); c = po(i, a)
    n = (po(i1, a) - po(i0, a)).cross(po(i, a + 1) - po(i, a - 1)); n = n.normalized() if n.length > 1e-9 else Vector((0, 0, 1))
    if n.dot(c - Vector((c.x - 0.5, 0, 5.0))) < 0: n = -n
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
def kanzel():
    bh = bmesh.new(); bg = bmesh.new(); L = bh.loops.layers.uv.new('Platten'); VH = {}; VG = {}
    def vv(bm, D, i, a):
        a %= NAB
        if (i, a) not in D: D[(i, a)] = bm.verts.new(po(i, a))
        return D[(i, a)]
    for i in range(NXB):
        for a in range(NAB):
            pts = [po(i, a), po(i + 1, a), po(i + 1, a + 1), po(i, a + 1)]; c = sum(pts, Vector()) / 4
            if c.z < KB0 + 0.02 or k_im_rumpf(c): continue
            if (i, a) in KGLAS: bg.faces.new([vv(bg, VG, i, a), vv(bg, VG, i + 1, a), vv(bg, VG, i + 1, a + 1), vv(bg, VG, i, a + 1)]); continue
            f = bh.faces.new([vv(bh, VH, i, a), vv(bh, VH, i + 1, a), vv(bh, VH, i + 1, a + 1), vv(bh, VH, i, a + 1)])
            f.material_index = SCHWARZ if c.z < prm(c.x)[2] + 0.35 else (EISEN if c.z > kparams(c.x)[0] - 0.02 and abs(c.y) < 0.7 else GRAPHIT)
            for lp in f.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.z + abs(lp.vert.co.y))
    fv = bh.faces.new([vv(bh, VH, NXB, a) for a in range(NAB) if po(NXB, a).z >= KB0 - 0.001]); fv.material_index = SCHWARZ
    for bm in (bh, bg):
        bm.normal_update()
        for fc in bm.faces:
            c = fc.calc_center_median()
            if fc.normal.dot(c - Vector((c.x - (0.5 if fc is not fv else 2.0), 0, 5.0))) < 0: fc.normal_flip()
    mesh_obj('Kanzelaufbau', bh, HULL_MATS, True, C_HULL)
    mesh_obj('Kanzelglas', bg, ['kanzel'], True, C_PART)
    br = bmesh.new()      # glatte Rahmen entlang der geglätteten Glasränder (deckt die Rasterstufen ab)
    for Lp in glas_schleifen(KGLAS):
        N = glaetten([vnorm(*k) for k in Lp], 4); streifen(br, glaetten([po(*k) for k in Lp]), N, 0.1, 0.004, 0.04)
    bmesh.ops.recalc_face_normals(br, faces=br.faces[:]); mesh_obj('Fensterrahmen', br, [M['schwarz']], False, C_PART)
    for yy in (-0.58, 0.58):
        Q = []
        for x in [14.42 + (KX1 - 0.08 - 14.42) * j / 10 for j in range(11)]:
            zt, W = kparams(x); Q.append(Vector((x + 0.02, yy, zt + 0.025)))
        for a, b in zip(Q, Q[1:]): slab('Scheibensprosse', (a + b) / 2, (b - a).normalized(), Vector((0, 1, 0)), ((b - a).length + 0.01, 0.055, 0.045), M['schwarz'], 0.006)
    zt, W = kparams(14.0)
    slab('Scheibenlid', (14.45, 0, KBT + 0.04), Vector((1, 0, 0)), Vector((0, 1, 0)), (0.55, 2 * W - 0.25, 0.1), M['graphit'], 0.02)
    for s in (1, -1): slab('Lidkante', (14.66, s * (W - 0.38), KBT + 0.05), Vector((1, 0, 0)), Vector((0, 1, 0)), (0.15, 0.5, 0.11), M['gelb'], 0.01)
    with Part('Sensorkopf', T(12.4, 0, KBT), C_PART):
        box('Sensorsockel', 0.9, 0.7, 0.18, 0, 0, 0.09, M['schwarz'], 0.02); box('Sensorkasten', 0.6, 0.45, 0.25, 0.05, 0, 0.3, M['graphit'], 0.03)
        cyl('Sensorlinse', 0.08, 0.04, 0.37, 0.1, 0.3, M['kanzel'], 'X', n=16); cyl('Sensorlinse', 0.06, 0.04, 0.37, -0.1, 0.3, M['streifen'], 'X', n=16)
    for x, h, y in ((11.6, 1.1, 0.9), (11.9, 0.7, 1.1)):
        rod('Antenne', Vector((x, y, KBT - 0.08)), Vector((x - 0.15, y, KBT + h)), 0.022, M['schwarz'], 8); sphere('Antennenspitze', 0.035, x - 0.15, y, KBT + h, M['blitz'], 8)
    for s in (1, -1):
        sphere('Kanzellicht', 0.05, KX1 - 0.6, s * (kparams(KX1 - 0.6)[1] + 0.12), 4.7, M['nav_r' if s > 0 else 'nav_g'], 10)
        for k in range(3): slab('Kanzelschuppe', (11.8 + k * 0.85, s * (W + 0.2), 4.45), Vector((1, 0, 0)), Vector((0, 0, 1)), (0.7, 0.42, 0.05), M['schwarz'], 0.01)
    ANCH['kanzel'] = Vector((15.0, 0, 5.8))

# =====================================================================================
# 3. Deckplatten (geschichtet), Rückengrat, Rückenturm, Heckflossen
# =====================================================================================
def platte(name, pts, z0, z1, mi=GRAPHIT, kante=None, ins=0.12):
    """flache Platte aus dem Grundriss pts (x, y, gegen den Uhrzeigersinn von oben), Fase oben; kante: Kanten mit gelbem Saum"""
    bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten'); n = len(pts)
    cx, cy = sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n
    def innen(p): d = Vector((cx - p[0], cy - p[1])); d = d.normalized() if d.length > 1e-9 else d; return (p[0] + d.x * ins, p[1] + d.y * ins)
    Z0 = z0 if callable(z0) else (lambda x: z0); Z1 = z1 if callable(z1) else (lambda x: z1)      # Höhe darf dem Dach folgen (Nase fällt ab)
    lo = [bm.verts.new((x, y, Z0(x))) for x, y in pts]; mid = [bm.verts.new((x, y, Z1(x) - ins * 0.5)) for x, y in pts]; top = [bm.verts.new((*innen(p), Z1(innen(p)[0]))) for p in pts]
    bm.faces.new(list(reversed(lo))); bm.faces.new(top)
    for i in range(n):
        j = (i + 1) % n; bm.faces.new((lo[i], lo[j], mid[j], mid[i])); bm.faces.new((mid[i], mid[j], top[j], top[i]))
    for fc in bm.faces:
        fc.material_index = mi
        for lp in fc.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.y)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); ob = mesh_obj(name, bm, HULL_MATS, False, C_HULL)
    for i in (kante or []):
        a, b = Vector((*pts[i], Z1(pts[i][0]) - ins * 0.35)), Vector((*pts[(i + 1) % n], Z1(pts[(i + 1) % n][0]) - ins * 0.35)); u = (b - a).normalized()
        slab(name + ' Saum', a.lerp(b, 0.5), u, Vector((0, 0, 1)), ((b - a).length * 0.4, 0.07, ins * 0.6), M['gelb'], 0.008)
    return ob
def spiegeln(pts, s): return pts if s > 0 else [(x, -y) for x, y in reversed(pts)]
# Flügelflächen statt flacher Platten (Nutzer: „aerodynamisch sind diese Flugflächen vorne natürlich nicht … wie 20 cm starke Fundamente …
# runde Leading Edge“): Profil mit runder Vorderkante, gewölbter Oberseite und flacherer Unterseite, nach außen dünner; Spitzen gelb.
FLUEGEL = {      # Wurzel |y|, Spitze |y|, Vorderkante x (Wurzel, Spitze), Hinterkante x (Wurzel, Spitze), Mittelebene z (Wurzel, Spitze), Dicke (Wurzel, Spitze)
    'v': (2.3, 8.1, (11.9, 7.5), (1.0, 4.5), (6.42, 6.3), (0.52, 0.2)),
    'h': (2.5, 8.0, (-1.6, -6.9), (-13.0, -10.9), (6.4, 6.3), (0.5, 0.2)),
}
def naca(c, tc): return 5 * tc * (0.2969 * math.sqrt(max(c, 0.0)) - 0.126 * c - 0.3516 * c * c + 0.2843 * c ** 3 - 0.1036 * c ** 4)
def fl_geo(key, y):
    r, tp, le, te, zc, th = FLUEGEL[key]; u = max(0.0, min(1.0, (abs(y) - r) / (tp - r)))
    xa = le[0] + (le[1] - le[0]) * u; xb = te[0] + (te[1] - te[0]) * u; z = zc[0] + (zc[1] - zc[0]) * u; t = th[0] + (th[1] - th[0]) * u
    return xa, xb, z, t, u
def fl_oben(key, x, y):
    xa, xb, z, t, u = fl_geo(key, y); ch = xa - xb; c = max(0.0, min(1.0, (xa - x) / ch)); return z + naca(c, t / ch) * ch + 0.03 * math.sin(PI * c)
def fluegel(key, s):
    r, tp, le, te, zc, th = FLUEGEL[key]; NY, NC = 30, 30; bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten'); R = []
    ys = [r + (tp - r) * j / NY for j in range(NY + 1)]
    for y in ys:
        xa, xb, z, t, u = fl_geo(key, y); ch = xa - xb; cs = [(1 - math.cos(PI / 2 * i / NC)) for i in range(NC + 1)]
        top = [(xa - ch * c, z + naca(c, t / ch) * ch + 0.03 * math.sin(PI * c)) for c in cs]
        low = [(xa - ch * c, z - naca(c, t / ch) * ch * 0.55) for c in reversed(cs)]
        R.append([bm.verts.new((x, s * y, zz)) for x, zz in top + low[1:-1]])
    n = len(R[0])
    for j in range(NY):
        for i in range(n):
            q = (R[j][i], R[j + 1][i], R[j + 1][(i + 1) % n], R[j][(i + 1) % n]); f = bm.faces.new(q); c = sum((v.co for v in q), Vector()) / 4
            xa, xb, z, t, u = fl_geo(key, c.y); cc = (xa - c.x) / (xa - xb)
            f.material_index = GELB if (u > 0.93 or (u > 0.72 and cc < 0.1 and i < NC)) else (SCHWARZ if i >= NC else (EISEN if 0.35 < cc < 0.75 and 0.15 < u < 0.7 else GRAPHIT))
            for lp in f.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.y)
    bm.faces.new(R[0]); bm.faces.new(R[-1][::-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh_obj('Fluegel ' + key, bm, HULL_MATS, True, C_HULL)
    for c0 in (0.25, 0.5, 0.75):      # Plattenfugen auf der Oberseite (dem Profil folgend)
        P = []
        for j in range(21):
            y = r + 0.2 + (tp - r - 0.5) * j / 20; xa, xb, z, t, u = fl_geo(key, y); x = xa - (xa - xb) * c0; P.append(Vector((x, s * y, fl_oben(key, x, y) + 0.004)))
        for a, b in zip(P, P[1:]): slab('Fluegelfuge', (a + b) / 2, (b - a).normalized(), Vector((1, 0, 0)), ((b - a).length + 0.005, 0.025, 0.006), M['fuge'], 0.0)
    xa, xb, z, t, u = fl_geo(key, r + 0.05)
    prism('Wurzelverkleidung', [(xa + 0.3, z - 0.1), (xa - 0.6, z + t * 0.55), (xb + 0.4, z + t * 0.3), (xb - 0.2, z - 0.1)], s * (r - 0.4), s * (r + 0.3), M['schwarz'], 'Y', 0.05)
def deck():
    for s in (1, -1):
        fluegel('v', s); fluegel('h', s)
        for k in range(2):
            x, y = 6.7 - k * 1.9, 4.7; slab('Fluegelluefter', (x, s * y, fl_oben('v', x, y) + 0.008), Vector((1, 0, 0)), Vector((0, 1, 0)), (1.2, 0.8, 0.02), M['gitter'], 0.006)
        for key, (xa_, ya_), (xb_, yb_) in (('v', (9.6, 3.2), (6.4, 7.3)), ('h', (-3.6, 3.4), (-7.4, 7.2))):
            P = [Vector((xa_ + (xb_ - xa_) * j / 12, s * (ya_ + (yb_ - ya_) * j / 12), 0)) for j in range(13)]
            for p in P: p.z = fl_oben(key, p.x, abs(p.y)) + 0.012
            for a, b in zip(P, P[1:]): slab('Gelber Strich', (a + b) / 2, (b - a).normalized(), Vector((0, 0, 1)), ((b - a).length + 0.01, 0.05, 0.012), M['gelb'], 0.002)
        x, y = 5.4, 5.7; CUR[0] = C_PART; text('A%d' % (1 if s > 0 else 2), 0.75, (x, s * y, fl_oben('v', x, y) + 0.012), (0, -1, 0), (1, 0, 0), M['schwarz'], align='CENTER', name='Deckschrift')
        for k in range(3): x = -5.0 - k * 1.9; slab('Fluegelklappe', (x, s * 5.2, fl_oben('h', x, 5.2) + 0.006), Vector((1, 0, 0)), Vector((0, 1, 0)), (0.9, 0.6, 0.012), M['eisen'], 0.003)
    for x0, x1 in ((10.2, 5.6), (5.3, 0.7), (-0.6, -5.4), (-5.7, -10.6), (-10.9, -15.4)):      # mittlere Panzerplatten auf dem Dach
        w = min(prm(x0)[0], prm(x1)[0]) - prm(x0)[3] - 0.15
        if 0.7 < (x0 + x1) / 2 < 5.4: continue      # dort sitzt der Turm
        platte('Dachpanzer', [(x0, -w), (x0, w), (x1, w), (x1, -w)], lambda x: prm(x)[2] - 0.05, lambda x: prm(x)[2] + 0.12, GRAPHIT if x0 > 0 else EISEN, ins=0.06)
def rueckengrat():
    xs = [-1.4 - (16.4 - 1.4) * i / 60 for i in range(61)]; bm = bmesh.new(); L = bm.loops.layers.uv.new('Platten'); R = []
    for x in xs:
        Z = prm(x)[2] + 0.12; e = sstep((-1.4 - x) / 1.6); w = 1.3 - 0.2 * max(0.0, (-x - 10) / 6.4); h = 0.62 * e + 0.02
        half = _rund([(0.0, Z + h), (w - 0.4, Z + h), (w, Z + h - 0.32), (w + 0.12, Z - 0.05)], 0.08)
        poly = list(reversed([(-y, z) for y, z in half[1:]])) + half; R.append([bm.verts.new((x, y, z)) for y, z in poly])
    n = len(R[0])
    for i in range(len(xs) - 1):
        for k in range(n - 1):
            f = bm.faces.new((R[i][k], R[i + 1][k], R[i + 1][k + 1], R[i][k + 1])); f.material_index = SCHWARZ if 2 < k < n - 4 else GRAPHIT
            for lp in f.loops: lp[L].uv = (lp.vert.co.x, lp.vert.co.y)
    bm.faces.new(R[-1]); bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); mesh_obj('Rueckengrat', bm, HULL_MATS, True, C_HULL)
    Z = prm(-8.0)[2] + 0.12
    for k in range(5):
        slab('Gratgitter', (-4.0 - k * 2.3, 0, Z + 0.645), Vector((1, 0, 0)), Vector((0, 1, 0)), (1.6, 1.4, 0.02), M['gitter'], 0.004)
        for j in range(7): box('Gratlamelle', 0.04, 1.3, 0.03, -4.6 - k * 2.3 + j * 0.2, 0, Z + 0.66, M['schwarz'], 0.004)
    for x in (-3.0, -7.6, -12.2): box('Gratfuge', 0.03, 2.8, 0.7, x, 0, Z + 0.3, M['fuge'], 0.004)
    for s in (1, -1): rod('Gratleitung', Vector((-2.0, s * 1.45, Z + 0.05)), Vector((-15.0, s * 1.3, Z + 0.05)), 0.05, M['leitung'], 10)
    with Part('Kommunikationsmast', T(-14.4, 0, prm(-14.4)[2] + 0.72), C_PART):
        box('Mastsockel', 0.8, 0.5, 0.2, 0, 0, 0.1, M['schwarz'], 0.02); rod('Mast', Vector((0, 0, 0.15)), Vector((-0.3, 0, 1.4)), 0.04, M['schwarz'], 10)
        sphere('Mastlicht', 0.05, -0.3, 0, 1.42, M['warnlicht'], 10); cyl('Schuessel', 0.35, 0.08, -0.05, 0, 0.55, M['graphit'], 'X', n=24, bev=0.01)
TURM = (3.0, 0.0)
def rueckenturm():
    Z = prm(TURM[0])[2] + 0.12; x0, y0 = TURM
    cyl('Turmring', 2.3, 0.16, x0, y0, Z + 0.02, M['schwarz'], 'Z', n=96, bev=0.02)
    ring('Turmring gelb', 2.12, 0.035, (x0, y0, Z + 0.11), (0, 0, 1), M['gelb'], 96)
    cyl('Turmlager', 1.78, 0.22, x0, y0, Z + 0.21, M['graphit'], 'Z', n=96, bev=0.03)
    for k in range(28): a = 2 * PI * k / 28; box('Lagerzahn', 0.12, 0.06, 0.12, x0 + 1.86 * math.cos(a), y0 + 1.86 * math.sin(a), Z + 0.18, M['eisen'], 0.005, rot=(0, 0, a))
    with Part('Rueckenturm', T(x0, y0, Z + 0.32), C_WPN):
        prism('Turmkoerper', [(-1.15, 0.0), (0.9, 0.0), (1.3, 0.28), (1.0, 0.72), (-0.95, 0.78), (-1.2, 0.45)], -0.95, 0.95, M['graphit'], 'Y', 0.04)
        for s in (1, -1):
            prism('Turmwange', [(-0.8, 0.05), (0.6, 0.05), (0.95, 0.35), (0.5, 0.7), (-0.7, 0.7)], s * 0.95, s * 1.15, M['schwarz'], 'Y', 0.02)
            cyl('Rohrwiege', 0.2, 0.9, 0.95, s * 0.55, 0.42, M['schwarz'], 'X', n=20, bev=0.02)
            rod('Turmrohr', Vector((1.3, s * 0.55, 0.42)), Vector((4.0, s * 0.55, 0.42)), 0.07, M['dunkel'], 16)
            cyl('Muendungsbremse', 0.1, 0.35, 4.05, s * 0.55, 0.42, M['schwarz'], 'X', n=16, bev=0.01)
            for k in range(3): box('Bremsschlitz', 0.04, 0.22, 0.03, 3.95 + k * 0.08, s * 0.55, 0.52, M['dunkel'], 0.002)
            slab('Turmkante', (1.05, s * 0.75, 0.62), Vector((0.6, 0, -0.8)).normalized(), Vector((0, 1, 0)), (0.3, 0.3, 0.03), M['gelb'], 0.005)
            for k in range(3): box('Turmschuppe', 0.5, 0.03, 0.18, -0.6 + k * 0.5, s * 1.17, 0.35, M['eisen'], 0.004)
        box('Turmvisier', 0.5, 0.36, 0.3, 0.45, -0.3, 0.92, M['schwarz'], 0.03); cyl('Visierlinse', 0.09, 0.04, 0.72, -0.3, 0.92, M['kanzel'], 'X', n=16)
        box('Turmluke', 0.7, 0.6, 0.05, -0.45, 0.25, 0.8, M['eisen'], 0.02); box('Lukengriff', 0.3, 0.04, 0.03, -0.45, 0.25, 0.84, M['gelb'], 0.004)
        box('Turmgitter', 0.6, 1.2, 0.03, -0.95, 0, 0.62, M['gitter'], 0.004)
    ANCH['turm'] = Vector((x0 + 4.1, y0 + 0.55, Z + 0.74))
def flosse(s):
    Z = prm(-16.5)[2] + 0.1; cant = math.radians(25)
    R = Matrix.Translation(Vector((0, s * 2.55, Z))) @ Matrix.Rotation(-s * cant, 4, 'X')
    with Part('Heckflosse', R, C_HULL):
        prism('Flossenblatt', [(-14.8, 0.0), (-18.6, 0.0), (-19.6, 3.0), (-17.4, 3.0)], -0.13, 0.13, M['graphit'], 'Y', 0.04)
        prism('Flossenspitze', [(-17.35, 2.95), (-19.62, 2.95), (-19.7, 3.25), (-17.5, 3.25)], -0.14, 0.14, M['gelb'], 'Y', 0.03)
        prism('Flossenfuss', [(-14.4, -0.12), (-18.7, -0.12), (-18.8, 0.32), (-15.0, 0.32)], -0.25, 0.25, M['schwarz'], 'Y', 0.03)
        for k in range(4): box('Flossenrippe', 0.05, 0.3, 2.4, -16.0 - k * 0.72, 0, 1.45, M['schwarz'], 0.006)
        for k in range(3):
            for j in range(3): box('Flossengitter', 0.36, 0.3, 0.12, -16.3 - k * 0.78 - j * 0.15, 0, 0.7 + j * 0.25, M['gitter'], 0.005)
        sphere('Flossenlicht', 0.06, -19.5, 0, 3.15, M['nav_r' if s > 0 else 'nav_g'], 10)

# =====================================================================================
# 4. Ausleger und Triebwerksgondeln (gelandet: Düsen nach unten; im Flug um 90° nach hinten geschwenkt)
# =====================================================================================
GONDELN = {'gv': (7.4, 7.7, 3.45, (7.4, 5.2, 3.45)), 'gh': (-8.8, 8.6, 8.45, (-8.8, 6.9, 6.55))}      # Drehpunkt (x, |y|, z), Wurzel
def ausleger(a, b, w, h):
    d = b - a; u = d.normalized(); side = Vector((0, 0, 1)).cross(u).normalized(); up = u.cross(side).normalized()
    slab('Auslegerholm', (a + b) / 2, u, side, (d.length, w, h), M['graphit'], 0.03)
    slab('Auslegerdecke', (a + b) / 2 + up * (h / 2 + 0.01), u, side, (d.length - 0.2, w - 0.15, 0.03), M['schwarz'], 0.006)
    slab('Auslegerstreifen', (a + b) / 2 + up * (h / 2 + 0.03) + side * (w / 2 - 0.12), u, side, (d.length * 0.5, 0.06, 0.012), M['gelb'], 0.002)
    rod('Auslegerleitung', a - up * (h / 2 + 0.06) + side * 0.15, b - up * (h / 2 + 0.06) + side * 0.15, 0.05, M['leitung'], 10)
    slab('Auslegerfuss', a + u * 0.3, u, side, (0.75, w + 0.4, h + 0.45), M['schwarz'], 0.04)
def gondel(key, s):
    xc, yc, zc, wurzel = GONDELN[key]; y = s * yc; tag = '%s_%s' % (key, 'l' if s > 0 else 'r'); C = Vector((xc, y, zc))
    a = Vector((wurzel[0], s * wurzel[1], wurzel[2])); b = Vector((xc, y - s * 1.3, zc)); ausleger(a, b, 0.8, 0.55 if key == 'gv' else 0.65)
    if key == 'gh':      # Pylon: schräg von der Plattenspitze hinauf, Strebe darunter
        rod('Pylonstrebe', a + Vector((0.9, 0, -0.1)), b + Vector((0.6, 0, -0.35)), 0.07, M['schwarz'], 12); rod('Pylonstrebe', a + Vector((-0.9, 0, -0.1)), b + Vector((-0.6, 0, -0.35)), 0.07, M['schwarz'], 12)
    cyl('Schwenklager', 0.5, 0.55, xc, y - s * 1.22, zc, M['schwarz'], 'Y', n=32, bev=0.03)
    ring('Lagerring', 0.52, 0.03, (xc, y - s * 1.0, zc), (0, 1, 0), M['gelb'], 32)
    with Gruppe(tag):
        with Part('Triebwerksgondel', Matrix.Translation(C), C_PART):
            prof = [(-2.0, -1.0), (-1.62, -1.55), (1.5, -1.55), (2.0, -1.1), (2.0, 1.0), (1.5, 1.55), (-1.45, 1.55), (-2.0, 1.05)]
            prism('Gondelkoerper', prof, -1.0, 1.0, M['graphit'], 'Y', 0.05)
            prism('Gondelpanzer', [(-1.7, -1.1), (1.55, -1.1), (1.82, -0.8), (1.82, 0.85), (1.4, 1.27), (-1.35, 1.27), (-1.7, 0.9)], s * 1.0, s * 1.14, M['schwarz'], 'Y', 0.03)
            prism('Gondelpanzer', [(-1.5, -0.9), (1.3, -0.9), (1.5, -0.65), (1.5, 0.7), (1.15, 1.05), (-1.15, 1.05), (-1.5, 0.75)], s * 1.14, s * 1.2, M['eisen'], 'Y', 0.02)
            box('Gondelnabe', 0.95, 0.3, 0.95, 0, -s * 1.1, 0, M['schwarz'], 0.03)
            # Einlass oben (im Flug, geschwenkt, zeigt er nach vorn), vorn eine Panzerstirn mit Kühlschlitzen
            box('Einlassrahmen', 2.6, 1.8, 0.12, -0.05, 0, 1.6, M['schwarz'], 0.03); box('Einlassgrund', 2.35, 1.55, 0.05, -0.05, 0, 1.63, M['schacht'], 0.005)
            for k in range(13): box('Einlasslamelle', 0.045, 1.55, 0.16, -1.2 + k * 0.19, 0, 1.64, M['gitter'], 0.006, rot=(0, math.radians(18), 0))
            for yy in (-0.4, 0.4): box('Einlassschutz', 2.35, 0.06, 0.05, -0.05, yy, 1.68, M['schwarz'], 0.005)
            box('Stirnpanzer', 0.1, 1.75, 2.3, 2.04, 0, -0.05, M['eisen'], 0.03)
            for k in range(5): box('Kuehlschlitz', 0.03, 1.2, 0.06, 2.1, 0, -0.7 + k * 0.3, M['gitter'], 0.004)
            box('Stirnschild', 0.02, 0.5, 0.3, 2.1, -s * 0.5, 0.8, M['warnrw'], 0.002)
            box('Auslassrahmen', 0.1, 1.7, 2.2, -2.04, 0, 0.05, M['schwarz'], 0.03)
            for k in range(10): box('Leitblech', 0.18, 0.04, 2.0, -2.07, -0.72 + k * 0.16, 0.05, M['gitter'], 0.004)
            for dx in (-0.82, 0.82):
                cyl('Duesenkragen', 0.64, 0.22, dx, 0, -1.6, M['schwarz'], 'Z', n=40, bev=0.03)
                cyl('Duesenschacht', 0.54, 0.3, dx, 0, -1.52, M['schacht'], 'Z', n=40); cyl('Duesenglut', 0.48, 0.02, dx, 0, -1.4, M['hubglut'], 'Z', n=40)
                ring('Duesenring', 0.57, 0.035, (dx, 0, -1.7), (0, 0, 1), M['duese'], 40)
                for k in range(8): box('Duesenschaufel', 0.06, 0.95, 0.02, dx - 0.38 + k * 0.11, 0, -1.55, M['eisen'], 0.002, rot=(0, math.radians(14), 0))
            for sg in (1, -1):
                yy = sg * 1.205 if sg == s else sg * 1.005
                box('Gondelklappe', 1.2, 0.02, 0.75, -0.3, yy, 0.35, M['graphit'], 0.008); box('Klappenfuge', 1.24, 0.015, 0.02, -0.3, yy, 0.74, M['fuge'], 0.002)
                box('Warnmarke', 0.35, 0.02, 0.35, 1.3, yy, 1.0, M['warnrw'], 0.002)
                for k in range(3): box('Gondelgriff', 0.18, 0.04, 0.025, -1.25 + k * 0.3, yy + sg * 0.02, -0.65, M['eisen'], 0.004)
            box('Gondelstreifen', 0.08, 0.9, 0.02, 1.85, 0, 1.58, M['gelb'], 0.002)
            sphere('Gondellicht', 0.06, 1.62, s * 1.05, 1.33, M['nav_r' if s > 0 else 'nav_g'], 10)
            box('Gondelkante', 0.14, 2.0, 0.1, 1.95, 0, 1.5, M['gelb'], 0.01); box('Gondelkante', 0.14, 2.0, 0.1, 1.95, 0, -1.5, M['gelb'], 0.01)
    gelenk(tag, tuple(C), 'Y', math.radians(90), 'fw', 0.08, 0.92)
    for dx in (-0.82, 0.82): DUESEN['hub'].append({'p': [round(xc + dx, 3), round(y, 3), round(zc - 1.72, 3)], 'd': [0, 0, -1], 'r': 0.5})
    DUESEN['haupt'].append({'p': [round(xc - 1.72, 3), round(y, 3), round(zc - 0.82, 3)], 'd': [-1, 0, 0], 'r': 0.5})      # im Flug (geschwenkt)

# =====================================================================================
# 5. Fahrwerk in den Wülsten (Bein klappt um die Hüfte, Fuß gegenläufig), Heckrampe, Seitentür
# =====================================================================================
def schacht(x0, x1, s):
    zb = wprm((x0 + x1) / 2)[2]
    open_box('Fahrwerksschacht', x0 + 0.05, x1 - 0.05, s * BAY_Y[0] if s > 0 else -BAY_Y[1], s * BAY_Y[1] if s > 0 else -BAY_Y[0], zb + 0.02, zb + 1.35, M['schacht'], '-z', C_GEAR)
    for k in range(3): box('Schachtrippe', 0.05, BAY_Y[1] - BAY_Y[0] - 0.1, 1.25, x0 + 0.5 + k * (x1 - x0 - 1.0) / 2, s * sum(BAY_Y) / 2, zb + 0.68, M['schwarz'], 0.005)
def bein(key, xh, s, dirn):
    yc = s * sum(BAY_Y) / 2; zb = wprm(xh)[2]; H = Vector((xh, yc, zb + 0.95)); A = Vector((xh, yc, 0.55)); tag = 'fw%s_%s' % (key, 'l' if s > 0 else 'r')
    K = H.lerp(A, 0.5) + Vector((dirn * 0.25, 0, 0))
    with Gruppe(tag):
        with Part('Landebein', T(0, 0, 0), C_GEAR):
            box('Hueftbock', 0.8, 0.85, 0.45, H.x, H.y, H.z + 0.05, M['bein'], 0.04); rod('Hueftachse', H - Vector((0, 0.5, 0)), H + Vector((0, 0.5, 0)), 0.11, M['chrom'], 16)
            d = K - H; u = d.normalized(); side = Vector((0, 1, 0))
            slab('Oberschenkel', (H + K) / 2, u, side, (d.length + 0.3, 0.62, 0.5), M['bein'], 0.05)
            slab('Schenkelplatte', (H + K) / 2 + u.cross(side).normalized() * 0.27 * dirn, u, side, (d.length * 0.85, 0.66, 0.06), M['graphit'], 0.02)
            rod('Knieachse', K - Vector((0, 0.36, 0)), K + Vector((0, 0.36, 0)), 0.13, M['chrom'], 16)
            rod('Federbein', K, K.lerp(A, 0.6), 0.2, M['bein'], 20); rod('Federkolben', K.lerp(A, 0.5), A + Vector((0, 0, 0.1)), 0.13, M['chrom'], 18)
            for f in (0.15, 0.35): ring('Beinschelle', 0.215, 0.02, tuple(K.lerp(A, f)), tuple((A - K).normalized()), M['schwarz'], 20)
            for sg in (1, -1):
                p = H + Vector((-dirn * 0.38, sg * 0.25, -0.12)); q = K.lerp(A, 0.55) + Vector((-dirn * 0.2, sg * 0.25, 0))
                rod('Strebenzylinder', p, p.lerp(q, 0.55), 0.09, M['eisen'], 14); rod('Strebenstange', p.lerp(q, 0.5), q, 0.05, M['chrom'], 10)
            box('Knoechel', 0.55, 0.52, 0.32, A.x, A.y, A.z + 0.05, M['bein'], 0.04); rod('Knoechelachse', A - Vector((0, 0.3, 0)), A + Vector((0, 0.3, 0)), 0.08, M['chrom'], 14)
            box('Beinwarnung', 0.02, 0.4, 0.45, K.x + dirn * 0.22, K.y, K.z, M['warnrw'], 0.002)
            cyl('Beinscheinwerfer', 0.09, 0.06, K.x + dirn * 0.25, K.y, K.z + 0.3, M['landelicht'], 'X', n=16)
    gelenk(tag, tuple(H), 'Y', dirn * math.radians(90), 'fw', 0.05, 0.7)
    ftag = tag.replace('fw', 'fp')
    with Gruppe(ftag):
        with Part('Landefuss', T(0, 0, 0), C_GEAR):
            pf = [(xh - 0.85, 0.0), (xh + 0.85, 0.0), (xh + 0.85, 0.2), (xh + 0.62, 0.36), (xh - 0.62, 0.36), (xh - 0.85, 0.2)]
            prism('Fussplatte', pf, yc - 0.55, yc + 0.55, M['bein'], 'Y', 0.025)
            prism('Fusssohle', [(xh - 0.83, -0.01), (xh + 0.83, -0.01), (xh + 0.83, 0.04), (xh - 0.83, 0.04)], yc - 0.53, yc + 0.53, M['rubber'], 'Y', 0.008)
            for sg in (1, -1): box('Fusskante', 1.6, 0.03, 0.11, xh, yc + sg * 0.555, 0.11, M['gelb'], 0.002)
            for k in range(3): box('Fussrippe', 0.06, 0.95, 0.12, xh - 0.45 + k * 0.45, yc, 0.4, M['schwarz'], 0.008)
            box('Fussbock', 0.42, 0.45, 0.24, xh, yc, 0.42, M['bein'], 0.02); sphere('Kontaktlampe', 0.03, xh + 0.8, yc, 0.26, M['e_green'], 8)
    gelenk(ftag, tuple(A), 'Y', -dirn * math.radians(90), 'fw', 0.05, 0.7)
    UNTER[ftag] = tag; ANCH['fuss_%s%d' % (key, s)] = Vector((xh, yc, 0.0))
def fahrwerk():
    for s in (1, -1):
        schacht(*BAY_V, s); schacht(*BAY_H, s)
        bein('v', BAY_V[1] - 0.55, s, 1); bein('h', BAY_H[0] + 0.55, s, -1)
        for key, (x0, x1) in (('v', BAY_V), ('h', BAY_H)):
            zb = wprm((x0 + x1) / 2)[2]; w = (BAY_Y[1] - BAY_Y[0]) / 2
            for k, (yy, sg) in enumerate(((BAY_Y[0], 1), (BAY_Y[1], -1))):
                tg = 'fw%sk_%s%d' % (key, 'l' if s > 0 else 'r', k)
                with Gruppe(tg):
                    box('Schachtklappe', x1 - x0 - 0.12, w - 0.02, 0.05, (x0 + x1) / 2, s * (yy + sg * w / 2), zb - 0.03, M['schwarz'], 0.01)
                    box('Klappenrand', x1 - x0 - 0.14, 0.05, 0.012, (x0 + x1) / 2, s * (yy + sg * (w - 0.06)), zb - 0.06, M['gelb'], 0.002)
                gelenk(tg, ((x0 + x1) / 2, s * yy, zb), 'X', -s * sg * math.radians(95), 'fw', 0.7, 1.0)
RAMP_L2 = 2.6
def _rampenblatt(tag, h, nx, L1, L2, hw, kipp, auf, t0, t1, t2):
    H = Vector(h); R = Matrix.Translation(H) @ Matrix.Rotation(kipp, 4, 'Y') @ Matrix.Translation(-H); xb = H.x - nx * 0.1
    with Gruppe(tag):
        with Part('Rampe ' + tag, R, C_PART):
            box('Rampenblatt', 0.2, 2 * hw, L1, xb, 0, H.z + L1 / 2, M['schwarz'], 0.03)
            box('Rampenhaut', 0.012, 2 * hw - 0.3, L1 - 0.3, xb + nx * 0.105, 0, H.z + L1 / 2, M['graphit'], 0.004)
            for k in range(int(L1 / 0.3)): box('Gitterleiste', 0.04, 2 * hw - 0.9, 0.08, xb - nx * 0.12, 0, H.z + 0.25 + k * 0.3, M['eisen'], 0.006)
            for s in (1, -1):
                box('Rampenwange', 0.32, 0.35, L1, xb - nx * 0.06, s * (hw - 0.18), H.z + L1 / 2, M['graphit'], 0.015)
                for k in range(int(L1 / 0.55)): box('Warnstreifen', 0.012, 0.36, 0.3, xb - nx * 0.225, s * (hw - 0.18), H.z + 0.3 + k * 0.55, M['gelb'], 0.002)
                for k in range(3): box('Rampenrippe', 0.1, 0.08, L1 - 0.3, xb + nx * 0.13, s * (0.5 + k * 0.55), H.z + L1 / 2, M['schwarz'], 0.01)
            box('Rampenlicht', 0.03, 2 * hw - 1.2, 0.04, xb - nx * 0.13, 0, H.z + L1 - 0.18, M['landelicht'], 0.004)
            for s in (1, -1): cyl('Rampenscharnier', 0.1, 0.5, H.x, s * (hw - 0.7), H.z + 0.02, M['chrom'], 'Y', n=16)
    gelenk(tag, tuple(H), 'Y', auf, 'rampe', t0, t1)
    d = Vector((math.sin(kipp), 0, math.cos(kipp)))
    with Gruppe(tag + '2'):
        with Part('Verlaengerung ' + tag, R, C_PART):
            box('Verlaengerung', 0.1, 2 * hw - 0.5, L2, xb, 0, H.z + L1 - L2 / 2 - 0.1, M['eisen'], 0.012)
            for k in range(int(L2 / 0.3)): box('Gitterleiste', 0.035, 2 * hw - 1.0, 0.06, xb - nx * 0.07, 0, H.z + L1 - L2 + 0.15 + k * 0.3, M['eisen'], 0.005)
            box('Rampenkante', 0.14, 2 * hw - 0.5, 0.1, xb, 0, H.z + L1 - 0.12, M['gelb'], 0.012)
    gelenk(tag + '2', (0, 0, 0), None, 0.0, 'rampe', t1 - 0.05, t2, slide=tuple(d * (L2 - 0.12)))
    ANCH[tag + '_scharnier'] = H.copy()
HR_L1 = 0.0
def heckrampe():
    global HR_L1
    H = Vector((HR_X, 0, FL)); top = Vector((XE + 0.05, 0, HK[3])); d = top - H; HR_L1 = d.length
    kipp = math.atan2(d.x, d.z); Lt = HR_L1 + RAMP_L2 - 0.12; a = math.asin(FL / Lt); phi_o = math.atan2(-math.cos(a), -math.sin(a))
    _rampenblatt('rampe', tuple(H), -1, HR_L1, RAMP_L2, RAMP_HW - 0.05, kipp, phi_o - kipp, 0.1, 0.72, 0.96)
def seitentuer():
    x0, x1, z0, z1 = TUER; xm, zm = (x0 + x1) / 2, (z0 + z1) / 2; t = t_for_z(xm, zm, -1); p = hull_point(xm, t); n = hull_normal(xm, t)
    slab('Seitentuer', p, Vector((1, 0, 0)), Vector((0, 0, 1)), (x1 - x0 + 0.02, z1 - z0 + 0.02, 0.06), M['eisen'], 0.02)
    slab('Tuerrahmen', p + n * 0.02, Vector((1, 0, 0)), Vector((0, 0, 1)), (x1 - x0 + 0.2, z1 - z0 + 0.2, 0.03), M['schwarz'], 0.01)
    slab('Tuerfenster', p + n * 0.04 + Vector((0, 0, 0.5)), Vector((1, 0, 0)), Vector((0, 0, 1)), (0.5, 0.35, 0.02), M['kanzel'], 0.005)
    slab('Tuergriff', p + n * 0.045 + Vector((0.5, 0, -0.1)), Vector((1, 0, 0)), Vector((0, 0, 1)), (0.06, 0.3, 0.04), M['gelb'], 0.005)
    for k in range(2): slab('Tritt', hull_point(xm, t_for_z(xm, z0 - 0.15 - k * 0.42, -1)) + n * 0.08, Vector((1, 0, 0)), Vector((0, 0, 1)), (0.7, 0.06, 0.18), M['eisen'], 0.008)
    slab('Tuerwarnung', p + n * 0.04 + Vector((0, 0, z1 - zm + 0.18)), Vector((1, 0, 0)), Vector((0, 0, 1)), (x1 - x0, 0.12, 0.02), M['warnrw'], 0.003)

# =====================================================================================
# 6. Waffen, Steuer- und Hubdüsen, Rumpfdetails, Beschriftung
# =====================================================================================
def waffen():
    zb = prm(14.5)[1]
    for s in (1, -1):
        with Part('Kinnkanone', T(14.2, s * 0.8, zb - 0.2), C_WPN):
            box('Kanonengehaeuse', 1.6, 0.42, 0.36, 0, 0, 0, M['schwarz'], 0.04); rod('Kanonenrohr', Vector((0.8, 0, 0)), Vector((3.5, 0, 0)), 0.055, M['dunkel'], 14)
            cyl('Rohrmantel', 0.09, 1.1, 1.4, 0, 0, M['graphit'], 'X', n=16, bev=0.01); cyl('Muendung', 0.075, 0.25, 3.55, 0, 0, M['schwarz'], 'X', n=16, bev=0.01)
            box('Patronenzufuhr', 0.6, 0.16, 0.2, -0.3, -s * 0.28, -0.05, M['eisen'], 0.02)
        ANCH['kanone%d' % s] = Vector((17.8, s * 0.8, zb - 0.2))
    with Part('Kinnsensor', T(13.0, 0, prm(13.0)[1] - 0.05), C_PART):
        cyl('Sensorhalter', 0.18, 0.25, 0, 0, -0.12, M['schwarz'], 'Z', n=20); sphere('Sensorkugel', 0.28, 0, 0, -0.38, M['graphit'], 24); cyl('Sensorauge', 0.1, 0.06, 0.26, 0, -0.38, M['kanzel'], 'X', n=16)
def rcs_block(name, p, n_out, up, fwd):
    n_out = Vector(n_out).normalized(); up = Vector(up); up = (up - n_out * up.dot(n_out)).normalized(); fwd = Vector(fwd).normalized(); side = up.cross(n_out).normalized()
    with Part(name, Matrix.Translation(p) @ Matrix((side, up, n_out)).transposed().to_4x4(), C_PART):
        prism('Duesenblock', [(-0.26, -0.18), (0.26, -0.18), (0.3, 0.0), (0.26, 0.18), (-0.26, 0.18), (-0.3, 0.0)], -0.01, 0.14, M['schwarz'], 'Z', 0.02)
    for nm, d in (('aussen', n_out), ('senk', up), ('laengs', fwd)):
        q = p + n_out * 0.09 + (d * 0.0 if nm == 'aussen' else d * 0.18)
        rod('Steuerduese', q - d * 0.07, q + d * 0.09, 0.055, M['duese'], 16, r2=0.075); sphere('Steuerglut', 0.035, *(q + d * 0.07), M['rcsglut'], 10)
        DUESEN['rcs'].append({'p': [round(v, 3) for v in (q + d * 0.09)], 'd': [round(v, 3) for v in d]})
def steuerduesen():
    for s in (1, -1):
        for x, z, upd, fw in ((15.0, 4.0, 1, 1), (14.4, 2.75, -1, 1), (-16.6, 5.3, 1, -1), (-12.6, 2.6, -1, -1)):
            t = t_for_z(x, z, s); rcs_block('Steuerduesen', hull_point(x, t), hull_normal(x, t), (0, 0, upd), (fw, 0, 0))
def details():
    CUR[0] = C_PART
    for x in (-15.8, -12.2, -9.8, 11.0, 13.6):
        hull_band('Spantfuge', [(x, -PI + 2 * PI * i / 288) for i in range(289)], 0.03, 0.01, M['fuge'], False)
    for s in (1, -1):
        for x0, x1, z0, z1 in ((-15.4, -14.0, 3.6, 4.6), (-13.4, -12.2, 4.9, 5.6), (11.4, 12.6, 3.3, 4.0)):
            side_patch('Wartungsklappe', x0, x1, z0, z1, 0.06, s, 0.016, M['eisen'], 4, 6); side_frame('Klappenfuge', x0 - 0.02, x1 + 0.02, z0 - 0.02, z1 + 0.02, 0.07, s, 0.014, 0.01, M['fuge'])
        for x0 in (-17.0, -15.0):
            side_patch('Waermetauscher', x0, x0 + 1.4, 3.3, 3.95, 0.05, s, 0.012, M['gitter'], 4, 8)
            side_frame('Tauscherrahmen', x0 - 0.04, x0 + 1.44, 3.26, 3.99, 0.06, s, 0.05, 0.03, M['schwarz'])
        hull_band('Gelbe Linie', [(x, t_for_z(x, 5.4, s)) for x in [-16.8 + 6.0 * i / 30 for i in range(31)]], 0.05, 0.008, M['gelb'], False)
        for x in (-14.0, 12.0): t = t_for_z(x, prm(x)[1] + 0.3, s); sphere('Bauchlicht', 0.05, *(hull_point(x, t) + hull_normal(x, t) * 0.03), M['warnlicht'], 10)
        # Oberseite der Fase: Haltegriffe, Lüfter, Leitungen
        for x in (-4.5, 0.0, 4.5): t = t_for_z(x, 5.9, s); slab('Fasenluefter', hull_point(x, t) + hull_normal(x, t) * 0.012, Vector((1, 0, 0)), hull_normal(x, t).cross(Vector((1, 0, 0))).normalized(), (1.2, 0.3, 0.02), M['gitter'], 0.004)
    for x in (-1.0, -6.0, -11.0):      # Unterseite zwischen den Wülsten: Hubdüsen
        zb = prm(x)[1]
        for s in (1, -1):
            c = Vector((x, s * 1.2, zb - 0.005))
            with Part('Hubduese', Matrix.Translation(c), C_PART):
                ring('Hubrand', 0.45, 0.04, (0, 0, 0), (0, 0, 1), M['schwarz'], 36); cyl('Hubschacht', 0.41, 0.35, 0, 0, 0.18, M['schacht'], 'Z', n=36); cyl('Hubglut', 0.36, 0.02, 0, 0, 0.3, M['hubglut'], 'Z', n=28)
            DUESEN['hub'].append({'p': [x, s * 1.2, zb - 0.05], 'd': [0, 0, -1], 'r': 0.36})
        box('Bodenleiste', 1.6, 0.4, 0.04, x - 1.5, 0, zb - 0.02, M['streifen'] if x == -6.0 else M['schwarz'], 0.006)
def greebles():
    """zweite Detailrunde: Flanke über dem Wulst, Deck, Nase, Unterseite"""
    CUR[0] = C_PART
    for s in (1, -1):
        # Flanke zwischen Wulst und Deckplatten: Lüfterreihe, Kästen, Leitungen
        for k in range(9):
            x = -8.4 + k * 2.15
            if 1.0 < x < 3.8: continue
            t = t_for_z(x, 5.42, s); p = hull_point(x, t); n = hull_normal(x, t)
            if k % 3 == 1: slab('Flankenkasten', p + n * 0.09, Vector((1, 0, 0)), Vector((0, 0, 1)), (1.1, 0.42, 0.18), M['schwarz'], 0.02); slab('Kastenleuchte', p + n * 0.185 + Vector((0.35, 0, 0)), Vector((1, 0, 0)), Vector((0, 0, 1)), (0.12, 0.06, 0.01), M['e_green'], 0.002)
            else:
                slab('Flankenluefter', p + n * 0.012, Vector((1, 0, 0)), Vector((0, 0, 1)), (1.3, 0.38, 0.02), M['gitter'], 0.004)
                for j in range(6): slab('Luefterlamelle', p + n * 0.03 + Vector((-0.52 + j * 0.21, 0, 0)), Vector((1, 0, 0)), Vector((0, 0, 1)), (0.05, 0.34, 0.03), M['schwarz'], 0.003)
        p0 = hull_point(-9.0, t_for_z(-9.0, 5.12, s)); p1 = hull_point(9.0, t_for_z(9.0, 5.12, s))
        rod('Flankenleitung', p0 + Vector((0, s * 0.07, 0)), p1 + Vector((0, s * 0.07, 0)), 0.045, M['leitung'], 10)
        for x in (-6.0, -2.0, 4.0, 8.0): rod('Leitungsschelle', hull_point(x, t_for_z(x, 5.12, s)) + Vector((0, s * 0.02, 0)), hull_point(x, t_for_z(x, 5.12, s)) + Vector((0, s * 0.13, 0)), 0.06, M['schwarz'], 10)
        # Nase: Panzerlamellen, Klappe, Sensorbuckel, Warnecken
        for k in range(4):
            x = 12.4 + k * 0.85; t = t_for_z(x, 3.55, s); p = hull_point(x, t); n = hull_normal(x, t)
            slab('Nasenlamelle', p + n * 0.03, Vector((1, 0, 0)), n.cross(Vector((1, 0, 0))).normalized(), (0.7, 0.55, 0.05), M['graphit'] if k % 2 else M['eisen'], 0.01)
        t = t_for_z(15.4, 3.95, s); p = hull_point(15.4, t); n = hull_normal(15.4, t)
        sphere('Nasensensor', 0.14, *(p + n * 0.04), M['schwarz'], 16); sphere('Sensorglas', 0.07, *(p + n * 0.15), M['kanzel'], 12)
        t = t_for_z(16.2, 3.6, s); p = hull_point(16.2, t); n = hull_normal(16.2, t)
        slab('Nasenwarnung', p + n * 0.01, Vector((1, 0, 0)), Vector((0, 0, 1)), (0.35, 0.3, 0.01), M['warnrw'], 0.002)
        # Deck: Laufstreifen (rutschfest), Zurrpunkte, Positionslichter an den Plattenspitzen, Lukendeckel
        Z = 6.4
        for key, x, y in (('v', 9.0, 3.6), ('v', 6.0, 6.0), ('h', -4.5, 4.0), ('h', -8.5, 6.2), ('h', -10.0, 4.0)):
            z = fl_oben(key, x, y); cyl('Zurrpunkt', 0.08, 0.04, x, s * y, z + 0.01, M['eisen'], 'Z', n=12); ring('Zurroese', 0.07, 0.012, (x, s * y, z + 0.06), (1, 0, 0), M['chrom'], 12)
        for key, x, y in (('v', 6.4, 8.12), ('h', -8.2, 8.02)):
            z = fl_geo(key, y)[2]; box('Spitzenleuchte', 0.5, 0.05, 0.06, x, s * (y + 0.01), z, M['nav_r' if s > 0 else 'nav_g'], 0.01); sphere('Blitzer', 0.05, x - 0.7, s * (y - 0.15), fl_oben(key, x - 0.7, y - 0.15) + 0.04, M['blitz'], 8)
        # Unterseite der Wülste: Bodenleisten, Leuchten, Kufen
        yo, zt, zb, f = wprm(2.0)
        for x in (-1.5, 2.5, 6.5): box('Wulstkufe', 2.6, 0.18, 0.12, x, s * (yo - 0.7), zb - 0.06, M['schwarz'], 0.02)
        for x in (0.5, 4.5): sphere('Wulstlicht', 0.06, x, s * (yo - 0.25), zb + 0.05, M['landelicht'], 10)
    # Deckmitte: Luken, Antennen, Haltebügel
    for x in (8.4, -3.2, -9.0):
        Zd = prm(x)[2] + 0.12
        box('Dachluke', 1.1, 0.9, 0.05, x, 1.6 if x > 0 else -1.75, Zd + 0.02, M['eisen'], 0.015); box('Lukenrand', 1.16, 0.06, 0.012, x, (1.6 if x > 0 else -1.75) + 0.45, Zd + 0.05, M['gelb'], 0.002)
        for dy in (-0.25, 0.25): rod('Haltebuegel', Vector((x - 0.3, (1.6 if x > 0 else -1.75) + dy, Zd + 0.05)), Vector((x + 0.3, (1.6 if x > 0 else -1.75) + dy, Zd + 0.05)), 0.018, M['chrom'], 6)
    for x, y, h in ((9.2, -1.8, 0.9), (-10.5, 1.9, 1.3), (6.8, -2.0, 0.5)):
        Zd = prm(x)[2] + 0.12; rod('Dachantenne', Vector((x, y, Zd)), Vector((x - 0.12, y, Zd + h)), 0.02, M['schwarz'], 8); sphere('Antennenspitze', 0.03, x - 0.12, y, Zd + h, M['blitz'], 8)
def label_on(x, z, s, size, text_, m='txtd'):
    t = t_for_z(x, z, s); return surf_text(text_, size, hull_point(x, t), hull_normal(x, t), (0, 0, 1), m)
def markings():
    for s in (1, -1):
        label_on(-14.6, 5.35, s, 0.42, 'HARPYIE', TXT); label_on(-12.2, 2.75, s, 0.09, 'LANDUNGSSCHIFF · BASTION-WERFT · RUMPF 07', TXT)
        yo = wprm(3.0)[0]; CUR[0] = C_PART
        surf_text('HP-1', 0.55, Vector((1.6, s * (yo + 0.105), 2.75)), Vector((0, s, 0)), (0, 0, 1), TXT)
        surf_text('FAHRWERK · ABSTAND HALTEN', 0.08, Vector((10.3, s * (yo + 0.105), 2.2)), Vector((0, s, 0)), (0, 0, 1), TXT)

# =====================================================================================
# Zustand, Ansichten, Bau
# =====================================================================================
def gelenke_anlegen():
    def piv(tag, hinge):
        e = bpy.data.objects.new('Gelenk ' + tag, None); C_PART.objects.link(e); e.location = hinge; e.empty_display_size = 0.15; PIVOTS[tag] = e
        for o in GRUPPEN.get(tag, []):
            if o.parent is not None: continue
            o.parent = e; o.matrix_parent_inverse = Matrix.Translation(Vector(hinge)).inverted()
        return e
    for g in GELENKE:
        e = piv(g['tag'], g['hinge'] if not g['slide'] else (0, 0, 0))
        for o in [e] + list(e.children_recursive): o['tag'] = g['tag']
    for a, b in UNTER.items():
        if a in PIVOTS and b in PIVOTS:
            e2 = PIVOTS[a]; e1 = PIVOTS[b]; e2.parent = e1; e2.matrix_parent_inverse = Matrix.Translation(Vector(e1.location)).inverted()
    for g in GELENKE:
        if g['tag'] in UNTER: g['under'] = UNTER[g['tag']]
def zustand(fw=0.0, rampe=0.0):
    want = {'fw': fw, 'rampe': rampe}
    for g in GELENKE:
        e = PIVOTS[g['tag']]; p = want[g['grp']]; k = ease((p - g['t0']) / (g['t1'] - g['t0']))
        if g['slide']: e.location = Vector(g['slide']) * k
        else: e.rotation_euler = (0, 0, 0); e.rotation_euler[{'X': 0, 'Y': 1, 'Z': 2}[g['axis']]] = g['angle'] * k
    bpy.context.view_layer.update()
ZUST = {}
def view(name, path, res=(1600, 900)):
    st = ZUST.get(name, {}); zustand(st.get('fw', 0.0), st.get('rampe', 0.0))
    for o in bpy.data.objects:
        if o.name.startswith('Kanzelglas'): o.hide_render = name.startswith('cp_') or name.startswith('in_')
    boden = bpy.data.objects.get('Boden grau'); bz = boden.location.z if boden else 0
    if boden and name in ('unten', 'flugunten'): boden.location.z = -60
    try: _view0(name, path, res)
    finally:
        if boden: boden.location.z = bz
def build():
    global BVH
    hull, rings, XS = build_hull()
    BVH = make_bvh([hull]); ring0 = [v.co.copy() for v in rings[0]]; ringN = [v.co.copy() for v in rings[-1]]
    mesh_obj('Rumpf', hull, HULL_MATS, True, C_HULL)
    heckflaeche(ring0); bugstirn(ringN)
    for s in (1, -1): wulst(s)
    kanzel(); deck(); rueckengrat(); rueckenturm()
    for s in (1, -1): flosse(s); gondel('gv', s); gondel('gh', s)
    fahrwerk(); heckrampe(); seitentuer(); waffen(); steuerduesen(); details(); greebles(); markings()
    for nm in ('har_innen.py', 'har_cockpit.py'):
        p = os.path.join(HIER, nm)
        if os.path.exists(p): exec(compile(open(p, encoding='utf-8').read(), nm, 'exec'), globals())
    gelenke_anlegen()
    stages(); world('grau')
    for nm, loc, yaw in (('Figur Studio', (21.0, -8.0, 0), 2.6), ('Figur Pilot', (19.5, -9.0, 0), 2.3), ('Figur Techniker', (-25.0, -3.0, 0), 1.2)):
        if nm in bpy.data.objects: o = bpy.data.objects[nm]; o.location = loc; o.rotation_euler = (0, 0, yaw)
    for nm, loc, tgt, lens in (('Schraeg', (32, 24, 13), (-0.5, 0, 4.0), 36), ('Hangar', (30, 20, 6.5), (0.0, 0.5, 4.0), 30), ('Heck', (-34, -24, 12), (-5.0, 0, 4.0), 34),
                               ('Cockpit', (22.0, 6.0, 8.0), (14.0, 0, 5.4), 28), ('Detail', (15.0, 14.0, 4.5), (7.4, 7.7, 3.4), 30), ('Weltraum', (31, -24, 15), (0.0, 0, 4.0), 38)):
        c = CAMS[nm]; c.location = loc; c.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); c.data.lens = lens
    CAMS['Seite'].location = (-1.0, 100, 4.6); CAMS['Front'].location = (100, 0, 4.6); CAMS['Front'].data.ortho_scale = 25; CAMS['Seite'].data.ortho_scale = 42
    CAMS['Draufsicht'].data.ortho_scale = 42; CAMS['Draufsicht'].location = (-1.0, 0, 100); CAMS['Draufsicht'].rotation_euler = (0, 0, 0)
    cam('Bild', (28.0, 18.0, 11.0), (0.0, 0.0, 4.2), 32); cam('Heck offen', (-32.0, -11.0, 5.5), (-14.0, 0, 3.0), 30)
    cam('Fahrwerk', (17.0, 10.0, 1.4), (10.8, 4.2, 1.6), 32); cam('Unten', (13.0, 17.0, -9.0), (0.0, 0, 3.0), 36); cam('Rueckseite', (-28.0, 21.0, 14.0), (-2.0, 0, 4.5), 32)
    cam('Bug', (26.0, -9.0, 4.0), (8.0, 0.0, 4.5), 30)
    global VIEWS
    V6 = {
        'schraeg': ('Schraeg', 'grau', True, 0.0, 0.0, {}), 'draufsicht': ('Draufsicht', 'grau', True, 0.2, 0.0, {}), 'seite': ('Seite', 'grau', True, 0.9, 0.0, {}),
        'front': ('Front', 'grau', True, 0.7, 0.0, {}), 'heck': ('Heck', 'grau', True, 0.1, 0.0, {}), 'hangar': ('Hangar', 'hangar', True, 0.4, 0.0, {'rampe': 1.0}),
        'cockpit': ('Cockpit', 'grau', True, 0.3, 0.0, {}), 'detail': ('Detail', 'grau', True, 0.2, 0.0, {}), 'weltraum': ('Weltraum', 'weltraum', True, 0.0, 6.0, {'fw': 1.0}),
        'unten': ('Unten', 'grau', True, 0.6, 0.0, {}), 'bild': ('Bild', 'grau', True, 0.2, 0.0, {}), 'heckoffen': ('Heck offen', 'grau', True, 0.4, 0.0, {'rampe': 1.0}),
        'fahrwerk': ('Fahrwerk', 'grau', True, 0.3, 0.0, {}), 'flug': ('Schraeg', 'grau', True, 0.0, 0.0, {'fw': 1.0}), 'halb': ('Schraeg', 'grau', True, 0.0, 0.0, {'fw': 0.5, 'rampe': 0.5}),
        'rueckseite': ('Rueckseite', 'grau', True, 0.2, 0.0, {}), 'flugunten': ('Unten', 'grau', True, 0.6, 0.0, {'fw': 1.0}), 'bug': ('Bug', 'grau', True, 0.3, 0.0, {}),
    }
    if 'IN_VIEWS' in globals(): V6.update(IN_VIEWS)
    VIEWS = {k: v[:5] for k, v in V6.items()}; ZUST.update({k: v[5] for k, v in V6.items()})
    anchors = {'duesen': DUESEN, 'rampe_scharnier': list(ANCH['rampe_scharnier']), 'fuesse': [list(ANCH[k]) for k in ('fuss_v1', 'fuss_v-1', 'fuss_h1', 'fuss_h-1')], 'gelenke': GELENKE,
               'masse': dict(FL=FL, RAMP_HW=RAMP_HW, HR_L1=HR_L1, HR_L2=RAMP_L2, HR_X=HR_X, XE=XE, XN=XN, HK=list(HK), ZC=globals().get('ZC', 0.0))}
    for k in ('auge', 'griffe', 'raum', 'kanone1', 'turm'):
        if k in ANCH: anchors[k] = ANCH[k] if not isinstance(ANCH[k], Vector) else list(ANCH[k])
    open(os.path.join(HIER, 'har-anker.json'), 'w').write(json.dumps(anchors, indent=1, default=lambda v: [round(c, 4) for c in v]))
    zustand(0, 0)
    return {'ringe': len(XS), 'gelenke': len(GELENKE)}
if not globals().get('NUR_HELFER_HARPYIE'):
    result = build()
