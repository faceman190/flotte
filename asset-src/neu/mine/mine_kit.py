# Minen-Module mit dem Baukasten (asset-src/neu/baukasten/kit_lib.py): Ausbau, Gleise, Leitungen, Lampen, Tresortor, Schalter, Förderkorb,
# Förderwagen, Kisten mit Deckel, Stolleneingang mit Förderturm. Läuft in Mine.blend: build(lib) baut jedes Modul als eigenes Objekt
# (Sammlung 'mine_kit'), export(lib) schreibt alle in asset-src/glb/station/Mine_Kit.glb (Knoten mit den Namen unten).
#
# Blender-Achsen: Gänge laufen entlang X, Y ist quer (im Spiel -Z), Z oben. Ursprung jedes Moduls: Mitte am Boden (Lampe: Aufhängepunkt;
# Deckel: Scharnier). Kachel im Spiel 3,2 m, Ganghöhe 3,0 m (Ausbau wird im Spiel auf die Deckenhöhe gestreckt).
import math

TS = 3.2
WOOD = (0.11, 0.065, 0.035)       # Holz (linear)
OLIVE = (0.075, 0.085, 0.05)

def stuetze(lib):
    """Türstock: zwei Stahlstempel, Kappe, Knaggen, Verzug aus Holzbohlen auf der Kappe."""
    K = lib.Kit('stuetze', 3); X, Y, Z = lib.X, lib.Y, lib.Z
    H, W = 2.62, 1.16
    for s in (-1, 1):
        K.box((0.2, 0.2, H), (0, s * W, 0), side='girder', tint='rust', bevel=0.02, along='z')
        K.box((0.36, 0.36, 0.05), (0, s * W, 0), side='plain', tint='hull_dark', bevel=0.01)
        K.box((0.21, 0.02, 0.5), (0, s * W - s * 0.105, 0.05), side='hazard', tint='none', bevel=0.0, along='z')
        K.beam((0, s * W, H - 0.55), (0, s * (W - 0.5), H - 0.06), 0.14, 0.14, 'girder', 'rust', 0.015)        # Knagge
        for k in (-1, 1): K.box((0.05, 0.05, 0.06), (k * 0.07, s * W - s * 0.105, 1.2), side='plain', tint='steel', bevel=0.01)
    K.beam((0, -W - 0.15, H + 0.1), (0, W + 0.15, H + 0.1), 0.22, 0.2, 'girder', 'rust', 0.02)               # Kappe
    for k in range(-2, 3):
        K.box((0.24, 2.9, 0.07), (k * 0.27, 0, H + 0.2), side='plain', tint=WOOD, bevel=0.012)                  # Verzug
    K.decal('rust1', (0, -W - 0.101, 1.6), -Y, Z, 0.25, 1.2, off=0.004); K.decal('rust2', (0, W + 0.101, 1.0), Y, Z, 0.25, 1.4, off=0.004)
    return K.build('mine_kit')

def gleis(lib):
    """Gleisstück 3,2 m: Schwellen und zwei Schienen."""
    K = lib.Kit('gleis', 4)
    for i in range(5):
        K.box((0.22, 1.1, 0.1), (-1.28 + i * 0.64, 0, -0.03), side='plain', tint=WOOD, bevel=0.015, rz=0.03 * (i % 3 - 1))
    for s in (-1, 1):
        K.box((TS, 0.06, 0.03), (0, s * 0.3, 0.07), side='plain', tint='steel', bevel=0.005, bottom=True)
        K.box((TS, 0.03, 0.07), (0, s * 0.3, 0.07), side='plain', tint='steel', bevel=0.004, bottom=True)
        K.box((TS, 0.07, 0.025), (0, s * 0.3, 0.14), side='plain', tint=(0.32, 0.33, 0.34), bevel=0.006, bottom=True)
    return K.build('mine_kit')

