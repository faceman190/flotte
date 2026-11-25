# Innenraum-Details für die Schiffe (25.11.2026, Nutzer: Innenräume von Kormoran und Wisent „auf unser jetziges Niveau bringen,
# sind viel zu einfach, keine Details an Wänden und Boden“). Eingebunden von kor_innen.py und wis_raeume.py:
#     exec(compile(open(<pfad>/innen/innen_detail.py).read(), 'innen_detail.py', 'exec'))
# Braucht nur bpy/bmesh und eine Sammlung zum Einhängen; die Materialien gibt der Aufrufer mit (Werte aus dessen M).
#
# Sammel: viele kleine Quader und Zylinder (Bodenplatten, Schrauben, Gitterstäbe, Schlitze) in EIN Netz je Sammler, ein Material je
# Fläche. So bleibt die Zahl der Objekte klein (Blender, Export, Zeichenaufrufe im Spiel); eine gemeinsame Fase (Winkelgrenze) gibt
# den Kanten Glanzlichter.
#
# Bausteine (alle Maße in Metern, Z oben, Wände senkrecht):
#   platten(S, x0, x1, y0, y1, z, ...)      Bodenplatten mit Fugen (dunkle Unterlage), Senkschrauben an den Ecken, Tonwechsel
#   gitter(S, x0, x1, y0, y1, z, ...)       Gitterrost (Rahmen, Längs- und Querstäbe) über dunklem Schacht
#   wandfeld(S, a, u, n, s0, s1, za, zb, k, ...)   Details auf einem Wandfeld (Rahmenfeld, Schrauben, je nach Nummer Lüftungsgitter,
#                                            Wartungsklappe mit Griff, Typenschild) auf der Seite n der Wand
#   deckenraster(S, x0, x1, y0, y1, z, ...) Rasterleisten unter einer Decke
#   zurrschiene(S, x0, x1, y, z, axis, ...) Ankerschiene mit Langlöchern (Boden oder Wand)
#   schelle(S, p, axis, r, ...)             Rohrschelle mit Fuß an der Wand
import bpy, bmesh, math
from mathutils import Vector, Matrix

class Sammel:
    def __init__(self, name, col, bev=0.004):
        self.name, self.col, self.bev = name, col, bev
        self.bm = bmesh.new(); self.mats = []; self.n = 0
    def _mi(self, m):
        if m not in self.mats: self.mats.append(m)
        return self.mats.index(m)
    def _faces(self, verts, faces, mi):
        vs = [self.bm.verts.new(v) for v in verts]
        for f in faces:
            try: self.bm.faces.new([vs[i] for i in f]).material_index = mi
            except ValueError: pass
        self.n += 1
    def box(self, sx, sy, sz, x, y, z, m, rz=0.0):
        c, s = math.cos(rz), math.sin(rz); hx, hy, hz = sx / 2, sy / 2, sz / 2
        V = []
        for dz in (-hz, hz):
            for dx, dy in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)): V.append((x + dx * c - dy * s, y + dx * s + dy * c, z + dz))
        self._faces(V, ((3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)), self._mi(m))
    def obox(self, c, X, Y, size, m):      # Quader mit eigenen Achsen (X, Y in der Fläche, Z = X × Y), Mitte c
        X, Y = Vector(X).normalized(), Vector(Y).normalized(); Z = X.cross(Y); c = Vector(c); hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        V = [tuple(c + X * dx + Y * dy + Z * dz) for dz in (-hz, hz) for dx, dy in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy))]
        self._faces(V, ((3, 2, 1, 0), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)), self._mi(m))
    def cyl(self, r, ln, c, axis, m, n=8):      # axis: Vektor der Achse (Länge egal)
        A = Vector(axis).normalized(); X = A.orthogonal().normalized(); Y = A.cross(X); c = Vector(c)
        V = []
        for e in (-ln / 2, ln / 2):
            for k in range(n): a = 2 * math.pi * k / n; V.append(tuple(c + A * e + (X * math.cos(a) + Y * math.sin(a)) * r))
        F = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))] + [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
        self._faces(V, F, self._mi(m))
    def fertig(self):
        if not self.n: self.bm.free(); return None
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces[:])
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for m in self.mats: me.materials.append(m)
        ob = bpy.data.objects.new(self.name, me); self.col.objects.link(ob)
        if self.bev:
            mo = ob.modifiers.new('Fase', 'BEVEL'); mo.width = self.bev; mo.segments = 1; mo.limit_method = 'ANGLE'; mo.angle_limit = math.radians(40)
            try: mo.harden_normals = True
            except Exception: pass
        try:
            wn = ob.modifiers.new('Normalen', 'WEIGHTED_NORMAL'); wn.keep_sharp = True
        except Exception: pass
        return ob

