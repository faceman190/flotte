# Quartier der Bastion (Alpha nach 1.58): ein eigener kleiner Wohnraum je Pilot, erreichbar mit dem Aufzug „QUARTIERE“ auf Deck 3.
# Läuft nach bk_kit.py, bk_mehr.py, bk_med.py und rh_kit.py im selben Namensraum (Materialien, Bauhelfer, Busch der Rundhalle).
#
# Aufbau (Ortskoordinaten des Quartiers, Boden bei z = 0, Fenster nach +x):
#   Raum     x −3,2 … 3,2, y −2,2 … 2,2, Lichtvoute: umlaufender Deckenrand (Unterkante 2,45) mit warmem Licht in die Deckenmitte (2,8)
#   Vorraum  x −4,9 … −3,32, y −1 … 1, Decke 2,45: Aufzugstür an der Stirnseite, Waschplatz, Garderobe, Türschild (Nummer setzt das Spiel)
#   Möbel    Koje in einer Nische (Nordostecke, unter dem Fenster nicht), Fensterbank unter dem Panoramafenster, Schreibtisch mit zwei
#            Bildschirmen und Wandbord (Plätze für die Schiffsmodelle), Spind, offenes Regal (Plätze für Fundstücke), Sessel mit Stehlampe
# Im Plan der Rundhalle liegt das Quartier weit abseits (QX, QY): Das Spiel zeichnet nur, was näher als 70 m ist, Halle und Quartier
# sehen einander also nie. Der Aufzug versetzt die Figur nur.
import json
QX, QY = 0.0, 150.0
RQ_X, RQ_Y, RQ_H = 3.2, 2.2, 2.45          # halbe Raumlänge, halbe Raumbreite, Unterkante Deckenrand
VX0, VX1, VY = -4.9, -3.32, 1.0             # Vorraum
CEIL_C = 2.8                                # Deckenmitte (über der Voute)
SOF = 0.5                                   # Breite des Deckenrands
WIN = (-1.85, 0.75, 0.85, 2.15)             # Fenster: y0, y1, z0, z1
PORT = (-0.65, 0.65, 0.0, 2.2)              # Durchgang Vorraum → Raum
DOOR = (-0.6, 0.6, 0.0, 2.2)                # Aufzugstür
WARM3 = (1.0, 0.8, 0.6)

def col(name, parent=None):
    c = bpy.data.collections.new(name); (parent or SC.collection).children.link(c); return c
C_DECK, C_CEIL, C_SIGN, C_LIGHT, C_CAM = col('Deck'), col('Decke'), col('Schilder'), col('Licht'), col('Kameras')

# ---------- Materialien des Quartiers ----------
M['q_pan'] = mk('Wandpaneel warm', (0.24, 0.23, 0.21), 0.25, 0.5, var=0.1, streak=0.12, bump=0.22, wear=0.45)
M['q_pan2'] = mk('Wandpaneel warm hell', (0.32, 0.305, 0.28), 0.2, 0.52, var=0.1, streak=0.1, bump=0.22, wear=0.45)
M['q_pand'] = mk('Wandpaneel dunkel', (0.055, 0.06, 0.066), 0.45, 0.48, streak=0.25, bump=0.28, wear=0.7)
M['q_decke'] = mk('Decke hell', (0.42, 0.41, 0.39), 0.1, 0.62, var=0.08, bump=0.15, wear=0.2)
M['q_teppich'] = mk('Teppich', (0.045, 0.065, 0.085), 0.0, 0.95, var=0.22, bump=0.7, bscale=520.0, grime=False)
M['q_teprand'] = mk('Teppichrand', (0.32, 0.15, 0.05), 0.0, 0.92, var=0.2, bump=0.6, bscale=520.0, grime=False)
M['q_stoff'] = mk('Bettdecke', (0.03, 0.12, 0.13), 0.0, 0.9, var=0.22, bump=0.55, bscale=420.0, grime=False)
M['q_laken'] = mk('Bettlaken', (0.58, 0.58, 0.55), 0.0, 0.88, var=0.08, bump=0.35, bscale=420.0, grime=False)
M['q_rost'] = mk('Kissen rost', (0.34, 0.11, 0.045), 0.0, 0.9, var=0.18, bump=0.5, bscale=420.0, grime=False)
M['q_verbund'] = mk('Verbundplatte', (0.075, 0.062, 0.05), 0.0, 0.36, var=0.16, rvar=0.08, scale=5.0, wear=0.3)
M['q_kork'] = mk('Kork', (0.3, 0.19, 0.1), 0.0, 0.92, var=0.25, bump=0.7, bscale=300.0, grime=False)
M['q_papier'] = mk('Papier', (0.72, 0.71, 0.66), 0.0, 0.85, var=0.06, grime=False)
M['q_papiery'] = mk('Papier gelb', (0.78, 0.62, 0.18), 0.0, 0.85, var=0.06, grime=False)
M['q_leder'] = mk('Leder', (0.11, 0.055, 0.03), 0.0, 0.55, var=0.25, bump=0.3, bscale=300.0, wear=0.6)
M['q_keramik'] = mk('Keramik', (0.68, 0.68, 0.65), 0.0, 0.22, var=0.04, grime=False)
M['q_spiegel'] = mk('Spiegel', (0.82, 0.83, 0.85), 1.0, 0.03, var=0.0, rvar=0.0, grime=False)
M['q_oliv'] = mk('Stoff oliv', (0.045, 0.05, 0.03), 0.0, 0.9, var=0.2, bump=0.5, bscale=420.0, grime=False)
M['q_buch1'] = mk('Einband rot', (0.3, 0.05, 0.03), 0.0, 0.6, var=0.2, grime=False)
M['q_buch2'] = mk('Einband blau', (0.04, 0.08, 0.2), 0.0, 0.6, var=0.2, grime=False)
M['q_buch3'] = mk('Einband sand', (0.45, 0.36, 0.22), 0.0, 0.6, var=0.2, grime=False)
M['e_sockel'] = mk('Sockellicht warm', (1, 0.55, 0.2), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.5, 0.16), es=2.5, grime=False)
M['e_lese'] = mk('Leselicht', (1, 0.85, 0.65), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.8, 0.58), es=8.0, grime=False)
M['e_uhr'] = mk('Uhrziffern', (0.3, 0.9, 1), 0, 0.3, var=0, rvar=0, emit=(0.3, 0.85, 1.0), es=3.0, grime=False)
M['screen_q'] = stripes('Quartierschirm', (0.55, 0.38, 0.12), (0.03, 0.02, 0.008), 28, emit=1.6, direction='Z', duty=0.3)
M['screen_r'] = stripes('Rufschirm', (0.1, 0.55, 0.62), (0.0, 0.04, 0.05), 20, emit=1.8, direction='Z', duty=0.4)
au = M['sterne'].copy(); au.name = 'Ausblick'; M['ausblick'] = au      # Blick ins All: im Spiel ein eigener Himmel (Sterne und Planet nach der Blickrichtung)

# ---------- Bauhelfer ----------
def B(name, x0, x1, y0, y1, z0, z1, m, bev=0.004, rot=None):      # Quader nach seinen Grenzen
    return box(name, x1 - x0, y1 - y0, z1 - z0, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, m, bev, rot)
def RB(name, cx, cy, cz, sx, sy, sz, yaw, m, bev=0.004, pitch=0.0, roll=0.0):      # gedrehter Quader um seine Mitte
    return box(name, sx, sy, sz, cx, cy, cz, m, bev, (roll, pitch, yaw))
def sphere(name, r, x, y, z, m, seg=20, rings=12, sx=1.0, sy=1.0, sz=1.0):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    for v in bm.verts: v.co.x *= sx; v.co.y *= sy; v.co.z *= sz
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
    for p in me.polygons: p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me)); ob.location = (x, y, z); return ob
def spot(name, loc, rot, watt, col_, size_deg=70, blend=0.5, r=0.04):
    li = bpy.data.lights.new(name, 'SPOT'); li.energy = watt; li.color = col_; li.spot_size = math.radians(size_deg); li.spot_blend = blend; li.shadow_soft_size = r
    ob = bpy.data.objects.new(name, li); link(ob); ob.location = loc; ob.rotation_euler = rot; return ob
def minus(rect, holes):      # Rechteck (u0, u1, z0, z1) ohne die Löcher: Liste von Rechtecken
    out = [rect]
    for h in holes:
        nxt = []
        for (a0, a1, b0, b1) in out:
            if h[0] >= a1 or h[1] <= a0 or h[2] >= b1 or h[3] <= b0: nxt.append((a0, a1, b0, b1)); continue
            if h[0] > a0: nxt.append((a0, h[0], b0, b1))
            if h[1] < a1: nxt.append((h[1], a1, b0, b1))
            c0, c1 = max(a0, h[0]), min(a1, h[1])
            if h[2] > b0: nxt.append((c0, c1, b0, h[2]))
            if h[3] < b1: nxt.append((c0, c1, h[3], b1))
        out = nxt
    return [r for r in out if r[1] - r[0] > 0.02 and r[3] - r[2] > 0.02]
