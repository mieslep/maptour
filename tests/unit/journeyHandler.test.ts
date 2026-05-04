/**
 * TOUR-047: Unit coverage for src/orchestrator/journeyHandler.ts
 *
 * journeyHandler is pure orchestration: it dispatches on JourneyState and
 * sequences method calls on ~25 collaborators. Tests mock every collaborator
 * and assert the right calls happen for each state branch.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createJourneyHandler, type JourneyHandlerDeps } from '../../src/orchestrator/journeyHandler';
import type { Tour, Waypoint } from '../../src/types';

// jsdom doesn't provide requestAnimationFrame in all setups; force a simple shim.
beforeEach(() => {
  // @ts-expect-error overriding for test
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  };
});

function makeTour(extra: Partial<Tour['stops'][0]['getting_here']> = {}): Tour {
  const stops: Tour['stops'] = [
    { id: 1, title: 'Stop One', coords: [52.5, -6.5], content: [] },
    {
      id: 2, title: 'Stop Two', coords: [52.51, -6.51], content: [],
      getting_here: { mode: 'walk', ...extra },
    },
    { id: 3, title: 'Stop Three', coords: [52.52, -6.52], content: [] },
  ];
  return {
    tour: { id: 't', title: 'Test Tour' },
    stops,
  };
}

interface MockDeps {
  deps: JourneyHandlerDeps;
  // Convenience refs
  tourFooter: any;
  mapView: any;
  navController: any;
  sheet: any;
  mapPanel: any;
  menuBar: any;
  cardHost: any;
  guidanceBanner: any;
  arrivingBanner: any;
  transitBar: any;
  overviewControls: any;
  stopListOverlay: any;
  journeyCardRenderer: any;
  session: any;
  container: HTMLElement;
  mapPane: HTMLElement;
  sheetContentEl: HTMLElement;
  setStopListOpen: ReturnType<typeof vi.fn>;
  setViewingSystemCard: ReturnType<typeof vi.fn>;
  renderWelcome: ReturnType<typeof vi.fn>;
  renderGoodbye: ReturnType<typeof vi.fn>;
  onStopActivated: ReturnType<typeof vi.fn>;
  onOverviewEnter: ReturnType<typeof vi.fn>;
  transitionToStop: ReturnType<typeof vi.fn>;
  setMapFabVisible: ReturnType<typeof vi.fn>;
  imHereHandler: () => void;
}

function makeMockDeps(tour: Tour, isMobile = true): MockDeps {
  let imHereHandler = () => {};
  const container = document.createElement('div');
  const mapPane = document.createElement('div');
  const sheetContentEl = document.createElement('div');
  const footerEl = document.createElement('div');
  const tourFooterParent = document.createElement('div');
  tourFooterParent.appendChild(footerEl);
  const mapPaneParent = document.createElement('div');
  mapPaneParent.appendChild(mapPane);

  const tourFooter = {
    onImHere: vi.fn((cb: () => void) => { imHereHandler = cb; }),
    show: vi.fn(),
    hide: vi.fn(),
    enterWaypointMode: vi.fn(),
    exitWaypointMode: vi.fn(),
    updateWaypointProgress: vi.fn(),
    getElement: () => footerEl,
  };
  const mapView = {
    setOverviewMode: vi.fn(),
    setMapPadding: vi.fn(),
    setTopPadding: vi.fn(),
    fitBounds: vi.fn(),
    setSelectedPin: vi.fn(),
    setEndPin: vi.fn(),
    setPinNumberMap: vi.fn(),
    setActiveStop: vi.fn(),
    setChevronDirection: vi.fn(),
    setPulsingPin: vi.fn(),
    setWaypoints: vi.fn(),
    clearWaypoints: vi.fn(),
    zoomToSegment: vi.fn(),
    triggerSequencePulse: vi.fn(),
    invalidateSize: vi.fn(),
    getMap: vi.fn(() => ({
      getZoom: () => 14,
      setZoom: vi.fn(),
      getCenter: () => ({ lat: 52.5, lng: -6.5 }),
      setView: vi.fn(),
    })),
  };
  const navController = { goTo: vi.fn() };
  const sheet = { setPosition: vi.fn() };
  const mapPanel = {
    show: vi.fn(),
    hide: vi.fn(),
    setHeaderVisible: vi.fn(),
    isOpen: vi.fn(() => false),
  };
  const menuBar = { getElement: () => document.createElement('div') };
  const cardHostContainer = document.createElement('div');
  const cardHost = {
    // Invoke the render callback so journeyCardRenderer.renderWaypoint actually fires
    render: vi.fn((cb: (container: HTMLElement) => void) => cb(cardHostContainer)),
    getContainer: vi.fn(() => cardHostContainer),
  };
  const guidanceBannerEl = document.createElement('div');
  // Stub a non-zero offsetHeight so applyBannerTopPadding has something to read.
  Object.defineProperty(guidanceBannerEl, 'offsetHeight', { value: 48, configurable: true });
  const guidanceBanner = {
    setWaypoint: vi.fn(),
    hide: vi.fn(),
    getElement: vi.fn(() => guidanceBannerEl),
  };
  const arrivingBanner = { show: vi.fn(), hide: vi.fn() };
  const transitBar = { show: vi.fn(), hide: vi.fn() };
  const overviewControls = {
    show: vi.fn(),
    hide: vi.fn(),
    update: vi.fn(),
    getElement: () => document.createElement('div'),
  };
  const stopListOverlay = { update: vi.fn() };
  const journeyCardRenderer = { renderWaypoint: vi.fn() };
  const session = {
    reset: vi.fn(),
    reversed: false,
    endIndex: tour.stops.length - 1,
    tourOrder: tour.stops.map((_, i) => i),
    getVisited: vi.fn(() => new Set<number>()),
  };

  const setStopListOpen = vi.fn();
  const setViewingSystemCard = vi.fn();
  const renderWelcome = vi.fn();
  const renderGoodbye = vi.fn();
  const onStopActivated = vi.fn();
  const onOverviewEnter = vi.fn();
  const transitionToStop = vi.fn();
  const setMapFabVisible = vi.fn();

  const deps = {
    tour,
    session: session as any,
    mapView: mapView as any,
    navController: navController as any,
    sheet: sheet as any,
    mapPanel: mapPanel as any,
    menuBar: menuBar as any,
    tourFooter: tourFooter as any,
    overviewControls: overviewControls as any,
    stopListOverlay: stopListOverlay as any,
    transitBar: transitBar as any,
    cardHost: cardHost as any,
    journeyCardRenderer: journeyCardRenderer as any,
    guidanceBanner: guidanceBanner as any,
    arrivingBanner: arrivingBanner as any,
    container,
    mapPane,
    sheetContentEl,
    isMobile,
    setStopListOpen,
    setViewingSystemCard,
    renderWelcome,
    renderGoodbye,
    onStopActivated,
    onOverviewEnter,
    transitionToStop,
    setMapFabVisible,
  } as JourneyHandlerDeps;

  return {
    deps, tourFooter, mapView, navController, sheet, mapPanel, menuBar,
    cardHost, guidanceBanner, arrivingBanner, transitBar, overviewControls,
    stopListOverlay, journeyCardRenderer, session, container, mapPane,
    sheetContentEl, setStopListOpen, setViewingSystemCard, renderWelcome,
    renderGoodbye, onStopActivated, onOverviewEnter, transitionToStop,
    setMapFabVisible,
    get imHereHandler() { return imHereHandler; },
  };
}

describe('createJourneyHandler — tour_start', () => {
  it('resets session, enters overview mode, hides footer, renders welcome', () => {
    const m = makeMockDeps(makeTour());
    const handler = createJourneyHandler(m.deps);

    handler('tour_start', 0);

    expect(m.session.reset).toHaveBeenCalledTimes(1);
    expect(m.mapView.setOverviewMode).toHaveBeenCalledWith(true);
    expect(m.tourFooter.hide).toHaveBeenCalled();
    expect(m.renderWelcome).toHaveBeenCalledTimes(1);
    expect(m.setMapFabVisible).toHaveBeenCalledWith(false);
    expect(m.overviewControls.show).toHaveBeenCalled();
    expect(m.onOverviewEnter).toHaveBeenCalled();
    expect(m.mapView.fitBounds).toHaveBeenCalled();
  });

  it('triggers desktop sequence pulse only when not mobile', () => {
    const desktopDeps = makeMockDeps(makeTour(), false);
    const desktopHandler = createJourneyHandler(desktopDeps.deps);
    desktopHandler('tour_start', 0);
    expect(desktopDeps.mapView.triggerSequencePulse).toHaveBeenCalled();

    const mobileDeps = makeMockDeps(makeTour(), true);
    const mobileHandler = createJourneyHandler(mobileDeps.deps);
    mobileHandler('tour_start', 0);
    expect(mobileDeps.mapView.triggerSequencePulse).not.toHaveBeenCalled();
  });
});

describe('createJourneyHandler — at_stop', () => {
  it('hides overview, shows footer, delegates to navController.goTo', () => {
    const m = makeMockDeps(makeTour());
    const handler = createJourneyHandler(m.deps);

    handler('at_stop', 1);

    expect(m.mapView.setOverviewMode).toHaveBeenCalledWith(false);
    expect(m.overviewControls.hide).toHaveBeenCalled();
    expect(m.tourFooter.show).toHaveBeenCalled();
    expect(m.setStopListOpen).toHaveBeenCalledWith(false);
    expect(m.navController.goTo).toHaveBeenCalledWith(1);
    expect(m.onStopActivated).toHaveBeenCalledWith(1);
    expect(m.setMapFabVisible).toHaveBeenCalledWith(true);
  });
});

describe('createJourneyHandler — in_transit (no waypoints)', () => {
  it('shows transit bar, sets pulsing pin on destination, hides footer', () => {
    const m = makeMockDeps(makeTour()); // stop[2] has no waypoints
    const handler = createJourneyHandler(m.deps);

    handler('in_transit', 0); // travelling from stop 0 to stop 1

    expect(m.transitBar.show).toHaveBeenCalled();
    // stops[1].id is 2, which is the destination from stop[0]
    expect(m.mapView.setPulsingPin).toHaveBeenCalledWith(2);
    expect(m.tourFooter.hide).toHaveBeenCalled();
    expect(m.setMapFabVisible).toHaveBeenCalledWith(false);
  });

  it('respects reversed direction when computing the destination', () => {
    const m = makeMockDeps(makeTour());
    m.session.reversed = true;
    const handler = createJourneyHandler(m.deps);

    handler('in_transit', 1); // reversed: from stop[1] back to stop[0]

    // stops[0].id is 1, the destination in reverse direction
    expect(m.mapView.setPulsingPin).toHaveBeenCalledWith(1);
  });
});

describe('createJourneyHandler — in_transit (with waypoints)', () => {
  function tourWithWaypoints(waypoints: Waypoint[]): Tour {
    return makeTour({ waypoints });
  }

  it('enters waypoint mode, sets waypoints on map, shows guidance banner', () => {
    const wps: Waypoint[] = [
      { coords: [52.505, -6.505], text: 'First waypoint' },
      { coords: [52.508, -6.508], text: 'Second waypoint' },
    ];
    const m = makeMockDeps(tourWithWaypoints(wps));
    const handler = createJourneyHandler(m.deps);

    handler('in_transit', 0); // dest is stop[1] which now has waypoints

    expect(m.mapView.setWaypoints).toHaveBeenCalledWith(wps, 0);
    expect(m.mapView.zoomToSegment).toHaveBeenCalled();
    expect(m.tourFooter.enterWaypointMode).toHaveBeenCalled();
    // First waypoint is plain guidance — banner is shown
    expect(m.guidanceBanner.setWaypoint).toHaveBeenCalledWith(wps[0]);
  });

  it('skips guidance and advances when first waypoint is a journey card', () => {
    const wps: Waypoint[] = [
      { coords: [52.505, -6.505], text: 'First', journey_card: true },
      { coords: [52.508, -6.508], text: 'Second' },
    ];
    const m = makeMockDeps(tourWithWaypoints(wps));
    const handler = createJourneyHandler(m.deps);

    handler('in_transit', 0);

    // advance() fires the onJourneyCard callback which renders the card
    expect(m.cardHost.render).toHaveBeenCalled();
    expect(m.journeyCardRenderer.renderWaypoint).toHaveBeenCalled();
    // Banner is not used for a journey-card waypoint
    expect(m.guidanceBanner.setWaypoint).not.toHaveBeenCalled();
  });

  it('treats waypoints with content[] as journey cards', () => {
    const wps: Waypoint[] = [
      { coords: [52.505, -6.505], text: 'First', content: [{ type: 'text', body: 'hello' }] },
    ];
    const m = makeMockDeps(tourWithWaypoints(wps));
    const handler = createJourneyHandler(m.deps);

    handler('in_transit', 0);

    expect(m.cardHost.render).toHaveBeenCalled();
    expect(m.journeyCardRenderer.renderWaypoint).toHaveBeenCalled();
  });
});

describe('createJourneyHandler — tour_complete', () => {
  it('hides UI, renders goodbye', () => {
    const m = makeMockDeps(makeTour());
    const handler = createJourneyHandler(m.deps);

    handler('tour_complete', 2);

    expect(m.tourFooter.hide).toHaveBeenCalled();
    expect(m.mapPanel.hide).toHaveBeenCalled();
    expect(m.overviewControls.hide).toHaveBeenCalled();
    expect(m.renderGoodbye).toHaveBeenCalledTimes(1);
    expect(m.setMapFabVisible).toHaveBeenCalledWith(false);
  });
});

describe('createJourneyHandler — onImHere callback', () => {
  it('advances waypoint tracker when transit is active', () => {
    const wps: Waypoint[] = [
      { coords: [52.505, -6.505], text: 'A' },
      { coords: [52.508, -6.508], text: 'B' },
    ];
    const m = makeMockDeps(makeTour({ waypoints: wps }));
    const handler = createJourneyHandler(m.deps);
    handler('in_transit', 0);

    // Reset call counts that fired during initial wp[0] setup
    m.mapView.setWaypoints.mockClear();

    m.imHereHandler();
    // Advancing past wp[0] should trigger setWaypoints with new active index
    expect(m.mapView.setWaypoints).toHaveBeenCalled();
  });

  it('does nothing when no waypoint tracker is active', () => {
    const m = makeMockDeps(makeTour());
    const handler = createJourneyHandler(m.deps);
    handler('at_stop', 1); // no waypoint tracker created

    expect(() => m.imHereHandler()).not.toThrow();
  });

  it('completes waypoint transit and transitions to destination on final advance', () => {
    const wps: Waypoint[] = [
      { coords: [52.505, -6.505], text: 'Only waypoint' },
    ];
    const m = makeMockDeps(makeTour({ waypoints: wps }));
    const handler = createJourneyHandler(m.deps);
    handler('in_transit', 0);

    // Single waypoint: one advance should hit onComplete
    m.imHereHandler();

    expect(m.transitionToStop).toHaveBeenCalledWith(1);
  });
});
