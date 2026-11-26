// Wegfindung (recast-navigation-js) als eigene Datei fürs Paket „lazy“: ein ES-Modul mit init, NavMeshQuery und generateSoloNavMesh
// (WebAssembly eingebettet). Das Spiel lädt es erst, wenn Gegner mit Navmesh gebraucht werden (src/game/ki/navi.ts).
import { build } from 'esbuild';

export async function packRecast() {
  const r = await build({
    stdin: {
      contents: "export { init, NavMeshQuery } from 'recast-navigation';\nexport { generateSoloNavMesh } from 'recast-navigation/generators';\n",
      resolveDir: process.cwd(), sourcefile: 'recast-entry.mjs', loader: 'js',
    },
    bundle: true, format: 'esm', minify: true, write: false, target: 'es2020', platform: 'browser', legalComments: 'none',
  });
  return Buffer.from(r.outputFiles[0].contents);
}