class Wall:      # Wand in eigenen Koordinaten: u längs, z hoch, d in die Wand hinein (Fläche bei d = 0)
    def __init__(self, axis, W, sgn, u0, u1, z1, holes=()):
        self.axis, self.W, self.sgn, self.u0, self.u1, self.z1, self.holes = axis, W, sgn, u0, u1, z1, list(holes)
    def p(self, u, z, d):
        if self.axis == 'y': return (u, self.W + self.sgn * d, z)      # Wand quer zu y (Nord, Süd)
        return (self.W + self.sgn * d, u, z)                          # Wand quer zu x (Ost, West)
    def slab(self, name, u0, u1, z0, z1, d0, d1, m, bev=0.004):
        a, b = self.p(u0, z0, d0), self.p(u1, z1, d1)
        return B(name, min(a[0], b[0]), max(a[0], b[0]), min(a[1], b[1]), max(a[1], b[1]), z0, z1, m, bev)
    def panels(self, seed, bands=((0.13, 0.95, 'q_pand'), (0.95, 2.2, 'q_pan'), (2.2, None, 'q_pand')), colw=0.78, ribs=True):
        R = random.Random(seed); L = self.u1 - self.u0; n = max(1, round(L / colw)); w = L / n; g = 0.004
        for r in minus((self.u0 - 0.13, self.u1 + 0.13, 0.0, self.z1 + 0.5), self.holes): self.slab('Wandrücken', r[0], r[1], r[2], r[3], 0.024, 0.12, M['wall4'], 0)      # über die Ecken hinaus: keine Spalten
        for (z0, z1, mat) in bands:
            z1 = self.z1 if z1 is None else z1
            if z1 - z0 < 0.03: continue
            for i in range(n):
                a, b = self.u0 + i * w, self.u0 + (i + 1) * w
                mm = mat
                if mat == 'q_pan' and R.random() < 0.3: mm = 'q_pan2'
                for r in minus((a, b, z0, z1), self.holes): self.slab('Wandpaneel', r[0] + g, r[1] - g, r[2] + g, r[3] - g, 0.0, 0.026, M[mm], 0.005)
        if ribs:
            for i in range(1, n):
                u = self.u0 + i * w
                for r in minus((u - 0.018, u + 0.018, 0.95, 2.2), self.holes): self.slab('Wandrippe', r[0], r[1], r[2], r[3], -0.014, 0.01, M['frame'], 0.004)
        for r in minus((self.u0, self.u1, 0.0, 0.13), self.holes):
            self.slab('Sockelleiste', r[0], r[1], 0.0, 0.12, -0.022, 0.0, M['frame'], 0.005); self.slab('Sockellicht', r[0] + 0.02, r[1] - 0.02, 0.112, 0.118, -0.024, -0.02, M['e_sockel'], 0)
        for r in minus((self.u0, self.u1, 0.93, 0.97), self.holes): self.slab('Wandleiste', r[0], r[1], 0.935, 0.965, -0.016, 0.0, M['frame'], 0.004)

# =====================================================================================
# Hülle: Boden, Wände, Fenster, Durchgang, Decke
# =====================================================================================
def q_huelle():
    X, Y = RQ_X, RQ_Y
    # Boden: Raumboden mit Fugen, Vorraum mit Noppenblech
    B('Raumboden', -X, X, -Y, Y, -0.12, 0.0, M['floor2'], 0)
    for x in (-1.6, 0.0, 1.6): B('Bodenfuge', x - 0.006, x + 0.006, -Y, Y, -0.001, 0.0015, M['frame'], 0)
    for y in (-1.1, 1.1): B('Bodenfuge', -X, X, y - 0.006, y + 0.006, -0.001, 0.0015, M['frame'], 0)
    B('Vorraumboden', VX0, VX1 + 0.14, -VY, VY, -0.12, 0.0, M['floor'], 0)
    B('Schwelle', VX1 - 0.02, -X + 0.02, PORT[0], PORT[1], -0.002, 0.008, M['steel'], 0.003)
    # Wände des Raums
    Wall('y', Y, 1, -X, X, RQ_H).panels(1)
    Wall('y', -Y, -1, -X, X, RQ_H).panels(2)
    Wall('x', X, 1, -Y, Y, RQ_H, [(WIN[0], WIN[1], WIN[2], WIN[3])]).panels(3)
    Wall('x', -X, -1, -Y, Y, RQ_H, [(PORT[0], PORT[1], PORT[2], PORT[3])]).panels(4)
    # Wände des Vorraums (dunkler, ohne Rippen) und die Rückseite der Raumwand neben dem Durchgang
    vb = ((0.13, 0.95, 'q_pand'), (0.95, 2.2, 'q_pan2'), (2.2, None, 'q_pand'))
    Wall('y', VY, 1, VX0, VX1, RQ_H).panels(5, vb, 0.8, False)
    Wall('y', -VY, -1, VX0, VX1, RQ_H).panels(6, vb, 0.8, False)
    Wall('x', VX0, -1, -VY, VY, RQ_H, [(DOOR[0], DOOR[1], DOOR[2], DOOR[3])]).panels(7, vb, 0.7, False)
    wb = Wall('x', VX1, 1, -VY, VY, RQ_H, [(PORT[0], PORT[1], PORT[2], PORT[3])])
    for r in minus((-VY, VY, 0.0, RQ_H), wb.holes): wb.slab('Wandstirn', r[0], r[1], r[2], r[3], -0.006, 0.1, M['q_pand'], 0.004)
    # Durchgang: Laibung und Rahmen auf beiden Seiten
    y0, y1, _, zt = PORT
    for sy in (y0, y1):
        s = 1 if sy > 0 else -1
        B('Laibung', VX1 - 0.006, -X + 0.006, min(sy, sy + s * 0.03), max(sy, sy + s * 0.03), 0.0, zt + 0.03, M['frame'], 0.004)
        for xx in (-X + 0.0, VX1 - 0.0):
            B('Türrahmen', xx - 0.03, xx + 0.03, min(sy, sy + s * 0.12), max(sy, sy + s * 0.12), 0.0, zt + 0.12, M['frame'], 0.008)
        B('Durchgangslicht', -X + 0.03, -X + 0.035, sy + s * 0.04 - 0.008, sy + s * 0.04 + 0.008, 0.25, zt - 0.1, M['e_sockel'], 0)
    B('Laibung oben', VX1 - 0.006, -X + 0.006, y0, y1, zt, zt + 0.03, M['frame'], 0.004)
    for xx in (-X, VX1): B('Türsturz', xx - 0.03, xx + 0.03, y0 - 0.12, y1 + 0.12, zt + 0.02, zt + 0.12, M['frame'], 0.008)
    # Fenster: tiefe Laibung (Hüllenstärke 0,35 m), Rahmen mit Eckblechen, zwei Scheiben, Sprosse, Bank davor
    wy0, wy1, wz0, wz1 = WIN; xd = X + 0.38
    B('Fensterlaibung unten', X, xd, wy0, wy1, wz0 - 0.06, wz0, M['wall2'], 0.004); B('Fensterlaibung oben', X, xd, wy0, wy1, wz1, wz1 + 0.06, M['wall2'], 0.004)
    B('Fensterlaibung', X, xd, wy0 - 0.06, wy0, wz0 - 0.06, wz1 + 0.06, M['wall2'], 0.004); B('Fensterlaibung', X, xd, wy1, wy1 + 0.06, wz0 - 0.06, wz1 + 0.06, M['wall2'], 0.004)
    for (a, b, c, d) in ((wy0 - 0.1, wy1 + 0.1, wz0 - 0.1, wz0 - 0.0), (wy0 - 0.1, wy1 + 0.1, wz1, wz1 + 0.1), (wy0 - 0.1, wy0, wz0, wz1), (wy1, wy1 + 0.1, wz0, wz1)):
        B('Fensterrahmen', X - 0.03, X + 0.01, a, b, c, d, M['frame'], 0.008)
    for (cy, cz, sy, sz) in ((wy0, wz0, 1, 1), (wy1, wz0, -1, 1), (wy0, wz1, 1, -1), (wy1, wz1, -1, -1)):      # Eckbleche (45°)
        prism('Eckblech', [(cy, cz), (cy + sy * 0.16, cz), (cy, cz + sz * 0.16)], X - 0.02, X + 0.3, M['frame'], 'X', 0.004)
        cyl('Eckschraube', 0.011, 0.012, X - 0.022, cy + sy * 0.05, cz + sz * 0.05, M['steel'], 'X', n=6, bev=0)
    mid = (wy0 + wy1) / 2
    B('Fenstersprosse', X + 0.22, X + 0.34, mid - 0.04, mid + 0.04, wz0, wz1, M['frame'], 0.006)
    for (a, b) in ((wy0, mid - 0.04), (mid + 0.04, wy1)): B('Fensterglas', X + 0.28, X + 0.29, a, b, wz0, wz1, M['lens'], 0)
    B('Fensterdichtung', X + 0.27, X + 0.3, wy0, wy1, wz0, wz0 + 0.02, M['rubber'], 0); B('Fensterdichtung', X + 0.27, X + 0.3, wy0, wy1, wz1 - 0.02, wz1, M['rubber'], 0)
    B('Ausblick', X + 0.44, X + 0.46, wy0 - 0.3, wy1 + 0.3, wz0 - 0.3, wz1 + 0.3, M['ausblick'], 0)
    text('DRUCKFENSTER  ·  NICHT ÖFFNEN', 0.022, (X - 0.032, mid, wz0 - 0.065), RIGHT_X, RIGHT_Y, M['txtw'], align='CENTER')
    # Vorraum-Decke
    B('Vorraumdecke', VX0, VX1 + 0.12, -VY, VY, RQ_H, RQ_H + 0.08, M['q_decke'], 0.004)
    for x in (VX0 + 0.55, VX0 + 1.1): B('Deckenfuge', x - 0.005, x + 0.005, -VY, VY, RQ_H - 0.002, RQ_H, M['frame'], 0)

