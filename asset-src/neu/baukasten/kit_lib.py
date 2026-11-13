# Baukasten für Gebäude und Umgebungen von Letzte Crew. Läuft in Blender (Textblock kit_lib in Baukasten.blend).
#
# Idee: Alle Teile entstehen per Skript aus wenigen Grundformen (Kasten mit gefasten Kanten, Rohr, Prisma, Fläche). Jede Fläche bekommt ihre
# Texturkoordinaten aus dem Texturblatt (kit_trim_*: Streifen und Kacheln, siehe kit_atlas.json) und eine Tönung je Ecke (Lackfarbe).
# Dadurch reicht EIN Material für alles; die Details (Paneele, Schrauben, Lamellen, Abnutzung) kommen aus dem Texturblatt.
#
# Benutzung:   K = Kit('Name');  K.block(...); K.gate(...); ...;  ob = K.build();  bake_ao(ob);  export(ob, 'Name', meta)
# Maße in Metern. Blender: +Z oben, Vorderseite eines Teils zeigt nach -Y. Ursprung eines Teils = Mitte seiner Grundfläche.
# Mit  "with K.at((x, y, z), drehung_um_z):"  wird alles darin verschoben und gedreht.
#
# Streifen (strip): 'wall' (Wandpaneele, reihenweise), 'siding' (waagrechte Lamellen), 'roofing' (Dachbahnen), 'floor' (Gitterrost),
#   'beam' (Träger), 'girder' (Lochträger), 'hazard' (Warnstreifen, Tönung 'none'), 'pipe', 'hose' (Gummi, gerippt), 'plain', 'edge'.
# Kacheln (tile): vent, fan, hatch, ctrl, crate, door.   Aufkleber (decal): siehe kit_decals.json (d0..d9, w_*, warn, volt, p_*, leak1.. usw.).
# Tönungen (tint): Namen aus TINT oder (r, g, b) linear.
import bpy, bmesh, math, json, os, random
from contextlib import contextmanager
from mathutils import Matrix, Vector

ROOT = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte'
HERE = os.path.join(ROOT, 'asset-src', 'neu', 'baukasten')
TEX = os.path.join(ROOT, 'asset-src', 'tex')
_A = json.load(open(os.path.join(HERE, 'kit_atlas.json'))); _D = json.load(open(os.path.join(HERE, 'kit_decals.json')))
_A2 = json.load(open(os.path.join(HERE, 'kit_int_atlas.json'))); _S = json.load(open(os.path.join(HERE, 'kit_signs.json')))
SM, DECALS, DPX, SIGNS, SPX = _A['size_m'], _D['cells'], _D['px'], _S['cells'], _S['px']
# Leuchtschriften der Städte (scripts/make-kit-city.mjs → kit_city.json): eigene Farben, Material kit_neon
_C = json.load(open(os.path.join(HERE, 'kit_city.json'))) if os.path.exists(os.path.join(HERE, 'kit_city.json')) else {'px': 2048, 'cells': {}}
CITY, CPX = _C['cells'], _C['px']
# Zweiter Atlas (Neonhafen: scripts/make-kit-city2.mjs → kit_city2.json): Material kit_neon2, als Hologramm kit_holo
_C2 = json.load(open(os.path.join(HERE, 'kit_city2.json'))) if os.path.exists(os.path.join(HERE, 'kit_city2.json')) else {'px': 2048, 'cells': {}}
CITY2, CPX2 = _C2['cells'], _C2['px']
# Zwei Texturblätter: außen (kit_trim) und innen (kit_int). Jeder Streifen und jede Kachel kennt ihr Material.
SHEET = {n: ('kit_trim', a, b) for n, (a, b) in _A['strips'].items()}; SHEET.update({n: ('kit_int', a, b) for n, (a, b) in _A2['strips'].items()})
TILES = {n: ('kit_trim', r) for n, r in _A['tiles'].items()}; TILES.update({n: ('kit_int', r) for n, r in _A2['tiles'].items()})
X, Y, Z = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
TAU = math.tau
TINT = {   # linear; im Bild wirken die Werte deutlich heller (0,06 ist ein dunkles Grau, 0,3 ein helles)
    'none': (1, 1, 1), 'white': (0.8, 0.8, 0.8), 'hull_light': (0.5, 0.52, 0.55), 'hull': (0.29, 0.31, 0.34), 'hull_mid': (0.14, 0.15, 0.17),
    'hull_dark': (0.055, 0.06, 0.07), 'black': (0.016, 0.016, 0.018), 'steel': (0.28, 0.29, 0.31), 'yellow': (0.9, 0.48, 0.03), 'orange': (0.8, 0.2, 0.02),
    'red': (0.42, 0.035, 0.022), 'blue': (0.045, 0.15, 0.4), 'green': (0.09, 0.19, 0.08), 'olive': (0.15, 0.17, 0.08), 'rust': (0.2, 0.07, 0.03), 'concrete': (0.36, 0.36, 0.35),
    # Innenräume
    'i_wall': (0.12, 0.125, 0.14), 'i_wall_light': (0.3, 0.31, 0.33), 'i_dark': (0.045, 0.048, 0.055), 'i_floor': (0.2, 0.205, 0.215), 'i_floor_dark': (0.085, 0.09, 0.1),
    'i_ceil': (0.05, 0.053, 0.06), 'i_rib': (0.075, 0.08, 0.09), 'i_red': (0.3, 0.06, 0.04), 'i_fabric': (0.1, 0.16, 0.2), 'i_leaf': (0.05, 0.2, 0.06), 'i_soil': (0.05, 0.035, 0.025),
    # Hangar
    'h_sand': (0.2, 0.17, 0.12), 'h_wall': (0.1, 0.105, 0.1), 'h_dark': (0.05, 0.053, 0.058), 'h_floor': (0.06, 0.063, 0.068), 'h_olive': (0.11, 0.12, 0.08),
}
GLOW = {'kit_light': (1.0, 0.93, 0.8), 'kit_lamp': (1.0, 0.55, 0.12), 'kit_redlamp': (1.0, 0.1, 0.05), 'kit_screen': (0.2, 0.6, 0.9), 'kit_green': (0.2, 1.0, 0.4),
        'kit_accent': (0.25, 0.85, 0.75), 'kit_cool': (0.75, 0.88, 1.0),
        'kit_shopw': (0.62, 0.5, 0.36), 'kit_shopc': (0.4, 0.52, 0.66)}      # gedämpftes Ladenlicht (Schaufenster): warm und kalt      # kit_accent: im Spiel die Akzentfarbe der Station

def V(p): return p if isinstance(p, Vector) else Vector(p)
def T(c): return TINT[c] if isinstance(c, str) else tuple(c)
def vband(strip):
    m, a, b = SHEET[strip]; return 1 - b / SM, 1 - a / SM, b - a
ROWS = {'wall': [('wall_a', 3.0)] + [('wall_b', 2.0)] * 200, 'siding': [('wall_b', 2.0)] * 200, 'roofing': [('roof', 1.5)] * 200, 'floor': [('floor', 1.0)] * 400,
        'iwalls': [('iwall', 3.0)] + [('iwall2', 1.5)] * 200, 'itech': [('iwall2', 1.5)] * 200, 'ifloors': [('ifloor', 2.0)] * 400, 'iceils': [('iceil', 1.5)] * 400, 'shutters': [('shutter', 0.6)] * 400}
def bands(strip, H):
    """Teilt eine Höhe in Reihen: [(Streifen, von, bis, strecken)]. Ein kleiner Rest wird der letzten Reihe zugeschlagen."""
    if strip not in ROWS: return [(strip, 0.0, H, True)]
    out, h0 = [], 0.0
    for name, bh in ROWS[strip]:
        h1 = min(H, h0 + bh)
        if H - h1 < bh * 0.3: h1 = H
        out.append((name, h0, h1, (h1 - h0) >= bh * 0.55))
        if h1 >= H - 1e-6: break
        h0 = h1
    return out

