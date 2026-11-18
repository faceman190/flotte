# Wisent: Bewaffnung, Fahrwerk, Hubgitter, Rampe und Aufbauten (wird von wis_kit.py in build() geladen, gleiche Namen).
# Sechs Geschütztürme (zwei oben, zwei unten am Rumpf, zwei auf den Flügeln), Doppel-Drehkanone unter der Nase,
# 2 × 10 Senkrechtstartzellen auf den Flügeln, schweres Fahrwerk (Bug, Rumpfmitte, unter den Gondeln).

def wing_top(x, y):      # Höhe der Flügeloberseite bei (x, y)
    a = abs(y); u = (xle(a) - x) / (xle(a) - xte(a)); return wing_point(y, max(0.0, min(1.0, u)), True)
def barrel(name, a, d, L, r, m_jacket, m_tube):
    b = a + d * L
    rod(name + ' Mantel', a, a + d * L * 0.32, r * 1.65, M[m_jacket], 24)
    rod(name + ' Rohr', a + d * L * 0.3, b, r, M[m_tube], 20)
    for k in range(4): rod(name + ' Kuehlring', a + d * L * (0.36 + k * 0.05), a + d * L * (0.38 + k * 0.05), r * 1.3, M['mittel'], 20)
    rod(name + ' Muendungsbremse', b - d * 0.05, b + d * r * 4.5, r * 1.45, M['g_schwarz'], 8)
    for k in range(3): rod(name + ' Bremsschlitz', b + d * r * (1.0 + k * 1.1), b + d * r * (1.4 + k * 1.1), r * 1.5, M['fuge'], 8)
def turret(name, mw, sc=1.0, nb=2, L=7.0, r=0.17):
    with Part(name, mw, C_WPN) as e:
        cyl('Drehkranz', 1.75 * sc, 0.32 * sc, 0, 0, 0.16 * sc, M['g_grau'], 'Z', n=48)
        ring('Kranzring', 1.78 * sc, 0.035 * sc, (0, 0, 0.3 * sc), (0, 0, 1), M['g_rot'], 48)
        for k in range(24):
            a = 2 * PI * k / 24; sphere('Kranzschraube', 0.05 * sc, math.cos(a) * 1.62 * sc, math.sin(a) * 1.62 * sc, 0.33 * sc, M['steel'], 6)
        out = fillet([(2.3, 0.0), (1.7, 1.35), (-1.3, 1.5), (-2.1, 0.8), (-2.1, 0.0)], 0.35 * sc, 6)
        prism('Turmgehaeuse', [(p[0] * sc, p[1] * sc + 0.32 * sc) for p in out], -1.35 * sc, 1.35 * sc, M['g_graphit'], 'Y', 0.05)
        for sg in (1, -1):
            slab('Seitenpanzer', (-0.1 * sc, sg * 1.42 * sc, 0.95 * sc), (1, 0, 0), (0, 0, 1), (3.2 * sc, 1.0 * sc, 0.12 * sc), M['g_grau'], 0.03)
            slab('Panzerstreifen', (-0.1 * sc, sg * 1.49 * sc, 1.25 * sc), (1, 0, 0), (0, 0, 1), (3.0 * sc, 0.1 * sc, 0.02 * sc), M['g_rot'], 0)
            for k in range(4): sphere('Panzerbolzen', 0.06 * sc, (-1.3 + k * 0.85) * sc, sg * 1.5 * sc, 0.62 * sc, M['steel'], 8)
        slab('Blende', (2.2 * sc, 0, 0.98 * sc), (1, 0, 0), (0, 1, 0), (0.5 * sc, 2.3 * sc, 1.05 * sc), M['g_schwarz'], 0.06)
        slab('Sensorkopf', (0.3 * sc, -0.75 * sc, 1.98 * sc), (1, 0, 0), (0, 1, 0), (0.9 * sc, 0.5 * sc, 0.4 * sc), M['g_grau'], 0.04)
        slab('Sensorlinse', (0.76 * sc, -0.75 * sc, 1.98 * sc), (1, 0, 0), (0, 1, 0), (0.02, 0.34 * sc, 0.22 * sc), M['e_teal'], 0)
        slab('Lukendeckel', (-0.9 * sc, 0.45 * sc, 1.86 * sc), (1, 0, 0), (0, 1, 0), (0.9 * sc, 0.8 * sc, 0.08 * sc), M['g_grau'], 0.03)
        for k in range(nb):
            y = (k - (nb - 1) / 2) * 0.95 * sc
            barrel('Kanone', Vector((2.4 * sc, y, 0.98 * sc)), Vector((1, 0, 0)), L * sc, r * sc, 'g_grau', 'mittel')
    return e
