# MapTour — Testing strategy

Status: **DRAFT v3** — not yet adopted. Iterated through two rounds of
adversarial review.

## Why this exists

The 80% aggregate coverage threshold currently configured in `vite.config.ts`
masks serious unevenness. As of 2026-05-02 the suite passes at 80.65% lines
aggregate, but **12 source files are below the proposed per-file floor on at
least one metric**, including `src/orchestrator/journeyHandler.ts` at **0%**
(324 lines) and `src/loader.ts` at **43% lines** (the YAML tour-file parser
— a critical-path file). Per-file gates would surface these immediately.
Aggregate-only gates hide them indefinitely.

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

## Below-threshold inventory

Generated from `coverage/lcov.info` 2026-05-02 against each file's assigned
tier floor. Each row requires an explicit disposition before TOUR-051
flips the per-file gate.

| File | Tier | Lines | Functions | Branches | Failing on | Disposition |
|---|---|---:|---:|---:|---|---|
| `src/orchestrator/journeyHandler.ts` | A | 0% | 0% | 0% | All | TOUR-047 unit tests |
| `src/loader.ts` | A | 43% | 50% | 80% | Lines, functions | TOUR-048 unit tests |
| `src/gps/GpsTracker.ts` | A | 85% | **72%** | 78% | Functions (Tier A floor 85%) | TOUR-048 unit tests (battery-saver branches) |
| `src/card/NavButton.ts` | B | 33% | 50% | 89% | Lines, functions | TOUR-049 unit tests |
| `src/waypoint/GuidanceBanner.ts` | B | 66% | 86% | 100% | Lines | TOUR-049 unit tests (existing photo-modal gap; consider extraction) |
| `src/map/MapView.ts` | B | 73% | **61%** | 85% | Functions | TOUR-049 unit tests (existing 24-test suite is the foundation; expand jsdom mocking) |
| `src/layout/buildMobileLayout.ts` | B | 76% | **25%** | 80% | Functions | TOUR-049 unit tests (helper closures, scroll-hint observers) |
| `src/card/blocks/renderBlock.ts` | B | 79% | 100% | **17%** | Branches | TOUR-050 unit tests (block-type dispatch) |
| `src/card/blocks/TextBlock.ts` | B | 82% | 100% | **50%** | Branches | TOUR-050 unit tests (async path) |
| `src/card/blocks/AudioBlock.ts` | B | 82% | 50% | 100% | Functions | TOUR-050 unit tests |
| `src/card/blocks/GalleryBlock.ts` | B | 83% | 50% | 100% | Functions | TOUR-050 unit tests |
| `src/card/blocks/ImageBlock.ts` | B | 84% | 67% | 100% | Functions | TOUR-050 unit tests |
| `src/card/GoodbyeCard.ts` | B | 91% | 100% | **50%** | Branches | TOUR-050 unit tests (restart-vs-back branch) |

13 files (12 reported by codex round 1 plus `GpsTracker` which only fails
under Tier A's stricter 85% functions floor). The inventory is the source
of truth for what TOUR-051 must achieve before the gate flips.

## Restoration plan (revised order)

The order matters — earlier critique surfaced a CI-sequencing hole.

1. **TOUR-046 — Playwright in CI** (M).
   Today CI runs `npm run coverage` only; Playwright is not exercised.
   Playwright's config uses `vite preview` which needs a built bundle, so
   simply adding `npm run test:e2e` to the workflow would fail. This ticket
   either (a) adds an explicit `npm run build` step before E2E, or (b)
   switches `playwright.config.ts` to use `npm run dev` (no build needed).
   No Tier C disposition is valid until this ticket lands and CI runs
   Playwright on every PR.
2. **TOUR-047 — `journeyHandler.ts` unit tests** (M). 0% → Tier A. Largest
   single coverage win; pure orchestration, no DOM mocking required.
3. **TOUR-048 — Tier A remediation** (M). `loader.ts` and `GpsTracker.ts`
   to Tier A floors. Both are pure-logic files with substantial decision
   surfaces; clearing them is high-confidence.
4. **TOUR-049 — Tier B remediation, batch 1** (S-M). `NavButton.ts`,
   `GuidanceBanner.ts` (excluding photo modal — see TOUR-051 if extraction
   needed), `buildMobileLayout.ts`, `MapView.ts` function gaps.
5. **TOUR-050 — Tier B remediation, batch 2** (S). Block renderer functions
   and branches: `AudioBlock`, `GalleryBlock`, `ImageBlock`, `renderBlock`
   branch dispatch, `TextBlock` async path, `GoodbyeCard` restart branch.
6. **TOUR-051 — Per-file thresholds + Tier C registry, flip the gate** (S).
   Implement the tier model in `vite.config.ts`. Add `coverage:check`
   script that validates for every Tier C entry: paired spec file exists,
   header comment names the source file, spec contains explicit assertions
   against the source's exported tags/selectors, and the spec is included
   in CI. Decide whether to extract any portion (e.g., `BottomSheet` drag
   handlers, `GuidanceBanner` photo modal) before classifying as Tier C.

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
