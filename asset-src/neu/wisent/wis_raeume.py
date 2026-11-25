# Wisent: Mannschaftsgang mit Kojen (Oberdeck hinter der Brücke) und Laderaum (Unterdeck bis zur Heckklappe, leer).
# Wird von wis_kit.py nach wis_bruecke.py geladen (gleiche Namen).
# Gang: runde Portalrahmen mit Lichtring alle 3 m, dazwischen auf beiden Seiten Kojennischen mit Stockbetten, Leitern, Spinden,
# Leselampen; Boden mit roten Laufstreifen. Laderaum: weiße Wandplatten mit Rippen, rote Leitungen, Lichtleisten, Kranbahn,
# Bodenplatten mit Zurrschienen und Markierungslichtern, Ladegut (Kisten, Container), ein Geländewagen, Heckklappe von innen.
GF = 11.6          # Boden Oberdeck
GZ = 14.35         # Decke Gang
GX0, GX1 = 6.0, 24.48
BF = 6.4           # Boden Laderaum (= Unterkante der Heckklappe)
BZ = 11.4          # Decke Laderaum
BX0, BX1 = XE + 0.3, 5.6

M['i_matratze'] = mk('Matratze', (0.07, 0.065, 0.085), 0.0, 0.8, var=0.08, scale=6.0, bump=0.3, bscale=200)
M['i_decke'] = mk('Bettdecke', (0.11, 0.1, 0.13), 0.0, 0.85, var=0.1, scale=3.0, bump=0.5, bscale=80)
M['i_rosa'] = mk('Portallicht', (1, 0.8, 0.85), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.78, 0.84), es=9, grime=False)
M['kiste'] = mk('Kiste Graphit', (0.05, 0.052, 0.058), 0.4, 0.45, var=0.1, scale=2.0, bump=0.2, wear=0.7)
M['kiste2'] = mk('Kiste Grau', (0.16, 0.165, 0.17), 0.35, 0.45, var=0.1, scale=2.0, bump=0.2, wear=0.7)
M['reifen'] = mk('Reifen', (0.02, 0.02, 0.022), 0.0, 0.85, var=0.05, scale=12.0, bump=0.6, bscale=60)
M['i_wand'] = mk('Wandplatte Weiss', (0.56, 0.57, 0.58), 0.1, 0.36, var=0.05, rvar=0.05, scale=1.5, bump=0.08, bscale=120, wear=0.2)
M['orange'] = mk('Polster Orange', (0.5, 0.18, 0.03), 0.0, 0.6, var=0.1)
# Details (25.11.2026, innen_detail.py): Bodenplatten, Gitterrost, Ankerschienen, Stoßbleche, Leitungen mit Schellen
M['wb_platte'] = mk('Ladeboden Platte', (0.05, 0.052, 0.058), 0.6, 0.46, var=0.1, scale=6.0, bump=0.15, wear=0.6)
M['wb_platte2'] = mk('Ladeboden Platte hell', (0.07, 0.072, 0.078), 0.6, 0.44, var=0.1, scale=6.0, bump=0.15, wear=0.6)
M['wb_schacht'] = mk('Schacht', (0.008, 0.008, 0.01), 0.3, 0.85, var=0.05, grime=False)
M['wb_gitter'] = mk('Gitterrost', (0.09, 0.092, 0.097), 0.85, 0.42, var=0.1, wear=0.7)
M['wb_stoss'] = mk('Stossblech', (0.11, 0.113, 0.12), 0.8, 0.4, var=0.12, wear=0.8)
M['wb_rohr1'] = mk('Leitung Petrol', (0.03, 0.12, 0.13), 0.4, 0.42, var=0.08, wear=0.5)
M['wb_rohr2'] = mk('Leitung Grau', (0.2, 0.205, 0.21), 0.7, 0.4, var=0.08, wear=0.5)
exec(compile(open(os.path.join(os.path.dirname(bpy.data.filepath), '..', 'innen', 'innen_detail.py'), encoding='utf-8').read(), 'innen_detail.py', 'exec'))

def rrect_path(y, z0, z1, r, n=8):      # gerundetes Rechteck (y = halbe Breite) in der YZ-Ebene, unten offen
    pts = [(-y, z0)]
    for cy, cz, a0 in ((-y + r, z1 - r, PI), (y - r, z1 - r, PI / 2)):
        for k in range(n + 1): a = a0 - (PI / 2) * k / n; pts.append((cy + r * math.cos(a), cz + r * math.sin(a)))
    pts.append((y, z0)); return pts