class Kit:
    def __init__(self, name, seed=1):
        self.name = name; self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new('UVMap'); self.col = self.bm.loops.layers.float_color.new('Tint')
        self.ovl = self.bm.faces.layers.int.new('overlay'); self._ov = 0      # aufgesetzte Flächen (Kacheln, Aufkleber, Markierungen): verdecken nichts
        self.mats = []; self.stack = [Matrix.Identity(4)]; self.R = random.Random(seed); self.lights = []
        # Lichtkarte: große Flächen bekommen ein eigenes Feld (chart) im zweiten Satz Texturkoordinaten; alles Übrige trägt sein Licht in den Eckfarben
        self.uv1 = self.bm.loops.layers.uv.new('Lightmap'); self.chl = self.bm.faces.layers.int.new('chart'); self.charts = []; self.lm = False; self.lm_min = 2.5      # lm_min: Flächen ab so vielen m² bekommen ein eigenes Feld
        self.seg = 3.0                           # Spaltenbreite großer Flächen (für ferne, große Bauten größer stellen: weniger Dreiecke)
        self.lamps = []; self.blocks = []       # zusätzliche Lichtquellen für die Berechnung; Standflächen (nicht begehbar) fürs Spiel

    # ------------------------------------------------------------ Grundlagen
    @property
    def M(self): return self.stack[-1]
    @contextmanager
    def push(self, M):
        self.stack.append(self.stack[-1] @ M)
        try: yield
        finally: self.stack.pop()
    @contextmanager
    def overlay(self):
        """Alles darin gilt als aufgesetzt (dünne Markierungen auf Flächen): Es wirft keine Verdeckung auf das Darunterliegende."""
        self._ov += 1
        try: yield
        finally: self._ov -= 1
    def at(self, loc=(0, 0, 0), rz=0.0):
        return self.push(Matrix.Translation(V(loc)) @ Matrix.Rotation(rz, 4, 'Z'))
    def _mi(self, name):
        if name not in self.mats: self.mats.append(name)
        return self.mats.index(name)
    def poly(self, pts, uvs, tint=(1, 1, 1), mat='kit_trim', chart=0, st=None):
        vs = [self.bm.verts.new(self.M @ V(p)) for p in pts]
        try: f = self.bm.faces.new(vs)
        except ValueError: return None
        f.material_index = self._mi(mat); f.smooth = True; f[self.ovl] = 1 if (self._ov or mat not in ('kit_trim', 'kit_int', 'kit_concrete')) else 0
        f[self.chl] = chart
        for i, (l, uv) in enumerate(zip(f.loops, uvs)):
            l[self.uv].uv = uv; l[self.col] = (tint[0], tint[1], tint[2], 1.0)
            if chart: l[self.uv1].uv = st[i]
        return f
    def face(self, bl, br, tr, tl, strip='plain', tint='hull', u0=None, fit=True, chart=0, st=None):
        """Viereck mit Streifen: u läuft von bl nach br (in Metern, kachelt), v von bl nach tl quer über den Streifen."""
        bl, br, tr, tl = V(bl), V(br), V(tr), V(tl)
        L, H = (br - bl).length, (tl - bl).length
        vb, vt, sh = vband(strip)
        if u0 is None: u0 = self.R.randrange(12)
        v1 = vt if fit else vb + min(1.0, H / sh) * (vt - vb)
        e = 0.002
        self.poly((bl, br, tr, tl), ((u0 / SM, vb + e), ((u0 + L) / SM, vb + e), ((u0 + L) / SM, v1 - e), (u0 / SM, v1 - e)), T(tint), SHEET[strip][0], chart, st)
    def surf(self, bl, br, tl, strip='wall', tint='hull', seg=None):
        """Rechteckige Fläche (bl, br, tl), in Reihen und Spalten geteilt: Reihen nach Streifenart, Spalten höchstens seg Meter breit (Vorgabe: self.seg)."""
        seg = seg or self.seg; bl, br, tl = V(bl), V(br), V(tl); du, dv = br - bl, tl - bl; L, H = du.length, dv.length
        if L < 1e-5 or H < 1e-5: return
        nu = max(1, math.ceil(L / seg - 1e-6)); ch = 0
        if self.lm and not self._ov and L * H >= self.lm_min and min(L, H) >= 0.7:
            sc = (self.M.to_3x3() @ du).length / L                      # Maßstab der aktuellen Verschiebung (fast immer 1)
            self.charts.append((L * sc, H * sc)); ch = len(self.charts)
        for name, h0, h1, fit in bands(strip, H):
            u0 = self.R.randrange(12)
            for k in range(nu):
                a = bl + du * (k / nu) + dv * (h0 / H); b = bl + du * ((k + 1) / nu) + dv * (h0 / H); up = dv * ((h1 - h0) / H)
                st = ((k / nu, h0 / H), ((k + 1) / nu, h0 / H), ((k + 1) / nu, h1 / H), (k / nu, h1 / H))
                self.face(a, b, b + up, a + up, name, tint, u0=u0 + L * k / nu, fit=fit, chart=ch, st=st)
    def ngon(self, pts, strip='plain', tint='hull'):
        pts = [V(p) for p in pts]; n = len(pts); c = sum(pts, Vector()) / n
        nn = Vector()
        for i in range(n): nn += (pts[i] - c).cross(pts[(i + 1) % n] - c)
        if nn.length < 1e-9: return
        nn.normalize(); ux = (pts[1] - pts[0]).normalized(); uy = nn.cross(ux)
        xs = [(p - c).dot(ux) for p in pts]; ys = [(p - c).dot(uy) for p in pts]
        x0, y0, y1 = min(xs), min(ys), max(ys); vb, vt, sh = vband(strip); u0 = self.R.randrange(12)
        self.poly(pts, [((u0 + x - x0) / SM, vb + 0.001 + (y - y0) / max(y1 - y0, 1e-6) * (vt - vb - 0.002)) for x, y in zip(xs, ys)], T(tint), SHEET[strip][0])
    def cap(self, prof, y, front=True, strip='wall', tint='hull'):
        """Stirnfläche eines Prismas (Punkte (x, z), von vorn gesehen gegen den Uhrzeigersinn), reihenweise mit Wandstreifen belegt."""
        zmin = min(p[1] for p in prof); zmax = max(p[1] for p in prof)
        for name, h0, h1, fit in bands(strip, zmax - zmin):
            poly = list(prof)
            for lim, keep_above in ((zmin + h0, True), (zmin + h1, False)):
                out = []
                for i in range(len(poly)):
                    p, q = poly[i], poly[(i + 1) % len(poly)]
                    ip = (p[1] >= lim - 1e-7) if keep_above else (p[1] <= lim + 1e-7); iq = (q[1] >= lim - 1e-7) if keep_above else (q[1] <= lim + 1e-7)
                    if ip: out.append(p)
                    if ip != iq and abs(q[1] - p[1]) > 1e-9:
                        t = (lim - p[1]) / (q[1] - p[1]); out.append((p[0] + (q[0] - p[0]) * t, lim))
                poly = out
                if len(poly) < 3: break
            if len(poly) < 3: continue
            vb, vt, sh = vband(name); u0 = self.R.randrange(12); bh = (h1 - h0) if fit else sh
            uvs = [((u0 + px) / SM, vb + 0.001 + min(1.0, (pz - zmin - h0) / bh) * (vt - vb - 0.002)) for px, pz in poly]
            pts = [(px, y, pz) for px, pz in poly]
            if not front: pts.reverse(); uvs.reverse()
            self.poly(pts, uvs, T(tint), SHEET[name][0])
    def tile(self, name, c, u, v, w, h, tint='hull_light', sub=None, off=0.0, cells=None, scale=SM, mat=None):
        """Einzelmotiv als Viereck: Mitte c, Richtungen u (rechts) und v (oben), Größe w × h."""
        if cells is None: mat, (x0, y0, x1, y1) = TILES[name]
        else: x0, y0, x1, y1 = cells[name]['x'], cells[name]['y'], cells[name]['x'] + cells[name]['w'], cells[name]['y'] + cells[name]['h']
        if sub: x0, y0, x1, y1 = x0 + sub[0], y0 + sub[1], x0 + sub[2], y0 + sub[3]
        c, u, v = V(c), V(u).normalized(), V(v).normalized(); c = c + u.cross(v) * off
        pts = (c - u * w / 2 - v * h / 2, c + u * w / 2 - v * h / 2, c + u * w / 2 + v * h / 2, c - u * w / 2 + v * h / 2)
        with self.overlay(): self.poly(pts, ((x0 / scale, 1 - y1 / scale), (x1 / scale, 1 - y1 / scale), (x1 / scale, 1 - y0 / scale), (x0 / scale, 1 - y0 / scale)), T(tint), mat)
    def sign(self, name, c, u, v, w, h=None, off=0.02, poster=None):
        """Leuchtschild oder Werbetafel aus dem Schilder-Atlas (kit_signs.json). Namen mit ad_ sind farbige Werbetafeln, alles andere nimmt im Spiel die Akzentfarbe."""
        d = SIGNS[name]; h = w * d['h'] / d['w'] if h is None else h
        poster = name.startswith('ad_') if poster is None else poster
        self.tile(name, c, u, v, w, h, 'none', off=off, cells=SIGNS, scale=SPX, mat='kit_poster' if poster else 'kit_sign')
    def neon(self, name, c, u, v, w, h=None, off=0.03):
        """Leuchtschrift oder Leuchtkasten aus einem der Stadt-Atlanten (kit_city.json → kit_neon, kit_city2.json → kit_neon2), selbstleuchtend in eigenen Farben."""
        cells, px, mat = (CITY, CPX, 'kit_neon') if name in CITY else (CITY2, CPX2, 'kit_neon2')
        d = cells[name]; h = w * d['h'] / d['w'] if h is None else h
        self.tile(name, c, u, v, w, h, 'none', off=off, cells=cells, scale=px, mat=mat)
    def holo(self, name, c, u, v, w, h=None):
        """Hologramm aus dem zweiten Stadt-Atlas: durchscheinend, Schwarz lässt durch (Material kit_holo, im Spiel flackernd)."""
        d = CITY2[name]; h = w * d['h'] / d['w'] if h is None else h
        self.tile(name, c, u, v, w, h, 'none', off=0.0, cells=CITY2, scale=CPX2, mat='kit_holo')
    def facade(self, bl, br, tl, tint='none', per=(24.0, 25.6), z0=0.0, mat='kit_tower', u0=None):
        """Turmfassade als eine Fläche (Material kit_tower: kachelndes Bild mit Fenstern, Leuchtkarte für beleuchtete Fenster).
        bl, br, tl: Ecken (unten links, unten rechts, oben links); Texturkoordinaten in Metern / Kachelgröße. z0 verschiebt das Geschossraster."""
        bl, br, tl = V(bl), V(br), V(tl); L, H = (br - bl).length, (tl - bl).length
        if L < 1e-3 or H < 1e-3: return
        u0 = self.R.randrange(8) * per[0] / 8 if u0 is None else u0; v0 = z0 / per[1]; ch = 0; st = None
        if self.lm and not self._ov and L * H >= self.lm_min: self.charts.append((L, H)); ch = len(self.charts); st = ((0, 0), (1, 0), (1, 1), (0, 1))      # eigenes Feld der Lichtkarte
        self.poly((bl, br, br + (tl - bl), tl), ((u0 / per[0], v0), ((u0 + L) / per[0], v0), ((u0 + L) / per[0], v0 + H / per[1]), (u0 / per[0], v0 + H / per[1])), T(tint), mat, ch, st)
    def decal(self, name, c, u, v, w, h=None, tint='white', off=0.015):
        d = DECALS[name]; h = w * d['h'] / d['w'] if h is None else h
        self.tile(name, c, u, v, w, h, tint, off=off, cells=DECALS, scale=DPX, mat='kit_decal')
    def lamp(self, pos, color=(1.0, 0.93, 0.8), power=400.0, radius=0.3):
        """Zusätzliche Lichtquelle nur für die Lichtberechnung in Blender (Punktlicht in Watt)."""
        p = self.M @ V(pos); self.lamps.append(((p.x, p.y, p.z), tuple(color), power, radius))
    def block_rect(self, x0, y0, x1, y1):
        """Merkt eine Standfläche (lokale x/y-Ecken): Dort kann man im Spiel nicht hindurchgehen. Landet in den Zusatzangaben als blocks [x0, x1, z0, z1]."""
        a = self.M @ Vector((x0, y0, 0)); b = self.M @ Vector((x1, y1, 0))
        self.blocks.append([round(min(a.x, b.x), 2), round(max(a.x, b.x), 2), round(min(-a.y, -b.y), 2), round(max(-a.y, -b.y), 2)])
    def number(self, text, c, u, v, h=1.0, tint='white', off=0.015):
        c, u = V(c), V(u).normalized(); w = h * 0.75
        for i, ch in enumerate(text): self.decal('d' + ch, c + u * ((i - (len(text) - 1) / 2) * w), u, v, w, h, tint, off)
    def glow(self, kind, c, u, v, w, h, off=0.01):
        c, u, v = V(c), V(u).normalized(), V(v).normalized(); c = c + u.cross(v) * off
        self.poly((c - u * w / 2 - v * h / 2, c + u * w / 2 - v * h / 2, c + u * w / 2 + v * h / 2, c - u * w / 2 + v * h / 2), ((0, 0),) * 4, (1, 1, 1), 'kit_' + kind)
    def glass(self, c, u, v, w, h, off=0.012):
        """Dunkle Scheibe (spiegelt im Spiel den Himmel)."""
        c, u, v = V(c), V(u).normalized(), V(v).normalized(); c = c + u.cross(v) * off
        self.poly((c - u * w / 2 - v * h / 2, c + u * w / 2 - v * h / 2, c + u * w / 2 + v * h / 2, c - u * w / 2 + v * h / 2), ((0, 0),) * 4, (1, 1, 1), 'kit_glass')
    def glowbox(self, kind, size, loc):
        sx, sy, sz = size; loc = V(loc)
        for n, u, v in ((X, Y, Z), (-X, -Y, Z), (Y, -X, Z), (-Y, X, Z), (Z, X, Y), (-Z, X, -Y)):
            e = Vector((sx / 2, sy / 2, sz / 2))
            self.glow(kind, loc + n * abs(n.dot(e)), u, v, abs(u.dot(e)) * 2, abs(v.dot(e)) * 2, off=0)
    def light(self, kind, pos, size=4.0):
        """Merkt einen Leuchtpunkt für das Spiel (Glühen als Sprite): kind = light, lamp, redlamp, screen, green."""
        p = self.M @ V(pos); self.lights.append({'k': kind, 'p': [round(p.x, 3), round(p.z, 3), round(-p.y, 3)], 's': size})

    # ------------------------------------------------------------ Grundformen
    def box(self, size, loc=(0, 0, 0), side='plain', top=None, tint='hull', tint_top=None, bevel=0.04, rz=0.0, rot=None, bottom=False, base=True, along='x'):
        """Kasten mit gefasten Kanten. loc = Mitte der Grundfläche (base) oder Mitte des Kastens. along='z': Streifen laufen senkrecht."""
        sx, sy, sz = size; b = max(0.0, min(bevel, sx * 0.3, sy * 0.3, sz * 0.3)); loc = V(loc)
        if base:
            if not bottom: sz += b; loc = loc + Vector((0, 0, sz / 2 - b))      # ohne Boden: die untere Fase verschwindet im Grund
            else: loc = loc + Vector((0, 0, sz / 2))
        e = Vector((sx / 2, sy / 2, sz / 2))
        with self.push(Matrix.Translation(loc) @ (rot or Matrix.Rotation(rz, 4, 'Z'))):
            for n, u, v in ((X, Y, Z), (-X, -Y, Z), (Y, -X, Z), (-Y, X, Z), (Z, X, Y), (-Z, X, -Y)):
                if n.z < -0.5 and not bottom: continue
                en, eu, ev = abs(n.dot(e)), abs(u.dot(e)), abs(v.dot(e)); c = n * en; U = u * (eu - b); W = v * (ev - b)
                bl, br, tr, tl = c - U - W, c + U - W, c + U + W, c - U + W
                if abs(n.z) > 0.5:
                    if ev > eu: bl, br, tr, tl = br, tr, tl, bl
                    self.surf(bl, br, tl, top or side, tint_top or tint)
                else:
                    if along == 'z': bl, br, tr, tl = br, tr, tl, bl
                    self.surf(bl, br, tl, side, tint)
            if b < 1e-4: return
            for a, bb, c in ((0, 1, 2), (1, 2, 0), (2, 0, 1)):
                for sa in (-1, 1):
                    for sb in (-1, 1):
                        def P(da, db, sc):
                            p = [0.0, 0.0, 0.0]; p[a] = sa * (e[a] - da); p[bb] = sb * (e[bb] - db); p[c] = sc * (e[c] - b); return Vector(p)
                        q = [P(0, b, -1), P(0, b, 1), P(b, 0, 1), P(b, 0, -1)]
                        o = Vector((0, 0, 0)); o[a] = sa; o[bb] = sb
                        if (q[1] - q[0]).cross(q[3] - q[0]).dot(o) < 0: q = [q[1], q[0], q[3], q[2]]
                        self.face(q[0], q[1], q[2], q[3], 'edge', tint_top if (tint_top and 2 in (a, bb) and (sa if a == 2 else sb) > 0) else tint)
            vb, vt, sh = vband('edge'); vm = (vb + vt) / 2
            for s1 in (-1, 1):
                for s2 in (-1, 1):
                    for s3 in (-1, 1):
                        p1 = Vector((s1 * e.x, s2 * (e.y - b), s3 * (e.z - b))); p2 = Vector((s1 * (e.x - b), s2 * e.y, s3 * (e.z - b))); p3 = Vector((s1 * (e.x - b), s2 * (e.y - b), s3 * e.z))
                        if (p2 - p1).cross(p3 - p1).dot(Vector((s1, s2, s3))) < 0: p2, p3 = p3, p2
                        self.poly((p1, p2, p3), ((0.3, vm), (0.31, vm), (0.305, vm + 0.004)), T(tint))
    def beam(self, a, b, w=0.3, h=0.3, strip='beam', tint='yellow', bevel=0.025):
        a, b = V(a), V(b); d = b - a
        if d.length < 1e-5: return
        q = d.to_track_quat('X', 'Y' if abs(d.normalized().z) > 0.99 else 'Z')
        self.box((d.length, w, h), (a + b) / 2, side=strip, tint=tint, bevel=bevel, rot=q.to_matrix().to_4x4(), bottom=True, base=False)
    def tube(self, a, b, r, strip='pipe', tint='hull', seg=10, mode='along', caps=True, r2=None, cap_tint=None, flip=False):
        """Rohr von a nach b. mode 'along': Streifen läuft längs (Rohre), 'around': um den Umfang (Tanks, Fässer, Reifen)."""
        a, b = V(a), V(b); d = b - a; L = d.length; r2 = r if r2 is None else r2
        if L < 1e-5: return
        with self.push(Matrix.Translation(a) @ d.to_track_quat('Z', 'Y').to_matrix().to_4x4()):
            cs = [(math.cos(i / seg * TAU), math.sin(i / seg * TAU)) for i in range(seg + 1)]
            rows = bands(strip, L) if mode == 'around' else [(strip, 0.0, L, True)]
            for name, h0, h1, fit in rows:
                vb, vt, sh = vband(name); u0 = self.R.randrange(12)
                ra, rb = r + (r2 - r) * h0 / L, r + (r2 - r) * h1 / L
                for i in range(seg):
                    p0 = Vector((cs[i][0] * ra, cs[i][1] * ra, h0)); p1 = Vector((cs[i + 1][0] * ra, cs[i + 1][1] * ra, h0))
                    p2 = Vector((cs[i + 1][0] * rb, cs[i + 1][1] * rb, h1)); p3 = Vector((cs[i][0] * rb, cs[i][1] * rb, h1))
                    if mode == 'along':
                        va, vc = vb + (vt - vb) * i / seg, vb + (vt - vb) * (i + 1) / seg
                        self.poly((p0, p1, p2, p3), ((u0 / SM, va), (u0 / SM, vc), ((u0 + L) / SM, vc), ((u0 + L) / SM, va)), T(tint), SHEET[name][0])
                    else:
                        c = TAU * max(r, r2); ua, uc = (u0 + c * i / seg) / SM, (u0 + c * (i + 1) / seg) / SM
                        v1 = vt if fit else vb + min(1.0, (h1 - h0) / sh) * (vt - vb)
                        pp, uu = (p0, p1, p2, p3), ((ua, vb + 0.001), (uc, vb + 0.001), (uc, v1 - 0.001), (ua, v1 - 0.001))
                        self.poly(pp[::-1] if flip else pp, uu[::-1] if flip else uu, T(tint), SHEET[name][0])
            if caps:
                ct = cap_tint or tint
                if r > 1e-4: self.ngon([(cs[i][0] * r, cs[i][1] * r, 0) for i in range(seg - 1, -1, -1)], 'plain', ct)
                if r2 > 1e-4: self.ngon([(cs[i][0] * r2, cs[i][1] * r2, L) for i in range(seg)], 'plain', ct)
    def sphere(self, r, loc, tint='white', strip='wall_b', seg=16, rings=8, squash=1.0):
        loc = V(loc); vb, vt, sh = vband(strip); u0 = self.R.randrange(12); c = TAU * r
        P = lambda i, j: loc + Vector((math.cos(i / seg * TAU) * math.sin(j / rings * math.pi) * r, math.sin(i / seg * TAU) * math.sin(j / rings * math.pi) * r, -math.cos(j / rings * math.pi) * r * squash))
        for j in range(rings):
            for i in range(seg):
                pts = [P(i, j), P(i + 1, j), P(i + 1, j + 1), P(i, j + 1)]
                uvs = [((u0 + c * (i + k) / seg) / SM, vb + 0.002 + (vt - vb - 0.004) * (j + m) / rings) for k, m in ((0, 0), (1, 0), (1, 1), (0, 1))]
                if j == 0: pts, uvs = pts[1:], uvs[1:]
                elif j == rings - 1: pts, uvs = pts[:3], uvs[:3]
                self.poly(pts, uvs, T(tint), SHEET[strip][0])
    def prism(self, prof, y0, y1, side='wall', top='roofing', tint='hull', tint_top=None, caps=(True, True), cap_strip='wall', seg=None):
        """Querschnitt in der X/Z-Ebene (von vorn gesehen gegen den Uhrzeigersinn), gezogen von y0 (vorn) bis y1 (hinten)."""
        n = len(prof)
        for i in range(n):
            (xa, za), (xb, zb) = prof[i], prof[(i + 1) % n]; dx, dz = xb - xa, zb - za; ln = math.hypot(dx, dz)
            if ln < 1e-6: continue
            up = -dx / ln
            if up < -0.9: continue                         # Unterseite weglassen
            self.surf((xa, y0, za), (xa, y1, za), (xb, y0, zb), top if up > 0.3 else side, (tint_top or tint) if up > 0.3 else tint, seg)
        if caps[0]: self.cap(prof, y0, True, cap_strip, tint)
        if caps[1]: self.cap(prof, y1, False, cap_strip, tint)
    def slab(self, sx, sy, h, loc=(0, 0, 0), tint='concrete', cell=4.0, mat='kit_concrete', uvm=4.0, holes=()):
        """Bodenplatte mit eigenem Kachelmaterial (Beton): Texturkoordinaten in Metern / uvm, Oberseite in Felder geteilt."""
        loc = V(loc); nx, ny = max(1, round(sx / cell)), max(1, round(sy / cell)); t = T(tint); ch = 0
        if self.lm and not self._ov: self.charts.append((sx, sy)); ch = len(self.charts)      # die ganze Oberseite ist ein Feld der Lichtkarte
        with self.at(loc):
            for i in range(nx):
                for j in range(ny):
                    x0, x1, y0, y1 = -sx / 2 + sx * i / nx, -sx / 2 + sx * (i + 1) / nx, -sy / 2 + sy * j / ny, -sy / 2 + sy * (j + 1) / ny
                    if any(q[0] < (x0 + x1) / 2 < q[2] and q[1] < (y0 + y1) / 2 < q[3] for q in holes): continue      # Aussparung (dort liegt ein anderer Belag)
                    st = ((i / nx, j / ny), ((i + 1) / nx, j / ny), ((i + 1) / nx, (j + 1) / ny), (i / nx, (j + 1) / ny)) if ch else None
                    self.poly(((x0, y0, h), (x1, y0, h), (x1, y1, h), (x0, y1, h)), ((x0 / uvm, y0 / uvm), (x1 / uvm, y0 / uvm), (x1 / uvm, y1 / uvm), (x0 / uvm, y1 / uvm)), t, mat, ch, st)
            for (ax, ay), (bx, by) in (((-sx / 2, -sy / 2), (sx / 2, -sy / 2)), ((sx / 2, -sy / 2), (sx / 2, sy / 2)), ((sx / 2, sy / 2), (-sx / 2, sy / 2)), ((-sx / 2, sy / 2), (-sx / 2, -sy / 2))):
                L = math.hypot(bx - ax, by - ay)
                self.poly(((ax, ay, -0.3), (bx, by, -0.3), (bx, by, h), (ax, ay, h)), ((0, 0), (L / uvm, 0), (L / uvm, (h + 0.3) / uvm), (0, (h + 0.3) / uvm)), t, mat)

    # ------------------------------------------------------------ Bauteile: Gebäude
    def ring(self, sx, sy, z, w, h, strip='beam', tint='hull_dark', bevel=0.03):
        """Umlaufender Rahmen (vier Balken) um ein Rechteck sx × sy in Höhe z."""
        for s in (-1, 1):
            self.box((sx + w, w, h), (0, s * sy / 2, z), side=strip, tint=tint, bevel=bevel, bottom=True)
            self.box((w, sy - w, h), (s * sx / 2, 0, z), side=strip, tint=tint, bevel=bevel, bottom=True)
    def block(self, sx, sy, sz, loc=(0, 0, 0), tint='hull', top='roofing', tint_top=None, plinth=0.6, cornice=0.45, trim='hull_dark', rz=0.0):
        """Baukörper: Wände mit Paneelen, Dach, Sockelband und Attika."""
        with self.at(loc, rz):
            self.box((sx, sy, sz), side='wall', top=top, tint=tint, tint_top=tint_top or tint, bevel=0.06)
            if plinth: self.box((sx + 0.3, sy + 0.3, plinth), side='girder', tint=trim, bevel=0.05)
            if cornice: self.ring(sx, sy, sz - cornice + 0.18, 0.34, cornice, 'beam', trim)
    def wing(self, length, run, z_hi, z_lo, loc=(0, 0, 0), side=1, tint='hull', tint_top=None, base=0.0, rafters=3, rafter_tint='yellow'):
        """Flügel mit Pultdach: beginnt bei x = 0 (hoch) und fällt nach außen (x = side * run) ab; Tiefe = length (y von -length/2 bis +length/2)."""
        with self.at(loc):
            prof = [(0, base), (run, base), (run, z_lo), (0, z_hi)] if side > 0 else [(-run, base), (0, base), (0, z_hi), (-run, z_lo)]
            self.prism(prof, -length / 2, length / 2, tint=tint, tint_top=tint_top or tint)
            s = side
            for k in range(rafters):
                y = -length / 2 + 0.25 + (length - 0.5) * (k / max(1, rafters - 1))
                self.beam((s * 0.1, y, z_hi + 0.22), (s * (run + 0.3), y, z_lo + 0.22), 0.55, 0.5, 'beam', rafter_tint)
            self.beam((s * (run + 0.15), -length / 2, z_lo + 0.1), (s * (run + 0.15), length / 2, z_lo + 0.1), 0.5, 0.45, 'girder', 'hull_dark')
    def gate(self, w=11.0, h=8.5, depth=1.6, loc=(0, 0, 0), rz=0.0, tint='hull_dark', door='hull_mid', label='w_hangar', number=None):
        """Großes Tor: Rahmen steht um depth vor, Torblatt aus Lamellen zurückgesetzt. Ursprung: Mitte der Schwelle, vordere Rahmenkante bei y = -depth/2."""
        pw = 1.9
        with self.at(loc, rz):
            for s in (-1, 1):
                self.box((pw, depth, h + 1.0), (s * (w / 2 + pw / 2), 0, 0), side='wall', tint=tint, bevel=0.09)
                self.box((0.5, 0.14, h - 0.4), (s * (w / 2 + 0.38), -depth / 2 - 0.03, 0.2), side='hazard', tint='none', bevel=0.015, bottom=True, along='z')
                self.box((0.34, 0.3, 3.2), (s * (w / 2 + 1.35), -depth / 2 - 0.1, 2.6), side='girder', tint='black', bevel=0.03, bottom=True, along='z')
                self.glow('light', (s * (w / 2 + 1.35), -depth / 2 - 0.26, 4.2), X, Z, 0.2, 2.8)
                self.light('light', (s * (w / 2 + 1.35), -depth / 2 - 0.5, 4.2), 3.0)
                self.box((0.5, 0.2, 0.5), (s * (w / 2 + 0.38), -depth / 2 - 0.06, h + 0.1), side='plain', tint='black', bevel=0.04, bottom=True)
                self.glow('redlamp', (s * (w / 2 + 0.38), -depth / 2 - 0.17, h + 0.35), X, Z, 0.3, 0.3)
                self.light('redlamp', (s * (w / 2 + 0.38), -depth / 2 - 0.4, h + 0.35), 2.2)
                self.box((w / 2 - 0.06, 0.45, h), (s * w / 4, depth / 2 - 0.45, 0), side='siding', tint=door, bevel=0.05)
            self.box((w + 2 * pw, depth, 2.6), (0, 0, h), side='siding', tint=tint, bevel=0.09, bottom=True)
            self.box((w - 0.3, 0.14, 0.5), (0, -depth / 2 - 0.03, h - 0.02), side='hazard', tint='none', bevel=0.015, bottom=True)
            self.box((0.2, 0.5, h), (0, depth / 2 - 0.5, 0), side='hose', tint='black', bevel=0.02, along='z')
            self.box((5.4, 0.16, 1.5), (0, -depth / 2 - 0.05, h + 0.75), side='plain', tint='black', bevel=0.04, bottom=True)
            if label: self.decal(label, (-(0.9 if number else 0), -depth / 2 - 0.13, h + 1.5), X, Z, 3.4, tint='white')
            if number: self.number(number, (2.0, -depth / 2 - 0.13, h + 1.5), X, Z, 1.0, 'yellow')
            self.tile('vent', (-(w / 2 + pw / 2), -depth / 2, h + 1.9), X, Z, 1.3, 1.3, 'hull_mid', off=0.02)
            self.tile('ctrl', (w / 2 + pw / 2, -depth / 2, 1.7), X, Z, 1.1, 1.1, 'hull_light', off=0.02)
            self.glow('screen', (w / 2 + pw / 2 - 0.15, -depth / 2 - 0.03, 1.94), X, Z, 0.42, 0.28)
    def door(self, loc=(0, 0, 0), rz=0.0, tint='hull_light', frame='hull_dark', w=1.5, h=2.3):
        """Personentür vor einer Wand (Ursprung: Mitte der Schwelle, Tür zeigt nach -Y)."""
        with self.at(loc, rz):
            for s in (-1, 1): self.box((0.22, 0.3, h + 0.2), (s * (w / 2 + 0.11), 0, 0), side='beam', tint=frame, bevel=0.03, along='z')
            self.box((w + 0.44, 0.3, 0.24), (0, 0, h + 0.1), side='beam', tint=frame, bevel=0.03, bottom=True)
            self.tile('door', (0, -0.06, h / 2), X, Z, w, h, tint, sub=(0.37, 0.15, 1.63, 1.98))
            self.glow('redlamp', (w / 2 + 0.11, -0.16, 1.4), X, Z, 0.08, 0.08)
            self.glowbox('light', (w * 0.7, 0.16, 0.08), (0, -0.2, h + 0.28)); self.light('light', (0, -0.5, h + 0.2), 2.0)
    def windows(self, length, loc=(0, 0, 0), rz=0.0, h=0.7, n=None, frame='hull_dark', kind='light'):
        """Fensterband vor einer Wand (Ursprung: Mitte der Unterkante, zeigt nach -Y)."""
        n = n or max(1, round(length / 1.6))
        with self.at(loc, rz):
            self.box((length, 0.22, h + 0.24), (0, 0, -0.12), side='beam', tint=frame, bevel=0.03, bottom=True)
            cw = (length - 0.24) / n
            for i in range(n):
                x = -length / 2 + 0.12 + cw * (i + 0.5); self.glow(kind, (x, -0.115, h / 2), X, Z, cw - 0.12, h - 0.1)
    def ramp(self, w, length, rise, loc=(0, 0, 0), rz=0.0, tint='hull_mid', rail='yellow'):
        """Rampe: oben bei y = 0 (Höhe rise), läuft nach -Y auf den Boden. Mit Wangen und Geländer."""
        with self.at(loc, rz):
            self.surf((-w / 2, -length, 0.0), (w / 2, -length, 0.0), (-w / 2, 0, rise), 'floor', tint)
            for s in (-1, 1):
                x = s * (w / 2 + 0.3)
                prof = [(-length - 0.4, -0.3), (0.0, -0.3), (0.0, rise + 0.5), (-length - 0.4, 0.45)]
                with self.push(Matrix.Translation((x, 0, 0)) @ Matrix.Rotation(math.pi / 2, 4, 'Z')):
                    self.prism(prof, -0.3, 0.3, side='girder', top='plain', tint='hull_dark', cap_strip='siding', seg=4)
                if rail:
                    self.beam((x, 0, rise + 1.5), (x, -length + 0.3, 1.25), 0.14, 0.14, 'plain', rail, 0.02)
                    for k in range(4):
                        t = k / 3; yy = -t * (length - 0.5); zz = rise * (1 - t)
                        self.tube((x, yy, zz + 0.4), (x, yy, zz + 1.45 - 0.2 * t), 0.06, 'plain', 'hull_dark', 6)
                self.box((0.5, 0.5, 0.3), (x, -length - 0.1, 0.42), side='plain', tint='black', bevel=0.04, bottom=True)
                self.glow('redlamp', (x, -length - 0.36, 0.57), X, Z, 0.3, 0.16); self.light('redlamp', (x, -length - 0.6, 0.6), 2.0)
    def railing(self, a, b, h=1.1, tint='yellow', every=1.6):
        a, b = V(a), V(b); L = (b - a).length; n = max(1, round(L / every))
        self.beam(a + Z * h, b + Z * h, 0.1, 0.1, 'plain', tint, 0.015)
        self.beam(a + Z * h * 0.5, b + Z * h * 0.5, 0.06, 0.06, 'plain', tint, 0.01)
        for i in range(n + 1): p = a + (b - a) * (i / n); self.tube(p, p + Z * h, 0.045, 'plain', 'hull_dark', 6)
    def walkway(self, length, w=1.8, h=2.6, loc=(0, 0, 0), rz=0.0, rails=(True, True), legs=3.5, tint='hull_dark'):
        """Laufsteg entlang x (Mitte im Ursprung, Oberkante in Höhe h) mit Gitterrost, Stützen und Geländer (vorn/hinten)."""
        with self.at(loc, rz):
            self.box((length, w, 0.22), (0, 0, h - 0.22), side='beam', top='floor', tint=tint, bevel=0.03, bottom=True)
            if h > 0.6:
                n = max(1, round(length / legs))
                for i in range(n + 1):
                    x = -length / 2 + 0.3 + (length - 0.6) * i / n
                    for s in (-1, 1): self.box((0.24, 0.24, h - 0.2), (x, s * (w / 2 - 0.2), 0), side='girder', tint=tint, bevel=0.03, along='z')
                    if h > 1.6: self.beam((x, -w / 2 + 0.2, h - 0.3), (x, w / 2 - 0.2, 0.5), 0.08, 0.08, 'plain', tint, 0.01)
            for on, s in zip(rails, (-1, 1)):
                if on: self.railing((-length / 2 + 0.06, s * (w / 2 - 0.06), h), (length / 2 - 0.06, s * (w / 2 - 0.06), h))
    def stairs(self, w, rise, loc=(0, 0, 0), rz=0.0, tint='hull_dark', rail='yellow'):
        """Treppe: oben bei y = 0 (Höhe rise), läuft nach -Y hinunter."""
        n = max(2, round(rise / 0.2)); run = n * 0.28
        with self.at(loc, rz):
            for i in range(n):
                self.box((w, 0.3, 0.06), (0, -(i + 0.5) * 0.28, rise - (i + 1) * rise / n + 0.0), side='floor', tint='steel', bevel=0.01, bottom=True)
            for s in (-1, 1):
                x = s * (w / 2 + 0.06)
                self.beam((x, 0, rise - 0.12), (x, -run, -0.12 + rise / n), 0.1, 0.3, 'beam', tint, 0.015)
                if rail:
                    self.beam((x, 0, rise + 1.05), (x, -run, 1.05), 0.08, 0.08, 'plain', rail, 0.012)
                    for t in (0.0, 0.5, 1.0): self.tube((x, -run * t, rise * (1 - t)), (x, -run * t, rise * (1 - t) + 1.05), 0.04, 'plain', tint, 6)
        return run
    def ladder(self, h, loc=(0, 0, 0), rz=0.0, tint='steel'):
        with self.at(loc, rz):
            for s in (-1, 1): self.tube((s * 0.25, -0.12, 0), (s * 0.25, -0.12, h), 0.035, 'plain', tint, 6)
            for i in range(int(h / 0.32)): self.tube((-0.25, -0.12, 0.3 + i * 0.32), (0.25, -0.12, 0.3 + i * 0.32), 0.025, 'plain', tint, 6, caps=False)
    def pipe(self, pts, r=0.22, tint='yellow', flange=True, seg=10):
        """Rohrleitung durch die Punkte, mit Bögen (Kugel) und Flanschen."""
        pts = [V(p) for p in pts]
        for i in range(len(pts) - 1):
            a, b = pts[i], pts[i + 1]; self.tube(a, b, r, 'pipe', tint, seg, caps=False)
            if flange:
                d = (b - a).normalized()
                for p in (a + d * min(0.25, (b - a).length * 0.2), b - d * min(0.25, (b - a).length * 0.2)):
                    self.tube(p - d * 0.05, p + d * 0.05, r * 1.32, 'plain', 'steel', seg)
        for p in pts[1:-1]: self.sphere(r * 1.12, p, tint, 'plain', seg, 6)
    def cable(self, a, b, sag=0.5, r=0.05, n=6):
        a, b = V(a), V(b); ps = [a + (b - a) * (i / n) - Z * sag * math.sin(math.pi * i / n) for i in range(n + 1)]
        for i in range(n): self.tube(ps[i], ps[i + 1], r, 'hose', 'black', 6, caps=False)

    # ------------------------------------------------------------ Bauteile: Technik
    def panel(self, name, loc, rz=0.0, w=1.2, h=1.2, depth=0.25, tint='hull_light', glow=None):
        """Wandkasten mit Kachelmotiv (ctrl, vent, hatch, fan). Ursprung: Mitte der Unterkante an der Wand, zeigt nach -Y."""
        with self.at(loc, rz):
            self.box((w, depth, h), (0, -depth / 2, 0), side='plain', tint=tint, bevel=0.03, bottom=True)
            self.tile(name, (0, -depth, h / 2), X, Z, w - 0.06, h - 0.06, tint, off=0.004)
            if glow: self.glow(glow, (-w * 0.125, -depth - 0.012, h * 0.69), X, Z, w * 0.38, h * 0.25)
    def vent_unit(self, loc=(0, 0, 0), rz=0.0, sx=2.2, sy=2.2, sz=1.3, tint='hull_mid'):
        """Lüftungsgerät fürs Dach: Ventilator oben, Lamellen an den Seiten."""
        with self.at(loc, rz):
            self.box((sx, sy, sz), side='plain', tint=tint, bevel=0.06)
            self.tile('fan', (0, 0, sz), X, Y, sx - 0.2, sy - 0.2, tint, off=0.004)
            for u, c in ((X, (0, -sy / 2, sz / 2)), (-X, (0, sy / 2, sz / 2)), (Y, (sx / 2, 0, sz / 2)), (-Y, (-sx / 2, 0, sz / 2))):
                self.tile('vent', c, u, Z, (sx if abs(u.x) > 0.5 else sy) - 0.3, sz - 0.2, tint, off=0.004)
            for s in (-1, 1): self.box((sx + 0.2, 0.2, 0.2), (0, s * (sy / 2 - 0.2), -0.02), side='girder', tint='black', bevel=0.02)
    def generator(self, loc=(0, 0, 0), rz=0.0, tint='green'):
        with self.at(loc, rz):
            self.box((3.2, 1.8, 0.3), side='girder', tint='black', bevel=0.03)
            self.box((3.0, 1.6, 1.7), (0, 0, 0.3), side='siding', top='plain', tint=tint, bevel=0.06, bottom=True)
            self.tile('ctrl', (-0.8, -0.8, 1.15), X, Z, 1.1, 1.1, 'hull_light', off=0.006); self.glow('screen', (-0.94, -0.82, 1.38), X, Z, 0.42, 0.28)
            self.tile('vent', (0.75, -0.8, 1.15), X, Z, 1.2, 1.2, tint, off=0.006); self.tile('fan', (0.5, 0, 2.0), X, Y, 1.3, 1.3, tint, off=0.006)
            self.tube((-1.1, 0.3, 2.0), (-1.1, 0.3, 2.9), 0.12, 'pipe', 'steel', 8); self.decal('volt', (1.5, 0, 1.2), Y, Z, 0.6)
    def mast_light(self, h=14.0, loc=(0, 0, 0), rz=0.0, arms=2):
        """Lichtmast mit Sockel, Schaltkasten und Strahlern."""
        with self.at(loc, rz):
            self.box((1.7, 1.7, 0.9), side='girder', top='plain', tint='hull_dark', bevel=0.06)
            self.box((0.9, 0.7, 2.2), (0, 0, 0.9), side='plain', tint='hull_mid', bevel=0.04, bottom=True)
            self.tile('ctrl', (0, -0.35, 2.0), X, Z, 0.8, 0.8, 'hull_light', off=0.006); self.glow('green', (0.22, -0.37, 2.02), X, Z, 0.06, 0.06)
            self.tube((0, 0, 3.0), (0, 0, h), 0.2, 'pipe', 'hull_dark', 10, r2=0.14)
            self.box((arms * 1.9, 0.3, 0.3), (0, 0, h - 0.15), side='girder', tint='hull_dark', bevel=0.03, bottom=True)
            for i in range(arms):
                x = (i - (arms - 1) / 2) * 1.9 * (2 if arms == 2 else 1) * 0.5
                self.box((1.3, 0.9, 0.42), (x, -0.2, h - 0.62), side='plain', tint='hull_mid', bevel=0.05, bottom=True)
                self.glow('light', (x, -0.2, h - 0.63), X, -Y, 1.1, 0.7); self.light('light', (x, -0.2, h - 0.75), 5.5)
            self.tube((0, 0, h), (0, 0, h + 1.2), 0.04, 'plain', 'steel', 6); self.glowbox('redlamp', (0.14, 0.14, 0.14), (0, 0, h + 1.25)); self.light('redlamp', (0, 0, h + 1.25), 1.6)
    def antenna(self, h=12.0, loc=(0, 0, 0)):
        with self.at(loc):
            self.box((0.8, 0.8, 0.5), side='girder', tint='hull_dark', bevel=0.04)
            self.tube((0, 0, 0.4), (0, 0, h), 0.12, 'pipe', 'steel', 8, r2=0.05)
            for t in (0.45, 0.65, 0.8): self.tube((-0.9 * (1 - t), 0, h * t), (0.9 * (1 - t), 0, h * t), 0.03, 'plain', 'steel', 6)
            self.glowbox('redlamp', (0.2, 0.2, 0.2), (0, 0, h + 0.1)); self.light('redlamp', (0, 0, h + 0.1), 3.5)
    def dish(self, r=2.0, loc=(0, 0, 0), rz=0.0, tilt=0.6, tint='white'):
        with self.at(loc, rz):
            self.box((1.0, 1.0, 0.5), side='girder', tint='hull_dark', bevel=0.04)
            self.tube((0, 0, 0.4), (0, 0, 1.8), 0.16, 'pipe', 'steel', 8)
            with self.push(Matrix.Translation((0, 0, 1.9)) @ Matrix.Rotation(tilt, 4, 'X')):
                self.tube((0, 0, 0), (0, 0, r * 0.42), r * 0.18, 'siding', tint, 20, mode='around', r2=r, caps=False)
                self.tube((0, 0, 0.02), (0, 0, r * 0.42), r * 0.16, 'siding', 'hull_mid', 20, mode='around', r2=r * 0.98, caps=False, flip=True)
                self.tube((0, 0, 0.05), (0, 0, r * 0.75), 0.05, 'plain', 'steel', 6); self.box((0.3, 0.3, 0.3), (0, 0, r * 0.75), side='plain', tint='black', bevel=0.03, bottom=True)
    def turret(self, loc=(0, 0, 0), rz=0.0, tint='hull_mid'):
        with self.at(loc, rz):
            self.tube((0, 0, 0), (0, 0, 0.9), 1.5, 'girder', 'hull_dark', 16, mode='around', r2=1.3)
            self.box((2.4, 3.0, 1.6), (0, 0, 0.9), side='siding', top='plain', tint=tint, bevel=0.12, bottom=True)
            for s in (-1, 1):
                self.tube((s * 0.55, -1.2, 1.75), (s * 0.55, -4.6, 1.95), 0.16, 'pipe', 'black', 8); self.tube((s * 0.55, -4.0, 1.915), (s * 0.55, -4.7, 1.955), 0.23, 'girder', 'steel', 8, mode='around')
            self.tile('hatch', (0, 0.2, 2.5), X, Y, 1.4, 1.4, tint, off=0.006); self.tile('vent', (0, 1.5, 1.7), -X, Z, 1.6, 1.0, tint, off=0.008)
    def tank(self, r=1.4, length=5.0, loc=(0, 0, 0), rz=0.0, tint='white', label='p_caution'):
        """Liegender Tank auf zwei Sätteln (Achse entlang x)."""
        with self.at(loc, rz):
            zc = r + 0.45; hl = length / 2
            self.tube((-hl, 0, zc), (hl, 0, zc), r, 'siding', tint, 16, mode='around', caps=False)
            for s in (-1, 1):
                self.tube((s * hl, 0, zc), (s * (hl + r * 0.45), 0, zc), r, 'plain', tint, 16, r2=r * 0.5)
                self.box((0.5, r * 1.7, zc - r * 0.35), (s * hl * 0.6, 0, 0), side='girder', tint='hull_dark', bevel=0.04, along='z')
                self.tube((s * hl * 0.6 - 0.14, 0, zc), (s * hl * 0.6 + 0.14, 0, zc), r + 0.05, 'hazard', 'none', 16, mode='around', caps=False)
            self.tube((0, 0, zc + r - 0.05), (0, 0, zc + r + 0.45), 0.22, 'pipe', 'steel', 8); self.tube((0, 0, zc + r + 0.4), (0, 0, zc + r + 0.5), 0.34, 'plain', 'steel', 10)
            if label:
                self.box((1.5, 0.08, 0.8), (0, -r - 0.06, zc - 0.4), side='plain', tint='hull_dark', bevel=0.02, bottom=True)
                self.decal(label, (0, -r - 0.1, zc), X, Z, 1.4, off=0.012)
    def silo(self, r=2.5, h=9.0, loc=(0, 0, 0), tint='hull_light'):
        with self.at(loc):
            self.tube((0, 0, 0), (0, 0, 0.8), r + 0.25, 'girder', 'hull_dark', 20, mode='around')
            self.tube((0, 0, 0.8), (0, 0, h), r, 'wall', tint, 20, mode='around', caps=False)
            self.tube((0, 0, h), (0, 0, h + r * 0.45), r, 'roofing', tint, 20, mode='around', r2=r * 0.3)
            for z in (3.8, h - 0.3): self.tube((0, 0, z - 0.15), (0, 0, z + 0.15), r + 0.06, 'beam', 'yellow', 20, mode='around', caps=False)
            self.ladder(h, (0, -r - 0.02, 0)); self.vent_unit((0, 0, h + r * 0.4), sx=1.2, sy=1.2, sz=0.7)
    def crate(self, sx=1.6, sy=1.6, sz=1.4, loc=(0, 0, 0), rz=0.0, tint='hull_light', label=None):
        with self.at(loc, rz):
            self.box((sx, sy, sz), side='plain', tint=tint, bevel=0.05, bottom=False)
            for u, c, w in ((X, (0, -sy / 2, sz / 2), sx), (-X, (0, sy / 2, sz / 2), sx), (Y, (sx / 2, 0, sz / 2), sy), (-Y, (-sx / 2, 0, sz / 2), sy)):
                self.tile('crate', c, u, Z, w - 0.1, sz - 0.1, tint, off=0.004)
            self.tile('crate', (0, 0, sz), X, Y, sx - 0.1, sy - 0.1, tint, off=0.004)
            if label: self.decal(label, (0, -sy / 2, sz * 0.5), X, Z, sx * 0.5, off=0.02)
    def container(self, loc=(0, 0, 0), rz=0.0, tint='blue', number='27'):
        """Frachtcontainer 6 × 2,4 × 2,6 m (Längsachse x)."""
        with self.at(loc, rz):
            self.box((6.0, 2.4, 2.6), side='siding', top='roofing', tint=tint, bevel=0.05)
            for sx in (-1, 1):
                for sy in (-1, 1): self.box((0.22, 0.22, 2.64), (sx * 2.93, sy * 1.13, 0), side='girder', tint='hull_dark', bevel=0.03, along='z')
                self.tile('hatch', (sx * 3.0, 0, 1.3), Y * sx, Z, 2.1, 2.4, tint, off=0.01)
            self.number(number, (1.6, -1.2, 1.9), X, Z, 0.8); self.decal('p_info', (-1.8, -1.2, 1.0), X, Z, 1.0, off=0.02)
    def barrel(self, loc=(0, 0, 0), tint='red', r=0.42, h=1.1):
        with self.at(loc):
            self.tube((0, 0, 0), (0, 0, h), r, 'siding', tint, 12, mode='around', cap_tint='steel')
            for z in (0.06, h * 0.5, h - 0.06): self.tube((0, 0, z - 0.03), (0, 0, z + 0.03), r + 0.025, 'plain', 'steel', 12, caps=False)
    def cage(self, loc=(0, 0, 0), s=2.3, tint='red'):
        """Gitterbox mit Fass."""
        with self.at(loc):
            for sx in (-1, 1):
                for sy in (-1, 1): self.box((0.14, 0.14, s), (sx * s / 2, sy * s / 2, 0), side='girder', tint='hull_dark', bevel=0.02, along='z')
            for z in (0.0, s - 0.14): self.ring(s, s, z, 0.14, 0.14, 'plain', 'hull_dark', 0.02)
            self.tube((0, 0, 0.1), (0, 0, s * 0.86), s * 0.4, 'siding', tint, 14, mode='around', cap_tint='steel')
            self.tube((0, 0, s * 0.86), (0, 0, s * 0.92), s * 0.3, 'plain', 'steel', 14)
    def wheel(self, c, r=0.55, w=0.4):
        c = V(c); self.tube(c - X * w / 2, c + X * w / 2, r, 'hose', 'black', 14, mode='around', cap_tint='black')
        self.tube(c - X * (w / 2 + 0.02), c + X * (w / 2 + 0.02), r * 0.5, 'plain', 'steel', 10)
    def hauler(self, loc=(0, 0, 0), rz=0.0, tint='olive', cargo='hull_light'):
        """Zugmaschine mit Container (fährt in Richtung -Y)."""
        with self.at(loc, rz):
            self.box((3.0, 7.4, 0.7), (0, 0, 0.55), side='girder', tint='hull_dark', bevel=0.06, bottom=True)
            for sx in (-1, 1):
                for y in (-2.5, 0.6, 2.6): self.wheel((sx * 1.6, y, 0.62), 0.62, 0.5)
            self.box((2.9, 2.2, 2.1), (0, -2.5, 1.25), side='plain', tint=tint, bevel=0.14, bottom=True)
            self.glass((0, -3.61, 2.75), X, Z, 2.3, 0.7); self.glass((1.46, -2.5, 2.75), Y, Z, 1.5, 0.7); self.glass((-1.46, -2.5, 2.75), -Y, Z, 1.5, 0.7)
            self.glow('light', (-1.0, -3.61, 1.6), X, Z, 0.4, 0.2); self.glow('light', (1.0, -3.61, 1.6), X, Z, 0.4, 0.2)
            self.tile('vent', (0, -2.5, 3.35), X, Y, 1.6, 1.2, tint, off=0.006)
            self.box((2.8, 4.4, 2.5), (0, 1.2, 1.25), side='siding', top='roofing', tint=cargo, bevel=0.06, bottom=True)
            self.number('027', (1.41, 1.2, 2.9), Y, Z, 0.7, 'black'); self.decal('p_info', (-1.41, 1.2, 2.2), -Y, Z, 1.2, off=0.02)
            self.decal('leak2', (1.41, 0.4, 2.2), Y, Z, 1.2, 2.2, off=0.02)
    def cart(self, loc=(0, 0, 0), rz=0.0):
        """Gepäckwagen mit Kisten."""
        with self.at(loc, rz):
            self.box((2.4, 6.0, 0.25), (0, 0, 0.5), side='girder', top='floor', tint='hull_dark', bevel=0.04, bottom=True)
            for sx in (-1, 1):
                for y in (-2.3, 2.3): self.wheel((sx * 1.2, y, 0.36), 0.36, 0.28)
            self.beam((0, -3.0, 0.6), (0, -4.4, 0.45), 0.14, 0.14, 'plain', 'hull_dark', 0.02)
            for y in (-0.6, 2.9): self.box((2.4, 0.1, 1.2), (0, y, 0.75), side='girder', tint='hull_dark', bevel=0.02, bottom=True)
            self.crate(1.5, 1.5, 1.3, (0, -1.7, 0.75), tint='yellow'); self.crate(1.1, 1.3, 1.0, (-0.45, 0.4, 0.75), 0.1); self.crate(1.1, 1.1, 0.9, (0.5, 1.9, 0.75), -0.15)
            self.barrel((0.6, 0.5, 0.75), 'blue', 0.3, 0.9)
    def platform(self, sx=9.0, sy=9.0, h=1.6, loc=(0, 0, 0), rz=0.0, stairs_side=-1):
        """Erhöhte Ladeplattform mit Geländer und Treppe."""
        with self.at(loc, rz):
            self.box((sx, sy, 0.3), (0, 0, h - 0.3), side='beam', top='floor', tint='hull_dark', bevel=0.04, bottom=True)
            for ax in (-1, 0, 1):
                for ay in (-1, 0, 1):
                    if ax or ay: self.box((0.36, 0.36, h - 0.28), (ax * (sx / 2 - 0.4), ay * (sy / 2 - 0.4), 0), side='girder', tint='hull_mid', bevel=0.03, along='z')
            self.railing((-sx / 2 + 0.1, sy / 2 - 0.1, h), (sx / 2 - 0.1, sy / 2 - 0.1, h)); self.railing((-stairs_side * (sx / 2 - 0.1), -sy / 2 + 0.1, h), (-stairs_side * (sx / 2 - 0.1), sy / 2 - 0.1, h))
            self.railing((-sx / 2 + 0.1, -sy / 2 + 0.1, h), (sx / 2 - 0.1, -sy / 2 + 0.1, h))
            self.stairs(1.6, h, (stairs_side * (sx / 2), 0, 0), stairs_side * math.pi / 2)
    def pad(self, size=46.0, loc=(0, 0, 0), h=0.6, number='1'):
        """Landefeld aus Beton mit Warnrand, Kreis, Kreuz, Ecklichtern und Gebrauchsspuren."""
        with self.at(loc):
            self.slab(size, size, h, tint='concrete')
            n = 32; r = size * 0.26
            with self.overlay():
                self.ring(size - 1.2, size - 1.2, h - 0.04, 0.9, 0.08, 'hazard', 'none', 0.01)
                for i in range(n):
                    a0, a1 = (i + 0.12) / n * TAU, (i + 0.88) / n * TAU
                    self.beam((math.cos(a0) * r, math.sin(a0) * r, h + 0.012), (math.cos(a1) * r, math.sin(a1) * r, h + 0.012), 0.5, 0.03, 'plain', 'white', 0.0)
                self.box((size * 0.2, 0.7, 0.03), (0, 0, h), side='plain', tint='white', bevel=0, bottom=True); self.box((0.7, size * 0.2, 0.03), (0, 0, h), side='plain', tint='white', bevel=0, bottom=True)
            self.number(number, (0, -size * 0.36, h + 0.01), X, Y, 4.0, 'white', 0.02); self.decal('w_landezone', (0, size * 0.36, h + 0.01), X, Y, 12.0, off=0.02)
            self.decal('soot', (size * 0.05, size * 0.04, h + 0.01), X, Y, size * 0.4, size * 0.4, off=0.03); self.decal('tyre', (-size * 0.25, -size * 0.1, h + 0.01), X, Y, 6, 12, off=0.03)
            self.decal('stain1', (size * 0.22, -size * 0.2, h + 0.01), X, Y, 6, 6, off=0.03); self.decal('stain2', (-size * 0.18, size * 0.2, h + 0.01), X, Y, 8, 8, off=0.03)
            for sx in (-1, 0, 1):
                for sy in (-1, 0, 1):
                    if not (sx or sy): continue
                    p = (sx * (size / 2 - 0.5), sy * (size / 2 - 0.5), h)
                    self.box((0.7, 0.7, 0.3), p, side='plain', tint='black', bevel=0.05, bottom=True); self.glowbox('lamp', (0.4, 0.4, 0.1), (p[0], p[1], h + 0.34)); self.light('lamp', (p[0], p[1], h + 0.5), 3.5)
    def post(self, loc=(0, 0, 0), h=2.6, kind='lamp'):
        with self.at(loc):
            self.tube((0, 0, 0), (0, 0, h), 0.08, 'plain', 'hull_dark', 6); self.box((0.34, 0.26, 0.6), (0, -0.16, 1.0), side='plain', tint='hull_mid', bevel=0.03, bottom=True)
            self.glowbox(kind, (0.22, 0.22, 0.22), (0, 0, h + 0.1)); self.light(kind, (0, 0, h + 0.1), 2.2)
    def beacon(self, loc=(0, 0, 0)):
        with self.at(loc):
            self.tube((0, 0, 0), (0, 0, 0.7), 3.2, 'girder', 'hull_mid', 24, mode='around', r2=1.3); self.tube((0, 0, 0.7), (0, 0, 1.6), 0.5, 'pipe', 'hull_dark', 10)
            self.glowbox('lamp', (0.3, 0.3, 0.3), (0, 0, 1.8)); self.light('lamp', (0, 0, 1.8), 3.0)
    def barrier(self, length=4.0, loc=(0, 0, 0), rz=0.0):
        with self.at(loc, rz):
            self.prism([(-0.4, 0), (0.4, 0), (0.14, 1.0), (-0.14, 1.0)], -length / 2, length / 2, side='plain', top='hazard', tint='hull_light', tint_top='none', cap_strip='plain')
    def signpost(self, name, loc=(0, 0, 0), rz=0.0, w=2.0, h=1.0, z=1.6):
        with self.at(loc, rz):
            for s in (-1, 1): self.tube((s * w * 0.4, 0, 0), (s * w * 0.4, 0, z + h), 0.05, 'plain', 'hull_dark', 6)
            self.box((w, 0.08, h), (0, -0.06, z), side='plain', tint='hull_dark', bevel=0.02, bottom=True); self.decal(name, (0, -0.1, z + h / 2), X, Z, w * 0.94, h * 0.94, off=0.012)

    # ------------------------------------------------------------ Abschluss
    def build(self, coll='Kit'):
        """Macht aus allem ein Objekt: Punkte verschmelzen, harte Kanten ab 60°, Normalen nach Flächengröße gewichtet."""
        bm = self.bm
        self.lm_size = self._pack(getattr(self, 'lm_px', 2048)) if self.charts else 0      # lm_px: Kantenlänge der Lichtkarte (Städte: nach Bedarf größer)
        if self.lm and not self.charts:          # Teil ohne eigene Felder in einem Raum mit Lichtkarte: alles zeigt auf das Festfeld
            self.lm_size = 2048
            for f in bm.faces:
                for l in f.loops: l[self.uv1].uv = (8 / 2048, 8 / 2048)
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
        for e in bm.edges:
            e.smooth = len(e.link_faces) == 2 and e.calc_face_angle(0.0) < math.radians(60)
        me = bpy.data.meshes.new(self.name); bm.to_mesh(me); bm.free()
        for m in self.mats: me.materials.append(kit_material(m))
        import numpy as np
        tint = me.color_attributes['Tint']; a = np.empty(len(tint.data) * 4, np.float32); tint.data.foreach_get('color', a)
        col = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER'); col.data.foreach_set('color', a)
        me.color_attributes.active_color = col; me.color_attributes.render_color_index = list(me.color_attributes).index(col)
        c = bpy.data.collections.get(coll)
        if not c: c = bpy.data.collections.new(coll); bpy.context.scene.collection.children.link(c)
        ob = bpy.data.objects.new(self.name, me); c.objects.link(ob)
        mod = ob.modifiers.new('Normalen', 'WEIGHTED_NORMAL'); mod.keep_sharp = True; mod.weight = 60
        ob['kit_lights'] = json.dumps(self.lights); ob['kit_blocks'] = json.dumps(self.blocks); ob['kit_lm'] = self.lm_size
        if self.lamps:
            lc = bpy.data.collections.get(coll + '_Licht')
            if not lc: lc = bpy.data.collections.new(coll + '_Licht'); bpy.context.scene.collection.children.link(lc)
            for o in list(lc.objects): bpy.data.objects.remove(o, do_unlink=True)
            for i, (pos, colr, power, radius) in enumerate(self.lamps):
                ld = bpy.data.lights.new(self.name + '_L%d' % i, 'POINT'); ld.color = colr; ld.energy = power; ld.shadow_soft_size = radius
                lo = bpy.data.objects.new(ld.name, ld); lo.location = pos; lc.objects.link(lo)
        return ob
    def _pack(self, size=2048, pad=3, dmax=26.0):
        """Verteilt die Felder der Lichtkarte (Regalverfahren) und schreibt den zweiten Satz Texturkoordinaten. Feld 0 (oben links, 16 px) bleibt weiß:
        Dorthin zeigen alle Flächen ohne eigenes Feld; ihr Licht steckt in den Eckfarben."""
        order = sorted(range(len(self.charts)), key=lambda i: -self.charts[i][1])
        def place(d):
            x, y, rowh, out = 24, 0, 24, {}
            for i in order:
                w = min(size - 2 * pad, max(4, math.ceil(self.charts[i][0] * d))); h = min(size - 2 * pad, max(4, math.ceil(self.charts[i][1] * d)))
                if x + w + 2 * pad > size: x = 0; y += rowh; rowh = 0
                if y + h + 2 * pad > size: return None
                out[i] = (x + pad, y + pad, w, h); x += w + 2 * pad; rowh = max(rowh, h + 2 * pad)
            return out
        lo, hi, best = 1.0, dmax, None
        if place(hi): best = place(hi)
        else:
            for _ in range(18):
                mid = (lo + hi) / 2; r = place(mid)
                if r: best = r; lo = mid
                else: hi = mid
        if best is None: raise RuntimeError('Lichtkarte: zu viele Flächen')
        self.lm_density = lo if not place(dmax) else dmax
        for f in self.bm.faces:
            c = f[self.chl]
            if c:
                x, y, w, h = best[c - 1]
                for l in f.loops: s_, t_ = l[self.uv1].uv; l[self.uv1].uv = ((x + s_ * w) / size, (y + t_ * h) / size)
            else:
                for l in f.loops: l[self.uv1].uv = (8 / size, 8 / size)
        return size


