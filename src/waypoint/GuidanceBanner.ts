import type { Waypoint } from '../types';
import { replaceDotShortcode } from '../util/markedExtensions';

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
    this.photoEl.addEventListener('click', () => this.showPhotoModal());

    this.textEl = document.createElement('div');
    this.textEl.className = 'maptour-guidance-banner__text';

    this.el.appendChild(this.photoEl);
    this.el.appendChild(this.textEl);
  }

  setWaypoint(waypoint: Waypoint): void {
    this.textEl.innerHTML = replaceDotShortcode(waypoint.text);
    if (waypoint.photo) {
      this.photoEl.src = waypoint.photo;
      // Strip {dot} shortcodes from alt text — assistive tech doesn't need
      // a "waypoint marker" injection in the photo description.
      this.photoEl.alt = (waypoint.photo_alt || waypoint.text).replace(/\{dot\}/g, '').replace(/\s+/g, ' ').trim();
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

  private showPhotoModal(): void {
    const src = this.photoEl.src;
    if (!src) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'maptour-photo-modal';

    const img = document.createElement('img');
    img.className = 'maptour-photo-modal__img';
    img.src = src;
    img.alt = this.photoEl.alt;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'maptour-photo-modal__close';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    closeBtn.setAttribute('aria-label', 'Close photo');

    const close = () => backdrop.remove();
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });

    backdrop.appendChild(img);
    backdrop.appendChild(closeBtn);

    const container = this.el.closest('.maptour-container') ?? document.body;
    container.appendChild(backdrop);
  }
}
