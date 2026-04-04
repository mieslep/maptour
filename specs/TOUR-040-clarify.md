# TOUR-040 — Clarifications

## Resolved

### Q1: Welcome flow
**Decision:** User starts on welcome card. On mobile, opens map via FAB to see overview. On desktop, overview map is always visible alongside welcome card.

### Q2: Overview vs tour map
**Decision:** Two modes, same MapView instance. Overview adds chevrons, pulsing halo on selected pin. Tour mode removes overlays.

### Q3: Chevron implementation (Q6)
**Decision:** Custom lightweight markers placed at intervals along polylines. No new dependency. Full control over styling and rotation.

### Q4: Overview control bar placement
**Decision:** The control bar (`[◀ ═══●═══ ▶] [↻] [Begin Tour]`) appears:
- **Mobile:** At the bottom of the map panel (overlay on the map, like transit bar)
- **Desktop:** At the bottom of the welcome card

Same widget component, different parent depending on viewport. Pin taps on the map update the control bar's selected stop.

### Q5: Direction toggle style
**Decision:** Simple button with directional icon (no "1→16" text). Chevrons on the map make the current direction clear; the button just flips it.

### Q6: Selected pin visual
**Decision:** Pulsing halo/ring around the selected starting pin. Distinct from the "next stop" pulse used during tour and the "active" state.

### Q7: Begin Tour button
**Decision:** Part of the control bar. "Begin Tour from [stop name]" CTA. On mobile, tapping it closes the map panel and starts the tour. On desktop, starts the tour directly.

### Q8: Desktop overview
**Decision:** Map pane on left shows overview (chevrons, pin selection, pulsing halo). Welcome card on right has the control bar at the bottom. Pin tap on map syncs with the card's control bar.

### Q9: Progress bar in control bar
**Decision:** Reuse the ProgressBar component (or a similar one) in the control bar. Arrows cycle through stops as potential starting points. Fill shows position in the stop sequence. This replaces the old picker arrows that were removed in TOUR-039.

### Q10: GPS nearest-stop
**Decision:** Re-introduce GPS pre-selection on the overview map. When GPS is available and accurate, pre-select the nearest stop (updates both pin halo and control bar).

### Q11: Welcome card "Begin Tour" CTA
**Decision:** The existing "Begin Tour" button on the welcome card (added in TOUR-039) starts from stop 1 forward by default. If the user has interacted with the overview controls (on desktop), it reflects their selection. On mobile, the primary "Begin Tour" path is via the map panel's control bar.
