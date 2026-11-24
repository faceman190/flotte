# Erkundungsbuggy „Wiesel“ E-2 (24.11.2026): leichtes, schnelles Geländefahrzeug neben dem Bergbaurover „Dachs“. Eigener Entwurf, realistisch:
# offener Rohrrahmen mit Überrollkäfig, zwei Schalensitze, vier Ballonreifen an Doppelquerlenkern mit Federbeinen, Akku- und Motorkasten hinten,
# Sensormast mit drehender Radarleiste (Erkundung), Lichtleiste auf dem Käfig, Ersatzrad am Heck, Kanister und Probenkisten.
# Wunsch des Nutzers: „Es soll auch einen Erkundungsrover geben. Wie ein Buggy. Erstell den noch. Gib dir Mühe.“
# Gleicher Baukasten wie rv_bau.py (../plattform/pf_lib.py). Achsen: X rechts, Y vorn, Z oben; Ursprung am Boden unter der Fahrzeugmitte.
# Sammlungen = Teile fürs Spiel (rv_export.py): Aufbau (starr), Rad_VL, Rad_VR, Rad_HL, Rad_HR (drehen, federn; vorn lenken), Sensor (dreht um z).
import bpy, os, math, random, json
from mathutils import Vector, Matrix
_pf = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'plattform', 'pf_lib.py')
exec(compile(open(_pf, encoding='utf-8').read(), 'pf_lib.py', 'exec'))
PI = math.pi
M.update(
    bg_lack=panel_overlay(rusty(mk('Buggylack', (0.03, 0.078, 0.085), 0.35, 0.44, var=0.12, rvar=0.1, scale=1.2, bump=0.06, bscale=40, wear=0.8, streak=0.15), 0.25), (1.4, 1.1, 0.9), seam=0.01, tint=0.07),
    bg_lack2=mk('Buggylack hell', (0.42, 0.42, 0.4), 0.2, 0.55, var=0.2, rvar=0.12, scale=1.4, wear=0.8, streak=0.25),
    bg_rohr=rusty(mk('Rohrrahmen', (0.05, 0.05, 0.054), 0.7, 0.42, var=0.12, rvar=0.1, scale=2.0, wear=0.85, streak=0.2), 0.3),
    bg_kunst=mk('Kotfluegel Kunststoff', (0.02, 0.02, 0.021), 0.0, 0.7, var=0.15, rvar=0.1, scale=2.5, wear=0.5, streak=0.3),
    bg_alu=mk('Unterfahrschutz', (0.3, 0.3, 0.31), 0.9, 0.42, var=0.25, rvar=0.15, scale=1.5, bump=0.1, bscale=60, wear=0.9, streak=0.3),
    bg_reifen=mk('Reifen', (0.016, 0.016, 0.017), 0.0, 0.88, var=0.12, rvar=0.06, scale=6.0, bump=0.4, bscale=80),
    bg_felge=mk('Felge', (0.16, 0.16, 0.165), 0.85, 0.4, var=0.15, wear=0.6),
    bg_chrom=mk('Kolbenstange', (0.55, 0.56, 0.58), 1.0, 0.18, var=0.05),
    bg_sitz=mk('Sitzbezug', (0.028, 0.028, 0.03), 0.0, 0.88, var=0.15, rvar=0.08, scale=4.0, bump=0.3, bscale=120),
    bg_gurt=mk('Gurt', (0.5, 0.2, 0.03), 0.0, 0.8, var=0.15, scale=3.0),
    bg_schirm=mk('Bordschirm', (0.2, 0.55, 0.62), 0.0, 0.3, var=0, rvar=0, emit=(0.25, 0.65, 0.72), es=1.2, grime=False),
    bg_amber=mk('Rundumleuchte', (1.0, 0.55, 0.1), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.5, 0.08), es=10.0, grime=False),
    bg_rueck=mk('Rueckleuchte', (1.0, 0.08, 0.05), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.06, 0.03), es=8.0, grime=False),
    bg_radom=mk('Radom', (0.6, 0.61, 0.6), 0.0, 0.42, var=0.12, rvar=0.08, scale=1.0, wear=0.5, streak=0.3),
    bg_kanister=rusty(mk('Kanister', (0.11, 0.12, 0.06), 0.3, 0.55, var=0.18, scale=1.5, wear=0.8, streak=0.25), 0.3),
    bg_rot=mk('Feuerloescher', (0.45, 0.03, 0.02), 0.2, 0.4, var=0.1, wear=0.5),
    bg_flagge=mk('Wimpel', (0.75, 0.25, 0.03), 0.0, 0.7, var=0.15, grime=False),
)
low_spec(M['bg_lack'], 0.22)
L, D, K, T = M['bg_lack'], M['bg_rohr'], M['bg_kunst'], M['pf_weissfarbe']
WR, WW, TRK = 0.52, 0.42, 1.02           # Radradius, Reifenbreite, halbe Spur (Radmitte)
AX = [1.42, -1.38]                       # Radachsen (y): vorn, hinten
WHEELS = [('Rad_VL', -1, 0), ('Rad_VR', 1, 0), ('Rad_HL', -1, 1), ('Rad_HR', 1, 1)]
RT = 0.035                               # Rohrradius Käfig
ANCH = {}
V = Vector

