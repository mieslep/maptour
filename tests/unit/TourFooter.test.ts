import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TourFooter } from '../../src/layout/TourFooter';

describe('TourFooter', () => {
  let footer: TourFooter;

  beforeEach(() => {
    footer = new TourFooter();
  });

  it('creates element with track, arrows, label, and finish', () => {
    const el = footer.getElement();
    expect(el.querySelector('.maptour-tour-footer__track')).toBeTruthy();
    expect(el.querySelector('.maptour-tour-footer__fill')).toBeTruthy();
    expect(el.querySelectorAll('.maptour-tour-footer__arrow')).toHaveLength(2);
    expect(el.querySelector('.maptour-tour-footer__label')).toBeTruthy();
    expect(el.querySelector('.maptour-tour-footer__finish')).toBeTruthy();
  });

  it('is hidden by default', () => {
    expect(footer.getElement().hidden).toBe(true);
  });

  it('show/hide toggles visibility', () => {
    footer.show();
    expect(footer.getElement().hidden).toBe(false);
    footer.hide();
    expect(footer.getElement().hidden).toBe(true);
  });

  it('update sets fill width percentage', () => {
    footer.update(3, 8);
    const fill = footer.getElement().querySelector('.maptour-tour-footer__fill') as HTMLElement;
    expect(fill.style.width).toBe('38%');
  });

  it('update sets aria attributes', () => {
    footer.update(5, 10);
    const track = footer.getElement().querySelector('.maptour-tour-footer__track') as HTMLElement;
    expect(track.getAttribute('aria-valuenow')).toBe('5');
    expect(track.getAttribute('aria-valuemax')).toBe('10');
  });

  it('handles 0 total gracefully', () => {
    footer.update(0, 0);
    const fill = footer.getElement().querySelector('.maptour-tour-footer__fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('fires prev callback', () => {
    const cb = vi.fn();
    footer.onPrev(cb);
    const arrows = footer.getElement().querySelectorAll('.maptour-tour-footer__arrow');
    (arrows[0] as HTMLElement).click();
    expect(cb).toHaveBeenCalled();
  });

  it('fires next callback when label clicked', () => {
    const cb = vi.fn();
    footer.onNext(cb);
    footer.setNextStop('Stop Two');
    const label = footer.getElement().querySelector('.maptour-tour-footer__label') as HTMLElement;
    label.click();
    expect(cb).toHaveBeenCalled();
  });

  it('fires next callback when next arrow clicked', () => {
    const cb = vi.fn();
    footer.onNext(cb);
    const arrows = footer.getElement().querySelectorAll('.maptour-tour-footer__arrow');
    (arrows[1] as HTMLElement).click();
    expect(cb).toHaveBeenCalled();
  });

  it('fires finish callback when finish button clicked', () => {
    const cb = vi.fn();
    footer.onFinish(cb);
    footer.setLastStop();
    const btn = footer.getElement().querySelector('.maptour-tour-footer__finish') as HTMLElement;
    btn.click();
    expect(cb).toHaveBeenCalled();
  });

  it('setNextStop shows label and next arrow, hides finish', () => {
    footer.setNextStop('Stop Two');
    const label = footer.getElement().querySelector('.maptour-tour-footer__label') as HTMLElement;
    const finish = footer.getElement().querySelector('.maptour-tour-footer__finish') as HTMLElement;
    const arrows = footer.getElement().querySelectorAll('.maptour-tour-footer__arrow');
    expect(label.hidden).toBe(false);
    expect((arrows[1] as HTMLElement).hidden).toBe(false);
    expect(finish.hidden).toBe(true);
    expect(label.textContent).toContain('Stop Two');
  });

  it('setLastStop shows finish, hides label and next arrow', () => {
    footer.setLastStop();
    const label = footer.getElement().querySelector('.maptour-tour-footer__label') as HTMLElement;
    const finish = footer.getElement().querySelector('.maptour-tour-footer__finish') as HTMLElement;
    const arrows = footer.getElement().querySelectorAll('.maptour-tour-footer__arrow');
    expect(label.hidden).toBe(true);
    expect((arrows[1] as HTMLElement).hidden).toBe(true);
    expect(finish.hidden).toBe(false);
  });

  it('sets progress bar role and label', () => {
    const track = footer.getElement().querySelector('.maptour-tour-footer__track') as HTMLElement;
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-label')).toBeTruthy();
    expect(track.getAttribute('aria-valuemin')).toBe('0');
  });

  it('showFinishModal resolves true when return button clicked', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const promise = TourFooter.showFinishModal(container, true);
    const primaryBtn = container.querySelector('.maptour-finish-modal__btn--primary') as HTMLElement;
    expect(primaryBtn).toBeTruthy();
    expect(primaryBtn.textContent).toContain('Return');
    primaryBtn.click();
    expect(await promise).toBe(true);

    document.body.removeChild(container);
  });

  it('showFinishModal defaults to end tour as primary', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const promise = TourFooter.showFinishModal(container);
    const primaryBtn = container.querySelector('.maptour-finish-modal__btn--primary') as HTMLElement;
    expect(primaryBtn).toBeTruthy();
    expect(primaryBtn.textContent).toContain('End');
    primaryBtn.click();
    expect(await promise).toBe(false);

    document.body.removeChild(container);
  });

  it('showFinishModal resolves false on backdrop click', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const promise = TourFooter.showFinishModal(container);
    const backdrop = container.querySelector('.maptour-finish-modal__backdrop') as HTMLElement;
    backdrop.click();
    expect(await promise).toBe(false);

    document.body.removeChild(container);
  });

  it('scroll gate blocks next callbacks and shows indicator', () => {
    const cb = vi.fn();
    footer.onNext(cb);
    footer.setNextStop('Stop Two');
    footer.setScrollGate(true);

    expect(footer.isScrollGated()).toBe(true);
    const indicator = footer.getElement().querySelector('.maptour-tour-footer__scroll-indicator') as HTMLElement;
    expect(indicator.hidden).toBe(false);

    // Clicking label should not fire callback
    const label = footer.getElement().querySelector('.maptour-tour-footer__label') as HTMLElement;
    label.click();
    expect(cb).not.toHaveBeenCalled();

    // Clicking next arrow should not fire callback
    const arrows = footer.getElement().querySelectorAll('.maptour-tour-footer__arrow');
    (arrows[1] as HTMLElement).click();
    expect(cb).not.toHaveBeenCalled();
  });

  it('clearing scroll gate allows next callbacks', () => {
    const cb = vi.fn();
    footer.onNext(cb);
    footer.setNextStop('Stop Two');
    footer.setScrollGate(true);
    footer.setScrollGate(false);

    expect(footer.isScrollGated()).toBe(false);
    const label = footer.getElement().querySelector('.maptour-tour-footer__label') as HTMLElement;
    label.click();
    expect(cb).toHaveBeenCalledOnce();
  });
});
