# Rundhalle ohne Fenster bauen und rendern:  blender.exe -b --python rh_lauf.py -- [ansicht ... | alle] [--pct=50] [--samples=96]
# Baut BastionRundhalle.blend neu (bk_kit, bk_mehr, bk_med, rh_kit, rh_deck), speichert und rendert nach rh-<ansicht>.jpg. Fortschritt in rh.txt.
import bpy, os, sys, json, time, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = dict(x[2:].split('=') for x in a if x.startswith('--')); a = [x for x in a if not x.startswith('--')]
mark = os.path.join(B, 'rh.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'BastionRundhalle.blend'))
    ns = {'__name__': '__main__'}
    for f in ('bk_kit.py', 'bk_mehr.py', 'bk_med.py', 'rh_kit.py', 'rh_deck.py'):
        p = os.path.join(B, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    note('gebaut %s in %.0f s' % (json.dumps(ns['result'], ensure_ascii=False), time.time() - t0))
    if 'tris' in opt or a == ['alle']: note('Dreiecke %s' % json.dumps(ns['tris']()))
    views = list(ns['VIEWS']) if a == ['alle'] else a
    if views:
        ns['cycles'](int(opt.get('samples', '128')))
        for v in views:
            tv = time.time(); ns['view'](v, os.path.join(B, 'rh-' + v + '.jpg'), int(opt.get('pct', '100')))
            note('%s in %.0f s' % (v, time.time() - tv))
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
