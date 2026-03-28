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

## Backlog (post-v1.0, unsequenced)

- Authoring UI — web-based tour builder, no YAML editing required
- npm package publication
- Offline / PWA / service worker caching
- Multiple tours on one page
- Audio commentary auto-play on stop entry (with user opt-in)
- Cluster rendering for tours with many closely-spaced stops
- Tour analytics (opt-in, privacy-preserving)
