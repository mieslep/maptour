# TOUR-038: Consistency Analysis

## Spec vs Constitution

| Constitution Principle | Compliance | Notes |
|----------------------|------------|-------|
| II. Responsive, Mobile-First | **Updated** | Constitution says "bottom sheet above map" on mobile. This feature changes that to full-page cards + map toggle. Constitution Section II will need amendment after implementation. |
| II. Cards not modals | Compliant | Cards remain cards, now full-page instead of in-sheet. |
| II. Circular tour | Compliant | No change to tour flow logic. |
| III. Embeddability | Compliant | All new CSS under `.maptour-*` namespace. No global style changes. |
| IV. Theming | Compliant | FAB uses existing CSS custom properties. New FAB active state uses `--maptour-primary`. |
| V. Accessibility | Compliant | FAB has aria-labels, AA contrast, 48px touch target. Title bar maintains keyboard nav. |
| VI. Offline Resilience | Compliant | No network changes. |
| VIII. i18n | Compliant | New labels go through `t()`. |

**Action required:** After implementation, amend Constitution Section II to describe the new mobile layout (full-page cards, map toggle FAB, floating title bar) instead of "draggable bottom sheet."

## Spec vs Plan

| Spec Requirement | Plan Coverage | Status |
|-----------------|---------------|--------|
| FR-1: Full-page card | Card view div, full container | Covered |
| FR-2: Floating title bar | Existing header row, CSS repositioned | Covered |
| FR-3: Map toggle FAB | MapPanel component | Covered |
| FR-4: FAB visual states | Icon swap, color class, aria-label | Covered |
| FR-5: Desktop unchanged | Conditional path in orchestrator | Covered |
| FR-6: Map state preservation | Map pane stays alive, invalidateSize on open | Covered |
| FR-7: GPS background | No change to GpsTracker lifecycle | Covered |
| FR-8: Transit bar | Renders over card view, z-index correct | Covered |
| NFR-1: Animation 300ms | CSS transition 300ms ease-out | Covered |
| NFR-2: Touch targets 48px | FAB 48x48, title bar 44x44 | Covered |
| NFR-3: No layout shift | Card stays in DOM behind panel | Covered |
| NFR-4: Bundle < 2KB | MapPanel is ~50 lines, minimal CSS | Covered |

No gaps found.

## Plan vs Tasks

| Plan Element | Task | Status |
|-------------|------|--------|
| MapPanel component | Task 1 | Covered |
| CSS rework | Task 2 | Covered |
| Orchestrator wiring | Task 3 | Covered |
| i18n labels | Task 4 | Covered |
| Integration tests | Task 5 | Covered |
| Constitution amendment | Post-implementation | Noted above |

No gaps found.

## Cross-feature Concerns

- **TOUR-022 (journey cards):** Journey cards render inside the card view. No impact - they're already part of the card flow.
- **TOUR-020/021 (welcome/goodbye cards):** Render full-page instead of in-sheet. Improvement - more room for welcome content and stop picker.
- **Stop list overlay:** z-index 30 overlay stays above the floating title bar (z-index 15). No conflict.
- **GPS proximity detection:** Fires regardless of map visibility. No impact.

## Risks Confirmed

1. **Leaflet invalidateSize timing** - Plan addresses via transitionend callback. Task 3 wires it.
2. **Resize across breakpoint** - Plan notes console warning; full layout switch requires reload. Acceptable trade-off for v1.3.
3. **BottomSheet dead code on mobile** - Class is still imported but not instantiated on mobile. Tree-shaking won't help (it's conditionally used). Acceptable; BottomSheet is ~180 lines. Could clean up later if bundle size becomes a concern.

## Verdict

Spec, plan, and tasks are internally consistent. One post-implementation action: amend Constitution Section II.
