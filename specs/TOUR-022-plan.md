# TOUR-022 — Architecture Plan

## Approach

Journey cards are an intermediate state between stops. Rather than adding a new journey state to the state machine (which would complicate persistence and restore), journey cards are handled within the `at_stop` flow — NavController detects journey content on the next stop and inserts a journey card before transitioning.

## Key Design Decision: Journey as a Card, Not a State

A journey card is visually rendered in the same card container as stop content. It's not a separate journey state in `JourneyStateManager`. This means:
- No new localStorage persistence for "in journey" state
- On page reload during a journey, we restore to the origin stop (safe fallback)
- The journey card is a transient UI state managed by NavController

## Data Model Changes

### types.ts
Extend `Leg` to include optional journey content:
```typescript
export interface Leg {
  mode: LegMode;
  note?: string;
  journey?: ContentBlock[];  // new
}
```

### loader.ts
Validate `getting_here.journey` as an optional content block array.

## Component Changes

### NavController.ts
- `next()` method: before advancing to the next stop, check if the destination has `getting_here.journey` content
- If journey content exists, render a journey card instead of the stop card
- Track `inJourney: boolean` and `journeyDestIndex: number` as transient state
- `arrivedFromJourney()`: advance from journey to the destination stop
- Prev during journey: return to origin stop, clear journey state

### StopCard.ts
- New method `renderJourney(gettingHere: Leg, destinationStop: Stop)`: renders journey content in the card container
- Reuses the getting_here note at top, journey content blocks in the middle, "I've arrived" button at bottom
- Accepts an `onArrived` callback for the footer button

### index.ts
- Update header bar label: "EN ROUTE" when in journey, "STOP N / M" when at stop
- NavController callbacks may need a new `onJourneyStart` and `onJourneyEnd` to update the header

### MapView.ts
- Optional: highlight the active polyline segment during a journey (thicker line or different opacity)
- Not strictly required for MVP — can be a polish task

## CSS Changes

### maptour.css
- `.maptour-card__arrived-btn` — "I've arrived" button styling (similar to next-btn but distinct colour, perhaps accent green)
- Journey card reuses all existing card styles

## Files Modified

| File | Change |
|------|--------|
| `src/types.ts` | Add `journey?: ContentBlock[]` to `Leg` |
| `src/loader.ts` | Validate journey content blocks |
| `src/navigation/NavController.ts` | Journey interception in `next()`, transient state |
| `src/card/StopCard.ts` | `renderJourney()` method |
| `src/index.ts` | Header label updates for journey state |
| `styles/maptour.css` | Arrived button, minor tweaks |
| `demo/tour.yaml` | Add journey content to at least one stop |
| `tests/unit/loader.test.ts` | Journey validation tests |

## Risks

- **NavController complexity**: Adding journey interception to `next()` increases the method's branching. Keep it simple: check → render journey → wait for arrived/skip. No nested journeys.
- **State persistence**: Journey state is NOT persisted. On reload, user returns to the origin stop. This is acceptable — journeys are short and transient.
- **Content reuse**: Journey uses the same block renderers as stops. If any renderer has card-specific assumptions (unlikely — they just return `HTMLElement`), it would break. Low risk.

## Consistency Check

- No conflict with constitution (YAML-driven, static-first)
- No conflict with system architecture (extends existing modules)
- Compatible with TOUR-020: welcome/goodbye are at tour boundaries, journeys are between stops
- Compatible with TOUR-021: flexible start doesn't affect journey rendering (journeys trigger on Next regardless of where the tour started)
- Merge order: TOUR-020 → TOUR-021 → TOUR-022 (each builds on the previous)
