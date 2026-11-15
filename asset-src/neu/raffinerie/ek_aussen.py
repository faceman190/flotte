# Gildehütte „Eisenkrone“: Außenmodell der Raffinerie-Station fürs Spiel (aus dem Entwurf raff_konzept.py ausgearbeitet). Datei Eisenkrone.blend.
# Ausgabe mit ek_export.py: Farbe und Verdeckung je Eckpunkt, vier Arten von Flächen (Rumpf, Lack, Leuchten, Warnschraffur), Kraftfeld im Spiel.
# Läuft nach ../bastion/bk_kit.py im selben Namensraum (von dort kommen Materialbau und Bauhelfer). Maße in Metern, Länge entlang x.
# Aufbau von −x nach +x: Erzannahme · Rückgrat mit Förderrohr · Schmelztrommeln unten, Wärmetauscher und Radiatoren oben, Schlackewerfer ·
#   Tanklager und Barrenlager · Hangarblock mit Wohnturm und Leitstand
import random
RR = random.Random(7)
MR = dict(
    hull=mk('R Rumpf', (0.085, 0.09, 0.1), 0.55, 0.5, var=0.3, scale=0.09, grime=False, bump=0.2, bscale=2.2),
    hull2=mk('R Rumpf hell', (0.16, 0.17, 0.18), 0.45, 0.5, var=0.28, scale=0.09, grime=False, bump=0.2, bscale=2.2),
    dark=mk('R Träger', (0.03, 0.032, 0.038), 0.7, 0.45, var=0.2, scale=0.2, grime=False),
    ochre=mk('R Lack ocker', (0.62, 0.27, 0.03), 0.1, 0.5, var=0.3, scale=0.12, grime=False),
    white=mk('R Lack weiss', (0.55, 0.56, 0.54), 0.05, 0.45, var=0.2, scale=0.1, grime=False),
    teal=mk('R Lack petrol', (0.03, 0.2, 0.2), 0.15, 0.45, var=0.25, scale=0.12, grime=False),
    rost=mk('R Ofenmantel', (0.11, 0.06, 0.04), 0.5, 0.6, var=0.45, scale=0.07, grime=False, bump=0.4, bscale=1.6),
    steel=mk('R Stahl', (0.4, 0.41, 0.43), 1.0, 0.32, var=0.15, scale=0.3, grime=False),
    rock=mk('R Fels', (0.05, 0.045, 0.04), 0.3, 0.75, var=0.6, scale=0.05, grime=False, bump=0.9, bscale=0.4),
    e_glut=mk('R Glut', (1, 0.4, 0.1), 0, 0.4, var=0, rvar=0, emit=(1.0, 0.24, 0.03), es=6.0, grime=False),
    e_fenster=mk('R Fenster', (1, 0.8, 0.5), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.75, 0.45), es=5.0, grime=False),
    e_flut=mk('R Flutlicht', (1, 1, 1), 0, 0.3, var=0, rvar=0, emit=(0.85, 0.92, 1.0), es=30.0, grime=False),
    e_feld=mk('R Kraftfeld', (0.3, 0.6, 1), 0, 0.3, var=0, rvar=0, emit=(0.1, 0.35, 0.9), es=0.35, grime=False),
    e_rot=mk('R Positionslicht rot', (1, 0, 0), 0, 0.3, var=0, rvar=0, emit=(1.0, 0.05, 0.03), es=40.0, grime=False),
    e_gruen=mk('R Positionslicht gruen', (0, 1, 0), 0, 0.3, var=0, rvar=0, emit=(0.05, 1.0, 0.2), es=40.0, grime=False),
    warn=stripes('R Warnschraffur', (0.75, 0.33, 0.03), (0.02, 0.02, 0.022), 0.5),
    schrift=mk('R Schrift', (0.7, 0.7, 0.66), 0.0, 0.5, var=0.2, scale=0.2, grime=False),
)
def nodes_mat(name, build):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; N = nt.nodes; K = nt.links
    for n in list(N):
        if n.type != 'OUTPUT_MATERIAL': N.remove(n)
    build(N, K, next(n for n in N if n.type == 'OUTPUT_MATERIAL')); return m
def _radiator(N, K, out):      # Radiatorfeld: an der Wurzel (x = 0 der Fläche) hellrot glühend, zur Spitze dunkel; feine Röhren quer
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); K.new(tc.outputs['Generated'], sep.inputs[0])
    t = N.new('ShaderNodeMapRange'); I(t, 'From Min').default_value = 0.0; I(t, 'From Max').default_value = 1.0; I(t, 'To Min').default_value = 1.0; I(t, 'To Max').default_value = 0.0; K.new(sep.outputs[0], I(t, 'Value'))
    pw = N.new('ShaderNodeMath'); pw.operation = 'POWER'; K.new(t.outputs[0], pw.inputs[0]); pw.inputs[1].default_value = 2.4
    wv = N.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Y'; I(wv, 'Scale').default_value = 38.0; K.new(tc.outputs['Generated'], wv.inputs['Vector'])
    rb = N.new('ShaderNodeMapRange'); I(rb, 'To Min').default_value = 0.35; I(rb, 'To Max').default_value = 1.0; K.new(wv.outputs[0], I(rb, 'Value'))
    mu = N.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; K.new(pw.outputs[0], mu.inputs[0]); K.new(rb.outputs[0], mu.inputs[1])
    st = N.new('ShaderNodeMath'); st.operation = 'MULTIPLY_ADD'; K.new(mu.outputs[0], st.inputs[0]); st.inputs[1].default_value = 4.5; st.inputs[2].default_value = 0.03
    cr = N.new('ShaderNodeValToRGB'); e = cr.color_ramp.elements; e[0].position = 0.0; e[0].color = (0.35, 0.02, 0.0, 1); e[1].position = 0.8; e[1].color = (1.0, 0.42, 0.08, 1); K.new(pw.outputs[0], cr.inputs[0])
    b = N.new('ShaderNodeBsdfPrincipled'); I(b, 'Base Color').default_value = (0.02, 0.02, 0.022, 1); I(b, 'Roughness').default_value = 0.6; I(b, 'Metallic').default_value = 0.6
    K.new(cr.outputs[0], I(b, 'Emission Color', 'Emission')); K.new(st.outputs[0], I(b, 'Emission Strength')); K.new(b.outputs[0], out.inputs['Surface'])
