# Spielerfigur für die Außensicht (third person): der Soldat aus PBR_Customized_Soldier (UE4-Skelett, alle 8 Köpfe, Rüstung, Taschen).
# Läuft in Soldat.blend nach soldat_build.py (nutzt dessen GRIP, fix_arm_bones-Idee und Texturen).
#   prepare()          Maßstab anwenden (Skelett in Metern), Materialien ext_soldat / ext_kopf_m / ext_kopf_h
#   rifle_pose(wid)    Arme per IK an die Waffe vor der Brust (Anschlag); gibt die lokalen Knochenlagen zurück
#   retarget(...)      Mixamo-Bewegung (Hüfte, Rücken, Kopf, Beine) aufs Skelett, Arme in Gewehrhaltung → Aktion
#   export()           asset-src/glb/char/Soldat.glb (Figur + Aktionen idle, walk) und asset-src/data/soldat_tp.json (Waffe an der rechten Hand)
import bpy, os, math, json
from mathutils import Vector, Matrix

ROOT = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte'
COLL = 'alt_soldier'
MAP = {'Hips': 'pelvis', 'Spine': 'spine_01', 'Spine1': 'spine_02', 'Spine2': 'spine_03', 'Neck': 'neck_01', 'Head': 'head',
       'LeftUpLeg': 'thigh_l', 'LeftLeg': 'calf_l', 'LeftFoot': 'foot_l', 'LeftToeBase': 'ball_l',
       'RightUpLeg': 'thigh_r', 'RightLeg': 'calf_r', 'RightFoot': 'foot_r', 'RightToeBase': 'ball_r'}
ARMS = ('clavicle', 'upperarm', 'lowerarm', 'lowerarm_twist_01', 'hand', 'thumb', 'index', 'middle', 'ring', 'pinky')

def _ctx():
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    return dict(window=win, area=area, region=region)
def rig():
    c = bpy.data.collections[COLL]
    return next(o for o in c.objects if o.type == 'ARMATURE'), [o for o in c.objects if o.type == 'MESH']

def prepare():
    arm, meshes = rig()
    if not arm.get('tp_bereit'):
        for q in bpy.context.scene.objects: q.select_set(False)
        objs = [arm] + meshes
        for o in objs: o.select_set(True)
        with bpy.context.temp_override(**_ctx(), active_object=arm, object=arm, selected_objects=objs, selected_editable_objects=objs):
            bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        # Oberarm endet am Ellbogen, Unterarm am Handgelenk (für den IK-Löser)
        for q in bpy.context.scene.objects: q.select_set(False)
        arm.select_set(True); bpy.context.view_layer.objects.active = arm
        with bpy.context.temp_override(**_ctx(), active_object=arm, object=arm, selected_objects=[arm], selected_editable_objects=[arm]):
            bpy.ops.object.mode_set(mode='EDIT')
            eb = arm.data.edit_bones
            for sd in ('l', 'r'):
                eb['upperarm_' + sd].tail = eb['lowerarm_' + sd].head.copy(); eb['lowerarm_' + sd].tail = eb['hand_' + sd].head.copy()
            bpy.ops.object.mode_set(mode='OBJECT')
        arm['tp_bereit'] = 1
    mats = {}
    for name in ('ext_soldat', 'ext_kopf_m', 'ext_kopf_h'):
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name); mats[name] = m
    for o in meshes:
        n = o.name
        o.data.materials.clear(); o.data.materials.append(mats['ext_kopf_m'] if n.startswith(('Head01', 'Head02', 'Head03', 'Head04')) else mats['ext_kopf_h'] if n.startswith('Head') else mats['ext_soldat'])
    return {'scale': list(arm.scale), 'meshes': [o.name for o in meshes]}

def _rest_rel(b):
    return (b.parent.matrix_local.inverted() @ b.matrix_local) if b.parent else b.matrix_local.copy()

def weapon_matrix():
    """Waffe im Anschlag vor der rechten Schulter (Figur schaut nach -Y, rechts ist -X): Ursprung (Abzug) vor der Brust, Lauf nach vorn."""
    return Matrix.Translation((-0.12, -0.27, 1.34)) @ Matrix.Rotation(math.pi, 4, 'Z')

