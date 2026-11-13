# Neonhafen – Cyberpunk-Stadt auf Neuhafen IV, gebaut mit dem Baukasten (kit_lib.py + kit_interior.py). Läuft in Blender (Neonhafen.blend).
#
# Wie Talstadt im Koordinatensystem des Stations-Innenraums (Blender-y = -z): Die Hangarhalle umschließt genau den Hangar (Tor bei y = -112),
# das Promenadenhaus Korridor und Promenade (y 50 … 110). Darüber und drumherum: dichte Türme (Fassaden als kachelndes Bild kit_tower),
# enge Gassen (8–9 m) mit Läden, Neon, Kabeln, Laternen, Laufbrücken, Pfützen und Dampfschächten; hinter der Promenade der Lichtplatz mit
# abgesenkter Grube (dort dreht sich im Spiel die Skulptur), Lampensternen, Hologrammen und einer Garküche. Auf dem Hallendach der Hafenturm.
# Neonschriften: kit_city2 (scripts/make-kit-city2.mjs), K.neon / K.holo. Spiel: src/game/city.ts (Stil „neon“: Dunst, Dämmerlicht, Hologramme, Dampf).
import math

HW, Y0, Y1, HH = 92.0, -112.0, 50.0, 42.0
DW, DH = 62.0, 32.0
SX, FY, BY, RZ = 105.0, -115.5, 56.0, 47.0
DOOR = (0.0, 118.0)
PI = math.pi
SIGNS = ['n_nudel', 'n_kapsel', 'n_spaeti', 'n_karaoke', 'n_pfand', 'n_robo', 'n_klinik', 'n_bier', 'n_zone', 'n_volta', 'n_lumen', 'n_nachtmarkt']
ICONS = ['n_pfeil', 'n_bierkrug', 'n_schale', 'n_auge', 'n_blitz', 'n_ring', 'n_herz', 'n_kreuz']
VERT = ['v_nudeln', 'v_kapsel', 'v_bar', 'v_offen']
FACES = {'s': (0.0, (1, 0, 0), (0, -1, 0)), 'n': (PI, (-1, 0, 0), (0, 1, 0)), 'e': (PI / 2, (0, 1, 0), (1, 0, 0)), 'w': (-PI / 2, (0, -1, 0), (-1, 0, 0))}

# Türme (x0, y0, x1, y1, Höhe, Seiten mit Ladenzeile) – rechte Hälfte, wird gespiegelt; dazu Nordturm und Hafenturm einzeln
BLOCKS = [
    (45, 56, 95, 138, 70, 'wsn'), (45, 146, 95, 194, 48, 'wsne'), (45, 202, 95, 250, 92, 'ws'),
    (103, 56, 150, 120, 96, 'wn'), (103, 128, 150, 190, 60, 'wsne'), (103, 198, 150, 250, 76, 'ws'),
    (158, 56, 205, 140, 56, 'wn'), (158, 148, 205, 250, 106, 'ws'),
    (113, -115, 160, -62, 66, 'wen'), (113, -54, 160, 0, 86, 'wens'), (113, 8, 160, 48, 50, 'wens'),
    (168, -115, 205, -30, 102, 'wn'), (168, -22, 205, 48, 72, 'ws'),
    (90, -235, 150, -180, 82, 'wn'), (90, -172, 150, -123, 62, 'wsn'), (158, -235, 205, -123, 112, 'w'),
]
# Gassen (Mittellinie a → b, Breite) – rechte Hälfte, gespiegelt; Querstraßen in der Mitte einzeln
ALLEYS = [
    ((40.5, 60), (40.5, 248), 9), ((99, 60), (99, 248), 8), ((154, 60), (154, 248), 8),
    ((49, 142), (91, 142), 8), ((49, 198), (91, 198), 8), ((107, 124), (146, 124), 8), ((107, 194), (146, 194), 8), ((162, 144), (201, 144), 8),
    ((109, -112), (109, 52), 8), ((164, -112), (164, 52), 8), ((117, -58), (156, -58), 8), ((117, 4), (156, 4), 8), ((113, 52), (205, 52), 8), ((172, -26), (201, -26), 8),
    ((86, -232), (86, -120), 8), ((154, -232), (154, -126), 8), ((94, -176), (146, -176), 8),
]

