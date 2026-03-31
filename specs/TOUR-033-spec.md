# TOUR-033 — Tour Authoring UI

## Summary

A standalone web-based visual editor for creating and editing MapTour tours. Authors manage a list of tours in localStorage, place stops on a Leaflet map, edit content with live markdown preview, generate routes via OpenRouteService, edit route geometry visually, and import/export tour YAML files. TypeScript + Leaflet, no framework - vanilla DOM, consistent with the player codebase.

## Motivation

Tour YAML is currently hand-edited or assembled with the standalone `route-editor.html`. This is workable for developers but inaccessible for non-technical tour authors. A visual editor that outputs the same YAML the player consumes removes the biggest barrier to tour creation and lets authors iterate faster - see the stop on the map, edit content, preview the rendered HTML, generate routes, and export in one workflow.

## UX Flow

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Toolbar: [Tours ▾] [Import YAML] [Export YAML]                  │
├──────────────────────────────┬───────────────────────────────────┤
│                              │  Side Panel                       │
│                              │  ┌───────────────────────────────┐│
│                              │  │ Tour metadata                 ││
│        Leaflet Map           │  │ (id, title, desc, duration,   ││
│                              │  │  nav_mode, close_url, gps)    ││
│  • Click to place stop       │  ├───────────────────────────────┤│
│  • Drag stop markers         │  │ Stop list (drag to reorder)   ││
│  • Drag route control points │  ├───────────────────────────────┤│
│  • Route polylines visible   │  │ Stop editor                   ││
│                              │  │ (title, content blocks,       ││
│                              │  │  getting_here, journey)       ││
│                              │  ├───────────────────────────────┤│
│                              │  │ Welcome / Goodbye content     ││
│                              │  ├───────────────────────────────┤│
│                              │  │ Strings / i18n overrides      ││
│                              │  └───────────────────────────────┘│
└──────────────────────────────┴───────────────────────────────────┘
```

### Tour management

Tours are stored in localStorage as a list. The toolbar shows a dropdown of saved tours. The author can:
- Create a new tour
- Switch between tours
- Delete a tour
- Import a YAML file (creates or replaces a tour)
- Export the current tour as YAML

There is no separate "project" format - the working state is stored in localStorage, and export always produces tour YAML.

### Core workflows

**Starting the editor:**
1. On first load, show an empty state with "Create new tour" or "Import YAML"
2. On subsequent loads, restore the last active tour from localStorage
3. Auto-save to localStorage on every change (debounced)

**Adding a stop:**
1. Author clicks a point on the map
2. A numbered marker appears at the click location
3. The side panel opens the stop editor, pre-filled with the clicked coordinates
4. Author enters title and content blocks

**Editing a stop:**
1. Author clicks an existing stop marker on the map (or selects from the stop list)
2. Side panel shows that stop's metadata and content for editing
3. Author can drag the marker to reposition; coordinates update live

**Editing text content (markdown):**
1. Author edits markdown in a text area
2. A live preview panel beside or below the text area renders the HTML
3. Preview uses the same markdown renderer (marked.js) as the player

**Deleting a stop:**
1. Author selects a stop and clicks delete (in panel or via keyboard)
2. Marker removed from map; stop removed from the tour; subsequent stops renumber

**Route generation:**
1. Author enters an OpenRouteService API key (stored in localStorage, never in YAML)
2. On demand (button per leg, or "generate all"), the editor calls ORS foot-walking directions
3. Returned geometry populates `getting_here.route`
4. Author can regenerate individual legs after moving stops

**Route editing:**
1. Route polylines are displayed between consecutive stops
2. Author can drag points, delete points, insert new points, smooth, and reduce density
3. Same interaction model as `demo/route-editor.html`

**Import YAML:**
1. Author selects a `.yaml` file
2. Editor parses the YAML and loads it as the current tour
3. Stops appear on the map, routes render, content populates the side panel
4. The tour is added to the localStorage tour list

**Export YAML:**
1. Author clicks "Export YAML"
2. Editor serialises the tour to YAML matching the player's schema
3. File is downloaded as `<tour-id>.yaml`

## Functional Requirements

### FR-1: Tour list management
- **Given** the editor is open
- **When** the author opens the tour dropdown
- **Then** they see all tours stored in localStorage, with options to create new, switch, or delete

### FR-2: Auto-save
- **Given** the author makes any change (stop, content, route, metadata)
- **When** the change is made
- **Then** the current tour state is auto-saved to localStorage (debounced, e.g. 500ms)

### FR-3: Place stops on map
- **Given** the editor is open with a map visible
- **When** the author clicks a point on the map
- **Then** a new stop is created at those coordinates with an auto-incremented ID
- A numbered marker appears on the map
- The side panel opens the stop editor for the new stop

### FR-4: Drag stop markers
- **Given** a stop marker exists on the map
- **When** the author drags it to a new position
- **Then** the stop's `coords` update to the new position
- Any connected route is marked stale (visual indicator)

### FR-5: Delete stops
- **Given** a stop is selected
- **When** the author clicks delete
- **Then** the stop is removed, its marker is removed, and remaining stops renumber sequentially

### FR-6: Edit stop metadata
- **Given** a stop is selected in the side panel
- **When** the author edits title, content blocks, `getting_here.note`, `getting_here.mode`, or `arrival_radius`
- **Then** changes are reflected in the tour data immediately

### FR-7: Content block editing
- **Given** the stop editor is open
- **When** the author adds/removes/reorders content blocks
- **Then** blocks are managed as an ordered list with type selection (text, image, gallery, video, audio) and appropriate fields per type

### FR-8: Markdown live preview
- **Given** a text content block is being edited
- **When** the author types markdown in the text area
- **Then** a live preview renders the HTML beside or below the editor using marked.js (same renderer as the player)

### FR-9: ORS route generation
- **Given** the author has entered an ORS API key and at least two consecutive stops exist
- **When** the author triggers route generation for a leg (or all legs)
- **Then** the editor calls ORS directions API (foot-walking profile) and populates `getting_here.route`
- The polyline renders on the map between the two stops

### FR-10: Visual route editing
- **Given** a route polyline exists between two stops
- **When** the author interacts with the polyline
- **Then** they can: drag control points, delete points, insert points by clicking the line, apply smoothing, and reduce point density

### FR-11: Welcome and goodbye content
- **Given** the side panel has a welcome/goodbye section
- **When** the author edits content blocks in those sections
- **Then** changes populate `tour.welcome` and `tour.goodbye` arrays

### FR-12: Tour metadata editing
- **Given** the side panel has a tour metadata section
- **When** the author edits id, title, description, duration, nav_mode, close_url, or gps config
- **Then** changes populate the corresponding `tour.*` fields

### FR-13: String overrides (i18n)
- **Given** the side panel has a strings section
- **When** the author edits string overrides
- **Then** changes populate `tour.strings` with only the overridden keys (empty values are omitted)

### FR-14: Import YAML
- **Given** the author selects a `.yaml` file
- **When** the file is parsed
- **Then** the tour is loaded into the editor: stops on map, routes rendered, content in panel
- The tour is added to the localStorage tour list

### FR-15: Export valid YAML
- **Given** the tour has at least one stop
- **When** the author clicks "Export YAML"
- **Then** a valid YAML file is generated matching the player's schema and downloaded
- The exported YAML can be loaded by the player without modification

### FR-16: Stop reordering
- **Given** multiple stops exist
- **When** the author reorders stops in the side panel list (drag or up/down buttons)
- **Then** stop IDs renumber sequentially and route legs update to reflect the new order

### FR-17: Journey content editing
- **Given** a stop is selected and has a getting_here section
- **When** the author adds/edits journey content blocks
- **Then** changes populate `getting_here.journey` for that stop

### FR-18: Undo/redo
- **Given** the author has made changes
- **When** they press Ctrl+Z or Ctrl+Y
- **Then** the last change is undone or redone (stop placement, deletion, moves, content edits, route edits)

## Non-Functional Requirements

- Standalone web app - no server required; runs from a static file
- TypeScript + Leaflet, vanilla DOM - no framework (React, Vue, etc.)
- Consistent code style with the MapTour player codebase
- ORS API key stored in localStorage, never in exported YAML
- Desktop-primary; tablet usable; phone not required
- Auto-save ensures no work is lost on accidental close
- Tour YAML is the only exchange format - no proprietary project files

## Out of Scope

- Multi-user collaboration or cloud storage
- User authentication
- Live preview of the tour in the player within the editor (future)
- Image hosting or upload (author provides URLs)
- Mobile-first design
- GPX import (use the standalone route-editor for GPX workflows)

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| ORS API key invalid or rate-limited | Show error toast; route generation fails gracefully; existing routes preserved |
| ORS API unreachable | Show network error; allow manual route editing as fallback |
| YAML file malformed | Show parse error; no data imported |
| Export with no stops | Disabled or shows validation error |
| localStorage full | Warn user; suggest exporting YAML to free space |
| Very large tour (100+ stops) | Map rendering may slow; warn above 50 stops |
| Browser lacks File API | Show browser compatibility warning |

## Acceptance Criteria

1. Author can create a tour from scratch: place 3+ stops, add titles and content, export YAML
2. Exported YAML loads in the MapTour player without errors
3. ORS route generation produces a polyline between consecutive stops
4. Route points can be dragged, deleted, inserted, smoothed, and reduced
5. Import YAML loads an existing tour into the editor with all data intact
6. Welcome and goodbye content appears in exported YAML
7. Tour metadata is editable and exports correctly
8. Tour list in localStorage allows switching between multiple tours
9. Auto-save preserves work across page reloads
10. Markdown preview renders the same HTML as the player
11. Deleting a stop renumbers remaining stops and removes associated routes
12. Moving a stop marker updates coordinates and marks connected routes as stale
13. String overrides export only non-empty keys

## Test Approach

- **Unit**: YAML serialiser output matches expected schema; YAML parser loads valid files; stop renumbering logic; content block add/remove/reorder; markdown preview matches player renderer
- **Integration**: Full workflow - create stops, generate routes, edit routes, export YAML, load in player; import existing YAML and re-export without data loss
- **Manual**: Visual verification of map interactions; export and load in player; multi-tour management in localStorage
