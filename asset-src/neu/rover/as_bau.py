# Außenstelle (24.11.2026): kleine Station draußen auf den Planeten, Ziel der Bodenaufgaben (src/game/bodenaufgaben.ts: Vorräte hinbringen).
# Wohncontainer auf Stahlkufen mit Tür, Fenstern und Klimagerät, Funkmast mit Schüssel und rotem Warnlicht, zwei Solarmodule, Dieseltank,
# gestapelte Vorratskisten, Flutlichtmast, Landelicht. Realistisch, abgenutzt (Werkzeug, nicht Spielzeug). Gleicher Baukasten wie rv_bau.py.
# Achsen: X rechts, Y vorn, Z oben; Ursprung am Boden in der Mitte. Eine Sammlung „Aufbau“ (rv_export.py → deco/Aussenstelle + Fernmodell).
import bpy, os, math, random, json
from mathutils import Vector
_pf = os.path.join(os.path.dirname(bpy.data.filepath), '..', 'plattform', 'pf_lib.py')
exec(compile(open(_pf, encoding='utf-8').read(), 'pf_lib.py', 'exec'))
PI = math.pi; V = Vector
M.update(
    as_wand=panel_overlay(rusty(mk('Containerwand', (0.36, 0.33, 0.27), 0.3, 0.55, var=0.15, rvar=0.12, scale=1.2, bump=0.08, bscale=40, wear=0.85, streak=0.35), 0.35), (2.0, 2.4, 2.4), seam=0.012, tint=0.08),
    as_dunkel=rusty(mk('Container dunkel', (0.08, 0.085, 0.09), 0.5, 0.5, var=0.15, rvar=0.12, scale=1.5, wear=0.85, streak=0.3), 0.35),
    as_stahl=rusty(mk('Kufenstahl', (0.06, 0.06, 0.062), 0.7, 0.45, var=0.15, wear=0.9, streak=0.3), 0.45),
    as_solar=mk('Solarzellen', (0.02, 0.03, 0.06), 0.4, 0.15, var=0.08, rvar=0.05, scale=8.0, grime=True, wear=0.3),
    as_tank=rusty(mk('Dieseltank', (0.42, 0.4, 0.36), 0.4, 0.5, var=0.15, wear=0.8, streak=0.4), 0.3),
    as_kiste=rusty(mk('Vorratskiste', (0.16, 0.2, 0.12), 0.2, 0.6, var=0.2, scale=1.4, wear=0.8, streak=0.25), 0.25),
    as_fenster=glass('Containerfenster', (0.006, 0.008, 0.01), (0.25, 0.38, 0.42), 0.12, rough=0.06),
    as_innen=mk('Container innen', (0.9, 0.75, 0.5), 0.0, 0.5, var=0, rvar=0, emit=(0.9, 0.7, 0.45), es=0.9, grime=False),
    as_rot=mk('Warnlicht', (1.0, 0.08, 0.05), 0.0, 0.3, var=0, rvar=0, emit=(1.0, 0.06, 0.03), es=10.0, grime=False),
)
low_spec(M['as_wand'], 0.22)
W, D, S, T = M['as_wand'], M['as_dunkel'], M['as_stahl'], M['pf_weissfarbe']
ANCH = {}
CUR[0] = coll('Aufbau')

# Kufen und Querträger
for sx in (-1, 1):
    box('Kufe', 0.22, 7.0, 0.26, sx * 1.05, 0, 0.13, S, 0.02)
    for sy in (-1, 1): box('Kufenspitze', 0.24, 0.3, 0.12, sx * 1.05, sy * 3.6, 0.2, M['ow_warn'], 0.01, (sy * 0.5, 0, 0))
for y in (-2.7, -0.9, 0.9, 2.7): box('Querträger', 2.4, 0.18, 0.18, 0, y, 0.33, S, 0.01)
# Container: Wände mit Sicken, Rahmen an den Kanten, Dach
x0, y0, z0, z1 = 1.3, 3.1, 0.42, 2.92
box('Container', 2 * x0, 2 * y0, z1 - z0, 0, 0, (z0 + z1) / 2, W, 0.03)
for sx in (-1, 1):
    for k in range(19):
        y = -y0 + 0.35 + k * 0.32
        if sx > 0 and (abs(y - 1.6) < 0.62 or abs(y + 0.9) < 0.55 or abs(y - 0.4) < 0.55): continue      # Tür und Fenster
        box('Sicke', 0.04, 0.12, z1 - z0 - 0.3, sx * (x0 + 0.02), y, (z0 + z1) / 2, W, 0.01)
