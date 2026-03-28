# Changelog

All notable changes to MapTour are documented here.
This project follows [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2026-03-28

**Production release.** Full test suite, WCAG accessibility pass, and demo site.

### Added
- WCAG 2.1 AA accessibility: keyboard navigation throughout (Prev/Next, stop list, nav button), `role="application"` on map, `role="region"` on stop card, `aria-label` on all interactive elements, sufficient colour contrast in default theme
- Full unit test suite: loader validation (15 tests), NavController (9 tests), Breadcrumb (9 tests), NavAppPreference (8 tests) — 41 tests total
- Playwright E2E tests: 14 tests covering tour load, 6-stop render, full Prev/Next navigation, stop list jump, "Take me there" button, and responsive layout at mobile/desktop viewports
- Integration guide (README.md): script tag embed, CSS variable reference table, full YAML format reference, media hosting notes, known limitations
- CHANGELOG.md

### Changed
- CSS pin rotation corrected; active stop pin scales up
- Stop card leg-note display shows travel mode icon
- NavController marks current stop as visited when calling `next()`

---

## [0.2.0] — 2026-03-28

**Beta release.** Full visitor experience: GPS, navigation deep-links, breadcrumbs, responsive layout.

### Added
- **GPS tracker** (`GpsTracker`): wraps Geolocation API, emits position events; map shows pulsing CSS dot at current position; gracefully absent if API unavailable or permission denied
- **Navigation deep-links** (`NavButton` + `NavAppPreference`): "Take me there" button on every stop card; first tap shows app picker (Google Maps, Apple Maps, Waze); choice persisted in localStorage; subsequent taps deep-link directly with correct coordinates and travel mode
- **Breadcrumb** (`Breadcrumb`): marks stops as visited when navigating away; persists visited set in localStorage keyed by tour ID; visited pins shown in greyed colour on map and stop list; degrades silently without localStorage
- **Responsive layout**: below 768 px — map top 50 vh, card scrolls below; above 768 px — map 55 % width sticky, card 45 % scrollable; no layout shift on resize
- CSS custom properties: `--maptour-primary`, `--maptour-surface`, `--maptour-text`, `--maptour-accent`, `--maptour-font`, `--maptour-radius` — all with documented defaults; all colours and spacing in the default theme use these vars

---

## [0.1.0] — 2026-03-28

**Alpha release.** Core player: map, stop card, navigation. No GPS or deep-links.

### Added
- TypeScript + Vite project producing a single IIFE bundle (`maptour.js`) and one stylesheet (`maptour.css`); bundle 238 KB uncompressed / 71 KB gzipped
- GitHub Actions CI workflow: install, lint, test, build, bundle size check (600 KB uncompressed limit)
- GitHub Actions release workflow: on `v*` tag — build, attach `dist/` files to GitHub Release, deploy `demo/` to GitHub Pages
- **YAML loader** (`loader.ts`): fetches tour YAML, parses with js-yaml, validates schema, returns typed `Tour` object or structured error message naming the offending field
- **Error display** (`ErrorDisplay.ts`): renders human-readable error into the container div when tour loading or validation fails
- **Map view** (`MapView.ts`): Leaflet map with OpenStreetMap tiles, numbered div-icon pins for all stops, route polylines between stops (dashed for walk, solid for drive), map fits bounds of all stops on load, active stop pin highlighted in accent colour
- **Stop card** (`StopCard.ts`): renders active stop with badge, title, leg note, and all content block types
- **Text block**: Markdown rendered via marked.js
- **Image block**: `<img>` with caption, error fallback placeholder
- **Gallery block**: horizontal CSS scroll-snap gallery with image counter
- **Video block**: YouTube iframe embed, lazy (thumbnail shown until visitor taps Play)
- **Audio block**: native `<audio>` element with label
- **Navigation** (`NavController`): Prev/Next buttons (disabled at boundaries), stop list panel with all stops and numbers, clicking a stop jumps directly; active stop highlighted in list
- **Demo tour**: Enniscorthy Tidy Towns 2025 — 6 stops around Enniscorthy, Co. Wexford, Ireland including castle grounds, River Slaney riverside, Abbey Square heritage planting, Templeshannon community garden, Vinegar Hill tree planting, and railway station gateway project; mix of walk and drive legs
- `demo/index.html`: full-page demo embedding MapTour

---

[1.0.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.0.0
[0.2.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v0.2.0
[0.1.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v0.1.0
