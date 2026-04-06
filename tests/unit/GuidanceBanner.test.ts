import { describe, it, expect, beforeEach } from 'vitest';
import { GuidanceBanner } from '../../src/waypoint/GuidanceBanner';
import type { Waypoint } from '../../src/types';

function makeWaypoint(overrides: Partial<Waypoint> = {}): Waypoint {
  return {
    coords: [51.5, -0.1],
    text: 'Turn left at the fountain',
    ...overrides,
  };
}

describe('GuidanceBanner', () => {
  let banner: GuidanceBanner;

  beforeEach(() => {
    banner = new GuidanceBanner();
  });

  it('creates the correct element structure', () => {
    const el = banner.getElement();
    expect(el.className).toBe('maptour-guidance-banner');
    expect(el.hidden).toBe(true);
    expect(el.children).toHaveLength(2);

    const photo = el.children[0] as HTMLImageElement;
    expect(photo.tagName).toBe('IMG');
    expect(photo.className).toBe('maptour-guidance-banner__photo');
    expect(photo.hidden).toBe(true);

    const text = el.children[1] as HTMLElement;
    expect(text.className).toBe('maptour-guidance-banner__text');
  });

  it('setWaypoint updates text', () => {
    const wp = makeWaypoint({ text: 'Cross the bridge' });
    banner.setWaypoint(wp);

    const text = banner.getElement().querySelector('.maptour-guidance-banner__text')!;
    expect(text.textContent).toBe('Cross the bridge');
    expect(banner.getElement().hidden).toBe(false);
  });

  it('setWaypoint with photo shows the image', () => {
    const wp = makeWaypoint({ photo: 'https://example.com/photo.jpg' });
    banner.setWaypoint(wp);

    const photo = banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement;
    expect(photo.hidden).toBe(false);
    expect(photo.src).toBe('https://example.com/photo.jpg');
  });

  it('setWaypoint without photo hides the image', () => {
    const wp = makeWaypoint();
    banner.setWaypoint(wp);

    const photo = banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement;
    expect(photo.hidden).toBe(true);
    expect(photo.hasAttribute('src')).toBe(false);
  });

  it('hide() and show() toggle visibility', () => {
    const wp = makeWaypoint();
    banner.setWaypoint(wp);
    expect(banner.getElement().hidden).toBe(false);

    banner.hide();
    expect(banner.getElement().hidden).toBe(true);

    banner.show();
    expect(banner.getElement().hidden).toBe(false);
  });

  it('switching from photo waypoint to text-only hides photo', () => {
    const withPhoto = makeWaypoint({ photo: 'https://example.com/a.jpg' });
    banner.setWaypoint(withPhoto);

    const photo = banner.getElement().querySelector('.maptour-guidance-banner__photo') as HTMLImageElement;
    expect(photo.hidden).toBe(false);

    const textOnly = makeWaypoint({ text: 'No photo here' });
    banner.setWaypoint(textOnly);

    expect(photo.hidden).toBe(true);
    expect(photo.hasAttribute('src')).toBe(false);
  });
});
