import type { Tour, Stop } from '../types';
import type { TourSession } from '../session/TourSession';

export interface NavControllerCallbacks {
  onNavigate?: (stop: Stop, index: number) => void;
  onJourneyStart?: (destinationStop: Stop, destinationIndex: number) => void;
  onJourneyEnd?: () => void;
  onTourEnd?: () => void;
}

export class NavController {
  private tour: Tour;
  private session: TourSession;
  private currentIndex: number;
  private inJourney = false;
  private journeyDestIndex = -1;
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

    this.clearJourney();
    this.currentIndex = index;
    this.session.setCurrentStop(index);
    const stop = this.currentStop;
    this.callbacks.onNavigate?.(stop, index);
  }

  next(): void {
    // If in a journey, "next" skips to the destination stop
    if (this.inJourney) {
      this.goTo(this.journeyDestIndex);
      return;
    }

    this.session.markVisited(this.currentStop.id);

    if (this.isLastTourStop(this.currentIndex)) {
      this.callbacks.onTourEnd?.();
      return;
    }

    const nextIndex = this.session.reversed
      ? (this.currentIndex - 1 + this.tour.stops.length) % this.tour.stops.length
      : (this.currentIndex + 1) % this.tour.stops.length;
    const nextStop = this.tour.stops[nextIndex];

    // Journey content sourcing: for the segment between stops A and B (A < B),
    // always use stops[B].getting_here.journey regardless of direction.
    const journeySourceStop = this.session.reversed
      ? this.tour.stops[this.currentIndex]  // current is the higher-numbered stop
      : nextStop;                           // destination is the higher-numbered stop

    if (journeySourceStop.getting_here?.journey && journeySourceStop.getting_here.journey.length > 0) {
      this.inJourney = true;
      this.journeyDestIndex = nextIndex;
      this.callbacks.onJourneyStart?.(journeySourceStop, nextIndex);
    } else {
      this.goTo(nextIndex);
    }
  }

  prev(): void {
    // If in a journey, go back to the origin stop
    if (this.inJourney) {
      this.goTo(this.currentIndex);
      return;
    }
    // Don't go before the starting stop
    if (this.currentIndex === this.session.startIndex) return;
    // In reverse mode, "prev" goes toward higher indices (back toward original last stop)
    const prevIndex = this.session.reversed
      ? (this.currentIndex + 1) % this.tour.stops.length
      : (this.currentIndex - 1 + this.tour.stops.length) % this.tour.stops.length;
    this.goTo(prevIndex);
  }

  /** Navigate back to the starting stop from the last stop. */
  returnToStart(): void {
    this.returningToStart = true;
    const startStop = this.tour.stops[this.session.startIndex];

    // Show journey card if the start stop has journey content
    if (startStop.getting_here?.journey && startStop.getting_here.journey.length > 0) {
      this.inJourney = true;
      this.journeyDestIndex = this.session.startIndex;
      this.callbacks.onJourneyStart?.(startStop, this.session.startIndex);
    } else {
      this.goTo(this.session.startIndex);
    }
  }

  /** Called by the orchestrator when the journey "I've arrived" button is pressed. */
  completeJourney(): void {
    if (!this.inJourney) return;
    const destIndex = this.journeyDestIndex;
    this.clearJourney();
    this.callbacks.onJourneyEnd?.();
    this.goTo(destIndex);
  }

  private clearJourney(): void {
    if (this.inJourney) {
      this.inJourney = false;
      this.journeyDestIndex = -1;
    }
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

  isInJourney(): boolean {
    return this.inJourney;
  }
}
