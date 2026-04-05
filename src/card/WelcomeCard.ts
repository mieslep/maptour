import type { ContentBlock } from '../types';
import { t } from '../i18n';
import { renderBlock } from './blocks/renderBlock';

export interface WelcomeCardOptions {
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
}

export function renderWelcomeCard(container: HTMLElement, options: WelcomeCardOptions): void {
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', `Welcome: ${options.title}`);

  // Tour title
  const title = document.createElement('h1');
  title.className = 'maptour-card__title';
  title.textContent = options.title;
  container.appendChild(title);

  // Meta (stop count + duration)
  const meta = document.createElement('p');
  meta.className = 'maptour-card__meta';
  const stopLabel = `${options.stopCount} stop${options.stopCount !== 1 ? 's' : ''}`;
  meta.textContent = options.duration ? `${stopLabel} · ${options.duration}` : stopLabel;
  container.appendChild(meta);

  // "How to get here" link
  if (options.gettingHereAvailable && options.onGettingHere) {
    const gettingHereLink = document.createElement('button');
    gettingHereLink.className = 'maptour-card__getting-here-link';
    gettingHereLink.innerHTML = '<i class="fa-solid fa-map-signs" aria-hidden="true"></i> ' + t('how_to_get_here');
    gettingHereLink.addEventListener('click', options.onGettingHere);
    container.appendChild(gettingHereLink);
  }

  // Welcome content blocks
  if (options.welcome && options.welcome.length > 0) {
    const welcomeContent = document.createElement('div');
    welcomeContent.className = 'maptour-card__content';
    options.welcome.forEach((block) => {
      welcomeContent.appendChild(renderBlock(block, true));
    });
    container.appendChild(welcomeContent);
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

    container.appendChild(getStarted);
  }

  // CTA button at bottom (hidden on desktop where overview controls provide it)
  if (!options.hideFooterCta) {
    const cta = document.createElement('button');
    cta.className = 'maptour-card__cta';
    cta.textContent = t('begin_tour');
    cta.addEventListener('click', options.onBegin);
    container.appendChild(cta);
  }
}
