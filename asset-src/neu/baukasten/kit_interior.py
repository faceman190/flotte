# Innenraum-Teile des Baukastens (Stationen): Wände, Böden, Decken, Rippen, Lichtleisten, Schilder, Läden, Möbel, Pflanzen.
# install(lib) hängt die Teile als Methoden an lib.Kit. Vorderseite eines Teils zeigt nach -Y, Ursprung = Mitte der Grundfläche (bzw. an der Wand).
# Innenräume werden mit Lichtkarte gebaut:  K = lib.Kit('Name'); K.lm = True; ...; ob = K.build(); lib.bake_light(ob, 'name'); lib.export(...)
import math

def install(lib):
    K = lib.Kit; X, Y, Z = lib.X, lib.Y, lib.Z; Vector, Matrix, TAU, V = lib.Vector, lib.Matrix, lib.TAU, lib.V

    # ------------------------------------------------------------ Raumflächen
    def wall(self, a, b, h, z0=0.0, strip='iwalls', tint='i_wall', seg=3.0):
        """Wandfläche von a nach b (x, y) mit Höhe h; sichtbar von der rechten Seite der Laufrichtung a → b."""
        a = Vector((a[0], a[1], z0)); b = Vector((b[0], b[1], z0)); self.surf(a, b, a + Z * h, strip, tint, seg)
    def floor(self, x0, y0, x1, y1, z=0.0, strip='ifloors', tint='i_floor', along='y'):
        if along == 'y': self.surf((x1, y0, z), (x1, y1, z), (x0, y0, z), strip, tint, 4.0)
        else: self.surf((x0, y0, z), (x1, y0, z), (x0, y1, z), strip, tint, 4.0)
    def ceiling(self, x0, y0, x1, y1, z, strip='iceils', tint='i_ceil'):
        self.surf((x0, y1, z), (x1, y1, z), (x0, y0, z), strip, tint, 4.0)
    def portal(self, w, h, loc=(0, 0, 0), depth=0.9, leg=1.0, haunch=2.4, beam=0.8, tint='i_rib', led='accent', accent='i_red'):
        """Tragrahmen quer durch den Raum: zwei Stützen, Deckenbalken, schräge Vouten; Lichtfugen an den Stützen."""
        with self.at(loc):
            for s in (-1, 1):
                x = s * (w / 2 - leg / 2)
                self.box((leg, depth, h - beam), (x, 0, 0), side='rib', tint=tint, bevel=0.06, along='z')
                xi = s * (w / 2 - leg); zt = h - beam
                prof = [(xi, zt - haunch), (xi, zt), (xi - s * haunch, zt)]
                if s < 0: prof.reverse()
                self.prism(prof, -depth * 0.36, depth * 0.36, side='rib', top='rib', tint=accent, cap_strip='iplain')
                self.box((leg + 0.06, depth + 0.06, 0.5), (x, 0, 2.4), side='iplain', tint=accent, bevel=0.03, bottom=True)
                self.box((0.5, depth + 0.16, 0.5), (x, 0, 0), side='itrim', tint='i_dark', bevel=0.04)
                if led:
                    for sy, u in ((-1, X), (1, -X)):
                        self.glow(led, (x - s * 0.18, sy * depth / 2, (h - beam) * 0.5 + 0.2), u, Z, 0.09, (h - beam) * 0.72, off=0.012)
            self.box((w, depth, beam), (0, 0, h - beam), side='rib', tint=tint, bevel=0.06, bottom=True)
    def light_bar(self, a, b, w=0.34, kind='light', tint='i_dark', hh=0.14):
        """Deckenleuchte von a nach b (Oberkante an der Decke): Gehäuse und leuchtende Unterseite."""
        a, b = V(a), V(b); d = (b - a); L = d.length; u = d.normalized(); v = u.cross(Z); m = (a + b) / 2
        self.beam(a - Z * hh / 2, b - Z * hh / 2, w, hh, 'itrim', tint, 0.02)
        self.glow(kind, m - Z * hh, u, v, L - 0.12, w - 0.12, off=0.006)
    def hanging_sign(self, name, w, loc, rz=0.0, top=8.0, tint='i_dark'):
        """Von der Decke abgehängtes Leuchtschild, beidseitig. loc = Mitte der Schildunterkante, top = Deckenhöhe."""
        d = lib.SIGNS[name]; h = w * d['h'] / d['w']
        with self.at(loc, rz):
            self.box((w + 0.36, 0.3, h + 0.36), (0, 0, -0.18), side='iplain', tint=tint, bevel=0.05, bottom=True)
            self.box((w + 0.7, 0.22, 0.16), (0, 0, h + 0.2), side='itrim', tint=tint, bevel=0.03, bottom=True)
            for s in (-1, 1): self.tube((s * w * 0.36, 0, h + 0.3), (s * w * 0.36, 0, top - loc[2]), 0.045, 'iplain', tint, 6, caps=False)
            self.sign(name, (0, -0.15, h / 2), X, Z, w, h); self.sign(name, (0, 0.15, h / 2), -X, Z, w, h)
            self.glow('accent', (0, -0.152, -0.11), X, Z, w * 0.5, 0.04); self.glow('accent', (0, 0.152, -0.11), -X, Z, w * 0.5, 0.04)
    def wall_sign(self, name, w, loc, rz=0.0, tint='i_dark'):
        """Leuchtschild an einer Wand (Ursprung: Mitte der Unterkante an der Wand, zeigt nach -Y)."""
        d = lib.SIGNS[name]; h = w * d['h'] / d['w']
        with self.at(loc, rz):
            self.box((w + 0.3, 0.16, h + 0.3), (0, -0.08, -0.15), side='iplain', tint=tint, bevel=0.04, bottom=True)
            self.sign(name, (0, -0.16, h / 2), X, Z, w, h)
    def ad_screen(self, name, w, loc, rz=0.0, tint='i_dark'):
        """Große Werbetafel an einer Wand mit Rahmen und Lichtfuge."""
        d = lib.SIGNS[name]; h = w * d['h'] / d['w']
        with self.at(loc, rz):
            self.box((w + 0.5, 0.28, h + 0.5), (0, -0.14, -0.25), side='itrim', tint=tint, bevel=0.06, bottom=True)
            self.sign(name, (0, -0.28, h / 2), X, Z, w, h)
            self.glow('accent', (0, -0.285, -0.17), X, Z, w * 0.8, 0.05)
            for s in (-1, 1): self.box((0.16, 0.4, h + 0.9), (s * (w / 2 + 0.36), -0.2, -0.45), side='rib', tint='i_rib', bevel=0.03, bottom=True, along='z')
    def floor_strip(self, a, b, w=0.1, kind='accent', z=0.004):
        """Leuchtstreifen im Boden von a nach b (x, y)."""
        a = Vector((a[0], a[1], z)); b = Vector((b[0], b[1], z)); u = (b - a).normalized(); self.glow(kind, (a + b) / 2, u, Z.cross(u), (b - a).length, w, off=0.0)
    def floor_line(self, a, b, w=0.2, tint='white', z=0.006):
        """Gemalte Bodenlinie von a nach b (x, y)."""
        a = Vector((a[0], a[1], z)); b = Vector((b[0], b[1], z)); u = (b - a).normalized(); v = Z.cross(u) * (w / 2)
        with self.overlay(): self.face(a - v, b - v, b + v, a + v, 'iplain', tint)
    def duct(self, a, b, r=0.3, tint='i_dark', hang=None):
        """Lüftungsrohr mit Schellen; hang = Deckenhöhe für Abhänger."""
        a, b = V(a), V(b); self.tube(a, b, r, 'pipe', tint, 12); d = (b - a); n = max(1, int(d.length / 3))
        for i in range(n + 1):
            p = a + d * ((i + 0.5) / (n + 1)); dn = d.normalized()
            self.tube(p - dn * 0.06, p + dn * 0.06, r * 1.12, 'iplain', 'steel', 12, caps=False)
            if hang: self.tube(p + Z * r, Vector((p.x, p.y, hang)), 0.03, 'iplain', 'steel', 5, caps=False)

    # ------------------------------------------------------------ Läden und Technik
    def shop_bay(self, loc=(0, 0, 0), rz=0.0, w=5.4, depth=3.6, h=3.4, tint='i_dark', shelf_tint='i_wall_light'):
        """Ladennische an einer Wand: Regalwand, Trennwände, Tresen, Vordach mit Blende für das Ladenschild, Licht.
        Ursprung: Mitte an der Wand, offen nach -Y. Merkt Händlerplatz, Ansprechpunkt und Schildplatz in self.slots."""
        with self.at(loc, rz):
            for i in range(3): self.tile('shelf', ((i - 1) * 1.72, -0.04, 1.95), X, Z, 1.66, 1.9, shelf_tint, off=0.0)
            self.box((w - 0.3, 0.1, 0.9), (0, -0.05, 0.0), side='itech', tint=tint, bevel=0.02)
            self.box((w - 0.3, 0.12, 0.5), (0, -0.06, 2.95), side='itrim', tint=tint, bevel=0.02, bottom=True)
            for s in (-1, 1):
                self.box((0.24, depth * 0.72, h), (s * w / 2, -depth * 0.36, 0), side='iwalls', tint=tint, bevel=0.04)
                self.glow('accent', (s * (w / 2 - 0.125), -depth * 0.72 + 0.1, h * 0.5), -Y * s, Z, 0.07, h * 0.7, off=0.004)
            self.box((w - 0.9, 1.0, 1.06), (0, -3.0, 0), side='itech', top='iplain', tint=tint, bevel=0.04)
            self.box((w - 0.8, 1.14, 0.07), (0, -3.0, 1.06), side='iplain', tint='i_wall_light', bevel=0.02, bottom=True)
            self.glow('accent', (0, -3.505, 0.16), X, Z, w - 1.2, 0.05, off=0.004)
            self.box((0.5, 0.3, 0.36), (-(w / 2 - 1.2), -2.85, 1.13), side='iplain', tint='i_dark', bevel=0.03, bottom=True, rz=0.25)
            with self.at((-(w / 2 - 1.2), -2.85, 1.13), 0.25): self.glow('screen', (0, -0.152, 0.2), X, Z, 0.4, 0.24, off=0.002)
            for i, (cx, t, sz) in enumerate(((0.7, 'yellow', 0.3), (1.15, 'blue', 0.22), (1.5, 'red', 0.26))):
                self.box((sz, sz, sz), (cx, -2.9 + (i % 2) * 0.2, 1.13), side='iplain', tint=t, bevel=0.02, bottom=True, rz=0.3 * i)
            self.box((w + 0.1, 3.0, 0.28), (0, -1.5, h), side='rib', top='iplain', tint='i_rib', bevel=0.05, bottom=True)
            self.box((w - 0.5, 0.2, 1.15), (0, -3.0, h + 0.28), side='iplain', tint=tint, bevel=0.04, bottom=True)
            self.light_bar((-(w / 2 - 0.6), -2.1, h), (w / 2 - 0.6, -2.1, h), 0.3, 'light')
            self.light_bar((-(w / 2 - 0.8), -0.5, h), (w / 2 - 0.8, -0.5, h), 0.22, 'cool')
            self.lamp((0, -1.6, h - 0.5), (1.0, 0.82, 0.6), 340, 0.5)
            self.floor(-w / 2 + 0.12, -depth, w / 2 - 0.12, -0.1, 0.012, 'ifloors', 'i_floor_dark', 'x')
            self.block_rect(-w / 2, -3.6, w / 2, 0)
            P = lambda p: self.M @ Vector(p)
            m, t, s = P((0, -1.6, 0)), P((0, -4.4, 0)), P((0, -3.115, h + 0.86))
            self.slots.append({'x': round(m.x, 2), 'z': round(-m.y, 2), 'tx': round(t.x, 2), 'tz': round(-t.y, 2), 'sx': round(s.x, 2), 'sy': round(s.z, 2), 'sz': round(-s.y, 2), 'yaw': round(rz, 4)})
    def shutter(self, w, h, loc=(0, 0, 0), rz=0.0, tint='i_wall'):
        """Geschlossener Rollladen (für leere Ladennischen): Lamellen, Bodenschiene, Führungen, Schloss mit rotem Licht."""
        with self.at(loc, rz):
            self.surf((-w / 2, 0, 0.12), (w / 2, 0, 0.12), (-w / 2, 0, h), 'shutters', tint)
            self.box((w, 0.16, 0.14), (0, -0.02, 0), side='itrim', tint='i_dark', bevel=0.02)
            for s in (-1, 1): self.box((0.14, 0.2, h), (s * (w / 2 - 0.07), -0.04, 0), side='itrim', tint='i_dark', bevel=0.02, along='z')
            self.box((0.36, 0.1, 0.3), (0, -0.06, 0.5), side='iplain', tint='i_dark', bevel=0.02, bottom=True); self.glow('redlamp', (0, -0.115, 0.68), X, Z, 0.07, 0.07)
    def vending(self, loc=(0, 0, 0), rz=0.0, tint='i_wall_light'):
        with self.at(loc, rz):
            self.box((1.25, 0.85, 2.15), side='iplain', tint='i_dark', bevel=0.05)
            self.tile('vending', (0, -0.425, 1.1), X, Z, 1.16, 2.04, tint, off=0.004)
            self.glow('screen', (0.377, -0.43, 1.7), X, Z, 0.19, 0.33, off=0.006); self.glow('accent', (0, -0.43, 2.1), X, Z, 1.0, 0.04, off=0.006)
            self.glow('light', (-0.22, -0.43, 1.28), X, Z, 0.64, 0.04, off=0.006)
            self.block_rect(-0.7, -0.5, 0.7, 0.45)
    def kiosk(self, loc=(0, 0, 0), rz=0.0):
        """Auskunftssäule mit Bildschirm."""
        with self.at(loc, rz):
            self.box((0.95, 0.42, 1.0), side='itech', tint='i_dark', bevel=0.05)
            self.box((1.0, 0.3, 1.1), (0, 0.02, 1.0), side='iplain', tint='i_dark', bevel=0.05, bottom=True)
            self.tile('terminal', (0, -0.132, 1.55), X, Z, 0.92, 0.92, 'i_wall_light', off=0.004)
            self.glow('screen', (0, -0.14, 1.706), X, Z, 0.69, 0.4, off=0.004); self.glow('accent', (0, -0.215, 0.5), X, Z, 0.06, 0.8, off=0.004)
            self.block_rect(-0.55, -0.3, 0.55, 0.3)
    def lockers(self, n=3, loc=(0, 0, 0), rz=0.0, tint='i_wall_light'):
        with self.at(loc, rz):
            for i in range(n):
                x = (i - (n - 1) / 2) * 1.02
                self.box((1.0, 0.6, 2.05), (x, -0.3, 0), side='iplain', tint='i_dark', bevel=0.03)
                self.tile('locker', (x, -0.6, 1.03), X, Z, 0.96, 1.98, tint, off=0.004)
            self.block_rect(-n * 0.52, -0.65, n * 0.52, 0)
    def sdoor(self, w=2.4, h=2.6, loc=(0, 0, 0), rz=0.0, tint='i_wall_light', label=None):
        """Schiebetür in einer Wand (Ursprung: Mitte der Schwelle an der Wand)."""
        with self.at(loc, rz):
            for s in (-1, 1): self.box((0.3, 0.36, h + 0.3), (s * (w / 2 + 0.15), -0.1, 0), side='rib', tint='i_rib', bevel=0.04, along='z')
            self.box((w + 0.6, 0.36, 0.34), (0, -0.1, h), side='rib', tint='i_rib', bevel=0.04, bottom=True)
            self.tile('sdoor', (0, -0.06, h / 2), X, Z, w, h, tint)
            self.glow('accent', (0, -0.29, h + 0.17), X, Z, w * 0.7, 0.05)
            if label: self.wall_sign(label, w * 0.9, (0, -0.1, h + 0.5))
    def panel_i(self, name, loc, rz=0.0, w=1.0, h=1.0, tint='i_wall_light'):
        """Flaches Wandmotiv (utility, locker, terminal …) direkt auf der Wand."""
        with self.at(loc, rz): self.tile(name, (0, -0.02, h / 2), X, Z, w, h, tint)

    # ------------------------------------------------------------ Möbel und Pflanzen
    def bench(self, length=3.0, loc=(0, 0, 0), rz=0.0, back=True, fabric='i_fabric'):
        """Sitzbank mit Polster (Sitzseite nach -Y)."""
        with self.at(loc, rz):
            for s in (-1, 1): self.box((0.14, 0.62, 0.4), (s * (length / 2 - 0.25), 0, 0), side='iplain', tint='i_dark', bevel=0.02)
            self.box((length, 0.7, 0.08), (0, 0, 0.36), side='itrim', tint='i_dark', bevel=0.02, bottom=True)
            self.box((length - 0.08, 0.6, 0.13), (0, -0.02, 0.44), side='fabric', tint=fabric, bevel=0.04, bottom=True)
            if back:
                self.box((length, 0.1, 0.55), (0, 0.33, 0.44), side='iplain', tint='i_dark', bevel=0.02, bottom=True)
                self.box((length - 0.08, 0.12, 0.44), (0, 0.25, 0.52), side='fabric', tint=fabric, bevel=0.04, bottom=True)
            self.glow('accent', (0, -0.352, 0.4), X, Z, length * 0.8, 0.03, off=0.002)
            self.block_rect(-length / 2 - 0.1, -0.5, length / 2 + 0.1, 0.5)
    def plant(self, loc=(0, 0, 0), r=0.7, h=1.3, n=16, tint='i_leaf'):
        """Pflanze aus schmalen, gebogenen Blättern (beidseitig sichtbar)."""
        loc = V(loc); vb, vt, sh = lib.vband('iplain'); t0 = lib.T(tint)
        for i in range(n):
            a = i / n * TAU + self.R.uniform(-0.2, 0.2); d = Vector((math.cos(a), math.sin(a), 0)); side = Vector((-d.y, d.x, 0))
            rr = r * self.R.uniform(0.55, 1.0); hh = h * self.R.uniform(0.55, 1.0); wv = self.R.uniform(0.07, 0.12)
            p0 = loc; p1 = loc + d * rr * 0.45 + Z * hh * 0.8; p2 = loc + d * rr + Z * hh * self.R.uniform(0.5, 0.95)
            k = self.R.uniform(0.7, 1.15); t = (t0[0] * k, t0[1] * k, t0[2] * k)
            for pts in ((p0 - side * 0.02, p0 + side * 0.02, p1 + side * wv, p1 - side * wv), (p1 - side * wv, p1 + side * wv, p2 + side * 0.01, p2 - side * 0.01)):
                uvs = ((0.3, vb + 0.004), (0.31, vb + 0.004), (0.31, vt - 0.004), (0.3, vt - 0.004))
                self.poly(pts, uvs, t, 'kit_int'); self.poly(pts[::-1], uvs[::-1], t, 'kit_int')
    def planter(self, sx=1.6, sy=1.6, loc=(0, 0, 0), rz=0.0, h=0.75, plants=2):
        """Pflanzkübel mit Erde, Lichtfuge und Pflanzen."""
        with self.at(loc, rz):
            self.box((sx, sy, h), side='itech', top='iplain', tint='i_dark', bevel=0.05)
            self.box((sx - 0.2, sy - 0.2, 0.05), (0, 0, h - 0.02), side='iplain', tint='i_soil', bevel=0.0, bottom=True)
            for u, c, ww in ((X, (0, -sy / 2, 0.12), sx), (-X, (0, sy / 2, 0.12), sx), (Y, (sx / 2, 0, 0.12), sy), (-Y, (-sx / 2, 0, 0.12), sy)):
                self.glow('accent', c, u, Z, ww * 0.8, 0.04, off=0.004)
            for i in range(plants):
                px = (i - (plants - 1) / 2) * min(0.8, sx / max(plants, 1)) * 0.9
                self.plant((px, self.R.uniform(-0.15, 0.15), h), min(sx, sy) * 0.55, self.R.uniform(1.0, 1.6))
            self.block_rect(-sx / 2 - 0.1, -sy / 2 - 0.1, sx / 2 + 0.1, sy / 2 + 0.1)
    def bin(self, loc=(0, 0, 0)):
        with self.at(loc):
            self.tube((0, 0, 0), (0, 0, 0.85), 0.27, 'shutter', 'i_dark', 12, mode='around', cap_tint='i_dark')
            self.tube((0, 0, 0.78), (0, 0, 0.84), 0.285, 'iplain', 'steel', 12, caps=False)
            self.block_rect(-0.3, -0.3, 0.3, 0.3)
    def stanchion(self, a, b, tint='i_red'):
        """Absperrpfosten mit Band von a nach b (x, y)."""
        a = Vector((a[0], a[1], 0)); b = Vector((b[0], b[1], 0))
        for p in (a, b):
            self.tube(p, p + Z * 0.04, 0.17, 'iplain', 'steel', 10); self.tube(p, p + Z * 0.95, 0.03, 'iplain', 'steel', 6)
        self.beam(a + Z * 0.86, b + Z * 0.86, 0.02, 0.07, 'fabric', tint, 0.0)
    def dais(self, r=2.6, loc=(0, 0, 0), h=0.14):
        """Flaches rundes Podest mit Lichtring (z. B. unter dem Kartentisch)."""
        with self.at(loc):
            self.tube((0, 0, 0), (0, 0, h), r + 0.25, 'itrim', 'i_dark', 28, mode='around', r2=r, cap_tint='i_floor_dark')
            n = 28
            for i in range(n):
                a0, a1 = i / n * TAU, (i + 0.8) / n * TAU; rr = r - 0.25
                self.floor_strip((math.cos(a0) * rr, math.sin(a0) * rr), (math.cos(a1) * rr, math.sin(a1) * rr), 0.07, 'accent', h + 0.004)

    for f in (wall, floor, ceiling, portal, light_bar, hanging_sign, wall_sign, ad_screen, floor_strip, floor_line, duct, shop_bay, shutter, vending, kiosk, lockers, sdoor, panel_i,
              bench, plant, planter, bin, stanchion, dais):
        setattr(K, f.__name__, f)
    # Ladenplätze sammeln
    init = K.__init__
    def __init__(self, name, seed=1):
        init(self, name, seed); self.slots = []
    K.__init__ = __init__
