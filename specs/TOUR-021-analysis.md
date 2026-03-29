# TOUR-021 — Consistency Analysis

## Spec ↔ Constitution
- **Static-first**: ✅ No backend. GPS is client-side Geolocation API.
- **YAML-driven**: ✅ No YAML changes. Stop coords already in YAML.
- **Themeable**: ✅ New UI elements use existing CSS custom properties.
- **Accessibility**: ✅ Pin click handlers have existing ARIA labels. Arrow navigation via header bar.

## Spec ↔ System Architecture
- **Module structure**: ✅ One new utility file (`nearestStop.ts`). No new modules.
- **MapView**: ✅ Adding `onPinClick()` is a natural extension — Leaflet markers natively support click events.
- **GpsTracker**: ✅ Already provides position. No changes needed.
- **Performance**: ✅ Haversine on 6-100 stops is sub-millisecond. No network calls.

## Spec ↔ Plan ↔ Tasks
- FR-1 (pin selection) → Tasks 2, 3, 4
- FR-2 (arrow cycling) → Tasks 3, 4
- FR-3 (GPS nearest) → Tasks 1, 4
- FR-4 (GPS unavailable) → Task 4 (fallback to stop 0)
- FR-5 (start at selected) → Task 4
- FR-6 (returning user) → Task 3 (CTA label)

## Cross-Feature Consistency
- **TOUR-020 (welcome/goodbye)**: Compatible. Welcome content renders above the stop preview in the start screen. Both modify TourStartScreen but in separate areas (welcome = content blocks above CTA; TOUR-021 = stop preview between meta and CTA).
- **TOUR-022 (journey cards)**: Compatible. Journey cards are between stops during transit. Start point selection doesn't affect journey card rendering.
- **Merge order**: TOUR-020 should merge first (simpler, no overlapping TourStartScreen methods). TOUR-021 then extends TourStartScreen further.

## Risks Identified
1. **Pointer-events layering on mobile**: Medium risk. Start screen overlay must pass touches through to the map. Tested approach: `pointer-events: none` on overlay, `pointer-events: auto` on body. May need refinement during Task 5.
2. **GPS timing race**: Low risk. Position may arrive after start screen renders. `setSelectedStop()` handles late updates.

## Verdict
No blockers. Recommend merging TOUR-020 before implementing TOUR-021 to avoid TourStartScreen conflicts.
