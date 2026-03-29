import type { Stop, ContentBlock, LegMode } from '../types';
import { renderTextBlock } from './blocks/TextBlock';
import { renderImageBlock } from './blocks/ImageBlock';
import { renderGalleryBlock } from './blocks/GalleryBlock';
import { renderVideoBlock } from './blocks/VideoBlock';
import { renderAudioBlock } from './blocks/AudioBlock';
import { NavButton } from './NavButton';
import { NavAppPreference } from '../navigation/NavAppPreference';

const MODE_ICON: Partial<Record<LegMode, string>> = {
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

  render(stop: Stop, stopNumber: number, totalStops: number): void {
    this.container.innerHTML = '';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', `Stop ${stopNumber}: ${stop.title}`);

    // Header row: title + compact nav icon
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const headerText = document.createElement('div');
    headerText.className = 'maptour-card__header-text';

    const title = document.createElement('h2');
    title.className = 'maptour-card__title';
    title.textContent = stop.title;

    headerText.appendChild(title);
    header.appendChild(headerText);

    // Compact "Take me there" icon button in header
    const navIconContainer = document.createElement('div');
    navIconContainer.className = 'maptour-card__nav-icon';
    header.appendChild(navIconContainer);
    this.navButton = new NavButton(
      navIconContainer,
      stop,
      this.navPreference,
      this.takeMethereCallback ?? undefined,
      this.tourNavMode,
      true, // compact mode
    );

    this.container.appendChild(header);

    // Leg note
    if (stop.leg_to_next?.note) {
      const legNote = document.createElement('div');
      legNote.className = 'maptour-card__leg-note';
      const icon = MODE_ICON[stop.leg_to_next.mode] ?? '→';
      legNote.textContent = `${icon} ${stop.leg_to_next.note}`;
      this.container.appendChild(legNote);
    }

    // Content blocks
    const content = document.createElement('div');
    content.className = 'maptour-card__content';

    stop.content.forEach((block) => {
      const blockEl = renderBlock(block, true);
      content.appendChild(blockEl);
    });

    this.container.appendChild(content);
  }

  update(stop: Stop, stopNumber: number, totalStops: number): void {
    this.render(stop, stopNumber, totalStops);
  }
}
