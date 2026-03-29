# TOUR-021 — Flexible Tour Start Point

## Summary

Allow the user to start the tour at any stop, not just stop 1. The start screen shows the map with all pins; tapping a pin selects it as the starting point. GPS can pre-select the nearest stop. Default remains stop 1.

## Motivation

Users arriving mid-route (e.g. at stop 4 because they parked nearby) currently have to begin at stop 1 and skip forward. On mobile, this means multiple Next taps before they reach relevant content. A flexible start point lets users jump straight to where they are.

## UX Flow

### Start screen (enhanced)
1. Tour loads → start screen overlay appears (as today)
2. Map behind shows all numbered pins (as today)
3. **New:** A "Start from" indicator shows the selected starting stop (default: stop 1)
4. User can:
   - **Tap a pin on the map** → selects that stop as start point, start screen updates
   - **Use prev/next arrows** in the header bar to cycle through stops and preview them
   - **Tap "Begin tour"** (or "Re-take tour") to start from the selected stop
5. If GPS is available and the user is within reasonable range of the tour area:
   - The nearest stop is pre-selected instead of stop 1
   - A subtle indicator shows "Nearest to you" or similar

### After starting
- Tour enters `at_stop` state at the selected stop index
- Breadcrumb has no visited stops (fresh start regardless of entry point)
- Navigation works normally: Next advances forward, Prev goes backward
- Tour completes when advancing past the last stop (same as today)
- Visited count at completion reflects only stops actually viewed

## Functional Requirements

### FR-1: Pin selection on start screen
- **Given** the start screen is showing
- **When** the user taps a map pin
- **Then** the start screen updates to show the selected stop name and its "getting here" info
- The CTA button text updates to "Start from [stop name]" (or "Begin tour" if stop 1)
- Tapping the CTA begins the tour at the selected stop

### FR-2: Arrow cycling on start screen
- **Given** the start screen is showing
- **When** the user taps prev/next arrows in the header bar
- **Then** the selected stop cycles through all stops
- The map pans to the selected stop
- The start screen preview updates

### FR-3: GPS nearest stop (enhancement)
- **Given** the user has granted location permission
- **When** the tour loads and GPS position is available
- **Then** the nearest stop (by straight-line distance) is pre-selected
- A "Nearest to you" label appears next to the stop name
- User can still override by tapping a different pin or using arrows

### FR-4: GPS unavailable/denied
- **Given** GPS is unavailable or permission denied
- **When** the tour loads
- **Then** stop 1 is selected by default (current behaviour, no error)

### FR-5: Start at selected stop
- **Given** the user has selected stop N and taps the CTA
- **When** the tour begins
- **Then** the journey state transitions to `at_stop` with index N
- Breadcrumb is empty (fresh start)
- The card shows stop N content

### FR-6: Returning user
- **Given** the user has completed the tour before (breadcrumb has visited stops)
- **When** they return to the start screen
- **Then** the CTA says "Re-take tour" (as today), starts from the selected stop
- Previous breadcrumb is preserved (visited pins stay green on the map)

## Non-Functional Requirements

- Pin tap detection must work on mobile (touch) and desktop (click)
- GPS nearest calculation must complete in <100ms (simple haversine, no network)
- No new dependencies
- Start screen must remain usable without GPS (FR-4)

## Out of Scope

- Routing-based nearest stop (we use straight-line distance, not walking distance)
- Auto-starting the tour when near a stop (that's GPS proximity detection, a separate backlog item)
- Reordering stops based on proximity (tour order stays as defined in YAML)
- Search/filter stops on start screen

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| GPS accuracy very low (>500m) | Ignore GPS, default to stop 1 |
| User taps between pins (not on a pin) | No change to selection |
| Tour has only 1 stop | Arrow cycling disabled, pin selection still works |

## Acceptance Criteria

1. Tapping a map pin on the start screen selects that stop
2. Start screen shows selected stop name and getting_here info
3. CTA begins tour at the selected stop
4. Prev/next arrows cycle through stops on the start screen
5. GPS pre-selects nearest stop when available
6. Stop 1 is the default when GPS is unavailable
7. Works on mobile (touch) and desktop (click)
8. Returning users see "Re-take tour" regardless of selected stop

## Test Approach

- **Unit**: GPS nearest stop calculation (haversine), start screen state management
- **Integration**: Pin click → start screen update → tour start at correct index
- **Manual**: Mobile GPS testing (real device), desktop click testing
