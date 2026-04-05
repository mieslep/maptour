# TOUR-043 — Task Breakdown

**Spec:** `specs/TOUR-043-spec.md`
**Plan:** `specs/TOUR-043-plan.md`
**Branch:** `TOUR-043-waypoints-native-app`
**Status:** Draft — awaiting review

---

## Tooling Tasks

### T0. Add test coverage reporting

**Scope:** Configure Vitest coverage (v8 provider), add `coverage` npm script, add coverage threshold (80%) to CI.

**Acceptance criteria:**
- `npm run coverage` produces an HTML and lcov report
- CI fails if coverage drops below 80%
- Existing 293+ tests still pass

**Dependencies:** None
**Files:** `package.json`, `vite.config.ts` or `vitest.config.ts`, `.github/workflows/ci.yml`

---

## Phase A: Waypoint Data + Browser Player

### A1. Waypoint type and schema

**Scope:** Add `Waypoint` interface to types. Add `WaypointSchema` to schema. Update `Leg` to add `waypoints` and remove `journey`. Add `tour_url` and `waypoint_radius` to `TourMeta`. Add Zod refinement: `waypoints` non-empty requires `route` present. Remove `journey` field from `Leg` type and `LegSchema`. Refactor all existing `Leg.journey` consumers: `NavController.ts` (journey flow logic, `journeyDestIndex`), `JourneyCardRenderer.ts` (journey content source), `index.ts` (journey check at line ~203). These files currently read `getting_here.journey` for the in-transit journey card flow — this logic is replaced by the waypoint system but must compile and pass tests after this task.

**Acceptance criteria:**
- `Waypoint` interface matches spec FR-1 (coords, text, photo, journey_card, content, radius)
- `Leg.journey` removed; `Leg.waypoints` added (optional array)
- `TourMeta.tour_url` (optional string) and `TourMeta.waypoint_radius` (optional positive number) added
- Schema rejects: waypoints without route, empty text, invalid coords
- Schema accepts: light waypoints, journey card waypoints, waypoints with content blocks, per-waypoint radius
- `NavController.ts`: `journeyDestIndex` and journey-check logic removed; in-transit navigation still works for legs without waypoints (falls through to existing transit bar flow)
- `index.ts`: journey check removed; legs without waypoints still trigger `in_transit` state correctly
- `JourneyCardRenderer.ts`: `Leg.journey` references removed (waypoint rendering added in A6)
- Existing tours without waypoints validate unchanged
- All existing tests updated — `NavController.test.ts` and `JourneyStateManager.test.ts` journey references removed/rewritten
- All 293+ tests pass

**Dependencies:** None
**Files:** `src/types.ts`, `src/schema.ts`, `src/navigation/NavController.ts`, `src/card/JourneyCardRenderer.ts`, `src/index.ts`, `tests/unit/NavController.test.ts`, `tests/unit/JourneyStateManager.test.ts`

---

### A2. i18n strings for waypoint player

**Scope:** Add new i18n keys to `src/i18n.ts` DEFAULTS: `arriving_at`, `continue`, `open_in_app`. Keys sorted alphabetically per convention. `im_here` already exists — no change needed. Mirror in authoring `I18N_DEFAULTS` (authoring strings added in B1).

**Acceptance criteria:**
- `arriving_at` (with `{stop}` placeholder), `continue`, and `open_in_app` added to DEFAULTS, alphabetically sorted
- `im_here` confirmed already present — not duplicated
- Corresponding entries added to PLACEHOLDERS where needed (`arriving_at` → `['stop']`)
- i18n parity test still passes (or authoring parity deferred until B1)
- No existing strings changed

**Dependencies:** None
**Files:** `src/i18n.ts`, i18n test file

---

### A3. WaypointTracker class

**Scope:** New `src/waypoint/WaypointTracker.ts`. Pure state machine tracking position in a waypoint sequence. Emits callbacks for advance, journey card, and complete events. No map or DOM dependencies.

