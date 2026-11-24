# Bergbaurover „Dachs“ R-4 (24.11.2026): ersetzt den Rover aus Grundformen von Anfang an. Eigener Entwurf, realistisches Arbeitsfahrzeug:
# Druckkabine vorn, sechs Räder an Schwingen mit Federbeinen, Bohrarm mit Spiralbohrer vor der Kabine, Erzmulde hinten, Lichtleiste, Rundumleuchte.
# Aus dem Plattform-/Orbitalwerft-Baukasten (../plattform/pf_lib.py). Achsen: X rechts, Y vorn, Z oben; Ursprung am Boden unter der Fahrzeugmitte.
# Sammlungen = Teile fürs Spiel (rv_export.py): Aufbau (starr), Rad_VL … Rad_HR (drehen, federn; vorn lenken), Bohrer (dreht um seine Achse).
# Maße passend zum Spiel: Raddurchmesser 1,5 m, Spur 3,2 m, Radstand 2 × 2,05 m, Bohrspitze bei y = 4,3 m, z = 1,1 m.
import bpy, os, math, random, json
from mathutils import Vector, Matrix
_pf = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'plattform', 'pf_lib.py')
exec(compile(open(_pf, encoding='utf-8').read(), 'pf_lib.py', 'exec'))
PI = math.pi
M.update(
    rv_lack=panel_overlay(rusty(mk('Roverlack', (0.25, 0.175, 0.06), 0.4, 0.48, var=0.12, rvar=0.1, scale=1.2, bump=0.08, bscale=40, wear=0.8, streak=0.12), 0.3), (2.2, 1.8, 1.4), seam=0.012, tint=0.06),
    rv_lack2=mk('Roverlack dunkel', (0.14, 0.1, 0.04), 0.3, 0.55, var=0.18, rvar=0.12, scale=1.5, wear=0.9, streak=0.3),
    rv_rahmen=rusty(mk('Roverrahmen', (0.045, 0.045, 0.05), 0.6, 0.5, var=0.15, rvar=0.12, scale=2.0, wear=0.9, streak=0.3), 0.4),
    rv_reifen=mk('Reifen', (0.016, 0.016, 0.017), 0.0, 0.88, var=0.12, rvar=0.06, scale=6.0, bump=0.4, bscale=80),
    rv_felge=mk('Felge', (0.11, 0.11, 0.115), 0.85, 0.42, var=0.15, wear=0.6),
    rv_chrom=mk('Kolbenstange', (0.55, 0.56, 0.58), 1.0, 0.18, var=0.05),
    rv_glas=glass('Kabinenglas', (0.004, 0.006, 0.008), (0.12, 0.2, 0.24), 0.08, rough=0.05),
    rv_innen=mk('Kabine innen', (0.5, 0.7, 0.8), 0.0, 0.5, var=0, rvar=0, emit=(0.42, 0.62, 0.72), es=0.8, grime=False),
    rv_amber=mk('Rundumleuchte', (1.0, 0.55, 0.1), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.5, 0.08), es=10.0, grime=False),
    rv_rueck=mk('Rueckleuchte', (1.0, 0.08, 0.05), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.06, 0.03), es=8.0, grime=False),
    rv_erz=mk('Erz in der Mulde', (0.07, 0.06, 0.055), 0.3, 0.85, var=0.5, scale=4.0, bump=0.7, bscale=25, grime=False),
    rv_bohr=rusty(mk('Bohrstahl', (0.16, 0.16, 0.17), 0.9, 0.35, var=0.2, wear=0.7), 0.25),
)
low_spec(M['rv_lack'], 0.22)
L, D, T = M['rv_lack'], M['rv_rahmen'], M['pf_weissfarbe']
WR, WW, TRK = 0.75, 0.56, 1.6            # Radradius, Reifenbreite, halbe Spur (Radmitte)
AX = [2.05, 0.0, -2.05]                  # Radachsen (y)
WHEELS = [('Rad_VL', -1, 0), ('Rad_VR', 1, 0), ('Rad_ML', -1, 1), ('Rad_MR', 1, 1), ('Rad_HL', -1, 2), ('Rad_HR', 1, 2)]
ANCH = {}

