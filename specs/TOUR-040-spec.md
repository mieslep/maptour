# TOUR-040 — Tour Overview Map

## Summary

Introduce two map modes: **overview** (during welcome/tour_start) and **tour** (during active navigation). The overview map adds directional chevrons on route polylines, a tour direction toggle, pin-tap to select starting stop, and a "Begin Tour" button. The tour map remains clean as-is. This replaces the removed stop picker widget from the welcome card.

## Functional Requirements

### FR-1: Overview Map Mode

**Given** the journey state is `tour_start`,
**When** the user opens the map (via FAB on mobile, or the map is always visible on desktop),
**Then** the map renders in overview mode with:
- All pins numbered and tappable
- Route polylines with directional chevrons indicating tour direction
- A selected-stop highlight on the current starting stop (default: stop 1)
- An overlay bar at the bottom with a "Begin Tour from [stop name]" button
- A tour direction toggle (CW/CCW) widget

**Given** the journey state is `at_stop`, `in_transit`, or `tour_complete`,
**When** the map is displayed,
**Then** the map renders in tour mode (current behaviour, no overlays).

### FR-2: Directional Chevrons on Polylines

**Given** the map is in overview mode,
**When** route polylines are displayed,
**Then** chevron markers (▸) appear at regular intervals along each polyline segment, pointing in the tour direction.

**Given** the user toggles the tour direction,
**When** the chevrons update,
**Then** all chevrons reverse direction to match the new tour order.

### FR-3: Tour Direction Toggle

**Given** the map is in overview mode,
**When** the direction toggle is visible,
**Then** the user can tap it to switch between forward and reverse tour order.

**Given** the user toggles direction,
**When** the toggle updates,
**Then** the chevrons reverse, the pin numbers update to reflect the new order, and the selected stop's display number updates.

### FR-4: Pin-Tap to Select Starting Stop

**Given** the map is in overview mode,
**When** the user taps a pin,
**Then** that pin becomes the selected starting stop with a visual highlight, and the "Begin Tour" button updates to show the selected stop name.

**Given** the map is in tour mode,
**When** the user taps a pin,
**Then** existing behaviour (no action, or future stop list jump).

### FR-5: Begin Tour Button

**Given** the map is in overview mode,
**When** a starting stop is selected,
**Then** a "Begin Tour from [stop name]" button appears in an overlay bar at the bottom of the map.

**Given** the user taps "Begin Tour",
**When** the button is pressed,
**Then** the tour starts from the selected stop (sets start index, sets direction, transitions to `at_stop`), and the map panel closes on mobile.

### FR-6: GPS Nearest-Stop Pre-Selection

**Given** the map is in overview mode and GPS is available,
**When** an accurate position is obtained within `gps.max_distance` and `gps.max_accuracy`,
**Then** the nearest stop is pre-selected as the starting stop (once per overview entry).

### FR-7: Desktop Overview

**Given** the viewport is ≥768px,
**When** the journey state is `tour_start`,
**Then** the map pane on the left renders in overview mode with all overlays (chevrons, toggle, begin button, pin selection). The welcome card remains on the right.

## Non-Functional Requirements

- Chevron markers must not significantly impact rendering performance (use Leaflet decorators or lightweight markers)
- Touch targets for toggle and begin button ≥44x44px
- All new UI text goes through `t()` for i18n
- Direction toggle and begin button must not overlap map controls (zoom buttons, attribution)
- Chevrons should be visually subtle (semi-transparent, small) to avoid cluttering the route

## Out of Scope

- POI icon overlays (future feature)
- Authoring tool position control for the get-started block
- Custom starting-stop logic based on tour metadata
- Route editing or modification

## Failure Modes

- **GPS unavailable or denied:** No pre-selection; user picks manually. No error shown.
- **Tour with 1 stop:** Direction toggle hidden (no meaningful direction). Begin button still works.
- **Route waypoints missing:** Chevrons drawn on straight-line fallback between stops.

## Acceptance Criteria

1. Overview mode active during `tour_start`; tour mode during all other states
2. Directional chevrons visible on all route polylines in overview mode
3. Chevrons reverse when tour direction is toggled
4. Pin tap selects starting stop with visual highlight
5. "Begin Tour from [stop name]" button updates on stop selection
6. Begin Tour starts tour from selected stop in selected direction
7. Direction toggle switches between forward/reverse
8. Pin numbers update to reflect direction
9. GPS pre-selects nearest stop when available and accurate
10. Desktop map pane shows overview overlays alongside welcome card
11. No overview overlays visible during active tour navigation
12. All new strings registered in i18n
13. Unit tests for overview state management and chevron direction logic
