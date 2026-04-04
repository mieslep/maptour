import { t } from '../i18n';

export class OverviewControls {
  private readonly el: HTMLElement;
  private readonly dirToggle: HTMLButtonElement;
  private readonly ctaBtn: HTMLButtonElement;
  private readonly row: HTMLElement;

  private selectedIndex = 0;
  private reversed = false;

  private closeBtn: HTMLButtonElement | null = null;

  private directionCallbacks: Array<(reversed: boolean) => void> = [];
  private beginCallbacks: Array<(index: number, reversed: boolean) => void> = [];
  private closeCallbacks: Array<() => void> = [];

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'maptour-overview-controls';
    this.el.hidden = true;

    // Single row: [direction toggle] [Begin Tour CTA] [optional close]
    this.row = document.createElement('div');
    this.row.className = 'maptour-overview-controls__row';

    // Direction toggle
    this.dirToggle = document.createElement('button');
    this.dirToggle.className = 'maptour-overview-controls__direction';
    this.dirToggle.setAttribute('aria-label', t('change_direction'));
    this.dirToggle.title = t('change_direction');
    this.dirToggle.innerHTML = '<i class="fa-solid fa-rotate" aria-hidden="true"></i>';
    this.dirToggle.addEventListener('click', () => {
      this.reversed = !this.reversed;
      this.directionCallbacks.forEach((cb) => cb(this.reversed));
    });

    // CTA
    this.ctaBtn = document.createElement('button');
    this.ctaBtn.className = 'maptour-overview-controls__cta';
    this.ctaBtn.textContent = t('begin_tour');
    this.ctaBtn.addEventListener('click', () => {
      this.beginCallbacks.forEach((cb) => cb(this.selectedIndex, this.reversed));
    });

    this.row.appendChild(this.dirToggle);
    this.row.appendChild(this.ctaBtn);
    this.el.appendChild(this.row);
  }

  update(selectedIndex: number, _totalStops: number, reversed: boolean, _stopName: string): void {
    this.selectedIndex = selectedIndex;
    this.reversed = reversed;
  }

  /** Add a close button to the right of the CTA (used on mobile map panel). */
  enableCloseButton(): void {
    if (this.closeBtn) return;
    this.closeBtn = document.createElement('button');
    this.closeBtn.className = 'maptour-overview-controls__close';
    this.closeBtn.setAttribute('aria-label', 'Close map');
    this.closeBtn.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    this.closeBtn.addEventListener('click', () => {
      this.closeCallbacks.forEach((cb) => cb());
    });
    this.row.appendChild(this.closeBtn);
  }

  onClose(cb: () => void): void {
    this.closeCallbacks.push(cb);
  }

  onDirectionToggle(cb: (reversed: boolean) => void): void {
    this.directionCallbacks.push(cb);
  }

  onBegin(cb: (index: number, reversed: boolean) => void): void {
    this.beginCallbacks.push(cb);
  }

  show(): void {
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
  }

  getElement(): HTMLElement {
    return this.el;
  }
}
