# TOUR-016 — Consistency Analysis

**Date**: 2026-03-29

---

## Spec ↔ Plan

✅ All four states and transitions in spec are reflected in plan
✅ localStorage persistence key matches spec requirement
✅ Desktop unchanged — confirmed in both spec and plan
✅ No new dependencies added — consistent with Static-First constitution requirement
✅ Touch target and a11y requirements in spec are covered by task acceptance criteria

---

## Container Positioning — Resolved

**Original concern**: `position: fixed` would escape the container div, breaking embedded use cases where the host site has a nav bar or other chrome.

**Resolution (applied to plan)**: Use `position: absolute` for both `.maptour-map-pane` and `.maptour-sheet`, relative to `.maptour-container` which becomes `position: relative; overflow: hidden`. The host site controls the container's height — e.g. `height: calc(100vh - 60px)` to leave room for a nav bar.

This follows the same contract as Leaflet (requires a container div with explicit height). Integration guide must document this requirement. Phil confirmed the primary use case is a dedicated tour page on ennistidytowns.ie, linked from the site nav, which may auto-hide — so `height: 100vh` or close to it is appropriate for that deployment.

---

## Gap: `duration` field in TourStartScreen

**Spec says**: start screen shows "estimated duration (if provided in YAML)". The current YAML data model has no `duration` field at the tour level.

**Resolution**: TOUR-017 (which owns the start screen implementation) should add optional `tour.duration` (string, e.g. "45 minutes") to the YAML schema and validation. Flag for TOUR-017 spec.

---

## Dependency Ordering

TOUR-016 introduces `JourneyStateManager`. TOUR-017 (start/complete screens) and TOUR-018 ("Take me there" mode hints) both depend on TOUR-016. Implementation sequence: 016 → 017, 018 (017 and 018 can run in parallel after 016).
