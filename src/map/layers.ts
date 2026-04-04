import L from 'leaflet';
import type { LegMode } from '../types';

export interface PinOptions {
  number: number;
  active?: boolean;
  visited?: boolean;
  pulsing?: boolean;
  selected?: boolean;
  end?: boolean;
}

export function createPinIcon(options: PinOptions): L.DivIcon {
  const { number, active = false, visited = false, pulsing = false, selected = false, end = false } = options;

  let classes = 'maptour-pin';
  if (selected) classes += ' maptour-pin--selected';
  else if (end) classes += ' maptour-pin--end';
  else if (active) classes += ' maptour-pin--active';
  else if (pulsing) classes += ' maptour-pin--next';
  else if (visited) classes += ' maptour-pin--visited';

  return L.divIcon({
    className: '',
    html: `<div class="${classes}" aria-label="Stop ${number}">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}


export interface LegStyle {
  color: string;
  weight: number;
  dashArray?: string;
  opacity: number;
}

export function getLegStyle(mode: LegMode): LegStyle {
  switch (mode) {
    case 'walk':
    case 'cycle':
      return {
        color: 'var(--maptour-accent, #16a34a)',
        weight: 3,
        dashArray: '8, 6',
        opacity: 0.8,
      };
    case 'drive':
    case 'transit':
    default:
      return {
        color: 'var(--maptour-primary, #2563eb)',
        weight: 3,
        opacity: 0.8,
      };
  }
}