def q_decke():      # Deckenrand mit Voute, Deckenmitte, Einbauleuchten (eigener Baustein: für den Blick von oben abschaltbar)
    X, Y = RQ_X, RQ_Y; s0, s1 = RQ_H, RQ_H + 0.12; ix, iy = X - SOF, Y - SOF
    for (a, b, c, d) in ((-X, X, iy, Y), (-X, X, -Y, -iy), (ix, X, -iy, iy), (-X, -ix, -iy, iy)): B('Deckenrand', a, b, c, d, s0, s1, M['q_decke'], 0.006)
    # Aufkantung an der Innenkante (verdeckt das Lichtband)
    for (a, b, c, d) in ((-ix, ix, iy - 0.03, iy), (-ix, ix, -iy, -iy + 0.03), (ix - 0.03, ix, -iy, iy), (-ix, -ix + 0.03, -iy, iy)):
        B('Voutenkante', a, b, c, d, s1, s1 + 0.08, M['q_decke'], 0.004)
    for (a, b, c, d) in ((-ix + 0.05, ix - 0.05, iy + 0.03, iy + 0.05), (-ix + 0.05, ix - 0.05, -iy - 0.05, -iy - 0.03), (ix + 0.03, ix + 0.05, -iy + 0.05, iy - 0.05), (-ix - 0.05, -ix - 0.03, -iy + 0.05, iy - 0.05)):
        B('Voutenlicht', a, b, c, d, s1 + 0.002, s1 + 0.014, M['e_warm'], 0)
    B('Deckenmitte', -X, X, -Y, Y, CEIL_C, CEIL_C + 0.1, M['q_decke'], 0)
    for x in (-1.35, 0.0, 1.35): B('Deckenfuge', x - 0.005, x + 0.005, -iy, iy, CEIL_C - 0.003, CEIL_C, M['frame'], 0)
    B('Deckenfuge', -ix, ix, -0.005, 0.005, CEIL_C - 0.003, CEIL_C, M['frame'], 0)
    # Lüftung, Melder, Sprinkler in der Deckenmitte
    B('Lüftungsrahmen', -0.85, -0.25, -0.35, 0.35, CEIL_C - 0.02, CEIL_C, M['frame'], 0.004)
    for k in range(9): B('Lüftungslamelle', -0.83 + k * 0.066, -0.81 + k * 0.066, -0.33, 0.33, CEIL_C - 0.035, CEIL_C - 0.005, M['grate'], 0)
    cyl('Rauchmelder', 0.07, 0.035, 0.7, 0.45, CEIL_C - 0.018, M['white'], 'Z', n=24, bev=0.006); cyl('Melderlicht', 0.006, 0.004, 0.75, 0.45, CEIL_C - 0.037, M['e_red'], 'Z', n=8, bev=0)
    cyl('Sprinkler', 0.02, 0.03, 0.7, -0.6, CEIL_C - 0.015, M['copper'], 'Z', n=10, bev=0.002)
    cyl('Lautsprecher', 0.09, 0.012, -1.6, 0.0, CEIL_C - 0.006, M['grate'], 'Z', n=24, bev=0.003)
    # Einbauleuchten im Deckenrand
    for (x, y) in DOWN:
        cyl('Einbauring', 0.065, 0.012, x, y, s0 - 0.004, M['frame'], 'Z', n=24, bev=0.003); cyl('Einbaulicht', 0.048, 0.004, x, y, s0 - 0.011, M['e_warm'], 'Z', n=20, bev=0)
    cyl('Einbauring', 0.065, 0.012, -4.1, 0.0, RQ_H - 0.004, M['frame'], 'Z', n=24, bev=0.003); cyl('Einbaulicht', 0.048, 0.004, -4.1, 0.0, RQ_H - 0.011, M['e_warm'], 'Z', n=20, bev=0)
DOWN = [(0.0, -1.95), (-2.55, -1.95), (-2.3, 1.95), (2.3, -1.95), (-1.0, 1.95)]

