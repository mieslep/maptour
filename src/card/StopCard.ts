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
  private returnToStartCallback: (() => void) | null = null;
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

  /** Register a callback for "Return to start" on last stop. Set to null to disable. */
  onReturnToStart(cb: (() => void) | null): void {
    this.returnToStartCallback = cb;
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
    } else if (this.returnToStartCallback) {
      // Last tour stop — offer return to start or finish here
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

      this.container.appendChild(footer);
    } else {
      // Last tour stop (returning to start) — just "Finish Tour"
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
    onBegin: () => void;
    onOpenMap?: () => void;
    gettingHereAvailable?: boolean;
    onGettingHere?: () => void;
    hideFooterCta?: boolean;
  }): void {
    this.container.innerHTML = '';
    this.container.scrollTop = 0;
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', `Welcome: ${options.title}`);

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

    // "How to get here" link
    if (options.gettingHereAvailable && options.onGettingHere) {
      const gettingHereLink = document.createElement('button');
      gettingHereLink.className = 'maptour-card__getting-here-link';
      gettingHereLink.innerHTML = '<i class="fa-solid fa-map-signs" aria-hidden="true"></i> ' + t('how_to_get_here');
      gettingHereLink.addEventListener('click', options.onGettingHere);
      this.container.appendChild(gettingHereLink);
    }

    // Welcome content blocks
    if (options.welcome && options.welcome.length > 0) {
      const welcomeContent = document.createElement('div');
      welcomeContent.className = 'maptour-card__content';
      options.welcome.forEach((block) => {
        welcomeContent.appendChild(renderBlock(block, true));
      });
      this.container.appendChild(welcomeContent);
    }

    // "Get started" block — prompt to open the map
    if (options.onOpenMap) {
      const getStarted = document.createElement('div');
      getStarted.className = 'maptour-card__get-started';

      const prompt = document.createElement('span');
      prompt.className = 'maptour-card__get-started-text';
      prompt.textContent = t('get_started_prompt');
      getStarted.appendChild(prompt);

      const mapBtn = document.createElement('button');
      mapBtn.className = 'maptour-card__get-started-btn';
      mapBtn.setAttribute('aria-label', t('show_map'));
      mapBtn.innerHTML = '<i class="fa-solid fa-map" aria-hidden="true"></i>';
      mapBtn.addEventListener('click', options.onOpenMap);
      getStarted.appendChild(mapBtn);

      this.container.appendChild(getStarted);
    }

    // CTA button at bottom (hidden on desktop where overview controls provide it)
    if (!options.hideFooterCta) {
      const cta = document.createElement('button');
      cta.className = 'maptour-card__cta';
      cta.textContent = t('begin_tour');
      cta.addEventListener('click', options.onBegin);
      this.container.appendChild(cta);
    }
  }

  // === Getting Here card ===

  renderGettingHere(options: {
    blocks: ContentBlock[];
    onBack: () => void;
  }): void {
    this.container.innerHTML = '';
    this.container.scrollTop = 0;
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', t('getting_here_title'));

    // Header with back button
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const backBtn = document.createElement('button');
    backBtn.className = 'maptour-card__back-btn';
    backBtn.setAttribute('aria-label', t('back'));
    backBtn.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
    backBtn.addEventListener('click', options.onBack);
    header.appendChild(backBtn);

    const title = document.createElement('h2');
    title.className = 'maptour-card__title';
    title.textContent = t('getting_here_title');
    header.appendChild(title);

    this.container.appendChild(header);

    // Content blocks
    const content = document.createElement('div');
    content.className = 'maptour-card__content';
    options.blocks.forEach((block) => {
      content.appendChild(renderBlock(block, true));
    });
    this.container.appendChild(content);
  }

  // === About card ===

  renderAbout(options: {
    onBack: () => void;
  }): void {
    this.container.innerHTML = '';
    this.container.scrollTop = 0;
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', t('menu_about'));

    // Header with back button
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const backBtn = document.createElement('button');
    backBtn.className = 'maptour-card__back-btn';
    backBtn.setAttribute('aria-label', t('back'));
    backBtn.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
    backBtn.addEventListener('click', options.onBack);
    header.appendChild(backBtn);

    const title = document.createElement('h2');
    title.className = 'maptour-card__title';
    title.textContent = t('menu_about');
    header.appendChild(title);

    this.container.appendChild(header);

    // Content
    const content = document.createElement('div');
    content.className = 'maptour-card__content';

    const heading = document.createElement('h3');
    heading.className = 'maptour-card__about-heading';
    heading.textContent = t('about_heading');
    content.appendChild(heading);

    const desc = document.createElement('p');
    desc.className = 'maptour-card__about-description';
    desc.textContent = t('about_description');
    content.appendChild(desc);

    const link = document.createElement('a');
    link.className = 'maptour-card__about-link';
    link.href = 'https://github.com/mieslep/maptour';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'github.com/mieslep/maptour';
    content.appendChild(link);

    this.container.appendChild(content);
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
