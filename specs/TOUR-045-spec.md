# TOUR-045 — Inline waypoint dot in narrative text

## Summary

Authors can write `:dot:` in any markdown text content block to render a small filled circle inline with the surrounding text — visually matching the active pink waypoint marker on the map. The marker colour is exposed as a CSS custom property so embedders can override it from their host stylesheet, and the change is reflected in both the inline dot and the map marker.

## Motivation

Authors writing narrative content for journey cards (and stop content generally) want to refer to the on-map waypoint markers in prose: "Head towards the :dot: on the map" reads more naturally than "head towards the pink dot on the map" and avoids drift if the dot colour ever changes. Today there is no inline notation; authors either describe the marker in words or write raw HTML.

## UX Flow

1. Author writes `:dot:` somewhere in a text content block (e.g. `Head towards the :dot: on the map`).
2. On render, the literal `:dot:` is replaced with a small filled circle inline with surrounding text, sized to the text's font size.
3. An advanced embedder may override `--maptour-waypoint-color` in their host CSS to change the dot colour. The map's active waypoint marker picks up the same colour.

## Functional Requirements

### FR-1: Inline `:dot:` syntax
- **Given** a text content block whose body contains `:dot:`
- **When** the block is rendered
- **Then** each occurrence of `:dot:` is replaced with `<span class="maptour-dot" aria-label="waypoint marker"></span>`. Surrounding text is preserved verbatim.

### FR-2: Implemented as a marked.js inline extension
- **Given** the marked.js renderer in `src/card/blocks/TextBlock.ts`
- **When** the player module loads
- **Then** a marked.js inline extension named `dot` is registered once at module-load time, matching the literal pattern `:dot:` and emitting the span above. Registration is idempotent across multiple text-block renders.

### FR-3: Markdown structure respected
- **Given** `:dot:` appearing inside a fenced code block or inline code span (e.g. ` :dot: ` between backticks, or inside a triple-backtick block)
- **When** the block is rendered
- **Then** the literal text `:dot:` is rendered as code, NOT as a span.

### FR-4: CSS variable for colour
- **Given** the player CSS
- **When** loaded
- **Then** `:root` defines `--maptour-waypoint-color: #ec4899;` (the existing active waypoint pink). The `.maptour-dot` class uses `background: var(--maptour-waypoint-color)`.

### FR-5: Map marker reads the same variable
- **Given** the active waypoint marker on the map (`MapView.setWaypoints`, the `i === activeIndex` branch)
- **When** the marker is rendered
- **Then** its `fillColor` and stroke `color` are sourced from `--maptour-waypoint-color` (read via `getComputedStyle(document.documentElement)`), with the existing default `#ec4899` as a fallback if the variable is unresolved.
- **Out of scope:** passed and future markers continue to use their existing hardcoded shades.

## Non-Functional Requirements

- The inline dot is sized in `em` units so it scales with the surrounding text.
- The dot is vertically centred on the text baseline (`vertical-align: middle` or equivalent).
- Extension registration runs once per module load; no per-render cost.
- No new runtime dependencies; uses the existing marked.js + CSS-variable facilities.

## Out of Scope

- Inline variants for passed / future waypoint states (only the active dot).
- Other inline shortcodes (`:stop:`, `:car:`, etc.) — adopt as future tickets if needed.
- Inline dots in non-markdown contexts (titles, footer labels, system labels).
- Authoring-tool UI for inserting `:dot:` — YAML / markdown only for v1.
- Customisation of the dot's size or shape via author config.

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| `:dot:` inside a fenced code block | Rendered literally as `:dot:` (marked.js extension is inline-level and respects code boundaries) |
| `:dot:` inside an inline code span | Rendered literally |
| Embedder doesn't override `--maptour-waypoint-color` | Default `#ec4899` applies; visible dot matches existing map marker — no regression for existing tours |
| Author writes `:dot:` in a non-text content block (e.g. a caption) | Rendered correctly if the field flows through `marked.parse`; otherwise rendered as the literal `:dot:` (acceptable; out of scope) |
| Multiple `:dot:` occurrences in one paragraph | Each is independently rendered as its own span |

## Acceptance Criteria

1. **Inline rendering.** A text block with body `Head towards the :dot: on the map` renders one `.maptour-dot` span with `aria-label="waypoint marker"` between the words "the" and "on", and the surrounding text is intact.
2. **Code-block protection.** `` `:dot:` `` (inline code) and a triple-backtick block containing `:dot:` both render the literal string, not a span.
3. **CSS-variable colour.** `--maptour-waypoint-color` defaults to `#ec4899`. Setting it on `:root` (or on a host element that contains `.maptour-dot`) changes the rendered dot's background.
4. **Map marker stays in sync.** Overriding `--maptour-waypoint-color` and re-rendering a tour with waypoints causes the active waypoint marker on the map to use the overridden colour. Default colour is unchanged for tours that don't override.
5. **No regression on existing 525 tests.** New unit test covers AC-1 (basic substitution) and AC-2 (code-block protection).

## Test Approach

- **Unit:** Test `renderTextBlock` for the `:dot:` substitution and code-block exemption.
- **Manual:** Add `:dot:` to one content block in `demo/tour.yaml`, verify it renders inline at the expected size and matches the map dot. In dev tools, override `--maptour-waypoint-color` on `:root` and confirm both the inline dot and the active map marker update.
