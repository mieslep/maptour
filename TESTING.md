# MapTour — Testing strategy

Status: **ADOPTED** as of TOUR-051. The risk-tiered per-file thresholds
defined here are enforced by `vite.config.ts` and run on every CI build.

## Why this exists

Before TOUR-046..051, the 80% aggregate coverage threshold in
`vite.config.ts` masked serious unevenness. At the start of this work the
suite passed at 80.65% lines aggregate, but **12 source files were below
the per-file floor on at least one metric**, including
`src/orchestrator/journeyHandler.ts` at **0%** (324 lines) and
`src/loader.ts` at **43% lines** (the YAML tour-file parser — a
critical-path file). After TOUR-047..050 brought all 12 files above
their tier floors, TOUR-051 flipped the gate to per-file enforcement.

Aggregate as of TOUR-051: **95.6% lines / 95% functions / 93% branches**
across 533+ unit tests + 4 E2E smoke tests.

## Threshold model: risk-tiered, functions-authoritative

A single flat per-file floor invites coverage of cheap lines while leaving
risky paths uncovered (`MapView.ts` is 73% lines but only 61% functions today
— function-level coverage tracks behaviour better than line-level on
decision-heavy modules).

The proposed model has three tiers, each with explicit thresholds. **The
`functions` metric is authoritative across all tiers** because it most
directly maps to "did we exercise this behaviour?" — lines can pass while
whole functions go unentered.

### Tier A — pure logic, orchestrators, parsers, validators

| Metric | Floor |
|---|---|
| Functions | 85% |
| Lines / Statements | 80% |
| Branches | 70% |

No DOM, no Leaflet, no third-party rendering. High coverage should be cheap.

### Tier B — DOM-touching UI components testable in jsdom

| Metric | Floor |
|---|---|
| Functions | 70% |
| Lines / Statements | 70% |
| Branches | 60% |

The default tier for new files. Most player UI components live here.

### Tier C — jsdom-hostile, isolated and E2E-covered

Per-file *unit* threshold is reduced **and** the file MUST have a dedicated
Playwright spec that exercises the file's specific behaviour. **Tier C is
only valid for files where the entire file is jsdom-hostile.** A file with
both jsdom-friendly and jsdom-hostile code paths cannot be Tier C — the
hostile portion must first be **extracted into its own file**, which then
becomes Tier C while the original keeps Tier B.

| Metric | Floor (unit) |
|---|---|
| Functions | 40% |
| Lines / Statements | 50% |
| Branches | 30% |
| **Plus** | a dedicated Playwright spec at `tests/e2e/<basename>.spec.ts` exercising the file's behaviour, and an active reference to it in the Tier C registry below |

The `coverage:check` script (TOUR-051) verifies for every Tier C entry:
1. The named E2E spec file exists.
2. The spec file's header comment contains the source file path.
3. The spec contains at least one `expect()` against a tag/selector defined
   in the file's source (machine-checkable via grep).
4. The spec is included in the CI Playwright run.

This is not perfect — a Playwright spec can technically pass without
asserting the risky behaviour — but it raises the bar substantially above
"a spec exists".

### Phil-approved exception (escape hatch)

For a file where chasing more coverage is **genuinely farcical** (a thin
third-party wrapper, a defensive logging helper where every branch is
degenerate), a fourth state exists: a per-file override in `vite.config.ts`
with the rationale recorded in the "Approved exceptions" section below.
**Phil approves each entry individually.**

This is **not** a Tier C alternative — Tier C requires a replacement test.
The exception is for files that genuinely do not need any coverage at any
layer beyond what they already have.

## Exhaustive tier registry

Every source file under `src/` is listed below with its assigned tier. The
inventory below this table is generated from `coverage/lcov.info` against
each file's tier floor. Type-only files (no executable code) are noted but
exempt from coverage entirely.