def chin_gun():      # Doppel-Drehkanone in einer Kinnkuppel unter der Nase
    x = 33.0; zb = params(x)[2]
    with Part('Kinnkanone', T(x, 0, zb + 0.1), C_WPN):
        sphere('Kinnkuppel', 1.15, 0, 0, -0.2, M['g_graphit'], 32)
        cyl('Kuppelkranz', 1.2, 0.2, 0, 0, 0.05, M['g_grau'], 'Z', n=40)
        for sg in (1, -1):
            with Part('Drehkanone', T(0.4, sg * 0.5, -0.75), C_WPN):
                cyl('Gehaeuse', 0.32, 1.4, 0.6, 0, 0, M['g_schwarz'], 'X', n=24)
                for k in range(6):
                    a = 2 * PI * k / 6; rod('Lauf', Vector((1.2, math.cos(a) * 0.16, math.sin(a) * 0.16)), Vector((3.6, math.cos(a) * 0.16, math.sin(a) * 0.16)), 0.045, M['mittel'], 10)
                for xx in (2.0, 3.0): cyl('Laufklammer', 0.24, 0.1, xx, 0, 0, M['g_grau'], 'X', n=20)
                cyl('Muendungsring', 0.25, 0.14, 3.55, 0, 0, M['g_schwarz'], 'X', n=20)
    ANCH['kinn'] = Vector((x + 3.6, 0, zb - 0.7))
def vls():      # Senkrechtstartzellen: 2 × 5 Deckel je Flügel, Rahmen, Abgasschlitze, rote Pfeile
    for s in (1, -1):
        for i in range(5):
            for j in range(2):
                y = s * (20.2 + j * 1.9); x = xle(abs(y)) - 5.8 - i * 1.9
                p = wing_top(x, y); mw = onsurf(x, y, 1)
                with Part('Startzelle', mw, C_WPN):
                    slab('Zellenrahmen', (0, 0, 0.03), (1, 0, 0), (0, 1, 0), (1.75, 1.75, 0.08), M['g_schwarz'], 0.02)
                    slab('Zellendeckel', (0.05, 0, 0.09), (1, 0, 0), (0, 1, 0), (1.45, 1.45, 0.06), M['vls'], 0.02)
                    slab('Deckelfuge', (0.05, 0, 0.125), (1, 0, 0), (0, 1, 0), (1.45, 0.02, 0.01), M['fuge'], 0)
                    slab('Abgasschlitz', (-0.83, 0, 0.09), (1, 0, 0), (0, 1, 0), (0.08, 1.4, 0.03), M['dunkel'], 0)
                    prism('Pfeil', [(0.45, 0), (0.15, 0.16), (0.15, 0.06), (-0.3, 0.06), (-0.3, -0.06), (0.15, -0.06), (0.15, -0.16)], 0.125, 0.13, M['g_rot'], 'Z', 0)
        a = wing_top(xle(21.1) - 2.5, s * 21.1); ANCH['vls%d' % s] = a
