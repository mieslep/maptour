# TOUR-029 — Reverse Tour Direction

## Summary

Allow the user to walk the tour in reverse order (last stop to first). This affects stop sequencing, navigation button meaning, journey card content sourcing, and the welcome card picker direction.

## Motivation

Some users arrive at the far end of a tour — e.g. they're already near stop 16 and want to walk back to stop 1. Currently they must manually skip to the last stop and use Prev for the entire tour, losing journey cards and correct getting_here guidance. A reverse mode lets the tour work naturally in the opposite direction.

## UX Flow

### Activating reverse mode
1. On the welcome card, a toggle or button allows the user to select "Reverse direction" (or similar).
2. The stop order flips: the picker shows stop 16 first, then 15, 14, etc.
3. Tapping "Start" begins at the last stop (now renumbered as stop 1 of the reversed tour).

### Navigation in reverse mode
- "Next" advances from stop 16 → 15 → 14 → ... → 1 (in original numbering).
- "Prev" goes back toward stop 16.
- The header shows "STOP 1 / 16", "STOP 2 / 16", etc. based on the reversed sequence position, not the original stop number.

### Journey cards in reverse mode
- In forward mode, journey content comes from the **destination** stop's `getting_here.journey` (stop N+1's journey describes the route from N to N+1).
- In reverse mode, the user is travelling from stop N+1 to stop N. The relevant journey content is now the **origin** stop's `getting_here.journey` (stop N+1's journey, which describes this same route segment — just traversed in reverse).
- The `getting_here.note` follows the same sourcing logic: use the note from the stop whose `getting_here` describes the route segment being traversed.

### Example
Forward: Stop 3 → Stop 4. Journey content comes from Stop 4's `getting_here.journey`.
Reverse: Stop 4 → Stop 3. Journey content still comes from Stop 4's `getting_here.journey` (it describes the segment between 3 and 4).

## Functional Requirements

### FR-1: Reverse toggle on welcome card
- **Given** the welcome card is displayed
- **When** the user activates the reverse toggle
- **Then** the stop picker order reverses (last stop shown first)

### FR-2: Reversed stop sequencing
- **Given** reverse mode is active
- **When** the user starts the tour
- **Then** the first stop card is the original last stop and "Next" progresses toward the original first stop

### FR-3: Header numbering
- **Given** reverse mode is active
- **When** a stop card is displayed
- **Then** the header shows the position in the reversed sequence (e.g. "STOP 1 / 16" for the original stop 16)

### FR-4: Journey content sourcing in reverse
- **Given** reverse mode is active and the user moves from original stop N+1 to original stop N
- **When** original stop N+1 has `getting_here.journey` content
- **Then** the journey card displays that content (since it describes the route segment between N and N+1)

### FR-5: getting_here note sourcing in reverse
- **Given** reverse mode is active
- **When** a stop card is displayed
- **Then** the `getting_here.note` shown is from the stop whose `getting_here` describes the route segment just traversed (the next-higher original stop number)

### FR-6: Journey card absent in reverse
- **Given** reverse mode is active and the user moves from original stop N+1 to original stop N
- **When** original stop N+1 has no `getting_here.journey`
- **Then** advance directly to original stop N's card (no journey card)

### FR-7: Prev/Next consistency
- **Given** reverse mode is active
- **When** the user taps Prev
- **Then** navigation goes back toward the tour start (which is the original last stop in reverse mode)

### FR-8: Pin order on map
- **Given** reverse mode is active
- **When** the map is visible
- **Then** pin numbers reflect the reversed sequence (original stop 16 shows as pin 1)

## Non-Functional Requirements

- Reverse mode is a UI-level reordering — the YAML data and stop array are not mutated
- No new YAML schema changes — reverse is a player feature, not a content feature
- Reverse state can be stored in memory only (lost on refresh) or optionally in URL params
- No new dependencies

## Out of Scope

- Author-defined reverse routes (different getting_here content for the reverse direction)
- Partial reversal (reversing a subset of stops)
- Persisting reverse mode across sessions
- Alternate route geometry for reverse direction

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| Tour has only one stop | Reverse toggle hidden or disabled |
| Stop 1 has `getting_here` content (first in forward, last in reverse) | In reverse, this journey plays before the user reaches stop 1 (the final reversed stop) |
| No stops have journey content | Reverse works normally — just stop cards in reversed order |
| User toggles reverse mid-tour | Not supported — toggle only available on welcome card |

## Acceptance Criteria

1. Welcome card has a reverse direction control
2. Activating reverse flips the stop picker order
3. Starting the tour begins at the original last stop
4. "Next" progresses from original-last toward original-first
5. Header shows reversed position numbering
6. Journey cards source content correctly for the reversed route segment
7. Map pin numbers reflect reversed order
8. Forward mode is completely unaffected (no regression)

## Test Approach

- **Unit**: Stop sequence reversal logic; journey content sourcing for reversed direction; header numbering
- **Integration**: Full forward tour, then full reversed tour — verify stop order, journey cards, and navigation
- **Manual**: Walk-test reversed tour on mobile with a multi-stop demo tour containing journey content
