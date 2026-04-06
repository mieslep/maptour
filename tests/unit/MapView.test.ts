import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Tour, Stop, Waypoint } from '../../src/types';

vi.mock('leaflet', () => import('../mocks/leaflet'));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

// Must import after mock is registered
const L = (await import('../mocks/leaflet')).default;

function makeTour(stopCount = 3): Tour {
  const stops: Stop[] = Array.from({ length: stopCount }, (_, i) => ({
    id: i + 1,
    title: `Stop ${i + 1}`,
    coords: [52 + i * 0.01, -8 + i * 0.01] as [number, number],
    content: [],
    getting_here: { mode: 'walk' as const },
  }));
  return {
    tour: { id: 'test', title: 'Test Tour' },
    stops,
  };
}

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('MapView', () => {
  let container: HTMLElement;
  let tour: Tour;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    container = makeContainer();
    tour = makeTour();
  });

  async function createMapView(t = tour) {
    const { MapView } = await import('../../src/map/MapView');
    return new MapView(container, t);
  }

  it('constructor initialises the Leaflet map', async () => {
    await createMapView();

    expect(L.map).toHaveBeenCalledWith(container, expect.objectContaining({
      zoomControl: false,
    }));
  });

  it('constructor adds a tile layer', async () => {
    await createMapView();

    expect(L.tileLayer).toHaveBeenCalled();
    // tileLayer().addTo should have been called
    const tl = L.tileLayer.mock.results[0].value;
    expect(tl.addTo).toHaveBeenCalled();
  });

  it('constructor creates markers for each stop', async () => {
    await createMapView();

    // One marker per stop
    expect(L.marker).toHaveBeenCalledTimes(tour.stops.length);
  });

  it('constructor renders polylines between stops', async () => {
    await createMapView();

    // n-1 polylines for n stops
    expect(L.polyline).toHaveBeenCalledTimes(tour.stops.length - 1);
  });

  it('constructor calls fitBounds', async () => {
    await createMapView();

    expect(L.latLngBounds).toHaveBeenCalled();
    const mockMap = L.map.mock.results[0].value;
    expect(mockMap.fitBounds).toHaveBeenCalled();
  });

  it('constructor sets ARIA attributes on container', async () => {
    await createMapView();

    expect(container.getAttribute('role')).toBe('application');
    expect(container.getAttribute('aria-label')).toBe('Map for Test Tour');
  });

  it('setActiveStop updates activeStopId and pans to stop', async () => {
    const mv = await createMapView();
    const stop = tour.stops[1];
    const mockMap = L.map.mock.results[0].value;

    mv.setActiveStop(stop);

    expect(mockMap.panTo).toHaveBeenCalledWith(stop.coords, expect.any(Object));
  });

  it('setActiveStop with paddingBottom offsets the pan target', async () => {
    const mv = await createMapView();
    const mockMap = L.map.mock.results[0].value;

    mv.setMapPadding(200);
    mv.setActiveStop(tour.stops[1]);

    // Should call project/unproject for the offset calculation
    expect(mockMap.project).toHaveBeenCalled();
    expect(mockMap.unproject).toHaveBeenCalled();
    expect(mockMap.panTo).toHaveBeenCalled();
  });

  it('setWaypoints creates circleMarkers in a layerGroup', async () => {
    const mv = await createMapView();
    const waypoints: Waypoint[] = [
      { coords: [52, -8], text: 'wp1' },
      { coords: [52.01, -8.01], text: 'wp2' },
      { coords: [52.02, -8.02], text: 'wp3' },
    ];

    mv.setWaypoints(waypoints, 1);

    expect(L.layerGroup).toHaveBeenCalled();
    expect(L.circleMarker).toHaveBeenCalledTimes(3);
  });

  it('clearWaypoints removes the waypoint layer', async () => {
    const mv = await createMapView();
    const waypoints: Waypoint[] = [
      { coords: [52, -8], text: 'wp1' },
    ];

    mv.setWaypoints(waypoints, 0);
    const lg = L.layerGroup.mock.results[0].value;

    mv.clearWaypoints();

    expect(lg.remove).toHaveBeenCalled();
  });

  it('hasWaypoints returns false initially', async () => {
    const mv = await createMapView();
    expect(mv.hasWaypoints()).toBe(false);
  });

  it('hasWaypoints returns true after setWaypoints', async () => {
    const mv = await createMapView();
    mv.setWaypoints([{ coords: [52, -8], text: 'wp' }], 0);
    expect(mv.hasWaypoints()).toBe(true);
  });

  it('hasWaypoints returns false after clearWaypoints', async () => {
    const mv = await createMapView();
    mv.setWaypoints([{ coords: [52, -8], text: 'wp' }], 0);
    mv.clearWaypoints();
    expect(mv.hasWaypoints()).toBe(false);
  });

  it('zoomToSegment calls flyToBounds (no reduced motion)', async () => {
    // Ensure matchMedia returns false for reduced motion
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false, media: '', onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    });

    const mv = await createMapView();
    const mockMap = L.map.mock.results[0].value;

    mv.zoomToSegment([52, -8], [52.01, -8.01]);

    expect(L.latLngBounds).toHaveBeenCalled();
    expect(mockMap.flyToBounds).toHaveBeenCalled();
  });

  it('zoomToSegment calls fitBounds with animate:false when prefers-reduced-motion', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, media: '', onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    });

    const mv = await createMapView();
    const mockMap = L.map.mock.results[0].value;

    mv.zoomToSegment([52, -8], [52.01, -8.01]);

    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ animate: false }),
    );
  });

  it('setOverviewMode(true) sets overview mode', async () => {
    const mv = await createMapView();
    // Should not throw
    mv.setOverviewMode(true);
  });

  it('setOverviewMode(false) clears overview state and re-renders pins', async () => {
    const mv = await createMapView();
    mv.setOverviewMode(true);

    // Clear mock counts so we can detect the re-render from setOverviewMode(false)
    L.marker.mockClear();
    mv.setOverviewMode(false);

    // Pins should be re-rendered (marker called for each stop)
    expect(L.marker).toHaveBeenCalledTimes(tour.stops.length);
  });

  it('addLocateButton returns a button element', async () => {
    const mv = await createMapView();
    const onClick = vi.fn();

    const btn = mv.addLocateButton(onClick);

    expect(btn).toBeInstanceOf(HTMLElement);
  });

  it('setMapPadding stores bottom padding', async () => {
    const mv = await createMapView();
    mv.setMapPadding(300);

    // Verify it takes effect via fitBounds
    const mockMap = L.map.mock.results[0].value;
    mockMap.fitBounds.mockClear();
    mv.fitBounds();

    expect(mockMap.fitBounds).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        paddingBottomRight: [40, 340], // 40 + 300
      }),
    );
  });

  it('invalidateSize delegates to the Leaflet map', async () => {
    const mv = await createMapView();
    const mockMap = L.map.mock.results[0].value;
    mockMap.invalidateSize.mockClear();

    mv.invalidateSize();

    expect(mockMap.invalidateSize).toHaveBeenCalledTimes(1);
  });

  it('destroy removes the map and clears waypoints', async () => {
    const mv = await createMapView();
    const mockMap = L.map.mock.results[0].value;

    mv.destroy();

    expect(mockMap.remove).toHaveBeenCalled();
  });

  it('onPinClick registers callback and fires on marker click', async () => {
    const mv = await createMapView();
    const cb = vi.fn();
    mv.onPinClick(cb);

    // Simulate a marker click — get the click handler registered on the first marker
    const firstMarkerCall = L.marker.mock.results[0].value;
    const onCall = firstMarkerCall.on.mock.calls.find(
      (c: unknown[]) => c[0] === 'click',
    );
    expect(onCall).toBeDefined();

    // Fire the click handler
    onCall![1]();
    expect(cb).toHaveBeenCalledWith(0);
  });

  it('flyToStop flies to the stop coords', async () => {
    const mv = await createMapView();
    const mockMap = L.map.mock.results[0].value;

    mv.flyToStop(tour.stops[1], 16);

    expect(mockMap.flyTo).toHaveBeenCalledWith(
      tour.stops[1].coords,
      16,
      expect.any(Object),
    );
  });

  it('handles empty stops list gracefully', async () => {
    const emptyTour = makeTour(0);
    const mv = await createMapView(emptyTour);

    // fitBounds should be a no-op for empty stops
    expect(() => mv.fitBounds()).not.toThrow();
  });
});
