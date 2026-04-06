import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CardHost } from '../../src/card/CardHost';

describe('CardHost', () => {
  let container: HTMLElement;
  let host: CardHost;

  beforeEach(() => {
    container = document.createElement('div');
    host = new CardHost(container);
  });

  it('getContainer returns the container element', () => {
    expect(host.getContainer()).toBe(container);
  });

  it('render clears existing content before calling the renderer', () => {
    container.innerHTML = '<p>old content</p>';
    const fn = vi.fn();
    host.render(fn);
    // innerHTML should be empty when fn is called
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith(container);
  });

  it('render clears previous content', () => {
    container.innerHTML = '<p>stale</p>';
    host.render(() => {});
    expect(container.innerHTML).toBe('');
  });

  it('render resets scrollTop', () => {
    container.scrollTop = 100;
    host.render(() => {});
    expect(container.scrollTop).toBe(0);
  });

  it('render passes container to the renderer function', () => {
    host.render((el) => {
      const child = document.createElement('div');
      child.className = 'test-child';
      el.appendChild(child);
    });
    expect(container.querySelector('.test-child')).not.toBeNull();
  });

  it('successive renders replace content', () => {
    host.render((el) => {
      el.innerHTML = '<span>first</span>';
    });
    expect(container.querySelector('span')!.textContent).toBe('first');

    host.render((el) => {
      el.innerHTML = '<span>second</span>';
    });
    expect(container.querySelectorAll('span')).toHaveLength(1);
    expect(container.querySelector('span')!.textContent).toBe('second');
  });
});