**Acceptance criteria:**
- `getCurrentWaypoint()` returns the active waypoint
- `getNextWaypoint()` returns null when on the last waypoint
- `getSegmentBounds()` returns from/to coords for the current segment
- `advance()` moves to next waypoint and fires `onAdvance` callback
- `advance()` on a journey card waypoint fires `onJourneyCard` with an `onDismiss` callback
- `advance()` past final waypoint fires `onComplete`
- `isComplete()` returns true after all waypoints passed
- `reset()` returns to first waypoint
- Journey card detection: `journey_card: true` OR `content` array present
- Unit tests cover: empty waypoints (edge), single waypoint, multiple light, mixed light + journey card, reset after complete

**Dependencies:** A1 (Waypoint type)
**Files:** `src/waypoint/WaypointTracker.ts` (new), test file

---

### A4. Map waypoint markers

**Scope:** Add `setWaypoints()` and `clearWaypoints()` methods to `MapView`. Render waypoints as `L.circleMarker` on a dedicated layer group. Active waypoint highlighted, passed dimmed, future subtle outline. Add `zoomToSegment()` method.

**Acceptance criteria:**
- Waypoint markers render on the polyline at correct coords
- Active (next target) marker uses tour accent colour
- Passed markers are grey/dimmed
- Future markers are subtle outline only
- `clearWaypoints()` removes all waypoint markers
- `zoomToSegment(from, to)` fits map bounds to the segment with padding
- Markers are on a separate layer group from stop pins and route polyline
- Unit tests cover marker state transitions

**Dependencies:** A1 (Waypoint type)
**Files:** `src/map/MapView.ts`, `styles/maptour.css`, test file

---

### A5. Waypoint transit flow (browser)

**Scope:** Modify `journeyHandler.ts` to detect waypoints on a leg and enter waypoint transit mode. Create WaypointTracker, wire callbacks to map (zoom segments, update markers), guidance banner, journey cards (via A6), and arriving banner (via A7). Add "I'm here" button to TourFooter during waypoint transit. On complete: show destination stop card with arriving banner. For legs without waypoints, preserve existing `InTransitBar` behaviour (transit bar + pulsing pin).

**Acceptance criteria:**
- Entering transit on a leg with waypoints: map zooms to first segment, first waypoint guidance text displayed via GuidanceBanner
- "I'm here" on light waypoint: marker dims, map zooms to next segment, next guidance text shown
- "I'm here" on journey card waypoint: full card opens via CardHost (using A6 waypoint rendering)
- Dismissing journey card: map advances to next segment
- Final waypoint cleared: stop card shown with "Arriving at [stop]" ArrivingBanner
- Legs without waypoints: `InTransitBar` shown as before (existing behaviour preserved, no regression)
- During waypoint transit: `InTransitBar` hidden, waypoint UI shown instead
- TourFooter shows "I'm here" button (replaces prev/next) during waypoint transit
- Progress track shows waypoint progress (filled segments for passed waypoints)

**Dependencies:** A3 (WaypointTracker), A4 (map markers), A2 (i18n strings), A6 (journey card waypoint rendering), A7 (arriving banner), A8 (guidance banner)
**Files:** `src/orchestrator/journeyHandler.ts`, `src/layout/TourFooter.ts`, `styles/maptour.css`

---

### A6. Journey card renderer — waypoint support

**Scope:** Extend `JourneyCardRenderer` to accept a `Waypoint` as content source. Use `waypoint.text` as header, `waypoint.photo` as hero image, `waypoint.content` blocks below. Footer button: "Continue" (not "I've arrived").

**Acceptance criteria:**
- Journey card renders correctly from a Waypoint with text + photo + content blocks
- Journey card renders from a Waypoint with only text + `journey_card: true`
- "Continue" button dismisses the card and fires the onDismiss callback
- Existing journey card rendering (if any legacy paths remain) still works or is cleanly removed

