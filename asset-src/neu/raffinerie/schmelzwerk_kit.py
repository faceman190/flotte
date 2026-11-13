# Schmelzwerk Zwölf – Großraffinerie auf dem Bergbaumond (Kupferbucht), gebaut mit dem Baukasten (kit_lib.py) und den Bausteinen
# der Hochhäuser und Straßen (asset-src/neu/stadt/hochhaus_kit.py, strassen_kit.py). Läuft in Blender (Schmelzwerk.blend).
#
# Vorderseite nach -Y, Ursprung = Boden in der Mitte des Leitstands (wie beim Außenposten). Das Landefeld liegt gerade vor dem Leitstand:
# Das Spiel sucht die Tür an der ersten Wand zwischen Feld und Ursprung, deshalb bleibt dieser Streifen frei von hohen Aufbauten.
# Anlage: Leitstand mit Nummernturm, zwei Schmelztürme (dunkle, sich verjüngende Monolithen mit roten Lichtschlitzen und Ofenglut),
# Ofenhalle mit Schloten, Brecher mit Förderbändern und Erzhalden, Tanklager mit Rohrbrücke, drei Fackelmasten, Frachtfeld mit Kran,
# Wohnmodule auf Stelzen, Lichtmasten. Zusatzangaben fürs Spiel: Landefeld, Fackeln, Dampf (meta()).
#
# Aufruf:  ob, extra = schmelzwerk_kit.build(lib);  lib.bake_ao(ob, 6.0, 16);  lib.export(ob, 'Schmelzwerk', schmelzwerk_kit.meta(extra), kind='base')
#          ob2 = schmelzwerk_kit.build_bohrturm(lib);  lib.export(ob2, 'Bohrturm', {'R': 14}, kind='base')
import math, random
import hochhaus_kit as H
import strassen_kit as S

PI = math.pi
PAD = (-10.0, -72.0)       # Mitte des Landefelds (Blender x, y)
NUM = '12'

def _T(tint):
    import kit_lib as L_
    return L_.T(tint)
def tquad(K, bl, br, tr, tl, mat='kit_hhb', tint='none'):
    """Schräges Fassadenfeld (Trapez): unten breiter als oben; das Fassadenbild läuft mit."""
    L = math.dist(bl, br); Lt = math.dist(tl, tr); hh = math.dist(bl, tl); u0 = 3.0 * K.R.randrange(8); du = (L - Lt) / 2; v0 = 0.125 * K.R.randrange(8)
    K.poly((bl, br, tr, tl), ((u0 / 24, v0), ((u0 + L) / 24, v0), ((u0 + L - du) / 24, v0 + hh / 25.6), ((u0 + du) / 24, v0 + hh / 25.6)), _T(tint), mat)
def lattice(K, x, y, z0, h, s0, s1, tint='hull_dark', step=4.0, w=0.22):
    """Gittermast: vier Eckstiele (unten s0, oben s1 Abstand von der Mitte), Riegel und Diagonalen."""
    def B(a, b, ww=w): K.beam(a, b, ww, ww, 'beam', tint, bevel=0.0)
    n = max(1, round(h / step))
    for (sx, sy) in ((-1, -1), (1, -1), (1, 1), (-1, 1)): B((x + sx * s0, y + sy * s0, z0), (x + sx * s1, y + sy * s1, z0 + h), w * 1.2)
    for i in range(n):
        za, zb = z0 + h * i / n, z0 + h * (i + 1) / n; ra, rb = s0 + (s1 - s0) * i / n, s0 + (s1 - s0) * (i + 1) / n; f = 1 if i % 2 else -1
        B((x - ra * f, y - ra, za), (x + rb * f, y - rb, zb), w * 0.6); B((x - ra * f, y + ra, za), (x + rb * f, y + rb, zb), w * 0.6)
        B((x - ra, y - ra * f, za), (x - rb, y + rb * f, zb), w * 0.6); B((x + ra, y - ra * f, za), (x + rb, y + rb * f, zb), w * 0.6)
        for (a, b) in (((-1, -1), (1, -1)), ((1, -1), (1, 1)), ((1, 1), (-1, 1)), ((-1, 1), (-1, -1))): B((x + a[0] * rb, y + a[1] * rb, zb), (x + b[0] * rb, y + b[1] * rb, zb), w * 0.7)

