export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export type GpsCallback = (position: GpsPosition | null) => void;

export class GpsTracker {
  private watchId: number | null = null;
  private callbacks: GpsCallback[] = [];
  private lastPosition: GpsPosition | null = null;

  constructor() {
    // No-op if Geolocation API is unavailable
  }

  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  start(): void {
    if (!this.isAvailable()) return;

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          this.lastPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };
          this.notify(this.lastPosition);
        },
        (_err) => {
          // Permission denied, unavailable, or timeout — notify with null
          this.notify(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
        }
      );
    } catch {
      // Geolocation not available in this context
    }
  }

  stop(): void {
    if (this.watchId !== null && this.isAvailable()) {
      try {
        navigator.geolocation.clearWatch(this.watchId);
      } catch {
        // ignore
      }
      this.watchId = null;
    }
  }

  onPosition(callback: GpsCallback): void {
    this.callbacks.push(callback);
    // Immediately emit last known position
    if (this.lastPosition) {
      callback(this.lastPosition);
    }
  }

  offPosition(callback: GpsCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  private notify(position: GpsPosition | null): void {
    this.callbacks.forEach((cb) => cb(position));
  }

  getLastPosition(): GpsPosition | null {
    return this.lastPosition;
  }
}
