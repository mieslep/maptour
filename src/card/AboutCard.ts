import { t } from '../i18n';

export interface AboutCardOptions {
  onBack: () => void;
}

export function renderAboutCard(container: HTMLElement, options: AboutCardOptions): void {
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', t('menu_about'));

  // Header with back button
  const header = document.createElement('div');
  header.className = 'maptour-card__header';

  const backBtn = document.createElement('button');
  backBtn.className = 'maptour-card__back-btn';
  backBtn.setAttribute('aria-label', t('back'));
  backBtn.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
  backBtn.addEventListener('click', options.onBack);
  header.appendChild(backBtn);

  const headerText = document.createElement('div');
  headerText.className = 'maptour-card__header-text';
  const title = document.createElement('h2');
  title.className = 'maptour-card__title';
  title.textContent = t('menu_about');
  headerText.appendChild(title);
  header.appendChild(headerText);

  container.appendChild(header);

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

  container.appendChild(content);
}
