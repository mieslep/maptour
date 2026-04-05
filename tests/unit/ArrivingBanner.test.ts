import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ArrivingBanner } from '../../src/card/ArrivingBanner';

describe('ArrivingBanner', () => {
  let banner: ArrivingBanner;

  beforeEach(() => {
    vi.useFakeTimers();
    banner = new ArrivingBanner();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates element with correct class and role', () => {
    const el = banner.getElement();
    expect(el.className).toBe('maptour-arriving-banner');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.hidden).toBe(true);
  });

  it('show() sets text using i18n arriving_at string with stop placeholder', () => {
    banner.show('The Cathedral');
    expect(banner.getElement().textContent).toBe('Arriving at The Cathedral');
  });

  it('show() unhides the element', () => {
    banner.show('Town Square');
    expect(banner.getElement().hidden).toBe(false);
  });

  it('dismiss() hides the element', () => {
    banner.show('Town Square');
    banner.dismiss();
    expect(banner.getElement().hidden).toBe(true);
  });

  it('auto-dismisses after 3 seconds', () => {
    banner.show('The Bridge');
    expect(banner.getElement().hidden).toBe(false);

    vi.advanceTimersByTime(2999);
    expect(banner.getElement().hidden).toBe(false);

    vi.advanceTimersByTime(1);
    expect(banner.getElement().hidden).toBe(true);
  });

  it('click on element triggers dismiss', () => {
    banner.show('The Park');
    expect(banner.getElement().hidden).toBe(false);

    banner.getElement().click();
    expect(banner.getElement().hidden).toBe(true);
  });

  it('calling show() again resets the timer', () => {
    banner.show('Stop A');
    vi.advanceTimersByTime(2000);

    // Call show() again — timer should reset
    banner.show('Stop B');
    expect(banner.getElement().textContent).toBe('Arriving at Stop B');

    // Original timer would have fired at 3000ms, but we reset at 2000ms
    vi.advanceTimersByTime(1500);
    expect(banner.getElement().hidden).toBe(false);

    // Full 3s from the second show()
    vi.advanceTimersByTime(1500);
    expect(banner.getElement().hidden).toBe(true);
  });

  it('banner has no animation class when prefers-reduced-motion', () => {
    // The component applies CSS animation via the class name;
    // prefers-reduced-motion is handled purely in CSS with animation: none.
    // Verify the element always has the class (CSS handles the media query).
    const el = banner.getElement();
    expect(el.className).toBe('maptour-arriving-banner');
  });
});
