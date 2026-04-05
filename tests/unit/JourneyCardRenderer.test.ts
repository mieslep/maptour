import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JourneyCardRenderer } from '../../src/card/JourneyCardRenderer';
import type { Waypoint } from '../../src/types';

describe('JourneyCardRenderer.renderWaypoint', () => {
  let renderer: JourneyCardRenderer;
  let container: HTMLElement;

  beforeEach(() => {
    renderer = new JourneyCardRenderer();
    container = document.createElement('div');
  });

  it('renders waypoint text as card title', () => {
    const wp: Waypoint = { coords: [52.5, -6.5], text: 'Head towards the bridge' };
    renderer.renderWaypoint(container, wp, vi.fn());
    const title = container.querySelector('.maptour-card__title');
    expect(title?.textContent).toBe('Head towards the bridge');
  });

  it('renders photo as hero image when present', () => {
    const wp: Waypoint = {
      coords: [52.5, -6.5],
      text: 'The old mill',
      photo: 'https://example.com/mill.jpg',
    };
    renderer.renderWaypoint(container, wp, vi.fn());
    const img = container.querySelector('.maptour-card__hero-img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe('https://example.com/mill.jpg');
  });

  it('does not render hero image when photo is absent', () => {
    const wp: Waypoint = { coords: [52.5, -6.5], text: 'Just text' };
    renderer.renderWaypoint(container, wp, vi.fn());
    const img = container.querySelector('.maptour-card__hero-img');
    expect(img).toBeNull();
  });

  it('renders content blocks when present', () => {
    const wp: Waypoint = {
      coords: [52.5, -6.5],
      text: 'The warehouses',
      content: [
        { type: 'text', body: 'Built in 1847' },
        { type: 'text', body: 'Restored in 2019' },
      ],
    };
    renderer.renderWaypoint(container, wp, vi.fn());
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
    renderer.renderWaypoint(container, wp, vi.fn());
    const content = container.querySelector('.maptour-card__content');
    expect(content).toBeNull();
  });

  it('renders Continue button that calls onContinue', () => {
    const onContinue = vi.fn();
    const wp: Waypoint = { coords: [52.5, -6.5], text: 'Keep going' };
    renderer.renderWaypoint(container, wp, onContinue);
    const btn = container.querySelector('.maptour-card__arrived-btn') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe('Continue');
    btn.click();
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('sets aria-label on container from waypoint text', () => {
    const wp: Waypoint = { coords: [52.5, -6.5], text: 'Cross the footbridge' };
    renderer.renderWaypoint(container, wp, vi.fn());
    expect(container.getAttribute('aria-label')).toBe('Cross the footbridge');
  });

  it('renders full waypoint card with text, photo, and content', () => {
    const wp: Waypoint = {
      coords: [52.5, -6.5],
      text: 'The harbour warehouses',
      photo: 'https://example.com/warehouses.jpg',
      content: [
        { type: 'text', body: 'Three restored 19th-century warehouses' },
      ],
      radius: 25,
    };
    renderer.renderWaypoint(container, wp, vi.fn());
    expect(container.querySelector('.maptour-card__title')?.textContent).toBe('The harbour warehouses');
    expect(container.querySelector('.maptour-card__hero-img')).not.toBeNull();
    expect(container.querySelector('.maptour-card__content')).not.toBeNull();
    expect(container.querySelector('.maptour-card__arrived-btn')).not.toBeNull();
  });
});
