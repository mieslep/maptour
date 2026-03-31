import type { Stop, ContentBlock, LegMode, Leg } from '../types';
import { t } from '../i18n';
import { renderTextBlock } from './blocks/TextBlock';
import { renderImageBlock } from './blocks/ImageBlock';
import { renderGalleryBlock } from './blocks/GalleryBlock';
import { renderVideoBlock } from './blocks/VideoBlock';
import { renderAudioBlock } from './blocks/AudioBlock';
import { NavButton } from './NavButton';
import { NavAppPreference } from '../navigation/NavAppPreference';

const MODE_ICON: Record<LegMode, string> = {
  walk:    '<i class="fa-solid fa-person-walking" aria-hidden="true"></i>',
  drive:   '<i class="fa-solid fa-car" aria-hidden="true"></i>',
  transit: '<i class="fa-solid fa-bus" aria-hidden="true"></i>',
  cycle:   '<i class="fa-solid fa-bicycle" aria-hidden="true"></i>',
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
  private suppressGettingHereNote = false;

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

  /** Mark that the next stop card should hide the getting_here note (user just completed a journey). */
  setSuppressGettingHereNote(suppress: boolean): void {
    this.suppressGettingHereNote = suppress;
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
      label.textContent = t('next_stop', { stop: nextStop.title });
      footer.appendChild(label);

      const nextBtn = document.createElement('button');
      nextBtn.className = 'maptour-card__next-btn';
      nextBtn.textContent = t('next_btn');
      nextBtn.setAttribute('aria-label', t('next_stop', { stop: nextStop.title }));
      nextBtn.addEventListener('click', () => this.nextCallback?.());
      footer.appendChild(nextBtn);

      this.container.appendChild(footer);
    } else {
      // Last tour stop — "Finish Tour" leads to goodbye card
      const footer = document.createElement('div');
      footer.className = 'maptour-card__finish';

      const btn = document.createElement('button');
      btn.className = 'maptour-card__finish-btn';
      btn.textContent = t('finish_tour');
      btn.addEventListener('click', () => this.nextCallback?.());
      footer.appendChild(btn);

      this.container.appendChild(footer);
    }
  }

  update(stop: Stop, stopNumber: number, totalStops: number, nextStop?: Stop): void {
    this.render(stop, stopNumber, totalStops, nextStop);
  }

  // === Journey card ===

  renderJourney(destinationStop: Stop, onArrived: () => void): void {
    const gettingHere = destinationStop.getting_here!;
    this.container.innerHTML = '';
    this.container.scrollTop = 0;
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', `En route to ${destinationStop.title}`);

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
    new NavButton(
      pinContainer,
      destinationStop,
      this.navPreference,
      undefined,
      this.tourNavMode,
      'pin',
    );

    this.container.appendChild(header);

    // Journey content blocks
    if (gettingHere.journey && gettingHere.journey.length > 0) {
      const content = document.createElement('div');
      content.className = 'maptour-card__content';
      gettingHere.journey.forEach((block) => {
        content.appendChild(renderBlock(block, true));
      });
      this.container.appendChild(content);
    }

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

    this.container.appendChild(footer);
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
    reversed?: boolean;
    onReverseToggle?: (reversed: boolean) => void;
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
    tip.textContent = t('tip');
    this.container.appendChild(tip);

    // Stop picker (right under tip)
    this.welcomeSelectionEl = document.createElement('div');
    this.welcomeSelectionEl.className = 'maptour-card__start-from';
    this.container.appendChild(this.welcomeSelectionEl);

    // Stop order toggle: compact inline "Stop order: 1 → 16 [tap to flip]"
    if (options.stopCount > 1 && options.onReverseToggle) {
      let reversed = options.reversed ?? false;
      const row = document.createElement('div');
      row.className = 'maptour-card__stop-order';

      const label = document.createElement('span');
      label.className = 'maptour-card__stop-order-label';
      label.textContent = t('stop_order');

      const toggleBtn = document.createElement('button');
      toggleBtn.className = 'maptour-card__stop-order-btn';

      function updateToggle(): void {
        const first = reversed ? options.stopCount : 1;
        const last = reversed ? 1 : options.stopCount;
        toggleBtn.innerHTML = `${first} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i> ${last}`;
        toggleBtn.setAttribute('aria-label', `Stop order: ${first} to ${last}. Tap to reverse.`);
      }
      updateToggle();

      toggleBtn.addEventListener('click', () => {
        reversed = !reversed;
        updateToggle();
        options.onReverseToggle!(reversed);
      });

      row.appendChild(label);
      row.appendChild(toggleBtn);
      this.welcomeSelectionEl.after(row);
    }

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
      label.textContent = t('start_at', { n: index + 1, total: totalStops });
      textCol.appendChild(label);

      const stopName = document.createElement('div');
      stopName.className = 'maptour-card__start-from-name';
      stopName.textContent = stop.title;
      textCol.appendChild(stopName);

      headerRow.appendChild(textCol);
      this.welcomeSelectionEl.appendChild(headerRow);
    }

    if (this.welcomeCtaEl) {
      this.welcomeCtaEl.textContent = t('start_from', { stop: stop.title });
    }
  }

  showNearestIndicator(stopIndex: number, stopName: string): void {
    // Insert after the tip element
    const tip = this.container.querySelector('.maptour-card__tip');
    if (!tip) return;

    // Remove any existing indicator
    const existing = this.container.querySelector('.maptour-card__nearest');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.className = 'maptour-card__nearest';
    indicator.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i> Nearest to you: Stop ${stopIndex + 1} — ${stopName}`;
    tip.after(indicator);
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
    heading.textContent = t('tour_complete');
    this.container.appendChild(heading);

    // Visited count
    const count = document.createElement('p');
    count.className = 'maptour-card__meta';
    count.textContent = t('stops_visited', { n: options.visitedCount, total: options.totalStops });
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
    review.textContent = t('revisit');
    review.addEventListener('click', options.onReview);
    this.container.appendChild(review);

    // Close link
    if (options.closeUrl) {
      const close = document.createElement('a');
      close.className = 'maptour-card__close-link';
      close.href = options.closeUrl;
      close.textContent = t('close');
      this.container.appendChild(close);
    }
  }
}
