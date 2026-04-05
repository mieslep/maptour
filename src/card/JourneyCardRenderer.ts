import type { Stop, LegMode } from '../types';
import { t } from '../i18n';
import { NavButton } from './NavButton';
import { NavAppPreference } from '../navigation/NavAppPreference';

const MODE_ICON: Record<LegMode, string> = {
  walk:    '<i class="fa-solid fa-person-walking" aria-hidden="true"></i>',
  drive:   '<i class="fa-solid fa-car" aria-hidden="true"></i>',
  transit: '<i class="fa-solid fa-bus" aria-hidden="true"></i>',
  cycle:   '<i class="fa-solid fa-bicycle" aria-hidden="true"></i>',
};

export class JourneyCardRenderer {
  private readonly navPreference: NavAppPreference;
  private tourNavMode: LegMode | undefined;

  constructor(navPreference?: NavAppPreference) {
    this.navPreference = navPreference ?? new NavAppPreference();
  }

  setTourNavMode(mode: LegMode | undefined): void {
    this.tourNavMode = mode;
  }

  render(container: HTMLElement, destinationStop: Stop, onArrived: () => void): void {
    const gettingHere = destinationStop.getting_here!;
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', `En route to ${destinationStop.title}`);

    // Header: getting_here note + satnav pin to destination
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const headerText = document.createElement('div');
    headerText.className = 'maptour-card__header-text';

    if (gettingHere.note) {
      const note = document.createElement('div');
      note.className = 'maptour-card__getting-here-note';
      const icon = MODE_ICON[gettingHere.mode] ?? '<i class="fa-solid fa-route" aria-hidden="true"></i>';
      note.innerHTML = `${icon} ${gettingHere.note}`;
      headerText.appendChild(note);
    }

    header.appendChild(headerText);

    // Pin nav button — directions to the destination stop
    const pinContainer = document.createElement('div');
    pinContainer.className = 'maptour-card__nav-icon';
    header.appendChild(pinContainer);
    new NavButton(pinContainer, destinationStop, this.navPreference, undefined, this.tourNavMode, 'pin');

    container.appendChild(header);

    // "I've arrived" button
    const footer = document.createElement('div');
    footer.className = 'maptour-card__finish';

    const btn = document.createElement('button');
    btn.className = 'maptour-card__arrived-btn';
    const arrivedText = destinationStop.title
      ? t('arrived', { stop: destinationStop.title })
      : "I've arrived →";
    btn.textContent = arrivedText;
    btn.setAttribute('aria-label', arrivedText);
    btn.addEventListener('click', onArrived);
    footer.appendChild(btn);

    container.appendChild(footer);
  }
}