for sx in (-1, 1):
    for sy in (-1, 1): box('Eckpfosten', 0.16, 0.16, z1 - z0 + 0.04, sx * (x0 - 0.04), sy * (y0 - 0.04), (z0 + z1) / 2, D, 0.01)
    box('Dachrahmen', 0.14, 2 * y0, 0.14, sx * (x0 - 0.03), 0, z1, D, 0.01); box('Bodenrahmen', 0.14, 2 * y0, 0.14, sx * (x0 - 0.03), 0, z0, D, 0.01)
for sy in (-1, 1): box('Stirnrahmen', 2 * x0, 0.14, 0.14, 0, sy * (y0 - 0.03), z1, D, 0.01)
for k in range(9): box('Dachsicke', 2 * x0 - 0.2, 0.08, 0.03, 0, -y0 + 0.5 + k * 0.65, z1 + 0.07, W, 0.005)
# Tür (rechts), Stufen, Lampe darüber, Griff
dy = 1.6
box('Tür', 0.04, 0.95, 2.05, x0 + 0.03, dy, z0 + 1.07, D, 0.01)
box('Türrahmen', 0.03, 1.1, 2.18, x0 + 0.015, dy, z0 + 1.1, S, 0.01)
box('Türgriff', 0.05, 0.04, 0.22, x0 + 0.07, dy - 0.35, z0 + 1.05, M['ow_gelb'], 0.005)
box('Türfenster', 0.02, 0.35, 0.4, x0 + 0.055, dy, z0 + 1.6, M['as_fenster'], 0.004)
for k in range(3): box('Stufe', 0.32, 0.9, 0.04, x0 + 0.2 + k * 0.28, dy, z0 - 0.12 - k * 0.11, S, 0.005)
for sy in (-1, 1): box('Treppenwange', 0.95, 0.04, 0.06, x0 + 0.47, dy + sy * 0.46, z0 - 0.25, S, 0.005, (0, 0.38, 0))
box('Lampengehäuse', 0.2, 0.3, 0.1, x0 + 0.12, dy, z0 + 2.28, D, 0.01); box('Türlampe', 0.02, 0.24, 0.06, x0 + 0.225, dy, z0 + 2.25, M['ow_licht'], 0.003)
ANCH['tuer'] = [x0 + 0.9, dy, 0]; ANCH['tuerlampe'] = [x0 + 0.24, dy, z0 + 2.25]
# Fenster mit Licht dahinter
for wy in (-0.9, 0.4):
    box('Fenster', 0.03, 0.85, 0.65, x0 + 0.035, wy, z0 + 1.45, M['as_fenster'], 0.006)
    box('Fensterrahmen', 0.03, 0.97, 0.77, x0 + 0.02, wy, z0 + 1.45, S, 0.006)
    box('Licht innen', 0.02, 0.8, 0.6, x0 - 0.06, wy, z0 + 1.45, M['as_innen'], 0)
    for k in range(4): box('Fenstergitter', 0.03, 0.025, 0.65, x0 + 0.06, wy - 0.3 + k * 0.2, z0 + 1.45, S, 0.003)
# Beschriftung
text('AUSSENSTELLE', 0.22, V((x0 + 0.06, -2.85, z0 + 2.15)), (0, 1, 0), (0, 0, 1), T)
text('VERSORGUNG · FUNK', 0.12, V((x0 + 0.06, -2.85, z0 + 1.85)), (0, 1, 0), (0, 0, 1), M['ow_gelb'])
text('AS-07', 0.32, V((-x0 - 0.06, 1.0, z0 + 1.6)), (0, -1, 0), (0, 0, 1), T)
# Klimagerät auf der Stirnseite, Kabelkanal
box('Klimagerät', 1.1, 0.5, 0.7, 0, -y0 - 0.3, z0 + 1.7, D, 0.03)
for k in range(6): box('Klimalamelle', 1.0, 0.02, 0.08, 0, -y0 - 0.56, z0 + 1.45 + k * 0.1, S, 0.003)
cyl('Lüfter', 0.22, 0.04, 0, -y0 - 0.57, z0 + 1.75, S, 'Y', n=18, bev=0.003)
pipe('Kabelkanal', [V((-0.8, -y0 - 0.05, z1 - 0.2)), V((-0.8, -y0 - 0.05, 0.6)), V((-0.8, -y0 - 1.5, 0.15))], 0.04, M['ow_kabel'])
# Funkmast auf dem Dach mit Abspannseilen, Schüssel, rotem Warnlicht oben
mb = V((-0.7, -2.2, z1 + 0.1)); mt = V((-0.7, -2.2, z1 + 6.2))
box('Mastfuß', 0.5, 0.5, 0.12, mb.x, mb.y, mb.z, S, 0.01)
for k in range(3):      # Gittermast: drei Eckrohre, Querstreben
    a = 2 * PI * k / 3; o = V((math.cos(a) * 0.16, math.sin(a) * 0.16, 0)); o2 = V((math.cos(a) * 0.07, math.sin(a) * 0.07, 0))
    ocyl('Masteckrohr', mb + o, mt + o2, 0.018, S, 6, bev=0)
