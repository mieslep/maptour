# MapTour

Embeddable, zero-backend map tour player for static websites. Create a guided tour with the visual editor, export a YAML file, drop it into any HTML page with a single `<script>` tag. No server, no build step, no CMS.

Built for anyone who wants curate a multimedia tour along a guided path.

**[Live demo](https://mieslep.github.io/maptour/)** - try the Ennis Sculpture Trail example.

---

## What you get

- Map with numbered pins and route guides
- Mobile-first bottom sheet with rich stop cards (text, images, galleries, video, audio)
- Welcome and goodbye cards with flexible starting point
- Journey commentary between stops
- Circular tour support - start anywhere in either direction, return to start at the end.
- GPS positioning with nearest-stop detection and arrival alerts
- Native navigation deep-links (Google Maps, Apple Maps, Waze)
- UI label localisation for tours in any language
- CSS custom properties for brand theming
- Visited-stop breadcrumbs persisted in localStorage

---

## Creating a tour

### 1. Create your tour in the editor

Open the [authoring tool](https://mieslep.github.io/maptour/authoring/) in your browser. Add stops by clicking the map, edit content with the WYSIWYG card preview, draw or auto-generate route polylines, and configure welcome/goodbye cards.

### 2. Export the YAML

Click **Export YAML** in the editor. This gives you a `tour.yaml` file containing all your stops, content, and routes.

### 3. Host the YAML and media

Upload your `tour.yaml` and any images/audio to a web-accessible URL. This can be GitHub Pages, your own web server, an S3 bucket, or anywhere that serves static files.

### 4. Embed the player on your page

Add the MapTour player to your HTML page, pointing at the hosted JS/CSS and your tour YAML.

A ready-to-paste embed snippet with current SRI hashes is published at [`EMBED.md`](https://mieslep.github.io/maptour/EMBED.md) after each build. SRI hashes are also available programmatically at [`sri.json`](https://mieslep.github.io/maptour/sri.json).

The basic structure:

```html
<link rel="stylesheet"
      href="https://mieslep.github.io/maptour/maptour.css"
      integrity="sha384-..." crossorigin="anonymous">

<div id="maptour" style="width:100%;height:100vh;"></div>

<script src="https://mieslep.github.io/maptour/maptour.js"
        integrity="sha384-..." crossorigin="anonymous"></script>
<script>
  MapTour.init({
    container: '#maptour',
    tourUrl: 'https://yoursite.com/tour.yaml',
  });
</script>
```

Copy the full snippet from [EMBED.md](https://mieslep.github.io/maptour/EMBED.md) to get the correct integrity hashes for the current build.

| Option | Type | Required | Description |
|---|---|---|---|
| `container` | string or HTMLElement | yes | CSS selector or DOM element to render into |
| `tourUrl` | string | yes | URL to the tour YAML file |
| `startStop` | number | no | Stop ID to jump to directly (skips welcome screen) |

---

## Theming

Override CSS custom properties to match your site's brand:

```css
:root {
  --maptour-primary: #166534;
  --maptour-accent: #ca8a04;
  --maptour-font: 'Georgia', serif;
}
```

| Property | Default | Description |
|---|---|---|
| `--maptour-primary` | `#2563eb` | Buttons, active pin, polyline |
| `--maptour-surface` | `#ffffff` | Card background |
| `--maptour-text` | `#111827` | Body text |
| `--maptour-accent` | `#16a34a` | Nav button, visited pins |
| `--maptour-font` | `system-ui, sans-serif` | UI font stack |
| `--maptour-radius` | `8px` | Corner radius |

---

## YAML reference

The `demo/tour.yaml` file is a complete working example (Ennis Sculpture Trail, 16 stops). Use it as a starting point or reference for the YAML schema.

Tour YAML is validated on load against a Zod schema (`src/schema.ts`). Validation errors are shown in the browser console with specific field paths.

---

## Localisation

All player UI labels (buttons, headings, status text) default to English and can be overridden via `tour.strings` in the YAML file. Named placeholders like `{stop}`, `{n}`, `{total}` are supported. This allows publishing tours in any language without modifying the player code.

---

## Development

```bash
npm install
npm run dev              # player dev server
npm run dev:authoring    # authoring tool dev server
npm test             # vitest unit tests
npm run build        # production build → dist/
```

---

## Known limitations

- **One tour per page** - multiple `MapTour.init()` calls are not supported
- **No offline support** - tour YAML and map tiles require connectivity
- **GPS requires HTTPS** on iOS Safari; the map works fully without GPS
- **Private browsing** - localStorage features (visited stops, nav app preference) degrade silently
- **Media hosting** - MapTour does not host media; use external URLs or place files alongside your HTML