def build(lib):
    K = lib.Kit('Neonhafen', seed=2077)
    X, Y, Z = lib.X, lib.Y, lib.Z
    R = K.R
    steam, holos, paths, stalls, shops = [], [], [], [], []

    # ------------------------------------------------------------ Ladenfront (ein Feld einer Erdgeschosszone)
    def bay(cx, cy, n, w=8.0, h=6.0, kind=None):
        rz, u, nv = FACES[n]
        with K.at((cx, cy, 0.2), rz):
            k = kind or R.choice(['shop', 'shop', 'shop', 'shutter', 'glass', 'bar'])
            K.box((w, 0.5, 0.5), (0, -0.25, h - 0.5), side='beam', tint='hull_dark', bevel=0.03, bottom=True)        # Sturz
            for s in (-1, 1): K.box((0.4, 0.5, h - 0.5), (s * (w / 2 - 0.2), -0.25, 0), side='girder', tint='hull_dark', bevel=0.03, along='z')
            if k in ('shop', 'bar'):
                K.glow(R.choice(['light', 'lamp', 'cool', 'screen']), (0, -0.02, 2.0), X, Z, w - 1.2, 3.6)                 # beleuchteter Laden
                K.glass((0, -0.06, 2.0), X, Z, w - 1.0, 3.8)
                K.box((w - 1.0, 0.6, 1.0), (0, -0.6, 0), side='siding', top='plain', tint='hull_mid', bevel=0.03)          # Theke / Auslage
                if k == 'bar':
                    for i in range(3): K.tube((-2 + i * 2, -1.5, 0), (-2 + i * 2, -1.5, 0.75), 0.05, 'plain', 'steel', 6); K.tube((-2 + i * 2, -1.5, 0.75), (-2 + i * 2, -1.5, 0.82), 0.24, 'plain', 'red', 10)
            elif k == 'shutter':
                K.box((w - 0.9, 0.2, h - 1.2), (0, -0.1, 0), side='siding', tint=R.choice(['hull_mid', 'rust', 'hull']), bevel=0.02, along='x')
                K.decal(R.choice(['leak1', 'rust1', 'scuff', 'soot']), (0, -0.22, 2.0), X, Z, 2.4, 3.0, off=0.02)
            else:
                K.glass((0, -0.06, 2.4), X, Z, w - 1.0, 4.6)
            # Schild: Neon über dem Laden oder Piktogramm daneben, manchmal ein Vordach
            if R.random() < 0.8:
                nm = R.choice(SIGNS); K.box((w - 0.6, 0.35, 1.4), (0, -0.55, h - 0.1), side='plain', tint='black', bevel=0.03, bottom=True)
                K.neon(nm, (0, -0.74, h + 0.6), X, Z, min(w - 1.0, 6.5))
            if R.random() < 0.45: K.neon(R.choice(ICONS), (w / 2 - 1.1, -0.6, h - 1.6), X, Z, 1.2)
            if R.random() < 0.35: K.box((w, 1.6, 0.15), (0, -1.3, h - 1.2), side='beam', top='roofing', tint=R.choice(['red', 'blue', 'hull_dark']), bevel=0.02, bottom=True)
            K.glowbox('light', (0.5, 0.18, 0.12), (-w / 2 + 0.8, -0.6, h - 0.8)); K.light('lamp' if R.random() < 0.5 else 'light', (-w / 2 + 0.8, -0.9, h - 0.9), 2.2)
        return k

    # ------------------------------------------------------------ Turm: Sockel mit Läden, Fassaden, Gesimse, Dach, Neon an den Kanten
    def tower(x0, y0, x1, y1, h, shopsides):
        cx, cy, sx, sy = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0
        P0 = 6.4
        K.box((sx, sy, P0), (cx, cy, 0.2), side='wall', top='roofing', tint='hull_dark', tint_top='hull_dark', bevel=0.06)
        # Fassaden ab dem Sockel; hohe Türme springen oben zurück (Dachterrasse), Teile in anderer Tönung
        corners = {'s': ((x0, y0), (x1, y0)), 'n': ((x1, y1), (x0, y1)), 'e': ((x1, y0), (x1, y1)), 'w': ((x0, y1), (x0, y0))}
        TN = [(0.85, 0.85, 0.88), (0.72, 0.7, 0.68), (0.6, 0.64, 0.7), (0.9, 0.85, 0.78), (0.5, 0.52, 0.56), (0.78, 0.8, 0.84)]
        def shaft(ax0, ay0, ax1, ay1, za, zb, tint):
            for (p0, p1) in (((ax0, ay0), (ax1, ay0)), ((ax1, ay1), (ax0, ay1)), ((ax1, ay0), (ax1, ay1)), ((ax0, ay1), (ax0, ay0))):
                K.facade((p0[0], p0[1], za), (p1[0], p1[1], za), (p0[0], p0[1], zb), tint, z0=R.random() * 25.6)
            K.surf((ax0, ay0, zb), (ax1, ay0, zb), (ax0, ay1, zb), 'roofing', 'hull_dark')
            mx, my, wx, wy = (ax0 + ax1) / 2, (ay0 + ay1) / 2, ax1 - ax0, ay1 - ay0
            with K.at((mx, my, 0)):
                K.ring(wx + 0.2, wy + 0.2, zb, 0.5, 1.1, 'girder', 'hull_dark')                                 # Attika
                for zz in range(int(za + 18), int(zb - 6), 24): K.ring(wx + 0.8, wy + 0.8, zz, 0.6, 0.5, 'beam', 'hull_mid')   # Gesimse
            return mx, my, wx, wy
        z0 = P0 + 0.2
        if h > 62 and min(sx, sy) > 30:
            h1 = h * R.uniform(0.45, 0.62); ins = R.uniform(4, 8)
            shaft(x0, y0, x1, y1, z0, h1, R.choice(TN))
            ix0, iy0, ix1, iy1 = x0 + ins * R.choice((0.5, 1)), y0 + ins * R.choice((0.5, 1)), x1 - ins * R.choice((0.5, 1)), y1 - ins * R.choice((0.5, 1))
            for k in range(3): K.vent_unit((R.uniform(x0 + 2, x1 - 2), R.choice((y0 + 1.6, y1 - 1.6)), h1), sx=2.2, sy=2.2, sz=1.2)
            K.railing((x0 + 0.4, y0 + 0.4, h1), (x1 - 0.4, y0 + 0.4, h1), 1.1, 'hull_dark', 2.4)
            rx0, ry0, rx1, ry1 = ix0, iy0, ix1, iy1
            mx, my, wx, wy = shaft(ix0, iy0, ix1, iy1, h1, h, R.choice(TN))
        else:
            rx0, ry0, rx1, ry1 = x0, y0, x1, y1
            mx, my, wx, wy = shaft(x0, y0, x1, y1, z0, h, R.choice(TN))
        # Leuchtleisten an einer Kante (Cyberpunk-Silhouette)
        if R.random() < 0.55:
            ex, ey = R.choice(((rx0 - 0.25, ry0 - 0.25), (rx1 + 0.25, ry0 - 0.25), (rx0 - 0.25, ry1 + 0.25), (rx1 + 0.25, ry1 + 0.25)))
            K.glowbox(R.choice(['accent', 'redlamp', 'cool', 'lamp']), (0.25, 0.25, h - P0 - 4), (ex, ey, (h + P0) / 2 + 1))
        # Dach: Lüfter, Tanks, Antennen, Werbewand
        for k in range(max(1, int(wx * wy / 700))):
            K.vent_unit((mx - wx / 2 + 4 + R.random() * (wx - 8), my - wy / 2 + 4 + R.random() * (wy - 8), h), sx=2.6, sy=2.6, sz=1.4)
        if R.random() < 0.5: K.tank(1.4, 5.0, (mx + R.uniform(-wx / 4, wx / 4), my + R.uniform(-wy / 4, wy / 4), h), R.random() * PI, 'hull_light', None)
        if R.random() < 0.6: K.antenna(8 + R.random() * 10, (mx - wx / 2 + 3, my + wy / 2 - 3, h))
        if R.random() < 0.35:
            n = R.choice('nsew'); rz, u, nv = FACES[n]; ad = R.choice(['a_lumen', 'a_volta'])
            px, py = mx + nv[0] * (wx / 2 - 3), my + nv[1] * (wy / 2 - 3)
            for d in (-5, 5): K.box((0.5, 0.5, 15.0), (px + u[0] * d - nv[0] * 0.6, py + u[1] * d - nv[1] * 0.6, h), side='girder', tint='hull_dark', bevel=0.03, along='z')
            K.neon(ad, (px, py, h + 8.0), u, Z, 13.0)
        # Kantenneon: senkrechte Schilder an zwei Ecken
        for (px, py, n) in ((x0 - 0.3, y0 + 2.5, 'w'), (x1 + 0.3, y1 - 2.5, 'e')):
            if R.random() < 0.6:
                rz, u, nv = FACES[n]; K.neon(R.choice(VERT), (px, py, P0 + 7 + R.random() * 6), u, Z, 2.4)
        # großes Schild an einer Ladenseite
        if shopsides and R.random() < 0.75:
            n = shopsides[0]; rz, u, nv = FACES[n]
            a, b = corners[n]; mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            K.neon(R.choice(SIGNS[:11]), (mx + nv[0] * 0.25, my + nv[1] * 0.25, P0 + 10 + R.random() * 12), u, Z, min(18.0, max(sx, sy) * 0.4))
        # Ladenzeilen im Sockel
        for n in shopsides:
            a, b = corners[n]; L = math.hypot(b[0] - a[0], b[1] - a[1]); nb = max(1, int(L // 9)); w = L / nb
            rz, u, nv = FACES[n]
            for i in range(nb):
                t = (i + 0.5) / nb; px, py = a[0] + (b[0] - a[0]) * t + nv[0] * 0.02, a[1] + (b[1] - a[1]) * t + nv[1] * 0.02
                k = bay(px, py, n, w - 0.2)
                if k in ('shop', 'bar') and len(shops) < 40: shops.append((px + nv[0] * 2.6, py + nv[1] * 2.6, k))
        # Klimakästen und Rohre an den Fassaden (über der Gasse)
        for n in shopsides:
            a, b = corners[n]; rz, u, nv = FACES[n]
            for k in range(3):
                t = R.random(); px, py = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
                K.panel('vent', (px, py, P0 + 3 + R.random() * 20), rz, 1.2, 0.9, 0.55, 'hull_light')
            t = R.random(); px, py = a[0] + (b[0] - a[0]) * t + nv[0] * 0.35, a[1] + (b[1] - a[1]) * t + nv[1] * 0.35
            K.tube((px, py, 0.2), (px, py, min(h - 2, 30)), 0.18, 'pipe', R.choice(['steel', 'rust', 'yellow']), 8)

    # ------------------------------------------------------------ Gasse: Kabel, Laternen, Laufbrücken, Pfützen, Abfall, Dampf
    def alley(a, b, w, bridges=True):
        ax, ay = a; bx, by = b; L = math.hypot(bx - ax, by - ay); ux, uy = (bx - ax) / L, (by - ay) / L; nx, ny = -uy, ux
        n = int(L // 8)
        for i in range(1, n):
            t = i / n; px, py = ax + (bx - ax) * t, ay + (by - ay) * t
            if R.random() < 0.75:
                z1, z2 = 7 + R.random() * 9, 7 + R.random() * 9
                p1 = (px - nx * w / 2 + ux * R.uniform(-2, 2), py - ny * w / 2 + uy * R.uniform(-2, 2), z1); p2 = (px + nx * w / 2, py + ny * w / 2, z2)
                K.cable(p1, p2, 0.6 + R.random() * 0.8, 0.04, 6)
                if R.random() < 0.4:
                    m = ((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (z1 + z2) / 2 - 0.9)
                    K.glowbox(R.choice(['lamp', 'light', 'accent']), (0.35, 0.35, 0.5), m); K.light('lamp', m, 2.0)
            if R.random() < 0.35: K.decal(R.choice(['stain1', 'stain2']), (px + nx * R.uniform(-w / 3, w / 3), py + ny * R.uniform(-w / 3, w / 3), 0.21), X, Y, 3 + R.random() * 3, 2 + R.random() * 3, 'black', off=0.01)
            if R.random() < 0.18:
                sp = (px + nx * R.uniform(-w / 4, w / 4), py + ny * R.uniform(-w / 4, w / 4))
                K.box((1.2, 1.2, 0.06), (sp[0], sp[1], 0.2), side='plain', top='floor', tint='hull_dark', bevel=0.01); steam.append(sp)
            if R.random() < 0.3:
                s = R.choice((-1, 1)); q = (px + nx * s * (w / 2 - 0.8), py + ny * s * (w / 2 - 0.8), 0.2)
                R.choice([lambda: K.bin(q), lambda: K.barrel(q, R.choice(['rust', 'blue', 'hull_mid'])), lambda: K.crate(1.1, 1.1, 0.9, q, R.random(), 'hull_light')])()
        if bridges and L > 50:
            for t in (0.33, 0.7):
                px, py = ax + (bx - ax) * t, ay + (by - ay) * t
                K.walkway(w + 0.4, 2.2, 12 + R.random() * 8, (px, py, 0), math.atan2(ny, nx), legs=1e9)
        paths.append((a, b))

    # ================================================================== Boden: nasser Belag über die ganze Stadt (Lichtplatz und Vorfeld eigens)
    K.seg = 8.0
    PL = (36.0, 118.0, 196.0)                                            # Lichtplatz: halbe Breite, y von … bis
    K.slab(410, 485, 0.2, (0, 7.5, 0), tint=(0.22, 0.23, 0.25), cell=8.0, mat='kit_wet', uvm=4.0,
           holes=[(-PL[0], PL[1] - 7.5, PL[0], PL[2] - 7.5), (-84, -235 - 7.5, 84, FY - 7.5), (-SX, FY - 7.5, SX, BY - 7.5)])

    # ================================================================== 1. Hangarhalle (Hülle) und Hafenturm
    L = BY - FY; yc = (BY + FY) / 2
    for s in (-1, 1):
        x = s * (SX - 1.5)
        K.box((3.0, L, 14.0), (x, yc, 0), side='wall', tint='hull_dark', bevel=0.08)
        K.box((3.0, L, RZ - 14.0), (x, yc, 14.0), side='siding', tint='hull_mid', bevel=0.06, bottom=True)
        K.box((3.4, L + 0.3, 1.0), (x, yc, 30.0), side='beam', tint='red', bevel=0.05, bottom=True)
        u = (0, s, 0); rz = s * PI / 2
        for k in range(6): K.box((1.0, 1.2, RZ), (s * (SX + 0.5), FY + 14 + k * 28, 0), side='girder', tint='hull_dark', bevel=0.04, along='z')
        K.neon('a_lumen' if s > 0 else 'a_volta', (s * (SX + 0.1), FY + 60, 20.0), u, Z, 22.0)
        K.neon('n_volta' if s > 0 else 'n_lumen', (s * (SX + 0.1), FY + 120, 36.0), u, Z, 26.0)
        for y in (FY + 30, FY + 95, FY + 150):
            K.pipe([(s * (SX + 0.6), y, 0.2), (s * (SX + 0.6), y, 24.0), (s * (SX + 7.4), y, 24.0)], 0.35, R.choice(['yellow', 'steel']))
            K.ladder(28.0, (s * (SX + 0.05), y + 4, 0.2), rz)
        K.walkway(L - 12, 1.6, 18.0, (s * (SX + 1.0), yc, 0), PI / 2, rails=(s > 0, s < 0), legs=1e9)
    K.box((2 * SX, 3.0, RZ), (0, BY - 1.5, 0), side='siding', tint='hull_mid', bevel=0.06)
    K.box((2 * SX, L, 1.4), (0, yc, RZ - 1.4), side='beam', top='roofing', tint='hull_dark', bevel=0.08, bottom=True)
    K.ring(2 * SX - 0.6, L - 0.6, RZ, 0.6, 1.1, 'girder', 'hull_dark')
    for i in range(5):
        for j in range(2): K.vent_unit((-80 + i * 40, FY + 25 + j * 40, RZ), sx=4.0, sy=4.0, sz=1.8)
    # Torfassade: Pylone mit Riesenwerbung, Sturz mit NEONHAFEN, Warnrahmen, Strahler, Absperrgitter
    fd = -FY - 112.4; fyc = FY + fd / 2
    for s in (-1, 1):
        x0, x1 = DW + 1.0, SX; cx, w = s * (x0 + x1) / 2, x1 - x0
        K.box((w, fd, RZ), (cx, fyc, 0), side='wall', tint='hull_dark', bevel=0.1)
        K.neon('a_volta' if s < 0 else 'a_lumen', (cx, FY - 0.2, 21.0), X, Z, 34.0)
        K.box((36.0, 0.6, 36.0), (cx, FY + 0.1, 3.0), side='beam', tint='black', bevel=0.04, bottom=True)
        for z in (2.0, 38.5): K.box((w, 1.0, 0.8), (cx, FY - 0.4, z), side='hazard', tint='none', bevel=0.03, bottom=True)
        K.box((1.4, fd + 0.6, DH + 1.0), (s * (DW + 0.7), fyc - 0.3, 0), side='hazard', tint='none', bevel=0.04, along='z')
        p = (s * (SX - 2), FY - 0.5, RZ + 0.8); K.glowbox('redlamp', (0.6, 0.6, 0.6), p); K.light('redlamp', p, 7.0)
    K.box((2 * DW + 2.0, fd, RZ - DH - 1.0), (0, fyc, DH + 1.0), side='siding', tint='hull_dark', bevel=0.1, bottom=True)
    K.box((2 * DW + 2.4, fd + 0.6, 1.2), (0, fyc - 0.3, DH + 1.0), side='hazard', tint='none', bevel=0.04, bottom=True)
    K.neon('n_neonhafen', (0, FY - 0.25, DH + 8.0), X, Z, 50.0)
    for k in range(9):
        x = -DW + 6 + k * (2 * DW - 12) / 8
        K.box((2.0, 1.2, 1.0), (x, FY - 1.0, DH + 2.6), side='plain', tint='hull_mid', bevel=0.05, bottom=True)
        K.glow('cool', (x, FY - 1.62, DH + 3.1), X, Z, 1.6, 0.7); K.light('light', (x, FY - 2.2, DH + 3.0), 6.0)
    GY = FY - 7.0
    for k in range(32):
        x = -DW + k * (2 * DW) / 31
        K.box((0.22, 0.22, 3.0), (x, GY, 0.2), side='plain', tint='hull_dark', bevel=0.02, along='z')
        if k < 31: K.glass((x + DW / 31, GY - 0.02, 1.7), X, Z, 2 * DW / 31 - 0.3, 2.6)
    K.glowbox('accent', (2 * DW, 0.12, 0.1), (0, GY, 3.25))
    for k in range(13):
        x = -DW + 4 + k * (2 * DW - 8) / 12
        K.glowbox('accent', (1.0, 0.5, 0.12), (x, FY - 5.0, 0.14)); K.light('lamp', (x, FY - 5.0, 0.5), 3.0)
    # Hafenturm auf dem Hallendach
    hx0, hx1, hy0, hy1, hh = -40.0, 40.0, -20.0, 50.0, 160.0
    for (a, b) in (((hx0, hy0), (hx1, hy0)), ((hx1, hy1), (hx0, hy1)), ((hx1, hy0), (hx1, hy1)), ((hx0, hy1), (hx0, hy0))):
        K.facade((a[0], a[1], RZ), (b[0], b[1], RZ), (a[0], a[1], hh), (0.7, 0.72, 0.78), z0=3.0)
    K.surf((hx0, hy0, hh), (hx1, hy0, hh), (hx0, hy1, hh), 'roofing', 'hull_dark')
    with K.at(((hx0 + hx1) / 2, (hy0 + hy1) / 2, 0)):
        for zz in range(int(RZ + 20), int(hh), 22): K.ring(hx1 - hx0 + 1.0, hy1 - hy0 + 1.0, zz, 0.7, 0.6, 'beam', 'hull_mid')
        K.ring(hx1 - hx0 + 0.4, hy1 - hy0 + 0.4, hh, 0.6, 1.6, 'girder', 'hull_dark')
    for (c, u) in (((0, hy0 - 0.3, hh - 9), X), ((0, hy1 + 0.3, hh - 9), (-1, 0, 0)), ((hx1 + 0.3, 15, hh - 9), Y), ((hx0 - 0.3, 15, hh - 9), (0, -1, 0))):
        K.neon('n_lumen', c, u, Z, 34.0)
    K.box((10, 10, 6), (0, 15, hh), side='girder', top='roofing', tint='hull_dark', bevel=0.06)
    K.tube((0, 15, hh + 6), (0, 15, hh + 34), 0.6, 'pipe', 'steel', 10, r2=0.2)
    for z in (hh + 14, hh + 24, hh + 34): p = (0, 15, z); K.glowbox('redlamp', (0.5, 0.5, 0.5), p); K.light('redlamp', p, 6.0)
    holos.append({'p': [0, hh + 48, -15], 'r': 9.0, 'kind': 'ring', 'col': 0x38e8ff})

    # ================================================================== 2. Vorfeld (klein) zwischen den Türmen
    AY0, AY1 = FY - 0.3, -235.0
    K.slab(168, AY0 - AY1, 0.2, (0, (AY0 + AY1) / 2, 0), tint=(0.2, 0.21, 0.23), cell=8.0, mat='kit_wet', uvm=5.0)
    with K.overlay():
        for s in (-1, 1): K.box((0.6, AY0 - AY1 - 20, 0.03), (s * 30, (AY0 + AY1) / 2 - 6, 0.2), side='plain', tint='yellow', bevel=0, bottom=True)
        K.box((166, 2.0, 0.035), (0, AY0 - 3.5, 0.2), side='hazard', tint='none', bevel=0, bottom=True)
    for s in (-1, 1):
        for k in range(10): K.post((s * 44, AY0 - 14 - k * 10.5, 0.2), 1.6, 'accent' if k % 2 else 'lamp')
    K.number('1', (0, AY0 - 36, 0.22), X, Y, 16.0, 'white', 0.02)
    K.hauler((70, -140, 0.2), 0.3); K.container((74, -200, 0.2), PI / 2, 'blue', '33'); K.container((74.4, -200, 2.8), PI / 2 + 0.04, 'red', '08')

    # ================================================================== 3. Promenadenhaus mit Kapselturm darüber
    PY0, PY1, PXH, PH = BY, DOOR[1], 24.0, 16.0
    K.block(2 * PXH, PY1 - PY0, PH, (0, (PY0 + PY1) / 2, 0), tint='hull_dark', tint_top='hull_dark', plinth=0.6, cornice=0.5)
    for (a, b) in (((-20, 62), (20, 62)), ((20, 112), (-20, 112)), ((20, 62), (20, 112)), ((-20, 112), (-20, 62))):
        K.facade((a[0], a[1], PH), (b[0], b[1], PH), (a[0], a[1], 78.0), (0.8, 0.8, 0.86), z0=5.0)
    K.surf((-20, 62, 78), (20, 62, 78), (-20, 112, 78), 'roofing', 'hull_dark')
    K.neon('n_kapsel', (0, 112.3, 60.0), (-1, 0, 0), Z, 26.0); K.neon('v_kapsel', (20.3, 108.0, 40.0), Y, Z, 4.0)
    K.box((16, 5.0, 0.5), (0, PY1 + 2.5, 5.0), side='beam', top='roofing', tint='hull_dark', bevel=0.05, bottom=True)
    K.glow('cool', (0, PY1 + 2.5, 4.98), X, -Y, 14.0, 0.4); K.light('light', (0, PY1 + 3.0, 4.6), 6.0)
    K.door((0, PY1 + 0.15, 0.2), PI, w=2.4, h=2.8)
    for s in (-1, 1): K.glass((s * 4.5, PY1 + 0.02, 2.5), (-1, 0, 0), Z, 4.6, 4.4)
    K.neon('n_nachtmarkt', (0, PY1 + 0.3, 8.6), (-1, 0, 0), Z, 18.0)
    # Eingang zum Kapselhotel in der Seitengasse (Ostseite des Promenadenhauses)
    K.door((PXH + 0.1, 100.0, 0.2), PI / 2, w=2.0, h=2.6)
    K.box((3.2, 4.0, 0.3), (PXH + 1.6, 100.0, 3.0), side='beam', top='roofing', tint='hull_dark', bevel=0.03, bottom=True)
    K.neon('n_kapsel', (PXH + 0.25, 100.0, 4.4), Y, Z, 6.0); K.glowbox('accent', (0.2, 3.6, 0.1), (PXH + 3.1, 100.0, 2.95))

    # ================================================================== 4. Lichtplatz: Grube mit Skulpturfuß, Lampensterne, Hologramme, Garküche, Bänke
    MX, MY0, MY1 = PL
    K.slab(2 * MX, MY1 - MY0, 0.2, (0, (MY0 + MY1) / 2, 0), tint=(0.25, 0.26, 0.28), cell=2.0, mat='kit_wet', uvm=3.0, holes=[(-11, 160 - 11 - (MY0 + MY1) / 2, 11, 160 + 11 - (MY0 + MY1) / 2)])
    PC = (0.0, 160.0); PD = 2.6
    for (a, b) in (((11, 149), (-11, 149)), ((-11, 171), (11, 171)), ((-11, 149), (-11, 171)), ((11, 171), (11, 149))):
        K.surf((a[0], a[1], -PD), (b[0], b[1], -PD), (a[0], a[1], 0.2), 'wall', 'hull_dark')
    K.surf((-11, 149, -PD), (11, 149, -PD), (-11, 171, -PD), 'floor', 'hull_dark')
    for s in (-1, 1):
        K.glowbox('accent', (22.0, 0.25, 0.06), (0, PC[1] + s * 10.6, -PD + 0.05))
        K.glowbox('accent', (0.25, 22.0, 0.06), (s * 10.6, PC[1], -PD + 0.05))
    K.tube((0, PC[1], -PD), (0, PC[1], 0.8), 3.6, 'girder', 'hull_dark', 24, mode='around')
    K.tube((0, PC[1], 0.8), (0, PC[1], 1.0), 3.9, 'plain', 'steel', 24)
    K.glowbox('accent', (5.4, 5.4, 0.08), (0, PC[1], 1.05))
    for (a, b) in (((-11, 149), (11, 149)), ((11, 149), (11, 171)), ((11, 171), (-11, 171)), ((-11, 171), (-11, 149))):
        K.railing((a[0], a[1], 0.2), (b[0], b[1], 0.2), 1.1, 'hull_dark', 1.8)
    # Lampensterne (Mast mit sechs Leuchtarmen) an den Platzecken, Kabel zu den Fassaden
    for (x, y) in ((-28, 128), (28, 128), (-28, 188), (28, 188)):
        K.box((1.0, 1.0, 1.2), (x, y, 0.2), side='girder', tint='hull_dark', bevel=0.05)
        K.tube((x, y, 1.4), (x, y, 13.0), 0.25, 'pipe', 'hull_dark', 10, r2=0.18)
        for k in range(6):
            a = k * PI / 3; e = (x + math.cos(a) * 2.6, y + math.sin(a) * 2.6, 13.6)
            K.beam((x, y, 13.0), e, 0.22, 0.22, 'beam', 'hull_dark'); K.glowbox('cool', (0.6, 0.18, 0.06), (e[0], e[1], e[2] - 0.15)); K.light('light', (e[0], e[1], e[2] - 0.4), 3.0)
        for (fx, fy) in ((-36 if x < 0 else 36, y + 8), (x + 10, 118 if y < 160 else 196)):
            K.cable((x, y, 12.8), (fx, fy, 15.0 + R.random() * 4), 1.0, 0.04, 6)
    # Hologramme über dem Platz und eine Lichtwand
    K.holo('n_nachtmarkt', (0, 192.0, 16.0), X, Z, 26.0)
    K.holo('n_ring', (-24, 150.0, 9.0), Y, Z, 6.0); K.holo('n_auge', (24, 170.0, 9.0), (0, -1, 0), Z, 6.0)
    holos.append({'p': [0, 19.0, -160.0], 'r': 6.5, 'kind': 'sphere', 'col': 0x9ff4ff})
    holos.append({'p': [30.0, 14.0, -140.0], 'r': 0, 'kind': 'curtain', 'col': 0xff4ad8, 'w': 6.0, 'h': 10.0, 'yaw': -PI / 2})
    # Garküche am Ostrand: Theke, Hocker, Stahlvordach, Rohre, „frisch gezapft“
    with K.at((33.0, 140.0, 0.2), -PI / 2):
        K.box((10, 4.0, 0.4), (0, 1.0, 3.6), side='beam', top='roofing', tint='hull_dark', bevel=0.04, bottom=True)
        for sx_ in (-1, 1):
            for sy_ in (-0.8, 2.8): K.box((0.3, 0.3, 3.6), (sx_ * 4.7, sy_, 0), side='girder', tint='hull_dark', bevel=0.02, along='z')
        K.box((8.0, 1.0, 1.1), (0, 0.4, 0), side='siding', top='plain', tint='hull_mid', bevel=0.04)
        K.glow('lamp', (0, -0.12, 0.8), X, Z, 7.6, 0.08)
        for i in range(5): K.tube((-3.2 + i * 1.6, -0.9, 0), (-3.2 + i * 1.6, -0.9, 0.78), 0.05, 'plain', 'steel', 6); K.tube((-3.2 + i * 1.6, -0.9, 0.78), (-3.2 + i * 1.6, -0.9, 0.85), 0.24, 'plain', 'hull_dark', 10)
        K.neon('n_bierkrug', (-3.0, 2.95, 2.4), X, Z, 1.4); K.neon('n_bier', (1.2, 2.95, 2.6), X, Z, 4.6)
        K.pipe([(-4.6, 2.9, 0.4), (-4.6, 2.9, 3.0), (4.6, 2.9, 3.0)], 0.18, 'steel'); K.glowbox('light', (6.0, 0.15, 0.1), (0, 1.0, 3.55)); K.light('light', (0, 1.0, 3.2), 3.0)
    stalls.append((31.0, 140.0)); stalls.append((-31.0, 176.0))
    with K.at((-33.0, 176.0, 0.2), PI / 2):
        K.box((8, 3.4, 0.35), (0, 0.8, 3.4), side='beam', top='roofing', tint='red', bevel=0.03, bottom=True)
        K.box((6.4, 1.0, 1.05), (0, 0.4, 0), side='siding', top='plain', tint='hull_dark', bevel=0.04)
        K.neon('n_nudel', (0, -0.13, 2.4), X, Z, 5.6); K.neon('n_schale', (3.2, 0.0, 1.6), X, Z, 1.0)
        K.glowbox('lamp', (5.0, 0.15, 0.1), (0, 0.8, 3.35)); K.light('lamp', (0, 0.8, 3.0), 3.0)
        for i in range(4): K.tube((-2.4 + i * 1.6, -0.8, 0), (-2.4 + i * 1.6, -0.8, 0.78), 0.05, 'plain', 'steel', 6); K.tube((-2.4 + i * 1.6, -0.8, 0.78), (-2.4 + i * 1.6, -0.8, 0.85), 0.24, 'plain', 'red', 10)
    for p in ((-16, 132), (16, 132), (-16, 186), (16, 186)): K.bench(3.0, (p[0], p[1], 0.2), 0.0 if p[1] < 160 else PI)
    for p in ((-20, 124), (20, 124), (-6, 192), (6, 192)): K.bin((p[0], p[1], 0.2))
    K.vending((-34.6, 132.0, 0.2), PI / 2); K.vending((-34.6, 134.4, 0.2), PI / 2)

    # ================================================================== 5. Türme und Gassen (gespiegelt), Nordturm
    K.seg = 6.0
    for s in (-1, 1):
        for (x0, y0, x1, y1, h, sides) in BLOCKS:
            if s < 0:
                x0, x1 = -x1, -x0
                sides = sides.translate(str.maketrans('ew', 'we'))
            tower(x0, y0, x1, y1, h + R.uniform(-6, 6), sides)
        for (a, b, w) in ALLEYS:
            alley((s * a[0], a[1]), (s * b[0], b[1]), w)
    tower(-36, 204, 36, 250, 118, 's')
    K.neon('a_lumen', (0, 203.7, 30.0), X, Z, 20.0)
    alley((-36, 200), (36, 200), 8, bridges=False)
    paths.append(((-36, 124), (36, 124))); paths.append(((-36, 192), (36, 192)))
    return K.build('Neon_Kit'), {'steam': steam, 'holos': holos, 'paths': paths, 'stalls': stalls, 'shops': shops}

def meta(extra):
    g = lambda x, y: [round(x, 2), round(-y, 2)]
    pts = []
    for (a, b) in extra.get('paths', []): pts.append([g(*a), g(*b)])
    shops = extra.get('shops', [])
    return {
        'R': 300, 'collide_above': 1.0, 'city': True, 'style': 'neon',
        'door': {'x': DOOR[0], 'z': -(DOOR[1] + 0.3), 'out': g(DOOR[0], DOOR[1] + 3.2), 'yaw': 0.0},
        'gate': {'x0': -DW + 2, 'x1': DW - 2, 'y0': 1.5, 'y1': DH - 1.5, 'z0': 40.0, 'z1': 112.0},
        'dock': {'x': 0, 'y': 16.0, 'z': 175.0}, 'launch': {'x': 0, 'y': 16.0, 'z': 112.0, 'yaw': PI},
        'stalls': [g(*p) for p in extra.get('stalls', [])],
        'shops': [g(p[0], p[1]) for p in shops[:6]],
        'bar': g(31.0, 140.0), 'inn': g(26.6, 100.0), 'monument': g(0.0, 147.0),
        'paths': pts,
        'guards': [[*g(-8, 120), 0.0], [*g(8, 120), 0.0], [*g(-70, -118), PI], [*g(70, -118), PI]],
        'traffic': {'far': [0, 160, 1400], 'in': [0, 14, 60]},
        'steam': [g(*p) for p in extra.get('steam', [])],
        'holos': extra.get('holos', []),
        'sculpture': [0.0, 1.0, -160.0],
        'bounds': {'x': 210, 'z0': -255, 'z1': 240},
    }
