import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StopListOverlay } from '../../src/layout/StopListOverlay';
import type { Stop } from '../../src/types';

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function makeStops(count = 3): Stop[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    title: `Stop ${i + 1}`,
    coords: [52 + i * 0.01, -8 + i * 0.01] as [number, number],
    content: [],
    getting_here: { mode: 'walk' as const },
  }));
}

describe('StopListOverlay', () => {
  let container: HTMLElement;
  let overlay: StopListOverlay;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = makeContainer();
    overlay = new StopListOverlay(container);
  });

  it('creates FAB, backdrop, and panel in the container', () => {
    expect(container.querySelector('.maptour-stop-list-fab')).not.toBeNull();
    expect(container.querySelector('.maptour-stop-list-overlay__backdrop')).not.toBeNull();
    expect(container.querySelector('.maptour-stop-list-overlay')).not.toBeNull();
  });

  it('panel and backdrop start hidden', () => {
    const backdrop = container.querySelector('.maptour-stop-list-overlay__backdrop') as HTMLElement;
    const panel = container.querySelector('.maptour-stop-list-overlay') as HTMLElement;

    expect(backdrop.hidden).toBe(true);
    expect(panel.hidden).toBe(true);
  });

  it('open() shows backdrop and panel', () => {
    const stops = makeStops();
    overlay.update(stops, 0, new Set());
    overlay.open();

    const backdrop = container.querySelector('.maptour-stop-list-overlay__backdrop') as HTMLElement;
    const panel = container.querySelector('.maptour-stop-list-overlay') as HTMLElement;

    expect(backdrop.hidden).toBe(false);
    expect(panel.hidden).toBe(false);
  });

  it('close() hides backdrop and panel', () => {
    const stops = makeStops();
    overlay.update(stops, 0, new Set());
    overlay.open();
    overlay.close();

    const backdrop = container.querySelector('.maptour-stop-list-overlay__backdrop') as HTMLElement;
    const panel = container.querySelector('.maptour-stop-list-overlay') as HTMLElement;

    expect(backdrop.hidden).toBe(true);
    expect(panel.hidden).toBe(true);
  });

  it('clicking FAB opens the overlay', () => {
    const stops = makeStops();
    overlay.update(stops, 0, new Set());

    const fab = container.querySelector('.maptour-stop-list-fab') as HTMLElement;
    fab.click();

    const panel = container.querySelector('.maptour-stop-list-overlay') as HTMLElement;
    expect(panel.hidden).toBe(false);
  });

  it('clicking backdrop closes the overlay', () => {
    overlay.update(makeStops(), 0, new Set());
    overlay.open();

    const backdrop = container.querySelector('.maptour-stop-list-overlay__backdrop') as HTMLElement;
    backdrop.click();

    const panel = container.querySelector('.maptour-stop-list-overlay') as HTMLElement;
    expect(panel.hidden).toBe(true);
  });

  it('open() renders stops as list items', () => {
    const stops = makeStops(3);
    overlay.update(stops, 0, new Set());
    overlay.open();

    const items = container.querySelectorAll('.maptour-stop-list__item');
    expect(items.length).toBe(3);
  });

  it('renders stop titles', () => {
    const stops = makeStops(2);
    overlay.update(stops, 0, new Set());
    overlay.open();

    const titles = container.querySelectorAll('.maptour-stop-list__title');
    expect(titles[0].textContent).toBe('Stop 1');
    expect(titles[1].textContent).toBe('Stop 2');
  });

  it('marks the active stop', () => {
    const stops = makeStops(3);
    overlay.update(stops, 1, new Set());
    overlay.open();

    const items = container.querySelectorAll('.maptour-stop-list__item');
    expect(items[1].classList.contains('maptour-stop-list__item--active')).toBe(true);
    expect(items[0].classList.contains('maptour-stop-list__item--active')).toBe(false);
  });

  it('marks visited stops', () => {
    const stops = makeStops(3);
    overlay.update(stops, 2, new Set([1, 2]));
    overlay.open();

    const items = container.querySelectorAll('.maptour-stop-list__item');
    expect(items[0].classList.contains('maptour-stop-list__item--visited')).toBe(true);
    expect(items[1].classList.contains('maptour-stop-list__item--visited')).toBe(true);
    expect(items[2].classList.contains('maptour-stop-list__item--visited')).toBe(false);
  });

  it('onSelect callback fires when stop item is clicked', () => {
    const stops = makeStops(3);
    overlay.update(stops, 0, new Set());

    const cb = vi.fn();
    overlay.onSelect(cb);

    overlay.open();

    const items = container.querySelectorAll('.maptour-stop-list__item');
    (items[1] as HTMLElement).click();

    expect(cb).toHaveBeenCalledWith(1);
  });

  it('clicking a stop item closes the overlay', () => {
    const stops = makeStops(3);
    overlay.update(stops, 0, new Set());
    overlay.open();

    const items = container.querySelectorAll('.maptour-stop-list__item');
    (items[0] as HTMLElement).click();

    const panel = container.querySelector('.maptour-stop-list-overlay') as HTMLElement;
    expect(panel.hidden).toBe(true);
  });

  it('renders header with title and close button', () => {
    overlay.update(makeStops(), 0, new Set());
    overlay.open();

    expect(container.querySelector('.maptour-stop-list-overlay__title')).not.toBeNull();
    expect(container.querySelector('.maptour-stop-list-overlay__close')).not.toBeNull();
  });

  it('close button in header closes overlay', () => {
    overlay.update(makeStops(), 0, new Set());
    overlay.open();

    const closeBtn = container.querySelector('.maptour-stop-list-overlay__close') as HTMLElement;
    closeBtn.click();

    const panel = container.querySelector('.maptour-stop-list-overlay') as HTMLElement;
    expect(panel.hidden).toBe(true);
  });

  it('panel has correct ARIA attributes', () => {
    const panel = container.querySelector('.maptour-stop-list-overlay') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
  });

  it('update with custom tourOrder renders stops in that order', () => {
    const stops = makeStops(3);
    // Reversed order: stop 2, stop 1, stop 0
    overlay.update(stops, 0, new Set(), [2, 1, 0]);
    overlay.open();

    const titles = container.querySelectorAll('.maptour-stop-list__title');
    expect(titles[0].textContent).toBe('Stop 3'); // index 2
    expect(titles[1].textContent).toBe('Stop 2'); // index 1
    expect(titles[2].textContent).toBe('Stop 1'); // index 0
  });

  it('marks start and end stops with number classes', () => {
    const stops = makeStops(3);
    overlay.update(stops, 0, new Set());
    overlay.open();

    const numbers = container.querySelectorAll('.maptour-stop-list__number');
    expect(numbers[0].classList.contains('maptour-stop-list__number--start')).toBe(true);
    expect(numbers[2].classList.contains('maptour-stop-list__number--end')).toBe(true);
    expect(numbers[1].classList.contains('maptour-stop-list__number--start')).toBe(false);
    expect(numbers[1].classList.contains('maptour-stop-list__number--end')).toBe(false);
  });
});
