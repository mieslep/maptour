# TOUR-020 — Architecture Plan

## Approach

Minimal-touch integration. Welcome/goodbye content uses existing `ContentBlock` types and existing block renderers. The only new code is in the start/complete screen components and the type definitions.

## Data Model Changes

### types.ts
Add optional `welcome` and `goodbye` to `TourMeta`:
```typescript
export interface TourMeta {
  // ... existing fields
  welcome?: ContentBlock[];
  goodbye?: ContentBlock[];
}
```

### loader.ts
Validate `tour.welcome` and `tour.goodbye` as optional content block arrays, reusing `validateContentBlock()`.

## Component Changes

### TourStartScreen.ts
- Accept optional `welcome: ContentBlock[]` in options
- If present, render blocks (using existing `renderBlock()` functions) in a scrollable container between the description and the CTA button
- Import block renderers (text, image, gallery, video, audio)

### TourCompleteScreen.ts
- Accept optional `goodbye: ContentBlock[]` in options
- If present, render blocks between the visited count and the action buttons
- Import block renderers

### index.ts
- Pass `tour.tour.welcome` to TourStartScreen
- Pass `tour.tour.goodbye` to TourCompleteScreen

## CSS Changes

### maptour.css
- `.maptour-start__welcome` — scrollable content area within start screen
- `.maptour-complete__goodbye` — scrollable content area within complete screen
- Both reuse existing `.maptour-block` styles (already global)

## Files Modified

| File | Change |
|------|--------|
| `src/types.ts` | Add `welcome?` and `goodbye?` to `TourMeta` |
| `src/loader.ts` | Validate welcome/goodbye content blocks |
| `src/layout/TourStartScreen.ts` | Render welcome blocks |
| `src/layout/TourCompleteScreen.ts` | Render goodbye blocks |
| `src/index.ts` | Pass welcome/goodbye through |
| `styles/maptour.css` | Welcome/goodbye container styles |
| `demo/tour.yaml` | Add sample welcome/goodbye content |
| `tests/unit/loader.test.ts` | Validation tests |

## Risks

- **Block renderers are imported from card/blocks/**: These are currently only used inside StopCard. They need to work standalone (no card-specific context). Review: they take a `ContentBlock` and return an `HTMLElement` — should be fine.
- **Start/complete screen scrolling**: Welcome content could push the CTA below the fold on mobile. The screens already have `overflow-y: auto` on their body containers, so this should scroll naturally.

## Consistency Check

- No conflict with constitution (zero-backend, static-first, YAML-driven)
- No conflict with system architecture (reuses existing modules)
- No conflict with TOUR-021 or TOUR-022 (those extend the journey model; this only touches bookend screens)
