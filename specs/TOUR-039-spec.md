# TOUR-039 — Menu Bar, Progress Bar, and System Cards

## Summary

Replace the current stop-list-header (arrows + "All Stops" toggle) with a menu bar + progress bar system. The menu bar contains a hamburger menu and a customisable header area for tour author branding. The progress bar appears below the menu bar during active tour navigation, showing a visual progress indicator flanked by prev/next arrows.

The hamburger menu contains four items:
- **Getting Here** — a new card with tour-level directions (parking, transit, landmarks)
- **Start Tour** — returns to the welcome card (with resume handling if mid-tour)
- **Tour Stops** — the existing stop list
- **About** — a hardcoded MapTour branding card

Two new "system cards" are introduced: Getting Here and About. These render in the same card area as stop cards but are not part of the tour stop sequence.

## Functional Requirements

### FR-1: Menu Bar

**Given** the tour player loads on any device,
**When** the layout renders,
**Then** a menu bar appears at the top containing:
- Left: a hamburger icon button (☰) that opens the menu
- Right: a customisable area that renders `tour.header_html` if provided, otherwise empty

**Given** the menu is closed,
**When** the user taps the hamburger icon,
**Then** a dropdown menu appears below the hamburger showing four items: Getting Here, Start Tour, Tour Stops, About.

**Given** the menu is open,
**When** the user taps an item or taps outside the menu,
**Then** the menu closes and the selected action is performed.

### FR-2: Progress Bar

**Given** the journey state is `at_stop` or `in_transit`,
**When** the card view is displayed,
**Then** a progress bar appears below the menu bar with:
- Left: prev arrow (◀)
- Centre: a visual progress indicator showing position within the tour
- Right: next arrow (▶)

**Given** the journey state is `tour_start` or `tour_complete`,
**When** the card view is displayed,
**Then** the progress bar is hidden.

**Given** the user is at stop 3 of 8,
**When** the progress bar renders,
**Then** the indicator shows approximately 3/8 completion (visual only, no text required).

**Given** the user taps prev/next arrows on the progress bar,
**When** they are at a valid stop,
**Then** navigation behaves identically to current arrow behaviour (advances through stops, respects tour direction).

### FR-3: Getting Here Card

**Given** the tour YAML contains a `tour.getting_here` field with content blocks,
**When** the user selects "Getting Here" from the menu,
**Then** a card renders in the card area showing the getting_here content blocks (text, image, gallery, etc.).

**Given** the tour YAML does not contain `tour.getting_here`,
**When** the menu renders,
**Then** the "Getting Here" item is hidden from the menu.

**Given** the welcome card is displayed,
**When** `tour.getting_here` content exists,
**Then** a link or button on the welcome card allows navigating to the Getting Here card.

**Given** the user is viewing the Getting Here card,
**When** they close or dismiss it,
**Then** the view returns to the welcome card (the default card when not in an active tour).

### FR-4: Start Tour (Menu Item)

**Given** the user taps "Start Tour" from the menu (regardless of current state),
**When** the menu closes,
**Then** the welcome card is displayed with the stop picker pre-set to the current stop (if mid-tour) or stop 1 (if not started or completed). No modal — the user can pick a different stop or tap "Begin" to resume/start from the shown stop.

### FR-5: Tour Stops (Menu Item)

**Given** the user taps "Tour Stops" from the menu,
**When** the menu closes,
**Then** the stop list is displayed (existing stop list overlay behaviour on mobile, inline on desktop).

### FR-6: About Card

**Given** the user taps "About" from the menu,
**When** the menu closes,
**Then** a card renders showing MapTour branding information:
- "Powered by MapTour" heading
- Brief description of the project
- Link to the MapTour repository

This content is hardcoded in the player, not sourced from YAML.

### FR-7: Custom Header Content

**Given** the tour YAML contains `tour.header_html` with an HTML string,
**When** the menu bar renders,
**Then** the HTML is rendered in the right portion of the menu bar (e.g. a logo, sponsor text, community name).

**Given** `tour.header_html` is not provided,
**When** the menu bar renders,
**Then** the right portion is empty (no placeholder).

### FR-8: Desktop Alignment

**Given** the viewport is ≥768px (desktop),
**When** the layout renders,
**Then** the card panel (right side) uses the same menu bar, progress bar, and card rendering as mobile. The map remains on the left in the existing side-by-side layout.

## Non-Functional Requirements

- Menu open/close animation completes within 300ms
- Touch targets for menu items, arrows, and hamburger are ≥44x44px
- All new UI text goes through `t()` for i18n
- New YAML fields validated via Zod schema
- Progress bar is purely visual (no text) — accessible label provided via aria attributes
- Custom header HTML sanitised via strict allowlist (`div`, `img`, `span`, text only)
- Menu and progress bar must not interfere with map panel (mobile) or map pane (desktop)

## Out of Scope

- Animated progress bar transitions between stops (simple position update is sufficient)
- Tour author customisation of menu items or ordering
- Analytics or telemetry for menu usage
- "Getting Here" content in the tour editor (can be added later)
- Explicit scroll indicator YAML option (`tour.scroll_hint`) — separate backlog item

## Failure Modes

- **`tour.header_html` contains unsafe tags:** Sanitised via strict allowlist (`div`, `img`, `span`, text nodes only). All other tags and attributes stripped before rendering.
- **`tour.getting_here` is empty or malformed:** Menu item hidden. Validation error surfaced via Zod schema if structurally invalid.
- **Menu open during map panel transition:** Menu should close before map panel opens. Only one overlay visible at a time.

## Acceptance Criteria

1. Menu bar replaces the current stop-list-header on both mobile and desktop
2. Hamburger opens a menu with four items (Getting Here conditional on YAML content)
3. Progress bar with prev/next arrows visible during `at_stop` and `in_transit` states only
4. Progress indicator accurately reflects position within tour (accounts for tour direction)
5. Getting Here card renders content blocks from `tour.getting_here` YAML field
6. About card shows hardcoded MapTour branding
7. Start Tour shows welcome card with picker pre-set to current stop (or stop 1)
8. Custom header HTML renders from `tour.header_html`
9. Desktop card panel matches mobile card experience (menu bar + progress bar)
10. All new strings registered in i18n with defaults
11. Zod schema updated for new YAML fields
12. Unit tests for menu state, progress calculation, and Start Tour modal logic
13. 44x44px minimum touch targets on all interactive elements
