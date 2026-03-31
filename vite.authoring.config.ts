import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ command }) => ({
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
  // In dev mode, serve demo/ as public so relative asset paths work in previews.
  // In build mode, don't copy demo assets into the authoring subfolder
  // (the build-site script handles that at the top level).
  publicDir: command === 'serve' ? resolve(__dirname, 'demo') : false,
  server: {
    fs: {
      allow: [resolve(__dirname)],
    },
  },
}));