def _sterne(N, K, out):
    tc = N.new('ShaderNodeTexCoord'); vo = N.new('ShaderNodeTexVoronoi'); I(vo, 'Scale').default_value = 260.0; K.new(tc.outputs['Object'], vo.inputs['Vector'])
    dot = N.new('ShaderNodeMapRange'); I(dot, 'From Min').default_value = 0.0; I(dot, 'From Max').default_value = 0.06; I(dot, 'To Min').default_value = 1.0; I(dot, 'To Max').default_value = 0.0; K.new(vo.outputs[0], I(dot, 'Value'))
    nz = N.new('ShaderNodeTexNoise'); I(nz, 'Scale').default_value = 70.0; I(nz, 'Detail').default_value = 2.0; K.new(tc.outputs['Object'], nz.inputs['Vector'])
    th = N.new('ShaderNodeMapRange'); I(th, 'From Min').default_value = 0.52; I(th, 'From Max').default_value = 0.64; I(th, 'To Max').default_value = 3.0; K.new(nz.outputs[0], I(th, 'Value'))
    mu = N.new('ShaderNodeMath'); mu.operation = 'MULTIPLY'; K.new(dot.outputs[0], mu.inputs[0]); K.new(th.outputs[0], mu.inputs[1])
    nb = N.new('ShaderNodeTexNoise'); I(nb, 'Scale').default_value = 1.6; I(nb, 'Detail').default_value = 7.0; K.new(tc.outputs['Object'], nb.inputs['Vector'])
    mb = N.new('ShaderNodeMapRange'); I(mb, 'From Min').default_value = 0.5; I(mb, 'From Max').default_value = 0.85; I(mb, 'To Max').default_value = 0.012; K.new(nb.outputs[0], I(mb, 'Value'))
    ad = N.new('ShaderNodeMath'); ad.operation = 'ADD'; K.new(mu.outputs[0], ad.inputs[0]); K.new(mb.outputs[0], ad.inputs[1])
    em = N.new('ShaderNodeEmission'); I(em, 'Color').default_value = (0.7, 0.8, 1.0, 1); K.new(ad.outputs[0], I(em, 'Strength')); K.new(em.outputs[0], out.inputs['Surface'])
MR['radiator'] = nodes_mat('R Radiator', _radiator)
ART = {'hull': ('hull', (0.085, 0.09, 0.1)), 'hull2': ('hull', (0.16, 0.17, 0.18)), 'dark': ('hull', (0.03, 0.032, 0.038)), 'rost': ('hull', (0.11, 0.06, 0.04)), 'steel': ('hull', (0.4, 0.41, 0.43)),
       'rock': ('hull', (0.05, 0.045, 0.04)), 'ochre': ('paint', (0.62, 0.27, 0.03)), 'white': ('paint', (0.55, 0.56, 0.54)), 'teal': ('paint', (0.03, 0.2, 0.2)), 'schrift': ('paint', (0.7, 0.7, 0.66)),
       'e_glut': ('glow', (6.0, 1.45, 0.18)), 'e_fenster': ('glow', (5.0, 3.75, 2.25)), 'e_flut': ('glow', (25.0, 27.0, 30.0)), 'e_rot': ('glow', (40.0, 2.0, 1.2)), 'e_gruen': ('glow', (2.0, 40.0, 8.0)),
       'e_feld': ('feld', (0.1, 0.35, 0.9)), 'warn': ('warn', (0.5, 0.5, 0.5)), 'radiator': ('radiator', (0, 0, 0))}
for k_, (a_, c_) in ART.items(): MR[k_]['ek_art'] = a_; MR[k_]['ek_farbe'] = c_
def glut(k):
    e = [7.0, 3.5, 1.4, 0.5, 0.15][k]; m = mk('R Schlacke %d' % k, (0.05, 0.03, 0.02), 0.2, 0.7, var=0.4, scale=0.3, emit=(1.0, 0.28, 0.03), es=e, grime=False)
    m['ek_art'] = 'glow'; m['ek_farbe'] = (1.0 * e, 0.28 * e, 0.03 * e); return m
SCHL = [glut(k) for k in range(5)]
def col(name): c = bpy.data.collections.new(name); SC.collection.children.link(c); return c
C_ST, C_SL, C_UM, C_CAM = col('Raffinerie'), col('Schlacke'), col('Umgebung'), col('Kameras')
LICHTER = []      # Leuchtpunkte fürs Spiel: Art (rot, gruen, weiss, lauf), Ort
def B(name, sx, sy, sz, x, y, z, m, bev=0.25, rot=None): return box(name, sx, sy, sz, x, y, z, MR[m] if isinstance(m, str) else m, bev, rot)
def Cy(name, r, ln, x, y, z, m, axis='Z', n=40, bev=0.2, r2=None): return cyl(name, r, ln, x, y, z, MR[m], axis, n=n, bev=bev, r2=r2)
def kugel(name, r, x, y, z, m, seg=32, rau=0.0, seed=0):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=seg // 2, radius=r)
    if rau:
        rr = random.Random(seed); ax = [Vector((rr.uniform(-1, 1), rr.uniform(-1, 1), rr.uniform(-1, 1))).normalized() for q in range(7)]
        for v in bm.verts:
            d = v.co.normalized(); v.co *= 1 + rau * sum(math.sin(d.dot(a) * (2.5 + q)) for q, a in enumerate(ax)) / 4
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(MR[m])
    for p in me.polygons: p.use_smooth = True
    ob = link(bpy.data.objects.new(name, me)); ob.location = (x, y, z); return ob
