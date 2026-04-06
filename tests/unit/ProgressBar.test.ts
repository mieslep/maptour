import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressBar } from '../../src/layout/ProgressBar';

describe('ProgressBar', () => {
  let bar: ProgressBar;

  beforeEach(() => {
    bar = new ProgressBar();
  });

  it('is hidden by default', () => {
    expect(bar.getElement().hidden).toBe(true);
  });

  it('creates element with prev arrow, track, and next arrow', () => {
    const el = bar.getElement();
    expect(el.className).toBe('maptour-progress-bar');
    expect(el.querySelector('.maptour-progress-bar__track')).not.toBeNull();
    expect(el.querySelector('.maptour-progress-bar__fill')).not.toBeNull();
    const arrows = el.querySelectorAll('.maptour-progress-bar__arrow');
    expect(arrows).toHaveLength(2);
  });

  it('track has progressbar role and aria attributes', () => {
    const track = bar.getElement().querySelector('.maptour-progress-bar__track') as HTMLElement;
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-label')).toBeTruthy();
    expect(track.getAttribute('aria-valuemin')).toBe('0');
  });

  it('show() and hide() toggle visibility', () => {
    bar.show();
    expect(bar.getElement().hidden).toBe(false);
    bar.hide();
    expect(bar.getElement().hidden).toBe(true);
  });

  it('update() sets fill width percentage', () => {
    bar.update(3, 10);
    const fill = bar.getElement().querySelector('.maptour-progress-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('30%');
  });

  it('update() sets aria-valuenow and aria-valuemax', () => {
    bar.update(5, 12);
    const track = bar.getElement().querySelector('.maptour-progress-bar__track') as HTMLElement;
    expect(track.getAttribute('aria-valuenow')).toBe('5');
    expect(track.getAttribute('aria-valuemax')).toBe('12');
  });

  it('update() handles 0 total gracefully', () => {
    bar.update(0, 0);
    const fill = bar.getElement().querySelector('.maptour-progress-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('update() rounds percentage', () => {
    bar.update(1, 3);
    const fill = bar.getElement().querySelector('.maptour-progress-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('33%');
  });

  it('fires onPrev callback when prev button clicked', () => {
    const cb = vi.fn();
    bar.onPrev(cb);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    (arrows[0] as HTMLElement).click();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('fires onNext callback when next button clicked', () => {
    const cb = vi.fn();
    bar.onNext(cb);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    (arrows[1] as HTMLElement).click();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('supports multiple prev callbacks', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    bar.onPrev(cb1);
    bar.onPrev(cb2);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    (arrows[0] as HTMLElement).click();
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('setPrevDisabled disables the prev button', () => {
    bar.setPrevDisabled(true);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    expect((arrows[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('setPrevDisabled(false) re-enables the prev button', () => {
    bar.setPrevDisabled(true);
    bar.setPrevDisabled(false);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    expect((arrows[0] as HTMLButtonElement).disabled).toBe(false);
  });

  it('setNextDisabled disables the next button', () => {
    bar.setNextDisabled(true);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    expect((arrows[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it('setNextDisabled(false) re-enables the next button', () => {
    bar.setNextDisabled(true);
    bar.setNextDisabled(false);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    expect((arrows[1] as HTMLButtonElement).disabled).toBe(false);
  });
});
