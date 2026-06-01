import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Coil/',
  build: {
    target: 'es2020',
    // No production source map — it shipped a ~460 KB .map next to the bundle and
    // exposes full source on the CrazyGames CDN for no runtime benefit.
    sourcemap: false,
    // Never inline the sampled SFX: a short clip (e.g. catch.mp3 < 4 KB) would
    // otherwise be base64-embedded in the main JS, bloating first paint and
    // defeating the after-first-gesture lazy load. Keep them as real emitted
    // assets so all 8 fetch lazily and uniformly. Other small assets keep the
    // default inlining.
    assetsInlineLimit: (file) => (/[\\/]assets[\\/]sfx[\\/]/.test(file) ? false : undefined),
  },
  server: {
    host: true,
    port: 5173,
  },
});
