# Spielerfigur aus dem gekauften Soldaten (CGTrader, "PBR Customized Soldier"; Quelle asset-src/neu/soldier_src, nicht im Repo).
# Läuft in asset-src/neu/soldier/Soldat.blend.
#   textures()        TGA (4K, Unity: Metallic R + Glätte in Alpha) → asset-src/tex/soldat_*@2048.png, kopf_h_*.png, kopf_m_*.png (ORM wie im Spiel)
#   pose_hands(id)    legt die Arme (SKM_Custom_Soldier_Arms) per IK an die Waffe id (k12, ig3, ef2) und backt sie zu einem festen Netz 'haende_<id>'
#   export_hands()    asset-src/glb/station/Mine_Haende.glb (Knoten haende_k12/ig3/ef2, Material ext_soldat; Lage im Raum der Waffe)
# Achsen der Waffen: +Y vorn, +Z oben, +X rechts, Ursprung am Abzug (wie waffe_build.py / waffen_build.py).
import bpy, os, math, json
import numpy as np
from mathutils import Vector, Matrix

ROOT = r'C:\Users\faceman\Desktop\CLAUDE\letzte-flotte'
SRC = os.path.join(ROOT, 'asset-src', 'neu', 'soldier_src')
TX = os.path.join(SRC, 'PBR_Customized_Soldier_Update', 'Models', 'Textures')
OUT = os.path.join(ROOT, 'asset-src', 'tex')

def _load(p, size, data=True):
    im = bpy.data.images.load(p, check_existing=False)
    im.colorspace_settings.name = 'Non-Color'          # roh lesen, keine Umrechnung
    if im.size[0] != size: im.scale(size, size)
    a = np.empty(size * size * 4, np.float32); im.pixels.foreach_get(a); bpy.data.images.remove(im)
    return a.reshape(size, size, 4)
def _save(a, name, size, srgb=False):
    im = bpy.data.images.new(name, size, size, alpha=False, float_buffer=False)
    im.colorspace_settings.name = 'Non-Color'
    im.pixels.foreach_set(np.ascontiguousarray(a, np.float32).ravel()); im.filepath_raw = os.path.join(OUT, name); im.file_format = 'PNG'; im.save()
    bpy.data.images.remove(im)

def textures():
    out = []
    sets = [('soldat', 2048, 'Body', 'Body_Albedo01.tga', 'Soldier_Normals.tga', 'Soldier_Metallic.tga', 'Soldier_Ao.tga', None, '@2048'),
            ('kopf_h', 1024, 'Head(H)', 'Head_H_Albedo.tga', 'Head_H_Normals.tga', 'Head_H_Metallic.tga', 'Head_H_Ao.tga', None, ''),
            ('kopf_m', 1024, 'Head(M)', 'Heads_Mech_Albedo.tga', 'Heads_Mech_Normals.tga', 'Heads_Mech_Metallic.tga', 'Heads_Mech_Ao.tga', 'Heads_Mech_Emissive.tga', '')]
    for name, size, d, alb, nrm, met, ao, emi, suf in sets:
        p = lambda f: os.path.join(TX, d, f)
        _save(_load(p(alb), size), '%s_col%s.png' % (name, suf), size)
        _save(_load(p(nrm), size), '%s_nrm%s.png' % (name, suf), size)
        m = _load(p(met), size); o = _load(p(ao), size)
        orm = np.ones_like(m); orm[..., 0] = o[..., 0]; orm[..., 1] = np.clip(1.0 - m[..., 3], 0.04, 1.0); orm[..., 2] = m[..., 0]
        _save(orm, '%s_orm%s.png' % (name, suf), size)
        if emi: _save(_load(p(emi), size), '%s_emi%s.png' % (name, suf), size)
        out.append(name)
    for i in (2, 4, 6):                                    # zwei weitere Farbvarianten der Uniform (für Anzüge)
        f = 'Body_Albedo%02d.tga' % i
        _save(_load(os.path.join(TX, 'Body', f), 1024), 'soldat_col_v%d.png' % i, 1024)
    return out

