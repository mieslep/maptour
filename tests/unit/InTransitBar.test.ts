import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InTransitBar } from '../../src/layout/InTransitBar';

describe('InTransitBar', () => {
  let container: HTMLElement;
  let bar: InTransitBar;

  beforeEach(() => {
    container = document.createElement('div');
    bar = new InTransitBar(container);
  });

  it('appends a hidden element to the container', () => {
    const el = container.querySelector('.maptour-transit-bar') as HTMLElement;
    expect(el).not.toBeNull();
    expect(el.hidden).toBe(true);
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });

  it('show() renders label and button, unhides element', () => {
    bar.show(3, 'Town Hall');
    const el = container.querySelector('.maptour-transit-bar') as HTMLElement;
    expect(el.hidden).toBe(false);

    const label = el.querySelector('.maptour-transit-bar__label');
    expect(label).not.toBeNull();
    expect(label!.textContent).toContain('3');
    expect(label!.textContent).toContain('Town Hall');

    const btn = el.querySelector('.maptour-transit-bar__arrived') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toContain('stop 3');
    expect(btn.getAttribute('aria-label')).toContain('Town Hall');
  });

  it('show() clears previous content before rendering', () => {
    bar.show(1, 'First');
    bar.show(2, 'Second');
    const el = container.querySelector('.maptour-transit-bar') as HTMLElement;
    const labels = el.querySelectorAll('.maptour-transit-bar__label');
    expect(labels).toHaveLength(1);
    expect(labels[0].textContent).toContain('Second');
  });

  it('hide() hides the element and clears content', () => {
    bar.show(1, 'Park');
    bar.hide();
    const el = container.querySelector('.maptour-transit-bar') as HTMLElement;
    expect(el.hidden).toBe(true);
    expect(el.innerHTML).toBe('');
  });

  it('onArrived callback fires when button is clicked', () => {
    const cb = vi.fn();
    bar.onArrived(cb);
    bar.show(1, 'Museum');

    const btn = container.querySelector('.maptour-transit-bar__arrived') as HTMLButtonElement;
    btn.click();
    expect(cb).toHaveBeenCalledOnce();
  });

  it('supports multiple onArrived callbacks', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    bar.onArrived(cb1);
    bar.onArrived(cb2);
    bar.show(1, 'Station');

    const btn = container.querySelector('.maptour-transit-bar__arrived') as HTMLButtonElement;
    btn.click();
    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('callbacks persist across show() calls', () => {
    const cb = vi.fn();
    bar.onArrived(cb);

    bar.show(1, 'First');
    bar.show(2, 'Second');

    const btn = container.querySelector('.maptour-transit-bar__arrived') as HTMLButtonElement;
    btn.click();
    expect(cb).toHaveBeenCalledOnce();
  });
});
