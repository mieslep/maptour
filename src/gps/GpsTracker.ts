export interface GpsPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export type GpsCallback = (position: GpsPosition | null) => void;
export type HeadingCallback = (heading: number | null) => void;

/** Minimum distance (metres) between positions to derive a movement-based heading. */
const MOVEMENT_THRESHOLD_M = 5;

/** Compute bearing in degrees (0 = north, 90 = east) between two lat/lng pairs. */
function computeBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Haversine distance in metres. */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class GpsTracker {
  private watchId: number | null = null;
  private callbacks: GpsCallback[] = [];
  private headingCallbacks: HeadingCallback[] = [];
  private lastPosition: GpsPosition | null = null;

  /** Last position used for movement-based heading calculation. */
  private prevPosition: GpsPosition | null = null;

  /** Current best heading: compass > geolocation > movement. null = unknown. */
  private currentHeading: number | null = null;

  /** Compass heading from DeviceOrientationEvent. */
  private compassHeading: number | null = null;

  private orientationHandler: ((e: DeviceOrientationEvent) => void) | null = null;

  constructor() {
    // No-op if Geolocation API is unavailable
  }

  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && 'geolocation' in navigator;
  }

  start(): void {
    if (!this.isAvailable()) return;

    this.startCompassListener();

    try {
      this.watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newPos: GpsPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          };

          // Geolocation-provided heading (only valid when moving, often null)
          const geoHeading =
            pos.coords.heading != null && !isNaN(pos.coords.heading) ? pos.coords.heading : null;

          // Movement-based heading fallback
          let movementHeading: number | null = null;
          if (this.lastPosition) {
            const dist = haversineDistance(
              this.lastPosition.lat,
              this.lastPosition.lng,
              newPos.lat,
              newPos.lng
            );
            if (dist >= MOVEMENT_THRESHOLD_M) {
              movementHeading = computeBearing(
                this.lastPosition.lat,
                this.lastPosition.lng,
                newPos.lat,
                newPos.lng
              );
              this.prevPosition = this.lastPosition;
            }
          }

          this.lastPosition = newPos;

          // Priority: compass > geolocation heading > movement heading
          const heading = this.compassHeading ?? geoHeading ?? movementHeading ?? this.currentHeading;
          this.updateHeading(heading);

          this.notifyPosition(this.lastPosition);
        },
        (_err) => {
          // Permission denied, unavailable, or timeout — notify with null
          this.notifyPosition(null);
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
    this.stopCompassListener();
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

  onHeading(callback: HeadingCallback): void {
    this.headingCallbacks.push(callback);
    if (this.currentHeading !== null) {
      callback(this.currentHeading);
    }
  }

  offHeading(callback: HeadingCallback): void {
    this.headingCallbacks = this.headingCallbacks.filter((cb) => cb !== callback);
  }

  getHeading(): number | null {
    return this.currentHeading;
  }

  private updateHeading(heading: number | null): void {
    if (heading === this.currentHeading) return;
    this.currentHeading = heading;
    this.headingCallbacks.forEach((cb) => cb(heading));
  }

  private notifyPosition(position: GpsPosition | null): void {
    this.callbacks.forEach((cb) => cb(position));
  }

  private startCompassListener(): void {
    if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return;

    this.orientationHandler = (e: DeviceOrientationEvent) => {
      // iOS Safari provides webkitCompassHeading (degrees from north)
      const webkit = (e as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      if (webkit != null && !isNaN(webkit)) {
        this.compassHeading = webkit;
      } else if (e.alpha != null && !isNaN(e.alpha)) {
        // Standard: alpha is degrees from an arbitrary reference — when absolute is true
        // it's from north. When not absolute, it's still the best compass estimate available.
        this.compassHeading = e.absolute ? (360 - e.alpha) % 360 : (360 - e.alpha) % 360;
      } else {
        this.compassHeading = null;
      }

      // Update heading immediately from compass
      const heading = this.compassHeading ?? this.currentHeading;
      this.updateHeading(heading);
    };

    try {
      window.addEventListener('deviceorientation', this.orientationHandler, true);
    } catch {
      // Not supported
    }
  }

  private stopCompassListener(): void {
    if (this.orientationHandler) {
      try {
        window.removeEventListener('deviceorientation', this.orientationHandler, true);
      } catch {
        // ignore
      }
      this.orientationHandler = null;
    }
  }

  getLastPosition(): GpsPosition | null {
    return this.lastPosition;
  }
}
