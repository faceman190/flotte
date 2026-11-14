# Testschiff „Sperber“ (eigener Entwurf): kleiner Kurier, gebaut mit dem Baukasten (asset-src/neu/baukasten/kit_lib.py). Läuft in Blender (Testschiff.blend).
# Zweck: die Bauweise an einem Schiff beurteilen, die wir uns bei großen Weltraumspielen abgeschaut haben, mit eigenen Formen und eigenen Bildern:
#   mitteldichter Rumpf mit weichen Normalen, Flächen nach Lackart getrennt (Tönung je Ecke: Hauptlack, Zweitlack, Akzent, Metall),
#   Details aus dem Texturblatt (kit_trim) und aus aufgesetzten Relief-Teilen (kit_relief), Schrift und Zeichen als Aufkleber (kit_decal).
# Blender: +Z oben, Bug nach -Y. Länge rund 22 m, Spannweite rund 15 m. Aufruf: build(lib) → Objekt; danach lib.bake_ao(ob, ground=False), lib.export(ob, 'Testschiff', meta()).
import math
from mathutils import Vector

# Lackarten (Tönungen des Baukastens oder eigene lineare Farben)
PRIM, SEC, DARK, ACC, METAL = 'hull_light', 'hull_mid', 'hull_dark', (0.035, 0.12, 0.3), 'steel'
# Spanten: (y, halbe Breite, First, Kiel, Höhe der größten Breite)
ST0 = [(-11.0, 0.32, 0.22, -0.22, 0.0), (-9.2, 1.25, 0.8, -0.66, 0.0), (-6.5, 2.0, 1.45, -1.0, 0.1), (-3.0, 2.5, 1.85, -1.15, 0.2),
       (1.5, 2.7, 1.95, -1.2, 0.2), (5.5, 2.5, 1.8, -1.1, 0.25), (8.5, 2.0, 1.45, -0.82, 0.3), (10.5, 1.5, 1.05, -0.42, 0.35)]

def _dense(S, n=2):
    """Spanten nach Catmull-Rom verdichten: weichere Rumpflinie bei gleicher Beschreibung."""
    out = []
    for i in range(len(S) - 1):
        p0, p1, p2, p3 = S[max(0, i - 1)], S[i], S[i + 1], S[min(len(S) - 1, i + 2)]
        for k in range(n):
            t = k / n
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t * t + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t ** 3) for j in range(5)))
    out.append(S[-1]); return out
ST = _dense(ST0)

def at_y(y):
    """Spantwerte an beliebiger Stelle (linear zwischen den verdichteten Spanten)."""
    y = max(ST[0][0], min(ST[-1][0], y))
    for i in range(len(ST) - 1):
        a, b = ST[i], ST[i + 1]
        if a[0] <= y <= b[0]:
            t = (y - a[0]) / (b[0] - a[0]); return tuple(a[j] + (b[j] - a[j]) * t for j in range(5))
    return ST[-1]
def prof(s):
    """Querschnitt eines Spants, rechte Seite von oben nach unten: First, Dach, Schulter, Bord (größte Breite), Kimm, Bauch, Kiel."""
    y, w, zt, zb, zm = s; h = zt - zb
    return [Vector((0, y, zt)), Vector((0.46 * w, y, zt - 0.055 * h)), Vector((0.87 * w, y, zm + 0.45 * (zt - zm))), Vector((w, y, zm)),
            Vector((0.83 * w, y, zb + 0.34 * (zm - zb))), Vector((0.44 * w, y, zb + 0.04 * h)), Vector((0, y, zb))]
# je Abschnitt des Querschnitts: Streifen des Texturblatts und Lackart
SEG = [('wall_b', PRIM), ('wall_b', PRIM), ('wall_b', ACC), ('wall_b', PRIM), ('wall_b', SEC), ('roof', DARK)]

def hp(y, k, t, side=1):
    """Punkt auf der Rumpfschale: Abschnitt k des Querschnitts (0 Dach … 5 Bauch), t von 0 bis 1 nach unten."""
    p = prof(at_y(y)); q = p[k] + (p[k + 1] - p[k]) * t
    return Vector((q.x * side, q.y, q.z))
