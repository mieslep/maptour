import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderGettingHereCard } from '../../src/card/GettingHereCard';

describe('renderGettingHereCard', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders header with back button', () => {
    const onBack = vi.fn();
    renderGettingHereCard(container, { blocks: [], onBack });
    const backBtn = container.querySelector('.maptour-card__back-btn') as HTMLButtonElement;
    expect(backBtn).toBeTruthy();
    backBtn.click();
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders title', () => {
    renderGettingHereCard(container, { blocks: [], onBack: vi.fn() });
    const title = container.querySelector('.maptour-card__title');
    expect(title?.textContent).toBeTruthy();
  });

  it('renders content blocks', () => {
    renderGettingHereCard(container, {
      blocks: [{ type: 'text', body: 'Take the bus to...' }],
      onBack: vi.fn(),
    });
    const content = container.querySelector('.maptour-card__content');
    expect(content).toBeTruthy();
    expect(content?.children.length).toBe(1);
  });

  it('sets aria-label', () => {
    renderGettingHereCard(container, { blocks: [], onBack: vi.fn() });
    expect(container.getAttribute('aria-label')).toBeTruthy();
  });
});
