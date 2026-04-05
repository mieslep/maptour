import type { Waypoint } from '../types';

export interface WaypointCallbacks {
  onAdvance: (waypoint: Waypoint, nextWaypoint: Waypoint | null) => void;
  onJourneyCard: (waypoint: Waypoint, onDismiss: () => void) => void;
  onComplete: () => void;
}

export class WaypointTracker {
  private waypoints: Waypoint[];
  private currentIndex: number = 0;
  private callbacks: WaypointCallbacks;

  constructor(waypoints: Waypoint[], callbacks: WaypointCallbacks) {
    this.waypoints = waypoints;
    this.callbacks = callbacks;
  }

  getCurrentWaypoint(): Waypoint {
    return this.waypoints[this.currentIndex];
  }

  getNextWaypoint(): Waypoint | null {
    return this.currentIndex < this.waypoints.length - 1
      ? this.waypoints[this.currentIndex + 1]
      : null;
  }

  getSegmentBounds(): { from: [number, number]; to: [number, number] } {
    // 'from' is current waypoint coords (or would be previous position for first)
    // 'to' is the current target waypoint coords
    const current = this.waypoints[this.currentIndex];
    const prev = this.currentIndex > 0 ? this.waypoints[this.currentIndex - 1] : null;
    return {
      from: prev ? prev.coords : current.coords,
      to: current.coords,
    };
  }

  /** Advance past the current waypoint. */
  advance(): void {
    if (this.currentIndex >= this.waypoints.length) return;

    const current = this.waypoints[this.currentIndex];
    const isJourneyCard = current.journey_card === true ||
                          (current.content !== undefined && current.content.length > 0);

    this.currentIndex++;

    if (isJourneyCard) {
      this.callbacks.onJourneyCard(current, () => {
        this.afterAdvance();
      });
    } else {
      this.afterAdvance();
    }
  }

  private afterAdvance(): void {
    if (this.currentIndex >= this.waypoints.length) {
      this.callbacks.onComplete();
    } else {
      const next = this.waypoints[this.currentIndex];
      const nextNext = this.currentIndex < this.waypoints.length - 1
        ? this.waypoints[this.currentIndex + 1]
        : null;
      this.callbacks.onAdvance(next, nextNext);
    }
  }

  isComplete(): boolean {
    return this.currentIndex >= this.waypoints.length;
  }

  reset(): void {
    this.currentIndex = 0;
  }

  getProgress(): { current: number; total: number } {
    return { current: this.currentIndex, total: this.waypoints.length };
  }
}
