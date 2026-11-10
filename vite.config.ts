import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Ein einziges HTML mit eingebettetem Code (Artifact-tauglich); Texturen liegen in public/textures.js
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2020', chunkSizeWarningLimit: 4000 },
});
