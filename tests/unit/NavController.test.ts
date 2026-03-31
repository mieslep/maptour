import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Tour } from '../../src/types';

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

function createNavController(tour: Tour, callbacks = {}) {
  const navEl = document.createElement('div');
  const stopListEl = document.createElement('div');
  // Provide minimal DOM for querySelector inside NavController
  document.body.appendChild(navEl);
  document.body.appendChild(stopListEl);

  const mapView = new MapView(document.createElement('div'), tour);
  const stopCard = new StopCard(document.createElement('div'));
  const breadcrumb = new Breadcrumb(tour.tour.id);

  return new NavController(tour, mapView, stopCard, breadcrumb, navEl, stopListEl, callbacks);
}

describe('NavController', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('starts at index 0', () => {
    const tour = createTour(3);
    const nav = createNavController(tour);
    expect(nav.getCurrentIndex()).toBe(0);
    expect(nav.getCurrentStop().id).toBe(1);
  });

  it('advances to next stop', () => {
    const tour = createTour(3);
    const nav = createNavController(tour);
    nav.next();
    expect(nav.getCurrentIndex()).toBe(1);
    expect(nav.getCurrentStop().id).toBe(2);
  });

  it('goes back with prev', () => {
    const tour = createTour(3);
    const nav = createNavController(tour);
    nav.next();
    nav.prev();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('does not go before first stop', () => {
    const tour = createTour(3);
    const nav = createNavController(tour);
    nav.prev();
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('does not go past last stop', () => {
    const tour = createTour(3);
    const nav = createNavController(tour);
    nav.next();
    nav.next();
    nav.next(); // should clamp
    expect(nav.getCurrentIndex()).toBe(2);
  });

  it('jumps directly to any stop', () => {
    const tour = createTour(5);
    const nav = createNavController(tour);
    nav.goTo(4);
    expect(nav.getCurrentIndex()).toBe(4);
    expect(nav.getCurrentStop().id).toBe(5);
  });

  it('ignores out-of-range goTo', () => {
    const tour = createTour(3);
    const nav = createNavController(tour);
    nav.goTo(-1);
    expect(nav.getCurrentIndex()).toBe(0);
    nav.goTo(100);
    expect(nav.getCurrentIndex()).toBe(0);
  });

  it('calls onStopChange callback on navigation', () => {
    const tour = createTour(3);
    const onStopChange = vi.fn();
    const nav = createNavController(tour, { onStopChange });
    nav.next();
    expect(onStopChange).toHaveBeenCalledWith(tour.stops[1], 1);
  });

  it('works with a single stop tour', () => {
    const tour = createTour(1);
    const nav = createNavController(tour);
    nav.next();
    nav.prev();
    expect(nav.getCurrentIndex()).toBe(0);
  });
});
