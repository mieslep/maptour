import type { ContentBlock } from '../types';
import { t } from '../i18n';
import { renderBlock } from './blocks/renderBlock';

export interface GoodbyeCardOptions {
  goodbye?: ContentBlock[];
  visitedCount: number;
  totalStops: number;
  closeUrl?: string;
  onRestartTour: () => void;
  onBrowseStops: () => void;
}

export function renderGoodbyeCard(container: HTMLElement, options: GoodbyeCardOptions): void {
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Tour complete');

  // Checkmark icon
  const icon = document.createElement('div');
  icon.className = 'maptour-complete__icon';
  icon.setAttribute('aria-hidden', 'true');
  container.appendChild(icon);

  // Heading
  const heading = document.createElement('h2');
  heading.className = 'maptour-card__title';
  heading.textContent = t('tour_complete');
  container.appendChild(heading);

  // Visited count
  const count = document.createElement('p');
  count.className = 'maptour-card__meta';
  count.textContent = t('stops_visited', { n: options.visitedCount, total: options.totalStops });
  container.appendChild(count);

  // Goodbye content blocks
  if (options.goodbye && options.goodbye.length > 0) {
    const goodbyeContent = document.createElement('div');
    goodbyeContent.className = 'maptour-card__content';
    options.goodbye.forEach((block) => {
      goodbyeContent.appendChild(renderBlock(block, true));
    });
    container.appendChild(goodbyeContent);
  }

  // "What next?" label
  const whatNext = document.createElement('p');
  whatNext.className = 'maptour-card__meta';
  whatNext.textContent = t('revisit');
  container.appendChild(whatNext);

  // Take tour again button
  const restartBtn = document.createElement('button');
  restartBtn.className = 'maptour-card__cta';
  restartBtn.textContent = t('revisit_yes');
  restartBtn.addEventListener('click', options.onRestartTour);
  container.appendChild(restartBtn);

  // Browse stops button
  const browseBtn = document.createElement('button');
  browseBtn.className = 'maptour-card__cta maptour-card__cta--secondary';
  browseBtn.textContent = t('revisit_no');
  browseBtn.addEventListener('click', options.onBrowseStops);
  container.appendChild(browseBtn);

  // Close link
  if (options.closeUrl) {
    const close = document.createElement('a');
    close.className = 'maptour-card__close-link';
    close.href = options.closeUrl;
    close.textContent = t('close');
    container.appendChild(close);
  }
}