def leitung(lib):
    """Wandleitung 3,2 m (oben rechts an der Gangwand, Ursprung am Boden in der Gangmitte): Wetterlutte, Kabelpritsche, Wasserrohr."""
    K = lib.Kit('leitung', 5); X, Y, Z = lib.X, lib.Y, lib.Z
    y, z = 1.05, 2.25
    K.tube((-TS / 2, y, z + 0.1), (TS / 2, y, z + 0.1), 0.24, 'hose', 'yellow', 16, caps=False)                  # Lutte
    for x in (-1.2, 0.4):
        K.tube((x, y, z + 0.33), (x, y, z + 0.6), 0.012, 'plain', 'steel', 6)
        K.tube((x - 0.03, y, z + 0.1), (x + 0.03, y, z + 0.1), 0.255, 'plain', 'hull_dark', 16)
    for x in (-1.0, 0.6):                                                                                        # Konsolen
        K.box((0.06, 0.34, 0.05), (x, y - 0.05, z - 0.28), side='girder', tint='hull_dark', bevel=0.008, bottom=True)
    K.box((TS, 0.3, 0.03), (0, y - 0.07, z - 0.24), side='floor', tint='hull_mid', bevel=0.004, bottom=True)
    for k, c in enumerate(('black', 'orange', 'black')):
        K.tube((-TS / 2, y - 0.16 + k * 0.09, z - 0.18), (TS / 2, y - 0.16 + k * 0.09, z - 0.18), 0.026, 'hose', c, 8, caps=False)
    K.pipe([(-TS / 2, y + 0.02, z - 0.55), (TS / 2, y + 0.02, z - 0.55)], 0.06, 'blue', True, 10)
    return K.build('mine_kit')

def lampe(lib):
    """Grubenlampe im Korb, an Kette (Ursprung am Aufhängepunkt, hängt 0,62 m nach unten)."""
    K = lib.Kit('lampe', 6); X, Y, Z = lib.X, lib.Y, lib.Z
    for i in range(5): K.tube((0, 0, -i * 0.06), (0, 0, -i * 0.06 - 0.05), 0.012, 'plain', 'steel', 6)
    K.tube((0, 0, -0.30), (0, 0, -0.36), 0.12, 'plain', 'hull_dark', 14, r2=0.1)
    K.tube((0, 0, -0.36), (0, 0, -0.38), 0.13, 'plain', 'yellow', 14)
    K.glowbox('lamp', (0.13, 0.13, 0.17), (0, 0, -0.475))
    for a in range(6):
        t = a / 6 * math.tau
        K.tube((math.cos(t) * 0.12, math.sin(t) * 0.12, -0.38), (math.cos(t) * 0.12, math.sin(t) * 0.12, -0.6), 0.008, 'plain', 'hull_dark', 5)
    for z in (-0.47, -0.6): K.tube((0, 0, z - 0.008), (0, 0, z + 0.008), 0.125, 'plain', 'hull_dark', 14, caps=False)
    K.light('lamp', (0, 0, -0.48), 1.6)
    return K.build('mine_kit')

