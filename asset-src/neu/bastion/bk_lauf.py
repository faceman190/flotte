# Deck ohne Fenster bauen und ausgeben (Blender im Hintergrund), wenn Blender nicht offen ist:
#   blender.exe -b --python bk_lauf.py -- <deck.py> <datei.blend> [meta glb json marke]
# Beispiel Bastion:    … -- bk_deck_d.py BastionDeckD.blend
# Beispiel Eisenkrone: … -- bk_deck_ek.py EisenkroneDeck.blend deck_ek_meta.json EisenkroneDeck.glb deck_eisenkrone.json export-ek-deck.txt
# Im Hintergrund laufen die Zeitgeber von Blender nicht: bk_export.py startet sich sonst über einen Zeitgeber, hier wird er sofort ausgeführt.
import bpy, os, sys, traceback
B = os.path.dirname(os.path.abspath(__file__))
a = sys.argv[sys.argv.index('--') + 1:]
deck, blend = a[0], a[1]
bpy.ops.wm.read_homefile(use_empty=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(B, blend))
mark = os.path.join(B, 'bau-' + os.path.splitext(blend)[0] + '.txt')
try:
    ns = {'__name__': '__main__'}
    for f in ('bk_kit.py', 'bk_mehr.py', 'bk_med.py', deck):
        p = os.path.join(B, f); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns)
    bpy.ops.wm.save_mainfile()
    open(mark, 'w', encoding='utf-8').write('ok ' + str(ns.get('result')))
    bpy.app.timers.register = lambda fn, first_interval=0, persistent=False: fn()
    ns2 = {'__name__': '__main__'}
    if len(a) >= 6: ns2['OPT'] = {'meta': a[2], 'glb': a[3], 'json': a[4], 'mark': a[5]}
    p = os.path.join(B, 'bk_export.py'); exec(compile(open(p, encoding='utf-8').read(), p, 'exec'), ns2)
except Exception:
    open(mark, 'w', encoding='utf-8').write('FEHLER ' + traceback.format_exc()[-2500:])
