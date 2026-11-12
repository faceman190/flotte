# Außenposten für die Planetenoberflächen (Letzte Crew). Läuft in Blender (Textblock posten_build in Aussenposten.blend).
# Maße in Metern, Blender-Koordinaten: +Z oben, Vorderseite des Gebäudes zeigt nach -Y (im Spiel +Z).
# Ursprung = Boden in der Mitte des Hauptgebäudes. Materialnamen posten_* werden im Spiel ersetzt (src/models/stationModels.ts).
import bpy, bmesh, math
from mathutils import Vector, Matrix

COL = 'Posten'

def coll():
    c = bpy.data.collections.get(COL)
    if not c:
        c = bpy.data.collections.new(COL); bpy.context.scene.collection.children.link(c)
    return c

MATS = {
    'posten_metal': (0.34, 0.35, 0.37, 0.55, 0.5), 'posten_dark': (0.09, 0.095, 0.105, 0.6, 0.45),
    'posten_yellow': (0.85, 0.55, 0.06, 0.5, 0.2), 'posten_red': (0.45, 0.09, 0.06, 0.55, 0.2),
    'posten_white': (0.75, 0.76, 0.78, 0.5, 0.1), 'posten_concrete': (0.45, 0.45, 0.44, 0.9, 0.0),
    'posten_rubber': (0.03, 0.03, 0.03, 0.9, 0.0), 'posten_green': (0.2, 0.26, 0.18, 0.6, 0.2),
    'posten_light': (1.0, 0.95, 0.85, 0.3, 0.0), 'posten_redlamp': (1.0, 0.15, 0.08, 0.3, 0.0),
    'posten_lamp': (1.0, 0.6, 0.15, 0.3, 0.0), 'posten_screen': (0.25, 0.6, 0.85, 0.3, 0.0),
}
GLOW = {'posten_light', 'posten_redlamp', 'posten_lamp', 'posten_screen'}

def mat(name):
    m = bpy.data.materials.get(name)
    if m: return m
    r, g, b, rough, metal = MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (r, g, b, 1); p.inputs['Roughness'].default_value = rough; p.inputs['Metallic'].default_value = metal
    if name in GLOW:
        p.inputs['Emission Color'].default_value = (r, g, b, 1); p.inputs['Emission Strength'].default_value = 6.0
    m.diffuse_color = (r, g, b, 1)
    return m

def obj_from_bm(name, bm, m):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    me.materials.append(mat(m))
    o = bpy.data.objects.new(name, me); coll().objects.link(o)
    return o

def box(name, size, loc, m, rot=(0, 0, 0), bevel=0.0):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, affect='EDGES', profile=0.5)
    o = obj_from_bm(name, bm, m); o.location = loc; o.rotation_euler = rot
    return o

def cyl(name, r, h, loc, m, rot=(0, 0, 0), seg=16, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h)
    o = obj_from_bm(name, bm, m); o.location = loc; o.rotation_euler = rot
    return o

def sphere(name, r, loc, m, seg=16):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    o = obj_from_bm(name, bm, m); o.location = loc
    return o

def poly(name, verts, faces, m):
    bm = bmesh.new(); vs = [bm.verts.new(v) for v in verts]
    for f in faces: bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, m)

def prism(name, profile, y0, y1, m):
    """Körper aus einem Querschnitt in der X/Z-Ebene (Liste von (x, z), gegen den Uhrzeigersinn), gezogen von y0 bis y1."""
    n = len(profile)
    verts = [(x, y0, z) for x, z in profile] + [(x, y1, z) for x, z in profile]
    faces = [list(range(n))[::-1], [n + i for i in range(n)]]
    for i in range(n): j = (i + 1) % n; faces.append([i, j, n + j, n + i])
    return poly(name, verts, faces, m)

def beam(name, a, b, w, h, m):
    """Balken von Punkt a nach Punkt b (Querschnitt w × h)."""
    a, b = Vector(a), Vector(b); d = b - a
    o = box(name, (w, d.length, h), (a + b) / 2, m)
    o.rotation_euler = d.to_track_quat('Y', 'Z').to_euler()
    return o

