# TOUR-043 — Architecture Plan

**Status:** Draft
**Spec:** `specs/TOUR-043-spec.md`

---

## System Context

This feature adds two major capabilities to MapTour:

1. **Waypoints** — authored guidance points along each leg, rendered in the player (browser + native) and editable in the authoring tool
2. **Native app** — Capacitor shell wrapping the existing web player, adding background GPS, local notifications, and deep linking

The web player remains the primary distribution channel. The native app is an enhancement layer that re-uses the same player code with native capabilities injected via Capacitor plugins.

---

## Phasing

This is a large feature with clear boundaries between its parts. We split into three phases that can be developed incrementally on the `TOUR-043-waypoints-native-app` integration branch:

| Phase | Scope | Can ship independently? |
|---|---|---|
| **A: Waypoint data + browser player** | Schema, types, map rendering, browser navigation flow, journey card integration | Yes — adds value without native app |
| **B: Authoring tool** | Waypoint placement, modal editor, drag-to-move, snap-to-polyline, YAML round-trip | Yes — needed for authors to create waypoints |
| **C: Native app + integration** | Capacitor shell, background GPS, local notifications, deep links, "Open in MapTour" badge | Yes — adds native distribution |

Phases A and B can be developed in parallel. Phase C depends on A being complete.

---

## Phase A: Waypoint Data + Browser Player

### A1. Data Model Changes

**File: `src/types.ts`**

```typescript
export interface Waypoint {
  coords: [number, number];
  text: string;
  photo?: string;
  journey_card?: boolean;
  content?: ContentBlock[];
  radius?: number;
}
```

Extend `Leg`:
```typescript
export interface Leg {
  mode: LegMode;
  note?: string;
  route?: [number, number][];
  waypoints?: Waypoint[];       // NEW — replaces journey
  // journey field removed
}
```

Extend `TourMeta`:
```typescript
export interface TourMeta {
  // ... existing fields ...
  tour_url?: string;            // NEW — for "Open in MapTour" badge
  waypoint_radius?: number;     // NEW — default approach radius (metres)
}
```

**File: `src/schema.ts`**

Add `WaypointSchema`:
```typescript
const WaypointSchema = z.object({
  coords: z.tuple([z.number(), z.number()]),
  text: z.string().min(1),
  photo: z.string().url().optional(),
  journey_card: z.boolean().optional(),
  content: z.array(ContentBlockSchema).optional(),
  radius: z.number().positive().optional(),
});
```

Update `LegSchema`: replace `journey` with `waypoints`. Add refinement: if `waypoints` is non-empty, `route` must be present.

### A2. Map Rendering — Waypoint Markers

**File: `src/map/MapView.ts`**

New method: `setWaypoints(legIndex: number, waypoints: Waypoint[], activeIndex: number)`

- Renders small circle markers (`L.circleMarker`) on the polyline at each waypoint's coords
- Active (next target) waypoint: solid colour (e.g. tour accent colour)
- Passed waypoints: dimmed/grey
- Future waypoints: subtle outline
- Markers are on a separate Leaflet layer group, cleared when leaving transit

New method: `zoomToSegment(from: [number, number], to: [number, number])`
- Fits map bounds to show the segment between two points (current position → next waypoint, or waypoint → waypoint)
- Uses existing `flyToBounds` with padding

### A3. Waypoint Navigation State

**New file: `src/waypoint/WaypointTracker.ts`**

Manages progress through waypoints on a single leg:

```typescript
export class WaypointTracker {
  private waypoints: Waypoint[];
  private currentIndex: number = 0;
  private callbacks: WaypointCallbacks;

  constructor(waypoints: Waypoint[], callbacks: WaypointCallbacks);

  getCurrentWaypoint(): Waypoint;
  getNextWaypoint(): Waypoint | null;
  getSegmentBounds(): { from: [number, number]; to: [number, number] };
  advance(): void;              // marks current as passed, moves to next
  isComplete(): boolean;        // all waypoints passed
  reset(): void;
}

interface WaypointCallbacks {
  onAdvance: (waypoint: Waypoint, nextWaypoint: Waypoint | null) => void;
  onJourneyCard: (waypoint: Waypoint, onDismiss: () => void) => void;
  onComplete: (destinationStop: Stop) => void;
}
```

