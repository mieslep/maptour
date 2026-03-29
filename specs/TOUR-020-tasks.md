# TOUR-020 — Task Breakdown

## Task 1: Data model and validation (small)
**Scope:** Add `welcome` and `goodbye` to types and loader validation.
**Files:** `src/types.ts`, `src/loader.ts`, `tests/unit/loader.test.ts`
**Acceptance:**
- `TourMeta` has optional `welcome?: ContentBlock[]` and `goodbye?: ContentBlock[]`
- Loader validates content blocks in welcome/goodbye using existing `validateContentBlock()`
- Empty arrays and missing fields pass validation
- Invalid block types in welcome/goodbye produce clear error messages
- Unit tests cover: valid welcome, valid goodbye, empty arrays, invalid blocks
**Dependencies:** None

## Task 2: TourStartScreen welcome content (small)
**Scope:** Render welcome content blocks on the start screen.
**Files:** `src/layout/TourStartScreen.ts`, `styles/maptour.css`
**Acceptance:**
- If `welcome` blocks are provided, they render between the description/meta and the CTA button
- Content is scrollable if it exceeds viewport
- Without `welcome`, screen is unchanged
- All five block types render correctly
**Dependencies:** Task 1

## Task 3: TourCompleteScreen goodbye content (small)
**Scope:** Render goodbye content blocks on the completion screen.
**Files:** `src/layout/TourCompleteScreen.ts`, `styles/maptour.css`
**Acceptance:**
- If `goodbye` blocks are provided, they render between the visited count and the action buttons
- Content is scrollable if it exceeds viewport
- Without `goodbye`, screen is unchanged
**Dependencies:** Task 1

## Task 4: Wire through index.ts and update demo (small)
**Scope:** Pass welcome/goodbye from tour data to screens. Update demo YAML.
**Files:** `src/index.ts`, `demo/tour.yaml`, `demo/maptour.js`, `demo/maptour.css`
**Acceptance:**
- index.ts passes `tour.tour.welcome` to TourStartScreen and `tour.tour.goodbye` to TourCompleteScreen
- Demo tour YAML includes sample welcome and goodbye content
- Visual check passes on mobile (390×844) and desktop (1400×800)
**Dependencies:** Tasks 2, 3
