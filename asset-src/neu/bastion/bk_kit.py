# Bastion-Baukasten: Innenräume aus Zellen von 4 × 4 m, im Look des Wartungsgangs (../gang).
# Aufruf in Blender (Datei BastionKit.blend in diesem Ordner):  exec(compile(open(PFAD, encoding='utf-8').read(), PFAD, 'exec'))
# Aufbau:
#   Hüllen (shell):  je Zelle Boden, Decke und vier Seiten. Eine Seite ist Wand, offen, Spant, Tor … Daraus entstehen gerader Gang, Ecke,
#                    Abzweig, Kreuzung, Gangende und Raumzellen von selbst.
#   Wandfüllungen:   2 m breite Stücke für eine Wandseite (Felder, Gitter, Terminal, Rohre, Schränke, Spinde, Bank, Fenster, Bildschirm …)
#   Objekte:         frei stehende Teile (Kisten, Fass, Wagen, Besprechungstisch, Stühle, Stehtisch, Pflanzkübel, Automat, Infosäule)
#   Plan:            ein Deck als Textkarte (PLAN); assemble() setzt Hüllen, Wandfüllungen, Objekte und Türschilder
# Jeder Baustein wird einmal gebaut (eigene Sammlung) und dann beliebig oft als Instanz gesetzt.
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix, Euler
PI = math.pi
HERE = os.path.dirname(bpy.data.filepath)
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for c in list(bpy.data.collections): bpy.data.collections.remove(c)
for dc in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.lights, bpy.data.cameras):
    for d in list(dc):
        if d.users == 0: dc.remove(d)
SC = bpy.context.scene
CUR = [SC.collection]; REC = [None]
W = 1.7; XL, XR = -W, W; FX = XR - 0.03      # halbe Gangbreite; die „linke Wand“ (x = −W) ist die Bezugsseite aller Wandteile
H1, HC, CX, RH, CELL = 2.1, 2.9, 0.9, 3.4, 4.0      # Wandhöhe, Gangdecke, halbe Deckenbreite, Raumhöhe, Zellenmaß
DL = math.hypot(W - CX, HC - H1)
exec(compile(open(os.path.join(HERE, 'bk_lib.py'), encoding='utf-8').read(), 'bk_lib.py', 'exec'))
M['floor2'] = mk('Raumboden', (0.06, 0.066, 0.074), 0.6, 0.45, scale=9, bump=0.25, wear=0.5)
M['polster'] = mk('Polster', (0.03, 0.07, 0.075), 0.0, 0.9, var=0.25, bump=0.5, bscale=420.0)
M['blatt'] = mk('Blatt', (0.02, 0.16, 0.035), 0.0, 0.5, var=0.5, scale=3.0, grime=False)
M['erde'] = mk('Erde', (0.025, 0.018, 0.012), 0.0, 0.95, var=0.3, grime=False)
M['e_cool'] = mk('Lichtfuge', (0.6, 0.9, 1.0), 0, 0.3, var=0, rvar=0, emit=(0.55, 0.85, 1.0), es=3.0, grime=False)
M['e_panel'] = mk('Lichtfeld', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.85, 0.92, 1.0), es=3.5, grime=False)
M['e_warm'] = mk('Licht warm', (1, 0.8, 0.5), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.72, 0.42), es=5.0, grime=False)
M['e_warmp'] = mk('Lichtfeld warm', (1, 0.8, 0.5), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.76, 0.5), es=2.2, grime=False)
M['e_dim'] = mk('Lichtfeld gedimmt', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.8, 0.9, 1.0), es=0.7, grime=False)
M['kissen'] = mk('Kissen', (0.55, 0.55, 0.5), 0.0, 0.9, var=0.15, bump=0.4, bscale=380.0, grime=False)
WARM = (1.0, 0.78, 0.55)
M['screen2'] = stripes('Wandbild', (0.1, 0.62, 0.7), (0.0, 0.05, 0.07), 9, emit=2.6, direction='Z', duty=0.35)
def stars_mat():      # wenige scharfe Sterne (Voronoi-Punkte, von einem groben Rauschen ausgedünnt) vor fast schwarzem Grund
    m = bpy.data.materials.new('Sternfeld'); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; K = nt.links
    b = next(n for n in N if n.type == 'BSDF_PRINCIPLED'); I(b, 'Base Color').default_value = (0, 0, 0, 1); I(b, 'Roughness').default_value = 0.4
    tc = N.new('ShaderNodeTexCoord'); vo = N.new('ShaderNodeTexVoronoi'); I(vo, 'Scale').default_value = 55.0; K.new(tc.outputs['Object'], vo.inputs['Vector'])
    dot = N.new('ShaderNodeMapRange'); I(dot, 'From Min').default_value = 0.0; I(dot, 'From Max').default_value = 0.05; I(dot, 'To Min').default_value = 1.0; I(dot, 'To Max').default_value = 0.0; K.new(vo.outputs[0], I(dot, 'Value'))
    nz = N.new('ShaderNodeTexNoise'); I(nz, 'Scale').default_value = 16.0; I(nz, 'Detail').default_value = 2.0; K.new(tc.outputs['Object'], nz.inputs['Vector'])
    thin = N.new('ShaderNodeMapRange'); I(thin, 'From Min').default_value = 0.56; I(thin, 'From Max').default_value = 0.62; I(thin, 'To Max').default_value = 7.0; K.new(nz.outputs[0], I(thin, 'Value'))
    mu = N.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; K.new(dot.outputs[0], mu.inputs[0]); K.new(thin.outputs[0], mu.inputs[1])
    nb = N.new('ShaderNodeTexNoise'); I(nb, 'Scale').default_value = 1.1; I(nb, 'Detail').default_value = 5.0; K.new(tc.outputs['Object'], nb.inputs['Vector'])
    mb = N.new('ShaderNodeMapRange'); I(mb, 'From Min').default_value = 0.5; I(mb, 'From Max').default_value = 0.9; I(mb, 'To Max').default_value = 0.035; K.new(nb.outputs[0], I(mb, 'Value'))
    ad = N.new('ShaderNodeMath'); ad.operation = 'ADD'; K.new(mu.outputs[0], ad.inputs[0]); K.new(mb.outputs[0], ad.inputs[1])
    I(b, 'Emission Color', 'Emission').default_value = (0.6, 0.75, 1.0, 1); K.new(ad.outputs[0], I(b, 'Emission Strength')); return m
M['sterne'] = stars_mat()
AMB, COOL = (1.0, 0.45, 0.08), (0.82, 0.9, 1.0)
def onslope(t, off): return (-(W - (W - CX) * t - off * 0.7071), H1 + (HC - H1) * t - off * 0.7071)      # Punkt auf der Deckenschräge der Bezugsseite

# ---------- Bausteine: einmal bauen, als Instanz setzen ----------
MOD = {}
ANG = {0: -PI / 2, 1: PI, 2: PI / 2, 3: 0.0}      # Drehung der Bezugsseite (West) auf Nord, Ost, Süd, West
def module(name, fn, *a):
    if name not in MOD:
        c = bpy.data.collections.new(name); MOD[name] = c; prev = CUR[0]; CUR[0] = c
        try: fn(*a)
        finally: CUR[0] = prev
    return MOD[name]
def rotz(objs, ang, loc=(0, 0, 0)):
    Rm = Matrix.Translation(loc) @ Matrix.Rotation(ang, 4, 'Z')
    for ob in objs: ob.matrix_basis = Rm @ ob.matrix_basis
def on_side(k, fn, *a):      # fn baut an der Bezugsseite; danach alles auf Seite k drehen
    REC[0] = []; fn(*a); objs = REC[0]; REC[0] = None; rotz(objs, ANG[k])
def inst(c, loc, ang=0.0, into=None, name=None):
    e = bpy.data.objects.new(name or ('I ' + c.name), None); e.instance_type = 'COLLECTION'; e.instance_collection = c
    e.location = loc; e.rotation_euler = (0, 0, ang); e.empty_display_size = 0.3; (into or CUR[0]).objects.link(e); return e
def array(ob, n, off):
    ar = ob.modifiers.new('Reihe', 'ARRAY'); ar.count = n; ar.use_relative_offset = False; ar.use_constant_offset = True; ar.constant_offset_displace = off

# =====================================================================================
# Hüllen: Gangzelle
# Zustand je Seite (N, O, S, W):  W = Wand · O = offen · S = offen mit Spant · D = Schott mit offenem Tor (zum Raum) · C = geschlossenes Tor
# =====================================================================================
def plinth(y0=-2.0, y1=2.0, lights=(-1, 1)):
    ln = y1 - y0; yc = (y0 + y1) / 2
    box('Sockel', 0.13, ln, 0.2, -(W - 0.065), yc, 0.1, M['frame'], 0.01)
    box('Sockelnase', 0.2, ln, 0.035, -(W - 0.1), yc, 0.2175, M['wall2'], 0.008)
    for y in lights:
        box('Sockellicht', 0.012, 1.5, 0.022, -(W - 0.136), y, 0.165, M['e_amber'], 0)
        area('Sockellicht', (-(W - 0.2), y, 0.17), (0, 1.9, 0), 0.04, 1.5, 9, AMB)
def portal():      # Spant in der Zellgrenze (x = −2)
    for sy in (-1, 1):
        box('Spant Pfosten', 0.18, 0.13, H1, -2.0, sy * (W - 0.065), H1 / 2, M['frame'], 0.012)
        box('Spant Schräge', 0.18, 0.13, DL + 0.06, -2.0, sy * ((W + CX) / 2 - 0.046), (H1 + HC) / 2 - 0.046, M['frame'], 0.012, (sy * PI / 4, 0, 0))
        box('Spant Knoten', 0.2, 0.2, 0.2, -2.0, sy * (W - 0.09), H1 - 0.02, M['frame'], 0.02)
        box('Spant Fuß', 0.24, 0.2, 0.07, -2.0, sy * (W - 0.1), 0.035, M['frame'], 0.01)
        box('Spant Marke', 0.184, 0.134, 0.1, -2.0, sy * (W - 0.065), 1.32, M['ochre'], 0.004)
        for z in (0.3, 0.9, 1.7): cyl('Schraube', 0.012, 0.012, -2.0, sy * (W - 0.135), z, M['steel'], 'Y', n=6, bev=0)
    box('Spant Riegel', 0.18, 2 * CX + 0.14, 0.13, -2.0, 0, HC - 0.065, M['frame'], 0.012)
