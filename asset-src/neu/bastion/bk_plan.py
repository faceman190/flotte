# Bastion-Baukasten, zweiter Teil (läuft nach bk_kit.py im selben Namensraum): Decksplan, Zusammenbau, Übersichtsblätter, Kameras, Rendern.

# ---------- Decksplan (Probe): jede Zelle 4 × 4 m ----------
#   G Gang · H Tor zum Hangar · P Tor zur Promenade · T Treffpunkt · B Besprechungsraum · M Maschinenraum · S Spinde · L Lager · . nichts
PLAN = [
    ".WW.TTT......",
    ".WW.TTT.BBB..",
    ".GGGTTT.BBB..",
    ".G...G...G...",
    "HG.MMGGGGG.S.",
    ".G.....G...S.",
    ".GGGG..GGGGGP",
    ".QQ.G....L...",
    ".QQ.GGGGGL...",
]
# Türen zwischen Gang und Raum (Zeile, Spalte): ohne Eintrag bleibt dort eine Wand
DOORS = {frozenset(p) for p in (((2, 3), (2, 4)), ((3, 5), (2, 5)), ((3, 9), (2, 9)), ((4, 5), (4, 4)), ((6, 11), (5, 11)), ((8, 8), (8, 9)), ((2, 2), (1, 2)), ((6, 2), (7, 2)))}
# Schotte zwischen zwei Gangzellen: (Zeile, Spalte, Seite) der Zelle, der die Grenze gehört (Seite 2 = Süd, 3 = West)
BULK = {(2, 1, 2), (4, 8, 3), (6, 10, 3), (7, 4, 2), (5, 1, 2)}
NAMES = {'T': 'TREFFPUNKT', 'B': 'BESPRECHUNG', 'M': 'MASCHINEN 2', 'S': 'SPINDE', 'L': 'LAGER 4', 'Q': 'QUARTIER 3', 'W': 'WERKSTATT', 'H': 'HANGAR', 'P': 'PROMENADE'}
MOOD = {'T': 'warm', 'B': 'dunkel', 'M': 'dunkel', 'S': 'hell', 'L': 'dunkel', 'Q': 'warm', 'W': 'hell'}
DIRS = ((-1, 0), (0, 1), (1, 0), (0, -1))      # Nord, Ost, Süd, West (Zeilen laufen nach Süden)
def at(r, c): return PLAN[r][c] if 0 <= r < len(PLAN) and 0 <= c < len(PLAN[0]) else '.'
def states(r, c):
    ch = at(r, c); st = []
    for k, (dr, dc) in enumerate(DIRS):
        o = at(r + dr, c + dc); door = frozenset(((r, c), (r + dr, c + dc))) in DOORS
        if ch in 'GHP': st.append((('B' if (r, c, k) in BULK else 'S') if k in (2, 3) else 'O') if o in 'GHP' else 'D' if (o != '.' and door) else 'W')
        else: st.append('O' if o == ch else 'X' if (o == 'G' and door) else 'W')
    if ch in 'GHP':      # Innenecken (bk_kit.py, CORNERS): beide Seiten offen und die Zelle schräg gegenüber kein Gang
        for (a, b) in ((3, 2), (2, 1), (1, 0), (0, 3)):
            da, db = DIRS[a], DIRS[b]
            st.append('k' if (st[a] in 'OSB' and st[b] in 'OSB' and at(r + da[0] + db[0], c + da[1] + db[1]) not in 'GHP') else '-')
    if ch in 'HP':      # das Tor liegt dem Gang gegenüber
        k = next(i for i, s in enumerate(st) if s in 'SOB'); st[(k + 2) % 4] = 'D' if ch in globals().get('OFFEN', '') else 'C'      # OFFEN: Tore, die offen stehen
    return st
