# TOUR-022 — Consistency Analysis

## Spec ↔ Constitution
- **Static-first**: ✅ No backend. Journey content is in the YAML.
- **YAML-driven**: ✅ Extends existing `getting_here` with optional `journey` array.
- **Themeable**: ✅ Content blocks use existing CSS custom properties.
- **Accessibility**: ✅ Journey card uses same card container with ARIA attributes. "I've arrived" button is focusable.

## Spec ↔ System Architecture
- **Module structure**: ✅ No new modules. Extends NavController and StopCard.
- **State machine**: ✅ Journey is NOT a new state — it's transient UI within the `at_stop` flow. JourneyStateManager is unchanged.
- **Content block renderers**: ✅ Reused directly.
- **localStorage**: ✅ Journey state is not persisted. On reload, restores to origin stop.
- **Performance**: ✅ No new dependencies, no network calls.

## Spec ↔ Plan ↔ Tasks
- FR-1 (journey display) → Tasks 2, 3, 4
- FR-2 (arrived navigation) → Task 3
- FR-3 (skip journey) → Task 3
- FR-4 (no journey content) → Task 3 (unchanged behaviour)
- FR-5 (map highlighting) → Deferred to polish (not required for MVP)
- FR-6 (prev from journey) → Task 3
- Validation → Task 1
- Demo/testing → Task 5

## Cross-Feature Consistency
- **TOUR-020 (welcome/goodbye)**: No conflict. Welcome/goodbye are at tour boundaries. Journey cards are between stops.
- **TOUR-021 (flexible start)**: No conflict. Flexible start affects which stop to begin at. Journey cards trigger on Next regardless of starting position.
- **Merge order**: TOUR-020 → TOUR-021 → TOUR-022. Each is independent enough to implement in parallel, but TourStartScreen changes in TOUR-020 and TOUR-021 should merge first to avoid conflicts.

## Design Decision: Why Not a New State?

Adding a `journey` state to JourneyStateManager was considered and rejected:
1. **Persistence complexity**: What if user reloads mid-journey? Restoring to an intermediate state between two stops is awkward — better to snap back to the origin stop.
2. **State machine bloat**: The current four-state machine (`tour_start`, `at_stop`, `in_transit`, `tour_complete`) is clean. Adding `journey` creates additional transition edges.
3. **Transient nature**: Journeys are short (a few minutes of walking). They don't need the same persistence guarantees as stops.

Transient UI state in NavController is simpler and sufficient.

## Verdict
No blockers. Recommend implementing after TOUR-020 and TOUR-021.
