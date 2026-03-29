import type { Stop, ContentBlock, LegMode } from '../types';
import { renderTextBlock } from './blocks/TextBlock';
import { renderImageBlock } from './blocks/ImageBlock';
import { renderGalleryBlock } from './blocks/GalleryBlock';
import { renderVideoBlock } from './blocks/VideoBlock';
import { renderAudioBlock } from './blocks/AudioBlock';
import { NavButton } from './NavButton';
import { NavAppPreference } from '../navigation/NavAppPreference';

const MODE_ICON: Record<LegMode, string> = {
  walk:    '🚶',
  drive:   '🚗',
  transit: '🚌',
  cycle:   '🚲',
};

function renderBlock(block: ContentBlock, active: boolean): HTMLElement {
  switch (block.type) {
    case 'text':
      return renderTextBlock(block);
    case 'image':
      return renderImageBlock(block);
    case 'gallery':
      return renderGalleryBlock(block);
    case 'video':
      return renderVideoBlock(block, active);
    case 'audio':
      return renderAudioBlock(block);
  }
}

export class StopCard {
  private container: HTMLElement;
  private navPreference: NavAppPreference;
  private navButton: NavButton | null = null;
  private takeMethereCallback: (() => void) | null = null;
  private tourNavMode: LegMode | undefined;

  constructor(container: HTMLElement) {
    this.container = container;
    this.navPreference = new NavAppPreference();
  }

  /** Register a callback that fires when "Take me there" is tapped. */
  onTakeMethere(cb: () => void): void {
    this.takeMethereCallback = cb;
  }

  /** Set the tour-level nav mode default (passed down to NavButton). */
  setTourNavMode(mode: LegMode | undefined): void {
    this.tourNavMode = mode;
  }

  render(stop: Stop, stopNumber: number, totalStops: number, nextStop?: Stop): void {
    this.container.innerHTML = '';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', `Stop ${stopNumber}: ${stop.title}`);

    // Header row: title + small "directions here" pin button
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const headerText = document.createElement('div');
    headerText.className = 'maptour-card__header-text';

    const title = document.createElement('h2');
    title.className = 'maptour-card__title';
    title.textContent = stop.title;

    headerText.appendChild(title);
    header.appendChild(headerText);

    // Pin button — "directions to this stop" (no state change)
    const pinContainer = document.createElement('div');
    pinContainer.className = 'maptour-card__nav-icon';
    header.appendChild(pinContainer);
    new NavButton(
      pinContainer,
      stop,
      this.navPreference,
      undefined, // no state change — just opens directions
      this.tourNavMode,
      'pin',
    );

    this.container.appendChild(header);

    // Content blocks
    const content = document.createElement('div');
    content.className = 'maptour-card__content';

    stop.content.forEach((block) => {
      const blockEl = renderBlock(block, true);
      content.appendChild(blockEl);
    });

    this.container.appendChild(content);

    // Transition footer: leg note + "onwards" arrow button
    if (stop.leg_to_next && nextStop) {
      const footer = document.createElement('div');
      footer.className = 'maptour-card__transition';

      const noteEl = document.createElement('div');
      noteEl.className = 'maptour-card__leg-note';
      const icon = MODE_ICON[stop.leg_to_next.mode] ?? '→';
      noteEl.textContent = `${icon} ${stop.leg_to_next.note ?? ''}`.trim();
      footer.appendChild(noteEl);

      const arrowContainer = document.createElement('div');
      arrowContainer.className = 'maptour-card__nav-onwards';
      footer.appendChild(arrowContainer);
      this.navButton = new NavButton(
        arrowContainer,
        nextStop,
        this.navPreference,
        this.takeMethereCallback ?? undefined,
        this.tourNavMode,
        'arrow',
      );

      this.container.appendChild(footer);
    }
  }

  update(stop: Stop, stopNumber: number, totalStops: number, nextStop?: Stop): void {
    this.render(stop, stopNumber, totalStops, nextStop);
  }
}
