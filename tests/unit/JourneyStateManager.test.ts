import { describe, it, expect, beforeEach } from 'vitest';
import { JourneyStateManager } from '../../src/journey/JourneyStateManager';

function makeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

describe('JourneyStateManager', () => {
  let mgr: JourneyStateManager;
  let storage: Storage;

  beforeEach(() => {
    storage = makeStorage();
    mgr = new JourneyStateManager('tour-1', 5, storage);
  });

  it('starts in tour_start state at index 0', () => {
    expect(mgr.getState()).toBe('tour_start');
    expect(mgr.getActiveStopIndex()).toBe(0);
  });

  it('transitions to at_stop with a given stop index', () => {
    mgr.transition('at_stop', 2);
    expect(mgr.getState()).toBe('at_stop');
    expect(mgr.getActiveStopIndex()).toBe(2);
  });

  it('clamps stop index to valid range', () => {
    mgr.transition('at_stop', 99);
    expect(mgr.getActiveStopIndex()).toBe(4); // stopCount - 1

    mgr.transition('at_stop', -5);
    expect(mgr.getActiveStopIndex()).toBe(0);
  });

  it('retains current index when transitioning without explicit index', () => {
    mgr.transition('at_stop', 3);
    mgr.transition('in_transit');
    expect(mgr.getActiveStopIndex()).toBe(3);
  });

  it('fires callbacks on transition', () => {
    const calls: Array<[string, number]> = [];
    mgr.onStateChange((state, idx) => calls.push([state, idx]));

    mgr.transition('at_stop', 1);
    mgr.transition('in_transit');

    expect(calls).toEqual([['at_stop', 1], ['in_transit', 1]]);
  });

  it('removes callbacks with offStateChange', () => {
    const calls: number[] = [];
    const cb = (_s: string, idx: number) => calls.push(idx);
    mgr.onStateChange(cb);
    mgr.transition('at_stop', 1);
    mgr.offStateChange(cb);
    mgr.transition('at_stop', 2);
    expect(calls).toEqual([1]);
  });

  describe('persist / restore', () => {
    it('persists state to storage and restores it', () => {
      mgr.transition('at_stop', 2);
      const mgr2 = new JourneyStateManager('tour-1', 5, storage);
      const restored = mgr2.restore();
      expect(restored).toBe(true);
      expect(mgr2.getState()).toBe('at_stop');
      expect(mgr2.getActiveStopIndex()).toBe(2);
    });

    it('normalises in_transit to at_stop on restore', () => {
      mgr.transition('in_transit', 3);
      const mgr2 = new JourneyStateManager('tour-1', 5, storage);
      mgr2.restore();
      expect(mgr2.getState()).toBe('at_stop');
      expect(mgr2.getActiveStopIndex()).toBe(3);
    });

    it('returns false when nothing saved', () => {
      const mgr2 = new JourneyStateManager('tour-1', 5, storage);
      expect(mgr2.restore()).toBe(false);
    });

    it('returns false with no storage', () => {
      const mgr2 = new JourneyStateManager('tour-1', 5, null);
      expect(mgr2.restore()).toBe(false);
    });

    it('returns false and does not crash on corrupted storage', () => {
      storage.setItem('maptour-journey-tour-1', 'not-json{{{');
      const mgr2 = new JourneyStateManager('tour-1', 5, storage);
      expect(mgr2.restore()).toBe(false);
      expect(mgr2.getState()).toBe('tour_start');
    });

    it('clamps restored stop index to valid range', () => {
      storage.setItem('maptour-journey-tour-1', JSON.stringify({ state: 'at_stop', stopIndex: 999 }));
      const mgr2 = new JourneyStateManager('tour-1', 5, storage);
      mgr2.restore();
      expect(mgr2.getActiveStopIndex()).toBe(4);
    });

    it('clearSaved removes the storage entry', () => {
      mgr.transition('at_stop', 1);
      mgr.clearSaved();
      const mgr2 = new JourneyStateManager('tour-1', 5, storage);
      expect(mgr2.restore()).toBe(false);
    });
  });

  it('uses tour id in storage key (isolates tours)', () => {
    const mgrA = new JourneyStateManager('tour-a', 3, storage);
    const mgrB = new JourneyStateManager('tour-b', 3, storage);
    mgrA.transition('at_stop', 1);
    mgrB.transition('at_stop', 2);

    const restoreA = new JourneyStateManager('tour-a', 3, storage);
    restoreA.restore();
    expect(restoreA.getActiveStopIndex()).toBe(1);

    const restoreB = new JourneyStateManager('tour-b', 3, storage);
    restoreB.restore();
    expect(restoreB.getActiveStopIndex()).toBe(2);
  });
});