# ------------------------------------------------------------------ Schmelzturm
def monolith(K, x, y, rz=0.0, w=15.0, d=11.0, h=58.0, seed=1):
    """Dunkler Monolith in drei sich verjüngenden Abschnitten: Maschinensockel mit Ofenmaul (Glut), Seitenpfeiler, Steigleitungen,
    Kopf mit roten Lichtschlitzen, Positionslichter. Das Ofenmaul zeigt nach -Y."""
    R = random.Random(seed * 17 + 3); KR = K.R; K.R = R
    try:
        with K.at((x, y, 0), rz):
            K.box((w + 9, d + 8, 2.4), (0, 0, 0), side='girder', top='floor', tint='hull_dark', bevel=0.08); z0 = 2.4
            secs = [(1.0, 1.0, z0, h * 0.44), (0.85, 0.88, h * 0.44, h * 0.8), (0.68, 0.76, h * 0.8, h)]; t = None
            for k, (fw, fd, za, zb) in enumerate(secs):
                b = H.rect(0, 0, w * fw, d * fd); t = H.rect(0, 0, w * fw * 0.93, d * fd * 0.95)
                for i in range(4): tquad(K, (*b[i], za), (*b[(i + 1) % 4], za), (*t[(i + 1) % 4], zb), (*t[i], zb), 'kit_hhb', H.T_DARK)
                K.ngon([(p[0], p[1], zb) for p in t], 'roof', 'hull_dark')
                H.band(K, t, zb - 1.4, 1.8, 0.55, 'hull_dark', 'redlamp' if k == 2 else None, strip='girder')
                if k < 2: H.band(K, b, za, 1.0, 0.4, 'hull_dark', None, strip='beam')
            # Seitenpfeiler und Rippen
            for s in (-1, 1):
                H.pier(K, s * (w / 2 + 0.5), 0, 1.6, d * 0.5, 0.0, z0, h * 0.78, H.T_DARK)
                for yy in (-d * 0.3, d * 0.3): K.box((0.5, 0.6, h * 0.4), (s * (w / 2 + 0.2), yy, z0), side='beam', tint='hull_dark', bevel=0.0, along='z')
            # Kopf: rote Lichtschlitze vorn und hinten, Lüfter, Antennen
            tw, td = w * 0.68 * 0.93, d * 0.76 * 0.95
            for s in (-1, 1):
                for j in (-1, 0, 1):
                    K.box((0.9, 0.3, 5.0), (j * tw * 0.27, s * (td / 2 + 0.75), h * 0.86), side='beam', tint='black', bevel=0.0, along='z', bottom=True)
                    K.glow('redlamp', (j * tw * 0.27, s * (td / 2 + 0.91), h * 0.86 + 2.5), (-s, 0, 0), (0, 0, 1), 0.5, 4.2)
                K.light('redlamp', (0, s * (td / 2 + 1.4), h * 0.9), 9.0)
            K.vent_unit((0, 0, h), sx=min(3.0, tw - 2), sy=min(3.0, td - 2), sz=1.4); K.antenna(9.0, (tw * 0.32, td * 0.25, h)); K.antenna(5.0, (-tw * 0.3, -td * 0.2, h))
            H.avlights(K, t, h)
            # Ofenmaul im Sockelgeschoss: Rahmen, Glut hinter Gitterstäben, Warnrand, Schlackerinne
            fy = -d / 2 - 0.2
            K.box((7.4, 2.6, 6.2), (0, fy - 1.0, z0), side='girder', tint='hull_dark', bevel=0.06)
            K.glow('lamp', (0, fy - 2.33, z0 + 2.6), (1, 0, 0), (0, 0, 1), 5.4, 3.6); K.light('lamp', (0, fy - 3.2, z0 + 2.4), 7.0)
            for j in range(7): K.box((0.18, 0.2, 3.8), (-2.4 + j * 0.8, fy - 2.45, z0 + 0.7), side='plain', tint='black', bevel=0.0, along='z', bottom=True)
            K.box((7.8, 0.5, 0.5), (0, fy - 2.3, z0 + 5.4), side='hazard', tint='none', bevel=0.02, bottom=True); K.box((7.8, 0.5, 0.5), (0, fy - 2.3, z0 + 0.1), side='hazard', tint='none', bevel=0.02, bottom=True)
            K.box((3.0, 5.0, 0.5), (0, fy - 5.0, 0.3), side='girder', top='floor', tint='hull_dark', bevel=0.04); K.glow('lamp', (0, fy - 5.0, 0.82), (1, 0, 0), (0, 1, 0), 1.6, 4.2)
            # Steigleitungen hinten, Leiter, Schaltkasten, Geländer auf dem Sockel
            bb = H.rect(0, 0, w, d); H.risers(K, bb[2], bb[3], 0.3, z0, h * 0.42, 4, 0.35, 'rust'); H.risers(K, bb[2], bb[3], 0.75, z0, h * 0.3, 2, 0.5, 'hull_mid')
            K.ladder(h * 0.42 - z0, (w / 2 + 1.35, -d * 0.1, z0), PI / 2); K.panel('ctrl', (-w / 2 + 1.5, -d / 2, z0 + 1.0), 0.0, 1.0, 1.0, 0.3, 'hull_light', glow='screen')
            for (a, b_) in (((-(w + 9) / 2 + 0.2, -(d + 8) / 2 + 0.2), ((w + 9) / 2 - 0.2, -(d + 8) / 2 + 0.2)), (((w + 9) / 2 - 0.2, -(d + 8) / 2 + 0.2), ((w + 9) / 2 - 0.2, (d + 8) / 2 - 0.2)), ((-(w + 9) / 2 + 0.2, (d + 8) / 2 - 0.2), (-(w + 9) / 2 + 0.2, -(d + 8) / 2 + 0.2))):
                if a[1] == b_[1]:      # vorn: Lücke vor dem Ofenmaul
                    K.railing((a[0], a[1], z0), (-4.6, a[1], z0)); K.railing((4.6, a[1], z0), (b_[0], b_[1], z0))
                else: K.railing((a[0], a[1], z0), (b_[0], b_[1], z0))
            K.stairs(2.0, z0, ((w + 9) / 2 - 2.0, -(d + 8) / 2, 0), 0.0)
            K.number(str(seed), (0, -d / 2 + 0.12, z0 + 12.0), (1, 0, 0), (0, 0, 1), 3.2, 'white', 0.02)
    finally: K.R = KR