# ---------------------------------------------------------------- Materialien (Vorschau in Blender; das Spiel setzt eigene ein)
def _img(name, data=False):
    p = os.path.join(TEX, name); key = os.path.basename(p)
    img = bpy.data.images.get(key) or bpy.data.images.load(p)
    if data: img.colorspace_settings.name = 'Non-Color'
    return img
def kit_material(name):
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; P = nt.nodes['Principled BSDF']; L = nt.links.new
    if name == 'kit_tower':
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = _img('kit_tower_col@2048.png'); te = nt.nodes.new('ShaderNodeTexImage'); te.image = _img('kit_tower_emi@2048.png')
        L(tc.outputs['Color'], P.inputs['Base Color']); L(te.outputs['Color'], P.inputs['Emission Color']); P.inputs['Emission Strength'].default_value = 2.0; P.inputs['Roughness'].default_value = 0.5
        return m
    if name in ('kit_hha', 'kit_hhb', 'kit_hhc', 'kit_sta', 'kit_stb', 'kit_stc'):      # Hochhausfassaden und Straßenbeläge (scripts/make-kit-hh.mjs, make-kit-str.mjs): Farbe × Tönung, Relief, Rauheit/Metall, Leuchten
        D = os.path.join(HERE, '..', 'stadt', 'tex'); I = lambda suf, data=False: _img(os.path.join(D, name + '_' + suf + '@2048.png'), data)
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = I('col'); te = nt.nodes.new('ShaderNodeTexImage'); te.image = I('emi')
        va = nt.nodes.new('ShaderNodeVertexColor'); va.layer_name = 'Col'; mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1.0
        L(tc.outputs['Color'], mix.inputs[6]); L(va.outputs['Color'], mix.inputs[7]); L(mix.outputs[2], P.inputs['Base Color'])
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = I('nrm', True); nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 1.0; L(tn.outputs['Color'], nm.inputs['Color']); L(nm.outputs['Normal'], P.inputs['Normal'])
        to = nt.nodes.new('ShaderNodeTexImage'); to.image = I('orm', True); sp = nt.nodes.new('ShaderNodeSeparateColor'); L(to.outputs['Color'], sp.inputs[0]); L(sp.outputs[1], P.inputs['Roughness']); L(sp.outputs[2], P.inputs['Metallic'])
        L(te.outputs['Color'], P.inputs['Emission Color']); P.inputs['Emission Strength'].default_value = 2.0
        return m
    if name in ('kit_neon2', 'kit_holo'):
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = _img('kit_city2@2048.png')
        L(tc.outputs['Color'], P.inputs['Base Color']); L(tc.outputs['Color'], P.inputs['Emission Color']); P.inputs['Emission Strength'].default_value = 4.0
        if name == 'kit_holo': L(tc.outputs['Color'], P.inputs['Alpha'])
        return m
    if name == 'kit_wet':
        name = 'kit_concrete'; m.name = 'kit_wet'
    if name == 'kit_neon':
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = _img('kit_city@2048.png')
        L(tc.outputs['Color'], P.inputs['Base Color']); L(tc.outputs['Color'], P.inputs['Emission Color']); P.inputs['Emission Strength'].default_value = 4.0
        return m
    if name in ('kit_sign', 'kit_poster'):
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = _img('kit_signs@2048.png')
        if name == 'kit_sign':
            mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.blend_type = 'MULTIPLY'; mx.inputs[0].default_value = 1.0; mx.inputs[7].default_value = (*GLOW['kit_accent'], 1)
            L(tc.outputs['Color'], mx.inputs[6]); src = mx.outputs[2]
        else: src = tc.outputs['Color']
        L(src, P.inputs['Base Color']); L(src, P.inputs['Emission Color']); P.inputs['Emission Strength'].default_value = 5.0 if name == 'kit_sign' else 2.5
        return m
    if name in GLOW:
        c = GLOW[name]; P.inputs['Base Color'].default_value = (*c, 1); P.inputs['Emission Color'].default_value = (*c, 1); P.inputs['Emission Strength'].default_value = 8.0
        return m
    if name == 'kit_glass':
        P.inputs['Base Color'].default_value = (0.012, 0.025, 0.04, 1); P.inputs['Roughness'].default_value = 0.08; P.inputs['Metallic'].default_value = 0.6
        return m
    va = nt.nodes.new('ShaderNodeVertexColor'); va.layer_name = 'Col'
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1.0
    L(va.outputs['Color'], mix.inputs[7]); L(mix.outputs[2], P.inputs['Base Color'])
    if name in ('kit_trim', 'kit_int'):
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = _img(name + '_col@2048.png'); L(tc.outputs['Color'], mix.inputs[6])
        tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = _img(name + '_nrm@2048.png', True); nm = nt.nodes.new('ShaderNodeNormalMap'); L(tn.outputs['Color'], nm.inputs['Color']); L(nm.outputs['Normal'], P.inputs['Normal'])
        to = nt.nodes.new('ShaderNodeTexImage'); to.image = _img(name + '_orm@2048.png', True); sp = nt.nodes.new('ShaderNodeSeparateColor'); L(to.outputs['Color'], sp.inputs[0])
        L(sp.outputs[1], P.inputs['Roughness']); L(sp.outputs[2], P.inputs['Metallic'])
    elif name == 'kit_decal':
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = _img('kit_decals@2048.png'); L(tc.outputs['Color'], mix.inputs[6]); L(tc.outputs['Alpha'], P.inputs['Alpha'])
        P.inputs['Roughness'].default_value = 0.6
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
    elif name == 'kit_concrete':
        tc = nt.nodes.new('ShaderNodeTexImage'); tc.image = _img('hangar_floor.png'); L(tc.outputs['Color'], mix.inputs[6]); P.inputs['Roughness'].default_value = 0.9
    return m

