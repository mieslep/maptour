# TOUR-032 — Battery Preservation

## Summary

Reduce GPS polling frequency and accuracy demands to preserve battery on mobile devices. Detect stationary periods and long distances to the next stop, and downshift `GpsTracker` accordingly. Resume high-accuracy tracking when the user starts moving or approaches the next stop.

## Motivation

`GpsTracker` currently runs `watchPosition` with `enableHighAccuracy: true` and a 30-second `maximumAge` at all times. On mobile, high-accuracy GPS is the single largest battery drain. Most of the time the user is either standing at a stop reading content (no GPS needed) or walking a long stretch where coarse position is sufficient. Adapting polling preserves battery without degrading the experience.

## YAML Schema

All thresholds configurable under `tour.gps`:

```yaml
tour:
  id: enniscorthy-heritage
  title: Enniscorthy Heritage Trail
  gps:
    max_distance: 5000
    max_accuracy: 500
    arrival_radius: 50
    battery_saver:
      stationary_timeout: 120    # seconds stationary before downshift (default: 120)
      stationary_radius: 10      # metres — movement within this is "stationary" (default: 10)
      far_stop_distance: 500     # metres — next stop farther than this triggers reduced polling (default: 500)
      far_stop_max_age: 60000    # maximumAge in ms when far from next stop (default: 60000)
      approach_distance: 200     # metres — resume high accuracy when this close to next stop (default: 200)
```

## UX Flow

### States

The GPS subsystem operates in three modes:

1. **High accuracy** — `enableHighAccuracy: true`, `maximumAge: 30000`. Active when the user is moving and within `far_stop_distance` of the next stop. This is the current default.
2. **Far cruise** — `enableHighAccuracy: true`, `maximumAge: far_stop_max_age`. Active when the next stop is > `far_stop_distance` away and the user is moving. Reduces wake-ups while still tracking direction.
3. **Stationary low-power** — `enableHighAccuracy: false`, `maximumAge: 120000`. Active when the user has been within `stationary_radius` for > `stationary_timeout` seconds. Minimal battery use.

### Transitions

```
                    movement detected
  Stationary ──────────────────────────> High accuracy
  low-power  <────────────────────────── 
              stationary_timeout elapsed

  High accuracy ──── next stop > far_stop_distance ───> Far cruise
  Far cruise    ──── next stop < approach_distance ───> High accuracy
  Far cruise    ──── stationary_timeout elapsed ──────> Stationary low-power
```

### User-visible behaviour

- No UI for mode changes — transitions are silent
- If a mode change causes `watchPosition` to restart, the brief gap in position updates is acceptable
- The GPS dot on the map may jump slightly after resuming high accuracy; this is expected

## Functional Requirements

### FR-1: Stationary detection
- **Given** GPS positions are arriving
- **When** all positions in the last `stationary_timeout` seconds fall within `stationary_radius` of each other
- **Then** the system transitions to stationary low-power mode

### FR-2: Movement resume
- **Given** the system is in stationary low-power mode
- **When** a GPS position arrives that is > `stationary_radius` from the stationary anchor point
- **Then** the system transitions to high accuracy mode immediately

### FR-3: Far cruise activation
- **Given** the system is in high accuracy mode
- **When** the distance to the next stop exceeds `far_stop_distance`
- **Then** the system transitions to far cruise mode (increased `maximumAge`)

### FR-4: Approach resume
- **Given** the system is in far cruise mode
- **When** the distance to the next stop drops below `approach_distance`
- **Then** the system transitions to high accuracy mode

### FR-5: Watch restart on mode change
- **Given** the system needs to change GPS options
- **When** a mode transition occurs
- **Then** `clearWatch` is called and a new `watchPosition` is started with the updated options
- The new watch uses the options for the target mode

### FR-6: Defaults
- **Given** `tour.gps.battery_saver` is absent or partially defined
- **When** the system initialises
- **Then** missing fields use defaults: `stationary_timeout: 120`, `stationary_radius: 10`, `far_stop_distance: 500`, `far_stop_max_age: 60000`, `approach_distance: 200`

### FR-7: Battery saver disabled
- **Given** `tour.gps.battery_saver` is explicitly set to `false`
- **When** the system initialises
- **Then** GPS runs in high accuracy mode at all times (current behaviour)

### FR-8: Interaction with arrival detection (TOUR-031)
- **Given** battery saver is active and the system is in far cruise or stationary mode
- **When** a GPS update puts the user within `approach_distance` of the next stop
- **Then** the system resumes high accuracy before arrival detection evaluates the position

## Non-Functional Requirements

- Mode transitions happen inside `GpsTracker` — no external polling or timers beyond what `watchPosition` provides
- A simple timestamp + position buffer (last N positions) is sufficient for stationary detection; no large history needed
- No new dependencies
- Battery improvement is best-effort; actual savings depend on device and OS behaviour

## Out of Scope

- Displaying battery level or GPS mode to the user
- Allowing the user to manually toggle battery saver
- Suspending GPS entirely when the app is backgrounded (OS handles this)
- Power consumption benchmarking or guarantees

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| GPS permission revoked mid-tour | `GpsTracker` emits null; battery saver state resets on next `start()` |
| Device ignores `enableHighAccuracy: false` | No harm; just less battery saving than expected |
| `stationary_radius` set to 0 | Every micro-movement counts as stationary; effectively disables stationary detection. Loader warns if < 5 |
| Rapid mode oscillation (user near `far_stop_distance` boundary) | Hysteresis: require position to be 10% past threshold before transitioning back (e.g., must be < `far_stop_distance * 0.9` to leave far cruise) |
| `approach_distance` > `far_stop_distance` | Loader validation warns; `approach_distance` clamped to `far_stop_distance` |

## Acceptance Criteria

1. After standing still at a stop for > 2 minutes, `watchPosition` options show `enableHighAccuracy: false`
2. Moving away from the stationary position immediately restores high accuracy
3. When the next stop is > 500m away, `maximumAge` increases to 60000
4. When approaching within 200m of the next stop, `maximumAge` returns to 30000 and high accuracy resumes
5. Omitting `battery_saver` config leaves behaviour unchanged (always high accuracy)
6. Setting `battery_saver: false` explicitly disables all power management
7. Arrival detection (TOUR-031) still works correctly in all GPS modes

## Test Approach

- **Unit**: State machine transitions given mock position sequences; verify `watchPosition` options per mode; hysteresis boundary tests
- **Integration**: Mock `GpsTracker` cycling through stationary/moving/far/approaching sequences; verify mode changes fire in order
- **Manual**: Run tour on a phone with GPS logging; confirm reduced polling during stationary periods and long walks