# ---------- Mannschaftsgang ----------
def portal(x):
    P = [Vector((x, y, z)) for y, z in rrect_path(1.32, GF, GZ - 0.05, 0.75)]
    pipe('Portalrahmen', P, 0.17, M['i_grau'])
    pipe('Portalkante', [p + Vector((0.13, 0, 0)) for p in P], 0.07, M['i_schwarz'])
    Pi = [Vector((x, y * 0.86, GF + (z - GF) * 0.93)) for y, z in rrect_path(1.32, GF, GZ - 0.05, 0.75)]
    pipe('Portallicht', [Vector((x + 0.02, p.y, p.z)) for p in Pi[1:-1]], 0.022, M['i_rosa'])
    for sg in (1, -1): slab('Portalfuss', (x, sg * 1.32, GF + 0.12), (1, 0, 0), (0, 1, 0), (0.42, 0.42, 0.24), M['i_schwarz'], 0.03)
    slab('Portalschild', (x + 0.18, 0, GZ - 0.32), (0, 1, 0), (0, 0, 1), (0.5, 0.12, 0.02), M['i_kunst'], 0.005)
def bunk(x0, x1, s):      # Kojennische auf der Seite s zwischen x0 und x1
    xm = (x0 + x1) / 2; yi, yo = s * 1.45, s * 3.4
    for z, lvl in ((GF + 0.45, 0), (GF + 1.6, 1)):
        slab('Kojenrahmen', (xm, (yi + yo) / 2, z - 0.08), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.2, abs(yo - yi), 0.14), M['i_kunst'], 0.03)
        slab('Matratze', (xm, (yi + yo) / 2 + s * 0.05, z + 0.06), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.35, abs(yo - yi) - 0.25, 0.14), M['i_matratze'], 0.05)
        slab('Kissen', (x1 - 0.55, (yi + yo) / 2 + s * 0.05, z + 0.17), (1, 0, 0), (0, 1, 0), (0.5, abs(yo - yi) - 0.5, 0.12), M['i_kunst'], 0.05)
        slab('Bettdecke', (xm - 0.25, (yi + yo) / 2 + s * 0.05, z + 0.14), (1, 0, 0), (0, 1, 0), (x1 - x0 - 1.2, abs(yo - yi) - 0.3, 0.06), M['i_decke'], 0.03)
        slab('Kojenkante', (xm, yi + s * 0.02, z + 0.05), (1, 0, 0), (0, 0, 1), (x1 - x0 - 0.2, 0.26, 0.05), M['i_kunst'], 0.02)
        slab('Kojenstreifen', (xm, yi - s * 0.005, z + 0.05), (1, 0, 0), (0, 0, 1), (x1 - x0 - 0.3, 0.02, 0.005), M['g_rot'], 0)
        slab('Leselicht', (xm, (yi + yo) / 2, z + 1.0 if lvl == 0 else GZ - 0.06), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.6, 0.06, 0.012), M['i_licht'], 0)
    slab('Kojenboden oben', (xm, (yi + yo) / 2, GF + 1.62 - 0.17), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.2, abs(yo - yi), 0.04), M['i_grau'], 0.01)
    slab('Nischenrueckwand', (xm, yo + s * 0.05, (GF + GZ) / 2), (1, 0, 0), (0, 0, 1), (x1 - x0, GZ - GF, 0.1), M['i_wand'], 0.02)
    if GW[0] is not None:      # Wandfelder auf der Rückwand der Nische (zwischen und über den Kojen sichtbar)
        a3 = Vector((x0, yo, 0)); n3 = Vector((0, -s, 0)); half = (x1 - x0) / 2
        for k, (s0, s1) in enumerate(((0.05, half - 0.02), (half + 0.02, x1 - x0 - 0.05))):
            wandfeld(GW[0], a3, Vector((1, 0, 0)), n3, s0, s1, GF + 0.12, GZ - 0.12, 3 + k * 2 + (1 if s > 0 else 0), M['i_kunst'], M['i_grau'], M['wb_schacht'], M['mittel'], M['i_grau'])
    for k in range(2): slab('Spindtuer', (x0 + 0.55 + k * 0.62, yo, GF + 2.1), (1, 0, 0), (0, 0, 1), (0.56, 0.42, 0.06), M['i_grau'], 0.02)
    # Leiter an der Gangseite
    lx = x0 + 0.45
    for dy in (-0.0, 0.0):
        pass
    for zz in (0, 1): rod('Leiterholm', Vector((lx + zz * 0.36, yi - s * 0.04, GF)), Vector((lx + zz * 0.36, yi - s * 0.04, GF + 2.0)), 0.022, M['i_kunst'], 10)
    for k in range(6): rod('Leitersprosse', Vector((lx, yi - s * 0.04, GF + 0.3 + k * 0.3)), Vector((lx + 0.36, yi - s * 0.04, GF + 0.3 + k * 0.3)), 0.016, M['g_rot'] if k == 5 else M['mittel'], 8)
    o = text('WISENT', 0.08, (x1 - 0.35, yi - s * 0.15, GF + 1.47), (-s * 0, 0, 0) if False else (s * -1 if False else (1, 0, 0)), (0, 0, 1), M['i_schwarz'], align='RIGHT', name='Kojenschrift') if False else None
