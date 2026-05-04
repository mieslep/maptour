# TOUR-052 — Authoring tool test coverage

## Summary

Bring the authoring tool (`authoring/`) under the same risk-tiered per-file coverage policy that already governs the player (constitution §VII). Today `authoring/**` is fully excluded from coverage and only three unit specs touch it; map-touching flows like adding a waypoint to an existing leg point have no automated coverage at all and have already shipped a regression. This ticket extends §VII to `authoring/`, stands up Playwright E2E infrastructure for the authoring app, lands an initial coverage batch for the cleanly-tier-able files, and writes the first Tier C E2E specs against the map-touching authoring flows.

## Motivation

The authoring tool is ~4,700 lines of TypeScript and the only tool a community-volunteer Tour Author ever uses to build a tour. Bugs there block authoring entirely (cf. the recent picker-clipping and z-index regressions, and the currently-broken "add waypoint by clicking a leg point" flow). The player has been progressively brought to per-file tier floors via TOUR-046..TOUR-051; the authoring tool was deferred and is now the single biggest untested surface. Bringing it under §VII closes the policy gap and gives us regression nets for the bugs Phil hits in live testing.

## UX Flow

There is no end-user UX change. The user-visible deliverable is "the authoring tool stops regressing on flows it used to support" — TOUR-052 is the infrastructure and initial coverage that enables that, with follow-up tickets fixing specific bugs uncovered by the new tests.

## Functional Requirements

### FR-1: Constitution §VII covers `authoring/`

- **Given** the constitution Section VII
- **When** TOUR-052 lands
- **Then** §VII is amended so that `authoring/src/**` is governed by the same Tier A/B/C policy and per-file thresholds as `src/**`. The `authoring/` exclusion is removed from `vite.config.ts`. Type-only files (`authoring/src/types.ts`) and the entry point (`authoring/src/main.ts`) are exempt by the same rule that exempts `src/index.ts` and `src/types.ts`.

### FR-2: Tier classification per authoring file

- **Given** the eight authoring source files
- **When** the tier table is published in `vite.config.ts` and reflected in §VII
- **Then** each file lands in exactly one tier:

| File | LoC | Tier | Rationale |
|------|-----|------|-----------|
| `authoring/src/yaml-io.ts` | 209 | A | Pure YAML serialise/parse + transform |
| `authoring/src/store.ts` | 145 | A | Pure tour-state mutations + undo/redo |
| `authoring/src/ors.ts` | 139 | A | Pure routing-API client (fetch is the only side effect; mockable) |
| `authoring/src/ui/content-blocks.ts` | 767 | B | DOM modal/form rendering, jsdom-friendly |
| `authoring/src/ui/tour-list.ts` | 119 | B | DOM list rendering |
| `authoring/src/ui/editor.ts` | 3167 | **mixed — split required** | See FR-3 |
| `authoring/src/main.ts` | 41 | exempt | Entry point (parity with `src/index.ts`) |
| `authoring/src/types.ts` | 119 | exempt | Type-only |

### FR-3: `editor.ts` is mixed-tier; targeted Tier C only in this ticket

- **Given** `editor.ts` mixes pure form-state logic, jsdom-renderable modal/panel rendering, AND Leaflet-touching map handlers (waypoint marker clicks, leg-point clicks, pin drag, route preview)
- **When** TOUR-052 lands
- **Then** the file is recorded with the `@phil-approved escape hatch` lower threshold (Functions ≥0%, Lines ≥0%, Branches ≥0%) with the rationale: *"mixed-tier monolith; targeted Tier C E2E coverage of map-touching flows lands in this ticket; structural split of the file into per-tier modules is tracked separately as TOUR-053"*.
- **Out of scope:** the structural split itself. Splitting `editor.ts` is a real refactor and stands as TOUR-053. TOUR-052 buys regression coverage for the highest-value map flows in the meantime; TOUR-053 will then bring each split module to its tier floor through normal §VII rules.

### FR-4: Playwright authoring web server

- **Given** Playwright currently boots one web server (`vite preview --outDir demo`) for the player E2E suite
- **When** TOUR-052 lands
- **Then** `playwright.config.ts` declares a second web server (or a multi-server array) that boots the built authoring app on a separate port, served from `dist/authoring`. The build pipeline (`npm run build:authoring`) runs in CI before the E2E job, mirroring the player's `stage-demo` step. Authoring E2E specs live under `tests/e2e/authoring/`.

### FR-5: Initial Tier A unit coverage

- **Given** the three Tier A authoring files (`yaml-io.ts`, `store.ts`, `ors.ts`)
- **When** TOUR-052 lands
- **Then** each clears the Tier A floor (Functions ≥85%, Lines/Statements ≥80%, Branches ≥70%) on its own and is enforced per-file in `vite.config.ts`. `ors.ts`'s fetch is mocked (the only external side effect); no network calls in the test run.

### FR-6: Initial Tier B unit coverage

- **Given** the two Tier B authoring files (`content-blocks.ts`, `tour-list.ts`)
- **When** TOUR-052 lands
- **Then** each clears the Tier B floor (Functions ≥70%, Lines/Statements ≥70%, Branches ≥60%) and is enforced per-file. The existing three authoring unit specs (`authoringContentBlocksPicker`, `authoringScrollHint`, `authoringWaypoints`) are extended where needed; new specs are added per the file under test.

### FR-7: First Tier C E2E specs against `editor.ts`

- **Given** Phil has reported a broken flow ("clicking on an existing leg point to add a waypoint highlights it but does not create the waypoint") and there is no automated coverage of that flow
- **When** TOUR-052 lands
- **Then** `tests/e2e/authoring/waypoints.spec.ts` covers, at minimum, the following map-touching flows. The spec is **expected to fail** on the leg-click flow when first introduced — that is the regression-net for the bug, which is fixed under a follow-up ticket. All other listed flows must pass:

