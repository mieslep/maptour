# TOUR-042 — Architecture Refactor: TourSession + Orchestrator Decomposition

## Summary

Refactor the MapTour player internals to eliminate state duplication, decompose the 631-line orchestrator (`index.ts`), and clarify component responsibilities. No user-facing behaviour changes. All 218 existing tests must continue to pass; new unit tests cover extracted modules.

## Motivation

The codebase has grown through 41 feature tickets from a simple map+card player to a full journey state machine with overview mode, circular tours, direction toggling, GPS proximity, progress tracking, and system cards. The architecture hasn't kept pace:

1. **Tour configuration state** (start index, direction, tour order, visited set) is duplicated across `index.ts`, `NavController`, `StopListOverlay`, and `MapView` — synced manually at 9+ call sites
2. **index.ts** is a 631-line `init()` function mixing DOM construction, state management, event wiring, mobile/desktop layout branching, GPS setup, and a 125-line journey state handler
3. **NavController** directly manipulates MapView, StopCard, and Breadcrumb instead of emitting events — then the orchestrator *also* updates those components in callbacks
4. **StopCard** has 6 render methods for fundamentally different card types (stop, journey, welcome, goodbye, getting here, about)

## Functional Requirements

### FR-1: TourSession — single source of truth for tour configuration

**Given** the player is initialised  
**When** any component needs tour config (start index, direction, tour order, visited stops)  
**Then** it reads from a single `TourSession` object, not its own cached copy

**Given** the user changes direction or selects a start stop on the overview  
**When** the change is applied to `TourSession`  
**Then** all subscribed components receive the update through a single notification, not N manual setter calls

### FR-2: Orchestrator decomposition

**Given** the current `init()` function in `index.ts`  
**When** the refactor is complete  
**Then** `index.ts` delegates to focused modules:
- Layout construction (mobile vs desktop DOM assembly)
- Journey state change handler (the 125-line `onStateChange` callback)
- Overview mode coordination
- GPS integration

Each module is independently testable.

### FR-3: NavController simplification

**Given** NavController currently calls `mapView.setActiveStop()`, `stopCard.update()`, `breadcrumb.markVisited()`, and `mapView.setVisitedStops()` directly  
**When** the refactor is complete  
**Then** NavController emits navigation events; the orchestrator (or TourSession subscribers) handle component updates

NavController no longer holds its own `startIndex`, `reversed`, or `tourOrder` — it reads from TourSession.

### FR-4: StopCard decomposition

**Given** StopCard currently has `render()`, `renderJourney()`, `renderWelcome()`, `renderGettingHere()`, `renderAbout()`, `renderGoodbye()`  
**When** the refactor is complete  
**Then** each card type is a separate renderer function or class, sharing a common `CardRenderer` pattern for the container setup (clear, scroll reset, aria attributes)

`StopCard` becomes a thin coordinator that delegates to the correct renderer.

### FR-5: Behavioural equivalence

**Given** the refactored codebase  
**When** all existing tests are run  
**Then** all 218 tests pass without modification (test code may need import path changes only)

**Given** the refactored player  
**When** a user interacts with any tour feature (welcome, overview, navigation, journey cards, GPS, system cards, stop list, progress bar)  
**Then** the behaviour is identical to the current implementation

## Non-Functional Requirements

- **Zero bundle size regression** — no new runtime dependencies. Refactoring is structural only.
- **Test coverage** — new modules (TourSession, layout builders, card renderers) must have unit tests. Target: maintain or improve current coverage.
- **No API changes** — `MapTour.init(options)` signature and `MapTourInitOptions` type unchanged. YAML schema unchanged.
- **Build time** — no measurable regression.

## Out of Scope

- New features (scroll indicator, new tour modes, etc.)
- CSS changes — DOM structure may change internally but CSS class names remain stable
- Changes to the YAML schema or loader
- Changes to the editor (`src/editor/`)
- Performance optimisation beyond what falls out naturally from cleaner architecture

## Failure Modes

- **State desync** — If TourSession notifications fail to fire, components show stale state. Mitigated by: TourSession is synchronous (no async gaps), and existing tests catch desync as behavioural regressions.
- **Import breakage** — Moved files break editor imports. Mitigated by: updating all import paths in the same commit, running full test suite.
- **Subtle behavioural drift** — Card rendering differs slightly after extraction. Mitigated by: extracting render methods as-is first, refactoring structure later.

## Acceptance Criteria

1. No file in `src/` exceeds 250 lines
2. Tour configuration state (start index, direction, tour order) exists in exactly one place (`TourSession`)
3. `NavController` has no direct references to `MapView`, `StopCard`, or `Breadcrumb`
4. `StopCard.ts` contains only stop card rendering; system cards and journey cards are separate modules
5. Application behaviour is identical — all user-facing interactions produce the same results as before
6. NavController tests are rewritten to test navigation logic via events rather than mock verification of coupled components; net test count may change but coverage of navigation behaviour is maintained or improved
7. Tests for unaffected components (Breadcrumb, JourneyStateManager, MenuBar, ProgressBar, etc.) continue to pass without modification (import path changes excepted)
8. New unit tests for TourSession, each card renderer, and any extracted orchestrator modules
9. `npm run build` produces identical public API (`MapTour.init`)
10. No new runtime dependencies
