# Hütten-Baukasten, zweiter Teil (läuft nach hk_kit.py im selben Namensraum): Probeplan, Zusammenbau, Übersichtsblätter, Kameras, Rendern.

# ---------- Probeplan: jede Zelle 6 × 6 m ----------
#   G Gang · H Tor zum Hangar · P Tor zur Ofenhalle · A Annahme (Halle 18 × 12 m) · W Werkstatt (12 × 12 m) · . nichts
PLAN = [
    "..AAA...",
    "..AAA...",
    "HGGGGGGP",
    ".G...G..",
    ".G.WWG..",
    ".GGWWG..",
]
DOORS = {frozenset(p) for p in (((2, 3), (1, 3)), ((4, 5), (4, 4)), ((5, 2), (5, 3)))}
BULK = {(2, 5, 3)}      # Schott: (Zeile, Spalte, Seite) der Zelle, der die Grenze gehört
NAMES = {'A': 'ANNAHME', 'W': 'WERKSTATT', 'H': 'HANGAR', 'P': 'OFENHALLE'}
DIRS = ((-1, 0), (0, 1), (1, 0), (0, -1))      # Nord, Ost, Süd, West
def at(r, c): return PLAN[r][c] if 0 <= r < len(PLAN) and 0 <= c < len(PLAN[0]) else '.'
def states(r, c):
    ch = at(r, c); st = []
    for k, (dr, dc) in enumerate(DIRS):
        o = at(r + dr, c + dc); door = frozenset(((r, c), (r + dr, c + dc))) in DOORS
        if ch in 'GHP': st.append(('B' if (r, c, k) in BULK else 'O') if o in 'GHP' else 'D' if (o != '.' and door) else 'W')
        else: st.append('O' if o == ch else 'X' if (o in 'GHP' and door) else 'W')
    if ch in 'GHP':
        for (a, b) in ((3, 2), (2, 1), (1, 0), (0, 3)):
            da, db = DIRS[a], DIRS[b]
            st.append('k' if (st[a] in 'OB' and st[b] in 'OB' and at(r + da[0] + db[0], c + da[1] + db[1]) not in 'GHP') else '-')
    if ch in 'HP':      # das Tor liegt dem Gang gegenüber; OFFEN: Tore, die offen stehen (das zum Hangar)
        k = next(i for i, s in enumerate(st) if s in 'OB'); st[(k + 2) % 4] = 'D' if ch in globals().get('OFFEN', '') else 'C'
    return st
def choose(ch, r, c, k):      # Wandfüllungen einer Wandseite: (Name, Versatz längs der Wand)
    R = random.Random(r * 131 + c * 17 + k * 7)
    if ch in 'GHP':
        pool = ['platte'] * 4 + ['luke'] * 2 + ['welle'] * 3 + ['rohre'] * 2 + ['schalt', 'loesch', 'gas', 'aushang', 'bank', 'kran']
        return [(R.choice(pool), -1.55), (R.choice(pool), 1.55)]
    if ch == 'A':
        if k == 0: return [('rutsche', -1.55), ('rutsche', 1.55)] if c == 3 else [('aushang', -1.55), ('platte', 1.55)] if c == 2 else [('schauloch', -1.55), ('welle', 1.55)]
        if k == 1: return [('schalt', -1.55), ('terminal', 1.55)] if r == 0 else [('gas', -1.55), ('loesch', 1.55)]
        if k == 3: return [('terminal', -1.55), ('aushang', 1.55)] if r == 0 else [('bank', -1.55), ('spinde', 1.55)]
        return [('rohre', -1.55), ('welle', 1.55)]
    if ch == 'W':
        if k == 0: return [('werkzeug', -1.55), ('werkzeug', 1.55)]
        if k == 1: return [('kran', -1.55), ('gas', 1.55)] if r == 4 else [('schalt', -1.55), ('platte', 1.55)]
        if k == 3: return [('spinde', -1.55), ('bank', 1.55)]
        return [('rohre', -1.55), ('luke', 1.55)]
    return [('platte', -1.55), ('welle', 1.55)]
