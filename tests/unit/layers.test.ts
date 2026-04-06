import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('leaflet', () => ({
  default: {
    divIcon: (opts: Record<string, unknown>) => ({
      _type: 'DivIcon',
      options: opts,
    }),
  },
}));

import { createPinIcon, getLegStyle } from '../../src/map/layers';
import type { LegMode } from '../../src/types';

function pinOptions(icon: { options: { html: string } }): { html: string; className: string } {
  return icon.options as { html: string; className: string };
}

describe('createPinIcon', () => {
  it('returns a DivIcon-like object', () => {
    const icon = createPinIcon({ number: 1 }) as unknown as { _type: string };
    expect(icon._type).toBe('DivIcon');
  });

  it('sets empty className on the icon wrapper', () => {
    const icon = createPinIcon({ number: 1 }) as unknown as { options: { className: string } };
    expect(icon.options.className).toBe('');
  });

  it('includes the stop number in the HTML', () => {
    const icon = createPinIcon({ number: 5 }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('5');
  });

  it('applies base maptour-pin class by default', () => {
    const icon = createPinIcon({ number: 1 }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('maptour-pin');
    expect(icon.options.html).not.toContain('maptour-pin--');
  });

  it('applies selected class when selected', () => {
    const icon = createPinIcon({ number: 1, selected: true }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('maptour-pin--selected');
  });

  it('applies end class when end is true', () => {
    const icon = createPinIcon({ number: 1, end: true }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('maptour-pin--end');
  });

  it('applies active class when active', () => {
    const icon = createPinIcon({ number: 1, active: true }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('maptour-pin--active');
  });

  it('applies next (pulsing) class when pulsing', () => {
    const icon = createPinIcon({ number: 1, pulsing: true }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('maptour-pin--next');
  });

  it('applies visited class when visited', () => {
    const icon = createPinIcon({ number: 1, visited: true }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('maptour-pin--visited');
  });

  it('selected takes priority over other flags', () => {
    const icon = createPinIcon({ number: 1, selected: true, active: true, visited: true, pulsing: true, end: true }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('maptour-pin--selected');
    expect(icon.options.html).not.toContain('maptour-pin--active');
    expect(icon.options.html).not.toContain('maptour-pin--visited');
    expect(icon.options.html).not.toContain('maptour-pin--next');
    expect(icon.options.html).not.toContain('maptour-pin--end');
  });

  it('end takes priority over active, pulsing, visited', () => {
    const icon = createPinIcon({ number: 1, end: true, active: true, visited: true }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('maptour-pin--end');
    expect(icon.options.html).not.toContain('maptour-pin--active');
  });

  it('sets correct iconSize and iconAnchor', () => {
    const icon = createPinIcon({ number: 1 }) as unknown as { options: { iconSize: number[]; iconAnchor: number[] } };
    expect(icon.options.iconSize).toEqual([32, 32]);
    expect(icon.options.iconAnchor).toEqual([16, 32]);
  });

  it('includes aria-label with stop number', () => {
    const icon = createPinIcon({ number: 7 }) as unknown as { options: { html: string } };
    expect(icon.options.html).toContain('aria-label="Stop 7"');
  });
});

describe('getLegStyle', () => {
  it('returns dashed style for walk mode', () => {
    const style = getLegStyle('walk');
    expect(style.dashArray).toBeDefined();
    expect(style.color).toContain('maptour-accent');
    expect(style.weight).toBe(3);
    expect(style.opacity).toBe(0.8);
  });

  it('returns dashed style for cycle mode', () => {
    const style = getLegStyle('cycle');
    expect(style.dashArray).toBeDefined();
    expect(style.color).toContain('maptour-accent');
  });

  it('returns solid style for drive mode', () => {
    const style = getLegStyle('drive');
    expect(style.dashArray).toBeUndefined();
    expect(style.color).toContain('maptour-primary');
    expect(style.weight).toBe(3);
    expect(style.opacity).toBe(0.8);
  });

  it('returns solid style for transit mode', () => {
    const style = getLegStyle('transit');
    expect(style.dashArray).toBeUndefined();
    expect(style.color).toContain('maptour-primary');
  });

  it('walk and cycle share the same style', () => {
    const walk = getLegStyle('walk');
    const cycle = getLegStyle('cycle');
    expect(walk).toEqual(cycle);
  });

  it('drive and transit share the same style', () => {
    const drive = getLegStyle('drive');
    const transit = getLegStyle('transit');
    expect(drive).toEqual(transit);
  });
});
