# TOUR-022 — Journey Cards Between Stops

## Summary

Add optional `journey` content between stops — guided commentary for the route from one stop to the next. Journey cards provide narrative text, images, or points of interest that the user encounters while walking/driving between stops.

## Motivation

The transition between stops is currently a blank experience. The user clicks "Next →", sees the new stop's card, and either opens their nav app or walks. But the route itself can be interesting — the tour author might want to say "as you cross the bridge, look upstream for the medieval mill ruins" or show a photo of the view from a particular point along the route.

## YAML Schema

Journey content is defined on the destination stop's `getting_here` block, which already describes the route:

```yaml
stops:
  - id: 2
    title: River Slaney Cleanup & Wildflower Bank
    getting_here:
      mode: walk
      note: "Walk down Castle Hill to the river, ~6 min"
      journey:
        - type: text
          body: |
            As you walk down Castle Hill, look to your left for the
            original town wall foundations — they date to the 13th century.
        - type: image
          url: https://example.com/town-wall.jpg
          caption: "Medieval town wall foundations along Castle Hill"
    coords: [52.50290, -6.55650]
    content:
      - type: text
        body: ...
```

`journey` is an optional array of content blocks within `getting_here`. Same `ContentBlock` types as stop content.

## UX Flow

### Viewing a journey
1. User is on stop N card and taps "Next →"
2. **If** the next stop (N+1) has `getting_here.journey` content:
   - A journey card slides in, showing the journey content
   - The header bar updates to "EN ROUTE" or "Between stops"
   - The map shows the polyline between stops N and N+1 highlighted
   - A "Continue" or "Arrived" button at the bottom advances to stop N+1's card
3. **If** no journey content: advance directly to stop N+1 (current behaviour)

### Journey card layout
```
[‹] [›] EN ROUTE             [▼] [✕]
───────────────────────────────────────
🚶 Walk down Castle Hill, ~6 min [📍]

As you walk down Castle Hill, look
to your left for the original town
wall foundations...

[image of town wall]

───────────────────────────────────────
          [I've arrived →]
───────────────────────────────────────
```

The journey card reuses the same card container and layout as a stop card, but:
- Header shows "EN ROUTE" instead of "STOP N / M"
- Getting here note is at the top (same as stop cards)
- Content blocks are the journey content (not stop content)
- Footer has "I've arrived" button instead of "Next: [stop name]"
- No stop title (the journey is about the route, not a destination)

## Functional Requirements

### FR-1: Journey card display
- **Given** the next stop has `getting_here.journey` content
- **When** the user taps "Next →" on the current stop
- **Then** a journey card renders in the card area with the journey content
- The header bar shows "EN ROUTE" instead of a stop number
- The getting_here note appears at the top

### FR-2: Journey card navigation
- **Given** a journey card is displayed
- **When** the user taps "I've arrived"
- **Then** the card transitions to the destination stop's card
- The journey card is replaced by the stop card

### FR-3: Skip journey
- **Given** a journey card is displayed
- **When** the user taps the Next arrow in the header bar
- **Then** the journey is skipped and the destination stop card loads directly

### FR-4: No journey content
- **Given** the next stop does NOT have `getting_here.journey`
- **When** the user taps "Next →"
- **Then** behaviour is unchanged (advance directly to stop card)

### FR-5: Journey card with map
- **Given** a journey card is displayed
- **When** the map is visible
- **Then** the polyline segment between the two stops is visually highlighted
- Both pins (origin and destination) are visible

### FR-6: Prev from journey
- **Given** a journey card is displayed
- **When** the user taps the Prev arrow
- **Then** return to the previous stop's card (not to a "previous journey")

## Non-Functional Requirements

- Journey content blocks use existing renderers (zero new rendering code for content types)
- No new dependencies
- Journey cards do not count as "stops" — visited count and stop numbering are unaffected
- Performance: no measurable impact (content already parsed from YAML)

## Out of Scope

- Waypoints on the map (specific GPS coordinates along the journey route)
- Auto-triggering journey content based on GPS position along the route
- Multiple journey segments between two stops
- Journey content with its own coordinates or map markers

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| `journey` is present but empty array | Treated as no journey (advance directly) |
| `journey` contains invalid block type | Loader validation catches it |
| Very long journey content | Scrollable within the card area |

## Acceptance Criteria

1. Demo tour YAML includes at least one stop with `getting_here.journey` content
2. Tapping "Next →" on the preceding stop shows the journey card
3. "I've arrived" advances to the destination stop card
4. Next arrow skips the journey card
5. Prev arrow returns to the origin stop (not the journey)
6. Header shows "EN ROUTE" during journey
7. Stops without journey content advance directly (no regression)
8. All content block types work in journey cards

## Test Approach

- **Unit**: Loader validates journey content blocks; journey card rendering
- **Integration**: Next → journey card → I've arrived → stop card flow
- **Manual**: Visual check on mobile and desktop with demo tour