def tube(name, pts, r=RT, m=None, rad=0.1): return pipe(name, [V(p) for p in pts], r, m or D, rad=rad, res=4)
def wheel(name, sx, iy):
    CUR[0] = coll(name)
    c = V((sx * TRK, AX[iy], WR))
    cyl('Reifen', WR - 0.06, WW, c.x, c.y, c.z, M['bg_reifen'], 'X', n=40, bev=0.07)      # Ballonreifen: stark gerundete Schulter
    for k in range(30):      # Stollen: Blöcke abwechselnd innen und außen, dazu Schulterstollen zur Flanke hin
        a = 2 * PI * k / 30; off = 0.075 if k % 2 else -0.075
        p = c + V((off * sx, math.cos(a) * (WR - 0.035), math.sin(a) * (WR - 0.035)))
        box('Stollen', WW * 0.46, 0.1, 0.055, p.x, p.y, p.z, M['bg_reifen'], 0.012, (a, 0, 0))
        q = c + V((sx * (WW / 2 - 0.03) * (1 if k % 2 else -1), math.cos(a + 0.1) * (WR - 0.075), math.sin(a + 0.1) * (WR - 0.075)))
        box('Schulterstollen', 0.06, 0.08, 0.05, q.x, q.y, q.z, M['bg_reifen'], 0.01, (a + 0.1, 0, 0))
    for s in (-1, 1): ring('Reifenflanke', WR - 0.17, 0.04, (c.x + s * WW / 2, c.y, c.z), (1, 0, 0), M['bg_reifen'], 40)
    cyl('Felge', 0.3, WW * 0.84, c.x, c.y, c.z, M['bg_felge'], 'X', n=28, bev=0.008)
    ox = c.x + sx * (WW / 2 + 0.004)      # Felgenfront knapp vor der Reifenseite (die Flanke wölbt sich darüber hinaus)
    cyl('Felgenschuessel', 0.3, 0.012, ox, c.y, c.z, M['bg_felge'], 'X', n=28, bev=0.003)
    for k in range(6):      # Speichen der Felge, dazwischen dunkle Ausschnitte
        a = 2 * PI * k / 6 + PI / 6
        q = V((ox + sx * 0.007, c.y + math.cos(a + PI / 6) * 0.185, c.z + math.sin(a + PI / 6) * 0.185))
        box('Felgenausschnitt', 0.004, 0.11, 0.13, q.x, q.y, q.z, M['pf_gummi'], 0.0, (a + PI / 6 - PI / 2, 0, 0))
        p = V((ox + sx * 0.012, c.y + math.cos(a) * 0.17, c.z + math.sin(a) * 0.17))
        box('Felgenspeiche', 0.016, 0.075, 0.22, p.x, p.y, p.z, M['bg_alu'], 0.005, (a - PI / 2, 0, 0))
    ring('Felgenring innen', 0.25, 0.012, (ox + sx * 0.008, c.y, c.z), (1, 0, 0), M['bg_alu'], 32)
    ring('Beadlockring', 0.31, 0.02, (ox + sx * 0.01, c.y, c.z), (1, 0, 0), M['bg_felge'], 32)
    for k in range(16):
        a = 2 * PI * k / 16; cyl('Beadlockschraube', 0.012, 0.02, ox + sx * 0.03, c.y + math.cos(a) * 0.31, c.z + math.sin(a) * 0.31, M['bg_chrom'], 'X', n=6, bev=0)
    cyl('Nabe', 0.09, 0.06, ox + sx * 0.035, c.y, c.z, M['bg_lack2'], 'X', n=16, bev=0.006)
    for k in range(5):
        a = 2 * PI * k / 5; cyl('Radmutter', 0.014, 0.03, ox + sx * 0.07, c.y + math.cos(a) * 0.06, c.z + math.sin(a) * 0.06, M['bg_chrom'], 'X', n=6, bev=0)
    cyl('Nabenkappe', 0.035, 0.04, ox + sx * 0.08, c.y, c.z, M['bg_chrom'], 'X', n=12, bev=0.004)
    cyl('Bremsscheibe', 0.22, 0.025, c.x - sx * 0.08, c.y, c.z, M['bg_chrom'], 'X', n=28, bev=0.002)
    ANCH[name] = [round(v, 3) for v in c]