def clear():
    c = bpy.data.collections.get(COL)
    if c:
        for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes):
        if me.users == 0: bpy.data.meshes.remove(me)

# ------------------------------------------------------------------ Hauptgebäude
def build_main():
    # Sockel: flache Plattform, vorne abgeschrägt
    prism('Sockel', [(-34, 0), (34, 0), (32, 1.6), (-32, 1.6)], -9, 20, 'posten_concrete')
    # Mittelbau mit Tor
    box('Mittelbau', (17, 22, 12), (0, 6, 7.6), 'posten_metal', bevel=0.15)
    box('Torrahmen_L', (2.4, 2.4, 13), (-7.4, -5.6, 8.1), 'posten_dark', bevel=0.1)
    box('Torrahmen_R', (2.4, 2.4, 13), (7.4, -5.6, 8.1), 'posten_dark', bevel=0.1)
    box('Torsturz', (17.2, 3, 3.2), (0, -5.4, 13.6), 'posten_dark', bevel=0.1)
    box('Tor', (11.6, 0.6, 8.6), (0, -5.2, 6.0), 'posten_dark')
    box('Tor_Spalt', (0.25, 0.7, 8.6), (0, -5.5, 6.0), 'posten_rubber')
    for i in range(6): box(f'Tor_Rippe_{i}', (11.2, 0.3, 0.25), (0, -5.55, 2.4 + i * 1.35), 'posten_metal')
    box('Tor_Schild', (5, 0.3, 1.0), (0, -7.05, 12.6), 'posten_screen')
    box('Tor_Gitter', (4, 0.4, 1.4), (0, -7.1, 14.3), 'posten_rubber')
    for s in (-1, 1):
        box(f'Torlicht_{s}', (0.5, 0.3, 0.5), (s * 7.4, -6.95, 10.6), 'posten_redlamp')
        box(f'Torleuchte_{s}', (0.3, 0.6, 3.0), (s * 8.75, -6.9, 7.0), 'posten_light')
    # Rampe vom Tor zum Boden mit Seitenwangen
    poly('Rampe_Flaeche', [(-5.6, -9.0, 1.62), (5.6, -9.0, 1.62), (5.6, -20, 0.02), (-5.6, -20, 0.02),
                           (-5.6, -9.0, 0.0), (5.6, -9.0, 0.0)],
         [[0, 1, 2, 3], [4, 0, 3], [1, 5, 2], [4, 5, 1, 0]], 'posten_concrete')
    for s in (-1, 1):
        x = s * 6.4
        poly(f'Rampe_Wange_{s}', [(x - 0.5, -9.0, 0), (x + 0.5, -9.0, 0), (x + 0.5, -9.0, 2.6), (x - 0.5, -9.0, 2.6),
                                  (x - 0.5, -19.5, 0), (x + 0.5, -19.5, 0), (x + 0.5, -19.5, 0.5), (x - 0.5, -19.5, 0.5)],
             [[0, 1, 2, 3], [5, 4, 7, 6], [0, 4, 5, 1], [3, 2, 6, 7], [0, 3, 7, 4], [1, 5, 6, 2]], 'posten_dark')
        beam(f'Rampe_Gelaender_{s}', (x, -9.2, 3.7), (x, -19.2, 1.5), 0.25, 0.25, 'posten_yellow')
        for k, (yy, zz) in enumerate([(-11.5, 2.4), (-15, 1.6), (-18.5, 0.9)]):
            cyl(f'Rampe_Pfosten_{s}_{k}', 0.12, zz, (x, yy, zz / 2 + 0.9 - k * 0.3), 'posten_metal', seg=8)
        box(f'Rampe_Licht_{s}', (0.5, 0.5, 0.3), (x, -19.8, 0.6), 'posten_redlamp')
    # Flügel: schräge Dächer links und rechts, vorne mit Kante, gelbe Träger auf der Schräge
    for s in (-1, 1):
        prof = [(8.4, 1.6), (31, 1.6), (31, 2.6), (8.4, 9.4)]
        if s < 0: prof = [(-x, z) for x, z in reversed(prof)]
        prism(f'Fluegel_{s}', prof, -6.5, 17.5, 'posten_metal')
        prism(f'Fluegel_Dachkante_{s}', [(s * 8.4, 9.4), (s * 8.4, 10.0), (s * 31.6, 3.0), (s * 31.6, 2.4)] if s > 0
              else [(s * 31.6, 2.4), (s * 31.6, 3.0), (s * 8.4, 10.0), (s * 8.4, 9.4)], -7.2, -6.2, 'posten_dark')
        for yy in (-6.9, 5.5, 17.2):
            beam(f'Fluegel_Traeger_{s}_{yy}', (s * 8.6, yy, 10.3), (s * 31.4, yy, 3.3), 0.9, 0.7, 'posten_yellow')
        # Plattennähte und Dachluken auf der Schräge
        for xx in (13.0, 17.6, 22.2, 26.8):
            zz = 9.4 - (xx - 8.4) * 0.301 + 0.04
            o = box(f'Fluegel_Naht_{s}_{xx}', (0.22, 23.6, 0.1), (s * xx, 5.5, zz), 'posten_dark')
            o.rotation_euler = (0, -s * 0.2925, 0)
        for k, (xx, yy) in enumerate([(15.3, 1.5), (24.5, 12.0)]):
            zz = 9.4 - (xx - 8.4) * 0.301 + 0.12
            o = box(f'Dachluke_{s}_{k}', (2.4, 3.0, 0.25), (s * xx, yy, zz), 'posten_dark', bevel=0.05)
            o.rotation_euler = (0, -s * 0.2925, 0)
        # Frontwand des Flügels mit Fenstern, Laufsteg und Rohren
        box(f'Fluegel_Front_{s}', (22, 0.6, 1.0), (s * 19.7, -6.9, 2.1), 'posten_dark')
        for k in range(4):
            box(f'Fluegel_Luke_{s}_{k}', (3.2, 0.3, 1.4), (s * (12 + k * 5), -6.7, 4.6 - k * 0.55), 'posten_dark')
            box(f'Fluegel_Fenster_{s}_{k}', (2.4, 0.32, 0.4), (s * (12 + k * 5), -6.75, 4.9 - k * 0.55), 'posten_light')
        box(f'Steg_{s}', (21, 2.2, 0.3), (s * 20, -8.4, 3.0), 'posten_dark')
        for k in range(8):
            cyl(f'Steg_Stuetze_{s}_{k}', 0.12, 2.9, (s * (10.5 + k * 2.7), -9.3, 1.45), 'posten_metal', seg=6)
        beam(f'Steg_Gelaender_{s}', (s * 9.8, -9.4, 4.1), (s * 30.2, -9.4, 4.1), 0.12, 0.12, 'posten_yellow')
        for k in range(9):
            cyl(f'Steg_Pfosten_{s}_{k}', 0.06, 1.1, (s * (9.8 + k * 2.55), -9.4, 3.6), 'posten_metal', seg=6)
        for zz, rr in ((4.3, 0.45), (5.2, 0.3)):
            cyl(f'Rohr_{s}_{zz}', rr, 12, (s * 15.5, -7.2, zz), 'posten_yellow', rot=(0, math.pi / 2, 0), seg=12)
        for k in range(4):
            box(f'Rohr_Schelle_{s}_{k}', (0.3, 1.2, 1.8), (s * (11 + k * 3), -7.0, 4.7), 'posten_dark')
        # Stützen unter der Flügelkante, Lüftungen auf dem Dach
        for k in range(3):
            box(f'Fluegel_Stuetze_{s}_{k}', (1.0, 1.0, 2.0), (s * (14 + k * 7), -7.6, 1.0), 'posten_dark')
        for k in range(2):
            box(f'Luefter_{s}_{k}', (2.6, 2.6, 1.0), (s * (14 + k * 7), 6 + k * 4, 9.4 - (5.6 + k * 7) * 0.301 + 0.45), 'posten_dark', bevel=0.08)
    # Rückseite
    box('Rueckwand', (60, 1.2, 2.2), (0, 18.4, 2.7), 'posten_dark')
    # Turm hinter dem Tor
    box('Turm_Unten', (9, 9, 10), (0, 9, 18.6), 'posten_metal', bevel=0.12)
    box('Turm_Oben', (6.5, 6.5, 7), (0, 9.5, 27.1), 'posten_metal', bevel=0.1)
    for sx in (-1, 1):
        for sy in (-1, 1):
            beam(f'Turm_Strebe_{sx}_{sy}', (sx * 4.6, 9 + sy * 4.6, 13.6), (sx * 3.4, 9.5 + sy * 3.4, 30.4), 0.6, 0.6, 'posten_yellow')
    box('Turm_Band', (9.3, 9.3, 0.8), (0, 9, 23.2), 'posten_dark')
    for k in range(3): box(f'Turm_Fenster_{k}', (5.2, 0.3, 0.6), (0, 4.4, 19 + k * 1.4), 'posten_light')
    box('Turm_Dach', (7.2, 7.2, 0.6), (0, 9.5, 30.9), 'posten_dark')
    cyl('Antenne', 0.18, 12, (2, 11, 37.2), 'posten_metal', seg=8)
    cyl('Antenne_2', 0.1, 6, (-2.2, 8.6, 34.2), 'posten_metal', seg=6)
    box('Antenne_Licht', (0.4, 0.4, 0.4), (2, 11, 43.3), 'posten_redlamp')
    cyl('Schuessel_Arm', 0.2, 2.0, (-1.5, 11.5, 32.2), 'posten_metal', seg=8)
    cyl('Schuessel', 2.0, 0.6, (-1.5, 11.5, 33.6), 'posten_white', rot=(math.radians(35), 0, 0), seg=20, r2=0.4)
    # Geschützturm vorne auf dem Mittelbau
    cyl('Geschuetz_Sockel', 1.6, 1.0, (0, -1.5, 14.1), 'posten_dark', seg=16)
    box('Geschuetz_Gehaeuse', (2.6, 3.2, 1.8), (0, -1.6, 15.5), 'posten_metal', bevel=0.12)
    for s in (-1, 1):
        cyl(f'Geschuetz_Lauf_{s}', 0.16, 3.6, (s * 0.6, -4.6, 15.6), 'posten_dark', rot=(math.pi / 2, 0, 0), seg=8)
    # Technikkasten rechts auf dem Dach
    box('Technik', (4, 3.4, 3), (5.5, 15.2, 15.1), 'posten_metal', bevel=0.1)
    for k in range(3): box(f'Technik_Rippe_{k}', (0.25, 3.0, 2.4), (7.6, 14.2 + k * 1.0, 15.1), 'posten_dark')