def arr(ob, n, off):      # Reihe in Weltrichtung, auch bei gedrehten Objekten
    v = ob.rotation_euler.to_matrix().inverted() @ Vector(off); array(ob, n, (v.x, v.y, v.z))
def strebe(name, a, b, d, m='dark'):      # Balken von a nach b
    a, b = Vector(a), Vector(b); v = b - a; ob = B(name, v.length, d, d, 0, 0, 0, m, 0.08)
    X = v.normalized(); Y = X.orthogonal().normalized(); Z = X.cross(Y); mw = Matrix((X, Y, Z)).transposed().to_4x4(); mw.translation = (a + b) / 2; ob.matrix_world = mw; return ob
def haut(cx, cy, cz, sx, sy, sz, n, seed, mats=('hull', 'hull2', 'hull', 'dark')):      # Plattenbild auf den Seiten eines Blocks
    rr = random.Random(seed)
    for q in range(n):
        f = rr.choice('xXyYzZ'); m = rr.choice(mats); a, b_ = rr.uniform(0.06, 0.32), rr.uniform(0.05, 0.25); u, v = rr.uniform(-0.5 + a / 2, 0.5 - a / 2), rr.uniform(-0.5 + b_ / 2, 0.5 - b_ / 2); t = rr.uniform(0.3, 0.9)
        if f in 'xX': B('Platte', t, a * sy, b_ * sz, cx + (sx / 2 if f == 'X' else -sx / 2), cy + u * sy, cz + v * sz, m, 0.1)
        elif f in 'yY': B('Platte', a * sx, t, b_ * sz, cx + u * sx, cy + (sy / 2 if f == 'Y' else -sy / 2), cz + v * sz, m, 0.1)
        else: B('Platte', a * sx, b_ * sy, t, cx + u * sx, cy + v * sy, cz + (sz / 2 if f == 'Z' else -sz / 2), m, 0.1)
CUR[0] = C_ST
# ---------- Rückgrat: Gitterträger mit Förderrohr ----------
X0, X1, Q = -300.0, 222.0, 13.0
for sy in (-1, 1):
    for sz in (-1, 1): B('Holm', X1 - X0, 3.0, 3.0, (X0 + X1) / 2, sy * Q, sz * Q, 'dark', 0.3)
n_f = int((X1 - X0) / 18) + 1
for (sx_, sy_, sz_, y, z) in ((1.6, 29, 2, 0, Q), (1.6, 29, 2, 0, -Q), (1.6, 2, 29, Q, 0), (1.6, 2, 29, -Q, 0)): arr(B('Spantring', sx_, sy_, sz_, X0, y, z, 'dark', 0.15), n_f, (18, 0, 0))
dl = math.hypot(18, 26); da = math.atan2(26, 18)
for (y, z, rot) in ((Q, 0, (0, da, 0)), (-Q, 0, (0, -da, 0)), (0, Q, (0, 0, da)), (0, -Q, (0, 0, -da))): arr(B('Diagonale', dl, 0.9, 0.9, X0 + 9, y, z, 'dark', 0.1, rot), n_f - 1, (18, 0, 0))
Cy('Förderrohr', 5.2, X1 - X0, (X0 + X1) / 2, 0, 0, 'hull2', 'X'); arr(Cy('Rohrflansch', 5.9, 1.2, X0 + 9, 0, 0, 'ochre', 'X', bev=0.1), n_f - 1, (18, 0, 0))
for (y, z, r, m) in ((8, 8, 1.4, 'steel'), (-8, 8, 1.0, 'teal'), (8, -8, 1.8, 'hull'), (-8, -8, 0.8, 'ochre')): Cy('Leitung', r, X1 - X0 - 40, (X0 + X1) / 2, y, z, m, 'X', n=14, bev=0)
# ---------- Erzannahme (−x-Ende): offener Korb, Trichter, Greifarme, angedockte Erzbehälter ----------
EX, EW, EH, EL = -262.0, 84.0, 66.0, 88.0
for sy in (-1, 1):
    for sz in (-1, 1): B('Korbholm', EL, 3.4, 3.4, EX, sy * EW / 2, sz * EH / 2, 'dark', 0.3)
    for sx in (-1, 0, 1): B('Korbpfosten', 3.4, 3.4, EH, EX + sx * EL / 2, sy * EW / 2, 0, 'dark', 0.3)
    for sx in (-1, 1): strebe('Korbstrebe', (EX + sx * EL / 2, sy * EW / 2, -EH / 2), (EX, sy * EW / 2, EH / 2), 1.6)
for sz in (-1, 1):
    for sx in (-1, 0, 1): B('Korbriegel', 3.4, EW, 3.4, EX + sx * EL / 2, 0, sz * EH / 2, 'dark', 0.3)