def choose(ch, r, c, k):      # Wandfüllungen einer Wandseite: Liste aus (Name, Versatz längs der Wand)
    R = random.Random(r * 131 + c * 17 + k * 7)
    if ch in 'GHP':
        if R.random() < 0.2: return [('rohr_a', -1), ('rohr_b', 1)]
        pool = ['feld1'] * 3 + ['feld2'] * 3 + ['feld3'] * 2 + ['feldh1'] * 3 + ['feldh2'] * 3 + ['gitter'] * 2 + ['tuer1', 'tuer2'] * 2 + ['terminal', 'schrank', 'feuer', 'aushang', 'karte', 'luke', 'flaschen']
        return [(R.choice(pool), -1), (R.choice(pool), 1)]
    if ch == 'T':
        if k == 0: return [('fenster', -1), ('fenster', 1)]
        if k == 3: return [('theke', -1), ('aushang', 1)] if r == 0 else [('pflanzwand', -1), ('pflanzwand', 1)]
        if k == 1: return [[('bank', -1), ('bank', 1)], [('schirm', -1), ('bank', 1)], [('karte', -1), ('bank', 1)]][r]
        return [('bank', -1), ('bank', 1)] if c == 4 else [('feld1', -1), ('bank', 1)]
    if ch == 'B':
        if k == 1: return [('schirm', -1), ('schirm', 1)]
        if k == 3: return [('feld3', -1), ('aushang', 1)] if r == 1 else [('feld1', -1), ('feld2', 1)]
        if k == 2: return [('karte', -1), ('feld3', 1)] if c == 10 else [('feld3', -1), ('feld1', 1)]
        return [(R.choice(['feld3', 'feld1']), -1), (R.choice(['feld2', 'feld3']), 1)]
    if ch == 'M':
        if k == 0: return [('pumpe', 0)] if c == 3 else [('tauscher', -1), ('schrank', 1)]
        if k == 2: return [('rohr_a', -1), ('rohr_b', 1)] if c == 3 else [('schrank', -1), ('gitter', 1)]
        return [('schrank', -1), ('flaschen', 1)]
    if ch == 'S': return [('spind', -1), ('bank' if (k == 1 and r == 5) else 'spind', 1)]
    if ch == 'L': return [('regal', -1), ('regal', 1)] if k in (1, 3) else [('feld3', -1), ('gitter', 1)]
    if ch == 'Q':
        if k == 0: return [('spind', -1), ('spind', 1)]
        if k == 1: return [('bank', -1), ('aushang', 1)] if r == 7 else [('kojen', -1), ('spind', 1)]
        return [('kojen', -1), ('kojen', 1)]
    if ch == 'W':
        if k == 0: return [('werkbank', -1), ('werkbank', 1)]
        if k == 3: return [('regal', -1), ('flaschen', 1)] if r == 0 else [('schrank', -1), ('regal', 1)]
        if k == 1: return [('werkbank', -1), ('feuer', 1)] if r == 0 else [('regal', -1), ('gitter', 1)]
        return [('schrank', -1), ('regal', 1)]
    return [('feld1', -1), ('feld2', 1)]
def col(name, parent=None):
    c = bpy.data.collections.new(name); (parent or SC.collection).children.link(c); return c
C_DECK, C_CEIL, C_SIGN, C_BLATT, C_CAM = col('Deck'), col('Deck Decken'), col('Deck Schilder'), col('Blatt'), col('Kameras')
def cellpos(r, c): return Vector((c * CELL, -r * CELL, 0.0))
def sign(s, k, loc, closed):
    prev = CUR[0]; CUR[0] = C_SIGN; REC[0] = []
    w = len(s) * 0.11 * 0.64
    text(s, 0.11, (-1.945 if not closed else -1.998, -w / 2, 2.58 if not closed else 2.62), LEFT_X, LEFT_Y, M['txtw'])
    text(s, 0.16, (-1.2, -len(s) * 0.16 * 0.32, 0.0125), FL_X, FL_Y, M['txto'])
    objs = REC[0]; REC[0] = None; CUR[0] = prev; rotz(objs, ANG[k], loc)
