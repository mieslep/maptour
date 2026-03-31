/**
 * Assemble the complete GitHub Pages site into dist/
 *
 * Run after `npm run build` and `npm run build:authoring`.
 * Or just use `npm run build:site` which does all three.
 *
 * Output:
 *   dist/
 *   ├── index.html              ← demo tour player
 *   ├── tour.yaml               ← demo tour data
 *   ├── images/                  ← demo tour images
 *   ├── maptour.js + .css       ← player bundle
 *   ├── route-editor.html        ← standalone route editor
 *   ├── editor-data.json         ← route editor data
 *   └── authoring/
 *       └── index.html + assets/ ← authoring app
 */

import { cpSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const dist = resolve(root, 'dist');

function copy(src, destRelative) {
  const srcPath = resolve(root, src);
  const destPath = resolve(dist, destRelative);
  if (!existsSync(srcPath)) {
    console.warn(`  SKIP ${src} (not found)`);
    return;
  }
  const destDir = dirname(destPath);
  if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
  cpSync(srcPath, destPath, { recursive: true });
  console.log(`  ${src} → dist/${destRelative}`);
}

console.log('Assembling site into dist/...\n');

// Player bundle (already in dist/ from `npm run build`)
console.log('Player bundle: ✓ (already built)');

// Demo files
copy('demo/index.html', 'index.html');
copy('demo/tour.yaml', 'tour.yaml');
copy('demo/images', 'images');
copy('demo/route-editor.html', 'route-editor.html');
copy('demo/editor-data.json', 'editor-data.json');

// Authoring app (already in dist/authoring/ from `npm run build:authoring`)
if (existsSync(resolve(dist, 'authoring/index.html'))) {
  console.log('Authoring app: ✓ (already built)');
} else {
  console.warn('Authoring app: ✗ (run npm run build:authoring first)');
}

console.log('\nDone. Serve dist/ to test:');
console.log('  npx serve dist');
