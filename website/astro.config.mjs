// Website von Letzte Crew (letztecrew.de), statisch gebaut. Spieldaten (Schiffe, Sektoren) kommen direkt aus ../src/data.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://letztecrew.de',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  vite: {
    // Dev-Server darf ../src/data lesen; /api (Meldeformular) geht lokal an den Spielserver (npm run server im Hauptordner, Port 2567)
    server: { fs: { allow: ['..'] }, proxy: { '/api': 'http://127.0.0.1:2567' } },
    preview: { proxy: { '/api': 'http://127.0.0.1:2567' } },
  },
});
