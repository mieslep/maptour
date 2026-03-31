import { describe, it, expect } from 'vitest';
import { buildDeepLink, resolveMode } from '../../src/card/NavButton';
import type { Stop } from '../../src/types';

function makeStop(overrides: Partial<Stop> = {}): Stop {
  return {
    id: 1,
    title: 'Test Stop',
    coords: [52.5022, -6.5581],
    content: [],
    ...overrides,
  };
}

describe('resolveMode', () => {
  it('prefers stop leg mode over tour default', () => {
    const stop = makeStop({ getting_here: { mode: 'drive' } });
    expect(resolveMode(stop, 'walk')).toBe('drive');
  });

  it('falls back to tour nav_mode when no stop leg', () => {
    const stop = makeStop();
    expect(resolveMode(stop, 'transit')).toBe('transit');
  });

  it('falls back to walk when neither is set', () => {
    const stop = makeStop();
    expect(resolveMode(stop)).toBe('walk');
  });

  it('uses tour nav_mode cycle', () => {
    const stop = makeStop();
    expect(resolveMode(stop, 'cycle')).toBe('cycle');
  });
});

describe('buildDeepLink', () => {
  const lat = 52.5022;
  const lng = -6.5581;

  it('google maps walk → travelmode=walking', () => {
    const url = buildDeepLink('google', lat, lng, 'walk');
    expect(url).toContain('travelmode=walking');
  });

  it('google maps drive → travelmode=driving', () => {
    expect(buildDeepLink('google', lat, lng, 'drive')).toContain('travelmode=driving');
  });

  it('google maps transit → travelmode=transit', () => {
    expect(buildDeepLink('google', lat, lng, 'transit')).toContain('travelmode=transit');
  });

  it('google maps cycle → travelmode=bicycling', () => {
    expect(buildDeepLink('google', lat, lng, 'cycle')).toContain('travelmode=bicycling');
  });

  it('apple maps walk → dirflg=w', () => {
    expect(buildDeepLink('apple', lat, lng, 'walk')).toContain('dirflg=w');
  });

  it('apple maps drive → dirflg=d', () => {
    expect(buildDeepLink('apple', lat, lng, 'drive')).toContain('dirflg=d');
  });

  it('apple maps transit → dirflg=r', () => {
    expect(buildDeepLink('apple', lat, lng, 'transit')).toContain('dirflg=r');
  });

  it('apple maps cycle → dirflg=b', () => {
    expect(buildDeepLink('apple', lat, lng, 'cycle')).toContain('dirflg=b');
  });

  it('waze ignores mode', () => {
    const url = buildDeepLink('waze', lat, lng, 'drive');
    expect(url).toContain('waze.com');
    expect(url).not.toContain('travelmode');
  });

  it('includes coordinates in all URLs', () => {
    for (const app of ['google', 'apple', 'waze'] as const) {
      const url = buildDeepLink(app, lat, lng, 'walk');
      expect(url).toContain(`${lat}`);
      expect(url).toContain(`${lng}`);
    }
  });
});

describe('loader: extended nav modes', () => {
  // These tests verify via parseTourFromString that transit/cycle pass validation
  it('accepts transit and cycle leg modes', async () => {
    const { parseTourFromString } = await import('../../src/loader');
    const yaml = `
tour:
  id: t
  title: T
  nav_mode: transit
stops:
  - id: 1
    title: S
    coords: [52.5, -6.5]
    content: []
    getting_here:
      mode: cycle
`;
    const result = parseTourFromString(yaml);
    expect(result.error).toBeUndefined();
    expect(result.tour?.tour.nav_mode).toBe('transit');
    expect(result.tour?.stops[0].getting_here?.mode).toBe('cycle');
  });

  it('rejects invalid nav_mode', async () => {
    const { parseTourFromString } = await import('../../src/loader');
    const yaml = `
tour:
  id: t
  title: T
  nav_mode: helicopter
stops:
  - id: 1
    title: S
    coords: [52.5, -6.5]
    content: []
`;
    const result = parseTourFromString(yaml);
    // Zod schema rejects invalid enum values
    expect(result.error).toBeDefined();
    expect(result.tour).toBeUndefined();
  });
});
