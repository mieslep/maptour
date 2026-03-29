# TOUR-017 — Consistency Analysis

**Date**: 2026-03-29

---

## Spec ↔ Plan

✅ Both screens described in spec are reflected in plan with matching DOM structure
✅ `tour.duration` optional field addressed in both spec (YAML schema section) and plan (types.ts + loader.ts)
✅ Desktop vs mobile rendering difference (overlay vs inline) covered in both
✅ Focus management on mount addressed in plan, reflected in task acceptance criteria

---

## Dependency on TOUR-016

✅ TOUR-017 correctly depends on `JourneyStateManager` from TOUR-016
✅ `TourStartScreen` and `TourCompleteScreen` were stub-created in TOUR-016 plan — TOUR-017 fills them in, no duplication
✅ Task 4 wiring explicitly states dependency on TOUR-016

---

## Cross-Feature Gap: Visited Count on Completion Screen

**Observation**: Completion screen shows "N / total stops visited". The visited count comes from `Breadcrumb.getVisited().size`. However, `Breadcrumb` currently marks a stop as visited when the user *leaves* it (navigates away). On the final stop, the user doesn't navigate away — they tap Next into `tour_complete`.

**Resolution**: `NavController.next()` should call `breadcrumb.markVisited(currentStop)` before transitioning to `tour_complete`, just as it does before `goTo(nextIndex)`. This is a one-line fix in TOUR-016 Task 7 (NavController wiring) — flag for inclusion there.

---

## No Architecture Changes Required

TOUR-017 is entirely additive and consistent with the system architecture. No amendment to `speckit.plan` needed.
