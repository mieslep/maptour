import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'MapTour',
      formats: ['iife'],
      fileName: () => 'maptour.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'maptour.css';
          return assetInfo.name || 'asset';
        },
        exports: 'named',
      },
    },
    cssCodeSplit: false,
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
  },
});
