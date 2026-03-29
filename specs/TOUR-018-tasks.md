# TOUR-018 — Task List: Navigation Mode YAML + Deep-Link Hints

**Branch**: `TOUR-018-nav-mode-yaml`
**Plan**: `specs/TOUR-018-plan.md`
**Status**: Draft

---

## Task 1 — Extend types: LegMode + TourMeta.nav_mode

**Scope**: Update `src/types.ts` — extend `LegMode` union to four values; add `nav_mode?: LegMode` to `TourMeta`.

**Acceptance**:
- TypeScript compiles with no errors
- All existing usages of `LegMode` continue to type-check

**Dependencies**: none
**Files**: `src/types.ts`

---

## Task 2 — Loader: parse + validate extended modes

**Scope**: Update `src/loader.ts` to read `tour.nav_mode`; validate it against extended `LegMode`; emit a warning and return `undefined` if invalid. Extend `leg_to_next.mode` validation to accept `transit | cycle`.

**Acceptance**:
- Unit test: `nav_mode: cycle` parses to `'cycle'`
- Unit test: `nav_mode: helicopter` emits warning, field is `undefined`
- Unit test: `leg_to_next.mode: transit` passes validation
- Unit test: tours with no `nav_mode` field parse successfully, `tour.nav_mode` is `undefined`
- All existing loader unit tests pass unchanged

**Dependencies**: Task 1
**Files**: `src/loader.ts`, `tests/unit/loader.test.ts`

---

## Task 3 — NavButton: mode resolution, deep-link, filtered picker, button label

**Scope**: Update `src/card/NavButton.ts`:
- Add `tourNavMode?: LegMode` constructor parameter
- `resolveMode()` helper: stop mode > tour mode > `'walk'`
- Update `buildDeepLink` for all four modes
- `APPS_BY_MODE` filter map; filter picker list; handle saved-preference-incompatible-with-mode case
- Button label and aria-label from mode

**Acceptance**:
- Unit test: `resolveMode` picks stop mode over tour mode; tour mode over default
- Unit test: `buildDeepLink('google', lat, lng, 'transit')` returns correct URL
- Unit test: `buildDeepLink('apple', lat, lng, 'cycle')` returns `dirflg=b`
- Unit test: picker for `walk` mode contains Google and Apple but not Waze
- Unit test: saved Waze preference ignored when mode is `walk`; picker shown with Google + Apple
- Unit test: button label is "Drive me there" when mode is `drive`

**Dependencies**: Task 1
**Files**: `src/card/NavButton.ts`, `tests/unit/navbutton.test.ts`

---

## Task 4 — layers.ts: polyline styles for transit + cycle

**Scope**: Extend `LEG_STYLE` map in `src/map/layers.ts` to handle `transit` and `cycle`.

**Acceptance**:
- `cycle` produces dashed polyline (same visual as `walk`)
- `transit` produces solid polyline (same visual as `drive`)
- Existing walk and drive polyline tests pass

**Dependencies**: Task 1
**Files**: `src/map/layers.ts`, `tests/unit/layers.test.ts`

---

## Task 5 — Wire tourNavMode through index.ts + NavController

**Scope**: Pass `tour.tour.nav_mode` from loaded tour through to `NavButton` constructor and `update()` calls.

**Acceptance**:
- E2E: tour with `nav_mode: drive` and no per-stop mode → picker offers Waze
- E2E: tour with `nav_mode: transit` → picker offers Google and Apple only
- E2E: per-stop `leg_to_next.mode: drive` overrides tour `nav_mode: walk` → Waze offered on that stop
- Existing E2E tests pass

**Dependencies**: Tasks 2, 3, 4
**Files**: `src/index.ts`, `src/navigation/NavController.ts`, `tests/e2e/nav.spec.ts`