This is a focused class that just tracks position in the waypoint sequence. It doesn't know about the map or cards — it emits events.

### A4. Browser Transit Flow — Waypoint UI

**Modify: `src/orchestrator/journeyHandler.ts`**

When entering `in_transit` state:

1. Check if the destination stop's `getting_here.waypoints` is non-empty
2. If yes: create a `WaypointTracker`, render waypoint transit view
3. If no: fall back to existing behaviour (journey card or plain transit bar)

**Waypoint transit view** (new rendering in the card area):

- **Map**: zoomed to current segment (from → next waypoint)
- **Guidance banner**: waypoint text + optional photo thumbnail, overlaid on the map or as a compact card above the map
- **"I'm here" button**: prominent, in the tour footer area (replaces the "I've arrived" button)
- **On "I'm here"**:
  - If light waypoint: `WaypointTracker.advance()` → map zooms to next segment, guidance text updates
  - If journey card waypoint: render journey card via `CardHost`, on dismiss → advance
- **On complete**: show destination stop card with transient "Arriving at [stop name]" banner

**Modify: `src/card/JourneyCardRenderer.ts`**

Extend to accept a `Waypoint` as source (not just a `Leg`). When rendering a journey card waypoint:
- Use `waypoint.text` as the header/intro text
- Use `waypoint.photo` as hero image if present
- Render `waypoint.content` blocks below
- Footer: "Continue" button (not "I've arrived" — that's the old flow)

### A5. Tour Footer Integration

**Modify: `src/layout/TourFooter.ts`**

During waypoint transit:
- Replace prev/next with "I'm here" button
- Progress track shows waypoint progress (filled segments for passed waypoints)
- When on a journey card: footer shows "Continue" or similar

### A6. Arriving Banner

**New: `src/card/ArrivingBanner.ts`**

A small, transient banner component: "Arriving at [stop name]" with the stop's first image or a map pin icon. Auto-dismisses after 3-4 seconds or on tap. Shown on the stop card when arriving via waypoint completion.

---

## Phase B: Authoring Tool

### B1. Waypoint Data in Authoring Types

**Modify: `authoring/src/types.ts`**

Add `Waypoint` type (mirrors player type). Update the leg/stop types to include `waypoints`.

### B2. YAML Round-Trip

**Modify: `authoring/src/yaml-io.ts`**

- **Import**: parse `getting_here.waypoints` array. Remove legacy `journey` field handling.
- **Export**: serialize waypoints. Omit `waypoints` key if array is empty.

### B3. Waypoint Placement + Editing UI

**Modify: `authoring/src/ui/editor.ts`**

This is the largest authoring change. Within the existing route editing mode:

**"Add waypoint" button** in the route editing action bar/widget:
- Only enabled when the leg has a `route` (polyline). Disabled with tooltip if no route.
- Click → enters waypoint placement mode:
  - Cursor changes (crosshair or custom)
  - Click handler on the polyline layer places a new waypoint marker at the clicked point
  - Exits placement mode after one placement
  - Opens the waypoint modal

**Waypoint markers** on the map:
- Render as distinct markers (e.g. filled circles, different colour from route control points)
- Draggable along the polyline (snap to nearest point on line during drag)
- Click → open waypoint edit modal

**Waypoint edit modal** (new DOM, overlays the map):
- Text field (required) — the directional guidance
- Photo URL field (optional)
- "Make this a journey card" toggle
- If toggled on: content block editor appears (reuse `createContentBlockEditor` from `content-blocks.ts`)
- Approach radius override field (optional, number input)
- Save / Delete / Cancel buttons
- Delete requires confirmation

**Auto-sorting**: after placement or drag, waypoints are sorted by their fractional position along the polyline. Use `L.GeometryUtil.closest()` or manual nearest-segment calculation to determine position.

**Snap-to-polyline on drag**: constrain waypoint marker position to the polyline during drag. Leaflet's `closestLayerPoint` or manual projection onto the nearest segment.

### B4. Undo/Redo

The existing undo/redo system takes full tour state snapshots. Waypoint edits (add, move, edit, delete) will naturally be captured by this system — no changes needed to the undo/redo mechanism itself, just ensure waypoints are included in the snapshot.

---

## Phase C: Native App + Integration

### C1. Capacitor Project Setup

**New directory: `native/`** at project root.

```
native/
├── capacitor.config.ts
├── package.json
├── ios/
├── android/
└── src/
    └── native-bridge.ts    # Capacitor plugin bridges
```

The Capacitor project wraps the existing `dist/` output. The web player loads inside the Capacitor WebView. Native capabilities are injected via a bridge module that the player detects at runtime.

**Detection**: `src/index.ts` checks for `window.Capacitor` to determine if running in native context. If present, native-specific features are enabled (background GPS, haptics, notifications).

### C2. Native GPS — Background Location

**Capacitor plugin**: `@capacitor/geolocation` for foreground, `@capacitor-community/background-geolocation` for background tracking.

**Modify: `src/gps/GpsTracker.ts`**

Add a native adapter path:
- If Capacitor is available, use Capacitor Geolocation plugin instead of browser `navigator.geolocation`
- Background mode: register a background listener that continues tracking when the app is backgrounded
- Battery modes (HIGH_ACCURACY, FAR_CRUISE, STATIONARY) map to Capacitor's location accuracy options

The existing `GpsTracker` interface stays the same — the adapter is internal. Code that consumes `GpsTracker` doesn't change.

### C3. Waypoint Proximity — Native Auto-Advance

**Modify: `src/gps/proximityDetector.ts`**

Extend to support waypoint proximity in addition to stop proximity:
- Accept a `WaypointTracker` reference
- When GPS position is within waypoint radius → call `WaypointTracker.advance()`
- Light waypoint: trigger haptic (`@capacitor/haptics`) + the map/UI auto-advances
- Journey card waypoint: trigger haptic + auto-show card

The proximity detector already has hysteresis and accuracy guards — these apply to waypoints too.

### C4. Local Notifications

**Capacitor plugin**: `@capacitor/local-notifications`

**New file: `src/native/notifications.ts`**

When a waypoint is reached in background mode:
- Fire a local notification with the next waypoint's guidance text
- Tapping the notification foregrounds the app at the current waypoint state

### C5. Haptics

**Capacitor plugin**: `@capacitor/haptics`

Light vibration on waypoint arrival. Called from the proximity detector when in native context.

### C6. Deep Linking / Universal Links

**Capacitor plugin**: `@capacitor/app` (handles deep links)

URL scheme: `https://maptour.app/t/{slug}` (universal link) or `maptour://tour/{slug}` (custom scheme as fallback).

**Native handler**: on deep link received, extract the tour URL/slug, fetch the YAML, and initialise the player.

**Domain TBD**: the actual domain and link format will be finalised separately. The architecture supports any URL pattern.

### C7. Offline Support

**Service worker**: cache tour YAML files and map tiles for offline use.

- YAML: cache-first strategy for previously loaded tours
- Map tiles: cache-first with network fallback (Leaflet tile layer can be configured with a service worker-aware URL)
- Player assets (JS/CSS): cached on first load

In Capacitor context, the service worker runs inside the WebView. No Capacitor plugin needed.

### C8. "Open in MapTour" Badge

**Modify: `src/index.ts`** (or new component)

When `tour.tour_url` is set in the YAML:
- Render a small badge/link in the menu bar or header area
- Links to `https://maptour.app/t/{slug}` (universal link)
- If the app is installed on the device → opens the app. If not → redirects to app store
- Badge is styled with `--maptour-badge-*` CSS custom properties
- Not shown when already running inside Capacitor (no point linking to yourself)

---

## Cross-Cutting Concerns

### i18n

New strings needed:
- `im_here` — "I'm here" button text
- `arriving_at` — "Arriving at {stop}" banner text
- `continue` — journey card dismiss button
- `add_waypoint` — authoring button
- `waypoint_no_route` — authoring error when no route exists
- `open_in_app` — "Open in MapTour" badge text

All added to `src/i18n.ts` DEFAULTS (sorted alphabetically) and mirrored in authoring `I18N_DEFAULTS`.

### Testing Strategy

- **Unit tests**: WaypointTracker, waypoint schema validation, proximity detector with waypoints, YAML round-trip
- **Integration tests**: full waypoint transit flow (browser), authoring waypoint add/edit/delete/move
- **E2E tests (Playwright)**: waypoint navigation in browser player, authoring waypoint editing
- **Native tests**: manual testing on iOS/Android devices for GPS, notifications, haptics, deep links (Capacitor testing is device-dependent)

### Performance

- Waypoint circle markers are lightweight (Leaflet `circleMarker` is SVG, not DOM elements)
- 50 waypoints per leg is well within Leaflet's rendering capacity
- Map zoom transitions use existing `flyToBounds` with `prefersReducedMotion` check
- No additional network requests for waypoint rendering (data is in the YAML)

### Migration

- `getting_here.journey` field is removed from schema
- Existing tour YAML files with `journey` will fail validation — authors must convert to waypoints
- The authoring tool's YAML import drops any `journey` field silently (data was positional to a leg, not to a point — can't auto-migrate meaningfully)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Snap-to-polyline is imprecise on complex routes | Medium | Low | Use fine-grained segment projection; visual feedback during drag |
| Background GPS drains battery on older devices | Medium | Medium | Battery saver modes already exist; add waypoint-aware far/near logic |
| Capacitor WebView performance differs from browser | Low | Medium | Test early on real devices; the player is already lightweight |
| App store review rejection | Low | High | Defer app store submission; TestFlight/sideload first |
| Deep link domain not secured | Medium | Medium | Use custom URL scheme as fallback; domain is independent of code |
| Authoring modal complexity (content block editor in a modal) | Medium | Low | Reuse existing content-blocks.ts; test thoroughly |

