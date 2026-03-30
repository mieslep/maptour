# Changelog

All notable changes to MapTour are documented here.
This project follows [Semantic Versioning](https://semver.org/).

---

## [1.2.0] — 2026-03-30

**Tour experience enhancements.** Welcome/goodbye cards, flexible start point, journey cards, GPS nearest-stop pre-selection, i18n framework.

### Added
- **Welcome card**: in-sheet card with tour title, description, duration, optional rich content blocks, and stop picker. User can browse stops with arrows or tap map pins to choose a starting point
- **Goodbye card**: in-sheet card with visit stats, optional closing content, "Revisit tour" and "Close" actions. `tour.close_url` navigates away on close
- **Flexible start point**: tour is circular - starting at any stop, the user visits all stops wrapping around. Pin click on map selects start stop during welcome
- **Journey cards** (`getting_here.journey`): optional rich content blocks shown between stops as a transit card with "I've arrived" button
- **Pre-computed route waypoints** (`getting_here.route`): optional `[lat,lng][]` for polyline paths between stops, avoiding runtime routing API dependency
- **GPS nearest-stop pre-selection**: when GPS is available and accurate, pre-selects the nearest tour stop on the welcome picker. Configurable via `tour.gps.max_distance` (default 5km) and `tour.gps.max_accuracy` (default 500m)
- **i18n framework**: all UI labels overridable via `tour.strings` in YAML. Named placeholders (`{stop}`, `{n}`, `{total}`). Validation of string keys and placeholder names
- **Satnav pin button** on journey cards
- Constitution v1.2.0: cards-over-modals, circular tour model, flexible start point formalised as governing principles

### Changed
- `leg_to_next` renamed to `getting_here` (directions on destination stop, not origin)
- Welcome and goodbye are now cards in the bottom sheet, not modal overlays
- Arrow buttons are context-aware: 'picker' mode on welcome (cycle stops), 'nav' mode during tour
- `feedback_url` removed (feedback goes on `close_url` page)

### Removed
- `TourStartScreen.ts` and `TourCompleteScreen.ts` (replaced by welcome/goodbye cards)

---

## [1.1.0] — 2026-03-29

**Mobile-first tour experience.** Bottom sheet layout, journey state machine, start/complete screens, extended nav modes.

### Added
- **Journey state machine** (`JourneyStateManager`): four states (`tour_start`, `at_stop`, `in_transit`, `tour_complete`) with localStorage persistence and restore
- **Mobile bottom sheet** (`BottomSheet`): draggable sheet with collapsed/half/expanded positions, snap thresholds, velocity-based fling detection. Map fills screen behind the sheet
- **In-transit bar** (`InTransitBar`): minimal bar shown when sheet is collapsed during transit, with next stop name and "I'm here" button
- **Stop list overlay** (`StopListOverlay`): FAB-triggered overlay for mobile stop list access
- **Start screen**: tour title, stop count, optional duration, "Begin tour" CTA
- **Completion screen**: "Tour complete!", visited/total count, "Review tour"
- **Extended nav modes**: `walk | drive | transit | cycle`. Tour-level `nav_mode` default in YAML. Updated deep-links for all four modes. Nav app picker filtered by mode capability (Waze: drive only)
- `tour.duration` optional YAML field displayed on start screen
- Transit and cycle polyline styles (dotted, dash-dot)

### Changed
- Mobile layout: map is now base layer with bottom sheet overlay (was stacked vertical)
- Stop list: desktop shown inline, mobile hidden behind FAB overlay
- Header bar: inline prev/next arrows, collapsible stop list toggle, minimize button

---

## [1.0.0] — 2026-03-28

**Production release.** Full test suite, WCAG accessibility pass, and demo site.

### Added
- WCAG 2.1 AA accessibility: keyboard navigation throughout (Prev/Next, stop list, nav button), `role="application"` on map, `role="region"` on stop card, `aria-label` on all interactive elements, sufficient colour contrast in default theme
- Full unit test suite: loader validation (15 tests), NavController (9 tests), Breadcrumb (9 tests), NavAppPreference (8 tests) - 41 tests total
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
- **Responsive layout**: below 768 px - map top 50 vh, card scrolls below; above 768 px - map 55 % width sticky, card 45 % scrollable; no layout shift on resize
- CSS custom properties: `--maptour-primary`, `--maptour-surface`, `--maptour-text`, `--maptour-accent`, `--maptour-font`, `--maptour-radius`

---

## [0.1.0] — 2026-03-28

**Alpha release.** Core player: map, stop card, navigation. No GPS or deep-links.

### Added
- TypeScript + Vite project producing a single IIFE bundle (`maptour.js`) and one stylesheet (`maptour.css`)
- GitHub Actions CI workflow: install, lint, test, build, bundle size check
- GitHub Actions release workflow: on `v*` tag - build, attach `dist/` to GitHub Release, deploy `demo/` to GitHub Pages
- **YAML loader** (`loader.ts`): fetches tour YAML, parses with js-yaml, validates schema, returns typed `Tour` object or structured error
- **Map view** (`MapView.ts`): Leaflet map with OpenStreetMap tiles, numbered pins, route polylines (dashed for walk, solid for drive), active stop highlighted
- **Stop card** (`StopCard.ts`): renders active stop with all content block types (text/markdown, image, gallery, video/YouTube, audio)
- **Navigation** (`NavController`): Prev/Next buttons, stop list panel with direct jump
- **Demo tour**: Enniscorthy Tidy Towns 2025 - 6 stops

---

[1.2.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.2.0
[1.1.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.1.0
[1.0.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.0.0
[0.2.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v0.2.0
[0.1.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v0.1.0
