import { t } from '../i18n';

export class InTransitBar {
  private readonly el: HTMLElement;
  private arrivedCallbacks: Array<() => void> = [];

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'maptour-transit-bar';
    this.el.setAttribute('role', 'status');
    this.el.setAttribute('aria-live', 'polite');
    this.el.hidden = true;
    container.appendChild(this.el);
  }

  show(stopNumber: number, title: string): void {
    this.el.innerHTML = '';

    const label = document.createElement('span');
    label.className = 'maptour-transit-bar__label';
    label.textContent = `Stop ${stopNumber}: ${title}`;

    const btn = document.createElement('button');
    btn.className = 'maptour-transit-bar__arrived';
    btn.textContent = t('im_here');
    btn.setAttribute('aria-label', `I have arrived at stop ${stopNumber}: ${title}`);
    btn.addEventListener('click', () => {
      this.arrivedCallbacks.forEach((cb) => cb());
    });

    this.el.appendChild(label);
    this.el.appendChild(btn);
    this.el.hidden = false;
  }

  hide(): void {
    this.el.hidden = true;
    this.el.innerHTML = '';
  }

  onArrived(cb: () => void): void {
    this.arrivedCallbacks.push(cb);
  }
}
