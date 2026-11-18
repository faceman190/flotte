// Website von Letzte Crew (letztecrew.de), statisch gebaut. Spieldaten (Schiffe, Sektoren) kommen direkt aus ../src/data.
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://letztecrew.de',
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  vite: {
    server: { fs: { allow: ['..'] } },   // Dev-Server darf ../src/data lesen
  },
});
