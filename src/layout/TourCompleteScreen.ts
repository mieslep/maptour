import type { ContentBlock } from '../types';
import { renderTextBlock } from '../card/blocks/TextBlock';
import { renderImageBlock } from '../card/blocks/ImageBlock';
import { renderGalleryBlock } from '../card/blocks/GalleryBlock';
import { renderVideoBlock } from '../card/blocks/VideoBlock';
import { renderAudioBlock } from '../card/blocks/AudioBlock';

function renderBlock(block: ContentBlock): HTMLElement {
  switch (block.type) {
    case 'text':    return renderTextBlock(block);
    case 'image':   return renderImageBlock(block);
    case 'gallery': return renderGalleryBlock(block);
    case 'video':   return renderVideoBlock(block, false);
    case 'audio':   return renderAudioBlock(block);
  }
}

export interface TourCompleteScreenOptions {
  visitedCount: number;
  totalStops: number;
  onReview: () => void;
  closeUrl?: string;
  goodbye?: ContentBlock[];
}

export class TourCompleteScreen {
  private readonly el: HTMLElement;

  constructor(container: HTMLElement, options: TourCompleteScreenOptions) {
    this.el = document.createElement('div');
    this.el.className = 'maptour-complete';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-label', 'Tour complete');

    const body = document.createElement('div');
    body.className = 'maptour-complete__body';

    const icon = document.createElement('div');
    icon.className = 'maptour-complete__icon';
    icon.setAttribute('aria-hidden', 'true');
    body.appendChild(icon);

    const heading = document.createElement('h2');
    heading.className = 'maptour-complete__heading';
    heading.textContent = 'Tour complete!';
    body.appendChild(heading);

    const count = document.createElement('p');
    count.className = 'maptour-complete__count';
    count.textContent = `${options.visitedCount} / ${options.totalStops} stops visited`;
    body.appendChild(count);

    // Goodbye content blocks (optional)
    if (options.goodbye && options.goodbye.length > 0) {
      const goodbyeEl = document.createElement('div');
      goodbyeEl.className = 'maptour-complete__goodbye';
      options.goodbye.forEach((block) => {
        goodbyeEl.appendChild(renderBlock(block));
      });
      body.appendChild(goodbyeEl);
    }

    const review = document.createElement('button');
    review.className = 'maptour-complete__review';
    review.textContent = 'Revisit tour';
    review.addEventListener('click', options.onReview);
    body.appendChild(review);

    if (options.closeUrl) {
      const close = document.createElement('a');
      close.className = 'maptour-complete__close';
      close.href = options.closeUrl;
      close.textContent = 'Close';
      body.appendChild(close);
    }

    this.el.appendChild(body);
    container.appendChild(this.el);

    requestAnimationFrame(() => review.focus());
  }

  destroy(): void {
    this.el.remove();
  }
}
