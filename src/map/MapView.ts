import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Tour, Stop } from '../types';
import { createPinIcon, getLegStyle } from './layers';

export class MapView {
  private map: L.Map;
  private markers: Map<number, L.Marker> = new Map();
  private polylines: L.Polyline[] = [];
  private gpsDot: L.Marker | null = null;
  private tour: Tour;
  private activeStopId: number;
  private pulsingStopId: number | null = null;
  private visitedStopIds: Set<number> = new Set();
  private paddingBottom = 0;
  private pinClickCallbacks: Array<(index: number) => void> = [];
  private pinNumberMap: Map<number, number> | null = null;

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
      const displayNumber = this.pinNumberMap?.get(index) ?? (index + 1);
      const marker = L.marker(stop.coords, {
        icon: createPinIcon({
          number: displayNumber,
          active: stop.id === this.activeStopId,
          visited: this.visitedStopIds.has(stop.id),
          pulsing: stop.id === this.pulsingStopId,
        }),
        title: stop.title,
        alt: `Stop ${displayNumber}: ${stop.title}`,
      });

      marker.on('click', () => {
        this.pinClickCallbacks.forEach((cb) => cb(index));
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
      // Mode and route from the destination stop's getting_here
      const gettingHere = next.getting_here;
      const mode = gettingHere?.mode ?? 'walk';
      const style = getLegStyle(mode);
      // Use pre-computed waypoints if available, otherwise straight line
      const path = gettingHere?.route && gettingHere.route.length > 0
        ? gettingHere.route
        : [current.coords, next.coords];

      const polyline = L.polyline(path, {
        color: style.color,
        weight: style.weight,
        dashArray: style.dashArray,
        opacity: style.opacity,
      });

      polyline.addTo(this.map);
      this.polylines.push(polyline);
    }
  }

  fitBounds(): void {
    if (this.tour.stops.length === 0) return;
    const bounds = L.latLngBounds(this.tour.stops.map((s) => s.coords));
    this.map.fitBounds(bounds, {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 40 + this.paddingBottom],
    });
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
      const icon = L.divIcon({
        className: 'maptour-gps-icon',
        html: '<span class="maptour-gps-icon__person"><i class="fa-solid fa-person" aria-hidden="true"></i></span><span class="maptour-gps-heading-arrow" aria-hidden="true"></span>',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      this.gpsDot = L.marker(latlng, { icon, interactive: false, zIndexOffset: -100 });
      this.gpsDot.addTo(this.map);
    }
  }

  updateGpsHeading(heading: number | null): void {
    if (!this.gpsDot) return;
    const el = (this.gpsDot as L.Marker).getElement();
    if (!el) return;
    const arrow = el.querySelector<HTMLElement>('.maptour-gps-heading-arrow');
    if (!arrow) return;
    if (heading === null) {
      arrow.style.display = 'none';
    } else {
      arrow.style.display = '';
      arrow.style.transform = `rotate(${heading}deg)`;
    }
  }

  clearGpsPosition(): void {
    if (this.gpsDot) {
      this.gpsDot.remove();
      this.gpsDot = null;
    }
  }

  /** Fly to a stop at a specific zoom level (used for welcome picker preview). */
  flyToStop(stop: Stop, zoom = 16): void {
    this.activeStopId = stop.id;
    this.renderPins();

    if (this.paddingBottom > 0) {
      const point = this.map.project(stop.coords, zoom);
      point.y += this.paddingBottom / 2;
      const offsetLatLng = this.map.unproject(point, zoom);
      this.map.flyTo(offsetLatLng, zoom, { animate: true, duration: 0.8 });
    } else {
      this.map.flyTo(stop.coords, zoom, { animate: true, duration: 0.8 });
    }
  }

  /** Set custom display numbers for pins (index → display number). Pass null to reset. */
  setPinNumberMap(mapping: Map<number, number> | null): void {
    this.pinNumberMap = mapping;
    this.renderPins();
  }

  onPinClick(cb: (index: number) => void): void {
    this.pinClickCallbacks.push(cb);
  }

  getMap(): L.Map {
    return this.map;
  }

  destroy(): void {
    this.map.remove();
  }
}
