import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Tour, Stop } from '../../src/types';

// Mock out the dependencies that use DOM/Leaflet
vi.mock('../../src/map/MapView', () => ({
  MapView: vi.fn().mockImplementation(() => ({
    setActiveStop: vi.fn(),
    setVisitedStops: vi.fn(),
    updateGpsPosition: vi.fn(),
    clearGpsPosition: vi.fn(),
    destroy: vi.fn(),
  })),
}));

vi.mock('../../src/card/StopCard', () => ({
  StopCard: vi.fn().mockImplementation(() => ({
    render: vi.fn(),
    update: vi.fn(),
    setSuppressGettingHereNote: vi.fn(),
    onReturnToStart: vi.fn(),
    renderJourney: vi.fn(),
  })),
}));

import { NavController } from '../../src/navigation/NavController';
import { MapView } from '../../src/map/MapView';
import { StopCard } from '../../src/card/StopCard';
import { Breadcrumb } from '../../src/breadcrumb/Breadcrumb';

function createTour(stopCount = 3): Tour {
  return {
    tour: { id: 'test', title: 'Test Tour' },
    stops: Array.from({ length: stopCount }, (_, i) => ({
      id: i + 1,
      title: `Stop ${i + 1}`,
      coords: [52.5 + i * 0.01, -6.56] as [number, number],
      content: [],
    })),
  };
}

function createTourWithJourney(stopCount = 3, journeyOnStop = 1): Tour {
  const tour = createTour(stopCount);
  tour.stops[journeyOnStop].getting_here = {
    mode: 'walk',
    note: 'Walk along the path',
    journey: [{ type: 'text', body: 'Follow the river' }],
  };
  return tour;
}

function createNavController(tour: Tour, callbacks = {}) {
  const navEl = document.createElement('div');
  const stopListEl = document.createElement('div');
  document.body.appendChild(navEl);
  document.body.appendChild(stopListEl);

  const mapView = new MapView(document.createElement('div'), tour);
  const stopCard = new StopCard(document.createElement('div'));
  const breadcrumb = new Breadcrumb(tour.tour.id);

  return { nav: new NavController(tour, mapView, stopCard, breadcrumb, navEl, stopListEl, callbacks), stopCard, breadcrumb };
}

