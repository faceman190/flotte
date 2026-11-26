# Materialien des Rumpfs in einer Zone (Bau-Koordinaten): blender -b --python cp_zone.py -- <schiff> <Länge> x0,y0,z0,x1,y1,z1
import bpy, sys, os
B = os.path.dirname(os.path.abspath(__file__)); exec(open(os.path.join(B, 'cp_lib.py'), encoding='utf-8').read())
arg = sys.argv[sys.argv.index('--') + 1:]; z = [float(x) for x in arg[2].split(',')]
neu_szene(); coll, netze = rumpf_laden(os.path.join(B, '..', '..', 'glb', 'ship', arg[0] + '.glb'), float(arg[1])); res = {}
for o in netze:
    me = o.data
    for p in me.polygons:
        c = p.center
        if z[0] <= c.x <= z[3] and z[1] <= c.y <= z[4] and z[2] <= c.z <= z[5]:
            n = me.materials[p.material_index].name; r = res.setdefault(n, [0, [1e9] * 3, [-1e9] * 3]); r[0] += 1
            for k in range(3): r[1][k] = min(r[1][k], c[k]); r[2][k] = max(r[2][k], c[k])
for n in sorted(res, key=lambda k: -res[k][0]): print('ZONE %-36s %6d  X %5.2f %5.2f  Y %6.2f %6.2f  Z %5.2f %5.2f' % (n[:36], res[n][0], res[n][1][0], res[n][2][0], res[n][1][1], res[n][2][1], res[n][1][2], res[n][2][2]))
