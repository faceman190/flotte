# Straßen und Wege für dichte Städte: Fahrbahn, Gehwege, Arkaden mit Läden, Platz mit Geländer, Gassen, Straßenmöbel, Technik über der Straße.
# Läuft in Blender (Hochhaeuser.blend), gebaut mit dem Baukasten (kit_lib.py, kit_interior.py) und den Hochhaus-Bausteinen (hochhaus_kit.py).
#
# Beläge: drei kachelnde Bilder mit Relief und Pfützen (scripts/make-kit-str.mjs → asset-src/neu/stadt/tex):
#   kit_sta Gehweg/Platz (8 m), kit_stb Fahrbahn (10,24 m breit, läuft längs), kit_stc Metalldeck (4 m).
# Aufbau einer Straße (Achse entlang +y, Mitte x = 0): Fahrbahn 10,24 m, beidseits Gehweg bis zur Baulinie (BL), dahinter Häuser,
# deren Erdgeschoss um die Arkadentiefe (AR) zurückspringt: Stützen an der Baulinie, dazwischen Ladenbuchten.
#
# Schaubühne: S.street_scene(lib) → Objekt „Hochhaus_Strasse“ (liegt in der Schlucht der Hochhaus-Stadt, y von -112 bis 132).
import math, random
import hochhaus_kit as H

PI = math.pi
Z0 = 0.22          # Oberkante der Stadt-Bodenplatte: Die Straße liegt darauf
GF = 5.4           # Höhe des Erdgeschosses (Arkade)
SW = 0.22          # Gehweghöhe über der Fahrbahn
RW = 10.24         # Fahrbahnbreite
BL = 10.6          # Baulinie: Abstand der Häuser von der Straßenmitte
AR = 3.8           # Tiefe der Arkade
COL = {'light': (1.0, 0.92, 0.8), 'cool': (0.72, 0.86, 1.0), 'lamp': (1.0, 0.6, 0.25), 'screen': (0.3, 0.7, 1.0), 'accent': (0.3, 0.9, 0.8), 'redlamp': (1.0, 0.2, 0.12), 'pink': (1.0, 0.35, 0.75)}
SIGNS = H.NEON + ['c_markt', 'c_bar', 'c_hotel', 'c_imbiss', 'c_med', 'c_teile', 'n_spaeti', 'n_pfand']
VERT = H.VERT + ['v_hotel', 'v_markt', 'v_kino']
POSTER = ['ad_fracht', 'ad_werft', 'ad_wacht', 'ad_kristall']
SPRITES = True     # False: kaum Leuchtpunkte fürs Spiel merken (jeder ist dort ein eigenes Bildchen; in großen Städten sparsam sein)

# ------------------------------------------------------------------ Boden
def ground(K, x0, y0, x1, y1, z=0.0, mat='kit_sta', per=8.0, tint=(1, 1, 1)):
    """Ebene Fläche mit kachelndem Belag (Texturkoordinaten in Metern / per). Mit K.lm bekommt sie ein eigenes Feld der Lichtkarte."""
    ch = 0; st = None
    if K.lm and not K._ov: K.charts.append((abs(x1 - x0), abs(y1 - y0))); ch = len(K.charts); st = ((0, 0), (1, 0), (1, 1), (0, 1))
    K.poly(((x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)), ((x0 / per, y0 / per), (x1 / per, y0 / per), (x1 / per, y1 / per), (x0 / per, y1 / per)), tint, mat, ch, st)
def road(K, a, b, w=RW, z=0.012):
    """Fahrbahn von a nach b (Mittellinie): Das Bild läuft längs, die ganze Breite ist eine Kachel."""
    L, ex, ey, nx, ny = H._edge(a, b); ch = 0; st = None
    if K.lm and not K._ov: K.charts.append((L, w)); ch = len(K.charts); st = ((0, 0), (1, 0), (1, 1), (0, 1))
    K.poly(((a[0] + nx * w / 2, a[1] + ny * w / 2, z), (b[0] + nx * w / 2, b[1] + ny * w / 2, z), (b[0] - nx * w / 2, b[1] - ny * w / 2, z), (a[0] - nx * w / 2, a[1] - ny * w / 2, z)),
           ((0, 0), (L / 10.24, 0), (L / 10.24, 1), (0, 1)), (1, 1, 1), 'kit_stb', ch, st)
def curb(K, x0, y0, x1, y1, h=SW, mat='kit_sta', per=8.0, z0=0.0, led=None):
    """Erhöhte Fläche mit Bordstein ringsum (Gehweg, Stufe, Podest)."""
    x0, x1 = min(x0, x1), max(x0, x1); y0, y1 = min(y0, y1), max(y0, y1)
    ground(K, x0, y0, x1, y1, h, mat, per)
    for (a, b) in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x1, y1), (x0, y1)), ((x0, y1), (x0, y0))):
        K.surf((a[0], a[1], z0), (b[0], b[1], z0), (a[0], a[1], h), 'plain', 'hull_mid')
        if led:
            L, ex, ey, nx, ny = H._edge(a, b); K.glow(led, ((a[0] + b[0]) / 2 + nx * 0.01, (a[1] + b[1]) / 2 + ny * 0.01, h - 0.07), (ex, ey, 0), (0, 0, 1), L - 0.2, 0.04)