# ------------------------------------------------------------------ Hände an der Waffe
# Lage der Waffe vor der Kamera im Spiel (src/game/mineArt.ts, WDEFS.pos: rechts, oben, vorn) → Schultern im Raum der Waffe
POS = {'k12': (0.118, -0.178, -0.30), 'ig3': (0.128, -0.228, -0.42), 'ef2': (0.112, -0.168, -0.29), 'ar39': (0.17, -0.34, -0.40)}
# Griffpunkte je Waffe (Raum der Waffe): Handgelenk, Richtung Handgelenk→Knöchel, Richtung zum Daumen
GRIP = {
    'k12': {'r': ((0.020, -0.122, -0.040), (0.0, 0.78, -0.62), (-0.35, 0.55, 0.75)), 'l': ((-0.052, 0.255, 0.030), (0.2, 0.6, -0.77), (0.15, 0.9, 0.4))},
    'ig3': {'r': ((0.022, -0.118, -0.030), (0.0, 0.78, -0.62), (-0.35, 0.55, 0.75)), 'l': ((-0.052, 0.250, 0.042), (0.2, 0.6, -0.77), (0.15, 0.9, 0.4))},
    'ef2': {'r': ((0.024, -0.120, -0.035), (0.0, 0.78, -0.62), (-0.35, 0.55, 0.75)), 'l': ((-0.050, 0.212, 0.044), (0.2, 0.6, -0.77), (0.15, 0.9, 0.4))},
    # AR-39 (Tripo-Modell des Nutzers, asset-src/neu/mine/ar39): hohes Gehäuse, Griff sitzt tiefer unter dem Lauf, breiter Handschutz
    'ar39': {'r': ((0.020, -0.115, 0.000), (0.0, 0.78, -0.62), (-0.35, 0.55, 0.75)), 'l': ((-0.078, 0.180, 0.050), (0.2, 0.6, -0.77), (0.15, 0.9, 0.4))},
}
CURL = {'index': 0.55, 'middle': 1.25, 'ring': 1.3, 'pinky': 1.35, 'thumb': 0.45}     # Fingerkrümmung (rad je Glied) rechts
CURL_L = {'index': 1.05, 'middle': 1.15, 'ring': 1.2, 'pinky': 1.25, 'thumb': 0.35}

def _arms():
    c = bpy.data.collections['arme']
    return next(o for o in c.objects if o.type == 'ARMATURE'), next(o for o in c.objects if o.type == 'MESH')

def _palm_side(arm, side):
    """Seite, zu der sich die Finger krümmen (aus der leichten Krümmung der Ruhehaltung), in lokalen Koordinaten der Hand."""
    b = arm.data.bones
    h = b['hand_' + side]; base = b['middle_01_' + side].head_local; tip = b['middle_02_' + side].tail_local      # die Arme haben je Finger zwei Glieder
    d = (b['middle_01_' + side].tail_local - base).normalized(); off = (tip - base); off = off - d * off.dot(d)
    return (h.matrix_local.to_3x3().inverted() @ off).normalized()

def fix_arm_bones(arm):
    """Oberarm endet am Ellbogen, Unterarm am Handgelenk (im gekauften Skelett zeigen die Knochenenden ins Leere, der IK-Löser rechnet aber mit ihnen).
    Die Haut bleibt unverändert, weil Ruhe- und Posenlage gemeinsam verschoben werden."""
    if arm.get('arme_ausgerichtet'): return
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    for q in bpy.context.scene.objects: q.select_set(False)
    arm.select_set(True); bpy.context.view_layer.objects.active = arm
    with bpy.context.temp_override(window=win, area=area, region=region, active_object=arm, object=arm, selected_objects=[arm], selected_editable_objects=[arm]):
        bpy.ops.object.mode_set(mode='EDIT')
        eb = arm.data.edit_bones
        for sd in ('l', 'r'):
            eb['upperarm_' + sd].tail = eb['lowerarm_' + sd].head.copy()
            eb['lowerarm_' + sd].tail = eb['hand_' + sd].head.copy()
        bpy.ops.object.mode_set(mode='OBJECT')
    arm['arme_ausgerichtet'] = 1