# =====================================================================================
# Vorraum: Aufzugstür, Rufpult, Türschild, Waschplatz, Garderobe, Feuerlöscher
# =====================================================================================
def q_vorraum():
    x = VX0; y0, y1, _, zt = DOOR
    B('Aufzugrahmen', x, x + 0.06, y0 - 0.14, y0, 0.0, zt + 0.14, M['frame'], 0.01); B('Aufzugrahmen', x, x + 0.06, y1, y1 + 0.14, 0.0, zt + 0.14, M['frame'], 0.01)
    B('Aufzugsturz', x, x + 0.06, y0 - 0.14, y1 + 0.14, zt, zt + 0.14, M['frame'], 0.01)
    B('Aufzugschacht', x - 0.3, x - 0.08, y0, y1, 0.0, zt, M['wall4'], 0)
    for (a, b) in ((y0 + 0.005, -0.004), (0.004, y1 - 0.005)):
        B('Aufzugtür', x - 0.06, x - 0.02, a, b, 0.005, zt - 0.005, M['steel'], 0.004)
        c = (a + b) / 2
        B('Türschlitz', x - 0.019, x - 0.016, c - 0.03, c + 0.03, 0.9, 1.9, M['glass'], 0)
        B('Türband', x - 0.019, x - 0.016, a + 0.03, b - 0.03, 0.06, 0.2, M['warn'], 0)
    B('Türfuge', x - 0.06, x - 0.02, -0.004, 0.004, 0.005, zt - 0.005, M['rubber'], 0)
    B('Aufzugschwelle', x - 0.06, x + 0.12, y0 - 0.05, y1 + 0.05, 0.0, 0.01, M['warn2'], 0.003)
    B('Stockanzeige', x + 0.01, x + 0.05, -0.22, 0.22, zt + 0.17, zt + 0.25, M['frame'], 0.006); B('Stockbild', x + 0.05, x + 0.054, -0.19, 0.19, zt + 0.185, zt + 0.235, M['screen_r'], 0)
    text('D3', 0.04, (x + 0.056, -0.15, zt + 0.193), LEFT_X, LEFT_Y, M['e_uhr']); text('Q', 0.04, (x + 0.056, 0.12, zt + 0.193), LEFT_X, LEFT_Y, M['e_sockel'])
    # Rufpult rechts der Tür
    B('Rufpult', x, x + 0.04, -0.92, -0.78, 1.05, 1.35, M['frame'], 0.008)
    for (z, mm) in ((1.25, 'e_cool'), (1.15, 'e_amber')): cyl('Rufknopf', 0.022, 0.012, x + 0.046, -0.85, z, M[mm], 'X', n=16, bev=0)
    text('AUFZUG  ·  DECK 3', 0.05, (x + 0.004, 0.0, zt + 0.34), LEFT_X, LEFT_Y, M['txtw'], align='CENTER')
    # Türschild (die Nummer setzt das Spiel davor: deck_quartier.json „schild“)
    B('Schildrahmen', -4.36, -3.84, -VY, -VY + 0.025, 1.4, 1.62, M['frame'], 0.006); B('Schildglas', -4.33, -3.87, -VY + 0.025, -VY + 0.03, 1.425, 1.595, M['glass'], 0)
    text('QUARTIER', 0.035, (-4.1, -VY + 0.03, 1.65), (-1, 0, 0), (0, 0, 1), M['txtw'], align='CENTER')
    # Garderobe: Hakenleiste mit Jacke und Mütze, Fußmatte mit Stiefeln
    B('Hakenleiste', -3.85, -3.4, -VY, -VY + 0.03, 1.66, 1.72, M['q_verbund'], 0.006)
    for xx in (-3.78, -3.62, -3.47): pipe('Haken', [(xx, -VY + 0.03, 1.69), (xx, -VY + 0.09, 1.69), (xx, -VY + 0.1, 1.73)], 0.007, M['steel'], rad=0.02)
    prism('Jacke', [(-3.8, 0.92), (-3.48, 0.92), (-3.45, 1.6), (-3.56, 1.68), (-3.72, 1.68), (-3.83, 1.6)], -VY + 0.05, -VY + 0.13, M['q_oliv'], 'Y', 0.025)
    B('Reißverschluss', -3.646, -3.634, -VY + 0.13, -VY + 0.136, 0.95, 1.64, M['steel'], 0)
    for sx in (-1, 1): B('Jackentasche', -3.64 + sx * 0.09 - 0.06, -3.64 + sx * 0.09 + 0.06, -VY + 0.13, -VY + 0.138, 1.02, 1.14, M['q_oliv'], 0.004)
    sphere('Kapuze', 0.11, -3.64, -VY + 0.07, 1.66, M['q_oliv'], 14, 8, 1.1, 0.6, 0.8)
    for sx in (-1, 1): RB('Jackenärmel', -3.64 + sx * 0.175, -VY + 0.1, 1.24, 0.085, 0.08, 0.62, 0.0, M['q_oliv'], 0.03, pitch=sx * 0.06)
    sphere('Mütze', 0.09, -3.47, -VY + 0.1, 1.66, M['rubber'], 14, 8, 1.0, 0.9, 0.6)
    B('Fußmatte', -3.95, -3.45, -VY + 0.05, -VY + 0.42, 0.0, 0.012, M['rubber'], 0.003)
    for (xx, yaw) in ((-3.8, 0.1), (-3.62, -0.05)):
        RB('Stiefelschaft', xx, -VY + 0.2, 0.17, 0.1, 0.12, 0.3, yaw, M['q_leder'], 0.025); RB('Stiefelfuß', xx, -VY + 0.27, 0.05, 0.11, 0.26, 0.09, yaw, M['q_leder'], 0.025)
        RB('Stiefelsohle', xx, -VY + 0.27, 0.012, 0.115, 0.28, 0.025, yaw, M['rubber'], 0.006)
    # Waschplatz an der Nordwand des Vorraums
    B('Waschbecken', -4.38, -3.86, VY - 0.42, VY, 0.74, 0.86, M['steel'], 0.01); B('Beckenmulde', -4.32, -3.92, VY - 0.37, VY - 0.06, 0.8, 0.861, M['rubber'], 0.004)
    B('Beckenträger', -4.36, -3.88, VY - 0.36, VY, 0.3, 0.74, M['cab'], 0.01)
    pipe('Wasserhahn', [(-4.12, VY - 0.02, 0.86), (-4.12, VY - 0.02, 1.0), (-4.12, VY - 0.2, 1.0)], 0.012, M['steel'], rad=0.04)
    B('Spiegel', -4.36, -3.88, VY - 0.012, VY, 1.08, 1.72, M['q_spiegel'], 0.002); B('Spiegelrahmen', -4.38, -3.86, VY - 0.008, VY, 1.06, 1.74, M['frame'], 0.004)
    B('Spiegellicht', -4.34, -3.9, VY - 0.05, VY - 0.012, 1.76, 1.79, M['e_warmp'], 0.003)
    B('Ablage', -4.36, -3.88, VY - 0.12, VY, 1.0, 1.02, M['q_verbund'], 0.004)
    for (xx, h, mm) in ((-4.3, 0.12, 'teal'), (-4.24, 0.09, 'white'), (-3.96, 0.14, 'ochre')): cyl('Flasche', 0.022, h, xx, VY - 0.06, 1.02 + h / 2, M[mm], 'Z', n=12, bev=0.004)
    pipe('Handtuchstange', [(-3.78, VY - 0.06, 1.1), (-3.5, VY - 0.06, 1.1)], 0.008, M['steel'])
    RB('Handtuch', -3.64, VY - 0.06, 0.95, 0.24, 0.025, 0.32, 0.0, M['q_laken'], 0.01)
    # Feuerlöscher neben dem Durchgang
    B('Löscherhalter', -3.48, -3.4, VY - 0.03, VY, 0.5, 0.9, M['frame'], 0.006)
    cyl('Feuerlöscher', 0.07, 0.42, -3.44, VY - 0.1, 0.72, M['red'], 'Z', n=20, bev=0.01); cyl('Löscherkopf', 0.03, 0.08, -3.44, VY - 0.1, 0.97, M['frame'], 'Z', n=12, bev=0.004)
    pipe('Löscherschlauch', [(-3.44, VY - 0.1, 0.98), (-3.38, VY - 0.18, 0.92), (-3.4, VY - 0.18, 0.6)], 0.008, M['rubber'], rad=0.04)

# =====================================================================================
# Raum: Koje, Fensterbank, Schreibtisch, Spind, Regal, Sessel, Teppich, Wanddinge
# =====================================================================================
KJ = (0.55, 3.2, 1.05, 2.2, 2.0)      # Koje: x0, x1, y0, y1, Nischendecke
def q_koje():
    x0, x1, y0, y1, zc = KJ
    # Trennwand, Blende, Nischendecke
    B('Kojenwand', x0, x0 + 0.08, y0, y1, 0.0, RQ_H, M['q_pand'], 0.006)
    B('Kojenwand Kante', x0 - 0.01, x0 + 0.09, y0 - 0.01, y0 + 0.03, 0.0, RQ_H, M['frame'], 0.006)
    B('Kojenblende', x0, x1, y0 - 0.02, y0 + 0.04, zc, RQ_H, M['q_pan'], 0.006); B('Blendenkante', x0, x1, y0 - 0.03, y0 + 0.05, zc - 0.03, zc, M['frame'], 0.006)
    B('Nischendecke', x0 + 0.08, x1, y0 + 0.04, y1, zc - 0.02, zc + 0.02, M['q_decke'], 0)
    B('Kojenlicht', x0 + 0.15, x1 - 0.1, y0 + 0.07, y0 + 0.1, zc - 0.034, zc - 0.022, M['e_warmp'], 0)
    text('KOJE  Q', 0.03, (x0 + 0.25, y0 - 0.031, zc + 0.16), (1, 0, 0), (0, 0, 1), M['txtw'])
    # Bettkasten mit Schubladen, Matratze, Laken, Decke, Kissen
    B('Bettsockel', x0 + 0.12, x1 - 0.02, y0 + 0.08, y1 - 0.02, 0.0, 0.07, M['frame'], 0.004)
    B('Bettkasten', x0 + 0.08, x1, y0 + 0.04, y1, 0.07, 0.42, M['cab'], 0.008)
    for (a, b) in ((x0 + 0.2, x0 + 1.25), (x0 + 1.35, x1 - 0.12)):
        B('Schublade', a, b, y0 + 0.032, y0 + 0.042, 0.11, 0.38, M['door'], 0.004); B('Schubladengriff', (a + b) / 2 - 0.15, (a + b) / 2 + 0.15, y0 + 0.02, y0 + 0.034, 0.33, 0.345, M['steel'], 0.003)
    B('Matratze', x0 + 0.1, x1 - 0.03, y0 + 0.07, y1 - 0.03, 0.42, 0.58, M['q_laken'], 0.035)
    B('Bettdecke', x0 + 0.1, x1 - 0.72, y0 + 0.04, y1 - 0.025, 0.56, 0.62, M['q_stoff'], 0.025)
    B('Deckenüberhang', x0 + 0.1, x1 - 0.72, y0 + 0.02, y0 + 0.06, 0.4, 0.61, M['q_stoff'], 0.018)
    cyl('Deckenumschlag', 0.045, y1 - y0 - 0.08, x1 - 0.72, (y0 + y1) / 2 + 0.01, 0.6, M['q_stoff'], 'Y', n=14, bev=0.0)
    RB('Kissen', x1 - 0.32, (y0 + y1) / 2 + 0.05, 0.65, 0.44, 0.68, 0.14, 0.04, M['q_laken'], 0.055)
    RB('Zierkissen', x1 - 0.12, y1 - 0.2, 0.74, 0.12, 0.42, 0.34, 0.25, M['q_rost'], 0.05, pitch=-0.35)
    RB('Datenblock', x0 + 1.25, y0 + 0.55, 0.63, 0.19, 0.26, 0.012, 0.4, M['frame'], 0.003); RB('Datenblockbild', x0 + 1.25, y0 + 0.55, 0.637, 0.16, 0.22, 0.002, 0.4, M['screen_q'], 0)
    # Polsterwand
    for i in range(6):
        for j in range(3):
            a = x0 + 0.16 + i * 0.41
            B('Wandpolster', a, a + 0.4, y1 - 0.06, y1, 0.66 + j * 0.31, 0.96 + j * 0.31, M['polster'], 0.022)
    # Bord in der Nische mit Kleinkram, Leselampe
    B('Kojenbord', x0 + 0.5, x0 + 1.9, y1 - 0.17, y1, 1.66, 1.685, M['q_verbund'], 0.004)
    for xx in (x0 + 0.6, x0 + 1.8): B('Bordwinkel', xx - 0.01, xx + 0.01, y1 - 0.12, y1, 1.56, 1.66, M['frame'], 0.003)
    RB('Bilderrahmen', x0 + 0.72, y1 - 0.06, 1.77, 0.16, 0.02, 0.2, 0.15, M['frame'], 0.004, roll=-0.12); RB('Bild', x0 + 0.72, y1 - 0.072, 1.77, 0.12, 0.004, 0.15, 0.15, M['screen_q'], 0, roll=-0.12)
    for k, mm in enumerate(('q_buch1', 'q_buch3', 'q_buch2', 'q_buch1')): B('Buch', x0 + 1.0 + k * 0.045, x0 + 1.04 + k * 0.045, y1 - 0.15, y1 - 0.02, 1.685, 1.685 + 0.17 + (k % 2) * 0.03, M[mm], 0.003)
    cyl('Dose', 0.04, 0.09, x0 + 1.5, y1 - 0.08, 1.73, M['copper'], 'Z', n=16, bev=0.004)
    cyl('Kristallsockel', 0.03, 0.02, x0 + 1.72, y1 - 0.08, 1.695, M['frame'], 'Z', n=12, bev=0.003)
    RB('Kristall', x0 + 1.72, y1 - 0.08, 1.76, 0.03, 0.03, 0.11, 0.6, M['e_teal'], 0.0, pitch=0.2)
    lx, ly = x1 - 0.18, y1 - 0.02
    B('Lampenplatte', lx - 0.04, lx + 0.04, ly - 0.01, ly, 1.18, 1.3, M['frame'], 0.004)
    pipe('Schwanenhals', [(lx, ly - 0.01, 1.24), (lx, ly - 0.12, 1.32), (lx - 0.06, ly - 0.24, 1.36)], 0.009, M['steel'], rad=0.06)
    cyl('Lampenkopf', 0.035, 0.07, lx - 0.08, ly - 0.27, 1.34, M['frame'], 'Z', n=16, bev=0.004, r2=0.025); cyl('Leuchtfläche', 0.03, 0.003, lx - 0.08, ly - 0.27, 1.304, M['e_lese'], 'Z', n=16, bev=0)
    # Vorhang auf der Stange, zur Seite geschoben
    pipe('Vorhangstange', [(x0 + 0.09, y0 + 0.015, zc - 0.06), (x1, y0 + 0.015, zc - 0.06)], 0.012, M['steel'])
    pts = []
    for k in range(13): pts.append((x0 + 0.1 + k * 0.042, y0 + 0.015 + (0.035 if k % 2 else -0.035)))
    pts2 = [(x, y + 0.012) for (x, y) in reversed(pts)]
    prism('Vorhang', pts + pts2, 0.48, zc - 0.08, M['q_rost'], 'Z', 0.0)
    for k in range(7): ring('Vorhangring', 0.022, 0.004, (x0 + 0.1 + k * 0.085, y0 + 0.015, zc - 0.06), (1, 0, 0), M['steel'], 10)

