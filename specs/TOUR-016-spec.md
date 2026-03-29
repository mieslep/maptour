# TOUR-016 — Mobile Bottom Sheet Layout + Journey State

**Branch**: `TOUR-016-mobile-bottom-sheet`
**Status**: Draft — awaiting Phil sign-off

---

## What and Why

The current mobile layout stacks the map (50vh) above the content pane (stop list + card). On a phone this wastes screen space on the map when the user is reading a stop, and buries stop content below two scrollable regions. The desktop side-by-side layout is unaffected.

This ticket introduces a **journey state machine** and a **mobile bottom sheet** to make the phone experience match how users actually use the tour: map when navigating, stop content when arrived.

---

## Functional Requirements

### Journey State Machine

The player has four named states:

| State | Meaning |
|---|---|
| `tour_start` | Tour just loaded; user hasn't begun |
| `at_stop` | User is reading a stop |
| `in_transit` | User has left a stop and is heading to the next |
| `tour_complete` | User has advanced past the final stop |

**Transitions:**

- `tour_start` → `at_stop`: user taps "Begin tour" on start screen → jumps to stop 1
- `at_stop` → `in_transit`: user taps "Take me there" → nav app opens; sheet collapses
- `in_transit` → `at_stop`: user taps "I'm here" in bottom bar, or taps any stop on the map, or uses prev/next
- `at_stop` → `at_stop`: user taps prev/next or a stop in the list
- `at_stop` → `tour_complete`: user taps Next on the final stop
- `tour_complete` → `at_stop`: user taps "Review tour" on completion screen → returns to stop 1

**Persistence**: active stop index and journey state stored in `localStorage`. On re-open, resume `at_stop` for the last active stop (never resume `in_transit` or `tour_start` — both reset to `at_stop`).

---

### Mobile Layout (< 768px)

**`at_stop` state:**
- Map fills the full viewport height as a base layer
- Bottom sheet slides up, covering ~75% of screen height
- Sheet contains: stop header (badge + title), content blocks, "Take me there" button, prev/next nav
- Sheet has a drag handle at the top; user can pull it down to ~30% to reveal more map (peek mode), or pull up to 95% for more content
- GPS dot remains active on the map behind the sheet

**`in_transit` state:**
- Sheet collapses to a minimal persistent bottom bar (~80px)
- Bar shows: "Stop N: [title]" and an "I'm here" button
- Map fills the screen — user can see their GPS dot and the next stop pin
- Next stop pin pulses to indicate destination

**`tour_start` state:**
- Full-screen overlay on top of the map
- Shows: tour title, stop count, estimated duration (if provided in YAML)
- Single CTA: "Begin tour"

**`tour_complete` state:**
- Full-screen overlay
- Shows: "Tour complete", stops visited count, a "Review tour" link
- No automatic reset

---

### Desktop Layout (≥ 768px)

No bottom sheet. Side-by-side layout unchanged.

Journey state still applies to content:
- `tour_start`: start overlay appears in the content pane (right side)
- `at_stop`: stop card shown as normal
- `in_transit`: content pane shows a minimal "En route to Stop N" banner with stop detail below it; map focuses on next stop pin
- `tour_complete`: completion panel appears in the content pane

---

### Stop List Access (Mobile)

The stop list is not a tab. It is accessible via a floating action button (list icon) on the map, which opens the list as a modal overlay. Tapping a stop closes the overlay and transitions to `at_stop` for that stop.

---

## Non-Functional Requirements

- Sheet open/close and drag transitions: CSS transitions ≤ 200ms, `ease-out`
- No layout shift on state transition
- All interactive elements in the sheet: minimum 44×44px touch target
- Sheet drag: responds to `touchmove` / `pointermove`; momentum on release
- Keyboard: ESC collapses sheet to peek mode on mobile
- Reduced motion: transitions disabled if `prefers-reduced-motion: reduce`

---

## Out of Scope

- GPS proximity arrival detection (auto-transition to `at_stop`) — backlogged
- Animated tour progress arc / step indicator — may follow in a later ticket
- Swipe gestures on the map to navigate between stops

---

## Failure Modes

| Scenario | Behaviour |
|---|---|
| localStorage unavailable | Journey state held in memory; re-open starts from `tour_start` |
| Corrupted journey state in localStorage | Reset to `at_stop`, stop index 0 |
| User closes app while `in_transit` | Re-open restores to `at_stop` for last active stop |
| Tour has only one stop | No "Take me there"; `tour_complete` is reached via Next from stop 1 |

---

## Acceptance Criteria

- Given mobile viewport (<768px), the map fills the screen and the stop card is a bottom sheet when `at_stop`
- Given the user taps "Take me there", the sheet collapses to the bottom bar and the nav app opens
- Given the user taps "I'm here" in the bottom bar, the sheet re-expands with the next stop's content
- Given the user reopens the tour after closing mid-tour, they resume on the last active stop in `at_stop` state
- Given the user is on desktop (≥768px), the side-by-side layout is unchanged
- Given the user reaches the final stop and taps Next, the completion overlay appears
- Given `prefers-reduced-motion`, all sheet animations are suppressed
