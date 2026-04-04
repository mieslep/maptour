import type { Stop, LegMode } from '../types';
import { t } from '../i18n';
import { renderBlock } from './blocks/renderBlock';
import { NavButton } from './NavButton';
import { NavAppPreference } from '../navigation/NavAppPreference';

const MODE_ICON: Record<LegMode, string> = {
  walk:    '<i class="fa-solid fa-person-walking" aria-hidden="true"></i>',
  drive:   '<i class="fa-solid fa-car" aria-hidden="true"></i>',
  transit: '<i class="fa-solid fa-bus" aria-hidden="true"></i>',
  cycle:   '<i class="fa-solid fa-bicycle" aria-hidden="true"></i>',
};

export class StopCardRenderer {
  private readonly navPreference: NavAppPreference;
  private tourNavMode: LegMode | undefined;
  private nextCallback: (() => void) | null = null;
  private returnToStartCallback: (() => void) | null = null;
  private startingStopIndex = 0;
  private suppressGettingHereNote = false;

  constructor(navPreference?: NavAppPreference) {
    this.navPreference = navPreference ?? new NavAppPreference();
  }

  setTourNavMode(mode: LegMode | undefined): void {
    this.tourNavMode = mode;
  }

  setStartingStop(index: number): void {
    this.startingStopIndex = index;
  }

  setSuppressGettingHereNote(suppress: boolean): void {
    this.suppressGettingHereNote = suppress;
  }

  onNext(cb: () => void): void {
    this.nextCallback = cb;
  }

  onReturnToStart(cb: (() => void) | null): void {
    this.returnToStartCallback = cb;
  }

  render(container: HTMLElement, stop: Stop, stopNumber: number, totalStops: number, nextStop?: Stop): void {
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', `Stop ${stopNumber}: ${stop.title}`);

    // Stop header
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const headerText = document.createElement('div');
    headerText.className = 'maptour-card__header-text';

    const title = document.createElement('h2');
    title.className = 'maptour-card__title';
    title.textContent = stop.title;
    headerText.appendChild(title);

    // Show getting_here note on all stops except the starting stop,
    // and hide it if the user just completed a journey card for this stop
    if (stop.getting_here?.note && (stopNumber - 1) !== this.startingStopIndex && !this.suppressGettingHereNote) {
      const note = document.createElement('div');
      note.className = 'maptour-card__getting-here-note';
      const icon = MODE_ICON[stop.getting_here.mode] ?? '<i class="fa-solid fa-route" aria-hidden="true"></i>';
      note.innerHTML = `${icon} ${stop.getting_here.note}`;
      headerText.appendChild(note);
    }

    header.appendChild(headerText);

    // Pin nav button
    const pinContainer = document.createElement('div');
    pinContainer.className = 'maptour-card__nav-icon';
    header.appendChild(pinContainer);
    new NavButton(pinContainer, stop, this.navPreference, undefined, this.tourNavMode, 'pin');

    container.appendChild(header);

    // Content blocks
    const content = document.createElement('div');
    content.className = 'maptour-card__content';
    stop.content.forEach((block) => {
      content.appendChild(renderBlock(block, true));
    });
    container.appendChild(content);

    // Footer
    if (nextStop) {
      const footer = document.createElement('div');
      footer.className = 'maptour-card__next-stop';

      const label = document.createElement('div');
      label.className = 'maptour-card__next-stop-label';
      label.textContent = t('next_stop', { stop: nextStop.title });
      footer.appendChild(label);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'maptour-card__next-btn';
      nextBtn.textContent = t('next_btn');
      nextBtn.setAttribute('aria-label', t('next_stop', { stop: nextStop.title }));
      nextBtn.addEventListener('click', () => this.nextCallback?.());
      footer.appendChild(nextBtn);

      container.appendChild(footer);
    } else if (this.returnToStartCallback) {
      const footer = document.createElement('div');
      footer.className = 'maptour-card__finish';

      const returnBtn = document.createElement('button');
      returnBtn.className = 'maptour-card__finish-btn';
      returnBtn.textContent = t('return_to_start');
      returnBtn.addEventListener('click', () => this.returnToStartCallback?.());
      footer.appendChild(returnBtn);

      const finishLink = document.createElement('button');
      finishLink.className = 'maptour-card__finish-link';
      finishLink.textContent = t('finish_here');
      finishLink.addEventListener('click', () => this.nextCallback?.());
      footer.appendChild(finishLink);

      container.appendChild(footer);
    } else {
      const footer = document.createElement('div');
      footer.className = 'maptour-card__finish';

      const btn = document.createElement('button');
      btn.className = 'maptour-card__finish-btn';
      btn.textContent = t('finish_tour');
      btn.addEventListener('click', () => this.nextCallback?.());
      footer.appendChild(btn);

      container.appendChild(footer);
    }
  }
}
