# TOUR-017 — Tour Start Screen + Completion Screen

**Branch**: `TOUR-017-start-complete-screens`
**Status**: Draft — awaiting Phil sign-off
**Depends on**: TOUR-016 (JourneyStateManager, journey states)

---

## What and Why

TOUR-016 introduces `tour_start` and `tour_complete` states but leaves their visual implementation as stubs. This ticket delivers the actual screens. These are the emotional bookends of the tour: the first thing a visitor sees (and must act on to begin) and the satisfying closing moment after they've walked every stop.

---

## Functional Requirements

### Tour Start Screen (`tour_start` state)

Shown when the tour loads fresh (no saved state) or when localStorage is empty.

**Displays:**
- Tour title (from `tour.title`)
- Optional subtitle / description (from `tour.description`)
- Stop count: "12 stops"
- Optional estimated walking duration (from new `tour.duration` YAML field — see schema section)
- Single CTA button: "Begin tour"
- On desktop: displayed in the content pane; on mobile: full-screen overlay on top of the map

**Behaviour:**
- "Begin tour" → `JourneyStateManager.transition('at_stop', 0)`
- Map is visible behind the mobile overlay (user can see the tour area while reading the intro)
- If the user has a saved state (mid-tour), skip this screen entirely and go straight to `at_stop` for their last stop

---

### Tour Completion Screen (`tour_complete` state)

Shown when the user taps Next on the final stop.

**Displays:**
- Completion heading: "Tour complete!"
- Count of stops visited vs total: "12 / 12 stops visited"
- A secondary action: "Review tour" (returns to `at_stop`, stop index 0)
- On mobile: full-screen overlay; on desktop: content pane panel

**Behaviour:**
- "Review tour" → `JourneyStateManager.transition('at_stop', 0)` → clears saved journey state
- No auto-redirect or timer
- The map remains visible and fully interactive behind the mobile overlay (all pins marked visited)

---

### YAML Schema Extension

Add optional `duration` field to the tour metadata block:

```yaml
tour:
  id: ett-2025
  title: Enniscorthy Tidy Towns 2025
  description: A guided tour of this year's projects.
  duration: "45–60 minutes"    # optional, free string
```

**Validation**: optional string field; no format enforcement; shown verbatim on the start screen.

---

## Non-Functional Requirements

- Start screen and completion screen are not blocking overlays in an inaccessible sense — keyboard focus is trapped within each screen while it is active (WCAG 2.4.3)
- Both screens are readable at 375px viewport width without horizontal scroll
- Start screen transition to `at_stop` (sheet rising) should feel connected — brief fade-out of overlay then sheet expands
- Neither screen requires GPS or connectivity

---

## Out of Scope

- Tour preview on the start screen (map auto-animating through stops) — could be a future enhancement
- Social sharing on the completion screen
- Rating or feedback on completion

---

## Failure Modes

| Scenario | Behaviour |
|---|---|
| `tour.duration` not set | Duration line simply omitted from start screen |
| `tour.description` not set | Description line omitted |
| User clears localStorage mid-tour | On next load, start screen is shown again |

---

## Acceptance Criteria

- Given a fresh load (no saved state), the start screen is shown before any stop content
- Given a returning visitor with a saved state, the start screen is skipped
- Given the start screen is shown, tapping "Begin tour" reveals stop 1 in `at_stop` state
- Given the user advances past the final stop, the completion screen appears
- Given the completion screen, tapping "Review tour" returns to stop 1 and clears the journey state
- Given `tour.duration` is set in YAML, it appears on the start screen
- Given `tour.duration` is absent, no duration line is shown (no empty placeholder)
- Given mobile viewport, both screens are full-screen overlays above the map
- Given desktop viewport, both screens render in the content pane
