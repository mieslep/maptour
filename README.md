# MapTour

MapTour is an embeddable, zero-backend map tour player for static websites. Drop it into any HTML page with a single `<script>` tag, point it at a YAML file, and it renders a guided tour experience: a Leaflet map with numbered pins and route polylines, a mobile-first bottom sheet with rich stop cards, welcome and goodbye screens, journey commentary between stops, live GPS positioning with nearest-stop pre-selection, visited-stop breadcrumbs, native navigation deep-links, and full UI label localisation. No server, no build step, no CMS.

Built for Tidy Towns committees, heritage trails, festival maps, and any community organisation that wants to publish a guided tour directly from GitHub Pages.

---

## Quick start

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Tour</title>
  <link rel="stylesheet" href="maptour.css">
</head>
<body>
  <div id="maptour" style="width:100%;height:100vh;"></div>
  <script src="maptour.js"></script>
  <script>
    MapTour.init({
      container: '#maptour',
      tourUrl: './tour.yaml',
    });
  </script>
</body>
</html>
```

Download `maptour.js` and `maptour.css` from the [latest GitHub Release](https://github.com/YOUR-ORG/maptour/releases/latest) and place them alongside your HTML file.

### Embedding from a CDN with SRI (recommended)

For security, use [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) hashes when loading from an external source. Pin to a tagged release for stability:

```html
<link rel="stylesheet"
      href="https://github.com/YOUR-ORG/maptour/releases/download/v1.2.0/maptour.css"
      integrity="sha384-HASH_HERE" crossorigin="anonymous">

<script src="https://github.com/YOUR-ORG/maptour/releases/download/v1.2.0/maptour.js"
        integrity="sha384-HASH_HERE" crossorigin="anonymous"></script>
```

SRI hashes for each release are published in `sri.json` and `EMBED.md` alongside the release assets. The build generates these automatically via `npm run build:site`.

**Best practice:** Always pin to a specific version tag (e.g. `v1.2.0`) rather than referencing `main`. This ensures the player version matches your tour's `schema_version` and avoids unexpected changes.

### Init options

| Option | Type | Required | Description |
|---|---|---|---|
| `container` | string or HTMLElement | yes | CSS selector or DOM element to render into |
| `tourUrl` | string | yes | URL to the tour YAML file |
| `startStop` | number | no | Stop ID to jump to directly (skips welcome screen) |

---

## Features

### Mobile-first bottom sheet
On viewports below 768px, the map fills the screen and content appears in a draggable bottom sheet with collapsed, half, and expanded positions. On desktop, the map and content sit side by side.

### Welcome and goodbye cards
The tour opens with a welcome card showing the tour title, description, duration, and optional rich content. Users can browse stops with arrow buttons or tap map pins to choose a starting point. The tour is circular - starting at any stop, the user visits all stops wrapping around. A goodbye card appears at the end with visit stats and optional closing content.

### Journey cards
Optional guided commentary shown between stops. Add `getting_here.journey` content blocks to a stop and the user sees a transit card with route commentary and an "I've arrived" button.

### GPS nearest-stop pre-selection
When GPS is available and the user is within range of the tour, the welcome screen automatically pre-selects the nearest stop. Configurable via `tour.gps.max_distance` (default 5km) and `tour.gps.max_accuracy` (default 500m).

### Navigation deep-links
Each stop has a "Take me there" button linking to Google Maps, Apple Maps, or Waze. The user picks their preferred app once; the choice is remembered. Supports walk, drive, transit, and cycle modes.

### Localisation (i18n)
All UI labels are overridable via `tour.strings` in the YAML file. Named placeholders (`{stop}`, `{n}`, `{total}`) keep translations readable.

### Visited-stop breadcrumbs
Stops are marked as visited when the user navigates away. The visited set persists in localStorage and is shown on both the map (pin colour) and stop list.

### Content blocks
Stop cards support five content block types: `text` (Markdown), `image` (with caption), `gallery` (horizontally scrollable), `video` (lazy-loaded YouTube), and `audio` (native player).

---

## CSS custom properties

Override these in your own stylesheet to match your site's brand colours. Set them on `:root` or on the container element.

| Property | Default | Description |
|---|---|---|
| `--maptour-primary` | `#2563eb` | Primary colour - buttons, active pin, polyline |
| `--maptour-surface` | `#ffffff` | Card and UI background |
| `--maptour-text` | `#111827` | Body text colour |
| `--maptour-accent` | `#16a34a` | Accent colour - nav button, walk polyline, visited pins |
| `--maptour-font` | `system-ui, sans-serif` | UI font stack |
| `--maptour-radius` | `8px` | Corner radius for cards and buttons |