def door_open():      # Schott mit offenem Tor: Durchgang 1,5 × 2,3 m
    for sy in (-1, 1):
        box('Schott', 0.1, 1.25, 2.3, -2.0, sy * 1.375, 1.15, M['wall'], 0)
        box('Torpfosten', 0.2, 0.2, 2.3, -2.0, sy * 0.85, 1.15, M['frame'], 0.02)
        box('Torblatt offen', 0.07, 0.1, 2.14, -2.0, sy * 0.77, 1.09, M['wall2'], 0.01)
        box('Torblatt Warnband', 0.074, 0.104, 0.16, -2.0, sy * 0.77, 0.2, M['warn'], 0)
        for sx in (-1, 1):
            cyl('Tor-LED', 0.007, 0.008, -2.0 + sx * 0.104, sy * 0.85, 1.3, M['e_green'], 'X', n=8, bev=0)
    box('Schott oben', 0.1, 4.0, 1.3, -2.0, 0, 2.95, M['wall'], 0)
    # Wangen an beiden Enden: Das Schott steht auf der Zellgrenze (2,0 m), die Wand der Nachbarzelle 27 cm weiter innen (1,73 m) und darüber
    # ihre Dachschräge. Dazwischen blieb an jeder Tür ein Schlitz ins Freie (bis Alpha 1.23). Die Wange füllt genau die Fläche zwischen dem
    # Querschnitt des Nachbargangs und dem Rechteck der Türzelle; sie liegt in der Zellgrenze und ragt nicht in den Durchgang.
    for sy in (-1, 1):
        y0, y1 = (1.94, 2.0) if sy > 0 else (-2.0, -1.94)
        prism('Schottwange', [(-2.05, -0.3), (-1.72, -0.3), (-1.72, 2.11), (-0.92, 2.91), (-0.92, 3.0), (-2.05, 3.0)], y0, y1, M['wall'], 'Y', 0)
    box('Torsturz', 0.22, 1.9, 0.24, -2.0, 0, 2.4, M['frame'], 0.02)
    for sx in (-1, 1): box('Tor Leuchtband', 0.02, 0.9, 0.05, -2.0 + sx * 0.115, 0, 2.4, M['e_teal'], 0)
    box('Torschwelle', 0.3, 1.5, 0.03, -2.0, 0, 0.015, M['steel'], 0.006)
    box('Schwellenmarke', 0.14, 1.5, 0.003, -1.78, 0, 0.0135, M['warn2'], 0)
    area('Torlicht', (-1.82, 0, 2.3), (0, math.radians(-35), 0), 0.05, 0.9, 8, (0.2, 0.95, 0.85))
def door_closed():      # Schott mit geschlossenem Tor (Übergang zu Hangar oder Promenade)
    box('Schott', 0.12, 4.0, HC + 0.7, -2.06, 0, (HC + 0.7) / 2, M['wall'], 0)
    for sy in (-1, 1):
        box('Torpfosten', 0.2, 0.2, 2.3, -1.94, sy * 0.82, 1.15, M['frame'], 0.02)
        box('Torblatt', 0.07, 0.72, 2.12, -1.98, sy * 0.365, 1.09, M['wall2'], 0.014)
        up = [(sy * 0.23, 1.02), (sy * 0.66, 1.02), (sy * 0.66, 1.82), (sy * 0.56, 1.96), (sy * 0.23, 1.96)]
        lo = [(sy * 0.12, 0.34), (sy * 0.66, 0.34), (sy * 0.66, 0.94), (sy * 0.3, 0.94), (sy * 0.22, 0.84), (sy * 0.12, 0.84)]
        prism('Torfeld', inset(up, 0.0), -1.945, -1.925, M['wall'], 'X', 0.006); prism('Torfeld', inset(lo, 0.0), -1.945, -1.928, M['wall4'], 'X', 0.006)
        for (y, z) in inset(up, 0.04): cyl('Torniet', 0.007, 0.008, -1.924, y, z, M['steel'], 'X', n=6, bev=0)
        box('Tor Warnband', 0.012, 0.72, 0.16, -1.942, sy * 0.365, 0.2, M['warn'], 0)
        box('Torfenster', 0.02, 0.1, 0.36, -1.94, sy * 0.13, 1.5, M['glass'], 0.006)
        box('Torgriff', 0.04, 0.03, 0.26, -1.92, sy * 0.1, 1.05, M['steel'], 0.01)
        cyl('Hubzylinder', 0.034, 0.9, -1.87, sy * 0.97, 1.45, M['frame'], 'Z', n=14, bev=0.006)
        cyl('Kolbenstange', 0.016, 0.7, -1.87, sy * 0.97, 0.75, M['steel'], 'Z', n=10, bev=0)
        for z in (0.52, 1.72): cyl('Torriegel', 0.022, 0.09, -1.92, sy * 0.045, z, M['steel'], 'Y', n=12, bev=0.004)
    box('Torsturz', 0.22, 1.84, 0.24, -1.94, 0, 2.4, M['frame'], 0.02)
    box('Tor Leuchtband', 0.02, 0.9, 0.05, -1.825, 0, 2.4, M['e_amber'], 0)
    box('Torschwelle', 0.2, 1.5, 0.03, -1.92, 0, 0.015, M['steel'], 0.006)
    box('Torschloss', 0.05, 0.1, 0.3, -1.93, 0, 1.05, M['frame'], 0.012)
    cyl('Tor LED', 0.012, 0.012, -1.9, 0, 1.14, M['e_red'], 'X', n=10, bev=0)
    area('Torlicht', (-1.7, 0, 2.36), (0, math.radians(-35), 0), 0.05, 0.9, 14, AMB)
    for sy in (-1, 1):      # Seitenfelder neben dem Tor
        prism('Wandplatte', inset([(sy * 1.1, 0.3), (sy * 1.66, 0.3), (sy * 1.66, 1.9), (sy * 1.56, 2.02), (sy * 1.1, 2.02)], 0.004), -2.0, -1.975, M['wall2'], 'X', 0.005)
def schott():      # Schott mit eingefahrenem Tor zwischen zwei Gangzellen: verengt den Durchgang auf 2,2 × 2,45 m
    jam = [(1.1, 0.0), (1.7, 0.0), (1.7, 2.9), (0.0, 2.9), (0.0, 2.45), (0.78, 2.45), (1.1, 2.08)]
    band = [(1.1, 0.0), (1.19, 0.0), (1.19, 2.12), (0.82, 2.54), (0.0, 2.54), (0.0, 2.45), (0.78, 2.45), (1.1, 2.08)]
    for sy in (-1, 1):
        prism('Schott', [(sy * y, z) for y, z in jam], -2.06, -1.94, M['wall'], 'X', 0.006)
        prism('Schottrahmen', [(sy * y, z) for y, z in band], -2.1, -1.9, M['frame'], 'X', 0.008)
        for sx in (-1, 1):
            for z in (0.3, 0.8, 1.3, 1.8): cyl('Schottschraube', 0.014, 0.012, -2.0 + sx * 0.104, sy * 1.145, z, M['steel'], 'X', n=6, bev=0)
            prism('Wandplatte', inset([(sy * 1.24, 0.3), (sy * 1.64, 0.3), (sy * 1.64, 1.9), (sy * 1.24, 1.9)], 0.004), -2.0 + sx * 0.06, -2.0 + sx * 0.075, M['wall2'], 'X', 0.004)
            box('Schwellenmarke', 0.12, 2.2, 0.003, -2.0 + sx * 0.22, 0, 0.0135, M['warn2'], 0)
            box('Schottlampe', 0.03, 0.26, 0.06, -2.0 + sx * 0.108, 0, 2.66, M['e_amber'], 0)
        cyl('Hubzylinder', 0.03, 0.8, -2.0, sy * 1.45, 2.4, M['frame'], 'Y', n=12, bev=0.006)
    box('Schotttor', 0.08, 0.34, 2.36, -2.0, -1.3, 1.18, M['wall2'], 0.012); box('Schotttor Warnkante', 0.086, 0.07, 2.36, -2.0, -1.13, 1.18, M['warn'], 0)
    box('Schottschwelle', 0.26, 2.2, 0.03, -2.0, 0, 0.015, M['steel'], 0.006)
    text('SCHOTT', 0.1, (-1.937, -0.27, 2.62), LEFT_X, LEFT_Y, M['txtw']); text('SCHOTT', 0.1, (-2.063, 0.27, 2.62), RIGHT_X, RIGHT_Y, M['txtw'])
    area('Schottlicht', (-1.75, 0, 2.6), (0, math.radians(-40), 0), 0.05, 0.3, 5, AMB); area('Schottlicht', (-2.25, 0, 2.6), (0, math.radians(40), 0), 0.05, 0.3, 5, AMB)