def _bake(ob):
    sc = bpy.context.scene; bpy.context.view_layer.update()
    for q in sc.objects: q.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    with bpy.context.temp_override(window=win, area=area, region=region, object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob]):
        bpy.ops.object.bake(type='AO')

def bake_ao(ob, dist=5.0, samples=24, strength=0.75, ground=True):
    """Rechnet die Verdeckung je Ecke (Cycles) und mischt sie in die Tönung: Col = Tint × (1 - strength × (1 - AO)).
    Zwei Durchgänge: einmal alles (gilt für aufgesetzte Flächen), einmal ohne aufgesetzte Flächen (gilt für den Rest),
    damit Aufkleber, Kacheln und Bodenmarkierungen die Fläche darunter nicht verdunkeln."""
    import numpy as np
    sc = bpy.context.scene; me = ob.data; nl = len(me.loops)
    if not me.color_attributes.get('AO'): me.color_attributes.new('AO', 'FLOAT_COLOR', 'CORNER')
    if not me.attributes.get('lid'): me.attributes.new('lid', 'INT', 'CORNER')
    me.attributes['lid'].data.foreach_set('value', np.arange(nl, dtype=np.int32))
    me.color_attributes.active_color = me.color_attributes['AO']
    g = None
    if ground:
        gm = bpy.data.meshes.new('ao_boden'); gb = bmesh.new(); bmesh.ops.create_grid(gb, x_segments=1, y_segments=1, size=600); gb.to_mesh(gm); gb.free()
        g = bpy.data.objects.new('ao_boden', gm); g.location = (0, 0, -0.3); sc.collection.objects.link(g)      # etwas tiefer: Fußpunkte stecken leicht im Boden
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.render.bake.target = 'VERTEX_COLORS'
    if not sc.world: sc.world = bpy.data.worlds.new('Welt')
    sc.world.light_settings.distance = dist
    _bake(ob)
    a = np.empty(nl * 4, np.float32); me.color_attributes['AO'].data.foreach_get('color', a); a = a.reshape(nl, 4)
    tmp = ob.copy(); tmp.data = me.copy(); sc.collection.objects.link(tmp); tmp.modifiers.clear()
    bm = bmesh.new(); bm.from_mesh(tmp.data); L = bm.faces.layers.int.get('overlay')
    if L: bmesh.ops.delete(bm, geom=[f for f in bm.faces if f[L]], context='FACES')
    bm.to_mesh(tmp.data); bm.free()
    m2 = tmp.data; m2.color_attributes.active_color = m2.color_attributes['AO']
    ob.hide_render = True; _bake(tmp); ob.hide_render = False
    n2 = len(m2.loops); b = np.empty(n2 * 4, np.float32); m2.color_attributes['AO'].data.foreach_get('color', b); b = b.reshape(n2, 4)
    ids = np.empty(n2, np.int32); m2.attributes['lid'].data.foreach_get('value', ids); a[ids] = b
    bpy.data.objects.remove(tmp, do_unlink=True)
    if g: bpy.data.objects.remove(g, do_unlink=True)
    # Aufkleber sind durchsichtig und bekommen von Cycles keine Verdeckung: Wert der nächstgelegenen festen Ecken übernehmen
    from mathutils import kdtree
    di = {i for i, m in enumerate(me.materials) if m and m.name == 'kit_decal'}
    if di:
        lv = np.empty(nl, np.int32); me.loops.foreach_get('vertex_index', lv)
        st = np.zeros(nl, bool); st[ids] = True
        vsum = np.zeros(len(me.vertices)); vcnt = np.zeros(len(me.vertices)); np.add.at(vsum, lv[st], a[st, 0]); np.add.at(vcnt, lv[st], 1)
        vi = np.nonzero(vcnt)[0]; va = vsum[vi] / vcnt[vi]; kd = kdtree.KDTree(len(vi))
        for k, i in enumerate(vi): kd.insert(me.vertices[i].co, k)
        kd.balance()
        for p in me.polygons:
            if p.material_index in di:
                for li in p.loop_indices:
                    hits = kd.find_n(me.vertices[lv[li]].co, 4); w = [1.0 / (h[2] + 0.05) for h in hits]
                    a[li, :3] = sum(va[h[1]] * ww for h, ww in zip(hits, w)) / sum(w)
    me.color_attributes['AO'].data.foreach_set('color', a.ravel())
    t = np.empty(nl * 4, np.float32); me.color_attributes['Tint'].data.foreach_get('color', t); t = t.reshape(nl, 4)
    t[:, :3] *= 1 - strength * (1 - (0.35 + 0.65 * np.clip(a[:, :1], 0, 1)))     # nie ganz schwarz: Ecken, die in anderen Teilen stecken, würden sonst lange Schatten ziehen
    col = me.color_attributes['Col']; col.data.foreach_set('color', t.ravel())
    me.color_attributes.active_color = col; me.color_attributes.render_color_index = list(me.color_attributes).index(col)
    sc.render.bake.target = 'IMAGE_TEXTURES'
    return {'ao_mean': float(a[:, 0].mean()), 'zeros': float((a[:, 0] < 0.02).mean())}

