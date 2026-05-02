/**
 * TOUR-048: Coverage gaps in GpsTracker.ts that batterySaver.test.ts doesn't reach:
 * callback registration / removal, heading priority chain, compass listener,
 * geolocation availability, stop().
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GpsTracker } from '../../src/gps/GpsTracker';

let watchSuccess: ((pos: GeolocationPosition) => void) | null = null;
let watchError: ((err: GeolocationPositionError) => void) | null = null;
let watchIdCounter = 1;

function mockGeolocation() {
  const geo = {
    watchPosition: vi.fn((success, error) => {
      watchSuccess = success;
      watchError = error;
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

function emitPosition(
  lat: number,
  lng: number,
  opts: { accuracy?: number; heading?: number | null } = {},
) {
  if (!watchSuccess) throw new Error('No watch callback registered');
  watchSuccess({
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy: opts.accuracy ?? 5,
      altitude: null,
      altitudeAccuracy: null,
      heading: opts.heading ?? null,
      speed: null,
    },
    timestamp: Date.now(),
  } as GeolocationPosition);
}

describe('GpsTracker — availability', () => {
  it('isAvailable returns true when navigator.geolocation exists', () => {
    mockGeolocation();
    const tracker = new GpsTracker();
    expect(tracker.isAvailable()).toBe(true);
  });

  it('start() is a no-op when geolocation is unavailable', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const tracker = new GpsTracker();
    expect(() => tracker.start()).not.toThrow();
    expect(tracker.getLastPosition()).toBeNull();
  });
});

describe('GpsTracker — position callbacks', () => {
  let tracker: GpsTracker;

  beforeEach(() => {
    mockGeolocation();
    tracker = new GpsTracker();
    watchSuccess = null;
    watchError = null;
  });

  afterEach(() => {
    tracker.stop();
  });

  it('onPosition receives a position when one is emitted', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onPosition(cb);
    emitPosition(52.5, -6.5, { accuracy: 10 });
    expect(cb).toHaveBeenCalledWith({ lat: 52.5, lng: -6.5, accuracy: 10 });
  });

  it('onPosition immediately emits the last known position to a late subscriber', () => {
    tracker.start();
    emitPosition(52.5, -6.5);
    const cb = vi.fn();
    tracker.onPosition(cb);
    expect(cb).toHaveBeenCalledWith({ lat: 52.5, lng: -6.5, accuracy: 5 });
  });

  it('offPosition stops a callback from receiving subsequent positions', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onPosition(cb);
    emitPosition(52.5, -6.5);
    tracker.offPosition(cb);
    cb.mockClear();
    emitPosition(52.6, -6.6);
    expect(cb).not.toHaveBeenCalled();
  });

  it('multiple onPosition callbacks all receive the same position', () => {
    tracker.start();
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    tracker.onPosition(cb1);
    tracker.onPosition(cb2);
    emitPosition(52.5, -6.5);
    expect(cb1).toHaveBeenCalledTimes(1);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  it('error callback emits null to subscribers', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onPosition(cb);
    if (watchError) {
      watchError({ code: 1, message: 'denied' } as GeolocationPositionError);
    }
    expect(cb).toHaveBeenCalledWith(null);
  });

  it('getLastPosition returns the most recent emitted position', () => {
    tracker.start();
    emitPosition(52.5, -6.5);
    expect(tracker.getLastPosition()).toEqual({ lat: 52.5, lng: -6.5, accuracy: 5 });
    emitPosition(52.6, -6.6, { accuracy: 8 });
    expect(tracker.getLastPosition()).toEqual({ lat: 52.6, lng: -6.6, accuracy: 8 });
  });
});

describe('GpsTracker — heading callbacks', () => {
  let tracker: GpsTracker;

  beforeEach(() => {
    mockGeolocation();
    tracker = new GpsTracker();
    watchSuccess = null;
    watchError = null;
  });

  afterEach(() => {
    tracker.stop();
  });

  it('onHeading receives a heading when geolocation provides one', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onHeading(cb);
    emitPosition(52.5, -6.5, { heading: 90 });
    expect(cb).toHaveBeenCalledWith(90);
    expect(tracker.getHeading()).toBe(90);
  });

  it('onHeading uses movement-based heading when geolocation heading is absent', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onHeading(cb);
    emitPosition(52.5, -6.5);
    cb.mockClear();
    // Move ~110m north — should derive a heading near 0°
    emitPosition(52.501, -6.5);
    expect(cb).toHaveBeenCalled();
    const heading = tracker.getHeading();
    expect(heading).not.toBeNull();
    expect(heading!).toBeGreaterThanOrEqual(0);
    expect(heading!).toBeLessThan(10);
  });

  it('onHeading immediately emits the last known heading to a late subscriber', () => {
    tracker.start();
    emitPosition(52.5, -6.5, { heading: 45 });
    const cb = vi.fn();
    tracker.onHeading(cb);
    expect(cb).toHaveBeenCalledWith(45);
  });

  it('offHeading stops a callback from receiving subsequent headings', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onHeading(cb);
    emitPosition(52.5, -6.5, { heading: 45 });
    tracker.offHeading(cb);
    cb.mockClear();
    emitPosition(52.6, -6.6, { heading: 90 });
    expect(cb).not.toHaveBeenCalled();
  });

  it('updateHeading does NOT re-notify when the heading is unchanged', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onHeading(cb);
    emitPosition(52.5, -6.5, { heading: 90 });
    cb.mockClear();
    // Same heading — no notification
    emitPosition(52.51, -6.5, { heading: 90 });
    expect(cb).not.toHaveBeenCalled();
  });

  it('movement under threshold does not derive a heading', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onHeading(cb);
    emitPosition(52.5, -6.5);
    cb.mockClear();
    // Move only ~1m — below 5m threshold
    emitPosition(52.50001, -6.5);
    // Heading should not be derived from such tiny movement
    expect(tracker.getHeading()).toBeNull();
  });
});

describe('GpsTracker — stop() and watch lifecycle', () => {
  let geo: ReturnType<typeof mockGeolocation>;
  let tracker: GpsTracker;

  beforeEach(() => {
    geo = mockGeolocation();
    tracker = new GpsTracker();
    watchSuccess = null;
  });

  it('stop() clears the active watch', () => {
    tracker.start();
    tracker.stop();
    expect(geo.clearWatch).toHaveBeenCalled();
  });

  it('stop() is a no-op when geolocation is unavailable', () => {
    Object.defineProperty(navigator, 'geolocation', {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const t = new GpsTracker();
    expect(() => t.stop()).not.toThrow();
  });

  it('start() called twice clears the previous watch before starting a new one', () => {
    tracker.start();
    const firstCalls = geo.clearWatch.mock.calls.length;
    // Trigger a mode change which restarts the watch
    tracker.enableBatterySaver();
    emitPosition(52.5, -6.5);
    tracker.setNextStopDistance(10000);
    expect(geo.clearWatch.mock.calls.length).toBeGreaterThan(firstCalls);
  });
});

describe('GpsTracker — getWatchOptions', () => {
  it('returns the options for the current mode', () => {
    mockGeolocation();
    const tracker = new GpsTracker();
    expect(tracker.getWatchOptions().enableHighAccuracy).toBe(true);
    expect(tracker.getWatchOptions().maximumAge).toBe(30000);
  });
});

describe('GpsTracker — compass listener', () => {
  let tracker: GpsTracker;

  beforeEach(() => {
    mockGeolocation();
    tracker = new GpsTracker();
    watchSuccess = null;
  });

  afterEach(() => {
    tracker.stop();
  });

  it('webkitCompassHeading takes priority when present', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onHeading(cb);
    const event = new Event('deviceorientation') as DeviceOrientationEvent & {
      webkitCompassHeading?: number;
    };
    Object.defineProperty(event, 'webkitCompassHeading', { value: 123 });
    Object.defineProperty(event, 'alpha', { value: null });
    Object.defineProperty(event, 'absolute', { value: false });
    window.dispatchEvent(event);
    expect(cb).toHaveBeenCalledWith(123);
  });

  it('falls back to alpha when webkitCompassHeading is missing', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onHeading(cb);
    const event = new Event('deviceorientation') as DeviceOrientationEvent;
    Object.defineProperty(event, 'alpha', { value: 90 });
    Object.defineProperty(event, 'absolute', { value: true });
    window.dispatchEvent(event);
    // (360 - 90) % 360 === 270
    expect(cb).toHaveBeenCalledWith(270);
  });

  it('clears compassHeading when both webkit and alpha are unavailable', () => {
    tracker.start();
    // Prime a heading via geolocation first
    emitPosition(52.5, -6.5, { heading: 45 });
    const cb = vi.fn();
    tracker.onHeading(cb);
    cb.mockClear();
    const event = new Event('deviceorientation') as DeviceOrientationEvent;
    Object.defineProperty(event, 'alpha', { value: null });
    Object.defineProperty(event, 'absolute', { value: false });
    window.dispatchEvent(event);
    // compassHeading is null -> falls back to currentHeading (45) which is unchanged -> no notify
    expect(cb).not.toHaveBeenCalled();
  });

  it('compass heading takes priority over geolocation heading', () => {
    tracker.start();
    const cb = vi.fn();
    tracker.onHeading(cb);
    // Prime compass to 100
    const event = new Event('deviceorientation') as DeviceOrientationEvent & {
      webkitCompassHeading?: number;
    };
    Object.defineProperty(event, 'webkitCompassHeading', { value: 100 });
    window.dispatchEvent(event);
    cb.mockClear();
    // Geolocation reports a different heading -> compass should win
    emitPosition(52.5, -6.5, { heading: 200 });
    // Heading should still reflect the compass value (100), not 200
    expect(tracker.getHeading()).toBe(100);
  });
});