def tor(lib):
    """Tresortor: schwerer Stahlrahmen (Öffnung 2,4 × 2,5 m), Torblatt als eigenes Objekt 'tor_blatt' (Ursprung unten Mitte, fährt nach oben)."""
    K = lib.Kit('tor', 7); X, Y, Z = lib.X, lib.Y, lib.Z
    W, H, D = 2.4, 2.5, 0.5
    for s in (-1, 1):
        K.box((0.4, D, 3.0), (s * (W / 2 + 0.2), 0, 0), side='girder', tint='hull_mid', bevel=0.04, along='z')
        K.box((0.08, D + 0.06, H), (s * (W / 2 + 0.04), 0, 0), side='hazard', tint='none', bevel=0.01, along='z')
        K.box((0.12, 0.3, 0.3), (s * (W / 2 + 0.2), -D / 2 - 0.15, 1.1), side='plain', tint='hull_dark', bevel=0.02)
    K.box((W + 0.8, D, 0.5), (0, 0, H), side='beam', tint='hull_mid', bevel=0.04)
    K.box((W + 0.8, D + 0.1, 0.12), (0, 0, H + 0.5), side='plain', tint='hull_dark', bevel=0.02)
    K.box((W, D, 0.06), (0, 0, 0), side='hazard', tint='none', bevel=0.005)
    K.decal('w_kein_zutritt', (0, -D / 2, H + 0.25), X, Z, 1.9, off=0.012)
    for s, kind in ((-1, 'redlamp'), (1, 'green')):
        K.glowbox(kind, (0.12, 0.08, 0.12), (s * 0.9, -D / 2 - 0.05, H + 0.25)); K.light(kind, (s * 0.9, -D / 2 - 0.06, H + 0.25), 0.8)
    K.pipe([(W / 2 + 0.35, -D / 2 - 0.1, 0.2), (W / 2 + 0.35, -D / 2 - 0.1, 2.75), (-W / 2 - 0.35, -D / 2 - 0.1, 2.75)], 0.05, 'steel', False, 8)
    ob = K.build('mine_kit')
    B = lib.Kit('tor_blatt', 8)
    B.box((W - 0.02, 0.18, H - 0.02), (0, 0, 0), side='plain', tint='hull', bevel=0.03, bottom=True)
    for z in (0.35, 1.25, 2.15): B.box((W - 0.12, 0.24, 0.16), (0, 0, z), side='girder', tint='hull_mid', bevel=0.02, bottom=True)
    for s in (-1, 1): B.box((0.16, 0.24, H - 0.12), (s * (W / 2 - 0.12), 0, 0.06), side='girder', tint='hull_mid', bevel=0.02, along='z', bottom=True)
    B.box((W - 0.4, 0.2, 0.25), (0, 0, 0.02), side='hazard', tint='none', bevel=0.01, bottom=True)
    B.number('03', (0, -0.121, 1.7), X, Z, 0.42, 'white', 0.004)
    B.decal('warn', (0, -0.121, 0.85), X, Z, 0.5, off=0.004); B.decal('scuff', (0.5, -0.121, 0.6), X, Z, 0.9, 0.6, off=0.005)
    B.decal('rust2', (-0.7, -0.121, 1.2), X, Z, 0.4, 1.4, off=0.005)
    bl = B.build('mine_kit')
    return ob, bl

def schalter(lib):
    """Schaltkasten an der Wand (Rückseite an der Wand, zeigt nach -Y). Hebel als eigenes Objekt 'hebel' (Drehpunkt im Ursprung, Achse X)."""
    K = lib.Kit('schalter', 9); X, Y, Z = lib.X, lib.Y, lib.Z
    K.box((0.7, 0.24, 0.9), (0, -0.12, 0.8), side='plain', tint='olive', bevel=0.03, bottom=True)
    K.box((0.6, 0.02, 0.8), (0, -0.245, 0.85), side='plain', tint='hull_mid', bevel=0.01, bottom=True)
    K.glow('screen', (-0.12, -0.258, 1.42), X, Z, 0.26, 0.14)
    K.decal('volt', (0.18, -0.258, 1.42), X, Z, 0.16, off=0.003); K.decal('w_technik', (0, -0.258, 1.05), X, Z, 0.5, off=0.003)
    K.box((0.12, 0.12, 0.1), (0.0, -0.3, 1.1 - 0.35), side='plain', tint='hull_dark', bevel=0.015, bottom=True)
    K.tube((0.25, -0.12, 1.7), (0.25, -0.12, 3.0), 0.04, 'pipe', 'steel', 8)
    K.box((0.04, 0.05, 1.6), (-0.4, -0.03, 0.0), side='plain', tint='hull_dark', bevel=0.005, along='z', bottom=True)
    K.decal('stain1', (0, -0.258, 0.95), X, Z, 0.6, 0.5, off=0.004)
    ob = K.build('mine_kit')
    L = lib.Kit('hebel', 10)
    L.tube((-0.09, 0, 0), (0.09, 0, 0), 0.045, 'plain', 'hull_dark', 12)
    L.beam((0, 0, 0), (0, -0.05, 0.32), 0.04, 0.04, 'plain', 'steel', 0.006)
    L.tube((-0.07, -0.05, 0.33), (0.07, -0.05, 0.33), 0.03, 'hose', 'red', 10)
    lv = L.build('mine_kit')
    return ob, lv

