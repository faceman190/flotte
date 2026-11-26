# Schiffsmodule bauen und Übersichtsbilder rendern:  blender.exe -b --python mod_lauf.py -- [system waffe abwehr antrieb | alle]
# Baut Module.blend neu (mod_kit.py). Bilder mod-<art>-a.jpg / -b.jpg (je vier Module), Fortschritt in mod.txt.
import bpy, os, sys, json, time, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
mark = os.path.join(B, 'mod.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'Module.blend'))
    ns = {'__name__': '__main__'}
    p = os.path.join(B, 'mod_kit.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    tris = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for o in ns['C_MOD'].all_objects:
        if o.type in ('MESH', 'CURVE', 'FONT'):
            me = o.evaluated_get(dg).to_mesh(); tris += sum(len(pl.vertices) - 2 for pl in me.polygons); o.evaluated_get(dg).to_mesh_clear()
    note('gebaut %s in %.0f s, %d Dreiecke' % (json.dumps(ns['result']), time.time() - t0, tris))
    arten = list(ns['MODULE']) if a == ['alle'] else a
    if arten:
        ns['stages'](); ns['world']('grau')
        for nm in list(bpy.data.objects.keys()):
            if nm.startswith('Figur'): bpy.data.objects[nm].hide_render = True
        ns['cycles'](int(os.environ.get('KOR_SAMPLES', '48')))
        for art in arten:
            n = len(ns['MODULE'][art]); y = ns['REIHE'][art]; h = 0.45 if art == 'system' else 0.6
            for teil, (i0, i1) in (('a', (0, 3)), ('b', (n - 4, n - 1))):
                xc = ((i0 + i1) / 2 - (n - 1) / 2) * 1.4; nm = 'Reihe %s %s' % (art, teil)
                ns['cam'](nm, (xc + 0.5, y - 4.6, h + 1.0), (xc, y, h), 35)
                ns['VIEWS'] = {nm: (nm, 'grau', True, 0.2, 0.0)}
                ns['_view0'](nm, os.path.join(B, 'mod-%s-%s.jpg' % (art, teil))); note('%s %s' % (art, teil))
    bpy.ops.wm.save_mainfile()
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
