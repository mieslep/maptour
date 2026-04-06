# TOUR-043 — Waypoints & Native App

**Status:** Draft
**Branch:** `TOUR-043-waypoints-native-app`
**Dependencies:** TOUR-042 (architecture refactor)

---

## Problem Statement

Tour visitors walking between stops have no in-app guidance. The current experience is: finish a stop card, see a polyline on the map, then either mentally navigate or deep-link out to a native maps app (losing the tour context). GPS-based tracking in mobile browsers is unreliable — permission is often denied, and background tracking doesn't work when the tab is backgrounded.

**This feature solves two problems:**
1. **Between-stop navigation** — give visitors authored waypoints along each leg so they can follow the route without leaving the app
2. **Native app distribution** — wrap the player in a Capacitor shell so GPS tracking, background location, and waypoint proximity alerts work reliably; provide an "open in MapTour" path for tour creators

---

## Personas Affected

### Tour Author
New capability: authors can define waypoints along each leg — key turns, landmarks, or points of interest between stops. These are simple entries in the YAML file (coords, directional text, optional photo). Waypoints guide visitors between stops: "Head up the hill towards the red house", "Cross the footbridge", etc.

### Tour Visitor (browser)
Sees waypoints as small circles on the polyline. The map zooms to show the segment from the current position to the next waypoint, with the waypoint's guidance text displayed. Tapping "I'm here" advances to the next waypoint. No GPS required.

### Tour Visitor (native app)
Same map-centric experience, but GPS auto-advances through waypoints. The next waypoint's guidance text is always visible. When the visitor reaches a waypoint, the view automatically advances to show the next one.

### Site Integrator
New option: can add an "Open in MapTour" badge/link that deep-links to the native app (or app store if not installed). Web embed continues to work exactly as before.

---

## Functional Requirements

### FR-1: Waypoint data model

