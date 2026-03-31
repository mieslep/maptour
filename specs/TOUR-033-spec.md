# TOUR-033 — Tour Authoring UI

## Summary

A standalone web-based visual editor for creating and editing MapTour tours. Authors place stops on a Leaflet map, edit metadata and content in a side panel, generate routes via OpenRouteService, edit route geometry visually, import GPX files, and export valid tour YAML. TypeScript + Leaflet, no framework — vanilla DOM, consistent with the player codebase.

## Motivation

Tour YAML is currently hand-edited or assembled with the standalone `route-editor.html`. This is workable for developers but inaccessible for non-technical tour authors. A visual editor that outputs the same YAML the player consumes removes the biggest barrier to tour creation and lets authors iterate faster — see the stop on the map, edit content, generate routes, and export in one workflow.

## UX Flow

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Toolbar: [New] [Open] [Save] [Import GPX] [Export YAML]        │
├──────────────────────────────────┬───────────────────────────────┤
│                                  │  Side Panel                   │
│                                  │  ┌───────────────────────────┐│
│                                  │  │ Tour metadata             ││
│          Leaflet Map             │  │ (id, title, desc,         ││
│                                  │  │  duration, nav_mode, gps) ││
│    • Click to place stop         │  ├───────────────────────────┤│
│    • Drag stop markers           │  │ Stop editor               ││
│    • Drag route control points   │  │ (title, content blocks,   ││
│    • Route polylines visible     │  │  getting_here, arrival_   ││
│                                  │  │  radius, coords)          ││
│                                  │  ├───────────────────────────┤│
│                                  │  │ Welcome / Goodbye content ││
│                                  │  └───────────────────────────┘│
└──────────────────────────────────┴───────────────────────────────┘
```

### Core workflows

**Adding a stop:**
1. Author clicks a point on the map
2. A numbered marker appears at the click location
3. The side panel opens the stop editor, pre-filled with the clicked coordinates
4. Author enters title and content blocks

**Editing a stop:**
1. Author clicks an existing stop marker on the map (or selects from a stop list in the panel)
2. Side panel shows that stop's metadata and content for editing
3. Author can drag the marker to reposition; coordinates update live

**Deleting a stop:**
1. Author selects a stop and clicks delete (in panel or via keyboard)
2. Marker removed from map; stop removed from the tour; subsequent stops renumber

**Route generation:**
1. Author enters an OpenRouteService API key (stored in localStorage, not in YAML)
2. On demand (button per leg, or "generate all"), the editor calls ORS foot-walking directions between consecutive stops
3. Returned geometry populates `getting_here.route` for each stop
4. Author can regenerate individual legs after moving stops

**Route editing:**
1. Route polylines are displayed between consecutive stops
2. Author can drag existing route points, delete points, insert new points by clicking the polyline, smooth curves, and reduce point count
3. Same interaction model as `demo/route-editor.html`

**GPX import:**
1. Author clicks "Import GPX" and selects a `.gpx` file
2. Waypoints become stops (name -> title, coords from waypoint)
3. Track points become route geometry between consecutive stops
4. Author reviews and adjusts in the editor

**Export:**
1. Author clicks "Export YAML"
2. Editor serialises the tour to YAML matching the player's expected schema
3. File is downloaded as `<tour-id>.yaml`

**Save/Load:**
1. "Save" persists the current project to localStorage (or downloads a `.maptour-project.json`)
2. "Open" loads a previously saved project
3. Project format includes the full tour data plus editor state (ORS key is separate in localStorage)

## Functional Requirements

### FR-1: Place stops on map
- **Given** the editor is open with a map visible
- **When** the author clicks a point on the map
- **Then** a new stop is created at those coordinates with an auto-incremented ID
- A numbered marker appears on the map
- The side panel opens the stop editor for the new stop

### FR-2: Drag stop markers
- **Given** a stop marker exists on the map
- **When** the author drags it to a new position
- **Then** the stop's `coords` update to the new position
- Any connected route is marked stale (visual indicator)

### FR-3: Delete stops
- **Given** a stop is selected
- **When** the author clicks delete
- **Then** the stop is removed, its marker is removed, and remaining stops renumber sequentially

### FR-4: Edit stop metadata
- **Given** a stop is selected in the side panel
- **When** the author edits title, content blocks, `getting_here.note`, `getting_here.mode`, or `arrival_radius`
- **Then** changes are reflected in the tour data immediately

### FR-5: Content block editing
- **Given** the stop editor is open
- **When** the author adds/removes/reorders content blocks
- **Then** blocks are managed as an ordered list with type selection (text, image, embed) and appropriate fields per type

### FR-6: ORS route generation
- **Given** the author has entered an ORS API key and at least two consecutive stops exist
- **When** the author triggers route generation for a leg (or all legs)
- **Then** the editor calls ORS directions API (foot-walking profile) and populates `getting_here.route` with the returned geometry
- The polyline renders on the map between the two stops

### FR-7: Visual route editing
- **Given** a route polyline exists between two stops
- **When** the author interacts with the polyline
- **Then** they can: drag control points, delete points, insert points by clicking the line, apply smoothing, and reduce point density
- Edits update the `getting_here.route` array in the tour data

### FR-8: GPX import
- **Given** the author selects a `.gpx` file
- **When** the file is parsed
- **Then** waypoints become stops (using waypoint name as title, coordinates from the waypoint)
- Track segments become `getting_here.route` arrays between consecutive stops
- Existing tour data is replaced (with confirmation if non-empty)

### FR-9: Welcome and goodbye content
- **Given** the side panel has a welcome/goodbye section
- **When** the author edits content blocks in those sections
- **Then** changes populate `tour.welcome` and `tour.goodbye` arrays in the tour data

### FR-10: Tour metadata editing
- **Given** the side panel has a tour metadata section
- **When** the author edits id, title, description, duration, nav_mode, or gps config fields
- **Then** changes populate the corresponding `tour.*` fields in the tour data

### FR-11: Export valid YAML
- **Given** the tour has at least one stop
- **When** the author clicks "Export YAML"
- **Then** a valid YAML file is generated matching the player's schema and downloaded as `<tour-id>.yaml`
- The exported YAML can be loaded by the player without modification

### FR-12: Save and load projects
- **Given** the author has a tour in progress
- **When** they click "Save"
- **Then** the project is persisted (localStorage or file download)
- "Open" restores the project including all stops, routes, content, and metadata

### FR-13: Stop reordering
- **Given** multiple stops exist
- **When** the author reorders stops in the side panel list (drag or up/down buttons)
- **Then** stop IDs renumber sequentially and route legs update to reflect the new order

## Non-Functional Requirements

- Standalone web app — no server required; runs from a static file or `file://`
- TypeScript + Leaflet, vanilla DOM — no framework (React, Vue, etc.)
- Consistent code style with the MapTour player codebase
- ORS API key never appears in exported YAML
- Responsive layout: usable on desktop (primary) and tablet; phone not required
- Undo/redo for stop placement, deletion, and moves (at minimum)