for i in range(12):
    z = mb.z + 0.25 + i * 0.5; r = 0.16 - 0.09 * (z - mb.z) / (mt.z - mb.z)
    for k in range(3):
        a0 = 2 * PI * k / 3; a1 = 2 * PI * (k + 1) / 3
        ocyl('Maststrebe', V((mb.x + math.cos(a0) * r, mb.y + math.sin(a0) * r, z)), V((mb.x + math.cos(a1) * r, mb.y + math.sin(a1) * r, z + 0.25)), 0.008, S, 4, bev=0)
for (ax, ay) in ((1.2, 1.6), (-1.2, 1.2), (0.2, -1.8)): pipe('Abspannseil', [mt + V((0, 0, -1.6)), V((mb.x + ax, mb.y + ay, z1 + 0.05))], 0.006, M['ow_kabel'])
ocyl('Schüsselarm', mb + V((0, 0, 3.6)), mb + V((0.45, 0.25, 3.6)), 0.02, S, 6, bev=0)
ocyl('Schüssel', mb + V((0.45, 0.25, 3.6)), mb + V((0.62, 0.35, 3.75)), 0.42, M['pf_kunst'], 24, r2=0.05, bev=0.004)
ocyl('Speiser', mb + V((0.62, 0.35, 3.75)), mb + V((0.95, 0.55, 4.0)), 0.012, S, 6, bev=0)
for k in range(2): ocyl('Stabantenne', mt, mt + V((0.15 * (k * 2 - 1), 0, 1.4)), 0.01, S, 6, bev=0)
cyl('Warnlicht', 0.08, 0.14, mt.x, mt.y, mt.z + 0.07, M['as_rot'], 'Z', n=12, bev=0.008)
ANCH['warnlicht'] = [mt.x, mt.y, mt.z + 0.1]
# Solarfeld links neben dem Container
for k, y in enumerate((-1.6, 1.0)):
    c = V((-3.4, y, 1.3)); tilt = 0.55
    box('Solarmodul', 2.0, 2.4, 0.05, c.x, c.y, c.z, M['as_solar'], 0.01, (0, -tilt, 0))
    box('Solarrahmen', 2.06, 2.46, 0.04, c.x, c.y, c.z - 0.03, S, 0.005, (0, -tilt, 0))
    for i in range(5): box('Zellsteg', 2.0, 0.015, 0.008, c.x, c.y - 1.0 + i * 0.5, c.z + 0.03, S, 0, (0, -tilt, 0))
    for (px, h) in ((-0.75, 0.95), (0.75, 1.75)):
        for sy in (-1, 1): ocyl('Solarstütze', V((c.x + px, c.y + sy * 1.0, 0)), V((c.x + px, c.y + sy * 1.0, h)), 0.035, S, 8, bev=0)
pipe('Solarkabel', [V((-2.6, -0.3, 0.9)), V((-2.0, -0.3, 0.1)), V((-1.4, -0.3, 0.1)), V((-1.3, -0.3, 0.6))], 0.025, M['ow_kabel'])
# Dieseltank auf Böcken, hinten
tc = V((0.2, -5.2, 0.85))
ocyl('Tank', tc - V((1.3, 0, 0)), tc + V((1.3, 0, 0)), 0.62, M['as_tank'], 28, bev=0.03)
for sx in (-1, 1):
    ring('Tankband', 0.63, 0.025, (tc.x + sx * 0.75, tc.y, tc.z), (1, 0, 0), S, 28)
    box('Tankbock', 0.2, 1.2, 0.5, tc.x + sx * 0.75, tc.y, 0.25, S, 0.01)
ocyl('Tankstutzen', tc + V((0.4, 0, 0.6)), tc + V((0.4, 0, 0.78)), 0.07, S, 10, bev=0.004)
text('DIESEL', 0.2, V((tc.x - 0.45, tc.y - 0.63, tc.z - 0.05)), (1, 0, 0), (0, 0, 1), M['ow_gelb'])
pipe('Tankleitung', [tc + V((-1.0, 0.4, -0.4)), V((-0.6, -3.3, 0.5)), V((-0.6, -y0 - 0.02, 0.8))], 0.03, M['ow_kabel'])
# Vorratskisten: gestapelt vor dem Container, Plane halb darüber
R = random.Random(7)
for (x, y, z, w, d, h) in ((2.6, -1.8, 0.0, 1.2, 0.9, 0.8), (2.65, -0.8, 0.0, 1.2, 0.9, 0.8), (2.6, -1.3, 0.8, 1.2, 0.9, 0.7), (3.9, -1.4, 0.0, 0.9, 1.1, 0.7), (3.95, -0.1, 0.0, 0.8, 0.8, 0.6)):
    rz = R.uniform(-0.12, 0.12)
    box('Vorratskiste', w, d, h, x, y, z + h / 2, M['as_kiste'], 0.02, (0, 0, rz))
    box('Kistenband', w + 0.02, 0.06, h + 0.02, x, y, z + h / 2, S, 0.003, (0, 0, rz))
