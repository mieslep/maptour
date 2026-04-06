import { t } from '../i18n';
import type { Stop, LegMode } from '../types';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export class MapPanel {
  private readonly panel: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly openBtn: HTMLButtonElement;
  private open = false;
  private toggleCallbacks: Array<(open: boolean) => void> = [];

  constructor(container: HTMLElement, mapPane: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.className = 'maptour-map-panel';

    // Close button — floats inside the map panel, top-right
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'maptour-map-panel__close';
    this.closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    this.closeBtn.setAttribute('aria-label', t('show_stop'));
    this.closeBtn.addEventListener('click', () => this.hide());

    this.panel.appendChild(this.closeBtn);
    this.panel.appendChild(mapPane);

    container.appendChild(this.panel);

    // Open button — floating FAB, positioned by CSS
    this.openBtn = document.createElement('button');
    this.openBtn.className = 'maptour-map-open-btn';
    this.openBtn.innerHTML = '<i class="fa-solid fa-map" aria-hidden="true"></i>';
    this.openBtn.setAttribute('aria-label', t('show_map'));
    this.openBtn.title = t('show_map');
    this.openBtn.addEventListener('click', () => this.show());

    this.panel.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'transform') {
        this.toggleCallbacks.forEach((cb) => cb(this.open));
      }
    });
  }

  getOpenButton(): HTMLButtonElement {
    return this.openBtn;
  }

  /** Keep for API compat — no longer renders nav button. */
  setActiveStop(_stop: Stop, _tourNavMode?: LegMode): void {
    // Nav button removed from map panel header
  }

  toggle(): void {
    if (this.open) this.hide(); else this.show();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.panel.classList.add('maptour-map-panel--open');
    this.closeBtn.hidden = false;
    if (this.prefersReducedMotion()) {
      this.toggleCallbacks.forEach((cb) => cb(this.open));
    }
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove('maptour-map-panel--open');
    if (this.prefersReducedMotion()) {
      this.toggleCallbacks.forEach((cb) => cb(this.open));
    }
  }

  isOpen(): boolean { return this.open; }

  onToggle(cb: (open: boolean) => void): void {
    this.toggleCallbacks.push(cb);
  }

  private prefersReducedMotion(): boolean {
    return typeof window?.matchMedia === 'function'
      && window.matchMedia(REDUCED_MOTION_QUERY).matches;
  }

  /** Show or hide the close button. Hidden during waypoint transit (no manual close). */
  setHeaderVisible(visible: boolean): void {
    this.closeBtn.hidden = !visible;
    this.panel.classList.toggle('maptour-map-panel--full-height', !visible);
  }

  getElement(): HTMLElement {
    return this.panel;
  }

  destroy(): void {
    this.panel.remove();
    this.openBtn.remove();
  }
}
