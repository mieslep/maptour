import { describe, it, expect, beforeEach } from 'vitest';
import { showError } from '../../src/errors/ErrorDisplay';

describe('showError', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
  });

  it('renders an error wrapper with alert role', () => {
    showError(container, 'Something went wrong');
    const wrapper = container.querySelector('.maptour-error') as HTMLElement;
    expect(wrapper).not.toBeNull();
    expect(wrapper.getAttribute('role')).toBe('alert');
    expect(wrapper.getAttribute('aria-live')).toBe('assertive');
  });

  it('renders the error message in the body', () => {
    showError(container, 'Network timeout');
    const body = container.querySelector('.maptour-error__message') as HTMLElement;
    expect(body).not.toBeNull();
    expect(body.textContent).toBe('Network timeout');
  });

  it('renders a heading', () => {
    showError(container, 'fail');
    const heading = container.querySelector('.maptour-error__heading') as HTMLElement;
    expect(heading).not.toBeNull();
    expect(heading.textContent).toBeTruthy();
  });

  it('renders a warning icon', () => {
    showError(container, 'fail');
    const icon = container.querySelector('.maptour-error__icon') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.getAttribute('aria-hidden')).toBe('true');
  });

  it('clears existing container content before rendering', () => {
    container.innerHTML = '<section class="old">old content</section>';
    showError(container, 'new error');
    expect(container.querySelector('.old')).toBeNull();
    expect(container.querySelector('.maptour-error')).not.toBeNull();
  });

  it('calling showError twice replaces the first error', () => {
    showError(container, 'first');
    showError(container, 'second');
    const messages = container.querySelectorAll('.maptour-error__message');
    expect(messages).toHaveLength(1);
    expect(messages[0].textContent).toBe('second');
  });
});
