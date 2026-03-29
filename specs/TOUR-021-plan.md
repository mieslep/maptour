# TOUR-021 — Architecture Plan

## Approach

Extend the `tour_start` state to support stop selection before the tour begins. The map is already visible behind the start screen; we add click handlers to pins and wire the selection back to the start screen and header bar.

## Key Design Decision: Map Interaction During Start Screen

Currently the start screen is a semi-transparent overlay on mobile and an opaque side panel on desktop. For pin selection to work:
- **Mobile**: The overlay must allow map interaction (taps pass through to the map outside the overlay body). The overlay body remains interactive for the CTA and description.
- **Desktop**: The map pane (left 55%) is fully interactive. The start screen (right 45%) shows the preview and CTA.

## Component Changes

### MapView.ts
- Add `onPinClick(callback: (stopIndex: number) => void)`: registers a click handler on all pin markers
- The callback fires with the stop's index when any pin is tapped
- This is a general-purpose hook (useful beyond TOUR-021)

### TourStartScreen.ts
- Accept `stops: Stop[]` and `selectedIndex: number` in options
- New method `setSelectedStop(index: number, stop: Stop)`: updates the preview (stop name, getting_here info)
- Render a "Start from: [stop name]" section between the meta and CTA
- Update CTA text based on selected stop

### GpsTracker.ts
- Already provides position via `onPosition()` callback
- No changes needed — index.ts will use the position to calculate nearest stop

### index.ts (tour_start state handler)
- Calculate nearest stop from GPS if available
- Set initial selected stop (GPS nearest or 0)
- Wire `mapView.onPinClick()` to update start screen and header arrows
- Wire header arrows to cycle selection and update start screen
- On CTA click: `journeyState.transition('at_stop', selectedIndex)`

### Utility: nearestStop()
- Simple helper: given `[lat, lng]` and `Stop[]`, return the index of the nearest stop by haversine distance
- Placed in `src/gps/nearestStop.ts` (small, pure function, easily testable)

## CSS Changes

### maptour.css
- `.maptour-start__selected-stop` — preview of selected stop in start screen
- Adjust start screen overlay to allow pointer events through to the map on mobile (`pointer-events: none` on overlay, `pointer-events: auto` on body)

## Files Modified/Created

| File | Change |
|------|--------|
| `src/map/MapView.ts` | Add `onPinClick()` method |
| `src/layout/TourStartScreen.ts` | Stop preview, dynamic CTA, `setSelectedStop()` |
| `src/gps/nearestStop.ts` | **New** — haversine nearest stop calculation |
| `src/index.ts` | Wire pin clicks, GPS nearest, arrow cycling in tour_start |
| `styles/maptour.css` | Start screen pointer events, selected stop preview |
| `tests/unit/nearestStop.test.ts` | **New** — unit tests for nearest stop |
| `demo/tour.yaml` | No changes needed |

## Risks

- **Map pointer events vs overlay**: Getting the right pointer-events layering on mobile is fiddly. The start screen overlay needs to be transparent to map taps but still capture taps on its own body (CTA, description). Solution: `pointer-events: none` on the overlay container, `pointer-events: auto` on the body element.
- **Pin click handler + existing Leaflet popups**: Leaflet markers support click events natively. We just need to add handlers without interfering with existing tooltip/popup behaviour (we don't use popups currently, so low risk).
- **GPS timing**: GPS position may arrive after the start screen renders. The `setSelectedStop()` method handles late updates.

## Consistency Check

- No conflict with constitution
- No conflict with system architecture (MapView already wraps Leaflet, adding a click handler is natural)
- Compatible with TOUR-020: welcome content renders above the stop preview; both can coexist
- Compatible with TOUR-022: journey cards are between stops; start point selection doesn't affect them
