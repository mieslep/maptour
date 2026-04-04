import type { ContentBlock } from '../types';
import { t } from '../i18n';
import { renderBlock } from './blocks/renderBlock';

export interface GettingHereCardOptions {
  blocks: ContentBlock[];
  onBack: () => void;
}

export function renderGettingHereCard(container: HTMLElement, options: GettingHereCardOptions): void {
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', t('getting_here_title'));

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

  container.appendChild(header);

  // Content blocks
  const content = document.createElement('div');
  content.className = 'maptour-card__content';
  options.blocks.forEach((block) => {
    content.appendChild(renderBlock(block, true));
  });
  container.appendChild(content);
}
