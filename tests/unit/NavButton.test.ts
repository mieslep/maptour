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

import { NavButton } from '../../src/card/NavButton';
import { NavAppPreference } from '../../src/navigation/NavAppPreference';
import { vi, beforeEach } from 'vitest';

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function makeNavStop(overrides: Partial<Stop> = {}): Stop {
  return {
    id: 1,
    title: 'Trinity Sculpture',
    coords: [52.5022, -6.5581],
    content: [],
    getting_here: { mode: 'walk' },
    ...overrides,
  };
}

describe('NavButton — render variants', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('renders a full button by default', () => {
    const container = makeContainer();
    new NavButton(container, makeNavStop(), new NavAppPreference());
    const btn = container.querySelector('button.maptour-nav-btn');
    expect(btn).not.toBeNull();
    expect(btn!.classList.contains('maptour-nav-btn--pin')).toBe(false);
    expect(btn!.classList.contains('maptour-nav-btn--arrow')).toBe(false);
    expect(btn!.textContent).toContain('Trinity Sculpture');
  });

  it('renders a pin variant with icon-only button', () => {
    const container = makeContainer();
    new NavButton(container, makeNavStop(), new NavAppPreference(), undefined, undefined, 'pin');
    const btn = container.querySelector('button.maptour-nav-btn--pin');
    expect(btn).not.toBeNull();
    expect(btn!.querySelector('i')).not.toBeNull();
  });

  it('renders an arrow variant with icon-only button', () => {
    const container = makeContainer();
    new NavButton(container, makeNavStop(), new NavAppPreference(), undefined, undefined, 'arrow');
    const btn = container.querySelector('button.maptour-nav-btn--arrow');
    expect(btn).not.toBeNull();
  });
});

describe('NavButton — picker flow', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('shows the picker on first click when no preference is saved', () => {
    const container = makeContainer();
    new NavButton(container, makeNavStop(), new NavAppPreference());
    const btn = container.querySelector('button.maptour-nav-btn') as HTMLButtonElement;

    btn.click();

    const picker = container.querySelector('.maptour-nav-picker');
    expect(picker).not.toBeNull();
    expect(picker!.getAttribute('role')).toBe('dialog');
    // Walk mode -> 2 options (google, apple) + cancel
    expect(container.querySelectorAll('.maptour-nav-picker__option').length).toBe(2);
    expect(container.querySelector('.maptour-nav-picker__cancel')).not.toBeNull();
  });

  it('drive mode picker shows google + apple + waze (3 options)', () => {
    const container = makeContainer();
    new NavButton(container, makeNavStop({ getting_here: { mode: 'drive' } }), new NavAppPreference());
    const btn = container.querySelector('button.maptour-nav-btn') as HTMLButtonElement;
    btn.click();
    expect(container.querySelectorAll('.maptour-nav-picker__option').length).toBe(3);
  });

  it('cancel button hides the picker', () => {
    const container = makeContainer();
    new NavButton(container, makeNavStop(), new NavAppPreference());
    (container.querySelector('button.maptour-nav-btn') as HTMLButtonElement).click();
    expect(container.querySelector('.maptour-nav-picker')).not.toBeNull();

    (container.querySelector('.maptour-nav-picker__cancel') as HTMLButtonElement).click();
    expect(container.querySelector('.maptour-nav-picker')).toBeNull();
  });

  it('clicking the main button while picker is open hides it', () => {
    const container = makeContainer();
    new NavButton(container, makeNavStop(), new NavAppPreference());
    const btn = container.querySelector('button.maptour-nav-btn') as HTMLButtonElement;
    btn.click();
    expect(container.querySelector('.maptour-nav-picker')).not.toBeNull();
    btn.click();
    expect(container.querySelector('.maptour-nav-picker')).toBeNull();
  });

  it('selecting an option saves the preference and triggers the deep link', () => {
    const container = makeContainer();
    const onNavigate = vi.fn();
    const pref = new NavAppPreference();
    new NavButton(container, makeNavStop(), pref, onNavigate);

    (container.querySelector('button.maptour-nav-btn') as HTMLButtonElement).click();
    const firstOption = container.querySelector('.maptour-nav-picker__option') as HTMLButtonElement;
    firstOption.click();

    // Picker is hidden after selection
    expect(container.querySelector('.maptour-nav-picker')).toBeNull();
    // Preference saved
    expect(pref.get()).not.toBeNull();
    // Callback invoked
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('once a preference is saved, subsequent clicks skip the picker', () => {
    const container = makeContainer();
    const onNavigate = vi.fn();
    const pref = new NavAppPreference();
    pref.set('google');
    new NavButton(container, makeNavStop(), pref, onNavigate);

    (container.querySelector('button.maptour-nav-btn') as HTMLButtonElement).click();

    expect(container.querySelector('.maptour-nav-picker')).toBeNull();
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it('a saved preference invalid for the current mode falls back to the picker', () => {
    const container = makeContainer();
    const pref = new NavAppPreference();
    pref.set('waze');  // waze is invalid for walk mode
    new NavButton(container, makeNavStop({ getting_here: { mode: 'walk' } }), pref);

    (container.querySelector('button.maptour-nav-btn') as HTMLButtonElement).click();
    expect(container.querySelector('.maptour-nav-picker')).not.toBeNull();
  });
});

describe('NavButton — update()', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  it('re-renders for the new stop and updates the leg mode', () => {
    const container = makeContainer();
    const button = new NavButton(container, makeNavStop({ title: 'Stop A', getting_here: { mode: 'walk' } }), new NavAppPreference());
    expect(container.textContent).toContain('Stop A');

    button.update(makeNavStop({ title: 'Stop B', getting_here: { mode: 'drive' } }));
    expect(container.textContent).toContain('Stop B');
    // Picker should now offer drive options
    (container.querySelector('button.maptour-nav-btn') as HTMLButtonElement).click();
    expect(container.querySelectorAll('.maptour-nav-picker__option').length).toBe(3);
  });

  it('hides any open picker before re-rendering', () => {
    const container = makeContainer();
    const button = new NavButton(container, makeNavStop(), new NavAppPreference());
    (container.querySelector('button.maptour-nav-btn') as HTMLButtonElement).click();
    expect(container.querySelector('.maptour-nav-picker')).not.toBeNull();

    button.update(makeNavStop({ title: 'New Stop' }));
    // After re-render, no stale picker remains
    expect(container.querySelector('.maptour-nav-picker')).toBeNull();
  });
});
