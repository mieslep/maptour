# TOUR-042 — Clarification Questions & Answers

## Q1: TourSession notification mechanism

TourSession needs to notify subscribers when state changes. Options:

- **A) Simple callback array** — `tourSession.onChange(cb)`, fires synchronously. Consistent with how JourneyStateManager already works.
- **B) Fine-grained events** — separate `onDirectionChange`, `onStartIndexChange`, `onOrderChange`, `onVisitedChange` so components can subscribe to just what they need.
- **C) Single event with change type** — `onChange(cb: (changeType: 'direction' | 'startIndex' | ...) => void)` — one subscription, component filters.

Leaning toward **A** for simplicity — the subscriber count is small (5-6 components) and the change rate is low (user interactions, not animation frames). We can always add granularity later if needed.

**Answer:** A — simple callback array. Simple beats fancy.

## Q2: Where does journey card logic live?

NavController currently owns journey card orchestration: deciding whether to show a journey card on `next()`, tracking `inJourney` state, handling "I've arrived" flow. This is navigation logic (it determines what the user sees between stops), not just rendering.

Options:
- **A) Keep journey logic in NavController** — it's genuinely navigation concern. NavController emits `onJourneyStart(destinationStop)` and `onJourneyEnd(destinationIndex)` events instead of calling StopCard directly.
- **B) Move journey logic to JourneyStateManager** — extend the existing state machine with journey as a sub-state of `in_transit`.
- **C) Extract to a separate JourneyController** — new class owning the in-journey/not-in-journey state.

Leaning toward **A** — journey flow is a navigation decision ("what happens when the user presses Next"). Moving it out would split navigation logic across two places.

**Answer:** A — keep in NavController, emit events. No need for a separate state manager for this.

## Q3: NavController and Breadcrumb

NavController currently calls `breadcrumb.markVisited()` when navigating forward. This is a side effect of navigation.

Options:
- **A) Keep in NavController** — marking visited is a direct consequence of "user left this stop". NavController emits the event, but also marks visited itself since it knows the navigation happened.
- **B) Move to subscriber** — NavController emits `onLeaveStop(stopId)`, the orchestrator (or TourSession) calls `breadcrumb.markVisited()`.
- **C) Move to TourSession** — TourSession owns visited state and Breadcrumb becomes its persistence layer.

Leaning toward **C** — visited state is tour session state. TourSession wraps Breadcrumb internally, exposes `markVisited()` and `getVisited()`. This eliminates the "visited state in 3 places" problem. NavController calls `tourSession.markVisited()` on forward navigation.

**Answer:** C — TourSession owns visited state.

## Q4: StopCard decomposition — how far?

Current StopCard has 6 render methods. Options:

- **A) Separate files, shared function pattern** — `renderStopCard(container, stop, ...)`, `renderWelcomeCard(container, options)`, etc. Pure functions that take the container element. StopCard.ts becomes a thin wrapper calling the right one.
- **B) Separate classes** — `WelcomeCard`, `JourneyCard`, `GettingHereCard`, `AboutCard`, `GoodbyeCard`, `StopCardRenderer`. Each owns its rendering logic. The orchestrator picks which to instantiate.
- **C) Keep StopCard as coordinator class, extract render bodies** — StopCard keeps its state (navPreference, tourNavMode, etc.) and delegates the actual DOM building to renderer functions in separate files.

Leaning toward **C** — StopCard has meaningful state (navPreference, startingStopIndex, suppressGettingHereNote) that the stop card renderer needs. System cards (welcome, goodbye, getting here, about) are stateless and can be pure functions. Journey card needs navPreference. So: StopCard keeps state for stop + journey rendering, system cards become standalone functions.

**Answer:** Revised — CardHost owns the container element (clear, scroll reset, aria). Separate renderers: StopCardRenderer and JourneyCardRenderer (stateful, own navPreference etc.), plus stateless render functions for welcome, goodbye, getting here, about. Orchestrator decides which renderer to invoke.

## Q5: Layout abstraction — worth it now?

The mobile/desktop branching in index.ts is a ~120-line conditional. Options:

- **A) Extract to layout builder functions** — `buildMobileLayout(container, mapPane, ...)` and `buildDesktopLayout(container, mapPane, ...)` that return a `LayoutComponents` object. No interface/strategy pattern, just two functions.
- **B) Full strategy pattern** — `MobileLayout` and `DesktopLayout` classes implementing a `Layout` interface.
- **C) Leave as-is** — the branching happens once at init and the rest of the code checks `isMobile` / `mapPanel !== null`. Extracting it adds indirection without much testability gain since the layout code is inherently DOM-heavy.

Leaning toward **A** — it reduces index.ts size and groups layout concerns, but doesn't over-engineer. The returned `LayoutComponents` bag gives the orchestrator what it needs without the components knowing about the strategy.

**Answer:** A — two builder functions, one for mobile, one for desktop.

## Q6: File organisation

Should extracted modules go into new directories or stay flat?

- **A) New directories** — `src/session/TourSession.ts`, `src/card/renderers/WelcomeCard.ts`, `src/orchestrator/JourneyHandler.ts`
- **B) Flat in existing directories** — `src/navigation/TourSession.ts`, `src/card/WelcomeCard.ts`, journey handler stays in `src/journey/`
- **C) Minimal moves** — new files in the most logical existing directory, don't create new directories unless there are 3+ files going there

Leaning toward **C** — the codebase is already well-organised. TourSession fits in `src/session/` (new, but justified). Card renderers fit in `src/card/`. Orchestrator pieces fit alongside `index.ts` or in `src/layout/`.

**Answer:** File structure should reflect the architecture. Organise by what the code does, not by convention.

## Q7: computeTourOrder and getEndIndex

These pure functions currently live as closures in index.ts. They're core tour logic. Should they:

- **A) Move to TourSession** — as methods. TourSession computes and exposes `tourOrder` and `endIndex` as derived state.
- **B) Move to a utility module** — `src/tour/tourOrder.ts` or similar. TourSession calls them internally.
- **C) Both** — utility functions exist for testing, TourSession uses them and exposes computed results.

Leaning toward **A** — these are derived from TourSession state (startIndex + reversed + stop count). They belong as computed properties on TourSession, not standalone utilities.

**Answer:** A — methods on TourSession.