def crosswalk(K, y, w=4.0):
    for i in range(9): K.floor_line((-4.4 + i * 1.1, y - w / 2), (-4.4 + i * 1.1, y + w / 2), 0.55, 'white', 0.03)

# ------------------------------------------------------------------ Licht und Schilder
def lamp_post(K, x, y, rz, h=7.2, arm=2.4, kind='light', power=1400.0):
    """Straßenlaterne: Sockel, Mast, schräger Arm, Leuchtenkopf (Arm zeigt nach -Y)."""
    with K.at((x, y, 0), rz):
        K.box((0.55, 0.55, 1.0), side='girder', tint='hull_dark', bevel=0.04)
        K.tube((0, 0, 0.9), (0, 0, h), 0.11, 'pipe', 'hull_dark', 8, r2=0.08, caps=False)
        K.beam((0, 0, h - 0.15), (0, -arm, h + 0.3), 0.14, 0.14, 'beam', 'hull_dark', bevel=0.0)
        K.box((0.5, 1.3, 0.16), (0, -arm + 0.2, h + 0.2), side='plain', tint='hull_mid', bevel=0.03, bottom=True)
        K.glow(kind, (0, -arm + 0.2, h + 0.195), (1, 0, 0), (0, -1, 0), 0.38, 1.1)
        K.light(kind, (0, -arm + 0.2, h + 0.1), 5.0); K.lamp((0, -arm + 0.2, h - 0.4), COL[kind], power, 0.3)
        K.box((0.34, 0.26, 0.6), (0, -0.18, 1.2), side='plain', tint='hull_mid', bevel=0.03, bottom=True); K.glow('green', (0.08, -0.315, 1.62), (1, 0, 0), (0, 0, 1), 0.05, 0.05)
def bollard(K, x, y, kind='cool'):
    K.tube((x, y, 0), (x, y, 0.85), 0.13, 'plain', 'hull_dark', 8); K.tube((x, y, 0.62), (x, y, 0.7), 0.14, 'plain', 'none', 8, caps=False)
    K.glowbox(kind, (0.2, 0.2, 0.05), (x, y, 0.88))
def blade_sign(K, x, y, z, nx, ny, name, w=1.4):
    """Auslegerschild quer zur Fassade (von beiden Straßenrichtungen lesbar): (x, y) auf der Fassade, (nx, ny) zeigt nach außen."""
    import kit_lib as L_
    d = L_.CITY.get(name) or L_.CITY2[name]; h = w * d['h'] / d['w']; c = -(0.5 + w / 2)
    with K.at((x, y, z), H._face(nx, ny)):
        for s in (-1, 1): K.beam((0, 0.05, s * (h / 2 + 0.12)), (0, c - w / 2 - 0.1, s * (h / 2 + 0.12)), 0.09, 0.09, 'beam', 'hull_dark', bevel=0.0)
        K.box((0.2, w + 0.16, h + 0.16), (0, c, -h / 2 - 0.08), side='beam', tint='hull_dark', bevel=0.0, bottom=True)
        K.neon(name, (0.105, c, 0), (0, 1, 0), (0, 0, 1), w, h, 0.01); K.neon(name, (-0.105, c, 0), (0, -1, 0), (0, 0, 1), w, h, 0.01)
    if SPRITES: K.light('screen', (x + nx * (0.5 + w / 2), y + ny * (0.5 + w / 2), z), 3.0)
def cable_span(K, a, b, sag=1.4, lanterns=5, kinds=('lamp',), power=0.0, bundle=3, seg=8):
    """Kabel quer über die Straße mit Lampions; power > 0: jeder zweite bekommt eine Lichtquelle für die Vorschau."""
    K.cable(a, b, sag, 0.05, seg)
    if bundle > 1: K.cable((a[0], a[1], a[2] + 0.5), (b[0], b[1], b[2] + 0.3), sag * 1.5, 0.035, seg)
    if bundle > 2: K.cable((a[0], a[1] + 0.4, a[2] - 0.4), (b[0], b[1] - 0.3, b[2] + 0.6), sag * 0.6, 0.03, seg)
    for i in range(1, lanterns + 1):
        t = i / (lanterns + 1); px, py = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t; pz = a[2] + (b[2] - a[2]) * t - sag * math.sin(PI * t); k = kinds[i % len(kinds)]
        K.tube((px, py, pz - 0.28), (px, py, pz), 0.015, 'plain', 'black', 4, caps=False); K.glowbox(k, (0.34, 0.34, 0.44), (px, py, pz - 0.5))
        if SPRITES or i == (lanterns + 1) // 2: K.light(k, (px, py, pz - 0.45), 1.8)
        if power and i % 2: K.lamp((px, py, pz - 0.8), COL[k], power, 0.2)