def wheel(name, sx, iy):
    CUR[0] = coll(name)
    c = Vector((sx * TRK, AX[iy], WR))
    cyl('Reifen', WR - 0.05, WW, c.x, c.y, c.z, M['rv_reifen'], 'X', n=36, bev=0.04)
    for k in range(26):      # Stollen: schräg, abwechselnd links und rechts versetzt
        a = 2 * PI * k / 26; off = (0.09 if k % 2 else -0.09)
        p = c + Vector((off * sx, math.cos(a) * (WR - 0.02), math.sin(a) * (WR - 0.02)))
        box('Stollen', WW * 0.55, 0.12, 0.09, p.x, p.y, p.z, M['rv_reifen'], 0.015, (a, 0, 0.35 * (1 if k % 2 else -1)))
    for s in (-1, 1): ring('Reifenflanke', WR - 0.18, 0.05, (c.x + s * WW / 2, c.y, c.z), (1, 0, 0), M['rv_reifen'], 36)
    cyl('Felge', 0.46, WW * 0.9, c.x + sx * 0.02, c.y, c.z, M['rv_felge'], 'X', n=28, bev=0.01)
    cyl('Felgenschuessel', 0.36, 0.06, c.x + sx * (WW / 2 + 0.01), c.y, c.z, M['rv_lack2'], 'X', n=24, bev=0.006)
    cyl('Nabe', 0.16, 0.14, c.x + sx * (WW / 2 + 0.06), c.y, c.z, M['rv_felge'], 'X', n=16, bev=0.006)
    for k in range(8):
        a = 2 * PI * k / 8; cyl('Radmutter', 0.025, 0.04, c.x + sx * (WW / 2 + 0.05), c.y + math.cos(a) * 0.26, c.z + math.sin(a) * 0.26, M['rv_chrom'], 'X', n=6, bev=0)
    ANCH[name] = [round(v, 3) for v in c]
def suspension(sx, iy):      # Schwinge vom Rahmen zur Nabe, Federbein mit Schraubenfeder (am Aufbau: federt im Spiel nicht mit)
    CUR[0] = coll('Aufbau')
    c = Vector((sx * TRK, AX[iy], WR)); base = Vector((sx * 0.9, AX[iy] + 0.35, 0.95))
    obox('Schwinge', base, c - Vector((sx * WW * 0.55, 0, 0)), 0.22, 0.18, D, bev=0.02)
    obox('Schwinge', base - Vector((0, 0.7, 0)), c - Vector((sx * WW * 0.55, 0, 0)), 0.18, 0.15, D, bev=0.02)
    top = Vector((sx * 1.05, AX[iy] - 0.1, 1.75)); bot = c - Vector((sx * 0.38, 0, -0.12))
    ocyl('Daempfer', bot, bot.lerp(top, 0.55), 0.07, D, 12, bev=0.005); ocyl('Kolbenstange', bot.lerp(top, 0.5), top, 0.035, M['rv_chrom'], 10, bev=0)
    pts = [bot.lerp(top, 0.12 + 0.76 * t / 40) + Vector((math.cos(t * 0.9) * 0.11, math.sin(t * 0.9) * 0.11, 0)) for t in range(41)]
    pipe('Feder', pts, 0.016, M['ow_gelb'])
    cyl('Achsschenkel', 0.14, 0.3, c.x - sx * (WW / 2 + 0.1), c.y, c.z, D, 'X', n=14, bev=0.01)

def chassis():
    CUR[0] = coll('Aufbau')
    for sx in (-1, 1): box('Laengstraeger', 0.2, 6.2, 0.32, sx * 0.85, 0.05, 1.02, D, 0.02)
    for y in (2.6, 1.2, -0.6, -2.4): box('Quertraeger', 1.9, 0.18, 0.22, 0, y, 1.0, D, 0.02)
    box('Unterboden', 1.9, 6.0, 0.08, 0, 0.05, 0.86, M['rv_lack2'], 0.01)
    # Kotflügel über den Rädern
    for (name, sx, iy) in WHEELS:
        y = AX[iy]
        for k in range(7):
            a0 = PI * (0.12 + 0.76 * k / 7); a1 = PI * (0.12 + 0.76 * (k + 1) / 7)
            p0 = Vector((sx * TRK, y + math.cos(a0) * (WR + 0.16), WR + math.sin(a0) * (WR + 0.16))); p1 = Vector((sx * TRK, y + math.cos(a1) * (WR + 0.16), WR + math.sin(a1) * (WR + 0.16)))
            obox('Kotfluegel', p0, p1, WW + 0.16, 0.035, M['rv_lack2'], up=(0, 0, 1), bev=0.005)
        box('Kotfluegelstrebe', 0.1, 0.08, 0.5, sx * (TRK - 0.25), y, WR * 2 + 0.05, D, 0.01)
    # Stoßfänger vorn mit Warnstreifen, hinten mit Anhängerkupplung
    box('Stossfaenger vorn', 2.6, 0.22, 0.32, 0, 3.15, 0.95, D, 0.03); box('Warnstreifen vorn', 2.62, 0.02, 0.2, 0, 3.27, 0.95, M['ow_warn'], 0.005)
    box('Stossfaenger hinten', 2.6, 0.22, 0.3, 0, -3.1, 0.95, D, 0.03); box('Warnstreifen hinten', 2.62, 0.02, 0.18, 0, -3.22, 0.95, M['ow_warn'], 0.005)
    ocyl('Kupplung', Vector((0, -3.2, 0.8)), Vector((0, -3.55, 0.8)), 0.06, D, 10, bev=0.005); ring('Zugoese', 0.1, 0.03, (0, -3.62, 0.8), (0, 0, 1), D, 16)
    for sx in (-1, 1):
        box('Rueckleuchte', 0.3, 0.04, 0.12, sx * 1.05, -3.23, 1.05, M['rv_rueck'], 0.005)
        box('Seitentank', 0.5, 1.1, 0.42, sx * 1.12, 1.02, 1.12, M['rv_lack2'], 0.04)      # zwischen Vorder- und Mittelrad
        for y in (0.65, 1.38): box('Tankband', 0.52, 0.04, 0.44, sx * 1.12, y, 1.12, D, 0.005)