# ------------------------------------------------------------------ Requisiten
def light_mast(name, x, y, h=15):
    box(name + '_Fuss', (1.8, 1.8, 1.2), (x, y, 0.6), 'posten_dark', bevel=0.1)
    box(name + '_Kasten', (0.9, 0.9, 3.2), (x, y, 2.8), 'posten_metal')
    cyl(name + '_Mast', 0.28, h, (x, y, h / 2 + 1.2), 'posten_dark', seg=10)
    box(name + '_Kreuz', (3.6, 0.3, 0.3), (x, y, h + 1.0), 'posten_dark')
    for s in (-1, 1):
        box(name + f'_Lampe_{s}', (1.2, 0.8, 0.4), (s * 1.5 + x, y, h + 0.7), 'posten_metal')
        box(name + f'_Licht_{s}', (1.0, 0.6, 0.12), (s * 1.5 + x, y, h + 0.45), 'posten_light')

def cage(name, x, y, z=0, s=2.4):
    h = s
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(f'{name}_Ecke_{sx}_{sy}', (0.18, 0.18, h), (x + sx * s / 2, y + sy * s / 2, z + h / 2), 'posten_dark')
    for zz in (0.1, h - 0.1):
        for sy in (-1, 1): box(f'{name}_Q_{zz}_{sy}', (s, 0.16, 0.16), (x, y + sy * s / 2, z + zz), 'posten_dark')
        for sx in (-1, 1): box(f'{name}_L_{zz}_{sx}', (0.16, s, 0.16), (x + sx * s / 2, y, z + zz), 'posten_dark')
    cyl(name + '_Fass', s * 0.4, h * 0.82, (x, y, z + h / 2), 'posten_red', seg=14)
    cyl(name + '_Deckel', s * 0.41, 0.12, (x, y, z + h * 0.92), 'posten_metal', seg=14)

