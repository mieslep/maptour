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
  private tourNavMode: LegMode | undefined;
  private nextCallback: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.navPreference = new NavAppPreference();
  }

  /** Register a callback for the "Next stop" footer button. */
  onNext(cb: () => void): void {
    this.nextCallback = cb;
  }

  /** Set the tour-level nav mode default (passed down to NavButton). */
  setTourNavMode(mode: LegMode | undefined): void {
    this.tourNavMode = mode;
  }

  render(stop: Stop, stopNumber: number, totalStops: number, nextStop?: Stop): void {
    this.container.innerHTML = '';
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', `Stop ${stopNumber}: ${stop.title}`);

    // "Getting here" row — directions to THIS stop (if provided)
    if (stop.getting_here) {
      const gettingHere = document.createElement('div');
      gettingHere.className = 'maptour-card__getting-here';

      const noteEl = document.createElement('div');
      noteEl.className = 'maptour-card__getting-here-note';
      const icon = MODE_ICON[stop.getting_here.mode] ?? '→';
      noteEl.textContent = `${icon} ${stop.getting_here.note ?? ''}`.trim();
      gettingHere.appendChild(noteEl);

      // Pin nav button — directions to this stop
      const pinContainer = document.createElement('div');
      pinContainer.className = 'maptour-card__nav-icon';
      gettingHere.appendChild(pinContainer);
      new NavButton(
        pinContainer,
        stop,
        this.navPreference,
        undefined,
        this.tourNavMode,
        'pin',
      );

      this.container.appendChild(gettingHere);
    }

    // Title
    const title = document.createElement('h2');
    title.className = 'maptour-card__title';
    title.textContent = stop.title;
    this.container.appendChild(title);

    // Content blocks
    const content = document.createElement('div');
    content.className = 'maptour-card__content';

    stop.content.forEach((block) => {
      const blockEl = renderBlock(block, true);
      content.appendChild(blockEl);
    });

    this.container.appendChild(content);

    // "Next stop" footer
    if (nextStop) {
      const footer = document.createElement('div');
      footer.className = 'maptour-card__next-stop';

      const label = document.createElement('div');
      label.className = 'maptour-card__next-stop-label';
      label.textContent = `Next: ${nextStop.title}`;
      footer.appendChild(label);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'maptour-card__next-btn';
      nextBtn.textContent = 'Next →';
      nextBtn.setAttribute('aria-label', `Go to next stop: ${nextStop.title}`);
      nextBtn.addEventListener('click', () => this.nextCallback?.());
      footer.appendChild(nextBtn);

      this.container.appendChild(footer);
    }
  }

  update(stop: Stop, stopNumber: number, totalStops: number, nextStop?: Stop): void {
    this.render(stop, stopNumber, totalStops, nextStop);
  }
}
