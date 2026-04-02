import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    {
      name: 'dev-demo-shim',
      configureServer(server) {
        // In dev mode, maptour.js (the built IIFE) doesn't exist.
        // Serve a shim that loads the source via dynamic import and
        // dispatches 'maptour:ready' when done.
        server.middlewares.use('/demo/maptour.js', (_req, res) => {
          res.setHeader('Content-Type', 'application/javascript');
          // Synchronously expose window.MapTour so the inline init script
          // in demo/index.html can call it immediately. The actual module
          // loads asynchronously behind the scenes.
          res.end(`window.MapTour = { init: (...a) => import('/src/index.ts').then(m => m.init(...a)) };
`);
        });
      },
    },
  ],
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
