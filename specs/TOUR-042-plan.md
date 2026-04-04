# TOUR-042 — Architecture Plan

## System Context

MapTour is a single-bundle JavaScript player embedded via `<script>` tag. The refactor is entirely internal — no changes to the public API (`MapTour.init(options)`), YAML schema, CSS class names, or bundle entry point.

The current architecture has one entry point (`index.ts`) that creates all components, wires all events, manages all state, and handles all layout. After this refactor, responsibilities are separated into:

- **TourSession** — state owner (tour config + visited tracking)
- **CardHost + Renderers** — card rendering (separated by card type)
- **NavController** — navigation logic (emits events, reads from TourSession)
- **Layout builders** — DOM construction (mobile vs desktop)
- **Orchestrator** — wiring and state change handling (much smaller index.ts)

## Architecture

### 1. TourSession (`src/session/TourSession.ts`)

Single source of truth for all tour configuration state:

```
TourSession
├── startIndex: number
├── reversed: boolean
├── tourOrder: number[]          (computed from startIndex + reversed + stopCount)
├── endIndex: number             (computed)
├── currentStopIndex: number
├── visited: Set<number>         (persisted via Breadcrumb internally)
├── overviewSelectedIndex: number
│
├── setStartIndex(index)         → recomputes order, notifies
├── setReversed(reversed)        → recomputes order, notifies
├── setOverviewSelection(index)  → updates selection + endIndex, notifies
├── markVisited(stopId)          → delegates to Breadcrumb, notifies
├── setCurrentStop(index)        → updates current, notifies
├── reset()                      → resets to defaults for new tour start
│
├── getVisited(): Set<number>
├── getTourOrder(): number[]
├── getEndIndex(): number
│
└── onChange(cb: (session: TourSession) => void)
```

**Breadcrumb** becomes an internal implementation detail of TourSession — not imported by any other module. TourSession creates it, delegates `markVisited`/`getVisited`/`clear` to it.

**Tour order computation** (`computeTourOrder`, `getEndIndex`) moves from closures in index.ts to methods on TourSession.

**Subscribers:** MapView, StopListOverlay, ProgressBar, OverviewControls, and the orchestrator subscribe to `onChange`. Each reads only the state it needs. No manual sync calls.

### 2. CardHost (`src/card/CardHost.ts`)

Thin container owner:

```
CardHost
├── container: HTMLElement
│
├── render(fn: (container: HTMLElement) => void)
│   → clears container, resets scroll, calls fn(container)
├── getContainer(): HTMLElement
```

Owns the boilerplate that every card type currently duplicates: `container.innerHTML = ''`, `container.scrollTop = 0`. Does NOT own aria attributes — those are card-type-specific and set by the renderer.

### 3. Card Renderers (`src/card/`)

Each renderer is a function or small class. They receive the container from CardHost and build DOM into it.

**Stateful renderers (classes):**

- `StopCardRenderer` (`src/card/StopCardRenderer.ts`) — owns `navPreference`, `tourNavMode`, `startingStopIndex`, `suppressGettingHereNote`, `nextCallback`, `returnToStartCallback`. Has `render(stop, stopNumber, totalStops, nextStop?)` and `update()`.
- `JourneyCardRenderer` (`src/card/JourneyCardRenderer.ts`) — owns `navPreference`, `tourNavMode`. Has `render(destinationStop, onArrived)`.

These share a `NavAppPreference` instance (passed in via constructor).

**Stateless renderers (functions):**

- `renderWelcomeCard(container, options)` (`src/card/WelcomeCard.ts`)
- `renderGoodbyeCard(container, options)` (`src/card/GoodbyeCard.ts`)
- `renderGettingHereCard(container, options)` (`src/card/GettingHereCard.ts`)
- `renderAboutCard(container, options)` (`src/card/AboutCard.ts`)

Each is a single exported function. Options are typed interfaces local to each file.

**Shared utilities** stay in `src/card/blocks/` (unchanged) and `src/card/NavButton.ts` (unchanged).

### 4. NavController (`src/navigation/NavController.ts`)

Slimmed down. Reads from TourSession, emits events.

**Removed dependencies:** No longer receives MapView, StopCard, or Breadcrumb in constructor.

**New constructor:**
```
NavController(tour: Tour, session: TourSession)
```

**Behaviour:**
- `next()` — computes next index from session state (startIndex, reversed), checks journey content, emits event. Calls `session.markVisited()` on the current stop.
- `prev()` — computes previous index from session state, emits event.
- `goTo(index)` — emits event with the stop and index.
- `returnToStart()` — navigates to session.startIndex, emits event.

**Events emitted:**
```
onNavigate(cb: (stop: Stop, index: number) => void)
onJourneyStart(cb: (destinationStop: Stop, onArrived: () => void) => void)
onJourneyEnd(cb: () => void)
onTourEnd(cb: () => void)     // was onNextFromLast
```

The orchestrator subscribes to these events and calls the appropriate CardHost renderer, MapView method, etc.

**Stop list rendering** moves out of NavController. The inline `renderStopList()` and `updateStopList()` currently in NavController are only used on desktop and duplicate what StopListOverlay does. These move to StopListOverlay (which already renders a stop list). StopListOverlay subscribes to TourSession for order/visited updates.