def frame(y, k, t, side=1):
    """Ort und Richtungen auf der Schale: Punkt, u (rechts für den Betrachter von außen), v (zum First hin), Normale nach außen."""
    P = hp(y, k, t, side); dv = hp(y, k, max(0.0, t - 0.04), side) - hp(y, k, min(1.0, t + 0.04), side); du = hp(y + 0.06, k, t, side) - hp(y - 0.06, k, t, side)
    n = du.cross(dv)
    if n.dot(Vector((P.x, 0, P.z - 0.3))) < 0: n = -n
    n.normalize(); v = dv.normalized(); u = v.cross(n).normalized()
    return P, u, v, n

def quad(K, p0, p1, p2, p3, strip, tint, ref):
    """Viereck mit der Sichtseite in Richtung ref (von der Körpermitte weg)."""
    c = (p0 + p1 + p2 + p3) / 4
    if (p1 - p0).cross(p3 - p0).dot(c - ref) < 0: p0, p1, p2, p3 = p1, p0, p3, p2
    K.face(p0, p1, p2, p3, strip, tint)
def plate(K, pts, th, strip, tint, edge_tint=None):
    """Platte beliebiger Lage: ebenes Vieleck pts, Dicke th zur Rückseite; beide Flächen und der Rand."""
    pts = [Vector(p) for p in pts]; n = len(pts); c = sum(pts, Vector()) / n; nn = Vector()
    for i in range(n): nn += (pts[i] - c).cross(pts[(i + 1) % n] - c)
    nn.normalize(); back = [p - nn * th for p in pts]
    K.ngon(pts, strip, tint); K.ngon(back[::-1], strip, tint)
    for i in range(n): K.face(back[i], back[(i + 1) % n], pts[(i + 1) % n], pts[i], 'edge', edge_tint or tint)
def disc(K, c, n, r, mat='kit_cool', seg=14):
    """Leuchtscheibe (Triebwerk) mit der Sichtseite in Richtung n."""
    c, n = Vector(c), Vector(n).normalized(); u = n.cross(Vector((0.2, 0.3, 0.9))).normalized(); v = n.cross(u)
    K.poly([c + (u * math.cos(k / seg * math.tau) + v * math.sin(k / seg * math.tau)) * r for k in range(seg)], ((0, 0),) * seg, (1, 1, 1), mat)

