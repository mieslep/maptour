import { describe, it, expect, beforeEach } from 'vitest';
import { StopCardRenderer } from '../../src/card/StopCardRenderer';
import type { Stop } from '../../src/types';

function makeStop(overrides: Partial<Stop> = {}): Stop {
  return {
    id: 1,
    title: 'Stop One',
    coords: [52.5, -6.56],
    content: [{ type: 'text', body: 'Hello' }],
    ...overrides,
  };
}

describe('StopCardRenderer', () => {
  let container: HTMLElement;
  let renderer: StopCardRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    renderer = new StopCardRenderer();
  });

  it('renders stop title', () => {
    renderer.render(container, makeStop(), 1, 5);
    expect(container.querySelector('.maptour-card__title')?.textContent).toBe('Stop One');
  });

  it('sets aria-label with stop number and title', () => {
    renderer.render(container, makeStop(), 3, 10);
    expect(container.getAttribute('aria-label')).toBe('Stop 3: Stop One');
  });

  it('renders content blocks', () => {
    renderer.render(container, makeStop(), 1, 5);
    expect(container.querySelector('.maptour-card__content')).toBeTruthy();
  });

  it('does not render footer (footer moved to TourFooter)', () => {
    renderer.render(container, makeStop(), 1, 5);
    expect(container.querySelector('.maptour-card__next-stop')).toBeNull();
    expect(container.querySelector('.maptour-card__finish')).toBeNull();
  });

  it('shows getting_here note when not on starting stop', () => {
    renderer.setStartingStop(0);
    const stop = makeStop({ getting_here: { mode: 'walk', note: 'Walk 5 min' } });
    renderer.render(container, stop, 2, 5); // stopNumber=2, startingStopIndex=0 → show
    expect(container.querySelector('.maptour-card__getting-here-note')).toBeTruthy();
  });

  it('hides getting_here note on starting stop', () => {
    renderer.setStartingStop(0);
    const stop = makeStop({ getting_here: { mode: 'walk', note: 'Walk 5 min' } });
    renderer.render(container, stop, 1, 5); // stopNumber=1 → (1-1)=0 === startingStopIndex → hide
    expect(container.querySelector('.maptour-card__getting-here-note')).toBeNull();
  });

  it('hides getting_here note when suppressed', () => {
    renderer.setStartingStop(0);
    renderer.setSuppressGettingHereNote(true);
    const stop = makeStop({ getting_here: { mode: 'walk', note: 'Walk 5 min' } });
    renderer.render(container, stop, 2, 5);
    expect(container.querySelector('.maptour-card__getting-here-note')).toBeNull();
  });
});
