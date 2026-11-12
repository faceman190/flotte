# Hangar der Stationen, gebaut mit dem Baukasten (kit_lib.py + kit_interior.py). Läuft in Blender (Hangar_Kit.blend, Textblock hangar_kit).
# Maße wie im Spiel (src/game/interior.ts): 184 × 162 × 42 m, Tor 124 × 32 m, drei Stellplätze. Blender-Koordinaten = Spielkoordinaten mit y = -z:
# Tor bei y = -112, Rückwand mit Tür zum Korridor bei y = 50. Frei bleiben müssen: die Stellplätze (x bis ±86, y -80 … 24), die Flugbahn zum Tor,
# der Streifen hinter dem mittleren Stellplatz (x ±30, y 24,5 … 41) und die Laufwege bei x = ±86, y = 40, y = 42 und y = -90.
import math

HW, Y0, Y1, HH = 92.0, -112.0, 50.0, 42.0
DW, DH, CW, CH = 62.0, 32.0, 3.0, 4.6
PADS = [(-60.0, -28.0, '1'), (0.0, -28.0, '2'), (60.0, -28.0, '3')]
BUTT = [-100.0, -78.0, -56.0, -34.0, -12.0, 10.0, 32.0]
ALC = [-89.0, -45.0, -1.0]; AW, AD, AH = 16.0, 9.0, 8.0