B('Korb Warnband', 3.6, EW + 0.4, 5.0, EX - EL / 2, 0, EH / 2 - 4, 'warn', 0); B('Korb Warnband', 3.6, EW + 0.4, 5.0, EX - EL / 2, 0, -EH / 2 + 4, 'warn', 0)
Cy('Trichter', 34.0, 34.0, EX + 6, 0, 2, 'ochre', 'X', n=8, bev=0.5, r2=9.0); Cy('Trichterhals', 9.0, 26.0, EX + 36, 0, 2, 'hull2', 'X', n=16)
for q in range(26): kugel('Erzbrocken', RR.uniform(2.2, 5.5), EX - 6 + RR.uniform(-6, 16), RR.uniform(-16, 16), 2 + RR.uniform(-14, 14), 'rock', 10, 0.5, q)
for sy in (-1, 1):
    strebe('Greifarm', (EX - 10, sy * EW / 2, EH / 2), (EX - 70, sy * 30, EH / 2 + 14), 3.0, 'ochre'); B('Greifer', 10, 12, 6, EX - 72, sy * 30, EH / 2 + 12, 'dark', 0.6)
    for q in range(3):
        m = ('ochre', 'teal', 'white', 'hull2')[(q + (sy > 0)) % 4]; B('Erzbehälter', 22, 9, 9, EX - 30 + q * 25, sy * (EW / 2 + 7), -12 + (q % 2) * 20, m, 0.5); B('Behälterrahmen', 22.6, 9.6, 1.2, EX - 30 + q * 25, sy * (EW / 2 + 7), -12 + (q % 2) * 20, 'dark', 0.1)
    for q in range(5): B('Flutlicht', 1.0, 3.0, 1.6, EX - EL / 2 + 6 + q * 18, sy * (EW / 2 - 2.6), EH / 2 - 2.6, 'e_flut', 0)
# ---------- Schmelze (Mitte): drei Trommelöfen quer unter dem Rückgrat ----------
for k, xk in enumerate((-58.0, 0.0, 58.0)):
    Cy('Schmelztrommel', 25.0, 112.0, xk, 0, -46.0, 'rost', 'Y', n=48, bev=0.6)
    arr(Cy('Trommelring', 26.3, 5.0, xk, -44, -46.0, 'dark', 'Y', n=48, bev=0.3), 5, (0, 22, 0)); Cy('Zahnkranz', 27.4, 3.2, xk, 12, -46.0, 'ochre', 'Y', n=48, bev=0.2)
    for sy in (-1, 1):
        Cy('Trommelkopf', 19.0, 6.0, xk, sy * 58.5, -46.0, 'dark', 'Y', n=40, bev=0.5); Cy('Glutring', 14.5, 1.2, xk, sy * 61.6, -46.0, 'e_glut', 'Y', n=40, bev=0); Cy('Brennerdeckel', 11.0, 2.4, xk, sy * 62.0, -46.0, 'dark', 'Y', n=24, bev=0.4)
        for q in range(3): B('Schauluke', 4.0, 0.6, 1.4, xk - 12 + q * 12, sy * 25.2, -46.0, 'e_glut', 0)
        strebe('Trommelsattel', (xk - 14, sy * 30, -Q), (xk - 14, sy * 30, -70), 3.0); strebe('Trommelsattel', (xk + 14, sy * 30, -Q), (xk + 14, sy * 30, -70), 3.0); B('Sattelträger', 34, 4, 4, xk, sy * 30, -72, 'dark', 0.3)
    B('Aufgabeschacht', 12, 14, 22, xk, 0, -18, 'hull2', 0.5); Cy('Abgasrohr', 3.0, 34, xk + 16, 14, -4, 'steel', 'Z', n=16)
B('Ofenbühne', 190, 70, 2.4, 0, 0, -74, 'dark', 0.2); arr(B('Bühnenrost', 1.0, 70, 1.0, -94, 0, -72.4, 'steel', 0), 48, (4, 0, 0))
# ---------- Wärmetauscher und Radiatoren (oben): die Abwärme der Öfen glüht in den Raum ----------
B('Wärmetauscher', 176, 44, 20, 0, 0, 25, 'hull', 0.8); haut(0, 0, 25, 176, 44, 20, 70, 3)
for q in range(8): Cy('Sammler', 2.6, 44, -77 + q * 22, 0, 36.5, 'steel', 'Y', n=16, bev=0.1)
TILT = math.radians(24)
for s in (-1, 1):
    for q in range(4):
        L, Wd = 150.0, 38.0; root = Vector((-63 + q * 42, s * 23, 30)); X = Vector((0, s * math.cos(TILT), math.sin(TILT))); Y = Vector((1, 0, 0)); Z = X.cross(Y)
        ob = B('Radiator', L, Wd, 0.9, 0, 0, 0, MR['radiator'], 0); mw = Matrix((X, Y, Z)).transposed().to_4x4(); mw.translation = root + X * (L / 2); ob.matrix_world = mw
        bm_ = bmesh.new(); bm_.from_mesh(ob.data); bmesh.ops.subdivide_edges(bm_, edges=[e for e in bm_.edges if abs(e.verts[0].co.x - e.verts[1].co.x) > 1], cuts=15); bm_.to_mesh(ob.data); bm_.free()
        for q2 in range(1, 8): rb = B('Radiatorrippe', 1.0, Wd + 1.2, 1.5, 0, 0, 0, 'dark', 0); mr = mw.copy(); mr.translation = root + X * (q2 * L / 8); rb.matrix_world = mr
        strebe('Radiatorholm', root - Z * 1.6, root + X * L - Z * 1.6, 1.6); strebe('Radiatorholm', root - Z * 1.6 + Y * (Wd / 2 - 1), root + X * L - Z * 1.6 + Y * (Wd / 2 - 1), 0.9); strebe('Radiatorholm', root - Z * 1.6 - Y * (Wd / 2 - 1), root + X * L - Z * 1.6 - Y * (Wd / 2 - 1), 0.9)
        strebe('Radiatorstütze', root + X * 70 - Z * 2, Vector((root.x, s * 20, 14)), 1.2)