def crate(name, x, y, z, sx, sy, sz, m='posten_white', stripe='posten_red'):
    box(name, (sx, sy, sz), (x, y, z + sz / 2), m, bevel=0.06)
    box(name + '_Streifen', (sx + 0.04, sy * 0.3, sz + 0.04), (x, y, z + sz / 2), stripe)

def wheel(name, x, y, z, r=0.55, w=0.4):
    cyl(name, r, w, (x, y, z), 'posten_rubber', rot=(0, math.pi / 2, 0), seg=14)
    cyl(name + '_Nabe', r * 0.45, w + 0.04, (x, y, z), 'posten_metal', rot=(0, math.pi / 2, 0), seg=10)

def hauler(x, y):
    box('Lader_Rahmen', (3.2, 7.4, 0.8), (x, y, 1.0), 'posten_dark', bevel=0.06)
    for sx in (-1, 1):
        for yy in (-2.6, 2.6): wheel(f'Lader_Rad_{sx}_{yy}', x + sx * 1.7, y + yy, 0.6, 0.6, 0.5)
    box('Lader_Kabine', (3.0, 2.0, 2.2), (x, y - 2.6, 2.5), 'posten_green', bevel=0.1)
    box('Lader_Scheibe', (2.6, 0.1, 0.8), (x, y - 3.62, 2.9), 'posten_screen')
    crate('Lader_Container', x, y + 1.0, 1.4, 2.9, 4.4, 2.6, 'posten_white', 'posten_red')
    box('Lader_Schild', (0.1, 1.4, 0.8), (x + 1.5, y + 1.0, 3.2), 'posten_dark')

