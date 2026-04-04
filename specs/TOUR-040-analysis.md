# TOUR-040 — Consistency Analysis

## Spec ↔ Plan

| Spec Requirement | Plan Coverage | Status |
|---|---|---|
| FR-1: Overview mode during tour_start | MapView.setOverviewMode() + orchestrator state | ✅ |
| FR-2: Directional chevrons | ChevronPlacer + MapView.renderChevrons() | ✅ |
| FR-3: Direction toggle | OverviewControls widget + MapView.setChevronDirection() | ✅ |
| FR-4: Pin-tap to select | MapView.setSelectedPin() + onPinClick wiring | ✅ |
| FR-5: Begin Tour button | OverviewControls CTA + orchestrator begin handler | ✅ |
| FR-6: GPS pre-selection | Orchestrator GPS handler during overview | ✅ |
| FR-7: Desktop overview | Same components, different placement | ✅ |

## Plan ↔ Tasks

| Plan Component | Task | Status |
|---|---|---|
| ChevronPlacer | Task 1 | ✅ |
| i18n keys | Task 1 | ✅ |
| MapView extensions | Task 2 | ✅ |
| Pin halo CSS | Task 2 | ✅ |
| OverviewControls | Task 3 | ✅ |
| Orchestrator wiring | Task 4 | ✅ |
| GPS pre-selection | Task 4 | ✅ |
| Integration tests | Task 5 | ✅ |

## Issues Found

### Issue 1: Pin number map and direction toggle
When the user toggles direction, pin numbers should reflect the new order (stop 1 becomes stop 16 in reverse). MapView already has `setPinNumberMap()` for this. Task 4 must build the mapping and call it on toggle.

**Resolution:** Covered in Task 4 orchestrator wiring — `onDirectionToggle` calls `setPinNumberMap()` with reversed mapping.

### Issue 2: Overview controls visibility on mobile when map is closed
On mobile, the OverviewControls live on the map panel. When the map panel is closed, the controls are hidden (inside the off-screen panel). The welcome card has its own "Begin Tour" button that starts from stop 0. If the user never opens the map, they miss the overview controls entirely.

**Resolution:** This is by design — the welcome card's "Begin Tour" is the simple path (start from stop 1, forward). The overview controls are the power-user path for choosing a different start. The get-started block on the welcome card prompts users to explore the map.

### Issue 3: OverviewControls reuse of ProgressBar
The spec mentions reusing the progress bar concept, but the OverviewControls widget should be self-contained (not reusing the actual ProgressBar instance which is used during the tour). The picker inside OverviewControls is visually similar but functionally different (cycles stops, not shows visited count).

**Resolution:** OverviewControls creates its own picker UI internally. Same visual style as ProgressBar but independent component.

### Issue 4: Chevron performance at high zoom
At high zoom levels, the fixed ~60m interval might produce too many visible chevrons. At low zoom, they might be too sparse.

**Resolution:** Consider adaptive interval based on zoom level, or use a fixed screen-pixel interval. Task 1 can start with a fixed distance; Task 2 can add zoom-responsive re-rendering if needed.

## Constitution Compliance

- **II. Responsive, Mobile-First:** Controls mobile-first (map panel), desktop adapts. ≥44px targets. ✅
- **III. Embeddability:** All classes `.maptour-*`. No globals. ✅
- **IV. Theming:** Uses `--maptour-*` custom properties. ✅
- **V. Accessibility:** ARIA labels, keyboard support, reduced-motion fallback. ✅
- **VIII. Localisation:** All text through `t()`. ✅
- **IX. Open Source:** No new dependencies. ✅

## Verdict

Spec, plan, and tasks are consistent. Four minor issues identified and resolved. Ready for implementation.
