# TOUR-037: Return to Start Option at Last Stop

## Summary

When the user reaches the last stop in the tour, give them a choice: return to the starting stop (with navigation directions) or finish the tour immediately. On return to start, show the goodbye card. The "Revisit" button on the goodbye card resets all state and returns to the welcome card.

## Current Behaviour

- Last stop shows "Finish Tour" button
- Clicking it transitions directly to `tour_complete` (goodbye card)
- Goodbye card has "Revisit tour" which clears state and returns to `tour_start`

## New Behaviour

### Last Stop Footer

Replace the single "Finish Tour" button with two options:

- **"Return to start"** (primary) - navigates back to the starting stop using stop 0's (or startIndex's) getting_here directions
- **"Finish here"** (secondary/text link) - goes straight to goodbye card (current behaviour)

### Return-to-Start Flow

1. User taps "Return to start" on last stop
2. If the starting stop has `getting_here.journey` content: show the journey card with directions from last stop back to start
3. User taps "I've arrived" (or GPS detects arrival)
4. Show the starting stop card briefly with a **"Finish Tour"** footer (not "Next: Stop 2")
5. User taps "Finish Tour" -> goodbye card

### State Machine

Add a new flag `returningToStart: boolean` to NavController (not a new JourneyState - we stay in `at_stop`).

When `returningToStart` is true and we're at the start stop:
- `getNextStop()` returns `undefined` (renders "Finish Tour" button)
- `isLastTourStop()` returns `true` (so `next()` calls `onNextFromLast`)

### Revisit (Reset)

No change needed - the existing "Revisit tour" on goodbye card already calls `journeyState.clearSaved()` and transitions to `tour_start`. The `returningToStart` flag resets when NavController is reconfigured via `setStartIndex()`.

### GPS

Proximity detection for the starting stop should still work during return - the ProximityDetector already monitors all stops.

## Files Changed

- `src/card/StopCard.ts` - New `renderLastStop()` method with two-button footer
- `src/navigation/NavController.ts` - `returningToStart` flag, modified `onNextFromLast` flow
- `src/index.ts` - Wire up the return-to-start option in `onNextFromLast` callback
- `src/i18n.ts` - New strings: `return_to_start`, `finish_here`

## i18n Strings

- `return_to_start`: "Return to start"
- `finish_here`: "Finish here"
