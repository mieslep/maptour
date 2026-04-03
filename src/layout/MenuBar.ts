import { t } from '../i18n';
import { sanitiseHtml } from '../util/sanitiseHtml';

export type MenuAction = 'getting_here' | 'start_tour' | 'tour_stops' | 'about';

export class MenuBar {
  private readonly el: HTMLElement;
  private readonly dropdown: HTMLElement;
  private readonly hamburger: HTMLElement;
  private readonly gettingHereItem: HTMLElement;
  private actionCallbacks: Array<(action: MenuAction) => void> = [];
  private open = false;

  constructor(container: HTMLElement, headerHtml?: string) {
    this.el = document.createElement('div');
    this.el.className = 'maptour-menu-bar';

    // Hamburger button
    this.hamburger = document.createElement('button');
    this.hamburger.className = 'maptour-menu-bar__hamburger';
    this.hamburger.setAttribute('aria-label', 'Menu');
    this.hamburger.setAttribute('aria-expanded', 'false');
    this.hamburger.setAttribute('aria-haspopup', 'menu');
    this.hamburger.innerHTML = '<i class="fa-solid fa-bars" aria-hidden="true"></i>';
    this.hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });
    this.el.appendChild(this.hamburger);

    // Custom header area
    if (headerHtml) {
      const headerArea = document.createElement('div');
      headerArea.className = 'maptour-menu-bar__header';
      headerArea.innerHTML = sanitiseHtml(headerHtml);
      this.el.appendChild(headerArea);
    }

    // Dropdown menu
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'maptour-menu-dropdown';
    this.dropdown.setAttribute('role', 'menu');
    this.dropdown.hidden = true;

    this.gettingHereItem = this.createItem('fa-solid fa-map-signs', t('menu_getting_here'), 'getting_here');
    this.dropdown.appendChild(this.gettingHereItem);
    this.dropdown.appendChild(this.createItem('fa-solid fa-play', t('menu_start_tour'), 'start_tour'));
    this.dropdown.appendChild(this.createItem('fa-solid fa-list', t('menu_tour_stops'), 'tour_stops'));
    this.dropdown.appendChild(this.createItem('fa-solid fa-circle-info', t('menu_about'), 'about'));

    this.el.appendChild(this.dropdown);
    container.appendChild(this.el);

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (this.open && !this.el.contains(e.target as Node)) {
        this.close();
      }
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (this.open && e.key === 'Escape') {
        this.close();
        this.hamburger.focus();
      }
    });
  }

  onAction(cb: (action: MenuAction) => void): void {
    this.actionCallbacks.push(cb);
  }

  setGettingHereVisible(visible: boolean): void {
    this.gettingHereItem.style.display = visible ? '' : 'none';
  }

  close(): void {
    this.open = false;
    this.dropdown.hidden = true;
    this.hamburger.setAttribute('aria-expanded', 'false');
  }

  getElement(): HTMLElement {
    return this.el;
  }

  private toggle(): void {
    if (this.open) {
      this.close();
    } else {
      this.open = true;
      this.dropdown.hidden = false;
      this.hamburger.setAttribute('aria-expanded', 'true');
    }
  }

  private createItem(icon: string, label: string, action: MenuAction): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'maptour-menu-item';
    btn.setAttribute('role', 'menuitem');
    btn.innerHTML = `<i class="${icon}" aria-hidden="true"></i> ${label}`;
    btn.addEventListener('click', () => {
      this.close();
      this.actionCallbacks.forEach((cb) => cb(action));
    });
    return btn;
  }
}
