# TOUR-022 — Task Breakdown

## Task 1: Data model and validation (small)
**Scope:** Add `journey` to the `Leg` type and validate in the loader.
**Files:** `src/types.ts`, `src/loader.ts`, `tests/unit/loader.test.ts`
**Acceptance:**
- `Leg.journey` is an optional `ContentBlock[]`
- Loader validates journey content blocks using existing `validateContentBlock()`
- Empty array and missing field pass validation
- Invalid block types produce clear error messages
- Unit tests cover: valid journey, empty, invalid blocks
**Dependencies:** None

## Task 2: StopCard journey rendering (small)
**Scope:** Add a `renderJourney()` method to StopCard for journey card display.
**Files:** `src/card/StopCard.ts`, `styles/maptour.css`
**Acceptance:**
- `renderJourney(gettingHere, onArrived)` renders: getting_here note at top, journey content blocks, "I've arrived" button at bottom
- Card scrolls to top on render
- "I've arrived" fires the callback
- All content block types work
- Styled distinctly from stop cards (accent colour on the arrived button)
**Dependencies:** Task 1

## Task 3: NavController journey interception (medium)
**Scope:** Intercept `next()` to show journey card when destination has journey content.
**Files:** `src/navigation/NavController.ts`
**Acceptance:**
- `next()` checks if destination stop has `getting_here.journey` content
- If yes: renders journey card via `stopCard.renderJourney()`, tracks transient journey state
- `arrivedFromJourney()`: advances to destination stop card
- Prev during journey: returns to origin stop, clears journey state
- Next arrow during journey: skips to destination stop (same as arrived)
- Journey state is transient (not persisted in localStorage)
**Dependencies:** Task 2

## Task 4: Wire header label and index.ts updates (small)
**Scope:** Update header bar to show "EN ROUTE" during journey.
**Files:** `src/index.ts`
**Acceptance:**
- Header label shows "EN ROUTE" when a journey card is active
- Returns to "STOP N / M" when journey completes (arrived or skipped)
- Prev/Next arrows work correctly during journey
**Dependencies:** Task 3

## Task 5: Demo YAML and visual testing (small)
**Scope:** Add journey content to demo tour, test on mobile and desktop.
**Files:** `demo/tour.yaml`, `demo/maptour.js`, `demo/maptour.css`
**Acceptance:**
- At least one stop in the demo has `getting_here.journey` with text and image content
- Journey card renders correctly on mobile (390×844) and desktop (1400×800)
- Full flow: stop card → Next → journey card → I've arrived → stop card
- Skip flow: stop card → Next → journey card → Next arrow → stop card (journey skipped)
- Prev flow: journey card → Prev → origin stop card
**Dependencies:** Task 4