# ---------- Schlackewerfer: Schiene nach unten, dahinter die glühende Schlackefahne ----------
SA, SB = Vector((8.0, 0.0, -78.0)), Vector((-34.0, 16.0, -190.0))
strebe('Schlackeschiene', SA, SB, 5.0, 'dark'); strebe('Schienenmantel', SA + Vector((0, 0, -6)), SB, 2.4, 'ochre'); B('Schlackekopf', 14, 14, 10, SA.x, SA.y, SA.z, 'hull2', 0.6)
for q in range(6): p = SA + (SB - SA) * (q / 6); strebe('Schienenanker', p, Vector((p.x + 22, 0, -74)), 0.9)
dv = (SB - SA).normalized(); CUR[0] = C_SL
for q in range(64):
    d = 6 + q * 13.5 + RR.uniform(-4, 4); p = SB + dv * d + Vector((RR.uniform(-1, 1), RR.uniform(-1, 1), RR.uniform(-1, 1))) * (2 + d * 0.035); r = RR.uniform(1.0, 3.6)
    ob = kugel('Schlacke', r, p.x, p.y, p.z, 'rock', 8, 0.55, 100 + q); ob.data.materials[0] = SCHL[min(4, int(d / 150))]
CUR[0] = C_ST
# ---------- Tanklager (unten) und Barrenlager (oben), zwischen Schmelze und Hangar ----------
for i in range(3):
    for sy in (-1, 1):
        x, y, z = 122 + i * 34, sy * 19, -36; kugel('Tank', 15.5, x, y, z, 'white'); Cy('Tankband', 15.7, 3.0, x, y, z, 'ochre', 'Z', n=40, bev=0); Cy('Tankdom', 4.0, 6.0, x, y, z + 16.5, 'dark', 'Z', n=16)
        strebe('Tankträger', (x, y, z + 14), (x, sy * Q, -Q), 1.6); pipe('Tankleitung', [(x, y, z - 15), (x, y, z - 22), (x, 0, z - 22), (x, 0, -8)], 1.1, MR['steel'], rad=4)
B('Tankbühne', 104, 76, 2.0, 156, 0, -54, 'dark', 0.2)
B('Lagerbühne', 96, 60, 2.0, 152, 0, 16, 'dark', 0.2)
for i in range(7):
    for j in range(5):
        for k in range(3):
            if RR.random() < 0.24: continue
            B('Barrenbehälter', 12.4, 10.6, 6.6, 110 + i * 13.6, -22 + j * 11.4, 20.6 + k * 7.0, RR.choice(('ochre', 'teal', 'white', 'hull2', 'hull', 'steel')), 0.3)
for sy in (-1, 1): strebe('Ladekranbahn', (104, sy * 32, 44), (200, sy * 32, 44), 2.0); strebe('Kranstütze', (104, sy * 32, 44), (104, sy * 30, 17), 1.4); strebe('Kranstütze', (200, sy * 32, 44), (200, sy * 30, 17), 1.4)
B('Ladekran', 6, 68, 4, 150, 0, 44, 'ochre', 0.4); B('Krankatze', 7, 7, 5, 150, 10, 40, 'dark', 0.4)
# ---------- Hangarblock (+x-Ende): Hangar in den Maßen des Spiels (184 × 162 × 42 m), Wohnturm, Leitstand ----------
HX = 303.0
B('Hangarblock', 162, 184, 44, HX, 0, 0, 'hull', 1.0); haut(HX, 0, 0, 162, 184, 44, 150, 5)
B('Hangartor Rahmen', 3, 132, 38, HX + 81.2, 0, 0, 'dark', 0.5); B('Kraftfeld', 0.6, 124, 32, HX + 82.9, 0, 0, 'e_feld', 0); B('Tor Warnband', 3.4, 132, 3, HX + 81.4, 0, -17.5, 'warn', 0)
for sy in (-1, 1): B('Torlicht', 1.0, 1.6, 30, HX + 83, sy * 64, 0, 'e_flut', 0)
B('Leitsteg', 120, 3, 1.5, HX + 142, 0, -19, 'dark', 0.2); arr(B('Anflugfeuer', 1.2, 1.2, 0.8, HX + 90, 0, -17.9, 'e_flut', 0), 10, (12, 0, 0))
B('Wohnturm', 62, 56, 34, HX - 26, 0, 39, 'hull2', 1.0); haut(HX - 26, 0, 39, 62, 56, 34, 60, 9, ('hull2', 'hull2', 'white', 'hull'))
for k in range(4):
    for sy in (-1, 1): B('Fensterband', 50, 0.6, 1.6, HX - 26, sy * 28.2, 27 + k * 7, 'e_fenster', 0)
    B('Fensterband', 0.6, 44, 1.6, HX + 5.2, 0, 27 + k * 7, 'e_fenster', 0)
