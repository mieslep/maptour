import type { Tour, Stop } from '../types';
import type { MapView } from '../map/MapView';
import type { StopCard } from '../card/StopCard';
import type { Breadcrumb } from '../breadcrumb/Breadcrumb';

export interface NavControllerCallbacks {
  onStopChange?: (stop: Stop, index: number) => void;
  /** Called when the user taps Next on the final stop. */
  onNextFromLast?: () => void;
}

export class NavController {
  private tour: Tour;
  private currentIndex: number;
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

    this.currentIndex = index;
    const stop = this.currentStop;

    this.mapView.setActiveStop(stop);
    this.stopCard.update(stop, index + 1, this.tour.stops.length);
    this.mapView.setVisitedStops(this.breadcrumb.getVisited());
    this.updateNavButtons();
    this.updateStopList();
    this.callbacks.onStopChange?.(stop, index);
  }

  next(): void {
    if (this.currentIndex < this.tour.stops.length - 1) {
      this.breadcrumb.markVisited(this.currentStop.id);
      this.goTo(this.currentIndex + 1);
    } else {
      // Final stop — fire callback for tour_complete transition
      this.callbacks.onNextFromLast?.();
    }
  }

  prev(): void {
    if (this.currentIndex > 0) {
      this.goTo(this.currentIndex - 1);
    }
  }

  getCurrentIndex(): number {
    return this.currentIndex;
  }

  getCurrentStop(): Stop {
    return this.currentStop;
  }
}