def assemble():
    n = 0
    for r, row in enumerate(PLAN):
        for c, ch in enumerate(row):
            if ch == '.': continue
            st = states(r, c); cm, cd = shell('gang' if ch in 'GHP' else 'raum', st, MOOD.get(ch, 'hell')); loc = cellpos(r, c)
            inst(cm, loc, 0, C_DECK); inst(cd, loc, 0, C_CEIL); n += 1
            for k in range(4):
                if st[k] == 'W':
                    for (name, b) in choose(ch, r, c, k):
                        inst(dress(name), loc + Matrix.Rotation(ANG[k], 3, 'Z') @ Vector((0, b, 0)), ANG[k], C_DECK)
                elif st[k] == 'D': o = at(r + DIRS[k][0], c + DIRS[k][1]); sign(NAMES.get(o, ''), k, loc, False)
                elif st[k] == 'C': sign(NAMES.get(ch, ''), k, loc, True)
    return n
def put(name, x, y, ang=0.0): inst(prop(name), (x, y, 0), ang, C_DECK)
def wegweiser(x, y, ang, lines, z=2.42):      # hängendes Schild an einer Abzweigung; die Tafel zeigt in Richtung ang (0 = nach Osten)
    prev = CUR[0]; CUR[0] = C_SIGN; REC[0] = []
    box('Wegweiser', 0.05, 1.9, 0.36, 0, 0, z, M['frame'], 0.012); box('Wegweiser Feld', 0.012, 1.82, 0.3, 0.03, 0, z, M['glass'], 0)
    for i, s in enumerate(lines): text(s, 0.08, (0.037, -0.86, z + 0.035 - i * 0.13), LEFT_X, LEFT_Y, M['e_cool' if i == 0 else 'e_amber'])
    for sy in (-0.8, 0.8): pipe('Hänger', [(0, sy, z + 0.18), (0, sy, HC - 0.02)], 0.01, M['steel'])
    box('Wegweiser Licht', 0.03, 1.7, 0.02, 0.05, 0, z + 0.2, M['e_cool'], 0)
    objs = REC[0]; REC[0] = None; CUR[0] = prev; rotz(objs, ang, (x, y, 0))
def furnish():
    # Treffpunkt (Zeilen 0–2, Spalten 4–6): Holo-Kugel in der Mitte, Messtische, Stehtische, Sessel, Pflanzkübel, Automat
    put('holo', 20, -4); put('messtisch', 17.6, -1.5); put('messtisch', 22.4, -1.5); put('stehtisch', 23.0, -6.9, 2.1); put('stehtisch', 17.2, -4.4, 0.5)
    put('sessel', 23.5, -3.3, PI); put('sessel', 23.5, -4.5, PI); put('pflanze', 17.4, -6.9); put('automat', 24.95, -9.38, PI / 2); put('tonne', 15.0, -2.4); put('saeule', 21.7, -6.7)
    for (x, y) in ((17.6, -1.5), (22.4, -1.5), (23.0, -6.9), (17.2, -4.4)): put('pendel', x, y)
    # Besprechungsraum (Zeilen 1–2, Spalten 8–10): Tisch mit Stühlen, Rednerpult vor der Bildwand
    put('tisch', 35.2, -6.0)
    for q in range(4): put('stuhl', 34.0 + q * 0.8, -4.78, -PI / 2); put('stuhl', 34.0 + q * 0.8, -7.22, PI / 2)
    put('stuhl', 33.0, -6.0, 0.0); put('pult', 38.6, -6.0, PI)
    # Quartier (Zeilen 7–8, Spalten 1–2) und Werkstatt (Zeilen 0–1, Spalten 1–2)
    put('sessel', 6.3, -29.4, -2.2); put('tonne', 7.3, -31.2); put('pendel', 6.0, -30.0); put('stehtisch', 6.1, -30.6, 1.2)
    put('palette', 5.3, -2.5, 0.1); put('trommel', 7.0, -2.2, 0.6); put('karre', 6.2, -4.9, 2.4); put('tonne', 4.5, -5.2)
    # Maschinenraum, Lager, Gänge
    put('wagen', 15.2, -17.0, 0.4); put('absperrung', 12.2, -15.45); put('palette', 36.3, -29.9, 0.05); put('fass', 36.9, -32.9); put('fass', 36.4, -33.3); put('karre', 35.3, -27.4, 1.2)
    put('kisten', 9.0, -22.85, PI / 2); put('wagen', 29.0, -15.0, PI / 2 + 0.2); put('fass', 5.1, -9.2); put('kisten', 17.2, -30.95, -PI / 2)
    put('trommel', 29.3, -25.0, 2.0); put('absperrung', 24.0, -33.0); put('tonne', 21.2, -17.2); put('karre', 4.9, -12.6, 0.3); put('tonne', 26.8, -22.9)
    wegweiser(5.3, -16.0, PI, ['<<<  WERKSTATT  ·  TREFFPUNKT', 'QUARTIER  ·  PROMENADE  >>>'])
    wegweiser(18.8, -16.0, 0.0, ['MASCHINEN 2  ·  GERADEAUS', 'TREFFPUNKT  >>>'])
    wegweiser(29.3, -24.0, PI, ['<<<  BESPRECHUNG', 'PROMENADE  ·  SPINDE  ·  GERADEAUS'])