def suspension(sx, iy):      # Doppelquerlenker (oben und unten), Federbein mit gelber Schraubenfeder, Achsschenkel (am Aufbau: federt im Spiel nicht mit)
    CUR[0] = coll('Aufbau')
    y = AX[iy]; c = V((sx * TRK, y, WR)); hx = sx * (TRK - WW / 2 - 0.08)
    for (z0, zh, w) in ((0.42, WR - 0.13, 0.05), (0.74, WR + 0.15, 0.04)):      # unterer und oberer Lenker: A-Form, zwei Rohre zur Kugel am Achsschenkel
        ball = V((hx, y, zh))
        for dy in (-0.2, 0.2): tube('Querlenker', [(sx * 0.4, y + dy, z0), ball], w, rad=0)
        sphere('Kugelgelenk', w * 1.3, ball.x, ball.y, ball.z, D, 10)
    ocyl('Achsschenkel', V((hx, y, WR - 0.16)), V((hx, y, WR + 0.18)), 0.055, D, 12, bev=0.006)
    cyl('Bremssattel', 0.05, 0.1, hx + sx * 0.03, y, WR + 0.18, M['bg_rot'], 'X', n=10, bev=0.01)
    bot = V((sx * (TRK - 0.36), y + (0.06 if iy == 0 else -0.06), WR - 0.07)); top = V((sx * 0.5, y + (0.1 if iy == 0 else -0.12), 1.12))
    ocyl('Daempfer', bot, bot.lerp(top, 0.55), 0.045, M['bg_alu'], 14, bev=0.004); ocyl('Kolbenstange', bot.lerp(top, 0.5), top, 0.02, M['bg_chrom'], 10, bev=0)
    ocyl('Ausgleichsbehaelter', top + V((sx * 0.06, 0, -0.08)), top + V((sx * 0.06, 0, -0.32)), 0.035, M['bg_alu'], 12, bev=0.004)
    d = (top - bot).normalized(); s0 = bot.lerp(top, 0.18); s1 = bot.lerp(top, 0.86)
    X_ = d.orthogonal().normalized(); Y_ = d.cross(X_)
    pts = [s0.lerp(s1, t / 44) + (X_ * math.cos(t * 0.95) + Y_ * math.sin(t * 0.95)) * 0.075 for t in range(45)]
    pipe('Feder', pts, 0.013, M['ow_gelb'])
    for p, r in ((s0, 0.09), (s1, 0.085)): ocyl('Federteller', p - d * 0.01, p + d * 0.01, r, M['bg_alu'], 14, bev=0)
    # Federbeindom: Rohrbock vom Käfig zum oberen Lager
    tube('Federbeindom', [(sx * 0.38, y + (0.32 if iy == 0 else -0.32), 0.62), top, (sx * 0.38, y - (0.25 if iy == 0 else -0.25), 0.62)], 0.028, rad=0)

def frame():
    CUR[0] = coll('Aufbau')
    for sx in (-1, 1):
        tube('Bodenrohr', [(sx * 0.42, 2.1, 0.5), (sx * 0.66, 1.0, 0.44), (sx * 0.7, -0.6, 0.44), (sx * 0.5, -1.9, 0.5)], 0.04, rad=0.2)
        tube('Bodenrohr innen', [(sx * 0.38, 1.7, 0.42), (sx * 0.38, -1.75, 0.42)], 0.035, rad=0)
        # A-Säule und Dachholm: ein gebogenes Rohr vom Vorderwagen über das Dach zum Hauptbügel
        tube('Dachholm', [(sx * 0.66, 1.08, 0.5), (sx * 0.62, 0.98, 0.92), (sx * 0.52, 0.32, 1.66), (sx * 0.58, -0.6, 1.66)], rad=0.18)
        tube('Seitenrohr', [(sx * 0.68, 0.98, 0.78), (sx * 0.76, 0.3, 0.86), (sx * 0.72, -0.56, 0.84)], rad=0.25)
        tube('Seitendiagonale', [(sx * 0.7, 0.9, 0.46), (sx * 0.75, 0.15, 0.85)], 0.03, rad=0)
        tube('Heckstrebe', [(sx * 0.6, -0.62, 1.62), (sx * 0.52, -1.95, 0.98)], rad=0)
        tube('Heckrahmen', [(sx * 0.52, -0.7, 0.98), (sx * 0.52, -1.95, 0.98), (sx * 0.5, -1.95, 0.5)], 0.03, rad=0.08)
        tube('Vorderwagen', [(sx * 0.42, 2.1, 0.5), (sx * 0.4, 1.75, 0.86), (sx * 0.62, 0.98, 0.92)], 0.03, rad=0.12)
    tube('Hauptbuegel', [(-0.7, -0.56, 0.44), (-0.62, -0.62, 1.6), (-0.5, -0.62, 1.68), (0.5, -0.62, 1.68), (0.62, -0.62, 1.6), (0.7, -0.56, 0.44)], 0.04, rad=0.14)
    tube('Dachquerrohr', [(-0.52, 0.32, 1.66), (0.52, 0.32, 1.66)], rad=0)
    tube('Dachdiagonale', [(-0.52, 0.32, 1.66), (0.58, -0.6, 1.66)], 0.03, rad=0)
    tube('Armaturenrohr', [(-0.62, 0.98, 0.92), (0.62, 0.98, 0.92)], rad=0)
    tube('Hauptbuegel Strebe', [(-0.62, -0.62, 1.1), (0.62, -0.62, 1.1)], 0.03, rad=0)
    tube('Hauptbuegel Diagonale', [(-0.62, -0.62, 0.5), (0.6, -0.62, 1.55)], 0.03, rad=0)
    for y in (2.1, 1.0, -0.6, -1.9): tube('Querrohr', [(-0.62 if abs(y) < 1.5 else -0.42, y, 0.46), (0.62 if abs(y) < 1.5 else 0.42, y, 0.46)], 0.032, rad=0)
    tube('Vorderwagen oben', [(-0.4, 1.75, 0.86), (0.4, 1.75, 0.86)], 0.03, rad=0)
    tube('Frontbuegel', [(-0.72, 2.12, 0.58), (-0.6, 2.36, 0.62), (0.6, 2.36, 0.62), (0.72, 2.12, 0.58)], 0.04, rad=0.12)
    tube('Frontbuegel unten', [(-0.45, 2.28, 0.38), (0.45, 2.28, 0.38)], 0.035, rad=0)
    for sx in (-1, 1): tube('Frontbuegel Stuetze', [(sx * 0.45, 2.1, 0.46), (sx * 0.45, 2.3, 0.4), (sx * 0.5, 2.36, 0.62)], 0.03, rad=0.05)
    tube('Heckbuegel', [(-0.62, -2.05, 0.5), (-0.5, -2.26, 0.52), (0.5, -2.26, 0.52), (0.62, -2.05, 0.5)], 0.04, rad=0.12)
    # Bodenblech und Unterfahrschutz
    box('Bodenblech', 1.34, 2.9, 0.025, 0, 0.05, 0.41, M['bg_alu'], 0.005)
    obox('Unterfahrschutz', V((0, 1.7, 0.38)), V((0, 2.32, 0.46)), 0.86, 0.02, M['bg_alu'], bev=0.005)
    for k in range(5): box('Blechniete', 0.025, 0.025, 0.01, -0.36 + k * 0.18, 2.02, 0.44, M['bg_chrom'], 0.003)

