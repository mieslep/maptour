import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GpsTracker } from '../../src/gps/GpsTracker';
import type { GpsMode } from '../../src/gps/GpsTracker';

// Mock navigator.geolocation
let watchCallback: ((pos: GeolocationPosition) => void) | null = null;
let watchErrorCallback: ((err: GeolocationPositionError) => void) | null = null;
let watchOptions: PositionOptions | null = null;
let watchIdCounter = 1;

function mockGeolocation() {
  const geo = {
    watchPosition: vi.fn((success, error, options) => {
      watchCallback = success;
      watchErrorCallback = error;
      watchOptions = options ?? null;
      return watchIdCounter++;
    }),
    clearWatch: vi.fn(),
  };

  Object.defineProperty(navigator, 'geolocation', {
    value: geo,
    configurable: true,
    writable: true,
  });

  return geo;
}

function emitPosition(lat: number, lng: number, accuracy = 5) {
  if (!watchCallback) throw new Error('No watch callback registered');
  watchCallback({
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition);
}

describe('Battery Saver', () => {
  let geo: ReturnType<typeof mockGeolocation>;
  let tracker: GpsTracker;

  beforeEach(() => {
    geo = mockGeolocation();
    tracker = new GpsTracker();
    watchCallback = null;
    watchOptions = null;
  });

  afterEach(() => {
    tracker.stop();
  });

  it('starts in HIGH_ACCURACY mode by default', () => {
    tracker.enableBatterySaver();
    tracker.start();
    expect(tracker.getMode()).toBe('HIGH_ACCURACY');
    expect(watchOptions?.enableHighAccuracy).toBe(true);
    expect(watchOptions?.maximumAge).toBe(30000);
  });

  it('transitions to STATIONARY after timeout', () => {
    vi.useFakeTimers();
    tracker.enableBatterySaver({ stationary_timeout: 120, stationary_radius: 10 });
    tracker.start();

    // Emit positions at the same location over time
    emitPosition(52.5, -6.5);

    // Advance time past stationary timeout
    vi.advanceTimersByTime(121000);
    emitPosition(52.5, -6.5);

    expect(tracker.getMode()).toBe('STATIONARY');
    // Check that watch was restarted with low-power options
    expect(watchOptions?.enableHighAccuracy).toBe(false);
    expect(watchOptions?.maximumAge).toBe(60000);

    vi.useRealTimers();
  });

  it('transitions from STATIONARY back to HIGH_ACCURACY on movement', () => {
    vi.useFakeTimers();
    tracker.enableBatterySaver({ stationary_timeout: 120, stationary_radius: 10 });
    tracker.start();

    emitPosition(52.5, -6.5);
    vi.advanceTimersByTime(121000);
    emitPosition(52.5, -6.5);
    expect(tracker.getMode()).toBe('STATIONARY');

    // Move significantly (~1km)
    emitPosition(52.51, -6.5);
    expect(tracker.getMode()).toBe('HIGH_ACCURACY');
    expect(watchOptions?.enableHighAccuracy).toBe(true);

    vi.useRealTimers();
  });

  it('transitions to FAR_CRUISE when next stop is far', () => {
    tracker.enableBatterySaver({ far_stop_distance: 500 });
    tracker.start();

    emitPosition(52.5, -6.5);

    // Tell tracker next stop is 1000m away
    tracker.setNextStopDistance(1000);
    expect(tracker.getMode()).toBe('FAR_CRUISE');
    expect(watchOptions?.maximumAge).toBe(15000);
  });

  it('transitions from FAR_CRUISE to HIGH_ACCURACY when approaching', () => {
    tracker.enableBatterySaver({ far_stop_distance: 500, approach_distance: 200 });
    tracker.start();

    emitPosition(52.5, -6.5);
    tracker.setNextStopDistance(1000);
    expect(tracker.getMode()).toBe('FAR_CRUISE');

    // Approach within 200m
    tracker.setNextStopDistance(150);
    expect(tracker.getMode()).toBe('HIGH_ACCURACY');
  });

  it('does not activate battery saver when not enabled', () => {
    tracker.start();

    emitPosition(52.5, -6.5);
    tracker.setNextStopDistance(1000);

    expect(tracker.getMode()).toBe('HIGH_ACCURACY');
    // watchPosition should only have been called once (no restart)
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);
  });

  it('clamps approach_distance to far_stop_distance', () => {
    tracker.enableBatterySaver({ far_stop_distance: 300, approach_distance: 500 });
    tracker.start();

    emitPosition(52.5, -6.5);

    // 350m — beyond far_stop_distance, should enter FAR_CRUISE
    tracker.setNextStopDistance(350);
    expect(tracker.getMode()).toBe('FAR_CRUISE');

    // 290m — below clamped approach_distance (300), should return to HIGH_ACCURACY
    tracker.setNextStopDistance(290);
    expect(tracker.getMode()).toBe('HIGH_ACCURACY');
  });

  it('uses default config values when none provided', () => {
    tracker.enableBatterySaver();
    tracker.start();

    emitPosition(52.5, -6.5);

    // Default far_stop_distance is 500
    tracker.setNextStopDistance(600);
    expect(tracker.getMode()).toBe('FAR_CRUISE');

    // Default approach_distance is 200
    tracker.setNextStopDistance(100);
    expect(tracker.getMode()).toBe('HIGH_ACCURACY');
  });

  it('restarts watchPosition on mode change', () => {
    tracker.enableBatterySaver({ far_stop_distance: 500 });
    tracker.start();

    const initialCalls = geo.watchPosition.mock.calls.length;

    emitPosition(52.5, -6.5);
    tracker.setNextStopDistance(1000); // triggers FAR_CRUISE

    // clearWatch should have been called, and watchPosition called again
    expect(geo.clearWatch).toHaveBeenCalled();
    expect(geo.watchPosition.mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('FAR_CRUISE to STATIONARY transition works', () => {
    vi.useFakeTimers();
    tracker.enableBatterySaver({
      far_stop_distance: 500,
      stationary_timeout: 120,
      stationary_radius: 10,
    });
    tracker.start();

    emitPosition(52.5, -6.5);
    tracker.setNextStopDistance(1000);
    expect(tracker.getMode()).toBe('FAR_CRUISE');

    // Stay still for stationary timeout
    vi.advanceTimersByTime(121000);
    emitPosition(52.5, -6.5);
    expect(tracker.getMode()).toBe('STATIONARY');

    vi.useRealTimers();
  });
});
