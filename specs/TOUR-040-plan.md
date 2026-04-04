# TOUR-040 — Architecture Plan

## System Context

TOUR-040 adds an "overview" map mode visible during `tour_start`. The overview decorates the existing map with directional chevrons on polylines and a pulsing halo on the selected starting pin. A control bar widget (stop picker arrows, direction toggle, Begin Tour CTA) is placed on the map panel (mobile) or the welcome card (desktop).

## Hexagonal Decomposition

### Domain Core

- **ChevronPlacer** — pure function: given a polyline path `[lat, lng][]` and a direction (forward/reverse), returns an array of `{ position: [lat, lng], angle: number }` for chevron placement. Interval-based (e.g. every ~80px of screen space or every N waypoints).

### Inbound Ports

- **OverviewControls** — reusable widget component: progress-style stop picker (◀ ═══●═══ ▶), direction toggle button (↻), and "Begin Tour from [stop]" CTA. Emits: `onStopSelect(index)`, `onDirectionToggle(reversed)`, `onBegin(index, reversed)`. Receives: `update(selectedIndex, stopCount, reversed, stopName)`.

### Outbound Ports

- **MapView extensions** — new methods on MapView:
  - `setOverviewMode(enabled)` — show/hide chevrons and selected-pin halo
  - `setChevronDirection(reversed)` — flip chevron direction
  - `setSelectedPin(stopId)` — show pulsing halo on a pin
  - Internal: `renderChevrons()` / `clearChevrons()` for managing chevron markers

### Adapters

- **Orchestrator** (`index.ts`) — wires OverviewControls into the layout (map panel on mobile, welcome card on desktop), manages overview state, syncs pin taps with controls.

## Component Design

### ChevronPlacer

Pure function, no DOM. Given a path and direction:

1. Walk the polyline, accumulating distance
2. At each interval (~50m or adaptive to zoom), emit a point and bearing
3. Bearing calculated from the segment direction at that point
4. If `reversed`, flip bearing by 180°

Returns: `Array<{ lat: number, lng: number, angle: number }>`

Chevrons rendered as small Leaflet `L.divIcon` markers with a rotated chevron character (CSS `transform: rotate(Xdeg)`). Semi-transparent, small (12-16px), non-interactive (`interactive: false`).

### MapView Overview Extensions

```
setOverviewMode(enabled: boolean)
  → if enabled: renderChevrons(), highlight selected pin
  → if disabled: clearChevrons(), remove halo

setChevronDirection(reversed: boolean)
  → recalculate chevron angles, re-render

setSelectedPin(stopId: number | null)
  → add/remove pulsing halo CSS class on target pin
```

The pulsing halo uses a new CSS class `maptour-pin--selected` with a `box-shadow` animation, distinct from `maptour-pin--next` (which pulses the pin itself).

### OverviewControls Widget

```
┌──────────────────────────────────────┐
│ [◀] ═══════●══════════ [▶]  [↻]     │
│                                      │
│        [ Begin Tour from Trinity ]   │
└──────────────────────────────────────┘
```

- Top row: stop picker (arrows + track) + direction toggle
- Bottom row: full-width CTA button
- Stop picker: same visual as ProgressBar but shows stop position (N of total), arrows cycle through stops
- Direction toggle: small circular button with rotate icon, toggles `reversed` state
- CTA: updates text with selected stop name

The widget is a single DOM element that can be appended to either the map panel (mobile) or the welcome card (desktop).

### GPS Pre-Selection

When overview mode activates and GPS is available:
1. Wait for first accurate position (within `gps.max_accuracy`)
2. Calculate nearest stop (within `gps.max_distance`)
3. If found, update OverviewControls and MapView selected pin (once per overview entry)

## Layout Integration

### Mobile
- OverviewControls appended to the map panel, positioned at the bottom (absolute, bottom: 0)
- Only visible when map panel is open AND journey state is `tour_start`
- Map panel header shows normal close button (no nav button during overview)
- On "Begin Tour" tap: close map panel, start tour

### Desktop
- OverviewControls appended to the welcome card container, at the bottom
- Always visible during `tour_start` (map is always visible on desktop)
- Pin clicks on map sync with the control bar
- On "Begin Tour" tap: start tour directly

### Shared Behaviour
- Pin click → `mapView.setSelectedPin(stopId)` + `overviewControls.update(...)`
- Arrow click → cycle index, `mapView.setSelectedPin(stopId)` + `mapView.flyToStop(stop)`
- Direction toggle → `mapView.setChevronDirection(reversed)` + update pin numbers + update controls
- Begin Tour → set start index + reversed on NavController, transition to `at_stop`

## Tech Stack

No new dependencies. Uses:
- Leaflet `L.divIcon` for chevron markers
- Existing CSS animation for pulsing halo
- Existing `t()` for i18n

## -ilities Assessment

### Performance
- Chevron markers are lightweight div icons with `interactive: false`
- Created once per overview entry, cleared on mode switch
- For a 16-stop tour with ~500 waypoints total, expect ~50-100 chevron markers — minimal overhead

### Accessibility
- Direction toggle: `aria-label` updates to reflect current direction
- Begin Tour button: clear label with stop name
- Stop picker arrows: `aria-label` "Previous stop" / "Next stop"
- Selected pin: `aria-selected="true"` on the marker

### Maintainability
- ChevronPlacer is a pure function, easy to unit test
- OverviewControls is self-contained, same pattern as InTransitBar
- MapView extensions are additive (new methods, no changes to existing ones)

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Chevron markers on short segments overlap or cluster | Medium | Minimum distance between chevrons; skip segments shorter than threshold |
| Chevron rotation incorrect at polyline bends | Low | Calculate bearing from adjacent waypoints, not just segment |
| Overview controls overlap map zoom buttons | Medium | Position controls above zoom buttons; check z-index |
| Pin halo animation janky on low-end devices | Low | Use CSS animation (GPU-accelerated); `prefers-reduced-motion` fallback |
