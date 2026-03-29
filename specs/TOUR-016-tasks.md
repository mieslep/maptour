# TOUR-016 — Task List: Mobile Bottom Sheet + Journey State

**Branch**: `TOUR-016-mobile-bottom-sheet`
**Plan**: `specs/TOUR-016-plan.md`
**Status**: Draft

---

## Task 1 — JourneyStateManager

**Scope**: Implement `src/journey/JourneyStateManager.ts` with full state machine, localStorage persistence, and subscriber callbacks.

**Acceptance**:
- Unit tests: state transitions (all valid paths), invalid transitions are no-ops, persistence roundtrip, restore normalises `in_transit` → `at_stop`
- `persist()` writes `maptour-journey-{tourId}` to localStorage
- `restore()` returns false when nothing stored or when localStorage unavailable

**Dependencies**: none
**Files**: `src/journey/JourneyStateManager.ts`, `tests/unit/journey.test.ts`

---

## Task 2 — BottomSheet component

**Scope**: Implement `src/layout/BottomSheet.ts`. DOM construction, three snap positions (expanded/peek/collapsed), pointer-based drag, momentum snap, CSS transition.

**Acceptance**:
- Sheet renders with drag handle
- Drag to each snap point lands correctly (unit test with simulated pointer events)
- `prefers-reduced-motion` disables transition
- No reflow during drag (transform only)

**Dependencies**: Task 1 (needs JourneyState type)
**Files**: `src/layout/BottomSheet.ts`, `styles/maptour.css` (sheet rules), `tests/unit/bottomsheet.test.ts`

---

## Task 3 — Mobile map layout refactor (CSS)

**Scope**: Rework `.maptour-map-pane` and `.maptour-content-pane` for mobile. Map becomes `position: fixed` base layer. Content pane removed from flow on mobile (replaced by sheet). Desktop unchanged.

**Acceptance**:
- Playwright visual tests pass at 375px (sheet over map) and 768px+ (side-by-side unchanged)
- No layout shift on viewport resize around the 768px breakpoint
- Leaflet `invalidateSize()` called after layout change

**Dependencies**: Task 2
**Files**: `styles/maptour.css`, `src/map/MapView.ts` (invalidateSize trigger)

---

## Task 4 — InTransitBar + StopListOverlay

**Scope**: Implement `src/layout/InTransitBar.ts` (collapsed bar, "I'm here" button) and `src/layout/StopListOverlay.ts` (full-screen modal list, FAB trigger on map).

**Acceptance**:
- InTransitBar shows correct next-stop title and stop number
- "I'm here" fires callback with correct stop index
- StopListOverlay opens on FAB tap, closes on stop selection or backdrop tap
- Stop list overlay marks active and visited stops correctly
- All touch targets ≥ 44×44px

**Dependencies**: Task 1, Task 3
**Files**: `src/layout/InTransitBar.ts`, `src/layout/StopListOverlay.ts`, `styles/maptour.css`

---

## Task 5 — TourStartScreen + TourCompleteScreen

**Scope**: Implement `src/layout/TourStartScreen.ts` and `src/layout/TourCompleteScreen.ts`. Both are full-screen overlays (mobile) / content pane panels (desktop).

**Acceptance**:
- Start screen shows tour title and stop count
- "Begin tour" transitions to `at_stop` stop index 0
- Completion screen shows visited/total counts
- "Review tour" transitions to `at_stop` stop index 0
- Both screens accessible via keyboard (focus trapped while open)

**Dependencies**: Task 1
**Files**: `src/layout/TourStartScreen.ts`, `src/layout/TourCompleteScreen.ts`, `styles/maptour.css`

---

## Task 6 — MapView: pulsing next-stop pin

**Scope**: Add `setPulsingPin(stopId)` to `MapView`. Applies the `maptour-pin--next` CSS class (pulsing animation) to the target pin; removes it from all others.

**Acceptance**:
- Pin pulses during `in_transit`
- Pulse removed when entering `at_stop`
- CSS animation uses existing `maptour-pulse` keyframe pattern

**Dependencies**: none (can be done independently)
**Files**: `src/map/MapView.ts`, `styles/maptour.css`

---

## Task 7 — NavController + index.ts wiring

**Scope**: Inject `JourneyStateManager` into `NavController`. Wire all components together in `index.ts`. Connect `onStateChange` to `BottomSheet`, `InTransitBar`, `MapView`, and overlay screens.

**Acceptance**:
- Full E2E test: load tour → start screen → begin → read stop → "Take me there" → bar collapses → "I'm here" → next stop card opens
- Full E2E test: advance through all stops → completion screen appears
- Full E2E test: refresh page mid-tour → resumes at last stop in `at_stop`
- Desktop E2E: side-by-side layout unchanged; journey state controls content pane panels

**Dependencies**: Tasks 1–6
**Files**: `src/index.ts`, `src/navigation/NavController.ts`, `tests/e2e/journey.spec.ts`

---

## Task 8 — Update system architecture and backlog

**Scope**: Add `src/journey/` and `src/layout/` modules to `speckit.plan` module decomposition. Mark TOUR-016 as specced in `backlog.md`. Update `memory/projects/maptour/context.md`.

**Acceptance**: Docs updated, no implementation

**Dependencies**: Task 7 complete
**Files**: `speckit.plan`, `backlog.md`, `memory/projects/maptour/context.md`
