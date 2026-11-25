# Normkisten bauen (eine je Lauf):  FR_NAME=FrachtKiste blender.exe -b --python fr_lauf.py   → <Name>.blend, danach rv_export.py darauf
import bpy, os, json, traceback
B = os.path.dirname(os.path.abspath(__file__)); NAME = os.environ.get('FR_NAME', 'FrachtKiste')
mark = os.path.join(B, 'fr.txt')
try:
    bpy.ops.wm.read_homefile(use_empty=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, NAME + '.blend'))
    ns = {'__name__': '__main__'}
    p = os.path.join(B, 'fr_bau.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    open(mark, 'a', encoding='utf-8').write('gebaut ' + json.dumps(ns['result']) + '\n')
except Exception:
    open(mark, 'a', encoding='utf-8').write('FEHLER ' + NAME + ' ' + traceback.format_exc()[-2000:] + '\n')
