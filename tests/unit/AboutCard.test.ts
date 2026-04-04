import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderAboutCard } from '../../src/card/AboutCard';

describe('renderAboutCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders header with back button', () => {
    const onBack = vi.fn();
    renderAboutCard(container, { onBack });
    const backBtn = container.querySelector('.maptour-card__back-btn') as HTMLButtonElement;
    expect(backBtn).toBeTruthy();
    backBtn.click();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders about heading', () => {
    renderAboutCard(container, { onBack: vi.fn() });
    expect(container.querySelector('.maptour-card__about-heading')).toBeTruthy();
  });

  it('renders about description', () => {
    renderAboutCard(container, { onBack: vi.fn() });
    expect(container.querySelector('.maptour-card__about-description')).toBeTruthy();
  });

  it('renders github link', () => {
    renderAboutCard(container, { onBack: vi.fn() });
    const link = container.querySelector('.maptour-card__about-link') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.href).toContain('github.com/mieslep/maptour');
    expect(link.target).toBe('_blank');
  });

  it('sets aria-label', () => {
    renderAboutCard(container, { onBack: vi.fn() });
    expect(container.getAttribute('aria-label')).toBeTruthy();
  });
});
