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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Per-file risk-tiered thresholds. Policy: speckit.constitution §VII.
      // Tier B is the global default (DOM-touching UI components).
      // Tier A files (pure logic, parsers, orchestrators) override per glob.
      // Tier C (jsdom-hostile) is currently empty; entries land alongside
      // a paired Playwright spec and a coverage:check enforcement script.
      thresholds: {
        perFile: true,
        // Tier B baseline
        lines: 70,
        statements: 70,
        functions: 70,
        branches: 60,

        // Tier A overrides (Functions ≥85, Lines/Statements ≥80, Branches ≥70)
        'src/i18n.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/loader.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/schema.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/breadcrumb/Breadcrumb.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/gps/GpsTracker.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/gps/nearestStop.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/gps/proximityDetector.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/journey/JourneyStateManager.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/map/chevrons.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/map/layers.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/navigation/NavAppPreference.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/navigation/NavController.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/orchestrator/journeyHandler.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/session/TourSession.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/util/markedExtensions.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/util/sanitiseHtml.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
        'src/waypoint/WaypointTracker.ts': { lines: 80, statements: 80, functions: 85, branches: 70 },
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        'authoring/**',
        'demo/**',
        'native/**',
        'scripts/**',
        '*.config.*',
        'src/index.ts',          // entry point — exempt per constitution §VII
        'src/types.ts',          // type-only file
        'src/layout/types.ts',   // type-only file
      ],
    },
  },
});
