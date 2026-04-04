/**
 * CardHost owns the card container element.
 * Provides a clean render cycle: clear container, reset scroll, then delegate to a renderer.
 */
export class CardHost {
  private readonly container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /** Clear the container and delegate rendering to the provided function. */
  render(fn: (container: HTMLElement) => void): void {
    this.container.innerHTML = '';
    this.container.scrollTop = 0;
    fn(this.container);
  }

  getContainer(): HTMLElement {
    return this.container;
  }
}