def korb(lib):
    """Förderkorb am Startpunkt: Stahlrahmen 2,6 × 2,6 m, Gitter an drei Seiten, offen nach -Y, Schild und Lampe."""
    K = lib.Kit('korb', 11); X, Y, Z = lib.X, lib.Y, lib.Z
    S, H = 2.6, 3.0
    K.box((S, S, 0.12), (0, 0, 0), side='girder', top='floor', tint='hull_dark', bevel=0.02)
    for sx in (-1, 1):
        for sy in (-1, 1): K.box((0.14, 0.14, H), (sx * S / 2, sy * S / 2, 0), side='girder', tint='yellow', bevel=0.02, along='z')
    K.ring(S, S, H - 0.14, 0.14, 0.16, 'girder', 'yellow', 0.02)
    for side, (u, n, c) in enumerate(((X, Y, (0, S / 2, 0)), (Y, X, (S / 2, 0, 0)), (-Y, -X, (-S / 2, 0, 0)))):
        for i in range(1, 9):
            p = lib.Vector(c) + u * (-S / 2 + i * S / 9)
            K.tube(p + Z * 0.12, p + Z * (H - 0.14), 0.014, 'plain', 'hull_dark', 5, caps=False)
        for z in (1.1, 2.0): K.tube(lib.Vector(c) - u * S / 2 + Z * z, lib.Vector(c) + u * S / 2 + Z * z, 0.03, 'plain', 'yellow', 6)
    for sx in (-1, 1): K.tube((sx * S / 2, -S / 2, 1.05), (sx * 0.3, -S / 2, 1.05), 0.035, 'plain', 'red', 6)   # Kette/Absperrung offen
    K.box((0.5, 0.5, 0.6), (0, 0, H), side='plain', tint='hull_mid', bevel=0.03)
    for s in (-1, 1): K.tube((s * 0.15, 0, H + 0.6), (s * 0.15, 0, H + 5.0), 0.03, 'plain', 'steel', 6)               # Förderseile
    K.box((1.6, 0.06, 0.5), (0, -S / 2 - 0.05, H - 0.65), side='plain', tint='hull_dark', bevel=0.01, bottom=True)
    K.decal('w_zugang', (0, -S / 2 - 0.085, H - 0.4), X, Z, 1.5, off=0.004)
    K.glowbox('lamp', (0.2, 0.1, 0.1), (0, -S / 2 + 0.1, H - 0.25)); K.light('lamp', (0, -S / 2 + 0.05, H - 0.25), 1.6)
    K.box((0.3, 0.12, 0.45), (S / 2 - 0.25, -S / 2 + 0.1, 1.1), side='plain', tint='hull_light', bevel=0.02, bottom=True)
    K.glow('green', (S / 2 - 0.25, -S / 2 + 0.035, 1.42), X, Z, 0.08, 0.06)
    return K.build('mine_kit')