def body():
    CUR[0] = coll('Aufbau')
    # Vorderwagen: flache Keilhaube (Seitenprofil y, z), dahinter das Armaturenbrett
    prism('Haube', [(0.98, 0.5), (2.14, 0.47), (2.24, 0.6), (2.1, 0.76), (1.02, 0.98)], -0.6, 0.6, L, 'X', 0.03)
    a = math.atan2(0.98 - 0.76, 1.02 - 2.1)
    for k in range(6): box('Haubenlamelle', 0.42, 0.05, 0.022, 0.0, 1.28 + k * 0.08, 0.93 - k * 0.0175, D, 0.004, (a + PI, 0, 0))
    box('Haubenstreifen', 0.12, 1.05, 0.004, -0.38, 1.56, 0.88, M['bg_lack2'], 0.002, (a + PI, 0, 0))
    for sx in (-1, 1):
        box('Haubenverschluss', 0.06, 0.08, 0.03, sx * 0.48, 1.95, 0.8, M['ow_gelb'], 0.006)
        # Frontscheinwerfer: runde Gehäuse in der Haubenfront
        ocyl('Scheinwerfergehaeuse', V((sx * 0.38, 2.1, 0.64)), V((sx * 0.38, 2.24, 0.64)), 0.085, D, 18, bev=0.008)
        ocyl('Frontlicht', V((sx * 0.38, 2.235, 0.64)), V((sx * 0.38, 2.25, 0.64)), 0.07, M['ow_licht'], 18, bev=0)
    box('Kuehlergrill', 0.36, 0.02, 0.1, 0, 2.21, 0.55, M['pf_gummi'], 0.004)
    for k in range(4): box('Grillsteg', 0.02, 0.025, 0.1, -0.12 + k * 0.08, 2.215, 0.55, D, 0.002)
    # Seitenkästen zwischen den Rädern (Akkus), mit Trittblech
    for sx in (-1, 1):
        box('Seitenkasten', 0.2, 1.3, 0.3, sx * 0.79, -0.05, 0.6, L, 0.04)
        box('Trittblech', 0.22, 0.5, 0.012, sx * 0.79, 0.15, 0.756, M['bg_alu'], 0.003)
        for k in range(3): box('Trittrippe', 0.2, 0.02, 0.008, sx * 0.79, -0.02 + k * 0.17, 0.764, D, 0.002)
        box('Seitenkasten Deckel', 0.008, 0.14, 0.2, sx * 0.893, 0.5 if sx > 0 else -0.6, 0.6, D, 0.002)
    # Heckkasten: Akku und Motor, schräges Heck, Kühlrippen oben, Gitter hinten
    prism('Heckkasten', [(-0.72, 0.5), (-0.72, 1.04), (-1.66, 1.04), (-1.98, 0.86), (-1.98, 0.5)], -0.58, 0.58, L, 'X', 0.03)
    for k in range(11): box('Kuehlrippe', 0.92, 0.018, 0.06, 0, -0.85 - k * 0.07, 1.07, D, 0.003)
    for sx in (-1, 1): box('Rippenrahmen', 0.03, 0.82, 0.07, sx * 0.47, -1.2, 1.07, D, 0.004)
    a2 = math.atan2(1.04 - 0.86, -1.66 + 1.98)
    box('Heckgitter', 0.8, 0.012, 0.2, 0, -1.83, 0.96, M['pf_gummi'], 0.003, (-a2 + PI / 2, 0, 0))
    for sx in (-1, 1):
        box('Rueckleuchtengehaeuse', 0.14, 0.03, 0.09, sx * 0.48, -1.995, 0.78, D, 0.006)
        box('Rueckleuchte', 0.11, 0.012, 0.06, sx * 0.48, -2.01, 0.78, M['bg_rueck'], 0.003)
        box('Blinker', 0.05, 0.012, 0.06, sx * 0.36, -2.01, 0.78, M['bg_amber'], 0.003)
    box('Kennzeichen', 0.32, 0.008, 0.1, 0, -1.99, 0.56, M['bg_lack2'], 0.003)
    text('E-2', 0.06, V((-0.06, -1.996, 0.535)), (1, 0, 0), (0, 0, 1), M['pf_gummi'])
    # Kotflügel: schmale Kunststoffbögen über dem oberen Teil der Räder, mit Kante (Abstand fürs Einfedern im Spiel: bis 0,16 m)
    for (name, sx, iy) in WHEELS:
        y = AX[iy]; R = WR + 0.17; n = 14; a_0, a_1 = (0.3, 0.84) if iy == 0 else (0.16, 0.7)
        for k in range(n):
            a0 = PI * (a_0 + (a_1 - a_0) * k / n); a1 = PI * (a_0 + (a_1 - a_0) * (k + 1) / n)
            p0 = V((sx * TRK, y + math.cos(a0) * R, WR + math.sin(a0) * R)); p1 = V((sx * TRK, y + math.cos(a1) * R, WR + math.sin(a1) * R))
            obox('Kotfluegel', p0, p1, WW + 0.04, 0.012, K, up=(0, 0, 1), bev=0.003, ext=0.004)
            q0 = p0 + V((sx * (WW / 2 + 0.02), 0, 0)); q1 = p1 + V((sx * (WW / 2 + 0.02), 0, 0))
            obox('Kotfluegelkante', q0 - (q0 - V((sx * TRK, y, WR))).normalized() * 0.03, q1 - (q1 - V((sx * TRK, y, WR))).normalized() * 0.03, 0.012, 0.06, K, up=(1, 0, 0), bev=0.003, ext=0.004)
        top = V((sx * TRK, y, WR + R))
        tube('Kotfluegelhalter', [(sx * 0.6, y + 0.2, 0.8 if iy == 0 else 0.98), top + V((-sx * 0.12, 0.12, -0.01))], 0.016, rad=0)
        tube('Kotfluegelhalter', [(sx * 0.6, y - 0.2, 0.8 if iy == 0 else 0.98), top + V((-sx * 0.12, -0.12, -0.01))], 0.016, rad=0)
    # Beschriftung auf den Seitenkästen
    text('E-2 WIESEL', 0.09, V((0.896, -0.62, 0.6)), (0, 1, 0), (0, 0, 1), T)
    text('E-2 WIESEL', 0.09, V((-0.896, 0.5, 0.6)), (0, -1, 0), (0, 0, 1), T)
    text('ERKUNDUNG', 0.045, V((0.896, -0.62, 0.5)), (0, 1, 0), (0, 0, 1), M['ow_gelb'])
    text('ERKUNDUNG', 0.045, V((-0.896, 0.5, 0.5)), (0, -1, 0), (0, 0, 1), M['ow_gelb'])
    for sx in (-1, 1): box('Warnecke', 0.12, 0.008, 0.12, sx * 0.5, -1.985, 0.6, M['ow_warn'], 0.002)

