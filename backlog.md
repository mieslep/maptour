# MapTour — Feature Backlog

**Created**: 2026-03-28

Tickets are ordered by implementation sequence. Core domain first, then integrations, then polish and release infrastructure.

---

## Milestone: Alpha (v0.1) — Core player, no GPS

### TOUR-001 — Project scaffolding and build pipeline (small)
Set up TypeScript + Vite project, ESLint, Vitest, Playwright, and the two GitHub Actions workflows (CI + release). Produces a "hello world" `maptour.js` bundle served from the demo page.

**Dependencies:** none
**Acceptance:** `npm run build` produces `dist/maptour.js` + `dist/maptour.css`; CI workflow passes on a dummy PR.

---

### TOUR-002 — YAML loader and schema validation (small)
Implement `loader.ts`: fetch a `tour.yaml`, parse with `js-yaml`, validate against the data model, return a typed `Tour` object or a structured error. Includes `ErrorDisplay` for rendering validation errors into the container div.

**Dependencies:** TOUR-001
**Acceptance:** Unit tests cover valid tour, missing required fields, unknown block types, malformed coords. Error messages name the offending field.

---

### TOUR-003 — Map view: pins and route polylines (medium)
Initialise Leaflet inside the container, render numbered pins for all stops, draw route polylines between stops styled by leg mode (walk = dashed, drive = solid). Map fits bounds of all stops on load. Active stop pin is visually distinguished.

**Dependencies:** TOUR-002
**Acceptance:** Demo tour renders all pins in correct positions; walk legs are dashed, drive legs are solid; map bounds fit all stops.

---

### TOUR-004 — Stop card: all content block types (medium)
Render the stop card DOM for the active stop. Implement all five block types: `text` (markdown via marked.js), `image` (with caption), `gallery` (swipeable, CSS scroll-snap), `video` (YouTube iframe), `audio` (native `<audio>` element).

**Dependencies:** TOUR-003
**Acceptance:** Each block type renders correctly against fixture data. YouTube iframe does not load until the card is active (lazy).

---

### TOUR-005 — Prev/Next navigation (small)
Implement `NavController`: Prev/Next buttons advance through stops in sequence, wrap-around disabled at ends. Active stop updates the map (re-centred, pin highlighted) and the stop card. Stop list panel shows all stops; clicking one jumps directly.

**Dependencies:** TOUR-004
**Acceptance:** Prev/Next moves through all stops; map re-centres on each transition; stop list reflects active stop.

---

### TOUR-006 — Demo tour and GitHub Pages deploy (small)
Create a sample tour YAML for a fictional Irish town with one stop of each content block type. Wire up the demo `index.html`. Configure the `release.yml` workflow to deploy `demo/` to GitHub Pages on tag push.

**Dependencies:** TOUR-005
**Acceptance:** Demo accessible at `https://<owner>.github.io/maptour`; all content block types visible.

---

## Milestone: Beta (v0.2) — Full visitor experience

### TOUR-007 — GPS tracker and map dot (small)
Implement `GpsTracker`: wraps the Geolocation API, emits position events. `MapView` renders a pulsing dot at the current position. Gracefully absent if permission denied or API unavailable.

**Dependencies:** TOUR-003
**Acceptance:** On a device with GPS permission granted, dot appears and updates. On a device with permission denied, map still loads, no error thrown.

---

### TOUR-008 — "Take me there" navigation deep-link (small)
Implement `NavButton` and `NavAppPreference`: on first tap, show a picker (Google Maps, Apple Maps, Waze); store choice in localStorage; subsequent taps deep-link directly using the stop's coordinates and leg mode (walking vs driving directions).

**Dependencies:** TOUR-005
**Acceptance:** Picker appears once per device. Subsequent taps open the correct nav app with correct coordinates and mode. Works on Android and iOS.

---

### TOUR-009 — Breadcrumb: visited stop tracking (small)
Implement `Breadcrumb`: mark a stop as visited when the user navigates away from it. Persist visited set in localStorage. Decorate visited pins on the map (distinct colour/icon). Degrade silently if localStorage unavailable.

**Dependencies:** TOUR-005
**Acceptance:** Visited stops remain marked after page refresh. Private browsing mode causes no crash.

---