# ------------------------------------------------------------------ Fackelmast
def flare_stack(K, x, y, h=44.0):
    """Fackelmast: Gittermast um ein Abgasrohr, Brennerkopf, Ringbühne, Leiter, Abspannseile. Gibt die Lage der Flamme zurück."""
    K.box((6.0, 6.0, 1.2), (x, y, 0), side='girder', top='floor', tint='hull_dark', bevel=0.06)
    lattice(K, x, y, 1.2, h - 5.0, 2.4, 0.9, 'rust', 4.0)
    K.tube((x, y, 1.2), (x, y, h), 0.55, 'pipe', 'hull_mid', 10, caps=False); K.tube((x, y, h), (x, y, h + 2.2), 0.95, 'girder', 'hull_dark', 10, mode='around', r2=0.75)
    for z in (h * 0.3, h * 0.6, h - 5.0): K.tube((x, y, z - 0.15), (x, y, z + 0.15), 0.72, 'plain', 'steel', 10, caps=False)
    zp = h * 0.62; K.tube((x, y, zp - 0.2), (x, y, zp), 3.0, 'girder', 'hull_dark', 12, mode='around'); K.tube((x, y, zp + 1.0), (x, y, zp + 1.1), 3.0, 'plain', 'yellow', 12, caps=False)
    for i in range(12): a = i / 12 * 2 * PI; K.tube((x + math.cos(a) * 2.95, y + math.sin(a) * 2.95, zp), (x + math.cos(a) * 2.95, y + math.sin(a) * 2.95, zp + 1.05), 0.04, 'plain', 'hull_dark', 5, caps=False)
    K.ladder(zp - 1.2, (x, y - 2.5, 1.2))
    for i in range(3):
        a = i * 2 * PI / 3 + 0.5; ex, ey = x + math.cos(a) * 16, y + math.sin(a) * 16
        K.cable((x + math.cos(a) * 1.0, y + math.sin(a) * 1.0, h - 6.0), (ex, ey, 0.6), 0.6, 0.05, 6); K.box((1.4, 1.4, 0.7), (ex, ey, 0), side='girder', tint='hull_dark', bevel=0.04)
    K.glowbox('redlamp', (0.4, 0.4, 0.4), (x + 1.3, y, h - 5.0)); K.light('redlamp', (x + 1.3, y, h - 5.0), 5.0)
    return (x, y, h + 2.4)