**Dependencies:** A1 (Waypoint type), A2 (i18n "continue" string)
**Files:** `src/card/JourneyCardRenderer.ts`, test file

---

### A7. Arriving banner component

**Scope:** New `src/card/ArrivingBanner.ts`. Transient banner: "Arriving at [stop name]" with optional stop image or map pin icon. Auto-dismisses after 3s or on tap.

**Acceptance criteria:**
- Banner shows stop name using `arriving_at` i18n string with `{stop}` placeholder
- Auto-dismisses after 3 seconds
- Tap/click dismisses immediately
- Respects `prefers-reduced-motion` (no animation if reduced motion)
- Styled consistently with tour theme (uses CSS custom properties)
- Unit tests cover show/auto-dismiss/tap-dismiss

**Dependencies:** A2 (i18n `arriving_at` string)
**Files:** `src/card/ArrivingBanner.ts` (new), `styles/maptour.css`, test file

---

### A8. Guidance banner component

**Scope:** New `src/waypoint/GuidanceBanner.ts`. Compact overlay on the map showing the current waypoint's guidance text and optional photo thumbnail. Updates when the active waypoint changes.

**Acceptance criteria:**
- Displays waypoint `text` prominently
- Shows `photo` as a small thumbnail if present
- Updates content when `setWaypoint()` is called with a new waypoint
- Positioned as overlay on the map (does not push map content)
- Mobile-friendly: respects vertical space constraints (compact layout)
- Unit tests cover text-only and text+photo rendering

**Dependencies:** A1 (Waypoint type)
**Files:** `src/waypoint/GuidanceBanner.ts` (new), `styles/maptour.css`, test file

---

### A-INT. Phase A integration tests

**Scope:** Integration tests covering the full waypoint browser transit flow end-to-end within the unit test framework (no Playwright). Test the orchestration: enter transit → waypoint sequence → journey cards → arrival.

**Acceptance criteria:**
- Test: leg with 3 light waypoints — advance through all, verify stop card shown at end
- Test: leg with mixed light + journey card waypoints — verify journey card opens/dismisses correctly
- Test: leg with multiple consecutive journey card waypoints — verify each renders its own card in sequence
- Test: leg with no waypoints — verify existing transit behaviour unchanged (InTransitBar shown)
- Test: waypoint with per-waypoint radius override in data model
- Test: single waypoint leg — advance once, arrive at stop
- All existing tests still pass

**Dependencies:** A5, A6, A7, A8 (all Phase A implementation tasks)
**Files:** Test files

---

## Phase B: Authoring Tool

### B1. Authoring waypoint types + i18n parity

**Scope:** Add `Waypoint` type to authoring types. Add authoring i18n keys (`add_waypoint`, `waypoint_no_route`). Update i18n parity test.

**Acceptance criteria:**
- Authoring `Waypoint` type mirrors player type
- `I18N_DEFAULTS` includes `add_waypoint` and `waypoint_no_route` strings
- i18n parity test passes (player DEFAULTS ↔ authoring I18N_DEFAULTS)

**Dependencies:** A1 (player Waypoint type as reference)
**Files:** `authoring/src/types.ts`, authoring i18n file, i18n parity test

---

### B2. YAML round-trip — waypoints

**Scope:** Update `yaml-io.ts` to import/export `getting_here.waypoints`. Remove legacy `journey` field handling on import (silently drop). Export omits `waypoints` key if array is empty.

**Acceptance criteria:**
- Import: YAML with waypoints parses correctly into authoring data model
- Import: YAML with legacy `journey` field — field silently dropped, no error
- Export: waypoints serialised in correct YAML format
- Export: empty waypoints array omitted from output
- Round-trip: import → export produces equivalent YAML
- Unit tests for import, export, legacy drop, round-trip

**Dependencies:** B1 (authoring Waypoint type)
**Files:** `authoring/src/yaml-io.ts`, test file

---

### B3. Waypoint placement and modal editor

