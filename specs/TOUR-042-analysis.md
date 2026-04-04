# TOUR-042 — Consistency Analysis

## Spec ↔ Plan Alignment

| Spec Requirement | Plan Coverage | Status |
|---|---|---|
| FR-1: TourSession single source of truth | TourSession class in `src/session/` with onChange subscription | ✅ Covered |
| FR-2: Orchestrator decomposition | Layout builders, journeyHandler extraction, index.ts ~200 lines | ✅ Covered |
| FR-3: NavController simplification | New constructor `(tour, session)`, event emitters, no component deps | ✅ Covered |
| FR-4: StopCard decomposition | CardHost + 6 renderers (2 stateful, 4 stateless functions) | ✅ Covered |
| FR-5: Behavioural equivalence | Extract-as-is approach, full test suite, manual verification | ✅ Covered |
| Zero bundle size regression | No new dependencies | ✅ Covered |
| No API changes | MapTour.init signature unchanged | ✅ Covered |

## Plan ↔ Tasks Alignment

| Plan Component | Task | Status |
|---|---|---|
| TourSession | Task 1 | ✅ |
| CardHost + Renderers | Task 2 | ✅ |
| NavController simplification | Task 3 | ✅ |
| Layout builders | Task 4 | ✅ |
| Journey handler extraction | Task 5 | ✅ |
| Orchestrator rewrite | Task 6 | ✅ |
| StopListOverlay desktop role | Task 7 | ✅ |
| Cleanup / verification | Task 8 | ✅ |

## Potential Issues

### 1. JourneyCardRenderer vs NavController journey logic

The plan has NavController emitting `onJourneyStart(destinationStop, onArrived)`. The `onArrived` callback is currently constructed inside NavController (it calls `goTo(nextIndex)` with suppressGettingHereNote). After refactor, NavController still constructs this callback — it calls `session.setCurrentStop()` and emits `onNavigate`. The orchestrator, on receiving `onJourneyStart`, calls `journeyCardRenderer.render(destinationStop, onArrived)` via CardHost.

**Risk:** The `onArrived` callback needs to both update session state AND trigger a card render. NavController can do the state part; the orchestrator needs to handle the render. This means `onArrived` as emitted by NavController is incomplete — the orchestrator wraps it.

**Resolution:** NavController emits `onJourneyStart(destinationStop, journeyDestIndex)`. The orchestrator constructs the full `onArrived` callback: calls `navController.goTo(journeyDestIndex)` which then emits `onNavigate`, which triggers the card render. This keeps NavController focused on navigation and the orchestrator on rendering.

### 2. StopCard state dependencies during transition

Task 2 extracts card renderers but Task 6 rewires them. Between Tasks 2 and 6, the codebase needs a compatibility layer — the old call sites in index.ts reference `stopCard.renderWelcome()` etc.

**Resolution:** Task 2 can export a backward-compatible `StopCard` facade that delegates to the new renderers. Task 6 removes the facade and calls renderers directly. Alternatively, Tasks 2 and 6 can be done as a single commit sequence — extract renderers and update call sites together.

**Decision:** Do Task 2 as extraction only (new files created, old StopCard.ts still exists but with bodies replaced by delegations). Task 6 removes the facade. This keeps each task independently testable.

### 3. MapView visited state cache removal

Plan says MapView should no longer cache `visitedStopIds` — it reads from session. But MapView.renderPins() needs visited state synchronously. TourSession.getVisited() returns a new Set each time (Breadcrumb does `new Set(this.visited)`).

**Resolution:** MapView subscribes to TourSession.onChange, calls `this.renderPins()` in the callback. renderPins() calls `session.getVisited()` each time. This is fine — renderPins() is called on user interactions, not animation frames. The Set copy is cheap for 16-20 stops.

### 4. Test file for old NavController

Task 3 rewrites NavController tests. The old test file mocks MapView and StopCard. The new tests should mock TourSession (simple state object) and verify events.

**Verified:** No other test file imports NavController, so the rewrite is self-contained.

### 5. OverviewControls unused parameters

OverviewControls.update() currently takes `(_totalStops, _stopName)` parameters that are unused. When it subscribes to TourSession, these parameters go away naturally.

**Resolution:** Clean up in Task 8.

## Constitution Compliance

- **Static-first:** No server dependencies added. ✅
- **Embeddability:** CSS class names unchanged, no global styles. ✅
- **Testing:** New tests for extracted modules, rewritten NavController tests. ✅
- **i18n:** No changes to i18n system. ✅

## Conclusion

Spec, plan, and tasks are consistent. Two integration risks identified (journey callback wiring, transition-period facade) with clear resolutions. No constitution conflicts. Ready for implementation.