# ------------------------------------------------------------------ Förderband, Brecher, Halden
def conveyor(K, a, b, w=2.4, cover=True, tint='yellow'):
    """Förderband von a nach b (mit Höhe): Gurt, Seitenwangen, Tragrollen, Abdeckhauben, Stützböcke bis zum Boden."""
    L = math.dist(a, b); ux, uy, uz = (b[0] - a[0]) / L, (b[1] - a[1]) / L, (b[2] - a[2]) / L; hl = math.hypot(ux, uy) or 1e-6; nx, ny = -uy / hl, ux / hl
    P = lambda t, s=0.0, dz=0.0: (a[0] + (b[0] - a[0]) * t + nx * s, a[1] + (b[1] - a[1]) * t + ny * s, a[2] + (b[2] - a[2]) * t + dz)
    K.beam(P(0), P(1), w, 0.22, 'floor', 'hull_dark', bevel=0.0)
    for s in (-1, 1): K.beam(P(0, s * (w / 2 + 0.12), 0.25), P(1, s * (w / 2 + 0.12), 0.25), 0.2, 0.9, 'girder', tint, bevel=0.0); K.beam(P(0, s * (w / 2 + 0.12), -0.9), P(1, s * (w / 2 + 0.12), -0.9), 0.16, 0.16, 'beam', 'hull_dark', bevel=0.0)
    n = max(2, int(L // 3.2))
    for i in range(n + 1):
        t = i / n
        K.beam(P(t, -w / 2, 0.2), P(t, w / 2, 0.2), 0.16, 0.16, 'plain', 'steel', bevel=0.0)
        if i < n:
            f = 1 if i % 2 else -1
            for s in (-1, 1): K.beam(P(t, s * (w / 2 + 0.12), -0.9 if f > 0 else -0.1), P((i + 1) / n, s * (w / 2 + 0.12), -0.1 if f > 0 else -0.9), 0.1, 0.1, 'beam', 'hull_dark', bevel=0.0)
            if cover and i % 3 != 2: K.beam(P(t + 0.02 / max(L, 1), 0, 1.0), P((i + 1) / n - 0.02 / max(L, 1), 0, 1.0), w + 0.5, 1.1, 'wall_b', 'hull_light', bevel=0.0)
    m = max(1, int(L // 11))
    for i in range(m + 1):
        t = (i + 0.5) / (m + 1) if m > 1 else (0.5 if i == 0 else 2.0)
        if t > 1: continue
        c = P(t, 0, -1.0)
        if c[2] < 1.6: continue
        for s in (-1, 1): K.beam((c[0] + nx * s * (w / 2 + 1.4), c[1] + ny * s * (w / 2 + 1.4), 0.0), (c[0] + nx * s * (w / 2), c[1] + ny * s * (w / 2), c[2]), 0.3, 0.3, 'girder', 'hull_dark', bevel=0.0)
        K.beam((c[0] - nx * (w / 2 + 1.1), c[1] - ny * (w / 2 + 1.1), c[2] * 0.3), (c[0] + nx * (w / 2 + 0.4), c[1] + ny * (w / 2 + 0.4), c[2] * 0.85), 0.14, 0.14, 'beam', 'hull_dark', bevel=0.0)
        K.box((w + 4.0, 1.0, 0.4), (c[0], c[1], 0), side='girder', tint='hull_dark', bevel=0.03, rz=math.atan2(ny, nx))
def ore_pile(K, x, y, r, h, tint=(0.3, 0.22, 0.17), seed=1):
    """Erzhalde: unregelmäßiger Kegel mit Betonbild (kachelt in Metern), dunkel getönt."""
    R = random.Random(seed * 13 + 1); n = 12; t = _T(tint); uv = lambda p: (p[0] / 4.0, p[1] / 4.0)
    A = [(x + math.cos(i / n * 2 * PI) * r * R.uniform(0.85, 1.12), y + math.sin(i / n * 2 * PI) * r * R.uniform(0.85, 1.12), -0.1) for i in range(n)]
    B = [(x + math.cos(i / n * 2 * PI + 0.2) * r * 0.52 * R.uniform(0.85, 1.15), y + math.sin(i / n * 2 * PI + 0.2) * r * 0.52 * R.uniform(0.85, 1.15), h * R.uniform(0.5, 0.68)) for i in range(n)]
    C = (x + R.uniform(-0.6, 0.6), y + R.uniform(-0.6, 0.6), h)
    for i in range(n):
        j = (i + 1) % n
        K.poly((A[i], A[j], B[j], B[i]), (uv(A[i]), uv(A[j]), uv(B[j]), uv(B[i])), t, 'kit_concrete')
        K.poly((B[i], B[j], C), (uv(B[i]), uv(B[j]), uv(C)), (t[0] * 1.12, t[1] * 1.12, t[2] * 1.12), 'kit_concrete')
def crusher(K, x, y, rz=0.0):
    """Brecherhaus: Stahlgerüst mit Aufgabetrichter, Brechergehäuse, Bühnen mit Geländer und Treppe, Antrieb, Staubfilter."""
    with K.at((x, y, 0), rz):
        K.box((16, 13, 0.6), (0, 0, 0), side='girder', top='floor', tint='hull_dark', bevel=0.05)
        for sx in (-1, 1):
            for sy in (-1, 1): K.box((0.7, 0.7, 15.0), (sx * 6.2, sy * 4.8, 0.6), side='girder', tint='rust', bevel=0.0, along='z')
        for z in (5.6, 10.6, 15.4):
            for sy in (-1, 1): K.beam((-6.2, sy * 4.8, z), (6.2, sy * 4.8, z), 0.5, 0.5, 'girder', 'rust', bevel=0.0)
            for sx in (-1, 1): K.beam((sx * 6.2, -4.8, z), (sx * 6.2, 4.8, z), 0.5, 0.5, 'girder', 'rust', bevel=0.0)
        for sy in (-1, 1):
            K.beam((-6.2, sy * 4.8, 0.6), (6.2, sy * 4.8, 5.6), 0.22, 0.22, 'beam', 'hull_dark', bevel=0.0); K.beam((6.2, sy * 4.8, 0.6), (-6.2, sy * 4.8, 5.6), 0.22, 0.22, 'beam', 'hull_dark', bevel=0.0)
        K.box((9.0, 7.0, 5.0), (0, 0, 5.6), side='siding', top='roof', tint='hull_mid', bevel=0.06)            # Brechergehäuse
        K.box((9.6, 0.4, 0.5), (0, -3.7, 7.8), side='hazard', tint='none', bevel=0.02, bottom=True)
        with K.at((0, 0, 10.6), PI / 4): K.tube((0, 0, 0), (0, 0, 5.4), 3.2, 'wall_b', 'hull_light', 4, mode='around', r2=7.2, caps=False)      # Trichter
        K.ring(10.4, 10.4, 16.0, 0.4, 0.5, 'girder', 'yellow')
        K.box((3.2, 2.4, 2.2), (-7.9, 0, 0.6), side='plain', tint='hull_mid', bevel=0.06); K.tube((-6.3, 0, 1.8), (-4.4, 0, 6.6), 0.35, 'pipe', 'yellow', 8)      # Antrieb
        K.box((3.0, 3.0, 6.0), (7.9, 3.0, 0.6), side='siding', top='roof', tint='hull_light', bevel=0.06); K.tube((7.9, 3.0, 6.6), (7.9, 3.0, 11.0), 0.7, 'pipe', 'hull_mid', 10)      # Staubfilter mit Abluft
        K.platform(5.0, 4.0, 5.6, (0, -8.6, 0), 0.0, -1); K.railing((-6.2, -4.9, 5.6), (-2.6, -4.9, 5.6)); K.railing((2.6, -4.9, 5.6), (6.2, -4.9, 5.6))
        K.panel('ctrl', (-3.0, -3.5, 6.2), 0.0, 1.0, 1.0, 0.25, 'hull_light', glow='screen'); K.signpost('w_achtung', (9.5, -7.5, 0), 0.3, 2.6, 0.9)
        K.glowbox('lamp', (0.4, 0.4, 0.3), (-6.2, -4.8, 15.9)); K.light('lamp', (-6.2, -4.8, 16.0), 4.0); K.glowbox('lamp', (0.4, 0.4, 0.3), (6.2, 4.8, 15.9)); K.light('lamp', (6.2, 4.8, 16.0), 4.0)

# ------------------------------------------------------------------ Halle, Tanks, Rohrbrücke
def furnace_hall(K, x, y, sx=78.0, sy=34.0, h=19.2):
    """Ofenhalle: Paneelwände, Rippen, Dachreiter mit Glutschein, großes Tor nach -Y, drei Schlote. Gibt die Schlotmündungen zurück."""
    p = H.rect(x, y, sx, sy); H.shaft(K, p, 0.0, h, 'b', H.T_MID); H.parapet(K, p, h, 1.2, 0.35); H.fins(K, p, 0.0, h, 9.0, 0.7, 0.6, 'girder'); H.ledges(K, p, 0.0, h, 6.4, 0.4, 0.35)
    K.gate(12.0, 9.0, 1.6, (x - sx * 0.26, y - sy / 2, 0), 0.0, number=NUM)
    K.gate(8.0, 7.0, 1.4, (x + sx * 0.3, y - sy / 2, 0), 0.0)
    for k in range(3):      # Dachreiter: lange Aufsätze mit warmem Lichtband (die Glut der Öfen)
        yy = y - sy * 0.3 + k * sy * 0.3
        K.box((sx * 0.8, 3.4, 2.6), (x, yy, h), side='siding', top='roof', tint='hull_dark', bevel=0.05)
        for s in (-1, 1): K.glow('lamp', (x, yy + s * 1.72, h + 1.5), (-s, 0, 0), (0, 0, 1), sx * 0.74, 0.7)
    tops = []
    for k, (cx, r, ch) in enumerate(((x + sx * 0.36, 2.2, 30.0), (x + sx * 0.36 - 7.0, 1.6, 22.0), (x - sx * 0.38, 1.9, 26.0))):
        cy = y + sy / 2 + 4.0
        K.box((r * 3.2, r * 3.2, 3.0), (cx, cy, 0), side='girder', tint='hull_dark', bevel=0.06)
        K.tube((cx, cy, 3.0), (cx, cy, h + ch), r, 'siding', 'hull_light', 14, mode='around', r2=r * 0.72)
        for t in (0.45, 0.72, 0.97): zz = 3.0 + (h + ch - 3.0) * t; K.tube((cx, cy, zz), (cx, cy, zz + 1.0), r * (1.0 - 0.28 * t) + 0.1, 'hazard', 'none', 14, mode='around', caps=False)
        K.pipe([(cx, cy - r - 0.3, 6.0), (cx, y + sy / 2 + 0.6, 6.0)], 0.6, 'hull_mid'); K.glowbox('redlamp', (0.5, 0.5, 0.5), (cx + r * 0.8, cy, h + ch)); K.light('redlamp', (cx + r * 0.8, cy, h + ch), 5.0)
        K.ladder(h + ch - 6.0, (cx - r * 0.86, cy, 3.0), -PI / 2)
        tops.append((cx, cy, h + ch + 0.5))
    H.roof_mech(K, H.rect(x, y, sx * 0.5, sy * 0.4), h, 4); H.ac_units(K, p, 3, h - 2, 8)
    H.risers(K, p[1], p[2], 0.35, 0.0, h - 1, 4, 0.35, 'rust'); H.risers(K, p[3], p[0], 0.6, 0.0, h - 4, 3, 0.4)
    H.billboard(K, x + sx * 0.02, y - sy / 2, h - 5.0, 0, -1, 15.0, 'n_volta', 0.8, glow='lamp')
    return tops
def tank_farm(K, x, y):
    """Tanklager: sechs stehende Tanks in zwei Reihen mit Laufsteg, Kugeltank, liegende Tanks, Auffangwanne."""
    K.box((44, 28, 0.5), (x, y, 0), side='girder', top='floor', tint='hull_dark', bevel=0.05)
    for i in range(3):
        for j in range(2):
            tx, ty = x - 13 + i * 13, y - 6.5 + j * 13; r = 4.6; hh = 13.0 + ((i + j) % 2) * 2.5
            K.tube((tx, ty, 0.5), (tx, ty, 0.5 + hh), r, 'siding', ('hull_light', 'white', 'hull_mid')[(i + j) % 3], 18, mode='around', caps=False)
            K.tube((tx, ty, 0.5 + hh), (tx, ty, 0.5 + hh + 1.6), r, 'roofing', 'hull_light', 18, mode='around', r2=r * 0.25)
            for zz in (4.0, hh - 0.6): K.tube((tx, ty, zz), (tx, ty, zz + 0.4), r + 0.08, 'beam', 'yellow' if zz < 5 else 'hull_dark', 18, mode='around', caps=False)
            K.ladder(hh, (tx, ty - r - 0.02, 0.5)); K.pipe([(tx + r + 0.4, ty, 0.9), (tx + r + 0.4, ty, 3.0), (tx + r + 0.4, y + 14.6, 3.0)], 0.3, 'yellow' if j else 'steel')
            if (i + j) % 2 == 0: K.number(str(i * 2 + j + 1), (tx, ty - r - 0.06, 8.0), (1, 0, 0), (0, 0, 1), 2.2, 'white', 0.3)
    K.walkway(34.0, 1.6, 16.6, (x, y, 0), 0.0, (True, True), 13.0)
    K.sphere(4.2, (x + 27.5, y + 5.0, 5.4), 'white', 'wall_b', 18, 10)
    for i in range(4): a = i * PI / 2 + PI / 4; K.beam((x + 27.5 + math.cos(a) * 3.6, y + 5.0 + math.sin(a) * 3.6, 0.0), (x + 27.5 + math.cos(a) * 2.6, y + 5.0 + math.sin(a) * 2.6, 3.6), 0.4, 0.4, 'girder', 'hull_dark', bevel=0.0)
    K.tank(1.8, 9.0, (x + 27.0, y - 8.0, 0), 0.0, 'hull_light', 'p_caution'); K.tank(1.8, 9.0, (x + 27.0, y - 12.6, 0), 0.0, 'hull_mid', None)
    K.signpost('w_treibstoff', (x - 23.5, y - 15.5, 0), 0.0, 3.4, 1.0)
def pipe_rack(K, a, b, z=6.0, n=4, r=0.34, tints=('hull_mid', 'yellow', 'steel', 'rust', 'hull_light')):
    """Rohrbrücke von a nach b: n Rohre nebeneinander auf Stützjochen."""
    L, ex, ey, nx, ny = H._edge(a, b); w = n * r * 3.2
    for k in range(n):
        s = (k - (n - 1) / 2) * r * 3.2
        K.tube((a[0] + nx * s, a[1] + ny * s, z + r), (b[0] + nx * s, b[1] + ny * s, z + r), r if k % 2 else r * 0.75, 'pipe', tints[k % len(tints)], 8, caps=False)
    m = max(1, int(L // 9))
    for i in range(m + 1):
        t = i / m; px, py = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
        for s in (-1, 1): K.box((0.4, 0.4, z), (px + nx * s * (w / 2 + 0.3), py + ny * s * (w / 2 + 0.3), 0), side='girder', tint='hull_dark', bevel=0.0, along='z')
        K.beam((px - nx * (w / 2 + 0.5), py - ny * (w / 2 + 0.5), z - 0.2), (px + nx * (w / 2 + 0.5), py + ny * (w / 2 + 0.5), z - 0.2), 0.4, 0.4, 'girder', 'hull_dark', bevel=0.0)
        K.beam((px - nx * (w / 2 + 0.3), py - ny * (w / 2 + 0.3), z * 0.35), (px + nx * (w / 2 + 0.3), py + ny * (w / 2 + 0.3), z - 0.4), 0.14, 0.14, 'beam', 'hull_dark', bevel=0.0)

# ------------------------------------------------------------------ Wohnmodule auf Stelzen
def habitat(K, x, y, rz=0.0, n=3):
    """Weiße Wohn- und Arbeitsmodule auf Stelzen: Kästen mit Fensterband, Verbindungsgänge, Treppe, Dachtechnik, Schüssel, Sonnensegel."""
    with K.at((x, y, 0), rz):
        Z = 2.6
        for i in range(n):
            mx = (i - (n - 1) / 2) * 13.0; my = 2.0 if i % 2 else 0.0; sx, sy, sz = 10.6, 6.2, 3.8
            K.box((sx, sy, 0.3), (mx, my, Z - 0.3), side='girder', tint='hull_mid', bevel=0.03, bottom=True)
            K.block(sx, sy, sz, (mx, my, Z), tint='white', tint_top='hull_light', plinth=0.3, cornice=0.3, trim='hull_light')
            K.windows(sx - 3.0, (mx, my - sy / 2, Z + 1.7), 0.0, 0.8, None, 'hull_dark', 'cool'); K.windows(sx - 4.0, (mx, my + sy / 2, Z + 1.7), PI, 0.7)
            K.box((sx + 0.1, 0.12, 0.5), (mx, my - sy / 2 - 0.05, Z + 0.4), side='plain', tint='orange', bevel=0.0, bottom=True)      # Farbband
            for (lx, ly) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                K.beam((mx + lx * (sx / 2 + 0.9), my + ly * (sy / 2 + 0.9), 0.0), (mx + lx * (sx / 2 - 0.8), my + ly * (sy / 2 - 0.6), Z - 0.2), 0.34, 0.34, 'girder', 'hull_mid', bevel=0.0)
                K.tube((mx + lx * (sx / 2 + 0.9), my + ly * (sy / 2 + 0.9), 0.0), (mx + lx * (sx / 2 + 0.9), my + ly * (sy / 2 + 0.9), 0.2), 0.7, 'plain', 'hull_dark', 8)
            if i < n - 1: K.box((2.6, 2.4, 2.6), (mx + 6.5, 1.0, Z + 0.3), side='wall_b', top='roof', tint='hull_light', bevel=0.05, bottom=True)      # Verbindungsgang
            K.vent_unit((mx - 2.5, my + 0.8, Z + sz), sx=1.8, sy=1.8, sz=0.9)
            if i == 0: K.dish(1.8, (mx + 2.5, my, Z + sz), 0.8, 0.7)
            elif i == n - 1: K.antenna(8.0, (mx + 3.0, my + 1.0, Z + sz)); K.tank(0.9, 3.4, (mx, my + 1.4, Z + sz), 0.0, 'hull_light', None)
            else:
                for s in (-1, 1):      # Sonnensegel: dunkle Scheiben auf Rahmen, schräg
                    K.beam((mx + s * 2.2, my - 2.2, Z + sz), (mx + s * 2.2, my + 2.4, Z + sz + 2.0), 0.1, 0.1, 'beam', 'hull_mid', bevel=0.0)
                    K.glass((mx + s * 2.2, my + 0.1, Z + sz + 1.05), (1, 0, 0), (0, 0.917, 0.4), 3.6, 4.6, 0.08)
        K.platform(3.0, 2.6, Z, (-(n - 1) / 2 * 13.0, -4.6, 0), 0.0, -1); K.door((-(n - 1) / 2 * 13.0, -3.1, Z), 0.0)
        K.glowbox('cool', (0.3, 0.2, 0.2), ((n - 1) / 2 * 13.0, -3.2, Z + 3.2)); K.light('light', ((n - 1) / 2 * 13.0, -3.4, Z + 3.2), 3.0)

# ------------------------------------------------------------------ Leitstand
def control(K):
    """Leitstand: breiter Bau mit glatter Vorderwand (dort setzt das Spiel die Tür), Seitenflügel, Turm mit großer Nummer, Antennen."""
    p = H.rect(0, 0, 36, 24); H.shaft(K, p, 0.0, 12.8, 'b', H.T_MID); H.parapet(K, p, 12.8, 1.2, 0.35); H.band(K, p, 6.0, 0.6, 0.3, 'hull_dark', None, strip='beam')
    for s in (-1, 1):
        w = H.rect(s * 27, 3, 18, 16); H.shaft(K, w, 0.0, 6.4, 'c', H.T_LIGHT); H.parapet(K, w, 6.4, 1.0, 0.3); H.roof_mech(K, w, 6.4, 3)
        K.glow('cool', (s * 12.0, -12.06, 9.6), (1, 0, 0), (0, 0, 1), 6.0, 1.2); K.box((6.4, 0.2, 1.6), (s * 12.0, -12.1, 8.8), side='beam', tint='hull_dark', bevel=0.0, bottom=True)
    t = H.rect(0, 5, 14, 12); H.shaft(K, t, 12.8, 32.0, 'b', H.T_DARK); H.band(K, t, 25.6, 3.2, 0.9, 'hull_dark', 'cool'); H.parapet(K, t, 32.0, 1.2, 0.9)
    H.piers(K, t, 12.8, 32.0, 1.4, 2.0, 'hull_dark', 4.0)
    for (c, u) in (((0, -1.12, 20.4), (1, 0, 0)), ((0, 11.12, 20.4), (-1, 0, 0)), ((7.12, 5, 20.4), (0, 1, 0)), ((-7.12, 5, 20.4), (0, -1, 0))):
        K.box((9.0, 0.2, 6.6) if u[0] else (0.2, 9.0, 6.6), (c[0], c[1], c[2] - 3.3), side='plain', tint='hull_light', bevel=0.0, bottom=True)
        K.number(NUM, (c[0] + (0.14 if c[0] > 6 else -0.14 if c[0] < -6 else 0), c[1] + (-0.14 if c[1] < 0 else 0.14 if c[1] > 10 else 0), c[2]), u, (0, 0, 1), 5.0, 'black', 0.02)
    K.box((8, 7, 3.0), (0, 5, 32.0), side='siding', top='roof', tint='hull_mid', bevel=0.06); K.windows(6.4, (0, 1.5, 33.6), 0.0, 0.9, 4, 'hull_dark', 'screen')
    K.antenna(14.0, (2.5, 6.5, 35.0)); K.antenna(7.0, (-2.6, 4.0, 35.0)); K.dish(2.2, (-1.5, 7.2, 35.0), 0.4, 0.6); H.roof_mech(K, H.rect(0, -6, 30, 8), 12.8, 4)
    K.decal('emblem', (-12.0, -12.05, 3.4), (1, 0, 0), (0, 0, 1), 3.0, off=0.03); K.decal('w_zugang', (11.5, -12.05, 4.6), (1, 0, 0), (0, 0, 1), 3.4, off=0.03)

# ------------------------------------------------------------------ Anlage
def build(lib):
    K = lib.Kit('Schmelzwerk', seed=1212); K.seg = 60.0; S.SPRITES = True; R = K.R
    flares, steam = [], []
    # ---------- Flächen: Betonhof mit Landefeld, Frachtfeld, Fahrwege
    K.seg = 8.0
    K.slab(130, 96, 0.25, (-6, -52, 0), tint='concrete', cell=8.0)
    K.pad(46, (PAD[0], PAD[1], 0.25), 0.4, '1')
    K.pad(40, (96, -86, 0), 0.6, '2')
    with K.overlay():      # Hofmarkierungen: Warnränder, Gehweg vom Feld zur Tür, Fahrspur zum Frachtfeld, Stellplätze
        for yy in (-99.4, -4.6): K.box((128, 0.7, 0.03), (-6, yy, 0.25), side='hazard', tint='none', bevel=0, bottom=True)
        for xx in (-18.0, -2.0): K.box((0.35, 34.0, 0.03), (xx, -31.0, 0.25), side='plain', tint='yellow', bevel=0, bottom=True)
        for k in range(8): K.box((1.2, 0.45, 0.03), (-10, -46.0 + k * 4.2, 0.25), side='plain', tint='white', bevel=0, bottom=True)
        K.box((0.4, 70.0, 0.03), (38.0, -58.0, 0.25), side='plain', tint='yellow', bevel=0, bottom=True); K.box((0.4, 70.0, 0.03), (52.0, -58.0, 0.25), side='plain', tint='yellow', bevel=0, bottom=True)
        for k in range(5): K.box((0.3, 9.0, 0.03), (-64 + k * 5.0, -88.0, 0.25), side='plain', tint='white', bevel=0, bottom=True)
        K.number(NUM, (-52.0, -74.0, 0.26), (1, 0, 0), (0, 1, 0), 6.0, 'white', 0.02)
    K.decal('tyre', (45, -40, 0.26), (0, 1, 0), (-1, 0, 0), 8, 3, off=0.02); K.decal('stain2', (-40, -60, 0.26), (1, 0, 0), (0, 1, 0), 7, 7, off=0.02); K.decal('stain1', (20, -20, 0.26), (1, 0, 0), (0, 1, 0), 5, 5, off=0.02)
    S.road(K, (64, -30), (64, 24), 10.24, 0.16); S.road(K, (59, -30), (96 - 20, -30 - 36), 10.24, 0.15); S.road(K, (64, 62 + 10), (-6, 120), 8.0, 0.15)
    K.seg = 60.0
    # ---------- Leitstand, Schmelztürme, Ofenhalle
    control(K)
    monolith(K, -88, 26, 0.12, 15.0, 11.0, 58.0, 1); monolith(K, -116, 40, -0.08, 14.0, 10.5, 50.0, 2)
    steam += furnace_hall(K, 86, 44)
    # ---------- Brecher, Förderbänder, Halden
    crusher(K, -24, 104, 0.0)
    ore_pile(K, -86, 128, 15, 9.5, (0.3, 0.2, 0.15), 1); ore_pile(K, -112, 104, 11, 7.0, (0.22, 0.2, 0.2), 2); ore_pile(K, -62, 142, 9, 5.5, (0.34, 0.24, 0.14), 3)
    conveyor(K, (-80, 126, 1.2), (-27, 105, 17.6), 2.4); conveyor(K, (-15.5, 104, 5.2), (40, 66, 9.0), 2.4, True, 'hull_mid'); conveyor(K, (40, 66, 8.6), (50, 58, 12.0), 2.4, False, 'hull_mid')
    K.box((6, 6, 12.6), (52, 56, 0), side='siding', top='roof', tint='hull_mid', bevel=0.06)      # Übergabeturm an der Halle
    ore_pile(K, 20, 132, 8, 4.6, (0.2, 0.19, 0.19), 4)
    # ---------- Tanklager und Rohrbrücke zur Halle
    tank_farm(K, 150, -24)
    pipe_rack(K, (134, -8.5), (134, 26), 6.0, 4); pipe_rack(K, (-60, 30), (-20, 30), 5.0, 3, 0.3); pipe_rack(K, (-20, 30), (-20, 13), 5.0, 3, 0.3)
    # ---------- Fackelmasten
    for (fx, fy, fh) in ((176, 78, 46.0), (-166, 84, 40.0), (26, 164, 36.0)): flares.append(flare_stack(K, fx, fy, fh))
    # ---------- Frachtfeld: Container, Kran, Fahrzeuge
    for i, (cx, cy, rz, t, nr) in enumerate(((124, -70, 0.0, 'blue', '21'), (124.3, -70, 0.05, 'orange', '34'), (124, -76, 0.0, 'hull_light', '07'), (131, -84, PI / 2, 'red', '15'), (124, -96, 0.1, 'blue', '42'))):
        K.container((cx, cy, 2.6 if i == 1 else 0), rz, t, nr)
    H.crane(K, 122, -108, 0.0, 24.0, 26.0, 2.2); K.hauler((88, -52, 0.16), 0.2); K.hauler((70, 8, 0.18), PI, 'blue'); K.cart((104, -66, 0.6), 0.6)
    for i in range(5): K.crate(1.8, 1.6, 1.4, (76 + i * 2.2, -108, 0.6), 0.06 * i, ('hull_light', 'yellow', 'hull_light', 'green', 'hull_light')[i], 'warn' if i % 2 else None)
    for i in range(6): K.barrel((112 + (i % 3) * 1.0, -100 - (i // 3) * 1.0, 0.6), ('red', 'blue', 'yellow')[i % 3])
    # ---------- Wohnmodule
    habitat(K, -104, -44, 0.2, 3)
    # ---------- Hof: Lichtmasten (nicht im Streifen zwischen Feld und Leitstand), Leitpfosten, Schilder, Absperrungen
    for (mx, my) in ((-44, -100), (26, -100), (-44, -40), (26, -40), (-70, -8), (44, -8), (70, -112), (128, -52), (-36, 78), (20, 96), (120, 70), (-140, 0), (-130, -70)): K.mast_light(15.0, (mx, my, 0))
    for (px, py) in ((-36, -46), (16, -46), (-36, -30), (16, -30), (-36, -16), (16, -16)): K.post((px, py, 0.25))
    K.signpost('w_landezone', (-40, -62, 0.25), -0.4, 3.4, 1.0); K.signpost('p_caution', (56, -36, 0.25), 0.5); K.signpost('w_technik', (-66, 12, 0), 0.4, 3.0, 0.9); K.signpost('w_lager', (118, -44, 0), -0.2, 3.0, 0.9)
    for i in range(4): K.barrier(4.0, (30, -66 - i * 4.6, 0.25), 0.0)
    K.beacon((34, -22, 0.25)); K.generator((-52, -14, 0.25), 0.3); K.tank(1.4, 5.0, (-56, -20, 0.25), 0.3, 'white', 'p_o2')
    for i in range(4): K.cage((40 + i * 2.6, -88, 0.25), 2.3, ('red', 'orange', 'red', 'blue')[i])
    ob = K.build('Raffinerie_Kit')
    return ob, {'flares': flares, 'steam': steam}

def meta(extra):
    g = lambda p: [round(p[0], 2), round(p[2], 2), round(-p[1], 2)]      # Blender (x, y, z) → Spiel (x, y, z)
    return {'pad': {'x': PAD[0], 'z': -PAD[1], 'y': 0.65, 'r': 23}, 'R': 235, 'collide_above': 1.0,
            'flares': [g(p) for p in extra.get('flares', [])], 'steam': [g(p) for p in extra.get('steam', [])],
            'glow': [[-88, 5, -18], [-116, 5, -33]]}      # Ofenglut der Schmelztürme (flackert im Spiel)

# ------------------------------------------------------------------ Bohrturm (steht im Gelände bei den Lagerstätten)
def build_bohrturm(lib):
    """Bohrturm: Gitterturm über einer Arbeitsbühne, Antrieb, Gestängelager, Spülungstank, Pumpe, Lichter. Ursprung = Bohrloch am Boden."""
    K = lib.Kit('Bohrturm', seed=77); K.seg = 60.0
    K.box((12, 10, 0.5), (0, 0, 0), side='girder', top='floor', tint='hull_dark', bevel=0.05)
    for sx in (-1, 1):
        for sy in (-1, 1): K.box((0.5, 0.5, 4.0), (sx * 3.4, sy * 3.4, 0.5), side='girder', tint='rust', bevel=0.0, along='z')
    K.box((8.4, 8.4, 0.4), (0, 0, 4.5), side='girder', top='floor', tint='hull_dark', bevel=0.04, bottom=True)
    for (a, b) in (((-4.1, -4.1), (4.1, -4.1)), ((4.1, -4.1), (4.1, 4.1)), ((4.1, 4.1), (-4.1, 4.1)), ((-4.1, 4.1), (-4.1, -4.1))): K.railing((a[0], a[1], 4.9), (b[0], b[1], 4.9))
    lattice(K, 0, 0, 4.9, 22.0, 3.0, 0.9, 'yellow', 3.6, 0.2)
    K.box((2.4, 2.4, 1.2), (0, 0, 26.9), side='girder', top='roof', tint='hull_dark', bevel=0.05); K.glowbox('redlamp', (0.4, 0.4, 0.4), (0, 0, 28.3)); K.light('redlamp', (0, 0, 28.3), 5.0)
    K.tube((0, 0, 0.3), (0, 0, 26.0), 0.22, 'pipe', 'steel', 8, caps=False); K.box((1.6, 1.6, 2.2), (0, 0, 9.0), side='plain', tint='hull_mid', bevel=0.06, bottom=True)      # Gestänge und Antriebskopf
    K.tube((0, 0, 0.5), (0, 0, 1.6), 0.9, 'girder', 'hull_dark', 10, mode='around')
    K.stairs(1.6, 4.4, (0, -4.2, 0.5), 0.0)
    K.box((3.0, 2.2, 2.4), (-4.4, 2.6, 0.5), side='siding', top='roof', tint='hull_mid', bevel=0.06); K.tube((-3.0, 2.6, 2.0), (-0.4, 0.4, 5.0), 0.2, 'pipe', 'yellow', 8)      # Antrieb
    K.tank(1.2, 4.4, (4.2, -2.6, 0.5), PI / 2, 'hull_light', 'p_caution')
    for i in range(6): K.tube((3.0 + (i % 3) * 0.5, 2.0 + (i // 3) * 0.45, 0.7), (3.0 + (i % 3) * 0.5, 2.0 + (i // 3) * 0.45, 9.5), 0.12, 'pipe', 'rust', 6)      # Gestängelager
    K.box((2.2, 1.4, 0.2), (3.5, 2.2, 0.5), side='girder', tint='hull_dark', bevel=0.02)
    K.glowbox('lamp', (0.3, 0.3, 0.25), (-4.0, -4.0, 6.1)); K.light('lamp', (-4.0, -4.0, 6.2), 3.5); K.glowbox('light', (0.6, 0.2, 0.15), (0, -0.9, 9.0)); K.light('light', (0, -1.2, 8.8), 3.0)
    K.panel('ctrl', (-1.6, -4.1, 5.2), 0.0, 0.9, 0.9, 0.25, 'hull_light', glow='screen')
    return K.build('Raffinerie_Kit')