def gang_side(st, k, ceil):      # eine Seite der Gangzelle; ceil = Teile über Kopf (eigene Sammlung, für den Blick von oben abschaltbar)
    if st == 'W':
        if not ceil:
            box('Wand', 0.06, 4.0, H1, -(W + 0.03), 0, H1 / 2, M['wall'], 0); plinth()
            box('Spant Pfosten', 0.13, 0.18, H1, -(W - 0.065), 0, H1 / 2, M['frame'], 0.012)
            box('Spant Fuß', 0.2, 0.24, 0.07, -(W - 0.1), 0, 0.035, M['frame'], 0.01)
            box('Spant Marke', 0.134, 0.184, 0.1, -(W - 0.065), 0, 1.32, M['ochre'], 0.004)
            bolts(-(W - 0.135), [-0.055, 0.055], [0.3, 0.9, 1.7]); text('SP', 0.045, (XL + 0.1305, -0.04, 1.52), LEFT_X, LEFT_Y, M['txtw'])
            streak((XL + 0.1312, 0, 0.55), LEFT_X, LEFT_Y, 0.11, 0.5, 'rost')
        else:
            box('Schräge', 0.06, 4.0, DL + 0.1, -((W + CX) / 2 + 0.021), 0, (H1 + HC) / 2 + 0.021, M['wall'], 0, (0, PI / 4, 0))
            box('Spant Schräge', 0.13, 0.18, DL + 0.06, -((W + CX) / 2 - 0.046), 0, (H1 + HC) / 2 - 0.046, M['frame'], 0.012, (0, PI / 4, 0))
            box('Spant Knoten', 0.2, 0.2, 0.2, -(W - 0.09), 0, H1 - 0.02, M['frame'], 0.02)
            if k % 2:      # Lüftungskanal
                x, z = onslope(0.5, 0.16)
                box('Lüftungskanal', 0.34, 3.98, 0.24, x, 0, z, M['wall2'], 0.015, (0, PI / 4, 0))
                for y in (-1.5, -0.5, 0.5, 1.5): box('Kanalschelle', 0.37, 0.05, 0.27, x, y, z, M['frame'], 0.006, (0, PI / 4, 0))
                for q in range(7): box('Gitterlamelle', 0.012, 0.6, 0.006, *((lambda p: (p[0], 1.0, p[1]))(onslope(0.36 + q * 0.045, 0.285))), M['frame'], 0, (0, PI / 4, 0))
            else:          # Kabelrohre
                for q in range(5):
                    x, z = onslope(0.25 + q * 0.13, 0.035 + (0.012 if q % 2 else 0))
                    cyl('Kabelrohr', 0.016 + (0.006 if q == 2 else 0), 4.0, x, 0, z, M['steel' if q != 2 else 'copper'], 'Y', n=12, bev=0)
                for y in (-1.5, -0.5, 0.5, 1.5):
                    x, z = onslope(0.5, 0.06); box('Rohrschelle', 0.03, 0.04, 0.62, x, y, z, M['frame'], 0.004, (0, PI / 4, 0))
    elif not ceil:
        if st == 'S': portal()
        elif st == 'B': schott()
        elif st == 'D': door_open()
        elif st == 'C': door_closed()
def gang_floor_side(is_open):
    if is_open:      # Rost über dem Leitungsgraben bis zur Zellgrenze
        array(box('Roststab', 0.012, 1.04, 0.034, -1.985, 0, -0.012, M['grate'], 0), 35, (0.042, 0, 0))
        for sy in (-1, 1):
            box('Rostrahmen', 1.45, 0.05, 0.05, -1.275, sy * 0.545, -0.012, M['steel'], 0.006)
            box('Randlinie', 1.38, 0.05, 0.003, -1.31, sy * 0.66, 0.0135, M['ochre'], 0)
        for q in range(3): box('Roststrebe', 1.45, 0.02, 0.03, -1.275, (q - 1) * 0.3, -0.03, M['grate'], 0)
        for (y, r, mat) in ((-0.4, 0.035, 'rubber'), (-0.22, 0.028, 'teal'), (0.05, 0.045, 'white'), (0.25, 0.02, 'copper'), (0.42, 0.03, 'rubber')):
            pipe('Grabenleitung', [(-2.0, y, -0.27 + r), (-0.15, y, -0.27 + r)], r, M[mat])
        area('Grabenlicht', (-1.2, 0, -0.27), (PI, 0, 0), 1.2, 0.5, 4, (1.0, 0.5, 0.12))
    else:
        prism('Bodenplatte', inset([(-2, -0.55), (-0.62, -0.55), (-0.62, 0.55), (-2, 0.55)], 0.004), -0.012, 0.012, M['floor'], 'Z', 0.004)
        box('Unterbau', 1.4, 1.1, 0.3, -1.3, 0, -0.165, M['frame'], 0)
        box('Rostrahmen', 0.05, 1.14, 0.05, -0.575, 0, -0.012, M['steel'], 0.006)
        box('Randlinie', 0.05, 1.3, 0.003, -0.66, 0, 0.0135, M['ochre'], 0)