def pose_hands(wid):
    arm, mesh = _arms()
    fix_arm_bones(arm)
    sc = bpy.context.scene
    # Figur schaut in Blender nach -Y; für die Waffe soll sie nach +Y schauen → um Z drehen, dann Schultern an ihren Platz
    px, py, pz = POS[wid]
    sh_target = Vector((0.0 - px, pz - 0.07, -0.215 - py))                  # Mitte zwischen den Schultern, 7 cm hinter dem Auge, 21,5 cm darunter
    sh_rest = (arm.data.bones['upperarm_l'].head_local + arm.data.bones['upperarm_r'].head_local) / 2 * 0.01   # Armatur ist 0,01 skaliert
    R = Matrix.Rotation(math.pi, 4, 'Z')
    # Oberkörper leicht schräg wie im Anschlag: linke Schulter vorn, rechte hinten
    arm.matrix_world = Matrix.Translation(sh_target) @ Matrix.Rotation(-0.42, 4, 'Z') @ R @ Matrix.Translation(-sh_rest) @ Matrix.Diagonal((0.01, 0.01, 0.01, 1))
    bpy.context.view_layer.update()
    for pb in arm.pose.bones:
        for cn in list(pb.constraints): pb.constraints.remove(cn)
        pb.matrix_basis = Matrix.Identity(4)
    tg = bpy.data.collections.get('haende_ziele') or bpy.data.collections.new('haende_ziele')
    if tg.name not in sc.collection.children: sc.collection.children.link(tg)
    for o in list(tg.objects): bpy.data.objects.remove(o, do_unlink=True)
    def empty(n, M):
        e = bpy.data.objects.new(n, None); e.empty_display_size = 0.02; e.matrix_world = M; tg.objects.link(e); return e
    for side in ('r', 'l'):
        (w, d, t) = GRIP[wid][side]
        w, d, t = Vector(w), Vector(d).normalized(), Vector(t)
        t = (t - d * t.dot(d)).normalized(); n = d.cross(t)
        # Zielausrichtung der Hand: lokales Y (Knochenrichtung) → d, lokale Daumenseite → t
        hb = arm.data.bones['hand_' + side]
        # Der Handknochen zeigt in diesem Skelett nicht zu den Fingern: Richtung Handgelenk → Mittelfingerwurzel und Daumen aus den Knochen ablesen
        inv = hb.matrix_local.to_3x3().inverted()
        fl = (inv @ (arm.data.bones['middle_01_' + side].head_local - hb.head_local)).normalized()
        thumb = inv @ (arm.data.bones['thumb_01_' + side].head_local - hb.head_local)
        tl = (thumb - fl * thumb.dot(fl)).normalized(); nl = fl.cross(tl)
        Rw = Matrix((t, d, n)).transposed() @ Matrix((tl, fl, nl)).transposed().inverted()
        e_ik = empty('ik_' + side, Matrix.Translation(w))
        e_rot = empty('rot_' + side, Matrix.Translation(w) @ Rw.to_4x4())
        sx = 1 if side == 'r' else -1
        # Ellbogen: rechts nach außen-unten, links weit nach links (sonst läuft der Unterarm durch das Magazin)
        e_pole = empty('pole_' + side, Matrix.Translation(Vector((w.x + 0.35, w.y - 0.25, w.z - 0.35)) if side == 'r' else Vector((w.x - 0.65, w.y - 0.05, w.z - 0.18))))
        # Ziel ist der Kopf des Handknochens (das Handgelenk); das Ende des Unterarmknochens liegt in diesem Skelett nicht dort
        hp = arm.pose.bones['hand_' + side]
        # IK am Unterarm, Ziel = sein Ende (nach fix_arm_bones das Handgelenk); links darf auch das Schlüsselbein mitgehen (Schulter nach vorn)
        lo = arm.pose.bones['lowerarm_' + side]
        ik = lo.constraints.new('IK'); ik.target = e_ik; ik.chain_count = 2 if side == 'r' else 3; ik.pole_target = e_pole; ik.pole_angle = 0.0; ik.use_tail = True
        hc = hp.constraints.new('COPY_ROTATION'); hc.target = e_rot; hc.target_space = 'WORLD'; hc.owner_space = 'WORLD'
        # Finger krümmen: um die lokale Achse, die die Spitze zur Handfläche bewegt
        palm = _palm_side(arm, side)
        cu = CURL if side == 'r' else CURL_L
        for f, a in cu.items():
            for k in (1, 2, 3):
                bn = '%s_%02d_%s' % (f, k, side)
                if bn not in arm.pose.bones: continue
                pb = arm.pose.bones[bn]; bone = arm.data.bones[bn]
                # Achse senkrecht zu Knochen und Handflächenrichtung (im Knochenraum)
                pl = bone.matrix_local.to_3x3().inverted() @ (hb.matrix_local.to_3x3() @ palm)
                ax = Vector((0, 1, 0)).cross(pl).normalized()
                ang = a * (0.6 if k == 1 else 1.0) * (0.7 if f == 'thumb' else 1.0) * (1 if side == 'r' else -1)   # links ist die Ruhekrümmung gespiegelt
                if f == 'index' and side == 'r' and k > 1: ang *= 0.5          # Zeigefinger liegt am Abzug
                pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = Matrix.Rotation(ang, 3, ax).to_quaternion()
    bpy.context.view_layer.update()
    # gestellte Arme zu einem festen Netz
    dg = bpy.context.evaluated_depsgraph_get(); dg.update()
    me = bpy.data.meshes.new_from_object(mesh.evaluated_get(dg)); me.transform(mesh.matrix_world)
    name = 'haende_' + wid
    old = bpy.data.objects.get(name)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    hc = bpy.data.collections.get('haende') or bpy.data.collections.new('haende')
    if hc.name not in sc.collection.children: sc.collection.children.link(hc)
    ob = bpy.data.objects.new(name, me); hc.objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    return {'tris': sum(len(p.vertices) - 2 for p in me.polygons)}

