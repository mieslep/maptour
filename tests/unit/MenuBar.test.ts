import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MenuBar, MenuAction } from '../../src/layout/MenuBar';

describe('MenuBar', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('creates menu bar element with hamburger', () => {
    new MenuBar(container);
    const bar = container.querySelector('.maptour-menu-bar');
    expect(bar).toBeTruthy();
    const hamburger = bar!.querySelector('.maptour-menu-bar__hamburger');
    expect(hamburger).toBeTruthy();
  });

  it('dropdown is hidden by default', () => {
    new MenuBar(container);
    const dropdown = container.querySelector('.maptour-menu-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(true);
  });

  it('opens dropdown on hamburger click', () => {
    new MenuBar(container);
    const hamburger = container.querySelector('.maptour-menu-bar__hamburger') as HTMLElement;
    hamburger.click();
    const dropdown = container.querySelector('.maptour-menu-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(false);
  });

  it('closes dropdown on second hamburger click', () => {
    new MenuBar(container);
    const hamburger = container.querySelector('.maptour-menu-bar__hamburger') as HTMLElement;
    hamburger.click();
    hamburger.click();
    const dropdown = container.querySelector('.maptour-menu-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(true);
  });

  it('fires action callback on menu item click', () => {
    const menu = new MenuBar(container);
    const cb = vi.fn();
    menu.onAction(cb);

    const items = container.querySelectorAll('.maptour-menu-item');
    // Items: getting_here, start_tour, tour_stops, about
    (items[1] as HTMLElement).click(); // start_tour
    expect(cb).toHaveBeenCalledWith('start_tour');
  });

  it('closes dropdown after menu item click', () => {
    new MenuBar(container);
    const hamburger = container.querySelector('.maptour-menu-bar__hamburger') as HTMLElement;
    hamburger.click();

    const items = container.querySelectorAll('.maptour-menu-item');
    (items[0] as HTMLElement).click();

    const dropdown = container.querySelector('.maptour-menu-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(true);
  });

  it('hides getting here item when setGettingHereVisible(false)', () => {
    const menu = new MenuBar(container);
    menu.setGettingHereVisible(false);

    const items = container.querySelectorAll('.maptour-menu-item');
    expect((items[0] as HTMLElement).style.display).toBe('none');
  });

  it('renders sanitised header HTML', () => {
    new MenuBar(container, '<div class="logo"><img src="logo.png" alt="Logo"></div>');
    const header = container.querySelector('.maptour-menu-bar__header');
    expect(header).toBeTruthy();
    expect(header!.querySelector('img')).toBeTruthy();
  });

  it('strips unsafe tags from header HTML', () => {
    new MenuBar(container, '<script>alert("xss")</script><div>safe</div>');
    const header = container.querySelector('.maptour-menu-bar__header');
    expect(header).toBeTruthy();
    expect(header!.querySelector('script')).toBeNull();
    expect(header!.textContent).toContain('safe');
  });

  it('wraps header in anchor when header_url is set', () => {
    new MenuBar(container, '<div>Brand</div>', 'https://example.com');
    const anchor = container.querySelector('.maptour-menu-bar__header a') as HTMLAnchorElement;
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('https://example.com');
    expect(anchor.getAttribute('target')).toBe('_blank');
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor.textContent).toContain('Brand');
  });

  it('does not wrap header when header_url is omitted', () => {
    new MenuBar(container, '<div>Brand</div>');
    const header = container.querySelector('.maptour-menu-bar__header');
    expect(header).toBeTruthy();
    expect(header!.querySelector('a')).toBeNull();
  });

  it('rejects unsafe URL schemes in header_url (no anchor rendered)', () => {
    new MenuBar(container, '<div>Brand</div>', 'javascript:alert(1)');
    const header = container.querySelector('.maptour-menu-bar__header');
    expect(header!.querySelector('a')).toBeNull();
    expect(header!.textContent).toContain('Brand');
  });

  it('rejects malformed header_url (no anchor rendered)', () => {
    new MenuBar(container, '<div>Brand</div>', 'not a url');
    const header = container.querySelector('.maptour-menu-bar__header');
    expect(header!.querySelector('a')).toBeNull();
  });

  it('header_url has no effect when header_html is absent', () => {
    new MenuBar(container, undefined, 'https://example.com');
    expect(container.querySelector('.maptour-menu-bar__header')).toBeNull();
  });

  it('closes on Escape key', () => {
    new MenuBar(container);
    const hamburger = container.querySelector('.maptour-menu-bar__hamburger') as HTMLElement;
    hamburger.click();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    const dropdown = container.querySelector('.maptour-menu-dropdown') as HTMLElement;
    expect(dropdown.hidden).toBe(true);
  });

  it('fires all four menu actions in correct order', () => {
    const menu = new MenuBar(container);
    const actions: MenuAction[] = [];
    menu.onAction((a) => actions.push(a));

    const items = container.querySelectorAll('.maptour-menu-item');
    (items[0] as HTMLElement).click();
    (items[1] as HTMLElement).click();
    (items[2] as HTMLElement).click();
    (items[3] as HTMLElement).click();

    expect(actions).toEqual(['getting_here', 'start_tour', 'tour_stops', 'about']);
  });

  it('sets aria-expanded correctly', () => {
    new MenuBar(container);
    const hamburger = container.querySelector('.maptour-menu-bar__hamburger') as HTMLElement;
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');

    hamburger.click();
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');

    hamburger.click();
    expect(hamburger.getAttribute('aria-expanded')).toBe('false');
  });
});
