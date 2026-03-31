import { describe, it, expect, vi } from 'vitest';
import { ProximityDetector } from '../../src/gps/proximityDetector';
import type { Stop, GpsConfig } from '../../src/types';
import type { GpsPosition } from '../../src/gps/GpsTracker';

function makeStop(id: number, lat: number, lng: number, arrivalRadius?: number): Stop {
  return {
    id,
    title: `Stop ${id}`,
    coords: [lat, lng] as [number, number],
    content: [],
    ...(arrivalRadius !== undefined ? { arrival_radius: arrivalRadius } : {}),
  };
}

function makePos(lat: number, lng: number, accuracy = 5): GpsPosition {
  return { lat, lng, accuracy };
}

// Enniscorthy area coords — stops ~200m apart
const STOP_A: [number, number] = [52.50180, -6.55710];
const STOP_B: [number, number] = [52.50350, -6.55710]; // ~189m north of A

// Position right on top of stop B
const AT_STOP_B = makePos(STOP_B[0], STOP_B[1], 5);

// Position ~30m from stop B
const NEAR_STOP_B = makePos(52.50325, -6.55710, 5);

// Position far from stop B (~100m south)
const FAR_FROM_B = makePos(52.50260, -6.55710, 5);

describe('ProximityDetector', () => {
  it('triggers arrival when within radius of next stop', () => {
    const stops = [makeStop(1, ...STOP_A), makeStop(2, ...STOP_B)];
    const detector = new ProximityDetector(stops, 0);
    const cb = vi.fn();
    detector.onArrival(cb);

    detector.checkPosition(AT_STOP_B);
    expect(cb).toHaveBeenCalledWith(1);
  });

  it('does not trigger when outside radius', () => {
    const stops = [makeStop(1, ...STOP_A), makeStop(2, ...STOP_B)];
    const detector = new ProximityDetector(stops, 0);
    const cb = vi.fn();
    detector.onArrival(cb);

    detector.checkPosition(FAR_FROM_B);
    expect(cb).not.toHaveBeenCalled();
  });

  it('accuracy guard prevents trigger when accuracy >= radius * 2', () => {
    const stops = [makeStop(1, ...STOP_A), makeStop(2, ...STOP_B)];
    const detector = new ProximityDetector(stops, 0);
    const cb = vi.fn();
    detector.onArrival(cb);

    // Position at stop B but with terrible accuracy (100m, >= 50 * 2)
    detector.checkPosition(makePos(STOP_B[0], STOP_B[1], 100));
    expect(cb).not.toHaveBeenCalled();
  });

  it('re-trigger protection: does not fire twice without exiting radius', () => {
    const stops = [makeStop(1, ...STOP_A), makeStop(2, ...STOP_B)];
    const detector = new ProximityDetector(stops, 0);
    const cb = vi.fn();
    detector.onArrival(cb);

    detector.checkPosition(AT_STOP_B);
    expect(cb).toHaveBeenCalledTimes(1);

    // Still inside radius
    detector.checkPosition(NEAR_STOP_B);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('re-trigger protection resets after exiting radius', () => {
    const stops = [makeStop(1, ...STOP_A), makeStop(2, ...STOP_B)];
    const detector = new ProximityDetector(stops, 0);
    const cb = vi.fn();
    detector.onArrival(cb);

    detector.checkPosition(AT_STOP_B);
    expect(cb).toHaveBeenCalledTimes(1);

    // Exit radius
    detector.checkPosition(FAR_FROM_B);

    // Re-enter
    detector.checkPosition(AT_STOP_B);
    expect(cb).toHaveBeenCalledTimes(2);
  });

  it('only monitors next sequential stop', () => {
    const stops = [
      makeStop(1, ...STOP_A),
      makeStop(2, 52.510, -6.557), // far away
      makeStop(3, ...STOP_B),      // close but not next
    ];
    const detector = new ProximityDetector(stops, 0);
    const cb = vi.fn();
    detector.onArrival(cb);

    // Walk to stop 3's location — but detector should only monitor stop 2 (index 1)
    detector.checkPosition(AT_STOP_B);
    expect(cb).not.toHaveBeenCalled();
  });

  it('does nothing when there is no next stop', () => {
    const stops = [makeStop(1, ...STOP_A)];
    const detector = new ProximityDetector(stops, 0);
    const cb = vi.fn();
    detector.onArrival(cb);

    detector.checkPosition(makePos(STOP_A[0], STOP_A[1], 5));
    expect(cb).not.toHaveBeenCalled();
  });

  it('uses per-stop arrival_radius override', () => {
    const stops = [
      makeStop(1, ...STOP_A),
      makeStop(2, ...STOP_B, 20), // 20m radius
    ];
    const tourConfig: GpsConfig = { arrival_radius: 100 };
    const detector = new ProximityDetector(stops, 0, tourConfig);
    const cb = vi.fn();
    detector.onArrival(cb);

    // ~30m from stop B — outside 20m per-stop radius
    detector.checkPosition(NEAR_STOP_B);
    expect(cb).not.toHaveBeenCalled();

    // Right at stop B — inside 20m
    detector.checkPosition(AT_STOP_B);
    expect(cb).toHaveBeenCalledWith(1);
  });

  it('uses tour-level arrival_radius when stop has no override', () => {
    const stops = [makeStop(1, ...STOP_A), makeStop(2, ...STOP_B)];
    const tourConfig: GpsConfig = { arrival_radius: 200 };
    const detector = new ProximityDetector(stops, 0, tourConfig);
    const cb = vi.fn();
    detector.onArrival(cb);

    // ~100m from stop B — inside 200m tour radius
    detector.checkPosition(FAR_FROM_B);
    expect(cb).toHaveBeenCalledWith(1);
  });

  it('defaults to 50m when no config is set', () => {
    const stops = [makeStop(1, ...STOP_A), makeStop(2, ...STOP_B)];
    const detector = new ProximityDetector(stops, 0);

    const radius = detector.getEffectiveRadius(stops[1]);
    expect(radius).toBe(50);
  });

  it('setCurrentStop resets re-trigger protection', () => {
    const stops = [
      makeStop(1, ...STOP_A),
      makeStop(2, ...STOP_B),
      makeStop(3, 52.505, -6.557),
    ];
    const detector = new ProximityDetector(stops, 0);
    const cb = vi.fn();
    detector.onArrival(cb);

    detector.checkPosition(AT_STOP_B);
    expect(cb).toHaveBeenCalledTimes(1);

    // Advance to stop 2 (index 1) — now monitoring stop 3
    detector.setCurrentStop(1);

    // Back at stop B position — stop 3 is far, should not trigger
    detector.checkPosition(AT_STOP_B);
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