def cart(x, y):
    box('Wagen_Deck', (2.6, 6.4, 0.3), (x, y, 0.75), 'posten_metal')
    box('Wagen_Rahmen', (2.2, 6.0, 0.25), (x, y, 0.5), 'posten_dark')
    for sx in (-1, 1):
        for yy in (-2.5, 2.5): wheel(f'Wagen_Rad_{sx}_{yy}', x + sx * 1.15, y + yy, 0.38, 0.38, 0.3)
    beam('Wagen_Deichsel', (x, y - 3.2, 0.6), (x, y - 4.6, 0.4), 0.2, 0.2, 'posten_dark')
    crate('Wagen_Kiste_1', x, y - 1.9, 0.9, 1.6, 1.6, 1.4, 'posten_yellow', 'posten_dark')
    crate('Wagen_Kiste_2', x - 0.4, y + 0.5, 0.9, 1.2, 1.4, 1.2, 'posten_white', 'posten_dark')
    crate('Wagen_Kiste_3', x + 0.5, y + 1.9, 0.9, 1.2, 1.2, 1.0, 'posten_white', 'posten_dark')
    cyl('Wagen_Fass', 0.35, 1.0, (x + 0.7, y + 0.4, 1.4), 'posten_screen' if False else 'posten_metal', seg=10)
    for yy in (-0.8, 2.9): box(f'Wagen_Bügel_{yy}', (2.4, 0.12, 1.2), (x, y + yy, 1.5), 'posten_dark')

