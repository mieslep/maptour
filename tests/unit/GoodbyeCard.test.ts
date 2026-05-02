import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderGoodbyeCard } from '../../src/card/GoodbyeCard';

function makeOpts(overrides = {}) {
  return { visitedCount: 5, totalStops: 10, onRestartTour: vi.fn(), onBrowseStops: vi.fn(), ...overrides };
}

describe('renderGoodbyeCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders tour complete heading', () => {
    renderGoodbyeCard(container, makeOpts());
    const title = container.querySelector('.maptour-card__title');
    expect(title?.textContent).toBeTruthy();
  });

  it('renders visited count', () => {
    renderGoodbyeCard(container, makeOpts({ visitedCount: 7 }));
    const meta = container.querySelector('.maptour-card__meta');
    expect(meta?.textContent).toBeTruthy();
  });

  it('renders checkmark icon', () => {
    renderGoodbyeCard(container, makeOpts());
    expect(container.querySelector('.maptour-complete__icon')).toBeTruthy();
  });

  it('renders restart button that fires callback', () => {
    const onRestartTour = vi.fn();
    renderGoodbyeCard(container, makeOpts({ onRestartTour }));
    const btn = container.querySelector('.maptour-card__cta') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(onRestartTour).toHaveBeenCalledOnce();
  });

  it('renders browse stops button that fires callback', () => {
    const onBrowseStops = vi.fn();
    renderGoodbyeCard(container, makeOpts({ onBrowseStops }));
    const btn = container.querySelector('.maptour-card__cta--secondary') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(onBrowseStops).toHaveBeenCalledOnce();
  });

  it('renders close link when closeUrl provided', () => {
    renderGoodbyeCard(container, makeOpts({ closeUrl: 'https://example.com' }));
    const link = container.querySelector('.maptour-card__close-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.href).toBe('https://example.com/');
  });

  it('does not render close link without closeUrl', () => {
    renderGoodbyeCard(container, makeOpts());
    expect(container.querySelector('.maptour-card__close-link')).toBeNull();
  });

  it('sets aria-label', () => {
    renderGoodbyeCard(container, makeOpts());
    expect(container.getAttribute('aria-label')).toBe('Tour complete');
  });

  it('renders goodbye content blocks when provided (TOUR-050)', () => {
    renderGoodbyeCard(container, makeOpts({
      goodbye: [
        { type: 'text', body: 'Thanks for visiting!' },
        { type: 'text', body: 'Come back soon.' },
      ],
    }));
    const content = container.querySelector('.maptour-card__content');
    expect(content).not.toBeNull();
    // Two text blocks rendered
    expect(content!.querySelectorAll('.maptour-block--text').length).toBe(2);
  });

  it('does not render goodbye content section when array is empty (TOUR-050)', () => {
    renderGoodbyeCard(container, makeOpts({ goodbye: [] }));
    expect(container.querySelector('.maptour-card__content')).toBeNull();
  });
});
