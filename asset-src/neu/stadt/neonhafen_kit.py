# Neonhafen – Cyberpunk-Stadt auf Neuhafen IV, gebaut mit dem Baukasten (kit_lib.py + kit_interior.py). Läuft in Blender (Neonhafen.blend).
#
# Wie Talstadt im Koordinatensystem des Stations-Innenraums (Blender-y = -z): Die Hangarhalle umschließt genau den Hangar (Tor bei y = -112),
# das Promenadenhaus Korridor und Promenade (y 50 … 110). Darüber und drumherum: dichte Blöcke mit Ladensockel und Mittelbau, darauf gegliederte
# Hochhäuser aus hochhaus_kit.py (Fassaden kit_hha/b/c mit Relief), Beläge und Straßenteile aus strassen_kit.py (kit_sta/b/c),
# enge Gassen (8–9 m) mit Läden, Neon, Kabeln, Laternen, Laufbrücken, Pfützen und Dampfschächten; hinter der Promenade der Lichtplatz mit
# abgesenkter Grube (dort dreht sich im Spiel die Skulptur), Lampensternen, Hologrammen und einer Garküche. Auf dem Hallendach der Hafenturm.
# Neonschriften: kit_city2 (scripts/make-kit-city2.mjs), K.neon / K.holo. Spiel: src/game/city.ts (Stil „neon“: Dunst, Dämmerlicht, Hologramme, Dampf).
import math, random, json
import hochhaus_kit as H
import strassen_kit as S

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
    K = lib.Kit('Neonhafen', seed=2077); S.SPRITES = False
    K.lm_px = 2048; K.lm_min = 40.0      # Lichtkarte: nur wo K.lm eingeschaltet wird (Gassenböden, Sockelwände, Lichtplatz, Promenadenhaus)
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
                K.glow(R.choice(['shopw', 'shopw', 'shopw', 'shopc', 'shopc', 'lamp']), (0, -0.02, 2.0), X, Z, w - 1.2, 3.6)      # beleuchteter Laden
                m = max(2, round((w - 1.2) / 1.5))                                                                     # Sprossen und Auslage als Schattenriss vor dem Licht
                for j in range(m + 1): K.box((0.1, 0.14, 3.6), (-(w - 1.2) / 2 + (w - 1.2) * j / m, -0.07, 0.2), side='plain', tint='hull_dark', bevel=0.0, along='z')
                K.box((w - 1.0, 0.16, 0.12), (0, -0.08, 3.8), side='plain', tint='hull_dark', bevel=0.0, bottom=True)
                for zs in (1.25, 2.15, 3.0):                                                                           # Regalböden und Ware als dunkle Umrisse
                    K.glass((0, -0.07, zs), X, Z, w - 1.4, 0.07)
                    xx = -(w - 1.8) / 2 + R.uniform(0.0, 0.5)
                    while xx < (w - 1.8) / 2 - 0.4:
                        bw_, bh_ = R.uniform(0.2, 0.55), R.uniform(0.2, 0.62)
                        if R.random() < 0.7: K.glass((xx + bw_ / 2, -0.07, zs + 0.035 + bh_ / 2), X, Z, bw_, bh_)
                        xx += bw_ + R.uniform(0.08, 0.5)
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

    # ------------------------------------------------------------ Block: Sockel mit Läden, Mittelbau, darauf ein oder zwei gegliederte Hochhäuser
    HERO = {(1, 0): 'stufen', (1, 3): 'konzern', (1, 7): 'rund', (1, 9): 'werk', (1, 13): 'kern', (-1, 0): 'kern', (-1, 2): 'konzern', (-1, 5): 'werk', (-1, 8): 'rund', (-1, 15): 'stufen'}
    def tower(x0, y0, x1, y1, h, shopsides, hero=None, seed=1):
        cx, cy, sx, sy = (x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0
        P0 = 6.4; zp = P0 + 0.2; KR = K.R; Rb = random.Random(seed * 131 + 7); K.R = Rb; seg0 = K.seg; K.seg = 60.0      # hohe Bauteile nicht fein teilen
        base = H.rect(cx, cy, sx, sy)
        K.lm = True
        with K.at((0, 0, 0.2)): H.shaft(K, base, 0.0, P0, 'b', H.T_DARK)
        K.lm = False
        corners = {'s': ((x0, y0), (x1, y0)), 'n': ((x1, y1), (x0, y1)), 'e': ((x1, y0), (x1, y1)), 'w': ((x0, y1), (x0, y0))}
        # Mittelbau: vier bis acht Geschosse über dem Sockel, bündig, mit Rippen oder Gesimsen und Technik auf dem Dach
        zb = zp + 3.2 * Rb.randint(4, 8); km = Rb.choice(['c', 'b', 'c', 'a', 'b'])
        H.shaft(K, base, zp, zb, km, Rb.choice(H.PALETTE)); H.band(K, base, zp - 0.4, 0.8, 0.3, 'hull_dark', None, strip='beam'); H.parapet(K, base, zb, 1.2, 0.3)
        if km != 'b': H.fins(K, base, zp + 0.4, zb, 6.0, 0.5, 0.4)
        else: H.ledges(K, base, zp, zb, 6.4, 0.4, 0.4)
        H.roof_mech(K, base, zb, 4)
        # Hochhäuser: auf langen Blöcken zwei, sonst eines; einzelne Blöcke tragen einen der ausgearbeiteten Turmtypen
        long = sy >= sx; Lm = max(sx, sy); Ls = min(sx, sy); nt = 2 if Lm >= 78 else 1; hn = H.F32(h * 1.5)
        for i in range(nt):
            off = ((-0.25 if i == 0 else 0.25) * Lm if nt == 2 else 0.0) + Rb.uniform(-2, 2)
            tx, ty = (cx, cy + off) if long else (cx + off, cy)
            if hero and i == 0:
                H.PODIUM = False
                try:
                    with K.at((0, 0, zb - (12.8 if hero == 'konzern' else 9.6))):
                        if hero == 'konzern': H.tower_konzern(K, (tx, ty), max(190.0, hn + 40))
                        elif hero == 'stufen': H.tower_stufen(K, (tx, ty), max(150.0, hn + 20))
                        elif hero == 'kern': H.tower_kern(K, (tx, ty), max(170.0, hn + 30))
                        elif hero == 'rund': H.tower_rund(K, (tx, ty), max(150.0, hn + 10))
                        else: H.tower_werk(K, (tx, ty), max(120.0, hn))
                finally: H.PODIUM = True
            else:
                w = min(Ls - 7, Rb.uniform(26, 36)); d = min(Lm / nt - 9, Rb.uniform(24, 36)); tw, td = (w, d) if long else (d, w)
                H.tower_bundle(K, (tx, ty), seed * 3 + i * 17, zb + hn * (1.0 if i == 0 else Rb.uniform(0.62, 0.9)), tw, td, zbase=zb)
        # Kantenneon: senkrechte Schilder an zwei Ecken des Mittelbaus
        for (px, py, nn) in ((x0 - 0.3, y0 + 2.5, 'w'), (x1 + 0.3, y1 - 2.5, 'e')):
            if Rb.random() < 0.6:
                rz, u, nv = FACES[nn]; K.neon(Rb.choice(VERT), (px, py, P0 + 7 + Rb.random() * 6), u, Z, 2.4)
        # große Tafel an einer Ladenseite
        if shopsides and Rb.random() < 0.75:
            nn = shopsides[0]; rz, u, nv = FACES[nn]
            a, b = corners[nn]; mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
            H.billboard(K, mx, my, min(zb - 4.0, P0 + 9 + Rb.random() * 8), nv[0], nv[1], min(16.0, max(sx, sy) * 0.3), Rb.choice(SIGNS[:11]), 0.7, glow='cool')
        # Ladenzeilen im Sockel, darüber Auslegerschilder
        for nn in shopsides:
            a, b = corners[nn]; L = math.hypot(b[0] - a[0], b[1] - a[1]); nb = max(1, int(L // 9)); w = L / nb
            rz, u, nv = FACES[nn]
            for i in range(nb):
                t = (i + 0.5) / nb; px, py = a[0] + (b[0] - a[0]) * t + nv[0] * 0.02, a[1] + (b[1] - a[1]) * t + nv[1] * 0.02
                K.seg = seg0; k = bay(px, py, nn, w - 0.2); K.seg = 60.0
                if k in ('shop', 'bar') and len(shops) < 40: shops.append((px + nv[0] * 2.6, py + nv[1] * 2.6, k))
                if Rb.random() < 0.32:
                    t2 = i / nb; S.blade_sign(K, a[0] + (b[0] - a[0]) * t2 + (b[0] - a[0]) / L * 0.6, a[1] + (b[1] - a[1]) * t2 + (b[1] - a[1]) / L * 0.6, P0 + 2.6 + Rb.random() * 5, nv[0], nv[1], Rb.choice(VERT), Rb.uniform(1.0, 1.4))
        # Klimakästen, Steigrohre und Rohrleitungen an den Fassaden über der Gasse
        H.ac_units(K, base, zp + 1, zb - 2, 10)
        for nn in shopsides:
            a, b = corners[nn]; rz, u, nv = FACES[nn]; L = math.hypot(b[0] - a[0], b[1] - a[1]); ex, ey = (b[0] - a[0]) / L, (b[1] - a[1]) / L
            t = Rb.random(); px, py = a[0] + (b[0] - a[0]) * t + nv[0] * 0.35, a[1] + (b[1] - a[1]) * t + nv[1] * 0.35
            K.tube((px, py, 0.2), (px, py, min(zb - 1, 30)), 0.18, 'pipe', Rb.choice(['steel', 'rust', 'yellow']), 8)
            if Rb.random() < 0.4 and L > 30:
                t0, t1 = Rb.uniform(0.05, 0.3), Rb.uniform(0.6, 0.95)
                S.pipe_run(K, (a[0] + ex * L * t0, a[1] + ey * L * t0), (a[0] + ex * L * t1, a[1] + ey * L * t1), zp + Rb.uniform(2.6, 5.0), Rb.uniform(0.25, 0.4), Rb.choice(['hull_mid', 'rust', 'yellow', 'hull_light']), 0.7, drop=False)
        K.R = KR; K.seg = seg0

    # ------------------------------------------------------------ Gasse: Belag, Kabelbündel mit Lampions, Laufbrücken, Abfall, Dampf
    def alley(a, b, w, bridges=True):
        ax, ay = a; bx, by = b; L = math.hypot(bx - ax, by - ay); ux, uy = (bx - ax) / L, (by - ay) / L; nx, ny = -uy, ux
        # Längsgassen bekommen die Fahrbahn (Rinnen, Linien, Schienenbett), Quergassen einen Mittelstreifen aus Metalldeck
        K.lm = True
        if abs(ux) < 0.01: S.road(K, (ax, min(ay, by) - 0.5), (ax, max(ay, by) + 0.5), w - 0.3, 0.216)
        else:
            S.ground(K, min(ax, bx) - 0.5, ay - w / 2 + 0.1, max(ax, bx) + 0.5, ay + w / 2 - 0.1, 0.207, 'kit_sta', 8.0)      # Pflaster über die ganze Breite (trägt das vorberechnete Licht)
            S.ground(K, min(ax, bx) - 0.5, ay - 1.4, max(ax, bx) + 0.5, ay + 1.4, 0.213, 'kit_stc', 4.0)
        K.lm = False
        n = int(L // 8)
        for i in range(1, n):
            t = i / n; px, py = ax + (bx - ax) * t, ay + (by - ay) * t
            if R.random() < 0.75:
                z1, z2 = 7.5 + R.random() * 9, 7.5 + R.random() * 9
                p1 = (px - nx * w / 2 + ux * R.uniform(-2, 2), py - ny * w / 2 + uy * R.uniform(-2, 2), z1); p2 = (px + nx * w / 2, py + ny * w / 2, z2)
                S.cable_span(K, p1, p2, 0.6 + R.random() * 0.8, R.choice([0, 1, 1, 2, 3]), (R.choice(['lamp', 'lamp', 'light', 'accent', 'redlamp', 'cool']),), 0.0, 2, 5)
            if R.random() < 0.35: K.decal(R.choice(['stain1', 'stain2']), (px + nx * R.uniform(-w / 3, w / 3), py + ny * R.uniform(-w / 3, w / 3), 0.224), X, Y, 3 + R.random() * 3, 2 + R.random() * 3, 'black', off=0.01)
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
    K.slab(410, 485, 0.2, (0, 7.5, 0), tint=(1.0, 1.0, 1.0), cell=8.0, mat='kit_sta', uvm=8.0,
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
    hx0, hx1, hy0, hy1, hh = -40.0, 40.0, -20.0, 50.0, RZ + 3.2 * 36; K.seg = 60.0
    ht = H.rect(0, 15, 80, 70); H.shaft(K, ht, RZ, hh, 'a', H.T_BLUE); H.fins(K, ht, RZ, hh, 6.0, 0.9, 0.5); H.ledges(K, ht, RZ, hh, 25.6, 0.6, 1.1)
    for q in ht: H.lstrip(K, q[0] + (0.5 if q[0] > 0 else -0.5), q[1] + (0.5 if q[1] > 15 else -0.5), RZ + 3, hh - 3, 'light', 0.6)
    for (c, u) in (((0, hy0 - 1.2, hh - 9), X), ((0, hy1 + 1.2, hh - 9), (-1, 0, 0)), ((hx1 + 1.2, 15, hh - 9), Y), ((hx0 - 1.2, 15, hh - 9), (0, -1, 0))):
        K.neon('n_lumen', c, u, Z, 34.0)
    hz = H.step_crown(K, ht, hh, 2, 'b', H.T_DARK, 'light', 8)
    K.box((10, 10, 6), (0, 15, hz), side='girder', top='roofing', tint='hull_dark', bevel=0.06)
    K.tube((0, 15, hz + 6), (0, 15, hz + 34), 0.6, 'pipe', 'steel', 10, r2=0.2)
    for z in (hz + 14, hz + 24, hz + 34): p = (0, 15, z); K.glowbox('redlamp', (0.5, 0.5, 0.5), p); K.light('redlamp', p, 6.0)
    hh = hz; K.seg = 8.0
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
    K.lm = True; K.block(2 * PXH, PY1 - PY0, PH, (0, (PY0 + PY1) / 2, 0), tint='hull_dark', tint_top='hull_dark', plinth=0.6, cornice=0.5); K.lm = False
    K.seg = 60.0; kt = H.rect(0, 87, 40, 50); H.shaft(K, kt, PH, PH + 64.0, 'c', H.T_SAND); H.fins(K, kt, PH, PH + 64.0, 6.0, 0.6, 0.4); H.parapet(K, kt, PH + 64.0, 1.2, 0.3)
    H.roof_mech(K, kt, PH + 64.0, 4); H.crown_spikes(K, kt, PH + 64.0, 5, (8, 20), 0.5); K.seg = 8.0
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
    K.lm = True
    K.slab(2 * MX, MY1 - MY0, 0.2, (0, (MY0 + MY1) / 2, 0), tint=(1.12, 1.12, 1.14), cell=2.0, mat='kit_sta', uvm=8.0, holes=[(-11, 160 - 11 - (MY0 + MY1) / 2, 11, 160 + 11 - (MY0 + MY1) / 2)])
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
        S.glass_rail(K, (a[0], a[1], 0.2), (b[0], b[1], 0.2))
    for (gx0, gy0, gx1, gy1) in ((-14.5, 145.5, 14.5, 148.6), (-14.5, 171.4, 14.5, 174.5), (-14.5, 148.6, -11.4, 171.4), (11.4, 148.6, 14.5, 171.4)): S.ground(K, gx0, gy0, gx1, gy1, 0.213, 'kit_stc', 4.0)
    with K.at((0, 0, 0.2)):
        S.ad_pylon(K, -24.0, 150.0, 4.6, None, False); S.ad_pylon(K, 24.0, 170.0, 4.6, None, False)
    for p in ((-22, 132), (22, 132), (-22, 186), (22, 186)): K.planter(2.4, 1.4, (p[0], p[1], 0.2), 0.0, 0.8, 3)
    K.lm = False
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
        for bi, (x0, y0, x1, y1, h, sides) in enumerate(BLOCKS):
            if s < 0:
                x0, x1 = -x1, -x0
                sides = sides.translate(str.maketrans('ew', 'we'))
            tower(x0, y0, x1, y1, h + R.uniform(-6, 6), sides, HERO.get((s, bi)), bi + 1 + (100 if s < 0 else 0))
        for (a, b, w) in ALLEYS:
            alley((s * a[0], a[1]), (s * b[0], b[1]), w)
    tower(-36, 204, 36, 250, 118, 's', 'konzern', 77)
    K.neon('a_lumen', (0, 203.7, 30.0), X, Z, 20.0)
    alley((-36, 200), (36, 200), 8, bridges=False)
    paths.append(((-36, 124), (36, 124))); paths.append(((-36, 192), (36, 192)))
    K.lamps = []                                                         # Lichtquellen der Blender-Vorschau: hier nicht nötig
    ob = K.build('Neon_Kit'); S.SPRITES = True
    # Leuchtpunkte ausdünnen (jeder ist im Spiel ein eigenes Bildchen): unten alle, oben jede dritte Flugbefeuerung und die großen Tafeln
    L = json.loads(ob['kit_lights']); keep = [l for i, l in enumerate(L) if (l['p'][1] < 32 and (l['s'] >= 2.0 or i % 2 == 0)) or (l['p'][1] >= 32 and ((l['k'] == 'redlamp' and i % 4 == 0) or (l['k'] == 'screen' and l['s'] >= 8 and i % 3 == 0)))]
    ob['kit_lights'] = json.dumps(keep)
    return ob, {'steam': steam, 'holos': holos, 'paths': paths, 'stalls': stalls, 'shops': shops}

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
