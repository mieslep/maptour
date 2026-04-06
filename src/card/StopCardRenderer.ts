import type { Stop } from '../types';
import { renderBlock } from './blocks/renderBlock';

export class StopCardRenderer {
  render(container: HTMLElement, stop: Stop, stopNumber: number, totalStops: number): void {
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', `Stop ${stopNumber}: ${stop.title}`);

    // Stop header
    const header = document.createElement('div');
    header.className = 'maptour-card__header';

    const headerText = document.createElement('div');
    headerText.className = 'maptour-card__header-text';

    const title = document.createElement('h2');
    title.className = 'maptour-card__title';
    title.textContent = stop.title;
    headerText.appendChild(title);

    header.appendChild(headerText);
    container.appendChild(header);

    // Content blocks
    const content = document.createElement('div');
    content.className = 'maptour-card__content';
    stop.content.forEach((block) => {
      content.appendChild(renderBlock(block, true));
    });
    container.appendChild(content);
  }
}
