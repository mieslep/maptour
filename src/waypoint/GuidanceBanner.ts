import type { Waypoint } from '../types';
import { t } from '../i18n';

export class GuidanceBanner {
  private readonly el: HTMLElement;
  private textEl: HTMLElement;
  private photoEl: HTMLImageElement;
  private actionBtn: HTMLButtonElement;
  private actionCallback: (() => void) | null = null;

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

    this.actionBtn = document.createElement('button');
    this.actionBtn.className = 'maptour-guidance-banner__action';
    this.actionBtn.textContent = t('im_here');
    this.actionBtn.addEventListener('click', () => this.actionCallback?.());

    this.el.appendChild(this.photoEl);
    this.el.appendChild(this.textEl);
    this.el.appendChild(this.actionBtn);
  }

  setWaypoint(waypoint: Waypoint): void {
    this.textEl.textContent = waypoint.text;
    if (waypoint.photo) {
      this.photoEl.src = waypoint.photo;
      this.photoEl.alt = waypoint.text;
      this.photoEl.hidden = false;
    } else {
      this.photoEl.hidden = true;
      this.photoEl.removeAttribute('src');
    }
    this.el.hidden = false;
  }

  /** Set the callback for the action button. */
  onAction(cb: () => void): void {
    this.actionCallback = cb;
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
