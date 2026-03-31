# TOUR-027 — Journey Card CTA with Stop Name

## Summary

The "I've arrived" button on journey cards should display "I've arrived at [stop name]" instead of the generic "I've arrived". This requires updating the `arrived` i18n key to support a `{stop}` placeholder.

## Motivation

"I've arrived" is vague when the user is mid-tour and may not remember which stop they are heading to. Including the stop name reinforces context and gives a satisfying sense of progress — "I've arrived at River Slaney Cleanup" is more meaningful than a generic label.

## UX Flow

1. User is on a journey card between stop N and stop N+1.
2. The bottom CTA button reads "I've arrived at [stop N+1 title]" (e.g. "I've arrived at River Slaney Cleanup").
3. Tapping the button advances to stop N+1's card (behaviour unchanged).

### Button layout
```
───────────────────────────────────────
  [I've arrived at River Slaney Cleanup →]
───────────────────────────────────────
```

## Functional Requirements

### FR-1: Button text includes stop name
- **Given** a journey card is displayed for the route to stop N+1
- **When** the card renders
- **Then** the CTA button text is "I've arrived at {stop title}" using the destination stop's title

### FR-2: i18n key update
- **Given** the i18n strings file defines the `arrived` key
- **When** the key is loaded
- **Then** it supports a `{stop}` placeholder (e.g. `"I've arrived at {stop}"`)

### FR-3: Fallback for missing title
- **Given** a stop has no title (edge case)
- **When** the journey card renders
- **Then** the button falls back to "I've arrived" (no trailing "at")

### FR-4: Text truncation
- **Given** a stop title is very long
- **When** the button renders
- **Then** the text truncates gracefully (ellipsis or wrapping, consistent with existing button styling)

## Non-Functional Requirements

- No new dependencies
- All existing i18n languages must be updated with the new placeholder
- Button width should remain full-width; text wraps if needed

## Out of Scope

- Changing other button labels (Next, Prev, Start)
- Adding the stop name to the journey card header
- Localising stop titles themselves

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| Stop title is missing or empty | Button reads "I've arrived" (no placeholder) |
| Stop title is very long (>50 chars) | Text wraps or truncates within the button |
| i18n key missing `{stop}` placeholder | Falls back to literal string without substitution |

## Acceptance Criteria

1. Journey card CTA reads "I've arrived at [stop name]" with the correct destination stop title
2. The `arrived` i18n key uses a `{stop}` placeholder
3. Missing stop title falls back to "I've arrived"
4. Button text does not overflow or break layout on mobile
5. All supported languages have the updated key

## Test Approach

- **Unit**: i18n string interpolation with `{stop}` placeholder; fallback when title is empty
- **Integration**: Journey card renders the correct stop name in the CTA
- **Manual**: Visual check on mobile — long titles, short titles, missing titles