def bake_vertex_light(ob, ref, samples=48):
    """Licht eines Zusatzteils (ohne eigene Felder in der Lichtkarte) in die Eckfarben rechnen; ref = Bezugshelligkeit des Raums (aus bake_light)."""
    import numpy as np
    sc = bpy.context.scene; me = ob.data; nl = len(me.loops); set_emission()
    if not me.color_attributes.get('Lv'): me.color_attributes.new('Lv', 'FLOAT_COLOR', 'CORNER')
    me.color_attributes.active_color = me.color_attributes['Lv']
    w = sc.world; bg = w.node_tree.nodes['Background'] if w and w.use_nodes else None; old = bg.inputs['Strength'].default_value if bg else None
    if bg: bg.inputs['Strength'].default_value = 0.0
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.render.bake.target = 'VERTEX_COLORS'
    bpy.context.view_layer.update()
    for q in sc.objects: q.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    with bpy.context.temp_override(window=win, area=area, region=region, object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob]):
        bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, use_clear=True)
    sc.render.bake.target = 'IMAGE_TEXTURES'
    if bg: bg.inputs['Strength'].default_value = old
    lv = np.empty(nl * 4, np.float32); me.color_attributes['Lv'].data.foreach_get('color', lv); x = lv.reshape(nl, 4)[:, :3] / ref
    t = np.empty(nl * 4, np.float32); me.color_attributes['Tint'].data.foreach_get('color', t); t = t.reshape(nl, 4); t[:, :3] *= np.clip(x / 4.0, 0.0, 1.0)
    col = me.color_attributes['Col']; col.data.foreach_set('color', t.ravel())
    me.color_attributes.active_color = col; me.color_attributes.render_color_index = list(me.color_attributes).index(col)
    return float(x.mean())

