/**
 * A-INT: Phase A integration tests
 *
 * Tests the full waypoint browser transit flow through WaypointTracker,
 * verifying the orchestration: enter transit → waypoint sequence →
 * journey cards → arrival.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WaypointTracker } from '../../src/waypoint/WaypointTracker';
import type { Waypoint } from '../../src/types';

function lightWaypoint(text: string, coords: [number, number] = [52.5, -6.5]): Waypoint {
  return { coords, text };
}

function journeyCardWaypoint(text: string, opts: Partial<Waypoint> = {}): Waypoint {
  return { coords: [52.5, -6.5], text, journey_card: true, ...opts };
}

function contentWaypoint(text: string): Waypoint {
  return {
    coords: [52.5, -6.5],
    text,
    content: [{ type: 'text', body: 'Some content' }],
  };
}

function createCallbacks() {
  return {
    onAdvance: vi.fn(),
    onJourneyCard: vi.fn(),
    onComplete: vi.fn(),
  };
}

describe('Waypoint transit flow integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('advances through 3 light waypoints and fires onComplete', () => {
    const callbacks = createCallbacks();
    const waypoints = [
      lightWaypoint('First'),
      lightWaypoint('Second'),
      lightWaypoint('Third'),
    ];
    const tracker = new WaypointTracker(waypoints, callbacks);

    // Advance past waypoint 0
    tracker.advance();
    expect(callbacks.onAdvance).toHaveBeenCalledTimes(1);
    expect(callbacks.onAdvance).toHaveBeenCalledWith(waypoints[1], waypoints[2]);

    // Advance past waypoint 1
    tracker.advance();
    expect(callbacks.onAdvance).toHaveBeenCalledTimes(2);
    expect(callbacks.onAdvance).toHaveBeenCalledWith(waypoints[2], null);

    // Advance past waypoint 2 (last)
    tracker.advance();
    expect(callbacks.onComplete).toHaveBeenCalledOnce();
    expect(tracker.isComplete()).toBe(true);
  });

  it('handles mixed light + journey card waypoints', () => {
    const callbacks = createCallbacks();
    const waypoints = [
      lightWaypoint('Light 1'),
      journeyCardWaypoint('Journey Card'),
      lightWaypoint('Light 2'),
    ];
    const tracker = new WaypointTracker(waypoints, callbacks);

    // Advance past light waypoint 0 — next is a journey card, so auto-advances
    tracker.advance();
    expect(callbacks.onJourneyCard).toHaveBeenCalledOnce();
    expect(callbacks.onJourneyCard.mock.calls[0][0]).toBe(waypoints[1]);

    // Simulate dismiss → should fire onAdvance for the last light waypoint
    const onDismiss = callbacks.onJourneyCard.mock.calls[0][1];
    onDismiss();
    expect(callbacks.onAdvance).toHaveBeenCalledOnce();
    expect(callbacks.onAdvance).toHaveBeenLastCalledWith(waypoints[2], null);

    // Advance past last light waypoint
    tracker.advance();
    expect(callbacks.onComplete).toHaveBeenCalledOnce();
  });

  it('handles multiple consecutive journey card waypoints', () => {
    const callbacks = createCallbacks();
    const waypoints = [
      journeyCardWaypoint('Card 1'),
      journeyCardWaypoint('Card 2'),
      journeyCardWaypoint('Card 3'),
    ];
    const tracker = new WaypointTracker(waypoints, callbacks);

    // First journey card
    tracker.advance();
    expect(callbacks.onJourneyCard).toHaveBeenCalledTimes(1);
    expect(callbacks.onJourneyCard.mock.calls[0][0].text).toBe('Card 1');

    // Dismiss first → auto-advances into second journey card
    callbacks.onJourneyCard.mock.calls[0][1]();
    expect(callbacks.onJourneyCard).toHaveBeenCalledTimes(2);
    expect(callbacks.onJourneyCard.mock.calls[1][0].text).toBe('Card 2');

    // Dismiss second → auto-advances into third journey card
    callbacks.onJourneyCard.mock.calls[1][1]();
    expect(callbacks.onJourneyCard).toHaveBeenCalledTimes(3);
    expect(callbacks.onJourneyCard.mock.calls[2][0].text).toBe('Card 3');

    // Dismiss third → complete
    callbacks.onJourneyCard.mock.calls[2][1]();
    expect(callbacks.onAdvance).not.toHaveBeenCalled();
    expect(callbacks.onComplete).toHaveBeenCalledOnce();
  });

  it('auto-promotes waypoint with content blocks to journey card', () => {
    const callbacks = createCallbacks();
    const waypoints = [
      contentWaypoint('Has content'),
    ];
    const tracker = new WaypointTracker(waypoints, callbacks);

    tracker.advance();
    expect(callbacks.onJourneyCard).toHaveBeenCalledOnce();
    expect(callbacks.onAdvance).not.toHaveBeenCalled();

    // Dismiss → complete (single waypoint)
    callbacks.onJourneyCard.mock.calls[0][1]();
    expect(callbacks.onComplete).toHaveBeenCalledOnce();
  });

  it('handles single waypoint leg', () => {
    const callbacks = createCallbacks();
    const waypoints = [lightWaypoint('Only one')];
    const tracker = new WaypointTracker(waypoints, callbacks);

    expect(tracker.getCurrentWaypoint().text).toBe('Only one');
    expect(tracker.getNextWaypoint()).toBeNull();

    tracker.advance();
    expect(callbacks.onComplete).toHaveBeenCalledOnce();
    expect(tracker.isComplete()).toBe(true);
  });

  it('preserves per-waypoint radius in data model', () => {
    const callbacks = createCallbacks();
    const waypoints = [
      { coords: [52.5, -6.5] as [number, number], text: 'Normal', radius: undefined },
      { coords: [52.51, -6.51] as [number, number], text: 'Custom radius', radius: 25 },
    ];
    const tracker = new WaypointTracker(waypoints, callbacks);

    expect(tracker.getCurrentWaypoint().radius).toBeUndefined();
    tracker.advance();
    expect(tracker.getCurrentWaypoint().radius).toBe(25);
  });

  it('progress tracks correctly through waypoint sequence', () => {
    const callbacks = createCallbacks();
    const waypoints = [
      lightWaypoint('A'),
      lightWaypoint('B'),
      lightWaypoint('C'),
    ];
    const tracker = new WaypointTracker(waypoints, callbacks);

    expect(tracker.getProgress()).toEqual({ current: 0, total: 3 });
    tracker.advance();
    expect(tracker.getProgress()).toEqual({ current: 1, total: 3 });
    tracker.advance();
    expect(tracker.getProgress()).toEqual({ current: 2, total: 3 });
    tracker.advance();
    expect(tracker.getProgress()).toEqual({ current: 3, total: 3 });
  });

  it('getSegmentBounds returns correct from/to for each segment', () => {
    const callbacks = createCallbacks();
    const waypoints = [
      lightWaypoint('A', [52.5, -6.5]),
      lightWaypoint('B', [52.51, -6.51]),
      lightWaypoint('C', [52.52, -6.52]),
    ];
    const tracker = new WaypointTracker(waypoints, callbacks);

    // First waypoint: from is itself (no previous), to is itself
    const bounds0 = tracker.getSegmentBounds();
    expect(bounds0.from).toEqual([52.5, -6.5]);
    expect(bounds0.to).toEqual([52.5, -6.5]);

    tracker.advance();

    // Second waypoint: from is previous waypoint, to is current
    const bounds1 = tracker.getSegmentBounds();
    expect(bounds1.from).toEqual([52.5, -6.5]);
    expect(bounds1.to).toEqual([52.51, -6.51]);
  });

  it('reset returns to beginning and allows replaying', () => {
    const callbacks = createCallbacks();
    const waypoints = [lightWaypoint('A'), lightWaypoint('B')];
    const tracker = new WaypointTracker(waypoints, callbacks);

    tracker.advance();
    tracker.advance();
    expect(tracker.isComplete()).toBe(true);

    tracker.reset();
    expect(tracker.isComplete()).toBe(false);
    expect(tracker.getCurrentWaypoint().text).toBe('A');
    expect(tracker.getProgress()).toEqual({ current: 0, total: 2 });
  });
});
