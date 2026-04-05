import { t } from '../i18n';

export class TourFooter {
  private readonly el: HTMLElement;
  private readonly track: HTMLElement;
  private readonly fill: HTMLElement;
  private readonly prevBtn: HTMLElement;
  private readonly nextBtn: HTMLElement;
  private readonly label: HTMLElement;
  private readonly finishBtn: HTMLElement;
  private readonly scrollIndicator: HTMLElement;
  private prevCallbacks: Array<() => void> = [];
  private nextCallbacks: Array<() => void> = [];
  private finishCallbacks: Array<() => void> = [];
  private scrollGated = false;

  constructor() {
    this.el = document.createElement('div');
    this.el.className = 'maptour-tour-footer';
    this.el.hidden = true;

    // Progress track
    this.track = document.createElement('div');
    this.track.className = 'maptour-tour-footer__track';
    this.track.setAttribute('role', 'progressbar');
    this.track.setAttribute('aria-label', t('progress_label'));
    this.track.setAttribute('aria-valuemin', '0');

    this.fill = document.createElement('div');
    this.fill.className = 'maptour-tour-footer__fill';
    this.track.appendChild(this.fill);

    // Navigation row
    const nav = document.createElement('div');
    nav.className = 'maptour-tour-footer__nav';

    // Prev arrow (left)
    this.prevBtn = document.createElement('button');
    this.prevBtn.className = 'maptour-tour-footer__arrow';
    this.prevBtn.setAttribute('aria-label', 'Previous stop');
    this.prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i>';
    this.prevBtn.addEventListener('click', () => {
      this.prevCallbacks.forEach((cb) => cb());
    });

    // Spacer pushes label+next to the right
    const spacer = document.createElement('div');
    spacer.className = 'maptour-tour-footer__spacer';

    // Next label (tappable, right-aligned)
    this.label = document.createElement('button');
    this.label.className = 'maptour-tour-footer__label';
    this.label.addEventListener('click', () => {
      if (this.scrollGated) { this.bounceIndicator(); return; }
      this.nextCallbacks.forEach((cb) => cb());
    });

    // Finish text button (hidden by default, shown on last stop)
    this.finishBtn = document.createElement('button');
    this.finishBtn.className = 'maptour-tour-footer__finish';
    this.finishBtn.textContent = t('finish_tour');
    this.finishBtn.hidden = true;
    this.finishBtn.addEventListener('click', () => {
      this.finishCallbacks.forEach((cb) => cb());
    });

    // Scroll indicator (bouncing down arrow, hidden unless scroll-gated)
    this.scrollIndicator = document.createElement('div');
    this.scrollIndicator.className = 'maptour-tour-footer__scroll-indicator';
    this.scrollIndicator.innerHTML = '<i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
    this.scrollIndicator.hidden = true;

    // Next arrow (right, same action as label)
    this.nextBtn = document.createElement('button');
    this.nextBtn.className = 'maptour-tour-footer__arrow';
    this.nextBtn.setAttribute('aria-label', 'Next stop');
    this.nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right" aria-hidden="true"></i>';
    this.nextBtn.addEventListener('click', () => {
      if (this.scrollGated) { this.bounceIndicator(); return; }
      this.nextCallbacks.forEach((cb) => cb());
    });

    nav.appendChild(this.prevBtn);
    nav.appendChild(spacer);
    nav.appendChild(this.label);
    nav.appendChild(this.finishBtn);
    nav.appendChild(this.scrollIndicator);
    nav.appendChild(this.nextBtn);

    this.el.appendChild(this.track);
    this.el.appendChild(nav);
  }

  update(visited: number, total: number): void {
    const ratio = total > 0 ? visited / total : 0;
    this.fill.style.width = `${Math.round(ratio * 100)}%`;
    this.track.setAttribute('aria-valuenow', String(visited));
    this.track.setAttribute('aria-valuemax', String(total));
  }

  /** Show the "Next: Stop Name" label and next arrow, hide the finish button. */
  setNextStop(title: string): void {
    this.label.textContent = t('next_stop', { stop: title });
    this.label.hidden = false;
    this.nextBtn.hidden = false;
    this.finishBtn.hidden = true;
  }

  /** Show the "Finish Tour" text, hide label and next arrow. */
  setLastStop(endOnly = false): void {
    this.label.hidden = true;
    this.nextBtn.hidden = true;
    this.finishBtn.textContent = endOnly ? t('end_tour') : t('finish_tour');
    this.finishBtn.hidden = false;
  }

  setPrevDisabled(disabled: boolean): void {
    (this.prevBtn as HTMLButtonElement).disabled = disabled;
  }

  setPrevHidden(hidden: boolean): void {
    this.prevBtn.hidden = hidden;
  }

  /** Gate the next/label buttons until user scrolls to bottom. */
  setScrollGate(gated: boolean): void {
    this.scrollGated = gated;
    this.scrollIndicator.hidden = !gated;
    this.el.classList.toggle('maptour-tour-footer--scroll-gated', gated);
  }

  isScrollGated(): boolean {
    return this.scrollGated;
  }

  private bounceIndicator(): void {
    this.scrollIndicator.classList.remove('maptour-tour-footer__scroll-indicator--bounce');
    // Force reflow to restart animation
    void this.scrollIndicator.offsetWidth;
    this.scrollIndicator.classList.add('maptour-tour-footer__scroll-indicator--bounce');
  }

  onPrev(cb: () => void): void {
    this.prevCallbacks.push(cb);
  }

  onNext(cb: () => void): void {
    this.nextCallbacks.push(cb);
  }

  onFinish(cb: () => void): void {
    this.finishCallbacks.push(cb);
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

  /**
   * Show a modal asking if user wants to return to start.
   * @param nudgeReturn - if true, "Return to start" is the primary action; otherwise "End tour" is primary
   * @returns true if user chose to return to start, false to end tour
   */
  static showFinishModal(container: HTMLElement, nudgeReturn = false): Promise<boolean> {
    return new Promise((resolve) => {
      const backdrop = document.createElement('div');
      backdrop.className = 'maptour-finish-modal__backdrop';

      const modal = document.createElement('div');
      modal.className = 'maptour-finish-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      const title = document.createElement('h3');
      title.className = 'maptour-finish-modal__title';
      title.textContent = t('finish_modal_title');
      modal.appendChild(title);

      const body = document.createElement('p');
      body.className = 'maptour-finish-modal__body';
      body.textContent = t('finish_modal_body');
      modal.appendChild(body);

      const actions = document.createElement('div');
      actions.className = 'maptour-finish-modal__actions';

      const returnBtn = document.createElement('button');
      returnBtn.textContent = t('finish_modal_yes');

      const endBtn = document.createElement('button');
      endBtn.textContent = t('finish_modal_no');

      if (nudgeReturn) {
        returnBtn.className = 'maptour-finish-modal__btn maptour-finish-modal__btn--primary';
        endBtn.className = 'maptour-finish-modal__btn';
        actions.appendChild(returnBtn);
        actions.appendChild(endBtn);
      } else {
        endBtn.className = 'maptour-finish-modal__btn maptour-finish-modal__btn--primary';
        returnBtn.className = 'maptour-finish-modal__btn';
        actions.appendChild(endBtn);
        actions.appendChild(returnBtn);
      }

      modal.appendChild(actions);
      backdrop.appendChild(modal);
      container.appendChild(backdrop);

      const cleanup = () => backdrop.remove();

      returnBtn.addEventListener('click', () => { cleanup(); resolve(true); });
      endBtn.addEventListener('click', () => { cleanup(); resolve(false); });
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) { cleanup(); resolve(false); }
      });
    });
  }
}