### TOUR-010 — Responsive layout: wide-screen breakpoint (small)
At ≥768px viewport width, render map and stop card side-by-side (50/50 or 60/40 split). Below 768px, vertical stacked layout. No layout shift on resize.

**Dependencies:** TOUR-004
**Acceptance:** Layout switches at 768px breakpoint. Playwright visual test passes at 375px, 768px, 1280px.

---

## Milestone: v1.0 — Production ready

### TOUR-011 — CSS custom properties and theming guide (small)
Define all `--maptour-*` CSS custom properties with documented defaults. Write integration guide section covering theming. Verify that overriding five vars is sufficient to re-theme the player to match a typical site.

**Dependencies:** TOUR-010
**Acceptance:** Integration guide documents all vars. A test page applying custom vars looks correct.

---

### TOUR-012 — WCAG 2.1 AA audit and fixes (medium)
Run axe-core against the demo tour in Playwright. Fix all critical and serious violations. Document any accepted trade-offs (e.g. third-party YouTube iframe caption limitations).

**Dependencies:** TOUR-006, TOUR-010
**Acceptance:** axe-core reports zero critical violations against the demo page. Keyboard navigation through Prev/Next and stop list works without a mouse.

---

### TOUR-013 — Full E2E test suite (medium)
Playwright E2E tests covering: tour load, all content block types render, Prev/Next navigation, stop list jump, visited breadcrumb persists across refresh, nav app picker flow. Run against a local static server serving the demo tour.

**Dependencies:** TOUR-009, TOUR-010
**Acceptance:** All E2E tests pass in CI on Chrome, Firefox, and Safari (WebKit).

---

### TOUR-014 — Integration guide and example YAML (small)
Write `README.md`: script tag embed, CSS var theming, YAML format reference with all field descriptions, media hosting guidance (YouTube public links, Google Drive public share), known limitations (Drive link expiry, YouTube CSP).

**Dependencies:** TOUR-011
**Acceptance:** A developer unfamiliar with the project can embed a working tour by following the README alone.

---

### TOUR-015 — v1.0 release cut (small)
Tag v1.0.0, verify release workflow attaches `dist/` files to the GitHub Release, verify demo deploys to GitHub Pages, publish CHANGELOG entry.

**Dependencies:** TOUR-012, TOUR-013, TOUR-014
**Acceptance:** GitHub Release v1.0.0 exists with `maptour.js` and `maptour.css` attached. Demo page live.

---

---

## Milestone: v1.1 — Mobile-first tour experience

### TOUR-016 — Journey state machine + mobile bottom sheet layout (large)

Introduce a four-state journey machine (`tour_start`, `at_stop`, `in_transit`, `tour_complete`) and replace the current stacked mobile layout with a map-as-base-layer + draggable bottom sheet. Desktop layout unchanged.

**Key deliverables:** `JourneyStateManager`, `BottomSheet`, `InTransitBar`, `StopListOverlay` (FAB-triggered overlay), map CSS refactor (container `position: fixed` on mobile), journey state persisted in localStorage.

**Spec:** `specs/TOUR-016-spec.md` | **Plan:** `specs/TOUR-016-plan.md` | **Tasks:** `specs/TOUR-016-tasks.md`
**Dependencies:** TOUR-009 (localStorage pattern), TOUR-010 (responsive layout to replace)
**Status:** ✅ Implemented — branch `TOUR-016-mobile-bottom-sheet`

---

### TOUR-017 — Tour start screen + completion screen (small)

Implement the visual `tour_start` and `tour_complete` states. Start screen: tour title, stop count, optional duration, "Begin tour" CTA. Completion screen: "Tour complete!", visited/total, "Review tour". Adds optional `tour.duration` YAML field.

**Spec:** `specs/TOUR-017-spec.md` | **Plan:** `specs/TOUR-017-plan.md` | **Tasks:** `specs/TOUR-017-tasks.md`
**Dependencies:** TOUR-016
**Status:** ✅ Implemented — branch `TOUR-017-start-complete-screens`

---

### TOUR-018 — Extended nav modes + tour-level nav_mode YAML (small)

Extend `LegMode` to `walk | drive | transit | cycle`. Add `tour.nav_mode` default to YAML. Update "Take me there" deep-links for all four modes. Filter nav app picker by mode capability (Waze: drive only). Update button labels. Add `transit`/`cycle` polyline styles.

