import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Breadcrumb } from '../../src/breadcrumb/Breadcrumb';

describe('Breadcrumb', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts with no visited stops', () => {
    const bc = new Breadcrumb('test-tour');
    expect(bc.getVisited().size).toBe(0);
  });

  it('marks a stop as visited', () => {
    const bc = new Breadcrumb('test-tour');
    bc.markVisited(1);
    expect(bc.isVisited(1)).toBe(true);
  });

  it('marks multiple stops visited', () => {
    const bc = new Breadcrumb('test-tour');
    bc.markVisited(1);
    bc.markVisited(3);
    bc.markVisited(5);
    expect(bc.isVisited(1)).toBe(true);
    expect(bc.isVisited(2)).toBe(false);
    expect(bc.isVisited(3)).toBe(true);
    expect(bc.isVisited(5)).toBe(true);
  });

  it('persists visited stops across instances', () => {
    const bc1 = new Breadcrumb('persist-tour');
    bc1.markVisited(2);
    bc1.markVisited(4);

    const bc2 = new Breadcrumb('persist-tour');
    expect(bc2.isVisited(2)).toBe(true);
    expect(bc2.isVisited(4)).toBe(true);
    expect(bc2.isVisited(1)).toBe(false);
  });

  it('tour IDs do not bleed into each other', () => {
    const bc1 = new Breadcrumb('tour-a');
    const bc2 = new Breadcrumb('tour-b');
    bc1.markVisited(1);
    expect(bc2.isVisited(1)).toBe(false);
  });

  it('getVisited returns a copy, not a reference', () => {
    const bc = new Breadcrumb('test-tour');
    bc.markVisited(1);
    const visited = bc.getVisited();
    visited.add(99);
    expect(bc.isVisited(99)).toBe(false);
  });

  it('clear removes all visited stops', () => {
    const bc = new Breadcrumb('test-tour');
    bc.markVisited(1);
    bc.markVisited(2);
    bc.clear();
    expect(bc.getVisited().size).toBe(0);

    // Reloading from localStorage also returns empty
    const bc2 = new Breadcrumb('test-tour');
    expect(bc2.getVisited().size).toBe(0);
  });

  it('degrades silently when localStorage is unavailable', () => {
    // Simulate localStorage throwing
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage unavailable');
    });

    expect(() => {
      const bc = new Breadcrumb('test-tour');
      bc.markVisited(1);
      bc.isVisited(1); // in-memory should still work
    }).not.toThrow();
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem('maptour_visited_corrupt-tour', 'not valid json {{{{');
    expect(() => {
      const bc = new Breadcrumb('corrupt-tour');
      expect(bc.getVisited().size).toBe(0);
    }).not.toThrow();
  });
});
