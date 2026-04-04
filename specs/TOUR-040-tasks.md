# TOUR-040 — Task Breakdown

## Task 1: ChevronPlacer and i18n keys

**Scope:** Pure function for calculating chevron positions along polylines. Add all new i18n keys.

**Files:**
- `src/map/chevrons.ts` — `placeChevrons(path, reversed)` function
- `src/i18n.ts` — add keys: `begin_from`, `toggle_direction`, `stop_n_of_total`

**ChevronPlacer logic:**
- Walk polyline path accumulating distance (haversine between consecutive points)
- At each interval (~60m), emit `{ lat, lng, angle }` where angle is the bearing of the segment
- If `reversed`, add 180° to all angles
- Skip intervals shorter than 30m to avoid clustering at bends
- Return array of placement objects

**Acceptance:**
- Unit tests: straight line produces evenly spaced chevrons; reversed flips angles by 180°; short segments skipped; empty path returns empty array
- i18n keys registered with defaults

**Dependencies:** None

---

## Task 2: MapView overview extensions

**Scope:** Add overview mode methods to MapView: chevron rendering, selected-pin halo, mode toggle.

**Files:**
- `src/map/MapView.ts` — new methods
- `src/map/layers.ts` — new `createChevronIcon(angle)` function, new `maptour-pin--selected` support in `createPinIcon`
- `styles/maptour.css` — `.maptour-chevron`, `.maptour-pin--selected` (pulsing halo animation)

**New MapView methods:**
```typescript
setOverviewMode(enabled: boolean): void
setChevronDirection(reversed: boolean): void
setSelectedPin(stopId: number | null): void
```

**Chevron rendering:**
- `renderChevrons()`: for each polyline segment, call `placeChevrons()`, create `L.marker` with `L.divIcon` chevron at each position, `interactive: false`, add to a `L.layerGroup`
- `clearChevrons()`: remove layer group from map
- Chevron icon: small rotated `›` character or FA icon, semi-transparent, 14px

**Selected pin:**
- New `selectedStopId` state on MapView
- `createPinIcon()` gets new `selected` option → applies `maptour-pin--selected` class
- CSS: pulsing halo animation via `box-shadow` or `::after` pseudo-element with scale animation

**Acceptance:**
- Chevrons appear on polylines in overview mode
- Chevrons disappear when overview mode disabled
- Direction toggle reverses chevron angles
- Selected pin shows pulsing halo
- `prefers-reduced-motion` disables halo animation
- Unit tests for setOverviewMode, setSelectedPin state management

**Dependencies:** Task 1

---

## Task 3: OverviewControls widget

**Scope:** New component: stop picker bar + direction toggle + Begin Tour CTA.

**Files:**
- `src/layout/OverviewControls.ts` — OverviewControls class
- `styles/maptour.css` — `.maptour-overview-controls`, `.maptour-overview-controls__picker`, `.maptour-overview-controls__direction`, `.maptour-overview-controls__cta`

**API:**
```typescript
class OverviewControls {
  constructor()
  update(selectedIndex: number, totalStops: number, reversed: boolean, stopName: string): void
  onStopSelect(cb: (index: number) => void): void
  onDirectionToggle(cb: (reversed: boolean) => void): void
  onBegin(cb: (index: number, reversed: boolean) => void): void
  show(): void
  hide(): void
  getElement(): HTMLElement
}
```

**Layout:**
```
┌─────────────────────────────────────────┐
│ [◀] ════════●═══════════ [▶]    [↻]    │
│                                         │
│       [ Begin Tour from Trinity ]       │
└─────────────────────────────────────────┘
```

- Top row: flex with picker (arrows + track) and direction toggle
- Bottom row: full-width CTA button
- Picker track shows selected position as filled ratio
- CTA text updates via `t('begin_from', { stop: stopName })`
- Direction toggle: circular button with `fa-rotate` icon
- Hidden by default; shown during overview

**Acceptance:**
- Arrows cycle through stops (0 to N-1, wrapping disabled)
- Direction toggle fires callback with new reversed state
- Begin button fires with current index and reversed
- CTA text updates on `update()`
- Unit tests for all interactions and state

**Dependencies:** Task 1 (i18n keys)

---

## Task 4: Orchestrator wiring

**Scope:** Wire overview mode into `index.ts`. Place OverviewControls on map panel (mobile) or welcome card (desktop). Manage state sync between map pins and controls.

**Files:**
- `src/index.ts` — overview state management, control placement, event wiring
- `styles/maptour.css` — positioning for controls on map panel and welcome card

**Changes:**

**Overview state:**
- Track `overviewSelectedIndex` (default 0) and `overviewReversed` (default false)
- On `tour_start` entry: enable overview mode on MapView, show OverviewControls
- On state exit (any other state): disable overview mode, hide OverviewControls

**Control placement:**
- Mobile: append `overviewControls.getElement()` to the map panel container, positioned at bottom
- Desktop: append to the welcome card area (after the CTA button, or replace it)

**Event wiring:**
- `overviewControls.onStopSelect(index)` → `mapView.setSelectedPin(stops[index].id)`, `mapView.flyToStop(stops[index])`, update controls
- `overviewControls.onDirectionToggle(reversed)` → `mapView.setChevronDirection(reversed)`, `mapView.setPinNumberMap(...)`, update controls
- `overviewControls.onBegin(index, reversed)` → set `tourStartIndex`, set reversed on NavController, close map panel (mobile), transition to `at_stop`
- `mapView.onPinClick(index)` during overview → update `overviewSelectedIndex`, `mapView.setSelectedPin(...)`, `overviewControls.update(...)`

**Welcome card CTA sync (desktop):**
- The existing "Begin Tour" button on the welcome card uses the overview selection (index + direction) if the user has interacted with it, otherwise defaults to stop 0 forward

**GPS pre-selection:**
- On `tour_start` entry with GPS available: wait for accurate position, find nearest stop, update overview selection (once per entry)

**Acceptance:**
- Overview mode activates on `tour_start`, deactivates on all other states
- Pin tap on overview map updates controls
- Arrow cycling updates map (flyToStop, selected pin)
- Direction toggle updates chevrons and pin numbers
- Begin Tour starts from correct stop and direction
- GPS pre-selects nearest stop
- Mobile: controls on map panel; desktop: controls on welcome card
- All existing tests pass

**Dependencies:** Tasks 1–3

---

## Task 5: Integration testing

**Scope:** End-to-end verification of the full overview flow.

**Tests:**
- Overview mode activates on tour_start, deactivates on at_stop
- Chevrons visible in overview, hidden during tour
- Pin tap selects starting stop, updates controls
- Arrow cycling through stops updates map and controls
- Direction toggle reverses chevrons and pin numbers
- Begin Tour from stop 5 reversed: tour starts correctly
- GPS pre-selection updates overview when accurate
- Desktop: controls on welcome card sync with map
- Mobile: controls on map panel, Begin Tour closes panel
- Returning to tour_start via "Tour Overview" menu restores overview

**Dependencies:** Task 4

**Acceptance:** All new tests pass. All existing 200+ tests pass.