def heavy_gear(name, x, y, ztop, sc=1.0, door_w=2.2):
    with Part(name, T(x, y, 0), C_GEAR):
        for sg in (1, -1):      # Schachtklappen offen
            slab('Schachtklappe', (0, sg * (door_w / 2 + 0.05), ztop - 0.7 * sc), (1, 0, 0), (0, 0, 1), (3.0 * sc, 1.4 * sc, 0.08), M['g_graphit'], 0.02)
        slab('Schachtrand', (0, 0, ztop - 0.02), (1, 0, 0), (0, 1, 0), (3.2 * sc, door_w + 0.2, 0.12), M['dunkel'], 0.01)
        cyl('Federbein', 0.42 * sc, ztop - 1.9 * sc, 0, 0, (ztop + 1.9 * sc) / 2, M['mittel'], 'Z', n=28)
        cyl('Kragen', 0.52 * sc, 0.22 * sc, 0, 0, 1.95 * sc, M['g_schwarz'], 'Z', n=28)
        cyl('Kolbenstange', 0.28 * sc, 1.25 * sc, 0, 0, 1.35 * sc, M['chrom'], 'Z', n=24)
        slab('Gelenkkopf', (0, 0, 0.72 * sc), (1, 0, 0), (0, 1, 0), (0.9 * sc, 0.75 * sc, 0.5 * sc), M['mittel'], 0.05)
        prism('Landeteller', [(p[0] * sc, p[1] * sc) for p in chamfer_rect(2.6, 2.0, 0.55)], 0.14 * sc, 0.44 * sc, M['mittel'], 'Z', 0.04)
        for sx in (1, -1):
            for sy in (1, -1): cyl('Gummifuss', 0.32 * sc, 0.14 * sc, sx * 0.85 * sc, sy * 0.6 * sc, 0.07 * sc, M['rubber'], 'Z', n=16)
        for sg in (1, -1):      # Scherenlenker vorn, Stützstreben seitlich
            link_bar('Scherenlenker', (0.5 * sc, 0, 1.0 * sc), (0.62 * sc, 0, 1.75 * sc), 0.16 * sc, 0.1 * sc, (0, 1, 0), M['mittel'])
            rod('Stuetzstrebe', Vector((0, sg * 1.1 * door_w / 2.2, ztop - 0.15)), Vector((0, sg * 0.3 * sc, 2.4 * sc)), 0.12 * sc, M['mittel'], 14)
        pipe('Hydraulikleitung', [Vector((-0.4 * sc, 0.3 * sc, ztop - 0.1)), Vector((-0.5 * sc, 0.35 * sc, 2.6 * sc)), Vector((-0.38 * sc, 0.3 * sc, 1.6 * sc))], 0.04 * sc, M['rubber'], rad=0.2)
        pipe('Hydraulikleitung', [Vector((-0.4 * sc, -0.3 * sc, ztop - 0.1)), Vector((-0.5 * sc, -0.35 * sc, 2.4 * sc)), Vector((-0.38 * sc, -0.3 * sc, 1.4 * sc))], 0.035 * sc, M['g_rot'], rad=0.2)
        sphere('Fahrwerkslicht', 0.09 * sc, 0.45 * sc, 0, ztop - 0.35, M['blitz'], 10)
def gear_all():
    zb = params(29.5)[2]
    for s in (1, -1): heavy_gear('Bugfahrwerk', 29.5, s * 0.95, zb, 0.85, 1.6)
    for s in (1, -1):
        heavy_gear('Mittelfahrwerk', -11.0, s * 3.4, params(-11.0)[2], 1.0)
        for x in (-3.0, -21.0): heavy_gear('Gondelfahrwerk', x, s * NY, NZ - NH * _NS(x), 1.0)
    ANCH['fahrwerk'] = Vector((-3.0, NY, 1.5))
def lift_grilles():      # Hubgitter unter Rumpf und Gondeln (Senkrechtstart)
    for x, y in ((8.0, 3.6), (-27.0, 3.4)):
        for s in (1, -1): grille('Hubgitter', x, s * y, 3.2, 2.2, -1, 14)
    for x in (-8.0, -15.0):
        for s in (1, -1): grille('Hubgitter Gondel', x, s * NY, 3.0, 2.6, -1, 12)
def ramp_outline():      # Heckklappe mit Rampe in der Heckplatte: Rahmen, Fuge zwischen Tor oben und Rampe unten, Scharniere, Warnfelder, Lichter
    y0, z0, z1 = DOOR_Y, DOOR_Z0, door_z1(); zm = z0 + 3.0
    out = fillet([(-y0, z0), (y0, z0), (y0, z1), (-y0, z1)], 0.9, 10)
    with Part('Heckklappe', T(XE - 0.02, 0, 0), C_PART):
        pipe('Klappenrahmen', [Vector((0, p[0], p[1])) for p in out if p[1] > z0 + 0.45], 0.12, M['g_schwarz'])      # unten offen (Schwelle frei begehbar)
        for sg in (1, -1):
            sphere('Hecklicht', 0.16, -0.1, sg * (y0 + 0.45), z1 - 0.4, M['nav_r'], 12)
            slab('Lichtleiste', (-0.08, sg * (y0 + 0.45), zm), (0, 0, 1), (0, 1, 0), (2.8, 0.12, 0.04), M['e_white'], 0)
            for k in range(3): slab('Torbeschlag', (-0.1, sg * (y0 - 0.6), z1 - 1.2 - k * 1.0), (0, 1, 0), (0, 0, 1), (0.5, 0.25, 0.12), M['mittel'], 0.02)
    ANCH['rampe'] = Vector((XE, 0, zm)); return

    xs = [-29.0 + i * (-10.5 / 30) for i in range(31)]
    for s in (1, -1):
        path = [(x, s * (PI - 0.62)) for x in xs]
        hull_band('Rampenfuge', path, 0.05, 0.03, M['g_schwarz'], False, 0.003)
    for x in (-29.0, -39.5):
        hull_band('Rampenfuge', [(x, PI - 0.62 + i * (2 * 0.62) / 30) for i in range(31)], 0.05, 0.03, M['g_schwarz'], False, 0.003)
    hull_band('Rampenscharnier', [(-29.2, PI - 0.6 + i * (1.2) / 30) for i in range(31)], 0.14, 0.09, M['mittel'], False, 0.004)
    for s in (1, -1):
        hull_band('Rampenwarnstreifen', [(x, s * (PI - 0.52)) for x in xs[2:-2]], 0.12, 0.012, M['warnrw'], False, 0.004)
    ANCH['rampe'] = hull_point(-35.0, PI)
