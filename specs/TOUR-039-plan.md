# TOUR-039 — Architecture Plan

## System Context

TOUR-039 replaces the current stop-list-header (`[◀] [▶] [ALL STOPS ▼] [✕]`) with a two-row top bar: a **menu bar** (hamburger + custom header area) and a **progress bar** (prev/next arrows + visual indicator). It also introduces two system cards (Getting Here, About) and a new YAML field (`tour.getting_here`).

The change touches the orchestrator (`index.ts`), types, schema, i18n, and CSS. Two new components are created (MenuBar, ProgressBar). StopCard gains two new rendering methods for system cards. The existing StopListOverlay is reused from the menu.

## Hexagonal Decomposition

### Domain Core
- **ProgressCalculator** — pure function: given `visitedCount` and `totalStops`, returns a 0–1 ratio. No DOM, no state.
- **HeaderSanitiser** — pure function: given an HTML string, returns a sanitised string allowing only `div`, `img`, `span`, and text nodes. Strips all attributes except `src`, `alt`, `class`, `style` on allowed tags.

### Inbound Ports
- **MenuBar** component — renders the hamburger button, dropdown menu, and custom header area. Emits events: `onGettingHere`, `onStartTour`, `onTourStops`, `onAbout`.
- **ProgressBar** component — renders the prev/next arrows and a progress indicator. Accepts `progress` (0–1), `prevDisabled`, `nextDisabled`. Emits `onPrev`, `onNext`.

### Outbound Ports
- Tour YAML (`tour.getting_here`, `tour.header_html`) — new fields read by the loader and validated by Zod.
- StopCard — two new render methods following the same pattern as `renderWelcome()` and `renderGoodbye()`: `renderGettingHere(blocks, onBack)` and `renderAbout(onBack)`.

### Adapters
- **Orchestrator** (`index.ts`) — wires MenuBar and ProgressBar into the layout, handles menu actions by delegating to existing journey state, StopListOverlay, and StopCard.

## Tech Stack Decisions

No new dependencies. Uses existing:
- Font Awesome for menu icon (`fa-bars`)
- Zod for schema validation
- `t()` for i18n

## Data Architecture

### New YAML Fields

```yaml
tour:
  header_html: '<div><img src="logo.png" alt="Logo" style="height:28px"></div>'
  getting_here:                    # content blocks, same schema as tour.welcome
    - type: text
      body: "Park at the car park on Main Street. The tour starts at the church."
    - type: image
      url: "parking-map.jpg"
      caption: "Car park location"
```

### Type Changes

```typescript
// TourMeta additions
interface TourMeta {
  // ... existing fields ...
  header_html?: string;
  getting_here?: ContentBlock[];
}
```

### Schema Changes

Zod schema extended with:
- `header_html`: `z.string().optional()`
- `getting_here`: existing `contentBlocksSchema.optional()`

## Component Design

### MenuBar

```
┌──────────────────────────────┐
│ [☰]          [custom header] │  ← menu bar (always visible)
├──────────────────────────────┤
│ [◀]  ═══════●═══════  [▶]   │  ← progress bar (at_stop/in_transit only)
└──────────────────────────────┘
```

The MenuBar creates:
- `.maptour-menu-bar` — flex row, hamburger left, header content right
- `.maptour-menu-dropdown` — absolutely positioned below hamburger, hidden by default
- Four menu items, each a button with icon + label

Dropdown closes on:
- Item selection
- Click outside (document click listener)
- Escape key

### ProgressBar

- `.maptour-progress-bar` — flex row: prev arrow, track, next arrow
- `.maptour-progress-bar__track` — the bar background
- `.maptour-progress-bar__fill` — inner element, width set as percentage
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` on track for accessibility
- Hidden when journey state is `tour_start` or `tour_complete`, or when viewing a system card

### Getting Here and About Cards

These follow the same pattern as `renderWelcome()` and `renderGoodbye()` — methods on StopCard that clear the container and render content into it. Each includes a back button in a card header. They reuse the existing content block renderers.

State tracking: the orchestrator tracks `viewingSystemCard: 'getting_here' | 'about' | null`. When set, the progress bar hides and StopCard renders the appropriate card. When cleared (via back button or menu navigation), the orchestrator re-renders the card for the current journey state.

### Getting Here on Welcome Card

When `tour.getting_here` exists, the welcome card renders a "How to get here" button/link. Tapping it sets `viewingSystemCard = 'getting_here'` and renders the card.

## Layout Integration

### Mobile
- Menu bar replaces `.maptour-title-bar` (same position: absolute, top: 0, z-index: 15)
- Progress bar sits below menu bar (top: ~44px)
- Card view `padding-top` increases to accommodate both bars (~88px when progress visible, ~44px when hidden)
- Map panel header position adjusts similarly

### Desktop
- Menu bar + progress bar replace the stop-list-header inside the card panel
- No absolute positioning needed — they're the first elements in the panel flex column
- Map pane on left unchanged

## -ilities Assessment

### Accessibility
- Hamburger button: `aria-expanded`, `aria-haspopup="menu"`
- Menu: `role="menu"`, items have `role="menuitem"`
- Progress bar: `role="progressbar"` with `aria-valuenow`/`aria-valuemin`/`aria-valuemax`
- Back button on system cards: clear label

### Performance
- No impact — DOM additions are minimal (two small bars, a dropdown)
- Dropdown menu items are created once and shown/hidden

### Security
- `header_html` sanitised via allowlist before rendering
- No new external dependencies

### Maintainability
- MenuBar and ProgressBar are self-contained components following the existing pattern (StopListOverlay, InTransitBar, MapPanel)
- System card rendering reuses existing content block infrastructure

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Menu dropdown clipped by container overflow | Medium | Position absolute with z-index above all other elements; container has `overflow: visible` or dropdown portalled to container root |
| Progress bar height causes layout shift when showing/hiding | Low | Reserve space with min-height or use opacity transition instead of display toggle |
| `header_html` XSS via attribute injection (e.g. `onerror`) | Medium | Allowlist attributes too: only `src`, `alt`, `class`, `style` on allowed tags |