def ad_pylon(K, x, y, h=9.0, names=None, holo=True):
    """Freistehende Werbesäule: vier senkrechte Leuchtschilder, Lichtfugen, Ringhologramm."""
    R = K.R; names = names or [R.choice(VERT) for _ in range(4)]
    K.box((1.5, 1.5, 0.8), (x, y, 0), side='girder', tint='hull_dark', bevel=0.05); K.box((1.1, 1.1, h), (x, y, 0.7), side='beam', tint='hull_dark', bevel=0.0, along='z', bottom=True)
    for i, (nx, ny) in enumerate(((0, -1), (1, 0), (0, 1), (-1, 0))):
        K.neon(names[i], (x + nx * 0.57, y + ny * 0.57, 0.7 + h * 0.5), (-ny, nx, 0), (0, 0, 1), 0.9, None, 0.01)
        K.glow('cool', (x + nx * 0.56, y + ny * 0.56, 1.0), (-ny, nx, 0), (0, 0, 1), 0.9, 0.06)
    K.box((1.6, 1.6, 0.3), (x, y, h + 0.7), side='girder', tint='hull_dark', bevel=0.03, bottom=True)
    if holo: K.holo('n_ring', (x, y, h + 2.6), (1, 0, 0), (0, 0, 1), 2.6); K.holo('n_ring', (x, y, h + 2.6), (0, 1, 0), (0, 0, 1), 2.6)
    K.light('screen', (x, y, h * 0.6), 6.0); K.lamp((x - 1.6, y - 1.6, 4.0), COL['pink'], 400, 0.4)

