import { t } from '../i18n';
import type { Stop, LegMode } from '../types';
import { NavButton } from '../card/NavButton';
import { NavAppPreference } from '../navigation/NavAppPreference';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export class MapPanel {
  private readonly panel: HTMLElement;
  private readonly header: HTMLElement;
  private readonly headerNav: HTMLElement;
  private readonly closeBtn: HTMLButtonElement;
  private readonly openBtn: HTMLButtonElement;
  private readonly navPreference: NavAppPreference;
  private open = false;
  private toggleCallbacks: Array<(open: boolean) => void> = [];
  private currentStop: Stop | null = null;
  private tourNavMode: LegMode | undefined;

  constructor(container: HTMLElement, mapPane: HTMLElement) {
    this.panel = document.createElement('div');
    this.panel.className = 'maptour-map-panel';

    // Header bar — directions button + close
    this.header = document.createElement('div');
    this.header.className = 'maptour-map-panel__header';

    this.headerNav = document.createElement('div');
    this.headerNav.className = 'maptour-map-panel__header-nav';

    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'maptour-map-panel__close';
    this.closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    this.closeBtn.setAttribute('aria-label', t('show_stop'));
    this.closeBtn.addEventListener('click', () => this.hide());

    this.header.appendChild(this.headerNav);
    this.header.appendChild(this.closeBtn);

    this.panel.appendChild(this.header);
    this.panel.appendChild(mapPane);

    container.appendChild(this.panel);

    this.navPreference = new NavAppPreference();

    // Open button — placed in the card header by the caller
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

  setActiveStop(stop: Stop, tourNavMode?: LegMode): void {
    this.currentStop = stop;
    this.tourNavMode = tourNavMode;
    this.renderHeader();
  }

  private renderHeader(): void {
    this.headerNav.innerHTML = '';
    if (!this.currentStop) return;

    const navBtnContainer = document.createElement('div');
    navBtnContainer.className = 'maptour-map-panel__nav-btn';
    new NavButton(
      navBtnContainer,
      this.currentStop,
      this.navPreference,
      undefined,
      this.tourNavMode,
      'full',
    );
    this.headerNav.appendChild(navBtnContainer);
  }

  toggle(): void {
    if (this.open) this.hide(); else this.show();
  }

  show(): void {
    if (this.open) return;
    this.open = true;
    this.panel.classList.add('maptour-map-panel--open');
    if (this.prefersReducedMotion()) {
      this.toggleCallbacks.forEach((cb) => cb(this.open));
    }
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.panel.classList.remove('maptour-map-panel--open');
    // Reset the nav button so the picker is dismissed
    this.renderHeader();
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

  getElement(): HTMLElement {
    return this.panel;
  }

  destroy(): void {
    this.panel.remove();
    this.openBtn.remove();
  }
}
