# TOUR-031 — GPS Proximity Arrival Detection

## Summary

Automatically reveal the next stop's card when the user physically arrives at it — detected by entering a configurable GPS radius around the stop. Configurable at tour level (`tour.gps.arrival_radius`) with per-stop override. Includes accuracy guard and re-trigger protection.

## Motivation

Currently the user must manually tap "Next" or "I've arrived" to advance to the next stop. When following a tour on foot, the app already has their GPS position via `GpsTracker` — it should recognise when they've reached the next stop and surface the card automatically, reducing friction and making the experience feel guided.

## YAML Schema

Tour-level default under `tour.gps`:

```yaml
tour:
  id: enniscorthy-heritage
  title: Enniscorthy Heritage Trail
  gps:
    max_distance: 5000
    max_accuracy: 500
    arrival_radius: 50       # metres — default 50
```

Per-stop override on the stop object:

```yaml
stops:
  - id: 3
    title: The Cathedral
    coords: [52.50180, -6.55710]
    arrival_radius: 30       # overrides tour-level for this stop
    content:
      - type: text
        body: ...
```

## UX Flow

1. User is viewing stop N (or the journey card between N and N+1)
2. GPS position updates arrive via `GpsTracker`
3. System calculates distance from user to stop N+1
4. **If** distance < effective `arrival_radius` **and** GPS accuracy < radius * 2:
   - The card for stop N+1 slides in automatically
   - A brief toast or visual indicator shows "You've arrived at [stop title]"
   - The map re-centres on the new stop
5. **If** the user has already visited stop N+1 and has not exited the radius since, no re-trigger occurs

## Functional Requirements

### FR-1: Arrival detection requires GPS permission
- **Given** the user has NOT granted GPS permission (or the device has no GPS)
- **When** the tour is active
- **Then** arrival detection is completely inactive; all navigation is manual (existing behaviour preserved)

### FR-2: Arrival detection triggers card reveal
- **Given** GPS tracking is active (user has granted permission) and the user is viewing stop N (or en-route to N+1)
- **When** the user's GPS position is within `arrival_radius` of stop N+1
- **Then** the app automatically navigates to stop N+1's card

### FR-3: Accuracy guard
- **Given** the GPS reports a position within `arrival_radius` of stop N+1
- **When** `position.accuracy >= arrival_radius * 2`
- **Then** the arrival is NOT triggered (position too uncertain)

### FR-4: Sequential stop only
- **Given** the user is on stop N
- **When** the user enters the radius of stop N+3 (not the next in sequence)
- **Then** no arrival is triggered — only the next expected stop (N+1) is monitored

### FR-5: Re-trigger protection
- **Given** the user arrived at stop N+1 (detection fired)
- **When** the user remains within the radius or re-enters without first exiting
- **Then** no second arrival event fires
- The flag resets only when the user's position moves outside `arrival_radius`

### FR-6: Tour-level default
- **Given** `tour.gps.arrival_radius` is set to 75
- **When** a stop has no `arrival_radius` override
- **Then** the effective radius for that stop is 75m

### FR-7: Per-stop override
- **Given** a stop has `arrival_radius: 30`
- **When** the user enters 30m of that stop
- **Then** arrival triggers at 30m regardless of the tour-level default

### FR-8: Default value
- **Given** neither tour-level nor stop-level `arrival_radius` is set
- **When** arrival detection runs
- **Then** the effective radius is 50m

### FR-9: Journey card interaction
- **Given** a journey card is displayed between stop N and N+1
- **When** the user enters the arrival radius of stop N+1
- **Then** the journey card is replaced by stop N+1's card (same as tapping "I've arrived")

## Non-Functional Requirements

- Arrival check runs inside the existing `GpsTracker.onPosition` callback — no additional polling or timers
- Distance calculation reuses `haversine` from `nearestStop.ts`
- No new dependencies
- Detection must not degrade scrolling or card animation performance

## Out of Scope

- Arrival detection for arbitrary stops (non-sequential)
- Geofencing for tour boundary warnings
- Audio or vibration alerts on arrival
- Arrival detection when GPS is unavailable or permission denied

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| GPS unavailable or permission denied | Arrival detection inactive; manual navigation only |
| GPS accuracy consistently poor (urban canyon) | Accuracy guard prevents false triggers; user advances manually |
| `arrival_radius` set to 0 or negative in YAML | Loader validation rejects; falls back to default 50m |
| User skips a stop manually | Next expected stop updates; detection monitors the new next stop |
| Tour has only one stop | No arrival detection (no "next" stop to monitor) |

## Acceptance Criteria

1. Walking within 50m of the next stop auto-reveals its card
2. Poor GPS accuracy (>= radius * 2) suppresses the trigger
3. Standing still inside the radius does not re-trigger
4. Exiting and re-entering the radius triggers again
5. Per-stop `arrival_radius` overrides the tour default
6. Only the next sequential stop is monitored
7. Journey card is replaced on arrival
8. Tours without `arrival_radius` config work with 50m default
9. Manual "Next" navigation still works when arrival detection is active

## Test Approach

- **Unit**: `haversine` distance check against known coordinates; accuracy guard logic; re-trigger flag state machine
- **Integration**: Mock `GpsTracker` emitting positions that cross the radius boundary; verify card navigation fires
- **Manual**: Field test with real GPS on a multi-stop tour; verify arrival triggers at reasonable distance
