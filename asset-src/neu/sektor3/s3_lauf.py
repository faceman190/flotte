# Bauten der Phase 3 ohne Fenster bauen und rendern:  blender.exe -b --python s3_lauf.py -- <Torwache|Fernohr|Pumpwerk> [ansicht ... | alle]
# Baut <Modell>.blend neu (s3_bau.py), speichert und rendert die Ansichten nach <modell>-<ansicht>.jpg. Fortschritt in <modell>.txt.
import bpy, os, sys, json, time, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
MOD = a[0] if a else 'Torwache'; a = a[1:]
mark = os.path.join(B, MOD.lower() + '.txt'); LOG = []
def note(s): LOG.append(s); open(mark, 'w', encoding='utf-8').write('\n'.join(LOG))
t0 = time.time()
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, MOD + '.blend'))
    ns = {'__name__': '__main__', 'MODELL': MOD}
    p = os.path.join(B, 's3_bau.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    note('gebaut %s in %.0f s' % (json.dumps(ns['result'], ensure_ascii=False), time.time() - t0))
    note('Maße %s' % json.dumps(ns['extents'](), ensure_ascii=False))
    views = list(ns['VIEWS']) if a == ['alle'] else a
    if views:
        ns['cycles'](int(os.environ.get('KOR_SAMPLES', '64')))
        for v in views:
            tv = time.time()
            ns['view'](v, os.path.join(B, MOD.lower() + '-' + v + '.jpg'))
            note('%s in %.0f s' % (v, time.time() - tv))
    note('FERTIG nach %.0f s' % (time.time() - t0))
except Exception:
    note('FEHLER ' + traceback.format_exc()[-3000:])