GW = [None]      # Sammler für Wanddetails im Gang (in corridor() angelegt)
def corridor():
    W = 1.45; xs = [22.5, 19.5, 16.5, 13.5, 10.5, 7.5]
    slab('Gangboden', ((GX0 + GX1) / 2, 0, GF - 0.05), (1, 0, 0), (0, 1, 0), (GX1 - GX0, 2 * 3.45, 0.1), M['i_boden'], 0.01)
    slab('Gangdecke', ((GX0 + GX1) / 2, 0, GZ + 0.05), (1, 0, 0), (0, 1, 0), (GX1 - GX0, 2 * 3.45, 0.1), M['i_wand'], 0.01)
    for sg in (1, -1):
        slab('Laufstreifen', ((GX0 + GX1) / 2, sg * 0.7, GF + 0.004), (1, 0, 0), (0, 1, 0), (GX1 - GX0 - 0.4, 0.07, 0.008), M['g_rot'], 0)
        slab('Laufstreifen', ((GX0 + GX1) / 2, sg * 0.82, GF + 0.004), (1, 0, 0), (0, 1, 0), (GX1 - GX0 - 0.4, 0.03, 0.008), M['g_rot'], 0)
    slab('Gangmitte', ((GX0 + GX1) / 2, 0, GF + 0.003), (1, 0, 0), (0, 1, 0), (GX1 - GX0 - 0.4, 0.8, 0.006), M['i_grau'], 0.002)
    SG = Sammel('Gangdetail Boden', C_ROOM, 0.003); GW[0] = Sammel('Gangdetail Wand', C_ROOM)
    deckenraster(GW[0], GX0, GX1, -3.45, 3.45, GZ, M['i_grau'], p=1.0, b=0.04, t=0.012)
    n = int(GX1 - GX0 - 0.4)
    for k in range(n): gitter(SG, GX0 + 0.2 + k * (GX1 - GX0 - 0.4) / n + 0.01, GX0 + 0.2 + (k + 1) * (GX1 - GX0 - 0.4) / n - 0.01, -0.38, 0.38, GF + 0.006, M['wb_gitter'], M['wb_schacht'])
    SG.fertig()
    for x in xs: portal(x)
    for i in range(len(xs) - 1):
        for s in (1, -1): bunk(xs[i + 1] + 0.2, xs[i] - 0.2, s)
        x = (xs[i] + xs[i + 1]) / 2
        slab('Gangdeckenleuchte', (x, 0, GZ - 0.01), (1, 0, 0), (0, 1, 0), (1.6, 0.5, 0.02), M['i_licht'], 0)
        area('Ganglicht', (x, 0, GZ - 0.1), (0, 0, 0), 1.2, 0.5, 60, (1.0, 0.92, 0.94))
    for s in (1, -1):      # Seitenwände an den Gangenden und Querwände zwischen den Nischen
        for x in xs: slab('Nischenwand', (x, s * 2.42, (GF + GZ) / 2), (1, 0, 0), (0, 1, 0), (0.12, 2.0, GZ - GF), M['i_wand'], 0.02)
    # vorn zur Brücke: Wand mit Tür; hinten Treppenschacht nach unten
    slab('Gangstirn vorn', (GX1 - 0.05, 0, (GF + GZ) / 2), (1, 0, 0), (0, 1, 0), (0.1, 6.9, GZ - GF), M['i_wand'], 0.02) if False else None
    # Geländer um den Treppenaustritt am hinteren Gangende (die Treppe selbst steht im Laderaum, stairs())
    for sg in (1, -1): pipe('Austrittsgelaender', [Vector((GX0 + 0.3, sg * 1.15, GF)), Vector((GX0 + 0.3, sg * 1.15, GF + 1.0)), Vector((GX0 - 0.5, sg * 1.15, GF + 1.0))], 0.03, M['g_rot'], rad=0.1)
    GW[0].fertig(); GW[0] = None
    cam('Gang', (23.6, 0.35, GF + 1.6), (8.0, -0.2, GF + 1.2), 20); VIEWS['gang'] = ('Gang', 'weltraum', False, 0.5, 0.0)
    cam('Koje', (14.6, -0.9, GF + 1.5), (16.0, 2.8, GF + 0.9), 20); VIEWS['koje'] = ('Koje', 'weltraum', False, 0.5, 0.0)

