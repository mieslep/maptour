import type { Stop } from '../types';
import { t } from '../i18n';

export class StopListOverlay {
  private readonly backdrop: HTMLElement;
  private readonly panel: HTMLElement;
  private readonly fab: HTMLElement;
  private selectCallbacks: Array<(index: number) => void> = [];
  private activeIndex = 0;
  private visitedIds: Set<number> = new Set();
  private stops: Stop[] = [];
  private tourOrder: number[] = []; // indices into stops[] in tour traversal order

  constructor(container: HTMLElement) {
    // FAB — floating action button on the map
    this.fab = document.createElement('button');
    this.fab.className = 'maptour-stop-list-fab';
    this.fab.setAttribute('aria-label', 'Show all stops');
    this.fab.innerHTML = '<i class="fa-solid fa-list" aria-hidden="true"></i>';
    this.fab.addEventListener('click', () => this.open());
    container.appendChild(this.fab);

    // Backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'maptour-stop-list-overlay__backdrop';
    this.backdrop.hidden = true;
    this.backdrop.addEventListener('click', () => this.close());
    container.appendChild(this.backdrop);

    // Panel
    this.panel = document.createElement('div');
    this.panel.className = 'maptour-stop-list-overlay';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('aria-label', t('all_stops_title'));
    this.panel.hidden = true;
    container.appendChild(this.panel);
  }

  update(stops: Stop[], activeIndex: number, visitedIds: Set<number>, tourOrder?: number[]): void {
    this.stops = stops;
    this.activeIndex = activeIndex;
    this.visitedIds = visitedIds;
    this.tourOrder = tourOrder ?? stops.map((_, i) => i);
    if (!this.panel.hidden) this.renderList();
  }

  onSelect(cb: (index: number) => void): void {
    this.selectCallbacks.push(cb);
  }

  open(): void {
    this.renderList();
    this.backdrop.hidden = false;
    this.panel.hidden = false;
    // Focus the active stop item for accessibility
    requestAnimationFrame(() => {
      const active = this.panel.querySelector<HTMLElement>('.maptour-stop-list__item--active');
      active?.focus();
    });
  }

  close(): void {
    this.backdrop.hidden = true;
    this.panel.hidden = true;
    this.fab.focus();
  }

  private renderList(): void {
    this.panel.innerHTML = '';

    const heading = document.createElement('div');
    heading.className = 'maptour-stop-list-overlay__header';

    const title = document.createElement('h2');
    title.className = 'maptour-stop-list-overlay__title';
    title.textContent = t('all_stops_title');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'maptour-stop-list-overlay__close';
    closeBtn.setAttribute('aria-label', 'Close stop list');
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close());

    heading.appendChild(title);
    heading.appendChild(closeBtn);

    const list = document.createElement('ul');
    list.className = 'maptour-stop-list';
    list.setAttribute('role', 'list');
    list.setAttribute('aria-label', 'Tour stops');

    this.tourOrder.forEach((stopIndex, displayPosition) => {
      const stop = this.stops[stopIndex];
      const item = document.createElement('button');
      item.className = 'maptour-stop-list__item';
      item.setAttribute('role', 'listitem');
      item.setAttribute('aria-label', `Stop ${displayPosition + 1}: ${stop.title}`);
      if (stopIndex === this.activeIndex) {
        item.classList.add('maptour-stop-list__item--active');
        item.setAttribute('aria-current', 'true');
      }
      if (this.visitedIds.has(stop.id)) {
        item.classList.add('maptour-stop-list__item--visited');
      }

      const number = document.createElement('span');
      number.className = 'maptour-stop-list__number';
      number.setAttribute('aria-hidden', 'true');
      number.textContent = String(stopIndex + 1);

      const titleEl = document.createElement('span');
      titleEl.className = 'maptour-stop-list__title';
      titleEl.textContent = stop.title;

      item.appendChild(number);
      item.appendChild(titleEl);
      item.addEventListener('click', () => {
        this.close();
        this.selectCallbacks.forEach((cb) => cb(stopIndex));
      });

      list.appendChild(item);
    });

    this.panel.appendChild(heading);
    this.panel.appendChild(list);
  }
}