def platform(name, x, y, sx=8, sy=8, h=1.4, stairs=1):
    box(name + '_Deck', (sx, sy, 0.3), (x, y, h), 'posten_dark')
    for ax in (-1, 1):
        for ay in (-1, 1):
            box(f'{name}_Bein_{ax}_{ay}', (0.4, 0.4, h), (x + ax * (sx / 2 - 0.4), y + ay * (sy / 2 - 0.4), h / 2), 'posten_metal')
    for ay in (-1, 1):
        beam(f'{name}_Gel_{ay}', (x - sx / 2, y + ay * sy / 2, h + 1.1), (x + sx / 2, y + ay * sy / 2, h + 1.1), 0.1, 0.1, 'posten_yellow')
    beam(f'{name}_Gel_x', (x + stairs * sx / 2, y - sy / 2, h + 1.1), (x + stairs * sx / 2, y + sy / 2, h + 1.1), 0.1, 0.1, 'posten_yellow')
    # Treppe an der offenen Seite
    for k in range(5):
        box(f'{name}_Stufe_{k}', (0.6, 1.6, 0.12), (x - stairs * (sx / 2 + 0.3 + k * 0.6), y - sy / 2 + 1.2, h - (k + 1) * h / 6), 'posten_metal')

def build_props():
    for i, (x, y) in enumerate([(-30, -20), (30, -20), (-38, 24), (38, 24), (-89, -38), (-62, -65)]):
        light_mast(f'Mast_{i}', x, y)
    # Fässer in Käfigen rechts vor dem Gebäude
    k = 0
    for row, yy in enumerate((-12.5, -15.5)):
        for xx in (16, 19, 22, 25.5)[: 4 - row]:
            cage(f'Kaefig_{k}', xx, yy); k += 1
    cage(f'Kaefig_{k}', 16, -12.5, 2.45); k += 1
    cyl('Fass_einzeln', 0.45, 1.1, (13.6, -15.2, 0.55), 'posten_screen' if False else 'posten_dark', seg=10)
    hauler(-16, -14)
    cart(-6, -26)
    # zwei erhöhte Ladeplattformen rechts mit Maschinen und Kisten
    platform('Plattform_A', 42, -6, 9, 9, 1.6, stairs=-1)
    cyl('Plattform_A_Tank', 1.4, 3.2, (43, -4, 1.75 + 1.6), 'posten_dark', rot=(0, math.pi / 2, 0), seg=16)
    cyl('Plattform_A_Tank2', 1.0, 2.4, (43, -8.4, 1.75 + 1.2), 'posten_metal', rot=(0, math.pi / 2, 0), seg=14)
    crate('Plattform_A_Kiste', 39.5, -2.5, 1.75, 1.8, 1.8, 1.5, 'posten_yellow', 'posten_dark')
    platform('Plattform_B', 44, -19, 9, 9, 1.6, stairs=-1)
    for i, (xx, yy) in enumerate([(41.5, -17), (44, -17), (46.5, -17), (41.5, -21), (44, -21)]):
        cage(f'Plattform_B_Kaefig_{i}', xx, yy, 1.75, 2.0)
    crate('Plattform_B_Kiste', 46.6, -21.2, 1.75, 1.6, 1.6, 1.4, 'posten_yellow', 'posten_dark')
    # Tanks auf Ständern links
    for i, xx in enumerate((-28, -23.5)):
        box(f'Tank_Bock_{i}', (3.2, 3.2, 0.8), (xx, -13, 0.4), 'posten_dark')
        sphere(f'Tank_{i}', 1.8, (xx, -13, 2.6), 'posten_white')
        box(f'Tank_Band_{i}', (3.8, 0.4, 0.4), (xx, -13, 2.6), 'posten_dark')
    for i in range(3): crate(f'Kiste_links_{i}', -29 + i * 2.2, -17.5, 0, 2.0, 1.6, 1.4 + (i % 2) * 0.4, 'posten_white', 'posten_red')
    crate('Kiste_gelb', -22.5, -17.8, 0, 1.6, 1.6, 1.4, 'posten_yellow', 'posten_dark')
    # Peilscheibe (Funkbake) und Markierungspfosten
    cyl('Bake', 3.2, 0.7, (26, -32, 0.35), 'posten_metal', seg=24, r2=1.2)
    cyl('Bake_Kopf', 0.5, 1.0, (26, -32, 1.2), 'posten_dark', seg=10)
    box('Bake_Licht', (0.3, 0.3, 0.3), (26, -32, 1.85), 'posten_lamp')
    for i, (x, y) in enumerate([(-20, -38), (-8, -44), (10, -42), (40, -40), (58, -10), (56, 14), (-50, 10), (-32, -30)]):
        cyl(f'Pfosten_{i}', 0.1, 2.6, (x, y, 1.3), 'posten_dark', seg=6)
        box(f'Pfosten_Licht_{i}', (0.25, 0.25, 0.25), (x, y, 2.7), 'posten_lamp')
        box(f'Pfosten_Kasten_{i}', (0.35, 0.3, 0.6), (x, y - 0.2, 1.4), 'posten_metal')
    # Abwehrgeschütz auf Gestell links
    box('Abwehr_Gestell', (4.5, 4.5, 1.2), (-52, -6, 0.6), 'posten_dark', bevel=0.08)
    cyl('Abwehr_Drehteil', 1.2, 0.8, (-52, -6, 1.6), 'posten_metal', seg=14)
    box('Abwehr_Gehaeuse', (2.2, 2.8, 1.4), (-52, -6, 2.7), 'posten_metal', bevel=0.1)
    for s in (-1, 1): cyl(f'Abwehr_Lauf_{s}', 0.12, 3.2, (-52 + s * 0.5, -9.2, 2.8), 'posten_dark', rot=(math.radians(80), 0, 0), seg=8)
    cyl('Abwehr_Mast', 0.1, 4.0, (-50.6, -4.8, 4.0), 'posten_metal', seg=6)

