# MapTour

MapTour is an embeddable, zero-backend map tour player for static websites. Drop it into any HTML page with a single `<script>` tag, point it at a YAML file, and it renders a full-page guided tour experience: a Leaflet map with numbered pins and route polylines, a rich stop card with text, images, gallery, YouTube, and audio content, live GPS positioning, visited-stop breadcrumbs, and native navigation deep-links to Google Maps, Apple Maps, or Waze. No server, no build step, no CMS.

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
  <link rel="stylesheet" href="https://github.com/YOUR-ORG/maptour/releases/download/v1.0.0/maptour.css">
</head>
<body>
  <div id="maptour" style="width:100%;height:100vh;"></div>
  <script src="https://github.com/YOUR-ORG/maptour/releases/download/v1.0.0/maptour.js"></script>
  <script>
    MapTour.init({
      container: '#maptour',
      tourUrl: './tour.yaml',
    });
  </script>
</body>
</html>
```

Download `maptour.js` and `maptour.css` from the [latest GitHub Release](https://github.com/YOUR-ORG/maptour/releases/latest) and place them alongside your HTML file. Or link directly to the release CDN URL shown above.

---

## CSS custom properties

Override these in your own stylesheet to match your site's brand colours. Set them on `:root` or on the container element.

| Property | Default | Description |
|---|---|---|
| `--maptour-primary` | `#2563eb` | Primary colour — buttons, active pin, polyline |
| `--maptour-surface` | `#ffffff` | Card and UI background |
| `--maptour-text` | `#111827` | Body text colour |
| `--maptour-accent` | `#16a34a` | Accent colour — "Take me there" button, walk polyline, visited pins |
| `--maptour-font` | `system-ui, sans-serif` | UI font stack |
| `--maptour-radius` | `8px` | Corner radius for cards and buttons |

**Example — match a green heritage brand:**

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
  id: my-tour-id          # required, unique string, used for localStorage keys
  title: My Tour Title    # required
  description: Optional one-paragraph description of the tour.

stops:
  - ...                   # ordered array of stops, see below
```

### Stop fields

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | integer | yes | Unique integer identifier |
| `title` | string | yes | Stop name (shown in card heading and stop list) |
| `coords` | `[lat, lng]` | yes | GPS coordinates as decimal degrees |
| `content` | array | yes | Array of content blocks (may be empty) |
| `leg_to_next` | object | no | Travel info to the next stop |

### `leg_to_next`

```yaml
leg_to_next:
  mode: walk    # required: "walk" or "drive"
  note: "Follow the river path, ~8 min"   # optional hint shown on card
```

Walk legs are rendered as dashed polylines; drive legs as solid polylines.

### Content block types

#### `text` — Markdown paragraph

```yaml
- type: text
  body: |
    ## Section heading

    Paragraph text with **bold**, *italic*, and [links](https://example.com).
    Markdown is fully supported via marked.js.
```

#### `image` — Single image with optional caption

```yaml
- type: image
  url: https://example.com/photo.jpg     # required
  caption: Descriptive caption           # optional, shown below image
  alt: Alt text for accessibility        # optional, falls back to caption
```

#### `gallery` — Horizontally scrollable image gallery

```yaml
- type: gallery
  images:
    - url: https://example.com/1.jpg
      caption: First image caption
    - url: https://example.com/2.jpg
      alt: Alt text for second image
```

#### `video` — YouTube embed (lazy-loaded)

```yaml
- type: video
  url: https://www.youtube.com/watch?v=dQw4w9WgXcQ
  caption: Optional video caption
```

YouTube videos are lazy-loaded: a thumbnail is shown until the visitor taps Play, keeping the initial page load fast.

#### `audio` — Native audio player

```yaml
- type: audio
  url: https://example.com/commentary.mp3
  label: Commentary by Mary O'Brien
```

---

## Media hosting

### Images

Host images wherever you like as long as the URL is publicly accessible without authentication. Options:

- **GitHub repository** — commit images to the repo and use the raw URL. Good for small images; avoid files over 1 MB.
- **Google Drive** — upload, set sharing to "Anyone with the link can view", then use the direct download URL format: `https://drive.google.com/uc?id=FILE_ID&export=download`. Note: Drive direct-link URLs can expire if Google throttles them.
- **Imgur, Cloudinary, or any public CDN** — recommended for reliability.

### YouTube

Use a standard YouTube watch URL (`https://www.youtube.com/watch?v=VIDEO_ID`) or a short URL (`https://youtu.be/VIDEO_ID`). The video must be set to Public or Unlisted.

**CSP note:** If your host site has a `Content-Security-Policy` header, you must allow `frame-src https://www.youtube.com` for YouTube embeds to work.

### Audio

Provide a direct URL to an MP3 or OGG file. The browser's native audio player handles playback. Google Drive share links do not work reliably for audio — use a proper CDN or GitHub raw URLs for small files.

---

## Known limitations

- **Google Drive link expiry** — Drive direct-download URLs can be throttled by Google for high-traffic files. For production tours, host images on a CDN.
- **YouTube CSP** — YouTube iframes require `frame-src https://www.youtube.com` in your CSP header.
- **GPS permission** — GPS positioning requires the visitor to grant location permission. On iOS Safari, this only works on HTTPS. The map works fully without GPS.
- **Private browsing** — Visited stop breadcrumbs and navigation app preference are stored in `localStorage`. These features degrade silently in private/incognito mode.
- **One tour per page** — MapTour does not support multiple `MapTour.init()` calls on a single page in v1.0.
- **Audio/video hosting** — MapTour does not host media. External URLs only.
- **No offline support** — Tour YAML and map tiles require connectivity. The player does not implement a service worker in v1.0.