def col(name, parent=None):
    c = bpy.data.collections.new(name); (parent or SC.collection).children.link(c); return c
C_DECK, C_CEIL, C_SIGN, C_BLATT, C_CAM = col('Deck'), col('Deck Decken'), col('Deck Schilder'), col('Blatt'), col('Kameras')
def cellpos(r, c): return Vector((c * CELL, -r * CELL, 0.0))
def sign(s, k, loc):      # Name über dem Tor (auf der Sturzblende) und groß auf dem Boden davor
    prev = CUR[0]; CUR[0] = C_SIGN; REC[0] = []
    sz = 0.2; w = len(s) * sz * 0.66
    text(s, sz, (-W + 0.042, -w / 2, DOOR_H + 0.16), LEFT_X, LEFT_Y, M['txtw'])
    text(s, 0.34, (-1.3, -len(s) * 0.34 * 0.33, 0.0125), FL_X, FL_Y, M['txtw'])
    objs = REC[0]; REC[0] = None; CUR[0] = prev; rotz(objs, ANG[k], loc)
def assemble():
    n = 0
    for r, row in enumerate(PLAN):
        for c, ch in enumerate(row):
            if ch == '.': continue
            st = states(r, c); cm, cd = shell('gang' if ch in 'GHP' else 'raum', st); loc = cellpos(r, c)
            inst(cm, loc, 0, C_DECK); inst(cd, loc, 0, C_CEIL); n += 1
            for k in range(4):
                if st[k] == 'W':
                    for (name, b) in choose(ch, r, c, k): inst(dress(name), loc + Matrix.Rotation(ANG[k], 3, 'Z') @ Vector((0, b, 0)), ANG[k], C_DECK)
                elif st[k] == 'D': sign(NAMES.get(at(r + DIRS[k][0], c + DIRS[k][1]), ''), k, loc) if at(r + DIRS[k][0], c + DIRS[k][1]) != '.' else sign(NAMES.get('.', ''), k, loc)
                elif st[k] == 'C': sign(NAMES.get(ch, ''), k, loc)
    return n
def put(name, x, y, ang=0.0): inst(prop(name), (x, y, 0), ang, C_DECK)
def furnish():
    # Annahme (Zeilen 0–1, Spalten 2–4; x 9 … 27, y 3 … −9): Loren unter den Rutschen, Barren, Zuschlag, Tiegel, Pult des Schichtmeisters
    put('lore', 16.6, 0.2, 0.0); put('lore', 19.4, 0.2, 0.05); put('barren', 23.5, 0.4, 0.1); put('barren', 25.0, -1.1, -0.1); put('barren', 23.8, -2.4, 0.3)
    put('saecke', 11.6, -7.4, 0.05); put('saecke', 11.7, -5.9, -0.08); put('tiegel', 19.6, -4.6); put('pult', 15.5, -6.4, PI / 2); put('kiste', 25.3, -7.4, 0.1)
    put('absperrung', 21.6, -3.2, 0.3); put('fass', 10.6, -1.0); put('fass', 10.9, -1.8)
    # Werkstatt (Zeilen 4–5, Spalten 3–4; x 15 … 27, y −21 … −33)
    put('werkbank', 21.5, -27.0, 0.1); put('gaswagen', 25.2, -22.6, 2.4); put('fass', 16.5, -32.0); put('fass', 17.3, -32.4); put('kiste', 25.3, -31.8, -0.2); put('tiegel', 24.5, -27.5)
    # Gänge
    put('lore', 37.5, -13.4, PI / 2 + 0.05); put('fass', 4.6, -20.5); put('kiste', 31.5, -21.0, PI / 2); put('absperrung', 33.0, -10.3, 0.0)

# ---------- Übersichtsblätter ----------
BX = 400.0
SHEETS = {}
def tag(s, x, y, size=0.34):
    prev = CUR[0]; CUR[0] = C_BLATT; text(s, size, (x, y, 0.02), FL_X, FL_Y, M['e_signal']); CUR[0] = prev