| File | Tier | Notes |
|---|---|---|
| `src/breadcrumb/Breadcrumb.ts` | A | Visited-set logic |
| `src/card/AboutCard.ts` | B | UI |
| `src/card/ArrivingBanner.ts` | B | UI banner |
| `src/card/CardHost.ts` | B | UI host |
| `src/card/GettingHereCard.ts` | B | UI card |
| `src/card/GoodbyeCard.ts` | B | UI card |
| `src/card/JourneyCardRenderer.ts` | B | UI renderer |
| `src/card/NavButton.ts` | B | UI + deep-link logic |
| `src/card/StopCardRenderer.ts` | B | UI renderer |
| `src/card/WelcomeCard.ts` | B | UI card |
| `src/card/blocks/AudioBlock.ts` | B | UI block |
| `src/card/blocks/GalleryBlock.ts` | B | UI block |
| `src/card/blocks/ImageBlock.ts` | B | UI block |
| `src/card/blocks/MapBlock.ts` | B | UI block |
| `src/card/blocks/TextBlock.ts` | B | UI block + markdown |
| `src/card/blocks/VideoBlock.ts` | B | UI block |
| `src/card/blocks/renderBlock.ts` | B | UI dispatcher |
| `src/errors/ErrorDisplay.ts` | B | UI error display |
| `src/gps/GpsTracker.ts` | A | Geolocation wrapper, decision-heavy battery saver |
| `src/gps/nearestStop.ts` | A | Pure geometry |
| `src/gps/proximityDetector.ts` | A | Pure geometry + state |
| `src/i18n.ts` | A | Lookup logic |
| `src/index.ts` | exempt | Entry point — already excluded in `vite.config.ts` |
| `src/journey/JourneyStateManager.ts` | A | State machine |
| `src/layout/BottomSheet.ts` | B (today) → may split later if drag handlers are extracted | Whole-file Tier C not justified |
| `src/layout/InTransitBar.ts` | B | UI bar |
| `src/layout/MapPanel.ts` | B | UI panel |
| `src/layout/MenuBar.ts` | B | UI menu |
| `src/layout/OverviewControls.ts` | B | UI controls |
| `src/layout/ProgressBar.ts` | B | UI bar |
| `src/layout/StopListOverlay.ts` | B | UI overlay |
| `src/layout/TourFooter.ts` | B | UI footer |
| `src/layout/buildDesktopLayout.ts` | B | UI layout builder |
| `src/layout/buildMobileLayout.ts` | B | UI layout builder |
| `src/layout/types.ts` | exempt | Type-only |
| `src/loader.ts` | A | YAML parser, schema-validated tour load |
| `src/map/MapView.ts` | B | Substantial jsdom test suite already exists; not Tier C despite Leaflet |
| `src/map/chevrons.ts` | A | Pure geometry |
| `src/map/layers.ts` | A | Layer config |
| `src/navigation/NavAppPreference.ts` | A | localStorage + nav-app picker logic |
| `src/navigation/NavController.ts` | A | Stop-navigation state |
| `src/orchestrator/journeyHandler.ts` | A | Pure orchestration |
| `src/schema.ts` | A | Zod schema |
| `src/session/TourSession.ts` | A | Tour session state |
| `src/types.ts` | exempt | Type-only |
| `src/util/markedExtensions.ts` | A | Markdown extension + helper |
| `src/util/sanitiseHtml.ts` | A | Pure string transform |
| `src/waypoint/GuidanceBanner.ts` | B (today) → may split later if photo modal is extracted | Whole-file Tier C not justified |
| `src/waypoint/WaypointTracker.ts` | A | State machine |

No files are Tier C at adoption time. Tier C entries land only when a
file (or extracted sub-file) is genuinely jsdom-hostile *and* a paired
Playwright spec exists.

## Approved exceptions

Empty at adoption. Format:

```
- src/path/to/File.ts — Functions: 30 — Reason: <one sentence>. Approved <YYYY-MM-DD>.
```

