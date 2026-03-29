import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BottomSheet, type SheetPosition } from '../../src/layout/BottomSheet';

// jsdom doesn't implement ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - mock
globalThis.ResizeObserver = MockResizeObserver;

function makeContainer(height = 800): HTMLElement {
  const el = document.createElement('div');
  Object.defineProperty(el, 'offsetHeight', { value: height, configurable: true });
  document.body.appendChild(el);
  return el;
}

function makeContent(): HTMLElement {
  const el = document.createElement('div');
  el.textContent = 'stop content';
  return el;
}

describe('BottomSheet', () => {
  let container: HTMLElement;
  let sheet: BottomSheet;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = makeContainer(800);
    sheet = new BottomSheet(container, makeContent());
  });

  it('starts in expanded position', () => {
    expect(sheet.getPosition()).toBe('expanded');
  });

  it('setPosition changes position', () => {
    sheet.setPosition('peek', false);
    expect(sheet.getPosition()).toBe('peek');
  });

  it('setPosition collapsed', () => {
    sheet.setPosition('collapsed', false);
    expect(sheet.getPosition()).toBe('collapsed');
  });

  it('applies correct transform for each position', () => {
    const wrapper = container.querySelector<HTMLElement>('.maptour-sheet')!;
    sheet.setPosition('expanded', false);
    // expanded = translateY(container * 0.25) = 800 * 0.25 = 200
    expect(wrapper.style.transform).toBe('translateY(200px)');

    sheet.setPosition('peek', false);
    // peek = translateY(container * 0.70) = 800 * 0.70 = 560
    expect(wrapper.style.transform).toBe('translateY(560px)');

    sheet.setPosition('collapsed', false);
    // collapsed = translateY(container - 80) = 720
    expect(wrapper.style.transform).toBe('translateY(720px)');
  });

  it('fires onDragEnd callback when position set via setPosition (no drag)', () => {
    // onDragEnd only fires from actual drag events, not setPosition directly
    const calls: SheetPosition[] = [];
    sheet.onDragEnd((p) => calls.push(p));
    sheet.setPosition('peek', false);
    expect(calls).toHaveLength(0);
  });

  it('ESC key collapses expanded → peek', () => {
    sheet.setPosition('expanded', false);
    const wrapper = container.querySelector<HTMLElement>('.maptour-sheet')!;
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(sheet.getPosition()).toBe('peek');
  });

  it('ESC key collapses peek → collapsed', () => {
    sheet.setPosition('peek', false);
    const wrapper = container.querySelector<HTMLElement>('.maptour-sheet')!;
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(sheet.getPosition()).toBe('collapsed');
  });

  it('ESC fires onDragEnd callback', () => {
    const calls: SheetPosition[] = [];
    sheet.onDragEnd((p) => calls.push(p));
    const wrapper = container.querySelector<HTMLElement>('.maptour-sheet')!;
    wrapper.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(calls).toEqual(['peek']);
  });

  it('disable animation when prefers-reduced-motion is set', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    const wrapper = container.querySelector<HTMLElement>('.maptour-sheet')!;
    sheet.setPosition('peek', true); // animate=true but matchMedia says reduce
    expect(wrapper.style.transition).toBe('none');
  });

  it('destroy removes the wrapper from DOM', () => {
    sheet.destroy();
    expect(container.querySelector('.maptour-sheet')).toBeNull();
  });
});