BANK = (-0.9, 0.73)      # Fensterbank: y0, y1 (links davon die Sesselecke mit freiem Blick)
def q_fensterbank():
    X = RQ_X; wy0, wy1, wz0, wz1 = WIN; by0, by1 = BANK; bm = (by0 + by1) / 2
    B('Bankkorpus', X - 0.5, X, by0, by1, 0.06, 0.42, M['cab'], 0.008); B('Banksockel', X - 0.47, X, by0 + 0.03, by1 - 0.03, 0.0, 0.06, M['frame'], 0.004)
    for k in range(2):
        a = by0 + 0.06 + k * (by1 - by0 - 0.12) / 2
        B('Bankklappe', X - 0.506, X - 0.5, a + 0.02, a + (by1 - by0 - 0.12) / 2 - 0.02, 0.1, 0.38, M['door'], 0.003)
    B('Banksitz', X - 0.48, X - 0.02, by0 + 0.02, by1 - 0.02, 0.42, 0.5, M['polster'], 0.03)
    for (a, b) in ((by0 + 0.04, bm - 0.02), (bm + 0.02, by1 - 0.04)): RB('Rückenkissen', X - 0.1, (a + b) / 2, 0.64, 0.12, b - a, 0.28, 0.0, M['polster'], 0.04, pitch=-0.18)
    B('Fenstersims', X - 0.18, X, wy0 - 0.1, wy1 + 0.1, wz0 - 0.08, wz0 - 0.04, M['q_verbund'], 0.006)
    # Becher und Buch auf der Bank, gefaltete Decke
    cyl('Becher', 0.04, 0.095, X - 0.09, wy1 - 0.3, wz0 - 0.04 + 0.0475, M['q_keramik'], 'Z', n=16, bev=0.004)
    ring('Henkel', 0.025, 0.007, (X - 0.09, wy1 - 0.255, wz0 + 0.01), (1, 0, 0), M['q_keramik'], 10)
    RB('Buch auf Bank', X - 0.28, by0 + 0.45, 0.515, 0.17, 0.24, 0.03, 0.5, M['q_buch2'], 0.004)
    RB('Decke gefaltet', X - 0.25, by1 - 0.3, 0.54, 0.34, 0.3, 0.08, 0.1, M['q_oliv'], 0.03)
def mid_w(): return (WIN[0] + WIN[1]) / 2

