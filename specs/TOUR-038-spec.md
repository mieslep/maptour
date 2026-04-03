# TOUR-038: Mobile Layout Rework - Full-Page Cards with Map Toggle

## Summary

Replace the mobile bottom-sheet-over-map layout with a content-first design: stop cards are full-page, and the map is accessed via a floating action button (FAB) that slides in a full-width map panel. Desktop layout is unchanged.

## Motivation

User feedback indicates the sliding bottom sheet is confusing. The sheet's three-position drag mechanic (expanded/peek/collapsed) is unintuitive, and the card fights the map for vertical space on small screens. By making cards full-page, content gets the room it needs. The map becomes a reference tool accessed on demand rather than an always-visible background.

## Functional Requirements

### FR-1: Full-page card view (mobile default)

**Given** the viewport width is < 768px
**When** the player loads or the user navigates to a stop
**Then** the stop card fills the full container height and width, with no bottom sheet handle, no peek/collapsed states, and no visible map behind it.

### FR-2: Floating title bar (mobile)

**Given** the viewport width is < 768px
**When** the player is active (any state: welcome, at_stop, tour_complete)
**Then** a floating title bar is visible at the top of the screen, containing the same widgets currently in the sheet header: prev/next arrows, stop label/toggle, and close (minimize) button.

**Given** the map panel is open
**When** the user views the map
**Then** the floating title bar remains visible on top of the map, providing persistent navigation context.

### FR-3: Map toggle FAB (mobile)

**Given** the viewport width is < 768px and the card view is active
**When** the user taps the map FAB (positioned bottom-right)
**Then** a full-width map panel slides in from the right, covering the card view entirely. The FAB remains visible with its icon and color state updated to indicate "close map / return to card".

**Given** the map panel is open
**When** the user taps the FAB
**Then** the map panel slides out to the right, revealing the card view beneath. The FAB returns to its "open map" state.

### FR-4: FAB visual states (accessibility)

**Given** the FAB exists in two states (card view / map view)
**When** the state changes
**Then** the FAB icon changes (e.g. map icon vs card/content icon) AND the FAB color changes to provide a secondary visual cue. Both states must meet WCAG 2.1 AA contrast requirements. The FAB has appropriate aria-label for each state (e.g. "Show map" / "Show stop").

### FR-5: Desktop layout unchanged

**Given** the viewport width is >= 768px
**When** the player renders
**Then** the existing side-by-side layout (map + card panel) renders as it does today. No FAB is shown. No floating title bar - the title bar widgets sit above the card panel only, in the same position as the current header row.

### FR-6: Map state preservation

**Given** the user opens the map, pans/zooms, then closes it
**When** they reopen the map
**Then** the map retains its last pan/zoom state (not reset to default bounds).

### FR-7: GPS in background

**Given** the map panel is closed (card view active)
**When** GPS is active
**Then** GPS tracking continues in the background. Proximity alerts still fire. The GPS dot updates its position so it is correct when the map is next opened.

### FR-8: In-transit state (mobile)

**Given** the tour is in `in_transit` state on mobile
**When** the transit bar shows
**Then** the transit bar renders over the card view (not over a collapsed sheet). The map FAB remains accessible. If the user opens the map during transit, the pulsing pin for the next stop is visible.

## Non-Functional Requirements

### NFR-1: Animation performance
Map panel slide animation must complete in <= 300ms. Use CSS transforms (translateX), not layout-triggering properties. No jank on mid-range mobile devices.

### NFR-2: Touch targets
FAB touch target minimum 48x48px (exceeds WCAG 44x44px minimum). Title bar buttons maintain existing 44x44px minimum.

### NFR-3: No layout shift
Toggling the map panel must not cause content reflow in the card view. The card view retains its scroll position when the map is closed.

### NFR-4: Bundle size
Net change to bundle size < 2KB gzipped (this is primarily a restructure, not new functionality).

## Out of Scope

- Redesigning the title bar contents (widgets move as-is; title bar redesign is a separate ticket)
- Welcome/goodbye card redesign (separate v1.3 ticket)
- Desktop layout changes
- Map interaction changes (markers, polylines, GPS dot behavior unchanged)
- Stop list overlay changes (the FAB overlay on mobile stays as-is)

## Failure Modes

- **Map panel fails to animate:** Fall back to instant show/hide (remove transition class). Card view must remain functional.
- **FAB obscures card content:** FAB position must not overlap with card CTAs (Next Stop, navigation buttons). If overlap detected on very short viewports, FAB moves up.
- **GPS permission prompt during map-closed state:** The browser permission dialog appears over the card view. Behavior unchanged from current - the prompt is browser-native and unaffected by the layout.

## Acceptance Criteria

1. On mobile (< 768px): card fills full container, no sheet handle visible, no map visible behind card
2. Floating title bar visible on mobile in all states (welcome, at_stop, tour_complete, map open)
3. Map FAB toggles full-width map panel with slide animation from right
4. FAB has distinct icon + color for each state, meeting AA contrast
5. FAB has correct aria-label for each state
6. Desktop layout identical to current behavior - no visual change
7. Map retains pan/zoom state across open/close cycles
8. GPS continues tracking when map is closed; proximity alerts still fire
9. Card scroll position preserved when map is toggled
10. Slide animation uses CSS transform, completes in <= 300ms
11. All existing unit tests pass (navigation, i18n, journey state unchanged)
12. Transit bar renders correctly over full-page card view
