# Export des Fab-Pakets „MW Landscape Auto Material“ aus Unreal für das Browser-Spiel (Gelände, ?gelaende=neu)
#
# So geht's:
#  1. Den Ordner  Downloads\Landscape Material _ MW Landscape Auto Material-6602874e\Content\MWLandscapeAutoMaterial
#     in den Content-Ordner eines Unreal-Projekts kopieren (z. B. GameAnimationSample\Content\MWLandscapeAutoMaterial).
#  2. Das Projekt im Unreal Editor öffnen (Plugin „Python Editor Script Plugin“ muss an sein, ist es bei den Beispielprojekten).
#  3. Menü Tools > Execute Python Script… und diese Datei wählen.
#  4. Danach liegt alles in  <Projekt>\WebExport\mw\  (textures\*.png, meshes\*.fbx, meshes\*.glb falls der glTF-Exporter an ist).
#  5. Im Spiel-Repo:  node scripts/mw-import.mjs "<Projekt>\WebExport\mw"  und dann  npm run assets
#
# Nur Lesen und Exportieren, im Projekt wird nichts verändert.
import os
import unreal

ROOT = '/Game/MWLandscapeAutoMaterial'
OUT = os.path.join(unreal.Paths.project_dir(), 'WebExport', 'mw')
TEX_DIRS = ['Textures/Ground', 'Textures/Cover', 'Textures/Extra', 'Textures/Plants']
MESH_DIRS = ['Meshes/Cover', 'Meshes/Plants', 'Meshes/Background']

def export(obj, filename, exporter=None):
    task = unreal.AssetExportTask()
    task.object = obj
    task.filename = filename
    task.automated = True
    task.prompt = False
    task.replace_identical = True
    if exporter is not None:
        task.exporter = exporter
    ok = unreal.Exporter.run_asset_export_task(task)
    unreal.log(('OK  ' if ok else 'FEHLER ') + filename)
    return ok

def assets(path):
    reg = unreal.AssetRegistryHelpers.get_asset_registry()
    return [a for a in reg.get_assets_by_path(ROOT + '/' + path, recursive=True)]

def main():
    os.makedirs(os.path.join(OUT, 'textures'), exist_ok=True)
    os.makedirs(os.path.join(OUT, 'meshes'), exist_ok=True)
    n_tex = n_mesh = 0
    for d in TEX_DIRS:
        for a in assets(d):
            obj = a.get_asset()
            if isinstance(obj, unreal.Texture2D):
                # PNG in voller Auflösung aus den Quelldaten (verlustfrei); das Spiel verkleinert beim Packen
                # Pflanzen-Texturen heißen wie die Böden (TEX_MWAM_Grass_col): eigener Vorsatz, sonst überschreiben sie sich
                name = ('Plants_' if d.endswith('Plants') else '') + str(a.asset_name)
                if export(obj, os.path.join(OUT, 'textures', name + '.png'), unreal.TextureExporterPNG()):
                    n_tex += 1
    gltf = getattr(unreal, 'GLTFExporter', None)
    for d in MESH_DIRS:
        for a in assets(d):
            obj = a.get_asset()
            if isinstance(obj, unreal.StaticMesh):
                name = str(a.asset_name)
                if export(obj, os.path.join(OUT, 'meshes', name + '.fbx'), unreal.StaticMeshExporterFBX()):
                    n_mesh += 1
                if gltf is not None:
                    try:
                        opts = unreal.GLTFExportOptions()
                        gltf.export_to_gltf(obj, os.path.join(OUT, 'meshes', name + '.glb'), opts, set())
                    except Exception as e:
                        unreal.log_warning('GLB nicht möglich für %s: %s' % (name, e))
    unreal.log('MW-Export fertig: %d Texturen, %d Modelle in %s' % (n_tex, n_mesh, OUT))

main()