Cy('Leitstand', 15.0, 9.0, HX - 20, 0, 61, 'dark', 'Z', n=12, bev=0.5); Cy('Leitstand Fenster', 15.3, 2.4, HX - 20, 0, 62, 'e_fenster', 'Z', n=12, bev=0); Cy('Leitstand Dach', 16.0, 2.0, HX - 20, 0, 66.5, 'hull', 'Z', n=12, bev=0.4)
Cy('Antennenmast', 0.9, 46, HX - 20, 0, 90, 'steel', 'Z', n=10, bev=0); Cy('Richtschüssel', 9.0, 3.0, HX - 44, 16, 62, 'white', 'Z', n=28, bev=0.2, r2=2.0); B('Mastlicht', 1.4, 1.4, 1.4, HX - 20, 0, 113.5, 'e_rot', 0)
for (sy, m) in ((-1, 'e_rot'), (1, 'e_gruen')): kugel('Positionslicht', 1.5, HX + 78, sy * 93, 23, m, 12); kugel('Positionslicht', 1.5, X0 - 6, sy * (EW / 2 + 2), EH / 2 + 2, m, 12)
B('Verbindung', 26, 30, 30, HX - 92, 0, 0, 'hull2', 0.8)
t1 = text('EISENKRONE', 15.0, (HX - 70, -92.6, -4), (1, 0, 0), (0, 0, 1), MR['schrift']); t1.data.extrude = 0.25
t2 = text('GILDEHÜTTE  ·  RAFFINERIE HEIMSTATT', 4.2, (HX - 70, -92.6, -13), (1, 0, 0), (0, 0, 1), MR['ochre']); t2.data.extrude = 0.15
B('Namensband', 150, 0.5, 2.0, HX - 2, -92.4, 14, 'ochre', 0)
# ---------- Ausarbeitung fürs Spiel ----------
def gelaender(x0, x1, y, z, m='steel'):      # Laufsteg entlang x mit Geländer
    B('Laufsteg', x1 - x0, 2.2, 0.3, (x0 + x1) / 2, y, z, 'dark', 0.05); arr(B('Geländerpfosten', 0.16, 0.16, 1.2, x0 + 1, y + 1.0, z + 0.7, m, 0), int((x1 - x0) / 6), (6, 0, 0))
    B('Handlauf', x1 - x0, 0.14, 0.14, (x0 + x1) / 2, y + 1.0, z + 1.3, m, 0)
def lichtreihe(a, b, n, m='e_flut', d=0.9, art=None):
    a, b = Vector(a), Vector(b)
    for q in range(n):
        p = a + (b - a) * (q / max(1, n - 1)); B('Leuchte', d, d, d, p.x, p.y, p.z, m, 0)
        if art: LICHTER.append([art, round(p.x, 1), round(p.y, 1), round(p.z, 1)])
# Rückgrat: Laufstege oben, Kabelbahnen, Leuchten an jedem dritten Spant
gelaender(X0 + 6, X1 - 6, 5, Q + 1.7); gelaender(X0 + 6, X1 - 6, -7, -Q - 1.9)
for sy in (-1, 1): B('Kabelbahn', X1 - X0 - 20, 1.6, 0.5, (X0 + X1) / 2, sy * 9, Q + 1.0, 'hull', 0.05)
lichtreihe((X0 + 18, Q + 0.4, Q + 1.4), (X1 - 18, Q + 0.4, Q + 1.4), 10, 'e_flut', 0.7)
# Erzannahme: Leitkabine, Förderkasten, Lichtmasten, Greiferdetails
B('Leitkabine', 16, 14, 9, EX + EL / 2 - 10, -EW / 2 - 6.5, EH / 2 + 4, 'hull2', 0.6); B('Kabinenfenster', 0.5, 11, 2.6, EX + EL / 2 - 18.2, -EW / 2 - 6.5, EH / 2 + 5.2, 'e_fenster', 0); B('Kabinenfenster', 12, 0.5, 2.6, EX + EL / 2 - 10, -EW / 2 - 13.7, EH / 2 + 5.2, 'e_fenster', 0)
haut(EX + EL / 2 - 10, -EW / 2 - 6.5, EH / 2 + 4, 16, 14, 9, 14, 21)
B('Förderkasten', 30, 22, 22, EX + EL / 2 + 6, 0, 0, 'hull', 0.8); haut(EX + EL / 2 + 6, 0, 0, 30, 22, 22, 26, 22)
for sy in (-1, 1):
    for sx in (-1, 1): strebe('Lichtmast', (EX + sx * EL / 2, sy * EW / 2, EH / 2), (EX + sx * (EL / 2 + 4), sy * (EW / 2 + 4), EH / 2 + 22), 0.8); B('Mastleuchte', 3.0, 3.0, 1.2, EX + sx * (EL / 2 + 4), sy * (EW / 2 + 4), EH / 2 + 22.6, 'e_flut', 0)
    B('Greiferbacke', 3, 2, 9, EX - 76, sy * 30 + 4, EH / 2 + 7, 'steel', 0.3); B('Greiferbacke', 3, 2, 9, EX - 76, sy * 30 - 4, EH / 2 + 7, 'steel', 0.3); Cy('Greifergelenk', 3.2, 5, EX - 10, sy * EW / 2, EH / 2, 'steel', 'Y', n=16)
for q in range(8): a_ = q * PI / 4; strebe('Trichterrippe', (EX - 11, math.cos(a_) * 34.5, 2 + math.sin(a_) * 34.5), (EX + 23, math.cos(a_) * 9.4, 2 + math.sin(a_) * 9.4), 1.1, 'dark')
LICHTER.append(['rot', X0 - 6, -(EW / 2 + 2), EH / 2 + 2]); LICHTER.append(['gruen', X0 - 6, EW / 2 + 2, EH / 2 + 2])
# Schmelze: Brennerkränze, Antriebe, Wartungsbühnen, Leitungen zum Wärmetauscher
for k, xk in enumerate((-58.0, 0.0, 58.0)):
    for sy in (-1, 1):
        for q in range(8): a_ = q * PI / 4; Cy('Brenner', 1.5, 9, xk + math.cos(a_) * 16.5, sy * 64.5, -46 + math.sin(a_) * 16.5, 'steel', 'Y', n=10, bev=0.1)
        ring('Brennerring', 17.5, 0.8, (xk, sy * 67.5, -46.0), (0, 1, 0), MR['dark'], 32); B('Antrieb', 9, 8, 8, xk + 30, sy * 14, -52, 'hull2', 0.5); B('Getriebe', 5, 5, 12, xk + 27.5, sy * 14, -42, 'ochre', 0.4)
        pipe('Heißleitung', [(xk - 8, sy * 20, -22), (xk - 8, sy * 20, 6), (xk - 8, sy * 12, 14)], 2.2, MR['rost'], rad=5); pipe('Heißleitung', [(xk + 8, sy * 20, -22), (xk + 8, sy * 20, 4), (xk + 8, sy * 12, 14)], 1.6, MR['steel'], rad=5)
        gelaender(xk - 20, xk + 20, sy * 44, -73.0)
    lichtreihe((xk - 20, -52, -72.2), (xk + 20, -52, -72.2), 3, 'e_flut', 0.8); lichtreihe((xk - 20, 52, -72.2), (xk + 20, 52, -72.2), 3, 'e_flut', 0.8)
