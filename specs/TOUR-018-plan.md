# TOUR-018 — Architecture Plan: Navigation Mode YAML + Deep-Link Hints

**Branch**: `TOUR-018-nav-mode-yaml`
**Spec**: `specs/TOUR-018-spec.md`
**Status**: Draft — awaiting Phil sign-off

---

## Summary

Extend `LegMode`, add `nav_mode` to `TourMeta`, update `buildDeepLink` for four modes, filter the picker by mode capability, and update route polyline styles. No new modules. All changes are contained within existing files.

---

## Modified Modules

### `src/types.ts`

```typescript
// Before
export type LegMode = 'walk' | 'drive';

// After
export type LegMode = 'walk' | 'drive' | 'transit' | 'cycle';

export interface TourMeta {
  id: string;
  title: string;
  description?: string;
  nav_mode?: LegMode;    // new — tour-level default travel mode
}
```

Note: `TourMeta` is nested under `Tour.tour` in the YAML (`tour.nav_mode`). The `Tour` interface wraps it.

---

### `src/loader.ts`

- Read `tour.nav_mode` from parsed YAML; validate against extended `LegMode` union; warn and fall back to `undefined` (not `'walk'`) if invalid — callers resolve the default
- Extend `leg_to_next.mode` validation to accept `transit` and `cycle`
- Backwards compatible: existing YAML with no `nav_mode` produces `undefined`, which resolves to `'walk'` in the mode resolution chain

---

### `src/card/NavButton.ts`

**Mode resolution helper** (internal to NavButton):

```typescript
function resolveMode(stop: Stop, tourNavMode?: LegMode): LegMode {
  return stop.leg_to_next?.mode ?? tourNavMode ?? 'walk';
}
```

**Updated `buildDeepLink`:**

```typescript
function buildDeepLink(app: NavApp, lat: number, lng: number, mode: LegMode): string {
  const googleMode: Record<LegMode, string> = {
    walk: 'walking', drive: 'driving', transit: 'transit', cycle: 'bicycling',
  };
  const appleFlag: Record<LegMode, string> = {
    walk: 'w', drive: 'd', transit: 'r', cycle: 'b',
  };
  switch (app) {
    case 'google':
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${googleMode[mode]}`;
    case 'apple':
      return `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=${appleFlag[mode]}`;
    case 'waze':
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;  // mode-agnostic
  }
}
```

**Apps by mode** (for picker filtering):

```typescript
const APPS_BY_MODE: Record<LegMode, NavApp[]> = {
  walk:    ['google', 'apple'],
  drive:   ['google', 'apple', 'waze'],
  transit: ['google', 'apple'],
  cycle:   ['google', 'apple'],
};
```

**Picker**: filters `apps` array using `APPS_BY_MODE[mode]`. If saved preference is not in valid apps for current mode, ignores preference and shows filtered picker.

**Button label**:

```typescript
const BUTTON_LABELS: Record<LegMode, string> = {
  walk:    'Walk me there',
  drive:   'Drive me there',
  transit: 'Get transit directions',
  cycle:   'Get cycling directions',
};
const ARIA_LABELS: Record<LegMode, string> = {
  walk:    'Get walking directions to',
  drive:   'Get driving directions to',
  transit: 'Get transit directions to',
  cycle:   'Get cycling directions to',
};
```

**Constructor update**: accept optional `tourNavMode?: LegMode` parameter; compute effective mode on each `update()` call.

---

### `src/map/layers.ts`

Extend polyline style lookup for `transit` and `cycle`:

```typescript
// Current: walk=dashed, drive=solid
// Extended:
const LEG_STYLE: Record<LegMode, PathOptions> = {
  walk:    { dashArray: '6 4', weight: 3, color: ... },
  cycle:   { dashArray: '6 4', weight: 3, color: ... },  // same as walk
  drive:   { dashArray: undefined, weight: 3, color: ... },
  transit: { dashArray: undefined, weight: 3, color: ... },  // same as drive
};
```

---

### `src/navigation/NavAppPreference.ts`

No change needed. Preference stores a `NavApp` string (`'google' | 'apple' | 'waze'`); the mode filtering logic lives in `NavButton`.

---

## index.ts / NavController Changes

`NavButton` needs the resolved `tourNavMode` passed down. `index.ts` reads `tour.tour.nav_mode` from the loaded tour and passes it to `NavButton` constructor and `update()` calls. One additional constructor argument — minimal change.

---

## No New Dependencies

All changes are within existing modules. No new files. No build pipeline changes.

---

## Backwards Compatibility

Tours with existing `leg_to_next.mode: walk | drive` YAML produce identical behaviour. The `tour.nav_mode` field is optional; its absence is equivalent to no change.
