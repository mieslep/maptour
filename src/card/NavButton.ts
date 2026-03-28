import type { Stop, LegMode } from '../types';
import { NavAppPreference } from '../navigation/NavAppPreference';

type NavApp = 'google' | 'apple' | 'waze';

function buildDeepLink(app: NavApp, lat: number, lng: number, mode: LegMode): string {
  const travelMode = mode === 'walk' ? 'walking' : 'driving';
  switch (app) {
    case 'google':
      return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${travelMode}`;
    case 'apple':
      return `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=${mode === 'walk' ? 'w' : 'd'}`;
    case 'waze':
      return `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`;
  }
}

export class NavButton {
  private container: HTMLElement;
  private stop: Stop;
  private legMode: LegMode;
  private preference: NavAppPreference;
  private pickerOverlay: HTMLElement | null = null;

  constructor(container: HTMLElement, stop: Stop, preference: NavAppPreference) {
    this.container = container;
    this.stop = stop;
    this.legMode = stop.leg_to_next?.mode ?? 'walk';
    this.preference = preference;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    const btn = document.createElement('button');
    btn.className = 'maptour-nav-btn';
    btn.textContent = 'Take me there';
    btn.setAttribute('aria-label', `Get directions to ${this.stop.title}`);
    btn.addEventListener('click', () => this.handleClick());

    this.container.appendChild(btn);
  }

  private handleClick(): void {
    const savedApp = this.preference.get();
    if (savedApp) {
      const [lat, lng] = this.stop.coords;
      window.open(buildDeepLink(savedApp as NavApp, lat, lng, this.legMode), '_blank', 'noopener,noreferrer');
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

    const apps: Array<{ id: NavApp; label: string }> = [
      { id: 'google', label: 'Google Maps' },
      { id: 'apple', label: 'Apple Maps' },
      { id: 'waze', label: 'Waze' },
    ];

    overlay.appendChild(title);

    apps.forEach((app) => {
      const btn = document.createElement('button');
      btn.className = 'maptour-nav-picker__option';
      btn.textContent = app.label;
      btn.addEventListener('click', () => {
        this.preference.set(app.id);
        this.hidePicker();
        const [lat, lng] = this.stop.coords;
        window.open(buildDeepLink(app.id, lat, lng, this.legMode), '_blank', 'noopener,noreferrer');
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

    // Focus first option
    const firstOption = overlay.querySelector<HTMLButtonElement>('.maptour-nav-picker__option');
    firstOption?.focus();
  }

  private hidePicker(): void {
    if (this.pickerOverlay) {
      this.pickerOverlay.remove();
      this.pickerOverlay = null;
    }
  }

  update(stop: Stop): void {
    this.stop = stop;
    this.legMode = stop.leg_to_next?.mode ?? 'walk';
    this.hidePicker();
    this.render();
  }
}
