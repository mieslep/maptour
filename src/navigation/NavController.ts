import type { Tour, Stop } from '../types';
import type { MapView } from '../map/MapView';
import type { StopCard } from '../card/StopCard';
import type { Breadcrumb } from '../breadcrumb/Breadcrumb';

export interface NavControllerCallbacks {
  onStopChange?: (stop: Stop, index: number) => void;
  /** Called when the user taps Next on the final stop. */
  onNextFromLast?: () => void;
  /** Called when a journey card is shown/hidden. */
  onJourneyChange?: (inJourney: boolean) => void;
}

export class NavController {
  private tour: Tour;
  private currentIndex: number;
  private startIndex = 0;
  private reversed = false;
  private inJourney = false;
  private journeyDestIndex = -1;
  private returningToStart = false;
  private mapView: MapView;
  private stopCard: StopCard;
  private breadcrumb: Breadcrumb;
  private navContainer: HTMLElement;
  private stopListContainer: HTMLElement;
  private callbacks: NavControllerCallbacks;

  constructor(
    tour: Tour,
    mapView: MapView,
    stopCard: StopCard,
    breadcrumb: Breadcrumb,
    navContainer: HTMLElement,
    stopListContainer: HTMLElement,
    callbacks: NavControllerCallbacks = {}
  ) {
    this.tour = tour;
    this.currentIndex = 0;
    this.mapView = mapView;
    this.stopCard = stopCard;
    this.breadcrumb = breadcrumb;
    this.navContainer = navContainer;
    this.stopListContainer = stopListContainer;
    this.callbacks = callbacks;

    this.renderNav();
    this.renderStopList();
    this.goTo(0);
  }

  private get currentStop(): Stop {
    return this.tour.stops[this.currentIndex];
  }

  /** Set the starting stop index for circular tour navigation. */
  setStartIndex(index: number): void {
    this.startIndex = index;
    this.returningToStart = false;
  }

  /** Set reversed navigation mode. */
  setReversed(reversed: boolean): void {
    this.reversed = reversed;
  }

  /** Navigate back to the starting stop from the last stop. */
  returnToStart(): void {
    this.returningToStart = true;
    // Disable the return-to-start callback so the start stop shows "Finish Tour" not the two-button choice
    this.stopCard.onReturnToStart(null);

    const startStop = this.tour.stops[this.startIndex];

    // Show journey card if the start stop has journey content
    if (startStop.getting_here?.journey && startStop.getting_here.journey.length > 0) {
      this.inJourney = true;
      this.journeyDestIndex = this.startIndex;
      this.stopCard.renderJourney(startStop, () => {
        this.stopCard.setSuppressGettingHereNote(true);
        this.goTo(this.startIndex);
      });
      this.callbacks.onJourneyChange?.(true);
    } else {
      this.goTo(this.startIndex);
    }
  }

  /** True if advancing from this stop would return to the starting stop (tour complete). */
  private isLastTourStop(index: number): boolean {
    // When returning to start, the start stop is the last stop
    if (this.returningToStart && index === this.startIndex) return true;
    if (this.reversed) {
      const prevInSequence = (index - 1 + this.tour.stops.length) % this.tour.stops.length;
      return prevInSequence === this.startIndex;
    }
    const nextInSequence = (index + 1) % this.tour.stops.length;
    return nextInSequence === this.startIndex;
  }

  /** Get the next stop in sequence (forward or reverse), or undefined if this is the last tour stop. */
  private getNextStop(index: number): Stop | undefined {
    if (this.isLastTourStop(index)) return undefined;
    if (this.reversed) {
      return this.tour.stops[(index - 1 + this.tour.stops.length) % this.tour.stops.length];
    }
    return this.tour.stops[(index + 1) % this.tour.stops.length];
  }

  private renderNav(): void {
    this.navContainer.innerHTML = '';
    this.navContainer.className = 'maptour-nav';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'maptour-nav__prev';
    prevBtn.id = 'maptour-prev';
    prevBtn.setAttribute('aria-label', 'Previous stop');
    prevBtn.textContent = '← Prev';
    prevBtn.addEventListener('click', () => this.prev());

    const nextBtn = document.createElement('button');
    nextBtn.className = 'maptour-nav__next';
    nextBtn.id = 'maptour-next';
    nextBtn.setAttribute('aria-label', 'Next stop');
    nextBtn.textContent = 'Next →';
    nextBtn.addEventListener('click', () => this.next());

    this.navContainer.appendChild(prevBtn);
    this.navContainer.appendChild(nextBtn);
  }