DESK = (-1.0, 0.9, -2.2, -1.56, 0.74)      # x0, x1, y0, y1, Höhe
def q_tisch():
    x0, x1, y0, y1, h = DESK
    B('Tischplatte', x0, x1, y0, y1, h - 0.035, h, M['q_verbund'], 0.006)
    cyl('Tischkante', 0.018, x1 - x0, (x0 + x1) / 2, y1, h - 0.018, M['frame'], 'X', n=12, bev=0)
    B('Tischwange', x1 - 0.04, x1, y0, y1 + 0.01, 0.0, h - 0.035, M['frame'], 0.006)
    B('Kabelwanne', x0 + 0.5, x1 - 0.1, y0, y0 + 0.14, h - 0.12, h - 0.04, M['grate'], 0.004)
    B('Schubladenblock', x0, x0 + 0.44, y0 + 0.02, y1 - 0.04, 0.03, h - 0.04, M['cab'], 0.008)
    for k in range(3):
        z0 = 0.06 + k * 0.215
        B('Schublade', x0 + 0.015, x0 + 0.425, y1 - 0.045, y1 - 0.036, z0, z0 + 0.2, M['door'], 0.003); B('Griff', x0 + 0.17, x0 + 0.27, y1 - 0.036, y1 - 0.026, z0 + 0.16, z0 + 0.175, M['steel'], 0.002)
    # Bildschirme
    cyl('Schirmfuß', 0.1, 0.012, -0.05, y0 + 0.2, h + 0.006, M['frame'], 'Z', n=20, bev=0.003); B('Schirmhals', -0.07, -0.03, y0 + 0.16, y0 + 0.2, h, h + 0.2, M['frame'], 0.004)
    RB('Hauptschirm', -0.05, y0 + 0.21, h + 0.38, 0.66, 0.035, 0.4, 0.0, M['rubber'], 0.008, roll=0.08)
    RB('Hauptschirm Bild', -0.05, y0 + 0.229, h + 0.381, 0.62, 0.003, 0.36, 0.0, M['screen'], 0, roll=0.08)
    RB('Nebenschirm', 0.55, y0 + 0.24, h + 0.33, 0.32, 0.03, 0.46, -0.45, M['rubber'], 0.008)
    RB('Nebenschirm Bild', 0.55 - 0.0075, y0 + 0.2565, h + 0.33, 0.29, 0.003, 0.42, -0.45, M['karte2'], 0)
    B('Nebenschirmhalter', 0.53, 0.57, y0 + 0.17, y0 + 0.21, h, h + 0.1, M['frame'], 0.004)
    # Tastatur, Zeigegerät, Becher, Datenblöcke, Stiftbecher, Lampe
    B('Tastatur', -0.28, 0.18, y1 - 0.24, y1 - 0.1, h, h + 0.018, M['frame'], 0.004)
    for k in range(5): B('Tastenreihe', -0.265, 0.165 - (0.04 if k == 4 else 0), y1 - 0.232 + k * 0.026, y1 - 0.212 + k * 0.026, h + 0.018, h + 0.024, M['rubber'], 0.002)
    RB('Zeigegerät', 0.3, y1 - 0.16, h + 0.012, 0.06, 0.1, 0.024, 0.1, M['rubber'], 0.01)
    cyl('Tischbecher', 0.04, 0.1, 0.62, y1 - 0.14, h + 0.05, M['red'], 'Z', n=16, bev=0.004); ring('Henkel', 0.025, 0.007, (0.62, y1 - 0.095, h + 0.055), (1, 0, 0), M['red'], 10)
    for k in range(3): RB('Datenblock', 0.4, y0 + 0.47, h + 0.006 + k * 0.012, 0.18, 0.25, 0.01, 0.15 + k * 0.12, M['frame' if k != 1 else 'cab'], 0.003)
    cyl('Stiftbecher', 0.035, 0.1, -0.5, y0 + 0.12, h + 0.05, M['frame'], 'Z', n=14, bev=0.004)
    for k in range(3): pipe('Stift', [(-0.5 + 0.01 * k, y0 + 0.12, h + 0.05), (-0.49 + 0.02 * k, y0 + 0.11 + 0.01 * k, h + 0.16)], 0.004, M['ochre' if k == 1 else 'steel'])
    lx, ly = -0.8, y0 + 0.15
    cyl('Lampenfuß', 0.07, 0.02, lx, ly, h + 0.01, M['frame'], 'Z', n=18, bev=0.004)
    pipe('Lampenarm', [(lx, ly, h + 0.02), (lx + 0.04, ly + 0.05, h + 0.36), (lx + 0.2, ly + 0.15, h + 0.42)], 0.009, M['steel'], rad=0.0)
    cyl('Lampenschirm', 0.05, 0.08, lx + 0.22, ly + 0.17, h + 0.4, M['frame'], 'Z', n=18, bev=0.004, r2=0.03); cyl('Lampenlicht', 0.045, 0.003, lx + 0.22, ly + 0.17, h + 0.358, M['e_lese'], 'Z', n=16, bev=0)
    cyl('Papierkorb', 0.12, 0.3, x1 - 0.25, y0 + 0.2, 0.15, M['grate'], 'Z', n=20, bev=0.004)
    # Pinnwand, Sternkarte, Wandbord darüber (Plätze für Schiffsmodelle rechts)
    B('Pinnwandrahmen', -0.95, 0.05, y0, y0 + 0.03, 1.12, 1.78, M['frame'], 0.006); B('Pinnwand', -0.92, 0.02, y0 + 0.03, y0 + 0.035, 1.15, 1.75, M['q_kork'], 0)
    R = random.Random(7)
    for k in range(9):
        cx, cz = -0.85 + (k % 3) * 0.28 + R.uniform(-0.04, 0.04), 1.27 + (k // 3) * 0.17 + R.uniform(-0.02, 0.02)
        RB('Zettel', cx, y0 + 0.037, cz, 0.12 + R.uniform(0, 0.05), 0.002, 0.1 + R.uniform(0, 0.04), 0.0, M['q_papiery' if k % 4 == 1 else 'q_papier'], 0, pitch=R.uniform(-0.2, 0.2))
        cyl('Nadel', 0.006, 0.006, cx, y0 + 0.042, cz + 0.04, M['red' if k % 2 else 'teal'], 'Y', n=6, bev=0)
    B('Kartenrahmen', 0.18, 0.88, y0, y0 + 0.03, 1.14, 1.74, M['frame'], 0.006); B('Sternkarte', 0.21, 0.85, y0 + 0.03, y0 + 0.034, 1.17, 1.71, M['karte2'], 0)
    B('Wandbord', -0.95, 0.88, y0, y0 + 0.24, 1.92, 1.945, M['q_verbund'], 0.004)
    for xx in (-0.85, 0.0, 0.78): B('Bordträger', xx - 0.01, xx + 0.01, y0, y0 + 0.2, 1.82, 1.92, M['frame'], 0.003)
    B('Bordlicht', -0.9, 0.83, y0 + 0.2, y0 + 0.22, 1.912, 1.918, M['e_warmp'], 0)
    for k, mm in enumerate(('q_buch2', 'q_buch2', 'q_buch3', 'q_buch1', 'q_buch3')): B('Buch', -0.9 + k * 0.05, -0.86 + k * 0.05, y0 + 0.03, y0 + 0.19, 1.945, 1.945 + 0.19 + (k % 3) * 0.02, M[mm], 0.003)
    RB('Buch liegend', -0.55, y0 + 0.11, 1.965, 0.16, 0.22, 0.04, 0.2, M['q_buch1'], 0.003)
    cyl('Bordtopf', 0.06, 0.1, -0.3, y0 + 0.12, 1.995, M['q_keramik'], 'Z', n=16, bev=0.004)
    e = inst(BUSCH(), (-0.3, y0 + 0.12, 2.04), 0.4, CUR[0]); e.scale = (0.22, 0.22, 0.2)

def q_stuhl():      # Drehstuhl (Ortskoordinaten um seine Achse, Sitzfläche nach +y)
    for k in range(5):
        a = k * 2 * PI / 5; c, s = math.cos(a), math.sin(a)
        RB('Stuhlbein', c * 0.15, s * 0.15, 0.06, 0.3, 0.04, 0.03, a, M['frame'], 0.008)
        cyl('Rolle', 0.025, 0.02, c * 0.29, s * 0.29, 0.025, M['rubber'], 'X', n=10, bev=0.003)
    cyl('Stuhlsäule', 0.025, 0.36, 0, 0, 0.25, M['steel'], 'Z', n=14, bev=0.003); cyl('Säulenkappe', 0.04, 0.1, 0, 0, 0.12, M['frame'], 'Z', n=14, bev=0.004)
    B('Sitzträger', -0.18, 0.18, -0.18, 0.18, 0.42, 0.44, M['frame'], 0.004)
    B('Sitzpolster', -0.24, 0.24, -0.24, 0.24, 0.44, 0.52, M['q_leder'], 0.03)
    B('Lehnenstrebe', -0.03, 0.03, -0.28, -0.24, 0.44, 0.75, M['frame'], 0.006)
    RB('Rückenlehne', 0.0, -0.29, 0.86, 0.44, 0.07, 0.44, 0.0, M['q_leder'], 0.03, roll=-0.12)
    for sx in (-1, 1):
        B('Armstütze', sx * 0.25 - 0.02, sx * 0.25 + 0.02, -0.08, -0.04, 0.44, 0.66, M['frame'], 0.004); B('Armauflage', sx * 0.25 - 0.03, sx * 0.25 + 0.03, -0.18, 0.12, 0.66, 0.69, M['rubber'], 0.008)

SP = (-3.12, -2.0, -2.2, -1.62)      # Spind: x0, x1, y0, y1
def q_spind():
    x0, x1, y0, y1 = SP
    B('Spindsockel', x0 + 0.03, x1 - 0.03, y0, y1 - 0.04, 0.0, 0.06, M['frame'], 0.004)
    B('Spindkorpus', x0, x1, y0, y1 - 0.02, 0.06, 2.1, M['cab'], 0.01)
    w = (x1 - x0) / 2
    for k in range(2):
        a, b = x0 + k * w + 0.012, x0 + (k + 1) * w - 0.012
        B('Spindtür', a, b, y1 - 0.02, y1, 0.08, 2.08, M['door'], 0.006)
        for zz in (0.22, 1.86):
            for q in range(5): B('Lüftungsschlitz', a + 0.1, b - 0.1, y1, y1 + 0.004, zz + q * 0.028, zz + q * 0.028 + 0.012, M['frame'], 0)
        hx = b - 0.06 if k == 0 else a + 0.06
        B('Spindgriff', hx - 0.012, hx + 0.012, y1, y1 + 0.03, 0.95, 1.25, M['steel'], 0.006)
        B('Namensschild', (a + b) / 2 - 0.1, (a + b) / 2 + 0.1, y1, y1 + 0.003, 1.55, 1.6, M['plate' if k else 'platey'], 0)
        text('PERSÖNLICH' if k == 0 else 'AUSRÜSTUNG', 0.02, ((a + b) / 2, y1 + 0.0035, 1.565), (1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER')
    sphere('Helm', 0.15, x0 + 0.32, (y0 + y1) / 2, 2.25, M['white'], 22, 14, 1.0, 1.05, 0.95)
    RB('Helmvisier', x0 + 0.32, (y0 + y1) / 2 + 0.12, 2.26, 0.2, 0.05, 0.11, 0.0, M['visier'], 0.02)
    B('Helmkragen', x0 + 0.2, x0 + 0.44, (y0 + y1) / 2 - 0.13, (y0 + y1) / 2 + 0.12, 2.1, 2.13, M['frame'], 0.01)
    RB('Tasche', x1 - 0.25, (y0 + y1) / 2, 2.19, 0.4, 0.3, 0.18, 0.1, M['q_oliv'], 0.05)

RG = (-3.12, -1.5, 1.8, 2.2)      # Regal: x0, x1, y0, y1
RG_Z = (0.08, 0.48, 0.88, 1.28, 1.68)
def q_regal():
    x0, x1, y0, y1 = RG
    for xx in (x0 + 0.015, x1 - 0.015):
        for yy in (y0 + 0.02, y1 - 0.02): B('Regalpfosten', xx - 0.015, xx + 0.015, yy - 0.015, yy + 0.015, 0.0, 1.95, M['frame'], 0.004)
    for k, z in enumerate(RG_Z):
        B('Regalboden', x0 + 0.03, x1 - 0.03, y0 + 0.01, y1 - 0.01, z, z + 0.025, M['q_verbund'], 0.004)
        if k: B('Regallicht', x0 + 0.05, x1 - 0.05, y0 + 0.03, y0 + 0.045, z - 0.006, z, M['e_warmp'], 0)
    B('Regaldeckel', x0, x1, y0, y1, 1.92, 1.95, M['q_verbund'], 0.004)
    B('Regalrücken', x0 + 0.03, x1 - 0.03, y1 - 0.012, y1 - 0.004, 0.0, 1.92, M['q_pand'], 0)
    # unten Kisten, darüber Bücher, dann Fundstücke (Plätze links, setzt das Spiel), Schiffsmodell und Bild, oben Pflanze und Werkzeugkasten
    for (a, b, mm, t) in ((x0 + 0.06, x0 + 0.62, 'crate', 'Q-07'), (x0 + 0.7, x0 + 1.3, 'teal', 'ERSATZ')):
        B('Kiste', a, b, y0 + 0.04, y1 - 0.03, 0.105, 0.43, M[mm], 0.01)
        B('Kistenschild', (a + b) / 2 - 0.08, (a + b) / 2 + 0.08, y0 + 0.036, y0 + 0.04, 0.33, 0.37, M['plate'], 0)
        text(t, 0.022, ((a + b) / 2, y0 + 0.035, 0.342), (1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER')
    R = random.Random(3); xx = x0 + 0.06
    while xx < x1 - 0.5:
        w = R.uniform(0.03, 0.06); hh = R.uniform(0.22, 0.32)
        B('Buch', xx, xx + w, y0 + 0.06, y1 - 0.04, 0.505, 0.505 + hh, M[R.choice(('q_buch1', 'q_buch2', 'q_buch3', 'cab'))], 0.003); xx += w + 0.004
    RB('Buch schräg', xx + 0.08, (y0 + y1) / 2, 0.64, 0.04, 0.25, 0.28, 0.0, M['q_buch3'], 0.003, pitch=-0.35)
    B('Werkzeugkasten', x1 - 0.5, x1 - 0.08, y0 + 0.06, y1 - 0.06, 0.905, 1.06, M['red'], 0.01); B('Kastengriff', x1 - 0.36, x1 - 0.22, (y0 + y1) / 2 - 0.01, (y0 + y1) / 2 + 0.01, 1.06, 1.1, M['frame'], 0.004)
    RB('Bilderrahmen', x1 - 0.3, y1 - 0.06, 1.42, 0.2, 0.02, 0.24, 0.0, M['frame'], 0.004, roll=-0.1); RB('Bild', x1 - 0.3, y1 - 0.072, 1.42, 0.16, 0.004, 0.19, 0.0, M['screen_r'], 0, roll=-0.1)
    cyl('Regaltopf', 0.09, 0.15, x0 + 0.35, (y0 + y1) / 2, 1.955 + 0.075, M['q_keramik'], 'Z', n=18, bev=0.005)
    e = inst(BUSCH(), (x0 + 0.35, (y0 + y1) / 2, 2.1), 1.2, CUR[0]); e.scale = (0.32, 0.32, 0.26)
    RB('Kassette', x1 - 0.35, (y0 + y1) / 2, 2.0, 0.3, 0.22, 0.1, 0.1, M['cab'], 0.01)

def q_ecke():      # Sessel, Beistelltisch, Stehlampe, Teppich, Wanddinge
    # Teppich
    B('Teppich', -1.25, 1.75, -0.95, 0.85, 0.0, 0.012, M['q_teppich'], 0.004)
    for (a, b, c, d) in ((-1.25, 1.75, -0.95, -0.88), (-1.25, 1.75, 0.78, 0.85), (-1.25, -1.18, -0.95, 0.85), (1.68, 1.75, -0.95, 0.85)): B('Teppichrand', a, b, c, d, 0.0, 0.014, M['q_teprand'], 0.003)
    # Beistelltisch mit Becher und Lesebrille-Etui
    tx, ty = 2.85, -1.88
    cyl('Tischfuß', 0.16, 0.02, tx, ty, 0.01, M['frame'], 'Z', n=20, bev=0.004); cyl('Tischsäule', 0.022, 0.5, tx, ty, 0.27, M['steel'], 'Z', n=12, bev=0.003)
    cyl('Beistelltisch', 0.22, 0.03, tx, ty, 0.535, M['q_verbund'], 'Z', n=28, bev=0.006)
    cyl('Becher', 0.04, 0.1, tx - 0.06, ty + 0.05, 0.6, M['q_keramik'], 'Z', n=16, bev=0.004); ring('Henkel', 0.025, 0.007, (tx - 0.06, ty + 0.095, 0.6), (1, 0, 0), M['q_keramik'], 10)
    RB('Etui', tx + 0.08, ty - 0.04, 0.565, 0.16, 0.06, 0.035, 0.6, M['q_leder'], 0.012)
    # Stehlampe
    lx, ly = 1.3, -1.98
    cyl('Lampenfuß', 0.15, 0.025, lx, ly, 0.0125, M['frame'], 'Z', n=24, bev=0.005); cyl('Lampenstab', 0.012, 1.45, lx, ly, 0.75, M['steel'], 'Z', n=10, bev=0.002)
    cyl('Lampenschirm', 0.2, 0.3, lx, ly, 1.55, M['q_laken'], 'Z', n=28, bev=0.0, r2=0.15); cyl('Schirmlicht', 0.18, 0.004, lx, ly, 1.398, M['e_lese'], 'Z', n=24, bev=0)
    # Wanddinge: Klimapult am Durchgang, Uhr über dem Durchgang, Notkasten, Rohrstrang in der Ecke
    X, Y = RQ_X, RQ_Y
    B('Klimapult', -X, -X + 0.035, -1.05, -0.85, 1.25, 1.45, M['frame'], 0.006); B('Klimabild', -X + 0.035, -X + 0.039, -1.03, -0.87, 1.3, 1.42, M['screen_q'], 0)
    for k in range(3): cyl('Klimaknopf', 0.008, 0.006, -X + 0.04, -1.0 + k * 0.05, 1.27, M['steel'], 'X', n=8, bev=0)
    B('Lichtschalter', -X, -X + 0.02, 0.85, 0.95, 1.1, 1.24, M['white'], 0.004)
    for k in range(2): B('Schalterwippe', -X + 0.02, -X + 0.026, 0.875 + k * 0.03, 0.895 + k * 0.03, 1.13, 1.21, M['frame'], 0.002)
    cyl('Uhr', 0.15, 0.03, -X + 0.015, 0.0, 2.33, M['frame'], 'X', n=32, bev=0.006); cyl('Uhrglas', 0.13, 0.004, -X + 0.032, 0.0, 2.33, M['glass'], 'X', n=32, bev=0)
    text('06:40', 0.07, (-X + 0.036, 0.0, 2.3), LEFT_X, LEFT_Y, M['e_uhr'], align='CENTER')
    B('Notkasten', -1.35, -1.0, Y - 0.12, Y, 1.35, 1.7, M['ochre'], 0.01); text('NOTFALL  O₂', 0.028, (-1.175, Y - 0.122, 1.6), (1, 0, 0), (0, 0, 1), M['txtd'], align='CENTER')
    B('Notkastenfenster', -1.3, -1.05, Y - 0.123, Y - 0.12, 1.4, 1.54, M['glass'], 0)
    for (dx, r_) in ((0.0, 0.035), (0.09, 0.025)):
        cyl('Rohrstrang', r_, RQ_H + 0.3, -X + 0.06 + dx, -Y + 0.06, (RQ_H + 0.3) / 2, M['steel' if dx else 'wall2'], 'Z', n=14, bev=0.0)
    for z in (0.4, 1.2, 2.0): B('Rohrschelle', -X, -X + 0.18, -Y + 0.02, -Y + 0.1, z, z + 0.04, M['frame'], 0.004)
    B('Lüftungsgitter', -X, -X + 0.02, 1.4, 1.9, 0.18, 0.36, M['frame'], 0.004)
    for k in range(5): B('Gitterlamelle', -X + 0.02, -X + 0.03, 1.42, 1.88, 0.2 + k * 0.032, 0.215 + k * 0.032, M['grate'], 0)
    text('Q · D3', 0.06, (-0.6, Y - 0.002, 2.3), (1, 0, 0), (0, 0, 1), M['txto'])
    B('Tafelrahmen', -0.55, 0.35, Y - 0.04, Y, 1.2, 1.86, M['frame'], 0.008); B('Tafelgrund', -0.52, 0.32, Y - 0.046, Y - 0.04, 1.23, 1.83, M['q_pand'], 0.002)
    emblem((-0.1, Y - 0.047, 1.6), (1, 0, 0), (0, 0, 1), 0.16, M['messing'])
    text('LETZTE FLOTTE', 0.045, (-0.1, Y - 0.048, 1.33), (1, 0, 0), (0, 0, 1), M['messing'], align='CENTER')
    text('BASTION  ·  TRÄGER DER FLOTTE', 0.022, (-0.1, Y - 0.048, 1.28), (1, 0, 0), (0, 0, 1), M['txtw'], align='CENTER')

def q_sessel():      # Sessel (Ortskoordinaten, Blick nach +x)
    B('Sesselfuß', -0.36, 0.36, -0.36, 0.36, 0.0, 0.06, M['frame'], 0.008)
    B('Sesselkorpus', -0.4, 0.4, -0.4, 0.4, 0.06, 0.32, M['q_leder'], 0.04)
    B('Sitzkissen', -0.3, 0.38, -0.3, 0.3, 0.32, 0.44, M['q_leder'], 0.05)
    RB('Sessellehne', -0.32, 0.0, 0.68, 0.16, 0.78, 0.62, 0.0, M['q_leder'], 0.05, pitch=-0.22)
    for sy in (-1, 1): B('Sesselarm', -0.4, 0.4, min(sy * 0.3, sy * 0.4), max(sy * 0.3, sy * 0.4), 0.06, 0.58, M['q_leder'], 0.04)
    RB('Kissen', -0.18, 0.12, 0.6, 0.12, 0.36, 0.3, 0.3, M['q_rost'], 0.05, pitch=-0.4)

# =====================================================================================
# Zusammenbau, Licht
# =====================================================================================
def place(c, x, y, ang=0.0, into=None):
    return inst(c, (QX + x, QY + y, 0), ang, into or C_DECK)
def assemble():
    BUSCH()      # vorab bauen (wird in Bausteinen als Instanz gesetzt)
    for nm, fn in (('Q Hülle', q_huelle), ('Q Vorraum', q_vorraum), ('Q Koje', q_koje), ('Q Fensterbank', q_fensterbank), ('Q Tisch', q_tisch), ('Q Spind', q_spind), ('Q Regal', q_regal), ('Q Ecke', q_ecke)):
        place(module(nm, fn), 0, 0)
    place(module('Q Decke', q_decke), 0, 0, 0.0, C_CEIL)
    place(module('Q Stuhl', q_stuhl), 0.05, -1.3, 0.25)
    place(module('Q Sessel', q_sessel), 2.05, -1.4, RAD(25))
def L(x, y, z): return (QX + x, QY + y, z)
def lights():
    prev = CUR[0]; CUR[0] = C_LIGHT
    X, Y = RQ_X, RQ_Y; ix, iy = X - SOF, Y - SOF; zc = RQ_H + 0.15
    # Voute: Lichtbänder nach oben gegen die Deckenmitte
    for (x, y, sx, sy, w) in ((0, iy + 0.04, 2 * ix - 0.1, 0.05, 150), (0, -iy - 0.04, 2 * ix - 0.1, 0.05, 150), (ix + 0.04, 0, 0.05, 2 * iy - 0.1, 90), (-ix - 0.04, 0, 0.05, 2 * iy - 0.1, 90)):
        area('Voute', L(x, y, zc), (PI, 0, 0), sx, sy, w, (1.0, 0.74, 0.48))
    area('Deckenfeld', L(0, 0, CEIL_C - 0.02), (0, 0, 0), 2 * ix - 0.4, 2 * iy - 0.4, 45, (1.0, 0.8, 0.6))      # Streulicht der angestrahlten Deckenmitte
    # Einbaustrahler im Deckenrand (leicht zur Wand geneigt)
    for (x, y) in DOWN:
        spot('Einbaustrahler', L(x, y, RQ_H - 0.02), (0.26 if y > 0 else -0.26, 0, 0), 65, WARM3, 80, 0.65, 0.03)
    spot('Vorraumstrahler', L(-4.1, 0.0, RQ_H - 0.02), (0, 0, 0), 45, (1.0, 0.86, 0.7), 95, 0.7, 0.03)
    # Leselampe in der Koje, Licht unter der Nischendecke, Schreibtischlampe, Stehlampe
    spot('Leselampe', L(KJ[1] - 0.26, KJ[3] - 0.29, 1.29), (RAD(-25), 0, 0), 10, (1.0, 0.8, 0.58), 64, 0.6, 0.02)
    area('Nischenlicht', L((KJ[0] + KJ[1]) / 2 + 0.05, KJ[2] + 0.085, KJ[4] - 0.05), (0, 0, 0), KJ[1] - KJ[0] - 0.3, 0.04, 9, (1.0, 0.78, 0.55))
    spot('Tischlampe', L(-0.58, DESK[2] + 0.32, DESK[4] + 0.34), (RAD(18), 0, 0), 12, (1.0, 0.82, 0.6), 70, 0.6, 0.02)
    point('Stehlampe', L(1.3, -1.98, 1.5), 25, (1.0, 0.76, 0.5), 0.1)
    # Blick ins All: kühles Licht des Planeten durch das Fenster
    area('Planetenlicht', L(X - 0.07, mid_w(), (WIN[2] + WIN[3]) / 2), (0, PI / 2, 0), WIN[3] - WIN[2] - 0.1, WIN[1] - WIN[0] - 0.1, 22, (0.55, 0.7, 1.0))
    # Regal, Wandbord, Spiegel
    for z in RG_Z[1:]: area('Regallicht', L((RG[0] + RG[1]) / 2, RG[2] + 0.04, z - 0.01), (0, 0, 0), RG[1] - RG[0] - 0.1, 0.02, 1.6, (1.0, 0.78, 0.55))
    area('Bordlicht', L(-0.03, DESK[2] + 0.21, 1.905), (0, 0, 0), 1.7, 0.02, 2.5, (1.0, 0.78, 0.55))
    area('Spiegellicht', L(-4.12, VY - 0.04, 1.77), (0, 0, 0), 0.44, 0.03, 3.5, (1.0, 0.82, 0.62))
    CUR[0] = prev

# ---------- Welt, Kameras, Rendern ----------
wd = SC.world or bpy.data.worlds.new('Welt'); SC.world = wd; wd.use_nodes = True
WN = wd.node_tree.nodes; WL = wd.node_tree.links
bg = next((n for n in WN if n.type == 'BACKGROUND'), None) or WN.new('ShaderNodeBackground')
wo = next((n for n in WN if n.type == 'OUTPUT_WORLD'), None) or WN.new('ShaderNodeOutputWorld')
if not bg.outputs[0].links: WL.new(bg.outputs[0], wo.inputs['Surface'])
bg.inputs[0].default_value = (0.004, 0.005, 0.007, 1)
def setp(o, k, v):
    try: setattr(o, k, v)
    except Exception: pass
def cycles(samples=128):
    cp = bpy.context.preferences.addons['cycles'].preferences
    cp.compute_device_type = 'OPTIX'; cp.get_devices()
    for d in cp.devices: d.use = d.type == 'OPTIX'
    SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
    for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 8), ('glossy_bounces', 4), ('diffuse_bounces', 4), ('adaptive_threshold', 0.02)): setp(cy, k, v)
    R = SC.render; R.image_settings.file_format = 'JPEG'; R.image_settings.quality = 92
    setp(SC.view_settings, 'view_transform', 'AgX'); setp(SC.view_settings, 'look', 'AgX - Medium High Contrast')
CAMS = {}
def cam(name, loc, tgt, lens):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = 0.03; cd.clip_end = 200
    ob = bpy.data.objects.new(name, cd); C_CAM.objects.link(ob); ob.location = L(*loc)
    ob.rotation_euler = (Vector(L(*tgt)) - Vector(L(*loc))).to_track_quat('-Z', 'Y').to_euler(); CAMS[name] = ob; return ob
def cameras():
    ob = cam('plan', (-0.85, 0.0, 30), (-0.85, 0.001, 0), 50); ob.data.type = 'ORTHO'; ob.data.ortho_scale = 9.2
    cam('eingang', (-4.55, 0.35, 1.62), (3.2, -0.5, 1.15), 15)
    cam('fenster', (-2.3, -0.75, 1.66), (3.2, 0.6, 1.2), 15)
    cam('koje', (-0.6, -1.55, 1.55), (2.8, 1.75, 0.85), 16)
    cam('tisch', (-2.4, 0.9, 1.6), (0.4, -2.2, 1.1), 16)
    cam('vorraum', (-2.6, 0.35, 1.62), (-4.9, -0.35, 1.25), 15)
    cam('sessel', (1.7, 0.55, 1.45), (-3.2, -0.6, 1.2), 15)
VIEWS = ['plan', 'eingang', 'fenster', 'koje', 'tisch', 'vorraum', 'sessel']
def view(name, path, pct=100):
    C_CEIL.hide_render = name == 'plan'
    SC.view_settings.exposure = 0.3 if name == 'plan' else 0.45
    SC.camera = CAMS[name]; res = (1300, 1000) if name == 'plan' else (1600, 900)
    SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = pct
    SC.render.filepath = path; bpy.ops.render.render(write_still=True)
def tris():
    dg = bpy.context.evaluated_depsgraph_get(); cache = {}; total = 0
    for it in dg.object_instances:
        ob = it.object
        if ob.type not in ('MESH',): continue
        key = ob.original.name
        if key not in cache:
            try: me = ob.to_mesh(); cache[key] = sum(len(p.vertices) - 2 for p in me.polygons); ob.to_mesh_clear()
            except Exception: cache[key] = 0
        total += cache[key]
    return {'gesetzt': total, 'einmalig': sum(cache.values())}

assemble(); lights(); cameras()
result = {'bausteine': len(MOD), 'instanzen': len(C_DECK.objects) + len(C_CEIL.objects), 'objekte': len(bpy.data.objects)}
