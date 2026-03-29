# TOUR-018 — Consistency Analysis

**Date**: 2026-03-29

---

## Spec ↔ Plan

✅ All four modes in spec are covered in plan's `buildDeepLink`, `APPS_BY_MODE`, `BUTTON_LABELS`
✅ Mode resolution chain (stop > tour > default) consistent across spec and plan
✅ Waze filtering logic matches spec table
✅ Saved-preference-incompatible case handled in plan as specified
✅ Backwards compatibility: confirmed in both spec and plan

---

## Cross-Feature: TOUR-016 in_transit trigger

TOUR-016's `in_transit` transition is triggered when the user taps "Take me there" (NavButton fires callback → JourneyStateManager). TOUR-018 changes the NavButton constructor signature (adds `tourNavMode` param) — no conflict. The callback mechanism is unchanged.

TOUR-018 can be implemented and tested independently of TOUR-016 (the mode changes are self-contained). Dependency is soft: TOUR-018 should be implemented on top of TOUR-016 to avoid merge conflicts in `NavButton.ts` and `index.ts`, but the logic is independent.

---

## Gap: demo tour.yaml needs updating

The `demo/tour.yaml` (and any fixture YAML files in `tests/`) do not have `nav_mode`. This is fine — the field is optional — but the demo tour should be updated to demonstrate the feature with at least one driving leg and `tour.nav_mode: walk`. Flag for Task 5 to include demo YAML update.

---

## No Architecture Changes Required

All changes are within existing modules. `speckit.plan` module decomposition does not need updating (no new files). `LegMode` extension is a backwards-compatible type widening.
