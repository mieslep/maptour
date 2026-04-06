import { t } from '../i18n';

export class ArrivingBanner {
  private readonly el: HTMLElement;
  private dismissTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'maptour-arriving-banner';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    this.el.hidden = true;

    this.el.addEventListener('click', () => this.dismiss());
  }

  show(stopName: string): void {
    this.clearTimer();
    this.el.textContent = t('arriving_at', { stop: stopName });
    this.el.hidden = false;

    // Auto-dismiss after 3 seconds
    this.dismissTimer = setTimeout(() => this.dismiss(), 3000);
  }

  dismiss(): void {
    this.clearTimer();
    this.el.hidden = true;
  }

  private clearTimer(): void {
    if (this.dismissTimer) {
      clearTimeout(this.dismissTimer);
      this.dismissTimer = null;
    }
  }

  getElement(): HTMLElement {
    return this.el;
  }
}
