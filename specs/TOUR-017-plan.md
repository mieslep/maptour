# TOUR-017 — Architecture Plan: Tour Start + Completion Screens

**Branch**: `TOUR-017-start-complete-screens`
**Spec**: `specs/TOUR-017-spec.md`
**Status**: Draft — awaiting Phil sign-off

---

## Summary

Two new layout components (`TourStartScreen`, `TourCompleteScreen`) stub-created in TOUR-016 are fully implemented here. A minor YAML schema extension adds `tour.duration`. No new dependencies; no architecture changes beyond what TOUR-016 introduces.

---

## Modified Modules

### `src/types.ts`

Add `duration?: string` to the `Tour` interface:

```typescript
export interface Tour {
  id: string;
  title: string;
  description?: string;
  duration?: string;       // new — optional, e.g. "45–60 minutes"
  stops: Stop[];
}
```

### `src/loader.ts`

Update YAML parsing to read and pass through `tour.duration`. No breaking change — field is optional; existing tours without it continue to work.

---

## New Modules

### `src/layout/TourStartScreen.ts`

Renders into its container element. Props passed from `index.ts`:
- `title: string`
- `description?: string`
- `duration?: string`
- `stopCount: number`
- `onBegin: () => void`

DOM structure:
```
.maptour-start
  .maptour-start__body
    .maptour-start__title
    .maptour-start__description   (if set)
    .maptour-start__meta          "12 stops · 45–60 minutes" (or "12 stops" if no duration)
    button.maptour-start__cta     "Begin tour"
```

Mounted as a fixed overlay on mobile; rendered inline in content pane on desktop (controlled by CSS class).

Focus management: on mount, focus the "Begin tour" button. No focus trap needed (there's only one interactive element).

---

### `src/layout/TourCompleteScreen.ts`

Props:
- `visitedCount: number`
- `totalStops: number`
- `onReview: () => void`

DOM structure:
```
.maptour-complete
  .maptour-complete__body
    .maptour-complete__icon       "✓" (CSS-drawn checkmark, not emoji)
    .maptour-complete__heading    "Tour complete!"
    .maptour-complete__count      "12 / 12 stops visited"
    button.maptour-complete__review  "Review tour"
```

On mount, focus the "Review tour" button.

---

## CSS Changes (`styles/maptour.css`)

Mobile overlay pattern (shared by both screens):
```css
.maptour-start,
.maptour-complete {
  position: fixed;
  inset: 0;
  z-index: 20;              /* above sheet (z-index: 10) */
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.6);  /* map visible behind */
  padding: 24px;
}

.maptour-start__body,
.maptour-complete__body {
  background: var(--maptour-surface);
  border-radius: var(--maptour-radius);
  padding: 32px 24px;
  max-width: 400px;
  width: 100%;
  text-align: center;
}
```

Desktop: overlays become inline blocks inside the content pane (CSS class toggle or `@media` query removes `position: fixed`).

---

## index.ts Wiring

`index.ts` reads `tour.duration` and `tour.description` from the loaded tour, passes to `TourStartScreen`. On `JourneyStateManager` `onStateChange`:
- `tour_start` → mount `TourStartScreen`
- `tour_complete` → mount `TourCompleteScreen` (pass `breadcrumb.getVisited().size` and `tour.stops.length`)
- any other state → unmount both screens

---

## No Architecture Changes Required

This ticket is entirely additive. It fills in stubs introduced by TOUR-016. No changes to public API, YAML loader schema validation rules (only type definition), or build pipeline.

One minor YAML validation update: `tour.duration` added as an optional string to the schema definition in `src/loader.ts` (or `src/schema.ts` if extracted there by TOUR-016).