# ------------------------------------------------------------------ Landefeld links vorne
PAD = (-62, -38)            # Mitte des Landefelds (Blender x, y); im Spiel ausgelesen über stationModels.ts
def build_pad():
    x, y = PAD
    prism('Landefeld', [(x - 24, 0), (x + 24, 0), (x + 23, 0.6), (x - 23, 0.6)], y - 23.5, y + 23.5, 'posten_concrete')
    for s in (-1, 1):
        box(f'Landefeld_Rand_x_{s}', (46, 0.6, 0.05), (x, y + s * 21.5, 0.63), 'posten_yellow')
        box(f'Landefeld_Rand_y_{s}', (0.6, 43, 0.05), (x + s * 21.5, y, 0.63), 'posten_yellow')
    # Kreis aus Segmenten und ein Kreuz in der Mitte
    n = 28
    for i in range(n):
        a = i / n * math.tau
        o = box(f'Landefeld_Kreis_{i}', (0.5, 2.6, 0.05), (x + math.cos(a) * 12, y + math.sin(a) * 12, 0.63), 'posten_white')
        o.rotation_euler = (0, 0, a)
    box('Landefeld_Kreuz_a', (10, 0.8, 0.05), (x, y, 0.64), 'posten_white')
    box('Landefeld_Kreuz_b', (0.8, 10, 0.05), (x, y, 0.64), 'posten_white')
    for sx in (-1, 1):
        for sy in (-1, 1):
            box(f'Landefeld_Ecklicht_{sx}_{sy}', (0.7, 0.7, 0.35), (x + sx * 22.6, y + sy * 22.6, 0.8), 'posten_lamp')

def build_all():
    clear()
    build_main(); build_props(); build_pad()
    return len(coll().objects)