**Spec:** `specs/TOUR-018-spec.md` | **Plan:** `specs/TOUR-018-plan.md` | **Tasks:** `specs/TOUR-018-tasks.md`
**Dependencies:** TOUR-016 (for integration; logically independent)
**Parallelisable with:** TOUR-017
**Status:** ✅ Implemented — branch `TOUR-018-nav-mode-yaml`

---

### TOUR-019 — v1.1 WCAG audit + integration guide update (small)

Post-v1.1 quality pass: axe-core audit on new bottom sheet, start/complete screens, and overlay components. Update README integration guide to document new YAML fields (`tour.duration`, `tour.nav_mode`, extended `leg_to_next.mode`).

**Dependencies:** TOUR-016, TOUR-017, TOUR-018
**Status:** Not yet specced

---

## Milestone: v1.2 — Tour experience enhancements

### TOUR-020 + TOUR-021 — Welcome/goodbye cards, flexible start, circular tour (combined)

Welcome and goodbye are cards in the sheet (not modals). The welcome card includes a stop picker — user cycles through stops with arrows or taps a map pin. Tour is circular: starting at any stop, the user visits all stops wrapping around. `getting_here.route` supports pre-computed polyline waypoints. `tour.close_url` navigates away on goodbye card.

**Spec:** `specs/TOUR-020-*.md`, `specs/TOUR-021-*.md`
**Dependencies:** TOUR-016
**Status:** ✅ Implemented — merged to main

---

### TOUR-022 — Journey cards between stops (medium)

Add optional `getting_here.journey` content blocks between stops — guided commentary for the route between two stops. Shown as a transient card during transit with "I've arrived" button. Content tied to the transit segment.

**Spec:** `specs/TOUR-022-*.md`
**Dependencies:** TOUR-020/021
**Status:** ✅ Implemented — merged to main

---

### TOUR-023 — i18n framework for UI label localisation (small)

All hardcoded UI labels replaced with `t()` lookups. Default English strings with named placeholders (`{stop}`, `{n}`, `{total}`). Tour authors override via `tour.strings` in YAML. Validation of string keys and placeholder names.

**Dependencies:** TOUR-020/021
**Status:** ✅ Implemented — merged to main

---

### TOUR-024 — GPS nearest-stop pre-selection (small)

When GPS is available and accurate, pre-selects the nearest tour stop on the welcome picker. Configurable via `tour.gps` YAML block: `max_distance` (default 5km) and `max_accuracy` (default 500m). Fires once per welcome entry, resets on revisit.

**Dependencies:** TOUR-021
**Status:** ✅ Implemented — merged to main

---

## Milestone: v1.3 — Mobile-first player and GPS

### Font Awesome icons (small)

Replaced emoji icons (person, nav arrows, etc.) with Font Awesome for consistency and rendering reliability across all platforms.

**Status:** ✅ Implemented — merged to main

---

### Journey card CTA with stop name (small)

Updated "I've arrived" button text to "I've arrived at [stop name] →" so the user knows which stop they're arriving at. Uses i18n `arrived` key with `{stop}` placeholder.

**Status:** ✅ Implemented — merged to main

---

### Hide getting_here note after journey card (small)

If the user has just seen a journey card with transit content, the getting_here note on the stop card is suppressed as redundant. `setSuppressGettingHereNote()` flag cleared on next navigation.

**Status:** ✅ Implemented — merged to main

---

### TOUR-025 — Map zoom on welcome picker (small)

Zoom and centre the map to the selected starting position when the user picks a stop on the welcome card. `flyToStop()` animates to stop at zoom 16.

**Dependencies:** TOUR-021
**Status:** ✅ Implemented — merged to main

---

### TOUR-028 — Show GPS position and heading during tour (small)

GPS person icon visible on the map throughout the tour, not just on the welcome screen. Heading arrow rotates based on compass/movement. Z-index below pins so it doesn't interfere.

**Dependencies:** TOUR-007
**Status:** ✅ Implemented — merged to main

---

### TOUR-029 — Reverse tour direction (small)

Toggle on welcome card lets user walk the tour in reverse. Journey cards sequence correctly regardless of direction. Map pin numbers reflect reversed order.

**Dependencies:** TOUR-022
**Status:** ✅ Implemented — merged to main

