import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWelcomeCard } from '../../src/card/WelcomeCard';

describe('renderWelcomeCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders title', () => {
    renderWelcomeCard(container, { title: 'My Tour', stopCount: 5, onBegin: vi.fn() });
    expect(container.querySelector('h1')?.textContent).toBe('My Tour');
  });

  it('renders description when provided', () => {
    renderWelcomeCard(container, { title: 'T', description: 'A great tour', stopCount: 3, onBegin: vi.fn() });
    expect(container.querySelector('.maptour-card__description')?.textContent).toBe('A great tour');
  });

  it('renders stop count and duration', () => {
    renderWelcomeCard(container, { title: 'T', stopCount: 5, duration: '45 min', onBegin: vi.fn() });
    expect(container.querySelector('.maptour-card__meta')?.textContent).toBe('5 stops · 45 min');
  });

  it('renders singular stop label', () => {
    renderWelcomeCard(container, { title: 'T', stopCount: 1, onBegin: vi.fn() });
    expect(container.querySelector('.maptour-card__meta')?.textContent).toBe('1 stop');
  });

  it('renders CTA button by default', () => {
    const onBegin = vi.fn();
    renderWelcomeCard(container, { title: 'T', stopCount: 3, onBegin });
    const cta = container.querySelector('.maptour-card__cta') as HTMLButtonElement;
    expect(cta).toBeTruthy();
    cta.click();
    expect(onBegin).toHaveBeenCalledOnce();
  });

  it('hides CTA when hideFooterCta is true', () => {
    renderWelcomeCard(container, { title: 'T', stopCount: 3, onBegin: vi.fn(), hideFooterCta: true });
    expect(container.querySelector('.maptour-card__cta')).toBeNull();
  });

  it('renders get-started block when onOpenMap provided', () => {
    const onOpenMap = vi.fn();
    renderWelcomeCard(container, { title: 'T', stopCount: 3, onBegin: vi.fn(), onOpenMap });
    const btn = container.querySelector('.maptour-card__get-started-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    btn.click();
    expect(onOpenMap).toHaveBeenCalledOnce();
  });

  it('does not render get-started block without onOpenMap', () => {
    renderWelcomeCard(container, { title: 'T', stopCount: 3, onBegin: vi.fn() });
    expect(container.querySelector('.maptour-card__get-started')).toBeNull();
  });

  it('renders getting-here link when available', () => {
    const onGettingHere = vi.fn();
    renderWelcomeCard(container, {
      title: 'T', stopCount: 3, onBegin: vi.fn(),
      gettingHereAvailable: true, onGettingHere,
    });
    const link = container.querySelector('.maptour-card__getting-here-link') as HTMLButtonElement;
    expect(link).toBeTruthy();
    link.click();
    expect(onGettingHere).toHaveBeenCalledOnce();
  });

  it('sets aria-label', () => {
    renderWelcomeCard(container, { title: 'My Tour', stopCount: 3, onBegin: vi.fn() });
    expect(container.getAttribute('aria-label')).toBe('Welcome: My Tour');
  });
});