def build(lib):
    K = lib.Kit('Testschiff', seed=71)
    X, Y, Z = lib.X, lib.Y, lib.Z
    AX = Vector((0, 0, 0.3))
    def rel(name, y, k, t, side=1, w=None, h=None, tint=None):
        P, u, v, n = frame(y, k, t, side); K.relief(name, P, u, v, w, h, tint=tint or SEG[k][1])
    def dec(name, y, k, t, side=1, w=1.0, h=None, tint='white'):
        P, u, v, n = frame(y, k, t, side); K.decal(name, P, u, v, w, h, tint, off=0.02)
    def ring(y, ks=(0, 1, 2, 3, 4), name='r_seam'):
        """Spantfuge quer über die Abschnitte ks, auf beiden Seiten."""
        for s in (-1, 1):
            for k in ks:
                P, u, v, n = frame(y, k, 0.5, s); K.seam(hp(y, k, 0.02, s), hp(y, k, 0.98, s), n, name, SEG[k][1])
    def stringer(y0, y1, k, t, name='r_seam', step=1.1):
        """Längsfuge von y0 bis y1 auf Abschnitt k, in Stücken, damit sie der Rumpflinie folgt."""
        for s in (-1, 1):
            y = y0
            while y < y1 - 1e-3:
                ye = min(y1, y + step); P, u, v, n = frame((y + ye) / 2, k, t, s); K.seam(hp(y, k, t, s), hp(ye, k, t, s), n, name, SEG[k][1]); y = ye

    # ---------- Rumpfschale: nach Lackart getrennte Bahnen (Dach und Bord Hauptlack, Schulterband Akzent, Kimm Zweitlack, Bauch dunkel)
    P = [prof(s) for s in ST]
    for i in range(len(P) - 1):
        a, b = P[i], P[i + 1]
        for k, (strip, tint) in enumerate(SEG):
            for s in (1, -1):
                m = lambda p: Vector((p.x * s, p.y, p.z))
                quad(K, m(a[k]), m(b[k]), m(b[k + 1]), m(a[k + 1]), strip, tint, Vector((0, (a[k].y + b[k].y) / 2, 0.3)))
    nose = P[0]; K.ngon([Vector((p.x, p.y, p.z)) for p in nose] + [Vector((-p.x, p.y, p.z)) for p in nose[-2:0:-1]], 'plain', METAL)
    tail = P[-1]; K.ngon(([Vector((p.x, p.y, p.z)) for p in tail] + [Vector((-p.x, p.y, p.z)) for p in tail[-2:0:-1]])[::-1], 'girder', DARK)
    K.tube((0, -11.0, 0.0), (0, -12.6, 0.0), 0.07, 'pipe', METAL, 6, r2=0.03)                    # Messsonde am Bug

    # ---------- Kanzel: facettiertes Glas mit Rahmen
    def base(y, x): w = at_y(y)[1]; return hp(y, 0, min(1.0, abs(x) / (0.46 * w)), 1 if x >= 0 else -1) + Vector((0, 0, 0.02))
    f0, f1 = base(-8.9, 0.42), base(-8.9, -0.42)
    pk0, pk1 = Vector((0.72, -7.0, at_y(-7.0)[2] + 0.62)), Vector((-0.72, -7.0, at_y(-7.0)[2] + 0.62))
    r0, r1 = Vector((0.86, -5.3, at_y(-5.3)[2] + 0.3)), Vector((-0.86, -5.3, at_y(-5.3)[2] + 0.3))
    s0, s1, s2 = base(-8.9, 0.95), base(-7.0, 1.1), base(-5.3, 1.15)
    G = lambda *pts: K.poly(pts, ((0, 0),) * len(pts), (1, 1, 1), 'kit_glass')
    G(f1, f0, pk0, pk1); G(pk1, pk0, r0, r1)                                                    # Frontscheibe, Dachscheibe
    for s in (1, -1):
        m = lambda p: Vector((p.x * s, p.y, p.z)); a, b, c = m(s0), m(s1), m(s2); f, pk, r = m(f0), m(pk0), m(r0)
        q = [(f, a, b, pk), (pk, b, c, r)]
        for pts in q: G(*(pts if s > 0 else pts[::-1]))
        for e0, e1 in ((f, pk), (pk, r), (a, f), (b, pk), (c, r)): K.beam(e0, e1, 0.08, 0.08, 'beam', DARK, bevel=0.015)
    K.beam(pk0, pk1, 0.08, 0.08, 'beam', DARK, bevel=0.015); K.beam(f0, f1, 0.08, 0.08, 'beam', DARK, bevel=0.015)
    plate(K, [r1, r0, base(-5.3, 1.15) + Vector((0, 0.5, -0.05)), base(-5.3, -1.15) + Vector((0, 0.5, -0.05))], 0.06, 'wall_b', DARK)   # Rückwand der Kanzel

    # ---------- Rückenwulst mit Lüftern, Antenne
    zt = lambda y: at_y(y)[2]
    K.box((1.2, 7.4, 0.42), (0, 2.4, zt(2.4) - 0.1), side='wall_b', top='roof', tint=SEC, tint_top=DARK, bevel=0.1, bottom=True, base=False)
    for y in (0.2, 2.4, 4.6): K.relief('vent_slot', (0, y, zt(2.4) + 0.112), Y, -X, tint=DARK)
    K.tube((0.0, 6.4, zt(6.4)), (0.0, 7.2, zt(6.4) + 2.3), 0.05, 'pipe', METAL, 6, r2=0.02)
    K.box((0.5, 0.9, 0.22), (0.0, 6.5, zt(6.5) - 0.02), side='girder', tint=DARK, bevel=0.04, bottom=True, base=False)

    # ---------- Triebwerksgondeln an Pylonen, Stummelflügel, Leitwerke
    for s in (1, -1):
        gx, gz = s * 4.1, 0.35
        plate(K, [(s * 2.2, 2.9, gz + 0.22), (s * 3.5, 3.5, gz + 0.22), (s * 3.5, 8.6, gz + 0.22), (s * 2.0, 8.9, gz + 0.22)][::s], 0.44, 'wall_b', PRIM, SEC)      # Pylon
        K.tube((gx, 2.2, gz), (gx, 3.0, gz), 0.78, 'wall_b', DARK, 16, mode='around', caps=False, r2=1.0)             # Einlauf
        K.ngon([(gx + math.cos(k / 14 * math.tau) * 0.5, 2.9, gz + math.sin(k / 14 * math.tau) * 0.5) for k in range(14)], 'girder', 'black')
        K.tube((gx, 3.0, gz), (gx, 9.6, gz), 1.0, 'wall_b', PRIM, 16, mode='around', caps=False)                      # Gondel
        K.tube((gx, 5.6, gz), (gx, 6.3, gz), 1.03, 'wall_b', ACC, 16, mode='around', caps=False)                      # Akzentband
        K.tube((gx, 9.6, gz), (gx, 10.5, gz), 1.0, 'girder', DARK, 16, mode='around', caps=False, r2=0.82)            # Düse
        K.tube((gx, 10.5, gz), (gx, 9.45, gz), 0.82, 'girder', 'black', 16, mode='around', caps=False, r2=0.5, flip=True)
        K.tube((gx, 9.5, gz), (gx, 9.95, gz), 0.2, 'pipe', DARK, 8, mode='around', r2=0.06)                         # Kegel in der Mitte
        disc(K, (gx, 9.5, gz), (0, 1, 0), 0.5); K.light('cool', (gx, 10.6, gz), 7.0)
        # Stummelflügel (gepfeilt) und nach außen geneigtes Leitwerk
        plate(K, [(s * 5.0, 4.2, gz + 0.11), (s * 8.0, 7.0, gz + 0.06), (s * 8.0, 9.0, gz + 0.06), (s * 5.0, 8.8, gz + 0.11)][::s], 0.22, 'wall_b', PRIM, SEC)
        K.box((0.3, 2.2, 0.3), (s * 8.0, 8.0, gz - 0.05), side='wall_b', tint=DARK, bevel=0.06, bottom=True, base=False)   # Randkörper
        K.light('redlamp' if s < 0 else 'green', (s * 8.2, 7.0, gz), 2.2)
        plate(K, [(gx + s * 0.25, 6.0, gz + 0.9), (gx + s * 1.2, 8.6, gz + 3.5), (gx + s * 1.2, 10.2, gz + 3.5), (gx + s * 0.25, 10.0, gz + 0.9)], 0.16, 'wall_b', PRIM, ACC)
        # Relief an Gondel und Flügel
        for a_, y_, nm, w_, h_ in ((0.6, 4.3, 'hatch_s', 0.5, 0.5), (0.6, 7.7, 'cover', 0.5, 0.5), (-0.5, 4.7, 'vent_slot', 0.9, 0.42), (-0.5, 8.3, 'port', 0.4, 0.4), (1.45, 6.9, 'cable', 0.4, 0.4), (1.45, 4.1, 'pan_pill', 0.8, 0.4)):
            n = Vector((s * math.cos(a_), 0, math.sin(a_))); v = Vector((-s * math.sin(a_), 0, math.cos(a_)))      # a_: Winkel um die Gondelachse (0 außen, positiv nach oben)
            K.relief(nm, Vector((gx, y_, gz)) + n * 1.015, v.cross(n), v, w_, h_, tint=PRIM)
        K.seam((s * 5.2, 5.2, gz + 0.11), (s * 7.8, 7.5, gz + 0.065), Z, 'r_seam', PRIM); K.seam((s * 5.2, 8.3, gz + 0.11), (s * 7.8, 8.6, gz + 0.065), Z, 'r_weld', PRIM)
        K.relief('pan_rect', (s * 6.2, 7.4, gz + 0.1), Y * s, -X * s, tint=PRIM); K.relief('cover', (s * 2.8, 6.0, gz + 0.22), Y, -X, 0.6, 0.6, tint=PRIM)

    # ---------- Hecktriebwerk zwischen den Gondeln, Landekufen
    K.box((2.2, 0.9, 1.3), (0, 10.75, 0.1), side='girder', tint=DARK, bevel=0.08, bottom=True, base=False)
    for x in (-0.55, 0.55):
        K.tube((x, 10.9, 0.15), (x, 11.5, 0.15), 0.46, 'pipe', 'black', 12, mode='around', caps=False, r2=0.38)
        K.tube((x, 11.5, 0.15), (x, 11.0, 0.15), 0.36, 'girder', 'black', 12, mode='around', caps=False, r2=0.26, flip=True); disc(K, (x, 11.02, 0.15), (0, 1, 0), 0.26, seg=12)
    K.light('cool', (0, 11.6, 0.15), 6.0)
    for s in (1, -1):
        K.box((0.42, 6.6, 0.3), (s * 1.35, 0.6, at_y(0.6)[3] - 0.5), side='beam', tint=DARK, bevel=0.07, bottom=True, base=False)
        for y in (-1.6, 2.8): K.beam((s * 1.35, y, at_y(y)[3] - 0.38), (s * 1.2, y, at_y(y)[3] + 0.1), 0.2, 0.2, 'girder', METAL, bevel=0.03)

    # ---------- Aufgesetzte Panzerplatten (echte Geometrie mit Fase): fangen das Licht und brechen die glatte Schale
    def slab(y, k, t, side, w, h, th=0.05, tint=None):
        Pn, u, v, n = frame(y, k, t, side)
        K.box((w, h, th), Pn + n * (th / 2 - 0.004), side='wall_b', top='wall_b', tint=tint or SEG[k][1], bevel=0.018, bottom=True, base=False, rot=lib.Matrix((u, v, n)).transposed().to_4x4())
    for s in (1, -1):
        slab(-7.4, 3, 0.5, s, 1.5, 0.55); slab(-3.4 if s > 0 else -0.6, 1, 0.5, s, 2.0, 0.7); slab(4.4, 3, 0.45, s, 2.2, 0.6); slab(7.6, 1, 0.5, s, 1.4, 0.6)
        slab(0.9, 4, 0.5, s, 2.4, 0.5, tint=SEC); slab(-5.6, 4, 0.5, s, 1.6, 0.42, tint=SEC); slab(6.4, 0, 0.6, s, 1.6, 0.7)
    # ---------- Düsenblätter an den Gondeln (zwölf je Düse) und Lippe am Einlauf
    for s in (1, -1):
        gx, gz = s * 4.1, 0.35
        for k in range(12):
            a = k / 12 * math.tau; n = Vector((math.cos(a), 0, math.sin(a))); t_ = Vector((-math.sin(a), 0, math.cos(a)))
            c = Vector((gx, 10.05, gz)) + n * 0.95
            K.box((0.42, 0.95, 0.05), c, side='wall_b', top='girder', tint=DARK, tint_top=METAL, bevel=0.012, bottom=True, base=False, rot=lib.Matrix((t_, Vector((0, 1, 0)), n)).transposed().to_4x4() @ lib.Matrix.Rotation(-0.16, 4, 'X'))
        K.tube((gx, 2.2, gz), (gx, 2.05, gz), 0.84, 'pipe', METAL, 16, mode='around', caps=False, r2=0.8)      # Lippe
        K.tube((gx, 2.2, gz), (gx, 2.9, gz), 0.72, 'girder', 'black', 16, mode='around', caps=False, r2=0.5, flip=True)   # Einlaufkegel innen
    # ---------- Klappen an der Flügelhinterkante, Fahrwerksklappen am Bauch
    for s in (1, -1):
        gz = 0.35
        K.box((1.3, 0.5, 0.1), (s * 5.9, 8.95, gz + 0.03), side='wall_b', tint=SEC, bevel=0.02, bottom=True, base=False)
        K.box((1.2, 0.5, 0.1), (s * 7.25, 9.05, gz + 0.0), side='wall_b', tint=SEC, bevel=0.02, bottom=True, base=False)
        rel('panel_big', -2.0, 5, 0.55, s, 1.0, 1.0); rel('panel_big', 3.4, 5, 0.55, s, 1.0, 1.0); rel('hatch_s', -6.6, 5, 0.6, s, 0.6, 0.6); rel('grille', 6.6, 5, 0.55, s, 0.6, 0.6)
    # ---------- Fugen: Spantringe und Längsfugen, an denen sich die Paneele scheinbar stoßen
    for y in (-8.4, -4.6, -1.0, 3.4, 7.2): ring(y)
    ring(9.6, (0, 1, 2, 3), 'r_weld')
    stringer(-8.0, 9.5, 3, 0.55); stringer(-6.0, 9.0, 1, 0.5)
    # ---------- Relief am Rumpf: links die Frachtklappe, rechts die Wartungsfelder; Anschlüsse, Lüfter, Griffe, Schrauben
    rel('hatch_l', -2.6, 3, 0.5, -1); rel('rungs', -4.0, 3, 0.5, -1, 0.7, 1.05); rel('keypad', -1.6, 3, 0.4, -1)
    rel('panel_big', 1.6, 3, 0.5, -1, 1.1, 1.1); rel('hatch_s', 5.8, 3, 0.5, -1)
    rel('panel_big', -2.2, 3, 0.5, 1, 1.1, 1.1); rel('cover', 0.2, 3, 0.5, 1); rel('junction', 2.2, 3, 0.5, 1); rel('hatch_s', 5.6, 3, 0.5, 1)
    for s in (1, -1):
        rel('port', -6.9, 3, 0.5, s, 0.42, 0.42); rel('pan_pill', -5.4, 1, 0.5, s); rel('vent_slot', -0.4, 1, 0.5, s); rel('pan_rect', 2.6, 1, 0.5, s)
        rel('grille', 6.2, 1, 0.5, s, 0.6, 0.6); rel('lamp', -9.6, 1, 0.6, s, 0.4, 0.2); rel('socket', 7.9, 3, 0.5, s, 0.4, 0.4)
        rel('vent_grid', -3.4, 4, 0.5, s, 0.42, 0.42); rel('cable', 0.6, 4, 0.5, s, 0.4, 0.4); rel('valve', 4.2, 4, 0.5, s, 0.4, 0.4); rel('cap', 6.9, 4, 0.5, s)
        for k in range(6): rel('b_washer', -7.6 + k * 0.42, 3, 0.16, s, 0.15, 0.15)
        for k in range(8): rel('rivet', 3.9 + k * 0.3, 0, 0.75, s, 0.14, 0.14)
        rel('handle', -8.0, 1, 0.75, s, 0.45, 0.22); rel('handle', -5.0, 2, 0.5, s, 0.45, 0.22)
        # Steuerdüsen: kleine Blöcke mit dunkler Mündung
        for y, k, t in ((-9.4, 3, 0.45), (8.9, 3, 0.4)):
            Pn, u, v, n = frame(y, k, t, s); K.box((0.5, 0.5, 0.24), Pn + n * 0.06, side='girder', tint=DARK, bevel=0.05, bottom=True, base=False, rot=lib.Matrix((u, v, n)).transposed().to_4x4())
            K.relief('cap', Pn + n * 0.185, u, v, 0.3, 0.3, tint=DARK)
    # ---------- Aufkleber: Kennung, Zeichen, Warnhinweise
    for s in (1, -1):
        P_, u, v, n = frame(-4.6 if s > 0 else -6.0, 3, 0.42, s); K.number('27', P_, u, v, 0.8, 'hull_dark', 0.02)
        dec('p_caution', 4.2, 3, 0.4, s, 0.5); dec('arrow', 6.6, 2, 0.5, s, 0.5); dec('warn', 8.2, 1, 0.5, s, 0.45); dec('leak2', 3.0, 4, 0.5, s, 0.9, 0.9); dec('stain1', -1.0, 3, 0.7, s, 1.2, 0.9)
    dec('emblem', -3.6, 0, 0.5, 1, 1.3); dec('w_technik', 3.2, 0, 0.55, -1, 1.4)
    # Positionslichter: Bug weiß, Rücken rot blinkend (im Spiel), Kanzel innen
    K.light('light', (0, -11.2, 0.0), 2.0); K.light('redlamp', (0, 7.2, zt(6.4) + 2.4), 2.0); K.light('screen', (0, -7.0, zt(-7.0) + 0.3), 1.6)
    return K.build('Testschiff')

def meta():
    return {'R': 14, 'name': 'Sperber', 'length': 24.0}
