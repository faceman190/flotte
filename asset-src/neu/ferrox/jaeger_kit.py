# Ferrox-Jäger (verwilderte Schürfdrohne), gebaut mit dem Baukasten (asset-src/neu/baukasten/kit_lib.py). Läuft in Blender (Ferrox.blend).
# Entwurf: docs/ferrox-entwurf.md. Drei Schichten: Platten der Erbauer (Blatt kit_fx), Flickwerk aus Menschenschiffen (Blatt kit_trim), Ferrit (kit_ferrit).
# Blender: +Z oben, Bug nach -Y. Maße in Modell-Metern; das Spiel vergrößert Jäger um 1,6 (wie bisher), der Rumpf ist dann rund 15 m lang.
# Drei Objekte: Rumpf „Ferrox_Jaeger“ und die Arme „arm_r“, „arm_l“ (Ursprung an der Schulter, im Spiel beweglich).
# Aufruf: build(lib) → (Rumpf, [Arme]); danach lib.bake_ao(...) je Objekt und lib.export(Rumpf, 'Ferrox_Jaeger', meta, extra=Arme).
import math
from mathutils import Vector, Matrix

RUST = (0.11, 0.045, 0.022)      # verrosteter Schiffsstahl (dunkler als die Tönung RUST des Baukastens)
SHOULDER = {'r': (2.75, -2.55, -0.05), 'l': (-2.75, -2.55, -0.05)}
# Rumpf: Spanten von vorn nach hinten (y, halbe Breite, Höhe des Firsts, Höhe des Kiels)
RIBS = [(-3.0, 3.2, 0.72, -0.72), (-1.2, 3.8, 0.9, -0.8), (1.5, 2.9, 0.78, -0.6), (4.0, 1.6, 0.52, -0.36), (6.2, 0.45, 0.28, -0.14)]

def _sec(y, w, zt, zb):
    """Querschnitt eines Spants, rechte Seite von oben nach unten: First, Dachkante, Bord, Kimm, Kiel."""
    return [Vector((0, y, zt)), Vector((0.68 * w, y, zt - 0.16)), Vector((w, y, 0.04)), Vector((0.74 * w, y, zb + 0.1)), Vector((0, y, zb))]
def _mir(p): return Vector((-p.x, p.y, p.z))

def slab(K, pts, th, strip, tint, edge='fx_seam', edge_tint='fx_dim', out=(0, 0, 1)):
    """Aufgesetzte Platte: Vieleck pts, Sichtseite zeigt in Richtung out, nach innen um th stark."""
    pts = [Vector(p) for p in pts]; n = len(pts); c = sum(pts, Vector()) / n
    nn = Vector()
    for i in range(n): nn += (pts[i] - c).cross(pts[(i + 1) % n] - c)
    if nn.dot(Vector(out)) < 0: pts.reverse(); nn = -nn
    nn.normalize()
    K.ngon(pts, strip, tint)
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        K.face(a - nn * th, b - nn * th, b, a, edge, edge_tint)

def crystal(K, base, d, ln, r):
    """Ferrit-Kristall: vierseitige Doppelpyramide von base in Richtung d."""
    base, d = Vector(base), Vector(d).normalized()
    u = d.cross(Vector((0.3, 0.5, 0.8))).normalized(); v = d.cross(u)
    mid = base + d * ln * 0.3; tip = base + d * ln; ring = [mid + (u * math.cos(k * math.pi / 2) + v * math.sin(k * math.pi / 2)) * r for k in range(4)]
    for k in range(4):
        a, b = ring[k], ring[(k + 1) % 4]
        K.poly((a, b, tip), ((0, 0), (1, 0), (0.5, 1)), (1, 1, 1), 'kit_ferrit'); K.poly((b, a, base), ((0, 0), (1, 0), (0.5, 1)), (1, 1, 1), 'kit_ferrit')

def disc(K, name, c, u, v, r, tint='fx_light', seg=12):
    """Rundes Motiv: Vieleck mit dem Kreisausschnitt einer Kachel (Schneidkopf, Linse, Düse), damit keine Ecken überstehen."""
    mat, (x0, y0, x1, y1) = K_TILES[name]; c, u, v = Vector(c), Vector(u).normalized(), Vector(v).normalized()
    cx, cy, rr = (x0 + x1) / 2 / K_SM, 1 - (y0 + y1) / 2 / K_SM, (x1 - x0) / 2 / K_SM * 0.94
    pts = [c + (u * math.cos(k / seg * math.tau) + v * math.sin(k / seg * math.tau)) * r for k in range(seg)]
    uvs = [(cx + math.cos(k / seg * math.tau) * rr, cy + math.sin(k / seg * math.tau) * rr) for k in range(seg)]
    with K.overlay(): K.poly(pts, uvs, K_T(tint), mat)

