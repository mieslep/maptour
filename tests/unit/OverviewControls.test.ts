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

  it('has Begin Tour CTA', () => {
    const cta = controls.getElement().querySelector('.maptour-overview-controls__cta') as HTMLElement;
    expect(cta).toBeTruthy();
    expect(cta.textContent).toContain('Begin Tour');
  });

  it('has direction toggle with correct tooltip', () => {
    const toggle = controls.getElement().querySelector('.maptour-overview-controls__direction') as HTMLElement;
    expect(toggle).toBeTruthy();
    expect(toggle.title).toContain('direction');
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
    controls.onDirectionToggle(() => {});

    const toggle = controls.getElement().querySelector('.maptour-overview-controls__direction') as HTMLElement;
    toggle.click();

    const cta = controls.getElement().querySelector('.maptour-overview-controls__cta') as HTMLElement;
    cta.click();
    expect(beginCb).toHaveBeenCalledWith(2, true);
  });

  it('enableCloseButton adds close button', () => {
    controls.enableCloseButton();
    const close = controls.getElement().querySelector('.maptour-overview-controls__close');
    expect(close).toBeTruthy();
  });

  it('close button fires callback', () => {
    controls.enableCloseButton();
    const cb = vi.fn();
    controls.onClose(cb);

    const close = controls.getElement().querySelector('.maptour-overview-controls__close') as HTMLElement;
    close.click();
    expect(cb).toHaveBeenCalled();
  });

  it('layout order is: direction toggle, CTA, close button', () => {
    controls.enableCloseButton();
    const row = controls.getElement().querySelector('.maptour-overview-controls__row') as HTMLElement;
    const children = Array.from(row.children);
    expect(children[0].classList.contains('maptour-overview-controls__direction')).toBe(true);
    expect(children[1].classList.contains('maptour-overview-controls__cta')).toBe(true);
    expect(children[2].classList.contains('maptour-overview-controls__close')).toBe(true);
  });
});
