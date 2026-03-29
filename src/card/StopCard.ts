import type { Stop, ContentBlock } from '../types';
import { renderTextBlock } from './blocks/TextBlock';
import { renderImageBlock } from './blocks/ImageBlock';
import { renderGalleryBlock } from './blocks/GalleryBlock';
import { renderVideoBlock } from './blocks/VideoBlock';
import { renderAudioBlock } from './blocks/AudioBlock';
import { NavButton } from './NavButton';
import { NavAppPreference } from '../navigation/NavAppPreference';

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

  constructor(container: HTMLElement) {
    this.container = container;
    this.navPreference = new NavAppPreference();
  }

  /** Register a callback that fires when "Take me there" is tapped. */
  onTakeMethere(cb: () => void): void {
    this.takeMethereCallback = cb;
  }

  render(stop: Stop, stopNumber: number, totalStops: number): void {
    this.container.innerHTML = '';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', `Stop ${stopNumber}: ${stop.title}`);

    // Header
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const badge = document.createElement('span');
    badge.className = 'maptour-card__badge';
    badge.setAttribute('aria-label', `Stop ${stopNumber} of ${totalStops}`);
    badge.textContent = `${stopNumber} / ${totalStops}`;

    const title = document.createElement('h2');
    title.className = 'maptour-card__title';
    title.textContent = stop.title;

    header.appendChild(badge);
    header.appendChild(title);
    this.container.appendChild(header);

    // Leg note
    if (stop.leg_to_next?.note) {
      const legNote = document.createElement('div');
      legNote.className = 'maptour-card__leg-note';
      const modeIcon = stop.leg_to_next.mode === 'walk' ? '🚶' : '🚗';
      legNote.textContent = `${modeIcon} ${stop.leg_to_next.note}`;
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

    // Nav button
    const navContainer = document.createElement('div');
    navContainer.className = 'maptour-card__nav-btn-container';
    this.container.appendChild(navContainer);
    this.navButton = new NavButton(navContainer, stop, this.navPreference, this.takeMethereCallback ?? undefined);
  }

  update(stop: Stop, stopNumber: number, totalStops: number): void {
    this.render(stop, stopNumber, totalStops);
  }
}