# ---------- Übersichtsblätter: jeder Baustein einmal, mit Namen ----------
BX = 300.0
SHEETS = {}
def sheet_ground(y0, y1, x0=-14, x1=10):
    prev = CUR[0]; CUR[0] = C_BLATT; box('Blattboden', x1 - x0, y1 - y0, 0.1, BX + (x0 + x1) / 2, (y0 + y1) / 2, -0.35, M['floor2'], 0); CUR[0] = prev
def tag(s, x, y, size=0.32):
    prev = CUR[0]; CUR[0] = C_BLATT; text(s, size, (x, y, -0.29), FL_X, FL_Y, M['e_cool']); CUR[0] = prev
def sheets():
    prev = CUR[0]; CUR[0] = C_BLATT
    # Wandfüllungen: je zehn auf einem Blatt, jede vor einem Stück Wand
    y = 0.0; y0 = 0.0; n = 0
    for i, nm in enumerate(list(DRESS)):
        if i and i % 10 == 0: n += 1; SHEETS['waende%d' % n] = (y0, y); y += 3.0; y0 = y
        wide = nm == 'pumpe'; y += 1.2 + (1.2 if wide else 0)
        box('Musterwand', 0.06, 4.0 if wide else 2.0, 2.2, BX - 0.03, y, 1.1, M['wall'], 0); box('Musterboden', 2.2, 4.0 if wide else 2.0, 0.3, BX + 1.1, y, -0.15, M['frame'], 0)
        inst(dress(nm), (BX + W, y, 0), 0.0, C_BLATT); tag(nm.upper(), BX + 2.5, y - 0.9)
        y += 1.2 + (1.2 if wide else 0) + 0.5
    n += 1; SHEETS['waende%d' % n] = (y0, y)
    # Objekte: je zehn auf einem Blatt
    y += 5; y0 = y; n = 0
    for i, nm in enumerate(list(PROP)):
        if i and i % 10 == 0: n += 1; SHEETS['objekte%d' % n] = (y0, y); y += 3.0; y0 = y
        y += 1.7; box('Musterboden', 3.4, 3.0, 0.3, BX, y, -0.15, M['frame'], 0); inst(prop(nm), (BX, y, 0), PI / 2 if nm == 'absperrung' else 0.0, C_BLATT); tag(nm.upper(), BX + 2.0, y - 0.9); y += 1.7
    n += 1; SHEETS['objekte%d' % n] = (y0, y)
    # Hüllen (ohne Decke, damit man hineinsieht)
    y += 7; y0 = y; half = y0
    for i, (nm, kind, st) in enumerate((('GANG GERADE', 'gang', 'OWSW'), ('ECKE', 'gang', 'WWSS'), ('ABZWEIG', 'gang', 'OWSS'), ('KREUZUNG', 'gang', 'OOSS'), ('GANGENDE MIT TOR', 'gang', 'WWSC'),
                                      ('TÜR ZUM RAUM', 'gang', 'OWSD'), ('SCHOTT', 'gang', 'OWBW'), ('RAUM WAND', 'raum', 'WOOO'), ('RAUM ECKE', 'raum', 'WOOW'), ('RAUM TÜR', 'raum', 'XOOO'))):
        if i == 7: half = y
        y += 2.6; cm, cd = shell(kind, list(st)); inst(cm, (BX - 4.0, y, 0), 0.0, C_BLATT); tag(nm, BX - 1.4, y - 1.6, 0.3); y += 2.6
    SHEETS['huellen1'] = (y0, half); SHEETS['huellen2'] = (half, y)
    sheet_ground(-4, y + 4)
    li = bpy.data.lights.new('Blattlicht', 'AREA'); li.shape = 'RECTANGLE'; li.size = 30; li.size_y = y + 20; li.energy = 260000; li.color = (1.0, 0.97, 0.94)
    ob = bpy.data.objects.new('Blattlicht', li); C_BLATT.objects.link(ob); ob.location = (BX + 6, y / 2, 16); ob.rotation_euler = (0, math.radians(18), 0)
    CUR[0] = prev