# ---------- Treppe vom Laderaum zum Mannschaftsgang (vorn in der Mitte, durch eine Öffnung in der Decke) ----------
ST_W = 1.0                    # halbe Breite der Treppe
ST_X0, ST_X1 = -2.1, 5.5      # unterste und oberste Stufe (x)
def stairs():
    n = 29; rise = (GF - BF) / n; run = (ST_X1 - ST_X0) / n
    for k in range(n):
        x = ST_X0 + (k + 0.5) * run; z = BF + (k + 1) * rise
        slab('Treppenstufe', (x, 0, z - 0.04), (1, 0, 0), (0, 1, 0), (run + 0.02, 2 * ST_W, 0.08), M['i_grau'], 0.006)
        slab('Stufenkante', (x + run / 2 - 0.03, 0, z - 0.005), (1, 0, 0), (0, 1, 0), (0.04, 2 * ST_W - 0.1, 0.012), M['i_boden_licht'] if k % 4 == 0 else M['warnrw'], 0)
    x0s = ST_X0 + 1.1      # Schacht über der Deckenöffnung: Seitenwände, Stirn hinten, Decke außerhalb des Schlitzes
    for sg in (1, -1):
        slab('Schachtwand', ((x0s + GX0) / 2, sg * (ST_W + 0.25), (BZ + GF) / 2), (1, 0, 0), (0, 0, 1), (GX0 - x0s, GF - BZ + 0.3, 0.1), M['i_kunst'], 0.01)
        slab('Schachtdecke', ((x0s + GX0) / 2, sg * 3.4, BZ + 0.02), (1, 0, 0), (0, 1, 0), (GX0 - x0s, 4.3, 0.08), M['i_kunst'], 0.01)
    slab('Schachtstirn', (x0s, 0, (BZ + GF) / 2 + 0.6), (0, 1, 0), (0, 0, 1), (2 * ST_W + 0.6, GF - BZ + 1.5, 0.1), M['i_kunst'], 0.01)
    slab('Schachtlicht', ((x0s + GX0) / 2, 0, GF + 1.9), (1, 0, 0), (0, 1, 0), (GX0 - x0s - 0.6, 0.3, 0.02), M['i_licht'], 0) if False else None
    slab('Treppenpodest', ((ST_X1 + GX0) / 2 + 0.1, 0, GF - 0.05), (1, 0, 0), (0, 1, 0), (GX0 - ST_X1 + 0.6, 2 * ST_W + 0.4, 0.1), M['i_grau'], 0.01)
    for sg in (1, -1):      # Wangen, Geländer, Lichtleiste
        prism('Treppenwange', [(ST_X0 - 0.1, BF), (ST_X0 + 0.3, BF), (ST_X1 + 0.1, GF - 0.25), (ST_X1 + 0.1, GF + 0.05), (ST_X1 - 0.2, GF + 0.05), (ST_X0 - 0.1, BF + 0.35)], sg * ST_W, sg * (ST_W + 0.12), M['i_kunst'], 'Y', 0.02)
        pipe('Treppengelaender', [Vector((ST_X0 + 0.2, sg * (ST_W + 0.06), BF + 1.0)), Vector((ST_X1, sg * (ST_W + 0.06), GF + 1.0)), Vector((GX0 + 0.3, sg * (ST_W + 0.06), GF + 1.0))], 0.035, M['g_rot'], rad=0.2)
        for k in range(6):
            x = ST_X0 + 0.4 + k * (ST_X1 - ST_X0 - 0.4) / 5; z = BF + (x - ST_X0) / (ST_X1 - ST_X0) * (GF - BF)
            rod('Gelaenderpfosten', Vector((x, sg * (ST_W + 0.06), z)), Vector((x, sg * (ST_W + 0.06), z + 1.0)), 0.025, M['i_grau'], 8)
        pipe('Treppenlicht', [Vector((ST_X0 + 0.3, sg * (ST_W + 0.13), BF + 0.25)), Vector((ST_X1, sg * (ST_W + 0.13), GF - 0.05))], 0.015, M['i_licht'])
    slab('Treppenschild', (ST_X0 - 0.12, 0, BF + 1.4), (0, 1, 0), (0, 0, 1), (1.4, 0.3, 0.02), M['i_kunst'], 0.005) if False else None
def ramp_panel():      # Schalttafel der Heckrampe an der Backbordwand neben der Klappe (Auslöser „ramp“ im Spiel)
    x = BX0 + 2.6; y = bay_w(x) - 0.08
    with Part('Rampenschalter', wall_mw(x, 1, BF + 1.35, 0.04), C_ROOM):
        slab('Schaltkasten', (0, 0, 0.07), (1, 0, 0), (0, 1, 0), (0.7, 0.9, 0.14), M['i_schwarz'], 0.02)
        slab('Schaltanzeige', (0, 0.18, 0.145), (1, 0, 0), (0, 1, 0), (0.5, 0.3, 0.004), M['ui_text'], 0)
        for k, m in enumerate(('nav_g', 'nav_r')): cyl('Schaltknopf', 0.07, 0.04, -0.15 + k * 0.3, -0.18, 0.16, M[m], 'Z', n=16)
        slab('Schaltwarnrahmen', (0, 0, 0.142), (1, 0, 0), (0, 1, 0), (0.74, 0.04, 0.004), M['warnrw'], 0)
    ANCH['rampenschalter'] = Vector((x, y, BF + 1.35))
# ---------- Laderaum (leer, nach den Beispielbildern: helle Wände mit Schrägen, Rippen, rote Leitungen und Lichtlinie, Leuchtfelder, Plattenboden) ----------
C_ROFF = coll('Rampe offen')
def bay_w(x): return 6.6 if x > -35.0 else 6.6 - (6.6 - 4.7) * min(1.0, (-35.0 - x) / (-35.0 - BX0))
ZW = BF + 2.9      # Knick Wand / Schräge
SL = 1.6           # Breite der Schräge
def bay_profile(w):      # von links unten über die Decke nach rechts unten (y, z)
    return fillet([(-w, BF), (-w, ZW), (-(w - SL), BZ), (w - SL, BZ), (w, ZW), (w, BF)], 0.4, 6)
