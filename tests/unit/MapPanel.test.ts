import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapPanel } from '../../src/layout/MapPanel';

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

describe('MapPanel', () => {
  let container: HTMLElement;
  let mapPane: HTMLElement;
  let panel: MapPanel;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = makeContainer();
    mapPane = makeMapPane();
    panel = new MapPanel(container, mapPane);
  });

  it('starts closed', () => {
    expect(panel.isOpen()).toBe(false);
  });

  it('creates panel in container', () => {
    expect(container.querySelector('.maptour-map-panel')).not.toBeNull();
  });

  it('FAB shows map icon initially', () => {
    const btn = panel.getOpenButton();
    expect(btn.querySelector('.fa-map')).not.toBeNull();
  });

  it('FAB switches to X icon when map is open', () => {
    panel.show();
    const btn = panel.getOpenButton();
    expect(btn.querySelector('.fa-xmark')).not.toBeNull();
    expect(btn.querySelector('.fa-map')).toBeNull();
  });

  it('FAB switches back to map icon when closed', () => {
    panel.show();
    panel.hide();
    const btn = panel.getOpenButton();
    expect(btn.querySelector('.fa-map')).not.toBeNull();
  });

  it('getOpenButton returns a button with map icon', () => {
    const btn = panel.getOpenButton();
    expect(btn.className).toBe('maptour-map-open-btn');
    expect(btn.querySelector('.fa-map')).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Show map');
  });

  it('show() opens the panel', () => {
    panel.show();
    expect(panel.isOpen()).toBe(true);
  });

  it('hide() closes the panel', () => {
    panel.show();
    panel.hide();
    expect(panel.isOpen()).toBe(false);
  });

  it('toggle() alternates', () => {
    panel.toggle();
    expect(panel.isOpen()).toBe(true);
    panel.toggle();
    expect(panel.isOpen()).toBe(false);
  });

  it('open button click opens', () => {
    panel.getOpenButton().click();
    expect(panel.isOpen()).toBe(true);
  });

  it('FAB click when open closes the panel', () => {
    panel.show();
    panel.getOpenButton().click();
    expect(panel.isOpen()).toBe(false);
  });

  it('fires onToggle on transitionend', () => {
    const calls: boolean[] = [];
    panel.onToggle((open) => calls.push(open));
    panel.show();
    container.querySelector('.maptour-map-panel')!
      .dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'transform' }));
    expect(calls).toEqual([true]);
  });

  it('ignores non-transform transitionend', () => {
    const calls: boolean[] = [];
    panel.onToggle((open) => calls.push(open));
    panel.show();
    container.querySelector('.maptour-map-panel')!
      .dispatchEvent(new TransitionEvent('transitionend', { propertyName: 'opacity' }));
    expect(calls).toHaveLength(0);
  });

  it('fires onToggle immediately with prefers-reduced-motion', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true, media: '', onchange: null,
      addListener: vi.fn(), removeListener: vi.fn(),
      addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
    });
    const calls: boolean[] = [];
    panel.onToggle((open) => calls.push(open));
    panel.show();
    expect(calls).toEqual([true]);
  });

  it('setActiveStop is callable without error (nav button removed)', () => {
    const stop = { id: 1, title: 'Test', coords: [52.84, -8.98] as [number, number], content: [], getting_here: { mode: 'walk' as const } };
    panel.setActiveStop(stop);
    // Nav button was removed from map panel — setActiveStop is a no-op for API compat
    expect(true).toBe(true);
  });

  it('destroy removes panel from DOM', () => {
    const btn = panel.getOpenButton();
    container.appendChild(btn);
    panel.destroy();
    expect(container.querySelector('.maptour-map-panel')).toBeNull();
    expect(container.contains(btn)).toBe(false);
  });
});