**Example - match a green heritage brand:**

```css
:root {
  --maptour-primary: #166534;
  --maptour-accent: #ca8a04;
  --maptour-font: 'Georgia', serif;
}
```

---

## YAML format reference

Tour files are standard YAML. Create one file per tour.

### Top-level structure

```yaml
tour:
  id: my-tour-id            # required, unique string, used for localStorage keys
  title: My Tour Title       # required
  description: >             # optional
    One-paragraph description of the tour.
  duration: "45-60 minutes"  # optional, displayed on welcome card
  nav_mode: walk             # optional default travel mode: walk | drive | transit | cycle
  close_url: https://...     # optional, navigates here when tour ends
  gps:                       # optional GPS behaviour tuning
    max_distance: 5000       # metres - ignore GPS if nearest stop is further (default: 5000)
    max_accuracy: 500        # metres - ignore GPS if reading is less accurate (default: 500)
  strings:                   # optional i18n overrides (see Localisation section)
    welcome: "Bienvenue"
  welcome:                   # optional rich content blocks for welcome card
    - type: text
      body: "Welcome text here"
  goodbye:                   # optional rich content blocks for goodbye card
    - type: text
      body: "Thank you text here"

stops:
  - ...                      # ordered array of stops
```

### Stop fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes | Unique integer identifier |
| `title` | string | yes | Stop name (shown in card heading and stop list) |
| `coords` | `[lat, lng]` | yes | GPS coordinates as decimal degrees |
| `content` | array | yes | Array of content blocks (may be empty) |
| `getting_here` | object | no | Travel info for reaching this stop |

### `getting_here`

```yaml
getting_here:
  mode: walk                # required: walk | drive | transit | cycle
  note: "Follow the river path, ~8 min"  # optional hint shown on card
  route:                    # optional pre-computed waypoints for polyline
    - [52.502, -6.558]
    - [52.503, -6.556]
  journey:                  # optional content blocks shown between stops
    - type: text
      body: "Commentary during transit..."
```

Polyline styles by mode: walk = dashed, drive = solid, transit = dotted, cycle = dash-dot.

### Content block types

#### `text` - Markdown paragraph

```yaml
- type: text
  body: |
    ## Section heading
    Paragraph text with **bold**, *italic*, and [links](https://example.com).
    Markdown is fully supported via marked.js.
```

#### `image` - Single image with optional caption

```yaml
- type: image
  url: https://example.com/photo.jpg
  caption: Descriptive caption
  alt: Alt text for accessibility
```

#### `gallery` - Horizontally scrollable image gallery

```yaml
- type: gallery
  images:
    - url: https://example.com/1.jpg
      caption: First image caption
    - url: https://example.com/2.jpg
      alt: Alt text for second image
```

#### `video` - YouTube embed (lazy-loaded)

```yaml
- type: video
  url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
  caption: Optional video caption
```

#### `audio` - Native audio player

```yaml
- type: audio
  url: https://example.com/commentary.mp3
  label: Commentary by Mary O'Brien
```

---

## Localisation

All UI labels can be overridden via `tour.strings`. Keys use named placeholders.

| Key | Default | Placeholders |
|---|---|---|
| `welcome` | Welcome | |
| `en_route` | En route | |
| `complete` | Complete | |
| `all_stops` | All Stops | |
| `stop_n` | Stop {n} / {total} | `{n}`, `{total}` |
| `start_at` | Start at Stop {n} / {total}: | `{n}`, `{total}` |
| `start_from` | Start from {stop} | `{stop}` |
| `tip` | Use the arrows above to change your starting point | |
| `next_stop` | Next: {stop} | `{stop}` |
| `next_btn` | Next -> | |
| `finish_tour` | Finish Tour | |
| `arrived` | I've arrived at {stop} -> | `{stop}` |
| `tour_complete` | Tour complete! | |
| `stops_visited` | {n} / {total} stops visited | `{n}`, `{total}` |
| `revisit` | Revisit tour | |
| `close` | Close | |
| `walk_me` | Walk me there | |
| `drive_me` | Drive me there | |
| `transit_dir` | Get transit directions | |
| `cycle_dir` | Get cycling directions | |
| `directions_to` | Directions to this stop | |
| `picker_title` | Open directions in: | |
| `picker_cancel` | Cancel | |
| `direction_forward` | Start at beginning | |
| `direction_reverse` | Start at end | |
| `im_here` | I'm here | |
| `transit_label` | Stop {n}: {stop} | `{n}`, `{stop}` |
| `nearest_to_you` | Nearest to you: | |
| `stop_label` | Stop {n} - {stop} | `{n}`, `{stop}` |
| `gallery_counter` | {n} / {total} | `{n}`, `{total}` |
| `all_stops_title` | All stops | |
| `tour_load_error` | Tour could not load | |
| `image_error` | Image could not be loaded | |
| `audio_error` | Audio could not be loaded. | |
| `minimize` | Minimize | |

