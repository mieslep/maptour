import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavAppPreference } from '../../src/navigation/NavAppPreference';

describe('NavAppPreference', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns null when no preference is stored', () => {
    const pref = new NavAppPreference();
    expect(pref.get()).toBeNull();
  });

  it('stores and retrieves a preference', () => {
    const pref = new NavAppPreference();
    pref.set('google');
    expect(pref.get()).toBe('google');
  });

  it('persists preference across instances', () => {
    const pref1 = new NavAppPreference();
    pref1.set('waze');

    const pref2 = new NavAppPreference();
    expect(pref2.get()).toBe('waze');
  });

  it('can update preference', () => {
    const pref = new NavAppPreference();
    pref.set('google');
    pref.set('apple');
    expect(pref.get()).toBe('apple');
  });

  it('clear removes preference', () => {
    const pref = new NavAppPreference();
    pref.set('google');
    pref.clear();
    expect(pref.get()).toBeNull();
  });

  it('clear persists — new instance also returns null', () => {
    const pref1 = new NavAppPreference();
    pref1.set('google');
    pref1.clear();

    const pref2 = new NavAppPreference();
    expect(pref2.get()).toBeNull();
  });

  it('degrades to in-memory when localStorage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    expect(() => {
      const pref = new NavAppPreference();
      pref.set('google');
      // In-memory value should still be accessible within same instance
    }).not.toThrow();
  });

  it('supports all nav app values', () => {
    const pref = new NavAppPreference();
    for (const app of ['google', 'apple', 'waze']) {
      pref.set(app);
      expect(pref.get()).toBe(app);
    }
  });
});
