import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Tour, Stop } from '../../src/types';
import { NavController } from '../../src/navigation/NavController';
import { TourSession } from '../../src/session/TourSession';

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

function setup(tour: Tour, callbacks = {}) {
  const session = new TourSession(tour.tour.id, tour.stops.length);
  const nav = new NavController(tour, session, callbacks);
  return { nav, session };
}

describe('NavController', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // === Basic navigation ===

  it('starts at index 0', () => {
    const { nav } = setup(createTour(3));
    expect(nav.getCurrentIndex()).toBe(0);
    expect(nav.getCurrentStop().id).toBe(1);
  });

  it('advances to next stop and emits onNavigate', () => {
    const onNavigate = vi.fn();
    const tour = createTour(3);
    const { nav } = setup(tour, { onNavigate });
    nav.next();
    expect(nav.getCurrentIndex()).toBe(1);
    expect(onNavigate).toHaveBeenCalledWith(tour.stops[1], 1);
  });

  it('goes back with prev', () => {
    const { nav } = setup(createTour(3));
    nav.next();
    nav.prev();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('does not go before first stop', () => {
    const { nav } = setup(createTour(3));
    nav.prev();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('calls onTourEnd on last stop', () => {
    const onTourEnd = vi.fn();
    const { nav } = setup(createTour(3), { onTourEnd });
    nav.next(); // 0 → 1
    nav.next(); // 1 → 2 (last)
    nav.next(); // triggers onTourEnd
    expect(onTourEnd).toHaveBeenCalledOnce();
    expect(nav.getCurrentIndex()).toBe(2); // stays at last
  });

  it('jumps directly to any stop', () => {
    const { nav } = setup(createTour(5));
    nav.goTo(4);
    expect(nav.getCurrentIndex()).toBe(4);
    expect(nav.getCurrentStop().id).toBe(5);
  });

  it('ignores out-of-range goTo', () => {
    const { nav } = setup(createTour(3));
    nav.goTo(-1);
    expect(nav.getCurrentIndex()).toBe(0);
    nav.goTo(100);
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('works with a single stop tour', () => {
    const { nav } = setup(createTour(1));
    nav.next();
    nav.prev();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  // === Custom start index (circular tour) ===

  it('treats startIndex stop as last when reached circularly', () => {
    const onTourEnd = vi.fn();
    const tour = createTour(4); // stops 0,1,2,3
    const { nav, session } = setup(tour, { onTourEnd });
    session.setStartIndex(1);
    nav.goTo(1);
    nav.next(); // 1 → 2
    nav.next(); // 2 → 3
    nav.next(); // 3 → 0 (wraps)
    expect(nav.getCurrentIndex()).toBe(0);
    nav.next(); // 0 is the stop before startIndex=1, so this is last
    expect(onTourEnd).toHaveBeenCalledOnce();
  });

  it('prev does not go before custom startIndex', () => {
    const { nav, session } = setup(createTour(4));
    session.setStartIndex(2);
    nav.goTo(2);
    nav.prev(); // already at start
    expect(nav.getCurrentIndex()).toBe(2);
  });

  // === Reversed mode ===

  it('navigates backwards in reversed mode', () => {
    const tour = createTour(4);
    const { nav, session } = setup(tour);
    session.setStartIndex(0);
    session.setReversed(true);
    nav.goTo(0);
    nav.next(); // reversed: 0 → 3
    expect(nav.getCurrentIndex()).toBe(3);
    nav.next(); // 3 → 2
    expect(nav.getCurrentIndex()).toBe(2);
  });

  it('prev in reversed mode goes toward higher indices', () => {
    const tour = createTour(4);
    const { nav, session } = setup(tour);
    session.setStartIndex(0);
    session.setReversed(true);
    nav.goTo(0);
    nav.next(); // 0 → 3
    nav.next(); // 3 → 2
    nav.prev(); // back toward start: 2 → 3
    expect(nav.getCurrentIndex()).toBe(3);
  });

  it('calls onTourEnd in reversed mode at correct stop', () => {
    const onTourEnd = vi.fn();
    const tour = createTour(4); // stops 0,1,2,3
    const { nav, session } = setup(tour, { onTourEnd });
    session.setStartIndex(0);
    session.setReversed(true);
    nav.goTo(0);
    nav.next(); // 0 → 3
    nav.next(); // 3 → 2
    nav.next(); // 2 → 1 (stop before startIndex=0 in reverse)
    expect(nav.getCurrentIndex()).toBe(1);
    nav.next(); // 1 is last in reverse (next would be 0 = startIndex)
    expect(onTourEnd).toHaveBeenCalledOnce();
  });

  // === Return to start ===

  it('returnToStart navigates to start index', () => {
    const tour = createTour(4);
    const { nav, session } = setup(tour);
    session.setStartIndex(0);
    nav.goTo(3);
    nav.returnToStart();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('returnToStart marks current stop as visited before navigating', () => {
    const tour = createTour(4);
    const { nav, session } = setup(tour);
    session.setStartIndex(0);
    nav.goTo(3);
    expect(session.getVisited().has(tour.stops[3].id)).toBe(false);
    nav.returnToStart();
    expect(session.getVisited().has(tour.stops[3].id)).toBe(true);
  });

  it('returnToStart makes start stop the last stop', () => {
    const onTourEnd = vi.fn();
    const tour = createTour(4);
    const { nav, session } = setup(tour, { onTourEnd });
    session.setStartIndex(0);
    nav.goTo(3);
    nav.returnToStart(); // now at stop 0 with returningToStart=true
    nav.next(); // stop 0 should be treated as last stop
    expect(onTourEnd).toHaveBeenCalledOnce();
  });

  it('returnToStart goes directly to start', () => {
    const tour = createTour(4);
    const onNavigate = vi.fn();
    const { nav } = setup(tour, { onNavigate });
    nav.goTo(3);
    onNavigate.mockClear();
    nav.returnToStart();
    expect(nav.getCurrentIndex()).toBe(0);
    expect(onNavigate).toHaveBeenCalledWith(tour.stops[0], 0);
  });

  it('resetReturnState clears returningToStart flag', () => {
    const onTourEnd = vi.fn();
    const tour = createTour(4);
    const { nav } = setup(tour, { onTourEnd });
    nav.goTo(3);
    nav.returnToStart(); // sets returningToStart
    nav.resetReturnState(); // clears it
    nav.goTo(0);
    nav.next(); // should NOT trigger onTourEnd (stop 0 is no longer "last")
    expect(nav.getCurrentIndex()).toBe(1);
    expect(onTourEnd).not.toHaveBeenCalled();
  });

  // === Visited state via TourSession ===

  it('marks stops as visited in session when navigating forward', () => {
    const tour = createTour(3);
    const { nav, session } = setup(tour);
    nav.next(); // leaving stop 0, marks it visited
    expect(session.getVisited().has(1)).toBe(true); // stop id=1
    nav.next();
    expect(session.getVisited().has(2)).toBe(true);
  });

  // === getNextStop ===

  it('getNextStop returns next stop in sequence', () => {
    const tour = createTour(4);
    const { nav } = setup(tour);
    expect(nav.getNextStop(0)?.id).toBe(2); // stop at index 1
    expect(nav.getNextStop(2)?.id).toBe(4); // stop at index 3
  });

  it('getNextStop returns undefined for last tour stop', () => {
    const tour = createTour(4);
    const { nav, session } = setup(tour);
    session.setStartIndex(0);
    // Forward: last stop before wrapping to 0 is stop 3
    expect(nav.getNextStop(3)).toBeUndefined();
  });

  it('getNextStop works in reversed mode', () => {
    const tour = createTour(4);
    const { nav, session } = setup(tour);
    session.setStartIndex(0);
    session.setReversed(true);
    // Reversed from 0: next is 3
    expect(nav.getNextStop(0)?.id).toBe(4); // stop at index 3
  });
});