def top_gear():      # Aufbauten oben: Wärmetauscher mit Lamellen, Sensorkuppel, Antennen, Haltegriffe
    for s in (1, -1):
        for k in range(10):
            x = -2.0 - k * 0.8
            with Part('Kuehllamelle', place(x, s * 0.55), C_PART):
                slab('Lamelle', (0, 0, 0.12), (1, 0, 0), (0, 1, 0), (0.45, 2.2, 0.05), M['mittel'], 0.01)
        hull_band('Kuehlerrahmen', [(x, s * t) for x, t in [(-1.4, 0.3), (-1.4, 0.82), (-9.9, 0.82), (-9.9, 0.3), (-1.4, 0.3)]], 0.08, 0.06, M['g_schwarz'], False, 0.004)
    zt = params(18.0)[1]
    with Part('Sensorkuppel', T(18.0, 0, zt - 0.05), C_PART):
        cyl('Kuppelsockel', 0.9, 0.3, 0, 0, 0.15, M['g_grau'], 'Z', n=40); sphere('Kuppel', 0.75, 0, 0, 0.3, M['rauchglas'], 32)
        ring('Kuppelring', 0.78, 0.04, (0, 0, 0.3), (0, 0, 1), M['g_rot'], 40)
    for x, h in ((14.0, 1.4), (-14.0, 2.0), (-16.0, 1.2)):
        with Part('Klingenantenne', place(x, 0.0), C_PART):
            out = fillet([(0.6, 0.0), (-0.1, h), (-0.5, h), (-0.5, 0.0)], 0.15, 6)
            prism('Antenne', [(p[0], p[1]) for p in out], -0.04, 0.04, M['g_schwarz'], 'Y', 0.01)
    for s in (1, -1):
        for x in (20.0, 10.0, 0.0, -10.0, -20.0):
            with Part('Haltegriff', place(x, s * 0.35), C_PART):
                pipe('Griff', [Vector((-0.4, 0, 0)), Vector((-0.4, 0, 0.12)), Vector((0.4, 0, 0.12)), Vector((0.4, 0, 0))], 0.025, M['warnrw'], rad=0.05)
def weapons_all():
    # oben vorn (groß) und oben hinten (nach achtern), unten vorn und unten hinten, zwei auf den Flügeln
    turret('Turm oben vorn', T(5.0, 0, params(5.0)[1] - 0.12), 1.25, 2, 7.5)
    turret('Turm oben hinten', T(-25.0, 0, params(-25.0)[1] - 0.12) @ RZ(PI), 1.0, 2, 6.5)
    turret('Turm unten vorn', T(16.0, 0, params(16.0)[2] + 0.1) @ RX(PI), 1.05, 2, 6.5)
    turret('Turm unten hinten', T(-19.0, 0, params(-19.0)[2] + 0.1) @ RX(PI) @ RZ(PI), 1.0, 2, 6.0)
    for s in (1, -1):
        x = xle(10.5) - 7.5; p = wing_top(x, s * 10.5)
        turret('Fluegelturm', T(x, s * 10.5, p.z - 0.08), 0.85, 2, 6.0)
    chin_gun(); vls()
    ANCH['turm'] = Vector((5.0 + 2.4 * 1.25 + 4, 0.6, params(5.0)[1] + 1.2))

weapons_all(); gear_all(); lift_grilles(); ramp_outline(); top_gear()
