# TOUR-039 — Consistency Analysis

## Spec ↔ Plan

| Spec Requirement | Plan Coverage | Status |
|---|---|---|
| FR-1: Menu bar with hamburger + custom header | MenuBar component, sanitiseHtml | ✅ |
| FR-2: Progress bar with arrows, visible at_stop/in_transit only | ProgressBar component, orchestrator show/hide | ✅ |
| FR-3: Getting Here card from YAML, link on welcome | StopCard.renderGettingHere(), welcome integration | ✅ |
| FR-4: Start Tour shows welcome with picker | Orchestrator menu handler, journey state transition | ✅ |
| FR-5: Tour Stops reuses existing components | StopListOverlay (mobile), inline list (desktop) | ✅ |
| FR-6: About card, hardcoded | StopCard.renderAbout() | ✅ |
| FR-7: header_html from YAML | MenuBar constructor, sanitiseHtml | ✅ |
| FR-8: Desktop alignment | Same components, different positioning | ✅ |

## Plan ↔ Tasks

| Plan Component | Task | Status |
|---|---|---|
| HeaderSanitiser | Task 1 | ✅ |
| Schema/types | Task 1 | ✅ |
| i18n keys | Task 1 | ✅ |
| MenuBar component | Task 2 | ✅ |
| ProgressBar component | Task 3 | ✅ |
| StopCard render methods | Task 4 | ✅ |
| Orchestrator wiring | Task 5 | ✅ |
| Integration tests | Task 6 | ✅ |

## Spec ↔ Tasks

| Acceptance Criterion | Task | Status |
|---|---|---|
| 1. Menu bar replaces stop-list-header | Task 5 | ✅ |
| 2. Hamburger with 4 items, Getting Here conditional | Task 2, Task 5 | ✅ |
| 3. Progress bar visible at_stop/in_transit only | Task 3, Task 5 | ✅ |
| 4. Progress reflects position, accounts for direction | Task 3, Task 5 | ✅ |
| 5. Getting Here renders from YAML | Task 4 | ✅ |
| 6. About card hardcoded | Task 4 | ✅ |
| 7. Start Tour shows welcome with picker | Task 5 | ✅ |
| 8. header_html renders sanitised | Task 1, Task 2 | ✅ |
| 9. Desktop matches mobile card experience | Task 5 | ✅ |
| 10. i18n keys registered | Task 1 | ✅ |
| 11. Zod schema updated | Task 1 | ✅ |
| 12. Unit tests | Tasks 1–4 | ✅ |
| 13. 44px touch targets | Task 2, Task 3 | ✅ |

## Issues Found

### Issue 1: StopListOverlay FAB visibility
The existing StopListOverlay has a floating action button (FAB) that sits at `top: 16px; right: 16px`. With the new menu bar occupying the top area, this FAB may overlap or conflict. 

**Resolution:** The FAB is currently hidden on mobile (`display: none` in CSS). On desktop it's also hidden. The overlay is opened programmatically from the menu, so the FAB is no longer needed. Task 5 should hide or remove the FAB since the menu replaces it as the entry point.

### Issue 2: Stop list inline toggle (desktop)
The current desktop stop list uses `stopListToggleBtn` which is being removed. Task 5 needs to ensure the "Tour Stops" menu action toggles the inline stop list on desktop without the old toggle button.

**Resolution:** The StopListOverlay's `open()` method works for mobile. For desktop, the orchestrator can toggle `stopListEl` visibility directly (same as current `setStopListOpen()` logic). This is covered in Task 5 scope.

### Issue 3: Map panel header position
The MapPanel header currently sits at `top: 52px` to clear the old title bar. With menu bar + progress bar, this offset changes.

**Resolution:** Task 5 adjusts the MapPanel header position. The offset should be dynamic based on whether the progress bar is visible (menu bar height + progress bar height when shown, menu bar height only when hidden).

## Constitution Compliance

- **II. Responsive, Mobile-First:** Menu bar + progress bar designed mobile-first, desktop adapts. Touch targets ≥44px. ✅
- **III. Embeddability:** New classes namespaced `.maptour-*`. No global styles. ✅
- **IV. Theming:** New elements use `--maptour-*` CSS custom properties. ✅
- **V. Accessibility:** ARIA roles on menu and progress bar. Keyboard support (Escape to close). ✅
- **VIII. Localisation:** All new text through `t()`. ✅
- **IX. Open Source:** No new dependencies. ✅

## Verdict

Spec, plan, and tasks are consistent. Three issues identified and resolved within existing task scope. Ready for implementation.