def material():
    m = bpy.data.materials.get('ext_soldat') or bpy.data.materials.new('ext_soldat'); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
    out = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled'); L(b.outputs[0], out.inputs[0])
    def tx(f, data):
        im = bpy.data.images.load(os.path.join(OUT, f), check_existing=True)
        if data: im.colorspace_settings.name = 'Non-Color'
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = im; return t
    L(tx('soldat_col@2048.png', False).outputs[0], b.inputs['Base Color'])
    sp = nt.nodes.new('ShaderNodeSeparateColor'); L(tx('soldat_orm@2048.png', True).outputs[0], sp.inputs[0]); L(sp.outputs[1], b.inputs['Roughness']); L(sp.outputs[2], b.inputs['Metallic'])
    nm = nt.nodes.new('ShaderNodeNormalMap'); L(tx('soldat_nrm@2048.png', True).outputs[0], nm.inputs['Color']); L(nm.outputs[0], b.inputs['Normal'])
    return m

def export_hands():
    m = material(); obs = []
    for wid in ('k12', 'ig3', 'ef2', 'ar39'):
        o = bpy.data.objects.get('haende_' + wid)
        if not o: continue
        o.data.materials.clear(); o.data.materials.append(m); obs.append(o)
    sc = bpy.context.scene
    for q in sc.objects: q.select_set(False)
    for o in obs: o.select_set(True)
    win = bpy.context.window; area = next(a for a in win.screen.areas if a.type == 'VIEW_3D'); region = next(r for r in area.regions if r.type == 'WINDOW')
    path = os.path.join(ROOT, 'asset-src', 'glb', 'station', 'Mine_Haende.glb')
    with bpy.context.temp_override(window=win, area=area, region=region, active_object=obs[0], selected_objects=obs):
        bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_texcoords=True, export_normals=True,
                                  export_image_format='NONE', export_materials='EXPORT', export_extras=False)
    return {'kb': round(os.path.getsize(path) / 1024), 'nodes': [o.name for o in obs]}
