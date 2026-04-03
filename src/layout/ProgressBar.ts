import { t } from '../i18n';

export class ProgressBar {
  private readonly el: HTMLElement;
  private readonly track: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly prevBtn: HTMLElement;
  private readonly nextBtn: HTMLElement;
  private prevCallbacks: Array<() => void> = [];
  private nextCallbacks: Array<() => void> = [];

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'maptour-progress-bar';
    this.el.hidden = true;

    // Prev arrow
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'maptour-progress-bar__arrow';
    this.prevBtn.setAttribute('aria-label', 'Previous stop');
    this.prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';
    this.prevBtn.addEventListener('click', () => {
      this.prevCallbacks.forEach((cb) => cb());
    });

    // Track
    this.track = document.createElement('div');
    this.track.className = 'maptour-progress-bar__track';
    this.track.setAttribute('role', 'progressbar');
    this.track.setAttribute('aria-label', t('progress_label'));
    this.track.setAttribute('aria-valuemin', '0');

    this.fill = document.createElement('div');
    this.fill.className = 'maptour-progress-bar__fill';
    this.track.appendChild(this.fill);

    // Next arrow
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'maptour-progress-bar__arrow';
    this.nextBtn.setAttribute('aria-label', 'Next stop');
    this.nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
    this.nextBtn.addEventListener('click', () => {
      this.nextCallbacks.forEach((cb) => cb());
    });

    this.el.appendChild(this.prevBtn);
    this.el.appendChild(this.track);
    this.el.appendChild(this.nextBtn);
  }

  update(visited: number, total: number): void {
    const ratio = total > 0 ? visited / total : 0;
    this.fill.style.width = `${Math.round(ratio * 100)}%`;
    this.track.setAttribute('aria-valuenow', String(visited));
    this.track.setAttribute('aria-valuemax', String(total));
  }

  setPrevDisabled(disabled: boolean): void {
    (this.prevBtn as HTMLButtonElement).disabled = disabled;
  }

  setNextDisabled(disabled: boolean): void {
    (this.nextBtn as HTMLButtonElement).disabled = disabled;
  }

  onPrev(cb: () => void): void {
    this.prevCallbacks.push(cb);
  }

  onNext(cb: () => void): void {
    this.nextCallbacks.push(cb);
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
