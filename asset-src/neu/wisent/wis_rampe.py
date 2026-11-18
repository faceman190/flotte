# Wisent: Heckklappe als Gelenk-Rig mit Animation (wird von wis_kit.py nach wis_raeume.py geladen, gleiche Namen).
# Tor oben (Scharnier oben, klappt 97° nach hinten hoch), Rampe unten (Scharnier am Laderaumboden, schwenkt von senkrecht bis zum Boden)
# mit drei Teleskopauszügen, die nacheinander herausfahren. Bild 1 = zu, Bild RAMP_F = offen (25 Bilder/s, 6 s).
# Dieselben Gelenke und Abschnitte nutzt das Spiel (src/models/gltfShips.ts DOORS.Wisent); der Export nimmt Bild 1 (zu) fürs Modell
# und Bild RAMP_F (offen) für die Laufkarte, damit man über die Rampe hinein- und hinausgehen kann.
RAMP_F = 150
HX = XE - 0.06                 # Scharnierebene (knapp hinter der Heckplatte)
RAMP_W = DOOR_Y - 0.15         # halbe Breite der Rampe und des Tors
RAMP_L0 = 3.0                  # Länge des Rampenblatts (= unterer Teil der geschlossenen Klappe)
EXT = [(2.75, 0.12, 0.07, 0.15), (2.75, 0.1, 0.17, 0.3), (2.75, 0.1, 0.27, 0.45)]      # Auszüge: Länge, Dicke, Lage (lokal x), Breite weniger
EXT_S = 2.6                    # Weg je Auszug
TOR_HZ = None
SEG = {'tor': (0.0, 0.35), 'rampe': (0.25, 0.65), 'rampe2': (0.6, 0.75), 'rampe3': (0.72, 0.87), 'rampe4': (0.84, 1.0)}
def ramp_angle():      # Winkel unter der Waagerechten, bei dem das Ende des letzten Auszugs den Boden berührt
    L = 1.45 + EXT[2][0] / 2 + 3 * EXT_S + 0.05; xo = EXT[2][2] - EXT[2][1] / 2
    th = 0.6
    for _ in range(40): th = math.asin(min(0.99, (DOOR_Z0 + xo * math.cos(th)) / L))
    return th
def keys(ob, path, idx, pairs):      # Schlüsselbilder (Bild, Wert) mit weichem Verlauf
    for f, v in pairs:
        getattr(ob, path)[idx] = v; ob.keyframe_insert(path, index=idx, frame=f)
def tread_plate(name, L, W, th, x, m_top='i_grau', z0=0.0):      # Blatt mit Trittleisten, Wangen, Leuchten (lokal: Länge entlang +Z, Lauffläche +X)
    slab(name, (x, 0, z0 + L / 2), (0, 0, 1), (0, 1, 0), (L, 2 * W, th), M[m_top], 0.025)
    for k in range(int((L - 0.2) / 0.42)): slab('Trittleiste', (x + th / 2 + 0.012, 0, z0 + 0.25 + k * 0.42), (0, 1, 0), (0, 0, 1), (2 * W - 0.5, 0.06, 0.024), M['mittel'], 0.004)
    for s in (1, -1):
        slab('Rampenwange', (x + th / 2 + 0.04, s * (W - 0.07), z0 + L / 2), (0, 0, 1), (0, 1, 0), (L - 0.05, 0.14, 0.08), M['g_rot'], 0.015)
        for k in range(int(L / 1.2)): slab('Rampenleuchte', (x + th / 2 + 0.005, s * (W - 0.24), z0 + 0.5 + k * 1.2), (0, 0, 1), (0, 1, 0), (0.22, 0.05, 0.01), M['i_boden_licht'], 0)
