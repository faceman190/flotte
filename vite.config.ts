import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Ein einziges HTML mit eingebettetem Code (Artifact-tauglich); Spieldaten liegen als Dateien in public/assets.
// Ziel es2022: der Start wartet mit „await“ auf das Grundpaket (src/core/boot.ts).
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2022', chunkSizeWarningLimit: 4000, assetsDir: '_app' },   // assets/ gehört den Spieldaten
});