def bay_shell():
    XS = sorted(set([round(BX0 + (BX1 - BX0) * i / 120, 4) for i in range(121)] + [-35.0]))
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); R = []; S = []
    for x in XS:
        P = bay_profile(bay_w(x)); R.append([bm.verts.new((x, y, z)) for y, z in P])
        acc = [0.0]
        for i in range(1, len(P)): acc.append(acc[-1] + math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]))
        S.append(acc)
    n = len(R[0])
    for i in range(len(XS) - 1):
        for k in range(n - 1):
            f = bm.faces.new((R[i][k], R[i + 1][k], R[i + 1][k + 1], R[i][k + 1]))
            f.material_index = 1 if f.calc_center_median().z < BF + 1.0 else 0
            for lp, (ii, kk) in zip(f.loops, ((i, k), (i + 1, k), (i + 1, k + 1), (i, k + 1))): lp[uvl].uv = (XS[ii], S[ii][kk])
    bm.normal_update()
    f0 = [f for f in bm.faces if f.calc_center_median().z > BZ - 0.05]
    if sum(f.normal.z for f in f0) > 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    hole = [f for f in bm.faces if f.calc_center_median().z > BZ - 0.3 and abs(f.calc_center_median().y) < ST_W + 0.15 and f.calc_center_median().x > ST_X0 + 1.2]
    bmesh.ops.delete(bm, geom=hole, context='FACES')
    mesh_obj('Laderaumhaut', bm, ['i_weiss', 'i_schwarz'], True, C_ROOM)
    # Boden mit UV (Plattenfugen und Nieten im Shader)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('Platten'); prev = None
    for x in XS:
        w = bay_w(x); a, b = bm.verts.new((x, -w, BF)), bm.verts.new((x, w, BF))
        if prev:
            f = bm.faces.new((prev[0], prev[1], b, a))
            for lp in f.loops: lp[uvl].uv = (lp.vert.co.x * 0.55, lp.vert.co.y * 0.8)
        prev = (a, b)
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces[:])
    mesh_obj('Laderaumboden', bm, ['i_boden'], True, C_ROOM)
def slope_frame(x, s, f, lift=0.03):      # Matrix auf der Schräge (f = 0 unten … 1 oben), Z zeigt in den Raum
    w = bay_w(x); a = Vector((x, s * w, ZW)); b = Vector((x, s * (w - SL), BZ)); p = a.lerp(b, f)
    d = (b - a).normalized(); n = Vector((0, -s, 0)).cross(Vector((1, 0, 0))) if False else Vector((0, -s * abs(d.z), -abs(d.y))).normalized() * -1
    n = Vector((0, -s * d.z, d.y * s)).normalized() if False else Vector((0, -s * abs(d.z), -abs(d.y)))
    n = Vector((0, -s * 0.8, -0.6)).normalized() if n.length < 1e-6 else n.normalized()
    return surface_frame(p + n * lift, (1, 0, 0), n)
def wall_mw(x, s, z, lift=0.02):
    return surface_frame(Vector((x, s * (bay_w(x) - lift), z)), (1, 0, 0), (0, -s, 0))