def cockpit():
    CUR[0] = coll('Aufbau')
    for sx in (-1, 1):
        x = sx * 0.34
        box('Sitzschale', 0.46, 0.5, 0.1, x, -0.12, 0.6, M['bg_sitz'], 0.03)
        box('Sitzkissen', 0.36, 0.42, 0.06, x, -0.1, 0.67, M['bg_sitz'], 0.025)
        box('Lehne', 0.46, 0.1, 0.72, x, -0.42, 0.98, M['bg_sitz'], 0.03, (-0.22, 0, 0))
        for s2 in (-1, 1):
            box('Seitenwange', 0.07, 0.42, 0.14, x + s2 * 0.21, -0.12, 0.69, M['bg_sitz'], 0.025)
            box('Lehnenwange', 0.08, 0.14, 0.55, x + s2 * 0.22, -0.38, 1.0, M['bg_sitz'], 0.03, (-0.22, 0, 0))
        box('Kopfstuetze', 0.3, 0.1, 0.18, x, -0.52, 1.43, M['bg_sitz'], 0.03, (-0.22, 0, 0))
        for s2 in (-1, 1): box('Gurt', 0.05, 0.012, 0.66, x + s2 * 0.1, -0.355, 1.02, M['bg_gurt'], 0.002, (-0.22, 0, s2 * 0.08))
        box('Beckengurt', 0.34, 0.012, 0.05, x, -0.06, 0.73, M['bg_gurt'], 0.002)
        box('Gurtschloss', 0.07, 0.03, 0.06, x, -0.06, 0.74, M['bg_chrom'], 0.006)
        box('Sitzkonsole', 0.4, 0.4, 0.12, x, -0.12, 0.5, D, 0.01)
    # Armaturenbrett mit Bordschirm, Lenkrad links
    box('Armaturenbrett', 1.16, 0.18, 0.16, 0, 0.9, 0.86, D, 0.02)
    box('Bordschirm', 0.3, 0.012, 0.18, 0.02, 0.82, 0.99, M['bg_schirm'], 0.004, (-0.35, 0, 0))
    box('Schirmrahmen', 0.34, 0.02, 0.22, 0.02, 0.826, 0.99, D, 0.006, (-0.35, 0, 0))
    for k in range(3): ocyl('Anzeige', V((0.32 + k * 0.08, 0.81, 0.92)), V((0.32 + k * 0.08, 0.8, 0.92)), 0.028, M['bg_schirm'], 12, bev=0)
    for k in range(4): box('Kippschalter', 0.015, 0.03, 0.015, -0.12 + k * 0.05, 0.81, 0.86, M['bg_chrom'], 0.002)
    wc = V((-0.34, 0.56, 0.98)); col0 = V((-0.34, 0.86, 0.86)); n = (wc - col0).normalized()
    ocyl('Lenksaeule', col0, wc, 0.025, D, 10, bev=0.003)
    ring('Lenkrad', 0.17, 0.022, wc, n, M['bg_sitz'], 28)
    for k in range(3):
        a = 2 * PI * k / 3 + PI / 2; u = n.orthogonal().normalized(); w = n.cross(u)
        obox('Lenkradspeiche', wc, wc + (u * math.cos(a) + w * math.sin(a)) * 0.16, 0.025, 0.012, D, up=tuple(n), bev=0.003)
    sphere('Lenkradnabe', 0.04, wc.x, wc.y, wc.z, D, 12)
    box('Schalthebelkonsole', 0.12, 0.4, 0.14, 0, 0.05, 0.52, D, 0.015)
    ocyl('Schalthebel', V((0, 0.1, 0.59)), V((0, 0.06, 0.78)), 0.012, M['bg_chrom'], 8, bev=0)
    sphere('Schaltknauf', 0.025, 0, 0.06, 0.79, M['bg_sitz'], 10)
    # Käfigpolster am Hauptbügel hinter den Köpfen
    for sx in (-1, 1): ocyl('Buegelpolster', V((sx * 0.5, -0.62, 1.68)), V((sx * 0.1, -0.62, 1.68)), 0.055, M['bg_sitz'], 14, bev=0.01)
    ocyl('Feuerloescher', V((0.0, -0.66, 0.6)), V((0.0, -0.66, 1.0)), 0.06, M['bg_rot'], 14, bev=0.01)
    ocyl('Loescherkopf', V((0.0, -0.66, 1.0)), V((0.0, -0.66, 1.06)), 0.03, M['bg_chrom'], 8, bev=0)
    for z in (0.7, 0.92): box('Loescherhalter', 0.14, 0.04, 0.02, 0, -0.63, z, D, 0.003)
    ANCH['sitz_fahrer'] = [-0.34, -0.1, 0.7]; ANCH['lenkrad'] = [round(v, 3) for v in wc]

