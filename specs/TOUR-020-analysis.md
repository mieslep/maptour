# TOUR-020 — Consistency Analysis

## Spec ↔ Constitution
- **Static-first**: ✅ No backend. Welcome/goodbye content is in the YAML, rendered client-side.
- **YAML-driven**: ✅ New optional fields follow existing YAML patterns.
- **Themeable**: ✅ Content blocks already use CSS custom properties.
- **Accessibility**: ✅ Content blocks already have ARIA attributes. Start/complete screens already have dialog roles.

## Spec ↔ System Architecture
- **Module structure**: ✅ No new modules. Extends existing TourStartScreen and TourCompleteScreen.
- **Content block renderers**: ✅ Reused directly. No new rendering code.
- **Performance**: ✅ No new dependencies, no additional network requests. Content is already in the parsed YAML.
- **Bundle size**: ✅ Negligible — a few lines of DOM creation in two existing files.

## Spec ↔ Plan ↔ Tasks
- All spec requirements mapped to tasks: ✅
- FR-1 → Task 2 (welcome on start screen)
- FR-2 → Task 2 (absent case)
- FR-3 → Task 3 (goodbye on complete screen)
- FR-4 → No code change needed (Finish Tour already navigates to close_url or collapses sheet)
- FR-5 → Task 3 (absent case)
- Validation → Task 1
- Demo update → Task 4

## Cross-Feature Consistency
- **TOUR-021 (flexible start)**: No conflict. Welcome renders before stop selection. If TOUR-021 changes the start screen, welcome content stays above the stop picker.
- **TOUR-022 (journey cards)**: No conflict. Journey cards are between stops; welcome/goodbye are at tour boundaries.

## Noted Inconsistency (pre-existing)
- `speckit.specify` still references `leg_to_next` but codebase uses `getting_here`. This should be updated during the next `speckit-iterate` pass but does not block TOUR-020.

## Verdict
No blockers. Spec, plan, and tasks are consistent. Ready for Phil review.
