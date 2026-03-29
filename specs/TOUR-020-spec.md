# TOUR-020 — Welcome and Goodbye Cards

## Summary

Add optional `tour.welcome` and `tour.goodbye` content to the YAML schema. These render as bookend cards at the start and end of the tour — not numbered stops, but narrative content like introductions, sponsor acknowledgements, or thank-you messages.

## Motivation

Tour authors want to set context before stop 1 and wrap up after the last stop. Currently the start screen only shows the tour title, description, and a CTA button. The completion screen only shows a visited count. There's no place for rich content (images, formatted text) at either end of the tour.

## YAML Schema

```yaml
tour:
  id: enniscorthy-tidy-towns-2025
  title: Enniscorthy Tidy Towns 2025
  description: >
    Discover the community projects...
  duration: "Approx. 90 minutes on foot"
  nav_mode: walk
  close_url: "https://ennistidytowns.ie"
  welcome:
    - type: text
      body: |
        ## Welcome to the Enniscorthy Tidy Towns Tour!

        This self-guided walking tour will take you through six
        community projects across the town...
    - type: image
      url: https://example.com/welcome-banner.jpg
      caption: Enniscorthy from the castle grounds
  goodbye:
    - type: text
      body: |
        ## Thank you for taking the tour!

        We hope you enjoyed seeing the work of our volunteers.
        If you'd like to support Enniscorthy Tidy Towns, visit
        our website or drop into the community centre.
```

`welcome` and `goodbye` are optional arrays of content blocks (same `ContentBlock` types used by stops: text, image, gallery, video, audio).

## Functional Requirements

### FR-1: Welcome card on tour start
- **Given** `tour.welcome` is defined in the YAML
- **When** the tour loads and enters `tour_start` state
- **Then** the start screen renders the welcome content blocks above the existing CTA ("Begin tour" / "Re-take tour")
- The existing title, description, duration, and stop count remain visible
- Welcome content scrolls if it exceeds the viewport

### FR-2: Start screen without welcome
- **Given** `tour.welcome` is not defined
- **When** the tour loads
- **Then** the start screen renders exactly as it does today (no change)

### FR-3: Goodbye card on tour complete
- **Given** `tour.goodbye` is defined in the YAML
- **When** the tour enters `tour_complete` state (via advancing past the last stop)
- **Then** the completion screen renders the goodbye content blocks between the visited count and the action buttons ("Revisit tour", "Close")

### FR-4: Goodbye card on "Finish Tour"
- **Given** `tour.goodbye` is defined and the user clicks "Finish Tour" on the last stop card
- **When** the close_url is set
- **Then** the user navigates directly to close_url (goodbye not shown — they explicitly chose to leave)
- **When** close_url is NOT set
- **Then** the sheet collapses (current behaviour — goodbye is shown via tour_complete state when advancing via Next arrow)

### FR-5: Completion screen without goodbye
- **Given** `tour.goodbye` is not defined
- **When** tour completes
- **Then** the completion screen renders exactly as it does today

## Non-Functional Requirements

- Welcome/goodbye content blocks render using the same block renderers as stop cards (zero new rendering code for content types)
- No new dependencies
- Welcome content must not delay tour start — all content renders client-side from the already-loaded YAML
- Performance: no measurable impact on load time (content blocks are already parsed)

## Out of Scope

- Welcome/goodbye as separate "pages" with their own map state (they share the start/complete overlay)
- Animated transitions between welcome content and the first stop
- Per-stop welcome/goodbye (this is tour-level only)
- Welcome/goodbye with coordinates or map interactions

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| `welcome` is present but empty array | Start screen renders as if no welcome (no empty container) |
| `welcome` contains invalid block type | Loader validation catches it, same as stop content validation |
| `goodbye` with very long content | Scrollable within the completion screen overlay |

## Acceptance Criteria

1. Demo tour YAML includes both `welcome` and `goodbye` blocks
2. Start screen renders welcome content above the CTA button
3. Completion screen renders goodbye content between the visited count and action buttons
4. Removing `welcome`/`goodbye` from YAML produces the existing screens (backward compatible)
5. All five content block types work in welcome/goodbye (text, image, gallery, video, audio)
6. Unit tests cover: welcome present/absent, goodbye present/absent, empty arrays
7. Mobile and desktop layouts render welcome/goodbye correctly

## Test Approach

- **Unit**: Loader validates welcome/goodbye content blocks; TourStartScreen renders with/without welcome; TourCompleteScreen renders with/without goodbye
- **Manual**: Visual check on mobile (390×844) and desktop (1400×800) with demo tour
