# TOUR-044 — Explicit scroll indicator (`tour.scroll_hint`)

## Summary

Tour-level YAML field `tour.scroll_hint: 'auto' | 'always' | 'off'` lets authors override the default scroll-hint rendering on the mobile player. `'always'` forces the explicit text+chevron strip (the existing `prefers-contrast: more` visual) for every visitor; `'off'` suppresses the indicator entirely. Authoring tool gains a 3-way control in the tour-level settings panel.

## Motivation

The mobile player paints a fade-to-surface gradient at the bottom of the stop card to hint that there is more content. The gradient is intentionally subtle so it doesn't distract on tours where most cards are short. Visitors with `prefers-contrast: more` already get an explicit text strip instead.

Two situations aren't covered today:
- Tours aimed at older / less digitally-confident audiences want the explicit strip on by default for everyone, regardless of the visitor's OS contrast preference.
- Tours with deliberately short cards want to suppress the hint entirely so the chrome stays clean.

## UX Flow

1. Author sets `tour.scroll_hint` (or selects an option in the authoring tool's tour settings panel: **Auto**, **Always shown**, **Off**).
2. On mobile, the visitor experiences:
   - **Auto** (default): existing fade gradient; explicit strip when `prefers-contrast: more` matches.
   - **Always shown**: explicit text+chevron strip on every stop, regardless of OS contrast preference.
   - **Off**: no scroll hint element rendered at all.
3. Desktop layout is untouched (no scroll hint exists there today).

## Functional Requirements

### FR-1: YAML field
- **Given** a tour YAML
- **When** the top-level `tour` block includes `scroll_hint`
- **Then** the value MUST be one of `'auto'`, `'always'`, or `'off'`. Absence is equivalent to `'auto'`. Any other value fails Zod validation with the standard tour-load error path.

### FR-2: `'auto'` (default) rendering
- **Given** `tour.scroll_hint` is `'auto'` or absent
- **When** the mobile layout is built
- **Then** behaviour is identical to v1.4.1 — a `.maptour-scroll-hint` element with the existing fade gradient + auto-hide observers; the explicit strip is applied via the existing `@media (prefers-contrast: more)` rule when active.

### FR-3: `'always'` rendering
- **Given** `tour.scroll_hint` is `'always'`
- **When** the mobile layout is built
- **Then** the `.maptour-scroll-hint` element bears an additional modifier class `.maptour-scroll-hint--always`, the CSS for that selector matches the explicit-strip styling already used by the `@media (prefers-contrast: more)` rule, and the existing auto-hide observers are wired as in `'auto'` mode.

### FR-4: `'off'` rendering
- **Given** `tour.scroll_hint` is `'off'`
- **When** the mobile layout is built
- **Then** no `.maptour-scroll-hint` element is appended, no scroll listener or `MutationObserver` is registered for scroll-hint purposes, and `layout.resetScrollHint` returns `null` (matching the desktop contract in `buildDesktopLayout.ts`).

### FR-5: Authoring control + round-trip
- **Given** the authoring tool's tour settings panel (alongside `nav_mode`, `arrival_radius`)
- **When** the author opens the panel
- **Then** a 3-way "Scroll hint" control offers **Auto**, **Always shown**, **Off**, with a one-line tip per option.
- Saving emits `tour.scroll_hint: always` (or `off`) verbatim for non-default values; emits no `scroll_hint` field when the resolved value is `'auto'` (default canonicalisation — keeps generated YAML minimal).
- Loading a tour with any of the three values displays the corresponding control state. A previously-saved non-default value switched to "Auto" in the editor is removed from the next save (no stale-field leak).

## Non-Functional Requirements

- No new i18n strings (reuses existing `scroll_more` key; existing player↔authoring i18n parity test continues to pass).
- No new runtime dependencies.
- `'off'` mode adds zero idle work — no element, no observers, no listeners.

## Out of Scope

- Per-stop overrides (no `stop.scroll_hint`).
- Desktop scroll indicator (no scroll hint exists on desktop today).
- Visual variants for `'always'` beyond the existing explicit-strip style.
- Custom scroll-hint text per tour (authors can already override `scroll_more` via `tour.strings`).

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| Invalid enum value (e.g. `scroll_hint: maybe`) | Zod validation fails at tour load, standard error display |
| Wrong type (`true`, `1`, etc.) | Zod validation fails at tour load |
| `'always'` on a short card with no overflow | Existing auto-hide rule still applies — strip hides itself when `!hasOverflow`; "always" means "render this visual when applicable", not "force visible" |
| Authoring tool encounters newer-player-only value | Authoring tool's load path rejects it (uses the same enum members the player ships with); author sees a clear error |

## Acceptance Criteria

1. **Default unchanged.** A tour with no `scroll_hint` field renders identically to v1.4.1 in jsdom mobile-layout tests (DOM, classes, observers).
2. **`'always'` adds the modifier.** A tour with `scroll_hint: 'always'` renders a single `.maptour-scroll-hint` element bearing `.maptour-scroll-hint--always`. Existing auto-hide rules still apply.
3. **`'off'` removes everything.** A tour with `scroll_hint: 'off'` produces no `.maptour-scroll-hint` element, no scroll listener on `cardEl`, no MutationObserver, and `layout.resetScrollHint === null`.
4. **Schema validates.** The Zod tour schema accepts `'auto'`, `'always'`, `'off'`, and absence; rejects any other value or wrong type with an error naming the field.
5. **Round-trip preserves values.** Authoring tool: loading `scroll_hint: 'always'` shows "Always shown"; saving emits `scroll_hint: always`. Same for `'off'`. `'auto'` (or absent) shows "Auto" and saves with the field omitted.
6. **No stale-field leak.** Loading a tour with `scroll_hint: 'always'`, switching the control to "Auto" in the same session, then saving produces YAML with no `scroll_hint` field.
7. **No i18n drift.** Existing player↔authoring i18n parity test still passes (no new strings introduced).

## Test Approach

- **Unit (player):** Schema validation tests for the five accept/reject cases. Mobile-layout tests under jsdom for each of the three modes asserting the DOM shape from AC-1–AC-3.
- **Unit (authoring):** YAML round-trip tests covering AC-5 and AC-6, plus a load-time validation test for the invalid-value failure mode.
- **Manual:** Open the demo with each setting and confirm the visual behaviour on mobile (Auto with and without OS high-contrast, Always shown, Off).

## Notes

- The CSS for `.maptour-scroll-hint--always` should share its property body with the existing `@media (prefers-contrast: more) .maptour-scroll-hint` rule — comma-separated selector list, shared CSS variable, or any factoring that single-sources the values. This is a code-review check, not an automated test (jsdom can't reliably evaluate `prefers-contrast` media queries).