def sheets():
    prev = CUR[0]; CUR[0] = C_BLATT
    mw = module('Musterwand', lambda: (wall_plates(-FW / 2, FW / 2, 0.0, HW, seed=1, cols=1), corrugated(-FW / 2, FW / 2, HW, HB)))
    y = 0.0; y0 = 0.0; n = 0; names = list(DRESS)
    for i, nm in enumerate(names):
        if i and i % 8 == 0: n += 1; SHEETS['waende%d' % n] = (y0, y); y += 4.0; y0 = y
        y += 1.6; inst(mw, (BX + W, y, 0), 0.0, C_BLATT); inst(dress(nm), (BX + W, y, 0), 0.0, C_BLATT)
        box('Musterboden', 3.0, FW + 0.2, 0.1, BX + 1.5, y, -0.05, M['riffel'], 0); tag(nm.upper(), BX + 2.4, y - 1.3); y += 1.6 + 0.4
    n += 1; SHEETS['waende%d' % n] = (y0, y)
    y += 6; y0 = y; n = 0
    for i, nm in enumerate(list(PROP)):
        if i and i % 5 == 0: n += 1; SHEETS['objekte%d' % n] = (y0, y); y += 4.0; y0 = y
        y += 1.6; box('Musterboden', 3.4, 3.0, 0.1, BX, y, -0.05, M['hboden'], 0); inst(prop(nm), (BX, y, 0), PI / 2 if nm in ('absperrung', 'lore') else 0.0, C_BLATT); tag(nm.upper(), BX + 2.0, y - 1.3); y += 1.6
    n += 1; SHEETS['objekte%d' % n] = (y0, y)
    y += 8; y0 = y
    for (nm, kind, st) in (('GANG', 'gang', 'OWOW----'), ('ABZWEIG', 'gang', 'OWOO-k-k'), ('TOR ZUM RAUM', 'gang', 'OWOD----'), ('SCHOTT', 'gang', 'OWOB----'), ('GANGENDE', 'gang', 'OWCW----'), ('RAUM ECKE', 'raum', 'WOOW'), ('RAUM TOR', 'raum', 'XOOO')):
        y += 3.6; cm, cd = shell(kind, list(st)); inst(cm, (BX - 4.0, y, 0), 0.0, C_BLATT); tag(nm, BX - 0.4, y - 2.6, 0.4); y += 3.6
    SHEETS['huellen'] = (y0, y)
    box('Blattgrund', 30, y + 10, 0.1, BX, y / 2, -0.15, M['hwand3'], 0)
    li = bpy.data.lights.new('Blattlicht', 'AREA'); li.shape = 'RECTANGLE'; li.size = 30; li.size_y = y + 20; li.energy = 300000; li.color = (1.0, 0.95, 0.9)
    ob = bpy.data.objects.new('Blattlicht', li); C_BLATT.objects.link(ob); ob.location = (BX + 6, y / 2, 18); ob.rotation_euler = (0, math.radians(18), 0)
    CUR[0] = prev

# ---------- Welt, Kameras, Rendern ----------
wd = bpy.data.worlds.new('Welt Huette'); SC.world = wd; wd.use_nodes = True
WN = wd.node_tree.nodes; WL = wd.node_tree.links
bg = next((n for n in WN if n.type == 'BACKGROUND'), None); wo = next(n for n in WN if n.type == 'OUTPUT_WORLD')
vn = WN.new('ShaderNodeVolumePrincipled'); vn.inputs['Density'].default_value = 0.0035; vn.inputs['Color'].default_value = (0.86, 0.83, 0.78, 1); vn.inputs['Anisotropy'].default_value = 0.4
def haze(on, ambient=0.0):
    for l in list(wo.inputs['Volume'].links): WL.remove(l)
    if on: WL.new(vn.outputs[0], wo.inputs['Volume'])
    bg.inputs[0].default_value = (0.004 + ambient, 0.0035 + ambient, 0.003 + ambient, 1)
CAMS = {}
def cam(name, loc, tgt, lens):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = 0.05; cd.clip_end = 400
    ob = bpy.data.objects.new(name, cd); C_CAM.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); CAMS[name] = ob; return ob