haut(0, 0, -74, 190, 70, 2.4, 40, 31, ('dark', 'hull', 'hull'))
# Wärmetauscher: Ventilgruppen, Rohrbündel an den Stirnseiten
for sx in (-1, 1):
    B('Ventilhaus', 10, 30, 12, sx * 93, 0, 25, 'hull2', 0.6); haut(sx * 93, 0, 25, 10, 30, 12, 14, 40 + sx)
    for q in range(5): Cy('Rohrbündel', 1.3, 26, sx * 99.5, -12 + q * 6, 12, 'steel', 'Z', n=12, bev=0)
# Schlackewerfer: Spulenringe der Schiene (glühen schwach), Warnband am Kopf
for q in range(1, 9): p = SA + (SB - SA) * (q / 9); ob = Cy('Spulenring', 5.2, 1.6, p.x, p.y, p.z, 'dark', 'Z', n=20, bev=0.2); ob.rotation_euler = (SB - SA).to_track_quat('Z', 'Y').to_euler()
B('Schlackekopf Warnband', 14.3, 14.3, 2.4, SA.x, SA.y, SA.z - 3.2, 'warn', 0); B('Mündungsglut', 3.0, 3.0, 1.0, SB.x, SB.y, SB.z, 'e_glut', 0)
# Tanklager: Bühnenringe, Verteiler; Barrenlager: Regalrahmen
for i in range(3):
    for sy in (-1, 1): x, y, z = 122 + i * 34, sy * 19, -36; Cy('Tankbühne Ring', 17.2, 0.5, x, y, z + 4, 'dark', 'Z', n=32, bev=0); Cy('Tankventil', 1.6, 3.0, x, y, z - 16.5, 'ochre', 'Z', n=12, bev=0.2)
pipe('Verteiler', [(108, 0, -58), (204, 0, -58)], 1.8, MR['steel']); haut(156, 0, -54, 104, 76, 2.0, 30, 51, ('dark', 'hull', 'hull'))
for i in range(8):
    for sy in (-1, 1): B('Regalpfosten', 0.9, 0.9, 24, 103.2 + i * 13.6, sy * 29.5, 29, 'dark', 0.1)
haut(152, 0, 16, 96, 60, 2.0, 24, 52, ('dark', 'hull', 'hull'))
# Hangarblock: Torpfeiler, Lüftungsfelder, Dachaufbauten, Kennung, Andockausleger, Lichter
for sy in (-1, 1):
    B('Torpfeiler', 8, 10, 46, HX + 80, sy * 70, 0, 'hull2', 0.8); B('Pfeiler Warnband', 8.3, 10.3, 6, HX + 80, sy * 70, -17, 'warn', 0); B('Pfeilerlicht', 0.8, 1.2, 26, HX + 84.2, sy * 70, 2, 'e_flut', 0)
    for q in range(3): B('Lüftungsfeld', 20, 1.0, 9, HX - 40 + q * 34, sy * 92.3, 12, 'dark', 0.2); arr(B('Lüftungslamelle', 19, 0.5, 0.5, HX - 40 + q * 34, sy * 92.9, 8.6, 'steel', 0), 7, (0, 0, 1.15))
    B('Werkstattfenster', 60, 0.6, 1.4, HX + 20, sy * 92.3, -12, 'e_fenster', 0); B('Dachkante', 160, 1.6, 1.6, HX, sy * 91, 22.6, 'ochre', 0.2)
    strebe('Andockausleger', (HX + 70, sy * 92, -10), (HX + 70, sy * 128, -10), 3.0, 'hull2'); B('Andockkopf', 9, 9, 7, HX + 70, sy * 131, -10, 'dark', 0.5); B('Andocklicht', 1.2, 1.2, 1.2, HX + 70, sy * 136, -10, 'e_rot' if sy < 0 else 'e_gruen', 0)
    LICHTER.append(['rot' if sy < 0 else 'gruen', HX + 78, sy * 93, 23]); LICHTER.append(['rot' if sy < 0 else 'gruen', HX + 70, sy * 136, -10])