def gear():
    CUR[0] = coll('Aufbau')
    # Lichtleiste auf dem Dachquerrohr, zwei Zusatzscheinwerfer an den A-Säulen
    box('Lichtleistenhalter', 1.0, 0.1, 0.05, 0, 0.36, 1.72, D, 0.008)
    for k in range(5):
        x = -0.4 + k * 0.2
        box('Lichtleiste', 0.18, 0.12, 0.11, x, 0.38, 1.79, D, 0.012); box('Scheinwerfer', 0.15, 0.012, 0.075, x, 0.443, 1.79, M['ow_licht'], 0.003)
    for sx in (-1, 1):
        p = V((sx * 0.66, 1.0, 0.98))
        ocyl('Zusatzscheinwerfer', p, p + V((0, 0.12, 0)), 0.065, D, 16, bev=0.006); ocyl('Zusatzlicht', p + V((0, 0.118, 0)), p + V((0, 0.128, 0)), 0.053, M['ow_licht'], 16, bev=0)
        box('Spiegelarm', 0.18, 0.02, 0.02, sx * 0.72, 0.9, 1.08, D, 0.003); box('Spiegel', 0.03, 0.12, 0.08, sx * 0.82, 0.9, 1.1, D, 0.008)
    cyl('Rundumleuchte', 0.055, 0.1, -0.5, -0.62, 1.78, M['bg_amber'], 'Z', n=14, bev=0.008); cyl('Leuchtenfuss', 0.065, 0.04, -0.5, -0.62, 1.72, D, 'Z', n=14, bev=0.003)
    # Ersatzrad stehend am Heck (Achse y)
    c = V((0, -2.12, 0.86))
    ocyl('Ersatzreifen', c - V((0, 0.17, 0)), c + V((0, 0.17, 0)), WR - 0.07, M['bg_reifen'], 36, bev=0.06)
    for k in range(20):
        a = 2 * PI * k / 20; p = c + V((math.cos(a) * (WR - 0.05), 0, math.sin(a) * (WR - 0.05)))
        box('Stollen', 0.12, 0.17, 0.07, p.x, p.y, p.z, M['bg_reifen'], 0.012, (0, -a + PI / 2, 0))
    ocyl('Ersatzfelge', c - V((0, 0.15, 0)), c + V((0, 0.16, 0)), 0.29, M['bg_felge'], 24, bev=0.006)
    ocyl('Ersatzfelge Schuessel', c - V((0, 0.17, 0)), c - V((0, 0.14, 0)), 0.26, M['bg_lack2'], 24, bev=0.004)
    ring('Ersatz Beadlock', 0.31, 0.02, c - V((0, 0.165, 0)), (0, 1, 0), M['bg_felge'], 28)
    tube('Radtraeger', [(-0.3, -1.97, 0.98), (0, -2.1, 0.86), (0.3, -1.97, 0.98)], 0.03, rad=0.05)
    # Kanister seitlich am Heckkasten, Probenkisten auf dem Heck
    for sx in (-1, 1):
        for k, y in enumerate((-1.05, -1.42)):
            x = sx * 0.66
            box('Kanister', 0.13, 0.32, 0.42, x, y, 0.76, M['bg_kanister'], 0.025)
            box('Kanistersicke', 0.135, 0.22, 0.012, x, y, 0.82, D, 0.003); box('Kanistersicke', 0.135, 0.22, 0.012, x, y, 0.7, D, 0.003)
            box('Kanistergriff', 0.04, 0.16, 0.05, x, y + 0.04, 1.0, M['bg_kanister'], 0.008)
            box('Kanisterband', 0.14, 0.02, 0.44, x, y, 0.76, M['ow_gelb'] if k else D, 0.003)
    for (x, y, w) in ((-0.28, -0.82, 0.36), (0.12, -0.8, 0.3)):
        box('Probenkiste', w, 0.22, 0.2, x, y, 1.18, M['bg_lack2'], 0.02)
        box('Kistendeckel', w + 0.01, 0.23, 0.03, x, y, 1.29, D, 0.006)
        box('Kistenschloss', 0.04, 0.012, 0.04, x, y - 0.115, 1.24, M['bg_chrom'], 0.003)
    text('PROBEN', 0.04, V((-0.4, -0.931, 1.15)), (1, 0, 0), (0, 0, 1), M['pf_gummi'])
    box('Spanngurt', 0.8, 0.02, 0.012, -0.08, -0.82, 1.305, M['bg_gurt'], 0.002)
    # Schaufel am rechten Seitenrohr, Peitschenantenne mit Wimpel hinten links
    obox('Schaufelstiel', V((0.79, 0.65, 0.72)), V((0.8, -0.35, 0.78)), 0.03, 0.03, M['bg_kanister'], bev=0.006)
    obox('Schaufelblatt', V((0.8, 0.65, 0.72)), V((0.8, 0.92, 0.7)), 0.18, 0.012, M['bg_alu'], up=(1, 0, 0), bev=0.004)
    ocyl('Antennenfuss', V((-0.52, -1.92, 1.0)), V((-0.52, -1.92, 1.08)), 0.03, D, 10, bev=0.003)
    ocyl('Peitschenantenne', V((-0.52, -1.92, 1.08)), V((-0.55, -1.98, 2.65)), 0.008, M['bg_kunst'], 6, r2=0.004, bev=0)
    box('Wimpel', 0.005, 0.24, 0.14, -0.548, -2.1, 2.55, M['bg_flagge'], 0.002)