def cab():
    CUR[0] = coll('Aufbau')
    prof = [(0.45, 1.18), (2.95, 1.18), (3.05, 1.55), (2.75, 2.75), (2.45, 2.98), (0.75, 3.02), (0.45, 2.78)]      # Seitenprofil (y, z)
    prism('Kabine', prof, -1.25, 1.25, L, 'X', 0.04)
    # Frontscheibe (schräg), Seitenfenster, Dachfenster: Glas knapp vor der Fläche, dahinter schwaches Innenlicht
    a = math.atan2(2.75 - 1.55, 2.75 - 3.05)      # Neigung der Frontfläche
    mid = Vector((0, (3.05 + 2.75) / 2 + 0.03, (1.55 + 2.75) / 2 + 0.02))
    box('Frontscheibe', 2.1, 0.03, 1.05, mid.x, mid.y, mid.z, M['rv_glas'], 0.01, (a - PI / 2, 0, 0))
    box('Scheibenrahmen', 2.3, 0.025, 1.22, mid.x, mid.y - 0.02, mid.z, D, 0.01, (a - PI / 2, 0, 0))
    for sx in (-1, 1):
        box('Seitenfenster', 0.03, 1.3, 0.75, sx * 1.265, 1.9, 2.4, M['rv_glas'], 0.008); box('Fensterrahmen', 0.02, 1.42, 0.86, sx * 1.258, 1.9, 2.4, D, 0.008)
        box('Kabinenlicht', 0.02, 1.2, 0.6, sx * 1.2, 1.9, 2.4, M['rv_innen'], 0)
        box('Tuer', 0.03, 0.95, 1.55, sx * 1.27, 1.0, 1.95, M['rv_lack2'], 0.01) if sx < 0 else None
        box('Spiegelarm', 0.45, 0.05, 0.05, sx * 1.45, 2.85, 2.55, D, 0.005); box('Kamera', 0.14, 0.18, 0.12, sx * 1.68, 2.85, 2.55, D, 0.01)
    # Tür links mit Griff, Tritt und Haltegriff
    box('Tuergriff', 0.04, 0.2, 0.04, -1.31, 1.3, 2.0, M['rv_chrom'], 0.005)
    for z in (0.55, 0.9): box('Tritt', 0.32, 0.5, 0.04, -1.42, 1.0, z, D, 0.005)
    pipe('Haltegriff', [(-1.3, 0.55, 1.4), (-1.36, 0.55, 1.4), (-1.36, 0.55, 2.6), (-1.3, 0.55, 2.6)], 0.02, M['ow_gelb'])
    # Dach: Lichtleiste, Rundumleuchte, Antennen, Kühler
    box('Dachtraeger', 2.2, 0.12, 0.1, 0, 2.55, 3.1, D, 0.01)
    for x in (-0.75, -0.25, 0.25, 0.75): box('Lichtleiste', 0.36, 0.14, 0.12, x, 2.6, 3.2, D, 0.01); box('Scheinwerfer', 0.3, 0.02, 0.08, x, 2.675, 3.2, M['ow_licht'], 0.004)
    cyl('Rundumleuchte', 0.12, 0.2, -0.6, 1.0, 3.14, M['rv_amber'], 'Z', n=14, bev=0.01); cyl('Leuchtenfuss', 0.14, 0.06, -0.6, 1.0, 3.04, D, 'Z', n=14, bev=0.004)
    for (x, h) in ((0.7, 1.2), (0.9, 0.8)): ocyl('Antenne', Vector((x, 0.9, 3.02)), Vector((x, 0.9, 3.02 + h)), 0.012, D, 6, bev=0)
    box('Klimageraet', 0.9, 0.7, 0.28, 0.35, 1.25, 3.16, M['rv_lack2'], 0.03)
    for q in range(5): box('Lamelle', 0.8, 0.02, 0.2, 0.35, 0.98 + q * 0.13, 3.18, D, 0.003)
    # Frontscheinwerfer unten
    for sx in (-1, 1):
        box('Scheinwerfergehaeuse', 0.4, 0.12, 0.22, sx * 0.85, 3.03, 1.42, D, 0.02); box('Frontlicht', 0.32, 0.02, 0.14, sx * 0.85, 3.095, 1.42, M['ow_licht'], 0.004)
    # Beschriftung
    text('R-4 DACHS', 0.18, Vector((1.272, 1.3, 1.55)), (0, 1, 0), (0, 0, 1), T)
    text('R-4 DACHS', 0.18, Vector((-1.272, 2.6, 1.55)), (0, -1, 0), (0, 0, 1), T)
    text('R-4', 0.28, Vector((0.28, 3.1, 1.25)), (-1, 0, 0), (0, 0, 1), T)
    ANCH['kabine'] = [0, 1.9, 2.4]; ANCH['rundum'] = [-0.6, 1.0, 3.28]; ANCH['licht'] = [[x, 2.7, 3.2] for x in (-0.75, -0.25, 0.25, 0.75)] + [[sx * 0.85, 3.1, 1.42] for sx in (-1, 1)]
