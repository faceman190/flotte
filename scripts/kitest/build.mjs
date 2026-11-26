// Bündelt src/game/ki/pluenderer.ts für Node; alle Spielmodule außer three und ki/ kommen aus stub.mjs.
import { build } from 'esbuild';
import path from 'path';
const stub = path.resolve('scripts/kitest/stub.mjs');
await build({
  entryPoints: ['scripts/kitest/entry.ts'], bundle: true, format: 'esm', platform: 'node', outfile: 'scripts/kitest/.out.mjs', logLevel: 'warning',
  plugins: [{ name: 'stub', setup(b) {
    b.onResolve({ filter: /^\.\.?\// }, a => {
      const full = path.resolve(a.resolveDir, a.path);
      if (full.endsWith(path.join('core', 'util')) || full.includes(path.join('src', 'game', 'ki')) || full.includes(path.join('scripts', 'kitest'))) return null;
      return { path: stub };
    });
  } }],
});