# ------------------------------------------------------------------ Technik
def pipe_run(K, a, b, z, r=0.4, tint='hull_mid', off=0.75, drop=True):
    """Rohrleitung vor einer Fassade (von a nach b, Außenseite rechts der Laufrichtung) mit Konsolen und Flanschen; drop: am Ende hinunter zum Boden."""
    L, ex, ey, nx, ny = H._edge(a, b); A = (a[0] + nx * off, a[1] + ny * off, z); B = (b[0] + nx * off, b[1] + ny * off, z)
    K.pipe([A, B] + ([(B[0], B[1], 0.3)] if drop else []), r, tint)
    n = max(1, int(L // 4))
    for i in range(n + 1):
        t = i / n; px, py = A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t
        K.beam((px - nx * off, py - ny * off, z - r - 0.1), (px, py, z - r - 0.1), 0.14, 0.14, 'beam', 'hull_dark', bevel=0.0)
        K.tube((px - ex * 0.07, py - ey * 0.07, z), (px + ex * 0.07, py + ey * 0.07, z), r * 1.25, 'plain', 'steel', 10, caps=False)
def tank_stack(K, x, y, r=2.4, n=3, hs=4.6, tint='hull_mid', rz=0.0):
    """Gestapelte Großtanks mit Ringen, Warnband, Leiter, Steigleitung und Lüfter (wie neben Werkstätten und Garküchen)."""
    K.tube((x, y, 0), (x, y, 0.7), r + 0.35, 'girder', 'hull_dark', 16, mode='around'); z = 0.7
    for i in range(n):
        K.tube((x, y, z), (x, y, z + hs), r, 'siding', tint, 16, mode='around', caps=False)
        K.tube((x, y, z + hs - 0.25), (x, y, z + hs + 0.25), r + 0.16, 'girder', 'hull_dark', 16, mode='around', caps=False)
        if i == 1: K.tube((x, y, z + 1.2), (x, y, z + 2.0), r + 0.03, 'hazard', 'none', 16, mode='around', caps=False)
        z += hs
    K.tube((x, y, z), (x, y, z + r * 0.5), r, 'roofing', tint, 16, mode='around', r2=r * 0.4); K.vent_unit((x, y, z + r * 0.45), sx=1.4, sy=1.4, sz=0.8)
    with K.at((x, y, 0), rz):
        K.ladder(z, (0, -r - 0.02, 0)); K.pipe([(r + 0.5, 0, 0.4), (r + 0.5, 0, z - 1.0), (r * 0.6, 0, z - 1.0)], 0.22, 'yellow')
        K.pipe([(-r - 0.4, 0.4, 0.4), (-r - 0.4, 0.4, z * 0.55)], 0.16, 'steel'); K.panel('ctrl', (1.3, -r - 0.1, 1.0), 0.0, 0.9, 0.9, 0.3, 'hull_light', glow='screen')
        K.glowbox('lamp', (0.3, 0.2, 0.3), (-1.2, -r - 0.15, 2.4)); K.light('lamp', (-1.2, -r - 0.3, 2.4), 2.5)
def glass_rail(K, a, b, h=1.15, led='cool'):
    """Geländer mit Pfosten, Handlauf, dunklen Scheiben und Lichtfuge am Fuß (a, b mit Höhe)."""
    L, ex, ey, nx, ny = H._edge(a, b); z = a[2]; n = max(1, round(L / 2.4)); rz = math.atan2(ey, ex); mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    for i in range(n + 1): K.box((0.1, 0.14, h), (a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, z), side='plain', tint='hull_dark', bevel=0.0, rz=rz, along='z')
    K.beam((a[0], a[1], z + h), (b[0], b[1], z + h), 0.16, 0.1, 'plain', 'hull_mid', bevel=0.02)
    for s in (-1, 1):
        K.glass((mx, my, z + h * 0.52), (ex * s, ey * s, 0), (0, 0, 1), L - 0.1, h - 0.3, 0.02)
        if led: K.glow(led, (mx, my, z + 0.07), (ex * s, ey * s, 0), (0, 0, 1), L - 0.2, 0.05, 0.08)

# ------------------------------------------------------------------ Ladenbuchten (Ursprung an der Rückwand der Arkade, offen zur Straße)
def bay_stall(K, xw, yc, side, w, sign=None):
    """Offener Stand mit Regalwand, Tresen, Vordach und Schildblende."""
    with K.at((xw, yc, SW), H._face(-side, 0)):
        K.shop_bay((0, 0, 0), 0.0, min(w - 0.4, 5.6), 3.6, 3.4)
        if sign: K.neon(sign, (0, -3.13, 3.4 + 0.86), (1, 0, 0), (0, 0, 1), min(w - 1.4, 4.0))
def bay_glass(K, xw, yc, side, w, sign=None, kind=None):
    """Laden mit Tür und hell erleuchtetem Schaufenster: Sprossen, Auslage als Schattenriss, Leuchtschrift, Plakat."""
    R = K.R; kind = kind or R.choice(['light', 'cool', 'lamp', 'screen', 'cool', 'light'])
    with K.at((xw, yc, SW), H._face(-side, 0)):
        K.box((w - 0.4, 0.25, 0.7), (0, -0.1, 0), side='plain', tint='hull_mid', bevel=0.02)
        dw = 1.5; wx = -(w / 2 - 0.6 - dw / 2); K.door((wx, -0.05, 0), 0.0, 'hull_light', 'hull_dark', dw, 2.4)
        ww = w - dw - 1.9; cx = wx + dw / 2 + 0.6 + ww / 2
        K.glow(kind, (cx, -0.04, 1.95), (1, 0, 0), (0, 0, 1), ww, 2.5)
        m = max(2, round(ww / 1.3))
        for j in range(m + 1): K.box((0.1, 0.16, 2.6), (cx - ww / 2 + ww * j / m, -0.08, 0.7), side='plain', tint='hull_dark', bevel=0.0, along='z')
        K.box((ww + 0.2, 0.2, 0.14), (cx, -0.08, 3.25), side='plain', tint='hull_dark', bevel=0.0, bottom=True)
        for j in range(R.randint(2, 5)): K.box((R.uniform(0.3, 0.7), 0.05, R.uniform(0.5, 1.5)), (cx + R.uniform(-ww / 2 + 0.4, ww / 2 - 0.4), -0.07, 0.72), side='plain', tint='black', bevel=0.0)
        if sign: K.neon(sign, (cx, -0.12, 4.05), (1, 0, 0), (0, 0, 1), min(ww * 0.85, 4.4))
        if R.random() < 0.6: K.sign(R.choice(POSTER), (wx, -0.1, 3.7), (1, 0, 0), (0, 0, 1), 1.4)
        K.lamp((cx, -1.6, 2.6), COL[kind], 260, 0.4)
def bay_shutter(K, xw, yc, side, w):
    """Geschlossener Laden: Rollladen, Wandleuchte, Abgestelltes davor."""
    R = K.R
    with K.at((xw, yc, SW), H._face(-side, 0)):
        K.shutter(w - 1.0, 3.3, (0, -0.03, 0)); K.wall_lamp((0, 0, 4.3), 0.0, R.choice(['lamp', 'redlamp', 'cool']), 180)
        K.decal(R.choice(['tag', 'stain1', 'leak2', 'rust1']), (R.uniform(-1, 1), -0.06, 1.7), (1, 0, 0), (0, 0, 1), 1.8)
        for j in range(R.randint(1, 3)): K.barrel((R.uniform(-w / 2 + 0.8, w / 2 - 0.8), -R.uniform(0.7, 1.4), 0), R.choice(['red', 'blue', 'yellow', 'hull_light']))
        if R.random() < 0.6: K.crate(1.2, 1.2, 1.0, (R.uniform(-1, 1), -1.9, 0), R.uniform(-0.4, 0.4), 'hull_light', 'warn')
def bay_service(K, xw, yc, side, w):
    """Technikbucht: Stahltür, Schaltkasten, Lüfter, Steigleitungen, Automat."""
    R = K.R
    with K.at((xw, yc, SW), H._face(-side, 0)):
        K.door((-w / 4, -0.05, 0)); K.panel('ctrl', (w / 4, 0, 1.2), 0.0, 1.0, 1.0, 0.25, 'hull_light', glow='screen'); K.panel('vent', (w / 4, 0, 2.9), 0.0, 1.5, 1.1, 0.4, 'hull_mid')
        K.pipe([(w / 2 - 0.7, -0.35, 0.1), (w / 2 - 0.7, -0.35, GF - SW - 0.3)], 0.2, 'yellow'); K.pipe([(w / 2 - 1.2, -0.3, 0.1), (w / 2 - 1.2, -0.3, GF - SW - 0.3)], 0.14, 'steel')
        K.vending((-w / 2 + 1.0, -0.5, 0), 0.0); K.bin((0.2, -0.6, 0)); K.lamp((0, -1.5, 3.0), COL['cool'], 160, 0.4)

# ------------------------------------------------------------------ Häuser an der Straße
def street_building(K, y0, y1, side, h, seed, depth=16.0):
    """Haus an der Baulinie: Obergeschosse mit Hochhausfassade über einer Arkade, Stützen, Ladenbuchten, Schilder, Rohre, Vordächer."""
    R = random.Random(seed * 101 + 7); KR = K.R; K.R = R
    try:
        h = H.F32(h - GF) + GF; xb = side * BL; xr = side * (BL + AR); xk = side * (BL + depth)
        body = H.rect((xb + xk) / 2, (y0 + y1) / 2, depth, y1 - y0); kind = R.choice(['c', 'c', 'b', 'a', 'b']); tint = R.choice(H.PALETTE)
        H.shaft(K, body, GF, h, kind, tint); H.underside(K, body, GF); H.parapet(K, body, h, 1.1, 0.3)
        H.band(K, body, GF - 0.1, 0.9, 0.35, 'hull_dark', R.choice(['cool', 'lamp', 'light', 'accent']), strip='beam')
        if kind != 'b' and R.random() < 0.6: H.fins(K, body, GF + 0.8, h, 6.0, 0.5, 0.4)
        elif h - GF > 14: H.ledges(K, body, GF, h, 12.8, 0.4, 0.4)
        H.roof_mech(K, body, h, R.randint(2, 5)); H.ac_units(K, body, GF + 1, h - 1, R.randint(4, 12))
        if R.random() < 0.4: H.crown_spikes(K, body, h, 2, (5, 12), 0.2)
        core = H.rect((xr + xk) / 2, (y0 + y1) / 2, depth - AR, y1 - y0 - 0.2); H.shaft(K, core, 0.0, GF, 'b', H.T_DARK, roof=False)
        n = max(1, round((y1 - y0) / 6.2)); bw = (y1 - y0) / n
        for j in range(n + 1): H.pier(K, xb + side * 0.45, y0 + bw * j + (0.35 if j == 0 else -0.35 if j == n else 0), 0.9, 0.7, 0.0, 0.0, GF, H.T_DARK, cap=False)
        for j in range(n):
            yc = y0 + bw * (j + 0.5); t = R.random(); sign = R.choice(SIGNS)
            if t < 0.42: bay_stall(K, xr, yc, side, bw - 1.0, sign)
            elif t < 0.76: bay_glass(K, xr, yc, side, bw - 1.0, sign)
            elif t < 0.89: bay_shutter(K, xr, yc, side, bw - 1.0)
            else: bay_service(K, xr, yc, side, bw - 1.0)
            K.glow(R.choice(['light', 'cool', 'lamp']), (xb + side * 1.9, yc, GF - 0.02), (1, 0, 0), (0, -1, 0), 0.22, bw - 1.8)      # Arkadenlicht
            r = R.random()
            if r < 0.3:      # Vordach über dem Gehweg mit Lichtband
                K.box((2.0, bw - 1.2, 0.14), (xb - side * 1.0, yc, 4.0), side='beam', top='roof', tint='hull_dark', bevel=0.0, bottom=True)
                K.glow('light', (xb - side * 1.0, yc, 3.99), (1, 0, 0), (0, -1, 0), 0.2, bw - 2.0); K.lamp((xb - side * 1.0, yc, 3.4), COL['light'], 220, 0.3)
                for s in (-1, 1): K.beam((xb, yc + s * (bw / 2 - 0.8), GF - 0.2), (xb - side * 1.9, yc + s * (bw / 2 - 0.8), 4.1), 0.06, 0.06, 'plain', 'steel', bevel=0.0)
            elif r < 0.62: K.neon(R.choice(SIGNS), (xb - side * 0.08, yc, GF + 1.7), (0, -side, 0), (0, 0, 1), min(bw - 1.6, 4.6))
            if R.random() < 0.55: blade_sign(K, xb, y0 + bw * j + (0.9 if j == 0 else 0), GF + R.uniform(2.0, 7.0), -side, 0, R.choice(VERT), R.uniform(1.0, 1.5))
        # große Tafel oder Rohrleitung an den Obergeschossen
        r = R.random()
        if r < 0.45 and h - GF > 12: H.billboard(K, xb, (y0 + y1) / 2 + R.uniform(-3, 3), GF + (h - GF) * R.uniform(0.45, 0.75), -side, 0, R.uniform(6, 10), R.choice(H.ADS + SIGNS), 0.7, glow='cool')
        elif r < 0.8:
            a, b = ((xb, y1 - 1), (xb, y0 + 1)) if side > 0 else ((xb, y0 + 1), (xb, y1 - 1))
            pipe_run(K, a, b, GF + R.uniform(2.6, 5.0), R.uniform(0.3, 0.5), R.choice(['hull_mid', 'rust', 'hull_light', 'yellow']), 0.8, drop=False)
    finally: K.R = KR
def furnish(K, y0, y1, side, R):
    """Möbel am Bordstein: Bänke, Kübel, Abfalleimer, Automaten, Auskunftssäulen, Poller, Kisten."""
    x = side * (RW / 2 + 1.5); y = y0 + R.uniform(2, 6); f = H._face(side, 0)
    while y < y1 - 3:
        t = R.random()
        if t < 0.2: K.bench(3.0, (x, y, SW), f, True, R.choice(['i_fabric', 'i_red', 'i_wall']))
        elif t < 0.38: K.planter(R.uniform(1.4, 2.6), 1.3, (x, y, SW), PI / 2, 0.75, 2)
        elif t < 0.5: K.bin((x, y, SW))
        elif t < 0.6: K.vending((x, y, SW), f)
        elif t < 0.68: K.kiosk((x, y, SW), f)
        elif t < 0.8:
            for k in range(3): bollard(K, side * (RW / 2 + 0.45), y + k * 1.5)
        elif t < 0.88: K.crate(1.4, 1.4, 1.2, (x, y, SW), R.uniform(-0.4, 0.4), 'hull_light', 'warn'); K.crate(1.0, 1.0, 0.9, (x + 0.2, y + 1.4, SW), 0.3, 'yellow')
        y += R.uniform(5.5, 10.0)
def alley(K, y0, y1, side, depth, R):
    """Gasse zwischen zwei Häusern: Belag, Lampions an Kabeln, Rohre an beiden Wänden, Kisten, Fässer, farbiges Licht."""
    xa, xz = side * BL, side * (BL + depth + 4); w = y1 - y0
    curb(K, xa + side * AR, y0, xz, y1, SW, 'kit_stc', 4.0)
    for k in range(3):
        xx = xa + side * (2.5 + k * 5.0); cable_span(K, (xx, y0, R.uniform(5.5, 8.5)), (xx + side * R.uniform(-1, 1), y1, R.uniform(5.5, 8.5)), 0.5, 2, (R.choice(['lamp', 'cool', 'redlamp']),), 90.0 if k == 1 else 0.0)
    xl, xh = min(xa + side * 1.0, xz - side * 1.0), max(xa + side * 1.0, xz - side * 1.0)
    pipe_run(K, (xl, y0), (xh, y0), R.uniform(3.2, 4.4), 0.3, R.choice(['rust', 'hull_mid']), -0.7, drop=False)      # negative Ausladung: in die Gasse hinein
    pipe_run(K, (xh, y1), (xl, y1), R.uniform(2.6, 3.6), 0.22, 'yellow', -0.6, drop=False)
    for k in range(R.randint(2, 4)): K.barrel((xa + side * R.uniform(4.5, depth), y0 + 0.8 + R.random() * 0.6, SW), R.choice(['red', 'blue', 'hull_light']))
    K.crate(1.5, 1.5, 1.3, (xa + side * (AR + 2.2), y1 - 1.1, SW), 0.1, 'hull_light', 'warn'); K.bin((xa + side * (AR + 0.6), y0 + 0.6, SW))
    blade_sign(K, xa + side * 0.3, y0, GF + 0.6, 0, 1, R.choice(VERT), 1.1); K.lamp((xa + side * 8.0, (y0 + y1) / 2, 3.4), R.choice([COL['pink'], COL['accent'], COL['lamp']]), 320, 0.4)

# ------------------------------------------------------------------ Platz
def plaza(K, x0, y0, x1, y1, R, h=1.1):
    """Erhöhter Platz neben der Straße: Stufen zur Straße, Geländer mit Lichtfuge, Metalldeck in der Mitte, Kübel, Bänke, zwei Stände Rücken an Rücken,
    Werbesäule, Laternen, Tanks mit Leitungen am hinteren Rand."""
    curb(K, x0 - 1.4, y0 + 5, x0 + 0.2, y1 - 5, SW + 0.3, led='cool'); curb(K, x0 - 0.7, y0 + 5, x0 + 0.2, y1 - 5, SW + 0.6, led=None)
    curb(K, x0, y0, x1, y1, h, led='cool')
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    ground(K, cx - 6, cy - 9, cx + 6, cy + 9, h + 0.006, 'kit_stc', 4.0)
    for (a, b) in (((x0, y0, h), (x1, y0, h)), ((x0, y1, h), (x1, y1, h)), ((x0, y0, h), (x0, y0 + 5, h)), ((x0, y1 - 5, h), (x0, y1, h))): glass_rail(K, a, b)
    for (px, py) in ((x0 + 3.0, y0 + 2.6), (x0 + 3.0, y1 - 2.6), (cx - 7.5, cy), (cx + 8.5, cy - 8), (cx + 8.5, cy + 8)):
        K.planter(2.4, 1.4, (px, py, h), 0.0, 0.8, 3)
    K.bench(3.0, (x0 + 3.0, y0 + 4.2, h), PI, True); K.bench(3.0, (x0 + 3.0, y1 - 4.2, h), 0.0, True); K.bench(3.0, (cx - 6.2, cy - 3.2, h), -PI / 2, True, 'i_red'); K.bench(3.0, (cx - 6.2, cy + 3.2, h), -PI / 2, True, 'i_red')
    K.bin((x0 + 5.2, y0 + 2.6, h)); K.bin((cx - 7.5, cy + 2.2, h)); K.vending((x1 - 1.0, y0 + 3.5, h), H._face(-1, 0)); K.vending((x1 - 1.0, y0 + 5.0, h), H._face(-1, 0)); K.kiosk((x0 + 6.5, cy, h), H._face(-1, 0))
    # zwei Stände Rücken an Rücken an einer Mittelwand
    wx = cx + 1.5
    K.box((0.4, 12.4, 4.9), (wx, cy, h), side='siding', top='roof', tint='hull_dark', bevel=0.03)
    for s in (-1, 1):
        for dy in (-3.1, 3.1):
            with K.at((wx + s * 0.2, cy + dy, h), H._face(s, 0)):
                K.shop_bay((0, 0, 0), 0.0, 5.6, 3.6, 3.4); K.neon(R.choice(SIGNS), (0, -3.13, 3.4 + 0.86), (1, 0, 0), (0, 0, 1), 4.0)
    K.box((8.6, 13.2, 0.25), (wx, cy, h + 4.9), side='beam', top='roof', tint='hull_dark', bevel=0.0, bottom=True); K.vent_unit((wx, cy - 3, h + 5.15)); K.vent_unit((wx, cy + 3.4, h + 5.15), sx=1.6, sy=1.6, sz=1.0)
    H.billboard(K, wx, cy, h + 5.15, -1, 0, 7.0, R.choice(SIGNS), 0.6, legs=1.6)
    ad_pylon(K, x0 + 6.5, y0 + 6.0, 8.0); ad_pylon(K, x0 + 6.5, y1 - 6.0, 6.5)
    for (px, py, rz) in ((x0 + 1.2, y0 + 9, H._face(1, 0)), (x0 + 1.2, y1 - 9, H._face(1, 0)), (x1 - 1.4, cy, H._face(-1, 0))):
        with K.at((0, 0, h)): lamp_post(K, px, py, rz, 6.4, 2.0, 'cool', 1100.0)
    tank_stack(K, x1 + 3.4, y0 + 4.5, 2.6, 3, 4.6, 'hull_mid', PI / 2); tank_stack(K, x1 + 3.2, y0 + 11.0, 1.9, 2, 4.2, 'hull_light', PI / 2); tank_stack(K, x1 + 3.4, y1 - 5.0, 2.4, 4, 4.2, 'rust', PI / 2)
    pipe_run(K, (x1 + 0.6, y0 + 14.0), (x1 + 0.6, y1 - 8.5), 6.8, 0.5, 'hull_mid', 0.9, drop=True); pipe_run(K, (x1 + 0.6, y0 + 13.5), (x1 + 0.6, y1 - 9.0), 5.4, 0.3, 'yellow', 0.9, drop=False)
    yy = y0 + 14.0
    while yy < y1 - 8.0: K.box((0.3, 0.3, 6.3), (x1 + 1.5, yy, 0), side='girder', tint='hull_dark', bevel=0.0, along='z'); yy += 5.5
    for k in range(4): K.lamp((cx - 4 + k * 3.0, cy + (-7 if k % 2 else 7), h + 3.2), (COL['accent'], COL['pink'], COL['cool'], COL['lamp'])[k], 300, 0.4)

# ------------------------------------------------------------------ Schaubühne
def street_scene(lib):
    """Straße durch die Schlucht der Hochhaus-Stadt: 244 m Fahrbahn, Häuser mit Arkaden auf beiden Seiten, Gassen, Platz, Stege, Kabel, Fahrzeuge."""
    K = lib.Kit('Hochhaus_Strasse', seed=303); K.seg = 60.0; R = random.Random(404); K.R = R
    Y0, Y1 = -112.0, 132.0; PZ0, PZ1 = 18.0, 66.0; DE = 16.0
    with K.at((0, 0, Z0)):
        ground(K, -44, Y0 - 4, 44, Y1 + 4, 0.0, 'kit_sta')
        road(K, (0, Y0 - 4), (0, Y1 + 4))
        for side in (-1, 1): curb(K, side * RW / 2, Y0 - 4, side * (BL + AR), Y1 + 4, SW)
        # Häuser und Gassen: West durchgehend, Ost mit Platz
        seed = 0; gaps = []
        for side, spans in ((-1, ((Y0, Y1),)), (1, ((Y0, PZ0 - 5), (PZ1 + 5, Y1)))):
            for (a, b) in spans:
                y = a
                while y < b - 12:
                    L = min(R.uniform(18, 31), b - y); seed += 1
                    if b - (y + L) < 14: L = b - y
                    street_building(K, y, y + L, side, R.uniform(17, 48), seed, DE + R.choice([0, 0, 3]))
                    y += L
                    if y < b - 12: gaps.append((y, y + 5.0, side)); y += 5.0
        for (a, b, side) in gaps: alley(K, a, b, side, DE, R)
        for (a, b) in ((PZ0 - 5, PZ0), (PZ1, PZ1 + 5)): alley(K, a, b, 1, DE, R)
        plaza(K, BL + 1.4, PZ0, 36.0, PZ1, R)
        # Laternen, Möbel, Überwege
        k = 0; y = Y0 + 8
        while y < Y1 - 4:
            side = 1 if k % 2 else -1
            if not (side > 0 and PZ0 + 2 < y < PZ1 - 2): lamp_post(K, side * (RW / 2 + 0.55), y, H._face(-side, 0), 7.2, 2.4, 'lamp' if k % 3 else 'light', 1000.0)
            y += 15.0; k += 1
        for side in (-1, 1):
            for (a, b) in (((Y0, Y1),) if side < 0 else ((Y0, PZ0 - 5), (PZ1 + 5, Y1))): furnish(K, a, b, side, R)
        for yc in (-8.0, PZ0 + 12.0, 96.0):
            crosswalk(K, yc)
            for side in (-1, 1):
                for dy in (-2.8, 2.8): bollard(K, side * (RW / 2 + 0.45), yc + dy, 'lamp')
        # über der Straße: Kabel mit Lampions, zwei Stege
        y = Y0 + 12
        while y < Y1 - 6:
            cable_span(K, (-BL, y, R.uniform(8.5, 12.5)), (BL, y + R.uniform(-4, 4), R.uniform(8.5, 12.5)), R.uniform(1.0, 2.0), R.randint(4, 6), R.choice([('lamp',), ('lamp', 'cool'), ('redlamp', 'lamp'), ('cool',)]), 110.0)
            y += R.uniform(12, 20)
        cols = (COL['pink'], COL['accent'], COL['lamp'], COL['screen'], COL['pink'], COL['cool']); k = 0; y = Y0 + 6
        while y < Y1:
            sd = 1 if k % 2 else -1; K.lamp((sd * (BL - 1.5), y, R.uniform(4.5, 7.5)), cols[k % len(cols)], 620, 0.5); y += 13.0; k += 1
        for (yc, nm) in ((-76.0, 'n_nachtmarkt'), (4.0, 'n_neonhafen'), (112.0, 'n_karaoke')):
            K.cable((-BL, yc, 10.2), (BL, yc, 10.2), 0.25, 0.05, 6); K.cable((-BL, yc, 8.2), (BL, yc, 8.2), 0.2, 0.04, 6)
            K.box((6.6, 0.25, 1.9), (0, yc, 8.3), side='beam', tint='hull_dark', bevel=0.0, bottom=True); K.neon(nm, (0, yc - 0.14, 9.25), (1, 0, 0), (0, 0, 1), 6.0); K.neon(nm, (0, yc + 0.14, 9.25), (-1, 0, 0), (0, 0, 1), 6.0)
        for yc in (-44.0, 84.0):
            K.walkway(2 * BL + 0.4, 2.4, 6.6, (0, yc, 0), 0.0, (True, True), 2 * BL)
            K.glow('cool', (0, yc, 6.36), (1, 0, 0), (0, -1, 0), 2 * BL - 2, 0.3); K.neon(R.choice(SIGNS), (0, yc - 1.25, 7.45), (1, 0, 0), (0, 0, 1), 5.0); K.neon(R.choice(SIGNS), (0, yc + 1.25, 7.45), (-1, 0, 0), (0, 0, 1), 5.0)
        # Fahrzeuge und Fracht
        K.hauler((-2.7, 44.0, 0.02), 0.0); K.cart((2.9, -62.0, 0.02), PI); K.hauler((2.7, 108.0, 0.02), PI, 'blue'); K.cart((-2.9, -14.0, 0.02), 0.0)
        K.container((-BL - 8.0, Y0 - 1.0, 0), 0.0, 'orange', '41')
    ob = K.build('Hochhaus_Kit'); ob['gassen'] = repr(gaps)      # Lage der Gassen (von, bis, Seite) für Kamerafahrten
    return ob
