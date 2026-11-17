# Animationen des Kormoran (von kor_kit.py geladen), 24 Bilder/s, rückwärts abgespielt = schließen:
#   Rampe öffnen   Bild 1–100: Rampe schwenkt von senkrecht (zu) auf 21,8° nach unten (Bild 12–72), dann fährt die Verlängerung 3 m aus
#                  (Bild 66–96); die beiden Zylinder folgen (Kolbenstange fährt aus dem festen Zylinder).
#   Leiter ausfahren Bild 1–60: Lukendeckel klappt nach unten (Bild 1–18), die Leiter gleitet aus dem Schacht (Bild 16–56).
# Je Bild gebackene Schlüssel (linear), Sichtbarkeit als Schalter. Aktionen heißen „Rampe oeffnen …“ und „Leiter ausfahren …“.
RAMP_F, LADDER_F = (1, 100), (1, 60)
def ease(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def seg(f, a, b): return ease((f - a) / (b - a))
def ramp_pose(f):
    th = math.radians(90) + (math.radians(-21.8) - math.radians(90)) * seg(f, 12, 72)
    return th, 3.0 * (1 - seg(f, 66, 96))
def set_cyl(th):
    hx, hz = HINGE; Mr = T(hx, 0, hz) @ RY(th)
    for s, c1, c2 in RAMP['zyl']:
        a = Vector((hx + 1.4, s * 2.15, 4.9)); b = Mr @ Vector((-1.5, s * 2.15, 0.1))
        d = b - a; u = d.normalized(); q = d.to_track_quat('Z', 'Y'); Lc = 2.0; r0 = a + u * 0.3
        c1.location = a + u * (Lc / 2); c1.scale = (1, 1, Lc / 1.6)
        c2.location = (r0 + b) / 2; c2.scale = (1, 1, (b - r0).length / 1.6)
        for o in (c1, c2): o.rotation_mode = 'QUATERNION'; o.rotation_quaternion = q
def key_hide(objs, frames):
    for o in objs:
        for f, h in frames:
            o.hide_render = h; o.hide_viewport = h
            o.keyframe_insert('hide_render', frame=f); o.keyframe_insert('hide_viewport', frame=f)
def name_actions(objs, title):
    for o in objs:
        ad = o.animation_data
        if ad and ad.action: ad.action.name = '%s %s' % (title, o.name)
def linear(objs):
    for o in objs:
        ad = o.animation_data
        if not (ad and ad.action): continue
        try: curves = ad.action.fcurves
        except Exception: curves = [c for l in ad.action.layers for s in l.strips for cb in s.channelbags for c in cb.fcurves]
        for c in curves:
            for k in c.keyframe_points: k.interpolation = 'LINEAR' if c.data_path != 'hide_render' and c.data_path != 'hide_viewport' else 'CONSTANT'
def bake_ramp():
    e, ext = RAMP['gelenk'], RAMP['ext']; hx, hz = HINGE; cyl = [c for _, c1, c2 in RAMP['zyl'] for c in (c1, c2)]
    e.rotation_mode = 'XYZ'; e.location = (hx, 0, hz)
    for f in range(RAMP_F[0], RAMP_F[1] + 1):
        th, d = ramp_pose(f)
        e.rotation_euler = (0, th, 0); e.keyframe_insert('rotation_euler', frame=f)
        ext.location = (hx + d, 0, hz); ext.keyframe_insert('location', frame=f)
        set_cyl(th)
        for o in cyl:
            for p in ('location', 'rotation_quaternion', 'scale'): o.keyframe_insert(p, frame=f)
    key_hide(RAMP['ext_objs'] + cyl, ((1, True), (12, False)))
    objs = [e, ext] + RAMP['ext_objs'] + cyl; linear(objs); name_actions(objs, 'Rampe oeffnen')
def bake_ladder():
    hg, lg = HATCHP['gelenk'], HATCHP['leiter']; x0, x1, hw = HATCH; xc = (x0 + x1) / 2; zb = hg.location.z
    u = (Vector((0.45, 0, -zb + 0.04)) - Vector((-0.1, 0, 0.6))).normalized()      # Achse der Leiter (oben → unten), wie in ladder_hatch()
    hg.rotation_mode = 'XYZ'; lg.rotation_mode = 'XYZ'; hg.location = (x1, 0, zb)
    for f in range(LADDER_F[0], LADDER_F[1] + 1):
        hg.rotation_euler = (0, math.radians(-100) * seg(f, 1, 18), 0); hg.keyframe_insert('rotation_euler', frame=f)
        lg.location = Vector((xc, 0, zb)) - u * (1.95 * (1 - seg(f, 16, 56))); lg.keyframe_insert('location', frame=f)
    kids = list(lg.children); key_hide(kids, ((1, True), (16, False)))
    objs = [hg, lg] + kids; linear(objs); name_actions(objs, 'Leiter ausfahren')
def animate():
    bake_ramp(); bake_ladder()
    SC.frame_start, SC.frame_end = 1, RAMP_F[1]; SC.render.fps = 24

ANIMS = {'rampe': ('Heck', RAMP_F, 0.2), 'leiter': ('Leiter', LADDER_F, 1.0)}
def film(name, path, res=(960, 540)):      # Vorschauvideo (MP4) einer Animation aus der passenden Kamera
    camn, (f0, f1), ex = ANIMS[name]
    world(False); STAGE['floor'].hide_render = False; STAGE['unter'].data.energy = 0
    for o in C_GEAR.all_objects: o.hide_render = False
    STAGE['sun'].data.energy = 3.6; STAGE['fill'].data.energy = 40000; SC.view_settings.exposure = ex
    M['glut'].node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 0.0      # Triebwerke aus (Studio)
    SC.camera = CAMS[camn]; SC.frame_start, SC.frame_end = f0, f1; SC.render.fps = 24
    R = SC.render; R.resolution_x, R.resolution_y = res; R.resolution_percentage = 100; setp(R, 'use_persistent_data', True)
    ims = R.image_settings; setp(ims, 'media_type', 'VIDEO'); ims.file_format = 'FFMPEG'
    R.ffmpeg.format = 'MPEG4'; R.ffmpeg.codec = 'H264'; setp(R.ffmpeg, 'constant_rate_factor', 'HIGH')
    R.filepath = path; bpy.ops.render.render(animation=True)
