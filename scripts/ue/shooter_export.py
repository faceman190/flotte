# Export aus Epics ShooterGame-Beispiel (UE 4.27) für das Browser-Spiel: Kampf-Klänge und Granatwerfer (seit 27.11.2026)
#
# So geht's (ShooterGame selbst braucht UE 4.27 und C++; die Assets lassen sich aber in jedem UE5-Projekt öffnen):
#  1. Aus C:\EXTRA\UnrealProjects\ShooterGame\Content die Ordner Sounds, Weapons und Effects DIREKT nach <UE5-Projekt>\Content\ kopieren
#     (Originalpfade /Game/Weapons …: die Assets verweisen aufeinander, in einem Unterordner fehlt dem Granatwerfer sein Skelett und
#     der Export stürzt ab). Erprobt am 27.11.2026 mit UE 5.8 und dem FirstPerson-Projekt.
#  2. Im Editor:  Tools > Execute Python Script…  diese Datei, oder ohne Fenster:
#       UnrealEditor-Cmd.exe "<Projekt>.uproject" -run=pythonscript -script="<Pfad>\shooter_export.py" -unattended -nosplash
#  3. Ergebnis in  <Projekt>\WebExport\shooter\  (sounds\*.wav, meshes\*.fbx/.glb, textures\*.png, liste.txt)
#
# Nur Lesen und Exportieren; im Projekt ändert sich nichts außer den kopierten Ordnern.
import os
import unreal

ROOT = '/Game'
OUT = os.path.join(unreal.Paths.project_dir(), 'WebExport', 'shooter')

# Klänge: alle SoundWaves unter diesen Ordnern
SOUND_DIRS = ['Sounds/Impacts', 'Sounds/Foley', 'Sounds/Pickups', 'Sounds/Projectiles', 'Sounds/Weapons', 'Sounds/Stingers']
# Modelle: Granatwerfer (Skelett-Mesh), Aufsammel-Modelle, Mündungskegel
MESHES = ['Weapons/Launcher', 'Weapons/Rifle', 'Effects/Meshes/Gameplay/Pickups/Ammo', 'Effects/Meshes/Gameplay/Pickups/Launcher',
          'Effects/Meshes/Gameplay/Pickups/SM_Health', 'Effects/Meshes/Weapon/SM_MuzzleCone']
# Bilder: Waffen-Texturen und Effekt-Flipbooks
TEX_DIRS = ['Weapons/Textures', 'Weapons/MaterialLayers', 'Effects/Textures/Weapon', 'Effects/Textures/fire', 'Effects/Textures/Smoke',
            'Effects/Textures/Spark', 'Effects/Textures']

log = []

def export(obj, filename, exporter=None):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    task = unreal.AssetExportTask()
    task.object = obj
    task.filename = filename
    task.automated = True
    task.prompt = False
    task.replace_identical = True
    if exporter is not None:
        task.exporter = exporter
    ok = unreal.Exporter.run_asset_export_task(task)
    log.append(('OK  ' if ok else 'FEHLER ') + filename)
    return ok

def assets(path, recursive=True):
    reg = unreal.AssetRegistryHelpers.get_asset_registry()
    reg.scan_paths_synchronous([ROOT], True)
    return list(reg.get_assets_by_path(ROOT + '/' + path, recursive=recursive))

def main():
    n = {'wav': 0, 'mesh': 0, 'png': 0}
    for d in SOUND_DIRS:
        for a in assets(d):
            obj = a.get_asset()
            if isinstance(obj, unreal.SoundWave):
                sub = d.split('/', 1)[1].replace('/', '_')
                if export(obj, os.path.join(OUT, 'sounds', sub, str(a.asset_name) + '.wav'), unreal.SoundExporterWAV()):
                    n['wav'] += 1
    for d in TEX_DIRS:
        for a in assets(d, recursive=False):
            obj = a.get_asset()
            if isinstance(obj, unreal.Texture2D):
                if export(obj, os.path.join(OUT, 'textures', str(a.asset_name) + '.png'), unreal.TextureExporterPNG()):
                    n['png'] += 1
    gltf = getattr(unreal, 'GLTFExporter', None)
    for m in MESHES:
        obj = unreal.load_asset(ROOT + '/' + m)
        if obj is None:
            log.append('FEHLT ' + m); continue
        name = m.rsplit('/', 1)[1]
        exp = unreal.SkeletalMeshExporterFBX() if isinstance(obj, unreal.SkeletalMesh) else unreal.StaticMeshExporterFBX()
        try:
            if export(obj, os.path.join(OUT, 'meshes', name + '.fbx'), exp):
                n['mesh'] += 1
        except Exception as e:  # noqa: BLE001
            log.append('FEHLER fbx ' + name + ': ' + str(e))
        if gltf is not None:
            try:
                opts = unreal.GLTFExportOptions()
                gltf.export_to_gltf(obj, os.path.join(OUT, 'meshes', name + '.glb'), opts, set())
                log.append('OK  glb ' + name)
            except Exception as e:  # noqa: BLE001
                log.append('glb nicht möglich ' + name + ': ' + str(e))
    # Waffen-Sockets (Mündung) und Montage-Längen für die Einbindung
    for m in ['Weapons/Launcher', 'Weapons/Rifle']:
        obj = unreal.load_asset(ROOT + '/' + m)
        if isinstance(obj, unreal.SkeletalMesh):
            for i in range(obj.num_sockets()):
                s = obj.get_socket_by_index(i)
                log.append('SOCKET %s %s bone=%s loc=%s rot=%s' % (m, s.socket_name, s.bone_name, s.relative_location, s.relative_rotation))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'liste.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(log))
        f.write('\n\nSumme: %d WAV, %d Modelle, %d Bilder\n' % (n['wav'], n['mesh'], n['png']))
    unreal.log('ShooterGame-Export fertig: %s  (%d WAV, %d Modelle, %d Bilder)' % (OUT, n['wav'], n['mesh'], n['png']))

main()
