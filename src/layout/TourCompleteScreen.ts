export interface TourCompleteScreenOptions {
  visitedCount: number;
  totalStops: number;
  onReview: () => void;
}

export class TourCompleteScreen {
  private readonly el: HTMLElement;

  constructor(container: HTMLElement, options: TourCompleteScreenOptions) {
    this.el = document.createElement('div');
    this.el.className = 'maptour-complete';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-label', 'Tour complete');

    const body = document.createElement('div');
    body.className = 'maptour-complete__body';

    const icon = document.createElement('div');
    icon.className = 'maptour-complete__icon';
    icon.setAttribute('aria-hidden', 'true');
    body.appendChild(icon);

    const heading = document.createElement('h2');
    heading.className = 'maptour-complete__heading';
    heading.textContent = 'Tour complete!';
    body.appendChild(heading);

    const count = document.createElement('p');
    count.className = 'maptour-complete__count';
    count.textContent = `${options.visitedCount} / ${options.totalStops} stops visited`;
    body.appendChild(count);

    const review = document.createElement('button');
    review.className = 'maptour-complete__review';
    review.textContent = 'Review tour';
    review.addEventListener('click', options.onReview);
    body.appendChild(review);

    this.el.appendChild(body);
    container.appendChild(this.el);

    requestAnimationFrame(() => review.focus());
  }

  destroy(): void {
    this.el.remove();
  }
}