# ---------- Welt, Kameras ----------
wd = SC.world or bpy.data.worlds.new('Welt'); SC.world = wd; wd.use_nodes = True
WN = wd.node_tree.nodes; WL = wd.node_tree.links
bg = next((n for n in WN if n.type == 'BACKGROUND'), None); wo = next(n for n in WN if n.type == 'OUTPUT_WORLD')
vn = WN.new('ShaderNodeVolumePrincipled'); vn.inputs['Density'].default_value = 0.009; vn.inputs['Color'].default_value = (0.75, 0.82, 0.9, 1); vn.inputs['Anisotropy'].default_value = 0.35
def haze(on, ambient=0.0):
    for l in list(wo.inputs['Volume'].links): WL.remove(l)
    if on: WL.new(vn.outputs[0], wo.inputs['Volume'])
    bg.inputs[0].default_value = (0.004 + ambient, 0.005 + ambient, 0.007 + ambient, 1)
CAMS = {}
def cam(name, loc, tgt, lens, fstop=None):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = 0.05; cd.clip_end = 300
    ob = bpy.data.objects.new(name, cd); C_CAM.objects.link(ob); ob.location = loc
    d = Vector(tgt) - Vector(loc); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if fstop: cd.dof.use_dof = True; cd.dof.focus_distance = d.length; cd.dof.aperture_fstop = fstop
    CAMS[name] = ob; return ob
def ocam(name, loc, tgt, scale):
    ob = cam(name, loc, tgt, 50); ob.data.type = 'ORTHO'; ob.data.ortho_scale = scale; return ob