def platten(S, x0, x1, y0, y1, z, mp, mf, ms=None, ma=None, p=1.2, q=None, fuge=0.008, h=0.012, schrauben=True, rand=0.0):
    # Bodenplatten p × q (Meter) zwischen x0..x1, y0..y1 auf Höhe z (Unterkante); mf: dunkle Unterlage, die in den Fugen sichtbar ist
    q = q or p
    S.box(x1 - x0, y1 - y0, 0.003, (x0 + x1) / 2, (y0 + y1) / 2, z + 0.0015, mf)
    nx, ny = max(1, round((x1 - x0) / p)), max(1, round((y1 - y0) / q)); px, py = (x1 - x0) / nx, (y1 - y0) / ny
    for i in range(nx):
        for j in range(ny):
            cx, cy = x0 + (i + 0.5) * px, y0 + (j + 0.5) * py
            m = ma if (ma is not None and (i * 7 + j * 3) % 5 == 0) else mp
            S.box(px - fuge, py - fuge, h, cx, cy, z + h / 2, m)
            if schrauben and ms is not None and min(px, py) > 0.45:
                for sx in (-1, 1):
                    for sy in (-1, 1): S.cyl(0.011, 0.004, (cx + sx * (px / 2 - 0.05), cy + sy * (py / 2 - 0.05), z + h + 0.001), (0, 0, 1), ms, 6)

def gitter(S, x0, x1, y0, y1, z, mg, mschacht, stab=0.03, teil=0.06, h=0.03):
    # Gitterrost: dunkler Schacht, Rahmen, Tragstäbe in X (alle teil Meter), Querstäbe in Y (alle 0,2 m)
    S.box(x1 - x0, y1 - y0, 0.004, (x0 + x1) / 2, (y0 + y1) / 2, z - 0.04, mschacht)
    for y in (y0 + 0.02, y1 - 0.02): S.box(x1 - x0, 0.04, h, (x0 + x1) / 2, y, z + h / 2, mg)
    for x in (x0 + 0.02, x1 - 0.02): S.box(0.04, y1 - y0, h, x, (y0 + y1) / 2, z + h / 2, mg)
    ny = max(2, int((y1 - y0 - 0.06) / teil))
    for j in range(1, ny): S.box(x1 - x0 - 0.06, 0.008, h, (x0 + x1) / 2, y0 + 0.03 + j * (y1 - y0 - 0.06) / ny, z + h / 2, mg)
    nx = max(2, int((x1 - x0) / 0.2))
    for i in range(1, nx): S.box(0.008, y1 - y0 - 0.06, h * 0.5, x0 + i * (x1 - x0) / nx, (y0 + y1) / 2, z + h * 0.75, mg)

