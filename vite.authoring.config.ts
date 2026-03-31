import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: resolve(__dirname, 'authoring'),
  build: {
    outDir: resolve(__dirname, 'dist/authoring'),
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'authoring/src'),
    },
  },
  server: {
    // Serve demo folder at /demo/ so relative asset paths work in previews
    proxy: {},
    fs: {
      allow: [resolve(__dirname)],
    },
  },
  publicDir: resolve(__dirname, 'demo'),
});
