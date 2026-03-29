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
  private finishCallback: (() => void) | null = null;
  private closeUrl: string | undefined;

  constructor(container: HTMLElement) {
    this.container = container;
    this.navPreference = new NavAppPreference();
  }

  /** Register a callback for the "Next stop" footer button. */
  onNext(cb: () => void): void {
    this.nextCallback = cb;
  }

  /** Register a callback for "Finish Tour" when there's no close_url. */
  onFinish(cb: () => void): void {
    this.finishCallback = cb;
  }

  /** Set the close URL for the "Finish Tour" button on the last stop. */
  setCloseUrl(url: string | undefined): void {
    this.closeUrl = url;
  }

  /** Set the tour-level nav mode default (passed down to NavButton). */
  setTourNavMode(mode: LegMode | undefined): void {
    this.tourNavMode = mode;
  }

  render(stop: Stop, stopNumber: number, totalStops: number, nextStop?: Stop): void {
    this.container.innerHTML = '';
    this.container.scrollTop = 0;
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', `Stop ${stopNumber}: ${stop.title}`);

    // Stop header — always present: title + pin nav + optional getting_here note
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const headerText = document.createElement('div');
    headerText.className = 'maptour-card__header-text';

    const title = document.createElement('h2');
    title.className = 'maptour-card__title';
    title.textContent = stop.title;
    headerText.appendChild(title);

    if (stop.getting_here?.note) {
      const note = document.createElement('div');
      note.className = 'maptour-card__getting-here-note';
      const icon = MODE_ICON[stop.getting_here.mode] ?? '→';
      note.textContent = `${icon} ${stop.getting_here.note}`;
      headerText.appendChild(note);
    }

    header.appendChild(headerText);

    // Pin nav button — always shown, directions to this stop
    const pinContainer = document.createElement('div');
    pinContainer.className = 'maptour-card__nav-icon';
    header.appendChild(pinContainer);
    new NavButton(
      pinContainer,
      stop,
      this.navPreference,
      undefined,
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

    // Footer: "Next stop" or "Finish Tour"
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
    } else {
      // Last stop — "Finish Tour"
      const footer = document.createElement('div');
      footer.className = 'maptour-card__finish';

      if (this.closeUrl) {
        const link = document.createElement('a');
        link.className = 'maptour-card__finish-btn';
        link.href = this.closeUrl;
        link.textContent = 'Finish Tour';
        footer.appendChild(link);
      } else {
        const btn = document.createElement('button');
        btn.className = 'maptour-card__finish-btn';
        btn.textContent = 'Finish Tour';
        btn.addEventListener('click', () => this.finishCallback?.());
        footer.appendChild(btn);
      }

      this.container.appendChild(footer);
    }
  }

  update(stop: Stop, stopNumber: number, totalStops: number, nextStop?: Stop): void {
    this.render(stop, stopNumber, totalStops, nextStop);
  }
}