**Scope:** Add "Add waypoint" button to route editing widget. Implement placement mode (click on polyline places marker). Build waypoint edit modal with: text (required), photo URL, journey card toggle (shows/hides content block editor), radius override. Click existing waypoint marker opens modal for editing. Delete from modal with confirmation.

**Acceptance criteria:**
- "Add waypoint" button visible in route editing widget when leg has a route
- "Add waypoint" on leg without route shows error message (using `waypoint_no_route` string)
- Click "Add waypoint" → cursor indicates placement mode
- Click on polyline in placement mode → waypoint marker placed at click point
- Modal opens with form fields: text (required), photo URL, journey card toggle, radius
- "Make this a journey card" toggle shows/hides content block editor (reuses existing `createContentBlockEditor`)
- Save → waypoint appears on map as distinct marker
- Click existing waypoint → same modal, pre-populated
- Delete button → confirmation → waypoint removed
- Waypoint markers visually distinct from route control points (different colour/shape)
- Undo/redo captures waypoint add/edit/delete (verified via existing snapshot system)

**Dependencies:** B1, B2
**Files:** `authoring/src/ui/editor.ts`, authoring CSS, test file

---

### B4. Waypoint drag and snap-to-polyline

**Scope:** Make waypoint markers draggable. Constrain drag to nearest point on the polyline (snap-to-line). On drop, auto-sort waypoints by fractional position along the polyline.

**Acceptance criteria:**
- Drag a waypoint marker → marker follows mouse but snaps to nearest point on polyline
- Cannot drag waypoint off the polyline
- On drop, waypoint coords updated to snapped position
- Waypoint order auto-sorts by position along polyline after any move
- Undo/redo captures the move
- Unit tests: sort order after drag, snap to nearest segment

**Dependencies:** B3 (waypoint markers exist)
**Files:** `authoring/src/ui/editor.ts`, test file

---

### B-INT. Phase B integration tests

**Scope:** Integration tests for authoring waypoint workflow: add, edit, delete, move, YAML round-trip with waypoints.

**Acceptance criteria:**
- Test: add waypoint to a leg with route → verify in data model and YAML export
- Test: edit waypoint text/photo/journey_card toggle → verify data updated
- Test: delete waypoint → verify removed from data and YAML export
- Test: drag waypoint to new position → verify sort order updated
- Test: add waypoint to leg without route → verify error shown
- Test: undo/redo after waypoint add/edit/delete/move
- All existing authoring tests still pass

**Dependencies:** B3, B4
**Files:** Test files

---

## Phase C: Native App (Capacitor)

### C1. Capacitor project setup

**Scope:** Create `native/` directory with Capacitor config, package.json, and native-bridge stub. Configure to wrap `dist/` output in WebView. Add Capacitor detection (`window.Capacitor`) in player.

**Acceptance criteria:**
- `native/` directory with `capacitor.config.ts` and `package.json`
- Capacitor configured to load web assets from `../dist/`
- `src/index.ts` detects `window.Capacitor` and exposes a `isNative()` helper
- Non-native builds unaffected (detection is passive)
- Basic iOS and Android project shells generated

**Dependencies:** Phase A complete
**Files:** `native/` (new directory), `native/capacitor.config.ts`, `native/package.json`, `native/src/native-bridge.ts`, `src/index.ts`

---

### C2. Native GPS adapter

**Scope:** Extend `GpsTracker` with a Capacitor adapter path. When running in Capacitor, use `@capacitor/geolocation` for foreground and `@capacitor-community/background-geolocation` for background tracking. Existing browser path unchanged. Battery saver modes map to Capacitor accuracy options.

**Acceptance criteria:**
- In Capacitor context: GPS uses Capacitor geolocation plugin
- Background mode: tracking continues when app is backgrounded
- Battery saver modes (HIGH_ACCURACY, FAR_CRUISE, STATIONARY) map correctly
- In browser context: existing `navigator.geolocation` path unchanged
- GpsTracker public interface identical — adapter is internal
- Unit tests for adapter selection logic

