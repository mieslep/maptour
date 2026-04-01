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
 *   ├── maptour.js + .css       ← player bundle (linkable by external sites)
 *   └── authoring/
 *       └── index.html + assets/ ← authoring app
 */

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

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

// Authoring app (already in dist/authoring/ from `npm run build:authoring`)
if (existsSync(resolve(dist, 'authoring/index.html'))) {
  console.log('Authoring app: ✓ (already built)');
} else {
  console.warn('Authoring app: ✗ (run npm run build:authoring first)');
}

// Generate SRI hashes for the player bundle
console.log('\nSRI hashes:');
const sriFiles = ['maptour.js', 'maptour.css'];
const sriHashes = {};

for (const file of sriFiles) {
  const filePath = resolve(dist, file);
  if (!existsSync(filePath)) {
    console.warn(`  SKIP ${file} (not found)`);
    continue;
  }
  const content = readFileSync(filePath);
  const hash = createHash('sha384').update(content).digest('base64');
  const sri = `sha384-${hash}`;
  sriHashes[file] = sri;
  console.log(`  ${file}: ${sri}`);
}

// Write sri.json for programmatic access
const sriPath = resolve(dist, 'sri.json');
writeFileSync(sriPath, JSON.stringify(sriHashes, null, 2) + '\n');
console.log(`  → dist/sri.json`);

// Write EMBED.md with copy-paste snippet
const version = process.env.npm_package_version || '0.0.0';
const embedMd = `# Embedding MapTour

## Script tag with SRI hash

\`\`\`html
<link rel="stylesheet" href="https://mieslep.github.io/maptour/maptour.css"
      integrity="${sriHashes['maptour.css'] || 'HASH'}" crossorigin="anonymous">

<div id="maptour" style="width:100%;height:100vh;"></div>

<script src="https://mieslep.github.io/maptour/maptour.js"
        integrity="${sriHashes['maptour.js'] || 'HASH'}" crossorigin="anonymous"></script>
<script>
  MapTour.init({
    container: '#maptour',
    tourUrl: './tour.yaml',
  });
</script>
\`\`\`

## Using a tagged release (recommended)

Pin to a specific version for stability:

\`\`\`html
<script src="https://github.com/mieslep/maptour/releases/download/v${version}/maptour.js"
        integrity="${sriHashes['maptour.js'] || 'HASH'}" crossorigin="anonymous"></script>
\`\`\`

## SRI Hashes (v${version})

| File | Integrity Hash |
|------|---------------|
| maptour.js | \`${sriHashes['maptour.js'] || 'N/A'}\` |
| maptour.css | \`${sriHashes['maptour.css'] || 'N/A'}\` |

These hashes are also available programmatically at \`/sri.json\`.
`;

writeFileSync(resolve(dist, 'EMBED.md'), embedMd);
console.log('  → dist/EMBED.md');

console.log('\nDone. Serve dist/ to test:');
console.log('  npx serve dist');
