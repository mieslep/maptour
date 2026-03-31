# TOUR-030 — Font Awesome Icons

## Summary

Replace all emoji icons in the player with Font Awesome icons for consistent rendering across platforms and devices. Add Font Awesome as a dependency.

## Motivation

Emoji rendering varies significantly across operating systems, browsers, and devices. The walking person on Android looks different from iOS, some browsers render colour emoji while others show monochrome outlines, and older devices may not support newer emoji at all. Font Awesome provides consistent, scalable vector icons that look the same everywhere and can be styled with CSS.

## Current Icon Usage

| Location | Current | Proposed FA Icon | Context |
|----------|---------|------------------|---------|
| Nav mode: walk | 🚶 emoji | `fa-person-walking` | Getting here mode indicator |
| Nav mode: drive | 🚗 emoji | `fa-car` | Getting here mode indicator |
| Nav mode: transit | 🚌 emoji | `fa-bus` | Getting here mode indicator |
| Nav mode: cycle | 🚲 emoji | `fa-bicycle` | Getting here mode indicator |
| GPS position | 🧍 emoji | `fa-location-dot` or `fa-person` | User position on map |
| Prev arrow | `‹` character | `fa-chevron-left` | Header navigation |
| Next arrow | `›` character | `fa-chevron-right` | Header navigation |
| External nav | 📍 emoji | `fa-diamond-turn-right` | Open in maps app button |
| Nav pin button | Inline SVG (map pin) | `fa-location-dot` | Satnav pin on stop/journey card |
| Nav arrow button | Inline SVG (arrow) | `fa-diamond-turn-right` | Satnav directional arrow |
| Stop list FAB | Inline SVG (list) | `fa-list` or `fa-bars` | Mobile stop list overlay button |

## Functional Requirements

### FR-1: Add Font Awesome dependency
- **Given** the player build process
- **When** Font Awesome is added
- **Then** it is available as a CSS/webfont or SVG+JS dependency, loaded with the player bundle

### FR-2: Replace navigation mode icons
- **Given** a stop has `getting_here.mode` set
- **When** the stop card or journey card renders
- **Then** the mode icon uses the corresponding Font Awesome icon instead of an emoji

### FR-3: Replace GPS marker icon
- **Given** the GPS position marker is rendered on the map
- **When** the marker is visible
- **Then** it uses a Font Awesome icon instead of the 🧍 emoji

### FR-4: Replace navigation arrows
- **Given** the header bar renders Prev/Next arrows
- **When** the arrows are displayed
- **Then** they use `fa-chevron-left` and `fa-chevron-right` instead of arrow characters

### FR-5: Replace inline SVG icons
- **Given** the nav button (NavButton.ts) uses inline SVG for the pin and arrow icons
- **When** the button renders
- **Then** it uses Font Awesome icons instead of the hand-coded SVG paths
- The stop list FAB (StopListOverlay.ts) also uses inline SVG which should be replaced

### FR-6: Replace external nav icon
- **Given** the "open in maps" button renders
- **When** the button is displayed
- **Then** it uses a Font Awesome icon instead of 📍

### FR-7: Icon styling
- **Given** Font Awesome icons are rendered
- **When** the player is displayed
- **Then** icons inherit the surrounding text colour and size, matching the existing visual weight of the emoji they replace

## Non-Functional Requirements

- Use Font Awesome Free (not Pro) to avoid licensing costs
- Prefer the SVG+JS approach or CSS webfont — whichever is smaller for the icons used
- If only a small subset of icons is needed, consider tree-shaking or subsetting to minimise bundle size
- Icons must be accessible: include `aria-hidden="true"` on decorative icons, `aria-label` on functional ones (e.g. navigation arrows)
- No visual regression — icons should be similar in size and position to the emoji they replace

## Out of Scope

- Replacing icons in the YAML content itself (author-provided emoji in text blocks)
- Adding new icons beyond the current emoji set
- Font Awesome Pro icons
- Icon animations (e.g. pulsing GPS marker)

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| Font Awesome fails to load (CDN down, offline) | Fall back to the original emoji characters |
| Unknown getting_here.mode value | Use a generic icon (`fa-route` or similar) |
| Icon font blocked by CSP | Ensure CSP headers allow the font source; document required CSP directives |

## Acceptance Criteria

1. All emoji and inline SVGs listed in the table above are replaced with Font Awesome icons
2. Icons render identically on Chrome, Safari, Firefox (desktop and mobile)
3. Font Awesome Free is added as a project dependency
4. Navigation arrows are `fa-chevron-left` / `fa-chevron-right`
5. GPS marker uses a Font Awesome icon on the Leaflet map
6. Fallback to emoji if Font Awesome fails to load
7. Bundle size increase is documented (target: <50 KB for the icon subset)
8. Decorative icons have `aria-hidden="true"`; functional icons have `aria-label`

## Test Approach

- **Unit**: Icon renderer outputs correct FA class for each mode; fallback logic when FA is unavailable
- **Integration**: Full tour renders with FA icons in all locations; no missing or broken icons
- **Manual**: Cross-browser visual check (Chrome, Safari, Firefox on desktop and mobile); verify offline fallback
