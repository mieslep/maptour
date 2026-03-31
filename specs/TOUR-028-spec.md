# TOUR-028 — Show User GPS Position and Heading During Tour

## Summary

The GPS person icon (currently only visible during the welcome phase) should remain visible on the map throughout the entire tour. The user should be able to see their position relative to the current and next stops at all times. The marker should include a directional arrow showing which way the user is facing.

## Motivation

During a walking tour, knowing where you are on the map is essential. The GPS marker currently disappears after the welcome card, leaving the user to mentally triangulate their position from stop pins alone. Keeping the marker visible throughout gives continuous spatial awareness — especially useful during journey segments between stops.

## UX Flow

1. Tour loads. GPS permission is requested (existing behaviour).
2. GPS marker appears on the map during the welcome phase (existing behaviour).
3. User starts the tour.
4. **GPS marker remains visible** on the map as the user navigates through stops and journey cards.
5. The marker updates in real time as the user moves.
6. If GPS is unavailable or denied, no marker is shown (existing behaviour, no change).

## Functional Requirements

### FR-1: GPS marker visible during stop cards
- **Given** the user has granted GPS permission and is viewing a stop card
- **When** the map is visible
- **Then** the GPS person icon is displayed at the user's current position

### FR-2: GPS marker visible during journey cards
- **Given** the user has granted GPS permission and is viewing a journey card
- **When** the map is visible
- **Then** the GPS person icon is displayed at the user's current position

### FR-3: Continuous position updates
- **Given** the GPS marker is visible
- **When** the user's position changes
- **Then** the marker moves to the new position in real time

### FR-4: Heading indicator
- **Given** the device provides heading/compass data (via `DeviceOrientationEvent` or `watchPosition` with `heading`)
- **When** the GPS marker is displayed
- **Then** a directional arrow extends from the marker showing which way the user is facing
- The arrow rotates in real time as the user turns

### FR-5: Heading fallback from movement
- **Given** the device does not provide compass heading
- **When** the user is moving (position has changed by >5m since last update)
- **Then** the heading arrow is calculated from the direction of travel (bearing between last two positions)
- When the user is stationary, the arrow is hidden (direction unknown)

### FR-6: No heading available
- **Given** neither compass nor movement-based heading is available
- **When** the GPS marker is displayed
- **Then** the marker is shown without a directional arrow (position only)

### FR-7: GPS marker does not interfere with stop pins
- **Given** the GPS marker and a stop pin overlap
- **When** both are rendered
- **Then** the stop pin has higher z-index (appears on top of the GPS marker)

### FR-8: GPS unavailable
- **Given** the user has denied GPS permission or the device has no GPS
- **When** the tour is active
- **Then** no GPS marker is shown and no errors are thrown

## Non-Functional Requirements

- GpsTracker already runs throughout the tour — this change is about ensuring MapView renders the position in all journey states, not about adding new tracking logic
- No new dependencies
- Battery impact: GpsTracker already runs; no additional GPS calls needed
- The GPS marker should use the existing icon and styling

## Out of Scope

- Accuracy circle around the GPS position
- Auto-panning the map to follow the user
- GPS-triggered navigation (auto-advance to next stop when near)
- Compass calibration UI or accuracy indicator

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| GPS signal lost mid-tour | Marker stays at last known position; no error shown |
| GPS accuracy is very low (>100m) | Marker still shown at reported position |
| Device returns to GPS after signal loss | Marker updates to new position |
| Map is collapsed (bottom sheet full-screen) | GPS updates continue in background; marker visible when map re-expands |
| Device compass not available | Heading derived from movement; hidden when stationary |
| Compass heading is erratic (near metal/magnets) | Movement-based fallback preferred when user is walking |

## Acceptance Criteria

1. GPS marker is visible on the map during stop cards
2. GPS marker is visible on the map during journey cards
3. Marker position updates as the user moves
4. Directional arrow shows heading when compass or movement data is available
5. Arrow hidden when stationary and no compass heading available
6. Stop pins render above the GPS marker when overlapping
7. No GPS marker when permission is denied — no errors in console
8. No regression on welcome phase GPS behaviour

## Test Approach

- **Unit**: MapView renders GPS marker when position is available and journey state is not welcome-only; heading arrow rotates with bearing input
- **Integration**: Navigate through stops and journey cards — GPS marker persists; heading updates
- **Manual**: Walk-test on mobile device — confirm marker tracks real movement and arrow points in direction of travel across all tour phases
