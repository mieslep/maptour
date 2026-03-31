import type { GpsPosition } from './GpsTracker';
import type { Stop, GpsConfig } from '../types';

const DEFAULT_ARRIVAL_RADIUS = 7.5; // metres

const R = 6371e3; // Earth radius in metres

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type ArrivalCallback = (stopIndex: number) => void;

export class ProximityDetector {
  private stops: Stop[];
  private currentStopIndex: number;
  private tourConfig: GpsConfig | undefined;
  private callback: ArrivalCallback | null = null;
  private insideRadius = false;

  constructor(stops: Stop[], currentStopIndex: number, tourConfig?: GpsConfig) {
    this.stops = stops;
    this.currentStopIndex = currentStopIndex;
    this.tourConfig = tourConfig;
  }

  onArrival(callback: ArrivalCallback): void {
    this.callback = callback;
  }

  setCurrentStop(index: number): void {
    this.currentStopIndex = index;
    this.insideRadius = false; // reset re-trigger protection on stop change
  }

  getEffectiveRadius(stop: Stop, tourConfig?: GpsConfig): number {
    const radius = stop.arrival_radius ?? tourConfig?.arrival_radius ?? DEFAULT_ARRIVAL_RADIUS;
    return radius > 0 ? radius : DEFAULT_ARRIVAL_RADIUS;
  }

  /**
   * Returns the distance in metres to the next stop, or null if there is no next stop.
   */
  getDistanceToNextStop(pos: GpsPosition): number | null {
    const nextIndex = this.currentStopIndex + 1;
    if (nextIndex >= this.stops.length) return null;
    const nextStop = this.stops[nextIndex];
    return haversine(pos.lat, pos.lng, nextStop.coords[0], nextStop.coords[1]);
  }

  checkPosition(pos: GpsPosition): void {
    const nextIndex = this.currentStopIndex + 1;

    // No next stop to monitor
    if (nextIndex >= this.stops.length) return;

    const nextStop = this.stops[nextIndex];
    const radius = this.getEffectiveRadius(nextStop, this.tourConfig);

    // Accuracy guard: don't trigger if position is too uncertain
    if (pos.accuracy >= radius * 2) return;

    const distance = haversine(pos.lat, pos.lng, nextStop.coords[0], nextStop.coords[1]);

    if (distance < radius) {
      if (!this.insideRadius) {
        this.insideRadius = true;
        this.callback?.(nextIndex);
      }
    } else {
      // User has exited the radius — allow re-trigger
      this.insideRadius = false;
    }
  }
}