## Tier C registry (jsdom-hostile, E2E-covered)

Empty at adoption. Format:

```
- src/path/to/File.ts — E2E: tests/e2e/<basename>.spec.ts
```

## Below-threshold inventory (historical — all remediated)

The 13 files below are what triggered the rampup. All cleared their tier
floors via TOUR-047..050 and now pass the per-file gate enabled by TOUR-051.

| File | Tier | Before (lines / func / branch) | After | Remediated by |
|---|---|---|---|---|
| `src/orchestrator/journeyHandler.ts` | A | 0/0/0 | 89/100/89 | TOUR-047 |
| `src/loader.ts` | A | 43/50/80 | 100/100/86 | TOUR-048 |
| `src/gps/GpsTracker.ts` | A | 85/72/78 | 97/100/88 | TOUR-048 |
| `src/card/NavButton.ts` | B | 33/50/89 | 100/100/97 | TOUR-049 |
| `src/waypoint/GuidanceBanner.ts` | B | 66/86/100 | 100/100/100 | TOUR-049 |
| `src/map/MapView.ts` | B | 73/61/85 | 96/97/88 | TOUR-049 |
| `src/layout/buildMobileLayout.ts` | B | 76/25/80 | 99/100/93 | TOUR-049 |
| `src/card/blocks/renderBlock.ts` | B | 79/100/17 | 100/100/100 | TOUR-050 |
| `src/card/blocks/TextBlock.ts` | B | 82/100/50 | 100/100/100 | TOUR-050 |
| `src/card/blocks/AudioBlock.ts` | B | 82/50/100 | 100/100/100 | TOUR-050 |
| `src/card/blocks/GalleryBlock.ts` | B | 83/50/100 | 92/100/100 | TOUR-050 |
| `src/card/blocks/ImageBlock.ts` | B | 84/67/100 | 100/100/92 | TOUR-050 |
| `src/card/GoodbyeCard.ts` | B | 91/100/50 | 100/100/100 | TOUR-050 |

## Restoration plan (completed)

All six tickets shipped to main:

1. **TOUR-046 — Playwright in CI** ✅ Replaced stale E2E spec with current-selector smoke suite; added build → demo-stage → install browsers → e2e to `.github/workflows/ci.yml`.
2. **TOUR-047 — `journeyHandler.ts` unit tests** ✅ 0% → 89/100/89.
3. **TOUR-048 — Tier A remediation** ✅ `loader.ts` and `GpsTracker.ts` to Tier A floors.
4. **TOUR-049 — Tier B batch 1** ✅ `NavButton`, `GuidanceBanner`, `buildMobileLayout`, `MapView`.
5. **TOUR-050 — Tier B batch 2** ✅ Block renderers and `GoodbyeCard` branches.
6. **TOUR-051 — Per-file thresholds, flip the gate** ✅ Tiered thresholds in `vite.config.ts` enforced per-file.

The `coverage:check` script for Tier C registry validation is **deferred** —
no Tier C entries currently exist. When the first Tier C disposition is
added, the script lands alongside it.

## Maintenance model

- **Per-file threshold + tier enforced in CI.** A file dropping below its
  tier floor fails the build.
- **Tier classification is part of `vite.config.ts` (or a sibling JSON)**
  and kept in sync with this document. CI verifies the tier registry
  matches the source-file inventory (no orphaned tiers, no untiered files).
- **Tier C requires a paired Playwright spec already running in CI.** No
  "we'll write the E2E later" exceptions. The `coverage:check` script
  enforces this.
- **No new files at <Tier B accepted.** New code lands with tests; new files
  default to Tier B and must clear its floor on the PR that introduces
  them. Promoting to Tier A is encouraged for pure-logic files.
- **Approved exceptions are reviewed.** When a file with an "Approved
  exception" changes substantively, the exception is re-evaluated.
- **This document is the source of truth.** Changes to thresholds or tier
  classifications require a paired update here.
