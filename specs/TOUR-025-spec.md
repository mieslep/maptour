# TOUR-025 — Map Zoom on Welcome Picker

## Summary

When the user cycles through stops on the welcome card (via arrows or pin tap), the map should zoom in and centre on the selected stop instead of staying at the full tour bounds.

## Motivation

The welcome card lets the user preview stops before starting the tour, but the map stays zoomed out to the full tour extent. This makes it hard to see where each stop actually is — especially on tours that cover a large area. Zooming to the selected stop gives the user a meaningful preview of the location.

## UX Flow

1. Tour loads. Map shows all stops with the full tour bounds (current behaviour).
2. User taps a pin or uses the arrows on the welcome card to highlight a stop.
3. Map animates to centre on the selected stop at a closer zoom level.
4. If the user returns to the "overview" state (e.g. deselects), the map fits back to the full tour bounds.
5. When the user starts the tour (taps "Start"), the map transitions to stop 1 as normal.

## Functional Requirements

### FR-1: Zoom on arrow navigation
- **Given** the welcome card is displayed
- **When** the user taps the next/prev arrow to highlight a stop
- **Then** the map animates to centre on that stop's coordinates at a preview zoom level

### FR-2: Zoom on pin tap
- **Given** the welcome card is displayed
- **When** the user taps a stop pin on the map
- **Then** the map animates to centre on that pin's coordinates at the same preview zoom level

### FR-3: Return to full bounds
- **Given** the map is zoomed to a single stop on the welcome card
- **When** the user cycles back to the "all stops" overview (if applicable)
- **Then** the map fits back to the full tour bounds

### FR-4: Transition to tour start
- **Given** the user has a stop highlighted on the welcome card
- **When** the user taps "Start"
- **Then** the map transitions smoothly to stop 1 (or whichever stop the tour begins on)

### FR-5: Preview zoom level
- **Given** the map zooms to a selected stop
- **When** the animation completes
- **Then** the zoom level is close enough to see the stop's surroundings but not so close that context is lost (e.g. zoom 15–16)

## Non-Functional Requirements

- Zoom animation should use Leaflet's `flyTo` for a smooth transition
- No new dependencies
- No impact on tour state — this is purely a map view change during the welcome phase

## Out of Scope

- Showing a preview of stop content on the map (tooltip/popup)
- Changing the welcome card layout
- Zooming to stops during the active tour (already handled by existing navigation)

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| Stop has no coordinates | Skip zoom, stay at current bounds |
| Rapid arrow tapping | Cancel in-flight animation, zoom to latest selection |
| Single-stop tour | Zoom to that stop (no arrows to cycle) |

## Acceptance Criteria

1. Cycling stops on the welcome card zooms the map to the selected stop
2. Tapping a pin on the welcome card zooms to that pin
3. Zoom animation is smooth (flyTo, not jumpTo)
4. Starting the tour from a zoomed state transitions cleanly to stop 1
5. No regression on tours without welcome cards or with a single stop

## Test Approach

- **Unit**: Verify MapView receives correct coordinates and zoom level on stop selection
- **Integration**: Welcome card arrow tap triggers map zoom; pin tap triggers map zoom
- **Manual**: Visual check on mobile and desktop — smooth animation, sensible zoom level