**Dependencies:** C1
**Files:** `src/gps/GpsTracker.ts`, `native/src/native-bridge.ts`

---

### C3. Waypoint proximity — native auto-advance

**Scope:** Extend `proximityDetector.ts` to support waypoint proximity. Accept a `WaypointTracker` reference. When GPS position enters waypoint radius → advance. Trigger haptics via `@capacitor/haptics` on native. Light waypoint: haptic + auto-advance. Journey card: haptic + auto-show. Handle GPS failure modes: accuracy warning when >50m, "tracking paused" indicator when background location is killed by OS and resumes on foreground, manual "I'm here" fallback when GPS is denied or inaccurate.

**Acceptance criteria:**
- Proximity detector accepts waypoint targets in addition to stop targets
- GPS within waypoint radius → `WaypointTracker.advance()` called
- Default radius from `tour.waypoint_radius` (15m), per-waypoint override respected
- Haptic fires on native waypoint arrival (no-op in browser)
- GPS accuracy >50m: auto-advance paused, accuracy warning shown, manual "I'm here" fallback available
- Background location killed by OS: on foreground resume, show transient "tracking paused" indicator, then resume tracking
- GPS denied: falls back to manual "I'm here" tapping (same as browser)
- Existing stop proximity detection unchanged
- Existing hysteresis and accuracy guards apply to waypoints
- Unit tests for waypoint proximity triggering, accuracy threshold, and fallback behaviour

**Dependencies:** C2, A3 (WaypointTracker)
**Files:** `src/gps/proximityDetector.ts`, `native/src/native-bridge.ts`

---

### C4. Local notifications

**Scope:** New `src/native/notifications.ts`. When a waypoint is reached in background mode, fire a local notification with the next waypoint's guidance text. Tapping notification foregrounds the app.

**Acceptance criteria:**
- Local notification fires with waypoint text when reached in background
- Notification tap foregrounds app at current waypoint state
- No notifications in browser context (module is no-op)
- Notification permission requested contextually (not on app launch)

**Dependencies:** C3
**Files:** `src/native/notifications.ts` (new), `native/src/native-bridge.ts`

---

### C5. Deep linking

**Scope:** Configure Capacitor deep link handling via `@capacitor/app`. Support universal links and custom URL scheme (`maptour://`). On deep link: extract tour URL, fetch YAML, initialise player.

**Acceptance criteria:**
- Universal link pattern handled (URL format configurable)
- Custom scheme `maptour://tour/{slug}` handled
- Deep link opens correct tour in the player
- Invalid/unreachable tour URL shows error with retry
- Domain/URL pattern configurable in Capacitor config

**Dependencies:** C1
**Files:** `native/capacitor.config.ts`, `native/src/native-bridge.ts`, `src/index.ts`

---

### C6. Offline support (service worker)

**Scope:** Add service worker for caching tour YAML, map tiles, and player assets. Cache-first for previously loaded tours. Works in Capacitor WebView and standard browser.

**Acceptance criteria:**
- Previously loaded tour YAML available offline
- Map tiles cached with cache-first, network-fallback strategy
- Player JS/CSS cached on first load
- Stale cache updated when network available
- Service worker registers in both Capacitor and browser contexts

**Dependencies:** C1
**Files:** `src/sw.ts` (new), `src/index.ts` (SW registration)

---

### C7. "Open in MapTour" badge

**Scope:** When `tour.tour_url` is set, render an "Open in MapTour" badge in the menu bar. Links to the universal link URL. Not shown when running inside Capacitor. Styled with CSS custom properties.

**Acceptance criteria:**
- Badge visible when `tour_url` is set in tour config
- Badge hidden when `tour_url` is not set
- Badge hidden when running inside Capacitor
- Badge links to the configured URL (universal link)
- Badge styled with `--maptour-badge-*` CSS custom properties
- i18n: uses `open_in_app` string
- Unit tests for show/hide logic

