# Promenade und Korridor der Stationen, gebaut mit dem Baukasten (kit_lib.py + kit_interior.py). Läuft in Blender (Promenade.blend, Textblock promenade_kit).
# Maße wie im Spiel (src/game/interior.ts): Korridor 6 × 12 × 4,6 m, Halle 30 × 48 × 8 m. Örtliche Koordinaten: x quer, y = 0 an der Tür
# zwischen Korridor und Halle, +y tiefer in die Halle, z oben. Im Spiel liegt die Tür bei z = PZ1 = -62, deshalb wird alles um OFF verschoben.
import math

OFF = 62.0
W, D, H = 15.0, 48.0, 8.0          # halbe Breite, Tiefe, Höhe der Halle
CW, CL, CH = 3.0, 12.0, 4.6        # Korridor: halbe Breite, Länge, Höhe
WW, WY0, WY1 = 10.0, 1.5, 6.6      # Aussichtsfenster am Ende: halbe Breite, Brüstung, Sturz
SLOTS = [7.0 + 7.5 * i for i in range(5)]
RIBS = [3.25 + 7.5 * k for k in range(6)]

def build(lib):
    K = lib.Kit('Promenade', seed=21); K.lm = True
    X, Y, Z = lib.X, lib.Y, lib.Z; pi = math.pi
    with K.at((0, OFF, 0)):
        # ---------- Halle: Boden, Decke, Wände
        K.floor(-6, 0, 6, D, 0, tint='i_floor'); K.floor(-W, 0, -6, D, 0, tint='i_floor_dark'); K.floor(6, 0, W, D, 0, tint='i_floor_dark')
        K.ceiling(-W, 0, W, D, H)
        K.wall((-W, 0), (-W, D), H); K.wall((W, D), (W, 0), H)
        K.wall((W, 0), (CW, 0), H); K.wall((-CW, 0), (-W, 0), H); K.wall((CW, 0), (-CW, 0), H - CH, CH)
        K.wall((-W, D), (-WW, D), H); K.wall((WW, D), (W, D), H); K.wall((-WW, D), (WW, D), WY0); K.wall((-WW, D), (WW, D), H - WY1, WY1)
        # Aussichtsfenster: Brüstung, Pfosten, Sturzblende mit Abflugtafel
        K.box((2 * WW + 0.6, 0.7, 0.14), (0, D - 0.1, WY0), side='itrim', tint='i_dark', bevel=0.03, bottom=True)
        for k in range(7): K.box((0.3, 0.5, WY1 - WY0), (-WW + k * (2 * WW / 6), D + 0.05, WY0), side='rib', tint='i_rib', bevel=0.04, bottom=True, along='z')
        K.box((2 * WW + 0.6, 0.5, 0.3), (0, D + 0.05, WY1 - 0.3), side='rib', tint='i_rib', bevel=0.04, bottom=True)
        K.glow('accent', (0, D - 0.46, WY0 + 0.07), X, Z, 2 * WW - 1, 0.05)
        K.wall_sign('board', 5.6, (0, D - 0.02, WY1 + 0.02))
        for s in (-1, 1): K.wall_sign('hall' + ('2' if s < 0 else '3'), 0.9, (s * 12.5, D - 0.02, 5.0))
        # ---------- Tragrahmen, Lichtleisten, Rohre
        for y in RIBS: K.portal(2 * W, H, (0, y, 0))
        for i in range(len(RIBS) - 1):
            ym = (RIBS[i] + RIBS[i + 1]) / 2
            for s in (-1, 1):
                K.light_bar((s * 5.4, ym - 2.2, H), (s * 1.4, ym + 2.2, H), 0.26, 'light')
                K.light_bar((s * 9.6, ym - 2.0, H), (s * 9.6, ym + 2.0, H), 0.2, 'cool')
            K.lamp((0, ym, H - 1.2), (1.0, 0.9, 0.78), 240, 0.6)
        for s in (-1, 1):
            K.duct((s * 7.4, 0.4, H - 0.5), (s * 7.4, D - 0.4, H - 0.5), 0.3, 'i_dark', H)
            K.pipe([(s * 12.4, 0.3, H - 0.35), (s * 12.4, D - 0.3, H - 0.35)], 0.11, 'i_red', flange=True)
        # ---------- Bodenführung: Lichtstreifen, Linien, Zeichen
        for s in (-1, 1):
            y = 1.0
            while y < D - 2:
                K.floor_strip((s * 6, y), (s * 6, min(D - 1.5, y + 5.5)), 0.09, 'accent'); y += 7.5
            K.floor_line((s * 5.6, 0.6), (s * 5.6, D - 1.2), 0.08, 'i_wall_light')
        K.floor_line((-CW, 0.5), (CW, 0.5), 0.5, 'yellow'); K.decal('chevron', (0, 2.2, 0.012), Y, -X, 1.8, tint='i_wall_light', off=0.0)
        K.number('1', (0, 4.2, 0.012), X, Y, 1.4, 'i_wall_light', 0.0)
        K.decal('emblem', (0, 33.5, 0.012), X, Y, 3.0, tint='i_wall_light', off=0.0); K.decal('scuff', (2.5, 12, 0.012), X, Y, 5, 5, off=0.002); K.decal('stain2', (-3, 38, 0.012), X, Y, 4, 4, off=0.002)
        K.dais(2.7, (0, 22, 0))
        # ---------- Eingang: Türrahmen, Wegweiser, Werbetafeln
        for s in (-1, 1):
            K.box((0.5, 0.5, CH), (s * (CW + 0.25), 0.2, 0), side='rib', tint='i_rib', bevel=0.05, along='z')
            K.box((0.36, 0.1, CH - 0.3), (s * (CW + 0.25), 0.47, 0.15), side='hazard', tint='none', bevel=0.01, bottom=True, along='z')
            K.ad_screen('ad_werft' if s > 0 else 'ad_wacht', 2.5, (s * 9.6, 0.02, 1.7), pi)
            K.planter(1.6, 1.6, (s * 6.0, 2.5, 0))
        K.box((2 * CW + 1.0, 0.5, 0.5), (0, 0.2, CH), side='rib', tint='i_rib', bevel=0.05, bottom=True)
        K.wall_sign('way_hangar', 5.0, (0, 0.02, CH + 0.75), pi)
        K.hanging_sign('way_main', 5.6, (0, 11.2, 5.4), 0.0, H); K.hanging_sign('way_deck', 5.6, (0, 29.5, 5.2), 0.0, H)
        K.kiosk((-4.7, 3.2, 0), 0.0); K.kiosk((4.7, 3.2, 0), 0.0)
        # ---------- Läden: fünf Nischen je Seite, darüber Werbung und Hallennummern
        ads = {(-1, 0): 'ad_fracht', (-1, 2): 'ad_kristall', (-1, 4): 'ad_werft', (1, 1): 'ad_wacht', (1, 3): 'ad_fracht'}
        for s in (-1, 1):
            for i, y in enumerate(SLOTS):
                K.shop_bay((s * W, y, 0), -s * pi / 2)
                rz = -s * pi / 2
                if (s, i) in ads: K.ad_screen(ads[(s, i)], 1.55, (s * (W - 0.02), y, 4.55), rz)
                else: K.wall_sign('ticker', 2.6, (s * (W - 0.02), y, 5.6), rz); K.panel_i('utility', (s * (W - 0.02), y + 1.9, 4.7), rz, 1.3, 1.3)
        # ---------- Aufenthalt am Fenster: Bänke, Kübel, Automaten, Abfall
        for s in (-1, 1):
            K.bench(4.0, (s * 6.5, 43.0, 0), pi); K.bench(3.2, (s * 2.4, 45.6, 0), pi, back=False)
            K.planter(1.6, 1.6, (s * 13.0, 45.8, 0), 0, 0.75, 3); K.planter(2.6, 1.1, (s * 11.0, 41.4, 0), 0, 0.6, 3)
            K.vending((s * 11.0, 47.45, 0), 0.0); K.bin((s * 9.4, 47.2, 0)); K.bin((s * 4.2, 1.0, 0))
            K.lamp((s * 6, 44, 5.5), (0.8, 0.9, 1.0), 220, 0.5)
        # ---------- Korridor
        K.floor(-CW, -CL, CW, 0, 0, tint='i_floor_dark'); K.ceiling(-CW, -CL, CW, 0, CH)
        K.wall((-CW, -CL), (-CW, 0), CH); K.wall((CW, 0), (CW, -CL), CH)
        for y in (-1.5, -6.0, -10.5):
            for s in (-1, 1): K.box((0.36, 0.6, CH), (s * (CW - 0.18), y, 0), side='rib', tint='i_rib', bevel=0.04, along='z')
            K.box((2 * CW, 0.6, 0.36), (0, y, CH - 0.36), side='rib', tint='i_rib', bevel=0.04, bottom=True)
        for y0, y1 in ((-10.0, -6.6), (-5.4, -2.1)):
            K.light_bar((0, y0, CH), (0, y1, CH), 0.34, 'light')
            for s in (-1, 1):
                K.glow('accent', (s * (CW - 0.01), (y0 + y1) / 2, 1.15), -Y * s, Z, y1 - y0, 0.06)
                K.panel_i('utility' if s > 0 else 'locker', (s * (CW - 0.01), (y0 + y1) / 2, 1.5 if s > 0 else 0.1), -s * pi / 2, 1.2, 1.2 if s > 0 else 2.0)
        K.floor_strip((0, -CL + 0.3), (0, -0.4), 0.08, 'accent'); K.floor_line((-CW, -0.5), (CW, -0.5), 0.3, 'yellow')
        for s in (-1, 1): K.pipe([(s * (CW - 0.45), -CL + 0.1, CH - 0.25), (s * (CW - 0.45), -0.1, CH - 0.25)], 0.09, 'i_red' if s > 0 else 'steel')
    ob = K.build('Promenade')
    # Rollläden für leere Ladennischen: je Nische ein eigenes Objekt (Shutter_L0 … Shutter_R4), im Spiel einzeln ein- und ausgeblendet
    shut = []
    for s in (-1, 1):
        for i, y in enumerate(SLOTS):
            Ks = lib.Kit('Shutter_%s%d' % ('L' if s < 0 else 'R', i), seed=40 + i); Ks.lm = True
            with Ks.at((0, OFF, 0)): Ks.shutter(5.16, 3.4, (s * (W - 3.56), y, 0), -s * pi / 2)
            shut.append(Ks.build('Promenade'))
    return K, ob, shut

def meta(K):
    return {'slots': K.slots, 'dims': {'w': W, 'd': D, 'h': H}, 'ribs': [round(-(OFF + y), 2) for y in RIBS]}
