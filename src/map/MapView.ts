import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Tour, Stop } from '../types';
import { createPinIcon, getLegStyle } from './layers';

export class MapView {
  private map: L.Map;
  private markers: Map<number, L.Marker> = new Map();
  private polylines: L.Polyline[] = [];
  private gpsDot: L.CircleMarker | null = null;
  private tour: Tour;
  private activeStopId: number;
  private pulsingStopId: number | null = null;
  private visitedStopIds: Set<number> = new Set();
  private paddingBottom = 0;

  constructor(container: HTMLElement, tour: Tour) {
    this.tour = tour;
    this.activeStopId = tour.stops[0]?.id ?? 0;

    // Initialise Leaflet map
    this.map = L.map(container, {
      zoomControl: true,
      attributionControl: true,
    });

    container.setAttribute('role', 'application');
    container.setAttribute('aria-label', `Map for ${tour.tour.title}`);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(this.map);

    this.renderPins();
    this.renderPolylines();
    this.fitBounds();

    // Allow the browser to settle layout before recalculating map size.
    // Without this, Leaflet reads a zero or stale container size and
    // renders tiles in misaligned strips that overflow the map pane.
    requestAnimationFrame(() => {
      this.map.invalidateSize();
      this.fitBounds();
    });
  }

  private renderPins(): void {
    this.markers.forEach((marker) => marker.remove());
    this.markers.clear();

    this.tour.stops.forEach((stop, index) => {
      const marker = L.marker(stop.coords, {
        icon: createPinIcon({
          number: index + 1,
          active: stop.id === this.activeStopId,
          visited: this.visitedStopIds.has(stop.id),
          pulsing: stop.id === this.pulsingStopId,
        }),
        title: stop.title,
        alt: `Stop ${index + 1}: ${stop.title}`,
      });

      marker.addTo(this.map);
      this.markers.set(stop.id, marker);
    });
  }

  private renderPolylines(): void {
    this.polylines.forEach((pl) => pl.remove());
    this.polylines = [];

    for (let i = 0; i < this.tour.stops.length - 1; i++) {
      const current = this.tour.stops[i];
      const next = this.tour.stops[i + 1];
      const leg = current.leg_to_next;
      const mode = leg?.mode ?? 'walk';
      const style = getLegStyle(mode);

      const polyline = L.polyline([current.coords, next.coords], {
        color: style.color,
        weight: style.weight,
        dashArray: style.dashArray,
        opacity: style.opacity,
      });

      polyline.addTo(this.map);
      this.polylines.push(polyline);
    }
  }

  private fitBounds(): void {
    if (this.tour.stops.length === 0) return;
    const bounds = L.latLngBounds(this.tour.stops.map((s) => s.coords));
    this.map.fitBounds(bounds, { padding: [40, 40] });
  }

  /** Set bottom padding (px) so panTo centres the stop in the visible map area above the sheet. */
  setMapPadding(bottom: number): void {
    this.paddingBottom = bottom;
  }

  setActiveStop(stop: Stop): void {
    this.activeStopId = stop.id;
    this.renderPins();

    if (this.paddingBottom > 0) {
      // Offset the target so the stop is centred in the visible map sliver above the sheet
      const zoom = this.map.getZoom();
      const point = this.map.project(stop.coords, zoom);
      point.y += this.paddingBottom / 2;
      const offsetLatLng = this.map.unproject(point, zoom);
      this.map.panTo(offsetLatLng, { animate: true, duration: 0.5 });
    } else {
      this.map.panTo(stop.coords, { animate: true, duration: 0.5 });
    }
  }

  setPulsingPin(stopId: number | null): void {
    this.pulsingStopId = stopId;
    this.renderPins();
  }

  setVisitedStops(visitedIds: Set<number>): void {
    this.visitedStopIds = visitedIds;
    this.renderPins();
  }

  updateGpsPosition(lat: number, lng: number): void {
    const latlng = L.latLng(lat, lng);
    if (this.gpsDot) {
      this.gpsDot.setLatLng(latlng);
    } else {
      this.gpsDot = L.circleMarker(latlng, {
        radius: 8,
        fillColor: '#2563eb',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
        className: 'maptour-gps-dot',
      });
      this.gpsDot.addTo(this.map);
    }
  }

  clearGpsPosition(): void {
    if (this.gpsDot) {
      this.gpsDot.remove();
      this.gpsDot = null;
    }
  }

  getMap(): L.Map {
    return this.map;
  }

  destroy(): void {
    this.map.remove();
  }
}