---

### TOUR-031 — GPS proximity arrival detection (small)

Auto-reveal stop card when user enters detection radius. `arrival_radius` configurable at tour level (default 7.5m) and per-stop override. Accuracy guard and re-trigger protection.

**Dependencies:** TOUR-028
**Status:** ✅ Implemented — merged to main

---

### TOUR-032 — Adaptive GPS battery preservation (small)

Three GPS modes (high accuracy, far cruise, stationary) with automatic transitions. Reduces polling frequency when stationary or far from next stop. Configurable via `gps.battery_saver` YAML block.

**Dependencies:** TOUR-031
**Status:** ✅ Implemented — merged to main

---

### TOUR-033 — Tour authoring editor enhancements (large)

WYSIWYG preview with click-to-edit, device selector (real phone models), card consistency across welcome/goodbye/stop. Image padding, caption positioning, kebab→inline controls, route editing fixes.

**Dependencies:** TOUR-022
**Status:** ✅ Implemented — merged to main

---

### TOUR-034 — Zod schema validation + versioning (small)

Replace hand-written validation with Zod schema. Add YAML schema versioning.

**Dependencies:** none
**Status:** ✅ Implemented — merged to main

---

### TOUR-036 — SRI hashes for player bundle (small)

Subresource integrity hashes for player bundle. EMBED.md for embedding guidance.

**Dependencies:** none
**Status:** ✅ Implemented — merged to main

---

### TOUR-037 — Return-to-start option on last stop (small)

Two-button footer on last stop: primary "Return to start →" CTA and secondary "Finish here".

**Dependencies:** TOUR-020/021
**Status:** ✅ Implemented — merged to main

---

### TOUR-038 — Mobile layout rework: full-page cards with map toggle (large)

Replaced bottom-sheet-over-map layout with content-first full-page cards. Map accessed via toggle FAB, slides in as full-width panel. Floating title bar, sticky card headers, scroll hint gradient. Desktop layout unchanged.

**Spec:** `specs/TOUR-038-*.md`
**Dependencies:** TOUR-016
**Status:** ✅ Implemented — merged to main

---

### TOUR-039 — Menu bar, progress bar, and system cards (medium)

Replace stop-list-header with hamburger menu bar + progress bar. Menu items: Getting Here (YAML content card), Tour Overview, Tour Stops, About (hardcoded branding). Progress bar shows visited/total with prev/next arrows during active tour. Welcome card simplified: stop picker removed, replaced with "get started" map prompt. New YAML fields: `tour.header_html`, `tour.getting_here`.

**Spec:** `specs/TOUR-039-*.md`
**Dependencies:** TOUR-038
**Status:** ✅ Implemented — merged to main

---

### TOUR-040 — Tour Overview Map mode (medium)

Overview map mode during welcome: sequential pin pulse to show direction, CW/CCW toggle, pin-tap to select starting stop, green start pin / red end pin, "Begin Tour" CTA. Tour mode remains clean. GPS nearest-stop pre-selection re-introduced. Desktop: overview controls at bottom of welcome card.

**Spec:** `specs/TOUR-040-*.md`
**Dependencies:** TOUR-039
**Status:** ✅ Implemented — merged to main

---

### TOUR-041 — Stop list ordered by tour direction (small)

Stop list (menu and overlay) ordered by circular tour direction starting from the chosen stop. E.g. starting at stop 13 forward: 13, 14, 15, 16, 1, 2, ... 12. Updates live as user selects stops on overview map.

**Dependencies:** TOUR-040
**Status:** ✅ Implemented — merged to main

---

### TOUR-042 — Architecture refactor (large)

TourSession as single source of truth for tour config + visited state. StopCard decomposed into CardHost + 6 focused renderers. NavController slimmed to emit events. Layout builders extracted. Journey handler extracted. index.ts reduced from 631 to ~305 lines.

**Spec:** `specs/TOUR-042-*.md`
**Dependencies:** none
**Status:** ✅ Implemented — merged to main

---

## Milestone: v1.5 — Scroll-indicator control

### TOUR-044 — Explicit scroll indicator (`tour.scroll_hint`) (small)

