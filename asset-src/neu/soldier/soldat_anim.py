# Gewehr-Animationen von Mixamo auf den Soldaten (Außensicht). Läuft in Soldat.blend nach soldat_tp.py (rig, prepare).
# Quellen: asset-src/neu/mixamo/*.fbx, in Blender als Sammlung 'mx_rifle' (Armaturen 'mx_<Name>', Aktionen 'mxa_<Name>').
#   retarget_full(src, name, loop)   Ganzkörper: Hüfte, Rücken, Kopf, Arme, Finger, Beine (Weltdrehung relativ zur Ruhelage)
#                                     Ruhelagen werden angeglichen (Mixamo T-Pose ↔ Soldat A-Pose): Arme und Beine über die Linie zum
#                                     nächsten Gelenk, Hände und Finger über den ganzen Handrahmen (Finger­richtung + Knöchellinie).
#                                     Schleifen: die Vorwärtsbewegung der Hüfte wird herausgerechnet (am Platz), Tempo und Richtung gemessen.
#   weapon_rels(ref)                  Lage jeder Waffe relativ zur rechten Hand: Lauf von rechter zu linker Hand im Zielclip (Rifle Aiming Idle)
#   export_all(meta, rels)            Soldat.glb (alle Clips als NLA-Spuren) + data/soldat_tp.json (Waffen, Clipdaten)
import bpy, os, math, json, builtins
from mathutils import Vector, Matrix

ROOT = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte'
PF = 'mixamorig1:'
SPINE = {'Hips': 'pelvis', 'Spine': 'spine_01', 'Spine1': 'spine_02', 'Spine2': 'spine_03', 'Neck': 'neck_01', 'Head': 'head'}
FING = {'Thumb': 'thumb', 'Index': 'index', 'Middle': 'middle', 'Ring': 'ring', 'Pinky': 'pinky'}
def full_map():
    m = dict(SPINE)
    for S, s in (('Left', 'l'), ('Right', 'r')):
        m[S + 'Shoulder'] = 'clavicle_' + s; m[S + 'Arm'] = 'upperarm_' + s; m[S + 'ForeArm'] = 'lowerarm_' + s; m[S + 'Hand'] = 'hand_' + s
        m[S + 'UpLeg'] = 'thigh_' + s; m[S + 'Leg'] = 'calf_' + s; m[S + 'Foot'] = 'foot_' + s; m[S + 'ToeBase'] = 'ball_' + s
        for F, f in FING.items():
            for k in (1, 2, 3): m['%sHand%s%d' % (S, F, k)] = '%s_%02d_%s' % (f, k, s)
    return m
MAP = full_map()
INV = {v: k for k, v in MAP.items()}

def rig():
    c = bpy.data.collections['alt_soldier']
    return next(o for o in c.objects if o.type == 'ARMATURE'), [o for o in c.objects if o.type == 'MESH']
