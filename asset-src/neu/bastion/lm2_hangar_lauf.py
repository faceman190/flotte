# Hangar der Bastion als Lichtraum 2 (Blender im Hintergrund):
#   blender.exe -b --python lm2_hangar_lauf.py -- <opt.json>
# Baut den Hangar in der Fassung fürs Spiel (SPIEL = True) frisch in Lichtraum2Hangar.blend, speichert die Datei und führt dann
# lm2_raum.py mit den Einstellungen aus opt.json aus (Teile nach Lage statt nach Zellen, OPT['split'] = 'hangar').
# Mit OPT['nur_zaehlen'] wird nur gebaut und gezählt (Dreiecke je Sammlung und je Art von Baustein, voll und schlank).
# ACHTUNG: lm2_raum.py verändert die Szene; die Datei wird danach nicht mehr gespeichert.
import bpy, os, sys, json, traceback
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
try:
    ns = {'__name__': '__main__', 'SPIEL': True}
    for f in ('bk_kit.py', 'bk_mehr.py', 'bk_hangar.py', 'bk_halle.py'):
        p = os.path.join(B, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    if opt.get('nur_zaehlen'):
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