  private renderStopList(): void {
    this.stopListContainer.innerHTML = '';
    this.stopListContainer.className = 'maptour-stop-list';
    this.stopListContainer.setAttribute('role', 'list');
    this.stopListContainer.setAttribute('aria-label', 'Tour stops');

    this.tour.stops.forEach((stop, index) => {
      const item = document.createElement('button');
      item.className = 'maptour-stop-list__item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', `Go to stop ${index + 1}: ${stop.title}`);
      item.dataset.stopId = String(stop.id);
      item.dataset.stopIndex = String(index);

      const number = document.createElement('span');
      number.className = 'maptour-stop-list__number';
      number.textContent = String(index + 1);
      number.setAttribute('aria-hidden', 'true');

      const title = document.createElement('span');
      title.className = 'maptour-stop-list__title';
      title.textContent = stop.title;

      item.appendChild(number);
      item.appendChild(title);
      item.addEventListener('click', () => this.goTo(index));

      this.stopListContainer.appendChild(item);
    });
  }

  private updateStopList(): void {
    const items = this.stopListContainer.querySelectorAll<HTMLElement>('.maptour-stop-list__item');
    const visited = this.breadcrumb.getVisited();

    items.forEach((item, index) => {
      item.classList.toggle('maptour-stop-list__item--active', index === this.currentIndex);
      item.classList.toggle('maptour-stop-list__item--visited', visited.has(this.tour.stops[index].id));
      item.setAttribute('aria-current', index === this.currentIndex ? 'true' : 'false');
    });
  }

  private updateNavButtons(): void {
    const prevBtn = this.navContainer.querySelector<HTMLButtonElement>('#maptour-prev');
    const nextBtn = this.navContainer.querySelector<HTMLButtonElement>('#maptour-next');

    if (prevBtn) {
      prevBtn.disabled = this.currentIndex === 0;
      prevBtn.setAttribute('aria-disabled', String(this.currentIndex === 0));
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentIndex === this.tour.stops.length - 1;
      nextBtn.setAttribute('aria-disabled', String(this.currentIndex === this.tour.stops.length - 1));
    }
  }

  goTo(index: number): void {
    if (index < 0 || index >= this.tour.stops.length) return;

    this.clearJourney();
    this.currentIndex = index;
    const stop = this.currentStop;
    const nextStop = this.getNextStop(index);

    this.mapView.setActiveStop(stop);
    this.stopCard.update(stop, index + 1, this.tour.stops.length, nextStop);
    // Clear suppress flag after rendering so it only applies once (after journey completion)
    this.stopCard.setSuppressGettingHereNote(false);
    this.mapView.setVisitedStops(this.breadcrumb.getVisited());
    this.updateNavButtons();
    this.updateStopList();
    this.callbacks.onStopChange?.(stop, index);
  }

  next(): void {
    // If in a journey, "next" skips to the destination stop
    if (this.inJourney) {
      this.goTo(this.journeyDestIndex);
      return;
    }

    this.breadcrumb.markVisited(this.currentStop.id);

    if (this.isLastTourStop(this.currentIndex)) {
      this.callbacks.onNextFromLast?.();
      return;
    }

    const nextIndex = this.reversed
      ? (this.currentIndex - 1 + this.tour.stops.length) % this.tour.stops.length
      : (this.currentIndex + 1) % this.tour.stops.length;
    const nextStop = this.tour.stops[nextIndex];

    // Journey content sourcing: for the segment between stops A and B (A < B),
    // always use stops[B].getting_here.journey regardless of direction.
    const journeySourceStop = this.reversed
      ? this.tour.stops[this.currentIndex]  // current is the higher-numbered stop
      : nextStop;                           // destination is the higher-numbered stop

    if (journeySourceStop.getting_here?.journey && journeySourceStop.getting_here.journey.length > 0) {
      this.inJourney = true;
      this.journeyDestIndex = nextIndex;
      this.stopCard.renderJourney(journeySourceStop, () => {
        // "I've arrived" — advance to the destination stop, hiding redundant getting_here note
        this.stopCard.setSuppressGettingHereNote(true);
        this.goTo(nextIndex);
      });
      this.callbacks.onJourneyChange?.(true);
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
    if (this.currentIndex === this.startIndex) return;
    // In reverse mode, "prev" goes toward higher indices (back toward original last stop)
    const prevIndex = this.reversed
      ? (this.currentIndex + 1) % this.tour.stops.length
      : (this.currentIndex - 1 + this.tour.stops.length) % this.tour.stops.length;
    this.goTo(prevIndex);
  }

  private clearJourney(): void {
    if (this.inJourney) {
      this.inJourney = false;
      this.journeyDestIndex = -1;
      this.callbacks.onJourneyChange?.(false);
    }
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentStop(): Stop {
    return this.currentStop;
  }
}
