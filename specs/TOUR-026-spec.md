# TOUR-026 — Hide getting_here Note After Journey Card

## Summary

If a stop has `getting_here.journey` content and the user has just viewed the journey card (tapped "I've arrived"), hide the `getting_here.note` text on the stop card. The note is redundant because the user already received the route guidance during the journey. If the user navigated directly (skipped the journey or used Prev), the note should still show.

## Motivation

The `getting_here.note` (e.g. "Walk down Castle Hill to the river, ~6 min") is useful when the user lands on a stop card cold. But if they just walked through a journey card that contained the same route information plus richer content, repeating the note at the top of the stop card is noise. Hiding it makes the stop card cleaner after a journey.

## UX Flow

1. User is on stop N, taps "Next".
2. Journey card for stop N+1 appears (because `getting_here.journey` exists).
3. User taps "I've arrived".
4. Stop N+1 card renders **without** the `getting_here.note` at the top.
5. If the user later navigates away and comes back to stop N+1 via Prev, the note reappears (because they didn't just complete the journey).

## Functional Requirements

### FR-1: Hide note after journey completion
- **Given** the user has just viewed the journey card for stop N+1 and tapped "I've arrived"
- **When** stop N+1's card renders
- **Then** the `getting_here.note` is hidden

### FR-2: Show note on direct navigation
- **Given** the user navigates to stop N+1 by tapping Next (no journey) or using Prev/pin
- **When** stop N+1's card renders
- **Then** the `getting_here.note` is displayed as normal

### FR-3: Show note when no journey content exists
- **Given** a stop has `getting_here.note` but no `getting_here.journey`
- **When** the stop card renders (regardless of how the user arrived)
- **Then** the `getting_here.note` is displayed as normal

### FR-4: State does not persist across sessions
- **Given** the user refreshes the page or reloads the tour
- **When** they navigate to stop N+1
- **Then** the `getting_here.note` is displayed (journey-completed state is reset)

## Non-Functional Requirements

- The hide/show decision is a UI-only state flag — no changes to the YAML schema or data model
- No new dependencies
- The note element should be hidden (not removed from DOM) so it can reappear on re-navigation

## Out of Scope

- Hiding other parts of the getting_here block (mode icon, nav button)
- Persisting journey-completed state to localStorage
- Auto-hiding the note based on GPS proximity

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| Stop has journey but no note | No visible change (nothing to hide) |
| User skips journey via Next arrow | Note is shown (journey was not completed) |
| User taps Prev then Next again through the journey | Note is hidden again (journey was re-completed) |

## Acceptance Criteria

1. After completing a journey card, the destination stop card does not show the `getting_here.note`
2. Navigating to the same stop via Prev shows the note
3. Stops without journey content always show the note
4. Page refresh resets the state — note is visible again

## Test Approach

- **Unit**: Card renderer respects the journey-completed flag; flag is set on "I've arrived" and cleared on Prev
- **Integration**: Next → journey → "I've arrived" → stop card has no note; Prev → same stop card has note
- **Manual**: Visual check with demo tour — confirm note presence/absence matches navigation path
