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
  private startingStopIndex = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.navPreference = new NavAppPreference();
  }

  /** Set which stop the tour starts at (getting_here hidden on this stop). */
  setStartingStop(index: number): void {
    this.startingStopIndex = index;
  }

  /** Register a callback for "Next stop" and "Finish Tour" buttons. */
  onNext(cb: () => void): void {
    this.nextCallback = cb;
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

    // Show getting_here note on all stops except the starting stop
    if (stop.getting_here?.note && (stopNumber - 1) !== this.startingStopIndex) {
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
      // Last tour stop — "Finish Tour" leads to goodbye card
      const footer = document.createElement('div');
      footer.className = 'maptour-card__finish';

      const btn = document.createElement('button');
      btn.className = 'maptour-card__finish-btn';
      btn.textContent = 'Finish Tour';
      btn.addEventListener('click', () => this.nextCallback?.());
      footer.appendChild(btn);

      this.container.appendChild(footer);
    }
  }

  update(stop: Stop, stopNumber: number, totalStops: number, nextStop?: Stop): void {
    this.render(stop, stopNumber, totalStops, nextStop);
  }

  // === Welcome card ===

  private welcomeSelectionEl: HTMLElement | null = null;
  private welcomeCtaEl: HTMLButtonElement | null = null;
  private welcomeBeginCallback: ((index: number) => void) | null = null;
  private welcomeSelectedIndex = 0;

  renderWelcome(options: {
    title: string;
    description?: string;
    duration?: string;
    stopCount: number;
    welcome?: ContentBlock[];
    returning: boolean;
    stops: Stop[];
    selectedIndex: number;
    onBegin: (index: number) => void;
  }): void {
    this.container.innerHTML = '';
    this.container.scrollTop = 0;
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', `Welcome: ${options.title}`);
    this.welcomeBeginCallback = options.onBegin;
    this.welcomeSelectedIndex = options.selectedIndex;

    // Guided tip
    const tip = document.createElement('p');
    tip.className = 'maptour-card__tip';
    tip.textContent = 'Use the arrows above to change your starting point';
    this.container.appendChild(tip);

    // Stop picker (right under tip)
    this.welcomeSelectionEl = document.createElement('div');
    this.welcomeSelectionEl.className = 'maptour-card__start-from';
    this.container.appendChild(this.welcomeSelectionEl);

    // Tour title
    const title = document.createElement('h1');
    title.className = 'maptour-card__title';
    title.textContent = options.title;
    this.container.appendChild(title);

    // Description
    if (options.description) {
      const desc = document.createElement('p');
      desc.className = 'maptour-card__description';
      desc.textContent = options.description;
      this.container.appendChild(desc);
    }

    // Meta (stop count + duration)
    const meta = document.createElement('p');
    meta.className = 'maptour-card__meta';
    const stopLabel = `${options.stopCount} stop${options.stopCount !== 1 ? 's' : ''}`;
    meta.textContent = options.duration ? `${stopLabel} · ${options.duration}` : stopLabel;
    this.container.appendChild(meta);

    // Welcome content blocks
    if (options.welcome && options.welcome.length > 0) {
      const welcomeContent = document.createElement('div');
      welcomeContent.className = 'maptour-card__content';
      options.welcome.forEach((block) => {
        welcomeContent.appendChild(renderBlock(block, true));
      });
      this.container.appendChild(welcomeContent);
    }

    // CTA button at bottom
    this.welcomeCtaEl = document.createElement('button');
    this.welcomeCtaEl.className = 'maptour-card__cta';
    this.welcomeCtaEl.addEventListener('click', () => {
      this.welcomeBeginCallback?.(this.welcomeSelectedIndex);
    });
    this.container.appendChild(this.welcomeCtaEl);

    // Set initial selection
    this.updateWelcomeSelection(options.stops[options.selectedIndex], options.selectedIndex, options.stops.length, options.returning);
  }

  updateWelcomeSelection(stop: Stop, index: number, totalStops: number, returning = false): void {
    this.welcomeSelectedIndex = index;

    if (this.welcomeSelectionEl) {
      this.welcomeSelectionEl.innerHTML = '';

      const headerRow = document.createElement('div');
      headerRow.className = 'maptour-card__start-from-header';

      const textCol = document.createElement('div');
      textCol.className = 'maptour-card__start-from-text';

      const label = document.createElement('div');
      label.className = 'maptour-card__start-from-label';
      label.textContent = `Start at Stop ${index + 1} / ${totalStops}:`;
      textCol.appendChild(label);

      const stopName = document.createElement('div');
      stopName.className = 'maptour-card__start-from-name';
      stopName.textContent = stop.title;
      textCol.appendChild(stopName);

      headerRow.appendChild(textCol);
      this.welcomeSelectionEl.appendChild(headerRow);
    }

    if (this.welcomeCtaEl) {
      if (returning) {
        this.welcomeCtaEl.textContent = 'Re-take tour';
      } else if (index === 0) {
        this.welcomeCtaEl.textContent = 'Begin tour';
      } else {
        this.welcomeCtaEl.textContent = `Start from ${stop.title}`;
      }
    }
  }

  // === Goodbye card ===

  renderGoodbye(options: {
    goodbye?: ContentBlock[];
    visitedCount: number;
    totalStops: number;
    closeUrl?: string;
    onReview: () => void;
  }): void {
    this.container.innerHTML = '';
    this.container.scrollTop = 0;
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', 'Tour complete');

    // Checkmark icon
    const icon = document.createElement('div');
    icon.className = 'maptour-complete__icon';
    icon.setAttribute('aria-hidden', 'true');
    this.container.appendChild(icon);

    // Heading
    const heading = document.createElement('h2');
    heading.className = 'maptour-card__title';
    heading.textContent = 'Tour complete!';
    this.container.appendChild(heading);

    // Visited count
    const count = document.createElement('p');
    count.className = 'maptour-card__meta';
    count.textContent = `${options.visitedCount} / ${options.totalStops} stops visited`;
    this.container.appendChild(count);

    // Goodbye content blocks
    if (options.goodbye && options.goodbye.length > 0) {
      const goodbyeContent = document.createElement('div');
      goodbyeContent.className = 'maptour-card__content';
      options.goodbye.forEach((block) => {
        goodbyeContent.appendChild(renderBlock(block, true));
      });
      this.container.appendChild(goodbyeContent);
    }

    // Revisit button
    const review = document.createElement('button');
    review.className = 'maptour-card__cta';
    review.textContent = 'Revisit tour';
    review.addEventListener('click', options.onReview);
    this.container.appendChild(review);

    // Close link
    if (options.closeUrl) {
      const close = document.createElement('a');
      close.className = 'maptour-card__close-link';
      close.href = options.closeUrl;
      close.textContent = 'Close';
      this.container.appendChild(close);
    }
  }
}
