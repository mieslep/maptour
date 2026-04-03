# TOUR-038: Task Breakdown

## Task 1: MapPanel component

**Scope:** Create `src/layout/MapPanel.ts` - the sliding map panel and FAB toggle.

**Details:**
- `MapPanel` class: constructor takes container element and map pane element
- Creates `.maptour-map-panel` wrapper, reparents map pane into it
- Creates `.maptour-map-fab` button with map icon (fa-map) and aria-label "Show map"
- `toggle()`: adds/removes `.maptour-map-panel--open` class, swaps FAB icon (fa-map / fa-file-lines), swaps FAB active class, updates aria-label
- `show()` / `hide()`: explicit open/close
- `isOpen()`: returns current state
- `onToggle(cb: (open: boolean) => void)`: callback registration
- Calls `map.invalidateSize()` on `transitionend` of the panel (exposed via callback, wired by orchestrator)
- Respects `prefers-reduced-motion`: skip transition
- `destroy()`: cleanup

**Acceptance criteria:**
- Panel slides in from right on toggle, slides out on second toggle
- FAB icon and color change between states
- FAB meets 48x48px touch target
- aria-label updates correctly
- Panel hidden on desktop (CSS)
- Unit tests for toggle state, show/hide, callback firing

**Dependencies:** None
**Files:** `src/layout/MapPanel.ts`, `tests/unit/MapPanel.test.ts`

---

## Task 2: Mobile CSS layout rework

**Scope:** Restyle mobile layout: full-page card view, floating title bar, map panel, FAB. Desktop unchanged.

**Details:**
- New `.maptour-card-view` styles: full container, overflow-y auto, padding-top for title bar
- New `.maptour-title-bar` styles: position absolute, top 0, z-index 15, full width, background solid surface color, existing flex layout
- New `.maptour-map-panel` styles: absolute inset 0, z-index 12, translateX(100%) default, translateX(0) when `.--open`, transition 300ms ease-out
- New `.maptour-map-fab` styles: absolute bottom-right, 48x48, z-index 20, two color states (default surface, active primary)
- Hide `.maptour-sheet` and `.maptour-sheet__handle` on mobile (< 768px)
- `.maptour-map-panel`, `.maptour-map-fab`: display none on desktop (>= 768px)
- `prefers-reduced-motion`: transition none on `.maptour-map-panel`
- Ensure transit bar, stop list FAB, and stop list overlay z-indices are correct relative to new layers
- Card content bottom padding to clear FAB on short viewports

**Acceptance criteria:**
- Mobile: no sheet handle visible, card fills container, title bar floats at top
- Desktop: layout identical to current (no visual change)
- Map panel animates at 300ms with translateX
- Reduced motion: instant show/hide
- All z-index stacking correct (title bar > map panel > card view; overlay > title bar)
- FAB has AA contrast in both states

**Dependencies:** Task 1
**Files:** `styles/maptour.css`

---

## Task 3: Orchestrator wiring

**Scope:** Update `src/index.ts` to use the new layout on mobile, keeping desktop path unchanged.

**Details:**
- Detect mobile/desktop at init: `const isMobile = !window.matchMedia('(min-width: 768px)').matches`
- **Mobile path:**
  - Skip `BottomSheet` instantiation
  - Add `maptour-title-bar` class to the existing `toggleRow` (header row)
  - Create `maptour-card-view` div, append stop list wrapper + card into it
  - Attach card view + title bar directly to container
  - Instantiate `MapPanel` with container and map pane
  - Wire `mapPanel.onToggle()` to call `mapView.invalidateSize()` on transitionend
  - Replace all `sheet.setPosition()` calls with no-ops on mobile (card is always full-page)
  - X button (exitBtn): on mobile, toggles map panel instead of collapsing sheet
  - In-transit state: show transit bar (already works), no sheet collapse needed
- **Desktop path:**
  - Keep `BottomSheet` instantiation exactly as-is
  - No `MapPanel`
  - Title bar stays as inline header row (no floating class)
- Add resize/orientation listener: if crossing 768px boundary, warn via console (full layout switch not supported mid-session - reload required)

**Acceptance criteria:**
- Mobile: full-page cards, floating title bar, map FAB works
- Desktop: identical to current behavior
- All journey states (tour_start, at_stop, in_transit, tour_complete) render correctly on mobile
- GPS tracking continues when map panel is closed
- Map retains pan/zoom state across panel toggles
- Card scroll position preserved across panel toggles
- X button opens map on mobile
- Prev/next arrows work in both views
- All existing unit tests pass

**Dependencies:** Task 1, Task 2
**Files:** `src/index.ts`

---

## Task 4: i18n labels

**Scope:** Add i18n keys for new UI elements.

**Details:**
- `show_map`: "Show map" (FAB aria-label, card view state)
- `show_stop`: "Show stop" (FAB aria-label, map view state)
- Update exitBtn label on mobile from `minimize` to `show_map`
- Add defaults to `src/i18n.ts` DEFAULTS
- Document in README localisation table

**Acceptance criteria:**
- FAB aria-labels use `t()` lookup
- Labels overridable via `tour.strings` in YAML
- i18n unit tests cover new keys

**Dependencies:** Task 1
**Files:** `src/i18n.ts`, `tests/unit/i18n.test.ts`, `README.md`

---

## Task 5: Integration testing

**Scope:** Verify the full mobile layout flow works end-to-end.

**Details:**
- Test at 375px viewport: card fills screen, no sheet handle, title bar visible
- Test FAB toggle: map slides in, FAB changes state, map slides out
- Test navigation: prev/next work in card view, stop changes correctly
- Test map state: pan map, close panel, reopen - position preserved
- Test transit bar: shows over card view during in_transit state
- Test welcome card: renders full-page, stop picker works
- Test goodbye card: renders full-page, revisit works
- Test at 1280px viewport: desktop layout unchanged, no FAB visible

**Acceptance criteria:**
- All tests pass at 375px (mobile) and 1280px (desktop)
- No visual regressions on desktop

**Dependencies:** Task 3, Task 4
**Files:** `tests/unit/layout.test.ts` (or equivalent)
