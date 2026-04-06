import type { Tour, Stop } from '../types';
import type { TourSession } from '../session/TourSession';

export interface NavControllerCallbacks {
  onNavigate?: (stop: Stop, index: number) => void;
  onTourEnd?: () => void;
}

export class NavController {
  private tour: Tour;
  private session: TourSession;
  private currentIndex: number;
  private returningToStart = false;
  private callbacks: NavControllerCallbacks;

  constructor(
    tour: Tour,
    session: TourSession,
    callbacks: NavControllerCallbacks = {}
  ) {
    this.tour = tour;
    this.session = session;
    this.currentIndex = 0;
    this.callbacks = callbacks;
  }

  private get currentStop(): Stop {
    return this.tour.stops[this.currentIndex];
  }

  /** True if advancing from this stop would return to the starting stop (tour complete). */
  private isLastTourStop(index: number): boolean {
    if (this.returningToStart && index === this.session.startIndex) return true;
    if (this.session.reversed) {
      const prevInSequence = (index - 1 + this.tour.stops.length) % this.tour.stops.length;
      return prevInSequence === this.session.startIndex;
    }
    const nextInSequence = (index + 1) % this.tour.stops.length;
    return nextInSequence === this.session.startIndex;
  }

  /** Get the next stop in sequence (forward or reverse), or undefined if this is the last tour stop. */
  getNextStop(index: number): Stop | undefined {
    if (this.isLastTourStop(index)) return undefined;
    if (this.session.reversed) {
      return this.tour.stops[(index - 1 + this.tour.stops.length) % this.tour.stops.length];
    }
    return this.tour.stops[(index + 1) % this.tour.stops.length];
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.tour.stops.length) return;

    this.currentIndex = index;
    this.session.setCurrentStop(index);
    this.callbacks.onNavigate?.(this.currentStop, index);
  }

  next(): void {
    this.session.markVisited(this.currentStop.id);

    if (this.isLastTourStop(this.currentIndex)) {
      this.callbacks.onTourEnd?.();
      return;
    }

    const nextIndex = this.session.reversed
      ? (this.currentIndex - 1 + this.tour.stops.length) % this.tour.stops.length
      : (this.currentIndex + 1) % this.tour.stops.length;

    this.goTo(nextIndex);
  }

  prev(): void {
    // Don't go before the starting stop
    if (this.currentIndex === this.session.startIndex) return;
    const prevIndex = this.session.reversed
      ? (this.currentIndex + 1) % this.tour.stops.length
      : (this.currentIndex - 1 + this.tour.stops.length) % this.tour.stops.length;
    this.goTo(prevIndex);
  }

  /** Navigate back to the starting stop from the last stop. */
  returnToStart(): void {
    this.session.markVisited(this.currentStop.id);
    this.returningToStart = true;
    this.goTo(this.session.startIndex);
  }

  /** Reset returning-to-start flag (called when starting a new tour). */
  resetReturnState(): void {
    this.returningToStart = false;
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentStop(): Stop {
    return this.currentStop;
  }
}
