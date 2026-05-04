# Changelog

All notable changes to MapTour are documented here.
This project follows [Semantic Versioning](https://semver.org/).

---

## [1.5.1] — 2026-05-04

**Embedding polish.** Fix header layout when used with a logo, and add a back-to-host link.

### Added
- **`tour.header_url`**: when set, the menu-bar `header_html` is wrapped in an `<a target="_blank" rel="noopener noreferrer">` so visitors can reach the host site without losing tour state. URL must be `http(s)`.

### Changed
- Menu-bar header content is now left-aligned next to the hamburger (was right-aligned). Right padding reserves space for the floating map button so right-edge content no longer collides with it.
- README: short Embedding subsection covering `header_html` / `header_url` (new tab) / `close_url` (goodbye exit) and how they fit together. Full embedding guide is tracked as TOUR-055.

### Internal
- Backlog: TOUR-054 (`menu_items`), TOUR-055 (EMBEDDING.md), TOUR-056 (YAML + strings reference), TOUR-057 (`demo/index.html`).

---

## [1.5.0] — 2026-05-04

**Authoring polish + waypoint UX refinements.** Per-waypoint interactivity opt-in, live map preview in the journey-card editor, several player and authoring bug fixes, and a major internal test-coverage push.

### Added
- **Per-waypoint `map_interactive` flag**: opt-in (default `false`) to allow pan/zoom on the embedded journey-card map for a specific waypoint. Authoring tool exposes a checkbox in the waypoint modal
- **Live map preview in journey-card map block editor**: shows the segment with player-parity styling (passed/active/future markers, mode-based polyline). Capture framing via direct map gestures, with a Reset button to revert to defaults. Constrained to a 360px-wide mobile frame for accurate WYSIWYG
- Inline `{dot}` waypoint shortcode helptext on Basic Waypoint guidance text in authoring tool

### Changed
- Embedded journey-card map is locked by default: no zoom controls, no panning, no scroll-hijack on page (interactivity gated by `map_interactive`)
- Authoring tool `+ Add Block` picker no longer clipped by parent overflow
- `.cb-menu` z-index raised above modal stacking contexts
- §VII risk-tiered per-file coverage thresholds enforced in `vite.config.ts`; TESTING.md consolidated into the SpecKit constitution

### Fixed
- Waypoint marker no longer hidden behind the guidance banner (top padding now accounts for banner height)
- Active waypoint marker `M0 0` rendering bug: zoom animation disabled on journey-card embed mount so the SVG renderer's bounds are valid when circle markers are added

### Internal
- TOUR-046: Playwright in CI + smoke E2E rewrite
- TOUR-047: Unit tests for `journeyHandler.ts` (0% → Tier A)
- TOUR-048: Tier A unit tests for `loader.ts` and `GpsTracker.ts`
- TOUR-049: Tier B coverage for `NavButton`, `GuidanceBanner`, `buildMobileLayout`, `MapView`
- TOUR-050: Tier B coverage for block renderers and `GoodbyeCard`
- TOUR-051: Per-file tiered thresholds enforced in `vite.config.ts`

---

## [1.4.1] — 2026-04-06

**Release workflow + coverage fixes.**

### Fixed
- Release workflow: pin `softprops/action-gh-release@v2` (v3 doesn't exist)
- Coverage threshold realigned with actual codebase coverage; additional unit tests added to reach the 80% threshold for tested files

---

## [1.4.0] — 2026-04-06

**Waypoints & native app prep (TOUR-043).** Multi-waypoint transit with in-flight guidance banner, waypoint markers on the map, journey-card-driven authoring, and groundwork for native-app embedding.

### Added
- **Waypoint type/schema** with `WaypointTracker` for multi-waypoint legs between stops
- **Waypoint markers + `zoomToSegment`** on `MapView`; per-segment framing during transit
- **`GuidanceBanner` + `ArrivingBanner`** components: in-transit cues at top of viewport
- **Authoring waypoints**: type/schema + i18n, YAML round-trip, modal editor, map placement, drag and snap-to-polyline
- **Inline map content block** for journey cards
- **JourneyCardRenderer.renderWaypoint** wired into the browser flow
- Phase A and Phase B integration tests for waypoint transit and authoring
- Test coverage reporting (T0)

### Changed
- Stop title and "Getting Here" consolidated into a single editable card
- Unified waypoint UX: footer Continue button, journey-card rendering, authoring modal
- Guidance banner restyled below menu bar with theme-aware colours
- "I'm here" button moved from FAB to guidance banner
- Map FAB toggles between map and close icons; floating FAB replaces nav header

### Removed
- Legacy journey card editor in authoring tool (superseded by waypoint flow)
- `journey` field on stops (replaced by waypoints)

### Fixed
- First-waypoint journey card handling and map panel transitions
- Guidance banner visibility; photo modal added
- Waypoint transit layout on mobile (banner at top, map shown)
- Waypoint marker colour and journey-card text requirement

---

## [1.3.4] — 2026-04-05

### Fixed
- Scroll hint gradient positioned above tour footer
- Map panel fills full viewport height in overview mode

---

## [1.3.3] — 2026-04-05

### Changed
- Mobile UX: auto-hide menu bar, compact header, welcome description removed
- GitHub Actions bumped to v5 for Node.js 24 compatibility

---

## [1.3.2] — 2026-04-05

### Fixed
- "Getting Here" card back-button click handler

---

## [1.3.1] — 2026-04-05

### Added
- Basic "getting here" text rendering

### Changed
- GPS overhaul; "Getting Here" authoring; stop list colours; assorted UX fixes

### Fixed
- Field-test fixes: visited count, viewport, goodbye flow, GPS, stop list

---

## [1.3.0] — 2026-04-05

**Mobile-first card layout, tour overview, architecture refactor.** TOUR-038 through TOUR-042.

### Added
- **TOUR-038 — Mobile layout rework**: full-page cards with map toggle; scroll hint added
- **TOUR-039 — Menu bar, progress bar, system cards**: slim progress bar, system-card UX cleanup
- **TOUR-040 — Tour overview map**: chevrons, stop picker, direction toggle; sequential-pulse pin animation indicating tour direction; green start pin, red end pin
- **TOUR-041 — Stop list ordered by tour direction and starting stop**
- **TOUR-042 — Architecture refactor**: `TourSession`, card renderers, simplified `NavController`
- Scroll nudge added to tour
- Sticky `TourFooter` with finish modal and scroll gate (replaces `ProgressBar`)

### Changed
- Welcome card simplified: stop picker removed; "get started" map prompt
- Desktop overview controls; CTA hidden on desktop (overview controls provide "Begin Tour")
- Map-centric route editing in authoring tool with dirty-leg tracking

### Fixed
- Route endpoint stitching on YAML import; export-button visibility
- Welcome page progress-bar override; stop list hidden on all layouts during welcome
- Pulse triggered on map open (not overview init); 600ms intervals
- Persistent red end-pin during active tour navigation

---

## [1.2.2] — 2026-04-02

### Fixed
- Authoring app on GitHub Pages: correct base path
- `npm run dev` regression
- Broken image links and copy edits

---

## [1.2.1] — 2026-04-01

### Fixed
- Force Node 24 for GitHub Actions to fix deprecation warning

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

[1.5.1]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.5.1
[1.5.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.5.0
[1.4.1]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.4.1
[1.4.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.4.0
[1.3.4]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.3.4
[1.3.3]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.3.3
[1.3.2]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.3.2
[1.3.1]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.3.1
[1.3.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.3.0
[1.2.2]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.2.2
[1.2.1]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.2.1
[1.2.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.2.0
[1.1.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.1.0
[1.0.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v1.0.0
[0.2.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v0.2.0
[0.1.0]: https://github.com/YOUR-ORG/maptour/releases/tag/v0.1.0
