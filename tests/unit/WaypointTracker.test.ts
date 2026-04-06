import { describe, it, expect, vi } from 'vitest';
import { WaypointTracker, WaypointCallbacks } from '../../src/waypoint/WaypointTracker';
import type { Waypoint } from '../../src/types';

function lightWaypoint(lat: number, lng: number, text = 'wp'): Waypoint {
  return { coords: [lat, lng], text };
}

function journeyCardWaypoint(lat: number, lng: number, text = 'jc'): Waypoint {
  return { coords: [lat, lng], text, journey_card: true };
}

function contentWaypoint(lat: number, lng: number, text = 'cw'): Waypoint {
  return {
    coords: [lat, lng],
    text,
    content: [{ type: 'text', body: 'Hello' }],
  };
}

function makeCallbacks(overrides: Partial<WaypointCallbacks> = {}): WaypointCallbacks {
  return {
    onAdvance: vi.fn(),
    onJourneyCard: vi.fn(),
    onComplete: vi.fn(),
    ...overrides,
  };
}

describe('WaypointTracker', () => {
  describe('getCurrentWaypoint', () => {
    it('returns the active waypoint', () => {
      const wps = [lightWaypoint(1, 2), lightWaypoint(3, 4)];
      const tracker = new WaypointTracker(wps, makeCallbacks());
      expect(tracker.getCurrentWaypoint()).toBe(wps[0]);
    });
  });

  describe('getNextWaypoint', () => {
    it('returns the next waypoint when not at the end', () => {
      const wps = [lightWaypoint(1, 2), lightWaypoint(3, 4)];
      const tracker = new WaypointTracker(wps, makeCallbacks());
      expect(tracker.getNextWaypoint()).toBe(wps[1]);
    });

    it('returns null on the last waypoint', () => {
      const wps = [lightWaypoint(1, 2)];
      const tracker = new WaypointTracker(wps, makeCallbacks());
      expect(tracker.getNextWaypoint()).toBeNull();
    });
  });

  describe('getSegmentBounds', () => {
    it('returns from/to coords using previous and current waypoints', () => {
      const wps = [lightWaypoint(1, 2), lightWaypoint(3, 4), lightWaypoint(5, 6)];
      const cb = makeCallbacks();
      const tracker = new WaypointTracker(wps, cb);
      // At index 0, from === to (no previous)
      expect(tracker.getSegmentBounds()).toEqual({
        from: [1, 2],
        to: [1, 2],
      });

      tracker.advance();
      // Now at index 1, from = wp[0], to = wp[1]
      expect(tracker.getSegmentBounds()).toEqual({
        from: [1, 2],
        to: [3, 4],
      });
    });
  });

  describe('advance() on light waypoint', () => {
    it('fires onAdvance with the next waypoint', () => {
      const wps = [lightWaypoint(1, 2), lightWaypoint(3, 4), lightWaypoint(5, 6)];
      const cb = makeCallbacks();
      const tracker = new WaypointTracker(wps, cb);

      tracker.advance();

      expect(cb.onAdvance).toHaveBeenCalledWith(wps[1], wps[2]);
      expect(cb.onJourneyCard).not.toHaveBeenCalled();
      expect(cb.onComplete).not.toHaveBeenCalled();
    });
  });

  describe('advance() on journey card waypoint (journey_card: true)', () => {
    it('fires onJourneyCard with the waypoint and an onDismiss callback', () => {
      const wps = [journeyCardWaypoint(1, 2), lightWaypoint(3, 4)];
      const cb = makeCallbacks();
      const tracker = new WaypointTracker(wps, cb);

      tracker.advance();

      expect(cb.onJourneyCard).toHaveBeenCalledTimes(1);
      expect(cb.onJourneyCard).toHaveBeenCalledWith(wps[0], expect.any(Function));
      expect(cb.onAdvance).not.toHaveBeenCalled();
    });
  });

  describe('advance() on auto-promoted journey card (has content array)', () => {
    it('fires onJourneyCard when content is present', () => {
      const wps = [contentWaypoint(1, 2), lightWaypoint(3, 4)];
      const cb = makeCallbacks();
      const tracker = new WaypointTracker(wps, cb);

      tracker.advance();

      expect(cb.onJourneyCard).toHaveBeenCalledTimes(1);
      expect(cb.onJourneyCard).toHaveBeenCalledWith(wps[0], expect.any(Function));
    });
  });

  describe('onDismiss from onJourneyCard proceeds to afterAdvance', () => {
    it('fires onAdvance after onDismiss is called', () => {
      const wps = [journeyCardWaypoint(1, 2), lightWaypoint(3, 4)];
      const cb = makeCallbacks();
      // Capture the onDismiss callback
      cb.onJourneyCard = vi.fn((_wp, onDismiss) => {
        // Don't call onDismiss yet
      });
      const tracker = new WaypointTracker(wps, cb);

      tracker.advance();

      // onAdvance not called yet — card is still showing
      expect(cb.onAdvance).not.toHaveBeenCalled();

      // Now dismiss
      const onDismiss = (cb.onJourneyCard as ReturnType<typeof vi.fn>).mock.calls[0][1];
      onDismiss();

      expect(cb.onAdvance).toHaveBeenCalledWith(wps[1], null);
    });

    it('fires onComplete after onDismiss when journey card is the last waypoint', () => {
      const wps = [journeyCardWaypoint(1, 2)];
      const cb = makeCallbacks();
      cb.onJourneyCard = vi.fn();
      const tracker = new WaypointTracker(wps, cb);

      tracker.advance();
      const onDismiss = (cb.onJourneyCard as ReturnType<typeof vi.fn>).mock.calls[0][1];
      onDismiss();

      expect(cb.onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('advance() past final waypoint fires onComplete', () => {
    it('fires onComplete when advancing past the last waypoint', () => {
      const wps = [lightWaypoint(1, 2)];
      const cb = makeCallbacks();
      const tracker = new WaypointTracker(wps, cb);

      tracker.advance();

      expect(cb.onComplete).toHaveBeenCalledTimes(1);
      expect(cb.onAdvance).not.toHaveBeenCalled();
    });
  });

  describe('isComplete', () => {
    it('returns false initially', () => {
      const tracker = new WaypointTracker([lightWaypoint(1, 2)], makeCallbacks());
      expect(tracker.isComplete()).toBe(false);
    });

    it('returns true after all waypoints are passed', () => {
      const tracker = new WaypointTracker([lightWaypoint(1, 2)], makeCallbacks());
      tracker.advance();
      expect(tracker.isComplete()).toBe(true);
    });
  });

  describe('reset', () => {
    it('returns to the first waypoint', () => {
      const wps = [lightWaypoint(1, 2), lightWaypoint(3, 4)];
      const tracker = new WaypointTracker(wps, makeCallbacks());
      tracker.advance();
      expect(tracker.getCurrentWaypoint()).toBe(wps[1]);

      tracker.reset();
      expect(tracker.getCurrentWaypoint()).toBe(wps[0]);
      expect(tracker.isComplete()).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles empty waypoints array — advance is a no-op', () => {
      const cb = makeCallbacks();
      const tracker = new WaypointTracker([], cb);
      expect(tracker.isComplete()).toBe(true);
      tracker.advance();
      expect(cb.onAdvance).not.toHaveBeenCalled();
      expect(cb.onJourneyCard).not.toHaveBeenCalled();
      expect(cb.onComplete).not.toHaveBeenCalled();
    });

    it('handles single waypoint — advance completes immediately', () => {
      const cb = makeCallbacks();
      const tracker = new WaypointTracker([lightWaypoint(1, 2)], cb);
      tracker.advance();
      expect(cb.onComplete).toHaveBeenCalledTimes(1);
      expect(tracker.isComplete()).toBe(true);
    });
  });

  describe('multiple light waypoints in sequence', () => {
    it('advances through all waypoints firing onAdvance each time', () => {
      const wps = [lightWaypoint(1, 2), lightWaypoint(3, 4), lightWaypoint(5, 6)];
      const cb = makeCallbacks();
      const tracker = new WaypointTracker(wps, cb);

      tracker.advance();
      expect(cb.onAdvance).toHaveBeenCalledWith(wps[1], wps[2]);

      tracker.advance();
      expect(cb.onAdvance).toHaveBeenCalledWith(wps[2], null);

      tracker.advance();
      expect(cb.onComplete).toHaveBeenCalledTimes(1);
      expect(tracker.isComplete()).toBe(true);
    });
  });

  describe('mixed light + journey card waypoints', () => {
    it('correctly handles light then journey card then light', () => {
      const wps = [
        lightWaypoint(1, 2),
        journeyCardWaypoint(3, 4),
        lightWaypoint(5, 6),
      ];
      const cb = makeCallbacks();
      // Auto-dismiss journey cards
      cb.onJourneyCard = vi.fn((_wp, onDismiss) => onDismiss());
      const tracker = new WaypointTracker(wps, cb);

      // Advance past first (light) — next is journey card, so it auto-advances
      // into onJourneyCard (auto-dismissed), then onAdvance for the third
      tracker.advance();
      expect(cb.onJourneyCard).toHaveBeenCalledTimes(1);
      expect(cb.onAdvance).toHaveBeenCalledWith(wps[2], null);

      // Advance past third (light, last)
      tracker.advance();
      expect(cb.onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('getProgress', () => {
    it('returns current index and total count', () => {
      const wps = [lightWaypoint(1, 2), lightWaypoint(3, 4), lightWaypoint(5, 6)];
      const tracker = new WaypointTracker(wps, makeCallbacks());

      expect(tracker.getProgress()).toEqual({ current: 0, total: 3 });
      tracker.advance();
      expect(tracker.getProgress()).toEqual({ current: 1, total: 3 });
      tracker.advance();
      expect(tracker.getProgress()).toEqual({ current: 2, total: 3 });
      tracker.advance();
      expect(tracker.getProgress()).toEqual({ current: 3, total: 3 });
    });
  });
});
