import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OverviewControls } from '../../src/layout/OverviewControls';

describe('OverviewControls', () => {
  let controls: OverviewControls;

  beforeEach(() => {
    controls = new OverviewControls();
  });

  it('is hidden by default', () => {
    expect(controls.getElement().hidden).toBe(true);
  });

  it('show/hide toggles visibility', () => {
    controls.show();
    expect(controls.getElement().hidden).toBe(false);
    controls.hide();
    expect(controls.getElement().hidden).toBe(true);
  });

  it('update sets CTA text', () => {
    controls.update(0, 5, false, 'Trinity');
    const cta = controls.getElement().querySelector('.maptour-overview-controls__cta') as HTMLElement;
    expect(cta.textContent).toContain('Begin Tour');
  });

  it('update sets fill width', () => {
    controls.update(2, 5, false, 'Stop 3');
    const fill = controls.getElement().querySelector('.maptour-overview-controls__fill') as HTMLElement;
    expect(fill.style.width).toBe('50%'); // 2/(5-1) = 0.5
  });

  it('update disables prev at index 0', () => {
    controls.update(0, 5, false, 'Stop 1');
    const arrows = controls.getElement().querySelectorAll('.maptour-overview-controls__arrow');
    expect((arrows[0] as HTMLButtonElement).disabled).toBe(true);
    expect((arrows[1] as HTMLButtonElement).disabled).toBe(false);
  });

  it('update disables next at last index', () => {
    controls.update(4, 5, false, 'Stop 5');
    const arrows = controls.getElement().querySelectorAll('.maptour-overview-controls__arrow');
    expect((arrows[0] as HTMLButtonElement).disabled).toBe(false);
    expect((arrows[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it('prev arrow fires onStopSelect with decremented index', () => {
    controls.update(3, 5, false, 'Stop 4');
    const cb = vi.fn();
    controls.onStopSelect(cb);

    const arrows = controls.getElement().querySelectorAll('.maptour-overview-controls__arrow');
    (arrows[0] as HTMLElement).click();
    expect(cb).toHaveBeenCalledWith(2);
  });

  it('next arrow fires onStopSelect with incremented index', () => {
    controls.update(1, 5, false, 'Stop 2');
    const cb = vi.fn();
    controls.onStopSelect(cb);

    const arrows = controls.getElement().querySelectorAll('.maptour-overview-controls__arrow');
    (arrows[1] as HTMLElement).click();
    expect(cb).toHaveBeenCalledWith(2);
  });

  it('does not fire onStopSelect past bounds', () => {
    controls.update(0, 5, false, 'Stop 1');
    const cb = vi.fn();
    controls.onStopSelect(cb);

    const arrows = controls.getElement().querySelectorAll('.maptour-overview-controls__arrow');
    (arrows[0] as HTMLElement).click(); // prev at 0 — should not fire
    expect(cb).not.toHaveBeenCalled();
  });

  it('direction toggle fires callback', () => {
    const cb = vi.fn();
    controls.onDirectionToggle(cb);

    const toggle = controls.getElement().querySelector('.maptour-overview-controls__direction') as HTMLElement;
    toggle.click();
    expect(cb).toHaveBeenCalledWith(true);

    toggle.click();
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('begin button fires with current index and reversed state', () => {
    controls.update(3, 8, false, 'Stop 4');
    const cb = vi.fn();
    controls.onBegin(cb);

    const cta = controls.getElement().querySelector('.maptour-overview-controls__cta') as HTMLElement;
    cta.click();
    expect(cb).toHaveBeenCalledWith(3, false);
  });

  it('begin button reflects direction toggle state', () => {
    controls.update(2, 8, false, 'Stop 3');
    const beginCb = vi.fn();
    controls.onBegin(beginCb);
    controls.onDirectionToggle(() => {}); // consume toggle

    // Toggle direction
    const toggle = controls.getElement().querySelector('.maptour-overview-controls__direction') as HTMLElement;
    toggle.click();

    // Begin should now pass reversed=true
    const cta = controls.getElement().querySelector('.maptour-overview-controls__cta') as HTMLElement;
    cta.click();
    expect(beginCb).toHaveBeenCalledWith(2, true);
  });
});
