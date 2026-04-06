import { t } from '../i18n';
import type { Stop, LegMode } from '../types';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

type FabMode = 'map' | 'close' | 'im-here';

export class MapPanel {
  private readonly panel: HTMLElement;
  private readonly fab: HTMLButtonElement;
  private open = false;
  private fabMode: FabMode = 'map';
  private imHereCallback: (() => void) | null = null;
  private toggleCallbacks: Array<(open: boolean) => void> = [];

  constructor(container: HTMLElement, mapPane: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.className = 'maptour-map-panel';

    this.panel.appendChild(mapPane);
    container.appendChild(this.panel);

    // Single FAB — changes role based on context
    this.fab = document.createElement('button');
    this.fab.className = 'maptour-map-open-btn';
    this.fab.innerHTML = '<i class="fa-solid fa-map" aria-hidden="true"></i>';
    this.fab.setAttribute('aria-label', t('show_map'));
    this.fab.title = t('show_map');
    this.fab.addEventListener('click', () => this.onFabClick());

    this.panel.addEventListener('transitionend', (e) => {
      if (e.propertyName === 'transform') {
        this.toggleCallbacks.forEach((cb) => cb(this.open));
      }
    });
  }

  private onFabClick(): void {
    if (this.fabMode === 'im-here') {
      this.imHereCallback?.();
    } else {
      this.toggle();
    }
  }

  private updateFab(): void {
    this.fab.classList.remove('maptour-map-open-btn--close', 'maptour-map-open-btn--im-here');
    if (this.fabMode === 'close') {
      this.fab.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
      this.fab.setAttribute('aria-label', t('show_stop'));
      this.fab.title = t('show_stop');
      this.fab.classList.add('maptour-map-open-btn--close');
    } else if (this.fabMode === 'im-here') {
      this.fab.textContent = t('im_here');
      this.fab.setAttribute('aria-label', t('im_here'));
      this.fab.title = '';
      this.fab.classList.add('maptour-map-open-btn--im-here');
    } else {
      this.fab.innerHTML = '<i class="fa-solid fa-map" aria-hidden="true"></i>';
      this.fab.setAttribute('aria-label', t('show_map'));
      this.fab.title = t('show_map');
    }
  }

  getOpenButton(): HTMLButtonElement {
    return this.fab;
  }

  /** Keep for API compat — no longer renders nav button. */
  setActiveStop(_stop: Stop, _tourNavMode?: LegMode): void {
    // Nav button removed from map panel
  }

  toggle(): void {
    if (this.open) this.hide(); else this.show();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.panel.classList.add('maptour-map-panel--open');
    this.fabMode = 'close';
    this.updateFab();
    if (this.prefersReducedMotion()) {
      this.toggleCallbacks.forEach((cb) => cb(this.open));
    }
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove('maptour-map-panel--open');
    this.fabMode = 'map';
    this.imHereCallback = null;
    this.updateFab();
    if (this.prefersReducedMotion()) {
      this.toggleCallbacks.forEach((cb) => cb(this.open));
    }
  }

  /** Enter "I'm here" mode — FAB becomes the waypoint advance button. */
  enterImHereMode(onImHere: () => void): void {
    this.imHereCallback = onImHere;
    this.fabMode = 'im-here';
    this.fab.hidden = false;
    this.updateFab();
  }

  /** Exit "I'm here" mode — restore normal FAB behaviour. */
  exitImHereMode(): void {
    this.imHereCallback = null;
    if (this.open) {
      this.fabMode = 'close';
    } else {
      this.fabMode = 'map';
    }
    this.updateFab();
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
