/**
 * Renders a styled error message into the container element.
 */
export function showError(container: HTMLElement, message: string): void {
  container.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'maptour-error';
  wrapper.setAttribute('role', 'alert');
  wrapper.setAttribute('aria-live', 'assertive');

  const icon = document.createElement('div');
  icon.className = 'maptour-error__icon';
  icon.textContent = '⚠';
  icon.setAttribute('aria-hidden', 'true');

  const heading = document.createElement('h2');
  heading.className = 'maptour-error__heading';
  heading.textContent = 'Tour could not load';

  const body = document.createElement('p');
  body.className = 'maptour-error__message';
  body.textContent = message;

  wrapper.appendChild(icon);
  wrapper.appendChild(heading);
  wrapper.appendChild(body);
  container.appendChild(wrapper);
}