def wagen(lib):
    """Förderwagen (Hunt) mit Erzladung, fährt entlang X."""
    K = lib.Kit('wagen', 12); X, Y, Z = lib.X, lib.Y, lib.Z
    K.box((1.5, 0.86, 0.12), (0, 0, 0.26), side='girder', tint='hull_dark', bevel=0.02, bottom=True)
    K.prism([(-0.75, 0.0), (0.75, 0.0), (0.88, 0.75), (-0.88, 0.75)], -0.45, 0.45, side='plain', top='plain', tint='rust', cap_strip='plain', caps=(True, True)) if False else None
    for s in (-1, 1):
        K.box((1.7, 0.06, 0.72), (0, s * 0.45, 0.36), side='plain', tint='rust', bevel=0.02, bottom=True)
        for x in (-0.55, 0, 0.55): K.box((0.06, 0.08, 0.72), (x, s * 0.47, 0.36), side='plain', tint='hull_dark', bevel=0.01, bottom=True)
    for s in (-1, 1): K.box((0.06, 0.9, 0.72), (s * 0.82, 0, 0.36), side='plain', tint='rust', bevel=0.02, bottom=True)
    K.box((1.62, 0.84, 0.05), (0, 0, 0.36), side='plain', tint='rust', bevel=0.01, bottom=True)
    # Ladung: Erzbrocken
    import random
    R = random.Random(4)
    for i in range(14):
        sz = 0.18 + R.random() * 0.16
        K.box((sz, sz * 0.9, sz * 0.8), (R.uniform(-0.6, 0.6), R.uniform(-0.28, 0.28), 0.8 + R.random() * 0.14), side='plain', tint=(0.05, 0.048, 0.045), bevel=0.04,
              rot=lib.Matrix.Rotation(R.random() * 3, 4, 'Z') @ lib.Matrix.Rotation(R.random() * 0.8, 4, 'X'))
    for x in (-0.48, 0.48):
        for s in (-1, 1):
            K.tube((x, s * 0.3, 0.17), (x, s * 0.36, 0.17), 0.15, 'plain', 'hull_dark', 14)
            K.tube((x, s * 0.36, 0.17), (x, s * 0.4, 0.17), 0.1, 'plain', 'steel', 10)
    for s in (-1, 1): K.box((0.18, 0.12, 0.1), (s * 0.95, 0, 0.24), side='plain', tint='hull_dark', bevel=0.015)
    K.number('17', (0, -0.48, 0.7), X, Z, 0.22, 'white', 0.004)
    return K.build('mine_kit')