def cargo_bay():
    bay_shell(); L = BX1 - BX0
    ribs = [BX0 + 1.6 + 3.0 * k for k in range(int((L - 2.0) / 3.0) + 1)]
    for x in ribs:      # Rippen dem Profil folgend, Fußklötze
        P = bay_profile(bay_w(x)); c = Vector((0, BF + 2.6))
        pts = [Vector((x, y, z)) + Vector((0, *( (c - Vector((y, z))).normalized() * 0.12))) for y, z in P]
        if x > ST_X0 + 1.0:      # Rippe über der Treppe: in der Mitte unterbrochen (Kopfhöhe)
            for side in (1, -1): pipe('Rippe', [p for p in pts if p.y * side > ST_W + 0.25], 0.14, M['i_kunst'])
        else: pipe('Rippe', pts, 0.14, M['i_kunst'])
        for s in (1, -1): slab('Rippenfuss', (x, s * (bay_w(x) - 0.2), BF + 0.4), (1, 0, 0), (0, 1, 0), (0.45, 0.4, 0.8), M['i_schwarz'], 0.04)
    for s in (1, -1):
        xs = [BX0 + 0.4 + i * (L - 0.8) / 60 for i in range(61)]
        pipe('Rote Lichtlinie', [Vector((x, s * (bay_w(x) - SL + 0.05), BZ - 0.1)) for x in xs], 0.03, M['i_licht_rot'])
        pipe('Wandlichtlinie', [Vector((x, s * (bay_w(x) - 0.1), ZW - 0.12)) for x in xs], 0.025, M['i_licht'])
        pipe('Bodenlichtlinie', [Vector((x, s * (bay_w(x) - 0.06), BF + 0.06)) for x in xs], 0.018, M['i_boden_licht'])
        for i in range(len(ribs) - 1):
            x0, x1 = ribs[i], ribs[i + 1]; xm = (x0 + x1) / 2
            # Schrägplatte mit Feldnummer und dunkler Griffmulde, rote Leitungen senkrecht in den Sockel, Lüftungsschlitze unten, Wandkasten jede zweite Feld
            q = 1 if s > 0 else -1      # lokale Y-Richtung der Schräge kippt mit der Seite
            with Part('Schraegplatte', slope_frame(xm, s, 0.5), C_ROOM):
                slab('Platte', (0, 0, 0.02), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.45, 1.65, 0.05), M['i_kunst'], 0.02)
                slab('Griffmulde', (0.0, -0.45 * q, 0.046), (1, 0, 0), (0, 1, 0), (0.7, 0.12, 0.01), M['i_schwarz'], 0.005)
                text('%s %02d' % ('B' if s > 0 else 'S', i + 1), 0.26, (0.0, 0.05 * q, 0.047), (q, 0, 0), (0, q, 0), M['i_grau'], align='CENTER', name='Feldnummer')
                slab('Plattenlicht', (0.0, 0.62 * q, 0.046), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.8, 0.04, 0.008), M['i_licht'], 0)
            yw = s * (bay_w(xm) - 0.1); yt = s * (bay_w(xm) - SL * 0.55)
            for dx in (0.55, 0.75): pipe('Leitung', [Vector((xm + dx, yt, BZ - 0.55)), Vector((xm + dx, yw, ZW - 0.05)), Vector((xm + dx, yw, BF + 1.0))], 0.035, M['g_rot'], rad=0.18)
            slab('Leitungsanschluss', (xm + 0.65, s * (bay_w(xm) - 0.1), BF + 0.93), (1, 0, 0), (0, 1, 0), (0.5, 0.2, 0.18), M['mittel'], 0.02)
            for zz in (ZW - 0.3, BF + 2.0): slab('Leitungsschelle', (xm + 0.65, s * (bay_w(xm) - 0.06), zz), (1, 0, 0), (0, 1, 0), (0.5, 0.1, 0.07), M['mittel'], 0.01)
            with Part('Wandfeld', wall_mw(xm - 0.3, s, BF + 1.95), C_ROOM):
                slab('Feld', (0, 0, 0.01), (1, 0, 0), (0, 1, 0), (x1 - x0 - 1.4, 1.4, 0.03), M['i_kunst'], 0.015)
                slab('Feldfuge', (0, 0, 0.027), (1, 0, 0), (0, 1, 0), (x1 - x0 - 1.4, 0.015, 0.005), M['i_grau'], 0)
            for j in range(6): slab('Lueftungsschlitz', (x0 + 0.6 + j * 0.3, s * (bay_w(xm) - 0.025), BF + 0.55), (1, 0, 0), (0, 0, 1), (0.08, 0.3, 0.02), M['dunkel'], 0)
            if i % 2 == 1:
                with Part('Wandkasten', wall_mw(xm + 0.2, s, BF + 1.3, 0.04), C_ROOM):
                    slab('Kasten', (0, 0, 0.06), (1, 0, 0), (0, 1, 0), (0.9, 0.62, 0.12), M['i_schwarz'], 0.02)
                    slab('Kastenanzeige', (-0.15, 0.05, 0.125), (1, 0, 0), (0, 1, 0), (0.42, 0.32, 0.004), M['ui_text' if i % 4 == 1 else 'ui_gruen'], 0)
                    keys(T(0.32, 0.0, 0.122), 2, 5, 0.06, 0.06, 0.5, seed=60 + i)
            for yy in (1.7, 3.3):      # Deckenleuchtfelder zwischen den Rippen
                slab('Deckenleuchte', (xm, s * yy, BZ - 0.025), (1, 0, 0), (0, 1, 0), (x1 - x0 - 0.9, 0.5 if yy < 2 else 0.35, 0.03), M['i_licht'], 0)
        o = text('V', 0.0001, (0, 0, -100), (1, 0, 0), (0, 1, 0), M['i_grau'], name='Platzhalter') if False else None
    xe = ST_X0 + 0.8
    slab('Deckenmitte', ((BX0 + xe) / 2, 0, BZ - 0.07), (1, 0, 0), (0, 1, 0), (xe - BX0 - 0.6, 0.7, 0.06), M['i_kunst'], 0.01)
    slab('Deckenmittellicht', ((BX0 + xe) / 2, 0, BZ - 0.105), (1, 0, 0), (0, 1, 0), (xe - BX0 - 1.0, 0.08, 0.01), M['i_licht'], 0)
    stairs(); ramp_panel()
    for x in ribs[:-1]: area('Laderaumlicht', (x + 1.5, 0, BZ - 0.25), (0, 0, 0), 4.5, 2.4, 360, (0.92, 0.95, 1.0))
    # Boden: hellere Mittelbahn, Zurrschienen, Leuchtmarken paarweise, Randmarken, Pfeile und Schrift zur Rampe
    slab('Mittelbahn', ((BX0 + BX1) / 2, 0, BF + 0.006), (1, 0, 0), (0, 1, 0), (L - 0.4, 3.0, 0.012), M['i_grau'], 0.004)
    for k in range(int(L / 1.5)):
        x = BX0 + 0.75 + k * 1.5
        slab('Bahnfuge', (x, 0, BF + 0.013), (0, 1, 0), (1, 0, 0), (2.96, 0.02, 0.004), M['fuge'], 0)
        for s in (1, -1):
            for y in (2.3, 3.9, 5.3):
                if y > bay_w(x) - 0.5: continue
                for dx in (-0.12, 0.12): slab('Leuchtmarke', (x + dx, s * y, BF + 0.015), (1, 0, 0), (0, 1, 0), (0.12, 0.2, 0.01), M['i_boden_licht'], 0)
            slab('Randmarke', (x, s * 1.55, BF + 0.014), (1, 0, 0), (0, 1, 0), (0.7, 0.06, 0.004), M['i_kunst'], 0)
    for y in (-4.6, -1.9, 1.9, 4.6): slab('Zurrschiene', ((BX0 + 2 + BX1) / 2, y, BF + 0.012), (1, 0, 0), (0, 1, 0), (L - 3.0, 0.12, 0.024), M['mittel'], 0.004)
    for k in range(4):
        x = BX0 + 2.2 + k * 0.9
        prism('Bodenpfeil', [(x + 0.35, 0.0), (x - 0.15, 0.55), (x - 0.35, 0.55), (x + 0.12, 0.0), (x - 0.35, -0.55), (x - 0.15, -0.55)], BF + 0.012, BF + 0.018, M['i_kunst'], 'Z', 0)
    slab('Rampenwarnfeld innen', (BX0 + 0.5, 0, BF + 0.01), (1, 0, 0), (0, 1, 0), (0.6, 2 * (DOOR_Y - 0.3), 0.012), M['warnrw'], 0)
    o = text('LADEBUCHT 1', 0.55, (BX0 + 6.5, 0, BF + 0.016), (0, 1, 0), (-1, 0, 0), M['i_kunst'], align='CENTER', name='Bodenschrift')
    laderaum_details(ribs)
    # Stirnwand vorn: Tor mit Lichtrahmen, Leitstand mit Fenster darüber, Schrift
    W1 = bay_w(BX1)
    prism('Stirnwand', [(p[0], p[1]) for p in bay_profile(W1)], BX1 - 0.12, BX1, M['i_kunst'], 'X', 0.02)
    slab('Tor vorn', (BX1 - 0.14, 0, BF + 1.5), (0, 1, 0), (0, 0, 1), (3.2, 3.0, 0.06), M['i_schwarz'], 0.03)
    slab('Torfuge', (BX1 - 0.18, 0, BF + 1.5), (0, 0, 1), (0, 1, 0), (2.95, 0.03, 0.01), M['i_grau'], 0)
    pipe('Torlicht', [Vector((BX1 - 0.16, y, z)) for y, z in rrect_path(1.75, BF, BF + 3.15, 0.35)], 0.025, M['i_licht'])
    for s in (1, -1):
        slab('Leitstandfenster', (BX1 - 0.14, s * 3.6, BF + 3.4), (0, 1, 0), (0, 0, 1), (2.2, 0.9, 0.04), M['ui_blau'], 0.01)
        pipe('Fensterrahmen', [Vector((BX1 - 0.17, s * 3.6 + y, BF + 3.4 + z)) for y, z in [(-1.15, -0.5), (1.15, -0.5), (1.15, 0.5), (-1.15, 0.5)]], 0.05, M['i_grau'], cyclic=True)
        slab('Torwarnstreifen', (BX1 - 0.16, s * 1.95, BF + 1.5), (0, 0, 1), (0, 1, 0), (3.0, 0.2, 0.01), M['warnrw'], 0)
    o = text('LADEBUCHT 1  ·  WISENT', 0.32, (BX1 - 0.18, 0, BF + 3.55), (0, -1, 0), (0, 0, 1), M['g_rot'], align='CENTER', name='Stirnschrift')
    # Heckwand um die Öffnung, Lichtrahmen der Öffnung
    WB = bay_w(BX0); hp = hole_outline()
    for s in (1, -1):
        prism('Heckwand Seite', [(s * (DOOR_Y - 0.2), BF), (s * WB, BF), (s * WB, ZW), (s * (WB - 0.1), door_z1() - 0.2), (s * (DOOR_Y - 0.2), door_z1() - 0.2)], BX0, BX0 + 0.12, M['i_kunst'], 'X', 0.02)
        slab('Oeffnungslicht', (BX0 + 0.14, s * (DOOR_Y - 0.12), (BF + door_z1()) / 2), (0, 0, 1), (0, 1, 0), (door_z1() - BF - 1.2, 0.06, 0.02), M['i_licht'], 0)
    pipe('Oeffnungsrahmen', [Vector((BX0 + 0.1, y, z)) for y, z in hp if z > DOOR_Z0 + 0.6], 0.12, M['i_grau'])      # unten offen
    slab('Schwelle', (XE + 0.17, 0, BF + 0.02), (1, 0, 0), (0, 1, 0), (0.5, 2 * (DOOR_Y - 0.3), 0.04), M['mittel'], 0.01)
    cam('Laderaum', (4.2, -1.6, BF + 2.4), (-40.0, 0.6, BF + 2.0), 22); VIEWS['laderaum'] = ('Laderaum', 'wueste', False, 0.2, 0.0)
    cam('Treppe', (-8.0, -4.2, BF + 1.8), (4.0, 0.0, BF + 3.6), 24); VIEWS['treppe'] = ('Treppe', 'weltraum', False, 0.3, 0.0)
    cam('Laderaum2', (-37.5, 3.4, BF + 3.2), (2.0, -1.4, BF + 1.6), 20); VIEWS['laderaum2'] = ('Laderaum2', 'wueste', False, 0.2, 0.0)
    cam('Rampe', (-78.0, -26.0, 7.5), (-34.0, 0.0, 7.0), 32); VIEWS['rampe'] = ('Rampe', 'wueste', True, 0.0, 0.0)

