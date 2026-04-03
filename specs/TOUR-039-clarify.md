# TOUR-039 — Clarifications

## Resolved

### Q1: "Start Tour" behaviour when mid-tour
**Decision:** No modal. Show the welcome card with stop picker pre-set to current stop. User can pick a different stop or begin from the shown one.

### Q2: Getting Here card dismissal
**Decision:** Closing the Getting Here card returns to the welcome card. Welcome is the default card whenever the user is not actively on a tour stop.

### Q3: Menu style
**Decision:** Dropdown from the hamburger, not a slide-in panel.

### Q4: Desktop alignment
**Decision:** Card panel gets the same menu bar + progress bar. Map pane on left is unchanged.

### Q5: System cards and journey state
**Decision:** Leave journey state unchanged. Hide the progress bar when viewing a system card. System cards are an overlay on the current state, not a state transition.

### Q6: Tour Stops menu item behaviour
**Decision:** Reuse existing components — opens StopListOverlay on mobile, toggles inline list on desktop. Submenu-style experience, not a new card.

### Q7: Getting Here card — close mechanism
**Decision:** Both — a back button on the card for discoverability, plus any menu navigation naturally replaces it.

### Q8: Progress bar — circular tour handling
**Decision:** Progress shows stops visited out of total. The tour ends on the last stop in sequence; users won't circle back to revisit earlier stops. Simple linear progress is sufficient.

### Q9: header_html security
**Decision:** Strict allowlist — only `div`, `img`, `span`, and text nodes. Strip everything else. Tour files may be shared publicly so we sanitise defensively.
