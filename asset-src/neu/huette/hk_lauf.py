# Hütten-Baukasten ohne Fenster bauen und rendern:
#   blender.exe -b --python hk_lauf.py -- [Ansicht ...]      (ohne Ansicht nur bauen und zählen; „alle“ rendert alles)
# Baut HuetteKit.blend neu (hk_kit.py, dann hk_plan.py im selben Namensraum), speichert die Datei und rendert die genannten Ansichten
# nach huette-<ansicht>.jpg. Fortschritt und Ergebnis in hk-lauf.txt.
import bpy, os, sys, json, time, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
mark = os.path.join(B, 'hk-lauf.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, 'HuetteKit.blend'))
    ns = {'__name__': '__main__'}
    for f in ('hk_kit.py', 'hk_plan.py'):
        p = os.path.join(B, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    note('gebaut %s in %.0f s' % (json.dumps(ns['result'], ensure_ascii=False), time.time() - t0))
    note('Dreiecke %s' % json.dumps(ns['tris']()))
    views = list(ns['CAMS']) if a == ['alle'] else a
    if views:
        ns['cycles'](int(os.environ.get('HK_SAMPLES', '96')))
        for v in views:
            tv = time.time(); fn = 'huette-' + v.split(' ')[0].lower() + '-' + '-'.join(v.split(' ')[1:]).lower().replace('ö', 'oe').replace('ü', 'ue') + '.jpg'
            ns['view'](v, os.path.join(B, fn.replace('--', '-').rstrip('-')))
            note('%s in %.0f s' % (v, time.time() - tv))
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