def cluster(K, at, up, n, size, seed):
    R = K.R; at, up = Vector(at), Vector(up).normalized()
    for i in range(n):
        d = (up + Vector((R.uniform(-0.6, 0.6), R.uniform(-0.6, 0.6), R.uniform(-0.2, 0.4)))).normalized()
        crystal(K, at + Vector((R.uniform(-0.3, 0.3), R.uniform(-0.3, 0.3), 0)) * size, d, size * R.uniform(0.6, 1.4), size * R.uniform(0.2, 0.34))

def hq(K, p0, p1, p2, p3, strip, tint):
    """Viereck der Rumpfschale, Sichtseite weg von der Längsachse."""
    c = (p0 + p1 + p2 + p3) / 4; n = (p1 - p0).cross(p3 - p0)
    if n.dot(Vector((c.x, 0, c.z))) < 0: p0, p1, p2, p3 = p1, p0, p3, p2
    K.face(p0, p1, p2, p3, strip, tint)

def build_hull(lib):
    global K_TILES, K_SM, K_T
    K_TILES, K_SM, K_T = lib.TILES, lib.SM, lib.T
    K = lib.Kit('Ferrox_Jaeger', seed=31)
    X, Y, Z = lib.X, lib.Y, lib.Z
    S = [_sec(*r) for r in RIBS]
    # ---------- Rumpfschale: Keil aus vier Abschnitten; rechts ganz aus Platten der Erbauer, links ist die Kimm mit Schiffsblech geflickt
    for i in range(len(S) - 1):
        a, b = S[i], S[i + 1]
        hq(K, a[0], b[0], b[1], a[1], 'fx_plate', 'fx')                                  # Dach rechts
        hq(K, a[1], b[1], b[2], a[2], 'fx_fine', 'fx')                                   # Dachschräge rechts
        hq(K, a[2], b[2], b[3], a[3], 'fx_fine', 'fx_dim')                               # Kimm rechts
        hq(K, a[3], b[3], b[4], a[4], 'fx_plate', 'fx_dim')                              # Boden rechts
        al, bl = [_mir(p) for p in a], [_mir(p) for p in b]
        hq(K, bl[0], al[0], al[1], bl[1], 'fx_plate', 'fx')
        hq(K, bl[1], al[1], al[2], bl[2], 'fx_fine', 'fx' if i != 1 else 'fx_rust')
        if i in (0, 1): hq(K, bl[2], al[2], al[3], bl[3], 'wall_b', 'hull_mid' if i == 0 else RUST)      # Flickwerk
        else: hq(K, bl[2], al[2], al[3], bl[3], 'fx_fine', 'fx_dim')
        hq(K, bl[3], al[3], al[4], bl[4], 'fx_plate', 'fx_dim')
    f = S[0]; K.ngon([f[0], _mir(f[1]), _mir(f[2]), _mir(f[3]), f[4], f[3], f[2], f[1]], 'fx_rib', 'fx_dim')          # Stirnwand
    t = S[-1]; K.ngon([t[0], t[1], t[2], t[3], t[4], _mir(t[3]), _mir(t[2]), _mir(t[1])], 'fx_plain', 'fx_dim')       # Heckspitze
    # ---------- aufgesetzte Dachplatten der Erbauer (ungleich, mit Fugen), eine fehlt links
    def top(y0, y1, x0, x1, lift=0.07, strip='fx_plate', tint='fx_light', th=0.1):
        def z(x, y):      # Dachhöhe an der Stelle (zwischen den Spanten gemittelt)
            for i in range(len(RIBS) - 1):
                (ya, wa, ta, _), (yb, wb, tb_, _) = RIBS[i], RIBS[i + 1]
                if ya <= y <= yb:
                    k = (y - ya) / (yb - ya); w = wa + (wb - wa) * k; zt = ta + (tb_ - ta) * k
                    return zt - 0.16 * min(1.0, abs(x) / (0.68 * w)) + lift
            return lift
        def hw(y):      # halbe Breite des Dachs an der Stelle
            for i in range(len(RIBS) - 1):
                (ya, wa, _, _), (yb, wb, _, _) = RIBS[i], RIBS[i + 1]
                if ya <= y <= yb: return 0.68 * (wa + (wb - wa) * (y - ya) / (yb - ya))
            return 0.3
        # x0, x1 sind Anteile der halben Dachbreite: Die Platten folgen dem Keil (Trapeze statt Rechtecke)
        P = [(x0 * hw(y0), y0), (x1 * hw(y0), y0), (x1 * hw(y1), y1), (x0 * hw(y1), y1)]
        slab(K, [(x, y, z(x, y)) for x, y in P][::-1], th, strip, tint)
    top(-2.75, -0.45, 0.1, 0.93); top(-0.25, 2.5, 0.1, 0.9, tint='fx'); top(2.7, 4.7, 0.12, 0.88); top(4.9, 5.9, -0.8, 0.8, tint='fx', th=0.07)
    top(-2.75, -1.3, -0.93, -0.1, tint='fx'); top(1.15, 3.6, -0.9, -0.1); top(3.8, 4.7, -0.88, -0.14, tint='fx')
    # links vorn fehlt die Platte: darunter ein Träger aus Schiffsstahl und ein aufgenietetes Blech mit Farbstreifen
    K.beam((-2.2, -1.0, 0.72), (-0.35, 0.9, 0.84), 0.22, 0.14, 'girder', RUST, bevel=0.02)
    for k, (tn, x0, x1) in enumerate((('hull', -2.25, -1.85), ((0.2, 0.03, 0.02), -1.85, -1.5), ('hull', -1.5, -0.55))):
        slab(K, [(x0, -0.95, 0.86 - 0.16 * abs(x0) / 2.6 + 0.09), (x1, -0.95, 0.86 - 0.16 * abs(x1) / 2.6 + 0.09), (x1, 0.75, 0.85 - 0.16 * abs(x1) / 2.4 + 0.09), (x0, 0.75, 0.85 - 0.16 * abs(x0) / 2.4 + 0.09)][::-1], 0.05, 'wall_b', tn, edge='edge', edge_tint='hull_mid')
    # ---------- Schneidkopf mit Linsenbündel (Bug, leicht aus der Mitte)
    K.box((2.6, 1.1, 1.0), (0.15, -3.5, 0.0), side='fx_rib', top='fx_fine', tint='fx', bevel=0.08, bottom=True, base=False)
    K.tube((0.15, -4.05, -0.12), (0.15, -4.75, -0.12), 0.66, 'fx_rib', 'fx_dim', seg=12, mode='around', caps=False, r2=0.6)
    disc(K, 'fx_cut', (0.15, -4.76, -0.12), X, Z, 0.6)
    for k, (lx, lz, r) in enumerate(((-0.75, 0.42, 0.2), (-0.3, 0.52, 0.24), (0.2, 0.55, 0.2), (0.7, 0.5, 0.26), (1.15, 0.38, 0.17))):
        K.tube((lx, -3.9, lz), (lx, -4.45 - 0.05 * (k % 2), lz), r, 'fx_rib', 'fx', seg=8, mode='around', caps=False)
        disc(K, 'fx_lens', (lx, -4.46 - 0.05 * (k % 2), lz), X, Z, r, seg=8)
    # ---------- Triebwerk: zwei ungleiche Düsen unter dem Heck, die kleinere aus Schiffsteilen
    K.box((1.5, 2.0, 0.7), (0.0, 4.1, -0.5), side='fx_rib', top='fx_plain', tint='fx_dim', bevel=0.06, bottom=True, base=False)
    K.tube((0.42, 4.6, -0.5), (0.42, 5.7, -0.5), 0.5, 'fx_fine', 'fx', seg=10, mode='around', caps=False, r2=0.62)
    disc(K, 'fx_noz', (0.42, 5.71, -0.5), -X, Z, 0.62, seg=10)
    K.tube((-0.55, 4.6, -0.42), (-0.55, 5.35, -0.42), 0.34, 'pipe', RUST, seg=8, caps=False, r2=0.42)
    disc(K, 'fx_noz', (-0.55, 5.36, -0.42), -X, Z, 0.42, tint='fx', seg=8)
    # ---------- Bauch: Rippenkasten, Leitungen, Schulterlager
    K.box((2.2, 2.6, 0.4), (0.3, 0.2, -0.86), side='fx_rib', top='fx_plain', tint='fx_dim', bevel=0.05, bottom=True, base=False)
    K.pipe([(1.6, -2.4, -0.62), (1.9, 0.4, -0.72), (1.2, 3.2, -0.52)], 0.09, 'steel', flange=False, seg=6)
    K.pipe([(-1.5, -2.5, -0.6), (-2.2, -0.2, -0.7)], 0.07, RUST, flange=False, seg=6)
    for s, (sx, sy, sz) in SHOULDER.items():
        K.tube((sx, sy, sz - 0.5), (sx, sy, sz + 0.5), 0.62, 'fx_rib' if s == 'r' else 'girder', 'fx' if s == 'r' else RUST, seg=10, mode='around', cap_tint='fx_dim' if s == 'r' else 'hull_dark')
    # ---------- Ferrit: wächst aus den Fugen, am meisten hinten rechts
    cluster(K, (1.9, 1.9, 0.72), (0.3, 0.1, 1), 6, 0.75, 1)
    cluster(K, (-0.9, 3.9, 0.5), (-0.2, 0.3, 1), 4, 0.45, 2)
    cluster(K, (2.6, -0.2, -0.3), (1, 0.1, -0.3), 4, 0.5, 3)
    cluster(K, (-2.0, -2.2, 0.8), (-0.3, -0.2, 1), 3, 0.3, 4)
    # Leuchtpunkte fürs Spiel: Schneidkopf (Auge) und Triebwerk
    K.light('fxeye', (0.15, -4.8, 0.1), 3.4); K.light('fxengine', (0.2, 5.9, -0.48), 4.0)
    return K.build('Ferrox')