def rifle_pose(wid, grips):
    """Arme per IK an die Waffe; liefert {Knochen: lokale Basis} und die Lage der Waffe relativ zur rechten Hand."""
    arm, _ = rig(); sc = bpy.context.scene
    for pb in arm.pose.bones:
        for cn in list(pb.constraints): pb.constraints.remove(cn)
        pb.matrix_basis = Matrix.Identity(4)
    W = arm.matrix_world.inverted() @ weapon_matrix()           # Waffe im Raum der Armatur
    tg = bpy.data.collections.get('tp_ziele') or bpy.data.collections.new('tp_ziele')
    if tg.name not in sc.collection.children: sc.collection.children.link(tg)
    for o in list(tg.objects): bpy.data.objects.remove(o, do_unlink=True)
    def empty(n, M):
        e = bpy.data.objects.new(n, None); e.empty_display_size = 0.03; e.matrix_world = M; tg.objects.link(e); return e
    Wm = weapon_matrix(); R3 = Wm.to_3x3()
    for side in ('r', 'l'):
        w, d, t = grips[side]
        w = Wm @ Vector(w); d = (R3 @ Vector(d)).normalized(); t = R3 @ Vector(t); t = (t - d * t.dot(d)).normalized(); n = d.cross(t)
        hb = arm.data.bones['hand_' + side]; inv = hb.matrix_local.to_3x3().inverted()
        fl = (inv @ (arm.data.bones['middle_01_' + side].head_local - hb.head_local)).normalized()
        th = inv @ (arm.data.bones['thumb_01_' + side].head_local - hb.head_local); tl = (th - fl * th.dot(fl)).normalized(); nl = fl.cross(tl)
        Rw = Matrix((t, d, n)).transposed() @ Matrix((tl, fl, nl)).transposed().inverted()
        e_ik = empty('tp_ik_' + side, Matrix.Translation(w)); e_rot = empty('tp_rot_' + side, Matrix.Translation(w) @ Rw.to_4x4())
        out = -1 if side == 'r' else 1                                   # rechts ist -X
        e_pole = empty('tp_pole_' + side, Matrix.Translation(w + Vector((out * 0.45, 0.25, -0.35))))
        lo = arm.pose.bones['lowerarm_' + side]
        ik = lo.constraints.new('IK'); ik.target = e_ik; ik.chain_count = 2 if side == 'r' else 3; ik.pole_target = e_pole; ik.use_tail = True
        hc = arm.pose.bones['hand_' + side].constraints.new('COPY_ROTATION'); hc.target = e_rot; hc.target_space = 'WORLD'; hc.owner_space = 'WORLD'
    # Finger wie bei den Händen der Ich-Sicht (Krümmung zur Handfläche, links gespiegelt)
    curl = {'r': {'index': 0.55, 'middle': 1.25, 'ring': 1.3, 'pinky': 1.35, 'thumb': 0.45}, 'l': {'index': 1.05, 'middle': 1.15, 'ring': 1.2, 'pinky': 1.25, 'thumb': 0.35}}
    for side in ('r', 'l'):
        b = arm.data.bones; hb = b['hand_' + side]
        base = b['middle_01_' + side].head_local; tip = b['middle_03_' + side].tail_local
        dd = (b['middle_01_' + side].tail_local - base).normalized(); off = tip - base; off = off - dd * off.dot(dd)
        palm = (hb.matrix_local.to_3x3().inverted() @ off).normalized()
        for f, a in curl[side].items():
            for k in (1, 2, 3):
                bn = '%s_%02d_%s' % (f, k, side)
                if bn not in arm.pose.bones: continue
                pl = b[bn].matrix_local.to_3x3().inverted() @ (hb.matrix_local.to_3x3() @ palm)
                ax = Vector((0, 1, 0)).cross(pl).normalized()
                ang = a * (0.6 if k == 1 else 1.0) * (0.7 if f == 'thumb' else 1.0) * (1 if side == 'r' else -1)
                if f == 'index' and side == 'r' and k > 1: ang *= 0.5
                pb = arm.pose.bones[bn]; pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = Matrix.Rotation(ang, 3, ax).to_quaternion()
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    # Ergebnis als lokale Basis der Armknochen lesen (Constraints wirken nicht auf matrix_basis)
    basis = {}
    for pb in arm.pose.bones:
        if not pb.name.startswith(ARMS): continue
        par = pb.parent
        pm = (par.matrix @ _rest_rel(pb.bone)) if par else pb.bone.matrix_local
        basis[pb.name] = pm.inverted() @ pb.matrix
    hand = arm.pose.bones['hand_r'].matrix
    rel = hand.inverted() @ W                                           # Waffe im Raum des Handknochens
    for pb in arm.pose.bones:
        for cn in list(pb.constraints): pb.constraints.remove(cn)
    return basis, rel

