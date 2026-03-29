import type { Stop, LegMode } from '../types';
import { NavAppPreference } from '../navigation/NavAppPreference';

type NavApp = 'google' | 'apple' | 'waze';

const GOOGLE_MODE: Record<LegMode, string> = {
  walk:    'walking',
  drive:   'driving',
  transit: 'transit',
  cycle:   'bicycling',
};

const APPLE_FLAG: Record<LegMode, string> = {
  walk:    'w',
  drive:   'd',
  transit: 'r',
  cycle:   'b',
};

const APPS_BY_MODE: Record<LegMode, NavApp[]> = {
  walk:    ['google', 'apple'],
  drive:   ['google', 'apple', 'waze'],
  transit: ['google', 'apple'],
  cycle:   ['google', 'apple'],
};

const BUTTON_LABELS: Record<LegMode, string> = {
  walk:    'Walk me there',
  drive:   'Drive me there',
  transit: 'Get transit directions',
  cycle:   'Get cycling directions',
};

const ARIA_PREFIX: Record<LegMode, string> = {
  walk:    'Get walking directions to',
  drive:   'Get driving directions to',
  transit: 'Get transit directions to',
  cycle:   'Get cycling directions to',
};

const APP_LABELS: Record<NavApp, string> = {
  google: 'Google Maps',
  apple:  'Apple Maps',
  waze:   'Waze',
};

export function buildDeepLink(app: NavApp, lat: number, lng: number, mode: LegMode): string {
  switch (app) {
    case 'google':
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${GOOGLE_MODE[mode]}`;
    case 'apple':
      return `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=${APPLE_FLAG[mode]}`;
    case 'waze':
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
}

export function resolveMode(stop: Stop, tourNavMode?: LegMode): LegMode {
  return stop.leg_to_next?.mode ?? tourNavMode ?? 'walk';
}

export class NavButton {
  private container: HTMLElement;
  private stop: Stop;
  private legMode: LegMode;
  private preference: NavAppPreference;
  private pickerOverlay: HTMLElement | null = null;
  private onNavigateCallback: (() => void) | undefined;
  private tourNavMode: LegMode | undefined;

  constructor(container: HTMLElement, stop: Stop, preference: NavAppPreference, onNavigate?: () => void, tourNavMode?: LegMode) {
    this.container = container;
    this.stop = stop;
    this.tourNavMode = tourNavMode;
    this.legMode = resolveMode(stop, tourNavMode);
    this.preference = preference;
    this.onNavigateCallback = onNavigate;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'maptour-nav-btn';
    btn.textContent = BUTTON_LABELS[this.legMode];
    btn.setAttribute('aria-label', `${ARIA_PREFIX[this.legMode]} ${this.stop.title}`);
    btn.addEventListener('click', () => this.handleClick());

    this.container.appendChild(btn);
  }

  private handleClick(): void {
    const savedApp = this.preference.get() as NavApp | null;
    const validApps = APPS_BY_MODE[this.legMode];

    if (savedApp && validApps.includes(savedApp)) {
      const [lat, lng] = this.stop.coords;
      window.open(buildDeepLink(savedApp, lat, lng, this.legMode), '_blank', 'noopener,noreferrer');
      this.onNavigateCallback?.();
    } else {
      this.showPicker();
    }
  }

  private showPicker(): void {
    if (this.pickerOverlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'maptour-nav-picker';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Choose your navigation app');

    const title = document.createElement('p');
    title.className = 'maptour-nav-picker__title';
    title.textContent = 'Open directions in:';
    overlay.appendChild(title);

    const validApps = APPS_BY_MODE[this.legMode];
    validApps.forEach((appId) => {
      const btn = document.createElement('button');
      btn.className = 'maptour-nav-picker__option';
      btn.textContent = APP_LABELS[appId];
      btn.addEventListener('click', () => {
        this.preference.set(appId);
        this.hidePicker();
        const [lat, lng] = this.stop.coords;
        window.open(buildDeepLink(appId, lat, lng, this.legMode), '_blank', 'noopener,noreferrer');
        this.onNavigateCallback?.();
      });
      overlay.appendChild(btn);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'maptour-nav-picker__cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.hidePicker());
    overlay.appendChild(cancelBtn);

    this.container.appendChild(overlay);
    this.pickerOverlay = overlay;

    const firstOption = overlay.querySelector<HTMLButtonElement>('.maptour-nav-picker__option');
    firstOption?.focus();
  }

  private hidePicker(): void {
    if (this.pickerOverlay) {
      this.pickerOverlay.remove();
      this.pickerOverlay = null;
    }
  }

  update(stop: Stop, tourNavMode?: LegMode): void {
    this.stop = stop;
    this.tourNavMode = tourNavMode;
    this.legMode = resolveMode(stop, tourNavMode);
    this.hidePicker();
    this.render();
  }
}