## Out of Scope

- Multi-user collaboration or cloud storage
- User authentication
- Preview / play-through of the tour within the editor
- Content block types beyond what the player supports (text, image, embed)
- Automated tour generation from POI databases
- Mobile-first design (desktop is the primary target for authoring)

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| ORS API key invalid or rate-limited | Show error toast; route generation fails gracefully; existing routes preserved |
| ORS API unreachable | Show network error; allow manual route editing as fallback |
| GPX file malformed | Show parse error with line number if available; no data imported |
| GPX has tracks but no waypoints | Create stops from track segment endpoints; warn author to review |
| Export with no stops | Disabled or shows validation error |
| localStorage full | Fall back to file download for save; warn user |
| Very large tour (100+ stops) | Map rendering may slow; no hard limit but warn above 50 stops |
| Browser lacks Geolocation/File API | Geolocation not needed (authoring is map-click based); File API required for import/export — show browser compatibility warning |

## Acceptance Criteria

1. Author can create a tour from scratch: place 3+ stops, add titles and content, export YAML
2. Exported YAML loads in the MapTour player without errors
3. ORS route generation produces a polyline between consecutive stops
4. Route points can be dragged, deleted, inserted, smoothed, and reduced
5. GPX import creates stops from waypoints and routes from tracks
6. Welcome and goodbye content appears in exported YAML
7. Tour metadata (id, title, description, duration, nav_mode, gps) is editable and exports correctly
8. Save/load round-trips without data loss
9. Deleting a stop renumbers remaining stops and removes associated routes
10. Moving a stop marker updates coordinates and marks connected routes as stale

## Test Approach

- **Unit**: YAML serialiser output matches expected schema; GPX parser extracts waypoints and tracks; stop renumbering logic; content block add/remove/reorder
- **Integration**: Full workflow — create stops, generate routes, edit routes, export YAML, load in player
- **Manual**: Visual verification of map interactions (click-to-place, drag, route editing); GPX import with real files; export and load in player