def retarget(src_arm, action, name, frames, arm_basis, step=1):
    """Überträgt eine Mixamo-Aktion: Weltdrehung je Knochen relativ zur Ruhelage; Hüfte nur in der Höhe (am Platz). Arme fest in Gewehrhaltung."""
    arm, _ = rig(); sc = bpy.context.scene
    src_arm.animation_data_create(); src_arm.animation_data.action = action
    act = bpy.data.actions.get(name)
    if act: bpy.data.actions.remove(act)
    act = bpy.data.actions.new(name); arm.animation_data_create(); arm.animation_data.action = act
    sm3 = src_arm.matrix_world.to_3x3().normalized(); tm3 = arm.matrix_world.to_3x3().normalized()
    order = [b for b in arm.data.bones]                                  # Eltern stehen vor Kindern
    sb = {b.name.split(':')[-1]: b for b in src_arm.data.bones}
    # Hüfthöhe über den Füßen (unabhängig davon, wohin der Clip läuft)
    mw = src_arm.matrix_world
    h_rest = (mw @ sb['Hips'].head_local).z - min((mw @ sb['LeftFoot'].head_local).z, (mw @ sb['RightFoot'].head_local).z)
    pel0 = arm.data.bones['pelvis'].head_local
    hscale = (pel0.z - min(arm.data.bones['foot_l'].head_local.z, arm.data.bones['foot_r'].head_local.z)) / max(1e-6, h_rest)
    fr = list(range(frames[0], frames[1] + 1, step))
    for i, f in enumerate(fr):
        sc.frame_set(f)
        pose_rot = {}
        for b in order:
            pb = arm.pose.bones[b.name]
            par_rot = pose_rot[b.parent.name] if b.parent else Matrix.Identity(3)
            rr = _rest_rel(b).to_3x3()
            src_name = next((k for k, v in MAP.items() if v == b.name), None)
            if b.name in arm_basis:
                basis = arm_basis[b.name].to_3x3()
            elif src_name and src_name in sb:
                spb = src_arm.pose.bones[sb[src_name].name]
                Sw = sm3 @ spb.matrix.to_3x3(); Sr = sm3 @ sb[src_name].matrix_local.to_3x3()
                Tr = tm3 @ b.matrix_local.to_3x3()
                # Ruhehaltungen angleichen: Knochenrichtung des Ziels auf die der Quelle drehen (der Soldat steht mit leicht gebeugten Knien)
                # nur Ober- und Unterschenkel: Becken, Rücken und Kopf haben im UE-Skelett andere Knochenachsen als bei Mixamo
                # Richtung = Linie zum nächsten Gelenk (die Knochenenden zeigen in beiden Skeletten nicht dorthin)
                if b.name.startswith(('thigh', 'calf')):
                    sd = b.name[-1]; tc = arm.data.bones[('calf_' if b.name.startswith('thigh') else 'foot_') + sd]
                    scn = ('Leg' if src_name.endswith('UpLeg') else 'Foot'); scn = ('Left' if sd == 'l' else 'Right') + scn
                    dT = tm3 @ (tc.head_local - b.head_local); dS = sm3 @ (sb[scn].head_local - sb[src_name].head_local)
                    A = dT.rotation_difference(dS).to_matrix()
                else:
                    A = Matrix.Identity(3)
                R_arm = tm3.inverted() @ (Sw @ Sr.inverted() @ A @ Tr)
                basis = (par_rot @ rr).inverted() @ R_arm
            else:
                basis = Matrix.Identity(3)
            pose_rot[b.name] = par_rot @ rr @ basis
            pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = basis.to_quaternion()
            pb.keyframe_insert('rotation_quaternion', frame=i * step + 1)
            if b.name == 'pelvis':
                Pz = lambda n: (mw @ src_arm.pose.bones[sb[n].name].head).z
                dz = ((Pz('Hips') - min(Pz('LeftFoot'), Pz('RightFoot'))) - h_rest) * hscale
                loc_arm = Vector((0, 0, dz))
                pb.location = b.matrix_local.to_3x3().inverted() @ loc_arm
                pb.keyframe_insert('location', frame=i * step + 1)
    act.use_fake_user = True
    return {'action': act.name, 'frames': len(fr)}

def export(rels):
    arm, meshes = rig(); sc = bpy.context.scene
    arm.animation_data.action = None
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    # Aktionen als NLA-Spuren, damit der Export alle mitnimmt
    for tr in list(arm.animation_data.nla_tracks): arm.animation_data.nla_tracks.remove(tr)
    for n in ('idle', 'walk'):
        a = bpy.data.actions.get(n)
        if a: t = arm.animation_data.nla_tracks.new(); t.name = n; t.strips.new(n, 1, a)
    for q in sc.objects: q.select_set(False)
    objs = [arm] + meshes
    for o in objs: o.select_set(True)
    path = os.path.join(ROOT, 'asset-src', 'glb', 'station', 'Soldat.glb')
    with bpy.context.temp_override(**_ctx(), active_object=arm, selected_objects=objs):
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_texcoords=True, export_normals=True,
                                  export_image_format='NONE', export_materials='EXPORT', export_skins=True, export_animations=True,
                                  export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_def_bones=True)
    # Waffe an der rechten Hand: Matrix im Raum des Handknochens (Blender-Achsen des Knochens; glTF übernimmt sie)
    data = {'weapon_in_hand': {k: [list(r) for r in v] for k, v in rels.items()}, 'heads': [o.name for o in meshes if o.name.startswith('Head')]}
    json.dump(data, open(os.path.join(ROOT, 'asset-src', 'data', 'soldat_tp.json'), 'w'))
    return {'kb': round(os.path.getsize(path) / 1024)}
