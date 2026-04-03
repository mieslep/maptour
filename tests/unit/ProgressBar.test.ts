import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressBar } from '../../src/layout/ProgressBar';

describe('ProgressBar', () => {
  let bar: ProgressBar;

  beforeEach(() => {
    bar = new ProgressBar();
  });

  it('creates element with track and arrows', () => {
    const el = bar.getElement();
    expect(el.querySelector('.maptour-progress-bar__track')).toBeTruthy();
    expect(el.querySelector('.maptour-progress-bar__fill')).toBeTruthy();
    expect(el.querySelectorAll('.maptour-progress-bar__arrow')).toHaveLength(2);
  });

  it('is hidden by default', () => {
    expect(bar.getElement().hidden).toBe(true);
  });

  it('show/hide toggles visibility', () => {
    bar.show();
    expect(bar.getElement().hidden).toBe(false);
    bar.hide();
    expect(bar.getElement().hidden).toBe(true);
  });

  it('update sets fill width percentage', () => {
    bar.update(3, 8);
    const fill = bar.getElement().querySelector('.maptour-progress-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('38%');
  });

  it('update sets aria attributes', () => {
    bar.update(5, 10);
    const track = bar.getElement().querySelector('.maptour-progress-bar__track') as HTMLElement;
    expect(track.getAttribute('aria-valuenow')).toBe('5');
    expect(track.getAttribute('aria-valuemax')).toBe('10');
  });

  it('handles 0 total gracefully', () => {
    bar.update(0, 0);
    const fill = bar.getElement().querySelector('.maptour-progress-bar__fill') as HTMLElement;
    expect(fill.style.width).toBe('0%');
  });

  it('fires prev callback', () => {
    const cb = vi.fn();
    bar.onPrev(cb);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    (arrows[0] as HTMLElement).click();
    expect(cb).toHaveBeenCalled();
  });

  it('fires next callback', () => {
    const cb = vi.fn();
    bar.onNext(cb);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    (arrows[1] as HTMLElement).click();
    expect(cb).toHaveBeenCalled();
  });

  it('disables prev arrow', () => {
    bar.setPrevDisabled(true);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    expect((arrows[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables next arrow', () => {
    bar.setNextDisabled(true);
    const arrows = bar.getElement().querySelectorAll('.maptour-progress-bar__arrow');
    expect((arrows[1] as HTMLButtonElement).disabled).toBe(true);
  });

  it('sets progress bar role and label', () => {
    const track = bar.getElement().querySelector('.maptour-progress-bar__track') as HTMLElement;
    expect(track.getAttribute('role')).toBe('progressbar');
    expect(track.getAttribute('aria-label')).toBeTruthy();
    expect(track.getAttribute('aria-valuemin')).toBe('0');
  });
});
