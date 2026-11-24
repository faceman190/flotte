# Quartier bauen, rendern, fürs Spiel ausgeben (Blender im Hintergrund):
#   blender.exe -b --python qu_lauf.py -- [ansicht ... | alle] [--pct=50] [--samples=96]      Ansichten nach qu-<ansicht>.jpg
#   blender.exe -b --python qu_lauf.py -- backen                                              Spieldaten (qu_spiel.py) und Lichtraum 2
# Baut BastionQuartier.blend neu (bk_kit, bk_mehr, bk_med, rh_kit, qu_bau). Fortschritt in qu.txt, das Backen in lm2-quartier.txt.
# Ergebnis des Backens: asset-src/data/deck_quartier.json, asset-src/glb/base/Lichtraum2Quartier.glb, asset-src/data/lichtraum2_quartier.json,
# asset-src/tex-world/l2_quartier_lit@2048.png. Die .blend wird nach dem Aufbau gespeichert, nach dem Backen nicht mehr.
import bpy, os, sys, json, time, traceback
B_ = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
opt = dict(x[2:].split('=') for x in a if x.startswith('--')); a = [x for x in a if not x.startswith('--')]
mark = os.path.join(B_, 'qu.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B_, 'BastionQuartier.blend'))
    ns = {'__name__': '__main__'}
    files = ['bk_kit.py', 'bk_mehr.py', 'bk_med.py', 'rh_kit.py', 'qu_bau.py'] + (['qu_spiel.py'] if 'backen' in a else [])
    for f in files:
        p = os.path.join(B_, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    note('gebaut %s in %.0f s' % (json.dumps(ns['result'], ensure_ascii=False), time.time() - t0))
    if 'backen' in a:
        note('Spieldaten %s' % json.dumps(ns['spiel'], ensure_ascii=False))
        bpy.app.timers.register = lambda fn, first_interval=0, persistent=False: fn()
        o2 = json.load(open(os.path.join(B_, 'lm2_quartier.json'), encoding='utf-8'))
        p = os.path.join(B_, 'lm2_raum.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), {'__name__': '__main__', 'OPT': o2})
        note('gebacken, siehe lm2-quartier.txt (%.0f s)' % (time.time() - t0))
    else:
        if 'tris' in opt or a == ['alle']: note('Dreiecke %s' % json.dumps(ns['tris']()))
        views = list(ns['VIEWS']) if a == ['alle'] else a
        if views:
            ns['cycles'](int(opt.get('samples', '128')))
            for v in views:
                tv = time.time(); ns['view'](v, os.path.join(B_, 'qu-' + v + '.jpg'), int(opt.get('pct', '100')))
                note('%s in %.0f s' % (v, time.time() - tv))
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
