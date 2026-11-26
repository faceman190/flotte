# Glasflächen des Rumpfs in der Cockpitzone ausmessen (Bau-Koordinaten): blender -b --python cp_glas.py -- <schiff> <Länge> <Muster> x0,y0,z0,x1,y1,z1 [cx,cy]
import bpy, sys, os, re, math
B = os.path.dirname(os.path.abspath(__file__)); exec(open(os.path.join(B, 'cp_lib.py'), encoding='utf-8').read())
arg = sys.argv[sys.argv.index('--') + 1:]; z = [float(x) for x in arg[3].split(',')]; pat = re.compile(arg[2], re.I)
neu_szene(); coll, netze = rumpf_laden(os.path.join(B, '..', '..', 'glb', 'ship', arg[0] + '.glb'), float(arg[1])); P = {}; nf = 0; rand = {}
for o in netze:
    me = o.data; idx = [i for i, m in enumerate(me.materials) if m and pat.search(m.name)]
    for p in me.polygons:
        if p.material_index not in idx: continue
        c = p.center
        if not (z[0] <= c.x <= z[3] and z[1] <= c.y <= z[4] and z[2] <= c.z <= z[5]): continue
        nf += 1; ks = []
        for vi in p.vertices:
            v = me.vertices[vi].co; k = (round(v.x, 2), round(v.y, 2), round(v.z, 2)); P[k] = P.get(k, 0) + 1; ks.append(k)
        for a, b in zip(ks, ks[1:] + ks[:1]):
            e = (a, b) if a < b else (b, a); rand[e] = rand.get(e, 0) + 1
print('GLAS Flächen', nf, 'Punkte', len(P), 'Randkanten', sum(1 for e, n in rand.items() if n == 1))
if len(P) <= 90:
    for k in sorted(P, key=lambda k: (k[1], k[0])): print('PKT %6.2f %6.2f %6.2f' % k)
if len(arg) > 4:
    cx, cy = [float(x) for x in arg[4].split(',')]; bins = {}
    for k in P:
        a = int(((math.degrees(math.atan2(k[0] - cx, k[1] - cy)) + 360) % 360) // 10)
        if a not in bins or k[2] < bins[a][2]: bins[a] = k
    for a in sorted(bins): print('RICHTUNG %3d°  x %5.2f y %5.2f z %5.2f  r %.2f' % (a * 10 + 5, *bins[a], math.hypot(bins[a][0] - cx, bins[a][1] - cy)))
    ym = min(k[1] for k in P); bog = sorted(k for k in P if k[1] < ym + 0.06)
    print('BOGEN hinten y %.2f:' % ym, ' '.join('(%.2f,%.2f)' % (k[0], k[2]) for k in bog[::max(1, len(bog) // 16)]))
    top = max(P, key=lambda k: k[2]); print('SCHEITEL', top)
    for yy in (5.6, 6.0, 6.4, 6.8, 7.2, 7.6):
        row = [k for k in P if abs(k[1] - yy) < 0.08]
        if row: print('SCHNITT y %.1f: Breite ±%.2f, z %.2f … %.2f' % (yy, max(abs(k[0]) for k in row), min(k[2] for k in row), max(k[2] for k in row)))