---

## Files Changed (Summary)

### Phase A (Player)
| File | Change |
|---|---|
| `src/types.ts` | Add `Waypoint` interface; extend `Leg` (remove `journey`, add `waypoints`); extend `TourMeta` |
| `src/schema.ts` | Add `WaypointSchema`; update `LegSchema`; add route-required refinement |
| `src/map/MapView.ts` | Add waypoint circle markers, `zoomToSegment()` |
| `src/waypoint/WaypointTracker.ts` | **New** — waypoint sequence state management |
| `src/orchestrator/journeyHandler.ts` | Waypoint-aware transit flow |
| `src/card/JourneyCardRenderer.ts` | Accept `Waypoint` as content source |
| `src/layout/TourFooter.ts` | "I'm here" mode during waypoint transit |
| `src/card/ArrivingBanner.ts` | **New** — transient arrival banner |
| `src/i18n.ts` | New waypoint-related strings |
| `src/index.ts` | Wire WaypointTracker into transit flow |
| `styles/maptour.css` | Waypoint marker styles, guidance banner, arriving banner |

### Phase B (Authoring)
| File | Change |
|---|---|
| `authoring/src/types.ts` | Add `Waypoint` type |
| `authoring/src/yaml-io.ts` | Waypoint import/export; remove `journey` |
| `authoring/src/ui/editor.ts` | Waypoint placement, modal, drag, snap-to-polyline |
| `authoring/src/ui/content-blocks.ts` | No changes (reused in waypoint modal) |

### Phase C (Native)
| File | Change |
|---|---|
| `native/` | **New** — Capacitor project directory |
| `src/gps/GpsTracker.ts` | Native adapter path (Capacitor geolocation) |
| `src/gps/proximityDetector.ts` | Waypoint proximity support |
| `src/native/notifications.ts` | **New** — local notification bridge |
| `src/index.ts` | Capacitor detection, "Open in MapTour" badge, native feature gating |
| `styles/maptour.css` | Badge styles |
