# Export aus dem Fab-Paket "Niagara Examples Pack" für das Browser-Spiel (27.11.2026)
#
#  1. Ordner  Downloads\Niagara Examples Pack-0e188eca\Content\NiagaraExamples  nach  <UE5-Projekt>\Content\NiagaraExamples  kopieren
#     (Pfad /Game/NiagaraExamples muss stimmen, die Assets verweisen darauf).
#  2. UnrealEditor.exe "<Projekt>.uproject" -ExecutePythonScript="<Pfad>\niagara_export.py"   (mit Fenster; headless ging beim ShooterGame-Export schief)
#     Unreal wählt den Exporter selbst: TextureExporterPNG fest vorzugeben bricht bei diesen Texturen ab (Assertion SupportsTexture),
#     die Flipbooks (16-Bit-Gleitkomma) gehen nur als EXR. Die wandelt scripts/niagara-exr.py in PNG um.
#  3. Ergebnis flach in  C:\Users\seeli\Downloads\NiagaraExport\  (textures\*.png, meshes\*.fbx/.glb, liste.txt, materialien.txt)
#
# Nur Lesen und Exportieren.
import os
import unreal

ROOT = '/Game/NiagaraExamples'
OUT = r'C:\Users\seeli\Downloads\NiagaraExport'

TEX_DIRS = ['Textures/Sprites', 'Textures/Decals', 'Textures/Flares', 'Textures/Utils', 'Textures/ColorCurves',
            'FX_Weapons/MuzzleFlashes/Textures', 'FX_Weapons/MuzzleFlashes/Meshes', 'FX_Footstep/Textures',
            'StaticMesh/Broken_Concrete_Slab_tmclbcpiw', 'StaticMesh/Broken_Concrete_Slab_tmjgderjw',
            'StaticMesh/Concrete_Rubble_uc1iccejw', 'StaticMesh/Concrete_Rubble_uc1jagbjw', 'StaticMesh/Concrete_Rubble_uc1jagnjw',
            'StaticMesh/Pine_Bark_Piece_wjtsdevs', 'StaticMesh/Pine_Bark_Piece_wjtuebms', 'StaticMesh/Rock_shopk',
            'StaticMesh/Tree_Debris_wjtuagls', 'StaticMesh/Wood_Debris_vb2mfeliw']
MESHES = ['StaticMesh/S_Broken_Concrete_Slab_tmclbcpiw', 'StaticMesh/S_Broken_Concrete_Slab_tmjgderjw',
          'StaticMesh/S_Concrete_Rubble_uc1iccejw', 'StaticMesh/S_Concrete_Rubble_uc1jagbjw', 'StaticMesh/S_Concrete_Rubble_uc1jagnjw',
          'StaticMesh/S_Pine_Bark_Piece_wjtsdevs', 'StaticMesh/S_Pine_Bark_Piece_wjtuebms', 'StaticMesh/S_Rock_shopk',
          'StaticMesh/S_Tree_Debris_wjtuagls', 'StaticMesh/S_Wood_Debris_vb2mfeliw',
          'StaticMesh/SM_GlassShard_01', 'StaticMesh/SM_GlassShard_02', 'StaticMesh/SM_GlassShard_03',
          'FX_Weapons/MuzzleFlashes/Meshes/SM_BulletShell']

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


reg = unreal.AssetRegistryHelpers.get_asset_registry()
reg.scan_paths_synchronous([ROOT], True)


def assets(path, recursive=False):
    return list(reg.get_assets_by_path(ROOT + '/' + path, recursive=recursive))


def main():
    n = {'png': 0, 'mesh': 0}
    for d in TEX_DIRS:
        for a in assets(d):
            obj = a.get_asset()
            if isinstance(obj, unreal.Texture2D):
                base = os.path.join(OUT, 'textures', str(a.asset_name))
                if any(export(obj, base + ext) for ext in ('.png', '.tga', '.exr')):
                    n['png'] += 1
                try:
                    log.append('  GROESSE %s %dx%d' % (a.asset_name, obj.blueprint_get_size_x(), obj.blueprint_get_size_y()))
                except Exception:  # noqa: BLE001
                    pass
    gltf = getattr(unreal, 'GLTFExporter', None)
    for m in MESHES:
        obj = unreal.load_asset(ROOT + '/' + m)
        if obj is None:
            log.append('FEHLT ' + m)
            continue
        name = m.rsplit('/', 1)[1]
        if export(obj, os.path.join(OUT, 'meshes', name + '.fbx'), unreal.StaticMeshExporterFBX()):
            n['mesh'] += 1
        if gltf is not None:
            try:
                gltf.export_to_gltf(obj, os.path.join(OUT, 'meshes', name + '.glb'), unreal.GLTFExportOptions(), set())
                log.append('OK  glb ' + name)
            except Exception as e:  # noqa: BLE001
                log.append('glb nicht möglich ' + name + ': ' + str(e))
    # Materialparameter (Flipbook-Raster, Farben, Helligkeit) als Vorlage für die eigenen Shader
    mat = []
    for a in assets('Materials', True) + assets('FX_PickUp') + assets('FX_Weapons', True) + assets('FX_Footstep', True):
        obj = a.get_asset()
        if not isinstance(obj, unreal.MaterialInstanceConstant):
            continue
        mat.append('== %s  (Eltern: %s)' % (a.asset_name, obj.parent.get_name() if obj.parent else '-'))
        for p in obj.scalar_parameter_values:
            mat.append('  S %s = %s' % (p.parameter_info.name, p.parameter_value))
        for p in obj.vector_parameter_values:
            c = p.parameter_value
            mat.append('  V %s = (%.3f, %.3f, %.3f, %.3f)' % (p.parameter_info.name, c.r, c.g, c.b, c.a))
        for p in obj.texture_parameter_values:
            mat.append('  T %s = %s' % (p.parameter_info.name, p.parameter_value.get_name() if p.parameter_value else '-'))
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'materialien.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(mat))
    with open(os.path.join(OUT, 'liste.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(log))
        f.write('\n\nSumme: %d Bilder, %d Modelle\n' % (n['png'], n['mesh']))
    unreal.log('Niagara-Export fertig: %s (%d Bilder, %d Modelle)' % (OUT, n['png'], n['mesh']))


main()