**Dependencies:** A1 (tour_url in TourMeta), C1 (Capacitor detection)
**Files:** `src/layout/MenuBar.ts` or new component, `src/i18n.ts`, `styles/maptour.css`

---

### C-INT. Phase C integration tests

**Scope:** Integration tests for native features that can be tested without a real device: adapter selection, proximity with waypoints, notification triggering logic, deep link parsing, badge visibility.

**Acceptance criteria:**
- Test: Capacitor detected → native GPS adapter selected
- Test: Capacitor not detected → browser GPS path used
- Test: waypoint proximity triggers advance + haptic call
- Test: background waypoint arrival triggers notification
- Test: deep link URL parsed correctly → tour loaded
- Test: badge shown/hidden based on tour_url and Capacitor context
- All existing tests still pass

**Dependencies:** All Phase C tasks
**Files:** Test files

---

## E2E Tests

### E2E-A. Browser waypoint navigation (Playwright)

**Scope:** Playwright tests for the full browser waypoint experience using a test tour YAML with waypoints.

**Acceptance criteria:**
- Test: load tour with waypoints → verify waypoint markers on map
- Test: advance through waypoints via "I'm here" → verify map zoom and guidance text updates
- Test: journey card waypoint → verify card opens, dismiss advances
- Test: complete all waypoints → verify stop card shown with arriving banner
- Test: tour without waypoints → verify no regression
- Tests run in CI

**Dependencies:** A-INT (Phase A integration tests pass)
**Files:** Playwright test files, test fixtures (YAML)

---

### E2E-B. Authoring waypoint editing (Playwright)

**Scope:** Playwright tests for authoring tool waypoint editing.

**Acceptance criteria:**
- Test: add waypoint to a route → verify marker on map and data in export
- Test: edit waypoint via modal → verify changes saved
- Test: delete waypoint → verify removed
- Test: drag waypoint → verify position updated
- Tests run in CI

**Dependencies:** B-INT (Phase B integration tests pass)
**Files:** Playwright test files

---

## Task Dependency Graph

```
T0 (coverage) ─────────────────────────────────────────────────────────┐
                                                                        │
A1 (types/schema + journey removal) ──┬── A3 (WaypointTracker) ──┐     │
                                      ├── A4 (map markers) ───────┤     │
                                      ├── A8 (guidance banner) ───┤     │
                                      └── A2 (i18n) ──┬── A6 (journey card)
                                                       └── A7 (arriving banner)
                                                               │  │  │  │
                         A3 + A4 + A2 + A6 + A7 + A8 ──► A5 (transit flow)
                                                                    │   │
                                                              A-INT ── E2E-A
                                                                        │
A1 ── B1 (auth types) ── B2 (yaml) ── B3 (placement/modal) ── B4 (drag)│
                                                                    │   │
                                                              B-INT ── E2E-B
                                                                        │
Phase A complete ── C1 (capacitor) ──┬── C2 (GPS) ── C3 (proximity) ── C4 (notifications)
                                     ├── C5 (deep links)               │
                                     ├── C6 (offline)                  │
                                     └── C7 (badge)                    │
                                                                 C-INT ─┘
```

## Suggested Implementation Order

1. **T0** — coverage reporting (unblocks quality gates for everything)
2. **A1** — types, schema, and journey removal refactor (unblocks all of Phase A and B)
3. **A2, A3, A4, A8** — in parallel (i18n, WaypointTracker, map markers, guidance banner)
4. **A6, A7** — journey card + arriving banner (depend on A2)
5. **A5** — transit flow (wires A3 + A4 + A6 + A7 + A8 together)
6. **A-INT** — Phase A integration tests
7. **B1** — authoring types (can start as soon as A1 is done, parallel with A3–A7)
8. **B2** → **B3** → **B4** — sequential authoring tasks
9. **B-INT** — Phase B integration tests
10. **E2E-A, E2E-B** — Playwright tests
11. **C1** → **C2–C7** → **C-INT** — Phase C after A is complete