def cameras():
    w, h = len(PLAN[0]) * CELL, len(PLAN) * CELL
    ocam('Plan', (w / 2 - 2, -h / 2 + 2, 60), (w / 2 - 2, -h / 2 + 2.001, 0), w + 3)
    for nm, (y0, y1) in SHEETS.items():
        yc = (y0 + y1) / 2; x = BX + (-3.0 if nm.startswith('huellen') else 1.0)
        ocam('Blatt ' + nm, (x + 26, yc - 3, 12), (x, yc, 0.9), (y1 - y0) + 2)
    cam('A Kreuzung', (19.0, -15.6, 1.5), (33.0, -16.2, 1.25), 20)
    cam('B Treffpunkt', (22.6, -9.0, 1.65), (17.6, -1.0, 1.25), 17)
    cam('C Besprechung', (32.8, -8.9, 1.6), (38.6, -5.2, 1.15), 18)
    cam('D Gangknick', (4.5, -23.7, 1.5), (15.5, -24.4, 1.25), 20)
    cam('E Maschinen', (17.4, -15.5, 1.5), (11.5, -14.6, 1.05), 20)
    cam('F Hangartor', (6.2, -16.0, 1.5), (0.0, -16.0, 1.3), 24)
    cam('G Treffpunkt Fenster', (16.8, -6.6, 1.55), (22.5, 1.0, 1.4), 18)
    cam('H Spinde', (44.0, -21.9, 1.55), (44.4, -15.5, 1.2), 17)
    cam('I Quartier', (7.2, -28.8, 1.6), (3.4, -31.6, 1.0), 17)
    cam('J Werkstatt', (7.4, -4.9, 1.6), (4.2, 0.6, 1.1), 17)
    cam('K Schott', (4.3, -14.6, 1.5), (3.9, -6.0, 1.35), 22)
    cam('L Theke', (19.6, -3.2, 1.55), (14.2, -0.2, 1.3), 20)
    cam('M Lager', (36.9, -27.1, 1.6), (35.6, -33.5, 1.0), 17)
def setp(o, k, v):
    try: setattr(o, k, v)
    except Exception: pass
def cycles(samples=150):
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 7), ('volume_bounces', 1), ('glossy_bounces', 4), ('diffuse_bounces', 3), ('adaptive_threshold', 0.02)): setp(cy, k, v)
    R = SC.render; R.image_settings.file_format = 'JPEG'; R.image_settings.quality = 92
    setp(SC.view_settings, 'view_transform', 'AgX'); setp(SC.view_settings, 'look', 'AgX - Medium High Contrast')
def view(name, path, res=(1600, 900), pct=100):      # ein Bild; Sichtbarkeit und Dunst passend zur Ansicht
    plan, blatt = name == 'Plan', name.startswith('Blatt')
    C_DECK.hide_render = blatt; C_SIGN.hide_render = blatt; C_CEIL.hide_render = blatt or plan; C_BLATT.hide_render = not blatt
    haze(not (plan or blatt), 0.05 if plan else 0.02 if blatt else 0.0)
    SC.view_settings.exposure = 1.0 if plan else 0.2 if blatt else 0.45
    SC.camera = CAMS[name]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = pct
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)
def job(views, samples=150, pct=100, mark='fertig.txt'):      # im Hintergrund rendern (überlebt die Anfrage); am Ende entsteht die Marke
    mp = os.path.join(HERE, mark)
    if os.path.exists(mp): os.remove(mp)
    def run():
        try:
            cycles(samples)
            for (nm, fn, res) in views: view(nm, os.path.join(HERE, fn), res, pct)
            bpy.context.preferences.addons['cycles'].preferences.compute_device_type = 'NONE'
            open(mp, 'w').write('ok')
        except Exception as e:
            import traceback; open(mp, 'w').write('FEHLER ' + traceback.format_exc()[-900:])
        return None
    bpy.app.timers.register(run, first_interval=0.5)

def tris():      # Dreiecke des Probe-Decks: gesetzt (alle Instanzen) und einmalig (jeder Baustein nur einmal gezählt)
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
if not globals().get('NUR_HELFER'):      # ein anderer Plan (z. B. bk_deck_d.py) lädt diese Datei nur für die Helfer und baut selbst
    N_CELLS = assemble(); furnish(); sheets(); cameras()
    result = {'zellen': N_CELLS, 'bausteine': len(MOD), 'instanzen': len(C_DECK.objects) + len(C_CEIL.objects), 'objekte': len(bpy.data.objects)}