def _rest_rel(b):
    return (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy()

def _frame(d, a):
    d = d.normalized(); a = (a - d * a.dot(d)).normalized(); return Matrix((d, a, d.cross(a))).transposed()

def alignments(src):
    """Je Zielknochen eine Drehung A (Weltachsen), die die Ruhelage des Soldaten auf die von Mixamo dreht (A·Ziel = Quelle)."""
    arm, _ = rig(); tb = arm.data.bones; sb = src.data.bones; sm = src.matrix_world.to_3x3().normalized(); tm = arm.matrix_world.to_3x3().normalized()
    T = lambda n: tm @ tb[n].head_local
    S = lambda n: sm @ sb[PF + n].head_local
    A = {}
    def line(tn, tn2, sn, sn2):
        A[tn] = (T(tn2) - T(tn)).rotation_difference(S(sn2) - S(sn)).to_matrix()
    for Sd, s in (('Left', 'l'), ('Right', 'r')):
        line('clavicle_' + s, 'upperarm_' + s, Sd + 'Shoulder', Sd + 'Arm')
        line('upperarm_' + s, 'lowerarm_' + s, Sd + 'Arm', Sd + 'ForeArm')
        line('thigh_' + s, 'calf_' + s, Sd + 'UpLeg', Sd + 'Leg')
        line('calf_' + s, 'foot_' + s, Sd + 'Leg', Sd + 'Foot')
        line('foot_' + s, 'ball_' + s, Sd + 'Foot', Sd + 'ToeBase')
        # Handrahmen: Richtung Handgelenk → Mittelfinger, Nebenachse Zeigefinger- → Kleinfingerknöchel
        acT = T('index_01_' + s) - T('pinky_01_' + s); acS = S(Sd + 'HandIndex1') - S(Sd + 'HandPinky1')
        Ft = _frame(T('middle_01_' + s) - T('hand_' + s), acT); Fs = _frame(S(Sd + 'HandMiddle1') - S(Sd + 'Hand'), acS)
        A['hand_' + s] = Fs @ Ft.transposed()
        Ft = _frame(T('hand_' + s) - T('lowerarm_' + s), acT); Fs = _frame(S(Sd + 'Hand') - S(Sd + 'ForeArm'), acS)
        A['lowerarm_' + s] = Fs @ Ft.transposed()
        for F, f in FING.items():
            for k in (1, 2):
                tn, tn2 = '%s_%02d_%s' % (f, k, s), '%s_%02d_%s' % (f, k + 1, s)
                sn, sn2 = '%sHand%s%d' % (Sd, F, k), '%sHand%s%d' % (Sd, F, k + 1)
                Ft = _frame(T(tn2) - T(tn), acT); Fs = _frame(S(sn2) - S(sn), acS)
                A[tn] = Fs @ Ft.transposed()
            A['%s_03_%s' % (f, s)] = A['%s_02_%s' % (f, s)]
    return A

def _hips_track(src, f0, f1):
    sc = bpy.context.scene; mw = src.matrix_world; hb = src.pose.bones[PF + 'Hips']; out = []
    for f in range(f0, f1 + 1):
        sc.frame_set(f); out.append(mw @ hb.head)
    return out

def set_prefix(src):
    global PF
    n = src.data.bones[0].name; PF = n.split(':')[0] + ':' if ':' in n else ''

def retarget_full(src, name, loop=True, step=1, hips='abs'):
    """hips: 'abs' Hüfthöhe absolut (Ducken, Tod), 'feet' relativ zu den Füßen (Sprung: Flughöhe macht das Spiel)."""
    set_prefix(src)
    arm, _ = rig(); sc = bpy.context.scene
    act_src = src.animation_data.action; f0, f1 = map(int, act_src.frame_range)
    for pb in arm.pose.bones:
        for cn in list(pb.constraints): pb.constraints.remove(cn)
        pb.matrix_basis = Matrix.Identity(4)
    act = bpy.data.actions.get(name)
    if act: bpy.data.actions.remove(act)
    act = bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action = act
    sm3 = src.matrix_world.to_3x3().normalized(); tm3 = arm.matrix_world.to_3x3().normalized()
    A = alignments(src); sb = src.data.bones; order = list(arm.data.bones)
    hips_mode = hips
    hips = _hips_track(src, f0, f1); n = len(hips) - 1
    mw = src.matrix_world
    h_rest = (mw @ sb[PF + 'Hips'].head_local).z
    fz0 = min((mw @ sb[PF + 'LeftFoot'].head_local).z, (mw @ sb[PF + 'RightFoot'].head_local).z)
    tb = arm.data.bones
    hscale = (tb['pelvis'].head_local.z - min(tb['foot_l'].head_local.z, tb['foot_r'].head_local.z)) / max(1e-6, h_rest - min((mw @ sb[PF + 'LeftFoot'].head_local).z, (mw @ sb[PF + 'RightFoot'].head_local).z))
    drift = (hips[-1] - hips[0]); drift.z = 0
    frames = list(range(f0, f1 + 1, step))
    if frames[-1] != f1: frames.append(f1)
    for f in frames:
        sc.frame_set(f); i = f - f0
        pose_rot = {}
        for b in order:
            pb = arm.pose.bones[b.name]
            par_rot = pose_rot[b.parent.name] if b.parent else Matrix.Identity(3)
            rr = _rest_rel(b).to_3x3()
            sn = INV.get(b.name)
            if sn and (PF + sn) in sb:
                spb = src.pose.bones[PF + sn]
                Sw = sm3 @ spb.matrix.to_3x3(); Sr = sm3 @ sb[PF + sn].matrix_local.to_3x3(); Tr = tm3 @ b.matrix_local.to_3x3()
                R_arm = tm3.inverted() @ (Sw @ Sr.inverted() @ A.get(b.name, Matrix.Identity(3)) @ Tr)
                basis = (par_rot @ rr).inverted() @ R_arm
            else:
                basis = Matrix.Identity(3)
            pose_rot[b.name] = par_rot @ rr @ basis
            pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = basis.to_quaternion()
            pb.keyframe_insert('rotation_quaternion', frame=i + 1)
            if b.name == 'pelvis':
                d = hips[i] - hips[0]
                if loop: d = d - drift * (i / max(1, n))
                if hips_mode == 'feet':
                    fz = min((mw @ src.pose.bones[PF + 'LeftFoot'].head).z, (mw @ src.pose.bones[PF + 'RightFoot'].head).z)
                    d = Vector((d.x, d.y, (hips[i].z - fz) - (h_rest - fz0))) * hscale
                else:
                    d = Vector((d.x, d.y, hips[i].z - h_rest)) * hscale
                pb.location = b.matrix_local.to_3x3().inverted() @ (tm3.inverted() @ d)
                pb.keyframe_insert('location', frame=i + 1)
    act.use_fake_user = True
    info = {'frames': f1 - f0, 'loop': loop}
    if loop:
        dur = (f1 - f0) / 30.0
        dist = drift.length * hscale
        # Richtung in Figurachsen (Figur schaut nach -Y, rechts ist -X)
        fwd = -drift.y / max(1e-6, drift.length); right = -drift.x / max(1e-6, drift.length)
        info.update(speed=round(dist / dur, 3) if dist > 0.05 else 0, dir=[round(fwd, 3), round(right, 3)] if dist > 0.05 else [0, 0], stride=round(dist, 3))
        # Phase: Zeitpunkt, an dem der linke Fuß in Laufrichtung am weitesten vorn ist (Aufsetzen)
        if dist > 0.05:
            md = drift.normalized(); best, bf = -1e9, 0
            for f in range(f0, f1):
                sc.frame_set(f)
                lf = (mw @ src.pose.bones[PF + 'LeftFoot'].head) - (mw @ src.pose.bones[PF + 'Hips'].head)
                v = lf.dot(md)
                if v > best: best, bf = v, f
            info['phase'] = round((bf - f0) / max(1, f1 - f0), 3)
    return info

def weapon_rels(ref_action_name, frame=None):
    """Waffe relativ zur rechten Hand: Lauf zeigt im Zielclip von rechtem zu linkem Handgelenk, Oberseite nach oben."""
    arm, _ = rig(); sc = bpy.context.scene
    arm.animation_data.action = bpy.data.actions[ref_action_name]
    fr = frame or int(sum(arm.animation_data.action.frame_range) / 2)
    sc.frame_set(fr); bpy.context.view_layer.update()
    P = arm.pose.bones; mw = arm.matrix_world
    wr = mw @ P['hand_r'].head; wl = mw @ P['hand_l'].head
    hand = mw @ P['hand_r'].matrix
    G = builtins.__sns['GRIP']; out = {}
    for wid, g in G.items():
        gr = Vector(g['r'][0]); gl = Vector(g['l'][0])
        Fw = _frame(gl - gr, Vector((0, 0, 1))); Fa = _frame(wl - wr, Vector((0, 0, 1)))
        R = (Fa @ Fw.transposed()).to_4x4(); W = Matrix.Translation(wr - R.to_3x3() @ gr) @ R
        rel = (hand.inverted() @ W)
        out[wid] = [list(r) for r in rel]
    return out

def export_all(meta, rels, names):
    arm, meshes = rig(); sc = bpy.context.scene
    arm.animation_data.action = None
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    for tr in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(tr)
    for n in names:
        a = bpy.data.actions.get(n)
        if a: t = arm.animation_data.nla_tracks.new(); t.name = n; t.strips.new(n, int(a.frame_range[0]), a)
    for q in sc.objects: q.select_set(False)
    objs = [arm] + meshes
    for o in objs: o.select_set(True)
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    path = os.path.join(ROOT, 'asset-src', 'glb', 'station', 'Soldat.glb')
    with bpy.context.temp_override(window=win, area=area, region=region, active_object=arm, selected_objects=objs):
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_texcoords=True, export_normals=True,
                                  export_image_format='NONE', export_materials='EXPORT', export_skins=True, export_animations=True,
                                  export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_frame_step=2, export_def_bones=True,
                                  export_optimize_animation_size=True)
    data = {'weapon_in_hand': rels, 'heads': [o.name for o in meshes if o.name.startswith('Head')], 'clips': meta}
    json.dump(data, open(os.path.join(ROOT, 'asset-src', 'data', 'soldat_tp.json'), 'w'))
    return {'kb': round(os.path.getsize(path) / 1024)}
