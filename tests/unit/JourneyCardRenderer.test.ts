import { describe, it, expect, beforeEach } from 'vitest';
import { JourneyCardRenderer } from '../../src/card/JourneyCardRenderer';
import type { Waypoint } from '../../src/types';

describe('JourneyCardRenderer.renderWaypoint', () => {
  let renderer: JourneyCardRenderer;
  let container: HTMLElement;

  beforeEach(() => {
    renderer = new JourneyCardRenderer();
    container = document.createElement('div');
  });

  it('renders content blocks', () => {
    const wp: Waypoint = {
      coords: [52.5, -6.5],
      text: 'The warehouses',
      content: [
        { type: 'text', body: 'Built in 1847' },
        { type: 'text', body: 'Restored in 2019' },
      ],
    };
    renderer.renderWaypoint(container, wp);
    const content = container.querySelector('.maptour-card__content');
    expect(content).not.toBeNull();
    expect(content?.children.length).toBe(2);
  });

  it('does not render content section when no content blocks', () => {
    const wp: Waypoint = {
      coords: [52.5, -6.5],
      text: 'Light waypoint promoted with journey_card flag',
      journey_card: true,
    };
    renderer.renderWaypoint(container, wp);
    const content = container.querySelector('.maptour-card__content');
    expect(content).toBeNull();
  });

  it('does not render a title or header', () => {
    const wp: Waypoint = {
      coords: [52.5, -6.5],
      text: 'Some text',
      content: [{ type: 'text', body: 'Card content' }],
    };
    renderer.renderWaypoint(container, wp);
    expect(container.querySelector('.maptour-card__title')).toBeNull();
    expect(container.querySelector('.maptour-card__header')).toBeNull();
  });

  it('sets aria-label from waypoint text', () => {
    const wp: Waypoint = { coords: [52.5, -6.5], text: 'Cross the footbridge' };
    renderer.renderWaypoint(container, wp);
    expect(container.getAttribute('aria-label')).toBe('Cross the footbridge');
  });

  it('uses fallback aria-label when text is empty', () => {
    const wp: Waypoint = {
      coords: [52.5, -6.5],
      text: '',
      content: [{ type: 'text', body: 'Some content' }],
    };
    renderer.renderWaypoint(container, wp);
    expect(container.getAttribute('aria-label')).toBe('Journey card');
  });
});
