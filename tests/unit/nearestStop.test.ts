import { describe, it, expect } from 'vitest';
import { nearestStop } from '../../src/gps/nearestStop';
import type { Stop } from '../../src/types';

function makeStop(id: string, lat: number, lng: number): Stop {
  return {
    id,
    title: id,
    coords: [lat, lng],
    content: [],
  } as Stop;
}

describe('nearestStop', () => {
  it('returns index 0 and Infinity distance for empty stops array', () => {
    const result = nearestStop(52.5, -6.5, []);
    expect(result.index).toBe(0);
    expect(result.distance).toBe(Infinity);
  });

  it('returns 0 for single stop with a plausible distance', () => {
    const stops = [makeStop('a', 52.5, -6.5)];
    const result = nearestStop(52.501, -6.501, stops);
    expect(result.index).toBe(0);
    expect(result.distance).toBeGreaterThan(0);
    expect(result.distance).toBeLessThan(200); // ~130m
  });

  it('returns the index of the nearest stop', () => {
    const stops = [
      makeStop('far', 54.0, -8.0),
      makeStop('near', 52.501, -6.501),
      makeStop('mid', 53.0, -7.0),
    ];
    const result = nearestStop(52.5, -6.5, stops);
    expect(result.index).toBe(1);
  });

  it('returns zero distance for exact match', () => {
    const stops = [
      makeStop('other', 54.0, -8.0),
      makeStop('exact', 52.5, -6.5),
    ];
    const result = nearestStop(52.5, -6.5, stops);
    expect(result.index).toBe(1);
    expect(result.distance).toBe(0);
  });

  it('handles antipodal points', () => {
    const stops = [
      makeStop('north', 89.0, 0.0),
      makeStop('south', -89.0, 0.0),
    ];
    const result = nearestStop(85.0, 10.0, stops);
    expect(result.index).toBe(0);
  });

  it('handles antimeridian correctly', () => {
    const stops = [
      makeStop('west', 0.0, 179.0),
      makeStop('east', 0.0, -179.0),
    ];
    const result = nearestStop(0.0, 180.0, stops);
    expect(result.index).toBeGreaterThanOrEqual(0);
    expect(result.index).toBeLessThan(2);
  });

  it('distance is in metres and reasonable', () => {
    // Dublin to Enniscorthy is ~120km
    const stops = [makeStop('enniscorthy', 52.502, -6.566)];
    const result = nearestStop(53.349, -6.260, stops); // Dublin
    expect(result.distance).toBeGreaterThan(90_000);
    expect(result.distance).toBeLessThan(110_000);
  });
});
