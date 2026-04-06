import type { Waypoint } from '../types';
import { renderBlock } from './blocks/renderBlock';

export class JourneyCardRenderer {
  /** Render a journey card for a waypoint (waypoint transit flow). */
  renderWaypoint(container: HTMLElement, waypoint: Waypoint): void {
    container.setAttribute('role', 'region');
    container.setAttribute('aria-label', waypoint.text || 'Journey card');

    // Content blocks — the card's entire presentation
    if (waypoint.content && waypoint.content.length > 0) {
      const content = document.createElement('div');
      content.className = 'maptour-card__content';
      waypoint.content.forEach((block) => {
        content.appendChild(renderBlock(block, true));
      });
      container.appendChild(content);
    }
  }
}