def laderaum_details(ribs):
    # Seitenbahnen: schwere Platten 1,5 × 1,5 m (folgen der Breite, die zum Heck hin abnimmt), Mittelbahn: Bodenluken mit Rahmen
    SB, SW = Sammel('Laderaumdetail Boden', C_ROOM, 0.003), Sammel('Laderaumdetail Wand', C_ROOM)
    xa = BX0 + 0.85; n = int((BX1 - 0.2 - xa) / 1.5); px = (BX1 - 0.2 - xa) / n
    for i in range(n):
        x0, x1 = xa + i * px, xa + (i + 1) * px
        y1 = min(bay_w(x0), bay_w(x1)) - 0.45
        for s in (1, -1):
            ya, yb = (1.66, y1) if s > 0 else (-y1, -1.66)
            platten(SB, x0, x1, ya, yb, BF + 0.002, M['wb_platte'], M['wb_schacht'], M['mittel'], M['wb_platte2'], p=1.5, q=1.5, h=0.009, fuge=0.01)
        if i % 3 == 1 and x0 > BX0 + 8.0:      # Bodenluke in der Mittelbahn
            xm = (x0 + x1) / 2
            for sy in (-1, 1):
                SB.box(0.86, 0.02, 0.006, xm, sy * 0.42, BF + 0.015, M['wb_schacht'])
                SB.box(0.02, 0.86, 0.006, xm + sy * 0.42, 0, BF + 0.015, M['wb_schacht'])
                for sx in (-1, 1): SB.cyl(0.012, 0.005, (xm + sx * 0.36, sy * 0.36, BF + 0.0145), (0, 0, 1), M['mittel'], 6)
            SB.box(0.2, 0.05, 0.012, xm, 0.3, BF + 0.017, M['wb_stoss'])
    # Wände zwischen den Rippen (gerader Teil): Stoßblech unten mit Oberkante, Ankerschiene, Leitungsbündel oben mit Schellen
    for i in range(len(ribs) - 1):
        x0, x1 = ribs[i] + 0.25, ribs[i + 1] - 0.25
        if x0 < -35.0: continue
        for s in (1, -1):
            w = bay_w(x0); yf = s * (w - 0.012)
            SW.box(x1 - x0, 0.022, 0.34, (x0 + x1) / 2, yf, BF + 0.25, M['wb_stoss'])
            SW.box(x1 - x0, 0.035, 0.03, (x0 + x1) / 2, s * (w - 0.02), BF + 0.43, M['wb_stoss'])
            for k in range(int((x1 - x0) / 0.5)): SW.cyl(0.011, 0.006, ((x0 + 0.25 + k * 0.5), s * (w - 0.024), BF + 0.32), (0, -s, 0), M['mittel'], 6)
            zurrschiene(SW, x0, x1, (s * (w - 0.005), BF + 1.08), (0, -s, 0), M['mittel'], M['wb_schacht'], breite=0.07, dicke=0.018)
    for s in (1, -1):
        xs = [x for x in [BX0 + 0.6 + i * 0.75 for i in range(int((BX1 - BX0 - 1.0) / 0.75) + 1)]]
        for r, dz, dy, mm in ((0.05, 0.38, 0.16, 'wb_rohr1'), (0.032, 0.52, 0.26, 'wb_rohr2')):
            pipe('Laderaumleitung', [Vector((x, s * (bay_w(x) - dy - r), ZW - dz)) for x in xs], r, M[mm])
            for x in ribs: schelle(SW, (x + 0.3, s * (bay_w(x + 0.3) - dy - r), ZW - dz), (0, -s, 0), r, M['i_grau'])
    SB.fertig(); SW.fertig()

corridor(); cargo_bay()
for o in C_ROFF.all_objects: o.hide_render = True      # Grundzustand: Rampe zu (view() schaltet um)
