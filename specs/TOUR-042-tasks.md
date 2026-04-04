# TOUR-042 — Task Breakdown

## Task 1: TourSession — state owner (medium)

**Scope:** Create `src/session/TourSession.ts` — the single source of truth for tour configuration state.

**Deliverables:**
- `TourSession` class with: `startIndex`, `reversed`, `currentStopIndex`, `overviewSelectedIndex`
- Computed properties: `tourOrder` (circular permutation), `endIndex`
- Visited state: wraps `Breadcrumb` internally, exposes `markVisited(stopId)`, `getVisited()`, `clear()`
- `onChange(cb)` / `offChange(cb)` subscription mechanism
- `reset()` to reinitialise for new tour start
- `setStartIndex()`, `setReversed()`, `setOverviewSelection()`, `setCurrentStop()` — each recomputes derived state and notifies

**Acceptance criteria:**
- Unit tests for: order computation (forward/reverse, various start indices), end index calculation, visited delegation to Breadcrumb, onChange fires on every mutation, reset clears state
- `computeTourOrder` and `getEndIndex` logic moved from index.ts closures, tested directly
- Breadcrumb is constructed internally, not passed in

**Dependencies:** None
**Files:** `src/session/TourSession.ts`, `tests/unit/TourSession.test.ts`

---

## Task 2: Card renderers — extract from StopCard (medium)

**Scope:** Split StopCard.ts into CardHost + individual renderers.

**Deliverables:**
- `src/card/CardHost.ts` — owns container, `render(fn)` clears and delegates
- `src/card/StopCardRenderer.ts` — `render()` and `renderJourney()` extracted from StopCard, with state (navPreference, startingStopIndex, suppressGettingHereNote, tourNavMode, nextCallback, returnToStartCallback)
- `src/card/JourneyCardRenderer.ts` — `renderJourney()` extracted, owns navPreference + tourNavMode
- `src/card/WelcomeCard.ts` — `renderWelcomeCard(container, options)` function
- `src/card/GoodbyeCard.ts` — `renderGoodbyeCard(container, options)` function
- `src/card/GettingHereCard.ts` — `renderGettingHereCard(container, options)` function
- `src/card/AboutCard.ts` — `renderAboutCard(container, options)` function
- Delete `src/card/StopCard.ts`

**Approach:** Copy render method bodies as-is first. Verify existing behaviour preserved. Then clean up imports.

**Acceptance criteria:**
- Each renderer produces identical DOM to the original StopCard method (verified by unit tests)
- Unit tests for each stateless renderer (render into a container, assert expected DOM structure)
- StopCardRenderer and JourneyCardRenderer unit tests verify state is respected (startingStopIndex hides getting_here, suppressGettingHereNote works, etc.)
- `src/card/StopCard.ts` no longer exists
- No file exceeds 250 lines

**Dependencies:** None (can run in parallel with Task 1)
**Files:** `src/card/CardHost.ts`, `src/card/StopCardRenderer.ts`, `src/card/JourneyCardRenderer.ts`, `src/card/WelcomeCard.ts`, `src/card/GoodbyeCard.ts`, `src/card/GettingHereCard.ts`, `src/card/AboutCard.ts`, `tests/unit/StopCardRenderer.test.ts`, `tests/unit/WelcomeCard.test.ts`, `tests/unit/GoodbyeCard.test.ts`, `tests/unit/GettingHereCard.test.ts`, `tests/unit/AboutCard.test.ts`

---

## Task 3: NavController simplification (medium)

**Scope:** Remove direct component dependencies from NavController. It reads from TourSession and emits events.

**Deliverables:**
- New constructor: `NavController(tour, session)` — no MapView, StopCard, Breadcrumb, navEl, stopListEl
- Remove `renderNav()`, `renderStopList()`, `updateStopList()`, `updateNavButtons()` — these move to StopListOverlay or are no longer needed
- Remove `setStartIndex()`, `setReversed()`, `setTourOrder()` — reads from session
- Add event emitters: `onNavigate(cb)`, `onJourneyStart(cb)`, `onJourneyEnd(cb)`, `onTourEnd(cb)`
- `next()` — reads session.startIndex/reversed to compute next index, calls session.markVisited(), emits onNavigate or onJourneyStart or onTourEnd
- `prev()` — reads session state, emits onNavigate
- `goTo(index)` — emits onNavigate
- `returnToStart()` — emits onNavigate or onJourneyStart for the start stop

**Acceptance criteria:**
- NavController tests rewritten: test navigation logic (circular wrapping, reverse, journey flow, return-to-start) via emitted events, not mock verification
- No imports of MapView, StopCard, or Breadcrumb in NavController
- All navigation edge cases preserved: circular tour, reversed mode, journey card gating, return-to-start with/without journey content, single-stop tour

**Dependencies:** Task 1 (TourSession)
**Files:** `src/navigation/NavController.ts`, `tests/unit/NavController.test.ts`

---

## Task 4: Layout builders (small)

**Scope:** Extract mobile and desktop DOM construction from index.ts into separate builder functions.

**Deliverables:**
- `src/layout/buildMobileLayout.ts` — `buildMobileLayout(container, mapPane, menuBar, progressBar, cardEl, stopListWrapper)` returns `LayoutComponents`
  - Creates cardView, scrollHint, MapPanel, MutationObservers for card header injection and padding updates
  - Returns: mapPanel, resetScrollHint, cardView element
