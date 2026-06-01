import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Coil/',
  build: {
    target: 'es2020',
    // No production source map — it shipped a ~460 KB .map next to the bundle and
    // exposes full source on the CrazyGames CDN for no runtime benefit.
    sourcemap: false,
  },
  server: {
    host: true,
    port: 5173,
  },
});
