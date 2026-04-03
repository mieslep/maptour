# TOUR-039 — Task Breakdown

## Task 1: YAML schema, types, and i18n

**Scope:** Extend TourMeta with `header_html` and `getting_here` fields. Update Zod schema. Add all new i18n keys. Add HeaderSanitiser utility.

**Files:**
- `src/types.ts` — add `header_html?: string` and `getting_here?: ContentBlock[]` to TourMeta
- `src/schema.ts` — extend Zod schema with new fields
- `src/i18n.ts` — add keys: `menu_getting_here`, `menu_start_tour`, `menu_tour_stops`, `menu_about`, `back`, `about_heading`, `about_description`, `getting_here_title`, `how_to_get_here`, `progress_label`
- `src/util/sanitiseHtml.ts` — pure function: allowlist `div`, `img`, `span`, text nodes; allowed attributes: `src`, `alt`, `class`, `style`

**Acceptance:**
- Zod schema validates/rejects `header_html` and `getting_here` correctly
- sanitiseHtml strips disallowed tags and attributes
- Unit tests for sanitiser (script tags, onerror attributes, nested elements, allowed tags pass through)

**Dependencies:** None

---

## Task 2: MenuBar component

**Scope:** New component that renders the menu bar (hamburger + custom header area) and dropdown menu.

**Files:**
- `src/layout/MenuBar.ts` — MenuBar class
- `styles/maptour.css` — `.maptour-menu-bar`, `.maptour-menu-dropdown`, `.maptour-menu-item`, `.maptour-menu-header-content`

**API:**
```typescript
class MenuBar {
  constructor(container: HTMLElement, headerHtml?: string)
  onAction(cb: (action: 'getting_here' | 'start_tour' | 'tour_stops' | 'about') => void): void
  setGettingHereVisible(visible: boolean): void  // hide if no YAML content
  close(): void  // programmatic close
  getElement(): HTMLElement
}
```

**Behaviour:**
- Hamburger toggles dropdown open/closed
- Dropdown closes on item click, outside click, Escape key
- `tour.header_html` rendered via sanitiseHtml into header area
- Getting Here item hidden when `setGettingHereVisible(false)`
- Menu items: icon + label, ≥44px touch targets

**Acceptance:**
- Dropdown opens/closes on hamburger click
- All four menu items fire correct action
- Outside click and Escape close dropdown
- Header HTML sanitised before render
- Unit tests for open/close, action dispatch, sanitisation integration

**Dependencies:** Task 1 (sanitiseHtml, i18n keys)

---

## Task 3: ProgressBar component

**Scope:** New component that renders prev/next arrows flanking a progress indicator bar.

**Files:**
- `src/layout/ProgressBar.ts` — ProgressBar class
- `styles/maptour.css` — `.maptour-progress-bar`, `.maptour-progress-bar__track`, `.maptour-progress-bar__fill`, arrow styling

**API:**
```typescript
class ProgressBar {
  constructor()
  update(visited: number, total: number): void
  setPrevDisabled(disabled: boolean): void
  setNextDisabled(disabled: boolean): void
  onPrev(cb: () => void): void
  onNext(cb: () => void): void
  show(): void
  hide(): void
  getElement(): HTMLElement
}
```

**Behaviour:**
- Fill width = `(visited / total) * 100%`
- `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax` on track
- Arrows are 32px circular buttons matching existing nav arrow style
- Hidden by default; orchestrator calls show/hide based on journey state

**Acceptance:**
- Progress fill width matches visited/total ratio
- Arrows fire callbacks, respect disabled state
- ARIA attributes set correctly
- show/hide toggle visibility
- Unit tests for progress calculation, show/hide, disabled states

**Dependencies:** None

---

## Task 4: StopCard — Getting Here and About render methods

**Scope:** Add `renderGettingHere()` and `renderAbout()` methods to StopCard, following the same pattern as `renderWelcome()` and `renderGoodbye()`.

**Files:**
- `src/card/StopCard.ts` — new methods

**renderGettingHere(options):**
- Card header with back button (← icon) and "Getting Here" title
- Renders content blocks from `tour.getting_here` using existing block renderers
- Back button calls `onBack` callback

**renderAbout(options):**
- Card header with back button and "About" title
- Hardcoded content: "Powered by MapTour" heading, brief description, link to repo
- Back button calls `onBack` callback

**Welcome card integration:**
- When `renderWelcome()` is called with `gettingHereAvailable: true`, render a "How to get here" button/link
- Button calls a new `onGettingHere` callback

**Acceptance:**
- Getting Here card renders content blocks correctly
- About card renders hardcoded branding
- Back button fires callback
- Welcome card shows "How to get here" link when getting_here content exists
- Unit tests for render output and callback wiring

**Dependencies:** Task 1 (i18n keys)

---

## Task 5: Orchestrator wiring and layout integration

**Scope:** Replace the stop-list-header with MenuBar + ProgressBar in `index.ts`. Wire menu actions, progress updates, and system card state management. Both mobile and desktop.

**Files:**
- `src/index.ts` — major restructuring of header/nav layout
- `styles/maptour.css` — layout adjustments (padding-top, z-index, desktop overrides)

**Changes:**
- Remove `toggleRow` (stop-list-header), `stopListToggleBtn`, `exitBtn` construction
- Create MenuBar and ProgressBar, insert at top of layout
- Mobile: menu bar is `position: absolute; top: 0`, progress bar below it; card view padding-top accommodates both
- Desktop: menu bar + progress bar are first children of the card panel (no absolute positioning)
- Track `viewingSystemCard` state (`'getting_here' | 'about' | null`)
- Menu action handlers:
  - `getting_here` → set viewingSystemCard, call `stopCard.renderGettingHere()`
  - `start_tour` → transition to `tour_start`, pre-set picker to current stop if mid-tour
  - `tour_stops` → open StopListOverlay (mobile) / toggle inline list (desktop)
  - `about` → set viewingSystemCard, call `stopCard.renderAbout()`
- Journey state change handler: show/hide progress bar, update progress, clear viewingSystemCard
- Progress bar: update on `onStopChange` with breadcrumb visited count
- Back button from system cards: clear viewingSystemCard, re-render current state's card
- Map panel header top position adjusted to sit below menu bar + progress bar

**Acceptance:**
- Menu bar visible on all journey states, both mobile and desktop
- Progress bar visible only during `at_stop` and `in_transit`
- Menu actions work correctly for each item
- System cards display and dismiss properly
- Prev/next arrows on progress bar navigate stops
- Desktop card panel uses same menu/progress layout
- Existing functionality (map panel, transit bar, scroll hint) unaffected
- All 167+ existing tests still pass

**Dependencies:** Tasks 1–4

---

## Task 6: Integration testing

**Scope:** End-to-end verification of the full menu bar + progress bar system.

**Tests:**
- Menu opens/closes, all items function
- Getting Here hidden when YAML field absent
- Getting Here card renders, back button returns to welcome
- About card renders, back button returns to previous state
- Start Tour from mid-tour shows welcome with picker at current stop
- Progress bar reflects visited stops correctly
- Progress bar hidden during welcome/goodbye/system cards
- Custom header HTML renders sanitised content
- Desktop layout matches mobile card experience
- Tour with `header_html` containing disallowed tags renders safely

**Dependencies:** Task 5

**Acceptance:** All new integration tests pass. All existing tests pass.