def sensor():
    CUR[0] = coll('Aufbau')      # Mast rechts hinter dem Hauptbügel, mit Schellen am Bügel
    base = V((0.42, -0.78, 1.04)); top = V((0.42, -0.78, 2.3))
    box('Mastfuss', 0.16, 0.16, 0.08, base.x, base.y, base.z + 0.04, D, 0.01)
    ocyl('Mast unten', base, base.lerp(top, 0.55), 0.035, M['bg_alu'], 14, bev=0.003)
    ocyl('Mast oben', base.lerp(top, 0.5), top, 0.026, M['bg_alu'], 12, bev=0.003)
    ring('Teleskopmuffe', 0.04, 0.012, base.lerp(top, 0.53), (0, 0, 1), D, 14)
    for z in (1.3, 1.6): tube('Mastschelle', [(0.42, -0.78, z), (0.56, -0.64, z)], 0.015, rad=0)
    pipe('Mastkabel', [base + V((0.05, 0, 0.1)), base.lerp(top, 0.4) + V((0.05, 0, 0)), top + V((0.04, 0, -0.1))], 0.008, M['ow_kabel'])
    cyl('Sensorkopf', 0.1, 0.12, top.x, top.y, top.z + 0.06, D, 'Z', n=18, bev=0.01)
    sphere('Lidar', 0.07, top.x + 0.1, top.y + 0.05, top.z + 0.02, M['bg_radom'], 16)
    ocyl('Kamera', V((top.x - 0.08, top.y + 0.02, top.z + 0.02)), V((top.x - 0.08, top.y + 0.14, top.z + 0.02)), 0.035, D, 12, bev=0.004)
    ocyl('Kameraglas', V((top.x - 0.08, top.y + 0.14, top.z + 0.02)), V((top.x - 0.08, top.y + 0.145, top.z + 0.02)), 0.025, M['bg_schirm'], 12, bev=0)
    CUR[0] = coll('Sensor')      # dreht sich: Radarleiste auf einem Drehteller (um die senkrechte Achse durch den Mast)
    z0 = top.z + 0.12
    cyl('Drehteller', 0.08, 0.05, top.x, top.y, z0 + 0.025, D, 'Z', n=18, bev=0.006)
    box('Radarleiste', 0.72, 0.07, 0.13, top.x, top.y, z0 + 0.13, M['bg_radom'], 0.02)
    box('Radarleiste Ruecken', 0.7, 0.04, 0.1, top.x, top.y - 0.05, z0 + 0.13, D, 0.01)
    box('Radarfuss', 0.06, 0.06, 0.08, top.x, top.y, z0 + 0.05, D, 0.008)
    for sx in (-1, 1): box('Radarkappe', 0.03, 0.08, 0.14, top.x + sx * 0.36, top.y, z0 + 0.13, D, 0.006)
    ANCH['sensor'] = [top.x, top.y, z0]

