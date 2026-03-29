# TOUR-021 — Task Breakdown

## Task 1: nearestStop utility + tests (small)
**Scope:** Create a pure function that finds the nearest stop to a GPS position.
**Files:** `src/gps/nearestStop.ts` (new), `tests/unit/nearestStop.test.ts` (new)
**Acceptance:**
- `nearestStop(lat, lng, stops)` returns the index of the nearest stop
- Uses haversine formula for distance
- Returns 0 if stops array is empty
- Unit tests cover: single stop, multiple stops, edge cases (poles, antimeridian)
**Dependencies:** None

## Task 2: MapView pin click handler (small)
**Scope:** Add an `onPinClick` callback to MapView that fires when any stop pin is tapped.
**Files:** `src/map/MapView.ts`
**Acceptance:**
- `mapView.onPinClick((index) => ...)` registers a click handler
- Fires with the correct stop index when any pin marker is clicked
- Does not interfere with existing map interactions (pan, zoom)
- Works on touch and mouse
**Dependencies:** None

## Task 3: TourStartScreen stop preview (medium)
**Scope:** Extend TourStartScreen to show a selected stop preview and dynamic CTA.
**Files:** `src/layout/TourStartScreen.ts`, `styles/maptour.css`
**Acceptance:**
- Start screen shows "Start from: [stop name]" with getting_here info if available
- `setSelectedStop(index, stop)` updates the preview dynamically
- CTA text is "Begin tour" for stop 1, "Start from [stop name]" for others
- "Re-take tour" label preserved for returning users regardless of selected stop
- "Nearest to you" indicator shown when GPS-selected
- Preview area scrolls with the rest of the start screen content
**Dependencies:** Task 1

## Task 4: Wire everything in index.ts (medium)
**Scope:** Connect pin clicks, GPS nearest, and arrow cycling in the tour_start state.
**Files:** `src/index.ts`, `styles/maptour.css`
**Acceptance:**
- Pin click on map during tour_start selects that stop on the start screen
- Header prev/next arrows cycle through stops on the start screen
- GPS position (if available) pre-selects nearest stop; ignored if accuracy > 500m
- CTA click transitions to `at_stop` at the selected index
- Map pans to selected stop when cycling with arrows
- Start screen overlay allows pointer-events through to the map on mobile
**Dependencies:** Tasks 1, 2, 3

## Task 5: Manual testing and polish (small)
**Scope:** Visual testing on mobile and desktop, polish any rough edges.
**Files:** Various CSS tweaks
**Acceptance:**
- Mobile (390×844): pin tap works through overlay, preview updates, CTA works
- Desktop (1400×800): pin click in map pane, preview in side panel
- GPS flow tested on real device (or simulated)
- Returning user flow works with stop selection
**Dependencies:** Task 4
