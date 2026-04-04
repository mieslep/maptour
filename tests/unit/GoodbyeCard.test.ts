import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderGoodbyeCard } from '../../src/card/GoodbyeCard';

describe('renderGoodbyeCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders tour complete heading', () => {
    renderGoodbyeCard(container, { visitedCount: 5, totalStops: 10, onReview: vi.fn() });
    const title = container.querySelector('.maptour-card__title');
    expect(title?.textContent).toBeTruthy();
  });

  it('renders visited count', () => {
    renderGoodbyeCard(container, { visitedCount: 7, totalStops: 10, onReview: vi.fn() });
    const meta = container.querySelector('.maptour-card__meta');
    expect(meta?.textContent).toBeTruthy();
  });

  it('renders checkmark icon', () => {
    renderGoodbyeCard(container, { visitedCount: 5, totalStops: 10, onReview: vi.fn() });
    expect(container.querySelector('.maptour-complete__icon')).toBeTruthy();
  });

  it('renders review button that fires callback', () => {
    const onReview = vi.fn();
    renderGoodbyeCard(container, { visitedCount: 5, totalStops: 10, onReview });
    const btn = container.querySelector('.maptour-card__cta') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(onReview).toHaveBeenCalledOnce();
  });

  it('renders close link when closeUrl provided', () => {
    renderGoodbyeCard(container, { visitedCount: 5, totalStops: 10, onReview: vi.fn(), closeUrl: 'https://example.com' });
    const link = container.querySelector('.maptour-card__close-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.href).toBe('https://example.com/');
  });

  it('does not render close link without closeUrl', () => {
    renderGoodbyeCard(container, { visitedCount: 5, totalStops: 10, onReview: vi.fn() });
    expect(container.querySelector('.maptour-card__close-link')).toBeNull();
  });

  it('sets aria-label', () => {
    renderGoodbyeCard(container, { visitedCount: 5, totalStops: 10, onReview: vi.fn() });
    expect(container.getAttribute('aria-label')).toBe('Tour complete');
  });
});
