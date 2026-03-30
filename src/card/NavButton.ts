import type { Stop, LegMode } from '../types';
import { t } from '../i18n';
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

const BUTTON_LABEL_KEYS: Record<LegMode, string> = {
  walk:    'walk_me',
  drive:   'drive_me',
  transit: 'transit_dir',
  cycle:   'cycle_dir',
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
  return stop.getting_here?.mode ?? tourNavMode ?? 'walk';
}

// SVG icons
const PIN_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
const ARROW_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/></svg>';

export type NavButtonVariant = 'pin' | 'arrow' | 'full';

export class NavButton {
  private container: HTMLElement;
  private stop: Stop;
  private legMode: LegMode;
  private preference: NavAppPreference;
  private pickerOverlay: HTMLElement | null = null;
  private onNavigateCallback: (() => void) | undefined;
  private tourNavMode: LegMode | undefined;
  private variant: NavButtonVariant;

  constructor(container: HTMLElement, stop: Stop, preference: NavAppPreference, onNavigate?: () => void, tourNavMode?: LegMode, variant: NavButtonVariant = 'full') {
    this.container = container;
    this.stop = stop;
    this.tourNavMode = tourNavMode;
    this.legMode = resolveMode(stop, tourNavMode);
    this.preference = preference;
    this.onNavigateCallback = onNavigate;
    this.variant = variant;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    const btn = document.createElement('button');
    const label = t(BUTTON_LABEL_KEYS[this.legMode]);
    if (this.variant === 'pin') {
      btn.className = 'maptour-nav-btn maptour-nav-btn--pin';
      btn.innerHTML = PIN_SVG;
      btn.title = t('directions_to');
      btn.setAttribute('aria-label', `${t('directions_to')}: ${this.stop.title}`);
    } else if (this.variant === 'arrow') {
      btn.className = 'maptour-nav-btn maptour-nav-btn--arrow';
      btn.innerHTML = ARROW_SVG;
      btn.title = label;
      btn.setAttribute('aria-label', `${label}: ${this.stop.title}`);
    } else {
      btn.className = 'maptour-nav-btn';
      btn.textContent = label;
      btn.setAttribute('aria-label', `${label}: ${this.stop.title}`);
    }
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
    title.textContent = t('picker_title');
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
    cancelBtn.textContent = t('picker_cancel');
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
