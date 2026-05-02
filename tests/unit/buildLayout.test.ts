import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildMobileLayout } from '../../src/layout/buildMobileLayout';
import { buildDesktopLayout } from '../../src/layout/buildDesktopLayout';

// jsdom doesn't implement ResizeObserver (needed by BottomSheet)
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - mock
globalThis.ResizeObserver = MockResizeObserver;

function makeContainer(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

function makeMapPane(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'maptour-map-pane';
  return el;
}

function makeMenuBar(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'maptour-menu-bar';
  return el;
}

describe('buildMobileLayout', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = makeContainer();
  });

  it('returns expected LayoutComponents shape', () => {
    const layout = buildMobileLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(layout.mapPanel).not.toBeNull();
    expect(layout.sheet).toBeNull();
    expect(layout.sheetContentEl).toBeNull();
    expect(layout.cardEl).toBeInstanceOf(HTMLElement);
    expect(layout.stopListWrapper).toBeInstanceOf(HTMLElement);
    expect(layout.stopListEl).toBeInstanceOf(HTMLElement);
    expect(typeof layout.resetScrollHint).toBe('function');
  });

  it('creates a card element with correct class', () => {
    const layout = buildMobileLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(layout.cardEl.className).toBe('maptour-card');
  });

  it('creates stop list elements with correct structure', () => {
    const layout = buildMobileLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(layout.stopListWrapper.className).toBe('maptour-stop-list-wrapper');
    expect(layout.stopListEl.id).toBe('maptour-stop-list');
    expect(layout.stopListWrapper.contains(layout.stopListEl)).toBe(true);
  });

  it('appends card-view to container', () => {
    buildMobileLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(container.querySelector('.maptour-card-view')).not.toBeNull();
  });

  it('card-view contains stop list wrapper and card', () => {
    const layout = buildMobileLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    const cardView = container.querySelector('.maptour-card-view')!;
    expect(cardView.contains(layout.stopListWrapper)).toBe(true);
    expect(cardView.contains(layout.cardEl)).toBe(true);
  });

  it('includes a scroll hint element', () => {
    buildMobileLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(container.querySelector('.maptour-scroll-hint')).not.toBeNull();
  });

  describe('scrollHintMode', () => {
    it('default (auto) renders the scroll-hint element without --always modifier', () => {
      const layout = buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: makeMenuBar(),
      });
      const hint = container.querySelector('.maptour-scroll-hint');
      expect(hint).not.toBeNull();
      expect(hint!.classList.contains('maptour-scroll-hint--always')).toBe(false);
      expect(typeof layout.resetScrollHint).toBe('function');
    });

    it('"always" adds the --always modifier and injects the explicit content', () => {
      const layout = buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: makeMenuBar(),
        scrollHintMode: 'always',
      });
      const hint = container.querySelector('.maptour-scroll-hint');
      expect(hint).not.toBeNull();
      expect(hint!.classList.contains('maptour-scroll-hint--always')).toBe(true);
      expect(hint!.querySelector('i.fa-solid.fa-chevron-down')).not.toBeNull();
      expect(hint!.textContent).toContain('Scroll for more');
      expect(typeof layout.resetScrollHint).toBe('function');
    });

    it('"off" omits the scroll-hint element entirely and returns null resetScrollHint', () => {
      const layout = buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: makeMenuBar(),
        scrollHintMode: 'off',
      });
      expect(container.querySelector('.maptour-scroll-hint')).toBeNull();
      expect(layout.resetScrollHint).toBeNull();
    });

    it('"off" mode does not throw when card content mutates', () => {
      const layout = buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: makeMenuBar(),
        scrollHintMode: 'off',
      });
      expect(() => {
        const child = document.createElement('p');
        child.textContent = 'mutate';
        layout.cardEl.appendChild(child);
      }).not.toThrow();
      expect(container.querySelector('.maptour-scroll-hint')).toBeNull();
    });
  });

  it('creates a map panel in the container', () => {
    buildMobileLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(container.querySelector('.maptour-map-panel')).not.toBeNull();
  });

  describe('auto-hide menu bar (TOUR-049)', () => {
    it('scrolling down past 56px hides the menu bar and adds card-view modifier', () => {
      const menuBar = makeMenuBar();
      const layout = buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: menuBar,
      });
      const cardView = container.querySelector('.maptour-card-view') as HTMLElement;

      // Simulate scrolling down past the threshold.
      Object.defineProperty(cardView, 'scrollTop', { value: 100, configurable: true });
      cardView.dispatchEvent(new Event('scroll'));

      expect(menuBar.classList.contains('maptour-menu-bar--hidden')).toBe(true);
      expect(cardView.classList.contains('maptour-card-view--menu-hidden')).toBe(true);
      // Sanity: layout returned ok
      expect(layout.cardEl).toBeInstanceOf(HTMLElement);
    });

    it('scrolling up reveals the menu bar again', () => {
      const menuBar = makeMenuBar();
      buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: menuBar,
      });
      const cardView = container.querySelector('.maptour-card-view') as HTMLElement;

      Object.defineProperty(cardView, 'scrollTop', { value: 100, configurable: true });
      cardView.dispatchEvent(new Event('scroll'));
      expect(menuBar.classList.contains('maptour-menu-bar--hidden')).toBe(true);

      // Scroll back up
      Object.defineProperty(cardView, 'scrollTop', { value: 50, configurable: true });
      cardView.dispatchEvent(new Event('scroll'));
      expect(menuBar.classList.contains('maptour-menu-bar--hidden')).toBe(false);
      expect(cardView.classList.contains('maptour-card-view--menu-hidden')).toBe(false);
    });

    it('staying near the top (<= 56px) keeps the menu bar visible', () => {
      const menuBar = makeMenuBar();
      buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: menuBar,
      });
      const cardView = container.querySelector('.maptour-card-view') as HTMLElement;

      Object.defineProperty(cardView, 'scrollTop', { value: 30, configurable: true });
      cardView.dispatchEvent(new Event('scroll'));

      expect(menuBar.classList.contains('maptour-menu-bar--hidden')).toBe(false);
    });
  });

  describe('scroll-hint observer + reset (TOUR-049)', () => {
    function makeOverflowingCard(layout: ReturnType<typeof buildMobileLayout>) {
      const card = layout.cardEl;
      // Force "has overflow" by stubbing scroll metrics.
      Object.defineProperty(card, 'scrollHeight', { value: 1000, configurable: true });
      Object.defineProperty(card, 'clientHeight', { value: 200, configurable: true });
      Object.defineProperty(card, 'scrollTop', { value: 0, configurable: true, writable: true });
      return card;
    }

    it('resetScrollHint removes the --hidden class so the hint reappears', () => {
      const layout = buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: makeMenuBar(),
      });
      const hint = container.querySelector('.maptour-scroll-hint') as HTMLElement;
      hint.classList.add('maptour-scroll-hint--hidden');

      layout.resetScrollHint!();
      expect(hint.classList.contains('maptour-scroll-hint--hidden')).toBe(false);
    });

    it('hides the hint once the card is scrolled past 20px', () => {
      const layout = buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: makeMenuBar(),
      });
      const card = makeOverflowingCard(layout);
      const hint = container.querySelector('.maptour-scroll-hint') as HTMLElement;

      // Initial: scrollTop=0 -> hint visible (no --hidden)
      card.dispatchEvent(new Event('scroll'));
      expect(hint.classList.contains('maptour-scroll-hint--hidden')).toBe(false);

      // Scroll past 20px -> hidden
      Object.defineProperty(card, 'scrollTop', { value: 50, configurable: true });
      card.dispatchEvent(new Event('scroll'));
      expect(hint.classList.contains('maptour-scroll-hint--hidden')).toBe(true);
    });

    it('hides the hint when the card has no overflow', () => {
      const layout = buildMobileLayout({
        container,
        mapPane: makeMapPane(),
        menuBarEl: makeMenuBar(),
      });
      const card = layout.cardEl;
      Object.defineProperty(card, 'scrollHeight', { value: 100, configurable: true });
      Object.defineProperty(card, 'clientHeight', { value: 200, configurable: true });
      const hint = container.querySelector('.maptour-scroll-hint') as HTMLElement;

      card.dispatchEvent(new Event('scroll'));
      expect(hint.classList.contains('maptour-scroll-hint--hidden')).toBe(true);
    });
  });
});