def wandfeld(S, a, u, n, s0, s1, za, zb, k, mfeld, mrahmen, mdunkel, ms, mschild=None, d=0.0):
    # Details auf dem Wandfeld zwischen s0 und s1 (entlang u ab a) und za..zb, Seite n (Normale der Wandfläche), Wandfläche bei a + n·d
    a, u, n = Vector(a), Vector(u).normalized(), Vector(n).normalized(); up = Vector((0, 0, 1))
    w, hgt = s1 - s0, zb - za
    if w < 0.35 or hgt < 0.4: return
    def P(s, z, off): return a + u * s + n * (d + off) + up * z      # a liegt auf z = 0
    sm, zm = (s0 + s1) / 2, (za + zb) / 2
    # Rahmenfeld: Innenfläche leicht vorgesetzt (eigener Ton), umlaufender Rahmen in der Wandebene bleibt sichtbar
    S.obox(P(sm, zm, 0.004), u, up, (w - 0.11, hgt - 0.12, 0.008), mfeld)
    for sg in (-1, 1):
        for zz in (za + 0.06, zb - 0.06): S.cyl(0.009, 0.006, P(sm + sg * (w / 2 - 0.035), zz, 0.003), n, ms, 6)
    kind = k % 6
    if kind == 1 and hgt > 1.0:      # Lüftungsgitter unten
        gw = min(0.5, w - 0.3); zg = za + 0.28
        S.obox(P(sm, zg, 0.006), u, up, (gw + 0.04, 0.22, 0.012), mrahmen)
        S.obox(P(sm, zg, 0.009), u, up, (gw, 0.17, 0.006), mdunkel)
        for j in range(5): S.obox(P(sm, zg - 0.068 + j * 0.034, 0.014), u, up, (gw - 0.02, 0.012, 0.012), mrahmen)
    elif kind == 3 and hgt > 1.2:    # Wartungsklappe mit Fuge, Griff und vier Schrauben
        kw, kh = min(0.55, w - 0.3), 0.62; zk = za + hgt * 0.42
        for sg in (-1, 1):
            S.obox(P(sm + sg * kw / 2, zk, 0.009), u, up, (0.008, kh, 0.004), mdunkel)
            S.obox(P(sm, zk + sg * kh / 2, 0.009), u, up, (kw, 0.008, 0.004), mdunkel)
            for sz in (-1, 1): S.cyl(0.008, 0.006, P(sm + sg * (kw / 2 - 0.04), zk + sz * (kh / 2 - 0.04), 0.011), n, ms, 6)
        S.obox(P(sm, zk + kh / 2 - 0.12, 0.016), u, up, (0.14, 0.03, 0.022), mrahmen)
        if mschild is not None: S.obox(P(sm, zk - 0.12, 0.0095), u, up, (0.18, 0.06, 0.002), mschild)
    elif kind == 5 and hgt > 1.4:    # Anschlusskasten mit Kabelführung nach oben
        S.obox(P(sm, za + 1.35, 0.03), u, up, (0.26, 0.34, 0.06), mrahmen)
        S.obox(P(sm, za + 1.35, 0.061), u, up, (0.2, 0.06, 0.003), mschild if mschild is not None else mdunkel)
        S.obox(P(sm + 0.06, (za + 1.52 + zb) / 2, 0.015), u, up, (0.05, zb - za - 1.52, 0.03), mrahmen)

def deckenraster(S, x0, x1, y0, y1, z, m, p=1.2, b=0.05, t=0.025, rand=True):
    # Rasterleisten (b breit, t hoch) unter einer Decke auf Höhe z (Deckenunterseite)
    nx = max(1, round((x1 - x0) / p))
    for i in range(0 if rand else 1, nx + (1 if rand else 0)): S.box(b, y1 - y0, t, x0 + i * (x1 - x0) / nx, (y0 + y1) / 2, z - t / 2, m)
    for y in ((y0 + b / 2, (y0 + y1) / 2, y1 - b / 2) if rand else ((y0 + y1) / 2,)): S.box(x1 - x0, b, t, (x0 + x1) / 2, y, z - t / 2, m)

def zurrschiene(S, x0, x1, c, n, m, mloch, breite=0.07, dicke=0.012, teil=0.25):
    # Ankerschiene von x0 bis x1 entlang X, Mitte c (y, z), Fläche zeigt nach n ((0,0,1) Boden, (0,±1,0) Wand)
    n = Vector(n).normalized(); X = Vector((1, 0, 0)); Y = n.cross(X).normalized()
    cy, cz = c; base = Vector(((x0 + x1) / 2, cy, cz))
    S.obox(base + n * dicke / 2, X, Y, (x1 - x0, breite, dicke), m)
    k = int((x1 - x0) / teil)
    for i in range(k): S.obox(Vector((x0 + (i + 0.5) * (x1 - x0) / k, cy, cz)) + n * (dicke + 0.0008), X, Y, (0.07, 0.022, 0.0015), mloch)

def schelle(S, p, wand_n, r, m, achse=(1, 0, 0)):
    # Rohrschelle um ein Rohr (Radius r, Mitte p, Achse achse) mit Fuß zur Wand (Richtung -wand_n)
    p, n, A = Vector(p), Vector(wand_n).normalized(), Vector(achse).normalized()
    S.cyl(r + 0.012, 0.04, p, A, m, 10)
    Y = A.cross(n).normalized()
    S.obox(p - n * (r + 0.03), A, Y, (0.04, 0.05, 0.06), m)