Tour-level YAML field `tour.scroll_hint: 'auto' | 'always' | 'off'` lets authors override the default fade-gradient scroll hint per tour. `'always'` forces the explicit text+chevron strip (the existing `prefers-contrast: more` visual) for every visitor; `'off'` suppresses the indicator entirely. Authoring tool gains a 3-way control in tour settings. Default behaviour unchanged. Also fixes a latent v1.4.1 positioning bug where the gradient sat 44px short of the viewport on welcome / goodbye / system cards.

**Spec:** `specs/TOUR-044-spec.md`
**Dependencies:** TOUR-038 (mobile layout owns the scroll-hint element)
**Status:** ✅ Implemented — merged to main

---

### TOUR-045 — Inline waypoint dot in narrative text (small)

Authors can write `{dot}` in any markdown text block (and waypoint guidance text) to render a small filled circle inline — visually matching the active pink waypoint marker on the map. New CSS variable `--maptour-waypoint-color` lets advanced embedders override the colour; the map marker reads the same variable so inline and on-map dots stay in sync.

**Spec:** `specs/TOUR-045-spec.md`
**Dependencies:** TOUR-043 (waypoints + journey cards exist)
**Status:** ✅ Implemented — merged to main

---

## Milestone: v1.6 — Test coverage rampup

Policy now lives in `speckit.constitution` §VII (risk-tiered per-file coverage thresholds — Tier A pure logic, Tier B UI default, Tier C jsdom-hostile + paired E2E, Phil-approved exception). Tickets in this milestone restored coverage on the 13 below-threshold files and flipped the per-file gate.

### TOUR-046 — Playwright in CI (medium)

Add `npm run test:e2e` to `.github/workflows/ci.yml`. Resolve the build-vs-dev sequencing — Playwright's current config uses `vite preview` which needs a built bundle. Either add an explicit build step before E2E or switch the Playwright `webServer` to `vite dev`. Required before any Tier C disposition is valid.

**Dependencies:** none
**Status:** ✅ Implemented — merged to main

---

### TOUR-047 — `journeyHandler.ts` unit tests (medium)

0% → Tier A (85% functions / 80% lines / 70% branches). Pure orchestration, biggest single coverage win available. No DOM mocking required.

**Dependencies:** TOUR-042 (architecture refactor that extracted journeyHandler)
**Status:** ✅ Implemented — merged to main

---

### TOUR-048 — Tier A remediation (medium)

`loader.ts` (43% lines, the YAML parser) and `GpsTracker.ts` (72% functions, battery-saver logic) to Tier A floors. Both are pure-logic with substantial decision surfaces.

**Dependencies:** none
**Status:** ✅ Implemented — merged to main

---

### TOUR-049 — Tier B remediation, batch 1 (small-medium)

`NavButton.ts`, `GuidanceBanner.ts`, `buildMobileLayout.ts`, `MapView.ts` function gaps to Tier B (70% functions / 70% lines / 60% branches).

**Dependencies:** none
**Status:** ✅ Implemented — merged to main

---

### TOUR-050 — Tier B remediation, batch 2 (small)

Block renderer functions and branches: `AudioBlock`, `GalleryBlock`, `ImageBlock`, `renderBlock` branch dispatch, `TextBlock` async path, `GoodbyeCard` restart branch.

**Dependencies:** none
**Status:** ✅ Implemented — merged to main

---

### TOUR-051 — Per-file thresholds + flip the gate (small)

Implement the three-tier model in `vite.config.ts`. Add a `coverage:check` script that validates the Tier C registry (paired Playwright spec exists, headers name the source file, asserted selectors come from the source). Flip the per-file gate.

**Dependencies:** TOUR-046, TOUR-047, TOUR-048, TOUR-049, TOUR-050
**Status:** ✅ Implemented — merged to main

---

## Backlog (unsequenced)

### Architecture

- **Tour reversal mechanics** — direction toggle is hidden pending review. Journey cards, getting_here notes, and CTA buttons need correct behaviour in reverse direction. **Status:** punted indefinitely — Phil may not adopt.

### Process

- **MapTour spec & review process** — decide what level of rigor specs warrant for this project (FR/AC depth, whether to formalise hazard-surfaces / adversarial review, where specs live, what approval gate is). Surfaced after TOUR-044 spec accidentally ran a heavyweight pre-handoff loop that didn't fit the project's working model. Needs a separate, deliberate discussion — not a per-ticket decision.