describe('buildDesktopLayout', () => {
  let container: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = makeContainer();
  });

  it('returns expected LayoutComponents shape', () => {
    const layout = buildDesktopLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(layout.mapPanel).toBeNull();
    expect(layout.sheet).not.toBeNull();
    expect(layout.sheetContentEl).toBeInstanceOf(HTMLElement);
    expect(layout.cardEl).toBeInstanceOf(HTMLElement);
    expect(layout.stopListWrapper).toBeInstanceOf(HTMLElement);
    expect(layout.stopListEl).toBeInstanceOf(HTMLElement);
    expect(layout.resetScrollHint).toBeNull();
  });

  it('creates a card element with correct class', () => {
    const layout = buildDesktopLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(layout.cardEl.className).toBe('maptour-card');
  });

  it('creates stop list elements with correct structure', () => {
    const layout = buildDesktopLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(layout.stopListWrapper.className).toBe('maptour-stop-list-wrapper');
    expect(layout.stopListEl.id).toBe('maptour-stop-list');
    expect(layout.stopListWrapper.contains(layout.stopListEl)).toBe(true);
  });

  it('appends map pane to container', () => {
    const mapPane = makeMapPane();
    buildDesktopLayout({
      container,
      mapPane,
      menuBarEl: makeMenuBar(),
    });

    expect(container.contains(mapPane)).toBe(true);
  });

  it('sheetContentEl contains menu bar, stop list wrapper, and card', () => {
    const menuBar = makeMenuBar();
    const layout = buildDesktopLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: menuBar,
    });

    const content = layout.sheetContentEl!;
    expect(content.className).toBe('maptour-sheet-content');
    expect(content.contains(menuBar)).toBe(true);
    expect(content.contains(layout.stopListWrapper)).toBe(true);
    expect(content.contains(layout.cardEl)).toBe(true);
  });

  it('creates a bottom sheet wrapper in the container', () => {
    buildDesktopLayout({
      container,
      mapPane: makeMapPane(),
      menuBarEl: makeMenuBar(),
    });

    expect(container.querySelector('.maptour-sheet')).not.toBeNull();
  });
});
