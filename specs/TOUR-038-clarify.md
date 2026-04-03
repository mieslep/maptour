# TOUR-038: Clarifications

## Q1: BottomSheet on desktop
**Question:** The `BottomSheet` class currently serves double duty - draggable sheet on mobile, static side panel on desktop (via CSS media query overrides at 768px). Do we keep `BottomSheet` for desktop?

**Answer:** Yes. On desktop (>= 768px), the CSS already neutralizes all sheet behavior (`transform: none !important`, handle hidden, static positioning). The class continues to serve as the card container on desktop. On mobile, we stop using the drag/snap behavior and instead render the card directly as full-page content. The simplest approach: keep `BottomSheet` instantiation but lock it to `expanded` on mobile and remove the drag handle/behavior via CSS. Alternatively, bypass `BottomSheet` on mobile entirely and attach `sheetContentEl` directly. The latter is cleaner.

**Decision:** On mobile, skip `BottomSheet` - attach card content directly to the container. On desktop, keep `BottomSheet` as-is (it's already a static panel via CSS). This means `BottomSheet` drag logic is desktop-dead-code but harmless since CSS hides the handle.

## Q2: Two FABs on mobile
**Question:** The stop list overlay already has a FAB (top-right, z-index 20). Adding a map FAB (bottom-right) means two FABs. Any conflict?

**Answer:** No conflict. Stop list FAB is top-right, map FAB is bottom-right. Both are mobile-only (hidden on desktop). Different purposes, clear spatial separation.

## Q3: Transit bar positioning
**Question:** Currently the transit bar renders at the bottom of the screen when the sheet is collapsed. In the new layout there's no sheet collapse - how does the transit bar work?

**Answer:** Transit bar renders at the bottom of the card view, above the map FAB. It overlays the card content. When the user opens the map during transit, the transit bar stays visible (it's useful to see "Next: Stop 3 - The Fountain" while looking at the map). The transit bar's z-index needs to be below the floating title bar but above card content.

## Q4: Stop list on mobile
**Question:** Currently the stop list is inside the sheet (collapsed/expandable via toggle). In the new full-page card layout, where does it go?

**Answer:** Keep the stop list in the same position - between the title bar and the card content. The toggle still expands/collapses it. On mobile it defaults to collapsed (showing "STOP 2/5" label). The stop list overlay (FAB top-right) remains as the alternative full-list view. No change needed here.

## Q5: Minimize (X) button behavior
**Question:** Currently the X button collapses the sheet, showing the map with a thin sliver of sheet. In the new layout there's no collapse state. What does X do?

**Answer:** On mobile, the X button now toggles to the map view (same as the map FAB). This gives two ways to see the map: the FAB or the X button. Both are "show me the map" actions. The X button label/aria should update accordingly (from "minimize" to "show map").

## Q6: Floating title bar scope
**Question:** Is the floating title bar a new component or just the existing header row repositioned?

**Answer:** Repositioned. The existing `maptour-stop-list-header` div (containing arrows, stop label, and X button) gets styled as a floating bar on mobile via CSS. On desktop it stays where it is (above the card in the side panel). No new component needed - just CSS changes to make it `position: fixed` (or absolute within the container) on mobile.
