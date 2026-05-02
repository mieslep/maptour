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