def kisten(lib):
    """Beutekiste, Tresorkiste, Verbandskasten: Körper und Deckel getrennt (Deckel-Ursprung an der hinteren Oberkante, öffnet um X)."""
    X, Y, Z = lib.X, lib.Y, lib.Z
    out = []
    for name, (sx, sy, sz), tint, edge, label in (('kiste', (0.9, 0.6, 0.46), OLIVE, 'hull_dark', 'warn'),
                                                  ('tresorkiste', (1.3, 0.85, 0.62), 'hull_mid', 'yellow', 'w_achtung'),
                                                  ('sanikiste', (0.7, 0.42, 0.36), 'white', 'hull_mid', 'cross')):
        K = lib.Kit(name, 13)
        lid_h = sz * 0.22; bh = sz - lid_h
        K.box((sx, sy, bh), (0, 0, 0), side='plain', tint=tint, bevel=0.03, bottom=True)
        K.tile('crate', (0, -sy / 2, bh / 2), X, Z, sx - 0.08, bh - 0.06, tint, off=0.003)
        K.tile('crate', (0, sy / 2, bh / 2), -X, Z, sx - 0.08, bh - 0.06, tint, off=0.003)
        for s in (-1, 1):
            K.tile('crate', (s * sx / 2, 0, bh / 2), Y * s, Z, sy - 0.06, bh - 0.06, tint, off=0.003)
            K.box((0.06, sy + 0.02, bh + 0.01), (s * (sx / 2 - 0.08), 0, 0), side='plain', tint=edge, bevel=0.012, bottom=True)   # Kantenschutz
            K.tube((s * (sx / 2 + 0.005), -0.12, bh * 0.62), (s * (sx / 2 + 0.005), 0.12, bh * 0.62), 0.016, 'plain', 'hull_dark', 8)   # Griff
            for y in (-0.13, 0.13): K.box((0.03, 0.03, 0.06), (s * (sx / 2 + 0.005), y, bh * 0.62 - 0.03), side='plain', tint='hull_dark', bevel=0.005, bottom=True)
        for x in (-sx * 0.3, sx * 0.3):                                                                                 # Verschlüsse vorn
            K.box((0.07, 0.03, 0.09), (x, -sy / 2 - 0.012, bh - 0.09), side='plain', tint='steel', bevel=0.008, bottom=True)
        K.decal(label, (0, -sy / 2 - 0.004, bh * 0.45), X, Z, min(0.34, sx * 0.4), off=0.004)
        K.decal('scuff', (sx * 0.2, -sy / 2 - 0.004, bh * 0.3), X, Z, sx * 0.5, bh * 0.5, off=0.005)
        body = K.build('mine_kit')
        # Deckel: Ursprung am Scharnier (hinten oben), im Spiel bei z = bh, y = +sy/2
        D = lib.Kit(name + '_deckel', 14)
        D.box((sx + 0.02, sy + 0.02, lid_h), (0, -sy / 2, 0), side='plain', top='plain', tint=tint, bevel=0.03, bottom=True)
        D.tile('crate', (0, -sy / 2, lid_h + 0.002), X, Y, sx - 0.12, sy - 0.12, tint, off=0.002)
        for s in (-1, 1): D.box((0.06, sy + 0.03, lid_h + 0.012), (s * (sx / 2 - 0.08), -sy / 2, 0), side='plain', tint=edge, bevel=0.012, bottom=True)
        for x in (-sx * 0.3, sx * 0.3): D.box((0.08, 0.035, 0.05), (x, -sy - 0.015, 0.0), side='plain', tint='steel', bevel=0.008, bottom=True)
        if name == 'sanikiste': D.decal('cross', (0, -sy / 2, lid_h + 0.006), X, Y, 0.22, off=0.003)
        if name == 'tresorkiste': D.box((sx * 0.5, 0.16, 0.03), (0, -sy / 2, lid_h), side='hazard', tint='none', bevel=0.005, bottom=True)
        lid = D.build('mine_kit')
        lid['hinge'] = (0.0, sy / 2, bh)
        out += [body, lid]
    return out