text('VORRÄTE', 0.13, V((3.06, -2.15, 0.45)), (0, 1, 0), (0, 0, 1), T)
text('VORRÄTE', 0.11, V((4.36, -1.85, 0.4)), (0, 1, 0), (0, 0, 1), T)
# Flutlichtmast und Landelicht
fb = V((4.4, 2.6, 0)); ft = V((4.4, 2.6, 5.0))
box('Mastfundament', 0.6, 0.6, 0.2, fb.x, fb.y, 0.1, M['pf_deck'], 0.02)
ocyl('Lichtmast', fb + V((0, 0, 0.2)), ft, 0.07, S, 10, r2=0.05, bev=0)
box('Querarm', 0.9, 0.08, 0.08, ft.x, ft.y, ft.z, S, 0.005)
for sx in (-1, 1):
    ocyl('Strahler', V((ft.x + sx * 0.35, ft.y, ft.z - 0.05)), V((ft.x + sx * 0.35, ft.y - 0.2, ft.z - 0.2)), 0.12, D, 12, bev=0.01)
    ocyl('Strahlerglas', V((ft.x + sx * 0.35, ft.y - 0.2, ft.z - 0.2)), V((ft.x + sx * 0.35, ft.y - 0.21, ft.z - 0.21)), 0.1, M['ow_licht'], 12, bev=0)
ANCH['flutlicht'] = [[ft.x + sx * 0.35, ft.y - 0.25, ft.z - 0.22] for sx in (-1, 1)]
for k in range(6):      # Begrenzungspfosten mit Reflektoren um den Platz
    a = 2 * PI * k / 6 + 0.3; p = V((math.cos(a) * 7.5, math.sin(a) * 7.5, 0))
    ocyl('Pfosten', p, p + V((0, 0, 1.0)), 0.04, M['ow_gelb'], 8, bev=0)
    box('Reflektor', 0.06, 0.06, 0.12, p.x, p.y, 0.92, M['ow_licht'], 0.003)
ANCH['pfosten'] = [[round(math.cos(2 * PI * k / 6 + 0.3) * 7.5, 2), round(math.sin(2 * PI * k / 6 + 0.3) * 7.5, 2), 0.92] for k in range(6)]

# ---------- Bühne ----------
def stages():
    CUR[0] = C_STU
    sun = bpy.data.lights.new('Sonne', 'SUN'); sun.energy = 3.2; sun.angle = math.radians(3.0)
    so = bpy.data.objects.new('Sonne', sun); C_STU.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(140)); STAGE['sun'] = so
    w = SC.world or bpy.data.worlds.new('Welt'); SC.world = w; w.use_nodes = True; STAGE['world'] = w
    nt = w.node_tree; N_ = nt.nodes
    for n in list(N_): N_.remove(n)
    out = N_.new('ShaderNodeOutputWorld'); bg = N_.new('ShaderNodeBackground'); nt.links.new(bg.outputs[0], out.inputs[0]); bg.inputs['Color'].default_value = (0.13, 0.13, 0.135, 1); bg.inputs['Strength'].default_value = 0.55
    CUR[0] = C_GRAU
    box('Boden', 40, 40, 0.1, 0, 0, -0.05, mk('Studioboden', (0.1, 0.1, 0.1), 0.0, 0.8, var=0.05, grime=False), 0)
    cam('Schraeg', (12, 10, 5.5), (0, 0, 1.8), 35)
    cam('Heck', (-11, -11, 6), (0, -1, 2.0), 35)
VIEWS = {'schraeg': ('Schraeg', 0.3), 'heck': ('Heck', 0.3)}
def view(name, path, res=(1600, 900)):
    camn, ex = VIEWS[name]; SC.view_settings.exposure = ex
    SC.camera = CAMS[camn]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = 100
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)
stages()
json.dump(ANCH, open(os.path.join(os.path.dirname(bpy.data.filepath), 'as-anker.json'), 'w', encoding='utf-8'), indent=1)
result = {'objekte': len([o for o in bpy.data.objects if o.users_collection])}