def export(ob, name, meta=None, kind='station', extra=()):
    """Schreibt asset-src/glb/<kind>/<name>.glb (ohne Bilder, mit Texturkoordinaten und Eckfarben) und asset-src/data/kit_<name>.json (Lichter, Zusatzangaben)."""
    sc = bpy.context.scene
    for q in sc.objects: q.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    for q in extra: q.select_set(True)                       # weitere Objekte in dieselbe Datei (eigene Knoten mit Namen, im Spiel einzeln schaltbar)
    path = os.path.join(ROOT, 'asset-src', 'glb', kind, name + '.glb')
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    with bpy.context.temp_override(window=win, area=area, region=region, object=ob, active_object=ob, selected_objects=[ob, *extra]):
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_apply=True, export_yup=True, export_texcoords=True, export_normals=True,
                                  export_image_format='NONE', export_vertex_color='NAME', export_vertex_color_name='Col', export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True)
    d = dict(meta or {}); d['lights'] = json.loads(ob.get('kit_lights', '[]')); d['blocks'] = json.loads(ob.get('kit_blocks', '[]'))
    json.dump(d, open(os.path.join(ROOT, 'asset-src', 'data', 'kit_' + name + '.json'), 'w'))
    return {'glb_kb': round(os.path.getsize(path) / 1024), 'verts': len(ob.data.vertices), 'faces': len(ob.data.polygons), 'lights': len(d['lights'])}

