import { describe, it, expect } from 'vitest';
import { placeChevrons, ChevronPlacement } from '../../src/map/chevrons';

describe('placeChevrons', () => {
  it('returns empty array for path with fewer than 2 points', () => {
    expect(placeChevrons([])).toEqual([]);
    expect(placeChevrons([[0, 0]])).toEqual([]);
  });

  it('places chevrons along a straight north-south line', () => {
    // ~111m per degree of latitude
    const path: [number, number][] = [[0, 0], [0.002, 0]]; // ~222m
    const result = placeChevrons(path, false, 60);
    expect(result.length).toBeGreaterThanOrEqual(2);
    // All chevrons should point roughly north (bearing ~0°)
    for (const c of result) {
      expect(c.angle).toBeCloseTo(0, -1); // within ~10°
    }
  });

  it('places chevrons along a straight east-west line', () => {
    const path: [number, number][] = [[0, 0], [0, 0.002]]; // ~222m at equator
    const result = placeChevrons(path, false, 60);
    expect(result.length).toBeGreaterThanOrEqual(2);
    // All chevrons should point roughly east (bearing ~90°)
    for (const c of result) {
      expect(c.angle).toBeCloseTo(90, -1);
    }
  });

  it('reverses chevron angles when reversed=true', () => {
    const path: [number, number][] = [[0, 0], [0.002, 0]];
    const forward = placeChevrons(path, false, 60);
    const reversed = placeChevrons(path, true, 60);

    expect(forward.length).toBe(reversed.length);
    for (let i = 0; i < forward.length; i++) {
      // Reversed angle should be ~180° from forward
      const diff = Math.abs(reversed[i].angle - ((forward[i].angle + 180) % 360));
      expect(diff).toBeLessThan(1);
    }
  });

  it('skips very short segments', () => {
    // Three points, first segment very short (~11m), second is long
    const path: [number, number][] = [[0, 0], [0.0001, 0], [0.002, 0]];
    const result = placeChevrons(path, false, 60);
    // Should still produce chevrons despite the short first segment
    expect(result.length).toBeGreaterThanOrEqual(1);
  });

  it('respects custom interval', () => {
    const path: [number, number][] = [[0, 0], [0.005, 0]]; // ~555m
    const tight = placeChevrons(path, false, 30);
    const loose = placeChevrons(path, false, 120);
    expect(tight.length).toBeGreaterThan(loose.length);
  });

  it('places chevrons between start and end (not at endpoints)', () => {
    const path: [number, number][] = [[0, 0], [0.002, 0]];
    const result = placeChevrons(path, false, 60);
    for (const c of result) {
      // Should not be exactly at start or end
      expect(c.lat).toBeGreaterThan(0);
      expect(c.lat).toBeLessThan(0.002);
    }
  });

  it('handles multi-segment paths', () => {
    const path: [number, number][] = [
      [0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001],
    ];
    const result = placeChevrons(path, false, 40);
    expect(result.length).toBeGreaterThanOrEqual(3);
    // Chevrons should be at various angles (N, E, S segments)
    const angles = new Set(result.map(c => Math.round(c.angle / 45) * 45));
    expect(angles.size).toBeGreaterThanOrEqual(2);
  });
});