def ocam(name, loc, tgt, scale):
    ob = cam(name, loc, tgt, 50); ob.data.type = 'ORTHO'; ob.data.ortho_scale = scale; return ob
def cameras():
    w, h = len(PLAN[0]) * CELL, len(PLAN) * CELL
    ocam('Plan', (w / 2 - 3, -h / 2 + 3, 80), (w / 2 - 3, -h / 2 + 3.001, 0), max(w, h * 16 / 9) + 3)
    for nm, (y0, y1) in SHEETS.items():
        yc = (y0 + y1) / 2; x = BX + (-4.0 if nm == 'huellen' else 1.2)
        if nm == 'huellen': ocam('Blatt ' + nm, (x + 16, yc - 5, 40), (x, yc, 0.0), (y1 - y0) + 2)      # steil von oben: sonst sieht man nur die Rückseiten der Wände
        else: ocam('Blatt ' + nm, (x + 30, yc - 4, 15), (x, yc, 1.3), (y1 - y0) + 2)
    cam('A Hauptgang', (0.8, -12.4, 1.7), (40.0, -12.0, 2.3), 20)
    cam('B Abzweig', (30.6, -10.4, 1.7), (30.4, -33.0, 1.8), 19)
    cam('C Annahme', (25.8, -7.8, 1.75), (11.0, 1.5, 2.1), 17)
    cam('D Werkstatt', (16.4, -31.7, 1.7), (26.5, -21.5, 1.6), 17)
    cam('E Gang West', (6.4, -32.0, 1.7), (5.6, -6.0, 2.3), 20)
    cam('F Tor Annahme', (15.9, -13.9, 1.7), (18.2, -7.0, 2.2), 20)
    cam('G Schott', (37.0, -11.4, 1.7), (20.0, -12.2, 2.0), 22)
def setp(o, k, v):
    try: setattr(o, k, v)
    except Exception: pass
def cycles(samples=96):
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 7), ('volume_bounces', 1), ('glossy_bounces', 4), ('diffuse_bounces', 3), ('adaptive_threshold', 0.02)): setp(cy, k, v)
    R = SC.render; R.image_settings.file_format = 'JPEG'; R.image_settings.quality = 92
    setp(SC.view_settings, 'view_transform', 'AgX'); setp(SC.view_settings, 'look', 'AgX - Medium High Contrast')
EXPO = {'Plan': 2.6}
def view(name, path, res=(1600, 900)):
    plan, blatt = name == 'Plan', name.startswith('Blatt')
    C_DECK.hide_render = blatt; C_SIGN.hide_render = blatt; C_CEIL.hide_render = blatt or plan; C_BLATT.hide_render = not blatt
    haze(not (plan or blatt), 0.06 if plan else 0.03 if blatt else 0.0)
    SC.view_settings.exposure = EXPO.get(name, 0.0 if blatt else -0.1)
    SC.camera = CAMS[name]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = 100
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)
def tris():
    dg = bpy.context.evaluated_depsgraph_get(); cache = {}; total = 0
    deck = set(o.name for o in C_DECK.objects) | set(o.name for o in C_CEIL.objects)
    for it in dg.object_instances:
        if not it.is_instance or it.parent is None or it.parent.original.name not in deck: continue
        ob = it.object
        if ob.type not in ('MESH', 'CURVE', 'FONT'): continue
        key = ob.original.name
        if key not in cache:
            try: me = ob.to_mesh(); cache[key] = sum(len(p.vertices) - 2 for p in me.polygons); ob.to_mesh_clear()
            except Exception: cache[key] = 0
        total += cache[key]
    return {'gesetzt': total, 'einmalig': sum(cache.values())}
if not globals().get('NUR_HELFER'):      # ein Deck (hk_deck_ek.py) lädt diese Datei nur für die Helfer und baut selbst
  N_CELLS = assemble(); furnish(); sheets(); cameras()
  result = {'zellen': N_CELLS, 'bausteine': len(MOD), 'huellen': len(SHELLS), 'wandfuellungen': len(DRESS), 'objekte': len(PROP), 'instanzen': len(C_DECK.objects) + len(C_CEIL.objects)}