# Leuchtstärken der selbstleuchtenden Materialien für die Lichtberechnung (Blender)
EMIT = {'kit_shopw': 7.0, 'kit_shopc': 7.0, 'kit_hha': 0.8, 'kit_hhb': 0.8, 'kit_hhc': 0.8, 'kit_stb': 1.0, 'kit_neon': 3.0, 'kit_neon2': 3.0, 'kit_holo': 2.0, 'kit_tower': 1.5, 'kit_light': 10.0, 'kit_cool': 5.0, 'kit_accent': 6.0, 'kit_screen': 4.0, 'kit_lamp': 6.0, 'kit_redlamp': 4.0, 'kit_green': 2.0, 'kit_sign': 4.0, 'kit_poster': 2.2}
def set_emission(scale=1.0):
    for n, v in EMIT.items():
        m = bpy.data.materials.get(n)
        if m and m.use_nodes and m.node_tree.nodes.get('Principled BSDF'): m.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = v * scale

def bake_city_light(ob, name, samples=96, bounces=3, ref=None, blur=2):
    """Lichtkarte einer Stadt: nur das Licht der leuchtenden Flächen (Schilder, Schaufenster, Lampions, Lichtbänder) auf den Flächen mit eigenem Feld
    (Gassenböden, Sockelwände; beim Bauen K.lm = True setzen). Sonne und Himmel bleiben aus, die kommen im Spiel in Echtzeit dazu.
    Die Eckfarben (Tönung × Verdeckung aus bake_ao) bleiben unberührt. Bild: asset-src/tex-world/kit_lm_<name>@<Größe>.png (Hintergrund-Paket),
    Kodierung wie bake_light (v = x / (1 + x), sRGB). Das Festfeld ist schwarz: Flächen ohne eigenes Feld bekommen kein vorberechnetes Licht."""
    import numpy as np
    sc = bpy.context.scene; me = ob.data; size = int(ob.get('kit_lm', 0)) or 2048
    set_emission()
    img = bpy.data.images.get('kit_lm_' + name)
    if img and img.size[0] != size: bpy.data.images.remove(img); img = None
    img = img or bpy.data.images.new('kit_lm_' + name, size, size, alpha=False, float_buffer=True)
    for m in me.materials:
        nt = m.node_tree; n = nt.nodes.get('BakeZiel') or nt.nodes.new('ShaderNodeTexImage'); n.name = 'BakeZiel'; n.image = img
        for x in nt.nodes: x.select = False
        n.select = True; nt.nodes.active = n
    me.uv_layers.active = me.uv_layers['Lightmap']
    hidden = [o for o in sc.objects if o is not ob and o.type in ('MESH', 'LIGHT') and not o.hide_render]
    for o in hidden: o.hide_render = True
    w = sc.world; bg = w.node_tree.nodes['Background'] if w and w.use_nodes else None; old = bg.inputs['Strength'].default_value if bg else None
    if bg: bg.inputs['Strength'].default_value = 0.0
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.max_bounces = bounces; sc.cycles.diffuse_bounces = bounces
    sc.render.bake.target = 'IMAGE_TEXTURES'; sc.render.bake.margin = 4; bpy.context.view_layer.update()
    for q in sc.objects: q.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    ctx = dict(window=win, area=area, region=region, object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob])
    with bpy.context.temp_override(**ctx): bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, use_clear=True, margin=4)
    for o in hidden: o.hide_render = False
    if bg: bg.inputs['Strength'].default_value = old
    me.uv_layers.active = me.uv_layers['UVMap']
    a = np.empty(size * size * 4, np.float32); img.pixels.foreach_get(a); a = a.reshape(size, size, 4)[..., :3].copy()
    a = np.nan_to_num(a, nan=0.0, posinf=0.0, neginf=0.0); a[:24, :24] = 0.0
    hi = float(np.percentile(a, 99.9)) if a.max() > 0 else 1.0; a = np.minimum(a, hi * 3.0)      # einzelne Ausreißer (Rauschen) kappen
    mask = a.mean(axis=2) > 1e-6
    for _ in range(blur):
        k = a.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)): k += np.roll(a, (dy, dx), axis=(0, 1))
        a = k / 5.0
    med = float(np.median(a.mean(axis=2)[mask])) if mask.any() else 0.1
    ref = ref or 2.2 * med
    v = (a / ref) / (1.0 + a / ref); v[:24, :24] = 0.0
    srgb = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(np.clip(v, 1e-8, 1), 1 / 2.4) - 0.055)
    out = bpy.data.images.get('kit_lm8_' + name)
    if out and out.size[0] != size: bpy.data.images.remove(out); out = None
    out = out or bpy.data.images.new('kit_lm8_' + name, size, size, alpha=False)
    buf = np.ones((size, size, 4), np.float32); buf[..., :3] = srgb; out.pixels.foreach_set(buf.ravel()); out.update()
    d = os.path.join(ROOT, 'asset-src', 'tex-world'); os.makedirs(d, exist_ok=True)
    path = os.path.join(d, 'kit_lm_%s@%d.png' % (name, size)); out.filepath_raw = path; out.file_format = 'PNG'; out.save()
    col = me.color_attributes.get('Col')
    if col: me.color_attributes.active_color = col
    return {'size': size, 'ref': round(ref, 4), 'median': round(med, 4), 'lit': round(float(mask.mean()), 3), 'max': round(float(a.max()), 3)}

