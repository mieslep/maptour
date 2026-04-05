import type { Waypoint } from '../types';

export class GuidanceBanner {
  private readonly el: HTMLElement;
  private textEl: HTMLElement;
  private photoEl: HTMLImageElement;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'maptour-guidance-banner';
    this.el.hidden = true;

    this.photoEl = document.createElement('img');
    this.photoEl.className = 'maptour-guidance-banner__photo';
    this.photoEl.alt = '';
    this.photoEl.hidden = true;

    this.textEl = document.createElement('div');
    this.textEl.className = 'maptour-guidance-banner__text';

    this.el.appendChild(this.photoEl);
    this.el.appendChild(this.textEl);
  }

  setWaypoint(waypoint: Waypoint): void {
    this.textEl.textContent = waypoint.text;
    if (waypoint.photo) {
      this.photoEl.src = waypoint.photo;
      this.photoEl.hidden = false;
    } else {
      this.photoEl.hidden = true;
      this.photoEl.removeAttribute('src');
    }
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }

  show(): void {
    this.el.hidden = false;
  }

  getElement(): HTMLElement {
    return this.el;
  }
}
