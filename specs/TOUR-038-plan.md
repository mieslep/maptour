# TOUR-038: Architecture Plan

## System Context

This is a layout restructure, not a new feature. The domain logic (NavController, JourneyStateManager, GpsTracker, Breadcrumb, StopCard) is unchanged. The change affects:

1. **Layout orchestration** in `src/index.ts` - how components are wired into the DOM
2. **CSS layout** in `styles/maptour.css` - mobile layout rules
3. **One new component** - `MapPanel` (slide-in/out panel + FAB toggle)
4. **One modified component** - `BottomSheet` usage on mobile (bypassed)

Desktop layout is untouched.

## Architecture

### Component Changes

#### New: `MapPanel` (`src/layout/MapPanel.ts`)

Manages the map FAB and the slide-in map panel on mobile.

**Responsibilities:**
- Creates the map FAB button (bottom-right, mobile-only)
- Wraps the map pane in a sliding container
- Toggles between card view and map view via CSS transform (translateX)
- Updates FAB icon, color, and aria-label on state change
- Exposes `onToggle(cb)` for the orchestrator to react
- Respects `prefers-reduced-motion` (instant show/hide)
- Hidden on desktop (>= 768px) - map pane renders normally

**DOM structure (mobile):**
```
.maptour-container
  .maptour-title-bar          ← existing header, repositioned via CSS
  .maptour-card-view           ← full-page card content (was sheetContentEl)
    .maptour-stop-list-wrapper
    .maptour-card
  .maptour-map-panel           ← new sliding container
    .maptour-map-pane           ← existing map, reparented into panel
  .maptour-map-fab             ← new FAB button
  .maptour-transit-bar         ← existing, unchanged
  .maptour-stop-list-fab       ← existing, unchanged
```

**Desktop DOM** remains as-is: `.maptour-container > .maptour-map-pane + .maptour-sheet`.

#### Modified: Layout orchestration (`src/index.ts`)

The `init()` function currently creates a `BottomSheet` and wires everything into it. Changes:

- **Mobile path:** Skip `BottomSheet`. Attach `sheetContentEl` directly to container as `.maptour-card-view`. Create `MapPanel` wrapping the map pane. The existing header row gets class `maptour-title-bar` (CSS makes it float).
- **Desktop path:** Keep `BottomSheet` as-is. No `MapPanel`.
- **Detection:** Use `matchMedia('(min-width: 768px)')` at init time, with a listener for resize/orientation changes.
- **State changes:** Replace `sheet.setPosition('expanded'/'collapsed')` calls with `mapPanel.show()/hide()` equivalents where applicable. The `in_transit` state now calls `mapPanel` (or does nothing - the transit bar handles the UX).

#### Modified: CSS (`styles/maptour.css`)

**Mobile changes (< 768px):**
- `.maptour-card-view`: new class, replaces `.maptour-sheet`. Full height/width, no border-radius, no shadow, no transform. Static positioning, overflow-y: auto.
- `.maptour-title-bar`: position absolute, top 0, left 0, right 0, z-index 15. Background with slight transparency or solid. Same flex layout as current header row.
- `.maptour-map-panel`: position absolute, inset 0, z-index 12. Default: `transform: translateX(100%)`. When open: `transform: translateX(0)`. Transition: `transform 300ms ease-out`.
- `.maptour-map-fab`: position absolute, bottom 16px, right 16px, z-index 20. 48x48px circle. Two states via class toggle (`.maptour-map-fab--active`).
- `.maptour-sheet`, `.maptour-sheet__handle`: `display: none` on mobile.
- Card content gets `padding-top` to account for floating title bar height.

**Desktop (>= 768px):**
- `.maptour-map-panel`, `.maptour-map-fab`: `display: none`.
- Everything else unchanged.

**Reduced motion:**
- `.maptour-map-panel`: `transition: none`.

### State Machine Impact

None. `JourneyStateManager` states (tour_start, at_stop, in_transit, tour_complete) are unchanged. The orchestrator maps states to layout actions differently on mobile:

| State | Current mobile behavior | New mobile behavior |
|-------|------------------------|---------------------|
| tour_start | sheet.expanded | card view shown, map closed |
| at_stop | sheet.expanded | card view shown, map closed |
| in_transit | sheet.collapsed, transit bar | card view shown, transit bar visible, map accessible via FAB |
| tour_complete | sheet.expanded | card view shown, map closed |

### Map State Preservation

The map pane (`MapView`) is never destroyed or recreated - it's reparented once at init. Pan/zoom state is preserved naturally since the Leaflet instance stays alive. When the panel slides in/out, `map.invalidateSize()` is called to handle the container resize.

### GPS Background Tracking

No changes. `GpsTracker.start()` is called at init and runs continuously. The GPS dot position updates on the Leaflet map regardless of whether the map panel is visible. When the user opens the map, the dot is already in the correct position.

## Tech Stack

No new dependencies. CSS transitions for animation (no JS animation library). Font Awesome icons for FAB states (already bundled).

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Leaflet `invalidateSize()` timing on panel open | Medium | Call after transition ends (transitionend event), not on toggle |
| Card scroll position lost on map toggle | Low | Card view stays in DOM, just visually behind the panel. No DOM removal = scroll preserved |
| Stop list overlay z-index conflict with title bar | Low | Overlay backdrop is z-index 30 (above title bar at 15). Already correct. |
| FAB overlaps card footer CTA on short viewports | Medium | CSS: if viewport < 500px, add bottom padding to card content to clear FAB |
