import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TourSession } from '../../src/session/TourSession';

describe('TourSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // === Construction and defaults ===

  it('initialises with default state', () => {
    const session = new TourSession('test', 5);
    expect(session.startIndex).toBe(0);
    expect(session.reversed).toBe(false);
    expect(session.currentStopIndex).toBe(0);
    expect(session.overviewSelectedIndex).toBe(0);
    expect(session.getStopCount()).toBe(5);
  });

  it('computes default tour order as natural sequence', () => {
    const session = new TourSession('test', 4);
    expect(session.tourOrder).toEqual([0, 1, 2, 3]);
  });

  it('computes default end index as last stop', () => {
    const session = new TourSession('test', 4);
    expect(session.endIndex).toBe(3); // (0 - 1 + 4) % 4 = 3
  });

  // === Tour order computation ===

  it('computes forward order from start index', () => {
    const session = new TourSession('test', 5);
    session.setStartIndex(2);
    expect(session.tourOrder).toEqual([2, 3, 4, 0, 1]);
  });

  it('computes reversed order from overview selection', () => {
    const session = new TourSession('test', 5);
    session.setOverviewSelection(2);
    session.setReversed(true);
    expect(session.tourOrder).toEqual([2, 1, 0, 4, 3]);
  });

  it('computes order from overview selection', () => {
    const session = new TourSession('test', 4);
    session.setOverviewSelection(3);
    expect(session.tourOrder).toEqual([3, 0, 1, 2]);
  });

  it('computes reversed order from overview selection', () => {
    const session = new TourSession('test', 4);
    session.setReversed(true);
    session.setOverviewSelection(1);
    expect(session.tourOrder).toEqual([1, 0, 3, 2]);
  });

  // === End index computation ===

  it('computes forward end index', () => {
    const session = new TourSession('test', 5);
    session.setStartIndex(2);
    // Forward: end = (2 - 1 + 5) % 5 = 1
    expect(session.endIndex).toBe(1);
  });

  it('computes reversed end index', () => {
    const session = new TourSession('test', 5);
    session.setOverviewSelection(2);
    session.setReversed(true);
    // Reversed from overview index 2: end = (2 + 1) % 5 = 3
    expect(session.endIndex).toBe(3);
  });

  it('computes end index at boundary (start=0, forward)', () => {
    const session = new TourSession('test', 4);
    // Forward from 0: end = (0 - 1 + 4) % 4 = 3
    expect(session.endIndex).toBe(3);
  });

  it('computes end index at boundary (start=0, reversed)', () => {
    const session = new TourSession('test', 4);
    session.setReversed(true);
    // Reversed from 0: end = (0 + 1) % 4 = 1
    expect(session.endIndex).toBe(1);
  });

  // === Visited state (Breadcrumb delegation) ===

  it('starts with empty visited set', () => {
    const session = new TourSession('test', 4);
    expect(session.getVisited().size).toBe(0);
  });

  it('marks stops as visited', () => {
    const session = new TourSession('test', 4);
    session.markVisited(1);
    session.markVisited(3);
    const visited = session.getVisited();
    expect(visited.has(1)).toBe(true);
    expect(visited.has(3)).toBe(true);
    expect(visited.has(2)).toBe(false);
  });

  it('persists visited state to localStorage', () => {
    const session1 = new TourSession('persist-test', 4);
    session1.markVisited(2);

    const session2 = new TourSession('persist-test', 4);
    expect(session2.getVisited().has(2)).toBe(true);
  });

  it('clears visited state', () => {
    const session = new TourSession('test', 4);
    session.markVisited(1);
    session.clearVisited();
    expect(session.getVisited().size).toBe(0);
  });

  // === onChange subscription ===

  it('fires onChange on setStartIndex', () => {
    const session = new TourSession('test', 4);
    const cb = vi.fn();
    session.onChange(cb);
    session.setStartIndex(2);
    expect(cb).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(session);
  });

  it('fires onChange on setReversed', () => {
    const session = new TourSession('test', 4);
    const cb = vi.fn();
    session.onChange(cb);
    session.setReversed(true);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('fires onChange on setCurrentStop', () => {
    const session = new TourSession('test', 4);
    const cb = vi.fn();
    session.onChange(cb);
    session.setCurrentStop(3);
    expect(cb).toHaveBeenCalledOnce();
    expect(session.currentStopIndex).toBe(3);
  });

  it('fires onChange on setOverviewSelection', () => {
    const session = new TourSession('test', 4);
    const cb = vi.fn();
    session.onChange(cb);
    session.setOverviewSelection(1);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('fires onChange on markVisited', () => {
    const session = new TourSession('test', 4);
    const cb = vi.fn();
    session.onChange(cb);
    session.markVisited(2);
    expect(cb).toHaveBeenCalledOnce();
  });

  it('fires onChange on reset', () => {
    const session = new TourSession('test', 4);
    session.setStartIndex(2);
    session.setReversed(true);
    const cb = vi.fn();
    session.onChange(cb);
    session.reset();
    expect(cb).toHaveBeenCalledOnce();
    expect(session.startIndex).toBe(0);
    expect(session.reversed).toBe(false);
    expect(session.tourOrder).toEqual([0, 1, 2, 3]);
  });

  it('fires onChange on clearVisited', () => {
    const session = new TourSession('test', 4);
    session.markVisited(1);
    const cb = vi.fn();
    session.onChange(cb);
    session.clearVisited();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('supports multiple subscribers', () => {
    const session = new TourSession('test', 4);
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    session.onChange(cb1);
    session.onChange(cb2);
    session.setStartIndex(1);
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('offChange removes subscriber', () => {
    const session = new TourSession('test', 4);
    const cb = vi.fn();
    session.onChange(cb);
    session.offChange(cb);
    session.setStartIndex(1);
    expect(cb).not.toHaveBeenCalled();
  });

  // === Reset ===

  it('reset restores all defaults', () => {
    const session = new TourSession('test', 5);
    session.setStartIndex(3);
    session.setReversed(true);
    session.setCurrentStop(2);
    session.setOverviewSelection(4);

    session.reset();

    expect(session.startIndex).toBe(0);
    expect(session.reversed).toBe(false);
    expect(session.currentStopIndex).toBe(0);
    expect(session.overviewSelectedIndex).toBe(0);
    expect(session.tourOrder).toEqual([0, 1, 2, 3, 4]);
    expect(session.endIndex).toBe(4);
  });

  // === Edge cases ===

  it('handles single-stop tour', () => {
    const session = new TourSession('test', 1);
    expect(session.tourOrder).toEqual([0]);
    expect(session.endIndex).toBe(0);
  });

  it('handles two-stop tour forward', () => {
    const session = new TourSession('test', 2);
    session.setStartIndex(0);
    expect(session.tourOrder).toEqual([0, 1]);
    expect(session.endIndex).toBe(1);
  });

  it('handles two-stop tour reversed', () => {
    const session = new TourSession('test', 2);
    session.setStartIndex(0);
    session.setReversed(true);
    expect(session.tourOrder).toEqual([0, 1]);
    expect(session.endIndex).toBe(1);
  });

  it('overview selection updates end index', () => {
    const session = new TourSession('test', 5);
    session.setOverviewSelection(3);
    // Forward from 3: end = (3 - 1 + 5) % 5 = 2
    expect(session.endIndex).toBe(2);
    expect(session.tourOrder).toEqual([3, 4, 0, 1, 2]);
  });
});
