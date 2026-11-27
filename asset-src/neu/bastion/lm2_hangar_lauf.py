# Hangar der Bastion als Lichtraum 2 (Blender im Hintergrund):
#   blender.exe -b --python lm2_hangar_lauf.py -- <opt.json>
# Baut den Hangar in der Fassung fürs Spiel (SPIEL = True) frisch in Lichtraum2Hangar.blend, speichert die Datei und führt dann
# lm2_raum.py mit den Einstellungen aus opt.json aus (Teile nach Lage statt nach Zellen, OPT['split'] = 'hangar').
# Mit OPT['nur_zaehlen'] wird nur gebaut und gezählt (Dreiecke je Sammlung und je Art von Baustein, voll und schlank).
# ACHTUNG: lm2_raum.py verändert die Szene; die Datei wird danach nicht mehr gespeichert.
import bpy, os, sys, json, math, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:]
opt = json.load(open(os.path.join(B, a[0]), encoding='utf-8'))
bpy.ops.wm.read_homefile(use_empty=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'Lichtraum2Hangar.blend'))
mark = os.path.join(B, opt.get('mark', 'lm2-hangar.txt'))
def tri_count():
    dg = bpy.context.evaluated_depsgraph_get(); cache = {}; per = {}
    for it in dg.object_instances:
        ob = it.object
        if ob.type not in ('MESH', 'CURVE', 'FONT'): continue
        key = ob.original.name
        if key not in cache:
            try: me = ob.to_mesh(); cache[key] = sum(len(p.vertices) - 2 for p in me.polygons); ob.to_mesh_clear()
            except Exception: cache[key] = 0
        par = it.parent.original if it.parent else None
        coll = par.users_collection[0].name if par and par.users_collection else (ob.original.users_collection[0].name if ob.original.users_collection else '?')
        mod = par.instance_collection.name if par and par.instance_collection else '(frei)'
        art = mod.split(' ')[0] if mod != '(frei)' else mod
        k = coll + ' · ' + art; per[k] = per.get(k, 0) + cache[key]
    return dict(sorted(per.items(), key=lambda q: -q[1]))
# Standflächen fürs Spiel (seit 2026-11-27, asset-src/data/hangar_bastion2.json): je gesetztem Baustein der Umriss seiner Teile zwischen 0,2 und
# 1,9 m Höhe (dieselbe Regel wie bk_export.py block_of), in Blender-Lage [x0, x1, y0, y1]. Vorher kamen sie aus den Daten des alten Hangars
# (hangar_bastion.json); neue Bausteine der zweiten Runde stünden dort nicht drin.
def bloecke():
    import numpy as np
    from mathutils import Matrix
    dg = bpy.context.evaluated_depsgraph_get(); cache = {}; out = []; ROOT = os.path.abspath(os.path.join(B, '..', '..', '..'))
    STAIN = ('Laufspur', 'Rostspur', 'Staubspur', 'Fleck', 'Abrieb')
    def flat(objs, T):
        for ob in objs:
            if ob.type == 'EMPTY' and ob.instance_type == 'COLLECTION' and ob.instance_collection: yield from flat(ob.instance_collection.objects, T @ ob.matrix_world)
            else: yield ob, T @ ob.matrix_world
    def block_of(c):
        nm = c.name
        if nm in cache: return cache[nm]
        cache[nm] = None
        if not nm.startswith(('Wand ', 'Objekt ', 'Halle ', 'H Spant', 'H Eckturm')) or nm in ('Objekt schleuse', 'Objekt pendel'): return None
        P = []
        for ob, MW in flat(c.objects, Matrix.Identity(4)):
            if ob.type not in ('MESH', 'CURVE', 'FONT'): continue
            ms = [s.material for s in ob.material_slots if s.material]
            if ms and ms[0].name.split('.')[0] in STAIN: continue
            me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg), depsgraph=dg); me.transform(MW)
            co = np.empty(len(me.vertices) * 3, dtype=np.float32); me.vertices.foreach_get('co', co); P.append(co.reshape(-1, 3)); bpy.data.meshes.remove(me)
        if not P: return None
        co = np.concatenate(P); ok = (co[:, 2] > 0.2) & (co[:, 2] < 1.9)
        if nm.startswith('Wand '): ok &= co[:, 0] > -1.69
        if not ok.any(): return None
        p = co[ok]; x0, x1, y0, y1 = float(p[:, 0].min()), float(p[:, 0].max()), float(p[:, 1].min()), float(p[:, 1].max())
        if nm.startswith('Wand '):
            if x1 < -1.7 + 0.16: return None
            x0 = -1.72
        cache[nm] = (x0, x1, y0, y1); return cache[nm]
    for e in bpy.data.collections['Hangar'].objects:
        if not (e.type == 'EMPTY' and e.instance_type == 'COLLECTION' and e.instance_collection): continue
        b = block_of(e.instance_collection)
        if not b: continue
        a = e.rotation_euler.z; cs, sn = math.cos(a), math.sin(a); X = []; Y = []
        for (px, py) in ((b[0], b[2]), (b[1], b[2]), (b[1], b[3]), (b[0], b[3])): X.append(e.location.x + px * cs - py * sn); Y.append(e.location.y + px * sn + py * cs)
        out.append([round(min(X), 2), round(max(X), 2), round(min(Y), 2), round(max(Y), 2)])
    open(os.path.join(ROOT, 'asset-src', 'data', 'hangar_bastion2.json'), 'w', encoding='utf-8').write(json.dumps({'bloecke': out}))
    return len(out)
try:
    ns = {'__name__': '__main__', 'SPIEL': True}
    for f in ('bk_kit.py', 'bk_mehr.py', 'bk_hangar.py', 'bk_halle.py', 'bk_hangar2.py'):      # bk_hangar2.py: zweite Runde (2026-11-27)
        p = os.path.join(B, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    bloecke()
    if opt.get('nur_daten'): open(mark, 'w', encoding='utf-8').write('nur Daten ' + str(ns.get('result')))
    elif opt.get('nur_zaehlen'):
        voll = tri_count()
        for ob in bpy.data.objects:
            for md in ob.modifiers:
                if md.type == 'BEVEL': md.segments = 1
            if ob.type == 'CURVE': ob.data.bevel_resolution = min(ob.data.bevel_resolution, 2)
        schlank = tri_count()
        open(mark, 'w', encoding='utf-8').write(json.dumps({'voll': voll, 'summe_voll': sum(voll.values()), 'schlank': schlank, 'summe_schlank': sum(schlank.values()), 'result': str(ns.get('result'))}, ensure_ascii=False, indent=1))
    else:
        open(mark, 'w', encoding='utf-8').write('gebaut ' + str(ns.get('result')))
        bpy.app.timers.register = lambda fn, first_interval=0, persistent=False: fn()
        p = os.path.join(B, 'lm2_raum.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), {'__name__': '__main__', 'OPT': opt})
except Exception:
    open(mark, 'w', encoding='utf-8').write('FEHLER ' + traceback.format_exc()[-2500:])
