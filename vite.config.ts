import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Coil/',
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
  },
});
