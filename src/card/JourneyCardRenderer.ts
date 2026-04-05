import type { Stop, LegMode, Waypoint } from '../types';
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

export class JourneyCardRenderer {
  private readonly navPreference: NavAppPreference;
  private tourNavMode: LegMode | undefined;

  constructor(navPreference?: NavAppPreference) {
    this.navPreference = navPreference ?? new NavAppPreference();
  }

  setTourNavMode(mode: LegMode | undefined): void {
    this.tourNavMode = mode;
  }

  /** Render a journey card for a stop (legacy in-transit flow). */
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

  /** Render a journey card for a waypoint (waypoint transit flow). */
  renderWaypoint(container: HTMLElement, waypoint: Waypoint, onContinue: () => void): void {
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', waypoint.text);

    // Header with waypoint guidance text
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const headerText = document.createElement('div');
    headerText.className = 'maptour-card__header-text';

    const title = document.createElement('h3');
    title.className = 'maptour-card__title';
    title.textContent = waypoint.text;
    headerText.appendChild(title);

    header.appendChild(headerText);
    container.appendChild(header);

    // Hero photo if present
    if (waypoint.photo) {
      const photoContainer = document.createElement('div');
      photoContainer.className = 'maptour-card__hero';
      const img = document.createElement('img');
      img.src = waypoint.photo;
      img.alt = waypoint.text;
      img.className = 'maptour-card__hero-img';
      photoContainer.appendChild(img);
      container.appendChild(photoContainer);
    }

    // Content blocks if present
    if (waypoint.content && waypoint.content.length > 0) {
      const content = document.createElement('div');
      content.className = 'maptour-card__content';
      waypoint.content.forEach((block) => {
        content.appendChild(renderBlock(block, true));
      });
      container.appendChild(content);
    }

    // "Continue" button
    const footer = document.createElement('div');
    footer.className = 'maptour-card__finish';

    const btn = document.createElement('button');
    btn.className = 'maptour-card__arrived-btn';
    btn.textContent = t('continue');
    btn.setAttribute('aria-label', t('continue'));
    btn.addEventListener('click', onContinue);
    footer.appendChild(btn);

    container.appendChild(footer);
  }
}
