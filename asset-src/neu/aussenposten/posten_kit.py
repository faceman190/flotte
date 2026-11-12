# Außenposten für die Planeten, gebaut mit dem Baukasten (asset-src/neu/baukasten/kit_lib.py). Läuft in Blender (Aussenposten.blend, Textblock posten_kit).
# Vorderseite nach -Y, Ursprung = Boden in der Mitte des Hauptgebäudes. Aufruf: build(lib) → Objekt „Aussenposten“ in der Sammlung „Posten_Kit“.
import math

PAD = (-62.0, -38.0)      # Mitte des Landefelds (Blender x, y)
MASTS = [(-30, -20), (30, -20), (-38, 24), (38, 24), (-89, -38), (-62, -65)]

def build(lib):
    K = lib.Kit('Aussenposten', seed=11)
    X, Y, Z = lib.X, lib.Y, lib.Z
    S = 1.6                                   # Höhe des Sockels
    # ---------- Sockel und Hauptbau
    K.slab(68, 30, S, (0, 5.5, 0))
    K.block(17, 22, 12, (0, 6, S), tint='hull', trim='hull_dark')
    K.gate(11, 8.6, 1.8, (0, -5.5, S), number='07')
    K.ramp(11.4, 12, S, (0, -9.5, 0))
    for s in (-1, 1):
        K.box((0.5, 3.0, 0.12), (s * 5.2, -8.0, S), side='hazard', tint='none', bevel=0.01, bottom=True)
        K.decal('chevron', (s * 3.0, -8.0, S + 0.01), Y * -1 if s > 0 else Y, X * (1 if s > 0 else -1), 1.6, off=0.02)
    K.decal('tyre', (0.6, -8.4, S + 0.01), X, Y, 5, 2.4, off=0.02)
    # ---------- Flügel mit Pultdach, Trägern, Fenstern, Rohren
    for s in (-1, 1):
        K.wing(24, 23, 7.8, 1.1, (s * 8.5, 5.5, S), s, tint='hull', tint_top='hull_light', rafters=4)
        xc = s * 20.5
        K.windows(7.5, (s * 14.5, -6.5, S + 2.6), 0, 0.7)
        K.pipe([(s * 9.4, -6.9, S + 0.5), (s * 9.4, -6.9, S + 5.0), (s * 22.0, -6.9, S + 1.9), (s * 22.0, -6.9, S + 0.3)], 0.24, 'yellow')
        K.pipe([(s * 10.2, -7.0, S + 0.3), (s * 10.2, -7.0, S + 1.4), (s * 28.0, -7.0, S + 1.4)], 0.14, 'steel')
        K.panel('vent', (s * 24.5, -6.5, S + 0.25), w=1.5, h=1.0, depth=0.18, tint='hull_mid')
        K.decal('leak' + str(1 + (s > 0)), (s * 24.5, -6.5, S + 0.1), X, Z, 1.4, 1.1, off=0.2)
        for k, y in enumerate((0.0, 11.0)):
            xx = 15.5 + k * 5.5; zz = S + 7.8 - xx * (6.7 / 23) + 0.02
            with K.push(lib.Matrix.Translation((s * (8.5 + xx), y, zz)) @ lib.Matrix.Rotation(s * math.atan2(6.7, 23), 4, 'Y')):
                K.vent_unit((0, 0, 0), sx=2.4, sy=2.4, sz=0.9)
        K.railing((s * 9.6, -9.3, S), (s * 33.6, -9.3, S))
        K.railing((s * 33.8, -9.3, S), (s * 33.8, 20.3, S))
    K.door((-16.5, -6.5, S)); K.panel('ctrl', (-14.6, -6.5, S + 0.9), w=1.0, h=1.0, depth=0.2, glow='screen')
    K.decal('w_zugang', (-16.5, -6.5, S + 3.3), X, Z, 2.4, off=0.03)
    K.number('07', (20.5, -6.5, S + 0.9), X, Z, 1.0, 'white', 0.03)
    K.panel('hatch', (27.0, -6.5, S + 0.2), w=1.3, h=1.3, depth=0.12)
    K.decal('rust1', (16.8, -6.5, S + 1.3), X, Z, 1.6, 2.6, off=0.03); K.decal('leak3', (-21.0, -6.5, S + 1.4), X, Z, 1.6, 2.6, off=0.03)
    # ---------- Turm mit Streben, Fenstern, Antennen
    T0 = S + 12
    K.block(9, 9, 10, (0, 9, T0), tint='hull', plinth=0.5)
    K.block(6.5, 6.5, 7, (0, 9.5, T0 + 10), tint='hull_light', plinth=0.4)
    for sx in (-1, 1):
        for sy in (-1, 1): K.beam((sx * 4.7, 9 + sy * 4.7, T0), (sx * 3.45, 9.5 + sy * 3.45, T0 + 16.6), 0.6, 0.6, 'beam', 'yellow')
    for k in range(3): K.windows(5.6, (0, 4.5, T0 + 4.6 + k * 1.5), 0, 0.6, 4)
    K.windows(4.6, (0, 6.25, T0 + 13.2), 0, 0.9, 3, kind='screen')
    K.decal('emblem', (0, 4.5, T0 + 2.4), X, Z, 2.6, off=0.03)
    K.antenna(12, (2.0, 11.0, T0 + 17)); K.antenna(6, (-2.2, 8.4, T0 + 17)); K.dish(2.0, (-1.2, 11.6, T0 + 17), 0.0, 0.6)
    K.turret((0, -1.2, T0), 0.0)
    K.vent_unit((5.6, 14.6, T0)); K.vent_unit((-5.4, 0.5, T0), sx=1.8, sy=1.8, sz=1.0); K.vent_unit((5.4, 1.5, T0), sx=1.6, sy=2.6, sz=1.1)
    K.pipe([(-6.5, 5.0, T0 + 0.3), (-6.5, 14.0, T0 + 0.3), (-4.6, 14.0, T0 + 0.3), (-4.6, 14.0, T0 + 3.0)], 0.2, 'steel')
    K.ladder(10, (4.5, 9.0, T0), math.pi / 2)
    # ---------- Lichtmasten, Markierungen
    for x, y in MASTS: K.mast_light(14.5, (x, y, 0))
    for x, y in [(-20, -38), (-8, -44), (10, -42), (40, -40), (58, -10), (56, 14), (-50, 10), (-32, -30)]: K.post((x, y, 0))
    K.beacon((26, -32, 0))
    # ---------- Fracht rechts vorn: Fässer in Käfigen, Plattformen, Container
    k = 0
    for row, y in enumerate((-12.8, -15.6)):
        for x in (16, 18.8, 21.6, 24.6)[: 4 - row]: K.cage((x, y, 0), 2.3, ('red', 'red', 'orange', 'blue')[(k + row) % 4]); k += 1
    K.cage((16, -12.8, 2.3), 2.3, 'red')
    for i, t in enumerate(('blue', 'hull_light', 'red')): K.barrel((13.4 + (i % 2) * 0.95, -15.4 - (i // 2) * 0.95, 0), t)
    K.platform(9, 9, 1.6, (42, -6, 0), stairs_side=-1)
    K.tank(1.3, 4.2, (43, -4.2, 1.6), 0.0, 'hull_mid', None); K.crate(1.8, 1.8, 1.5, (39.6, -8.4, 1.6), 0.2, 'yellow'); K.generator((43.4, -8.6, 1.6), 0.0)
    K.platform(9, 9, 1.6, (44, -19, 0), stairs_side=-1)
    for i, (x, y) in enumerate([(41.5, -17), (44, -17), (46.5, -17), (41.5, -21), (44, -21)]): K.cage((x, y, 1.6), 2.0, 'red' if i % 2 else 'orange')
    K.crate(1.6, 1.6, 1.4, (46.6, -21.2, 1.6), -0.15, 'hull_light', 'warn')
    K.container((30, -30, 0), 0.25, 'blue', '27'); K.container((30.4, -29.8, 2.6), 0.32, 'orange', '14'); K.container((36.5, -33, 0), -0.6, 'hull_light', '31')
    # ---------- Links: Zugmaschine, Wagen, Tanks, Kisten, Silo, Abwehr
    K.hauler((-16, -14.5, 0), 0.06); K.cart((-6.5, -27, 0), -0.12)
    K.tank(1.5, 5.5, (-26, -13.5, 0), 0.0, 'white'); K.tank(1.2, 4.0, (-26, -17.6, 0), 0.0, 'hull_light', 'p_o2')
    for i in range(4): K.crate(1.9, 1.6, 1.3 + (i % 2) * 0.4, (-33 + i * 2.1, -21.5, 0), 0.08 * (i - 1.5), ('hull_light', 'yellow', 'hull_light', 'green')[i], 'warn' if i == 1 else None)
    K.crate(1.4, 1.4, 1.1, (-32, -21.4, 1.3), 0.4, 'hull_light')
    K.silo(2.6, 9.5, (-41.5, 12, 0)); K.silo(2.0, 7.0, (-46.5, 15.5, 0), 'hull_mid')
    K.pipe([(-41.5, 9.2, 2.2), (-41.5, 6.0, 2.2), (-34.0, 6.0, 2.2)], 0.22, 'yellow')
    K.block(4.6, 4.6, 1.3, (-52, -6, 0), tint='hull_mid', plinth=0, cornice=0.25); K.turret((-52, -6, 1.3), 0.5)
    K.sign('w_landezone', (-36, -34, 0), -0.5, 3.4, 1.0); K.sign('p_caution', (36, -22.5, 0), 0.4)
    for i in range(3): K.barrier(4.0, (-36.5, -44 - i * 4.6, 0), 0.0)
    # ---------- Landefeld
    K.pad(46, (PAD[0], PAD[1], 0), 0.6, '1')
    return K.build('Posten_Kit')

def meta():
    return {'pad': {'x': PAD[0], 'z': -PAD[1], 'y': 0.6, 'r': 23}, 'R': 130, 'collide_above': 1.0}
