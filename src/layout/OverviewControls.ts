import { t } from '../i18n';

export class OverviewControls {
  private readonly el: HTMLElement;
  private readonly track: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly prevBtn: HTMLButtonElement;
  private readonly nextBtn: HTMLButtonElement;
  private readonly dirToggle: HTMLButtonElement;
  private readonly ctaBtn: HTMLButtonElement;

  private selectedIndex = 0;
  private totalStops = 0;
  private reversed = false;

  private stopSelectCallbacks: Array<(index: number) => void> = [];
  private directionCallbacks: Array<(reversed: boolean) => void> = [];
  private beginCallbacks: Array<(index: number, reversed: boolean) => void> = [];

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'maptour-overview-controls';
    this.el.hidden = true;

    // Top row: picker + direction toggle
    const topRow = document.createElement('div');
    topRow.className = 'maptour-overview-controls__top';

    // Prev arrow
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'maptour-overview-controls__arrow';
    this.prevBtn.setAttribute('aria-label', 'Previous stop');
    this.prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';
    this.prevBtn.addEventListener('click', () => this.cycleStop(-1));

    // Track
    this.track = document.createElement('div');
    this.track.className = 'maptour-overview-controls__track';

    this.fill = document.createElement('div');
    this.fill.className = 'maptour-overview-controls__fill';
    this.track.appendChild(this.fill);

    // Next arrow
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'maptour-overview-controls__arrow';
    this.nextBtn.setAttribute('aria-label', 'Next stop');
    this.nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
    this.nextBtn.addEventListener('click', () => this.cycleStop(1));

    // Direction toggle
    this.dirToggle = document.createElement('button');
    this.dirToggle.className = 'maptour-overview-controls__direction';
    this.dirToggle.setAttribute('aria-label', t('toggle_direction'));
    this.dirToggle.innerHTML = '<i class="fa-solid fa-rotate" aria-hidden="true"></i>';
    this.dirToggle.addEventListener('click', () => {
      this.reversed = !this.reversed;
      this.directionCallbacks.forEach((cb) => cb(this.reversed));
    });

    topRow.appendChild(this.prevBtn);
    topRow.appendChild(this.track);
    topRow.appendChild(this.nextBtn);
    topRow.appendChild(this.dirToggle);
    this.el.appendChild(topRow);

    // Bottom row: CTA
    this.ctaBtn = document.createElement('button');
    this.ctaBtn.className = 'maptour-overview-controls__cta';
    this.ctaBtn.addEventListener('click', () => {
      this.beginCallbacks.forEach((cb) => cb(this.selectedIndex, this.reversed));
    });
    this.el.appendChild(this.ctaBtn);
  }

  update(selectedIndex: number, totalStops: number, reversed: boolean, stopName: string): void {
    this.selectedIndex = selectedIndex;
    this.totalStops = totalStops;
    this.reversed = reversed;

    // Update fill
    const ratio = totalStops > 1 ? selectedIndex / (totalStops - 1) : 0;
    this.fill.style.width = `${Math.round(ratio * 100)}%`;

    // Update arrows
    this.prevBtn.disabled = selectedIndex === 0;
    this.nextBtn.disabled = selectedIndex === totalStops - 1;

    // Update CTA
    this.ctaBtn.textContent = t('begin_from', { stop: stopName });
  }

  onStopSelect(cb: (index: number) => void): void {
    this.stopSelectCallbacks.push(cb);
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

  private cycleStop(delta: number): void {
    const newIndex = this.selectedIndex + delta;
    if (newIndex < 0 || newIndex >= this.totalStops) return;
    this.selectedIndex = newIndex;
    this.stopSelectCallbacks.forEach((cb) => cb(newIndex));
  }
}
