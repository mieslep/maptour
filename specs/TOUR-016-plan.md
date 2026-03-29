# TOUR-016 — Architecture Plan: Mobile Bottom Sheet + Journey State

**Branch**: `TOUR-016-mobile-bottom-sheet`
**Spec**: `specs/TOUR-016-spec.md`
**Status**: Draft — awaiting Phil sign-off

---

## Summary

Introduce a `JourneyStateManager` to own the four-state machine, a `BottomSheet` component for mobile, and rework the CSS layout so the map is always the base layer on mobile. Desktop layout is unchanged. `NavController` delegates state transitions to `JourneyStateManager`.

---

## New Modules

### `src/journey/JourneyStateManager.ts`

Owns the state machine. Single source of truth for `JourneyState`.

```typescript
type JourneyState = 'tour_start' | 'at_stop' | 'in_transit' | 'tour_complete';

class JourneyStateManager {
  private state: JourneyState;
  private activeStopIndex: number;

  constructor(stopCount: number, storage: Storage | null)
  getState(): JourneyState
  getActiveStopIndex(): number
  transition(to: JourneyState, stopIndex?: number): void  // fires callbacks
  onStateChange(cb: (state: JourneyState, stopIndex: number) => void): void
  persist(): void       // writes to localStorage
  restore(): boolean    // reads from localStorage; returns false if nothing saved
}
```

Persistence key: `maptour-journey-{tourId}` → `{ state: 'at_stop', stopIndex: 2 }`

On restore: `in_transit` and `tour_start` are normalised to `at_stop`.

---

### `src/layout/BottomSheet.ts`

Mobile-only UI component. Manages the draggable sheet DOM element.

```typescript
type SheetPosition = 'expanded' | 'peek' | 'collapsed';

class BottomSheet {
  constructor(container: HTMLElement, contentEl: HTMLElement)
  setPosition(pos: SheetPosition, animate?: boolean): void
  onDragEnd(cb: (pos: SheetPosition) => void): void
  destroy(): void
}
```

**Sheet heights** (CSS custom properties, overridable):
- `expanded`: `75vh`
- `peek`: `30vh`
- `collapsed`: `80px` (bottom bar only)

Drag uses `pointerdown` / `pointermove` / `pointerup` (unified touch + mouse).
Snap points: release within 20px of a snap point locks to it; otherwise momentum determines direction.
Transition: `transform: translateY(...)` on the sheet element — GPU composited, no reflow.

---

### `src/layout/TourStartScreen.ts`

Renders the `tour_start` overlay. Props: tour title, stop count, optional duration.
Single "Begin tour" button fires a callback → `JourneyStateManager.transition('at_stop', 0)`.

---

### `src/layout/TourCompleteScreen.ts`

Renders the `tour_complete` overlay. Props: visited count, total stops.
"Review tour" button fires callback → `JourneyStateManager.transition('at_stop', 0)`.

---

### `src/layout/InTransitBar.ts`

The collapsed 80px bar shown during `in_transit`. Shows next stop title + "I'm here" button.
"I'm here" → `JourneyStateManager.transition('at_stop', nextStopIndex)`.

---

### `src/layout/StopListOverlay.ts`

Stop list rendered as a full-screen modal overlay (mobile). Triggered by a FAB on the map.
Tapping a stop → closes overlay + `JourneyStateManager.transition('at_stop', index)`.
Reuses the existing stop list rendering logic from `NavController.renderStopList()` (extract to a shared helper).

---

## Modified Modules

### `src/navigation/NavController.ts`

- Inject `JourneyStateManager` via constructor
- `goTo(index)` calls `journeyState.transition('at_stop', index)` instead of managing state directly
- `next()` on final stop triggers `journeyState.transition('tour_complete')`
- Remove direct DOM manipulation for state (delegate to layout components)

### `src/index.ts`

- Instantiate `JourneyStateManager` before `NavController`
- Wire `onStateChange` callback: update `BottomSheet` position, swap overlays, update map pin pulse
- Instantiate `TourStartScreen`, `TourCompleteScreen`, `InTransitBar`, `BottomSheet`
- Pass `JourneyStateManager` to `NavController`

### `src/map/MapView.ts`

- Add `setPulsingPin(stopId: string | null)`: animates the next-stop pin during `in_transit`
- No other changes needed

---

## CSS Changes (`styles/maptour.css`)

Mobile layout refactor (< 768px):

```css
/* Container is the positioning root — integrator sets its height */
.maptour-container {
  position: relative;
  width: 100%;
  height: 100%;        /* integrator must give this div a height, e.g. height: 100vh */
  overflow: hidden;
}

/* Map fills the container as base layer */
.maptour-map-pane {
  position: absolute;  /* relative to .maptour-container, not the viewport */
  inset: 0;
  z-index: 0;
}

/* Sheet overlays the map, also relative to container */
.maptour-sheet {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  z-index: 10;
  border-radius: 16px 16px 0 0;
  background: var(--maptour-surface);
  transform: translateY(calc(100% - 75%));  /* expanded default — 75% of container height */
  transition: transform 200ms ease-out;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .maptour-sheet { transition: none; }
}
```

**Embeddability**: using `position: absolute` (not `fixed`) keeps everything inside the container div. The host site controls the container's height. If the host has a 60px nav bar, the integrator sets `height: calc(100vh - 60px)` on the container. If the tour is full-page, `height: 100vh`. The integration guide documents this.

This follows the same contract Leaflet itself uses — it requires a container div with an explicit height.

Desktop (≥ 768px): `.maptour-map-pane` reverts to `position: sticky; height: 100vh` (existing behaviour); `.maptour-sheet` not rendered.

---

## Data Flow

```
User taps "Take me there"
  → NavButton fires callback
  → JourneyStateManager.transition('in_transit')
  → onStateChange fires
    → BottomSheet.setPosition('collapsed')
    → InTransitBar.show(nextStop)
    → MapView.setPulsingPin(nextStop.id)
    → nav app deep-link opens (handled by NavButton, unchanged)

User taps "I'm here"
  → InTransitBar fires callback
  → JourneyStateManager.transition('at_stop', nextIndex)
  → onStateChange fires
    → NavController.goTo(nextIndex)
    → BottomSheet.setPosition('expanded')
    → InTransitBar.hide()
    → MapView.setPulsingPin(null)
```

---

## No Architecture Changes Required

This feature adds new modules and modifies existing ones but does not:
- Change the public API (`MapTour.init()`)
- Change the YAML data model
- Add new dependencies
- Change the build pipeline

The system architecture (`speckit.plan`) requires one amendment: add `src/journey/` and `src/layout/` to the module decomposition diagram. No approval gate needed for additive module additions — confirmed with Phil.

---

## Risk Notes

| Risk | Mitigation |
|---|---|
| `position: fixed` inside embedded `<div>` breaks if host site uses `transform` on an ancestor | Document this known limitation; fixed positioning in transformed ancestors is a known browser quirk. The integration guide will note it. |
| Bottom sheet drag conflicts with map pan gestures | Sheet drag only activates on the sheet element itself; map pan events on the map element are unaffected |
| Sheet transition causes paint jank on low-end phones | Use `transform` only (GPU layer); avoid triggering layout during drag |