**Example - Irish language tour:**

```yaml
tour:
  strings:
    welcome: "Failte"
    next_btn: "Ar aghaidh ->"
    finish_tour: "Criochnaigh an turas"
    arrived: "Taim tagtha ag {stop} ->"
    revisit: "Tabhair cuairt aris"
    direction_forward: "Tosaigh ag an tus"
    direction_reverse: "Tosaigh ag an deireadh"
    im_here: "Taim anseo"
```

---

## Creating a tour

### 1. Plan your stops

Walk or drive the route and note each stop location. For each stop you need GPS coordinates (`[lat, lng]`) - the easiest way to get these is to long-press on Google Maps or Apple Maps and copy the coordinates.

Alternatively, import stops from a GPX file exported from a GPS app or route planner.

### 2. Get route waypoints

Route waypoints (`getting_here.route`) draw the polyline path between stops on the map. Without them, MapTour draws a straight line between stops. There are three ways to get route data:

**Option A: OpenRouteService API (recommended for most tours)**

The [OpenRouteService](https://openrouteservice.org) `foot-walking` profile routes along actual footpaths, not just roads. Sign up for a free API key (2000 requests/day) and call:

```
POST https://api.openrouteservice.org/v2/directions/foot-walking/geojson
Authorization: YOUR_API_KEY
Content-Type: application/json

{"coordinates": [[lng1, lat1], [lng2, lat2]]}
```

The response contains a GeoJSON LineString. Convert the `[lng, lat]` pairs to `[lat, lng]` for the YAML. Use `drive-car` or `cycling-regular` profiles for non-walking segments.

**Option B: Record a GPS trail in the field (most accurate)**

Walk the route with a GPS recording app and export the track as GPX. Good free options:
- **iOS**: Open GPX Tracker (free, exports GPX directly)
- **Android**: OsmAnd or GPX Recorder (both free)
- **Any phone**: Strava or Komoot (record activity, export GPX from the web dashboard)

Then split the track into per-segment routes and convert the coordinates to `[lat, lng]` arrays in the YAML. This is the most accurate method for trails, park paths, and routes that don't appear on routing services.

**Option C: No route data (straight lines)**

If you omit `getting_here.route`, MapTour draws a straight dashed line between stops. This is fine for stops that are very close together or when route accuracy is not important.

### 3. Write the YAML

Create a `tour.yaml` file following the format reference below. Start with the `tour` metadata, then list stops in order. Each stop needs at minimum an `id`, `title`, `coords`, and `content` array.

### 4. Add content

Fill in the `content` blocks for each stop - text, images, galleries, video, audio. See the content block reference below for all supported types.

### 5. Test locally

Serve your tour directory with any static file server and open it in a browser:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Use the welcome screen picker to cycle through stops and verify coordinates, routes, and content render correctly.

---

## Media hosting

### Images
Host images at any publicly accessible URL. Options: GitHub raw URLs (small files), Imgur/Cloudinary/any CDN (recommended for production), or Google Drive direct-download URLs (`https://drive.google.com/uc?id=FILE_ID&export=download` - note these can be throttled by Google).

### YouTube
Use standard YouTube watch URLs or short URLs. Videos must be Public or Unlisted. **CSP note:** allow `frame-src https://www.youtube.com` if your site uses Content-Security-Policy headers.

### Audio
Direct URL to an MP3 or OGG file. Google Drive share links do not work reliably for audio - use a CDN or GitHub raw URLs.

---

## Known limitations

- **Google Drive link expiry** - Drive direct-download URLs can be throttled for high-traffic files. Use a CDN for production tours.
- **YouTube CSP** - YouTube iframes require `frame-src https://www.youtube.com` in your CSP header.
- **GPS permission** - GPS positioning requires location permission. On iOS Safari, HTTPS is required. The map works fully without GPS.
- **Private browsing** - Visited-stop breadcrumbs and nav app preference use localStorage. These degrade silently in private/incognito mode.
- **One tour per page** - Multiple `MapTour.init()` calls on a single page are not supported.
- **No offline support** - Tour YAML and map tiles require connectivity. No service worker is implemented.
- **Audio/video hosting** - MapTour does not host media. External URLs only.