| Flow | Pass/Fail expectation on first introduction |
|------|---------------------------------------------|
| Open authoring app, load demo tour, see stop list | pass |
| Select a leg with a route, click "Add Waypoint", click on the map to place a new waypoint | pass |
| Same flow but click on an **existing route point** to insert a waypoint there | **fail (regression net for the live bug)** |
| Drag an existing waypoint pin to a new position; YAML reflects the new coords on save | pass |
| Open a waypoint, edit text, save, confirm guidance text round-trips | pass |
| Delete a waypoint; confirm it disappears from the map and from the saved YAML | pass |

The failing test is committed as a `test.fail()` (Playwright's expected-failure marker) with a code comment naming the follow-up ticket; the follow-up ticket flips it to a regular `test()` once the bug is fixed.

### FR-8: CI runs the authoring E2E suite

- **Given** the existing GitHub Actions CI workflow (`.github/workflows/ci.yml`) installs Chromium and runs `tests/e2e/`
- **When** TOUR-052 lands
- **Then** CI also builds the authoring app and runs the authoring E2E specs as part of the same `playwright test` invocation (Playwright handles multiple webServers natively). The artefact-on-failure step uploads both the player and authoring traces.

## Non-Functional Requirements

- The authoring E2E web server runs on a different port from the player one (no collision when both webServers boot in parallel).
- `npm run coverage` continues to gate per-file thresholds; the `authoring/**` portion of the report participates fully.
- No tests rely on the live ORS routing API. `ors.ts` tests stub `fetch`; E2E tests load tours that use the pre-computed `getting_here.route` field rather than triggering live routing.
- Authoring E2E run time stays under 60 seconds in CI on a clean run (allowed to creep as more specs land in follow-up tickets, but the initial batch must clear this).
- No new runtime dependencies — only test fixtures and mocks.

## Out of Scope

- **Splitting `editor.ts`** into per-tier modules. Tracked as **TOUR-053**.
- **Fixing the leg-click-to-add-waypoint bug.** TOUR-052 lands the failing E2E test as a regression net; the fix lands in a follow-up ticket that flips the `test.fail()` to `test()`.
- **Authoring-tool refactors beyond what coverage exercises.** No drive-by extraction of helper modules, no API redesign — this ticket buys coverage of what's there.
- **Authoring-tool i18n parity tests.** Already covered by existing `i18n-sync.test.ts`; no additions needed.
- **Native-app authoring.** `native/` remains excluded.
- **Visual-regression / screenshot diffs.** Out of scope for this ticket; all assertions are DOM/state-based.

## Failure Modes

| Scenario | Behaviour |
|----------|-----------|
| `npm run dev:authoring` is running on port 5173 when E2E starts | E2E web server fails to bind; clear error from Playwright (operator fixes by stopping the dev server) |
| ORS fetch mock not installed in `ors.ts` tests | Tests fail loudly with a network-call assertion; never silently hit the live API |
| `editor.ts` per-file threshold accidentally raised above the escape-hatch level | Coverage gate fails the PR with a clear "TOUR-053 not yet landed; cannot tighten editor.ts threshold" message in the constitution rationale |
| Authoring app build fails before E2E | Playwright web server times out; CI fails fast with the build error surfaced in the workflow log |
| New authoring file introduced post-TOUR-052 without a tier classification | Per-file gate flags it as below the Tier B default floor; PR cannot merge until classified or a fixture spec is added |

## Acceptance Criteria

1. **Constitution amended.** §VII names `authoring/src/**` as in-scope and references the per-file table in `vite.config.ts`. Version bumped per amendment policy.
2. **Coverage gate.** `npm run coverage` passes with the `authoring/**` exclusion removed and per-file thresholds set per FR-2. No file falls below its tier floor (or the documented escape hatch for `editor.ts`).
3. **Tier A coverage.** `yaml-io.ts`, `store.ts`, `ors.ts` each clear Functions ≥85%, Lines/Statements ≥80%, Branches ≥70%. `ors.ts` tests use a `fetch` mock; no network calls.
4. **Tier B coverage.** `content-blocks.ts`, `tour-list.ts` each clear Functions ≥70%, Lines/Statements ≥70%, Branches ≥60%.
5. **Playwright authoring web server.** `playwright.config.ts` boots both the player and the authoring app; `npm run test:e2e` runs both suites green (with the one expected `test.fail()` per FR-7).
6. **Tier C E2E specs.** `tests/e2e/authoring/waypoints.spec.ts` exists, exercises the six flows in FR-7, and references the source file `authoring/src/ui/editor.ts` in its header (parity with the §VII Tier C requirement that the spec name the source file).
7. **CI green.** The CI job builds the authoring app, runs the merged Playwright suite, and uploads traces on failure.
8. **No regression on existing 632 unit tests.** Test count grows with the new authoring specs; existing tests still pass.

## Test Approach

- **Unit (jsdom):** Standard Vitest specs added under `tests/unit/authoring*.test.ts` for each Tier A/B file. Mock `fetch` for `ors.ts`.
- **E2E (Playwright):** New `tests/e2e/authoring/waypoints.spec.ts` driving the built authoring app on `localhost:<auth-port>`. Loads a fixture tour, performs map clicks via Playwright's `page.locator('.leaflet-container').click({ position })`, asserts on DOM (waypoint pin count, modal open) and on the YAML output exposed by the app's "preview YAML" panel. The leg-click flow is tagged `test.fail()` referencing the follow-up bug-fix ticket.
- **Manual:** Phil's existing live-testing loop in Edge continues to surface bugs; this ticket converts the next class of those bugs into automated regression nets rather than chasing them post-hoc.