- `src/layout/buildDesktopLayout.ts` — `buildDesktopLayout(container, mapPane, menuBar, progressBar, sheetContentEl)` returns `LayoutComponents`
  - Moves menu bar and progress bar into sheet content, creates BottomSheet
  - Returns: sheet, sheetContentEl
- `LayoutComponents` interface in `src/layout/types.ts`

**Acceptance criteria:**
- index.ts no longer contains the mobile/desktop DOM construction if/else block
- Layout builders are pure functions (no side effects beyond DOM manipulation on the passed container)
- Existing layout tests (MapPanel, BottomSheet) unaffected

**Dependencies:** None (can run in parallel with Tasks 1-3, but integration into index.ts happens in Task 6)
**Files:** `src/layout/buildMobileLayout.ts`, `src/layout/buildDesktopLayout.ts`, `src/layout/types.ts`

---

## Task 5: Journey state handler extraction (small)

**Scope:** Extract the 125-line `journeyState.onStateChange` callback from index.ts into a standalone function.

**Deliverables:**
- `src/orchestrator/journeyHandler.ts` — `createJourneyHandler(deps): (state, stopIndex) => void`
- `deps` is a typed object with references to: session, cardHost, stopCardRenderer, journeyCardRenderer, mapView, mapPanel, sheet, menuBar, progressBar, overviewControls, stopListOverlay, transitBar, navController, resetScrollHint, isMobile, tour, renderWelcome/renderGoodbye functions
- Handler function contains the same if/else state logic, but reads from deps instead of closures

**Acceptance criteria:**
- The handler function is independently importable and testable
- index.ts calls `createJourneyHandler(deps)` and passes the result to `journeyState.onStateChange()`
- No behavioural change in state transitions

**Dependencies:** Tasks 1, 2, 3 (needs TourSession, card renderers, NavController interfaces)
**Files:** `src/orchestrator/journeyHandler.ts`

---

## Task 6: Wire it all together in index.ts (medium)

**Scope:** Rewrite index.ts to use TourSession, CardHost + renderers, simplified NavController, layout builders, and extracted journey handler.

**Deliverables:**
- index.ts uses layout builder for DOM construction
- Creates TourSession, subscribes components to it
- Wires NavController events (onNavigate → update card via CardHost + StopCardRenderer, update MapView, etc.)
- Wires menu actions to card renderers via CardHost
- Wires overview controls to TourSession mutations
- GPS integration wired to TourSession (overview selection via session.setOverviewSelection)
- Replaces all direct state management (tourStartIndex, tourReversed, currentTourOrder, overviewSelectedIndex variables) with TourSession reads

**Acceptance criteria:**
- index.ts ≤ 250 lines
- No state variables for tour config in index.ts (all in TourSession)
- All 218 tests pass (with NavController tests rewritten per Task 3)
- `npm run build` succeeds, bundle entry point unchanged
- Manual verification: tour loads, welcome card renders, overview works, navigation works, journey cards work, GPS works, system cards work, progress bar works

**Dependencies:** Tasks 1, 2, 3, 4, 5
**Files:** `src/index.ts`

---

## Task 7: StopListOverlay gains desktop role (small)

**Scope:** StopListOverlay takes over the desktop inline stop list rendering that was previously in NavController.

**Deliverables:**
- StopListOverlay subscribes to TourSession for order/visited/active updates
- On desktop, renders inline (visible in the sheet content area) instead of as an overlay
- Remove the old `stopListEl` / `stopListWrapper` DOM construction from layout builders — StopListOverlay owns its own DOM
- StopListOverlay constructor takes a `mode: 'overlay' | 'inline'` option (or the orchestrator just doesn't use the overlay backdrop on desktop)

**Acceptance criteria:**
- Desktop stop list shows correct order, highlights active stop, shows visited state
- Mobile stop list overlay behaviour unchanged
- Tour order updates reflect in both mobile overlay and desktop inline list via TourSession subscription

**Dependencies:** Task 1 (TourSession), Task 6 (integration)
**Files:** `src/layout/StopListOverlay.ts`, `tests/unit/StopListOverlay.test.ts`

---

## Task 8: Consistency analysis and cleanup (small)

**Scope:** Final pass — verify all acceptance criteria, clean up dead code, run full test suite.

**Deliverables:**
- Remove any dead imports, unused variables, orphaned files
- Verify no file in `src/` exceeds 250 lines
- Verify NavController has no MapView/StopCard/Breadcrumb imports
- Verify Breadcrumb is only imported by TourSession
- Run `tsc --noEmit` — no type errors
- Run full test suite — all pass
- Run `npm run build` — bundle builds cleanly

**Acceptance criteria:**
- All spec acceptance criteria met (see TOUR-042-spec.md)
- Clean `git diff --stat` shows the refactor scope
- No regressions

**Dependencies:** Tasks 1-7
**Files:** All modified files

---

## Ordering Summary

```
Task 1 (TourSession) ──────────┐
Task 2 (Card renderers) ───────┤
Task 4 (Layout builders) ──────┼─→ Task 5 (Journey handler) ─→ Task 6 (Wire together) ─→ Task 7 (StopListOverlay desktop) ─→ Task 8 (Cleanup)
                                │
Task 3 (NavController) ────────┘
   └─ depends on Task 1
```

Tasks 1, 2, and 4 can run in parallel. Task 3 depends on Task 1. Tasks 5-8 are sequential.