def ramp_rig():
    global TOR_HZ
    z1 = door_z1(); TOR_HZ = z1 - 0.1; th = ramp_angle(); phi = -(PI / 2 + th)
    # Tor: Leerobjekt im Scharnier, Platte hängt nach unten bis zur Teilungsfuge
    CUR[0] = C_PART; Lt = TOR_HZ - (DOOR_Z0 + RAMP_L0)
    tor = group('Tor Gelenk', T(HX, 0, TOR_HZ))
    with Part('Tor', T(HX, 0, TOR_HZ), C_PART) as e:
        e.parent = tor; e.matrix_parent_inverse = tor.matrix_world.inverted()
        slab('Torblatt', (-0.1, 0, -Lt / 2), (0, 0, 1), (0, 1, 0), (Lt, 2 * RAMP_W, 0.2), M['p_graphit'], 0.03)
        slab('Torinnenseite', (0.012, 0, -Lt / 2), (0, 0, 1), (0, 1, 0), (Lt - 0.3, 2 * RAMP_W - 0.3, 0.025), M['i_kunst'], 0.01)
        for s in (1, -1):
            slab('Torleuchte', (0.03, s * (RAMP_W - 0.35), -Lt / 2), (0, 0, 1), (0, 1, 0), (Lt - 0.8, 0.07, 0.012), M['i_licht'], 0)
            for k in range(3): slab('Torbeschlag', (-0.21, s * (RAMP_W - 0.5), -0.5 - k * 0.9), (0, 0, 1), (0, 1, 0), (0.45, 0.24, 0.1), M['mittel'], 0.02)
        cyl('Torscharnier', 0.09, 2 * RAMP_W - 0.4, -0.05, 0, -0.02, M['mittel'], 'Y', n=16)
    # Rampe: Scharnier am Boden, Blatt steht im geschlossenen Zustand senkrecht (Außenseite nach hinten), Auszüge innen dahinter
    rg = group('Rampe Gelenk', T(HX, 0, DOOR_Z0))
    with Part('Rampe', T(HX, 0, DOOR_Z0), C_PART) as e:
        e.parent = rg; e.matrix_parent_inverse = rg.matrix_world.inverted()
        tread_plate('Rampenblatt', RAMP_L0, RAMP_W, 0.22, -0.11)
        slab('Rampenaussenseite', (-0.225, 0, RAMP_L0 / 2), (0, 0, 1), (0, 1, 0), (RAMP_L0 - 0.1, 2 * RAMP_W - 0.1, 0.012), M['p_grau'], 0.005)
        slab('Rampenwarnfeld aussen', (-0.235, 0, 0.3), (0, 0, 1), (0, 1, 0), (0.35, 2 * RAMP_W - 0.8, 0.008), M['warnrw'], 0)
        cyl('Rampenscharnier', 0.11, 2 * RAMP_W - 0.3, -0.05, 0, 0.03, M['mittel'], 'Y', n=16)
    prev = rg; gl = [rg]
    for i, (L, thk, xo, dw) in enumerate(EXT):
        ge = bpy.data.objects.new('Auszug %d Gelenk' % (i + 1), None); link(ge); ge.parent = prev; ge.matrix_parent_inverse = Matrix.Identity(4); ge.location = (0, 0, 0)
        with Part('Auszug %d' % (i + 1), Matrix.Identity(4), C_PART) as e:
            e.parent = ge; e.matrix_parent_inverse = Matrix.Identity(4)
            tread_plate('Auszugblatt', L, RAMP_W - dw, thk, xo, z0=0.15)
            if i == len(EXT) - 1: slab('Rampenende', (xo + thk / 2 + 0.01, 0, 0.15 + L - 0.3), (0, 0, 1), (0, 1, 0), (0.45, 2 * (RAMP_W - dw) - 0.4, 0.012), M['warnrw'], 0)
        prev = ge; gl.append(ge)
    # Animation (Bild 1 zu … RAMP_F offen)
    f = lambda t: 1 + t * (RAMP_F - 1)
    keys(tor, 'rotation_euler', 1, [(f(SEG['tor'][0]), 0.0), (f(SEG['tor'][1]), math.radians(97))])
    keys(rg, 'rotation_euler', 1, [(f(SEG['rampe'][0]), 0.0), (f(SEG['rampe'][1]), phi)])
    for i, tag in enumerate(('rampe2', 'rampe3', 'rampe4')):
        keys(gl[i + 1], 'location', 2, [(f(SEG[tag][0]), 0.0), (f(SEG[tag][1]), EXT_S)])
    SC.frame_start, SC.frame_end = 1, RAMP_F; SC.render.fps = 25
    ANCH['rampe_rig'] = dict(tor_hinge=[HX, 0.0, TOR_HZ], tor_angle=math.radians(97), ramp_hinge=[HX, 0.0, DOOR_Z0], ramp_angle=phi, slide=EXT_S,
                             fuss_x=HX - (1.45 + EXT[2][0] / 2 + 3 * EXT_S + 0.05) * math.cos(th), breite=RAMP_W, seg=SEG, dauer=RAMP_F / 25.0)
    SC.frame_set(1)
def ramp_film(path):      # Vorschaufilm: Rampe öffnet und schließt (MP4), Wüste, Kamera hinten seitlich
    camn, stage, gear_on, ex, glow = VIEWS['rampe']
    world_wisent(stage)
    for o in C_GRAU.all_objects: o.hide_render = True
    for k in ('wueste', 'dunst'): STAGE[k].hide_render = False
    for o in STAGE.get('felsen', []): o.hide_render = False
    STAGE['planet'].hide_render = True
    if 'planet2' in STAGE: STAGE['planet2'].hide_render = True
    sun = STAGE['sun']; sun.rotation_euler = (math.radians(74), 0, math.radians(295)); sun.data.energy = 4.2; sun.data.color = (1.0, 0.86, 0.7); STAGE['fill'].data.energy = 120000
    SC.camera = CAMS[camn]; R = SC.render; R.resolution_x, R.resolution_y = 960, 540; R.resolution_percentage = 100
    R.image_settings.file_format = 'FFMPEG'; R.ffmpeg.format = 'MPEG4'; R.ffmpeg.codec = 'H264'; R.ffmpeg.constant_rate_factor = 'MEDIUM'
    SC.cycles.samples = 24; SC.frame_start, SC.frame_end = 1, RAMP_F; R.filepath = path
    bpy.ops.render.render(animation=True)
ramp_rig()
def film(name, path):      # wis_lauf.py -- film:rampe
    ramp_film(path)