**Given** a tour YAML file,
**When** a `getting_here` block on a stop includes a `waypoints` array,
**Then** each waypoint has:
- `coords` (required, [lat, lng]) — position on the polyline
- `text` (required, string) — directional guidance, e.g. "Head up the hill towards the red house". This is what differentiates a waypoint from a plain route point
- `photo` (optional, string URL) — single image (e.g. photo of the landmark you're heading towards)
- `journey_card` (optional, boolean) — if true, or if `content` is present, renders as a full journey card instead of guidance text on the map
- `content` (optional, ContentBlock[]) — rich content blocks (same format as stop content). Presence automatically makes this a journey card
- `radius` (optional, number) — per-waypoint approach radius in metres, overrides `tour.waypoint_radius`

**Waypoint tiers:**

| Tier | Fields | Rendering |
|---|---|---|
| **Light waypoint** | `text` + optional `photo` | Guidance text displayed on map view; small circle marker on polyline |
| **Journey card** (explicit) | `text` + optional `photo` + `journey_card: true` | Full card with text and photo |
| **Journey card** (auto) | `text` + `content` blocks | Full card with all content blocks |

A light waypoint shows its guidance text directly on the map view — the visitor sees where they're headed and what to look for. If the author wants a richer experience at a specific point (e.g. a notable landmark worth stopping at), they promote it to a journey card.

**The existing `getting_here.journey` field is removed.** Journey content is now authored as waypoints with content blocks, positioned at specific points along the leg.

**Constraints:**
- Waypoints are ordered (first to last along the leg)
- Waypoints belong to `getting_here` on the destination stop (consistent with existing route data)
- **Waypoints require a `route`** on the leg. A `getting_here` block with `waypoints` but no `route` is a validation error
- A leg may have zero waypoints
- Validation: coords must be valid lat/lng; text must be non-empty

### FR-2: Waypoints on the map

**Given** a leg with waypoints,
**When** the visitor is viewing the map,
**Then** waypoints render as small circles on the polyline, visually distinct from stop pins. The next (target) waypoint is highlighted; passed waypoints are dimmed.

### FR-3: Waypoint progress (browser — manual)

The browser experience is map-centric. Waypoints guide the visitor segment by segment through the leg.

**Starting a leg with waypoints:**
**When** the visitor leaves a stop and the next leg has waypoints,
**Then** the map zooms to show the segment from the current stop to the first waypoint. The first waypoint's guidance text (and photo if present) is displayed on the map view (e.g. as an overlay/banner). An "I'm here" button is visible.

**Advancing through light waypoints:**
**When** the visitor taps "I'm here" at a light waypoint,
**Then** that waypoint is marked as passed (dimmed), and the map zooms to show the segment from this waypoint to the next one. The next waypoint's guidance text is displayed.

**Arriving at a journey card waypoint:**
**When** the visitor taps "I'm here" at a journey card waypoint,
**Then** a full journey card opens with the waypoint's content. The card has a continue/dismiss action.

**When** the visitor dismisses a journey card and there are more waypoints,
**Then** the map view returns, zoomed to the next segment, with the next waypoint's guidance text displayed.

**Completing all waypoints:**
**When** the visitor taps "I'm here" at the final waypoint (or dismisses the final journey card),
**Then** the stop card for the destination stop is shown, with a transient "Arriving at [stop name]" banner that auto-dismisses after a few seconds.

### FR-3a: Authoring tool — waypoint editing

Waypoint editing happens within the existing map-centric route editing mode.

**Adding a waypoint:**
1. Author is in route editing mode (map with selection bar/widget)
2. The route editing widget includes an "Add waypoint" button
3. If no route exists on this leg, clicking "Add waypoint" shows an error ("Add a route before adding waypoints")
4. Author clicks "Add waypoint" → map enters waypoint placement mode (cursor changes to indicate placement)
5. Author clicks on the active polyline → waypoint marker drops at that point
6. A modal overlays the map with the waypoint form:
   - Text (required) — directional guidance, e.g. "Head towards the red house on the hill"
   - Photo URL (optional) — image of the landmark/turn the visitor is heading towards
   - "Make this a journey card" toggle — when on, shows the content block editor for richer content
   - Content blocks (if journey card) — same editor as stop content
   - Approach radius override (optional, metres)
7. Author saves → waypoint appears on the polyline as a distinct marker (visually different from route control points)

**Editing a waypoint:** Author clicks an existing waypoint marker on the map → the same modal opens, pre-populated with the waypoint's data.

**Deleting a waypoint:** The modal includes a delete button. Confirmation prompt, then the waypoint is removed from the polyline and the YAML.

**Moving a waypoint:** Author click-and-drags an existing waypoint marker along the polyline to reposition it. The marker snaps to the nearest point on the polyline during drag (cannot be placed off the line). On drop, the sort order updates automatically.

**Ordering:** Waypoints are auto-sorted by their position along the polyline (nearest segment index + fractional distance). No manual reordering needed — the order always matches travel direction.

**Waypoint markers:** Visually distinct from route control points (different shape/colour) so the author can tell at a glance which are route points and which are waypoints.

### FR-4: Waypoint progress (native app — automatic)

The native app experience mirrors the browser but GPS auto-advances instead of manual "I'm here" taps. The next waypoint's guidance is always visible — waypoints tell you where you're headed, so the current target's text is the primary UI element.

**Given** a visitor using the native app with GPS enabled,
**When** a leg with waypoints begins,
**Then** the map zooms to show the segment from the current stop to the first waypoint. The first waypoint's guidance text (and photo) is displayed as a persistent banner on the map.

**When** the visitor enters the approach radius of a light waypoint (default 15m via `tour.waypoint_radius`, overridable per waypoint via `radius`),
**Then:** haptic fires, the waypoint is marked as passed, the map auto-zooms to show the next segment, and the next waypoint's guidance text replaces the banner. The transition is smooth — the visitor always sees where they're going next.

**When** the visitor enters the approach radius of a journey card waypoint,
**Then:** haptic fires, full journey card auto-shows. On dismiss (manual or auto when moving beyond radius), the map advances to the next segment with the next waypoint's guidance displayed.

**When** the final waypoint is reached,
**Then:** the stop card for the destination is shown with the transient "Arriving at [stop name]" banner.

**When** the app is backgrounded and a waypoint is reached,
**Then** a local notification fires with the waypoint's guidance text. Tapping the notification foregrounds the app at the current waypoint state.

**When** the app is backgrounded,
**Then** GPS tracking continues and waypoint proximity alerts still fire as local notifications.

### FR-5: Native app shell (Capacitor)

**Given** the existing web player,
**When** wrapped in a Capacitor shell,
**Then** the app:
- Loads tours from a URL (same YAML file the web player uses)
- Has background location permission (requested on first tour start, not on app open)
- Sends local notifications for waypoint proximity
- Supports universal links / deep links (`maptour.app/t/{slug}` or custom scheme)
- Works offline for previously loaded tours (cached YAML + tiles via service worker)

### FR-6: "Open in MapTour" integration

**Given** a web page embedding the MapTour player,
**When** the integrator sets `tour_url` in the embed config,
**Then** the player shows an "Open in MapTour" badge (small, non-intrusive, optional).

**When** the visitor taps the badge:
- If the app is installed → universal link opens the tour directly in the app
- If not installed → link goes to app store listing

**Constraints:**
- Badge is opt-in (integrator must provide `tour_url`)
- Badge does not appear if `tour_url` is not set
- Badge styling is overridable via CSS custom properties

### FR-7: Tour URL resolution

**Given** the native app receives a deep link or the user enters a tour URL,
**When** the app opens,
**Then** it fetches the YAML from the URL, validates it, and renders the tour.

**Constraints:**
- CORS must be handled (YAML files on static hosts typically serve with permissive CORS)
- If the URL is unreachable, show an error with retry option
- Previously loaded tours are available offline from cache

### FR-8: Tour publishing (deferred — needs separate spec)

The native app needs a way for visitors to discover tours. The simplest model: tour creators submit their `tour_url` to a lightweight registry (static JSON feed, or a simple API). The app fetches this feed and presents a browsable list. Details of hosting, moderation, and discovery UX are out of scope for this spec and will be specced separately once the core waypoint and Capacitor work is validated.

---

## Non-Functional Requirements

| Concern | Target |
|---|---|
| Waypoint render performance | 50 waypoints per leg renders without perceptible lag |
| Native app cold start | Tour visible within 2s on mid-range device |
| Background GPS battery | < 5% battery per hour of active touring (GPS in balanced mode) |
| App bundle size | < 15 MB (web assets + Capacitor shell) |
| Offline support | Previously loaded tour playable without network |
| Deep link resolution | < 1s from link tap to tour rendering (app already open) |

---

## Out of Scope (for this feature — future consideration)

- **Voice guidance** — waypoint names as text/notification only, no TTS. Future: TTS for waypoint names as an accessibility option
- **Turn-by-turn routing** — we show the pre-computed polyline, not calculated routes. Future: routing API integration for legs without authored routes
- **User accounts or cloud sync** — tours remain static YAML files, no login. Future: optional cloud sync for cross-device tour progress
- **Android Auto / CarPlay** — this is a walking/cycling tour app. Future: driving tour support with CarPlay/Auto
- **Tour creation in the native app** — authoring remains web-only. Future: in-app tour editing
- **App store presence for v1** — initial builds are sideloaded/TestFlight; app store submission is a separate task
- **Tour publishing / discovery** — needs separate spec (see FR-8). Future: registry, search, categories, featured tours
- **Breadcrumb trail** — no path-tracing of where the user has walked. Future: optional breadcrumb overlay on map

---

## Failure Modes

| Failure | Behaviour |
|---|---|
| GPS permission denied (native) | Falls back to manual waypoint tapping (same as browser) |
| GPS inaccurate (> 50m) | Pause auto-marking; show accuracy warning; user can tap manually |
| Background location killed by OS | Resume on app foreground; show "tracking paused" indicator |
| Tour URL unreachable (native) | Show cached version if available; error with retry if not |
| Waypoint coords off the polyline | Render at given coords; no snapping (author's responsibility) |
| Universal link on device without app | Redirect to app store or fall back to web player URL |

---

## Acceptance Criteria

### Waypoints (browser)
- [ ] YAML with waypoints validates correctly; missing text or coords rejected
- [ ] Waypoints on a leg without `route` is a validation error
- [ ] Waypoint markers render as small circles on the polyline, distinct from stop pins
- [ ] Starting a leg with waypoints: map zooms to first segment, guidance text displayed
- [ ] "I'm here" on a light waypoint: map advances to next segment, next guidance text shown
- [ ] "I'm here" on a journey card waypoint: full card opens
- [ ] Dismissing a journey card: map advances to next segment with next guidance text
- [ ] Final waypoint cleared: stop card shown with transient "Arriving at [stop]" banner
- [ ] Multiple journey card waypoints per leg each render their own card in sequence
- [ ] `journey_card: true` promotes a text+photo waypoint to card rendering
- [ ] Content blocks on a waypoint auto-promote to card rendering
- [ ] Legs with no waypoints work correctly (no regression)

### Authoring tool
- [ ] "Add waypoint" button in route editing widget enters placement mode
- [ ] "Add waypoint" on a leg with no route shows error
- [ ] Click on polyline in placement mode drops a waypoint marker
- [ ] Waypoint modal: text (required), photo URL, journey card toggle, content blocks, radius override
- [ ] "Make this a journey card" toggle shows/hides content block editor
- [ ] Click existing waypoint marker opens the same modal for editing
- [ ] Delete button in modal removes the waypoint (with confirmation)
- [ ] Drag waypoint marker along polyline to reposition (snaps to line)
- [ ] Waypoints auto-sort by position along the polyline after move
- [ ] Waypoint markers visually distinct from route control points
- [ ] YAML export includes waypoints in correct format

### Waypoints (native app)
- [ ] GPS proximity on light waypoint: haptic + map auto-advances to next segment with next guidance text
- [ ] GPS proximity on journey card waypoint: haptic + full card auto-shows
- [ ] Per-waypoint `radius` override respected
- [ ] Next waypoint's guidance text always visible as persistent banner
- [ ] Final waypoint reached: stop card shown with "Arriving at [stop]" banner
- [ ] Background tracking continues and fires local notifications with guidance text
- [ ] Manual "I'm here" fallback works when GPS is denied or inaccurate

### Native app
- [ ] Capacitor app loads a tour from URL and renders correctly
- [ ] Universal/deep link opens correct tour
- [ ] Previously loaded tour available offline
- [ ] Background location permission requested contextually (not on first launch)

### Integration
- [ ] "Open in MapTour" badge appears when `tour_url` is set
- [ ] Badge links to app or app store correctly
- [ ] Badge does not appear when `tour_url` is not set

### Existing player
- [ ] All 293+ existing tests still pass
- [ ] Tours without waypoints work identically to v1.3.4

---

## YAML Schema Extension

```yaml
stops:
  - id: stop-2
    title: "The Harbour"
    coords: [52.123, -6.456]
    getting_here:
      mode: walk
      route: [[52.120, -6.450], [52.121, -6.452], [52.123, -6.456]]  # REQUIRED when waypoints present
      waypoints:
        - coords: [52.120, -6.451]            # Light waypoint — guidance text on map
          text: "Cross the old stone bridge — careful, it's narrow"
          photo: "https://example.com/bridge.jpg"

        - coords: [52.121, -6.453]            # Journey card — explicitly promoted
          text: "Head towards the old mill on the harbour road"
          photo: "https://example.com/mill.jpg"
          journey_card: true

        - coords: [52.1215, -6.4535]          # Journey card — auto-promoted (has content blocks)
          text: "Continue past the harbour warehouses"
          content:
            - type: text
              body: "These three restored 19th-century warehouses were built in 1847..."
            - type: image
              url: "https://example.com/warehouses.jpg"
              caption: "The warehouses, restored 2019"
            - type: gallery
              images:
                - url: "https://example.com/w1.jpg"
                - url: "https://example.com/w2.jpg"
          radius: 25                           # Per-waypoint radius override (metres)

        - coords: [52.122, -6.455]            # Light waypoint
          text: "Go through the iron gates into the harbour area"

tour:
  tour_url: "https://example.com/tour.yaml"   # Enables "Open in MapTour" badge
  waypoint_radius: 15                          # Default approach radius in metres
```
