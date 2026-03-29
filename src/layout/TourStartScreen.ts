export interface TourStartScreenOptions {
  title: string;
  description?: string;
  duration?: string;
  stopCount: number;
  returning?: boolean;
  onBegin: () => void;
}

export class TourStartScreen {
  private readonly el: HTMLElement;

  constructor(container: HTMLElement, options: TourStartScreenOptions) {
    this.el = document.createElement('div');
    this.el.className = 'maptour-start';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-label', `Begin tour: ${options.title}`);

    const body = document.createElement('div');
    body.className = 'maptour-start__body';

    const title = document.createElement('h1');
    title.className = 'maptour-start__title';
    title.textContent = options.title;
    body.appendChild(title);

    if (options.description) {
      const desc = document.createElement('p');
      desc.className = 'maptour-start__description';
      desc.textContent = options.description;
      body.appendChild(desc);
    }

    const meta = document.createElement('p');
    meta.className = 'maptour-start__meta';
    const stopLabel = `${options.stopCount} stop${options.stopCount !== 1 ? 's' : ''}`;
    meta.textContent = options.duration ? `${stopLabel} · ${options.duration}` : stopLabel;
    body.appendChild(meta);

    const cta = document.createElement('button');
    cta.className = 'maptour-start__cta';
    cta.textContent = options.returning ? 'Re-take tour' : 'Begin tour';
    cta.addEventListener('click', options.onBegin);
    body.appendChild(cta);

    this.el.appendChild(body);
    container.appendChild(this.el);

    // Focus CTA on mount
    requestAnimationFrame(() => cta.focus());
  }

  destroy(): void {
    this.el.remove();
  }
}