def bake_light(ob, name, samples=64, bounces=4, ref=None, blur=1):
    """Rechnet das Licht eines Innenraums vor (Cycles, alle leuchtenden Flächen und Lampen der Szene sind Lichtquellen):
    - große Flächen: Bild asset-src/tex/<name>_lightmap@2048.png über den zweiten Satz Texturkoordinaten,
    - alles Übrige: in die Eckfarben (Col = Tönung × Licht).
    Kodierung: v = x / (1 + x) mit x = L / ref (ref: 2,2 × mittlere Helligkeit, wenn nicht vorgegeben), als sRGB gespeichert. Das Spiel rechnet
    zurück (x = v / (1 - v)), damit helle Lichtinseln und dunkle Ecken ihren echten Abstand behalten. Eckfarben: Tönung × min(1, x / 4)."""
    import numpy as np
    sc = bpy.context.scene; me = ob.data; nl = len(me.loops); size = int(ob.get('kit_lm', 0)) or 2048
    set_emission()
    img = bpy.data.images.get('kit_lm_' + name)
    if img and img.size[0] != size: bpy.data.images.remove(img); img = None
    img = img or bpy.data.images.new('kit_lm_' + name, size, size, alpha=False, float_buffer=True)
    for m in me.materials:
        nt = m.node_tree; n = nt.nodes.get('BakeZiel') or nt.nodes.new('ShaderNodeTexImage'); n.name = 'BakeZiel'; n.image = img
        for x in nt.nodes: x.select = False
        n.select = True; nt.nodes.active = n
    me.uv_layers.active = me.uv_layers['Lightmap']
    hidden = [o for o in sc.objects if o.name in ('Boden', 'Sonne', 'ao_boden') and not o.hide_render]
    for o in hidden: o.hide_render = True
    w = sc.world; bg = w.node_tree.nodes['Background'] if w and w.use_nodes else None; old = bg.inputs['Strength'].default_value if bg else None
    if bg: bg.inputs['Strength'].default_value = 0.0
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = samples; sc.cycles.max_bounces = bounces; sc.cycles.diffuse_bounces = bounces
    sc.render.bake.target = 'IMAGE_TEXTURES'; sc.render.bake.margin = 4
    sc = bpy.context.scene; bpy.context.view_layer.update()
    for q in sc.objects: q.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    ctx = dict(window=win, area=area, region=region, object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob])
    with bpy.context.temp_override(**ctx): bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, use_clear=True, margin=4)
    if not me.color_attributes.get('Lv'): me.color_attributes.new('Lv', 'FLOAT_COLOR', 'CORNER')
    me.color_attributes.active_color = me.color_attributes['Lv']; sc.render.bake.target = 'VERTEX_COLORS'
    with bpy.context.temp_override(**ctx): bpy.ops.object.bake(type='DIFFUSE', pass_filter={'DIRECT', 'INDIRECT'}, use_clear=True)
    sc.render.bake.target = 'IMAGE_TEXTURES'
    for o in hidden: o.hide_render = False
    if bg: bg.inputs['Strength'].default_value = old
    me.uv_layers.active = me.uv_layers['UVMap']
    # ---- Bild
    a = np.empty(size * size * 4, np.float32); img.pixels.foreach_get(a); a = a.reshape(size, size, 4)[..., :3].copy()
    mask = a.mean(axis=2) > 1e-6
    for _ in range(blur):
        k = a.copy()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)): k += np.roll(a, (dy, dx), axis=(0, 1))
        a = k / 5.0
    known = mask.copy()
    for _ in range(6):
        acc = np.zeros_like(a); cnt = np.zeros(known.shape, np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            acc += np.roll(a * known[..., None], (dy, dx), axis=(0, 1)); cnt += np.roll(known, (dy, dx), axis=(0, 1)).astype(np.float32)
        new = (~known) & (cnt > 0); a[new] = acc[new] / cnt[new][:, None]; known |= new
    med = float(np.median(a.mean(axis=2)[mask])) if mask.any() else 0.1
    ref = ref or 2.2 * med
    v = (a / ref) / (1.0 + a / ref)
    v[:24, :24] = 0.8                           # Festfeld (unten links): entspricht x = 4; dorthin zeigen alle Flächen ohne eigenes Feld
    srgb = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(np.clip(v, 1e-8, 1), 1 / 2.4) - 0.055)
    out = bpy.data.images.get('kit_lm8_' + name)
    if out and out.size[0] != size: bpy.data.images.remove(out); out = None
    out = out or bpy.data.images.new('kit_lm8_' + name, size, size, alpha=False)
    buf = np.ones((size, size, 4), np.float32); buf[..., :3] = srgb; out.pixels.foreach_set(buf.ravel()); out.update()
    path = os.path.join(TEX, name + '_lightmap@2048.png'); out.filepath_raw = path; out.file_format = 'PNG'; out.save()
    # ---- Eckfarben: Flächen ohne Feld bekommen Tönung × Licht, Aufkleber das Licht der nächsten festen Ecken
    lv = np.empty(nl * 4, np.float32); me.color_attributes['Lv'].data.foreach_get('color', lv); lv = lv.reshape(nl, 4)[:, :3]
    x = lv / ref; vv = x / (1.0 + x)
    t = np.empty(nl * 4, np.float32); me.color_attributes['Tint'].data.foreach_get('color', t); t = t.reshape(nl, 4)
    chart = np.zeros(len(me.polygons), np.int32); me.attributes['chart'].data.foreach_get('value', chart)
    ls = np.empty(len(me.polygons), np.int32); lt = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('loop_start', ls); me.polygons.foreach_get('loop_total', lt)
    mi = np.empty(len(me.polygons), np.int32); me.polygons.foreach_get('material_index', mi)
    loop_chart = np.repeat(chart, lt); loop_mat = np.repeat(mi, lt)
    di = [i for i, m in enumerate(me.materials) if m and m.name == 'kit_decal']
    if di:
        from mathutils import kdtree
        lvert = np.empty(nl, np.int32); me.loops.foreach_get('vertex_index', lvert)
        solid = ~np.isin(loop_mat, di) & (vv.mean(axis=1) > 0)
        vsum = np.zeros((len(me.vertices), 3)); vcnt = np.zeros(len(me.vertices)); np.add.at(vsum, lvert[solid], vv[solid]); np.add.at(vcnt, lvert[solid], 1)
        vi = np.nonzero(vcnt)[0]; va = vsum[vi] / vcnt[vi][:, None]; kd = kdtree.KDTree(len(vi))
        for k, i in enumerate(vi): kd.insert(me.vertices[i].co, k)
        kd.balance()
        for li in np.nonzero(np.isin(loop_mat, di))[0]:
            hits = kd.find_n(me.vertices[lvert[li]].co, 4); wts = [1.0 / (h[2] + 0.05) for h in hits]
            vv[li] = sum(va[h[1]] * ww for h, ww in zip(hits, wts)) / sum(wts); x[li] = vv[li] / np.maximum(1 - vv[li], 0.02)
    free = loop_chart == 0
    t[free, :3] *= np.clip(x[free] / 4.0, 0.0, 1.0)      # linear bis zur vierfachen Bezugshelligkeit; das Festfeld der Lichtkarte liefert den Faktor 4
    col = me.color_attributes['Col']; col.data.foreach_set('color', t.ravel())
    me.color_attributes.active_color = col; me.color_attributes.render_color_index = list(me.color_attributes).index(col)
    img.pack()
    return {'ref': round(ref, 4), 'median': round(med, 4), 'covered': round(float(mask.mean()), 3), 'kb': round(os.path.getsize(path) / 1024), 'free_mean': round(float(vv[free].mean()), 3)}