def build(lib):
    K = lib.Kit('Hangar', seed=31); K.lm = True; K.lm_min = 14.0      # nur große Flächen in die Lichtkarte, sonst wird sie zu grob
    X, Y, Z = lib.X, lib.Y, lib.Z; pi = math.pi; L = Y1 - Y0; yc = (Y0 + Y1) / 2
    def bands(a, b, op):       # Wand in fünf Zonen: Sockelzone, Trägerband, Lamellen, Farbband, obere Paneele
        K.wall_open(a, b, 9.0, op, 0.0, 'iwalls', 'h_sand', 4.0)
        K.wall_open(a, b, 1.2, op, 9.0, 'girder', 'i_dark', 6.0)
        K.wall_open(a, b, 16.0, op, 10.2, 'siding', 'h_wall', 6.0)
        K.wall_open(a, b, 1.2, op, 26.2, 'beam', 'i_red', 6.0)
        K.wall_open(a, b, 14.6, op, 27.4, 'wall', 'h_dark', 6.0)
    # ---------- Boden, Decke, Wände
    PY0, PY1 = Y0 + 4.05 * 16, Y0 + 4.05 * 26        # Landeplatten liegen genau im Raster der Bodenplatte (4 × 4,05 m) und ersetzen sie dort
    K.slab(2 * HW, L, 0.0, (0, yc, 0), tint='h_floor', cell=4.0, uvm=6.0, holes=[(p[0] - 20, PY0 - yc, p[0] + 20, PY1 - yc) for p in PADS])
    K.ceiling(-HW, Y0, HW, Y1, HH, 'iceils', 'i_ceil')
    bands((-HW, Y0), (-HW, Y1), [(y - Y0 - AW / 2, y - Y0 + AW / 2, AH) for y in ALC])
    bands((HW, Y1), (HW, Y0), [(Y1 - y - AW / 2, Y1 - y + AW / 2, AH) for y in ALC])
    bands((-HW, Y1), (HW, Y1), [(HW - CW, HW + CW, CH)])
    bands((HW, Y0), (-HW, Y0), [(HW - DW, HW + DW, DH)])
    # ---------- Seitenwände: Pfeiler, Nischen mit Fracht, Laufstege, Rohre, Nummern
    for s in (-1, 1):
        rz = -s * pi / 2; u = Y * -s
        for y in BUTT: K.buttress(HH, (s * HW, y, 0), rz)
        for i, y in enumerate(ALC):
            K.alcove(AW, AD, AH, (s * HW, y, 0), rz, 'i_wall', warm=(i + (s > 0)) % 2 == 0)
            xa = s * (HW + 5.2); k = i * 2 + (s > 0)
            if k % 3 == 0:
                K.container((xa, y - 2.6, 0), pi / 2, ('blue', 'orange', 'olive')[k % 3], '%d' % (11 + k)); K.container((xa + s * 0.2, y - 2.4, 2.6), pi / 2 + 0.05, 'hull_light', '%d' % (31 + k))
                K.cage((s * (HW + 2.6), y + 4.6, 0), 2.2, 'red'); K.cage((s * (HW + 5.4), y + 4.8, 0), 2.2, 'orange'); K.crate(1.8, 1.8, 1.5, (s * (HW + 7.4), y + 2.0, 0), 0.2, 'yellow')
            elif k % 3 == 1:
                K.hauler((s * (HW + 5.0), y + 1.0, 0), pi / 2 * s + pi, 'olive' if k % 2 else 'hull_mid')
                for q in range(3): K.crate(1.8, 1.6, 1.3 + 0.3 * (q % 2), (s * (HW + 7.4), y - 5.8 + q * 2.0, 0), 0.1 * q, ('hull_light', 'yellow', 'green')[q], 'warn' if q == 1 else None)
                K.crate(1.4, 1.4, 1.1, (s * (HW + 7.3), y - 4.9, 1.45), 0.5); K.generator((s * (HW + 2.6), y + 5.6, 0), rz + pi)
            else:
                K.tank(1.5, 6.0, (s * (HW + 6.4), y - 2.0, 0), pi / 2, 'white'); K.tank(1.3, 5.0, (s * (HW + 3.0), y - 2.4, 0), pi / 2, 'hull_light', 'p_o2')
                for q in range(4): K.barrel((s * (HW + 2.0 + (q % 2) * 1.0), y + 4.2 + (q // 2) * 1.0, 0), ('red', 'blue', 'yellow', 'hull_light')[q])
                K.cart((s * (HW + 6.0), y + 5.0, 0), pi / 2)
            K.wall_sign('hall%d' % (i + 1), 1.8, (s * (HW - 0.02), y, AH + 1.6), rz)
        for j in range(len(BUTT) - 1):
            ym = (BUTT[j] + BUTT[j + 1]) / 2
            K.walkway(18.4, 2.2, 0.4, (s * (HW - 1.3), ym, 9.8), pi / 2 * (1 if s < 0 else -1), rails=(True, False))
            for dy in (-8.5, 8.5): K.beam((s * HW, ym + dy, 7.6), (s * (HW - 2.3), ym + dy, 9.85), 0.3, 0.3, 'beam', 'i_rib')
            K.number(str(j + 1), (s * (HW - 0.06), ym, 21.0), u, Z, 7.0, 'i_wall_light', 0.0)
            K.wall_lamp((s * (HW - 0.02), ym, 8.5), rz, 'light', 380)
            K.panel('vent', (s * HW, ym - 5, 30.5), rz, 3.6, 3.6, 0.4, 'h_dark'); K.panel('fan', (s * HW, ym + 5, 30.5), rz, 3.6, 3.6, 0.4, 'h_dark')
            if j % 2 == 1:      # Felder ohne Nische: Spinde, Kisten, Fässer an der Wand
                K.lockers(4, (s * HW, ym - 4.5, 0), rz); K.crate(1.8, 1.8, 1.5, (s * (HW - 1.4), ym + 1.6, 0), 0.1, 'yellow'); K.crate(1.5, 1.5, 1.2, (s * (HW - 1.3), ym + 3.6, 0), -0.2, 'hull_light')
                K.crate(1.2, 1.2, 1.0, (s * (HW - 1.4), ym + 1.7, 1.5), 0.4, 'green'); K.barrel((s * (HW - 1.0), ym + 5.6, 0), 'red'); K.barrel((s * (HW - 2.0), ym + 5.9, 0), 'blue')
                K.block_rect(s * (HW - 2.6) if s > 0 else -HW, ym + 0.4, HW if s > 0 else -(HW - 2.6), ym + 6.6)
                K.panel('ctrl', (s * HW, ym - 8.2, 0.9), rz, 1.2, 1.2, 0.3, glow='screen')
        K.pipe([(s * (HW - 0.7), Y0 + 6, 14.6), (s * (HW - 0.7), Y1 - 2, 14.6)], 0.4, 'yellow'); K.pipe([(s * (HW - 0.5), Y0 + 6, 16.2), (s * (HW - 0.5), Y1 - 2, 16.2)], 0.22, 'steel')
        K.box((1.0, L - 12, 1.0), (s * (HW - 3.2), yc, 33.0), side='beam', tint='i_rib', bevel=0.06, bottom=True)        # Kranbahn
        K.tank(1.5, 7.0, (s * (HW - 2.6), 41.0, 0), pi / 2, 'hull_light'); K.block_rect(s * (HW - 4.4) if s > 0 else -HW, 36.5, HW if s > 0 else -(HW - 4.4), 45.5)
        K.duct((s * 46, Y0 + 6, HH - 4.6), (s * 46, Y1 - 3, HH - 4.6), 1.0, 'i_dark')
        K.box((1.6, L, 2.0), (s * 31, yc, HH - 2.0), side='girder', tint='h_dark', bevel=0.06, bottom=True)
    # ---------- Decke: Träger, Leuchten, Brückenkran
    for y in BUTT:
        K.box((2 * HW, 2.0, 3.2), (0, y, HH - 3.2), side='girder', tint='h_dark', bevel=0.08, bottom=True)
        K.box((2 * HW, 2.4, 0.36), (0, y, HH - 3.56), side='beam', tint='orange', bevel=0.04, bottom=True)
    for j in range(len(BUTT) - 1):
        ym = (BUTT[j] + BUTT[j + 1]) / 2
        for x in (-60, 0, 60):
            if 1 <= j <= 4: K.light_bar((x - 7, ym, HH), (x + 7, ym, HH), 1.3, 'light')
            else: K.light_bar((x - 4, ym, HH), (x + 4, ym, HH), 0.8, 'cool')
        for x in (-80, 80): K.light_bar((x, ym - 5, HH), (x, ym + 5, HH), 0.6, 'cool')
    K.crane(2 * (HW - 3.2), (0, -45.0, 36.6), 0.3, 9.0)
    # ---------- Rückwand: Tür, Leitstand, Terminal, Aufenthalt, Fracht
    for s in (-1, 1):
        K.box((0.9, 0.9, CH + 0.5), (s * (CW + 0.45), Y1 - 0.35, 0), side='rib', tint='i_rib', bevel=0.06, along='z')
        K.box((0.5, 0.12, CH - 0.2), (s * (CW + 0.45), Y1 - 0.86, 0.1), side='hazard', tint='none', bevel=0.01, bottom=True, along='z')
        K.wall_lamp((s * 7.0, Y1 - 0.02, 5.6), 0, 'light', 380); K.floor_strip((s * 2.6, Y1 - 0.6), (s * 2.6, 41.0), 0.1, 'accent')
        K.container((s * 50, 46.6, 0), 0.02 * s, ('blue', 'orange')[s > 0], ('27', '14')[s > 0]); K.container((s * 50.3, 46.5, 2.6), -0.04 * s, 'hull_light', ('08', '19')[s > 0])
        K.container((s * 57.4, 46.7, 0), 0.0, 'olive', ('33', '41')[s > 0])
        for q in range(3): K.cage((s * (63.6 + q * 2.6), 46.8, 0), 2.3, ('red', 'orange', 'red')[q])
        K.cage((s * 63.6, 46.8, 2.3), 2.3, 'blue'); K.generator((s * 74.5, 47.2, 0), 0.0); K.cart((s * 80.0, 46.2, 0), pi / 2)
        K.block_rect(s * 45.5, 44.2, s * 83.5, Y1)
        K.wall_sign('hall' + ('1' if s < 0 else '3'), 4.0, (s * 60, Y1 - 0.02, 14.0)); K.ad_screen('ad_werft' if s < 0 else 'ad_fracht', 5.0, (s * 40, Y1 - 0.02, 11.5))
        K.bench(4.0, (s * 24.0, Y1 - 0.7, 0), 0.0); K.planter(1.6, 1.6, (s * 28.5, Y1 - 1.1, 0), 0, 0.75, 2)
    K.box((2 * CW + 1.8, 0.9, 0.9), (0, Y1 - 0.35, CH), side='rib', tint='i_rib', bevel=0.06, bottom=True)
    K.wall_sign('exit', 3.4, (0, Y1 - 0.02, CH + 1.2)); K.wall_sign('way_hangar', 8.0, (-14.5, Y1 - 0.02, 5.6)); K.wall_sign('board', 7.0, (15.5, Y1 - 0.02, 5.8))
    K.booth(30.0, 5.0, 6.0, (0, Y1, 11.5), 0.0, 'h_wall')
    K.console(3.0, (9.0, 47.8, 0), 0.0); K.box((3.2, 0.2, 1.0), (9.0, Y1 - 0.1, 2.8), side='iplain', tint='i_dark', bevel=0.03, bottom=True)
    K.lockers(5, (18.5, Y1, 0), 0.0); K.vending((-8.6, Y1 - 0.5, 0), 0.0); K.vending((-10.1, Y1 - 0.5, 0), 0.0); K.kiosk((-5.6, Y1 - 0.5, 0), 0.0); K.bin((5.2, Y1 - 0.5, 0))
    # ---------- Torwand: Pfeiler, Sturz, Warnlicht, Feldleisten
    for s in (-1, 1):
        K.box((5.0, 5.0, DH + 2), (s * (DW + 2.5), Y0 + 2.5, 0), side='siding', tint='h_dark', bevel=0.15)
        K.box((0.3, 3.4, DH - 1), (s * (DW - 0.1), Y0 + 2.5, 0.5), side='hazard', tint='none', bevel=0.02, bottom=True, along='z')
        K.glow('cool', (s * (DW - 0.27), Y0 + 2.5, DH / 2), Y * s, Z, 0.5, DH - 4)
        for z in (6.0, 16.0, 26.0):
            K.box((1.2, 0.5, 0.6), (s * (DW + 2.5), Y0 + 5.2, z), side='iplain', tint='i_dark', bevel=0.05, bottom=True); K.glow('lamp', (s * (DW + 2.5), Y0 + 5.46, z + 0.3), -X, Z, 1.0, 0.36)
            K.lamp((s * (DW + 2.5), Y0 + 7.0, z), (1.0, 0.55, 0.2), 1200, 0.4)
        K.block_rect(s * DW, Y0, s * (DW + 5.2), Y0 + 5.2)
        K.decal('w_achtung', (s * 40, Y0 + 10, 0.013), -X, -Y, 14.0, tint='yellow', off=0.0)
        K.signpost('w_kein_zutritt', (s * 75, Y0 + 7.5, 0), pi, 3.4, 1.0); K.barrier(4.0, (s * 71, Y0 + 9.0, 0), pi / 2); K.barrier(4.0, (s * 79, Y0 + 9.0, 0), pi / 2)
        K.block_rect(s * 68.5, Y0 + 7.0, s * 81.5, Y0 + 9.6)
    K.box((2 * DW + 10, 5.0, 4.0), (0, Y0 + 2.5, DH), side='girder', tint='h_dark', bevel=0.12, bottom=True)
    K.box((2 * DW, 0.3, 1.2), (0, Y0 + 5.1, DH + 0.3), side='hazard', tint='none', bevel=0.02, bottom=True)
    for i in range(9):
        x = (i - 4) * 14.0; K.glowbox('redlamp' if i % 2 else 'lamp', (0.7, 0.3, 0.4), (x, Y0 + 5.2, DH + 2.4)); K.lamp((x, Y0 + 7.0, DH + 1.5), (1.0, 0.3, 0.1) if i % 2 else (1.0, 0.55, 0.2), 500, 0.3)
    K.decal('w_hangar', (0, Y0 + 0.05, 37.3), -X, Z, 26.0, tint='i_wall_light', off=0.0); K.number('07', (-34, Y0 + 0.05, 37.4), -X, Z, 5.0, 'yellow', 0.0)
    with K.overlay(): K.box((2 * DW, 1.4, 0.03), (0, Y0 + 6.5, 0.0), side='hazard', top='hazard', tint='none', bevel=0, bottom=True)
    # ---------- Boden: Stellplätze, Linien, Gitterroste, Spuren
    for px, py, num in PADS:
        K.floor(px - 20, PY0, px + 20, PY1, 0.0, 'ifloors', 'i_floor_dark', 'y')      # Landeplatte aus Deckplatten
        for q in range(4):
            c, s2 = (1, 1, -1, -1)[q], (1, -1, 1, -1)[q]
            with K.overlay(): K.box((6.0, 0.5, 0.03), (px + c * 16, (PY1 - 0.5) if s2 > 0 else (PY0 + 0.5), 0.0), side='hazard', top='hazard', tint='none', bevel=0, bottom=True)
        K.pad_mark(16.0, (px, py, 0.01), num); hw = 30.0 if px == 0 else 26.0
        for a, b in (((px - hw, py - 52), (px + hw, py - 52)), ((px - hw, py + 52), (px + hw, py + 52)), ((px - hw, py - 52), (px - hw, py + 52)), ((px + hw, py - 52), (px + hw, py + 52))):
            K.floor_line(a, b, 0.3, 'yellow')
        y = py - 56.0
        while y > Y0 + 9: K.floor_line((px, y), (px, y - 4.0), 0.35, 'i_wall_light'); y -= 7.0
        K.decal('arrow', (px, py - 46, 0.013), X, -Y, 4.0, tint='i_wall_light', off=0.0)
    for s in (-1, 1):
        K.floor(s * 32 - 0.6, Y0 + 9, s * 32 + 0.6, 26.0, 0.03, 'floor', 'steel', 'y')
        K.decal('scuff', (s * 20, 30, 0.013), X, Y, 8, 8, off=0.0); K.decal('stain2', (s * 44, -70, 0.013), X, Y, 10, 10, off=0.0); K.decal('tyre', (s * 70, 34, 0.013), X, Y, 6, 14, off=0.0)
    K.floor_line((-30, 24.5), (30, 24.5), 0.3, 'i_wall_light'); K.floor_line((-CW, Y1 - 0.9), (CW, Y1 - 0.9), 0.5, 'yellow')
    K.decal('emblem', (0, 33.0, 0.013), -X, -Y, 6.0, tint='i_wall_light', off=0.0)
    return K, K.build('Hangar')

def meta(K):
    return {'pads': [[p[0], -p[1]] for p in PADS]}
