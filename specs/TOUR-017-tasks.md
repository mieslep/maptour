# TOUR-017 — Task List: Tour Start + Completion Screens

**Branch**: `TOUR-017-start-complete-screens`
**Plan**: `specs/TOUR-017-plan.md`
**Status**: Draft

---

## Task 1 — YAML schema: add `tour.duration`

**Scope**: Add `duration?: string` to `Tour` interface in `src/types.ts`. Update `src/loader.ts` to read and pass through the field. Update validation: field is optional; no format check.

**Acceptance**:
- Unit test: tour YAML with `duration` set parses correctly
- Unit test: tour YAML without `duration` parses correctly, field is `undefined`
- Existing tour fixtures continue to pass validation

**Dependencies**: none
**Files**: `src/types.ts`, `src/loader.ts`, `tests/unit/loader.test.ts`

---

## Task 2 — TourStartScreen component

**Scope**: Implement `src/layout/TourStartScreen.ts`. Full-screen mobile overlay / desktop inline panel. Title, description, meta line (stops + optional duration), "Begin tour" CTA.

**Acceptance**:
- Renders correctly at 375px (mobile overlay) and 768px+ (inline panel)
- "Begin tour" fires `onBegin` callback
- Duration line absent when `tour.duration` is undefined
- Focus lands on "Begin tour" button on mount
- CTA meets 44×44px touch target minimum

**Dependencies**: Task 1
**Files**: `src/layout/TourStartScreen.ts`, `styles/maptour.css`

---

## Task 3 — TourCompleteScreen component

**Scope**: Implement `src/layout/TourCompleteScreen.ts`. Full-screen mobile overlay / desktop inline panel. Completion heading, visited/total count, "Review tour" CTA.

**Acceptance**:
- Renders correctly at 375px and 768px+
- "Review tour" fires `onReview` callback
- Visited count shown correctly (e.g. "11 / 12 stops visited" if one was skipped)
- Focus lands on "Review tour" button on mount
- Checkmark icon is CSS-drawn (no emoji, no external asset)

**Dependencies**: Task 1
**Files**: `src/layout/TourCompleteScreen.ts`, `styles/maptour.css`

---

## Task 4 — Wire into index.ts + JourneyStateManager

**Scope**: Connect both screens to `JourneyStateManager.onStateChange`. Mount/unmount based on state. Pass correct props from loaded tour and breadcrumb.

**Acceptance**:
- E2E: fresh load → start screen shown; "Begin tour" → stop 1 card visible
- E2E: returning visitor (localStorage has saved state) → start screen skipped
- E2E: advance past last stop → completion screen shown
- E2E: "Review tour" → stop 1 card visible; saved journey state cleared

**Dependencies**: Tasks 2, 3 (and TOUR-016 JourneyStateManager)
**Files**: `src/index.ts`, `tests/e2e/journey.spec.ts`