B('Torsturz', 8, 150, 6, HX + 80, 0, 20, 'hull2', 0.8); B('Sturzlicht', 0.8, 110, 1.0, HX + 84.2, 0, 19.4, 'e_flut', 0)
for q in range(6): B('Dachaufbau', RR.uniform(8, 22), RR.uniform(8, 20), RR.uniform(2.5, 6), HX + RR.uniform(-10, 62), RR.uniform(-70, 70), 24.5, RR.choice(('hull', 'hull2', 'dark')), 0.4)
for q in range(5): pipe('Dachleitung', [(HX - 70, -60 + q * 30, 23.2), (HX + 60, -60 + q * 30, 23.2)], 0.8, MR['steel'])
t3 = text('EK-01', 9.0, (HX + 30, -40, 22.3), (1, 0, 0), (0, 1, 0), MR['schrift']); t3.data.extrude = 0.1
t4 = text('EISENKRONE', 15.0, (HX + 27, 92.6, -4), (-1, 0, 0), (0, 0, 1), MR['schrift']); t4.data.extrude = 0.25; B('Namensband', 150, 0.5, 2.0, HX - 2, 92.4, 14, 'ochre', 0)
gelaender(HX - 55, HX + 3, -29.5, 56.2); Cy('Turmkranz', 42, 1.0, HX - 26, 0, 22.6, 'dark', 'Z', n=8, bev=0.2)
for q in range(10): LICHTER.append(['lauf', HX + 90 + q * 12, 0, -17.9])
LICHTER.append(['rot', HX - 20, 0, 113.5]); LICHTER.append(['weiss', HX - 20, 0, 68]); LICHTER.append(['weiss', 0, 0, 38])
import json as _json
open(os.path.join(HERE, 'ek_lichter.json'), 'w').write(_json.dumps(LICHTER))
# ---------- Umgebung: Sterne, Sonne, Erzfeld im Hintergrund ----------
CUR[0] = C_UM
bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=48, v_segments=24, radius=1.0); me = bpy.data.meshes.new('Sterne'); bm.to_mesh(me); bm.free(); me.materials.append(nodes_mat('R Sterne', _sterne))
st_ = link(bpy.data.objects.new('Sterne', me)); st_.scale = (30000, 30000, 30000); st_.visible_shadow = False
for q in range(34):
    a = RR.uniform(1.7, 3.0); d = RR.uniform(700, 2600); r = RR.uniform(14, 90) * (0.5 if RR.random() < 0.6 else 1)
    kugel('Erzfels', r, math.cos(a) * d - 200, math.sin(a) * d * 0.9 + 500, RR.uniform(-420, 300), 'rock', 24, 0.22, 300 + q)
sun = bpy.data.lights.new('Sonne', 'SUN'); sun.energy = 9.0; sun.angle = math.radians(0.6); sun.color = (1.0, 0.95, 0.88)
so = link(bpy.data.objects.new('Sonne', sun)); so.rotation_euler = Vector((0.42, 0.72, -0.55)).to_track_quat('-Z', 'Y').to_euler()      # Licht von vorn links oben (Blick der Hauptansicht)
fl = bpy.data.lights.new('Aufhellung', 'SUN'); fl.energy = 0.7; fl.color = (0.5, 0.65, 1.0); fo = link(bpy.data.objects.new('Aufhellung', fl)); fo.rotation_euler = Vector((-0.5, -0.3, 0.8)).to_track_quat('-Z', 'Y').to_euler()      # Widerschein des Planeten von unten
wd = SC.world or bpy.data.worlds.new('Welt'); SC.world = wd; wd.use_nodes = True
wo = next(n for n in wd.node_tree.nodes if n.type == 'OUTPUT_WORLD'); bg = next((n for n in wd.node_tree.nodes if n.type == 'BACKGROUND'), None)
for l in list(wo.inputs['Volume'].links): wd.node_tree.links.remove(l)
if bg: bg.inputs[0].default_value = (0.0015, 0.002, 0.003, 1)
# ---------- Kameras, Rendern ----------
CAMS = {}
def cam(name, loc, tgt, lens, ortho=0):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_start = 1; cd.clip_end = 80000
    if ortho: cd.type = 'ORTHO'; cd.ortho_scale = ortho
    ob = bpy.data.objects.new(name, cd); C_CAM.objects.link(ob); ob.location = loc
    ob.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); CAMS[name] = ob; return ob
cam('A Gesamt', (-560, -640, 250), (30, 10, -20), 38)
cam('B Schmelze', (150, -330, -150), (-10, 10, -10), 30)
cam('C Anflug', (720, -250, 60), (290, -10, 6), 40)
cam('D Erzannahme', (-470, -200, 90), (-240, 0, 0), 32)
cam('S Seite', (40, -3000, -40), (40, 0, -40), 50, ortho=800)
def setp(o, k, v):
    try: setattr(o, k, v)
    except Exception: pass
def job(views, samples=128, pct=100, mark='fertig-raff.txt', expo=0.0):
    mp = os.path.join(HERE, mark)
    if os.path.exists(mp): os.remove(mp)
    def run():
        try:
            cp = bpy.context.preferences.addons['cycles'].preferences; cp.compute_device_type = 'OPTIX'; cp.get_devices()
            for d in cp.devices: d.use = d.type == 'OPTIX'
            SC.render.engine = 'CYCLES'; cy = SC.cycles; cy.device = 'GPU'; cy.samples = samples; cy.use_denoising = True; cy.use_adaptive_sampling = True
            for k, v in (('denoiser', 'OPENIMAGEDENOISE'), ('max_bounces', 6), ('adaptive_threshold', 0.02)): setp(cy, k, v)
            SC.render.image_settings.file_format = 'JPEG'; SC.render.image_settings.quality = 93
            setp(SC.view_settings, 'view_transform', 'AgX'); setp(SC.view_settings, 'look', 'AgX - Medium High Contrast')
            for (nm, fn, res) in views:
                SC.view_settings.exposure = expo; SC.camera = CAMS[nm]; SC.render.resolution_x, SC.render.resolution_y = res; SC.render.resolution_percentage = pct
                SC.render.filepath = os.path.join(HERE, fn); bpy.ops.render.render(write_still=True)
            cp.compute_device_type = 'NONE'; open(mp, 'w').write('ok')
        except Exception:
            import traceback; open(mp, 'w').write('FEHLER ' + traceback.format_exc()[-1200:])
        return None
    bpy.app.timers.register(run, first_interval=0.5)
result = {'objekte': len(bpy.data.objects), 'lichter': len(LICHTER)}
