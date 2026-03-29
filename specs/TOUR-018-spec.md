# TOUR-018 — Navigation Mode: YAML Schema + "Take Me There" Hints

**Branch**: `TOUR-018-nav-mode-yaml`
**Status**: Draft — awaiting Phil sign-off
**Depends on**: TOUR-016 (for the `in_transit` trigger integration; can be implemented independently otherwise)

---

## What and Why

"Take me there" currently supports two travel modes — walk and drive — sourced from `leg_to_next.mode` on each stop. There is no tour-level default mode, and transit/cycling are not supported. Waze is always offered regardless of mode, even though Waze is a driving-only app.

This ticket extends the travel mode vocabulary to four modes (`walk`, `drive`, `transit`, `cycle`), adds a tour-level `nav_mode` default to the YAML, passes the correct mode hint to each nav app's deep-link URL, and filters the nav app picker to only show apps that support the current mode.

---

## Functional Requirements

### Extended Travel Modes

`LegMode` extended from `'walk' | 'drive'` to `'walk' | 'drive' | 'transit' | 'cycle'`.

These apply to:
- `tour.nav_mode` — tour-level default (new field)
- `stop.leg_to_next.mode` — per-leg override (already exists; extended)

**Mode resolution chain** (highest priority first):
1. `stop.leg_to_next.mode` (if present on the current stop)
2. `tour.nav_mode` (if set)
3. Hardcoded default: `'walk'`

---

### YAML Schema Extension

```yaml
tour:
  id: ett-2025
  title: Enniscorthy Tidy Towns 2025
  nav_mode: walk          # optional; walk | drive | transit | cycle; default: walk

stops:
  - id: 1
    title: Town Square Planting
    coords: [52.5022, -6.5581]
    content: [...]
    leg_to_next:
      mode: drive         # overrides tour.nav_mode for this leg
      note: "Short drive to next cluster, ~5 min"
```

**Validation**: `tour.nav_mode` is optional; if present must be one of `walk | drive | transit | cycle`. `leg_to_next.mode` same constraint.

---

### Nav App Deep-Link URLs by Mode

| Mode | Google Maps | Apple Maps | Waze |
|---|---|---|---|
| walk | `travelmode=walking` | `dirflg=w` | ❌ not offered |
| drive | `travelmode=driving` | `dirflg=d` | ✅ `navigate=yes` |
| transit | `travelmode=transit` | `dirflg=r` | ❌ not offered |
| cycle | `travelmode=bicycling` | `dirflg=b` | ❌ not offered |

**Waze** is only shown in the picker when mode is `drive`.

---

### Nav App Picker Filtering

The picker shows only apps that support the current mode:
- `walk`: Google Maps, Apple Maps
- `drive`: Google Maps, Apple Maps, Waze
- `transit`: Google Maps, Apple Maps
- `cycle`: Google Maps, Apple Maps

If the user has a saved preference (localStorage) for an app that doesn't support the current mode (e.g. Waze saved but mode is now `walk`), ignore the saved preference for this leg and show the picker filtered to valid apps. Do not clear the saved preference — it may be valid for a future drive leg.

---

### Route Polyline Styles (Map)

`layers.ts` currently styles polylines as dashed (walk) or solid (drive). Extended:
- `walk` → dashed
- `cycle` → dashed (same as walk)
- `drive` → solid
- `transit` → solid (same as drive)

---

### "Take me there" Button Text

Button label reflects the mode:
- `walk` → "Walk me there"
- `drive` → "Drive me there"
- `transit` → "Get transit directions"
- `cycle` → "Get cycling directions"

`aria-label` updates accordingly: "Get walking directions to [stop title]", etc.

---

## Non-Functional Requirements

- If `tour.nav_mode` is an unrecognised value, the loader emits a validation warning (not error) and falls back to `'walk'`
- Backwards compatible: tours with no `nav_mode` field and `leg_to_next.mode: walk | drive` only behave identically to before

---

## Out of Scope

- Per-stop `nav_mode` override outside of `leg_to_next` (the leg mode covers this)
- Custom nav app URLs (e.g. Citymapper) — could be a future enhancement
- Detecting which nav apps are installed on the device — not possible from the web reliably

---

## Failure Modes

| Scenario | Behaviour |
|---|---|
| `tour.nav_mode` invalid value | Validation warning, falls back to `'walk'` |
| Saved nav app preference (e.g. Waze) incompatible with current leg mode | Ignore saved preference for this leg; show filtered picker; do not clear preference |
| Apple Maps `dirflg=b` not supported on older iOS | Apple Maps silently falls back to walking directions — acceptable |

---

## Acceptance Criteria

- Given `tour.nav_mode: transit` and no per-stop mode override, the "Take me there" picker offers Google Maps and Apple Maps only (no Waze)
- Given `leg_to_next.mode: drive` on a stop, Waze is offered in the picker regardless of `tour.nav_mode`
- Given `tour.nav_mode: cycle`, Google Maps deep-link uses `travelmode=bicycling`
- Given a saved Waze preference and the current mode is `walk`, the picker is shown again with only Google Maps and Apple Maps
- Given `tour.nav_mode` is absent, behaviour is identical to current (defaults to walk)
- Given `leg_to_next.mode: drive`, button label is "Drive me there"
- Given a tour YAML with only `walk` and `drive` modes, all existing behaviour is unchanged
