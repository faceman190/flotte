# Würger ohne Fenster bauen und rendern:  blender.exe -b --python wue_lauf.py -- [ansicht ... | alle]
# Baut Wuerger.blend neu (wue_kit.py), speichert und rendert die Ansichten nach wue-<ansicht>.jpg. Fortschritt in wue.txt.
import bpy, os, sys, json, time, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
mark = os.path.join(B, 'wue.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'Wuerger.blend'))
    ns = {'__name__': '__main__'}
    p = os.path.join(B, 'wue_kit.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    note('gebaut %s in %.0f s' % (json.dumps(ns['result'], ensure_ascii=False), time.time() - t0))
    note('Maße %s' % json.dumps(ns['extents']()))
    note('Dreiecke %d' % ns['tris']())
    views = list(ns['VIEWS']) if a == ['alle'] else a
    if views:
        ns['cycles'](int(os.environ.get('KOR_SAMPLES', '96')))
        for v in views:
            tv = time.time()
            if v.startswith('film:'): ns['film'](v[5:], os.path.join(B, 'wue-film-' + v[5:] + '.mp4'))
            else: ns['view'](v, os.path.join(B, 'wue-' + v + '.jpg'))
            note('%s in %.0f s' % (v, time.time() - tv))
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