describe('NavController', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    vi.clearAllMocks();
  });

  // === Basic navigation ===

  it('starts at index 0', () => {
    const { nav } = createNavController(createTour(3));
    expect(nav.getCurrentIndex()).toBe(0);
    expect(nav.getCurrentStop().id).toBe(1);
  });

  it('advances to next stop', () => {
    const { nav } = createNavController(createTour(3));
    nav.next();
    expect(nav.getCurrentIndex()).toBe(1);
  });

  it('goes back with prev', () => {
    const { nav } = createNavController(createTour(3));
    nav.next();
    nav.prev();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('does not go before first stop', () => {
    const { nav } = createNavController(createTour(3));
    nav.prev();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('calls onNextFromLast on last stop', () => {
    const onNextFromLast = vi.fn();
    const { nav } = createNavController(createTour(3), { onNextFromLast });
    nav.next(); // 0 → 1
    nav.next(); // 1 → 2 (last)
    nav.next(); // triggers onNextFromLast
    expect(onNextFromLast).toHaveBeenCalledOnce();
    expect(nav.getCurrentIndex()).toBe(2); // stays at last
  });

  it('jumps directly to any stop', () => {
    const { nav } = createNavController(createTour(5));
    nav.goTo(4);
    expect(nav.getCurrentIndex()).toBe(4);
    expect(nav.getCurrentStop().id).toBe(5);
  });

  it('ignores out-of-range goTo', () => {
    const { nav } = createNavController(createTour(3));
    nav.goTo(-1);
    expect(nav.getCurrentIndex()).toBe(0);
    nav.goTo(100);
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('calls onStopChange callback on navigation', () => {
    const tour = createTour(3);
    const onStopChange = vi.fn();
    const { nav } = createNavController(tour, { onStopChange });
    nav.next();
    expect(onStopChange).toHaveBeenCalledWith(tour.stops[1], 1);
  });

  it('works with a single stop tour', () => {
    const { nav } = createNavController(createTour(1));
    nav.next();
    nav.prev();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  // === Custom start index (circular tour) ===

  it('treats startIndex stop as last when reached circularly', () => {
    const onNextFromLast = vi.fn();
    const tour = createTour(4); // stops 0,1,2,3
    const { nav } = createNavController(tour, { onNextFromLast });
    nav.setStartIndex(1); // start at stop 1
    nav.goTo(1);
    nav.next(); // 1 → 2
    nav.next(); // 2 → 3
    nav.next(); // 3 → 0 (wraps)
    expect(nav.getCurrentIndex()).toBe(0);
    nav.next(); // 0 is the stop before startIndex=1, so this is last
    expect(onNextFromLast).toHaveBeenCalledOnce();
  });

  it('prev does not go before custom startIndex', () => {
    const { nav } = createNavController(createTour(4));
    nav.setStartIndex(2);
    nav.goTo(2);
    nav.prev(); // already at start
    expect(nav.getCurrentIndex()).toBe(2);
  });

  // === Reversed mode ===

  it('navigates backwards in reversed mode', () => {
    const tour = createTour(4);
    const { nav } = createNavController(tour);
    nav.setStartIndex(0);
    nav.setReversed(true);
    nav.goTo(0);
    nav.next(); // reversed: 0 → 3
    expect(nav.getCurrentIndex()).toBe(3);
    nav.next(); // 3 → 2
    expect(nav.getCurrentIndex()).toBe(2);
  });

  it('prev in reversed mode goes toward higher indices', () => {
    const tour = createTour(4);
    const { nav } = createNavController(tour);
    nav.setStartIndex(0);
    nav.setReversed(true);
    nav.goTo(0);
    nav.next(); // 0 → 3
    nav.next(); // 3 → 2
    nav.prev(); // back toward start: 2 → 3
    expect(nav.getCurrentIndex()).toBe(3);
  });

  it('calls onNextFromLast in reversed mode at correct stop', () => {
    const onNextFromLast = vi.fn();
    const tour = createTour(4); // stops 0,1,2,3
    const { nav } = createNavController(tour, { onNextFromLast });
    nav.setStartIndex(0);
    nav.setReversed(true);
    nav.goTo(0);
    nav.next(); // 0 → 3
    nav.next(); // 3 → 2
    nav.next(); // 2 → 1 (stop before startIndex=0 in reverse)
    expect(nav.getCurrentIndex()).toBe(1);
    nav.next(); // 1 is last in reverse (next would be 0 = startIndex)
    expect(onNextFromLast).toHaveBeenCalledOnce();
  });

  // === Journey cards ===

  it('shows journey card when next stop has journey content', () => {
    const tour = createTourWithJourney(3, 1); // journey on stop index 1
    const onJourneyChange = vi.fn();
    const { nav, stopCard } = createNavController(tour, { onJourneyChange });
    nav.next(); // 0 → journey card for stop 1
    expect(stopCard.renderJourney).toHaveBeenCalledOnce();
    expect(onJourneyChange).toHaveBeenCalledWith(true);
  });

  it('journey "arrived" callback advances to destination', () => {
    const tour = createTourWithJourney(3, 1);
    const { nav, stopCard } = createNavController(tour);

    nav.next(); // triggers renderJourney
    // Simulate "I've arrived" callback
    const arrivedCb = (stopCard.renderJourney as any).mock.calls[0][1];
    arrivedCb();
    expect(nav.getCurrentIndex()).toBe(1);
  });

  it('next during journey skips to destination', () => {
    const tour = createTourWithJourney(3, 1);
    const { nav } = createNavController(tour);

    nav.next(); // triggers journey
    nav.next(); // should skip to destination
    expect(nav.getCurrentIndex()).toBe(1);
  });

  it('prev during journey returns to origin', () => {
    const tour = createTourWithJourney(3, 1);
    const { nav } = createNavController(tour);

    nav.next(); // triggers journey (origin = stop 0)
    nav.prev(); // should go back to origin
    expect(nav.getCurrentIndex()).toBe(0);
  });

  // === Return to start ===

  it('returnToStart navigates to start index', () => {
    const tour = createTour(4);
    const { nav } = createNavController(tour);
    nav.setStartIndex(0);
    nav.goTo(3); // at last stop
    nav.returnToStart();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('returnToStart makes start stop the last stop', () => {
    const onNextFromLast = vi.fn();
    const tour = createTour(4);
    const { nav } = createNavController(tour, { onNextFromLast });
    nav.setStartIndex(0);
    nav.goTo(3);
    nav.returnToStart(); // now at stop 0 with returningToStart=true
    nav.next(); // stop 0 should be treated as last stop
    expect(onNextFromLast).toHaveBeenCalledOnce();
  });

  it('returnToStart disables the return-to-start callback on StopCard', () => {
    const tour = createTour(3);
    const { nav, stopCard } = createNavController(tour);
    nav.returnToStart();
    expect(stopCard.onReturnToStart).toHaveBeenCalledWith(null);
  });

  it('returnToStart shows journey card if start stop has journey content', () => {
    const tour = createTourWithJourney(4, 0); // journey on stop 0 (start)
    const onJourneyChange = vi.fn();
    const { nav, stopCard } = createNavController(tour, { onJourneyChange });
    nav.goTo(3);
    nav.returnToStart();
    expect(stopCard.renderJourney).toHaveBeenCalledOnce();
    expect(onJourneyChange).toHaveBeenCalledWith(true);
  });

  it('returnToStart goes directly if no journey content', () => {
    const tour = createTour(4); // no journey on any stop
    const { nav, stopCard } = createNavController(tour);
    nav.goTo(3);
    nav.returnToStart();
    expect(nav.getCurrentIndex()).toBe(0);
    expect(stopCard.renderJourney).not.toHaveBeenCalled();
  });

  it('setStartIndex resets returningToStart flag', () => {
    const onNextFromLast = vi.fn();
    const tour = createTour(4);
    const { nav } = createNavController(tour, { onNextFromLast });
    nav.goTo(3);
    nav.returnToStart(); // sets returningToStart
    nav.setStartIndex(0); // resets it
    nav.goTo(0);
    nav.next(); // should NOT trigger onNextFromLast (stop 0 is no longer "last")
    expect(nav.getCurrentIndex()).toBe(1);
    expect(onNextFromLast).not.toHaveBeenCalled();
  });

  // === Breadcrumb integration ===

  it('marks stops as visited when navigating forward', () => {
    const tour = createTour(3);
    const { nav, breadcrumb } = createNavController(tour);
    nav.next(); // leaving stop 0, marks it visited
    expect(breadcrumb.getVisited().has(1)).toBe(true); // stop id=1
    nav.next();
    expect(breadcrumb.getVisited().has(2)).toBe(true);
  });
});