### 5. Layout Builders (`src/layout/buildMobileLayout.ts`, `src/layout/buildDesktopLayout.ts`)

Two functions that construct the DOM tree for their respective layouts and return a `LayoutComponents` bag:

```typescript
interface LayoutComponents {
  cardHost: CardHost;
  mapPanel: MapPanel | null;        // mobile only
  sheet: BottomSheet | null;        // desktop only
  sheetContentEl: HTMLElement | null; // desktop only, for appending overview controls
  resetScrollHint: (() => void) | null;  // mobile only
  progressBarEl: HTMLElement;        // where to place progress bar (differs by layout)
  menuBarEl: HTMLElement;            // where to place menu bar (differs by layout)
}
```

Each function creates the DOM elements, appends them to the container, sets up layout-specific observers (scroll hint, card view padding, map panel top offset), and returns the components.

The orchestrator calls one function based on `isMobile`, then works with the returned components identically.

### 6. Orchestrator (`src/index.ts`)

After extraction, index.ts becomes the wiring layer:

1. Load tour, resolve container
2. Create TourSession
3. Call `buildMobileLayout` or `buildDesktopLayout` → get LayoutComponents
4. Create MapView, NavController, MenuBar, ProgressBar, OverviewControls, StopListOverlay, InTransitBar, GpsTracker
5. Subscribe components to TourSession.onChange
6. Wire NavController events to card renderers and layout
7. Wire JourneyStateManager.onStateChange → handler function
8. Wire menu actions, overview controls, GPS
9. Restore or start

The journey state change handler (~125 lines) moves to a separate function: `handleStateChange(state, stopIndex, deps)` in `src/orchestrator/journeyHandler.ts`. It receives a deps object with references to the components it needs to coordinate — this avoids the closure-over-everything pattern.

### 7. Component Subscription Pattern

Components that need to react to TourSession changes subscribe directly:

- **MapView** — `session.onChange(() => { this.setVisitedStops(session.getVisited()); })` — MapView no longer caches visited state; it reads from session on each change.
- **StopListOverlay** — reads `session.getTourOrder()`, `session.getVisited()`, `session.currentStopIndex` on change.
- **ProgressBar** — reads `session.getVisited().size` and `session.stopCount` on change.
- **OverviewControls** — reads `session.overviewSelectedIndex`, `session.reversed` on change.

This replaces the 9+ manual sync call sites in index.ts.

## File Structure After Refactor

```
src/
├── index.ts                          ← slim orchestrator (~200 lines)
├── session/
│   └── TourSession.ts                ← state owner
├── orchestrator/
│   └── journeyHandler.ts             ← state change handler
├── card/
│   ├── CardHost.ts                   ← container owner
│   ├── StopCardRenderer.ts           ← stop card (stateful)
│   ├── JourneyCardRenderer.ts        ← journey card (stateful)
│   ├── WelcomeCard.ts                ← stateless render function
│   ├── GoodbyeCard.ts                ← stateless render function
│   ├── GettingHereCard.ts            ← stateless render function
│   ├── AboutCard.ts                  ← stateless render function
│   ├── NavButton.ts                  ← unchanged
│   └── blocks/                       ← unchanged
├── navigation/
│   ├── NavController.ts              ← slimmed, event-emitting
│   └── NavAppPreference.ts           ← unchanged
├── layout/
│   ├── buildMobileLayout.ts          ← new
│   ├── buildDesktopLayout.ts         ← new
│   ├── BottomSheet.ts                ← unchanged
│   ├── MapPanel.ts                   ← unchanged
│   ├── MenuBar.ts                    ← unchanged
│   ├── ProgressBar.ts                ← unchanged
│   ├── OverviewControls.ts           ← unchanged
│   ├── InTransitBar.ts               ← unchanged
│   └── StopListOverlay.ts            ← gains desktop stop list role
├── map/
│   ├── MapView.ts                    ← removes visited cache, subscribes to session
│   ├── layers.ts                     ← unchanged
│   └── chevrons.ts                   ← unchanged
├── journey/
│   └── JourneyStateManager.ts        ← unchanged
├── breadcrumb/
│   └── Breadcrumb.ts                 ← unchanged (now internal to TourSession)
├── gps/                              ← unchanged
├── errors/                           ← unchanged
├── i18n.ts                           ← unchanged
├── loader.ts                         ← unchanged
├── schema.ts                         ← unchanged
├── types.ts                          ← unchanged
└── util/                             ← unchanged
```

## Risks and Mitigations

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Subtle behavioural drift during card renderer extraction | Medium | Extract render methods as-is first (copy-paste), verify tests pass, then restructure |
| TourSession notification ordering causes glitches | Low | Notifications are synchronous; subscribers fire in registration order. If ordering matters, document it |
| StopListOverlay gaining desktop role introduces regressions | Low | Desktop stop list is currently minimal (hidden by default). StopListOverlay already renders the same list |
| Import path breakage across 30+ files | Low | Run full test suite and `tsc --noEmit` after each structural move |
| 250-line cap forces awkward splits | Low | Cap is a guideline for this refactor. If a file is at 260 lines and splitting would harm cohesion, note it in the PR |

## Dependencies

No external dependencies added. No changes to build config, YAML schema, or CSS.