def build_arm(lib, side):
    """Greifarm, Ursprung an der Schulter, zeigt nach vorn (-Y). Rechts das Original der Erbauer, links ein kürzerer Ersatz aus Schiffsteilen mit Schild."""
    K = lib.Kit('arm_' + side, seed=41 if side == 'r' else 43)
    X, Y, Z = lib.X, lib.Y, lib.Z
    s = 1 if side == 'r' else -1
    if side == 'r':
        el, wr = Vector((0.75, -2.3, 0.0)), Vector((0.35, -4.3, -0.05))
        K.beam((0.1, -0.3, 0), el, 0.8, 0.7, 'fx_fine', 'fx', bevel=0.07)
        K.tube(el - Z * 0.48, el + Z * 0.48, 0.52, 'fx_rib', 'fx_light', seg=10, mode='around')
        K.beam(el, wr, 0.62, 0.56, 'fx_rib', 'fx', bevel=0.06)
        K.pipe([(0.45, -0.5, 0.42), (1.0, -2.1, 0.5), (0.6, -3.9, 0.36)], 0.07, 'steel', flange=False, seg=6)
        K.tube(wr - Z * 0.36, wr + Z * 0.36, 0.42, 'fx_rib', 'fx_light', seg=8, mode='around')
        # zwei Zangen, gegeneinander gekrümmt
        for a, b, c, r in (((0.75, -5.3, -0.05), (0.2, -6.5, -0.05), (-0.1, -6.9, -0.05), 0.3), ((-0.35, -5.2, -0.05), (-0.1, -6.2, -0.05), (0.1, -6.6, -0.05), 0.26)):
            K.tube(wr, a, r, 'fx_fine', 'fx', seg=4, caps=False, r2=r * 0.85); K.tube(a, b, r * 0.85, 'fx_fine', 'fx', seg=4, caps=False, r2=r * 0.5); K.tube(b, c, r * 0.5, 'fx_plain', 'fx_light', seg=4, r2=0.03)
        crystal(K, (0.9, -2.3, 0.4), (0.4, 0.1, 1), 0.5, 0.1)
    else:
        el, wr = Vector((-0.6, -1.9, 0.05)), Vector((-0.15, -3.6, 0.0))
        K.beam((-0.1, -0.3, 0), el, 0.6, 0.5, 'girder', RUST, bevel=0.04)
        K.tube(el - Z * 0.42, el + Z * 0.42, 0.46, 'pipe', 'hull_mid', seg=8, mode='around')
        K.beam(el, wr, 0.5, 0.44, 'beam', RUST, bevel=0.04)
        K.pipe([(-0.3, -0.4, 0.36), (-0.9, -1.8, 0.42), (-0.4, -3.3, 0.3)], 0.08, 'steel', flange=False, seg=6)
        # Schild aus einer Schiffsklappe, außen am Unterarm: weiß mit rotem Streifen
        for tn, y0, y1 in (('hull_light', -1.5, -2.2), ((0.3, 0.035, 0.02), -2.2, -2.75), ('hull_light', -2.75, -3.5)):
            slab(K, [(-1.02, y0, -0.55), (-1.02, y1, -0.55), (-1.12, y1, 0.6), (-1.12, y0, 0.6)], 0.07, 'wall_b', tn, edge='edge', edge_tint='hull_mid', out=(-1, 0, 0))
        K.tube(wr - Z * 0.3, wr + Z * 0.3, 0.36, 'pipe', RUST, seg=8, mode='around')
        # ein großer Haken und ein kurzer Dorn
        for a, b, c, r in (((-0.7, -4.7, 0.0), (-0.1, -5.7, 0.0), (0.35, -5.9, 0.0), 0.3), ((0.3, -4.3, 0.0), (0.4, -4.9, 0.0), (0.3, -5.2, 0.0), 0.2)):
            K.tube(wr, a, r, 'beam', RUST, seg=4, caps=False, r2=r * 0.85); K.tube(a, b, r * 0.85, 'beam', 'hull_mid', seg=4, caps=False, r2=r * 0.5); K.tube(b, c, r * 0.5, 'plain', 'steel', seg=4, r2=0.03)
    ob = K.build('Ferrox')
    ob.location = SHOULDER[side]
    return ob

def build(lib):
    import bpy
    c = bpy.data.collections.get('Ferrox')
    if c:
        for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
    hull = build_hull(lib)
    return hull, [build_arm(lib, 'r'), build_arm(lib, 'l')]
