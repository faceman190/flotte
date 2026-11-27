# Moewe ohne Fenster bauen und rendern:  blender.exe -b --python kra_lauf.py -- [ansicht ... | alle | bauplan]
# Baut Moewe.blend neu (moe_kit.py), speichert und rendert die Ansichten nach moe-<ansicht>.jpg. Fortschritt in moe.txt.
import bpy, os, sys, json, time, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
mark = os.path.join(B, 'moe.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'Moewe.blend'))
    ns = {'__name__': '__main__'}
    p = os.path.join(B, 'moe_kit.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    note('gebaut %s in %.0f s' % (json.dumps(ns['result'], ensure_ascii=False), time.time() - t0))
    note('Maße %s' % json.dumps(ns['extents']()))
    note('Dreiecke %d' % ns['tris']())
    views = [v for v in ns['VIEWS'] if v != 'halb'] if a == ['alle'] else a
    if views:
        ns['cycles'](int(os.environ.get('KOR_SAMPLES', '96')))
        for v in views:
            tv = time.time()
            if v == 'bauplan': ns['bauplan'](os.path.join(B, 'moe-bauplan.jpg'))
            else: ns['view'](v, os.path.join(B, 'moe-' + v + '.jpg'))
            note('%s in %.0f s' % (v, time.time() - tv))
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