frame(); body(); cockpit(); gear(); sensor()
for (n, sx, iy) in WHEELS: wheel(n, sx, iy); suspension(sx, iy)
ANCH['licht'] = [[-0.4 + k * 0.2, 0.45, 1.79] for k in range(5)] + [[sx * 0.38, 2.25, 0.64] for sx in (-1, 1)] + [[sx * 0.66, 1.13, 0.98] for sx in (-1, 1)]
ANCH['rueck'] = [[sx * 0.48, -2.02, 0.78] for sx in (-1, 1)]; ANCH['rundum'] = [-0.5, -0.62, 1.86]

# ---------- Bühne ----------
def stages():
    CUR[0] = C_STU
    sun = bpy.data.lights.new('Sonne', 'SUN'); sun.energy = 3.2; sun.angle = math.radians(3.0)
    so = bpy.data.objects.new('Sonne', sun); C_STU.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(140)); STAGE['sun'] = so      # Sonne von vorn rechts
    fill = bpy.data.lights.new('Gegenlicht', 'AREA'); fill.energy = 1500; fill.size = 6; fill.color = (0.8, 0.86, 1.0)
    fo = bpy.data.objects.new('Gegenlicht', fill); C_STU.objects.link(fo); fo.location = (-6, -7, 5); fo.rotation_euler = (V((0, 0, 1)) - fo.location).to_track_quat('-Z', 'Y').to_euler(); STAGE['fill'] = fo
    w = SC.world or bpy.data.worlds.new('Welt'); SC.world = w; w.use_nodes = True; STAGE['world'] = w
    nt = w.node_tree; N_ = nt.nodes
    for n in list(N_): N_.remove(n)
    out = N_.new('ShaderNodeOutputWorld'); bg = N_.new('ShaderNodeBackground'); nt.links.new(bg.outputs[0], out.inputs[0]); bg.inputs['Color'].default_value = (0.13, 0.13, 0.135, 1); bg.inputs['Strength'].default_value = 0.55
    CUR[0] = C_GRAU
    box('Boden', 30, 30, 0.1, 0, 0, -0.05, mk('Studioboden', (0.1, 0.1, 0.1), 0.0, 0.8, var=0.05, grime=False), 0)
    cam('Schraeg', (4.6, 5.4, 2.4), (0, 0.15, 0.85), 35)
    cam('Heck', (-4.0, -5.0, 2.6), (0, -0.4, 0.9), 35)
    cam('Seite', (-9.5, 0.1, 1.0), (0, 0.05, 0.95), 50)
    cam('Front', (1.4, 6.0, 1.2), (0, 1.2, 0.8), 35)
    cam('Rad', (2.4, 2.6, 0.7), (1.0, 1.4, 0.5), 32)
    cam('Cockpit', (1.2, -2.6, 2.7), (0, 0.3, 0.85), 32)
VIEWS = {'schraeg': ('Schraeg', 0.3), 'heck': ('Heck', 0.3), 'seite': ('Seite', 0.3), 'front': ('Front', 0.3), 'rad': ('Rad', 0.3), 'cockpit': ('Cockpit', 0.3)}
def view(name, path, res=(1600, 900)):
    camn, ex = VIEWS[name]; SC.view_settings.exposure = ex
    SC.camera = CAMS[camn]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = 100
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)
stages()
json.dump(ANCH, open(os.path.join(os.path.dirname(bpy.data.filepath), 'bg-anker.json'), 'w', encoding='utf-8'), indent=1)
result = {'objekte': len([o for o in bpy.data.objects if o.users_collection])}