def bin_():
    CUR[0] = coll('Aufbau')
    x0, x1, y0, y1, z0, z1 = -1.3, 1.3, -3.0, 0.3, 1.18, 2.25
    box('Muldenboden', x1 - x0, y1 - y0, 0.08, 0, (y0 + y1) / 2, z0 + 0.04, L, 0.01)
    for sx in (-1, 1): box('Muldenwand', 0.08, y1 - y0, z1 - z0, sx * (x1 - 0.04), (y0 + y1) / 2, (z0 + z1) / 2, L, 0.015)
    box('Muldenwand vorn', x1 - x0, 0.1, z1 - z0 + 0.3, 0, y1 - 0.05, (z0 + z1 + 0.3) / 2, L, 0.015)
    box('Heckklappe', x1 - x0, 0.08, z1 - z0, 0, y0 + 0.04, (z0 + z1) / 2, M['rv_lack2'], 0.015)
    for y in (-2.5, -1.7, -0.9, -0.1):
        for sx in (-1, 1): box('Muldenrippe', 0.06, 0.1, z1 - z0, sx * (x1 + 0.02), y, (z0 + z1) / 2, D, 0.005)
    for sx in (-1, 1): box('Muldenkante', 0.12, y1 - y0, 0.06, sx * (x1 - 0.02), (y0 + y1) / 2, z1 + 0.02, D, 0.008)
    R = random.Random(4)      # Erz in der Mulde: unregelmäßige Brocken
    for k in range(70):
        s = R.uniform(0.18, 0.42); box('Erzbrocken', s, s * R.uniform(0.8, 1.3), s * 0.7, R.uniform(x0 + 0.3, x1 - 0.3), R.uniform(y0 + 0.3, y1 - 0.3), z0 + 0.25 + R.uniform(0, 0.35), M['rv_erz'], 0.03, (R.random(), R.random(), R.random()))
    text('MAX 40 E', 0.14, Vector((-0.55, y0 - 0.005, 1.6)), (1, 0, 0), (0, 0, 1), T)
    for sx in (-1, 1): box('Warnecke', 0.3, 0.012, 0.3, sx * 1.0, y0 - 0.005, 1.95, M['ow_warn'], 0.003)
    # Werkzeugkisten und Ersatzrad zwischen Kabine und Mulde
    for sx in (-1, 1): box('Werkzeugkiste', 0.42, 0.5, 0.36, sx * 1.05, 0.42, 1.38, D, 0.02)
