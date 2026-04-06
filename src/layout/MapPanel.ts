import { t } from '../i18n';
import type { Stop, LegMode } from '../types';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export class MapPanel {
  private readonly panel: HTMLElement;
  private readonly fab: HTMLButtonElement;
  private open = false;
  private toggleCallbacks: Array<(open: boolean) => void> = [];

  constructor(container: HTMLElement, mapPane: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.className = 'maptour-map-panel';

    this.panel.appendChild(mapPane);
    container.appendChild(this.panel);

    // FAB — toggles between map icon and close icon
    this.fab = document.createElement('button');
    this.fab.className = 'maptour-map-open-btn';
    this.fab.innerHTML = '<i class="fa-solid fa-map" aria-hidden="true"></i>';
    this.fab.setAttribute('aria-label', t('show_map'));
    this.fab.title = t('show_map');
    this.fab.addEventListener('click', () => this.toggle());

    this.panel.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'transform') {
        this.toggleCallbacks.forEach((cb) => cb(this.open));
      }
    });
  }

  getOpenButton(): HTMLButtonElement {
    return this.fab;
  }

  /** Keep for API compat — no longer renders nav button. */
  setActiveStop(_stop: Stop, _tourNavMode?: LegMode): void {}

  toggle(): void {
    if (this.open) this.hide(); else this.show();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.panel.classList.add('maptour-map-panel--open');
    this.fab.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    this.fab.setAttribute('aria-label', t('show_stop'));
    this.fab.title = t('show_stop');
    this.fab.classList.add('maptour-map-open-btn--close');
    if (this.prefersReducedMotion()) {
      this.toggleCallbacks.forEach((cb) => cb(this.open));
    }
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove('maptour-map-panel--open');
    this.fab.innerHTML = '<i class="fa-solid fa-map" aria-hidden="true"></i>';
    this.fab.setAttribute('aria-label', t('show_map'));
    this.fab.title = t('show_map');
    this.fab.classList.remove('maptour-map-open-btn--close');
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

  /** Hide or show the FAB. */
  setHeaderVisible(visible: boolean): void {
    this.fab.hidden = !visible;
    this.panel.classList.toggle('maptour-map-panel--full-height', !visible);
  }

  getElement(): HTMLElement {
    return this.panel;
  }

  destroy(): void {
    this.panel.remove();
    this.fab.remove();
  }
}