def portal(lib):
    """Stolleneingang an der Oberfläche: Betonportal mit Tor, Förderturm mit Seilscheibe, Lampen, Absperrung, Kisten. Eingang zeigt nach -Y."""
    K = lib.Kit('portal', 15); X, Y, Z = lib.X, lib.Y, lib.Z
    K.slab(16, 13, 0.4, (0, 1.5, -0.3))
    for s in (-1, 1):
        K.box((2.0, 7.0, 6.2), (s * 4.4, 2.0, 0), side='plain', top='plain', tint='concrete', bevel=0.08)
        K.box((2.4, 1.0, 1.2), (s * 4.4, -1.6, 0), side='plain', tint='concrete', bevel=0.06)
        K.box((0.3, 0.1, 5.2), (s * 3.42, -1.5, 0), side='hazard', tint='none', bevel=0.01, along='z')
    K.box((10.8, 7.4, 1.8), (0, 2.0, 6.2), side='plain', top='plain', tint='concrete', bevel=0.08)
    K.box((10.8, 0.6, 0.6), (0, -1.65, 6.2), side='beam', tint='hull_dark', bevel=0.04)
    K.box((6.6, 0.3, 5.3), (0, 0.2, 0), side='siding', tint='hull_mid', bevel=0.03)                               # Rolltor
    K.box((1.0, 0.1, 2.2), (2.2, 0.0, 0), side='plain', tint='hull_light', bevel=0.02)                              # Schlupftür
    K.decal('w_kein_zutritt', (0, -1.96, 7.1), X, Z, 4.6, off=0.02)
    K.decal('w_achtung', (-2.0, 0.04, 3.6), X, Z, 2.0, off=0.012); K.decal('warn', (2.2, -0.06, 1.5), X, Z, 0.5, off=0.012)
    K.number('13', (-2.2, 0.04, 1.6), X, Z, 0.7, 'white', 0.012)
    K.decal('leak1', (-4.4, -1.52, 4.0), X, Z, 1.6, 3.6, off=0.02); K.decal('soot', (0, 0.04, 4.6), X, Z, 6.0, 1.6, off=0.013)
    for s in (-1, 1):
        K.glowbox('lamp', (0.4, 0.2, 0.25), (s * 2.6, -1.85, 5.6)); K.light('lamp', (s * 2.6, -1.95, 5.6), 3.0)
    K.glowbox('redlamp', (0.25, 0.25, 0.25), (0, -1.9, 8.2)); K.light('redlamp', (0, -2.0, 8.2), 2.2)
    # Förderturm auf dem Portal: vier Streben, Bühne, Seilscheibe
    T0, TH = 8.0, 10.0
    for sx in (-1, 1):
        for sy in (-1, 1):
            K.beam((sx * 3.2, 2.0 + sy * 2.4, T0), (sx * 1.3, 2.0 + sy * 1.0, T0 + TH), 0.34, 0.34, 'girder', 'rust', 0.03)
    for z in (T0 + 3.5, T0 + 7.0):
        f = (z - T0) / TH; hx, hy = 3.2 - 1.9 * f, 2.4 - 1.4 * f
        for a, b in (((-hx, -hy), (hx, -hy)), ((hx, -hy), (hx, hy)), ((hx, hy), (-hx, hy)), ((-hx, hy), (-hx, -hy))):
            K.beam((a[0], 2.0 + a[1], z), (b[0], 2.0 + b[1], z), 0.2, 0.2, 'girder', 'rust', 0.02)
        K.beam((-hx, 2.0 - hy, z), (hx, 2.0 - hy, z + 3.5 if z < T0 + 6 else z), 0.14, 0.14, 'girder', 'rust', 0.015) if z < T0 + 6 else None
    K.box((3.6, 2.8, 0.25), (0, 2.0, T0 + TH), side='beam', top='floor', tint='hull_dark', bevel=0.03)
    K.railing((-1.8, 0.6, T0 + TH + 0.25), (1.8, 0.6, T0 + TH + 0.25)); K.railing((-1.8, 3.4, T0 + TH + 0.25), (1.8, 3.4, T0 + TH + 0.25))
    K.tube((-0.25, 2.0, T0 + TH + 1.6), (0.25, 2.0, T0 + TH + 1.6), 1.4, 'girder', 'hull_dark', 24, mode='around', cap_tint='hull_mid')    # Seilscheibe
    K.tube((-0.32, 2.0, T0 + TH + 1.6), (0.32, 2.0, T0 + TH + 1.6), 0.25, 'plain', 'steel', 12)
    for s in (-1, 1): K.beam((s * 0.5, 2.0 + s * 0.0, T0 + TH + 0.25), (s * 0.35, 2.0, T0 + TH + 1.6), 0.18, 0.18, 'girder', 'rust', 0.02)
    K.tube((0, 0.62, T0 + TH + 1.6), (0, 0.62, T0 - 0.05), 0.03, 'plain', 'steel', 6, caps=False)
    K.ladder(TH, (2.6, 4.0, T0), 0.0)
    K.glowbox('redlamp', (0.3, 0.3, 0.3), (0, 2.0, T0 + TH + 3.2)); K.light('redlamp', (0, 2.0, T0 + TH + 3.2), 3.0)
    # Vorplatz
    for x in (-6.2, 6.4): K.mast_light(7.0, (x, -4.5, 0))
    K.barrier(3.0, (-5.0, -6.5, 0), 0.2); K.barrier(3.0, (5.2, -6.3, 0), -0.25)
    K.crate(1.4, 1.2, 1.1, (6.2, -1.0, 0), 0.2, 'yellow', 'warn'); K.crate(1.1, 1.1, 0.9, (6.4, 0.4, 0), -0.1, OLIVE)
    for i, t in enumerate(('red', 'blue', 'red')): K.barrel((-6.4 + (i % 2) * 0.9, -0.6 - (i // 2) * 0.9, 0), t)
    K.signpost('w_achtung', (-3.5, -7.4, 0), 0.15, 2.4, 0.8)
    return K.build('mine_kit')

def deko(lib):
    """Kram für Kavernen und Sackgassen: Kistenstapel, Fässer, Werkzeugkiste, Kabeltrommel."""
    K = lib.Kit('deko', 16); X, Y, Z = lib.X, lib.Y, lib.Z
    K.crate(1.0, 0.9, 0.8, (0, 0, 0), 0.1, OLIVE, 'warn'); K.crate(0.8, 0.7, 0.6, (0.1, 0.0, 0.8), -0.25, 'hull_light')
    K.crate(0.9, 0.8, 0.7, (1.05, 0.15, 0), -0.05, OLIVE)
    for i, t in enumerate(('red', 'hull_light', 'blue')): K.barrel((-1.1 + (i % 2) * 0.75, 0.2 - (i // 2) * 0.75, 0), t, 0.32, 0.9)
    K.tube((1.0, -1.0, 0.45), (1.0, -0.55, 0.45), 0.45, 'plain', WOOD, 16)                                         # Kabeltrommel
    K.tube((1.0, -0.98, 0.45), (1.0, -0.57, 0.45), 0.3, 'hose', 'orange', 16, mode='around')
    return K.build('mine_kit')

NAMES = ['stuetze', 'gleis', 'leitung', 'lampe', 'tor', 'tor_blatt', 'schalter', 'hebel', 'korb', 'wagen',
         'kiste', 'kiste_deckel', 'tresorkiste', 'tresorkiste_deckel', 'sanikiste', 'sanikiste_deckel', 'portal', 'deko']

def build(lib, only=None):
    import bpy
    c = bpy.data.collections.get('mine_kit')
    if c and not only:
        for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
    made = []
    for fn in (stuetze, gleis, leitung, lampe, tor, schalter, korb, wagen, kisten, portal, deko):
        if only and fn.__name__ not in only: continue
        r = fn(lib); made += list(r) if isinstance(r, (list, tuple)) else [r]
    # nebeneinander zum Ansehen (der Export setzt alle auf den Ursprung zurück)
    for i, o in enumerate(made): o.location = ((i % 6) * 5.0, (i // 6) * 6.0, 0)
    return [o.name for o in made]

def bake(lib, names=None):
    import bpy
    out = {}
    sc = bpy.context.scene
    for n in names or NAMES:
        ob = bpy.data.objects[n]; loc = ob.location.copy(); ob.location = (0, 0, 0)
        hidden = [o for o in sc.objects if o is not ob and not o.hide_render]          # nur das eigene Teil wirft Verdeckung
        for o in hidden: o.hide_render = True
        try:
            out[n] = lib.bake_ao(ob, dist=2.0 if n not in ('portal',) else 5.0, samples=16, ground=n not in ('lampe', 'hebel', 'tor_blatt') and not n.endswith('_deckel'))
        finally:
            for o in hidden: o.hide_render = False
        ob.location = loc
    return out

def export(lib):
    import bpy, json
    obs = [bpy.data.objects[n] for n in NAMES]
    keep = {o.name: o.location.copy() for o in obs}
    for o in obs: o.location = (0, 0, 0)
    meta = {'hinges': {o.name: list(o['hinge']) for o in obs if 'hinge' in o}, 'lights_by_part': {o.name: json.loads(o.get('kit_lights', '[]')) for o in obs}}
    r = lib.export(obs[0], 'Mine_Kit', meta, extra=obs[1:])
    for o in obs: o.location = keep[o.name]
    return r