def drill():
    CUR[0] = coll('Aufbau')
    piv = Vector((0, 3.05, 1.2)); tip0 = Vector((0, 3.75, 1.12))
    box('Bohrlagerbock', 0.7, 0.4, 0.45, piv.x, piv.y - 0.1, piv.z, D, 0.03)
    for sx in (-1, 1): obox('Bohrarm', piv + Vector((sx * 0.2, 0, 0)), tip0 + Vector((sx * 0.2, -0.1, 0)), 0.12, 0.26, M['ow_gelb'], bev=0.02)
    ocyl('Hydraulik', Vector((0, 2.95, 1.6)), Vector((0, 3.55, 1.28)), 0.06, D, 12, bev=0.005); ocyl('Hydraulikstange', Vector((0, 3.3, 1.42)), Vector((0, 3.62, 1.22)), 0.03, M['rv_chrom'], 10, bev=0)
    box('Bohrmotor', 0.5, 0.5, 0.5, tip0.x, tip0.y, tip0.z, M['rv_lack2'], 0.04)
    CUR[0] = coll('Bohrer')      # dreht sich: Spiralbohrer entlang +y
    a, b = Vector((0, 3.98, 1.1)), Vector((0, 4.45, 1.1))
    ocyl('Bohrschaft', tip0 + Vector((0, 0.22, -0.02)), a, 0.1, M['rv_bohr'], 14, bev=0.005)
    ocyl('Bohrkopf', a, b, 0.28, M['rv_bohr'], 18, r2=0.05, bev=0.01)
    pts = [a.lerp(b, t / 60) + Vector((math.cos(t * 0.6) * (0.3 - 0.24 * t / 60), 0, math.sin(t * 0.6) * (0.3 - 0.24 * t / 60))) for t in range(61)]
    pipe('Bohrwendel', pts, 0.035, M['rv_bohr'])
    for k in range(6):      # Hartmetallzähne
        ang = 2 * PI * k / 6; p = a + Vector((math.cos(ang) * 0.27, 0.02, math.sin(ang) * 0.27)); box('Bohrzahn', 0.06, 0.1, 0.06, p.x, p.y, p.z, M['rv_chrom'], 0.005)
    ANCH['bohrspitze'] = [0, 4.45, 1.1]

chassis(); cab(); bin_(); drill()
for (n, sx, iy) in WHEELS: wheel(n, sx, iy); suspension(sx, iy)

# ---------- Bühne ----------
def stages():
    CUR[0] = C_STU
    sun = bpy.data.lights.new('Sonne', 'SUN'); sun.energy = 3.2; sun.angle = math.radians(3.0)
    so = bpy.data.objects.new('Sonne', sun); C_STU.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(-40)); STAGE['sun'] = so
    fill = bpy.data.lights.new('Gegenlicht', 'AREA'); fill.energy = 2500; fill.size = 8; fill.color = (0.8, 0.86, 1.0)
    fo = bpy.data.objects.new('Gegenlicht', fill); C_STU.objects.link(fo); fo.location = (-9, -10, 7); fo.rotation_euler = (Vector((0, 0, 1)) - fo.location).to_track_quat('-Z', 'Y').to_euler(); STAGE['fill'] = fo
    w = SC.world or bpy.data.worlds.new('Welt'); SC.world = w; w.use_nodes = True; STAGE['world'] = w
    nt = w.node_tree; N_ = nt.nodes
    for n in list(N_): N_.remove(n)
    out = N_.new('ShaderNodeOutputWorld'); bg = N_.new('ShaderNodeBackground'); nt.links.new(bg.outputs[0], out.inputs[0]); bg.inputs['Color'].default_value = (0.13, 0.13, 0.135, 1); bg.inputs['Strength'].default_value = 0.55
    CUR[0] = C_GRAU
    box('Boden', 40, 40, 0.1, 0, 0, -0.05, mk('Studioboden', (0.1, 0.1, 0.1), 0.0, 0.8, var=0.05, grime=False), 0)
    cam('Schraeg', (7.5, 8.5, 3.6), (0, 0.4, 1.4), 35)
    cam('Heck', (-6.5, -8.0, 4.0), (0, -0.3, 1.3), 35)
    cam('Seite', (-14, 0.5, 1.6), (0, 0.5, 1.5), 50)
    cam('Front', (2.2, 9.0, 1.6), (0, 2.5, 1.3), 35)
    cam('Rad', (3.6, 3.6, 1.1), (1.6, 2.0, 0.8), 32)
VIEWS = {'schraeg': ('Schraeg', 0.3), 'heck': ('Heck', 0.3), 'seite': ('Seite', 0.3), 'front': ('Front', 0.3), 'rad': ('Rad', 0.3)}
def view(name, path, res=(1600, 900)):
    camn, ex = VIEWS[name]; SC.view_settings.exposure = ex
    SC.camera = CAMS[camn]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = 100
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)
stages()
json.dump(ANCH, open(os.path.join(os.path.dirname(bpy.data.filepath), 'rv-anker.json'), 'w', encoding='utf-8'), indent=1)
result = {'objekte': len([o for o in bpy.data.objects if o.users_collection])}