def slab(name, pts, t, m):      # ebene Platte aus vier Punkten (Innenseite), t dick nach außen (gegen die Drehrichtung der Punkte)
    bm = bmesh.new(); a = [Vector(q) for q in pts]; n = (a[1] - a[0]).cross(a[2] - a[0]).normalized()
    v0 = [bm.verts.new(q) for q in a]; v1 = [bm.verts.new(q - n * t) for q in a]
    bm.faces.new(v0); bm.faces.new(list(reversed(v1)))
    for i in range(4): bm.faces.new([v0[i], v1[i], v1[(i + 1) % 4], v0[(i + 1) % 4]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    return link(bpy.data.objects.new(name, me))
def gang_corner():
    # Innenecke einer Gangzelle bei (−2, −2), wenn West- und Südseite offen sind (Knick oder Abzweig): Die Wände und Dachschrägen der
    # Nachbarzellen enden an der Zellgrenze, dazwischen blieb ein Spalt von 30 cm bis unter die Decke, durch den man ins Freie sah.
    # Hier ein Eckpfosten bis zur Schräge und zwei Schrägen, die die der Nachbarn bis zur Diagonale fortsetzen (wie ein Walmdach von innen).
    box('Eckpfosten', 0.3, 0.3, H1, -1.85, -1.85, H1 / 2, M['frame'], 0.012)
    box('Eckpfosten Marke', 0.304, 0.304, 0.1, -1.85, -1.85, 1.32, M['ochre'], 0.004)
    box('Eckpfosten Fuß', 0.36, 0.36, 0.07, -1.85, -1.85, 0.035, M['frame'], 0.01)
    w0, c0 = W, CX
    slab('Eckschräge', [(-2.05, -w0, H1), (-2.05, -c0, HC), (-c0, -c0, HC), (-w0, -w0, H1)], 0.06, M['wall'])      # 5 cm in die Nachbarzelle: keine Haarfuge
    slab('Eckschräge', [(-w0, -2.05, H1), (-w0, -w0, H1), (-c0, -c0, HC), (-c0, -2.05, HC)], 0.06, M['wall'])
    box('Eckknoten', 0.3, 0.3, 0.2, -1.85, -1.85, H1 - 0.02, M['frame'], 0.02)
CORNERS = ((3, 2, 0.0), (2, 1, PI / 2), (1, 0, PI), (0, 3, -PI / 2))      # Seitenpaar einer Ecke und Drehung der Ecke bei (−2, −2) dorthin
def build_gang(st, cm, cd):
    if len(st) > 4:      # Zeichen 5 bis 8: Innenecken (k = schließen), in der Reihenfolge von CORNERS
        for i, (_a, _b, ang) in enumerate(CORNERS):
            if st[4 + i] == 'k': CUR[0] = cm; REC[0] = []; gang_corner(); objs = REC[0]; REC[0] = None; rotz(objs, ang)
    CUR[0] = cm
    box('Grabenboden', 4.0, 4.0, 0.04, 0, 0, -0.3, M['frame'], 0)
    a = 0.62
    for sx in (-1, 1):
        for sy in (-1, 1):
            prism('Bodenplatte', inset([(sx * a, sy * a), (sx * 2, sy * a), (sx * 2, sy * 2), (sx * a, sy * 2)], 0.004), -0.012, 0.012, M['floor'], 'Z', 0.004)
            box('Unterbau', 1.44, 1.44, 0.3, sx * 1.28, sy * 1.28, -0.165, M['frame'], 0)
            for (bx, by) in ((0.78, 0.78), (1.5, 0.78), (0.78, 1.5)): cyl('Plattenschraube', 0.014, 0.01, sx * bx, sy * by, 0.014, M['steel'], 'Z', n=6, bev=0)
            box('Hebeschlitz', 0.09, 0.022, 0.006, sx * 1.4, sy * 1.0, 0.0105, M['frame'], 0)
    ns = st[0] != 'W' or st[2] != 'W'
    if ns: array(box('Roststab', 1.04, 0.012, 0.034, 0, -0.525, -0.012, M['grate'], 0), 26, (0, 0.042, 0))
    else: array(box('Roststab', 0.012, 1.04, 0.034, -0.525, 0, -0.012, M['grate'], 0), 26, (0.042, 0, 0))
    box('Grabenkasten', 0.5, 0.5, 0.16, 0, 0, -0.2, M['wall2'], 0.02)
    hsh = sum((i + 1) * ord(q) for i, q in enumerate(st)); REC[0] = []      # Marken und Spuren: je Zellart anders, längs zur Laufrichtung
    arrow((0.98, -1.0 + (hsh % 3) * 0.5, 0.0125), FL_X, FL_Y, 0.42, M['txto'], 0.07); text('C%d' % (hsh % 7 + 1), 0.1, (1.45, 0.9, 0.0125), FL_X, FL_Y, M['txtw'])
    spot((-1.0, -0.9 + (hsh % 5) * 0.4, 0.0125), 0.2 + (hsh % 4) * 0.06, 'abrieb' if hsh % 2 else 'fleck'); spot((1.1, 0.5 - (hsh % 4) * 0.3, 0.0125), 0.18, 'fleck' if hsh % 3 else 'abrieb', 1.6)
    box('Ablaufrost', 0.2, 0.2, 0.006, -1.2, 1.4, 0.014, M['steel'], 0.003)
    for q in range(4): box('Ablaufschlitz', 0.16, 0.014, 0.004, -1.2, 1.34 + q * 0.04, 0.0185, M['frame'], 0)
    dec = REC[0]; REC[0] = None
    if not ns: rotz(dec, PI / 2)
    for k in range(4):
        CUR[0] = cm; on_side(k, gang_floor_side, st[k] != 'W'); on_side(k, gang_side, st[k], k, False)
        CUR[0] = cd; on_side(k, gang_side, st[k], k, True)
    # Decke mit Leuchte (längs zur Laufrichtung); das Licht selbst bleibt in der Hauptsammlung
    CUR[0] = cd; REC[0] = []
    box('Decke', 4.0, 4.0, 0.06, 0, 0, HC + 0.03, M['wall'], 0)
    box('Leuchte Gehäuse', 0.36, 1.34, 0.07, 0, 0, HC - 0.035, M['frame'], 0.012)
    box('Leuchte Glas', 0.2, 1.14, 0.012, 0, 0, HC - 0.074, M['e_white'], 0)
    for dy in (-0.62, 0.62): box('Leuchte Kappe', 0.3, 0.05, 0.085, 0, dy, HC - 0.04, M['wall2'], 0.006)
    for q in range(6): box('Leuchtenraster', 0.22, 0.01, 0.022, 0, -0.5 + q * 0.2, HC - 0.088, M['frame'], 0)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Deckenfeld', CX - 0.26, 1.74, 0.02, sx * (0.18 + (CX - 0.2) / 2), sy * 1.0, HC - 0.01, M['wall2'], 0.005)
    pipe('Sprinklerleitung', [(0.56, -2.0, HC - 0.06), (0.56, 2.0, HC - 0.06)], 0.016, M['red'])
    cyl('Sprinkler', 0.014, 0.06, 0.56, 0, HC - 0.1, M['steel'], 'Z', n=10, bev=0); cyl('Sprinklerteller', 0.032, 0.005, 0.56, 0, HC - 0.132, M['steel'], 'Z', n=16, bev=0)
    for (x, r, mat, sg) in ((-0.5, 0.012, 'rubber', 0.07), (-0.56, 0.008, 'ochre', 0.1), (-0.44, 0.007, 'teal', 0.05)):
        cable((x, -1.9, HC - 0.13), (x, 0, HC - 0.13), r, M[mat], sag=sg * 0.6); cable((x, 0, HC - 0.13), (x, 1.9, HC - 0.13), r, M[mat], sag=sg * 0.6)
    for y in (-1.95, 0, 1.95): box('Kabelschelle Decke', 0.2, 0.05, 0.03, -0.5, y, HC - 0.145, M['frame'], 0.004)
    objs = REC[0]; REC[0] = None
    CUR[0] = cm; REC[0] = []; area('Deckenlicht', (0, 0, HC - 0.09), (0, 0, 0), 0.2, 1.14, 55, COOL); objs += REC[0]; REC[0] = None
    if not ns: rotz(objs, PI / 2)

# =====================================================================================
# Hüllen: Raumzelle.  Zustand je Seite:  W = Wand · O = offen (derselbe Raum) · X = Wand mit Türöffnung (das Schott gehört zur Gangzelle)
# =====================================================================================
def raum_side(st):
    if st == 'O': return
    box('Lichtfuge', 0.02, 3.96, 0.035, -(W - 0.012), 0, 2.165, M['e_cool'], 0)
    box('Gesims', 0.09, 4.0, 0.06, -(W - 0.045), 0, 2.215, M['frame'], 0.008)
    for y in ((-2.0,) if st in ('F', 'X') else (-2.0, 0.0)): box('Pilaster', 0.1, 0.2, RH, -(W - 0.05), y, RH / 2, M['frame'], 0.012)      # an Tür- und Fensterwänden nur in der Ecke
    if st == 'F':      # Fensterwand (Leitstand der Eisenkrone): Brüstung und Sturz, dazwischen 3,6 m offen; Rahmen, Glas und Pult bringt die Wandfüllung mit
        box('Brüstung', 0.06, 4.0, 0.9, -(W + 0.03), 0, 0.45, M['wall'], 0); box('Sturz', 0.06, 4.0, RH - 2.1, -(W + 0.03), 0, 2.1 + (RH - 2.1) / 2, M['wall'], 0)
        for sy in (-1, 1): box('Fensterpfeiler', 0.06, 0.2, 1.2, -(W + 0.03), sy * 1.9, 1.5, M['wall'], 0)
        plinth(); field(-1, -1.87, -0.13, 2.27, 3.3, 3); field(-1, 0.13, 1.87, 2.27, 3.3, 4)
    elif st == 'W':
        box('Raumwand', 0.06, 4.0, RH, -(W + 0.03), 0, RH / 2, M['wall'], 0); plinth()
        field(-1, -1.87, -0.13, 2.27, 3.3, 3); field(-1, 0.13, 1.87, 2.27, 3.3, 4)
    else:
        for sy in (-1, 1):
            box('Raumwand', 0.06, 1.25, RH, -(W + 0.03), sy * 1.375, RH / 2, M['wall'], 0)
            box('Laibung', 0.34, 0.06, 2.3, -1.86, sy * 0.78, 1.15, M['frame'], 0.008)
            box('Sockel', 0.13, 1.1, 0.2, -(W - 0.065), sy * 1.45, 0.1, M['frame'], 0.01)
            prism('Wandplatte', inset([(sy * 0.92, 0.3), (sy * 1.87, 0.3), (sy * 1.87, 2.0), (sy * 1.02, 2.0), (sy * 0.92, 1.9)], 0.005), XL + 0.004, XL + 0.03, M['wall2'], 'X', 0.005)
            field(-1, sy * 1.87 if sy < 0 else 0.13, -0.13 if sy < 0 else 1.87, 2.5, 3.3, 3)
        box('Raumwand', 0.06, 1.5, RH - 2.3, -(W + 0.03), 0, 2.3 + (RH - 2.3) / 2, M['wall'], 0)
        box('Laibung', 0.34, 1.62, 0.06, -1.86, 0, 2.33, M['frame'], 0.008)
MOODS = {'hell': (75, COOL, 'e_panel'), 'warm': (38, WARM, 'e_warmp'), 'dunkel': (15, COOL, 'e_dim')}
def build_raum(st, cm, cd, mood='hell'):
    watt, colr, pm = MOODS[mood]
    CUR[0] = cm
    box('Unterbau', 4.0, 4.0, 0.3, 0, 0, -0.165, M['frame'], 0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            prism('Bodenplatte', inset([(0, 0), (sx * 2, 0), (sx * 2, sy * 2), (0, sy * 2)], 0.004), -0.012, 0.012, M['floor2'], 'Z', 0.004)
            for (bx, by) in ((0.15, 0.15), (1.8, 0.15), (0.15, 1.8)): cyl('Plattenschraube', 0.012, 0.01, sx * bx, sy * by, 0.014, M['steel'], 'Z', n=6, bev=0)
            box('Hebeschlitz', 0.09, 0.022, 0.006, sx * 1.0, sy * 1.6, 0.0105, M['frame'], 0)
    box('Bodenleiste', 0.03, 3.4, 0.003, 0, 0, 0.0135, M['ochre'], 0)
    prism('Bodenluke', inset([(-0.35, -0.35), (0.35, -0.35), (0.35, 0.25), (0.25, 0.35), (-0.35, 0.35)], 0.0), 0.011, 0.016, M['wall2'], 'Z', 0.003)
    for (bx, by) in ((-0.28, -0.28), (0.28, -0.28), (-0.28, 0.28)): cyl('Lukenschraube', 0.012, 0.008, bx, by, 0.018, M['steel'], 'Z', n=6, bev=0)
    spot((1.1, -1.0, 0.0125), 0.3, 'abrieb', 1.8); spot((-0.9, 1.2, 0.0125), 0.16)
    area('Raumlicht', (0, 0, RH - 0.13), (0, 0, 0), 1.1, 1.1, watt, colr)
    for k in range(4): on_side(k, raum_side, st[k])
    CUR[0] = cd
    box('Raumdecke', 4.0, 4.0, 0.06, 0, 0, RH + 0.03, M['wall'], 0)
    box('Lichtfeld Rahmen', 1.44, 1.44, 0.09, 0, 0, RH - 0.045, M['frame'], 0.012)
    box('Lichtfeld', 1.2, 1.2, 0.012, 0, 0, RH - 0.094, M[pm], 0)
    for q in range(5): box('Lichtfeld Raster', 1.22, 0.012, 0.03, 0, -0.48 + q * 0.24, RH - 0.105, M['frame'], 0)
    for y in (-1.4, 1.4):
        box('Deckenträger', 4.0, 0.16, 0.16, 0, y, RH - 0.08, M['frame'], 0.012)
        for x in (-1.6, -0.8, 0.8, 1.6): cyl('Trägerschraube', 0.014, 0.012, x, y - 0.082, RH - 0.08, M['steel'], 'Y', n=6, bev=0)
    for x in (-1.4, 1.4): box('Deckenträger', 0.16, 2.64, 0.12, x, 0, RH - 0.06, M['frame'], 0.012)
    for sx in (-1, 1):
        for sy in (-1, 1): box('Deckenfeld', 0.5, 1.1, 0.02, sx * 1.0, sy * 0.62, RH - 0.01, M['wall2'], 0.005)
    # Lüftungskanal, Kabelbahn, Sprinkler, kleine Strahler: laufen über die Zellen durch
    box('Raumkanal', 0.46, 4.0, 0.24, -1.0, 0, RH - 0.3, M['wall2'], 0.015)
    for y in (-1.5, -0.5, 0.5, 1.5): box('Kanalschelle', 0.5, 0.05, 0.28, -1.0, y, RH - 0.3, M['frame'], 0.006)
    box('Auslass', 0.3, 0.6, 0.02, -1.0, 0.9, RH - 0.425, M['frame'], 0.004)
    for q in range(6): box('Auslasslamelle', 0.26, 0.012, 0.012, -1.0, 0.68 + q * 0.09, RH - 0.44, M['wall'], 0)
    box('Kabelbahn', 4.0, 0.26, 0.015, 0, 1.0, RH - 0.22, M['steel'], 0.003)
    for sy in (-1, 1): box('Kabelbahn Rand', 4.0, 0.012, 0.05, 0, 1.0 + sy * 0.13, RH - 0.2, M['steel'], 0.003)
    for q in range(5): pipe('Kabel', [(-2.0, 0.9 + q * 0.05, RH - 0.205 + (q % 2) * 0.006), (2.0, 0.9 + q * 0.05, RH - 0.205 + (q % 2) * 0.006)], 0.009 + (q % 3) * 0.003, M[['rubber', 'teal', 'rubber', 'ochre', 'rubber'][q]])
    for x in (-1.2, 1.2): pipe('Bahnhänger', [(x, 1.0, RH - 0.23), (x, 1.0, RH)], 0.008, M['steel'])
    pipe('Sprinklerleitung', [(0.9, -2.0, RH - 0.2), (0.9, 2.0, RH - 0.2)], 0.016, M['red'])
    cyl('Sprinkler', 0.014, 0.06, 0.9, -0.9, RH - 0.24, M['steel'], 'Z', n=10, bev=0); cyl('Sprinklerteller', 0.032, 0.005, 0.9, -0.9, RH - 0.272, M['steel'], 'Z', n=16, bev=0)
    for (x, y) in ((1.62, -1.0), (1.62, 1.0), (-1.62, -1.0), (0.0, -1.75)):
        cyl('Strahler', 0.07, 0.05, x, y, RH - 0.025, M['frame'], 'Z', n=16, bev=0.006); cyl('Strahlerglas', 0.05, 0.006, x, y, RH - 0.052, M[pm], 'Z', n=16, bev=0)
def shell(kind, st, mood='hell'):
    key = ('Gang ' if kind == 'gang' else 'Raum ' + mood + ' ') + ''.join(st)
    if key not in MOD:
        cm = bpy.data.collections.new(key); cd = bpy.data.collections.new(key + ' Decke'); MOD[key] = (cm, cd); prev = CUR[0]
        try:
            if kind == 'gang': build_gang(st, cm, cd)
            else: build_raum(st, cm, cd, mood)
        finally: CUR[0] = prev; REC[0] = None
    return MOD[key]

# =====================================================================================
# Wandfüllungen (Bezugsseite, 2 m breit, Mitte bei y = 0; die Pumpe braucht beide Felder einer Seite)
# =====================================================================================
def strip_leds():
    box('Lichtleiste', 0.02, 1.74, 0.05, XL + 0.012, 0, 1.135, M['frame'], 0.006)
    for q in range(4): cyl('Leisten-LED', 0.006, 0.008, XL + 0.024, -0.75 + q * 0.5, 1.135, M['e_amber'], 'X', n=8, bev=0)
def port(y=0.72, rost=False):
    cyl('Prüfanschluss', 0.034, 0.024, XL + 0.042, y, 1.76, M['steel'], 'X', n=16, bev=0.004); cyl('Prüfkappe', 0.022, 0.03, XL + 0.05, y, 1.76, M['ochre'], 'X', n=12, bev=0.004)
    streak((XL + 0.031, y, 1.725), LEFT_X, LEFT_Y, 0.07, 0.42, 'rost' if rost else 'spur')
def jbox(y=-0.5):
    box('Abzweigdose', 0.07, 0.2, 0.16, XL + 0.065, y, 1.62, M['cab'], 0.012); pipe('Dosenrohr', [(XL + 0.065, y, 1.7), (XL + 0.065, y, 2.08)], 0.012, M['steel'])
    cyl('Dosen-LED', 0.006, 0.008, XL + 0.102, y, 1.62, M['e_green'], 'X', n=8, bev=0); streak((XL + 0.031, y, 1.54), LEFT_X, LEFT_Y, 0.18, 0.28)
def rail():      # Handlauf und Kabelbahn, laufen über mehrere Felder durch
    pipe('Handlauf', [(XL + 0.13, -1.0, 1.12), (XL + 0.13, 1.0, 1.12)], 0.02, M['steel'])
    for y in (-0.5, 0.5): box('Handlaufhalter', 0.11, 0.03, 0.03, XL + 0.07, y, 1.1, M['frame'], 0.004)
    box('Kabelbahn', 0.2, 2.0, 0.015, XL + 0.12, 0, 1.93, M['steel'], 0.003); box('Kabelbahn Rand', 0.012, 2.0, 0.06, XL + 0.22, 0, 1.955, M['steel'], 0.003)
    for y in (-0.5, 0.5): box('Kabelbahn Konsole', 0.2, 0.03, 0.05, XL + 0.11, y, 1.9, M['frame'], 0.004)
    for q in range(6):
        x = XL + 0.04 + q * 0.026; r = 0.008 + (q % 3) * 0.003
        pipe('Kabel', [(x, -1.0, 1.94 + r), (x, 1.0, 1.94 + r)], r, M[['rubber', 'rubber', 'teal', 'rubber', 'ochre', 'copper'][q]])
def d_feld(lo, hi, flip, tag):
    field(-1, -0.87, 0.87, 0.3, 1.02, lo, flip); field(-1, -0.87, 0.87, 1.25, 1.87, hi, not flip); strip_leds()
    label(tag, 0.022, (XL + 0.031, -0.82, 1.29), LEFT_X, LEFT_Y); port(0.72, flip); streak((XL + 0.031, -0.3, 1.02), LEFT_X, LEFT_Y, 0.5, 0.5, 'staub')
def d_feldrail(lo, hi, flip, tag): d_feld(lo, hi, flip, tag); rail()
def d_gitter():
    field(-1, -0.87, 0.87, 0.3, 1.02, 3); field(-1, -0.87, 0.87, 1.25, 1.87, 1); strip_leds(); rail()
    box('Gitterrahmen', 0.024, 0.96, 0.5, XL + 0.04, 0, 0.66, M['frame'], 0.01)
    for q in range(9): box('Gitterlamelle', 0.035, 0.86, 0.01, XL + 0.05, 0, 0.47 + q * 0.047, M['wall2'], 0.003, (0, -0.6, 0))
    jbox(-0.5); streak((XL + 0.055, 0, 0.44), LEFT_X, LEFT_Y, 0.8, 0.14, 'staub')
def d_terminal():
    field(-1, -0.87, 0.87, 0.3, 1.02, 3, True); field(-1, -0.87, 0.87, 1.25, 1.87, 3); strip_leds()
    box('Terminal', 0.09, 0.56, 0.4, XL + 0.075, 0, 1.5, M['frame'], 0.014); box('Terminal Bild', 0.006, 0.34, 0.22, XL + 0.122, 0.07, 1.54, M['screen'], 0)
    box('Terminal Rahmen', 0.01, 0.38, 0.26, XL + 0.118, 0.07, 1.54, M['wall'], 0.004)
    for q in range(4): box('Taste', 0.012, 0.035, 0.035, XL + 0.123, -0.19, 1.63 - q * 0.055, M['wall2'] if q else M['ochre'], 0.004)
    cyl('Terminal LED', 0.008, 0.01, XL + 0.122, -0.19, 1.38, M['e_green'], 'X', n=10, bev=0)
    pipe('Terminal Leitung', [(XL + 0.05, -0.2, 1.7), (XL + 0.05, -0.2, 2.08)], 0.012, M['rubber']); point('Bildschirmlicht', (XL + 0.3, 0.07, 1.54), 1.6, (0.1, 0.9, 0.8), 0.1)
    label('AUSKUNFT · DECKSPLAN', 0.016, (XL + 0.031, -0.28, 1.25), LEFT_X, LEFT_Y, 'platey'); jbox(-0.62)
def d_rohr(end):      # Leitungsstrang; end = −1: kommt bei −y aus der Wand, +1: geht bei +y in die Wand, 0: läuft durch
    XP, ZP, XT, ZT = XL + 0.44, 1.62, XL + 0.2, 1.26
    for y in (-0.45, 0.45): prism('Wandplatte', inset([(y - 0.42, 0.62), (y + 0.42, 0.62), (y + 0.42, 1.1), (y + 0.34, 1.18), (y - 0.42, 1.18)], 0.005), XL + 0.004, XL + 0.022, M['wall4'], 'X', 0.004)
    field(-1, -0.87, 0.87, 1.82, 2.06, 3)
    a, b = (-1.0, 1.0)
    if end:
        e = end * 0.35; pts = [(XP, -end * 1.0, ZP), (XP, e, ZP), (XL - 0.05, e, ZP)]
        pipe('Hauptleitung', pts, 0.15, M['white'], rad=0.3, res=8); cyl('Wandflansch', 0.21, 0.05, XL + 0.03, e, ZP, M['steel'], 'X', n=28, bev=0.006)
        pipe('Petrol-Leitung', [(XT, -end * 1.0, ZT), (XT, end * 0.7, ZT), (XT, end * 0.7, 0.03)], 0.055, M['teal'], rad=0.14)
        for q in range(3): pipe('Kupferleitung', [(XL + 0.045, -end * 1.0, 0.4 + q * 0.05), (XL + 0.045, end * (0.82 - q * 0.06), 0.4 + q * 0.05), (XL + 0.045, end * (0.82 - q * 0.06), 2.08)], 0.012, M['copper'], rad=0.06)
        cyl('Flansch', 0.2, 0.07, XP, -end * 0.5, ZP, M['steel'], 'Y', n=28, bev=0.006); yb = -end * 0.5
    else:
        cyl('Hauptleitung', 0.15, 2.0, XP, 0, ZP, M['white'], 'Y', n=28, bev=0); pipe('Petrol-Leitung', [(XT, -1.0, ZT), (XT, 1.0, ZT)], 0.055, M['teal'])
        for q in range(3): pipe('Kupferleitung', [(XL + 0.045, -1.0, 0.4 + q * 0.05), (XL + 0.045, 1.0, 0.4 + q * 0.05)], 0.012, M['copper'])
        cyl('Flansch', 0.2, 0.07, XP, 0.55, ZP, M['steel'], 'Y', n=28, bev=0.006); yb = 0.55
        cyl('Markierband', 0.1525, 0.14, XP, -0.5, ZP, M['ochre'], 'Y', n=28, bev=0); arrow((XP + 0.151, -0.2, ZP), LEFT_X, LEFT_Y, 0.2, M['txtd'], 0.028)
        cyl('Schieber', 0.075, 0.16, XP, 0.0, ZP + 0.2, M['frame'], 'Z', n=16, bev=0.008); cyl('Schieberspindel', 0.016, 0.24, XP, 0.0, ZP + 0.36, M['steel'], 'Z', n=10, bev=0)
        ring('Handrad', 0.11, 0.012, (XP, 0.0, ZP + 0.46), (0, 0, 1), M['teal'])
        for q in range(3): box('Handradspeiche', 0.2, 0.014, 0.012, XP, 0.0, ZP + 0.46, M['teal'], 0, (0, 0, q * PI / 3))
        label('KÜHLMITTEL  B', 0.026, (XP + 0.151, -0.95, ZP - 0.022), LEFT_X, LEFT_Y)
    for q in range(10): cyl('Flanschschraube', 0.012, 0.1, XP + math.cos(q * PI / 5) * 0.175, yb, ZP + math.sin(q * PI / 5) * 0.175, M['frame'], 'Y', n=6, bev=0)
    yk = -end * 0.75 if end else -0.8
    box('Rohrkonsole', 0.46, 0.06, 0.05, XL + 0.23, yk, ZP - 0.2, M['frame'], 0.006); box('Rohrkonsole Strebe', 0.3, 0.04, 0.04, XL + 0.16, yk, ZP - 0.32, M['frame'], 0.004, (0, PI / 4, 0))
    cyl('Rohrschelle', 0.158, 0.05, XP, yk, ZP, M['frame'], 'Y', n=28, bev=0); streak((XL + 0.023, yk, 1.4), LEFT_X, LEFT_Y, 0.14, 0.7, 'rost' if end > 0 else 'spur')
    box('Petrol-Schelle', 0.2, 0.04, 0.14, XL + 0.11, -yk * 0.6, ZT, M['frame'], 0.006); box('Kupferschelle', 0.03, 0.03, 0.18, XL + 0.045, yk * 0.5, 0.45, M['frame'], 0.004)
def d_schrank():
    for q in range(3):
        y = -0.58 + q * 0.58
        box('Schrank', 0.36, 0.55, 1.72, XL + 0.18, y, 0.88, M['cab'], 0.012); box('Türrahmen', 0.008, 0.53, 1.56, XL + 0.362, y, 0.9, M['cab'], 0.004)
        box('Schranktür', 0.02, 0.49, 1.5, XL + 0.368, y, 0.9, M['door'], 0.01); box('Türgriff', 0.03, 0.03, 0.2, XL + 0.39, y + 0.19, 0.95, M['steel'], 0.008)
        for hz in (0.4, 1.4): box('Scharnier', 0.025, 0.035, 0.09, XL + 0.375, y - 0.25, hz, M['frame'], 0.005)
        for p in range(6): box('Lüftungsschlitz', 0.012, 0.3, 0.012, XL + 0.38, y - 0.03, 1.4 + p * 0.03, M['frame'], 0)
        cyl('LED', 0.009, 0.012, XL + 0.38, y - 0.16, 1.6, M['e_green'], 'X', n=10, bev=0); cyl('LED', 0.009, 0.012, XL + 0.38, y - 0.12, 1.6, M['e_amber' if q != 1 else 'e_red'], 'X', n=10, bev=0)
        box('Typenschild', 0.004, 0.16, 0.05, XL + 0.38, y - 0.05, 1.22, M['white'], 0); text('NV-%d   400 V' % (q + 1), 0.014, (XL + 0.383, y - 0.122, 1.21), LEFT_X, LEFT_Y, M['txtd'])
        text('S-0%d' % (q + 1), 0.1, (XL + 0.378, y - 0.17, 0.98), LEFT_X, LEFT_Y, M['txtw']); cyl('Türschloss', 0.012, 0.012, XL + 0.38, y + 0.19, 0.78, M['steel'], 'X', n=10, bev=0)
        for dy in (-0.12, 0.1): pipe('Schrankleitung', [(XL + 0.14, y + dy, 1.72), (XL + 0.14, y + dy, 2.02), (XL + 0.06, y + dy, 2.06)], 0.018, M['steel'], rad=0.03)
        streak((XL + 0.3805, y - 0.03, 1.39), LEFT_X, LEFT_Y, 0.26, 0.42, 'staub')
    box('Schranksockel', 0.4, 1.78, 0.04, XL + 0.2, 0, 0.02, M['frame'], 0.006); box('Kabelkanal Schränke', 0.1, 1.8, 0.1, XL + 0.05, 0, 2.04, M['wall2'], 0.01)
    warnsign((XL + 0.38, 0.0, 0.74), LEFT_X, LEFT_Y, 0.07); label('HOCHSPANNUNG', 0.016, (XL + 0.38, -0.09, 0.6), LEFT_X, LEFT_Y, 'platey')
def d_spind():
    for q in range(4):
        y = -0.645 + q * 0.43
        box('Spind', 0.4, 0.41, 1.9, XL + 0.2, y, 0.97, M['cab'], 0.012); box('Spindtür', 0.02, 0.37, 1.72, XL + 0.408, y, 0.98, M['door'], 0.01)
        for p in range(4): box('Spindschlitz', 0.012, 0.22, 0.012, XL + 0.42, y, 1.62 + p * 0.03, M['frame'], 0)
        box('Spindgriff', 0.03, 0.025, 0.12, XL + 0.43, y + 0.13, 1.05, M['steel'], 0.006); box('Namensschild', 0.004, 0.2, 0.05, XL + 0.42, y, 1.45, M['plate' if q % 2 else 'platey'], 0)
        text('%02d' % (q + 1 + 10), 0.09, (XL + 0.42, y - 0.07, 1.2), LEFT_X, LEFT_Y, M['txtw'])
    box('Spindsockel', 0.44, 1.76, 0.04, XL + 0.22, 0, 0.02, M['frame'], 0.006)
def d_bank():
    field(-1, -0.87, 0.87, 0.3, 1.02, 3); field(-1, -0.87, 0.87, 1.25, 1.87, 2, True); strip_leds()
    box('Bank Sitz', 0.42, 1.7, 0.06, XL + 0.25, 0, 0.44, M['crate'], 0.012); box('Bank Polster', 0.38, 1.66, 0.06, XL + 0.25, 0, 0.5, M['polster'], 0.02)
    box('Bank Lehne', 0.07, 1.66, 0.34, XL + 0.075, 0, 0.8, M['polster'], 0.025)
    for y in (-0.7, 0, 0.7): box('Bank Konsole', 0.4, 0.04, 0.26, XL + 0.22, y, 0.3, M['frame'], 0.008)
def d_fenster():
    field(-1, -0.87, 0.87, 0.3, 0.78, 3); box('Sternfeld', 0.004, 1.62, 1.14, XL + 0.004, 0, 1.43, M['sterne'], 0)
    box('Fensterglas', 0.012, 1.62, 1.14, XL + 0.05, 0, 1.43, M['lens'], 0)
    box('Fensterbank', 0.22, 1.76, 0.07, XL + 0.11, 0, 0.83, M['frame'], 0.012); box('Fenstersturz', 0.16, 1.76, 0.1, XL + 0.08, 0, 2.04, M['frame'], 0.012)
    for y in (-0.84, 0.84): box('Fensterpfosten', 0.14, 0.08, 1.16, XL + 0.07, y, 1.43, M['frame'], 0.012)
    box('Fenstersprosse', 0.06, 0.04, 1.14, XL + 0.05, 0, 1.43, M['frame'], 0.006)
    for q in range(6): cyl('Fensterschraube', 0.008, 0.01, XL + 0.224, -0.75 + q * 0.3, 0.83, M['steel'], 'X', n=6, bev=0)
def d_schirm():
    field(-1, -0.87, 0.87, 0.3, 0.9, 3, True)
    box('Wandbild Rahmen', 0.07, 1.72, 1.04, XL + 0.055, 0, 1.5, M['frame'], 0.014); box('Wandbild', 0.006, 1.58, 0.9, XL + 0.092, 0, 1.5, M['screen2'], 0)
    box('Pultbrett', 0.24, 0.9, 0.05, XL + 0.14, 0, 0.95, M['wall2'], 0.012)
    for q in range(5): box('Pulttaste', 0.04, 0.05, 0.012, XL + 0.18, -0.3 + q * 0.15, 0.98, M['ochre' if q == 2 else 'frame'], 0.004)
    area('Wandbildlicht', (XL + 0.14, 0, 1.5), (0, PI / 2, 0), 0.8, 1.5, 12, (0.2, 0.75, 0.85))
def d_tauscher():
    EX, ZP = XL + 0.46, 1.62
    field(-1, -0.87, 0.87, 0.26, 2.05, 4)
    cyl('Tauscher Sockel', 0.36, 0.2, EX, 0, 0.1, M['frame'], 'Z', n=32, bev=0.02); cyl('Tauscher Kessel', 0.25, 1.3, EX, 0, 0.85, M['steel'], 'Z', n=32, bev=0)
    array(cyl('Tauscher Rippe', 0.33, 0.012, EX, 0, 0.38, M['wall2'], 'Z', n=32, bev=0), 17, (0, 0, 0.055))
    cyl('Tauscher Kopf', 0.29, 0.36, EX, 0, ZP, M['white'], 'Z', n=32, bev=0.03); cyl('Tauscher Deckel', 0.2, 0.08, EX, 0, ZP + 0.21, M['frame'], 'Z', n=32, bev=0.015)
    for q in range(8): cyl('Deckelschraube', 0.016, 0.05, EX + math.cos(q * PI / 4) * 0.16, math.sin(q * PI / 4) * 0.16, ZP + 0.26, M['steel'], 'Z', n=6, bev=0)
    ring('Leuchtring', 0.262, 0.012, (EX, 0, 1.38), (0, 0, 1), M['e_teal'], 36); point('Tauscherlicht', (EX + 0.45, 0, 1.4), 5, (0.1, 0.95, 0.8), 0.1)
    for a in (0.6, 2.2, 3.9, 5.4): cyl('Zuganker', 0.014, 1.2, EX + math.cos(a) * 0.345, math.sin(a) * 0.345, 0.82, M['steel'], 'Z', n=8, bev=0)
    for sg in (-1, 1): pipe('Tauscher Rohr', [(EX, sg * 0.2, ZP), (EX, sg * 0.62, ZP), (XL - 0.05, sg * 0.62, ZP)], 0.11, M['white'], rad=0.2, res=8); cyl('Wandflansch', 0.16, 0.05, XL + 0.03, sg * 0.62, ZP, M['steel'], 'X', n=24, bev=0.006)
    ga = -0.55; gx, gy = EX + math.cos(ga) * 0.36, math.sin(ga) * 0.36
    cyl('Standglas', 0.013, 0.56, gx, gy, 0.8, M['lens'], 'Z', n=12, bev=0); cyl('Standglas Füllung', 0.009, 0.3, gx, gy, 0.67, M['e_teal'], 'Z', n=10, bev=0)
    for z in (0.5, 1.1): cyl('Standglas Fassung', 0.02, 0.05, gx, gy, z, M['copper'], 'Z', n=10, bev=0.003)
    label('WT-2 · 180 °C', 0.02, (EX + 0.291, -0.09, ZP - 0.04), LEFT_X, LEFT_Y); spot((EX + 0.5, 0.45, 0.0125), 0.3)
def d_pumpe():      # Pumpe mit Motor auf Grundrahmen, 2,3 m lang: braucht beide Felder einer Seite
    PY, MY = -0.55, 0.7
    for y in (-1.0, 1.0): field(-1, y - 0.87, y + 0.87, 1.25, 1.87, 3)
    box('Pumpe Rahmen', 0.6, 2.3, 0.08, XL + 0.32, 0, 0.3, M['frame'], 0.012); box('Pumpe Warnkante', 0.012, 2.3, 0.07, XL + 0.626, 0, 0.3, M['warn'], 0)
    for y in (-1.05, 0, 1.05): box('Pumpe Fuß', 0.5, 0.08, 0.26, XL + 0.3, y, 0.13, M['frame'], 0.008)
    prof = [(XL + 0.03, 0.34), (XL + 0.5, 0.34), (XL + 0.53, 0.37), (XL + 0.53, 0.86), (XL + 0.36, 1.11), (XL + 0.33, 1.13), (XL + 0.03, 1.13)]
    prism('Pumpe Gehäuse', prof, PY - 0.575, PY + 0.575, M['white'], 'Y', 0.014)
    for z in (0.365, 0.835): box('Gehäuseleiste', 0.012, 1.1, 0.026, XL + 0.534, PY, z, M['wall2'], 0.004)
    box('Pumpe Pult', 0.03, 1.0, 0.3, XL + 0.46, PY, 1.0, M['wall'], 0.008, (0, -0.6, 0))
    nx, nz = math.cos(0.6), math.sin(0.6)
    for q, dy in enumerate((-0.36, -0.2, -0.04)):
        px, pz = XL + 0.46 + nx * 0.022 - math.sin(0.6) * 0.03, 1.0 + 0.03 * math.cos(0.6) + nz * 0.022
        g = cyl('Manometer', 0.058, 0.03, px, PY + dy, pz, M['frame'], 'X', n=20, bev=0.004); g.rotation_euler = (0, PI / 2 - 0.6, 0)
        f = cyl('Manometer Blatt', 0.047, 0.006, px + nx * 0.015, PY + dy, pz + nz * 0.015, M['white'], 'X', n=20, bev=0); f.rotation_euler = (0, PI / 2 - 0.6, 0)
        box('Manometer Zeiger', 0.004, 0.006, 0.04, px + nx * 0.02, PY + dy, pz + nz * 0.02, M['red'], 0, (0.5 + q * 0.9, -0.6, 0))
    box('Pumpe Bild', 0.006, 0.26, 0.15, XL + 0.46 + nx * 0.02, PY + 0.26, 1.0 + 0.02 * math.cos(0.6) + nz * 0.02, M['screen'], 0, (0, -0.6, 0))
    for dy in (-0.52, 0.52): pipe('Griffbügel', [(XL + 0.5, PY + dy, 0.48), (XL + 0.6, PY + dy, 0.48), (XL + 0.6, PY + dy, 0.82), (XL + 0.5, PY + dy, 0.82)], 0.014, M['ochre'], rad=0.035)
    for q in range(9): box('Kühlschlitz', 0.012, 0.5, 0.014, XL + 0.532, PY + 0.18, 0.44 + q * 0.03, M['frame'], 0)
    box('Wartungsdeckel', 0.012, 0.36, 0.24, XL + 0.532, PY - 0.3, 0.52, M['wall2'], 0.008); bolts(XL + 0.54, [PY - 0.45, PY - 0.15], [0.43, 0.61])
    text('PUMPE 2', 0.075, (XL + 0.535, PY - 0.44, 0.745), LEFT_X, LEFT_Y, M['txtd']); emblem((XL + 0.3, PY - 0.5765, 0.76), END_X, END_Y, 0.075, M['txtd'])
    cyl('Motor', 0.2, 0.74, XL + 0.32, MY, 0.62, M['frame'], 'Y', n=28, bev=0.012)
    array(cyl('Motorrippe', 0.218, 0.014, XL + 0.32, MY - 0.3, 0.62, M['wall'], 'Y', n=28, bev=0), 16, (0, 0, -0.04))
    cyl('Lüfterhaube', 0.212, 0.16, XL + 0.32, MY + 0.44, 0.62, M['wall2'], 'Y', n=28, bev=0.012)
    for r in (0.17, 0.125, 0.08, 0.035): ring('Lüftergitter', r, 0.006, (XL + 0.32, MY + 0.524, 0.62), (0, 1, 0), M['steel'], 24)
    cyl('Kupplung', 0.085, 0.24, XL + 0.32, MY - 0.47, 0.62, M['steel'], 'Y', n=20, bev=0.008); box('Kupplungsschutz', 0.24, 0.2, 0.14, XL + 0.32, MY - 0.47, 0.72, M['ochre'], 0.02)
    box('Klemmkasten', 0.16, 0.22, 0.1, XL + 0.32, MY + 0.05, 0.86, M['wall2'], 0.012)
    pipe('Motorkabel', [(XL + 0.32, MY + 0.05, 0.9), (XL + 0.32, MY + 0.05, 1.05), (XL + 0.08, MY + 0.05, 1.08), (XL + 0.06, MY + 0.05, 2.08)], 0.016, M['rubber'], rad=0.07)
    pipe('Druckrohr', [(XL + 0.3, PY - 0.3, 1.1), (XL + 0.3, PY - 0.3, 1.5), (XL - 0.05, PY - 0.3, 1.5)], 0.07, M['white'], rad=0.16); cyl('Druckflansch', 0.1, 0.05, XL + 0.3, PY - 0.3, 1.2, M['steel'], 'Z', n=20, bev=0.005)
    pipe('Saugrohr', [(XL + 0.2, PY + 0.25, 1.12), (XL + 0.2, PY + 0.25, 1.36), (XL - 0.05, PY + 0.25, 1.36)], 0.05, M['teal'], rad=0.12)
    for dx, dy, r in ((0.95, 0.4, 0.2), (1.1, 0.58, 0.11)): cyl('Ölfleck', r, 0.001, XL + dx, dy, 0.0127, M['oil'], 'Z', n=20, bev=0)
    point('Pumpenbild', (XL + 0.7, PY + 0.26, 1.05), 1.2, (0.1, 0.9, 0.8), 0.08)
DRESS = {
    'feld1': (d_feld, 3, 1, False, 'C-3 / 041'), 'feld2': (d_feld, 2, 3, True, 'C-3 / 042'), 'feld3': (d_feld, 4, 2, False, 'C-3 / 043'),
    'feldh1': (d_feldrail, 3, 2, True, 'C-3 / 044'), 'feldh2': (d_feldrail, 2, 3, False, 'C-3 / 045'),
    'gitter': (d_gitter,), 'terminal': (d_terminal,), 'rohr': (d_rohr, 0), 'rohr_a': (d_rohr, -1), 'rohr_b': (d_rohr, 1), 'schrank': (d_schrank,), 'spind': (d_spind,),
    'bank': (d_bank,), 'fenster': (d_fenster,), 'schirm': (d_schirm,), 'tauscher': (d_tauscher,), 'pumpe': (d_pumpe,),
}
def dress(name): d = DRESS[name]; return module('Wand ' + name, d[0], *d[1:])

# =====================================================================================
# Objekte (Ursprung am Boden, Mitte)
# =====================================================================================
def p_kisten():
    box('Kiste groß', 0.5, 0.8, 0.42, 0, 0, 0.21, M['crate'], 0.02); box('Kistendeckel', 0.52, 0.82, 0.06, 0, 0, 0.45, M['ochre'], 0.02)
    for dy in (-0.25, 0.25): box('Kistenschloss', 0.03, 0.08, 0.1, -0.26, dy, 0.4, M['steel'], 0.006)
    box('Kiste klein', 0.4, 0.5, 0.3, 0.02, -0.1, 0.63, M['crate'], 0.02, (0, 0, 0.18)); text('ERSATZTEILE', 0.05, (-0.252, 0.27, 0.2), RIGHT_X, RIGHT_Y, M['txtw'])
    box('Kiste flach', 0.6, 0.6, 0.3, 0.1, 0.85, 0.15, M['crate'], 0.02, (0, 0, -0.12)); box('Kistenband', 0.62, 0.08, 0.31, 0.1, 0.85, 0.15, M['ochre'], 0.01, (0, 0, -0.12))
def p_fass():
    cyl('Fass', 0.24, 0.72, 0, 0, 0.36, M['teal'], 'Z', n=28, bev=0.02)
    for z in (0.2, 0.52): cyl('Fassring', 0.248, 0.03, 0, 0, z, M['teal'], 'Z', n=28, bev=0.006)
    cyl('Fassdeckel', 0.2, 0.02, 0, 0, 0.725, M['steel'], 'Z', n=28, bev=0.004); cyl('Fass Spund', 0.03, 0.03, 0.1, 0, 0.74, M['frame'], 'Z', n=10, bev=0); spot((0, 0, 0.0125), 0.36)
def p_wagen():
    for sx in (-0.2, 0.2):
        for sy in (-0.3, 0.3):
            box('Wagenbein', 0.03, 0.03, 0.78, sx, sy, 0.47, M['frame'], 0.005); cyl('Wagenrad', 0.045, 0.03, sx, sy, 0.045, M['rubber'], 'X', n=16, bev=0.006)
    for z in (0.2, 0.52, 0.86): box('Wagenboden', 0.46, 0.66, 0.02, 0, 0, z, M['red'], 0.006)
    for sy in (-0.33, 0.33): box('Wagenrand', 0.46, 0.012, 0.05, 0, sy, 0.895, M['red'], 0.004)
    for sx in (-0.23, 0.23): box('Wagenrand', 0.012, 0.66, 0.05, sx, 0, 0.895, M['red'], 0.004)
    pipe('Wagengriff', [(-0.2, -0.3, 0.86), (-0.2, -0.42, 0.98), (0.2, -0.42, 0.98), (0.2, -0.3, 0.86)], 0.012, M['steel'], rad=0.04)
    box('Werkzeugkasten', 0.2, 0.36, 0.13, 0.08, 0.1, 0.935, M['ochre'], 0.012); box('Kastendeckel', 0.2, 0.36, 0.03, 0.08, 0.1, 1.015, M['crate'], 0.01)
    for q in range(3): ring('Kabelrolle', 0.13 - q * 0.006, 0.014, (0, -0.08, 0.548 + q * 0.027), (0, 0, 1), M['rubber'])
    box('Kanister', 0.14, 0.2, 0.24, 0.06, 0.18, 0.65, M['green'], 0.02); box('Karton', 0.26, 0.3, 0.14, -0.04, 0.1, 0.28, M['crate'], 0.006, (0, 0, 0.1))
def p_stuhl():
    cyl('Stuhlfuß', 0.22, 0.03, 0, 0, 0.015, M['frame'], 'Z', n=20, bev=0.006); cyl('Stuhlsäule', 0.03, 0.4, 0, 0, 0.23, M['steel'], 'Z', n=12, bev=0)
    box('Sitz', 0.44, 0.46, 0.08, 0, 0, 0.46, M['polster'], 0.03); box('Sitzschale', 0.46, 0.48, 0.03, 0, 0, 0.415, M['frame'], 0.01)
    box('Lehne', 0.07, 0.44, 0.46, -0.2, 0, 0.75, M['polster'], 0.03, (0, -0.12, 0)); box('Lehnenschale', 0.03, 0.46, 0.48, -0.245, 0, 0.75, M['frame'], 0.01, (0, -0.12, 0))
    for sy in (-1, 1): box('Armlehne', 0.3, 0.05, 0.03, 0.0, sy * 0.25, 0.66, M['frame'], 0.01); box('Armstütze', 0.03, 0.04, 0.2, -0.1, sy * 0.25, 0.56, M['frame'], 0.006)
def p_tisch():      # Besprechungstisch mit Kartenfeld und Projektor
    top = [(-1.6, -0.5), (-1.35, -0.8), (1.35, -0.8), (1.6, -0.5), (1.6, 0.5), (1.35, 0.8), (-1.35, 0.8), (-1.6, 0.5)]
    prism('Tischplatte', top, 0.72, 0.78, M['crate'], 'Z', 0.012); prism('Tischkante', inset(top, -0.02), 0.7, 0.725, M['frame'], 'Z', 0.006)
    prism('Kartenfeld', inset(top, 0.22), 0.78, 0.785, M['screen2'], 'Z', 0); box('Tischsockel', 2.2, 0.5, 0.7, 0, 0, 0.35, M['frame'], 0.02)
    for sx in (-1, 1): box('Sockelfeld', 0.012, 0.36, 0.5, sx * 1.106, 0, 0.36, M['wall2'], 0.006); box('Sockelfuß', 0.5, 0.9, 0.05, sx * 0.9, 0, 0.025, M['frame'], 0.012)
    cyl('Projektor', 0.16, 0.05, 0, 0, 0.805, M['frame'], 'Z', n=24, bev=0.008); cyl('Projektorlinse', 0.1, 0.012, 0, 0, 0.835, M['e_teal'], 'Z', n=24, bev=0)
    ring('Projektorring', 0.7, 0.008, (0, 0, 1.25), (0, 0, 1), M['e_teal'], 48); ring('Projektorring', 0.45, 0.006, (0, 0, 1.45), (0, 0, 1), M['e_teal'], 40)
    point('Projektorlicht', (0, 0, 1.3), 14, (0.15, 0.9, 0.85), 0.15); area('Kartenlicht', (0, 0, 0.9), (PI, 0, 0), 2.4, 1.0, 10, (0.2, 0.75, 0.85))
    for q in range(4): box('Tischkonsole', 0.2, 0.12, 0.012, -1.0 + q * 0.66, -0.66, 0.786, M['wall2'], 0.004); cyl('Konsolen-LED', 0.006, 0.008, -0.92 + q * 0.66, -0.66, 0.795, M['e_green'], 'Z', n=8, bev=0)
def p_stehtisch():
    cyl('Tischfuß', 0.3, 0.03, 0, 0, 0.015, M['frame'], 'Z', n=24, bev=0.006); cyl('Tischsäule', 0.04, 1.0, 0, 0, 0.52, M['steel'], 'Z', n=12, bev=0)
    cyl('Tischplatte', 0.5, 0.04, 0, 0, 1.04, M['crate'], 'Z', n=32, bev=0.01); cyl('Tischrand', 0.51, 0.02, 0, 0, 1.03, M['ochre'], 'Z', n=32, bev=0.004)
    for q in range(3):
        a = q * 2 * PI / 3 + 0.4; x, y = math.cos(a) * 0.85, math.sin(a) * 0.85
        cyl('Hockerfuß', 0.17, 0.025, x, y, 0.0125, M['frame'], 'Z', n=20, bev=0.005); cyl('Hockersäule', 0.025, 0.6, x, y, 0.31, M['steel'], 'Z', n=10, bev=0)
        cyl('Hockersitz', 0.17, 0.07, x, y, 0.65, M['polster'], 'Z', n=24, bev=0.025)
    cyl('Becher', 0.035, 0.09, 0.15, 0.1, 1.105, M['white'], 'Z', n=14, bev=0.004); cyl('Becher', 0.035, 0.09, -0.2, -0.12, 1.105, M['ochre'], 'Z', n=14, bev=0.004)
def p_pflanze():
    oc = [(math.cos(q * PI / 4 + PI / 8) * 0.62, math.sin(q * PI / 4 + PI / 8) * 0.62) for q in range(8)]
    prism('Kübel', oc, 0.0, 0.46, M['wall2'], 'Z', 0.015); prism('Kübelrand', inset(oc, -0.03), 0.44, 0.5, M['frame'], 'Z', 0.01); prism('Erde', inset(oc, 0.06), 0.4, 0.47, M['erde'], 'Z', 0)
    R = random.Random(5)
    for q in range(14):
        a, r, h = R.uniform(0, 6.28), R.uniform(0.0, 0.4), R.uniform(0.45, 1.1)
        c = cyl('Blatt', 0.07 + h * 0.06, h, math.cos(a) * r, math.sin(a) * r, 0.47 + h / 2, M['blatt'], 'Z', n=7, bev=0, r2=0.0); c.rotation_euler = (R.uniform(-0.3, 0.3), R.uniform(-0.3, 0.3), 0)
    cyl('Pflanzlicht Mast', 0.02, 1.9, -0.5, 0, 0.95 + 0.46, M['steel'], 'Z', n=10, bev=0); box('Pflanzlicht', 0.5, 0.12, 0.04, -0.28, 0, 2.3, M['frame'], 0.008)
    box('Pflanzlicht Glas', 0.4, 0.08, 0.006, -0.26, 0, 2.277, M['e_white'], 0); area('Pflanzlicht', (-0.26, 0, 2.26), (0, 0, 0), 0.4, 0.08, 18, (1.0, 0.92, 0.8))
    for q in range(8): cyl('Kübelschraube', 0.01, 0.01, math.cos(q * PI / 4) * 0.6, math.sin(q * PI / 4) * 0.6, 0.25, M['steel'], 'Z', n=6, bev=0)
def p_automat():
    box('Automat', 0.6, 0.9, 1.9, 0, 0, 0.95, M['cab'], 0.02); box('Automat Front', 0.012, 0.74, 0.86, 0.302, 0, 1.3, M['screen2'], 0)
    box('Automat Fach', 0.03, 0.5, 0.26, 0.295, 0, 0.55, M['frame'], 0.012); box('Automat Tasten', 0.02, 0.14, 0.3, 0.3, 0.34, 0.75, M['wall2'], 0.006)
    for q in range(4): cyl('Automat Taste', 0.016, 0.01, 0.312, 0.34, 0.64 + q * 0.07, M[['e_green', 'e_amber', 'e_teal', 'e_red'][q]], 'X', n=10, bev=0)
    text('WASSER · TEE · BRÜHE', 0.035, (0.303, -0.33, 1.78), (0, 1, 0), (0, 0, 1), M['txtw']); area('Automatlicht', (0.4, 0, 1.3), (0, -PI / 2, 0), 0.8, 0.7, 10, (0.2, 0.75, 0.85))
def p_saeule():
    cyl('Säulenfuß', 0.3, 0.06, 0, 0, 0.03, M['frame'], 'Z', n=24, bev=0.012); cyl('Säule', 0.2, 2.1, 0, 0, 1.1, M['wall2'], 'Z', n=24, bev=0.01)
    cyl('Säulenbild', 0.203, 0.7, 0, 0, 1.45, M['screen2'], 'Z', n=24, bev=0); cyl('Säulenkopf', 0.24, 0.06, 0, 0, 2.17, M['frame'], 'Z', n=24, bev=0.012)
    for z in (1.08, 1.82): cyl('Säulenring', 0.208, 0.03, 0, 0, z, M['ochre'], 'Z', n=24, bev=0.004)
    point('Säulenlicht', (0.5, 0, 1.45), 3, (0.2, 0.8, 0.85), 0.2); point('Säulenlicht', (-0.5, 0, 1.45), 3, (0.2, 0.8, 0.85), 0.2)
PROP = {'kisten': p_kisten, 'fass': p_fass, 'wagen': p_wagen, 'stuhl': p_stuhl, 'tisch': p_tisch, 'stehtisch': p_stehtisch, 'pflanze': p_pflanze, 'automat': p_automat, 'saeule': p_saeule}
def prop(name): return module('Objekt ' + name, PROP[name])
